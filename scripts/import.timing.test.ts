/**
 * Rule-engine timing tests — the two lifecycle flags added for the
 * "cycle method" milestone:
 *
 *  1. `deriveIaStatus` — "IA overdue" when the most recent Internal
 *     Assessment is older than the configured cadence (default 3 months).
 *  2. `deferredRetakeCountdown` — the "Re-take SA in X days" Deferred cooldown.
 *
 * Plus the template-import validators (facility matching, score/date
 * parsing, FY 2026-27 quarter buckets) that the SaQsham / IA import
 * wizards run on every row.
 *
 * Run: bun test ./scripts
 */
import { describe, it, expect } from "bun:test";

import {
  DEFAULT_SETTINGS,
  deriveIaStatus,
  deferredRetakeCountdown,
  addMonthsToIso,
} from "../src/convex/lifecycle";
import {
  iaQuarterBucket,
  matchFacility,
  normalizeNinKey,
  parseDateValue,
  parseScore,
  validateIaRow,
  validateSaqshamRow,
  errorRowsToCsv,
} from "../src/lib/importMatch";

const FACILITIES = [
  { name: "PHC Alangayam", block: "Alangayam", ninNumber: "NIN-1001" },
  { name: "PHC Jolarpet", block: "Jolarpet", ninNumber: "nin 1002" },
  { name: "HSC Kilminnal", block: "Jolarpet", ninNumber: null },
  { name: "Twin PHC", block: "Jolarpet", ninNumber: null },
];

describe("deriveIaStatus", () => {
  const s = { ...DEFAULT_SETTINGS, iaFrequencyMonths: 3 };

  it("no IA recorded → none", () => {
    expect(deriveIaStatus({ lastDate: null }, s, "2026-10-14")).toEqual({
      status: "none",
      lastDate: null,
      dueDate: null,
      daysSince: null,
    });
  });

  it("IA taken 40 days ago → ok", () => {
    const r = deriveIaStatus({ lastDate: "2026-09-04", lastScore: 80 }, s, "2026-10-14");
    expect(r.status).toBe("ok");
  });

  it("within 14 days of the due date → dueSoon", () => {
    // Done 2026-07-20 → due 2026-10-20 → 6 days left on 2026-10-14.
    const r = deriveIaStatus({ lastDate: "2026-07-20" }, s, "2026-10-14");
    expect(r.status).toBe("dueSoon");
    expect(r.dueDate).toBe("2026-10-20");
  });

  it("more than 3 months since the last IA → overdue", () => {
    // Done 2026-06-01 → due 2026-09-01 — well past on 2026-10-14.
    const r = deriveIaStatus({ lastDate: "2026-06-01" }, s, "2026-10-14");
    expect(r.status).toBe("overdue");
    expect(r.daysSince).toBeGreaterThan(90);
  });

  it("the cadence is settings-driven (2 months config)", () => {
    const s2 = { ...DEFAULT_SETTINGS, iaFrequencyMonths: 2 };
    // Done 2026-08-15 → due 2026-10-15 → 1 day away = dueSoon at 2 months,
    // but would still be "ok" under the default 3-month cadence.
    expect(deriveIaStatus({ lastDate: "2026-08-15" }, s2, "2026-10-14").status).toBe("dueSoon");
    expect(deriveIaStatus({ lastDate: "2026-08-15" }, s, "2026-10-14").status).toBe("ok");
  });
});

describe("deferredRetakeCountdown", () => {
  const s = { ...DEFAULT_SETTINGS, deferredCooldownMonths: 3 };

  it("shows the countdown inside the cooling period, anchored on the GoI letter date", () => {
    const r = deferredRetakeCountdown(
      { certificationStatus: "Deferred", goiLetterDate: "2026-10-01" },
      s,
      "2026-10-14",
    );
    expect(r).not.toBeNull();
    expect(r!.unlockDate).toBe("2027-01-01");
    expect(r!.daysLeft).toBe(79);
  });

  it('label arithmetic matches "Re-take SA in X days"', () => {
    const r = deferredRetakeCountdown(
      { certificationStatus: "Deferred", goiLetterDate: "2026-10-14" },
      s,
      "2026-10-14",
    );
    expect(r!.daysLeft).toBe(92); // Oct 14 + 3 calendar months
  });

  it("null once the cooldown is over (Eligible for Re-Assessment)", () => {
    expect(
      deferredRetakeCountdown(
        { certificationStatus: "Deferred", goiLetterDate: "2026-01-01" },
        s,
        "2026-10-14",
      ),
    ).toBeNull();
  });

  it("null for non-deferred results and when no anchor date exists", () => {
    expect(
      deferredRetakeCountdown({ certificationStatus: "Quality Certified" }, s, "2026-10-14"),
    ).toBeNull();
    expect(deferredRetakeCountdown({ certificationStatus: "Deferred" }, s, "2026-10-14")).toBeNull();
  });
});

describe("IA quarter buckets (FY 2026-27)", () => {
  it("Apr–Jun → Q1, Jul–Sep → Q2", () => {
    expect(iaQuarterBucket("2026-05-21")).toEqual({ fy: "2026-27", quarter: "Q1" });
    expect(iaQuarterBucket("2026-09-10")).toEqual({ fy: "2026-27", quarter: "Q2" });
  });

  it("outside the recorded quarters → null (stored as latest IA only)", () => {
    expect(iaQuarterBucket("2026-10-10")).toBeNull();
    expect(iaQuarterBucket("2025-08-10")).toBeNull();
    expect(iaQuarterBucket("2027-02-10")).toBeNull();
  });
});

describe("facility matching", () => {
  it("matches by NIN ignoring formatting differences", () => {
    expect(normalizeNinKey(" nin-1002 ")).toBe("nin1002");
    const m = matchFacility({ nin: "NIN 1002" }, FACILITIES, 1);
    expect(m.ok && m.facility.name === "PHC Jolarpet").toBe(true);
  });

  it("falls back to facility name + block", () => {
    const m = matchFacility({ name: "HSC Kilminnal", block: "jolarpet" }, FACILITIES, 2);
    expect(m.ok && m.facility.name === "HSC Kilminnal").toBe(true);
  });

  it("an ambiguous NIN is an error, never a silent pick", () => {
    const dup = [...FACILITIES, { name: "Other", block: "Alangayam", ninNumber: "NIN1001" }];
    const m = matchFacility({ nin: "NIN-1001" }, dup, 3);
    expect((m as { status?: string }).status).toBe("error");
  });

  it("unknown facility → error naming the row", () => {
    const m = matchFacility({ name: "Missing", block: "Alangayam" }, FACILITIES, 7);
    expect((m as { status?: string }).status).toBe("error");
    expect(((m as { reason?: string }).reason ?? "").startsWith("Row 7")).toBe(true);
  });
});

describe("cell parsing", () => {
  it("scores accept 85, 85%, 85.5 and reject out-of-range", () => {
    expect(parseScore(85, "x")).toEqual({ ok: true, value: 85 });
    expect(parseScore("85%", "x")).toEqual({ ok: true, value: 85 });
    expect(parseScore("85.5", "x")).toEqual({ ok: true, value: 85.5 });
    expect((parseScore(120, "x") as { ok: boolean }).ok).toBe(false);
    expect((parseScore("", "IA %") as { reason?: string }).reason).toBe("IA is empty");
  });

  it("dates parse ISO, day-first Indian formats and Excel serials", () => {
    expect(parseDateValue("2026-08-21")).toBe("2026-08-21");
    expect(parseDateValue("21-08-2026")).toBe("2026-08-21");
    expect(parseDateValue("21/08/2026")).toBe("2026-08-21");
    expect(parseDateValue("05/06/2026")).toBe("2026-06-05"); // dd/mm wins
    expect(parseDateValue("13/06/2026")).toBe("2026-06-13");
    // Excel serial 46220 = 2026-07-17 (25569 serials separate 1970-01-01).
    expect(parseDateValue(46220)).toBe("2026-07-17");
    expect(parseDateValue("")).toBeNull();
    expect(parseDateValue("soon")).toBeNull();
  });

  it("month math stays on the calendar (addMonthsToIso corner)", () => {
    expect(addMonthsToIso("2026-01-31", 1)).toBe("2026-02-28");
  });
});

describe("row validators", () => {
  it("a clean SaQsham row is valid, a bad status is an error", () => {
    const good = validateSaqshamRow(
      { rowNo: 1, nin: "NIN-1001", docStatus: "Docx in RQAU login" },
      FACILITIES,
      ["Docx in RQAU login", "Docx forwarded to NHSRC"],
    );
    expect(good.status).toBe("valid");
    expect(good.payload.name).toBe("PHC Alangayam");
    expect(good.payload.docStatus).toBe("Docx in RQAU login");

    const bad = validateSaqshamRow(
      { rowNo: 2, nin: "NIN-1001", docStatus: "Whatever" },
      FACILITIES,
      ["Docx in RQAU login"],
    );
    expect(bad.status).toBe("error");
    expect(bad.reasons.join()).toContain("not one of the workflow stages");
  });

  it("a clean IA row maps into its quarter", () => {
    const r = validateIaRow(
      { rowNo: 1, nin: "NIN-1001", assessmentDate: "2026-08-21", scorePct: "82%" },
      FACILITIES,
    );
    expect(r.status).toBe("valid");
    expect(r.payload.quarter).toBe("Q2");
    expect(r.payload.scorePct).toBe(82);
    expect(r.payload.assessmentDate).toBe("2026-08-21");
  });

  it("an out-of-FY date is only a warning; future dates and bad scores are errors", () => {
    const warn = validateIaRow(
      { rowNo: 2, nin: "NIN-1001", assessmentDate: "2025-08-21", scorePct: 70 },
      FACILITIES,
    );
    expect(warn.status).toBe("warning");
    expect(warn.reasons.join()).toContain("outside FY 2026-27");

    const future = validateIaRow(
      { rowNo: 3, nin: "NIN-1001", assessmentDate: "2099-01-01", scorePct: 70 },
      FACILITIES,
    );
    expect(future.status).toBe("error");

    const badScore = validateIaRow(
      { rowNo: 4, nin: "NIN-1001", assessmentDate: "2026-08-21", scorePct: 140 },
      FACILITIES,
    );
    expect(badScore.status).toBe("error");
    expect(badScore.reasons.join()).toContain("outside 0–100");
  });
});

describe("error report CSV", () => {
  it("UTF-8 BOM, header and quoted reasons", () => {
    const csv = errorRowsToCsv([
      { rowNo: 3, reason: 'Said "one" only' },
    ]);
    expect(csv.startsWith("﻿Row,Problem\r\n3,")).toBe(true);
    expect(csv).toContain('"Said ""one"" only"');
  });
});
