/**
 * ADMIN GUIDE CONTENT — static, lazy-loaded, one article per registry page.
 * Labels are resolved from sidebarConfig at render time, so a rename in
 * Admin → Pages changes the guide too. Sentence rule: short, active, everyday.
 */

import type { SidebarLabelKey } from "@/lib/sidebarLabels";

export type GuideGroup = "start" | "daily" | "reports" | "imports" | "admin";
export type GuideRole = "admin" | "dqc" | "dqmo" | "entry" | "viewer";

export type GuideStep = {
  text: string;
  roles?: GuideRole[];
  /** CSS selector for the exact control named by the step. */
  target?: string;
  /** Optional icon key understood by the guide UI. */
  icon?: string;
};

export type GuideArticle = {
  route: string;
  titleKey?: SidebarLabelKey;
  fallbackTitle: string;
  group: GuideGroup;
  purpose: string;
  roles: GuideRole[];
  steps: GuideStep[];
  see: string[];
  tips: string[];
  problems: { problem: string; fix: string }[];
  related: string[];
  lastChecked: string;
};

export const GUIDE_GROUPS: { id: GuideGroup; label: string; hint: string }[] = [
  { id: "start", label: "Start here", hint: "The first pages everyone opens" },
  { id: "daily", label: "Daily work", hint: "Facility data pages" },
  { id: "reports", label: "Reports", hint: "Exports, lists and downloads" },
  { id: "imports", label: "Imports", hint: "Bulk data upload" },
  { id: "admin", label: "Admin", hint: "Settings and people" },
];

const ALL: GuideRole[] = ["admin", "dqc", "dqmo", "entry", "viewer"];
const EDITORS: GuideRole[] = ["admin", "dqc", "dqmo", "entry"];
const ADMIN: GuideRole[] = ["admin"];

const checked = "04-Nov-2026";

export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    route: "/dashboard",
    titleKey: "nav.dashboard",
    fallbackTitle: "Dashboard",
    group: "start",
    purpose:
      "See the whole district at a glance. Cards count facilities by stage and status.",
    roles: ALL,
    steps: [
      { text: "Read the top cards for totals and needs attention." },
      { text: "Click any card to open the filtered Master List." },
      { text: "Use the cycle picker to change the reporting cycle." },
      { text: "Open Quick actions for PPT, export and add assessment.", roles: EDITORS },
      { text: "Scroll to the block and type tables for comparisons." },
    ],
    see: [
      "Pipeline cards: eligible, assessed, certified, expired.",
      "Needs attention list with a fix link on each row.",
      "Block-wise and type-wise summary tables.",
    ],
    tips: [
      "The numbers use the same rows as the Master List.",
      "Click a block name to filter the district view.",
    ],
    problems: [
      { problem: "A card is zero but facilities exist.", fix: "Check the cycle picker; it may be an older cycle." },
      { problem: "A facility is missing from a card.", fix: "Open the Master List and search the facility name." },
    ],
    related: ["/facilities", "/pending", "/reports"],
    lastChecked: checked,
  },
  {
    route: "/facilities",
    titleKey: "nav.facilities",
    fallbackTitle: "Facility Master List",
    group: "start",
    purpose:
      "The full tracker sheet. Search, filter, edit and open any facility from one table.",
    roles: ALL,
    steps: [
      { text: "Search by facility name, NIN or PHC." },
      { text: "Use Filters to pick block, type, status or cycle." },
      { text: "Click a row to open the Quick View." },
      { text: "Turn on Edit mode to change cells in place.", roles: EDITORS },
      { text: "Use Columns to show or hide fields." },
      { text: "Export the current view from Export." },
    ],
    see: [
      "Frozen Facility column and a sticky header.",
      "Status pills with colour and a text label.",
      "Row action menu for edit, profile, history and print.",
    ],
    tips: [
      "The URL keeps your filters, so Back restores them.",
      "Ctrl-click a facility to open its profile in a new tab.",
      "Compact density fits more rows on one screen.",
    ],
    problems: [
      { problem: "A cell will not edit.", fix: "The column may be auto-calculated. Read the lock tooltip." },
      { problem: "A hidden column is missing.", fix: "Open Columns and tick the field again." },
    ],
    related: ["/facilities/state-assessment", "/pending", "/reports"],
    lastChecked: checked,
  },
  {
    route: "/reports",
    titleKey: "nav.reports",
    fallbackTitle: "Reports & Export",
    group: "reports",
    purpose:
      "Download the Master List, topic line lists and district summaries as Excel, PDF or CSV.",
    roles: ALL,
    steps: [
      { text: "Choose Master List, Line lists or Summary." },
      { text: "Pick the cycle and the block scope." },
      { text: "Select the columns you need." },
      { text: "Choose Excel, PDF, CSV or Print." },
      { text: "Press Export and wait for the file." },
    ],
    see: [
      "One row per facility in the Master List export.",
      "Separate Facility, Type, Block and PHC columns.",
      "A summary strip in line-list exports.",
    ],
    tips: [
      "The export uses your current filters.",
      "PDF files carry the district name and date.",
    ],
    problems: [
      { problem: "The file has no rows.", fix: "Clear the search or widen the block filter." },
      { problem: "The download is blocked.", fix: "Allow downloads for this site, then retry." },
    ],
    related: ["/summary-report", "/custom-report", "/facilities"],
    lastChecked: checked,
  },
  {
    route: "/facilities/state-assessment",
    titleKey: "category.stateAssessment",
    fallbackTitle: "State Assessment",
    group: "daily",
    purpose:
      "Track State Assessment visits, SaQsham scores and the assessment report for each facility.",
    roles: ALL,
    steps: [
      { text: "Find the facility in the list." },
      { text: "Open it and go to State Assessment." },
      { text: "Enter the visit dates and assessor names.", roles: EDITORS },
      { text: "Upload the SA report and checklist.", roles: EDITORS },
      { text: "Save the changes and check the status." },
    ],
    see: [
      "Visit schedule, assessors and SaQsham category.",
      "Report and checklist documents with open and download.",
      "A status that updates after a saved visit.",
    ],
    tips: [
      "The report must be a PDF; the checklist is Excel.",
      "Use the same spelling for assessor names every time.",
    ],
    problems: [
      { problem: "The upload refuses the file.", fix: "Check the file type and size shown in the dialog." },
      { problem: "The visit date cannot be changed.", fix: "Ask an admin to unlock the quarter." },
    ],
    related: ["/facilities", "/documents", "/bulk-import"],
    lastChecked: checked,
  },
  {
    route: "/facilities/certification",
    titleKey: "category.nqasCertification",
    fallbackTitle: "NQAS Certification",
    group: "daily",
    purpose:
      "See the NQAS result, score, certificate dates and validity for every facility.",
    roles: ALL,
    steps: [
      { text: "Search for a facility or filter by block." },
      { text: "Open the record to edit certification details.", roles: EDITORS },
      { text: "Enter the GoI letter date and score.", roles: EDITORS },
      { text: "Add the certificate validity date.", roles: EDITORS },
      { text: "Save and confirm the status pill changed." },
    ],
    see: [
      "Certified score as a percentage.",
      "Certificate validity with an expiry colour.",
      "Links to the current certificate document.",
    ],
    tips: [
      "The validity date drives surveillance and recertification reminders.",
      "A blank score is not zero; leave it blank when unknown.",
    ],
    problems: [
      { problem: "A facility is not listed.", fix: "Check eligibility and the selected cycle." },
      { problem: "The status says expired.", fix: "Update the validity date or record a new cycle." },
    ],
    related: ["/facilities/recertification", "/pending", "/documents"],
    lastChecked: checked,
  },
  {
    route: "/facilities/recertification",
    titleKey: "category.recertification",
    fallbackTitle: "Recertification",
    group: "daily",
    purpose:
      "Plan surveillance visits and the next certification cycle before the certificate expires.",
    roles: ALL,
    steps: [
      { text: "Sort by certificate validity to find the next expiry." },
      { text: "Open the facility and check the surveillance dates." },
      { text: "Record the visit and the next due date.", roles: EDITORS },
      { text: "Upload the surveillance report.", roles: EDITORS },
      { text: "Save and confirm the next action date." },
    ],
    see: [
      "Certificate validity and days remaining.",
      "Surveillance visit dates and next action.",
      "Recertification cycle and status.",
    ],
    tips: [
      "Start the recertification file 90 days before expiry.",
      "The next action date is the earliest open deadline.",
    ],
    problems: [
      { problem: "No next action date.", fix: "Add the validity date or the surveillance date." },
      { problem: "The cycle looks wrong.", fix: "Check the active cycle in Cycle settings." },
    ],
    related: ["/facilities/certification", "/pending", "/reports"],
    lastChecked: checked,
  },
  {
    route: "/facilities/internal-assessment",
    titleKey: "category.internalAssessment",
    fallbackTitle: "Internal Assessment",
    group: "daily",
    purpose:
      "Review quarterly Internal Assessment scores for NQAS and Kayakalp.",
    roles: ALL,
    steps: [
      { text: "Pick the quarter or cycle." },
      { text: "Search for a facility or block." },
      { text: "Open a row to see all four quarter scores." },
      { text: "Enter missing scores from the import file.", roles: EDITORS },
      { text: "Save and check the quarter status." },
    ],
    see: [
      "NQAS and Kayakalp scores for each quarter.",
      "A missing score shown as blank, never zero.",
      "Quarter status: provisional or final.",
    ],
    tips: [
      "Bulk scores belong in Bulk Import, not here.",
      "A final quarter cannot be edited by Data Entry.",
    ],
    problems: [
      { problem: "A quarter is locked.", fix: "Ask a State Admin to reopen the quarter." },
      { problem: "Scores imported twice.", fix: "Use the import history to undo the batch." },
    ],
    related: ["/bulk-import/internal-assessment", "/pending", "/documents"],
    lastChecked: checked,
  },
  {
    route: "/facilities/fund",
    titleKey: "category.gapClosureFund",
    fallbackTitle: "Gap Closure Fund",
    group: "daily",
    purpose:
      "Track gap closure money: sanctioned, released and used for each facility.",
    roles: ALL,
    steps: [
      { text: "Search or filter by block." },
      { text: "Open a facility to edit the amount.", roles: EDITORS },
      { text: "Enter the sanction and release dates.", roles: EDITORS },
      { text: "Add the utilisation amount and remarks.", roles: EDITORS },
      { text: "Save and check the fund status." },
    ],
    see: [
      "Amount sanctioned and released in ₹.",
      "Financial year and utilisation status.",
      "Facilities with gap amount still open.",
    ],
    tips: [
      "Use the latest financial year for the current position.",
      "Keep the sanction letter with the facility documents.",
    ],
    problems: [
      { problem: "The amount shows as zero.", fix: "Enter the sanctioned amount and financial year." },
      { problem: "The wrong year is shown.", fix: "Change the financial year on the record." },
    ],
    related: ["/facilities/building", "/reports", "/documents"],
    lastChecked: checked,
  },
  {
    route: "/facilities/building",
    titleKey: "category.building",
    fallbackTitle: "Building",
    group: "daily",
    purpose:
      "Record building type, condition, ownership and the condemned certificate.",
    roles: ALL,
    steps: [
      { text: "Find the facility in the list." },
      { text: "Open the building section." },
      { text: "Choose the building type and condition.", roles: EDITORS },
      { text: "Add ownership and the available area.", roles: EDITORS },
      { text: "Upload the condemned certificate if any.", roles: EDITORS },
    ],
    see: [
      "Building type and condition bucket.",
      "Dilapidated and condemned flags.",
      "The certificate document when present.",
    ],
    tips: [
      "A condemned building needs the certificate to clear attention.",
      "Use the same condition words as the dropdown.",
    ],
    problems: [
      { problem: "The facility shows dilapidated.", fix: "Check the condition and the certificate." },
      { problem: "The upload is missing.", fix: "Use Documents and check the Drive status." },
    ],
    related: ["/facilities/fire-noc", "/documents", "/pending"],
    lastChecked: checked,
  },
  {
    route: "/facilities/fire-noc",
    titleKey: "category.fireNoc",
    fallbackTitle: "Fire NOC",
    group: "daily",
    purpose:
      "Check Fire NOC availability, validity and the NOC document for each facility.",
    roles: ALL,
    steps: [
      { text: "Filter to facilities with no NOC." },
      { text: "Open a facility and add the NOC.", roles: EDITORS },
      { text: "Enter the NOC number and expiry date.", roles: EDITORS },
      { text: "Upload the NOC PDF.", roles: EDITORS },
      { text: "Save and check the status." },
    ],
    see: [
      "NOC status and validity date.",
      "Red cells for expired or missing NOC.",
      "Quick filters for expiring in 90 days.",
    ],
    tips: [
      "NOC validity is a common Needs attention reason.",
      "Upload the signed NOC, not a screenshot.",
    ],
    problems: [
      { problem: "The NOC has no validity date.", fix: "Enter the expiry date from the certificate." },
      { problem: "The document will not open.", fix: "Reconnect Drive or re-upload the file." },
    ],
    related: ["/facilities/building", "/documents", "/pending"],
    lastChecked: checked,
  },
  {
    route: "/summary-report",
    titleKey: "nav.summary",
    fallbackTitle: "NQAS Summary Report",
    group: "reports",
    purpose:
      "Read a one-page summary of certification progress for the district or one block.",
    roles: ALL,
    steps: [
      { text: "Choose the cycle and block." },
      { text: "Read the stage and status tables." },
      { text: "Check the needs attention list." },
      { text: "Download the PDF for a meeting." },
    ],
    see: [
      "Counts by stage and certification status.",
      "Block-wise comparisons.",
      "A print-ready PDF.",
    ],
    tips: ["Use the same cycle as the meeting agenda.", "The PDF is A4 landscape."],
    problems: [
      { problem: "Counts look old.", fix: "Refresh the page; the data is live." },
      { problem: "A block is missing.", fix: "Check that the block has facilities." },
    ],
    related: ["/dashboard", "/reports", "/custom-report"],
    lastChecked: checked,
  },
  {
    route: "/custom-report",
    titleKey: "nav.customReport",
    fallbackTitle: "Custom Report Builder",
    group: "reports",
    purpose:
      "Build your own pivot report from facility fields, then save it or export it.",
    roles: ALL,
    steps: [
      { text: "Pick fields from the left panel." },
      { text: "Drag fields into Rows, Columns and Values." },
      { text: "Add filters to narrow the report." },
      { text: "Check the live pivot preview." },
      { text: "Save the view or open Export." },
    ],
    see: [
      "A live pivot table with totals.",
      "Saved views with a default option.",
      "Excel, PDF and CSV export settings.",
    ],
    tips: [
      "Save a view before you share the link.",
      "Saved reports can become a custom page in Admin → Pages.",
    ],
    problems: [
      { problem: "The pivot is empty.", fix: "Add at least one Value field." },
      { problem: "A saved view will not open.", fix: "Retired fields are dropped; rebuild the view." },
    ],
    related: ["/reports", "/admin", "/guide"],
    lastChecked: checked,
  },
  {
    route: "/generate-ppt",
    titleKey: "nav.generatePpt",
    fallbackTitle: "Generate PPT",
    group: "reports",
    purpose:
      "Create a review deck with the district’s numbers for a meeting.",
    roles: ALL,
    steps: [
      { text: "Pick the cycle and the slides you need." },
      { text: "Choose the block scope." },
      { text: "Preview the slide list." },
      { text: "Download the PowerPoint file." },
    ],
    see: [
      "A cover slide with the district and date.",
      "KPI, block and status slides.",
      "Charts built from the same tracker rows.",
    ],
    tips: ["Keep the deck to ten slides for a review.", "Download again after data changes."],
    problems: [
      { problem: "The deck has no charts.", fix: "Choose the chart slides before export." },
      { problem: "The file is slow.", fix: "Use the current cycle only." },
    ],
    related: ["/summary-report", "/dashboard", "/reports"],
    lastChecked: checked,
  },
  {
    route: "/pending",
    titleKey: "nav.pending",
    fallbackTitle: "Pending & Follow-up",
    group: "reports",
    purpose:
      "See every facility with something missing, not updated, overdue or conflicting.",
    roles: ALL,
    steps: [
      { text: "Pick a severity or category chip." },
      { text: "Search for one facility." },
      { text: "Open a row’s action to fix it." },
      { text: "Use Export for a follow-up list." },
    ],
    see: [
      "One row per issue, grouped by facility.",
      "Days since, cycle and a plain remark.",
      "A Fix button that opens the right section.",
    ],
    tips: [
      "Fix high severity first.",
      "The list uses the same rules as the sidebar badge.",
    ],
    problems: [
      { problem: "An item will not clear.", fix: "Open the linked section and save the missing field." },
      { problem: "Too many rows.", fix: "Filter by block or category." },
    ],
    related: ["/facilities", "/documents", "/reports"],
    lastChecked: checked,
  },
  {
    route: "/links",
    titleKey: "nav.links",
    fallbackTitle: "Links Organiser",
    group: "reports",
    purpose:
      "Keep every report and data-collection link in one searchable register.",
    roles: ALL,
    steps: [
      { text: "Search by title, category or facility." },
      { text: "Add a link with its category and type.", roles: EDITORS },
      { text: "Set a due date for a reminder.", roles: EDITORS },
      { text: "Open the link to check it still works." },
    ],
    see: [
      "Grouped link cards with type icons.",
      "A broken-link warning after a check.",
      "Reminders for due links.",
    ],
    tips: ["Archive old links instead of deleting them.", "Use the exact shared URL."],
    problems: [
      { problem: "The link is marked broken.", fix: "Open it in a browser; replace the URL if needed." },
      { problem: "A reminder did not arrive.", fix: "Check Admin → Links reminders are on." },
    ],
    related: ["/documents", "/reports", "/admin"],
    lastChecked: checked,
  },
  {
    route: "/documents",
    titleKey: "nav.documents",
    fallbackTitle: "Documents",
    group: "reports",
    purpose:
      "Open, download or ZIP every current facility document from one cached list.",
    roles: ALL,
    steps: [
      { text: "Filter by block, type, document or state." },
      { text: "Switch between Matrix and Files." },
      { text: "Click an uploaded cell to open or download.", },
      { text: "Drop files on the page to upload several.", roles: EDITORS },
      { text: "Check the match preview, then confirm.", roles: EDITORS },
      {
        text: "Download ZIP for this filter, a block or one facility.",
        target: '[data-guide-target="documents-zip"]',
      },
    ],
    see: [
      "Coverage bars with uploaded vs expected.",
      "Green, amber and red cell states.",
      "A ZIP estimate before you download.",
    ],
    tips: [
      "Name a dropped file “Facility Type – Document” for an exact match.",
      "A missing Drive file is never counted as uploaded.",
    ],
    problems: [
      { problem: "A dropped file is not matched.", fix: "Check the facility name, type and document label." },
      { problem: "The ZIP is empty.", fix: "Clear the Missing filter; missing files have no bytes." },
    ],
    related: ["/admin", "/pending", "/reports"],
    lastChecked: checked,
  },
  {
    route: "/bulk-import",
    titleKey: "nav.bulkImport",
    fallbackTitle: "Bulk Import",
    group: "imports",
    purpose:
      "Import the facility master, SaQsham status and Internal Assessment scores in bulk.",
    roles: ["admin", "entry"],
    steps: [
      { text: "Choose the import type." },
      { text: "Download the template if you need it." },
      { text: "Drop the filled Excel file." },
      { text: "Check the matched and unmatched rows." },
      { text: "Confirm the import and read the report." },
      { text: "Use Undo from the history if needed.", roles: ["admin"] },
    ],
    see: [
      "A preview before anything is written.",
      "Row-level errors with a reason.",
      "Import history with counts and Undo.",
    ],
    tips: [
      "Do not rename the template columns.",
      "Import the facility master before SaQsham.",
    ],
    problems: [
      { problem: "Rows are unmatched.", fix: "Check the NIN and facility name spelling." },
      { problem: "The import is blocked.", fix: "Close the quarter or fix the file type." },
    ],
    related: ["/facilities", "/facilities/internal-assessment", "/admin"],
    lastChecked: checked,
  },
  {
    route: "/guide",
    titleKey: "nav.guide",
    fallbackTitle: "Admin Guide",
    group: "admin",
    purpose:
      "Read how every page works, search a task, or open the guide from any page.",
    roles: ALL,
    steps: [
      { text: "Search a page name or a task." },
      { text: "Pick the role you are helping." },
      { text: "Read the steps and open the page." },
      { text: "Download the PDF or one article." },
    ],
    see: [
      "Contents grouped like the sidebar.",
      "A checklist for your first 15 minutes.",
      "Ten “How do I…” cards.",
    ],
    tips: ["Press / to search.", "The ? button opens the article for the current page."],
    problems: [
      { problem: "A page has no article.", fix: "Ask an admin to add its guide stub." },
      { problem: "The guide is missing.", fix: "Ask a State Admin to share it in Admin → Pages." },
    ],
    related: ["/admin", "/dashboard", "/facilities"],
    lastChecked: checked,
  },
  {
    route: "/admin",
    titleKey: "nav.admin",
    fallbackTitle: "Admin Settings overview",
    group: "admin",
    purpose:
      "A short overview. Each Admin tab has its own article in this guide.",
    roles: ADMIN,
    steps: [
      { text: "Open Admin Settings and choose one tab." },
      { text: "Search settings with Ctrl/Cmd+K." },
      { text: "Click Save all at the bottom when changes appear.", target: '[data-guide-target="admin-save"]' },
      { text: "Open Audit and logs to read the history.", target: '[data-guide-target="admin-tab-maintenance"]' },
    ],
    see: [
      "General, Pages, Users and roles, Documents and more.",
      "Unsaved counts only where work is pending.",
      "Export settings in the ⋯ menu.",
    ],
    tips: [
      "Admin Settings can never be hidden.",
      "The last State Admin cannot be removed.",
    ],
    problems: [
      { problem: "A setting will not save.", fix: "Read the red error and fix the field." },
      { problem: "A role cannot open a page.", fix: "Open Admin → Pages and add the role." },
    ],
    related: [
      "/admin?tab=master-data",
      "/admin?tab=pages",
      "/admin?tab=users",
      "/admin?tab=documents",
      "/admin?tab=pending",
      "/admin?tab=links",
      "/admin?tab=data-checks",
      "/admin?tab=google-drive",
      "/admin?tab=workspace",
      "/admin?tab=maintenance",
    ],
    lastChecked: checked,
  },
  {
    route: "/bulk-import/internal-assessment",
    fallbackTitle: "Import Internal Assessment",
    group: "imports",
    purpose: "Bulk-load quarterly NQAS and Kayakalp Internal Assessment scores.",
    roles: ["admin", "entry"],
    steps: [
      { text: "Download the IA template." },
      { text: "Fill one row per facility and quarter." },
      { text: "Drop the file and check the preview." },
      { text: "Confirm and read the error report." },
    ],
    see: ["Quarter columns", "Blank scores kept blank", "Import history with Undo"],
    tips: ["Do not type 0 for a missing score.", "Check the quarter before importing."],
    problems: [
      { problem: "A quarter is locked.", fix: "Ask an admin to reopen it." },
      { problem: "A score is rejected.", fix: "Use a number from 0 to 100." },
    ],
    related: ["/bulk-import", "/facilities/internal-assessment"],
    lastChecked: checked,
  },
  {
    route: "/bulk-import/saqsham",
    fallbackTitle: "Import SaQsham status",
    group: "imports",
    purpose: "Import the SaQsham facility type, category and status in bulk.",
    roles: ["admin", "entry"],
    steps: [
      { text: "Download the SaQsham template." },
      { text: "Match each row by NIN." },
      { text: "Drop the file and review matches." },
      { text: "Confirm and check the report." },
    ],
    see: ["Matched and unmatched rows", "SaQsham category changes", "Import history"],
    tips: ["Import the facility master first.", "Use the NIN when names differ."],
    problems: [
      { problem: "Rows are unmatched.", fix: "Check NIN and facility spelling." },
      { problem: "The import is blocked.", fix: "Only State Admin and Data Entry can import SaQsham." },
    ],
    related: ["/bulk-import", "/bulk-import?tab=mapping", "/facilities/state-assessment"],
    lastChecked: checked,
  },
  {
    route: "/bulk-import?tab=mapping",
    fallbackTitle: "SaQsham status mapping",
    group: "imports",
    purpose: "Keep the portal status and Documents Status (Report) mapping, report groups and colours current.",
    roles: ALL,
    steps: [
      { text: "Open Bulk Import → Status mapping.", target: "[data-admin-anchor=\"saqsham-status-map\"]" },
      { text: "Edit the portal text, or choose the Documents Status (Report) group.", target: "[data-admin-anchor=\"saqsham-status-map\"]" },
      { text: "Add a status at the top, or add and reorder report groups below.", target: "[data-admin-anchor=\"saqsham-status-map\"]" },
      { text: "Use Import CSV, Export CSV or Reset to seed when needed.", target: "[data-admin-anchor=\"saqsham-status-map\"]" },
    ],
    see: ["Used by n facilities", "Result Declared system group", "Saved and Undo", "Impact before a used status changes"],
    tips: [
      "Portal text is kept exactly as imported; duplicates ignore case, extra spaces and spaces around hyphens.",
      "Renaming a used portal status keeps the old text as an alias, so past imports still match.",
      "Only a State Admin can edit; everyone else can view the mapping.",
    ],
    problems: [
      { problem: "A report group cannot be deleted.", fix: "Move its statuses to another group first." },
      { problem: "A status is used by facilities.", fix: "Read the impact message before you confirm; saved facility data is not erased." },
    ],
    related: ["/bulk-import/saqsham", "/bulk-import"],
    lastChecked: checked,
  },
];

/* One article per Admin tab. The tab id is the same id Admin uses, so the "?"
   button can open the exact tab's article. */
function adminTabArticle(input: {
  id: string;
  label: string;
  purpose: string;
  steps: { text: string; target?: string }[];
  see: string[];
  tips: string[];
  problem: string;
  fix: string;
}): GuideArticle {
  const tabTarget = `[data-guide-target="admin-tab-${input.id}"]`;
  return {
    route: `/admin?tab=${input.id}`,
    fallbackTitle: input.label,
    group: "admin",
    purpose: input.purpose,
    roles: ADMIN,
    steps: input.steps.map((step, index) => ({
      ...step,
      target: step.target ?? (index === 0 ? tabTarget : undefined),
    })),
    see: input.see,
    tips: input.tips,
    problems: [{ problem: input.problem, fix: input.fix }],
    related: ["/admin", "/guide"],
    lastChecked: checked,
  };
}

export const ADMIN_TAB_ARTICLES: GuideArticle[] = [
  adminTabArticle({
    id: "master-data",
    label: "General",
    purpose: "Set the district, blocks and PHCs that every facility uses.",
    steps: [
      { text: "Open Admin Settings and click the General tab." },
      { text: "Edit the district name in the General panel." },
      { text: "Click Save all when the bar shows your changes.", target: '[data-guide-target="admin-save"]' },
    ],
    see: ["District name", "Blocks and PHCs", "Unsaved count"],
    tips: ["Rename a block only after checking its facilities."],
    problem: "The Save bar is missing.",
    fix: "Make a change first; it appears only with unsaved work.",
  }),
  adminTabArticle({
    id: "pages",
    label: "Pages",
    purpose: "Create, rename, hide or remove every page in the sidebar.",
    steps: [
      { text: "Open Admin Settings and click the Pages tab." },
      { text: "Click Create page to open the three-step wizard.", target: '[data-guide-target="pages-create"]' },
      { text: "Choose the columns and who may see the page." },
      { text: "Click Save all when the page table is ready.", target: '[data-guide-target="admin-save"]' },
    ],
    see: ["Visible switch", "Role ticks", "Trash and restore"],
    tips: ["Admin Settings itself can never be hidden."],
    problem: "A user cannot open a page.",
    fix: "Tick that role in the page's Who can see row.",
  }),
  adminTabArticle({
    id: "users",
    label: "Users and roles",
    purpose: "Invite people, set roles and assign the blocks they can work in.",
    steps: [
      { text: "Open Admin Settings and click Users and roles." },
      { text: "Click Invite user and type the email.", target: '[data-guide-target="users-invite"]' },
      { text: "Choose the role and tick the blocks." },
      { text: "Click Send invitation, then Save all.", target: '[data-guide-target="admin-save"]' },
    ],
    see: ["Invite and pending rows", "Role menu", "Blocks chips"],
    tips: ["The last State Admin cannot be removed."],
    problem: "An invited person cannot sign in.",
    fix: "Check the invitation is pending and the email is correct.",
  }),
  adminTabArticle({
    id: "documents",
    label: "Documents",
    purpose: "Set which documents each facility must upload and when they are due.",
    steps: [
      { text: "Open Admin Settings and click the Documents tab." },
      { text: "Turn a document requirement on or off." },
      { text: "Choose its cycle rule and due window." },
      { text: "Click Save all at the bottom.", target: '[data-guide-target="admin-save"]' },
    ],
    see: ["Six document rows", "Required switch", "Due windows"],
    tips: ["The Documents page, badge and save gate read this rule."],
    problem: "A missing document is not red.",
    fix: "Switch the rule to Required and save.",
  }),
  adminTabArticle({
    id: "pending",
    label: "Pending rules",
    purpose: "Choose which issues count as needs attention and how severe they are.",
    steps: [
      { text: "Open Admin Settings and click Pending rules." },
      { text: "Toggle a rule on or off." },
      { text: "Set its severity and threshold." },
      { text: "Click Save all in the sticky bar.", target: '[data-guide-target="admin-save"]' },
    ],
    see: ["Rule switches", "Severity", "Threshold days"],
    tips: ["The bell and the Pending page share these rules."],
    problem: "The bell count looks wrong.",
    fix: "Check the rule is on and the threshold is correct.",
  }),
  adminTabArticle({
    id: "links",
    label: "Links",
    purpose: "Set link categories, owners, statuses and reminder timing.",
    steps: [
      { text: "Open Admin Settings and click Links." },
      { text: "Edit a category or owner in the list." },
      { text: "Choose who receives link reminders." },
      { text: "Click Save all when the bar appears.", target: '[data-guide-target="admin-save"]' },
    ],
    see: ["Categories", "Owners", "Reminder recipients"],
    tips: ["Archive an old link instead of deleting its category."],
    problem: "Links due reminders are missing.",
    fix: "Turn on the reminder and pick a recipient.",
  }),
  adminTabArticle({
    id: "data-checks",
    label: "Data checks",
    purpose: "Confirm or correct stored values that cannot be real.",
    steps: [
      { text: "Open Admin Settings and click Data checks." },
      { text: "Read the reason on a flagged row." },
      { text: "Click Confirm to accept the correction." },
      { text: "Check Audit and logs for the record.", target: '[data-guide-target="admin-tab-maintenance"]' },
    ],
    see: ["Flagged rows", "Reason text", "Confirm and ignore"],
    tips: ["A confirmation writes an audit entry."],
    problem: "A row is still flagged.",
    fix: "Confirm it again; another rule may also match.",
  }),
  adminTabArticle({
    id: "google-drive",
    label: "Google Drive",
    purpose: "Connect Drive, check storage and run the document self-test.",
    steps: [
      { text: "Open Admin Settings and click Google Drive." },
      { text: "Enter the client ID and client secret." },
      { text: "Click Connect and approve Google access.", target: '[data-guide-target="drive-connect"]' },
      { text: "Click Run self-test before uploading documents." },
    ],
    see: ["Connection state", "Storage used", "Self-test rows"],
    tips: ["Never paste a token into the guide or a chat."],
    problem: "Uploads are paused.",
    fix: "Read the reason, then click Resume uploads.",
  }),
  adminTabArticle({
    id: "workspace",
    label: "Table & Display",
    purpose: "Set dropdown lists, column labels, frozen columns and the Facility cell.",
    steps: [
      { text: "Open Admin Settings and click Table & Display." },
      { text: "Click Display in the workspace menu.", target: '[data-guide-target="workspace-display"]' },
      { text: "Pick the default Facility cell style.", target: '#display-facility-cell' },
      { text: "Choose frozen columns and display rules." },
      { text: "Click Save all to publish them.", target: '[data-guide-target="admin-save"]' },
    ],
    see: ["Facility cell", "Frozen columns", "Cycle timing"],
    tips: ["Users can still pick their own Facility cell style."],
    problem: "A column label did not change.",
    fix: "Save the Table & Display draft; unsaved labels stay local.",
  }),
  adminTabArticle({
    id: "maintenance",
    label: "Audit and logs",
    purpose: "Read the activity log, recompute status and use the danger zone.",
    steps: [
      { text: "Open Admin Settings and click Audit and logs." },
      { text: "Search the activity list for a change." },
      { text: "Use Recompute status only after a bulk import." },
      { text: "Read the red danger-zone warning before deleting." },
    ],
    see: ["Activity table", "Recompute status", "Danger zone"],
    tips: ["Every admin save already writes its own audit row."],
    problem: "A change is not in the log.",
    fix: "Refresh the page; the activity list is live.",
  }),
];

GUIDE_ARTICLES.push(...ADMIN_TAB_ARTICLES);

export const EXTRA_GUIDES: GuideArticle[] = [
  {
    route: "/dashboard?card=quick-actions",
    fallbackTitle: "Quick actions",
    group: "start",
    purpose: "Jump from the Dashboard to the three work shortcuts.",
    roles: ALL,
    steps: [
      { text: "Open Dashboard and click Quick actions.", target: '[data-guide-target="quick-actions"]' },
      { text: "Choose Add assessment, Generate PPT or Export." },
      { text: "Complete the dialog that opens." },
    ],
    see: ["Add assessment", "Generate PPT", "Export current view"],
    tips: ["The current cycle is carried into each shortcut."],
    problems: [{ problem: "A shortcut is missing.", fix: "Check your role; some actions are editor-only." }],
    related: ["/dashboard", "/reports"],
    lastChecked: checked,
  },
  {
    route: "/profile",
    fallbackTitle: "My profile",
    group: "start",
    purpose: "Change your name, phone, photo, preferences and notifications.",
    roles: ALL,
    steps: [
      { text: "Open My profile from the account menu." },
      { text: "Click the Profile tab and edit your details." },
      { text: "Click Preferences to change density and landing page." },
      { text: "Click Notifications to choose in-app and email alerts." },
    ],
    see: ["Profile completeness", "Security sessions", "Activity list"],
    tips: ["Every preference saves as soon as you change it."],
    problems: [{ problem: "The email cannot be edited.", fix: "Email is read-only; ask an admin to change the account." }],
    related: ["/dashboard", "/guide"],
    lastChecked: checked,
  },
  {
    route: "/dashboard?card=notifications",
    fallbackTitle: "Notifications",
    group: "start",
    purpose: "Read needs-attention and link reminders from the bell.",
    roles: ALL,
    steps: [
      { text: "Click the bell in the top bar.", target: '[data-testid="sb-notifications"]' },
      { text: "Read a reminder and click its facility." },
      { text: "Open My profile → Notifications to change alerts." },
    ],
    see: ["Facility attention rows", "Link reminders", "Unread count"],
    tips: ["The badge uses the same rules as the Pending page."],
    problems: [{ problem: "The bell is empty.", fix: "There may be no issue in your assigned blocks." }],
    related: ["/pending", "/profile"],
    lastChecked: checked,
  },
  {
    route: "/dashboard?card=upcoming",
    fallbackTitle: "Upcoming schedule",
    group: "start",
    purpose: "See the next assessment and surveillance visits.",
    roles: ALL,
    steps: [
      { text: "Open Dashboard and find Upcoming schedule.", target: '[data-guide-target="upcoming"]' },
      { text: "Switch between assessment and surveillance visits." },
      { text: "Click a date to open the facility." },
    ],
    see: ["Dated visit cards", "Type switch", "Facility links"],
    tips: ["The schedule reads the same dates as each facility profile."],
    problems: [{ problem: "A visit is missing.", fix: "Add or correct its date on the facility profile." }],
    related: ["/facilities/certification", "/facilities/recertification"],
    lastChecked: checked,
  },
];

GUIDE_ARTICLES.push(...EXTRA_GUIDES);

/** A short stub for every custom page created in Admin → Pages. */
export function customGuideStub(name: string): GuideArticle {
  return {
    route: "/p/:slug",
    fallbackTitle: name,
    group: "admin",
    purpose: `A custom page created by the State Admin. It shows ${name} from the shared tracker data.`,
    roles: ALL,
    steps: [
      { text: "Open the page from the sidebar or Ctrl+K." },
      { text: "Search or filter the rows." },
      { text: "Use the download buttons if enabled." },
    ],
    see: ["The columns chosen by the admin.", "The same role and block scope as the Master List."],
    tips: ["Ask an admin to change columns, roles or placement.", "A deleted source report shows a warning."],
    problems: [
      { problem: "The page is missing.", fix: "Ask an admin to check Admin → Pages visibility." },
      { problem: "No rows are shown.", fix: "Check the report filters or your block scope." },
    ],
    related: ["/admin", "/facilities", "/guide"],
    lastChecked: checked,
  };
}

export type HowTo = {
  id: string;
  title: string;
  route: string;
  steps: string[];
  roles?: GuideRole[];
};

export const HOW_TOS: HowTo[] = [
  {
    id: "add-user",
    title: "Add a user and set blocks",
    route: "/admin?tab=users",
    roles: ADMIN,
    steps: [
      "Open Admin → Users and roles.",
      "Press Invite user and enter the email.",
      "Choose the role and tick the blocks.",
      "Press Send invitation; access is ready when they sign up.",
    ],
  },
  {
    id: "hide-page",
    title: "Hide, rename or create a page",
    route: "/admin?tab=pages",
    roles: ADMIN,
    steps: [
      "Open Admin Settings and click Pages.",
      "Edit a label, switch Visible off, or click Create page.",
      "Choose the page columns and the roles allowed.",
      "Click Save all when the page table shows changes.",
    ],
  },
  {
    id: "document-rules",
    title: "Set document rules",
    route: "/admin?tab=documents",
    roles: ADMIN,
    steps: [
      "Open Admin Settings and click Documents.",
      "Turn a document rule on or off.",
      "Choose its cycle and due window.",
      "Click Save all at the bottom.",
    ],
  },
  {
    id: "upload-docs",
    title: "Upload documents",
    route: "/documents",
    roles: EDITORS,
    steps: [
      "Open Documents and find the facility.",
      "Click a missing cell, or drop files on the page.",
      "Check the match preview.",
      "Confirm the upload.",
    ],
  },
  {
    id: "zip-docs",
    title: "Download all documents as a ZIP",
    route: "/documents",
    roles: ALL,
    steps: [
      "Filter the list to the block or type you need.",
      "Read the file count and size on the ZIP button.",
      "Choose this filter, one block or one facility.",
      "Press Download ZIP and use the link when ready.",
    ],
  },
  {
    id: "ia-import",
    title: "Import Internal Assessment scores",
    route: "/bulk-import/internal-assessment",
    roles: ["admin", "entry"],
    steps: [
      "Open Bulk Import and choose Internal Assessment.",
      "Download the template and fill the quarter columns.",
      "Drop the file and check the preview.",
      "Confirm and read the report.",
    ],
  },
  {
    id: "saqsham-import",
    title: "Import SaQsham status",
    route: "/bulk-import/saqsham",
    roles: ["admin", "entry"],
    steps: [
      "Open Bulk Import and choose SaQsham.",
      "Download the template.",
      "Fill one row per facility with its NIN.",
      "Drop, review matches and confirm.",
    ],
  },
  {
    id: "saqsham-mapping",
    title: "Update SaQsham status mapping",
    route: "/bulk-import?tab=mapping",
    roles: ALL,
    steps: [
      "Open Bulk Import → Status mapping.",
      "Edit a portal status or choose its Documents Status (Report).",
      "Add statuses and groups, or use CSV.",
      "Check the impact, confirm, and use Undo if needed.",
    ],
  },
  {
    id: "fix-attention",
    title: "Fix a Needs attention item",
    route: "/pending",
    roles: ALL,
    steps: [
      "Open the bell or the Needs attention list.",
      "Read the reason on the row.",
      "Press Fix to open the right section.",
      "Fill the missing value or document and save.",
    ],
  },
  {
    id: "connect-drive",
    title: "Connect Google Drive",
    route: "/admin?tab=google-drive",
    roles: ADMIN,
    steps: [
      "Open Admin → Google Drive.",
      "Enter the client ID and secret from Google.",
      "Save, then press Connect and approve access.",
      "Run the self-test before uploading.",
    ],
  },
  {
    id: "share-report",
    title: "Share a facility report with its QR code",
    route: "/reports",
    roles: ALL,
    steps: [
      "Open the facility and choose Share report.",
      "Create the short link.",
      "Download or print the QR code.",
      "Send the link or paste the QR on the notice board.",
    ],
  },
];

export type GlossaryTerm = {
  term: string;
  meaning: string;
  /** Meaning could not be verified from the app UI — the admin must confirm. */
  confirm?: boolean;
};

export const GLOSSARY: GlossaryTerm[] = [
  { term: "NQAS", meaning: "National Quality Assurance Standards.", confirm: true },
  { term: "Kayakalp", meaning: "The Government’s cleanliness and quality award scheme for health facilities." },
  { term: "SA", meaning: "State Assessment — the state’s own assessment visit." },
  { term: "IA", meaning: "Internal Assessment — the facility’s quarterly self-assessment." },
  { term: "NOC", meaning: "No Objection Certificate. Here it means the Fire NOC." },
  { term: "GoI", meaning: "Government of India. The GoI letter carries the NQAS result.", confirm: true },
  { term: "Cycle", meaning: "One certification round, from application to certificate." },
  { term: "Hold a certificate", meaning: "The facility has a valid NQAS certificate today." },
  { term: "Gap Closure", meaning: "Money and works used to close the gaps found in assessment." },
  { term: "Needs attention", meaning: "A facility with a missing, overdue or conflicting item." },
  { term: "PHC", meaning: "Primary Health Centre." },
  { term: "CHC", meaning: "Community Health Centre." },
  { term: "UPHC", meaning: "Urban Primary Health Centre." },
  { term: "HWC", meaning: "Health and Wellness Centre." },
  { term: "HSC", meaning: "Health Sub-Centre." },
  { term: "HUD", meaning: "Health Unit District — the district health office.", confirm: true },
  { term: "DQC", meaning: "District Quality Consultant." },
  { term: "DQMO", meaning: "District Quality Medical Officer." },
  { term: "NIN", meaning: "The facility’s unique number used for matching imports." },
  { term: "SaQsham", meaning: "The state portal that records facility quality status." },
  { term: "Pivot", meaning: "A report that groups rows and adds up values." },
  { term: "ZIP", meaning: "One compressed file holding many documents." },
  { term: "Drive", meaning: "The Google Drive folder where facility documents are stored." },
];

export const FIRST_15: { id: string; label: string; route: string }[] = [
  { id: "drive", label: "Connect Google Drive", route: "/admin?tab=google-drive" },
  { id: "blocks", label: "Set Blocks and PHCs", route: "/admin?tab=master-data" },
  { id: "users", label: "Add users", route: "/admin?tab=users" },
  { id: "docs", label: "Set document rules in Admin → Documents", route: "/admin?tab=documents" },
  { id: "master", label: "Import the Facility master", route: "/bulk-import" },
  { id: "saqsham", label: "Import SaQsham status", route: "/bulk-import/saqsham" },
  { id: "saqsham-map", label: "Update SaQsham status mapping", route: "/bulk-import?tab=mapping" },
  { id: "ia", label: "Import Internal Assessment scores", route: "/bulk-import/internal-assessment" },
  { id: "hide", label: "Hide pages you do not use", route: "/admin?tab=pages" },
];
