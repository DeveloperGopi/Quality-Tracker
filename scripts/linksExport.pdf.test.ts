/**
 * LINKS PDF EXPORT — labels are drawn as text and every link becomes a real
 * /URI annotation (the URL is never printed in the cell body).
 */
import { describe, expect, test } from "bun:test";

import { normalizeLinksConfig } from "../src/lib/links";
import { buildLinksPdf, type LinksExportItem } from "../src/lib/linksExport";

const config = normalizeLinksConfig({});

const item: LinksExportItem = {
  id: "item-1",
  serial: 1,
  categoryName: "Doc. Collection",
  categoryColour: "violet",
  title: "IA Checklists for Kayakalp",
  description: null,
  frequency: "quarterly",
  lastUpdated: "2026-03-20",
  nextDue: "2026-06-20",
  ownerName: "Quality",
  level: null,
  status: "Completed",
  remarks: "4th Quarter (2025-26)",
  visibility: "everyone",
  urls: [
    { label: "Upload of IA Checklists", url: "https://example.org/ia-checklists", type: "sheet", kind: "link", isPrimary: true },
    { label: "Form", url: "https://forms.gle/vtyrfppt9vrnazen9", type: "form", kind: "form", isPrimary: false },
  ],
  due: { state: "overdue", days: -135 },
};

describe("Links PDF export", () => {
  test("draws clickable URI annotations instead of printing raw URLs", async () => {
    const doc = await buildLinksPdf([item], config, {
      fileName: "Tirupathur Links Organiser 02-11-2026",
      title: "Links Organiser",
      subtitle: "Data as of 02-Nov-2026",
    });
    const raw = Buffer.from(doc.output("arraybuffer") as ArrayBuffer).toString("latin1");
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
    expect(raw).toContain("/URI");
    // The URL appears once as the annotation target; the cell body prints the
    // label (“Upload of IA Checklists”), not the long address.
    expect(raw.split("https://example.org/ia-checklists").length - 1).toBe(1);
    expect(raw.split("https://forms.gle/vtyrfppt9vrnazen9").length - 1).toBe(1);
    // The embedded Noto face carries the Tamil-capable text; the URL itself
    // never appears as a drawn cell string (only as /URI annotations).
    expect(raw).toContain("/LinksNoto");
  });

  test("grouped rows fit one landscape page and keep the annotations", async () => {
    const doc = await buildLinksPdf([item, { ...item, id: "item-2", serial: 2, title: "NQAS Internal Assessment Checklist" }], config, {
      fileName: "x",
      subtitle: "Data as of 02-Nov-2026",
    });
    const raw = Buffer.from(doc.output("arraybuffer") as ArrayBuffer).toString("latin1");
    expect(doc.getNumberOfPages()).toBe(1);
    expect(raw).toContain("/URI");
    expect(raw).toContain("/Count 1");
    expect(raw).toContain("/LinksNoto");
  });
});
