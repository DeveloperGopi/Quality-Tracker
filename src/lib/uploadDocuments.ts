/**
 * BROWSER UPLOAD — chunks a file through THIS app's backend.
 *
 * 1. `begin` asks our backend for an upload session (role, scope, size and the
 *    Drive connection are checked there). The backend keeps the Drive session
 *    URI; the browser never sees it.
 * 2. Each chunk is sent to the backend (`documents.uploadChunk`), which streams
 *    it to Drive and answers with the offset Drive accepted. A dropped
 *    connection resumes from that offset — never from zero, and never as a
 *    second file (the upload key is idempotent).
 * 3. Only after the last chunk does the backend finalise: size, checksum, real
 *    type and SHA-256 are verified before the document is attached.
 *
 * The transport is injected so the retry/resume logic is unit-tested without a
 * browser or a Drive account.
 */

import { UPLOAD, isRetryableUploadError } from "./uploadConfig";

export type BeginResult = {
  uploadKey: string;
  /** Bytes the backend already holds for this key (resume position). */
  received?: number;
  /** Short quotable code for this upload (never a token or a Drive id). */
  ref?: string;
};

export type UploadTransport = {
  begin: (input: {
    facilityId: string;
    docKey: string;
    cycleNo?: number;
    originalName: string;
    declaredMime: string;
    declaredSize: number;
    uploadKey: string;
  }) => Promise<BeginResult>;
  /** The only upload address: our backend, which forwards the chunk to Drive. */
  putChunk: (input: {
    uploadKey: string;
    bytes: Uint8Array;
    offset: number;
    total: number;
  }) => Promise<{ next: number; done: boolean }>;
  finalize: (uploadKey: string) => Promise<{
    documentId: string;
    /** Same bytes as the CURRENT file: not an error, no Retry. */
    duplicate?: boolean;
    message?: string;
  }>;
  cancel: (uploadKey: string) => Promise<void>;
};

export type UploadProgress = {
  stage: "starting" | "uploading" | "verifying" | "done" | "retrying";
  sent: number;
  total: number;
  attempt?: number;
};

/** A stable key for one upload attempt: retrying the same file reuses it. */
export function uploadKeyFor(
  facilityId: string,
  docKey: string,
  file: { name: string; size: number; lastModified?: number },
): string {
  return [
    facilityId,
    docKey,
    file.name.replace(/[^\w.-]+/g, "_").slice(0, 40),
    file.size,
    file.lastModified ?? 0,
  ].join("-");
}

/**
 * Upload one file end to end. `signal` cancels: the partial Drive session is
 * aborted so nothing is left behind.
 */
export async function uploadDocument(
  input: {
    facilityId: string;
    docKey: string;
    cycleNo?: number;
    file: { name: string; size: number; type: string; lastModified?: number };
    bytes: () => Promise<Uint8Array>;
    uploadKey?: string;
  },
  transport: UploadTransport,
  onProgress?: (p: UploadProgress) => void,
  signal?: { aborted: boolean },
  /** Called as soon as the backend answers `begin`, so the UI can show the
   *  reference code even if a later chunk fails. */
  onBegin?: (begin: BeginResult) => void,
): Promise<{ documentId: string; ref?: string; duplicate?: boolean; message?: string }> {
  const uploadKey = input.uploadKey ?? uploadKeyFor(input.facilityId, input.docKey, input.file);
  const total = input.file.size;
  onProgress?.({ stage: "starting", sent: 0, total });

  const begun = await transport.begin({
    facilityId: input.facilityId,
    docKey: input.docKey,
    cycleNo: input.cycleNo,
    originalName: input.file.name,
    declaredMime: input.file.type || "application/octet-stream",
    declaredSize: total,
    uploadKey,
  });
  onBegin?.(begun);

  const data = await input.bytes();
  // A Retry resumes at the byte Drive already holds — never from zero.
  let offset = Math.max(0, Math.min(begun.received ?? 0, total));

  while (offset < total) {
    if (signal?.aborted) {
      await transport.cancel(uploadKey);
      throw new Error("Upload cancelled");
    }
    const chunk = data.subarray(offset, Math.min(offset + UPLOAD.chunkBytes, total));
    let attempt = 0;
    for (;;) {
      try {
        const result = await transport.putChunk({ uploadKey, bytes: chunk, offset, total });
        if (result.next <= offset && offset < total) {
          // Drive accepted nothing: never spin on the same offset.
          throw new Error("The upload stalled — retry");
        }
        offset = result.next;
        break;
      } catch (err) {
        attempt += 1;
        // A definitive answer (not connected, wrong type, too large, stopped)
        // is shown at once; only transport failures are retried.
        if (attempt > UPLOAD.maxAttempts || !isRetryableUploadError(err)) throw err;
        // "Waiting to retry" — the UI shows this, never a silent failure.
        onProgress?.({ stage: "retrying", sent: offset, total, attempt });
        await new Promise((resolve) => setTimeout(resolve, Math.min(8000, 400 * 2 ** attempt)));
      }
    }
    onProgress?.({ stage: "uploading", sent: offset, total });
  }

  onProgress?.({ stage: "verifying", sent: total, total });
  const done = await transport.finalize(uploadKey);
  onProgress?.({ stage: "done", sent: total, total });
  return { ...done, ref: begun.ref };
}
