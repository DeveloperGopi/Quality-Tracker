/**
 * CONVEX FILE STORE — the legacy storage implementation.
 *
 * Every document uploaded before Google Drive was connected lives in Convex's
 * own file storage as a `_storage` id. Nothing in the app calls `ctx.storage`
 * for facility documents any more; this implementation exists so:
 *   • the migration job can read those bytes and put them in Drive,
 *   • a migrated document stays readable from its original id until the
 *     migration is verified (then only Drive is used).
 *
 * It implements the same `FileStore` contract, so the rest of the app never
 * knows which one it is talking to.
 */

import type { ByteRange, ExistsResult, FileStore, PutOptions, StoredFile, StreamResult } from "./fileStore";
import { FileStoreError } from "./fileStore";

/** The slice of a Convex storage context this store needs. */
export type ConvexStorageApi = {
  get: (id: string) => Promise<Blob | null>;
  store: (blob: Blob) => Promise<string>;
  delete: (id: string) => Promise<void>;
};

export class ConvexFileStore implements FileStore {
  private readonly storage: ConvexStorageApi;

  constructor(storage: ConvexStorageApi) {
    this.storage = storage;
  }

  async put(bytes: Uint8Array, opts: PutOptions): Promise<StoredFile> {
    // Convex storage has no folders; the "parent" is bookkeeping only.
    const blob = new Blob([bytes as unknown as BlobPart], { type: opts.mimeType });
    const id = await this.storage.store(blob);
    return { id, name: opts.name, mimeType: opts.mimeType, size: bytes.length, parents: [opts.parentId] };
  }

  async getStream(id: string, range?: ByteRange): Promise<StreamResult> {
    const blob = await this.storage.get(id);
    if (!blob) throw new FileStoreError("not_found", "The stored file no longer exists");
    const sizes = blob.size;
    const start = Math.max(0, range?.start ?? 0);
    const end = Math.min(sizes - 1, range?.end ?? sizes - 1);
    if (range && start > end) throw new FileStoreError("rejected", "The requested range is outside the file");
    const slice = range ? blob.slice(start, end + 1) : blob;
    return {
      status: range ? 206 : 200,
      contentRange: range ? `bytes ${start}-${end}/${sizes}` : null,
      size: sizes,
      stream: slice.stream() as unknown as ReadableStream<Uint8Array>,
      meta: { id, name: "", mimeType: blob.type || "application/octet-stream", size: sizes },
    };
  }

  async delete(id: string): Promise<void> {
    await this.storage.delete(id);
  }

  async move(): Promise<void> {
    // No folders in Convex storage — a legacy file cannot be "moved".
  }

  async exists(id: string): Promise<ExistsResult> {
    const blob = await this.storage.get(id);
    return blob ? { exists: true, size: blob.size } : { exists: false };
  }

  async list(): Promise<StoredFile[]> {
    // Convex storage cannot be listed by folder; the migration enumerates the
    // database columns instead (see driveJobs.enumerateLegacyDocuments).
    return [];
  }
}
