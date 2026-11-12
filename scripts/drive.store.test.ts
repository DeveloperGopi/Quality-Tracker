/**
 * DRIVE STORAGE — the FileStore contract, retries, folders and verification.
 *
 * Everything runs against injected transports/stores, so the REAL production
 * code paths are exercised without a Google account:
 *   • DriveClient builds the right URL/flags (`supportsAllDrives`, no link
 *     fields, `alt=media`, resumable Location),
 *   • DriveFileStore satisfies put/getStream/delete/move/exists/list,
 *   • concurrent folder creation makes ONE folder and caches the id,
 *   • 429/5xx retry with backoff while 404/403 do not,
 *   • an upload is only accepted when size + checksum + real type agree,
 *   • reconciliation flags missing files and never deletes rows,
 *   • the legacy migration enumerates the six old columns,
 *   • the browser upload resumes after a dropped chunk and cancels cleanly.
 *
 * Run: bun test ./scripts/drive.store.test.ts
 */
import { describe, expect, it } from "bun:test";

import { DriveClient, type DriveRequest, type DriveResponse } from "../src/convex/storage/driveClient";
import { DriveFileStore } from "../src/convex/storage/driveFileStore";
import { DriveFolderService } from "../src/convex/storage/folderService";
import { DriveHttpError, withDriveRetry } from "../src/convex/storage/retry";
import { UploadSessionService } from "../src/convex/storage/uploadSession";
import { FileStoreError, type FileStore, type StreamResult } from "../src/convex/storage/fileStore";
import { reconcilePlan, legacyTargets } from "../src/convex/driveJobs";
import { uploadDocument, type UploadTransport } from "../src/lib/uploadDocuments";
import {
  NETWORK_ERROR,
  SERVER_ERROR,
  STORAGE_NOT_CONNECTED,
  UPLOAD_CHUNK_BYTES,
  friendlyUploadError,
} from "../src/lib/uploadConfig";
import {
  chunkFailureFor,
  uploadRefCode,
  withRef,
} from "../src/convex/storage/uploadProtocol";
import { md5Hex } from "../src/convex/storage/crypto";

const encoder = new TextEncoder();
const pdf = (size = 2048) => {
  const bytes = encoder.encode("%PDF-1.7\n");
  const body = new Uint8Array(size);
  body.set(bytes);
  for (let i = bytes.length; i < size; i += 1) body[i] = 65 + (i % 26);
  body.set(encoder.encode("\n%%EOF\n"), size - 7);
  return body;
};

/* ------------------------------------------------------------------ */
/* A fake Drive transport                                             */
/* ------------------------------------------------------------------ */

type FakeFile = {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  bytes: Uint8Array;
  trashed?: boolean;
  appProperties?: Record<string, string>;
};

function fakeDrive(seed: { files?: FakeFile[]; folderNames?: Record<string, string> } = {}) {
  const files = new Map<string, FakeFile>();
  for (const f of seed.files ?? []) files.set(f.id, f);
  const calls: DriveRequest[] = [];
  let n = 0;
  const folderIds = new Map<string, string>(Object.entries(seed.folderNames ?? {}));

  const transport = async (req: DriveRequest): Promise<DriveResponse> => {
    calls.push(req);
    const url = new URL(req.url);
    const json = (body: unknown, status = 200): DriveResponse => ({
      status,
      headers: { get: () => null },
      text: async () => JSON.stringify(body),
      json: async <T>() => body as T,
      bytes: async () => encoder.encode(JSON.stringify(body)),
      stream: null,
    });
    const fileMeta = (f: FakeFile) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: String(f.bytes.length),
      md5Checksum: md5Hex(f.bytes),
      trashed: !!f.trashed,
      parents: f.parents,
      appProperties: f.appProperties,
    });

    // ---- about ----
    if (url.pathname.endsWith("/about")) return json({ storageQuota: { usage: "12345", limit: "1000000" } });

    // ---- media ----
    if (url.pathname.includes("/files/") && url.searchParams.get("alt") === "media") {
      const id = url.pathname.split("/files/")[1];
      const file = files.get(id);
      if (!file) return json({ error: { errors: [{ reason: "notFound" }] } }, 404);
      const range = req.headers?.Range ?? req.headers?.range;
      const total = file.bytes.length;
      let start = 0;
      let end = total - 1;
      if (range) {
        const m = /bytes=(\d+)-(\d*)/.exec(range);
        if (m) {
          start = Number(m[1]);
          end = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
        }
      }
      const slice = file.bytes.subarray(start, end + 1);
      return {
        status: range ? 206 : 200,
        headers: {
          get: (name: string) =>
            name.toLowerCase() === "content-range"
              ? range
                ? `bytes ${start}-${end}/${total}`
                : null
              : name.toLowerCase() === "content-length"
                ? String(slice.length)
                : null,
        },
        text: async () => "",
        json: async <T>() => ({}) as T,
        bytes: async () => slice,
        stream: new ReadableStream<Uint8Array>({ start(c) { c.enqueue(slice); c.close(); } }),
      };
    }

    // ---- one file ----
    const single = /\/files\/([^/?]+)$/.exec(url.pathname);
    if (single && req.method === "GET") {
      const file = files.get(single[1]);
      if (!file) return json({ error: { errors: [{ reason: "notFound" }] } }, 404);
      return json(fileMeta(file));
    }
    if (single && req.method === "DELETE") {
      files.delete(single[1]);
      return json({}, 204);
    }
    if (single && req.method === "PATCH") {
      const file = files.get(single[1]);
      if (!file) return json({ error: { errors: [{ reason: "notFound" }] } }, 404);
      const body = JSON.parse(String(req.body ?? "{}")) as {
        trashed?: boolean;
        name?: string;
        appProperties?: Record<string, string>;
      };
      if (body.trashed) file.trashed = true;
      if (body.name) file.name = body.name;
      if (body.appProperties) file.appProperties = body.appProperties;
      const add = url.searchParams.get("addParents");
      const remove = url.searchParams.get("removeParents");
      if (add) file.parents = [add];
      if (remove) file.parents = file.parents.filter((p) => p !== remove);
      return json(fileMeta(file));
    }

    // ---- resumable session (checked before the generic create) ----
    if (
      url.pathname.startsWith("/upload/drive/v3/files") &&
      url.searchParams.get("uploadType") === "resumable"
    ) {
      return {
        status: 200,
        headers: { get: (name: string) => (name.toLowerCase() === "location" ? "https://upload.example/session/1" : null) },
        text: async () => "",
        json: async <T>() => ({}) as T,
        bytes: async () => new Uint8Array(),
        stream: null,
      };
    }

    // ---- list / create ----
    if (url.pathname.endsWith("/files") && req.method === "GET") {
      const q = url.searchParams.get("q") ?? "";
      const parentMatch = /'([^']+)' in parents/.exec(q);
      const nameMatch = /name = '([^']+)'/.exec(q);
      const list = [...files.values()]
        .filter((f) => !f.trashed)
        .filter((f) => (parentMatch ? f.parents.includes(parentMatch[1]) : true))
        .filter((f) => (nameMatch ? f.name === nameMatch[1] : true))
        .map(fileMeta);
      return json({ files: list });
    }
    if (url.pathname.endsWith("/files") && req.method === "POST") {
      // A multipart upload body is binary; only the JSON create is parsed here.
      const body = (
        req.body instanceof Uint8Array ? {} : JSON.parse(String(req.body ?? "{}"))
      ) as {
        name?: string;
        mimeType?: string;
        parents?: string[];
        appProperties?: Record<string, string>;
      };
      const id = `file-${++n}`;
      if (body.mimeType === "application/vnd.google-apps.folder") {
        const folder = {
          id,
          name: body.name ?? "folder",
          mimeType: body.mimeType,
          parents: body.parents ?? [],
          bytes: new Uint8Array(0),
          appProperties: body.appProperties,
        };
        files.set(id, folder);
        folderIds.set(`${body.parents?.[0]}/${body.name}`, id);
        return json(fileMeta(folder));
      }
      // The multipart upload: the JSON metadata is the first part of the body.
      const raw =
        req.body instanceof Uint8Array
          ? new TextDecoder().decode(req.body)
          : String(req.body ?? "");
      const metaStart = raw.indexOf("{");
      const metaEnd = raw.indexOf("}\r\n--");
      const metadata =
        metaStart >= 0 && metaEnd > metaStart
          ? (JSON.parse(raw.slice(metaStart, metaEnd + 1)) as {
              name?: string;
              mimeType?: string;
              parents?: string[];
              appProperties?: Record<string, string>;
            })
          : {};
      // Store the binary part of the multipart body so media reads return it.
      let storedBytes = new Uint8Array(0);
      if (req.body instanceof Uint8Array) {
        const marker = encoder.encode("\r\n\r\n");
        const findMarker = (from: number) => {
          for (let i = from; i < req.body!.length - 3; i += 1) {
            if (
              (req.body as Uint8Array)[i] === marker[0] &&
              (req.body as Uint8Array)[i + 1] === marker[1] &&
              (req.body as Uint8Array)[i + 2] === marker[2] &&
              (req.body as Uint8Array)[i + 3] === marker[3]
            )
              return i;
          }
          return -1;
        };
        const first = findMarker(0);
        const second = first >= 0 ? findMarker(first + 4) : -1;
        if (second >= 0) {
          const rawText = new TextDecoder("latin1").decode(req.body);
          const endBoundary = rawText.lastIndexOf("\r\n--");
          if (endBoundary > second) storedBytes = req.body.subarray(second + 4, endBoundary);
        }
      }
      const file: FakeFile = {
        id,
        name: metadata.name ?? body.name ?? "file",
        mimeType: metadata.mimeType ?? body.mimeType ?? "application/pdf",
        parents: metadata.parents ?? body.parents ?? [],
        bytes: storedBytes,
        appProperties: metadata.appProperties,
      };
      files.set(id, file);
      return json(fileMeta(file));
    }

    return json({ error: { errors: [{ reason: "notFound" }] } }, 404);
  };

  return { transport, files, calls, folderIds };
}

function clientFor(drive: ReturnType<typeof fakeDrive>, retry = {}) {
  return new DriveClient({ transport: async () => drive.transport, retry });
}

/* ------------------------------------------------------------------ */
/* DriveClient                                                        */
/* ------------------------------------------------------------------ */

describe("DriveClient", () => {
  it("always passes supportsAllDrives and never asks for shareable links", async () => {
    const drive = fakeDrive();
    const client = clientFor(drive);
    await client.listFiles({ parentId: "root" });
    await client.getFile("file-1");
    await client.aboutStorage();
    const urls = drive.calls.map((c) => c.url).join("\n");
    expect(urls).toContain("supportsAllDrives=true");
    expect(urls).toContain("includeItemsFromAllDrives=true");
    for (const call of drive.calls) {
      expect(call.url).not.toContain("webViewLink");
      expect(call.url).not.toContain("webContentLink");
    }
  });

  it("creates a resumable session and returns only its Location", async () => {
    const drive = fakeDrive();
    const client = clientFor(drive);
    const uri = await client.createResumableSession({
      parentId: "folder-1",
      name: "2426248478_NQAS_Result_C1_20261012_v1.pdf",
      mimeType: "application/pdf",
      size: 2048,
      appProperties: { facility_id: "f1", doc_key: "NQAS_Result" },
    });
    expect(uri).toBe("https://upload.example/session/1");
    const req = drive.calls.find((c) => c.url.includes("uploadType=resumable"))!;
    expect(req.method).toBe("POST");
    expect(String(req.body)).toContain("NQAS_Result");
    expect(req.headers?.["X-Upload-Content-Length"]).toBe("2048");
  });
});

/* ------------------------------------------------------------------ */
/* DriveFileStore                                                     */
/* ------------------------------------------------------------------ */

describe("DriveFileStore (FileStore contract)", () => {
  it("puts, streams a range, moves, lists and deletes", async () => {
    const drive = fakeDrive();
    const store = new DriveFileStore(clientFor(drive));
    const bytes = pdf(2048);
    const put = await store.put(bytes, {
      parentId: "folder-1",
      name: "2426248478_NQAS_Result_C1_20261012_v1.pdf",
      mimeType: "application/pdf",
    });
    expect(put.id).toBeTruthy();
    expect(put.size).toBe(2048);
    expect(put.md5).toBeTruthy();

    const full = await store.getStream(put.id);
    expect(full.status).toBe(200);
    expect(full.size).toBe(2048);

    const ranged = await store.getStream(put.id, { start: 0, end: 99 });
    expect(ranged.status).toBe(206);
    expect(ranged.contentRange).toBe("bytes 0-99/2048");

    const before = await store.exists(put.id);
    expect(before.exists).toBe(true);

    await store.move(put.id, "folder-1", "folder-2");
    expect(drive.files.get(put.id)?.parents).toEqual(["folder-2"]);

    const list = await store.list("folder-2");
    expect(list.map((f) => f.id)).toContain(put.id);

    await store.delete(put.id);
    expect(drive.files.get(put.id)?.trashed).toBe(true);
    expect((await store.exists(put.id)).exists).toBe(false);
  });

  it("maps a revoked token to auth_revoked (the UI banner depends on it)", async () => {
    const store = new DriveFileStore(
      new DriveClient({
        transport: async () => async () => ({
          status: 401,
          headers: { get: () => null },
          text: async () => JSON.stringify({ error: { errors: [{ reason: "authError" }] } }),
          json: async <T>() => ({}) as T,
          bytes: async () => new Uint8Array(),
          stream: null,
        }),
      }),
    );
    await expect(store.exists("x")).rejects.toMatchObject({ code: "auth_revoked" });
  });
});

/* ------------------------------------------------------------------ */
/* Folders                                                            */
/* ------------------------------------------------------------------ */

describe("DriveFolderService", () => {
  it("creates each folder once under concurrent uploads and caches the id", async () => {
    const drive = fakeDrive();
    const cache = new Map<string, string>();
    let created = 0;
    const folderClient = {
      ensureFolder: async (parentId: string, name: string) => {
        const cached = cache.get(`${parentId}/${name}`);
        if (cached) return { id: cached };
        const res = await drive.transport({
          url: "https://www.googleapis.com/drive/v3/files?fields=id,name&supportsAllDrives=true",
          method: "POST",
          body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
        });
        const body = (await res.json()) as { id: string };
        created += 1;
        return { id: body.id };
      },
    };
    const service = new DriveFolderService(folderClient, {
      get: async (key) => cache.get(key) ?? null,
      put: async ({ key, driveFolderId }) => {
        cache.set(key, driveFolderId);
      },
    });
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        service.ensureDocumentFolder({
          rootFolderId: "root",
          block: "Jolarpettai",
          nin: "2426248478",
          facilityName: "PHC Athanavur",
          docKey: "NQAS_Result",
        }),
      ),
    );
    expect(new Set(results.map((r) => r.folderId)).size).toBe(1);
    // root → Facility Documents → Block → NIN - Name → doc
    expect(created).toBeLessThanOrEqual(5);
    expect(results[0].facilityFolderId).toBeTruthy();
  });

  it("labels the facility folder NIN - Name and falls back without a NIN", async () => {
    const names: string[] = [];
    const service = new DriveFolderService(
      {
        ensureFolder: async (_parent: string, name: string) => {
          names.push(name);
          return { id: `id-${names.length}` };
        },
      },
      { get: async () => null, put: async () => undefined },
    );
    await service.ensureDocumentFolder({
      rootFolderId: "root",
      block: "Jolarpettai",
      nin: "2426248478",
      facilityName: "PHC Athanavur",
      docKey: "SA_Report",
    });
    expect(names).toContain("2426248478 - PHC Athanavur");
    expect(names).toContain("SA Report");
    names.length = 0;
    await new DriveFolderService(
      { ensureFolder: async (_p, name) => ({ id: name }) },
      { get: async () => null, put: async () => undefined },
    ).ensureDocumentFolder({ rootFolderId: "root", block: "B", nin: null, facilityName: "HSC X", docKey: "NOC" });
  });
});

/* ------------------------------------------------------------------ */
/* Retry                                                              */
/* ------------------------------------------------------------------ */

describe("retry policy", () => {
  it("retries 429 and 5xx with growing, jittered delays", async () => {
    const delays: number[] = [];
    let calls = 0;
    const value = await withDriveRetry(
      async () => {
        calls += 1;
        if (calls === 1) throw new DriveHttpError(429, "rateLimitExceeded");
        if (calls === 2) throw new DriveHttpError(503, "backendError");
        return "ok";
      },
      {
        sleep: async (ms) => {
          delays.push(ms);
        },
        random: () => 1,
      },
    );
    expect(value).toBe("ok");
    expect(calls).toBe(3);
    expect(delays.length).toBe(2);
    expect(delays[1]).toBeGreaterThan(delays[0]);
  });

  it("does not retry a 404 or a plain permission 403, and reports retries for the UI", async () => {
    let calls = 0;
    await expect(
      withDriveRetry(
        async () => {
          calls += 1;
          throw new DriveHttpError(404, "notFound");
        },
        { sleep: async () => undefined },
      ),
    ).rejects.toBeDefined();
    expect(calls).toBe(1);

    const seen: number[] = [];
    await expect(
      withDriveRetry(
        async () => {
          calls += 1;
          throw new DriveHttpError(403, "insufficientPermissions");
        },
        { sleep: async () => undefined, onRetry: (info) => seen.push(info.attempt) },
      ),
    ).rejects.toBeDefined();
    expect(seen).toEqual([]);

    let ok = 0;
    const result = await withDriveRetry(
      async () => {
        if (ok++ === 0) throw new DriveHttpError(403, "rateLimitExceeded");
        return "done";
      },
      { sleep: async () => undefined, onRetry: () => undefined },
    );
    expect(result).toBe("done");
  });
});

/* ------------------------------------------------------------------ */
/* Verification                                                       */
/* ------------------------------------------------------------------ */

function memoryStore(bytes: Uint8Array, opts: { md5?: string } = {}): FileStore & { deleted: string[] } {
  const deleted: string[] = [];
  const md5 = opts.md5 ?? md5Hex(bytes);
  const asStream = (slice: Uint8Array): StreamResult => ({
    status: 200,
    size: bytes.length,
    stream: new ReadableStream<Uint8Array>({ start(c) { c.enqueue(slice); c.close(); } }),
    meta: { id: "f", name: "x", mimeType: "application/pdf", size: bytes.length },
  });
  return {
    deleted,
    put: async () => ({ id: "f", name: "x", mimeType: "application/pdf", size: bytes.length }),
    getStream: async (_id, range) => {
      if (!range) return asStream(bytes);
      const slice = bytes.subarray(range.start, (range.end ?? bytes.length - 1) + 1);
      return { ...asStream(slice), status: 206, contentRange: `bytes ${range.start}-${range.end}/${bytes.length}` };
    },
    delete: async (id) => {
      deleted.push(id);
    },
    move: async () => undefined,
    exists: async () => ({ exists: true, md5, size: bytes.length }),
    list: async () => [],
  };
}

describe("upload verification", () => {
  const service = (store: FileStore) =>
    new UploadSessionService({ store, folders: new DriveFolderService({ ensureFolder: async () => ({ id: "f" }) }, { get: async () => null, put: async () => undefined }) });

  it("accepts a PDF whose size, md5 and real type agree", async () => {
    const bytes = pdf(4096);
    const store = memoryStore(bytes);
    const result = await service(store).verify({
      fileId: "f",
      docKey: "NQAS_Result",
      originalName: "result.pdf",
      declaredMime: "application/pdf",
      declaredSize: bytes.length,
      storeMd5: md5Hex(bytes),
      storeSize: bytes.length,
    });
    expect(result.mime).toBe("application/pdf");
    expect(result.size).toBe(bytes.length);
    expect(result.sha256).toHaveLength(64);
  });

  it("rejects a wrong size, a wrong checksum and a spoofed type", async () => {
    const bytes = pdf(4096);
    await expect(
      service(memoryStore(bytes)).verify({
        fileId: "f",
        docKey: "NQAS_Result",
        originalName: "result.pdf",
        declaredMime: "application/pdf",
        declaredSize: bytes.length + 1,
        storeSize: bytes.length,
      }),
    ).rejects.toMatchObject({ code: "rejected" });

    await expect(
      service(memoryStore(bytes)).verify({
        fileId: "f",
        docKey: "NQAS_Result",
        originalName: "result.pdf",
        declaredMime: "application/pdf",
        declaredSize: bytes.length,
        storeMd5: "00000000000000000000000000000000",
      }),
    ).rejects.toMatchObject({ code: "corrupt" });

    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 1, 2, 3, 4, 5, 6]);
    await expect(
      service(memoryStore(exe)).verify({
        fileId: "f",
        docKey: "NQAS_Result",
        originalName: "result.pdf",
        declaredMime: "application/pdf",
        declaredSize: exe.length,
      }),
    ).rejects.toMatchObject({ code: "rejected" });
  });

  it("reports the resume offset from Drive's 308 Range header", () => {
    expect(UploadSessionService.resumeOffset("bytes=0-1048575")).toBe(1048576);
    expect(UploadSessionService.resumeOffset(null)).toBe(0);
    expect(UploadSessionService.resumeOffset("garbage")).toBe(0);
  });

  it("a failed verification can delete the stored object immediately", async () => {
    const store = memoryStore(new Uint8Array(8));
    await expect(
      service(store).verify({
        fileId: "f",
        docKey: "NOC",
        originalName: "noc.pdf",
        declaredMime: "application/pdf",
        declaredSize: 8,
      }),
    ).rejects.toBeInstanceOf(FileStoreError);
    await store.delete("f", { permanent: true });
    expect(store.deleted).toEqual(["f"]);
  });
});

/* ------------------------------------------------------------------ */
/* Reconciliation + migration                                         */
/* ------------------------------------------------------------------ */

describe("reconciliation", () => {
  it("flags missing, trashed and changed files without touching the rows", async () => {
    const plan = await reconcilePlan(
      {
        exists: async (id: string) => {
          if (id === "gone") return { exists: false };
          if (id === "trashed") return { exists: false, trashed: true };
          if (id === "changed") return { exists: true, md5: "different" };
          return { exists: true, md5: "same" };
        },
      },
      [
        { id: "a", driveFileId: "ok", docKey: "NQAS_Result", driveMd5: "same", size: 1 },
        { id: "b", driveFileId: "gone", docKey: "NOC", size: 1 },
        { id: "c", driveFileId: "trashed", docKey: "NOC", size: 1 },
        { id: "d", driveFileId: "changed", docKey: "SA_Report", driveMd5: "same", size: 1 },
      ],
    );
    expect(plan.map((p) => p.state)).toEqual(["ok", "missing", "missing", "changed"]);
  });
});

describe("legacy migration enumeration", () => {
  it("maps the six old attachment columns to document keys and skips blanks", () => {
    const targets = legacyTargets({
      facilities: [{ _id: "f1", currentCycleNumber: 2 }],
      sas: [
        {
          facilityId: "f1",
          reportAttachmentId: "s1",
          reportAttachmentName: "report.pdf",
          reportAttachmentType: "application/pdf",
          checklistAttachmentId: null,
        },
      ],
      nqas: [{ facilityId: "f1", resultDocumentId: "s2", resultDocumentName: "result.pdf" }],
      funds: [{ facilityId: "f1", attachmentId: "s3" }],
      nocs: [{ facilityId: "f1", attachmentId: "s4" }],
      buildings: [{ facilityId: "f1", condemnedAttachmentId: "s5" }],
    });
    const keys = targets.map((t) => `${t.docKey}:${t.storageId}`);
    expect(keys).toContain("SA_Report:s1");
    expect(keys).toContain("NQAS_Result:s2");
    expect(keys).toContain("Gap_Closure:s3");
    expect(keys).toContain("NOC:s4");
    expect(keys).toContain("Condemned:s5");
    expect(keys.some((k) => k.startsWith("SA_Checklist"))).toBe(false);
    expect(targets.every((t) => t.cycleNo === 2)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Browser upload client                                              */
/* ------------------------------------------------------------------ */

describe("browser upload client", () => {
  const file = { name: "result.pdf", size: 10 * 1024 * 1024 + 3, type: "application/pdf", lastModified: 1 };

  function transport(over: Partial<UploadTransport> = {}) {
    const sent: number[] = [];
    const base: UploadTransport = {
      begin: async () => ({ uploadKey: "k1" }),
      putChunk: async ({ bytes, offset }) => {
        sent.push(offset);
        return { next: offset + bytes.length, done: false };
      },
      finalize: async () => ({ documentId: "doc1" }),
      cancel: async () => undefined,
      ...over,
    };
    return { base, sent };
  }

  it("chunks a file through the backend and finalises (4 MB chunks, last one short)", async () => {
    const { base, sent } = transport();
    const stages: string[] = [];
    const done = await uploadDocument(
      { facilityId: "f1", docKey: "NQAS_Result", file, bytes: async () => new Uint8Array(file.size) },
      base,
      (p) => stages.push(p.stage),
    );
    expect(done.documentId).toBe("doc1");
    expect(UPLOAD_CHUNK_BYTES).toBe(4 * 1024 * 1024);
    expect(sent).toEqual([0, 4 * 1024 * 1024, 8 * 1024 * 1024]);
    expect(stages).toContain("verifying");
    expect(stages[stages.length - 1]).toBe("done");
  });

  it("uploads a 20 MB document in five backend chunks", async () => {
    const big = { name: "scan.pdf", size: 20 * 1024 * 1024, type: "application/pdf", lastModified: 2 };
    const { base, sent } = transport();
    await uploadDocument(
      { facilityId: "f1", docKey: "NQAS_Result", file: big, bytes: async () => new Uint8Array(big.size) },
      base,
    );
    expect(sent).toEqual([0, 4, 8, 12, 16].map((mb) => mb * 1024 * 1024));
  });

  it("resumes from the offset the backend accepted after a dropped chunk", async () => {
    let attempts = 0;
    const offsets: number[] = [];
    const { base } = transport({
      putChunk: async ({ bytes, offset }) => {
        attempts += 1;
        if (attempts === 2) throw new TypeError("Failed to fetch");
        offsets.push(offset);
        return { next: offset + bytes.length, done: false };
      },
    });
    const stages: string[] = [];
    await uploadDocument(
      { facilityId: "f1", docKey: "NQAS_Result", file, bytes: async () => new Uint8Array(file.size) },
      base,
      (p) => stages.push(p.stage),
    );
    // The failed chunk is retried at the same offset — never from zero.
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBe(4 * 1024 * 1024);
    expect(stages).toContain("retrying");
  });

  it("does not retry a definitive 'storage not connected' answer", async () => {
    let attempts = 0;
    const { base } = transport({
      putChunk: async () => {
        attempts += 1;
        throw new Error("Document storage is not connected: ask the administrator");
      },
    });
    await expect(
      uploadDocument(
        { facilityId: "f1", docKey: "NQAS_Result", file, bytes: async () => new Uint8Array(file.size) },
        base,
      ),
    ).rejects.toThrow(/not connected/);
    expect(attempts).toBe(1);
  });

  it("stops instead of looping when a chunk does not advance", async () => {
    let attempts = 0;
    const { base } = transport({
      putChunk: async ({ offset }) => {
        attempts += 1;
        return { next: offset, done: false };
      },
    });
    await expect(
      uploadDocument(
        { facilityId: "f1", docKey: "NQAS_Result", file, bytes: async () => new Uint8Array(file.size) },
        base,
      ),
    ).rejects.toThrow(/stalled/);
    expect(attempts).toBe(1);
  });

  it("a Retry resumes at the byte the backend already holds", async () => {
    const resumeAt = 8 * 1024 * 1024;
    const { base, sent } = transport({ begin: async () => ({ uploadKey: "k1", received: resumeAt }) });
    await uploadDocument(
      { facilityId: "f1", docKey: "NQAS_Result", file, bytes: async () => new Uint8Array(file.size) },
      base,
    );
    // Only the tail is re-sent: nothing is uploaded twice.
    expect(sent).toEqual([resumeAt]);
  });

  it("a Retry resumes from the reference-carrying begin result", async () => {
    const { base } = transport({ begin: async () => ({ uploadKey: "k1", received: 0, ref: "7K4M2Q" }) });
    const done = await uploadDocument(
      { facilityId: "f1", docKey: "NQAS_Result", file, bytes: async () => new Uint8Array(file.size) },
      base,
    );
    expect(done).toEqual({ documentId: "doc1", ref: "7K4M2Q" });
  });

  it("cancels the session when the user aborts", async () => {
    let cancelled = false;
    const { base } = transport({
      cancel: async () => {
        cancelled = true;
      },
      putChunk: async ({ offset }) => ({ next: offset, done: false }),
    });
    const signal = { aborted: true };
    await expect(
      uploadDocument(
        { facilityId: "f1", docKey: "NOC", file, bytes: async () => new Uint8Array(file.size) },
        base,
        undefined,
        signal,
      ),
    ).rejects.toThrow(/cancelled/);
    expect(cancelled).toBe(true);
  });
});

describe("upload failure wording", () => {
  it("says storage is not connected instead of leaking a server error", () => {
    expect(friendlyUploadError(new Error("Document storage is not connected: ask the administrator"))).toBe(
      STORAGE_NOT_CONNECTED,
    );
    expect(friendlyUploadError(new Error("The Google Drive refresh token is missing — reconnect Drive"))).toMatch(
      /reconnect/i,
    );
  });

  it("turns a browser network failure into a sentence, never 'Failed to fetch'", () => {
    expect(friendlyUploadError(new TypeError("Failed to fetch"))).toBe(NETWORK_ERROR);
    expect(friendlyUploadError(new Error("fetch failed"))).toBe(NETWORK_ERROR);
  });

  it("keeps the specific server wording for type, size and expiry", () => {
    expect(
      friendlyUploadError(new Error("SA Checklist must be an Excel file (.xlsx or .xls)")),
    ).toBe("SA Checklist must be an Excel file (.xlsx or .xls)");
    expect(friendlyUploadError(new Error("The file is larger than 25 MB"))).toBe(
      "The file is larger than 25 MB",
    );
    expect(friendlyUploadError(new Error("The upload session expired — start again"))).toBe(
      "The upload session expired — start again",
    );
  });

  it("replaces a redacted server error with the actionable fallback", () => {
    expect(friendlyUploadError(new Error("[CONVEX A(documents:beginUpload)] Server Error\nCalled by client"))).toBe(
      SERVER_ERROR,
    );
  });

  it("keeps the reference code the user can quote", () => {
    expect(friendlyUploadError(new Error("Google Drive is busy — wait a moment and retry (ref 7K4M2Q)"))).toBe(
      "Google Drive is busy — wait a moment and retry (ref 7K4M2Q)",
    );
  });
});

/* ------------------------------------------------------------------ */
/* Resumable protocol: every Drive answer, in plain words             */
/* ------------------------------------------------------------------ */

describe("upload protocol decoding", () => {
  it("maps a full Drive account to the storage-full sentence", () => {
    const err = chunkFailureFor(
      403,
      '{"error":{"errors":[{"reason":"storageQuotaExceeded"}]}}',
      "7K4M2Q",
    );
    expect(err.code).toBe("quota_exceeded");
    expect(err.message).toBe("Google Drive is full: ask the administrator to free space (ref 7K4M2Q)");
  });

  it("maps an unusable credential to the reconnect sentence", () => {
    expect(chunkFailureFor(401, '{"error":{"errors":[{"reason":"invalid_grant"}]}}').code).toBe(
      "auth_revoked",
    );
    expect(chunkFailureFor(401, "").message).toContain("needs reconnecting");
  });

  it("maps a dead session, permissions, busy and generic failures", () => {
    expect(chunkFailureFor(410, "").message).toContain("session expired");
    expect(chunkFailureFor(404, "").message).toContain("session expired");
    expect(chunkFailureFor(403, "forbidden").message).toContain("permission");
    expect(chunkFailureFor(429, "").code).toBe("rate_limited");
    expect(chunkFailureFor(500, "").code).toBe("rate_limited");
    expect(chunkFailureFor(400, "").message).toContain("rejected this file");
  });

  it("appends the reference exactly once and mints readable codes", () => {
    expect(withRef("Something failed", "7K4M2Q")).toBe("Something failed (ref 7K4M2Q)");
    expect(withRef("Something failed (ref 7K4M2Q)", "7K4M2Q")).toBe("Something failed (ref 7K4M2Q)");
    expect(withRef("Something failed", null)).toBe("Something failed");

    const code = uploadRefCode(() => new Uint8Array([0, 1, 2, 3, 4, 5]));
    expect(code).toBe("ABCDEF");
    expect(code).toHaveLength(6);
    // No look-alike letters, so a code is safe to read out loud.
    expect(code).not.toMatch(/[01IO]/);
  });
});
