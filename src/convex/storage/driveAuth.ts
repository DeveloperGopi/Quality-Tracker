/**
 * DRIVE AUTH — server-side only. No Google credential ever reaches the browser.
 *
 * Two supported account models (see the admin setup steps):
 *
 *   • OAuth (`mode: "oauth"`) — for a PERSONAL Google account or any account
 *     the department owns directly. The admin consents once with the narrow
 *     `drive.file` scope; the refresh token is stored encrypted (AES-256-GCM)
 *     and exchanged for short-lived access tokens here. Files are owned by
 *     that account.
 *
 *   • Service account (`mode: "service_account"`) — for GOOGLE WORKSPACE with a
 *     Shared Drive: the service account is added to the Shared Drive as a
 *     Content manager and every call passes `supportsAllDrives=true`. A service
 *     account has no storage quota of its own, so this mode requires a Shared
 *     Drive; the root folder id is the Shared Drive's `driveId`.
 *
 * Access tokens are cached in memory until ~60 s before expiry, so a sheet of
 * 20 uploads performs ONE token exchange. A revoked refresh token raises
 * `auth_revoked` — the UI then shows the admin banner and uploads are blocked
 * without touching anything already stored.
 */

import { decryptSecret, decryptValue, toBase64Url } from "./crypto";
import { REDIRECT_PATH, REFRESH_TOKEN_PURPOSE } from "../../lib/driveCredentials";
import { FileStoreError } from "./fileStore";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE_FULL = "https://www.googleapis.com/auth/drive";
const SCOPE_LIMITED = "https://www.googleapis.com/auth/drive.file";

export type DriveMode = "oauth" | "service_account";

export type DriveConnectionRecord = {
  mode: string;
  accountEmail?: string | null;
  refreshTokenCipher?: string | null;
  rootFolderId?: string | null;
  revokedAt?: number | null;
};

export type DriveEnv = {
  clientId?: string;
  clientSecret?: string;
  tokenKey?: string;
  serviceAccountEmail?: string;
  serviceAccountKey?: string;
  sharedDriveId?: string;
  appOrigin?: string;
};

/** The server environment, read in ONE place (never logged). */
export function driveEnv(env: Record<string, string | undefined> = readEnv()): DriveEnv {
  return {
    clientId: env.DRIVE_CLIENT_ID?.trim() || undefined,
    clientSecret: env.DRIVE_CLIENT_SECRET?.trim() || undefined,
    tokenKey: env.DRIVE_TOKEN_KEY?.trim() || undefined,
    serviceAccountEmail: env.DRIVE_SA_EMAIL?.trim() || undefined,
    // Secrets pasted into a dashboard often keep their newlines escaped.
    serviceAccountKey: env.DRIVE_SA_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() || undefined,
    sharedDriveId: env.DRIVE_SHARED_DRIVE_ID?.trim() || undefined,
    appOrigin: env.APP_ORIGIN?.trim() || undefined,
  };
}

function readEnv(): Record<string, string | undefined> {
  // `process.env` exists in Convex actions and in the node runtime; the guard
  // keeps this module importable from a plain test process.
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env ?? {};
}

export type TokenResponse = { accessToken: string; expiresAt: number };

type FetchJson = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{
  status: number;
  text: string;
}>;

const defaultFetchJson: FetchJson = async (url, init) => {
  const res = await fetch(url, init);
  return { status: res.status, text: await res.text() };
};

export type DriveAuthOptions = {
  /** Reads the stored connection (mode + encrypted refresh token). */
  loadConnection: () => Promise<DriveConnectionRecord | null>;
  env?: DriveEnv;
  /**
   * The exact redirect URI of the running consent flow. When set it wins over
   * `{APP_ORIGIN}/…`: Google requires the exchange to send back byte-for-byte
   * what the consent URL sent out.
   */
  redirectUri?: string;
  fetchJson?: FetchJson;
  now?: () => number;
};

export class DriveAuth {
  private readonly opts: DriveAuthOptions;
  private cached: TokenResponse | null = null;
  /** Set by the first successful exchange; the admin page shows it. */
  accountEmail: string | null = null;

  constructor(opts: DriveAuthOptions) {
    this.opts = opts;
  }

  private get env(): DriveEnv {
    return this.opts.env ?? driveEnv();
  }

  invalidate(): void {
    this.cached = null;
  }

  /** Scopes the consent flow must request (drive.file for personal accounts). */
  scope(mode: DriveMode): string {
    return mode === "service_account" ? SCOPE_FULL : SCOPE_LIMITED;
  }

  redirectUri(): string {
    if (this.opts.redirectUri) return this.opts.redirectUri;
    const origin = this.env.appOrigin ?? "";
    return `${origin.replace(/\/+$/, "")}${REDIRECT_PATH}`;
  }

  /**
   * The consent URL the Admin button opens. `state` is a random single-use
   * value stored server-side; `codeChallenge` is the S256 PKCE challenge, so an
   * intercepted authorization code cannot be exchanged without the verifier
   * that never leaves this deployment.
   */
  consentUrl(state: string, codeChallenge?: string): string {
    const params = new URLSearchParams({
      client_id: this.env.clientId ?? "",
      redirect_uri: this.redirectUri(),
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: SCOPE_LIMITED,
      state,
    });
    if (codeChallenge) {
      params.set("code_challenge", codeChallenge);
      params.set("code_challenge_method", "S256");
    }
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange the one-time consent code. Returns the refresh token + the
   * connected account's address for the Settings page. The caller encrypts and
   * stores the token; it is never returned to the browser.
   */
  async exchangeCode(
    code: string,
    codeVerifier?: string,
  ): Promise<{ refreshToken: string; accessToken: string; email: string | null }> {
    if (!this.env.clientId || !this.env.clientSecret)
      throw new FileStoreError("not_configured", "Google Drive credentials are not configured");
    const body = new URLSearchParams({
      code,
      client_id: this.env.clientId,
      client_secret: this.env.clientSecret,
      redirect_uri: this.redirectUri(),
      grant_type: "authorization_code",
    });
    if (codeVerifier) body.set("code_verifier", codeVerifier);
    const res = await (this.opts.fetchJson ?? defaultFetchJson)(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const json = safeJson(res.text);
    if (res.status >= 400 || !json?.refresh_token)
      throw new FileStoreError("auth_revoked", "Google did not return a refresh token — try connecting again");
    const accessToken = String(json.access_token ?? "");
    const email = await this.lookupEmail(accessToken);
    this.accountEmail = email;
    return { refreshToken: String(json.refresh_token), accessToken, email };
  }

  /** A valid access token for the current connection (cached ~55 minutes). */
  async accessToken(): Promise<string> {
    const now = this.opts.now?.() ?? Date.now();
    if (this.cached && this.cached.expiresAt - 60_000 > now) return this.cached.accessToken;

    const connection = await this.opts.loadConnection();
    if (!connection) throw new FileStoreError("not_configured", "Google Drive is not connected");
    if (connection.revokedAt)
      throw new FileStoreError("auth_revoked", "The Google Drive connection was disconnected");

    const mode: DriveMode = connection.mode === "service_account" ? "service_account" : "oauth";
    const token =
      mode === "service_account" ? await this.serviceAccountToken(now) : await this.refreshTokenFor(connection);

    this.cached = token;
    return token.accessToken;
  }

  private async refreshTokenFor(connection: DriveConnectionRecord): Promise<TokenResponse> {
    if (!connection.refreshTokenCipher)
      throw new FileStoreError("not_configured", "The Google Drive refresh token is missing — reconnect Drive");
    if (!this.env.clientId || !this.env.clientSecret)
      throw new FileStoreError("not_configured", "Google Drive is not configured on the server");

    let refreshToken: string;
    try {
      // New tokens use the purpose-scoped AAD; tokens written before the
      // Admin-page credentials existed used the legacy bundle — both stay
      // readable, so nobody has to reconnect after this change.
      try {
        refreshToken = await decryptValue(connection.refreshTokenCipher, this.env.tokenKey, REFRESH_TOKEN_PURPOSE);
      } catch {
        refreshToken = await decryptSecret(connection.refreshTokenCipher, this.env.tokenKey);
      }
    } catch {
      // Wrong/rotated key, or the value was tampered with: treat as revoked.
      throw new FileStoreError("auth_revoked", "The stored Google credential could not be read — reconnect Drive");
    }

    const body = new URLSearchParams({
      client_id: this.env.clientId,
      client_secret: this.env.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    const res = await (this.opts.fetchJson ?? defaultFetchJson)(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const json = safeJson(res.text);
    if (res.status >= 400 || !json?.access_token) {
      const detail = String(json?.error ?? "");
      throw new FileStoreError(
        "auth_revoked",
        detail === "invalid_grant"
          ? "Google access was revoked — ask the State Admin to reconnect Google Drive"
          : "Google Drive could not be reached with the stored credential",
      );
    }
    const expiresIn = Number(json.expires_in ?? 3600);
    return {
      accessToken: String(json.access_token),
      expiresAt: (this.opts.now?.() ?? Date.now()) + expiresIn * 1000,
    };
  }

  /** Service-account JWT bearer flow (Workspace + Shared Drive). */
  private async serviceAccountToken(now: number): Promise<TokenResponse> {
    const email = this.env.serviceAccountEmail;
    const key = this.env.serviceAccountKey;
    if (!email || !key)
      throw new FileStoreError(
        "not_configured",
        "Service-account credentials are missing — set DRIVE_SA_EMAIL and DRIVE_SA_PRIVATE_KEY",
      );
    const iat = Math.floor(now / 1000);
    const claims = {
      iss: email,
      scope: SCOPE_FULL,
      aud: TOKEN_URL,
      iat,
      exp: iat + 3600,
    };
    const assertion = await signRs256Jwt(claims, key);
    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    });
    const res = await (this.opts.fetchJson ?? defaultFetchJson)(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const json = safeJson(res.text);
    if (res.status >= 400 || !json?.access_token)
      throw new FileStoreError("auth_revoked", "The Google service account could not be authenticated");
    return {
      accessToken: String(json.access_token),
      expiresAt: now + Number(json.expires_in ?? 3600) * 1000,
    };
  }

  private async lookupEmail(accessToken: string): Promise<string | null> {
    try {
      const res = await fetch("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { user?: { emailAddress?: string } };
      return body.user?.emailAddress ?? null;
    } catch {
      return null;
    }
  }
}

function safeJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* RS256 JWT signing (Web Crypto — works in every Convex runtime)      */
/* ------------------------------------------------------------------ */

function pemToBytes(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export async function signRs256Jwt(
  claims: Record<string, unknown>,
  privateKeyPem: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(privateKeyPem) as unknown as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const header = toBase64Url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(claims)));
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput) as unknown as ArrayBuffer,
  );
  return `${signingInput}.${toBase64Url(new Uint8Array(signature))}`;
}
