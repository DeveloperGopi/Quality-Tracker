/** Pure date helpers used by Annexure parsing. No reader/PDF packages. */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function iso(year: number, month: number, day: number): string | null {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type ResultPageText = {
  pageNumber: number;
  /** OCR confidence for the page, when one is available. */
  confidence?: number;
  /** Date printed at the top right of the letter. */
  topRightText?: string;
  text: string;
};

export type TargetResultOptions = {
  /** Facility named on the page. Omit to read every table row. */
  name?: string | null;
  facilityType?: string | null;
};

export type TargetResultRow = {
  facilityNameRaw: string;
  district: string | null;
  state: string | null;
  title: string;
  pageNumber: number;
  letterDate: string | null;
  assessmentStartDate: string | null;
  assessmentEndDate: string | null;
  certificationStatus: string | null;
  mode: string | null;
  packageCount: number | null;
  criteriaMet: number | null;
  criteriaTotal: number | null;
  overallScore: number | null;
  letterScore: number | null;
  pssScore: number | null;
  areas: [];
  departments: [];
  departmentsKind: "package";
  warnings: string[];
};

const RESULT_STATUS =
  /(Quality\s+Certified|Certified\s+with\s+Conditionality|Conditionally\s+Certified|Deferred|Not\s+Certified|Result\s+Declared)/i;

function resultNameKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseOneDate(text: string): string | null {
  return findDateRange(text)?.start ?? null;
}

/**
 * Read the letter's facility table. The letter carries the authoritative
 * overall score; the Annexure carries the criterion breakdown. Keeping this
 * separate is what prevents an aggregate like 92.42% from replacing 91.28%.
 */
export function parseTargetResultLetter(
  pages: readonly ResultPageText[],
  target: TargetResultOptions = {},
): TargetResultRow[] {
  const wanted = target.name ? resultNameKey(target.name) : "";
  const rows: TargetResultRow[] = [];
  for (const page of pages) {
    const lines = page.text
      .split(/\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const letterDate =
      parseOneDate(page.topRightText ?? "") ??
      parseOneDate(lines.find((line) => /date\s*(?:of\s*letter)?\s*[:-]/i.test(line)) ?? "");
    for (const line of lines) {
      const dates = findDateRange(line);
      const percentages = [...line.matchAll(/(\d{1,3}(?:\.\d{1,2})?)\s*%/g)];
      if (!dates || percentages.length === 0) continue;
      // An aggregate/criterion line has a score but no assessment date range.
      const lineKey = resultNameKey(line);
      if (wanted && !lineKey.includes(wanted)) continue;
      const status = line.match(RESULT_STATUS)?.[1]?.replace(/\s+/g, " ") ?? null;
      if (!status && !/service\s+packages?|criteria/i.test(line)) continue;
      const mode = line.match(/\b(Physical|Virtual|Hybrid|Tele(?:-?health)?)\b/i)?.[1] ?? null;

      const beforeDate = line.slice(
        0,
        line.search(
          /\d{1,2}[\s-][A-Za-z]{3,9}\.?[\s-]\d{2,4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2}/,
        ),
      );
      const nameParts = beforeDate
        .replace(/^\s*\d+[.)]?\s*/, "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const facilityNameRaw = nameParts[0] ?? target.name ?? "Facility";
      const district = nameParts[1] ?? null;
      const state = nameParts.slice(2).join(", ") || null;
      const packageCount = Number(line.match(/(\d{1,2})\s+Service\s+Packages?/i)?.[1]) || null;
      const criteria = line.match(/Met\s+(\d+)\s+out\s+of\s+(\d+)\s+Criteria/i);
      const overallScore = Number(percentages[0]?.[1]);
      const warnings: string[] = [];
      if (!Number.isFinite(overallScore)) warnings.push("Overall score was not readable.");
      if (!letterDate) warnings.push("Letter date was not readable.");
      rows.push({
        facilityNameRaw,
        district,
        state,
        title: line,
        pageNumber: page.pageNumber,
        letterDate,
        assessmentStartDate: dates.start,
        assessmentEndDate: dates.end,
        certificationStatus: status,
        mode,
        packageCount,
        criteriaMet: criteria ? Number(criteria[1]) : null,
        criteriaTotal: criteria ? Number(criteria[2]) : null,
        overallScore: Number.isFinite(overallScore) ? overallScore : null,
        letterScore: Number.isFinite(overallScore) ? overallScore : null,
        pssScore: null,
        areas: [],
        departments: [],
        departmentsKind: "package",
        warnings,
      });
    }
  }
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${resultNameKey(row.facilityNameRaw)}|${row.assessmentStartDate}|${row.overallScore}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Find the first one or two dates in a printed date range. */
export function findDateRange(text: string): { start: string; end: string } | null {
  const found: string[] = [];
  const numeric = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/g;
  const named = /\b(\d{1,2})[\s-]([A-Za-z]{3,9})\.?[\s-](\d{2,4})\b/g;
  const yearFirst = /\b(\d{4})[./-](\d{1,2})[./-](\d{1,2})\b/g;
  for (const match of text.matchAll(numeric)) {
    const value = iso(Number(match[3]), Number(match[2]), Number(match[1]));
    if (value) found.push(value);
  }
  for (const match of text.matchAll(named)) {
    const month = MONTHS[match[2].slice(0, 3).toLowerCase()] ?? 0;
    const value = iso(Number(match[3]), month, Number(match[1]));
    if (value) found.push(value);
  }
  for (const match of text.matchAll(yearFirst)) {
    const value = iso(Number(match[1]), Number(match[2]), Number(match[3]));
    if (value) found.push(value);
  }
  if (found.length === 0) return null;
  return { start: found[0], end: found[1] ?? found[0] };
}
