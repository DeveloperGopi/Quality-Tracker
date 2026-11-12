/**
 * INTERNAL ASSESSMENT & KAYAKALP CARD — ONE layout for the screen and the PDF.
 *
 * WHY (root cause of Image 1): the sheet drew the table as three equal-ish
 * columns computed from `labelW`/`changeW`, then drew a LINE chart on its own
 * floating x axis (`chartX = margin + 14`, points spaced edge to edge). Nothing
 * shared geometry, so the Q1/Q2 table headers and the Q1/Q2 points sat ~20 mm
 * apart; labels were placed with a six-offset fallback that could fail and
 * print over the line/marker; the axis started at 40, so a shaded "below 70"
 * band covered 60% of the plot; markers were 3.8 mm (≈16 px) and a missing
 * quarter printed "NR" instead of saying so.
 *
 * This module is the single source of the card's geometry:
 *   • SIX columns — Tracker · Q-3 · Q-2 · Q-1 · Latest · Change;
 *   • grouped COLUMNS (NQAS solid, Kayakalp hatched) on a 0–100 axis;
 *   • labels with a deterministic collision rule (above → higher → inside);
 *   • "Not reported" slots, never a zero bar;
 *   • the Change mark, vertically centred on the chart row.
 *
 * The PDF (`facilitySheet.drawIaCard`), the Quick View / Profile
 * (`IACard`) and the SVG used in the Excel profile all read these numbers,
 * so bar i sits under header i by construction.
 */

import { IA_NO_CHANGE_BAND, lastQuarters, type FyQuarter } from "@/lib/iaImport";

export type IaCardPoint = {
  shortLabel: string;
  label?: string;
  nqas: number | null;
  kayakalp: number | null;
  reported: boolean;
};

export type IaCardChange = { nqas: number | null; kayakalp: number | null };

/** The default Internal Assessment target shown on every IA card. */
export const IA_TARGET_DEFAULT = 70;

/** Admin > Table & Display stores `iaTarget`; a bad value falls back to 70. */
export function readIaTarget(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return IA_TARGET_DEFAULT;
  return Math.max(0, Math.min(100, n));
}

export const IA_CARD = {
  /** Card padding inside the outer border. */
  pad: 2.2,
  /** Tracker column (labels) and Change column, in mm. */
  labelW: 32,
  changeW: 20,
  headerH: 4.2,
  rowH: 4.2,
  /** Space between the table and the plot. */
  tableGap: 2.4,
  /** Plot height at the default 40 mm card; shrinks with `chartMm`. */
  chartMm: 40,
  minChartMm: 36,
  /** Share of a quarter column taken by ONE bar. */
  barShare: 0.38,
  barGap: 1,
  /** Axis. */
  min: 0,
  max: 100,
  target: 70,
} as const;

export const IA_SERIES = [
  { key: "nqas" as const, label: "NQAS IA", hex: "#0f766e", hatch: false },
  { key: "kayakalp" as const, label: "Kayakalp IA", hex: "#b45309", hatch: true },
] as const;

export type IaLabelKind = "above" | "stagger" | "inside";

export type IaBarLayout = {
  series: "nqas" | "kayakalp";
  value: number | null;
  /** Left edge and width in mm, relative to the card's left border. */
  x: number;
  w: number;
  /** Bar top (0 = card top), and height from the baseline. */
  y: number;
  h: number;
  /** Baseline of the plot. */
  baseline: number;
};

export type IaLabelLayout = {
  text: string;
  /** Centre (SVG/PDF text anchor = middle). */
  x: number;
  y: number;
  kind: IaLabelKind;
  bold: boolean;
};

export type IaCardLayout = {
  width: number;
  height: number;
  /** Quarter column boxes (left/right/centre), relative to the card. */
  quarters: { x0: number; x1: number; centre: number; point: IaCardPoint }[];
  labelX: number;
  changeX: number;
  changeRight: number;
  tableTop: number;
  chartTop: number;
  chartOnlyTop: number;
  plotTop: number;
  plotBottom: number;
  bars: IaBarLayout[];
  labels: IaLabelLayout[];
  /** "Not reported" notes (whole quarter) and "-" slots (one series only). */
  emptySlots: { x: number; y: number; text: string; width: number }[];
  legendY: number;
  noteY: number;
  minChartMm: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Exact value text — no "%" (the axis caption says Score %). */
export function iaValueText(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/**
 * Lay the whole card out in millimetres relative to its own top-left corner.
 * `chartMm` is the height of the chart row, 36–55 mm (the fit ladder shrinks
 * it before it hides a card).
 */
export function layoutIaCard(
  points: IaCardPoint[],
  _change: IaCardChange,
  opts: { width?: number; chartMm?: number; decimals?: number } = {},
): IaCardLayout {
  const width = opts.width ?? 174;
  const chartMm = clamp(opts.chartMm ?? IA_CARD.chartMm, IA_CARD.minChartMm, 60);
  const decimals = opts.decimals ?? 2;
  const inner = width - IA_CARD.pad * 2;
  const qCount = Math.max(1, points.length);
  const qW = Math.max(12, (inner - IA_CARD.labelW - IA_CARD.changeW) / qCount);
  const tableTop = IA_CARD.headerH;
  const chartTop = tableTop + IA_CARD.rowH * 3 + IA_CARD.tableGap;
  const chartOnlyTop = chartTop;
  /* Chart row: 4 mm x labels + 4 mm legend + plot. */
  const plotH = ChartPlotHeight(chartMm);
  const plotTop = chartTop + 1.6;
  const plotBottom = plotTop + plotH;
  const cxOf = (i: number) => IA_CARD.pad + IA_CARD.labelW + qW * i + qW / 2;
  const barW = Math.min(11, qW * IA_CARD.barShare);
  const yOf = (v: number) =>
    plotBottom - (clamp(v, IA_CARD.min, IA_CARD.max) / IA_CARD.max) * plotH;

  const quarters = points.map((point, i) => ({
    x0: IA_CARD.pad + IA_CARD.labelW + qW * i,
    x1: IA_CARD.pad + IA_CARD.labelW + qW * (i + 1),
    centre: cxOf(i),
    point,
  }));

  const bars: IaBarLayout[] = [];
  const labels: IaLabelLayout[] = [];
  const emptySlots: IaCardLayout["emptySlots"] = [];

  points.forEach((p, i) => {
    const centre = cxOf(i);
    const nqasX = centre - IA_CARD.barGap / 2 - barW;
    const kayakalpX = centre + IA_CARD.barGap / 2;
    for (const series of IA_SERIES) {
      const value = series.key === "nqas" ? p.nqas : p.kayakalp;
      const x = series.key === "nqas" ? nqasX : kayakalpX;
      if (value == null) {
        bars.push({ series: series.key, value: null, x, w: barW, y: plotBottom, h: 0, baseline: plotBottom });
        continue;
      }
      const h = (clamp(value, 0, 100) / 100) * plotH;
      bars.push({
        series: series.key,
        value,
        x,
        w: barW,
        y: plotBottom - h,
        h,
        baseline: plotBottom,
      });
    }

    const bothMissing = p.nqas == null && p.kayakalp == null;
    if (bothMissing) {
      emptySlots.push({
        x: centre,
        y: plotTop + plotH * 0.55,
        text: "Not reported",
        width: qW - 1.5,
      });
      return;
    }
    if (p.nqas == null || p.kayakalp == null) {
      const missingKayakalp = p.kayakalp == null;
      const x = missingKayakalp ? kayakalpX : nqasX;
      emptySlots.push({ x: x + barW / 2, y: plotBottom - 1.2, text: "-", width: barW });
    }
  });

  /* Labels: above the taller bar; if the neighbour's label would sit within
     3.6 mm vertically, the SECOND one moves higher, then inside its own bar
     in white text. Deterministic, no random offsets. */
  const latestIndex = points.length - 1;
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const textW = (text: string, bold: boolean) => text.length * (bold ? 1.72 : 1.62);
  points.forEach((p, i) => {
    const seriesOrder = p.nqas != null ? IA_SERIES : [...IA_SERIES].reverse();
    for (const series of seriesOrder) {
      const value = series.key === "nqas" ? p.nqas : p.kayakalp;
      if (value == null) continue;
      const bar = bars.find((b) => b.series === series.key && b.x >= quarters[i].x0 && b.x < quarters[i].x1);
      if (!bar) continue;
      const bold = i === latestIndex;
      const text = iaValueText(value, decimals);
      const half = textW(text, bold) / 2;
      const cx = bar.x + bar.w / 2;
      const candidates: { y: number; kind: IaLabelKind }[] = [
        { y: bar.y - 1.5, kind: "above" },
        { y: bar.y - 4.4, kind: "stagger" },
        { y: bar.y + 3.4, kind: "inside" },
      ];
      let chosen: { y: number; kind: IaLabelKind } | null = null;
      for (const cand of candidates) {
        if (cand.y - 2.1 < 0.8) continue; // card edge
        const box = {
          x0: clamp(cx - half, IA_CARD.pad, width - IA_CARD.pad) - 0.3,
          x1: clamp(cx + half, IA_CARD.pad, width - IA_CARD.pad) + 0.3,
          y0: cand.y - 2.1,
          y1: cand.y + 0.7,
        };
        if (placed.some((b) => box.x0 < b.x1 && b.x0 < box.x1 && box.y0 < b.y1 && b.y0 < box.y1)) continue;
        placed.push(box);
        chosen = cand;
        break;
      }
      if (!chosen) continue; // never print a label over another: the table has the value
      labels.push({
        text,
        x: clamp(cx, IA_CARD.pad + half, width - IA_CARD.pad - half),
        y: chosen.y,
        kind: chosen.kind,
        bold,
      });
    }
  });

  const height = plotBottom + 4.2 + 4.2 + (points.some((p) => !p.reported) ? 3.2 : 1.2);
  return {
    width,
    height,
    quarters,
    labelX: IA_CARD.pad + 1.2,
    changeX: IA_CARD.pad + inner,
    changeRight: width - IA_CARD.pad,
    tableTop,
    chartTop,
    chartOnlyTop,
    plotTop,
    plotBottom,
    bars,
    labels,
    emptySlots,
    legendY: plotBottom + 4.2,
    noteY: plotBottom + 8.2,
    minChartMm: IA_CARD.minChartMm,
  };
}

/** Plot height inside the chart row: x labels + legend take 8.2 mm. */
function ChartPlotHeight(chartMm: number): number {
  return Math.max(18, chartMm - 12);
}

/** The change chip text shared with the table: "▲ 1.33", "▼ 0.50", "■ 0.00". */
export function iaChangeText(delta: number | null | undefined, decimals = 2): string {
  if (delta == null || Number.isNaN(delta)) return "-";
  const mark = Math.abs(delta) < IA_NO_CHANGE_BAND ? "■" : delta > 0 ? "▲" : "▼";
  return `${mark} ${Math.abs(delta).toFixed(decimals)}`;
}

/* --------------------------------------------------------------------------- */
/* SVG (screen + Excel image)                                                  */
/* --------------------------------------------------------------------------- */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

/**
 * Whole card as vector SVG, sized in millimetres. The Quick View, the Profile
 * and the Excel image all render this EXACT string, so the on-screen card can
 * never drift from the printed one.
 */
export function iaCardSvg(
  points: IaCardPoint[],
  change: IaCardChange,
  opts: { width?: number; chartMm?: number; decimals?: number } = {},
): string {
  const layout = layoutIaCard(points, change, opts);
  const { width, height } = layout;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}mm" height="${fmt(height)}mm" viewBox="0 0 ${fmt(width)} ${fmt(height)}" font-family="'Noto Sans','Segoe UI',sans-serif">`,
  );
  parts.push(`<defs><pattern id="ia-hatch" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="1.6" fill="#fff7ed"/><line x1="0" y1="0" x2="0" y2="1.6" stroke="#b45309" stroke-width="0.55"/></pattern></defs>`);
  parts.push(`<rect x="0.1" y="0.1" width="${fmt(width - 0.2)}" height="${fmt(height - 0.2)}" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.25"/>`);
  parts.push(`<rect x="0" y="0" width="${fmt(width)}" height="4.6" fill="#0d6960"/>`);
  parts.push(
    `<text x="2.2" y="3.2" fill="#ffffff" font-size="7.5" font-weight="700">INTERNAL ASSESSMENT &amp; KAYAKALP — LAST FOUR QUARTERS</text>`,
  );
  /* table */
  parts.push(`<rect x="0" y="4.6" width="${fmt(width)}" height="4.2" fill="#f1f5f9"/>`);
  parts.push(`<text x="${fmt(layout.labelX)}" y="7.4" font-size="7.5" font-weight="700" fill="#475569">Tracker</text>`);
  layout.quarters.forEach((q) => {
    parts.push(
      `<text x="${fmt(q.centre)}" y="7.4" font-size="7.5" font-weight="700" fill="#475569" text-anchor="middle">${esc(q.point.shortLabel)}</text>`,
    );
  });
  parts.push(`<text x="${fmt(layout.changeRight - 1.2)}" y="7.4" font-size="7.5" font-weight="700" fill="#475569" text-anchor="end">Change</text>`);
  IA_SERIES.forEach((series, si) => {
    const rowY = 8.8 + si * 4.2;
    if (si % 2 === 1) parts.push(`<rect x="0" y="${fmt(8.8 + 4.2)}" width="${fmt(width)}" height="4.2" fill="#f8fafc"/>`);
    parts.push(`<text x="${fmt(layout.labelX)}" y="${fmt(rowY + 2.8)}" font-size="7.5" font-weight="700" fill="#0f172a">${series.label}</text>`);
    layout.quarters.forEach((q) => {
      const value = series.key === "nqas" ? q.point.nqas : q.point.kayakalp;
      parts.push(
        `<text x="${fmt(q.x1 - 2)}" y="${fmt(rowY + 2.8)}" font-size="7.5" text-anchor="end" fill="${value == null ? "#94a3b8" : "#0f172a"}">${value == null ? "Not reported" : iaValueText(value, opts.decimals ?? 2)}</text>`,
      );
    });
    const delta = series.key === "nqas" ? change.nqas : change.kayakalp;
    parts.push(
      `<text x="${fmt(layout.changeRight - 1.2)}" y="${fmt(rowY + 2.8)}" font-size="7.5" text-anchor="end" fill="${delta == null ? "#94a3b8" : "#0f172a"}">${esc(iaChangeText(delta, opts.decimals ?? 2))}</text>`,
    );
  });
  /* axis + grid */
  const yOf = (v: number) => layout.plotBottom - (v / 100) * (layout.plotBottom - layout.plotTop);
  [0, 50, 100].forEach((v) => {
    parts.push(`<line x1="${fmt(layout.labelX)}" y1="${fmt(yOf(v))}" x2="${fmt(width - 3.2)}" y2="${fmt(yOf(v))}" stroke="#e2e8f0" stroke-width="0.2"/>`);
    parts.push(`<text x="${fmt(layout.labelX - 1)}" y="${fmt(yOf(v) + 1)}" font-size="7.5" fill="#64748b" text-anchor="end">${v}</text>`);
  });
  parts.push(`<line x1="${fmt(layout.labelX)}" y1="${fmt(yOf(70))}" x2="${fmt(width - 3.2)}" y2="${fmt(yOf(70))}" stroke="#b45309" stroke-width="0.3" stroke-dasharray="1.4 1"/>`);
  parts.push(`<text x="${fmt(layout.labelX - 1)}" y="${fmt(yOf(70) - 1)}" font-size="7.5" font-weight="700" fill="#b45309" text-anchor="end">70</text>`);
  parts.push(`<text x="${fmt(layout.labelX)}" y="${fmt(layout.plotTop - 1.2)}" font-size="7.5" fill="#64748b">Score %</text>`);

  /* bars */
  layout.bars.forEach((bar) => {
    if (bar.value == null || bar.h <= 0) return;
    if (bar.series === "kayakalp") {
      parts.push(`<rect x="${fmt(bar.x)}" y="${fmt(bar.y)}" width="${fmt(bar.w)}" height="${fmt(bar.h)}" fill="url(#ia-hatch)" stroke="#b45309" stroke-width="0.25"/>`);
    } else {
      parts.push(`<rect x="${fmt(bar.x)}" y="${fmt(bar.y)}" width="${fmt(bar.w)}" height="${fmt(bar.h)}" fill="#0f766e" stroke="#0f766e" stroke-width="0.2"/>`);
    }
  });
  layout.emptySlots.forEach((slot) => {
    parts.push(
      `<text x="${fmt(slot.x)}" y="${fmt(slot.y)}" font-size="7.5" fill="#94a3b8" text-anchor="middle">${esc(slot.text)}</text>`,
    );
  });
  layout.labels.forEach((label) => {
    parts.push(
      `<text x="${fmt(label.x)}" y="${fmt(label.y)}" font-size="7.5" font-weight="${label.bold ? 700 : 400}" text-anchor="middle" fill="${label.kind === "inside" ? "#ffffff" : "#0f172a"}">${esc(label.text)}</text>`,
    );
  });
  /* x labels, same columns as the headers */
  layout.quarters.forEach((q) => {
    parts.push(
      `<text x="${fmt(q.centre)}" y="${fmt(layout.plotBottom + 3.4)}" font-size="7.5" fill="#475569" text-anchor="middle">${esc(q.point.shortLabel)}</text>`,
    );
  });
  /* change marks in the chart row, vertically centred on the plot */
  const midY = layout.plotTop + (layout.plotBottom - layout.plotTop) / 2;
  parts.push(
    `<text x="${fmt(layout.changeRight - 1.2)}" y="${fmt(midY - 1)}" font-size="7.5" font-weight="700" text-anchor="end" fill="#0f766e">${esc(iaChangeText(change.nqas, opts.decimals ?? 2))}</text>`,
    `<text x="${fmt(layout.changeRight - 1.2)}" y="${fmt(midY + 3.2)}" font-size="7.5" text-anchor="end" fill="#b45309">${esc(iaChangeText(change.kayakalp, opts.decimals ?? 2))}</text>`,
  );
  /* legend */
  const ly = layout.legendY + 2;
  parts.push(`<rect x="${fmt(IA_CARD.pad)}" y="${fmt(ly - 2.2)}" width="3" height="3" fill="#0f766e"/>`);
  parts.push(`<text x="${fmt(IA_CARD.pad + 4.2)}" y="${fmt(ly)}" font-size="7.5" fill="#475569">NQAS IA</text>`);
  parts.push(`<rect x="${fmt(IA_CARD.pad + 22)}" y="${fmt(ly - 2.2)}" width="3" height="3" fill="url(#ia-hatch)" stroke="#b45309" stroke-width="0.2"/>`);
  parts.push(`<text x="${fmt(IA_CARD.pad + 26.2)}" y="${fmt(ly)}" font-size="7.5" fill="#475569">Kayakalp IA</text>`);
  parts.push(`<line x1="${fmt(IA_CARD.pad + 47)}" y1="${fmt(ly - 0.8)}" x2="${fmt(IA_CARD.pad + 54)}" y2="${fmt(ly - 0.8)}" stroke="#b45309" stroke-width="0.3" stroke-dasharray="1.4 1"/>`);
  parts.push(`<text x="${fmt(IA_CARD.pad + 55)}" y="${fmt(ly)}" font-size="7.5" fill="#475569">Target 70</text>`);
  const note = points.filter((p) => p.reported).length;
  if (note === 1) {
    parts.push(`<text x="${fmt(width - IA_CARD.pad)}" y="${fmt(layout.noteY)}" font-size="7.5" font-style="italic" fill="#64748b" text-anchor="end">Only 1 quarter reported</text>`);
  }
  parts.push("</svg>");
  return parts.join("");
}

/**
 * The card window from the stored quarterly rows (`facilityIaQuarters`): the
 * LAST FOUR quarters up to the anchor, a missing quarter stays null (never 0).
 * `endPeriod` pins a past cycle's window to the quarter it closed in. This is
 * the same rule as `facilitySheet.iaChartFor`, without importing jsPDF.
 */
export function iaCardPointsFromRows(
  rows: { fy: string; quarter: number; nqasIaScore?: number | null; kayakalpIaScore?: number | null }[],
  opts: { endPeriod?: FyQuarter | null } = {},
): { points: IaCardPoint[]; change: IaCardChange } {
  const value = (row: (typeof rows)[number], key: "nqas" | "kayakalp") => {
    const v = key === "nqas" ? row.nqasIaScore : row.kayakalpIaScore;
    return v == null || Number.isNaN(v) ? null : v;
  };
  const scored = rows
    .filter((r) => value(r, "nqas") != null || value(r, "kayakalp") != null)
    .sort((a, b) => a.fy.localeCompare(b.fy) || a.quarter - b.quarter);
  const empty = { points: [] as IaCardPoint[], change: { nqas: null, kayakalp: null } };
  if (!scored.length) return empty;
  const latest = scored[scored.length - 1];
  const anchor: FyQuarter = opts.endPeriod ?? {
    fy: latest.fy,
    q: Math.min(4, Math.max(1, latest.quarter)) as 1 | 2 | 3 | 4,
  };
  const find = (p: FyQuarter, key: "nqas" | "kayakalp") => {
    const row = rows.find((r) => r.fy === p.fy && r.quarter === p.q);
    return row ? value(row, key) : null;
  };
  let periods = lastQuarters(anchor.fy, anchor.q as 1 | 2 | 3 | 4, 4);
  const anyData = (list: FyQuarter[]) =>
    list.some((p) => find(p, "nqas") != null || find(p, "kayakalp") != null);
  if (!anyData(periods)) {
    periods = lastQuarters(
      latest.fy,
      Math.min(4, Math.max(1, latest.quarter)) as 1 | 2 | 3 | 4,
      4,
    );
  }
  const points: IaCardPoint[] = periods.map((p) => {
    const nqas = find(p, "nqas");
    const kayakalp = find(p, "kayakalp");
    return {
      fy: p.fy,
      q: p.q,
      label: `Q${p.q} ${p.fy}`,
      shortLabel: `Q${p.q} ${p.fy.slice(2)}`,
      nqas,
      kayakalp,
      reported: nqas != null || kayakalp != null,
    } as IaCardPoint;
  });
  const prev = points[points.length - 2] ?? null;
  const last = points[points.length - 1] ?? null;
  const diff = (a: number | null | undefined, b: number | null | undefined) =>
    a == null || b == null ? null : Math.round((b - a) * 100) / 100;
  return {
    points,
    change: { nqas: diff(prev?.nqas, last?.nqas), kayakalp: diff(prev?.kayakalp, last?.kayakalp) },
  };
}

/** PNG for Excel: the same SVG rasterised on a 2× canvas (browser only). */
export async function iaCardPng(
  points: IaCardPoint[],
  change: IaCardChange,
  opts: { width?: number; chartMm?: number; decimals?: number } = {},
): Promise<{ base64: string; width: number; height: number } | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  const svg = iaCardSvg(points, change, opts);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const widthMm = opts.width ?? 174;
  const layout = layoutIaCard(points, change, opts);
  const scale = 3; // ~288 dpi, crisp when the workbook is printed
  const w = Math.round((widthMm / 25.4) * 96 * scale);
  const h = Math.round((layout.height / 25.4) * 96 * scale);
  const img = new Image();
  img.decoding = "sync";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("ia-card-render"));
    img.src = svgUrl;
  }).catch(() => null);
  if (!img.width) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return {
    base64: canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, ""),
    width: Math.round(widthMm * 3.78),
    height: Math.round(layout.height * 3.78),
  };
}

/** `data:image/svg+xml;base64,…` — embeds directly in an <img> or Excel. */
export function iaCardDataUri(
  points: IaCardPoint[],
  change: IaCardChange,
  opts: { width?: number; chartMm?: number; decimals?: number } = {},
): string {
  const svg = iaCardSvg(points, change, opts);
  const b64 =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(svg)))
      : Buffer.from(svg, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}
