/**
 * OCR layout helpers — pure and browser-free.
 *
 * A scanned NQAS PDF has no text layer. OCR returns word boxes, not sentences;
 * grouping them by vertical position and preserving horizontal gaps is what
 * keeps a table's cells from being flattened into one misleading sentence.
 */

export type OcrWord = {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  confidence?: number;
};

export type OcrLine = {
  text: string;
  y: number;
  confidence: number;
  words: OcrWord[];
};

function cleanWord(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * A PDF text layer is usable only when it contains enough real prose. Page
 * numbers, watermarks and a lone heading are treated as an empty layer so the
 * image-only path runs instead.
 */
export function isUsableTextLayer(text: string): boolean {
  const clean = text.replace(/\f/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return false;
  const letters = clean.replace(/[^A-Za-z]/g, "").length;
  const words = clean.split(" ").filter((word) => /[A-Za-z]{2,}/.test(word));
  if (letters < 28 || words.length < 6) return false;
  return /nqas|national\s+quality|quality\s+assurance|assessment|annexure|facility|score|certif/i.test(
    clean,
  );
}

/** Rebuild lines from OCR word boxes while retaining table-column spacing. */
export function linesFromWords(words: readonly OcrWord[]): string[] {
  const usable = words
    .map((word) => ({ ...word, text: cleanWord(word.text) }))
    .filter((word) => word.text.length > 0)
    .sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const groups: OcrWord[][] = [];
  for (const word of usable) {
    const height = Math.max(1, word.y1 - word.y0);
    const line = groups.find((group) => {
      const anchor = group[0];
      if (!anchor) return false;
      const anchorHeight = Math.max(1, anchor.y1 - anchor.y0);
      return Math.abs(anchor.y0 - word.y0) <= Math.max(4, Math.min(height, anchorHeight) * 0.55);
    });
    if (line) line.push(word);
    else groups.push([word]);
  }

  return groups
    .map((group) => {
      const ordered = [...group].sort((a, b) => a.x0 - b.x0);
      let text = "";
      let previous: OcrWord | null = null;
      for (const word of ordered) {
        if (previous) {
          const gap = Math.max(0, word.x0 - previous.x1);
          // 8px is roughly one character at the OCR render scale. A large
          // horizontal gap is a table-cell boundary, not a missing letter.
          const spaces = Math.max(1, Math.min(14, Math.round(gap / 8)));
          text += " ".repeat(spaces);
        }
        text += word.text;
        previous = word;
      }
      return { text, y: Math.min(...ordered.map((word) => word.y0)) };
    })
    .sort((a, b) => a.y - b.y)
    .map((line) => line.text);
}
