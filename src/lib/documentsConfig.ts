/**
 * DOCUMENTS — the ONE central config the upload UI reads.
 *
 * Part 3 root cause (a): "NQAS Result" was used for BOTH the status text
 * (`nationalAssessments.status`, master-list column `nqasResult`) and the file
 * (the `facilityDocuments` row with docKey `NQAS_Result`), so one field could
 * overwrite the other's meaning in the UI. They are now two explicit keys:
 *
 *   nqas_result_status → the dropdown / text status (never a file)
 *   nqas_result_file   → the stored document (never a status)
 *
 * The DB columns are unchanged (`nationalAssessments.status`,
 * `facilityDocuments.docKey`) — this file is the mapping between them.
 *
 * Accepted types and size limits come from convex/storage/validation (the same
 * rule the server enforces), so the browser and the server can never disagree.
 */

import {
  ACTIVE_DOC_TYPES,
  COUNTED_DOC_KEYS,
  acceptFor,
  allowedMimesFor,
  docType,
  maxBytesFor,
  wrongTypeMessage,
  type DocKey,
} from "../convex/storage/validation";

export type DocumentFieldConfig = {
  /** The `facilityDocuments.docKey`. */
  docKey: DocKey;
  /** The UI field name for the FILE (separate from any status field). */
  fileField: string;
  /** The status column this document belongs to, when it has one. */
  statusField: string | null;
  label: string;
  /** `accept` for every file input of this type. */
  accept: string;
  /** "PDF", "Excel (.xlsx or .xls)", "PDF or image" — shown under the dropzone. */
  typeHint: string;
  maxMb: number;
  requiredForCertified: boolean;
};

const STATUS_FIELD: Partial<Record<DocKey, string>> = {
  NQAS_Result: "nqas_result_status",
  NOC: "noc_status",
};

function typeHintFor(key: DocKey): string {
  const mimes = allowedMimesFor(key);
  const hasPdf = mimes.includes("application/pdf");
  const hasXlsx = mimes.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const hasXls = mimes.includes("application/vnd.ms-excel");
  const hasImage = mimes.some((m) => m.startsWith("image/"));
  if (hasXlsx && hasXls) return "Excel (.xlsx or .xls)";
  if (hasPdf && hasImage) return "PDF or image (PNG/JPG)";
  if (hasPdf) return "PDF";
  if (hasXlsx) return "Excel (.xlsx)";
  return "File";
}

export const DOCUMENT_FIELDS: DocumentFieldConfig[] = ACTIVE_DOC_TYPES.map((t) => ({
  docKey: t.key,
  fileField: t.key === "NQAS_Result" ? "nqas_result_file" : t.key,
  statusField: STATUS_FIELD[t.key] ?? null,
  label: t.label,
  accept: acceptFor(t.key),
  typeHint: typeHintFor(t.key),
  maxMb: Math.round(maxBytesFor(t.key) / (1024 * 1024)),
  requiredForCertified: t.requiredForCertified,
}));

export function documentFieldConfig(key: string): DocumentFieldConfig | null {
  return DOCUMENT_FIELDS.find((d) => d.docKey === key) ?? null;
}

/** The four documents Part 3 audits (the certificate/gap files reuse the same
 *  component and config). */
export const AUDITED_DOCUMENTS: DocKey[] = ["SA_Report", "SA_Checklist", "NQAS_Result", "NOC"];

/** The six documents the "n/6 uploaded" count, the required-missing chips and
 *  the Documents panel all read — one list, server and browser. */
export { COUNTED_DOC_KEYS };
export const DOCUMENT_TOTAL = COUNTED_DOC_KEYS.length;

/** Short label for the auto-classifier's chooser chips. */
export const DOCUMENT_SHORT_LABEL: Record<string, string> = {
  SA_Report: "SA Report",
  SA_Checklist: "SA Checklist",
  NQAS_Result: "NQAS Result",
  Gap_Closure: "Gap Closure Proceeding",
  Condemned: "Condemned Certificate",
  NOC: "Fire NOC",
};

/* -------------------------------------------------------------------------- */
/* Dropped-file classification                                                */
/* -------------------------------------------------------------------------- */

/** Keywords in a file name → the document it most likely is. Ordered: the
 *  checklist is decided by extension first (Excel is always the checklist),
 *  then the name hints decide between the PDF/image types. */
const NAME_HINTS: { key: DocKey; re: RegExp }[] = [
  { key: "SA_Checklist", re: /check[\s_-]*list|sa[\s_-]*check/i },
  { key: "SA_Report", re: /sa[\s_-]*report|state[\s_-]*(assessment|report)|\bsa\b.*report/i },
  { key: "NQAS_Result", re: /nqas[\s_-]*(certified[\s_-]*)?result|certificate|certified|result|national[\s_-]*assess/i },
  { key: "NOC", re: /\bnoc\b|fire|no[\s_-]*objection/i },
  { key: "Condemned", re: /condemn/i },
  { key: "Gap_Closure", re: /gap|closure|proceeding|procurement|\bproc\b|fund/i },
];

function extensionOf(name: string): string {
  return (/\.([A-Za-z0-9]{1,5})$/.exec(name)?.[1] ?? "").toLowerCase();
}

/** Which counted documents accept this file, by extension. */
export function candidateDocsFor(name: string): DocKey[] {
  const ext = extensionOf(name);
  if (!ext) return [];
  return DOCUMENT_FIELDS.filter((d) =>
    d.accept.split(",").some((a) => a.replace(/^\./, "").toLowerCase() === ext),
  ).map((d) => d.docKey);
}

export type DropClassification = {
  /** The type when the drop is unambiguous, else null (ask the user). */
  docKey: DocKey | null;
  /** Types that would accept this file — the chooser chips. */
  candidates: DocKey[];
};

/** Classify one dropped file: extension first (Excel ⇒ SA Checklist), then
 *  the name hints, then "ambiguous" with the accepting types as choices. */
export function classifyDroppedFile(file: { name: string }): DropClassification {
  const name = file.name ?? "";
  const candidates = candidateDocsFor(name);
  if (candidates.length === 0) return { docKey: null, candidates: [] };
  const ext = extensionOf(name);
  // An Excel workbook is the checklist, full stop (the only Excel type).
  const excelOnly = candidates.length === 1 ? candidates[0] : null;
  if (excelOnly === "SA_Checklist") return { docKey: "SA_Checklist", candidates };
  for (const hint of NAME_HINTS) {
    if (candidates.includes(hint.key) && hint.re.test(name)) {
      return { docKey: hint.key, candidates };
    }
  }
  if (candidates.length === 1) return { docKey: candidates[0], candidates };
  if (ext === "xlsx" || ext === "xls") {
    return { docKey: candidates.includes("SA_Checklist") ? "SA_Checklist" : null, candidates };
  }
  return { docKey: null, candidates };
}

/* -------------------------------------------------------------------------- */
/* Document self-test — one row per counted document type                      */
/* -------------------------------------------------------------------------- */

export type SelfTestTarget = {
  key: DocKey;
  label: string;
  /** The channel the row exercises: the FIRST type this document accepts. */
  mime: string;
  /** File extension for the throw-away sample (no dot). */
  ext: string;
};

/**
 * What Admin → Google Drive's "Run document self-test" walks through: exactly
 * the SIX counted documents — SA Report (PDF), SA Checklist (Excel), NQAS
 * Result, Gap Closure Proceeding, Condemned Certificate and Fire NOC.
 *
 * Derived from the central config, never hand-listed, so a document added
 * later is tested too and a row label can never disagree with the tile, the
 * badge or the "n of 6" count.
 */
export function documentSelfTestPlan(): SelfTestTarget[] {
  return COUNTED_DOC_KEYS.map((key) => {
    const field = documentFieldConfig(key);
    const mime = allowedMimesFor(key)[0] ?? "application/pdf";
    const ext = (field?.accept.split(",")[0] ?? ".pdf").replace(".", "").trim() || "pdf";
    return { key, label: field?.label ?? key, mime, ext };
  });
}

export type SelfTestOutcome = { ok: boolean; message: string };

/**
 * One row's verdict — pure, so the server, the panel and the tests share the
 * exact wording, and every failure names its cause instead of saying "failed".
 */
export function selfTestOutcome(input: {
  /** The MIME type the sample was declared as. */
  mime: string;
  /** How many bytes were written. */
  written: number;
  /** What Drive gave back — null means the file is not there any more. */
  readBack: { size?: string | number | null; mimeType?: string | null } | null;
}): SelfTestOutcome {
  const back = input.readBack;
  if (!back) {
    return {
      ok: false,
      message: "Uploaded, but it is not in Drive any more (could not be read back)",
    };
  }
  if (back.mimeType && input.mime && back.mimeType !== input.mime) {
    return {
      ok: false,
      message: `Uploaded, but Drive stored it as ${back.mimeType} instead of ${input.mime}`,
    };
  }
  const size = back.size == null || back.size === "" ? null : Number(back.size);
  if (size != null && Number.isFinite(size) && size !== input.written) {
    return {
      ok: false,
      message: `Uploaded, but only ${size} of ${input.written} bytes came back`,
    };
  }
  return { ok: true, message: "Uploaded, verified and removed" };
}

/** 14 MB / 10 MB — the exact wording the user sees. */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  }
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Client-side pre-check so a wrong file never starts an upload. The server
 *  repeats every one of these checks on the real bytes (never trust a browser).
 *
 *  `maxMb` is the RESOLVED limit for the facility (Admin → Documents can lower
 *  a type's limit); the box, the hint and this error then quote the same
 *  number the server enforces. Omitted = the type's configured limit. */
export function validateDocumentFile(
  key: string,
  file: { name: string; size: number },
  maxMb?: number,
): string | null {
  const type = docType(key);
  if (!type) return "Unknown document type";
  const exts = acceptFor(key)
    .split(",")
    .map((e) => e.replace(/^\./, "").toLowerCase())
    .filter(Boolean);
  const ext = /\.([A-Za-z0-9]{1,5})$/.exec(file.name)?.[1]?.toLowerCase() ?? "";
  if (!exts.includes(ext)) {
    // ONE wording, shared with the server (wrongTypeMessage).
    return wrongTypeMessage(key);
  }
  const max = maxMb != null ? maxMb * 1024 * 1024 : maxBytesFor(key as DocKey);
  if (file.size > max) {
    return `File is ${formatFileSize(file.size)}; limit is ${formatFileSize(max)}`;
  }
  if (file.size <= 0) return "The file is empty";
  return null;
}
