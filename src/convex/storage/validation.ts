/**
 * DOCUMENT VALIDATION — names, limits, real types.
 *
 * Two jobs, both security-relevant:
 *   1. Build the ONLY name a stored file may have
 *      (`{NIN}_{DocKey}_C{cycle}_{YYYYMMDD}_v{n}.{ext}`). The user's original
 *      name never reaches Drive; it stays in the database purely for display
 *      and download.
 *   2. Decide whether the bytes may be stored at all. The declared MIME type
 *      is never trusted: the first bytes are sniffed, executables / macro
 *      workbooks / double extensions are rejected, and the stored MIME type is
 *      the sniffed one.
 *
 * Pure and dependency-free so the upload path, the migration job and the
 * tests share exactly one rule set.
 */

/** The SIX department documents — the ONLY keys a new document may use.
 *
 *  Part D: "NQAS Result" and "NQAS Certified Documents" are ONE document,
 *  "NQAS Certified Result", stored per certification cycle. The old
 *  `NQAS_Certificate` key stays in this list as a LEGACY key so existing rows
 *  (and the migration that moves them) remain readable — it is never offered
 *  as a separate upload row, never counted, and `canonicalDocKey` maps it to
 *  `NQAS_Result` everywhere else. */
export const DOC_TYPES = [
  {
    key: "NQAS_Result",
    label: "NQAS Result",
    short: "NQAS result",
    maxMb: 25,
    requiredForCertified: true,
    // Part 3 (b): the result is often a scan/photo — PDF and images.
    mimes: ["application/pdf", "image/png", "image/jpeg"],
  },
  {
    key: "SA_Report",
    label: "SA Report",
    short: "SA report",
    maxMb: 25,
    requiredForCertified: false,
    mimes: ["application/pdf"],
  },
  {
    key: "SA_Checklist",
    label: "SA Checklist",
    short: "SA checklist",
    maxMb: 25,
    requiredForCertified: false,
    // Part 3 (b): Excel in BOTH formats the districts send — .xlsx and the
    // legacy .xls (application/vnd.ms-excel).
    mimes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ],
  },
  {
    key: "Gap_Closure",
    label: "Gap Closure Proceeding",
    short: "Gap closure proceeding",
    maxMb: 10,
    requiredForCertified: false,
    mimes: ["application/pdf"],
  },
  {
    key: "Condemned",
    label: "Condemned Certificate",
    short: "Condemned certificate",
    maxMb: 10,
    requiredForCertified: false,
    mimes: ["application/pdf"],
  },
  {
    key: "NOC",
    label: "Fire NOC",
    short: "Fire NOC",
    maxMb: 10,
    requiredForCertified: false,
    // Part 3 (b): a NOC is frequently photographed.
    mimes: ["application/pdf", "image/png", "image/jpeg"],
  },  {
    key: "NQAS_Certificate",
    label: "NQAS Certified Documents (legacy)",
    short: "Certificate",
    maxMb: 10,
    requiredForCertified: false,
    mimes: ["application/pdf"],
    /** Old key, folded into NQAS_Result. Never shown or counted. */
    legacy: true,
  },
] as const;


export type DocKey = (typeof DOC_TYPES)[number]["key"];

export const DOC_KEYS: DocKey[] = DOC_TYPES.map((d) => d.key);

/** The six CURRENT documents (everything that is not a legacy key). */
export const ACTIVE_DOC_TYPES = DOC_TYPES.filter(
  (t) => !("legacy" in t && t.legacy),
);
export const ACTIVE_DOC_KEYS: DocKey[] = ACTIVE_DOC_TYPES.map((d) => d.key);

/** The old two-key split → the one document. */
export function canonicalDocKey(key: string): string {
  return key === "NQAS_Certificate" ? "NQAS_Result" : key;
}

/** The SIX documents behind the "n/6 uploaded" count: SA Report, SA
 *  Checklist, NQAS Certified Result, Gap Closure, Condemned, NOC. */
export const COUNTED_DOC_KEYS: DocKey[] = [
  "SA_Report",
  "SA_Checklist",
  "NQAS_Result",
  "Gap_Closure",
  "Condemned",
  "NOC",
];

export function isCountedDocKey(key: string): boolean {
  return (COUNTED_DOC_KEYS as string[]).includes(key);
}

export function docType(key: string) {
  return DOC_TYPES.find((d) => d.key === key) ?? null;
}

/** Department defaults (admin can lower/extend the per-type limits). */
export const DOCUMENT_LIMITS = {
  defaultMaxMb: 10,
  hardMaxMb: 25,
  minMb: 1,
} as const;

export type DocumentLimits = {
  defaultMaxMb: number;
  perType: Partial<Record<DocKey, number>>;
  allowedMimes: Partial<Record<DocKey, string[]>>;
};

export function maxBytesFor(key: DocKey, limits?: Partial<DocumentLimits>): number {
  const type = docType(key);
  const configured = limits?.perType?.[key];
  const mb = Math.min(
    DOCUMENT_LIMITS.hardMaxMb,
    Math.max(DOCUMENT_LIMITS.minMb, configured ?? type?.maxMb ?? limits?.defaultMaxMb ?? DOCUMENT_LIMITS.defaultMaxMb),
  );
  return mb * 1024 * 1024;
}

export function allowedMimesFor(key: DocKey, limits?: Partial<DocumentLimits>): string[] {
  return limits?.allowedMimes?.[key] ?? [...(docType(key)?.mimes ?? ["application/pdf"])];
}

/* ------------------------------------------------------------------ */
/* Names                                                              */
/* ------------------------------------------------------------------ */

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/** The `accept` string for a document type — ONE source for every file input. */
export function acceptFor(key: string): string {
  const mimes = allowedMimesFor(key as DocKey).map((m) => `.${EXT_BY_MIME[m] ?? "pdf"}`);
  return [...new Set(mimes)].join(",");
}

/** Plain-language "this is the wrong file type" text per document. */
export function wrongTypeMessage(key: string): string {
  const type = docType(key);
  const label = type?.label ?? "This document";
  const mimes = allowedMimesFor(key as DocKey);
  const exts = mimes.map((m) => `.${EXT_BY_MIME[m] ?? "pdf"}`);
  const hasImage = mimes.some((m) => m.startsWith("image/"));
  if (hasImage && mimes.includes("application/pdf")) return `${label} must be a PDF or an image (PNG/JPG)`;
  if (exts.includes(".xlsx") && exts.includes(".xls")) return `${label} must be an Excel file (.xlsx or .xls)`;
  return `${label} must be a ${(exts[0]?.replace(".", "") ?? "pdf").toUpperCase()} file`;
}

/** Drive-safe segment: no path separators, no control chars, no leading dot. */
export function sanitizePart(value: string, max = 60): string {
  const cleaned = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}#&() _-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/[. ]+$/g, "");
  return cleaned.slice(0, max).trim() || "NA";
}

export function extensionFor(mime: string, fallbackName = ""): string {
  const mapped = EXT_BY_MIME[mime];
  if (mapped) return mapped;
  const fromName = /\.([A-Za-z0-9]{1,5})$/.exec(fallbackName)?.[1]?.toLowerCase();
  if (fromName && ["pdf", "png", "jpg", "jpeg", "xlsx", "docx"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  return "pdf";
}

/** `2426248478_NQAS_Result_C1_20261012_v1.pdf` — the one naming rule. */
export function buildStoredName(input: {
  nin: string | null | undefined;
  docKey: string;
  cycleNo: number;
  /** ISO date (yyyy-mm-dd) of the upload. */
  date: string;
  versionNo: number;
  mime: string;
  originalName?: string;
}): string {
  const ninRaw = String(input.nin ?? "").replace(/\s+/g, "").trim();
  const nin = ninRaw ? sanitizePart(ninRaw, 24).replace(/ /g, "") : "NO-NIN";
  const cycle = Number.isFinite(input.cycleNo) && input.cycleNo > 0 ? Math.floor(input.cycleNo) : 1;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date.replace(/-/g, "") : "00000000";
  const version = Number.isFinite(input.versionNo) && input.versionNo > 0 ? Math.floor(input.versionNo) : 1;
  const ext = extensionFor(input.mime, input.originalName);
  return `${nin}_${sanitizePart(input.docKey, 32).replace(/ /g, "_")}_C${cycle}_${date}_v${version}.${ext}`;
}

/** `a.pdf.exe`, `report.pdf.zip` — the extension the browser will trust is the
 *  LAST one, so a name with two extensions never gets through. */
export function hasDoubleExtension(name: string): boolean {
  const parts = String(name ?? "").toLowerCase().split(".").filter(Boolean);
  if (parts.length < 3) return false;
  const dangerous = ["exe", "com", "bat", "cmd", "scr", "js", "jse", "vbs", "vbe", "ps1", "msi", "jar", "html", "htm", "svg"];
  return dangerous.includes(parts[parts.length - 1]);
}

/* ------------------------------------------------------------------ */
/* Sniffing                                                           */
/* ------------------------------------------------------------------ */

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.slice(start, start + length));

/** ZIP entry names found in a byte window — local headers AND the central
 *  directory at the end of the file. This is what tells a real workbook from
 *  a random ZIP: the parts' names, not a substring of the first 4 KB. */
export function zipEntryNames(bytes: Uint8Array): string[] {
  const names: string[] = [];
  if (bytes.length < 30) return names;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  for (let i = 0; i + 30 <= bytes.length; i += 1) {
    const signature = view.getUint32(i, true);
    let nameLength: number;
    let nameAt: number;
    if (signature === 0x04034b50) {
      // Local file header: name length at 26, name at 30.
      nameLength = view.getUint16(i + 26, true);
      nameAt = i + 30;
    } else if (signature === 0x02014b50) {
      // Central directory: name length at 28, name at 46.
      nameLength = view.getUint16(i + 28, true);
      nameAt = i + 46;
    } else {
      continue;
    }
    if (nameLength <= 0 || nameLength > 512 || nameAt + nameLength > bytes.length) continue;
    const name = decoder.decode(bytes.subarray(nameAt, nameAt + nameLength));
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

/** The OOXML parts that make a ZIP a spreadsheet (never a bare ZIP). */
const XLSX_PARTS = { types: "[content_types].xml", workbook: "xl/workbook.xml" };

function isXlsxParts(names: readonly string[]): boolean {
  const lower = names.map((n) => n.toLowerCase());
  return lower.includes(XLSX_PARTS.types) && lower.includes(XLSX_PARTS.workbook);
}

export type SniffResult =
  | { ok: true; mime: string; kind: "pdf" | "png" | "jpg" | "xlsx" | "xls" | "docx"; detail?: string }
  | { ok: false; reason: string };

/**
 * Identify the file from its own bytes. `head` should be at least the first
 * 4 KB (enough to see the ZIP central-directory names of an Office file).
 */
export function sniffMime(
  head: Uint8Array,
  declaredName = "",
  /** Entry names read from the END of the file (the ZIP central directory).
   *  A real workbook's `xl/workbook.xml` entry is often past the first 4 KB,
   *  so only the head is never enough to accept an .xlsx. */
  zipEntries: readonly string[] = [],
): SniffResult {
  const b = head;
  if (b.length < 8) return { ok: false, reason: "The file is empty or truncated" };

  // Executables first — nothing else may look like one.
  if (b[0] === 0x4d && b[1] === 0x5a) return { ok: false, reason: "Executable files cannot be uploaded" };
  if (b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46)
    return { ok: false, reason: "Executable files cannot be uploaded" };
  if (b[0] === 0x23 && b[1] === 0x21) return { ok: false, reason: "Script files cannot be uploaded" };
  // Legacy OLE2 Office (doc/xls/ppt). Part 3 (b): a real .xls is accepted for
  // the SA Checklist (the department's own template is still .xls); anything
  // else that is OLE2 (a .doc renamed .xls) is refused.
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0)
    return declaredName.toLowerCase().endsWith(".xls")
      ? { ok: true, mime: "application/vnd.ms-excel", kind: "xls" }
      : {
          ok: false,
          reason: "Legacy Office files are only accepted as an .xls checklist - save other files as PDF or .xlsx",
        };

  const headText = ascii(b, 0, Math.min(b.length, 512));
  if (/<html|<!doctype html/i.test(headText))
    return { ok: false, reason: "HTML files cannot be uploaded" };

  if (headText.startsWith("%PDF-")) return { ok: true, mime: "application/pdf", kind: "pdf" };
  if (b[0] === 0x89 && headText.slice(1, 4) === "PNG") return { ok: true, mime: "image/png", kind: "png" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ok: true, mime: "image/jpeg", kind: "jpg" };

  // ZIP container: xlsx / docx are ZIPs. Macros live in vbaProject.bin.
  if (b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) {
    const text = ascii(b, 0, b.length);
    // Names from BOTH windows: the head (early local headers) and the central
    // directory at the end (which lists every part, including a big workbook).
    const names = [...new Set([...zipEntries, ...zipEntryNames(b)])];
    const lower = names.map((n) => n.toLowerCase());
    const macro =
      lower.some((n) => n.endsWith("vbaproject.bin")) || /vbaProject\.bin/i.test(text);
    if (macro)
      return { ok: false, reason: "Workbooks with macros (.xlsm) are not accepted - save as .xlsx" };
    const isXlsx = isXlsxParts(names) || /xl\/workbook\.xml/.test(text);
    const isDocx = lower.includes("word/document.xml") || /word\/document\.xml/.test(text);
    if (!isXlsx && !isDocx)
      return { ok: false, reason: "Unsupported ZIP file - upload a PDF or an .xlsx workbook" };
    // Extension/content mismatch is caught by the caller's allowed-type check;
    // here the CONTENT decides, so a renamed workbook is never accepted as a
    // PDF and a PDF is never accepted as a workbook.
    if (isXlsx && !declaredName.toLowerCase().endsWith(".docx"))
      return {
        ok: true,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        kind: "xlsx",
      };
    return {
      ok: true,
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      kind: "docx",
    };
  }
  if (b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21)
    return { ok: false, reason: "Archive files cannot be uploaded" };
  if (b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf)
    return { ok: false, reason: "Archive files cannot be uploaded" };

  return { ok: false, reason: "Unrecognised file type - upload a PDF or an .xlsx workbook" };
}

export type UploadCheckInput = {
  docKey: string;
  originalName: string;
  declaredMime: string;
  declaredSize: number;
  /** First bytes of the file (≥ 4 KB when available). */
  head: Uint8Array;
  /** ZIP entry names from the file's tail (the central directory), so a real
   *  workbook is accepted even when `xl/workbook.xml` is past 4 KB. */
  zipEntries?: readonly string[];
  limits?: Partial<DocumentLimits>;
};

export type UploadCheck = {
  mime: string;
  extension: string;
  /** Size that must equal the stored object's size. */
  size: number;
};

/**
 * Validate one upload BEFORE anything is stored. Returns the sniffed type and
 * throws a plain-language reason otherwise (the caller turns it into a
 * FileStoreError and deletes anything already created).
 */
export function checkUpload(input: UploadCheckInput): UploadCheck {
  const type = docType(input.docKey);
  if (!type) throw new Error("Unknown document type");
  if (input.declaredSize <= 0) throw new Error("The file is empty");
  const max = maxBytesFor(input.docKey as DocKey, input.limits);
  if (input.declaredSize > max)
    throw new Error(`The file is larger than ${Math.round(max / (1024 * 1024))} MB`);

  const name = String(input.originalName ?? "").trim();
  if (!name) throw new Error("The file has no name");
  if (hasDoubleExtension(name)) throw new Error("Double extensions are not allowed");
  if (/\.(exe|com|bat|cmd|scr|js|vbs|ps1|msi|jar|html?|svg)$/i.test(name))
    throw new Error("Executable and script files cannot be uploaded");

  const sniff = sniffMime(input.head, name, input.zipEntries ?? []);
  if (!sniff.ok) throw new Error(sniff.reason);

  const allowed = allowedMimesFor(input.docKey as DocKey, input.limits);
  if (!allowed.includes(sniff.mime))
    // Name the allowed types as well as what the file really is.
    throw new Error(`${wrongTypeMessage(input.docKey)} (allowed: ${acceptFor(input.docKey)})`);

  return { mime: sniff.mime, extension: extensionFor(sniff.mime, name), size: input.declaredSize };
}
