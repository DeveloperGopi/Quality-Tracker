/**
 * ANNEXURE I — pure text parsing and facility matching.
 *
 * The NQAS Result PDF is extracted once on the server. This module turns the
 * text into per-facility sections and matches each title line to a facility by
 * name + district (block). It deliberately has no Convex or browser imports,
 * so the same rules can be checked without a database.
 */

import { findDateRange } from "./resultParse";

export const AREA_KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
export type AreaKey = (typeof AREA_KEYS)[number];

export type ParsedArea = {
  key: AreaKey;
  name: string;
  score: number;
  confidence?: number;
  page?: number;
};

export type ParsedDepartment = {
  /** Exactly as printed. */
  name: string;
  canonicalName: string;
  score: number;
  /** The PDF name was not in Admin → General → Department names. */
  isNew: boolean;
  confidence?: number;
  page?: number;
};

export type ParsedAnnexureSection = {
  /** Facility part of the title line, exactly as printed. */
  facilityNameRaw: string;
  district: string | null;
  state: string | null;
  /** All title text, for the unmatched list. */
  title: string;
  pageNumber: number;
  /** Date of External Assessment from the Annexure header, as ISO. */
  assessmentDate?: string | null;
  letterScore: number | null;
  overallScore: number | null;
  pssScore: number | null;
  areas: ParsedArea[];
  departments: ParsedDepartment[];
  /** "department" for Departmental Score, "package" for Theme Wise Score. */
  departmentsKind: "department" | "package";
  /** Annexure criteria table: rows marked "Criteria Met". */
  criteriaMet: number | null;
  criteriaTotal: number | null;
  warnings: string[];
  /** Per-field confidence/page from the vision reader. */
  fieldMeta?: Partial<Record<string, { confidence: number; page: number }>>;
};

export type DepartmentAlias = { pdfName: string; canonicalName: string };

/** Page numbers that begin a new annexure (heading line, case/punctuation loose). */
export function annexureStartPages(pages: string[]): number[] {
  const starts: number[] = [];
  pages.forEach((text, index) => {
    const lines = text.split(/\n/).map((line) =>
      line.toLowerCase().replace(/[^a-z0-9]+/g, "").trim(),
    );
    if (
      lines.some(
        (line) =>
          line.includes("summaryofexternalassessmentreport") ||
          line.includes("externalassessmentreport"),
      )
    ) {
      starts.push(index + 1);
    }
  });
  return starts;
}

export type FacilityForMatch = {
  _id: string;
  name: string;
  block: string;
  phc: string;
  facilityType?: string;
};

export type FacilityMatch = {
  facility: FacilityForMatch | null;
  status: "matched" | "unmatched" | "ambiguous";
  score: number;
  /** Other close candidates, only used to explain an ambiguity. */
  alternatives: { name: string; block: string; score: number }[];
};

/** The heading is matched without requiring "(Annexure I)"; OCR noise and
 *  the 2024/2025 layouts vary in case, punctuation and the optional label. */
const ANNEXURE_HEADING =
  /Summary\s+(?:of\s+)?External\s+Assessment\s+Report(?:\s*\(?\s*Annexure\s*[-–]?\s*(?:I|1|[A-H])\s*\)?)?/gi;

const NUMBER = /(\d{1,3}(?:\.\d{1,2})?)/;
const SCORE_ONLY = /^\s*(\d{1,3}(?:\.\d{1,2})?)\s*%?\s*$/;

const STOP_WORDS = new Set([
  "aam",
  "aam-phc",
  "aam phc",
  "aam-shc",
  "aam shc",
  "aam-uphc",
  "aam uphc",
  "phc",
  "chc",
  "uphc",
  "uhwc",
  "hwc",
  "hsc",
  "sdh",
  "dh",
  "ugphc",
  "uamm",
  "uphc-hsc",
  "hwc-hsc",
  "phc-hsc",
  "phc hsc",
]);

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function firstNumber(text: string): number | null {
  const match = text.match(NUMBER);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function lastNumber(text: string): number | null {
  const matches = [...text.matchAll(/\d{1,3}(?:\.\d{1,2})?/g)];
  if (matches.length === 0) return null;
  const value = Number(matches[matches.length - 1][0]);
  return Number.isFinite(value) ? value : null;
}

/** Read a score printed on the label line or the next non-empty line. */
function scoreNear(
  lines: string[],
  start: number,
  label: RegExp,
): { value: number | null; index: number } {
  for (let i = start; i < lines.length; i += 1) {
    if (!label.test(lines[i])) continue;
    const same = lines[i].replace(label, " ");
    const direct = firstNumber(same);
    if (direct != null) return { value: direct, index: i };
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j += 1) {
      const next = lines[j];
      if (!next) continue;
      const only = next.match(SCORE_ONLY)?.[1];
      if (only != null) {
        const value = Number(only);
        return { value: Number.isFinite(value) ? value : null, index: i };
      }
      const embedded = firstNumber(next);
      if (embedded != null) return { value: embedded, index: i };
      // A different label means this score is simply absent.
      if (/[a-z]{3,}/i.test(next)) break;
    }
    return { value: null, index: i };
  }
  return { value: null, index: -1 };
}

function splitTitle(text: string): { facilityNameRaw: string; district: string | null; state: string | null; title: string } {
  const lines = text
    .split(/\n/)
    .map(cleanLine)
    .filter(Boolean)
    .filter(
      (line) =>
        !/^Summary\s+of\s+External/i.test(line) &&
        !/^Annexure\s*[-–]?\s*I/i.test(line) &&
        !/^(NQAS|National Quality Assurance Standards|External Assessment Report)$/i.test(line),
    );

  const labelledFacility = text.match(
    /(?:Facility\s*Name|Name\s*of\s*(?:the\s*)?Facility|Institution)\s*[:\-]\s*([^\n]+)/i,
  )?.[1];
  const labelledDistrict = text.match(
    /District\s*[:\-]\s*([^\n,]+)/i,
  )?.[1];
  const labelledState = text.match(/State\s*[:\-]\s*([^\n,]+)/i)?.[1];

  const commaLine = lines.find(
    (line) =>
      line.includes(",") &&
      !/score|department|area|patient|standard|indicator|marks|total/i.test(line) &&
      line.split(",").filter(Boolean).length >= 1,
  );
  const raw = (labelledFacility ?? commaLine ?? "").trim();
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  let facilityNameRaw = parts[0] ?? raw;
  let district = labelledDistrict?.trim() ?? parts[1] ?? null;
  let state = labelledState?.trim() ?? parts[2] ?? null;

  if (!facilityNameRaw) {
    // Last resort: the first meaningful line after the heading.
    facilityNameRaw = lines.find((line) => /[a-z]/i.test(line)) ?? "Unknown facility";
  }
  // Some exports put "Name - District" without a comma.
  if (!district) {
    const dash = facilityNameRaw.match(/^(.*?)\s+[-–]\s+(.+)$/);
    if (dash && /district|block|tirup|vellore|krishnagiri|dharmapuri/i.test(dash[2])) {
      facilityNameRaw = dash[1].trim();
      district = dash[2].trim();
    }
  }
  // "AAM-PHC Koratti Tirupathur Tamil Nadu" — no comma at all.
  if (!district) {
    const spaced = facilityNameRaw.match(
      /^(.*?)\s+(Tirupathur|Tirupattur|Thirupathur|Thirupattur|Vellore|Ranipet|Tiruvannamalai|Krishnagiri|Dharmapuri|Salem)(?:\s*,?\s*(Tamil\s*Nadu|TN))?$/i,
    );
    if (spaced) {
      facilityNameRaw = spaced[1].trim();
      district = spaced[2].trim();
      state = state ?? spaced[3]?.trim() ?? null;
    }
  }
  if (state && /^(Tamil\s*Nadu|TN)$/i.test(state) === false && parts.length <= 2) {
    // A third comma token is normally the state; keep whatever was printed.
  }
  return {
    facilityNameRaw: cleanLine(facilityNameRaw),
    district: district ? cleanLine(district) : null,
    state: state ? cleanLine(state) : null,
    title: raw || facilityNameRaw,
  };
}

function headingIndex(lines: string[], expression: RegExp, from = 0): number {
  for (let i = from; i < lines.length; i += 1) {
    if (expression.test(lines[i])) return i;
  }
  return -1;
}

function parseAreaSection(
  lines: string[],
  start: number,
  end: number,
): Map<AreaKey, { name: string; score: number }> {
  const out = new Map<AreaKey, { name: string; score: number }>();
  let pendingKey: AreaKey | null = null;
  let pendingName = "";

  const add = (key: AreaKey, name: string, score: number) => {
    const previous = out.get(key);
    if (!previous || previous.score == null) {
      out.set(key, { name: name || previous?.name || key, score });
    }
  };

  for (let i = start; i < end; i += 1) {
    const line = lines[i];
    if (!line) continue;
    if (/^(area\s+of\s+concern|s\.?\s*no|score|sl\.?\s*no)/i.test(line)) continue;

    // Tables often print a serial number before the area letter.
    const keyed = line.match(
      /^\s*(?:\d{1,3}[.)]?\s*)?\(?([A-Ha-h])\)?[\s.\-:)]+(.*)$/,
    );
    const alone = line.match(/^\s*(?:\d{1,3}[.)]?\s*)?\(?([A-Ha-h])\)?\s*$/);
    if (keyed) {
      const key = keyed[1].toUpperCase() as AreaKey;
      if (!AREA_KEYS.includes(key)) continue;
      const rest = keyed[2].trim();
      pendingName = "";
      let score = lastNumber(rest);
      let name = rest.replace(/\d{1,3}(?:\.\d{1,2})?/g, " ").replace(/[|:;]+/g, " ").trim();
      if (score == null) {
        for (let j = i + 1; j < Math.min(end, i + 4); j += 1) {
          const next = lines[j];
          if (!next) continue;
          if (/^\s*\(?([A-Ha-h])\)?[\s.\-:)]+/.test(next)) break;
          score = lastNumber(next);
          if (score != null) {
            if (!name && /[a-z]/i.test(next)) {
              name = next.replace(/\d{1,3}(?:\.\d{1,2})?/g, " ").trim();
            }
            break;
          }
        }
      }
      if (score != null) add(key, name, score);
      else {
        pendingKey = key;
        pendingName = name;
      }
      continue;
    }
    if (alone) {
      pendingKey = alone[1].toUpperCase() as AreaKey;
      pendingName = "";
      continue;
    }
    if (pendingKey) {
      const score = lastNumber(line);
      if (score != null) {
        const name = line
          .replace(/\d{1,3}(?:\.\d{1,2})?/g, " ")
          .replace(/[|:;]+/g, " ")
          .trim();
        add(pendingKey, name || pendingName, score);
        pendingKey = null;
        pendingName = "";
      } else if (!pendingName && /[a-z]/i.test(line)) {
        pendingName = line.replace(/[|:;]+/g, " ").trim();
      }
    }
  }

  return out;
}

function parseDepartmentSection(
  lines: string[],
  start: number,
  end: number,
  aliases: DepartmentAlias[],
): ParsedDepartment[] {
  const out: ParsedDepartment[] = [];
  let pendingName = "";
  const seen = new Set<string>();
  const aliasMap = new Map(
    aliases.map((a) => [normalizeDepartment(a.pdfName), a.canonicalName.trim()]),
  );

  const push = (rawName: string, score: number) => {
    const name = cleanLine(
      rawName
        .replace(/^\s*(?:s\.?\s*no|sl\.?\s*no|department(?:al)?\s*(?:name)?)\s*[.:\-]?\s*/i, "")
        .replace(/\d{1,3}(?:\.\d{1,2})?/g, " ")
        .replace(/[|:;]+/g, " "),
    );
    if (!name || name.length < 2) return;
    if (/^(total|overall|department|departments|score|name)$/i.test(name)) return;
    const key = normalizeDepartment(name);
    if (seen.has(key)) return;
    seen.add(key);
    const canonical = aliasMap.get(key);
    out.push({
      name,
      canonicalName: canonical ?? name,
      score,
      isNew: !canonical,
    });
  };

  for (let i = start; i < end; i += 1) {
    const line = lines[i];
    if (!line) continue;
    if (
      /^(department(?:al)?\s*(?:name|score)?|s\.?\s*no|sl\.?\s*no|score|name)$/i.test(line) ||
      /^departments?\s*[:\-]?\s*\d+$/i.test(line) ||
      /^no\.?\s*of\s*departments?/i.test(line) ||
      /^certification\s+criteria$/i.test(line) ||
      /^\d{1,2}[.)]?\s+criteria\s+(?:met|not\s+met)$/i.test(line)
    ) {
      continue;
    }
    const numbers = [...line.matchAll(/\d{1,3}(?:\.\d{1,2})?/g)];
    if (numbers.length === 0) {
      const possible = cleanLine(line.replace(/[|:;]+/g, " "));
      if (/[a-z]/i.test(possible) && possible.length <= 80) pendingName = possible;
      continue;
    }
    // "1 Indoor" with the score on the next line: the lone number is a
    // serial number, not a score.
    if (
      numbers.length === 1 &&
      /^\s*\d{1,2}[.)]?\s+[a-z]/i.test(line) &&
      !/^\s*\d{1,2}[.)]?\s+\d+\s*$/.test(line)
    ) {
      let nextScore: string | null = null;
      for (let j = i + 1; j < Math.min(end, i + 4); j += 1) {
        if (!lines[j]) continue;
        nextScore = lines[j].match(SCORE_ONLY)?.[1] ?? null;
        break;
      }
      if (nextScore != null) {
        pendingName = cleanLine(
          line.replace(/^\s*\d{1,2}[.)]?\s*/, "").replace(/[|:;]+/g, " "),
        );
        continue;
      }
    }
    const score = lastNumber(line);
    if (score == null) continue;
    // Strip the serial number AND the score; whatever text remains is the
    // department name ("1 Indoor 86.5" → "Indoor").
    const name = cleanLine(
      line
        .replace(/\d{1,3}(?:\.\d{1,2})?/g, " ")
        .replace(/^\s*(?:s\.?\s*no|sl\.?\s*no)[.:\-]?\s*/i, "")
        .replace(/[|:;]+/g, " "),
    );
    push(name || pendingName, score);
    pendingName = "";
  }
  return out;
}

function departmentCountLetter(text: string): number | null {
  const match =
    text.match(/\b(\d{1,2})\s+Departments?\b/i) ??
    text.match(/No\.?\s*of\s*Departments?\s*[:\-]?\s*(\d{1,2})/i);
  return match ? Number(match[1]) : null;
}

export function normalizeDepartment(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A real facility title line (name + district), not a repeated table header. */
function hasFacilityTitle(text: string): boolean {
  if (/(?:Facility\s*Name|Name\s*of\s*(?:the\s*)?Facility|Institution)\s*[:\-]/i.test(text)) {
    return true;
  }
  return text
    .split(/\n/)
    .map(cleanLine)
    .filter(Boolean)
    .some(
      (line) =>
        !/\d/.test(line) &&
        !/score|department|area|patient|standard|indicator|marks|total/i.test(line) &&
        (/\b(?:Tirupathur|Tirupattur|Thirupathur|Thirupattur|Vellore|Ranipet|Tiruvannamalai|Krishnagiri|Dharmapuri|Salem|Tamil\s*Nadu|TN)\b/i.test(
          line,
        ) ||
          /^\s*(?:aam|phc|chc|uphc|uhwc|hwc|hsc|sdh|dh|ugphc|uamm)\b/i.test(line)),
    );
}

/** Parse one extracted PDF text (pages joined with \f). */
export function parseAnnexureText(
  text: string,
  options: { departmentNames?: DepartmentAlias[] } = {},
): ParsedAnnexureSection[] {
  const aliases = options.departmentNames ?? [];
  const matches = [...text.matchAll(ANNEXURE_HEADING)];
  if (matches.length === 0) return [];

  // PAGE SPLITS: the heading and its table header repeat when a table
  // continues on the next page. A repeated chunk has no facility title, so it
  // is appended to the section above instead of becoming a second facility.
  const groups: { sectionText: string; pageNumber: number }[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const start = match.index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const chunk = text.slice(start, end);
    const before = text.slice(0, start);
    const pageNumber = (before.match(/\f/g)?.length ?? 0) + 1;
    const previous = groups[groups.length - 1];
    const titled = hasFacilityTitle(chunk);
    // A repeated FULL header may print the same facility title again. It is
    // still the same facility in the same file, so keep one section.
    const previousTitle = previous ? splitTitle(previous.sectionText) : null;
    const chunkTitle = titled ? splitTitle(chunk) : null;
    const sameTitle =
      !!previousTitle &&
      !!chunkTitle &&
      normalizeFacilityName(previousTitle.facilityNameRaw) ===
        normalizeFacilityName(chunkTitle.facilityNameRaw) &&
      normalizeDepartment(previousTitle.district ?? "") ===
        normalizeDepartment(chunkTitle.district ?? "");
    if (previous && (!titled || sameTitle)) {
      previous.sectionText += `\n${chunk}`;
    } else {
      groups.push({ sectionText: chunk, pageNumber });
    }
  }

  const sections: ParsedAnnexureSection[] = [];
  for (const group of groups) {
    const sectionText = group.sectionText;
    const pageNumber = group.pageNumber;
    const title = splitTitle(sectionText);
    const core = sectionText.split(/Score\s+against\s+each\s+Standard|Proportionate\s+score/i)[0];
    const lines = core.split(/\n/).map(cleanLine).filter(Boolean);

    const overall = scoreNear(
      lines,
      0,
      /Overall\s*(?:NQAS\s*)?Score|Total\s*Score/i,
    ).value;
    // A score table may have an area named “Patient Satisfaction”; only a
    // label that actually names the PSS section may end the area table.
    const PSS_LABEL =
      /Patient\s*Satisfaction\s*(?:\(\s*PSS\s*\)|Score)|PSS\s*(?:Score)?/i;
    let pss = scoreNear(lines, 0, PSS_LABEL).value;
    if (pss == null) {
      const bare = headingIndex(lines, /^Patient\s*Satisfaction\s*$/i);
      if (bare >= 0) {
        for (let i = bare + 1; i < Math.min(lines.length, bare + 3); i += 1) {
          const value = lines[i].match(SCORE_ONLY)?.[1];
          if (value != null) {
            const parsedValue = Number(value);
            pss = Number.isFinite(parsedValue) ? parsedValue : null;
            break;
          }
        }
      }
    }
    const letter = scoreNear(
      lines,
      0,
      /(?:NQAS|Letter|Final|Certification)\s*Score|Score\s*(?:as\s*per)?\s*Letter/i,
    ).value;

    const areaHeading = headingIndex(
      lines,
      /Area\s*of\s*Concern(?:\s*wise)?\s*Score|Area\s*of\s*Concern/i,
    );
    const patientHeading = headingIndex(
      lines,
      /Patient\s*Satisfaction\s*(?:\(\s*PSS\s*\)|Score)|PSS\s*(?:Score)?/i,
    );
    const deptHeading = headingIndex(
      lines,
      /Departmental\s*Score|Department\s*wise\s*Score|Department\s*Score|Theme\s*wise\s*Score|Theme\s*Score/i,
    );
    const departmentsKind: "department" | "package" =
      deptHeading >= 0 && /theme/i.test(lines[deptHeading]) ? "package" : "department";
    const standardHeading = headingIndex(lines, /Score\s*against\s*each\s*Standard/i);
    const criteriaHeading = headingIndex(lines, /Certification\s*Criteria/i);

    const candidateEnds = [
      areaHeading,
      patientHeading,
      deptHeading,
      criteriaHeading,
      standardHeading,
      lines.length,
    ].filter((n) => n >= 0);
    const nextEnd = (from: number) =>
      candidateEnds.filter((n) => n > from).sort((a, b) => a - b)[0] ?? lines.length;

    const areaStart = areaHeading >= 0 ? areaHeading + 1 : -1;
    const areaEnd = areaStart >= 0 ? nextEnd(areaHeading) : -1;
    let areaMap =
      areaStart >= 0 ? parseAreaSection(lines, areaStart, areaEnd) : new Map<AreaKey, { name: string; score: number }>();

    // Some layouts do not print the heading as extracted text. Scan the core
    // only after the overall score and stop before the Standard table.
    if (areaMap.size === 0) {
      const fallbackStart = Math.max(
        0,
        lines.findIndex((l) => /Overall\s*(?:NQAS\s*)?Score/i.test(l)) + 1,
      );
      areaMap = parseAreaSection(lines, fallbackStart, lines.length);
    }

    const deptStart = deptHeading >= 0 ? deptHeading + 1 : -1;
    const deptEnd = deptStart >= 0 ? nextEnd(deptHeading) : -1;
    let departments =
      deptStart >= 0
        ? parseDepartmentSection(lines, deptStart, deptEnd, aliases)
        : [];
    if (departments.length === 0 && deptHeading < 0) {
      const inferred = headingIndex(lines, /Department(?:s)?\b/i);
      if (inferred >= 0) {
        departments = parseDepartmentSection(lines, inferred + 1, nextEnd(inferred), aliases);
      }
    }

    const areas: ParsedArea[] = AREA_KEYS.flatMap((key) => {
      const row = areaMap.get(key);
      return row ? [{ key, name: row.name || key, score: row.score }] : [];
    });
    const warnings: string[] = [];
    if (areas.length !== 8) {
      warnings.push(`Only ${areas.length} of 8 areas found.`);
    }
    const declaredDepartments = departmentCountLetter(core);
    if (
      declaredDepartments != null &&
      departments.length !== declaredDepartments
    ) {
      warnings.push(
        `The letter says ${declaredDepartments} departments; ${departments.length} department scores were read.`,
      );
    }
    for (const [label, value] of [
      ["Overall Score", overall],
      ["Patient Satisfaction (PSS)", pss],
      ["Letter score", letter],
    ] as [string, number | null][]) {
      if (value != null && (value < 0 || value > 100)) {
        warnings.push(`${label} is outside 0–100.`);
      }
    }
    for (const area of areas) {
      if (area.score < 0 || area.score > 100) warnings.push(`Area ${area.key} is outside 0–100.`);
    }
    for (const dept of departments) {
      if (dept.score < 0 || dept.score > 100) warnings.push(`${dept.name} is outside 0–100.`);
    }
    if (letter != null && overall != null && Math.abs(letter - overall) >= 0.05) {
      warnings.push(
        `Annexure overall is ${overall.toFixed(2)}; the letter score is ${letter.toFixed(2)}.`,
      );
    }
    if (overall == null) warnings.push("Overall Score was not found.");
    if (pss == null) warnings.push("Patient Satisfaction (PSS) score was not found.");
    if (departments.length === 0) warnings.push("No department scores were found.");

    // The criteria table can follow the PSS block or the Standard table.
    // Count rows that say "Criteria Met"; a "Not Met" row is counted in the
    // total only.
    const assessmentDate = findDateRange(sectionText.slice(0, 1600))?.start ?? null;
    const criteriaAt = sectionText.search(/Certification\s*Criteria/i);
    const criteriaSection = criteriaAt >= 0 ? sectionText.slice(criteriaAt) : "";
    // 2025 letters have no criteria column. Count only numbered criteria rows
    // in the Annexure, which avoids counting the table header as “Met”.
    const criteriaRows = criteriaSection
      .split(/\n/)
      .map((line) => cleanLine(line))
      .filter((line) => /^\d{1,3}[.)]?\s+/.test(line))
      .filter((line) => /\b(?:met|not\s*met)\b/i.test(line));
    const criteriaMet = criteriaRows.filter(
      (line) => !/not\s*met/i.test(line),
    ).length;
    const criteriaTotal = criteriaRows.length;

    sections.push({
      facilityNameRaw: title.facilityNameRaw,
      district: title.district,
      state: title.state,
      title: title.title,
      pageNumber,
      assessmentDate,
      letterScore: letter,
      overallScore: overall,
      pssScore: pss,
      areas,
      departments,
      departmentsKind,
      criteriaMet: criteriaTotal > 0 ? criteriaMet : null,
      criteriaTotal: criteriaTotal > 0 ? criteriaTotal : null,
      warnings,
    });
  }
  return sections;
}

/* -------------------------------------------------------------------------- */
/* Facility matching                                                          */
/* -------------------------------------------------------------------------- */

function stripTypePrefix(value: string): string {
  let out = value;
  let changed = true;
  while (changed) {
    changed = false;
    const match = out.match(/^([a-z][a-z0-9]*(?:\s*[-–]\s*[a-z][a-z0-9]*)?)\s*[-–:]\s*/i);
    if (match) {
      const prefix = normalizeDepartment(match[1]);
      if (STOP_WORDS.has(prefix)) {
        out = out.slice(match[0].length);
        changed = true;
        continue;
      }
    }
    const words = out.split(/\s+/);
    if (words.length > 1 && STOP_WORDS.has(normalizeDepartment(words[0]))) {
      out = words.slice(1).join(" ");
      changed = true;
    }
  }
  return out.trim();
}

function normalizeFacilityName(value: string): string {
  return normalizeDepartment(
    stripTypePrefix(value)
      .replace(/\([^)]*\)/g, " ")
      .replace(
        /\b(?:tirupathur|tirupattur|thirupathur|thirupattur|vellore|ranipet|tiruvannamalai|krishnagiri|dharmapuri|salem|tamil\s*nadu|tn)\b/gi,
        " ",
      ),
  );
}

function printedFacilityType(value: string): string | null {
  const type = value.toUpperCase();
  if (/AAM\s*[-–]?\s*UPHC/.test(type)) return "UPHC";
  if (/AAM\s*[-–]?\s*PHC/.test(type)) return "PHC";
  if (/AAM\s*[-–]?\s*SHC/.test(type)) return "HSC";
  if (/\bUPHC\b/.test(type)) return "UPHC";
  if (/\bCHC\b/.test(type)) return "CHC";
  if (/\bPHC\b/.test(type)) return "PHC";
  if (/\bHSC\b/.test(type)) return "HSC";
  return null;
}

function sameDistrict(parsed: ParsedAnnexureSection, facility: FacilityForMatch): boolean {
  const district = normalizeDepartment(parsed.district ?? "");
  if (!district) return true;
  const block = normalizeDepartment(facility.block);
  if (district === block) return true;
  // Some reports print the revenue district, not the block. Keep a name match
  // when the token is the app's district, otherwise prefer the exact block.
  return ["tirupathur", "tirupattur", "thirupathur", "thirupattur"].includes(district);
}

/** Match a title line to a facility by name and district (block). */
export function matchAnnexureFacility(
  parsed: ParsedAnnexureSection,
  facilities: FacilityForMatch[],
  options: { district?: string | null; ignoreDistrict?: boolean } = {},
): FacilityMatch {
  const wanted = normalizeFacilityName(parsed.facilityNameRaw);
  const districtFilter = normalizeDepartment(options.district ?? "");
  // "Tirupathur" is the app's revenue district, not one block: never filter
  // the other blocks out. A caller that explicitly names a block still gets
  // that block filter.
  const blockFilter =
    districtFilter &&
    !["tirupathur", "tirupattur", "thirupathur", "thirupattur"].includes(districtFilter)
      ? districtFilter
      : "";
  const candidates: { facility: FacilityForMatch; score: number }[] = [];
  const type = printedFacilityType(parsed.facilityNameRaw);

  for (const facility of facilities) {
    if (blockFilter && normalizeDepartment(facility.block) !== blockFilter) continue;
    const name = normalizeFacilityName(facility.name);
    const phc = normalizeFacilityName(facility.phc);
    if (!wanted) continue;
    let score = 0;
    if (name === wanted) score = 100;
    else if (phc && phc === wanted) score = 88;
    else if (name.startsWith(wanted) || wanted.startsWith(name)) score = 74;
    else if (name.includes(wanted) || wanted.includes(name)) score = 62;
    else {
      const a = new Set(wanted.split(" ").filter(Boolean));
      const b = new Set(name.split(" ").filter(Boolean));
      const overlap = [...a].filter((t) => b.has(t)).length;
      const ratio = overlap / Math.max(a.size, b.size, 1);
      if (ratio >= 0.65) score = 45 + ratio * 20;
    }
    if (score <= 0) continue;
    if (type && facility.facilityType && normalizeDepartment(facility.facilityType) === normalizeDepartment(type)) {
      score += 8;
    }
    if (options.ignoreDistrict) {
      // District/block differences are a warning only in the result reader —
      // never a gate that hides the facility the file is attached to.
    } else if (sameDistrict(parsed, facility)) score += 20;
    else if (parsed.district) score -= 5;
    candidates.push({ facility, score });
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      a.facility.name.localeCompare(b.facility.name),
  );
  const best = candidates[0];
  const second = candidates[1];
  if (!best || best.score < 55) {
    return {
      facility: null,
      status: "unmatched",
      score: 0,
      alternatives: candidates.slice(0, 3).map((c) => ({
        name: c.facility.name,
        block: c.facility.block,
        score: c.score,
      })),
    };
  }
  const ambiguous = second != null && second.score === best.score;
  return {
    facility: best.facility,
    status: ambiguous ? "ambiguous" : "matched",
    score: best.score,
    alternatives: candidates.slice(0, 3).map((c) => ({
      name: c.facility.name,
      block: c.facility.block,
      score: c.score,
    })),
  };
}
