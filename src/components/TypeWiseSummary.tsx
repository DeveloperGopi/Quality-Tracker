import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  AutoFitTableScroll,
} from "@/components/ui/table";
import { deriveFlatLifecycle } from "@/convex/lifecycle";
import {
  BUILDING_BUCKET_ORDER,
  buildingBucketOf,
  emptyBuildingCounts,
  sumBuildingCounts,
  type BuildingBucket,
} from "@/lib/buildingBuckets";
import {
  NOT_IN_PIPELINE_BUCKET,
  NOT_RECORDED_BUCKET,
  RESULT_DECLARED_BUCKET,
  classifyPipeline,
  docColumnStatuses,
  docStageLabel,
} from "@/lib/reportPipeline";
import { formatPercent, percentLabel, percentOf } from "@/lib/reportMetrics";

export type TypeWiseRow = {
  facilityId?: string;
  facilityType: string;
  block: string;
  phc: string;
  /** Active certification cycle (#1, #2 …) — enables cycle-scoped summaries. */
  cycle?: number | null;
  currentStatus: string;
  certStatus: string | null;
  /** Raw NQAS assessment status and start date — the shared lifecycle view
   *  derives "NA Scheduled" from them (date-primary rule), so no caller has
   *  to pre-compute a schedule flag. */
  naStatus: string | null;
  naStartDate: string | null;
  saStatus: string | null;
  /** SaQsham Documents Status (generalDocStatus on the state assessment). */
  docStatus: string | null;
  buildingStatus: string | null;
};

export type TypeWiseSummaryRow = {
  label: string;
  target: number;
  certified: number;
  conditional: number;
  totalCertified: number;
  certifiedPct: number;
  deferred: number;
  /** Remainder of the CERTIFICATION group: target − certified − conditional
   *  − deferred. Include it and the group always sums to Target. */
  notCertified: number;
  nqasScheduled: number;
  resultAwaited: number;
  /** The automatic value written for certified / conditional / deferred. */
  resultDeclared: number;
  /** No SaQsham Documents Status recorded at all. */
  notRecorded: number;
  /** Explicit remainder — a stored status the admin list does not know.
   *  Non-zero means the Pipeline check FAILS and names these facilities. */
  notInPipeline: number;
  docCounts: Record<string, number>;
  nextPhase: number;
  docTotal: number;
  /** Counts keyed by the SHARED building bucket — never by a raw value. */
  buildingCounts: Record<BuildingBucket, number>;
  buildingTotal: number;
  /** Facility ids that make a group fail (remainder / double count). */
  failures: { certification: string[]; pipeline: string[]; building: string[] };
  reconcile: { certification: boolean; pipeline: boolean; building: boolean };
};

/**
 * Aggregate facilities by facility type, block, or PHC into the rows used by
 * the government summary.
 *
 * ONE bucket per facility per group:
 *   • certification — certified / conditional / deferred, remainder "not certified";
 *   • pipeline — declared result / NQAS scheduled / result awaited / next phase /
 *     one document stage / not recorded, remainder "not in pipeline";
 *   • building — the shared building-bucket list.
 * The percent uses the shared PERCENT_DECIMALS.
 */
export function summarizeTypeWise(
  rows: TypeWiseRow[],
  dimension: "type" | "block" | "phc",
  docStatuses: string[],
  /** Kept for callers; the columns now come from the ONE shared bucket list. */
  _buildingStatuses: string[],
  /** Scope the summary to one certification cycle; labels are prefixed. */
  cycle: number | null = null,
): TypeWiseSummaryRow[] {
  void _buildingStatuses;
  const docColumns = docColumnStatuses(docStatuses);
  const groups = new Map<string, TypeWiseRow[]>();
  for (const r of rows) {
    if (cycle != null && r.cycle !== cycle) continue;
    const key =
      dimension === "type"
        ? r.facilityType
        : dimension === "block"
          ? r.block
          : r.phc || r.block;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  const out: TypeWiseSummaryRow[] = [];
  for (const [rawLabel, list] of [...groups.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const label = cycle != null ? `Cycle #${cycle} · ${rawLabel}` : rawLabel;
    const docCounts: Record<string, number> = {};
    for (const s of docColumns) docCounts[s] = 0;
    const buildingCounts = emptyBuildingCounts();
    let certified = 0;
    let conditional = 0;
    let deferred = 0;
    let certDoubles = 0;
    let nqasScheduled = 0;
    let resultAwaited = 0;
    let resultDeclared = 0;
    let notRecorded = 0;
    let notInPipeline = 0;
    let nextPhase = 0;
    const certFailures: string[] = [];
    const pipelineFailures: string[] = [];

    for (const r of list) {
      const id = String(r.facilityId ?? `${r.block}/${r.phc}/${r.facilityType}`);
      // ONE shared lifecycle rule — the same one the dashboard, master list
      // and Quick View read.
      const view = deriveFlatLifecycle({
        currentStatus: r.currentStatus,
        certStatus: r.certStatus,
        naStatus: r.naStatus,
        naStartDate: r.naStartDate,
        docStatus: r.docStatus,
      });
      if (view.isQualityCertified) certified += 1;
      if (view.isConditional) conditional += 1;
      if (view.isDeferred) deferred += 1;
      const certFlags =
        (view.isQualityCertified ? 1 : 0) +
        (view.isConditional ? 1 : 0) +
        (view.isDeferred ? 1 : 0);
      if (certFlags > 1) {
        certDoubles += 1;
        certFailures.push(id);
      }

      // Exactly one pipeline bucket.
      const placement = classifyPipeline({
        view,
        saStatus: r.saStatus,
        docStatus: r.docStatus,
        docStatuses: docColumns,
        certificationStatus: r.certStatus,
      });
      switch (placement.kind) {
        case "resultDeclared":
          resultDeclared += 1;
          break;
        case "zone":
          if (placement.bucket === "NQAS Scheduled") nqasScheduled += 1;
          else if (placement.bucket === "Result awaited") resultAwaited += 1;
          else nextPhase += 1;
          break;
        case "doc":
          docCounts[placement.bucket] = (docCounts[placement.bucket] ?? 0) + 1;
          break;
        case "notRecorded":
          notRecorded += 1;
          break;
        default:
          notInPipeline += 1;
          pipelineFailures.push(id);
      }

      buildingCounts[buildingBucketOf(r.buildingStatus)] += 1;
    }

    const buildingTotal = sumBuildingCounts(buildingCounts);
    const notCertified = Math.max(
      0,
      list.length - certified - conditional - deferred,
    );
    const docTotal =
      nqasScheduled +
      resultAwaited +
      resultDeclared +
      notRecorded +
      nextPhase +
      notInPipeline +
      Object.values(docCounts).reduce((a, b) => a + b, 0);
    out.push({
      label,
      target: list.length,
      certified,
      conditional,
      totalCertified: certified + conditional,
      certifiedPct: percentOf(certified + conditional, list.length) ?? 0,
      deferred,
      notCertified,
      nqasScheduled,
      resultAwaited,
      resultDeclared,
      notRecorded,
      notInPipeline,
      docCounts,
      nextPhase,
      docTotal,
      buildingCounts,
      buildingTotal,
      failures: {
        certification: certFailures,
        pipeline: pipelineFailures,
        building: [],
      },
      reconcile: {
        // The remainder is part of the certification group, so the group
        // always sums; a facility with two certification results still fails.
        certification: certDoubles === 0,
        // The remainder is NOT a pass: every facility must land in a real
        // bucket. "Not recorded" is real; "Not in pipeline" is the alarm.
        pipeline: notInPipeline === 0,
        building: buildingTotal === list.length,
      },
    });
  }
  return out;
}

/** Totals row across all groups. */
export function grandTotalTypeWise(rows: TypeWiseSummaryRow[]): TypeWiseSummaryRow {
  const acc: TypeWiseSummaryRow = {
    label: "Grand Total",
    target: 0,
    certified: 0,
    conditional: 0,
    totalCertified: 0,
    certifiedPct: 0,
    deferred: 0,
    notCertified: 0,
    nqasScheduled: 0,
    resultAwaited: 0,
    resultDeclared: 0,
    notRecorded: 0,
    notInPipeline: 0,
    docCounts: {},
    nextPhase: 0,
    docTotal: 0,
    buildingCounts: emptyBuildingCounts(),
    buildingTotal: 0,
    failures: { certification: [], pipeline: [], building: [] },
    reconcile: { certification: true, pipeline: true, building: true },
  };
  for (const r of rows) {
    acc.target += r.target;
    acc.certified += r.certified;
    acc.conditional += r.conditional;
    acc.totalCertified += r.totalCertified;
    acc.deferred += r.deferred;
    acc.notCertified += r.notCertified;
    acc.nqasScheduled += r.nqasScheduled;
    acc.resultAwaited += r.resultAwaited;
    acc.resultDeclared += r.resultDeclared;
    acc.notRecorded += r.notRecorded;
    acc.notInPipeline += r.notInPipeline;
    acc.nextPhase += r.nextPhase;
    acc.docTotal += r.docTotal;
    acc.buildingTotal += r.buildingTotal;
    acc.reconcile.certification &&= r.reconcile.certification;
    acc.reconcile.pipeline &&= r.reconcile.pipeline;
    acc.reconcile.building &&= r.reconcile.building;
    acc.failures.certification.push(...r.failures.certification);
    acc.failures.pipeline.push(...r.failures.pipeline);
    acc.failures.building.push(...r.failures.building);
    for (const [k, v] of Object.entries(r.docCounts))
      acc.docCounts[k] = (acc.docCounts[k] ?? 0) + v;
    for (const b of BUILDING_BUCKET_ORDER)
      acc.buildingCounts[b] += r.buildingCounts[b] ?? 0;
  }
  acc.certifiedPct = percentOf(acc.totalCertified, acc.target) ?? 0;
  return acc;
}

/** Counted facilities for a group: everyone except the failure rows. */
export function countedFor(total: TypeWiseSummaryRow): {
  certification: number;
  pipeline: number;
  building: number;
} {
  return {
    certification: Math.max(0, total.target - total.failures.certification.length),
    pipeline: Math.max(0, total.target - total.failures.pipeline.length),
    building: total.buildingTotal,
  };
}

/**
 * The ONE reconciliation line: "Certification ✓ 157/157 · Pipeline ✓ 157/157 ·
 * Building ✓ 157/157". A failing group names its symptom and count, and the
 * page's chip links to exactly the facilities listed in `failures`.
 */
export function reconciliationText(total: TypeWiseSummaryRow): string {
  const n = total.target;
  const counted = countedFor(total);
  const line = (
    name: string,
    ok: boolean,
    value: number,
    missing: number,
    doubles: number,
  ) => {
    if (ok) return `${name} ✓ ${value}/${n}`;
    return `${name} ✗ ${value}/${n} — ${missing} facilit${missing === 1 ? "y" : "ies"} in no bucket, ${doubles} in two buckets`;
  };
  return [
    line(
      "Certification",
      total.reconcile.certification,
      counted.certification,
      0,
      total.failures.certification.length,
    ),
    line(
      "Pipeline",
      total.reconcile.pipeline,
      counted.pipeline,
      total.failures.pipeline.length,
      0,
    ),
    line(
      "Building",
      total.reconcile.building,
      counted.building,
      Math.max(0, n - total.buildingTotal),
      Math.max(0, total.buildingTotal - n),
    ),
  ].join(" · ");
}

/** Government colour scale for the Certified % cell (deep green → light). */
function pctCellClass(pct: number): string {
  if (pct >= 100) return "bg-emerald-600 text-white";
  if (pct >= 60) return "bg-emerald-400/70";
  if (pct > 0) return "bg-emerald-200/60";
  return "";
}

const CELL_BASE = "whitespace-nowrap text-center tabular-nums";
const HEAD_BASE = "px-2 py-2 text-center align-middle font-semibold";
/** Fixed widths so content-sized headers cannot squeeze or clip each other. */
const W_LABEL = "w-[150px] min-w-[150px] max-w-[150px] text-left";
const W_NUM = "w-[92px] min-w-[92px] max-w-[92px]";
const W_TOTAL = "w-[104px] min-w-[104px] max-w-[104px]";

/**
 * The government summary. No nested vertical scroll: every row is in the
 * page's normal flow, so the page scrolls once. Horizontal scrolling stays
 * inside the table with a frozen first column and header; the Grand Total is
 * the last, opaque row.
 */
export function TypeWiseSummaryTable({
  rows,
  dimension,
  docStatuses,
  buildingStatuses,
  onCellClick,
}: {
  rows: TypeWiseSummaryRow[];
  dimension: "type" | "block" | "phc";
  docStatuses: string[];
  /** Kept for callers — columns come from the shared bucket list. */
  buildingStatuses: string[];
  /** Click a count cell → filter the list to exactly those facilities. */
  onCellClick?: (
    kind: "pipeline" | "building",
    value: string,
    rowLabel: string | null,
  ) => void;
}) {
  void buildingStatuses;
  const docColumns = docColumnStatuses(docStatuses);
  const total = grandTotalTypeWise(rows);
  const clickFor = (
    kind: "pipeline" | "building",
    value: string,
    rowLabel: string | null,
  ) => {
    if (!onCellClick) return undefined;
    return () => onCellClick(kind, value, rowLabel);
  };
  const clickable = (handler: (() => void) | undefined) =>
    handler
      ? "cursor-pointer underline-offset-2 hover:text-foreground hover:bg-muted/70"
      : "";
  const frozenHead = "sticky left-0 z-20 bg-background";
  const frozenCell = "sticky left-0 z-10 bg-background";
  const totalCell = "bg-muted font-bold";
  const dimLabel =
    dimension === "type" ? "Facility Type" : dimension === "block" ? "Block" : "PHC Name";

  return (
    <AutoFitTableScroll
      className="rounded-xl border bg-background/60"
      // Normal flow: no vertical scrollport. The page scrolls, not the table.
      maxHeight="none"
    >
      <TableHeader className="[&_th]:h-auto [&_th]:py-1.5 [&_th]:align-middle [&_th]:leading-tight">
        <TableRow className="border-b-0">
          <TableHead className={`${W_LABEL} border-r border-border/60 bg-background`} />
          <TableHead
            colSpan={7}
            className="border-r border-border/60 bg-transparent text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Target &amp; certification
          </TableHead>
          <TableHead
            colSpan={docColumns.length + 7}
            className="border-r border-border/60 bg-sky-50 text-center text-[11px] font-semibold tracking-wide text-sky-900 uppercase"
          >
            Document pipeline
          </TableHead>
          <TableHead
            colSpan={BUILDING_BUCKET_ORDER.length + 1}
            className="bg-rose-50 text-center text-[11px] font-semibold tracking-wide text-rose-900 uppercase"
          >
            Facility building status
          </TableHead>
        </TableRow>
        <TableRow>
          <TableHead className={`${W_LABEL} ${frozenHead} border-r border-border/60`}>
            {dimLabel}
          </TableHead>
          <TableHead className={`${W_NUM} ${HEAD_BASE}`}>Target</TableHead>
          <TableHead className={`${W_NUM} ${HEAD_BASE}`}>Certified</TableHead>
          <TableHead className={`${W_TOTAL} ${HEAD_BASE} whitespace-normal`}>
            Certified with Conditionality
          </TableHead>
          <TableHead className={`${W_NUM} ${HEAD_BASE} whitespace-normal`}>
            Total Certified
          </TableHead>
          <TableHead className={`${W_NUM} ${HEAD_BASE}`}>Certified %</TableHead>
          <TableHead className={`${W_NUM} ${HEAD_BASE}`}>Deferred</TableHead>
          <TableHead
            data-tip="Remainder of the certification group — every facility not certified, conditional or deferred. With this column the group always sums to Target."
            className={`${W_NUM} ${HEAD_BASE} whitespace-normal`}
          >
            Not certified
          </TableHead>
          {/* ---- Pipeline group ---- */}
          <TableHead className={`${W_NUM} ${HEAD_BASE} whitespace-normal`}>
            NQAS Scheduled
          </TableHead>
          <TableHead className={`${W_TOTAL} ${HEAD_BASE} whitespace-normal`}>
            Result awaited
          </TableHead>
          {docColumns.map((s) => (
            <TableHead
              key={s}
              data-tip={docStageLabel(s)}
              className={`${W_NUM} ${HEAD_BASE} whitespace-normal`}
            >
              {docStageLabel(s)}
            </TableHead>
          ))}
          <TableHead
            data-tip="SaQsham Documents Status = Result Declared (certified, conditional or deferred)."
            className={`${W_NUM} ${HEAD_BASE} whitespace-normal`}
          >
            {RESULT_DECLARED_BUCKET}
          </TableHead>
          <TableHead
            data-tip="No SaQsham Documents Status has been recorded for the facility yet."
            className={`${W_NUM} ${HEAD_BASE} whitespace-normal`}
          >
            {NOT_RECORDED_BUCKET}
          </TableHead>
          <TableHead className={`${W_NUM} ${HEAD_BASE} whitespace-normal`}>
            Next Phase
          </TableHead>
          <TableHead
            data-tip="Remainder of the pipeline group. Non-zero means a stored status is not in the admin list — click the reconciliation chip to see the facilities."
            className={`${W_NUM} ${HEAD_BASE} whitespace-normal`}
          >
            {NOT_IN_PIPELINE_BUCKET}
          </TableHead>
          <TableHead
            data-tip="Every facility counted once across the pipeline buckets (equals Target when the Pipeline check passes)."
            className={`${W_TOTAL} ${HEAD_BASE} bg-muted/60 font-bold whitespace-normal`}
          >
            In pipeline (total)
          </TableHead>
          {/* ---- Building group ---- */}
          {BUILDING_BUCKET_ORDER.map((b) => (
            <TableHead
              key={b}
              data-tip={
                b === "Other"
                  ? "Other — a stored building status that maps to no named bucket (e.g. Others, Inaugurated). Nothing is dropped."
                  : b === "No record"
                    ? "No record — the building status is blank or explicitly “No record”"
                    : b
              }
              className={`${W_NUM} ${HEAD_BASE} whitespace-normal`}
            >
              {b}
            </TableHead>
          ))}
          <TableHead
            data-tip="Building recorded — every facility counted once across the building-status buckets"
            className={`${W_TOTAL} ${HEAD_BASE} bg-muted/60 font-bold whitespace-normal`}
          >
            Building recorded
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={8 + docColumns.length + 7 + BUILDING_BUCKET_ORDER.length + 1}
              className="py-8 text-center text-muted-foreground"
            >
              No facilities to summarize yet.
            </TableCell>
          </TableRow>
        )}
        {rows.map((r) => (
          <TableRow key={r.label}>
            <TableCell className={`${W_LABEL} ${frozenCell} border-r border-border/60 truncate`}>
              {r.label}
            </TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE} font-semibold`}>{r.target}</TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE}`}>{r.certified}</TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE}`}>{r.conditional}</TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE} font-semibold`}>
              {r.totalCertified}
            </TableCell>
            <TableCell
              className={`${W_NUM} text-center text-xs font-semibold tabular-nums ${pctCellClass(r.certifiedPct)}`}
            >
              {formatPercent(r.certifiedPct)}
            </TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE}`}>{r.deferred}</TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE}`}>{r.notCertified}</TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE}`}>{r.nqasScheduled}</TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE}`}>{r.resultAwaited}</TableCell>
            {docColumns.map((s) => (
              <TableCell
                key={s}
                className={`${W_NUM} ${CELL_BASE} ${clickable(clickFor("pipeline", s, r.label))}`}
                onClick={clickFor("pipeline", s, r.label)}
              >
                {r.docCounts[s] ?? 0}
              </TableCell>
            ))}
            <TableCell className={`${W_NUM} ${CELL_BASE}`}>{r.resultDeclared}</TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE}`}>{r.notRecorded}</TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE}`}>{r.nextPhase}</TableCell>
            <TableCell
              className={`${W_NUM} ${CELL_BASE} ${clickable(clickFor("pipeline", NOT_IN_PIPELINE_BUCKET, r.label))} ${r.notInPipeline > 0 ? "font-bold text-rose-700" : ""}`}
              onClick={clickFor("pipeline", NOT_IN_PIPELINE_BUCKET, r.label)}
            >
              {r.notInPipeline}
            </TableCell>
            <TableCell
              data-tip="In pipeline (total) — the row's pipeline columns added together"
              className={`${W_TOTAL} ${CELL_BASE} bg-muted/60 font-bold`}
            >
              {r.docTotal}
            </TableCell>
            {BUILDING_BUCKET_ORDER.map((b) => (
              <TableCell
                key={b}
                className={`${W_NUM} ${CELL_BASE} ${clickable(clickFor("building", b, r.label))}`}
                onClick={clickFor("building", b, r.label)}
              >
                {r.buildingCounts[b]}
              </TableCell>
            ))}
            <TableCell
              data-tip="Building recorded — the row's building columns added together (equals Target when nothing is dropped)"
              className={`${W_TOTAL} ${CELL_BASE} bg-muted/60 font-bold`}
            >
              {r.buildingTotal}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {rows.length > 0 && (
        <TableFooter className="border-t-2">
          <TableRow>
            <TableCell className={`${W_LABEL} ${frozenCell} ${totalCell} border-r border-border/60`}>
              {total.label}
            </TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE} ${totalCell}`}>{total.target}</TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE} ${totalCell}`}>{total.certified}</TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE} ${totalCell}`}>
              {total.conditional}
            </TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE} ${totalCell}`}>
              {total.totalCertified}
            </TableCell>
            <TableCell
              className={`${W_NUM} text-center text-xs font-bold tabular-nums ${totalCell} ${pctCellClass(total.certifiedPct)}`}
            >
              {formatPercent(total.certifiedPct)}
            </TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE} ${totalCell}`}>{total.deferred}</TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE} ${totalCell}`}>
              {total.notCertified}
            </TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE} ${totalCell}`}>
              {total.nqasScheduled}
            </TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE} ${totalCell}`}>
              {total.resultAwaited}
            </TableCell>
            {docColumns.map((s) => (
              <TableCell key={s} className={`${W_NUM} ${CELL_BASE} ${totalCell}`}>
                {total.docCounts[s] ?? 0}
              </TableCell>
            ))}
            <TableCell className={`${W_NUM} ${CELL_BASE} ${totalCell}`}>
              {total.resultDeclared}
            </TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE} ${totalCell}`}>
              {total.notRecorded}
            </TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE} ${totalCell}`}>
              {total.nextPhase}
            </TableCell>
            <TableCell className={`${W_NUM} ${CELL_BASE} ${totalCell}`}>
              {total.notInPipeline}
            </TableCell>
            <TableCell className={`${W_TOTAL} ${CELL_BASE} ${totalCell}`}>
              {total.docTotal}
            </TableCell>
            {BUILDING_BUCKET_ORDER.map((b) => (
              <TableCell key={b} className={`${W_NUM} ${CELL_BASE} ${totalCell}`}>
                {total.buildingCounts[b]}
              </TableCell>
            ))}
            <TableCell className={`${W_TOTAL} ${CELL_BASE} ${totalCell}`}>
              {total.buildingTotal}
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </AutoFitTableScroll>
  );
}

/** CSV export of the same summary (headers mirror the table word for word). */
export function typeWiseSummaryCsv(
  rows: TypeWiseSummaryRow[],
  dimension: "type" | "block" | "phc",
  docStatuses: string[],
  buildingStatuses: string[],
): { headers: string[]; rows: (string | number)[][] } {
  void buildingStatuses;
  const docColumns = docColumnStatuses(docStatuses);
  const headers = [
    dimension === "type"
      ? "Facility Type"
      : dimension === "block"
        ? "Block"
        : "PHC Name",
    "Target",
    "Certified",
    "Certified with Conditionality",
    "Total Certified",
    "Certified %",
    "Deferred",
    "Not certified",
    "NQAS Scheduled",
    "Result awaited",
    ...docColumns.map(docStageLabel),
    RESULT_DECLARED_BUCKET,
    NOT_RECORDED_BUCKET,
    "Next Phase",
    NOT_IN_PIPELINE_BUCKET,
    "In pipeline (total)",
    ...BUILDING_BUCKET_ORDER,
    "Building recorded",
  ];
  const data = [...rows, grandTotalTypeWise(rows)].map((r) => [
    r.label,
    r.target,
    r.certified,
    r.conditional,
    r.totalCertified,
    percentLabel(r.totalCertified, r.target),
    r.deferred,
    r.notCertified,
    r.nqasScheduled,
    r.resultAwaited,
    ...docColumns.map((s) => r.docCounts[s] ?? 0),
    r.resultDeclared,
    r.notRecorded,
    r.nextPhase,
    r.notInPipeline,
    r.docTotal,
    ...BUILDING_BUCKET_ORDER.map((b) => r.buildingCounts[b]),
    r.buildingTotal,
  ]);
  return { headers, rows: data };
}
