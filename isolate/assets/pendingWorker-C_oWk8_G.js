(function () {
  'use strict';

  const DEFAULT_SETTINGS = {
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
      excellent: 90
    },
    // PDF department name → the canonical name used in comparisons. Admin →
    // General → Department names edits this list; an unknown name is kept as
    // written and marked "New" in the preview.
    departmentNames: [
      { pdfName: "Indoor", canonicalName: "IPD" },
      { pdfName: "Labour room", canonicalName: "Labour Room" },
      { pdfName: "Lab", canonicalName: "Laboratory" }
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
      visible: "show",
      label: "Update",
      pinRight: true,
      compactBelow1280: true
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
      "Certification Expired"
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
      "13 Departments & Met all Criteria"
    ],
    // NQAS Assessment → Scope: one optional choice, edited in Admin → General.
    scopeOptions: [
      "6 Departments & Met all Criteria",
      "6 Departments & Met 5 out of 5 Criteria",
      "All 12 Thematic Areas",
      "12 Service Packages",
      "7 Mandatory Service Packages",
      "Met 4 out of 6 Criteria",
      "13 Departments & Met all Criteria"
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
      "Deferred"
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
      "Immunization"
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
      "Health Promotion & Wellness"
    ],
    // "Documents Status" (SaQsham/general document pipeline) — the six approved
    // workflow stages shown in the master-list dropdown.
    generalDocStatuses: [
      "Docx Pending at Facility",
      "Docx in RQAU login",
      "Docx in SQAU login",
      "Docx forwarded to NHSRC",
      "NA Scheduled",
      "NA Completed & Awaiting Results"
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
      "HUD-5"
    ],
    checklistVersions: ["NQAS 2022", "NQAS 2019", "Kayakalp 2024"],
    certificationValidityYears: 3,
    // Quality Certified
    conditionalValidityYears: 1,
    // Certified with Conditionality
    deferredCooldownMonths: 3,
    // Deferred → reattempt unlock
    surveillanceIntervalsMonths: 12,
    // Y1 = +12m, Y2 = +24m
    // A surveillance visit is "due soon" inside this window (default 90 days).
    surveillanceAlertLeadDays: 90,
    recertificationAlertLeadDays: 90,
    // "Recertification Due" flag window
    fireNocAlertLeadDays: 90,
    // Fire NOC expiring-soon window
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
    fundPendingAlertDays: 90,
    // Gap closure fund stuck as Pending
    // Page visibility (Admin Settings): category pages hidden from the
    // sidebar / pills for everyone except the State Admin. Empty by
    // default — all pages visible.
    hiddenCategories: [],
    // Non-category pages included in the same visibility control.
    // "generate-ppt" hides the Generate PPT page.
    hiddenPages: [],
    // Dashboard section controls: when on, every dashboard section gets a drag
    // handle to reorder it and width/height controls to shrink it. Off by
    // default so the dashboard renders exactly as before unless an admin
    // deliberately enables rearranging.
    dashboardSectionControls: false
  };
  const dateToTs = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return NaN;
    return new Date(y, m - 1, d, 12).getTime();
  };
  const addMonthsToIso = (iso, months) => {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    const dt = new Date(Date.UTC(y, m - 1 + months, 1, 12));
    const lastDay = new Date(
      Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)
    ).getUTCDate();
    const day = Math.min(d, lastDay);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  const addYearsToIso = (iso, years) => addMonthsToIso(iso, years * 12);
  const todayIso = () => {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const daysBetween$1 = (aIso, bIso) => Math.round((dateToTs(aIso) - dateToTs(bIso)) / 864e5);
  function deriveFireNocStatus(nocAvailable, expiryDate, storedStatus, today = todayIso(), leadDays = DEFAULT_SETTINGS.fireNocAlertLeadDays) {
    if (nocAvailable === "No") return "Not Obtained";
    if (!expiryDate) return storedStatus || "Not Obtained";
    const left = daysBetween$1(expiryDate, today);
    if (left < 0) return "Expired";
    if (left <= leadDays) return "Expiring Soon";
    return "Valid";
  }
  function deferredRetakeCountdown(nqas, s, today = todayIso()) {
    if (nqas?.certificationStatus !== "Deferred") return null;
    const anchor = nqas.goiLetterDate || nqas.actualEndDate || null;
    if (!anchor || Number.isNaN(dateToTs(anchor))) return null;
    const unlockDate = addMonthsToIso(anchor, s.deferredCooldownMonths);
    const daysLeft = daysBetween$1(unlockDate, today);
    return daysLeft <= 0 ? null : { unlockDate, daysLeft };
  }
  function computeDerivedNqas(nqas, s) {
    const certStatus = nqas.certificationStatus;
    const isCertified = certStatus === "Quality Certified" || certStatus === "Quality Certified with Conditionality";
    const isDeferred = certStatus === "Deferred";
    if (!isCertified && !isDeferred) {
      return { validityDate: null, surveillanceDue1: null, surveillanceDue2: null };
    }
    const certDate = nqas.goiLetterDate || nqas.certificationDate || nqas.actualEndDate;
    if (!certDate) return { validityDate: null, surveillanceDue1: null, surveillanceDue2: null };
    const validityDate = isDeferred ? addMonthsToIso(certDate, s.deferredCooldownMonths) : addYearsToIso(
      certDate,
      certStatus === "Quality Certified" ? s.certificationValidityYears : s.conditionalValidityYears
    );
    return {
      validityDate,
      surveillanceDue1: !isDeferred && certStatus !== "Quality Certified with Conditionality" ? addMonthsToIso(certDate, s.surveillanceIntervalsMonths) : null,
      surveillanceDue2: !isDeferred && certStatus === "Quality Certified" ? addMonthsToIso(certDate, s.surveillanceIntervalsMonths * 2) : null
    };
  }
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
    "Dec"
  ];
  function formatVisitDate(iso) {
    if (!iso) return "";
    const [y, m, d] = String(iso).slice(0, 10).split("-");
    const mi = Number(m) - 1;
    if (!y || Number.isNaN(mi) || !MONTH_SHORT[mi] || !d) return String(iso);
    return `${d}-${MONTH_SHORT[mi]}-${y}`;
  }
  const plural = (n, one, many = `${one}s`) => `${n} ${Math.abs(n) === 1 ? one : many}`;
  function surveillanceVisits(nqas, s = null, today = todayIso()) {
    const settings = { ...DEFAULT_SETTINGS, ...s ?? {} };
    const certStatus = nqas?.certificationStatus ?? "";
    const certified = certStatus === "Quality Certified" || certStatus === "Quality Certified with Conditionality";
    const derived = computeDerivedNqas(
      { ...nqas ?? {}, status: nqas?.status ?? "" },
      settings
    );
    const certDate = nqas?.goiLetterDate || nqas?.certificationDate || nqas?.actualEndDate || null;
    const leadDays = settings.surveillanceAlertLeadDays;
    const specs = [
      {
        key: "surv1",
        label: "1st surveillance",
        due: nqas?.surveillanceDue1 || derived.surveillanceDue1,
        done: nqas?.surveillanceDone1 ?? null
      },
      {
        key: "surv2",
        label: "2nd surveillance",
        due: nqas?.surveillanceDue2 || derived.surveillanceDue2,
        done: nqas?.surveillanceDone2 ?? null
      }
    ];
    return specs.map((spec) => {
      const done = spec.done ? String(spec.done).slice(0, 10) : null;
      const due = spec.due ? String(spec.due).slice(0, 10) : null;
      const realDone = done && /^\d{4}-\d{2}-\d{2}$/.test(done) && done <= today && (!certDate || done >= certDate) ? done : null;
      const base = {
        key: spec.key,
        label: spec.label,
        due,
        done,
        validDone: realDone
      };
      if (!certified || !due) {
        return {
          ...base,
          state: "notApplicable",
          days: null,
          chip: "Not applicable",
          tone: "slate",
          detail: !certified ? "Not applicable until the facility is certified" : "No due date recorded"
        };
      }
      if (realDone) {
        const offset = daysBetween$1(realDone, due);
        const detail = offset === 0 ? "on the due date" : offset > 0 ? `late by ${plural(offset, "day")}` : `${plural(offset * -1, "day")} early`;
        return {
          ...base,
          state: "done",
          days: offset,
          chip: `Done ${formatVisitDate(realDone)}`,
          tone: "green",
          detail
        };
      }
      const days = daysBetween$1(due, today);
      if (days < 0) {
        return {
          ...base,
          state: "overdue",
          days,
          chip: `Overdue ${Math.abs(days)}d`,
          tone: "red",
          detail: `${spec.label} was due on ${formatVisitDate(due)}`
        };
      }
      if (days <= leadDays) {
        return {
          ...base,
          state: "dueSoon",
          days,
          chip: `Due in ${days}d`,
          tone: "amber",
          detail: `${spec.label} is due on ${formatVisitDate(due)}`
        };
      }
      return {
        ...base,
        state: "upcoming",
        days,
        chip: `Due ${formatVisitDate(due)}`,
        tone: "slate",
        detail: `${spec.label} is due on ${formatVisitDate(due)}`
      };
    });
  }
  const PIPELINE_STAGES = [
    { key: "notEligible", label: "Not eligible" },
    { key: "notStarted", label: "Eligible — not started" },
    { key: "internalAssessment", label: "Internal Assessment" },
    { key: "stateAssessment", label: "State Assessment" },
    { key: "naScheduled", label: "NA scheduled" },
    { key: "resultAwaited", label: "Result awaited" },
    { key: "certified", label: "Certified" }
  ];
  Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s.key, s.label])
  );

  const DOC_TYPES = [
    {
      key: "NQAS_Result",
      label: "NQAS Result",
      short: "NQAS result",
      maxMb: 25,
      requiredForCertified: true,
      // Part 3 (b): the result is often a scan/photo — PDF and images.
      mimes: ["application/pdf", "image/png", "image/jpeg"]
    },
    {
      key: "SA_Report",
      label: "SA Report",
      short: "SA report",
      maxMb: 25,
      requiredForCertified: false,
      mimes: ["application/pdf"]
    },
    {
      key: "SA_Checklist",
      label: "SA Checklist",
      short: "SA checklist",
      maxMb: 25,
      requiredForCertified: false,
      // Part 3 (b): Excel in BOTH formats the districts send — .xlsx and the
      // legacy .xls (application/vnd.ms-excel).
      mimes: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel"
      ]
    },
    {
      key: "Gap_Closure",
      label: "Gap Closure Proceeding",
      short: "Gap closure proceeding",
      maxMb: 10,
      requiredForCertified: false,
      mimes: ["application/pdf"]
    },
    {
      key: "Condemned",
      label: "Condemned Certificate",
      short: "Condemned certificate",
      maxMb: 10,
      requiredForCertified: false,
      mimes: ["application/pdf"]
    },
    {
      key: "NOC",
      label: "Fire NOC",
      short: "Fire NOC",
      maxMb: 10,
      requiredForCertified: false,
      // Part 3 (b): a NOC is frequently photographed.
      mimes: ["application/pdf", "image/png", "image/jpeg"]
    },
    {
      key: "NQAS_Certificate",
      label: "NQAS Certified Documents (legacy)",
      short: "Certificate",
      maxMb: 10,
      requiredForCertified: false,
      mimes: ["application/pdf"],
      /** Old key, folded into NQAS_Result. Never shown or counted. */
      legacy: true
    }
  ];
  DOC_TYPES.map((d) => d.key);
  const ACTIVE_DOC_TYPES = DOC_TYPES.filter(
    (t) => !("legacy" in t && t.legacy)
  );
  ACTIVE_DOC_TYPES.map((d) => d.key);

  const CONDITION_LABELS = {
    certified: "certification status is certified or conditional",
    gap_amount: "Gap Closure Amount exists",
    dilapidated: "building is Dilapidated",
    fire_noc: "Fire NOC recorded"
  };
  const CONDITION_SHORT = {
    certified: "certified",
    gap_amount: "gap closure amount",
    dilapidated: "dilapidated building",
    fire_noc: "Fire NOC recorded"
  };
  const DEFAULT_RULE = {
    mode: "optional",
    condition: "certified",
    blocking: false,
    scope: "cycle"
  };
  function defaultDocumentRules() {
    const out = {};
    for (const type of ACTIVE_DOC_TYPES) {
      out[type.key] = type.key === "NQAS_Result" ? { mode: "conditional", condition: "certified", blocking: true, scope: "cycle" } : { ...DEFAULT_RULE };
    }
    return out;
  }
  const DEFAULT_DOCUMENT_RULES = defaultDocumentRules();
  function isCertifiedOrConditional(status) {
    const s = (status ?? "").toLowerCase();
    return s.includes("quality certified") || s.includes("with conditionality");
  }
  function conditionMet(condition, ctx) {
    switch (condition) {
      case "certified":
        return isCertifiedOrConditional(ctx.certStatus);
      case "gap_amount":
        return (ctx.gapAmount ?? 0) > 0;
      case "dilapidated":
        return ctx.dilapidated === true;
      case "fire_noc":
        return ctx.fireNocRecorded === true;
    }
  }
  function resolveDocRequirement(rule, ctx) {
    if (rule.mode === "mandatory") {
      return {
        required: true,
        blocking: rule.blocking,
        badge: "Required",
        reason: "This document is mandatory for every facility.",
        rule
      };
    }
    if (rule.mode === "conditional" && conditionMet(rule.condition, ctx)) {
      return {
        required: true,
        blocking: rule.blocking,
        badge: `Required: ${CONDITION_SHORT[rule.condition]}`,
        reason: `Required because ${CONDITION_LABELS[rule.condition]}.`,
        rule
      };
    }
    return { required: false, blocking: false, badge: "Optional", reason: null, rule };
  }
  function resolveDocumentRequirements(rules, ctx) {
    const out = {};
    for (const type of ACTIVE_DOC_TYPES) {
      out[type.key] = resolveDocRequirement(rules[type.key] ?? DEFAULT_RULE, ctx);
    }
    return out;
  }
  function requiredDocumentIssues(facts, rules = DEFAULT_DOCUMENT_RULES) {
    const present = new Set(facts.presentKeys ?? []);
    const requirements = resolveDocumentRequirements(rules, facts);
    const out = [];
    for (const type of ACTIVE_DOC_TYPES) {
      const requirement = requirements[type.key];
      if (!requirement.required) continue;
      const alias = type.key === "NQAS_Result" ? "NQAS_Certificate" : null;
      if (present.has(type.key) || alias && present.has(alias)) continue;
      out.push({
        key: type.key,
        label: type.label,
        blocking: requirement.blocking,
        badge: requirement.badge,
        reason: requirement.reason,
        rule: requirement.rule,
        message: requirement.blocking ? `${type.label} is required for this facility; saving the NQAS assessment is blocked until it is uploaded.` : `${type.label} is required for this facility under the current document rules.`
      });
    }
    return out;
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function dmy(iso) {
    if (!iso) return "-";
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
    if (!m) return String(iso);
    return `${m[3]}-${MONTHS[Number(m[2]) - 1] ?? m[2]}-${m[1]}`;
  }
  function isoDate(value) {
    if (value == null || value === "") return null;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return null;
      return new Date(value + 5.5 * 60 * 60 * 1e3).toISOString().slice(0, 10);
    }
    const text = String(value);
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(text);
    return m ? m[1] : null;
  }
  const dayMs = 864e5;
  const utc = (iso) => Date.parse(`${iso}T00:00:00Z`);
  function daysBetween(from, to) {
    if (!from || !to) return null;
    const a = utc(String(from).slice(0, 10));
    const b = utc(String(to).slice(0, 10));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return Math.round((b - a) / dayMs);
  }
  function fyQuarter(iso) {
    const y = Number(iso.slice(0, 4));
    const m = Number(iso.slice(5, 7));
    const fyStart = m >= 4 ? y : y - 1;
    const fy = `${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
    const quarter = m >= 4 && m <= 6 ? 1 : m >= 7 && m <= 9 ? 2 : m >= 10 && m <= 12 ? 3 : 4;
    const startMonth = [4, 7, 10, 1][quarter - 1];
    const startYear = quarter === 4 ? fyStart + 1 : fyStart;
    const endMonth = [6, 9, 12, 3][quarter - 1];
    const endYear = startYear;
    const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
    return {
      fy,
      quarter,
      label: `Q${quarter} ${fy}`,
      start: `${startYear}-${String(startMonth).padStart(2, "0")}-01`,
      end: `${endYear}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    };
  }
  function latestCompletedQuarter(today) {
    const current = fyQuarter(today);
    const q = current.quarter === 1 ? 4 : current.quarter - 1;
    const fyStart = Number(current.fy.slice(0, 4)) - (current.quarter === 1 ? 1 : 0);
    const firstDay = q === 1 ? `${fyStart}-04-01` : q === 2 ? `${fyStart}-07-01` : q === 3 ? `${fyStart}-10-01` : `${fyStart + 1}-01-01`;
    return fyQuarter(firstDay);
  }
  const DOC_LABEL = Object.fromEntries(
    ACTIVE_DOC_TYPES.map((t) => [t.key, t.label])
  );
  const hasDoc = (row, key) => {
    const present = row.docs?.keys;
    if (!present) return true;
    if (present.includes(key)) return true;
    return key === "NQAS_Result" && present.includes("NQAS_Certificate");
  };
  const certStatusOf = (row) => row.nqas?.certificationStatus ?? null;
  const isCertified = (row) => isCertifiedOrConditional(certStatusOf(row)) || certStatusOf(row) === "Certified";
  const isPipeline = (row) => !isCertified(row) && (row.facility.eligibility ?? "").toLowerCase() === "eligible" && !/not eligible|archived/i.test(row.facility.currentStatus ?? "");
  const saCompleted = (row) => (row.sa?.status ?? "").toLowerCase() === "completed";
  const nocRecorded = (row) => !!row.noc && ((row.noc.nocAvailable ?? "") === "Yes" || !!row.noc.issuedDate || /obtained|valid/i.test(row.noc.status ?? ""));
  const dilapidated = (row) => (row.building?.buildingStatus ?? "").toLowerCase() === "dilapidated";
  const inr = (value) => `₹${Math.round(value).toLocaleString("en-IN")}`;
  const daysText = (days) => `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  const clampThreshold = (setting, key, fallback) => {
    const value = setting.thresholds?.[key];
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  };
  const issueRules = [
    /* ---------------------------- Documents ---------------------------- */
    {
      id: "doc.nqas-result",
      category: "documents",
      label: "NQAS Result missing for a certified facility",
      description: "A certified facility has no NQAS Result file. High: the certificate cannot be verified without it.",
      defaultSeverity: "high",
      defaultEnabled: true,
      thresholds: [],
      action: "documents",
      check: (row, ctx) => {
        if (!row.docs?.keys || hasDoc(row, "NQAS_Result")) return [];
        const required = requiredDocumentIssues(
          {
            presentKeys: row.docs.keys,
            certStatus: certStatusOf(row),
            gapAmount: row.fund?.amountSanctioned ?? 0,
            dilapidated: dilapidated(row),
            fireNocRecorded: nocRecorded(row)
          },
          ctx.documentRules
        ).some((issue) => issue.key === "NQAS_Result");
        if (!required) return [];
        const certifiedOn = row.nqas?.certificationDate ?? row.nqas?.goiLetterDate ?? null;
        return [
          {
            reason: isCertified(row) ? `NQAS Result file not uploaded; certified ${dmy(certifiedOn)}` : "NQAS Result file not uploaded; required under Admin → Documents",
            since: certifiedOn,
            documentKey: "NQAS_Result"
          }
        ];
      }
    },
    {
      id: "doc.required",
      category: "documents",
      label: "Any document required by Admin → Documents is missing",
      description: "Uses the live document rules. If another rule already covers a file, this rule skips it, so nothing is counted twice.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [],
      action: "documents",
      check: (row, ctx) => {
        if (!row.docs?.keys) return [];
        const covered = /* @__PURE__ */ new Set(["NQAS_Result"]);
        if (saCompleted(row)) {
          covered.add("SA_Report");
          covered.add("SA_Checklist");
        }
        if ((row.fund?.amountSanctioned ?? 0) > 0) covered.add("Gap_Closure");
        if (dilapidated(row)) covered.add("Condemned");
        if (nocRecorded(row)) covered.add("NOC");
        return requiredDocumentIssues(
          {
            presentKeys: row.docs.keys,
            certStatus: certStatusOf(row),
            gapAmount: row.fund?.amountSanctioned ?? 0,
            dilapidated: dilapidated(row),
            fireNocRecorded: nocRecorded(row)
          },
          ctx.documentRules
        ).filter((issue) => !covered.has(issue.key)).map((issue) => ({
          reason: `${issue.label} is required under Admin → Documents${issue.blocking ? " (blocking)" : ""}`,
          documentKey: issue.key,
          suffix: issue.key
        }));
      }
    },
    {
      id: "doc.drive-missing",
      category: "documents",
      label: "File missing in Drive",
      description: "The nightly reconciliation found that a current document's file is no longer in Drive.",
      defaultSeverity: "high",
      defaultEnabled: true,
      thresholds: [],
      action: "documents",
      check: (row) => {
        const keys = row.docs?.missingInDriveKeys ?? [];
        return keys.map((key) => ({
          reason: `File missing in Drive: ${DOC_LABEL[key] ?? key.replace(/_/g, " ")}`,
          documentKey: key,
          suffix: key
        }));
      }
    },
    {
      id: "doc.sa-report",
      category: "documents",
      label: "SA Report or SA Checklist not uploaded after the State Assessment",
      description: "The State Assessment is Completed but its report or checklist attachment is absent.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [],
      action: "documents",
      check: (row) => {
        if (!saCompleted(row)) return [];
        const missing = [];
        if (!row.sa?.reportAttachmentId) missing.push("SA Report");
        if (!row.sa?.checklistAttachmentId) missing.push("SA Checklist");
        if (missing.length === 0) return [];
        const end = row.sa?.actualEndDate ?? null;
        return [
          {
            reason: `${missing.join(" and ")} not uploaded after the State Assessment${end ? ` completed on ${dmy(end)}` : " was completed"}`,
            since: end
          }
        ];
      }
    },
    {
      id: "doc.gap-closure",
      category: "documents",
      label: "Gap Closure Proceeding missing where a gap amount exists",
      description: "A sanctioned gap amount has no Gap Closure Proceeding uploaded.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [],
      action: "documents",
      check: (row) => {
        const amount = row.fund?.amountSanctioned ?? 0;
        if (amount <= 0 || hasDoc(row, "Gap_Closure")) return [];
        return [
          {
            reason: `Gap Closure Proceeding not uploaded; gap amount ${inr(amount)}`,
            documentKey: "Gap_Closure"
          }
        ];
      }
    },
    {
      id: "doc.condemned",
      category: "documents",
      label: "Condemned Certificate missing for a Dilapidated building",
      description: "The building is Dilapidated but its condemnation certificate is not uploaded.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [],
      action: "documents",
      check: (row) => dilapidated(row) && !hasDoc(row, "Condemned") ? [{ reason: "Condemned Certificate not uploaded for a Dilapidated building", documentKey: "Condemned" }] : []
    },
    {
      id: "doc.fire-noc",
      category: "documents",
      label: "Fire NOC document missing where a Fire NOC is recorded",
      description: "A Fire NOC record exists but the NOC file is not in the six tracked documents.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [],
      action: "documents",
      check: (row) => nocRecorded(row) && !hasDoc(row, "NOC") ? [{ reason: "Fire NOC document not uploaded though a Fire NOC is recorded", documentKey: "NOC" }] : []
    },
    /* ---------------------------- Not updated --------------------------- */
    {
      id: "not-updated.no-change",
      category: "not-updated",
      label: "No change recorded for N days",
      description: "The facility record has not changed for the threshold. Only applies when a last-change date is stored.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [{ key: "days", label: "Days without a change", unit: "days", default: 60, min: 7, max: 365 }],
      action: "overview",
      check: (row, ctx, setting) => {
        const since = isoDate(row.facility.lastChangedAt ?? row.facility.updatedAt ?? null);
        if (!since) return [];
        if (/archived/i.test(row.facility.currentStatus ?? "")) return [];
        const age = daysBetween(since, ctx.today);
        const limit = clampThreshold(setting, "days", 60);
        if (age == null || age < limit) return [];
        return [{ reason: `No change recorded for ${age} days (last updated ${dmy(since)})`, since }];
      }
    },
    {
      id: "not-updated.ia-quarter",
      category: "not-updated",
      label: "IA score missing for the latest completed quarter",
      description: "The latest completed quarter has no IA score and is not marked Not applicable. Certified facilities are out of scope.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [],
      action: "ia",
      check: (row, ctx) => {
        if (isCertified(row)) return [];
        if (!("latestIa" in row)) return [];
        const ia = row.latestIa;
        if (ia && (ia.notApplicable || ia.score != null)) return [];
        if (ia && (ia.fy !== ctx.latest.fy || ia.quarter !== ctx.latest.quarter)) return [];
        return [
          {
            reason: `IA score missing for ${ctx.latest.label} (latest completed quarter)`,
            since: ctx.latest.end
          }
        ];
      }
    },
    {
      id: "not-updated.saqsham",
      category: "not-updated",
      label: "SaQsham status unchanged while in the pipeline",
      description: "The portal status has not moved for the threshold while the facility is still pre-certification.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [{ key: "days", label: "Days without a SaQsham change", unit: "days", default: 45, min: 7, max: 365 }],
      action: "state",
      check: (row, ctx, setting) => {
        if (!isPipeline(row)) return [];
        const since = isoDate(row.facility.saqshamPortalUpdatedOn ?? null);
        if (!since) return [];
        const age = daysBetween(since, ctx.today);
        const limit = clampThreshold(setting, "days", 45);
        if (age == null || age < limit) return [];
        return [{ reason: `SaQsham status unchanged for ${age} days (last portal update ${dmy(since)})`, since }];
      }
    },
    /* ---------------------------- Pending work -------------------------- */
    {
      id: "pending.sa-scheduled-passed",
      category: "pending-work",
      label: "State Assessment scheduled date passed with no visit",
      description: "The scheduled date is in the past and no actual visit start is recorded.",
      defaultSeverity: "high",
      defaultEnabled: true,
      thresholds: [],
      action: "state",
      check: (row, ctx) => {
        const scheduled = row.sa?.revisedDate ?? row.sa?.scheduledDate ?? null;
        if (!scheduled || scheduled >= ctx.today) return [];
        if (row.sa?.actualStartDate || saCompleted(row)) return [];
        return [{ reason: `State Assessment scheduled for ${dmy(scheduled)} was not recorded as visited`, since: scheduled }];
      }
    },
    {
      id: "pending.nqas-scheduled-passed",
      category: "pending-work",
      label: "NQAS assessment scheduled date passed with no visit",
      description: "The NQAS scheduled start date is in the past and the assessment is not Completed.",
      defaultSeverity: "high",
      defaultEnabled: true,
      thresholds: [],
      action: "nqas",
      check: (row, ctx) => {
        const scheduled = row.nqas?.scheduledStartDate ?? null;
        if (!scheduled || scheduled >= ctx.today) return [];
        if (row.nqas?.actualEndDate || (row.nqas?.status ?? "").toLowerCase() === "completed") return [];
        return [{ reason: `NQAS assessment scheduled for ${dmy(scheduled)} was not recorded as visited`, since: scheduled }];
      }
    },
    {
      id: "pending.result-awaited",
      category: "pending-work",
      label: "Result awaited after the NQAS assessment",
      description: "The NQAS visit ended more than the threshold ago and no certification result is recorded.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [{ key: "days", label: "Days to wait for a result", unit: "days", default: 45, min: 7, max: 365 }],
      action: "nqas",
      check: (row, ctx, setting) => {
        if ((row.nqas?.status ?? "").toLowerCase() !== "completed") return [];
        if (certStatusOf(row)) return [];
        const end = row.nqas?.actualEndDate ?? null;
        if (!end) return [];
        const age = daysBetween(end, ctx.today);
        const limit = clampThreshold(setting, "days", 45);
        if (age == null || age <= limit) return [];
        return [{ reason: `Result awaited for ${age} days after the NQAS assessment ended on ${dmy(end)}`, since: end }];
      }
    },
    {
      id: "pending.sa-not-scheduled",
      category: "pending-work",
      label: "Eligible facility with no State Assessment scheduled",
      description: "Eligibility is Eligible, the facility is not certified, and neither a scheduled nor an actual SA date exists.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [],
      action: "state",
      check: (row) => {
        if ((row.facility.eligibility ?? "").toLowerCase() !== "eligible") return [];
        if (isCertified(row) || /not eligible|archived/i.test(row.facility.currentStatus ?? "")) return [];
        if (row.sa?.scheduledDate || row.sa?.actualStartDate || saCompleted(row)) return [];
        return [{ reason: "Eligible facility has no State Assessment scheduled", since: null }];
      }
    },
    {
      id: "pending.deferred-cooling",
      category: "pending-work",
      label: "Deferred facility cooling period ending soon",
      description: "The deferred re-take window is within the threshold, so the next SA can be planned.",
      defaultSeverity: "low",
      defaultEnabled: true,
      thresholds: [{ key: "days", label: "Days before the re-take window", unit: "days", default: 30, min: 1, max: 120 }],
      action: "nqas",
      check: (row, ctx, setting) => {
        const cooling = deferredRetakeCountdown(
          row.nqas ?? null,
          ctx.settings,
          ctx.today
        );
        if (!cooling) return [];
        const limit = clampThreshold(setting, "days", 30);
        if (cooling.daysLeft < 0 || cooling.daysLeft > limit) return [];
        return [
          {
            reason: `Deferred facility's cooling period ends on ${dmy(cooling.unlockDate)} (${cooling.daysLeft} days left)`,
            since: cooling.unlockDate
          }
        ];
      }
    },
    /* ---------------------- Certificate and surveillance --------------- */
    {
      id: "certificate.expired",
      category: "certificate-surveillance",
      label: "Certificate expired",
      description: "Certification validity is before today.",
      defaultSeverity: "high",
      defaultEnabled: true,
      thresholds: [],
      action: "nqas",
      check: (row, ctx) => {
        const validity = row.nqas?.validityDate ?? null;
        if (!validity || validity >= ctx.today) return [];
        const age = Math.abs(daysBetween(validity, ctx.today) ?? 0);
        return [{ reason: `Certificate expired on ${dmy(validity)} (${daysText(age)} ago)`, since: validity }];
      }
    },
    {
      id: "certificate.expiring",
      category: "certificate-surveillance",
      label: "Certificate expiring soon",
      description: "Certification validity is inside the forward window (default 90 days). Never an already-expired date.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [{ key: "days", label: "Expiring within (days)", unit: "days", default: 90, min: 7, max: 365 }],
      action: "nqas",
      check: (row, ctx, setting) => {
        const validity = row.nqas?.validityDate ?? null;
        if (!validity) return [];
        const left = daysBetween(ctx.today, validity);
        const limit = clampThreshold(setting, "days", 90);
        if (left == null || left < 0 || left > limit) return [];
        return [{ reason: `Certificate expires on ${dmy(validity)} (${daysText(left)} left)`, since: validity }];
      }
    },
    {
      id: "surveillance.overdue",
      category: "certificate-surveillance",
      label: "Surveillance overdue",
      description: "A surveillance due date passed and its Done date is missing. This is also the 'Done date missing after the due date' condition.",
      defaultSeverity: "high",
      defaultEnabled: true,
      thresholds: [],
      action: "surveillance",
      check: (row, ctx) => {
        const visits = surveillanceVisits(row.nqas ?? null, ctx.settings, ctx.today);
        return visits.filter((visit) => visit.state === "overdue").map((visit) => ({
          reason: `${visit.label} overdue since ${dmy(visit.due)} (${daysText(Math.abs(visit.days ?? 0))} late)`,
          since: visit.due,
          suffix: visit.key
        }));
      }
    },
    {
      id: "surveillance.due-soon",
      category: "certificate-surveillance",
      label: "Surveillance due soon",
      description: "A surveillance visit falls due inside the forward window (default 30 days).",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [{ key: "days", label: "Due within (days)", unit: "days", default: 30, min: 1, max: 180 }],
      action: "surveillance",
      check: (row, ctx, setting) => {
        const limit = clampThreshold(setting, "days", 30);
        return surveillanceVisits(row.nqas ?? null, ctx.settings, ctx.today).flatMap(
          (visit) => {
            if (!visit.due || visit.state === "done" || visit.state === "notApplicable") return [];
            const left = daysBetween(ctx.today, visit.due);
            if (left == null || left < 0 || left > limit) return [];
            return [
              {
                reason: `${visit.label} due on ${dmy(visit.due)} (${daysText(left)} left)`,
                since: visit.due,
                suffix: visit.key
              }
            ];
          }
        );
      }
    },
    /* -------------------------- Fire NOC / building -------------------- */
    {
      id: "noc.expired",
      category: "fire-building",
      label: "Fire NOC expired",
      description: "The Fire NOC validity date has passed.",
      defaultSeverity: "high",
      defaultEnabled: true,
      thresholds: [],
      action: "building",
      check: (row, ctx) => {
        const status = deriveFireNocStatus(row.noc?.nocAvailable ?? null, row.noc?.expiryDate ?? null, row.noc?.status ?? null, ctx.today);
        if (status !== "Expired") return [];
        const expiry = row.noc?.expiryDate ?? null;
        const age = expiry ? Math.abs(daysBetween(expiry, ctx.today) ?? 0) : 0;
        return [{ reason: `Fire NOC expired on ${dmy(expiry)}${expiry ? ` (${daysText(age)} ago)` : ""}`, since: expiry }];
      }
    },
    {
      id: "noc.expiring",
      category: "fire-building",
      label: "Fire NOC expiring soon",
      description: "The Fire NOC is inside the forward window (default 90 days).",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [{ key: "days", label: "Expiring within (days)", unit: "days", default: 90, min: 7, max: 365 }],
      action: "building",
      check: (row, ctx, setting) => {
        const expiry = row.noc?.expiryDate ?? null;
        if (!expiry) return [];
        const left = daysBetween(ctx.today, expiry);
        const limit = clampThreshold(setting, "days", 90);
        if (left == null || left < 0 || left > limit) return [];
        return [{ reason: `Fire NOC expires on ${dmy(expiry)} (${daysText(left)} left)`, since: expiry }];
      }
    },
    {
      id: "noc.not-recorded",
      category: "fire-building",
      label: "Fire NOC not recorded",
      description: "No Fire NOC record exists (or it states No NOC). Low: a missing record is a prompt, not a proven expiry.",
      defaultSeverity: "low",
      defaultEnabled: true,
      thresholds: [],
      action: "building",
      check: (row, ctx) => {
        if (row.noc) {
          if (row.noc.issuedDate) return [];
          const status = deriveFireNocStatus(
            row.noc.nocAvailable ?? null,
            row.noc.expiryDate ?? null,
            row.noc.status ?? null,
            ctx.today
          );
          if (status !== "Not Obtained" || row.noc.expiryDate) return [];
        }
        return [{ reason: "Fire NOC not recorded", since: null }];
      }
    },
    {
      id: "building.dilapidated",
      category: "fire-building",
      label: "Building Dilapidated",
      description: "The building status is Dilapidated.",
      defaultSeverity: "high",
      defaultEnabled: true,
      thresholds: [],
      action: "building",
      check: (row) => dilapidated(row) ? [{ reason: "Building is Dilapidated", since: null }] : []
    },
    /* ---------------------------- Data conflicts ----------------------- */
    {
      id: "data.surveillance-future",
      category: "data-conflicts",
      label: "Surveillance Done date in the future",
      description: "A stored Done date cannot be a real visit because it is after today.",
      defaultSeverity: "high",
      defaultEnabled: true,
      thresholds: [],
      action: "surveillance",
      check: (row, ctx) => {
        const visits = [
          { key: "surv1", label: "1st surveillance", done: row.nqas?.surveillanceDone1 ?? null },
          { key: "surv2", label: "2nd surveillance", done: row.nqas?.surveillanceDone2 ?? null }
        ];
        return visits.filter((visit) => !!visit.done && visit.done > ctx.today).map((visit) => ({
          reason: `${visit.label} Done date ${dmy(visit.done)} is in the future — fix it in Admin → Data checks → Surveillance dates`,
          since: visit.done,
          suffix: visit.key
        }));
      }
    },
    {
      id: "data.certified-no-date",
      category: "data-conflicts",
      label: "Certified without a date or score",
      description: "Certification status is certified but neither a certification/GoI date nor a score is recorded.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [],
      action: "nqas",
      check: (row) => {
        if (!isCertified(row)) return [];
        if (row.nqas?.certificationDate || row.nqas?.goiLetterDate) return [];
        if (row.nqas?.scorePercent != null) return [];
        return [{ reason: "Certified without a certification date or score", since: null }];
      }
    },
    {
      id: "data.nqas-completed-no-score",
      category: "data-conflicts",
      label: "NQAS assessment completed without a score",
      description: "The NQAS status is Completed but no score is stored.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [],
      action: "nqas",
      check: (row) => {
        if ((row.nqas?.status ?? "").toLowerCase() !== "completed") return [];
        if (row.nqas?.scorePercent != null) return [];
        return [
          {
            reason: "NQAS assessment completed without a score",
            since: row.nqas?.actualEndDate ?? null
          }
        ];
      }
    },
    {
      id: "data.certified-not-eligible",
      category: "data-conflicts",
      label: "Certified facility with a Not eligible status",
      description: "Eligibility says Not Eligible while the facility holds a certificate — the stronger fact wins.",
      defaultSeverity: "high",
      defaultEnabled: true,
      thresholds: [],
      action: "eligibility",
      check: (row) => isCertified(row) && /^not eligible$/i.test((row.facility.eligibility ?? "").trim()) ? [{ reason: 'Certified facility is marked "Not Eligible"', since: null }] : []
    },
    {
      id: "data.nin-missing",
      category: "data-conflicts",
      label: "NIN missing",
      description: "The NIN field is explicitly blank — the facility cannot be matched to the SaQsham portal.",
      defaultSeverity: "low",
      defaultEnabled: true,
      thresholds: [],
      action: "overview",
      check: (row) => {
        const nin = row.facility.ninNumber;
        if (nin == null) return [];
        if (String(nin).trim() !== "") return [];
        return [{ reason: "NIN is missing — the facility cannot be matched to the SaQsham portal", since: null }];
      }
    },
    {
      id: "data.noc-derived",
      category: "data-conflicts",
      label: "NOC Available is blank beside a Fire NOC record",
      description: "A Fire NOC record exists but its Available flag was never confirmed; the display derives Yes.",
      defaultSeverity: "low",
      defaultEnabled: true,
      thresholds: [],
      action: "building",
      check: (row) => {
        if (row.noc?.nocAvailable) return [];
        const hasRecord = !!row.noc && (!!row.noc.issuedDate || !!row.noc.expiryDate || !!row.noc.status);
        if (!hasRecord) return [];
        return [
          {
            reason: "NOC Available is blank but a Fire NOC record exists — confirm the flag in Quick View",
            since: row.noc?.issuedDate ?? null
          }
        ];
      }
    },
    {
      id: "data.noc-conflict",
      category: "data-conflicts",
      label: "NOC Available is No but NOC dates are recorded",
      description: "A contradictory record: the flag says No NOC, dates say otherwise.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [],
      action: "building",
      check: (row) => {
        if (row.noc?.nocAvailable !== "No") return [];
        if (!row.noc.issuedDate && !row.noc.expiryDate) return [];
        return [{ reason: 'NOC Available is "No" but NOC dates are recorded — confirm in Quick View', since: null }];
      }
    },
    {
      id: "data.sa-date-range",
      category: "data-conflicts",
      label: "State Assessment ended before it started",
      description: "The stored actual end date is earlier than the actual start date.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [],
      action: "state",
      check: (row) => {
        const start = row.sa?.actualStartDate ?? null;
        const end = row.sa?.actualEndDate ?? null;
        if (!start || !end || end >= start) return [];
        return [
          {
            reason: `State Assessment ended on ${dmy(end)}, before it started on ${dmy(start)}`,
            since: start
          }
        ];
      }
    },
    {
      id: "data.nqas-date-range",
      category: "data-conflicts",
      label: "NQAS assessment ended before its scheduled start",
      description: "The stored actual end date is earlier than the scheduled start date.",
      defaultSeverity: "medium",
      defaultEnabled: true,
      thresholds: [],
      action: "nqas",
      check: (row) => {
        const start = row.nqas?.scheduledStartDate ?? null;
        const end = row.nqas?.actualEndDate ?? null;
        if (!start || !end || end >= start) return [];
        return [
          {
            reason: `NQAS assessment ended on ${dmy(end)}, before its scheduled start on ${dmy(start)}`,
            since: start
          }
        ];
      }
    },
    {
      id: "data.surveillance-equals-due",
      category: "data-conflicts",
      label: "Surveillance Done date equals its due date",
      description: "A Done date must be the real visit date, not a copy of the deadline.",
      defaultSeverity: "low",
      defaultEnabled: true,
      thresholds: [],
      action: "surveillance",
      check: (row) => {
        const pairs = [
          { key: "surv1", label: "1st surveillance", due: row.nqas?.surveillanceDue1 ?? null, done: row.nqas?.surveillanceDone1 ?? null },
          { key: "surv2", label: "2nd surveillance", due: row.nqas?.surveillanceDue2 ?? null, done: row.nqas?.surveillanceDone2 ?? null }
        ];
        return pairs.filter((p) => !!p.done && !!p.due && p.done === p.due).map((p) => ({
          reason: `${p.label} Done date equals the due date — record the real visit date`,
          since: p.done,
          suffix: p.key
        }));
      }
    }
  ];
  Object.fromEntries(
    issueRules.map((rule) => [rule.id, rule])
  );
  function defaultPendingConfig() {
    return {
      rules: Object.fromEntries(
        issueRules.map((rule) => [
          rule.id,
          {
            enabled: rule.defaultEnabled,
            severity: rule.defaultSeverity,
            thresholds: Object.fromEntries(rule.thresholds.map((t) => [t.key, t.default]))
          }
        ])
      ),
      defaultFilters: ["block", "category", "severity", "status"]
    };
  }
  const DEFAULT_PENDING_CONFIG = defaultPendingConfig();
  function computePendingIssues(rows, options) {
    const config = options.config ?? DEFAULT_PENDING_CONFIG;
    const ctx = {
      today: options.today,
      documentRules: options.documentRules ?? DEFAULT_DOCUMENT_RULES,
      settings: { ...DEFAULT_SETTINGS, ...options.settings ?? {} },
      latest: latestCompletedQuarter(options.today)
    };
    const out = [];
    for (const row of rows) {
      const facilityId = String(row.facility._id);
      if (options.allowedFacilityIds && !options.allowedFacilityIds.has(facilityId)) continue;
      for (const rule of issueRules) {
        const setting = config.rules[rule.id] ?? {
          enabled: rule.defaultEnabled,
          severity: rule.defaultSeverity,
          thresholds: {}
        };
        if (!setting.enabled) continue;
        let drafts = [];
        try {
          drafts = rule.check(row, ctx, setting) ?? [];
        } catch {
          drafts = [];
        }
        for (const draft of drafts) {
          out.push({
            id: `${facilityId}:${rule.id}${draft.suffix ? `:${draft.suffix}` : ""}`,
            facilityId,
            facilityName: row.facility.name,
            block: row.facility.block,
            phc: row.facility.phc,
            facilityType: row.facility.facilityType,
            nin: row.facility.ninNumber ?? null,
            cycleNumber: row.cycleNumber ?? null,
            ruleId: rule.id,
            category: rule.category,
            severity: setting.severity,
            reason: draft.reason,
            since: draft.since ?? null,
            days: draft.since && /^\d{4}-\d{2}-\d{2}/.test(draft.since) ? daysBetween(draft.since.slice(0, 10), ctx.today) : null,
            action: rule.action,
            documentKey: draft.documentKey
          });
        }
      }
    }
    const rank = { high: 0, medium: 1, low: 2 };
    out.sort(
      (a, b) => rank[a.severity] - rank[b.severity] || (a.since ?? "9999").localeCompare(b.since ?? "9999") || a.facilityName.localeCompare(b.facilityName) || a.id.localeCompare(b.id)
    );
    return out;
  }

  self.onmessage = (event) => {
    try {
      const { rows, options } = event.data;
      const issues = computePendingIssues(rows, options);
      self.postMessage({ ok: true, issues });
    } catch (err) {
      self.postMessage({ ok: false, error: err instanceof Error ? err.message : "Could not compute issues" });
    }
  };

})();
