/**
 * IA IMPORT — the main-thread client for the parsing Web Worker.
 *
 * `parseIaPaste` and `parseIaFile` behave exactly like the synchronous shared
 * parsers, but run in `iaParseWorker` so a large paste / workbook never freezes
 * the page. If a Worker is unavailable (old browser, test runner, SSR) they
 * fall back to the SAME shared functions — identical output either way.
 *
 * Never logs the pasted text or the file's bytes.
 */

import {
  parsePastedText,
  parseSaqshamFile,
  type ParsedSheet,
} from "./saqshamParse";

type WorkerResponse =
  | { ok: true; sheet: ParsedSheet }
  | { ok: false; error: string };

const PARSE_TIMEOUT_MS = 20_000;

function canUseWorker(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

function runInWorker(payload: { kind: "text"; text: string } | { kind: "file"; fileName: string; buffer: ArrayBuffer }): Promise<ParsedSheet> {
  return new Promise<ParsedSheet>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./iaParseWorker.ts", import.meta.url), { type: "module" });
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Could not start the parser"));
      return;
    }
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      worker.terminate();
      fn();
    };
    const timer = window.setTimeout(
      () => finish(() => reject(new Error("Parsing took too long — try a smaller file"))),
      PARSE_TIMEOUT_MS,
    );
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const res = event.data;
      finish(() => (res.ok ? resolve(res.sheet) : reject(new Error(res.error))));
    };
    worker.onerror = (event) => {
      finish(() => reject(new Error(event.message || "Could not read the sheet")));
    };
    if (payload.kind === "file") {
      worker.postMessage(payload, [payload.buffer]);
    } else {
      worker.postMessage(payload);
    }
  });
}

/** Parse pasted clipboard text (tab-separated by convention) in a Worker. */
export async function parseIaPaste(text: string): Promise<ParsedSheet> {
  if (!canUseWorker()) return parsePastedText(text);
  try {
    return await runInWorker({ kind: "text", text });
  } catch {
    // The Worker path must never be the reason an import fails.
    return parsePastedText(text);
  }
}

/** Read a .xlsx / .xls / .csv / .tsv / .txt file in a Worker. */
export async function parseIaFile(file: File): Promise<ParsedSheet> {
  if (!canUseWorker()) return parseSaqshamFile(file);
  try {
    const buffer = await file.arrayBuffer();
    return await runInWorker({ kind: "file", fileName: file.name, buffer });
  } catch {
    return parseSaqshamFile(file);
  }
}
