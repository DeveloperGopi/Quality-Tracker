/**
 * Locks the "one shared lifecycle view" invariants in place.
 *
 * The dashboard strip, the generated PPT/PDF deck and the Reports summary all
 * read the same rule (convex/lifecycle.ts). These tests assert the surfaces
 * agree with each other on the same input — the drift this refactor removed.
 * Run: bun test ./scripts
 */
import { describe, it, expect } from "bun:test";

import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  deriveFlatLifecycle,
  pipelineStageOf,
  type PipelineStage,
} from "../src/convex/lifecycle";
import { buildDeckData, type DeckRow } from "../src/lib/deck";
import {
  grandTotalTypeWise,
  summarizeTypeWise,
  type TypeWiseRow,
} from "../src/components/TypeWiseSummary";

type Sample = {
  eligibility?: string;
  currentStatus?: string;
  certStatus?: string | null;
  naStatus?: string | null;
  naStartDate?: string | null;
  saStatus?: string | null;
  docStatus?: string | null;
};

function row(i: number, s: Sample = {}): DeckRow {
  const certStatus = s.certStatus ?? null;
  return {
    facility: `Facility ${i}`,
    type: "PHC",
    block: "Alangayam",
    phc: "PHC-1",
    eligibility: s.eligibility ?? "Eligible",
    currentStatus: s.currentStatus ?? "SA Not Yet Initiated",
    certStatus,
    naStatus: s.naStatus ?? null,
    naScheduledDate: s.naStartDate ?? null,
    saStatus: s.saStatus ?? null,
    generalDocStatus: s.docStatus ?? null,
    certDate: certStatus === "Quality Certified" ? "2025-03-04" : null,
    certScore: certStatus === "Quality Certified" ? 82 : null,
    naMode: null,
    saScore: null,
    buildingStatus: null,
    buildingType: null,
    fireNocStatus: null,
    fireNocExpiry: null,
    nqasIaQ1: null,
    nqasIaQ2: null,
    kayakalpIaQ1: null,
    kayakalpIaQ2: null,
    surveillanceDue1: null,
    surveillanceDone1: null,
    surveillanceDue2: null,
    surveillanceDone2: null,
    validityDate: certStatus === "Quality Certified" ? "2028-03-04" : null,
    gapClosureAmount: null,
    gcFundYear: null,
  };
}

function typeWiseRow(overrides: Sample = {}): TypeWiseRow {
  return {
    facilityType: "PHC",
    block: "Alangayam",
    phc: "PHC-1",
    cycle: 1,
    currentStatus: overrides.currentStatus ?? "SA Not Yet Initiated",
    certStatus: overrides.certStatus ?? null,
    naStatus: overrides.naStatus ?? null,
    naStartDate: overrides.naStartDate ?? null,
    saStatus: overrides.saStatus ?? null,
    docStatus: overrides.docStatus ?? null,
    buildingStatus: null,
  };
}

/** One facility per stage, including the legacy/edge spellings. */
const samples: Sample[] = [
  { eligibility: "Not Eligible" }, // notEligible
  { eligibility: "Possible" }, // notEligible (future candidate)
  {}, // notStarted
  { saStatus: "Scheduled", currentStatus: "SA Scheduled" }, // inProgress
  { currentStatus: "SA Completed — NQAS Pending", saStatus: "Completed" }, // inProgress
  // Upcoming NA date — with the SA-progress gate a facility counts as
  // "NA scheduled" only when its State Assessment has actually happened or
  // is scheduled. This fixture carries that completed SA (the same pattern
  // the contradiction fix on the profile enforces).
  {
    naStartDate: "2999-01-01",
    saStatus: "Completed",
    currentStatus: "SA Completed — NQAS Pending",
  }, // naScheduled (upcoming date, SA done first)
  {
    naStatus: "Scheduled",
    docStatus: null,
    currentStatus: "SA Completed — NQAS Pending",
    saStatus: "Completed",
  }, // naScheduled (explicit status, no date)
  {
    docStatus: "NA Completed & Awaiting Results",
    saStatus: "Completed",
    currentStatus: "SA Completed — NQAS Awaited",
  }, // resultAwaited (docs awaiting results)
  { certStatus: "Result Awaited" }, // resultAwaited
  { currentStatus: "Certified — Surveillance Due" }, // certified (legacy: no result stored)
  { certStatus: "Quality Certified", naStatus: "Completed", saStatus: "Completed" },
  { certStatus: "Quality Certified with Conditionality", naStatus: "Completed", saStatus: "Completed" },
  // deferred (failed) → no stage of its own; the cycle restarts at the start
  { certStatus: "Deferred", naStatus: "Completed", saStatus: "Completed" },
];

const deckRows = samples.map((s, i) => row(i, s));

describe("deck status buckets == dashboard pipeline stages", () => {
  const deck = buildDeckData(deckRows);
  const counts = new Map<string, number>();
  for (const r of deckRows) {
    const v = deriveFlatLifecycle(
      {
        currentStatus: r.currentStatus,
        certStatus: r.certStatus,
        naStatus: r.naStatus,
        naStartDate: r.naScheduledDate,
        docStatus: r.generalDocStatus,
      },
      // Same local date the deck uses (no future/past boundary in this fixture).
      new Date().toISOString().slice(0, 10),
    );
    const stage = pipelineStageOf(v, r.eligibility);
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }

  it("sums to the facility count (mutually exclusive buckets)", () => {
    const total = deck.statusSlices.reduce((a, s) => a + s.count, 0);
    expect(total).toBe(deckRows.length);
  });

  it("uses the shared stage labels, in the dashboard's order", () => {
    const labels = deck.statusSlices.map((s) => s.label);
    const expected = PIPELINE_STAGES.map((s) => s.label).filter((l) =>
      labels.includes(l),
    );
    expect(labels).toEqual(expected);
    expect(labels.every((l) => Object.values(PIPELINE_STAGE_LABELS).includes(l))).toBe(true);
  });

  it("counts every stage exactly like the shared rule", () => {
    for (const s of PIPELINE_STAGES) {
      expect(
        deck.statusSlices.find((x) => x.label === s.label)?.count ?? 0,
      ).toBe(counts.get(s.key) ?? 0);
    }
  });

  it("agrees with the dashboard on the certified cohort (legacy spelling included)", () => {
    expect(deck.certifiedTotal).toBe(counts.get("certified"));
    expect(deck.qualityCount).toBe(2);
    expect(deck.condCount).toBe(1);
  });

  it("agrees with the dashboard on awaited / scheduled", () => {
    expect(deck.statusSlices.find((x) => x.label === PIPELINE_STAGE_LABELS.resultAwaited)?.count).toBe(2);
    expect(deck.statusSlices.find((x) => x.label === PIPELINE_STAGE_LABELS.naScheduled)?.count).toBe(2);
  });

  it("has no Deferred stage — a failed cycle restarts at the first step", () => {
    expect(Object.keys(PIPELINE_STAGE_LABELS)).not.toContain("deferred");

    // A facility still inside its deferral / cooling period.
    const deferredView = deriveFlatLifecycle(
      {
        currentStatus: "Deferred — Cooling Period",
        certStatus: "Deferred",
        naStatus: "Completed",
      },
      new Date().toISOString().slice(0, 10),
    );
    expect(deferredView.isDeferred).toBe(true);
    expect(pipelineStageOf(deferredView, "Eligible")).toBe("notStarted");

    // Deferred is not a bucket anywhere: the deck emits no such slice, and no
    // row is ever placed in a "deferred" stage.
    expect(deck.statusSlices.some((s) => s.label === "Deferred")).toBe(false);
    expect(counts.get("deferred")).toBeUndefined();
  });
});

describe("reports summary is driven by the same view", () => {
  const docStatuses = ["Docx Pending at Facility", "Docx in RQAU login"];

  it("NQAS scheduled / result awaited match the shared flags", () => {
    const rows = [
      // Upcoming NA date with a completed SA (same gate the profile enforces —
      // a stray future NA date alone never counts as NQAS Scheduled).
      typeWiseRow({ naStartDate: "2999-01-01", saStatus: "Completed", currentStatus: "SA Completed — NQAS Pending" }),
      typeWiseRow({ naStatus: "Scheduled", saStatus: "Completed", currentStatus: "SA Completed — NQAS Pending" }),
      typeWiseRow({
        docStatus: "NA Completed & Awaiting Results",
        saStatus: "Completed",
        currentStatus: "SA Completed — NQAS Awaited",
      }),
      typeWiseRow({ currentStatus: "Certified — Surveillance Due" }),
    ];
    const [summary] = summarizeTypeWise(rows, "type", docStatuses, []);
    expect(summary.nqasScheduled).toBe(2);
    expect(summary.resultAwaited).toBe(1);
    expect(summary.certified).toBe(1);
    expect(summary.target).toBe(4);
  });

  it("Next Phase = SA completed with no NQAS schedule and no result", () => {
    const rows = [
      typeWiseRow({ saStatus: "Completed", currentStatus: "SA Completed — NQAS Pending" }),
      // SA completed but already certified — must NOT land in Next Phase.
      typeWiseRow({
        saStatus: "Completed",
        certStatus: "Quality Certified",
        naStatus: "Completed",
        currentStatus: "Certified — Surveillance Due",
      }),
    ];
    const [summary] = summarizeTypeWise(rows, "type", docStatuses, []);
    expect(summary.nextPhase).toBe(1);
  });

  it("every row adds up: docTotal equals its own columns", () => {
    const rows = deckRows.map((r) =>
      typeWiseRow({
        currentStatus: r.currentStatus,
        certStatus: r.certStatus,
        naStatus: r.naStatus,
        naStartDate: r.naScheduledDate,
        saStatus: r.saStatus,
        docStatus: "Docx in RQAU login",
      }),
    );
    const byType = summarizeTypeWise(rows, "type", docStatuses, []);
    const total = grandTotalTypeWise(byType);
    for (const r of [...byType, total]) {
      // Every pipeline bucket, INCLUDING the three new remainders/real
      // buckets, is part of the column sum (Result declared, Not recorded,
      // Not in pipeline). The old sum silently omitted them.
      const columns =
        r.nqasScheduled +
        r.resultAwaited +
        r.resultDeclared +
        r.notRecorded +
        r.nextPhase +
        r.notInPipeline +
        Object.values(r.docCounts).reduce((a, b) => a + b, 0);
      expect(r.docTotal).toBe(columns);
      expect(r.docTotal).toBe(r.target);
    }
    expect(total.target).toBe(rows.length);
  });

  it("buckets are mutually exclusive across the lifecycle columns", () => {
    const rows = deckRows.map((r) =>
      typeWiseRow({
        currentStatus: r.currentStatus,
        certStatus: r.certStatus,
        naStatus: r.naStatus,
        naStartDate: r.naScheduledDate,
        saStatus: r.saStatus,
        docStatus: "Docx in RQAU login",
      }),
    );
    const [summary] = summarizeTypeWise(rows, "type", docStatuses, []);
    const countedOnce = summary.nqasScheduled + summary.resultAwaited + summary.nextPhase;
    const stages: PipelineStage[] = ["naScheduled", "resultAwaited"];
    const expected = rows.filter((r) => {
      const v = deriveFlatLifecycle({
        currentStatus: r.currentStatus,
        certStatus: r.certStatus,
        naStatus: r.naStatus,
        naStartDate: r.naStartDate,
        docStatus: r.docStatus,
      });
      return stages.includes(pipelineStageOf(v, "Eligible"));
    }).length;
    expect(summary.nqasScheduled + summary.resultAwaited).toBe(expected);
    expect(countedOnce).toBeGreaterThanOrEqual(summary.nqasScheduled + summary.resultAwaited);
  });
});
