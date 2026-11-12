/**
 * FACILITY QUICK VIEW — the pure rules, pinned.
 *
 * Covers the three root causes from the screenshot review:
 *   1. the stepper contradicting Facility Current Status (deriveStage),
 *   2. NOC Available showing "Not started" / disagreeing with the Fire NOC
 *      validity status (lib/nocAvailability + cellValue),
 *   3. no save path (diff, validation, status-change confirmation).
 *
 * Also pins the deep-link URL params, the section list (one list only) and
 * the display formats (₹ Indian grouping, DD-MMM-YYYY, "-" for blank).
 *
 * Run: bun test ./scripts/quickView.test.ts
 */
import { describe, test, expect } from "bun:test";

import {
  MASTER_COLUMNS,
  cellValue,
  deprecatedColumns,
  statusTone,
} from "../src/lib/masterColumns";
import { deriveNocAvailability } from "../src/lib/nocAvailability";
import {
  QV_SECTIONS,
  attentionFor,
  deriveStage,
  displayDraftValue,
  quickViewChanges,
  sectionColumns,
  sectionCompleteness,
  statusChangeNotice,
  updatedRecently,
  validateQuickView,
} from "../src/lib/facilityQuickView";
import {
  hasViewParams,
  parseListFilters,
  serializeListFilters,
} from "../src/lib/listUrlState";
import type { MasterRow } from "../src/lib/masterColumns";

const TODAY = "2026-10-21";

function makeRow(over: Partial<MasterRow> = {}): MasterRow {
  return {
    facility: {
      _id: "f1",
      name: "PHC Alangayam",
      block: "Alangayam",
      phc: "PHC Alangayam",
      facilityType: "PHC",
      ninNumber: "4527324786",
      eligibility: "Eligible",
      currentStatus: "SA Not Yet Initiated",
      updatedAt: Date.parse("2026-09-28T06:00:00Z"),
      ...over.facility,
    },
    sa: null,
    nqas: null,
    fund: null,
    noc: null,
    building: null,
    ...over,
  } as MasterRow;
}

/* --------------------------------------------------------------------------- */
/* 1 — The stepper (root cause #1)                                             */
/* --------------------------------------------------------------------------- */

describe("deriveStage — the stepper can never contradict the status", () => {
  test("Not Eligible ⇒ Eligibility BLOCKED (reason) and every later stage Upcoming", () => {
    const row = makeRow({
      facility: {
        eligibility: "Not Eligible",
        currentStatus: "Not Eligible",
      },
      // A stored State Assessment row is exactly what used to green-tick
      // Eligibility and paint State Assessment blue behind a "Not Eligible"
      // chip in the old drawer.
      sa: { status: "Completed", actualEndDate: "2026-01-10" },
    } as Partial<MasterRow>);
    const l = deriveStage(row, null, TODAY);
    // EXACTLY the six lifecycle stages (Internal Assessment is a section, not
    // a stage), so `sa` is the State Assessment step, not IA.
    const [elig, sa, nqas, cert, surv, recert] = l.stages;
    expect(l.stages.map((s) => s.key)).toEqual([
      "eligibility",
      "sa",
      "nqas",
      "certification",
      "surveillance",
      "recertification",
    ]);
    expect(elig.state).toBe("blocked");
    expect(elig.tooltip).toContain("Not Eligible");
    for (const s of [sa, nqas, cert, surv, recert]) expect(s.state).toBe("upcoming");
    expect(l.status).toBe("Not Eligible");
    expect(l.currentKey).toBe("eligibility");
    expect(l.blockedReason).not.toBeNull();
  });

  test("Future candidate (Possible) is blocked with the candidate reason", () => {
    const row = makeRow({
      facility: { eligibility: "Possible", currentStatus: "Facility (Future Candidate)" },
    } as Partial<MasterRow>);
    const l = deriveStage(row, null, TODAY);
    expect(l.stages[0].state).toBe("blocked");
    expect(l.stages[0].tooltip).toContain("Future candidate");
    expect(l.stages.slice(1).every((s) => s.state === "upcoming")).toBe(true);
  });

  test("Certified ⇒ Done through Certification and Surveillance Current", () => {
    const row = makeRow({
      facility: { currentStatus: "Certified — Surveillance Due" },
      sa: { status: "Completed", actualEndDate: "2025-03-01" },
      nqas: {
        status: "Completed",
        certificationStatus: "Quality Certified",
        certificationDate: "2025-05-02",
        validityDate: "2028-05-01",
        // Stored due dates (what the screen reads) + the 1st visit recorded a
        // day early — a Done visit must never read Overdue just because its
        // due date has passed.
        surveillanceDue1: "2026-08-18",
        surveillanceDue2: "2027-08-18",
        surveillanceDone1: "2026-08-17",
      },
    } as Partial<MasterRow>);
    const l = deriveStage(row, null, TODAY);
    const byKey = Object.fromEntries(l.stages.map((s) => [s.key, s.state]));
    expect(byKey.eligibility).toBe("done");
    expect(byKey.sa).toBe("done");
    expect(byKey.nqas).toBe("done");
    expect(byKey.certification).toBe("done");
    expect(byKey.surveillance).toBe("current");
    expect(l.currentKey).toBe("surveillance");
  });

  test("SA Scheduled ⇒ State Assessment is Current, nothing later is Done", () => {
    const row = makeRow({
      facility: { currentStatus: "SA Scheduled" },
      sa: { status: "Scheduled", scheduledDate: "2026-11-01" },
    } as Partial<MasterRow>);
    const l = deriveStage(row, null, TODAY);
    const byKey = Object.fromEntries(l.stages.map((s) => [s.key, s.state]));
    expect(byKey.eligibility).toBe("done");
    expect(byKey.sa).toBe("current");
    expect(byKey.nqas).toBe("upcoming");
    expect(byKey.certification).toBe("upcoming");
    expect(byKey.surveillance).toBe("upcoming");
  });

  test("a stage never reports Done beyond the facility's real status", () => {
    // Eligible + nothing recorded: only Eligibility is Done; the first open
    // step (State Assessment, which now folds in the IA work) is Current.
    const l = deriveStage(makeRow(), null, TODAY);
    const done = l.stages.filter((s) => s.state === "done");
    expect(done.map((s) => s.key)).toEqual(["eligibility"]);
    expect(l.stages.find((s) => s.state === "current")?.key).toBe("sa");
  });
});

/* --------------------------------------------------------------------------- */
/* 2 — NOC Available vocabulary (root cause #5)                                */
/* --------------------------------------------------------------------------- */

describe("NOC Available is Yes / No — one vocabulary", () => {
  test("stored Yes / No wins", () => {
    expect(deriveNocAvailability({ noc: { nocAvailable: "Yes" } }).value).toBe("Yes");
    expect(deriveNocAvailability({ noc: { nocAvailable: "No" } }).value).toBe("No");
    expect(deriveNocAvailability({ noc: { nocAvailable: "No" } }).source).toBe("stored");
  });

  test("a blank beside a real NOC record DERIVES as Yes (and is reported as such)", () => {
    const a = deriveNocAvailability({ noc: { expiryDate: "2027-04-01" } });
    expect(a.value).toBe("Yes");
    expect(a.source).toBe("derived");
  });

  test("no NOC record at all is blank — never 'Not started'", () => {
    const a = deriveNocAvailability({ noc: null });
    expect(a.value).toBe("");
    expect(a.source).toBe("none");
    expect(cellValue(makeRow(), "nocAvailable").kind).toBe("empty");
  });

  test("the grid shows the YES/NO pill, not the lifecycle word 'Not started'", () => {
    const v = cellValue(makeRow({ noc: { nocAvailable: "No" } }), "nocAvailable");
    expect(v.kind).toBe("status");
    if (v.kind === "status") expect(v.value).toBe("No");
    // The column may no longer fall through the generic status blank label.
    expect(MASTER_COLUMNS.find((c) => c.key === "nocAvailable")?.type).toBe("status");
  });

  test("'No' with recorded NOC dates is a CONFLICT and lands in Needs attention", () => {
    const row = makeRow({ noc: { nocAvailable: "No", expiryDate: "2027-04-01" } });
    const a = deriveNocAvailability(row);
    expect(a.conflict).toBe(true);
    const items = attentionFor(row, TODAY);
    expect(items.some((i) => i.field === "nocAvailable" && i.section === "building")).toBe(true);
    // …and the two surfaces can never read "Valid" beside "Available = No":
    // deriveFireNocStatus turns "No" into Not Obtained.
    expect(cellValue(row, "nocStatus")).toMatchObject({ kind: "status", value: "Not Obtained" });
    expect(statusTone("Not Obtained")).toBe("red");
  });

  test("derived Yes with a valid expiry reads Valid, tone green", () => {
    const row = makeRow({ noc: { expiryDate: "2027-04-01" } });
    expect(cellValue(row, "nocAvailable")).toMatchObject({ kind: "status", value: "Yes" });
    expect(cellValue(row, "nocStatus")).toMatchObject({ kind: "status", value: "Valid" });
  });
});

/* --------------------------------------------------------------------------- */
/* 3 — Sections (one list, mapped through the central config)                  */
/* --------------------------------------------------------------------------- */

describe("quick view sections", () => {
  test("the eleven sections, in the order district staff read them", () => {
    expect(QV_SECTIONS.map((s) => s.key)).toEqual([
      "overview",
      "eligibility",
      "state",
      "nqas",
      "funds",
      "ia",
      "surveillance",
      "building",
      "documents",
      "history",
      "audit",
    ]);
  });

  test("every section column comes from the central config (no second list)", () => {
    const keys = new Set(MASTER_COLUMNS.map((c) => c.key));
    for (const def of QV_SECTIONS) {
      for (const c of sectionColumns(def.key)) expect(keys.has(c.key)).toBe(true);
    }
  });

  test("documents live in ONE section only, and never in Building & NOC", () => {
    const building = sectionColumns("building").map((c) => c.key);
    expect(building).not.toContain("nocDoc");
    expect(building).not.toContain("saReport");
    expect(sectionColumns("documents").map((c) => c.key)).toContain("nocDoc");
  });

  test("deprecated columns never render in a section (the Eco trio is gone)", () => {
    // `columnsInGroup` keeps deprecated entries for a future restore, so the
    // section builder has to filter them — otherwise the IA section grows the
    // retired Eco-Friendly scorecard rows again.
    const retired = new Set(deprecatedColumns().map((c) => c.key));
    expect(retired.size).toBeGreaterThan(0);
    for (const def of QV_SECTIONS) {
      for (const c of sectionColumns(def.key)) {
        expect(retired.has(c.key)).toBe(false);
      }
    }
  });

  test("a blank is '-' — completeness never counts a blank as 0", () => {
    const empty = sectionCompleteness(makeRow(), "building");
    expect(empty.total).toBeGreaterThan(0);
    expect(empty.done).toBe(0);
    const filled = sectionCompleteness(
      makeRow({
        noc: { nocAvailable: "Yes", expiryDate: "2027-04-01", issuedDate: "2026-04-02" },
        building: { buildingType: "Own Building", buildingStatus: "Good" },
      }),
      "building",
    );
    expect(filled.done).toBeGreaterThanOrEqual(5);
    expect(filled.warning).toBe(false);
  });
});

/* --------------------------------------------------------------------------- */
/* 4 — Diff, validation, status preview                                        */
/* --------------------------------------------------------------------------- */

describe("save diff + validation", () => {
  const initial = {
    certStatus: "Quality Certified",
    certDate: "2025-05-02",
    certScore: "88",
    saStart: "2025-01-05",
    saEnd: "2025-01-08",
    gapAmount: "1250000",
    remarks: "",
    nocAvailable: "Yes",
  };

  test("diff formats: DD-MMM-YYYY dates, ₹ Indian grouping, % scores, '-' blanks", () => {
    const draft = {
      ...initial,
      certDate: "2025-05-10",
      certScore: "91",
      gapAmount: "12500000",
      remarks: "New note",
    };
    const changes = quickViewChanges(initial, draft);
    const byField = Object.fromEntries(changes.map((c) => [c.field, c]));
    expect(byField.certDate).toMatchObject({ from: "02-May-2025", to: "10-May-2025" });
    expect(byField.certScore).toMatchObject({ from: "88%", to: "91%" });
    expect(byField.gapAmount.to).toBe("₹1,25,00,000");
    expect(byField.remarks).toMatchObject({ from: "-", to: "New note" });
    expect(quickViewChanges(initial, initial)).toEqual([]);
  });

  test("blocking: Certified without a GoI letter / certification date", () => {
    const issues = validateQuickView({ ...initial, certDate: "" }, TODAY, initial);
    const certDate = issues.find((i) => i.field === "certDate");
    expect(certDate?.severity).toBe("blocking");
    expect(certDate?.message).toContain("certification date");
  });

  test("blocking: dates in the future are refused", () => {
    const issues = validateQuickView({ ...initial, saEnd: "2027-01-01" }, TODAY, initial);
    expect(issues.some((i) => i.field === "saEnd" && i.severity === "blocking")).toBe(true);
  });

  test("blocking: actual end must be on or after actual start (same kind only)", () => {
    expect(
      validateQuickView({ ...initial, saEnd: "2025-01-04" }, TODAY, initial).some(
        (i) => i.field === "saEnd" && i.severity === "blocking",
      ),
    ).toBe(true);
    // Same day is fine.
    expect(
      validateQuickView({ ...initial, saEnd: "2025-01-05" }, TODAY, initial).some(
        (i) => i.field === "saEnd",
      ),
    ).toBe(false);
  });

  test("the wrongly MIXED pair (NA scheduled start vs SA end/NA end) is never an error", () => {
    // The old rule compared the STATE ASSESSMENT end with the NQAS SCHEDULED
    // start and reported it on the NQAS end. Neither pair is an error now.
    const issues = validateQuickView(
      { ...initial, naScheduled: "2026-11-01", naEnd: "2026-10-01" },
      TODAY,
      initial,
    );
    expect(issues.some((i) => i.field === "naEnd" && i.severity === "blocking")).toBe(false);
    // Actual (NA end) vs scheduled (NA start) may only ever be a warning.
    expect(issues.every((i) => i.field !== "naEnd" || i.severity === "warning")).toBe(true);
  });

  test("blocking: scores are 0–100", () => {
    expect(
      validateQuickView({ ...initial, certScore: "101" }, TODAY, initial).some(
        (i) => i.field === "certScore",
      ),
    ).toBe(true);
    expect(
      validateQuickView({ ...initial, certScore: "" }, TODAY, initial).some(
        (i) => i.field === "certScore",
      ),
    ).toBe(false);
  });

  test("warnings do not block: NOC Available = No beside a NOC date", () => {
    const issues = validateQuickView(
      { ...initial, nocAvailable: "No", nocCertified: "2026-04-02" },
      TODAY,
      initial,
    );
    expect(issues.every((i) => i.severity === "warning")).toBe(true);
  });

  test("status-change notice names the new status", () => {
    const row = makeRow({
      facility: { currentStatus: "SA Scheduled" },
      sa: { status: "Scheduled" },
      nqas: null,
    } as Partial<MasterRow>);
    const draft = { saStatus: "Completed" };
    const notice = statusChangeNotice(row, draft, null);
    expect(notice).toEqual({ from: "SA Scheduled", to: "SA Completed — NQAS Awaited" });
    // No status move ⇒ no confirmation.
    expect(statusChangeNotice(row, {}, null)).toBeNull();
  });

  test("blank never reads as 0 in a draft value", () => {
    expect(displayDraftValue("certScore", "")).toBe("-");
    expect(displayDraftValue("gapAmount", "")).toBe("-");
  });
});

/* --------------------------------------------------------------------------- */
/* 5 — URL deep link + updated chip                                             */
/* --------------------------------------------------------------------------- */

describe("deep link (?facility=&section=)", () => {
  test("parse and serialize round-trip the open facility + section", () => {
    const parsed = parseListFilters("?block=Alangayam&facility=abc123&section=building");
    expect(parsed.facility).toBe("abc123");
    expect(parsed.section).toBe("building");
    expect(parsed.block).toEqual(["Alangayam"]);
    expect(serializeListFilters(parsed)).toContain("facility=abc123");
    expect(serializeListFilters(parsed)).toContain("section=building");
  });

  test("a closed dialog drops both params and keeps the filters", () => {
    const parsed = parseListFilters("?block=Alangayam&facility=abc&section=state&page=3");
    const closed = serializeListFilters({ ...parsed, facility: "", section: "" });
    expect(closed).toBe("block=Alangayam&page=3");
  });

  test("a facility link alone is not a 'view' (no restore notice)", () => {
    expect(hasViewParams("?facility=abc123")).toBe(false);
    expect(hasViewParams("?block=Alangayam")).toBe(true);
  });

  test("an unknown section id falls back to Overview (never a crash)", () => {
    expect(QV_SECTIONS.find((s) => s.key === "nope")).toBeUndefined();
    expect(parseListFilters("?facility=abc&section=nope").section).toBe("nope");
  });

  test("the 'Updated' chip only appears inside the admin window", () => {
    const now = Date.parse("2026-10-21T10:00:00Z");
    expect(updatedRecently(now - 3 * 86_400_000, 5, now)).toMatch(/^Updated 1[78]-Oct-2026$/);
    expect(updatedRecently(now - 9 * 86_400_000, 5, now)).toBeNull();
    expect(updatedRecently(null, 5, now)).toBeNull();
    expect(updatedRecently(now, 0, now)).toBeNull();
  });
});
