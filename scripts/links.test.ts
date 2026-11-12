/**
 * LINKS ORGANISER — pure due/security/visibility rules.
 *
 * Pins the sample's due calculation (20-Mar-2026 + 3 calendar months =
 * 20-Jun-2026, 135 days overdue on 02-Nov-2026) and the URL safety contract.
 */

import { describe, expect, test } from "bun:test";

import {
  LINK_TABLE_COLUMNS,
  addCalendarMonths,
  canSeeLink,
  computeDueState,
  computeNextDue,
  detectLinkType,
  dueStateLabel,
  linkCountsLabel,
  linkReminderScope,
  linkRole,
  linksFileName,
  normalizeLinkUrl,
  normalizeLinksConfig,
  validateLinkUrl,
} from "../src/lib/links";
import {
  guardLinkCheckUrl,
  isBlockedAddress,
  isLoginGatedHost,
  statusFromResponse,
} from "../src/lib/linkCheck";

const config = normalizeLinksConfig({ dueSoonDays: 7 });

describe("calendar due dates", () => {
  test("3 months from 20-Mar-2026 is 20-Jun-2026 and 135 days overdue on 02-Nov-2026", () => {
    expect(computeNextDue("2026-03-20", "quarterly")).toBe("2026-06-20");
    const due = computeDueState(
      { frequency: "quarterly", lastUpdated: "2026-03-20", status: "Completed" },
      "2026-11-02",
      config,
    );
    expect(due.state).toBe("overdue");
    expect(due.days).toBe(-135);
    expect(due.nextDue).toBe("2026-06-20");
    expect(dueStateLabel(due, config)).toBe("Overdue (135 days)");
  });

  test("month-end clamps: 31-Jan + 1 month = 28-Feb (29 in a leap year)", () => {
    expect(addCalendarMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addCalendarMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addCalendarMonths("2026-03-31", 3)).toBe("2026-06-30");
  });

  test("one-time and archived have no due date; blank recurring is Never updated", () => {
    expect(computeDueState({ frequency: "one-time", lastUpdated: "2026-03-20", status: "Active" }, "2026-11-02", config).state).toBe("none");
    expect(computeDueState({ frequency: "monthly", lastUpdated: "2026-03-20", status: "Active", archivedAt: 1 }, "2026-11-02", config).state).toBe("none");
    const never = computeDueState({ frequency: "monthly", status: "Active" }, "2026-11-02", config);
    expect(never.state).toBe("never");
    expect(dueStateLabel(never, config)).toBe("Never updated");
  });

  test("due soon uses the configured window, and Completed can be switched off", () => {
    const due = computeDueState({ frequency: "weekly", lastUpdated: "2026-12-20", status: "Active" }, "2026-12-25", config);
    expect(due.state).toBe("due-soon");
    expect(dueStateLabel(due, config)).toBe("Due soon (2d)");
    const closed = normalizeLinksConfig({
      statuses: [
        { name: "Active", tone: "teal", icon: "CircleDot", countsAsOpen: true },
        { name: "Completed", tone: "green", icon: "CheckCircle2", countsAsOpen: false },
      ],
    });
    expect(computeDueState({ frequency: "quarterly", lastUpdated: "2026-03-20", status: "Completed" }, "2026-11-02", closed).state).toBe("none");
  });

  test("weekly and custom-day intervals are exact days", () => {
    expect(computeNextDue("2026-10-30", "weekly")).toBe("2026-11-06");
    expect(computeNextDue("2026-10-30", "custom-days", 10)).toBe("2026-11-09");
  });
});

describe("URL safety", () => {
  test("normalises tracking and zero-width characters", () => {
    expect(normalizeLinkUrl("  https://example.com/report?utm_source=x&id=4\u200B ")).toBe("https://example.com/report?id=4");
  });

  test("only http/https, and never credentials in the URL", () => {
    expect(validateLinkUrl("javascript:alert(1)").ok).toBe(false);
    expect(validateLinkUrl("data:text/html,hello").ok).toBe(false);
    expect(validateLinkUrl("file:///etc/passwd").ok).toBe(false);
    expect(validateLinkUrl("https://user:pass@example.com/x").ok).toBe(false);
    expect(validateLinkUrl("https://example.com/x").ok).toBe(true);
  });

  test("secret query parameters block saving and name the parameter", () => {
    const check = validateLinkUrl("https://example.com/x?token=abc123");
    expect(check.ok).toBe(false);
    expect(check.secretParams).toEqual(["token"]);
    expect(check.warning).toContain("may contain a secret");
  });

  test("detects Sheets, Forms, Docs, PDF, Drive and video", () => {
    expect(detectLinkType("https://docs.google.com/spreadsheets/d/abc/edit")).toBe("sheet");
    expect(detectLinkType("https://docs.google.com/forms/d/e/abc")).toBe("form");
    expect(detectLinkType("https://docs.google.com/document/d/abc/edit")).toBe("doc");
    expect(detectLinkType("https://example.com/a.pdf")).toBe("pdf");
    expect(detectLinkType("https://drive.google.com/file/d/abc/view")).toBe("drive");
    expect(detectLinkType("https://youtu.be/abc")).toBe("video");
  });
});

describe("roles and table contract", () => {
  test("admin-only links are never visible to editors or viewers", () => {
    expect(canSeeLink("admin", "admin")).toBe(true);
    expect(canSeeLink("admin", "editor")).toBe(false);
    expect(canSeeLink("admin", "viewer")).toBe(false);
    expect(canSeeLink("editors", "editor")).toBe(true);
    expect(canSeeLink("editors", "viewer")).toBe(false);
    expect(canSeeLink("everyone", "viewer")).toBe(true);
    expect(linkRole("entry")).toBe("editor");
    expect(linkRole("dqmo")).toBe("editor");
    expect(linkRole("viewer")).toBe("viewer");
  });

  test("bell scope: editors mode shows all; owners mode narrows to matched owners", () => {
    const owners = [{ name: "Quality" }, { name: "DQMO" }];
    // Default "editors" — every signed-in user sees the whole visible feed.
    expect(linkReminderScope({ notifyMode: "editors" }, { name: "Anyone" }, owners)).toEqual({ mode: "all" });
    // "owners" — a user on the owner list only sees their own rows.
    expect(
      linkReminderScope({ notifyMode: "owners" }, { name: "Quality" }, owners),
    ).toEqual({ mode: "owned-by", names: ["quality"] });
    // Match on e-mail (or its local part) too, case-insensitively.
    expect(
      linkReminderScope({ notifyMode: "owners" }, { email: "DQMO@tn.gov" }, owners),
    ).toEqual({ mode: "owned-by", names: ["dqmo"] });
    // A user matching no owner falls back to the full feed, never an empty one.
    expect(
      linkReminderScope({ notifyMode: "owners" }, { name: "Someone Else", email: "x@tn.gov" }, owners),
    ).toEqual({ mode: "all" });
    // No identity at all (defensive) also falls back rather than hiding rows.
    expect(linkReminderScope({ notifyMode: "owners" }, {}, owners)).toEqual({ mode: "all" });
  });

  test("the table has one column model with 12 columns and three frozen cells", () => {
    expect(LINK_TABLE_COLUMNS).toHaveLength(12);
    expect(LINK_TABLE_COLUMNS.map((c) => c.label)).toEqual([
      "S. No", "Category", "Report Name", "Frequency", "Last Updated", "Next Due",
      "Link", "Form Link", "Owner", "Status", "Remarks", "Actions",
    ]);
    expect(LINK_TABLE_COLUMNS.filter((c) => c.frozen).map((c) => c.key)).toEqual(["serial", "category", "title"]);
  });

  test("header counts are text, not a lone colour", () => {
    expect(linkCountsLabel({ total: 42, dueSoon: 6, overdue: 2 })).toBe("42 links · 6 due · 2 overdue");
  });

  test("export file names use {District} Links Organiser {DD-MM-YYYY}", () => {
    expect(linksFileName("Tirupathur", "2026-11-02")).toBe("Tirupathur Links Organiser 02-11-2026");
    expect(linksFileName("", "2026-01-05")).toBe("District Links Organiser 05-01-2026");
  });
});

describe("optional link checker (SSRF guard)", () => {
  test("private, loopback, link-local and metadata addresses are blocked", () => {
    for (const address of ["127.0.0.1", "10.1.2.3", "192.168.0.1", "169.254.169.254", "172.16.0.1", "::1", "fe80::1", "0.0.0.0"]) {
      expect(isBlockedAddress(address)).toBe(true);
    }
    expect(isBlockedAddress("8.8.8.8")).toBe(false);
    expect(isBlockedAddress("93.184.216.34")).toBe(false);
  });

  test("only public http(s) URLs pass the pre-request guard", () => {
    expect(guardLinkCheckUrl("http://127.0.0.1/report").ok).toBe(false);
    expect(guardLinkCheckUrl("http://localhost/report").ok).toBe(false);
    expect(guardLinkCheckUrl("https://example.org/report").ok).toBe(true);
    expect(guardLinkCheckUrl("javascript:alert(1)").ok).toBe(false);
    expect(guardLinkCheckUrl("file:///etc/passwd").ok).toBe(false);
    expect(guardLinkCheckUrl("https://user:pass@example.org/x").ok).toBe(false);
  });

  test("login-gated Google/SaQsham hosts are never requested", () => {
    expect(isLoginGatedHost("docs.google.com")).toBe(true);
    expect(isLoginGatedHost("drive.google.com")).toBe(true);
    expect(isLoginGatedHost("forms.gle")).toBe(true);
    expect(isLoginGatedHost("saqsham.nhsrcindia.org")).toBe(true);
    expect(isLoginGatedHost("example.org")).toBe(false);
    const gated = guardLinkCheckUrl("https://docs.google.com/document/d/abc");
    expect(gated.ok && gated.loginGated).toBe(true);
  });

  test("a check reports the four words and never turns 403 into a broken link", () => {
    expect(statusFromResponse(200)).toBe("ok");
    expect(statusFromResponse(404)).toBe("not_found");
    expect(statusFromResponse(410)).toBe("not_found");
    expect(statusFromResponse(403)).toBe("not_checked");
    expect(statusFromResponse(500)).toBe("not_checked");
  });
});
