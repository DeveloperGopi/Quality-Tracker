/**
 * SYSTEM MAP — the one content config.
 *
 * Nodes, edges, lane labels, specs, page cards, tools and feature badges live
 * here. The page reads live counts/settings through the existing queries; only
 * the SHAPE of the map is code. State Admin text edits are stored in
 * appSettings.systemMapText and audit-logged by facilities.setSetting.
 */

import { ACTIVE_DOC_TYPES } from "@/convex/storage/validation";
import { issueRules } from "@/lib/pending";

export type MapLaneId =
  | "facility"
  | "eligibility"
  | "state"
  | "nqas"
  | "result"
  | "certification"
  | "surveillance"
  | "expiry"
  | "reapply"
  | "cycle2";

export type CountKey =
  | "notEligible"
  | "notStarted"
  | "stateAssessment"
  | "naScheduled"
  | "resultAwaited"
  | "qualityCertified"
  | "conditional"
  | "deferred";

export type SystemNode = {
  id: string;
  lane: MapLaneId;
  laneLabel: string;
  title: string;
  short: string;
  x: number;
  y: number;
  width: number;
  height: number;
  countKey?: CountKey;
  side?: boolean;
  summary: string;
  rules: string[];
  fields: string[];
  documents: string[];
  pendingRules: string[];
  roles: string[];
  links: { label: string; to: string }[];
};

export type SystemEdge = {
  from: string;
  to: string;
  label?: string;
  loop?: boolean;
};

export const LANE_LABELS: Record<MapLaneId, string> = {
  facility: "Facility",
  eligibility: "Eligibility",
  state: "State Assessment",
  nqas: "NQAS Assessment",
  result: "Result",
  certification: "Certification",
  surveillance: "Surveillance",
  expiry: "Expiry",
  reapply: "Re-application",
  cycle2: "Cycle #2",
};

export const SYSTEM_NODES: SystemNode[] = [
  {
    id: "facility",
    lane: "facility",
    laneLabel: "Facility",
    title: "Facility",
    short: "A PHC / CHC enters the tracker",
    x: 170,
    y: 35,
    width: 380,
    height: 56,
    countKey: "notEligible",
    summary:
      "Every PHC and CHC in the district is in one register. The Master List is the working copy; imports and profile edits write the same records.",
    rules: [
      "One record per facility; NIN is the identity used by imports.",
      "Blank values stay blank. A blank is never shown as 0.",
      "A facility can be re-assessed only through a new re-application cycle.",
    ],
    fields: ["Facility name", "NIN", "Block and PHC", "Facility type", "Current status"],
    documents: ["Condemned", "NOC"],
    pendingRules: ["data.nin-missing", "noc.not-recorded", "building.dilapidated"],
    roles: ["admin", "dqc", "dqmo", "entry", "viewer"],
    links: [
      { label: "Open Facility Master List", to: "/facilities" },
      { label: "Open Data checks", to: "/admin/data-checks" },
    ],
  },
  {
    id: "eligibility",
    lane: "eligibility",
    laneLabel: "Eligibility",
    title: "Eligibility",
    short: "The facility is checked against the NQAS entry rules",
    x: 170,
    y: 119,
    width: 380,
    height: 56,
    countKey: "notStarted",
    summary:
      "The district marks a facility Eligible or Not Eligible. An eligible facility starts the Internal Assessment and State Assessment steps.",
    rules: [
      "Eligibility is a decision, not a score.",
      "A new cycle starts ONLY when a re-application is recorded.",
      "A deferred facility is never moved into Certified.",
    ],
    fields: ["Eligibility", "Current cycle", "Cycle type", "Previous cycle"],
    documents: [],
    pendingRules: ["pending.sa-not-scheduled", "data.nin-missing"],
    roles: ["admin", "dqc", "dqmo", "entry"],
    links: [
      { label: "Open Master List · eligibility", to: "/facilities?eligibility=Eligible" },
      { label: "Open Pending & Follow-up", to: "/pending" },
    ],
  },
  {
    id: "state-assessment",
    lane: "state",
    laneLabel: "State Assessment",
    title: "State Assessment",
    short: "The State Quality team assesses the facility",
    x: 170,
    y: 203,
    width: 380,
    height: 56,
    countKey: "stateAssessment",
    summary:
      "The State team checks the facility against the NQAS standards, records the visit dates and uploads the SA report and checklist.",
    rules: [
      "State Assessment starts only after the facility is Eligible.",
      "A scheduled assessment with a past start date becomes a pending item.",
      "Visit dates must be real visits; a done date cannot equal the due date.",
    ],
    fields: [
      "SA status",
      "Scheduled start / end",
      "Actual visit dates",
      "Score %",
      "Assessor names",
      "General document status",
    ],
    documents: ["SA_Report", "SA_Checklist"],
    pendingRules: [
      "pending.sa-scheduled-passed",
      "pending.sa-not-scheduled",
      "data.sa-date-range",
      "data.surveillance-equals-due",
    ],
    roles: ["admin", "dqc", "dqmo", "entry"],
    links: [
      { label: "Open State Assessment list", to: "/facilities/state-assessment" },
      { label: "Open Master List · State", to: "/facilities/state-assessment" },
    ],
  },
  {
    id: "nqas-assessment",
    lane: "nqas",
    laneLabel: "NQAS Assessment",
    title: "NQAS Assessment",
    short: "The national assessment is scheduled and completed",
    x: 170,
    y: 287,
    width: 380,
    height: 56,
    countKey: "naScheduled",
    summary:
      "A national assessment is scheduled after the State round. The team records the visit dates, scores and the result documents.",
    rules: [
      "NQAS can be scheduled only after the State Assessment has progressed.",
      "A scheduled date in the past is a pending follow-up.",
      "The NQAS Result file is the evidence for the certification step.",
    ],
    fields: ["NA status", "Scheduled dates", "Actual dates", "Score %", "Assessor details"],
    documents: ["NQAS_Result"],
    pendingRules: [
      "pending.nqas-scheduled-passed",
      "pending.result-awaited",
      "data.nqas-date-range",
      "data.nqas-completed-no-score",
    ],
    roles: ["admin", "dqc", "dqmo", "entry"],
    links: [
      { label: "Open NQAS Certification list", to: "/facilities/certification" },
      { label: "Open Master List", to: "/facilities" },
    ],
  },
  {
    id: "result",
    lane: "result",
    laneLabel: "Result",
    title: "Result",
    short: "The assessment result is declared",
    x: 170,
    y: 371,
    width: 380,
    height: 56,
    countKey: "resultAwaited",
    summary:
      "The result is recorded as Quality Certified, Certified with Conditionality or Deferred. The certificate dates and validity are entered here.",
    rules: [
      "Result Declared is set from the result, never guessed from a score.",
      "A deferred result is never treated as a certificate.",
      "A certificate without a validity date is a pending data issue.",
    ],
    fields: ["Certification status", "Result date", "Certificate date", "Validity date", "Score %"],
    documents: ["NQAS_Result"],
    pendingRules: [
      "pending.result-awaited",
      "data.certified-no-date",
      "data.certified-not-eligible",
      "certificate.expired",
      "certificate.expiring",
    ],
    roles: ["admin", "dqc", "dqmo"],
    links: [
      { label: "Open NQAS Certification list", to: "/facilities/certification" },
      { label: "Open Pending & Follow-up", to: "/pending" },
    ],
  },
  {
    id: "quality-certified",
    lane: "certification",
    laneLabel: "Certification",
    title: "Quality Certified",
    short: "The facility holds a certificate",
    x: 130,
    y: 455,
    width: 190,
    height: 56,
    countKey: "qualityCertified",
    summary:
      "The facility is certified without conditions. Surveillance continues during the validity period.",
    rules: [
      "A certificate is never created by a deferred result.",
      "Surveillance is due during the validity period.",
      "A new cycle starts only after re-application.",
    ],
    fields: ["Certificate date", "Validity date", "Score %", "Surveillance dates"],
    documents: ["NQAS_Result"],
    pendingRules: ["surveillance.overdue", "surveillance.due-soon", "certificate.expired"],
    roles: ["admin", "dqc", "dqmo"],
    links: [{ label: "Open certified facilities", to: "/facilities/certification" }],
  },
  {
    id: "conditional",
    lane: "certification",
    laneLabel: "Certification",
    title: "Certified with Conditionality",
    short: "The certificate carries conditions",
    x: 340,
    y: 455,
    width: 190,
    height: 56,
    countKey: "conditional",
    summary:
      "The facility is certified subject to conditions. The conditionality list and gap-closure evidence are followed up.",
    rules: [
      "Conditionality is a certificate, not a deferred result.",
      "Gap-closure evidence is required when the condition needs it.",
      "Surveillance still applies.",
    ],
    fields: ["Certificate date", "Validity date", "Score %", "Conditionality note"],
    documents: ["NQAS_Result", "Gap_Closure"],
    pendingRules: ["surveillance.overdue", "certificate.expiring", "doc.gap-closure"],
    roles: ["admin", "dqc", "dqmo"],
    links: [{ label: "Open certification list", to: "/facilities/certification" }],
  },
  {
    id: "deferred",
    lane: "certification",
    laneLabel: "Certification",
    title: "Deferred",
    short: "The assessment did not pass",
    x: 550,
    y: 455,
    width: 190,
    height: 56,
    countKey: "deferred",
    summary:
      "The facility did not pass this attempt. It waits through the cooling period and starts again only when a new re-application is recorded.",
    rules: [
      "Deferred is never Certified.",
      "A new cycle starts only on a re-application.",
      "The cooling period is a wait, not a certificate.",
    ],
    fields: ["Deferred date", "Cooling period", "Re-application date", "Next cycle"],
    documents: ["NQAS_Result"],
    pendingRules: ["pending.deferred-cooling"],
    roles: ["admin", "dqc", "dqmo"],
    links: [
      { label: "Open Deferred facilities", to: "/facilities/certification" },
      { label: "Open Pending & Follow-up", to: "/pending" },
    ],
  },
  {
    id: "surveillance",
    lane: "surveillance",
    laneLabel: "Surveillance",
    title: "Surveillance",
    short: "The certificate stays under review",
    x: 170,
    y: 539,
    width: 380,
    height: 56,
    summary:
      "Surveillance visits are recorded during the certificate validity. Overdue or due-soon visits become pending items.",
    rules: [
      "A surveillance visit needs a real done date.",
      "Done and due dates cannot be the same.",
      "Future done dates are data errors.",
    ],
    fields: ["Surveillance visits", "Due dates", "Done dates", "Score %"],
    documents: [],
    pendingRules: ["surveillance.overdue", "surveillance.due-soon", "data.surveillance-future"],
    roles: ["admin", "dqc", "dqmo"],
    links: [{ label: "Open Recertification list", to: "/facilities/recertification" }],
  },
  {
    id: "expiry",
    lane: "expiry",
    laneLabel: "Expiry",
    title: "Expiry",
    short: "The certificate validity ends",
    x: 170,
    y: 623,
    width: 380,
    height: 56,
    summary:
      "The validity date closes the current certificate. Expiry is a date fact, not a hidden status change.",
    rules: [
      "An expired certificate cannot be shown as current.",
      "The facility remains in the register; nothing is deleted.",
      "A fresh assessment needs a new cycle.",
    ],
    fields: ["Validity date", "Days left", "Certificate status"],
    documents: ["NQAS_Result"],
    pendingRules: ["certificate.expired", "certificate.expiring"],
    roles: ["admin", "dqc", "dqmo"],
    links: [{ label: "Open Recertification list", to: "/facilities/recertification" }],
  },
  {
    id: "reapply",
    lane: "reapply",
    laneLabel: "Re-application",
    title: "Re-application",
    short: "The facility asks for another assessment",
    x: 170,
    y: 707,
    width: 380,
    height: 56,
    summary:
      "A re-application is the only door to a new cycle. It creates the next cycle and carries the facility back to Eligibility.",
    rules: [
      "A new cycle starts only on a re-application.",
      "The old cycle is kept, never overwritten.",
      "Do not create a cycle by editing a status.",
    ],
    fields: ["Re-application date", "Previous cycle", "Next cycle number", "Reason"],
    documents: [],
    pendingRules: ["data.certified-no-date"],
    roles: ["admin", "dqc", "dqmo"],
    links: [{ label: "Open Recertification list", to: "/facilities/recertification" }],
  },
  {
    id: "cycle2",
    lane: "cycle2",
    laneLabel: "Cycle #2",
    title: "Cycle #2",
    short: "The next cycle loops back to Eligibility",
    x: 170,
    y: 791,
    width: 380,
    height: 56,
    summary:
      "Cycle #2 repeats the same rules with a new cycle number. The previous cycle stays in history.",
    rules: [
      "Every cycle keeps its own assessments and result.",
      "The loop returns to Eligibility, not directly to Certification.",
      "A deferred result can enter a new cycle only through re-application.",
    ],
    fields: ["Cycle number", "Cycle type", "Status", "Previous cycle"],
    documents: [],
    pendingRules: ["pending.sa-not-scheduled"],
    roles: ["admin", "dqc", "dqmo", "entry"],
    links: [{ label: "Open Recertification list", to: "/facilities/recertification" }],
  },
];

export const SYSTEM_EDGES: SystemEdge[] = [
  { from: "facility", to: "eligibility" },
  { from: "eligibility", to: "state-assessment" },
  { from: "state-assessment", to: "nqas-assessment" },
  { from: "nqas-assessment", to: "result" },
  { from: "result", to: "quality-certified" },
  { from: "result", to: "conditional" },
  { from: "result", to: "deferred" },
  { from: "quality-certified", to: "surveillance" },
  { from: "conditional", to: "surveillance" },
  { from: "deferred", to: "cycle2" },
  { from: "surveillance", to: "expiry" },
  { from: "expiry", to: "reapply" },
  { from: "reapply", to: "cycle2" },
  { from: "cycle2", to: "eligibility", label: "next cycle", loop: true },
];

const PENDING_STEP: Record<string, string> = {
  "doc.nqas-result": "Result / Certification",
  "doc.required": "Facility / Result",
  "doc.drive-missing": "Documents",
  "doc.sa-report": "State Assessment",
  "doc.gap-closure": "Certification",
  "doc.condemned": "Facility",
  "doc.fire-noc": "Facility",
  "not-updated.no-change": "Facility",
  "not-updated.ia-quarter": "Internal Assessment",
  "not-updated.saqsham": "Facility",
  "pending.sa-scheduled-passed": "State Assessment",
  "pending.nqas-scheduled-passed": "NQAS Assessment",
  "pending.result-awaited": "Result",
  "pending.sa-not-scheduled": "Eligibility",
  "pending.deferred-cooling": "Deferred",
  "certificate.expired": "Expiry",
  "certificate.expiring": "Expiry",
  "surveillance.overdue": "Surveillance",
  "surveillance.due-soon": "Surveillance",
  "noc.expired": "Facility / Fire NOC",
  "noc.expiring": "Facility / Fire NOC",
  "noc.not-recorded": "Facility / Fire NOC",
  "building.dilapidated": "Facility / Building",
  "data.surveillance-future": "Surveillance",
  "data.certified-no-date": "Result / Certification",
  "data.nqas-completed-no-score": "NQAS Assessment",
  "data.certified-not-eligible": "Certification",
  "data.nin-missing": "Facility",
  "data.noc-derived": "Facility / Fire NOC",
  "data.noc-conflict": "Facility / Fire NOC",
  "data.sa-date-range": "State Assessment",
  "data.nqas-date-range": "NQAS Assessment",
  "data.surveillance-equals-due": "Surveillance",
};

export const SIDE_LANES = [
  {
    id: "documents",
    title: "Documents",
    hint: "Six current document types",
    items: ACTIVE_DOC_TYPES.map((doc) => ({
      id: doc.key,
      label: doc.label,
      detail:
        doc.key === "SA_Report" || doc.key === "SA_Checklist"
          ? "Needed at State Assessment"
          : doc.key === "NQAS_Result"
            ? "Needed at NQAS Assessment / Result"
            : doc.key === "Gap_Closure"
              ? "Needed for a conditional certificate"
              : doc.key === "Condemned"
                ? "Needed when a building is condemned"
                : "Needed when a Fire NOC is recorded",
    })),
  },
  {
    id: "imports",
    title: "Imports",
    hint: "The two bulk paths",
    items: [
      { id: "ia", label: "IA import", detail: "Quarterly Internal Assessment scores" },
      { id: "saqsham", label: "SaQsham import", detail: "Portal status and document names" },
    ],
  },
  {
    id: "pending",
    title: "Pending rules",
    hint: `${issueRules.length} rules in one registry`,
    items: issueRules.map((rule) => ({
      id: rule.id,
      label: rule.label,
      detail: `${PENDING_STEP[rule.id] ?? "Any step"} · ${rule.defaultEnabled ? "on" : "off"} · ${rule.defaultSeverity}`,
    })),
  },
  {
    id: "reports",
    title: "Reports",
    hint: "Built from the same rows",
    items: [
      { id: "summary", label: "NQAS Summary Report", detail: "District, block and PHC totals" },
      { id: "linelists", label: "Line lists", detail: "Topic-wise facility lists" },
      { id: "master", label: "Master and profile exports", detail: "Excel, PDF and print" },
    ],
  },
] as const;

export const SPEC = {
  purpose:
    "One place that shows how the NQAS tracker works end to end: the facility journey, the rules that never move, the pages people use, and the tools that keep the data right.",
  nonNegotiable: [
    "A deferred result is never Certified.",
    "A new cycle starts only when a re-application is recorded.",
    "Blank values stay blank and show “-”, never 0.",
    "Dates are DD-MMM-YYYY in IST.",
    "Google Drive ids, links and tokens are never shown.",
    "Old cycles are kept; records are not silently overwritten.",
    "Every change is written to Audit and logs.",
    "Import, profile edit and report read the same database columns.",
  ],
  entities: [
    "Facility master (name, NIN, block, PHC, type, eligibility)",
    "Certification cycle (number, dates, current status, validity)",
    "State assessment (schedule, visit dates, report, score)",
    "NQAS assessment (schedule, visit dates, result, score)",
    "Documents (six current types, one row per cycle)",
    "Internal Assessment (quarterly scores)",
    "Gap closure fund, building details and Fire NOC",
    "Pending issues, saved filters, audit entries and settings",
  ],
  speed: [
    "List filtering works in memory on loaded rows.",
    "The System Map live count is one aggregate query.",
    "No query is sent on every keystroke.",
    "Exports are built from the same filtered rows as the screen.",
  ],
  integrations: [
    "Google Drive stores private document copies; the app never exposes Drive ids or links.",
    "SaQsham portal status is imported, not manually retyped.",
    "Excel, PDF and print read the live column configuration.",
    "The result reader is controlled by one Admin switch.",
  ],
  statusLists: [
    {
      title: "Certification result",
      values: ["Quality Certified", "Certified with Conditionality", "Deferred"],
    },
    {
      title: "Assessment status",
      values: ["Not Yet Initiated", "Scheduled", "Completed", "Result Awaited", "Result Declared"],
    },
    {
      title: "Surveillance",
      values: ["Due", "Done", "Overdue", "Not recorded"],
    },
  ],
} as const;

export type PageFunction = {
  id: string;
  title: string;
  to: string;
  purpose: string;
  functions: string[];
  roles: string[];
};

export const PAGE_FUNCTIONS: PageFunction[] = [
  { id: "dashboard", title: "Dashboard", to: "/dashboard", purpose: "The district picture: KPIs, pipeline and alerts.", functions: ["Read KPIs", "Open a stage", "See alerts"], roles: ["admin", "dqc", "dqmo", "entry", "viewer"] },
  { id: "master", title: "Facility Master List", to: "/facilities", purpose: "The working register for every facility.", functions: ["Search and filter any column", "Open a profile", "Export Excel / PDF", "Print a facility sheet"], roles: ["admin", "dqc", "dqmo", "entry", "viewer"] },
  { id: "reports", title: "Reports & Export", to: "/reports", purpose: "Topic-wise reports and downloads from the same rows.", functions: ["Summary", "Cycle report", "Line lists", "Master export"], roles: ["admin", "dqc", "dqmo", "entry", "viewer"] },
  { id: "state", title: "State Assessment", to: "/facilities/state-assessment", purpose: "State round schedule, visit dates, report and score.", functions: ["See SA list", "Edit dates", "Open documents"], roles: ["admin", "dqc", "dqmo", "entry"] },
  { id: "certification", title: "NQAS Certification", to: "/facilities/certification", purpose: "Result, certificate dates and validity.", functions: ["See results", "Open conditions", "Check expiry"], roles: ["admin", "dqc", "dqmo"] },
  { id: "recert", title: "Recertification", to: "/facilities/recertification", purpose: "Surveillance, expiry and the next cycle.", functions: ["See due visits", "Plan re-application", "Open the profile"], roles: ["admin", "dqc", "dqmo"] },
  { id: "ia", title: "Internal Assessment", to: "/facilities/internal-assessment", purpose: "Quarterly IA scores by facility.", functions: ["Read scores", "Compare quarters", "Import IA"], roles: ["admin", "dqc", "dqmo", "entry"] },
  { id: "fund", title: "Gap Closure Fund", to: "/facilities/fund", purpose: "Fund release and gap-closure evidence.", functions: ["See amounts", "Open evidence", "Filter by block"], roles: ["admin", "dqc", "dqmo", "entry"] },
  { id: "building", title: "Building", to: "/facilities/building", purpose: "Building details and condemned status.", functions: ["See status", "Open the profile", "Check the certificate"], roles: ["admin", "dqc", "dqmo", "entry"] },
  { id: "noc", title: "Fire NOC", to: "/facilities/fire-noc", purpose: "Fire NOC dates, validity and evidence.", functions: ["See expiries", "Open the NOC", "Fix missing entries"], roles: ["admin", "dqc", "dqmo", "entry"] },
  { id: "summary", title: "NQAS Summary Report", to: "/summary-report", purpose: "Printable district and block summary.", functions: ["Read totals", "Print", "Export"], roles: ["admin", "dqc", "dqmo", "entry", "viewer"] },
  { id: "custom", title: "Custom Report Builder", to: "/custom-report", purpose: "Build a report from the columns you choose.", functions: ["Choose columns", "Filter rows", "Save a report"], roles: ["admin", "dqc", "dqmo", "entry", "viewer"] },
  { id: "ppt", title: "Generate PPT", to: "/generate-ppt", purpose: "A slide deck from the current tracker data.", functions: ["Pick sections", "Preview", "Download"], roles: ["admin", "dqc", "dqmo", "entry", "viewer"] },
  { id: "pending", title: "Pending & Follow-up", to: "/pending", purpose: "Every issue that needs a person or a date.", functions: ["Filter issues", "Open a fix", "Record a follow-up"], roles: ["admin", "dqc", "dqmo", "entry"] },
  { id: "compare", title: "Block Compare", to: "/block-compare", purpose: "Compare all blocks on certification, IA, documents and issues.", functions: ["Read the heatmap", "Rank blocks", "Open a filtered list"], roles: ["admin", "dqc", "dqmo"] },
  { id: "links", title: "Links Organiser", to: "/links", purpose: "The register of report and data-collection links.", functions: ["Search links", "Add a link", "Mark due"], roles: ["admin", "dqc", "dqmo", "entry", "viewer"] },
  { id: "documents", title: "Documents", to: "/documents", purpose: "Every current facility document in one place.", functions: ["Upload", "Open files", "Download a ZIP"], roles: ["admin", "dqc", "dqmo", "entry", "viewer"] },
  { id: "guide", title: "Admin Guide", to: "/guide", purpose: "Task-first help for every page.", functions: ["Search help", "Follow a task", "Print the guide"], roles: ["admin"] },
  { id: "bulk", title: "Bulk Import", to: "/bulk-import", purpose: "Master, SaQsham and IA imports with a review step.", functions: ["Choose a file", "Review", "Apply with Undo"], roles: ["admin", "entry"] },
  { id: "admin", title: "Admin Settings", to: "/admin", purpose: "Workspace rules, users, pages and maintenance.", functions: ["Change settings", "Manage users", "Open audit"], roles: ["admin"] },
  { id: "checks", title: "Admin · Data checks", to: "/admin/data-checks", purpose: "Find and fix stored-data problems.", functions: ["Review each check", "Apply a fix", "Undo"], roles: ["admin"] },
  { id: "audit", title: "Admin · Audit and logs", to: "/admin/audit", purpose: "Who changed what, when and from which value.", functions: ["Search", "Filter by table", "Expand a value"], roles: ["admin"] },
  { id: "users", title: "Admin · Users", to: "/admin/users", purpose: "Approve, invite and scope accounts.", functions: ["Approve", "Change role", "Assign blocks"], roles: ["admin"] },
  { id: "filters", title: "Admin · Filters", to: "/admin?tab=filters", purpose: "Default filter sets for shared pages.", functions: ["Set a default", "Reset", "See the page"], roles: ["admin"] },
];

export type SystemTool = {
  id: string;
  title: string;
  purpose: string;
  steps: [string, string, string];
  to: string;
  linkLabel: string;
};

export const SYSTEM_TOOLS: SystemTool[] = [
  { id: "uploader", title: "Uploader", purpose: "Put a document on the right facility and cycle.", steps: ["Open Documents and find the cell.", "Choose the file and check the match.", "Confirm; the upload is audited."], to: "/documents", linkLabel: "Open Documents" },
  { id: "bulk", title: "Bulk Import", purpose: "Change many facilities at once with a review step.", steps: ["Choose Master, SaQsham or IA.", "Review every row and warning.", "Apply; Undo is available on the result."], to: "/bulk-import", linkLabel: "Open Bulk Import" },
  { id: "checks", title: "Data checks", purpose: "Find dates, names and documents that do not make sense.", steps: ["Open a check card.", "Filter and preview the fix.", "Confirm; the change is audited."], to: "/admin/data-checks", linkLabel: "Open Data checks" },
  { id: "zip", title: "ZIP download", purpose: "Take a folder of documents for a block or facility.", steps: ["Set the block or facility filter.", "Choose the documents.", "Download the ZIP."], to: "/documents", linkLabel: "Open Documents" },
  { id: "exports", title: "PDF and Excel export", purpose: "Download the same rows the screen shows.", steps: ["Set the filters.", "Open Export.", "Choose Excel, PDF or CSV."], to: "/facilities", linkLabel: "Open Master List" },
  { id: "ppt", title: "PPT generator", purpose: "Build a review deck from the tracker.", steps: ["Pick the sections.", "Check the preview.", "Download the deck."], to: "/generate-ppt", linkLabel: "Open PPT generator" },
  { id: "qr", title: "Facility sheet QR", purpose: "Print a sheet whose QR opens the same digital copy.", steps: ["Open a facility profile.", "Print the facility sheet with QR.", "Scan to open the saved copy."], to: "/facilities", linkLabel: "Open Master List" },
  { id: "filters", title: "Filters", purpose: "Save a filter set and share it with a role.", steps: ["Apply the filters.", "Open ⋯ and Save this filter.", "Reload or share the link."], to: "/facilities", linkLabel: "Try filters" },
  { id: "undo", title: "Undo and Audit", purpose: "See what changed and reverse a safe change.", steps: ["Apply a fix or import.", "Use Undo on the result toast.", "Open Audit and logs for the full history."], to: "/admin/audit", linkLabel: "Open Audit and logs" },
];

export type SystemFeature = {
  id: string;
  title: string;
  description: string;
  status: "Live" | "Off by default" | "Planned";
  settingKey?: string;
  to?: string;
};

export const SYSTEM_FEATURES: SystemFeature[] = [
  { id: "reader", title: "Read NQAS result", description: "Read Annexure I scores from a result PDF. The switch is in Admin → Documents.", status: "Off by default", settingKey: "resultReaderEnabled", to: "/admin/documents" },
  { id: "saqsham", title: "SaQsham status import", description: "Import portal status and document names for many facilities.", status: "Live", to: "/bulk-import/saqsham" },
  { id: "ia", title: "Quarterly IA import", description: "Import Internal Assessment scores for a quarter.", status: "Live", to: "/bulk-import/internal-assessment" },
  { id: "pending", title: "Pending rules", description: "The same rule registry feeds the bell, the badge, Pending and Quick View.", status: "Live", to: "/pending" },
  { id: "filters", title: "Saved and shared filters", description: "Save a filter, set a default, or share it with a role.", status: "Live", to: "/facilities" },
  { id: "digest", title: "Scheduled email digest", description: "A weekly summary sent automatically to the district team.", status: "Planned" },
  { id: "offline", title: "Offline data entry", description: "Enter visits on a phone without a network, then sync.", status: "Planned" },
];

export const FEATURE_TONE: Record<SystemFeature["status"], string> = {
  Live: "border-emerald-300 bg-emerald-50 text-emerald-900",
  "Off by default": "border-amber-300 bg-amber-50 text-amber-900",
  Planned: "border-slate-300 bg-slate-50 text-slate-700",
};

/** Spec key used by the Markdown download. */
export function systemMapMarkdown(
  live: { facilities: number | string; blocks: number | string; roles: string[] },
  overrides: Record<string, string> = {},
): string {
  const text = (key: string, fallback: string) => overrides[key] ?? fallback;
  const lines: string[] = [
    "# System Map — NQAS Tracker",
    "",
    text("spec.purpose", SPEC.purpose),
    "",
    `Scale: ${live.facilities} facilities · ${live.blocks} blocks · ${live.roles.length} roles`,
    "",
    "## Non-negotiable rules",
    ...SPEC.nonNegotiable.map((rule) => `- ${rule}`),
    "",
    "## Flow",
    ...SYSTEM_NODES.filter((node) => !node.side).map(
      (node) =>
        `### ${node.laneLabel} — ${text(`node.${node.id}.title`, node.title)}\n${text(`node.${node.id}.summary`, node.summary)}`,
    ),
    "",
    "## Pages",
    ...PAGE_FUNCTIONS.map((page) => `- ${page.title} (${page.to}) — ${page.purpose}`),
    "",
    "## Tools",
    ...SYSTEM_TOOLS.map((tool) => `- ${tool.title} — ${tool.purpose}`),
    "",
    "## Features",
    ...SYSTEM_FEATURES.map((feature) => `- ${feature.title} — ${feature.status}`),
    "",
    "All values and rules are read from the app configuration at download time.",
  ];
  return lines.join("\n");
}
