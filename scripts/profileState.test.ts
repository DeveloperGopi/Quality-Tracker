/**
 * Facility Profile lifecycle tests — locks the "one source of truth"
 * contract (getLifecycleState) and the stepper gate that makes stage /
 * header chip / next-action contradictions impossible.
 *
 * Run: bun test ./scripts
 */
import { describe, it, expect } from "bun:test";

import { pipelineStageOf, deriveFlatLifecycle } from "../src/convex/lifecycle";
import {
  chipFor,
  getLifecycleState,
  profileCompleteness,
  toDdMmmYyyy,
} from "../src/lib/facilityProfileState";

const BASE_FACILITY = {
  name: "Thiriyalam",
  block: "Jolarpettai",
  phc: "Pudupettai",
  facilityType: "HWC HSC",
  eligibility: "Eligible",
  currentStatus: "SA Not Yet Initiated",
  iaLastDate: null as string | null,
  iaLastScore: null as number | null,
};

describe("getLifecycleState — one source of truth", () => {
  it("the reported contradiction is fixed: stray NA schedule on an SA-untouched facility cannot be stage 5", () => {
    const state = getLifecycleState({
      facility: BASE_FACILITY,
      activeCycle: {
        cycleNumber: 1,
        cycleType: "Initial",
        sa: { status: "Not Yet Initiated" },
        nqas: {
          status: "Scheduled", // legacy stray record
          scheduledStartDate: "2027-01-01", // future date
        },
      },
    });
    expect(state.status).toBe("SA Not Yet Initiated");
    expect(state.stageIndex).not.toBe(5);
    expect(state.stages.find((s) => s.state === "current")!.label).toBe(
      "Eligible — not started",
    );
    // Header chip + next action agree with the stage.
    expect(state.chip.label).toBe("SA Not Yet Initiated");
    expect(state.nextAction.text).toContain("IA");
  });

  it("header chip, stage and next-action share the same verdict for a scheduled SA", () => {
    const state = getLifecycleState({
      facility: BASE_FACILITY,
      activeCycle: {
        cycleNumber: 1,
        cycleType: "Initial",
        sa: { status: "Scheduled", scheduledDate: "2026-11-02" },
        nqas: null,
      },
    });
    expect(state.status).toBe("SA Scheduled");
    expect(state.chip.tone).toBe("blue");
    expect(state.stageIndex).toBe(4);
    expect(state.nextAction.cta).toBe("Record the SA visit");
    expect(state.stageDates.stateAssessment!.date).toBe("2026-11-02");
  });

  it("the engine gate also protects the dashboard strip (pipelineStageOf)", () => {
    const flat = deriveFlatLifecycle({
      currentStatus: "SA Not Yet Initiated",
      certStatus: null,
      naStatus: "Scheduled",
      naStartDate: "2027-01-01",
      docStatus: null,
      iaDone: false,
    });
    expect(pipelineStageOf(flat, "Eligible")).toBe("notStarted");
  });

  it("certified facility reaches stage 7 with labelled green chip + validity", () => {
    const state = getLifecycleState({
      facility: { ...BASE_FACILITY },
      activeCycle: {
        cycleNumber: 1,
        cycleType: "Initial",
        sa: { status: "Completed", scorePercent: 92, actualStartDate: "2025-08-01", actualEndDate: "2025-08-02" },
        nqas: {
          status: "Completed",
          scorePercent: 88,
          certificationStatus: "Quality Certified",
          certificationDate: "2025-10-01",
          goiLetterDate: "2025-10-05",
        },
      },
      s: { certificationValidityYears: 3 },
    });
    expect(state.stageIndex).toBe(7);
    expect(state.chip).toEqual({ label: "Certified", tone: "green" });
    expect(state.stages[6].state).toBe("current");
    expect(state.scores.sa.short).toBe("SA score 92%");
    expect(state.scores.nqas.short).toBe("NQAS score 88%");
    expect(state.validity.from).toBe("2025-10-01");
    expect(state.validity.daysLeft).toBeGreaterThan(0);
  });

  it("empty scores are explicit, never a bare percent", () => {
    const state = getLifecycleState({
      facility: BASE_FACILITY,
      activeCycle: { cycleNumber: 1, cycleType: "Initial", sa: null, nqas: null },
    });
    expect(state.scores.ia.short).toBe("IA score —");
    expect(state.scores.sa.short).toBe("SA score —");
    expect(state.scores.sa.long).toBe("SA score — Not recorded yet");
    expect(state.scores.nqas.value).toBeNull();
  });

  it("0% and 100% are real numbers, not treated as missing", () => {
    const state = getLifecycleState({
      facility: BASE_FACILITY,
      activeCycle: {
        cycleNumber: 1,
        cycleType: "Initial",
        sa: { status: "Completed", scorePercent: 0 },
        nqas: { status: "Completed", scorePercent: 100 },
      },
    });
    expect(state.scores.sa.short).toBe("SA score 0%");
    expect(state.scores.nqas.short).toBe("NQAS score 100%");
  });

  it("Deferred maps to red chip and no stage of its own", () => {
    const state = getLifecycleState({
      facility: BASE_FACILITY,
      activeCycle: {
        cycleNumber: 1,
        cycleType: "Initial",
        sa: { status: "Completed", actualEndDate: "2026-06-01" },
        nqas: {
          status: "Completed",
          certificationStatus: "Deferred",
          goiLetterDate: "2026-09-01",
        },
      },
    });
    expect(state.chip.tone).toBe("red");
    // Deferred has no stage of its own — the engine restarts the cycle at the
    // first step (same rule the dashboard strip and the deck follow).
    expect(state.stageIndex).toBe(2);
    expect(state.nextAction.cta).toBeNull(); // cooling period — nothing to do yet
  });

  it("open gaps count pending/returned funds", () => {
    const state = getLifecycleState({
      facility: BASE_FACILITY,
      activeCycle: null,
      funds: [{ status: "Pending" }, { status: "Utilized" }, { status: "Returned" }],
    });
    expect(state.openGaps).toBe(2);
  });
});

describe("chipFor palette", () => {
  it("never leaves colour as the only signal — every tone pairs with a label", () => {
    const cases = [
      ["Not Eligible", "Not Eligible", "grey"],
      ["SA Scheduled", "SA Scheduled", "blue"],
      ["Certified with Conditionality", "Certified (Conditionality)", "amber"],
      ["Result Awaited", "Result Awaited", "purple"],
      ["Certified — Surveillance Due", "Certified", "green"],
      ["Deferred — Cooling Period", "Deferred — Cooling Period", "red"],
    ] as const;
    for (const [status, label, tone] of cases) {
      const chip = chipFor(status, "Eligible");
      expect(chip.label).toBe(label);
      expect(chip.tone).toBe(tone);
    }
  });
});

describe("profile completeness", () => {
  it("lists the missing fields as named links with a percentage", () => {
    const c = profileCompleteness({
      facility: { ...BASE_FACILITY, phaseType: "Phase-2" },
      activeCycle: { cycleNumber: 1 },
    });
    expect(c.pct).toBeLessThan(100);
    expect(c.missing.some((m) => m.field === "NIN Number")).toBe(true);
    expect(c.missing.every((m) => m.tab)).toBe(true);
  });

  it("a fully filled profile reports 100%", () => {
    const c = profileCompleteness({
      facility: {
        ...BASE_FACILITY,
        ninNumber: "1201",
        phaseType: "Phase-2",
        saqshamFacilityType: "HWC",
        saqshamCategory: "Sub centre",
        iaLastDate: "2026-08-21",
        iaLastScore: 82,
        remarks: "ok",
      },
      activeCycle: { cycleNumber: 1 },
    });
    expect(c.pct).toBe(100);
    expect(c.missing).toEqual([]);
  });
});

describe("stepper / chip / next-action invariants (no contradictions)", () => {
  const matrix = [
    { label: "not eligible", facility: { ...BASE_FACILITY, eligibility: "Not Eligible" }, cycle: null },
    { label: "not started", facility: BASE_FACILITY, cycle: null },
    {
      label: "IA recorded",
      facility: { ...BASE_FACILITY, iaLastDate: "2026-08-21", iaLastScore: 82 },
      cycle: { cycleNumber: 1, cycleType: "Initial", sa: { status: "Not Yet Initiated" }, nqas: null },
    },
    {
      label: "SA scheduled",
      facility: BASE_FACILITY,
      cycle: { cycleNumber: 1, cycleType: "Initial", sa: { status: "Scheduled", scheduledDate: "2026-11-02" }, nqas: null },
    },
    {
      label: "SA completed",
      facility: BASE_FACILITY,
      cycle: { cycleNumber: 1, cycleType: "Initial", sa: { status: "Completed", actualEndDate: "2026-09-10" }, nqas: null },
    },
    {
      label: "NA scheduled",
      facility: BASE_FACILITY,
      cycle: {
        cycleNumber: 1,
        cycleType: "Initial",
        sa: { status: "Completed", actualEndDate: "2026-09-10" },
        nqas: { status: "Scheduled", scheduledStartDate: "2027-01-01" },
      },
    },
    {
      label: "result awaited",
      facility: BASE_FACILITY,
      cycle: {
        cycleNumber: 1,
        cycleType: "Initial",
        sa: { status: "Completed", actualEndDate: "2026-09-10" },
        nqas: { status: "Completed", actualEndDate: "2026-12-01" },
      },
    },
    {
      label: "certified",
      facility: BASE_FACILITY,
      cycle: {
        cycleNumber: 1,
        cycleType: "Initial",
        sa: { status: "Completed", actualEndDate: "2026-09-10" },
        nqas: {
          status: "Completed",
          certificationStatus: "Quality Certified",
          certificationDate: "2026-10-01",
        },
      },
    },
    {
      label: "deferred",
      facility: BASE_FACILITY,
      cycle: {
        cycleNumber: 1,
        cycleType: "Initial",
        sa: { status: "Completed", actualEndDate: "2026-09-10" },
        nqas: { status: "Completed", certificationStatus: "Deferred", goiLetterDate: "2026-09-20" },
      },
    },
  ];

  const TABS = ["overview", "state", "national", "funds", "noc", "building", "timeline"];

  for (const m of matrix) {
    it(`${m.label}: exactly one current step, N-1 done, chip and CTA agree`, () => {
      const state = getLifecycleState({
        facility: m.facility,
        activeCycle: m.cycle,
      });
      const current = state.stages.filter((s) => s.state === "current");
      const done = state.stages.filter((s) => s.state === "done");
      expect(current).toHaveLength(1);
      expect(done).toHaveLength(state.stageIndex - 1);
      expect(state.stages[state.stageIndex - 1].state).toBe("current");
      expect(state.stageIndex).toBeGreaterThanOrEqual(1);
      expect(state.stageIndex).toBeLessThanOrEqual(state.stages.length);
      // A chip always carries a label (never colour alone) from the palette.
      expect(state.chip.label.length).toBeGreaterThan(0);
      expect(["grey", "blue", "amber", "purple", "green", "red"]).toContain(state.chip.tone);
      // The next action is always a sentence; when a CTA exists it points at a
      // real profile tab and never back at a Deferred cooling period.
      expect(state.nextAction.text.length).toBeGreaterThan(0);
      if (state.nextAction.cta) {
        expect(TABS).toContain(state.nextAction.targetTab);
      }
      if (m.label === "deferred") expect(state.nextAction.cta).toBeNull();
    });
  }

  it("stage 5 is never shown while the Status Assessment is untouched", () => {
    for (const nqasStatus of ["Scheduled", "Not Yet Initiated", "Completed"]) {
      const state = getLifecycleState({
        facility: BASE_FACILITY,
        activeCycle: {
          cycleNumber: 1,
          cycleType: "Initial",
          sa: { status: "Not Yet Initiated" },
          nqas: { status: nqasStatus, scheduledStartDate: "2027-01-01" },
        },
      });
      expect(state.stageIndex).toBeLessThan(4);
    }
  });
});

describe("DD-MMM-YYYY export dates", () => {
  it("formats Indian-style display and rejects garbage", () => {
    expect(toDdMmmYyyy("2026-10-01")).toBe("01-Oct-2026");
    expect(toDdMmmYyyy("2026-01-02")).toBe("02-Jan-2026");
    expect(toDdMmmYyyy(null)).toBe("");
    expect(toDdMmmYyyy("not-a-date")).toBe("");
  });
});
