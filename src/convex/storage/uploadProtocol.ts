/**
 * UPLOAD PROTOCOL — the resumable-upload responses, decoded once.
 *
 * Pure helpers (no ctx, no fetch) so the exact wording a user sees for every
 * Drive answer is unit-tested without a Google account:
 *
 *   308            → keep going (resume offset comes from `Range`)
 *   200/201        → the file id is in the body — it MUST be recorded, or
 *                    finalise has nothing to verify and fails
 *   401 / invalid_grant  → the stored credential is no longer usable
 *   403 + storageQuotaExceeded → the Drive account is full
 *   404 / 410 / 409      → the resumable session is gone
 *   429 / 5xx            → Google is busy — retry shortly
 *
 * Every message may carry a short reference code (`ref`) the user can quote;
 * it is never a token, a Drive id or a session URI.
 */

import { FileStoreError } from "./fileStore";

/** A short, quotable code for one upload — e.g. `7K4M2Q`. */
export function uploadRefCode(random: () => Uint8Array): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = random();
  let out = "";
  for (let i = 0; i < 6; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** `… — retry (ref 7K4M2Q)` — the reference, only once. */
export function withRef(message: string, ref?: string | null): string {
  if (!ref || message.includes("ref ")) return message;
  return `${message} (ref ${ref})`;
}

/** Which Drive failure a non-2xx resumable response means, in plain words. */
export function chunkFailureFor(status: number, bodyText: string, ref?: string | null): FileStoreError {
  const body = (bodyText ?? "").slice(0, 300);
  const quota = /storageQuotaExceeded|quotaExceeded|downloadQuotaExceeded/i.test(body);
  const auth =
    status === 401 ||
    /invalid_grant|unauthorized|invalidCredentials|token.*expired/i.test(body) ||
    /Unauthorized/i.test(body);

  if (quota)
    return new FileStoreError(
      "quota_exceeded",
      withRef("Google Drive is full: ask the administrator to free space", ref),
    );
  if (auth)
    return new FileStoreError(
      "auth_revoked",
      withRef("Document storage needs reconnecting: ask the administrator, then retry this upload", ref),
    );
  // The session itself is dead (expired, cancelled or superseded).
  if (status === 404 || status === 410 || status === 409)
    return new FileStoreError(
      "rejected",
      withRef("The upload session expired — choose the file again", ref),
    );
  if (status === 403)
    return new FileStoreError(
      "rejected",
      withRef("You do not have permission to upload this document", ref),
    );
  if (status === 429 || status >= 500)
    return new FileStoreError(
      "rate_limited",
      withRef("Google Drive is busy — wait a moment and retry", ref),
    );
  if (status === 400)
    return new FileStoreError(
      "rejected",
      withRef("Google Drive rejected this file — retry, and check the file type and size", ref),
      true,
    );
  return new FileStoreError("unknown", withRef("Upload failed — retry", ref), true);
}
