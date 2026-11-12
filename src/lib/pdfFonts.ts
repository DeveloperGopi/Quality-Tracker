/**
 * EMBEDDED PDF FONTS + GLYPH COVERAGE CHECK (Part 1 §1).
 *
 * Root cause of the broken deck PDF: jsPDF was drawing with its built-in
 * Helvetica, which is a WinAnsi (single-byte) font. "→" and "₹" are not in
 * WinAnsi, so jsPDF either dropped them or painted byte pairs — the PDF showed
 * "!’" for an arrow and "¹ ¹" for the rupee sign.
 *
 * Fix: the deck PDF registers Noto Sans (regular + bold) and Noto Sans Tamil
 * from /public/fonts and draws every string in that family. A cmap reader
 * (below) exposes exactly which code points the embedded face covers, and the
 * exporter refuses to write a PDF containing a character without a glyph — so
 * a missing glyph becomes a loud build error, never silent garbage.
 *
 * The fonts are only fetched on the export path (dynamic import), never in a
 * read path.
 */

import type { jsPDF } from "jspdf";

export type LoadedFont = {
  file: string;
  base64: string;
  /** Code points with a non-zero glyph in the font's cmap. */
  coverage: Set<number>;
};

const FONT_FILES = {
  regular: "NotoSans-Regular.ttf",
  bold: "NotoSans-Bold.ttf",
  tamil: "NotoSansTamil-Regular.ttf",
  /** Latin + Tamil in one face — used by the Links Organiser PDF. */
  tamilMerged: "NotoSansTamil-RegularMerged.ttf",
} as const;

const cache = new Map<string, LoadedFont | null>();

/* ------------------------------------------------------------------ */
/* Minimal TrueType cmap reader (formats 4 and 12)                     */
/* ------------------------------------------------------------------ */

export function readTtfCoverage(bytes: Uint8Array): Set<number> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const covered = new Set<number>();
  const numTables = view.getUint16(4);
  let cmapOffset = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(
      bytes[rec],
      bytes[rec + 1],
      bytes[rec + 2],
      bytes[rec + 3],
    );
    if (tag === "cmap") {
      cmapOffset = view.getUint32(rec + 8);
      break;
    }
  }
  if (cmapOffset < 0 || cmapOffset + 4 > bytes.length) return covered;
  const numSub = view.getUint16(cmapOffset + 2);
  const subtables: { offset: number; format: number }[] = [];
  for (let i = 0; i < numSub; i++) {
    const rec = cmapOffset + 4 + i * 8;
    const subOffset = cmapOffset + view.getUint32(rec + 4);
    if (subOffset + 2 > bytes.length) continue;
    subtables.push({ offset: subOffset, format: view.getUint16(subOffset) });
  }

  for (const sub of subtables) {
    if (sub.format === 4) {
      const o = sub.offset;
      const segX2 = view.getUint16(o + 6);
      const segCount = segX2 / 2;
      const endBase = o + 14;
      const startBase = endBase + segX2 + 2;
      const deltaBase = startBase + segX2;
      const rangeBase = deltaBase + segX2;
      for (let s = 0; s < segCount; s++) {
        const end = view.getUint16(endBase + s * 2);
        const start = view.getUint16(startBase + s * 2);
        const delta = view.getInt16(deltaBase + s * 2);
        const rangeOffset = view.getUint16(rangeBase + s * 2);
        if (end === 0xffff && start === 0xffff) continue;
        for (let cp = start; cp <= end; cp++) {
          if (rangeOffset === 0) {
            const glyph = (cp + delta) & 0xffff;
            if (glyph !== 0) covered.add(cp);
          } else {
            // Indirect lookup: the glyph id lives in glyphIdArray. We only
            // need coverage, so probe the entry and accept a non-zero id.
            const addr =
              rangeBase + s * 2 + rangeOffset + (cp - start) * 2;
            if (addr + 2 <= bytes.length) {
              const glyph = view.getUint16(addr);
              if (glyph !== 0) covered.add(cp);
            }
          }
        }
      }
    } else if (sub.format === 12) {
      const o = sub.offset;
      const nGroups = view.getUint32(o + 12);
      for (let g = 0; g < nGroups; g++) {
        const rec = o + 16 + g * 12;
        const start = view.getUint32(rec);
        const end = view.getUint32(rec + 4);
        for (let cp = start; cp <= end; cp++) covered.add(cp);
      }
    }
  }
  return covered;
}

/* ------------------------------------------------------------------ */
/* Loading                                                            */
/* ------------------------------------------------------------------ */

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)),
    );
  }
  return btoa(binary);
}

async function readFontBytes(file: string): Promise<Uint8Array | null> {
  // Bun test / build: read from the repo's public folder FIRST. A DOM test
  // may install happy-dom's `window`, and a relative fetch has no base URL
  // there — checking the filesystem first keeps exports deterministic
  // regardless of which test ran before this one.
  const BunGlobal = (globalThis as { Bun?: { file: (p: string) => { arrayBuffer(): Promise<ArrayBuffer> } } }).Bun;
  if (BunGlobal) {
    try {
      const buf = await BunGlobal.file(`public/fonts/${file}`).arrayBuffer();
      return new Uint8Array(buf);
    } catch {
      /* fall through to fetch */
    }
  }
  if (typeof fetch === "function") {
    try {
      const res = await fetch(`/fonts/${file}`);
      if (!res.ok) return null;
      return new Uint8Array(await res.arrayBuffer());
    } catch {
      return null;
    }
  }
  return null;
}

export async function loadFont(file: keyof typeof FONT_FILES): Promise<LoadedFont | null> {
  const name = FONT_FILES[file];
  if (cache.has(name)) return cache.get(name) ?? null;
  const bytes = await readFontBytes(name);
  const loaded = bytes
    ? { file: name, base64: toBase64(bytes), coverage: readTtfCoverage(bytes) }
    : null;
  cache.set(name, loaded);
  return loaded;
}

export type RegisteredFonts = {
  family: "NotoSans" | "helvetica";
  /** null when the embedded face is unavailable (offline fallback). */
  coverage: Set<number> | null;
  embedded: boolean;
};

/** Register Noto Sans regular/bold (and Tamil for names) on a document. */
export async function registerDeckFonts(doc: jsPDF): Promise<RegisteredFonts> {
  const regular = await loadFont("regular");
  const bold = await loadFont("bold");
  if (!regular || !bold) {
    return { family: "helvetica", coverage: null, embedded: false };
  }
  doc.addFileToVFS(regular.file, regular.base64);
  doc.addFont(regular.file, "NotoSans", "normal");
  doc.addFileToVFS(bold.file, bold.base64);
  doc.addFont(bold.file, "NotoSans", "bold");
  const tamil = await loadFont("tamil");
  if (tamil) {
    doc.addFileToVFS(tamil.file, tamil.base64);
    doc.addFont(tamil.file, "NotoSansTamil", "normal");
  }
  return { family: "NotoSans", coverage: regular.coverage, embedded: true };
}

/** Characters used by the deck that must have a glyph in the embedded face. */
export const DECK_GLYPH_PROBE = "₹→←▲▼■✓✗·–—…÷×≥≤’“”•";

/**
 * Fail the export if any string contains a character the embedded font cannot
 * draw. Returns the offending characters (empty = safe). With no coverage
 * information (offline fallback) the check is skipped rather than lying.
 */
export function missingGlyphs(
  strings: readonly string[],
  coverage: Set<number> | null,
): string[] {
  if (!coverage) return [];
  const missing = new Set<string>();
  for (const s of strings) {
    for (const ch of s) {
      const cp = ch.codePointAt(0);
      if (cp == null || cp === 10 || cp === 13) continue;
      if (!coverage.has(cp)) missing.add(ch);
    }
  }
  return [...missing];
}
