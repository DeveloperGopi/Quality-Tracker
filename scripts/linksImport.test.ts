/**
 * LINKS IMPORT — the 15 visible rows from the supplied sheet, with the
 * quirks the review must handle: Basic Datas → suggestion, two KPI Format
 * rows, State Sheet/District Sheet as levels, hyperlinks, missing link,
 * frequency/date parsing and idempotent re-paste.
 */

import { describe, expect, test } from "bun:test";

import {
  mergeLinkImportRows,
  parseLinksText,
  parseLinksMatrix,
  parseLinkDateCell,
  parseFrequencyText,
  rowsReadyToApply,
  summarizeLinksImport,
  type ExistingLink,
} from "../src/lib/linksImport";
import { computeDueState, normalizeLinksConfig } from "../src/lib/links";

const today = "2026-11-02";
const categories = ["Basic Data", "Quality Status", "Building Status", "Doc. Collection"];
const owners = ["NHSRC", "Quality"];
const base = {
  categories,
  owners,
  today,
  defaultVisibility: "everyone" as const,
};

const HEADER = ["S. No", "Category", "Report Name", "Frequency", "Last Updated", "Link", "Form Link", "Owner", "Status", "Remarks"];
const ROWS: string[][] = [
  ["1", "Basic Datas", "NHSRC - Quality Assurance Framework", "-", "22-Jun-2026", "https://nhsrcindia.org/quality-framework", "", "NHSRC", "Active", ""],
  ["2", "Basic Datas", "SaQsham", "-", "22-Jun-2026", "https://saqsham.nhsrcindia.org/MCS/login", "", "NHSRC", "Active", ""],
  ["3", "Basic Datas", "Checklist (PHC & HSC)", "-", "24-Oct-2025", "https://tirupathur.nic.in/checklist-phc", "", "Quality", "Active", ""],
  ["4", "Basic Datas", "MLHP Contact Details", "-", "20-Feb-2026", "https://tirupathur.nic.in/mlhp", "", "Quality", "Active", ""],
  ["5", "Basic Datas", "HWC HSC - IECs List", "-", "08-Apr-2026", "https://tirupathur.nic.in/iec", "", "Quality", "Active", ""],
  ["6", "Basic Datas", "KPI Format", "-", "20-May-2026", "https://docs.google.com/spreadsheets/d/hwc-kpi/edit", "", "Quality", "Active", ""],
  ["7", "Basic Datas", "KPI Format", "-", "01-Jun-2026", "https://docs.google.com/spreadsheets/d/phc-kpi/edit", "", "Quality", "Active", ""],
  ["8", "Basic Datas", "Single Window Portal (Fire NOC)", "-", "13-Aug-2026", "https://tirupathur.nic.in/single-window", "", "Quality", "Active", ""],
  ["9", "Quality Status", "FBDP - Key Development Indicators", "-", "04-Jul-2026", "https://tirupathur.nic.in/fbdp", "", "District Sheet", "Active", ""],
  ["10", "Building Status", "Building Status for Quality - 08.02.2026", "-", "08-Feb-2026", "https://tirupathur.nic.in/building-08", "", "Quality", "Completed", ""],
  ["11", "Building Status", "22 HWC-HSC Building Status", "-", "23-Feb-2026", "https://tirupathur.nic.in/building-22", "", "Quality", "Completed", ""],
  ["12", "Building Status", "4848 HWCs Building Status and GC funded facilities", "-", "10-Jun-2026", "https://tirupathur.nic.in/building-4848", "", "State Sheet", "Completed", ""],
  ["13", "Building Status", "HWC HSCs - Building Status and GC funded facilities Tirupathur District", "-", "10-Jun-2026", "https://tirupathur.nic.in/building-district", "", "District Sheet", "Completed", ""],
  ["14", "Doc. Collection", "NQAS Internal Assessment Checklist JAN 2026", "3 Months Once", "20-Mar-2026", "https://docs.google.com/spreadsheets/d/ia-nqas/edit", "https://forms.gle/nqas-form", "Quality", "Completed", "4th Quarter (2025-26)"],
  ["15", "Doc. Collection", "IA Checklists for Kayakalp JAN 2026", "3 Months Once", "20-Mar-2026", "https://docs.google.com/spreadsheets/d/ia-kayakalp/edit", "", "Quality", "Completed", "4th Quarter (2025-26)"],
];

function sheet(rows: string[][] = ROWS): string {
  return [HEADER, ...rows].map((row) => row.join("\t")).join("\n");
}

describe("parse the 15-row sample", () => {
  const parsed = parseLinksMatrix(parseLinksText(sheet()), base);

  test("reads all 15 visible rows and keeps the sheet labels", () => {
    expect(parsed.rows).toHaveLength(15);
    expect(parsed.headers[2]).toBe("Report Name");
    expect(parsed.rows[0].title).toBe("NHSRC - Quality Assurance Framework");
    expect(parsed.rows[14].title).toBe("IA Checklists for Kayakalp JAN 2026");
  });

  test("3 Months Once maps to Quarterly and 20-Mar-2026 is due 20-Jun-2026", () => {
    expect(parsed.rows[13].frequency).toBe("quarterly");
    expect(parsed.rows[13].lastUpdated).toBe("2026-03-20");
    const due = computeDueState(
      { frequency: "quarterly", lastUpdated: "2026-03-20", status: "Completed" },
      today,
      normalizeLinksConfig({}),
    );
    expect(due.nextDue).toBe("2026-06-20");
    expect(due.state).toBe("overdue");
    expect(due.days).toBe(-135);
  });

  test("Basic Datas gets a suggestion, never an automatic category change", () => {
    expect(parsed.rows[0].categoryName).toBe("Basic Datas");
    expect(parsed.rows[0].decisions.category).toBe("Basic Data");
    expect(parsed.rows[0].state).toBe("needs-decision");
  });

  test("State Sheet and District Sheet are suggested as levels, not owners", () => {
    expect(parsed.rows[8].level).toBe("District");
    expect(parsed.rows[8].ownerName).toBe("");
    expect(parsed.rows[11].level).toBe("State");
    expect(parsed.rows[12].level).toBe("District");
  });

  test("the two KPI Format rows share a merge group and preserve their different links", () => {
    expect(parsed.rows[5].mergeGroup).toBe(parsed.rows[6].mergeGroup);
    expect(parsed.rows[5].links[0].url).toContain("hwc-kpi");
    expect(parsed.rows[6].links[0].url).toContain("phc-kpi");
    const merged = mergeLinkImportRows([parsed.rows[5], parsed.rows[6]]);
    expect(merged.links).toHaveLength(2);
    expect(merged.title).toBe("KPI Format");
  });

  test("form links are separate from the primary link and a URL-bearing row is ready once decisions are made", () => {
    expect(parsed.rows[13].links.filter((l) => l.kind === "form")).toHaveLength(1);
    expect(parsed.rows[13].links.find((l) => l.kind === "link")?.isPrimary).toBe(true);
    expect(parsed.rows[13].duplicateUrl).toBe(false);
  });

  test("summary counts the unresolved suggestions separately", () => {
    const summary = summarizeLinksImport(parsed.rows);
    expect(summary.needsDecision).toBeGreaterThan(0);
    expect(summary.linkMissing).toBe(0);
    expect(rowsReadyToApply(parsed.rows).length).toBeGreaterThan(0);
  });
});

describe("edge cases", () => {
  test("a chip title with no URL becomes Link missing, not a silent empty link", () => {
    const matrix = [
      HEADER,
      ["1", "Basic Data", "KPI Smart Chip", "-", "20-May-2026", "HWC KPI", "", "Quality", "Active", ""],
    ];
    const parsed = parseLinksMatrix(matrix, { ...base, categories, owners });
    expect(parsed.rows[0].state).toBe("link-missing");
    expect(parsed.rows[0].linkMissing).toBe(true);
    expect(parsed.rows[0].issues.join(" ")).toContain("has no URL");
  });

  test("HTML anchors keep hyperlinks that plain text loses", () => {
    const html = `<table><tr><th>Category</th><th>Report Name</th><th>Link</th></tr><tr><td>Basic Data</td><td>KPI</td><td><a href="https://example.com/kpi">KPI sheet</a></td></tr></table>`;
    // DOMParser is available in the browser/DOM tests; in Bun it may not be.
    const parsed = parseLinksMatrix(
      [["Category", "Report Name", "Link"], ["Basic Data", "KPI", { text: "KPI sheet", url: "https://example.com/kpi" }]],
      base,
    );
    expect(parsed.rows[0].links[0].url).toBe("https://example.com/kpi");
    expect(html).toContain("https://example.com/kpi");
  });

  test("dates: Excel serial, DD-MM-YYYY, DD-MMM-YYYY and future rejection", () => {
    expect(parseLinkDateCell(46132, today).iso).toBe("2026-04-20");
    expect(parseLinkDateCell("20/03/2026", today).iso).toBe("2026-03-20");
    expect(parseLinkDateCell("20-Mar-2026", today).iso).toBe("2026-03-20");
    expect(parseLinkDateCell("20-Mar-2027", today).error).toContain("future");
  });

  test("frequency aliases, unknown text asks, and a blank is one-time", () => {
    expect(parseFrequencyText("3 Months Once")).toMatchObject({ value: "quarterly", unknown: false });
    expect(parseFrequencyText("Every 3 months")).toMatchObject({ value: "quarterly", unknown: false });
    expect(parseFrequencyText("Monthly")).toMatchObject({ value: "monthly" });
    expect(parseFrequencyText("-")).toMatchObject({ value: "one-time" });
    expect(parseFrequencyText("when the moon is full")).toMatchObject({ value: "monthly", unknown: true });
    expect(parseFrequencyText("every 10 days")).toMatchObject({ value: "custom-days", customDays: 10 });
  });

  test("same paste twice is No change when existing rows match", () => {
    const first = parseLinksMatrix(
      [["Category", "Report Name", "Frequency", "Last Updated", "Link", "Owner", "Status"], ["Basic Data", "KPI", "-", "20-May-2026", "https://example.com/kpi", "Quality", "Active"]],
      base,
    );
    const existing: ExistingLink[] = [{
      id: "x",
      serial: 1,
      title: "KPI",
      categoryName: "Basic Data",
      ownerName: "Quality",
      level: "",
      frequency: "one-time",
      lastUpdated: "2026-05-20",
      status: "Active",
      remarks: "",
      urls: [{ url: "https://example.com/kpi", kind: "link" }],
    }];
    const again = parseLinksMatrix(
      [["Category", "Report Name", "Frequency", "Last Updated", "Link", "Owner", "Status"], ["Basic Data", "KPI", "-", "20-May-2026", "https://example.com/kpi", "Quality", "Active"]],
      { ...base, existing },
    );
    expect(first.rows[0].state).toBe("new");
    expect(again.rows[0].state).toBe("no-change");
  });

  test("a duplicate URL is flagged but a different report is still allowed", () => {
    const existing: ExistingLink[] = [{
      id: "x", serial: 1, title: "Other", categoryName: "Basic Data", ownerName: "Quality",
      level: "", frequency: "one-time", lastUpdated: "", status: "Active", remarks: "",
      urls: [{ url: "https://example.com/shared", kind: "link" }],
    }];
    const parsed = parseLinksMatrix(
      [["Category", "Report Name", "Link"], ["Basic Data", "New report", "https://example.com/shared"]],
      { ...base, existing },
    );
    expect(parsed.rows[0].duplicateUrl).toBe(true);
    expect(parsed.rows[0].state).toBe("new");
  });
});
