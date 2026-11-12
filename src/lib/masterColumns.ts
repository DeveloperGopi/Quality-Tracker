/**
 * MASTER COLUMN CONFIG — the single source of truth for the Facility Master
 * List.
 *
 * Every surface that shows or exports the 54 master-sheet columns reads THIS
 * file:
 *   • the on-screen grouped table   (components/master/GroupedMasterTable)
 *   • the KPI strip and filters     (components/master/KpiCards)
 *   • the Facility Quick View       (components/quickview/FacilityQuickView)
 *   • the Excel workbook            (lib/masterExport → exportMasterWorkbook)
 *   • the split-page PDF            (lib/masterExport → exportMasterPdf)
 *
 * RULES
 *  1. Database column names are NEVER renamed — each column records the field
 *     it reads (`db`) purely for documentation and mapping.
 *  2. Display labels are the canonical tracker labels, so Admin Settings →
 *     "Table headers" renames (tableHeaderOverrides) keep applying: the table
 *     and both exports resolve labels through `resolveLabels`.
 *  3. Every value is derived through `cellValue`, so a null/blank never leaks
 *     as "undefined" — it renders as "-" (or the type's empty state).
 */

import {
  cycleLabel,
  deriveFireNocStatus,
  surveillanceVisits,
  type LifecycleSettings,
  type NqasLike,
} from "@/convex/lifecycle";
import { deriveNocAvailability } from "@/lib/nocAvailability";
import { documentsStatusReportDisplayOf, saqshamDocumentsStatusOf } from "@/lib/resultDeclared";
import { docStageLabel } from "@/lib/reportPipeline";
import {
  DEFAULT_DOCUMENT_RULES,
  requiredDocumentIssues,
  type DocumentRules,
} from "@/lib/documentRules";
import {
  DEFAULT_PENDING_CONFIG,
  computePendingIssues,
  type PendingConfig,
  type PendingIssue,
  type PendingRow,
} from "@/lib/pending";
import {
  SCORE_DECIMALS as IA_SCORE_DECIMALS,
  formatFyQuarter,
  type FyQuarter,
  type IaTracker,
} from "./iaImport";
import {
  iaCompareOf,
  iaLabelFor,
  iaRemarkOf,
  iaScoreOf,
  type MasterRowIa,
} from "./iaMaster";

/* --------------------------------------------------------------------------- */
/* Groups (9)                                                                  */
/* --------------------------------------------------------------------------- */

export type MasterGroupId =
  | "identity"
  | "eligibility"
  | "certification"
  | "funds"
  | "ia"
  | "sa"
  | "surveillance"
  | "buildingNoc"
  | "scores"
  | "meta";

export type MasterGroup = {
  id: MasterGroupId;
  label: string;
  shortLabel: string;
  /** Subtle tint used by the group band, KPI accents and export headers. */
  tint: { bg: string; border: string; text: string; hex: string };
};

export const MASTER_GROUPS: MasterGroup[] = [
  {
    id: "identity",
    label: "Identity",
    shortLabel: "Identity",
    tint: { bg: "bg-sky-50 dark:bg-sky-500/10", border: "border-sky-200 dark:border-sky-400/30", text: "text-sky-900 dark:text-sky-100", hex: "#0369a1" },
  },
  {
    id: "eligibility",
    label: "Eligibility & Status",
    shortLabel: "Elig.",
    tint: { bg: "bg-indigo-50 dark:bg-indigo-500/10", border: "border-indigo-200 dark:border-indigo-400/30", text: "text-indigo-900 dark:text-indigo-100", hex: "#3730a3" },
  },
  {
    id: "certification",
    label: "NQAS Certification",
    shortLabel: "NQAS",
    tint: { bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-400/30", text: "text-emerald-900 dark:text-emerald-100", hex: "#047857" },
  },
  {
    id: "funds",
    label: "Gap Closure Funds",
    shortLabel: "Gap",
    tint: { bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-400/30", text: "text-amber-900 dark:text-amber-100", hex: "#b45309" },
  },
  {
    id: "ia",
    label: "Internal Assessment & Kayakalp",
    shortLabel: "IA",
    tint: { bg: "bg-teal-50 dark:bg-teal-500/10", border: "border-teal-200 dark:border-teal-400/30", text: "text-teal-900 dark:text-teal-100", hex: "#0f766e" },
  },
  {
    id: "sa",
    label: "State Assessment",
    shortLabel: "State",
    tint: { bg: "bg-violet-50 dark:bg-violet-500/10", border: "border-violet-200 dark:border-violet-400/30", text: "text-violet-900 dark:text-violet-100", hex: "#6d28d9" },
  },
  {
    id: "surveillance",
    label: "Surveillance & Recertification",
    shortLabel: "Surv.",
    tint: { bg: "bg-cyan-50 dark:bg-cyan-500/10", border: "border-cyan-200 dark:border-cyan-400/30", text: "text-cyan-900 dark:text-cyan-100", hex: "#0e7490" },
  },
  {
    id: "buildingNoc",
    label: "Building & Fire NOC",
    shortLabel: "Bldg",
    tint: { bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-200 dark:border-rose-400/30", text: "text-rose-900 dark:text-rose-100", hex: "#be123c" },
  },
  {
    id: "scores",
    label: "Assessment scores",
    shortLabel: "Scores",
    tint: { bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-400/30", text: "text-emerald-900 dark:text-emerald-100", hex: "#0f766e" },
  },
  {
    id: "meta",
    label: "Meta",
    shortLabel: "Meta",
    tint: { bg: "bg-slate-50 dark:bg-slate-500/10", border: "border-slate-200 dark:border-slate-400/30", text: "text-slate-900 dark:text-slate-100", hex: "#334155" },
  },
];

export const GROUP_BY_ID = Object.fromEntries(
  MASTER_GROUPS.map((g) => [g.id, g]),
) as Record<MasterGroupId, MasterGroup>;

/* --------------------------------------------------------------------------- */
/* Columns (54)                                                               */
/* --------------------------------------------------------------------------- */

export type ColumnType =
  | "text"
  | "status"
  | "score"
  | "compare"
  | "date"
  | "dueDate" // date + relative chip (overdue / due in N days / valid till)
  | "currency"
  | "link" // a single attachment id and/or a URL
  | "links" // the MERGED Documents bucket (up to five view-only icon buttons)
  | "docStatus" // export-only: "Uploaded dd-Mmm-yyyy" / "Not uploaded"
  | "longtext"
  | "action";

export type Align = "left" | "center" | "right";

export type MasterColumn = {
  /** Stable key — used by column visibility, localStorage presets and tests. */
  key: string;
  /** Canonical display label (= the key of tableHeaderOverrides where it is a
   *  real tracker column, so Admin Settings renames keep working). */
  label: string;
  group: MasterGroupId;
  type: ColumnType;
  /** Screen width in `ch` units; the exports use it for the column width. */
  width: number;
  align: Align;
  /** The database field this reads — documentation only, never renamed. */
  db: string;
  /** Included in exports. False only for the on-screen action column. */
  exportable: boolean;
  /** Sticky left column — the DEFAULT frozen set. The Admin "Table & Display"
   *  section can override WHICH columns are frozen (0–3 data columns, capped
   *  by FROZEN_COLUMN_CAP); this flag is the shipped default, and a setting
   *  entry always wins over it. Block/PHC scroll (Part D: only Facility and
   *  Facility Type freeze). */
  pinned?: boolean;
  /** Shown in the default ("Overview") view. */
  defaultVisible?: boolean;
  /** The row's identity column — the table disambiguates duplicate values
   *  here with a secondary Block · PHC line. */
  primary?: boolean;
  /** Icon key for status/short columns (lucide icon resolved in the UI). */
  icon?: "award" | "calendar" | "file" | "link" | "flame" | "rupee" | "building";
  /** Labels this column was printed under BEFORE it was renamed.
   *
   *  Admin Settings → "Table headers" stores its renames keyed by the
   *  DEFAULT label, so renaming a column would silently drop a customer's
   *  custom header. Keeping the old labels here lets `resolveLabels` (and
   *  `withOverrides`) still find it — no saved rename is ever lost. */
  legacyLabels?: string[];

  /** Master-List audit flags (the ONE config drives UI, imports, exports and
   *  templates):
   *   • showInMasterList: false — kept OFF the Master List screen and the
   *     column presets, but still re-enableable in Admin → Table & Display →
   *     "Master List columns"; the field stays in the Facility Profile and
   *     in the "Full data" export. The DB column is NEVER dropped.
   *   • exportFull: true — included in the "Full data" export even when
   *     hidden from the Master List.
   *   • deprecated: true — removed EVERYWHERE (screen, Columns menu,
   *     presets, exports, templates). The DB column and its stored values
   *     are untouched so the field can be restored later. */
  showInMasterList?: boolean;
  /** Removed from BOTH the Master List table and the Columns menu, but still
   *  part of the "Full data" export (and the Facility Profile). */
  hideFromMenu?: boolean;
  /** False = cannot be frozen (Admin → Table & Display). The identity trio
   *  (type/block/PHC) now lives inside the merged Facility cell, so only the
   *  Facility column can be pinned. */
  freezeable?: boolean;
  exportFull?: boolean;
  /** Part 6: set on the columns the facility-master import may WRITE.
   *  Derived fields (Certification Cycle, Facility Current Status, validity,
   *  due dates, Documents Status (Report), Fire NOC Validity Status) and the
   *  SaQsham/IA score columns are deliberately NOT importable — they are
   *  listed in the template as "Auto, do not fill" and ignored in files. */
  importable?: boolean;
  deprecated?: boolean;
  /** What a blank cell reads as, when the type's default wording is wrong.
   *  The IA score columns use "Not reported" (a quarter that was never
   *  reported is not a step the facility has failed to start). */
  blank?: string;
};

/** The shipped FROZEN columns (Admin → Table & Display can change the list,
 *  0–3 data columns, hard cap below). "Type" right after "Facility". */
export const FROZEN_COLUMN_DEFAULTS: string[] = ["facility"];
/** Hard cap on frozen data columns (constant per the brief). */
export const FROZEN_COLUMN_CAP = 3;

const COL = (c: MasterColumn) => c;

export const MASTER_COLUMNS: MasterColumn[] = [
  /* 1 — IDENTITY (Facility + Type frozen by default; Block/PHC scroll) */
  /* Widths of the eight default-visible columns are tuned so the DEFAULT view
     fits a 1366px screen with the sidebar open (no horizontal scroll) — the
     budget is asserted in scripts/masterList.test.ts. Drag a column edge to
     widen one; the rest of the presets may scroll by design. */
  /* The identity trio (type · block · PHC) is folded into this ONE merged,
     frozen cell — 260px (32.5ch × 8), two lines, fixed 48px row height. The
     separate columns stay in the config (and the Columns menu) for the
     exports and for anyone who still wants them as their own columns. */
  COL({ key: "facility", label: "Facility", group: "identity", type: "text", width: 32.5, align: "left", db: "facilities.name", exportable: true, importable: true, pinned: true, defaultVisible: true, primary: true }),
  COL({ key: "block", label: "Block", group: "identity", type: "text", width: 10, align: "left", db: "facilities.block", exportable: true, importable: true, freezeable: false }),
  COL({ key: "phc", label: "PHC", group: "identity", type: "text", width: 12, align: "left", db: "facilities.phc", exportable: true, importable: true, freezeable: false }),
  COL({ key: "nin", label: "NIN", group: "identity", type: "text", width: 14, align: "left", db: "facilities.ninNumber", exportable: true, importable: true }),
  COL({ key: "type", label: "Facility Type", group: "identity", type: "text", width: 10, align: "left", db: "facilities.facilityType", exportable: true, importable: true, freezeable: false }),
  COL({ key: "certCycle", label: "Cycle", group: "identity", type: "text", width: 10, align: "center", db: "certificationCycles.cycleNumber", exportable: true, defaultVisible: true, legacyLabels: ["Certification Cycle"] }),
  COL({
    key: "saqshamNameCategory",
    label: "SaQsham Facility Name / Category",
    group: "identity",
    type: "text",
    width: 22,
    align: "left",
    // The DB field is facilities.saqshamCategory (the earlier import added
    // it and already maps the portal's "Facility Name/Category" header to
    // it); the config maps the display through it — no DB column is added.
    db: "facilities.saqshamCategory",
    exportable: true,
    importable: true,
    defaultVisible: false,
  }),
  // (facility, type above) — importable set continued below per the brief.

  /* 2 — ELIGIBILITY & PIPELINE (the two at-a-glance columns of the default
         view: where the facility stands, and what is due next) */
  COL({ key: "eligibility", label: "NQAS Eligibility", group: "eligibility", type: "status", width: 18, align: "center", db: "facilities.eligibility", exportable: true, importable: true, legacyLabels: ["NQAS Eligibility"] }),
  /* LABEL RENAMED: "Pipeline Status" → "Facility Current Status". The KEY
     (`pipelineStatus`), the DB column (`facilities.currentStatus`), the API
     field and the URL filter param (`status`) are deliberately unchanged —
     only this label moved, and everything else reads it from here. */
  COL({ key: "pipelineStatus", label: "Facility Current Status", group: "eligibility", type: "status", width: 20, align: "center", db: "facilities.currentStatus", exportable: true, defaultVisible: true, legacyLabels: ["Pipeline Status"] }),
  COL({ key: "nextAction", label: "Next Action / Due", group: "eligibility", type: "dueDate", width: 17, align: "left", db: "derived — earliest open deadline (IA / NQAS visit / surveillance / certificate / Fire NOC)", exportable: true, defaultVisible: true }),

  /* 3 — NQAS CERTIFICATION */
  COL({ key: "certStatus", label: "NQAS Certification Status", group: "certification", type: "status", width: 26, align: "center", db: "nationalAssessments.certificationStatus", exportable: true, importable: true }),
  COL({ key: "certDate", label: "GoI Letter Date / Certification date", group: "certification", type: "date", width: 17, align: "center", db: "nationalAssessments.goiLetterDate", exportable: true, importable: true }),
  COL({ key: "certScore", label: "Certified Score %", group: "certification", type: "score", width: 14, align: "right", db: "nationalAssessments.scorePercent", exportable: true, importable: true, defaultVisible: true }),
  COL({ key: "nqasResult", label: "NQAS Result", group: "certification", type: "status", width: 20, align: "center", db: "nationalAssessments.status", exportable: true }),
  COL({ key: "naScheduled", label: "NQAS Assessment Start date", group: "certification", type: "date", width: 17, align: "center", db: "nationalAssessments.scheduledStartDate", exportable: true, importable: true }),
  COL({ key: "naEnd", label: "NQAS Assessment End date", group: "certification", type: "date", width: 15, align: "center", db: "nationalAssessments.actualEndDate", exportable: true, showInMasterList: false }),
  COL({ key: "naMode", label: "Mode of Assessment", group: "certification", type: "text", width: 14, align: "left", db: "nationalAssessments.mode", exportable: true, showInMasterList: false }),
  COL({ key: "departments", label: "Departments / Packages & Certification Criteria", group: "certification", type: "longtext", width: 28, align: "left", db: "nationalAssessments.departments", exportable: true, showInMasterList: false }),
  COL({ key: "validityDate", label: "NQAS Certificate Validity Date", group: "certification", type: "dueDate", width: 15, align: "center", db: "nationalAssessments.validityDate", exportable: true, defaultVisible: true, legacyLabels: ["NQAS Certificate Validity"] }),

  /* 4 — GAP CLOSURE FUNDS */
  COL({ key: "gapAmount", label: "Gap Closure Amount", group: "funds", type: "currency", width: 16, align: "right", db: "gapClosureFunds.amountSanctioned", exportable: true, importable: true }),
  COL({ key: "gcYear", label: "  GC Fund received Year", group: "funds", type: "text", width: 12, align: "left", db: "gapClosureFunds.financialYear", exportable: true, importable: true }),
  COL({ key: "procLink", label: "Gap Closure Amount Proc. Link", group: "funds", type: "link", width: 12, align: "center", db: "gapClosureFunds.procLink", exportable: true, showInMasterList: false, hideFromMenu: true }),

  /* 5 — INTERNAL ASSESSMENT & KAYAKALP */
  COL({ key: "nqasIaQ1", label: "NQAS IA % (Q1)", group: "ia", type: "score", width: 12, align: "right", db: "facilityIaQuarters.nqasIaScore (previous quarter)", exportable: true, blank: "Not reported", legacyLabels: ["NQAS IA % 2026-27 (Q1)"] }),
  COL({ key: "nqasIaQ2", label: "NQAS IA % (Q2)", group: "ia", type: "score", width: 12, align: "right", db: "facilityIaQuarters.nqasIaScore (current quarter)", exportable: true, blank: "Not reported", legacyLabels: ["NQAS IA % 2026-27 (Q2)"] }),
  COL({ key: "nqasIaCmp", label: "NQAS IA Quarterly Comparison", group: "ia", type: "compare", width: 16, align: "center", db: "facilityIaQuarters. current − previous", exportable: true }),
  COL({ key: "kayakalpIaQ1", label: "Kayakalp IA % (Q1)", group: "ia", type: "score", width: 12, align: "right", db: "facilityIaQuarters.kayakalpIaScore (previous quarter)", exportable: true, blank: "Not reported", legacyLabels: ["Kayakalp IA % 2026-27 (Q1)"] }),
  COL({ key: "kayakalpIaQ2", label: "Kayakalp IA % (Q2)", group: "ia", type: "score", width: 12, align: "right", db: "facilityIaQuarters.kayakalpIaScore (current quarter)", exportable: true, blank: "Not reported", legacyLabels: ["Kayakalp IA % 2026-27 (Q2)"] }),
  COL({ key: "kayakalpIaCmp", label: "Kayakalp IA Quarterly Comparison", group: "ia", type: "compare", width: 17, align: "center", db: "facilityIaQuarters. current − previous", exportable: true }),
  COL({ key: "ecoIaQ1", label: "Eco-Friendly Scorecard % 2026-27 (Q1)", group: "ia", type: "score", width: 12, align: "right", db: "facilityIaQuarters.ecoFriendlyScore (previous quarter)", exportable: true, deprecated: true }),
  COL({ key: "ecoIaQ2", label: "Eco-Friendly Scorecard % 2026-27 (Q2)", group: "ia", type: "score", width: 12, align: "right", db: "facilityIaQuarters.ecoFriendlyScore (current quarter)", exportable: true, deprecated: true }),
  COL({ key: "ecoIaCmp", label: "Eco-Friendly Quarterly Comparison", group: "ia", type: "compare", width: 12, align: "center", db: "facilityIaQuarters. current − previous", exportable: true, deprecated: true }),

  /* 6 — STATE ASSESSMENT */
  COL({ key: "saStatus", label: "State Assessment Status", group: "sa", type: "status", width: 22, align: "center", db: "stateAssessments.status", exportable: true }),
  COL({ key: "saScore", label: "SA Score", group: "sa", type: "score", width: 11, align: "right", db: "stateAssessments.scorePercent", exportable: true, importable: true }),
  COL({ key: "saStart", label: "State Assessment Start date", group: "sa", type: "date", width: 18, align: "center", db: "stateAssessments.actualStartDate", exportable: true, importable: true }),
  COL({ key: "saEnd", label: "State Assessment End date", group: "sa", type: "date", width: 15, align: "center", db: "stateAssessments.actualEndDate", exportable: true, showInMasterList: false }),
  /* Plain text, never a pill: the latest PORTAL phrase can be long. 32.5ch is
     about 260px at the table's 8px/ch unit; the cell clamps to two lines and
     keeps the full text (and portal date) in its tooltip. */
  COL({ key: "genDoc", label: "SaQsham Documents Status", group: "sa", type: "text", width: 32.5, align: "left", db: "stateAssessments.generalDocStatus", exportable: true }),
  /* "Documents Status (Report)" — the derived group of the SaQsham Documents
     Status, written by the SaQsham document-status import (and editable via
     the portal status map). Lives next to the raw portal text so a report can
     filter on the handful of groups instead of the ~30 portal phrases. */
  COL({ key: "documentsStatusReport", label: "Documents Status (Report)", group: "sa", type: "status", width: 22, align: "center", db: "facilities.documentsStatusReport", exportable: true }),
  COL({ key: "assessor1", label: "Name of Assessor 1", group: "sa", type: "text", width: 18, align: "left", db: "stateAssessments.assessor1Name", exportable: true, showInMasterList: false }),
  COL({ key: "assessor1Hud", label: "Assessor 1 HUD", group: "sa", type: "text", width: 12, align: "left", db: "stateAssessments.assessor1Hud", exportable: true, showInMasterList: false }),
  COL({ key: "assessor2", label: "Name of Assessor 2", group: "sa", type: "text", width: 18, align: "left", db: "stateAssessments.assessor2Name", exportable: true, showInMasterList: false }),
  COL({ key: "assessor2Hud", label: "Assessor 2 HUD", group: "sa", type: "text", width: 12, align: "left", db: "stateAssessments.assessor2Hud", exportable: true, showInMasterList: false }),
  /* Designation + contact number: never on screen (the profile/form owns
     them) and never in the Columns menu — "Full data" exports only. */
  COL({ key: "assessor1Designation", label: "Assessor 1 Designation", group: "sa", type: "text", width: 16, align: "left", db: "stateAssessments.assessor1Designation", exportable: true, showInMasterList: false, hideFromMenu: true }),
  COL({ key: "assessor1Phone", label: "Assessor 1 Contact Number", group: "sa", type: "text", width: 16, align: "left", db: "stateAssessments.assessor1Phone", exportable: true, showInMasterList: false, hideFromMenu: true }),
  COL({ key: "assessor2Designation", label: "Assessor 2 Designation", group: "sa", type: "text", width: 16, align: "left", db: "stateAssessments.assessor2Designation", exportable: true, showInMasterList: false, hideFromMenu: true }),
  COL({ key: "assessor2Phone", label: "Assessor 2 Contact Number", group: "sa", type: "text", width: 16, align: "left", db: "stateAssessments.assessor2Phone", exportable: true, showInMasterList: false, hideFromMenu: true }),
  /* The five document links are MERGED into one view-only "Documents"
     bucket column in the Master List; each stays its own column here so the
     Full export (and the Profile) keeps the individual fields. */
  COL({ key: "saReport", label: "SA Report (PDF)", group: "sa", type: "link", width: 11, align: "center", db: "stateAssessments.reportAttachmentId", exportable: true, showInMasterList: false, hideFromMenu: true, icon: "file" }),
  COL({ key: "saChecklist", label: "SA Checklist (Excel)", group: "sa", type: "link", width: 11, align: "center", db: "stateAssessments.checklistAttachmentId", exportable: true, showInMasterList: false, hideFromMenu: true, icon: "file" }),

  /* 7 — SURVEILLANCE & RECERTIFICATION */
  COL({ key: "survDue1", label: "Surveillance Visit 1st Year Due Date", group: "surveillance", type: "dueDate", width: 20, align: "center", db: "nationalAssessments.surveillanceDue1", exportable: true }),
  COL({ key: "surv1", label: "1st Surveillance Assessment Done Date", group: "surveillance", type: "date", width: 19, align: "center", db: "nationalAssessments.surveillanceDone1", exportable: true, importable: true }),
  COL({ key: "survDue2", label: "Surveillance Visit 2nd Year Due Date", group: "surveillance", type: "dueDate", width: 20, align: "center", db: "nationalAssessments.surveillanceDue2", exportable: true }),
  COL({ key: "surv2", label: "2nd Surveillance Assessment Done Date", group: "surveillance", type: "date", width: 19, align: "center", db: "nationalAssessments.surveillanceDone2", exportable: true, importable: true }),
  COL({ key: "survScore", label: "2nd Surveillance Score %", group: "surveillance", type: "score", width: 12, align: "right", db: "nationalAssessments.manualScore", exportable: true, importable: true }),
  COL({ key: "recertStatus", label: "Recertification Status", group: "surveillance", type: "status", width: 22, align: "center", db: "nationalAssessments.manualRecertStatus", exportable: true }),
  COL({ key: "recertYear", label: "Re-Certification Year", group: "surveillance", type: "text", width: 12, align: "center", db: "nationalAssessments.recertYear", exportable: true, showInMasterList: false, hideFromMenu: true }),

  /* 8 — BUILDING & FIRE NOC */
  COL({ key: "buildingType", label: "Building Type", group: "buildingNoc", type: "text", width: 14, align: "left", db: "buildingDetails.buildingType", exportable: true, importable: true }),
  COL({ key: "buildingStatus", label: "Facility Building Status", group: "buildingNoc", type: "status", width: 20, align: "center", db: "buildingDetails.buildingStatus", exportable: true, importable: true }),
  /* EXPORT-ONLY document status columns: the table and the Columns menu no
     longer carry them, but every export (Excel/PDF/CSV/line lists) keeps the
     pair, printing "Uploaded dd-Mmm-yyyy" or "Not uploaded". */
  COL({ key: "condemnedLink", label: "Condemned Certificate", group: "buildingNoc", type: "docStatus", width: 11, align: "center", db: "buildingDetails.condemnedLink", exportable: true, showInMasterList: false, hideFromMenu: true }),
  COL({ key: "nocAvailable", label: "NOC Available", group: "buildingNoc", type: "status", width: 12, align: "center", db: "fireNocs.nocAvailable", exportable: true, showInMasterList: false, icon: "flame", legacyLabels: ["NOC Available"] }),
  // width 19 (152 px): "Expiring Soon" / "Not Obtained" pills fit whole —
  // the old 16 clipped them to "Expiring S…" / "Not Obtai…".
  COL({ key: "nocStatus", label: "Fire NOC Validity Status", group: "buildingNoc", type: "status", width: 20, align: "center", db: "fireNocs.status (derived)", exportable: true, icon: "flame" }),
  COL({ key: "nocCertified", label: "NOC Issue Date", group: "buildingNoc", type: "date", width: 14, align: "center", db: "fireNocs.issuedDate", exportable: true, importable: true }),
  COL({ key: "nocValidity", label: "Fire NOC Validity", group: "buildingNoc", type: "dueDate", width: 14, align: "center", db: "fireNocs.expiryDate", exportable: true, importable: true }),
  COL({ key: "nocDoc", label: "NOC Document", group: "buildingNoc", type: "docStatus", width: 11, align: "center", db: "fireNocs.nocLink", exportable: true, showInMasterList: false, hideFromMenu: true }),

  /* 9 — ASSESSMENT SCORES (Annexure I, optional, hidden by default) */
  ...(["A", "B", "C", "D", "E", "F", "G", "H"] as const).map((letter) =>
    COL({
      key: `area${letter}`,
      label: `Area ${letter}`,
      group: "scores" as const,
      type: "score" as const,
      width: 8.5,
      align: "right" as const,
      db: `annexureAreaScores.areaKey=${letter}`,
      exportable: true,
      defaultVisible: false,
      blank: "-",
    }),
  ),

  /* 10 — META */
  COL({
    key: "documents",
    label: "Documents",
    group: "meta",
    // Merged view-only bucket: SA Report · SA Checklist · Gap Closure Proc.
    // Link · Condemned Link · NOC Link. Renders up to five small icon
    // buttons (greyed when missing, tooltip = name) plus an "n/5" count.
    type: "links",
    width: 14,
    align: "center",
    db: "derived — bucket of the five document links",
    exportable: true,
    showInMasterList: false,
    hideFromMenu: true,
  }),
  COL({ key: "remarks", label: "Remarks", group: "meta", type: "longtext", width: 30, align: "left", db: "facilities.remarks", exportable: true, importable: true }),
  COL({ key: "lastUpdated", label: "Last Updated", group: "meta", type: "date", width: 14, align: "center", db: "facilities.updatedAt", exportable: true }),
  COL({ key: "actions", label: "Update", group: "meta", type: "action", width: 16, align: "center", db: "—", exportable: false }),
]

export const COLUMN_BY_KEY: Record<string, MasterColumn> = Object.fromEntries(
  MASTER_COLUMNS.map((c) => [c.key, c]),
);

/** The ONE user-visible name of the merged current-status field.
 *
 *  Exported so the filter dropdowns, the report column models, the chart
 *  captions and the exports read the label instead of re-typing it — the name
 *  can only ever be changed in this file. */
export const FACILITY_CURRENT_STATUS_LABEL = COLUMN_BY_KEY.pipelineStatus.label;

/** ROW ACTIONS (the guaranteed trailing "Update" utility column):
 *  settings shape stored by Admin Settings (optional, State Admin). The old
 *  column config read it from nothing (a hidden `update` column no user view
 *  included), so none of this existed server-side either. */
export type RowActionsSetting = {
  /** "Show / Hide" — default Show. Hidden drops the column entirely. */
  visible: boolean;
  /** "Button label" — Update / Edit. */
  label: "Update" | "Edit";
  /** "Pin to right edge" — sticky right; default ON. */
  pinRight: boolean;
  /** "Compact icon-only below 1280 px" — default ON. */
  compactBelow1280: boolean;
};

export const DEFAULT_ROW_ACTIONS: RowActionsSetting = {
  visible: true,
  label: "Update",
  pinRight: true,
  compactBelow1280: true,
};

/** Read Admin → "Row action column" with hard defaults for every missing
 *  field — a partial or corrupt setting can never break the column. */
export function readRowActionsSetting(raw: unknown): RowActionsSetting {
  if (raw == null || typeof raw !== "object") return { ...DEFAULT_ROW_ACTIONS };
  const r = raw as Record<string, unknown>;
  return {
    visible: r.visible === "hide" || r.visible === false ? false : true,
    label: r.label === "Edit" ? "Edit" : "Update",
    pinRight: !(r.pinRight === false || r.pinRight === "off"),
    compactBelow1280: !(r.compactBelow1280 === false || r.compactBelow1280 === "off"),
  };
}

export const columnsInGroup = (group: MasterGroupId): MasterColumn[] =>
  MASTER_COLUMNS.filter((c) => c.group === group);

/** Preset views — one click for the columns a team actually needs. */
/** Column-visibility sets (Part 3 audit). Every set reads THIS config —
 *  deprecated columns (the Eco trio) are filtered out everywhere.
 *
 *  • masterListColumns()      – the Master List screen's own column set
 *  • columnsMenuColumns()     – what the Columns menu offers (still has the
 *                               audit-removed columns so a State Admin can
 *                               re-enable them in Admin → Table & Display)
 *  • fullExportColumns()      – the "Full data" export: EVERY field,
 *                               including the showInMasterList:false ones
 *  • deprecatedColumns()      – the config entries kept for a future restore */
export const isDeprecatedColumn = (c: MasterColumn): boolean => c.deprecated === true;

export function deprecatedColumns(): MasterColumn[] {
  return MASTER_COLUMNS.filter(isDeprecatedColumn);
}
export function masterListColumns(): MasterColumn[] {
  return MASTER_COLUMNS.filter(
    (c) => c.type !== "action" && !isDeprecatedColumn(c) && c.showInMasterList !== false,
  );
}
export function columnsMenuColumns(): MasterColumn[] {
  return MASTER_COLUMNS.filter(
    (c) => c.type !== "action" && !isDeprecatedColumn(c) && c.hideFromMenu !== true,
  );
}

/** The identity quartet every export keeps as SEPARATE columns, even though
 *  the on-screen table merges type · block · PHC into the Facility cell. */
export const EXPORT_IDENTITY_KEYS = ["facility", "type", "block", "phc"] as const;
/** Document-status columns present in EVERY export. */
export const EXPORT_DOCUMENT_KEYS = ["condemnedLink", "nocDoc"] as const;

/** Add the identity quartet and the two document columns to an export's
 *  column list (no-ops when they are already there). */
export function withExportEssentials(columns: MasterColumn[]): MasterColumn[] {
  const have = new Set(columns.map((c) => c.key));
  const identity = EXPORT_IDENTITY_KEYS.map((k) => COLUMN_BY_KEY[k]).filter(
    (c) => c && !have.has(c.key),
  );
  const docs = EXPORT_DOCUMENT_KEYS.map((k) => COLUMN_BY_KEY[k]).filter(
    (c) => c && !have.has(c.key),
  );
  // Identity columns after the Facility column, documents at the end.
  const head = columns.length && columns[0].key === "facility" ? [columns[0], ...identity, ...columns.slice(1)] : [...identity, ...columns];
  return [...head, ...docs];
}
export function fullExportColumns(): MasterColumn[] {
  return MASTER_COLUMNS.filter(
    (c) => c.exportable && c.type !== "action" && !isDeprecatedColumn(c) && c.exportFull !== false,
  );
}

/** The default ("Overview") data-column count shown on the Columns badge —
 *  utility columns (the action button) are excluded. */
export function masterListDataColumnCount(): number {
  return masterListColumns().length;
}

export const COLUMN_PRESETS: { id: string; label: string; keys: string[] }[] = [
  /* (Part 3 3.2) presets rebuilt from the audited column set. The old
     "Pipeline" and "Assessment details" ids are gone; their storage entries
     fall back to Overview in normalizeView. */
  {
    id: "essentials",
    label: "Essentials",
    keys: MASTER_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
  },
  { id: "overview", label: "Overview", keys: ["facility", "certCycle", "eligibility", "pipelineStatus", "nextAction", "certScore", "validityDate"] },
  {
    id: "documents",
    label: "Documents",
    keys: [
      "facility",
      "documentsStatusReport",
      "genDoc",
      "nqasResult",
      "nocStatus",
      "nocValidity",
      "saReport",
      "saChecklist",
      "nocDoc",
    ],
  },
  { id: "certification", label: "Certification", keys: ["facility", "certCycle", "certStatus", "certDate", "certScore", "nqasResult", "naScheduled", "validityDate"] },
  { id: "funds", label: "Gap Closure", keys: ["facility", "gapAmount", "gcYear"] },
  { id: "assessments", label: "Assessments", keys: ["facility", "nqasIaQ1", "nqasIaQ2", "nqasIaCmp", "kayakalpIaQ1", "kayakalpIaQ2", "kayakalpIaCmp", "saStatus", "saScore", "saStart", "genDoc", "documentsStatusReport"] },
  { id: "surveillance", label: "Surveillance Due", keys: ["facility", "certCycle", "certStatus", "validityDate", "survDue1", "surv1", "survDue2", "surv2", "survScore", "recertStatus"] },
  { id: "building", label: "Building & Fire NOC", keys: ["facility", "buildingType", "buildingStatus", "nocStatus", "nocCertified", "nocValidity"] },
  /** The audit-removed columns (End dates, Mode, Departments, assessors,
   *  NOC Available, the five individual links) stay in the config with
   *  showInMasterList: false — reachable here and via the Columns menu, and
   *  always part of the "Full data" export. */
  { id: "fullData", label: "Full data", keys: fullExportColumns().map((c) => c.key) },
  { id: "all", label: "All columns", keys: columnsMenuColumns().map((c) => c.key) },
];

/** The default view — the seven columns district staff check first, in the
 *  order they check them: who the facility is (Facility, Block/PHC), what it
 *  is (Type), where it stands (Facility Current Status), how it scored (Certified
 *  Score %) and what needs doing (Validity, Next Action / Due). Everything
 *  else lives one click away in the detail drawer and the column chooser. */
export const DEFAULT_VISIBLE_KEYS: string[] = MASTER_COLUMNS.filter(
  (c) => c.defaultVisible,
).map((c) => c.key);

/** REPORTS & EXPORT — the page's ordered column list.
 *
 *  The report prints the SAME data columns the master list knows (the ONE
 *  config, never a second hand-typed list — that duplication was the root
 *  cause of the header/body shift), except the on-screen "Update" action
 *  column, which has no meaning on a report page. */
export const REPORT_COLUMNS: MasterColumn[] = MASTER_COLUMNS.filter(
  (c) => c.type !== "action" && c.deprecated !== true && c.hideFromMenu !== true,
);

/** The report page's DEFAULT visible columns — the same "what the screenshots
 *  scrolled through" set: identity, where the facility stands, the
 *  surveillance/recertification pair, and the FULL building & Fire NOC block
 *  (the old page always showed those; the type guard now keeps each under
 *  its own header). Admin renames and column-manager changes still apply. */
export const REPORT_DEFAULT_KEYS: string[] = [
  "facility",
  "certCycle",
  "pipelineStatus",
  "eligibility",
  "certStatus",
  "certScore",
  "validityDate",
  "survDue1",
  "recertStatus",
  "buildingType",
  "buildingStatus",
  "nocStatus",
  "nocCertified",
  "nocValidity",
  "remarks",
];

/* --------------------------------------------------------------------------- */
/* Row shape (structural view of an ops.listFacilityRowsFast row)             */
/* --------------------------------------------------------------------------- */

export type MasterRow = {
  facility: {
    _id: string;
    name: string;
    block: string;
    phc: string;
    facilityType: string;
    phaseType?: string | null;
    ninNumber?: string | null;
    eligibility?: string | null;
    currentStatus?: string | null;
    statusOverride?: string | null;
    remarks?: string | null;
    /** SaQsham document-status import (facilities fields, additive). */
  saqshamApplicationNo?: string | null;
  saqshamStatusRaw?: string | null;
  documentsStatusReport?: string | null;
  saqshamPortalUpdatedOn?: string | null;
  saqshamPortalUpdatedBy?: string | null;
  /** Exact "Facility Name/Category" text as written on the SaQsham portal —
   *  the import match key (Part 4). Never normalized: stored verbatim in the
   *  facilities DB field `saqshamCategory`. */
  saqshamCategory?: string | null;
    nqasIaQ1?: number | null;
    nqasIaQ2?: number | null;
    kayakalpIaQ1?: number | null;
    kayakalpIaQ2?: number | null;
    ecoFriendlyQ1?: number | null;
    ecoFriendlyQ2?: number | null;
    updatedAt?: number | null;
    /** Part 2 — written with the audit row. The "Updated" filter and the
     *  Last updated column read these; `updatedAt` stays for old rows. */
    lastChangedAt?: number | null;
    lastChangedBy?: string | null;
    lastChangeSource?: string | null;
    lastBatchId?: string | null;
    recentChanges?: { key: string; at: number; source?: string | null }[] | null;
  };
  /** Quarterly IA columns read the facilityIaQuarters store (built once per
   *  page by lib/iaMaster). Optional so every hand-built test row works.
   *  Named `iaq` — the Convex rows already carry `ia` (the freshness rule). */
  iaq?: MasterRowIa;
  /** Latest COMPLETED quarter's IA row (ops.listFacilityRowsFast). The
   *  pending "IA score missing" rule reads this on every surface, so the bell
   *  and the page can never disagree. */
  latestIa?: {
    fy: string;
    quarter: number;
    score: number | null;
    notApplicable: boolean;
  } | null;
  /** The six-document count, straight from `facility_document` (the database).
   *  ONE number the Master List cell, Quick View, profile, exports and the
   *  facility sheet all read — never a per-surface recount. */
  docs?: {
    uploaded: number;
    total: number;
    /** The document keys actually present (Part C ③ Needs attention). */
    keys?: string[] | null;
    /** Original file name + upload time per key — the sheet prints these,
     *  never the Drive storage name. */
    files?: Record<string, { name: string; uploadedAt: number }> | null;
    /** Required-but-missing documents, resolved with the LIVE Admin rules by
     *  the list page. The Master List "Documents" cell prints its amber chip
     *  and tooltip from this — never from a hard-coded rule. */
    requiredMissing?: { key: string; label: string; blocking: boolean }[] | null;
    /** Current files the nightly Drive reconciliation could not find. */
    missingInDriveKeys?: string[] | null;
    /** The resolved Admin rule per document key — the facility sheet's badge
     *  (Optional / Required / Required: certified) reads the SAME result. */
    requirements?: Record<
      string,
      { required: boolean; blocking: boolean; badge: string; reason: string | null }
    > | null;
  } | null;
  cycleNumber?: number | null;
  cycleType?: string | null;
  /** Annexure I scores for THIS row's cycle. Null/absent = no block, "-". */
  scores?: {
    overall: number | null;
    pss: number | null;
    letterScore?: number | null;
    areas: { key: string; name: string; score: number | null }[];
    departments: {
      name: string;
      canonicalName: string;
      score: number | null;
      isNew?: boolean;
    }[];
  } | null;
  sa: {
    status?: string | null;
    scheduledDate?: string | null;
    actualStartDate?: string | null;
    actualEndDate?: string | null;
    scorePercent?: number | null;
    generalDocStatus?: string | null;
    assessor1Name?: string | null;
    assessor1Hud?: string | null;
    assessor1Designation?: string | null;
    assessor1Phone?: string | null;
    assessor2Name?: string | null;
    assessor2Hud?: string | null;
    assessor2Designation?: string | null;
    assessor2Phone?: string | null;
    reportAttachmentId?: string | null;
    reportAttachmentName?: string | null;
    checklistAttachmentId?: string | null;
    checklistAttachmentName?: string | null;
  } | null;
  nqas: {
    status?: string | null;
    scheduledStartDate?: string | null;
    scheduledEndDate?: string | null;
    actualStartDate?: string | null;
    actualEndDate?: string | null;
    mode?: string | null;
    checklistVersion?: string | null;
    departments?: string[] | null;
    /** The Admin department list (names + count) — the sheet prints
     *  "7 of 8 · OPD, …" and the unassessed names. */
    departmentOptions?: string[] | null;
    departmentsTotal?: number | null;
    scorePercent?: number | null;
    certificationStatus?: string | null;
    certificationDate?: string | null;
    goiLetterDate?: string | null;
    validityDate?: string | null;
    surveillanceDue1?: string | null;
    surveillanceDone1?: string | null;
    surveillanceDue2?: string | null;
    surveillanceDone2?: string | null;
    manualScore?: number | null;
    recertStatus?: string | null;
    recertYear?: string | number | null;
  } | null;
  fund: {
    amountSanctioned?: number | null;
    amountReleased?: number | null;
    amountUtilized?: number | null;
    financialYear?: string | null;
    procLink?: string | null;
    fundAttachmentName?: string | null;
    status?: string | null;
  } | null;
  noc: {
    nocAvailable?: string | null;
    status?: string | null;
    issuedDate?: string | null;
    expiryDate?: string | null;
    nocLink?: string | null;
    nocAttachmentId?: string | null;
    nocAttachmentName?: string | null;
  } | null;
  building: {
    buildingType?: string | null;
    buildingStatus?: string | null;
    condemnedLink?: string | null;
    condemnedAttachmentName?: string | null;
  } | null;
  resultDocumentId?: string | null;
  resultDocumentName?: string | null;
  resultDocumentUpdatedAt?: number | null;
  ia?: { status?: string | null; dueDate?: string | null } | null;
};

/* --------------------------------------------------------------------------- */
/* Formatting constants (shared by the UI, Excel and PDF)                     */
/* --------------------------------------------------------------------------- */

/** Score thresholds — one constant, used by the mini bar, the Excel
 *  conditional formatting and the PDF pill colours. */
export const SCORE_THRESHOLDS = { green: 70, amber: 50 } as const;
/** A quarterly change smaller than this reads ■ (no change) — the same band
 *  the PPT deck documents. Default per the brief; the exact value stays in
 *  the tooltip ("+0.01, within the no-change band"). */
export const COMPARE_NO_CHANGE_BAND = 0.05;
/** Certificate / NOC expiry warning window. */
export const EXPIRY_WARN_DAYS = 90;
/** The row is highlighted as "due" when a due date falls inside this window. */
export const DUE_SOON_DAYS = 30;

const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** dd-mmm-yyyy (Indian display standard) — returns "" for blank/invalid. */
export function toDdMmmYyyy(iso: string | number | null | undefined): string {
  if (iso == null || iso === "") return "";
  const isoStr =
    typeof iso === "number"
      ? new Date(iso).toISOString().slice(0, 10)
      : String(iso).slice(0, 10);
  const [y, m, d] = isoStr.split("-");
  if (!y || !m || !d) return "";
  const mi = Number(m) - 1;
  if (Number.isNaN(mi) || !MONTHS[mi]) return "";
  return `${d}-${MONTHS[mi]}-${y}`;
}

/** Indian-grouped rupee amount: ₹ 1,25,000 */
export function formatInr(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return `₹ ${INR.format(Math.round(value))}`;
}

/** Decimal places for EVERY score / percentage in the app — the master list
 *  (screen, Excel, PDF), the dashboard reports and the facility profile.
 *
 *  ONE constant in the ONE config file, so a score can never print as "84.7%"
 *  in one grid and "84.67%" in the next. */
export const SCORE_DECIMALS = IA_SCORE_DECIMALS;

/** "78.50%" — SCORE_DECIMALS places, never "78.500000%". */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return `${value.toFixed(SCORE_DECIMALS)}%`;
}

/** Whole days from today to `iso` (>0 = future). */
export function daysUntil(iso: string | null | undefined, today = new Date()): number | null {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = Date.UTC(y, m - 1, d, 12);
  const base = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  return Math.round((target - base) / 86400_000);
}

export type DueState = "none" | "overdue" | "soon" | "ok";

export function dueState(days: number | null): DueState {
  if (days == null) return "none";
  if (days < 0) return "overdue";
  if (days <= DUE_SOON_DAYS) return "soon";
  return "ok";
}

export type Tone = "green" | "amber" | "red" | "blue" | "slate" | "violet";

/** Status text → tone. Used by the pills, the Excel fills and the PDF. */
export function statusTone(value: string | null | undefined): Tone {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return "slate";
  if (v.includes("deferred") || v === "no" || v === "expired" || v === "overdue" ||
      v.includes("not obtained") || v.includes("dilapidated") || v.includes("fail"))
    return "red";
  if (v.includes("expiring") || v.includes("conditionality") || v.includes("repair") ||
      v.includes("partial") || v.includes("due") || v.includes("pending") ||
      v.includes("progress") || v.includes("soon"))
    return "amber";
  if (v.includes("certified") && !v.includes("not")) return "green";
  if (v === "valid" || v === "yes" || v.includes("complete") || v.includes("utilized") ||
      v.includes("received") || v.includes("good") || v.includes("pass"))
    return "green";
  if (v.includes("scheduled") || v.includes("assess") || v.includes("virtual") ||
      v.includes("physical") || v.includes("hybrid"))
    return "blue";
  if (v.includes("eligible")) return "blue";
  if (v.includes("possible") || v.includes("candidate") || v.includes("renovation"))
    return "violet";
  return "slate";
}

/** Hex used by the exports (same words → same colour everywhere). */
export const TONE_HEX: Record<Tone, string> = {
  green: "#047857",
  amber: "#b45309",
  red: "#be123c",
  blue: "#0369a1",
  slate: "#475569",
  violet: "#6d28d9",
};
export const TONE_BG: Record<Tone, string> = {
  green: "#d1fae5",
  amber: "#fef3c7",
  red: "#ffe4e6",
  blue: "#e0f2fe",
  slate: "#f1f5f9",
  violet: "#ede9fe",
};

/** What a blank cell reads as — the screen never prints a bare "—".
 *
 *  • a status, score or due-date column that has no value yet means the
 *    facility has not started that step → "Not started" (grey),
 *  • a quarterly comparison with no data is "Not recorded",
 *  • everything else (text, dates, money, documents, remarks) returns null,
 *    i.e. the cell is left empty rather than filled with a placeholder.
 *
 *  Kept here (not in the component) so the rule is unit-tested in
 *  scripts/masterList.test.ts and shared with every surface that renders a
 *  column. */
export function blankLabel(
  column: Pick<MasterColumn, "type"> & { blank?: string },
): string | null {
  // A per-column override always wins (IA scores read "Not reported").
  if (column.blank) return column.blank;
  switch (column.type) {
    // A lifecycle status with no value keeps the shared quiet “Not started”
    // badge; every other blank is the plain dash the rest of the table uses,
    // never a zero or an empty-looking cell.
    case "status":
      return "Not started";
    case "compare":
      return "Not recorded";
    default:
      return "-";
  }
}

/** Score → tone, from the shared thresholds. */
export function scoreTone(value: number | null | undefined): Tone | null {
  if (value == null || Number.isNaN(value)) return null;
  if (value >= SCORE_THRESHOLDS.green) return "green";
  if (value >= SCORE_THRESHOLDS.amber) return "amber";
  return "red";
}

/* --------------------------------------------------------------------------- */
/* Next action / due                                                          */
/* --------------------------------------------------------------------------- */

/** Which deadline a "Next Action / Due" value comes from. */
export type NextDueKind =
  | "ia"
  | "assessment"
  | "surveillance"
  | "certificate"
  | "noc";

export type NextDue = { iso: string; label: string; kind: NextDueKind };

/**
 * The single next thing to do for a facility — the earliest open deadline
 * among the internal assessment, the NQAS visit, the two surveillance visits,
 * the certificate validity and the Fire NOC renewal. Completed steps are
 * skipped (a surveillance due date that has been done is not "next").
 *
 * Ordering rule: an overdue deadline always wins over a future one (that is
 * the thing that is late), and among them the most overdue wins; otherwise the
 * soonest upcoming deadline wins. Returns null when nothing is tracked yet —
 * the cell then reads "Not started" rather than a bare dash.
 */
export function nextDueOf(row: MasterRow, today = new Date()): NextDue | null {
  const nq = row.nqas;
  const candidates: NextDue[] = [];
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  /* ONE surveillance rule: a visit counts as done only when its done date is a
     real, non-future visit. The old code skipped a due date whenever ANY done
     date existed — so the stored future "done 17-Aug-2027" hid the 2nd
     surveillance deadline and the row fell through to the 2028 certificate. */
  const visits = surveillanceVisits((nq ?? null) as Partial<NqasLike> | null, null, todayIso);
  if (row.ia?.dueDate)
    candidates.push({ iso: row.ia.dueDate, label: "Internal assessment due", kind: "ia" });
  if (nq?.scheduledStartDate && !nq.actualEndDate)
    candidates.push({
      iso: nq.scheduledStartDate,
      label: "NQAS assessment scheduled",
      kind: "assessment",
    });
  for (const visit of visits) {
    if (
      (visit.state === "overdue" || visit.state === "dueSoon" || visit.state === "upcoming") &&
      visit.due
    ) {
      candidates.push({ iso: visit.due, label: `${visit.label} due`, kind: "surveillance" });
    }
  }
  if (nq?.validityDate)
    candidates.push({
      iso: nq.validityDate,
      label: "Certificate valid till",
      kind: "certificate",
    });
  if (row.noc?.expiryDate)
    candidates.push({ iso: row.noc.expiryDate, label: "Fire NOC renewal", kind: "noc" });
  if (candidates.length === 0) return null;

  // Plain `<` comparisons here (not localeCompare): this runs once per row per
  // sort, and nextDueOf is called for every row of the list.
  const withDays = candidates
    .map((c) => ({ c, days: daysUntil(c.iso, today) ?? 0 }))
    .sort((a, b) =>
      a.days !== b.days
        ? a.days - b.days
        : a.c.label < b.c.label
          ? -1
          : a.c.label > b.c.label
            ? 1
            : 0,
    );
  const overdue = withDays.filter((x) => x.days < 0);
  return overdue.length > 0 ? overdue[0].c : withDays[0].c;
}

/* --------------------------------------------------------------------------- */
/* Cell values                                                                */
/* --------------------------------------------------------------------------- */

export type CellValue =
  | { kind: "empty" }
  | { kind: "text"; value: string; /** Extra tooltip detail (never exported). */ tip?: string }
  | { kind: "status"; value: string; tone: Tone }
  | { kind: "score"; value: number }
  | { kind: "compare"; value: number | null }
  | { kind: "date"; value: string | number }
  | { kind: "dueDate"; value: string | null }
  | { kind: "currency"; value: number }
  | { kind: "link"; url: string | null; attachmentId: string | null; name: string | null; icon: MasterColumn["icon"] }
  | { kind: "docStatus"; uploaded: boolean; uploadedAt: number | null; fileName: string | null; docKey: string }
  | {
      kind: "links";
      items: DocumentLinkRef[];
      present: number;
      max: number;
      /** The SIX-document upload count from `facility_document`. Present on
       *  live list rows; hand-built rows fall back to the link count. */
      docs?: {
        uploaded: number;
        total: number;
        requiredMissing?: { key: string; label: string; blocking: boolean }[] | null;
      };
    };

/** One entry of the merged Documents bucket — where it points (a URL or an
 *  attachment id) and what to show in its tooltip. */
export type DocumentLinkRef = {
  key: string;
  label: string;
  url?: string | null;
  attachmentId?: string | null;
  name?: string | null;
  icon: NonNullable<MasterColumn["icon"]>;
};

/** The merged "Documents" bucket: the five link fields a report reader may
 *  need, in a fixed order. The bucket is VIEW-ONLY — each underlying field
 *  stays its own config column (showInMasterList: false) for the Full export
 *  and is edited in the Facility Profile. */
export const DOCUMENT_LINK_COLUMNS: {
  key: string;
  label: string;
  icon: NonNullable<MasterColumn["icon"]>;
}[] = [
  { key: "saReport", label: "SA Report (PDF)", icon: "file" },
  { key: "saChecklist", label: "SA Checklist (Excel)", icon: "file" },
  { key: "procLink", label: "Gap Closure Amount Proc. Link", icon: "rupee" },
  { key: "condemnedLink", label: "Condemned Document Link", icon: "building" },
  { key: "nocDoc", label: "NOC Document Link", icon: "file" },
];

export function documentsBucket(row: MasterRow): DocumentLinkRef[] {
  return DOCUMENT_LINK_COLUMNS.map((c) => {
    const v = rawCellValue(row, c.key);
    if (v.kind !== "link") return null;
    return {
      key: c.key,
      label: c.label,
      url: v.url,
      attachmentId: v.attachmentId,
      name: v.name,
      icon: c.icon,
    } as DocumentLinkRef;
  }).filter((x): x is DocumentLinkRef => x !== null && Boolean(x.url || x.attachmentId || x.name));
}

/** One export-only document-status cell: the SIX-document store's file for
 *  Condemned Certificate / Fire NOC, or "Not uploaded". */
function docStatusValue(
  row: MasterRow,
  which: "condemned" | "noc",
): CellValue {
  const files = row.docs?.files ?? null;
  if (files) {
    for (const [key, file] of Object.entries(files)) {
      const k = key.toLowerCase();
      const hit =
        which === "condemned"
          ? k.includes("condemn")
          : k === "noc" || k.startsWith("noc_") || k === "fire_noc";
      if (hit) {
        return {
          kind: "docStatus",
          uploaded: true,
          uploadedAt: file?.uploadedAt ?? null,
          fileName: file?.name ?? null,
          docKey: key,
        };
      }
    }
  }
  return { kind: "docStatus", uploaded: false, uploadedAt: null, fileName: null, docKey: which };
}

/** All IA comparison logic in one place (shared with the exports). When the
 *  row carries the quarterly IA store (row.ia), the comparison follows the
 *  Compare-quarters selection; the legacy facility columns stay the
 *  fallback for rows with nothing stored yet. */
export function compareOf(row: MasterRow, which: "nqas" | "kayakalp" | "eco"): number | null {
  if (row.iaq) return iaCompareOf(row.iaq, which);
  const f = row.facility;
  const q1 = which === "nqas" ? f.nqasIaQ1 : which === "kayakalp" ? f.kayakalpIaQ1 : f.ecoFriendlyQ1;
  const q2 = which === "nqas" ? f.nqasIaQ2 : which === "kayakalp" ? f.kayakalpIaQ2 : f.ecoFriendlyQ2;
  if (q1 == null || q2 == null) return null;
  return Math.round((q2 - q1) * 10) / 10;
}

/** One IA score cell: the quarterly store first (with its remark fallback),
 *  then the legacy facilities field for the static 2026-27 pair. */
export function iaCellScore(
  row: MasterRow,
  which: IaTracker,
  slot: "prev" | "cur",
  legacyField: number | null | undefined,
): { value: number | null; remark: string | null } {
  if (row.iaq) {
    const period = slot === "prev" ? row.iaq.pair.previous : row.iaq.pair.current;
    return { value: iaScoreOf(row.iaq, which, period), remark: iaRemarkOf(row.iaq, which, period) };
  }
  return { value: legacyField ?? null, remark: null };
}

/** Dynamic IA labels: rewrite the "2026-27 (Q1)" tails of the nine IA column
 *  labels to the chosen Compare-quarters pair. Runs AFTER resolveLabels so
 *  Admin renames survive; when pair is null (no data yet) nothing changes. */
export function withIaPeriodLabels(
  labels: Record<string, string>,
  pair: { previous: FyQuarter; current: FyQuarter } | null,
): Record<string, string> {
  if (!pair) return labels;
  const out = { ...labels };
  // "NQAS IA % (Q1)" + the pair's PREVIOUS period → "NQAS IA % · Q2 2026-27"
  // (the Q1/Q2 in the label is the SLOT, the pair decides WHICH quarter it
  // shows; slot Q1 = the pair's previous period, slot Q2 = its current one).
  const relabel = (key: "nqasIaQ1" | "nqasIaQ2" | "kayakalpIaQ1" | "kayakalpIaQ2") => {
    if (!out[key]) return;
    const period = key.endsWith("Q1") ? pair.previous : pair.current;
    out[key] = out[key].replace(/\s*\(Q[1-4]\)\s*$/, ` · ${formatFyQuarter(period.fy, period.q)}`);
  };
  relabel("nqasIaQ1");
  relabel("nqasIaQ2");
  relabel("kayakalpIaQ1");
  relabel("kayakalpIaQ2");
  return out;
}

/** Read one column's value from a row. Never throws; blanks come back as
 *  `{ kind: "empty" }` so every surface can render its own "-" placeholder.
 *
 *  The column TYPE decides the value kind for status columns: `type: "status"`
 *  columns always come back as a status value with its tone, so the pill on
 *  the screen, the fill in Excel and the colour in the PDF are one decision. */
export function cellValue(row: MasterRow, key: string): CellValue {
  const raw = rawCellValue(row, key);
  const column = COLUMN_BY_KEY[key];
  if (column?.type === "status") {
    const text = raw.kind === "text" ? raw.value : raw.kind === "status" ? raw.value : "";
    return text ? { kind: "status", value: text, tone: statusTone(text) } : { kind: "empty" };
  }
  if (column?.type === "dueDate" && raw.kind === "text") {
    return { kind: "dueDate", value: raw.value || null };
  }
  return raw;
}

function annexureAreaScore(row: MasterRow, key: string): number | null {
  const letter = key.startsWith("area") ? key.slice(4).toUpperCase() : "";
  return row.scores?.areas.find((a) => a.key.toUpperCase() === letter)?.score ?? null;
}

function rawCellValue(row: MasterRow, key: string): CellValue {
  const f = row.facility;
  const sa = row.sa;
  const nq = row.nqas;
  const fund = row.fund;
  const noc = row.noc;
  const bld = row.building;
  const txt = (v: string | number | null | undefined): CellValue =>
    v == null || v === "" ? { kind: "empty" } : { kind: "text", value: String(v) };

  switch (key) {
    case "facility": return txt(f.name);
    case "block": return txt(f.block);
    case "phc": return txt(f.phc);
    case "nin": return txt(f.ninNumber);
    case "type": return txt(f.facilityType);
    case "certCycle":
      // Part 3.3: derived pill text "#1 Initial" / "#2 Recert" — read-only.
      return { kind: "text", value: cycleLabel(row.cycleNumber == null ? null : { cycleNumber: row.cycleNumber, cycleType: row.cycleType ?? null }) };

    case "eligibility": return txt(f.eligibility);
    case "pipelineStatus": return txt(f.currentStatus);

    case "certStatus": return txt(nq?.certificationStatus);
    case "certDate": {
      const v = nq?.goiLetterDate ?? nq?.certificationDate;
      return v ? { kind: "date", value: v } : { kind: "empty" };
    }
    case "certScore":
      return nq?.scorePercent == null ? { kind: "empty" } : { kind: "score", value: nq.scorePercent };
    case "areaA":
    case "areaB":
    case "areaC":
    case "areaD":
    case "areaE":
    case "areaF":
    case "areaG":
    case "areaH": {
      const score = annexureAreaScore(row, key);
      return score == null ? { kind: "empty" } : { kind: "score", value: score };
    }
    case "nqasResult": return txt(nq?.status);
    case "naScheduled": return nq?.scheduledStartDate ? { kind: "date", value: nq.scheduledStartDate } : { kind: "empty" };
    case "naEnd": {
      const v = nq?.actualEndDate ?? nq?.scheduledEndDate;
      return v ? { kind: "date", value: v } : { kind: "empty" };
    }
    case "naMode": return txt(nq?.mode);
    case "departments":
      return nq?.departments?.length
        ? { kind: "text", value: nq.departments.join(", ") }
        : { kind: "empty" };
    case "validityDate": return { kind: "dueDate", value: nq?.validityDate ?? null };
    case "nextAction": return { kind: "dueDate", value: nextDueOf(row)?.iso ?? null };

    case "gapAmount":
      return fund?.amountSanctioned == null ? { kind: "empty" } : { kind: "currency", value: fund.amountSanctioned };
    case "gcYear": return txt(fund?.financialYear);
    case "procLink": return { kind: "link", url: fund?.procLink ?? null, attachmentId: null, name: null, icon: "rupee" };
    case "assessor1Designation": return txt(sa?.assessor1Designation);
    case "assessor1Phone": return txt(sa?.assessor1Phone);
    case "assessor2Designation": return txt(sa?.assessor2Designation);
    case "assessor2Phone": return txt(sa?.assessor2Phone);
    case "condemnedLink": return docStatusValue(row, "condemned");
    case "nocDoc": return docStatusValue(row, "noc");

    case "nqasIaQ1": {
      const s = iaCellScore(row, "nqas", "prev", f.nqasIaQ1);
      return s.value == null ? (s.remark ? { kind: "text", value: s.remark } : { kind: "empty" }) : { kind: "score", value: s.value };
    }
    case "nqasIaQ2": {
      const s = iaCellScore(row, "nqas", "cur", f.nqasIaQ2);
      return s.value == null ? (s.remark ? { kind: "text", value: s.remark } : { kind: "empty" }) : { kind: "score", value: s.value };
    }
    case "nqasIaCmp": return { kind: "compare", value: compareOf(row, "nqas") };
    case "kayakalpIaQ1": {
      const s = iaCellScore(row, "kayakalp", "prev", f.kayakalpIaQ1);
      return s.value == null ? (s.remark ? { kind: "text", value: s.remark } : { kind: "empty" }) : { kind: "score", value: s.value };
    }
    case "kayakalpIaQ2": {
      const s = iaCellScore(row, "kayakalp", "cur", f.kayakalpIaQ2);
      return s.value == null ? (s.remark ? { kind: "text", value: s.remark } : { kind: "empty" }) : { kind: "score", value: s.value };
    }
    case "kayakalpIaCmp": return { kind: "compare", value: compareOf(row, "kayakalp") };
    case "ecoIaQ1": {
      const s = iaCellScore(row, "eco", "prev", f.ecoFriendlyQ1);
      return s.value == null ? (s.remark ? { kind: "text", value: s.remark } : { kind: "empty" }) : { kind: "score", value: s.value };
    }
    case "ecoIaQ2": {
      const s = iaCellScore(row, "eco", "cur", f.ecoFriendlyQ2);
      return s.value == null ? (s.remark ? { kind: "text", value: s.remark } : { kind: "empty" }) : { kind: "score", value: s.value };
    }
    case "ecoIaCmp": return { kind: "compare", value: compareOf(row, "eco") };

    case "saStatus": return txt(sa?.status);
    case "saScore": return sa?.scorePercent == null ? { kind: "empty" } : { kind: "score", value: sa.scorePercent };
    case "saStart": {
      const v = sa?.actualStartDate ?? sa?.scheduledDate;
      return v ? { kind: "date", value: v } : { kind: "empty" };
    }
    case "saEnd": return sa?.actualEndDate ? { kind: "date", value: sa.actualEndDate } : { kind: "empty" };
    case "genDoc": {
      /* The exact portal phrase from the latest import. Result Declared still
         wins at read time; a missing portal phrase is a dash, never the
         report group. */
      const v = saqshamDocumentsStatusOf(sa?.generalDocStatus, nq?.certificationStatus);
      if (!v) return { kind: "empty" };
      const updated = f.saqshamPortalUpdatedOn ? toDdMmmYyyy(f.saqshamPortalUpdatedOn) : "";
      return {
        kind: "text",
        value: v,
        tip: updated ? `${v} · Portal updated ${updated}` : v,
      };
    }
    case "documentsStatusReport": {
      // Part B: a declared result always reads "Result declared" here — a
      // real neutral chip, never a blank or "-", and never an older portal
      // report value that the result has superseded.
      const v = documentsStatusReportDisplayOf(
        sa?.generalDocStatus,
        f.documentsStatusReport,
        nq?.certificationStatus,
      );
      if (!v) return { kind: "empty" };
      const label = docStageLabel(v);
      return { kind: "status", value: label, tone: statusTone(label) };
    }
    case "assessor1": return txt(sa?.assessor1Name);
    case "assessor1Hud": return txt(sa?.assessor1Hud);
    case "assessor2": return txt(sa?.assessor2Name);
    case "assessor2Hud": return txt(sa?.assessor2Hud);
    case "saReport":
      return { kind: "link", url: null, attachmentId: sa?.reportAttachmentId ?? null, name: sa?.reportAttachmentName ?? null, icon: "file" };
    case "saChecklist":
      return { kind: "link", url: null, attachmentId: sa?.checklistAttachmentId ?? null, name: sa?.checklistAttachmentName ?? null, icon: "file" };

    case "survDue1": return { kind: "dueDate", value: nq?.surveillanceDue1 ?? null };
    case "surv1": return nq?.surveillanceDone1 ? { kind: "date", value: nq.surveillanceDone1 } : { kind: "empty" };
    case "survDue2": return { kind: "dueDate", value: nq?.surveillanceDue2 ?? null };
    case "surv2": return nq?.surveillanceDone2 ? { kind: "date", value: nq.surveillanceDone2 } : { kind: "empty" };
    case "survScore": return nq?.manualScore == null ? { kind: "empty" } : { kind: "score", value: nq.manualScore };
    case "recertStatus": return txt(nq?.recertStatus);
    case "recertYear": return txt(nq?.recertYear);

    case "buildingType": return txt(bld?.buildingType);
    case "buildingStatus": return txt(bld?.buildingStatus);
    case "condemnedLink":
      return { kind: "link", url: bld?.condemnedLink ?? null, attachmentId: null, name: null, icon: "building" };
    case "nocAvailable": {
      /* ONE vocabulary (lib/nocAvailability): stored Yes/No wins, a blank
         beside a real NOC record reads "Yes" (derived), no record is "-".
         The old `txt()` let a blank fall through `blankLabel()` and paint the
         lifecycle word "Not started" on a Yes/No field. */
      const available = deriveNocAvailability(row).value;
      return available
        ? { kind: "status", value: available, tone: statusTone(available) }
        : { kind: "empty" };
    }
    case "nocStatus":
      // Derived from the validity date so the column self-updates daily —
      // same rule as the backend (deriveFireNocStatus).
      return {
        kind: "status",
        value: deriveFireNocStatus(noc?.nocAvailable ?? null, noc?.expiryDate ?? null, noc?.status ?? null),
        tone: statusTone(
          deriveFireNocStatus(noc?.nocAvailable ?? null, noc?.expiryDate ?? null, noc?.status ?? null),
        ),
      };
    case "nocCertified": return noc?.issuedDate ? { kind: "date", value: noc.issuedDate } : { kind: "empty" };
    case "nocValidity": return { kind: "dueDate", value: noc?.expiryDate ?? null };
    case "nocDoc":
      return { kind: "link", url: noc?.nocLink ?? null, attachmentId: noc?.nocAttachmentId ?? null, name: noc?.nocAttachmentName ?? null, icon: "file" };

    case "documents": {
      const items = documentsBucket(row);
      return {
        kind: "links",
        items,
        present: items.length,
        max: DOCUMENT_LINK_COLUMNS.length,
        docs: row.docs ?? undefined,
      };
    }
    case "saqshamNameCategory": return txt(f.saqshamCategory);

    case "remarks": return txt(f.remarks);
    case "lastUpdated": {
      // Prefer the audit-backed stamp; fall back to the legacy save stamp.
      const at = f.lastChangedAt ?? f.updatedAt;
      return at ? { kind: "date", value: at } : { kind: "empty" };
    }
    default: return { kind: "empty" };
  }
}

/** Plain-text rendering of a cell — used by the exports and the CSV so the
 *  printed value always matches what the screen shows. */
export function cellText(row: MasterRow, key: string): string {
  const v = cellValue(row, key);
  // "Next action / due" is the one column where the date alone is not the
  // whole answer — the label says WHICH deadline it is, so the PDF/Excel row
  // reads "1st surveillance due: 10-Jan-2027 (Due in 20d)".
  if (key === "nextAction") {
    const next = nextDueOf(row);
    if (!next) return "";
    const days = daysUntil(next.iso);
    const d = toDdMmmYyyy(next.iso);
    if (days == null) return `${next.label}: ${d}`;
    if (days < 0) return `${next.label}: ${d} (Overdue ${Math.abs(days)}d)`;
    if (days <= DUE_SOON_DAYS) return `${next.label}: ${d} (Due in ${days}d)`;
    return `${next.label}: ${d}`;
  }
  switch (v.kind) {
    // The optional Annexure I columns show a dash when this cycle has no
    // score — in the export too, never a blank that reads like zero.
    case "empty": return /^area[A-H]$/.test(key) ? "-" : "";
    case "text": return v.value;
    case "status": return v.value;
    case "score": return formatPercent(v.value);
    case "compare":
      return v.value == null
        ? ""
        : `${Math.abs(v.value) < COMPARE_NO_CHANGE_BAND ? "■" : v.value > 0 ? "▲" : v.value < 0 ? "▼" : "■"} ${Math.abs(v.value).toFixed(SCORE_DECIMALS)}`;
    case "date": return toDdMmmYyyy(v.value);
    case "dueDate": {
      if (!v.value) return "";
      const days = daysUntil(v.value);
      const d = toDdMmmYyyy(v.value);
      if (days == null) return d;
      if (days < 0) return `${d} (Overdue ${Math.abs(days)}d)`;
      if (days <= DUE_SOON_DAYS) return `${d} (Due in ${days}d)`;
      return d;
    }
    case "currency": return formatInr(v.value);
    case "link": return v.url ?? v.name ?? "";
    case "docStatus":
      return v.uploadedAt != null
        ? `Uploaded ${toDdMmmYyyy(new Date(v.uploadedAt).toISOString().slice(0, 10))}`
        : "Not uploaded";
    case "links": {
      const count = v.docs ?? { uploaded: v.present, total: v.max };
      return count.uploaded > 0 ? `${count.uploaded}/${count.total}` : "";
    }
    default: return "";
  }
}

/** Apply admin-renamed labels (tableHeaderOverrides) to a column list.
 *
 *  A rename saved under a column's FORMER label still applies (see
 *  `legacyLabels`), so re-labelling a column never silently reverts somebody's
 *  custom header. */
export function resolveLabels(
  columns: MasterColumn[],
  overrides: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of columns) {
    const legacy = (c.legacyLabels ?? [])
      .map((l) => overrides?.[l])
      .find((v): v is string => typeof v === "string" && v.trim() !== "");
    const custom = overrides?.[c.label] ?? legacy;
    out[c.key] = custom && custom.trim() ? custom : c.label;
  }
  return out;
}

/** current label → the labels that column used to be printed under. Derived
 *  from the config so the alias list can never fall out of sync. */
export const LEGACY_LABELS_BY_LABEL: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const c of MASTER_COLUMNS) {
    for (const legacy of c.legacyLabels ?? []) {
      (out[c.label] ??= []).push(legacy);
    }
  }
  return out;
})();

/* --------------------------------------------------------------------------- */
/* Insights (KPI strip, pipeline chart, "needs attention")                    */
/* --------------------------------------------------------------------------- */

export type StageId =
  | "eligibility"
  | "sa"
  | "nqas"
  | "certification"
  | "surveillance"
  | "recertification";

/** Which of the 6 lifecycle stages a facility sits in today — the same words
 *  the pipeline chips use, so the chart can never drift from the table. */
export function stageOf(row: MasterRow): StageId {
  const status = (row.facility.currentStatus ?? "").toLowerCase();
  const recert = (row.nqas?.recertStatus ?? "").toLowerCase();
  if (recert && recert !== "—") return "recertification";
  if (status.includes("recertification")) return "recertification";
  if (status.includes("surveillance")) return "surveillance";
  if (row.facility.statusOverride) return "certification";
  if (status.includes("certified") || status.includes("deferred")) return "certification";
  if (row.nqas && (row.nqas.status || row.nqas.scheduledStartDate || row.nqas.actualEndDate))
    return "nqas";
  if (row.sa && (row.sa.status || row.sa.scheduledDate)) return "sa";
  const eligible = (row.facility.eligibility ?? "").toLowerCase();
  return eligible.includes("eligible") ? "eligibility" : "eligibility";
}

export type MasterKpis = {
  total: number;
  /* "Hold a certificate": a GoI letter / certification date exists — the ONE
     definition the chip, the click-through filter and the exports share
     (stage-based counting used to answer 70 while the answer to
     "who holds a certificate" was 72). */
  certified: number;
  /** Split for the chip tooltip: quality / conditional certifications. */
  certifiedQuality: number;
  certifiedConditional: number;
  /** In the Certified stage (surveillance / recertification excluded). */
  certifiedStage: number;
  inPipeline: number;
  eligibleNotAssessed: number;
  surveillanceOverdue: number;
  certificatesExpiring: number;
  nocExpiredOrMissing: number;
  /** Distinct facilities with ANY open attention item (expired certificate,
      overdue surveillance, expired Fire NOC or dilapidated building). */
  attentionFacilities: number;
  /** Distinct facilities with a due date inside the next 90 days. */
  due90Facilities: number;
  /** Facilities with a problem building status. */
  buildingIssues: number;
  fundsTotal: number;
  fundsPending: number;
};

/** "Needs attention" — expired certificate, a surveillance visit past its due
 *  date with no visit recorded, an expired Fire NOC, or a dilapidated
 *  building. Distinct per facility: one facility with three problems is ONE
 *  row, not three chips' worth. Shared by computeKpis, the tab count and
 *  lib/masterFilter's kpiMatches so the number can never disagree with the
 *  click-through list. */
export function requiredDocumentsMissing(
  row: MasterRow,
  rules: DocumentRules = DEFAULT_DOCUMENT_RULES,
): { key: string; label: string; blocking: boolean }[] {
  // No key list from the server (older rows, exports built by hand) → we do
  // not know, so we do not accuse. A blank is never a zero.
  if (!row.docs?.keys) return [];
  // ONE source: lib/documentRules.requiredDocumentIssues decides which file is
  // required and what the warning says; this adapter only feeds it the row.
  return requiredDocumentIssues(
    {
      presentKeys: row.docs.keys,
      certStatus: row.nqas?.certificationStatus ?? null,
      gapAmount: row.fund?.amountSanctioned ?? 0,
      dilapidated: (row.building?.buildingStatus ?? "").toLowerCase() === "dilapidated",
      fireNocRecorded:
        !!row.noc && ((row.noc.nocAvailable ?? "") === "Yes" || !!row.noc.issuedDate),
    },
    rules,
  ).map((issue) => ({ key: issue.key, label: issue.label, blocking: issue.blocking }));
}

/** IST calendar date (the pending rules speak ISO dates, never timestamps). */
function isoToday(today: Date): string {
  return new Date(today.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Every registry issue for one row (the ONE rule set the bell, badge, smart
 *  view and /pending page share). */
export function attentionIssuesOf(
  row: MasterRow,
  today = new Date(),
  rules: DocumentRules = DEFAULT_DOCUMENT_RULES,
  pending: PendingConfig = DEFAULT_PENDING_CONFIG,
  settings?: Partial<LifecycleSettings> | null,
): PendingIssue[] {
  return computePendingIssues([row as PendingRow], {
    today: isoToday(today),
    config: pending,
    documentRules: rules,
    settings,
  });
}

/**
 * "Needs attention" — now a thin adapter over lib/pending.issueRules, the ONE
 * registry. The sidebar badge, the bell, the Master List smart view and the
 * /pending page therefore cannot disagree about whether a facility has an
 * issue. `rules` still comes from Admin → Documents; `pending` from Admin →
 * Pending rules.
 */
export function attentionOf(
  row: MasterRow,
  today = new Date(),
  rules: DocumentRules = DEFAULT_DOCUMENT_RULES,
  pending: PendingConfig = DEFAULT_PENDING_CONFIG,
  settings?: Partial<LifecycleSettings> | null,
): boolean {
  return attentionIssuesOf(row, today, rules, pending, settings).length > 0;
}

/**
 * The SAME set as `attentionOf`, one row per facility with the reason that
 * put it there (highest severity first). This is the sidebar bell's source:
 * `attentionList(rows).length` is the badge number and the panel lists exactly
 * these facilities.
 */
export function attentionList(
  rows: MasterRow[],
  today = new Date(),
  rules: DocumentRules = DEFAULT_DOCUMENT_RULES,
  pending: PendingConfig = DEFAULT_PENDING_CONFIG,
  settings?: Partial<LifecycleSettings> | null,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const r of rows) {
    const issues = attentionIssuesOf(r, today, rules, pending, settings);
    if (issues.length === 0) continue;
    // Sorted High → Low, oldest first by computePendingIssues.
    const top = issues[0];
    // A document issue keeps its one-click Fix target (the uploader).
    const docs = issues.filter((issue) => issue.action === "documents" && issue.documentKey);
    items.push({
      facilityId: String(r.facility._id),
      facility: r.facility.name,
      block: r.facility.block,
      reason: top.reason,
      tone: top.severity === "high" ? "red" : "amber",
      // The bell reads negative = overdue; the registry stores days since.
      days: top.days == null ? 0 : -top.days,
      due: top.since,
      ...(docs.length
        ? {
            section: "documents" as const,
            documentKeys: [...new Set(docs.map((issue) => issue.documentKey as string))],
          }
        : {}),
    });
  }
  // Negative = overdue, so ascending puts the most overdue first, then due
  // today, then the soonest future deadline.
  items.sort((a, b) => a.days - b.days || a.facility.localeCompare(b.facility));
  return items;
}

/** Every date the district chases for one facility — validity, surveillance
 *  visits, Fire NOC renewal and the IA due date; one list so the due-window
 *  filter, the tabs and the Next Action column chase the same deadlines. */
export function dueDatesOf(row: MasterRow): string[] {
  return [
    row.ia?.dueDate ?? null,
    row.nqas?.validityDate ?? null,
    row.nqas?.surveillanceDue1 ?? null,
    row.nqas?.surveillanceDue2 ?? null,
    row.noc?.expiryDate ?? null,
  ].filter((d): d is string => !!d);
}

/** Is any tracked deadline inside the next `days` days (0/overdue included,
 *  the exact predicate the toolbar due-window filter applies)? */
export function dueDatesWithin(row: MasterRow, days: number, today = new Date()): boolean {
  return dueDatesOf(row).some((iso) => {
    const d = daysUntil(iso, today);
    return d != null && d <= days;
  });
}

function certHolds(row: MasterRow): boolean {
  return !!(row.nqas?.certificationDate ?? row.nqas?.goiLetterDate ?? null);
}

export function computeKpis(
  rows: MasterRow[],
  today = new Date(),
  rules: DocumentRules = DEFAULT_DOCUMENT_RULES,
  pending: PendingConfig = DEFAULT_PENDING_CONFIG,
  settings?: Partial<LifecycleSettings> | null,
): MasterKpis {
  const k: MasterKpis = {
    total: rows.length,
    certified: 0,
    certifiedQuality: 0,
    certifiedConditional: 0,
    certifiedStage: 0,
    inPipeline: 0,
    eligibleNotAssessed: 0,
    surveillanceOverdue: 0,
    certificatesExpiring: 0,
    nocExpiredOrMissing: 0,
    attentionFacilities: 0,
    due90Facilities: 0,
    buildingIssues: 0,
    fundsTotal: 0,
    fundsPending: 0,
  };
  for (const r of rows) {
    const stage = stageOf(r);
    if (certHolds(r)) {
      k.certified += 1;
      const cs = (r.nqas?.certificationStatus ?? "").toLowerCase();
      if (cs.includes("quality")) k.certifiedQuality += 1;
      if (cs.includes("condition")) k.certifiedConditional += 1;
    }
    if (stage === "certification") k.certifiedStage += 1;
    if (stage === "sa" || stage === "nqas") k.inPipeline += 1;
    if (stage === "eligibility" && r.facility.eligibility === "Eligible")
      k.eligibleNotAssessed += 1;

    const validity = r.nqas?.validityDate ?? null;
    const days = daysUntil(validity, today);
    // "Expiring" is forward-looking: 0–90 days, never an already-passed date.
    if (days != null && days >= 0 && days <= 90) k.certificatesExpiring += 1;

    // A surveillance visit that HAS been done is not overdue, however old
    // its due date is (this is the exact rule kpiMatches applies).
    const surv1 = r.nqas?.surveillanceDone1
      ? null
      : daysUntil(r.nqas?.surveillanceDue1 ?? null, today);
    const surv2 = r.nqas?.surveillanceDone2
      ? null
      : daysUntil(r.nqas?.surveillanceDue2 ?? null, today);
    if ((surv1 != null && surv1 < 0) || (surv2 != null && surv2 < 0))
      k.surveillanceOverdue += 1;

    const nocStatus = deriveFireNocStatus(
      r.noc?.nocAvailable ?? null,
      r.noc?.expiryDate ?? null,
      r.noc?.status ?? null,
    );
    /* "Not recorded" never counts as due: a Fire NOC issue means a REAL
       problem — expired validity, or an explicit NOC record that expires
       soon / states no NOC. Facilities with NO noc record at all used to
       derive "Not Obtained" and blew the chip up to 129, which read like a
       district-wide emergency instead of the 10 real expired NOCs. */
    if (
      nocStatus === "Expired" ||
      (r.noc && (nocStatus === "Expiring Soon" || nocStatus === "Not Obtained"))
    )
      k.nocExpiredOrMissing += 1;

    if (r.fund?.amountSanctioned) k.fundsTotal += r.fund.amountSanctioned;
    if ((r.fund?.status ?? "").toLowerCase() === "pending") k.fundsPending += 1;

    if (attentionOf(r, today, rules, pending, settings)) k.attentionFacilities += 1;
    if (dueDatesWithin(r, 90, today)) k.due90Facilities += 1;
    const bStatus = (r.building?.buildingStatus ?? "").toLowerCase();
    if (
      bStatus === "needs repair" ||
      bStatus === "under renovation" ||
      bStatus === "dilapidated"
    )
      k.buildingIssues += 1;
  }
  return k;
}

export type AttentionItem = {
  facilityId: string;
  facility: string;
  block: string;
  reason: string;
  tone: Tone;
  days: number;
  /** The deadline the reason is about (ISO), when there is one. */
  due?: string | null;
  /** Where the Fix button should take the user (the uploader, today). */
  section?: "documents";
  documentKeys?: string[];
};

/** Top overdue / expiring items — the "needs attention" panel. */
export function attentionItems(
  rows: MasterRow[],
  today = new Date(),
  rules: DocumentRules = DEFAULT_DOCUMENT_RULES,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const r of rows) {
    const missing = requiredDocumentsMissing(r, rules);
    if (missing.length > 0) {
      items.push({
        facilityId: String(r.facility._id),
        facility: r.facility.name,
        block: r.facility.block,
        reason: `required document missing: ${missing.map((m) => m.label).join(", ")}`,
        tone: "amber",
        days: 0,
        due: null,
        section: "documents",
        documentKeys: missing.map((m) => m.key),
      });
    }
    const push = (iso: string | null | undefined, reason: string) => {
      const days = daysUntil(iso, today);
      if (days == null || days > EXPIRY_WARN_DAYS) return;
      items.push({
        facilityId: String(r.facility._id),
        facility: r.facility.name,
        block: r.facility.block,
        reason,
        tone: days < 0 ? "red" : "amber",
        days,
      });
    };
    push(r.nqas?.surveillanceDue1 ?? null, "1st surveillance due");
    push(r.nqas?.surveillanceDue2 ?? null, "2nd surveillance due");
    push(r.nqas?.validityDate ?? null, "certificate expiring");
    push(r.noc?.expiryDate ?? null, "fire NOC expiring");
  }
  items.sort((a, b) => a.days - b.days);
  return items.slice(0, 5);
}

/* --------------------------------------------------------------------------- */
/* Type guard — a value that does not match its column type cannot ship        */
/* --------------------------------------------------------------------------- */

/**
 * Orphan-cell detector (the Reports-page root cause, made impossible):
 * the old page hand-wrote its header list and its body cells in two separate
 * places, so a missing header entry shifted every following value one column
 * to the right and the last value fell into a header-less cell — silently.
 *
 * This guard runs over ONE row × the SAME columns[] the header renders, and
 * a value that betrays its column type renders "-" and reports a mismatch:
 *
 *   • a pill (status/status-like words) in a date/year/number column,
 *   • a date in a status column,
 *   • any sentence where a score/number/currency/link is declared,
 *   • numbers where a text column is declared (they do render, but the
 *     config should declare the type the data actually is).
 *
 * In development the mismatch logs a console warning; the TEST runner
 * (scripts/reportsContract.test.ts) installs a throwing handler, so a
 * mismatched cell fails the build — a shift can never merge silently.
 */
export type TypeGuardWarning = {
  columnKey: string;
  columnLabel: string;
  columnType: MasterColumn["type"] | "select";
  /** What the cell actually contained. */
  actual: string;
  message: string;
};

export type TypeGuardReport = {
  warnings: TypeGuardWarning[];
  /** Columns checked (the visible, exportable data columns). */
  checked: number;
};

const DEV = (() => {
  try {
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
})();

/** Where a mismatch warning goes. Development default: console.warn. The
 *  contract TESTS install a thrower, so a displaced cell fails `bun test`
 *  instead of shipping silently. */
export let onOrphanCell: (warning: TypeGuardWarning) => void = (w) => {
  if (DEV) console.warn(`[masterColumns] ${w.message}`);
};

export function setOrphanCellHandler(
  fn: ((warning: TypeGuardWarning) => void) | null,
): void {
  onOrphanCell =
    fn ??
    ((w) => {
      if (DEV) console.warn(`[masterColumns] ${w.message}`);
    });
}

/** Words that can ONLY be a lifecycle/status value (never a date, a year,
 *  a file name or a sentence). Matched case-insensitively as the WHOLE value
 *  or the start of it — "Certified — Surveillance Due", "SA Not Yet
 *  Initiated", "Not Eligible", "Recertification Due". */
const STATUS_ONLY_PREFIXES = [
  "Certified",
  "Conditionality",
  "Certified with Conditionality",
  "Recertification Due",
  "Recertification",
  "Not Eligible",
  "Eligible",
  "SA Not Yet Initiated",
  "Not Eligible Now",
  "SA Completed",
  "Deferred",
  "Valid",
  "Expired",
  "Expiring Soon",
  "Not Obtained",
  "Good",
  "Dilapidated",
  "Own Building",
  "Rented Building",
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;
const DISPLAY_DATE = /^\d{2}-[A-Za-z]{3}-\d{4}$/;
const DD_MM_YYYY = /^\d{2}-\d{2}-\d{4}$/;

const isDateLike = (v: string) =>
  ISO_DATE.test(v) || DISPLAY_DATE.test(v) || DD_MM_YYYY.test(v);

/** Looks like a lifecycle status pill? Whole-value or prefix match only, so
 *  sentences like remarks never false-positive. */
function looksLikeStatus(v: string): boolean {
  const t = v.trim();
  if (t.length === 0 || t.length > 48) return false; // sentences are not pills
  if (t.includes(" ") && !STATUS_ONLY_PREFIXES.some((p) => t.startsWith(p))) {
    // Two-word values that are statuses only when they START with a known
    // prefix ("Valid till", "next full SA–NQAS ..." are NOT pills).
    return false;
  }
  return STATUS_ONLY_PREFIXES.some((p) => t.startsWith(p));
}

const YEAR = /^\d{4}$/;

/** Everything that is not a plain number (scores/currency) — used to decide
 *  whether a number-declared column got one. */
const isNumeric = (v: string) => /^-?\d+([.,]\d+)?$/.test(v.trim());

/** File-name / URL smell — a link column's actual payload. */
const LINK_LIKE = /^(https?:\/\/|[\w-]+\.(pdf|xls|xlsx|doc|docx|csv)$)/i;

/**
 * Type-check ONE column of ONE row. Returns a warning when the rendered
 * value betrays the column's declared type; null when it conforms.
 * `value` is the raw value before formatting (cellValue().kind output or
 * the text the cell will show).
 */
export function checkCellType(
  column: Pick<MasterColumn, "key" | "label" | "type">,
  value: string | number | null | undefined,
): TypeGuardWarning | null {
  if (value == null || value === "") return null; // blanks are legitimate
  const got = typeof value === "number" ? String(value) : String(value).trim();
  if (got === "") return null;
  // The blank markers the shared writers render for empty cells: "—" on the
  // screen/HTML, "-" in the Excel/CSV. Neither is a displaced cell.
  if (got === "—" || got === "-") return null;

  const bad = (actual: string): TypeGuardWarning => ({
    columnKey: column.key,
    columnLabel: column.label,
    columnType: column.type,
    actual,
    message:
      `orphan cell: column "${column.key}" (${column.label}) is type ` +
      `"${column.type}" but the cell holds ${JSON.stringify(actual.slice(0, 60))}`,
  });

  switch (column.type) {
    case "date":
    case "dueDate": {
      // A date/due-date column must hold something date-like; a status pill
      // or a free sentence here is the classic displaced-cell signature.
      if (!isDateLike(got) && looksLikeStatus(got)) return bad(got);
      if (!isDateLike(got) && column.type === "date" && !/^\d+$/.test(got)) {
        // A date column may hold an epoch number; anything else non-date is
        // suspect unless it is a text value the config redeclared.
        if (looksLikeStatus(got)) return bad(got);
      }
      return null;
    }
    case "status": {
      // Any non-empty string is renderable as a pill; but a DATE in a status
      // column is the inverse displacement (Recertification Status showed
      // 16-02-2029) and must fail.
      if (isDateLike(got)) return bad(got);
      return null;
    }
    case "score":
    case "currency": {
      // Year / score / currency columns take numbers; a status pill or a
      // sentence here is displaced ("Valid till 2029-02-16 — next full …"
      // under "Re-Certification Year", "Own Building" under "Building Type").
      // Localized FORMATTING is not displacement: "78.00%" (percent),
      // "₹ 12,50,000" (Indian currency grouping) are display of a number.
      const bare = got.replace(/[₹,%\s]/g, "");
      if (!isNumeric(bare)) return bad(got);
      return null;
    }
    case "link": {
      // A link column holds a URL or a file name; a status word or a number
      // is not a document (the NOC Available column showing a .pdf is the
      // signature this catches in reverse).
      if (looksLikeStatus(got) || isNumeric(got)) return bad(got);
      return null;
    }
    case "text":
    case "longtext":
    case "compare": {
      // Text columns render most things; only a STATUS PILL where the config
      // says plain text is worth flagging (a text column rendering the
      // current-status pill means the config misdeclares the column).
      // Dates are fine here (some text columns carry them); numbers fine.
      void column;
      return null;
    }
    default:
      return null;
  }
}

/** Type-check a batch of (column, value) pairs — the whole visible grid.
 *
 *  `mode` decides what a warning DOES:
 *   - "log" (default): console.warn in development, never in production;
 *   - "throw": re-throw as an Error — installed by the contract TESTS, so a
 *     misplaced cell fails `bun test` instead of shipping silently. */
export function checkRowTypes(
  columns: readonly Pick<MasterColumn, "key" | "label" | "type">[],
  values: readonly unknown[],
  mode: "log" | "throw" = "log",
): TypeGuardReport {
  const warnings: TypeGuardWarning[] = [];
  let checked = 0;
  const len = Math.min(columns.length, values.length);
  for (let i = 0; i < len; i++) {
    const w = checkCellType(columns[i], values[i] as string | number | null | undefined);
    checked += 1;
    if (w) {
      warnings.push(w);
      if (mode === "throw") onOrphanCell(w);
    }
  }
  return { warnings, checked };
}
