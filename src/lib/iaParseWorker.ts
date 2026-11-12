/**
 * IA / SaQsham SHEET PARSING — the Web Worker half.
 *
 * A 10 MB workbook or a 2,000-row paste never blocks the page: the clipboard
 * text (or the file's bytes) is sent here, parsed off the main thread, and the
 * plain ParsedSheet comes back. NOTHING is logged — the paste can carry staff
 * names and scores.
 *
 * The same shared parser the SaQsham import uses (lib/saqshamParse) runs here,
 * so both importers read a sheet IDENTICALLY (header detection, duplicate
 * header names, trailing blank rows, encoding).
 */

import { parsePastedText, parseSaqshamFile, type ParsedSheet } from "./saqshamParse";

type WorkerRequest =
  | { kind: "text"; text: string }
  | { kind: "file"; fileName: string; buffer: ArrayBuffer };

type WorkerResponse =
  | { ok: true; sheet: ParsedSheet }
  | { ok: false; error: string };

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  try {
    let sheet: ParsedSheet;
    if (req.kind === "text") {
      sheet = parsePastedText(req.text);
    } else {
      const file = new File([req.buffer], req.fileName, { type: "" });
      sheet = await parseSaqshamFile(file);
    }
    const res: WorkerResponse = { ok: true, sheet };
    self.postMessage(res);
  } catch (err) {
    const res: WorkerResponse = {
      ok: false,
      error: err instanceof Error ? err.message : "Could not read the file",
    };
    self.postMessage(res);
  }
};
