/**
 * QR ON THE FACILITY SHEET — decoded, not just drawn.
 *
 * The sheet's QR must open the DIGITAL COPY of that same sheet
 * (`https://<APP_ORIGIN>/r/<token>`), so these tests rasterise the module
 * matrix the PDF prints and read it back with a real QR decoder (jsQR). A
 * matrix that started encoding the old sign-in-gated list page — or a quiet
 * zone that went missing — fails here instead of on a phone.
 *
 * Run: bun test ./scripts/qrCode.test.ts
 */
import { describe, expect, it } from "bun:test";
import jsQR from "jsqr";

import {
  QR_PRINT,
  QR_QUIET_ZONE,
  darkRuns,
  qrGeometry,
  qrMatrix,
  qrSelfCheck,
} from "../src/lib/qrCode";
import { SHARE_ROUTE, shareUrl } from "../src/lib/shareLink";

const TOKEN = "xY7QwE2rT5uI9oP1aS3dF7"; // 22 base64url characters = 128 bits

/** Rasterise a matrix exactly like the PDF does (quiet zone + square modules). */
function decode(text: string, scale = 6): string | null {
  const m = qrMatrix(text);
  const total = (m.size + QR_QUIET_ZONE * 2) * scale;
  const data = new Uint8ClampedArray(total * total * 4);
  for (let y = 0; y < total; y += 1) {
    for (let x = 0; x < total; x += 1) {
      const col = Math.floor(x / scale) - QR_QUIET_ZONE;
      const row = Math.floor(y / scale) - QR_QUIET_ZONE;
      const inside = col >= 0 && row >= 0 && col < m.size && row < m.size;
      const dark = inside && m.get(row, col);
      const i = (y * total + x) * 4;
      data[i] = dark ? 0 : 255;
      data[i + 1] = dark ? 0 : 255;
      data[i + 2] = dark ? 0 : 255;
      data[i + 3] = 255;
    }
  }
  return jsQR(data, total, total)?.data ?? null;
}

describe("QR digital-copy badge", () => {
  it("encodes the short /r/<token> link on the saved App address", () => {
    const url = shareUrl("https://nqas.example.in", TOKEN);
    expect(url).toBe(`https://nqas.example.in${SHARE_ROUTE}/${TOKEN}`);
    expect(decode(url)).toBe(url);
  });

  it("never encodes the sign-in-gated list page or a Report ID again", () => {
    const url = shareUrl("https://nqas.example.in", TOKEN);
    expect(url).not.toContain("/facilities");
    expect(url).not.toContain("report=");
    expect(url).not.toContain("NQAS-");
    // About 60 characters: version 4 at ECC M, printed 20 mm wide.
    expect(url.length).toBeLessThanOrEqual(60);
  });

  it("is a version-4 symbol (33 modules) with 0.61 mm modules at 20 mm", () => {
    const url = shareUrl("https://qualitytracker.freebuff.app", TOKEN);
    const m = qrMatrix(url, "M");
    expect(m.version).toBe(4);
    expect(m.size).toBe(33);
    const g = qrGeometry(m, QR_PRINT.symbolMm);
    expect(g.moduleMm).toBeCloseTo(20 / 33, 4); // 0.606 mm
    expect(g.quietMm).toBeCloseTo(2.42, 2);
    expect(g.blockMm).toBeCloseTo((20 * 41) / 33, 3); // 24.85 mm
    expect(qrSelfCheck(m, url, { symbolMm: 20 })).toEqual({ ok: true, reason: "" });
    // Below the print minimum (0.55 mm/module) the self-check refuses it.
    expect(qrSelfCheck(m, url, { symbolMm: 15 }).ok).toBe(false);
  });

  it("round-trips at 72, 150 and 300 dpi (coarse and fine rasterising)", () => {
    const url = shareUrl("https://nqas-tracker.tn.gov.in", TOKEN);
    for (const scale of [3, 6, 10]) expect(decode(url, scale)).toBe(url);
  });

  it("round-trips a blurred and a slightly rotated copy", () => {
    const url = shareUrl("https://nqas.example.in", TOKEN);
    const m = qrMatrix(url);
    const scale = 6;
    const total = (m.size + QR_QUIET_ZONE * 2) * scale;

    const render = (opts: { blur?: boolean; rotate?: boolean }) => {
      const src = new Uint8ClampedArray(total * total * 4);
      for (let y = 0; y < total; y += 1) {
        for (let x = 0; x < total; x += 1) {
          const sx = opts.rotate ? x + Math.round((y - total / 2) * 0.06) : x;
          const col = Math.floor(sx / scale) - QR_QUIET_ZONE;
          const row = Math.floor(y / scale) - QR_QUIET_ZONE;
          const inside = col >= 0 && row >= 0 && col < m.size && row < m.size;
          const dark = inside && m.get(row, col);
          const i = (y * total + x) * 4;
          src[i] = dark ? 0 : 255;
          src[i + 1] = dark ? 0 : 255;
          src[i + 2] = dark ? 0 : 255;
          src[i + 3] = 255;
        }
      }
      if (!opts.blur) return src;
      // 3×3 box blur — the smudge of a photocopied sheet.
      const out = new Uint8ClampedArray(src);
      for (let y = 1; y < total - 1; y += 1) {
        for (let x = 1; x < total - 1; x += 1) {
          for (let c = 0; c < 3; c += 1) {
            let sum = 0;
            for (let dy = -1; dy <= 1; dy += 1) {
              for (let dx = -1; dx <= 1; dx += 1) {
                sum += src[((y + dy) * total + (x + dx)) * 4 + c];
              }
            }
            out[(y * total + x) * 4 + c] = Math.round(sum / 9);
          }
        }
      }
      return out;
    };

    expect(jsQR(render({ blur: true }), total, total)?.data).toBe(url);
    expect(jsQR(render({ rotate: true }), total, total)?.data).toBe(url);
  });

  it("uses a real QR version with a quiet zone, drawn as runs (few operators)", () => {
    const m = qrMatrix(shareUrl("https://nqas.example.in", TOKEN));
    // Versions are 21 + 4n modules; 46 is never a valid size.
    expect((m.size - 21) % 4).toBe(0);
    expect(m.size).toBeGreaterThanOrEqual(21);
    expect(m.size).toBeLessThanOrEqual(33); // version 4 or lower at ECC M
    // Three finder patterns: dark 7×7 ring corners.
    expect(m.get(0, 0)).toBe(true);
    expect(m.get(0, 6)).toBe(true);
    expect(m.get(6, 6)).toBe(true);
    expect(m.get(6, 0)).toBe(true);
    const runs = darkRuns(m);
    expect(runs.length).toBeGreaterThan(m.size);
    expect(runs.every((r) => r.length > 0)).toBe(true);
    // One rectangle per run, not per module: always a meaningful reduction.
    const dark = runs.reduce((n, r) => n + r.length, 0);
    expect(runs.length).toBeLessThan(dark);
  });

  it("keeps the payload inside the qrcode-generator byte-mode limit", () => {
    expect(() => qrMatrix(shareUrl("https://x.in", TOKEN))).not.toThrow();
    // A malformed or missing token never produces a scannable lie.
    expect(shareUrl("https://x.in", "not a token")).toBe("");
    expect(shareUrl("", TOKEN)).toBe("");
  });
});
