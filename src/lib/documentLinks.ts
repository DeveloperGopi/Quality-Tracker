/**
 * DOCUMENT LINKS — the ONE place a stored file becomes a browser URL.
 *
 * The stream handler lives on the Convex site (`/api/documents/content`), NOT
 * on the app origin: a relative URL there returned the SPA's HTML instead of
 * bytes (the Preview/Open/Download bug). Every href is therefore built as
 * `<CONVEX_SITE_URL><path>` here.
 *
 * Tokens are minted by the backend action (after the role/scope/drive checks)
 * and cached for a little under their 5-minute life, so a row that re-renders
 * does not mint again. Links are real `<a href>` values — no `window.open`
 * after an await, so nothing is pop-up blocked.
 */

import { useEffect, useRef, useState } from "react";
import { useConvex, type ConvexReactClient } from "convex/react";

import { api } from "@/convex/_generated/api";
import { convexSiteOrigin } from "@/lib/shareLink";

export type DocumentMode = "inline" | "attachment";

type Cached = { url: string; expiresAt: number };

const cache = new Map<string, Cached>();

/** Join the backend path to the host that actually serves `/api/*`. */
export function absoluteDocumentUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = convexSiteOrigin(import.meta.env.VITE_CONVEX_URL as string);
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

function fresh(key: string): string | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt - 30_000 < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.url;
}

/** One document, one mode — cached by (document, mode). */
export async function getDocumentUrl(
  convex: ConvexReactClient,
  documentId: string,
  mode: DocumentMode,
): Promise<string> {
  const key = `${documentId}:${mode}`;
  const hit = fresh(key);
  if (hit) return hit;
  const { url, expiresAt } = await convex.action(api.documents.getContentToken, {
    documentId: documentId as never,
    mode,
  });
  const absolute = absoluteDocumentUrl(url);
  cache.set(key, { url: absolute, expiresAt });
  return absolute;
}

/**
 * Many documents in ONE action call (a library page must not make a request
 * per row). Only documents whose link is stale are minted.
 */
export async function getDocumentUrls(
  convex: ConvexReactClient,
  documentIds: string[],
  mode: DocumentMode,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const id of documentIds) {
    const hit = fresh(`${id}:${mode}`);
    if (hit) out[id] = hit;
    else missing.push(id);
  }
  const unique = Array.from(new Set(missing));
  if (unique.length > 0) {
    const paths = await convex.action(api.documents.getContentUrls, {
      documentIds: unique,
      mode,
    });
    // One shared expiry for the freshly minted batch.
    const expiresAt = Date.now() + 4.5 * 60_000;
    for (const id of unique) {
      const path = paths[id];
      if (!path) continue;
      const absolute = absoluteDocumentUrl(path);
      out[id] = absolute;
      cache.set(`${id}:${mode}`, { url: absolute, expiresAt });
    }
  }
  return out;
}

/** A single href, minted on mount. `null` while preparing. */
export function useDocumentUrl(
  documentId: string | null | undefined,
  mode: DocumentMode,
  enabled = true,
): string | null {
  const convex = useConvex();
  const [url, setUrl] = useState<string | null>(() =>
    documentId ? fresh(`${documentId}:${mode}`) : null,
  );

  useEffect(() => {
    if (!documentId || !enabled) return;
    let live = true;
    const hit = fresh(`${documentId}:${mode}`);
    if (hit) {
      setUrl(hit);
      return;
    }
    setUrl(null);
    const refresh = () => {
      void getDocumentUrl(convex, documentId, mode).then(
        (next) => {
          if (live) setUrl(next);
        },
        () => {
          /* the row falls back to a plain disabled control */
        },
      );
    };
    refresh();
    // A tab left open longer than the 5-minute token keeps working.
    const timer = window.setInterval(refresh, 4 * 60_000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [convex, documentId, mode, enabled]);

  return url;
}

/** A whole list's hrefs in one call (library page). */
export function useDocumentUrls(
  documentIds: string[],
  mode: DocumentMode,
  enabled = true,
  onError?: (message: string) => void,
  retryKey = 0,
): Record<string, string> {
  const convex = useConvex();
  const key = documentIds.join(",");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const errorRef = useRef(onError);
  errorRef.current = onError;

  useEffect(() => {
    if (!enabled || documentIds.length === 0) {
      setUrls({});
      return;
    }
    let live = true;
    const refresh = () => {
      void getDocumentUrls(convex, documentIds, mode).then(
        (next) => {
          if (live) setUrls(next);
        },
        (err: unknown) => {
          if (live) setUrls({});
          const message = err instanceof Error ? err.message : "The private PDF stream is not available.";
          errorRef.current?.(message);
        },
      );
    };
    refresh();
    // A tab left open longer than the 5-minute token keeps working.
    const timer = window.setInterval(refresh, 4 * 60_000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
    // `key` is the stable identity of the id list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convex, key, mode, enabled, retryKey]);

  return urls;
}
