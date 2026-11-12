/**
 * FACILITY MASTER LIST — THE VIEW IN THE URL (pure contract).
 *
 * The bug these tests pin down: filters/search/sort/page used to live in
 * `useState` inside the list page, so opening a facility profile unmounted the
 * page and Back showed an unfiltered list. The view now lives in the query
 * string (hooks/use-list-url-state + lib/listUrlState), which makes it:
 *
 *   • restorable by Back / Forward / "Back to list" (history holds the URLs),
 *   • shareable (copy the link → same filtered list),
 *   • refresh-proof,
 *   • impossible to crash with a hand-edited or hostile URL.
 *
 * Everything here is pure, so the rules stay pinned without a browser. The
 * DOM-level behaviour (real dropdown, real navigation) is covered by
 * scripts/listNavigation.dom.test.ts.
 */

import { describe, expect, test } from "bun:test";

import {
  activeFilterCount,
  defaultListFilters,
  hasViewParams,
  listUrlKey,
  parseListFilters,
  serializeListFilters,
} from "../src/lib/listUrlState";
import { countListOptions } from "../src/lib/listOptionCounts";
import { applyMasterFilters, NO_CYCLE } from "../src/lib/masterFilter";
import type { MasterRow } from "../src/lib/masterColumns";

/* ------------------------------------------------------------------ fixtures */

type RowSpec = {
  id: string;
  name: string;
  block: string;
  type: string;
  status: string;
  cert?: string | null;
  eligibility?: string | null;
  cycle?: number | null;
  bstatus?: string | null;
  nocAvailable?: string | null;
};

function row(spec: RowSpec): MasterRow {
  return {
    facility: {
      _id: spec.id,
      name: spec.name,
      block: spec.block,
      phc: `${spec.block} PHC`,
      facilityType: spec.type,
      ninNumber: `12010044${spec.id}`,
      eligibility: spec.eligibility ?? "Eligible",
      currentStatus: spec.status,
      statusOverride: null,
      remarks: "",
      updatedAt: null,
      nqasIaQ1: null,
      nqasIaQ2: null,
      kayakalpIaQ1: null,
      kayakalpIaQ2: null,
    },
    cycleNumber: spec.cycle ?? null,
    cycleType: null,
    sa: null,
    nqas: spec.cert
      ? { certificationStatus: spec.cert, scorePercent: 78 }
      : null,
    fund: null,
    noc: spec.nocAvailable ? { nocAvailable: spec.nocAvailable } : null,
    building: spec.bstatus ? { buildingStatus: spec.bstatus } : null,
    ia: null,
    resultDocumentId: null,
    resultDocumentName: null,
  } as unknown as MasterRow;
}

/** Alangayam ×3 (1 HSC), Mittur ×2, DMS ×1 — 6 facilities. */
const rows: MasterRow[] = [
  row({ id: "1", name: "Ariyur PHC", block: "Alangayam", type: "PHC", status: "Certified", cert: "Certified", cycle: 2 }),
  row({ id: "2", name: "Ariyur HSC", block: "Alangayam", type: "HSC", status: "SA Completed", cert: null, cycle: 1 }),
  row({ id: "3", name: "Vellore PHC", block: "Alangayam", type: "PHC", status: "SA In Progress", cert: "Certified", cycle: 2, bstatus: "Good" }),
  row({ id: "4", name: "Mittur PHC", block: "Mittur", type: "PHC", status: "Certified", cert: "Not Certified", cycle: 2, nocAvailable: "Yes" }),
  row({ id: "5", name: "Mittur HSC", block: "Mittur", type: "HSC", status: "Eligible", cert: null }),
  row({ id: "6", name: "DMS Kaniyambadi", block: "DMS", type: "DMS", status: "Certified", cert: "Certified", cycle: 3, bstatus: "Needs Repair" }),
];

/* ------------------------------------------------------- parsing / defaults */

describe("list view URL — parsing", () => {
  test("reads the search, every filter, the sort, the page and the page size", () => {
    const view = parseListFilters(
      "?q=abd&block=Alangayam,Mittur&type=PHC&status=Certified&cert=Certified" +
        "&elig=Eligible&cycle=2&btype=Own%20Building&bstatus=Good&noc=Valid" +
        "&kpi=certified&due=30&score=40-90&sort=facility:asc,block:desc&page=2&size=50",
    );
    expect(view.q).toBe("abd");
    expect(view.block).toEqual(["Alangayam", "Mittur"]);
    expect(view.type).toEqual(["PHC"]);
    expect(view.status).toEqual(["Certified"]);
    expect(view.cert).toEqual(["Certified"]);
    expect(view.eligibility).toEqual(["Eligible"]);
    expect(view.cycle).toEqual(["2"]);
    expect(view.btype).toEqual(["Own Building"]);
    expect(view.bstatus).toEqual(["Good"]);
    expect(view.noc).toEqual(["Valid"]);
    expect(view.kpi).toBe("certified");
    expect(view.due).toBe(30);
    expect(view.score).toEqual([40, 90]);
    expect(view.sort).toEqual([
      { id: "facility", desc: false },
      { id: "block", desc: true },
    ]);
    expect(view.page).toBe(2);
    expect(view.size).toBe("50");
  });

  test("a plain URL is the clean list: nothing filtered, page 1", () => {
    const view = parseListFilters("");
    expect(view).toEqual(defaultListFilters());
    expect(activeFilterCount(view)).toBe(0);
  });

  test("unknown, malformed and inverted params are ignored — never a crash", () => {
    const view = parseListFilters(
      "?block=&score=90-40&sort=not_a_column:asc&page=0&size=999&kpi=notacard&due=45&q=%20%20",
    );
    expect(view.score).toEqual([0, 100]);
    expect(view.sort).toEqual([]);
    expect(view.page).toBe(1);
    expect(view.size).toBe("10");
    expect(view.kpi).toBeNull();
    expect(view.due).toBe(0);
    expect(view.q).toBe("");
  });

  test("a hostile URL cannot blow up the view (values are bounded)", () => {
    const many = Array.from({ length: 500 }, (_, i) => `b${i}`).join(",");
    const long = "x".repeat(5000);
    const view = parseListFilters(`?block=${many}&q=${long}`);
    expect(view.block.length).toBeLessThanOrEqual(60);
    expect(view.q.length).toBeLessThanOrEqual(120);
    expect(view.page).toBeLessThanOrEqual(10_000);
  });

  test("an out-of-range page is clamped, and a real page is kept", () => {
    expect(parseListFilters("?page=999999").page).toBe(10_000);
    expect(parseListFilters("?page=3").page).toBe(3);
    expect(parseListFilters("?page=abc").page).toBe(1);
  });
});

describe("list view URL — writing it back", () => {
  test("defaults are omitted, so a clean list is a clean URL", () => {
    expect(serializeListFilters(defaultListFilters())).toBe("");
  });

  test("serialize → parse round-trips: a copied link opens the same list", () => {
    const view = {
      ...defaultListFilters(),
      q: "ariyur",
      block: ["Alangayam", "Mittur"],
      cycle: ["2", NO_CYCLE],
      cert: ["Certified"],
      kpi: "certified" as const,
      due: 60 as const,
      score: [50, 95] as [number, number],
      sort: [{ id: "facility", desc: true }],
      page: 4,
      size: "50" as const,
    };
    const round = parseListFilters(serializeListFilters(view));
    expect(round).toEqual(view);
  });

  test("the link stays readable — commas and colons are not percent-encoded", () => {
    // These links get pasted into a district WhatsApp group, so the separators
    // stay literal (the parser accepts the encoded forms too).
    const qs = serializeListFilters({
      ...defaultListFilters(),
      q: "ariyur phc",
      block: ["Alangayam", "Mittur"],
      sort: [{ id: "facility", desc: false }],
    });
    expect(qs).toBe("q=ariyur%20phc&block=Alangayam,Mittur&sort=facility:asc");
    expect(qs).not.toContain("%2C");
    expect(qs).not.toContain("%3A");
  });

  test("the storage key is the exact list URL (scroll + ticks are per view)", () => {
    expect(listUrlKey("/facilities", "")).toBe("/facilities");
    expect(listUrlKey("/facilities", "?block=Alangayam")).toBe("/facilities?block=Alangayam");
  });

  test("hasViewParams only fires for params that shape the list", () => {
    expect(hasViewParams("")).toBe(false);
    expect(hasViewParams("?foo=bar")).toBe(false);
    expect(hasViewParams("?block=Alangayam")).toBe(true);
    expect(hasViewParams("?q=abc&page=2")).toBe(true);
    expect(hasViewParams("?sort=facility:asc")).toBe(true);
  });

  test("activeFilterCount counts search, filters, KPI, due window and score", () => {
    expect(activeFilterCount(defaultListFilters())).toBe(0);
    expect(
      activeFilterCount({
        ...defaultListFilters(),
        q: "abc",
        block: ["Alangayam"],
        kpi: "nocAlert",
        due: 90,
        score: [10, 100],
      }),
    ).toBe(5);
  });
});

/* ----------------------------------------------------- dropdown option counts */

describe("dropdown option counts", () => {
  const values = {
    block: ["Alangayam", "Mittur", "DMS"],
    type: ["PHC", "HSC", "DMS"],
    cycle: ["1", "2", "3", NO_CYCLE],
    eligibility: ["Eligible", "Not Eligible"],
    cert: ["Certified", "Not Certified"],
    status: ["Certified", "SA Completed", "SA In Progress", "Eligible"],
    docRep: ["Documents Pending at Facility", "Document in RQAU login"],
    btype: ["Own Building"],
    bstatus: ["Good", "Needs Repair"],
    noc: ["Valid", "Not Obtained"],
  };

  test("with no filter, each option counts the rows it would show", () => {
    const counts = countListOptions(rows, {}, values);
    expect(counts.block.get("Alangayam")).toBe(3);
    expect(counts.block.get("Mittur")).toBe(2);
    expect(counts.block.get("DMS")).toBe(1);
    expect(counts.type.get("PHC")).toBe(3);
    expect(counts.cert.get("Not Certified")).toBe(1);
  });

  test("counts move when OTHER filters move (they are live)", () => {
    const all = countListOptions(rows, {}, values);
    expect(all.type.get("HSC")).toBe(2);

    // Narrow to Alangayam: only one of the two HSCs is left.
    const inAlangayam = countListOptions(rows, { blocks: ["Alangayam"] }, values);
    expect(inAlangayam.type.get("HSC")).toBe(1);
    expect(inAlangayam.type.get("DMS")).toBe(0);
    expect(inAlangayam.block.get("Mittur")).toBe(2); // its own filter is ignored
  });

  test("an option hidden by another filter counts 0 but stays selectable", () => {
    // Type = DMS leaves one facility, so every block except DMS counts 0 — the
    // option is still offered (greyed), because the user may clear the type.
    const onlyDms = countListOptions(rows, { types: ["DMS"] }, values);
    expect(onlyDms.block.get("Alangayam")).toBe(0);
    expect(onlyDms.block.get("DMS")).toBe(1);
    expect([...onlyDms.block.keys()]).toContain("Alangayam");
  });

  test("counts always equal what the list would actually show", () => {
    const base = { types: ["PHC"], dueWindow: 0 };
    const counts = countListOptions(rows, base, values);
    for (const block of values.block) {
      const shown = applyMasterFilters(rows, { ...base, blocks: [block] }).length;
      expect(counts.block.get(block)).toBe(shown);
    }
  });
});
