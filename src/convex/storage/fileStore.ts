/**
 * FILE STORE — the ONE storage seam.
 *
 * Everything in the app that touches document bytes goes through this
 * interface. Google Drive is the production implementation
 * (`DriveFileStore`), Convex file storage is the legacy implementation kept
 * only so the migration job can read what was stored before
 * (`ConvexFileStore`), and tests use an in-memory store.
 *
 * Consequences that matter:
 *   • no module outside `convex/storage/*` may call Google, Drive URLs or
 *     `ctx.storage` for facility documents;
 *   • swapping storage later is a new implementation of this interface;
 *   • a store never returns a public/shareable URL — only ids and bytes.
 */

export type StoredFile = {
  /** Store-native id (Drive file id, legacy Convex storage id). */
  id: string;
  name: string;
  mimeType: string;
  size: number;
  /** Drive's `md5Checksum`, when the store reports one. */
  md5?: string | null;
  /** Parent folder id(s) — Drive files may have more than one parent. */
  parents?: string[];
};

export type PutOptions = {
  /** Destination folder id. */
  parentId: string;
  /** The name the store will hold (already sanitised; never the user's). */
  name: string;
  mimeType: string;
  /** Drive `appProperties` — facility_id, doc_key, cycle, batch id. */
  appProperties?: Record<string, string>;
  /** Client-generated idempotency key: retrying must not create a second file. */
  uploadKey?: string;
};

export type ByteRange = { start: number; end?: number };

export type StreamResult = {
  /** HTTP status from the store: 200 for a whole file, 206 for a range. */
  status: number;
  /** `Content-Range` when a range was requested and honoured. */
  contentRange?: string | null;
  /** The total size when known. */
  size?: number | null;
  /** Bounded stream — never a buffered whole file. Null when empty (0 bytes). */
  stream: ReadableStream<Uint8Array> | null;
  meta: StoredFile;
};

export type ExistsResult = {
  exists: boolean;
  trashed?: boolean;
  md5?: string | null;
  size?: number | null;
};

export interface FileStore {
  /** Upload bytes into a folder and return what the store now holds. */
  put(bytes: Uint8Array, opts: PutOptions): Promise<StoredFile>;
  /** Stream a file (optionally one byte range) without buffering it. */
  getStream(id: string, range?: ByteRange): Promise<StreamResult>;
  /** Delete (Drive: trash by default, permanent when asked). */
  delete(id: string, opts?: { permanent?: boolean }): Promise<void>;
  /** Move a file from one folder to another (Drive: replace the parent). */
  move(id: string, fromParent: string, toParent: string): Promise<void>;
  /** Verify the bytes still exist and are not trashed (reconciliation). */
  exists(id: string): Promise<ExistsResult>;
  /** List the files directly inside a folder (migration / orphan cleanup). */
  list(parentId: string): Promise<StoredFile[]>;
}

export type FileStoreErrorCode =
  | "not_configured"
  | "auth_revoked"
  | "rate_limited"
  | "quota_exceeded"
  | "not_found"
  | "corrupt"
  | "rejected"
  | "unknown";

/** Every storage failure the UI has to explain, with a stable code. */
export class FileStoreError extends Error {
  code: FileStoreErrorCode;
  /** True when retrying the same call later may succeed. */
  retryable: boolean;
  constructor(code: FileStoreErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "FileStoreError";
    this.code = code;
    this.retryable = retryable;
  }
}

/** Map any thrown value to a FileStoreError (never leak a raw Google body). */
export function asFileStoreError(err: unknown): FileStoreError {
  if (err instanceof FileStoreError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new FileStoreError("unknown", message.slice(0, 300));
}
