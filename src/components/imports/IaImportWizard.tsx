/**
 * INTERNAL ASSESSMENT (QUARTERLY) IMPORT WIZARD — the NIN format.
 *
 *   ① Add rows   Paste (default) or Upload, nothing written yet
 *   ② Check      detection line + header-mapping strip + quarter checklist
 *   ③ Review     previous → now, NIN cross-checks, sparkline, coverage
 *   ④ Approve    one plain sentence, one checkbox, one button
 *   ⑤ Done       result, Excel report, Undo this import
 *
 * The NEW format (S. No, NIN Number, Block, PHC, Name of the facility, Type,
 * FY, Quarter, NQAS IA, Kayakalp IA) and the OLD key-based format both work:
 * a row with a NIN is matched on the NIN (100%) and cross-checked against the
 * master's name/block/PHC/type; a row without one falls back to the tested
 * facility-key matcher. Nothing is written until step ④ calls
 * `ia.applyIaBatch`, which runs as ONE transaction and can be undone.
 *
 * Parsing runs in a Web Worker (lib/iaParseClient), so a 10 MB workbook or a
 * 2,000-row paste never freezes the page. Pasted data is never logged.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Download,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  Info,
  Loader2,
  Pencil,
  Search,
  ShieldCheck,
  Undo2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { todayLocalIso } from "@/lib/today";

import {
  buildIaPreview,
  detectWideLayout,
  facilityIaKeysOf,
  formatFyQuarter,
  isQuarterProvisional,
  IA_TRACKERS,
  LARGE_CHANGE,
  SCORE_BARS,
  TRACKER_LABELS,
  type CleanIaRow,
  type IaFacility,
  type IaPreviewRow,
  type IaPreviewState,
  type IaRole,
  type IaStoredQuarter,
  type IaSummary,
  type IaTracker,
} from "@/lib/iaImport";
import {
  IA_STATE_LABELS,
  IA_STATE_STYLES,
  iaColumnsForTrackers,
  iaMoveGlyph,
  iaNotes,
  iaSparkText,
  matchLabel,
  scoreBarColor,
  scoreCell,
  type IaPreviewColumn,
} from "@/lib/iaPreviewColumns";
import {
  applyRememberedIaMap,
  autoMapIaColumns,
  downloadIaSampleFile,
  IA_MAP_COLUMNS,
  IA_NIN_SAMPLE_TSV,
  IA_PHC_ALIASES,
  IA_TYPE_LIST,
  iaDetectionLine,
  iaMappingProblems,
  iaQuartersInRows,
  loadRememberedIaMap,
  prepareIaRows,
  quarterOverrideOptions,
  saveRememberedIaMap,
  withDetectedIaHeader,
} from "@/lib/iaWizard";
import { parseIaFile, parseIaPaste } from "@/lib/iaParseClient";
import { parsePastedHtml, type ParsedSheet } from "@/lib/saqshamParse";
import { downloadIaCsvTemplate, downloadIaImportReport, downloadIaQuarterTemplate } from "@/lib/iaReport";

const STEPS = ["Add rows", "Check", "Review", "Approve", "Done"] as const;

/* --------------------------------------------------------------------------- */
/* Sub-components                                                               */
/* --------------------------------------------------------------------------- */

function StepBar({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Import steps">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "current" : "todo";
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={n > step}
              onClick={() => n < step && onJump(n)}
              aria-current={n === step ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                state === "done" &&
                  "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100",
                state === "current" && "border-primary/40 bg-primary/10 text-foreground",
                state === "todo" && "border-border/60 text-muted-foreground",
                n < step && "hover:bg-emerald-200/60",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border text-[10px] font-bold",
                  state === "done" && "border-emerald-400 bg-emerald-500 text-white",
                  state === "current" && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {state === "done" ? <Check className="size-3" /> : n}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && <span className="text-muted-foreground/50">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Score chip — a value coloured by the shared thresholds, or an italic remark. */
function ScoreChip({ value, remark }: { value: number | null; remark?: string | null }) {
  if (value == null && remark) {
    return <span className="text-[11px] italic text-muted-foreground">{remark}</span>;
  }
  if (value == null) return <span className="text-muted-foreground">-</span>;
  return <span className={cn("font-medium tabular-nums", scoreBarColor(value))}>{value}</span>;
}

function StatePill({ state }: { state: IaPreviewState }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center whitespace-nowrap rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium",
        IA_STATE_STYLES[state],
      )}
    >
      {IA_STATE_LABELS[state]}
    </span>
  );
}

/** The facility picker that corrects a match (manual override). */
function MatchCell({
  row,
  facilities,
  onPick,
}: {
  row: IaPreviewRow;
  facilities: IaFacility[];
  onPick: (rowNo: number, facilityId: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const candidates: string[] = useMemo(() => {
    const ids =
      row.match.status === "ambiguous" || row.match.status === "suggested"
        ? row.match.candidateIds
        : row.suggestionIds;
    const base = facilities.filter(
      (f) => ids.includes(f.id) || (!!row.cleaned.facilityType && f.facilityType === row.cleaned.facilityType),
    );
    const pool = base.length ? base : facilities;
    const needle = q.trim().toLowerCase();
    return pool
      .filter((f) => !needle || `${f.name} ${f.block} ${f.phc} ${f.ninNumber ?? ""}`.toLowerCase().includes(needle))
      .slice(0, 60)
      .map((f) => f.id);
  }, [row, facilities, q]);

  return (
    <div className="space-y-1">
      <Select value={row.facilityId ?? "none"} onValueChange={(v) => onPick(row.rowNo, v === "none" ? null : v)}>
        <SelectTrigger className="h-8 w-full min-w-40 text-xs">
          <SelectValue placeholder="Pick a facility" />
        </SelectTrigger>
        <SelectContent>
          <div className="p-1">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search facility / block / PHC / NIN"
              className="h-8 text-xs"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <SelectItem value="none" className="text-xs">
            — unmatched —
          </SelectItem>
          {candidates.map((id) => {
            const f = facilities.find((x) => x.id === id);
            if (!f) return null;
            return (
              <SelectItem key={id} value={id} className="text-xs">
                {f.name} · {f.block} · {f.phc} ({f.facilityType}){f.ninNumber ? ` · ${f.ninNumber}` : ""}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <span className="block text-[10px] font-semibold text-muted-foreground">{matchLabel(row)}</span>
    </div>
  );
}

/** A four-quarter NQAS / Kayakalp sparkline — the new point is highlighted. */
function Sparkline({ row }: { row: IaPreviewRow }) {
  if (row.trend.length === 0) return <span className="text-muted-foreground">-</span>;
  const W = 118;
  const H = 24;
  const series = (key: "nqas" | "kayakalp") =>
    row.trend.map((p, i) => {
      const x = row.trend.length === 1 ? W / 2 : 6 + (i * (W - 12)) / (row.trend.length - 1);
      const v = p[key];
      const y = v == null ? null : H - 3 - (Math.max(0, Math.min(100, v)) / 100) * (H - 6);
      return { x, y, last: i === row.trend.length - 1, v };
    });
  const path = (key: "nqas" | "kayakalp") => {
    const pts = series(key);
    let d = "";
    let pen = false;
    const plotted: { x: number; y: number; last: boolean; v: number | null }[] = [];
    for (const p of pts) {
      if (p.y == null) {
        // A missing quarter BREAKS the line — it is never drawn through 0.
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
      pen = true;
      plotted.push({ x: p.x, y: p.y, last: p.last, v: p.v });
    }
    return plotted.length ? { d: d.trim(), pts: plotted } : null;
  };
  const nqas = path("nqas");
  const kayakalp = path("kayakalp");
  return (
    <span className="inline-flex flex-col gap-0.5" data-tip={iaSparkText(row)}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Last four quarters">
        <line x1="4" y1={H - 3} x2={W - 4} y2={H - 3} stroke="currentColor" strokeOpacity="0.2" />
        {nqas && <path d={nqas.d} fill="none" stroke="#0f766e" strokeWidth="1.5" />}
        {kayakalp && <path d={kayakalp.d} fill="none" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 2" />}
        {(nqas?.pts ?? []).map((p) => (
          <circle
            key={`n${p.x}`}
            cx={p.x}
            cy={p.y}
            r={p.last ? 2.8 : 1.8}
            fill={p.last ? "#0f766e" : "#ffffff"}
            stroke="#0f766e"
            strokeWidth="1.2"
          />
        ))}
        {(kayakalp?.pts ?? []).map((p) => (
          <rect
            key={`k${p.x}`}
            x={p.x - (p.last ? 2.4 : 1.6)}
            y={(p.y ?? 0) - (p.last ? 2.4 : 1.6)}
            width={p.last ? 4.8 : 3.2}
            height={p.last ? 4.8 : 3.2}
            fill={p.last ? "#d97706" : "#ffffff"}
            stroke="#d97706"
            strokeWidth="1.2"
          />
        ))}
      </svg>
      <span className="text-[9px] leading-none text-muted-foreground">
        {row.trend
          .map((p) => p.label.replace(/^Q(\d)\s(\d{2})(\d{2})-(\d{2})$/, "Q$1 $3-$4"))
          .join(" · ")}
      </span>
    </span>
  );
}

/** One score cell that becomes an input on click (Enter commits, Esc cancels). */
function ScoreEditCell({
  row,
  tracker,
  onCommit,
}: {
  row: IaPreviewRow;
  tracker: IaTracker;
  onCommit: (rowNo: number, tracker: IaTracker, text: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const original = row.cleaned.scores[tracker];
  if (editing) {
    return (
      <Input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          onCommit(row.rowNo, tracker, text.trim() === "" ? null : text);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onCommit(row.rowNo, tracker, text.trim() === "" ? null : text);
            setEditing(false);
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
        aria-label={`${TRACKER_LABELS[tracker]} value for row ${row.rowNo}`}
        className="h-7 w-20 text-right text-xs tabular-nums"
        inputMode="decimal"
      />
    );
  }
  const old = row.current[tracker];
  const next = original.value;
  return (
    <button
      type="button"
      onClick={() => {
        setText(original.raw);
        setEditing(true);
      }}
      className={cn(
        "rounded px-1 text-right tabular-nums hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
        original.error && "text-destructive",
      )}
      data-tip={original.error ? `${TRACKER_LABELS[tracker]} value outside 0–100 — click to fix` : "Click to edit"}
    >
      {original.raw.trim() === "" ? (
        <span className="text-muted-foreground">-</span>
      ) : original.error ? (
        `ERR ${original.raw}`
      ) : original.value != null ? (
        <>
          {old != null && old !== next && (
            <span className="mr-1 text-[10px] text-muted-foreground line-through">{old}</span>
          )}
          <span className="font-semibold">{original.value}</span>
        </>
      ) : (
        <span className="text-[11px] italic text-muted-foreground">{original.chip ?? "-"}</span>
      )}
    </button>
  );
}

/* --------------------------------------------------------------------------- */
/* The wizard                                                                   */
/* --------------------------------------------------------------------------- */

export function IaImportWizard({
  onOpenList,
  initialPeriod,
  initialText,
  initialFile,
}: {
  onOpenList?: () => void;
  /** The banner deep-links here with the due quarter preselected. */
  initialPeriod?: { fy: string; q: 1 | 2 | 3 | 4 } | null;
  /** Smart paste on the Bulk Import page: the detected text is parsed once
   *  when the wizard opens (never stored, never logged). */
  initialText?: string | null;
  /** Smart drop on the Bulk Import page (.xlsx/.csv/…), parsed once. */
  initialFile?: File | null;
}) {
  const ctx = useQuery(api.ia.getIaImportContext, {});
  const applyBatch = useMutation(api.ia.applyIaBatch);
  const undoBatch = useMutation(api.ia.undoIaBatch);
  const saveAlias = useMutation(api.imports.saveFacilityAlias);
  const today = todayLocalIso();

  const quarterChoices = useMemo(() => quarterOverrideOptions(today), [today]);

  const [step, setStep] = useState(1);
  const [sourceTab, setSourceTab] = useState<"paste" | "upload">("paste");
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [wide, setWide] = useState(false);
  const [map, setMap] = useState<Record<IaRole, number | null>>(autoMapIaColumns([], false));
  const [fyOverride, setFyOverride] = useState<string | null>(initialPeriod?.fy ?? null);
  const [qOverride, setQOverride] = useState<1 | 2 | 3 | 4 | null>(initialPeriod?.q ?? null);
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [periodSel, setPeriodSel] = useState<Record<string, boolean> | null>(null);
  /** State Admin only: lets a locked quarter be selected for an audited override. */
  const [unlockPeriods, setUnlockPeriods] = useState(false);

  const [facilityChoice, setFacilityChoice] = useState<Record<number, string | null>>({});
  const [confirmedNin, setConfirmedNin] = useState<Record<number, boolean>>({});
  const [scoreEdits, setScoreEdits] = useState<Record<number, Partial<Record<IaTracker, string | number | null>>>>({});
  const [includeOverride, setIncludeOverride] = useState<Record<number, boolean>>({});
  const [mode, setMode] = useState<"update" | "fillBlanks" | "addNewOnly">("update");
  const [blankClears, setBlankClears] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [rememberOn, setRememberOn] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<
    { batchId: string; updated: number; noChange: number; skipped: number; failed: number } | null
  >(null);
  const [undoState, setUndoState] = useState<
    { restored: number; conflicts: { rowNo: number; reason: string }[] } | null
  >(null);

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<IaPreviewState[]>([]);
  /** New / Will change / Not reported are movement filters, not row states. */
  const [metricFilter, setMetricFilter] = useState<null | "new" | "changed" | "not_reported">(null);
  const [blockFilter, setBlockFilter] = useState<string[]>([]);
  const [quarterFilter, setQuarterFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<"row" | "facility" | "block" | "state">("row");
  const [drawerRowNo, setDrawerRowNo] = useState<number | null>(null);

  const isAdmin = ctx?.me.appRole === "admin";
  const rememberKey = ctx?.me.name ?? "user";

  const facilities: IaFacility[] = useMemo(
    () =>
      (ctx?.facilities ?? []).map((f) => {
        const keys = facilityIaKeysOf(f);
        if (f.facilityKey && !keys.includes(f.facilityKey)) keys.unshift(f.facilityKey);
        return {
          id: f.id,
          name: f.name,
          block: f.block,
          phc: f.phc,
          facilityType: f.facilityType,
          facilityKeys: keys,
          ninNumber: f.ninNumber ?? null,
        };
      }),
    [ctx],
  );
  const aliases = useMemo(() => ctx?.aliases ?? [], [ctx]);
  const recent: IaStoredQuarter[] = useMemo(() => ctx?.recent ?? [], [ctx]);
  const outsideNins = useMemo(() => new Set(ctx?.outsideNin ?? []), [ctx]);

  /* ---- Clean + preview (pure) ---------------------------------------------- */
  const prepared = useMemo(() => {
    if (!sheet) return { rows: [] as CleanIaRow[], wide: false, warnings: [] as string[] };
    return prepareIaRows(sheet, map, { fyOverride, qOverride, typeList: IA_TYPE_LIST });
  }, [sheet, map, fyOverride, qOverride]);

  const detected = useMemo(() => iaQuartersInRows(prepared.rows), [prepared.rows]);
  const lockedPeriods = useMemo(() => {
    const set = new Set<string>();
    for (const r of recent) if (r.lockedAt) set.add(`${r.fy}|Q${r.quarter}`);
    return set;
  }, [recent]);

  /** Period selection: all unlocked quarters checked by default. */
  const periodChecked = (p: { fy: string; q: number }): boolean => {
    const key = `${p.fy}|Q${p.q}`;
    if (lockedPeriods.has(key)) {
      // Locked periods are unchecked and disabled unless a State Admin has
      // explicitly enabled the audited override AND ticked the period.
      if (!unlockPeriods) return false;
      return periodSel?.[key] ?? false;
    }
    return periodSel?.[key] ?? true;
  };
  const activeRows = useMemo(() => {
    if (!prepared.rows.length) return prepared.rows;
    return prepared.rows.filter((r) => {
      if (!r.fy || !r.q) return true;
      return periodChecked({ fy: r.fy, q: r.q });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepared.rows, periodSel, lockedPeriods, unlockPeriods]);

  const trackers: IaTracker[] = useMemo(() => {
    if (activeRows.length === 0) return [...IA_TRACKERS];
    const present = IA_TRACKERS.filter((t) =>
      activeRows.some((r) => r.scores[t].raw.trim() !== "" || r.scores[t].error),
    );
    return present.length ? present : [...IA_TRACKERS];
  }, [activeRows]);

  const preview = useMemo(
    () =>
      buildIaPreview(
        activeRows,
        facilities,
        aliases,
        {
          today,
          recent,
          manual: facilityChoice as Record<number, string>,
          confirmedNin,
          scoreEdits,
          outsideNins,
        },
        IA_PHC_ALIASES,
      ),
    [activeRows, facilities, aliases, today, recent, facilityChoice, confirmedNin, scoreEdits, outsideNins],
  );

  const rowInclude = (r: IaPreviewRow): boolean => includeOverride[r.rowNo] ?? r.include;
  const viewRows = useMemo(
    () => preview.rows.map((r) => ({ ...r, include: rowInclude(r) })),
    // includeOverride is read through rowInclude; both must re-run together.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preview.rows, includeOverride],
  );

  const hasKey = useMemo(() => viewRows.some((r) => !!r.cleaned.key), [viewRows]);
  const columns = useMemo(
    () => iaColumnsForTrackers(trackers, { includeKey: hasKey }),
    [trackers, hasKey],
  );

  const blocks = useMemo(() => [...new Set(viewRows.map((r) => r.facilityBlock).filter(Boolean))].sort(), [viewRows]);
  const quarterOptions = useMemo(
    () => [...new Set(viewRows.filter((r) => r.fy && r.q).map((r) => formatFyQuarter(r.fy!, r.q!)))].sort(),
    [viewRows],
  );
  /** DOM cap: the preview paints at most 500 rows; the counters, the coverage
   *  panel and every export cover the whole file (2,000-row pastes stay smooth). */
  const DOM_CAP = 500;
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matched = viewRows.filter((r) => {
      if (metricFilter === "new" && !IA_TRACKERS.some((t) => r.change[t] === "new")) return false;
      if (metricFilter === "changed" && !IA_TRACKERS.some((t) => r.change[t] === "changed")) return false;
      if (
        metricFilter === "not_reported" &&
        IA_TRACKERS.some((t) => r.cleaned.scores[t].raw.trim() !== "")
      )
        return false;
      if (stateFilter.length && !stateFilter.includes(r.state)) return false;
      if (blockFilter.length && !blockFilter.includes(r.facilityBlock)) return false;
      if (quarterFilter.length && !(r.fy && r.q && quarterFilter.includes(formatFyQuarter(r.fy, r.q)))) return false;
      if (needle) {
        const hay = `${r.nin ?? ""} ${r.cleaned.key} ${r.cleaned.name} ${r.facilityName} ${r.facilityBlock} ${r.facilityPhc}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const stateOrder: Record<IaPreviewState, number> = {
      error: 0,
      unmatched: 1,
      ambiguous: 2,
      needs_review: 3,
      ready: 4,
      no_change: 5,
      skipped: 6,
    };
    const sorted = [...matched].sort((a, b) => {
      if (sortKey === "facility") return (a.facilityName || a.cleaned.name).localeCompare(b.facilityName || b.cleaned.name);
      if (sortKey === "block") return a.facilityBlock.localeCompare(b.facilityBlock);
      if (sortKey === "state") return stateOrder[a.state] - stateOrder[b.state] || a.rowNo - b.rowNo;
      return a.rowNo - b.rowNo;
    });
    return sorted.slice(0, DOM_CAP);
  }, [viewRows, search, stateFilter, metricFilter, blockFilter, quarterFilter, sortKey]);

  const summary: IaSummary = preview.summary;
  const selected = useMemo(
    () =>
      viewRows.filter(
        (r) =>
          r.include &&
          r.facilityId &&
          r.fy &&
          r.q &&
          !r.needsNinConfirm &&
          !r.outsideBlocks &&
          (r.state === "ready" || r.state === "no_change"),
      ),
    [viewRows],
  );
  const blocking = useMemo(
    () =>
      viewRows.some(
        (r) =>
          r.include &&
          (r.state === "ambiguous" || r.state === "unmatched" || r.state === "error" || r.state === "needs_review"),
      ),
    [viewRows],
  );
  const includedLocked = useMemo(() => selected.some((r) => r.locked), [selected]);
  const manuallyPicked = useMemo(
    () => selected.filter((r) => facilityChoice[r.rowNo] || r.match.method === "manual").length,
    [selected, facilityChoice],
  );
  const templatePeriod =
    activeRows.find((r) => r.fy && r.q)
      ? { fy: activeRows.find((r) => r.fy && r.q)!.fy as string, q: activeRows.find((r) => r.fy && r.q)!.q as 1 | 2 | 3 | 4 }
      : quarterChoices[0]
        ? { fy: quarterChoices[0].fy, q: quarterChoices[0].q }
        : null;

  const mappingProblems = useMemo(
    () => (sheet ? iaMappingProblems(map, wide, fyOverride, qOverride) : []),
    [sheet, map, wide, fyOverride, qOverride],
  );

  /* ---- Parsing --------------------------------------------------------------- */
  const loadSheet = (raw: ParsedSheet) => {
    const s = withDetectedIaHeader(raw);
    const isWide = detectWideLayout(s.headers);
    setSheet(s);
    setWide(isWide);
    const auto = autoMapIaColumns(s.headers, isWide);
    setMap(applyRememberedIaMap(auto, s.headers, loadRememberedIaMap(rememberKey)));
    setFyOverride(auto.fy == null && !isWide ? quarterChoices[0]?.fy ?? null : null);
    setQOverride(auto.quarter == null && !isWide ? quarterChoices[0]?.q ?? null : null);
    setIncludeOverride({});
    setFacilityChoice({});
    setConfirmedNin({});
    setScoreEdits({});
    setPeriodSel(null);
    setUnlockPeriods(false);
    setResult(null);
    setUndoState(null);
    setConfirmed(false);
    for (const w of s.warnings) toast.warning(w);
    setStep(2);
  };

  const ingestText = async (text: string) => {
    if (!text.trim()) {
      toast.error("Paste the IA rows first");
      return;
    }
    setParsing(true);
    try {
      loadSheet(await parseIaPaste(text));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the pasted rows");
    }
    setParsing(false);
  };

  const ingestHtml = async (html: string) => {
    if (!html.trim()) return;
    setParsing(true);
    try {
      loadSheet(parsePastedHtml(html));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the pasted table");
    }
    setParsing(false);
  };

  const onFile = async (file: File) => {
    setParsing(true);
    try {
      loadSheet(await parseIaFile(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the file");
    }
    setParsing(false);
  };

  /* Smart paste/drop: parse what the Bulk Import page handed over ONCE. */
  const initialIngested = useRef(false);
  useEffect(() => {
    if (initialIngested.current) return;
    if (initialFile) {
      initialIngested.current = true;
      void onFile(initialFile);
      return;
    }
    if (!initialText?.trim()) return;
    initialIngested.current = true;
    void ingestText(initialText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialText, initialFile]);

  /* Paste anywhere on the paste step — unless typing in a field. */
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (sourceTab !== "paste") return;
    const onPaste = (e: ClipboardEvent) => {
      if (stepRef.current !== 1) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      const html = e.clipboardData?.getData("text/html") ?? "";
      if (!text.trim() && !html.trim()) return;
      e.preventDefault();
      if (text.trim()) void ingestText(text);
      else void ingestHtml(html);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceTab]);

  /* ---- Apply ------------------------------------------------------------------ */
  const runApply = async () => {
    if (!confirmed) return;
    setApplying(true);
    try {
      const decisions = selected.map((r) => ({
        rowNo: r.rowNo,
        facilityId: r.facilityId as Id<"facilities">,
        fy: r.fy as string,
        quarter: r.q as number,
        nin: r.nin,
        confirmNin: !!confirmedNin[r.rowNo] || r.match.method === "manual",
        nqas: trackerDecision(r, "nqas", blankClears),
        kayakalp: trackerDecision(r, "kayakalp", blankClears),
        eco: trackerDecision(r, "eco", blankClears),
        matchMethod: r.match.viaNin ? "nin" : r.match.method,
        confidence: r.match.confidence,
        facilityName: r.facilityName || r.cleaned.name,
        facilityBlock: r.facilityBlock,
        facilityPhc: r.facilityPhc,
        notes: iaNotes(r),
        raw: r.cleaned.raw,
        cleaned: {
          fy: r.fy,
          quarter: r.q,
          nqas: r.cleaned.scores.nqas.raw,
          kayakalp: r.cleaned.scores.kayakalp.raw,
          eco: r.cleaned.scores.eco.raw,
          key: r.cleaned.key,
          name: r.cleaned.name,
          nin: r.nin,
        },
      }));
      const res = await applyBatch({
        fileName: sheet?.fileName ?? "Pasted data",
        mode,
        blankClears,
        overrideReason: includedLocked ? overrideReason : undefined,
        decisions,
      });
      if (rememberOn) {
        for (const r of selected) {
          const manualId = facilityChoice[r.rowNo];
          if (manualId && manualId === r.facilityId && r.cleaned.name && r.cleaned.facilityType) {
            void saveAlias({
              portalName: r.cleaned.name,
              facilityType: r.cleaned.facilityType,
              facilityId: manualId as Id<"facilities">,
            }).catch(() => undefined);
          }
        }
      }
      if (sheet) saveRememberedIaMap(rememberKey, map, sheet.headers);
      setResult(res);
      setUndoState(null);
      setStep(5);
      toast.success(`Applied — ${res.updated} updated, ${res.noChange} no change, ${res.failed} failed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed — nothing was written");
    }
    setApplying(false);
  };

  const runUndo = async () => {
    if (!result) return;
    try {
      const res = await undoBatch({ batchId: result.batchId as Id<"importBatches"> });
      setUndoState({
        restored: res.restored,
        conflicts: res.conflicts.map((c) => ({ rowNo: c.rowNo, reason: c.reason })),
      });
      if (res.conflicts.length) {
        toast.warning(`Restored ${res.restored} row(s); ${res.conflicts.length} skipped (edited since the import)`);
      } else {
        toast.success(`Import undone — ${res.restored} row(s) restored`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not undo the import");
    }
  };

  /* ---- Render ------------------------------------------------------------------- */
  if (ctx === undefined) {
    // Skeleton shaped like the final layout: step bar, then the Step ① card.
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite" aria-label="Loading the Internal Assessment import">
        <div className="flex items-center gap-2">
          {["Add rows", "Check", "Review", "Approve", "Done"].map((label) => (
            <span
              key={label}
              className="h-7 w-28 animate-pulse rounded-md bg-muted"
            />
          ))}
        </div>
        <div className="rounded-xl border border-border/60 bg-background/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="h-8 w-40 animate-pulse rounded-md bg-muted" />
            <span className="h-8 w-56 animate-pulse rounded-md bg-muted" />
          </div>
          <span className="mt-3 block h-36 w-full animate-pulse rounded-xl bg-muted/70" />
          <span className="mt-2 block h-8 w-44 animate-pulse rounded-md bg-muted/70" />
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your facilities…
        </p>
      </div>
    );
  }

  const summaryCards: [string, number, IaPreviewState[], ("new" | "changed" | "not_reported")?][] = [
    ["Rows", viewRows.length, []],
    ["New", summary.newCount, [], "new"],
    ["Will change", summary.changedCount, [], "changed"],
    ["No change", summary.noChange, ["no_change"]],
    ["Not reported", summary.notReported, [], "not_reported"],
    ["Needs review", summary.needsReview, ["needs_review"]],
    ["Unknown NIN", summary.unknownNin, ["unmatched"]],
    ["Errors", summary.errors, ["error"]],
    ["Skipped", summary.skipped, ["skipped"]],
    ["Outside your blocks", summary.outsideBlocks, ["skipped"]],
  ];

  const detection = iaDetectionLine(sheet?.dataRows.length ?? 0, sheet?.headers.length ?? 0, detected);
  const noteFor = (label: string) => {
    switch (label) {
      case "New":
        return "Rows with no stored score for that quarter yet.";
      case "Will change":
        return "Rows where a stored score for that quarter is different.";
      case "Not reported":
        return "Both score cells blank — the stored values are kept.";
      case "Needs review":
        return "NIN cross-checks, duplicates or a past-quarter edit. Confirm or fix before approving.";
      case "Unknown NIN":
        return "A valid NIN that matches no facility in your master list. Pick the right facility.";
      case "Outside your blocks":
        return "The NIN belongs to a facility outside your blocks. These rows are skipped.";
      default:
        return undefined;
    }
  };

  return (
    <div className="space-y-4">
      <StepBar step={step} onJump={setStep} />

      {/* ================= ① Add rows ================= */}
      {step === 1 && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5" role="tablist" aria-label="How to add rows">
              {(
                [
                  ["paste", "Paste", ClipboardPaste],
                  ["upload", "Upload", Upload],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={sourceTab === value}
                  onClick={() => setSourceTab(value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    sourceTab === value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={!templatePeriod}
                onClick={() => {
                  if (!templatePeriod) return;
                  void downloadIaQuarterTemplate(templatePeriod.fy, templatePeriod.q, ctx.facilities).catch(() =>
                    toast.error("Could not build the template"),
                  );
                }}
              >
                <FileSpreadsheet className="size-3.5" /> Download template
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                disabled={!templatePeriod}
                onClick={() => {
                  if (!templatePeriod) return;
                  downloadIaCsvTemplate(templatePeriod.fy, templatePeriod.q, ctx.facilities);
                }}
              >
                <FileDown className="size-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                onClick={() => {
                  setPasteText(IA_NIN_SAMPLE_TSV);
                  void ingestText(IA_NIN_SAMPLE_TSV);
                }}
              >
                Load sample
              </Button>
              <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => downloadIaSampleFile()}>
                <Download className="size-3.5" /> Sample file
              </Button>
            </div>
          </div>

          {sourceTab === "paste" ? (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground" htmlFor="ia-paste">
                Copy the rows from Excel (with the header row) and press Ctrl+V
              </label>
              <Textarea
                id="ia-paste"
                className="min-h-36 font-mono text-xs"
                placeholder={"S. No\tNIN Number\tBlock\tPHC\tName of the facility\tType\tFinancial Year\tQuarter\tNQAS IA Score\tKayakalp IA Score"}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text/plain");
                  const html = e.clipboardData.getData("text/html");
                  if (!text.trim() && !html.trim()) return;
                  e.preventDefault();
                  if (text.trim()) {
                    setPasteText(text);
                    void ingestText(text);
                  } else {
                    void ingestHtml(html);
                  }
                }}
                aria-label="Paste the IA rows"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => void ingestText(pasteText)} disabled={!pasteText.trim() || parsing} className="gap-2">
                  {parsing ? <Loader2 className="size-4 animate-spin" /> : <ClipboardPaste className="size-4" />}
                  Use pasted rows
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  A paste without a header row is detected by its 10 columns.
                </span>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void onFile(f);
              }}
              className={cn(
                "flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border/60",
              )}
            >
              {parsing ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : <Upload className="size-6 text-muted-foreground" />}
              <p className="text-sm font-medium">Drag and drop the IA sheet here</p>
              <p className="text-xs text-muted-foreground">or choose a file — .xlsx, .xls, .csv, .tsv</p>
              <label className="glass-input inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                Choose file
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFile(f);
                  }}
                />
              </label>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Accepted: .xlsx, .xls, .csv, .tsv · up to 10 MB / 20,000 rows · parsing runs off the page · nothing is
            written until you approve. Required: NIN (or the old Facility for Formula), Financial Year and Quarter, and
            at least one score column.
          </p>
        </div>
      )}

      {/* ================= ② Check ================= */}
      {step === 2 && sheet && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <FileSpreadsheet className="size-3" /> {sheet.fileName}
            </Badge>
            <span className="text-xs font-medium" data-testid="ia-detection-line">
              {detection}
            </span>
            {wide && (
              <Badge className="gap-1 bg-sky-500/15 text-sky-700 dark:text-sky-300">
                Wide layout — every dated column becomes one row per quarter
              </Badge>
            )}
            {pasteText.trim() && (
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto h-7 gap-1 text-[11px]"
                onClick={() => setStep(1)}
                data-tip="Go back to the raw text, change it and parse again"
              >
                <Pencil className="size-3" /> Edit and re-parse
              </Button>
            )}
          </div>

          {mappingProblems.length > 0 && (
            <p className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="size-4 shrink-0" />
              {mappingProblems.join(" · ")}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {IA_MAP_COLUMNS.map((col) => {
              const idx = map[col.role];
              const header = idx == null ? null : sheet.headers[idx];
              const matched = header != null;
              return (
                <div key={col.role} className="flex items-center gap-2">
                  <span className="flex w-40 shrink-0 items-center gap-1 text-xs font-medium">
                    {matched ? (
                      <Check className="size-3 text-emerald-600" aria-label="matched" />
                    ) : (
                      <span className="size-3 rounded-full border border-dashed border-muted-foreground/50" aria-hidden />
                    )}
                    {col.label}
                    {col.required && <span className="text-[10px] text-muted-foreground">*</span>}
                  </span>
                  <Select
                    value={idx == null ? "none" : String(idx)}
                    onValueChange={(v) =>
                      setMap((m) => ({ ...m, [col.role]: v === "none" ? null : Number(v) }))
                    }
                  >
                    <SelectTrigger className="h-9 w-full min-w-40 text-xs">
                      <SelectValue placeholder="Not mapped" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">
                        — not mapped —
                      </SelectItem>
                      {sheet.headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>

          {!wide && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Label className="w-40 shrink-0 text-xs">
                  {map.fy == null ? "Financial Year (whole file)" : "Financial Year (from column)"}
                </Label>
                {map.fy == null ? (
                  <Select value={fyOverride ?? "none"} onValueChange={(v) => setFyOverride(v === "none" ? null : v)}>
                    <SelectTrigger className="h-9 w-full text-xs">
                      <SelectValue placeholder="Pick the FY" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...new Map(quarterChoices.map((qq) => [qq.fy, qq])).values()].map((qq) => (
                        <SelectItem key={qq.fy} value={qq.fy} className="text-xs">
                          {qq.fy}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">Column mapped</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-40 shrink-0 text-xs">
                  {map.quarter == null ? "Quarter (whole file)" : "Quarter (from column)"}
                </Label>
                {map.quarter == null ? (
                  <Select
                    value={qOverride == null ? "none" : String(qOverride)}
                    onValueChange={(v) => setQOverride(v === "none" ? null : (Number(v) as 1 | 2 | 3 | 4))}
                  >
                    <SelectTrigger className="h-9 w-full text-xs">
                      <SelectValue placeholder="Pick the quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      {quarterChoices.map((qq) => (
                        <SelectItem key={`q-${qq.fy}-${qq.q}`} value={String(qq.q)} className="text-xs">
                          {qq.label} ({qq.fy})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">Column mapped</Badge>
                )}
              </div>
            </div>
          )}

          {detected.length === 1 && lockedPeriods.has(`${detected[0].fy}|Q${detected[0].q}`) && (
            <p className="flex items-center gap-1.5 rounded-lg border border-amber-300/60 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="size-3.5" /> {detected[0].label} is locked.{" "}
              {isAdmin
                ? "Tick “Include locked quarters” below to override it with a reason."
                : "Ask a State Admin to unlock it before importing."}
            </p>
          )}

          {detected.some((p) => lockedPeriods.has(`${p.fy}|Q${p.q}`)) && isAdmin && (
            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50/60 px-2 text-xs dark:bg-amber-500/10">
              <Checkbox checked={unlockPeriods} onCheckedChange={(v) => setUnlockPeriods(v === true)} />
              <span>Include locked quarters (State Admin override — a reason is required at approval).</span>
            </label>
          )}

          {(detected.length > 1 || detected.some((p) => lockedPeriods.has(`${p.fy}|Q${p.q}`))) && (
            <fieldset className="rounded-lg border border-border/60 p-3">
              <legend className="px-1 text-xs font-semibold">Quarters found — untick any you do not want to import</legend>
              <div className="mt-1 flex flex-wrap gap-3">
                {detected.map((p) => {
                  const locked = lockedPeriods.has(`${p.fy}|Q${p.q}`);
                  return (
                    <label key={p.label} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={periodChecked(p)}
                        disabled={locked && !unlockPeriods}
                        onCheckedChange={(v) =>
                          setPeriodSel((prev) => {
                            const next =
                              prev ??
                              Object.fromEntries(
                                detected.map((d) => [
                                  `${d.fy}|Q${d.q}`,
                                  !lockedPeriods.has(`${d.fy}|Q${d.q}`),
                                ]),
                              );
                            return { ...next, [`${p.fy}|Q${p.q}`]: v === true };
                          })
                        }
                      />
                      <span className={locked ? "text-muted-foreground" : undefined}>
                        {p.label} · {p.rows} row{p.rows === 1 ? "" : "s"}
                        {locked ? " · locked" : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {prepared.warnings.length > 0 && (
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {prepared.warnings.map((w) => (
                <li key={w} className="flex items-center gap-1.5">
                  <Info className="size-3" /> {w}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                saveRememberedIaMap(rememberKey, map, sheet.headers);
                setStep(3);
              }}
              disabled={mappingProblems.length > 0 || activeRows.length === 0}
              className="gap-2"
            >
              <ArrowRight className="size-4" /> Review {activeRows.length} row{activeRows.length === 1 ? "" : "s"}
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
          </div>
        </div>
      )}

      {/* ================= ③ Review & match ================= */}
      {step === 3 && (
        <div className="space-y-3">
          {(() => {
            const first = activeRows.find((r) => r.fy && r.q);
            if (!first?.fy || !first.q) return null;
            if (!isQuarterProvisional(first.fy, first.q, today)) return null;
            return (
              <p
                className="flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-300/60 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                data-testid="ia-provisional-badge"
              >
                <span className="rounded-full border border-amber-400/60 px-1.5 py-0.5 text-[11px] font-semibold">
                  Provisional
                </span>
                {formatFyQuarter(first.fy, first.q)} has not ended yet — re-uploading updates the same rows; the
                quarter can be marked final after it closes.
              </p>
            );
          })()}

          {preview.fileWarnings.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="File warnings">
              {preview.fileWarnings.map((w) => (
                <li
                  key={w}
                  className="inline-flex items-center gap-1 rounded-full border border-sky-300/60 bg-sky-50 px-2.5 py-1 text-[11px] text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200"
                >
                  <Info className="size-3" /> {w}
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-10">
            {summaryCards.map(([label, value, filterStates, metric]) => {
              const active = metric
                ? metricFilter === metric
                : filterStates.length > 0 && stateFilter[0] === filterStates[0];
              return (
              <button
                key={label}
                type="button"
                data-tip={noteFor(label)}
                aria-pressed={active}
                onClick={() => {
                  if (metric) {
                    setStateFilter([]);
                    setMetricFilter((prev) => (prev === metric ? null : metric));
                    return;
                  }
                  setMetricFilter(null);
                  setStateFilter((prev) =>
                    filterStates.length === 0
                      ? []
                      : prev.length === 1 && prev[0] === filterStates[0]
                        ? []
                        : filterStates,
                  );
                }}
                className={cn(
                  "rounded-lg border border-border/60 bg-background/60 px-2.5 py-2 text-left transition-colors hover:bg-muted/40",
                  active && "border-primary/40 bg-primary/5",
                )}
              >
                <span className="block text-[10px] text-muted-foreground">{label}</span>
                <span className="text-base font-semibold tabular-nums">{value}</span>
              </button>
              );
            })}
          </div>

          {summary.missing.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Facilities not in this file: <strong>{summary.missing.length}</strong> (not changed).
            </p>
          )}

          {summary.unknownNin > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300">
              <XCircle className="size-3.5" /> {summary.unknownNin} row(s) carry a valid NIN that is not in your master
              list — pick the right facility from the Match column.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search NIN, facility, key, block, PHC"
                className="h-9 pl-8 text-xs"
              />
            </div>
            <Select value={stateFilter[0] ?? "all"} onValueChange={(v) => setStateFilter(v === "all" ? [] : [v as IaPreviewState])}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Row status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All row statuses
                </SelectItem>
                {Object.entries(IA_STATE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={blockFilter[0] ?? "all"} onValueChange={(v) => setBlockFilter(v === "all" ? [] : [v])}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Block" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All blocks
                </SelectItem>
                {blocks.map((b) => (
                  <SelectItem key={b} value={b} className="text-xs">
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={quarterFilter[0] ?? "all"} onValueChange={(v) => setQuarterFilter(v === "all" ? [] : [v])}>
              <SelectTrigger className="h-9 w-40 text-xs">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All quarters
                </SelectItem>
                {quarterOptions.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as typeof sortKey)}>
              <SelectTrigger className="h-9 w-36 text-xs" aria-label="Sort rows">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="row" className="text-xs">
                  Sort: file order
                </SelectItem>
                <SelectItem value="facility" className="text-xs">
                  Sort: facility
                </SelectItem>
                <SelectItem value="block" className="text-xs">
                  Sort: block
                </SelectItem>
                <SelectItem value="state" className="text-xs">
                  Sort: needs attention first
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setIncludeOverride((prev) => {
                  const next = { ...prev };
                  for (const r of viewRows) if (r.state === "ready") next[r.rowNo] = true;
                  return next;
                })
              }
            >
              <CheckCircle2 className="mr-1 size-3.5" /> Include all Ready
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setIncludeOverride((prev) => {
                  const next = { ...prev };
                  for (const r of viewRows) if (r.state === "no_change") next[r.rowNo] = false;
                  return next;
                })
              }
            >
              <XCircle className="mr-1 size-3.5" /> Exclude no-change rows
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setFacilityChoice((prev) => {
                  const next = { ...prev };
                  for (const r of viewRows) {
                    if (r.match.status === "suggested" && r.match.candidateIds[0]) next[r.rowNo] = r.match.candidateIds[0];
                  }
                  return next;
                })
              }
            >
              Accept all ≥95% suggestions
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
              Showing {shown.length} of {viewRows.length} rows
              {viewRows.length > DOM_CAP ? " · the preview paints the first 500; the export covers all" : ""}
            </span>
          </div>

          <IaPreviewTableLive
            columns={columns}
            rows={shown}
            facilities={facilities}
            onToggleInclude={(rowNo, next) => setIncludeOverride((p) => ({ ...p, [rowNo]: next }))}
            onPickFacility={(rowNo, facilityId) => setFacilityChoice((p) => ({ ...p, [rowNo]: facilityId }))}
            onOpenRow={(rowNo) => setDrawerRowNo(rowNo)}
            onEditScore={(rowNo, tracker, text) =>
              setScoreEdits((p) => ({ ...p, [rowNo]: { ...(p[rowNo] ?? {}), [tracker]: text } }))
            }
            onConfirmNin={(rowNo) => setConfirmedNin((p) => ({ ...p, [rowNo]: true }))}
          />

          <IaPreviewCards
            rows={shown}
            onToggleInclude={(rowNo, next) => setIncludeOverride((p) => ({ ...p, [rowNo]: next }))}
            onOpenRow={(rowNo) => setDrawerRowNo(rowNo)}
          />

          {preview.coverage.length > 0 && (
            <section className="rounded-xl border border-border/60 bg-background/60 p-3">
              <h3 className="text-xs font-semibold">Coverage after this import</h3>
              <div className="mt-2 space-y-2">
                {preview.coverage.map((p) => (
                  <div key={p.label} className="space-y-1">
                    <p className="text-xs">
                      <strong>{p.label}</strong>: {p.nqas} of {p.total} facilities will have an NQAS score, {p.kayakalp}{" "}
                      of {p.total} Kayakalp.
                    </p>
                    <div className="space-y-1">
                      {p.blocks
                        .filter((b) => b.nqas > 0 || b.kayakalp > 0)
                        .map((b) => (
                          <div
                            key={b.block}
                            className="grid grid-cols-[7rem_1fr_auto] items-center gap-2 text-[10px]"
                          >
                            <span className="truncate text-muted-foreground">{b.block}</span>
                            <span className="h-1.5 overflow-hidden rounded-full bg-muted/60" aria-hidden>
                              <span
                                className="block h-full rounded-full bg-teal-600"
                                style={{ width: `${b.total ? Math.round((b.nqas / b.total) * 100) : 0}%` }}
                              />
                            </span>
                            <span className="tabular-nums">
                              {b.nqas}/{b.total}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
              {summary.missing.length > 0 && (
                <details className="text-[11px] text-muted-foreground">
                  <summary className="cursor-pointer">
                    Facilities still missing for this quarter ({summary.missing.length})
                  </summary>
                  <p className="mt-1 leading-relaxed">
                    {summary.missing.slice(0, 60).join(", ")}
                    {summary.missing.length > 60 ? ` … +${summary.missing.length - 60} more` : ""}
                  </p>
                </details>
              )}
            </section>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setStep(4)} disabled={selected.length === 0} className="gap-2">
              <ArrowRight className="size-4" /> Review {selected.length} row{selected.length === 1 ? "" : "s"}
            </Button>
            {blocking && (
              <span className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-300">
                <XCircle className="size-3.5" /> Resolve the included rows marked Needs review / Unknown NIN / Error
              </span>
            )}
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
          </div>

          {/* Mobile 360 px: the action stays reachable without scrolling. */}
          <div className="sticky bottom-0 z-20 flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/95 px-3 py-2 md:hidden">
            <span className="text-xs tabular-nums">{selected.length} selected</span>
            <Button size="sm" onClick={() => setStep(4)} disabled={selected.length === 0}>
              Review
            </Button>
          </div>
        </div>
      )}

      {/* ================= ④ Approve ================= */}
      {step === 4 && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
          <h3 className="text-base font-semibold">Approve this import</h3>
          {(() => {
            const periods = [...new Set(selected.map((r) => `${r.fy}|Q${r.q}`))];
            const label = periods
              .map((p) => {
                const i = p.lastIndexOf("|Q");
                return formatFyQuarter(p.slice(0, i), Number(p.slice(i + 2)));
              })
              .join(" and ");
            const facilitiesCount = new Set(selected.map((r) => r.facilityId)).size;
            const selNew = selected.filter((r) => IA_TRACKERS.some((t) => r.change[t] === "new")).length;
            const selChanged = selected.filter((r) => IA_TRACKERS.some((t) => r.change[t] === "changed")).length;
            const allKayakalpBlank = selected.length > 0 && selected.every((r) => r.cleaned.scores.kayakalp.raw.trim() === "");
            return (
              <p className="text-sm text-muted-foreground">
                Save {label || "this quarter"} for {facilitiesCount} facilit{facilitiesCount === 1 ? "y" : "ies"}:{" "}
                {selNew} new, {selChanged} changed.
                {allKayakalpBlank ? " Kayakalp not reported." : ""} You can undo this.
              </p>
            );
          })()}

          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["update", "Update changed values", "every included cell is written (default)"],
                ["fillBlanks", "Fill blanks only", "never overwrite a stored value — a safe top-up"],
                ["addNewOnly", "Add new quarter only", "rows already stored for this quarter are skipped"],
              ] as [("update" | "fillBlanks" | "addNewOnly"), string, string][]
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className={cn(
                  "flex min-h-14 cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                  mode === value ? "border-primary/60 bg-primary/5" : "border-border/60",
                )}
              >
                <input
                  type="radio"
                  name="ia-mode"
                  className="mt-1 accent-primary"
                  checked={mode === value}
                  onChange={() => setMode(value)}
                />
                <span>
                  <span className="block text-xs font-medium">{label}</span>
                  <span className="block text-[10px] text-muted-foreground">{hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 text-sm">
              <Checkbox checked={blankClears} onCheckedChange={(v) => setBlankClears(v === true)} />
              <span className="text-xs">
                Blank score cells <strong>clear</strong> the stored value. Off by default — a blank never erases a score.
              </span>
            </label>
            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 text-sm">
              <Checkbox checked={rememberOn} onCheckedChange={(v) => setRememberOn(v === true)} />
              <span className="text-xs">
                Remember the {manuallyPicked} hand-matched row{manuallyPicked === 1 ? "" : "s"}, so the next import is
                automatic.
              </span>
            </label>
          </div>

          {includedLocked && (
            <section className="space-y-1 rounded-lg border border-amber-300/60 bg-amber-50 p-3 dark:bg-amber-500/10">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
                <AlertTriangle className="size-4" /> Some included rows target a LOCKED quarter
              </p>
              <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
                {isAdmin
                  ? "As State Admin you can override the lock — your reason is recorded on every row."
                  : "Only the State Admin can override a locked quarter. Deselect those rows or ask the admin."}
              </p>
              {isAdmin && (
                <Textarea
                  className="min-h-16 text-xs"
                  placeholder="Why is this locked quarter being edited?"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              )}
            </section>
          )}

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
            I have reviewed the preview and want to apply this update.
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={runApply}
              disabled={
                !confirmed ||
                applying ||
                blocking ||
                selected.length === 0 ||
                (includedLocked && (!isAdmin || !overrideReason.trim()))
              }
              className="gap-2"
            >
              {applying ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Approve &amp; apply
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                void downloadIaImportReport({
                  fileName: sheet?.fileName ?? "Pasted data",
                  generatedBy: ctx.me.name ?? "user",
                  generatedAt: new Date(),
                  rows: viewRows,
                  summary: { updated: 0, noChange: 0, skipped: 0, failed: 0 },
                  trackers,
                }).then(() => toast.success("Preview downloaded"))
              }
            >
              <Download className="size-4" /> Download preview (Excel)
            </Button>
            <Button variant="ghost" onClick={() => setStep(3)} disabled={applying}>
              Back to preview
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The whole batch runs as one transaction — if any row fails, nothing is written.
          </p>
        </div>
      )}

      {/* ================= ⑤ Done ================= */}
      {step === 5 && result && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <CheckCircle2 className="size-5 text-emerald-600" /> Import applied
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["Updated", result.updated],
                ["No change", result.noChange],
                ["Skipped", result.skipped],
                ["Failed", result.failed],
              ] as [string, number][]
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border/60 px-3 py-2">
                <span className="block text-[11px] text-muted-foreground">{label}</span>
                <span className="text-lg font-semibold tabular-nums">{value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                void downloadIaImportReport({
                  fileName: sheet?.fileName ?? "Pasted data",
                  generatedBy: ctx.me.name ?? "user",
                  generatedAt: new Date(),
                  rows: viewRows,
                  summary: result,
                  trackers,
                }).then(() => toast.success("Report downloaded"))
              }
            >
              <Download className="size-4" /> Download import report (Excel)
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => onOpenList?.()}>
              <ExternalLink className="size-4" /> View in Master List
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={undoState != null}
              onClick={() => void runUndo()}
            >
              <Undo2 className="size-4" /> Undo this import
            </Button>
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => {
                setSheet(null);
                setMap(autoMapIaColumns([], false));
                setIncludeOverride({});
                setFacilityChoice({});
                setConfirmedNin({});
                setScoreEdits({});
                setPeriodSel(null);
                setUnlockPeriods(false);
                setResult(null);
                setUndoState(null);
                setConfirmed(false);
                setStep(1);
                setSourceTab("paste");
                setPasteText("");
              }}
            >
              <Upload className="size-4" /> Import another file
            </Button>
          </div>
          {undoState && (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                Undone — {undoState.restored} row(s) restored
                {undoState.conflicts.length
                  ? `, ${undoState.conflicts.length} skipped (edited since the import)`
                  : ""}
                . The previous values are back; the undo is in Import history.
              </p>
              {undoState.conflicts.length > 0 && (
                <ul className="list-inside list-disc text-amber-700 dark:text-amber-300">
                  {undoState.conflicts.map((c) => (
                    <li key={c.rowNo}>
                      Row {c.rowNo}: {c.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Import history keeps this batch, its report and an Undo for later.
          </p>
        </div>
      )}

      <IaRowDetailsDrawer
        row={drawerRowNo == null ? null : viewRows.find((r) => r.rowNo === drawerRowNo) ?? null}
        facilities={facilities}
        onClose={() => setDrawerRowNo(null)}
        onRecall={(name, facilityType, facilityId) => {
          void saveAlias({ portalName: name, facilityType, facilityId: facilityId as Id<"facilities"> }).then(() => {
            toast.success("Match remembered — the next import matches automatically");
          });
        }}
        onConfirmNin={(rowNo) => setConfirmedNin((p) => ({ ...p, [rowNo]: true }))}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Preview table — ONE cell per column from the shared column model             */
/* --------------------------------------------------------------------------- */

function IaPreviewTableLive({
  columns,
  rows,
  facilities,
  onToggleInclude,
  onPickFacility,
  onOpenRow,
  onEditScore,
  onConfirmNin,
}: {
  columns: IaPreviewColumn[];
  rows: readonly IaPreviewRow[];
  facilities: IaFacility[];
  onToggleInclude: (rowNo: number, next: boolean) => void;
  onPickFacility: (rowNo: number, facilityId: string | null) => void;
  onOpenRow: (rowNo: number) => void;
  onEditScore: (rowNo: number, tracker: IaTracker, text: string | null) => void;
  onConfirmNin: (rowNo: number) => void;
}) {
  /* Frozen leading columns: everything up to and including Facility — Include,
     Row, NIN (and the old key column when the file is key-based). Each sticky
     cell needs the sum of the widths before it, otherwise two columns sit at
     left: 0 and the second paints over the first. Block / PHC / Type scroll:
     pinning them too would need ~662 px of frozen width and squeeze the sheet
     on a 1024 px screen. */
  const lastFrozen = columns.findIndex((c) => c.key === "matchedFacility");
  const FROZEN = (lastFrozen >= 0 ? lastFrozen : 3) + 1;
  const frozenLeft = (i: number) =>
    i >= FROZEN ? 0 : columns.slice(0, i).reduce((sum, c) => sum + c.width, 0);
  return (
    <div className="hidden max-h-[30rem] overflow-auto rounded-lg border border-border/60 md:block">
      <table className="w-full border-collapse text-xs" style={{ tableLayout: "fixed" }}>
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={{ width: c.width }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur">
          <tr>
            {columns.map((c, i) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  "border-b border-border/60 px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  i < FROZEN && "sticky z-30 bg-muted/95",
                  i === FROZEN - 1 && "border-r border-border/60",
                )}
                style={i < FROZEN ? { left: frozenLeft(i) } : undefined}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rowNo} className="border-b border-border/40 hover:bg-muted/30">
              {columns.map((c, i) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-2 py-1 align-top",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    i < FROZEN && "sticky z-10 bg-background",
                    i === FROZEN - 1 && "border-r border-border/40",
                  )}
                  style={i < FROZEN ? { left: frozenLeft(i) } : undefined}
                >
                  {c.kind === "include" ? (
                    <Checkbox
                      checked={row.include}
                      aria-label={`Include row ${row.rowNo}`}
                      onCheckedChange={(v) => onToggleInclude(row.rowNo, v === true)}
                    />
                  ) : c.kind === "match" ? (
                    <MatchCell row={row} facilities={facilities} onPick={onPickFacility} />
                  ) : c.kind === "move" ? (
                    (() => {
                      const tracker = c.key.split(":")[0] as IaTracker;
                      const glyph = iaMoveGlyph(row, tracker);
                      return (
                        <span className="text-[11px] font-medium" data-tip={iaNotes(row)}>
                          {glyph} {scoreCell(row, tracker, "move").replace(/^[▲▼■]\s*/, "")}
                        </span>
                      );
                    })()
                  ) : c.kind === "spark" ? (
                    <Sparkline row={row} />
                  ) : c.kind === "score" ? (
                    (() => {
                      const [tracker, which] = c.key.split(":") as [IaTracker, "new" | "cur" | "prev"];
                      if (which === "cur") {
                        return <ScoreChip value={row.current[tracker]} remark={row.currentRemark[tracker]} />;
                      }
                      if (which === "prev") {
                        return <ScoreChip value={row.prev[tracker]} />;
                      }
                      return <ScoreEditCell row={row} tracker={tracker} onCommit={onEditScore} />;
                    })()
                  ) : c.kind === "state" ? (
                    <span className="inline-flex flex-col items-center gap-1">
                      <StatePill state={row.state} />
                      {row.needsNinConfirm && (
                        <button
                          type="button"
                          onClick={() => onConfirmNin(row.rowNo)}
                          className="rounded border border-amber-400/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 hover:bg-amber-100 dark:text-amber-200"
                        >
                          Confirm NIN
                        </button>
                      )}
                    </span>
                  ) : c.key === "notes" ? (
                    <button
                      type="button"
                      onClick={() => onOpenRow(row.rowNo)}
                      className="flex items-start gap-1 text-left text-[11px] leading-tight text-muted-foreground hover:text-foreground"
                      data-tip="Show row details"
                    >
                      <Info className="mt-0.5 size-3 shrink-0" />
                      <span className="line-clamp-2">{iaNotes(row)}</span>
                    </button>
                  ) : (
                    <span
                      className={cn(
                        "block truncate",
                        c.key === "matchedFacility" && row.facilityId && "font-medium",
                      )}
                    >
                      {String(c.raw(row, () => ""))}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="p-6 text-center text-muted-foreground">
                No rows match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Mobile 360 px — rows become cards                                            */
/* --------------------------------------------------------------------------- */

function IaPreviewCards({
  rows,
  onToggleInclude,
  onOpenRow,
}: {
  rows: readonly IaPreviewRow[];
  onToggleInclude: (rowNo: number, next: boolean) => void;
  onOpenRow: (rowNo: number) => void;
}) {
  if (rows.length === 0) {
    return <p className="p-6 text-center text-sm text-muted-foreground md:hidden">No rows match the current filters.</p>;
  }
  return (
    <ul className="space-y-2 md:hidden" aria-label="Preview rows">
      {rows.map((row) => (
        <li key={row.rowNo} className="rounded-xl border border-border/60 bg-background/70 p-3">
          <div className="flex items-start gap-2">
            <Checkbox
              checked={row.include}
              aria-label={`Include row ${row.rowNo}`}
              onCheckedChange={(v) => onToggleInclude(row.rowNo, v === true)}
            />
            <button type="button" onClick={() => onOpenRow(row.rowNo)} className="min-w-0 flex-1 text-left">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-sm font-semibold">{row.facilityName || row.cleaned.name || "Unknown NIN"}</span>
                <StatePill state={row.state} />
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                NIN {row.nin ?? "-"} · {row.facilityBlock || row.cleaned.block} · {row.facilityType || row.cleaned.facilityType}
                {row.fy && row.q ? ` · ${formatFyQuarter(row.fy, row.q)}` : ""}
              </span>
              <span className="mt-1 flex flex-wrap gap-2 text-[11px]">
                <span>
                  NQAS {row.current.nqas ?? "-"} → <strong>{row.cleaned.scores.nqas.value ?? "-"}</strong>
                </span>
                <span>
                  Kayakalp {row.current.kayakalp ?? "-"} → <strong>{row.cleaned.scores.kayakalp.value ?? "-"}</strong>
                </span>
              </span>
              {row.crossCheck && row.needsNinConfirm && (
                <span className="mt-1 block text-[10px] text-amber-700 dark:text-amber-300">{row.crossCheck}</span>
              )}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------------------------- */
/* Row details drawer                                                          */
/* --------------------------------------------------------------------------- */

function IaRowDetailsDrawer({
  row,
  facilities,
  onClose,
  onRecall: _onRecall,
  onConfirmNin,
}: {
  row: IaPreviewRow | null;
  facilities: IaFacility[];
  onClose: () => void;
  onRecall: (facilityName: string, facilityType: string, facilityId: string) => void;
  onConfirmNin: (rowNo: number) => void;
}) {
  if (!row) return null;
  const c = row.cleaned;
  const candidates = [...new Set([...row.suggestionIds, ...(row.match.status === "ambiguous" || row.match.status === "suggested" ? row.match.candidateIds : [])])]
    .map((id) => facilities.find((f) => f.id === id))
    .filter((f): f is IaFacility => !!f);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Row {row.rowNo} — {row.facilityName || c.nin || c.key || c.name}
          </DialogTitle>
          <DialogDescription>
            {IA_STATE_LABELS[row.state]} · {matchLabel(row)}
            {row.fy && row.q ? ` · ${formatFyQuarter(row.fy, row.q)}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <section>
            <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Identity</h4>
            <p>
              NIN <strong>{c.nin ?? "-"}</strong>
              {c.ninRaw && c.ninRaw !== c.nin ? ` (file: ${c.ninRaw})` : ""} · {row.facilityName || "—"} ·{" "}
              {row.facilityBlock} · {row.facilityPhc} ({row.facilityType})
            </p>
            {row.crossCheck && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="size-3.5" /> {row.crossCheck}
                {row.needsNinConfirm && (
                  <Button size="sm" variant="outline" className="ml-1 h-6 px-2 text-[10px]" onClick={() => onConfirmNin(row.rowNo)}>
                    Confirm NIN
                  </Button>
                )}
              </p>
            )}
          </section>

          <section>
            <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Cleaned scores</h4>
            <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-xs">
              {IA_TRACKERS.map((t) => {
                const s = c.scores[t];
                return (
                  <div key={t} className="col-span-2 grid grid-cols-[7rem_1fr] gap-2">
                    <dt className="text-muted-foreground">{TRACKER_LABELS[t]}</dt>
                    <dd className="tabular-nums">
                      {s.raw.trim() === "" ? (
                        <span className="text-muted-foreground">blank in file — stored {row.current[t] ?? "nothing"} is kept</span>
                      ) : s.error ? (
                        <span className="text-destructive">“{s.raw}” is outside 0–100</span>
                      ) : (
                        <>
                          “{s.raw}” → <b>{s.value ?? s.chip}</b> · stored {row.current[t] ?? "nothing"}
                        </>
                      )}
                    </dd>
                  </div>
                );
              })}
              <dt className="text-muted-foreground">Period</dt>
              <dd>
                {c.fy ?? "—"} · {c.q ? `Q${c.q}` : "—"}
              </dd>
            </dl>
          </section>

          {row.trend.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Last four quarters</h4>
              <table className="mt-1 w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="font-medium">Quarter</th>
                    <th className="text-right font-medium">NQAS IA</th>
                    <th className="text-right font-medium">Kayakalp IA</th>
                  </tr>
                </thead>
                <tbody>
                  {row.trend.map((p, i) => (
                    <tr key={p.label} className={i === row.trend.length - 1 ? "font-semibold" : undefined}>
                      <td>{p.label}</td>
                      <td className="text-right tabular-nums">{p.nqas ?? "-"}</td>
                      <td className="text-right tabular-nums">{p.kayakalp ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section>
            <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Why it matched</h4>
            <p className="text-xs text-muted-foreground">{matchLabel(row)}</p>
          </section>

          <details className="rounded-lg border border-border/60 p-2">
            <summary className="cursor-pointer text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Raw row from the file
            </summary>
            <pre className="mt-1 max-h-40 overflow-auto text-[10px] leading-relaxed text-muted-foreground">
              {JSON.stringify(c.raw, null, 2)}
            </pre>
          </details>

          <section>
            <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Notes</h4>
            <ul className="list-inside list-disc text-xs text-muted-foreground">
              {row.chips.length === 0 && row.warnings.length === 0 && <li>None — a plain update.</li>}
              {row.chips.map((chip) => (
                <li key={chip}>{chip}</li>
              ))}
              {row.warnings.map((w) => (
                <li key={w} className="text-amber-700 dark:text-amber-300">
                  {w}
                </li>
              ))}
            </ul>
          </section>

          {candidates.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Suggestions</h4>
              <ul className="space-y-1 text-xs">
                {candidates.map((f) => (
                  <li key={f.id}>
                    {f.name} · {f.block} · {f.phc} ({f.facilityType}){f.ninNumber ? ` · ${f.ninNumber}` : ""}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Suggestions are NEVER auto-applied — pick the facility from the Match column.
              </p>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------------------- */
/* Small helpers                                                                */
/* --------------------------------------------------------------------------- */

function trackerDecision(
  row: IaPreviewRow,
  t: IaTracker,
  blankClears: boolean,
): { value?: number | null; remark?: string | null } | undefined {
  const s = row.cleaned.scores[t];
  if (s.error) return undefined; // a bad value never writes
  if (s.raw.trim() === "") {
    // A blank keeps the stored value UNLESS the user explicitly ticked
    // "Blank clears existing value" on the approve step.
    return blankClears ? { value: null, remark: null } : undefined;
  }
  return { value: s.value, remark: s.remark ?? null };
}

/** The thresholds the tooltips cite (kept so the constants stay referenced). */
void LARGE_CHANGE;
void SCORE_BARS;
