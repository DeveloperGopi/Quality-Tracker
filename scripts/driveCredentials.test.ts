/**
 * Drive credentials — validation, the checklist, and the hard rule that no
 * secret can reach the browser.
 *
 * The last describe block is the CI "grep" test: it reads the shipped source
 * and fails if the credentials card (or any client file in this feature) starts
 * touching ciphertext, tokens or `process.env`. It is intentionally textual —
 * a future refactor that leaks a field is exactly what it is here to catch.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildDriveChecklist,
  buildDriveCredentialsView,
  driveOauthFlagFromError,
  driveOauthNotice,
  normalizeOrigin,
  redirectUriFor,
  redactSecrets,
  validateAppOrigin,
  validateClientId,
  validateClientSecret,
  type DriveCredentialsView,
} from "../src/lib/driveCredentials";

const ALL_OK = {
  clientId: { value: "123-abc.apps.googleusercontent.com", source: "admin" as const, savedAt: 1, savedByName: "A" },
  clientSecret: { saved: true, source: "admin" as const, savedAt: 2, savedByName: "A" },
  appOrigin: { value: "https://nqas.example.gov.in", source: "admin" as const, savedAt: 3, savedByName: "A" },
  encryptionKey: { present: true, source: "admin" as const, createdAt: 4, rotatedAt: null },
  rootFolderId: "1AbCdEf",
  connected: true,
  selfTest: { at: null, ok: null, rows: [] },
  notices: [],
};

describe("client id / secret validation", () => {
  it("accepts a Google client id and rejects anything else", () => {
    expect(validateClientId("123456-abc.apps.googleusercontent.com").ok).toBe(true);
    expect(validateClientId(" 123456-abc.apps.googleusercontent.com ")).toEqual({
      ok: true,
      value: "123456-abc.apps.googleusercontent.com",
    });
    expect(validateClientId("123456-abc").ok).toBe(false);
    expect(validateClientId("has space.apps.googleusercontent.com").ok).toBe(false);
    expect(validateClientId("").ok).toBe(false);
  });

  it("rejects an empty or whitespace secret but keeps the exact value", () => {
    expect(validateClientSecret("GOCSPX-something-long").ok).toBe(true);
    expect(validateClientSecret("short").ok).toBe(false);
    expect(validateClientSecret("two words").ok).toBe(false);
    expect(validateClientSecret("").ok).toBe(false);
  });
});

describe("app address (APP_ORIGIN)", () => {
  it("keeps https origins, strips the trailing slash and the default port", () => {
    expect(validateAppOrigin("https://nqas.example.gov.in/")).toEqual({
      ok: true,
      value: "https://nqas.example.gov.in",
    });
    expect(normalizeOrigin("https://nqas.example.gov.in///")).toBe("https://nqas.example.gov.in");
  });

  it("rejects plain http unless it is localhost", () => {
    expect(validateAppOrigin("http://nqas.example.gov.in").ok).toBe(false);
    expect(validateAppOrigin("http://localhost:5173").ok).toBe(true);
    expect(validateAppOrigin("http://127.0.0.1:5173").ok).toBe(true);
  });

  it("rejects a path, a query, a fragment and embedded credentials", () => {
    expect(validateAppOrigin("https://nqas.example.gov.in/admin").ok).toBe(false);
    expect(validateAppOrigin("https://nqas.example.gov.in?x=1").ok).toBe(false);
    expect(validateAppOrigin("https://nqas.example.gov.in#top").ok).toBe(false);
    expect(validateAppOrigin("https://user:pass@nqas.example.gov.in").ok).toBe(false);
    expect(validateAppOrigin("not a url").ok).toBe(false);
  });

  it("rejects an address that differs from the trusted host", () => {
    const result = validateAppOrigin("https://evil.example.com", {
      trustedOrigin: "https://nqas.example.gov.in",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("nqas.example.gov.in");
  });

  it("builds the exact redirect URI and updates with the origin", () => {
    expect(redirectUriFor("https://nqas.example.gov.in")).toBe(
      "https://nqas.example.gov.in/drive/oauth/callback",
    );
    expect(redirectUriFor("http://localhost:5173/")).toBe("http://localhost:5173/drive/oauth/callback");
    expect(redirectUriFor(null)).toBe("/drive/oauth/callback");
  });
});

describe("oauth error → flag mapping", () => {
  it("maps every readable failure to a notice flag", () => {
    expect(driveOauthFlagFromError("Sign in again — this change needs a State Admin session.")).toBe("session");
    expect(driveOauthFlagFromError("Only the State Admin can connect Google Drive")).toBe("not-admin");
    expect(driveOauthFlagFromError("This consent link is invalid or has expired. Press Connect Google Drive again.")).toBe(
      "bad-state",
    );
    expect(driveOauthFlagFromError("The redirect URI saved in Google Cloud does not match this app.")).toBe(
      "mismatch",
    );
    expect(driveOauthFlagFromError("Google did not accept the Client ID or secret")).toBe("invalid-client");
    expect(driveOauthFlagFromError("Google Drive needs: Client secret. Enter them in Settings → Google Drive.")).toBe(
      "needs-setup",
    );
    expect(driveOauthFlagFromError("something unexpected")).toBe("error");
  });

  it("gives every flag the callback can produce a readable notice", () => {
    const flags = ["connected", "denied", "bad-state", "mismatch", "invalid-client", "unverified", "session", "not-admin", "needs-setup", "anything-else"];
    for (const flag of flags) {
      const notice = driveOauthNotice(flag);
      expect(notice).not.toBeNull();
      expect(notice!.title.length).toBeGreaterThan(3);
      expect(notice!.detail.length).toBeGreaterThan(10);
    }
    expect(driveOauthNotice("session")?.title).toBe("Your session ended");
    expect(driveOauthNotice("not-admin")?.title).toBe("State Admin only");
    expect(driveOauthNotice("needs-setup")?.showChecklist).toBe(true);
  });
});

describe("checklist", () => {
  it("is all green when everything is present", () => {
    const rows = buildDriveChecklist({
      clientId: true,
      clientSecret: true,
      appOrigin: "https://nqas.example.gov.in",
      appOriginValid: true,
      tokenKey: true,
      rootFolderId: "1AbC",
      connected: true,
    });
    expect(rows).toHaveLength(6);
    expect(rows.every((r) => r.ok)).toBe(true);
  });

  it("marks the exact missing item and always explains the fix", () => {
    const rows = buildDriveChecklist({
      clientId: true,
      clientSecret: false,
      appOrigin: null,
      appOriginValid: false,
      tokenKey: false,
      rootFolderId: "",
      connected: false,
    });
    const failing = rows.filter((r) => !r.ok);
    expect(failing.map((r) => r.key)).toEqual(["clientSecret", "appOrigin", "tokenKey", "rootFolder", "connection"]);
    for (const row of failing) expect(row.hint.length).toBeGreaterThan(10);
  });
});

describe("browser-safe view", () => {
  it("derives canConnect from the first four rows only", () => {
    const view = buildDriveCredentialsView(ALL_OK);
    expect(view.canConnect).toBe(true);
    const noKey = buildDriveCredentialsView({
      ...ALL_OK,
      encryptionKey: { present: false, source: "missing", createdAt: null, rotatedAt: null },
      connected: false,
      rootFolderId: "",
    });
    expect(noKey.canConnect).toBe(false);
    expect(noKey.missing).toContain("Encryption key");
  });

  it("names what the yellow banner may say is missing — and nothing when all is set", () => {
    expect(buildDriveCredentialsView(ALL_OK).missing).toEqual([]);
    const noSecret = buildDriveCredentialsView({
      ...ALL_OK,
      clientSecret: { saved: false, source: "missing", savedAt: null, savedByName: null },
    });
    expect(noSecret.missing).toEqual(["Client secret"]);
  });

  it("never carries a secret value, even if one is handed in by mistake", () => {
    const canary = "GOCSPX-super-secret-canary-value";
    const withExtra = {
      ...ALL_OK,
      clientSecret: { ...ALL_OK.clientSecret, value: canary, cipher: "iv.ciphertext" },
    } as unknown as Parameters<typeof buildDriveCredentialsView>[0];
    const view: DriveCredentialsView = buildDriveCredentialsView(withExtra);
    const json = JSON.stringify(view);
    expect(json).not.toContain(canary);
    expect(json).not.toContain("cipher");
    expect("value" in view.clientSecret).toBe(false);
    expect(typeof view.clientSecret.saved).toBe("boolean");
  });

  it("marks environment-managed fields so the UI can lock them", () => {
    const view = buildDriveCredentialsView({
      ...ALL_OK,
      clientId: { ...ALL_OK.clientId, source: "env", savedAt: null, savedByName: null },
    });
    expect(view.clientId.managedByEnv).toBe(true);
    expect(view.clientSecret.managedByEnv).toBe(false);
  });
});

describe("oauth outcome text", () => {
  it("maps every callback flag to a sentence and a next step", () => {
    expect(driveOauthNotice(null)).toBeNull();
    for (const flag of ["connected", "denied", "bad-state", "mismatch", "invalid-client", "unverified", "error"]) {
      const notice = driveOauthNotice(flag);
      expect(notice).not.toBeNull();
      expect(notice!.detail.length).toBeGreaterThan(20);
      expect(notice!.title.length).toBeGreaterThan(5);
    }
    expect(driveOauthNotice("connected")!.tone).toBe("ok");
    expect(driveOauthNotice("mismatch")!.showChecklist).toBe(true);
  });
});

describe("redaction", () => {
  it("masks secret-shaped key/value pairs in a log line", () => {
    const line = 'token response client_secret=GOCSPX-abc refresh_token="1//xyz" clientId=public';
    const masked = redactSecrets(line);
    expect(masked).not.toContain("GOCSPX-abc");
    expect(masked).not.toContain("1//xyz");
    expect(masked).toContain("[redacted]");
    expect(masked).toContain("clientId=public");
  });
});

/* ------------------------------------------------------------------ */
/* CI guard: the client half may not touch secrets                    */
/* ------------------------------------------------------------------ */

const read = (path: string) => readFileSync(join(import.meta.dir, "..", path), "utf8");

describe("no secret can reach the browser bundle", () => {
  it("the credentials card only knows booleans", () => {
    const card = read("src/components/admin/DriveCredentialsCard.tsx");
    expect(card).not.toContain("clientSecretCipher");
    expect(card).not.toContain("refreshTokenCipher");
    expect(card).not.toContain("encryptionKey.value");
    expect(card).not.toContain("tokenKey");
    expect(card).not.toMatch(/process\.env/);
  });

  it("the Drive panel never reads an environment variable", () => {
    const panel = read("src/components/admin/GoogleDrivePanel.tsx");
    expect(panel).not.toMatch(/process\.env/);
    expect(panel).not.toContain("DRIVE_CLIENT_SECRET");
    expect(panel).not.toContain("refreshTokenCipher");
  });

  it("the public credentials query is built from the secret-free view", () => {
    const server = read("src/convex/driveCredentials.ts");
    expect(server).toContain("buildDriveCredentialsView(");
    // The browser-facing query must not return either ciphertext column.
    const queryBody = server.slice(
      server.indexOf("export const getDriveCredentialsState"),
      server.indexOf("/* ------", server.indexOf("export const getDriveCredentialsState")),
    );
    // The connection check may LOOK at the ciphertext (to answer "connected?"),
    // but the query must never put a ciphertext or a key into its result.
    expect(queryBody).not.toMatch(/clientSecretCipher\s*:/);
    expect(queryBody).not.toMatch(/refreshTokenCipher\s*:/);
    expect(queryBody).not.toContain("tokenKey: config");
  });

  it("the shared lib never reads the environment", () => {
    const lib = read("src/lib/driveCredentials.ts");
    expect(lib).not.toMatch(/process\.env/);
    // The only secret-shaped names it knows are the redaction list.
    expect(lib).toContain("export const SECRET_FIELD_NAMES");
  });
});
