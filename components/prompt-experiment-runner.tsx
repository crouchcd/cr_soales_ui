"use client";

import { useEffect, useRef, useState } from "react";

import GoldScoringReportView from "@/components/gold-scoring-report";
import { LoadingSignal } from "@/components/loading-signal";
import {
  fetchDatasetItems,
  fetchExperimentStatus,
  InvalidTokenError,
  startPromptExperiment,
  type ExperimentStatus,
} from "@/lib/prompt-experiment-api";

// specs/prompt_experiment_ui/spec.md §4.
const POLL_INTERVAL_MS = 3000;
const TOKEN_STORAGE_KEY = "soales.promptExperiment.token";
const RUN_ID_STORAGE_KEY = "soales.promptExperiment.runId";

/** Token entry: inline error on a 401, no redirect (spec §3). Once a
 * token is accepted the caller holds it for the tab (sessionStorage). */
function TokenGate({ onReady }: { onReady: (token: string) => void }) {
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setError("");
    setChecking(true);
    try {
      // fetchDatasetItems doubles as a token check -- any 401 surfaces here.
      await fetchDatasetItems(trimmed);
      onReady(trimmed);
    } catch (err) {
      setError(err instanceof InvalidTokenError ? "Invalid token." : "Could not verify token.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid max-w-md gap-3">
      <label className="grid gap-1 text-sm">
        <span className="soales-mono text-[10px] uppercase text-[#ccc3d8]">Owner token</span>
        <input
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Your prompt-experiment API token"
          className="soales-input"
          disabled={checking}
          autoFocus
        />
      </label>
      {error ? <p className="text-sm text-[#ffb4ab]">{error}</p> : null}
      <button type="submit" className="soales-button-primary w-fit" disabled={checking || !value.trim()}>
        {checking ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}

/** All-checked-by-default checkbox picker over the gold-standard papers
 * (spec §4, FR2). IDs only -- no titles, see spec §6. */
function PaperPicker({
  paperIds,
  selected,
  onChange,
  disabled,
}: {
  paperIds: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled: boolean;
}) {
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const allChecked = selected.size === paperIds.length;

  return (
    <div className="soales-panel grid max-h-72 gap-1 overflow-y-auto p-3">
      <label className="mb-1 flex items-center gap-2 border-b border-[#1f2937] pb-2 text-sm font-medium text-[#dae2fd]">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(event) => onChange(event.target.checked ? new Set(paperIds) : new Set())}
          className="h-3.5 w-3.5 accent-[#93c5fd]"
          disabled={disabled}
        />
        All papers ({paperIds.length})
      </label>
      {paperIds.map((id) => (
        <label key={id} className="soales-mono flex items-center gap-2 text-sm text-[#ccc3d8]">
          <input
            type="checkbox"
            checked={selected.has(id)}
            onChange={() => toggle(id)}
            className="h-3.5 w-3.5 accent-[#93c5fd]"
            disabled={disabled}
          />
          {id}
        </label>
      ))}
    </div>
  );
}

export default function PromptExperimentRunner() {
  const [token, setToken] = useState<string | null>(null);
  const [paperIds, setPaperIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<ExperimentStatus | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reconnect to a persisted token/run on mount or refresh (FR9) --
  // sessionStorage only, never the URL (spec §3).
  useEffect(() => {
    const storedToken = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) setToken(storedToken);
    const storedRunId = window.sessionStorage.getItem(RUN_ID_STORAGE_KEY);
    if (storedRunId) setRunId(storedRunId);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchDatasetItems(token)
      .then((ids) => {
        setPaperIds(ids);
        setSelected(new Set(ids));
      })
      .catch(() => setError("Could not load the paper list."));
  }, [token]);

  useEffect(() => {
    if (!token || !runId) return;

    const poll = () => {
      fetchExperimentStatus(token, runId)
        .then(setStatus)
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Could not fetch run status.");
        });
    };
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, runId]);

  const onTokenReady = (nextToken: string) => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
  };

  const onStart = async () => {
    if (!token) return;
    setError("");
    setStarting(true);
    try {
      const allSelected = selected.size === paperIds.length;
      const result = await startPromptExperiment(
        token,
        allSelected ? undefined : Array.from(selected),
      );
      window.sessionStorage.setItem(RUN_ID_STORAGE_KEY, result.run_id);
      setRunId(result.run_id);
      setStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the run.");
    } finally {
      setStarting(false);
    }
  };

  const onRunAgain = () => {
    window.sessionStorage.removeItem(RUN_ID_STORAGE_KEY);
    setRunId(null);
    setStatus(null);
    setError("");
  };

  if (!token) return <TokenGate onReady={onTokenReady} />;

  if (status?.status === "succeeded") {
    return (
      <div className="grid gap-4">
        <button type="button" className="soales-button-primary w-fit" onClick={onRunAgain}>
          Run a new experiment
        </button>
        <GoldScoringReportView initialExperimentId={status.run_name} />
      </div>
    );
  }

  if (runId && status?.status !== "failed") {
    return (
      <div className="grid gap-4">
        <LoadingSignal
          label="Running"
          detail={
            status
              ? `${status.completed_items} of ${status.total_items} papers complete…`
              : "Starting…"
          }
        />
        {error ? <p className="text-sm text-[#ffb4ab]">{error}</p> : null}
      </div>
    );
  }

  if (status?.status === "failed") {
    return (
      <div className="grid gap-4">
        <p className="rounded bg-[#93000a]/20 px-3 py-2 text-sm text-[#ffdad6]">
          Run failed: {status.error ?? "unknown error"}
        </p>
        <button type="button" className="soales-button-primary w-fit" onClick={onRunAgain}>
          Run again
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <PaperPicker paperIds={paperIds} selected={selected} onChange={setSelected} disabled={starting} />
      {error ? <p className="text-sm text-[#ffb4ab]">{error}</p> : null}
      <button
        type="button"
        className="soales-button-primary w-fit"
        onClick={onStart}
        disabled={starting || paperIds.length === 0 || selected.size === 0}
      >
        {starting ? "Starting…" : "Run experiment"}
      </button>
    </div>
  );
}
