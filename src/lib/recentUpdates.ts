/**
 * RECENTLY UPDATED — read-time decision engine for the "Updated" cell marker.
 *
 * Nothing is stored per row. When an import (or, optionally, a manual edit)
 * changes a tracked field, an `auditLogs` entry is already written with the
 * field label, the source, the time and the old value — so the marker is
 * COMPUTED from the change log at read time:
 *
 *   • "Updated for N days" is an interval: N × 24 h from the entry's time —
 *     changing N in Admin applies immediately, no re-import needed;
 *   • the newest entry per (facility, tracked field) wins — a later manual
 *     edit replaces the import marker, and an undo write ("Undo import")
 *     clears it;
 *   • Importer-scope-only filtering ("imports only" vs "imports + manual
 *     edits") happens here, so N and the scope are one switch each.
 *
 * Pure (no React/Convex/DOM): the Convex query, the master-grid cells and
 * `scripts/recentUpdates.test.ts` all run the same rules.
 */

/** A minimal view of one `auditLogs` document (tests hand-build these). */
export type RecentAuditEntry = {
  facilityId?: string | null;
  table?: string | null;
  /** The audit's field label, e.g. "SaQsham Documents Status", or
   *  "NQAS IA (IA 2026-27 Q2)" for a quarterly IA write. */
  field?: string | null;
  changedAt: number;
  source?: string | null;
  changedByName?: string | null;
  /** The value before the change — shown in the cell tooltip ("was: …"). */
  oldValue?: unknown;
  fileName?: string | null;
  batchId?: string | null;
};

/** One computed marker, keyed per facility + master-list column key. */
export type RecentMarker = {
  /** ISO-ish epoch ms when the change happened. */
  at: number;
  /** Who made the change (audit changedByName). */
  by: string | null;
  /** The import source / "Manual edit", for the tooltip + profile chip. */
  source: string | null;
  /** The previous value (may be null = the field was blank). */
  was: string | null;
};

/** Per facility: master-list column markers + the quarterly IA markers. */
export type FacilityRecent = {
  cols: Record<string, RecentMarker>;
  /** IA markers carry the quarter they were written for, because the master
   *  list shows ONE quarter pair at a time (Compare quarters selector). */
  ia: Record<string, { fy: string; quarter: 1 | 2; at: number; by: string | null; source: string | null; was: string | null }>;
};

export type RecentMap = Record<string, FacilityRecent>;

/** Highlight scope (Admin → Table & Display). */
export type HighlightScope = "imports" | "importsEdits";

/** The audit-source names the two importers write. */
export const IMPORT_SOURCES = ["SaQsham import", "Quarterly IA import"];
/** The undo writers use a dedicated source so read-time undo works. */
export const UNDO_SOURCE = "Undo import";

/** Config flag `trackUpdates` — the audit field labels that mark cells
 *  (section C.3). Matched by PREFIX, so "(manual)"/"(auto)" variants and the
 *  quarterly suffix all fit. Order does not matter; the first prefix wins. */
export const TRACKED_FIELD_PREFIXES = [
  "SaQsham Documents Status",
  "Documents Status (Report)",
  "SaQsham Application No",
  "SaQsham Portal Last Updated",
  "SaQsham Portal Updated By",
  "Facility Current Status",
  "NQAS IA",
  "Kayakalp IA",
] as const;

/** Profile-only tracked fields (no master-list column, but a profile chip). */
export const PROFILE_ONLY_FIELD_PREFIXES = ["SaQsham Application No", "SaQsham Portal Last Updated", "SaQsham Portal Updated By"] as const;

function trackedPrefix(field: string): string | null {
  return TRACKED_FIELD_PREFIXES.find((p) => field.startsWith(p)) ?? null;
}

/** Column key (master list) for a tracked audit field; null = profile-only. */
export function trackedColumnFor(field: string): string | null {
  if (field.startsWith("SaQsham Documents Status")) return "genDoc";
  if (field.startsWith("Documents Status (Report)")) return "documentsStatusReport";
  if (field.startsWith("Facility Current Status")) return "pipelineStatus";
  if (field.startsWith("SaQsham Application No")) return "saqshamApplicationNo";
  if (field.startsWith("SaQsham Portal Last Updated")) return "saqshamPortalUpdatedOn";
  if (field.startsWith("SaQsham Portal Updated By")) return "saqshamPortalUpdatedBy";
  return null;
}

/** Parse "(IA 2026-27 Q2)" out of an IA audit field label. Q3+ return null
 *  (no quarterly column exists to receive them). */
export function parseIaPeriod(field: string): { fy: string; quarter: 1 | 2 } | null {
  const m = /\(IA\s+(\d{4}-\d{2})\s+Q([1-4])\)/.exec(field);
  if (!m) return null;
  const q = Number(m[2]);
  if (q !== 1 && q !== 2) return null;
  return { fy: m[1], quarter: q };
}

/** Does the entry's source qualify as a marker under the chosen scope? */
export function scopeAllows(source: string | null | undefined, scope: HighlightScope): boolean {
  const s = (source ?? "").trim();
  if (!s) return scope === "importsEdits"; // unlabeled writes count as manual
  if (s === UNDO_SOURCE) return false; // undo always clears
  if (IMPORT_SOURCES.includes(s)) return true; // imports always mark
  return scope === "importsEdits"; // anything else is a manual edit
}

/** Which IA tracker does this field update? Only the two live trackers —
 *  the retired third one no longer paints a marker anywhere. */
function iaTrackerFor(prefix: string): string | null {
  if (prefix === "NQAS IA") return "nqas";
  if (prefix === "Kayakalp IA") return "kayakalp";
  return null;
}

/**
 * Build the recent map from audit entries.
 *
 *   • Entries older than `cutoff` (now − N×24 h) are ignored ⇒ N = 0 disables.
 *   • The newest qualifying entry per (facility, tracked field) wins — a
 *     later manual edit replaces an import marker, an undo clears it.
 *   • Rows with no change / not reported / skipped never produced an audit
 *     entry, so they are never marked (guaranteed by construction).
 */
export function buildRecentMap(
  entries: readonly RecentAuditEntry[],
  opts: { cutoff: number; now: number; scope: HighlightScope },
): RecentMap {
  const map: RecentMap = {};
  for (const e of entries) {
    if (e.changedAt < opts.cutoff || e.changedAt > opts.now) continue;
    if (e.table != null && e.table !== "facilities") continue;
    const facilityId = e.facilityId ?? null;
    if (!facilityId) continue; // e.g. the quarter lock/unlock entries
    const field = String(e.field ?? "");
    const prefix = trackedPrefix(field);
    if (!prefix) continue;
    if (!scopeAllows(e.source, opts.scope)) continue;

    if (!map[facilityId]) map[facilityId] = { cols: {}, ia: {} };

    // Note: the entry must still be inside the window to be considered, but
    // an out-of-window entry does not erase an earlier in-window one —
    // markers only ever LIVE inside the window.
    const marker: RecentMarker = {
      at: e.changedAt,
      by: e.changedByName ?? null,
      source: e.source ?? null,
      was: e.oldValue == null || e.oldValue === "" ? null : String(e.oldValue),
    };
    const tracker = iaTrackerFor(prefix);
    if (tracker) {
      const period = parseIaPeriod(field);
      // Legacy IA entries without a quarter cannot be placed on the displayed
      // pair — they are ignored rather than guessed.
      if (!period || period.quarter > 2) continue;
      map[facilityId].ia[tracker] = { fy: period.fy, quarter: period.quarter, at: marker.at, by: marker.by, source: marker.source, was: marker.was };
    } else {
      const col = trackedColumnFor(field);
      if (!col) continue;
      map[facilityId].cols[col] = marker;
    }
  }
  return map;
}

/** One marker for a facility column (already scope/day-filtered). */
export function recentMarkerForCol(
  map: RecentMap,
  facilityId: string,
  colKey: string,
): RecentMarker | null {
  return map[facilityId]?.cols[colKey] ?? null;
}

/** The IA marker that applies to a (quarter-display) column, or null.
 *  `quarter` is the DISPLAYED current quarter (1 or 2) and `fy` the FY pair
 *  string ("2026-27") the columns are labelled with. */
export function recentMarkerForIa(
  map: RecentMap,
  facilityId: string,
  tracker: "nqas" | "kayakalp" | "eco",
  fy: string,
  quarter: 1 | 2,
): RecentMarker | null {
  const hit = map[facilityId]?.ia[tracker];
  if (!hit) return null;
  if (hit.fy !== fy || hit.quarter !== quarter) return null;
  return { at: hit.at, by: hit.by, source: hit.source, was: hit.was };
}

/** Row tooltip text, e.g.
 *  "Updated 16-Oct-2026 06:38 · SaQsham import · by Ravi · was: Document in SQAU login". */
export function recentTooltip(
  marker: RecentMarker,
  options?: { formattedAt?: string; sourceLabel?: string },
): string {
  const at = options?.formattedAt ?? new Date(marker.at).toISOString();
  const source = options?.sourceLabel ?? marker.source ?? "Manual edit";
  const bits = [`Updated ${at}`, source];
  if (marker.by) bits.push(`by ${marker.by}`);
  if (marker.was) bits.push(`was: ${marker.was}`);
  return bits.join(" · ");
}

/** Profile chip text — "Updated 16-Oct". */
export function recentChipDate(at: number): string {
  const d = new Date(at);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `Updated ${d.getDate()}-${months[d.getMonth()]}`;
}

export type IaPairLike = { previous: { fy: string; q: number }; current: { fy: string; q: number } } | null;

/**
 * Flatten the recent map into the per-facility COLUMN markers the master
 * table paints: the flat columns (genDoc, documentsStatusReport,
 * pipelineStatus, profile-only SaQsham fields) PLUS the IA trackers FOR THE
 * DISPLAYED COMPARE-PAIR (Q1 = previous quarter, Q2 = current quarter —
 * each with its comparison column). A marker written for a quarter that is
 * not displayed simply does not appear; changing the Compare-quarters
 * selector changes the markers with the columns.
 */
export function resolveCellMarkers(
  map: RecentMap,
  iaPair: IaPairLike,
): Record<string, Record<string, RecentMarker>> {
  const out: Record<string, Record<string, RecentMarker>> = {};
  for (const [facilityId, recent] of Object.entries(map)) {
    const cols: Record<string, RecentMarker> = { ...recent.cols };
    const trackers: [string, "nqas" | "kayakalp" | "eco", string, string, string][] = [
      ["nqas", "nqas", "nqasIaQ1", "nqasIaQ2", "nqasIaCmp"],
      ["kayakalp", "kayakalp", "kayakalpIaQ1", "kayakalpIaQ2", "kayakalpIaCmp"],
      // Part 2: the Eco tracker is deprecated — no recently-updated marker.
    ];
    for (const [, tracker, q1Key, q2Key, cmpKey] of trackers) {
      const hit = recent.ia[tracker];
      if (!hit) continue;
      const prevQ = iaPair?.previous;
      const curQ = iaPair?.current;
      if (prevQ && hit.fy === prevQ.fy && hit.quarter === prevQ.q) cols[q1Key] = { at: hit.at, by: hit.by, source: hit.source, was: hit.was };
      if (curQ && hit.fy === curQ.fy && hit.quarter === curQ.q) {
        cols[q2Key] = { at: hit.at, by: hit.by, source: hit.source, was: hit.was };
        cols[cmpKey] = { at: hit.at, by: hit.by, source: hit.source, was: hit.was };
      }
    }
    if (Object.keys(cols).length > 0) out[facilityId] = cols;
  }
  return out;
}
