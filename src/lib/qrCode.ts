/**
 * QR MATRIX — one encoder for every verification block.
 *
 * The sheet prints a QR that opens the DIGITAL COPY of that same sheet
 * (`https://<APP_ORIGIN>/r/<token>` — see lib/shareLink).
 * The matrix comes from `qrcode-generator` (byte mode, auto version, ECC M),
 * and this module draws it into the PDF as filled runs of modules — no image,
 * no canvas, no font — so it prints sharp at any size and stays scannable in
 * black and white.
 *
 * `qrMatrix` is pure (no jsPDF), so tests decode it with a real QR reader.
 */

import qrcode from "qrcode-generator";

export type QrMatrix = {
  /** Modules per side (21, 25, 29 … — never includes the quiet zone). */
  size: number;
  /** QR version chosen by the encoder (1 = 21 modules, 4 = 33). */
  version?: number;
  /** The exact payload encoded. */
  text: string;
  /** True when the module at (row, col) is dark. */
  get(row: number, col: number): boolean;
};

/** Quiet zone required by the spec — 4 modules on every side. */
export const QR_QUIET_ZONE = 4;

/**
 * Build a QR matrix for `text`. Throws only when the payload cannot fit any
 * version at the chosen error-correction level (impossible for a short URL,
 * and the sheet falls back to the printed verification line if it ever does).
 */
export function qrMatrix(text: string, ecc: "L" | "M" | "Q" | "H" = "M"): QrMatrix {
  /* A `https://<host>/r/<22-char token>` link is ~60 characters: at ECC M
     the smallest version that fits is version 4 (33 modules). The sheet
     prints that symbol at 20 mm — 0.61 mm modules with a 4-module quiet zone
     (2.4 mm) inside a 24.8 mm block. Version 4 is the expected density; a
     future host that pushes the payload further still builds (never a blank
     badge) and `qrSelfCheck` logs it. */
  for (let version = 1; version <= 40; version += 1) {
    try {
      const qr = qrcode(version as unknown as Parameters<typeof qrcode>[0], ecc);
      qr.addData(text, "Byte");
      qr.make();
      return {
        size: qr.getModuleCount(),
        text,
        version,
        get: (row, col) => qr.isDark(row, col),
      };
    } catch {
      /* too much data for this version — try the next one */
    }
  }
  throw new Error("The link is too long to encode as a QR code");
}

/** The printed badge: 20 mm symbol, 4-module quiet zone (2.4 mm), no border. */
export const QR_PRINT = {
  symbolMm: 20,
  /** A module narrower than this is not reliably readable in print. */
  minModuleMm: 0.55,
  /** 4 modules at version 4 = 2.4 mm; the spec's minimum. */
  minQuietMm: 2.4,
} as const;

/** Printed geometry of one matrix at a given symbol size (quiet zone included). */
export function qrGeometry(
  matrix: QrMatrix,
  symbolMm: number = QR_PRINT.symbolMm,
): { symbolMm: number; moduleMm: number; quietMm: number; blockMm: number } {
  const moduleMm = symbolMm / matrix.size;
  const quietMm = moduleMm * QR_QUIET_ZONE;
  return { symbolMm, moduleMm, quietMm, blockMm: symbolMm + quietMm * 2 };
}

/**
 * Generation-time self-check (Part 2.3): the payload is exactly the expected
 * short URL, the symbol is version 4 or denser (33+ modules), and — when the
 * printed size is supplied — every module is at least 0.55 mm and the quiet
 * zone at least 2.4 mm. The sheet escalates 20 mm → 24 mm once and logs any
 * remaining failure; the test suite additionally decodes the rasterised symbol
 * at 72/150/300 dpi, blurred and slightly rotated.
 */
export function qrSelfCheck(
  matrix: QrMatrix,
  expected: string,
  printed?: { symbolMm?: number },
): { ok: boolean; reason: string } {
  if (matrix.text !== expected) return { ok: false, reason: "payload differs from the saved short link" };
  if (!expected.startsWith("https://")) return { ok: false, reason: "the link is not an absolute https URL" };
  if (matrix.size > 33) return { ok: false, reason: `version ${matrix.version ?? "?"} is denser than version 4` };
  if (matrix.size < 21) return { ok: false, reason: "the symbol is too small to be valid" };
  if (printed?.symbolMm) {
    const g = qrGeometry(matrix, printed.symbolMm);
    if (g.moduleMm < QR_PRINT.minModuleMm)
      return {
        ok: false,
        reason: `${g.moduleMm.toFixed(2)} mm modules at ${g.symbolMm} mm is below the ${QR_PRINT.minModuleMm} mm print minimum`,
      };
    if (g.quietMm < QR_PRINT.minQuietMm)
      return {
        ok: false,
        reason: `quiet zone ${g.quietMm.toFixed(2)} mm is below 4 modules`,
      };
  }
  return { ok: true, reason: "" };
}

/**
 * Decode the symbol exactly as it will be printed (Part 2.4).
 *
 * Rasterises the matrix at `dpi` with black modules on white inside the quiet
 * zone, then reads it with jsQR — the same decoder a phone uses. jsQR is a
 * lazy chunk: it loads on the first sheet generation, never in the app shell.
 */
export async function decodePrintedQr(
  matrix: QrMatrix,
  symbolMm: number = QR_PRINT.symbolMm,
  dpi = 150,
): Promise<string | null> {
  const jsQR = (await import("jsqr")).default;
  const quiet = QR_QUIET_ZONE;
  const totalModules = matrix.size + quiet * 2;
  const px = Math.max(64, Math.round((symbolMm / 25.4) * dpi));
  const scale = px / totalModules;
  const side = Math.ceil(totalModules * scale);
  const data = new Uint8ClampedArray(side * side * 4);
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const col = Math.floor(x / scale) - quiet;
      const row = Math.floor(y / scale) - quiet;
      const dark =
        col >= 0 && row >= 0 && col < matrix.size && row < matrix.size
          ? matrix.get(row, col)
          : false;
      const i = (y * side + x) * 4;
      data[i] = dark ? 0 : 255;
      data[i + 1] = dark ? 0 : 255;
      data[i + 2] = dark ? 0 : 255;
      data[i + 3] = 255;
    }
  }
  return jsQR(data, side, side)?.data ?? null;
}

/** Horizontal runs of dark modules per row — far fewer PDF operators than one
 *  rectangle per module, and it renders identically. */
export function darkRuns(m: QrMatrix): { row: number; start: number; length: number }[] {
  const runs: { row: number; start: number; length: number }[] = [];
  for (let row = 0; row < m.size; row += 1) {
    let start = -1;
    for (let col = 0; col < m.size; col += 1) {
      const dark = m.get(row, col);
      if (dark && start < 0) start = col;
      if (!dark && start >= 0) {
        runs.push({ row, start, length: col - start });
        start = -1;
      }
    }
    if (start >= 0) runs.push({ row, start, length: m.size - start });
  }
  return runs;
}

/**
 * Draw the QR into a jsPDF document at (x, y) covering `sizeMm` × `sizeMm`
 * INCLUDING the quiet zone. Everything is filled black rectangles on white,
 * so a black-and-white print keeps full contrast.
 */
export function drawQr(
  doc: {
    setFillColor: (r: number, g: number, b: number) => unknown;
    rect: (x: number, y: number, w: number, h: number, style?: string) => unknown;
  },
  matrix: QrMatrix,
  x: number,
  y: number,
  sizeMm: number,
): void {
  const total = matrix.size + QR_QUIET_ZONE * 2;
  const unit = sizeMm / total;
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, sizeMm, sizeMm, "F");
  doc.setFillColor(0, 0, 0);
  for (const run of darkRuns(matrix)) {
    doc.rect(
      x + (run.start + QR_QUIET_ZONE) * unit,
      y + (run.row + QR_QUIET_ZONE) * unit,
      run.length * unit,
      unit,
      "F",
    );
  }
}

/* The link a scan opens is built by lib/shareLink (`shareUrl` →
   `https://<APP_ORIGIN>/r/<token>`). The old `verifyUrl` — a sign-in-gated
   list page with a Report ID query — is gone with the Report ID itself. */
