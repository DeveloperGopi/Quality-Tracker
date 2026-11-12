const FONT_FILES = {
  regular: "NotoSans-Regular.ttf",
  bold: "NotoSans-Bold.ttf",
  tamil: "NotoSansTamil-Regular.ttf",
  /** Latin + Tamil in one face — used by the Links Organiser PDF. */
  tamilMerged: "NotoSansTamil-RegularMerged.ttf"
};
const cache = /* @__PURE__ */ new Map();
function readTtfCoverage(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const covered = /* @__PURE__ */ new Set();
  const numTables = view.getUint16(4);
  let cmapOffset = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(
      bytes[rec],
      bytes[rec + 1],
      bytes[rec + 2],
      bytes[rec + 3]
    );
    if (tag === "cmap") {
      cmapOffset = view.getUint32(rec + 8);
      break;
    }
  }
  if (cmapOffset < 0 || cmapOffset + 4 > bytes.length) return covered;
  const numSub = view.getUint16(cmapOffset + 2);
  const subtables = [];
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
        if (end === 65535 && start === 65535) continue;
        for (let cp = start; cp <= end; cp++) {
          if (rangeOffset === 0) {
            const glyph = cp + delta & 65535;
            if (glyph !== 0) covered.add(cp);
          } else {
            const addr = rangeBase + s * 2 + rangeOffset + (cp - start) * 2;
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
function toBase64(bytes) {
  let binary = "";
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk))
    );
  }
  return btoa(binary);
}
async function readFontBytes(file) {
  const BunGlobal = globalThis.Bun;
  if (BunGlobal) {
    try {
      const buf = await BunGlobal.file(`public/fonts/${file}`).arrayBuffer();
      return new Uint8Array(buf);
    } catch {
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
async function loadFont(file) {
  const name = FONT_FILES[file];
  if (cache.has(name)) return cache.get(name) ?? null;
  const bytes = await readFontBytes(name);
  const loaded = bytes ? { file: name, base64: toBase64(bytes), coverage: readTtfCoverage(bytes) } : null;
  cache.set(name, loaded);
  return loaded;
}
async function registerDeckFonts(doc) {
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
const DECK_GLYPH_PROBE = "₹→←▲▼■✓✗·–—…÷×≥≤’“”•";
function missingGlyphs(strings, coverage) {
  if (!coverage) return [];
  const missing = /* @__PURE__ */ new Set();
  for (const s of strings) {
    for (const ch of s) {
      const cp = ch.codePointAt(0);
      if (cp == null || cp === 10 || cp === 13) continue;
      if (!coverage.has(cp)) missing.add(ch);
    }
  }
  return [...missing];
}

export { DECK_GLYPH_PROBE, loadFont, missingGlyphs, readTtfCoverage, registerDeckFonts };
