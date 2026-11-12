/** Human file names for documents. Pure — used at upload, download and ZIP. */

const TYPE_LABEL: Record<string, string> = {
  "HWC HSC": "HSC",
  "HWC-HSC": "HSC",
  HSC: "HSC",
  PHC: "PHC",
  UPHC: "UPHC",
  CHC: "CHC",
  UHWC: "UHWC",
  UGPHC: "UGPHC",
  SDH: "SDH",
  DHQH: "DHQH",
};

const DOC_LABEL: Record<string, (cycle: number) => string> = {
  NQAS_Result: (n) => `NQAS Cycle ${n} Result`,
  NQAS_Certificate: (n) => `NQAS Cycle ${n} Result`,
  SA_Report: (n) => `State Assessment Cycle ${n} Report`,
  SA_Checklist: (n) => `State Assessment Cycle ${n} Checklist`,
  Gap_Closure: (n) => `NQAS Cycle ${n} Gap Closure Proceeding`,
  Condemned: () => "Condemned Certificate",
  NOC: () => "Fire NOC",
};

export function facilityTypeLabel(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  return TYPE_LABEL[raw] ?? raw;
}

export function documentLabel(docKey: string, cycleNo: number): string {
  return DOC_LABEL[docKey]?.(cycleNo || 1) ?? String(docKey).replace(/_/g, " ");
}

export function extensionOf(name: string, mimeType?: string | null): string {
  const match = /\.([a-z0-9]{1,8})$/i.exec(name.trim());
  if (match) return `.${match[1].toLowerCase()}`;
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel")) return ".xlsx";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";
  return "";
}

/** `{Facility} {Type} – {Document label}.ext`, with PHC only for same-name
 *  facilities and a version suffix for previous versions. */
export function documentDisplayName(input: {
  facilityName: string;
  facilityType: string;
  phc?: string | null;
  duplicateNameAndType?: boolean;
  docKey: string;
  cycleNo: number;
  originalName: string;
  mimeType?: string | null;
  versionNo?: number;
  isCurrent?: boolean;
}): string {
  const clean = (value: string) =>
    value
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  const type = facilityTypeLabel(input.facilityType);
  let facility = clean(input.facilityName || "Facility");
  if (type && !new RegExp(`(^|\\s)${type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i").test(facility)) {
    facility = `${facility} ${type}`;
  }
  if (input.duplicateNameAndType && clean(input.phc ?? "")) {
    facility = `${facility} (${clean(input.phc ?? "")})`;
  }
  const label = documentLabel(input.docKey, input.cycleNo);
  const version =
    input.isCurrent === false && (input.versionNo ?? 1) > 0
      ? ` – v${input.versionNo ?? 1}`
      : "";
  const ext = extensionOf(input.originalName, input.mimeType);
  const max = 150 - ext.length;
  return `${clean(`${facility} – ${label}${version}`).slice(0, max)}${ext}`;
}

/** Header-safe ASCII fallback plus the UTF-8 form (en dash becomes "-"). */
export function contentDisposition(name: string, kind: "inline" | "attachment" = "attachment"): string {
  const fallback = name
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  return `${kind}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
