/**
 * READABLE SAVE ERRORS — one message format for every save screen:
 *   Could not save: <short reason> (ref <id>)
 * The Copy action puts that exact line on the clipboard.
 */

import { toast } from "sonner";

export type SaveFailure = {
  ok: false;
  reason: string;
  requestId: string;
};

export class SaveError extends Error {
  requestId: string;

  constructor(failure: SaveFailure) {
    super(`Could not save: ${failure.reason} (ref ${failure.requestId})`);
    this.name = "SaveError";
    this.requestId = failure.requestId;
  }
}

export function isSaveFailure(value: unknown): value is SaveFailure {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { ok?: unknown }).ok === false &&
    typeof (value as { reason?: unknown }).reason === "string" &&
    typeof (value as { requestId?: unknown }).requestId === "string"
  );
}

/** Turn a server result into a thrown SaveError so the form keeps its draft. */
export function throwIfSaveFailed(result: unknown): void {
  if (isSaveFailure(result)) throw new SaveError(result);
}

function clientRef(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Short, quotable line for any thrown save error (never a raw stack trace). */
export function saveErrorText(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const clean = raw
    .replace(/\[CONVEX[^\]]*\]\s*/gi, "")
    .replace(/\[Request ID:[^\]]*\]\s*/gi, "")
    .replace(/^Uncaught Error:\s*/i, "")
    .replace(/^Server Error\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/^Could not save: .+\(ref [A-Z0-9]+\)$/i.test(clean)) return clean;
  return `Could not save: ${clean || "The change did not reach the server. Please try again."} (ref ${clientRef()})`;
}

/** Show the one-line error with a Copy action; returns it for inline notices. */
export function showSaveError(error: unknown): string {
  const message = saveErrorText(error);
  toast.error(message, {
    duration: 12000,
    action: {
      label: "Copy",
      onClick: () => void navigator.clipboard?.writeText(message),
    },
  });
  return message;
}
