/**
 * ONE upload gate — the regression that made the Documents card say
 * "Storage OK" beside "Uploads are paused by the administrator".
 *
 * The stored setting must be a strict boolean, an expired auto-resume is not a
 * pause, and every surface reads the same result. These are pure tests: no
 * Convex, no Drive and no browser.
 */

import { describe, expect, test } from "bun:test";

import {
  DEFAULT_DRIVE_SETTINGS,
  getUploadState,
  resolveDriveSettings,
  uploadBlockedSentence,
  uploadPausedDetail,
  uploadsPaused,
  type DriveSettings,
} from "../src/lib/driveSettings";

const at = (overrides: Partial<DriveSettings> = {}): DriveSettings => ({
  ...DEFAULT_DRIVE_SETTINGS,
  ...overrides,
});

describe("the stored pause flag is a strict boolean", () => {
  test('the string "false" never reads as paused', () => {
    const settings = resolveDriveSettings({ paused: "false", autoPaused: "false" });
    expect(settings.paused).toBe(false);
    expect(settings.autoPaused).toBe(false);
    expect(uploadsPaused(settings)).toBe(false);

    const state = getUploadState({ settings, connected: true });
    expect(state.allowed).toBe(true);
    expect(state.reason).toBeNull();
    expect(state.chip).toBe("Storage OK");
    expect(state.message).toBe("");
  });

  test("only the boolean true pauses", () => {
    expect(resolveDriveSettings({ paused: true }).paused).toBe(true);
    expect(resolveDriveSettings({ paused: 1 }).paused).toBe(false);
    expect(resolveDriveSettings({ paused: "true" }).paused).toBe(false);
    expect(resolveDriveSettings({}).paused).toBe(false);
  });
});

describe("one getUploadState for the chip, the card and the server gate", () => {
  test("a manual pause says who, since when and why — never Storage OK", () => {
    const state = getUploadState({
      settings: at({
        paused: true,
        pausedAt: Date.UTC(2026, 9, 24),
        pausedBy: "State Admin",
        pauseReason: "reconnecting the department Drive",
      }),
      connected: true,
    });

    expect(state.allowed).toBe(false);
    expect(state.reason).toBe("paused");
    expect(state.chip).toBe("Uploads paused");
    expect(state.message).toBe("Uploads are paused by the administrator");
    expect(uploadPausedDetail(state)).toContain("since 24-Oct-2026");
    expect(uploadPausedDetail(state)).toContain("by State Admin");
    expect(uploadPausedDetail(state)).toContain("reconnecting the department Drive");
    expect(uploadBlockedSentence(state)).toBe(
      "Uploads are paused until further notice: contact the administrator.",
    );
  });

  test("an expired auto-resume is not a pause", () => {
    const now = Date.UTC(2026, 9, 26);
    const settings = at({ paused: true, resumeAt: now - 1, pausedBy: "State Admin" });
    expect(uploadsPaused(settings, now)).toBe(false);

    const state = getUploadState({ settings, connected: true, now });
    expect(state.allowed).toBe(true);
    expect(state.chip).toBe("Storage OK");
  });

  test("a future auto-resume still pauses, and the admin sentence names the date", () => {
    const now = Date.UTC(2026, 9, 26);
    const state = getUploadState({
      settings: at({ paused: true, resumeAt: now + 86_400_000 }),
      connected: true,
      now,
    });
    expect(state.allowed).toBe(false);
    expect(uploadBlockedSentence(state)).toContain("27-Oct-2026");
  });

  test("an automatic pause names its cause", () => {
    const state = getUploadState({
      settings: at({ paused: true, autoPaused: true, autoPauseCause: "Drive refused the token" }),
      connected: true,
    });
    expect(state.allowed).toBe(false);
    expect(state.auto).toBe(true);
    expect(state.message).toBe("Uploads are paused automatically (Drive refused the token)");
  });

  test("connection problems win over a pause: resuming would not help", () => {
    const paused = at({ paused: true, pausedBy: "State Admin" });
    expect(getUploadState({ settings: paused, connected: false }).reason).toBe("not_connected");
    expect(getUploadState({ settings: paused, connected: true, revoked: true }).reason).toBe(
      "auth_revoked",
    );
    expect(getUploadState({ settings: paused, connected: true, storageFull: true }).reason).toBe(
      "storage_full",
    );
    expect(
      getUploadState({ settings: paused, connected: true, configMissing: ["rootFolderId"] }).reason,
    ).toBe("not_configured");
  });

  test("the chip and the message come from the same decision", () => {
    const state = getUploadState({ settings: at({ paused: true }), connected: true });
    // The card renders `state.chip`; the uploader renders `state.message`.
    expect(state.chip).toBe("Uploads paused");
    expect(state.message).toBe("Uploads are paused by the administrator");
    expect(state.allowed).toBe(false);
  });
});
