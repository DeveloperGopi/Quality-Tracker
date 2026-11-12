/**
 * LINKS IMPORT — clipboard parsing client.
 *
 * Large TSV/CSV pastes run in the same kind of Web Worker the other importers
 * use, so the page never freezes. If a Worker cannot start (SSR, old browser,
 * test runner) the SAME pure `parseLinksText` runs on the main thread.
 */

import { parseLinksText, type LinksMatrix } from "./linksImport";

const PARSE_TIMEOUT_MS = 20_000;

function canUseWorker(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

export function parseLinksPaste(text: string): Promise<LinksMatrix> {
  if (!canUseWorker()) return Promise.resolve(parseLinksText(text));
  return new Promise<LinksMatrix>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./linksParseWorker.ts", import.meta.url), { type: "module" });
    } catch {
      resolve(parseLinksText(text));
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
      () => finish(() => reject(new Error("Parsing took too long — try a smaller paste"))),
      PARSE_TIMEOUT_MS,
    );
    worker.onmessage = (event: MessageEvent<{ ok: boolean; matrix?: LinksMatrix; error?: string }>) => {
      const res = event.data;
      finish(() => (res.ok && res.matrix ? resolve(res.matrix) : reject(new Error(res.error || "Could not read the paste"))));
    };
    worker.onerror = (event) => {
      finish(() => {
        // The Worker is an optimisation; the shared parser is the contract.
        try {
          resolve(parseLinksText(text));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(event.message || "Could not read the paste"));
        }
      });
    };
    worker.postMessage({ kind: "text", text });
  });
}
