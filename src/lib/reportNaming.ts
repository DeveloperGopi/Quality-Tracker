/**
 * REPORT NAMING — one rule for every NQAS status report file.
 *
 * Pattern (Parts 3 of the facility-sheet brief):
 *   {Facility name} {Type label} NQAS Status Report {DD-MM-YYYY}.pdf
 *
 * The date is the GENERATION date in IST (never UTC, so a file generated at
 * 00:30 IST is not stamped with yesterday). The type label map is editable by
 * a State Admin (`appSettings.reportTypeLabels`); an unknown stored type keeps
 * its own text rather than disappearing.
 *
 * Names repeat across blocks, so when another facility has the same name AND
 * the same type label the PHC is appended in brackets:
 *   Narayanapuram HSC (Ramanaickenpettai) NQAS Status Report 26-10-2026.pdf
 *
 * Sanitising removes only characters no file system accepts (`\ / : * ? " < >
 * |`) and control characters. Tamil letters are kept. The whole name is capped
 * at 120 characters, including the extension.
 *
 * Pure module: no React, no Convex, no jsPDF. Used by the browser download,
 * the QR share record, the Excel profile and the tests.
 */

export const REPORT_TYPE_LABELS_KEY = "reportTypeLabels";

/** Defaults from the brief. Editable in Admin → Shared reports. */
export const DEFAULT_REPORT_TYPE_LABELS: Record<string, string> = {
  "HWC HSC": "HSC",
  HSC: "HSC",
  PHC: "PHC",
  UPHC: "UPHC",
  UHWC: "UHWC",
  UGPHC: "UGPHC",
  CHC: "CHC",
  SDH: "SDH",
  DHQH: "DHQH",
};

/** Merge a stored (possibly partial / malformed) map over the defaults. */
export function resolveReportTypeLabels(raw: unknown): Record<string, string> {
  const out = { ...DEFAULT_REPORT_TYPE_LABELS };
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const k = String(key ?? "").trim();
    const v = typeof value === "string" ? value.trim() : "";
    if (!k) continue;
    if (v) out[k] = v;
    else delete out[k];
  }
  return out;
}

/** Type label for a stored facility type. Unknown types keep the stored text. */
export function reportTypeLabel(
  facilityType: string | null | undefined,
  labels: Record<string, string> = DEFAULT_REPORT_TYPE_LABELS,
): string {
  const stored = String(facilityType ?? "").trim();
  if (!stored) return "Facility";
  const hit = labels[stored] ?? labels[stored.toUpperCase()];
  return String(hit ?? stored).trim() || stored;
}

/** DD-MM-YYYY in IST; the sheet's generation date (not a UTC slice). */
export function istReportDate(value: Date | string | number = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  const ist = new Date(date.getTime() + 5.5 * 3600_000);
  const d = String(ist.getUTCDate()).padStart(2, "0");
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  return `${d}-${m}-${ist.getUTCFullYear()}`;
}

/** Remove characters a file system rejects, keep Tamil and every other letter. */
export function sanitizeReportPart(value: unknown): string {
  return String(value ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_NAME = 120;

/**
 * The canonical file name. `duplicate` = another facility has the same normal
 * name AND the same resolved type label, so the PHC disambiguates it.
 */
/**
 * Cycle suffix for a partial print (Part 6): when only some cycles are chosen
 * the file name says which — " (Cycle 1)" or " (Cycles 1-2)". A full print
 * carries no suffix.
 */
export function cycleNameSuffix(cycles: { chosen: number[]; total: number } | null | undefined): string {
  if (!cycles) return "";
  const chosen = [...new Set(cycles.chosen)].sort((a, b) => a - b);
  if (!chosen.length || chosen.length >= Math.max(1, cycles.total)) return "";
  if (chosen.length === 1) return ` (Cycle ${chosen[0]})`;
  return ` (Cycles ${chosen[0]}-${chosen[chosen.length - 1]})`;
}

export function facilityReportFileName(input: {
  name: string | null | undefined;
  facilityType?: string | null;
  phc?: string | null;
  typeLabels?: Record<string, string> | null;
  duplicate?: boolean;
  date?: Date | string | number;
  ext?: "pdf" | "xlsx";
  /** Cycles printed vs cycles that exist — a partial print says so. */
  cycles?: { chosen: number[]; total: number } | null;
}): string {
  const labels = input.typeLabels ?? DEFAULT_REPORT_TYPE_LABELS;
  const name = sanitizeReportPart(input.name) || "Facility";
  // A facility with no recorded type simply has no type segment — never the
  // generic "Facility" twice ("Facility Facility NQAS Status Report …").
  const storedType = sanitizeReportPart(input.facilityType);
  const type = storedType ? sanitizeReportPart(reportTypeLabel(input.facilityType, labels)) : "";
  const phc = sanitizeReportPart(input.phc);
  const ext = input.ext ?? "pdf";
  const suffix = ` NQAS Status Report ${istReportDate(input.date)}.${ext}`;
  const phcPart = input.duplicate && phc ? ` (${phc})` : "";
  const cyclePart = cycleNameSuffix(input.cycles);
  const head = [name, type].filter(Boolean).join(" ") + phcPart + cyclePart;
  // Cap the stem, never the extension: a very long Tamil name still saves.
  const room = Math.max(12, MAX_NAME - suffix.length);
  return `${head.slice(0, room).trim()}${suffix}`;
}

/** True when two normalised facility names + type labels collide. */
export function sameReportName(
  a: { name?: string | null; facilityType?: string | null },
  b: { name?: string | null; facilityType?: string | null },
  labels: Record<string, string> = DEFAULT_REPORT_TYPE_LABELS,
): boolean {
  const norm = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  return (
    norm(a.name) === norm(b.name) &&
    norm(reportTypeLabel(a.facilityType, labels)) === norm(reportTypeLabel(b.facilityType, labels))
  );
}

/** Does another facility need the PHC suffix? Entity id is compared when given. */
export function needsPhcSuffix(
  facility: { _id?: string | null; name?: string | null; facilityType?: string | null },
  others: { _id?: string | null; name?: string | null; facilityType?: string | null }[],
  labels: Record<string, string> = DEFAULT_REPORT_TYPE_LABELS,
): boolean {
  return others.some(
    (other) =>
      (!facility._id || !other._id || String(other._id) !== String(facility._id)) &&
      sameReportName(facility, other, labels),
  );
}

/** RFC 5987-safe Content-Disposition for the app and the QR file endpoint. */
export function contentDisposition(kind: "inline" | "attachment", name: string): string {
  const fallback = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${kind}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
