/**
 * DRIVE CONFIG — the ONE place the Drive credentials are resolved.
 *
 * Resolution order for every value, evaluated on each read:
 *
 *   1. the value a State Admin saved on the Admin page — the page is the
 *      source of truth, so saving there overrides the environment;
 *   2. the environment variable, when it is set and non-empty (a bootstrap
 *      for a fresh deployment, and the fallback while nothing is saved);
 *   3. missing.
 *
 * The encryption key is the one exception: `DRIVE_TOKEN_KEY` in the
 * environment wins, so an ops-managed key is never shadowed by a save.
 *
 * Nothing is read at module load: `getDriveConfig()` runs inside the request
 * that needs it. A 30-second in-isolate cache keeps the page fast without ever
 * making an admin wait for a redeploy — `clearDriveConfigCache()` is called by
 * every write, and the TTL is the hard upper bound.
 *
 * The encryption key is deliberately kept in its OWN table (`appSecrets`) and
 * is never part of the browser-facing view: `driveConfigView()` in
 * `lib/driveCredentials` receives booleans only.
 */

import type { DatabaseReader, DatabaseWriter } from "../_generated/server";
import {
  CLIENT_SECRET_PURPOSE,
  DRIVE_CREDENTIALS_KEY,
  DRIVE_SECRET_KEY,
  normalizeOrigin,
  validateAppOrigin,
} from "../../lib/driveCredentials";
import { decryptValue, randomKeyMaterial } from "./crypto";
import { driveEnv, type DriveEnv } from "./driveAuth";

export type CredentialSource = "env" | "admin" | "missing";

export type ResolvedField = {
  value: string | null;
  source: CredentialSource;
  /** When (and by whom) the admin-saved value was written — display only. */
  savedAt: number | null;
  savedByName: string | null;
};

export type ResolvedDriveConfig = {
  clientId: ResolvedField;
  clientSecret: ResolvedField;
  appOrigin: ResolvedField;
  /** The AES key material itself. Server-only: never returned to a component. */
  tokenKey: ResolvedField & { createdAt: number | null; rotatedAt: number | null };
  complete: boolean;
  /** Human names of the values that are missing after resolution. */
  missing: string[];
};

const TTL_MS = 30_000;
let cache: { at: number; value: ResolvedDriveConfig } | null = null;

/** Called by every credential write so the next read sees the change at once. */
export function clearDriveConfigCache(): void {
  cache = null;
}

/**
 * Save/connect/rotate read with `fresh: true`: the cache is per-isolate, so a
 * mutation that clears it here cannot clear the isolate a later query runs in.
 * Fresh on the write path is what makes "no restart required" unconditional.
 */
export type ConfigReadOptions = { fresh?: boolean };

const pickEnv = (value: string | undefined): string | null => (value && value.trim() ? value.trim() : null);

function resolveField(adminValue: string | null, envValue: string | null, savedAt: number | null, savedByName: string | null): ResolvedField {
  if (adminValue) return { value: adminValue, source: "admin", savedAt, savedByName };
  if (envValue) return { value: envValue, source: "env", savedAt: null, savedByName: null };
  return { value: null, source: "missing", savedAt, savedByName };
}

/**
 * Resolve all four values. Read-only: generating the key happens in
 * `ensureDriveSecretKey` (a mutation), never here.
 */
export async function getDriveConfig(db: DatabaseReader, opts: ConfigReadOptions = {}): Promise<ResolvedDriveConfig> {
  const now = Date.now();
  if (!opts.fresh && cache && now - cache.at < TTL_MS) return cache.value;

  const env = driveEnv();
  const [credentials, secretRow] = await Promise.all([
    db
      .query("driveCredentials")
      .withIndex("by_key", (q) => q.eq("key", DRIVE_CREDENTIALS_KEY))
      .first(),
    db
      .query("appSecrets")
      .withIndex("by_key", (q) => q.eq("key", DRIVE_SECRET_KEY))
      .first(),
  ]);

  const envKey = pickEnv(env.tokenKey);
  const storedKey = pickEnv(secretRow?.value);
  const keyValue = envKey ?? storedKey;
  const tokenKey: ResolvedDriveConfig["tokenKey"] = {
    value: keyValue,
    source: envKey ? "env" : storedKey ? "admin" : "missing",
    savedAt: null,
    savedByName: null,
    createdAt: secretRow?.createdAt ?? null,
    rotatedAt: secretRow?.rotatedAt ?? null,
  };

  // The stored secret is only readable with the resolved key; a rotation or a
  // newly-added env key that cannot open it simply means "not saved yet" —
  // the env value (if any) still wins below.
  let savedSecret: string | null = null;
  if (credentials?.clientSecretCipher && keyValue) {
    try {
      savedSecret = await decryptValue(credentials.clientSecretCipher, keyValue, CLIENT_SECRET_PURPOSE);
    } catch {
      savedSecret = null;
    }
  }

  const clientId = resolveField(
    credentials?.clientId?.trim() ? credentials.clientId.trim() : null,
    pickEnv(env.clientId),
    credentials?.clientIdUpdatedAt ?? null,
    credentials?.clientIdUpdatedByName ?? null,
  );
  const clientSecret = resolveField(
    savedSecret && savedSecret.trim() ? savedSecret.trim() : null,
    pickEnv(env.clientSecret),
    credentials?.secretUpdatedAt ?? null,
    credentials?.secretUpdatedByName ?? null,
  );
  const storedOrigin = credentials?.appOrigin ? normalizeOrigin(credentials.appOrigin) : null;
  const appOrigin = resolveField(
    storedOrigin && storedOrigin.length > 0 ? storedOrigin : null,
    env.appOrigin ? normalizeOrigin(env.appOrigin) : null,
    credentials?.originUpdatedAt ?? null,
    credentials?.originUpdatedByName ?? null,
  );

  const missing: string[] = [];
  if (!clientId.value) missing.push("Client ID");
  if (!clientSecret.value) missing.push("Client secret");
  if (!appOrigin.value) missing.push("App address");
  if (!tokenKey.value) missing.push("Encryption key");

  const value: ResolvedDriveConfig = {
    clientId,
    clientSecret,
    appOrigin,
    tokenKey,
    complete: missing.length === 0,
    missing,
  };
  cache = { at: now, value };
  return value;
}

/**
 * The `DriveEnv` shape `DriveAuth` expects, built from the resolved config so
 * the OAuth exchange, the redirect URI and the token decryption all read the
 * same values as the settings page.
 */
export function driveEnvFromConfig(config: ResolvedDriveConfig): DriveEnv {
  return {
    clientId: config.clientId.value ?? undefined,
    clientSecret: config.clientSecret.value ?? undefined,
    tokenKey: config.tokenKey.value ?? undefined,
    appOrigin: config.appOrigin.value ?? undefined,
  };
}

/** A valid https origin, or null (used when the admin saved a bad value). */
export function safeOrigin(config: ResolvedDriveConfig): string | null {
  const raw = config.appOrigin.value;
  if (!raw) return null;
  const check = validateAppOrigin(raw, { allowLocalhost: true });
  return check.ok ? check.value : null;
}

/**
 * Generate the encryption key on the first save. Idempotent, and a no-op when
 * `DRIVE_TOKEN_KEY` is set in the environment (the env key wins, by design).
 */
export async function ensureDriveSecretKey(
  db: DatabaseWriter,
  userId?: string,
): Promise<{ created: boolean; managedByEnv: boolean }> {
  const env = driveEnv();
  if (pickEnv(env.tokenKey)) return { created: false, managedByEnv: true };

  const existing = await db
    .query("appSecrets")
    .withIndex("by_key", (q) => q.eq("key", DRIVE_SECRET_KEY))
    .first();
  if (existing?.value) return { created: false, managedByEnv: false };

  await db.insert("appSecrets", {
    key: DRIVE_SECRET_KEY,
    value: randomKeyMaterial(),
    createdAt: Date.now(),
    createdBy: userId as never,
  });
  clearDriveConfigCache();
  return { created: true, managedByEnv: false };
}
