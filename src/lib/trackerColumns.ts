import {
  Award,
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  ClipboardPen,
  HeartPulse,
  HandCoins,
  IndianRupee,
  RefreshCcw,
  Target,
  Building2,
  Flame,
  type LucideIcon,
} from "lucide-react";
import { COLUMN_BY_KEY } from "@/lib/masterColumns";
import { navIcon } from "@/lib/sidebarConfig";

/** Icon lookup used by the category pills, page headers, quick-view cards and
 *  the sidebar. The three pages whose nav icon is user-facing here (State
 *  Assessment, NQAS Certification, Gap Closure Fund — plus Internal
 *  Assessment) resolve from `sidebarConfig`, so the nav, the rail, the page
 *  header and the quick links can never disagree. */
export const CATEGORY_ICONS = {
  Award,
  BadgeCheck: navIcon("/facilities/certification") ?? BadgeCheck,
  CalendarClock,
  ClipboardCheck: navIcon("/facilities/state-assessment") ?? ClipboardCheck,
  ClipboardPen: navIcon("/facilities/internal-assessment") ?? ClipboardPen,
  HandCoins: navIcon("/facilities/fund") ?? HandCoins,
  HeartPulse,
  IndianRupee,
  RefreshCcw,
  Target,
  Building2,
  Flame,
} satisfies Record<string, LucideIcon>;

export type CategoryIconName = keyof typeof CATEGORY_ICONS;

/** Tracker column registry for the Facility Master List.
 *
 *  The master sheet has 40+ columns; each one belongs to a work category
 *  (Certification, State Assessment, Recertification, Internal Assessment,
 *  NQAS assessment, Building, Fire NOC, Gap Closure). Columns are addressed
 *  by a stable `TrackerColumnId` so the all-in-one master list and the
 *  per-category pages render from a single source of truth:
 *
 *  - `CATEGORY_COLUMN_IDS` drives which columns (headers + cells) a page shows
 *  - `CATEGORY_META` drives the category pills and the sidebar "Facility Data"
 *    quick links (Quick response view)
 *  - admin header renames (tableHeaderOverrides) keep working because every
 *    category resolves its display labels from the same canonical labels. */

export type TrackerColumnId =
  // Unified pipeline status — the merged view of the four status columns
  | "pipelineStatus"
  // Certification (NQAS result)
  | "certStatus"
  | "certDate"
  | "certScore"
  | "resultDoc"
  | "naScheduled"
  | "naEnd"
  | "naMode"
  | "departments"
  // Gap Closure Fund
  | "gapAmount"
  | "gcYear"
  | "procLink"
  // Internal assessment
  | "nqasIaQ1"
  | "nqasIaQ2"
  | "nqasIaCmp"
  | "kayakalpIaQ1"
  | "kayakalpIaQ2"
  | "kayakalpIaCmp"
  // State assessment
  | "saStatus"
  | "saScore"
  | "saAssessor1"
  | "saAssessor1Hud"
  | "saAssessor2"
  | "saAssessor2Hud"
  | "saReport"
  | "saChecklist"
  | "saStart"
  | "saEnd"
  | "genDoc"
  // Recertification / surveillance
  | "survDue1"
  | "surv1"
  | "survDue2"
  | "surv2"
  | "survScore"
  | "validityDate"
  | "recertStatus"
  | "recertYear"
  // Building
  | "buildingType"
  | "buildingStatus"
  | "condemned"
  // Fire NOC
  | "nocAvailable"
  | "nocStatus"
  | "nocCertified"
  | "nocValidity"
  | "nocDoc"
  // Remarks (shown on every category page, like the master list)
  | "remarks";

/** Canonical column labels (renamable in Admin Settings → Table headers —
 *  these strings are the keys of the tableHeaderOverrides setting). */
export const TRACKER_COLUMN_LABELS: Record<TrackerColumnId, string> = {
  // Single source: the master-list config owns this label (renamed from
  // "Pipeline Status" to "Facility Current Status") — never re-typed here,
  // so the tracker pages, the master list and the exports cannot drift.
  pipelineStatus: COLUMN_BY_KEY.pipelineStatus.label,
  certStatus: "NQAS Certification Status",
  certDate: "GoI Letter Date / Certification date",
  certScore: "Certified Score %",
  resultDoc: "NQAS Result",
  naScheduled: "NQAS Assessment Start date",
  naEnd: "NQAS Assessment End date",
  naMode: "Mode of Assessment",
  departments: "Departments / Packages & Certification Criteria",
  gapAmount: "Gap Closure Amount",
  gcYear: "GC Fund recived Year",
  procLink: "Gap Closure Amount Proc. Link",
  nqasIaQ1: "NQAS IA % 2026-27 (Q1)",
  nqasIaQ2: "NQAS IA % 2026-27 (Q2)",
  nqasIaCmp: "NQAS IA Quarterly Comparison",
  kayakalpIaQ1: "Kayakalp IA % 2026-27 (Q1)",
  kayakalpIaQ2: "Kayakalp IA % 2026-27 (Q2)",
  kayakalpIaCmp: "Kayakalp IA Quarterly Comparison",
  saStatus: "State Assessment Status",
  saScore: "SA Score",
  saAssessor1: "Name of Assessor 1",
  saAssessor1Hud: "Assessors 1 HUD",
  saAssessor2: "Name of Assessor 2",
  saAssessor2Hud: "Assessors 2 HUD",
  saReport: "SA Report (PDF)",
  saChecklist: "SA Checklist (Excel)",
  saStart: "State Assessment Start date",
  saEnd: "State Assessment End date",
  genDoc: "SaQsham Documents Status",
  survDue1: "Surveillance Visit 1st Year Due Date",
  surv1: "1st Surveillance Assessment Done Date",
  survDue2: "Surveillance Visit 2nd Year Due Date",
  surv2: "2nd Surveillance Assessment Done Date",
  survScore: "2nd Surveillance Score %",
  validityDate: "NQAS Certificate Validity Date",
  recertStatus: "Recertification Status",
  recertYear: "Re-Certification Year",
  buildingType: "Building Type",
  buildingStatus: "Facility Building Status",
  condemned: "Condemned Document Link",
  nocAvailable: "NOC Available",
  nocStatus: "Fire NOC Validity Status",
  nocCertified: "NOC Issue Date",
  nocValidity: "Fire NOC Validity",
  nocDoc: "NOC Document Link",
  remarks: "Remarks",
};

export const TRACKER_COLUMN_WIDTHS: Record<TrackerColumnId, string> = {
  pipelineStatus: "min-w-48",
  certStatus: "min-w-40",
  certDate: "min-w-36",
  certScore: "w-24",
  resultDoc: "min-w-36",
  naScheduled: "min-w-36",
  naEnd: "min-w-36",
  naMode: "w-32",
  departments: "min-w-44",
  gapAmount: "w-32",
  gcYear: "w-28",
  procLink: "min-w-36",
  nqasIaQ1: "w-24",
  nqasIaQ2: "w-24",
  nqasIaCmp: "w-20",
  kayakalpIaQ1: "w-24",
  kayakalpIaQ2: "w-24",
  kayakalpIaCmp: "w-20",
  saStatus: "min-w-36",
  saScore: "w-24",
  saAssessor1: "min-w-36",
  saAssessor1Hud: "min-w-32",
  saAssessor2: "min-w-36",
  saAssessor2Hud: "min-w-32",
  saReport: "min-w-36",
  saChecklist: "min-w-36",
  saStart: "min-w-36",
  saEnd: "min-w-36",
  genDoc: "min-w-32",
  survDue1: "min-w-36",
  surv1: "min-w-36",
  survDue2: "min-w-36",
  surv2: "min-w-36",
  survScore: "w-24",
  validityDate: "min-w-36",
  recertStatus: "min-w-36",
  recertYear: "w-24",
  buildingType: "w-28",
  buildingStatus: "min-w-36",
  condemned: "min-w-36",
  nocAvailable: "w-28",
  nocStatus: "min-w-32",
  nocCertified: "min-w-36",
  nocValidity: "min-w-36",
  nocDoc: "min-w-36",
  remarks: "min-w-48",
};

/** The master-list column order (identity columns are rendered separately). */
export const MASTER_COLUMN_ORDER: TrackerColumnId[] = [
  "pipelineStatus",
  "certStatus",
  "certDate",
  "certScore",
  "resultDoc",
  "naScheduled",
  "naEnd",
  "naMode",
  "departments",
  "gapAmount",
  "gcYear",
  "procLink",
  "nqasIaQ1",
  "nqasIaQ2",
  "nqasIaCmp",
  "kayakalpIaQ1",
  "kayakalpIaQ2",
  "kayakalpIaCmp",
  "saStatus",
  "saScore",
  "saStart",
  "saEnd",
  "genDoc",
  "saAssessor1",
  "saAssessor1Hud",
  "saAssessor2",
  "saAssessor2Hud",
  "saReport",
  "saChecklist",
  "survDue1",
  "surv1",
  "survDue2",
  "surv2",
  "survScore",
  "validityDate",
  "recertStatus",
  "recertYear",
  "buildingType",
  "buildingStatus",
  "condemned",
  "nocAvailable",
  "nocStatus",
  "nocCertified",
  "nocValidity",
  "nocDoc",
  "remarks",
];

/** Master-list display order as **labels** — exactly the strings the Facility
 *  Master List renders, and therefore the keys of the `tableHeaderOverrides`
 *  setting. The master list and the Admin Settings header editor both read
 *  this one list, so a rename can never target a label the table does not
 *  show. (“Last Updated” is appended: it is a real column but not a tracker
 *  column, so it is not in the registry.) */
export const MASTER_TABLE_HEADER_LABELS: string[] = [
  ...MASTER_COLUMN_ORDER.map((id) => TRACKER_COLUMN_LABELS[id]),
  "Last Updated",
];

/** Which category owns a master-list header label (Remarks / Facility Current
 *  Status / Last Updated return null — not part of a single category page). */
export function headerLabelCategory(label: string): TrackerCategoryId | null {
  const id = MASTER_COLUMN_ORDER.find((x) => TRACKER_COLUMN_LABELS[x] === label);
  return id ? columnCategory(id) : null;
}

export type TrackerCategoryId =
  | "certification"
  | "sa"
  | "recert"
  | "ia"
  | "fund"
  | "building"
  | "noc";

export const CATEGORY_COLUMN_IDS: Record<TrackerCategoryId, TrackerColumnId[]> = {
  certification: [
    "pipelineStatus",
    "certStatus",
    "certDate",
    "certScore",
    "resultDoc",
    "naScheduled",
    "naEnd",
    "naMode",
    "departments",
  ],
  sa: [
    "genDoc",
    "saStatus", // State Assessment page keeps its SaQsham docs filter (FacilityDataPage)
    "saScore",
    "saStart",
    "saEnd",
    "saAssessor1",
    "saAssessor1Hud",
    "saAssessor2",
    "saAssessor2Hud",
    "saReport",
    "saChecklist",
  ],
  recert: [
    "survDue1",
    "surv1",
    "survDue2",
    "surv2",
    "survScore",
    "validityDate",
    "recertStatus",
    "recertYear",
  ],
  ia: ["nqasIaQ1", "nqasIaQ2", "nqasIaCmp", "kayakalpIaQ1", "kayakalpIaQ2", "kayakalpIaCmp"],
  fund: ["gapAmount", "gcYear", "procLink"],
  building: ["buildingType", "buildingStatus", "condemned", "remarks"],
  noc: ["nocAvailable", "nocStatus", "nocCertified", "nocValidity", "nocDoc"],
};

/** Category pills / sidebar quick links. `quick` categories surface as the
 *  "Quick response" links (State Assessment, Recertification, …). */
export const CATEGORY_META: Record<
  TrackerCategoryId,
  { label: string; icon: CategoryIconName; quick: boolean; route: string }
> = {
  sa: { label: "State Assessment", icon: "ClipboardCheck", quick: true, route: "/facilities/state-assessment" },
  certification: { label: "NQAS Certification", icon: "BadgeCheck", quick: true, route: "/facilities/certification" },
  recert: { label: "Recertification", icon: "RefreshCcw", quick: true, route: "/facilities/recertification" },
  ia: { label: "Internal Assessment", icon: "ClipboardPen", quick: true, route: "/facilities/internal-assessment" },
  fund: { label: "Gap Closure Fund", icon: "HandCoins", quick: true, route: "/facilities/fund" },
  building: { label: "Building", icon: "Building2", quick: true, route: "/facilities/building" },
  noc: { label: "Fire NOC", icon: "Flame", quick: true, route: "/facilities/fire-noc" },
};

export const QUICK_CATEGORY_IDS: TrackerCategoryId[] = (
  Object.keys(CATEGORY_META) as TrackerCategoryId[]
).filter((id) => CATEGORY_META[id].quick);

/** Resolve a category from a URL segment like "/facilities/state-assessment". */
export function categoryFromRoute(path: string): TrackerCategoryId | null {
  const hit = (
    Object.keys(CATEGORY_META) as TrackerCategoryId[]
  ).find((id) => CATEGORY_META[id].route === path);
  return hit ?? null;
}

/** Canonical href for a category page. */
export function getCategoryRoute(id: TrackerCategoryId): string {
  return CATEGORY_META[id].route;
}

/** Loose row shape for the quick-view "facilities with data" counters —
 *  structurally satisfied by ops.listFacilityRowsFast rows. */
export interface CategoryRowLike {
  facility: {
    nqasIaQ1?: number | null;
    nqasIaQ2?: number | null;
    kayakalpIaQ1?: number | null;
    kayakalpIaQ2?: number | null;
  };
  resultDocumentId?: string | null;
  nqas?: {
    certificationStatus?: string | null;
    certificationDate?: string | null;
    scorePercent?: number | null;
    scheduledStartDate?: string | null;
    actualEndDate?: string | null;
    scheduledEndDate?: string | null;
    mode?: string | null;
    departments?: string[] | null;
    surveillanceDue1?: string | null;
    surveillanceDone1?: string | null;
    surveillanceDue2?: string | null;
    surveillanceDone2?: string | null;
    manualScore?: number | null;
    validityDate?: string | null;
    recertStatus?: string | null;
    recertYear?: number | string | null;
  } | null;
  sa?: {
    status?: string | null;
    scorePercent?: number | null;
    actualStartDate?: string | null;
    scheduledDate?: string | null;
    actualEndDate?: string | null;
    generalDocStatus?: string | null;
    assessor1Name?: string | null;
    assessor2Name?: string | null;
    assessor1Hud?: string | null;
    assessor2Hud?: string | null;
    reportAttachmentId?: string | null;
    reportAttachmentName?: string | null;
    checklistAttachmentId?: string | null;
    checklistAttachmentName?: string | null;
  } | null;
  fund?: {
    amountSanctioned?: number | null;
    financialYear?: string | null;
    procLink?: string | null;
    fundAttachmentId?: string | null;
  } | null;
  building?: {
    buildingType?: string | null;
    buildingStatus?: string | null;
    condemnedLink?: string | null;
    condemnedAttachmentId?: string | null;
  } | null;
  noc?: {
    nocAvailable?: string | null;
    status?: string | null;
    issuedDate?: string | null;
    expiryDate?: string | null;
    nocLink?: string | null;
    nocAttachmentId?: string | null;
  } | null;
}

/** True when the facility holds any entry in the given category — drives the
 *  "N with data" quick-view counters. */
export const CATEGORY_HAS_DATA: Record<
  TrackerCategoryId,
  (r: CategoryRowLike) => boolean
> = {
  certification: (r) =>
    !!r.nqas?.certificationStatus ||
    !!r.nqas?.certificationDate ||
    r.nqas?.scorePercent != null ||
    !!r.resultDocumentId ||
    !!r.nqas?.scheduledStartDate ||
    !!r.nqas?.actualEndDate ||
    !!r.nqas?.scheduledEndDate ||
    !!r.nqas?.mode ||
    (!!r.nqas?.departments && r.nqas.departments.length > 0),
  sa: (r) =>
    !!r.sa &&
    ((!!r.sa.status && r.sa.status !== "Not Yet Initiated") ||
      r.sa.scorePercent != null ||
      !!r.sa.actualStartDate ||
      !!r.sa.scheduledDate ||
      !!r.sa.actualEndDate ||
      !!r.sa.generalDocStatus),
  recert: (r) =>
    !!r.nqas &&
    (!!r.nqas.surveillanceDue1 ||
      !!r.nqas.surveillanceDone1 ||
      !!r.nqas.surveillanceDue2 ||
      !!r.nqas.surveillanceDone2 ||
      r.nqas.manualScore != null ||
      !!r.nqas.validityDate ||
      !!r.nqas.recertStatus ||
      r.nqas.recertYear != null),
  ia: (r) =>
    r.facility.nqasIaQ1 != null ||
    r.facility.nqasIaQ2 != null ||
    r.facility.kayakalpIaQ1 != null ||
    r.facility.kayakalpIaQ2 != null,
  fund: (r) =>
    !!r.fund &&
    (r.fund.amountSanctioned != null ||
      !!r.fund.financialYear ||
      !!r.fund.procLink ||
      !!r.fund.fundAttachmentId),
  building: (r) =>
    !!r.building &&
    (!!r.building.buildingType ||
      !!r.building.buildingStatus ||
      !!r.building.condemnedLink ||
      !!r.building.condemnedAttachmentId),
  noc: (r) =>
    !!r.noc &&
    (!!r.noc.nocAvailable ||
      !!r.noc.status ||
      !!r.noc.issuedDate ||
      !!r.noc.expiryDate ||
      !!r.noc.nocLink ||
      !!r.noc.nocAttachmentId),
};

/** Count facilities holding any data in a category (for quick-view cards). */
export function countCategoryRows(
  rows: CategoryRowLike[],
  cat: TrackerCategoryId,
): number {
  const has = CATEGORY_HAS_DATA[cat];
  let n = 0;
  for (const r of rows) if (has(r)) n += 1;
  return n;
}

/** Counts for every category in one pass over the rows. */
export function countAllCategories(rows: CategoryRowLike[]): Record<
  TrackerCategoryId,
  number
> {
  const out = {} as Record<TrackerCategoryId, number>;
  for (const cat of Object.keys(CATEGORY_META) as TrackerCategoryId[]) {
    out[cat] = countCategoryRows(rows, cat);
  }
  return out;
}

/** Reverse lookup: which category owns a column (Remarks has no owner — it
 *  renders on every page). */
export function columnCategory(id: TrackerColumnId): TrackerCategoryId | null {
  for (const cat of Object.keys(CATEGORY_COLUMN_IDS) as TrackerCategoryId[]) {
    if (CATEGORY_COLUMN_IDS[cat].includes(id)) return cat;
  }
  return null;
}

/** Read a deep-link query from the URL hash (`#q=jolar`) without touching
 *  router state — used by category cards to jump straight into a search.
 *  Clears the hash so a manual refresh does not re-apply the old filter. */
export function consumeInitialQuery(): string | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hash;
  if (!h.startsWith("#q=")) return null;
  const q = decodeURIComponent(h.slice(3)).trim();
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return q || null;
}
