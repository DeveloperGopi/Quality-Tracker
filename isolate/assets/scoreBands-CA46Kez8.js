import { aw as lastQuarters, ar as IA_NO_CHANGE_BAND } from './AppShell-CP099uvN.js';

const IA_TARGET_DEFAULT = 70;
function readIaTarget(raw) {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return IA_TARGET_DEFAULT;
  return Math.max(0, Math.min(100, n));
}
const IA_CARD = {
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
  target: 70
};
const IA_SERIES = [
  { key: "nqas", label: "NQAS IA", hex: "#0f766e", hatch: false },
  { key: "kayakalp", label: "Kayakalp IA", hex: "#b45309", hatch: true }
];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function iaValueText(value, decimals = 2) {
  return value.toFixed(decimals);
}
function layoutIaCard(points, _change, opts = {}) {
  const width = opts.width ?? 174;
  const chartMm = clamp(opts.chartMm ?? IA_CARD.chartMm, IA_CARD.minChartMm, 60);
  const decimals = opts.decimals ?? 2;
  const inner = width - IA_CARD.pad * 2;
  const qCount = Math.max(1, points.length);
  const qW = Math.max(12, (inner - IA_CARD.labelW - IA_CARD.changeW) / qCount);
  const tableTop = IA_CARD.headerH;
  const chartTop = tableTop + IA_CARD.rowH * 3 + IA_CARD.tableGap;
  const chartOnlyTop = chartTop;
  const plotH = ChartPlotHeight(chartMm);
  const plotTop = chartTop + 1.6;
  const plotBottom = plotTop + plotH;
  const cxOf = (i) => IA_CARD.pad + IA_CARD.labelW + qW * i + qW / 2;
  const barW = Math.min(11, qW * IA_CARD.barShare);
  const quarters = points.map((point, i) => ({
    x0: IA_CARD.pad + IA_CARD.labelW + qW * i,
    x1: IA_CARD.pad + IA_CARD.labelW + qW * (i + 1),
    centre: cxOf(i),
    point
  }));
  const bars = [];
  const labels = [];
  const emptySlots = [];
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
      const h = clamp(value, 0, 100) / 100 * plotH;
      bars.push({
        series: series.key,
        value,
        x,
        w: barW,
        y: plotBottom - h,
        h,
        baseline: plotBottom
      });
    }
    const bothMissing = p.nqas == null && p.kayakalp == null;
    if (bothMissing) {
      emptySlots.push({
        x: centre,
        y: plotTop + plotH * 0.55,
        text: "Not reported",
        width: qW - 1.5
      });
      return;
    }
    if (p.nqas == null || p.kayakalp == null) {
      const missingKayakalp = p.kayakalp == null;
      const x = missingKayakalp ? kayakalpX : nqasX;
      emptySlots.push({ x: x + barW / 2, y: plotBottom - 1.2, text: "-", width: barW });
    }
  });
  const latestIndex = points.length - 1;
  const placed = [];
  const textW = (text, bold) => text.length * (bold ? 1.72 : 1.62);
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
      const candidates = [
        { y: bar.y - 1.5, kind: "above" },
        { y: bar.y - 4.4, kind: "stagger" },
        { y: bar.y + 3.4, kind: "inside" }
      ];
      let chosen = null;
      for (const cand of candidates) {
        if (cand.y - 2.1 < 0.8) continue;
        const box = {
          x0: clamp(cx - half, IA_CARD.pad, width - IA_CARD.pad) - 0.3,
          x1: clamp(cx + half, IA_CARD.pad, width - IA_CARD.pad) + 0.3,
          y0: cand.y - 2.1,
          y1: cand.y + 0.7
        };
        if (placed.some((b) => box.x0 < b.x1 && b.x0 < box.x1 && box.y0 < b.y1 && b.y0 < box.y1)) continue;
        placed.push(box);
        chosen = cand;
        break;
      }
      if (!chosen) continue;
      labels.push({
        text,
        x: clamp(cx, IA_CARD.pad + half, width - IA_CARD.pad - half),
        y: chosen.y,
        kind: chosen.kind,
        bold
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
    minChartMm: IA_CARD.minChartMm
  };
}
function ChartPlotHeight(chartMm) {
  return Math.max(18, chartMm - 12);
}
function iaChangeText(delta, decimals = 2) {
  if (delta == null || Number.isNaN(delta)) return "-";
  const mark = Math.abs(delta) < IA_NO_CHANGE_BAND ? "■" : delta > 0 ? "▲" : "▼";
  return `${mark} ${Math.abs(delta).toFixed(decimals)}`;
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n) => (Math.round(n * 100) / 100).toString();
function iaCardSvg(points, change, opts = {}) {
  const layout = layoutIaCard(points, change, opts);
  const { width, height } = layout;
  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}mm" height="${fmt(height)}mm" viewBox="0 0 ${fmt(width)} ${fmt(height)}" font-family="'Noto Sans','Segoe UI',sans-serif">`
  );
  parts.push(`<defs><pattern id="ia-hatch" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="1.6" fill="#fff7ed"/><line x1="0" y1="0" x2="0" y2="1.6" stroke="#b45309" stroke-width="0.55"/></pattern></defs>`);
  parts.push(`<rect x="0.1" y="0.1" width="${fmt(width - 0.2)}" height="${fmt(height - 0.2)}" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.25"/>`);
  parts.push(`<rect x="0" y="0" width="${fmt(width)}" height="4.6" fill="#0d6960"/>`);
  parts.push(
    `<text x="2.2" y="3.2" fill="#ffffff" font-size="7.5" font-weight="700">INTERNAL ASSESSMENT &amp; KAYAKALP — LAST FOUR QUARTERS</text>`
  );
  parts.push(`<rect x="0" y="4.6" width="${fmt(width)}" height="4.2" fill="#f1f5f9"/>`);
  parts.push(`<text x="${fmt(layout.labelX)}" y="7.4" font-size="7.5" font-weight="700" fill="#475569">Tracker</text>`);
  layout.quarters.forEach((q) => {
    parts.push(
      `<text x="${fmt(q.centre)}" y="7.4" font-size="7.5" font-weight="700" fill="#475569" text-anchor="middle">${esc(q.point.shortLabel)}</text>`
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
        `<text x="${fmt(q.x1 - 2)}" y="${fmt(rowY + 2.8)}" font-size="7.5" text-anchor="end" fill="${value == null ? "#94a3b8" : "#0f172a"}">${value == null ? "Not reported" : iaValueText(value, opts.decimals ?? 2)}</text>`
      );
    });
    const delta = series.key === "nqas" ? change.nqas : change.kayakalp;
    parts.push(
      `<text x="${fmt(layout.changeRight - 1.2)}" y="${fmt(rowY + 2.8)}" font-size="7.5" text-anchor="end" fill="${delta == null ? "#94a3b8" : "#0f172a"}">${esc(iaChangeText(delta, opts.decimals ?? 2))}</text>`
    );
  });
  const yOf = (v) => layout.plotBottom - v / 100 * (layout.plotBottom - layout.plotTop);
  [0, 50, 100].forEach((v) => {
    parts.push(`<line x1="${fmt(layout.labelX)}" y1="${fmt(yOf(v))}" x2="${fmt(width - 3.2)}" y2="${fmt(yOf(v))}" stroke="#e2e8f0" stroke-width="0.2"/>`);
    parts.push(`<text x="${fmt(layout.labelX - 1)}" y="${fmt(yOf(v) + 1)}" font-size="7.5" fill="#64748b" text-anchor="end">${v}</text>`);
  });
  parts.push(`<line x1="${fmt(layout.labelX)}" y1="${fmt(yOf(70))}" x2="${fmt(width - 3.2)}" y2="${fmt(yOf(70))}" stroke="#b45309" stroke-width="0.3" stroke-dasharray="1.4 1"/>`);
  parts.push(`<text x="${fmt(layout.labelX - 1)}" y="${fmt(yOf(70) - 1)}" font-size="7.5" font-weight="700" fill="#b45309" text-anchor="end">70</text>`);
  parts.push(`<text x="${fmt(layout.labelX)}" y="${fmt(layout.plotTop - 1.2)}" font-size="7.5" fill="#64748b">Score %</text>`);
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
      `<text x="${fmt(slot.x)}" y="${fmt(slot.y)}" font-size="7.5" fill="#94a3b8" text-anchor="middle">${esc(slot.text)}</text>`
    );
  });
  layout.labels.forEach((label) => {
    parts.push(
      `<text x="${fmt(label.x)}" y="${fmt(label.y)}" font-size="7.5" font-weight="${label.bold ? 700 : 400}" text-anchor="middle" fill="${label.kind === "inside" ? "#ffffff" : "#0f172a"}">${esc(label.text)}</text>`
    );
  });
  layout.quarters.forEach((q) => {
    parts.push(
      `<text x="${fmt(q.centre)}" y="${fmt(layout.plotBottom + 3.4)}" font-size="7.5" fill="#475569" text-anchor="middle">${esc(q.point.shortLabel)}</text>`
    );
  });
  const midY = layout.plotTop + (layout.plotBottom - layout.plotTop) / 2;
  parts.push(
    `<text x="${fmt(layout.changeRight - 1.2)}" y="${fmt(midY - 1)}" font-size="7.5" font-weight="700" text-anchor="end" fill="#0f766e">${esc(iaChangeText(change.nqas, opts.decimals ?? 2))}</text>`,
    `<text x="${fmt(layout.changeRight - 1.2)}" y="${fmt(midY + 3.2)}" font-size="7.5" text-anchor="end" fill="#b45309">${esc(iaChangeText(change.kayakalp, opts.decimals ?? 2))}</text>`
  );
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
function iaCardPointsFromRows(rows, opts = {}) {
  const value = (row, key) => {
    const v = key === "nqas" ? row.nqasIaScore : row.kayakalpIaScore;
    return v == null || Number.isNaN(v) ? null : v;
  };
  const scored = rows.filter((r) => value(r, "nqas") != null || value(r, "kayakalp") != null).sort((a, b) => a.fy.localeCompare(b.fy) || a.quarter - b.quarter);
  const empty = { points: [], change: { nqas: null, kayakalp: null } };
  if (!scored.length) return empty;
  const latest = scored[scored.length - 1];
  const anchor = opts.endPeriod ?? {
    fy: latest.fy,
    q: Math.min(4, Math.max(1, latest.quarter))
  };
  const find = (p, key) => {
    const row = rows.find((r) => r.fy === p.fy && r.quarter === p.q);
    return row ? value(row, key) : null;
  };
  let periods = lastQuarters(anchor.fy, anchor.q, 4);
  const anyData = (list) => list.some((p) => find(p, "nqas") != null || find(p, "kayakalp") != null);
  if (!anyData(periods)) {
    periods = lastQuarters(
      latest.fy,
      Math.min(4, Math.max(1, latest.quarter)),
      4
    );
  }
  const points = periods.map((p) => {
    const nqas = find(p, "nqas");
    const kayakalp = find(p, "kayakalp");
    return {
      fy: p.fy,
      q: p.q,
      label: `Q${p.q} ${p.fy}`,
      shortLabel: `Q${p.q} ${p.fy.slice(2)}`,
      nqas,
      kayakalp,
      reported: nqas != null || kayakalp != null
    };
  });
  const prev = points[points.length - 2] ?? null;
  const last = points[points.length - 1] ?? null;
  const diff = (a, b) => a == null || b == null ? null : Math.round((b - a) * 100) / 100;
  return {
    points,
    change: { nqas: diff(prev?.nqas, last?.nqas), kayakalp: diff(prev?.kayakalp, last?.kayakalp) }
  };
}
async function iaCardPng(points, change, opts = {}) {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  const svg = iaCardSvg(points, change, opts);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const widthMm = opts.width ?? 174;
  const layout = layoutIaCard(points, change, opts);
  const scale = 3;
  const w = Math.round(widthMm / 25.4 * 96 * scale);
  const h = Math.round(layout.height / 25.4 * 96 * scale);
  const img = new Image();
  img.decoding = "sync";
  await new Promise((resolve, reject) => {
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
    height: Math.round(layout.height * 3.78)
  };
}
function iaCardDataUri(points, change, opts = {}) {
  const svg = iaCardSvg(points, change, opts);
  const b64 = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(svg))) : Buffer.from(svg, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

const iaCard = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  IA_CARD,
  IA_SERIES,
  IA_TARGET_DEFAULT,
  iaCardDataUri,
  iaCardPng,
  iaCardPointsFromRows,
  iaCardSvg,
  iaChangeText,
  iaValueText,
  layoutIaCard,
  readIaTarget
}, Symbol.toStringTag, { value: 'Module' }));

const DEFAULT_SCORE_BANDS = {
  below: 70,
  satisfactory: 80,
  excellent: 90
};
const COLOURS = {
  red: "#dc2626",
  amber: "#d97706",
  teal: "#0f766e",
  green: "#15803d"
};
function readScoreBands(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const read = (key, fallback, min, max) => {
    const value = Number(source[key]);
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, Math.round(value * 10) / 10));
  };
  const below = read("below", DEFAULT_SCORE_BANDS.below, 0, 100);
  const satisfactory = Math.max(
    below,
    read("satisfactory", DEFAULT_SCORE_BANDS.satisfactory, 0, 100)
  );
  const excellent = Math.max(
    satisfactory,
    read("excellent", DEFAULT_SCORE_BANDS.excellent, 0, 100)
  );
  return { below, satisfactory, excellent };
}
function scoreBandFor(value, bands = DEFAULT_SCORE_BANDS) {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < bands.below) {
    return {
      id: "below",
      label: `Below ${formatCut(bands.below)}`,
      tone: "red",
      colour: COLOURS.red
    };
  }
  if (value < bands.satisfactory) {
    return {
      id: "satisfactory",
      label: `${formatCut(bands.below)}–${formatCut(bands.satisfactory - 0.01)}`,
      tone: "amber",
      colour: COLOURS.amber
    };
  }
  if (value < bands.excellent) {
    return {
      id: "good",
      label: `${formatCut(bands.satisfactory)}–${formatCut(bands.excellent - 0.01)}`,
      tone: "teal",
      colour: COLOURS.teal
    };
  }
  return {
    id: "excellent",
    label: `${formatCut(bands.excellent)} and above`,
    tone: "green",
    colour: COLOURS.green
  };
}
function formatCut(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
function scoreChangeText(delta) {
  if (delta == null || !Number.isFinite(delta)) return "-";
  if (Math.abs(delta) <= 0.05) return "No change";
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(2)}`;
}

export { DEFAULT_SCORE_BANDS as D, IA_TARGET_DEFAULT as I, readScoreBands as a, IA_CARD as b, IA_SERIES as c, scoreChangeText as d, iaCard as e, iaChangeText as i, layoutIaCard as l, readIaTarget as r, scoreBandFor as s };
