const SHARE_ROUTE = "/r";
const SHARE_SETTINGS_KEYS = {
  validityDays: "shareLinkValidityDays",
  requireSignIn: "shareRequireSignIn",
  allowDownload: "shareAllowDownload",
  typeLabels: "reportTypeLabels",
  documentLinkMode: "documentLinkMode"
};
const TOKEN_RE = /^[A-Za-z0-9_-]{22,64}$/;
function isShareToken(value) {
  return typeof value === "string" && TOKEN_RE.test(value);
}
function normalizeAppOrigin(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}
function shareUrl(origin, token) {
  const base = normalizeAppOrigin(origin);
  if (!base || !isShareToken(token)) return "";
  return `${base}${SHARE_ROUTE}/${token}`;
}
function shareFileUrl(origin, token, download = false) {
  const page = shareUrl(origin, token);
  if (!page) return "";
  return download ? `${page}/file?download=1` : `${page}/file`;
}
function convexSiteOrigin(viteConvexUrl) {
  const raw = String(viteConvexUrl).trim().replace(/\/+$/, "");
  if (!raw) return "";
  return raw.includes(".convex.cloud") ? raw.replace(".convex.cloud", ".convex.site") : raw;
}
function shareStreamUrl(viteConvexUrl, token, download = false) {
  const base = convexSiteOrigin(viteConvexUrl);
  if (!base || !isShareToken(token)) return "";
  return `${base}/shared/content?token=${encodeURIComponent(token)}${download ? "&download=1" : ""}`;
}
function shareDocumentStreamUrl(viteConvexUrl, shareToken, docToken, download = false) {
  const base = convexSiteOrigin(viteConvexUrl);
  if (!base || !isShareToken(shareToken) || !/^[A-Za-z0-9_-]{22,64}$/.test(docToken)) return "";
  return `${base}/shared/doc?token=${encodeURIComponent(shareToken)}&doc=${encodeURIComponent(docToken)}${download ? "&download=1" : ""}`;
}
function istStampText(value = Date.now()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const ist = new Date(date.getTime() + 5.5 * 36e5);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(ist.getUTCDate())}-${months[ist.getUTCMonth()]}-${ist.getUTCFullYear()} ${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())} IST`;
}
function fnv1a(text) {
  let a = 2166136261;
  let b = 16777619;
  for (let i = 0; i < text.length; i += 1) {
    a ^= text.charCodeAt(i);
    a = Math.imul(a, 16777619) >>> 0;
    b = Math.imul(b ^ text.charCodeAt(i), 2246822507) + i >>> 0;
  }
  return `fnv-${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`;
}
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value).filter(([, v]) => v !== void 0).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}
async function sheetContentHash(input) {
  const canonical = stableStringify({
    fileName: input.fileName,
    dataAsOf: input.dataAsOf,
    printed: input.printed
  });
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return fnv1a(canonical);
  try {
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(canonical));
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return fnv1a(canonical);
  }
}

export { SHARE_SETTINGS_KEYS as S, SHARE_ROUTE as a, shareDocumentStreamUrl as b, shareStreamUrl as c, sheetContentHash as d, convexSiteOrigin as e, istStampText as i, shareFileUrl as s };
