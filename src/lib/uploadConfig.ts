/**
 * UPLOAD — the ONE place the browser's upload wiring and wording live.
 *
 * Root cause this fixes: `beginUpload` used to hand the browser Google's
 * resumable session URI and the browser PUT each chunk straight to
 * `https://www.googleapis.com/upload/drive/v3/files?...&upload_id=…`. That
 * cross-origin PUT with a `Content-Range` header needs a CORS preflight, and
 * Google's upload endpoint does not answer one for the app origin — the fetch
 * is blocked before a response exists, which the browser reports as the bare
 * `TypeError: Failed to fetch`. Every retry repeated the same blocked request.
 *
 * So: all bytes go to THIS app's backend (the one binding point is
 * `lib/uploadTransport`), which streams each chunk to Drive. The browser never
 * receives a Google upload URL, a Drive id or a token.
 *
 * The chunk size is shared by the browser and the server
 * (`convex/storage/uploadSession.ts` re-exports it), so a change here moves
 * both sides together.
 */

export const UPLOAD = {
  /** 4 MB — a multiple of 256 KB, as Drive's resumable protocol requires. */
  chunkBytes: 4 * 1024 * 1024,
  /** Chunk attempts before the upload is reported as failed. */
  maxAttempts: 4,
} as const;

export const UPLOAD_CHUNK_BYTES = UPLOAD.chunkBytes;

/* -------------------------------------------------------------------------- */
/* Wording — one sentence per failure the user can actually act on            */
/* -------------------------------------------------------------------------- */

/** Storage is off (nothing stored, or the refresh token was never saved). */
export const STORAGE_NOT_CONNECTED =
  "Document storage is not connected: ask the administrator";

/** A token exists but Google refused it (revoked, expired, rotated key). */
export const STORAGE_NEEDS_RECONNECT =
  "Document storage needs reconnecting: ask the administrator, then retry this upload";

export const NETWORK_ERROR =
  "Could not reach the server — check your connection and retry";

export const UPLOAD_FAILED = "The upload failed — retry, or ask the administrator";

export const UPLOAD_CANCELLED = "Upload cancelled — the file was not saved";

/** The catch-all when the server could not be understood. */
export const SERVER_ERROR = "The server could not process the upload — retry";

/** `… (ref 7K4M2Q)` — the short code a user can quote, added once. */
export { withRef } from "../convex/storage/uploadProtocol";

/** A browser fetch/websocket failure — never a server sentence. */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  const text = err instanceof Error ? err.message : String(err);
  return /failed to fetch|fetch failed|networkerror|network error|load failed|err_network|econnreset|enotfound/i.test(
    text,
  );
}

/**
 * Should the same chunk be tried again? A definitive answer (not connected,
 * wrong type, too large, no permission) is NOT retried — the user gets the
 * sentence immediately instead of five silent attempts.
 */
export function isRetryableUploadError(err: unknown): boolean {
  if (isNetworkError(err)) return true;
  const text = (err instanceof Error ? err.message : String(err ?? "")) + " " + String((err as { data?: unknown })?.data ?? "");
  if (
    /not connected|not_configured|refresh token|reconnect|revoked|invalid_grant|permission|not allowed|outside your assigned|paused|must be|larger than|is empty|already uploaded|unknown document type|session expired|checksum|stalled/i.test(
      text,
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Turn a transport/API error into the sentence the user needs. Server messages
 * arrive already worded (the upload actions throw ConvexError), so they pass
 * through; only transport failures and redacted errors are replaced.
 *
 * Tokens, Drive ids and session URIs are never part of an error message.
 */
export function friendlyUploadError(err: unknown): string {
  const text = (err instanceof Error ? err.message : String(err ?? "")).trim();
  const data =
    typeof (err as { data?: unknown })?.data === "string"
      ? String((err as { data?: unknown }).data)
      : "";
  const message = data || text;

  // The server words its own errors and tags them `… (ref 7K4M2Q)`. A mapped
  // sentence below must not lose that code — it is what the user quotes.
  const ref = /\(ref [A-Za-z0-9]{4,12}\)/.exec(message)?.[0] ?? "";
  const keep = (sentence: string) =>
    ref && !sentence.includes(ref) ? `${sentence} ${ref}` : sentence;

  if (isNetworkError(err)) return NETWORK_ERROR;
  if (/root folder|not set up/i.test(message))
    return keep("Document storage is not set up: the root folder is missing in Settings → Google Drive");
  if (/not connected|not_configured|unavailable|no refresh token|not configured/i.test(message))
    return keep(STORAGE_NOT_CONNECTED);
  // "expired" alone is NOT a reconnect: an upload session can expire too.
  if (/revoked|invalid_grant|reconnect|stored google credential|google access/i.test(message))
    return keep(STORAGE_NEEDS_RECONNECT);
  if (/quota|storage full|out of space/i.test(message))
    return keep("Google Drive is full: ask the administrator to free space");
  if (/rate limit|too many requests|busy/i.test(message))
    return keep("Google Drive is busy — wait a moment and retry");
  if (/permission|not allowed|forbidden|outside your assigned/i.test(message))
    return keep("You do not have permission to upload this document");
  // Redacted server errors ("Server Error / Called by client / Request ID …")
  // carry no information for the user; keep the actionable fallback instead.
  if (/server error|request id|called by client|unexpected/i.test(message)) return SERVER_ERROR;
  return message || UPLOAD_FAILED;
}
