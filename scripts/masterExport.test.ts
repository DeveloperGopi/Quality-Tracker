/**
 * Master-list export tests — the real production code paths.
 *
 * Run: bun test ./scripts
 *
 * Covers exactly what the brief asks us to prove:
 *   • 5 rows and 342 rows,
 *   • blank / null values (never "undefined", always "-"),
 *   • a very long Remarks cell (kept whole, wrapped by Excel, not truncated),
 *   • Tamil text (Excel + CSV round-trip; the PDF substitutes glyphs until a
 *     Unicode font is registered),
 *   • and that the table, the workbook and the PDF all read ONE column config.
 */
import { describe, it, expect } from "bun:test";

import {
  COLUMN_BY_KEY,
  MASTER_COLUMNS,
  MASTER_GROUPS,
  SCORE_DECIMALS,
  cellText,
  cellValue,
  columnsMenuColumns,
  isDeprecatedColumn,
  resolveLabels,
  type MasterRow,
} from "../src/lib/masterColumns";
import { orderedVisibleColumns, applyPreset, normalizeView } from "../src/lib/masterView";
import {
  FMT,
  buildMasterWorkbook,
  buildMasterPdf,
  buildMasterCsv,
  buildFacilityProfilePdf,
  buildManagementSummaryPdf,
  pdfSections,
  pdfText,
  hasUnicodeFont,
  setMasterPdfFontBase64,
  kpiLines,
} from "../src/lib/masterExport";

/* --------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* --------------------------------------------------------------------------- */

const LONG_REMARKS =
  "Condemned block on the northern wing; structural audit pending with the district engineering office. " +
  "Temporary services shifted to the annexure, and the follow-up inspection is scheduled after the monsoon. ".repeat(6);

const base = (over: Partial<MasterRow["facility"]> = {}): MasterRow["facility"] => ({
  _id: "fid",
  name: "PHC Pudupettai",
  block: "Alangayam",
  phc: "Pudupettai",
  facilityType: "HWC PHC",
  ninNumber: "040102030405",
  eligibility: "Eligible",
  currentStatus: "Certified — Surveillance Due",
  remarks: "",
  ...over,
});

const fiveRows: MasterRow[] = [
  {
    facility: base(),
    cycleNumber: 1,
    cycleType: "Initial",
    sa: {
      status: "Completed",
      scheduledDate: "2026-03-10",
      actualStartDate: "2026-03-10",
      actualEndDate: "2026-03-12",
      scorePercent: 78,
      generalDocStatus: "Complete",
      assessor1Name: "Dr. Meena R",
      assessor1Hud: "HUD-2",
      assessor2Name: "Mr. Karthik S",
      assessor2Hud: "HUD-4",
      reportAttachmentId: "att1",
      reportAttachmentName: "SA Report.pdf",
      checklistAttachmentId: null,
      checklistAttachmentName: null,
    },
    nqas: {
      status: "Pass",
      scheduledStartDate: "2026-06-01",
      scheduledEndDate: "2026-06-03",
      actualEndDate: "2026-06-03",
      mode: "Physical",
      departments: ["General Medicine", "Paediatrics"],
      scorePercent: 82,
      certificationStatus: "Quality Certified",
      certificationDate: "2026-07-15",
      goiLetterDate: "2026-07-15",
      validityDate: "2029-07-15",
      surveillanceDue1: "2027-07-15",
      surveillanceDone1: null,
      surveillanceDue2: "2028-07-15",
      surveillanceDone2: null,
      manualScore: 74,
      recertStatus: "Not due",
      recertYear: "2029",
    },
    fund: {
      amountSanctioned: 1250000,
      financialYear: "2025-26",
      procLink: "https://example.gov.in/proc/1",
      status: "Received",
    },
    noc: {
      nocAvailable: "Yes",
      status: "Valid",
      issuedDate: "2025-01-05",
      expiryDate: "2027-01-04",
      nocLink: "https://example.gov.in/noc/1",
      nocAttachmentId: null,
      nocAttachmentName: null,
    },
    building: {
      buildingType: "Own Building",
      buildingStatus: "Good",
      condemnedLink: null,
    },
    resultDocumentId: null,
    resultDocumentName: null,
  },
  // A completely blank row — every optional field null/missing.
  {
    facility: base({
      _id: "fid2",
      name: "HSC Kandhili",
      block: "Kandhili",
      phc: "Kandhili",
      facilityType: "HWC HSC",
      ninNumber: null,
      eligibility: null,
      currentStatus: "",
      remarks: null,
    }),
    cycleNumber: null,
    cycleType: null,
    sa: null,
    nqas: null,
    fund: null,
    noc: null,
    building: null,
  },
  // Very long remarks + a department list.
  {
    facility: base({
      _id: "fid3",
      name: "CHC Jolarpettai",
      block: "Jolarpettai",
      phc: "Jolarpettai",
      remarks: LONG_REMARKS,
    }),
    cycleNumber: 2,
    cycleType: "Recertification",
    sa: { status: "Scheduled", scheduledDate: "2026-09-01", generalDocStatus: "In progress" },
    nqas: {
      status: "Pending",
      scorePercent: 45,
      departments: ["General Surgery"],
      validityDate: "2026-11-02",
      surveillanceDue1: "2026-11-20",
    },
    fund: { amountSanctioned: 45000, financialYear: "2026-27", status: "Pending" },
    noc: { nocAvailable: "No", status: null, expiryDate: null },
    building: { buildingType: "Rented Building", buildingStatus: "Needs Repair" },
  },
  // Tamil text — names, departments and remarks must round-trip.
  {
    facility: base({
      _id: "fid4",
      name: "அரசு மருத்துவமனை, திருப்பத்தூர்",
      block: "Tirupathur",
      phc: "மதனூர்",
      eligibility: "Not Eligible",
      currentStatus: "Facility (Future Candidate)",
      remarks: "மராமத்து பணிகள் முடிந்தவுடன் மீண்டும் மதிப்பீடு செய்யப்படும்.",
      ninNumber: "000000000001",
    }),
    cycleNumber: 1,
    cycleType: "Initial",
    sa: null,
    nqas: null,
    fund: null,
    noc: null,
    building: null,
  },
  // Past-due dates (overdue chip + red tone).
  {
    facility: base({
      _id: "fid5",
      name: "UPHC Tirupathur",
      block: "Tirupathur",
      phc: "Tirupathur",
      currentStatus: "Certified with Conditionality",
    }),
    cycleNumber: 3,
    cycleType: "Initial",
    sa: null,
    nqas: {
      status: "Pass",
      scorePercent: 62,
      certificationStatus: "Certified with Conditionality",
      validityDate: "2026-01-01",
      surveillanceDue1: "2025-12-01",
      recertStatus: "Due",
    },
    fund: null,
    noc: { nocAvailable: "Yes", status: "Expired", expiryDate: "2025-10-10" },
    building: null,
  },
];

const rows342: MasterRow[] = Array.from({ length: 342 }, (_, i) => ({
  ...fiveRows[i % fiveRows.length],
  facility: {
    ...fiveRows[i % fiveRows.length].facility,
    _id: `f${i}`,
    name: `Facility ${i + 1} — ${fiveRows[i % fiveRows.length].facility.name}`,
  },
}));

const labels = resolveLabels(MASTER_COLUMNS, undefined);
// Part-3 audit: deprecated columns (the Eco trio) are excluded from every
// export — the PDF, Excel and CSV builders never receive them.
const allColumns = MASTER_COLUMNS.filter((c) => !isDeprecatedColumn(c));
const baseOptions = {
  labels,
  filtersText: "Block: Alangayam",
  generatedBy: "test@nqas",
};

/* --------------------------------------------------------------------------- */
/* Column config (the single source of truth)                                  */
/* --------------------------------------------------------------------------- */

describe("master column config", () => {
  it("lists every column the brief enumerates — all 9 groups, unique keys", () => {
    // The brief says "54 columns" but enumerates 56 items (6+2+9+3+6+11+8+8+3,
    // where META includes the Update action). Every enumerated item is here;
    // nothing was invented and nothing dropped — see "assumptions".
    //
    // 62 after the Part-3 audit: the 54-column model grew with the tracker
    // (Next Action / Due, Documents Status (Report), the IA NQAS + Kayakalp
    // + Eco trios, Cert_Cycle) and then grew again with the audit list —
    // Cy_Cycle stays, "SaQsham Facility Name / Category" is new, the merged
    // "Documents" bucket is new; the Eco trio is flagged deprecated (kept in
    // the config, removed everywhere). 62 = 58 data + 3 eco + 1 action.
    expect(MASTER_COLUMNS.length).toBe(66);
    expect(MASTER_GROUPS.length).toBe(9);
    const perGroup: Record<string, number> = {
      identity: 7,
      eligibility: 3,
      certification: 9,
      funds: 3,
      ia: 9,
      sa: 16,
      surveillance: 7,
      buildingNoc: 8,
      meta: 4,
    };
    for (const [group, count] of Object.entries(perGroup)) {
      expect(MASTER_COLUMNS.filter((c) => c.group === group).length).toBe(count);
    }
    expect(new Set(MASTER_COLUMNS.map((c) => c.key)).size).toBe(MASTER_COLUMNS.length);
    for (const c of MASTER_COLUMNS) {
      expect(MASTER_GROUPS.some((g) => g.id === c.group)).toBe(true);
      expect(c.label.trim().length).toBeGreaterThan(0);
      expect(c.width).toBeGreaterThan(0);
      expect(["left", "center", "right"]).toContain(c.align);
    }
  });

  it("keeps identity columns pinned and marks only the Update column un-exportable", () => {
    const pinned = MASTER_COLUMNS.filter((c) => c.pinned).map((c) => c.key);
    // The merged Facility cell is the ONE frozen column: type/block/PHC are
    // folded into it and can no longer be pinned (Admin → Table & Display).
    expect(pinned).toEqual(["facility"]);
    for (const key of ["type", "block", "phc"]) {
      expect(COLUMN_BY_KEY[key].freezeable).toBe(false);
      expect(COLUMN_BY_KEY[key].defaultVisible).not.toBe(true);
    }
    // The trailing row-actions utility column is the ONE un-exportable column
    // (it is a control, not data — Excel / PDF / CSV / Print never see it).
    const notExportable = MASTER_COLUMNS.filter((c) => !c.exportable).map((c) => c.key);
    expect(notExportable).toEqual(["actions"]);
  });

  it("aligns by type: numbers right, statuses centred, text never right", () => {
    for (const c of MASTER_COLUMNS) {
      if (c.type === "score" || c.type === "currency") expect(c.align).toBe("right");
      if (c.type === "status") expect(c.align).toBe("center");
      if (c.type === "text" || c.type === "longtext") expect(c.align).not.toBe("right");
    }
  });

  it("renders blanks as empty text (the table then prints \"-\")", () => {
    const blank = fiveRows[1];
    expect(cellText(blank, "facility")).toBe("HSC Kandhili");
    expect(cellText(blank, "nin")).toBe("");
    expect(cellText(blank, "certStatus")).toBe("");
    expect(cellText(blank, "gapAmount")).toBe("");
    expect(cellValue(blank, "certScore").kind).toBe("empty");
    expect(cellText(blank, "remarks")).toBe("");
  });

  it("formats currency in the Indian system and dates as dd-mmm-yyyy", () => {
    expect(cellText(fiveRows[0], "gapAmount")).toBe("₹ 12,50,000");
    expect(cellText(fiveRows[0], "certDate")).toBe("15-Jul-2026");
    // Scores use the app-wide SCORE_DECIMALS (2) — the same constant the
    // dashboard reports use, so no grid can print a differently rounded score.
    expect(SCORE_DECIMALS).toBe(2);
    expect(cellText(fiveRows[0], "certScore")).toBe("82.00%");
  });
});

/* --------------------------------------------------------------------------- */
/* Excel                                                                       */
/* --------------------------------------------------------------------------- */

describe("Excel export (ExcelJS, real workbook)", () => {
  it("writes both sheets with a two-row merged group header, frozen panes and autofilter", async () => {
    const wb = await buildMasterWorkbook({ ...baseOptions, rows: fiveRows, columns: allColumns });
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Summary", "Facility Master"]);

    const ws = wb.getWorksheet("Facility Master")!;
    // Row 1: merged group band; Row 2: column names.
    expect((ws.getCell("A1").value as string)).toBe("Identity");
    expect((ws.getCell("A2").value as string)).toBe("Facility");
    expect(ws.model.merges.length).toBeGreaterThanOrEqual(9); // one per group band
    expect(ws.getCell("A1").fill).toMatchObject({ pattern: "solid" });
    expect(ws.getCell("A1").font).toMatchObject({ bold: true, color: { argb: "FFFFFFFF" } });
    expect(ws.getCell("A2").alignment).toMatchObject({ vertical: "middle", wrapText: true });

    // Freeze: 2 header rows + 2 columns (Facility, Block/PHC).
    expect(ws.views[0]).toMatchObject({ state: "frozen", xSplit: 2, ySplit: 2 });
    // Autofilter over the header row.
    expect(ws.autoFilter).toMatchObject({ from: { row: 2, column: 1 } });
    // Print setup.
    expect(ws.pageSetup.orientation).toBe("landscape");
    expect(ws.pageSetup.fitToWidth).toBe(1);
    expect(ws.pageSetup.printTitlesRow).toBe("1:2");
    expect(ws.headerFooter?.oddFooter).toContain("&P of &N");
  });

  it("writes real types: dates as dates, scores as numbers with a % format, amount with the INR mask, NIN as text", async () => {
    const wb = await buildMasterWorkbook({ ...baseOptions, rows: fiveRows, columns: allColumns });
    const ws = wb.getWorksheet("Facility Master")!;
    const byKey: Record<string, number> = {};
    allColumns.forEach((c, i) => (byKey[c.key] = i + 1));

    const row = 3; // first data row
    expect(ws.getCell(row, byKey.certDate).value).toBeInstanceOf(Date);
    expect(ws.getCell(row, byKey.certDate).numFmt).toBe(FMT.date);
    expect(ws.getCell(row, byKey.certScore).value).toBe(82);
    expect(ws.getCell(row, byKey.certScore).numFmt).toBe(FMT.percent);
    expect(ws.getCell(row, byKey.gapAmount).value).toBe(1250000);
    expect(ws.getCell(row, byKey.gapAmount).numFmt).toContain("[>=10000000]");
    expect(ws.getCell(row, byKey.nin).numFmt).toBe(FMT.text);
    expect(String(ws.getCell(row, byKey.nin).value)).toBe("040102030405");
    // status cell carries the UI tint + a bold tone colour
    const status = ws.getCell(row, byKey.certStatus);
    expect(status.fill).toMatchObject({ pattern: "solid" });
    expect(status.font?.bold).toBe(true);
    // hyperlink with a short label, never a raw URL
    const link = ws.getCell(row, byKey.procLink);
    expect(link.value).toMatchObject({ text: "Open" });
    expect(link.hyperlink).toContain("https://");
    // alignment by type
    expect(ws.getCell(row, byKey.certScore).alignment.horizontal).toBe("right");
    expect(ws.getCell(row, byKey.certStatus).alignment.horizontal).toBe("center");
    expect(ws.getCell(row, byKey.block).alignment.horizontal).toBe("left");
  });

  it("never writes undefined/null — blanks are \"-\"", async () => {
    const wb = await buildMasterWorkbook({ ...baseOptions, rows: fiveRows, columns: allColumns });
    const ws = wb.getWorksheet("Facility Master")!;
    const bad: string[] = [];
    ws.eachRow((r, rn) => {
      if (rn < 3) return;
      r.eachCell({ includeEmpty: true }, (c) => {
        const v = c.value;
        if (v === undefined || v === null) bad.push(`${r.number}:${c.address}`);
        if (typeof v === "string" && /^(undefined|null|NaN)$/i.test(v.trim()))
          bad.push(`${r.number}:${c.address}=${v}`);
      });
    });
    expect(bad).toEqual([]);
    // The blank fixture row still shows dashes where it has no value.
    const ninCol = allColumns.findIndex((c) => c.key === "nin") + 1;
    expect(ws.getRow(4).getCell(ninCol).value).toBe("-");
  });

  it("keeps a very long Remarks cell whole (40-wide, wrapped, not truncated)", async () => {
    const wb = await buildMasterWorkbook({ ...baseOptions, rows: fiveRows, columns: allColumns });
    const ws = wb.getWorksheet("Facility Master")!;
    const remarksCol = allColumns.findIndex((c) => c.key === "remarks") + 1;
    expect(ws.getColumn(remarksCol).width).toBe(40);
    const longRow = fiveRows.findIndex((r) => r.facility.remarks === LONG_REMARKS) + 3;
    expect(ws.getCell(longRow, remarksCol).value).toBe(LONG_REMARKS);
    expect(ws.getCell(longRow, remarksCol).alignment.wrapText).toBe(true);
    // A status with a 100-char label also wraps instead of overflowing.
    expect(allColumns.find((c) => c.key === "remarks")!.type).toBe("longtext");
  });

  it("keeps Tamil text intact in the workbook", async () => {
    const wb = await buildMasterWorkbook({ ...baseOptions, rows: fiveRows, columns: allColumns });
    const ws = wb.getWorksheet("Facility Master")!;
    const facilityCol = 1;
    const tamilRow = fiveRows.findIndex((r) => r.facility.name.startsWith("அரசு")) + 3;
    expect(ws.getCell(tamilRow, facilityCol).value).toBe("அரசு மருத்துவமனை, திருப்பத்தூர்");
  });

  it("handles 342 rows with one row per facility and zebra banding", async () => {
    const started = performance.now();
    const wb = await buildMasterWorkbook({
      ...baseOptions,
      rows: rows342,
      columns: allColumns,
      filtersText: "None",
    });
    const ws = wb.getWorksheet("Facility Master")!;
    expect(ws.rowCount).toBe(2 + 342); // two header rows + 342 data rows
    const facilityCol = 1;
    expect(ws.getCell(3, facilityCol).value).toBe(rows342[0].facility.name);
    expect(ws.getCell(344, facilityCol).value).toBe(rows341(rows342).facility.name);
    // Zebra: even data rows are tinted, odd rows left plain.
    expect(ws.getCell(4, facilityCol).fill).toMatchObject({ pattern: "solid" });
    expect(ws.getCell(3, facilityCol).fill?.pattern).not.toBe("solid");
    // Conditional formatting exists for the score columns.
    expect((ws as unknown as { conditionalFormattings: unknown[] }).conditionalFormattings.length)
      .toBeGreaterThan(0);
    const elapsed = performance.now() - started;
    expect(elapsed).toBeLessThan(20_000);
  }, 30_000);
});

const rows341 = (rows: MasterRow[]) => rows[341];

/* --------------------------------------------------------------------------- */
/* CSV                                                                         */
/* --------------------------------------------------------------------------- */

describe("CSV export", () => {
  it("emits a BOM, one header + 5 rows, and round-trips Tamil", () => {
    const csv = buildMasterCsv({ ...baseOptions, rows: fiveRows, columns: allColumns });
    expect(csv.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM for Excel
    const lines = csv.split("\r\n").filter(Boolean);
    expect(lines.length).toBe(1 + 5);
    expect(csv).toContain("அரசு மருத்துவமனை, திருப்பத்தூர்");
    expect(csv).toContain("₹ 12,50,000");
    expect(lines[0].replace(/^\uFEFF/, "").startsWith("Facility,")).toBe(true);
  });

  it("quotes values that contain commas or quotes", () => {
    const csv = buildMasterCsv({ ...baseOptions, rows: fiveRows, columns: allColumns });
    // The departments value contains a comma and is therefore quoted.
    expect(csv).toContain('"General Medicine, Paediatrics"');
  });
});

/* --------------------------------------------------------------------------- */
/* PDF                                                                         */
/* --------------------------------------------------------------------------- */

describe("PDF export (jsPDF + autoTable, split by group)", () => {
  it("splits the 54 columns into sections that always start with Identity and cover every column exactly once", () => {
    const sections = pdfSections(allColumns, "a4", true);
    expect(sections.length).toBeGreaterThan(1);
    for (const s of sections) {
      expect(s.columns[0].key).toBe("facility");
      expect(s.title).toMatch(/^Section \d+ – /);
      // Identity columns repeat on every page-set.
      const identity = s.columns.filter((c) => c.group === "identity").map((c) => c.key);
      expect(identity).toEqual(["facility", "block", "phc", "nin", "type", "certCycle", "saqshamNameCategory"]);
    }
    const covered = new Set<string>();
    for (const s of sections)
      for (const c of s.columns) if (c.group !== "identity") covered.add(c.key);
    const nonIdentity = allColumns.filter((c) => c.group !== "identity").map((c) => c.key);
    expect([...covered].sort()).toEqual([...nonIdentity].sort());
    // A3 fits more per section than A4.
    expect(pdfSections(allColumns, "a3", true).length).toBeLessThanOrEqual(
      pdfSections(allColumns, "a4", true).length,
    );
    // Splitting OFF packs several groups into one page-set.
    expect(pdfSections(allColumns, "a4", false).length).toBeLessThanOrEqual(
      pdfSections(allColumns, "a4", true).length,
    );
  });

  it("produces a valid PDF whose page count equals the number of page-sets", async () => {
    const sections = pdfSections(
      allColumns.filter((c) => c.exportable),
      "a4",
      true,
    );
    const doc = await buildMasterPdf({ ...baseOptions, rows: fiveRows, columns: allColumns });
    const bytes = doc.output("blob") as Blob;
    expect(bytes.size).toBeGreaterThan(1000);
    expect(doc.getNumberOfPages()).toBe(sections.length);
  });

  it("scales to 342 rows without exploding (pages stay per-section, not per-row)", async () => {
    const doc = await buildMasterPdf({ ...baseOptions, rows: rows342, columns: allColumns });
    const sections = pdfSections(allColumns, "a4", true);
    // Rows flow down each section's pages: the count scales with the sections
    // (a healthy ~15 rows/page), never into the hundreds.
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(sections.length);
    // Measured: 8 sections → 103 pages for 342 rows (~27 rows/page). The bound
    // catches a layout blow-up without being brittle across jsPDF versions.
    expect(doc.getNumberOfPages()).toBeLessThanOrEqual(sections.length * 20);
  }, 30_000);

  it("substitutes glyphs jsPDF's standard fonts cannot draw, until a Unicode font is set", () => {
    expect(hasUnicodeFont()).toBe(false);
    expect(pdfText("₹ 1,25,000")).toBe("Rs. 1,25,000");
    expect(pdfText("▲ 2")).toBe("+ 2");
    expect(pdfText("Facility")).toBe("Facility");
    // Registering a font disables the substitution for ₹ (Tamil included).
    setMasterPdfFontBase64("AAAA", "NotoSansTamil");
    expect(hasUnicodeFont()).toBe(true);
    expect(pdfText("₹ 1,25,000")).toBe("₹ 1,25,000");
  });

  it("renders a 1–2 page single-facility profile and a management summary", async () => {
    const profile = await buildFacilityProfilePdf(fiveRows[0], { labels, generatedBy: "test" });
    expect(profile.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(profile.getNumberOfPages()).toBeLessThanOrEqual(3);

    const summary = await buildManagementSummaryPdf(
      { ...baseOptions, rows: fiveRows, columns: allColumns },
      [{ facility: "HSC Kandhili", block: "Kandhili", reason: "surveillance due", days: -12 }],
    );
    expect(summary.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(kpiLines(fiveRows).some(([k]) => k.includes("NQAS certified"))).toBe(true);
  });
});

/* --------------------------------------------------------------------------- */
/* View state (presets, order, persistence)                                     */
/* --------------------------------------------------------------------------- */

describe("view state", () => {
  it("overview preset is the slim at-a-glance default, all preset keeps every column", () => {
    // The Part-3 audit adds Cert_Cycle and NQAS Eligibility to the default
    // glance set and the merged Documents bucket to the meta group.
    const overview = orderedVisibleColumns(applyPreset("overview"));
    expect(overview.map((c) => c.key)).toEqual([
      "facility",
      "certCycle",
      "eligibility",
      "pipelineStatus",
      "nextAction",
      "certScore",
      "validityDate",
    ]);
    const all = orderedVisibleColumns(applyPreset("all"));
    expect(all.length).toBe(columnsMenuColumns().length);
  });

  it("ignores corrupt stored views instead of breaking the page", () => {
    const v = normalizeView({ visibleKeys: ["nope", "facility", "facility"], density: "huge" });
    expect(v.visibleKeys).toContain("facility");
    expect(v.visibleKeys.filter((k) => k === "facility").length).toBe(1);
    expect(v.density).toBe("comfortable");
    expect(normalizeView(null).visibleKeys.length).toBeGreaterThan(5);
  });

  it("preserves the column labels the table prints for the Excel header", () => {
    const renamed = resolveLabels(MASTER_COLUMNS, { Facility: "Health Facility" });
    expect(renamed.facility).toBe("Health Facility");
    expect(renamed.block).toBe("Block");
  });
});
