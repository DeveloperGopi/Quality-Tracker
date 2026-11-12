/**
 * QUICK VIEW — surveillance, status, recertification and comparison rules
 * (task §3, §5). The Madhanancheri facts:
 *
 *   certification 18-Aug-2025 · validity 18-Aug-2028
 *   1st due 18-Aug-2026 · 1st done 17-Aug-2026   → DONE (1 day early)
 *   2nd due 18-Aug-2027 · 2nd done 17-Aug-2027   → a FUTURE done date (bad data)
 *   today 24-Oct-2026
 *
 * A Done visit must never read Overdue/Due; the next action is the earliest
 * INCOMPLETE step (2nd surveillance, not the 2028 certificate); a certified
 * facility with no open visit reads "Certified — On track"; the future done
 * date is flagged, never silently used.
 */

import { describe, test, expect } from "bun:test";

import {
  certifiedSurveillanceStatus,
  surveillanceNextAction,
  surveillanceVisits,
} from "../src/convex/lifecycle";
import {
  attentionFor,
  recertificationState,
  statusForDisplay,
  validateSurveillance,
  visitFor,
} from "../src/lib/facilityQuickView";
import type { MasterRow } from "../src/lib/masterColumns";

const TODAY = "2026-10-24";

const nqas = {
  status: "Completed",
  certificationStatus: "Quality Certified",
  certificationDate: "2025-08-18",
  validityDate: "2028-08-18",
  surveillanceDue1: "2026-08-18",
  surveillanceDone1: "2026-08-17",
  surveillanceDue2: "2027-08-18",
  surveillanceDone2: "2027-08-17",
};

function row(over: Record<string, unknown> = {}): MasterRow {
  return {
    facility: {
      _id: "f1",
      name: "Madhanancheri",
      block: "Alangayam",
      phc: "PHC Udhayendiram",
      facilityType: "HWC HSC",
      ninNumber: "4438713721",
      eligibility: "Eligible",
      currentStatus: "Certified — Surveillance Due",
    },
    cycleNumber: 1,
    cycleType: "Initial",
    sa: { status: "Completed", actualStartDate: "2025-03-24", actualEndDate: "2025-03-24" },
    nqas,
    fund: null,
    noc: null,
    building: null,
    ...over,
  } as unknown as MasterRow;
}

describe("surveillance — a Done visit is never Overdue", () => {
  test("1st visit reads Done 17-Aug-2026 with the early detail", () => {
    const [v1] = surveillanceVisits(nqas as never, null, TODAY);
    expect(v1.state).toBe("done");
    expect(v1.chip).toBe("Done 17-Aug-2026");
    expect(v1.detail).toBe("1 day early");
  });

  test("2nd visit: the stored future done date is NOT a visit, so the deadline is open", () => {
    const [, v2] = surveillanceVisits(nqas as never, null, TODAY);
    expect(v2.done).toBe("2027-08-17"); // shown as a red Future date in the dialog
    expect(v2.validDone).toBeNull();
    expect(v2.state).toBe("upcoming");
    expect(v2.chip).toBe("Due 18-Aug-2027");
  });

  test("a due date in the past with NO done date is the only Overdue case", () => {
    const [v1] = surveillanceVisits(
      { ...nqas, surveillanceDone1: null } as never,
      null,
      TODAY,
    );
    expect(v1.state).toBe("overdue");
    expect(v1.chip).toBe("Overdue 67d");
  });

  test("visitFor exposes the same rule to the row cells", () => {
    expect(visitFor(row(), "surv1", TODAY)?.state).toBe("done");
    expect(visitFor(row(), "surv2", TODAY)?.done).toBe("2027-08-17");
  });
});

describe("status, next action and recertification", () => {
  test("a certified facility with no open visit reads Certified — On track", () => {
    expect(
      certifiedSurveillanceStatus(
        { ...nqas, surveillanceDone2: null } as never,
        null,
        TODAY,
      ),
    ).toBe("Certified — On track");
    expect(statusForDisplay(row(), null, TODAY)).toBe("Certified — On track");
  });

  test("statusForDisplay follows an overdue open visit", () => {
    const overdue = row({
      nqas: { ...nqas, surveillanceDone1: null, surveillanceDone2: null },
    });
    expect(statusForDisplay(overdue, null, TODAY)).toBe("Certified — Surveillance Due");
  });

  test("the next action is the 2nd surveillance, not the 2028 certificate", () => {
    const next = surveillanceNextAction({ ...nqas, surveillanceDone2: null } as never, null, TODAY);
    expect(next).toBe("2nd surveillance due 18-Aug-2027 · in 298 days");
  });

  test("recertification is a short pill plus a plain sentence (never an ISO date)", () => {
    expect(recertificationState(row(), TODAY)).toEqual({
      label: "Not due yet",
      tone: "green",
      detail: "Next full recertification: 2028",
    });
  });

  test("an expired certificate reads Overdue <year>", () => {
    const expired = row({ nqas: { ...nqas, validityDate: "2026-01-01" } });
    expect(recertificationState(expired, TODAY).label).toBe("Overdue 2026");
  });
});

describe("Needs attention and save validation", () => {
  test("the future 2nd done date is a red Needs-attention item", () => {
    const items = attentionFor(row(), TODAY);
    const future = items.find((a) => a.id === "surv2-future");
    expect(future).toBeDefined();
    expect(future!.severity).toBe("blocking");
    expect(future!.text).toContain("17-Aug-2027");
    expect(future!.text).toContain("Data checks");
  });

  test("a stored future date is only a WARNING until this session edits it", () => {
    const draft = {
      surv1: "2026-08-17",
      surv2: "2027-08-17",
      manualScore: "",
    };
    const stored = validateSurveillance(row(), draft, TODAY, draft);
    expect(stored.every((i) => i.severity === "warning")).toBe(true);
    const edited = validateSurveillance(
      row(),
      { ...draft, surv2: "2027-09-01" },
      TODAY,
      draft,
    );
    expect(edited.some((i) => i.field === "surv2" && i.severity === "blocking")).toBe(true);
  });

  test("a score needs a real done date (a future date is not a visit)", () => {
    const issues = validateSurveillance(
      row(),
      { surv1: "2026-08-17", surv2: "2027-08-17", manualScore: "91" },
      TODAY,
      { surv1: "2026-08-17", surv2: "2027-08-17", manualScore: "" },
    );
    expect(issues.some((i) => i.field === "manualScore" && i.severity === "blocking")).toBe(true);
  });
});
