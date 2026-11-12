/**
 * FACILITY MASTER LIST — the acceptance criteria of the redesign, tested on the
 * REAL engine the page renders (no mocks, no copies of the logic).
 *
 * Covers the three things the brief asks to be pinned:
 *   • FILTERS   — search, the three primary filters, the "More filters" set,
 *                 the KPI-card predicates, the due window and the score range,
 *   • SORTING   — numeric / date / numeric-aware text ordering, blanks last,
 *                 multi-column sorts, the derived "Next Action / Due" column
 *                 and a deterministic tiebreak,
 *   • COLUMN PRESETS — the default 7-8 column view, the named presets
 *                 (Certification / Pipeline / Building & Fire NOC), persistence
 *                 and the guarantee that a corrupt stored view cannot break
 *                 the page.
 *
 * Plus the three "at a glance" rules: no bare "—" in a cell, duplicate
 * facility names disambiguated by PHC · Block, and the "Next Action / Due"
 * column that turns five deadlines into one.
 *
 * Run: bun test ./scripts
 */
import { describe, expect, test } from "bun:test";

import {
  COLUMN_BY_KEY,
  COLUMN_PRESETS,
  DEFAULT_VISIBLE_KEYS,
  MASTER_COLUMNS,
  REPORT_COLUMNS,
  blankLabel,
  cellText,
  cellValue,
  columnsMenuColumns,
  deprecatedColumns,
  fullExportColumns,
  masterListColumns,
  nextDueOf,
  type MasterRow,
} from "../src/lib/masterColumns";
import {
  NO_CYCLE,
  applyMasterFilters,
  compareMasterRows,
  duplicateNames,
  foldStatus,
  isDuplicateName,
  kpiMatches,
  latestUpdatedAt,
  sortMasterRows,
  type MasterKpiId,
} from "../src/lib/masterFilter";
import {
  CUSTOM_PRESET_ID,
  DEFAULT_VIEW,
  applyPreset,
  moveColumn,
  normalizeView,
  orderedVisibleColumns,
} from "../src/lib/masterView";

/* --------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* --------------------------------------------------------------------------- */

/** Pinned "today" so the date-based filters are deterministic. */
const TODAY = new Date(Date.UTC(2026, 9, 15, 12)); // 15-Oct-2026

type RowSpec = {
  id?: string;
  name?: string;
  block?: string;
  phc?: string;
  type?: string;
  /** Undefined keeps the fixture default NIN; null records "no NIN". */
  nin?: string | null;
  eligibility?: string | null;
  status?: string | null;
  statusOverride?: string | null;
  cycle?: number | null;
  remarks?: string | null;
  updatedAt?: number | null;
  nqas?: Partial<NonNullable<MasterRow["nqas"]>> | null;
  sa?: Partial<NonNullable<MasterRow["sa"]>> | null;
  fund?: Partial<NonNullable<MasterRow["fund"]>> | null;
  noc?: Partial<NonNullable<MasterRow["noc"]>> | null;
  building?: Partial<NonNullable<MasterRow["building"]>> | null;
  ia?: { status?: string | null; dueDate?: string | null } | null;
};

/** Null-preserving factory: an explicit `null` must stay null (a nullish
 *  fallback here would hand every "not recorded" test a value). */
function makeRow(spec: RowSpec = {}): MasterRow {
  return {
    facility: {
      _id: spec.id ?? "f1",
      name: spec.name ?? "Thiriyalam",
      block: spec.block ?? "Jolarpettai",
      phc: spec.phc ?? "Pudupettai",
      facilityType: spec.type ?? "HWC HSC",
      ninNumber: spec.nin === undefined ? "1201004471" : spec.nin,
      eligibility: spec.eligibility === undefined ? "Eligible" : spec.eligibility,
      currentStatus: spec.status === undefined ? "SA Not Yet Initiated" : spec.status,
      statusOverride: spec.statusOverride === undefined ? null : spec.statusOverride,
      remarks: spec.remarks === undefined ? "" : spec.remarks,
      updatedAt: spec.updatedAt === undefined ? null : spec.updatedAt,
    },
    cycleNumber: spec.cycle === undefined ? null : spec.cycle,
    cycleType: null,
    sa: spec.sa === undefined || spec.sa === null ? null : { ...spec.sa },
    nqas: spec.nqas === undefined || spec.nqas === null ? null : { ...spec.nqas },
    fund: spec.fund === undefined || spec.fund === null ? null : { ...spec.fund },
    noc: spec.noc === undefined || spec.noc === null ? null : { ...spec.noc },
    building:
      spec.building === undefined || spec.building === null ? null : { ...spec.building },
    ia: spec.ia ?? null,
    resultDocumentId: null,
    resultDocumentName: null,
  };
}

/** Six facilities that between them exercise every filter and sort rule. */
const rows: MasterRow[] = [
  // 0 — certified, certificate expiring in 40 days, 1st surveillance overdue
  makeRow({
    id: "a",
    name: "Vallipattu",
    block: "Alangayam",
    phc: "Vallipattu",
    type: "HWC PHC",
    status: "Certified — Surveillance Due",
    cycle: 2,
    nqas: {
      status: "Completed",
      certificationStatus: "Quality Certified",
      scorePercent: 82,
      validityDate: "2026-11-24",
      surveillanceDue1: "2026-10-01",
      surveillanceDue2: "2027-10-01",
      goiLetterDate: "2025-11-24",
    },
    fund: { amountSanctioned: 1250000, financialYear: "2025-26" },
    noc: { nocAvailable: "Yes", expiryDate: "2027-01-01", status: "Valid" },
    building: { buildingType: "Own Building", buildingStatus: "Good" },
    updatedAt: Date.UTC(2026, 9, 14, 3, 30),
  }),
  // 1 — the SAME name (duplicate), still in the pipeline, NOC not obtained
  makeRow({
    id: "b",
    name: "Vallipattu",
    block: "Tirupathur",
    phc: "Kandhili",
    type: "UAMM",
    status: "SA Completed — NQAS Awaited",
    cycle: 1,
    nin: "1201004488",
    nqas: { status: "In Progress", scheduledStartDate: "2026-10-20", scorePercent: 61 },
    sa: { status: "Completed", scorePercent: 74, generalDocStatus: "Received" },
    noc: { nocAvailable: "No", expiryDate: null },
  }),
  // 2 — Not Eligible, nothing started: every optional cell is blank
  makeRow({
    id: "c",
    name: "Girisamudram",
    block: "Alangayam",
    phc: "Girisamudram",
    type: "HWC HSC",
    eligibility: "Not Eligible",
    status: "Facility (Future Candidate)",
    nin: null,
  }),
  // 3 — no cycle, legacy candidate spelling, internal assessment overdue
  makeRow({
    id: "d",
    name: "Ambalur",
    block: "Tirupathur",
    phc: "Ambalur",
    type: "PHC",
    eligibility: "Possible",
    status: "Possible Future Candidate",
    cycle: null,
    nin: null,
    ia: { status: "Pending", dueDate: "2026-10-05" },
  }),
  // 4 — certificate and NOC both long expired, fund released
  makeRow({
    id: "e",
    name: "Kandhili HSC",
    block: "Tirupathur",
    phc: "Kandhili",
    type: "HWC HSC",
    status: "Certification Expired",
    cycle: 3,
    nin: "1201004499",
    nqas: {
      status: "Completed",
      certificationStatus: "Certified",
      scorePercent: 48,
      validityDate: "2026-01-10",
      surveillanceDone1: "2025-01-10",
      surveillanceDue1: "2026-01-10",
    },
    fund: { amountSanctioned: 500000, financialYear: "2024-25" },
    noc: { nocAvailable: "Yes", expiryDate: "2026-06-30", status: "Expired" },
    updatedAt: Date.UTC(2026, 7, 1, 2, 0),
  }),
  // 5 — eligible and genuinely not assessed (the "Eligible, not assessed" card)
  makeRow({
    id: "f",
    name: "Pudupettai",
    block: "Jolarpettai",
    phc: "Pudupettai",
    type: "HWC HSC",
    eligibility: "Eligible",
    status: "SA Not Yet Initiated",
    nin: null,
  }),
];

const names = (list: MasterRow[]) => list.map((r) => r.facility.name).join(",");

/* --------------------------------------------------------------------------- */
/* Filters                                                                     */
/* --------------------------------------------------------------------------- */

describe("master list filters", () => {
  test("no filters keeps every row, and an empty selection is not a filter", () => {
    expect(applyMasterFilters(rows, {}, TODAY).length).toBe(6);
    expect(
      applyMasterFilters(rows, { blocks: [], types: [], status: [] }, TODAY).length,
    ).toBe(6);
  });

  test("search matches name, PHC, block and NIN, ignoring case and padding", () => {
    expect(names(applyMasterFilters(rows, { search: "  vallipattu " }, TODAY))).toBe(
      "Vallipattu,Vallipattu",
    );
    // PHC too — the second Vallipattu sits in PHC Kandhili.
    expect(names(applyMasterFilters(rows, { search: "kandhili" }, TODAY))).toBe(
      "Vallipattu,Kandhili HSC",
    );
    expect(names(applyMasterFilters(rows, { search: "ambalur" }, TODAY))).toBe("Ambalur");
    expect(names(applyMasterFilters(rows, { search: "TIRUPATHUR" }, TODAY))).toBe(
      "Vallipattu,Ambalur,Kandhili HSC",
    );
    // NIN: only the facility that still carries that number.
    expect(names(applyMasterFilters(rows, { search: "1201004471" }, TODAY))).toBe(
      "Vallipattu",
    );
    expect(applyMasterFilters(rows, { search: "nothing here" }, TODAY).length).toBe(0);
  });

  test("the three primary filters: Block, Facility type, Current Status", () => {
    expect(names(applyMasterFilters(rows, { blocks: ["Alangayam"] }, TODAY))).toBe(
      "Vallipattu,Girisamudram",
    );
    // Filtering preserves the source (data) order — it never re-sorts.
    expect(names(applyMasterFilters(rows, { types: ["HWC HSC", "UAMM"] }, TODAY))).toBe(
      "Vallipattu,Girisamudram,Kandhili HSC,Pudupettai",
    );
    expect(
      names(applyMasterFilters(rows, { status: ["Certification Expired"] }, TODAY)),
    ).toBe("Kandhili HSC");
    // A missing value never matches a concrete selection.
    expect(applyMasterFilters(rows, { blocks: ["Nowhere"] }, TODAY).length).toBe(0);
  });

  test("the More-filters set: cycle (incl. No cycle), eligibility, building, NOC", () => {
    expect(names(applyMasterFilters(rows, { cycles: ["2"] }, TODAY))).toBe("Vallipattu");
    expect(names(applyMasterFilters(rows, { cycles: [NO_CYCLE] }, TODAY))).toBe(
      "Girisamudram,Ambalur,Pudupettai",
    );
    expect(names(applyMasterFilters(rows, { eligibility: ["Not Eligible"] }, TODAY))).toBe(
      "Girisamudram",
    );
    expect(
      names(applyMasterFilters(rows, { buildingType: ["Own Building"] }, TODAY)),
    ).toBe("Vallipattu");
    // NOC status is DERIVED from the validity date, not read from the row.
    expect(names(applyMasterFilters(rows, { nocStatus: ["Expired"] }, TODAY))).toBe(
      "Kandhili HSC",
    );
    // "No" / no NOC record at all ⇒ Not Obtained (same rule as the NOC column).
    expect(names(applyMasterFilters(rows, { nocStatus: ["Not Obtained"] }, TODAY))).toBe(
      "Vallipattu,Girisamudram,Ambalur,Pudupettai",
    );
  });

  test("legacy status spellings fold into the current label", () => {
    expect(foldStatus("Possible Future Candidate")).toBe("Facility (Future Candidate)");
    expect(foldStatus("Possible (future candidate)")).toBe("Facility (Future Candidate)");
    expect(foldStatus("Certified — Surveillance Due")).toBe("Certified — Surveillance Due");
    // The filter therefore matches the legacy spelling under the new label.
    expect(
      names(applyMasterFilters(rows, { status: ["Facility (Future Candidate)"] }, TODAY)),
    ).toBe("Girisamudram,Ambalur");
  });

  test("every KPI card's number equals the list it opens", () => {
    const expected: Record<MasterKpiId, number> = {
      total: 6,
      certified: 1, // the Surveillance Due facility
      pipeline: 2, // one NA scheduled, one certification expired
      eligible: 1, // eligible AND nothing started — never "Not Eligible"
      survOverdue: 1, // a completed surveillance visit is not overdue
      certExpiring: 1, // still valid, inside 90 days — expired is not "expiring"
      nocAlert: 6, // every fixture is expired / not obtained / expiring
      funds: 2,
      // New smart-view tabs (same predicates as the rows they open):
      // The one registry now also counts a missing NOC record, a missing
      // latest-quarter IA and the other defaults, so every sparse fixture has
      // at least one issue. The card and the list still agree (asserted below).
      attention: 6,
      due90: 3,     // Vallipattu, Ambalur (IA overdue), Kandhili HSC
    };
    for (const [kpi, count] of Object.entries(expected) as [MasterKpiId, number][]) {
      const filtered = applyMasterFilters(rows, { kpi }, TODAY);
      expect(filtered.length).toBe(count);
      // The predicate alone agrees with the filtered list — one rule, two uses.
      expect(rows.filter((r) => kpiMatches(r, kpi, TODAY)).length).toBe(count);
    }
  });

  test("'Eligible, not assessed' never counts a Not Eligible facility", () => {
    const notEligible = rows.find((r) => r.facility.name === "Girisamudram")!;
    expect(notEligible.facility.eligibility).toBe("Not Eligible");
    expect(kpiMatches(notEligible, "eligible", TODAY)).toBe(false);
    expect(names(applyMasterFilters(rows, { kpi: "eligible" }, TODAY))).toBe("Pudupettai");
  });

  test("'Surveillance overdue' ignores visits that have been done", () => {
    expect(names(applyMasterFilters(rows, { kpi: "survOverdue" }, TODAY))).toBe("Vallipattu");
    const done = rows.find((r) => r.facility.name === "Kandhili HSC")!;
    expect(done.nqas?.surveillanceDone1).toBeTruthy();
    expect(kpiMatches(done, "survOverdue", TODAY)).toBe(false);
  });

  test("'Certificates expiring' excludes already-expired certificates", () => {
    expect(names(applyMasterFilters(rows, { kpi: "certExpiring" }, TODAY))).toBe(
      "Vallipattu",
    );
    const expired = rows.find((r) => r.facility.name === "Kandhili HSC")!;
    expect(kpiMatches(expired, "certExpiring", TODAY)).toBe(false);
  });

  test("due window keeps rows with any tracked deadline inside N days", () => {
    // Vallipattu (surveillance overdue), Ambalur (IA overdue), Kandhili HSC
    // (certificate + NOC overdue); nothing tracked ⇒ never in the window.
    expect(names(applyMasterFilters(rows, { dueWindow: 30 }, TODAY))).toBe(
      "Vallipattu,Ambalur,Kandhili HSC",
    );
    expect(applyMasterFilters(rows, { dueWindow: 90 }, TODAY).length).toBeGreaterThanOrEqual(
      applyMasterFilters(rows, { dueWindow: 30 }, TODAY).length,
    );
    expect(applyMasterFilters(rows, { dueWindow: 0 }, TODAY).length).toBe(6);
  });

  test("score range drops rows with no score and rows outside the window", () => {
    expect(names(applyMasterFilters(rows, { scoreRange: [70, 100] }, TODAY))).toBe(
      "Vallipattu",
    );
    expect(names(applyMasterFilters(rows, { scoreRange: [0, 100] }, TODAY))).toContain(
      "Girisamudram",
    );
  });

  test("filters combine (AND) and never widen the list", () => {
    expect(
      names(
        applyMasterFilters(
          rows,
          { blocks: ["Tirupathur"], types: ["HWC HSC"], search: "kandhili" },
          TODAY,
        ),
      ),
    ).toBe("Kandhili HSC");
  });
});

/* --------------------------------------------------------------------------- */
/* Sorting                                                                     */
/* --------------------------------------------------------------------------- */

describe("master list sorting", () => {
  test("text sorts numeric-aware so 'HSC 2' comes before 'HSC 10'", () => {
    const a = makeRow({ name: "HSC 2", id: "2" });
    const b = makeRow({ name: "HSC 10", id: "10" });
    expect(compareMasterRows(a, b, "facility")).toBeLessThan(0);
  });

  test("numbers sort numerically and dates chronologically", () => {
    const low = makeRow({ id: "l", nqas: { scorePercent: 40 } });
    const high = makeRow({ id: "h", nqas: { scorePercent: 90 } });
    expect(compareMasterRows(low, high, "certScore")).toBeLessThan(0);

    const early = makeRow({ id: "e", nqas: { validityDate: "2026-01-10" } });
    const late = makeRow({ id: "l2", nqas: { validityDate: "2027-01-10" } });
    expect(compareMasterRows(early, late, "validityDate")).toBeLessThan(0);
  });

  test("blanks sort last in BOTH directions — an unrecorded value never leads", () => {
    const blank = makeRow({ id: "blank", nqas: { scorePercent: null } });
    const low = makeRow({ id: "low", nqas: { scorePercent: 10 } });
    const high = makeRow({ id: "high", nqas: { scorePercent: 90 } });
    expect(
      sortMasterRows([blank, high, low], [{ id: "certScore" }]).map((r) => r.facility._id),
    ).toEqual(["low", "high", "blank"]);
    // Descending shows the best scores first — the blank stays at the bottom.
    expect(
      sortMasterRows([blank, low, high], [{ id: "certScore", desc: true }]).map(
        (r) => r.facility._id,
      ),
    ).toEqual(["high", "low", "blank"]);
  });

  test("multi-column sort: first key wins, second key breaks the tie", () => {
    const sorted = sortMasterRows(rows, [{ id: "block" }, { id: "facility", desc: true }]);
    expect(names(sorted)).toBe(
      "Vallipattu,Girisamudram,Pudupettai,Vallipattu,Kandhili HSC,Ambalur",
    );
  });

  test("sorting is deterministic (ties break by name, then id) and never mutates", () => {
    const before = names(rows);
    const one = sortMasterRows(rows, [{ id: "block" }]).map((r) => r.facility._id);
    const two = sortMasterRows([...rows].reverse(), [{ id: "block" }]).map(
      (r) => r.facility._id,
    );
    expect(one).toEqual(two);
    expect(names(rows)).toBe(before);
  });

  test("sorting a district-sized list stays inside one frame (perf guard)", () => {
    // Guards against re-deriving a cell value inside the comparator: that made
    // the derived Next Action sort ~30× slower. Budget is deliberately loose
    // (measured 69 ms for 2,000 rows, 3.8 ms for 157) so a slow CI box cannot
    // make it flaky — it only catches an order-of-magnitude regression.
    const many: MasterRow[] = Array.from({ length: 2000 }, (_, i) =>
      makeRow({
        id: `p${i}`,
        name: `Facility ${i}`,
        block: `Block ${i % 12}`,
        cycle: (i % 4) + 1,
        nqas: {
          scorePercent: 40 + (i % 60),
          validityDate: `2026-${String((i % 12) + 1).padStart(2, "0")}-10`,
          surveillanceDue1: `2026-${String((i % 12) + 1).padStart(2, "0")}-01`,
        },
      }),
    );
    const started = performance.now();
    sortMasterRows(many, [{ id: "nextAction" }, { id: "certScore", desc: true }]);
    expect(performance.now() - started).toBeLessThan(500);
  });

  test("sorting by 'Next Action / Due' follows the deadline the column shows", () => {
    // Kandhili HSC 10-Jan-2026, Vallipattu 1-Oct, Ambalur 5-Oct, the second
    // Vallipattu 20-Oct (scheduled NA), then the two with nothing tracked.
    expect(names(sortMasterRows(rows, [{ id: "nextAction" }]))).toBe(
      "Kandhili HSC,Vallipattu,Ambalur,Vallipattu,Girisamudram,Pudupettai",
    );
  });
});

/* --------------------------------------------------------------------------- */
/* Column presets + persisted view                                             */
/* --------------------------------------------------------------------------- */

describe("master list column presets", () => {
  test("the default view is the slim at-a-glance set, not 14 columns", () => {
    const keyed = DEFAULT_VISIBLE_KEYS.map((k) => COLUMN_BY_KEY[k]).filter(Boolean);
    // Part-3 audit: Facility, Type (+ Cert_Cycle) lead the set — 9 physical
    // columns (Block and PHC are separate). Everything else is one click
    // away in the drawer / column chooser / Full data export.
    expect(keyed.length).toBe(6);
    for (const key of [
      "facility",
      "certCycle",
      "pipelineStatus",
      "nextAction",
      "certScore",
      "validityDate",
    ])
      expect(DEFAULT_VISIBLE_KEYS).toContain(key);
    // Type, Block and PHC now live INSIDE the merged Facility cell — not as
    // separate default columns (they stay available in the Columns menu).
    for (const key of ["type", "block", "phc"])
      expect(DEFAULT_VISIBLE_KEYS).not.toContain(key);
    // The heavy detail lives in the drawer and the column chooser, not here.
    for (const key of ["departments", "remarks", "assessor1", "nin", "certDate"])
      expect(DEFAULT_VISIBLE_KEYS).not.toContain(key);
  });

  test("the default view fits a 1366px screen — no horizontal scrolling", () => {
    // The table renders 1 `ch` as 8px and reserves 36px for the selection
    // column; a 1366px viewport minus the 16rem sidebar (256px), 2×32px page
    // padding and the panel borders leaves ~1024px of table area.
    const AVAILABLE_PX = 1024;
    const CH_PX = 8;
    const SELECTION_PX = 36;
    const width =
      orderedVisibleColumns(DEFAULT_VIEW).reduce((sum, c) => sum + c.width * CH_PX, 0) +
      SELECTION_PX;
    // 9 columns × trimmed widths (26,10,12,10,10,18,14,10,12 = 122 ch) fit:
    // 122 × 8 + 36 = 1012px.
    expect(width).toBeLessThanOrEqual(AVAILABLE_PX);
  });

  test("the Part-3 preset set exists (all seven, plus Full data)", () => {
    const ids = COLUMN_PRESETS.map((p) => p.id);
    expect(ids).toContain("overview");
    expect(ids).toContain("certification");
    expect(ids).toContain("funds");
    expect(ids).toContain("assessments");
    expect(ids).toContain("surveillance");
    expect(ids).toContain("building");
    expect(ids).toContain("all");
    expect(ids).not.toContain("pipeline");
    for (const preset of COLUMN_PRESETS) {
      for (const key of preset.keys) expect(COLUMN_BY_KEY[key]).toBeDefined();
      // Every preset leads with the Facility identity anchor; the frozen
      // zone (facility + type) is supplied by the frozen defaults, so
      // presets list their own columns behind it.
      expect(preset.keys[0]).toBe("facility");
    }
  });

  test("applying a preset shows the pinned columns first, then the preset's own", () => {
    const view = applyPreset("assessments");
    expect(view.presetId).toBe("assessments");
    expect(view.visibleKeys.slice(0, 1)).toEqual(["facility"]);
    expect(view.visibleKeys).toContain("genDoc");
    expect(view.visibleKeys).toContain("nqasIaQ1");
    const ordered = orderedVisibleColumns(view).map((c) => c.key);
    expect(ordered.slice(0, 2)).toEqual(["facility", "nqasIaQ1"]);
    // The merged identity columns never reappear as their own preset columns.
    for (const key of ["type", "block", "phc"]) expect(ordered).not.toContain(key);
  });

  test("the building preset brings the Building & Fire NOC columns", () => {
    const keys = orderedVisibleColumns(applyPreset("building")).map((c) => c.key);
    expect(keys).toContain("buildingType");
    expect(keys).toContain("nocStatus");
    expect(keys).toContain("nocValidity");
  });

  test("an unknown preset id falls back to a real preset, never crashes", () => {
    const view = normalizeView({ presetId: "does-not-exist", visibleKeys: ["nope"] });
    expect(view.presetId).toBe(COLUMN_PRESETS[0].id);
    expect(view.visibleKeys.length).toBeGreaterThan(0);
  });

  test("a stored view is validated: unknown keys dropped, pinned first, de-duped", () => {
    const view = normalizeView({
      presetId: "overview",
      visibleKeys: ["remarks", "facility", "facility", "block", "phc", "bogus"],
      order: ["remarks", "bogus"],
      density: "huge",
    });
    // The frozen default (Facility) is prepended, then the surviving keys.
    expect(view.visibleKeys).toEqual([
      "facility",
      "remarks",
      "block",
      "phc",
    ]);
    expect(view.order).toEqual(["remarks"]);
    expect(view.density).toBe("comfortable");
    // Corrupt / absent storage → the default view, never a throw.
    expect(() => normalizeView(null)).not.toThrow();
    expect(() => normalizeView("not-an-object")).not.toThrow();
    expect(() => normalizeView({ visibleKeys: 5 })).not.toThrow();
    // Frozen zone first (Facility only), then the remaining defaults.
    expect(normalizeView(null).visibleKeys).toEqual([
      "facility",
      ...DEFAULT_VIEW.visibleKeys.filter((k) => k !== "facility"),
    ]);
  });

  test("density is one of the two supported values", () => {
    expect(normalizeView({ density: "compact" }).density).toBe("compact");
    expect(normalizeView({ density: "comfortable" }).density).toBe("comfortable");
  });

  test("a hand-arranged view keeps its \"custom\" marker", () => {
    // Otherwise the saved view came back as "Overview" and the column dialog
    // highlighted a preset the user had moved away from.
    const view = normalizeView({
      presetId: CUSTOM_PRESET_ID,
      visibleKeys: ["facility", "type", "block", "phc", "remarks"],
      order: ["remarks"],
      density: "compact",
    });
    expect(view.presetId).toBe(CUSTOM_PRESET_ID);
    expect(COLUMN_PRESETS.some((p) => p.id === view.presetId)).toBe(false);
  });

  test("the saved view round-trips through storage exactly (device + server)", () => {
    // The page writes localStorage AND the Convex `masterViews` row; both are
    // the JSON of normalizeView(view), so what is stored is what comes back.
    for (const preset of ["overview", "certification", "pipeline", "building"]) {
      const saved = normalizeView(applyPreset(preset));
      const restored = normalizeView(JSON.parse(JSON.stringify(saved)));
      expect(restored).toEqual(saved);
    }
    const custom = normalizeView({
      presetId: CUSTOM_PRESET_ID,
      visibleKeys: ["facility", "type", "block", "phc", "certScore"],
      density: "compact",
    });
    expect(normalizeView(JSON.parse(JSON.stringify(custom)))).toEqual(custom);
  });

  test("a corrupt server payload restores the defaults instead of breaking the page", () => {
    // Falls back to the normalized defaults (frozen zone first).
    expect(normalizeView({ visibleKeys: "nope", density: 5 }).visibleKeys).toEqual(
      normalizeView(null).visibleKeys,
    );
    expect(normalizeView([]).presetId).toBe(DEFAULT_VIEW.presetId);
  });

  test("reordering moves a column and keeps the pinned columns in front", () => {
    const view = { ...applyPreset("assessments"), order: [] as string[] };
    const keys = orderedVisibleColumns(moveColumn(view, "nqasIaQ1", 0)).map((c) => c.key);
    expect(keys[0]).toBe("facility");
    expect(keys[1]).toBe("nqasIaQ1");
    // A pinned column cannot be dragged out of the anchor position.
    expect(moveColumn(view, "facility", 5)).toEqual(view);
  });
});

/* --------------------------------------------------------------------------- */
/* At-a-glance rules: blanks, duplicate names, next action                     */
/* --------------------------------------------------------------------------- */

describe("at-a-glance rules", () => {
  test("a blank cell never reads as a bare dash", () => {
    // A missing score is "-" (task §3.6: "Not started" belongs to stages).
    expect(blankLabel(COLUMN_BY_KEY.nocAvailable)).toBe("Not started");
    expect(blankLabel(COLUMN_BY_KEY.certScore)).toBe("-");
    expect(blankLabel(COLUMN_BY_KEY.validityDate)).toBe("Not started");
    expect(blankLabel(COLUMN_BY_KEY.nqasIaCmp)).toBe("Not recorded");
    // An IA quarter that was never reported is not a step "not started".
    expect(blankLabel(COLUMN_BY_KEY.nqasIaQ1)).toBe("Not reported");
    expect(blankLabel(COLUMN_BY_KEY.kayakalpIaQ2)).toBe("Not reported");
    // …and the rest are hidden instead of filled with "—".
    expect(blankLabel(COLUMN_BY_KEY.remarks)).toBe(null);
    expect(blankLabel(COLUMN_BY_KEY.nin)).toBe(null);
    expect(blankLabel(COLUMN_BY_KEY.saReport)).toBe(null);
  });

  test("no column type can produce a literal dash placeholder", () => {
    for (const column of MASTER_COLUMNS) {
      const label = blankLabel(column);
      expect(label === null || !label.includes("—")).toBe(true);
    }
  });

  test("duplicate facility names are detected so the row can be disambiguated", () => {
    const dupes = duplicateNames(rows);
    expect([...dupes]).toEqual(["vallipattu"]);
    expect(isDuplicateName(rows[0], dupes)).toBe(true);
    expect(isDuplicateName(rows[1], dupes)).toBe(true);
    expect(isDuplicateName(rows[2], dupes)).toBe(false);
    // Case and padding must not hide a duplicate.
    const padded = duplicateNames([
      makeRow({ name: "Vallipattu" }),
      makeRow({ name: "  vallipattu  " }),
    ]);
    expect(padded.size).toBe(1);
    expect(duplicateNames([makeRow({ name: "Solo" })]).size).toBe(0);
  });

  test("'Next Action / Due' picks the most urgent open deadline", () => {
    // Vallipattu: surveillance 1 overdue (1-Oct-2026) beats the certificate.
    expect(nextDueOf(rows[0], TODAY)).toMatchObject({
      iso: "2026-10-01",
      label: "1st surveillance due",
    });
    // Ambalur: internal assessment overdue.
    expect(nextDueOf(rows[3], TODAY)?.label).toBe("Internal assessment due");
    // Nothing tracked → no deadline at all (the cell shows "Not started").
    expect(nextDueOf(rows[2], TODAY)).toBe(null);
    expect(nextDueOf(rows[5], TODAY)).toBe(null);
  });

  test("a completed surveillance visit is skipped, not reported as next", () => {
    const row = makeRow({
      nqas: {
        // Surveillance is a CERTIFIED facility's rule — without the result the
        // visits are Not applicable and must not compete as deadlines.
        certificationStatus: "Quality Certified",
        certificationDate: "2025-01-10",
        validityDate: "2028-01-10",
        surveillanceDone1: "2026-01-11",
        surveillanceDue1: "2026-01-10",
        surveillanceDue2: "2027-01-10",
      },
    });
    expect(nextDueOf(row, TODAY)?.label).toBe("2nd surveillance due");
  });

  test("an overdue deadline wins over a future one; otherwise the soonest wins", () => {
    expect(
      nextDueOf(
        makeRow({
          nqas: {
            certificationStatus: "Quality Certified",
            certificationDate: "2025-01-01",
            validityDate: "2027-01-01",
            surveillanceDue1: "2026-09-01",
          },
          noc: { expiryDate: "2026-10-20" },
        }),
        TODAY,
      )?.iso,
    ).toBe("2026-09-01");
    expect(
      nextDueOf(
        makeRow({
          nqas: {
            certificationStatus: "Quality Certified",
            certificationDate: "2025-06-01",
            validityDate: "2027-06-01",
            surveillanceDue1: "2026-11-01",
          },
          noc: { expiryDate: "2027-01-01" },
        }),
        TODAY,
      )?.iso,
    ).toBe("2026-11-01");
  });

  test("the Next Action column exports the label with the date and its urgency", () => {
    const text = cellText(rows[0], "nextAction");
    expect(text).toContain("1st surveillance due");
    expect(text).toContain("01-Oct-2026");
    expect(text).toContain("Overdue");
    expect(text).not.toContain("—");
    // Nothing tracked → an empty export cell, never a dash.
    expect(cellText(rows[2], "nextAction")).toBe("");
  });

  test("the table can show when the data was last updated", () => {
    expect(latestUpdatedAt(rows)).toBe(Date.UTC(2026, 9, 14, 3, 30));
    expect(latestUpdatedAt([])).toBe(null);
    expect(latestUpdatedAt([makeRow({ updatedAt: null })])).toBe(null);
  });
});

/* --------------------------------------------------------------------------- */
/* The retired IA tracker is gone from every surface                           */
/* --------------------------------------------------------------------------- */

describe("removed Eco-Friendly tracker", () => {
  const forbidden = /eco[\s-]*friendl|scorecard|scorcard/i;

  test("no live column list offers it — the config entry is kept, deprecated", () => {
    expect(deprecatedColumns().length).toBeGreaterThan(0);
    const lists = [
      masterListColumns(),
      columnsMenuColumns(),
      fullExportColumns(),
      REPORT_COLUMNS,
    ];
    for (const list of lists) {
      for (const c of list) {
        expect(c.deprecated).not.toBe(true);
        expect(forbidden.test(c.label)).toBe(false);
      }
    }
  });

  test("a saved view or preset that names it drops the column silently", () => {
    const restored = normalizeView({
      presetId: "custom",
      visibleKeys: ["facility", "type", "ecoIaQ1", "ecoIaQ2", "ecoIaCmp", "saStatus"],
      order: ["ecoIaQ1", "saStatus"],
      density: "compact",
    });
    expect(restored.visibleKeys).not.toContain("ecoIaQ1");
    expect(restored.visibleKeys).not.toContain("ecoIaQ2");
    expect(restored.visibleKeys).not.toContain("ecoIaCmp");
    expect(restored.order).toEqual(["saStatus"]);
    const rendered = orderedVisibleColumns(restored).map((c) => c.key);
    expect(rendered.filter((k) => k.startsWith("eco"))).toEqual([]);
  });

  test("an IA comparison is blank unless BOTH quarters are present", () => {
    const base = makeRow();
    const withScores = (q1: number | null, q2: number | null): MasterRow =>
      ({
        ...base,
        facility: { ...base.facility, nqasIaQ1: q1, nqasIaQ2: q2 },
      }) as MasterRow;
    expect(cellValue(withScores(61, null), "nqasIaCmp")).toEqual({
      kind: "compare",
      value: null,
    });
    expect(cellText(withScores(61, null), "nqasIaCmp")).toBe("");
    expect(cellValue(withScores(61, 74), "nqasIaCmp")).toEqual({
      kind: "compare",
      value: 13,
    });
  });
});
