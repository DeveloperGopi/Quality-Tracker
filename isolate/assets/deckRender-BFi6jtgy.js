const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-pptx-C_OmB9K3.js","assets/vendor-jspdf-BarNdCns.js","assets/icons-BxQpodNr.js","assets/vendor-exceljs-CqnmHTS6.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { T as TONE_HEX, r as resolveDeckSurface, s as scaleDeckFont, b as buildDeckModel, i as inkOnFill, f as deckDensity, g as TONE_INK_DARK, h as TONE_INK_LIGHT } from './DeckSlidePreview-BiCf6aLQ.js';
export { A as ADMIN_ONLY_HIDE, c as DECK_SECTIONS, D as DEFAULT_SLIDE_ORDER, R as REFERENCED_SLIDES, S as SLIDE_TITLES } from './DeckSlidePreview-BiCf6aLQ.js';
import { buildDeckPdf as buildDeckPdf$1, visibleSlides } from './deckPdf-B4kCQfkx.js';
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
import './pdfFonts-DsWGLT77.js';

const TEAL = TONE_HEX.teal;
const TEAL_DARK = "#0B4F4A";
const INK = "#12302E";
const SLATE = "#5B7472";
const MIST = "#E9F1F0";
const ORANGE = "#C98212";
const W = 13.333;
const M = 0.45;
const CONTENT_TOP = 1.55;
const CONTENT_BOTTOM = 6.86;
const FOOT_Y = 6.98;
const FOOTER_SIZE = 9;
const stamp = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const hex6 = (color) => color.replace("#", "");
function addFooter(pptx, s, model, page, total, surface) {
  s.addShape(pptx.ShapeType.line, {
    x: M,
    y: FOOT_Y - 0.12,
    w: W - M * 2,
    h: 0,
    line: { color: hex6(surface.line), width: 0.75 }
  });
  s.addText(
    `${model.meta.orgName} · ${model.meta.deckTitle} · Data as of ${model.meta.dataAsOf}`,
    {
      x: M,
      y: FOOT_Y,
      w: W - M * 2 - 1,
      h: 0.24,
      fontSize: FOOTER_SIZE,
      color: hex6(surface.muted),
      valign: "middle"
    }
  );
  s.addText(`${page} / ${total}`, {
    x: W - M - 0.85,
    y: FOOT_Y,
    w: 0.85,
    h: 0.24,
    fontSize: FOOTER_SIZE,
    color: hex6(surface.muted),
    align: "right",
    valign: "middle"
  });
}
function addHeader(pptx, s, slide, surface, density) {
  const fs = (n) => scaleDeckFont(n, density, 7);
  let y = 0.3;
  if (slide.kicker) {
    s.addText(slide.kicker, {
      x: M,
      y,
      w: W - M * 2 - 2.4,
      h: 0.22,
      fontSize: fs(9.5),
      bold: true,
      charSpacing: 1.2,
      color: hex6(surface.accent)
    });
    y += 0.22;
  }
  const titleSize = slide.variant === "cover" ? 40 : 28;
  s.addText(slide.title, {
    x: M,
    y,
    w: slide.variant === "cover" ? W * 0.56 : W - M * 2 - 2.2,
    h: slide.variant === "cover" ? 1.5 : 0.82,
    fontSize: fs(titleSize),
    bold: true,
    color: hex6(surface.ink),
    valign: "top",
    lineSpacingMultiple: 0.95
  });
  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: M,
      y: y + (slide.variant === "cover" ? 1.5 : 0.82),
      w: slide.variant === "cover" ? W * 0.56 : W - M * 2 - 1.6,
      h: slide.variant === "cover" ? 0.65 : 0.4,
      fontSize: fs(slide.variant === "cover" ? 16 : 14),
      color: hex6(surface.muted),
      valign: "top"
    });
  }
  if (slide.dataCheck && slide.dataCheck.issues > 0) {
    const label = `Data check: ${slide.dataCheck.issues} ${slide.dataCheck.issues === 1 ? "issue" : "issues"}`;
    s.addShape(pptx.ShapeType.roundRect, {
      x: W - M - 2.1,
      y: 0.28,
      w: 2.1,
      h: 0.34,
      fill: { color: "C34B32" },
      line: { type: "none" },
      rectRadius: 0.05
    });
    s.addText(label, {
      x: W - M - 2.1,
      y: 0.28,
      w: 2.1,
      h: 0.34,
      fontSize: fs(9.5),
      bold: true,
      color: "FFFFFF",
      align: "center",
      valign: "middle"
    });
  }
}
function addHero(pptx, s, slide, surface, density) {
  if (!slide.hero) return;
  const cx = W - 2.55;
  const cy = 3.05;
  s.addShape(pptx.ShapeType.ellipse, {
    x: cx - 1.45,
    y: cy - 1.45,
    w: 2.9,
    h: 2.9,
    fill: { color: hex6(surface.heroOuter) },
    line: { type: "none" }
  });
  s.addShape(pptx.ShapeType.ellipse, {
    x: cx - 1.18,
    y: cy - 1.18,
    w: 2.36,
    h: 2.36,
    fill: { color: hex6(surface.heroInner) },
    line: { type: "none" }
  });
  s.addText(slide.hero.value, {
    x: cx - 1.18,
    y: cy - 1,
    w: 2.36,
    h: 1.2,
    fontSize: scaleDeckFont(54, density, 36),
    bold: true,
    color: hex6(surface.heroInk),
    align: "center",
    valign: "middle"
  });
  s.addText(slide.hero.label, {
    x: cx - 1.05,
    y: cy + 0.16,
    w: 2.1,
    h: 0.8,
    fontSize: scaleDeckFont(10, density, 8),
    color: hex6(surface.heroInk),
    align: "center",
    valign: "top"
  });
}
function blockWeight(b) {
  switch (b.kind) {
    case "kpis":
      return 0.34 * Math.ceil(b.items.length / 3) + 0.12;
    case "bars":
      return 0.45 + 0.13 * Math.max(1, b.items.length);
    case "stacked":
      return 1.1;
    case "table":
      return 0.55 + 0.1 * (b.rows.length + (b.totalRow ? 1 : 0));
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
function addBlock(pptx, s, b, x, y, w, h, surface, density) {
  const ds = deckDensity(density);
  const fs = (n) => scaleDeckFont(n, density, 6);
  const gap = (n) => Math.max(0.01, Math.round(n * ds.gapScale * 100) / 100);
  const pad = (n) => Math.max(0.01, Math.round(n * ds.padScale * 100) / 100);
  const highContrast = surface.key === "contrast" || surface.key === "contrastDark";
  const toneInk = (t) => highContrast ? hex6(surface.ink) : hex6(surface.dark ? TONE_INK_DARK[t ?? "teal"] : TONE_INK_LIGHT[t ?? "teal"]);
  const C = {
    bg: hex6(surface.bg),
    panel: hex6(surface.panel),
    ink: hex6(surface.ink),
    muted: hex6(surface.muted),
    line: hex6(surface.line),
    accent: hex6(surface.accent),
    titleBar: hex6(surface.titleBar),
    titleInk: hex6(surface.titleInk),
    rowAlt: hex6(surface.rowAlt),
    totalRow: hex6(surface.totalRow)
  };
  const title = "title" in b && b.title ? b.title : null;
  let bodyY = y;
  if (title) {
    s.addText(title, {
      x,
      y,
      w,
      h: 0.26,
      fontSize: fs(10.5),
      bold: true,
      color: C.ink
    });
    bodyY = y + Math.round(0.3 * ds.gapScale * 100) / 100;
  }
  const bh = h - (bodyY - y);
  switch (b.kind) {
    case "kpis": {
      const cols = Math.min(3, b.items.length);
      const rows = Math.ceil(b.items.length / cols);
      const kpGap = gap(0.12);
      const cw = (w - kpGap * (cols - 1)) / cols;
      const ch = (bh - kpGap * (rows - 1)) / rows;
      b.items.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const bx = x + col * (cw + kpGap);
        const by = bodyY + row * (ch + kpGap);
        const tone = item.tone ?? "teal";
        s.addShape(pptx.ShapeType.roundRect, {
          x: bx,
          y: by,
          w: cw,
          h: ch,
          fill: { color: C.panel },
          line: { color: C.line, width: 0.5 },
          rectRadius: 0.06
        });
        s.addShape(pptx.ShapeType.rect, {
          x: bx,
          y: by,
          w: 0.05,
          h: ch,
          fill: { color: TONE_HEX[tone].replace("#", "") },
          line: { type: "none" }
        });
        s.addText(item.value, {
          x: bx + pad(0.12),
          y: by + pad(0.05),
          w: cw - pad(0.18),
          h: 0.46,
          fontSize: fs(ch < 0.8 ? 18 : 23),
          bold: true,
          color: toneInk(tone)
        });
        s.addText(item.label, {
          x: bx + pad(0.12),
          y: by + pad(0.5),
          w: cw - pad(0.18),
          h: 0.3,
          fontSize: fs(9.5),
          bold: true,
          color: C.ink
        });
        if (item.note)
          s.addText(item.note, {
            x: bx + pad(0.12),
            y: by + pad(0.78),
            w: cw - pad(0.18),
            h: 0.24,
            fontSize: fs(8.5),
            color: C.muted
          });
      });
      break;
    }
    case "bars": {
      const noteH = b.note ? gap(0.42) : 0;
      if (b.items.length === 0) {
        s.addText("No facilities in this group.", {
          x,
          y: bodyY,
          w,
          h: 0.3,
          fontSize: fs(9),
          color: C.muted,
          italic: true
        });
        break;
      }
      s.addChart(
        pptx.ChartType.bar,
        [
          {
            name: title ?? "Count",
            labels: b.items.map((i) => i.label),
            values: b.items.map((i) => i.value)
          }
        ],
        {
          x,
          y: bodyY,
          w,
          h: Math.max(1.2, bh - noteH),
          barDir: "bar",
          barGapWidthPct: 45,
          chartColors: b.items.map((i) => TONE_HEX[i.tone ?? "teal"].replace("#", "")),
          showLegend: false,
          showValue: true,
          dataLabelFontSize: fs(8.5),
          dataLabelColor: C.ink,
          catAxisLabelFontSize: fs(8.5),
          catAxisLabelColor: C.muted,
          valAxisHidden: true,
          valGridLine: { style: "none" },
          catAxisLineShow: false,
          altText: `${title ?? "Bar chart"}: ${b.items.map((i) => `${i.label} ${i.value}`).join(", ")}`
        }
      );
      if (b.note)
        s.addText(b.note, {
          x,
          y: bodyY + bh - noteH,
          w,
          h: noteH,
          fontSize: fs(8.5),
          color: C.muted,
          italic: true
        });
      break;
    }
    case "stacked": {
      const total = b.segments.reduce((a, seg) => a + seg.value, 0);
      if (total > 0) {
        s.addChart(
          pptx.ChartType.bar,
          b.segments.map((seg) => ({
            name: seg.label,
            labels: ["All facilities"],
            values: [seg.value]
          })),
          {
            x,
            y: bodyY,
            w,
            h: Math.max(1.6, bh * 0.55),
            barDir: "bar",
            barGrouping: "stacked",
            barGapWidthPct: 30,
            chartColors: b.segments.map((seg) => TONE_HEX[seg.tone].replace("#", "")),
            showLegend: true,
            legendPos: "b",
            legendFontSize: 8.5,
            // Values live in the text legend under the bar: a single label
            // colour cannot stay legible on teal AND on amber/light segments.
            showValue: false,
            valAxisHidden: true,
            catAxisHidden: true,
            catAxisLineShow: false,
            valGridLine: { style: "none" },
            altText: `${title ?? "Stacked bar"}: ${b.segments.map((seg) => `${seg.label} ${seg.value}`).join(", ")}`
          }
        );
      }
      const legend = b.segments.map(
        (seg) => `${seg.label}: ${seg.value} of ${total} (${total > 0 ? Math.round(seg.value / total * 100) : 0}%)`
      ).join("   ·   ");
      s.addText(legend, {
        x,
        y: bodyY + Math.max(1.6, bh * 0.55) + 0.02,
        w,
        h: bh - Math.max(1.6, bh * 0.55) - 0.02,
        fontSize: fs(9),
        color: C.ink,
        valign: "top"
      });
      if (b.note)
        s.addText(b.note, {
          x,
          y: y + h - 0.32,
          w,
          h: 0.32,
          fontSize: fs(8.5),
          color: C.muted,
          italic: true
        });
      break;
    }
    case "table": {
      const cellSize = fs(8.5);
      const head = b.head.map((t) => ({
        text: t,
        options: {
          bold: true,
          color: C.titleInk,
          fill: { color: C.titleBar },
          fontSize: cellSize,
          align: "left"
        }
      }));
      const bodyRows = b.rows.map(
        (row, ri) => row.map((cell, ci) => ({
          text: cell,
          options: {
            fontSize: cellSize,
            color: C.ink,
            fill: { color: ri % 2 === 1 ? C.rowAlt : C.bg },
            align: b.align?.[ci] ?? (ci === 0 ? "left" : "right")
          }
        }))
      );
      if (b.totalRow)
        bodyRows.push(
          b.totalRow.map((cell, ci) => ({
            text: cell,
            options: {
              fontSize: cellSize,
              bold: true,
              color: C.ink,
              fill: { color: C.totalRow },
              align: b.align?.[ci] ?? (ci === 0 ? "left" : "right")
            }
          }))
        );
      const rows = head.length ? [head, ...bodyRows] : bodyRows;
      const rowCount = rows.length;
      const rowH = Math.min(0.26 * ds.rowScale, Math.max(0.14 * ds.rowScale, (bh - 0.1) / Math.max(1, rowCount)));
      s.addTable(rows, {
        x,
        y: bodyY,
        w,
        colW: colWidths(b.head.length, w),
        rowH,
        border: { type: "solid", color: C.line, pt: 0.5 },
        fontFace: "Calibri",
        valign: "middle",
        autoPage: false
      });
      if (b.note)
        s.addText(b.note, {
          x,
          y: bodyY + rowH * rowCount + 0.03,
          w,
          h: Math.max(0.2, bh - rowH * rowCount - 0.03),
          fontSize: fs(8.5),
          color: C.muted,
          italic: true
        });
      break;
    }
    case "heatmap": {
      const cellSize = fs(8.5);
      const headCell = (text, center = false) => ({
        text,
        options: {
          bold: true,
          color: C.titleInk,
          fill: { color: C.titleBar },
          fontSize: cellSize,
          ...center ? { align: "center" } : {}
        }
      });
      const rows = [
        [
          headCell("Year"),
          ...b.monthLabels.map((m) => headCell(m, true)),
          headCell("Total", true)
        ],
        ...b.rows.map((row) => [
          { text: row.label, options: { fontSize: cellSize, bold: true, color: C.ink } },
          ...row.cells.map((n) => {
            const cellFill = heatFill(n, surface);
            return {
              text: n === 0 ? "-" : String(n),
              options: {
                fontSize: cellSize,
                align: "center",
                color: hex6(inkOnFill(cellFill)),
                fill: { color: cellFill }
              }
            };
          }),
          { text: String(row.total), options: { fontSize: cellSize, bold: true, color: C.ink, align: "center", fill: { color: C.panel } } }
        ]),
        [
          { text: b.totalLabel, options: { fontSize: cellSize, bold: true, color: C.ink, fill: { color: C.totalRow } } },
          ...b.totalCells.map((n) => {
            const cellFill = heatFill(n, surface);
            return {
              text: n === 0 ? "0" : String(n),
              options: {
                fontSize: cellSize,
                bold: true,
                align: "center",
                color: hex6(inkOnFill(cellFill)),
                fill: { color: cellFill }
              }
            };
          }),
          { text: String(b.grandTotal), options: { fontSize: cellSize, bold: true, color: C.titleInk, fill: { color: C.titleBar }, align: "center" } }
        ]
      ];
      const rowH = Math.min(0.42 * ds.rowScale, (bh - 0.2) / rows.length);
      s.addTable(rows, {
        x,
        y: bodyY,
        w,
        colW: [1.05, ...Array(12).fill((w - 1.05 - 0.9) / 12), 0.9],
        rowH,
        border: { type: "solid", color: C.line, pt: 0.5 },
        fontFace: "Calibri",
        autoPage: false,
        valign: "middle"
      });
      s.addText(
        "Fewer    0   1   2   4   7+    More",
        {
          x,
          y: bodyY + rowH * rows.length + 0.05,
          w,
          h: 0.26,
          fontSize: fs(8.5),
          color: C.muted
        }
      );
      break;
    }
    case "donut": {
      const total = b.segments.reduce((a, seg) => a + seg.value, 0);
      const live = b.segments.filter((seg) => seg.value > 0);
      s.addChart(
        pptx.ChartType.doughnut,
        [
          {
            name: title ?? "Status",
            labels: live.map((seg) => seg.label),
            values: live.map((seg) => seg.value)
          }
        ],
        {
          x,
          y: bodyY,
          w: w * 0.55,
          h: Math.max(1.6, bh - (b.caption ? 0.4 : 0)),
          holeSize: 62,
          chartColors: live.map((seg) => TONE_HEX[seg.tone].replace("#", "")),
          showLegend: false,
          showValue: false,
          altText: `${title ?? "Donut"}: ${live.map((seg) => `${seg.label} ${seg.value}`).join(", ")}`
        }
      );
      s.addText(
        `${b.centerValue}
${b.centerLabel}`,
        {
          x: x + w * 0.05,
          y: bodyY + Math.max(1.6, bh) / 2 - 0.35,
          w: w * 0.45,
          h: 0.7,
          fontSize: fs(14),
          bold: true,
          align: "center",
          color: C.ink
        }
      );
      const legend = live.map(
        (seg) => `${seg.label}: ${seg.value} (${total > 0 ? Math.round(seg.value / total * 100) : 0}%)`
      ).join("\n");
      s.addText(legend, {
        x: x + w * 0.57,
        y: bodyY,
        w: w * 0.43,
        h: Math.max(1.6, bh) * 0.6,
        fontSize: fs(9),
        color: C.ink,
        valign: "top"
      });
      if (b.caption)
        s.addText(b.caption, {
          x: x + w * 0.57,
          y: bodyY + Math.max(1.6, bh) * 0.6,
          w: w * 0.43,
          h: bh - Math.max(1.6, bh) * 0.6,
          fontSize: fs(8.5),
          color: C.muted
        });
      break;
    }
    case "cards": {
      const cardGap = gap(0.1);
      const ch = (bh - cardGap * (b.items.length - 1)) / b.items.length;
      b.items.forEach((item, i) => {
        const by = bodyY + i * (ch + cardGap);
        s.addShape(pptx.ShapeType.roundRect, {
          x,
          y: by,
          w,
          h: ch,
          fill: { color: C.panel },
          line: { color: C.line, width: 0.5 },
          rectRadius: 0.07
        });
        s.addShape(pptx.ShapeType.rect, {
          x,
          y: by,
          w: 0.05,
          h: ch,
          fill: { color: TONE_HEX[item.tone ?? "teal"].replace("#", "") },
          line: { type: "none" }
        });
        s.addText(item.title, {
          x: x + pad(0.14),
          y: by + pad(0.06),
          w: w - pad(0.28),
          h: 0.24,
          fontSize: fs(9.5),
          bold: true,
          color: C.ink
        });
        s.addText(item.big, {
          x: x + pad(0.14),
          y: by + pad(0.28),
          w: w - pad(0.28),
          h: 0.42,
          fontSize: fs(20),
          bold: true,
          color: toneInk(item.tone)
        });
        s.addText(item.line, {
          x: x + pad(0.14),
          y: by + pad(0.7),
          w: w - pad(0.28),
          h: 0.28,
          fontSize: fs(9),
          color: C.ink
        });
        if (item.body)
          s.addText(item.body, {
            x: x + pad(0.14),
            y: by + pad(0.98),
            w: w - pad(0.28),
            h: Math.max(0.2, ch - 0.98 - pad(0.06)),
            fontSize: fs(8.5),
            color: C.muted
          });
      });
      break;
    }
    case "facts": {
      const factGap = gap(0.1);
      const fh = (bh - factGap * (b.items.length - 1)) / b.items.length;
      b.items.forEach((item, i) => {
        const by = bodyY + i * (fh + factGap);
        s.addShape(pptx.ShapeType.roundRect, {
          x,
          y: by,
          w,
          h: fh,
          fill: { color: C.panel },
          line: { color: C.line, width: 0.5 },
          rectRadius: 0.07
        });
        s.addShape(pptx.ShapeType.ellipse, {
          x: x + 0.14,
          y: by + fh / 2 - 0.22,
          w: 0.44,
          h: 0.44,
          fill: { color: TONE_HEX[item.tone ?? "teal"].replace("#", "") },
          line: { type: "none" }
        });
        s.addText(item.big, {
          x: x + 0.14,
          y: by + fh / 2 - 0.22,
          w: 0.44,
          h: 0.44,
          fontSize: fs(12),
          bold: true,
          color: inkOnFill(TONE_HEX[item.tone ?? "teal"]).replace("#", ""),
          align: "center",
          valign: "middle"
        });
        s.addText(item.text, {
          x: x + 0.68,
          y: by + 0.05,
          w: w - 0.8,
          h: fh - 0.1,
          fontSize: fs(9),
          color: C.ink,
          valign: "middle"
        });
      });
      break;
    }
    case "takeaways": {
      const cols = 2;
      const takeGap = gap(0.14);
      const rows = Math.ceil(b.items.length / cols);
      const cw = (w - takeGap) / cols;
      const ch = (bh - takeGap * (rows - 1)) / rows;
      b.items.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const bx = x + col * (cw + takeGap);
        const by = bodyY + row * (ch + takeGap);
        s.addShape(pptx.ShapeType.roundRect, {
          x: bx,
          y: by,
          w: cw,
          h: ch,
          fill: { color: C.panel },
          line: { color: C.line, width: 0.5 },
          rectRadius: 0.07
        });
        s.addShape(pptx.ShapeType.ellipse, {
          x: bx + 0.14,
          y: by + 0.14,
          w: 0.34,
          h: 0.34,
          fill: { color: C.accent },
          line: { type: "none" }
        });
        s.addText(String(item.n), {
          x: bx + 0.14,
          y: by + 0.14,
          w: 0.34,
          h: 0.34,
          fontSize: fs(10),
          bold: true,
          color: highContrast ? C.ink : "0B3B3B",
          align: "center",
          valign: "middle"
        });
        s.addText(item.title, {
          x: bx + 0.56,
          y: by + 0.12,
          w: cw - 0.68,
          h: 0.3,
          fontSize: fs(11),
          bold: true,
          color: C.ink
        });
        s.addText(item.body, {
          x: bx + 0.16,
          y: by + 0.46,
          w: cw - 0.3,
          h: Math.max(0.2, ch - 0.52),
          fontSize: fs(9),
          color: C.muted
        });
      });
      break;
    }
    case "defs": {
      const cols = 2;
      const defGap = gap(0.1);
      const rows = Math.ceil(b.items.length / cols);
      const cw = (w - defGap) / cols;
      const ch = (bh - defGap * (rows - 1)) / rows;
      b.items.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const bx = x + col * (cw + defGap);
        const by = bodyY + row * (ch + defGap);
        s.addShape(pptx.ShapeType.roundRect, {
          x: bx,
          y: by,
          w: cw,
          h: ch,
          fill: { color: C.panel },
          line: { color: C.line, width: 0.5 },
          rectRadius: 0.05
        });
        s.addText(item.term, {
          x: bx + 0.1,
          y: by + 0.04,
          w: cw - 0.2,
          h: 0.22,
          fontSize: fs(9),
          bold: true,
          color: C.ink
        });
        s.addText(item.definition, {
          x: bx + 0.1,
          y: by + 0.25,
          w: cw - 0.2,
          h: Math.max(0.2, ch - 0.28),
          fontSize: fs(7.5),
          color: C.muted
        });
      });
      break;
    }
    case "text": {
      s.addText(b.body, {
        x,
        y: bodyY,
        w,
        h: bh,
        fontSize: fs(9),
        color: C.muted,
        valign: "top"
      });
      break;
    }
    case "bullets": {
      s.addText(
        b.items.map((item) => ({
          text: item,
          options: {
            bullet: { code: "2022" },
            fontSize: fs(9),
            color: highContrast ? C.ink : b.tone === "coral" ? "C34B32" : b.tone === "amber" ? "A56408" : C.ink,
            breakLine: true,
            paraSpaceAfter: 4
          }
        })),
        { x, y: bodyY, w, h: bh, valign: "top" }
      );
      break;
    }
  }
}
function colWidths(cols, w) {
  if (cols <= 1) return [w];
  if (cols === 2) return [w * 0.62, w * 0.38];
  if (cols === 3) return [w * 0.5, w * 0.25, w * 0.25];
  const first = w * 0.32;
  return [first, ...Array(cols - 1).fill((w - first) / (cols - 1))];
}
function heatFill(n, surface) {
  if (surface.key === "contrast" || surface.key === "contrastDark") {
    if (n <= 0) return hex6(surface.panel);
    if (n === 1) return "E6E6E6";
    if (n === 2) return "CCCCCC";
    if (n <= 4) return "999999";
    if (n <= 7) return "666666";
    return surface.key === "contrastDark" ? "FFFFFF" : "000000";
  }
  if (n <= 0) return hex6(surface.bg);
  if (n === 1) return "E3F1EF";
  if (n === 2) return "C4E3DF";
  if (n <= 4) return "9BD0CA";
  if (n <= 7) return "4FA69B";
  return "0F6B63";
}
function applySlideOrder(slides, order) {
  if (!order || order.length === 0) return slides;
  const byId = new Map(slides.map((s) => [s.id, s]));
  const out = [];
  for (const id of order) {
    const slide = byId.get(id);
    if (slide && !out.includes(slide)) out.push(slide);
  }
  for (const slide of slides) if (!out.includes(slide)) out.push(slide);
  return out;
}
function modelForExport(rows, district, order, options = {}) {
  const base = buildDeckModel(rows, {
    district,
    period: options.period,
    filtersLabel: options.filtersLabel
  });
  const ordered = applySlideOrder(base.slides, order);
  const slides = options.extraNotes?.length ? ordered.map(
    (slide) => slide.id === "checks" ? {
      ...slide,
      columns: [
        ...slide.columns,
        [
          {
            kind: "bullets",
            title: "Notes for this export",
            items: [...options.extraNotes]
          }
        ]
      ]
    } : slide
  ) : ordered;
  return { ...base, slides };
}
async function buildDeckPptx(rows, district, fileName, order, options = {}) {
  const model = modelForExport(rows, district, order, options);
  return buildDeckPptxFromModel(model, fileName, options);
}
async function buildDeckPptxFromModel(model, fileName, options = {}) {
  const PptxGenJS = (await __vitePreload(async () => { const {default: __vite_default__} = await import('./vendor-pptx-C_OmB9K3.js');return { default: __vite_default__ }},true              ?__vite__mapDeps([0,1,2,3]):void 0)).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = model.meta.orgName;
  pptx.title = `${model.meta.deckTitle} — ${model.meta.district}`;
  const hidden = new Set(options.hidden ?? []);
  const keepHidden = options.keepHidden ?? false;
  const slides = keepHidden ? model.slides : model.slides.filter((s) => !hidden.has(s.id));
  const total = slides.length;
  const theme = options.theme ?? "light";
  const density = options.density ?? "comfortable";
  const ds = deckDensity(density);
  for (let index = 0; index < slides.length; index++) {
    const slide = slides[index];
    await new Promise((resolve) => setTimeout(resolve, 0));
    const s = pptx.addSlide();
    const surface = resolveDeckSurface(theme, slide.variant);
    s.background = { color: hex6(surface.bg) };
    if (keepHidden && hidden.has(slide.id)) s.hidden = true;
    addHeader(pptx, s, slide, surface, density);
    addHero(pptx, s, slide, surface, density);
    const contentTop = slide.variant === "cover" ? 3.95 : CONTENT_TOP - (density === "compact" ? 0.12 : 0);
    const contentH = CONTENT_BOTTOM - contentTop;
    const cols = Math.max(1, slide.columns.length);
    const colGap = 0.24 * ds.gapScale;
    const cw = (W - M * 2 - colGap * (cols - 1)) / cols;
    slide.columns.forEach((blocks, ci) => {
      const x = M + ci * (cw + colGap);
      const weights = blocks.map(blockWeight);
      const sum = weights.reduce((a, b) => a + b, 0) || 1;
      const blockGap = 0.1 * ds.gapScale;
      const heights = weights.map(
        (wgt) => wgt / sum * (contentH - blockGap * (blocks.length - 1))
      );
      let by = contentTop;
      blocks.forEach((block, bi) => {
        addBlock(pptx, s, block, x, by, cw, heights[bi], surface, density);
        by += heights[bi] + blockGap;
      });
    });
    if (slide.note)
      s.addText(slide.note, {
        x: M,
        y: CONTENT_BOTTOM + 0.02,
        w: W - M * 2,
        h: 0.26,
        fontSize: scaleDeckFont(8.5, density, 6),
        color: hex6(surface.muted),
        italic: true
      });
    addFooter(pptx, s, model, index + 1, total, surface);
    s.addNotes(
      slide.speakerNotes ?? `${slide.title}. All numbers come from the shared deck model; see the Definitions slide for the rules.`
    );
    options.onSlide?.(slide.id);
  }
  const stampMatch = model.meta.dataAsOf.match(/^(\d{2})-(\w{3})-(\d{4})/);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dmy = stampMatch ? `${stampMatch[1]}-${String(months.indexOf(stampMatch[2]) + 1).padStart(2, "0")}-${stampMatch[3]}` : stamp();
  await pptx.writeFile({
    fileName: fileName ?? `${model.meta.district} NQAS Summary Report ${dmy}.pptx`
  });
  return { slideCount: total };
}
async function buildDeckPdf(rows, district, fileName, order, extraNotes, options = {}) {
  const model = modelForExport(rows, district, order, {
    ...options,
    extraNotes: extraNotes ?? options.extraNotes
  });
  return buildDeckPdf$1(model, {
    hidden: options.hidden,
    fileName,
    theme: options.theme,
    density: options.density,
    onSlide: options.onSlide ? (id) => options.onSlide(id) : void 0
  });
}
function visibleCount(model, hidden = []) {
  return visibleSlides(model, hidden).length;
}

export { INK, MIST, ORANGE, SLATE, TEAL, TEAL_DARK, applySlideOrder, buildDeckModel, buildDeckPdf, buildDeckPptx, buildDeckPptxFromModel, modelForExport, visibleCount };
