import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports } from './icons-BxQpodNr.js';
import { c as cn } from './index-CBV6wOh8.js';
import { a as ORG_NAME, O as ORG_SIGNATURE } from './org-DjtYn14q.js';
import { P as PIPELINE_STAGES, D as DEFAULT_SETTINGS, Q as FACILITY_CURRENT_STATUS_LABEL, T as pipelineStageOf, m as deriveFlatLifecycle, U as hasIaScores } from './AppShell-CP099uvN.js';
import { t as todayLocalIso } from './today-D9v8Esj5.js';
import { c as currentFiscalYear, a as fiscalYearOf, f as fiscalYearLabel } from './fiscalYear-QbChygln.js';
import { e as emptyBuildingCounts, b as buildingBucketOf, B as BUILDING_BUCKET_ORDER } from './buildingBuckets-CQds7ysI.js';

function buildingGroupSummary(rows) {
  const counts = emptyBuildingCounts();
  for (const r of rows) counts[buildingBucketOf(r.buildingStatus)] += 1;
  const total = rows.length;
  return { counts, order: BUILDING_BUCKET_ORDER, total };
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
const round1 = (n) => Math.round(n * 10) / 10;
function mean(nums) {
  if (nums.length === 0) return null;
  return round1(nums.reduce((a, b) => a + b, 0) / nums.length);
}
function monthsLabelOf(dates) {
  const ms = [...new Set(dates.map((d) => Number(d.slice(5, 7))))].sort((a, b) => a - b);
  if (ms.length === 0) return "Month not recorded";
  const parts = [];
  let start = ms[0];
  let prev = ms[0];
  for (let i = 1; i <= ms.length; i++) {
    const cur = ms[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    parts.push(start === prev ? MONTHS[start - 1] : `${MONTHS[start - 1]} - ${MONTHS[prev - 1]}`);
    start = cur;
    prev = cur;
  }
  return parts.join(" · ");
}
function monthsShortList(dates) {
  const ms = [...new Set(dates.map((d) => MONTHS[Number(d.slice(5, 7)) - 1]))];
  return ms.join(", ");
}
function deckView(r, today) {
  return deriveFlatLifecycle(
    {
      currentStatus: r.currentStatus,
      certStatus: r.certStatus,
      // naStatus matters: an explicit "Scheduled" with no date must still
      // count, exactly as the dashboard's shared view counts it.
      naStatus: r.naStatus,
      naStartDate: r.naScheduledDate,
      docStatus: r.generalDocStatus,
      // Internal Assessment bucket — same IA rule the dashboard reads off
      // the facility row, so the deck and the strip never disagree.
      iaDone: hasIaScores(r)
    },
    today
  );
}
function isQuality(r) {
  return deckView(r, todayLocalIso()).isQualityCertified;
}
function isCond(r) {
  return deckView(r, todayLocalIso()).isConditional;
}
function isCertifiedRow(r) {
  const v = deckView(r, todayLocalIso());
  return v.isQualityCertified || v.isConditional;
}
const isCertifiedView = (v) => v.isQualityCertified || v.isConditional;
function nocStatusOfRow(r, today) {
  const hasStatus = (r.fireNocStatus ?? "").trim() !== "";
  if (!hasStatus && !r.fireNocExpiry) return "Not recorded";
  if (!r.fireNocExpiry) return "Recorded, no validity date";
  const left = Math.round(
    (Date.parse(r.fireNocExpiry + "T12:00:00") - Date.parse(today + "T12:00:00")) / 864e5
  );
  if (left < 0) return "Expired";
  if (left <= DEFAULT_SETTINGS.fireNocAlertLeadDays) return "Expiring Soon";
  return "Valid";
}
function buildDeckData(rows) {
  const today = todayLocalIso();
  const totalFacilities = rows.length;
  const blocksCount = new Set(rows.map((r) => r.block)).size;
  const views = /* @__PURE__ */ new Map();
  const flags = (r) => {
    let v = views.get(r);
    if (!v) {
      v = deckView(r, today);
      views.set(r, v);
    }
    return v;
  };
  const stageOf = (r) => pipelineStageOf(flags(r), r.eligibility);
  const isCertified = (r) => isCertifiedView(flags(r));
  const stageCount = (stage) => rows.filter((r) => stageOf(r) === stage).length;
  const certified = rows.filter(isCertified);
  const qualityCount = rows.filter((r) => flags(r).isQualityCertified).length;
  const condCount = rows.filter((r) => flags(r).isConditional).length;
  const certifiedTotal = certified.length;
  const certifiedPct = totalFacilities > 0 ? Math.round(certifiedTotal / totalFacilities * 100) : 0;
  const slices = PIPELINE_STAGES.map((s) => ({
    label: s.label,
    count: stageCount(s.key)
  })).filter((s) => s.count > 0);
  const dated = certified.filter((r) => r.certDate);
  const yearSet = new Set(dated.map((r) => Number(r.certDate.slice(0, 4))));
  const undated = certifiedTotal - dated.length;
  const undatedRows = certified.filter((r) => !r.certDate);
  const undatedQuality = undatedRows.filter((r) => flags(r).isQualityCertified).length;
  const undatedCond = undatedRows.filter((r) => flags(r).isConditional).length;
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const minYear = yearSet.size ? Math.min(...yearSet) : currentYear;
  const maxYear = Math.max(currentYear, ...yearSet.size ? [...yearSet] : [currentYear]);
  const byYear = [];
  for (let y = minYear; y <= maxYear; y++) {
    const list = dated.filter((r) => Number(r.certDate.slice(0, 4)) === y);
    byYear.push({
      year: y,
      total: list.length,
      quality: list.filter(isQuality).length,
      cond: list.filter(isCond).length,
      avgPct: mean(list.map((r) => r.certScore).filter((s) => s != null))
    });
  }
  const recentStart = maxYear - 1;
  const recent = dated.filter((r) => Number(r.certDate.slice(0, 4)) >= recentStart);
  const recentSharePct = certifiedTotal > 0 ? Math.round(recent.length / certifiedTotal * 100) : 0;
  const yearMonth = byYear.map(({ year }) => {
    const months = Array(12).fill(0);
    for (const r of dated) {
      if (Number(r.certDate.slice(0, 4)) === year)
        months[Number(r.certDate.slice(5, 7)) - 1] += 1;
    }
    return {
      year,
      yearLabel: year === currentYear ? `${year}*` : String(year),
      months,
      total: months.reduce((a, b) => a + b, 0)
    };
  });
  const monthTotals = Array(12).fill(0);
  for (const ym of yearMonth)
    ym.months.forEach((c, i) => monthTotals[i] += c);
  const grandTotalDated = dated.length;
  let busiestPair = null;
  {
    const indexed = monthTotals.map((c, i) => ({ i, c })).sort((a, b) => b.c - a.c);
    if (indexed.length >= 2 && indexed[0].c > 0) {
      const top2 = indexed[0];
      const second = indexed[1];
      const count = grandTotalDated > 0 ? Math.round((top2.c + second.c) / grandTotalDated * 100) : 0;
      busiestPair = {
        months: `${MONTHS[top2.i]} and ${MONTHS[second.i]}`,
        count: top2.c + second.c,
        sharePct: count
      };
    }
  }
  const earlyYears = [];
  for (const y of byYear) {
    if (y.year >= recentStart) continue;
    const list = dated.filter((r) => Number(r.certDate.slice(0, 4)) === y.year);
    const types = [...new Set(list.map((r) => r.type))];
    earlyYears.push({
      year: y.year,
      count: y.total,
      monthsLabel: list.length ? monthsLabelOf(list.map((r) => r.certDate)) : "Month not recorded",
      detail: list.length ? `${list.length} certified (${monthsShortList(list.map((r) => r.certDate))}) — ${types.join(", ")}` + (y.cond > 0 ? ` · ${y.cond} with conditionality` : "") + (y.avgPct != null ? ` · avg ${y.avgPct}%` : "") : "No certification date recorded in the source data."
    });
  }
  const earlyCount = byYear.filter((y) => y.year < recentStart).reduce((a, b) => a + b.total, 0);
  const earlyNote = `Only ${earlyCount} facilities were certified before ${recentStart}, mostly ${[...new Set(dated.filter((r) => Number(r.certDate.slice(0, 4)) < recentStart).map((r) => r.type))].join("s, ")}s.`;
  const yearDetails = [recentStart, maxYear].map((year) => {
    const list = dated.filter((r) => Number(r.certDate.slice(0, 4)) === year);
    const byMonth = /* @__PURE__ */ new Map();
    for (const r of list) {
      const m = Number(r.certDate.slice(5, 7));
      byMonth.set(m, [...byMonth.get(m) ?? [], r]);
    }
    const months = [...byMonth.entries()].sort((a, b) => a[0] - b[0]).map(([m, rs]) => ({
      month: m,
      label: MONTHS[m - 1],
      quality: rs.filter(isQuality).length,
      cond: rs.filter(isCond).length,
      total: rs.length,
      avgPct: mean(rs.map((r) => r.certScore).filter((s) => s != null))
    }));
    const cond = list.filter(isCond).length;
    const virtualCount = list.filter((r) => (r.naMode ?? "").toLowerCase().includes("virtual")).length;
    const physicalCount = list.filter((r) => (r.naMode ?? "").toLowerCase().includes("physic")).length;
    const typeTally = /* @__PURE__ */ new Map();
    for (const r of list) typeTally.set(r.type, (typeTally.get(r.type) ?? 0) + 1);
    const typeMix = [...typeTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, c]) => `${t} ${c}`).join(" · ");
    const list2 = byYear.find((y) => y.year === year);
    const isCurrent = year === currentYear;
    const busiest = [...months].sort((a, b) => b.total - a.total)[0];
    const headline = isCurrent ? `${list.length} certified so far` + (cond > 0 ? `, ${cond} carry conditionality` : "") + (list2?.avgPct != null ? `. Average score ${list2.avgPct}%.` : ".") : `${list.length} certified` + (busiest ? `, busiest month ${busiest.label} (${busiest.total})` : "") + (list2?.avgPct != null ? `. Average score ${list2.avgPct}%.` : ".");
    return {
      year,
      months,
      total: list.length,
      cond,
      avgPct: list2?.avgPct ?? null,
      virtualCount,
      physicalCount,
      typeMix,
      headline
    };
  });
  [...new Set(recent.map((r) => r.type))];
  recent.filter((r) => /hsc|wellness/i.test(r.type)).length;
  const recentAvg = mean(recent.map((r) => r.certScore).filter((s) => s != null));
  const holdCertificateRows = rows.filter((r) => isCertifiedView(flags(r)));
  const holdCertificate = holdCertificateRows.length;
  const stageCertifiedCount = stageCount("certified");
  const holdExpiredItems = holdCertificateRows.filter((r) => stageOf(r) !== "certified").map((r) => ({
    facility: r.facility,
    stage: PIPELINE_STAGES.find((s) => s.key === stageOf(r))?.label ?? "Recertification due"
  }));
  const holdExpired = holdExpiredItems.length;
  const holdExpiredNames = holdExpiredItems;
  const reconciliationLine = holdExpired === 0 ? `${holdCertificate} hold a certificate: all ${stageCertifiedCount} are in the Certified stage.` : `${holdCertificate} hold a certificate: ${stageCertifiedCount} in Certified stage + ${holdExpired} in ${holdExpiredItems[0].stage} (${holdExpiredItems.map((x) => x.facility).join(", ")}).`;
  const fyStart = currentFiscalYear(today);
  const byFy = [...new Set(dated.map((r) => fiscalYearOf(r.certDate)))].sort((a, b) => a - b).map((fy) => {
    const list = dated.filter((r) => fiscalYearOf(r.certDate) === fy);
    return {
      year: fy,
      total: list.length,
      quality: list.filter(isQuality).length,
      cond: list.filter(isCond).length,
      avgPct: mean(list.map((r) => r.certScore).filter((s) => s != null))
    };
  });
  for (const fy of [fyStart - 1, fyStart]) {
    if (!byFy.some((y) => y.year === fy))
      byFy.push({ year: fy, total: 0, quality: 0, cond: 0, avgPct: null });
  }
  byFy.sort((a, b) => a.year - b.year);
  const currentFyLabel = fiscalYearLabel(fyStart);
  const previousFyLabel = fiscalYearLabel(fyStart - 1);
  const certifiedInCurrentFy = byFy.find((y) => y.year === fyStart)?.total ?? 0;
  const certifiedInPreviousFy = byFy.find((y) => y.year === fyStart - 1)?.total ?? 0;
  const holdDated = holdCertificateRows.filter((r) => r.certDate);
  const scoredYears = holdDated.filter((r) => r.certScore != null).map((r) => Number(r.certDate.slice(0, 4)));
  const noScoreBeforeYear = scoredYears.length ? Math.min(...scoredYears) : minYear;
  const footNote = `How counts were made: each facility is counted once, by its "Certification date / GoI Letter Date" (${grandTotalDated} dated` + (undated > 0 ? ` + ${undated} from earlier years with no month). ` : "). ") + `*${currentYear} is year to date. No score is recorded for certifications before ${noScoreBeforeYear}.`;
  const typeCounts = /* @__PURE__ */ new Map();
  const blockCounts = /* @__PURE__ */ new Map();
  for (const r of rows) {
    typeCounts.set(r.type, (typeCounts.get(r.type) ?? 0) + 1);
    blockCounts.set(r.block, (blockCounts.get(r.block) ?? 0) + 1);
  }
  const byTypeBars = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
  const byBlockBars = [...blockCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count }));
  const topType = byTypeBars[0] ?? null;
  const topBlocks = byBlockBars.slice(0, 2).map((b) => b.label);
  const TYPE_LONG = {
    "HWC HSC": "Health & Wellness Sub-Centres (HWC HSC)",
    PHC: "Primary Health Centres",
    CHC: "Community Health Centres",
    UPHC: "urban facilities",
    UHWC: "urban facilities",
    UGPHC: "urban facilities",
    SDH: "sub-district hospitals",
    DHQH: "district headquarters hospitals"
  };
  const profileNote = topType && totalFacilities > 0 ? `${Math.round(topType.count / totalFacilities * 100)}% of the ${totalFacilities} facilities are ${TYPE_LONG[topType.label] ?? topType.label}; ${topBlocks.join(" and ")} are the largest blocks.` : "No facilities in scope.";
  const blockProgress = [...blockCounts.entries()].map(([block, total]) => {
    const cert = rows.filter((r) => r.block === block && isCertified(r)).length;
    return {
      block,
      total,
      certified: cert,
      notYet: total - cert,
      rate: total > 0 ? Math.round(cert / total * 100) : 0
    };
  }).sort((a, b) => a.rate - b.rate || a.certified - b.certified);
  const typeProgress = [...typeCounts.entries()].map(([type, facilities]) => {
    const cert = rows.filter((r) => r.type === type && isCertified(r)).length;
    return {
      type,
      facilities,
      certified: cert,
      rate: facilities > 0 ? Math.round(cert / facilities * 100) : 0
    };
  }).sort((a, b) => b.facilities - a.facilities);
  const bestType = [...typeProgress].sort((a, b) => b.rate - a.rate)[0];
  const worstTypes = typeProgress.filter((t) => t.rate === 0);
  const progressNote = certifiedTotal > 0 && bestType ? `${bestType.type}s lead at ${bestType.rate}% certified` + (worstTypes.length > 0 && worstTypes.length <= 3 ? `, while ${worstTypes.map((t) => `${t.certified === 0 ? "none of" : `only ${t.certified} of`} the ${t.facilities} ${t.type}`).join(", ")} ${worstTypes.length === 1 ? "facility is" : "facilities are"} certified.` : ".") : "No certifications recorded yet.";
  const notCertified = rows.filter((r) => !isCertifiedRow(r));
  const notCertifiedCount = notCertified.length;
  const buildingIssues = notCertified.filter(
    (r) => /dilapidat|condemn|land/i.test(`${r.buildingStatus ?? ""} ${r.currentStatus}`)
  ).length;
  const lowScore = notCertified.filter(
    (r) => r.nqasIaQ2 != null && r.nqasIaQ2 < 70
  ).length;
  notCertified.filter((r) => stageOf(r) === "resultAwaited").length;
  notCertified.filter(
    (r) => stageOf(r) === "notStarted" && !flags(r).isDeferred
  ).length;
  notCertified.filter(
    (r) => stageOf(r) === "naScheduled"
  ).length;
  notCertified.filter(
    (r) => /inaugurat|new|ready/i.test(r.currentStatus)
  ).length;
  notCertified.filter((r) => flags(r).isDeferred).length;
  const reasonOrder = [
    { label: "Building or land issues", tone: "coral", test: (x) => /dilapidat|condemn|land/i.test(`${x.buildingStatus ?? ""} ${x.currentStatus}`) },
    { label: "NQAS internal score below 70%", tone: "amber", test: (x) => x.nqasIaQ2 != null && x.nqasIaQ2 < 70 },
    { label: "Awaiting result or documents", tone: "teal", test: (x) => stageOf(x) === "resultAwaited" },
    { label: "NQAS assessment scheduled", tone: "teal", test: (x) => stageOf(x) === "naScheduled" },
    { label: "State assessment not yet done", tone: "teal", test: (x) => stageOf(x) === "notStarted" && !flags(x).isDeferred },
    { label: "New or ready for inauguration", tone: "light", test: (x) => /inaugurat|new|ready/i.test(x.currentStatus) },
    { label: "Recertification deferred", tone: "light", test: (x) => flags(x).isDeferred }
  ];
  const reasonCountAcc = new Map(reasonOrder.map((r) => [r.label, 0]));
  for (const r of notCertified) {
    const hit = reasonOrder.find((reason) => reason.test(r));
    if (hit) reasonCountAcc.set(hit.label, (reasonCountAcc.get(hit.label) ?? 0) + 1);
  }
  const otherCount = Math.max(0, notCertifiedCount - notCertified.filter((r) => reasonOrder.some((reason) => reason.test(r))).length);
  const barrierBars = [
    ...reasonOrder.map((reason) => ({
      label: reason.label,
      count: reasonCountAcc.get(reason.label) ?? 0,
      tone: reason.tone
    })),
    { label: "Other / not stated", count: otherCount, tone: "gray" }
  ].filter((b) => b.count > 0).sort((a, b) => b.count - a.count);
  [...barrierBars].sort((a, b) => b.count - a.count);
  const namedBars = barrierBars.filter((b) => b.label !== "Other / not stated");
  const otherBar = barrierBars.find((b) => b.label === "Other / not stated") ?? null;
  const sortedNamed = [...namedBars].sort((a, b) => b.count - a.count);
  const top = sortedNamed[0];
  let largestReason = null;
  if (top && top.count > 0) {
    const tied = sortedNamed.filter((b) => b.count === top.count);
    largestReason = tied.length > 1 ? `${tied.map((b) => b.label).join(" and ")} are tied at ${top.count}` : `${top.count} ${top.label.toLowerCase()} — the single largest reason`;
  }
  const barrierNotes = [
    largestReason ?? "No barriers recorded",
    sortedNamed[1] && sortedNamed[1].count !== top?.count ? `${sortedNamed[1].count} ${sortedNamed[1].label.toLowerCase()}` : "",
    otherBar && otherBar.count > 0 ? `${otherBar.count} of the rest have no reason recorded in the data` : ""
  ].filter(Boolean);
  const barrierPriorityNote = `Priority order: ${reasonOrder.map((r) => r.label).join(" then ")} then other. Uncertified facilities are counted once, in the first reason that applies, so the bars add to ${notCertifiedCount}.`;
  const barrierFoot = `Grouped from the ${FACILITY_CURRENT_STATUS_LABEL} column${totalFacilities > 0 ? ` (n = ${totalFacilities})` : ""}. ${barrierPriorityNote} Coral and amber bars are blocked; teal bars are moving through assessment.`;
  const heatmapNote = undated > 0 ? `${undated} certification${undated === 1 ? "" : "s"} ha${undated === 1 ? "s" : "ve"} no month recorded, so month totals add to ${grandTotalDated} of ${certifiedTotal}. *${currentYear} is year to date.` : `*${currentYear} is year to date. Darker cells mean more certifications in the month.`;
  const band = (v) => {
    if (v == null) return -1;
    if (v < 70) return 0;
    if (v < 80) return 1;
    if (v < 90) return 2;
    return 3;
  };
  const scoreBands = [
    { label: "Below 70%", nqas: 0, kayakalp: 0 },
    { label: "70–79%", nqas: 0, kayakalp: 0 },
    { label: "80–89%", nqas: 0, kayakalp: 0 },
    { label: "90% and above", nqas: 0, kayakalp: 0 }
  ];
  for (const r of rows) {
    const bn = band(r.nqasIaQ2);
    const bk = band(r.kayakalpIaQ2);
    if (bn >= 0) scoreBands[bn].nqas += 1;
    if (bk >= 0) scoreBands[bk].kayakalp += 1;
  }
  const withBothN = rows.filter((r) => r.nqasIaQ1 != null && r.nqasIaQ2 != null);
  const withBothK = rows.filter((r) => r.kayakalpIaQ1 != null && r.kayakalpIaQ2 != null);
  const avgOf = (nums) => nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 10) / 10 : null;
  const iaQ1Avg = avgOf(withBothN.map((r) => r.nqasIaQ1));
  const iaQ2Avg = avgOf(withBothN.map((r) => r.nqasIaQ2));
  const kkQ1Avg = avgOf(withBothK.map((r) => r.kayakalpIaQ1));
  const kkQ2Avg = avgOf(withBothK.map((r) => r.kayakalpIaQ2));
  const deltaClass = (q1, q2) => q2 - q1 > 0.05 ? "up" : q2 - q1 < -0.05 ? "down" : "same";
  const iaImproved = withBothN.filter((r) => deltaClass(r.nqasIaQ1, r.nqasIaQ2) === "up").length;
  const iaUnchanged = withBothN.filter((r) => deltaClass(r.nqasIaQ1, r.nqasIaQ2) === "same").length;
  const iaDeclined = withBothN.filter((r) => deltaClass(r.nqasIaQ1, r.nqasIaQ2) === "down").length;
  const kkImproved = withBothK.filter((r) => deltaClass(r.kayakalpIaQ1, r.kayakalpIaQ2) === "up").length;
  const kkUnchanged = withBothK.filter((r) => deltaClass(r.kayakalpIaQ1, r.kayakalpIaQ2) === "same").length;
  const kkDeclined = withBothK.filter((r) => deltaClass(r.kayakalpIaQ1, r.kayakalpIaQ2) === "down").length;
  const certifiedIaAvg = avgOf(certified.filter((r) => r.nqasIaQ2 != null).map((r) => r.nqasIaQ2));
  const restIaAvg = avgOf(notCertified.filter((r) => r.nqasIaQ2 != null).map((r) => r.nqasIaQ2));
  const certifiedKkAvg = avgOf(certified.filter((r) => r.kayakalpIaQ2 != null).map((r) => r.kayakalpIaQ2));
  const restKkAvg = avgOf(notCertified.filter((r) => r.kayakalpIaQ2 != null).map((r) => r.kayakalpIaQ2));
  const iaNote = `IA = internal assessment; Q1 and Q2 are quarters of the current financial year. Unchanged = within 0.05 points.`;
  const saCompletedTotal = rows.filter((r) => r.saStatus === "Completed").length;
  const saCompletedAwaiting = rows.filter(
    (r) => r.saStatus === "Completed" && stageOf(r) === "resultAwaited"
  ).length;
  const saScheduledCnt = rows.filter(
    (r) => (r.saStatus === "Scheduled" || r.currentStatus === "SA Scheduled" || r.currentStatus.includes("Assessment Scheduled")) && r.saStatus !== "Completed"
  ).length;
  const saNotInit = rows.filter(
    (r) => r.saStatus == null && r.currentStatus.includes("Not Yet Initiated")
  ).length;
  const saNoEntry = Math.max(
    0,
    totalFacilities - saCompletedTotal - saScheduledCnt - saNotInit
  );
  const saScoreList = rows.filter((r) => r.saScore != null).map((r) => r.saScore);
  const saAvgScore = saScoreList.length ? avgOf(saScoreList) : null;
  const saScoreRange = saScoreList.length ? [Math.min(...saScoreList), Math.max(...saScoreList)] : null;
  const saNobodyLabel = "State assessment records";
  const funnelSubtitle = `${saNobodyLabel}: ${saCompletedTotal} Completed` + (saCompletedAwaiting > 0 ? ` (of which ${saCompletedAwaiting} awaiting result)` : "") + ` · ${saNoEntry} No SA entry` + (saScheduledCnt > 0 ? ` · ${saScheduledCnt} Scheduled` : "") + ` (of ${totalFacilities} facilities). Older certificates pre-date state assessment, so the certified count is not a subset of these records.`;
  const saFoot = `"No SA entry" = the file has no state assessment status for that facility (many pre-date the state-assessment requirement).`;
  const buildingSummary = buildingGroupSummary(rows);
  const BUILDING_TONE = {
    Good: "teal",
    "Needs Repair": "amber",
    "Under Renovation": "amber",
    Dilapidated: "coral",
    "M&R Work": "amber",
    "Construction on going": "light"
  };
  const buildingBars = buildingSummary.order.filter((b) => buildingSummary.counts[b] > 0 || b === "No record").map((b) => ({
    label: b,
    count: buildingSummary.counts[b],
    tone: b === "No record" ? "gray" : BUILDING_TONE[b] ?? "light"
  }));
  const dilapCount = buildingSummary.counts["Dilapidated"];
  const buildingNotRecorded = buildingSummary.counts["No record"];
  const buildingUpdatedNote = totalFacilities > 0 ? `Building status (one shared mapping): Good also counts Good Condition and Inaugurated; all M&R variants are one column. Not recorded for ${buildingNotRecorded} facilities.` : "No building data.";
  const buildingReconciles = Object.values(buildingSummary.counts).reduce((a, b) => a + b, 0) === totalFacilities;
  const nocValid = rows.filter(
    (r) => nocStatusOfRow(r, today) === "Valid"
  ).length;
  const nocExpiringSoon = rows.filter(
    (r) => nocStatusOfRow(r, today) === "Expiring Soon"
  ).length;
  const nocExpiredRows = rows.filter(
    (r) => nocStatusOfRow(r, today) === "Expired"
  );
  const nocExpired = nocExpiredRows.length;
  const nocRecordedNoValidity = rows.filter(
    (r) => nocStatusOfRow(r, today) === "Recorded, no validity date"
  ).length;
  const nocNotObtained = rows.filter(
    (r) => nocStatusOfRow(r, today) === "Not Obtained"
  ).length;
  const nocRecorded = rows.filter(
    (r) => (r.fireNocStatus ?? "").trim() !== "" || (r.fireNocExpiry ?? "") !== ""
  ).length;
  const nocNotRecorded = totalFacilities - nocRecorded;
  const nocExpiredByType = /* @__PURE__ */ new Map();
  for (const r of nocExpiredRows)
    nocExpiredByType.set(r.type, (nocExpiredByType.get(r.type) ?? 0) + 1);
  const nocExpiredBreakdown = nocExpired > 0 ? `Expired: ${[...nocExpiredByType.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]) => `${c} ${t}`).join(", ")}.` : "No expired fire NOCs recorded.";
  const ownCount = rows.filter((r) => /own/i.test(r.buildingType ?? "") && !/rent/i.test(r.buildingType ?? "")).length;
  const rentCount = rows.filter((r) => /^rented/i.test(r.buildingType ?? "")).length;
  const rentFreeCount = rows.filter((r) => /rent.?free/i.test(r.buildingType ?? "")).length;
  const nocOwnership = ownCount + rentCount + rentFreeCount > 0 ? `Ownership: ${ownCount} own buildings, ${rentCount} rented, ${rentFreeCount} rent-free.` : "Building ownership is not recorded.";
  const fireNocRecordedSentence = `Fire NOC is recorded for ${nocRecorded} of ${totalFacilities} facilities (${nocNotRecorded} not recorded).`;
  const fireFoot = `${fireNocRecordedSentence} Valid + Expiring soon + Expired + Recorded, no validity date + Not recorded = ${totalFacilities}. Expiring soon = validity date within 90 days (admin-set window); date-derived, so a stored status that disagrees with the date is superseded.`;
  const certDatedRows = certified.filter((r) => r.certDate || r.validityDate);
  const certValid = certDatedRows.filter((r) => r.validityDate && r.validityDate >= today).length;
  const certExpired = certDatedRows.filter((r) => r.validityDate && r.validityDate < today).length;
  const certNoStatus = Math.max(0, certifiedTotal - certValid - certExpired);
  const certExpiring12m = certDatedRows.filter(
    (r) => r.validityDate && r.validityDate >= today && (/* @__PURE__ */ new Date(r.validityDate + "T12:00:00")).getTime() - (/* @__PURE__ */ new Date(today + "T12:00:00")).getTime() <= 365 * 864e5
  ).length;
  const survOverdueRows = certified.filter(
    (r) => r.surveillanceDue1 && r.surveillanceDue1 < today && !r.surveillanceDone1
  );
  const survOverdue = survOverdueRows.length;
  const survOverdue2 = certified.filter(
    (r) => r.surveillanceDue2 && r.surveillanceDue2 < today && !r.surveillanceDone2
  ).length;
  const survNoneDone = certified.filter((r) => !r.surveillanceDone1 && !r.surveillanceDone2).length;
  const survDoneAny = certified.filter(
    (r) => r.surveillanceDone1 || r.surveillanceDone2
  ).length;
  const fundRows = rows.filter((r) => r.gapClosureAmount != null || r.gcFundYear != null);
  const fundsFacilities = fundRows.length;
  const fundAmounts = fundRows.filter((r) => r.gapClosureAmount != null).map((r) => r.gapClosureAmount);
  const fundsTotalLakh = fundAmounts.length ? Math.round(fundAmounts.reduce((a, b) => a + b, 0) / 1e5 * 10) / 10 : null;
  const fundsYears = [...new Set(fundRows.map((r) => r.gcFundYear).filter((y) => !!y))].sort();
  const fundsReceivedRecent = fundsYears.length ? fundsYears.join(", ") : null;
  const fundsCertified = fundRows.filter((r) => isCertifiedRow(r)).length;
  const followUpNote = certValid >= certExpired ? `${certValid} of the ${certifiedTotal} certificates are currently valid, but ${certExpired} ${certExpired === 1 ? "has" : "have"} expired and ${survOverdue} facilities are past a surveillance due date.` : `${certExpired} of the ${certifiedTotal} certificates have expired — renewals are the priority — and ${survOverdue} facilities are past a surveillance due date.`;
  const leadBlocks = [...blockProgress].sort((a, b) => b.rate - a.rate);
  const definitions = [
    {
      term: "Hold a certificate",
      definition: `Facilities with a certificate, VALID OR EXPIRED (${holdCertificate} today: ${qualityCount} Quality Certified + ${condCount} with conditionality). Headline numbers use this.`
    },
    {
      term: "In Certified stage",
      definition: `Facilities whose Facility Current Status is the Certified stage (${stageCertifiedCount}). Stage charts use this — the ${holdCertificate} include ${holdExpired} ${holdExpired === 1 ? "facility" : "facilities"} whose certificate has expired (now Recertification Due) but which still hold it.`
    },
    {
      term: `Fiscal year (FY ${currentFyLabel})`,
      definition: `India: April to March. "Certified in FY ${currentFyLabel} (to date)" counts by certification date inside this fiscal year, with FY ${previousFyLabel} shown for comparison.`
    },
    {
      term: "Fire NOC buckets",
      definition: `Valid — expiry date ahead. Expiring soon — within ${DEFAULT_SETTINGS.fireNocAlertLeadDays} days (the admin-set window). Expired — past. Recorded, no validity date — an entry exists but the date is blank (${nocRecordedNoValidity} facilities). Not recorded — no NOC entry (${nocNotRecorded} facilities). All five buckets sum to ${totalFacilities}.`
    },
    {
      term: "Reason priority",
      definition: barrierPriorityNote
    },
    {
      term: "Building mapping",
      definition: `Good = Good + Good Condition + Inaugurated; M&R works = M&R Work + Major/Minor M&R works; Construction/land = Construction going on + Land available/not available; Dilapidated as stored; anything else Other; blank No record.`
    }
  ];
  const takeaways = [
    {
      n: 1,
      title: certifiedTotal > 0 && totalFacilities > 0 && certifiedTotal < totalFacilities / 2 ? "Under half certified" : "Certification momentum",
      body: `${certifiedTotal} of ${totalFacilities} facilities (${certifiedPct}%) are certified.` + (bestType ? ` ${bestType.type}s are at ${bestType.rate}%.` : "") + (leadBlocks[0] && leadBlocks[leadBlocks.length - 1] ? ` ${leadBlocks[0].block} leads blocks at ${leadBlocks[0].rate}%, ${leadBlocks[leadBlocks.length - 1].block} trails at ${leadBlocks[leadBlocks.length - 1].rate}%.` : "")
    },
    {
      n: 2,
      title: "Buildings block the most",
      body: buildingIssues > 0 ? `${buildingIssues} of the ${notCertifiedCount} uncertified facilities have building or land issues, and ${dilapCount} ${dilapCount === 1 ? "building is" : "buildings are"} dilapidated.` : `${dilapCount} ${dilapCount === 1 ? "building is" : "buildings are"} dilapidated; no certification is currently blocked by building or land issues.`
    },
    {
      n: 3,
      title: "Internal scores split the groups",
      body: certifiedIaAvg != null && restIaAvg != null ? `Certified facilities average ${certifiedIaAvg}% on NQAS IA against ${restIaAvg}% for the rest` + (lowScore > 0 ? `, and ${lowScore} facilities ${lowScore === 1 ? "is" : "are"} still below 70%.` : ".") : recentAvg != null ? `Average certification score is ${recentAvg}%.` : "Internal assessment scores are not recorded for most facilities."
    },
    {
      n: 4,
      title: "Housekeeping needs follow-up",
      body: `${certExpired} ${certExpired === 1 ? "certificate has" : "certificates have"} expired, ${survOverdue} ${survOverdue === 1 ? "facility is" : "facilities are"} past a surveillance due date with no visit recorded, and ${nocExpired} ${nocExpired === 1 ? "fire NOC has" : "fire NOCs have"} expired.`
    }
  ];
  return {
    totalFacilities,
    certifiedTotal,
    qualityCount,
    condCount,
    certifiedPct,
    blocksCount,
    recentSpanLabel: `${recentStart}–${String(maxYear).slice(2)}`,
    recentCount: recent.length,
    recentSharePct,
    statusSlices: slices,
    byYear,
    undated,
    undatedQuality,
    undatedCond,
    currentYear,
    yearMonth,
    grandTotalDated,
    busiestPair,
    earlyYears,
    earlyNote,
    yearDetails,
    takeaways,
    footNote,
    heatmapNote,
    // profile
    byTypeBars,
    byBlockBars,
    topTypeName: topType?.label ?? null,
    topTypeCount: topType?.count ?? 0,
    topTypeNameLong: topType ? TYPE_LONG[topType.label] ?? topType.label : null,
    topBlocksLabel: topBlocks.join(" and "),
    profileNote,
    // certification progress
    blockProgress,
    typeProgress,
    progressNote,
    // barriers
    notCertifiedCount,
    barrierBars,
    barrierNotes,
    barrierFoot,
    // IA scores
    scoreBands,
    iaQ1Avg,
    iaQ2Avg,
    kkQ1Avg,
    kkQ2Avg,
    iaImproved,
    iaUnchanged,
    iaDeclined,
    kkImproved,
    kkUnchanged,
    kkDeclined,
    certifiedIaAvg,
    restIaAvg,
    certifiedKkAvg,
    restKkAvg,
    iaNote,
    // assessment pipeline
    saCompleted: saCompletedTotal,
    saCompletedAwaiting,
    saScheduled: saScheduledCnt,
    saNotInitiated: saNotInit,
    saNoEntry,
    saAvgScore,
    saScoreRange,
    funnelSubtitle,
    saFoot,
    // buildings & fire safety
    buildingBars,
    buildingNotRecorded,
    buildingUpdatedNote,
    nocRecorded,
    nocValid,
    nocExpired,
    nocExpiringSoon,
    nocRecordedNoValidity,
    nocNotObtained,
    nocExpiredBreakdown,
    nocOwnership,
    fireFoot,
    // validity / surveillance / funds
    followUpNote,
    certValid,
    certExpired,
    certNoStatus,
    certExpiring12m,
    survOverdue,
    survOverdue2,
    survNoneDone,
    survDoneAny,
    fundsFacilities,
    fundsFunded: fundRows.filter((r) => /fund|receiv|utiliz/i.test(r.gcFundYear ?? "")).length,
    fundsPending: fundRows.filter((r) => r.gapClosureAmount == null).length,
    fundsTotalLakh,
    fundsReceivedRecent,
    fundsCertified,
    // Part 0/1 upgrades
    holdCertificate,
    holdExpired,
    holdExpiredNames,
    reconciliationLine,
    byFy,
    currentFyLabel,
    previousFyLabel,
    certifiedInCurrentFy,
    certifiedInPreviousFy,
    nocNotRecorded,
    fireNocRecordedSentence,
    noScoreBeforeYear,
    barrierPriorityNote,
    definitions,
    buildingReconciles
  };
}

function inrGroup(n) {
  const s = String(Math.abs(Math.round(n)));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  const groups = [];
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) groups.unshift(rest);
  return `${groups.join(",")},${last3}`;
}
function formatInr(amount) {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const sign = amount < 0 ? "-" : "";
  return `${sign}₹ ${inrGroup(Math.abs(amount))}`;
}

const DEFAULT_SLIDE_ORDER = [
  "title",
  "exec",
  "where",
  "progress",
  "barriers",
  "ia",
  "byYear",
  "validity",
  "buildings",
  "profile",
  "pipeline",
  "heatmap",
  "yearA",
  "yearB",
  "takeaways",
  "checks",
  "defs"
];
const DEFAULT_HIDDEN_SLIDES = [
  "profile",
  "pipeline",
  "heatmap",
  "yearA",
  "yearB",
  "checks",
  "defs"
];
const DECK_SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "profile", label: "Facility profile" },
  { id: "progress", label: "Certification progress" },
  { id: "assessment", label: "Assessment" },
  { id: "certification", label: "Certification & trends" },
  { id: "close", label: "Close" }
];
const SLIDE_TITLES = {
  title: "Cover",
  exec: "Executive summary",
  where: "Where facilities stand",
  profile: "Facility profile",
  progress: "Certification progress",
  barriers: "Why facilities are not certified",
  ia: "Internal assessment",
  pipeline: "State assessment",
  buildings: "Buildings and Fire NOC",
  validity: "Validity, surveillance and funds",
  byYear: "Certification over time",
  heatmap: "Month detail",
  yearA: "Month table (older)",
  yearB: "Month table (latest)",
  takeaways: "What needs action",
  checks: "Data checks",
  defs: "Definitions and method"
};
const ADMIN_ONLY_HIDE = /* @__PURE__ */ new Set(["title", "defs"]);
const REFERENCED_SLIDES = /* @__PURE__ */ new Set(["defs", "checks"]);
const TONE_HEX = {
  teal: "#0F6B63",
  amber: "#C98212",
  coral: "#C34B32",
  blue: "#2C6C8E",
  grey: "#7C8F8C",
  light: "#CBD9D6"
};
const TONE_INK_LIGHT = {
  teal: "#0B5751",
  amber: "#8A5200",
  coral: "#A13627",
  blue: "#1F5875",
  grey: "#526663",
  light: "#526663"
};
const TONE_INK_DARK = {
  teal: "#B7F0E9",
  amber: "#FFD48A",
  coral: "#FFB3A3",
  blue: "#B9DDF2",
  grey: "#D2E1DF",
  light: "#D2E1DF"
};
const channel = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
function inkOnFill(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(h.slice(i, i + 2), 16) || 0));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance <= 0.179 ? "#FFFFFF" : "#0B1F1D";
}
const DEFAULT_RATE_BANDS = { green: 75, amber: 50 };
function parseRateBands(value) {
  if (!value || typeof value !== "object") return DEFAULT_RATE_BANDS;
  const v = value;
  const green = Number(v.green);
  const amber = Number(v.amber);
  if (!Number.isFinite(green) || !Number.isFinite(amber)) return DEFAULT_RATE_BANDS;
  if (amber < 0 || green > 100 || amber >= green) return DEFAULT_RATE_BANDS;
  return { green, amber };
}
const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
function deckDataAsOf(now = /* @__PURE__ */ new Date()) {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(now).map((p) => [p.type, p.value])
    );
    return `${parts.day}-${parts.month}-${parts.year} ${parts.hour}:${parts.minute} IST`;
  } catch {
    const ist = new Date(now.getTime() + 5.5 * 36e5);
    return `${String(ist.getUTCDate()).padStart(2, "0")}-${MONTH_ABBR[ist.getUTCMonth()]}-${ist.getUTCFullYear()} ${String(
      ist.getUTCHours()
    ).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")} IST`;
  }
}
const pctOf = (n, d) => d > 0 ? Math.round(n / d * 100) : 0;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const money = (v) => formatInr(v ?? null);
function reportIdFor(today) {
  return `NQAS-DECK-${today.replace(/-/g, "")}`;
}
function computeDeckChecks(rows, data, today) {
  const certified = rows.filter((r) => isCertifiedRow(r));
  const certifiedNoDate = certified.filter((r) => !r.certDate);
  const certifiedNotEligible = certified.filter((r) => r.eligibility !== "Eligible");
  const certExpiredRows = certified.filter(
    (r) => r.validityDate != null && r.validityDate < today
  );
  const nocExpiredRows = rows.filter(
    (r) => r.fireNocExpiry != null && r.fireNocExpiry < today
  );
  const resultNoDate = rows.filter((r) => !!r.certStatus && !r.certDate);
  const dateNoResult = rows.filter((r) => !!r.certDate && !r.certStatus);
  const noNa = rows.filter((r) => r.naStatus == null);
  const noSa = rows.filter((r) => r.saStatus == null);
  const noIa = rows.filter((r) => r.nqasIaQ1 == null && r.nqasIaQ2 == null);
  const futureSurv = rows.filter(
    (r) => r.surveillanceDone1 && r.surveillanceDone1 > today || r.surveillanceDone2 && r.surveillanceDone2 > today
  );
  const names = (list, n = 8) => list.slice(0, n).map((r) => r.facility).join(", ") + (list.length > n ? `, +${list.length - n} more` : "");
  const issues = [
    {
      id: "certified-no-date",
      label: "Certified facilities with no certification date",
      count: certifiedNoDate.length,
      definition: `Quality Certified or Quality Certified with Conditionality, but no GoI Letter Date / certification date — the facility cannot be placed in a year or a month. This is the deck's "No date" row.`,
      facilities: certifiedNoDate.map((r) => r.facility),
      tone: "amber",
      href: "/facilities?missing=certDate"
    },
    {
      id: "certified-not-eligible",
      label: "Certified but eligibility says Not eligible",
      count: certifiedNotEligible.length,
      definition: "The facility holds a Quality/Quality with Conditionality certificate, but the stored eligibility column still says Not Eligible. A certified facility is never Not eligible; the shared stage rule keeps it in Certified and this list names the rows to correct.",
      facilities: certifiedNotEligible.map((r) => r.facility),
      tone: "coral",
      href: "/facilities?kpi=certified"
    },
    {
      id: "cert-expired",
      label: "Certificates past their validity date",
      count: certExpiredRows.length,
      definition: "Quality Certified or Quality Certified with Conditionality and a validity date earlier than today (IST). The facility still holds the certificate and is counted in the headline; recertification is the next action.",
      facilities: certExpiredRows.map((r) => r.facility),
      tone: "amber",
      href: "/facilities?kpi=recert"
    },
    {
      id: "noc-expired",
      label: "Fire NOC expired",
      count: nocExpiredRows.length,
      definition: "The recorded Fire NOC validity date is earlier than today (IST). Re-upload the renewed NOC in the facility profile.",
      facilities: nocExpiredRows.map((r) => r.facility),
      tone: "coral",
      href: "/facilities/fire-noc"
    },
    {
      id: "result-no-date",
      label: "NQAS result recorded with no certification date",
      count: resultNoDate.length,
      definition: "The result column is filled but the date is blank. A superset of the row above: it also counts facilities whose result is no longer counted as certified.",
      facilities: resultNoDate.map((r) => r.facility),
      tone: "grey",
      href: "/facilities?missing=certDate"
    },
    {
      id: "date-no-result",
      label: "Certification date with no NQAS result",
      count: dateNoResult.length,
      definition: "A GoI Letter Date is on file but the result is blank, so the facility cannot be counted in Quality or Conditional.",
      facilities: dateNoResult.map((r) => r.facility),
      tone: "amber",
      href: "/facilities?missing=certStatus"
    },
    {
      id: "surveillance-future",
      label: "Surveillance done dates in the future",
      count: futureSurv.length,
      definition: "A done date later than today (IST). Done dates are manual entries and cannot be future-dated; fix them in Admin → Data checks → Surveillance dates.",
      facilities: futureSurv.map((r) => r.facility),
      tone: "coral",
      href: "/admin?tab=surveillance-dates"
    },
    {
      id: "no-na-entry",
      label: "Facilities with no NQAS assessment entry",
      count: noNa.length,
      definition: "The file has no NQAS assessment status for the facility.",
      facilities: noNa.map((r) => r.facility),
      tone: "grey",
      href: "/facilities?missing=naStatus"
    },
    {
      id: "no-sa-entry",
      label: "Facilities with no state assessment entry",
      count: noSa.length,
      definition: "The file has no state assessment status. Many older certificates pre-date the state-assessment requirement.",
      facilities: noSa.map((r) => r.facility),
      tone: "grey",
      href: "/facilities?missing=saStatus"
    },
    {
      id: "no-ia",
      label: "Facilities with no internal assessment scores",
      count: noIa.length,
      definition: "Neither an NQAS nor a Kayakalp internal assessment score is recorded.",
      facilities: noIa.map((r) => r.facility),
      tone: "grey",
      href: "/facilities?missing=ia"
    }
  ];
  const reconcile = [
    {
      label: "Hold a certificate = Quality + Conditional",
      ok: data.holdCertificate === data.qualityCount + data.condCount,
      detail: `${data.holdCertificate} = ${data.qualityCount} Quality Certified + ${data.condCount} with conditionality.`
    },
    {
      label: "Hold a certificate = dated + no date",
      ok: certifiedNoDate.length === data.undated,
      detail: `${data.certifiedTotal} certified = ${data.certifiedTotal - data.undated} dated + ${data.undated} undated.` + (certifiedNoDate.length === data.undated ? "" : ` Named "no certification date" list has ${certifiedNoDate.length}.`)
    },
    {
      label: "Pipeline stage buckets sum to the facility count",
      ok: data.statusSlices.reduce((a, b) => a + b.count, 0) === data.totalFacilities,
      detail: `${data.statusSlices.reduce((a, b) => a + b.count, 0)} of ${data.totalFacilities} facilities are in exactly one stage.`
    },
    {
      label: "Building buckets sum to the facility count",
      ok: data.buildingReconciles,
      detail: data.buildingReconciles ? `${data.totalFacilities} of ${data.totalFacilities} facilities are in exactly one building bucket.` : "Building buckets do not add up to the facility count."
    },
    {
      label: "Fire NOC buckets sum to the facility count",
      ok: data.nocValid + data.nocExpiringSoon + data.nocExpired + data.nocRecordedNoValidity + data.nocNotRecorded === data.totalFacilities,
      detail: `${data.nocValid} valid + ${data.nocExpiringSoon} expiring + ${data.nocExpired} expired + ${data.nocRecordedNoValidity} recorded without a validity date + ${data.nocNotRecorded} not recorded = ${data.nocValid + data.nocExpiringSoon + data.nocExpired + data.nocRecordedNoValidity + data.nocNotRecorded} of ${data.totalFacilities} (${data.nocRecorded} recorded).`
    },
    {
      label: "Hold a certificate = stage certified + the named difference",
      ok: data.holdCertificate === data.certifiedTotal,
      detail: data.reconciliationLine
    }
  ];
  const active = issues.filter((i) => i.count > 0);
  const lines = active.map(
    (i) => `${i.count} — ${i.label}: ${names(rows.filter((r) => i.facilities.includes(r.facility)))}`
  );
  if (reconcile.some((r) => !r.ok))
    lines.push(
      `Reconciliation failed: ${reconcile.filter((r) => !r.ok).map((r) => r.label).join("; ")}.`
    );
  return {
    issues,
    totalIssues: active.length,
    lines,
    reconcile,
    failed: reconcile.filter((r) => !r.ok).length
  };
}
function buildPeriodRows(rows, data, period, today) {
  const holdRows = rows.filter((r) => isCertifiedRow(r));
  const bucketOf = (iso) => period === "fy" ? fiscalYearOf(iso) : Number(iso.slice(0, 4));
  const current = period === "fy" ? currentFiscalYear(today) : Number(today.slice(0, 4));
  const previous = current - 1;
  const add = (target, r) => {
    if (isQuality(r)) target.quality += 1;
    if (isCond(r)) target.cond += 1;
    target.total = target.quality + target.cond;
  };
  const acc = /* @__PURE__ */ new Map();
  const earlier = { label: "Earlier", total: 0, quality: 0, cond: 0 };
  for (const r of holdRows) {
    if (!r.certDate) continue;
    const key = bucketOf(r.certDate);
    const label = period === "fy" ? fiscalYearLabel(key) : String(key);
    if (key < previous) {
      add(earlier, r);
      continue;
    }
    const row = acc.get(key) ?? { label, total: 0, quality: 0, cond: 0 };
    add(row, r);
    acc.set(key, row);
  }
  const out = [];
  for (const y of [previous, current]) {
    const found = acc.get(y);
    const label = period === "fy" ? fiscalYearLabel(y) : String(y);
    out.push(found ?? { label, total: 0, quality: 0, cond: 0 });
  }
  if (earlier.total > 0) out.unshift(earlier);
  for (const [key, row] of acc) {
    if (key > current) out.push(row);
  }
  const undated = {
    label: "No date",
    total: data.undatedQuality + data.undatedCond,
    quality: data.undatedQuality,
    cond: data.undatedCond
  };
  return { rows: out, undated };
}
function strictWorst(items) {
  const eligible = items.filter((i) => i.total > 0);
  if (eligible.length === 0) return null;
  const min = Math.min(...eligible.map((i) => i.rate));
  const tied = eligible.filter((i) => i.rate === min);
  if (tied.length === 1)
    return { text: `${tied[0].block} trails at ${min}% certified` };
  return {
    text: `${tied.length} blocks are tied at ${min}% certified (${tied.map((t) => t.block).join(", ")})`
  };
}
function sumSentence(parts, total, lead) {
  if (parts.length === 0) return `${lead} ${total}.`;
  return `${lead} ${parts.join(" + ")} = ${total}.`;
}
function buildDeckModel(rows, opts = {}) {
  const today = opts.today ?? todayLocalIso();
  const district = opts.district ?? "Tirupathur";
  const period = opts.period ?? "fy";
  const filtersLabel = opts.filtersLabel ?? "All blocks · All facility types · All cycles";
  const bands = opts.rateBands ?? DEFAULT_RATE_BANDS;
  const bandTone = (rate) => rate >= bands.green ? "teal" : rate >= bands.amber ? "amber" : "coral";
  const bandLegend = `Certified rate: ${bands.green}% or more teal, ${bands.amber}–${bands.green - 1}% amber, below ${bands.amber}% coral.`;
  const data = buildDeckData(rows);
  const checks = computeDeckChecks(rows, data, today);
  const { rows: periodRows, undated: periodUndated } = buildPeriodRows(
    rows,
    data,
    period,
    today
  );
  const currentFy = currentFiscalYear(today);
  const fyLabel = fiscalYearLabel(currentFy);
  const prevFy = fiscalYearLabel(currentFy - 1);
  const periodLabel = period === "fy" ? `Financial year ${fyLabel} (to date)` : `Calendar year ${today.slice(0, 4)} (to date)`;
  const meta = {
    district,
    orgName: ORG_NAME,
    signature: ORG_SIGNATURE,
    deckTitle: "NQAS Summary Report",
    period,
    periodLabel,
    filtersLabel,
    dataAsOf: deckDataAsOf(),
    reportId: reportIdFor(today),
    totalFacilities: data.totalFacilities,
    holdCertificate: data.holdCertificate,
    certifiedStage: data.statusSlices.find((s) => s.label === "Certified")?.count ?? 0
  };
  const stageCertified = data.statusSlices.find((s) => s.label === "Certified")?.count ?? 0;
  const reconciliation = data.holdCertificate === stageCertified ? `${data.holdCertificate} hold a certificate, all in the Certified stage.` : data.reconciliationLine;
  const worst = strictWorst(data.blockProgress);
  const goodBuildings = data.buildingBars.find((b) => b.label === "Good")?.count ?? 0;
  const dilapidated = data.buildingBars.find((b) => b.label === "Dilapidated")?.count ?? 0;
  const busiest = data.busiestPair;
  const checksWord = checks.totalIssues === 1 ? "issue" : "issues";
  const futureSurv = checks.issues.find((i) => i.id === "surveillance-future")?.count ?? 0;
  const noDate = checks.issues.find((i) => i.id === "certified-no-date")?.count ?? 0;
  const wrongStatus = checks.issues.find((i) => i.id === "certified-not-eligible")?.count ?? 0;
  const currentBucket = periodRows[periodRows.length - 1];
  const prevBucket = periodRows.find((r) => r.label === (period === "fy" ? prevFy : String(Number(today.slice(0, 4)) - 1))) ?? periodRows[periodRows.length - 2];
  const attention = [];
  if (data.certExpired > 0)
    attention.push(
      `${plural(data.certExpired, "certificate")} expired — recertification is the priority.`
    );
  if (data.nocExpired > 0)
    attention.push(`${plural(data.nocExpired, "fire NOC")} expired.`);
  if (futureSurv > 0)
    attention.push(
      `${plural(futureSurv, "facility has a surveillance Done date in the future", "facilities have a surveillance Done date in the future")} (Admin → Data checks).`
    );
  if (wrongStatus > 0)
    attention.push(
      `${plural(wrongStatus, "certified facility still says Not eligible", "certified facilities still say Not eligible")}.`
    );
  if (data.survOverdue > 0)
    attention.push(
      `${plural(data.survOverdue, "facility is", "facilities are")} past a surveillance due date with no visit recorded.`
    );
  if (noDate > 0)
    attention.push(
      `${plural(noDate, "certified facility has", "certified facilities have")} no certification date.`
    );
  const slides = [];
  const sectionOf = (id) => id === "title" || id === "exec" || id === "where" ? "summary" : id === "profile" ? "profile" : id === "progress" || id === "barriers" ? "progress" : id === "ia" || id === "pipeline" ? "assessment" : id === "takeaways" || id === "checks" || id === "defs" ? "close" : "certification";
  const add = (slide) => {
    const section = sectionOf(slide.id);
    slides.push({
      ...slide,
      // Part B.7: no "SECTION N · …" kickers above titles. The section is
      // still carried in the model for the rail groups and the report TOC.
      kicker: void 0,
      section,
      sectionLabel: DECK_SECTIONS.find((s) => s.id === section)?.label ?? ""
    });
  };
  add({
    id: "title",
    variant: "cover",
    title: "NQAS Certification Summary",
    subtitle: `${district} health facilities · ${periodLabel}`,
    hero: {
      value: String(data.holdCertificate),
      label: `of ${data.totalFacilities} facilities hold an NQAS certificate (${data.certifiedPct}%)`
    },
    columns: [
      [
        {
          kind: "text",
          body: `${filtersLabel} · ${data.qualityCount} Quality Certified · ${data.condCount} with conditionality · ${ORG_NAME}`
        }
      ]
    ],
    speakerNotes: "Cover. One definition: a facility holds a certificate when its NQAS Certification Status is Quality Certified or Quality Certified with Conditionality, valid or expired. Every number in this deck and the report uses that cohort."
  });
  add({
    id: "exec",
    variant: "light",
    kicker: "EXECUTIVE SUMMARY",
    title: attention.length > 0 ? `${data.holdCertificate} hold a certificate; ${attention.length} ${attention.length === 1 ? "item needs" : "items need"} attention` : `${data.holdCertificate} facilities hold a certificate and no exception is open`,
    subtitle: `${data.totalFacilities} facilities · ${data.blocksCount} blocks · ${periodLabel}`,
    columns: [
      [
        {
          kind: "kpis",
          items: [
            { value: String(data.totalFacilities), label: "Facilities", note: `${data.blocksCount} blocks`, tone: "blue" },
            { value: String(data.holdCertificate), label: "Hold a certificate", note: `${data.certifiedPct}% of facilities`, tone: "teal" },
            { value: String(data.qualityCount), label: "Quality Certified", tone: "teal" },
            { value: String(data.condCount), label: "With conditionality", tone: "amber" },
            { value: String(data.certExpired), label: "Certificates expired", tone: data.certExpired > 0 ? "coral" : "grey" },
            { value: String(data.notCertifiedCount), label: "Not certified", note: "in pipeline or blocked", tone: "grey" }
          ]
        },
        { kind: "text", body: reconciliation }
      ],
      [
        {
          kind: "bullets",
          title: "Needs attention",
          tone: "amber",
          items: attention.length > 0 ? attention : ["No exceptions open in this scope."]
        },
        {
          kind: "bullets",
          title: "Data health",
          tone: checks.totalIssues > 0 ? "amber" : "teal",
          items: [
            `${checks.totalIssues} ${checksWord} in ${data.totalFacilities} facilities.`,
            ...checks.issues.filter((i) => i.count > 0).slice(0, 3).map((i) => `${i.count} — ${i.label}.`)
          ]
        }
      ]
    ],
    note: `Data as of ${meta.dataAsOf} · Report ${meta.reportId}`,
    speakerNotes: "Six KPI tiles plus the exceptions that need a human. Every number is clickable in the report page; the PDF and PPTX read the same model."
  });
  const saAwaiting = data.saCompletedAwaiting;
  const saCompletedOnly = Math.max(0, data.saCompleted - saAwaiting);
  const saSegments = [
    { label: "Completed, result issued", value: saCompletedOnly, tone: "teal" },
    { label: "Completed, awaiting result", value: saAwaiting, tone: "blue" },
    { label: "Scheduled", value: data.saScheduled, tone: "amber" },
    { label: "Yet to be initiated", value: data.saNotInitiated, tone: "light" },
    { label: "No SA entry", value: data.saNoEntry, tone: "grey" }
  ].filter((s) => s.value > 0);
  add({
    id: "where",
    variant: "light",
    title: `${data.holdCertificate} of ${data.totalFacilities} facilities hold an NQAS certificate`,
    subtitle: `${data.qualityCount} Quality Certified and ${data.condCount} with conditionality · ${data.blocksCount} blocks · ${reconciliation}`,
    columns: [
      [
        {
          kind: "bars",
          title: `Where all ${data.totalFacilities} facilities stand`,
          items: data.statusSlices.map((s) => ({
            label: s.label,
            value: s.count,
            tone: s.label === "Certified" ? "teal" : s.label === "Not eligible" ? "grey" : "blue"
          })),
          max: data.totalFacilities
        }
      ],
      [
        {
          kind: "stacked",
          title: "State assessment records",
          segments: saSegments,
          note: `${data.saCompleted} completed in total; awaiting result is a subset, not a separate bucket.`
        }
      ]
    ],
    note: currentBucket ? `${currentBucket.total} certified in ${period === "fy" ? "FY" : ""} ${currentBucket.label} to date; ${prevBucket?.total ?? 0} in the previous period.` : void 0,
    speakerNotes: "Stage buckets are mutually exclusive and sum to the facility count. “Completed, result issued” and “Completed, awaiting result” add up to Completed; they are never a funnel."
  });
  add({
    id: "profile",
    variant: "light",
    kicker: "SECTION 2 · FACILITY PROFILE",
    title: data.topTypeName && data.totalFacilities > 0 ? `${pctOf(data.topTypeCount, data.totalFacilities)}% of facilities are ${data.topTypeNameLong}` : "No facilities in scope",
    subtitle: data.profileNote,
    columns: [
      [
        {
          kind: "bars",
          title: "By facility type",
          items: data.byTypeBars.map((b) => ({ label: b.label, value: b.count, tone: "teal" }))
        }
      ],
      [
        {
          kind: "bars",
          title: "By block (largest 8)",
          items: data.byBlockBars.map((b) => ({ label: b.label, value: b.count, tone: "blue" }))
        }
      ]
    ],
    note: "HWC HSC = Health & Wellness Centre (sub-centre) · UPHC, UHWC, UGPHC = urban facility types · SDH, DHQH = sub-division and district hospitals.",
    speakerNotes: "Where the facilities are. Counts include every facility in scope."
  });
  add({
    id: "progress",
    variant: "light",
    title: worst?.text ?? "No block has facilities in scope",
    subtitle: `${data.progressNote} State average ${data.certifiedPct}%.`,
    columns: [
      [
        {
          kind: "bars",
          title: "Certified by block (n/N and rate)",
          items: data.blockProgress.map((b) => ({
            label: `${b.block}${b.total < 10 ? " †" : ""} (${b.rate}%)`,
            value: b.certified,
            display: `${b.certified}/${b.total}`,
            tone: bandTone(b.rate)
          })),
          max: Math.max(...data.blockProgress.map((b) => b.total), 1),
          note: `State average ${data.certifiedPct}%. † fewer than 10 facilities — rate is indicative, not a ranking.`
        }
      ],
      [
        {
          kind: "table",
          title: "Certified by facility type",
          head: ["Type", "Facilities", "Certified", "Rate"],
          rows: data.typeProgress.map((t) => [
            t.type,
            String(t.facilities),
            String(t.certified),
            `${t.rate}%`
          ]),
          align: ["left", "right", "right", "right"],
          totalRow: [
            "All types",
            String(data.typeProgress.reduce((a, b) => a + b.facilities, 0)),
            String(data.typeProgress.reduce((a, b) => a + b.certified, 0)),
            `${pctOf(
              data.typeProgress.reduce((a, b) => a + b.certified, 0),
              Math.max(data.typeProgress.reduce((a, b) => a + b.facilities, 0), 1)
            )}%`
          ],
          note: bandLegend
        }
      ]
    ],
    note: bandLegend,
    speakerNotes: "The title names the strict worst block. If several blocks tie, the title says so rather than picking one. Bands come from one configuration object; the legend is generated from it."
  });
  add({
    id: "barriers",
    variant: "light",
    kicker: "SECTION 3 · CERTIFICATION PROGRESS",
    title: `Why ${data.notCertifiedCount} facilities are not certified`,
    subtitle: data.barrierNotes.length > 0 ? data.barrierNotes.slice(0, 2).join("; ") + "." : "No uncertified facilities in scope.",
    columns: [
      [
        {
          kind: "bars",
          title: `Uncertified facilities by main reason (n = ${data.notCertifiedCount})`,
          items: data.barrierBars.map((b) => ({
            label: b.label,
            value: b.count,
            tone: b.tone === "teal" ? "teal" : b.tone === "coral" ? "coral" : b.tone === "amber" ? "amber" : "grey"
          }))
        }
      ],
      [
        {
          kind: "facts",
          items: data.barrierNotes.slice(0, 3).map((note, i) => {
            const [big, ...rest] = note.split(" ");
            return {
              big: /^\d+$/.test(big) ? big : String(i + 1),
              text: rest.join(" ") || note,
              tone: i === 0 ? "coral" : i === 1 ? "amber" : "grey"
            };
          })
        }
      ]
    ],
    note: data.barrierFoot,
    speakerNotes: "Reasons are mutually exclusive with a documented priority order, so the bars add to the uncertified count."
  });
  add({
    id: "ia",
    variant: "light",
    kicker: "SECTION 4 · ASSESSMENT",
    title: data.iaQ1Avg != null && data.iaQ2Avg != null ? `NQAS internal scores moved ${data.iaQ1Avg}% to ${data.iaQ2Avg}% from Q1 to Q2` : "Internal assessment scores are not recorded yet",
    subtitle: data.certifiedIaAvg != null && data.restIaAvg != null ? `Certified facilities average ${data.certifiedIaAvg}% against ${data.restIaAvg}% for the rest.` : "Q1 and Q2 are quarters of the current financial year.",
    columns: [
      [
        {
          kind: "table",
          title: `Facilities by Q2 score band (n = ${data.totalFacilities})`,
          head: ["Score band", "NQAS", "Kayakalp"],
          rows: data.scoreBands.map((b) => [b.label, String(b.nqas), String(b.kayakalp)]),
          align: ["left", "right", "right"],
          totalRow: [
            "All bands",
            String(data.scoreBands.reduce((a, b) => a + b.nqas, 0)),
            String(data.scoreBands.reduce((a, b) => a + b.kayakalp, 0))
          ]
        }
      ],
      [
        {
          kind: "cards",
          items: [
            {
              title: "NQAS IA, Q1 to Q2",
              big: `${data.iaQ1Avg ?? "-"}% to ${data.iaQ2Avg ?? "-"}%`,
              line: `${data.iaImproved} improved · ${data.iaUnchanged} unchanged · ${data.iaDeclined} declined`,
              tone: "teal"
            },
            {
              title: "Kayakalp IA, Q1 to Q2",
              big: `${data.kkQ1Avg ?? "-"}% to ${data.kkQ2Avg ?? "-"}%`,
              line: `${data.kkImproved} improved · ${data.kkUnchanged} unchanged · ${data.kkDeclined} declined`,
              tone: "blue"
            },
            {
              title: "Certified vs not yet certified",
              big: `${data.certifiedIaAvg ?? "-"}% vs ${data.restIaAvg ?? "-"}%`,
              line: `Kayakalp: ${data.certifiedKkAvg ?? "-"}% vs ${data.restKkAvg ?? "-"}%`,
              tone: "amber"
            }
          ]
        }
      ]
    ],
    note: data.iaNote,
    speakerNotes: "Unchanged means within the shared 0.05 no-change band."
  });
  add({
    id: "pipeline",
    variant: "light",
    title: `${data.saCompleted} state assessments completed; ${data.saNoEntry} facilities have no entry`,
    subtitle: `${saCompletedOnly} completed with a result issued · ${saAwaiting} completed and awaiting result · ${data.saScheduled} scheduled · ${data.saNoEntry} no SA entry = ${data.totalFacilities}`,
    columns: [
      [
        {
          kind: "stacked",
          title: "State assessment records (one stacked bar, not a funnel)",
          segments: saSegments
        },
        {
          kind: "text",
          body: data.saAvgScore != null ? `Average state assessment score ${data.saAvgScore}%` + (data.saScoreRange ? ` (range ${data.saScoreRange[0]}–${data.saScoreRange[1]}%).` : ".") : "No state assessment score is recorded."
        }
      ],
      [
        {
          kind: "table",
          title: "State assessment status",
          head: ["Status", "Facilities"],
          rows: [
            ["Completed (all)", String(data.saCompleted)],
            ["— Completed, result issued", String(saCompletedOnly)],
            ["— Completed, awaiting result", String(saAwaiting)],
            ["Scheduled, not done", String(data.saScheduled)],
            ["Yet to be initiated", String(data.saNotInitiated)],
            ["No SA entry", String(data.saNoEntry)]
          ],
          align: ["left", "right"],
          totalRow: ["All facilities", String(data.totalFacilities)]
        }
      ]
    ],
    note: data.saFoot,
    speakerNotes: "Awaiting result is a subset of Completed, never a separate bar. Older certificates pre-date state assessment, so charting certified inside these records would grow the funnel backwards."
  });
  add({
    id: "buildings",
    variant: "light",
    title: `${goodBuildings} buildings are in good condition`,
    subtitle: `${dilapidated} ${dilapidated === 1 ? "is" : "are"} dilapidated · ${data.fireNocRecordedSentence} ${data.nocExpired} expired.`,
    columns: [
      [
        {
          kind: "bars",
          title: `Building condition (n = ${data.totalFacilities})`,
          items: data.buildingBars.map((b) => ({
            label: b.label,
            value: b.count,
            tone: b.tone === "teal" ? "teal" : b.tone === "coral" ? "coral" : b.tone === "amber" ? "amber" : b.tone === "gray" ? "grey" : "light"
          })),
          note: data.buildingReconciles ? `All ${data.totalFacilities} facilities are in exactly one building bucket.` : "Building buckets do not add up — fix the stored statuses."
        }
      ],
      [
        {
          kind: "donut",
          title: "Fire NOC status (date-derived)",
          segments: [
            { label: "Valid", value: data.nocValid, tone: "teal" },
            { label: "Expiring soon", value: data.nocExpiringSoon, tone: "amber" },
            { label: "Expired", value: data.nocExpired, tone: "coral" },
            { label: "Recorded, no validity date", value: data.nocRecordedNoValidity, tone: "blue" },
            { label: "Not recorded", value: data.nocNotRecorded, tone: "grey" }
          ],
          centerValue: String(data.nocRecorded),
          centerLabel: `recorded of ${data.totalFacilities}`,
          caption: `${data.nocExpiredBreakdown} ${data.nocOwnership}`
        }
      ]
    ],
    note: data.buildingUpdatedNote,
    speakerNotes: "Buildings use the shared bucket mapping. Fire NOC has five date-derived buckets that always sum to the facility count; Recorded, no validity date is its own bucket rather than being folded into Valid or Not recorded."
  });
  add({
    id: "validity",
    variant: "light",
    kicker: "SECTION 5 · CERTIFICATION & TRENDS",
    title: data.certExpired > 0 ? `${data.certValid} of ${data.certifiedTotal} certificates are valid; ${data.certExpired} have expired` : `${data.certValid} of ${data.certifiedTotal} certificates are valid`,
    subtitle: data.followUpNote,
    columns: [
      [
        {
          kind: "cards",
          items: [
            {
              title: "Certificate validity",
              big: String(data.certValid),
              line: `of ${data.certifiedTotal} certificates are valid`,
              body: `${data.certExpired} expired${data.certNoStatus > 0 ? `, ${data.certNoStatus} with no validity recorded` : ""}. ${data.certExpiring12m} reach their validity date within 12 months.`,
              tone: "teal"
            }
          ]
        }
      ],
      [
        {
          kind: "cards",
          items: [
            {
              title: "Surveillance visits",
              big: String(data.survOverdue),
              line: "facilities are past their first-year surveillance due date",
              body: `${plural(data.survDoneAny, "visit")} recorded. ${data.survOverdue2} also past the second-year due date.`,
              tone: "amber"
            }
          ]
        }
      ],
      [
        {
          kind: "cards",
          items: [
            {
              title: "Gap-closure funds",
              big: String(data.fundsFacilities),
              line: "facilities have a gap-closure entry",
              body: `${data.fundsTotalLakh != null ? `Total ${money(Math.round(data.fundsTotalLakh * 1e5))}` : "No amounts recorded"}${data.fundsReceivedRecent ? ` (${data.fundsReceivedRecent})` : ""}. ${data.fundsCertified} of them ${data.fundsCertified === 1 ? "is" : "are"} certified.`,
              tone: "blue"
            }
          ]
        }
      ]
    ],
    note: "Money is shown in exact Indian rupees. A blank amount shows -.",
    speakerNotes: "Amounts are exact rupees with Indian digit grouping (₹ 7,90,000), never a rounded figure."
  });
  const byPeriodBars = [
    ...periodRows.map((r) => ({
      label: period === "fy" ? `FY ${r.label}` : r.label,
      value: r.total,
      tone: "teal"
    })),
    { label: "No date", value: periodUndated.total, tone: "grey" }
  ];
  const fyMonthRows = [currentFy - 1, currentFy].map((fy) => {
    const months = Array(12).fill(0);
    for (const r of rows) {
      if (!r.certDate || !isCertifiedRow(r)) continue;
      if (fiscalYearOf(r.certDate) !== fy) continue;
      months[Number(r.certDate.slice(5, 7)) - 1] += 1;
    }
    return {
      label: fy === currentFy ? `FY ${fiscalYearLabel(fy)} (to date)` : `FY ${fiscalYearLabel(fy)}`,
      cells: months,
      total: months.reduce((a, b) => a + b, 0)
    };
  });
  const fyMonthTotals = MONTH_ABBR.map(
    (_, i) => fyMonthRows.reduce((a, r) => a + (r.cells[i] ?? 0), 0)
  );
  add({
    id: "byYear",
    variant: "light",
    title: periodBucketLead(
      currentBucket?.label,
      period,
      currentBucket?.total ?? 0,
      prevBucket?.total ?? 0
    ),
    subtitle: `${periodLabel} · ${period === "fy" ? "April to March" : "January to December"} · ${data.holdCertificate} certifications in total`,
    columns: [
      [
        {
          kind: "bars",
          title: `Certifications by ${period === "fy" ? "fiscal year" : "calendar year"}`,
          items: byPeriodBars,
          note: periodUndated.total > 0 ? `${periodUndated.total} ${periodUndated.total === 1 ? "certified facility has" : "certified facilities have"} no date and ${periodUndated.total === 1 ? "is" : "are"} shown as "No date".` : void 0
        },
        {
          kind: "heatmap",
          title: "Month pattern · current and previous fiscal year",
          monthLabels: MONTH_ABBR,
          rows: fyMonthRows,
          totalLabel: "Total",
          totalCells: fyMonthTotals,
          grandTotal: fyMonthTotals.reduce((a, b) => a + b, 0)
        }
      ],
      [
        {
          kind: "table",
          title: "Quality, conditionality and total",
          head: ["Period", "Quality", "Conditional", "Total"],
          rows: [
            ...periodRows.map((r) => [
              period === "fy" ? `FY ${r.label}` : r.label,
              String(r.quality),
              String(r.cond),
              String(r.total)
            ]),
            ["No date", String(periodUndated.quality), String(periodUndated.cond), String(periodUndated.total)]
          ],
          align: ["left", "right", "right", "right"],
          totalRow: [
            "All",
            String([...periodRows, periodUndated].reduce((a, b) => a + b.quality, 0)),
            String([...periodRows, periodUndated].reduce((a, b) => a + b.cond, 0)),
            String([...periodRows, periodUndated].reduce((a, b) => a + b.total, 0))
          ],
          note: "Total is always Quality + Conditional, computed in code. No date is included in All."
        }
      ]
    ],
    speakerNotes: "Fiscal years are April–March and are the default. The No date row is part of the total, so the chart always sums to the headline. The compact month grid follows the same period switch."
  });
  add({
    id: "heatmap",
    variant: "light",
    kicker: "SECTION 5 · CERTIFICATION & TRENDS",
    title: busiest ? `${busiest.months} are the busiest months` : "Month-by-month certification pattern",
    subtitle: busiest ? `${busiest.count} of ${data.grandTotalDated} dated certifications (${busiest.sharePct}%) fall in those two months.` : "Certifications per month, by year.",
    columns: [
      [
        {
          kind: "heatmap",
          monthLabels: MONTH_ABBR,
          rows: data.yearMonth.map((ym) => ({
            label: ym.yearLabel,
            cells: ym.months,
            total: ym.total
          })),
          totalLabel: "All years",
          totalCells: MONTH_ABBR.map(
            (_, i) => data.yearMonth.reduce((a, ym) => a + (ym.months[i] ?? 0), 0)
          ),
          grandTotal: data.grandTotalDated
        }
      ]
    ],
    note: data.heatmapNote,
    speakerNotes: "Single-hue 5-step scale. Every cell carries its number, so the table reads in black and white."
  });
  const yearIds = ["yearA", "yearB"];
  const monthTables = period === "calendar" ? data.yearDetails.slice(-2) : [];
  for (const yd of monthTables) {
    const months = yd.months;
    const qualityTotal = months.reduce((a, m) => a + m.quality, 0);
    const condTotal = months.reduce((a, m) => a + m.cond, 0);
    const notRecorded = Math.max(0, yd.total - qualityTotal - condTotal);
    add({
      id: yearIds[data.yearDetails.indexOf(yd)] ?? "yearB",
      variant: "light",
      kicker: "SECTION 5 · CERTIFICATION & TRENDS",
      title: `${yd.year}: ${sumSentence([qualityTotal, condTotal], yd.total, "certifications break down as")}`,
      subtitle: yd.headline,
      columns: [
        [
          {
            kind: "bars",
            title: `${yd.year} month by month`,
            items: MONTH_ABBR.map((label, i) => {
              const m = months.find((x) => x.month === i + 1);
              return { label, value: m?.total ?? 0, tone: "teal" };
            })
          }
        ],
        [
          {
            kind: "table",
            title: "Month table (Quality | Conditional | Total)",
            head: ["Month", "Quality", "Conditional", "Total"],
            rows: [
              ...months.map((m) => [
                m.label,
                String(m.quality),
                String(m.cond),
                String(m.total)
              ]),
              ...notRecorded > 0 ? [["Result not recorded", "0", "0", String(notRecorded)]] : []
            ],
            align: ["left", "right", "right", "right"],
            totalRow: [
              "Total",
              String(qualityTotal),
              String(condTotal),
              String(yd.total)
            ]
          }
        ]
      ],
      note: `Facility mix: ${yd.typeMix || "-"} · Assessment mode: Virtual ${yd.virtualCount} · Physical ${yd.physicalCount}.`,
      speakerNotes: "The Total row is computed from the column sums. Any dated row with no result is disclosed as its own row."
    });
  }
  const actionItems = checks.issues.filter((issue) => issue.count > 0 && issue.id !== "result-no-date").slice(0, 6).map((issue, index) => ({
    n: index + 1,
    title: issue.label,
    body: `${plural(issue.count, "facility", "facilities")} — ` + issue.facilities.slice(0, 4).join(", ") + (issue.facilities.length > 4 ? `, +${issue.facilities.length - 4} more` : "")
  }));
  add({
    id: "takeaways",
    variant: "dark",
    title: "What needs action",
    subtitle: `${actionItems.length} ${actionItems.length === 1 ? "action" : "actions"} across ${data.totalFacilities} facilities · ${data.blocksCount} blocks`,
    columns: [
      [
        {
          kind: "takeaways",
          items: actionItems.length > 0 ? actionItems : [{ n: 1, title: "No exceptions open", body: "Every reconciliation passes in this scope." }]
        }
      ]
    ],
    speakerNotes: (actionItems.length > 0 ? actionItems.map(
      (item, index) => `${index + 1}. ${item.title}: ${checks.issues.find((i) => i.label === item.title)?.facilities.join(", ") ?? ""}`
    ).join("\n") : "No exceptions open.") + `
Full lists: ${checks.issues.filter((i) => i.count > 0).map((i) => `${i.label} (${i.count}) — ${i.href ?? "Master List"}`).join("; ")}`
  });
  add({
    id: "checks",
    variant: "light",
    kicker: "SECTION 6 · CLOSE",
    title: checks.totalIssues > 0 ? `Data check: ${checks.totalIssues} ${checksWord} in ${data.totalFacilities} facilities` : "Data check: every number reconciles",
    subtitle: checks.totalIssues > 0 ? "Each count has ONE definition and a named list. Fix the amber rows first; coral rows are blocking." : "Bucket sums, the certified reconciliation and the Fire NOC total all agree.",
    columns: [
      [
        {
          kind: "table",
          title: "Checks with a named list",
          head: ["Check", "Facilities", "Definition"],
          rows: checks.issues.map((i) => [
            i.label,
            String(i.count),
            i.definition.length > 92 ? `${i.definition.slice(0, 89)}…` : i.definition
          ]),
          align: ["left", "right", "left"]
        }
      ],
      [
        {
          kind: "bullets",
          title: "Reconciliation",
          tone: checks.failed > 0 ? "coral" : "teal",
          items: checks.reconcile.map(
            (r) => `${r.ok ? "PASS" : "FAIL"} — ${r.label}: ${r.detail}`
          )
        }
      ]
    ],
    note: checks.issues.find((i) => i.id === "certified-no-date")?.count ? `No date = ${checks.issues.find((i) => i.id === "certified-no-date")?.count} certified facilities; the “result but no date” list is a superset and is not added to it.` : "No certification-date exceptions.",
    dataCheck: { issues: checks.totalIssues, text: `${checks.totalIssues} data ${checksWord}` },
    speakerNotes: "One definition per row. The “certified with no date” check is the only one that feeds the No date row; the “result with no date” list is a superset and is never added to it."
  });
  add({
    id: "defs",
    variant: "light",
    kicker: "SECTION 6 · CLOSE",
    title: "Definitions and method",
    subtitle: "One rule set for every number in this deck, the report page, the dashboard and the exports.",
    columns: [
      [
        {
          kind: "defs",
          items: [
            ...data.definitions,
            {
              term: "Fiscal vs calendar",
              definition: "Fiscal year = April to March, the default. Calendar year = January to December. The switch relabels the by-year slide and never changes a facility's own dates."
            },
            {
              term: "No date",
              definition: `${periodUndated.total} certified ${periodUndated.total === 1 ? "facility has" : "facilities have"} a result but no certification date, so ${periodUndated.total === 1 ? "it cannot" : "they cannot"} be placed in a year. ${periodUndated.total === 1 ? "It is" : "They are"} shown as ${periodUndated.total === 1 ? "its" : "their"} own row and included in the headline.`
            },
            {
              term: "Data checks",
              definition: "Each check has one definition and a named list. Reconciliation must pass before the deck is considered final; State Admins may still download a deck with a data-check stamp."
            }
          ]
        }
      ]
    ],
    note: `${ORG_NAME} · ${meta.reportId} · ${meta.dataAsOf}`,
    speakerNotes: "Definitions are generated from the same rule set as the numbers. If a rule changes, this slide changes in the same build."
  });
  return {
    slides,
    data,
    checks,
    meta,
    periodRows,
    periodUndated
  };
}
function periodBucketLead(label, period, current, previous) {
  if (current === 0 && previous === 0)
    return "No certification is dated in the last two periods";
  const noun = period === "fy" ? `FY ${label}` : String(label);
  return `${previous} certified in the previous ${period === "fy" ? "fiscal year" : "year"}; ${current} so far in ${noun}`;
}

const DECK_SURFACES = {
  light: {
    key: "light",
    dark: false,
    bg: "#FFFFFF",
    panel: "#F2F7F6",
    ink: "#12302E",
    muted: "#4E6663",
    line: "#D6E2E0",
    accent: "#0F6B63",
    titleBar: "#0F6B63",
    titleInk: "#FFFFFF",
    rowAlt: "#F7FAF9",
    totalRow: "#E3EEEC",
    heroOuter: "#0E4C4C",
    heroInner: "#12777A",
    heroInk: "#FFFFFF",
    heroRing: "#9BD8D0",
    heroRingRest: "#1C5A57"
  },
  dark: {
    key: "dark",
    dark: true,
    bg: "#0B3B3B",
    panel: "#124A48",
    ink: "#F5FBFA",
    muted: "#BFDCD8",
    line: "#2C6360",
    accent: "#9BD8D0",
    titleBar: "#0B3B3B",
    titleInk: "#FFFFFF",
    rowAlt: "#0F4444",
    totalRow: "#164F4C",
    heroOuter: "#0E4C4C",
    heroInner: "#12777A",
    heroInk: "#FFFFFF",
    heroRing: "#9BD8D0",
    heroRingRest: "#1C5A57"
  },
  contrast: {
    key: "contrast",
    dark: false,
    bg: "#FFFFFF",
    panel: "#FFFFFF",
    ink: "#000000",
    muted: "#1A1A1A",
    line: "#000000",
    accent: "#000000",
    titleBar: "#000000",
    titleInk: "#FFFFFF",
    rowAlt: "#FFFFFF",
    totalRow: "#FFFFFF",
    heroOuter: "#000000",
    heroInner: "#000000",
    heroInk: "#FFFFFF",
    heroRing: "#000000",
    heroRingRest: "#B3B3B3"
  },
  contrastDark: {
    key: "contrastDark",
    dark: true,
    bg: "#000000",
    panel: "#000000",
    ink: "#FFFFFF",
    muted: "#FFFFFF",
    line: "#FFFFFF",
    accent: "#FFFFFF",
    titleBar: "#000000",
    titleInk: "#FFFFFF",
    rowAlt: "#000000",
    totalRow: "#000000",
    heroOuter: "#FFFFFF",
    heroInner: "#000000",
    heroInk: "#FFFFFF",
    heroRing: "#FFFFFF",
    heroRingRest: "#4D4D4D"
  }
};
function isDarkSlide(variant) {
  return variant === "cover" || variant === "dark";
}
function resolveDeckSurface(theme, variant) {
  const t = theme ?? "light";
  if (t === "high-contrast") {
    return isDarkSlide(variant) ? DECK_SURFACES.contrastDark : DECK_SURFACES.contrast;
  }
  if (t === "dark-cover") {
    return isDarkSlide(variant) ? DECK_SURFACES.dark : DECK_SURFACES.light;
  }
  return DECK_SURFACES.light;
}
const DECK_DENSITY = {
  comfortable: { key: "comfortable", fontScale: 1, gapScale: 1, padScale: 1, rowScale: 1 },
  compact: { key: "compact", fontScale: 0.9, gapScale: 0.72, padScale: 0.78, rowScale: 0.82 }
};
function deckDensity(density) {
  return density === "compact" ? DECK_DENSITY.compact : DECK_DENSITY.comfortable;
}
function scaleDeckFont(size, density, min = 7) {
  const scaled = size * deckDensity(density).fontScale;
  return Math.max(min, Math.round(scaled * 10) / 10);
}

const DECK_W = 960;
const DECK_H = 540;
const TONE_TEXT = TONE_INK_LIGHT;
const TONE_TEXT_DARK = TONE_INK_DARK;
const tone = (t, surface) => surface.dark ? TONE_TEXT_DARK[t ?? "teal"] : TONE_TEXT[t ?? "teal"];
const fill = (t) => TONE_HEX[t ?? "teal"];
const P = 40;
const HEADER_H = 96;
const FOOTER_H = 34;
function blockWeight(b) {
  switch (b.kind) {
    case "kpis":
      return 0.42 * Math.ceil(b.items.length / 3) + 0.1;
    case "bars":
      return 0.34 + 0.15 * Math.max(1, b.items.length);
    case "stacked":
      return 0.95;
    case "table":
      return 0.52 + 0.1 * (b.rows.length + (b.totalRow ? 1 : 0));
    case "heatmap":
      return 0.9 + 0.28 * Math.max(1, b.rows.length);
    case "donut":
      return 1.5;
    case "cards":
      return 0.42 + 0.64 * b.items.length;
    case "facts":
      return 0.38 * Math.max(1, b.items.length) + 0.08;
    case "takeaways":
      return 1;
    case "defs":
      return Math.max(1, Math.ceil(b.items.length / 4)) * 0.7;
    case "text":
      return 0.26 + 0.055 * Math.ceil(b.body.length / 90);
    case "bullets":
      return 0.26 + 0.11 * Math.max(1, b.items.length);
  }
}
function BlockTitle({
  children,
  surface,
  density,
  size = 12
}) {
  const d = deckDensity(density);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      style: {
        fontSize: scaleDeckFont(size, density, 8),
        fontWeight: 700,
        color: surface.ink,
        lineHeight: 1.2,
        marginBottom: Math.round(6 * d.gapScale),
        flexShrink: 0
      },
      children
    }
  );
}
function Block({
  block,
  surface,
  density,
  fluid
}) {
  const d = deckDensity(density);
  const fs = (n) => scaleDeckFont(n, density, 8);
  const gap = (n) => Math.max(1, Math.round(n * d.gapScale));
  const pad = (n) => Math.max(1, Math.round(n * d.padScale));
  const title = "title" in block && block.title ? /* @__PURE__ */ jsxRuntimeExports.jsx(BlockTitle, { surface, density, children: block.title }) : null;
  const wrap = fluid ? { width: "100%" } : { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" };
  const body = { flex: 1, minHeight: 0 };
  switch (block.kind) {
    case "kpis": {
      const cols = block.items.length > 4 ? 3 : Math.max(1, Math.min(2, block.items.length));
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: wrap, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: gap(12),
            flex: 1,
            minHeight: 0
          },
          children: block.items.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                background: surface.panel,
                border: `1px solid ${surface.line}`,
                borderRadius: 8,
                padding: `${pad(10)}px ${pad(12)}px`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                minHeight: 0
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    style: {
                      fontSize: fs(34),
                      lineHeight: 1,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: tone(item.tone, surface)
                    },
                    children: item.value
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    style: {
                      marginTop: gap(5),
                      fontSize: fs(12),
                      lineHeight: 1.25,
                      fontWeight: 700,
                      color: surface.ink
                    },
                    children: item.label
                  }
                ),
                item.note && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: fs(11), lineHeight: 1.25, color: surface.muted }, children: item.note })
              ]
            },
            i
          ))
        }
      ) });
    }
    case "bars": {
      const max = Math.max(1, block.max ?? Math.max(...block.items.map((i) => i.value), 1));
      const count = Math.max(1, block.items.length);
      const compact = count > 8;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: wrap, children: [
        title,
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              ...body,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: gap(2)
            },
            children: block.items.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                style: {
                  display: "grid",
                  gridTemplateColumns: "38% minmax(0, 1fr) 64px",
                  alignItems: "center",
                  gap: gap(8),
                  flex: 1,
                  minHeight: Math.round((compact ? 16 : 20) * d.rowScale)
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      style: {
                        fontSize: fs(compact ? 11 : 12),
                        lineHeight: 1.15,
                        color: surface.ink,
                        overflowWrap: "anywhere"
                      },
                      "data-tip": item.label,
                      "data-tip-truncate": true,
                      children: item.label
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      style: {
                        display: "block",
                        height: Math.max(8, Math.round((compact ? 12 : 14) * d.rowScale)),
                        background: surface.panel,
                        borderRadius: 3,
                        overflow: "hidden"
                      },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "span",
                        {
                          style: {
                            display: "block",
                            height: "100%",
                            width: `${Math.max(item.value > 0 ? 1.5 : 0, item.value / max * 100)}%`,
                            background: fill(item.tone),
                            borderRadius: 3
                          }
                        }
                      )
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      style: {
                        textAlign: "right",
                        fontSize: fs(compact ? 11 : 12),
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        color: surface.ink
                      },
                      children: item.display ?? item.value
                    }
                  )
                ]
              },
              i
            ))
          }
        ),
        block.note && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              flexShrink: 0,
              marginTop: gap(5),
              fontSize: fs(10),
              lineHeight: 1.3,
              color: surface.muted
            },
            children: block.note
          }
        )
      ] });
    }
    case "stacked": {
      const total = Math.max(
        1,
        block.segments.reduce((a, s) => a + s.value, 0)
      );
      const visible = block.segments.filter((s) => s.value > 0);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: wrap, children: [
        title,
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: gap(4)
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  style: {
                    display: "flex",
                    height: Math.max(24, Math.round(38 * d.rowScale)),
                    borderRadius: 5,
                    overflow: "hidden",
                    background: surface.panel
                  },
                  children: visible.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      style: {
                        width: `${s.value / total * 100}%`,
                        background: fill(s.tone),
                        color: inkOnFill(fill(s.tone)),
                        fontSize: fs(11),
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: s.value > 0 ? 18 : 0
                      },
                      children: s.value
                    },
                    i
                  ))
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  style: {
                    marginTop: gap(7),
                    display: "grid",
                    gridTemplateColumns: visible.length > 3 ? "1fr 1fr" : "1fr",
                    gap: `${gap(3)}px ${gap(14)}px`
                  },
                  children: visible.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: gap(6),
                        fontSize: fs(11),
                        lineHeight: 1.25,
                        color: surface.ink
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "span",
                          {
                            style: {
                              width: 9,
                              height: 9,
                              borderRadius: 2,
                              background: fill(s.tone),
                              flexShrink: 0
                            }
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                          s.label,
                          ": ",
                          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: s.value }),
                          " of ",
                          total
                        ] })
                      ]
                    },
                    i
                  ))
                }
              )
            ]
          }
        ),
        block.note && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flexShrink: 0, marginTop: gap(5), fontSize: fs(10), color: surface.muted }, children: block.note })
      ] });
    }
    case "table": {
      const rowCount = block.rows.length + (block.totalRow ? 1 : 0);
      const size = fs(rowCount > 10 ? 10.5 : rowCount > 7 ? 11 : 12);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: wrap, children: [
        title,
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { ...body, overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "table",
          {
            style: {
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
              fontSize: size,
              lineHeight: 1.2
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: block.head.map((h, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "th",
                {
                  style: {
                    background: surface.titleBar,
                    color: surface.titleInk,
                    textAlign: block.align?.[i] === "right" || i > 0 && block.align?.[i] !== "left" ? "right" : "left",
                    padding: `${pad(5)}px ${pad(6)}px`,
                    fontWeight: 700,
                    fontSize: size
                  },
                  children: h
                },
                i
              )) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
                block.rows.map((row, ri) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: ri % 2 ? surface.panel : "transparent" }, children: row.map((cell, ci) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "td",
                  {
                    style: {
                      padding: `${pad(4)}px ${pad(6)}px`,
                      borderBottom: `1px solid ${surface.line}`,
                      textAlign: block.align?.[ci] === "right" || ci > 0 && block.align?.[ci] !== "left" ? "right" : "left",
                      color: surface.ink,
                      fontVariantNumeric: ci > 0 ? "tabular-nums" : void 0,
                      overflowWrap: "anywhere"
                    },
                    children: cell === "" ? "-" : cell
                  },
                  ci
                )) }, ri)),
                block.totalRow && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: surface.panel }, children: block.totalRow.map((cell, ci) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "td",
                  {
                    style: {
                      padding: `${pad(5)}px ${pad(6)}px`,
                      fontWeight: 700,
                      textAlign: block.align?.[ci] === "right" || ci > 0 && block.align?.[ci] !== "left" ? "right" : "left",
                      color: surface.ink,
                      fontVariantNumeric: ci > 0 ? "tabular-nums" : void 0,
                      borderTop: `2px solid ${surface.line}`,
                      overflowWrap: "anywhere"
                    },
                    children: cell
                  },
                  ci
                )) })
              ] })
            ]
          }
        ) }),
        block.note && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flexShrink: 0, marginTop: gap(4), fontSize: fs(10), color: surface.muted }, children: block.note })
      ] });
    }
    case "heatmap": {
      const contrast = surface.key === "contrast" || surface.key === "contrastDark";
      const shade = (n) => n <= 0 ? surface.panel : contrast ? n < 2 ? "#E6E6E6" : n < 4 ? "#B3B3B3" : n < 7 ? "#666666" : surface.key === "contrastDark" ? "#FFFFFF" : "#000000" : n < 2 ? "#DCEEEA" : n < 4 ? "#B3DCD5" : n < 7 ? "#72B8AE" : "#0F6B63";
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: wrap, children: [
        title,
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { ...body, overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "table",
          {
            style: {
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
              fontSize: fs(11)
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "th",
                  {
                    style: {
                      width: 120,
                      background: surface.titleBar,
                      color: surface.titleInk,
                      textAlign: "left",
                      padding: `${pad(4)}px ${pad(5)}px`,
                      fontSize: fs(11)
                    },
                    children: "Year"
                  }
                ),
                block.monthLabels.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "th",
                  {
                    style: {
                      background: surface.titleBar,
                      color: surface.titleInk,
                      padding: `${pad(4)}px ${pad(1)}px`,
                      fontSize: fs(10),
                      fontWeight: 700
                    },
                    children: m
                  },
                  m
                )),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "th",
                  {
                    style: {
                      width: 44,
                      background: surface.titleBar,
                      color: surface.titleInk,
                      fontSize: fs(10),
                      padding: `${pad(4)}px ${pad(2)}px`
                    },
                    children: "Total"
                  }
                )
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
                block.rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "td",
                    {
                      style: {
                        padding: `${pad(4)}px ${pad(5)}px`,
                        fontWeight: 700,
                        fontSize: fs(11),
                        color: surface.ink,
                        borderBottom: `1px solid ${surface.line}`
                      },
                      children: row.label
                    }
                  ),
                  row.cells.map((n, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "td",
                    {
                      style: {
                        textAlign: "center",
                        background: shade(n),
                        color: inkOnFill(shade(n)),
                        fontWeight: n > 0 ? 700 : 400,
                        padding: `${pad(4)}px ${pad(1)}px`,
                        border: `1px solid ${surface.bg}`,
                        fontVariantNumeric: "tabular-nums",
                        fontSize: fs(11)
                      },
                      children: n === 0 ? "-" : n
                    },
                    i
                  )),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "td",
                    {
                      style: {
                        textAlign: "center",
                        fontWeight: 700,
                        color: surface.ink,
                        borderBottom: `1px solid ${surface.line}`,
                        fontVariantNumeric: "tabular-nums"
                      },
                      children: row.total
                    }
                  )
                ] }, row.label)),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { background: surface.panel }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: `${pad(4)}px ${pad(5)}px`, fontWeight: 700, color: surface.ink }, children: block.totalLabel }),
                  block.totalCells.map((n, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "td",
                    {
                      style: {
                        textAlign: "center",
                        fontWeight: 700,
                        color: surface.ink,
                        fontVariantNumeric: "tabular-nums"
                      },
                      children: n
                    },
                    i
                  )),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "td",
                    {
                      style: {
                        textAlign: "center",
                        fontWeight: 700,
                        background: surface.titleBar,
                        color: surface.titleInk,
                        fontVariantNumeric: "tabular-nums"
                      },
                      children: block.grandTotal
                    }
                  )
                ] })
              ] })
            ]
          }
        ) })
      ] });
    }
    case "donut": {
      const total = Math.max(
        1,
        block.segments.reduce((a, s) => a + s.value, 0)
      );
      let acc = 0;
      const stops = block.segments.map((s) => {
        const from = acc / total * 360;
        acc += s.value;
        const to = acc / total * 360;
        return `${fill(s.tone)} ${from}deg ${to}deg`;
      }).join(", ");
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: wrap, children: [
        title,
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              ...body,
              display: "flex",
              alignItems: "center",
              gap: gap(18)
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  style: {
                    position: "relative",
                    width: Math.round(164 * d.rowScale),
                    height: Math.round(164 * d.rowScale),
                    flexShrink: 0,
                    borderRadius: "50%",
                    background: `conic-gradient(${stops})`
                  },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      style: {
                        position: "absolute",
                        inset: "27%",
                        borderRadius: "50%",
                        background: surface.bg,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center"
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: fs(30), fontWeight: 700, lineHeight: 1, color: surface.ink }, children: block.centerValue }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "span",
                          {
                            style: {
                              fontSize: fs(10),
                              lineHeight: 1.15,
                              color: surface.muted,
                              textAlign: "center",
                              padding: "0 6px"
                            },
                            children: block.centerLabel
                          }
                        )
                      ]
                    }
                  )
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { minWidth: 0, flex: 1 }, children: block.segments.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  style: {
                    display: "flex",
                    alignItems: "flex-start",
                    gap: gap(6),
                    fontSize: fs(11.5),
                    lineHeight: 1.3,
                    color: surface.ink,
                    marginBottom: gap(3)
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        style: {
                          width: 9,
                          height: 9,
                          borderRadius: 2,
                          marginTop: 3,
                          flexShrink: 0,
                          background: fill(s.tone)
                        }
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                      s.label,
                      ": ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: s.value })
                    ] })
                  ]
                },
                i
              )) })
            ]
          }
        ),
        block.caption && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flexShrink: 0, marginTop: gap(4), fontSize: fs(10), color: surface.muted }, children: block.caption })
      ] });
    }
    case "cards":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: wrap, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          style: {
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateRows: `repeat(${Math.max(1, block.items.length)}, minmax(0, 1fr))`,
            gap: gap(10)
          },
          children: block.items.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                background: surface.panel,
                border: `1px solid ${surface.line}`,
                borderRadius: 8,
                padding: `${pad(10)}px ${pad(12)}px`,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: fs(11), fontWeight: 700, color: surface.ink }, children: item.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    style: {
                      fontSize: fs(30),
                      lineHeight: 1.1,
                      fontWeight: 700,
                      color: tone(item.tone, surface),
                      fontVariantNumeric: "tabular-nums"
                    },
                    children: item.big
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: fs(12), lineHeight: 1.25, color: surface.ink }, children: item.line }),
                item.body && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: gap(2), fontSize: fs(11), lineHeight: 1.25, color: surface.muted }, children: item.body })
              ]
            },
            i
          ))
        }
      ) });
    case "facts":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: wrap, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: gap(9) }, children: block.items.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          style: {
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: gap(12),
            background: surface.panel,
            border: `1px solid ${surface.line}`,
            borderRadius: 8,
            padding: `${pad(8)}px ${pad(12)}px`
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                style: {
                  fontSize: fs(26),
                  fontWeight: 700,
                  lineHeight: 1,
                  minWidth: Math.round(44 * d.rowScale),
                  fontVariantNumeric: "tabular-nums",
                  color: tone(item.tone, surface)
                },
                children: item.big
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: fs(12.5), lineHeight: 1.3, color: surface.ink }, children: item.text })
          ]
        },
        i
      )) }) });
    case "takeaways":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: wrap, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          style: {
            flex: 1,
            display: "grid",
            gridTemplateColumns: block.items.length > 3 ? "1fr 1fr" : "1fr",
            gap: gap(10),
            alignContent: "stretch"
          },
          children: block.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                background: surface.panel,
                border: `1px solid ${surface.line}`,
                borderRadius: 8,
                padding: `${pad(9)}px ${pad(11)}px`,
                minHeight: 0
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: gap(8), alignItems: "baseline" }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: fs(18), fontWeight: 700, color: surface.accent }, children: item.n }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: fs(13), fontWeight: 700, lineHeight: 1.2, color: surface.ink }, children: item.title })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: gap(4), fontSize: fs(11.5), lineHeight: 1.3, color: surface.muted }, children: item.body })
              ]
            },
            item.n
          ))
        }
      ) });
    case "defs":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: wrap, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          style: {
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: gap(8),
            alignContent: "start"
          },
          children: block.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                border: `1px solid ${surface.line}`,
                borderRadius: 6,
                padding: `${pad(6)}px ${pad(8)}px`,
                background: surface.panel
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: fs(11), fontWeight: 700, color: surface.ink }, children: item.term }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: gap(2), fontSize: fs(10.5), lineHeight: 1.3, color: surface.muted }, children: item.definition })
              ]
            },
            item.term
          ))
        }
      ) });
    case "text":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: wrap, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "p",
        {
          style: {
            fontSize: fs(12),
            lineHeight: 1.45,
            color: surface.muted,
            margin: 0
          },
          children: block.body
        }
      ) });
    case "bullets":
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: wrap, children: [
        title,
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "ul",
          {
            style: {
              margin: 0,
              padding: 0,
              listStyle: "none",
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: gap(10)
            },
            children: block.items.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "li",
              {
                style: {
                  display: "flex",
                  gap: gap(8),
                  fontSize: fs(12),
                  lineHeight: 1.35,
                  color: surface.ink
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      style: {
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        marginTop: 5,
                        flexShrink: 0,
                        background: block.tone === "coral" ? TONE_HEX.coral : block.tone === "amber" ? TONE_HEX.amber : surface.accent
                      }
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item })
                ]
              },
              i
            ))
          }
        )
      ] });
  }
}
function Footer({
  surface,
  left,
  page,
  total
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      style: {
        position: "absolute",
        left: P,
        right: P,
        bottom: 12,
        height: FOOTER_H - 12,
        borderTop: `1px solid ${surface.line}`,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        fontSize: 10,
        color: surface.muted
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            style: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            },
            children: left
          }
        ),
        page != null && total != null && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { flexShrink: 0, fontVariantNumeric: "tabular-nums" }, children: [
          page,
          " / ",
          total
        ] })
      ]
    }
  );
}
function CoverSlide({
  slide,
  surface,
  dataAsOf,
  filtersLabel,
  page,
  total
}) {
  const heroPct = Number(
    String(slide.hero?.label ?? "").match(/(\d+)%/)?.[1] ?? 0
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: `${P + 6}px ${P}px 0`, maxWidth: 700 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: surface.accent }, children: "DISTRICT QUALITY ASSURANCE UNIT" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "h2",
        {
          style: {
            margin: "8px 0 0",
            fontSize: 42,
            lineHeight: 1.05,
            fontWeight: 800,
            color: surface.ink,
            letterSpacing: "-0.01em"
          },
          children: slide.title
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { margin: "10px 0 0", fontSize: 17, lineHeight: 1.35, color: surface.muted }, children: slide.subtitle })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        style: {
          position: "absolute",
          right: P + 8,
          top: 150,
          width: 242,
          height: 242,
          borderRadius: "50%",
          background: `conic-gradient(${surface.heroRing} ${Math.min(100, heroPct)}%, ${surface.heroRingRest} 0)`,
          padding: 12
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: surface.bg,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "0 16px"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 62, lineHeight: 1, fontWeight: 800, color: surface.ink }, children: slide.hero?.value ?? "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { marginTop: 6, fontSize: 12, lineHeight: 1.25, color: surface.muted }, children: slide.hero?.label })
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        style: {
          position: "absolute",
          left: P,
          right: P,
          top: 340,
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          maxWidth: 640
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              fontSize: 12,
              lineHeight: 1.5,
              color: surface.muted,
              maxWidth: 560
            },
            children: slide.columns.flat().find((b) => b.kind === "text")?.body ?? filtersLabel ?? ""
          }
        )
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Footer,
      {
        surface,
        left: `${ORG_NAME} · ${filtersLabel ? `${filtersLabel} · ` : ""}${dataAsOf ?? ""}`,
        page,
        total
      }
    )
  ] });
}
function DeckSlidePreview({
  slide,
  className,
  page,
  total,
  dataAsOf,
  filtersLabel,
  theme = "light",
  density = "comfortable"
}) {
  const host = reactExports.useRef(null);
  const [scale, setScale] = reactExports.useState(0.5);
  reactExports.useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth || DECK_W;
      setScale(Math.max(0.05, width / DECK_W));
    };
    measure();
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const d = deckDensity(density);
  const surface = resolveDeckSurface(theme, slide.variant);
  const isCover = slide.id === "title";
  const headerH = Math.round(HEADER_H * (density === "compact" ? 0.92 : 1));
  const contentTop = isCover ? 0 : headerH + Math.round(18 * d.gapScale);
  const contentHeight = DECK_H - contentTop - (FOOTER_H + 12);
  const columns = slide.columns.length || 1;
  const colGap = Math.round(20 * d.gapScale);
  const colW = (DECK_W - P * 2 - colGap * (columns - 1)) / columns;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      ref: host,
      className: cn("relative w-full overflow-hidden rounded-xl", className),
      style: { aspectRatio: "16 / 9", background: surface.bg },
      "data-deck-canvas": "960x540",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          style: {
            width: DECK_W,
            height: DECK_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
            background: surface.bg,
            color: surface.ink,
            fontFamily: "Calibri, Carlito, 'Segoe UI', sans-serif"
          },
          "data-deck-slide": slide.id,
          children: isCover ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            CoverSlide,
            {
              slide,
              surface,
              dataAsOf,
              filtersLabel,
              page,
              total
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                style: {
                  height: headerH,
                  background: surface.titleBar,
                  color: surface.titleInk,
                  padding: `${Math.round(18 * d.padScale)}px ${P}px 0`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start"
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "h2",
                    {
                      style: {
                        margin: 0,
                        fontSize: scaleDeckFont(28, density, 20),
                        lineHeight: 1.12,
                        fontWeight: 700,
                        color: surface.titleInk,
                        maxWidth: 860
                      },
                      children: slide.title
                    }
                  ),
                  slide.subtitle && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "p",
                    {
                      style: {
                        margin: `${Math.round(5 * d.gapScale)}px 0 0`,
                        fontSize: scaleDeckFont(14, density, 11),
                        lineHeight: 1.25,
                        color: surface.titleInk,
                        maxWidth: 860
                      },
                      children: slide.subtitle
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                style: {
                  position: "absolute",
                  top: contentTop,
                  left: P,
                  right: P,
                  height: contentHeight,
                  display: "flex",
                  gap: colGap
                },
                children: slide.columns.map((blocks, ci) => {
                  const weights = blocks.map(blockWeight);
                  const sum = weights.reduce((a, b) => a + b, 0) || 1;
                  return /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      style: {
                        width: colW,
                        display: "flex",
                        flexDirection: "column",
                        gap: Math.round(12 * d.gapScale),
                        minWidth: 0
                      },
                      children: blocks.map((block, bi) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "div",
                        {
                          style: {
                            flex: weights[bi] / sum,
                            minHeight: 0,
                            display: "flex",
                            flexDirection: "column"
                          },
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Block, { block, surface, density })
                        },
                        bi
                      ))
                    },
                    ci
                  );
                })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Footer,
              {
                surface,
                left: `${ORG_NAME} · NQAS Summary Report · Data as of ${dataAsOf ?? ""}`,
                page,
                total
              }
            )
          ] })
        }
      )
    }
  );
}
function DeckBlocksView({
  slide,
  className
}) {
  const columns = reactExports.useMemo(() => slide.columns, [slide.columns]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn("grid gap-4 @container", className),
      "data-deck-blocks": true,
      style: {
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        alignItems: "start"
      },
      children: columns.map((blocks, ci) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gap: 18, minWidth: 0 }, children: blocks.map((block, bi) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { minWidth: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Block, { block, surface: DECK_SURFACES.light, density: "comfortable", fluid: true }) }, bi)) }, ci))
    }
  );
}

export { ADMIN_ONLY_HIDE as A, DEFAULT_SLIDE_ORDER as D, REFERENCED_SLIDES as R, SLIDE_TITLES as S, TONE_HEX as T, DEFAULT_HIDDEN_SLIDES as a, buildDeckModel as b, DECK_SECTIONS as c, DeckSlidePreview as d, DeckBlocksView as e, deckDensity as f, TONE_INK_DARK as g, TONE_INK_LIGHT as h, inkOnFill as i, parseRateBands as p, resolveDeckSurface as r, scaleDeckFont as s };
