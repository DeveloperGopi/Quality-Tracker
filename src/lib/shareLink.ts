/**
 * SHARE LINKS — the QR on the facility sheet, and everything around it.
 *
 * ROOT CAUSE (Part 4): the sheet used to encode
 *   /facilities?nin=…&report=NQAS-…-C1&cycle=%231
 * (src/lib/qrCode.ts → verifyUrl), a SIGN-IN-GATED list page built from the
 * browser's `window.location.origin`. That route ignores `nin`/`report`/
 * `cycle`, never shows a PDF, and for anyone outside the app is a dead end.
 * Scanning a printed sheet must open the printed sheet.
 *
 * Now the QR encodes ONE short URL on the saved App address:
 *   https://<APP_ORIGIN>/r/<token>
 * where `<token>` is a random base64url id (≥128 bits) for a stored SNAPSHOT
 * of this exact PDF — never live data, never another facility.
 *
 * Pure module: no React, no Convex, no jsPDF. The Convex backend, the digital
 * copy page, the print dialog and the tests all read these rules from here.
 */

/** Route the digital copy page is served from (a real React route). */
export const SHARE_ROUTE = "/r";

/** Setting keys (appSettings), State Admin, audited through `facilities.setSetting`. */
export const SHARE_SETTINGS_KEYS = {
  validityDays: "shareLinkValidityDays",
  requireSignIn: "shareRequireSignIn",
  allowDownload: "shareAllowDownload",
  typeLabels: "reportTypeLabels",
  documentLinkMode: "documentLinkMode",
} as const;

export const DEFAULT_SHARE_SETTINGS = {
  /** 0 = the link never expires. */
  validityDays: 180,
  requireSignIn: false,
  allowDownload: true,
  /** "on" | "signin" | "off" — the "Open" links printed in the sheet. */
  documentLinkMode: "on" as DocumentLinkMode,
} as const;

export type DocumentLinkMode = "on" | "signin" | "off";

export type ShareSettings = {
  validityDays: number;
  requireSignIn: boolean;
  allowDownload: boolean;
  documentLinkMode: DocumentLinkMode;
};

function toMode(value: unknown): DocumentLinkMode {
  return value === "off" || value === "signin" || value === "on"
    ? value
    : DEFAULT_SHARE_SETTINGS.documentLinkMode;
}

const toInt = (v: unknown, fallback: number): number => {
  const n = typeof v === "number" ? v : Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

const toBool = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : typeof v === "string" ? v === "true" || v === "1" : fallback;

/** Merge stored (possibly missing / malformed) values over the defaults.
 *  A string `"false"` is false — never truthy because it is a string. */
export function resolveShareSettings(raw: unknown): ShareSettings {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    validityDays: toInt(src[SHARE_SETTINGS_KEYS.validityDays], DEFAULT_SHARE_SETTINGS.validityDays),
    requireSignIn: toBool(src[SHARE_SETTINGS_KEYS.requireSignIn], DEFAULT_SHARE_SETTINGS.requireSignIn),
    allowDownload: toBool(src[SHARE_SETTINGS_KEYS.allowDownload], DEFAULT_SHARE_SETTINGS.allowDownload),
    documentLinkMode: toMode(src[SHARE_SETTINGS_KEYS.documentLinkMode]),
  };
}

/* --------------------------------------------------------------------------- */
/* Tokens                                                                      */
/* --------------------------------------------------------------------------- */

const TOKEN_RE = /^[A-Za-z0-9_-]{22,64}$/;

/** 22–24 base64url characters = 128+ bits of entropy, no padding. */
export function newShareToken(): string {
  const bytes = new Uint8Array(18);
  const g = globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
  if (g.crypto?.getRandomValues) g.crypto.getRandomValues(bytes);
  else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isShareToken(value: unknown): boolean {
  return typeof value === "string" && TOKEN_RE.test(value);
}

/* --------------------------------------------------------------------------- */
/* URLs                                                                        */
/* --------------------------------------------------------------------------- */

/** The origin every printed link is built from: the SAVED App address
 *  (Admin → Google Drive → App address), never `window.location` — the sheet
 *  must open on the deployed host, not on a preview or a file:// page. */
export function normalizeAppOrigin(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

export function shareUrl(origin: string | null | undefined, token: string): string {
  const base = normalizeAppOrigin(origin);
  if (!base || !isShareToken(token)) return "";
  return `${base}${SHARE_ROUTE}/${token}`;
}

/** `/r/<shareToken>/d/<docToken>` — the printed per-document link. */
export function documentLinkUrl(
  origin: string | null | undefined,
  shareToken: string,
  docToken: string,
): string {
  const page = shareUrl(origin, shareToken);
  if (!page || !/^[A-Za-z0-9_-]{22,64}$/.test(docToken)) return "";
  return `${page}/d/${docToken}`;
}

/** `/r/<token>/file` (inline) and `…?download=1` — both stream through the
 *  app, never through Drive. */
export function shareFileUrl(
  origin: string | null | undefined,
  token: string,
  download = false,
): string {
  const page = shareUrl(origin, token);
  if (!page) return "";
  return download ? `${page}/file?download=1` : `${page}/file`;
}

/**
 * The HTTP-action host that actually streams the bytes
 * (`https://<deployment>.convex.site/shared/content?token=…`). Derived from
 * `VITE_CONVEX_URL` — never hand-written, so it follows the deployment.
 */
export function convexSiteOrigin(viteConvexUrl: string | null | undefined): string {
  const raw = String(viteConvexUrl ?? "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  return raw.includes(".convex.cloud") ? raw.replace(".convex.cloud", ".convex.site") : raw;
}

/** Absolute stream URL — the direct fallback the `/r/<token>/file` route
 *  redirects to, and the "if the download does not start" link. */
export function shareStreamUrl(
  viteConvexUrl: string | null | undefined,
  token: string,
  download = false,
): string {
  const base = convexSiteOrigin(viteConvexUrl);
  if (!base || !isShareToken(token)) return "";
  return `${base}/shared/content?token=${encodeURIComponent(token)}${download ? "&download=1" : ""}`;
}

/** Absolute document stream (`/shared/doc?token=<docToken>`) — the endpoint
 *  the `/r/<share>/d/<doc>` route hands the browser to. */
export function shareDocumentStreamUrl(
  viteConvexUrl: string | null | undefined,
  shareToken: string,
  docToken: string,
  download = false,
): string {
  const base = convexSiteOrigin(viteConvexUrl);
  if (!base || !isShareToken(shareToken) || !/^[A-Za-z0-9_-]{22,64}$/.test(docToken)) return "";
  return `${base}/shared/doc?token=${encodeURIComponent(shareToken)}&doc=${encodeURIComponent(docToken)}${download ? "&download=1" : ""}`;
}

/** `26-Oct-2026 10:26 IST` — the printed stamp, in IST whatever the device
 *  clock says (the sheet, the digital copy page and the tests read this). */
export function istStampText(value: number | Date = Date.now()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const ist = new Date(date.getTime() + 5.5 * 3600_000);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(ist.getUTCDate())}-${months[ist.getUTCMonth()]}-${ist.getUTCFullYear()} ${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())} IST`;
}

/* --------------------------------------------------------------------------- */
/* Expiry                                                                      */
/* --------------------------------------------------------------------------- */

/** Absolute expiry timestamp (ms). 0 = never expires. */
export function shareExpiry(now: number, validityDays: number): number {
  if (!validityDays || validityDays <= 0) return 0;
  return now + validityDays * 86_400_000;
}

export function isShareExpired(expiresAt: number | null | undefined, now: number): boolean {
  return !!expiresAt && expiresAt > 0 && expiresAt <= now;
}

/** Days until expiry, for the admin list ("expires in 174 days"). */
export function daysToExpiry(expiresAt: number | null | undefined, now: number): number | null {
  if (!expiresAt || expiresAt <= 0) return null;
  return Math.ceil((expiresAt - now) / 86_400_000);
}

/* --------------------------------------------------------------------------- */
/* Content hash — decides whether a snapshot can be reused                      */
/* --------------------------------------------------------------------------- */

function fnv1a(text: string): string {
  // Fallback when WebCrypto is unavailable: two 32-bit lanes, still a content
  // hash (never a security boundary — the token carries the security).
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    a ^= text.charCodeAt(i);
    a = Math.imul(a, 0x01000193) >>> 0;
    b = (Math.imul(b ^ text.charCodeAt(i), 0x85ebca6b) + i) >>> 0;
  }
  return `fnv-${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`;
}

/**
 * SHA-256 of the printed content: the file name (its generation date), the
 * data-as-of stamp and every printed card/fact — but NOT the time of day the
 * file was made, so regenerating the same unchanged facility on the same day
 * reuses the snapshot instead of storing a second copy.
 */
/** JSON with object keys sorted at every level — two renders of the same
 *  data hash identically whatever order the backend returned the fields in. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

export async function sheetContentHash(input: {
  fileName: string;
  dataAsOf: string;
  printed: unknown;
}): Promise<string> {
  const canonical = stableStringify({
    fileName: input.fileName,
    dataAsOf: input.dataAsOf,
    printed: input.printed,
  });
  const subtle = (globalThis as { crypto?: Crypto }).crypto?.subtle;
  if (!subtle) return fnv1a(canonical);
  try {
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(canonical));
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return fnv1a(canonical);
  }
}
