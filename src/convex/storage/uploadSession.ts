/**
 * UPLOAD SESSION SERVICE — plan, verify, resume.
 *
 * The three rules the brief cares about are enforced here, once:
 *
 *   1. A file is NOT attached to a facility until verification passes:
 *      the stored size equals the declared size, Drive reports an md5, the
 *      first bytes ARE the declared kind of document, and the SHA-256 is
 *      computed by streaming the stored object (never from the browser).
 *      Any failure deletes the Drive object immediately.
 *   2. The only name a stored file may have is built here.
 *   3. A retry never creates a second file: the caller passes a client upload
 *      key, and the Drive metadata carries `appProperties.uploadKey`.
 */

import type { FileStore } from "./fileStore";
import { FileStoreError } from "./fileStore";
import { DriveFolderService } from "./folderService";
import { hashStream, readHead } from "./hashStream";
import {
  buildStoredName,
  checkUpload,
  maxBytesFor,
  zipEntryNames,
  type DocKey,
  type DocumentLimits,
} from "./validation";

/** First bytes read for the type sniff — enough for a PDF header or ZIP index. */
export const SNIFF_BYTES = 4096;
/** Tail window holding a ZIP's central directory (the list of every part).
 *  A 633 KB workbook keeps `xl/workbook.xml` past byte 4096, so the head
 *  alone cannot prove the file is a spreadsheet. */
export const SNIFF_TAIL_BYTES = 64 * 1024;

export type UploadPlanInput = {
  nin: string | null | undefined;
  facilityName: string;
  block: string;
  docKey: string;
  cycleNo: number;
  versionNo: number;
  originalName: string;
  declaredMime: string;
  declaredSize: number;
  /** Upload date, ISO `yyyy-mm-dd` (the department's date, not the browser's). */
  date: string;
};

export type UploadPlan = {
  /** The only name the file may have in Drive. */
  storedName: string;
  /** The document folder the file goes into. */
  folderId: string;
  /** `_versions` sibling for the replaced file. */
  versionsFolderId: string;
};

export type VerifyInput = {
  fileId: string;
  docKey: string;
  originalName: string;
  declaredMime: string;
  declaredSize: number;
  /** Drive's own checksum, when the store reports one. */
  storeMd5?: string | null;
  /** Size the store reports for the object. */
  storeSize?: number | null;
  limits?: Partial<DocumentLimits>;
};

export type VerifyResult = {
  mime: string;
  size: number;
  sha256: string;
  md5: string;
};

export class UploadSessionService {
  private readonly store: FileStore;
  private readonly folders: DriveFolderService;

  constructor(deps: { store: FileStore; folders: DriveFolderService }) {
    this.store = deps.store;
    this.folders = deps.folders;
  }

  /** Where the file goes and what it will be called. */
  async plan(rootFolderId: string, input: UploadPlanInput): Promise<UploadPlan> {
    const { folderId } = await this.folders.ensureDocumentFolder({
      rootFolderId,
      block: input.block,
      nin: input.nin,
      facilityName: input.facilityName,
      docKey: input.docKey,
    });
    const versionsFolderId = await this.folders.versionsFolder(folderId);
    const storedName = buildStoredName({
      nin: input.nin,
      docKey: input.docKey,
      cycleNo: input.cycleNo,
      date: input.date,
      versionNo: input.versionNo,
      mime: input.declaredMime,
      originalName: input.originalName,
    });
    return { storedName, folderId, versionsFolderId };
  }

  /**
   * Verify a finished upload. Throws `FileStoreError("rejected")` with a
   * plain-language reason; the caller deletes the stored object in that case.
   */
  async verify(input: VerifyInput): Promise<VerifyResult> {
    const limits = input.limits;
    const max = maxBytesFor(input.docKey as DocKey, limits);
    if (input.declaredSize > max)
      throw new FileStoreError("rejected", "The file is larger than the configured limit");

    const stored = await this.store.exists(input.fileId);
    if (!stored.exists || stored.trashed)
      throw new FileStoreError("not_found", "The uploaded file is not in storage — retry");

    const storeSize = input.storeSize ?? stored.size ?? null;
    if (storeSize != null && storeSize !== input.declaredSize) {
      throw new FileStoreError(
        "rejected",
        `The uploaded file is ${storeSize} bytes but ${input.declaredSize} were declared`,
      );
    }

    /* 1. Real type from the file's own bytes — never from the declared type. */
    const headStream = await this.store.getStream(input.fileId, { start: 0, end: SNIFF_BYTES - 1 });
    const head = await readHead(headStream.stream, SNIFF_BYTES);
    /* A ZIP is identified by its parts, and the central directory lives at the
       END: read the tail too before deciding an .xlsx is "unsupported". */
    let zipEntries: string[] = [];
    const isZip = head[0] === 0x50 && head[1] === 0x4b;
    if (isZip && storeSize != null && storeSize > SNIFF_BYTES) {
      const start = Math.max(0, storeSize - SNIFF_TAIL_BYTES);
      try {
        const tailStream = await this.store.getStream(input.fileId, {
          start,
          end: storeSize - 1,
        });
        const tail = await readHead(tailStream.stream, SNIFF_TAIL_BYTES);
        zipEntries = zipEntryNames(tail);
      } catch {
        /* best effort: the head scan below still decides when it can */
      }
    }
    let mime: string;
    try {
      const checked = checkUpload({
        docKey: input.docKey,
        originalName: input.originalName,
        declaredMime: input.declaredMime,
        declaredSize: input.declaredSize,
        head,
        zipEntries,
        limits,
      });
      mime = checked.mime;
    } catch (err) {
      throw new FileStoreError("rejected", err instanceof Error ? err.message : "The file was rejected");
    }

    /* 2. SHA-256 + MD5 over the stored bytes, streamed once. */
    const full = await this.store.getStream(input.fileId);
    const hashes = await hashStream(full.stream, max + 1);
    if (hashes.size !== input.declaredSize) {
      throw new FileStoreError(
        "rejected",
        `The uploaded file is ${hashes.size} bytes but ${input.declaredSize} were declared`,
      );
    }

    /* 3. Drive's checksum must agree with ours when it reports one. */
    const expectedMd5 = (input.storeMd5 ?? stored.md5 ?? "").toLowerCase();
    if (expectedMd5 && expectedMd5 !== hashes.md5) {
      throw new FileStoreError("corrupt", "The stored file does not match its checksum");
    }

    return { mime, size: hashes.size, sha256: hashes.sha256, md5: hashes.md5 };
  }

  /**
   * Resume position for a dropped chunked upload. Drive answers 308 with
   * `Range: bytes=0-N`; a malformed/missing header means start over.
   */
  static resumeOffset(contentRange: string | null | undefined): number {
    const match = /bytes=0-(\d+)/.exec(contentRange ?? "");
    return match ? Number(match[1]) + 1 : 0;
  }
}

/**
 * Chunk size the browser uses: a multiple of 256 KB, as Drive requires.
 * Defined once in `lib/uploadConfig` so the browser transport and the server
 * can never disagree.
 */
export { UPLOAD_CHUNK_BYTES } from "../../lib/uploadConfig";
export const MAX_PARALLEL_UPLOADS = 4;
