/**
 * FACILITY MASTER LIST — URL STATE (the source of truth for the view).
 *
 * Why this module exists: every filter, the search box, the sort, the page and
 * the page size used to live in `useState` inside the page. Navigating to a
 * facility profile unmounted the page and threw the whole view away, so
 * pressing Back showed an unfiltered list. Here the URL carries the view
 * instead, which means:
 *
 *   • Back / Forward restore the exact list (nothing to re-apply),
 *   • a copied link opens the same filtered list for a colleague,
 *   • a hard refresh keeps the filter,
 *   • nothing has to be "synced" between two stores.
 *
 * Everything in this file is PURE (a search string in, a typed view out) so
 * `scripts/listUrlState.test.ts` can pin the parsing rules — including the one
 * that matters most: an unknown, malformed or hostile query parameter is
 * IGNORED, never a crash.
 *
 * Column widths / density / visible columns are user preferences, not view
 * state, so they stay out of the URL (see lib/masterView for that part).
 */

import { COLUMN_BY_KEY } from "@/lib/masterColumns";
import {
  KPI_LABELS,
  METRIC_LABELS,
  type MasterKpiId,
  type MasterMetricId,
} from "@/lib/masterFilter";
import { ROW_VIEW_OPTIONS, defaultRowView, type RowViewOption } from "@/components/RowView";

/** One sort entry — the same shape the table's header clicks produce. */
export type SortSpec = { id: string; desc: boolean };

/** The complete, typed view of the list. */
export type ListFilters = {
  /** Global search text. */
  q: string;
  block: string[];
  type: string[];
  cycle: string[];
  eligibility: string[];
  cert: string[];
  status: string[];
  /** "Documents Status (Report)" — derived by the SaQsham import. */
  docRep: string[];
  btype: string[];
  bstatus: string[];
  noc: string[];
  /** Clicked KPI card, or null. */
  kpi: MasterKpiId | null;
  /** Block Compare heatmap drill-down, or empty for no metric filter. */
  metric: MasterMetricId | "";
  /** 0 = off; otherwise "due within N days" (30 / 60 / 90). */
  due: 0 | 30 | 60 | 90;
  /** Certified-score window; [0, 100] = off. */
  score: [number, number];
  /** Part 2 — "Updated" preset ("" = off) and its optional refiners. */
  updated: "" | "any" | "today" | "24h" | "7d" | "30d" | "custom";
  updFrom: string;
  updTo: string;
  updBy: string;
  updHow: string;
  updBatch: string;
  updField: string;
  sort: SortSpec[];
  page: number;
  size: RowViewOption;
  /** The open Facility Quick View (shareable: ?facility=<id>&section=<key>).
   *  Kept in the view so Back closes the dialog and a pasted link reopens it. */
  facility: string;
  section: string;
};

/** The clean list: no filters, no sort, first page. */
export function defaultListFilters(): ListFilters {
  return {
    q: "",
    block: [],
    type: [],
    cycle: [],
    eligibility: [],
    cert: [],
    status: [],
    docRep: [],
    btype: [],
    bstatus: [],
    noc: [],
    kpi: null,
    metric: "",
    due: 0,
    score: [0, 100],
    updated: "",
    updFrom: "",
    updTo: "",
    updBy: "",
    updHow: "",
    updBatch: "",
    updField: "",
    sort: [],
    page: 1,
    size: defaultRowView(),
    facility: "",
    section: "",
  };
}

/** Query-parameter names. Short, readable and stable — these are the links
 *  people paste into a district WhatsApp group. */
export const LIST_PARAMS = {
  q: "q",
  block: "block",
  type: "type",
  cycle: "cycle",
  eligibility: "elig",
  cert: "cert",
  status: "status",
  docRep: "docrep",
  btype: "btype",
  bstatus: "bstatus",
  noc: "noc",
  kpi: "kpi",
  metric: "metric",
  due: "due",
  score: "score",
  updated: "upd",
  updFrom: "updfrom",
  updTo: "updto",
  updBy: "updby",
  updHow: "updhow",
  updBatch: "updbatch",
  updField: "updfield",
  sort: "sort",
  page: "page",
  size: "size",
  facility: "facility",
  section: "section",
} as const;

/** Multi-value params, in the order they appear in the chips/toolbar. */
const MULTI_KEYS = [
  "block",
  "type",
  "cycle",
  "eligibility",
  "cert",
  "status",
  "docRep",
  "btype",
  "bstatus",
  "noc",
] as const;

/** Guards against a hostile/absurd URL (someone hand-editing params). */
const MAX_VALUES = 60;
const MAX_VALUE_LEN = 120;
const MAX_SORTS = 5;
const MAX_PAGE = 10_000;

/** Split "a,b,,c" → ["a","b","c"], trimmed, de-duplicated and bounded. */
function parseValues(raw: string | null): string[] {
  if (!raw) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const value = part.trim().slice(0, MAX_VALUE_LEN);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= MAX_VALUES) break;
  }
  return out;
}

function parseText(raw: string | null): string {
  return (raw ?? "").trim().slice(0, MAX_VALUE_LEN);
}

/** "40-90" → [40, 90]; malformed or inverted ranges are ignored (no filter). */
function parseScore(raw: string | null): [number, number] {
  const fallback: [number, number] = [0, 100];
  if (!raw) return fallback;
  const parts = raw.split("-");
  if (parts.length !== 2) return fallback;
  const min = Number(parts[0]);
  const max = Number(parts[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return fallback;
  const lo = Math.max(0, Math.min(100, Math.round(min)));
  const hi = Math.max(0, Math.min(100, Math.round(max)));
  if (lo > hi) return fallback;
  return [lo, hi];
}

/** "name:asc,block:desc" → typed sorts. Unknown column ids and malformed
 *  entries are dropped, so a stale link can never break the table. */
function parseSort(raw: string | null): SortSpec[] {
  if (!raw) return [];
  const out: SortSpec[] = [];
  for (const part of raw.split(",")) {
    const [id, dir] = part.split(":");
    const key = (id ?? "").trim();
    const direction = (dir ?? "asc").trim().toLowerCase();
    if (!key || (direction !== "asc" && direction !== "desc")) continue;
    if (!COLUMN_BY_KEY[key]) continue; // not a real column → ignore
    if (out.some((s) => s.id === key)) continue;
    out.push({ id: key, desc: direction === "desc" });
    if (out.length >= MAX_SORTS) break;
  }
  return out;
}

function parseKpi(raw: string | null): MasterKpiId | null {
  const value = parseText(raw);
  return value && Object.prototype.hasOwnProperty.call(KPI_LABELS, value)
    ? (value as MasterKpiId)
    : null;
}

function parseMetric(raw: string | null): MasterMetricId | "" {
  const value = parseText(raw);
  return value && Object.prototype.hasOwnProperty.call(METRIC_LABELS, value)
    ? (value as MasterMetricId)
    : "";
}

function parseUpdated(raw: string | null): ListFilters["updated"] {
  const value = parseText(raw);
  return value === "any" || value === "today" || value === "24h" || value === "7d" || value === "30d" || value === "custom"
    ? value
    : "";
}

function parseDue(raw: string | null): 0 | 30 | 60 | 90 {
  const n = Number(parseText(raw));
  return n === 30 || n === 60 || n === 90 ? n : 0;
}

function parsePage(raw: string | null): number {
  const n = Math.floor(Number(parseText(raw)));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_PAGE, n);
}

function parseSize(raw: string | null, fallback: RowViewOption): RowViewOption {
  const value = parseText(raw);
  return (ROW_VIEW_OPTIONS as readonly string[]).includes(value)
    ? (value as RowViewOption)
    : fallback;
}

/** Parse a URL search string (with or without the leading "?"). */
export function parseListFilters(
  search: string,
  opts: { sizeFallback?: RowViewOption } = {},
): ListFilters {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const filters = defaultListFilters();
  filters.q = parseText(params.get(LIST_PARAMS.q));
  for (const key of MULTI_KEYS) {
    filters[key] = parseValues(params.get(LIST_PARAMS[key]));
  }
  filters.kpi = parseKpi(params.get(LIST_PARAMS.kpi));
  filters.metric = parseMetric(params.get(LIST_PARAMS.metric));
  filters.due = parseDue(params.get(LIST_PARAMS.due));
  filters.score = parseScore(params.get(LIST_PARAMS.score));
  filters.updated = parseUpdated(params.get(LIST_PARAMS.updated));
  filters.updFrom = parseText(params.get(LIST_PARAMS.updFrom));
  filters.updTo = parseText(params.get(LIST_PARAMS.updTo));
  filters.updBy = parseText(params.get(LIST_PARAMS.updBy));
  filters.updHow = parseText(params.get(LIST_PARAMS.updHow));
  filters.updBatch = parseText(params.get(LIST_PARAMS.updBatch));
  filters.updField = parseText(params.get(LIST_PARAMS.updField));
  filters.sort = parseSort(params.get(LIST_PARAMS.sort));
  filters.page = parsePage(params.get(LIST_PARAMS.page));
  filters.size = parseSize(
    params.get(LIST_PARAMS.size),
    opts.sizeFallback ?? defaultRowView(),
  );
  // Deep link to one facility's quick view / section. A hostile id is just a
  // string the list will not find — never a crash.
  filters.facility = parseText(params.get(LIST_PARAMS.facility));
  filters.section = parseText(params.get(LIST_PARAMS.section));
  return filters;
}

/**
 * Build the query string by hand.
 *
 * `URLSearchParams` would percent-encode the "," and ":" that carry the
 * multi-value lists and the sorts (%2C / %3A), and these links are meant to be
 * pasted into a district WhatsApp group. `encodeURIComponent` keeps spaces safe
 * (%20, never "+") while the two structural separators stay readable:
 *
 *   ?block=Alangayam,Mittur&sort=facility:asc&page=2
 */
function buildQuery(entries: [string, string][]): string {
  return entries
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent(value).replace(/%2C/g, ",").replace(/%3A/g, ":")}`,
    )
    .join("&");
}

/** Serialize the view back to a query string. Defaults are omitted, so a
 *  clean list is a clean URL and a filtered one is a short, readable link. */
export function serializeListFilters(
  filters: ListFilters,
  opts: { defaultSize?: RowViewOption } = {},
): string {
  const entries: [string, string][] = [];
  if (filters.q.trim()) entries.push([LIST_PARAMS.q, filters.q.trim()]);
  for (const key of MULTI_KEYS) {
    const values = filters[key];
    if (values.length) entries.push([LIST_PARAMS[key], values.join(",")]);
  }
  if (filters.kpi) entries.push([LIST_PARAMS.kpi, filters.kpi]);
  if (filters.metric) entries.push([LIST_PARAMS.metric, filters.metric]);
  if (filters.due > 0) entries.push([LIST_PARAMS.due, String(filters.due)]);
  if (filters.score[0] > 0 || filters.score[1] < 100)
    entries.push([LIST_PARAMS.score, `${filters.score[0]}-${filters.score[1]}`]);
  if (filters.updated) {
    entries.push([LIST_PARAMS.updated, filters.updated]);
    if (filters.updated === "custom") {
      if (filters.updFrom) entries.push([LIST_PARAMS.updFrom, filters.updFrom]);
      if (filters.updTo) entries.push([LIST_PARAMS.updTo, filters.updTo]);
    }
    if (filters.updBy) entries.push([LIST_PARAMS.updBy, filters.updBy]);
    if (filters.updHow) entries.push([LIST_PARAMS.updHow, filters.updHow]);
    if (filters.updBatch) entries.push([LIST_PARAMS.updBatch, filters.updBatch]);
    if (filters.updField) entries.push([LIST_PARAMS.updField, filters.updField]);
  }
  if (filters.sort.length)
    entries.push([
      LIST_PARAMS.sort,
      filters.sort.map((s) => `${s.id}:${s.desc ? "desc" : "asc"}`).join(","),
    ]);
  if (filters.page > 1) entries.push([LIST_PARAMS.page, String(filters.page)]);
  if (filters.size !== (opts.defaultSize ?? defaultRowView()))
    entries.push([LIST_PARAMS.size, filters.size]);
  if (filters.facility.trim()) {
    entries.push([LIST_PARAMS.facility, filters.facility.trim()]);
    if (filters.section.trim()) entries.push([LIST_PARAMS.section, filters.section.trim()]);
  }
  return buildQuery(entries);
}

/** Trigger text for a filter button — the label ALWAYS tells the state:
 *  nothing selected = "Block: All", one or two = the names, three or more a
 *  count. Lives here (not in the component) because the wording is part of the
 *  filter contract the tests pin, and because a component file should only
 *  export components. */
export function filterTriggerText(label: string, selected: readonly string[]): string {
  if (selected.length === 0) return `${label}: All`;
  if (selected.length <= 2) return `${label}: ${selected.join(", ")}`;
  return `${label}: ${selected.length} selected`;
}

/** A stable key for scroll / selection storage: the exact list URL. */
export function listUrlKey(pathname: string, search: string): string {
  const qs = search.startsWith("?") ? search.slice(1) : search;
  return `${pathname}${qs ? `?${qs}` : ""}`;
}

/** How many filters are narrowing the list (search, dropdowns, KPI, due,
 *  score) — the "N filters active" line and the chip row read this. */
export function activeFilterCount(filters: ListFilters): number {
  let n = 0;
  if (filters.q.trim()) n += 1;
  for (const key of MULTI_KEYS) if (filters[key].length) n += 1;
  if (filters.kpi) n += 1;
  if (filters.metric) n += 1;
  if (filters.due > 0) n += 1;
  if (filters.score[0] > 0 || filters.score[1] < 100) n += 1;
  if (filters.updated) n += 1;
  return n;
}

/** Does this URL still carry the view (filters or sort)? Used to decide
 *  whether a saved list URL is worth restoring on a clean /facilities visit. */
export function hasViewParams(search: string): boolean {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  for (const key of [...MULTI_KEYS, "q", "kpi", "metric", "due", "score", "updated", "updFrom", "updTo", "updBy", "updHow", "updBatch", "updField", "sort", "page", "f"]) {
    if (parseText(params.get(key))) return true;
  }
  return false;
}
