/**
 * PART 3 — the document config contract.
 *
 * Pins the accepted types and the messages the upload field shows, and checks
 * that the browser rule agrees with the server's (convex/storage/validation).
 */
import { describe, expect, test } from "bun:test";

import {
  COUNTED_DOC_KEYS,
  DOCUMENT_FIELDS,
  DOCUMENT_TOTAL,
  classifyDroppedFile,
  documentFieldConfig,
  validateDocumentFile,
} from "../src/lib/documentsConfig";
import { acceptFor, checkUpload, sniffMime } from "../src/convex/storage/validation";

const file = (name: string, size = 1024) => ({ name, size });

describe("documents config — types and messages", () => {
  test("SA Report is a PDF only", () => {
    expect(validateDocumentFile("SA_Report", file("report.pdf"))).toBeNull();
    expect(validateDocumentFile("SA_Report", file("report.xlsx"))).toBe(
      "SA Report must be a PDF file",
    );
    expect(documentFieldConfig("SA_Report")?.accept).toBe(".pdf");
  });

  test("SA Checklist accepts .xlsx AND .xls, and nothing else", () => {
    expect(validateDocumentFile("SA_Checklist", file("checklist.xlsx"))).toBeNull();
    expect(validateDocumentFile("SA_Checklist", file("checklist.xls"))).toBeNull();
    expect(validateDocumentFile("SA_Checklist", file("checklist.pdf"))).toBe(
      "SA Checklist must be an Excel file (.xlsx or .xls)",
    );
    expect(acceptFor("SA_Checklist")).toBe(".xlsx,.xls");
  });

  test("NQAS Result and NOC accept a PDF or an image", () => {
    for (const key of ["NQAS_Result", "NOC"]) {
      expect(validateDocumentFile(key, file("scan.pdf"))).toBeNull();
      expect(validateDocumentFile(key, file("scan.png"))).toBeNull();
      expect(validateDocumentFile(key, file("scan.jpg"))).toBeNull();
      expect(validateDocumentFile(key, file("scan.xlsx"))).toBe(
        `${documentFieldConfig(key)?.label} must be a PDF or an image (PNG/JPG)`,
      );
    }
  });

  test("an oversized file says exactly how big it is and what the limit is", () => {
    expect(validateDocumentFile("SA_Report", file("big.pdf", 26 * 1024 * 1024))).toBe(
      "File is 26 MB; limit is 25 MB",
    );
    expect(validateDocumentFile("NOC", file("big.png", 11 * 1024 * 1024))).toBe(
      "File is 11 MB; limit is 10 MB",
    );
    expect(validateDocumentFile("SA_Report", file("empty.pdf", 0))).toBe("The file is empty");
  });

  test("a spoofed executable is rejected by the server sniff, never stored", () => {
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 1, 2, 3, 4]);
    expect(sniffMime(exe, "scan.pdf").ok).toBe(false);
  });

  test("a real .xls is a legacy OLE file and is accepted for the checklist only", () => {
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
    expect(sniffMime(ole, "checklist.xls")).toMatchObject({
      ok: true,
      mime: "application/vnd.ms-excel",
    });
    expect(sniffMime(ole, "notes.doc").ok).toBe(false);
    const head = new Uint8Array(64).fill(0);
    const xlsHead = new Uint8Array([...ole, ...head]);
    expect(() =>
      checkUpload({
        docKey: "SA_Checklist",
        originalName: "checklist.xls",
        declaredMime: "application/vnd.ms-excel",
        declaredSize: 1024,
        head: xlsHead,
      }),
    ).not.toThrow();
    expect(() =>
      checkUpload({
        docKey: "SA_Report",
        originalName: "report.xls",
        declaredMime: "application/vnd.ms-excel",
        declaredSize: 1024,
        head: xlsHead,
      }),
    ).toThrow(/SA Report must be a PDF file/);
  });

  test("the count is over exactly the six department documents", () => {
    expect(DOCUMENT_TOTAL).toBe(6);
    expect([...COUNTED_DOC_KEYS].sort()).toEqual(
      ["Condemned", "Gap_Closure", "NOC", "NQAS_Result", "SA_Checklist", "SA_Report"].sort(),
    );
    // Part D: ONE "NQAS Result" — the legacy certificate key is folded into
    // it, so only the six current rows are ever shown.
    expect(DOCUMENT_FIELDS.map((d) => d.docKey)).not.toContain("NQAS_Certificate");
    expect(COUNTED_DOC_KEYS).not.toContain("NQAS_Certificate");
    // The six display labels (keys unchanged) — one wording everywhere.
    expect(DOCUMENT_FIELDS.map((d) => d.label).sort()).toEqual(
      [
        "Condemned Certificate",
        "Fire NOC",
        "Gap Closure Proceeding",
        "NQAS Result",
        "SA Checklist",
        "SA Report",
      ].sort(),
    );
  });

  test("a dropped file is classified by extension and name, and only truly ambiguous files ask", () => {
    // Excel is always the checklist (the only Excel document).
    expect(classifyDroppedFile({ name: "SA Checklist Q2.xlsx" }).docKey).toBe("SA_Checklist");
    expect(classifyDroppedFile({ name: "anything.xls" }).docKey).toBe("SA_Checklist");
    // Name hints for the PDF/image types.
    expect(classifyDroppedFile({ name: "SA_Report_March.pdf" }).docKey).toBe("SA_Report");
    expect(classifyDroppedFile({ name: "state assessment.pdf" }).docKey).toBe("SA_Report");
    expect(classifyDroppedFile({ name: "NQAS result 2026.pdf" }).docKey).toBe("NQAS_Result");
    expect(classifyDroppedFile({ name: "fire_noc.pdf" }).docKey).toBe("NOC");
    expect(classifyDroppedFile({ name: "condemned building.pdf" }).docKey).toBe("Condemned");
    expect(classifyDroppedFile({ name: "gap closure bills.pdf" }).docKey).toBe("Gap_Closure");
    // A bare scan could be several types — ask, with the valid choices only.
    const ambiguous = classifyDroppedFile({ name: "scan0001.pdf" });
    expect(ambiguous.docKey).toBeNull();
    expect(ambiguous.candidates).toContain("NQAS_Result");
    expect(ambiguous.candidates).toContain("SA_Report");
    expect(ambiguous.candidates).not.toContain("SA_Checklist");
    const photo = classifyDroppedFile({ name: "IMG_2026.png" });
    expect(photo.docKey).toBeNull();
    expect(photo.candidates).toEqual(["NQAS_Result", "NOC"]);
    // A file no document accepts carries no choices at all.
    expect(classifyDroppedFile({ name: "notes.txt" })).toEqual({ docKey: null, candidates: [] });
    expect(classifyDroppedFile({ name: "noext" }).candidates).toEqual([]);
  });

  test("every field has a distinct file key; NQAS status and file never collide", () => {
    const keys = DOCUMENT_FIELDS.map((d) => d.fileField);
    expect(new Set(keys).size).toBe(keys.length);
    const nqas = documentFieldConfig("NQAS_Result");
    expect(nqas?.fileField).toBe("nqas_result_file");
    expect(nqas?.statusField).toBe("nqas_result_status");
    expect(nqas?.fileField).not.toBe(nqas?.statusField);
  });
});
