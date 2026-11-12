import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, W as Workflow, Q as Search, a3 as X, E as ExternalLink, a2 as Download, a4 as Printer, S as ShieldCheck, q as Minus, Y as Plus, z as ChevronRight, m as Check, a5 as BookOpen, a6 as Sparkles, A as ArrowRight, a7 as Pencil } from './icons-BxQpodNr.js';
import { b as useNavigate, l as useQuery, j as api, m as useMutation, c as cn, B as Button, t as toast, L as Link } from './index-CBV6wOh8.js';
import { i as issueRules, h as ACTIVE_DOC_TYPES, j as normalizePendingConfig, R as RULE_BY_ID, A as AppShell } from './AppShell-CP099uvN.js';
import { P as PageShell } from './PageShell-CaOvGLdi.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from './dialog-BW3GEiPg.js';
import { I as Input } from './input-Cy2oZLur.js';
import { D as DEFAULT_ROLES, r as roleLabel } from './permissions--83vvt_V.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';

const LANE_LABELS = {
  facility: "Facility",
  eligibility: "Eligibility",
  state: "State Assessment",
  nqas: "NQAS Assessment",
  result: "Result",
  certification: "Certification",
  surveillance: "Surveillance",
  expiry: "Expiry",
  reapply: "Re-application",
  cycle2: "Cycle #2"
};
const SYSTEM_NODES = [
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
    summary: "Every PHC and CHC in the district is in one register. The Master List is the working copy; imports and profile edits write the same records.",
    rules: [
      "One record per facility; NIN is the identity used by imports.",
      "Blank values stay blank. A blank is never shown as 0.",
      "A facility can be re-assessed only through a new re-application cycle."
    ],
    fields: ["Facility name", "NIN", "Block and PHC", "Facility type", "Current status"],
    documents: ["Condemned", "NOC"],
    pendingRules: ["data.nin-missing", "noc.not-recorded", "building.dilapidated"],
    roles: ["admin", "dqc", "dqmo", "entry", "viewer"],
    links: [
      { label: "Open Facility Master List", to: "/facilities" },
      { label: "Open Data checks", to: "/admin/data-checks" }
    ]
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
    summary: "The district marks a facility Eligible or Not Eligible. An eligible facility starts the Internal Assessment and State Assessment steps.",
    rules: [
      "Eligibility is a decision, not a score.",
      "A new cycle starts ONLY when a re-application is recorded.",
      "A deferred facility is never moved into Certified."
    ],
    fields: ["Eligibility", "Current cycle", "Cycle type", "Previous cycle"],
    documents: [],
    pendingRules: ["pending.sa-not-scheduled", "data.nin-missing"],
    roles: ["admin", "dqc", "dqmo", "entry"],
    links: [
      { label: "Open Master List · eligibility", to: "/facilities?eligibility=Eligible" },
      { label: "Open Pending & Follow-up", to: "/pending" }
    ]
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
    summary: "The State team checks the facility against the NQAS standards, records the visit dates and uploads the SA report and checklist.",
    rules: [
      "State Assessment starts only after the facility is Eligible.",
      "A scheduled assessment with a past start date becomes a pending item.",
      "Visit dates must be real visits; a done date cannot equal the due date."
    ],
    fields: [
      "SA status",
      "Scheduled start / end",
      "Actual visit dates",
      "Score %",
      "Assessor names",
      "General document status"
    ],
    documents: ["SA_Report", "SA_Checklist"],
    pendingRules: [
      "pending.sa-scheduled-passed",
      "pending.sa-not-scheduled",
      "data.sa-date-range",
      "data.surveillance-equals-due"
    ],
    roles: ["admin", "dqc", "dqmo", "entry"],
    links: [
      { label: "Open State Assessment list", to: "/facilities/state-assessment" },
      { label: "Open Master List · State", to: "/facilities/state-assessment" }
    ]
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
    summary: "A national assessment is scheduled after the State round. The team records the visit dates, scores and the result documents.",
    rules: [
      "NQAS can be scheduled only after the State Assessment has progressed.",
      "A scheduled date in the past is a pending follow-up.",
      "The NQAS Result file is the evidence for the certification step."
    ],
    fields: ["NA status", "Scheduled dates", "Actual dates", "Score %", "Assessor details"],
    documents: ["NQAS_Result"],
    pendingRules: [
      "pending.nqas-scheduled-passed",
      "pending.result-awaited",
      "data.nqas-date-range",
      "data.nqas-completed-no-score"
    ],
    roles: ["admin", "dqc", "dqmo", "entry"],
    links: [
      { label: "Open NQAS Certification list", to: "/facilities/certification" },
      { label: "Open Master List", to: "/facilities" }
    ]
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
    summary: "The result is recorded as Quality Certified, Certified with Conditionality or Deferred. The certificate dates and validity are entered here.",
    rules: [
      "Result Declared is set from the result, never guessed from a score.",
      "A deferred result is never treated as a certificate.",
      "A certificate without a validity date is a pending data issue."
    ],
    fields: ["Certification status", "Result date", "Certificate date", "Validity date", "Score %"],
    documents: ["NQAS_Result"],
    pendingRules: [
      "pending.result-awaited",
      "data.certified-no-date",
      "data.certified-not-eligible",
      "certificate.expired",
      "certificate.expiring"
    ],
    roles: ["admin", "dqc", "dqmo"],
    links: [
      { label: "Open NQAS Certification list", to: "/facilities/certification" },
      { label: "Open Pending & Follow-up", to: "/pending" }
    ]
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
    summary: "The facility is certified without conditions. Surveillance continues during the validity period.",
    rules: [
      "A certificate is never created by a deferred result.",
      "Surveillance is due during the validity period.",
      "A new cycle starts only after re-application."
    ],
    fields: ["Certificate date", "Validity date", "Score %", "Surveillance dates"],
    documents: ["NQAS_Result"],
    pendingRules: ["surveillance.overdue", "surveillance.due-soon", "certificate.expired"],
    roles: ["admin", "dqc", "dqmo"],
    links: [{ label: "Open certified facilities", to: "/facilities/certification" }]
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
    summary: "The facility is certified subject to conditions. The conditionality list and gap-closure evidence are followed up.",
    rules: [
      "Conditionality is a certificate, not a deferred result.",
      "Gap-closure evidence is required when the condition needs it.",
      "Surveillance still applies."
    ],
    fields: ["Certificate date", "Validity date", "Score %", "Conditionality note"],
    documents: ["NQAS_Result", "Gap_Closure"],
    pendingRules: ["surveillance.overdue", "certificate.expiring", "doc.gap-closure"],
    roles: ["admin", "dqc", "dqmo"],
    links: [{ label: "Open certification list", to: "/facilities/certification" }]
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
    summary: "The facility did not pass this attempt. It waits through the cooling period and starts again only when a new re-application is recorded.",
    rules: [
      "Deferred is never Certified.",
      "A new cycle starts only on a re-application.",
      "The cooling period is a wait, not a certificate."
    ],
    fields: ["Deferred date", "Cooling period", "Re-application date", "Next cycle"],
    documents: ["NQAS_Result"],
    pendingRules: ["pending.deferred-cooling"],
    roles: ["admin", "dqc", "dqmo"],
    links: [
      { label: "Open Deferred facilities", to: "/facilities/certification" },
      { label: "Open Pending & Follow-up", to: "/pending" }
    ]
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
    summary: "Surveillance visits are recorded during the certificate validity. Overdue or due-soon visits become pending items.",
    rules: [
      "A surveillance visit needs a real done date.",
      "Done and due dates cannot be the same.",
      "Future done dates are data errors."
    ],
    fields: ["Surveillance visits", "Due dates", "Done dates", "Score %"],
    documents: [],
    pendingRules: ["surveillance.overdue", "surveillance.due-soon", "data.surveillance-future"],
    roles: ["admin", "dqc", "dqmo"],
    links: [{ label: "Open Recertification list", to: "/facilities/recertification" }]
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
    summary: "The validity date closes the current certificate. Expiry is a date fact, not a hidden status change.",
    rules: [
      "An expired certificate cannot be shown as current.",
      "The facility remains in the register; nothing is deleted.",
      "A fresh assessment needs a new cycle."
    ],
    fields: ["Validity date", "Days left", "Certificate status"],
    documents: ["NQAS_Result"],
    pendingRules: ["certificate.expired", "certificate.expiring"],
    roles: ["admin", "dqc", "dqmo"],
    links: [{ label: "Open Recertification list", to: "/facilities/recertification" }]
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
    summary: "A re-application is the only door to a new cycle. It creates the next cycle and carries the facility back to Eligibility.",
    rules: [
      "A new cycle starts only on a re-application.",
      "The old cycle is kept, never overwritten.",
      "Do not create a cycle by editing a status."
    ],
    fields: ["Re-application date", "Previous cycle", "Next cycle number", "Reason"],
    documents: [],
    pendingRules: ["data.certified-no-date"],
    roles: ["admin", "dqc", "dqmo"],
    links: [{ label: "Open Recertification list", to: "/facilities/recertification" }]
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
    summary: "Cycle #2 repeats the same rules with a new cycle number. The previous cycle stays in history.",
    rules: [
      "Every cycle keeps its own assessments and result.",
      "The loop returns to Eligibility, not directly to Certification.",
      "A deferred result can enter a new cycle only through re-application."
    ],
    fields: ["Cycle number", "Cycle type", "Status", "Previous cycle"],
    documents: [],
    pendingRules: ["pending.sa-not-scheduled"],
    roles: ["admin", "dqc", "dqmo", "entry"],
    links: [{ label: "Open Recertification list", to: "/facilities/recertification" }]
  }
];
const SYSTEM_EDGES = [
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
  { from: "cycle2", to: "eligibility", label: "next cycle", loop: true }
];
const PENDING_STEP = {
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
  "data.surveillance-equals-due": "Surveillance"
};
const SIDE_LANES = [
  {
    id: "documents",
    title: "Documents",
    hint: "Six current document types",
    items: ACTIVE_DOC_TYPES.map((doc) => ({
      id: doc.key,
      label: doc.label,
      detail: doc.key === "SA_Report" || doc.key === "SA_Checklist" ? "Needed at State Assessment" : doc.key === "NQAS_Result" ? "Needed at NQAS Assessment / Result" : doc.key === "Gap_Closure" ? "Needed for a conditional certificate" : doc.key === "Condemned" ? "Needed when a building is condemned" : "Needed when a Fire NOC is recorded"
    }))
  },
  {
    id: "imports",
    title: "Imports",
    hint: "The two bulk paths",
    items: [
      { id: "ia", label: "IA import", detail: "Quarterly Internal Assessment scores" },
      { id: "saqsham", label: "SaQsham import", detail: "Portal status and document names" }
    ]
  },
  {
    id: "pending",
    title: "Pending rules",
    hint: `${issueRules.length} rules in one registry`,
    items: issueRules.map((rule) => ({
      id: rule.id,
      label: rule.label,
      detail: `${PENDING_STEP[rule.id] ?? "Any step"} · ${rule.defaultEnabled ? "on" : "off"} · ${rule.defaultSeverity}`
    }))
  },
  {
    id: "reports",
    title: "Reports",
    hint: "Built from the same rows",
    items: [
      { id: "summary", label: "NQAS Summary Report", detail: "District, block and PHC totals" },
      { id: "linelists", label: "Line lists", detail: "Topic-wise facility lists" },
      { id: "master", label: "Master and profile exports", detail: "Excel, PDF and print" }
    ]
  }
];
const SPEC = {
  purpose: "One place that shows how the NQAS tracker works end to end: the facility journey, the rules that never move, the pages people use, and the tools that keep the data right.",
  nonNegotiable: [
    "A deferred result is never Certified.",
    "A new cycle starts only when a re-application is recorded.",
    "Blank values stay blank and show “-”, never 0.",
    "Dates are DD-MMM-YYYY in IST.",
    "Google Drive ids, links and tokens are never shown.",
    "Old cycles are kept; records are not silently overwritten.",
    "Every change is written to Audit and logs.",
    "Import, profile edit and report read the same database columns."
  ],
  entities: [
    "Facility master (name, NIN, block, PHC, type, eligibility)",
    "Certification cycle (number, dates, current status, validity)",
    "State assessment (schedule, visit dates, report, score)",
    "NQAS assessment (schedule, visit dates, result, score)",
    "Documents (six current types, one row per cycle)",
    "Internal Assessment (quarterly scores)",
    "Gap closure fund, building details and Fire NOC",
    "Pending issues, saved filters, audit entries and settings"
  ],
  speed: [
    "List filtering works in memory on loaded rows.",
    "The System Map live count is one aggregate query.",
    "No query is sent on every keystroke.",
    "Exports are built from the same filtered rows as the screen."
  ],
  integrations: [
    "Google Drive stores private document copies; the app never exposes Drive ids or links.",
    "SaQsham portal status is imported, not manually retyped.",
    "Excel, PDF and print read the live column configuration.",
    "The result reader is controlled by one Admin switch."
  ],
  statusLists: [
    {
      title: "Certification result",
      values: ["Quality Certified", "Certified with Conditionality", "Deferred"]
    },
    {
      title: "Assessment status",
      values: ["Not Yet Initiated", "Scheduled", "Completed", "Result Awaited", "Result Declared"]
    },
    {
      title: "Surveillance",
      values: ["Due", "Done", "Overdue", "Not recorded"]
    }
  ]
};
const PAGE_FUNCTIONS = [
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
  { id: "filters", title: "Admin · Filters", to: "/admin?tab=filters", purpose: "Default filter sets for shared pages.", functions: ["Set a default", "Reset", "See the page"], roles: ["admin"] }
];
const SYSTEM_TOOLS = [
  { id: "uploader", title: "Uploader", purpose: "Put a document on the right facility and cycle.", steps: ["Open Documents and find the cell.", "Choose the file and check the match.", "Confirm; the upload is audited."], to: "/documents", linkLabel: "Open Documents" },
  { id: "bulk", title: "Bulk Import", purpose: "Change many facilities at once with a review step.", steps: ["Choose Master, SaQsham or IA.", "Review every row and warning.", "Apply; Undo is available on the result."], to: "/bulk-import", linkLabel: "Open Bulk Import" },
  { id: "checks", title: "Data checks", purpose: "Find dates, names and documents that do not make sense.", steps: ["Open a check card.", "Filter and preview the fix.", "Confirm; the change is audited."], to: "/admin/data-checks", linkLabel: "Open Data checks" },
  { id: "zip", title: "ZIP download", purpose: "Take a folder of documents for a block or facility.", steps: ["Set the block or facility filter.", "Choose the documents.", "Download the ZIP."], to: "/documents", linkLabel: "Open Documents" },
  { id: "exports", title: "PDF and Excel export", purpose: "Download the same rows the screen shows.", steps: ["Set the filters.", "Open Export.", "Choose Excel, PDF or CSV."], to: "/facilities", linkLabel: "Open Master List" },
  { id: "ppt", title: "PPT generator", purpose: "Build a review deck from the tracker.", steps: ["Pick the sections.", "Check the preview.", "Download the deck."], to: "/generate-ppt", linkLabel: "Open PPT generator" },
  { id: "qr", title: "Facility sheet QR", purpose: "Print a sheet whose QR opens the same digital copy.", steps: ["Open a facility profile.", "Print the facility sheet with QR.", "Scan to open the saved copy."], to: "/facilities", linkLabel: "Open Master List" },
  { id: "filters", title: "Filters", purpose: "Save a filter set and share it with a role.", steps: ["Apply the filters.", "Open ⋯ and Save this filter.", "Reload or share the link."], to: "/facilities", linkLabel: "Try filters" },
  { id: "undo", title: "Undo and Audit", purpose: "See what changed and reverse a safe change.", steps: ["Apply a fix or import.", "Use Undo on the result toast.", "Open Audit and logs for the full history."], to: "/admin/audit", linkLabel: "Open Audit and logs" }
];
const SYSTEM_FEATURES = [
  { id: "reader", title: "Read NQAS result", description: "Read Annexure I scores from a result PDF. The switch is in Admin → Documents.", status: "Off by default", settingKey: "resultReaderEnabled", to: "/admin/documents" },
  { id: "saqsham", title: "SaQsham status import", description: "Import portal status and document names for many facilities.", status: "Live", to: "/bulk-import/saqsham" },
  { id: "ia", title: "Quarterly IA import", description: "Import Internal Assessment scores for a quarter.", status: "Live", to: "/bulk-import/internal-assessment" },
  { id: "pending", title: "Pending rules", description: "The same rule registry feeds the bell, the badge, Pending and Quick View.", status: "Live", to: "/pending" },
  { id: "filters", title: "Saved and shared filters", description: "Save a filter, set a default, or share it with a role.", status: "Live", to: "/facilities" },
  { id: "digest", title: "Scheduled email digest", description: "A weekly summary sent automatically to the district team.", status: "Planned" },
  { id: "offline", title: "Offline data entry", description: "Enter visits on a phone without a network, then sync.", status: "Planned" }
];
const FEATURE_TONE = {
  Live: "border-emerald-300 bg-emerald-50 text-emerald-900",
  "Off by default": "border-amber-300 bg-amber-50 text-amber-900",
  Planned: "border-slate-300 bg-slate-50 text-slate-700"
};
function systemMapMarkdown(live, overrides = {}) {
  const text = (key, fallback) => overrides[key] ?? fallback;
  const lines = [
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
      (node) => `### ${node.laneLabel} — ${text(`node.${node.id}.title`, node.title)}
${text(`node.${node.id}.summary`, node.summary)}`
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
    "All values and rules are read from the app configuration at download time."
  ];
  return lines.join("\n");
}

const TABS = ["Flow", "Specs", "Functions", "Tools", "Features"];
const DOC_LABEL = Object.fromEntries(
  ACTIVE_DOC_TYPES.map((doc) => [doc.key, doc.label])
);
const NODE_BY_ID = Object.fromEntries(SYSTEM_NODES.map((node) => [node.id, node]));
const LANE_TONE = {
  facility: { fill: "#f8fafc", stroke: "#cbd5e1" },
  eligibility: { fill: "#eff6ff", stroke: "#93c5fd" },
  state: { fill: "#ecfeff", stroke: "#67e8f9" },
  nqas: { fill: "#eef2ff", stroke: "#a5b4fc" },
  result: { fill: "#f5f3ff", stroke: "#c4b5fd" },
  certification: { fill: "#ecfdf5", stroke: "#6ee7b7" },
  surveillance: { fill: "#f0fdfa", stroke: "#5eead4" },
  expiry: { fill: "#fefce8", stroke: "#fde047" },
  reapply: { fill: "#f8fafc", stroke: "#cbd5e1" },
  cycle2: { fill: "#f1f5f9", stroke: "#94a3b8" }
};
const MAIN_NODES = SYSTEM_NODES.filter((node) => !node.side);
const LANES = Object.keys(LANE_LABELS);
function short(value, max) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
function nodeCenter(node) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}
function EditPencil({
  canEdit,
  label,
  value,
  onEdit
}) {
  if (!canEdit) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      onClick: (event) => {
        event.stopPropagation();
        onEdit({ key: label, label, value });
      },
      className: "inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      title: `Edit ${label}`,
      "aria-label": `Edit ${label}`,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-3" })
    }
  );
}
function Section({
  title,
  children,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: cn("rounded-xl border border-border/60 bg-card/80 p-4", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2", children })
  ] });
}
function SystemMapPage() {
  const navigate = useNavigate();
  const dashboard = useQuery(api.ops.getDashboardV2, {});
  const rolesQ = useQuery(api.roles.list, {});
  const settingsQ = useQuery(api.facilities.getAppSettings, {});
  const setSetting = useMutation(api.facilities.setSetting);
  const isAdmin = settingsQ?.isAdmin === true;
  const [tab, setTab] = reactExports.useState("Flow");
  const [selectedId, setSelectedId] = reactExports.useState(null);
  const [hoverId, setHoverId] = reactExports.useState(null);
  const [laneFilter, setLaneFilter] = reactExports.useState("all");
  const [showCounts, setShowCounts] = reactExports.useState(true);
  const [zoom, setZoom] = reactExports.useState(1);
  const [pan, setPan] = reactExports.useState({ x: 0, y: 0 });
  const [search, setSearch] = reactExports.useState("");
  const [roleFilter, setRoleFilter] = reactExports.useState("all");
  const [edit, setEdit] = reactExports.useState(null);
  const drag = reactExports.useRef(null);
  const svgRef = reactExports.useRef(null);
  const roles = reactExports.useMemo(
    () => (rolesQ ?? DEFAULT_ROLES).map((role) => ({
      key: role.key,
      label: role.label,
      description: role.description,
      scope: "blockScope" in role ? role.blockScope : "All blocks"
    })),
    [rolesQ]
  );
  const overrides = reactExports.useMemo(
    () => settingsQ?.settings?.systemMapText ?? {},
    [settingsQ?.settings]
  );
  const pendingConfig = reactExports.useMemo(
    () => normalizePendingConfig(settingsQ?.settings?.pendingRules).rules,
    [settingsQ?.settings]
  );
  const text = (key, fallback) => overrides[key] ?? fallback;
  const counts = reactExports.useMemo(() => {
    const pipeline = Object.fromEntries(
      (dashboard?.pipeline ?? []).map((stage) => [stage.key, stage.count])
    );
    const totals = dashboard?.totals;
    const deferred = totals?.deferred ?? 0;
    const notStarted = Math.max(0, (pipeline.notStarted ?? 0) - deferred);
    const stateAssessment = pipeline.stateAssessment ?? 0;
    const naScheduled = pipeline.naScheduled ?? 0;
    const resultAwaited = pipeline.resultAwaited ?? 0;
    const qualityCertified = totals?.qualityCertified ?? 0;
    const conditional = totals?.certifiedWithConditionality ?? 0;
    const otherStages = notStarted + stateAssessment + naScheduled + resultAwaited + qualityCertified + conditional + deferred;
    return {
      notEligible: Math.max(0, (totals?.facilities ?? pipeline.notEligible ?? 0) - otherStages),
      notStarted,
      stateAssessment,
      naScheduled,
      resultAwaited,
      qualityCertified,
      conditional,
      deferred
    };
  }, [dashboard]);
  const total = reactExports.useMemo(
    () => Object.values(counts).reduce((sum, value) => sum + value, 0),
    [counts]
  );
  const live = dashboard !== void 0;
  const countText = (node) => {
    if (!showCounts) return "";
    if (!live || !node.countKey) return "-";
    return String(counts[node.countKey]);
  };
  const searchHits = reactExports.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    const nodes = MAIN_NODES.filter(
      (node) => [
        node.title,
        node.laneLabel,
        node.summary,
        ...node.rules,
        ...node.pendingRules.map((id) => RULE_BY_ID[id]?.label ?? id)
      ].join(" ").toLowerCase().includes(query)
    ).map((node) => ({
      id: `node:${node.id}`,
      label: `${node.laneLabel} · ${node.title}`,
      detail: node.short,
      nodeId: node.id,
      to: void 0
    }));
    const pages = PAGE_FUNCTIONS.filter(
      (page) => [page.title, page.purpose, page.to, ...page.functions].join(" ").toLowerCase().includes(query)
    ).map((page) => ({
      id: `page:${page.id}`,
      label: page.title,
      detail: page.purpose,
      nodeId: void 0,
      to: page.to
    }));
    return [...nodes, ...pages].slice(0, 8);
  }, [search]);
  selectedId ? NODE_BY_ID[selectedId] : null;
  const openNode = (id) => {
    setSelectedId(id);
    setTab("Flow");
    setSearch("");
  };
  const openSearchHit = (hit) => {
    if (hit.nodeId) openNode(hit.nodeId);
    else if (hit.to) {
      setSearch("");
      navigate(hit.to);
    }
  };
  const saveText = async () => {
    if (!edit) return;
    const next = { ...overrides };
    if (edit.value.trim()) next[edit.key] = edit.value.trim();
    else delete next[edit.key];
    try {
      await setSetting({ key: "systemMapText", value: next });
      toast.success("Text updated", { description: "The change is in Audit and logs." });
      setEdit(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the text");
    }
  };
  const downloadMarkdown = () => {
    const markdown = systemMapMarkdown(
      {
        facilities: dashboard ? dashboard.totals.facilities : "-",
        blocks: dashboard ? dashboard.perBlock.length : "-",
        roles: roles.map((role) => role.label)
      },
      overrides
    );
    downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), "nqas-system-map-spec.md");
    toast.success("Markdown spec downloaded");
  };
  const downloadSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "760");
    clone.setAttribute("height", "880");
    downloadBlob(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }),
      "nqas-system-map.svg"
    );
  };
  const downloadPng = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "1520");
    clone.setAttribute("height", "1760");
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1520;
      canvas.height = 1760;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((png) => {
        if (png) downloadBlob(png, "nqas-system-map.png");
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Could not export the PNG");
    };
    image.src = url;
  };
  const setZoomClamped = (next) => setZoom(Math.max(0.6, Math.min(2.2, Number(next.toFixed(2)))));
  const onNodeKey = (event, node) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedId(node.id);
    }
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      const index = MAIN_NODES.findIndex((item) => item.id === node.id);
      setSelectedId(MAIN_NODES[Math.min(MAIN_NODES.length - 1, index + 1)].id);
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      const index = MAIN_NODES.findIndex((item) => item.id === node.id);
      setSelectedId(MAIN_NODES[Math.max(0, index - 1)].id);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    AppShell,
    {
      title: "System Map",
      subtitle: "How the NQAS tracker works — flow, rules, pages, tools and features",
      titleIcon: Workflow,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PageShell,
          {
            toolbar: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-w-0 flex-1 sm:max-w-md", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Input,
                    {
                      value: search,
                      onChange: (event) => setSearch(event.target.value),
                      placeholder: "Search nodes, pages or rules",
                      "aria-label": "Search the system map",
                      className: "h-10 pl-9"
                    }
                  ),
                  search && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => setSearch(""),
                      "aria-label": "Clear search",
                      className: "absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
                    }
                  ),
                  searchHits.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-11 right-0 left-0 z-30 overflow-hidden rounded-lg border border-border/70 bg-background shadow-xl", children: searchHits.map((hit) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => openSearchHit(hit),
                      className: "flex w-full items-start gap-2 border-b border-border/40 px-3 py-2 text-left last:border-0 hover:bg-muted/60",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 text-primary", children: hit.to ? /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Workflow, { className: "size-3.5" }) }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-xs font-semibold", children: hit.label }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-[11px] text-muted-foreground", children: hit.detail })
                        ] })
                      ]
                    },
                    hit.id
                  )) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex flex-wrap items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: cn(
                        "rounded-full border px-3 py-1.5 text-[11px] font-semibold tabular-nums",
                        live ? "border-teal-300 bg-teal-50 text-teal-900" : "border-border bg-muted text-muted-foreground"
                      ),
                      "aria-live": "polite",
                      children: live ? `${total} facilities` : "Loading live counts…"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "h-9", onClick: downloadMarkdown, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-1.5 size-4" }),
                    " Download spec (Markdown)"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "h-9", onClick: () => window.print(), children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "mr-1.5 size-4" }),
                    " Print"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5", role: "tablist", "aria-label": "System map views", children: [
                TABS.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    role: "tab",
                    "aria-selected": tab === item,
                    onClick: () => setTab(item),
                    className: cn(
                      "min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      tab === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    ),
                    children: item
                  },
                  item
                )),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-auto hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "size-3.5" }),
                  " One config · live settings · audit-logged text"
                ] })
              ] })
            ] }),
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 pb-8", children: [
              tab === "Flow" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                FlowTab,
                {
                  counts,
                  live,
                  total,
                  countText,
                  showCounts,
                  setShowCounts,
                  laneFilter,
                  setLaneFilter,
                  zoom,
                  setZoom: setZoomClamped,
                  pan,
                  setPan,
                  hoverId,
                  setHoverId,
                  selectedId,
                  setSelectedId,
                  svgRef,
                  onWheelZoom: (delta) => setZoom(zoom * (delta < 0 ? 1.1 : 0.9)),
                  onPointerDown: (event) => {
                    if (event.target.closest("[data-map-node]")) return;
                    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  },
                  onPointerMove: (event) => {
                    if (!drag.current) return;
                    setPan({
                      x: drag.current.panX + (event.clientX - drag.current.x) / zoom,
                      y: drag.current.panY + (event.clientY - drag.current.y) / zoom
                    });
                  },
                  onPointerUp: () => {
                    drag.current = null;
                  },
                  onFit: () => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  },
                  onSvg: downloadSvg,
                  onPng: () => void downloadPng(),
                  onNodeKey,
                  onNodeClick: openNode,
                  canEdit: isAdmin,
                  onEdit: setEdit,
                  editText: text,
                  roles
                }
              ),
              tab === "Specs" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                SpecsTab,
                {
                  live,
                  total,
                  blocks: dashboard?.perBlock?.length,
                  roles,
                  text,
                  canEdit: isAdmin,
                  onEdit: setEdit,
                  settings: settingsQ?.settings,
                  pendingConfig
                }
              ),
              tab === "Functions" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                FunctionsTab,
                {
                  roleFilter,
                  setRoleFilter,
                  roles,
                  text,
                  canEdit: isAdmin,
                  onEdit: setEdit
                }
              ),
              tab === "Tools" && /* @__PURE__ */ jsxRuntimeExports.jsx(ToolsTab, { text, canEdit: isAdmin, onEdit: setEdit }),
              tab === "Features" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                FeaturesTab,
                {
                  settings: settingsQ?.settings,
                  text,
                  canEdit: isAdmin,
                  onEdit: setEdit
                }
              )
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!edit, onOpenChange: (open) => !open && setEdit(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-lg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Edit text" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Only the words change. The structure stays in the config. Every save is versioned in Audit and logs." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "space-y-1 text-xs font-medium", children: [
            edit?.label,
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                value: edit?.value ?? "",
                onChange: (event) => setEdit((current) => current ? { ...current, value: event.target.value } : current),
                rows: 5,
                className: "min-h-28 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setEdit(null), children: "Cancel" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => void saveText(), children: "Save text" })
          ] })
        ] }) })
      ]
    }
  );
}
function FlowTab({
  counts,
  live,
  total,
  countText,
  showCounts,
  setShowCounts,
  laneFilter,
  setLaneFilter,
  zoom,
  setZoom,
  pan,
  setPan,
  hoverId,
  setHoverId,
  selectedId,
  setSelectedId,
  svgRef,
  onWheelZoom,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onFit,
  onSvg,
  onPng,
  onNodeKey,
  onNodeClick,
  canEdit,
  onEdit,
  editText,
  roles
}) {
  const selected = selectedId ? NODE_BY_ID[selectedId] : null;
  const dim = (node) => laneFilter !== "all" && node.lane !== laneFilter ? 0.18 : 1;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "grid gap-3 xl:grid-cols-[minmax(0,1fr)_290px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 rounded-xl border border-border/60 bg-card/70 p-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 rounded-lg border border-border/60 p-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", className: "h-8 w-8 p-0", onClick: () => setZoom(zoom - 0.15), "aria-label": "Zoom out", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Minus, { className: "size-3.5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "w-10 text-center text-[11px] tabular-nums text-muted-foreground", children: [
              Math.round(zoom * 100),
              "%"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", className: "h-8 w-8 p-0", onClick: () => setZoom(zoom + 0.15), "aria-label": "Zoom in", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", className: "h-8", onClick: onFit, children: "Fit" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "ml-1 flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "checkbox",
                checked: showCounts,
                onChange: (event) => setShowCounts(event.target.checked),
                className: "size-4 accent-[var(--primary)]"
              }
            ),
            "Show live counts"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "h-8 gap-1", onClick: onSvg, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" }),
              " SVG"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "h-8 gap-1", onClick: onPng, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" }),
              " PNG"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setLaneFilter("all"),
              "aria-pressed": laneFilter === "all",
              className: cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                laneFilter === "all" ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:bg-muted"
              ),
              children: "All lanes"
            }
          ),
          LANES.map((lane) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setLaneFilter(laneFilter === lane ? "all" : lane),
              "aria-pressed": laneFilter === lane,
              className: cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                laneFilter === lane ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:bg-muted"
              ),
              children: LANE_LABELS[lane]
            },
            lane
          ))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hidden md:block", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-hidden rounded-lg border border-border/50 bg-white", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "svg",
            {
              ref: svgRef,
              viewBox: "0 0 760 880",
              role: "img",
              "aria-label": "NQAS journey flow chart",
              className: "h-auto w-full cursor-grab touch-none select-none active:cursor-grabbing",
              onWheel: (event) => {
                event.preventDefault();
                onWheelZoom(event.deltaY);
              },
              onPointerDown,
              onPointerMove,
              onPointerUp,
              onPointerCancel: onPointerUp,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `
                  .sm-label { font-family: ui-sans-serif, system-ui, sans-serif; }
                  .sm-edge { stroke: #94a3b8; stroke-width: 1.4; fill: none; opacity: .7; }
                  .sm-edge.active { stroke: #0f766e; stroke-width: 2.6; opacity: 1; }
                  .sm-edge.loop { stroke-dasharray: 5 4; }
                  .sm-node { cursor: pointer; outline: none; }
                  .sm-node:focus .sm-node-box { stroke: #0f766e; stroke-width: 2; }
                ` }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("defs", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("marker", { id: "sm-arrow", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#94a3b8" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("marker", { id: "sm-arrow-active", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#0f766e" }) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { width: "760", height: "880", fill: "#ffffff" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { transform: `translate(${pan.x} ${pan.y}) scale(${zoom})`, children: [
                  LANES.map((lane, index) => {
                    const nodes = MAIN_NODES.filter((node) => node.lane === lane);
                    if (nodes.length === 0) return null;
                    const top = nodes[0].y - 8;
                    const height = nodes[0].height + 16;
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { opacity: laneFilter !== "all" && lane !== laneFilter ? 0.35 : 1, children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "0", y: top, width: "760", height, fill: index % 2 === 0 ? "#f8fafc" : "#ffffff" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: "10", y: top + height / 2 + 3, className: "sm-label", fontSize: "10", fontWeight: "700", fill: "#64748b", children: LANE_LABELS[lane] })
                    ] }, lane);
                  }),
                  SYSTEM_EDGES.map((edge) => {
                    const from = NODE_BY_ID[edge.from];
                    const to = NODE_BY_ID[edge.to];
                    if (!from || !to) return null;
                    const a = nodeCenter(from);
                    const b = nodeCenter(to);
                    const active = hoverId === edge.from || hoverId === edge.to || selectedId === edge.from || selectedId === edge.to;
                    const path = edge.loop ? `M ${from.x} ${a.y} C 55 ${a.y}, 55 ${b.y}, ${to.x} ${b.y}` : `M ${a.x} ${from.y + from.height} C ${a.x} ${from.y + from.height + 22}, ${b.x} ${to.y - 22}, ${b.x} ${to.y}`;
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "path",
                        {
                          d: path,
                          className: cn("sm-edge", active && "active", edge.loop && "loop"),
                          markerEnd: `url(#${active ? "sm-arrow-active" : "sm-arrow"})`,
                          opacity: laneFilter !== "all" && from.lane !== laneFilter && to.lane !== laneFilter ? 0.15 : void 0
                        }
                      ),
                      edge.label && /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: edge.loop ? 22 : (a.x + b.x) / 2 + 5, y: edge.loop ? (a.y + b.y) / 2 : (from.y + from.height + to.y) / 2, fontSize: "8.5", fill: "#64748b", children: edge.label })
                    ] }, `${edge.from}-${edge.to}`);
                  }),
                  MAIN_NODES.map((node) => {
                    const tone = LANE_TONE[node.lane];
                    const active = selectedId === node.id;
                    const connected = hoverId === node.id || selectedId === node.id;
                    const value = countText(node);
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "g",
                      {
                        "data-map-node": true,
                        className: "sm-node",
                        role: "button",
                        tabIndex: 0,
                        "aria-label": `${node.title}. ${node.short}`,
                        opacity: dim(node),
                        onMouseEnter: () => setHoverId(node.id),
                        onMouseLeave: () => setHoverId(null),
                        onClick: () => onNodeClick(node.id),
                        onKeyDown: (event) => onNodeKey(event, node),
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "rect",
                            {
                              className: "sm-node-box",
                              x: node.x,
                              y: node.y,
                              width: node.width,
                              height: node.height,
                              rx: "9",
                              fill: tone.fill,
                              stroke: active || connected ? "#0f766e" : tone.stroke,
                              strokeWidth: active ? 2.2 : 1.2
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: node.x + 13, y: node.y + 23, className: "sm-label", fontSize: node.width < 220 ? 10.5 : 12, fontWeight: "700", fill: "#0f172a", children: short(editText(`node.${node.id}.title`, node.title), node.width < 220 ? 22 : 34) }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: node.x + 13, y: node.y + 42, className: "sm-label", fontSize: "9.5", fill: "#475569", children: short(node.short, node.width < 220 ? 27 : 58) }),
                          showCounts && /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: node.x + node.width - 36, y: node.y + 7, width: "25", height: "17", rx: "8.5", fill: "#ffffff", opacity: ".86" }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: node.x + node.width - 23.5, y: node.y + 19, textAnchor: "middle", className: "sm-label", fontSize: "9.5", fontWeight: "700", fill: "#0f766e", children: value })
                          ] })
                        ]
                      },
                      node.id
                    );
                  })
                ] })
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Hover to trace a path · click a node for rules and links · arrow keys move, Enter opens." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: live ? `${total} facilities across ${Object.keys(counts).length} live stages` : "Waiting for live counts" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 hidden xl:block", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Minimap" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 190 220", className: "h-20 w-40 rounded border border-border/50 bg-white", "aria-hidden": "true", children: MAIN_NODES.map((node) => /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: node.x / 4, y: node.y / 4, width: Math.max(8, node.width / 4), height: Math.max(4, node.height / 4), rx: "1.5", fill: LANE_TONE[node.lane].stroke }, node.id)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5 md:hidden", children: MAIN_NODES.map((node) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => onNodeClick(node.id),
            className: "flex w-full items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-left",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: node.laneLabel }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-xs font-semibold", children: editText(`node.${node.id}.title`, node.title) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-[11px] text-muted-foreground", children: node.short })
              ] }),
              live && node.countKey && showCounts && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold tabular-nums text-primary", children: counts[node.countKey] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-4 shrink-0 text-muted-foreground" })
            ]
          },
          node.id
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "space-y-2", "aria-label": "Side lanes", children: [
        SIDE_LANES.map((lane) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-card/80 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-semibold", children: lane.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-muted px-2 py-0.5 text-[9.5px] text-muted-foreground", children: lane.hint })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: cn("mt-2 space-y-1.5", lane.id === "pending" && "max-h-64 overflow-y-auto pr-1"), children: lane.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-[11px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: item.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10.5px] text-muted-foreground", children: item.detail })
          ] }, item.id)) })
        ] }, lane.id)),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-card/80 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xs font-semibold", children: "Config note" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: "This chart is drawn from one config. Live counts come from the aggregate facility query; changing a facility status changes the number here." })
        ] })
      ] })
    ] }),
    selected ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      NodePanel,
      {
        node: selected,
        text: editText,
        canEdit,
        onEdit,
        count: selected.countKey && live ? String(counts[selected.countKey]) : "-",
        roles,
        onClose: () => setSelectedId(null)
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-xs text-muted-foreground", children: [
      "Click ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "text-foreground", children: "State Assessment" }),
      " to see its rules, documents and Open in app links."
    ] })
  ] });
}
function NodePanel({
  node,
  text,
  canEdit,
  onEdit,
  count,
  roles,
  onClose
}) {
  const ruleLabels = node.pendingRules.map((id) => RULE_BY_ID[id]).filter(Boolean);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-teal-300/70 bg-teal-50/25 p-4", "aria-label": `${node.title} details`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-semibold tracking-wide text-teal-700 uppercase", children: node.laneLabel }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "flex items-center gap-1 text-base font-semibold", children: [
          text(`node.${node.id}.title`, node.title),
          /* @__PURE__ */ jsxRuntimeExports.jsx(EditPencil, { canEdit, label: `node.${node.id}.title`, value: text(`node.${node.id}.title`, node.title), onEdit })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground", children: [
          text(`node.${node.id}.summary`, node.summary),
          /* @__PURE__ */ jsxRuntimeExports.jsx(EditPencil, { canEdit, label: `node.${node.id}.summary`, value: text(`node.${node.id}.summary`, node.summary), onEdit })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-teal-300 bg-white px-2.5 py-1 text-[11px] font-semibold tabular-nums text-teal-800", children: [
          count,
          " facilities"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", className: "h-8 w-8 p-0", onClick: onClose, "aria-label": "Close node details", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-white/70 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Rules" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1.5 space-y-1 text-[11px]", children: node.rules.map((rule, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mt-0.5 size-3 shrink-0 text-teal-700" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            text(`node.${node.id}.rule.${index}`, rule),
            /* @__PURE__ */ jsxRuntimeExports.jsx(EditPencil, { canEdit, label: `node.${node.id}.rule.${index}`, value: text(`node.${node.id}.rule.${index}`, rule), onEdit })
          ] })
        ] }, rule)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-white/70 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Fields" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1.5 space-y-1 text-[11px] text-muted-foreground", children: node.fields.map((field) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: field }, field)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-white/70 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Documents needed" }),
        node.documents.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1.5 space-y-1 text-[11px] text-muted-foreground", children: node.documents.map((key) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: DOC_LABEL[key] ?? key }, key)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1.5 text-[11px] text-muted-foreground", children: "-" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-white/70 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Pending rules" }),
        ruleLabels.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1.5 space-y-1 text-[11px] text-muted-foreground", children: ruleLabels.map((rule) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: rule.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "block text-[10px]", children: [
            rule.defaultSeverity,
            " · ",
            rule.defaultEnabled ? "on" : "off"
          ] })
        ] }, rule.id)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1.5 text-[11px] text-muted-foreground", children: "No pending rule is tied to this step." })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap items-start gap-x-6 gap-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Roles that can act" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 flex flex-wrap gap-1", children: node.roles.map((role) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-border/70 bg-white px-2 py-0.5 text-[10px] font-medium", children: roleLabel(role) }, role)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Open in app" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 flex flex-wrap gap-x-3 gap-y-1", children: node.links.map((link) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: link.to, className: "inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline", children: [
          link.label,
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-3" })
        ] }, link.to)) })
      ] })
    ] }),
    roles.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[10px] text-muted-foreground", children: "Role names follow the live role list in Admin → Users." })
  ] });
}
function SpecsTab({
  live,
  total,
  blocks,
  roles,
  text,
  canEdit,
  onEdit,
  settings,
  pendingConfig
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 lg:grid-cols-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Purpose and scale", className: "lg:col-span-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-4xl text-sm leading-relaxed text-muted-foreground", children: text("spec.purpose", SPEC.purpose) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(EditPencil, { canEdit, label: "spec.purpose", value: text("spec.purpose", SPEC.purpose), onEdit })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-semibold tabular-nums text-teal-900", children: [
          live ? total : "-",
          " facilities"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold tabular-nums", children: [
          blocks ?? "-",
          " blocks"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold tabular-nums", children: [
          roles.length,
          " roles"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold tabular-nums", children: [
          issueRules.length,
          " pending rules"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Roles and permissions", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[460px] text-left text-[11px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-[10px] tracking-wide text-muted-foreground uppercase", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pb-1 pr-2", children: "Role" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pb-1 pr-2", children: "Scope" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pb-1 pr-2", children: "Edit" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pb-1", children: "Admin" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: roles.map((role) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1.5 pr-2 font-medium", children: role.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1.5 pr-2 text-muted-foreground", children: role.scope }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1.5 pr-2", children: ["admin", "dqc", "dqmo", "entry"].includes(role.key) ? "Yes" : "No" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1.5", children: role.key === "admin" ? "Yes" : "No" })
        ] }, role.key)) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[10px] text-muted-foreground", children: "Roles are read live from Users and roles. The server still enforces every permission." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "Non-negotiable rules", children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1.5 text-[11px]", children: SPEC.nonNegotiable.map((rule, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "mt-0.5 size-3.5 shrink-0 text-teal-700" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: text(`spec.rule.${index}`, rule) })
    ] }, rule)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "Status lists", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: SPEC.statusLists.map((list) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold", children: list.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 flex flex-wrap gap-1", children: list.values.map((value) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px]", children: value }, value)) })
    ] }, list.title)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "Data entities", children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2", children: SPEC.entities.map((entity) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary", children: "·" }),
      entity
    ] }, entity)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "Speed targets", children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1 text-[11px] text-muted-foreground", children: SPEC.speed.map((target) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mt-0.5 size-3 shrink-0 text-teal-700" }),
      target
    ] }, target)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Integrations", className: "lg:col-span-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2", children: SPEC.integrations.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary", children: "·" }),
        item
      ] }, item)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-[10px] text-muted-foreground", children: [
        "Read NQAS result is currently",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "text-foreground", children: settings?.resultReaderEnabled === true ? "on" : "off" }),
        "."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "Pending rule registry", className: "lg:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3", children: issueRules.map((rule) => {
      const liveRule = pendingConfig[rule.id];
      const enabled = liveRule?.enabled ?? rule.defaultEnabled;
      const severity = liveRule?.severity ?? rule.defaultSeverity;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/50 bg-background/60 px-2.5 py-2 text-[10.5px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium text-foreground", children: rule.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-muted-foreground", children: [
          severity,
          " · ",
          enabled ? "On" : "Off"
        ] })
      ] }, rule.id);
    }) }) })
  ] });
}
function FunctionsTab({
  roleFilter,
  setRoleFilter,
  roles,
  text,
  canEdit,
  onEdit
}) {
  const pages = roleFilter === "all" ? PAGE_FUNCTIONS : PAGE_FUNCTIONS.filter((page) => page.roles.includes(roleFilter));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setRoleFilter("all"), "aria-pressed": roleFilter === "all", className: cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", roleFilter === "all" ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:bg-muted"), children: "All roles" }),
      roles.map((role) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setRoleFilter(role.key), "aria-pressed": roleFilter === role.key, className: cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", roleFilter === role.key ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:bg-muted"), children: role.label }, role.key))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3", children: pages.map((page) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-card/80 p-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "flex items-center gap-1 text-sm font-semibold", children: [
            text(`page.${page.id}.title`, page.title),
            /* @__PURE__ */ jsxRuntimeExports.jsx(EditPencil, { canEdit, label: `page.${page.id}.title`, value: text(`page.${page.id}.title`, page.title), onEdit })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[11px] leading-snug text-muted-foreground", children: [
            text(`page.${page.id}.purpose`, page.purpose),
            /* @__PURE__ */ jsxRuntimeExports.jsx(EditPencil, { canEdit, label: `page.${page.id}.purpose`, value: text(`page.${page.id}.purpose`, page.purpose), onEdit })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { className: "size-4 shrink-0 text-primary" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 space-y-0.5 text-[10.5px] text-muted-foreground", children: page.functions.map((fn) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
        "· ",
        fn
      ] }, fn)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap items-center gap-1", children: page.roles.map((role) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[9.5px]", children: roleLabel(role) }, role)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: page.to, className: "mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline", children: [
        "Open page ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3" })
      ] })
    ] }, page.id)) }),
    pages.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "rounded-lg border border-dashed p-4 text-xs text-muted-foreground", children: "No page is available to this role." })
  ] });
}
function ToolsTab({
  text,
  canEdit,
  onEdit
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3", children: SYSTEM_TOOLS.map((tool) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-card/80 p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "flex items-center gap-1 text-sm font-semibold", children: [
        text(`tool.${tool.id}.title`, tool.title),
        /* @__PURE__ */ jsxRuntimeExports.jsx(EditPencil, { canEdit, label: `tool.${tool.id}.title`, value: text(`tool.${tool.id}.title`, tool.title), onEdit })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-4 shrink-0 text-primary" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[11px] leading-snug text-muted-foreground", children: [
      text(`tool.${tool.id}.purpose`, tool.purpose),
      /* @__PURE__ */ jsxRuntimeExports.jsx(EditPencil, { canEdit, label: `tool.${tool.id}.purpose`, value: text(`tool.${tool.id}.purpose`, tool.purpose), onEdit })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "mt-2 space-y-1 text-[10.5px] text-muted-foreground", children: tool.steps.map((step, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold text-primary", children: [
        index + 1,
        "."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        text(`tool.${tool.id}.step.${index}`, step),
        /* @__PURE__ */ jsxRuntimeExports.jsx(EditPencil, { canEdit, label: `tool.${tool.id}.step.${index}`, value: text(`tool.${tool.id}.step.${index}`, step), onEdit })
      ] })
    ] }, step)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: tool.to, className: "mt-2 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15", children: [
      "Try it ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-3" })
    ] })
  ] }, tool.id)) });
}
function FeaturesTab({
  settings,
  text,
  canEdit,
  onEdit
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3", children: SYSTEM_FEATURES.map((feature) => {
    const status = feature.settingKey === "resultReaderEnabled" ? settings === void 0 ? "Off by default" : settings?.resultReaderEnabled === true ? "Live" : "Off by default" : feature.status;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-card/80 p-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "flex items-center gap-1 text-sm font-semibold", children: [
          text(`feature.${feature.id}.title`, feature.title),
          /* @__PURE__ */ jsxRuntimeExports.jsx(EditPencil, { canEdit, label: `feature.${feature.id}.title`, value: text(`feature.${feature.id}.title`, feature.title), onEdit })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold", FEATURE_TONE[status]), children: status })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[11px] leading-snug text-muted-foreground", children: [
        text(`feature.${feature.id}.description`, feature.description),
        /* @__PURE__ */ jsxRuntimeExports.jsx(EditPencil, { canEdit, label: `feature.${feature.id}.description`, value: text(`feature.${feature.id}.description`, feature.description), onEdit })
      ] }),
      feature.settingKey === "resultReaderEnabled" && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 rounded-md bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground", children: [
        "Admin → Documents switch: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "text-foreground", children: settings?.resultReaderEnabled === true ? "On" : "Off" })
      ] }),
      feature.to && /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: feature.to, className: "mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline", children: [
        "Open ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-3" })
      ] })
    ] }, feature.id);
  }) });
}

export { SystemMapPage as default };
