/**
 * DRIVE REST CLIENT — the only place that speaks the Drive v3 API.
 *
 * It takes an injected `DriveTransport`, so:
 *   • production passes the `fetch` transport with a live access token,
 *   • tests pass an in-memory transport and exercise the same URL building,
 *     query flags (`supportsAllDrives`, `fields`, `alt=media`) and error
 *     mapping as production,
 *   • retry/backoff lives in `retry.ts` and wraps every call here.
 *
 * Nothing in this file returns a `webViewLink`/`webContentLink`; the `fields`
 * lists never ask for them, so they cannot leak by accident.
 */

import { DriveHttpError, withDriveRetry, type RetryOptions } from "./retry";
import type { FileStoreErrorCode } from "./fileStore";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

export type DriveRequest = {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: Uint8Array | string | null;
};

export type DriveResponse = {
  status: number;
  headers: { get(name: string): string | null };
  text: () => Promise<string>;
  json: <T = unknown>() => Promise<T>;
  bytes: () => Promise<Uint8Array>;
  /** Present on media downloads — streamed straight to the browser. */
  stream?: ReadableStream<Uint8Array> | null;
};

export type DriveTransport = (req: DriveRequest) => Promise<DriveResponse>;

/** Standard fetch transport. The access token never leaves the server. */
export function fetchTransport(accessToken: string): DriveTransport {
  return async (req) => {
    const res = await fetch(req.url, {
      method: req.method,
      headers: { ...req.headers, Authorization: `Bearer ${accessToken}` },
      body: req.body as unknown as BodyInit | null,
    });
    return {
      status: res.status,
      headers: res.headers,
      text: () => res.text(),
      json: <T>() => res.json() as Promise<T>,
      bytes: async () => new Uint8Array(await res.arrayBuffer()),
      stream: res.body,
    };
  };
}

/** A Drive file's metadata, limited to what the app may know. */
export type DriveFileMeta = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  md5Checksum?: string;
  trashed?: boolean;
  parents?: string[];
  appProperties?: Record<string, string>;
};

const FILE_FIELDS = "id,name,mimeType,size,md5Checksum,trashed,parents,appProperties";

export type DriveClientOptions = {
  transport: () => Promise<DriveTransport>;
  retry?: RetryOptions;
};

export class DriveClient {
  private readonly transport: () => Promise<DriveTransport>;
  private readonly retry: RetryOptions;

  constructor(opts: DriveClientOptions) {
    this.transport = opts.transport;
    this.retry = opts.retry ?? {};
  }

  /** One call, retried on rate limits / 5xx, failures normalised. */
  private async call(req: DriveRequest): Promise<DriveResponse> {
    return withDriveRetry(
      async () => {
        const transport = await this.transport();
        const res = await transport(req);
        if (res.status >= 400) {
          const text = await res.text();
          const reason = readReason(text);
          throw new DriveHttpError(res.status, reason, text);
        }
        return res;
      },
      this.retry,
    );
  }

  async getFile(id: string): Promise<DriveFileMeta | null> {
    try {
      const res = await this.call({
        url: `${API}/files/${encodeURIComponent(id)}?fields=${FILE_FIELDS}&supportsAllDrives=true`,
        method: "GET",
      });
      return (await res.json()) as DriveFileMeta;
    } catch (err) {
      if (err instanceof DriveHttpError && err.status === 404) return null;
      throw err;
    }
  }

  async listFiles(query: {
    parentId?: string;
    name?: string;
    foldersOnly?: boolean;
    /** Files tagged with this `appProperties.upload_key` (the resume lookup). */
    uploadKey?: string;
    pageToken?: string;
    pageSize?: number;
  }): Promise<{ files: DriveFileMeta[]; nextPageToken?: string }> {
    const q: string[] = ["trashed=false"];
    if (query.parentId) q.push(`'${query.parentId.replace(/'/g, "\\'")}' in parents`);
    if (query.name) q.push(`name = '${query.name.replace(/'/g, "\\'")}'`);
    if (query.uploadKey) {
      const key = query.uploadKey.replace(/'/g, "\\'");
      q.push(`appProperties has { key='upload_key' } and appProperties.upload_key='${key}'`);
    }
    if (query.foldersOnly) q.push("mimeType = 'application/vnd.google-apps.folder'");
    const params = new URLSearchParams({
      q: q.join(" and "),
      fields: `nextPageToken,files(${FILE_FIELDS})`,
      pageSize: String(query.pageSize ?? 100),
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      // Without `allDrives` the default `user` corpus hides files in Shared
      // Drives, so the upload-key lookup in finalise found nothing and a
      // completed upload failed as "did not finish".
      corpora: "allDrives",
      spaces: "drive",
    });
    if (query.pageToken) params.set("pageToken", query.pageToken);
    const res = await this.call({ url: `${API}/files?${params.toString()}`, method: "GET" });
    const body = await res.json<{ files?: DriveFileMeta[]; nextPageToken?: string }>();
    return { files: body.files ?? [], nextPageToken: body.nextPageToken };
  }

  /** Find-or-create a folder under `parentId`, with an idempotent retry. */
  async ensureFolder(parentId: string, name: string): Promise<DriveFileMeta> {
    const found = await this.listFiles({ parentId, name, foldersOnly: true, pageSize: 10 });
    const existing = found.files.find((f) => f.name === name && !f.trashed);
    if (existing) return existing;
    const res = await this.call({
      url: `${API}/files?fields=${FILE_FIELDS}&supportsAllDrives=true`,
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      }),
    });
    return (await res.json()) as DriveFileMeta;
  }

  /** Simple (non-resumable) metadata-only update: move and/or rename. */
  async updateFile(
    id: string,
    patch: { addParents?: string; removeParents?: string; name?: string; appProperties?: Record<string, string> },
  ): Promise<DriveFileMeta> {
    const params = new URLSearchParams({ fields: FILE_FIELDS, supportsAllDrives: "true" });
    if (patch.addParents) params.set("addParents", patch.addParents);
    if (patch.removeParents) params.set("removeParents", patch.removeParents);
    const body: Record<string, unknown> = {};
    if (patch.name) body.name = patch.name;
    if (patch.appProperties) body.appProperties = patch.appProperties;
    const res = await this.call({
      url: `${API}/files/${encodeURIComponent(id)}?${params.toString()}`,
      method: "PATCH",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as DriveFileMeta;
  }

  /** Move a file permanently to the trash (Drive keeps it 30 days). */
  async trash(id: string): Promise<void> {
    await this.call({
      url: `${API}/files/${encodeURIComponent(id)}?supportsAllDrives=true`,
      method: "PATCH",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ trashed: true }),
    });
  }

  /** Permanent delete (retention elapsed, or a file that failed verification). */
  async deletePermanently(id: string): Promise<void> {
    try {
      await this.call({
        url: `${API}/files/${encodeURIComponent(id)}?supportsAllDrives=true`,
        method: "DELETE",
      });
    } catch (err) {
      if (err instanceof DriveHttpError && err.status === 404) return; // already gone
      throw err;
    }
  }

  /** Small files: one multipart-free upload (`uploadType=media`). */
  async uploadBytes(
    parentId: string,
    name: string,
    mimeType: string,
    bytes: Uint8Array,
    appProperties?: Record<string, string>,
  ): Promise<DriveFileMeta> {
    const params = new URLSearchParams({
      uploadType: "multipart",
      supportsAllDrives: "true",
      fields: FILE_FIELDS,
    });
    const boundary = `nqas-${Date.now().toString(36)}`;
    const metadata = JSON.stringify({
      name,
      mimeType,
      parents: [parentId],
      appProperties: appProperties ?? {},
    });
    const encoder = new TextEncoder();
    const head = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    );
    const tail = encoder.encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(head.length + bytes.length + tail.length);
    body.set(head, 0);
    body.set(bytes, head.length);
    body.set(tail, head.length + bytes.length);

    const res = await this.call({
      url: `${UPLOAD}/files?${params.toString()}`,
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
    return (await res.json()) as DriveFileMeta;
  }

  /** Resumable session for the browser's direct/through-API chunked upload. */
  async createResumableSession(input: {
    parentId: string;
    name: string;
    mimeType: string;
    size: number;
    appProperties?: Record<string, string>;
  }): Promise<string> {
    const res = await this.call({
      url: `${UPLOAD}/files?uploadType=resumable&supportsAllDrives=true&fields=${FILE_FIELDS}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": input.mimeType,
        "X-Upload-Content-Length": String(input.size),
      },
      body: JSON.stringify({
        name: input.name,
        mimeType: input.mimeType,
        parents: [input.parentId],
        appProperties: input.appProperties ?? {},
      }),
    });
    const location = res.headers.get("location") ?? res.headers.get("Location");
    if (!location) throw new Error("Drive did not return an upload session");
    return location;
  }

  /** Media download — the caller streams `stream` and never buffers it. */
  async getMedia(
    id: string,
    range?: { start: number; end?: number },
  ): Promise<{
    status: number;
    stream: ReadableStream<Uint8Array> | null;
    size: number | null;
    contentRange: string | null;
    mimeType: string | null;
    name: string | null;
  }> {
    const headers: Record<string, string> = {};
    if (range) headers.Range = `bytes=${range.start}-${range.end ?? ""}`;
    const res = await this.call({
      url: `${API}/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`,
      method: "GET",
      headers,
    });
    const sizeHeader = res.headers.get("content-range");
    const total = sizeHeader ? Number(sizeHeader.split("/")[1]) : Number(res.headers.get("content-length") ?? 0);
    return {
      status: res.status,
      stream: res.stream ?? null,
      size: Number.isFinite(total) && total > 0 ? total : null,
      contentRange: sizeHeader,
      mimeType: res.headers.get("content-type"),
      name: null,
    };
  }

  /** Drive storage used / limit for the connected account. */
  async aboutStorage(): Promise<{ used: number; limit: number }> {
    const res = await this.call({
      url: `${API}/about?fields=storageQuota(limit,usage)&supportsAllDrives=true`,
      method: "GET",
    });
    const body = await res.json<{ storageQuota?: { limit?: string; usage?: string } }>();
    return {
      used: Number(body.storageQuota?.usage ?? 0),
      limit: Number(body.storageQuota?.limit ?? 0),
    };
  }

  /** Map a Drive failure to the app's storage error codes. */
  static codeFor(err: unknown): FileStoreErrorCode {
    if (!(err instanceof DriveHttpError)) return "unknown";
    if (err.status === 404) return "not_found";
    if (err.status === 401) return "auth_revoked";
    if (err.status === 403) {
      if (/quota/i.test(err.bodyText) && !/rateLimit/i.test(err.bodyText)) return "quota_exceeded";
      if (/rateLimit|userRateLimit/i.test(err.bodyText)) return "rate_limited";
      return "auth_revoked";
    }
    if (err.status === 429) return "rate_limited";
    return "unknown";
  }
}

function readReason(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { errors?: { reason?: string }[]; status?: string } };
    return parsed.error?.errors?.[0]?.reason ?? parsed.error?.status ?? "";
  } catch {
    return "";
  }
}
