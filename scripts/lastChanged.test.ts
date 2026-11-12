/**
 * PART 2 — the "Updated" filter and the smart-paste detection.
 *
 * These are the two new pure surfaces: the Master List filter must read IST
 * days (not the viewer's timezone) and the paste box must never guess a
 * quarter or a facility, only an importer.
 */

import { describe, expect, it } from "bun:test";

import {
  applyMasterFilters,
  istDateOf,
  lastChangedMatches,
  type LastChangedFilter,
} from "../src/lib/masterFilter";
import type { MasterRow } from "../src/lib/masterColumns";
import { detectImportText } from "../src/lib/importDetect";
import { parseListFilters, serializeListFilters } from "../src/lib/listUrlState";

/* A minimal MasterRow — only the fields the filter reads. */
function row(opts: {
  id?: string;
  name?: string;
  lastChangedAt?: number | null;
  updatedAt?: number | null;
  by?: string | null;
  source?: string | null;
  batch?: string | null;
  recent?: { key: string; at: number }[] | null;
} = {}): MasterRow {
  return {
    facility: {
      _id: opts.id ?? "f1",
      name: opts.name ?? "Kurumbakeri",
      block: "Alangayam",
      phc: "Alangayam",
      facilityType: "PHC",
      lastChangedAt: opts.lastChangedAt ?? null,
      updatedAt: opts.updatedAt ?? null,
      lastChangedBy: opts.by ?? null,
      lastChangeSource: (opts.source as MasterRow["facility"]["lastChangeSource"]) ?? null,
      lastBatchId: opts.batch ?? null,
      recentChanges: (opts.recent as MasterRow["facility"]["recentChanges"]) ?? null,
    },
  } as MasterRow;
}

/** 28-Oct-2026 10:25 IST — the app's "today" for these tests. */
const NOW = new Date("2026-10-28T04:55:00.000Z");
const atIst = (iso: string) => Date.parse(`${iso}T10:00:00+05:30`);

const f = (over: Partial<LastChangedFilter> = {}): LastChangedFilter => ({
  preset: "7d",
  ...over,
});

describe("last-changed filter — IST windows", () => {
  it("Today means the IST calendar day, not UTC", () => {
    // 00:30 IST on 28-Oct is still 27-Oct in UTC.
    const early = Date.parse("2026-10-27T19:00:00.000Z");
    expect(istDateOf(early)).toBe("2026-10-28");
    expect(lastChangedMatches(row({ lastChangedAt: early }), f({ preset: "today" }), NOW)).toBe(true);
    expect(
      lastChangedMatches(row({ lastChangedAt: atIst("2026-10-27") }), f({ preset: "today" }), NOW),
    ).toBe(false);
  });

  it("Last 24 hours is a rolling window", () => {
    const r = row({ lastChangedAt: NOW.getTime() - 25 * 3_600_000 });
    expect(lastChangedMatches(r, f({ preset: "24h" }), NOW)).toBe(false);
    expect(
      lastChangedMatches(row({ lastChangedAt: NOW.getTime() - 23 * 3_600_000 }), f({ preset: "24h" }), NOW),
    ).toBe(true);
  });

  it("7 and 30 days include the whole IST start day", () => {
    // 22-Oct is exactly 7 IST days back (28 − 6).
    expect(
      lastChangedMatches(row({ lastChangedAt: atIst("2026-10-22") }), f({ preset: "7d" }), NOW),
    ).toBe(true);
    expect(
      lastChangedMatches(row({ lastChangedAt: atIst("2026-10-21") }), f({ preset: "7d" }), NOW),
    ).toBe(false);
    expect(
      lastChangedMatches(row({ lastChangedAt: atIst("2026-09-29") }), f({ preset: "30d" }), NOW),
    ).toBe(true);
    expect(
      lastChangedMatches(row({ lastChangedAt: atIst("2026-09-28") }), f({ preset: "30d" }), NOW),
    ).toBe(false);
  });

  it("custom range is inclusive at both ends", () => {
    const r = row({ lastChangedAt: atIst("2026-10-20") });
    expect(lastChangedMatches(r, f({ preset: "custom", from: "2026-10-20", to: "2026-10-20" }), NOW)).toBe(true);
    expect(lastChangedMatches(r, f({ preset: "custom", from: "2026-10-21" }), NOW)).toBe(false);
  });

  it("refiners narrow by source, batch and changed field", () => {
    const r = row({
      lastChangedAt: atIst("2026-10-27"),
      by: "Priya",
      source: "saqsham",
      batch: "b1",
      recent: [{ key: "documentsStatusReport", at: atIst("2026-10-27") }],
    });
    expect(lastChangedMatches(r, f({ source: "saqsham" }), NOW)).toBe(true);
    expect(lastChangedMatches(r, f({ source: "ia" }), NOW)).toBe(false);
    expect(lastChangedMatches(r, f({ batchId: "b1" }), NOW)).toBe(true);
    expect(lastChangedMatches(r, f({ field: "documentsStatusReport" }), NOW)).toBe(true);
    expect(lastChangedMatches(r, f({ field: "remarks" }), NOW)).toBe(false);
    expect(lastChangedMatches(r, f({ by: "priya" }), NOW)).toBe(true);
  });

  it("a facility with no stamp never matches an active filter", () => {
    expect(lastChangedMatches(row(), f({ preset: "today" }), NOW)).toBe(false);
  });

  it("falls back to the legacy updatedAt for rows saved before the field", () => {
    expect(
      lastChangedMatches(row({ updatedAt: atIst("2026-10-27") }), f({ preset: "7d" }), NOW),
    ).toBe(true);
  });

  it("applyMasterFilters applies it with every other filter", () => {
    const rows = [
      row({ id: "a", lastChangedAt: atIst("2026-10-27") }),
      row({ id: "b", lastChangedAt: atIst("2026-08-01") }),
    ];
    const out = applyMasterFilters(rows, { lastChanged: f({ preset: "7d" }) }, NOW);
    expect(out.map((r) => r.facility._id)).toEqual(["a"]);
  });
});

describe("Updated filter — URL state", () => {
  it("round-trips the preset and its refiners", () => {
    const parsed = parseListFilters(
      "?upd=7d&updhow=saqsham&updbatch=b1&updfield=remarks&updby=Priya",
    );
    expect(parsed.updated).toBe("7d");
    expect(parsed.updHow).toBe("saqsham");
    expect(parsed.updBatch).toBe("b1");
    expect(parsed.updField).toBe("remarks");
    expect(parsed.updBy).toBe("Priya");
    const qs = serializeListFilters(parsed);
    expect(qs).toContain("upd=7d");
    expect(qs).toContain("updhow=saqsham");
  });

  it("ignores an unknown preset", () => {
    expect(parseListFilters("?upd=forever").updated).toBe("");
    expect(parseListFilters("").updated).toBe("");
  });
});

describe("smart paste detection", () => {
  const saqsham =
    "Application No\tFacility Name/Category\tStatus\tLast Update Dtls\n" +
    "APP-1\tAlangayam CHC\tDocuments Pending at Facility\t06-Oct-2026";
  const ia =
    "S. No\tNIN Number\tBlock\tPHC\tName of the facility\tType\tFinancial Year\tQuarter\tNQAS IA Score\tKayakalp IA Score\n" +
    "1\t4527324786\tAlangayam\tAlangayam\tAlangayam\tCHC\t2025-26\tQ3\t72\t";
  const master =
    "Facility Name\tBlock\tNIN Number\tFacility Type\nAlangayam CHC\tAlangayam\t4527324786\tCHC";

  it("recognises each of the three imports", () => {
    expect(detectImportText(saqsham).kind).toBe("saqsham");
    expect(detectImportText(ia).kind).toBe("ia");
    expect(detectImportText(master).kind).toBe("facility-master");
  });

  it("counts data rows and columns and never treats the header as a row", () => {
    const d = detectImportText(ia);
    expect(d.rows).toBe(1);
    expect(d.columns).toBe(10);
  });

  it("asks when the header matches more than one importer", () => {
    const both =
      "Application No\tFacility Name\tBlock\tNIN Number\tStatus\tFinancial Year\tQuarter\tNQAS IA Score\n" +
      "A1\tX\tAlangayam\t1\tResult Declared\t2025-26\tQ3\t70";
    const d = detectImportText(both);
    expect(d.ambiguous).toBe(true);
    expect(d.kind).toBeNull();
    expect(d.matches.length).toBeGreaterThan(1);
  });

  it("never guesses for an unrelated paste", () => {
    const d = detectImportText("hello\tworld\n1\t2");
    expect(d.kind).toBeNull();
    expect(d.ambiguous).toBe(false);
  });
});
