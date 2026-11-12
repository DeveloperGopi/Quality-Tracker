/**
 * LINKS ORGANISER IMPORT — pure parsing + review model.
 *
 * Accepts pasted TSV/CSV, HTML anchors, and Excel rows (including real
 * hyperlinks supplied by the workbook reader). It is deliberately split from
 * the React review so the same rules run in unit tests.
 *
 * No write happens here. Every row is classified New, Will change, No change,
 * Needs your decision, Link missing or Skipped. Unknown categories/owners are
 * suggested, never auto-applied.
 */

import {
  detectLinkType,
  normalizeLinkUrl,
  parseDateText,
  type LinkFrequencyOption,
  type LinkStatusDef,
  type LinkVisibility,
  DEFAULT_LINK_FREQUENCIES,
  DEFAULT_LINK_STATUSES,
} from "@/lib/links";
import { formatDateLong, isIsoDate } from "@/lib/dateInput";

export type LinkImportCell = string | number | Date | null | undefined | {
  text?: string;
  url?: string;
  hyperlink?: string;
};

export type LinkImportLink = {
  label: string;
  url: string;
  type: string;
  kind: "link" | "form";
  isPrimary: boolean;
};

export type LinkImportState =
  | "new"
  | "will-change"
  | "no-change"
  | "needs-decision"
  | "link-missing"
  | "skipped";

export type LinkImportRow = {
  rowNo: number;
  serial?: number;
  title: string;
  categoryName: string;
  ownerName: string;
  level: string;
  frequency: string;
  customDays?: number;
  lastUpdated: string;
  status: string;
  remarks: string;
  visibility: LinkVisibility;
  links: LinkImportLink[];
  state: LinkImportState;
  issues: string[];
  /** Uncertain values that need an explicit mapping choice. */
  decisions: {
    category?: string;
    owner?: string;
    frequency?: string;
    status?: string;
  };
  existingId?: string;
  mergeGroup?: string;
  duplicateUrl: boolean;
  linkMissing: boolean;
};

export type ExistingLink = {
  id: string;
  serial: number;
  title: string;
  categoryName: string;
  ownerName: string;
  level: string;
  frequency: string;
  lastUpdated: string;
  status: string;
  remarks: string;
  urls: { url: string; kind: string }[];
};

export type LinksImportOptions = {
  categories: string[];
  owners: string[];
  statuses?: readonly LinkStatusDef[];
  frequencies?: readonly LinkFrequencyOption[];
  existing?: ExistingLink[];
  today: string;
  updateMode?: boolean;
  defaultVisibility?: LinkVisibility;
};

export type LinksMatrix = LinkImportCell[][];

const HEADER_PATTERNS = {
  serial: [/^s\.?\s*no\.?$/i, /^serial$/i, /^sno$/i, /^#$/i],
  category: [/category/i, /^type$/i],
  title: [/report\s*name/i, /^report$/i, /^title$/i, /name of.*report/i],
  frequency: [/frequency/i, /^how often/i, /^cadence/i],
  lastUpdated: [/last\s*updated/i, /^updated/i, /^date$/i],
  link: [/^link$/i, /^url$/i, /report link/i, /^link\s*$/i],
  more: [/more\s*links?/i, /additional\s*links?/i],
  form: [/form\s*link/i, /^form$/i, /^form url/i],
  owner: [/owner/i, /^owned by/i, /^team/i],
  status: [/^status$/i, /^state$/i],
  remarks: [/remarks?/i, /notes?/i, /period/i],
} as const;

type Mapping = Record<keyof typeof HEADER_PATTERNS, number | null>;

export function parseLinksText(text: string): LinksMatrix {
  const normalized = text.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");
  const lines = normalized.split("\n").filter((line) => line.trim() !== "");
  if (!lines.length) return [];
  const delimiter = lines.some((line) => line.includes("\t"))
    ? "\t"
    : lines.some((line) => line.includes(","))
      ? ","
      : "\t";
  return lines.map((line) => parseDelimitedLine(line, delimiter));
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"' && current === "") {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

/** Parse clipboard HTML so a hyperlinked title keeps its URL. */
export function parseLinksHtml(html: string): LinksMatrix {
  if (typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) return [];
  const rows: LinksMatrix = [];
  for (const tr of Array.from(table.querySelectorAll("tr"))) {
    const cells: LinkImportCell[] = [];
    for (const cell of Array.from(tr.querySelectorAll("th,td"))) {
      const anchor = cell.querySelector("a[href]") as HTMLAnchorElement | null;
      const text = (cell.textContent ?? "").trim();
      if (anchor?.href) cells.push({ text, url: anchor.href });
      else cells.push(text);
    }
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function firstHeaderRow(rows: LinksMatrix): number {
  for (let i = 0; i < Math.min(12, rows.length); i += 1) {
    const filled = (rows[i] ?? []).filter((c) => cellText(c) !== "");
    if (filled.length >= 3) return i;
  }
  return 0;
}

function headerMap(headers: string[]): Mapping {
  const map = {} as Mapping;
  const used = new Set<number>();
  for (const [key, patterns] of Object.entries(HEADER_PATTERNS) as unknown as [
    keyof typeof HEADER_PATTERNS,
    RegExp[],
  ][]) {
    let hit = -1;
    for (let i = 0; i < headers.length; i += 1) {
      if (used.has(i)) continue;
      const header = headers[i].trim();
      if (!header) continue;
      if (patterns.some((p) => p.test(header))) {
        hit = i;
        break;
      }
    }
    map[key] = hit >= 0 ? hit : null;
    if (hit >= 0) used.add(hit);
  }
  // "Link" must not swallow "Form Link": if both matched the same column,
  // give the form the later one and keep the primary link earlier.
  if (map.link != null && map.form != null && map.link === map.form) {
    const idx = headers.findIndex((h, i) => i > map.link! && /form/i.test(h));
    map.form = idx >= 0 ? idx : null;
  }
  return map;
}

export function cellText(cell: LinkImportCell): string {
  if (cell == null) return "";
  if (typeof cell === "object" && !(cell instanceof Date)) {
    return String(cell.text ?? "").replace(/\s+/g, " ").trim();
  }
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell).replace(/\s+/g, " ").trim();
}

function cellUrl(cell: LinkImportCell): string {
  if (cell == null || typeof cell !== "object" || cell instanceof Date) return "";
  return String(cell.url ?? cell.hyperlink ?? "").trim();
}

/** Excel serial date → ISO, using Excel's 1899-12-30 epoch (leap bug included). */
export function excelSerialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 100000) return null;
  const ms = Math.round(serial) * 86400000 + Date.UTC(1899, 11, 30);
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

export function parseLinkDateCell(
  cell: LinkImportCell,
  today: string,
): { iso: string; error: string | null } {
  if (cell instanceof Date) {
    const iso = cell.toISOString().slice(0, 10);
    return { iso, error: iso > today ? `Last updated ${formatDateLong(iso)} is in the future` : null };
  }
  const raw = cellText(cell);
  if (!raw || raw === "-") return { iso: "", error: null };
  if (typeof cell === "number" || /^\d{5}(\.\d+)?$/.test(raw)) {
    const serial = typeof cell === "number" ? cell : Number(raw);
    const iso = excelSerialToIso(serial);
    if (!iso) return { iso: "", error: `Could not read the date “${raw}”` };
    return { iso, error: iso > today ? `Last updated ${formatDateLong(iso)} is in the future` : null };
  }
  const iso = parseDateText(raw);
  if (!iso) return { iso: "", error: `Could not read the date “${raw}” — use DD-MMM-YYYY or DD-MM-YYYY` };
  if (iso > today) return { iso, error: `Last updated ${formatDateLong(iso)} is in the future` };
  return { iso, error: null };
}

export function parseFrequencyText(
  raw: string,
): { value: string; customDays?: number; unknown: boolean } {
  const text = raw.toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  if (!text || text === "-" || text === "none") return { value: "one-time", unknown: false };
  const custom = text.match(/(?:every\s*)?(\d+)\s*days?/);
  if (custom) {
    const days = Number(custom[1]);
    return { value: "custom-days", customDays: days > 0 ? days : undefined, unknown: false };
  }
  const everyMonths = text.match(/every\s*(\d+)\s*months?/);
  if (everyMonths) {
    const n = Number(everyMonths[1]);
    if (n === 1) return { value: "monthly", unknown: false };
    if (n === 2) return { value: "every-2-months", unknown: false };
    if (n === 3) return { value: "quarterly", unknown: false };
    if (n === 6) return { value: "half-yearly", unknown: false };
    if (n === 12) return { value: "yearly", unknown: false };
    return { value: "custom-days", customDays: n * 30, unknown: true };
  }
  if (/3\s*months?\s*(once)?/.test(text) || /quarter/.test(text)) {
    return { value: "quarterly", unknown: false };
  }
  if (/2\s*months?/.test(text) || /bimonth|bi-month/.test(text)) {
    return { value: "every-2-months", unknown: false };
  }
  if (/half\s*[-\s]?year/.test(text) || /semi[-\s]?annual/.test(text)) {
    return { value: "half-yearly", unknown: false };
  }
  if (/week/.test(text)) return { value: "weekly", unknown: false };
  if (/month/.test(text)) return { value: "monthly", unknown: false };
  if (/year|annual/.test(text)) return { value: "yearly", unknown: false };
  if (/one[\s-]?time|once/.test(text)) return { value: "one-time", unknown: false };
  return { value: "monthly", unknown: true };
}

function comparable(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(datas|data|sheet|sheets|collection)\b/g, (m) => (m === "datas" ? "data" : m))
    .replace(/\s+/g, " ")
    .trim()
    .replace(/s$/, "");
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diag = temp;
    }
  }
  return prev[b.length];
}

export function suggestExisting(value: string, options: string[]): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const exact = options.find((o) => o.toLowerCase() === raw.toLowerCase());
  if (exact && exact !== raw) return exact;
  if (exact) return null;
  const target = comparable(raw);
  let best: { name: string; score: number } | null = null;
  for (const option of options) {
    const score = levenshtein(target, comparable(option));
    if (!best || score < best.score) best = { name: option, score };
  }
  if (!best) return null;
  const threshold = Math.max(2, Math.round(target.length * 0.28));
  return best.score <= threshold ? best.name : null;
}

function statusFor(raw: string, statuses: readonly LinkStatusDef[]): string {
  const match = statuses.find((s) => s.name.toLowerCase() === raw.trim().toLowerCase());
  return match?.name ?? statuses[0]?.name ?? "Active";
}

function appendLink(list: LinkImportLink[], link: LinkImportLink) {
  if (!link.url) return;
  if (list.some((l) => normalizeLinkUrl(l.url) === normalizeLinkUrl(link.url) && l.kind === link.kind)) {
    return;
  }
  list.push(link);
}

export function parseLinksMatrix(
  matrix: LinksMatrix,
  options: LinksImportOptions,
): { headers: string[]; mapping: Mapping; rows: LinkImportRow[] } {
  const headerRow = firstHeaderRow(matrix);
  const headers = (matrix[headerRow] ?? []).map((c) => cellText(c));
  const map = headerMap(headers);
  const statuses = options.statuses?.length ? options.statuses : DEFAULT_LINK_STATUSES;
  const frequencies = options.frequencies?.length ? options.frequencies : DEFAULT_LINK_FREQUENCIES;
  const existing = options.existing ?? [];
  const rows: LinkImportRow[] = [];

  for (let i = headerRow + 1; i < matrix.length; i += 1) {
    const raw = matrix[i] ?? [];
    const get = (key: keyof Mapping) => (map[key] == null ? undefined : raw[map[key]!]);
    const title = cellText(get("title"));
    if (!title) continue;
    const rowNo = i + 1;
    const issues: string[] = [];
    const decisions: LinkImportRow["decisions"] = {};
    const categoryRaw = cellText(get("category"));
    const ownerRaw = cellText(get("owner"));
    const statusRaw = cellText(get("status"));
    const frequencyRaw = cellText(get("frequency"));
    const remarks = cellText(get("remarks"));
    const serialRaw = cellText(get("serial"));
    const serial = /^\d+$/.test(serialRaw) ? Number(serialRaw) : undefined;

    // Category — exact, spelling suggestion, or a decision.
    let categoryName = categoryRaw || options.categories[0] || "Uncategorised";
    if (categoryRaw) {
      const exact = options.categories.find((c) => c.toLowerCase() === categoryRaw.toLowerCase());
      if (!exact) {
        const suggestion = suggestExisting(categoryRaw, options.categories);
        if (suggestion) {
          categoryName = categoryRaw;
          decisions.category = suggestion;
          issues.push(`Category “${categoryRaw}” not found — suggested “${suggestion}”`);
        } else {
          categoryName = categoryRaw;
          decisions.category = "__create__";
          issues.push(`Category “${categoryRaw}” is new — choose Create`);
        }
      } else {
        categoryName = exact;
      }
    }

    // Owner / level. The sheet's State Sheet and District Sheet are LEVELS.
    let ownerName = ownerRaw;
    let level = "";
    if (/^state\s*sheet$/i.test(ownerRaw)) {
      level = "State";
      ownerName = "";
      issues.push("Owner “State Sheet” looks like a level — suggested Level: State");
    } else if (/^district\s*sheet$/i.test(ownerRaw)) {
      level = "District";
      ownerName = "";
      issues.push("Owner “District Sheet” looks like a level — suggested Level: District");
    } else if (ownerRaw) {
      const exact = options.owners.find((o) => o.toLowerCase() === ownerRaw.toLowerCase());
      if (!exact) {
        const suggestion = suggestExisting(ownerRaw, options.owners);
        ownerName = ownerRaw;
        decisions.owner = suggestion ?? "__create__";
        issues.push(
          suggestion
            ? `Owner “${ownerRaw}” not found — suggested “${suggestion}”`
            : `Owner “${ownerRaw}” is new — choose Create`,
        );
      } else {
        ownerName = exact;
      }
    }

    const frequency = parseFrequencyText(frequencyRaw);
    if (frequency.unknown) {
      decisions.frequency = frequency.value;
      issues.push(`Frequency “${frequencyRaw}” is not recognised — choose one`);
    }

    const status = statusFor(statusRaw, statuses);
    const knownStatus = statuses.some((s) => s.name.toLowerCase() === statusRaw.toLowerCase());
    if (statusRaw && !knownStatus) {
      decisions.status = status;
      issues.push(`Status “${statusRaw}” is not recognised — choose one`);
    }

    const date = parseLinkDateCell(get("lastUpdated"), options.today);
    if (date.error) issues.push(date.error);

    const links: LinkImportLink[] = [];
    const addCell = (cell: LinkImportCell, kind: "link" | "form") => {
      const text = cellText(cell);
      const hyperlink = cellUrl(cell);
      const url = hyperlink || (/^https?:\/\//i.test(text) ? text : "");
      if (!url) {
        if (text && text !== "-" && !/^https?:\/\//i.test(text)) {
          issues.push(
            kind === "form"
              ? `Form link “${text.slice(0, 60)}” has no URL — paste it`
              : `Link “${text.slice(0, 60)}” has no URL — paste it`,
          );
        }
        return;
      }
      const normalized = normalizeLinkUrl(url);
      if (!/^https?:\/\//i.test(normalized)) {
        issues.push(`Link “${text || url}” is not an http(s) URL`);
        return;
      }
      appendLink(links, {
        label: text && !/^https?:\/\//i.test(text) ? text : "",
        url: normalized,
        type: detectLinkType(normalized, text),
        kind,
        isPrimary: false,
      });
    };
    addCell(get("link"), "link");
    const moreText = cellText(get("more"));
    if (moreText) {
      const urls = moreText.match(/https?:\/\/[^\s]+/gi) ?? [];
      for (const url of urls) addCell({ text: "", url }, "link");
    }
    addCell(get("form"), "form");

    // A URL already used by ANOTHER report is a duplicate; the same report
    // (title + category) simply re-imports as No change, never as a clash.
    const duplicateOwner = (url: string) =>
      existing.find(
        (candidate) =>
          candidate.urls.some((u) => normalizeLinkUrl(u.url) === normalizeLinkUrl(url)) &&
          !(
            candidate.title.trim().toLowerCase() === title.trim().toLowerCase() &&
            candidate.categoryName.toLowerCase() === categoryName.toLowerCase()
          ),
      );
    const firstDuplicate = links.find((link) => duplicateOwner(link.url));
    const duplicateUrl = !!firstDuplicate;
    if (firstDuplicate) {
      issues.push(`Same URL already in SaQsham: ${duplicateOwner(firstDuplicate.url)?.title ?? "another report"}`);
    }

    const linkMissing =
      !links.some((l) => l.kind === "link") &&
      cellText(get("link")) !== "" &&
      cellText(get("link")) !== "-";
    const hasBlocking = issues.some(
      (issue) =>
        issue.includes("is in the future") ||
        issue.includes("Could not read the date") ||
        issue.includes("is not an http") ||
        issue.includes("no URL"),
    );
    const needsDecision = Object.keys(decisions).length > 0;

    let state: LinkImportState = "new";
    if (hasBlocking && linkMissing) state = "link-missing";
    else if (hasBlocking || needsDecision) state = "needs-decision";

    // Match by serial ONLY when update mode is chosen; otherwise exact
    // title + category + content is the idempotency check.
    const existingMatch = options.updateMode
      ? existing.find(
          (e) =>
            (serial != null && e.serial === serial) ||
            (e.title.trim().toLowerCase() === title.trim().toLowerCase() &&
              e.categoryName.toLowerCase() === categoryName.toLowerCase()),
        )
      : existing.find(
          (e) =>
            e.title.trim().toLowerCase() === title.trim().toLowerCase() &&
            e.categoryName.toLowerCase() === categoryName.toLowerCase() &&
            e.lastUpdated === date.iso &&
            e.status.toLowerCase() === status.toLowerCase() &&
            e.frequency === frequency.value &&
            e.urls.length === links.length &&
            e.urls.every((u) =>
              links.some((l) => normalizeLinkUrl(l.url) === normalizeLinkUrl(u.url)),
            ),
        );

    if (state === "new") {
      if (existingMatch) {
        const identical =
          existingMatch.title.trim().toLowerCase() === title.trim().toLowerCase() &&
          existingMatch.categoryName.toLowerCase() === categoryName.toLowerCase() &&
          existingMatch.lastUpdated === date.iso &&
          existingMatch.status.toLowerCase() === status.toLowerCase() &&
          existingMatch.frequency === frequency.value &&
          existingMatch.urls.length === links.length &&
          existingMatch.urls.every((u) =>
            links.some((l) => normalizeLinkUrl(l.url) === normalizeLinkUrl(u.url)),
          );
        state = identical ? "no-change" : existingMatch ? "will-change" : "new";
      }
    }

    // Primary: first web link, otherwise first form link.
    const primary = links.find((l) => l.kind === "link") ?? links[0];
    for (const link of links) link.isPrimary = link === primary;

    rows.push({
      rowNo,
      serial,
      title,
      categoryName,
      ownerName,
      level,
      frequency: frequency.value,
      customDays: frequency.customDays,
      lastUpdated: date.iso,
      status,
      remarks,
      visibility: options.defaultVisibility ?? "everyone",
      links,
      state: state === "new" && needsDecision ? "needs-decision" : state,
      issues,
      decisions,
      existingId: existingMatch?.id,
      duplicateUrl,
      linkMissing,
      mergeGroup:
        links.length > 0
          ? `${categoryName.trim().toLowerCase()}::${title.trim().toLowerCase()}`
          : undefined,
    });
  }

  // Same report name + category in one paste = offer the one-click merge.
  const groups = new Map<string, LinkImportRow[]>();
  for (const row of rows) {
    if (!row.mergeGroup) continue;
    const list = groups.get(row.mergeGroup) ?? [];
    list.push(row);
    groups.set(row.mergeGroup, list);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    for (const row of list) {
      row.issues.push(
        `Same report name and category in this paste (${list.length} rows) — merge into one report with ${list.length} links?`,
      );
    }
  }

  return { headers, mapping: map, rows };
}

/** Merge selected duplicate rows into a single report with all their links. */
export function mergeLinkImportRows(rows: LinkImportRow[]): LinkImportRow {
  const first = rows[0];
  const links: LinkImportLink[] = [];
  for (const row of rows) for (const link of row.links) appendLink(links, link);
  const primary = links.find((l) => l.kind === "link") ?? links[0];
  for (const link of links) link.isPrimary = link === primary;
  return {
    ...first,
    rowNo: first.rowNo,
    links,
    issues: first.issues.filter((i) => !i.includes("merge into one report")),
    mergeGroup: undefined,
    state: first.state === "no-change" ? "new" : first.state,
  };
}

export type LinksImportSummary = {
  new: number;
  willChange: number;
  noChange: number;
  needsDecision: number;
  linkMissing: number;
  skipped: number;
};

export function summarizeLinksImport(rows: LinkImportRow[]): LinksImportSummary {
  const summary = {
    new: 0,
    willChange: 0,
    noChange: 0,
    needsDecision: 0,
    linkMissing: 0,
    skipped: 0,
  };
  for (const row of rows) {
    if (row.state === "new") summary.new += 1;
    else if (row.state === "will-change") summary.willChange += 1;
    else if (row.state === "no-change") summary.noChange += 1;
    else if (row.state === "needs-decision") summary.needsDecision += 1;
    else if (row.state === "link-missing") summary.linkMissing += 1;
    else summary.skipped += 1;
  }
  return summary;
}

/** Only rows with a report name, a safe link and no unresolved choice apply. */
export function rowsReadyToApply(rows: LinkImportRow[]): LinkImportRow[] {
  return rows.filter(
    (row) =>
      row.title.trim() !== "" &&
      (row.state === "new" || row.state === "will-change") &&
      Object.keys(row.decisions).length === 0 &&
      row.links.length > 0,
  );
}

/** ISO check helper used by the importer UI for date errors. */
export function isFutureDate(iso: string, today: string): boolean {
  return isIsoDate(iso) && iso > today;
}
