/**
 * INTERNAL ASSESSMENT — ONE card for the Facility profile and Quick View.
 *
 * It uses the quarters the profile already has. Nothing is fetched here.
 * Wide containers get tiles, chart + table; narrow containers get tiles,
 * chart and a collapsible table so the dialog never scrolls sideways.
 */

import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Info,
  Minus,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  currentIaQuarter,
  formatFyQuarter,
  lastQuarters,
  type FyQuarter,
} from "@/lib/iaImport";
import { readIaTarget } from "@/lib/iaCard";
import { todayLocalIso } from "@/lib/today";
import { cn } from "@/lib/utils";

export type IaWebRow = {
  fy: string;
  quarter: number;
  nqasIaScore?: number | null;
  kayakalpIaScore?: number | null;
  nqasRemark?: string | null;
  kayakalpRemark?: string | null;
  updatedAt?: number | null;
  updatedByName?: string | null;
};

type Range = "4" | "8" | "fy";
type Metric = "nqas" | "kayakalp";

type Point = {
  fy: string;
  q: 1 | 2 | 3 | 4;
  label: string;
  nqas: number | null;
  kayakalp: number | null;
  nqasRemark: string | null;
  kayakalpRemark: string | null;
  updatedAt: number | null;
  inProgress: boolean;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NO_CHANGE_BAND = 0.05;

const METRICS: Record<
  Metric,
  { label: string; colour: string; soft: string; shape: "circle" | "diamond" }
> = {
  nqas: {
    label: "NQAS IA",
    colour: "#0f766e",
    soft: "bg-teal-50 text-teal-900 ring-teal-200",
    shape: "circle",
  },
  kayakalp: {
    label: "Kayakalp IA",
    colour: "#b45309",
    soft: "bg-amber-50 text-amber-900 ring-amber-200",
    shape: "diamond",
  },
};

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function scoreText(value: number | null): string {
  return value == null ? "-" : value.toFixed(1);
}

function delta(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  return Math.round((current - previous) * 100) / 100;
}

function changeText(value: number | null): string {
  if (value == null) return "-";
  if (Math.abs(value) < NO_CHANGE_BAND) return "Same";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function changeTone(value: number | null): string {
  if (value == null) return "text-muted-foreground";
  if (Math.abs(value) < NO_CHANGE_BAND) return "text-muted-foreground";
  return value > 0 ? "text-emerald-700" : "text-rose-700";
}

function stampDate(ms: number | null): string {
  if (!ms) return "-";
  const d = new Date(ms + 5.5 * 3_600_000);
  return `${String(d.getUTCDate()).padStart(2, "0")}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

function readRange(key: string): Range {
  if (typeof window === "undefined") return "4";
  try {
    const saved = window.localStorage.getItem(key);
    return saved === "8" || saved === "fy" ? saved : "4";
  } catch {
    return "4";
  }
}

function useContainerWidth(initial = 720): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const next = el.clientWidth;
      if (next > 0) setWidth((current) => (Math.abs(current - next) > 1 ? next : current));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

function valueOf(point: Point, metric: Metric): number | null {
  return metric === "nqas" ? point.nqas : point.kayakalp;
}

function latestWithValue(
  points: Point[],
  metric: Metric,
): { index: number; point: Point; value: number } | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const value = valueOf(points[i], metric);
    if (value != null) return { index: i, point: points[i], value };
  }
  return null;
}

function previousWithValue(points: Point[], index: number, metric: Metric): number | null {
  for (let i = index - 1; i >= 0; i--) {
    const value = valueOf(points[i], metric);
    if (value != null) return value;
  }
  return null;
}

function deltaAt(points: Point[], index: number, metric: Metric): number | null {
  const current = valueOf(points[index], metric);
  return delta(current, previousWithValue(points, index, metric));
}

function ChangePill({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
        aria-label="No previous quarter"
      >
        -
      </span>
    );
  }
  if (Math.abs(value) < NO_CHANGE_BAND) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
        <Minus className="size-3" aria-hidden /> Same
      </span>
    );
  }
  const up = value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
        up ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
      )}
    >
      {up ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />}
      {up ? "+" : ""}
      {value.toFixed(1)}
    </span>
  );
}

function TargetChip({ value, target }: { value: number | null; target: number }) {
  if (value == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
        <Target className="size-3" aria-hidden /> Target {target.toFixed(1)}
      </span>
    );
  }
  const difference = Math.round((value - target) * 100) / 100;
  const above = difference >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        above ? "bg-teal-50 text-teal-900 ring-1 ring-teal-200" : "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
      )}
    >
      <Target className="size-3" aria-hidden />
      {above ? "Above" : "Below"} target by {Math.abs(difference).toFixed(1)}
    </span>
  );
}

function Sparkline({
  points,
  metric,
  target,
}: {
  points: Point[];
  metric: Metric;
  target: number;
}) {
  const values = points.map((p) => valueOf(p, metric));
  const reported = values.filter((v): v is number => v != null);
  if (reported.length < 2) {
    return <span className="text-[10px] text-muted-foreground">{reported.length ? "One quarter" : "No data"}</span>;
  }
  const low = Math.max(0, Math.min(...reported, target) - 5);
  const w = 92;
  const h = 30;
  const x = (i: number) => 2 + (w - 4) * (values.length <= 1 ? 0.5 : i / (values.length - 1));
  const y = (value: number) => 3 + (h - 6) * (1 - (value - low) / (100 - low));
  const segments = values.slice(1).flatMap((value, i) => {
    const previous = values[i];
    if (value == null || previous == null) return [];
    return [
      <line
        key={i}
        x1={x(i)}
        y1={y(previous)}
        x2={x(i + 1)}
        y2={y(value)}
        stroke={METRICS[metric].colour}
        strokeWidth={1.8}
        strokeDasharray={points[i + 1].inProgress ? "4 3" : undefined}
        strokeLinecap="round"
      />,
    ];
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <line
        x1={2}
        x2={w - 2}
        y1={y(target)}
        y2={y(target)}
        stroke="#94a3b8"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {segments}
      {values.map((value, i) =>
        value == null ? null : (
          <circle
            key={i}
            cx={x(i)}
            cy={y(value)}
            r={points[i].inProgress ? 2.6 : 2}
            fill={points[i].inProgress ? "#ffffff" : METRICS[metric].colour}
            stroke={METRICS[metric].colour}
            strokeWidth={1.4}
          />
        ),
      )}
    </svg>
  );
}

function KpiTile({
  metric,
  points,
  target,
}: {
  metric: Metric;
  points: Point[];
  target: number;
}) {
  const latest = latestWithValue(points, metric);
  const change = latest ? deltaAt(points, latest.index, metric) : null;
  return (
    <section
      className="min-w-0 rounded-xl border border-border/60 bg-white p-3"
      aria-label={`${METRICS[metric].label} latest score`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          {metric === "nqas" ? (
            <span className="size-2.5 rounded-full" style={{ backgroundColor: METRICS[metric].colour }} aria-hidden />
          ) : (
            <span className="size-2.5 rotate-45" style={{ backgroundColor: METRICS[metric].colour }} aria-hidden />
          )}
          {METRICS[metric].label}
        </span>
        <Sparkline points={points} metric={metric} target={target} />
      </div>
      <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="text-3xl font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
          {scoreText(latest?.value ?? null)}
        </span>
        {latest ? (
          <span className="mb-0.5 text-[11px] text-muted-foreground">
            {latest.point.label}
            {latest.point.inProgress && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-900">
                In progress
              </span>
            )}
          </span>
        ) : (
          <span className="mb-0.5 text-[11px] text-muted-foreground">Not reported</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <ChangePill value={change} />
        <TargetChip value={latest?.value ?? null} target={target} />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Chart                                                                      */
/* -------------------------------------------------------------------------- */

type Tip = {
  point: Point;
  metric: Metric;
  value: number;
  change: number | null;
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function markerPath(x: number, y: number, metric: Metric): ReactNode {
  if (metric === "nqas") {
    return <circle cx={x} cy={y} r={4.5} />;
  }
  return <path d={`M ${x} ${y - 5.5} L ${x + 5.5} ${y} L ${x} ${y + 5.5} L ${x - 5.5} ${y} Z`} />;
}

const IaChart = memo(function IaChart({
  points,
  target,
  fullScale,
  onFullScaleChange,
}: {
  points: Point[];
  target: number;
  fullScale: boolean;
  onFullScaleChange: (next: boolean) => void;
}) {
  const [ref, measured] = useContainerWidth(560);
  const [tip, setTip] = useState<Tip | null>(null);
  const w = Math.max(300, Math.round(measured));
  const h = w < 460 ? 255 : 275;
  const pad = { top: 24, right: 18, bottom: w < 460 ? 52 : 44, left: 40 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const values = points.flatMap((p) => [p.nqas, p.kayakalp]).filter((v): v is number => v != null);
  const low = fullScale || values.length === 0
    ? 0
    : Math.max(0, Math.floor((Math.min(...values, target) - 5) / 5) * 5);
  const high = 100;
  const y = (value: number) => pad.top + plotH * (1 - (clamp(value, low, high) - low) / Math.max(1, high - low));
  const x = (index: number) =>
    points.length <= 1 ? pad.left + plotW / 2 : pad.left + (plotW * index) / (points.length - 1);
  const ticks = fullScale ? [0, 25, 50, 75, 100] : [low, Math.round((low + high) / 2), high];
  const splitLabels = points.length > 5 && w < 620;
  const labelY = pad.top + plotH - 7;

  const labels: { x: number; y: number; text: string; colour: string }[] = [];
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];

  for (let i = 0; i < points.length; i++) {
    for (const metric of ["nqas", "kayakalp"] as const) {
      const value = valueOf(points[i], metric);
      if (value == null) continue;
      const cx = x(i);
      const cy = y(value);
      const text = value.toFixed(1);
      const width = text.length * 5.6;
      const candidates = [cy - 9, cy + 15, cy - 22, cy + 28, cy - 35, cy + 41];
      let chosen: number | null = null;
      for (const candidate of candidates) {
        const top = candidate - 7;
        const bottom = candidate + 2;
        if (top < pad.top + 1 || bottom > pad.top + plotH - 1) continue;
        const box = {
          x0: clamp(cx - width / 2, pad.left, w - pad.right) - 1,
          x1: clamp(cx + width / 2, pad.left, w - pad.right) + 1,
          y0: top,
          y1: bottom,
        };
        if (placed.some((b) => box.x0 < b.x1 && b.x0 < box.x1 && box.y0 < b.y1 && b.y0 < box.y1)) continue;
        placed.push(box);
        chosen = candidate;
        break;
      }
      if (chosen == null) chosen = clamp(cy - 9, pad.top + 8, pad.top + plotH - 8);
      labels.push({ x: cx, y: chosen, text, colour: METRICS[metric].colour });
    }
  }

  return (
    <div ref={ref} className="relative min-w-0 rounded-xl border border-border/60 bg-white p-2">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-1">
        <span className="text-[11px] font-semibold text-slate-700">Quarterly trend</span>
        <button
          type="button"
          aria-pressed={fullScale}
          onClick={() => onFullScaleChange(!fullScale)}
          className={cn(
            "min-h-6 rounded-md border px-2 text-[10px] font-medium transition-colors duration-150",
            fullScale
              ? "border-primary/40 bg-primary/10 text-foreground"
              : "border-border/60 text-muted-foreground hover:bg-muted",
          )}
        >
          Full 0–100
        </button>
      </div>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="group"
        aria-label="NQAS IA and Kayakalp IA line chart by quarter"
        style={{ maxWidth: "100%" }}
        onMouseLeave={() => setTip(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={w - pad.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text x={pad.left - 5} y={y(tick) + 3.5} textAnchor="end" fontSize={9.5} fill="#64748b">
              {tick.toFixed(0)}
            </text>
          </g>
        ))}
        <text x={4} y={pad.top - 7} fontSize={9.5} fill="#64748b">
          Score %
        </text>

        <line
          x1={pad.left}
          x2={w - pad.right}
          y1={y(target)}
          y2={y(target)}
          stroke="#94a3b8"
          strokeWidth={1.2}
          strokeDasharray="4 3"
        />
        <text x={w - pad.right} y={y(target) - 4} textAnchor="end" fontSize={9.5} fill="#475569">
          Target {target.toFixed(1)}
        </text>

        {(["nqas", "kayakalp"] as const).map((metric) =>
          points.slice(0, -1).map((point, i) => {
            const next = points[i + 1];
            const a = valueOf(point, metric);
            const b = valueOf(next, metric);
            if (a == null || b == null) return null;
            return (
              <line
                key={`${metric}-${point.fy}-${point.q}-line`}
                x1={x(i)}
                y1={y(a)}
                x2={x(i + 1)}
                y2={y(b)}
                stroke={METRICS[metric].colour}
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray={next.inProgress ? "5 4" : undefined}
              />
            );
          }),
        )}

        {points.map((point, i) => {
          const missing = point.nqas == null && point.kayakalp == null;
          return (
            <g key={`${point.fy}-${point.q}`}>
              {missing && (
                <text
                  x={x(i)}
                  y={labelY + (i % 2 === 0 ? 0 : -12)}
                  textAnchor="middle"
                  fontSize={8.5}
                  fill="#94a3b8"
                >
                  Not reported
                </text>
              )}
              {(["nqas", "kayakalp"] as const).map((metric) => {
                const value = valueOf(point, metric);
                if (value == null) return null;
                const cx = x(i);
                const cy = y(value);
                const change = deltaAt(points, i, metric);
                const label = `${point.label}, ${METRICS[metric].label} ${value.toFixed(1)} percent, ${
                  change == null ? "no previous score" : `change ${changeText(change)}`
                }`;
                return (
                  <g
                    key={metric}
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    className="cursor-pointer outline-none focus-visible:opacity-70"
                    onMouseEnter={() => setTip({ point, metric, value, change, x: cx, y: cy })}
                    onFocus={() => setTip({ point, metric, value, change, x: cx, y: cy })}
                    onBlur={() => setTip(null)}
                    onClick={() => setTip({ point, metric, value, change, x: cx, y: cy })}
                  >
                    <circle cx={cx} cy={cy} r={11} fill="transparent" />
                    <g
                      fill={point.inProgress ? "#ffffff" : METRICS[metric].colour}
                      stroke={METRICS[metric].colour}
                      strokeWidth={1.8}
                      pointerEvents="none"
                    >
                      {markerPath(cx, cy, metric)}
                    </g>
                  </g>
                );
              })}
            </g>
          );
        })}

        {labels.map((label, i) => (
          <text
            key={i}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill={label.colour}
            stroke="#ffffff"
            strokeWidth={3}
            paintOrder="stroke"
            pointerEvents="none"
          >
            {label.text}
          </text>
        ))}

        {points.map((point, i) => (
          <text
            key={`${point.fy}-${point.q}-label`}
            x={x(i)}
            y={pad.top + plotH + 14}
            textAnchor="middle"
            fontSize={9}
            fill="#475569"
          >
            {splitLabels ? (
              <>
                <tspan x={x(i)} dy={0}>Q{point.q}</tspan>
                <tspan x={x(i)} dy={10}>{point.fy}</tspan>
              </>
            ) : (
              point.label
            )}
          </text>
        ))}

        {points.map((point, index) =>
          point.inProgress ? (
            <g key={`${point.fy}-${point.q}-in-progress`} pointerEvents="none">
              <rect
                x={clamp(x(index) - 32, pad.left, w - pad.right - 64)}
                y={2}
                width={64}
                height={14}
                rx={7}
                fill="#fef3c7"
                stroke="#f59e0b"
                strokeWidth={0.8}
              />
              <text
                x={clamp(x(index) - 32, pad.left, w - pad.right - 64) + 32}
                y={12}
                textAnchor="middle"
                fontSize={8.5}
                fontWeight={600}
                fill="#92400e"
              >
                In progress
              </text>
            </g>
          ) : null,
        )}
      </svg>

      {tip && (
        <div
          className="pointer-events-none absolute z-20 w-44 rounded-lg border border-border/70 bg-white p-2 text-[11px] shadow-lg"
          style={{
            left: clamp(tip.x - 88, 4, Math.max(4, w - 180)),
            top: clamp(tip.y - 64, 4, h - 56),
          }}
          role="status"
        >
          <p className="font-semibold text-slate-900">{tip.point.label}</p>
          <p className="mt-0.5 text-slate-600">
            {METRICS[tip.metric].label}:{" "}
            <b className="tabular-nums text-slate-900">{tip.value.toFixed(1)}</b>
          </p>
          <p className="text-slate-600">
            Change: <b className={changeTone(tip.change)}>{changeText(tip.change)}</b>
          </p>
        </div>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-[#0f766e]" aria-hidden /> NQAS IA (circle)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rotate-45 bg-[#b45309]" aria-hidden /> Kayakalp IA (diamond)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-full border-2 border-slate-500 bg-white" aria-hidden /> In progress
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-4 border-t border-dashed border-slate-400" aria-hidden /> Target
        </span>
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/* Table                                                                      */
/* -------------------------------------------------------------------------- */

function ChangeCell({ value }: { value: number | null }) {
  return (
    <td className={cn("px-1.5 py-1.5 text-right text-[10px] font-medium tabular-nums", changeTone(value))}>
      {changeText(value)}
    </td>
  );
}

const IaTable = memo(function IaTable({ points, today }: { points: Point[]; today: FyQuarter }) {
  const entries = points.map((point, index) => ({ point, index })).reverse();
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-white">
      <table className="w-full table-fixed border-collapse text-[10px]">
        <caption className="sr-only">Internal Assessment quarters, newest first</caption>
        <colgroup>
          <col className="w-[25%]" />
          <col className="w-[16%]" />
          <col className="w-[14%]" />
          <col className="w-[16%]" />
          <col className="w-[14%]" />
          <col className="w-[15%]" />
        </colgroup>
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-1.5 py-2 text-left text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Quarter
            </th>
            <th scope="col" className="px-1.5 py-2 text-right text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              NQAS IA
            </th>
            <th scope="col" className="px-1.5 py-2 text-right text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Change
            </th>
            <th scope="col" className="px-1.5 py-2 text-right text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Kayakalp IA
            </th>
            <th scope="col" className="px-1.5 py-2 text-right text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Change
            </th>
            <th scope="col" className="px-1.5 py-2 text-left text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ point, index }) => {
            const inProgress = point.fy === today.fy && point.q === today.q;
            return (
              <tr
                key={`${point.fy}-${point.q}`}
                tabIndex={0}
                className="border-t border-border/40 outline-none focus-visible:bg-slate-50"
                aria-label={`${point.label}: NQAS ${scoreText(point.nqas)}, Kayakalp ${scoreText(point.kayakalp)}, ${inProgress ? "In progress" : "Final"}`}
              >
                <th scope="row" className="px-1.5 py-1.5 text-left font-medium text-slate-800">
                  {point.label}
                </th>
                <td className="px-1.5 py-1.5 text-right tabular-nums text-slate-900">
                  {scoreText(point.nqas)}
                </td>
                <ChangeCell value={deltaAt(points, index, "nqas")} />
                <td className="px-1.5 py-1.5 text-right tabular-nums text-slate-900">
                  {scoreText(point.kayakalp)}
                </td>
                <ChangeCell value={deltaAt(points, index, "kayakalp")} />
                <td className="px-1.5 py-1.5">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                      inProgress ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {inProgress ? "In progress" : "Final"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/* Empty + skeleton                                                           */
/* -------------------------------------------------------------------------- */

function EmptyState({ canImport }: { canImport: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-slate-50/60 px-4 py-6 text-center">
      <p className="text-sm font-medium text-slate-700">No IA scores yet.</p>
      <p className="mt-1 text-xs text-muted-foreground">They come from the quarterly IA import.</p>
      {canImport && (
        <Button asChild size="sm" variant="outline" className="mt-3 h-8 text-xs">
          <Link to="/bulk-import">Go to Bulk Import</Link>
        </Button>
      )}
    </div>
  );
}

export function IaCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-label="Loading Internal Assessment" aria-busy="true">
      <div className="h-5 w-44 rounded bg-muted" />
      <div className="h-3 w-64 max-w-full rounded bg-muted" />
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="h-28 rounded-xl bg-muted/70" />
        <div className="h-28 rounded-xl bg-muted/70" />
      </div>
      <div className="h-52 rounded-xl bg-muted/60" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

export function IACard({
  rows,
  endPeriod,
  className,
  settings,
  userId,
  canImport = false,
}: {
  rows: IaWebRow[];
  /** Past-cycle window: the four quarters ending with the closing quarter. */
  endPeriod?: FyQuarter | null;
  className?: string;
  settings?: Record<string, unknown> | null;
  userId?: string | null;
  canImport?: boolean;
}) {
  const [wrapRef, width] = useContainerWidth(720);
  const [fullScale, setFullScale] = useState(false);
  const storageKey = `nqas.ia.range.${userId || "guest"}`;
  const [range, setRange] = useState<Range>(() => readRange(storageKey));
  const target = readIaTarget((settings ?? {}).iaTarget);
  const current = useMemo(() => currentIaQuarter(todayLocalIso()), []);

  useEffect(() => {
    setRange(readRange(storageKey));
  }, [storageKey]);

  const selectRange = (next: Range) => {
    setRange(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      /* private mode — the range still applies for this visit */
    }
  };

  const scored = useMemo(
    () =>
      rows
        .filter((row) => row.nqasIaScore != null || row.kayakalpIaScore != null)
        .sort((a, b) => a.fy.localeCompare(b.fy) || a.quarter - b.quarter),
    [rows],
  );

  const anchor: FyQuarter | null = useMemo(() => {
    if (endPeriod) return endPeriod;
    const latest = scored[scored.length - 1];
    if (!latest) return null;
    return {
      fy: latest.fy,
      q: Math.min(4, Math.max(1, latest.quarter)) as 1 | 2 | 3 | 4,
    };
  }, [endPeriod, scored]);

  const periods: FyQuarter[] = useMemo(() => {
    if (!anchor) return [];
    if (range === "fy") {
      return Array.from({ length: anchor.q }, (_, index) => ({
        fy: anchor.fy,
        q: (index + 1) as 1 | 2 | 3 | 4,
      }));
    }
    return lastQuarters(anchor.fy, anchor.q, range === "8" ? 8 : 4);
  }, [anchor, range]);

  const points: Point[] = useMemo(
    () =>
      periods.map((period) => {
        const row = rows.find((item) => item.fy === period.fy && item.quarter === period.q);
        return {
          fy: period.fy,
          q: period.q,
          label: formatFyQuarter(period.fy, period.q),
          nqas: finite(row?.nqasIaScore),
          kayakalp: finite(row?.kayakalpIaScore),
          nqasRemark: row?.nqasRemark ?? null,
          kayakalpRemark: row?.kayakalpRemark ?? null,
          updatedAt: row?.updatedAt ?? null,
          inProgress: period.fy === current.fy && period.q === current.q,
        };
      }),
    [periods, rows, current.fy, current.q],
  );

  const latestUpdated = useMemo(() => {
    const stamps = rows.map((row) => row.updatedAt ?? 0).filter((stamp) => stamp > 0);
    return stamps.length ? Math.max(...stamps) : null;
  }, [rows]);

  const wide = width >= 900;
  const hasScores = points.some((point) => point.nqas != null || point.kayakalp != null);

  return (
    <div ref={wrapRef} className={cn("min-w-0 space-y-3", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">Internal Assessment</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Quarterly NQAS IA and Kayakalp IA scores</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Last updated {stampDate(latestUpdated)} · Target {target.toFixed(1)}
          </p>
        </div>
        <div className="flex max-w-full flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 rounded-lg border border-border/60 p-0.5" role="group" aria-label="Internal Assessment range">
            {(
              [
                ["4", "Last 4 quarters"],
                ["8", "Last 8"],
                ["fy", "This financial year"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={range === value}
                onClick={() => selectRange(value)}
                className={cn(
                  "min-h-7 rounded-md px-2 text-[10px] font-medium transition-colors duration-150",
                  range === value ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="group relative inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Info className="size-3" aria-hidden />
            <button
              type="button"
              className="font-medium underline decoration-dotted underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              aria-label="How to read this"
            >
              How to read this
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute right-0 top-full z-30 mt-1 w-60 rounded-lg border border-border/70 bg-white p-2 text-left text-[11px] leading-relaxed text-slate-600 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              In progress = the quarter is still open. Same = change under 0.05. A dash means the quarter was not reported, never 0.
            </span>
          </span>
        </div>
      </header>

      {!hasScores ? (
        <EmptyState canImport={canImport} />
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <KpiTile metric="nqas" points={points} target={target} />
            <KpiTile metric="kayakalp" points={points} target={target} />
          </div>

          {wide ? (
            <div className="grid items-start gap-4 min-[900px]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              <IaChart
                points={points}
                target={target}
                fullScale={fullScale}
                onFullScaleChange={setFullScale}
              />
              <IaTable points={points} today={current} />
            </div>
          ) : (
            <>
              <IaChart
                points={points}
                target={target}
                fullScale={fullScale}
                onFullScaleChange={setFullScale}
              />
              <details className="group rounded-xl border border-border/60 bg-white">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  Show table
                  <ChevronDown className="size-3.5 transition-transform duration-150 group-open:rotate-180" aria-hidden />
                </summary>
                <div className="border-t border-border/50 p-2">
                  <IaTable points={points} today={current} />
                </div>
              </details>
            </>
          )}
        </>
      )}
    </div>
  );
}

