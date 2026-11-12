/**
 * DRIVE DOCUMENTS — validation, naming, hashing, tokens.
 *
 * These are the rules that keep bad bytes and secrets out of the system:
 *   • the only name a stored file may have,
 *   • the real type (sniffed, never trusted from the browser),
 *   • executables, macro workbooks, double extensions and wrong types rejected,
 *   • SHA-256/MD5 that match a reference implementation over the same bytes,
 *   • encrypted refresh tokens and 5-minute signed read tokens.
 *
 * Run: bun test ./scripts/drive.validation.test.ts
 */
import { describe, expect, it } from "bun:test";
import { createHash, randomBytes } from "node:crypto";

import {
  allowedMimesFor,
  buildStoredName,
  checkUpload,
  hasDoubleExtension,
  maxBytesFor,
  sanitizePart,
  sniffMime,
} from "../src/convex/storage/validation";
import { Md5, Sha256, hashStream, readHead } from "../src/convex/storage/hashStream";
import {
  decryptSecret,
  encryptSecret,
  md5Hex,
  sha256Hex,
  signReadToken,
  verifyReadToken,
} from "../src/convex/storage/crypto";

const encoder = new TextEncoder();
const pdfHead = encoder.encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n");
const pdfBytes = encoder.encode(
  "%PDF-1.7\n" + "x".repeat(2000) + "\ntrailer\n<<>>\n%%EOF\n",
);

function zipWith(entries: string[]): Uint8Array {
  // Minimal ZIP-shaped buffer: the sniff only needs the PK header and the
  // central-directory file names.
  const head = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
  const body = encoder.encode(`${entries.join("\u0000")}\u0000`);
  const out = new Uint8Array(head.length + body.length);
  out.set(head);
  out.set(body, head.length);
  return out;
}

describe("stored file names", () => {
  it("follows {NIN}_{DocKey}_C{cycle}_{YYYYMMDD}_v{n}.{ext}", () => {
    expect(
      buildStoredName({
        nin: "2426248478",
        docKey: "NQAS_Result",
        cycleNo: 1,
        date: "2026-10-12",
        versionNo: 1,
        mime: "application/pdf",
        originalName: "My Result Scan.pdf",
      }),
    ).toBe("2426248478_NQAS_Result_C1_20261012_v1.pdf");
  });

  it("never uses the user's original name and sanitises every part", () => {
    const name = buildStoredName({
      nin: " 2426/248 478 ",
      docKey: "SA Report",
      cycleNo: 2,
      date: "2027-01-05",
      versionNo: 3,
      mime: "application/pdf",
      originalName: "../../etc/passwd.pdf",
    });
    expect(name.startsWith("2426248478_")).toBe(true);
    expect(name).not.toContain("passwd");
    expect(name).not.toContain("/");
    expect(name.endsWith("_C2_20270105_v3.pdf")).toBe(true);
  });

  it("falls back to NO-NIN and pdf when nothing usable is supplied", () => {
    expect(
      buildStoredName({ nin: null, docKey: "NOC", cycleNo: 0, date: "bad", versionNo: 0, mime: "" }),
    ).toBe("NO-NIN_NOC_C1_00000000_v1.pdf");
    expect(sanitizePart("  .  ")).toBe("NA");
  });

  it("limits are per type, capped at 25 MB", () => {
    expect(maxBytesFor("NQAS_Result")).toBe(25 * 1024 * 1024);
    expect(maxBytesFor("NOC")).toBe(10 * 1024 * 1024);
    expect(maxBytesFor("NOC", { perType: { NOC: 99 } })).toBe(25 * 1024 * 1024);
    expect(maxBytesFor("SA_Checklist")).toBe(25 * 1024 * 1024);
    expect(allowedMimesFor("SA_Checklist")).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });
});

describe("real file type (sniffed, never declared)", () => {
  it("accepts a PDF", () => {
    expect(sniffMime(pdfHead)).toEqual({ ok: true, mime: "application/pdf", kind: "pdf" });
  });

  it("accepts an xlsx workbook and a docx", () => {
    const xlsx = sniffMime(zipWith(["xl/workbook.xml", "xl/sharedStrings.xml"]), "a.xlsx");
    expect(xlsx.ok && xlsx.mime).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const docx = sniffMime(zipWith(["word/document.xml"]), "a.docx");
    expect(docx.ok && docx.mime).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  });

  it("rejects an .exe renamed to .pdf", () => {
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04]);
    const result = sniffMime(exe, "report.pdf");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("Executable");
  });

  it("rejects a macro workbook, a legacy OLE file, HTML and an archive", () => {
    expect(sniffMime(zipWith(["xl/workbook.xml", "xl/vbaProject.bin"]), "book.xlsm").ok).toBe(false);
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(sniffMime(ole, "old.doc").ok).toBe(false);
    expect(sniffMime(encoder.encode("<!doctype html><html></html>"), "x.pdf").ok).toBe(false);
    const rar = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00, 0x00]);
    expect(sniffMime(rar, "a.pdf").ok).toBe(false);
  });

  it("rejects a double extension before looking at the bytes", () => {
    expect(hasDoubleExtension("report.pdf.exe")).toBe(true);
    expect(hasDoubleExtension("scan.pdf")).toBe(false);
    expect(() =>
      checkUpload({
        docKey: "NQAS_Result",
        originalName: "scan.pdf.exe",
        declaredMime: "application/pdf",
        declaredSize: pdfBytes.length,
        head: pdfHead,
      }),
    ).toThrow(/Double extensions/);
  });

  it("rejects a wrong declared type, an oversized file and an empty file", () => {
    expect(() =>
      checkUpload({
        docKey: "NQAS_Result",
        originalName: "scan.xlsx",
        declaredMime: "application/pdf",
        declaredSize: 100,
        head: zipWith(["xl/workbook.xml"]),
      }),
    ).toThrow(/must be a PDF or an image/);
    expect(() =>
      checkUpload({
        docKey: "NOC",
        originalName: "noc.pdf",
        declaredMime: "application/pdf",
        declaredSize: 11 * 1024 * 1024,
        head: pdfHead,
      }),
    ).toThrow(/larger than 10 MB/);
    expect(() =>
      checkUpload({
        docKey: "NOC",
        originalName: "noc.pdf",
        declaredMime: "application/pdf",
        declaredSize: 0,
        head: pdfHead,
      }),
    ).toThrow(/empty/);
    expect(checkUpload({
      docKey: "NQAS_Result",
      originalName: "scan.pdf",
      declaredMime: "application/pdf",
      declaredSize: pdfBytes.length,
      head: pdfHead,
    })).toEqual({ mime: "application/pdf", extension: "pdf", size: pdfBytes.length });
  });
});

describe("hashing", () => {
  it("SHA-256 and MD5 match the reference implementation", async () => {
    for (const size of [0, 1, 55, 56, 63, 64, 65, 1000, 70_000]) {
      const bytes = new Uint8Array(randomBytes(size));
      expect(await sha256Hex(bytes)).toBe(createHash("sha256").update(bytes).digest("hex"));
      expect(md5Hex(bytes)).toBe(createHash("md5").update(bytes).digest("hex"));
    }
  });

  it("streams in constant memory and agrees with one-shot hashing", async () => {
    const bytes = new Uint8Array(randomBytes(300_000));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 4096) controller.enqueue(bytes.subarray(i, i + 4096));
        controller.close();
      },
    });
    const hashes = await hashStream(stream);
    expect(hashes.size).toBe(bytes.length);
    expect(hashes.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
    expect(hashes.md5).toBe(createHash("md5").update(bytes).digest("hex"));
  });

  it("the incremental classes accept arbitrary chunk boundaries", () => {
    const bytes = encoder.encode("The quick brown fox jumps over the lazy dog");
    const sha = new Sha256();
    const md5 = new Md5();
    for (let i = 0; i < bytes.length; i += 7) {
      sha.update(bytes.subarray(i, i + 7));
      md5.update(bytes.subarray(i, i + 7));
    }
    expect(sha.digestHex()).toBe(createHash("sha256").update(bytes).digest("hex"));
    expect(md5.digestHex()).toBe(createHash("md5").update(bytes).digest("hex"));
  });

  it("reads only the head bytes for the type sniff", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(pdfBytes.subarray(0, 100));
        controller.enqueue(pdfBytes.subarray(100));
        controller.close();
      },
    });
    const head = await readHead(stream, 64);
    expect(head.length).toBe(64);
    expect(new TextDecoder().decode(head).startsWith("%PDF-1.7")).toBe(true);
  });
});

describe("secrets and read tokens", () => {
  const key = "test-drive-token-key-32-bytes-long";

  it("encrypts the refresh token and never stores it in plain text", async () => {
    const refresh = "1//0gRefreshTokenValueThatMustNotLeak";
    const bundle = await encryptSecret(refresh, key);
    expect(bundle).not.toContain(refresh);
    expect(bundle.split(".").length).toBe(2);
    expect(await decryptSecret(bundle, key)).toBe(refresh);
  });

  it("fails closed with a wrong key or a tampered bundle", async () => {
    const bundle = await encryptSecret("secret", key);
    await expect(decryptSecret(bundle, "another-key")).rejects.toBeDefined();
    const [iv, data] = bundle.split(".");
    const tampered = `${iv}.${data.slice(0, -2)}AA`;
    await expect(decryptSecret(tampered, key)).rejects.toBeDefined();
    await expect(encryptSecret("x", undefined)).rejects.toThrow(/DRIVE_TOKEN_KEY/);
  });

  it("signs a 5-minute token bound to one user and one document", async () => {
    const now = Date.now();
    const token = await signReadToken({ d: "doc1", u: "user1", e: now + 300_000, m: "inline" }, key);
    const payload = await verifyReadToken(token, key, now);
    expect(payload).toEqual({ d: "doc1", u: "user1", e: now + 300_000, m: "inline" });
    expect(await verifyReadToken(token, key, now + 300_001)).toBeNull();
    expect(await verifyReadToken(`${token}x`, key, now)).toBeNull();
    expect(await verifyReadToken(token, "wrong-key", now)).toBeNull();
    expect(await verifyReadToken(token, undefined, now)).toBeNull();
  });

  it("no API-facing module returns a Drive link or a token", async () => {
    const files = [
      "../src/convex/documents.ts",
      "../src/components/profile/DocumentsCard.tsx",
      "../src/components/admin/GoogleDrivePanel.tsx",
      "../src/lib/driveSettings.ts",
    ];
    for (const file of files) {
      const text = await Bun.file(new URL(file, import.meta.url)).text();
      expect(text).not.toContain("webViewLink");
      expect(text).not.toContain("webContentLink");
      expect(text).not.toContain("drive.google.com");
      // The browser never receives the refresh token.
      expect(text).not.toContain("refresh_token");
    }
  });
});
