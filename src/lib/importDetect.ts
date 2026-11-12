/**
 * SMART PASTE / DROP — which importer does this clipboard belong to?
 *
 * Pure and header-only: the detection NEVER reads a score, guesses a quarter
 * or touches a facility. It only answers "which of the three importers should
 * open", so a mis-detection costs one click and never a wrong write.
 *
 * The three importers and their unmistakable headers:
 *   • SaQsham  — Application No + Status (and a facility name column)
 *   • IA       — NIN Number (or the old Facility for Formula) + Financial Year
 *                + Quarter + at least one score column
 *   • Master   — Facility + Block + NIN or Type
 *
 * A header row that matches more than one importer is AMBIGUOUS: the UI asks
 * the user instead of silently picking one.
 */

export type ImportKind = "saqsham" | "ia" | "facility-master" | "links";

export const IMPORT_KIND_LABEL: Record<ImportKind, string> = {
  saqsham: "SaQsham document status",
  ia: "Internal Assessment",
  "facility-master": "Facility master",
  links: "Links Organiser",
};

export type DetectedImport = {
  kind: ImportKind | null;
  label: string;
  rows: number;
  columns: number;
  /** More than one kind matched — the user must choose. */
  ambiguous: boolean;
  /** Every kind whose headers matched (for the chooser). */
  matches: ImportKind[];
};

/** Detect the import type from clipboard text / a text file. */
export function detectImportText(text: string): DetectedImport {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");
  const header = (lines[0] ?? "").split(/\t|,/).map((h) => h.trim().toLowerCase());
  const has = (...needles: string[]) =>
    needles.every((n) => header.some((h) => h.includes(n)));

  const matches: ImportKind[] = [];
  if (has("application") && (has("status") || has("facility name"))) matches.push("saqsham");
  if (
    (has("nin number") || has("facility for formula")) &&
    has("financial year") &&
    has("quarter") &&
    (has("nqas ia") || has("kayakalp ia"))
  )
    matches.push("ia");
  // The IA file also carries Block and NIN — a quarter column pair means it is
  // the IA import, not the master import.
  const looksQuarterly = has("financial year") && has("quarter");
  if (has("facility") && has("block") && (has("nin") || has("type")) && !looksQuarterly)
    matches.push("facility-master");
  if (has("report name") && has("category") && (has("link") || has("form link")))
    matches.push("links");

  const kind = matches.length === 1 ? matches[0] : null;
  return {
    kind,
    label: kind ? IMPORT_KIND_LABEL[kind] : "Unknown",
    rows: Math.max(0, lines.length - 1),
    columns: header.length,
    ambiguous: matches.length > 1,
    matches,
  };
}
