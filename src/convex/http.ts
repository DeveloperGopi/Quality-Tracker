/**
 * HTTP endpoints — document bytes.
 *
 * Convex's router has no path parameters, so documents are addressed by id in
 * the query string:
 *
 *   GET /api/documents/content?id=<doc>&token=<signed>&mode=attachment
 *   GET /api/documents/content?id=<doc>&token=<signed>&mode=inline
 *
 * The Google OAuth callback deliberately does NOT live here: this host
 * (`.convex.site`) is not the app origin, so the callback is the frontend
 * route `/drive/oauth/callback` on the app host (see
 * src/pages/DriveOauthCallback.tsx).
 *
 * The token is minted by `documents.getContentToken` AFTER a role + block-scope
 * + document-state check; it is HMAC-signed, binds the user and the document,
 * and expires in 5 minutes. The handler re-checks the document and the user's
 * scope, so a role change blocks access immediately even for a live token.
 *
 * Streaming is bounded: Drive's own Response body is passed through, never
 * buffered, and `Range` is honoured so a PDF viewer can page through a file.
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { verifyReadToken } from "./storage/crypto";
import { DriveAuth } from "./storage/driveAuth";
import { DriveClient, fetchTransport } from "./storage/driveClient";
import { DriveFileStore } from "./storage/driveFileStore";

const NO_STORE = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

/** The stream endpoints carry a short-lived, user-bound token (no cookies), so
 *  a cross-origin fetch from the app may read the bytes (spreadsheet preview)
 *  and the download name. */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Content-Range",
};

/**
 * The HMAC signing key for the separate AVATAR link: `DOC_TOKEN_KEY` when
 * set, else the resolved Drive encryption key (env or the one generated on
 * the Admin page). Resolved inside the request — never at module load.
 */
async function resolveTokenKey(ctx: { runQuery: (ref: never, args: never) => Promise<unknown> }): Promise<string | undefined> {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const docKey = proc?.env?.DOC_TOKEN_KEY?.trim();
  if (docKey) return docKey;
  const config = (await ctx.runQuery(internal.drive.configForServer as never, {} as never)) as {
    tokenKey: string | null;
  };
  return config.tokenKey ?? undefined;
}

/** Everything the Drive client needs, from the same resolver the page uses. */
async function driveEnvNow(ctx: { runQuery: (ref: never, args: never) => Promise<unknown> }) {
  const config = (await ctx.runQuery(internal.drive.configForServer as never, {} as never)) as {
    clientId: string | null;
    clientSecret: string | null;
    tokenKey: string | null;
    appOrigin: string | null;
  };
  return {
    clientId: config.clientId ?? undefined,
    clientSecret: config.clientSecret ?? undefined,
    tokenKey: config.tokenKey ?? undefined,
    appOrigin: config.appOrigin ?? undefined,
  };
}

function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return null;
  let start = rawStart ? Number(rawStart) : size - Number(rawEnd);
  let end = rawStart && rawEnd ? Number(rawEnd) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  start = Math.max(0, start);
  end = Math.min(size - 1, end);
  if (start > end) return null;
  return { start, end };
}

/** RFC 5987 filename for Content-Disposition (Tamil names included). */
function disposition(kind: "inline" | "attachment", name: string): string {
  const clipped = name.slice(0, 150);
  const fallback = clipped
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  return `${kind}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(clipped)}`;
}

const documentContent = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const token = url.searchParams.get("token") ?? "";
  const mode = url.searchParams.get("mode") === "inline" ? "inline" : "attachment";

  // Stateless HMAC token: verify (signature + expiry + binding) before bytes.
  // Legacy single-use rows are still accepted so a tab opened before the
  // deploy keeps working.
  const payload = await verifyReadToken(token, await resolveTokenKey(ctx));
  let userId: string | null = null;
  if (payload && payload.m === mode && payload.d === id) userId = payload.u;
  if (!userId) {
    const consumed = await ctx.runMutation(internal.documents.consumeContentToken, {
      token,
      documentId: id,
      mode,
    });
    if (!consumed.ok) {
      return new Response(consumed.reason, {
        status: 403,
        headers: { ...NO_STORE, ...CORS, "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    userId = consumed.userId;
  }

  const doc = await ctx.runQuery(internal.documents.docForStream, {
    documentId: id as never,
    userId,
  });
  if (!doc.ok) {
    return new Response(doc.reason, {
      status: doc.reason === "Document not found" ? 404 : 403,
      headers: { ...NO_STORE, ...CORS, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Every NQAS Result read is audited (who, when, which document).
  await ctx.runMutation(internal.documents.recordDocumentAccess, {
    documentId: id as never,
    userId: userId as never,
    docKey: doc.docKey,
    facilityId: doc.facilityId as never,
    mode,
  });

  const range = parseRange(req.headers.get("range"), doc.size);

  try {
    if (doc.storage === "drive") {
      const connection = await ctx.runQuery(internal.drive.readConnection, {});
      if (!connection) {
        return new Response("Document storage is unavailable: ask the administrator to reconnect Google Drive", {
          status: 503,
          headers: { ...NO_STORE, ...CORS, "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      const authClient = new DriveAuth({
        loadConnection: async () => connection,
        env: await driveEnvNow(ctx),
      });
      const client = new DriveClient({ transport: async () => fetchTransport(await authClient.accessToken()) });
      const store = new DriveFileStore(client);
      let media;
      try {
        media = await store.getStream(doc.driveFileId, range ?? undefined);
      } catch (err) {
        const code = (err as { code?: string }).code;
        return new Response(
          code === "auth_revoked"
            ? "Document storage is unavailable: ask the administrator to reconnect Google Drive"
            : "This document could not be read from storage",
          { status: code === "not_found" ? 404 : 503, headers: { ...NO_STORE, ...CORS, "Content-Type": "text/plain; charset=utf-8" } },
        );
      }
      // Inline only what a browser can actually render. Excel/CSV/Word are
      // ALWAYS attachments (an inline .xlsx is a blank tab or a download with
      // the wrong name).
      const inline =
        mode === "inline" && /^(application\/pdf|image\/)/i.test(doc.mimeType);
      const headers: Record<string, string> = {
        ...NO_STORE,
        ...CORS,
        "Content-Type": doc.mimeType,
        "Content-Disposition": disposition(
          inline ? "inline" : "attachment",
          (doc as { displayName?: string; originalName?: string }).displayName ??
            (doc as { originalName?: string }).originalName ??
            "document",
        ),
        "Accept-Ranges": "bytes",
      };
      if (range) {
        headers["Content-Range"] = `bytes ${range.start}-${range.end}/${doc.size}`;
        headers["Content-Length"] = String(range.end - range.start + 1);
      } else {
        headers["Content-Length"] = String(doc.size);
      }
      return new Response(media.stream, { status: range ? 206 : 200, headers });
    }

    /* Legacy bytes (pre-Drive, not migrated yet). Same rules, read locally. */
    if (!doc.legacyStorageId) {
      return new Response("This document has no stored file", { status: 404, headers: { ...NO_STORE, ...CORS } });
    }
    const blob = await ctx.storage.get(doc.legacyStorageId as never);
    if (!blob) {
      return new Response("This document is missing in storage", { status: 404, headers: { ...NO_STORE, ...CORS } });
    }
    const slice = range ? blob.slice(range.start, range.end + 1) : blob;
    return new Response(slice.stream(), {
      status: range ? 206 : 200,
      headers: {
        ...NO_STORE,
        ...CORS,
        "Content-Type": doc.mimeType,
        "Content-Disposition": disposition(
          mode === "inline" && /^(application\/pdf|image\/)/i.test(doc.mimeType)
            ? "inline"
            : "attachment",
          (doc as { displayName?: string; originalName?: string }).displayName ??
            (doc as { originalName?: string }).originalName ??
            "document",
        ),
        "Accept-Ranges": "bytes",
        "Content-Length": String(range ? range.end - range.start + 1 : blob.size),
        ...(range ? { "Content-Range": `bytes ${range.start}-${range.end}/${blob.size}` } : {}),
      },
    });
  } catch {
    return new Response("This document could not be read from storage", {
      status: 503,
      headers: { ...NO_STORE, ...CORS, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});

/**
 * GET /api/exports/content?job=<jobId>&part=<n>&token=<signed>
 *
 * One audited ZIP part. The signed token is bound to the requester; the query
 * re-checks ownership and that the job finished. Drive's id never leaves the
 * server.
 */
const exportContent = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("job") ?? "";
  const part = Number(url.searchParams.get("part") ?? "0");
  const token = url.searchParams.get("token") ?? "";
  const payload = await verifyReadToken(token, await resolveTokenKey(ctx));
  if (
    !payload ||
    payload.m !== "attachment" ||
    payload.d !== `export:${jobId}` ||
    !Number.isInteger(part) ||
    part < 0
  ) {
    return new Response("This download link is not valid. Reload the page and try again.", {
      status: 403,
      headers: { ...NO_STORE, ...CORS, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const content = await ctx.runQuery(internal.documentLibrary.exportForStream, {
    jobId,
    part,
    userId: payload.u,
  });
  if (!content.ok) {
    return new Response(content.reason, {
      status: 404,
      headers: { ...NO_STORE, ...CORS, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  await ctx.runMutation(internal.documentLibrary.recordExportDownload, {
    jobId,
    userId: payload.u,
    part,
  });

  const range = parseRange(req.headers.get("range"), content.size);
  const headers: Record<string, string> = {
    ...NO_STORE,
    ...CORS,
    "Content-Type": "application/zip",
    "Content-Disposition": disposition("attachment", content.name),
    "Accept-Ranges": "bytes",
    "Content-Length": String(range ? range.end - range.start + 1 : content.size),
    ...(range ? { "Content-Range": `bytes ${range.start}-${range.end}/${content.size}` } : {}),
  };

  try {
    const connection = await ctx.runQuery(internal.drive.readConnection, {});
    if (!connection) {
      return new Response("Document storage is unavailable: ask the administrator", {
        status: 503,
        headers: { ...NO_STORE, ...CORS, "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    const authClient = new DriveAuth({
      loadConnection: async () => connection,
      env: await driveEnvNow(ctx),
    });
    const client = new DriveClient({
      transport: async () => fetchTransport(await authClient.accessToken()),
    });
    const store = new DriveFileStore(client);
    const media = await store.getStream(content.driveFileId, range ?? undefined);
    return new Response(media.stream, { status: range ? 206 : 200, headers });
  } catch {
    return new Response("This ZIP could not be read from storage", {
      status: 503,
      headers: { ...NO_STORE, ...CORS, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});

const http = httpRouter();

/* --------------------------------------------------------------------------- */
/* Part 4 — the QR file endpoint: GET /shared/content?token=<t>[&download=1]     */
/* --------------------------------------------------------------------------- */

/** Soft rate limit per client: 30 requests / minute. The window only holds a
 *  timestamp per client key, and every entry older than the window is dropped
 *  on each write — no address is kept beyond the limit window. */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
const rateBuckets = new Map<string, number[]>();

function rateLimited(clientKey: string): boolean {
  const now = Date.now();
  const list = (rateBuckets.get(clientKey) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) {
    rateBuckets.set(clientKey, list);
    return true;
  }
  list.push(now);
  rateBuckets.set(clientKey, list);
  if (rateBuckets.size > 4000) {
    for (const [key, stamps] of rateBuckets) {
      if (stamps.every((t) => now - t >= RATE_WINDOW_MS)) rateBuckets.delete(key);
    }
  }
  return false;
}

const NOT_FOUND_BODY =
  "This link is no longer available. Ask the district office for a new copy.";

/**
 * Streams ONE stored snapshot. The token names the file: no Drive id, no
 * store path and no facility data is ever in the URL or the response body.
 * `?download=1` switches to attachment so the browser saves the exact file
 * name the sheet was generated under.
 */
const sharedContent = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const download = url.searchParams.get("download") === "1";
  const forward = req.headers.get("x-forwarded-for") ?? "";
  const client = (forward.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();

  if (rateLimited(client)) {
    return new Response("Too many requests — try again in a minute.", {
      status: 429,
      headers: {
        ...NO_STORE,
        "Retry-After": "60",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    });
  }

  const content = await ctx.runQuery(internal.share.contentForStream, { token });
  if (!content.ok) {
    // One generic answer for unknown, expired and revoked tokens.
    return new Response(NOT_FOUND_BODY, {
      status: content.reason === "pending" ? 404 : 404,
      headers: {
        ...NO_STORE,
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    });
  }

  const range = parseRange(req.headers.get("range"), content.size ?? 0);
  const headers: Record<string, string> = {
    ...NO_STORE,
    "Content-Type": "application/pdf",
    "Content-Disposition": disposition(download ? "attachment" : "inline", content.fileName),
    "Accept-Ranges": "bytes",
    "X-Robots-Tag": "noindex",
  };

  try {
    if (content.storage === "drive") {
      const connection = await ctx.runQuery(internal.drive.readConnection, {});
      if (!connection) {
        return new Response("Report storage is unavailable: ask the administrator.", {
          status: 503,
          headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      const authClient = new DriveAuth({
        loadConnection: async () => connection,
        env: await driveEnvNow(ctx),
      });
      const client2 = new DriveClient({
        transport: async () => fetchTransport(await authClient.accessToken()),
      });
      const store = new DriveFileStore(client2);
      const media = await store.getStream(content.driveFileId as string, range ?? undefined);
      if (range) {
        headers["Content-Range"] = `bytes ${range.start}-${range.end}/${content.size ?? 0}`;
        headers["Content-Length"] = String(range.end - range.start + 1);
      } else if (content.size != null) {
        headers["Content-Length"] = String(content.size);
      }
      return new Response(media.stream, { status: range ? 206 : 200, headers });
    }

    const blob = await ctx.storage.get(content.legacyStorageId as never);
    if (!blob) {
      return new Response(NOT_FOUND_BODY, {
        status: 404,
        headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    const slice = range ? blob.slice(range.start, range.end + 1) : blob;
    if (range) {
      headers["Content-Range"] = `bytes ${range.start}-${range.end}/${blob.size}`;
      headers["Content-Length"] = String(range.end - range.start + 1);
    } else {
      headers["Content-Length"] = String(blob.size);
    }
    return new Response(slice.stream(), { status: range ? 206 : 200, headers });
  } catch {
    return new Response("This report could not be read from storage", {
      status: 503,
      headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});

/**
 * Part 3 — GET /shared/doc?token=<share>&doc=<docToken>[&download=1]
 *
 * ONE document of a stored snapshot. The pair is checked against the share
 * row (revoked / expired / mode Off all answer with the same generic body),
 * and the bytes stream through this app: no Drive id, link or storage name in
 * the URL or the response. `mode=signin` is enforced by the digital copy page
 * (this endpoint has no session), which is why an anonymous hit gets a short
 * sign-in sentence instead of bytes.
 */
const sharedDocument = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const docToken = url.searchParams.get("doc") ?? "";
  const download = url.searchParams.get("download") === "1";
  const forward = req.headers.get("x-forwarded-for") ?? "";
  const client = (forward.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
  if (rateLimited(client)) {
    return new Response("Too many requests — try again in a minute.", {
      status: 429,
      headers: { ...NO_STORE, "Retry-After": "60", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const content = await ctx.runQuery(internal.share.contentForDoc, { token, docToken });
  if (!content.ok) {
    return new Response(NOT_FOUND_BODY, {
      status: 404,
      headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }

  // One audit line per open (document, time — no IP), then the bytes.
  await ctx.runMutation(internal.share.recordDocOpen, { token, docToken });

  const inline = /^application\/(pdf|octet-stream)$|^image\//i.test(content.mimeType);
  const disposition = inline && !download ? "inline" : "attachment";
  const range = parseRange(req.headers.get("range"), content.size);
  const headers: Record<string, string> = {
    ...NO_STORE,
    "Content-Type": content.mimeType,
    "Content-Disposition": disposition === "inline"
      ? `inline; filename="${content.fileName.replace(/["\\]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(content.fileName)}`
      : `attachment; filename="${content.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(content.fileName)}`,
    "Accept-Ranges": "bytes",
    "X-Robots-Tag": "noindex",
  };

  try {
    if (content.storage === "drive") {
      const connection = await ctx.runQuery(internal.drive.readConnection, {});
      if (!connection) {
        return new Response("Document storage is unavailable: ask the administrator.", {
          status: 503,
          headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      const authClient = new DriveAuth({
        loadConnection: async () => connection,
        env: await driveEnvNow(ctx),
      });
      const drive = new DriveClient({
        transport: async () => fetchTransport(await authClient.accessToken()),
      });
      const store = new DriveFileStore(drive);
      const media = await store.getStream(content.driveFileId as string, range ?? undefined);
      if (range) {
        headers["Content-Range"] = `bytes ${range.start}-${range.end}/${content.size}`;
        headers["Content-Length"] = String(range.end - range.start + 1);
      } else {
        headers["Content-Length"] = String(content.size);
      }
      return new Response(media.stream, { status: range ? 206 : 200, headers });
    }

    const blob = await ctx.storage.get(content.legacyStorageId as never);
    if (!blob) {
      return new Response(NOT_FOUND_BODY, {
        status: 404,
        headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    const slice = range ? blob.slice(range.start, range.end + 1) : blob;
    headers["Content-Length"] = String(range ? range.end - range.start + 1 : blob.size);
    if (range) {
      headers["Content-Range"] = `bytes ${range.start}-${range.end}/${blob.size}`;
    }
    return new Response(slice.stream(), { status: range ? 206 : 200, headers });
  } catch {
    return new Response("This document could not be read from storage", {
      status: 503,
      headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});

/**
 * GET /api/profile/avatar?u=<userId>&t=<signed token>
 *
 * The My Profile photo. The token is minted by `profile.myProfile` for the
 * signed-in user's OWN id only (mode "avatar", so it can never be replayed
 * against /api/documents/content) and the handler re-checks the binding. The
 * bytes stream straight from the `_avatars` folder in Drive — the store id
 * never appears in a URL, a query result or the page.
 */
const avatarContent = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  const uid = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";

  const payload = await verifyReadToken(token, await resolveTokenKey(ctx));
  if (!payload || payload.m !== "avatar" || payload.d !== uid || payload.u !== uid) {
    return new Response("This photo link has expired. Reload the page.", {
      status: 403,
      headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const avatar = await ctx.runQuery(internal.profile.avatarForStream, { userId: uid });
  if (!avatar.ok) {
    return new Response("No photo", {
      status: 404,
      headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const connection = await ctx.runQuery(internal.drive.readConnection, {});
    if (!connection) {
      return new Response("Photo storage is unavailable: ask the administrator to reconnect Google Drive", {
        status: 503,
        headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    const authClient = new DriveAuth({
      loadConnection: async () => connection,
      env: await driveEnvNow(ctx),
    });
    const client = new DriveClient({ transport: async () => fetchTransport(await authClient.accessToken()) });
    const store = new DriveFileStore(client);
    const media = await store.getStream(avatar.fileId);
    return new Response(media.stream, {
      status: 200,
      headers: {
        ...NO_STORE,
        // The token is stable for about an hour, so the browser may keep the
        // photo for exactly that long (no layout shift on every re-run).
        "Cache-Control": "private, max-age=3600",
        "Content-Type": avatar.mimeType,
        "Content-Length": String(media.size ?? media.meta.size ?? 0),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("This photo could not be read from storage", {
      status: 503,
      headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});

auth.addHttpRoutes(http);
http.route({ path: "/api/documents/content", method: "GET", handler: documentContent });
http.route({ path: "/api/exports/content", method: "GET", handler: exportContent });
http.route({ path: "/api/profile/avatar", method: "GET", handler: avatarContent });
http.route({ path: "/shared/content", method: "GET", handler: sharedContent });
http.route({ path: "/shared/doc", method: "GET", handler: sharedDocument });

export default http;
