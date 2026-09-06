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

const REPORT_PATH = joinPath(API_PREFIX, "gold_scoring", "report");
const EXPERIMENTS_PATH = joinPath(API_PREFIX, "gold_scoring", "experiments");

export type GoldScoringCitation = {
  page: number | string | null;
  quote: string;
};

export type GoldScoringField = {
  canonical: string;
  qnum: string;
  expected: unknown;
  actual: unknown;
  score: number | null;
  tier: "exact_match" | "judge" | "judge_error" | null;
  comment: string | null;
  section: string | null;
  citations: GoldScoringCitation[];
};

export type GoldScoringPaper = {
  paper_id: string;
  fields_passed_ratio: number | null;
  overall_pass: boolean | null;
  fields: GoldScoringField[];
};

export type GoldScoringPrompt = {
  langfuseName: string;
  text: string;
};

export type GoldScoringReport = {
  experiment: {
    id: string;
    name: string;
    itemCount: number;
    startTime: string;
    endTime: string;
    avgFieldsPassedRatio: number | null;
  };
  papers: GoldScoringPaper[];
  prompts: Record<string, GoldScoringPrompt>;
  generatedAt: string;
};

export type GoldScoringExperimentSummary = {
  id: string;
  name: string;
  itemCount: number;
  startTime: string;
};

/** With no `query`, the 5 most recent experiments. With one, up to 20 name
 * matches -- reaching further back than the plain recent-5 list. */
export const fetchGoldScoringExperiments = async (
  query?: string,
): Promise<GoldScoringExperimentSummary[]> => {
  const url = new URL(`${API_BASE_URL}${EXPERIMENTS_PATH}`);
  if (query?.trim()) url.searchParams.set("q", query.trim());

  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<GoldScoringExperimentSummary[]>;
};

export const fetchGoldScoringReport = async (
  experimentId: string,
): Promise<GoldScoringReport> => {
  const url = new URL(`${API_BASE_URL}${REPORT_PATH}`);
  url.searchParams.set("experiment_id", experimentId);

  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await response.json();
      throw new Error(body.detail ?? JSON.stringify(body));
    }
    throw new Error(await response.text());
  }

  return response.json() as Promise<GoldScoringReport>;
};
