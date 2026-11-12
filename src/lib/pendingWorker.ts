/** Web Worker half of the /pending computation (500+ rows stay off the UI thread). */

import {
  computePendingIssues,
  type ComputePendingOptions,
  type PendingIssue,
  type PendingRow,
} from "./pending";

type Request = { rows: PendingRow[]; options: ComputePendingOptions };

self.onmessage = (event: MessageEvent<Request>) => {
  try {
    const { rows, options } = event.data;
    const issues: PendingIssue[] = computePendingIssues(rows, options);
    self.postMessage({ ok: true, issues });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : "Could not compute issues" });
  }
};
