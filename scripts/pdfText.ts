/**
 * PDF TEXT EXTRACTION (test helper, not a test file).
 *
 * The facility sheet embeds Noto Sans, so every glyph reaches the page as a
 * hex CID inside `<…> Tj` and raw byte searches (`text.toContain("Report ID")`)
 * can no longer see any wording. This decodes the way a reader does:
 *
 *   page resources  /Fnn <font object>      →  /ToUnicode <cmap object>
 *   content stream  /Fnn 8.5 Tf  <0031…> Tj →  decode with that font's map
 *
 * Enough of the PDF spec to read our own jsPDF output, and nothing more.
 */

type Map2 = Map<number, string>;

function objects(raw: string): Map<number, string> {
  const out = new Map<number, string>();
  const re = /(\d+) 0 obj\b([\s\S]*?)endobj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) out.set(Number(m[1]), m[2]);
  return out;
}

function streamOf(block: string): string {
  const m = /stream\r?\n([\s\S]*?)\r?\nendstream/.exec(block);
  return m ? m[1] : "";
}

/** `beginbfchar` / `beginbfrange` → glyph id → character. */
function parseCMap(cmap: string): Map2 {
  const map: Map2 = new Map();
  const hexToStr = (hex: string): string => {
    let s = "";
    for (let i = 0; i + 3 < hex.length + 1; i += 4) {
      const code = Number.parseInt(hex.slice(i, i + 4), 16);
      if (Number.isFinite(code)) s += String.fromCodePoint(code);
    }
    return s;
  };
  for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      map.set(Number.parseInt(pair[1], 16), hexToStr(pair[2]));
    }
  }
  for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const range of block[1].matchAll(
      /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g,
    )) {
      const from = Number.parseInt(range[1], 16);
      const to = Number.parseInt(range[2], 16);
      const start = Number.parseInt(range[3], 16);
      for (let cp = from; cp <= to && cp - from < 4096; cp += 1) {
        map.set(cp, String.fromCodePoint(start + (cp - from)));
      }
    }
  }
  return map;
}

/**
 * Every string drawn by the document, in drawing order, one line per text
 * show operation. Latin1 input (as built by the tests) or raw bytes.
 */
export function pdfText(input: ArrayBuffer | Uint8Array | string): string {
  const raw =
    typeof input === "string" ? input : Buffer.from(input as ArrayBuffer).toString("latin1");

  const objs = objects(raw);

  // Font object → its ToUnicode map.
  const fontMaps = new Map<number, Map2>();
  for (const [id, block] of objs) {
    const t = /\/ToUnicode\s+(\d+) 0 R/.exec(block);
    if (!t) continue;
    const cmapBlock = objs.get(Number(t[1]));
    if (cmapBlock) fontMaps.set(id, parseCMap(streamOf(cmapBlock)));
  }

  // Resource name (/F17) → font object id, from every /Font << … >> dict.
  const nameToFont = new Map<string, number>();
  for (const block of objs.values()) {
    for (const dict of block.matchAll(/\/Font\s*<<([\s\S]*?)>>/g)) {
      for (const ref of dict[1].matchAll(/\/(F\d+)\s+(\d+) 0 R/g)) {
        nameToFont.set(ref[1], Number(ref[2]));
      }
    }
  }

  // Every content stream that draws text.
  const chunks: string[] = [];
  for (const [, block] of objs) {
    if (!/\/Type\s*\/Page\b/.test(block)) {
      // Page objects hold /Contents; the stream itself has no /Type /Page.
    }
    const content = streamOf(block);
    if (!content.includes("BT")) continue;

    let current: Map2 | null = null;
    const flush = (text: string) => {
      if (text) chunks.push(text);
    };
    const tokens = content.match(
      /\/F\d+\s+[\d.]+\s+Tf|<[0-9a-fA-F]+>\s*Tj|\([^)]*\)\s*Tj|T\*|T[dD]|ET|TJ/g,
    );
    if (!tokens) continue;
    for (const token of tokens) {
      const tf = /^\/(F\d+)\s/.exec(token);
      if (tf) {
        current = fontMaps.get(nameToFont.get(tf[1]) ?? -1) ?? null;
        continue;
      }
      const hex = /^<([0-9a-fA-F]+)>\s*Tj$/.exec(token);
      if (hex) {
        let out = "";
        const data = hex[1];
        for (let i = 0; i + 3 < data.length; i += 4) {
          const cid = Number.parseInt(data.slice(i, i + 4), 16);
          const mapped = current?.get(cid);
          out += mapped ?? "";
        }
        flush(out);
        continue;
      }
      const lit = /^\(([\s\S]*)\)\s*Tj$/.exec(token);
      if (lit) {
        flush(lit[1]);
        continue;
      }
      if (token === "T*" || token === "Td" || token === "TD" || token === "ET") flush("\n");
    }
  }

  return chunks
    .join("")
    .replace(/ +\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
