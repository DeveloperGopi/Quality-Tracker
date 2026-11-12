/**
 * PDF text + OCR extraction for the NQAS result reader.
 *
 * Native text is tried first. A scanned page (or a page with only a page
 * number) is rendered to a canvas and passed to Tesseract in the browser.
 * The PDF and OCR workers are loaded lazily from the pinned package/CDN, so
 * opening a normal document does not download the OCR engine.
 */

import { isUsableTextLayer, linesFromWords, type OcrWord } from "./resultTextLayout";
import type { ResultPageText } from "./resultParse";

const PDFJS_VERSION = "4.10.38";
const PDF_WORKER =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export type ExtractionProgress = {
  page: number;
  total: number;
  phase: "opening" | "text" | "ocr" | "done";
  message: string;
};

export type ResultExtraction = {
  pages: ResultPageText[];
  pageCount: number;
  textPages: number;
  ocrPages: number;
};

type PdfTextItem = { str: string; transform: number[] };

function textFromItems(items: readonly PdfTextItem[]): string {
  const lines = new Map<number, { x: number; text: string }[]>();
  for (const item of items) {
    if (!item.str?.trim()) continue;
    const y = Math.round(item.transform[5] ?? 0);
    const row = lines.get(y) ?? [];
    row.push({ x: item.transform[4] ?? 0, text: item.str });
    lines.set(y, row);
  }
  return [...lines.entries()]
    .sort(([a], [b]) => b - a)
    .map(([, row]) =>
      row
        .sort((a, b) => a.x - b.x)
        .map((part) => part.text.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .join("\n");
}

type TesseractWord = {
  text?: string;
  confidence?: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
};
type TesseractBlock = { paragraphs?: { lines?: { words?: TesseractWord[] }[] }[] };

function wordsFromOcr(data: {
  words?: TesseractWord[];
  blocks?: TesseractBlock[] | null;
}): OcrWord[] {
  const direct: OcrWord[] = [];
  for (const word of data.words ?? []) {
    const box = word.bbox;
    if (!word.text || !box) continue;
    direct.push({
      text: word.text,
      x0: box.x0,
      y0: box.y0,
      x1: box.x1,
      y1: box.y1,
      confidence: word.confidence,
    });
  }
  if (direct.length > 0) return direct;
  const nested: OcrWord[] = [];
  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          const box = word.bbox;
          if (!word.text || !box) continue;
          nested.push({
            text: word.text,
            x0: box.x0,
            y0: box.y0,
            x1: box.x1,
            y1: box.y1,
            confidence: word.confidence,
          });
        }
      }
    }
  }
  return nested;
}

/** Open the PDF (authenticated URL or a local File) and return page text. */
export async function extractResultPdf(
  source: File | string,
  onProgress?: (progress: ExtractionProgress) => void,
): Promise<ResultExtraction> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER;
  onProgress?.({ page: 0, total: 0, phase: "opening", message: "Opening the PDF…" });

  const loading = pdfjs.getDocument(
    typeof source === "string"
      ? { url: source, isEvalSupported: false }
      : { data: new Uint8Array(await source.arrayBuffer()), isEvalSupported: false },
  );
  const doc = await loading.promise;
  const pages: ResultPageText[] = [];
  let textPages = 0;
  let ocrPages = 0;
  let worker: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>> | null = null;

  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      onProgress?.({
        page: pageNumber,
        total: doc.numPages,
        phase: "text",
        message: `Reading page ${pageNumber} of ${doc.numPages}…`,
      });
      const content = await page.getTextContent();
      const items: PdfTextItem[] = content.items
        .filter((item) => "str" in item)
        .map((item) => ({
          str: (item as { str: string }).str,
          transform: (item as { transform: number[] }).transform,
        }));
      const nativeText = textFromItems(items);
      if (isUsableTextLayer(nativeText)) {
        pages.push({ pageNumber, text: nativeText, confidence: 100 });
        textPages += 1;
        continue;
      }

      onProgress?.({
        page: pageNumber,
        total: doc.numPages,
        phase: "ocr",
        message: `Scanned page ${pageNumber} — running OCR…`,
      });
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The browser could not prepare a page for OCR.");
      await page.render({ canvasContext: context, viewport }).promise;

      if (!worker) {
        const { createWorker } = await import("tesseract.js");
        worker = await createWorker("eng", 1, {
          logger: (message) => {
            if (message.status === "recognizing text") {
              onProgress?.({
                page: pageNumber,
                total: doc.numPages,
                phase: "ocr",
                message: `OCR page ${pageNumber} · ${Math.round((message.progress ?? 0) * 100)}%`,
              });
            }
          },
        });
      }
      const result = await worker.recognize(canvas, {}, { text: true, blocks: true });
      const data = result.data as {
        text?: string;
        confidence?: number;
        words?: TesseractWord[];
        blocks?: TesseractBlock[] | null;
      };
      const words = wordsFromOcr(data);
      const laidOut = words.length > 0 ? linesFromWords(words).join("\n") : "";
      const text = laidOut || (data.text ?? "").trim();
      if (!text) {
        pages.push({
          pageNumber,
          text: `[Page ${pageNumber}: OCR found no readable text]`,
          confidence: Math.round(data.confidence ?? 0),
        });
      } else {
        pages.push({
          pageNumber,
          text,
          confidence: Math.round(
            words.length
              ? words.reduce((sum, word) => sum + (word.confidence ?? 0), 0) / words.length
              : (data.confidence ?? 0),
          ),
        });
      }
      ocrPages += 1;
    }
    onProgress?.({
      page: doc.numPages,
      total: doc.numPages,
      phase: "done",
      message: `Read ${pages.length} page${pages.length === 1 ? "" : "s"}.`,
    });
    return { pages, pageCount: doc.numPages, textPages, ocrPages };
  } finally {
    if (worker) await worker.terminate().catch(() => undefined);
    await doc.destroy().catch(() => undefined);
  }
}
