/**
 * DRIVE FILE STORE — Google Drive behind the `FileStore` interface.
 *
 * Everything here is Drive-shaped knowledge and nothing else: names go through
 * the validation rules, folders through the folder service, and every failure
 * becomes a `FileStoreError` with a code the UI can explain. Files are private
 * by construction: the app never creates a permission, never asks for
 * `webViewLink`, and never shares a file.
 */

import type { ByteRange, ExistsResult, FileStore, PutOptions, StoredFile, StreamResult } from "./fileStore";
import { FileStoreError } from "./fileStore";
import { DriveClient } from "./driveClient";

export class DriveFileStore implements FileStore {
  private readonly client: DriveClient;

  constructor(client: DriveClient) {
    this.client = client;
  }

  private fail(err: unknown): never {
    if (err instanceof FileStoreError) throw err;
    const code = DriveClient.codeFor(err);
    const message =
      code === "auth_revoked"
        ? "Google Drive access was revoked — ask the State Admin to reconnect Drive"
        : code === "quota_exceeded"
          ? "Google Drive is out of space — free space or raise the account quota"
          : code === "rate_limited"
            ? "Google Drive is busy — retrying"
            : "Google Drive could not complete the request";
    throw new FileStoreError(code, message, code === "rate_limited");
  }

  async put(bytes: Uint8Array, opts: PutOptions): Promise<StoredFile> {
    try {
      const file = await this.client.uploadBytes(
        opts.parentId,
        opts.name,
        opts.mimeType,
        bytes,
        opts.appProperties,
      );
      return toStored(file);
    } catch (err) {
      this.fail(err);
    }
  }

  async getStream(id: string, range?: ByteRange): Promise<StreamResult> {
    try {
      const media = await this.client.getMedia(id, range);
      return {
        status: media.status,
        contentRange: media.contentRange,
        size: media.size,
        stream: media.stream,
        meta: {
          id,
          name: "",
          mimeType: media.mimeType ?? "application/octet-stream",
          size: media.size ?? 0,
        },
      };
    } catch (err) {
      this.fail(err);
    }
  }

  async delete(id: string, opts?: { permanent?: boolean }): Promise<void> {
    try {
      if (opts?.permanent) await this.client.deletePermanently(id);
      else await this.client.trash(id);
    } catch (err) {
      this.fail(err);
    }
  }

  async move(id: string, fromParent: string, toParent: string): Promise<void> {
    try {
      await this.client.updateFile(id, { addParents: toParent, removeParents: fromParent });
    } catch (err) {
      this.fail(err);
    }
  }

  async exists(id: string): Promise<ExistsResult> {
    try {
      const meta = await this.client.getFile(id);
      if (!meta) return { exists: false };
      return {
        exists: !meta.trashed,
        trashed: !!meta.trashed,
        md5: meta.md5Checksum ?? null,
        size: meta.size ? Number(meta.size) : null,
      };
    } catch (err) {
      this.fail(err);
    }
  }

  async list(parentId: string): Promise<StoredFile[]> {
    try {
      const out: StoredFile[] = [];
      let pageToken: string | undefined;
      do {
        const page = await this.client.listFiles({ parentId, pageToken, pageSize: 200 });
        for (const f of page.files) out.push(toStored(f));
        pageToken = page.nextPageToken;
      } while (pageToken);
      return out;
    } catch (err) {
      this.fail(err);
    }
  }
}

function toStored(file: {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  md5Checksum?: string;
  parents?: string[];
}): StoredFile {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: Number(file.size ?? 0),
    md5: file.md5Checksum ?? null,
    parents: file.parents ?? [],
  };
}
