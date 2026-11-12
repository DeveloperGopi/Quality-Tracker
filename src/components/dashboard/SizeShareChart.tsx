/**
 * SIZE & SHARE (Marimekko) (B3) — the last view, lazy-loaded with the heatmap.
 * Bar WIDTH = the group's facility count against the scope total; the height
 * splits into the bucket shares, so the chart shows at a glance that (e.g.)
 * HWC HSC is 70% of the district's facilities AND where its gap is.
 *
 * Hand-written SVG (no chart lib) with viewBox so it scales with the card via
 * container queries; direct labels for the widest groups, a legend, and hover
 * focus per bucket (click isolates nothing — the bar-table keeps that). The
 * same `buildBreakdown` rows feed this as every other view.
 */

import { useMemo, useState } from "react";
import {
  BUCKET_BY_KEY,
  BUCKET_ORDER,
  type Breakdown,
  type BreakdownBucket,
} from "@/lib/breakdown";

/** 1000×540 viewBox — drawn once, scaled by the card width. */
const W = 1000;
const H = 540;
const PAD = { top: 24, bottom: 64, left: 8 };

export default function SizeShareChart({
  breakdown: bd,
  mode,
}: {
  breakdown: Breakdown;
  mode: "count" | "share";
}) {
  const rows = useMemo(
    () =>
      [...bd.rows]
        .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
        .filter((r) => r.n > 0),
    [bd],
  );
  const [focus, setFocus] = useState<string | null>(null);

  const total = rows.reduce((a, r) => a + r.n, 0);
  const plotW = W - PAD.left * 2;
  const plotH = H - PAD.top - PAD.bottom;

  let x = PAD.left;
  const bands = rows.map((r) => {
    const w = (r.n / (total || 1)) * plotW;
    const band = { r, x, w };
    x += w;
    return band;
  });

  if (rows.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No facilities to chart.
      </p>
    );

  return (
    <figure className="w-full" data-testid="size-share-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Size and share chart: ${total} facilities across ${rows.length} groups; width is the group size, height splits into the status buckets`}
        className="h-auto w-full"
      >
        {bands.map(({ r, x: bx, w }) => {
          // Stack buckets top → bottom; bucket order = the legend's order.
          let y = PAD.top;
          const segs = BUCKET_ORDER.filter((k) => r.buckets[k] > 0).map((k) => {
            const h = (r.buckets[k] / r.n) * plotH;
            const seg = { k, y, h };
            y += h;
            return seg;
          });
          return (
            <g key={r.key}>
              {segs.map(({ k, y: sy, h: sh }) => {
                const b = BUCKET_BY_KEY[k];
                const active = focus === null || focus.startsWith(r.key);
                const label =
                  r.n / total >= 0.06 || (mode === "share" && sh > plotH * 0.14);
                return (
                  <>
                  <rect
                    key={k}
                    x={bx}
                    y={sy}
                    width={Math.max(1, w)}
                    height={Math.max(1, sh)}
                    fill={b.colour}
                    fillOpacity={active ? 1 : 0.35}
                    stroke="#fff"
                    strokeWidth={1}
                    tabIndex={0}
                    onFocus={() => setFocus(`${r.key}:${k}`)}
                    onBlur={() => setFocus(null)}
                    onMouseEnter={() => setFocus(`${r.key}:${k}`)}
                    onMouseLeave={() => setFocus(null)}
                    aria-label={`${r.label}, ${b.label}: ${r.buckets[k]} facilities (${Math.round((r.buckets[k] / r.n) * 100)}%)`}
                  >
                    <title>{`${r.label} — ${b.label}: ${r.buckets[k]} of ${r.n} (${Math.round((r.buckets[k] / r.n) * 100)}%)`}</title>
                  </rect>
                  {label && sh > plotH * 0.07 && (
                    <text
                      // Direct label — only where the band really fits it.
                      x={bx + w / 2}
                      y={sy + sh / 2 + 4}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fill="rgba(255,255,255,0.95)"
                      pointerEvents="none"
                    >
                      {r.buckets[k]}
                    </text>
                  )}
                  </>
                );
              })}
              <text
                x={bx + w / 2}
                y={H - PAD.bottom + 18}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
              >
                {r.label.length > 12 ? `${r.label.slice(0, 11)}…` : r.label}
              </text>
              <text
                x={bx + w / 2}
                y={H - PAD.bottom + 36}
                textAnchor="middle"
                fontSize={12}
                fill="currentColor"
                opacity={0.55}
              >
                {r.n}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
        {BUCKET_ORDER.filter((k) => bd.grand.buckets[k] > 0).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span
              className="size-3 rounded"
              style={{ background: BUCKET_BY_KEY[k].colour }}
              aria-hidden
            />
            {BUCKET_BY_KEY[k].label}
          </span>
        ))}
        <span>Bar width = facilities in the group · height = shares.</span>
      </figcaption>
    </figure>
  );
}
