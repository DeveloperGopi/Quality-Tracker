/**
 * BLOCK × TYPE HEATMAP (B2) — lazy-loaded so the default "bars + table" view
 * keeps its budget. One cell per block × type combination of the SAME
 * facilities the bar-table shows:
 *   • "9/18" in the cell — the number is never carried by colour alone;
 *   • rate is a single-hue sequential colour scale with a 5-step legend;
 *   • n < 3 → diagonal hatch + a "small group" tooltip;
 *   • combinations with no facilities are "–" (rendered as nothing clickable);
 *   • row and column totals; sticky first column and header.
 */

import { useMemo } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { buildBlockTypeHeatmap, type BreakdownFacility } from "@/lib/breakdown";

/** The 5 sequential steps of the single-hue scale (L 0.93 → 0.5, teal). */
const SCALE = [
  "oklch(0.94 0.04 165)",
  "oklch(0.87 0.07 165)",
  "oklch(0.78 0.1 165)",
  "oklch(0.68 0.12 165)",
  "oklch(0.55 0.13 165)",
];

function scaleIndex(ratePct: number): number {
  if (ratePct < 12.5) return 0;
  if (ratePct < 37.5) return 1;
  if (ratePct < 62.5) return 2;
  if (ratePct < 87.5) return 3;
  return 4;
}

const HATCH = "repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 3px, transparent 3px, transparent 7px)";

export default function BreakdownHeatmap({
  facilities,
}: {
  facilities: readonly BreakdownFacility[];
}) {
  // The heatmap aggregates the SAME facilities the card received, so this is
  // a pure view of the caller's data (no own counts).
  const hm = useMemo(() => buildBlockTypeHeatmap(facilities), [facilities]);

  if (hm.cells.size === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No facilities to map (the heatmap needs the card's facility rows).
      </p>
    );

  return (
    <div className="text-sm" data-testid="breakdown-heatmap">
      {/* Legend — 5 steps, low → high; numbers always printed in cells. */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Certified %</span>
        <span>low</span>
        {SCALE.map((c) => (
          <span key={c} className="size-4 rounded" style={{ background: c }} aria-hidden />
        ))}
        <span>high</span>
        <Badge variant="outline" className="border-border text-muted-foreground">
          n &lt; 3 hatched
        </Badge>
      </div>
      <div className="grid max-h-[26rem] max-w-full space-y-px overflow-auto">
        <table className="w-full min-w-[36rem] border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 bg-background px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">
                Block
              </th>
              {hm.typeKeys.map((t) => (
                <th
                  key={t}
                  className="sticky top-0 z-10 bg-background px-1.5 py-1.5 text-center text-xs font-medium"
                  data-tip={t}
                >
                  <span className="line-clamp-1 max-w-24">{t}</span>
                </th>
              ))}
              <th className="sticky top-0 z-10 bg-background px-1.5 py-1.5 text-center text-xs font-medium text-muted-foreground">
                All
              </th>
            </tr>
          </thead>
          <tbody>
            {hm.blockKeys.map((b) => {
              const rt = hm.rowTotals.get(b);
              return (
                <tr key={b}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-background px-2 py-1.5 text-left text-xs font-semibold"
                  >
                    {b}
                  </th>
                  {hm.typeKeys.map((t) => {
                    const cell = hm.cells.get(`${b}\u0000${t}`);
                    if (!cell)
                      return (
                        <td
                          key={t}
                          className="px-1.5 py-1.5 text-center text-xs text-muted-foreground/50"
                          aria-label={`${b}, ${t}: no facilities`}
                        >
                          –
                        </td>
                      );
                    const idx = scaleIndex(cell.ratePct);
                    const tip = `${b}, ${t}: ${cell.holdCert} of ${cell.n} certified (${cell.ratePct}%)${cell.small ? " — small group (n<3)" : ""}`;
                    return (
                      <td
                        key={t}
                        className={"px-1.5 py-1.5"}
                        style={{
                          background: SCALE[idx],
                          backgroundImage: cell.small ? HATCH : undefined,
                          fontWeight: idx >= 3 ? 600 : 400,
                        }}
                      >
                        {/* Present cells are a real drill-down into the Master
                            List filtered by block AND type; empty combinations
                            render as “–” and stay inert. */}
                        <Link
                          to={`/facilities?block=${encodeURIComponent(b)}&type=${encodeURIComponent(t)}`}
                          className="block text-center hover:underline"
                          data-tip={tip}
                          aria-label={`${b}, ${t}: ${cell.holdCert} of ${cell.n} certified, open list`}
                        >
                          {cell.holdCert}/{cell.n}
                        </Link>
                      </td>
                    );
                  })}
                  <td className="px-1.5 py-1.5 text-center text-xs font-semibold tabular-nums">
                    {rt?.holdCert}/{rt?.n}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <th className="sticky left-0 z-10 bg-background px-2 py-1.5 text-left text-xs text-muted-foreground">
                All
              </th>
              {hm.typeKeys.map((t) => {
                const ct = hm.colTotals.get(t);
                return (
                  <td
                    key={t}
                    className="px-1.5 py-1.5 text-center text-xs font-semibold tabular-nums"
                  >
                    {ct?.holdCert}/{ct?.n}
                  </td>
                );
              })}
              <td className="px-1.5 py-1.5 text-center text-xs font-bold tabular-nums">
                {Math.round(hm.avgPct)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
