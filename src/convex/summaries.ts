import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  requireActivatedUser,
  getSettings,
  allowedBlockNames,
} from "./facilities";
import {
  DEFAULT_SETTINGS,
  todayIso,
  deriveLifecycleView,
  docPipelineZone,
} from "./lifecycle";

export type TypeWiseStat = {
  label: string;
  target: number;
  certified: number;
  conditional: number;
  totalCertified: number;
  certifiedPct: number;
  deferred: number;
  nqasScheduled: number;
  resultAwaited: number;
  /** SA done and the NQAS step not opened yet ("SA Completed — NQAS Pending"). */
  nextPhase: number;
  docPipeline: { status: string; count: number }[];
  docTotal: number;
  building: { status: string; count: number }[];
  buildingTotal: number;
};

/** Government summary table: per facility type and (separately) per block,
 *  counts of certification progress, SaQsham document pipeline and building
 *  status with colour-coded Certified %. Powers the dashboard card and the
 *  Reports summary (same numbers, one query).
 *
 *  The document pipeline counts the 6-stage "SaQsham Documents Status"
 *  (stateAssessments.generalDocStatus) — the column the master list and
 *  profile forms edit. */
export const getTypeWiseSummary = query({
  args: {},
  handler: async (ctx) => {
    // Calendar-date "today" in the server's local timezone — avoids UTC
    // off-by-one near midnight so the date-primary rule below compares
    // calendar dates exactly.
    const today = todayIso();
    const user = await requireActivatedUser(ctx);
    const allowed = await allowedBlockNames(ctx, user);
    const settings = await getSettings(ctx);
    let facilities = await ctx.db.query("facilities").collect();
    if (allowed !== null)
      facilities = facilities.filter((f) => allowed.has(f.block));

    // Document pipeline uses the admin-managed 6-stage SaQsham statuses.
    const docStatuses: string[] =
      (settings as Record<string, unknown>).generalDocStatuses as string[] ??
      DEFAULT_SETTINGS.generalDocStatuses;
    const buildingStatuses = settings.buildingStatuses ?? [
      "Good",
      "Needs Repair",
      "Under Renovation",
      "Dilapidated",
    ];

    // The two doc stages that duplicate dedicated columns are removed from
    // the column list — "NA Scheduled" counts under NQAS Scheduled and
    // "NA Completed & Awaiting Results" under Result Awaited.
    const docColumnStatuses = docStatuses.filter(
      (s) =>
        s !== "NA Scheduled" &&
        s !== "NA Completed & Awaiting Results",
    );
    const docColumnSet = new Set(docColumnStatuses);

    type Acc = {
      target: number;
      certified: number;
      conditional: number;
      deferred: number;
      nqasScheduled: number;
      resultAwaited: number;
      nextPhase: number;
      docCounts: Map<string, number>;
      buildingCounts: Map<string, number>;
      buildingTotal: number;
    };
    const byType = new Map<string, Acc>();
    const byBlock = new Map<string, Acc>();
    // Batch-load all lifecycle data in 4 table scans instead of ~4 queries
    // per facility (157 facilities ⇒ ~630 round trips → 4).
    const allCycles = await ctx.db.query("certificationCycles").collect();
    const cycleByFacility = new Map(
      allCycles
        .filter((c) => !c.superseded)
        .map((c) => [c.facilityId as Id<"facilities">, c]),
    );
    const cycleIds = new Set(
      [...cycleByFacility.values()].map((c) => c._id),
    );
    const [allSas, allNas, allBuildings] = await Promise.all([
      ctx.db.query("stateAssessments").collect(),
      ctx.db.query("nationalAssessments").collect(),
      ctx.db.query("buildingDetails").collect(),
    ]);
    const saByCycle = new Map(
      allSas.filter((s) => cycleIds.has(s.cycleId)).map((s) => [s.cycleId, s]),
    );
    const naByCycle = new Map(
      allNas.filter((n) => cycleIds.has(n.cycleId)).map((n) => [n.cycleId, n]),
    );
    const buildingByFacility = new Map(
      allBuildings.map((b) => [b.facilityId as Id<"facilities">, b]),
    );
    const blank = (): Acc => ({
      target: 0,
      certified: 0,
      conditional: 0,
      deferred: 0,
      nqasScheduled: 0,
      resultAwaited: 0,
      nextPhase: 0,
      docCounts: new Map(),
      buildingCounts: new Map(),
      buildingTotal: 0,
    });

    for (const f of facilities) {
      const cycle = cycleByFacility.get(f._id) ?? null;
      const sa = cycle ? (saByCycle.get(cycle._id) ?? null) : null;
      const nqas = cycle ? (naByCycle.get(cycle._id) ?? null) : null;
      const building = buildingByFacility.get(f._id) ?? null;

      // Single source of truth — the same lifecycle view every other surface
      // reads (dashboard KPIs, block/PHC bars, Reports), so this summary can
      // never disagree with them about "certified" / "result awaited".
      const view = deriveLifecycleView(f, sa, nqas, settings, today);
      const accFor = (m: Map<string, Acc>, key: string) => {
        const acc = m.get(key) ?? blank();
        acc.target += 1;
        if (view.isQualityCertified) acc.certified += 1;
        if (view.isConditional) acc.conditional += 1;
        if (view.isDeferred) acc.deferred += 1;
        // One shared zone rule decides which document-pipeline column a
        // facility lands in — the identical rule the Reports summary (client)
        // applies, so the dashboard table and Reports always agree.
        const hasDocStage =
          !!sa?.generalDocStatus && docColumnSet.has(sa.generalDocStatus);
        const zone = docPipelineZone(view, sa?.status ?? null, hasDocStage);
        if (zone === "nqasScheduled") acc.nqasScheduled += 1;
        else if (zone === "resultAwaited") acc.resultAwaited += 1;
        else if (zone === "nextPhase") acc.nextPhase += 1;
        // SaQsham Documents Status = the 6-stage generalDocStatus pipeline
        // (minus the two stages that duplicate dedicated columns).
        if (hasDocStage && sa?.generalDocStatus) {
          acc.docCounts.set(
            sa.generalDocStatus,
            (acc.docCounts.get(sa.generalDocStatus) ?? 0) + 1,
          );
        }
        if (building?.buildingStatus) {
          acc.buildingCounts.set(
            building.buildingStatus,
            (acc.buildingCounts.get(building.buildingStatus) ?? 0) + 1,
          );
          acc.buildingTotal += 1;
        }
        m.set(key, acc);
      };
      accFor(byType, f.facilityType);
      accFor(byBlock, f.block);
    }

    const render = (m: Map<string, Acc>): TypeWiseStat[] =>
      [...m.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([label, acc]) => ({
          label,
          target: acc.target,
          certified: acc.certified,
          conditional: acc.conditional,
          totalCertified: acc.certified + acc.conditional,
          certifiedPct:
            acc.target > 0
              ? Math.round(((acc.certified + acc.conditional) / acc.target) * 100)
              : 0,
          deferred: acc.deferred,
          nqasScheduled: acc.nqasScheduled,
          resultAwaited: acc.resultAwaited,
          nextPhase: acc.nextPhase,
          docPipeline: docColumnStatuses.map((s) => ({
            status: s,
            count: acc.docCounts.get(s) ?? 0,
          })),
          // Total = the summary's own column sum (same formula the client
          // summary uses), so every row adds up on screen and in the exports.
          docTotal:
            acc.nqasScheduled +
            acc.resultAwaited +
            acc.nextPhase +
            [...acc.docCounts.values()].reduce((a, b) => a + b, 0),
          building: buildingStatuses.map((s) => ({
            status: s,
            count: acc.buildingCounts.get(s) ?? 0,
          })),
          buildingTotal: acc.buildingTotal,
        }));

    return {
      byType: render(byType),
      byBlock: render(byBlock),
      docStatuses: docColumnStatuses,
      buildingStatuses,
      me: { appRole: user.appRole },
    };
  },
});
