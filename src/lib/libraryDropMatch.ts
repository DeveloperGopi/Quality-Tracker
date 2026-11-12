/**
 * LIBRARY DROP MATCHING — the standard file name → (facility, document, cycle).
 *
 * The library accepts a folder of files dropped straight onto the page. Each
 * file is matched by the SAME naming rule the download uses
 * (`{Facility} {Type} – {Document label}.ext`, see storage/displayName) or by
 * the NIN in the name, so a file that was downloaded from this app and put
 * back matches without any manual mapping.
 *
 * Pure — no React, no Convex — so the preview and the tests read one rule.
 */

import { isFacilityDocument } from "./documentCycles";
import {
  candidateDocsFor,
  classifyDroppedFile,
  documentFieldConfig,
  validateDocumentFile,
} from "./documentsConfig";

export type DropFacility = {
  id: string;
  name: string;
  block: string;
  phc: string;
  facilityType: string;
  nin: string | null;
  cycleNo: number;
  /** Every cycle this facility has. Facility documents ignore the cycle. */
  cycles?: number[];
};

export type DropMatchStatus =
  | "matched"
  | "unmatched"
  | "wrong-type"
  | "duplicate"
  | "needs-decision";

export type DropMatch = {
  fileName: string;
  size: number;
  status: DropMatchStatus;
  /** Why it could not be used (null when matched). */
  reason: string | null;
  facilityId: string | null;
  facilityName: string | null;
  docKey: string | null;
  docLabel: string | null;
  cycleNo: number | null;
};

const norm = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const TYPE_SHORT: Record<string, string> = {
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

function withoutExtension(name: string): string {
  return name.replace(/\.[a-z0-9]{1,8}$/i, "");
}

/** "… – NQAS Cycle 2 Result" → the part after the dash, when there is one. */
function labelPart(name: string): string {
  const base = withoutExtension(name);
  const parts = base.split(/\s+[–—-]\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : base;
}

const DOC_HINTS: { key: string; re: RegExp }[] = [
  { key: "SA_Checklist", re: /check[\s_-]*list|\bsa\b.*check/i },
  { key: "SA_Report", re: /state[\s_-]*assessment.*report|\bsa\b.*report/i },
  {
    key: "NQAS_Result",
    re: /nqas.*(result|certif)|certified.*(result|document)|marksheet/i,
  },
  { key: "NOC", re: /\bnoc\b|fire[\s_-]*noc|no[\s_-]*objection/i },
  { key: "Condemned", re: /condemn/i },
  { key: "Gap_Closure", re: /gap[\s_-]*closure|proceeding|procurement/i },
];

/** The document type the label (or the whole name) points at, best hint first. */
export function docKeyFromText(text: string): string | null {
  for (const hint of DOC_HINTS) if (hint.re.test(text)) return hint.key;
  return null;
}

/** Cycle number from "Cycle 2", "Cycle-2" or the stored `_C2_` form. */
export function cycleFromText(text: string): number | null {
  const cycle = /\bcycle[\s_-]*(\d{1,2})\b/i.exec(text);
  if (cycle) return Number(cycle[1]);
  const stored = /_c(\d{1,2})_/i.exec(text);
  if (stored) return Number(stored[1]);
  return null;
}

type FacilityHit = { facility: DropFacility; length: number };

function facilityHits(fileName: string, facilities: DropFacility[]): FacilityHit[] {
  const whole = norm(withoutExtension(fileName));
  const [firstPart] = withoutExtension(fileName).split(/\s+[–—-]\s+/);
  const preDash = norm(firstPart);
  const hits = new Map<string, FacilityHit>();
  for (const facility of facilities) {
    const type = TYPE_SHORT[facility.facilityType] ?? facility.facilityType;
    const candidates = [
      norm(facility.name),
      norm(`${facility.name} ${type}`),
      norm(`${facility.name} ${type} ${facility.phc}`),
    ].filter(Boolean);
    for (const candidate of candidates) {
      const hay = preDash.includes(candidate) ? preDash : whole;
      if (!hay.includes(candidate)) continue;
      const hit = hits.get(facility.id);
      if (!hit || candidate.length > hit.length) {
        hits.set(facility.id, { facility, length: candidate.length });
      }
    }
  }
  const ninHits = facilities.filter((facility) => {
    const digits = (facility.nin ?? "").replace(/\D/g, "");
    return digits.length >= 4 && whole.replace(/\s/g, "").includes(digits);
  });
  for (const facility of ninHits) {
    if (!hits.has(facility.id)) hits.set(facility.id, { facility, length: 0 });
  }
  return Array.from(hits.values()).sort((a, b) => b.length - a.length);
}

/**
 * Match ONE dropped file. A file is usable only when both the facility and the
 * document type are certain and the type accepts the file — everything else is
 * listed in the preview and never uploaded.
 */
export function matchDroppedFile(
  file: { name: string; size: number },
  facilities: DropFacility[],
  existing: { facilityId: string; docKey: string; cycleNo: number | null }[] = [],
): DropMatch {
  const base: DropMatch = {
    fileName: file.name,
    size: file.size,
    status: "unmatched",
    reason: null,
    facilityId: null,
    facilityName: null,
    docKey: null,
    docLabel: null,
    cycleNo: null,
  };

  const hits = facilityHits(file.name, facilities);
  const best = hits[0] ?? null;
  const tied = best ? hits.filter((hit) => hit.length === best.length && hit.facility.id !== best.facility.id) : [];
  const facility = tied.length > 0 ? null : (best?.facility ?? null);

  // The label after the dash wins; a plain name falls back to the name hints.
  let docKey = docKeyFromText(labelPart(file.name));
  if (!docKey) docKey = docKeyFromText(withoutExtension(file.name));
  if (!docKey) {
    const classified = classifyDroppedFile(file);
    docKey = classified.docKey;
  }

  if (!facility) {
    return {
      ...base,
      reason:
        tied.length > 0
          ? "More than one facility has this name — add the block or PHC to the file name"
          : "No facility matches this name or NIN",
    };
  }
  const facilityDocument = docKey ? isFacilityDocument(docKey) : false;
  const cycle = facilityDocument
    ? null
    : (cycleFromText(file.name) ?? facility.cycleNo ?? 1);

  if (!docKey) {
    const candidates = candidateDocsFor(file.name);
    return {
      ...base,
      facilityId: facility.id,
      facilityName: facility.name,
      cycleNo: cycle,
      reason:
        candidates.length > 0
          ? "Add the document type to the file name (for example “– SA Report”)"
          : "The file type is not one of the six documents",
    };
  }

  if (cycle != null && facility.cycles && !facility.cycles.includes(cycle)) {
    const config = documentFieldConfig(docKey);
    return {
      ...base,
      status: "needs-decision",
      facilityId: facility.id,
      facilityName: facility.name,
      docKey,
      docLabel: config?.label ?? docKey,
      cycleNo: cycle,
      reason: `Cycle ${cycle} is not recorded for this facility — choose a cycle`,
    };
  }

  const config = documentFieldConfig(docKey);
  const invalid = validateDocumentFile(docKey, file);
  if (invalid) {
    return {
      ...base,
      status: "wrong-type",
      facilityId: facility.id,
      facilityName: facility.name,
      docKey,
      docLabel: config?.label ?? docKey,
      cycleNo: cycle,
      reason: invalid,
    };
  }

  const duplicate = existing.some(
    (row) =>
      row.facilityId === facility.id &&
      row.docKey === docKey &&
      (isFacilityDocument(docKey) ? true : row.cycleNo === cycle),
  );

  return {
    ...base,
    status: duplicate ? "duplicate" : "matched",
    facilityId: facility.id,
    facilityName: facility.name,
    docKey,
    docLabel: config?.label ?? docKey,
    cycleNo: cycle,
    reason: duplicate ? "A current file already exists — Replace or Cancel" : null,
  };
}

export function matchDroppedFiles(
  files: { name: string; size: number }[],
  facilities: DropFacility[],
  existing: { facilityId: string; docKey: string; cycleNo: number | null }[] = [],
): DropMatch[] {
  return files.map((file) => matchDroppedFile(file, facilities, existing));
}
