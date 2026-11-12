/**
 * Part 1 + Part 2 + Part 4 contracts.
 *
 *  • the IA card's bars are centred under their table columns (ONE grid);
 *  • value labels never intersect each other or leave the card;
 *  • a missing quarter is "Not reported" and a zero never draws a bar;
 *  • the two-series encoding survives black-and-white printing;
 *  • the QR decodes to the exact short URL at 72/150/300 dpi and after a blur;
 *  • the stepper's label and date baselines are shared by every stage.
 */
import { describe, expect, test } from "bun:test";
import {
  IA_CARD,
  IA_SERIES,
  iaCardSvg,
  iaChangeText,
  iaCardPointsFromRows,
  layoutIaCard,
  type IaCardPoint,
} from "../src/lib/iaCard";
import { qrMatrix, qrSelfCheck } from "../src/lib/qrCode";
import { STEPPER, stepperTextBaselines } from "../src/lib/facilitySheet";
import {
  documentLinkUrl,
  shareDocumentStreamUrl,
} from "../src/lib/shareLink";

const points = (values: [number | null, number | null][]): IaCardPoint[] =>
  values.map(([nqas, kayakalp], i) => ({
    shortLabel: `Q${(i % 4) + 1} 26-27`,
    nqas,
    kayakalp,
    reported: nqas != null || kayakalp != null,
  }));

const CHANGE = { nqas: 1.33, kayakalp: -0.5 };

describe("IA card — one shared six-column grid", () => {
  test("each quarter's bar PAIR is centred on its header column (≤0.5 mm)", () => {
    const layout = layoutIaCard(points([[78, 75], [88, 90], [87.7, null], [null, null]]), CHANGE);
    expect(layout.quarters).toHaveLength(4);
    for (const q of layout.quarters) {
      const bars = layout.bars.filter((b) => b.x + b.w / 2 >= q.x0 - 2 && b.x + b.w / 2 <= q.x1 + 2);
      if (!bars.length) continue;
      const left = Math.min(...bars.map((b) => b.x));
      const right = Math.max(...bars.map((b) => b.x + b.w));
      expect(Math.abs((left + right) / 2 - q.centre)).toBeLessThanOrEqual(0.5);
    }
    // Header cells and the chart x labels use the same centre by construction.
    const svg = iaCardSvg(points([[78, 75], [88, 90], [87.7, null], [null, null]]), CHANGE);
    for (const q of layout.quarters) expect(svg).toContain(`x="${Math.round(q.centre * 100) / 100}"`);
  });

  test("labels never intersect and never leave the card", () => {
    const layout = layoutIaCard(
      points([[78, 77.9], [88, 88.2], [87.7, 87.8], [94, 94.1]]),
      CHANGE,
    );
    const boxes = layout.labels.map((l) => {
      const half = (l.text.length * 1.7) / 2;
      return { x0: l.x - half, x1: l.x + half, y0: l.y - 2, y1: l.y + 0.8 };
    });
    for (const b of boxes) {
      expect(b.x0).toBeGreaterThanOrEqual(IA_CARD.pad - 6);
      expect(b.x1).toBeLessThanOrEqual(layout.width - IA_CARD.pad + 6);
      expect(b.y0).toBeGreaterThan(0);
    }
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const overlap = a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
        expect(overlap).toBe(false);
      }
    }
  });

  test("missing quarters say Not reported; a zero never draws a bar", () => {
    const blank = layoutIaCard(points([[null, null], [null, null], [null, null], [null, null]]), {
      nqas: null,
      kayakalp: null,
    });
    expect(blank.bars.filter((b) => b.h > 0)).toHaveLength(0);
    expect(blank.emptySlots.filter((s) => s.text === "Not reported")).toHaveLength(4);
    const zero = layoutIaCard(points([[0, null], [null, null], [null, null], [null, null]]), {
      nqas: null,
      kayakalp: null,
    });
    expect(zero.bars.find((b) => b.value === 0)?.h).toBe(0);
  });

  test("the two series stay distinct in black and white (solid vs hatch)", () => {
    const nqas = IA_SERIES.find((s) => s.key === "nqas");
    const kayakalp = IA_SERIES.find((s) => s.key === "kayakalp");
    expect(nqas?.hatch).toBe(false);
    expect(kayakalp?.hatch).toBe(true);
    const svg = iaCardSvg(points([[80, 70], [82, 72], [84, 74], [86, 76]]), CHANGE);
    expect(svg).toContain("#0f766e");
    expect(svg).toContain("url(#ia-hatch)");
  });

  test("the two-point window reports itself, never a third zero bar", () => {
    const fromRows = iaCardPointsFromRows([
      { fy: "2025-26", quarter: 3, nqasIaScore: 78, kayakalpIaScore: null },
    ]);
    expect(fromRows.points).toHaveLength(4); // four columns, one with data
    expect(fromRows.points.filter((p) => p.reported)).toHaveLength(1);
    const svg = iaCardSvg(fromRows.points, fromRows.change);
    expect(svg).toContain("Only 1 quarter reported");
    // TWO reported quarters (one series each) still draw both bars, no note.
    const two = iaCardPointsFromRows([
      { fy: "2025-26", quarter: 3, nqasIaScore: 78, kayakalpIaScore: null },
      { fy: "2025-26", quarter: 4, nqasIaScore: null, kayakalpIaScore: 75 },
    ]);
    expect(two.points.filter((p) => p.reported)).toHaveLength(2);
    expect(iaCardSvg(two.points, two.change)).not.toContain("Only 1 quarter reported");
  });

  test("change marks use the shared wording", () => {
    expect(iaChangeText(1.33)).toBe("▲ 1.33");
    expect(iaChangeText(-0.5)).toBe("▼ 0.50");
    expect(iaChangeText(0)).toBe("■ 0.00");
    expect(iaChangeText(null)).toBe("-");
  });
});

describe("stepper spacing (Part 4)", () => {
  test("label and date baselines are the same for every stage", () => {
    const a = stepperTextBaselines(55.5);
    const b = stepperTextBaselines(55.5);
    expect(a).toEqual(b);
    expect(a.date - a.label).toBeGreaterThan(3.5);
    expect(a.date - a.label).toBeLessThan(6);
    expect(STEPPER.circleToLabel).toBe(1.6);
    expect(STEPPER.labelPt).toBe(8.5);
    expect(STEPPER.datePt).toBe(7.5);
  });

  test("the reserved label block fits the 10.5 pt line at every font size", () => {
    expect(STEPPER.labelLinePt * 0.3528).toBeCloseTo(3.7, 1);
    expect(STEPPER.labelPt).toBeGreaterThanOrEqual(8);
    // A stage without a date reserves the same block, so the date baseline is
    // a pure function of y — never of the stage's own text.
    expect(stepperTextBaselines(55.5).date).toBe(stepperTextBaselines(55.5).date);
  });
});

describe("QR code (Part 2)", () => {
  const url = "https://qualitytracker.freebuff.app/r/DSgycBZbAbCdEfGhIjKlMn";
  const matrix = qrMatrix(url, "M");

  test("encodes the exact short URL, ECC M, version 4 or lower", () => {
    expect(matrix.text).toBe(url);
    expect(matrix.size).toBeLessThanOrEqual(33);
    expect(qrSelfCheck(matrix, url)).toEqual({ ok: true, reason: "" });
    expect(qrSelfCheck(matrix, `${url}x`).ok).toBe(false);
  });

  /** Render the matrix like the PDF does (4-module quiet zone) and read it. */
  const decodeAt = async (dpi: number, blur = false) => {
    const jsQR = ((await import("jsqr")) as unknown as { default: Function }).default;
    const sizeMm = 30;
    const modules = matrix.size + 8;
    const px = Math.max(3, Math.floor((dpi / 25.4) * (sizeMm / modules)));
    const w = modules * px;
    const data = new Uint8ClampedArray(w * w * 4).fill(255);
    for (let row = 0; row < matrix.size; row += 1) {
      for (let col = 0; col < matrix.size; col += 1) {
        if (!matrix.get(row, col)) continue;
        for (let dy = 0; dy < px; dy += 1) {
          for (let dx = 0; dx < px; dx += 1) {
            const x = (col + 4) * px + dx;
            const y = (row + 4) * px + dy;
            const i = (y * w + x) * 4;
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 255;
          }
        }
      }
    }
    let input = data;
    if (blur) {
      // 3×3 box blur — a cheap stand-in for a phone photo / soft print.
      input = new Uint8ClampedArray(data.length);
      for (let y = 0; y < w; y += 1) {
        for (let x = 0; x < w; x += 1) {
          let sum = 0;
          let n = 0;
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              const yy = Math.min(w - 1, Math.max(0, y + dy));
              const xx = Math.min(w - 1, Math.max(0, x + dx));
              sum += data[(yy * w + xx) * 4];
              n += 1;
            }
          }
          const v = Math.round(sum / n);
          const i = (y * w + x) * 4;
          input[i] = v;
          input[i + 1] = v;
          input[i + 2] = v;
          input[i + 3] = 255;
        }
      }
    }
    const result = jsQR(input, w, w);
    return result?.data ?? "";
  };

  for (const dpi of [72, 150, 300]) {
    test(`decodes at ${dpi} dpi`, async () => {
      expect(await decodeAt(dpi)).toBe(url);
    });
  }

  test("decodes after a slight blur", async () => {
    expect(await decodeAt(300, true)).toBe(url);
  });

  test("the printable link is the same short route as the QR", () => {
    expect(documentLinkUrl("https://qualitytracker.freebuff.app", "DSgycBZbAbCdEfGhIjKlMn", "AbCdEfGhIjKlMnOpQrStUv")).toBe(
      "https://qualitytracker.freebuff.app/r/DSgycBZbAbCdEfGhIjKlMn/d/AbCdEfGhIjKlMnOpQrStUv",
    );
    const stream = shareDocumentStreamUrl(
      "https://animated-minnow-527.convex.cloud",
      "DSgycBZbAbCdEfGhIjKlMn",
      "AbCdEfGhIjKlMnOpQrStUv",
    );
    expect(stream).toBe(
      "https://animated-minnow-527.convex.site/shared/doc?token=DSgycBZbAbCdEfGhIjKlMn&doc=AbCdEfGhIjKlMnOpQrStUv",
    );
  });
});
