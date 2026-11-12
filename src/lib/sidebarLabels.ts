/**
 * SIDEBAR LABELS — the only strings the sidebar renders, in the app's two UI
 * languages (English and Tamil).
 *
 * Nav labels are drawn on ONE 44px line with an ellipsis, so every label must
 * stay short: `SIDEBAR_LABEL_MAX` (24 characters) is the budget. The budget is
 * checked at build time by `scripts/checkSidebarLabels.ts` (a warning, not a
 * hard failure) and pinned by `scripts/sidebarLabels.test.ts`.
 *
 * Length is counted in code points (`[...label].length`), so Tamil vowel signs
 * and other combining marks count as the characters a reader sees, not UTF-16
 * surrogate halves.
 *
 * Wrapping copy (the product subtitle, the user's name, role and email) is
 * deliberately NOT in this catalogue — those grow to as many lines as needed.
 */

export const SIDEBAR_LANGUAGES = ["en", "ta"] as const;
export type SidebarLanguage = (typeof SIDEBAR_LANGUAGES)[number];

/** One-line nav labels must not exceed this many characters. */
export const SIDEBAR_LABEL_MAX = 24;

export const SIDEBAR_LABELS = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.facilities": "Facility Master List",
    "nav.reports": "Reports & Export",
    "nav.summary": "NQAS Summary Report",
    "nav.systemMap": "System Map",
    "nav.customReport": "Custom Report Builder",
    "nav.generatePpt": "Generate PPT",
    "nav.pending": "Pending & Follow-up",
    "nav.blockCompare": "Block Compare",
    "nav.links": "Links Organiser",
    "nav.documents": "Documents",
    "nav.guide": "Admin Guide",
    "nav.bulkImport": "Bulk Import",
    "nav.admin": "Admin Settings",
    "group.main": "Main",
    "group.facilityData": "Facility Data",
    "group.tools": "Tools",
    "group.data": "Data",
    "group.admin": "Admin",
    "category.stateAssessment": "State Assessment",
    "category.nqasCertification": "NQAS Certification",
    "category.recertification": "Recertification",
    "category.internalAssessment": "Internal Assessment",
    "category.gapClosureFund": "Gap Closure Fund",
    "category.building": "Building",
    "category.fireNoc": "Fire NOC",
  },
  ta: {
    "nav.dashboard": "டாஷ்போர்டு",
    "nav.facilities": "நிலையங்கள் பட்டியல்",
    "nav.reports": "அறிக்கை & ஏற்றுமதி",
    "nav.summary": "NQAS சுருக்க அறிக்கை",
    "nav.systemMap": "அமைப்பு வரைபடம்",
    "nav.customReport": "தனிப்பயன் அறிக்கை",
    "nav.generatePpt": "PPT உருவாக்கம்",
    "nav.pending": "நிலுவை & பின்தொடர்வு",
    "nav.blockCompare": "தொகுதி ஒப்பீடு",
    "nav.links": "இணைப்பு பட்டியல்",
    "nav.documents": "ஆவணங்கள்",
    "nav.guide": "நிர்வாக வழிகாட்டி",
    "nav.bulkImport": "மொத்த இறக்குமதி",
    "nav.admin": "நிர்வாக அமைப்புகள்",
    "group.main": "முதன்மை",
    "group.facilityData": "நிலைய விவரங்கள்",
    "group.tools": "கருவிகள்",
    "group.data": "தரவு",
    "group.admin": "நிர்வாகம்",
    "category.stateAssessment": "மாநில மதிப்பீடு",
    "category.nqasCertification": "NQAS சான்றிதழ்",
    "category.recertification": "மறு சான்றிதழ்",
    "category.internalAssessment": "உள் மதிப்பீடு",
    "category.gapClosureFund": "இடைவெளி நிதி",
    "category.building": "கட்டிடம்",
    "category.fireNoc": "தீ அனுமதி",
  },
} as const satisfies Record<SidebarLanguage, Record<string, string>>;

export type SidebarLabelKey = keyof (typeof SIDEBAR_LABELS)["en"];

/** The app currently renders English; a locale switch only swaps this call. */
export function sidebarLabel(
  key: SidebarLabelKey,
  lang: SidebarLanguage = "en",
): string {
  return SIDEBAR_LABELS[lang][key] ?? SIDEBAR_LABELS.en[key];
}

export type SidebarLabelLengthIssue = {
  lang: SidebarLanguage;
  key: SidebarLabelKey;
  label: string;
  length: number;
  max: number;
};

/** Code-point length (what the reader sees), never UTF-16 units. */
export function sidebarLabelLength(label: string): number {
  return [...label].length;
}

/** Over-budget labels in one language table (exported for the checker/tests). */
export function findOverlongLabels(
  table: Partial<Record<SidebarLabelKey, string>>,
  lang: SidebarLanguage,
  max: number = SIDEBAR_LABEL_MAX,
): SidebarLabelLengthIssue[] {
  const issues: SidebarLabelLengthIssue[] = [];
  for (const key of Object.keys(table) as SidebarLabelKey[]) {
    const label = table[key];
    if (label == null) continue;
    const length = sidebarLabelLength(label);
    if (length > max) issues.push({ lang, key, label, length, max });
  }
  return issues;
}

/** Every label over budget, in every language. Empty = all good. */
export function checkSidebarLabelLengths(
  max: number = SIDEBAR_LABEL_MAX,
): SidebarLabelLengthIssue[] {
  return SIDEBAR_LANGUAGES.flatMap((lang) =>
    findOverlongLabels(SIDEBAR_LABELS[lang], lang, max),
  );
}
