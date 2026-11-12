/**
 * UPLOAD TRANSPORT — the ONE place the browser's upload requests are addressed.
 *
 * Every request an upload makes is bound here: `begin`, each chunk, `finalize`
 * and `cancel` are this app's own backend actions (`documents.*`). There is no
 * second upload address — no Google resumable URI, no Drive id and no token
 * ever reaches the browser, which is why the CORS-blocked direct PUT (and its
 * bare "Failed to fetch") is gone for good.
 *
 * Sizes and the user-facing wording stay in `lib/uploadConfig` so the server
 * and this transport cannot disagree.
 */

import type { UploadTransport } from "./uploadDocuments";

/** The exact backend actions an upload uses — injected, never built inline. */
export type UploadActions = {
  begin: (input: {
    facilityId: never;
    docKey: string;
    cycleNo?: number;
    originalName: string;
    declaredMime: string;
    declaredSize: number;
    uploadKey: string;
  }) => Promise<{ uploadKey: string; received?: number; ref?: string }>;
  putChunk: (input: {
    uploadKey: string;
    offset: number;
    bytes: ArrayBuffer;
    final: boolean;
  }) => Promise<{ received: number; done: boolean }>;
  finalize: (input: { uploadKey: string }) => Promise<{
    documentId: string;
    duplicate?: boolean;
    message?: string;
  }>;
  cancel: (input: { uploadKey: string }) => Promise<unknown>;
};

/** A Uint8Array view → the exact ArrayBuffer the action should carry. */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

export function createUploadTransport(
  actions: UploadActions,
  facilityId: string,
): UploadTransport {
  return {
    begin: (input) =>
      actions.begin({ ...input, facilityId: facilityId as never }),
    putChunk: async ({ uploadKey, bytes, offset, total }) => {
      const result = await actions.putChunk({
        uploadKey,
        offset,
        bytes: toArrayBuffer(bytes),
        final: offset + bytes.length >= total,
      });
      return { next: result.received, done: result.done };
    },
    finalize: (uploadKey) => actions.finalize({ uploadKey }),
    cancel: async (uploadKey) => {
      await actions.cancel({ uploadKey });
    },
  };
}
