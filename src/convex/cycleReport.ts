import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  requireActivatedUser,
  getSettings,
  allowedBlockNames,
} from "./facilities";
import { DEFAULT_SETTINGS, todayIso } from "./lifecycle";

/**
 * FACILITY-CYCLE ROWS — one row per facility in one certification cycle.
 *
 * The unit of the Cycle report is the facility-cycle (a facility in Cycle #1
 * and again in Cycle #2 is two rows but one distinct facility). `getReportData`
 * deliberately returns one row per facility, so it cannot feed this report.
 *
 * Read-only; block-scoped exactly like every other report read. Six table
 * scans total (facilities, cycles, SA, NQAS, buildings), never a Drive call.
 */
export const getFacilityCycleRows = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    const allowed = await allowedBlockNames(ctx, user);
    const settings = await getSettings(ctx);

    let facilities = await ctx.db.query("facilities").collect();
    if (allowed !== null) facilities = facilities.filter((f) => allowed.has(f.block));
    const idSet = new Set(facilities.map((f) => f._id));

    const [allCycles, allSas, allNas, allBuildings, allNocs] = await Promise.all([
      ctx.db.query("certificationCycles").collect(),
      ctx.db.query("stateAssessments").collect(),
      ctx.db.query("nationalAssessments").collect(),
      ctx.db.query("buildingDetails").collect(),
      ctx.db.query("fireNocs").collect(),
    ]);
    const saByCycle = new Map(allSas.map((s) => [s.cycleId, s]));
    const naByCycle = new Map(allNas.map((n) => [n.cycleId, n]));
    const buildingByFacility = new Map<Id<"facilities">, (typeof allBuildings)[number]>();
    for (const b of allBuildings) {
      if (!idSet.has(b.facilityId)) continue;
      if (!buildingByFacility.has(b.facilityId)) buildingByFacility.set(b.facilityId, b);
    }
    const nocByFacility = new Map<Id<"facilities">, (typeof allNocs)[number]>();
    for (const n of allNocs) {
      if (!idSet.has(n.facilityId)) continue;
      if (!nocByFacility.has(n.facilityId)) nocByFacility.set(n.facilityId, n);
    }

    const byFacility = new Map<string, typeof allCycles>();
    for (const c of allCycles) {
      if (!idSet.has(c.facilityId)) continue;
      const list = byFacility.get(String(c.facilityId)) ?? [];
      list.push(c);
      byFacility.set(String(c.facilityId), list);
    }

    const rows = [] as {
      facilityId: string;
      facility: string;
      block: string;
      phc: string;
      type: string;
      nin: string | null;
      eligibility: string;
      currentStatus: string;
      currentCycleNumber: number | null;
      documentsStatusReport: string | null;
      cycleId: string;
      cycleNumber: number;
      cycleType: string;
      superseded: boolean;
      recertStage: string | null;
      cycleCreatedAt: number;
      saStatus: string | null;
      saScheduledDate: string | null;
      saStartDate: string | null;
      saEndDate: string | null;
      saScore: number | null;
      generalDocStatus: string | null;
      naStatus: string | null;
      naScheduledDate: string | null;
      naEndDate: string | null;
      naMode: string | null;
      certStatus: string | null;
      certDate: string | null;
      goiLetterDate: string | null;
      certScore: number | null;
      manualScore: number | null;
      validityDate: string | null;
      surveillanceDue1: string | null;
      surveillanceDone1: string | null;
      surveillanceDue2: string | null;
      surveillanceDone2: string | null;
      recertStatus: string | null;
      recertYear: string | null;
      buildingStatus: string | null;
      nocStatus: string | null;
    }[];

    for (const f of facilities) {
      const cycles = (byFacility.get(String(f._id)) ?? []).sort(
        (a, b) => a.cycleNumber - b.cycleNumber,
      );
      const building = buildingByFacility.get(f._id) ?? null;
      for (const cycle of cycles) {
        const sa = saByCycle.get(cycle._id) ?? null;
        const nqas = naByCycle.get(cycle._id) ?? null;
        rows.push({
          facilityId: String(f._id),
          facility: f.name,
          block: f.block,
          phc: f.phc,
          type: f.facilityType,
          nin: f.ninNumber ?? null,
          eligibility: f.eligibility,
          currentStatus: f.currentStatus,
          currentCycleNumber: f.currentCycleNumber ?? null,
          documentsStatusReport: f.documentsStatusReport ?? null,
          cycleId: String(cycle._id),
          cycleNumber: cycle.cycleNumber,
          cycleType: cycle.cycleType,
          superseded: !!cycle.superseded,
          recertStage: cycle.recertStage ?? null,
          cycleCreatedAt: cycle.createdAt,
          saStatus: sa?.status ?? null,
          saScheduledDate: sa?.scheduledDate ?? null,
          saStartDate: sa?.actualStartDate ?? sa?.scheduledDate ?? null,
          saEndDate: sa?.actualEndDate ?? null,
          saScore: sa?.scorePercent ?? null,
          generalDocStatus: sa?.generalDocStatus ?? null,
          naStatus: nqas?.status ?? null,
          naScheduledDate: nqas?.scheduledStartDate ?? null,
          naEndDate: nqas?.actualEndDate ?? nqas?.scheduledEndDate ?? null,
          naMode: nqas?.mode ?? null,
          certStatus: nqas?.certificationStatus ?? null,
          certDate: nqas?.certificationDate ?? null,
          goiLetterDate: nqas?.goiLetterDate ?? null,
          // Part 0.1 — a stored 0 is a blank the old import parser wrote
          // (ops.ts parseScore accepted "0"); a blank is never 0.
          certScore:
            nqas?.scorePercent != null && nqas.scorePercent > 0
              ? nqas.scorePercent
              : null,
          manualScore: nqas?.manualScore ?? null,
          validityDate: nqas?.validityDate ?? null,
          surveillanceDue1: nqas?.surveillanceDue1 ?? null,
          surveillanceDone1: nqas?.surveillanceDone1 ?? null,
          surveillanceDue2: nqas?.surveillanceDue2 ?? null,
          surveillanceDone2: nqas?.surveillanceDone2 ?? null,
          recertStatus: nqas?.manualRecertStatus ?? null,
          recertYear: nqas?.recertYear ?? null,
          buildingStatus: building?.buildingStatus ?? null,
          nocStatus: nocByFacility.get(f._id)?.status ?? null,
        });
      }
    }
    rows.sort(
      (a, b) =>
        a.facility.localeCompare(b.facility) || a.cycleNumber - b.cycleNumber,
    );

    return {
      rows,
      generatedAt: todayIso(),
      settings: {
        surveillanceAlertLeadDays:
          settings.surveillanceAlertLeadDays ??
          DEFAULT_SETTINGS.surveillanceAlertLeadDays,
        recertificationAlertLeadDays:
          settings.recertificationAlertLeadDays ??
          DEFAULT_SETTINGS.recertificationAlertLeadDays,
        generalDocStatuses:
          (settings as Record<string, unknown>).generalDocStatuses as
            | string[]
            | undefined ?? DEFAULT_SETTINGS.generalDocStatuses,
        certificationStatuses:
          settings.certificationStatuses ?? DEFAULT_SETTINGS.certificationStatuses,
      },
      me: { appRole: user.appRole },
    };
  },
});
