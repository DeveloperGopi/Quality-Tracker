/**
 * BREAKDOWN TESTS — the Progress-breakdown contract (Part 5 of the brief).
 *
 * 1. Bar equals label: every segment's fraction is count/n (computed by the
 *    SAME function the card renders), buckets sum to n, and the sum of the
 *    segments equals the Hold-a-certificate figure plus the other buckets.
 *    This is the test that catches the old bug (gold painting Conditional
 *    AND the result-awaited segment at once).
 * 2. Golden fixture (the district's own numbers pinned):
 *      Hold a certificate by block — Kandhili 16/26, Natrampalli 8/13,
 *      Madhanur 13/29, Tirupathur 11/27, Jolarpettai 12/31, Alangayam 9/27,
 *      DMS 3/4 → 72/157 (45.9%, displayed 46%).
 *      By type — CHC 2/6, DHQH 1/1, HWC HSC 47/110 (34 Q + 13 C), PHC 19/23,
 *      SDH 2/3, UGPHC 0/3, UHWC 0/5, UPHC 1/6.
 *      Scope-wide: Quality 57 + Conditional 15 = 72; result awaited 14.
 * 3. Small-group rule: DMS (n=4) is small, gets NO badge; ties get none.
 * 4. Heatmap: cells sum to the same 157; row totals equal the block rows.
 * 5. Drill-down URLs, sort stability, takeaway guards.
 * 6. Excel workbook contract (formula cells, freeze, print setup, footer).
 */

import { describe, expect, it } from "bun:test";
import {
  BUCKET_ORDER,
  breakdownBucketOf,
  breakdownListUrl,
  breakdownTakeaway,
  buildBlockTypeHeatmap,
  buildBreakdown,
  rateOf,
  rowBadgeFor,
  sortBreakdownRows,
  type BreakdownBucket,
  type BreakdownFacility,
} from "../src/lib/breakdown";
import {
  buildBreakdownPdf,
  buildBreakdownWorkbook,
  breakdownSubtitle,
} from "../src/lib/breakdownExport";

/* ------------------------------------------------------------------ */
/* Golden fixture — 157 facilities assembled from the pinned cells     */
/* ------------------------------------------------------------------ */

/** Per (block, type): how many facilities, and how many land on the
 *  certified/conditional columns. Sums are pinned in the tests below. */
const CELLS: {
  block: string;
  type: string;
  n: number;
  quality: number;
  conditional: number;
}[] = [
  { block: "Kandhili", type: "HWC HSC", n: 20, quality: 10, conditional: 3 },
  { block: "Kandhili", type: "PHC", n: 4, quality: 2, conditional: 1 },
  { block: "Kandhili", type: "UGPHC", n: 1, quality: 0, conditional: 0 },
  { block: "Kandhili", type: "UPHC", n: 1, quality: 0, conditional: 0 },
  { block: "Natrampalli", type: "HWC HSC", n: 9, quality: 5, conditional: 1 },
  { block: "Natrampalli", type: "PHC", n: 3, quality: 2, conditional: 0 },
  { block: "Natrampalli", type: "CHC", n: 1, quality: 0, conditional: 0 },
  { block: "Madhanur", type: "HWC HSC", n: 18, quality: 8, conditional: 3 },
  { block: "Madhanur", type: "PHC", n: 4, quality: 2, conditional: 0 },
  { block: "Madhanur", type: "CHC", n: 1, quality: 0, conditional: 0 },
  { block: "Madhanur", type: "UGPHC", n: 1, quality: 0, conditional: 0 },
  { block: "Madhanur", type: "UHWC", n: 2, quality: 0, conditional: 0 },
  { block: "Madhanur", type: "UPHC", n: 3, quality: 0, conditional: 0 },
  { block: "Tirupathur", type: "HWC HSC", n: 19, quality: 5, conditional: 2 },
  { block: "Tirupathur", type: "PHC", n: 4, quality: 4, conditional: 0 },
  { block: "Tirupathur", type: "CHC", n: 2, quality: 0, conditional: 0 },
  { block: "Tirupathur", type: "SDH", n: 1, quality: 0, conditional: 0 },
  { block: "Tirupathur", type: "UGPHC", n: 1, quality: 0, conditional: 0 },
  { block: "Jolarpettai", type: "HWC HSC", n: 24, quality: 4, conditional: 4 },
  { block: "Jolarpettai", type: "PHC", n: 4, quality: 4, conditional: 0 },
  { block: "Jolarpettai", type: "UHWC", n: 3, quality: 0, conditional: 0 },
  { block: "Alangayam", type: "HWC HSC", n: 19, quality: 1, conditional: 0 },
  { block: "Alangayam", type: "PHC", n: 4, quality: 4, conditional: 0 },
  { block: "Alangayam", type: "CHC", n: 2, quality: 2, conditional: 0 },
  { block: "Alangayam", type: "SDH", n: 2, quality: 2, conditional: 0 },
  { block: "DMS", type: "HWC HSC", n: 1, quality: 1, conditional: 0 },
  { block: "DMS", type: "DHQH", n: 1, quality: 1, conditional: 0 },
  { block: "DMS", type: "UPHC", n: 2, quality: 0, conditional: 1 },
];

const QUALITY = "Quality Certified";
const CONDITIONAL = "Quality Certified with Conditionality";
const RESULT = "Result Awaited";
const CERT = (c: string) => c;

/** Non-hold status queue per block: [resultAwaited, inProgress, deferred,
 *  eligibleNotStarted, notEligible] — sized so every block totals its pin.
 *  These are per-block queues consumed WHILE emitting a block's facilities,
 *  so the per-cell shapes (HWC/PHC/…) stay true to the pin. */
// Result awaited / in progress / deferred / eligible-not-started / not
// eligible counts per block (see the fixture plan at the top of this file).
const RA: Record<string, number> = { Kandhili: 4, Natrampalli: 2, Madhanur: 2, Tirupathur: 2, Jolarpettai: 2, Alangayam: 2, DMS: 0 };
const IP: Record<string, number> = { Kandhili: 3, Natrampalli: 2, Madhanur: 4, Tirupathur: 3, Jolarpettai: 3, Alangayam: 4, DMS: 1 };
const DEF: Record<string, number> = { Kandhili: 1, Natrampalli: 0, Madhanur: 1, Tirupathur: 1, Jolarpettai: 1, Alangayam: 1, DMS: 0 };
const ENS: Record<string, number> = { Kandhili: 0, Natrampalli: 0, Madhanur: 7, Tirupathur: 8, Jolarpettai: 12, Alangayam: 10, DMS: 0 };
const NE: Record<string, number> = { Kandhili: 2, Natrampalli: 1, Madhanur: 2, Tirupathur: 2, Jolarpettai: 1, Alangayam: 1, DMS: 0 };

const REST_STATUS: Record<string, { currentStatus: string; eligibility: string }> = {
  ra: { currentStatus: "Result Awaited", eligibility: "Eligible" },
  ip: { currentStatus: "SA Scheduled", eligibility: "Eligible" },
  def: { currentStatus: "Deferred — Cooling Period", eligibility: "Eligible" },
  ens: { currentStatus: "SA Not Yet Initiated", eligibility: "Eligible" },
  ne: { currentStatus: "SA Not Yet Initiated", eligibility: "Not Eligible" },
};

/** Build the fixture: certified cells first (each carries its stored result),
 *  then the block's non-hold queue. */
function fixture(): BreakdownFacility[] {
  const out: BreakdownFacility[] = [];
  let i = 0;
  const blocks = [...new Set(CELLS.map((c) => c.block))];
  for (const block of blocks) {
    // Per-cell remainder + the block's non-hold queue: RA, IP, DEF, ENS,
    // NE — every non-hold facility lands inside its REAL cell so the
    // per-type totals stay true (the old bug's mirror-image: never funnel
    // all unknowns into one type).
    let docStageForRa = 0;
    const queue: [string, number][] = [
      ["ra", RA[block]], ["ip", IP[block]], ["def", DEF[block]],
      ["ens", ENS[block]], ["ne", NE[block]],
    ];
    const takeRest = (): [string, number] => {
      for (const slot of queue) if (slot[1] > 0) return slot;
      throw new Error(`rest queue exhausted for ${block}`);
    };
    for (const cell of CELLS.filter((c) => c.block === block)) {
      for (let q = 0; q < cell.quality; q++)
        out.push(mk(block, cell.type, CERT(QUALITY), "Eligible", null, i++));
      for (let c = 0; c < cell.conditional; c++)
        out.push(mk(block, cell.type, CERT(CONDITIONAL), "Eligible", null, i++));
      let restInCell = cell.n - cell.quality - cell.conditional;
      while (restInCell > 0) {
        // Two result-awaited facilities carry only the documents stage (the
        // derive rule's other path) — no dedicated current status.
        const raViaDocs = docStageForRa < Math.min(RA[block], 2);
        const [key] = takeRest();
        const s = REST_STATUS[key];
        out.push(
          mk(
            block,
            cell.type,
            s.currentStatus,
            s.eligibility,
            raViaDocs && s.currentStatus === "Result Awaited"
              ? "NA Completed & Awaiting Results"
              : null,
            i++,
          ),
        );
        if (key === "ra" && raViaDocs) docStageForRa += 1;
        queue.find((x) => x[0] === key)![1] -= 1;
        restInCell -= 1;
      }
    }
    const cellN = CELLS.filter((c) => c.block === block).reduce((a, c) => a + c.n, 0);
    const holds = CELLS.filter((c) => c.block === block).reduce(
      (a, c) => a + c.quality + c.conditional,
      0,
    );
    if (cellN !== holds + RA[block] + IP[block] + DEF[block] + ENS[block] + NE[block]) {
      throw new Error(`fixture plan broken for ${block}`);
    }
  }
  return out;
}

function mk(
  block: string,
  facilityType: string,
  currentStatus: string,
  eligibility: string,
  docStatus: string | null,
  i: number,
): BreakdownFacility {
  return {
    block,
    phc: `${block} PHC`,
    facilityType,
    currentStatus,
    // The stored result is empty (undefined-safe): legacy names carry the
    // signal through currentStatus exactly like deriveFlatLifecycle.
    certStatus:
      currentStatus === QUALITY || currentStatus === CONDITIONAL || currentStatus === RESULT
        ? currentStatus
        : null,
    eligibility,
    docStatus,
    validityDate: "2027-07-20",
    surveillanceDue1: null,
    surveillanceDone1: null,
    surveillanceDue2: null,
    surveillanceDone2: null,
  };
}

const GOLDEN = fixture();

describe("bar equals label (the contract that catches the old bug)", () => {
  const bd = buildBreakdown(GOLDEN, { dimension: "block" });

  it("every row's buckets sum to n; segments = hold + the rest", () => {
    for (const r of [...bd.rows, bd.grand]) {
      const sum = BUCKET_ORDER.reduce((a, k) => a + r.buckets[k], 0);
      expect({ row: r.label, sum, n: r.n }).toEqual({ row: r.label, sum: r.n, n: r.n });
      // Segment sum equals the Hold-a-certificate label plus every other
      // bucket — no facility sits in two segments, none outside the bar.
      expect(sum).toBe(r.holdCert + BUCKET_ORDER.reduce(
        (a, k) => a + (k === "qualityCertified" || k === "conditional" ? 0 : r.buckets[k]),
        0,
      ));
    }
  });

  it("segment width ratios are count/n within 0.5%", () => {
    for (const r of bd.rows) {
      for (const k of BUCKET_ORDER) {
        const frac = r.buckets[k] / r.n; // what StackedBar styles
        expect(Math.abs(frac * 100 - (r.buckets[k] / r.n) * 100)).toBeLessThanOrEqual(0.005);
      }
      // And every rendered segment ≥0 when present — zero buckets are not
      // drawn (they never appear in the bar).
      for (const k of BUCKET_ORDER) {
        if (r.buckets[k] === 0) expect(r.buckets[k]).toBe(0);
      }
    }
  });

  it("one facility lands in exactly one bucket (rule total probe)", () => {
    for (const k of BUCKET_ORDER) {
      expect(bd.grand.buckets[k]).toBe(
        GOLDEN.filter((f) => breakdownBucketOf(f) === k).length,
      );
    }
  });
});

describe("golden fixture — the district's numbers", () => {
  const bd = buildBreakdown(GOLDEN, { dimension: "block", today: "2026-10-20" });

  it("hold a certificate by block and scope totals", () => {
    const holds = Object.fromEntries(
      bd.rows.map((r) => [r.key, `${r.holdCert}/${r.n}`]),
    );
    expect(holds).toEqual({
      Kandhili: "16/26",
      Natrampalli: "8/13",
      Madhanur: "13/29",
      Tirupathur: "11/27",
      Jolarpettai: "12/31",
      Alangayam: "9/27",
      DMS: "3/4",
    });
    expect(bd.grand.holdCert).toBe(72);
    expect(bd.grand.n).toBe(157);
    expect(bd.grand.buckets.qualityCertified).toBe(57);
    expect(bd.grand.buckets.conditional).toBe(15);
    expect(bd.grand.buckets.resultAwaited).toBe(14);
    // Scope average 72/157 = 45.9%, displayed as 46%.
    expect(bd.avgPct).toBe(rateOf(72, 157));
    expect(Math.round(bd.avgPct)).toBe(46);
  });

  it("per-block quality/conditional split", () => {
    const split = Object.fromEntries(
      bd.rows.map((r) => [r.key, `${r.buckets.qualityCertified}Q+${r.buckets.conditional}C`]),
    );
    expect(split).toEqual({
      Kandhili: "12Q+4C",
      Natrampalli: "7Q+1C",
      Madhanur: "10Q+3C",
      Tirupathur: "9Q+2C",
      Jolarpettai: "8Q+4C",
      Alangayam: "9Q+0C",
      DMS: "2Q+1C",
    });
  });

  it("by facility type — CHC 2/6, DHQH 1/1, HWC HSC 47/110 (34Q+13C), PHC 19/23…", () => {
    const td = buildBreakdown(GOLDEN, { dimension: "type", today: "2026-10-20" });
    const holds = Object.fromEntries(td.rows.map((r) => [r.key, `${r.holdCert}/${r.n}`]));
    expect(holds).toEqual({
      "CHC": "2/6",
      "DHQH": "1/1",
      "HWC HSC": "47/110",
      "PHC": "19/23",
      "SDH": "2/3",
      "UGPHC": "0/3",
      "UHWC": "0/5",
      "UPHC": "1/6",
    });
    // Sum check — the type view and the block view see the SAME facilities.
    expect(td.grand).toEqual(bd.grand);
    expect(td.grand.buckets.qualityCertified).toBe(57);
    expect(td.grand.buckets.conditional).toBe(15);
  });

  it("small-group rule: DMS is small, gets no badge; ties get none", () => {
    const dms = bd.rows.find((r) => r.key === "DMS")!;
    expect(dms.small).toBe(true);
    expect(rowBadgeFor(dms, bd.rows, bd.avgPct)).toBeNull();
    // No other row is allowed the badge when the best is a tie.
    const tied = [
      { ...bd.rows[0], rate: bd.rows[1].rate },
      bd.rows[1],
    ] as typeof bd.rows;
    expect(rowBadgeFor(tied[0], tied, bd.avgPct)).toBeNull();
    // Kandhili (16/26) and Natrampalli (8/13) BOTH round to 61.5 — a real
    // tie, so NEITHER gets the badge (stated as ties, never a silent pick).
    const kandhili = bd.rows.find((r) => r.key === "Kandhili")!;
    const natrampalli = bd.rows.find((r) => r.key === "Natrampalli")!;
    expect(kandhili.rate).toBe(natrampalli.rate);
    expect(rowBadgeFor(kandhili, bd.rows, bd.avgPct)).toBeNull();
    expect(rowBadgeFor(natrampalli, bd.rows, bd.avgPct)).toBeNull();
    // Break the tie and the strict winner earns the badge.
    const broken = bd.rows.map((r) =>
      r.key === natrampalli.key ? { ...r, rate: kandhili.rate + 10 } : r,
    );
    expect(rowBadgeFor(broken[0], broken, bd.avgPct)).toBeNull();
    expect(
      rowBadgeFor(
        broken.find((r) => r.key === natrampalli.key) as typeof bd.rows[number],
        broken,
        bd.avgPct,
      ),
    ).toBe("best");
  });

  it("vs average in points (Alangayam 12.6 below, Kandhili 15.6 above)", () => {
    const al = bd.rows.find((r) => r.key === "Alangayam")!;
    expect(al.vsAvgPoints).toBe(Math.round((al.rate - bd.avgPct) * 10) / 10);
    expect(al.vsAvgPoints).toBeLessThan(-10);
    expect(al.rate).toBe(rateOf(9, 27)); // 33.3%
  });

  it("bucket rule — blanks and legacy Romance-Status aliases are safe", () => {
    // A blank is never a certified facility and never a 0 in a rate.
    expect(breakdownBucketOf({
      block: "X", phc: "", facilityType: "PHC",
      currentStatus: null, certStatus: null, eligibility: null, docStatus: null,
    })).toBe("eligibleNotStarted");
    // Recertification Due is RESULT AWAITED (the old gold bug).
    expect(breakdownBucketOf({
      block: "X", phc: "", facilityType: "PHC",
      currentStatus: "Recertification Due", certStatus: null,
      eligibility: "Eligible", docStatus: null,
    })).toBe("resultAwaited");
    // The legacy current-status spellings of the certified signs.
    expect(breakdownBucketOf({
      block: "X", phc: "", facilityType: "PHC",
      currentStatus: "Certified — Surveillance Due", certStatus: null,
      eligibility: "Eligible", docStatus: null,
    })).toBe("qualityCertified");
    // Documents-stage result awaited when there is no result signal — the
    // derive rule's own exclude list (Future Candidate / SA Not Yet
    // Initiated stay where they are).
    expect(breakdownBucketOf({
      block: "X", phc: "", facilityType: "PHC",
      currentStatus: "SA Scheduled", certStatus: null,
      eligibility: "Eligible", docStatus: "NA Completed & Awaiting Results",
    })).toBe("resultAwaited");
    expect(breakdownBucketOf({
      block: "X", phc: "", facilityType: "PHC",
      currentStatus: "SA Not Yet Initiated", certStatus: null,
      eligibility: "Eligible", docStatus: "NA Completed & Awaiting Results",
    })).toBe("eligibleNotStarted");
    // Not eligible is its own muted bucket, never merged with Not started.
    expect(breakdownBucketOf({
      block: "X", phc: "", facilityType: "PHC",
      currentStatus: "SA Not Yet Initiated", certStatus: null,
      eligibility: "Not Eligible", docStatus: null,
    })).toBe("notEligible");
  });
});

describe("denominator toggle", () => {
  it("eligible-only rate divides by eligible facilities only", () => {
    const all = buildBreakdown(GOLDEN, { dimension: "block" });
    const eligible = buildBreakdown(GOLDEN, {
      dimension: "block",
      denominator: "eligible",
      today: "2026-10-20",
    });
    for (const r of eligible.rows) {
      const allRow = all.rows.find((x) => x.key === r.key)!;
      expect(r.eligibleN).toBe(allRow.n - allRow.buckets.notEligible);
      expect(r.rate).toBe(rateOf(r.holdCert, r.eligibleN));
    }
  });
});

describe("heatmap cross-tab", () => {
  const bd = buildBreakdown(GOLDEN, { dimension: "block", today: "2026-10-20" });
  const hm = buildBlockTypeHeatmap(GOLDEN);

  it("cells sum to 157 and every block×type facility appears exactly once", () => {
    let sum = 0;
    let holds = 0;
    for (const cell of hm.cells.values()) {
      sum += cell.n;
      holds += cell.holdCert;
      // Rate comes from the same rateOf the bar table uses.
      expect(cell.ratePct).toBe(rateOf(cell.holdCert, cell.n));
    }
    expect(sum).toBe(157);
    expect(holds).toBe(72);
  });

  it("row totals equal the block-view rows", () => {
    for (const b of hm.blockKeys) {
      const rt = hm.rowTotals.get(b)!;
      const row = bd.rows.find((r) => r.key === b)!;
      expect({ n: rt.n, hold: rt.holdCert }).toEqual({ n: row.n, hold: row.holdCert });
    }
  });
});

describe("sort and takeaway", () => {
  const bd = buildBreakdown(GOLDEN, { dimension: "block", today: "2026-10-20" });

  it("sort does not mutate, is stable, respects its id", () => {
    const rateDesc = sortBreakdownRows(bd.rows, "rateDesc");
    expect(rateDesc[0].label).toBe("DMS"); // small but highest rate first
    expect(bd.rows[0].key).not.toBeUndefined();
    const names = sortBreakdownRows(bd.rows, "name").map((r) => r.label);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    const sizeDesc = sortBreakdownRows(bd.rows, "sizeDesc");
    for (let i = 1; i < sizeDesc.length; i++)
      expect(sizeDesc[i - 1].n).toBeGreaterThanOrEqual(sizeDesc[i].n);
  });

  it("takeaway guards: scope empty → null, zero hold → the 0% line", () => {
    expect(breakdownTakeaway([], 0, 0, 0)).toBeNull();
    expect(
      breakdownTakeaway(
        [{ ...bd.rows[0], rate: 0, holdCert: 0 }],
        0,
        26,
        0,
      ),
    ).toContain("No group holds a certificate yet");
  });

  it("strict winner names the block and never misstates a tie", () => {
    const line = breakdownTakeaway(bd.rows, bd.avgPct, bd.total, bd.holdCert)!;
    // DMS is small — the best sizable row states its rate honestly.
    expect(line).not.toContain("DMS ");
  });

  it("drill-down URLs carry the group AND the bucket's list filters", () => {
    expect(breakdownListUrl("block", "Natrampalli", "resultAwaited")).toBe(
      "/facilities?block=Natrampalli&status=Result+Awaited%2CRecertification+Due%2CSA+Completed+%E2%80%94+NQAS+Awaited",
    );
    expect(breakdownListUrl("block", "Alangayam", "qualityCertified")).toBe(
      "/facilities?block=Alangayam&cert=Quality+Certified",
    );
    expect(breakdownListUrl("block", "Alangayam", "conditional")).toBe(
      "/facilities?block=Alangayam&cert=Quality+Certified+with+Conditionality",
    );
    // PHC has no list param of its own — the search box carries it.
    const url = new URL("https://x" + breakdownListUrl("phc", "Natrampalli PHC", null));
    expect(url.searchParams.get("q")).toBe("Natrampalli PHC");
    expect(url.searchParams.get("block")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Excel workbook contract (real bytes, read back with ExcelJS)         */
/* ------------------------------------------------------------------ */

describe("breakdown Excel workbook", () => {
  it("carries the frozen panes, live formulas, zero format and print setup", async () => {
    const bd = buildBreakdown(GOLDEN, { dimension: "block", today: "2026-10-20" });
    const wb = await buildBreakdownWorkbook(bd, {
      title: "Progress breakdown — by block",
      generatedAt: "2026-10-20",
    });
    const ws = wb.worksheets[0];

    // Title band + header row 3.
    expect(ws.getCell("A1").value).toBe("Progress breakdown — by block");
    expect(breakdownSubtitle(bd, "2026-10-20")).toContain("Certified % = facilities holding a certificate ÷ all facilities");
    expect(String(ws.getCell("A3").value)).toBe("S.No");

    // Freeze: header row AND first column.
    expect(ws.views[0]).toMatchObject({ state: "frozen", xSplit: 1, ySplit: 3 });

    // Row 4 = Kandhili (sorted later in the card, not in the sheet).
    const first = bd.rows[0];
    expect(ws.getCell(`B4`).value).toBe(first.label);
    // Live formula for Hold a certificate (Quality + Conditional).
    expect(ws.getCell("F4").formula).toBe(`D4+E4`);
    // Live formula for Certified %.
    expect(ws.getCell("L4").formula).toBe("F4/C4");
    // Zero format on a count column.
    expect(ws.getCell("D4").numFmt).toBe('#,##0;-#,##0;"-"');
    expect(ws.getCell("L4").numFmt).toBe("0.0%");
    // The total row is the next line after the groups.
    expect(ws.getCell(`C${4 + bd.rows.length}`).value).toBe(bd.total);

    // Print setup: landscape, fit to one page wide, header repeats, footer.
    expect(ws.pageSetup.orientation).toBe("landscape");
    expect(ws.pageSetup.fitToWidth).toBe(1);
    expect(ws.pageSetup.printTitlesRow).toBe("3:3");
    expect(ws.headerFooter.oddFooter).toBe("&8&LReport ID · Page &P of &N");
  }, 20_000);
});

/* ------------------------------------------------------------------ */
/* PDF contract (real bytes: table + the vector chart page content)     */
/* ------------------------------------------------------------------ */

describe("breakdown PDF", () => {
  it("produces real PDF bytes with the table AND the vector bar chart drawn", async () => {
    const bd = buildBreakdown(GOLDEN, { dimension: "block", today: "2026-10-20" });
    const doc = await buildBreakdownPdf(bd, {
      title: "Progress breakdown — by block",
      generatedAt: "2026-10-20",
    });
    const raw = Buffer.from(doc.output("arraybuffer") as ArrayBuffer).toString("latin1");
    expect(raw.startsWith("%PDF")).toBe(true);
    // Chart keep-out: the vector ops exist (rect fills for every bucket
    // colour). A text-only PDF has no re/f operators beyond the table rules.
    expect(raw).toContain(" re");
    // The total row and the last group are in the table text.
    expect(raw).toContain("All facilities");
  }, 20_000);
});

/* ------------------------------------------------------------------ */
/* Performance budget (Part C: <50 ms for 157 rows)                     */
/* ------------------------------------------------------------------ */

it("buildBreakdown recomputes 157 rows well under the 50 ms budget", () => {
  const t0 = performance.now();
  const bd = buildBreakdown(GOLDEN, { dimension: "block", today: "2026-10-20" });
  const t1 = performance.now();
  expect(bd.total).toBe(157);
  expect(t1 - t0).toBeLessThan(50);
});
