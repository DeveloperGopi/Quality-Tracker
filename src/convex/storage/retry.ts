/**
 * DRIVE RETRY — exponential backoff with jitter.
 *
 * Google answers a busy project with 403 `rateLimitExceeded` /
 * `userRateLimitExceeded`, 429 or a 5xx. Those are retried; everything else
 * (auth revoked, quota exceeded, 404, a rejected file) is surfaced at once,
 * because retrying cannot fix it.
 *
 * `sleep` and the RNG are injected so tests run instantly and deterministically
 * while the UI still gets its "Waiting to retry" signal.
 */

export class DriveHttpError extends Error {
  status: number;
  reason: string;
  bodyText: string;
  constructor(status: number, reason: string, bodyText = "") {
    super(`Drive request failed (${status}${reason ? ` ${reason}` : ""})`);
    this.name = "DriveHttpError";
    this.status = status;
    this.reason = reason;
    this.bodyText = bodyText.slice(0, 500);
  }
}

const RATE_REASONS = new Set([
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "dailyLimitExceeded",
  "quotaExceeded",
  "backendError",
  "internalError",
]);

export function isRetryable(err: unknown): boolean {
  if (!(err instanceof DriveHttpError)) {
    // Network failures (fetch throws TypeError / "fetch failed") are retryable.
    return err instanceof TypeError || (err instanceof Error && /network|fetch/i.test(err.message));
  }
  if (err.status === 429) return true;
  if (err.status >= 500) return true;
  if (err.status === 403) {
    if (RATE_REASONS.has(err.reason)) return true;
    // A plain 403 with no rate reason is a permission problem: do not retry.
    return /rateLimit|quota/i.test(err.bodyText);
  }
  return false;
}

export type RetryInfo = { attempt: number; delayMs: number; error: unknown };

export type RetryOptions = {
  attempts?: number;
  baseMs?: number;
  maxMs?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  onRetry?: (info: RetryInfo) => void;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Run `fn`, retrying retryable Drive failures. Returns the first success. */
export async function withDriveRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 5);
  const baseMs = opts.baseMs ?? 300;
  const maxMs = opts.maxMs ?? 8_000;
  const sleep = opts.sleep ?? defaultSleep;
  const random = opts.random ?? Math.random;

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === attempts - 1) throw err;
      const exponential = Math.min(maxMs, baseMs * 2 ** attempt);
      // Full jitter: half fixed, half random — never a thundering herd.
      const delayMs = Math.round(exponential * (0.5 + random() * 0.5));
      opts.onRetry?.({ attempt: attempt + 1, delayMs, error: err });
      await sleep(delayMs);
    }
  }
  throw lastError;
}
