const REDIRECT_PATH = "/drive/oauth/callback";
const LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const fail = (error) => ({ ok: false, error });
function normalizeOrigin(input) {
  return String(input ?? "").trim().replace(/\/+$/, "");
}
function validateAppOrigin(raw, opts = {}) {
  const input = String(raw ?? "").trim();
  if (!input) return fail("Enter the address this app is served from.");
  let url;
  try {
    url = new URL(input);
  } catch {
    return fail("That is not a full address. Use the form https://your-app.example.com");
  }
  if (url.username || url.password) return fail("Remove the username and password from the address.");
  if (url.pathname !== "/" && url.pathname !== "") {
    return fail("Use the address only — remove the path after the domain.");
  }
  if (url.search || url.hash) return fail("Remove the query string or #fragment from the address.");
  const isHttps = url.protocol === "https:";
  const isLocal = url.protocol === "http:" && opts.allowLocalhost !== false && LOCAL_HOSTS.has(url.hostname);
  if (!isHttps && !isLocal) {
    return fail("Use https:// — a plain http:// address is only allowed for localhost during development.");
  }
  const normalized = url.origin;
  if (opts.trustedOrigin) {
    let trusted = "";
    try {
      trusted = new URL(opts.trustedOrigin).origin;
    } catch {
      trusted = "";
    }
    if (trusted && trusted !== normalized) {
      return fail(`This app is served from ${trusted}. Enter that address.`);
    }
  }
  return { ok: true, value: normalized };
}
function redirectUriFor(appOrigin) {
  const origin = normalizeOrigin(String(appOrigin ?? ""));
  return `${origin}${REDIRECT_PATH}`;
}
function validateClientId(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return fail("Paste the Client ID from Google Cloud (Credentials → OAuth 2.0 Client IDs).");
  if (/\s/.test(value)) return fail("The Client ID cannot contain spaces.");
  if (!value.endsWith(".apps.googleusercontent.com")) {
    return fail("A Google OAuth Client ID ends with .apps.googleusercontent.com");
  }
  return { ok: true, value };
}
function driveOauthNotice(flag) {
  switch (flag) {
    case void 0:
    case null:
    case "":
      return null;
    case "connected":
      return {
        tone: "ok",
        title: "Google Drive connected",
        detail: "Documents now upload to the department's Drive. The self-test below shows what works.",
        showChecklist: false
      };
    case "denied":
      return {
        tone: "error",
        title: "Consent was cancelled",
        detail: "Nobody approved access, so nothing changed. Press Connect Google Drive and approve with the department account.",
        showChecklist: true
      };
    case "bad-state":
      return {
        tone: "error",
        title: "The sign-in link expired",
        detail: "For your security the consent link is single-use and lasts 10 minutes. Press Connect Google Drive again.",
        showChecklist: true
      };
    case "mismatch":
      return {
        tone: "error",
        title: "Google rejected the redirect address",
        detail: "The redirect URI saved in Google Cloud does not match this app. Copy the exact value from the redirect box below into Google Cloud → Clients → your OAuth client → Authorized redirect URIs.",
        showChecklist: true
      };
    case "invalid-client":
      return {
        tone: "error",
        title: "Google did not accept the Client ID or secret",
        detail: "Re-copy both values from Google Cloud (the secret is shown only once there) and save them again. If the OAuth client was deleted, create a new one.",
        showChecklist: true
      };
    case "unverified":
      return {
        tone: "info",
        title: "This Google Cloud project is not verified yet",
        detail: "While the app is in Testing, only the Google accounts listed under Audience → Test users can approve it. Add the department account there, or publish the app.",
        showChecklist: true
      };
    case "session":
      return {
        tone: "error",
        title: "Your session ended",
        detail: "Connecting Google Drive needs an active State Admin session. Sign in again, then press Connect Google Drive once more.",
        showChecklist: true
      };
    case "not-admin":
      return {
        tone: "error",
        title: "State Admin only",
        detail: "Only the State Admin can connect Google Drive. Ask the State Admin to sign in and run the connection.",
        showChecklist: false
      };
    case "needs-setup":
      return {
        tone: "error",
        title: "Google Drive is not configured yet",
        detail: "Fill in the missing item(s) in the checklist below, save them, then press Connect Google Drive again.",
        showChecklist: true
      };
    default:
      return {
        tone: "error",
        title: "Google Drive could not be connected",
        detail: "Google returned an error before access was granted. Check the checklist below, then press Connect Google Drive again.",
        showChecklist: true
      };
  }
}
function driveOauthFlagFromError(message) {
  const m = String(message ?? "");
  if (/session|sign in again/i.test(m)) return "session";
  if (/only the state admin/i.test(m)) return "not-admin";
  if (/invalid or has expired|single-use/i.test(m)) return "bad-state";
  if (/redirect/i.test(m)) return "mismatch";
  if (/client id or secret/i.test(m)) return "invalid-client";
  if (/not (configured|connected)|needs:/i.test(m)) return "needs-setup";
  return "error";
}
const SECRET_FIELD_NAMES = [
  "client_secret",
  "clientSecret",
  "clientSecretCipher",
  "refresh_token",
  "refreshToken",
  "refreshTokenCipher",
  "access_token",
  "accessToken",
  "code_verifier",
  "codeVerifier",
  "password",
  "DRIVE_TOKEN_KEY",
  "DRIVE_CLIENT_SECRET"
];
new RegExp(
  `((?:${SECRET_FIELD_NAMES.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*[=:]\\s*)(?:"[^"]*"|'[^']*'|[^\\s,&}]+)`,
  "gi"
);

export { validateClientId as a, driveOauthFlagFromError as b, driveOauthNotice as d, redirectUriFor as r, validateAppOrigin as v };
