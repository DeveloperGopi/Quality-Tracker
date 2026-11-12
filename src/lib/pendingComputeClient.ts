/**
 * PENDING & FOLLOW-UP — computation client.
 *
 * The same pure `computePendingIssues` runs in a Web Worker so a district of
 * 500+ facilities never freezes the page. If a Worker cannot start (SSR,
 * test runner, old browser) the identical function runs on the main thread.
 */

import {
  computePendingIssues,
  type ComputePendingOptions,
  type PendingIssue,
  type PendingRow,
} from "./pending";

const COMPUTE_TIMEOUT_MS = 20_000;

function canUseWorker(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

export function computePendingInWorker(
  rows: readonly PendingRow[],
  options: ComputePendingOptions,
): Promise<PendingIssue[]> {
  const payload = rows as PendingRow[];
  if (!canUseWorker()) return Promise.resolve(computePendingIssues(payload, options));
  return new Promise<PendingIssue[]>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./pendingWorker.ts", import.meta.url), { type: "module" });
    } catch {
      resolve(computePendingIssues(payload, options));
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
      () => finish(() => reject(new Error("Computing the pending list took too long — try again"))),
      COMPUTE_TIMEOUT_MS,
    );
    worker.onmessage = (event: MessageEvent<{ ok: boolean; issues?: PendingIssue[]; error?: string }>) => {
      const res = event.data;
      finish(() =>
        res.ok && res.issues
          ? resolve(res.issues)
          : reject(new Error(res.error || "Could not compute the pending list")),
      );
    };
    worker.onerror = () => {
      finish(() => {
        try {
          resolve(computePendingIssues(payload, options));
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Could not compute the pending list"));
        }
      });
    };
    worker.postMessage({ rows: payload, options });
  });
}
