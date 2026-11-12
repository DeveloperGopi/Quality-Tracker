/**
 * GOOGLE DRIVE CREDENTIALS — the shared, secret-free half.
 *
 * Everything here is pure and runs on both sides: the server uses it to
 * validate what the State Admin types, and the Admin page uses the SAME
 * functions to preview the error before the request goes out. Nothing in this
 * file ever receives or returns a secret value — the client secret is only
 * ever a boolean ("saved" / "not saved") by the time it reaches a component.
 */

export type CredentialSource = "env" | "admin" | "missing";

/**
 * The path Google redirects back to (registered in Google Cloud). It is a
 * REAL frontend route — the app host serves the SPA for every path, so the
 * callback page lives here rather than on the Convex `.convex.site` host.
 */
export const REDIRECT_PATH = "/drive/oauth/callback";

/** AAD purposes — one per encrypted field, so ciphertexts are not portable. */
export const CLIENT_SECRET_PURPOSE = "client-secret";
export const REFRESH_TOKEN_PURPOSE = "refresh-token";

export const DRIVE_CREDENTIALS_KEY = "google_drive";
export const DRIVE_SECRET_KEY = "drive-token-key";

export const DRIVE_ENV_NAMES = [
  "DRIVE_CLIENT_ID",
  "DRIVE_CLIENT_SECRET",
  "DRIVE_TOKEN_KEY",
  "APP_ORIGIN",
] as const;

export type Validation = { ok: true; value: string } | { ok: false; error: string };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

const fail = (error: string): Validation => ({ ok: false, error });

/** Trim and drop trailing slashes — the canonical origin form. */
export function normalizeOrigin(input: string): string {
  return String(input ?? "").trim().replace(/\/+$/, "");
}

/**
 * The app address must be the origin only: `https://…`, no path, no query, no
 * trailing slash. `http://` is allowed for localhost during development only.
 * `trustedOrigin` (the host the request actually arrived on) is enforced when
 * the server knows it, so a pasted address can never quietly point the OAuth
 * redirect at somebody else's domain.
 */
export function validateAppOrigin(
  raw: string,
  opts: { allowLocalhost?: boolean; trustedOrigin?: string | null } = {},
): Validation {
  const input = String(raw ?? "").trim();
  if (!input) return fail("Enter the address this app is served from.");

  let url: URL;
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

/** `{origin}/drive/oauth/callback` — the exact value to paste in Google Cloud. */
export function redirectUriFor(appOrigin: string | null | undefined): string {
  const origin = normalizeOrigin(String(appOrigin ?? ""));
  return `${origin}${REDIRECT_PATH}`;
}

export function validateClientId(raw: string): Validation {
  const value = String(raw ?? "").trim();
  if (!value) return fail("Paste the Client ID from Google Cloud (Credentials → OAuth 2.0 Client IDs).");
  if (/\s/.test(value)) return fail("The Client ID cannot contain spaces.");
  if (!value.endsWith(".apps.googleusercontent.com")) {
    return fail("A Google OAuth Client ID ends with .apps.googleusercontent.com");
  }
  return { ok: true, value };
}

export function validateClientSecret(raw: string): Validation {
  const value = String(raw ?? "").trim();
  if (!value) return fail("Paste the Client secret from Google Cloud.");
  if (/\s/.test(value)) return fail("The Client secret cannot contain spaces.");
  if (value.length < 8) return fail("That does not look like a Google Client secret (too short).");
  return { ok: true, value };
}

/* ------------------------------------------------------------------ */
/* Checklist                                                          */
/* ------------------------------------------------------------------ */

export type DriveChecklistKey =
  | "clientId"
  | "clientSecret"
  | "appOrigin"
  | "tokenKey"
  | "rootFolder"
  | "connection";

export type DriveChecklistRow = {
  key: DriveChecklistKey;
  label: string;
  ok: boolean;
  /** One line telling the admin what to do when this row is ✗. */
  hint: string;
};

export function buildDriveChecklist(input: {
  clientId: boolean;
  clientSecret: boolean;
  appOrigin: string | null;
  appOriginValid: boolean;
  tokenKey: boolean;
  rootFolderId: string;
  connected: boolean;
}): DriveChecklistRow[] {
  const origin = normalizeOrigin(input.appOrigin ?? "");
  return [
    {
      key: "clientId",
      label: "Client ID saved",
      ok: input.clientId,
      hint: "Paste the OAuth Client ID from Google Cloud below and save.",
    },
    {
      key: "clientSecret",
      label: "Client secret saved",
      ok: input.clientSecret,
      hint: "Paste the Client secret below (it is stored encrypted and never shown again).",
    },
    {
      key: "appOrigin",
      label: "App address set (https)",
      ok: !!origin && input.appOriginValid,
      hint: "Enter the https:// address this app is served from — no path, no trailing slash.",
    },
    {
      key: "tokenKey",
      label: "Encryption key created",
      ok: input.tokenKey,
      hint: "Save the credentials once — the key is generated here automatically.",
    },
    {
      key: "rootFolder",
      label: "Root folder ID set",
      ok: !!input.rootFolderId.trim(),
      hint: "Connect Google Drive, or paste the folder id from the Drive URL into Root folder ID.",
    },
    {
      key: "connection",
      label: "Google account connected",
      ok: input.connected,
      hint: "Press Connect Google Drive and approve access with the department account.",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Browser-safe view (no secret can pass through this function)       */
/* ------------------------------------------------------------------ */

export type DriveFieldState = {
  source: CredentialSource;
  managedByEnv: boolean;
  savedAt: number | null;
  savedByName: string | null;
};

export type DriveCredentialsView = {
  clientId: DriveFieldState & { value: string | null };
  /** The secret is write-only: the view only ever knows whether one exists. */
  clientSecret: DriveFieldState & { saved: boolean };
  appOrigin: DriveFieldState & { value: string | null };
  encryptionKey: {
    present: boolean;
    source: CredentialSource;
    managedByEnv: boolean;
    createdAt: number | null;
    rotatedAt: number | null;
  };
  redirectUri: string;
  checklist: DriveChecklistRow[];
  canConnect: boolean;
  /** Human names of the values that are actually missing after resolution. */
  missing: string[];
  rootFolderId: string;
  selfTest: {
    at: number | null;
    ok: boolean | null;
    rows: { key: string; label: string; ok: boolean; message: string }[];
  };
  notices: { id: string; message: string; at: number }[];
};

export function buildDriveCredentialsView(input: {
  clientId: { value: string | null; source: CredentialSource; savedAt: number | null; savedByName: string | null };
  clientSecret: { saved: boolean; source: CredentialSource; savedAt: number | null; savedByName: string | null };
  appOrigin: { value: string | null; source: CredentialSource; savedAt: number | null; savedByName: string | null };
  encryptionKey: {
    present: boolean;
    source: CredentialSource;
    createdAt: number | null;
    rotatedAt: number | null;
  };
  rootFolderId: string;
  connected: boolean;
  selfTest: { at: number | null; ok: boolean | null; rows: { key: string; label: string; ok: boolean; message: string }[] };
  notices: { id: string; message: string; at: number }[];
}): DriveCredentialsView {
  const origin = normalizeOrigin(input.appOrigin.value ?? "");
  const originCheck = origin ? validateAppOrigin(origin, { allowLocalhost: true }) : { ok: false as const, error: "" };

  const checklist = buildDriveChecklist({
    clientId: !!input.clientId.value,
    clientSecret: input.clientSecret.saved,
    appOrigin: origin || null,
    appOriginValid: originCheck.ok,
    tokenKey: input.encryptionKey.present,
    rootFolderId: input.rootFolderId,
    connected: input.connected,
  });

  const missing = checklist
    .filter((row) => !row.ok && row.key !== "rootFolder" && row.key !== "connection")
    .map((row) => row.label.replace(/ saved$/, "").replace(/ set \(https\)$/, "").replace(/ created$/, ""));

  return {
    clientId: {
      value: input.clientId.value,
      source: input.clientId.source,
      managedByEnv: input.clientId.source === "env",
      savedAt: input.clientId.savedAt,
      savedByName: input.clientId.savedByName,
    },
    clientSecret: {
      saved: input.clientSecret.saved,
      source: input.clientSecret.source,
      managedByEnv: input.clientSecret.source === "env",
      savedAt: input.clientSecret.savedAt,
      savedByName: input.clientSecret.savedByName,
    },
    appOrigin: {
      value: origin || null,
      source: input.appOrigin.source,
      managedByEnv: input.appOrigin.source === "env",
      savedAt: input.appOrigin.savedAt,
      savedByName: input.appOrigin.savedByName,
    },
    encryptionKey: {
      ...input.encryptionKey,
      managedByEnv: input.encryptionKey.source === "env",
    },
    redirectUri: redirectUriFor(origin || null),
    checklist,
    canConnect: checklist.slice(0, 4).every((row) => row.ok),
    missing,
    rootFolderId: input.rootFolderId,
    selfTest: input.selfTest,
    notices: input.notices,
  };
}

/* ------------------------------------------------------------------ */
/* OAuth outcome → one plain sentence and one fix                     */
/* ------------------------------------------------------------------ */

export type DriveOauthNotice = {
  tone: "ok" | "error" | "info";
  title: string;
  detail: string;
  showChecklist: boolean;
};

/**
 * The `?drive=` flag the OAuth callback puts on the URL. Google itself sends
 * `error=…` to the callback, which the server maps onto these names.
 */
export function driveOauthNotice(flag: string | null | undefined): DriveOauthNotice | null {
  switch (flag) {
    case undefined:
    case null:
    case "":
      return null;
    case "connected":
      return {
        tone: "ok",
        title: "Google Drive connected",
        detail: "Documents now upload to the department's Drive. The self-test below shows what works.",
        showChecklist: false,
      };
    case "denied":
      return {
        tone: "error",
        title: "Consent was cancelled",
        detail: "Nobody approved access, so nothing changed. Press Connect Google Drive and approve with the department account.",
        showChecklist: true,
      };
    case "bad-state":
      return {
        tone: "error",
        title: "The sign-in link expired",
        detail: "For your security the consent link is single-use and lasts 10 minutes. Press Connect Google Drive again.",
        showChecklist: true,
      };
    case "mismatch":
      return {
        tone: "error",
        title: "Google rejected the redirect address",
        detail:
          "The redirect URI saved in Google Cloud does not match this app. Copy the exact value from the redirect box below into Google Cloud → Clients → your OAuth client → Authorized redirect URIs.",
        showChecklist: true,
      };
    case "invalid-client":
      return {
        tone: "error",
        title: "Google did not accept the Client ID or secret",
        detail:
          "Re-copy both values from Google Cloud (the secret is shown only once there) and save them again. If the OAuth client was deleted, create a new one.",
        showChecklist: true,
      };
    case "unverified":
      return {
        tone: "info",
        title: "This Google Cloud project is not verified yet",
        detail:
          "While the app is in Testing, only the Google accounts listed under Audience → Test users can approve it. Add the department account there, or publish the app.",
        showChecklist: true,
      };
    case "session":
      return {
        tone: "error",
        title: "Your session ended",
        detail:
          "Connecting Google Drive needs an active State Admin session. Sign in again, then press Connect Google Drive once more.",
        showChecklist: true,
      };
    case "not-admin":
      return {
        tone: "error",
        title: "State Admin only",
        detail: "Only the State Admin can connect Google Drive. Ask the State Admin to sign in and run the connection.",
        showChecklist: false,
      };
    case "needs-setup":
      return {
        tone: "error",
        title: "Google Drive is not configured yet",
        detail:
          "Fill in the missing item(s) in the checklist below, save them, then press Connect Google Drive again.",
        showChecklist: true,
      };
    default:
      return {
        tone: "error",
        title: "Google Drive could not be connected",
        detail:
          "Google returned an error before access was granted. Check the checklist below, then press Connect Google Drive again.",
        showChecklist: true,
      };
  }
}

/**
 * A failed connection action → the `?drive=` flag the Admin page understands.
 * The callback page uses this so every failure lands on the same readable
 * notice. Messages are matched by meaning; no token or secret can pass through.
 */
export function driveOauthFlagFromError(message: string): string {
  const m = String(message ?? "");
  if (/session|sign in again/i.test(m)) return "session";
  if (/only the state admin/i.test(m)) return "not-admin";
  if (/invalid or has expired|single-use/i.test(m)) return "bad-state";
  if (/redirect/i.test(m)) return "mismatch";
  if (/client id or secret/i.test(m)) return "invalid-client";
  if (/not (configured|connected)|needs:/i.test(m)) return "needs-setup";
  return "error";
}

/* ------------------------------------------------------------------ */
/* Redaction (logs and error handlers)                                */
/* ------------------------------------------------------------------ */

/** Field names whose values must never reach a log line. */
export const SECRET_FIELD_NAMES = [
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
  "DRIVE_CLIENT_SECRET",
] as const;

const SECRET_KEY_RE = new RegExp(
  `((?:${SECRET_FIELD_NAMES.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*[=:]\\s*)(?:"[^"]*"|'[^']*'|[^\\s,&}]+)`,
  "gi",
);

/** Mask `key=value` / `"key":"value"` pairs for anything that gets logged. */
export function redactSecrets(text: string): string {
  return String(text ?? "").replace(SECRET_KEY_RE, (_m, prefix: string) => `${prefix}[redacted]`);
}
