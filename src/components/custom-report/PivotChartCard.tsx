import { useMemo, useState } from "react";
import { BarChart3, PieChart, LineChart as LineIcon, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PivotResult } from "@/lib/pivot";

export type ChartKind = "bar" | "stacked" | "pie" | "line";

const PALETTE = [
  "oklch(0.62 0.15 165)",
  "oklch(0.78 0.14 85)",
  "oklch(0.58 0.14 250)",
  "oklch(0.72 0.16 60)",
  "oklch(0.6 0.2 25)",
  "oklch(0.58 0.14 300)",
  "oklch(0.62 0.13 220)",
  "oklch(0.62 0.03 260)",
];

export interface ChartData {
  title: string;
  /** Row-group label → value (first value spec), top-N order preserved. */
  labels: string[];
  values: number[];
  /** Optional per-label breakdown for the stacked chart. */
  stacked?: { key: string; values: number[] }[];
}

/** Derive chart data from a pivot result: top-N leaf rows by their first
 *  value (or Grand Total column when present). */
export function chartDataFrom(result: PivotResult, topN = 10): ChartData | null {
  const leaves = result.outRows.filter((r) => r.kind === "leaf");
  if (leaves.length < 2) return null;
  const labelIndex = 0;
  const pick = (r: (typeof leaves)[number]) => {
    const v = result.valueSpecs.length > 1 ? r.totals[0] : r.measures[0];
    return typeof v === "number" ? v : 0;
  };
  const sorted = [...leaves]
    .sort((a, b) => pick(b) - pick(a))
    .slice(0, topN);
  return {
    title: result.valueFields[0]
      ? result.valueFields[0]!.label
      : "Report",
    labels: sorted.map((r) => r.labels[labelIndex] ?? "(blank)"),
    values: sorted.map(pick),
  };
}

export function PivotChartCard({
  data,
  className,
  onExportHint,
}: {
  data: ChartData;
  className?: string;
  onExportHint?: string;
}) {
  const [kind, setKind] = useState<ChartKind>("bar");
  const w = 560;
  const h = 240;
  const max = useMemo(() => Math.max(...data.values, 1), [data.values]);
  const total = useMemo(
    () => data.values.reduce((a, b) => a + b, 0) || 1,
    [data.values],
  );

  const svg = useMemo(() => {
    if (kind === "pie" || kind === "bar" || kind === "line") {
      const n = data.labels.length;
      if (kind === "pie") {
        let angle = -Math.PI / 2;
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(cx, cy) - 8;
        const parts = data.values.map((v, i) => {
          const a1 = angle;
          const a2 = angle + (v / total) * Math.PI * 2;
          angle = a2;
          const large = a2 - a1 > Math.PI ? 1 : 0;
          const x1 = cx + r * Math.cos(a1);
          const y1 = cy + r * Math.sin(a1);
          const x2 = cx + r * Math.cos(a2);
          const y2 = cy + r * Math.sin(a2);
          const pct = Math.round((v / total) * 100);
          const mid = (a1 + a2) / 2;
          const lx = cx + r * 0.62 * Math.cos(mid);
          const ly = cy + r * 0.62 * Math.sin(mid);
          if (v <= 0) return null;
          return (
            <g key={i}>
              <path
                d={`M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`}
                fill={PALETTE[i % PALETTE.length]}
                opacity={0.9}
                strokeLinejoin="round"
              />
              {pct >= 6 && (
                <text
                  x={lx}
                  y={ly}
                  fontSize={10}
                  textAnchor="middle"
                  fill="#fff"
                  fontWeight={700}
                >
                  {pct}%
                </text>
              )}
            </g>
          );
        });
        return <g>{parts}</g>;
      }
      const padL = 46;
      const padB = 42;
      const innerW = w - padL - 8;
      const innerH = h - padB - 10;
      if (kind === "bar") {
        const gap = 6;
        const bw = Math.max(6, (innerW - gap * (n - 1)) / n);
        return (
          <g>
            {data.values.map((v, i) => {
              const bh = (v / max) * innerH;
              return (
                <g key={i}>
                  <rect
                    x={padL + i * (bw + gap)}
                    y={10 + innerH - bh}
                    width={bw}
                    height={Math.max(bh, 1)}
                    rx={3}
                    fill={PALETTE[i % PALETTE.length]}
                  >
                    <title>{`${data.labels[i]}: ${v.toLocaleString("en-IN")}`}</title>
                  </rect>
                  {bw > 26 && (
                    <text
                      x={padL + i * (bw + gap) + bw / 2}
                      y={6 + innerH - bh}
                      fontSize={9}
                      textAnchor="middle"
                      className="fill-current opacity-70"
                    >
                      {v.toLocaleString("en-IN")}
                    </text>
                  )}
                </g>
              );
            })}
            {data.values.map((_, i) => (
              <text
                key={`l-${i}`}
                x={padL + i * (bw + gap) + bw / 2}
                y={h - padB + 16}
                fontSize={9}
                textAnchor="end"
                className="fill-current opacity-70"
                transform={`rotate(-45 ${padL + i * (bw + gap) + bw / 2} ${h - padB + 16})`}
              >
                {data.labels[i].length > 12 ? data.labels[i].slice(0, 11) + "…" : data.labels[i]}
              </text>
            ))}
          </g>
        );
      }
      // line
      const step = innerW / Math.max(n - 1, 1);
      const pts = data.values.map((v, i) => [
        padL + i * step,
        10 + innerH - (v / max) * innerH,
      ]);
      return (
        <g>
          <polyline
            points={pts.map((p) => p.map((x) => x.toFixed(1)).join(",")).join(" ")}
            fill="none"
            stroke={PALETTE[0]}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {pts.map(([px, py], i) => (
            <g key={i}>
              <circle cx={px} cy={py} r={3.5} fill={PALETTE[0]}>
                <title>{`${data.labels[i]}: ${data.values[i].toLocaleString("en-IN")}`}</title>
              </circle>
              {i % Math.ceil(n / 10) === 0 && (
                <text
                  x={px}
                  y={h - padB + 14}
                  fontSize={9}
                  textAnchor="middle"
                  className="fill-current opacity-70"
                >
                  {data.labels[i].length > 10 ? data.labels[i].slice(0, 9) + "…" : data.labels[i]}
                </text>
              )}
            </g>
          ))}
        </g>
      );
    }
    // stacked
    const padL = 110;
    const innerW = w - padL - 8;
    const rowH = Math.min(26, (h - 12) / Math.max(data.labels.length, 1));
    const stacksRaw = data.stacked;
    if (!stacksRaw) return null;
    const seriesTotal = new Map<string, number>();
    for (const s of stacksRaw) {
      let sum = 0;
      for (const v of s.values) sum += v;
      seriesTotal.set(s.key, sum);
    }
    const totalsPerRow = data.values;
    const grand = Math.max(...totalsPerRow, 1);
    return (
      <g>
        {data.labels.map((label, i) => {
          const width = (totalsPerRow[i] / grand) * innerW;
          let x = padL;
          const y = 10 + i * rowH;
          return (
            <g key={i}>
              {stacksRaw.map((s, si) => {
                const share = seriesTotal.get(s.key)
                  ? (s.values[i] / (seriesTotal.get(s.key) || 1)) * width
                  : 0;
                const rect = share > 1 ? (
                  <rect
                    key={si}
                    x={x}
                    y={y + 4}
                    width={share}
                    height={rowH - 10}
                    rx={2}
                    fill={PALETTE[si % PALETTE.length]}
                  >
                    <title>{`${label} · ${s.key}: ${s.values[i].toLocaleString("en-IN")}`}</title>
                  </rect>
                ) : null;
                x += share;
                return rect;
              })}
              <text
                x={padL - 6}
                y={y + rowH / 2 + 3}
                fontSize={9.5}
                textAnchor="end"
                className="fill-current"
              >
                <tspan className="font-semibold">{label.slice(0, 16)}</tspan>
              </text>
            </g>
          );
        })}
      </g>
    );
  }, [kind, data, max, total, w, h]);

  const icons: Record<ChartKind, typeof BarChart3> = {
    bar: BarChart3,
    stacked: Layers,
    pie: PieChart,
    line: LineIcon,
  };

  return (
    <section
      className={cn("glass rounded-xl border border-border/60 p-4", className)}
      aria-label={`Quick chart — ${data.title}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <BarChart3 className="size-4 text-primary" />
        <p className="text-sm font-semibold">
          Quick chart — {data.title}
        </p>
        <div className="ml-auto flex gap-1 rounded-lg border border-border/60 bg-background/60 p-0.5">
          {(Object.keys(icons) as ChartKind[]).map((k) => {
            const Icon = icons[k];
            return (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                data-tip={`${k} chart`}
                onClick={() => setKind(k)}
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-md transition-colors",
                  kind === k ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <Icon className="size-3.5" />
              </button>
            );
          })}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full text-current"
        role="img"
        aria-label={`${kind} chart of ${data.labels.length} groups`}
      >
        {kind === "stacked" ? (
          data.stacked ? (
            svg
          ) : (
            <text x={w / 2} y={h / 2} textAnchor="middle" fontSize={11} className="fill-current opacity-60">
              Stacked chart needs one Rows field × one Columns field — switching to bar.
            </text>
          )
        ) : (
          svg
        )}
      </svg>
      {kind === "stacked" && !data.stacked && (
        <p className="text-center text-[11px] text-muted-foreground">
          Showing groups ranked by {data.title}.
        </p>
      )}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {(data.stacked ?? [])
          .filter(() => data.stacked)
          .map((s, i) => (
            <span key={s.key} className="flex items-center gap-1">
              <span
                className="size-2 rounded-full"
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              {s.key}
            </span>
          ))}
        {onExportHint && <span className="ml-auto">{onExportHint}</span>}
      </div>
    </section>
  );
}

/** Build the stacked breakdown (values per column combo) when exactly one
 *  column field exists — otherwise return undefined (plain bar). */
export function stackedDataFor(result: PivotResult, topN = 10): ChartData | null {
  if (result.colFields.length !== 1 || result.colCombos.length === 0) return null;
  const leaves = result.outRows.filter((r) => r.kind === "leaf");
  if (leaves.length < 2) return null;
  const pick = (r: (typeof leaves)[number]) =>
    typeof r.totals[0] === "number" ? (r.totals[0] as number) : 0;
  const sorted = [...leaves].sort((a, b) => pick(b) - pick(a)).slice(0, topN);
  const stacked = result.colCombos.slice(0, 6).map((combo) => ({
    key: combo.labels.map((l) => l ?? "(blank)").join(" / "),
    values: sorted.map((r) => {
      const flat = r.measures[0]; // first value of each combo, need per combos
      void flat;
      const offset = result.colCombos.indexOf(combo);
      const v = r.measures[offset * result.valueSpecs.length];
      return typeof v === "number" ? v : 0;
    }),
  }));
  return {
    title: result.valueFields[0]?.label ?? "Report",
    labels: sorted.map((r) => r.labels[0] ?? "(blank)"),
    values: sorted.map(pick),
    stacked,
  };
}
