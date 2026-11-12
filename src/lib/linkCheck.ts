/**
 * OPTIONAL LINK CHECKER — pure safety rules shared by the Node action and the
 * unit tests. The checker is OFF by default; when enabled it only reads a
 * public http(s) URL, never an item's status, and it refuses private,
 * loopback, link-local and metadata addresses before any request is made
 * (including every redirect hop).
 */

export const LINK_CHECK_TIMEOUT_MS = 5_000;
export const LINK_CHECK_MAX_REDIRECTS = 3;
export const LINK_CHECK_BYTE_LIMIT = 64 * 1024;
export const LINK_CHECK_CACHE_MS = 24 * 60 * 60 * 1000;
export const LINK_CHECK_PARALLEL = 4;

export type LinkCheckStatus = "ok" | "not_found" | "timeout" | "not_checked";

/** Hosts that always require a login and can never be health-checked safely. */
const LOGIN_GATED_EXACT = new Set([
  "forms.gle",
  "docs.google.com",
  "drive.google.com",
  "sheets.google.com",
  "script.google.com",
  "saqsham.nhsrcindia.org",
]);

export function isLoginGatedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (LOGIN_GATED_EXACT.has(host)) return true;
  return (
    host.endsWith(".google.com") ||
    host.endsWith(".googleusercontent.com") ||
    host.endsWith(".nhsrcindia.org")
  );
}

function ipv4Octets(value: string): number[] | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    octets.push(n);
  }
  return octets;
}

/** Private, loopback, link-local, CGNAT, documentation and multicast ranges. */
export function isBlockedIpv4(ip: string): boolean {
  const octets = ipv4Octets(ip);
  if (!octets) return true; // Not an IPv4 literal — the caller must resolve it.
  const [a, b, c] = octets;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}

export function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().split("%")[0];
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7
  if (/^fe[89ab]/.test(normalized)) return true; // fe80::/10 link-local
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isBlockedIpv4(mapped[1]);
  return false;
}

export function isBlockedAddress(address: string): boolean {
  return address.includes(":") ? isBlockedIpv6(address) : isBlockedIpv4(address);
}

export type LinkGuardResult =
  | { ok: true; url: URL; loginGated: boolean }
  | { ok: false; reason: string };

/** Pre-DNS guard. The action resolves the hostname and re-checks every IP. */
export function guardLinkCheckUrl(raw: string): LinkGuardResult {
  if (!raw || raw.length > 2048) return { ok: false, reason: "Link is missing or too long" };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "Not a valid URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http and https links can be checked" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "Credential-bearing links are never checked" };
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return { ok: false, reason: "The link has no hostname" };
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return { ok: false, reason: "Private hostnames are blocked" };
  }
  if (host.includes(":") ? isBlockedIpv6(host) : ipv4Octets(host)) {
    if (isBlockedAddress(host)) return { ok: false, reason: "Private or loopback address blocked" };
  }
  return { ok: true, url, loginGated: isLoginGatedHost(host) };
}

/** Map an HTTP response to the four UI words. */
export function statusFromResponse(status: number): LinkCheckStatus {
  if (status >= 200 && status < 400) return "ok";
  if (status === 404 || status === 410) return "not_found";
  // 401/403 and server errors are usually a login wall or a bot challenge —
  // they are not a broken link, so they stay “Not checked”.
  return "not_checked";
}

export function isFreshCheck(lastCheck: number | null | undefined, now = Date.now()): boolean {
  return typeof lastCheck === "number" && now - lastCheck < LINK_CHECK_CACHE_MS;
}
