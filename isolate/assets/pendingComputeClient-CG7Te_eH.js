import { bo as computePendingIssues } from './AppShell-CP099uvN.js';

const COMPUTE_TIMEOUT_MS = 2e4;
function canUseWorker() {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}
function computePendingInWorker(rows, options) {
  const payload = rows;
  if (!canUseWorker()) return Promise.resolve(computePendingIssues(payload, options));
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(new URL(/* @vite-ignore */ "/assets/pendingWorker-C_oWk8_G.js", import.meta.url), { type: "module" });
    } catch {
      resolve(computePendingIssues(payload, options));
      return;
    }
    let done = false;
    const finish = (fn) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      worker.terminate();
      fn();
    };
    const timer = window.setTimeout(
      () => finish(() => reject(new Error("Computing the pending list took too long — try again"))),
      COMPUTE_TIMEOUT_MS
    );
    worker.onmessage = (event) => {
      const res = event.data;
      finish(
        () => res.ok && res.issues ? resolve(res.issues) : reject(new Error(res.error || "Could not compute the pending list"))
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

export { computePendingInWorker as c };
