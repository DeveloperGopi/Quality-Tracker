/**
 * BLOCK COMPARE — one aggregated query for the whole page.
 *
 * The page never asks the database per row or per block. This query batches the
 * facilities, active cycles, assessments, IA quarters, documents, funds,
 * buildings, Fire NOCs and logged follow-up issues once, scopes them to the
 * signed-in user's blocks (DQC / DQMO / State Admin are state-wide) and returns
 * seven block rows plus the district KPI strip.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  allowedBlockNames,
  getSettings,
  requireActivatedUser,
} from "./facilities";
import { deriveLifecycleView, todayIso } from "./lifecycle";
import {
  normalizeDocumentRules,
  requiredDocumentIssues,
} from "../lib/documentRules";
import { canonicalDocKey } from "./storage/validation";
import {
  computePendingIssues,
  latestCompletedQuarter,
  normalizePendingConfig,
  type PendingRow,
} from "../lib/pending";
import { AREA_KEYS, type AreaKey } from "../lib/annexureParse";

const ALLOWED_ROLES = new Set(["admin", "dqc", "dqmo"]);

export const getBlockCompare = query({
  args: {
    facilityType: v.optional(v.string()),
    /** "current" (default) or a 1-based cycle number. */
    cycle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireActivatedUser(ctx);
    if (!me.appRole || !ALLOWED_ROLES.has(me.appRole)) {
      throw new Error("Block Compare is available to State Admin, DQC and DQMO");
    }

    const settings = await getSettings(ctx);
    const today = todayIso();
    const allowed = await allowedBlockNames(ctx, me);
    const [
      facilitiesAll,
      cyclesAll,
      saAll,
      naAll,
      iaAll,
      docsAll,
      fundsAll,
      buildingsAll,
      nocsAll,
      blockRows,
      scoreAll,
      areaAll,
      deptAll,
    ] = await Promise.all([
      ctx.db.query("facilities").collect(),
      ctx.db.query("certificationCycles").collect(),
      ctx.db.query("stateAssessments").collect(),
      ctx.db.query("nationalAssessments").collect(),
      ctx.db.query("facilityIaQuarters").collect(),
      ctx.db.query("facilityDocuments").collect(),
      ctx.db.query("gapClosureFunds").collect(),
      ctx.db.query("buildingDetails").collect(),
      ctx.db.query("fireNocs").collect(),
      ctx.db.query("blocks").withIndex("by_name").collect(),
      ctx.db.query("annexureScores").collect(),
      ctx.db.query("annexureAreaScores").collect(),
      ctx.db.query("annexureDepartmentScores").collect(),
    ]);

    const facilityType = (args.facilityType ?? "").trim();
    const cycleFilter = (args.cycle ?? "current").trim() || "current";
    const numericCycle = /^\d+$/.test(cycleFilter) ? Number(cycleFilter) : null;
    // A numbered cycle is a real scope: facilities without that cycle drop
    // out, exactly like the Master List's cycle filter. "current" keeps every
    // facility (its stored pointer may be stale or empty).
    const cycleFacilityIds =
      numericCycle == null
        ? null
        : new Set(
            cyclesAll
              .filter((cycle) => cycle.cycleNumber === numericCycle)
              .map((cycle) => String(cycle.facilityId)),
          );
    const facilities = facilitiesAll.filter(
      (f) =>
        (!allowed || allowed.has(f.block)) &&
        (!facilityType || f.facilityType === facilityType) &&
        (!cycleFacilityIds || cycleFacilityIds.has(String(f._id))),
    );
    const scopedIds = new Set(facilities.map((f) => String(f._id)));

    // The section compares ONE cycle: the page's cycle filter, or otherwise
    // the latest cycle that has any saved scores. This keeps every block on
    // the same cycle instead of mixing Cycle #1 and Cycle #2 in one heatmap.
    const scopedScores = scoreAll.filter((score) => {
      if (!scopedIds.has(String(score.facilityId))) return false;
      return numericCycle == null || score.cycleNumber === numericCycle;
    });
    const latestScoreCycle = scopedScores.reduce<number | null>(
      (latest, score) =>
        latest == null || score.cycleNumber > latest ? score.cycleNumber : latest,
      null,
    );
    const scoreCycle =
      scopedScores.length === 0 ? null : (numericCycle ?? latestScoreCycle);
    const chosenScoreByFacility = new Map<string, (typeof scoreAll)[number]>();
    for (const score of scopedScores) {
      if (score.cycleNumber !== scoreCycle) continue;
      const facilityId = String(score.facilityId);
      const previous = chosenScoreByFacility.get(facilityId);
      if (!previous || score.parsedAt > previous.parsedAt) {
        chosenScoreByFacility.set(facilityId, score);
      }
    }
    const chosenScoreIds = new Set(
      [...chosenScoreByFacility.values()].map((score) => String(score._id)),
    );
    const areasByScore = new Map<string, (typeof areaAll)[number][]>();
    for (const area of areaAll) {
      const key = String(area.scoreId);
      if (!chosenScoreIds.has(key)) continue;
      const list = areasByScore.get(key) ?? [];
      list.push(area);
      areasByScore.set(key, list);
    }
    const departmentsByScore = new Map<string, (typeof deptAll)[number][]>();
    for (const department of deptAll) {
      const key = String(department.scoreId);
      if (!chosenScoreIds.has(key)) continue;
      const list = departmentsByScore.get(key) ?? [];
      list.push(department);
      departmentsByScore.set(key, list);
    }

    const cyclesByFacility = new Map<string, typeof cyclesAll>();
    for (const cycle of cyclesAll) {
      if (!scopedIds.has(String(cycle.facilityId))) continue;
      const key = String(cycle.facilityId);
      const list = cyclesByFacility.get(key) ?? [];
      list.push(cycle);
      cyclesByFacility.set(key, list);
    }
    for (const list of cyclesByFacility.values()) {
      list.sort((a, b) => a.cycleNumber - b.cycleNumber);
    }
    const activeCycleOf = (facility: (typeof facilities)[number]) => {
      const list = cyclesByFacility.get(String(facility._id)) ?? [];
      if (numericCycle != null) {
        return list.find((c) => c.cycleNumber === numericCycle) ?? null;
      }
      return (
        list.find((c) => c.cycleNumber === facility.currentCycleNumber) ??
        list.find((c) => !c.superseded) ??
        list[list.length - 1] ??
        null
      );
    };

    const saByCycle = new Map(saAll.map((row) => [String(row.cycleId), row]));
    const naByCycle = new Map(naAll.map((row) => [String(row.cycleId), row]));
    const iaByFacility = new Map<string, typeof iaAll>();
    for (const row of iaAll) {
      if (!scopedIds.has(String(row.facilityId))) continue;
      const key = String(row.facilityId);
      const list = iaByFacility.get(key) ?? [];
      list.push(row);
      iaByFacility.set(key, list);
    }
    const docsByFacility = new Map<string, Set<string>>();
    for (const doc of docsAll) {
      const key = String(doc.facilityId);
      if (!scopedIds.has(key) || !doc.isCurrent || doc.removedAt) continue;
      const set = docsByFacility.get(key) ?? new Set<string>();
      set.add(canonicalDocKey(doc.docKey));
      docsByFacility.set(key, set);
    }
    const fundByFacility = new Map<string, (typeof fundsAll)[number]>();
    for (const fund of fundsAll) {
      const key = String(fund.facilityId);
      if (!scopedIds.has(key)) continue;
      const previous = fundByFacility.get(key);
      if (
        !previous ||
        String(fund.financialYear ?? "") >= String(previous.financialYear ?? "")
      ) {
        fundByFacility.set(key, fund);
      }
    }
    // Same picks as the Master List rows: the first building and the Fire NOC
    // with the latest expiry. Otherwise a cell and the list it opens can count
    // different records for the same facility.
    const buildingByFacility = new Map<string, (typeof buildingsAll)[number]>();
    for (const building of buildingsAll) {
      const key = String(building.facilityId);
      if (!scopedIds.has(key) || buildingByFacility.has(key)) continue;
      buildingByFacility.set(key, building);
    }
    const nocByFacility = new Map<string, (typeof nocsAll)[number]>();
    for (const noc of nocsAll) {
      const key = String(noc.facilityId);
      if (!scopedIds.has(key)) continue;
      const previous = nocByFacility.get(key);
      if (
        !previous ||
        (noc.expiryDate ?? "").localeCompare(previous.expiryDate ?? "") >= 0
      ) {
        nocByFacility.set(key, noc);
      }
    }

    const documentRules = normalizeDocumentRules(
      (settings as unknown as { documentRules?: unknown }).documentRules,
    );
    const iaSorted = (facilityId: string) =>
      (iaByFacility.get(facilityId) ?? [])
        .filter((row) => !row.notApplicable)
        .sort(
          (a, b) =>
            a.fy.localeCompare(b.fy) || a.quarter - b.quarter,
        );

    type BlockAccumulator = {
      block: string;
      facilities: number;
      holdCertificate: number;
      deferred: number;
      nqasSum: number;
      nqasCount: number;
      kayakalpSum: number;
      kayakalpCount: number;
      changeSum: number;
      changeCount: number;
      docsMissing: number;
      scoredFacilities: number;
      areaSum: Record<string, number>;
      areaCount: Record<string, number>;
      departmentSums: Map<string, { sum: number; count: number }>;
    };
    const blockNames = new Set<string>(
      blockRows
        .filter((block) => block.active !== false)
        .map((block) => block.name)
        .filter((name) => !allowed || allowed.has(name)),
    );
    for (const facility of facilities) blockNames.add(facility.block);
    const perBlock = new Map<string, BlockAccumulator>();
    for (const block of blockNames) {
      perBlock.set(block, {
        block,
        facilities: 0,
        holdCertificate: 0,
        deferred: 0,
        nqasSum: 0,
        nqasCount: 0,
        kayakalpSum: 0,
        kayakalpCount: 0,
        changeSum: 0,
        changeCount: 0,
        docsMissing: 0,
        scoredFacilities: 0,
        areaSum: Object.fromEntries(AREA_KEYS.map((key) => [key, 0])),
        areaCount: Object.fromEntries(AREA_KEYS.map((key) => [key, 0])),
        departmentSums: new Map(),
      });
    }

    let districtHold = 0;
    let districtDeferred = 0;
    let districtNqasSum = 0;
    let districtNqasCount = 0;
    let districtKayakalpSum = 0;
    let districtKayakalpCount = 0;
    let districtDocsMissing = 0;

    for (const facility of facilities) {
      const stats = perBlock.get(facility.block);
      if (!stats) continue;
      stats.facilities += 1;

      const activeCycle = activeCycleOf(facility);
      const sa = activeCycle ? (saByCycle.get(String(activeCycle._id)) ?? null) : null;
      const nqas = activeCycle
        ? (naByCycle.get(String(activeCycle._id)) ?? null)
        : null;
      const view = deriveLifecycleView(facility, sa, nqas, settings, today);
      const hold = view.isQualityCertified || view.isConditional;
      if (hold) {
        stats.holdCertificate += 1;
        districtHold += 1;
      }
      if (view.isDeferred) {
        stats.deferred += 1;
        districtDeferred += 1;
      }

      const ia = iaSorted(String(facility._id));
      // Read the SAME latest / previous periods the Master List pair reads:
      // the newest quarter and the one before it, not the latest non-blank
      // score from any older quarter. Legacy Q1/Q2 is only the no-store
      // fallback (and then it supplies both sides).
      const latestPeriod = ia[ia.length - 1];
      const previousPeriod = ia[ia.length - 2];
      const nqasLatest = latestPeriod
        ? (latestPeriod.nqasIaScore ?? null)
        : (facility.nqasIaQ2 ?? null);
      const nqasPrevious = latestPeriod
        ? (previousPeriod?.nqasIaScore ?? null)
        : (facility.nqasIaQ1 ?? null);
      const kayakalpLatest = latestPeriod
        ? (latestPeriod.kayakalpIaScore ?? null)
        : (facility.kayakalpIaQ2 ?? null);
      if (nqasLatest != null) {
        stats.nqasSum += nqasLatest;
        stats.nqasCount += 1;
        districtNqasSum += nqasLatest;
        districtNqasCount += 1;
      }
      if (kayakalpLatest != null) {
        stats.kayakalpSum += kayakalpLatest;
        stats.kayakalpCount += 1;
        districtKayakalpSum += kayakalpLatest;
        districtKayakalpCount += 1;
      }
      if (nqasLatest != null && nqasPrevious != null) {
        stats.changeSum += nqasLatest - nqasPrevious;
        stats.changeCount += 1;
      }

      const fund = fundByFacility.get(String(facility._id));
      const building = buildingByFacility.get(String(facility._id));
      const noc = nocByFacility.get(String(facility._id));
      const missing = requiredDocumentIssues(
        {
          presentKeys: [...(docsByFacility.get(String(facility._id)) ?? [])],
          certStatus: nqas?.certificationStatus ?? null,
          gapAmount: fund?.amountSanctioned ?? 0,
          dilapidated:
            (building?.buildingStatus ?? "").toLowerCase() === "dilapidated",
          fireNocRecorded:
            !!noc &&
            ((noc.nocAvailable ?? "") === "Yes" || !!noc.issuedDate),
        },
        documentRules,
      );
      if (missing.length > 0) {
        stats.docsMissing += 1;
        districtDocsMissing += 1;
      }

      const score = chosenScoreByFacility.get(String(facility._id));
      if (score) {
        stats.scoredFacilities += 1;
        for (const area of areasByScore.get(String(score._id)) ?? []) {
          if (!(AREA_KEYS as readonly string[]).includes(area.areaKey)) continue;
          stats.areaSum[area.areaKey] += area.score;
          stats.areaCount[area.areaKey] += 1;
        }
        for (const department of departmentsByScore.get(String(score._id)) ?? []) {
          const key = department.canonicalName.trim() || department.name.trim();
          if (!key) continue;
          const entry = stats.departmentSums.get(key) ?? { sum: 0, count: 0 };
          entry.sum += department.score;
          entry.count += 1;
          stats.departmentSums.set(key, entry);
        }
      }
    }

    // Pending issues: the SAME registry the Master List metric and the bell
    // read, so a heatmap cell and the list it opens cannot disagree.
    const pendingConfig = normalizePendingConfig(
      (settings as unknown as { pendingRules?: unknown }).pendingRules,
    );
    const latestQuarter = latestCompletedQuarter(today);
    const pendingRows: PendingRow[] = facilities.map((facility) => {
      const activeCycle = activeCycleOf(facility);
      const latestIa = (iaByFacility.get(String(facility._id)) ?? []).find(
        (row) =>
          row.fy === latestQuarter.fy && row.quarter === latestQuarter.quarter,
      );
      return {
        facility: {
          _id: String(facility._id),
          name: facility.name,
          block: facility.block,
          phc: facility.phc ?? "",
          facilityType: facility.facilityType ?? "",
          ninNumber: facility.ninNumber ?? null,
          eligibility: facility.eligibility ?? null,
          currentStatus: facility.currentStatus ?? null,
          lastChangedAt: facility.lastChangedAt ?? null,
          updatedAt: facility.updatedAt ?? null,
        },
        cycleNumber: activeCycle?.cycleNumber ?? facility.currentCycleNumber ?? null,
        docs: {
          uploaded: docsByFacility.get(String(facility._id))?.size ?? 0,
          total: docsByFacility.get(String(facility._id))?.size ?? 0,
          keys: [...(docsByFacility.get(String(facility._id)) ?? [])],
        },
        sa: activeCycle ? (saByCycle.get(String(activeCycle._id)) ?? null) : null,
        nqas: activeCycle ? (naByCycle.get(String(activeCycle._id)) ?? null) : null,
        fund: fundByFacility.get(String(facility._id)) ?? null,
        noc: nocByFacility.get(String(facility._id)) ?? null,
        building: buildingByFacility.get(String(facility._id)) ?? null,
        latestIa: latestIa
          ? {
              fy: latestIa.fy,
              quarter: latestIa.quarter,
              score: latestIa.nqasIaScore ?? null,
              notApplicable: latestIa.notApplicable === true,
            }
          : null,
      };
    });
    const blockByFacility = new Map(
      pendingRows.map((row) => [row.facility._id, row.facility.block]),
    );
    const pendingFacilitiesByBlock = new Map<string, Set<string>>();
    for (const issue of computePendingIssues(pendingRows, {
      today,
      config: pendingConfig,
      documentRules,
      settings: settings as never,
    })) {
      const block = blockByFacility.get(issue.facilityId);
      if (!block || !blockNames.has(block)) continue;
      const set = pendingFacilitiesByBlock.get(block) ?? new Set<string>();
      set.add(issue.facilityId);
      pendingFacilitiesByBlock.set(block, set);
    }

    const avg = (sum: number, count: number): number | null =>
      count > 0 ? Math.round((sum / count) * 10) / 10 : null;
    // Scores keep two decimals: a block with one scored facility must print
    // exactly the value saved from the PDF, not a rounded version.
    const scoreAvg = (sum: number, count: number): number | null =>
      count > 0 ? Math.round((sum / count) * 100) / 100 : null;
    const blocks = [...perBlock.values()]
      .map((row) => ({
        block: row.block,
        facilities: row.facilities,
        holdCertificate: row.holdCertificate,
        certifiedPct:
          row.facilities > 0
            ? Math.round((row.holdCertificate / row.facilities) * 100)
            : null,
        deferred: row.deferred,
        avgNqasIa: avg(row.nqasSum, row.nqasCount),
        iaChange: avg(row.changeSum, row.changeCount),
        avgKayakalpIa: avg(row.kayakalpSum, row.kayakalpCount),
        docsMissing: row.docsMissing,
        pendingIssues: pendingFacilitiesByBlock.get(row.block)?.size ?? 0,
        scores: {
          facilities: row.scoredFacilities,
          areas: AREA_KEYS.map((key) => ({
            key,
            value: scoreAvg(row.areaSum[key] ?? 0, row.areaCount[key] ?? 0),
          })),
          weakestArea: (() => {
            let weakest: { key: AreaKey; value: number } | null = null;
            for (const key of AREA_KEYS) {
              const value = scoreAvg(row.areaSum[key] ?? 0, row.areaCount[key] ?? 0);
              if (value == null) continue;
              if (weakest == null || value < weakest.value) weakest = { key, value };
            }
            return weakest;
          })(),
          departments: [...row.departmentSums.entries()]
            .map(([canonicalName, entry]) => ({
              canonicalName,
              value: scoreAvg(entry.sum, entry.count),
              facilities: entry.count,
            }))
            .filter(
              (entry): entry is { canonicalName: string; value: number; facilities: number } =>
                entry.value != null,
            )
            .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName)),
        },
      }))
      .sort(
        (a, b) =>
          (b.certifiedPct ?? -1) - (a.certifiedPct ?? -1) ||
          a.block.localeCompare(b.block),
      );

    const cycleNumbers = [
      ...new Set(cyclesAll.map((cycle) => cycle.cycleNumber)),
    ].sort((a, b) => a - b);
    const facilityTypes = [
      ...new Set([
        ...((settings.facilityTypes as string[] | undefined) ?? []),
        ...facilitiesAll.map((facility) => facility.facilityType),
      ]),
    ]
      .filter(Boolean)
      .sort();
    const defaults = {
      facilityType:
        typeof settings.blockCompareFacilityType === "string"
          ? settings.blockCompareFacilityType
          : "",
      cycle:
        typeof settings.blockCompareCycle === "string"
          ? settings.blockCompareCycle
          : "current",
    };

    return {
      blocks,
      cycles: cycleNumbers,
      scoreCycle,
      facilityTypes,
      defaults,
      totals: {
        facilities: facilities.length,
        holdCertificate: districtHold,
        deferred: districtDeferred,
        avgNqasIa: avg(districtNqasSum, districtNqasCount),
        avgKayakalpIa: avg(districtKayakalpSum, districtKayakalpCount),
        docsMissing: districtDocsMissing,
      },
    };
  },
});
