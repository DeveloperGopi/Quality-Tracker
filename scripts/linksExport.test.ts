/**
 * LINKS EXCEL EXPORT — real hyperlinks, More links, and the round trip the
 * brief requires: the exported workbook re-imports as “No change”.
 */
import { describe, expect, test } from "bun:test";

import { normalizeLinksConfig } from "../src/lib/links";
import { buildLinksWorkbook, type LinksExportItem } from "../src/lib/linksExport";
import { parseLinksMatrix, type ExistingLink } from "../src/lib/linksImport";

const config = normalizeLinksConfig({});

const item: LinksExportItem = {
  id: "item-1",
  serial: 1,
  categoryName: "Basic Data",
  categoryColour: "teal",
  title: "NQAS Internal Assessment Checklist",
  description: null,
  frequency: "one-time",
  lastUpdated: "2026-03-20",
  nextDue: null,
  ownerName: "Quality",
  level: null,
  status: "Completed",
  remarks: "4th Quarter (2025-26)",
  visibility: "everyone",
  urls: [
    { label: "NQAS checklist", url: "https://example.org/nqas", type: "sheet", kind: "link", isPrimary: true },
    { label: "Upload sheet", url: "https://example.org/nqas-upload", type: "sheet", kind: "link", isPrimary: false },
    { label: "Form", url: "https://forms.gle/vtYRFPPT9VrNAZEn9", type: "form", kind: "form", isPrimary: false },
  ],
  due: { state: "overdue", days: -135 },
};

describe("Links Excel export", () => {
  test("primary and form cells are real hyperlinks; extra URLs live in More links", async () => {
    const wb = await buildLinksWorkbook([item], config, {
      fileName: "Tirupathur Links Organiser 02-11-2026",
      subtitle: "Data as of 02-Nov-2026",
    });
    const ws = wb.getWorksheet("Links Organiser");
    expect(ws).toBeTruthy();
    expect(ws!.autoFilter).toBeDefined();
    expect(ws!.views[0]?.state).toBe("frozen");

    const linkCell = ws!.getRow(2).getCell(6);
    const formCell = ws!.getRow(2).getCell(8);
    expect(linkCell.hyperlink).toBe("https://example.org/nqas");
    expect(formCell.hyperlink).toBe("https://forms.gle/vtYRFPPT9VrNAZEn9");
    expect(String(ws!.getRow(2).getCell(7).value)).toContain("https://example.org/nqas-upload");
    expect(String(ws!.getRow(2).getCell(5).value)).toBe("20-Mar-2026");
    expect(String(ws!.getRow(2).getCell(11).value)).toBe("Completed");
  });

  test("the exported workbook re-imports with zero changes", async () => {
    const wb = await buildLinksWorkbook([item], config, { fileName: "roundtrip" });
    const ws = wb.getWorksheet("Links Organiser");
    const matrix: (string | { text: string; url: string })[][] = [];
    for (let r = 1; r <= ws!.rowCount; r += 1) {
      const row: (string | { text: string; url: string })[] = [];
      for (let c = 1; c <= ws!.columnCount; c += 1) {
        const cell = ws!.getRow(r).getCell(c);
        const hyperlink = (cell as unknown as { hyperlink?: string }).hyperlink;
        if (hyperlink) row.push({ text: cell.text ?? "", url: hyperlink });
        else row.push(cell.text ?? "");
      }
      matrix.push(row);
    }

    const existing: ExistingLink[] = [
      {
        id: "item-1",
        serial: item.serial,
        title: item.title,
        categoryName: item.categoryName,
        ownerName: item.ownerName ?? "",
        level: item.level ?? "",
        frequency: item.frequency,
        lastUpdated: item.lastUpdated ?? "",
        status: item.status,
        remarks: item.remarks ?? "",
        urls: item.urls.map((u) => ({ url: u.url, kind: u.kind })),
      },
    ];
    const parsed = parseLinksMatrix(matrix, {
      categories: [item.categoryName],
      owners: ["Quality"],
      statuses: config.statuses,
      frequencies: config.frequencies,
      existing,
      today: "2026-11-02",
    });
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].state).toBe("no-change");
    expect(parsed.rows[0].links.map((link) => link.url).sort()).toEqual(
      item.urls.map((u) => u.url).sort(),
    );
    expect(parsed.rows[0].issues).toHaveLength(0);
  });
});
