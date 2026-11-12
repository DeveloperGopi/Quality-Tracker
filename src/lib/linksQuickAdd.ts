/**
 * LINKS QUICK-ADD — pure parsing and suggestions for paste-to-add.
 *
 * Nothing here saves. The page creates a visible draft, offers suggestions as
 * chips, and only writes after the editor confirms. A URL pasted at 10:00 must
 * produce a draft immediately, so the only async part (the page title) runs
 * after the draft exists and never blocks it.
 */

import {
  detectLinkType,
  frequencyLabel,
  linkDomain,
  looksLikeUrl,
  normalizeLinkUrl,
  type LinkTableColumn,
  type LinksConfig,
  LINK_TABLE_ALL_COLUMNS,
} from "./links";

export type PastedLink = {
  url: string;
  /** Text pasted beside the URL (a line or a tab-separated title). */
  pastedTitle: string | null;
  type: string;
};

export function parsePastedLink(value: string): PastedLink | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const tokens = text.split(/\s+/);
  const rawUrl = tokens.find((token) => looksLikeUrl(token.replace(/[),.;]+$/, "")));
  if (!rawUrl) return null;
  const url = normalizeLinkUrl(rawUrl.replace(/[),.;]+$/, ""));
  if (!url) return null;
  const title = text
    .replace(rawUrl, " ")
    .split(/[\n\t]+/)
    .map((part) => part.trim())
    .filter((part) => part && !looksLikeUrl(part))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    url,
    pastedTitle: title || null,
    type: detectLinkType(url),
  };
}

/** Human words from a URL path, never a Drive/file id or tracking query. */
export function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const type = detectLinkType(url);
    const segments = parsed.pathname
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .filter(Boolean)
      .filter((segment) => !/^[A-Za-z0-9_-]{16,}$/.test(segment));
    const last = segments[segments.length - 1] ?? "";
    const words = last
      .replace(/\.(pdf|xlsx?|csv|docx?|pptx?)$/i, "")
      .replace(/[_+]+/g, " ")
      .replace(/-+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (words.length >= 3 && !/^(edit|view|preview|pubhtml|htmlview)$/i.test(words)) {
      return words.replace(/\b\w/g, (char) => char.toUpperCase()).slice(0, 160);
    }
    const label =
      type === "sheet"
        ? "Google Sheet"
        : type === "doc"
          ? "Google Doc"
          : type === "form"
            ? "Google Form"
            : type === "drive"
              ? "Drive file"
              : type === "pdf"
                ? "PDF"
                : linkDomain(url) || "Link";
    return label;
  } catch {
    return "Link";
  }
}

export type QuickSuggestions = {
  categoryName: string | null;
  ownerName: string | null;
  level: string | null;
  frequency: string | null;
  title: string;
  reasons: string[];
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "of",
  "in",
  "on",
  "to",
  "a",
  "an",
  "report",
  "portal",
  "sheet",
  "data",
]);

function words(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function top<T>(scores: Map<T, number>): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const [key, score] of scores) {
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}

function bump<T>(scores: Map<T, number>, key: T | null | undefined, amount = 1) {
  if (key == null || key === "") return;
  scores.set(key, (scores.get(key) ?? 0) + amount);
}

/**
 * Same domain or title words vote for category/owner/level/frequency. A
 * Completed quarter report votes for the same values and can be rolled
 * forward separately; suggestions are never applied by this function.
 */
export function quickSuggestions(input: {
  url: string;
  title: string;
  items: readonly {
    title: string;
    categoryName: string;
    ownerName: string | null;
    level: string | null;
    frequency: string;
    urls: readonly { url: string }[];
  }[];
  config: LinksConfig;
  fallbackCategory?: string | null;
}): QuickSuggestions {
  const domain = linkDomain(input.url);
  const titleWords = new Set(words(input.title));
  const categories = new Map<string, number>();
  const owners = new Map<string, number>();
  const levels = new Map<string, number>();
  const frequencies = new Map<string, number>();
  let matches = 0;
  for (const item of input.items) {
    const sameDomain = item.urls.some((link) => linkDomain(link.url) === domain);
    const overlap = words(item.title).filter((word) => titleWords.has(word)).length;
    if (!sameDomain && overlap === 0) continue;
    matches += 1;
    const amount = sameDomain ? 3 : Math.min(2, overlap);
    bump(categories, item.categoryName, amount);
    bump(owners, item.ownerName, amount);
    bump(levels, item.level, amount);
    bump(frequencies, item.frequency, amount);
  }
  const title = input.title.toLowerCase();
  let cueFrequency: string | null = null;
  if (/\b(q[1-4]|quarter(ly)?)\b/i.test(title)) cueFrequency = "quarterly";
  else if (/\bmonth(ly)?\b/i.test(title)) cueFrequency = "monthly";
  else if (/\b(year|yearly|annual|annually)\b/i.test(title)) cueFrequency = "yearly";
  else if (/\bweek(ly)?\b/i.test(title)) cueFrequency = "weekly";
  else if (/\bhalf[- ]?year(ly)?\b/i.test(title)) cueFrequency = "half-yearly";
  const reasons: string[] = [];
  if (domain) reasons.push(`Same domain: ${domain}`);
  if (matches) reasons.push(`${matches} similar row${matches === 1 ? "" : "s"}`);
  if (cueFrequency) reasons.push(`Title cue: ${frequencyLabel(input.config, cueFrequency)}`);
  return {
    categoryName: top(categories) ?? input.fallbackCategory ?? null,
    ownerName: top(owners),
    level: top(levels),
    frequency: cueFrequency ?? top(frequencies) ?? "one-time",
    title: input.title.trim() || titleFromUrl(input.url),
    reasons,
  };
}

/** Optional columns are always available; this just labels the menu. */
export function columnMenu(columns: readonly LinkTableColumn[] = LINK_TABLE_ALL_COLUMNS) {
  return columns.filter((column) => column.key !== "actions");
}

/** Duplicate groups: exact title, normalised URL, or a title with only a
 * generic suffix added (“SaQsham” vs “SaQsham Portal”). */
export function duplicateGroups<
  T extends { id: string; title: string; urls: readonly { url: string }[] },
>(items: readonly T[]): T[][] {
  const keyTitle = (title: string) =>
    words(title).join(" ") || title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const byKey = new Map<string, T[]>();
  const add = (key: string, item: T) => {
    const list = byKey.get(key) ?? [];
    if (!list.some((candidate) => candidate.id === item.id)) list.push(item);
    byKey.set(key, list);
  };
  for (const item of items) {
    add(`t:${keyTitle(item.title)}`, item);
    for (const link of item.urls) {
      const normalized = normalizeLinkUrl(link.url).replace(/\/$/, "").toLowerCase();
      if (normalized) add(`u:${normalized}`, item);
    }
  }
  const seen = new Set<string>();
  const groups: T[][] = [];
  for (const list of byKey.values()) {
    if (list.length < 2) continue;
    const signature = list
      .map((item) => item.id)
      .sort()
      .join("|");
    if (seen.has(signature)) continue;
    seen.add(signature);
    groups.push(list);
  }
  return groups;
}
