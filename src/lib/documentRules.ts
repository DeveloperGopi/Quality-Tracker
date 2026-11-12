/**
 * DOCUMENT REQUIREMENT RULES — the ONE config the Admin → Documents tab edits
 * and every screen reads (Part C).
 *
 * Before this file the requirement lived in three places that could disagree:
 *   • `validation.ts` (`requiredForCertified`), which drove the upload checks,
 *   • `facilityProfileRules.validateNqasDraft`, which blocked the NQAS save,
 *   • the field label in the profile, which printed "Optional" for the same
 *     field. That is exactly the screenshot bug: the badge said "Optional"
 *     while the rule blocked saving and the error was shown twice.
 *
 * Now one rule per document decides the badge text, the blocking behaviour,
 * the counts and the Needs-attention flag, and the Admin tab writes the rules
 * into `appSettings.documentRules` (audited by `setSetting`, applied instantly
 * because every screen subscribes to the same settings).
 *
 * Pure module — no Convex imports — so it runs in the browser and in tests.
 */

import { ACTIVE_DOC_TYPES, type DocKey } from "../convex/storage/validation";

/** Mandatory | Optional | Required when… */
export type DocRuleMode = "mandatory" | "optional" | "conditional";

/** The rule picker's conditions (Part C ①). */
export type DocCondition = "certified" | "gap_amount" | "dilapidated" | "fire_noc";

/** Cycle scope: the file is per certification cycle (default) or per facility. */
export type DocRuleScope = "cycle" | "facility";

export type DocRule = {
  mode: DocRuleMode;
  /** Only read when `mode === "conditional"`. */
  condition: DocCondition;
  /** Blocking = saving is refused; otherwise the missing file is a warning. */
  blocking: boolean;
  scope: DocRuleScope;
};

export type DocumentRules = Record<string, DocRule>;

export const CONDITION_LABELS: Record<DocCondition, string> = {
  certified: "certification status is certified or conditional",
  gap_amount: "Gap Closure Amount exists",
  dilapidated: "building is Dilapidated",
  fire_noc: "Fire NOC recorded",
};

/** Short form for the badge: "Required: certified". */
export const CONDITION_SHORT: Record<DocCondition, string> = {
  certified: "certified",
  gap_amount: "gap closure amount",
  dilapidated: "dilapidated building",
  fire_noc: "Fire NOC recorded",
};

const DEFAULT_RULE: DocRule = {
  mode: "optional",
  condition: "certified",
  blocking: false,
  scope: "cycle",
};

/** Part C ① defaults: NQAS Certified Result = required when certified
 *  (blocking); SA Report, SA Checklist, Gap Closure, Condemned, NOC = Optional. */
export function defaultDocumentRules(): DocumentRules {
  const out: DocumentRules = {};
  for (const type of ACTIVE_DOC_TYPES) {
    out[type.key] =
      type.key === "NQAS_Result"
        ? { mode: "conditional", condition: "certified", blocking: true, scope: "cycle" }
        : { ...DEFAULT_RULE };
  }
  return out;
}

export const DEFAULT_DOCUMENT_RULES: DocumentRules = defaultDocumentRules();

const MODES: DocRuleMode[] = ["mandatory", "optional", "conditional"];
const CONDITIONS: DocCondition[] = ["certified", "gap_amount", "dilapidated", "fire_noc"];

/** Coerce whatever was stored (older key, partial write, null) into a
 *  complete rule set — every document always has a rule. */
export function normalizeDocumentRules(raw: unknown): DocumentRules {
  const base = defaultDocumentRules();
  if (!raw || typeof raw !== "object") return base;
  const stored = raw as Record<string, unknown>;
  for (const key of Object.keys(base)) {
    const value = stored[key];
    if (!value || typeof value !== "object") continue;
    const r = value as Record<string, unknown>;
    const mode = MODES.includes(r.mode as DocRuleMode) ? (r.mode as DocRuleMode) : base[key].mode;
    const condition = CONDITIONS.includes(r.condition as DocCondition)
      ? (r.condition as DocCondition)
      : base[key].condition;
    base[key] = {
      mode,
      condition,
      blocking: typeof r.blocking === "boolean" ? r.blocking : mode !== "optional",
      scope: r.scope === "facility" ? "facility" : "cycle",
    };
  }
  return base;
}

/** The facility facts the conditions are evaluated against. */
export type DocContext = {
  /** nationalAssessments.certificationStatus of the cycle. */
  certStatus?: string | null;
  /** gapClosureFunds.amountSanctioned > 0. */
  gapAmount?: number | null;
  /** buildingDetails.buildingStatus === "Dilapidated". */
  dilapidated?: boolean;
  /** A Fire NOC row exists for the facility (any status but Not Obtained). */
  fireNocRecorded?: boolean;
};

/** "Quality Certified" / "Quality Certified with Conditionality" → required. */
export function isCertifiedOrConditional(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s.includes("quality certified") || s.includes("with conditionality");
}

export type DocRequirement = {
  /** The document must be present for this facility right now. */
  required: boolean;
  /** A missing file blocks saving (only meaningful when `required`). */
  blocking: boolean;
  /** The badge text — always agrees with `required`. */
  badge: string;
  /** Why it is required, in one sentence (null when optional). */
  reason: string | null;
  rule: DocRule;
};

export function conditionMet(condition: DocCondition, ctx: DocContext): boolean {
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

/** Resolve one document's requirement for one facility. */
export function resolveDocRequirement(rule: DocRule, ctx: DocContext): DocRequirement {
  if (rule.mode === "mandatory") {
    return {
      required: true,
      blocking: rule.blocking,
      badge: "Required",
      reason: "This document is mandatory for every facility.",
      rule,
    };
  }
  if (rule.mode === "conditional" && conditionMet(rule.condition, ctx)) {
    return {
      required: true,
      blocking: rule.blocking,
      badge: `Required: ${CONDITION_SHORT[rule.condition]}`,
      reason: `Required because ${CONDITION_LABELS[rule.condition]}.`,
      rule,
    };
  }
  return { required: false, blocking: false, badge: "Optional", reason: null, rule };
}

/** Resolve every document at once (the shape the documents query returns). */
export function resolveDocumentRequirements(
  rules: DocumentRules,
  ctx: DocContext,
): Record<string, DocRequirement> {
  const out: Record<string, DocRequirement> = {};
  for (const type of ACTIVE_DOC_TYPES) {
    out[type.key] = resolveDocRequirement(rules[type.key] ?? DEFAULT_RULE, ctx);
  }
  return out;
}

/**
 * ONE list of "required document missing" items — the warning EVERY surface
 * prints reads this (the Documents banner, the Overview card, the Quick View
 * header, the Save bar, the stepper, the section nav, Needs attention, the
 * bell/sidebar badge, the Master List Documents cell and the facility sheet).
 *
 * `facts` is the facility's current state (the same DocContext the server
 * resolves with) plus the document keys actually present. Pure: no React, no
 * Convex — so a test can pin the wording and the browser and the server can
 * never disagree about WHICH file is missing.
 */
export type RequiredDocumentIssue = {
  key: DocKey;
  label: string;
  /** The missing file blocks saving (Admin → Documents → Blocking). */
  blocking: boolean;
  /** "Required" or "Required: certified" — one badge, never two. */
  badge: string;
  /** Why it is required (“Required because …”). */
  reason: string | null;
  rule: DocRule;
  /** The one sentence every surface shows, so the wording cannot drift. */
  message: string;
};

export type RequiredDocumentFacts = DocContext & {
  /** Document keys present for this facility (a legacy NQAS_Certificate row
   *  IS the NQAS Result — one document, whatever key stored it). */
  presentKeys?: readonly string[] | null;
};

export function requiredDocumentIssues(
  facts: RequiredDocumentFacts,
  rules: DocumentRules = DEFAULT_DOCUMENT_RULES,
): RequiredDocumentIssue[] {
  const present = new Set(facts.presentKeys ?? []);
  const requirements = resolveDocumentRequirements(rules, facts);
  const out: RequiredDocumentIssue[] = [];
  for (const type of ACTIVE_DOC_TYPES) {
    const requirement = requirements[type.key];
    if (!requirement.required) continue;
    const alias = type.key === "NQAS_Result" ? "NQAS_Certificate" : null;
    if (present.has(type.key) || (alias && present.has(alias))) continue;
    out.push({
      key: type.key,
      label: type.label,
      blocking: requirement.blocking,
      badge: requirement.badge,
      reason: requirement.reason,
      rule: requirement.rule,
      message: requirement.blocking
        ? `${type.label} is required for this facility; saving the NQAS assessment is blocked until it is uploaded.`
        : `${type.label} is required for this facility under the current document rules.`,
    });
  }
  return out;
}

/** Keys whose missing file blocks a NQAS save (Part C ②). */
export function blockingDocumentKeys(
  rules: DocumentRules,
  ctx: DocContext,
): DocKey[] {
  return ACTIVE_DOC_TYPES.filter(
    (t) => resolveDocRequirement(rules[t.key] ?? DEFAULT_RULE, ctx).required &&
      resolveDocRequirement(rules[t.key] ?? DEFAULT_RULE, ctx).blocking,
  ).map((t) => t.key);
}

/** The one sentence a missing required document shows — used by the form, the
 *  panel and Needs attention, so the wording can never drift. */
export function missingDocumentMessage(label: string, req: DocRequirement): string {
  const why = req.reason ? ` ${req.reason}` : "";
  return `${label} must be uploaded under Documents.${why}`;
}
