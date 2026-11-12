/**
 * MY PROFILE — the central config contract (src/lib/profileConfig).
 *
 * Pins the pieces every tab and the server share:
 *   • phone normalisation/validation (E.164 with the +91 default) and the
 *     detector for the old SAMPLE number that used to sit in the placeholder,
 *   • name/designation length rules,
 *   • profile completeness (a blank is never counted as filled),
 *   • the activity mapping that turns a raw audit row into plain words with a
 *     readable fallback, and its filter categories,
 *   • session helpers: device parsing, grouping, idle detection, relative time
 *     and the day labels.
 *
 * Run: bun test ./scripts/profileConfig.test.ts
 */
import { describe, expect, test } from "bun:test";

import {
  ACTIVITY_FILTERS,
  DEFAULT_PROFILE_TAB,
  DIGEST_OPTIONS,
  NOTIFICATION_ROWS,
  PROFILE_TABS,
  SAMPLE_PHONE,
  dayLabel,
  describeActivity,
  formatPhone,
  groupSessions,
  isInactiveSession,
  isProfileTab,
  isSamplePhone,
  normalizePhone,
  parseDevice,
  profileCompleteness,
  relativeTime,
  validateProfileField,
} from "../src/lib/profileConfig";

describe("phone — E.164 with the +91 default", () => {
  test("10 digits get the country code", () => {
    expect(normalizePhone("98765 43210")).toEqual({ value: "+919876543210", error: null });
    expect(normalizePhone("9876543210").value).toBe("+919876543210");
  });

  test("an explicit country code is kept and cleaned", () => {
    expect(normalizePhone("+91-98765-43210").value).toBe("+919876543210");
    expect(normalizePhone("91 98765 43210").value).toBe("+919876543210");
    expect(normalizePhone("+1 202 555 0134").value).toBe("+12025550134");
  });

  test("empty is allowed (the field has a Not set state)", () => {
    expect(normalizePhone("")).toEqual({ value: "", error: null });
    expect(normalizePhone("   ")).toEqual({ value: "", error: null });
  });

  test("too short or malformed input is an error, never silently stored", () => {
    expect(normalizePhone("1234").error).toContain("country code");
    expect(normalizePhone("abc").error).toBeTruthy();
    expect(normalizePhone("+9198765").error).toBeTruthy();
  });

  test("the display form is readable again", () => {
    expect(formatPhone("+919812345678")).toBe("+91 98123 45678");
    expect(formatPhone("")).toBe("");
    expect(formatPhone("+12025550134")).toBe("+12025550134");
  });

  test("the old sample number is recognised, real numbers are not", () => {
    expect(isSamplePhone(SAMPLE_PHONE)).toBe(true);
    expect(isSamplePhone("+919876543210")).toBe(true);
    expect(isSamplePhone("+911234567890")).toBe(false);
    expect(isSamplePhone("")).toBe(false);
    expect(isSamplePhone(null)).toBe(false);
  });
});

describe("field rules", () => {
  test("display name: 2–60 characters", () => {
    expect(validateProfileField("name", "")).toContain("2–60");
    expect(validateProfileField("name", "A")).toContain("2–60");
    expect(validateProfileField("name", "Gopinath P")).toBeNull();
    expect(validateProfileField("name", "x".repeat(61))).toContain("60");
  });

  test("designation: 0–80 characters (blank is fine)", () => {
    expect(validateProfileField("designation", "")).toBeNull();
    expect(validateProfileField("designation", "District Quality Officer")).toBeNull();
    expect(validateProfileField("designation", "x".repeat(81))).toContain("80");
  });
});

describe("profile completeness", () => {
  const base = {
    name: "Gopinath P",
    designation: "District Quality Officer",
    phone: "+919812345678",
    hasPhoto: true,
    emailVerified: true,
  };

  test("a complete profile is 100% with nothing missing", () => {
    const r = profileCompleteness(base);
    expect(r.percent).toBe(100);
    expect(r.missing).toEqual([]);
  });

  test("blank fields are missing, never counted as done", () => {
    const r = profileCompleteness({
      ...base,
      designation: "   ",
      hasPhoto: false,
      emailVerified: false,
    });
    expect(r.percent).toBe(40);
    expect(r.missing).toEqual(["Designation", "Photo", "Email confirmed"]);
  });

  test("the sample phone does not count as a phone number", () => {
    const r = profileCompleteness({ ...base, phone: SAMPLE_PHONE });
    expect(r.missing).toContain("Phone");
    expect(r.percent).toBe(80);
  });
});

describe("activity mapping — raw audit row to plain words", () => {
  test("a facility field edit keeps the entity, lower-cased tail word", () => {
    const r = describeActivity({ action: "update", field: "SA Actual Start Date", table: "stateAssessments" });
    expect(r.text).toBe("Updated SA actual start date");
    expect(r.category).toBe("facility");
  });

  test("profile changes read as account actions", () => {
    expect(
      describeActivity({ action: "update", field: "My profile · Notifications", table: "users" }).text,
    ).toBe("Changed notification preferences");
    expect(
      describeActivity({ action: "update", field: "My profile · other sessions signed out", table: "users" }).text,
    ).toBe("Signed out other devices");
  });

  test("document uploads/removals name the document", () => {
    expect(describeActivity({ action: "create", field: "NQAS_Result", table: "facilityDocuments" })).toEqual({
      text: "Uploaded NQAS Result",
      category: "documents",
    });
    expect(describeActivity({ action: "delete", field: "SA_Report", table: "facilityDocuments" }).text).toBe(
      "Removed SA Report",
    );
    expect(
      describeActivity({
        action: "update",
        field: "NQAS_Result",
        table: "facilityDocuments",
        newValue: "version restored",
      }).text,
    ).toBe("Restored a version of NQAS Result");
  });

  test("Drive credential changes never print a value", () => {
    const r = describeActivity({
      action: "update",
      field: "Client ID, Client secret, App address",
      table: "driveCredentials",
    });
    expect(r.text).toBe("Updated Google Drive credentials");
    expect(r.category).toBe("account");
    expect(r.text).not.toContain("secret");
  });

  test("imports are their own category and say so", () => {
    const r = describeActivity({
      action: "update",
      field: "SaQsham Documents Status",
      table: "facilities",
      source: "Saqsham import · tracker.xlsx",
    });
    expect(r.category).toBe("imports");
    expect(r.text).toContain("(import)");
  });

  test("unknown actions still read as a sentence (fallback)", () => {
    const r = describeActivity({ action: "frobnicate", field: "Wibble Count", table: "facilities" });
    expect(r.text).toBe("Updated Wibble count");
    const noField = describeActivity({ action: "frobnicate", table: "certificationCycles" });
    expect(noField.text.length).toBeGreaterThan(0);
  });

  test("the filter chips cover every category", () => {
    expect(ACTIVITY_FILTERS.map((f) => f.value)).toEqual([
      "all",
      "facility",
      "documents",
      "imports",
      "account",
    ]);
  });
});

describe("tabs", () => {
  test("the five tabs, in order, with a safe default", () => {
    expect(PROFILE_TABS.map((t) => t.label)).toEqual([
      "Profile",
      "Security",
      "Preferences",
      "Notifications",
      "Activity",
    ]);
    expect(DEFAULT_PROFILE_TAB).toBe("profile");
    expect(isProfileTab("security")).toBe(true);
    expect(isProfileTab("nope")).toBe(false);
    expect(isProfileTab(null)).toBe(false);
  });
});

describe("sessions", () => {
  const now = Date.parse("2026-10-24T11:00:00Z");

  test("a user agent becomes a readable device label", () => {
    expect(
      parseDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36").label,
    ).toBe("Chrome on Windows");
    expect(parseDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/17.0 Safari/605.1").label).toBe(
      "Safari on macOS",
    );
    expect(parseDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148 Safari/604.1").label).toBe(
      "Safari on iOS",
    );
    // Unknown/absent agent still says something honest.
    expect(parseDevice(null).label).toBe("Browser on Unknown OS");
  });

  test("sessions of the same browser and device group together", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0";
    const groups = groupSessions([
      { id: "1", current: true, createdAt: now, lastActive: now, expiresAt: now, userAgent: ua, region: null },
      { id: "2", current: false, createdAt: now, lastActive: now, expiresAt: now, userAgent: ua, region: null },
      {
        id: "3",
        current: false,
        createdAt: now,
        lastActive: now,
        expiresAt: now,
        userAgent: "Mozilla/5.0 (iPhone) Safari/604.1",
        region: null,
      },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].sessions).toHaveLength(2);
    expect(groups[0].device.label).toBe("Chrome on Windows");
  });

  test("idle over 7 days is Inactive, and last-active is relative", () => {
    expect(isInactiveSession(now - 8 * 24 * 60 * 60 * 1000, now)).toBe(true);
    expect(isInactiveSession(now - 2 * 24 * 60 * 60 * 1000, now)).toBe(false);
    expect(isInactiveSession(null, now)).toBe(false);

    expect(relativeTime(now, now)).toBe("just now");
    expect(relativeTime(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(relativeTime(now - 3 * 60 * 60_000, now)).toBe("3 h ago");
    expect(relativeTime(now - 30 * 60 * 60_000, now)).toBe("yesterday");
    expect(relativeTime(now - 3 * 24 * 60 * 60_000, now)).toBe("3 d ago");
    expect(relativeTime(null, now)).toBe("—");
  });

  test("activity groups read Today / Yesterday / the date", () => {
    expect(dayLabel(now, now)).toBe("Today");
    expect(dayLabel(now - 30 * 60 * 60_000, now)).toBe("Yesterday");
    expect(dayLabel(Date.parse("2026-10-20T09:00:00Z"), now)).toBe("20-Oct-2026");
  });
});

describe("notifications matrix", () => {
  test("four rows, each with an in-app and an email key, and a digest list", () => {
    expect(NOTIFICATION_ROWS.map((r) => r.label)).toEqual([
      "Needs attention",
      "IA due reminder",
      "Links due",
      "Import results",
    ]);
    for (const row of NOTIFICATION_ROWS) {
      expect(row.inAppKey.endsWith("InApp")).toBe(true);
      expect(row.emailKey.endsWith("Email")).toBe(true);
    }
    expect(DIGEST_OPTIONS.map((d) => d.label)).toEqual(["Off", "Daily", "Weekly"]);
  });
});
