/**
 * QUARTERLY IA IMPORT — pure-engine tests.
 * The fixtures mirror the districts' real IA file (golden rows from section 8).
 */

import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PHC_ALIASES,
  LARGE_CHANGE,
  applyPhcAliases,
  blankTrackerMessage,
  buildPhcAliasMap,
  cleanIaRow,
  cleanIaScore,
  collapseOddSpaces,
  columnIsFractional,
  currentIaQuarter,
  detectWideLayout,
  facilityIaKeysOf,
  formatFyQuarter,
  iaCoverageState,
  iaReminderStatus,
  isFutureQuarter,
  isQuarterProvisional,
  isFutureQuarter,
  lastQuarters,
  mapIaHeaders,
  matchIaRow,
  normalizeIaFy,
  normalizeIaQuarter,
  parseWideHeader,
  previousQuarter,
  quarterEndIso,
  quarterOrder,
  quartersBehind,
  scoreRemarkOf,
  unpivotWideSheet,
  type CleanIaRow,
  type FyQuarter,
  type IaFacility,
} from "../src/lib/iaImport";
import { quarterOfMonth } from "../src/lib/iaImport";

describe("quarter logic", () => {
  test("FY labels normalise to YYYY-YY", () => {
    expect(normalizeIaFy("2025-26")).toBe("2025-26");
    expect(normalizeIaFy("2025-2026")).toBe("2025-26");
    expect(normalizeIaFy("FY 25-26")).toBe("2025-26");
    expect(normalizeIaFy("FY2025-26")).toBe("2025-26");
    expect(normalizeIaFy("2025 - 26")).toBe("2025-26");
    expect(normalizeIaFy("2027")).toBe("2027-28");
    expect(normalizeIaFy("nonsense")).toBeNull();
  });

  test("quarters parse from every portal spelling", () => {
    expect(normalizeIaQuarter("Q3")).toBe(3);
    expect(normalizeIaQuarter("q3")).toBe(3);
    expect(normalizeIaQuarter("3")).toBe(3);
    expect(normalizeIaQuarter("Quarter 3")).toBe(3);
    expect(normalizeIaQuarter("Qtr 2")).toBe(2);
    expect(normalizeIaQuarter("Oct-Dec")).toBe(3);
    expect(normalizeIaQuarter("October to December")).toBe(3);
    expect(normalizeIaQuarter("apr-jun")).toBe(1);
    expect(normalizeIaQuarter("nope")).toBeNull();
  });

  test("Indian FY quarter of a calendar month", () => {
    expect(quarterOfMonth(4)).toBe(1);
    expect(quarterOfMonth(9)).toBe(2);
    expect(quarterOfMonth(10)).toBe(3);
    expect(quarterOfMonth(1)).toBe(4);
  });

  test("current quarter — October 2026 is Q3 2026-27", () => {
    expect(currentIaQuarter("2026-10-16")).toEqual({ fy: "2026-27", q: 3 });
    expect(currentIaQuarter("2026-04-01")).toEqual({ fy: "2026-27", q: 1 });
    expect(currentIaQuarter("2027-01-15")).toEqual({ fy: "2026-27", q: 4 });
  });

  test("future quarter is an error, old quarters count as behind", () => {
    expect(isFutureQuarter("2026-27", 4, "2026-10-16")).toBe(true);
    expect(isFutureQuarter("2027-28", 1, "2026-10-16")).toBe(true);
    expect(isFutureQuarter("2026-27", 3, "2026-10-16")).toBe(false);
    expect(quartersBehind("2026-27", 1, "2026-10-16")).toBe(2);
    expect(quartersBehind("2025-26", 4, "2026-10-16")).toBe(3);
  });

  test("previous quarter wraps across the FY", () => {
    expect(previousQuarter("2026-27", 1)).toEqual({ fy: "2025-26", q: 4 });
    expect(previousQuarter("2026-27", 3)).toEqual({ fy: "2026-27", q: 2 });
    const trend: FyQuarter[] = lastQuarters("2026-27", 3, 4);
    expect(trend.map((t) => `${t.fy} Q${t.q}`)).toEqual([
      "2025-26 Q4",
      "2026-27 Q1",
      "2026-27 Q2",
      "2026-27 Q3",
    ]);
  });

  test("sort order + quarter end dates", () => {
    expect(quarterOrder("2025-26", 4) > quarterOrder("2026-27", 1)).toBe(false);
    expect(quarterEndIso("2026-27", 3)).toBe("2026-12-31");
    expect(quarterEndIso("2026-27", 4)).toBe("2027-03-31");
    expect(formatFyQuarter("2026-27", 3)).toBe("Q3 2026-27");
  });
});

describe("score cleaning", () => {
  test("numbers keep their written precision and never round", () => {
    expect(cleanIaScore("69.0").value).toBe(69);
    expect(cleanIaScore(92.17).value).toBe(92.17);
    expect(cleanIaScore(" % 87.45 % ").value).toBe(87.45);
    expect(cleanIaScore("62.9").value).toBe(62.9);
  });

  test("blank is null, never 0", () => {
    expect(cleanIaScore("").value).toBeNull();
    expect(cleanIaScore(null).value).toBeNull();
    expect(cleanIaScore("").remark).toBeNull();
  });

  test("portal remark text becomes a chip, not an error, not zero", () => {
    // Annanagar_UPHC, 2025-26 Q3, NQAS = "New PHC".
    const s = cleanIaScore("New PHC");
    expect(s.value).toBeNull();
    expect(s.error).toBe(false);
    expect(s.remark).toBe("New PHC");
    expect(s.chip).toBe("New facility");
    expect(scoreRemarkOf("N/A").chip).toBe("Not applicable");
    expect(scoreRemarkOf("Not assessed").chip).toBe("Not assessed");
  });

  test("out-of-range is an error", () => {
    expect(cleanIaScore(105).error).toBe(true);
    expect(cleanIaScore(-3).error).toBe(true);
    expect(cleanIaScore(100).error).toBe(false);
  });

  test("fraction conversion is column-driven and chipped", () => {
    // 0.85 inside a column whose values are percents → ×100.
    expect(cleanIaScore(0.85, true).value).toBe(85);
    expect(cleanIaScore(0.85, true).chip).toBe("converted from fraction");
    expect(cleanIaScore(0.85, false).value).toBe(0.85);
    expect(columnIsFractional([62.9, 37.3, null])).toBe(false);
    // Mostly-percent column with one fraction-looking value → convert.
    expect(columnIsFractional([62.9, 0.37, 83.8])).toBe(true);
    // A column that is ONLY fractions is a different unit, not a broken percent.
    expect(columnIsFractional([0.62, 0.37, 0.9, null])).toBe(false);
  });
});

describe("name normalisation + aliases", () => {
  test("odd spacing collapses", () => {
    expect(collapseOddSpaces("Ambur(Ambur )_UPHC")).toBe("Ambur(Ambur)_UPHC");
    expect(collapseOddSpaces(" Pachur _ CHC ")).toBe("Pachur_CHC");
  });

  test("PHC variants resolve both ways", () => {
    const map = buildPhcAliasMap(DEFAULT_PHC_ALIASES);
    expect(applyPhcAliases("kavalurchatram", map)).toBe("kvchathiram");
    expect(applyPhcAliases("kvchathiram", map)).toBe("kvchathiram");
    expect(applyPhcAliases("udhayenthiram", map)).toBe("udayendram");
    expect(applyPhcAliases("jammanapudhur", map)).toBe("jammanapudur");
    expect(applyPhcAliases("nimmiyampattu", map)).toBe("nimiyampattu");
  });
});

const fac = (
  id: string,
  name: string,
  block: string,
  phc: string,
  facilityType: string,
  key?: string,
): IaFacility => ({
  id,
  name,
  block,
  phc,
  facilityType,
  facilityKeys: key ?? facilityIaKeysOf({ name, block, phc, facilityType }),
});

const FACILITIES: IaFacility[] = [
  fac("van-sdh", "Vaniyambadi", "Vaniyambadi", "Vaniyambadi", "SDH"),
  fac("ambur-sdh", "Ambur", "Ambur", "Ambur", "SDH"),
  fac("natrampalli-sdh", "Natrampalli", "Natrampalli", "Natrampalli", "SDH"),
  // The duplicate-name cases: same name, different PHC/type.
  fac("nara-jolar", "Narayanapuram", "Jolarpettai", "Jolarpettai", "HWC HSC"),
  fac("nara-raman", "Narayanapuram", "Natrampalli", "Ramanaickenpettai", "HWC HSC"),
  fac("valli-phc", "Vallipattu", "Vallipattu", "Vallipattu", "PHC"),
  fac("valli-hwc", "Vallipattu", "Pudurnadu", "Vallipattu", "HWC HSC"),
  fac("tham-phc", "Thamalerimuthur", "Thamalerimuthur", "Thamalerimuthur", "PHC"),
  fac("tham-hwc", "Thamalerimuthur", "Natrampalli", "Thamalerimuthur", "HWC HSC"),
  fac("kaniga", "Kanigapuram", "Madhanur", "Kaspa", "UHWC"),
  fac("pachur", "Pachur", "Pachur", "Pachur", "CHC"),
  fac("annanagar", "Annanagar", "Vellore", "Annanagar", "UPHC"),
];

describe("ia matching", () => {
  const rowOf = (row: {
    key?: string;
    name?: string;
    block?: string;
    phc?: string;
    facilityType?: string;
  }) => ({
    key: row.key ?? "",
    name: row.name ?? "",
    block: row.block ?? "",
    phc: row.phc ?? "",
    facilityType: row.facilityType ?? "",
  });

  test("1 — saved facility_key wins (100%)", () => {
    const fileKey = facilityIaKeysOf({ name: "Kanigapuram", block: "Madhanur", phc: "Kaspa", facilityType: "UHWC" })[0];
    const m = matchIaRow(rowOf({ key: fileKey }), FACILITIES);
    expect(m.status).toBe("matched");
    expect(m.method).toBe("helper");
    expect(m.confidence).toBe(100);
    expect(m.facilityId).toBe("kaniga");
  });

  test("2 — saved alias wins (Kaspa -B_UHWC → Kanigapuram)", () => {
    const aliases = [{ portalNameNormalized: "kaspabuhwc", facilityType: "UHWC", facilityId: "kaniga" }];
    const m = matchIaRow(rowOf({ key: "Kaspa -B_UHWC", name: "Kaspa -B" }), FACILITIES, aliases);
    expect(m.status).toBe("matched");
    expect(m.method).toBe("alias");
    expect(m.confidence).toBe(100);
    expect(m.facilityId).toBe("kaniga");
  });

  test("3 — block+phc+name+type (98%) and never name alone", () => {
    // Identical names across PHCs must NOT merge:
    const a = matchIaRow(rowOf({ name: "Narayanapuram", block: "Jolarpettai", phc: "Jolarpettai", facilityType: "HWC HSC" }), FACILITIES);
    expect(a).toMatchObject({ status: "matched", facilityId: "nara-jolar" });
    const b = matchIaRow(rowOf({ name: "Narayanapuram", block: "Natrampalli", phc: "Ramanaickenpettai", facilityType: "HWC HSC" }), FACILITIES);
    expect(b).toMatchObject({ status: "matched", facilityId: "nara-raman" });
    // PHC vs HWC HSC with the same name stay distinct.
    expect(matchIaRow(rowOf({ name: "Vallipattu", block: "Vallipattu", phc: "Vallipattu", facilityType: "PHC" }), FACILITIES)).toMatchObject({ facilityId: "valli-phc" });
    expect(matchIaRow(rowOf({ name: "Vallipattu", block: "Pudurnadu", phc: "Vallipattu", facilityType: "HWC HSC" }), FACILITIES)).toMatchObject({ facilityId: "valli-hwc" });
    expect(matchIaRow(rowOf({ name: "Thamalerimuthur", block: "Thamalerimuthur", phc: "Thamalerimuthur", facilityType: "PHC" }), FACILITIES)).toMatchObject({ facilityId: "tham-phc" });
  });

  test("4 — same name + same type across PHCs, no differentiators → ambiguous", () => {
    // Narayanapuram (HWC HSC) exists under two PHCs; the file row carries no
    // block/PHC cell, so the exact tiers tie → ambiguous for a manual pick.
    const m = matchIaRow(
      rowOf({ name: "Narayanapuram", facilityType: "HWC HSC" }),
      FACILITIES.filter((f) => f.name === "Narayanapuram"),
    );
    expect(m.status).toBe("ambiguous");
  });

  test("6 — unmatched stays unmatched", () => {
    expect(matchIaRow(rowOf({ name: "Unknown X", facilityType: "PHC" }), FACILITIES).status).toBe("unmatched");
  });
});

describe("row cleaning", () => {
  test("fixture row — key split, scores, warnings for unknown type", () => {
    const row: CleanIaRow = cleanIaRow(
      { "Facility for Formula": "Alangayam_Mittur_HWC HSC", "NQAS IA Score": "69.0", "Financial Year": "2026-27", Quarter: "Q1" },
      { facilityKey: "Facility for Formula", nqasIa: "NQAS IA Score", fy: "Financial Year", quarter: "Quarter" },
      { rowNo: 1, sourceRowNo: 2 },
    );
    expect(row.name).toBe("Alangayam");
    expect(row.block).toBe("Mittur");
    expect(row.facilityType).toBe("HWC HSC");
    expect(row.fy).toBe("2026-27");
    expect(row.q).toBe(1);
    expect(row.scores.nqas.value).toBe(69);
    expect(row.scores.kayakalp.value).toBeNull();
  });

  test("no FY/Quarter in the file — whole-file override supplies them", () => {
    const row = cleanIaRow(
      { "Name of the faciltiy": "Pachur", Type: "CHC", "NQAS IA Score": "62.9" },
      { facilityName: "Name of the faciltiy", type: "Type", nqasIa: "NQAS IA Score" },
      { rowNo: 1, sourceRowNo: 3, fyOverride: "2026-27", qOverride: 2 },
    );
    expect(row.fy).toBe("2026-27");
    expect(row.q).toBe(2);
    expect(row.fyError).toBe(false);
    expect(row.qError).toBe(false);
  });

  test("bad FY/Quarter cells flag an error without crashing", () => {
    const row = cleanIaRow(
      { "Financial Year": "unknown", Quarter: "Q9", "NQAS IA Score": "62.9" },
      { fy: "Financial Year", quarter: "Quarter", nqasIa: "NQAS IA Score" },
      { rowNo: 1, sourceRowNo: 4 },
    );
    expect(row.fyError).toBe(true);
    expect(row.qError).toBe(true);
  });
});

describe("header mapping + wide layout", () => {
  test("portal headers map, S. No ignored, typos tolerated", () => {
    const { roles, unmapped } = mapIaHeaders([
      "S. No",
      "Facility for Formula",
      "Block",
      "PHC",
      "Name of the faciltiy",
      "Type",
      "Financial Year",
      "Quarter",
      "NQAS IA Score",
      "Kayakalp IA Score",
      "Eco- Friendly  Scorcard",
    ]);
    expect(roles.nqasIa).toBe("NQAS IA Score");
    expect(roles.kayakalpIa).toBe("Kayakalp IA Score");
    expect(roles.facilityName).toBe("Name of the faciltiy");
    expect(roles.sno).toBeUndefined();
    // Part 2: the deprecated Eco column is recognized (so it never becomes
    // an "unmapped" error) but silently ignored.
    expect(roles.ecoFriendly).toBeUndefined();
    expect(unmapped).not.toContain("Eco- Friendly  Scorcard");
  });

  test("wide headers parse their tracker/FY/quarter", () => {
    const h = parseWideHeader("NQAS IA % 2026-27 (Q2)");
    expect(h).toEqual({ tracker: "nqas", fy: "2026-27", q: 2 });
    expect(parseWideHeader("Kayakalp IA % 2026-27 (Q1)")).toEqual({ tracker: "kayakalp", fy: "2026-27", q: 1 });
    expect(parseWideHeader("Eco-Friendly Scorecard 2026-27 (Q2)")).toEqual({ tracker: "eco", fy: "2026-27", q: 2 });
    expect(parseWideHeader("Block")).toBeNull();
    expect(detectWideLayout(["Block", "NQAS IA % 2026-27 (Q2)"])).toBe(true);
    expect(detectWideLayout(["Block", "NQAS IA Score"])).toBe(false);
  });

  test("wide sheet unpivots one row per period", () => {
    const headers = [
      "Facility for Formula",
      "NQAS IA % 2026-27 (Q1)",
      "NQAS IA % 2026-27 (Q2)",
      "Kayakalp IA % 2026-27 (Q1)",
    ];
    const rows = [
      ["Pachur_CHC", 83.8, 72.3, 81.1],
      ["Annanagar", null, null, null],
    ];
    const out = unpivotWideSheet(headers, rows as unknown[][], {});
    expect(out.length).toBe(4); // 2 rows × 2 periods
    const q1 = out[0];
    expect(q1.fy).toBe("2026-27");
    expect(q1.q).toBe(1);
    expect(q1.scores.nqas.value).toBe(83.8);
    expect(q1.scores.kayakalp.value).toBe(81.1);
    expect(q1.scores.eco.value).toBeNull();
    const q2 = out[1];
    expect(q2.q).toBe(2);
    expect(q2.scores.nqas.value).toBe(72.3);
    expect(q2.scores.kayakalp.value).toBeNull(); // column absent for that period
  });
});

describe("blank condenser + large change constants", () => {
  test("all-blank column gives ONE info message", () => {
    expect(blankTrackerMessage("kayakalp", 157, 157)).toBe("Kayakalp IA not reported for this quarter (157 of 157 rows blank)");
    expect(blankTrackerMessage("kayakalp", 12, 157)).toBeNull();
  });

  test("relationship of the constants stays as specified", () => {
    expect(LARGE_CHANGE).toBe(20);
  });
});

describe("reminder — coverage, grace and the due date (Part 2)", () => {
  const TOTAL = 157;
  const q2 = (reported: number) => [
    { fy: "2026-27", q: 1 as const, reported: 150, total: TOTAL },
    { fy: "2026-27", q: 2 as const, reported, total: TOTAL },
  ];

  test("Q2 fully stored without any batch row → no banner", () => {
    // 22-Oct-2026: Q2 ended 30-Sep, grace 5 days → due 05-Oct. Coverage 157/157.
    const r = iaReminderStatus("2026-10-22", q2(TOTAL), { graceDays: 5, totalFacilities: TOTAL });
    expect(r.dueLabel).toBeNull();
    expect(r.message).toBeNull();
    expect(r.lastImportedLabel).toBe("Q2 2026-27");
  });

  test("an older incomplete quarter never raises the banner once the reporting quarter is complete", () => {
    // Regression: the report showed "Q3 2025-26 · 301 days overdue" even though
    // Q2 2026-27 (the reporting quarter) was complete.
    const coverage = [
      { fy: "2025-26", q: 3 as const, reported: 139, total: TOTAL },
      { fy: "2026-27", q: 2 as const, reported: TOTAL, total: TOTAL },
      { fy: "2026-27", q: 3 as const, reported: 120, total: TOTAL, provisional: true },
    ];
    const r = iaReminderStatus("2026-11-02", coverage, {
      graceDays: 5,
      totalFacilities: TOTAL,
    });
    expect(r.dueLabel).toBeNull();
    expect(r.message).toBeNull();
  });

  test("Q2 partial → counts and the exact overdue days from the DUE date", () => {
    const r = iaReminderStatus("2026-10-22", q2(140), { graceDays: 5, totalFacilities: TOTAL });
    expect(r.dueLabel).toBe("Q2 2026-27");
    expect(r.state).toBe("partial");
    expect(r.reported).toBe(140);
    expect(r.total).toBe(TOTAL);
    expect(r.dueDateIso).toBe("2026-10-05");
    expect(r.overdueDays).toBe(17);
    expect(r.message).toBe(
      "Q2 2026-27 IA report: 140 of 157 facilities reported. Due 05-Oct-2026 (17 days overdue)",
    );
  });

  test("grace days are honoured (no banner before the due date, 0 days on it)", () => {
    const before = iaReminderStatus("2026-10-04", q2(140), { graceDays: 5, totalFacilities: TOTAL });
    expect(before.dueLabel).toBeNull();
    const onDue = iaReminderStatus("2026-10-05", q2(140), { graceDays: 5, totalFacilities: TOTAL });
    expect(onDue.dueLabel).toBe("Q2 2026-27");
    expect(onDue.overdueDays).toBe(0);
    expect(onDue.message).toContain("Due 05-Oct-2026");
    expect(onDue.message).not.toContain("overdue");
    // A different admin grace shifts the due date and the overdue count.
    const tenDay = iaReminderStatus("2026-10-10", q2(140), { graceDays: 10, totalFacilities: TOTAL });
    expect(tenDay.dueDateIso).toBe("2026-10-10");
    expect(tenDay.overdueDays).toBe(0);
  });

  test("coverage at/above the threshold is Complete; below is Partial", () => {
    expect(iaCoverageState(150, TOTAL, 95)).toBe("complete"); // 95.5%
    expect(iaCoverageState(149, TOTAL, 95)).toBe("partial");
    expect(iaCoverageState(0, TOTAL, 95)).toBe("missing");
    // A blank is never counted as 0 → no row at all means "missing".
    const none = iaReminderStatus("2026-10-22", [], { graceDays: 5, totalFacilities: TOTAL });
    expect(none.state).toBe("missing");
    expect(none.reported).toBe(0);
  });

  test("Q3 on 22-Oct is accepted as provisional; the banner waits for 31-Dec + grace", () => {
    expect(isFutureQuarter("2026-27", 3, "2026-10-22")).toBe(false);
    expect(isQuarterProvisional("2026-27", 3, "2026-10-22")).toBe(true);
    expect(isQuarterProvisional("2026-27", 2, "2026-10-22")).toBe(false);
    // A truly future quarter is still rejected.
    expect(isFutureQuarter("2026-27", 4, "2026-10-22")).toBe(true);

    const withQ3 = [
      ...q2(TOTAL),
      { fy: "2026-27", q: 3 as const, reported: 40, total: TOTAL, provisional: true },
    ];
    // 04-Jan-2027: Q3 ended, but grace has not run out → no banner yet.
    expect(iaReminderStatus("2027-01-04", withQ3, { graceDays: 5, totalFacilities: TOTAL }).dueLabel).toBeNull();
    // 05-Jan-2027: due date reached → Q3 banner, 0 days overdue.
    const due = iaReminderStatus("2027-01-05", withQ3, { graceDays: 5, totalFacilities: TOTAL });
    expect(due.dueLabel).toBe("Q3 2026-27");
    expect(due.dueDateIso).toBe("2027-01-05");
    expect(due.overdueDays).toBe(0);
    expect(due.state).toBe("partial");
    expect(due.message).toBe(
      "Q3 2026-27 IA report: 40 of 157 facilities reported. Due 05-Jan-2027",
    );
    // The latest quarter with data is Q3 — provisional.
    expect(due.lastImportedLabel).toBe("Q3 2026-27");
    expect(due.latestProvisional).toBe(true);
  });

  test("an ended provisional quarter becomes the Mark-final candidate", () => {
    const full = [
      ...q2(TOTAL),
      { fy: "2026-27", q: 3 as const, reported: TOTAL, total: TOTAL, provisional: true },
    ];
    const r = iaReminderStatus("2027-01-10", full, { graceDays: 5, totalFacilities: TOTAL });
    expect(r.dueLabel).toBeNull(); // Q3 is complete
    expect(r.finalCandidate).toEqual({
      fy: "2026-27",
      q: 3,
      label: "Q3 2026-27",
      reported: TOTAL,
      total: TOTAL,
    });
  });
});

/* =========================================================================== */
/* PREVIEW (buildIaPreview) — golden rows from the district's IA file          */
/* =========================================================================== */

import {
  buildIaPreview,
  type IaStoredQuarter,
} from "../src/lib/iaImport";

const stored = (
  facilityId: string,
  fy: string,
  quarter: number,
  scores: { nqas?: number | null; kayakalp?: number | null; eco?: number | null } = {},
): IaStoredQuarter => ({
  facilityId,
  fy,
  quarter,
  nqasIaScore: scores.nqas ?? null,
  kayakalpIaScore: scores.kayakalp ?? null,
  ecoFriendlyScore: scores.eco ?? null,
  nqasRemark: null,
  kayakalpRemark: null,
  ecoRemark: null,
  lockedAt: null,
  updatedAt: 1,
});

const rowFor = (name: string, block: string, phc: string, type: string, nqas: string, fy = "2026-27", q = "Q2") =>
  cleanIaRow(
    {
      "Name of the faciltiy": name,
      Block: block,
      PHC: phc,
      Type: type,
      "Financial Year": fy,
      Quarter: q,
      "NQAS IA Score": nqas,
    },
    { facilityName: "Name of the faciltiy", block: "Block", phc: "PHC", type: "Type", fy: "Financial Year", quarter: "Quarter", nqasIa: "NQAS IA Score" },
    { rowNo: name.length, sourceRowNo: 3 },
  );

describe("buildIaPreview", () => {
  const today = "2026-10-16";

  test("large change fires at ≥ 20 points both directions", () => {
    const rows = [
      rowFor("Pachur", "Pachur", "Pachur", "CHC", "37.3"),
      rowFor("Pungampattu Nadu", "Pudurnadu", "Pungampattu Nadu", "PHC", "77.11"),
    ];
    const recent = [
      stored("pachur", "2026-27", 1, { nqas: 62.9 }),
      stored("punga", "2026-27", 1, { nqas: 51.17 }),
    ];
    const { rows: preview } = buildIaPreview(rows, [fac("pachur", "Pachur", "Pachur", "Pachur", "CHC"), fac("punga", "Pungampattu Nadu", "Pudurnadu", "Pungampattu Nadu", "PHC")], [], { today, recent });
    expect(preview[0].chips.some((c) => c.startsWith("Large change (−"))).toBe(true);
    expect(preview[1].chips.some((c) => c.startsWith("Large change (+"))).toBe(true);
  });

  test("same-as-previous quarter chip for a copy-forward row", () => {
    const rows = [rowFor("Athanavoor", "Pudurnadu", "Athanavoor", "PHC", "83.8")];
    const recent = [
      stored("athan", "2026-27", 1, { nqas: 83.8 }),
      stored("athan", "2026-27", 2, { nqas: 83.8 }),
    ];
    const { rows: preview } = buildIaPreview(rows, [fac("athan", "Athanavoor", "Pudurnadu", "Athanavoor", "PHC")], [], { today, recent });
    expect(preview[0].chips).toContain("Same as previous quarter");
    expect(preview[0].state).toBe("no_change");
  });

  test("remark cell is a chip, never an error and never 0", () => {
    const rows = [rowFor("Annanagar", "Vellore", "Annanagar", "UPHC", "New PHC", "2025-26", "Q3")];
    const { rows: preview, summary } = buildIaPreview(rows, [fac("annanagar", "Annanagar", "Vellore", "Annanagar", "UPHC")], [], { today, recent: [] });
    expect(preview[0].cleaned.scores.nqas.value).toBeNull();
    expect(preview[0].cleaned.scores.nqas.chip).toBe("New facility");
    expect(preview[0].state).not.toBe("error");
    expect(summary.errors).toBe(0);
  });

  test("re-uploading the same file reports no change everywhere", () => {
    const rows = [rowFor("Pachur", "Pachur", "Pachur", "CHC", "62.9")];
    const recent = [stored("pachur", "2026-27", 2, { nqas: 62.9 })];
    const { rows: preview, summary } = buildIaPreview(rows, [fac("pachur", "Pachur", "Pachur", "Pachur", "CHC")], [], { today, recent });
    expect(preview[0].state).toBe("no_change");
    expect(summary.willChange).toBe(0);
  });

  test("duplicate facility rows are both flagged for review, last non-blank wins", () => {
    const first = rowFor("Vallipattu", "Vallipattu", "Vallipattu", "PHC", "74.5");
    const second = rowFor("Vallipattu", "Vallipattu", "Vallipattu", "PHC", "76.5");
    const { rows: preview } = buildIaPreview([first, second], [fac("valli", "Vallipattu", "Vallipattu", "Vallipattu", "PHC")], [], { today, recent: [] });
    expect(preview.every((r) => r.state === "needs_review")).toBe(true);
    expect(preview.find((r) => r.cleaned.scores.nqas.value === 76.5)).toBeTruthy();
  });

  test("score 105 is an error; future quarter is an error", () => {
    const bad = rowFor("Pachur", "Pachur", "Pachur", "CHC", "105");
    const future = rowFor("Pachur", "Pachur", "Pachur", "CHC", "62.9", "2026-27", "Q4");
    const { rows: preview } = buildIaPreview([bad, future], [fac("pachur", "Pachur", "Pachur", "Pachur", "CHC")], [], { today, recent: [] });
    expect(preview[0].state).toBe("error");
    expect(preview[1].state).toBe("error");
  });

  test("alias match (Kaspa -B_UHWC → Kanigapuram) beats fuzzy", () => {
    const aliases = [{ portalNameNormalized: "kaspabuhwc", facilityType: "UHWC", facilityId: "kaniga" }];
    const rows = [
      cleanIaRow(
        { "Facility for Formula": "Kaspa -B_UHWC", "Financial Year": "2026-27", Quarter: "Q2", "NQAS IA Score": "88" },
        { facilityKey: "Facility for Formula", fy: "Financial Year", quarter: "Quarter", nqasIa: "NQAS IA Score" },
        { rowNo: 1, sourceRowNo: 2 },
      ),
    ];
    const { rows: preview } = buildIaPreview(rows, [fac("kaniga", "Kanigapuram", "Madhanur", "Kaspa", "UHWC")], aliases, { today, recent: [] });
    expect(preview[0].match).toMatchObject({ status: "matched", method: "alias", facilityId: "kaniga" });
  });

  test("coverage panel names facilities missing from the file", () => {
    const rows = [rowFor("Pachur", "Pachur", "Pachur", "CHC", "62.9")];
    const { summary } = buildIaPreview(rows, [fac("pachur", "Pachur", "Pachur", "Pachur", "CHC"), fac("valli", "Vallipattu", "Vallipattu", "Vallipattu", "PHC")], [], { today, recent: [] });
    expect(summary.missing).toEqual(["Vallipattu"]);
  });

  test("stale quarter (>2 behind) carries a past-quarter chip but is not blocking", () => {
    // Spec change (NIN import): a history backfill is a smart WARNING, never
    // blocking — blocking it would make importing the missing quarters
    // impossible. Assignments still need the user's approval.
    const rows = [rowFor("Pachur", "Pachur", "Pachur", "CHC", "62.9", "2026-27", "Q1")];
    const { rows: preview } = buildIaPreview(rows, [fac("pachur", "Pachur", "Pachur", "Pachur", "CHC")], [], { today, recent: [] });
    expect(preview[0].state).toBe("ready");
    expect(preview[0].chips).toContain("Past quarter edit");
  });
});
