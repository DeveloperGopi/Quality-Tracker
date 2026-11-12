/**
 * IA TREND CHART — the screen twin of the facility sheet's vector chart.
 *
 * Same four fiscal quarters, same values, same gaps: a quarter with no score
 * is a break in the line and "Not reported", never 0. Circle = NQAS,
 * square = Kayakalp, so a greyscale print still reads both series.
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatFyQuarter, lastQuarters } from "@/lib/iaImport";
import { cn } from "@/lib/utils";

type Quarter = {
  fy: string;
  quarter: number;
  nqasIaScore?: number | null;
  kayakalpIaScore?: number | null;
};

export function IaTrendChart({
  facilityId,
  className,
}: {
  facilityId: string;
  className?: string;
}) {
  const quarters = useQuery(api.ia.listFacilityIaQuarters, {
    facilityId: facilityId as Id<"facilities">,
  });

  const chart = useMemo(() => {
    const rows = (quarters ?? []) as Quarter[];
    const scored = rows
      .filter((r) => r.nqasIaScore != null || r.kayakalpIaScore != null)
      .sort((a, b) => a.fy.localeCompare(b.fy) || a.quarter - b.quarter);
    if (scored.length === 0) return { points: [], note: "No internal assessment scores reported" };
    const latest = scored[scored.length - 1];
    const periods = lastQuarters(latest.fy, latest.quarter as 1 | 2 | 3 | 4, 4);
    const points = periods.map((p) => {
      const row = rows.find((r) => r.fy === p.fy && r.quarter === p.q);
      return {
        ...p,
        label: formatFyQuarter(p.fy, p.q),
        nqas: row?.nqasIaScore ?? null,
        kayakalp: row?.kayakalpIaScore ?? null,
      };
    });
    return { points, note: scored.length === 1 ? "Only 1 quarter reported" : "" };
  }, [quarters]);

  if (quarters === undefined) {
    return <div className={cn("h-32 animate-pulse rounded-lg bg-muted/40", className)} />;
  }
  if (chart.points.length === 0) {
    return (
      <p className={cn("rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground", className)}>
        No internal assessment scores reported
      </p>
    );
  }

  const W = 680;
  const H = 220;
  const pad = { l: 42, r: 16, t: 20, b: 34 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const values = chart.points.flatMap((p) => [p.nqas, p.kayakalp]).filter((v): v is number => v != null);
  const minV = values.length && Math.min(...values) < 40 ? 0 : 40;
  const xOf = (i: number) =>
    pad.l + (chart.points.length === 1 ? plotW / 2 : (plotW * i) / (chart.points.length - 1));
  const yOf = (v: number) => pad.t + plotH - ((v - minV) / (100 - minV)) * plotH;

  const pathFor = (key: "nqas" | "kayakalp") => {
    const parts: string[] = [];
    let open = false;
    chart.points.forEach((p, i) => {
      const v = p[key];
      if (v == null) {
        open = false;
        return;
      }
      parts.push(`${open ? "L" : "M"} ${xOf(i).toFixed(2)} ${yOf(v).toFixed(2)}`);
      open = true;
    });
    return parts.join(" ");
  };

  return (
    <div className={cn("rounded-lg border border-border/60 bg-background p-2", className)}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px]">
        <span className="font-semibold text-foreground">Internal Assessment trend</span>
        <span className="flex flex-wrap items-center gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <svg width="10" height="10" aria-hidden><circle cx="5" cy="5" r="3.5" fill="#0f766e" /></svg>
            NQAS IA
          </span>
          <span className="inline-flex items-center gap-1">
            <svg width="10" height="10" aria-hidden><rect x="1.5" y="1.5" width="7" height="7" fill="#b45309" /></svg>
            Kayakalp IA
          </span>
          <span>{minV === 40 ? "Axis 40–100" : "Axis 0–100"}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="NQAS and Kayakalp internal assessment by quarter" className="h-auto w-full">
        <rect x={pad.l} y={yOf(70)} width={plotW} height={Math.max(0, pad.t + plotH - yOf(70))} fill="#fef3c7" />
        {[minV, 70, 100].map((v) => (
          <line key={v} x1={pad.l} x2={pad.l + plotW} y1={yOf(v)} y2={yOf(v)} stroke={v === 70 ? "#b45309" : "#e2e8f0"} strokeWidth={v === 70 ? 1.2 : 1} />
        ))}
        <text x={pad.l - 6} y={yOf(70) + 4} textAnchor="end" fontSize="11" fill="#b45309" fontWeight="700">70</text>
        <text x={pad.l - 6} y={yOf(minV) + 4} textAnchor="end" fontSize="11" fill="#64748b">{minV}</text>
        <text x={pad.l - 6} y={yOf(100) + 4} textAnchor="end" fontSize="11" fill="#64748b">100</text>

        {(["nqas", "kayakalp"] as const).map((key) => (
          <path key={key} d={pathFor(key)} fill="none" stroke={key === "nqas" ? "#0f766e" : "#b45309"} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {chart.points.map((p, i) => (
          <g key={p.label}>
            <text x={xOf(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="#475569">{p.label}</text>
            {(["nqas", "kayakalp"] as const).map((key) => {
              const v = p[key];
              if (v == null) {
                return (
                  <text key={key} x={xOf(i)} y={pad.t + plotH - 3} textAnchor="middle" fontSize="10" fill="#94a3b8">
                    NR
                  </text>
                );
              }
              const latest = i === chart.points.length - 1;
              const cx = xOf(i);
              const cy = yOf(v);
              const colour = key === "nqas" ? "#0f766e" : "#b45309";
              return (
                <g key={key}>
                  {key === "nqas" ? (
                    <circle cx={cx} cy={cy} r={latest ? 5 : 3.6} fill={colour} />
                  ) : (
                    <rect x={cx - (latest ? 4.6 : 3.2)} y={cy - (latest ? 4.6 : 3.2)} width={latest ? 9.2 : 6.4} height={latest ? 9.2 : 6.4} fill={colour} />
                  )}
                  <text
                    x={cx}
                    y={key === "nqas" ? cy - 7 : cy + 14}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={latest ? 700 : 500}
                    fill={colour}
                  >
                    {v.toFixed(1)}%
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      {chart.note && <p className="px-1 text-[11px] text-muted-foreground">{chart.note}</p>}
    </div>
  );
}
