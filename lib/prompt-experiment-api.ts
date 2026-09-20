// Owner-token authenticated prompt-experiment run lifecycle
// (specs/prompt_experiment_ui/spec.md §4). Same typed-fetch shape as
// lib/gold-scoring-api.ts, but every call here carries the caller's own
// bearer token rather than being open/unauthenticated.

import type { GoldScoringExperimentSummary } from "@/lib/gold-scoring-api";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/+$/g, "");
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX ?? "/api/v1";

const joinPath = (...parts: string[]) => {
  const joined = parts
    .map((part) => part.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
  return `/${joined}`;
};

const EXPERIMENT_PATH = joinPath(API_PREFIX, "gold_extraction", "experiment");
const EXPERIMENTS_LIST_PATH = joinPath(API_PREFIX, "gold_extraction", "experiments");
const DATASET_ITEMS_PATH = joinPath(API_PREFIX, "gold_extraction", "dataset_items");

export type ExperimentRunStatus = "running" | "succeeded" | "failed";

export type ExperimentStartResult = {
  run_id: string;
  run_name: string;
};

export type ExperimentStatus = {
  status: ExperimentRunStatus;
  run_name: string;
  // The real Langfuse experiment id -- distinct from run_name, and what
  // the report endpoints actually key on. Only set once status has
  // reached "succeeded" (spec: owner-scoped experiment listing).
  langfuse_experiment_id: string | null;
  total_items: number;
  completed_items: number;
  error: string | null;
};

/** Thrown on a 401 specifically, so the token-entry UI can distinguish
 * "bad token" from any other request failure (spec §3: inline error on
 * the token field, no redirect). */
export class InvalidTokenError extends Error {
  constructor() {
    super("Invalid or expired token");
    this.name = "InvalidTokenError";
  }
}

async function authedFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) throw new InvalidTokenError();
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await response.json();
      throw new Error(body.detail ?? JSON.stringify(body));
    }
    throw new Error(await response.text());
  }
  return response;
}

export const startPromptExperiment = async (
  token: string,
  paperIds?: string[],
): Promise<ExperimentStartResult> => {
  const response = await authedFetch(EXPERIMENT_PATH, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(paperIds ? { paper_ids: paperIds } : {}),
  });
  return response.json() as Promise<ExperimentStartResult>;
};

export const fetchExperimentStatus = async (
  token: string,
  runId: string,
): Promise<ExperimentStatus> => {
  const response = await authedFetch(`${EXPERIMENT_PATH}/${runId}/status`, token, {
    method: "GET",
  });
  return response.json() as Promise<ExperimentStatus>;
};

export const fetchDatasetItems = async (token: string): Promise<string[]> => {
  const response = await authedFetch(DATASET_ITEMS_PATH, token, { method: "GET" });
  const body = (await response.json()) as { paper_ids: string[] };
  return body.paper_ids;
};

/** Owner-scoped experiments list -- shaped identically to
 * fetchGoldScoringExperiments (same GoldScoringExperimentSummary type) so
 * the same ExperimentPicker component works with either fetcher. */
export const fetchOwnerExperiments = async (
  token: string,
  query?: string,
): Promise<GoldScoringExperimentSummary[]> => {
  const url = new URL(`${API_BASE_URL}${EXPERIMENTS_LIST_PATH}`);
  if (query?.trim()) url.searchParams.set("q", query.trim());

  const response = await authedFetch(url.pathname + url.search, token, { method: "GET" });
  return response.json() as Promise<GoldScoringExperimentSummary[]>;
};
