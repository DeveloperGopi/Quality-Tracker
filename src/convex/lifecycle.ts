// Pure certification-lifecycle engine — no Convex imports, shared by
// mutations (server) and the UI (status badges, next-step hints, previews).

// Accounts signing in with these emails are always granted State Admin on
// activation — even if another admin already exists.
export const SUPER_ADMIN_EMAILS = [
  "dphdphtptquality@gmail.com",
  "dphtpdphtptquality@gmail.com", // earlier spelling kept working
];

export const DEFAULT_SETTINGS = {
  // ---- Table & Display (Parts C/D) ----
  // "Recently updated: days" — cells changed by an import are marked for
  // N × 24 h from the change (read-time from the audit log; 0 = off).
  recentlyUpdatedDays: 1,
  // "Highlight scope": "imports" (default) or "importsEdits".
  highlightScope: "imports",
  // Assessor contact numbers: "role" (Viewers masked, default) or "everyone".
  assessorPhoneVisibility: "role",
  // Frozen master-list data columns (0–3 data columns, hard cap 3; the
  // first entry renders directly right of the row checkbox).
  frozenColumns: ["facility"],
  // Annexure I display bands (colour helper only, numbers always shown).
  // Admin → Table & Display edits these three cut-offs.
  scoreBands: {
    below: 70,
    satisfactory: 80,
    excellent: 90,
  },
  // PDF department name → the canonical name used in comparisons. Admin →
  // General → Department names edits this list; an unknown name is kept as
  // written and marked "New" in the preview.
  departmentNames: [
    { pdfName: "Indoor", canonicalName: "IPD" },
    { pdfName: "Labour room", canonicalName: "Labour Room" },
    { pdfName: "Lab", canonicalName: "Laboratory" },
  ],
  // Default identity-cell style for every list: twoLine | oneLine.
  facilityStyle: "twoLine",
  // Block Compare page defaults (Admin → Filters). Empty type = all types;
  // cycle is "current" or a 1-based cycle number.
  blockCompareFacilityType: "",
  blockCompareCycle: "current",
  // Keep the row checkbox pinned as part of the frozen zone.
  // Freezing switches off below this viewport width (mobile uses cards).
  freezeBelowPx: 768,
  // Row action column (the guaranteed trailing "Update" utility column).
  // Optional State-Admin setting with hard defaults; audited like every
  // other appSettings key.
  rowActionColumn: {
    visible: "show" as "show" | "hide",
    label: "Update" as "Update" | "Edit",
    pinRight: true,
    compactBelow1280: true,
  },

  // "Facility Current Status" manual-override options (editable in Admin
  // Settings); the auto engine values are always shown as the live default.
  statusLabels: [
    "Not Eligible",
    "Facility (Future Candidate)",
    "SA Not Yet Initiated",
    "SA Scheduled",
    "SA Completed — NQAS Awaited",
    "SA Completed — NQAS Pending",
    "NA Scheduled",
    "Result Awaited",
    "Certified — Surveillance Due",
    "Certified — On track",
    "Certified with Conditionality",
    "Deferred — Cooling Period",
    "Eligible for Re-Assessment",
    "Recertification Due",
    "Certification Expired",
  ],
  // State Assessment status (editable in Admin Settings) — the "State
  // Assessment Status" column and the SA form on the facility profile.
  saStatuses: ["Not Yet Initiated", "Scheduled", "Completed"],
  // NQAS assessment status (editable in Admin Settings) — the NQAS form on
  // the facility profile.
  nqasStatuses: ["Pending", "Scheduled", "Completed"],
  // "NOC Available" column (editable in Admin Settings). The Fire NOC
  // *validity* status is date-derived (see deriveFireNocStatus) — only the
  // Yes/No availability is a dropdown.
  nocAvailableOptions: ["Yes", "No"],
  // Building Type dropdown (editable in Admin Settings).
  buildingTypes: ["Own Building", "Rented Building", "Rent Free Building"],
  // "Departments / Packages & Certification Criteria" — the six approved
  // master-sheet options (editable in Admin Settings).
  departmentCriteria: [
    "6 Departments & Met all Criteria",
    "6 Departments & Met 5 out of 5 Criteria",
    "All 12 Thematic Areas",
    "12 Service Packages",
    "7 Mandatory Service Packages",
    "13 Departments & Met all Criteria",
  ],
  // NQAS Assessment → Scope: one optional choice, edited in Admin → General.
  scopeOptions: [
    "6 Departments & Met all Criteria",
    "6 Departments & Met 5 out of 5 Criteria",
    "All 12 Thematic Areas",
    "12 Service Packages",
    "7 Mandatory Service Packages",
    "Met 4 out of 6 Criteria",
    "13 Departments & Met all Criteria",
  ],
  facilityTypes: ["CHC", "PHC", "UPHC", "UHWC", "HWC HSC", "UGPHC", "DHQH", "SDH"],
  // "NQAS Certification Status" dropdown options (editable in Admin
  // Settings) — the certification result column on the master list,
  // category page and profile form. Keep the first four canonical values
  // for correct dashboard certification counting.
  certificationStatuses: [
    "Result Awaited",
    "Quality Certified",
    "Quality Certified with Conditionality",
    "Deferred",
  ],
  // "NQAS Eligibility" dropdown options (editable in Admin Settings). The
  // stored eligibility values stay the canonical "Eligible" / "Not Eligible"
  // / "Possible" — this list is the label set used wherever eligibility is
  // picked or displayed (master-list column, add-facility form, filters).
  // LABEL FIX: the old default wrote a second spelling ("Not Eligible
  // (In-Eligible)") next to the stored value, so the pill read "Not
  // Eligible" while the editor's option read "In-Eligible". The defaults
  // are now the canonical labels themselves; an admin-saved list with the
  // old wording still maps onto the same canonical value on read.
  eligibilityOptions: ["Eligible", "Not Eligible", "Possible"],
  departments: [
    "OPD",
    "Labour Room",
    "OT",
    "Lab",
    "Pharmacy",
    "Emergency",
    "Ward",
    "Immunization",
  ],
  // HWC HSC is assessed against the 12 service packages, never the hospital
  // department list above. Admin-editable here; the sheet, master row and
  // profile adapter all read this one list through lib/departments.
  servicePackages: [
    "Antenatal & Postnatal Care",
    "Newborn & Child Health",
    "Family Planning",
    "Adolescent Health",
    "Immunization",
    "Communicable Diseases",
    "Non-Communicable Diseases",
    "Mental Health",
    "Elderly & Palliative Care",
    "Emergency & Referral",
    "Oral, Eye & ENT Care",
    "Health Promotion & Wellness",
  ],
  // "Documents Status" (SaQsham/general document pipeline) — the six approved
  // workflow stages shown in the master-list dropdown.
  generalDocStatuses: [
    "Docx Pending at Facility",
    "Docx in RQAU login",
    "Docx in SQAU login",
    "Docx forwarded to NHSRC",
    "NA Scheduled",
    "NA Completed & Awaiting Results",
  ],
  fundStatuses: ["Received", "Pending", "Returned", "Utilized"],
  buildingStatuses: ["Good", "Needs Repair", "Under Renovation", "Dilapidated"],
  fireNocStatuses: ["Valid", "Expiring Soon", "Expired", "Not Obtained"],
  assessmentModes: ["Physical", "Virtual", "Hybrid"],
  // "Assessors HUD" — the assessor's HUD unit, picked per state assessment
  // (editable in Admin Settings → Dropdown lists).
  assessorHuds: [
    "HUD-1",
    "HUD-2",
    "HUD-3",
    "HUD-4",
    "HUD-5",
  ],
  checklistVersions: ["NQAS 2022", "NQAS 2019", "Kayakalp 2024"],
  certificationValidityYears: 3, // Quality Certified
  conditionalValidityYears: 1, // Certified with Conditionality
  deferredCooldownMonths: 3, // Deferred → reattempt unlock
  surveillanceIntervalsMonths: 12, // Y1 = +12m, Y2 = +24m
  // A surveillance visit is "due soon" inside this window (default 90 days).
  surveillanceAlertLeadDays: 90,
  recertificationAlertLeadDays: 90, // "Recertification Due" flag window
  fireNocAlertLeadDays: 90, // Fire NOC expiring-soon window
  // Internal Assessment cadence: a facility's most recent IA must be no older
  // than this. Older ⇒ "IA overdue" (see deriveIaStatus). Managed through the
  // SaQsham/IA Excel import or the profile form.
  iaFrequencyMonths: 3,
  // Part 2: the quarterly IA report is DUE this many days after a quarter
  // ends (0 = due on the last day), and a quarter is Complete at or above
  // this coverage %. Both are read by the banner, the success line and the
  // reminder email through ONE rule (lib/iaImport.iaReminderStatus).
  iaGraceDays: 5,
  iaCompleteThreshold: 95,
  fundPendingAlertDays: 90, // Gap closure fund stuck as Pending
  // Page visibility (Admin Settings): category pages hidden from the
  // sidebar / pills for everyone except the State Admin. Empty by
  // default — all pages visible.
  hiddenCategories: [] as string[],
  // Non-category pages included in the same visibility control.
  // "generate-ppt" hides the Generate PPT page.
  hiddenPages: [] as string[],
  // Dashboard section controls: when on, every dashboard section gets a drag
  // handle to reorder it and width/height controls to shrink it. Off by
  // default so the dashboard renders exactly as before unless an admin
  // deliberately enables rearranging.
  dashboardSectionControls: false,
};

export type LifecycleSettings = typeof DEFAULT_SETTINGS;

// "Recertification Alert" fires this many days before expiry
export const SURVEILLANCE_ALERT_DAYS = 30;

export const dateToTs = (dateStr: string): number => {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d, 12).getTime();
};

export const addMonthsToIso = (iso: string, months: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1 + months, 1, 12));
  const lastDay = new Date(
    Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const addYearsToIso = (iso: string, years: number): string =>
  addMonthsToIso(iso, years * 12);

export const addDaysToIso = (iso: string, days: number): string => {
  const ts = dateToTs(iso);
  if (Number.isNaN(ts)) return iso;
  const dt = new Date(ts + days * 86400_000);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

export const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const daysBetween = (aIso: string, bIso: string): number =>
  Math.round((dateToTs(aIso) - dateToTs(bIso)) / 86400_000);

/* ------------------------------------------------------------------------- */
/* Certification Cycle (Part 3.3 of the master-list audit brief)              */
/* ------------------------------------------------------------------------- */

export type CycleLike = {
  cycleNumber: number;
  cycleType: string | null | undefined;
  startedOn?: string | null;
  closedOn?: string | null;
};

/** A facility's CURRENT cycle = its highest OPEN cycle. A cycle stays open
 *  (closedOn null) until its certificate is replaced; "Recertification Due"
 *  alone does NOT open the next cycle — only a real Re-Application (SaQsham
 *  row with Assessment Type "Re-Application", the Profile's "Start Cycle
 *  #N+1" button, or a new application after expiry) does.
 *
 *  Pure + unit-tested (scripts/cycle.test.ts). */
export function deriveCycle(cycles: readonly CycleLike[]): CycleLike | null {
  const open = cycles
    .filter((c) => c.closedOn == null)
    .sort((a, b) => b.cycleNumber - a.cycleNumber);
  return open[0] ?? null;
}

/** The "Certification Cycle" cell text: pill-style "#1 Initial" / "#2 Recert"
 *  (type "Recertification" displayed short). Null cycle → "#1 Initial": the
 *  migration creates Cycle #1 for every facility, so a row with no record is
 *  still its first cycle. */
export function cycleLabel(cycle: CycleLike | null): string {
  if (!cycle) return "#1 Initial";
  const short = /recert/i.test(cycle.cycleType ?? "") ? "Recert" : "Initial";
  return `#${cycle.cycleNumber} ${short}`;
}

/** Is this cycle the next (unstarted) cycle number for the facility? Used by
 *  the "Start Cycle #N+1 (Recertification)" affordance to own its number. */
export function nextCycleNumber(cycles: readonly CycleLike[]): number {
  const max = cycles.reduce((m, c) => Math.max(m, c.cycleNumber), 0);
  return max + 1;
}

/** Date-primary Fire NOC status — mirrors the NA Scheduled rule: the
 *  validity (expiry) date decides the "Fire NOC Validity Status" column
 *  instead of a hand-picked dropdown value.
 *
 *  past validity ⇒ Expired · inside the alert-lead window ⇒ Expiring Soon ·
 *  otherwise Valid. NOC Available = No (or no NOC record) ⇒ Not Obtained.
 *  A NOC without a validity date keeps its stored status. */
export function deriveFireNocStatus(
  nocAvailable: string | null | undefined,
  expiryDate: string | null | undefined,
  storedStatus: string | null | undefined,
  today: string = todayIso(),
  leadDays: number = DEFAULT_SETTINGS.fireNocAlertLeadDays,
): string {
  if (nocAvailable === "No") return "Not Obtained";
  if (!expiryDate) return storedStatus || "Not Obtained";
  const left = daysBetween(expiryDate, today); // >0 ⇒ days until expiry
  if (left < 0) return "Expired";
  if (left <= leadDays) return "Expiring Soon";
  return "Valid";
}

/** Internal Assessment freshness — flags "IA overdue" when the most recent
 *  IA is older than the configured cadence (default 3 months).
 *
 *  Pure: the tracker columns, dashboard cards, audit import page and exports
 *  all read this one rule so "IA overdue" means the same thing everywhere.
 *
 *  Returns `status`: none (no IA recorded) | ok | dueSoon (≤14 days to the
 *  due date) | overdue — plus the due date and days since the last IA. */
export type IaFreshness = {
  status: "none" | "ok" | "dueSoon" | "overdue";
  lastDate: string | null;
  dueDate: string | null;
  daysSince: number | null;
};

export function deriveIaStatus(
  ia: { lastDate?: string | null; lastScore?: number | null },
  s: LifecycleSettings,
  today: string = todayIso(),
): IaFreshness {
  const lastDate = ia.lastDate ?? null;
  if (!lastDate || Number.isNaN(dateToTs(lastDate))) {
    return { status: "none", lastDate: null, dueDate: null, daysSince: null };
  }
  const dueDate = addMonthsToIso(lastDate, s.iaFrequencyMonths);
  const daysSince = Math.max(0, daysBetween(today, lastDate));
  if (dateToTs(today) > dateToTs(dueDate)) {
    return { status: "overdue", lastDate, dueDate, daysSince };
  }
  if (daysBetween(dueDate, today) <= 14) {
    return { status: "dueSoon", lastDate, dueDate, daysSince };
  }
  return { status: "ok", lastDate, dueDate, daysSince };
}

/** The Deferred countdown — "Re-take SA in X days".
 *
 *  After a deferred result the facility waits out the cooling period
 *  (anchored on the GoI letter date, falling back to the visit end date)
 *  before it may start its State Assessment again. Returns null once the
 *  cooldown is over — the facility is "Eligible for Re-Assessment" at that
 *  point (see computeCurrentStatus), so no countdown should show. */
export function deferredRetakeCountdown(
  nqas: { certificationStatus?: string | null; goiLetterDate?: string | null; actualEndDate?: string | null } | null,
  s: LifecycleSettings,
  today: string = todayIso(),
): { unlockDate: string; daysLeft: number } | null {
  if (nqas?.certificationStatus !== "Deferred") return null;
  const anchor = nqas.goiLetterDate || nqas.actualEndDate || null;
  if (!anchor || Number.isNaN(dateToTs(anchor))) return null;
  const unlockDate = addMonthsToIso(anchor, s.deferredCooldownMonths);
  const daysLeft = daysBetween(unlockDate, today);
  return daysLeft <= 0 ? null : { unlockDate, daysLeft };
}

export const certifiedMonthYearOf = (iso: string): string => iso.slice(0, 7);
export const certifiedYearOf = (iso: string): number => Number(iso.slice(0, 4));

export type FacilityLike = {
  eligibility: string;
  currentCycleNumber?: number;
  currentStatus?: string;
  /** Quarterly Internal Assessment scores (FY 2026-27) — a facility with at
   *  least one recorded IA % has passed the Internal Assessment stage. */
  nqasIaQ1?: number | null;
  nqasIaQ2?: number | null;
  kayakalpIaQ1?: number | null;
  kayakalpIaQ2?: number | null;
};

/** The four quarterly IA score fields, wherever they live (facility row,
 *  deck row). */
export type IaScoresLike = {
  nqasIaQ1?: number | null;
  nqasIaQ2?: number | null;
  kayakalpIaQ1?: number | null;
  kayakalpIaQ2?: number | null;
};

/** Internal Assessment is recorded as quarterly IA % scores (NQAS/Kayakalp
 *  Q1–Q2). At least one score ⇒ the facility has entered the Internal
 *  Assessment stage of the lifecycle. */
export function hasIaScores(s: IaScoresLike): boolean {
  return (
    s.nqasIaQ1 != null ||
    s.nqasIaQ2 != null ||
    s.kayakalpIaQ1 != null ||
    s.kayakalpIaQ2 != null
  );
}

export type SaLike = {
  status: string;
  scheduledDate?: string;
  originalScheduledDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  scorePercent?: number;
  /** SaQsham document pipeline stage (stateAssessments.generalDocStatus). */
  generalDocStatus?: string | null;
};

export type NqasLike = {
  status: string;
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  certificationStatus?: string;
  certificationDate?: string;
  goiLetterDate?: string;
  validityDate?: string;
  surveillanceDue1?: string | null;
  surveillanceDue2?: string | null;
  surveillanceDone1?: string | null;
  surveillanceDone2?: string | null;
};

export type Derived = {
  validityDate: string | null;
  surveillanceDue1: string | null;
  surveillanceDue2: string | null;
};

export function computeDerivedNqas(
  nqas: NqasLike,
  s: LifecycleSettings,
): Derived {
  const certStatus = nqas.certificationStatus;
  const isCertified =
    certStatus === "Quality Certified" ||
    certStatus === "Quality Certified with Conditionality";
  const isDeferred = certStatus === "Deferred";
  if (!isCertified && !isDeferred) {
    return { validityDate: null, surveillanceDue1: null, surveillanceDue2: null };
  }
  // Certified → the certification date (GoI letter date wins when both are
  // recorded); Deferred → the GoI letter date marks the assessment date.
  const certDate = nqas.goiLetterDate || nqas.certificationDate || nqas.actualEndDate;
  if (!certDate) return { validityDate: null, surveillanceDue1: null, surveillanceDue2: null };
  // Deferred is not a certification — the "validity" is just the cooling
  // period (default 3 months) before the facility may re-attempt.
  const validityDate = isDeferred
    ? addMonthsToIso(certDate, s.deferredCooldownMonths)
    : addYearsToIso(
        certDate,
        certStatus === "Quality Certified"
          ? s.certificationValidityYears
          : s.conditionalValidityYears,
      );
  return {
    validityDate,
    surveillanceDue1:
      !isDeferred && certStatus !== "Quality Certified with Conditionality"
        ? addMonthsToIso(certDate, s.surveillanceIntervalsMonths)
        : null,
    surveillanceDue2:
      !isDeferred && certStatus === "Quality Certified"
        ? addMonthsToIso(certDate, s.surveillanceIntervalsMonths * 2)
        : null,
  };
}

/** Recertification columns derived purely from the certification date:
 *  - status: comment on where the certificate stands today
 *  - year:   the calendar year the facility must re-certify in
 *  (Quality Certified → +3y, Conditionality → +1y, Deferred → reattempt the
 *  following year per the NQAS cooling rule). */
export function computeRecertInfo(
  nqas: NqasLike | null,
  s: LifecycleSettings,
  today: string = todayIso(),
): { status: string | null; year: string | null } {
  const certStatus = nqas?.certificationStatus ?? null;
  const certDate = nqas?.certificationDate ?? nqas?.actualEndDate ?? null;
  if (!certStatus || !certDate) return { status: null, year: null };
  if (certStatus === "Deferred") {
    // Deferred: a reattempt opens after the 3-month cooling period — recertify
    // the following calendar year. The GoI letter date marks the assessment
    // date, so the shown year comes from it.
    const shownDate = nqas?.goiLetterDate || certDate;
    const coolEnd = addMonthsToIso(shownDate, s.deferredCooldownMonths);
    return {
      status: `Deferred on ${shownDate.slice(0, 4)} — re-attempt after cooling period (from ${coolEnd})`,
      year: String(Number(shownDate.slice(0, 4)) + 1),
    };
  }
  const derived = computeDerivedNqas({ ...nqas!, certificationDate: certDate }, s);
  const validity = nqas?.validityDate ?? derived.validityDate ?? addYearsToIso(
    certDate,
    certStatus === "Quality Certified" ? s.certificationValidityYears : s.conditionalValidityYears,
  );
  const daysLeft = daysBetween(validity, today);
  const recertYear = validity.slice(0, 4);
  if (daysLeft < 0) {
    return { status: `Certificate expired on ${validity} — recertification overdue (Re-Certification Year ${recertYear})`, year: recertYear };
  }
  if (daysLeft <= s.recertificationAlertLeadDays) {
    return { status: `Validity ends ${validity} (${daysLeft} days) — Recertification Due (Re-Certification Year ${recertYear})`, year: recertYear };
  }
  const comment =
    certStatus === "Quality Certified"
      ? `Valid till ${validity} — next full SA→NQAS recertification in ${recertYear}`
      : `Conditionality — validity ends ${validity}; recertify in ${recertYear}`;
  return { status: comment, year: recertYear };
}

/* ------------------------------------------------------------------------- */
/* SURVEILLANCE — the ONE visit rule (Quick View, Profile, Master List, Reports,
   KPIs, notifications, exports).                                                */
/* ------------------------------------------------------------------------- */

export type SurveillanceVisitKey = "surv1" | "surv2";
export type SurveillanceVisitState =
  | "done"
  | "overdue"
  | "dueSoon"
  | "upcoming"
  | "notApplicable";

export type SurveillanceVisit = {
  key: SurveillanceVisitKey;
  /** "1st surveillance" / "2nd surveillance" (sentence middle). */
  label: string;
  due: string | null;
  /** The stored done date, valid or not — kept for the data-check screens. */
  done: string | null;
  /** The done date ONLY when it is a real visit (not in the future, on/after
   *  certification). A future done date never counts as done. */
  validDone: string | null;
  state: SurveillanceVisitState;
  /** Days until due (negative = overdue), or null when there is no due date. */
  days: number | null;
  /** Short chip text: "Done 17-Aug-2026", "Overdue 67d", "Due in 20d" … */
  chip: string;
  tone: "green" | "red" | "amber" | "slate";
  /** "1 day early" / "late by 2 days" / why the visit is not applicable. */
  detail: string | null;
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Date-only ISO → "18-Aug-2027" (never an ISO string in the UI). */
export function formatVisitDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  const mi = Number(m) - 1;
  if (!y || Number.isNaN(mi) || !MONTH_SHORT[mi] || !d) return String(iso);
  return `${d}-${MONTH_SHORT[mi]}-${y}`;
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${Math.abs(n) === 1 ? one : many}`;

/** The two surveillance visits, from stored data only.
 *
 *  • done = a real, non-future visit (a future done date is ignored here and
 *    reported by the data checks / Needs attention instead);
 *  • a Done visit is NEVER Overdue or Due;
 *  • Overdue only when the due date has passed and the visit is not done;
 *  • Due soon inside the admin window (default 90 days). */
export function surveillanceVisits(
  nqas: Partial<NqasLike> | null | undefined,
  s: Partial<LifecycleSettings> | null = null,
  today: string = todayIso(),
): SurveillanceVisit[] {
  const settings = { ...DEFAULT_SETTINGS, ...(s ?? {}) } as LifecycleSettings;
  const certStatus = nqas?.certificationStatus ?? "";
  const certified =
    certStatus === "Quality Certified" || certStatus === "Quality Certified with Conditionality";
  const derived = computeDerivedNqas(
    { ...(nqas ?? {}), status: nqas?.status ?? "" } as NqasLike,
    settings,
  );
  const certDate =
    nqas?.goiLetterDate || nqas?.certificationDate || nqas?.actualEndDate || null;
  const leadDays = settings.surveillanceAlertLeadDays;
  const specs: { key: SurveillanceVisitKey; label: string; due: string | null; done: string | null }[] = [
    {
      key: "surv1",
      label: "1st surveillance",
      due: nqas?.surveillanceDue1 || derived.surveillanceDue1,
      done: nqas?.surveillanceDone1 ?? null,
    },
    {
      key: "surv2",
      label: "2nd surveillance",
      due: nqas?.surveillanceDue2 || derived.surveillanceDue2,
      done: nqas?.surveillanceDone2 ?? null,
    },
  ];

  return specs.map((spec) => {
    const done = spec.done ? String(spec.done).slice(0, 10) : null;
    const due = spec.due ? String(spec.due).slice(0, 10) : null;
    const realDone =
      done && /^\d{4}-\d{2}-\d{2}$/.test(done) && done <= today && (!certDate || done >= certDate)
        ? done
        : null;
    const base = {
      key: spec.key,
      label: spec.label,
      due,
      done,
      validDone: realDone,
    };
    if (!certified || !due) {
      return {
        ...base,
        state: "notApplicable" as const,
        days: null,
        chip: "Not applicable",
        tone: "slate" as const,
        detail: !certified
          ? "Not applicable until the facility is certified"
          : "No due date recorded",
      };
    }
    if (realDone) {
      const offset = daysBetween(realDone, due); // >0 ⇒ late, <0 ⇒ early
      const detail =
        offset === 0
          ? "on the due date"
          : offset > 0
            ? `late by ${plural(offset, "day")}`
            : `${plural(offset * -1, "day")} early`;
      return {
        ...base,
        state: "done" as const,
        days: offset,
        chip: `Done ${formatVisitDate(realDone)}`,
        tone: "green" as const,
        detail,
      };
    }
    const days = daysBetween(due, today); // >0 ⇒ days left, <0 ⇒ overdue
    if (days < 0) {
      return {
        ...base,
        state: "overdue" as const,
        days,
        chip: `Overdue ${Math.abs(days)}d`,
        tone: "red" as const,
        detail: `${spec.label} was due on ${formatVisitDate(due)}`,
      };
    }
    if (days <= leadDays) {
      return {
        ...base,
        state: "dueSoon" as const,
        days,
        chip: `Due in ${days}d`,
        tone: "amber" as const,
        detail: `${spec.label} is due on ${formatVisitDate(due)}`,
      };
    }
    return {
      ...base,
      state: "upcoming" as const,
      days,
      chip: `Due ${formatVisitDate(due)}`,
      tone: "slate" as const,
      detail: `${spec.label} is due on ${formatVisitDate(due)}`,
    };
  });
}

/** The earliest visit that is not done (overdue first, then due soon, then
 *  upcoming) — the next surveillance action. */
export function nextOpenVisit(
  visits: SurveillanceVisit[],
  today: string = todayIso(),
): SurveillanceVisit | null {
  const open = visits.filter(
    (v) => v.state === "overdue" || v.state === "dueSoon" || v.state === "upcoming",
  );
  if (!open.length) return null;
  return open.sort(
    (a, b) => daysBetween(a.due ?? "", today) - daysBetween(b.due ?? "", today),
  )[0];
}

/** "2nd surveillance due 18-Aug-2027 · in 298 days" — the Quick View's Next
 *  action and every surface that reads it. Null when nothing is open. */
export function surveillanceNextAction(
  nqas: NqasLike | null | undefined,
  s: Partial<LifecycleSettings> | null = null,
  today: string = todayIso(),
): string | null {
  const settings = { ...DEFAULT_SETTINGS, ...(s ?? {}) } as LifecycleSettings;
  const visits = surveillanceVisits(nqas, settings, today);
  const next = nextOpenVisit(visits, today);
  if (!next) return null;
  const days = next.days ?? 0;
  const timing =
    next.state === "overdue"
      ? `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} overdue`
      : days === 0
        ? "today"
        : `in ${days} ${days === 1 ? "day" : "days"}`;
  return `${next.label} due ${formatVisitDate(next.due)} · ${timing}`;
}

/** "Certified — On track" vs "Certified — Surveillance Due": the visit rule
 *  decides it, never the mere presence of a certificate. */
export function certifiedSurveillanceStatus(
  nqas: Partial<NqasLike> | null | undefined,
  s: Partial<LifecycleSettings> | null = null,
  today: string = todayIso(),
): "Certified — Surveillance Due" | "Certified — On track" {
  const settings = { ...DEFAULT_SETTINGS, ...(s ?? {}) } as LifecycleSettings;
  const visits = surveillanceVisits(nqas, settings, today);
  return visits.some((v) => v.state === "overdue" || v.state === "dueSoon")
    ? "Certified — Surveillance Due"
    : "Certified — On track";
}

/** The heart of the state machine. Pure — used by mutations and the UI. */
export function computeCurrentStatus(
  facility: FacilityLike,
  sa: SaLike | null,
  nqas: NqasLike | null,
  s: LifecycleSettings,
  today: string = todayIso(),
): string {
  const certStatus = nqas?.certificationStatus ?? null;
  const certified =
    certStatus === "Quality Certified" ||
    certStatus === "Quality Certified with Conditionality";
  // A certified facility is never Not eligible, even when an import still
  // carries the old eligibility value. The result is the stronger evidence.
  if (!certified && facility.eligibility !== "Eligible") {
    return facility.eligibility === "Possible"
      ? "Facility (Future Candidate)"
      : "Not Eligible";
  }
  if (certified && nqas) {
    const validity = nqas.validityDate ?? computeDerivedNqas(nqas, s).validityDate;
    if (validity && daysBetween(validity, today) <= s.recertificationAlertLeadDays) {
      return "Recertification Due";
    }
    return certifiedSurveillanceStatus(nqas, s, today);
  }
  if (!sa) return "SA Not Yet Initiated";

  if (sa.status !== "Completed") {
    return sa.status === "Scheduled" ? "SA Scheduled" : "SA Not Yet Initiated";
  }
  if (!nqas) return "SA Completed — NQAS Awaited";
  if (nqas.status !== "Completed") {
    // Date-primary rule: a scheduled start date of today or any upcoming
    // date means the assessment IS scheduled, even when the NA status was
    // never flipped from Pending. A start date before today is past — it no
    // longer reads as scheduled, so the facility shows as NQAS Pending.
    const startUpcoming =
      !!nqas.scheduledStartDate && nqas.scheduledStartDate >= today;
    return nqas.status === "Scheduled" || startUpcoming
      ? "NA Scheduled"
      : "SA Completed — NQAS Pending";
  }

  // NQAS completed — branch on certification result
  switch (nqas.certificationStatus) {
    case "Quality Certified": {
      const validity = nqas.validityDate ?? computeDerivedNqas(nqas, s).validityDate;
      if (validity && daysBetween(validity, today) <= s.recertificationAlertLeadDays) {
        return "Recertification Due";
      }
      // Surveillance is due only when a visit is actually overdue / due soon
      // and not done; a certified facility with a current visit is on track.
      return certifiedSurveillanceStatus(nqas, s, today);
    }
    case "Quality Certified with Conditionality": {
      const validity = nqas.validityDate ?? computeDerivedNqas(nqas, s).validityDate;
      if (validity && daysBetween(today, validity) > 0) {
        return daysBetween(validity, today) <= s.recertificationAlertLeadDays
          ? "Recertification Due"
          : "Certified with Conditionality";
      }
      return "Recertification Due";
    }
    case "Deferred": {
      // Cooling window anchored on the GoI letter date (falling back to the
      // visit end date): DURING the window the facility is in its cooling
      // period, only after it passes is it ready for a reattempt. The old
      // comparison was time-inverted — it said "Re-Assessment" during the
      // locked window and "Cooling Period" after it had ended.
      const anchor = nqas.goiLetterDate || nqas.actualEndDate || today;
      const unlock = addMonthsToIso(anchor, s.deferredCooldownMonths);
      if (daysBetween(unlock, today) > 0) return "Deferred — Cooling Period";
      return "Eligible for Re-Assessment";
    }
    default:
      return "Result Awaited";
  }
}

// ---------------------------------------------------------------------------
// Single source of truth for the certification lifecycle.
//
// Every view that needs "is this facility certified / scheduled / awaiting a
// result / where does it sit in the pipeline" MUST read these derived fields
// instead of re-implementing the rules. That is what keeps one lifecycle event
// (e.g. an NA assessment completing ⇒ "Result Awaited") consistent across the
// dashboard KPIs, the block/PHC progress bars, the type-wise summaries, the
// Reports page and the exported decks — before this existed, the same rule was
// hand-copied into ~8 places and they silently drifted apart.
// ---------------------------------------------------------------------------

/** Mutually-exclusive progress-bar bucket a facility falls into. */
export type LifecycleSegment =
  | "certified"
  | "conditional"
  | "deferred"
  | "dueSoon"
  | "inProgress"
  | "notStarted";

/** Mutually-exclusive certification-pipeline stage — the furthest step a
 *  facility has reached in the NQAS cycle. One ordered enum shared by the
 *  dashboard overview strip, the per-facility lifecycle stepper and the
 *  exported decks, so every surface counts the same buckets. */
export type PipelineStage =
  | "notEligible"
  | "notStarted"
  | "internalAssessment"
  | "stateAssessment"
  | "naScheduled"
  | "resultAwaited"
  | "certified";

/** Canonical stage order and wording — the single label set every surface
 *  (dashboard strip, facility stepper, PPT/PDF deck) renders. Follows the
 *  department's certification lifecycle order:
 *  Not eligible → Eligible — not started → Internal Assessment → State
 *  Assessment → NA scheduled → Result awaited → Certified.
 *
 *  Deferred is deliberately NOT a stage of this order. A deferred result means
 *  the assessment failed; after the 3-month cooling period the facility starts
 *  the process again from the beginning, so it re-enters this order at the
 *  first step instead of ending in a separate "Deferred" bucket. */
export const PIPELINE_STAGES: { key: PipelineStage; label: string }[] = [
  { key: "notEligible", label: "Not eligible" },
  { key: "notStarted", label: "Eligible — not started" },
  { key: "internalAssessment", label: "Internal Assessment" },
  { key: "stateAssessment", label: "State Assessment" },
  { key: "naScheduled", label: "NA scheduled" },
  { key: "resultAwaited", label: "Result awaited" },
  { key: "certified", label: "Certified" },
];

export const PIPELINE_STAGE_LABELS = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.key, s.label]),
) as Record<PipelineStage, string>;

/** The single rule that decides a facility's pipeline stage. Reads the shared
 *  lifecycle flags, so the dashboard strip and the exported decks can never
 *  disagree about a bucket — or about the total (the stages sum to the
 *  facility count because they are mutually exclusive). */
export function pipelineStageOf(
  view: Pick<
    FlatLifecycleView,
    | "segment"
    | "isQualityCertified"
    | "isConditional"
    | "isDeferred"
    | "isResultAwaited"
    | "nqasScheduled"
    | "naPhase"
    | "iaDone"
  >,
  eligibility: string | null | undefined,
): PipelineStage {
  // A facility that holds a certificate is NEVER "Not eligible". The result
  // is the strongest evidence the facility was eligible; an import that
  // still carries "Not Eligible" in the raw eligibility column (3 named
  // facilities in the current file) must not move a certified facility back
  // to the muted pre-path chip on the dashboard or in a deck.
  if (view.isQualityCertified || view.isConditional) return "certified";
  if (eligibility !== "Eligible") return "notEligible";
  // Deferred (failed) assessment — there is no terminal "Deferred" stage: the
  // cooling period ends with the facility restarting the process, so it drops
  // back to the first step of the order until the new cycle progresses.
  if (view.isDeferred) return "notStarted";
  if (view.isResultAwaited) return "resultAwaited";
  // The NA step is open — date-primary schedule, or an explicit/legacy NA
  // phase the date rule no longer reads as scheduled (past start date).
  // GATED by SA progress: a facility whose State Assessment has not even been
  // scheduled (segment still "notStarted") can never sit at "NA scheduled" —
  // the lifecycle follows Eligibility → IA → SA → NA. Without this gate a
  // stray future NA start date on an untouched facility put the stepper's
  // stage 5 active while the header (computeCurrentStatus) still read
  // "SA Not Yet Initiated" — the contradiction the profile must never show.
  if ((view.nqasScheduled || view.naPhase) && view.segment !== "notStarted")
    return "naScheduled";
  // SA phase: scheduled, in progress, completed-but-not-yet-scheduled-again,
  // or a post-deferred reattempt (the cycle always restarts with the SA).
  if (view.segment === "inProgress") return "stateAssessment";
  // Eligible, no SA yet, but the quarterly IA scores are recorded.
  if (view.iaDone) return "internalAssessment";
  return "notStarted";
}

/** Where a facility sits inside the SaQsham document / assessment pipeline —
 *  the mutually-exclusive zone behind the type-wise summary's "NQAS
 *  Scheduled", "Result Awaited", "Next Phase" and document-stage columns.
 *  Furthest zone wins, so a facility is never counted in two lifecycle
 *  columns and the summary's Total always equals its columns. */
export type DocPipelineZone =
  | "nqasScheduled"
  | "resultAwaited"
  | "nextPhase"
  | "docs"
  | "none";

/** The shared rule for the type-wise / block-wise / PHC-wise summary. Reads
 *  the lifecycle view so the dashboard summary (server) and the Reports
 *  summary (client) compute identical numbers from the same rule. */
export function docPipelineZone(
  view: Pick<
    FlatLifecycleView,
    | "nqasScheduled"
    | "isResultAwaited"
    | "isQualityCertified"
    | "isConditional"
    | "isDeferred"
  >,
  saStatus: string | null | undefined,
  hasDocStage: boolean,
): DocPipelineZone {
  // Same SA-progress gate as pipelineStageOf: an NQAS schedule date can
  // never count the facility as "NQAS Scheduled" while its State Assessment
  // has not even been picked up (no recorded SA status) or has no SA.
  const saTouched = saStatus === "Scheduled" || saStatus === "Completed";
  if (view.nqasScheduled && saTouched) return "nqasScheduled";
  if (view.isResultAwaited) return "resultAwaited";
  // SA done, NQAS step not opened yet ("SA Completed — NQAS Pending").
  if (
    saStatus === "Completed" &&
    !view.isQualityCertified &&
    !view.isConditional &&
    !view.isDeferred
  )
    return "nextPhase";
  return hasDocStage ? "docs" : "none";
}

/** The lifecycle signals already flattened onto a row (master list / reports
 *  projections). All fields optional so callers can pass what they have. */
export type FlatLifecycleInput = {
  currentStatus?: string | null;
  certStatus?: string | null;
  naStatus?: string | null;
  naStartDate?: string | null;
  docStatus?: string | null;
  /** Any quarterly IA % recorded — see hasIaScores. */
  iaDone?: boolean | null;
};

export type FlatLifecycleView = {
  /** Stored NQAS certification result, or null when none recorded. */
  certResult: string | null;
  isQualityCertified: boolean;
  isConditional: boolean;
  isDeferred: boolean;
  /** Assessment done / documents awaiting — certification result not declared. */
  isResultAwaited: boolean;
  /** Date-primary: NQAS assessment start date today/upcoming ⇒ scheduled. */
  nqasScheduled: boolean;
  /** The NQAS step is open regardless of the date rule (explicit NA status,
   *  or legacy NQAS wording) — keeps past-dated assessments out of the
   *  State Assessment bucket. */
  naPhase: boolean;
  /** At least one quarterly Internal Assessment score recorded. */
  iaDone: boolean;
  /** SaQsham document pipeline stage (stateAssessments.generalDocStatus). */
  docStage: string | null;
  /** Progress-bar segment. */
  segment: LifecycleSegment;
};

/** Derive every lifecycle flag from flat row fields — ONE rule, shared by the
 *  React client (master list, reports, type-wise summaries) and, via
 *  deriveLifecycleView, the Convex backend. Keeping every "result awaited" /
 *  "certified" / "NA scheduled" decision here is what makes a single lifecycle
 *  event update consistently everywhere. */
export function deriveFlatLifecycle(
  input: FlatLifecycleInput,
  today: string = todayIso(),
): FlatLifecycleView {
  const currentStatus = input.currentStatus ?? "";
  const certResult = input.certStatus ?? null;
  const docStage = input.docStatus ?? null;

  // Exact result match — conditionality is a distinct category and a manual
  // status override must never inflate the certified counts. The legacy
  // fallback covers old rows that stored the auto status without a result.
  const isQualityCertified =
    certResult === "Quality Certified" ||
    (!certResult &&
      (currentStatus === "Certified — Surveillance Due" ||
        currentStatus === "Certified — On track"));
  const isConditional =
    certResult === "Quality Certified with Conditionality" ||
    (!certResult && currentStatus === "Certified with Conditionality");
  const isDeferred =
    certResult === "Deferred" || (!certResult && currentStatus.startsWith("Deferred"));

  // Date-primary NQAS schedule rule: a start date of today or any upcoming
  // date means the assessment IS scheduled, even if the NA status was never
  // flipped from Pending. A past date is NEVER scheduled on its own — only an
  // explicit signal with no date recorded keeps it visible. A stored result or
  // a completed assessment never counts as scheduled.
  const naStart = input.naStartDate ?? null;
  const nqasScheduled =
    !certResult &&
    input.naStatus !== "Completed" &&
    ((!!naStart && naStart >= today) ||
      (!naStart &&
        (input.naStatus === "Scheduled" ||
          docStage === "NA Scheduled" ||
          currentStatus === "NA Scheduled")));

  // Result awaited: the stored result is primary; otherwise assessment done /
  // documents marked awaiting results. Never for a facility that has not
  // started its cycle or has a certification result.
  const isResultAwaited =
    certResult === "Result Awaited" ||
    (!certResult &&
      (currentStatus === "Result Awaited" ||
        currentStatus === "SA Completed — NQAS Awaited" ||
        currentStatus === "Recertification Due")) ||
    (!certResult &&
      docStage === "NA Completed & Awaiting Results" &&
      currentStatus !== "Facility (Future Candidate)" &&
      currentStatus !== "SA Not Yet Initiated");

  const segment: LifecycleSegment = isQualityCertified
    ? "certified"
    : isConditional
      ? "conditional"
      : isDeferred
        ? "deferred"
        : certResult === "Result Awaited" ||
            currentStatus === "Result Awaited" ||
            currentStatus === "Recertification Due"
          ? "dueSoon"
          : currentStatus.startsWith("SA Scheduled") ||
              currentStatus.startsWith("NA Scheduled") ||
              currentStatus.startsWith("NQAS") ||
              currentStatus.startsWith("SA Completed") ||
              currentStatus === "Eligible for Re-Assessment"
            ? "inProgress"
            : "notStarted";

  // The NQAS step is open: an explicit "NA Scheduled" current status (even
  // with a past start date the date-primary rule no longer reads as
  // scheduled) or legacy NQAS wording. Without this, such a facility would
  // fall back into the State Assessment bucket.
  const naPhase =
    currentStatus.startsWith("NA Scheduled") ||
    currentStatus.startsWith("NQAS");

  return {
    certResult,
    isQualityCertified,
    isConditional,
    isDeferred,
    isResultAwaited,
    nqasScheduled,
    naPhase,
    iaDone: !!input.iaDone,
    docStage,
    segment,
  };
}

/** ----------------------------------------------------------------
 *  Unified status — the one merged "Facility Current Status" column
 *  (renamed from "Pipeline Status").
 *
 *  The master sheet carries four overlapping status inputs (SaQsham
 *  Documents Status, State Assessment Status, NQAS Certification Status,
 *  the manual/auto current status). This pure rule folds them into ONE value
 *  that says where the facility stands in the lifecycle:
 *
 *  Eligibility → Internal Assessment → State Assessment → NQAS Assessment
 *  → Certification → Surveillance → Recertification
 *
 *  Priority (furthest meaningful signal wins):
 *   1. Not-eligible / future-candidate eligibility gate
 *   2. Certification result (incl. Deferred cooling / re-assessment /
 *      Recertification Due windows)
 *   3. NQAS assessment scheduled (date-primary) or documents awaiting result
 *   4. State Assessment scheduled / completed (documents forwarded etc.)
 *   5. Fallback: the auto Current Status (which already encodes eligibility
 *      + SA + NQAS intermediate steps)
 *  A manual override never inflates this: the manual value stays visible in
 *  the facility's own current-status field and in the audit log.
 *  ---------------------------------------------------------------- */
export function mergedPipelineStatus(
  facility: { eligibility: string; currentStatus?: string | null },
  sa: { status: string; generalDocStatus?: string | null } | null,
  nqas: {
    status: string;
    scheduledStartDate?: string | null;
    certificationStatus?: string | null;
    validityDate?: string | null;
  } | null,
  s: LifecycleSettings,
  today: string = todayIso(),
): string {
  // 1 — eligibility gate. A certified result wins over a stale eligibility
  // value: the facility cannot be "Not Eligible" while it holds a certificate.
  const saStatus = sa?.status ?? "Not Yet Initiated";
  const naStatus = nqas?.status ?? "Pending";
  const certStatus = nqas?.certificationStatus ?? null;
  const certified =
    certStatus === "Quality Certified" ||
    certStatus === "Quality Certified with Conditionality";
  if (!certified && facility.eligibility !== "Eligible") {
    return facility.eligibility === "Possible"
      ? "Facility (Future Candidate)"
      : "Not Eligible";
  }

  // 2 — certification result branch
  if (certStatus) {
    if (certStatus === "Deferred") {
      return "Deferred — Cooling Period";
    }
    if (certStatus === "Result Awaited") return "Result Awaited";
    const naLike: NqasLike = { status: naStatus };
    if (certStatus === "Quality Certified") {
      const validity =
        nqas?.validityDate ?? computeDerivedNqas(naLike, s).validityDate;
      if (validity && daysBetween(validity, today) <= s.recertificationAlertLeadDays) {
        return "Recertification Due";
      }
      return certifiedSurveillanceStatus(
        (nqas ?? null) as Partial<NqasLike> | null,
        s,
        today,
      );
    }
    if (certStatus === "Quality Certified with Conditionality") {
      const validity =
        nqas?.validityDate ?? computeDerivedNqas(naLike, s).validityDate;
      if (validity && daysBetween(today, validity) > 0) {
        return daysBetween(validity, today) <= s.recertificationAlertLeadDays
          ? "Recertification Due"
          : "Certified with Conditionality";
      }
      return "Recertification Due";
    }
    // Unknown stored result — fall through to the auto status below.
  }

  // 3 — NQAS assessment in motion
  const naUpcoming = !!nqas?.scheduledStartDate && nqas.scheduledStartDate >= today;
  if (naStatus === "Completed" && !certStatus) return "Result Awaited";
  if (naStatus === "Scheduled" || naUpcoming) {
    return "NA Scheduled";
  }
  if (sa?.generalDocStatus === "NA Completed & Awaiting Results") {
    return "Result Awaited";
  }

  // 4 — State Assessment phase (documents + SA status)
  if (saStatus === "Scheduled") return "SA Scheduled";
  if (saStatus === "Completed") {
    return sa?.generalDocStatus === "Docx forwarded to NHSRC"
      ? "SA Completed — NQAS Awaited"
      : "SA Completed — NQAS Pending";
  }

  // 5 — fallback: the auto status (covers SA Not Yet Initiated and any
  //     legacy wording already handled by computeCurrentStatus).
  return facility.currentStatus ?? "SA Not Yet Initiated";
}

export type LifecycleView = FlatLifecycleView & {
  /** Canonical state-machine status (see computeCurrentStatus). */
  currentStatus: string;
  /** Concrete next action for the current status. */
  nextStep: string;
  /** Furthest pipeline stage reached (drives the dashboard strip, the
   *  facility stepper and the deck's status buckets). */
  stage: PipelineStage;
};

/** Derive every lifecycle view field from the raw records, once.
 *
 *  Pure and shared by the Convex backend and the React client so the KPI
 *  cards, block/PHC bars, type-wise summaries, reports and decks can never
 *  disagree about what "certified" or "result awaited" means. */
export function deriveLifecycleView(
  facility: FacilityLike,
  sa: SaLike | null,
  nqas: NqasLike | null,
  s: LifecycleSettings,
  today: string = todayIso(),
): LifecycleView {
  const currentStatus = computeCurrentStatus(facility, sa, nqas, s, today);
  const flat = deriveFlatLifecycle(
    {
      currentStatus,
      certStatus: nqas?.certificationStatus ?? null,
      naStatus: nqas?.status ?? null,
      naStartDate: nqas?.scheduledStartDate ?? null,
      docStatus: sa?.generalDocStatus ?? null,
      // Internal Assessment stage — the quarterly IA scores live on the
      // facility row, so every surface that receives the full facility doc
      // (dashboard, profile, summaries) counts the same IA cohort.
      iaDone: hasIaScores(facility),
    },
    today,
  );
  return {
    currentStatus,
    ...flat,
    nextStep: nextStepHint(currentStatus),
    stage: pipelineStageOf(flat, facility.eligibility),
  };
}

export const CYCLE_TYPE_BY_TRIGGER = {
  initial: "Initial",
  deferred: "Post-Deferred Reattempt",
  recertification: "Recertification",
} as const;

export type CycleTrigger = keyof typeof CYCLE_TYPE_BY_TRIGGER;

export type StatusTone =
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "slate"
  | "violet";

export function statusTone(status: string): StatusTone {
  if (status.startsWith("Certified —") || status === "Quality Certified") return "green";
  if (status.includes("Conditionality")) return "amber";
  if (status === "Recertification Due" || status.includes("Expired")) return "amber";
  if (status.startsWith("Deferred")) return "red";
  if (status === "Eligible for Re-Assessment") return "violet";
  if (
    status.startsWith("SA Scheduled") ||
    status.startsWith("NA Scheduled") ||
    status.startsWith("NQAS Scheduled")
  )
    return "blue";
  if (status.startsWith("SA Completed") || status.startsWith("NQAS Completed"))
    return "blue";
  return "slate";
}

/** Ordered workflow steps used by the UI to render progress + next-step hints. */
export function nextStepHint(status: string): string {
  switch (status) {
    case "Not Eligible":
      return "Facility is not NQAS-eligible.";
    case "Facility (Future Candidate)":
      return "Mark the facility Eligible to begin its first certification cycle.";
    case "SA Not Yet Initiated":
      return "Record the Internal Assessment (IA %) scores, then schedule the State Assessment to begin the cycle.";
    case "SA Scheduled":
      return "After the SA visit, record actual start/end dates and score to complete it.";
    case "SA Completed — NQAS Awaited":
    case "SA Completed — NQAS Pending":
      return "Schedule the National (NQAS) Assessment for this cycle.";
    case "NA Scheduled":
      return "After the NQAS assessment, record the result, score and dates.";
    case "Result Awaited":
      return "Awaiting the certification result from GoI.";
    case "Certified — Surveillance Due":
      return "A surveillance visit is overdue or due soon — record its done date after the visit.";
    case "Certified — On track":
      return "Surveillance is up to date — next recertification when the certificate ends.";
    case "Certified with Conditionality":
      return "Conditionality applies — recertification opens before 1-year expiry.";
    case "Deferred — Cooling Period":
      return "3-month cooling period in force before a reattempt can start.";
    case "Eligible for Re-Assessment":
      return "Cooldown over — start a Post-Deferred Reattempt cycle.";
    case "Recertification Due":
      return "Validity is ending — start a Recertification cycle (full SA → NQAS again).";
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// The canonical certification pipeline — the single wording every surface
// organises work around. It is what the Admin dropdown groups below are laid
// out along, so all column dropdowns read in the order a facility moves
// through its cycle. Eligibility is composite (Building Status, Fire NOC and
// Gap Closure — only when a gap exists); Internal Assessment is taken once
// inside a 3-month window; Surveillance and Recertification follow
// Certification.
// ---------------------------------------------------------------------------

export const PIPELINE_PHASES: {
  key: string;
  label: string;
  detail: string;
  subModules?: string[];
}[] = [
  {
    key: "eligibility",
    label: "Eligibility",
    detail: "Confirm readiness before the cycle opens.",
    subModules: ["Building Status", "Fire NOC", "Gap Closure (if needed)"],
  },
  {
    key: "ia",
    label: "Internal Assessment",
    detail: "Taken once, inside a 3-month window.",
  },
  {
    key: "sa",
    label: "State Assessment",
    detail: "State assessment visit and the SaQsham documents.",
  },
  { key: "nqas", label: "NQAS Assessment", detail: "National (NQAS) assessment." },
  {
    key: "certification",
    label: "Certification",
    detail: "NQAS certification result and validity.",
  },
  {
    key: "surveillance",
    label: "Surveillance",
    detail: "Year-1 and Year-2 surveillance visits.",
  },
  {
    key: "recert",
    label: "Recertification",
    detail: "Recertify before the certificate expires.",
  },
];

/** Every admin-editable dropdown list in the app. */
export type DropdownKey =
  | "eligibilityOptions"
  | "buildingTypes"
  | "buildingStatuses"
  | "nocAvailableOptions"
  | "fundStatuses"
  | "saStatuses"
  | "generalDocStatuses"
  | "assessorHuds"
  | "assessmentModes"
  | "nqasStatuses"
  | "departments"
  | "departmentCriteria"
  | "checklistVersions"
  | "certificationStatuses"
  | "facilityTypes"
  | "statusLabels";

/** Every column/field dropdown, grouped by the lifecycle phase it belongs to.
 *  Single source of truth for Admin Settings so all dropdowns are organised
 *  along the certification pipeline instead of one flat list. A phase with no
 *  editable list (Internal Assessment, Surveillance & Recertification) carries
 *  only its `description`, which explains why. */
export const DROPDOWN_GROUPS: {
  phase: string;
  description: string;
  items: { key: DropdownKey; label: string; hint: string }[];
}[] = [
  {
    phase: "Eligibility",
    description:
      "Pre-assessment readiness. Sub-modules: Building Status, Fire NOC and Gap Closure (only when a gap exists).",
    items: [
      {
        key: "eligibilityOptions",
        label: "NQAS Eligibility",
        hint: "Eligible / In-Eligible / Future Candidate labels",
      },
      { key: "buildingTypes", label: "Building Type", hint: "Building Type column" },
      { key: "buildingStatuses", label: "Building Status", hint: "Facility Building Status column" },
      { key: "nocAvailableOptions", label: "NOC Available", hint: "Fire NOC Available column (Yes / No)" },
      { key: "fundStatuses", label: "Gap Closure Fund Status", hint: "Fund tracker status column" },
    ],
  },
  {
    phase: "Internal Assessment",
    description:
      "Quarterly IA % scores (NQAS / Kayakalp Q1–Q2), entered as numbers on the Internal Assessment page — no dropdown.",
    items: [],
  },
  {
    phase: "State Assessment",
    description: "State assessment visit, SaQsham document pipeline and assessors.",
    items: [
      { key: "saStatuses", label: "State Assessment Status", hint: "State Assessment Status column" },
      { key: "generalDocStatuses", label: "SaQsham Documents Status", hint: "6-stage document pipeline" },
      { key: "assessorHuds", label: "Assessors 1 & 2 HUD", hint: "HUD unit dropdown for both assessors" },
    ],
  },
  {
    phase: "NQAS Assessment",
    description: "National (NQAS) assessment details.",
    items: [
      { key: "assessmentModes", label: "Mode of Assessment", hint: "Physical / Virtual / Hybrid" },
      { key: "nqasStatuses", label: "NQAS Status", hint: "NQAS assessment status" },
      { key: "departments", label: "Departments / Service Areas", hint: "NQAS profile checklist" },
      {
        key: "departmentCriteria",
        label: "Departments / Packages & Certification Criteria",
        hint: "Master-list criteria column",
      },
      { key: "checklistVersions", label: "Checklist Versions", hint: "NQAS profile checklist" },
    ],
  },
  {
    phase: "Certification",
    description: "NQAS certification result and validity.",
    items: [
      {
        key: "certificationStatuses",
        label: "NQAS Certification Status",
        hint: "Result Awaited / Quality Certified / with Conditionality / Deferred",
      },
    ],
  },
  {
    phase: "Surveillance & Recertification",
    description:
      "Surveillance due/done dates and recertification status are derived from the certification date — no dropdown.",
    items: [],
  },
  {
    phase: "Master data & overrides",
    description:
      "Facility identity and the manual status override that applies across every stage.",
    items: [
      { key: "facilityTypes", label: "Facility Types", hint: "Add-facility & filter dropdowns" },
      // NAME-CLASH DECISION: the master list's merged status column was renamed
      // "Pipeline Status" → "Facility Current Status". This list holds the
      // options for the MANUAL override of that same field, so its label now
      // names the field it belongs to instead of inventing a second, nearly
      // identical column name. (It is NOT a Surveillance & Recertification
      // field, so it is deliberately not called "Surveillance Current Status".)
      { key: "statusLabels", label: "Facility Current Status (manual override)", hint: "Manual status override options" },
    ],
  },
];
