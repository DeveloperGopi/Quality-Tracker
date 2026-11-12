/** Shared export mapper for the Facility Master List and the per-category
 *  Facility Data pages. Turns a `listFacilityRowsFast` TrackerRow into the
 *  flat cells that match the on-screen columns, so Excel/PDF downloads show
 *  exactly what the user sees (attachment cells export the file name). */
import { toDisplayDate } from "@/lib/format";
import { saqshamDocumentsStatusOf } from "@/lib/resultDeclared";
import { deriveFireNocStatus } from "@/lib/today";
import { withOverrides } from "@/lib/tableHeaders";
import {
  DEFAULT_SETTINGS,
  mergedPipelineStatus,
  type LifecycleSettings,
} from "@/convex/lifecycle";
import {
  MASTER_COLUMN_ORDER,
  TRACKER_COLUMN_LABELS,
  type TrackerColumnId,
} from "@/lib/trackerColumns";

/** Column ids exported by the master list, in on-screen order. */
export const MASTER_EXPORT_IDS = MASTER_COLUMN_ORDER;

/** Identity headers every facility export starts with — S.No serial number
 *  first, then NQAS Eligibility after the cycle (matching the on-screen
 *  identity columns on the master list and category pages). */
export const IDENTITY_HEADERS = [
  "S.No",
  "Facility",
  "Block",
  "PHC",
  "NIN",
  "Type",
  "Certification Cycle",
  "NQAS Eligibility",
];

/** Minimal structural shape (from ops.listFacilityRowsFast) needed to map
 *  cells — keeps the mapper usable without importing Convex types. */
type ExportRow = {
  facility: {
    name: string;
    block: string;
    phc: string;
    ninNumber?: string | null;
    facilityType: string;
    currentStatus: string;
    statusOverride?: string | null;
    nqasIaQ1?: number | null;
    nqasIaQ2?: number | null;
    kayakalpIaQ1?: number | null;
    kayakalpIaQ2?: number | null;
    eligibility?: string | null;
    remarks?: string | null;
    updatedAt?: number | null;
  };
  cycleNumber: number | null;
  cycleType: string | null;
  sa?: {
    status?: string;
    scheduledDate?: string | null;
    actualStartDate?: string | null;
    actualEndDate?: string | null;
    scorePercent?: number | null;
    generalDocStatus?: string | null;
    assessor1Name?: string | null;
    assessor1Hud?: string | null;
    assessor2Name?: string | null;
    assessor2Hud?: string | null;
    reportAttachmentName?: string | null;
    checklistAttachmentName?: string | null;
  } | null;
  resultDocumentName?: string | null;
  nqas?: {
    status?: string | null;
    certificationStatus?: string | null;
    certificationDate?: string | null;
    scorePercent?: number | null;
    scheduledStartDate?: string | null;
    scheduledEndDate?: string | null;
    actualEndDate?: string | null;
    mode?: string | null;
    departments?: string[] | null;
    surveillanceDue1?: string | null;
    surveillanceDone1?: string | null;
    surveillanceDue2?: string | null;
    surveillanceDone2?: string | null;
    manualScore?: number | null;
    validityDate?: string | null;
    recertStatus?: string | null;
    recertYear?: string | null;
  } | null;
  fund?: {
    amountSanctioned?: number | null;
    financialYear?: string | null;
    procLink?: string | null;
    fundAttachmentName?: string | null;
  } | null;
  noc?: {
    nocAvailable?: string | null;
    status?: string | null;
    issuedDate?: string | null;
    expiryDate?: string | null;
    nocLink?: string | null;
    nocAttachmentName?: string | null;
  } | null;
  building?: {
    buildingType?: string | null;
    buildingStatus?: string | null;
    lastUpdatedAt?: number | null;
    condemnedLink?: string | null;
    condemnedAttachmentName?: string | null;
  } | null;
};

const date = (iso: string | null | undefined) => (iso ? toDisplayDate(iso) : "");
const s = (v: string | number | null | undefined) =>
  v == null || v === "" ? "" : String(v);

/** Quarterly IA comparison text ("▲ 2.5" / "▼ 1" / "No Changes") — mirrors
 *  the on-screen ComparisonCell rendering. */
function comparison(q1: number | null, q2: number | null): string {
  if (q1 == null || q2 == null) return "";
  const delta = Math.round((q2 - q1) * 100) / 100;
  if (delta === 0) return "No Changes";
  return `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)}`;
}

/** Map one tracker column id to its flat export cell value. */
function cellFor(
  row: ExportRow,
  c: TrackerColumnId,
  settings: LifecycleSettings,
): string | number {
  const f = row.facility;
  switch (c) {
    case "pipelineStatus":
      return mergedPipelineStatus(
        { eligibility: f.eligibility ?? "", currentStatus: f.currentStatus },
        row.sa
          ? {
              status: row.sa.status ?? "Not Yet Initiated",
              generalDocStatus: row.sa.generalDocStatus ?? null,
            }
          : null,
        row.nqas
          ? {
              status: row.nqas.status ?? "Pending",
              scheduledStartDate: row.nqas.scheduledStartDate ?? null,
              certificationStatus: row.nqas.certificationStatus ?? null,
              validityDate: row.nqas.validityDate ?? null,
            }
          : null,
        settings,
      );
    case "certStatus":
      return s(row.nqas?.certificationStatus);
    case "certDate":
      return date(row.nqas?.certificationDate ?? null);
    case "certScore":
      return row.nqas?.scorePercent ?? "";
    case "resultDoc":
      return s(row.resultDocumentName);
    case "naScheduled":
      return date(row.nqas?.scheduledStartDate ?? null);
    case "naEnd":
      return date(row.nqas?.actualEndDate ?? row.nqas?.scheduledEndDate ?? null);
    case "naMode":
      return s(row.nqas?.mode);
    case "departments":
      return s((row.nqas?.departments ?? []).join(", "));
    case "gapAmount":
      return row.fund?.amountSanctioned ?? "";
    case "gcYear":
      return s(row.fund?.financialYear);
    case "procLink":
      return s(row.fund?.procLink ?? row.fund?.fundAttachmentName);
    case "nqasIaQ1":
      return f.nqasIaQ1 ?? "";
    case "nqasIaQ2":
      return f.nqasIaQ2 ?? "";
    case "nqasIaCmp":
      return comparison(f.nqasIaQ1 ?? null, f.nqasIaQ2 ?? null);
    case "kayakalpIaQ1":
      return f.kayakalpIaQ1 ?? "";
    case "kayakalpIaQ2":
      return f.kayakalpIaQ2 ?? "";
    case "kayakalpIaCmp":
      return comparison(f.kayakalpIaQ1 ?? null, f.kayakalpIaQ2 ?? null);
    case "saStatus":
      return s(row.sa?.status);
    case "saScore":
      return row.sa?.scorePercent ?? "";
    case "saStart":
      return date(row.sa?.actualStartDate ?? row.sa?.scheduledDate ?? null);
    case "saEnd":
      return date(row.sa?.actualEndDate ?? null);
    case "genDoc":
      return s(saqshamDocumentsStatusOf(row.sa?.generalDocStatus, row.nqas?.certificationStatus)) || "-";
    case "saAssessor1":
      return s(row.sa?.assessor1Name);
    case "saAssessor1Hud":
      return s(row.sa?.assessor1Hud);
    case "saAssessor2":
      return s(row.sa?.assessor2Name);
    case "saAssessor2Hud":
      return s(row.sa?.assessor2Hud);
    case "saReport":
      return s(row.sa?.reportAttachmentName);
    case "saChecklist":
      return s(row.sa?.checklistAttachmentName);
    case "survDue1":
      return date(row.nqas?.surveillanceDue1 ?? null);
    case "surv1":
      return date(row.nqas?.surveillanceDone1 ?? null);
    case "survDue2":
      return date(row.nqas?.surveillanceDue2 ?? null);
    case "surv2":
      return date(row.nqas?.surveillanceDone2 ?? null);
    case "survScore":
      return row.nqas?.manualScore ?? "";
    case "validityDate":
      return date(row.nqas?.validityDate ?? null);
    case "recertStatus":
      return s(row.nqas?.recertStatus);
    case "recertYear":
      return s(row.nqas?.recertYear);
    case "buildingType":
      return s(row.building?.buildingType);
    case "buildingStatus":
      return s(row.building?.buildingStatus);
    case "condemned":
      return s(row.building?.condemnedLink ?? row.building?.condemnedAttachmentName);
    case "nocAvailable":
      return s(row.noc?.nocAvailable);
    case "nocStatus":
      return deriveFireNocStatus(
        row.noc?.nocAvailable ?? null,
        row.noc?.expiryDate ?? null,
        row.noc?.status ?? null,
      );
    case "nocCertified":
      return date(row.noc?.issuedDate ?? null);
    case "nocValidity":
      return date(row.noc?.expiryDate ?? null);
    case "nocDoc":
      return s(row.noc?.nocLink ?? row.noc?.nocAttachmentName);
    case "remarks":
      return s(f.remarks);
    default:
      return "";
  }
}

/** Headers for a set of tracker column ids (identity block + overrides,
 *  so admin-renamed headers carry into the export). */
export function exportHeaders(
  ids: TrackerColumnId[],
  overrides?: Record<string, string>,
): string[] {
  return [
    ...IDENTITY_HEADERS,
    ...withOverrides(
      ids.map((c) => TRACKER_COLUMN_LABELS[c]),
      overrides,
    ),
  ];
}

/** Rows for a set of tracker column ids (identity block + cells).
 *  `settings` (admin-edited dropdown defaults) feeds the merged Pipeline
 *  Status derivation so exports match the on-screen column exactly. */
export function exportRows(
  rows: ExportRow[],
  ids: TrackerColumnId[],
  settings?: LifecycleSettings,
): (string | number)[][] {
  const s2 = settings ?? DEFAULT_SETTINGS;
  return rows.map((row, i) => [
    i + 1,
    row.facility.name,
    row.facility.block,
    row.facility.phc,
    s(row.facility.ninNumber),
    row.facility.facilityType,
    row.cycleNumber ? `#${row.cycleNumber}` : "",
    s(row.facility.eligibility),
    ...ids.map((c) => cellFor(row, c, s2)),
  ]);
}
