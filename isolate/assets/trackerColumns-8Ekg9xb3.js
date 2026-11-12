import { o as Flame, B as Building2, $ as Target, l as RefreshCcw, n as IndianRupee, bP as HeartPulse, bn as HandCoins, bJ as ClipboardPen, h as ClipboardCheck, N as CalendarClock, b8 as BadgeCheck, j as Award } from './icons-BxQpodNr.js';
import { C as COLUMN_BY_KEY, ct as navIcon } from './AppShell-CP099uvN.js';

const CATEGORY_ICONS = {
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
  Flame
};
const TRACKER_COLUMN_LABELS = {
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
  remarks: "Remarks"
};
const TRACKER_COLUMN_WIDTHS = {
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
  remarks: "min-w-48"
};
const MASTER_COLUMN_ORDER = [
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
  "remarks"
];
const MASTER_TABLE_HEADER_LABELS = [
  ...MASTER_COLUMN_ORDER.map((id) => TRACKER_COLUMN_LABELS[id]),
  "Last Updated"
];
function headerLabelCategory(label) {
  const id = MASTER_COLUMN_ORDER.find((x) => TRACKER_COLUMN_LABELS[x] === label);
  return id ? columnCategory(id) : null;
}
const CATEGORY_COLUMN_IDS = {
  certification: [
    "pipelineStatus",
    "certStatus",
    "certDate",
    "certScore",
    "resultDoc",
    "naScheduled",
    "naEnd",
    "naMode",
    "departments"
  ],
  sa: [
    "genDoc",
    "saStatus",
    // State Assessment page keeps its SaQsham docs filter (FacilityDataPage)
    "saScore",
    "saStart",
    "saEnd",
    "saAssessor1",
    "saAssessor1Hud",
    "saAssessor2",
    "saAssessor2Hud",
    "saReport",
    "saChecklist"
  ],
  recert: [
    "survDue1",
    "surv1",
    "survDue2",
    "surv2",
    "survScore",
    "validityDate",
    "recertStatus",
    "recertYear"
  ],
  ia: ["nqasIaQ1", "nqasIaQ2", "nqasIaCmp", "kayakalpIaQ1", "kayakalpIaQ2", "kayakalpIaCmp"],
  fund: ["gapAmount", "gcYear", "procLink"],
  building: ["buildingType", "buildingStatus", "condemned", "remarks"],
  noc: ["nocAvailable", "nocStatus", "nocCertified", "nocValidity", "nocDoc"]
};
const CATEGORY_META = {
  sa: { label: "State Assessment", icon: "ClipboardCheck", quick: true, route: "/facilities/state-assessment" },
  certification: { label: "NQAS Certification", icon: "BadgeCheck", quick: true, route: "/facilities/certification" },
  recert: { label: "Recertification", icon: "RefreshCcw", quick: true, route: "/facilities/recertification" },
  ia: { label: "Internal Assessment", icon: "ClipboardPen", quick: true, route: "/facilities/internal-assessment" },
  fund: { label: "Gap Closure Fund", icon: "HandCoins", quick: true, route: "/facilities/fund" },
  building: { label: "Building", icon: "Building2", quick: true, route: "/facilities/building" },
  noc: { label: "Fire NOC", icon: "Flame", quick: true, route: "/facilities/fire-noc" }
};
Object.keys(CATEGORY_META).filter((id) => CATEGORY_META[id].quick);
function categoryFromRoute(path) {
  const hit = Object.keys(CATEGORY_META).find((id) => CATEGORY_META[id].route === path);
  return hit ?? null;
}
function getCategoryRoute(id) {
  return CATEGORY_META[id].route;
}
function columnCategory(id) {
  for (const cat of Object.keys(CATEGORY_COLUMN_IDS)) {
    if (CATEGORY_COLUMN_IDS[cat].includes(id)) return cat;
  }
  return null;
}

export { CATEGORY_META as C, MASTER_TABLE_HEADER_LABELS as M, TRACKER_COLUMN_LABELS as T, CATEGORY_ICONS as a, CATEGORY_COLUMN_IDS as b, categoryFromRoute as c, TRACKER_COLUMN_WIDTHS as d, getCategoryRoute as g, headerLabelCategory as h };
