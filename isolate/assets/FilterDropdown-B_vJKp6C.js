import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, aj as ChevronLeft, z as ChevronRight, m as Check, H as ChevronDown, a3 as X, Q as Search, q as Minus } from './icons-BxQpodNr.js';
import { e as reactDomExports } from './vendor-charts--qXk384P.js';
import { B as Button, c as cn } from './index-CBV6wOh8.js';
import { C as COLUMN_BY_KEY } from './AppShell-CP099uvN.js';
import { K as KPI_LABELS, M as METRIC_LABELS } from './masterFilter-DrauVhuN.js';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-qTILnHQg.js';

const ROW_VIEW_OPTIONS = ["10", "20", "50", "100", "all"];
const ROW_VIEW_LABELS = {
  "10": "10 rows",
  "20": "20 rows",
  "50": "50 rows",
  "100": "100 rows",
  all: "Full List"
};
function defaultRowView() {
  return "10";
}
const STORAGE_KEY = "nqas.rowView";
function loadRowView() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && ROW_VIEW_OPTIONS.includes(v))
      return v;
  } catch {
  }
  return "10";
}
function saveRowView(v) {
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
  }
}
function RowViewSelect({
  value,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium whitespace-nowrap text-muted-foreground", children: "Row View" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Select,
      {
        value,
        onValueChange: (v) => onChange(v),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input h-8 w-36 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ROW_VIEW_OPTIONS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: o, children: ROW_VIEW_LABELS[o] }, o)) })
        ]
      }
    )
  ] });
}
function paginate(rows, view, page) {
  if (view === "all") return rows;
  const per = Number(view);
  if (!Number.isFinite(per) || per <= 0) return rows;
  const start = (page - 1) * per;
  return rows.slice(start, start + per);
}
function pageCount(total, view) {
  if (view === "all") return 1;
  const per = Number(view);
  if (!Number.isFinite(per) || per <= 0) return 1;
  return Math.max(1, Math.ceil(total / per));
}
function PaginationBar({
  total,
  view,
  page,
  onPage
}) {
  if (view === "all" || total === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-xs text-muted-foreground", children: [
      "Showing ",
      total === 0 ? 0 : `1–${total}`,
      " of ",
      total,
      " ",
      total === 1 ? "record" : "records"
    ] });
  }
  const per = Number(view);
  const pages = pageCount(total, view);
  const from = (page - 1) * per + 1;
  const to = Math.min(total, page * per);
  const nums = [];
  const half = 3;
  const start = Math.max(1, Math.min(page - half, pages - 2 * half));
  const end = Math.min(pages, start + 2 * half);
  for (let i = start; i <= end; i++) nums.push(i);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap items-center justify-between gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
      "Showing ",
      from,
      "–",
      to,
      " of ",
      total,
      " ",
      total === 1 ? "record" : "records"
    ] }),
    pages > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          className: "h-7 px-2 text-xs",
          disabled: page <= 1,
          onClick: () => onPage(page - 1),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "size-3.5" }),
            "Previous"
          ]
        }
      ),
      nums[0] > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(PageBtn, { n: 1, page, onPage }),
        nums[0] > 2 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-0.5 text-xs text-muted-foreground", children: "…" })
      ] }),
      nums.map((n) => /* @__PURE__ */ jsxRuntimeExports.jsx(PageBtn, { n, page, onPage }, n)),
      nums[nums.length - 1] < pages && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        nums[nums.length - 1] < pages - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-0.5 text-xs text-muted-foreground", children: "…" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PageBtn, { n: pages, page, onPage })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          className: "h-7 px-2 text-xs",
          disabled: page >= pages,
          onClick: () => onPage(page + 1),
          children: [
            "Next",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-3.5" })
          ]
        }
      )
    ] })
  ] });
}
function PageBtn({
  n,
  page,
  onPage
}) {
  const active = n === page;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Button,
    {
      variant: active ? "default" : "outline",
      size: "sm",
      className: `h-7 min-w-7 px-2 text-xs ${active ? "pointer-events-none" : ""}`,
      onClick: () => onPage(n),
      children: n
    }
  );
}
function usePagination(rows, deps = []) {
  const [view, setViewRaw] = reactExports.useState(() => loadRowView());
  const [page, setPage] = reactExports.useState(1);
  const total = rows.length;
  const pages = pageCount(total, view);
  reactExports.useEffect(() => {
    setPage((p) => Math.min(p, pages));
  }, [pages, ...deps]);
  const setView = (v) => {
    setViewRaw(v);
    saveRowView(v);
    setPage(1);
  };
  return {
    view,
    setView,
    page,
    setPage,
    visible: paginate(rows, view, page),
    total
  };
}

function defaultListFilters() {
  return {
    q: "",
    block: [],
    type: [],
    cycle: [],
    eligibility: [],
    cert: [],
    status: [],
    docRep: [],
    btype: [],
    bstatus: [],
    noc: [],
    kpi: null,
    metric: "",
    due: 0,
    score: [0, 100],
    updated: "",
    updFrom: "",
    updTo: "",
    updBy: "",
    updHow: "",
    updBatch: "",
    updField: "",
    sort: [],
    page: 1,
    size: defaultRowView(),
    facility: "",
    section: ""
  };
}
const LIST_PARAMS = {
  q: "q",
  block: "block",
  type: "type",
  cycle: "cycle",
  eligibility: "elig",
  cert: "cert",
  status: "status",
  docRep: "docrep",
  btype: "btype",
  bstatus: "bstatus",
  noc: "noc",
  kpi: "kpi",
  metric: "metric",
  due: "due",
  score: "score",
  updated: "upd",
  updFrom: "updfrom",
  updTo: "updto",
  updBy: "updby",
  updHow: "updhow",
  updBatch: "updbatch",
  updField: "updfield",
  sort: "sort",
  page: "page",
  size: "size",
  facility: "facility",
  section: "section"
};
const MULTI_KEYS = [
  "block",
  "type",
  "cycle",
  "eligibility",
  "cert",
  "status",
  "docRep",
  "btype",
  "bstatus",
  "noc"
];
const MAX_VALUES = 60;
const MAX_VALUE_LEN = 120;
const MAX_SORTS = 5;
const MAX_PAGE = 1e4;
function parseValues(raw) {
  if (!raw) return [];
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const part of raw.split(",")) {
    const value = part.trim().slice(0, MAX_VALUE_LEN);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= MAX_VALUES) break;
  }
  return out;
}
function parseText(raw) {
  return (raw ?? "").trim().slice(0, MAX_VALUE_LEN);
}
function parseScore(raw) {
  const fallback = [0, 100];
  if (!raw) return fallback;
  const parts = raw.split("-");
  if (parts.length !== 2) return fallback;
  const min = Number(parts[0]);
  const max = Number(parts[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return fallback;
  const lo = Math.max(0, Math.min(100, Math.round(min)));
  const hi = Math.max(0, Math.min(100, Math.round(max)));
  if (lo > hi) return fallback;
  return [lo, hi];
}
function parseSort(raw) {
  if (!raw) return [];
  const out = [];
  for (const part of raw.split(",")) {
    const [id, dir] = part.split(":");
    const key = (id ?? "").trim();
    const direction = (dir ?? "asc").trim().toLowerCase();
    if (!key || direction !== "asc" && direction !== "desc") continue;
    if (!COLUMN_BY_KEY[key]) continue;
    if (out.some((s) => s.id === key)) continue;
    out.push({ id: key, desc: direction === "desc" });
    if (out.length >= MAX_SORTS) break;
  }
  return out;
}
function parseKpi(raw) {
  const value = parseText(raw);
  return value && Object.prototype.hasOwnProperty.call(KPI_LABELS, value) ? value : null;
}
function parseMetric(raw) {
  const value = parseText(raw);
  return value && Object.prototype.hasOwnProperty.call(METRIC_LABELS, value) ? value : "";
}
function parseUpdated(raw) {
  const value = parseText(raw);
  return value === "any" || value === "today" || value === "24h" || value === "7d" || value === "30d" || value === "custom" ? value : "";
}
function parseDue(raw) {
  const n = Number(parseText(raw));
  return n === 30 || n === 60 || n === 90 ? n : 0;
}
function parsePage(raw) {
  const n = Math.floor(Number(parseText(raw)));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_PAGE, n);
}
function parseSize(raw, fallback) {
  const value = parseText(raw);
  return ROW_VIEW_OPTIONS.includes(value) ? value : fallback;
}
function parseListFilters(search, opts = {}) {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  const filters = defaultListFilters();
  filters.q = parseText(params.get(LIST_PARAMS.q));
  for (const key of MULTI_KEYS) {
    filters[key] = parseValues(params.get(LIST_PARAMS[key]));
  }
  filters.kpi = parseKpi(params.get(LIST_PARAMS.kpi));
  filters.metric = parseMetric(params.get(LIST_PARAMS.metric));
  filters.due = parseDue(params.get(LIST_PARAMS.due));
  filters.score = parseScore(params.get(LIST_PARAMS.score));
  filters.updated = parseUpdated(params.get(LIST_PARAMS.updated));
  filters.updFrom = parseText(params.get(LIST_PARAMS.updFrom));
  filters.updTo = parseText(params.get(LIST_PARAMS.updTo));
  filters.updBy = parseText(params.get(LIST_PARAMS.updBy));
  filters.updHow = parseText(params.get(LIST_PARAMS.updHow));
  filters.updBatch = parseText(params.get(LIST_PARAMS.updBatch));
  filters.updField = parseText(params.get(LIST_PARAMS.updField));
  filters.sort = parseSort(params.get(LIST_PARAMS.sort));
  filters.page = parsePage(params.get(LIST_PARAMS.page));
  filters.size = parseSize(
    params.get(LIST_PARAMS.size),
    opts.sizeFallback ?? defaultRowView()
  );
  filters.facility = parseText(params.get(LIST_PARAMS.facility));
  filters.section = parseText(params.get(LIST_PARAMS.section));
  return filters;
}
function buildQuery(entries) {
  return entries.map(
    ([key, value]) => `${key}=${encodeURIComponent(value).replace(/%2C/g, ",").replace(/%3A/g, ":")}`
  ).join("&");
}
function serializeListFilters(filters, opts = {}) {
  const entries = [];
  if (filters.q.trim()) entries.push([LIST_PARAMS.q, filters.q.trim()]);
  for (const key of MULTI_KEYS) {
    const values = filters[key];
    if (values.length) entries.push([LIST_PARAMS[key], values.join(",")]);
  }
  if (filters.kpi) entries.push([LIST_PARAMS.kpi, filters.kpi]);
  if (filters.metric) entries.push([LIST_PARAMS.metric, filters.metric]);
  if (filters.due > 0) entries.push([LIST_PARAMS.due, String(filters.due)]);
  if (filters.score[0] > 0 || filters.score[1] < 100)
    entries.push([LIST_PARAMS.score, `${filters.score[0]}-${filters.score[1]}`]);
  if (filters.updated) {
    entries.push([LIST_PARAMS.updated, filters.updated]);
    if (filters.updated === "custom") {
      if (filters.updFrom) entries.push([LIST_PARAMS.updFrom, filters.updFrom]);
      if (filters.updTo) entries.push([LIST_PARAMS.updTo, filters.updTo]);
    }
    if (filters.updBy) entries.push([LIST_PARAMS.updBy, filters.updBy]);
    if (filters.updHow) entries.push([LIST_PARAMS.updHow, filters.updHow]);
    if (filters.updBatch) entries.push([LIST_PARAMS.updBatch, filters.updBatch]);
    if (filters.updField) entries.push([LIST_PARAMS.updField, filters.updField]);
  }
  if (filters.sort.length)
    entries.push([
      LIST_PARAMS.sort,
      filters.sort.map((s) => `${s.id}:${s.desc ? "desc" : "asc"}`).join(",")
    ]);
  if (filters.page > 1) entries.push([LIST_PARAMS.page, String(filters.page)]);
  if (filters.size !== (opts.defaultSize ?? defaultRowView()))
    entries.push([LIST_PARAMS.size, filters.size]);
  if (filters.facility.trim()) {
    entries.push([LIST_PARAMS.facility, filters.facility.trim()]);
    if (filters.section.trim()) entries.push([LIST_PARAMS.section, filters.section.trim()]);
  }
  return buildQuery(entries);
}
function filterTriggerText(label, selected) {
  if (selected.length === 0) return `${label}: All`;
  if (selected.length <= 2) return `${label}: ${selected.join(", ")}`;
  return `${label}: ${selected.length} selected`;
}
function hasViewParams(search) {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  for (const key of [...MULTI_KEYS, "q", "kpi", "metric", "due", "score", "updated", "updFrom", "updTo", "updBy", "updHow", "updBatch", "updField", "sort", "page", "f"]) {
    if (parseText(params.get(key))) return true;
  }
  return false;
}

const LONG_LIST = 8;
const PANEL_WIDTH = 300;
const LIST_MAX_HEIGHT = 288;
function FilterDropdown({
  label,
  options,
  value,
  onChange,
  triggerWidth = "w-52",
  className,
  summary,
  quietWhenEmpty = false
}) {
  const selected = reactExports.useMemo(() => value ?? [], [value]);
  const selectedSet = reactExports.useMemo(() => new Set(selected), [selected]);
  const [open, setOpen] = reactExports.useState(false);
  const [query, setQuery] = reactExports.useState("");
  const [focused, setFocused] = reactExports.useState(0);
  const [coords, setCoords] = reactExports.useState(null);
  const [isMobile, setIsMobile] = reactExports.useState(false);
  const triggerRef = reactExports.useRef(null);
  const panelRef = reactExports.useRef(null);
  const listRef = reactExports.useRef(null);
  const optionRefs = reactExports.useRef([]);
  const typeAhead = reactExports.useRef({ buffer: "", at: 0 });
  const labelList = reactExports.useMemo(() => {
    const byValue = new Map(options.map((o) => [o.value, o.label]));
    return selected.map((v) => byValue.get(v) ?? v);
  }, [options, selected]);
  const triggerText = reactExports.useMemo(
    () => quietWhenEmpty && selected.length === 0 ? label : filterTriggerText(label, labelList),
    [label, labelList, quietWhenEmpty, selected.length]
  );
  const isLongList = options.length > LONG_LIST;
  const q = query.trim().toLowerCase();
  const visible = reactExports.useMemo(
    () => q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options,
    [options, q]
  );
  const visibleSelected = visible.filter((o) => selectedSet.has(o.value)).length;
  const allVisibleSelected = visible.length > 0 && visibleSelected === visible.length;
  const someVisibleSelected = visibleSelected > 0 && !allVisibleSelected;
  reactExports.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    return;
  }, []);
  const positionPanel = reactExports.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelHeight = Math.min(
      420,
      48 + (isLongList ? 40 + 40 : 0) + Math.max(Math.min(visible.length, 8), 1) * 34 + 44
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropUp = spaceBelow < panelHeight && rect.top > panelHeight;
    const left = Math.min(
      Math.max(8, rect.left),
      Math.max(8, window.innerWidth - PANEL_WIDTH - 8)
    );
    const top = dropUp ? Math.max(8, rect.top - panelHeight - 6) : Math.min(rect.bottom + 4, window.innerHeight - panelHeight - 8);
    setCoords({ left, top });
  }, [isLongList, visible.length]);
  reactExports.useEffect(() => {
    if (!open) return;
    positionPanel();
    function onDown(e) {
      const target = e.target;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target))
        return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, positionPanel]);
  reactExports.useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const first = isLongList ? panelRef.current?.querySelector("input") : listRef.current;
      first?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, isLongList]);
  const commit = (next) => onChange(next);
  const toggle = (v) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    commit([...next]);
  };
  const clear = () => commit([]);
  const toggleAllVisible = (check) => {
    const next = new Set(selected);
    for (const o of visible) {
      if (check) next.add(o.value);
      else next.delete(o.value);
    }
    commit([...next]);
  };
  const onListKeyDown = (e) => {
    if (visible.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const next = (focused + delta + visible.length) % visible.length;
      setFocused(next);
      optionRefs.current[next]?.focus();
      return;
    }
    if (e.key === " " || e.key === "Enter") {
      if (e.key === " " && document.activeElement !== triggerRef.current) {
        e.preventDefault();
        const option = visible[focused];
        if (option) toggle(option.value);
      }
      return;
    }
    if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now();
      const buffer = now - typeAhead.current.at > 600 ? e.key.toLowerCase() : typeAhead.current.buffer + e.key.toLowerCase();
      typeAhead.current = { buffer, at: now };
      const idx = visible.findIndex((o) => o.label.toLowerCase().startsWith(buffer));
      if (idx >= 0) {
        setFocused(idx);
        optionRefs.current[idx]?.focus();
      }
    }
  };
  const listContent = /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    visible.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 py-3 text-center text-xs text-muted-foreground", children: "No matches" }),
    visible.map((o, i) => {
      const on = selectedSet.has(o.value);
      const empty = o.count === 0;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          ref: (el) => {
            optionRefs.current[i] = el;
          },
          type: "button",
          role: "option",
          "aria-selected": on,
          tabIndex: -1,
          onClick: () => toggle(o.value),
          onFocus: () => setFocused(i),
          className: cn(
            "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none sm:min-h-9",
            // A zero-count option is greyed but still selectable: it may
            // simply be hidden by another filter the user is about to clear.
            empty && "text-muted-foreground"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: cn(
                  "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
                ),
                "aria-hidden": true,
                children: on && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate", "data-tip": o.label, "data-tip-truncate": true, children: o.label }),
            o.count != null && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0 text-xs tabular-nums text-muted-foreground", children: [
              "(",
              o.count,
              ")"
            ] })
          ]
        },
        o.value
      );
    })
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn(triggerWidth, className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        ref: triggerRef,
        type: "button",
        onClick: () => {
          if (!open) {
            setQuery("");
            setFocused(0);
          }
          setOpen((o) => !o);
        },
        "aria-expanded": open,
        "aria-haspopup": "listbox",
        "data-filter-trigger": label,
        className: cn(
          "inline-flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          selected.length > 0 ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/40" : "border-input bg-background text-muted-foreground hover:text-foreground"
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "truncate",
              "data-tip": open ? void 0 : triggerText,
              "data-tip-truncate": "1",
              children: triggerText
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex shrink-0 items-center gap-1.5", children: [
            selected.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary", children: selected.length }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ChevronDown,
              {
                className: cn("size-3.5 transition-transform duration-150", open && "rotate-180"),
                "aria-hidden": true
              }
            )
          ] })
        ]
      }
    ),
    open && reactDomExports.createPortal(
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          ref: panelRef,
          "data-filter-panel": "",
          style: isMobile ? void 0 : { left: coords?.left ?? -9999, top: coords?.top ?? -9999 },
          className: cn(
            "fixed z-[70] bg-popover text-popover-foreground shadow-xl",
            isMobile ? "inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)]" : "origin-top rounded-xl border animate-in fade-in-0 zoom-in-95 duration-100"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2 border-b px-3 py-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-xs font-semibold", children: label }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: clear,
                  disabled: selected.length === 0,
                  "data-tip": "Remove this filter and show all",
                  className: cn(
                    "inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition-colors",
                    selected.length > 0 ? "text-primary hover:bg-primary/10" : "cursor-default text-muted-foreground/60"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3", "aria-hidden": true }),
                    "Clear"
                  ]
                }
              )
            ] }),
            isLongList && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative border-b px-2 py-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  value: query,
                  onChange: (e) => {
                    setQuery(e.target.value);
                    setFocused(0);
                  },
                  placeholder: `Search ${label.toLowerCase()}`,
                  "aria-label": `Search ${label}`,
                  className: "w-full rounded-md bg-transparent py-1 pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground"
                }
              )
            ] }),
            isLongList && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => toggleAllVisible(!allVisibleSelected),
                className: "flex min-h-11 w-full items-center gap-2.5 border-b px-3 text-left text-sm font-medium hover:bg-accent sm:min-h-9",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                        allVisibleSelected || someVisibleSelected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
                      ),
                      "aria-hidden": true,
                      children: someVisibleSelected ? /* @__PURE__ */ jsxRuntimeExports.jsx(Minus, { className: "size-3" }) : allVisibleSelected ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }) : null
                    }
                  ),
                  "Select all (",
                  q ? visible.length : options.length,
                  ")"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                ref: listRef,
                role: "listbox",
                "aria-label": label,
                "aria-multiselectable": true,
                tabIndex: -1,
                onKeyDown: onListKeyDown,
                className: "overflow-y-auto p-1.5 outline-none",
                style: isMobile ? { maxHeight: "50vh" } : { maxHeight: LIST_MAX_HEIGHT },
                children: listContent
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2 border-t px-3 py-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[11px] tabular-nums text-muted-foreground", children: summary ? `Showing ${summary.shown} of ${summary.total} ${summary.noun ?? (summary.total === 1 ? "facility" : "facilities")}` : selected.length > 0 ? `${selected.length} selected` : "" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", size: "sm", className: "h-8", onClick: () => setOpen(false), children: "Done" })
            ] })
          ]
        }
      ),
      document.body
    )
  ] });
}

export { FilterDropdown as F, PaginationBar as P, RowViewSelect as R, serializeListFilters as a, defaultListFilters as b, defaultRowView as d, hasViewParams as h, loadRowView as l, parseListFilters as p, saveRowView as s, usePagination as u };
