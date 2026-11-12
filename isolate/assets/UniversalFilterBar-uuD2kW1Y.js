import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, H as ChevronDown, a3 as X, Y as Plus, Q as Search, m as Check, P as FunnelX, ac as Ellipsis, ax as Save, ad as Bookmark, aA as Star, a7 as Pencil, ar as Trash2, bd as Users, w as RotateCcw } from './icons-BxQpodNr.js';
import { d as useSearchParams, l as useQuery, j as api, m as useMutation, c as cn, B as Button, t as toast } from './index-CBV6wOh8.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from './dialog-BW3GEiPg.js';
import { I as Input } from './input-Cy2oZLur.js';
import { e as Popover, f as PopoverTrigger, g as PopoverContent } from './AppShell-CP099uvN.js';

const MY_PREFIX = "nqas.filterbar.saved.v1.";
const LAST_PREFIX = "nqas.filterbar.last.v1.";
const SHARED_FILTERS_KEY = "savedFilters";
const cleanValue = (value) => ({
  barKeys: Array.isArray(value.barKeys) ? value.barKeys : [],
  filters: Array.isArray(value.filters) ? value.filters.filter((f) => f && f.key && Array.isArray(f.values)) : [],
  match: value.match === "any" ? "any" : "all"
});
const read = (key, fallback) => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
};
function loadMyFilters(pageKey) {
  const rows = read(MY_PREFIX + pageKey, []);
  return Array.isArray(rows) ? rows.filter((row) => row && row.id && row.name && row.value).map((row) => ({ ...row, pageKey, value: cleanValue(row.value) })) : [];
}
function saveMyFilters(pageKey, rows) {
  write(MY_PREFIX + pageKey, rows.map((row) => ({ ...row, pageKey, value: cleanValue(row.value) })));
}
function makeSavedFilter(pageKey, name, value, extra = {}) {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    pageKey,
    value: cleanValue(value),
    ...extra
  };
}
function loadLastFilter(pageKey) {
  const id = read(LAST_PREFIX + pageKey, "");
  if (!id) return null;
  return loadMyFilters(pageKey).find((row) => row.id === id) ?? null;
}
function setLastFilter(pageKey, id) {
  write(LAST_PREFIX + pageKey, id);
}
function sharedFiltersFor(stored, pageKey, role) {
  if (!Array.isArray(stored)) return [];
  return stored.filter(
    (row) => row && row.id && row.name && row.pageKey === pageKey && row.value && (row.role === "all" || row.role === role)
  ).map((row) => ({ ...row, value: cleanValue(row.value) }));
}

const OPERATORS_BY_TYPE = {
  text: ["contains", "is", "is_not", "starts_with", "in", "none_of", "is_empty", "not_empty"],
  select: ["in", "none_of", "is_empty"],
  choice: ["in", "none_of", "is_empty"],
  user: ["in", "none_of", "is_empty"],
  number: ["equals", "gt", "lt", "between", "is_empty"],
  date: ["is", "before", "after", "between", "last_n_days", "next_n_days", "is_empty"],
  boolean: ["is_true", "is_false"],
  document: ["uploaded", "missing", "required_missing"]
};
const OPERATOR_LABEL = {
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
  required_missing: "required and missing"
};
const operatorsFor = (type) => OPERATORS_BY_TYPE[type] ?? OPERATORS_BY_TYPE.text;
const operatorLabel = (op) => OPERATOR_LABEL[op] ?? op;
const filterHasValue = (filter) => filter.values.length > 0 || filter.op === "is_empty" || filter.op === "not_empty";
function filterChipLabel(field, filter) {
  if (!filter || !filterHasValue(filter)) return field.label;
  const optionLabel = (v) => {
    const label = field.options?.find((o) => o.value === v)?.label ?? v;
    if (field.type !== "date" || !label) return label;
    const parsed = Date.parse(label);
    if (Number.isNaN(parsed)) return label;
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata"
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
const toText = (v) => v == null ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
const toNumber = (v) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const dayMs = 864e5;
function filterValueMatches(value, f) {
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
function rowPasses(filters, match, get) {
  const active = filters.filter(filterHasValue);
  if (active.length === 0) return true;
  const results = active.map((f) => filterValueMatches(get(f.key), f));
  return match === "any" ? results.some(Boolean) : results.every(Boolean);
}
const BAR_PREFIX = "nqas.filterbar.v1.";
function parseBarValue(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.filters)) return null;
    return {
      barKeys: Array.isArray(parsed.barKeys) ? parsed.barKeys : [],
      filters: parsed.filters.filter(
        (f) => !!f && typeof f.key === "string" && Array.isArray(f.values)
      ),
      match: parsed.match === "any" ? "any" : "all"
    };
  } catch {
    return null;
  }
}
function loadBarState(storageKey) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BAR_PREFIX + storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      barKeys: parsed.barKeys ?? [],
      match: parsed.match === "any" ? "any" : "all",
      filters: Array.isArray(parsed.filters) ? parsed.filters : []
    };
  } catch {
    return null;
  }
}
function saveBarState(storageKey, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BAR_PREFIX + storageKey, JSON.stringify(value));
  } catch {
  }
}
function UniversalFilterBar({
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
  restoreSaved = true
}) {
  const fieldByKey = reactExports.useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);
  const [addOpen, setAddOpen] = reactExports.useState(false);
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const [query, setQuery] = reactExports.useState("");
  const [mobileOpen, setMobileOpen] = reactExports.useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [saveOpen, setSaveOpen] = reactExports.useState(false);
  const [saveName, setSaveName] = reactExports.useState("");
  const [shareRole, setShareRole] = reactExports.useState("personal");
  const [saving, setSaving] = reactExports.useState(false);
  const [myFilters, setMyFilters] = reactExports.useState(() => loadMyFilters(pageKey));
  const settingsQ = useQuery(api.facilities.getAppSettings, {});
  const setSetting = useMutation(api.facilities.setSetting);
  const isAdmin = settingsQ?.isAdmin === true;
  const appRole = settingsQ?.appRole ?? "viewer";
  const sharedFilters = reactExports.useMemo(
    () => sharedFiltersFor(settingsQ?.settings?.[SHARED_FILTERS_KEY], pageKey, appRole),
    [settingsQ?.settings, pageKey, appRole]
  );
  reactExports.useEffect(() => {
    setMyFilters(loadMyFilters(pageKey));
  }, [pageKey]);
  const activeCount = value.filters.filter(
    (f) => value.barKeys.includes(f.key) && filterHasValue(f)
  ).length;
  const writeUrl = reactExports.useCallback(
    (next) => {
      const params = new URLSearchParams(searchParams);
      const active = next.filters.filter(filterHasValue);
      if (active.length === 0) {
        params.delete("f");
      } else {
        params.set(
          "f",
          JSON.stringify({ barKeys: next.barKeys, filters: active, match: next.match })
        );
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );
  const persist = (next) => {
    onChange(next);
    saveBarState(pageKey, {
      barKeys: next.barKeys,
      match: next.match,
      filters: next.filters
    });
    writeUrl(next);
  };
  const booted = reactExports.useRef(false);
  reactExports.useEffect(() => {
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
        match: remembered.match
      });
    }
  }, [onChange, pageKey, searchParams, restoreSaved]);
  const removeFilter = (key) => {
    const field = fieldByKey.get(key);
    const previous = value;
    persist({
      ...value,
      barKeys: value.barKeys.filter((k) => k !== key),
      filters: value.filters.filter((f) => f.key !== key)
    });
    const label = field?.label ?? key;
    toast(`Removed filter ${label}`, {
      action: { label: "Undo", onClick: () => persist(previous) }
    });
  };
  const addFilter = (key) => {
    if (value.barKeys.includes(key)) {
      setAddOpen(false);
      return;
    }
    persist({ ...value, barKeys: [...value.barKeys, key] });
    setAddOpen(false);
  };
  const setFilter = (next) => persist({
    ...value,
    filters: [...value.filters.filter((f) => f.key !== next.key), next]
  });
  const clearAll = () => {
    const previous = value;
    persist({ ...value, filters: [] });
    toast("Cleared all filter values", {
      action: { label: "Undo", onClick: () => persist(previous) }
    });
  };
  const applySaved = (row) => {
    persist({
      barKeys: row.value.barKeys,
      filters: row.value.filters,
      match: row.value.match
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
        ownerName: settingsQ?.appRole === "admin" ? "Admin" : void 0
      });
      const next = [...myFilters.filter((item) => item.name !== row.name), row];
      saveMyFilters(pageKey, next);
      setMyFilters(next);
      setLastFilter(pageKey, row.id);
      if (isAdmin && shareRole !== "personal") {
        const current = settingsQ?.settings?.[SHARED_FILTERS_KEY];
        const shared = Array.isArray(current) ? current : [];
        await setSetting({
          key: SHARED_FILTERS_KEY,
          value: [...shared.filter((item) => item.id !== row.id), { ...row, role: shareRole }]
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
  const renameFilter = (row) => {
    const name = window.prompt("New name for this filter", row.name)?.trim();
    if (!name || name === row.name) return;
    const next = myFilters.map(
      (item) => item.id === row.id ? { ...item, name } : item
    );
    saveMyFilters(pageKey, next);
    setMyFilters(next);
    toast("Filter renamed");
  };
  const deleteFilter = (row) => {
    const next = myFilters.filter((item) => item.id !== row.id);
    saveMyFilters(pageKey, next);
    setMyFilters(next);
    toast(`Deleted filter ${row.name}`);
  };
  const makeDefault = (row) => {
    setLastFilter(pageKey, row.id);
    toast(`${row.name} is now your default filter`);
  };
  reactExports.useEffect(() => {
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) {
        return;
      }
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        setAddOpen(true);
      }
      if (event.key === "/") {
        const pageSearch = document.querySelector(
          '[data-page-search], input[aria-label*="search" i], input[placeholder*="search" i]'
        );
        event.preventDefault();
        if (pageSearch) pageSearch.focus();
        else setAddOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const removedDefaults = reactExports.useMemo(
    () => fields.filter((f) => f.onThisPage && !value.barKeys.includes(f.key)),
    [fields, value.barKeys]
  );
  const grouped = reactExports.useMemo(() => {
    const q = query.trim().toLowerCase();
    const inBar = fields.filter((f) => value.barKeys.includes(f.key));
    const onThisPage = fields.filter((f) => f.onThisPage && !value.barKeys.includes(f.key));
    const specials = fields.filter((f) => f.special && !value.barKeys.includes(f.key));
    const rest = fields.filter(
      (f) => !f.onThisPage && !f.special && !value.barKeys.includes(f.key)
    );
    const keep = (f) => !q || f.label.toLowerCase().includes(q);
    return [
      { title: "In this bar", items: inBar.filter(keep) },
      { title: "On this page", items: onThisPage.filter(keep) },
      ...specials.some(keep) ? [{ title: "Special filters", items: specials.filter(keep) }] : [],
      { title: "All fields", items: rest.filter(keep) }
    ].filter((g) => g.items.length > 0);
  }, [fields, query, value.barKeys]);
  const chips = /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
    value.barKeys.map((key) => {
      const field = fieldByKey.get(key);
      if (!field) return null;
      const filter = value.filters.find((f) => f.key === key);
      const applied = !!filter && filter.values.length > 0;
      const text = filterChipLabel(field, filter);
      const clearValue = () => {
        const previous = value;
        persist({
          ...value,
          filters: value.filters.map(
            (f) => f.key === key ? { key, op: operatorsFor(field.type)[0], values: [] } : f
          )
        });
        toast(`Cleared ${field.label}`, {
          action: { label: "Undo", onClick: () => persist(previous) }
        });
      };
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "span",
        {
          tabIndex: 0,
          "data-testid": `filter-chip-${key}`,
          onKeyDown: (e) => {
            if (e.key === "Delete" || e.key === "Backspace") {
              e.preventDefault();
              removeFilter(key);
            }
          },
          className: cn(
            "inline-flex min-h-9 max-w-full items-center gap-0.5 rounded-full border pr-1 pl-1 text-xs font-medium",
            applied ? "border-primary/40 bg-primary/10" : "border-input bg-background/70 text-muted-foreground"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              ChipEditor,
              {
                field,
                filter,
                onChange: setFilter,
                onHide: () => removeFilter(key),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "max-w-64 truncate px-2", children: text }),
                  !applied && /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "mr-1 size-3", "aria-hidden": "true" })
                ]
              }
            ),
            applied && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                "aria-label": `Clear filter ${field.label}`,
                onClick: clearValue,
                className: "ml-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
              }
            )
          ]
        },
        key
      );
    }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open: addOpen, onOpenChange: setAddOpen, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          size: "sm",
          variant: "outline",
          className: "h-9 gap-1.5 rounded-full px-3 text-xs",
          "data-testid": "add-filter",
          "aria-label": "Add a filter",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5" }),
            " Filter"
          ]
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(PopoverContent, { align: "start", className: "w-80 p-2", "data-testid": "add-filter-panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              autoFocus: true,
              value: query,
              onChange: (e) => setQuery(e.target.value),
              placeholder: "Search fields",
              className: "h-9 pl-8 text-xs",
              "aria-label": "Search filter fields"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-72 overflow-y-auto pr-1", children: [
          grouped.map((g) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1 px-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: g.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-0.5", children: g.items.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => addFilter(f.key),
                className: "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: f.label }),
                  value.barKeys.includes(f.key) ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5 shrink-0 text-primary" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: "Add" })
                ]
              }
            ) }, f.key)) })
          ] }, g.title)),
          grouped.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "px-2 py-3 text-xs text-muted-foreground", children: [
            "No field matches “",
            query,
            "”."
          ] })
        ] }),
        removedDefaults.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 border-t border-border/50 pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1 px-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Hidden filters" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5 px-1", children: removedDefaults.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => addFilter(f.key),
              className: "rounded-full border border-dashed border-border/70 px-2 py-1 text-[11px] hover:bg-muted/60",
              children: [
                "+ ",
                f.label
              ]
            },
            f.key
          )) })
        ] })
      ] })
    ] }),
    activeCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        size: "sm",
        variant: "ghost",
        className: "h-9 gap-1 rounded-full px-2.5 text-xs",
        onClick: clearAll,
        "data-testid": "clear-all-filters",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FunnelX, { className: "size-3.5" }),
          " Clear all"
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open: menuOpen, onOpenChange: setMenuOpen, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "sm",
          variant: "ghost",
          className: "h-9 w-9 rounded-full p-0",
          "aria-label": "More filter options",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "size-4" })
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(PopoverContent, { align: "start", className: "w-72 p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          MenuRow,
          {
            icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "size-3.5" }),
            onClick: () => {
              setMenuOpen(false);
              setSaveOpen(true);
            },
            children: "Save this filter…"
          }
        ),
        onSaveView && /* @__PURE__ */ jsxRuntimeExports.jsx(MenuRow, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Bookmark, { className: "size-3.5" }), onClick: () => {
          setMenuOpen(false);
          onSaveView();
        }, children: "Save as view" }),
        myFilters.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "my-1 border-t border-border/50" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "My filters" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-44 overflow-y-auto", children: myFilters.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-0.5 rounded-md hover:bg-muted/60", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => applySaved(row),
                className: "min-w-0 flex-1 truncate px-2 py-1.5 text-left text-xs",
                title: `Apply ${row.name}`,
                children: row.name
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => makeDefault(row),
                "aria-label": `Set ${row.name} as my default`,
                title: "Set as my default",
                className: "rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { className: "size-3.5" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => renameFilter(row),
                "aria-label": `Rename ${row.name}`,
                title: "Rename",
                className: "rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-3.5" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => deleteFilter(row),
                "aria-label": `Delete ${row.name}`,
                title: "Delete",
                className: "rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" })
              }
            )
          ] }, row.id)) })
        ] }),
        sharedFilters.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "my-1 border-t border-border/50" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1 px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "size-3" }),
            " Shared by Admin"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-36 overflow-y-auto", children: sharedFilters.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => applySaved(row),
              className: "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Bookmark, { className: "size-3.5 shrink-0 text-muted-foreground" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate", children: row.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: row.role })
              ]
            },
            row.id
          )) })
        ] }),
        onResetDefault && /* @__PURE__ */ jsxRuntimeExports.jsx(MenuRow, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-3.5" }), onClick: () => {
          setMenuOpen(false);
          onResetDefault();
        }, children: "Reset filters to default" }),
        menuExtra && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "my-1 border-t border-border/50" }),
          menuExtra
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "my-1 border-t border-border/50" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Match" }),
        ["all", "any"].map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          MenuRow,
          {
            icon: value.match === m ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-3.5" }),
            onClick: () => {
              setMenuOpen(false);
              persist({ ...value, match: m });
            },
            children: m === "all" ? "Match all (AND)" : "Match any (OR)"
          },
          m
        ))
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: saveOpen, onOpenChange: setSaveOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Save this filter" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "A saved filter is a name for this exact filter set. It returns after a reload." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block space-y-1 text-xs font-medium", children: [
          "Filter name",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              autoFocus: true,
              value: saveName,
              onChange: (event) => setSaveName(event.target.value),
              onKeyDown: (event) => {
                if (event.key === "Enter") void saveCurrent();
              },
              placeholder: "For example: Alangayam pending",
              maxLength: 60
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block space-y-1 text-xs font-medium", children: [
          "Who can see it",
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              value: shareRole,
              onChange: (event) => setShareRole(event.target.value),
              className: "h-9 w-full rounded-md border border-border/60 bg-background px-2 text-sm text-foreground",
              disabled: !isAdmin,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "personal", children: "Only me" }),
                isAdmin ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "Every role (shared)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "admin", children: "State Admin" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "dqmo", children: "DQMO" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "dqc", children: "DQC" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "entry", children: "Entry" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "viewer", children: "Viewer" })
                ] }) : null
              ]
            }
          )
        ] }),
        !isAdmin ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "Only a State Admin can share a filter with a role." }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setSaveOpen(false), children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => void saveCurrent(), disabled: saving || !saveName.trim(), children: saving ? "Saving…" : "Save filter" })
      ] })
    ] }) })
  ] });
  const counter = summary != null && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto shrink-0 text-xs tabular-nums text-muted-foreground", "aria-live": "polite", children: summary });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-testid": "universal-filter-bar",
      className: cn(
        "glass mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2",
        className
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hidden w-full min-w-0 items-center gap-2 sm:flex", children: [
          leading,
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-1 flex-wrap items-center gap-2", children: [
            chips,
            counter
          ] }),
          trailing
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full flex-wrap items-center gap-2 sm:hidden", children: [
          leading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1", children: leading }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              size: "sm",
              variant: "outline",
              className: "h-9 gap-1.5 text-xs",
              onClick: () => setMobileOpen(true),
              "data-testid": "mobile-filters",
              children: [
                "Filters · ",
                value.barKeys.length
              ]
            }
          ),
          counter,
          trailing ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex w-full flex-wrap items-center gap-2", children: trailing }) : null
        ] }),
        mobileOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "fixed inset-0 z-50 flex items-end bg-black/40 sm:hidden",
            onClick: () => setMobileOpen(false),
            role: "dialog",
            "aria-modal": "true",
            "aria-label": "Filters",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-background p-3",
                onClick: (e) => e.stopPropagation(),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center justify-between", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold", children: "Filters" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", onClick: () => setMobileOpen(false), "aria-label": "Close filters", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" }) })
                  ] }),
                  chips,
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", onClick: () => setMobileOpen(false), children: "Done" }) })
                ]
              }
            )
          }
        )
      ]
    }
  );
}
function ChipEditor({
  field,
  filter,
  onChange,
  onHide,
  children
}) {
  const [open, setOpen] = reactExports.useState(false);
  const [op, setOp] = reactExports.useState(filter?.op ?? operatorsFor(field.type)[0]);
  const [values, setValues] = reactExports.useState(filter?.values ?? []);
  const [draft, setDraft] = reactExports.useState(filter?.values[0] ?? "");
  reactExports.useEffect(() => {
    if (!open) {
      setOp(filter?.op ?? operatorsFor(field.type)[0]);
      setValues(filter?.values ?? []);
      setDraft(filter?.values[0] ?? "");
    }
  }, [filter, field.type, open]);
  const isChoice = field.type === "select" || field.type === "choice" || field.type === "user";
  const apply = () => {
    const nextValues = isChoice ? values : field.type === "boolean" ? values : op === "between" ? values.filter((item) => item.trim() !== "") : draft.trim() ? [draft.trim()] : [];
    const nextOp = field.type === "boolean" ? values[0] === "no" ? "is_false" : "is_true" : op;
    onChange({ key: field.key, op: nextOp, values: nextValues });
    setOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Popover,
    {
      open,
      onOpenChange: (o) => {
        setOpen(o);
        if (o) {
          setOp(filter?.op ?? operatorsFor(field.type)[0]);
          setValues(filter?.values ?? []);
          setDraft(filter?.values[0] ?? "");
        }
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "inline-flex min-h-8 items-center rounded-full hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            "aria-label": `Edit filter ${field.label}`,
            children
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(PopoverContent, { align: "start", className: "w-72 space-y-2 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold", children: field.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block space-y-1 text-[11px] text-muted-foreground", children: [
            "Condition",
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                value: op,
                onChange: (e) => setOp(e.target.value),
                className: "h-9 w-full rounded-md border border-border/60 bg-background px-2 text-xs text-foreground",
                "aria-label": `Condition for ${field.label}`,
                children: operatorsFor(field.type).map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o, children: operatorLabel(o) }, o))
              }
            )
          ] }),
          op === "is_empty" || op === "not_empty" ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "This condition needs no value. Apply to narrow the list." }) : isChoice ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-56 space-y-0.5 overflow-y-auto", children: [
            (field.options ?? []).map((o) => {
              const checked = values.includes(o.value);
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "label",
                {
                  className: "flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 text-xs hover:bg-muted/60",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "checkbox",
                        checked,
                        onChange: () => setValues(
                          (prev) => checked ? prev.filter((v) => v !== o.value) : [...prev, o.value]
                        ),
                        className: "size-4 accent-[var(--primary)]"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate", children: o.label ?? o.value }),
                    o.count != null && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums text-[10px] text-muted-foreground", children: o.count })
                  ]
                },
                o.value
              );
            }),
            (field.options ?? []).length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-1 py-2 text-xs text-muted-foreground", children: "No values in this list yet." })
          ] }) : field.type === "boolean" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block space-y-1 text-[11px] text-muted-foreground", children: [
            "Value",
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: values[0] ?? "",
                onChange: (event) => setValues(event.target.value ? [event.target.value] : []),
                className: "h-9 w-full rounded-md border border-border/60 bg-background px-2 text-xs text-foreground",
                "aria-label": `Value for ${field.label}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Any" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "yes", children: "Yes" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "no", children: "No" })
                ]
              }
            )
          ] }) : op === "between" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block space-y-1 text-[11px] text-muted-foreground", children: [
              "From",
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  type: field.type === "number" ? "number" : field.type === "date" ? "date" : "text",
                  value: values[0] ?? "",
                  onChange: (e) => setValues([e.target.value, values[1] ?? ""]),
                  className: "h-9 text-xs",
                  "aria-label": `From value for ${field.label}`
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block space-y-1 text-[11px] text-muted-foreground", children: [
              "To",
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  type: field.type === "number" ? "number" : field.type === "date" ? "date" : "text",
                  value: values[1] ?? "",
                  onChange: (e) => setValues([values[0] ?? "", e.target.value]),
                  className: "h-9 text-xs",
                  "aria-label": `To value for ${field.label}`
                }
              )
            ] })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block space-y-1 text-[11px] text-muted-foreground", children: [
            op === "last_n_days" || op === "next_n_days" ? "Days" : "Value",
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                type: field.type === "number" ? "number" : field.type === "date" ? "date" : "text",
                value: draft,
                onChange: (e) => setDraft(e.target.value),
                onKeyDown: (e) => {
                  if (e.key === "Enter") apply();
                },
                className: "h-9 text-xs",
                placeholder: "Type a value",
                "aria-label": `Value for ${field.label}`
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground", children: "Nothing checked = all. Values apply to the filter set in the URL." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2 border-t border-border/50 pt-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "sm",
                  variant: "ghost",
                  onClick: () => {
                    onChange({ key: field.key, op, values: [] });
                    setOpen(false);
                  },
                  children: "Clear"
                }
              ),
              onHide && !field.special && /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "sm",
                  variant: "ghost",
                  className: "text-muted-foreground",
                  onClick: () => {
                    onHide();
                    setOpen(false);
                  },
                  children: "Hide this filter"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", onClick: apply, children: "Apply" })
          ] })
        ] })
      ]
    }
  );
}
function MenuRow({
  icon,
  children,
  onClick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick,
      className: "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: icon }),
        children
      ]
    }
  );
}

export { UniversalFilterBar as U, filterChipLabel as f, loadBarState as l, rowPasses as r, saveBarState as s };
