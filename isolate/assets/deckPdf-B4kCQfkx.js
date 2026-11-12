import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { r as resolveDeckSurface, c as DECK_SECTIONS, s as scaleDeckFont, f as deckDensity, T as TONE_HEX, i as inkOnFill, g as TONE_INK_DARK, h as TONE_INK_LIGHT } from './DeckSlidePreview-BiCf6aLQ.js';
import { registerDeckFonts, missingGlyphs } from './pdfFonts-DsWGLT77.js';
import './vendor-motion-DgC1stbS.js';
import './icons-BxQpodNr.js';
import './index-CBV6wOh8.js';
import './vendor-charts--qXk384P.js';
import './org-DjtYn14q.js';
import './AppShell-CP099uvN.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';
import './today-D9v8Esj5.js';
import './fiscalYear-QbChygln.js';
import './buildingBuckets-CQds7ysI.js';

const PDF_W = 960;
const PDF_H = 540;
const M = 36;
const HEADER_TOP = 40;
const CONTENT_TOP = 108;
const FOOTER_Y = 516;
const CONTENT_BOTTOM = 492;
const WHITE = [255, 255, 255];
const hexRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16)
];
const ink = (ctx) => hexRgb(ctx.surface.ink);
const muted = (ctx) => hexRgb(ctx.surface.muted);
const accent = (ctx) => hexRgb(ctx.surface.accent);
function toneInk(ctx, tone) {
  if (ctx.surface.key === "contrast" || ctx.surface.key === "contrastDark") return ink(ctx);
  return hexRgb(ctx.surface.dark ? TONE_INK_DARK[tone] : TONE_INK_LIGHT[tone]);
}
function font(ctx, bold = false) {
  const { doc, fonts } = ctx;
  doc.setFont(fonts.family, bold ? "bold" : "normal");
}
function wrapText(ctx, text, width, size, maxLines = 99) {
  const { doc } = ctx;
  doc.setFontSize(size);
  const raw = String(text ?? "");
  const lines = doc.splitTextToSize(raw, Math.max(8, width));
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1] ?? "";
  while (last.length > 1 && doc.getTextWidth(`${last}…`) > width) {
    last = last.slice(0, -1);
  }
  kept[maxLines - 1] = `${last.replace(/\s+$/, "")}…`;
  return kept;
}
function drawText(ctx, text, x, yTop, opts = {}) {
  const { doc } = ctx;
  const size = scaleDeckFont(opts.size ?? 12, ctx.density, 6);
  const width = opts.width ?? PDF_W - x - M;
  const lines = wrapText(ctx, text, width, size, opts.maxLines ?? 99);
  font(ctx, opts.bold);
  doc.setFontSize(size);
  doc.setTextColor(...opts.color ?? ink(ctx));
  const lh = opts.lineHeight != null ? scaleDeckFont(opts.lineHeight, ctx.density, 6) : size * 1.22;
  const anchor = opts.align === "right" ? x + width : opts.align === "center" ? x + width / 2 : x;
  lines.forEach((line, i) => {
    doc.text(line, anchor, yTop + size + i * lh, {
      align: opts.align === "right" ? "right" : opts.align === "center" ? "center" : "left"
    });
  });
  return yTop + lines.length * lh;
}
function drawHatch(ctx, x, y, w, h, tone) {
  if (tone === "teal" || h < 4) return;
  const { doc } = ctx;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  const step = 7;
  const diagonal = tone === "amber" || tone === "blue" || tone === "grey";
  const cross = tone === "coral";
  if (diagonal || cross) {
    for (let i = -h; i < w; i += step) {
      const x1 = x + Math.max(0, i);
      const y1 = y + h - Math.max(0, -i);
      const x2 = x + Math.min(w, i + h);
      const y2 = y + Math.max(0, -i);
      if (x2 > x1) doc.line(x1, y1, x2, y2);
      if (cross) {
        const x3 = x + Math.max(0, i);
        const y3 = y + Math.min(h, i + h);
        const x4 = x + Math.min(w, i + h);
        const y4 = y + h - Math.max(0, -i + h);
        if (x4 > x3 && y3 < y4) doc.line(x3, y3, x4, y4);
      }
    }
  }
  if (tone === "grey") {
    for (let i = 5; i < w; i += 12) {
      doc.line(x + i, y, x + i, y + h);
    }
  }
}
function fillRect(ctx, x, y, w, h, tone, radius = 2) {
  const { doc } = ctx;
  doc.setFillColor(...hexRgb(TONE_HEX[tone]));
  if (radius > 0) doc.roundedRect(x, y, w, h, radius, radius, "F");
  else doc.rect(x, y, w, h, "F");
  drawHatch(ctx, x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1), tone);
}
function blockWeight(b) {
  switch (b.kind) {
    case "kpis":
      return 0.34 * Math.ceil(b.items.length / 3) + 0.12;
    case "bars":
      return 0.4 + 0.13 * Math.max(1, b.items.length);
    case "stacked":
      return 1.05;
    case "table":
      return 0.52 + 0.095 * (b.rows.length + (b.totalRow ? 1 : 0));
    case "heatmap":
      return 2.1;
    case "donut":
      return 1.55;
    case "cards":
      return 0.52 + 0.72 * b.items.length;
    case "facts":
      return 0.42 * Math.max(1, b.items.length) + 0.1;
    case "takeaways":
      return 1.35;
    case "defs":
      return 1.5;
    case "text":
      return 0.22 + 0.06 * Math.ceil(b.body.length / 92);
    case "bullets":
      return 0.3 + 0.16 * Math.max(1, b.items.length);
  }
}
function blockTitle(ctx, b, x, y, w) {
  const title = "title" in b && b.title ? b.title : null;
  if (!title) return 0;
  drawText(ctx, title, x, y, { size: 12.5, bold: true, width: w, maxLines: 1 });
  return 19;
}
function drawKpis(ctx, b, x, y, w, h) {
  const cols = Math.min(3, b.items.length);
  const rows = Math.ceil(b.items.length / cols);
  const gap = 8;
  const cw = (w - gap * (cols - 1)) / cols;
  const ch = (h - gap * (rows - 1)) / rows;
  b.items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx = x + col * (cw + gap);
    const by = y + row * (ch + gap);
    ctx.doc.setFillColor(...hexRgb(ctx.surface.panel));
    ctx.doc.setDrawColor(...hexRgb(ctx.surface.line));
    ctx.doc.setLineWidth(0.5);
    ctx.doc.roundedRect(bx, by, cw, ch, 5, 5, "FD");
    const tone = item.tone ?? "teal";
    ctx.doc.setFillColor(...hexRgb(TONE_HEX[tone]));
    ctx.doc.roundedRect(bx, by, 4, ch, 2, 2, "F");
    const valueSize = ch < 54 ? 20 : 26;
    drawText(ctx, item.value, bx + 12, by + 7, {
      size: valueSize,
      bold: true,
      color: toneInk(ctx, tone),
      width: cw - 18,
      maxLines: 1
    });
    let ly = by + 7 + valueSize * 1.2;
    ly = drawText(ctx, item.label, bx + 12, ly, {
      size: 12,
      bold: true,
      width: cw - 18,
      maxLines: 2
    });
    if (item.note)
      drawText(ctx, item.note, bx + 12, ly, {
        size: 12,
        color: muted(ctx),
        width: cw - 18,
        maxLines: 1
      });
  });
}
function drawBars(ctx, b, x, y, w, h) {
  const top = y + blockTitle(ctx, b, x, y, w);
  if (b.items.length === 0) {
    drawText(ctx, "No facilities in this group.", x, top, {
      size: 12,
      color: muted(ctx),
      width: w,
      maxLines: 1
    });
    return;
  }
  const noteH = b.note ? 30 : 0;
  const avail = h - (top - y) - noteH;
  const max = Math.max(1, b.max ?? Math.max(...b.items.map((i) => i.value), 1));
  const rowH = Math.min(30, avail / Math.max(1, b.items.length));
  const labelW = w * 0.34;
  const barX = x + labelW + 8;
  const valueW = 54;
  const trackW = w - labelW - valueW - 16;
  b.items.forEach((item, i) => {
    const ry = top + i * rowH;
    const cy = ry + rowH / 2;
    drawText(ctx, item.label, x, cy - 7, {
      size: 12,
      color: ink(ctx),
      width: labelW,
      maxLines: 1,
      align: "right"
    });
    ctx.doc.setFillColor("#EDF2F1");
    ctx.doc.roundedRect(barX, cy - 6, trackW, 12, 3, 3, "F");
    const bw = Math.max(item.value > 0 ? 4 : 0, item.value / max * trackW);
    if (bw > 0) fillRect(ctx, barX, cy - 6, bw, 12, item.tone ?? "teal", 3);
    drawText(ctx, item.display ?? String(item.value), barX + trackW + 8, cy - 7, {
      size: 12,
      bold: true,
      width: valueW,
      maxLines: 1
    });
  });
  if (b.note)
    drawText(ctx, b.note, x, y + h - noteH + 4, {
      size: 12,
      color: muted(ctx),
      width: w,
      maxLines: 2
    });
}
function drawStacked(ctx, b, x, y, w, h) {
  const top = y + blockTitle(ctx, b, x, y, w);
  const total = b.segments.reduce((a, s) => a + s.value, 0);
  const barH = 30;
  let sx = x;
  b.segments.forEach((s) => {
    const sw = total > 0 ? s.value / total * w : 0;
    if (sw > 0) {
      fillRect(ctx, sx, top, sw, barH, s.tone, 3);
      if (sw > 40)
        drawText(ctx, String(s.value), sx, top + 8, {
          size: 12,
          bold: true,
          color: hexRgb(inkOnFill(TONE_HEX[s.tone])),
          width: sw,
          maxLines: 1,
          align: "center"
        });
    }
    sx += sw;
  });
  let ly = top + barH + 10;
  b.segments.forEach((s) => {
    ctx.doc.setFillColor(...hexRgb(TONE_HEX[s.tone]));
    ctx.doc.rect(x, ly + 2, 10, 10, "F");
    drawHatch(ctx, x, ly + 2, 10, 10, s.tone);
    drawText(
      ctx,
      `${s.label} — ${s.value} of ${total} (${total > 0 ? Math.round(s.value / total * 100) : 0}%)`,
      x + 16,
      ly,
      { size: 12, width: w - 20, maxLines: 1 }
    );
    ly += 20;
  });
  if (b.note) drawText(ctx, b.note, x, Math.min(y + h - 24, ly + 2), { size: 12, color: muted(ctx), width: w, maxLines: 2 });
}
function drawTable(ctx, b, x, y, w, h) {
  const top = y + blockTitle(ctx, b, x, y, w);
  const noteH = b.note ? 26 : 0;
  const all = [...b.rows, ...b.totalRow ? [b.totalRow] : []];
  const rowCount = all.length;
  const ds = deckDensity(ctx.density);
  const headH = Math.max(15, Math.round(20 * ds.rowScale));
  const avail = h - (top - y) - noteH - headH;
  const rowH = Math.max(11, Math.min(Math.round(24 * ds.rowScale), avail / Math.max(1, rowCount)));
  const cols = b.head.length;
  const align = b.align ?? b.head.map((_, i) => i === 0 ? "left" : "right");
  const widths = colWidths(ctx, b.head, b.rows, b.totalRow, w, cols);
  ctx.doc.setFillColor(...hexRgb(ctx.surface.titleBar));
  ctx.doc.rect(x, top, w, headH, "F");
  let cx = x;
  b.head.forEach((hText, i) => {
    drawText(ctx, hText, cx + 6, top + 4, {
      size: 12,
      bold: true,
      color: hexRgb(ctx.surface.titleInk),
      width: widths[i] - 12,
      maxLines: 1,
      align: align[i] === "left" ? "left" : "right"
    });
    cx += widths[i];
  });
  all.forEach((row, ri) => {
    const ry = top + headH + ri * rowH;
    const isTotal = !!b.totalRow && ri === all.length - 1;
    if (isTotal) {
      ctx.doc.setFillColor(...hexRgb(ctx.surface.totalRow));
      ctx.doc.rect(x, ry, w, rowH, "F");
    } else if (ri % 2 === 1) {
      ctx.doc.setFillColor(...hexRgb(ctx.surface.rowAlt));
      ctx.doc.rect(x, ry, w, rowH, "F");
    }
    let rx = x;
    row.forEach((cell, ci) => {
      drawText(ctx, cell, rx + 6, ry + Math.max(1, (rowH - 12) / 2), {
        size: 12,
        bold: isTotal,
        width: widths[ci] - 12,
        maxLines: 1,
        align: align[ci] === "left" ? "left" : "right"
      });
      rx += widths[ci];
    });
    if (!isTotal) {
      ctx.doc.setDrawColor(...hexRgb(ctx.surface.line));
      ctx.doc.setLineWidth(0.4);
      ctx.doc.line(x, ry + rowH, x + w, ry + rowH);
    }
  });
  if (b.note)
    drawText(ctx, b.note, x, top + headH + rowCount * rowH + 4, {
      size: 12,
      color: muted(ctx),
      width: w,
      maxLines: 2
    });
}
function colWidths(ctx, head, rows, totalRow, w, cols) {
  if (cols <= 1) return [w];
  if (cols === 2) return [w * 0.66, w * 0.34];
  const first = w * (cols >= 4 ? 0.3 : 0.36);
  const numeric = [];
  for (let c = 1; c < cols; c++) {
    const longest = Math.max(
      ctx.doc.getTextWidth(head[c] ?? "") * 0.85,
      ...rows.map((r) => ctx.doc.getTextWidth(r[c] ?? "") * 0.85),
      ...totalRow ? [ctx.doc.getTextWidth(totalRow[c] ?? "") * 0.85] : [],
      28
    );
    numeric.push(longest);
  }
  const sum = numeric.reduce((a, b) => a + b, 0);
  if (sum < w - first) {
    const extra = (w - first - sum) / (cols - 1);
    return [first, ...numeric.map((n) => n + extra)];
  }
  return [first, ...numeric.map((n) => n / sum * (w - first))];
}
function drawHeatmap(ctx, b, x, y, w, h) {
  const top = y + blockTitle(ctx, b, x, y, w);
  const cols = b.monthLabels.length + 2;
  const rows = b.rows.length + 2;
  const cw = w / cols;
  const ds = deckDensity(ctx.density);
  const rh = Math.min(34 * ds.rowScale, (h - (top - y)) / rows);
  const contrast = ctx.surface.key === "contrast" || ctx.surface.key === "contrastDark";
  const shade = (n, surface) => {
    if (contrast) {
      if (n <= 0) return surface.panel;
      if (n < 2) return "#E6E6E6";
      if (n < 4) return "#B3B3B3";
      if (n < 7) return "#666666";
      return surface.key === "contrastDark" ? "#FFFFFF" : "#000000";
    }
    if (n <= 0) return surface.bg;
    if (n < 1) return "#F3F8F7";
    if (n < 2) return "#E3F1EF";
    if (n < 3) return "#C4E3DF";
    if (n < 5) return "#9BD0CA";
    if (n < 8) return "#4FA69B";
    return "#0F6B63";
  };
  ctx.doc.setFillColor(...hexRgb(ctx.surface.titleBar));
  ctx.doc.rect(x, top, w, rh, "F");
  const headInk = hexRgb(ctx.surface.titleInk);
  drawText(ctx, "Year", x + 4, top + rh / 2 - 6, { size: 12, bold: true, color: headInk, width: cw - 8, maxLines: 1 });
  b.monthLabels.forEach((m, i) => {
    drawText(ctx, m, x + (i + 1) * cw, top + rh / 2 - 6, {
      size: 12,
      bold: true,
      color: headInk,
      width: cw,
      maxLines: 1,
      align: "center"
    });
  });
  drawText(ctx, "Total", x + (cols - 1) * cw, top + rh / 2 - 6, {
    size: 12,
    bold: true,
    color: headInk,
    width: cw,
    maxLines: 1,
    align: "center"
  });
  const drawRow = (label, cells, total, ry, bold) => {
    drawText(ctx, label, x + 4, ry + rh / 2 - 6, { size: 12, bold, width: cw - 8, maxLines: 1 });
    cells.forEach((n, i) => {
      const cellFill = shade(n, ctx.surface);
      ctx.doc.setFillColor(...hexRgb(cellFill));
      ctx.doc.rect(x + (i + 1) * cw, ry, cw, rh, "F");
      drawText(ctx, n === 0 ? "-" : String(n), x + (i + 1) * cw, ry + rh / 2 - 6, {
        size: 12,
        bold: n >= 8,
        color: hexRgb(inkOnFill(cellFill)),
        width: cw,
        maxLines: 1,
        align: "center"
      });
    });
    drawText(ctx, String(total), x + (cols - 1) * cw, ry + rh / 2 - 6, {
      size: 12,
      bold,
      width: cw,
      maxLines: 1,
      align: "center"
    });
  };
  b.rows.forEach((row, i) => drawRow(row.label, row.cells, row.total, top + (i + 1) * rh, false));
  drawRow(b.totalLabel, b.totalCells, b.grandTotal, top + (b.rows.length + 1) * rh, true);
  const ly = top + (b.rows.length + 2) * rh + 8;
  drawText(ctx, "Fewer", x, ly, { size: 12, color: muted(ctx), width: 54, maxLines: 1 });
  const sw = 22;
  [0, 1, 2, 4, 7, 9].forEach((n, i) => {
    const cellFill = shade(n, ctx.surface);
    ctx.doc.setFillColor(...hexRgb(cellFill));
    ctx.doc.rect(x + 56 + i * sw, ly + 2, sw - 2, 12, "F");
    drawText(ctx, n === 0 ? "0" : String(n), x + 56 + i * sw, ly + 2, {
      size: 12,
      color: hexRgb(inkOnFill(cellFill)),
      width: sw - 2,
      maxLines: 1,
      align: "center"
    });
  });
  drawText(ctx, "More", x + 56 + 6 * sw + 6, ly, { size: 12, color: muted(ctx), width: 60, maxLines: 1 });
}
function drawDonut(ctx, b, x, y, w, h) {
  const top = y + blockTitle(ctx, b, x, y, w);
  const { doc } = ctx;
  const total = b.segments.reduce((a, s) => a + s.value, 0);
  const legendW = w * 0.44;
  const size = Math.min(w - legendW - 10, h - (top - y) - 8);
  const cx = x + size / 2 + 4;
  const cy = top + size / 2;
  const outer = size / 2;
  const inner = outer * 0.62;
  let angle = -Math.PI / 2;
  const live = b.segments.filter((s) => s.value > 0);
  for (const s of live) {
    const sweep = total > 0 ? s.value / total * Math.PI * 2 : 0;
    if (sweep <= 0) continue;
    const steps = Math.max(2, Math.ceil(sweep / 0.06));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = angle + sweep * i / steps;
      pts.push([cx + Math.cos(a) * outer, cy + Math.sin(a) * outer]);
    }
    for (let i = steps; i >= 0; i--) {
      const a = angle + sweep * i / steps;
      pts.push([cx + Math.cos(a) * inner, cy + Math.sin(a) * inner]);
    }
    doc.setFillColor(...hexRgb(TONE_HEX[s.tone]));
    const deltas = [];
    for (let i = 1; i < pts.length; i++) {
      deltas.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
    }
    doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], "F", true);
    angle += sweep;
  }
  drawText(ctx, b.centerValue, cx - outer, cy - 12, {
    size: 26,
    bold: true,
    width: outer * 2,
    maxLines: 1,
    align: "center"
  });
  drawText(ctx, b.centerLabel, cx - outer, cy + 16, {
    size: 12,
    color: muted(ctx),
    width: outer * 2,
    maxLines: 1,
    align: "center"
  });
  let ly = top + 4;
  for (const s of b.segments) {
    doc.setFillColor(...hexRgb(TONE_HEX[s.tone]));
    doc.rect(x + w - legendW, ly + 2, 10, 10, "F");
    drawHatch(ctx, x + w - legendW, ly + 2, 10, 10, s.tone);
    drawText(
      ctx,
      `${s.label}: ${s.value} (${total > 0 ? Math.round(s.value / total * 100) : 0}%)`,
      x + w - legendW + 16,
      ly - 1,
      { size: 12, width: legendW - 18, maxLines: 1 }
    );
    ly += 19;
  }
  if (b.caption)
    drawText(ctx, b.caption, x, y + h - 28, { size: 12, color: muted(ctx), width: w, maxLines: 2 });
}
function drawCards(ctx, b, x, y, w, h) {
  const ds = deckDensity(ctx.density);
  const gap = Math.round(8 * ds.gapScale);
  const ch = (h - gap * (b.items.length - 1)) / b.items.length;
  b.items.forEach((item, i) => {
    const by = y + i * (ch + gap);
    ctx.doc.setFillColor(...hexRgb(ctx.surface.panel));
    ctx.doc.setDrawColor(...hexRgb(ctx.surface.line));
    ctx.doc.setLineWidth(0.5);
    ctx.doc.roundedRect(x, by, w, ch, 6, 6, "FD");
    const tone = item.tone ?? "teal";
    ctx.doc.setFillColor(...hexRgb(TONE_HEX[tone]));
    ctx.doc.roundedRect(x, by, 4, ch, 2, 2, "F");
    drawText(ctx, item.title, x + 12, by + 7, { size: 12, bold: true, width: w - 24, maxLines: 1 });
    drawText(ctx, item.big, x + 12, by + 22, {
      size: 24,
      bold: true,
      color: toneInk(ctx, tone),
      width: w - 24,
      maxLines: 1
    });
    drawText(ctx, item.line, x + 12, by + 50, { size: 12, width: w - 24, maxLines: 2 });
    if (item.body)
      drawText(ctx, item.body, x + 12, by + 50 + 28, {
        size: 12,
        color: muted(ctx),
        width: w - 24,
        maxLines: 3
      });
  });
}
function drawFacts(ctx, b, x, y, w, h) {
  const ds = deckDensity(ctx.density);
  const gap = Math.round(8 * ds.gapScale);
  const fh = (h - gap * (b.items.length - 1)) / b.items.length;
  b.items.forEach((item, i) => {
    const by = y + i * (fh + gap);
    ctx.doc.setFillColor(...hexRgb(ctx.surface.panel));
    ctx.doc.setDrawColor(...hexRgb(ctx.surface.line));
    ctx.doc.setLineWidth(0.5);
    ctx.doc.roundedRect(x, by, w, fh, 6, 6, "FD");
    const tone = item.tone ?? "teal";
    ctx.doc.setFillColor(...hexRgb(TONE_HEX[tone]));
    ctx.doc.circle(x + 26, by + fh / 2, Math.min(18, fh / 2 - 4), "F");
    drawText(ctx, item.big, x + 8, by + fh / 2 - 11, {
      size: 16,
      bold: true,
      color: hexRgb(inkOnFill(TONE_HEX[tone])),
      width: 36,
      maxLines: 1,
      align: "center"
    });
    drawText(ctx, item.text, x + 50, by + 8, {
      size: 12,
      width: w - 60,
      maxLines: Math.max(1, Math.floor((fh - 12) / 15))
    });
  });
}
function drawTakeaways(ctx, b, x, y, w, h) {
  const ds = deckDensity(ctx.density);
  const gap = Math.round(10 * ds.gapScale);
  const cols = 2;
  const rows = Math.ceil(b.items.length / cols);
  const cw = (w - gap) / cols;
  const ch = (h - gap * (rows - 1)) / rows;
  b.items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx = x + col * (cw + gap);
    const by = y + row * (ch + gap);
    ctx.doc.setFillColor(...hexRgb(ctx.surface.panel));
    ctx.doc.setDrawColor(...hexRgb(ctx.surface.line));
    ctx.doc.setLineWidth(0.5);
    ctx.doc.roundedRect(bx, by, cw, ch, 6, 6, "FD");
    ctx.doc.setFillColor(...hexRgb(ctx.surface.accent));
    ctx.doc.circle(bx + 18, by + 18, 10, "F");
    drawText(ctx, String(item.n), bx + 8, by + 11, {
      size: 12,
      bold: true,
      color: hexRgb(inkOnFill(ctx.surface.accent)),
      width: 20,
      maxLines: 1,
      align: "center"
    });
    drawText(ctx, item.title, bx + 34, by + 8, {
      size: 14,
      bold: true,
      color: ink(ctx),
      width: cw - 44,
      maxLines: 1
    });
    drawText(ctx, item.body, bx + 12, by + 32, {
      size: 12,
      color: muted(ctx),
      width: cw - 24,
      maxLines: Math.max(1, Math.floor((ch - 40) / 15))
    });
  });
}
function drawDefs(ctx, b, x, y, w, h) {
  const gap = 8;
  const cols = 2;
  const rows = Math.ceil(b.items.length / cols);
  const cw = (w - gap) / cols;
  const ch = (h - gap * (rows - 1)) / rows;
  b.items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx = x + col * (cw + gap);
    const by = y + row * (ch + gap);
    ctx.doc.setFillColor(...hexRgb(ctx.surface.panel));
    ctx.doc.setDrawColor(...hexRgb(ctx.surface.line));
    ctx.doc.setLineWidth(0.5);
    ctx.doc.roundedRect(bx, by, cw, ch, 5, 5, "FD");
    drawText(ctx, item.term, bx + 10, by + 5, { size: 12, bold: true, width: cw - 20, maxLines: 1 });
    drawText(ctx, item.definition, bx + 10, by + 20, {
      size: 12,
      color: muted(ctx),
      width: cw - 20,
      maxLines: Math.max(1, Math.floor((ch - 24) / 15))
    });
  });
}
function drawBullets(ctx, b, x, y, w, h) {
  const top = y + blockTitle(ctx, b, x, y, w);
  let ly = top;
  const contrast = ctx.surface.key === "contrast" || ctx.surface.key === "contrastDark";
  const color = contrast ? ink(ctx) : b.tone === "coral" ? hexRgb(TONE_HEX.coral) : b.tone === "amber" ? hexRgb(TONE_HEX.amber) : muted(ctx);
  const maxPer = Math.max(1, b.items.length);
  const per = Math.min((h - (top - y)) / maxPer, 54);
  b.items.forEach((item, i) => {
    const by = ly + i * per;
    ctx.doc.setFillColor(...hexRgb(b.tone === "amber" ? TONE_HEX.amber : b.tone === "coral" ? TONE_HEX.coral : TONE_HEX.teal));
    ctx.doc.circle(x + 4, by + 7, 2.4, "F");
    drawText(ctx, item, x + 12, by, {
      size: 12,
      color,
      width: w - 14,
      maxLines: Math.max(1, Math.floor(per / 15))
    });
  });
}
function drawBlock(ctx, b, x, y, w, h) {
  switch (b.kind) {
    case "kpis":
      return drawKpis(ctx, b, x, y, w, h);
    case "bars":
      return drawBars(ctx, b, x, y, w, h);
    case "stacked":
      return drawStacked(ctx, b, x, y, w, h);
    case "table":
      return drawTable(ctx, b, x, y, w, h);
    case "heatmap":
      return drawHeatmap(ctx, b, x, y, w, h);
    case "donut":
      return drawDonut(ctx, b, x, y, w, h);
    case "cards":
      return drawCards(ctx, b, x, y, w, h);
    case "facts":
      return drawFacts(ctx, b, x, y, w, h);
    case "takeaways":
      return drawTakeaways(ctx, b, x, y, w, h);
    case "defs":
      return drawDefs(ctx, b, x, y, w, h);
    case "text":
      return drawText(ctx, b.body, x, y + 2, {
        size: 12,
        color: muted(ctx),
        width: w,
        maxLines: Math.max(1, Math.floor(h / 15))
      });
    case "bullets":
      return drawBullets(ctx, b, x, y, w, h);
  }
}
function drawHeader(ctx, slide) {
  const { doc } = ctx;
  let y = HEADER_TOP;
  if (slide.kicker) {
    drawText(ctx, slide.kicker, M, y, {
      size: 12,
      bold: true,
      color: accent(ctx),
      width: PDF_W - M * 2 - 160,
      maxLines: 1
    });
    y += 17;
  }
  const titleSize = slide.variant === "cover" ? 40 : 28;
  y = drawText(ctx, slide.title, M, y, {
    size: titleSize,
    bold: true,
    color: ink(ctx),
    width: slide.variant === "cover" ? PDF_W * 0.56 : PDF_W - M * 2 - 150,
    maxLines: slide.variant === "cover" ? 2 : 2,
    lineHeight: titleSize * 1.12
  });
  if (slide.subtitle) {
    drawText(ctx, slide.subtitle, M, y + 4, {
      size: 16,
      color: muted(ctx),
      width: slide.variant === "cover" ? PDF_W * 0.56 : PDF_W - M * 2 - 120,
      maxLines: 2
    });
  }
  if (slide.dataCheck && slide.dataCheck.issues > 0) {
    const text = `Data check: ${slide.dataCheck.issues} ${slide.dataCheck.issues === 1 ? "issue" : "issues"}`;
    const w = 150;
    doc.setFillColor(...hexRgb("#C34B32"));
    doc.roundedRect(PDF_W - M - w, HEADER_TOP, w, 24, 4, 4, "F");
    drawText(ctx, text, PDF_W - M - w, HEADER_TOP + 4, {
      size: 12,
      bold: true,
      color: WHITE,
      width: w,
      maxLines: 1,
      align: "center"
    });
  }
}
function drawHero(ctx, slide) {
  if (!slide.hero) return;
  const { doc } = ctx;
  const cx = PDF_W - 190;
  const cy = 230;
  doc.setFillColor(...hexRgb(ctx.surface.heroOuter));
  doc.circle(cx, cy, 108, "F");
  doc.setFillColor(...hexRgb(ctx.surface.heroInner));
  doc.circle(cx, cy, 88, "F");
  drawText(ctx, slide.hero.value, cx - 90, cy - 47, {
    size: 56,
    bold: true,
    color: hexRgb(ctx.surface.heroInk),
    width: 180,
    maxLines: 1,
    align: "center"
  });
  drawText(ctx, slide.hero.label, cx - 84, cy + 24, {
    size: 12,
    color: hexRgb(ctx.surface.heroInk),
    width: 168,
    maxLines: 4,
    align: "center"
  });
}
function drawFooter(ctx, model, page, total) {
  const { doc } = ctx;
  const color = muted(ctx);
  doc.setDrawColor(...hexRgb(ctx.surface.line));
  doc.setLineWidth(0.5);
  doc.line(M, FOOTER_Y - 10, PDF_W - M, FOOTER_Y - 10);
  const left = `${model.meta.orgName} · ${model.meta.deckTitle} · Data as of ${model.meta.dataAsOf}`;
  drawText(ctx, left, M, FOOTER_Y - 2, {
    size: 10,
    color,
    width: PDF_W - M * 2 - 92,
    maxLines: 1
  });
  drawText(ctx, `${page} / ${total}`, PDF_W - M - 80, FOOTER_Y - 2, {
    size: 10,
    color,
    width: 80,
    maxLines: 1,
    align: "right"
  });
}
function slideStrings(slide) {
  const out = [
    slide.kicker ?? "",
    slide.title,
    slide.subtitle ?? "",
    slide.note ?? "",
    slide.hero?.value ?? "",
    slide.hero?.label ?? ""
  ];
  for (const col of slide.columns) {
    for (const b of col) {
      switch (b.kind) {
        case "kpis":
          b.items.forEach((i) => out.push(i.value, i.label, i.note ?? ""));
          break;
        case "bars":
          out.push(b.title ?? "", b.note ?? "");
          b.items.forEach((i) => out.push(i.label, i.display ?? String(i.value)));
          break;
        case "stacked":
          out.push(b.title ?? "", b.note ?? "");
          b.segments.forEach((s) => out.push(s.label, String(s.value)));
          break;
        case "table":
          out.push(b.title ?? "", b.note ?? "", ...b.head);
          b.rows.forEach((r) => out.push(...r));
          if (b.totalRow) out.push(...b.totalRow);
          break;
        case "heatmap":
          out.push(b.title ?? "", b.totalLabel, ...b.monthLabels);
          b.rows.forEach((r) => out.push(r.label));
          break;
        case "donut":
          out.push(b.title ?? "", b.centerValue, b.centerLabel, b.caption ?? "");
          b.segments.forEach((s) => out.push(s.label, String(s.value)));
          break;
        case "cards":
          b.items.forEach((i) => out.push(i.title, i.big, i.line, i.body ?? ""));
          break;
        case "facts":
          b.items.forEach((i) => out.push(i.big, i.text));
          break;
        case "takeaways":
          b.items.forEach((i) => out.push(i.title, i.body, String(i.n)));
          break;
        case "defs":
          b.items.forEach((i) => out.push(i.term, i.definition));
          break;
        case "text":
          out.push(b.body);
          break;
        case "bullets":
          out.push(b.title ?? "", ...b.items);
          break;
      }
    }
  }
  return out;
}
function visibleSlides(model, hidden = []) {
  const hiddenSet = new Set(hidden);
  return model.slides.filter((s) => !hiddenSet.has(s.id));
}
async function buildDeckPdf(model, options = {}) {
  const { jsPDF: JsPDF } = await __vitePreload(async () => { const { jsPDF: JsPDF } = await import('./vendor-jspdf-BarNdCns.js').then(n => n.j);return { jsPDF: JsPDF }},true              ?[]:void 0);
  const doc = new JsPDF({
    orientation: "landscape",
    unit: "pt",
    format: [PDF_W, PDF_H],
    compress: true
  });
  const fonts = await registerDeckFonts(doc);
  const theme = options.theme ?? "light";
  const density = options.density ?? "comfortable";
  const ds = deckDensity(density);
  const slides = visibleSlides(model, options.hidden);
  if (fonts.embedded) {
    const missing = missingGlyphs(slides.flatMap(slideStrings), fonts.coverage);
    if (missing.length > 0) {
      throw new Error(
        `The PDF font is missing ${missing.length} glyph(s): ${missing.join(" ")}. Replace them with words or vector icons before exporting.`
      );
    }
  }
  const total = slides.length;
  for (let index = 0; index < slides.length; index++) {
    const slide = slides[index];
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (index > 0) doc.addPage([PDF_W, PDF_H], "landscape");
    const surface = resolveDeckSurface(theme, slide.variant);
    const ctx = { doc, fonts, surface, density };
    doc.setFillColor(...hexRgb(surface.bg));
    doc.rect(0, 0, PDF_W, PDF_H, "F");
    drawHeader(ctx, slide);
    drawHero(ctx, slide);
    const contentTop = slide.variant === "cover" ? 300 : CONTENT_TOP - (density === "compact" ? 8 : 0);
    const h = CONTENT_BOTTOM - contentTop;
    const cols = Math.max(1, slide.columns.length);
    const gap = Math.round(20 * ds.gapScale);
    const blockGap = Math.round(8 * ds.gapScale);
    const cw = (PDF_W - M * 2 - gap * (cols - 1)) / cols;
    slide.columns.forEach((blocks, ci) => {
      const x = M + ci * (cw + gap);
      const weights = blocks.map(blockWeight);
      const sum = weights.reduce((a, b) => a + b, 0) || 1;
      const scaled = weights.map(
        (wgt) => wgt / sum * (h - blockGap * (blocks.length - 1))
      );
      let by = contentTop;
      blocks.forEach((block, bi) => {
        drawBlock(ctx, block, x, by, cw, scaled[bi]);
        by += scaled[bi] + blockGap;
      });
    });
    if (slide.note) {
      drawText(ctx, slide.note, M, CONTENT_BOTTOM + 2, {
        size: 12,
        color: muted(ctx),
        width: PDF_W - M * 2,
        maxLines: 2
      });
    }
    options.onSlide?.(slide.id, index + 1);
  }
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const slide = slides[p - 1];
    const surface = resolveDeckSurface(theme, slide.variant);
    drawFooter({ doc, fonts, surface, density }, model, p, total);
  }
  doc.setProperties({
    title: `${model.meta.deckTitle} — ${model.meta.district}`,
    subject: `${model.meta.reportId} · ${model.meta.dataAsOf}`,
    author: model.meta.orgName,
    creator: "NQAS Tracker"
  });
  if (options.fileName !== "__return__") {
    const stamp = model.meta.dataAsOf.match(/^(\d{2})-(\w{3})-(\d{4})/);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dmy = stamp ? `${stamp[1]}-${String(months.indexOf(stamp[2]) + 1).padStart(2, "0")}-${stamp[3]}` : "";
    doc.save(
      options.fileName ?? `${model.meta.district} NQAS Summary Report${dmy ? ` ${dmy}` : ""}.pdf`
    );
  }
  return doc;
}
function deckSections(model) {
  return DECK_SECTIONS.map((section) => ({
    ...section,
    slides: model.slides.filter((s) => s.section === section.id)
  }));
}

export { PDF_H, PDF_W, buildDeckPdf, deckSections, slideStrings, visibleSlides, wrapText };
