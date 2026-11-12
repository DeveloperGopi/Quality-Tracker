/**
 * UNIVERSAL FILTER BAR — ONE filter surface for every page (Part 1).
 *
 *   [ chips… ]  [ + Filter ]  [ Clear all ]  [ ⋯ Save as view · Reset · Match all/any ]
 *
 * Rules, everywhere:
 *   • A filter with no value is a quiet button: "Block ▾" — never "Block: All".
 *     An applied filter is a chip "Block: Alangayam, DMS ✕"; the ✕ clears the
 *     value only and leaves the control in the bar.
 *   • Hiding a control is deliberate: its own menu → "Hide this filter", with
 *     Undo and the "Hidden filters" list inside + Filter. Backspace/Delete on a
 *     focused chip hides it (with Undo), never silently drops a value.
 *   • "+ Filter" adds any `filterable` field: "On this page" first, then the
 *     rest, then the special filters. Picking a field already in the bar
 *     re-opens that chip.
 *   • Which fields sit in the bar is saved per user per page; VALUES live in
 *     the URL (the page owns that part) so links stay shareable.
 *   • Nothing checked = all; one Clear; live counts; AA contrast; status never
 *     by colour alone; `aria-live` counter.
 *
 * Everything is pure where it can be (`filterChipLabel`, `rowPasses`,
 * `operatorsFor`) so the tests read the same code the UI does.
 */

import * as React from "react";
import { useSearchParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import {
  Bookmark,
  Check,
  ChevronDown,
  FilterX,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  SHARED_FILTERS_KEY,
  loadLastFilter,
  loadMyFilters,
  makeSavedFilter,
  saveMyFilters,
  setLastFilter,
  sharedFiltersFor,
  type SavedFilter,
} from "@/lib/savedFilters";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Model                                                                       */
/* -------------------------------------------------------------------------- */

export type FilterFieldType =
  | "text"
  | "select"
  | "choice"
  | "number"
  | "date"
  | "boolean"
  | "user"
  | "document";

export type FilterOperator =
  | "contains"
  | "is"
  | "is_not"
  | "starts_with"
  | "is_empty"
  | "not_empty"
  | "in"
  | "none_of"
  | "equals"
  | "gt"
  | "lt"
  | "between"
  | "before"
  | "after"
  | "last_n_days"
  | "next_n_days"
  | "is_true"
  | "is_false"
  | "uploaded"
  | "missing"
  | "required_missing";

export type FilterField = {
  key: string;
  label: string;
  type: FilterFieldType;
  /** Field group for the "+ Filter" list ("Identity", "Certification", …). */
  group?: string;
  /** Shown first, under "On this page". */
  onThisPage?: boolean;
  /** Special filters (Certification Cycle, Last updated, Needs attention…). */
  special?: boolean;
  options?: { value: string; label?: string; count?: number }[];
};

export type ActiveFilter = { key: string; op: FilterOperator; values: string[] };

export type BarValue = {
  /** The filters sitting in the bar as chips (defaults included). */
  barKeys: string[];
  /** Their values — a bar key with no entry reads "All". */
  filters: ActiveFilter[];
  match: "all" | "any";
};

export const OPERATORS_BY_TYPE: Record<FilterFieldType, FilterOperator[]> = {
  text: ["contains", "is", "is_not", "starts_with", "in", "none_of", "is_empty", "not_empty"],
  select: ["in", "none_of", "is_empty"],
  choice: ["in", "none_of", "is_empty"],
  user: ["in", "none_of", "is_empty"],
  number: ["equals", "gt", "lt", "between", "is_empty"],
  date: ["is", "before", "after", "between", "last_n_days", "next_n_days", "is_empty"],
  boolean: ["is_true", "is_false"],
  document: ["uploaded", "missing", "required_missing"],
};

const OPERATOR_LABEL: Record<FilterOperator, string> = {
  contains: "contains",
  is: "is",
  is_not: "is not",
  starts_with: "starts with",
  is_empty: "is empty",
  not_empty: "is not empty",
  in: "is any of",
  none_of: "is none of",
  equals: "=",
  gt: ">",
  lt: "<",
  between: "between",
  before: "before",
  after: "after",
  last_n_days: "in the last days",
  next_n_days: "in the next days",
  is_true: "is",
  is_false: "is",
  uploaded: "uploaded",
  missing: "missing",
  required_missing: "required and missing",
};

export const operatorsFor = (type: FilterFieldType): FilterOperator[] =>
  OPERATORS_BY_TYPE[type] ?? OPERATORS_BY_TYPE.text;

export const operatorLabel = (op: FilterOperator): string => OPERATOR_LABEL[op] ?? op;

/** Empty-value operators still narrow the list; every other empty chip is All. */
export const filterHasValue = (filter: ActiveFilter): boolean =>
  filter.values.length > 0 || filter.op === "is_empty" || filter.op === "not_empty";

/** The chip text: "Block: Alangayam, DMS", "Block: All", "Days left: > 90". */
export function filterChipLabel(field: FilterField, filter?: ActiveFilter): string {
  // No value applied → a QUIET button labelled just "Block" (no "All", no ✕).
  if (!filter || !filterHasValue(filter)) return field.label;
  const optionLabel = (v: string) => {
    const label = field.options?.find((o) => o.value === v)?.label ?? v;
    if (field.type !== "date" || !label) return label;
    const parsed = Date.parse(label);
    if (Number.isNaN(parsed)) return label;
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(new Date(parsed)).replace(/ /g, "-");
  };
  const shown = filter.values.map(optionLabel);
  switch (filter.op) {
    case "between":
      return `${field.label}: ${shown.join(" – ")}`;
    case "last_n_days":
      return `${field.label}: last ${shown[0] ?? ""} days`;
    case "next_n_days":
      return `${field.label}: next ${shown[0] ?? ""} days`;
    case "is_true":
      return `${field.label} is Yes`;
    case "is_false":
      return `${field.label} is No`;
    case "in":
      return `${field.label} is any of ${shown.join(", ")}`;
    case "none_of":
      return `${field.label} is none of ${shown.join(", ")}`;
    case "contains":
      return `${field.label} contains ${shown.join(", ")}`;
    case "starts_with":
      return `${field.label} starts with ${shown.join(", ")}`;
    case "is_not":
      return `${field.label} is not ${shown.join(", ")}`;
    case "is_empty":
      return `${field.label} is empty`;
    case "not_empty":
      return `${field.label} is not empty`;
    case "gt":
    case "lt":
    case "equals":
      return `${field.label}: ${operatorLabel(filter.op)} ${shown.join(", ")}`;
    default:
      return `${field.label}: ${shown.join(", ")}`;
  }
}

/* -------------------------------------------------------------------------- */
/* Matching (pure)                                                             */
/* -------------------------------------------------------------------------- */

const toText = (v: unknown): string =>
  v == null ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);

const toNumber = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const dayMs = 86_400_000;

/** Does one row's value satisfy one filter? A blank never equals 0. */
export function filterValueMatches(value: unknown, f: ActiveFilter): boolean {
  const text = toText(value).trim();
  const blank = text === "" || text === "-" || text.toLowerCase() === "null";
  switch (f.op) {
    case "is_empty":
      return blank;
    case "not_empty":
      return !blank;
    case "contains":
      return text.toLowerCase().includes((f.values[0] ?? "").toLowerCase());
    case "starts_with":
      return text.toLowerCase().startsWith((f.values[0] ?? "").toLowerCase());
    case "is":
      return blank ? f.values.includes("") : f.values.some((v) => text.toLowerCase() === v.toLowerCase());
    case "is_not":
      return !f.values.some((v) => text.toLowerCase() === v.toLowerCase());
    case "in":
      return f.values.some((v) => text.toLowerCase() === v.toLowerCase());
    case "none_of":
      return !f.values.some((v) => text.toLowerCase() === v.toLowerCase());
    case "equals":
      return toNumber(text) === toNumber(f.values[0]);
    case "gt": {
      const n = toNumber(text);
      return n != null && n > (toNumber(f.values[0]) ?? Number.POSITIVE_INFINITY);
    }
    case "lt": {
      const n = toNumber(text);
      return n != null && n < (toNumber(f.values[0]) ?? Number.NEGATIVE_INFINITY);
    }
    case "between": {
      const n = toNumber(text);
      const a = toNumber(f.values[0]);
      const b = toNumber(f.values[1]);
      return n != null && a != null && b != null && n >= Math.min(a, b) && n <= Math.max(a, b);
    }
    case "before":
      return !blank && text <= (f.values[0] ?? "");
    case "after":
      return !blank && text >= (f.values[0] ?? "");
    case "last_n_days": {
      if (blank) return false;
      const days = Number(f.values[0] ?? 0);
      const at = Date.parse(text.slice(0, 10));
      return Number.isFinite(at) && at >= Date.now() - days * dayMs && at <= Date.now();
    }
    case "next_n_days": {
      if (blank) return false;
      const days = Number(f.values[0] ?? 0);
      const at = Date.parse(text.slice(0, 10));
      return Number.isFinite(at) && at >= Date.now() && at <= Date.now() + days * dayMs;
    }
    case "is_true":
      return /^(true|yes|1|uploaded)$/i.test(text);
    case "is_false":
      return /^(false|no|0|not uploaded)$/i.test(text);
    case "uploaded":
      return /^(uploaded|present|yes)$/i.test(text);
    case "missing":
      return /^(missing|not uploaded|no)$/i.test(text);
    case "required_missing":
      return /^(required missing|missing required)$/i.test(text);
    default:
      return true;
  }
}

/** Do the active filters pass this row (AND or OR)? */
export function rowPasses(
  filters: readonly ActiveFilter[],
  match: "all" | "any",
  get: (key: string) => unknown,
): boolean {
  // A chip with no value is "All", never a filter that accidentally matches 0.
  const active = filters.filter(filterHasValue);
  if (active.length === 0) return true;
  const results = active.map((f) => filterValueMatches(get(f.key), f));
  return match === "any" ? results.some(Boolean) : results.every(Boolean);
}

/* -------------------------------------------------------------------------- */
/* Per-user, per-page persistence (which filters sit in the bar)               */
/* -------------------------------------------------------------------------- */

const BAR_PREFIX = "nqas.filterbar.v1.";

export function parseBarValue(raw: string | null): BarValue | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BarValue>;
    if (!parsed || !Array.isArray(parsed.filters)) return null;
    return {
      barKeys: Array.isArray(parsed.barKeys) ? parsed.barKeys : [],
      filters: parsed.filters.filter(
        (f): f is ActiveFilter =>
          !!f && typeof f.key === "string" && Array.isArray(f.values),
      ),
      match: parsed.match === "any" ? "any" : "all",
    };
  } catch {
    return null;
  }
}

export function loadBarState(storageKey: string): {
  barKeys: string[];
  match: "all" | "any";
  /** Filter values saved by pages that opt in (Block Compare). */
  filters?: ActiveFilter[];
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BAR_PREFIX + storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      barKeys?: string[];
      match?: "all" | "any";
      filters?: ActiveFilter[];
    };
    return {
      barKeys: parsed.barKeys ?? [],
      match: parsed.match === "any" ? "any" : "all",
      filters: Array.isArray(parsed.filters) ? parsed.filters : [],
    };
  } catch {
    return null;
  }
}

export function saveBarState(
  storageKey: string,
  value: { barKeys: string[]; match: "all" | "any"; filters?: ActiveFilter[] },
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BAR_PREFIX + storageKey, JSON.stringify(value));
  } catch {
    /* private mode — the bar simply won't remember */
  }
}

/* -------------------------------------------------------------------------- */
/* The bar                                                                     */
/* -------------------------------------------------------------------------- */

export function UniversalFilterBar({
  pageKey,
  fields,
  value,
  onChange,
  /** Right-aligned counter, e.g. "Showing 24 of 157". */
  summary,
  /** Defaults the user deleted from the bar — restorable in one click. */
  onRestore,
  onSaveView,
  onResetDefault,
  /** Page-specific rows inside the ⋯ menu (for example "Include previous
   *  versions" on the Document Library), so secondary options never take a
   *  control slot in the bar. */
  menuExtra,
  leading,
  trailing,
  className,
  /** Set false on a drill-down that must start with a clean bar. */
  restoreSaved = true,
}: {
  pageKey: string;
  fields: readonly FilterField[];
  value: BarValue;
  onChange: (next: BarValue) => void;
  summary?: React.ReactNode;
  onRestore?: () => void;
  onSaveView?: () => void;
  onResetDefault?: () => void;
  menuExtra?: React.ReactNode;
  /** Page search in the SAME toolbar row as the filter chips. */
  leading?: React.ReactNode;
  /** Page actions aligned to the right of the same toolbar row. */
  trailing?: React.ReactNode;
  className?: string;
  restoreSaved?: boolean;
}) {
  const fieldByKey = React.useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);
  const [addOpen, setAddOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [saveName, setSaveName] = React.useState("");
  const [shareRole, setShareRole] = React.useState("personal");
  const [saving, setSaving] = React.useState(false);
  const [myFilters, setMyFilters] = React.useState<SavedFilter[]>(() => loadMyFilters(pageKey));
  const settingsQ = useQuery(api.facilities.getAppSettings, {});
  const setSetting = useMutation(api.facilities.setSetting);
  const isAdmin = settingsQ?.isAdmin === true;
  const appRole = settingsQ?.appRole ?? "viewer";
  const sharedFilters = React.useMemo(
    () => sharedFiltersFor(settingsQ?.settings?.[SHARED_FILTERS_KEY], pageKey, appRole),
    [settingsQ?.settings, pageKey, appRole],
  );

  React.useEffect(() => {
    setMyFilters(loadMyFilters(pageKey));
  }, [pageKey]);

  const activeCount = value.filters.filter(
    (f) => value.barKeys.includes(f.key) && filterHasValue(f),
  ).length;

  const writeUrl = React.useCallback(
    (next: BarValue) => {
      const params = new URLSearchParams(searchParams);
      const active = next.filters.filter(filterHasValue);
      if (active.length === 0) {
        params.delete("f");
      } else {
        params.set(
          "f",
          JSON.stringify({ barKeys: next.barKeys, filters: active, match: next.match }),
        );
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const persist = (next: BarValue) => {
    onChange(next);
    saveBarState(pageKey, {
      barKeys: next.barKeys,
      match: next.match,
      filters: next.filters,
    });
    writeUrl(next);
  };

  // A link can carry the filters; with no link, the last saved filter returns
  // after a reload. This runs once per page so it never fights user typing.
  const booted = React.useRef(false);
  React.useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (!restoreSaved) return;
    const fromUrl = parseBarValue(searchParams.get("f"));
    if (fromUrl) {
      onChange(fromUrl);
      saveBarState(pageKey, fromUrl);
      return;
    }
    const last = loadLastFilter(pageKey);
    if (last) {
      onChange(last.value);
      saveBarState(pageKey, last.value);
      return;
    }
    const remembered = loadBarState(pageKey);
    if (remembered && remembered.filters && remembered.filters.length > 0) {
      onChange({
        barKeys: remembered.barKeys,
        filters: remembered.filters,
        match: remembered.match,
      });
    }
  }, [onChange, pageKey, searchParams, restoreSaved]);

  /** ✕ / Backspace: delete the filter from the bar AND clear its value. */
  const removeFilter = (key: string) => {
    const field = fieldByKey.get(key);
    const previous = value;
    persist({
      ...value,
      barKeys: value.barKeys.filter((k) => k !== key),
      filters: value.filters.filter((f) => f.key !== key),
    });
    const label = field?.label ?? key;
    toast(`Removed filter ${label}`, {
      action: { label: "Undo", onClick: () => persist(previous) },
    });
  };

  const addFilter = (key: string) => {
    if (value.barKeys.includes(key)) {
      setAddOpen(false);
      return;
    }
    // A brand-new chip keeps whatever value it already had (usually none → "All").
    persist({ ...value, barKeys: [...value.barKeys, key] });
    setAddOpen(false);
  };

  const setFilter = (next: ActiveFilter) =>
    persist({
      ...value,
      filters: [...value.filters.filter((f) => f.key !== next.key), next],
    });

  const clearAll = () => {
    const previous = value;
    persist({ ...value, filters: [] });
    toast("Cleared all filter values", {
      action: { label: "Undo", onClick: () => persist(previous) },
    });
  };

  const applySaved = (row: SavedFilter) => {
    persist({
      barKeys: row.value.barKeys,
      filters: row.value.filters,
      match: row.value.match,
    });
    setLastFilter(pageKey, row.id);
    setMenuOpen(false);
    toast(`Applied filter ${row.name}`);
  };

  const saveCurrent = async () => {
    const name = saveName.trim();
    if (!name) {
      toast.error("Give this filter a name first");
      return;
    }
    setSaving(true);
    try {
      const row = makeSavedFilter(pageKey, name, value, {
        ownerName: settingsQ?.appRole === "admin" ? "Admin" : undefined,
      });
      const next = [...myFilters.filter((item) => item.name !== row.name), row];
      saveMyFilters(pageKey, next);
      setMyFilters(next);
      setLastFilter(pageKey, row.id);
      if (isAdmin && shareRole !== "personal") {
        const current = settingsQ?.settings?.[SHARED_FILTERS_KEY];
        const shared = Array.isArray(current) ? (current as SavedFilter[]) : [];
        await setSetting({
          key: SHARED_FILTERS_KEY,
          value: [...shared.filter((item) => item.id !== row.id), { ...row, role: shareRole }],
        });
        toast.success(`Saved and shared with ${shareRole === "all" ? "every role" : shareRole}`);
      } else {
        toast.success("Filter saved to My filters");
      }
      setSaveOpen(false);
      setSaveName("");
      setShareRole("personal");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The filter could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const renameFilter = (row: SavedFilter) => {
    const name = window.prompt("New name for this filter", row.name)?.trim();
    if (!name || name === row.name) return;
    const next = myFilters.map((item) =>
      item.id === row.id ? { ...item, name } : item,
    );
    saveMyFilters(pageKey, next);
    setMyFilters(next);
    toast("Filter renamed");
  };

  const deleteFilter = (row: SavedFilter) => {
    const next = myFilters.filter((item) => item.id !== row.id);
    saveMyFilters(pageKey, next);
    setMyFilters(next);
    toast(`Deleted filter ${row.name}`);
  };

  const makeDefault = (row: SavedFilter) => {
    setLastFilter(pageKey, row.id);
    toast(`${row.name} is now your default filter`);
  };

  // Keyboard, everywhere: "/" goes to the page search, "F" opens + Filter.
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        setAddOpen(true);
      }
      if (event.key === "/") {
        const pageSearch = document.querySelector<HTMLElement>(
          '[data-page-search], input[aria-label*="search" i], input[placeholder*="search" i]',
        );
        event.preventDefault();
        if (pageSearch) pageSearch.focus();
        else setAddOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const removedDefaults = React.useMemo(
    () => fields.filter((f) => f.onThisPage && !value.barKeys.includes(f.key)),
    [fields, value.barKeys],
  );

  const grouped = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const inBar = fields.filter((f) => value.barKeys.includes(f.key));
    const onThisPage = fields.filter((f) => f.onThisPage && !value.barKeys.includes(f.key));
    const specials = fields.filter((f) => f.special && !value.barKeys.includes(f.key));
    const rest = fields.filter(
      (f) => !f.onThisPage && !f.special && !value.barKeys.includes(f.key),
    );
    const keep = (f: FilterField) => !q || f.label.toLowerCase().includes(q);
    return [
      { title: "In this bar", items: inBar.filter(keep) },
      { title: "On this page", items: onThisPage.filter(keep) },
      ...(specials.some(keep) ? [{ title: "Special filters", items: specials.filter(keep) }] : []),
      { title: "All fields", items: rest.filter(keep) },
    ].filter((g) => g.items.length > 0);
  }, [fields, query, value.barKeys]);

  const chips = (
    <div className="flex flex-wrap items-center gap-2">
      {value.barKeys.map((key) => {
        const field = fieldByKey.get(key);
        if (!field) return null;
        const filter = value.filters.find((f) => f.key === key);
        const applied = !!filter && filter.values.length > 0;
        const text = filterChipLabel(field, filter);
        const clearValue = () => {
          const previous = value;
          persist({
            ...value,
            filters: value.filters.map((f) =>
              f.key === key
                ? { key, op: operatorsFor(field.type)[0], values: [] }
                : f,
            ),
          });
          toast(`Cleared ${field.label}`, {
            action: { label: "Undo", onClick: () => persist(previous) },
          });
        };
        return (
          <span
            key={key}
            tabIndex={0}
            data-testid={`filter-chip-${key}`}
            onKeyDown={(e) => {
              if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                removeFilter(key);
              }
            }}
            className={cn(
              "inline-flex min-h-9 max-w-full items-center gap-0.5 rounded-full border pr-1 pl-1 text-xs font-medium",
              applied
                ? "border-primary/40 bg-primary/10"
                : "border-input bg-background/70 text-muted-foreground",
            )}
          >
            <ChipEditor
              field={field}
              filter={filter}
              onChange={setFilter}
              onHide={() => removeFilter(key)}
            >
              <span className="max-w-64 truncate px-2">{text}</span>
              {!applied && <ChevronDown className="mr-1 size-3" aria-hidden="true" />}
            </ChipEditor>
            {applied && (
              <button
                type="button"
                aria-label={`Clear filter ${field.label}`}
                onClick={clearValue}
                className="ml-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-3.5" />
              </button>
            )}
          </span>
        );
      })}

      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 rounded-full px-3 text-xs"
            data-testid="add-filter"
            aria-label="Add a filter"
          >
            <Plus className="size-3.5" /> Filter
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-2" data-testid="add-filter-panel">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fields"
              className="h-9 pl-8 text-xs"
              aria-label="Search filter fields"
            />
          </div>
          <div className="max-h-72 overflow-y-auto pr-1">
            {grouped.map((g) => (
              <div key={g.title} className="mb-2">
                <p className="mb-1 px-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {g.title}
                </p>
                <ul className="space-y-0.5">
                  {g.items.map((f) => (
                    <li key={f.key}>
                      <button
                        type="button"
                        onClick={() => addFilter(f.key)}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <span className="truncate">{f.label}</span>
                        {value.barKeys.includes(f.key) ? (
                          <Check className="size-3.5 shrink-0 text-primary" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Add</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {grouped.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">No field matches “{query}”.</p>
            )}
          </div>
          {removedDefaults.length > 0 && (
            <div className="mt-1 border-t border-border/50 pt-2">
              <p className="mb-1 px-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Hidden filters
              </p>
              <div className="flex flex-wrap gap-1.5 px-1">
                {removedDefaults.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => addFilter(f.key)}
                    className="rounded-full border border-dashed border-border/70 px-2 py-1 text-[11px] hover:bg-muted/60"
                  >
                    + {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {activeCount > 0 && (
        <Button
          size="sm"
          variant="ghost"
          className="h-9 gap-1 rounded-full px-2.5 text-xs"
          onClick={clearAll}
          data-testid="clear-all-filters"
        >
          <FilterX className="size-3.5" /> Clear all
        </Button>
      )}

      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 rounded-full p-0"
            aria-label="More filter options"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2">
          <MenuRow
            icon={<Save className="size-3.5" />}
            onClick={() => {
              setMenuOpen(false);
              setSaveOpen(true);
            }}
          >
            Save this filter…
          </MenuRow>
          {onSaveView && (
            <MenuRow icon={<Bookmark className="size-3.5" />} onClick={() => { setMenuOpen(false); onSaveView(); }}>
              Save as view
            </MenuRow>
          )}
          {myFilters.length > 0 && (
            <>
              <div className="my-1 border-t border-border/50" />
              <p className="px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                My filters
              </p>
              <div className="max-h-44 overflow-y-auto">
                {myFilters.map((row) => (
                  <div key={row.id} className="flex items-center gap-0.5 rounded-md hover:bg-muted/60">
                    <button
                      type="button"
                      onClick={() => applySaved(row)}
                      className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-xs"
                      title={`Apply ${row.name}`}
                    >
                      {row.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => makeDefault(row)}
                      aria-label={`Set ${row.name} as my default`}
                      title="Set as my default"
                      className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <Star className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => renameFilter(row)}
                      aria-label={`Rename ${row.name}`}
                      title="Rename"
                      className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFilter(row)}
                      aria-label={`Delete ${row.name}`}
                      title="Delete"
                      className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {sharedFilters.length > 0 && (
            <>
              <div className="my-1 border-t border-border/50" />
              <p className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                <Users className="size-3" /> Shared by Admin
              </p>
              <div className="max-h-36 overflow-y-auto">
                {sharedFilters.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => applySaved(row)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60"
                  >
                    <Bookmark className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{row.name}</span>
                    <span className="text-[10px] text-muted-foreground">{row.role}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {onResetDefault && (
            <MenuRow icon={<RotateCcw className="size-3.5" />} onClick={() => { setMenuOpen(false); onResetDefault(); }}>
              Reset filters to default
            </MenuRow>
          )}
          {menuExtra && (
            <>
              <div className="my-1 border-t border-border/50" />
              {menuExtra}
            </>
          )}
          <div className="my-1 border-t border-border/50" />
          <p className="px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Match
          </p>
          {(["all", "any"] as const).map((m) => (
            <MenuRow
              key={m}
              icon={value.match === m ? <Check className="size-3.5" /> : <span className="size-3.5" />}
              onClick={() => { setMenuOpen(false); persist({ ...value, match: m }); }}
            >
              {m === "all" ? "Match all (AND)" : "Match any (OR)"}
            </MenuRow>
          ))}
        </PopoverContent>
      </Popover>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save this filter</DialogTitle>
            <DialogDescription>
              A saved filter is a name for this exact filter set. It returns after a reload.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1 text-xs font-medium">
              Filter name
              <Input
                autoFocus
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void saveCurrent();
                }}
                placeholder="For example: Alangayam pending"
                maxLength={60}
              />
            </label>
            <label className="block space-y-1 text-xs font-medium">
              Who can see it
              <select
                value={shareRole}
                onChange={(event) => setShareRole(event.target.value)}
                className="h-9 w-full rounded-md border border-border/60 bg-background px-2 text-sm text-foreground"
                disabled={!isAdmin}
              >
                <option value="personal">Only me</option>
                {isAdmin ? (
                  <>
                    <option value="all">Every role (shared)</option>
                    <option value="admin">State Admin</option>
                    <option value="dqmo">DQMO</option>
                    <option value="dqc">DQC</option>
                    <option value="entry">Entry</option>
                    <option value="viewer">Viewer</option>
                  </>
                ) : null}
              </select>
            </label>
            {!isAdmin ? (
              <p className="text-[11px] text-muted-foreground">
                Only a State Admin can share a filter with a role.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveCurrent()} disabled={saving || !saveName.trim()}>
              {saving ? "Saving…" : "Save filter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  const counter = summary != null && (
    <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground" aria-live="polite">
      {summary}
    </span>
  );

  return (
    <div
      data-testid="universal-filter-bar"
      className={cn(
        "glass mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2",
        className,
      )}
    >
      {/* Desktop: search | chips | page actions, in ONE row. Mobile: search +
          filters button, with the page actions wrapping below. */}
      <div className="hidden w-full min-w-0 items-center gap-2 sm:flex">
        {leading}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {chips}
          {counter}
        </div>
        {trailing}
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 sm:hidden">
        {leading ? <div className="min-w-0 flex-1">{leading}</div> : null}
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-1.5 text-xs"
          onClick={() => setMobileOpen(true)}
          data-testid="mobile-filters"
        >
          Filters · {value.barKeys.length}
        </Button>
        {counter}
        {trailing ? <div className="flex w-full flex-wrap items-center gap-2">{trailing}</div> : null}
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 sm:hidden"
          onClick={() => setMobileOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
        >
          <div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-background p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Filters</span>
              <Button size="sm" variant="ghost" onClick={() => setMobileOpen(false)} aria-label="Close filters">
                <X className="size-4" />
              </Button>
            </div>
            {chips}
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={() => setMobileOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Click a chip → its editor: operator + values with live counts. Nothing
 * checked means all; one Clear resets the value but keeps the chip in the bar.
 * A field with no options (text / number / date) asks for a value directly.
 */
function ChipEditor({
  field,
  filter,
  onChange,
  onHide,
  children,
}: {
  field: FilterField;
  filter?: ActiveFilter;
  onChange: (next: ActiveFilter) => void;
  onHide?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [op, setOp] = React.useState<FilterOperator>(filter?.op ?? operatorsFor(field.type)[0]);
  const [values, setValues] = React.useState<string[]>(filter?.values ?? []);
  const [draft, setDraft] = React.useState(filter?.values[0] ?? "");

  // Re-sync when the chip's value changes elsewhere (URL, Clear all, Undo).
  React.useEffect(() => {
    if (!open) {
      setOp(filter?.op ?? operatorsFor(field.type)[0]);
      setValues(filter?.values ?? []);
      setDraft(filter?.values[0] ?? "");
    }
  }, [filter, field.type, open]);

  const isChoice = field.type === "select" || field.type === "choice" || field.type === "user";

  const apply = () => {
    const nextValues = isChoice
      ? values
      : field.type === "boolean"
        ? values
        : op === "between"
          ? values.filter((item) => item.trim() !== "")
          : draft.trim()
            ? [draft.trim()]
            : [];
    const nextOp = field.type === "boolean"
      ? values[0] === "no"
        ? "is_false"
        : "is_true"
      : op;
    onChange({ key: field.key, op: nextOp, values: nextValues });
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setOp(filter?.op ?? operatorsFor(field.type)[0]);
          setValues(filter?.values ?? []);
          setDraft(filter?.values[0] ?? "");
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-8 items-center rounded-full hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`Edit filter ${field.label}`}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 p-3">
        <p className="text-xs font-semibold">{field.label}</p>
        <label className="block space-y-1 text-[11px] text-muted-foreground">
          Condition
          <select
            value={op}
            onChange={(e) => setOp(e.target.value as FilterOperator)}
            className="h-9 w-full rounded-md border border-border/60 bg-background px-2 text-xs text-foreground"
            aria-label={`Condition for ${field.label}`}
          >
            {operatorsFor(field.type).map((o) => (
              <option key={o} value={o}>
                {operatorLabel(o)}
              </option>
            ))}
          </select>
        </label>

        {op === "is_empty" || op === "not_empty" ? (
          <p className="text-xs text-muted-foreground">
            This condition needs no value. Apply to narrow the list.
          </p>
        ) : isChoice ? (
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {(field.options ?? []).map((o) => {
              const checked = values.includes(o.value);
              return (
                <label
                  key={o.value}
                  className="flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 text-xs hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setValues((prev) =>
                        checked ? prev.filter((v) => v !== o.value) : [...prev, o.value],
                      )
                    }
                    className="size-4 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1 truncate">{o.label ?? o.value}</span>
                  {o.count != null && (
                    <span className="tabular-nums text-[10px] text-muted-foreground">{o.count}</span>
                  )}
                </label>
              );
            })}
            {(field.options ?? []).length === 0 && (
              <p className="px-1 py-2 text-xs text-muted-foreground">No values in this list yet.</p>
            )}
          </div>
        ) : field.type === "boolean" ? (
          <label className="block space-y-1 text-[11px] text-muted-foreground">
            Value
            <select
              value={values[0] ?? ""}
              onChange={(event) => setValues(event.target.value ? [event.target.value] : [])}
              className="h-9 w-full rounded-md border border-border/60 bg-background px-2 text-xs text-foreground"
              aria-label={`Value for ${field.label}`}
            >
              <option value="">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        ) : op === "between" ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1 text-[11px] text-muted-foreground">
              From
              <Input
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                value={values[0] ?? ""}
                onChange={(e) => setValues([e.target.value, values[1] ?? ""])}
                className="h-9 text-xs"
                aria-label={`From value for ${field.label}`}
              />
            </label>
            <label className="block space-y-1 text-[11px] text-muted-foreground">
              To
              <Input
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                value={values[1] ?? ""}
                onChange={(e) => setValues([values[0] ?? "", e.target.value])}
                className="h-9 text-xs"
                aria-label={`To value for ${field.label}`}
              />
            </label>
          </div>
        ) : (
          <label className="block space-y-1 text-[11px] text-muted-foreground">
            {op === "last_n_days" || op === "next_n_days" ? "Days" : "Value"}
            <Input
              type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") apply();
              }}
              className="h-9 text-xs"
              placeholder="Type a value"
              aria-label={`Value for ${field.label}`}
            />
          </label>
        )}

        <p className="text-[10px] text-muted-foreground">
          Nothing checked = all. Values apply to the filter set in the URL.
        </p>
        <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onChange({ key: field.key, op, values: [] });
                setOpen(false);
              }}
            >
              Clear
            </Button>
            {onHide && !field.special && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => {
                  onHide();
                  setOpen(false);
                }}
              >
                Hide this filter
              </Button>
            )}
          </div>
          <Button size="sm" onClick={apply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MenuRow({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </button>
  );
}
