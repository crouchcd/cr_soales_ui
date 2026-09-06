"use client";

import { useMemo, useState } from "react";

import { LoadingSignal } from "@/components/loading-signal";
import {
  fetchGoldScoringReport,
  type GoldScoringField,
  type GoldScoringPaper,
  type GoldScoringReport,
} from "@/lib/gold-scoring-api";

const PASS_THRESHOLD = 0.85;

type Tone = "pass" | "weak" | "fail";

const TONE_TEXT: Record<Tone, string> = {
  pass: "text-[#4ade80]",
  weak: "text-[#f59e0b]",
  fail: "text-[#ffb4ab]",
};

const TONE_BG: Record<Tone, string> = {
  pass: "bg-[#4ade80]",
  weak: "bg-[#f59e0b]",
  fail: "bg-[#ffb4ab]",
};

function toneOf(score: number | null): Tone {
  if (score === null) return "fail";
  if (score >= PASS_THRESHOLD) return "pass";
  if (score >= 0.4) return "weak";
  return "fail";
}

const fmtPct = (ratio: number | null) =>
  ratio === null || ratio === undefined ? "—" : `${Math.round(ratio * 100)}%`;

const fmtDuration = (startIso: string, endIso: string) => {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
};

const fieldLabel = (canonical: string) => canonical.replace(/_/g, " ");

const fmtValue = (value: unknown): { text: string; empty: boolean } => {
  if (value === null || value === undefined || value === "") {
    return { text: "—", empty: true };
  }
  if (Array.isArray(value)) {
    return { text: value.length ? value.join(" · ") : "—", empty: value.length === 0 };
  }
  if (typeof value === "boolean") return { text: value ? "true" : "false", empty: false };
  return { text: String(value), empty: false };
};

function FieldCard({
  field,
  prompt,
  promptOpen,
  onTogglePrompt,
}: {
  field: GoldScoringField;
  prompt: { langfuseName: string; text: string } | undefined;
  promptOpen: boolean;
  onTogglePrompt: () => void;
}) {
  const expected = fmtValue(field.expected);
  const actual = fmtValue(field.actual);
  const tone = toneOf(field.score);
  const pass = field.score !== null && field.score >= PASS_THRESHOLD;

  return (
    <div
      className={`soales-panel border-l-4 p-4 ${
        pass ? "border-l-[#4ade80]" : "border-l-[#ffb4ab]"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <span className="soales-mono text-[#93c5fd]">{field.qnum}</span>
        <span className="font-medium text-[#dae2fd]">{fieldLabel(field.canonical)}</span>
        {prompt ? (
          <button
            type="button"
            onClick={onTogglePrompt}
            title="How this question is prompted"
            aria-pressed={promptOpen}
            className={`flex h-4 w-4 items-center justify-center rounded-full border font-mono text-[10px] leading-none transition-colors ${
              promptOpen
                ? "border-[#93c5fd] text-[#93c5fd]"
                : "border-[#9ca3af] text-[#9ca3af] hover:border-[#93c5fd] hover:text-[#93c5fd]"
            }`}
          >
            i
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-[1.15fr_1.15fr_0.85fr]">
        <div>
          <span className="soales-mono block text-[10px] uppercase tracking-widest text-[#9ca3af]">
            Expected (reviewer)
          </span>
          <div
            className={`mt-1 whitespace-pre-wrap break-words rounded bg-[#0b1220] p-2 text-sm ${
              expected.empty ? "italic text-[#9ca3af]" : "text-[#e5e7eb]"
            }`}
          >
            {expected.text}
          </div>
        </div>

        <div>
          <span className="soales-mono block text-[10px] uppercase tracking-widest text-[#9ca3af]">
            Actual (pipeline)
          </span>
          <div
            className={`mt-1 whitespace-pre-wrap break-words rounded bg-[#1e293b] p-2 text-sm ${
              actual.empty ? "italic text-[#9ca3af]" : "text-[#e5e7eb]"
            }`}
          >
            {actual.text}
          </div>
          {field.citations.length ? (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-[#93c5fd]">
                Pipeline citation ({field.citations.length})
              </summary>
              <div className="mt-2 grid gap-2">
                {field.citations.map((citation, index) => (
                  <div
                    key={index}
                    className="whitespace-pre-wrap rounded bg-[#0b1220] p-2 text-xs text-[#ccc3d8]"
                  >
                    <span className="soales-mono mb-1 block text-[10px] uppercase text-[#9ca3af]">
                      p. {citation.page ?? "?"}
                    </span>
                    {citation.quote}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-2">
          <span className="soales-mono block text-[10px] uppercase tracking-widest text-[#9ca3af]">
            Eval
          </span>
          <span className="soales-chip text-[10px] uppercase tracking-widest">
            {(field.tier ?? "exact match").replace("_", " ")}
          </span>
          <span className={`soales-mono text-xl font-semibold ${TONE_TEXT[tone]}`}>
            {field.score === null ? "—" : field.score.toFixed(2)}
          </span>
          {field.comment ? (
            <details className="w-full text-sm">
              <summary className="cursor-pointer text-[#93c5fd]">Judge rationale</summary>
              <div className="mt-2 whitespace-pre-wrap rounded bg-[#0b1220] p-2 text-xs text-[#ccc3d8]">
                {field.comment}
              </div>
            </details>
          ) : null}
        </div>
      </div>

      {prompt && promptOpen ? (
        <div className="mt-3 rounded border border-dashed border-[#475569] bg-[#0b1220] p-3">
          <p className="soales-mono text-[10px] uppercase tracking-widest text-[#9ca3af]">
            Prompt · {prompt.langfuseName}
          </p>
          <pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-[#e5e7eb]">
            {prompt.text}
          </pre>
          {prompt.text.includes("{{") ? (
            <p className="soales-mono mt-2 text-[10px] uppercase tracking-widest text-[#9ca3af]">
              {"{{...}}"} slots are filled per-paper from its Q5 paradigm at runtime
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PaperDetail({
  paper,
  prompts,
  onlyFailing,
  onToggleOnlyFailing,
  openPromptKeys,
  onTogglePromptKey,
}: {
  paper: GoldScoringPaper;
  prompts: GoldScoringReport["prompts"];
  onlyFailing: boolean;
  onToggleOnlyFailing: (value: boolean) => void;
  openPromptKeys: Set<string>;
  onTogglePromptKey: (key: string) => void;
}) {
  const failCount = paper.fields.filter(
    (f) => f.score === null || f.score < PASS_THRESHOLD,
  ).length;
  const visibleFields = onlyFailing
    ? paper.fields.filter((f) => f.score === null || f.score < PASS_THRESHOLD)
    : paper.fields;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#1f2937] pb-3">
        <h2 className="soales-mono text-xl text-[#dae2fd]">{paper.paper_id}</h2>
        <span className="soales-chip text-[10px] uppercase tracking-widest">
          {paper.overall_pass ? "overall pass" : "overall fail"}
        </span>
        <span className="soales-chip text-[10px] uppercase tracking-widest">
          {fmtPct(paper.fields_passed_ratio)} fields passed
        </span>
      </div>

      <label className="flex items-center gap-2 text-sm text-[#ccc3d8]">
        <input
          type="checkbox"
          checked={onlyFailing}
          onChange={(event) => onToggleOnlyFailing(event.target.checked)}
          className="h-3.5 w-3.5 accent-[#93c5fd]"
        />
        Show only failing fields ({failCount} of {paper.fields.length})
      </label>

      <div className="grid gap-3">
        {visibleFields.map((field) => {
          const key = `${paper.paper_id}::${field.canonical}`;
          return (
            <FieldCard
              key={key}
              field={field}
              prompt={field.section ? prompts[field.section] : undefined}
              promptOpen={openPromptKeys.has(key)}
              onTogglePrompt={() => onTogglePromptKey(key)}
            />
          );
        })}
      </div>
    </div>
  );
}

function FrequencyTable({ report }: { report: GoldScoringReport }) {
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const canonicalFields: { canonical: string; qnum: string }[] = [];
    for (const paper of report.papers) {
      for (const field of paper.fields) {
        if (!seen.has(field.canonical)) {
          seen.add(field.canonical);
          canonicalFields.push({ canonical: field.canonical, qnum: field.qnum });
        }
      }
    }

    return canonicalFields
      .map(({ canonical, qnum }) => {
        let total = 0;
        let failing = 0;
        let scoreSum = 0;
        for (const paper of report.papers) {
          const field = paper.fields.find((f) => f.canonical === canonical);
          if (!field) continue;
          total += 1;
          scoreSum += field.score ?? 0;
          if (field.score === null || field.score < PASS_THRESHOLD) failing += 1;
        }
        return { canonical, qnum, total, failing, avg: total ? scoreSum / total : 0 };
      })
      .sort((a, b) => b.failing / (b.total || 1) - a.failing / (a.total || 1));
  }, [report]);

  return (
    <div className="soales-panel overflow-x-auto">
      <table className="soales-table">
        <thead>
          <tr>
            <th>Q#</th>
            <th>Field</th>
            <th>Fail rate</th>
            <th>Failing</th>
            <th>Avg. score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rate = row.total ? row.failing / row.total : 0;
            return (
              <tr key={row.canonical}>
                <td className="soales-mono text-[#9ca3af]">{row.qnum}</td>
                <td className="font-medium text-[#dae2fd]">{fieldLabel(row.canonical)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#1f2937]">
                      <span
                        className={`block h-full ${TONE_BG.fail}`}
                        style={{ width: `${Math.round(rate * 100)}%` }}
                      />
                    </div>
                    <span className="soales-mono text-xs">{Math.round(rate * 100)}%</span>
                  </div>
                </td>
                <td className="soales-mono">
                  {row.failing}/{row.total}
                </td>
                <td className="soales-mono">{row.avg.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function GoldScoringReportView() {
  const [experimentId, setExperimentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<GoldScoringReport | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"papers" | "frequency">("papers");
  const [onlyFailing, setOnlyFailing] = useState(false);
  const [openPromptKeys, setOpenPromptKeys] = useState<Set<string>>(new Set());

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = experimentId.trim();
    if (!trimmed) {
      setError("Enter a Langfuse experiment ID.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const nextReport = await fetchGoldScoringReport(trimmed);
      setReport(nextReport);
      setSelectedPaperId(nextReport.papers[0]?.paper_id ?? null);
      setActiveTab("papers");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to build report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const togglePromptKey = (key: string) => {
    setOpenPromptKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedPaper = report?.papers.find((p) => p.paper_id === selectedPaperId) ?? null;

  return (
    <section className="grid gap-6">
      {loading ? (
        <LoadingSignal
          label="Building Report"
          detail="Fetching experiment, scores, and rationale from Langfuse..."
        />
      ) : null}

      <header>
        <h1 className="soales-subheading mt-3 text-3xl tracking-[-0.02em] text-[#dae2fd] md:text-5xl">
          Gold Scoring
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#ccc3d8] md:text-base">
          Field-by-field comparison of automated extraction vs. reviewer ground truth for a
          gold-standard-scoring experiment, with judge rationale and pipeline citations per field.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-72 gap-1 text-sm">
          <span className="soales-mono text-[10px] uppercase text-[#ccc3d8]">
            Langfuse experiment ID
          </span>
          <input
            type="text"
            value={experimentId}
            onChange={(event) => setExperimentId(event.target.value)}
            placeholder="e1647b7d-3d04-4029-9cd3-afb133d26ba3"
            className="soales-input"
            disabled={loading}
          />
        </label>
        <button type="submit" className="soales-button-primary" disabled={loading}>
          Build report
        </button>
      </form>

      {error ? (
        <p className="ui-fade-in rounded bg-[#93000a]/20 px-3 py-2 text-sm text-[#ffdad6]">
          {error}
        </p>
      ) : null}

      {report ? (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="soales-panel px-5 py-4">
              <p className="soales-subheading text-3xl text-[#dae2fd]">{report.experiment.itemCount}</p>
              <p className="soales-mono mt-2 text-[10px] uppercase text-[#ccc3d8]">Papers</p>
            </div>
            <div className="soales-panel px-5 py-4">
              <p className="soales-subheading text-3xl text-[#dae2fd]">
                {fmtPct(report.experiment.avgFieldsPassedRatio)}
              </p>
              <p className="soales-mono mt-2 text-[10px] uppercase text-[#ccc3d8]">
                Avg. fields passed
              </p>
            </div>
            <div className="soales-panel px-5 py-4">
              <p className="soales-subheading text-3xl text-[#dae2fd]">
                {fmtDuration(report.experiment.startTime, report.experiment.endTime)}
              </p>
              <p className="soales-mono mt-2 text-[10px] uppercase text-[#ccc3d8]">Wall time</p>
            </div>
          </div>

          <div className="flex gap-2 border-b border-[#1f2937]">
            <button
              type="button"
              onClick={() => setActiveTab("papers")}
              className={`soales-mono px-3 py-2 text-xs uppercase tracking-widest ${
                activeTab === "papers"
                  ? "border-b-2 border-[#93c5fd] text-[#93c5fd]"
                  : "text-[#9ca3af] hover:text-[#dae2fd]"
              }`}
            >
              By paper
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("frequency")}
              className={`soales-mono px-3 py-2 text-xs uppercase tracking-widest ${
                activeTab === "frequency"
                  ? "border-b-2 border-[#93c5fd] text-[#93c5fd]"
                  : "text-[#9ca3af] hover:text-[#dae2fd]"
              }`}
            >
              Field frequency
            </button>
          </div>

          {activeTab === "papers" ? (
            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
              <div className="soales-panel h-fit max-h-[75dvh] overflow-y-auto p-2">
                {report.papers.map((paper) => {
                  const tone = toneOf(paper.fields_passed_ratio);
                  const selected = paper.paper_id === selectedPaperId;
                  return (
                    <button
                      key={paper.paper_id}
                      type="button"
                      onClick={() => setSelectedPaperId(paper.paper_id)}
                      className={`mb-1 block w-full rounded p-2 text-left transition-colors ${
                        selected ? "bg-[#1e293b]" : "hover:bg-[#1f2937]/60"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="soales-mono text-sm font-semibold text-[#dae2fd]">
                          {paper.paper_id}
                        </span>
                        <span className="soales-mono text-xs text-[#9ca3af]">
                          {fmtPct(paper.fields_passed_ratio)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#1f2937]">
                        <span
                          className={`block h-full ${TONE_BG[tone]}`}
                          style={{
                            width: `${Math.round((paper.fields_passed_ratio ?? 0) * 100)}%`,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="soales-panel p-4">
                {selectedPaper ? (
                  <PaperDetail
                    paper={selectedPaper}
                    prompts={report.prompts}
                    onlyFailing={onlyFailing}
                    onToggleOnlyFailing={setOnlyFailing}
                    openPromptKeys={openPromptKeys}
                    onTogglePromptKey={togglePromptKey}
                  />
                ) : (
                  <p className="text-sm text-[#9ca3af]">Select a paper.</p>
                )}
              </div>
            </div>
          ) : (
            <FrequencyTable report={report} />
          )}
        </>
      ) : null}
    </section>
  );
}
