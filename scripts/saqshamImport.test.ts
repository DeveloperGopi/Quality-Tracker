/**
 * SaQsham DOCUMENT STATUS IMPORT — engine tests.
 *
 * Covers the golden rows described in the brief plus the edge cases: status
 * de-duplication, category/name splitting, department counts, date-vs-updated-by,
 * the status map, the matching precedence, fuzzy suggestions, ambiguity,
 * unmapped statuses, Result Declared, older-application dedupe, the stale guard
 * and the preview ↔ report header/cell contract.
 *
 * Run: bun test ./scripts
 */
import { describe, it, expect } from "bun:test";

import {
  SAQSHAM_STATUS_MAP,
  REPORT_STATUS_VALUES,
  DEFAULT_CATEGORY_TYPE_MAP,
  DEFAULT_APPLIED_DEPARTMENTS,
  autoMapColumns,
  buildSaqshamPreview,
  cleanSaqshamRow,
  dedupeRepeatedPhrase,
  detectHeaderRow,
  hasBlockingErrors,
  isResultDeclared,
  jaroWinkler,
  fuzzyScore,
  baseApplicationNo,
  mapCategoryToType,
  matchSaqshamRow,
  normalizeFacilityKey,
  normalizeStatusKey,
  parseAppliedDepartments,
  parseLastUpdateDtls,
  parseSaqshamDate,
  reportStatusFor,
  reportStatusRank,
  splitNameCategory,
  summarizePreview,
  selectedRows,
  isEligiblePreviewRow,
  statusMapIssues,
  spreadsheetSafeValue,
  derivePreviewState,
  previewBucket,
  bucketCounts,
  KNOWN_DEPARTMENT_NAMES,
  uniqueHeaders,
  type CleanedRow,
  type HelperColumnKey,
  type PortalColumnKey,
  type SaqshamFacility,
  type FacilityAlias,
} from "../src/lib/saqshamImport";
import {
  SAQSHAM_PREVIEW_COLUMNS,
  SAQSHAM_REPORT_COLUMNS,
  saqshamPreviewCells,
  saqshamPreviewHeaders,
  saqshamPreviewRows,
  saqshamReportHeaders,
  saqshamReportRows,
  notesFor,
  stateReason,
  previousReportLabel,
  nextReportLabel,
  reportChangeLabel,
  portalUpdateChangeLabel,
  applicationTypeLabel,
} from "../src/lib/saqshamPreviewColumns";
import { SAQSHAM_SAMPLE_TSV, parsePastedText } from "../src/lib/saqshamParse";

/* --------------------------------------------------------------------------- */
/* Fixtures (a slice of the district master list the brief names)               */
/* --------------------------------------------------------------------------- */

const F = (
  id: string,
  name: string,
  block: string,
  phc: string,
  facilityType: string,
  extra: Partial<SaqshamFacility> = {},
): SaqshamFacility => ({ id, name, block, phc, facilityType, ...extra });

const FACILITIES: SaqshamFacility[] = [
  F("f-sivarajpet", "Sivarajpet", "Tirupathur", "Tirupathur UPHC", "UHWC"),
  F("f-kanigapuram", "Kanigapuram", "Madhanur", "Kaspa UPHC", "UHWC"),
  F("f-ckallupalli", "C.Kallupalli", "Alangayam", "Alangayam PHC", "HWC HSC"),
  F("f-zafrabad", "Zafrabad", "Udhayenthiram", "Udhayenthiram PHC", "HWC HSC"),
  F("f-nilavur", "Nilavur", "Tirupathur", "Nilavur PHC", "HWC HSC"),
  // A second HWC HSC named "Alangayam" in another block — proves the matcher
  // never matches on the name alone.
  F("f-alangayam-1", "Alangayam", "Alangayam", "Alangayam PHC", "HWC HSC"),
  F("f-alangayam-2", "Alangayam", "Mittur", "Mittur PHC", "HWC HSC"),
];

let rowCounter = 0;
/** Build a CleanedRow straight from logical column keys. */
function clean(
  logical: Partial<Record<PortalColumnKey | HelperColumnKey, unknown>>,
  opts?: Parameters<typeof cleanSaqshamRow>[1],
): CleanedRow {
  const keys = Object.keys(logical) as string[];
  const cells = keys.map((k) => logical[k as PortalColumnKey | HelperColumnKey]);
  const map: Record<string, number | null> = {};
  keys.forEach((k, i) => (map[k] = i));
  rowCounter += 1;
  return cleanSaqshamRow(
    { rowNo: rowCounter, sourceRowNo: rowCounter + 1, headerNames: keys, cells, map },
    opts,
  );
}

/* --------------------------------------------------------------------------- */
/* 1 — Status de-duplication                                                    */
/* --------------------------------------------------------------------------- */

describe("status de-duplication", () => {
  it("collapses a phrase repeated with no separator", () => {
    expect(
      dedupeRepeatedPhrase(
        "Assessor Result Entry /Document Upload InprocessAssessor Result Entry /Document Upload Inprocess",
      ),
    ).toBe("Assessor Result Entry /Document Upload Inprocess");
  });

  it("collapses a phrase repeated with a single space between the copies", () => {
    expect(
      dedupeRepeatedPhrase("Documents Pending at Facility Documents Pending at Facility"),
    ).toBe("Documents Pending at Facility");
  });

  it("collapses whitespace and leaves a normal phrase alone", () => {
    expect(dedupeRepeatedPhrase("  Result   Declared  ")).toBe("Result Declared");
    expect(dedupeRepeatedPhrase("Assessment Review in Process")).toBe("Assessment Review in Process");
  });
});

/* --------------------------------------------------------------------------- */
/* 2 & 3 — Name/category split + category → type                                */
/* --------------------------------------------------------------------------- */

describe("name/category + type mapping", () => {
  it("splits on the LAST slash and keeps the raw text", () => {
    expect(splitNameCategory("Sivarajpet/UAMM")).toEqual({
      raw: "Sivarajpet/UAMM",
      name: "Sivarajpet",
      category: "UAMM",
    });
    expect(splitNameCategory("Kaspa -B/UAMM").name).toBe("Kaspa -B");
    expect(splitNameCategory("Nilavoor/HWC")).toEqual({
      raw: "Nilavoor/HWC",
      name: "Nilavoor",
      category: "HWC",
    });
    // A name with a slash inside it keeps only the last segment as category.
    expect(splitNameCategory("Pudurnadu/Puliyur/HWC HSC")).toEqual({
      raw: "Pudurnadu/Puliyur/HWC HSC",
      name: "Pudurnadu/Puliyur",
      category: "HWC HSC",
    });
    expect(splitNameCategory("NoCategory")).toEqual({
      raw: "NoCategory",
      name: "NoCategory",
      category: "",
    });
  });

  it("maps the documented categories and warns on an unknown one", () => {
    expect(mapCategoryToType("UAMM")).toBe("UHWC");
    expect(mapCategoryToType("HWC")).toBe("HWC HSC");
    expect(mapCategoryToType("PHC")).toBe("PHC");
    expect(mapCategoryToType("UPHC")).toBe("UPHC");
    expect(mapCategoryToType("uamm")).toBe("UHWC");
    expect(mapCategoryToType("MYSTERY")).toBeNull();
    expect(DEFAULT_CATEGORY_TYPE_MAP.UAMM).toBe("UHWC");
  });
});

/* --------------------------------------------------------------------------- */
/* 4 — Applied departments                                                      */
/* --------------------------------------------------------------------------- */

describe("applied departments", () => {
  it("parses a 12-department string with correct count and comma-laden names", () => {
    const raw =
      "12Basic Oral health care, Obstetrics & Gynaecology, General Medicine, Family Planning, " +
      "Immunization, Paediatrics, Emergency, Pharmacy, Labour Room, Mental Health, Ward, Lab";
    const parsed = parseAppliedDepartments(raw);
    expect(parsed.statedCount).toBe(12);
    expect(parsed.departments.length).toBe(12);
    expect(parsed.ok).toBe(true);
    expect(parsed.departments).toContain("Basic Oral health care");
    expect(parsed.departments).toContain("Obstetrics & Gynaecology");
  });

  it("parses a 6-department string", () => {
    const parsed = parseAppliedDepartments("6OPD, Emergency, Pharmacy, Lab, Ward, OT");
    expect(parsed.statedCount).toBe(6);
    expect(parsed.departments).toEqual(["OPD", "Emergency", "Pharmacy", "Lab", "Ward", "OT"]);
    expect(parsed.ok).toBe(true);
  });

  it("warns and keeps the raw text when the stated count disagrees", () => {
    const parsed = parseAppliedDepartments("12OPD, Emergency");
    expect(parsed.ok).toBe(false);
    expect(parsed.note).toMatch(/Stated 12 .* parsed 2/);
    expect(parsed.departments).toEqual([]); // not trusted
    expect(parsed.raw).toBe("12OPD, Emergency");
  });

  it("exposes an editable seed department list", () => {
    expect(DEFAULT_APPLIED_DEPARTMENTS.length).toBeGreaterThan(5);
  });
});

/* --------------------------------------------------------------------------- */
/* 5 & 6 — Last-update details + flexible dates                                 */
/* --------------------------------------------------------------------------- */

describe("last update + dates", () => {
  it("stores a parseable date as a date", () => {
    expect(parseLastUpdateDtls("6-Oct-2026")).toEqual({
      raw: "6-Oct-2026",
      date: "2026-10-06",
      updatedBy: null,
    });
    expect(parseLastUpdateDtls("05-Aug-2026").date).toBe("2026-08-05");
    expect(parseSaqshamDate("09-Mar-2026")).toBe("2026-03-09");
  });

  it("stores a person's name as updated-by, not as a date", () => {
    expect(parseLastUpdateDtls("RAMAMURTHI K(RQAU)")).toEqual({
      raw: "RAMAMURTHI K(RQAU)",
      date: null,
      updatedBy: "RAMAMURTHI K(RQAU)",
    });
  });

  it("handles Excel-serial and ISO dates", () => {
    expect(parseSaqshamDate(46000)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parseSaqshamDate("2026-07-20")).toBe("2026-07-20");
    expect(parseSaqshamDate("not a date")).toBeNull();
  });
});

/* --------------------------------------------------------------------------- */
/* Status mapping                                                               */
/* --------------------------------------------------------------------------- */

describe("status mapping", () => {
  it("ships the full seed table and the distinct report values", () => {
    expect(SAQSHAM_STATUS_MAP.length).toBe(30);
    expect(REPORT_STATUS_VALUES.length).toBe(6);
  });

  it("ignores spaces around hyphens and matches case-insensitively", () => {
    expect(reportStatusFor("Assessment Received by RQAU & In -Process")).toBe("Document in RQAU login");
    expect(reportStatusFor("assessment  received by rqau & in-process")).toBe("Document in RQAU login");
    expect(normalizeStatusKey("In -Process")).toBe(normalizeStatusKey("In-Process"));
  });

  it("maps the golden statuses and flags unknown ones", () => {
    expect(reportStatusFor("Assessor Result Entry /Document Upload Inprocess")).toBe(
      "NA Completed & Awaiting Results",
    );
    expect(reportStatusFor("Document Genaration Done")).toBe("NA Scheduled");
    expect(reportStatusFor("Application Lapsed")).toBeNull(); // unmapped
  });

  it("never guesses a destination for Result Declared", () => {
    expect(reportStatusFor("Result Declared")).toBeNull();
    expect(isResultDeclared("Result Declared")).toBe(true);
    expect(isResultDeclared("Documents Pending at Facility")).toBe(false);
  });
});

/* --------------------------------------------------------------------------- */
/* Name normalisation + fuzzy scoring                                           */
/* --------------------------------------------------------------------------- */

describe("name normalisation + fuzzy scoring", () => {
  it("folds the documented transliteration variants", () => {
    expect(normalizeFacilityKey("Nilavoor")).toBe(normalizeFacilityKey("Nilavur"));
    expect(normalizeFacilityKey("Pudupettai")).toBe(normalizeFacilityKey("Pudupet"));
    expect(normalizeFacilityKey("Vellipalli")).toBe(normalizeFacilityKey("Vellipally"));
    // Trailing type token is dropped.
    expect(normalizeFacilityKey("Nilavoor HWC")).toBe(normalizeFacilityKey("Nilavur"));
  });

  it("scores a transliteration near-miss high enough to suggest", () => {
    // Jafarabad vs Zafrabad differ by the j/z swap and an inserted vowel; the
    // consonant skeleton matches, so the suggestion is confident (≥95%).
    expect(fuzzyScore("jafarabad", "zafrabad")).toBeGreaterThanOrEqual(0.95);
    // A genuinely different name stays low even on the skeleton.
    expect(fuzzyScore("kaspab", "kanigapuram")).toBeLessThan(0.7);
    // The plain Jaro-Winkler alone is not enough for that pair.
    expect(jaroWinkler("jafarabad", "zafrabad")).toBeLessThan(0.95);
  });
});

/* --------------------------------------------------------------------------- */
/* Matching precedence + golden rows                                            */
/* --------------------------------------------------------------------------- */

describe("facility matching", () => {
  it("golden: Sivarajpet/UAMM matches Sivarajpet (UHWC) via the shared facility_key", () => {
    const row = clean({ facilityNameCategory: "Sivarajpet/UAMM", status: "Assessor Result Entry /Document Upload Inprocess" });
    const m = matchSaqshamRow(row, FACILITIES);
    expect(m).toEqual({ status: "matched", method: "facility_key", confidence: 98, facilityId: "f-sivarajpet" });
    expect(row.facilityType).toBe("UHWC");
    expect(row.reportStatus).toBe("NA Completed & Awaiting Results");
  });

  it("golden: Application No stored on the facility wins (100%)", () => {
    const facilities = FACILITIES.map((f) =>
      f.id === "f-sivarajpet" ? { ...f, saqshamApplicationNo: "HWC2602230000026" } : f,
    );
    // The portal appends "_02" for the re-application — the base must match.
    expect(baseApplicationNo("HWC2602230000026_02")).toBe(baseApplicationNo("HWC2602230000026"));
    const row = clean({ applicationNo: "HWC2602230000026_02", facilityNameCategory: "Sivarajpet/UAMM" });
    const m = matchSaqshamRow(row, facilities);
    expect(m).toEqual({ status: "matched", method: "application_no", confidence: 100, facilityId: "f-sivarajpet" });
  });

  it("golden: Kaspa -B/UAMM is NOT auto-matched by fuzzy alone", () => {
    const row = clean({ facilityNameCategory: "Kaspa -B/UAMM" });
    const m = matchSaqshamRow(row, FACILITIES);
    expect(m.status).not.toBe("matched");
    expect(m.status).toBe("unmatched");
  });

  it("golden: Kaspa -B/UAMM matches via helper columns at 98%", () => {
    const row = clean({
      facilityNameCategory: "Kaspa -B/UAMM",
      helperBlock: "Madhanur",
      helperPhc: "Kaspa UPHC",
      helperName: "Kanigapuram",
    });
    const m = matchSaqshamRow(row, FACILITIES);
    expect(m).toEqual({ status: "matched", method: "helper", confidence: 98, facilityId: "f-kanigapuram" });
  });

  it("golden: a saved alias makes the second import automatic", () => {
    const row = clean({ facilityNameCategory: "Kaspa -B/UAMM" });
    const alias: FacilityAlias = {
      portalNameNormalized: normalizeFacilityKey("Kaspa -B"),
      facilityType: "UHWC",
      facilityId: "f-kanigapuram",
    };
    const m = matchSaqshamRow(row, FACILITIES, [alias]);
    expect(m).toEqual({ status: "matched", method: "alias", confidence: 100, facilityId: "f-kanigapuram", seeded: false });
  });

  it("golden: Jafarabad/HWC suggests Zafrabad at ≥95%", () => {
    const row = clean({ facilityNameCategory: "Jafarabad/HWC" });
    const m = matchSaqshamRow(row, FACILITIES);
    expect(m.status).toBe("suggested");
    if (m.status === "suggested") {
      const best = m.candidates[0];
      expect(best.facilityId).toBe("f-zafrabad");
      expect(best.score).toBeGreaterThanOrEqual(95);
    }
  });

  it("golden: Nilavoor/HWC matches Nilavur after normalisation (shared facility_key)", () => {
    const row = clean({ facilityNameCategory: "Nilavoor/HWC", status: "Assessment Received by RQAU & In -Process" });
    const m = matchSaqshamRow(row, FACILITIES);
    expect(m).toEqual({ status: "matched", method: "facility_key", confidence: 98, facilityId: "f-nilavur" });
    expect(row.reportStatus).toBe("Document in RQAU login");
  });

  it("never matches on the name alone — a tie is ambiguous", () => {
    const row = clean({ facilityNameCategory: "Alangayam/HWC" });
    const m = matchSaqshamRow(row, FACILITIES);
    expect(m.status).toBe("ambiguous");
    if (m.status === "ambiguous") {
      expect(m.candidates.map((c) => c.facilityId).sort()).toEqual(["f-alangayam-1", "f-alangayam-2"]);
    }
  });

  it("golden: an unmapped status does not block the other rows", () => {
    const rows = [
      clean({ facilityNameCategory: "C.Kallupalli/HWC", status: "Application Lapsed" }),
      clean({ facilityNameCategory: "Nilavoor/HWC", status: "Assessment Received by RQAU & In -Process" }),
    ];
    const { rows: preview, summary } = buildSaqshamPreview(rows, FACILITIES);
    expect(summary.unmappedStatus).toBe(1);
    // The good row is still Ready and included.
    const good = preview.find((r) => r.cleaned.name === "Nilavoor")!;
    expect(good.state).toBe("ready");
    expect(good.include).toBe(true);
    // The unmapped row is flagged, not included by default.
    const bad = preview.find((r) => r.cleaned.name === "C.Kallupalli")!;
    expect(bad.unmappedStatus).toBe(true);
    expect(bad.state).toBe("needs_review");
    expect(bad.include).toBe(false);
  });
});

/* --------------------------------------------------------------------------- */
/* Cleaning — scope + Result Declared                                           */
/* --------------------------------------------------------------------------- */

describe("cleaning", () => {
  it("flags a different district/state and skips it by default", () => {
    const row = clean({ facilityNameCategory: "Nilavoor/HWC", district: "Chennai", state: "Tamil Nadu" });
    expect(row.differentScope).toBe(true);
    expect(row.warnings.join(" ")).toMatch(/Different district/);
    const { rows } = buildSaqshamPreview([row], FACILITIES);
    expect(rows[0].state).toBe("skipped");
    expect(rows[0].include).toBe(false);
  });

  it("keeps the raw text of every original cell", () => {
    const row = clean({
      applicationNo: "SCN2610110000001_01",
      facilityNameCategory: "Nilavoor/HWC",
      status: "Assessment Received by RQAU & In -Process",
    });
    expect(row.raw.applicationNo).toBe("SCN2610110000001_01");
    expect(row.raw.status).toBe("Assessment Received by RQAU & In -Process");
  });

  it("Result Declared stays unresolved until an Admin maps its destination", () => {
    const facility = { ...FACILITIES[4], docsStatus: "Documents Pending at Facility" };
    const row = clean({ facilityNameCategory: "Nilavoor/HWC", status: "Result Declared" });
    const { rows } = buildSaqshamPreview([row], [facility]);
    expect(rows[0].cleaned.resultDeclared).toBe(true);
    expect(rows[0].newReport).toBeNull();
    expect(rows[0].state).toBe("needs_review");
    expect(rows[0].unmappedStatus).toBe(true);
    expect(notesFor(rows[0])).toMatch(/Needs mapping|Result declared/);
  });
});

/* --------------------------------------------------------------------------- */
/* Preview builder — change classification, dedupe, stale, idempotency          */
/* --------------------------------------------------------------------------- */

describe("preview builder", () => {
  it("classifies new / changed / no-change and summarises", () => {
    const facilities = [
      F("f-nilavur", "Nilavur", "Tirupathur", "Nilavur PHC", "HWC HSC", { docsStatus: null, docsStatusReport: null }),
      F("f-zafrabad", "Zafrabad", "Udhayenthiram", "Udhayenthiram PHC", "HWC HSC", {
        docsStatus: "Assessment Received by RQAU & In -Process",
        docsStatusReport: "Document in RQAU login",
      }),
    ];
    const rows = [
      clean({ facilityNameCategory: "Nilavoor/HWC", status: "Assessment Received by RQAU & In -Process" }),
      clean({ facilityNameCategory: "Zafrabad/HWC", status: "Assessment Review in Process" }), // different portal, same report
      clean({ facilityNameCategory: "Jafarabad/HWC", status: "Assessment Review in Process" }), // fuzzy → review
    ];
    const { rows: preview, summary } = buildSaqshamPreview(rows, facilities);
    expect(summary.total).toBe(3);
    expect(summary.newValue).toBe(1); // Nilavur had nothing
    expect(summary.willUpdate).toBe(1); // Zafrabad changed
    expect(summary.noChange).toBe(0);
    expect(summary.unmatched).toBe(0);
    // Jafarabad is only a fuzzy suggestion → needs review, not included.
    expect(preview.filter((r) => r.state === "needs_review").length).toBe(1);
  });

  it("is idempotent — importing the same file twice reports no change", () => {
    const first = clean({ facilityNameCategory: "Nilavoor/HWC", status: "Assessment Received by RQAU & In -Process" });
    const facility = { ...FACILITIES[4], docsStatus: first.statusRaw, docsStatusReport: "Document in RQAU login" };
    const { rows } = buildSaqshamPreview([first], [facility]);
    expect(rows[0].change).toBe("same");
    expect(rows[0].state).toBe("no_change");
    expect(rows[0].include).toBe(false);
    expect(selectedRows(rows)).toHaveLength(0);
  });

  it("keeps a stale portal date as an INFO TAG — never a decision (Part 0.1)", () => {
    const facility = { ...FACILITIES[4], saqshamPortalUpdatedOn: "2026-09-01", docsStatus: "x" };
    const row = clean({
      facilityNameCategory: "Nilavoor/HWC",
      status: "Assessment Received by RQAU & In -Process",
      lastUpdate: "6-May-2026",
    });
    const { rows } = buildSaqshamPreview([row], [facility]);
    expect(rows[0].stale).toBe(true);
    // The status differs → the row is a normal "Will change", not a decision.
    expect(rows[0].state).toBe("ready");
    expect(rows[0].include).toBe(true);
    expect(notesFor(rows[0])).toMatch(/Older than current data/);
    // …and an identical status would put it in "No change", not amber.
    const same = {
      ...facility,
      docsStatus: "Assessment Received by RQAU & In -Process",
      docsStatusReport: "Document in RQAU login",
      saqshamPortalUpdatedOn: "2026-05-06",
    };
    const { rows: noChange } = buildSaqshamPreview([row], [same]);
    expect(noChange[0].state).toBe("no_change");
    expect(noChange[0].include).toBe(false);
  });

  it("keeps the latest application and ignores the older one", () => {
    const facilities = [F("f-nilavur", "Nilavur", "Tirupathur", "Nilavur PHC", "HWC HSC")];
    const older = clean({ facilityNameCategory: "Nilavoor/HWC", status: "Documents Pending at Facility", appliedDate: "2026-01-10" });
    const newer = clean({ facilityNameCategory: "Nilavoor/HWC", status: "Assessment Received by RQAU & In -Process", appliedDate: "2026-06-10" });
    const { rows } = buildSaqshamPreview([older, newer], facilities);
    const kept = rows.find((r) => r.cleaned.appliedDate === "2026-06-10")!;
    const skipped = rows.find((r) => r.cleaned.appliedDate === "2026-01-10")!;
    expect(kept.olderApplication).toBe(false);
    expect(skipped.olderApplication).toBe(true);
    expect(skipped.state).toBe("skipped");
    expect(skipped.olderOfApplicationNo).toBeNull(); // no app no in this fixture
  });

  it("blocks confirmation while an ambiguous row is included", () => {
    const row = clean({ facilityNameCategory: "Alangayam/HWC" });
    const { rows } = buildSaqshamPreview([row], FACILITIES);
    expect(rows[0].state).toBe("ambiguous");
    const forced = rows.map((r) => ({ ...r, include: true }));
    expect(hasBlockingErrors(forced)).toBe(true);
    expect(hasBlockingErrors(rows)).toBe(false);
  });

  it("counts the master-list facilities missing from the file (informational)", () => {
    const row = clean({ facilityNameCategory: "Nilavoor/HWC", status: "Assessment Received by RQAU & In -Process" });
    const { summary } = buildSaqshamPreview([row], FACILITIES);
    expect(summary.missingFromFile).toBe(FACILITIES.length - 1);
  });
});

/* --------------------------------------------------------------------------- */
/* Parsing helpers — headers, duplicates, mapping                               */
/* --------------------------------------------------------------------------- */

describe("file parsing helpers", () => {
  it("detects the header row below a title banner", () => {
    const rows = [
      ["SaQsham Assessment Status Report"],
      [],
      ["Application No", "Status", "Facility Name/Category"],
    ];
    expect(detectHeaderRow(rows)).toBe(2);
  });

  it("trims headers, drops empty ones and makes duplicates unique", () => {
    const { names, keptIndexes } = uniqueHeaders([" Status ", "Facility Type", "Status", "Facility Type", "  "]);
    expect(names).toEqual(["Status", "Facility Type", "Status__2", "Facility Type__2"]);
    expect(keptIndexes).toEqual([0, 1, 2, 3]);
  });

  it("auto-maps the portal columns and leaves a missing Status unmapped", () => {
    const mapped = autoMapColumns(["Application No", "Facility Name/Category", "Status", "District"]);
    expect(mapped.applicationNo).toBe(0);
    expect(mapped.facilityNameCategory).toBe(1);
    expect(mapped.status).toBe(2);
    expect(mapped.district).toBe(3);

    const missingStatus = autoMapColumns(["Application No", "Facility Name/Category"]);
    expect(missingStatus.status).toBeNull();
  });
});

/* --------------------------------------------------------------------------- */
/* Result Declared is final + a backwards move is amber                        */
/* --------------------------------------------------------------------------- */

describe("result declared and lifecycle guards", () => {
  it("keeps Result Declared when an earlier portal status arrives", () => {
    const facility = {
      ...FACILITIES[4],
      docsStatus: "Result Declared",
      docsStatusReport: null,
    };
    const row = clean({
      facilityNameCategory: "Nilavoor/HWC",
      status: "Assessment Received by RQAU & In -Process",
    });
    const { rows, summary } = buildSaqshamPreview([row], [facility]);
    expect(rows[0].keptResultDeclared).toBe(true);
    // "Kept: result declared" is a TAG and sits in the No change bucket —
    // never Skipped, so the summary chips still add up to the row count.
    expect(rows[0].change).toBe("same");
    expect(rows[0].state).toBe("no_change");
    expect(rows[0].include).toBe(false);
    expect(previewBucket(rows[0].state, rows[0].change)).toBe("no_change");
    expect(summary.kept).toBe(1);
    expect(summary.buckets.no_change).toBe(1);
    expect(notesFor(rows[0])).toMatch(/Kept: result declared/);
    // The report group the user sees is the RESULT, never the older group.
    expect(previousReportLabel(rows[0])).toBe("Result declared");
    expect(nextReportLabel(rows[0])).toBe("Result declared");
  });

  it("ranks the report groups and flags a status that moved back", () => {
    expect(reportStatusRank("Documents Pending at Facility")).toBe(0);
    expect(reportStatusRank("NA Scheduled")).toBeLessThan(reportStatusRank("NA Completed & Awaiting Results")!);
    expect(reportStatusRank("Document in RQAU login")).toBeLessThan(reportStatusRank("Document in SQAU login")!);
    expect(reportStatusRank("something else")).toBeNull();

    const facility = {
      ...FACILITIES[4],
      docsStatus: "Assessment Approved by DQAU/RQAU & Pending for Receive by SQAU",
      docsStatusReport: "Document in SQAU login",
    };
    const row = clean({
      facilityNameCategory: "Nilavoor/HWC",
      status: "Assessment Received by RQAU & In -Process",
    });
    const { rows } = buildSaqshamPreview([row], [facility]);
    expect(rows[0].movedBack).toBe(true);
    // A backwards group is an honest amber TAG, not a state: the status still
    // differs, so the row is a Will change the user can see and untick.
    expect(rows[0].state).toBe("ready");
    expect(notesFor(rows[0])).toMatch(/Status moved back/);
  });
});

/* --------------------------------------------------------------------------- */
/* Previous → new labels + the pasted sample                                    */
/* --------------------------------------------------------------------------- */

describe("previous → new labels", () => {
  const facility = {
    ...FACILITIES[0],
    docsStatus: "Documents Pending at Facility",
    docsStatusReport: "Documents Pending at Facility",
    saqshamPortalUpdatedOn: "2026-08-01",
  };
  const row = clean({
    facilityNameCategory: "Sivarajpet/UAMM",
    status: "Send ToolKit Pending",
    lastUpdate: "24-Aug-2026",
    assessmentType: "Re-Application",
  });
  const { rows } = buildSaqshamPreview([row], [facility]);

  it("shows both sides of the report group and the portal date", () => {
    expect(reportChangeLabel(rows[0])).toBe("Documents Pending at Facility → NA Scheduled");
    expect(portalUpdateChangeLabel(rows[0])).toBe("01-Aug-2026 → 24-Aug-2026");
    expect(applicationTypeLabel(rows[0])).toBe("Re-Application");
  });

  it("keeps the header contract with the new previous → new columns", () => {
    const headers = saqshamPreviewHeaders();
    expect(headers).toContain("Previous status");
    expect(headers).toContain("New status");
    expect(headers).toContain("Report group (previous → new)");
    expect(headers).toContain("Row state");
    const cells = saqshamPreviewCells(rows[0], 0);
    expect(cells.length).toBe(headers.length);
    const byKey = (k: string) => SAQSHAM_PREVIEW_COLUMNS.findIndex((c) => c.key === k);
    expect(cells[byKey("reportChange")]).toBe("Documents Pending at Facility → NA Scheduled");
    expect(cells[byKey("rowState")]).toBe("Will change");
  });
});

describe("pasted sample", () => {
  it("parses the sample TSV into 10 columns and 3 rows", () => {
    const sheet = parsePastedText(SAQSHAM_SAMPLE_TSV);
    expect(sheet.headers).toHaveLength(10);
    expect(sheet.dataRows).toHaveLength(3);
    expect(sheet.headers[0]).toBe("Application No");
  });

  it("cleans the doubled status, the person name and the unmapped status", () => {
    const sheet = parsePastedText(SAQSHAM_SAMPLE_TSV);
    const map = autoMapColumns(sheet.headers);
    const rows = sheet.dataRows.map((dr, i) =>
      cleanSaqshamRow({
        rowNo: i + 1,
        sourceRowNo: dr.sourceRowNo,
        headerNames: sheet.headers,
        cells: sheet.keptIndexes.map((idx) => dr.cells[idx]),
        map,
      }),
    );
    expect(rows[0].statusRaw).toBe("Assessor Result Entry /Document Upload Inprocess");
    expect(rows[1].lastUpdate.updatedBy).toBe("RAMAMURTHI K(RQAU)");
    expect(rows[2].reportStatus).toBeNull(); // Application Lapsed stays unmapped
  });
});

/* --------------------------------------------------------------------------- */
/* Contract — preview table + import report header/cell alignment              */
/* --------------------------------------------------------------------------- */

describe("preview ↔ report contract", () => {
  const rows = (() => {
    const facilities = [
      F("f-nilavur", "Nilavur", "Tirupathur", "Nilavur PHC", "HWC HSC", { docsStatus: "Documents Pending at Facility" }),
      F("f-zafrabad", "Zafrabad", "Udhayenthiram", "Udhayenthiram PHC", "HWC HSC"),
    ];
    return buildSaqshamPreview(
      [
        clean({ facilityNameCategory: "Nilavoor/HWC", status: "Assessment Received by RQAU & In -Process" }),
        clean({ facilityNameCategory: "Jafarabad/HWC", status: "Review" }),
        clean({ facilityNameCategory: "Unheard Of/HWC", status: "Review" }),
      ],
      facilities,
    ).rows;
  })();

  it("keeps the header as long as every body row (0, 1 and 3 rows)", () => {
    const headers = saqshamPreviewHeaders();
    expect(saqshamPreviewRows([]).length).toBe(0);
    expect(saqshamPreviewRows([rows[0]])[0].length).toBe(headers.length);
    for (const body of saqshamPreviewRows(rows)) expect(body.length).toBe(headers.length);
  });

  it("reads cell i from columns[i].key — never by position", () => {
    rows.forEach((row, i) => {
      const cells = saqshamPreviewCells(row, i);
      SAQSHAM_PREVIEW_COLUMNS.forEach((c, ci) => {
        expect(cells[ci]).toBe(c.raw(row, i));
      });
    });
  });

  it("drops only the UI-only columns from the exported report", () => {
    expect(SAQSHAM_REPORT_COLUMNS.some((c) => c.kind === "include")).toBe(false);
    expect(SAQSHAM_REPORT_COLUMNS.some((c) => c.kind === "arrow")).toBe(false);
    const headers = saqshamReportHeaders();
    for (const body of saqshamReportRows(rows)) expect(body.length).toBe(headers.length);
  });

  it("never gives two visible columns the same label", () => {
    const seen = new Map<string, string[]>();
    for (const c of SAQSHAM_PREVIEW_COLUMNS) {
      if (c.kind === "arrow") continue; // an empty separator label
      const key = c.label.trim().toLowerCase();
      seen.set(key, [...(seen.get(key) ?? []), c.key]);
    }
    expect([...seen.entries()].filter(([k, v]) => v.length > 1 && k !== "")).toEqual([]);
  });
});

/* --------------------------------------------------------------------------- */
/* PART 0 — row state, departments, chips and identical values                  */
/* --------------------------------------------------------------------------- */

describe("Part 0.1 — row state is ONE pure function, notes never move it", () => {
  it("orders the states: skipped → needs decision → will change → no change", () => {
    const base = {
      differentScope: false,
      chosenByUser: false,
      olderApplication: false,
      hasFacility: true,
      matchStatus: "matched" as const,
      unmappedStatus: false,
      change: "changed" as const,
    };
    expect(derivePreviewState({ ...base, differentScope: true })).toBe("skipped");
    expect(derivePreviewState({ ...base, olderApplication: true })).toBe("skipped");
    expect(derivePreviewState({ ...base, hasFacility: false })).toBe("unmatched");
    expect(derivePreviewState({ ...base, hasFacility: false, matchStatus: "ambiguous" })).toBe("ambiguous");
    expect(derivePreviewState({ ...base, hasFacility: false, matchStatus: "suggested" })).toBe("needs_review");
    expect(derivePreviewState({ ...base, unmappedStatus: true })).toBe("needs_review");
    expect(derivePreviewState(base)).toBe("ready");
    expect(derivePreviewState({ ...base, change: "new" })).toBe("ready");
    expect(derivePreviewState({ ...base, change: "same" })).toBe("no_change");
  });

  it("golden: 23 rows, 21 identical to the earlier import → 21 No change, 2 Will change", () => {
    // The screenshot's paste: every row's status and portal date already match
    // what is stored, except two — and several carry an info-only note.
    const facilities: SaqshamFacility[] = [];
    const cleaned: CleanedRow[] = [];
    rowCounter = 0;
    for (let i = 1; i <= 23; i++) {
      const id = `f-fac-${i}`;
      const name = `Facility ${i}`;
      const stored = i <= 21 ? "Assessment Received by RQAU & In -Process" : "Documents Pending at Facility";
      facilities.push(F(id, name, "Alangayam", `Phc ${i}`, "PHC", {
        docsStatus: stored,
        docsStatusReport: i <= 21 ? "Document in RQAU login" : "Documents Pending at Facility",
        // The stored portal date already equals the pasted one (idempotent).
        saqshamPortalUpdatedOn: i === 3 ? "2026-10-06" : i <= 21 ? "2026-08-24" : null,
      }));
      cleaned.push(
        clean(
          {
            applicationNo: `APPL${i}`,
            facilityNameCategory: `${name}/PHC`,
            status: i <= 21 ? "Assessment Received by RQAU & In -Process" : "Assessment Review in Process",
            lastUpdate: i === 3 ? "6-Oct-2026" : "24-Aug-2026",
            appliedDepartments:
              i <= 2
                ? "12Antenatal & Postnatal Care, Newborn & Child Health, Family Planning, Adolescent Health, " +
                    "Immunization, Communicable Diseases, Non-Communicable Diseases, Mental Health, " +
                    "Elderly & Palliative Care, Emergency & Referral, Oral, Eye & ENT Care, Health Promotion & Wellness"
                : "6OPD, Emergency, Pharmacy, Lab, Ward, OT",
          },
          { parseDepartments: true },
        ),
      );
    }

    const { rows, summary } = buildSaqshamPreview(cleaned, facilities);

    // The chips are mutually exclusive and add up to 23.
    const buckets = bucketCounts(rows);
    expect(Object.values(buckets).reduce((a, b) => a + b, 0)).toBe(23);
    expect(buckets.will_change).toBe(2);
    expect(buckets.new).toBe(0);
    expect(buckets.no_change).toBe(21);
    expect(buckets.needs_decision).toBe(0);
    expect(buckets.cant_match).toBe(0);
    expect(buckets.skipped).toBe(0);
    expect(summary.needsReview).toBe(0); // the bug: was 21
    expect(summary.willUpdate).toBe(2);
    expect(summary.noChange).toBe(21);

    // No department or staleness note moved a row out of "No change".
    const deptRows = rows.filter((r) => r.cleaned.appliedDepartments.note);
    expect(deptRows.every((r) => r.state === "no_change" || r.state === "ready")).toBe(true);
    // …and the HWC package list parses all 12 (no "parsed 1").
    const hwc = cleaned[0].appliedDepartments;
    expect(hwc.statedCount).toBe(12);
    expect(hwc.departments.length).toBe(12);
    expect(hwc.note).toBeNull();
    // The two real changes are the ones that would be written.
    expect(selectedRows(rows)).toHaveLength(2);
  });

  it("golden: an all-unchanged paste selects nothing (" + "Nothing to update)", () => {
    const facilities = [
      F("f-nilavur", "Nilavur", "Tirupathur", "Nilavur PHC", "HWC HSC", {
        docsStatus: "Assessment Received by RQAU & In -Process",
        docsStatusReport: "Document in RQAU login",
        saqshamPortalUpdatedOn: "2026-05-06",
      }),
    ];
    const row = clean({
      facilityNameCategory: "Nilavoor/HWC",
      status: "Assessment Received by RQAU & In -Process",
      lastUpdate: "6-May-2026",
    });
    const { rows, summary } = buildSaqshamPreview([row], facilities);
    expect(summary.buckets.no_change).toBe(1);
    expect(selectedRows(rows)).toHaveLength(0);
    expect(hasBlockingErrors(rows)).toBe(false);
  });

  it("a note is a tag, never a state — even a scary-looking one", () => {
    const facilities = [
      F("f-nilavur", "Nilavur", "Tirupathur", "Nilavur PHC", "HWC HSC", {
        docsStatus: "Assessment Received by RQAU & In -Process",
        docsStatusReport: "Document in RQAU login",
      }),
    ];
    // A stated count that does not parse → info tag only.
    const row = clean(
      {
        facilityNameCategory: "Nilavoor/HWC",
        status: "Assessment Received by RQAU & In -Process",
        appliedDepartments: "12OPD, Emergency",
      },
      { parseDepartments: true },
    );
    expect(row.appliedDepartments.note).toMatch(/Stated 12 .* parsed 2/);
    const { rows } = buildSaqshamPreview([row], facilities);
    expect(rows[0].state).toBe("no_change");
    expect(notesFor(rows[0])).toMatch(/Stated 12/);
    expect(stateReason(rows[0])).toBe("All values equal");
  });
});

describe("Part 0.2 — department parsing", () => {
  it("seeds BOTH portal lists: the 12 service packages and the departments", () => {
    expect(KNOWN_DEPARTMENT_NAMES.length).toBeGreaterThan(19);
    expect(KNOWN_DEPARTMENT_NAMES).toContain("Antenatal & Postnatal Care");
    expect(KNOWN_DEPARTMENT_NAMES).toContain("OPD");
  });

  it("HWC HSC: 12 service packages parse as 12 (longest-first, whitespace-normalised)", () => {
    const raw =
      "12Antenatal & Postnatal Care,  Newborn & Child Health ,Family Planning, Adolescent Health," +
      "Immunization, Communicable Diseases, Non-Communicable Diseases, Mental Health," +
      "Elderly & Palliative Care, Emergency & Referral, Oral, Eye & ENT Care, Health Promotion & Wellness";
    const parsed = parseAppliedDepartments(raw);
    expect(parsed.statedCount).toBe(12);
    expect(parsed.departments.length).toBe(12);
    expect(parsed.ok).toBe(true);
    expect(parsed.note).toBeNull();
    expect(parsed.departments[10]).toBe("Oral, Eye & ENT Care");
  });

  it("PHC / CHC: six departments parse as six", () => {
    const parsed = parseAppliedDepartments("6OPD, Emergency, Pharmacy, Lab, Ward, OT");
    expect(parsed.departments).toEqual(["OPD", "Emergency", "Pharmacy", "Lab", "Ward", "OT"]);
    expect(parsed.ok).toBe(true);
  });

  it("an incomplete list is an INFO TAG, not an error and not a state", () => {
    const parsed = parseAppliedDepartments("3OPD, Emergency, Lab, Ward");
    expect(parsed.ok).toBe(false);
    expect(parsed.note).toMatch(/Stated 3/);
    expect(parsed.departments).toEqual([]);
    expect(parsed.raw).toBe("3OPD, Emergency, Lab, Ward"); // raw kept
  });

  it("the cell is only parsed when " + "Applied Departments\" is on", () => {
    const off = clean(
      { facilityNameCategory: "Nilavoor/HWC", appliedDepartments: "12OPD, Emergency" },
      { parseDepartments: false },
    );
    expect(off.appliedDepartments.note).toBeNull();
    expect(off.appliedDepartments.departments).toEqual([]);
    expect(off.appliedDepartments.raw).toBe("12OPD, Emergency");
    const on = clean(
      { facilityNameCategory: "Nilavoor/HWC", appliedDepartments: "12OPD, Emergency" },
      { parseDepartments: true },
    );
    expect(on.appliedDepartments.note).toMatch(/Stated 12/);
    expect(off.warnings.join(" ")).not.toMatch(/Stated 12/);
    expect(on.warnings.join(" ")).not.toMatch(/Stated 12/);
  });
});

describe("selected-row apply contract", () => {
  it("only ready, resolved changes are eligible even when forced included", () => {
    const facilities = [
      F("f-nilavur", "Nilavur", "Tirupathur", "Nilavur PHC", "HWC HSC", {
        docsStatus: "Documents Pending at Facility",
        docsStatusReport: "Documents Pending at Facility",
      }),
    ];
    const change = clean({
      facilityNameCategory: "Nilavoor/HWC",
      status: "Send ToolKit Pending",
    });
    const noChange = clean({
      facilityNameCategory: "Nilavoor/HWC",
      status: "Documents Pending at Facility",
    });
    const unmapped = clean({
      facilityNameCategory: "Nilavoor/HWC",
      status: "A portal status that is not configured",
    });
    const unmatched = clean({
      facilityNameCategory: "No Such Facility/HWC",
      status: "Send ToolKit Pending",
    });
    const { rows } = buildSaqshamPreview(
      [change, noChange, unmapped, unmatched],
      facilities,
    );
    const forced = rows.map((r) => ({ ...r, include: true }));
    const eligible = selectedRows(forced);
    expect(eligible).toHaveLength(1);
    expect(eligible[0].state).toBe("ready");
    expect(eligible[0].change).toBe("changed");
    expect(forced.filter(isEligiblePreviewRow)).toHaveLength(1);
  });

  it("validates supported mapping destinations and duplicate portal rows", () => {
    expect(statusMapIssues(SAQSHAM_STATUS_MAP)).toEqual([]);
    expect(statusMapIssues([]).join(" ")).toContain("at least one");
    expect(
      statusMapIssues([{ portal: "X", report: "A made-up report group" }]).join(" "),
    ).toContain("not a supported report status");
    expect(
      statusMapIssues([
        { portal: "X", report: "NA Scheduled" },
        { portal: " x ", report: "Document in SQAU login" },
      ]).join(" "),
    ).toContain("mapped more than once");
  });
});

describe("spreadsheet safety", () => {
  it("prefixes formula-looking text but leaves numbers alone", () => {
    expect(spreadsheetSafeValue("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(spreadsheetSafeValue("+CMD")).toBe("'+CMD");
    expect(spreadsheetSafeValue("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(spreadsheetSafeValue("Documents Pending at Facility")).toBe(
      "Documents Pending at Facility",
    );
    expect(spreadsheetSafeValue(42)).toBe(42);
  });
});

describe("Part 0.6 — identical values are drawn once", () => {
  it("portal date and report group show ONE value when previous equals new", () => {
    const facility = {
      ...FACILITIES[4],
      docsStatus: "Assessment Received by RQAU & In -Process",
      docsStatusReport: "Document in RQAU login",
      saqshamPortalUpdatedOn: "2026-10-06",
    };
    const row = clean({
      facilityNameCategory: "Nilavoor/HWC",
      status: "Assessment Received by RQAU & In -Process",
      lastUpdate: "6-Oct-2026",
    });
    const { rows } = buildSaqshamPreview([row], [facility]);
    expect(portalUpdateChangeLabel(rows[0])).toBe("06-Oct-2026");
    expect(portalUpdateChangeLabel(rows[0])).not.toContain("→");
    expect(reportChangeLabel(rows[0])).toBe("Document in RQAU login");
    expect(reportChangeLabel(rows[0])).not.toContain("→");
    expect(rows[0].state).toBe("no_change");
  });

  it("a real difference still shows previous struck and arrow to new", () => {
    const facility = {
      ...FACILITIES[4],
      docsStatus: "Documents Pending at Facility",
      docsStatusReport: "Documents Pending at Facility",
      saqshamPortalUpdatedOn: "2026-08-01",
    };
    const row = clean({
      facilityNameCategory: "Nilavoor/HWC",
      status: "Send ToolKit Pending",
      lastUpdate: "24-Aug-2026",
    });
    const { rows } = buildSaqshamPreview([row], [facility]);
    expect(reportChangeLabel(rows[0])).toContain("→");
    expect(portalUpdateChangeLabel(rows[0])).toContain("→");
  });
});
