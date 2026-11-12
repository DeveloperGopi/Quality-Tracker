/**
 * LINE LISTS — unit tests for the temaplate config, the shared predicates,
 * the filter operators, grouping/subtotals and the summary reconciliation.
 *
 * These are the pure rules the screen AND the exports read, so a bug here is a
 * bug in Excel/PDF/CSV too. The counts are asserted against hand-built rows —
 * never against a second implementation.
 */

import { describe, expect, it } from "bun:test";

import {
  COLUMN_BY_KEY,
  MASTER_COLUMNS,
  type MasterRow,
} from "@/lib/masterColumns";
import {
  applyLineListFilters,
  buildLineListSummary,
  clauseMatches,
  clausesMatch,
  galleryCounts,
  groupLineListRows,
  lineListIssueRows,
  sortLineListRows,
  sumText,
  testRow,
} from "@/lib/lineListEngine";
import {
  LINE_LIST_TEMPLATES,
  lineListTemplate,
  newLineListDefinition,
  type LineListDefinition,
} from "@/lib/lineListTemplates";
import { lineListFileBase } from "@/lib/lineListExport";
import { BUILDING_BUCKET_ORDER } from "@/lib/buildingBuckets";

const TODAY = "2026-10-27";

function row(partial: Partial<MasterRow> & { name?: string } = {}): MasterRow {
  const base: MasterRow = {
    facility: {
      _id: partial.name ?? "f1",
      name: partial.name ?? "PHC One",
      block: "Alangayam",
      phc: "Alangayam",
      facilityType: "PHC",
      ninNumber: null,
      eligibility: "Eligible",
      currentStatus: "SA Completed — NQAS Awaited",
      remarks: null,
    },
    cycleNumber: 1,
    cycleType: "Initial",
    sa: { status: "Completed", actualStartDate: "2026-01-05", actualEndDate: "2026-01-09" },
    nqas: {
      certificationStatus: "Quality Certified",
      certificationDate: "2026-03-01",
      validityDate: "2029-02-28",
      scorePercent: 82,
      surveillanceDue1: "2027-02-28",
      surveillanceDone1: null,
      surveillanceDue2: "2028-02-28",
      surveillanceDone2: null,
      recertYear: "2029",
    },
    fund: { amountSanctioned: 250000, financialYear: "2025-26", procLink: null, status: null },
    noc: {
      nocAvailable: "Yes",
      status: null,
      issuedDate: "2025-11-01",
      expiryDate: "2026-10-30",
      nocLink: "https://example.org/noc.pdf",
      nocAttachmentId: null,
      nocAttachmentName: null,
    },
    building: { buildingType: "Pucca", buildingStatus: "Good", condemnedLink: null },
    docs: { uploaded: 3, total: 6, keys: ["NOC"], requiredMissing: null },
  };
  return {
    ...base,
    ...partial,
    facility: { ...base.facility, ...(partial.facility ?? {}) },
    sa: { ...base.sa, ...(partial.sa ?? {}) },
    nqas: { ...base.nqas, ...(partial.nqas ?? {}) },
    fund: { ...base.fund, ...(partial.fund ?? {}) },
    noc: { ...base.noc, ...(partial.noc ?? {}) },
    building: { ...base.building, ...(partial.building ?? {}) },
  };
}

const def = (templateId: string, over: Partial<LineListDefinition> = {}) =>
  newLineListDefinition(templateId, over);

/* --------------------------------------------------------------------------- */

describe("line list templates", () => {
  it("has a unique id and a real column for every template", () => {
    const ids = LINE_LIST_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(11);
    for (const t of LINE_LIST_TEMPLATES) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.tagline.length).toBeGreaterThan(0);
      expect(t.columns.length).toBeGreaterThan(2);
      for (const key of t.columns) {
        expect(COLUMN_BY_KEY[key], `${t.id}: ${key}`).toBeTruthy();
        expect(MASTER_COLUMNS.some((c) => c.key === key)).toBe(true);
      }
      for (const s of t.summary) {
        const column = s.kind === "kpi" ? null : s.kind === "sum" ? s.amount : s.column;
        if (column) expect(COLUMN_BY_KEY[column], `${t.id}: ${column}`).toBeTruthy();
        if (s.kind === "sum" && s.by) expect(COLUMN_BY_KEY[s.by]).toBeTruthy();
      }
      for (const sort of t.defaultSort) expect(COLUMN_BY_KEY[sort.id]).toBeTruthy();
    }
  });

  it("keeps the quick-filter predicates resolvable (fail-open on unknown ids)", () => {
    const r = row();
    for (const t of LINE_LIST_TEMPLATES) {
      for (const q of t.quickFilters) {
        expect(typeof testRow(r, q.test, TODAY)).toBe("boolean");
      }
    }
    // A stale saved filter must never hide rows.
    expect(testRow(r, "unknown.predicate:whatever", TODAY)).toBe(true);
  });

  it("opens the custom template from identity columns only", () => {
    const t = lineListTemplate("custom");
    expect(t.columns).toContain("facility");
    expect(t.columns).toContain("type");
    expect(t.quickFilters.length).toBe(0);
  });
});

/* --------------------------------------------------------------------------- */

describe("Fire NOC buckets reconcile", () => {
  const rows: MasterRow[] = [
    row({ name: "a", noc: { status: null, expiryDate: "2026-01-01", nocAvailable: "Yes" } }), // expired
    row({ name: "b", noc: { status: null, expiryDate: "2026-11-20", nocAvailable: "Yes" } }), // expiring
    row({ name: "c", noc: { status: null, expiryDate: "2028-01-01", nocAvailable: "Yes" } }), // valid
    row({ name: "d", noc: { status: null, expiryDate: null, nocAvailable: "Yes" } }), // no validity date
    row({
      name: "e",
      noc: {
        status: null,
        expiryDate: null,
        issuedDate: null,
        nocLink: null,
        nocAvailable: null,
      },
    }), // not recorded
  ];

  it("counts expired / expiring / recorded-without-date / not recorded", () => {
    expect(rows.filter((r) => testRow(r, "noc.status:Expired", TODAY)).length).toBe(1);
    expect(rows.filter((r) => testRow(r, "noc.expiring:90", TODAY)).length).toBe(1);
    expect(rows.filter((r) => testRow(r, "noc.noValidity", TODAY)).length).toBe(1);
    expect(rows.filter((r) => testRow(r, "noc.notRecorded", TODAY)).length).toBe(1);
  });

  it("the template's five statuses cover every row exactly once", () => {
    const buckets = rows.map((r) => {
      if (!testRow(r, "noc.notRecorded", TODAY) && !testRow(r, "noc.noValidity", TODAY)) {
        return testRow(r, "noc.status:Expired", TODAY)
          ? "Expired"
          : testRow(r, "noc.expiring:90", TODAY)
            ? "Expiring"
            : "Valid";
      }
      return testRow(r, "noc.notRecorded", TODAY) ? "Not recorded" : "No validity date";
    });
    expect(buckets.length).toBe(rows.length);
    expect(new Set(buckets).size).toBe(5);
  });
});

/* --------------------------------------------------------------------------- */

describe("building buckets use the shared mapping", () => {
  it("maps every stored spelling into one of the shared buckets", () => {
    const rows = [
      row({ building: { buildingStatus: "Dilapidated" } }),
      row({ building: { buildingStatus: "Major M&R works" } }),
      row({ building: { buildingStatus: "" } }),
      row({ building: { buildingStatus: "Something odd" } }),
    ];
    expect(rows.filter((r) => testRow(r, "building.bucket:Dilapidated", TODAY)).length).toBe(1);
    expect(rows.filter((r) => testRow(r, "building.repair", TODAY)).length).toBe(1);
    expect(rows.filter((r) => testRow(r, "building.bucket:No record", TODAY)).length).toBe(1);
    expect(rows.filter((r) => testRow(r, "building.bucket:Other", TODAY)).length).toBe(1);
    // Every row lands in exactly one shared bucket: querying each bucket in
    // the shared order accounts for all of them exactly once.
    const bucketTotal = BUILDING_BUCKET_ORDER.reduce(
      (n, b) => n + rows.filter((r) => testRow(r, `building.bucket:${b}`, TODAY)).length,
      0,
    );
    expect(bucketTotal).toBe(rows.length);
  });
});

/* --------------------------------------------------------------------------- */

describe("Gap Closure totals", () => {
  it("sums the sanctioned amount exactly (and never counts a blank as 0)", () => {
    const rows = [
      row({ fund: { amountSanctioned: 120000, financialYear: "2024-25", procLink: null, status: null } }),
      row({ fund: { amountSanctioned: 80000, financialYear: "2025-26", procLink: null, status: null } }),
      row({ fund: { amountSanctioned: null, financialYear: null, procLink: null, status: null } }),
    ];
    const t = lineListTemplate("gapfund");
    const summary = buildLineListSummary(rows, t, TODAY);
    const total = summary.sums.find((s) => s.amount !== undefined && s.id === "gapTotal");
    expect(total?.amount).toBe(200000);
    expect(sumText(total?.amount ?? 0, rows.length)).toBe("₹ 2,00,000");
    expect(rows.filter((r) => testRow(r, "gap.hasAmount", TODAY)).length).toBe(2);
    expect(rows.filter((r) => testRow(r, "gap.noAmount", TODAY)).length).toBe(1);
  });
});

/* --------------------------------------------------------------------------- */

describe("filter operators", () => {
  const r = row({
    name: "Alpha PHC",
    facility: { remarks: "Needs painting" },
    funding: undefined,
  } as never);
  const withDate = row({ noc: { expiryDate: "2026-11-15" } });

  const clause = (op: never, value: string, value2?: string) => ({
    id: "c1",
    key: "facility",
    op,
    value,
    value2,
  });

  it("is / is not / in / contains", () => {
    expect(clauseMatches(r, clause("is" as never, "Alpha PHC"))).toBe(true);
    expect(clauseMatches(r, clause("is" as never, "alpha phc"))).toBe(true);
    expect(clauseMatches(r, clause("isNot" as never, "Beta"))).toBe(true);
    expect(clauseMatches(r, clause("in" as never, "Alpha PHC, Beta"))).toBe(true);
    expect(clauseMatches(r, clause("in" as never, "Beta, Gamma"))).toBe(false);
    expect(clauseMatches(r, clause("contains" as never, "alpha"))).toBe(true);
  });

  it("before / after / between on dates", () => {
    const before = { id: "c", key: "nocValidity", op: "before" as never, value: "2026-12-01" };
    const after = { id: "c", key: "nocValidity", op: "after" as never, value: "2026-10-01" };
    const between = {
      id: "c",
      key: "nocValidity",
      op: "between" as never,
      value: "2026-10-01",
      value2: "2026-12-31",
    };
    expect(clauseMatches(withDate, before)).toBe(true);
    expect(clauseMatches(withDate, after)).toBe(true);
    expect(clauseMatches(withDate, between)).toBe(true);
    expect(clauseMatches(withDate, { ...between, value: "2026-12-01" })).toBe(false);
  });

  it("is empty / is not empty treat a blank as '-'", () => {
    const blank = row({ facility: { remarks: null } });
    expect(clauseMatches(blank, { id: "c", key: "remarks", op: "isEmpty" as never, value: "" })).toBe(true);
    expect(clauseMatches(r, { id: "c", key: "remarks", op: "isNotEmpty" as never, value: "" })).toBe(true);
  });

  it("AND applies across clauses and ANY joins the OR group", () => {
    const d: LineListDefinition = def("custom", {
      and: [{ id: "a", key: "type", op: "is", value: "PHC" }],
      or: [
        { id: "b", key: "block", op: "is", value: "Nowhere" },
        { id: "c", key: "block", op: "is", value: "Alangayam" },
      ],
    });
    expect(clausesMatch(r, d)).toBe(true);
    expect(clausesMatch(r, { ...d, and: [{ id: "a", key: "type", op: "is", value: "CHC" }] })).toBe(false);
    expect(
      clausesMatch(r, {
        ...d,
        or: [{ id: "b", key: "block", op: "is", value: "Nowhere" }],
      }),
    ).toBe(false);
  });
});

/* --------------------------------------------------------------------------- */

describe("the one filter chain and grouping", () => {
  const rows = [
    row({ name: "a", facility: { block: "A", facilityType: "PHC" }, fund: { amountSanctioned: 100 } }),
    row({ name: "b", facility: { block: "A", facilityType: "CHC" }, fund: { amountSanctioned: 250 } }),
    row({ name: "c", facility: { block: "B", facilityType: "PHC" }, fund: { amountSanctioned: 50 } }),
  ];

  it("filters by scope, quick filter and clauses", () => {
    const d = def("gapfund", { blocks: ["A"] });
    expect(applyLineListFilters(rows, d, lineListTemplate("gapfund"), TODAY).length).toBe(2);
    const quick = def("firenoc", { quick: ["expired"] });
    expect(applyLineListFilters(rows, quick, lineListTemplate("firenoc"), TODAY).length).toBe(0);
  });

  it("groups with a count and a ₹ subtotal that adds up", () => {
    const groups = groupLineListRows(rows, "block", ["facility", "gapAmount"]);
    expect(groups.map((g) => g.label)).toEqual(["A", "B"]);
    expect(groups[0].count).toBe(2);
    expect(groups[0].sums[0].amount).toBe(350);
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(rows.length);
    expect(groups.reduce((n, g) => n + g.sums[0].amount, 0)).toBe(400);
  });

  it("sorts by a column in both directions", () => {
    const asc = sortLineListRows(rows, [{ id: "gapAmount", desc: false }]);
    expect(asc.map((r) => r.fund?.amountSanctioned)).toEqual([50, 100, 250]);
    const desc = sortLineListRows(rows, [{ id: "gapAmount", desc: true }]);
    expect(desc.map((r) => r.fund?.amountSanctioned)).toEqual([250, 100, 50]);
  });
});

/* --------------------------------------------------------------------------- */

describe("summary reconciles with the list", () => {
  const rows = [
    row({ name: "a" }),
    row({ name: "b", nqas: { validityDate: "2026-11-15" } }),
    row({ name: "c", noc: { expiryDate: "2026-01-01" } }),
  ];

  it("keeps every breakdown total equal to the list length", () => {
    for (const t of LINE_LIST_TEMPLATES) {
      const summary = buildLineListSummary(rows, t, TODAY);
      expect(summary.total).toBe(rows.length);
      for (const b of summary.breakdowns) {
        expect(b.items.reduce((n, i) => n + i.count, 0)).toBe(rows.length);
      }
      for (const k of summary.kpis) expect(k.value).toBeLessThanOrEqual(rows.length);
      expect(summary.expiry.length).toBeGreaterThanOrEqual(0);
    }
  });

  it("gallery counts never exceed the facility count", () => {
    for (const t of LINE_LIST_TEMPLATES) {
      for (const c of galleryCounts(rows, t, TODAY)) {
        expect(c.count).toBeLessThanOrEqual(rows.length);
        expect(c.count).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("an empty list shows '-' for money, never ₹0", () => {
    expect(sumText(0, 0)).toBe("-");
  });
});

/* --------------------------------------------------------------------------- */

describe("needs attention rows", () => {
  it("produces one row per issue, copying the facility identity", () => {
    const rows = [
      row({
        name: "expired and missing docs",
        nqas: { certificationStatus: "Quality Certified", validityDate: "2025-01-01" },
        docs: {
          uploaded: 0,
          total: 6,
          keys: [],
          requiredMissing: [{ key: "NOC", label: "Fire NOC", blocking: true }],
        },
      }),
    ];
    const issues = lineListIssueRows(rows, TODAY);
    expect(issues.length).toBeGreaterThanOrEqual(2);
    for (const i of issues) {
      expect(i.row.facility.name).toBe("expired and missing docs");
      expect(i.row.facility.remarks?.length).toBeGreaterThan(10);
    }
  });
});

/* --------------------------------------------------------------------------- */

describe("file names", () => {
  it("is '{District} {Topic} Line List {DD-MMM-YYYY}' with an optional block", () => {
    expect(
      lineListFileBase({ district: "Tirupathur", topic: "Fire NOC", date: "27-Oct-2026" }),
    ).toBe("Tirupathur Fire NOC Line List 27-Oct-2026");
    expect(
      lineListFileBase({
        district: "Tirupathur",
        topic: "Fire NOC",
        date: "27-Oct-2026",
        singleBlock: "Alangayam",
      }),
    ).toBe("Tirupathur Fire NOC Line List 27-Oct-2026 - Alangayam");
  });

  it("strips path separators and control characters", () => {
    expect(lineListFileBase({ district: "A/B", topic: "C:D", date: "27-Oct-2026" })).toBe(
      "A B C D Line List 27-Oct-2026",
    );
  });
});
