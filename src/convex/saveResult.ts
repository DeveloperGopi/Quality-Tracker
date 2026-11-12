/**
 * SAVE RESULT — every save mutation answers with a short, quotable failure
 * instead of leaking a stack trace or a raw “Server Error”.
 *
 * A successful handler keeps its own return value wrapped in `{ ok: true }`.
 * A failure returns `{ ok: false, reason, requestId }` and writes the full
 * error to the server log under the same reference.
 */

export type SaveFailure = {
  ok: false;
  reason: string;
  requestId: string;
};

export type SaveSuccess<T> = {
  ok: true;
  value: T;
};

export function shortSaveReason(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const clean = raw
    .replace(/^Uncaught Error:\s*/i, "")
    .replace(/\s*Called by client[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "The change could not be saved. Please try again.";
  return clean.length > 180 ? `${clean.slice(0, 177)}…` : clean;
}

export function newSaveRef(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function saveFailure(error: unknown, requestId = newSaveRef()): SaveFailure {
  const reason = shortSaveReason(error);
  console.error(`[save ${requestId}] ${reason}`, error);
  return { ok: false, reason, requestId };
}

/**
 * Wrap a save handler. Validation and permission errors are returned as a
 * short reason; the full object stays in the server log only.
 */
export function withSaveFailure<Ctx, Args, Result>(
  handler: (ctx: Ctx, args: Args) => Promise<Result>,
): (ctx: Ctx, args: Args) => Promise<SaveSuccess<Result> | SaveFailure> {
  return async (ctx, args) => {
    try {
      return { ok: true, value: await handler(ctx, args) };
    } catch (error) {
      return saveFailure(error);
    }
  };
}

