const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-exceljs-CqnmHTS6.js","assets/icons-BxQpodNr.js"])))=>i.map(i=>d[i]);
import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { ay as Link2, aK as Globe, aL as Youtube, aM as HardDrive, aN as FileTypeCorner, u as FileText, aO as RectangleEllipsis, F as FileSpreadsheet, aP as Circle, aQ as Archive, aR as CirclePause, C as CircleCheck, aS as CircleDot, r as reactExports, m as Check, aq as Copy, aA as Star, aj as ChevronLeft, z as ChevronRight, a7 as Pencil, E as ExternalLink, k as Clock3, X as History, L as LoaderCircle, Y as Plus, a3 as X, Z as Upload, aT as MousePointerClick, ab as Undo2, H as ChevronDown, aU as Merge, T as TriangleAlert, aV as ArrowLeftRight, a9 as ArrowUp, a8 as ArrowDown, ac as Ellipsis, ar as Trash2, G as GripVertical, a6 as Sparkles, _ as BookMarked, Q as Search, aW as Funnel, ap as Table2, am as LayoutGrid, aX as ListTree, x as Columns3, aY as GitMerge, aZ as RefreshCw, a_ as CopyPlus, S as ShieldCheck, a2 as Download, a4 as Printer, a$ as Settings, aa as SlidersHorizontal } from './icons-BxQpodNr.js';
import { c as cn, m as useMutation, j as api, l as useQuery, B as Button, t as toast, o as useAction, b as useNavigate, d as useSearchParams } from './index-CBV6wOh8.js';
import { e as Popover, f as PopoverTrigger, g as PopoverContent, A as AppShell, aH as toDisplayStamp } from './AppShell-CP099uvN.js';
import { D as DateInput } from './DateInput-DZAT80St.js';
import { l as linkStatusDef, L as LINK_STATUS_TONE_CLASS, d as dueStateLabel, f as formatLinkDate, r as relativeUpdated, b as linkColour, v as validateLinkUrl, c as LINK_LABEL_MAX, e as frequencyLabel, g as LINK_VISIBILITY_LABEL, h as computeNextDue, i as LINK_LEVELS, j as LINK_VISIBILITIES, k as detectLinkType, n as normalizeLinkUrl, s as suggestLinkLabel, a as DEFAULT_LINK_STATUSES, D as DEFAULT_LINK_FREQUENCIES, m as LINK_TYPE_LABEL, o as linkDomain, p as looksLikeUrl, q as LINK_TABLE_ALL_COLUMNS, t as canRollForward, u as LINK_TABLE_DEFAULT_KEYS, w as quarterPeriodOf, x as nextQuarterPeriod, y as linkCountsLabel, z as linksFileName } from './links-B7waay9B.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from './dialog-BW3GEiPg.js';
import { I as Input } from './input-Cy2oZLur.js';
import { T as Textarea } from './textarea-Dm9kSFQo.js';
import { S as SaveBar, R as ReviewChangesDialog } from './SaveBar--TNBfs1X.js';
import { t as todayIsoIST, f as formatDateLong, p as parseDateText } from './dateInput-0KZh0HdG.js';
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { Highlight } from './CommandPalette-BvBfqZAr.js';
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, c as DropdownMenuLabel, f as DropdownMenuItem, g as DropdownMenuSeparator } from './dropdown-menu-N0nU9bdA.js';
import { S as StickyTableScroll, f as Table, T as TableHeader, a as TableRow, b as TableHead, c as TableBody, d as TableCell } from './table-DH4Byhhd.js';
import { B as Badge } from './badge-Cc2gQHFR.js';
import { A as AlertDialog, a as AlertDialogContent, b as AlertDialogHeader, c as AlertDialogTitle, d as AlertDialogDescription, e as AlertDialogFooter, f as AlertDialogCancel, g as AlertDialogAction } from './alert-dialog-CzPxJ0pO.js';
import { S as Skeleton } from './skeleton-D-jVDmpg.js';
import { l as loadBarState, r as rowPasses, U as UniversalFilterBar, s as saveBarState } from './UniversalFilterBar-uuD2kW1Y.js';
import { e as exportLinksExcel, a as exportLinksPdf, b as exportLinksCsv, p as printLinks, d as downloadLinksTemplate } from './linksExport-CxCdW-9a.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';

const TYPE_ICON = {
  sheet: { icon: FileSpreadsheet, className: "text-emerald-700" },
  form: { icon: RectangleEllipsis, className: "text-violet-700" },
  doc: { icon: FileText, className: "text-sky-700" },
  pdf: { icon: FileTypeCorner, className: "text-rose-700" },
  drive: { icon: HardDrive, className: "text-amber-700" },
  video: { icon: Youtube, className: "text-red-700" },
  web: { icon: Globe, className: "text-slate-600" },
  other: { icon: Link2, className: "text-slate-600" }
};
function linkTypeIcon(type) {
  return TYPE_ICON[type] ?? TYPE_ICON.other;
}
const STATUS_ICON = {
  CircleDot,
  CheckCircle2: CircleCheck,
  PauseCircle: CirclePause,
  Archive,
  Circle
};
function CategoryChip({
  name,
  colour,
  className
}) {
  const meta = linkColour(colour);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        meta.chip,
        className
      ),
      "data-tip": `${name} · ${meta.label}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("size-1.5 shrink-0 rounded-full", meta.dot), "aria-hidden": true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: name })
      ]
    }
  );
}
function StatusPill({
  status,
  config,
  className
}) {
  const def = linkStatusDef(config, status);
  const Icon = STATUS_ICON[def.icon] ?? CircleDot;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        LINK_STATUS_TONE_CLASS[def.tone],
        className
      ),
      role: "status",
      "aria-label": `Status: ${def.name}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5 shrink-0", "aria-hidden": true }),
        def.name
      ]
    }
  );
}
function DueChip({
  due,
  config,
  className,
  showNoDue = true
}) {
  if (due.state === "none" && !showNoDue) return null;
  const tone = due.state === "overdue" || due.state === "never" ? "border-rose-300/80 bg-rose-50 text-rose-900" : due.state === "due-soon" ? "border-amber-300/80 bg-amber-50 text-amber-900" : due.state === "up-to-date" ? "border-emerald-300/70 bg-emerald-50 text-emerald-900" : "border-border/70 bg-muted/40 text-muted-foreground";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tone,
        className
      ),
      "data-tip": due.nextDue ? `Next due ${formatLinkDate(due.nextDue)} · ${dueStateLabel(due, config)}` : dueStateLabel(due, config),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: dueStateLabel(due, config) })
    }
  );
}
function UpdatedCell({
  iso,
  today,
  onMark,
  canEdit
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group/date flex min-w-0 flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium tabular-nums text-foreground", children: iso ? formatLinkDate(iso) : "-" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: relativeUpdated(iso, today) }),
      canEdit && onMark && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: (event) => {
            event.stopPropagation();
            onMark();
          },
          className: "hidden text-[10px] font-semibold text-primary underline-offset-2 hover:underline focus-visible:inline group-hover/date:inline",
          children: "Mark updated"
        }
      )
    ] })
  ] });
}
function LinkChip({
  link,
  onCopied,
  className,
  compact
}) {
  const [copied, setCopied] = reactExports.useState(false);
  const { icon: Icon, className: iconClass } = linkTypeIcon(link.type);
  const domain = (() => {
    try {
      return new URL(link.url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  const label = link.label || domain || "Link";
  const shown = [...label].length > 28 ? `${[...label].slice(0, 27).join("")}…` : label;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: cn(
        "group/link inline-flex min-h-7 max-w-full items-center gap-1 rounded-md border border-border/60 bg-background/80 pr-0.5 pl-1.5 text-[11px]",
        compact && "min-h-11 w-full",
        className
      ),
      "data-tip": `${label}
${domain}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: cn("size-3.5 shrink-0", iconClass), "aria-hidden": true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: link.url,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "min-w-0 max-w-[10.5rem] truncate font-medium text-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            children: shown
          }
        ),
        link.checkStatus && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: cn(
              "ml-0.5 shrink-0 rounded border px-1 py-px text-[9px] font-semibold",
              link.checkStatus === "ok" && "border-emerald-300/70 bg-emerald-50 text-emerald-800",
              link.checkStatus === "not_found" && "border-rose-300/70 bg-rose-50 text-rose-800",
              link.checkStatus === "timeout" && "border-amber-300/70 bg-amber-50 text-amber-800",
              link.checkStatus !== "ok" && link.checkStatus !== "not_found" && link.checkStatus !== "timeout" && "border-border/60 bg-muted/40 text-muted-foreground"
            ),
            children: link.checkStatus === "ok" ? "OK" : link.checkStatus === "not_found" ? "Not found" : link.checkStatus === "timeout" ? "Timeout" : "Not checked"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "aria-label": `Copy ${label}`,
            onClick: (event) => {
              event.stopPropagation();
              void copy();
            },
            className: "ml-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none group-hover/link:opacity-100",
            children: copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-3" })
          }
        )
      ]
    }
  );
}
function PinStar({
  pinned,
  onToggle,
  canEdit,
  size = "sm"
}) {
  const Icon = Star;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      "aria-label": pinned ? "Unpin report" : "Pin report",
      "aria-pressed": pinned,
      disabled: !canEdit,
      onClick: (event) => {
        event.stopPropagation();
        onToggle?.();
      },
      className: cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        size === "sm" ? "size-6" : "size-8",
        pinned ? "text-amber-500" : "text-muted-foreground/60 hover:text-amber-500",
        !canEdit && "cursor-default"
      ),
      "data-tip": pinned ? "Pinned" : "Pin to the top",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: cn(size === "sm" ? "size-3.5" : "size-4", pinned && "fill-current"), "aria-hidden": true })
    }
  );
}

const DRAFT_PREFIX = "nqas.links.draft.";
const LAST_CATEGORY_KEY = "nqas.links.lastCategory";
function lastCategoryId(categories) {
  if (typeof window !== "undefined") {
    try {
      const id = window.localStorage.getItem(LAST_CATEGORY_KEY);
      if (id && categories.some((c) => c.id === id)) return id;
    } catch {
    }
  }
  return categories[0]?.id ?? "";
}
function emptyDraft(categoryId, visibility) {
  return {
    categoryId,
    title: "",
    description: "",
    frequency: "one-time",
    customDays: "",
    lastUpdated: "",
    ownerId: "",
    level: "",
    status: "Active",
    remarks: "",
    tags: "",
    visibility,
    pinned: false,
    urls: [{ label: "", url: "", kind: "link", isPrimary: true }]
  };
}
function itemToDraft(item) {
  const links = item.urls.filter((u) => u.kind !== "form");
  const form = item.urls.find((u) => u.kind === "form");
  const urlRows = links.map((u) => ({
    id: u.id,
    label: u.label,
    url: u.url,
    kind: "link",
    isPrimary: u.isPrimary,
    type: u.type
  }));
  if (!urlRows.length) {
    urlRows.push({ label: "", url: "", kind: "link", isPrimary: true });
  }
  if (form) {
    urlRows.push({
      id: form.id,
      label: form.label,
      url: form.url,
      kind: "form",
      isPrimary: false,
      type: form.type
    });
  }
  return {
    id: item.id,
    categoryId: item.categoryId,
    title: item.title,
    description: item.description ?? "",
    frequency: item.frequency,
    customDays: item.customDays != null ? String(item.customDays) : "",
    lastUpdated: item.lastUpdated ?? "",
    ownerId: item.ownerId ?? "",
    level: item.level ?? "",
    status: item.status,
    remarks: item.remarks ?? "",
    tags: (item.tags ?? []).join(", "),
    visibility: item.visibility,
    pinned: item.pinned,
    urls: urlRows
  };
}
function draftKey(id) {
  return `${DRAFT_PREFIX}${id ?? "new"}`;
}
function readDraft(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeDraft(key, draft) {
  if (typeof window === "undefined") return;
  try {
    if (draft) window.localStorage.setItem(key, JSON.stringify(draft));
    else window.localStorage.removeItem(key);
  } catch {
  }
}
function snapshotArgs(draft) {
  return {
    categoryId: draft.categoryId,
    title: draft.title.trim(),
    description: draft.description.trim() || void 0,
    frequency: draft.frequency,
    customDays: draft.frequency === "custom-days" ? Number(draft.customDays) || void 0 : void 0,
    lastUpdated: draft.lastUpdated || void 0,
    ownerId: draft.ownerId ? draft.ownerId : void 0,
    level: draft.level || void 0,
    status: draft.status,
    remarks: draft.remarks.trim() || void 0,
    tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
    visibility: draft.visibility,
    pinned: draft.pinned,
    urls: draft.urls.filter((u) => u.url.trim()).map((u) => ({
      label: u.label.trim(),
      url: u.url.trim(),
      kind: u.kind,
      isPrimary: u.kind !== "form" && u.isPrimary,
      type: u.type
    }))
  };
}
function makeChanges(before, draft, categories, owners, config) {
  if (!before) return [{ field: "new", label: "New report", from: "", to: draft.title || "Untitled", section: "overview" }];
  const changes = [];
  const add = (field, label, from, to) => {
    const a = String(from ?? "").trim();
    const b = String(to ?? "").trim();
    if (a !== b) changes.push({ field, label, from: a || "-", to: b || "-", section: "overview" });
  };
  add("title", "Report name", before.title, draft.title);
  add("description", "Description", before.description, draft.description);
  add(
    "category",
    "Category",
    categories.find((c) => c.id === before.categoryId)?.name,
    categories.find((c) => c.id === draft.categoryId)?.name
  );
  add("frequency", "Frequency", frequencyLabel(config, before.frequency), frequencyLabel(config, draft.frequency));
  add("lastUpdated", "Last updated", before.lastUpdated ? formatLinkDate(before.lastUpdated) : "-", draft.lastUpdated ? formatLinkDate(draft.lastUpdated) : "-");
  add("owner", "Owner", owners.find((o) => o.id === before.ownerId)?.name, owners.find((o) => o.id === draft.ownerId)?.name);
  add("level", "Level", before.level, draft.level);
  add("status", "Status", before.status, draft.status);
  add("remarks", "Remarks", before.remarks, draft.remarks);
  add("visibility", "Visibility", before.visibility, draft.visibility);
  add("tags", "Tags", before.tags, draft.tags);
  if (JSON.stringify(before.urls) !== JSON.stringify(draft.urls)) {
    changes.push({ field: "urls", label: "Links", from: `${before.urls.filter((u) => u.url).length} links`, to: `${draft.urls.filter((u) => u.url).length} links`, section: "overview" });
  }
  return changes;
}
function LinkDialog({
  open,
  onOpenChange,
  item,
  categories,
  owners,
  config,
  me,
  prev,
  next,
  onPrevious,
  onNext,
  onMarkUpdated,
  onAddCategory,
  onAddOwner,
  onDeleted,
  startInEdit = false,
  existingUrls,
  existingTitles = []
}) {
  const today = todayIsoIST();
  const editingItem = item;
  const [mode, setMode] = reactExports.useState(item && !startInEdit ? "view" : "edit");
  const [draft, setDraft] = reactExports.useState(
    () => editingItem ? itemToDraft(editingItem) : emptyDraft(lastCategoryId(categories), config.defaultVisibility)
  );
  const [before, setBefore] = reactExports.useState(editingItem ? itemToDraft(editingItem) : null);
  const [reviewOpen, setReviewOpen] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const [savedLabel, setSavedLabel] = reactExports.useState(null);
  const [showAudit, setShowAudit] = reactExports.useState(false);
  const createLink = useMutation(api.links.createLink);
  const updateLink = useMutation(api.links.updateLink);
  useMutation(api.links.deleteLinkPermanently);
  reactExports.useEffect(() => {
    if (!open) return;
    const initial = editingItem ? itemToDraft(editingItem) : emptyDraft(lastCategoryId(categories), config.defaultVisibility);
    const cached = readDraft(draftKey(editingItem?.id));
    setBefore(editingItem ? itemToDraft(editingItem) : null);
    setDraft(cached ?? initial);
    setMode(editingItem && !startInEdit ? "view" : "edit");
    setSavedLabel(null);
    setReviewOpen(false);
    setShowAudit(false);
  }, [open, editingItem?.id, startInEdit, config.defaultVisibility]);
  const key = draftKey(editingItem?.id);
  const changes = reactExports.useMemo(
    () => makeChanges(before, draft, categories, owners, config),
    [before, draft, categories, owners, config]
  );
  const dirty = changes.length > 0;
  const dirtyRef = reactExports.useMemo(() => ({ value: false }), []);
  dirtyRef.value = dirty;
  reactExports.useEffect(() => {
    if (!open) return;
    if (!dirty) {
      writeDraft(key, null);
      return;
    }
    const handle = window.setTimeout(() => writeDraft(key, draft), 300);
    return () => window.clearTimeout(handle);
  }, [open, dirty, draft, key]);
  const issues = reactExports.useMemo(() => {
    const out = [];
    const add = (field, message) => out.push({ field, message, severity: "blocking", section: "overview" });
    if (!draft.title.trim()) add("title", "Report name is required");
    if (!draft.categoryId) add("categoryId", "Choose a category");
    if (!config.frequencies.some((f) => f.value === draft.frequency)) add("frequency", "Choose a frequency");
    if (draft.frequency === "custom-days" && (!Number(draft.customDays) || Number(draft.customDays) <= 0)) {
      add("customDays", "Enter the number of days");
    }
    if (draft.lastUpdated && draft.lastUpdated > today) add("lastUpdated", "Last updated cannot be in the future");
    if (draft.title.trim() && existingTitles.some(
      (candidate) => candidate.categoryId === draft.categoryId && candidate.id !== editingItem?.id && candidate.title.trim().toLowerCase() === draft.title.trim().toLowerCase()
    )) {
      out.push({
        field: "title",
        message: "A report with this name already exists in this category. Saving is allowed — consider a distinguishing name or category.",
        severity: "warning",
        section: "overview"
      });
    }
    const filled = draft.urls.filter((u) => u.url.trim());
    if (filled.length === 0) add("urls", "Add at least one link");
    if (filled.length > 10) add("urls", "At most 10 links");
    for (const [i, link] of filled.entries()) {
      const check = validateLinkUrl(link.url);
      if (!check.ok) add(`url-${i}`, check.error ?? "Invalid link");
      if (link.label.length > LINK_LABEL_MAX) add(`label-${i}`, `Label is longer than ${LINK_LABEL_MAX} characters`);
    }
    const linkRows = filled.filter((u) => u.kind !== "form");
    if (linkRows.length && !linkRows.some((u) => u.isPrimary)) add("urls", "Choose one primary link");
    if (filled.filter((u) => u.kind === "form").length > 1) add("urls", "Only one form link is allowed");
    return out;
  }, [draft, config.frequencies, today, existingTitles, editingItem?.id]);
  const audit = useQuery(api.links.auditFor, open && editingItem ? { id: editingItem.id } : "skip");
  const logs = useQuery(api.links.updateLog, open && editingItem ? { id: editingItem.id } : "skip");
  const set = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const updateUrl = (index, patch) => {
    setDraft((current) => ({
      ...current,
      urls: current.urls.map((u, i) => i === index ? { ...u, ...patch } : u)
    }));
  };
  const pasteUrl = (index, text) => {
    const check = validateLinkUrl(text);
    const normalized = normalizeLinkUrl(text);
    if (!normalized) return;
    setDraft((current) => ({
      ...current,
      urls: current.urls.map((u, i) => {
        if (i !== index) return u;
        return {
          ...u,
          url: normalized,
          label: u.label.trim() || suggestLinkLabel(normalized),
          type: detectLinkType(normalized)
        };
      })
    }));
    if (check.error) toast.warning(check.error);
    const duplicate = draft.urls.some((u, i) => i !== index && u.url && normalizeLinkUrl(u.url) === check.url);
    if (duplicate) toast.warning("This URL is already in this report");
    const otherTitle = existingUrls?.get(normalizeLinkUrl(normalized));
    if (otherTitle && otherTitle !== editingItem?.title) {
      toast.warning(`Already in SaQsham — used by “${otherTitle}”`);
    }
  };
  const save = async (thenNext = false) => {
    if (issues.some((i) => i.severity === "blocking")) {
      toast.error("Fix the highlighted fields before saving");
      return;
    }
    setSaving(true);
    try {
      const args = snapshotArgs(draft);
      let savedId = editingItem?.id;
      if (editingItem) {
        await updateLink({ id: editingItem.id, ...args });
      } else {
        const result = await createLink({ ...args, pinned: draft.pinned });
        savedId = result.id;
        try {
          window.localStorage.setItem(LAST_CATEGORY_KEY, draft.categoryId);
        } catch {
        }
      }
      writeDraft(key, null);
      if (savedId) writeDraft(draftKey(savedId), null);
      setBefore(draft);
      setSavedLabel(`Saved ${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`);
      toast.success(editingItem ? "Link updated" : "Link added", {
        description: "The change is in the audit log."
      });
      if (thenNext) {
        setSavedLabel(null);
        onNext();
      } else if (!editingItem) {
        onOpenChange(false);
      } else {
        setMode("view");
        onDeleted();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the link");
    } finally {
      setSaving(false);
    }
  };
  const addLinkRow = () => {
    if (draft.urls.filter((u) => u.kind !== "form").length >= 10) {
      toast.error("A report can have at most 10 links");
      return;
    }
    setDraft((current) => ({
      ...current,
      urls: [...current.urls, { label: "", url: "", kind: "link", isPrimary: false, type: "web" }]
    }));
  };
  const removeUrl = (index) => {
    setDraft((current) => {
      const removed = current.urls[index];
      const next2 = current.urls.filter((_, i) => i !== index);
      if (removed?.isPrimary && next2.some((u) => u.kind !== "form")) {
        const first = next2.find((u) => u.kind !== "form");
        if (first) first.isPrimary = true;
      }
      return { ...current, urls: next2 };
    });
  };
  const formDraft = draft.urls.find((u) => u.kind === "form");
  const formIndex = draft.urls.findIndex((u) => u.kind === "form");
  const viewLinks = item?.urls ?? [];
  const canAdd = !!draft.title.trim() && draft.urls.some((u) => u.kind !== "form" && validateLinkUrl(u.url).ok);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: (nextOpen) => {
      if (!nextOpen && dirtyRef.value) writeDraft(key, draft);
      onOpenChange(nextOpen);
    }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { className: "shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 pr-12 text-left sm:px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-start gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2 text-lg leading-tight", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0", children: item?.title ?? "Add link" }),
            item && /* @__PURE__ */ jsxRuntimeExports.jsx(PinStar, { pinned: item.pinned, canEdit: me.canEdit, onToggle: () => {
            } })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "mt-1 flex flex-wrap items-center gap-1.5", children: item ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CategoryChip, { name: item.categoryName, colour: item.categoryColour }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { status: item.status, config }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DueChip, { due: item.due, config }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground", children: [
              "S. No ",
              item.serial
            ] })
          ] }) : "A report or data-collection link, with a schedule and an owner." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [
          item && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", onClick: onPrevious, disabled: !prev, "aria-label": "Previous link", "data-tip": prev ? prev.title : "No previous link", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "size-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", onClick: onNext, disabled: !next, "aria-label": "Next link", "data-tip": next ? next.title : "No next link", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-4" }) })
          ] }),
          item && me.canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              size: "sm",
              variant: mode === "edit" ? "secondary" : "outline",
              className: "ml-1 gap-1.5",
              onClick: () => {
                if (mode === "edit" && editingItem) setDraft(itemToDraft(editingItem));
                setMode(mode === "edit" ? "view" : "edit");
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-3.5" }),
                " ",
                mode === "edit" ? "View" : "Edit"
              ]
            }
          )
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6", children: mode === "view" && item ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { className: "size-3.5" }),
            " Links"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 sm:grid-cols-2", children: [
            viewLinks.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LinkChip, { link: { label: u.label, url: u.url, type: u.type }, className: "min-w-0 flex-1" }),
              u.isPrimary && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary", children: "Primary" }),
              u.kind === "form" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800", children: "Form" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: u.url, target: "_blank", rel: "noopener noreferrer", className: "shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground", "aria-label": `Open ${u.label}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3.5" }) })
            ] }, u.id)),
            viewLinks.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "No links yet." })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "grid gap-3 rounded-xl border border-border/60 bg-background/60 p-3 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "Frequency", value: frequencyLabel(config, item.frequency) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "Last updated", value: item.lastUpdated ? formatLinkDate(item.lastUpdated) : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "Next due", value: item.nextDue ? formatLinkDate(item.nextDue) : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "Due state", value: item.due.state === "never" ? "Never updated" : item.due.state === "overdue" ? `${Math.abs(item.due.days ?? 0)} days overdue` : item.due.state === "due-soon" ? `Due in ${item.due.days ?? 0} days` : "Up to date" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "Owner", value: item.ownerName ?? "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "Level", value: item.level ?? "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "Visibility", value: LINK_VISIBILITY_LABEL[item.visibility] ?? item.visibility }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "Tags", value: (item.tags ?? []).join(", ") || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sm:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "Description", value: item.description ?? "-" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sm:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Detail, { label: "Remarks", value: item.remarks ?? "-" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sm:col-span-2 flex flex-wrap gap-2", children: [
            me.canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", onClick: () => onMarkUpdated(item), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Clock3, { className: "mr-1 size-3.5" }),
              " Mark as updated"
            ] }),
            item.urls.find((u) => u.isPrimary && u.kind !== "form") && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: item.urls.find((u) => u.isPrimary && u.kind !== "form").url, target: "_blank", rel: "noopener noreferrer", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "mr-1 size-3.5" }),
              " Open primary link"
            ] }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-3.5" }),
            " Update history"
          ] }),
          logs === void 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Loading history…" }) : logs.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "No updates logged yet." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1.5", children: logs.slice(0, 8).map((log) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex flex-wrap items-baseline gap-x-2 rounded-md border border-border/40 px-2 py-1 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium tabular-nums", children: formatLinkDate(log.updatedOn) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: log.updatedByName ?? "—" }),
            log.periodNote && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary", children: log.periodNote }),
            log.note && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "basis-full text-muted-foreground", children: log.note })
          ] }, log._id)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "rounded-lg border border-border/60 px-3 py-2", open: showAudit, onToggle: (e) => setShowAudit(e.currentTarget.open), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "cursor-pointer text-xs font-semibold text-muted-foreground", children: "Audit — who changed what" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 space-y-1", children: [
            (audit ?? []).slice(0, 8).map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: row.changedByName ?? "System" }),
              " ",
              row.action,
              " ",
              row.field ?? "",
              " · ",
              formatLinkDate(new Date(row.changedAt).toISOString().slice(0, 10))
            ] }, row.id)),
            (audit ?? []).length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "No audit entries yet." })
          ] })
        ] })
      ] }) : editingItem ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        LinkForm,
        {
          draft,
          set,
          categories,
          owners,
          config,
          today,
          issues,
          setDraft,
          updateUrl,
          removeUrl,
          addLinkRow,
          pasteUrl,
          formDraft,
          formIndex,
          onAddCategory,
          onAddOwner
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        NewLinkForm,
        {
          draft,
          set,
          categories,
          owners,
          config,
          today,
          issues,
          setDraft,
          updateUrl,
          removeUrl,
          addLinkRow,
          pasteUrl,
          formDraft,
          formIndex,
          onAddCategory,
          onAddOwner,
          onSubmit: () => void save(false)
        }
      ) }),
      editingItem ? mode === "edit" && me.canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 border-t border-border/60 bg-background/95 px-4 py-2 sm:px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        SaveBar,
        {
          changes,
          issues,
          saving,
          savedLabel,
          dirty,
          onDiscard: () => {
            setDraft(itemToDraft(editingItem));
            setMode("view");
            writeDraft(key, null);
          },
          onSave: () => void save(false),
          onSaveAndNext: () => void save(true),
          onReview: () => setReviewOpen(true),
          onFocusIssue: () => void 0,
          canSaveAndNext: !!next
        }
      ) }) : me.canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center justify-between gap-2 border-t border-border/60 bg-background/95 px-4 py-2.5 sm:px-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: canAdd ? "Name and URL look good." : "A name and one valid URL are required." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => onOpenChange(false), children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "submit", form: "link-form", size: "sm", disabled: !canAdd || saving, children: [
            saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-1 size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-1 size-3.5" }),
            "Add link"
          ] })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ReviewChangesDialog,
      {
        open: reviewOpen,
        onOpenChange: setReviewOpen,
        changes,
        issues,
        statusNotice: null,
        onConfirm: () => {
          setReviewOpen(false);
          void save(false);
        },
        saving
      }
    )
  ] });
}
function Detail({ label, value }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 break-words text-sm", children: value || "-" })
  ] });
}
function LinkForm({
  draft,
  set,
  categories,
  owners,
  config,
  today,
  issues,
  setDraft,
  updateUrl,
  removeUrl,
  addLinkRow,
  pasteUrl,
  formDraft,
  formIndex,
  onAddCategory,
  onAddOwner
}) {
  const linked = draft.urls.filter((u) => u.kind !== "form");
  const errorFor = (field) => issues.find((i) => i.field === field)?.message;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Report name *", error: errorFor("title"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: draft.title, onChange: (e) => set("title", e.target.value), maxLength: 200, placeholder: "e.g. NQAS Internal Assessment Checklist", autoFocus: true }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Category *", error: errorFor("categoryId"), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: draft.categoryId,
            onChange: (e) => set("categoryId", e.target.value),
            className: "h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm",
            "aria-label": "Category",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Choose a category" }),
              categories.filter((c) => c.active || c.id === draft.categoryId).map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c.id, children: c.name }, c.id))
            ]
          }
        ),
        onAddCategory && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", size: "sm", variant: "outline", className: "h-10", onClick: onAddCategory, "data-tip": "Add a category in Admin → Links", children: "+" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Description", className: "sm:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { value: draft.description, onChange: (e) => set("description", e.target.value), rows: 2, maxLength: 500, placeholder: "What is this report for?" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Field, { label: "Frequency *", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: draft.frequency, onChange: (e) => set("frequency", e.target.value), className: "h-10 w-full rounded-md border border-input bg-background px-2 text-sm", "aria-label": "Frequency", children: config.frequencies.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: f.value, children: f.label }, f.value)) }),
        draft.frequency === "custom-days" && /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", min: 1, max: 3650, value: draft.customDays, onChange: (e) => set("customDays", e.target.value), placeholder: "Days between updates", className: "mt-1.5 h-9" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Field, { label: "Last updated", error: errorFor("lastUpdated"), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DateInput, { id: "link-last-updated", label: "Last updated", value: draft.lastUpdated, onChange: (iso) => set("lastUpdated", iso), max: today, today, emptyLabel: "Not updated", className: "min-w-0 flex-1" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", size: "sm", variant: "outline", className: "h-10", onClick: () => set("lastUpdated", today), children: "Today" })
        ] }),
        draft.frequency !== "one-time" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: (() => {
          const next = computeNextDue(
            draft.lastUpdated,
            draft.frequency,
            Number(draft.customDays) || null,
            config.frequencies
          );
          return next ? `Next due ${formatLinkDate(next)}` : "Not updated yet";
        })() })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Owner", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: draft.ownerId, onChange: (e) => set("ownerId", e.target.value), className: "h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm", "aria-label": "Owner", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "No owner" }),
          owners.filter((o) => o.active || o.id === draft.ownerId).map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o.id, children: o.name }, o.id))
        ] }),
        onAddOwner && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", size: "sm", variant: "outline", className: "h-10", onClick: onAddOwner, "data-tip": "Add an owner in Admin → Links", children: "+" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Level", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: draft.level, onChange: (e) => set("level", e.target.value), className: "h-10 w-full rounded-md border border-input bg-background px-2 text-sm", "aria-label": "Level", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Not set" }),
        LINK_LEVELS.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: l, children: l }, l))
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Status", children: /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: draft.status, onChange: (e) => set("status", e.target.value), className: "h-10 w-full rounded-md border border-input bg-background px-2 text-sm", "aria-label": "Status", children: config.statuses.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s.name, children: s.name }, s.name)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Visibility", children: /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: draft.visibility, onChange: (e) => set("visibility", e.target.value), className: "h-10 w-full rounded-md border border-input bg-background px-2 text-sm", "aria-label": "Visibility", children: LINK_VISIBILITIES.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v, children: LINK_VISIBILITY_LABEL[v] }, v)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Tags", className: "sm:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: draft.tags, onChange: (e) => set("tags", e.target.value), placeholder: "comma-separated, e.g. IA, quarterly, Kayakalp" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Remarks", className: "sm:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { value: draft.remarks, onChange: (e) => set("remarks", e.target.value), rows: 2, maxLength: 500, placeholder: "e.g. 4th Quarter (2025-26)" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 p-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: "Links" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "Paste a URL anywhere in the field — the type and label are suggested. Max 10." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", size: "sm", variant: "outline", onClick: addLinkRow, disabled: linked.length >= 10, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-1 size-3.5" }),
          " Add link"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: linked.map((u) => {
        const index = draft.urls.indexOf(u);
        const Icon = linkTypeIcon(u.type ?? detectLinkType(u.url)).icon;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-1.5 rounded-lg border border-border/50 bg-background/60 p-2 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", name: "primary-link", checked: u.isPrimary, onChange: () => setDraft((current) => ({ ...current, urls: current.urls.map((row) => ({ ...row, isPrimary: row.kind !== "form" && row === u })) })) }),
            "Primary"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { "aria-label": "Link label", value: u.label, maxLength: LINK_LABEL_MAX, onChange: (e) => updateUrl(index, { label: e.target.value }), placeholder: "Label (e.g. PHC checklist)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                "aria-label": "Link URL",
                value: u.url,
                onChange: (e) => updateUrl(index, { url: e.target.value }),
                onPaste: (e) => {
                  const text = e.clipboardData.getData("text");
                  if (!text) return;
                  if (/^https?:\/\//i.test(text.trim()) || /^[\w.-]+\.[a-z]{2,}/i.test(text.trim())) {
                    e.preventDefault();
                    pasteUrl(index, text);
                  }
                },
                onBlur: () => {
                  if (u.url && !u.type) updateUrl(index, { type: detectLinkType(u.url) });
                },
                placeholder: "https://…",
                className: "pl-7"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", size: "icon", variant: "ghost", onClick: () => removeUrl(index), "aria-label": "Remove link", className: "size-9", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" }) }),
          errorFor(`url-${draft.urls.indexOf(u)}`) && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-destructive sm:col-span-4", children: errorFor(`url-${draft.urls.indexOf(u)}`) })
        ] }, index);
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-lg border border-violet-200 bg-violet-50/40 p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-violet-900", children: "Form link" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-violet-700", children: "optional · one form per report" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            "aria-label": "Form link URL",
            className: "mt-1.5 bg-background",
            value: formDraft?.url ?? "",
            placeholder: "https://forms.gle/…",
            onPaste: (e) => {
              const text = e.clipboardData.getData("text").trim();
              if (!/^https?:\/\//i.test(text)) return;
              e.preventDefault();
              const nextUrl = normalizeLinkUrl(text);
              const entry = { label: suggestLinkLabel(nextUrl), url: nextUrl, kind: "form", isPrimary: false, type: "form" };
              setDraft((current) => ({
                ...current,
                urls: formIndex >= 0 ? current.urls.map((u, i) => i === formIndex ? { ...u, ...entry } : u) : [...current.urls, entry]
              }));
            },
            onChange: (e) => {
              const value = e.target.value;
              setDraft((current) => {
                if (formIndex >= 0) {
                  return { ...current, urls: current.urls.map((u, i) => i === formIndex ? { ...u, url: value, type: "form" } : u) };
                }
                return { ...current, urls: [...current.urls, { label: "", url: value, kind: "form", isPrimary: false, type: "form" }] };
              });
            }
          }
        ),
        formDraft && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              "aria-label": "Form link label",
              value: formDraft.label,
              maxLength: LINK_LABEL_MAX,
              placeholder: "Form label",
              onChange: (e) => updateUrl(formIndex, { label: e.target.value }),
              className: "h-8 bg-background"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => removeUrl(formIndex), children: "Remove" })
        ] })
      ] })
    ] })
  ] });
}
function NewLinkForm({
  draft,
  set,
  categories,
  owners,
  config,
  today,
  issues,
  setDraft,
  updateUrl,
  removeUrl,
  addLinkRow,
  pasteUrl,
  formDraft,
  formIndex,
  onAddCategory,
  onAddOwner,
  onSubmit
}) {
  const [touched, setTouched] = reactExports.useState({});
  const [submitted, setSubmitted] = reactExports.useState(false);
  const errorFor = (field) => submitted || touched[field] ? issues.find((i) => i.field === field)?.message : void 0;
  const mark = (field) => () => setTouched((current) => current[field] ? current : { ...current, [field]: true });
  const linked = draft.urls.filter((u) => u.kind !== "form");
  const primary = linked[0];
  const primaryIndex = primary ? draft.urls.indexOf(primary) : -1;
  const extra = linked.slice(1);
  const next = computeNextDue(
    draft.lastUpdated,
    draft.frequency,
    Number(draft.customDays) || null,
    config.frequencies
  );
  const looksLikeUrl = (text) => /^https?:\/\//i.test(text) || /^[\w.-]+\.[a-z]{2,}/i.test(text);
  const submit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    onSubmit();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { id: "link-form", onSubmit: submit, className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Report name *", error: errorFor("title"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Input,
      {
        value: draft.title,
        onChange: (e) => set("title", e.target.value),
        onBlur: mark("title"),
        onPaste: (e) => {
          const text = e.clipboardData.getData("text").trim();
          if (!text || !looksLikeUrl(text)) return;
          e.preventDefault();
          pasteUrl(primaryIndex, text);
          if (!draft.title.trim()) {
            set("title", suggestLinkLabel(normalizeLinkUrl(text) ?? text));
          }
        },
        maxLength: 200,
        placeholder: "e.g. NQAS Internal Assessment Checklist",
        autoFocus: true
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "URL *", error: primary ? errorFor(`url-${primaryIndex}`) : void 0, children: primary ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        (() => {
          const Icon = linkTypeIcon(primary.type ?? detectLinkType(primary.url)).icon;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" });
        })(),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            "aria-label": "Link URL",
            value: primary.url,
            onChange: (e) => updateUrl(primaryIndex, { url: e.target.value }),
            onPaste: (e) => {
              const text = e.clipboardData.getData("text").trim();
              if (!looksLikeUrl(text)) return;
              e.preventDefault();
              pasteUrl(primaryIndex, text);
            },
            onBlur: () => {
              mark(`url-${primaryIndex}`)();
              if (primary.url && !primary.type) {
                updateUrl(primaryIndex, { type: detectLinkType(primary.url) });
              }
            },
            placeholder: "https://…",
            className: "pl-7"
          }
        )
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", size: "sm", variant: "outline", onClick: addLinkRow, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-1 size-3.5" }),
        " Add URL"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Label (optional)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          value: primary?.label ?? "",
          maxLength: LINK_LABEL_MAX,
          placeholder: "e.g. PHC checklist",
          onChange: (e) => {
            if (primary) updateUrl(primaryIndex, { label: e.target.value });
          }
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "group rounded-xl border border-border/60 px-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "cursor-pointer list-none text-sm font-semibold text-foreground marker:hidden", children: [
        "More details",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1.5 text-[11px] font-normal text-muted-foreground", children: "category, schedule, owner, visibility…" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Category *", error: errorFor("categoryId"), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: draft.categoryId,
                onChange: (e) => set("categoryId", e.target.value),
                onBlur: mark("categoryId"),
                className: "h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm",
                "aria-label": "Category",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Choose a category" }),
                  categories.filter((c) => c.active || c.id === draft.categoryId).map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c.id, children: c.name }, c.id))
                ]
              }
            ),
            onAddCategory && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", size: "sm", variant: "outline", className: "h-10", onClick: onAddCategory, "data-tip": "Add a category in Admin → Links", children: "+" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Field, { label: "Frequency", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                value: draft.frequency,
                onChange: (e) => set("frequency", e.target.value),
                className: "h-10 w-full rounded-md border border-input bg-background px-2 text-sm",
                "aria-label": "Frequency",
                children: config.frequencies.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: f.value, children: f.label }, f.value))
              }
            ),
            draft.frequency === "custom-days" && /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                type: "number",
                min: 1,
                max: 3650,
                value: draft.customDays,
                onChange: (e) => set("customDays", e.target.value),
                placeholder: "Days between updates",
                className: "mt-1.5 h-9"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Field, { label: "Last updated", error: errorFor("lastUpdated"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                DateInput,
                {
                  id: "link-last-updated",
                  label: "Last updated",
                  value: draft.lastUpdated,
                  onChange: (iso) => set("lastUpdated", iso),
                  max: today,
                  today,
                  emptyLabel: "Not updated",
                  className: "min-w-0 flex-1"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", size: "sm", variant: "outline", className: "h-10", onClick: () => set("lastUpdated", today), children: "Today" })
            ] }),
            draft.frequency !== "one-time" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: next ? `Next due ${formatLinkDate(next)}` : "Not updated yet" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Owner", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: draft.ownerId,
                onChange: (e) => set("ownerId", e.target.value),
                className: "h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm",
                "aria-label": "Owner",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "No owner" }),
                  owners.filter((o) => o.active || o.id === draft.ownerId).map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o.id, children: o.name }, o.id))
                ]
              }
            ),
            onAddOwner && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", size: "sm", variant: "outline", className: "h-10", onClick: onAddOwner, "data-tip": "Add an owner in Admin → Links", children: "+" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Level", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              value: draft.level,
              onChange: (e) => set("level", e.target.value),
              className: "h-10 w-full rounded-md border border-input bg-background px-2 text-sm",
              "aria-label": "Level",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Not set" }),
                LINK_LEVELS.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: l, children: l }, l))
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Status", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              value: draft.status,
              onChange: (e) => set("status", e.target.value),
              className: "h-10 w-full rounded-md border border-input bg-background px-2 text-sm",
              "aria-label": "Status",
              children: config.statuses.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s.name, children: s.name }, s.name))
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Visibility", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              value: draft.visibility,
              onChange: (e) => set("visibility", e.target.value),
              className: "h-10 w-full rounded-md border border-input bg-background px-2 text-sm",
              "aria-label": "Visibility",
              children: LINK_VISIBILITIES.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v, children: LINK_VISIBILITY_LABEL[v] }, v))
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Tags", className: "sm:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              value: draft.tags,
              onChange: (e) => set("tags", e.target.value),
              placeholder: "comma-separated, e.g. IA, quarterly, Kayakalp"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Remarks", className: "sm:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Textarea,
            {
              value: draft.remarks,
              onChange: (e) => set("remarks", e.target.value),
              rows: 2,
              maxLength: 500,
              placeholder: "e.g. 4th Quarter (2025-26)"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Description", className: "sm:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Textarea,
            {
              value: draft.description,
              onChange: (e) => set("description", e.target.value),
              rows: 2,
              maxLength: 500,
              placeholder: "What is this report for?"
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: "Extra links" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", size: "sm", variant: "outline", onClick: addLinkRow, disabled: linked.length >= 10, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-1 size-3.5" }),
              " Add another link"
            ] })
          ] }),
          extra.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "Optional — one report can point to several pages." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: extra.map((u) => {
            const index = draft.urls.indexOf(u);
            const Icon = linkTypeIcon(u.type ?? detectLinkType(u.url)).icon;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-1.5 rounded-lg border border-border/50 bg-background/60 p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  "aria-label": "Link label",
                  value: u.label,
                  maxLength: LINK_LABEL_MAX,
                  onChange: (e) => updateUrl(index, { label: e.target.value }),
                  placeholder: "Label"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    "aria-label": "Link URL",
                    value: u.url,
                    onChange: (e) => updateUrl(index, { url: e.target.value }),
                    onBlur: () => {
                      if (u.url && !u.type) updateUrl(index, { type: detectLinkType(u.url) });
                    },
                    placeholder: "https://…",
                    className: "pl-7"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", size: "icon", variant: "ghost", onClick: () => removeUrl(index), "aria-label": "Remove link", className: "size-9", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" }) })
            ] }, index);
          }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-lg border border-violet-200 bg-violet-50/40 p-2 dark:border-violet-400/30 dark:bg-violet-500/10", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-violet-900 dark:text-violet-100", children: "Form link" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-violet-700 dark:text-violet-200", children: "optional · one form per report" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              "aria-label": "Form link URL",
              className: "mt-1.5 bg-background",
              value: formDraft?.url ?? "",
              placeholder: "https://forms.gle/…",
              onPaste: (e) => {
                const text = e.clipboardData.getData("text").trim();
                if (!/^https?:\/\//i.test(text)) return;
                e.preventDefault();
                const nextUrl = normalizeLinkUrl(text);
                const entry = {
                  label: suggestLinkLabel(nextUrl),
                  url: nextUrl,
                  kind: "form",
                  isPrimary: false,
                  type: "form"
                };
                setDraft((current) => ({
                  ...current,
                  urls: formIndex >= 0 ? current.urls.map((u, i) => i === formIndex ? { ...u, ...entry } : u) : [...current.urls, entry]
                }));
              },
              onChange: (e) => {
                const value = e.target.value;
                setDraft((current) => {
                  if (formIndex >= 0) {
                    return {
                      ...current,
                      urls: current.urls.map(
                        (u, i) => i === formIndex ? { ...u, url: value, type: "form" } : u
                      )
                    };
                  }
                  return {
                    ...current,
                    urls: [...current.urls, { label: "", url: value, kind: "form", isPrimary: false, type: "form" }]
                  };
                });
              }
            }
          ),
          formDraft && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                "aria-label": "Form link label",
                value: formDraft.label,
                maxLength: LINK_LABEL_MAX,
                placeholder: "Form label",
                onChange: (e) => updateUrl(formIndex, { label: e.target.value }),
                className: "h-8 bg-background"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => removeUrl(formIndex), children: "Remove" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
function Field({
  label,
  error,
  className,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("min-w-0", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", children: label }),
    children,
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "mt-1 text-[11px] font-medium text-destructive", children: error })
  ] });
}

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
  remarks: [/remarks?/i, /notes?/i, /period/i]
};
function parseLinksText(text) {
  const normalized = text.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");
  const lines = normalized.split("\n").filter((line) => line.trim() !== "");
  if (!lines.length) return [];
  const delimiter = lines.some((line) => line.includes("	")) ? "	" : lines.some((line) => line.includes(",")) ? "," : "	";
  return lines.map((line) => parseDelimitedLine(line, delimiter));
}
function parseDelimitedLine(line, delimiter) {
  const out = [];
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
function parseLinksHtml(html) {
  if (typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) return [];
  const rows = [];
  for (const tr of Array.from(table.querySelectorAll("tr"))) {
    const cells = [];
    for (const cell of Array.from(tr.querySelectorAll("th,td"))) {
      const anchor = cell.querySelector("a[href]");
      const text = (cell.textContent ?? "").trim();
      if (anchor?.href) cells.push({ text, url: anchor.href });
      else cells.push(text);
    }
    if (cells.length) rows.push(cells);
  }
  return rows;
}
function firstHeaderRow(rows) {
  for (let i = 0; i < Math.min(12, rows.length); i += 1) {
    const filled = (rows[i] ?? []).filter((c) => cellText(c) !== "");
    if (filled.length >= 3) return i;
  }
  return 0;
}
function headerMap(headers) {
  const map = {};
  const used = /* @__PURE__ */ new Set();
  for (const [key, patterns] of Object.entries(HEADER_PATTERNS)) {
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
  if (map.link != null && map.form != null && map.link === map.form) {
    const idx = headers.findIndex((h, i) => i > map.link && /form/i.test(h));
    map.form = idx >= 0 ? idx : null;
  }
  return map;
}
function cellText(cell) {
  if (cell == null) return "";
  if (typeof cell === "object" && !(cell instanceof Date)) {
    return String(cell.text ?? "").replace(/\s+/g, " ").trim();
  }
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell).replace(/\s+/g, " ").trim();
}
function cellUrl(cell) {
  if (cell == null || typeof cell !== "object" || cell instanceof Date) return "";
  return String(cell.url ?? cell.hyperlink ?? "").trim();
}
function excelSerialToIso(serial) {
  if (!Number.isFinite(serial) || serial < 1 || serial > 1e5) return null;
  const ms = Math.round(serial) * 864e5 + Date.UTC(1899, 11, 30);
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}
function parseLinkDateCell(cell, today) {
  if (cell instanceof Date) {
    const iso2 = cell.toISOString().slice(0, 10);
    return { iso: iso2, error: iso2 > today ? `Last updated ${formatDateLong(iso2)} is in the future` : null };
  }
  const raw = cellText(cell);
  if (!raw || raw === "-") return { iso: "", error: null };
  if (typeof cell === "number" || /^\d{5}(\.\d+)?$/.test(raw)) {
    const serial = typeof cell === "number" ? cell : Number(raw);
    const iso2 = excelSerialToIso(serial);
    if (!iso2) return { iso: "", error: `Could not read the date “${raw}”` };
    return { iso: iso2, error: iso2 > today ? `Last updated ${formatDateLong(iso2)} is in the future` : null };
  }
  const iso = parseDateText(raw);
  if (!iso) return { iso: "", error: `Could not read the date “${raw}” — use DD-MMM-YYYY or DD-MM-YYYY` };
  if (iso > today) return { iso, error: `Last updated ${formatDateLong(iso)} is in the future` };
  return { iso, error: null };
}
function parseFrequencyText(raw) {
  const text = raw.toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  if (!text || text === "-" || text === "none") return { value: "one-time", unknown: false };
  const custom = text.match(/(?:every\s*)?(\d+)\s*days?/);
  if (custom) {
    const days = Number(custom[1]);
    return { value: "custom-days", customDays: days > 0 ? days : void 0, unknown: false };
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
function comparable(value) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\b(datas|data|sheet|sheets|collection)\b/g, (m) => m === "datas" ? "data" : m).replace(/\s+/g, " ").trim().replace(/s$/, "");
}
function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      diag = temp;
    }
  }
  return prev[b.length];
}
function suggestExisting(value, options) {
  const raw = value.trim();
  if (!raw) return null;
  const exact = options.find((o) => o.toLowerCase() === raw.toLowerCase());
  if (exact && exact !== raw) return exact;
  if (exact) return null;
  const target = comparable(raw);
  let best = null;
  for (const option of options) {
    const score = levenshtein(target, comparable(option));
    if (!best || score < best.score) best = { name: option, score };
  }
  if (!best) return null;
  const threshold = Math.max(2, Math.round(target.length * 0.28));
  return best.score <= threshold ? best.name : null;
}
function statusFor(raw, statuses) {
  const match = statuses.find((s) => s.name.toLowerCase() === raw.trim().toLowerCase());
  return match?.name ?? statuses[0]?.name ?? "Active";
}
function appendLink(list, link) {
  if (!link.url) return;
  if (list.some((l) => normalizeLinkUrl(l.url) === normalizeLinkUrl(link.url) && l.kind === link.kind)) {
    return;
  }
  list.push(link);
}
function parseLinksMatrix(matrix, options) {
  const headerRow = firstHeaderRow(matrix);
  const headers = (matrix[headerRow] ?? []).map((c) => cellText(c));
  const map = headerMap(headers);
  const statuses = options.statuses?.length ? options.statuses : DEFAULT_LINK_STATUSES;
  options.frequencies?.length ? options.frequencies : DEFAULT_LINK_FREQUENCIES;
  const existing = options.existing ?? [];
  const rows = [];
  for (let i = headerRow + 1; i < matrix.length; i += 1) {
    const raw = matrix[i] ?? [];
    const get = (key) => map[key] == null ? void 0 : raw[map[key]];
    const title = cellText(get("title"));
    if (!title) continue;
    const rowNo = i + 1;
    const issues = [];
    const decisions = {};
    const categoryRaw = cellText(get("category"));
    const ownerRaw = cellText(get("owner"));
    const statusRaw = cellText(get("status"));
    const frequencyRaw = cellText(get("frequency"));
    const remarks = cellText(get("remarks"));
    const serialRaw = cellText(get("serial"));
    const serial = /^\d+$/.test(serialRaw) ? Number(serialRaw) : void 0;
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
          suggestion ? `Owner “${ownerRaw}” not found — suggested “${suggestion}”` : `Owner “${ownerRaw}” is new — choose Create`
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
    const links = [];
    const addCell = (cell, kind) => {
      const text = cellText(cell);
      const hyperlink = cellUrl(cell);
      const url = hyperlink || (/^https?:\/\//i.test(text) ? text : "");
      if (!url) {
        if (text && text !== "-" && !/^https?:\/\//i.test(text)) {
          issues.push(
            kind === "form" ? `Form link “${text.slice(0, 60)}” has no URL — paste it` : `Link “${text.slice(0, 60)}” has no URL — paste it`
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
        isPrimary: false
      });
    };
    addCell(get("link"), "link");
    const moreText = cellText(get("more"));
    if (moreText) {
      const urls = moreText.match(/https?:\/\/[^\s]+/gi) ?? [];
      for (const url of urls) addCell({ text: "", url }, "link");
    }
    addCell(get("form"), "form");
    const duplicateOwner = (url) => existing.find(
      (candidate) => candidate.urls.some((u) => normalizeLinkUrl(u.url) === normalizeLinkUrl(url)) && !(candidate.title.trim().toLowerCase() === title.trim().toLowerCase() && candidate.categoryName.toLowerCase() === categoryName.toLowerCase())
    );
    const firstDuplicate = links.find((link) => duplicateOwner(link.url));
    const duplicateUrl = !!firstDuplicate;
    if (firstDuplicate) {
      issues.push(`Same URL already in SaQsham: ${duplicateOwner(firstDuplicate.url)?.title ?? "another report"}`);
    }
    const linkMissing = !links.some((l) => l.kind === "link") && cellText(get("link")) !== "" && cellText(get("link")) !== "-";
    const hasBlocking = issues.some(
      (issue) => issue.includes("is in the future") || issue.includes("Could not read the date") || issue.includes("is not an http") || issue.includes("no URL")
    );
    const needsDecision = Object.keys(decisions).length > 0;
    let state = "new";
    if (hasBlocking && linkMissing) state = "link-missing";
    else if (hasBlocking || needsDecision) state = "needs-decision";
    const existingMatch = options.updateMode ? existing.find(
      (e) => serial != null && e.serial === serial || e.title.trim().toLowerCase() === title.trim().toLowerCase() && e.categoryName.toLowerCase() === categoryName.toLowerCase()
    ) : existing.find(
      (e) => e.title.trim().toLowerCase() === title.trim().toLowerCase() && e.categoryName.toLowerCase() === categoryName.toLowerCase() && e.lastUpdated === date.iso && e.status.toLowerCase() === status.toLowerCase() && e.frequency === frequency.value && e.urls.length === links.length && e.urls.every(
        (u) => links.some((l) => normalizeLinkUrl(l.url) === normalizeLinkUrl(u.url))
      )
    );
    if (state === "new") {
      if (existingMatch) {
        const identical = existingMatch.title.trim().toLowerCase() === title.trim().toLowerCase() && existingMatch.categoryName.toLowerCase() === categoryName.toLowerCase() && existingMatch.lastUpdated === date.iso && existingMatch.status.toLowerCase() === status.toLowerCase() && existingMatch.frequency === frequency.value && existingMatch.urls.length === links.length && existingMatch.urls.every(
          (u) => links.some((l) => normalizeLinkUrl(l.url) === normalizeLinkUrl(u.url))
        );
        state = identical ? "no-change" : existingMatch ? "will-change" : "new";
      }
    }
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
      mergeGroup: links.length > 0 ? `${categoryName.trim().toLowerCase()}::${title.trim().toLowerCase()}` : void 0
    });
  }
  const groups = /* @__PURE__ */ new Map();
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
        `Same report name and category in this paste (${list.length} rows) — merge into one report with ${list.length} links?`
      );
    }
  }
  return { headers, mapping: map, rows };
}
function mergeLinkImportRows(rows) {
  const first = rows[0];
  const links = [];
  for (const row of rows) for (const link of row.links) appendLink(links, link);
  const primary = links.find((l) => l.kind === "link") ?? links[0];
  for (const link of links) link.isPrimary = link === primary;
  return {
    ...first,
    rowNo: first.rowNo,
    links,
    issues: first.issues.filter((i) => !i.includes("merge into one report")),
    mergeGroup: void 0,
    state: first.state === "no-change" ? "new" : first.state
  };
}
function summarizeLinksImport(rows) {
  const summary = {
    new: 0,
    willChange: 0,
    noChange: 0,
    needsDecision: 0,
    linkMissing: 0,
    skipped: 0
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
function rowsReadyToApply(rows) {
  return rows.filter(
    (row) => row.title.trim() !== "" && (row.state === "new" || row.state === "will-change") && Object.keys(row.decisions).length === 0 && row.links.length > 0
  );
}

const PARSE_TIMEOUT_MS = 2e4;
function canUseWorker() {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}
function parseLinksPaste(text) {
  if (!canUseWorker()) return Promise.resolve(parseLinksText(text));
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(new URL(/* @vite-ignore */ "/assets/linksParseWorker-Co5zDfgL.js", import.meta.url), { type: "module" });
    } catch {
      resolve(parseLinksText(text));
      return;
    }
    let done = false;
    const finish = (fn) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      worker.terminate();
      fn();
    };
    const timer = window.setTimeout(
      () => finish(() => reject(new Error("Parsing took too long — try a smaller paste"))),
      PARSE_TIMEOUT_MS
    );
    worker.onmessage = (event) => {
      const res = event.data;
      finish(() => res.ok && res.matrix ? resolve(res.matrix) : reject(new Error(res.error || "Could not read the paste")));
    };
    worker.onerror = (event) => {
      finish(() => {
        try {
          resolve(parseLinksText(text));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(event.message || "Could not read the paste"));
        }
      });
    };
    worker.postMessage({ kind: "text", text });
  });
}

function LinksImportDialog({
  open,
  onOpenChange,
  initialText,
  initialFile,
  fileName: initialFileName,
  categories,
  owners,
  statuses,
  frequencies,
  existing,
  config,
  today,
  onImported
}) {
  const [text, setText] = reactExports.useState(initialText ?? "");
  const [html, setHtml] = reactExports.useState("");
  const [fileName, setFileName] = reactExports.useState(initialFileName ?? "");
  const [matrix, setMatrix] = reactExports.useState(null);
  const [rows, setRows] = reactExports.useState([]);
  const [headers, setHeaders] = reactExports.useState([]);
  const [mapping, setMapping] = reactExports.useState({});
  const [mode, setMode] = reactExports.useState("add");
  const [mergeGroups, setMergeGroups] = reactExports.useState(/* @__PURE__ */ new Set());
  const [busy, setBusy] = reactExports.useState(false);
  const [step, setStep] = reactExports.useState("review");
  const [drag, setDrag] = reactExports.useState(false);
  const fileRef = reactExports.useRef(null);
  const openedRef = reactExports.useRef(false);
  const applyImport = useMutation(api.links.applyImport);
  const undoImport = useMutation(api.links.undoImport);
  const imports = useQuery(api.links.listImports, { limit: 8 });
  const build = (source, name, modeOverride) => {
    const parsed = parseLinksMatrix(source, {
      categories,
      owners,
      statuses,
      frequencies,
      existing: existing.map((e) => ({ ...e, ownerName: e.ownerName ?? "", level: e.level ?? "", lastUpdated: e.lastUpdated ?? "", remarks: e.remarks ?? "" })),
      today,
      updateMode: (modeOverride ?? mode) === "update",
      defaultVisibility: config.defaultVisibility
    });
    setMatrix(source);
    setHeaders(parsed.headers);
    setMapping(parsed.mapping);
    setRows(parsed.rows);
    setFileName(name);
    setStep("review");
  };
  const parse = async (sourceText, sourceHtml = "", name = fileName || "Pasted links") => {
    if (!sourceText.trim() && !sourceHtml.trim()) {
      toast.error("Paste some rows or choose a file first");
      return;
    }
    const source = sourceHtml ? parseLinksHtml(sourceHtml) : await parseLinksPaste(sourceText);
    if (!source.length) {
      toast.error("No rows found. Copy the sheet with its header row and try again.");
      return;
    }
    build(source, name);
  };
  const loadFile = async (file) => {
    setBusy(true);
    try {
      const name = file.name;
      if (/\.(xlsx|xls)$/i.test(name) && typeof window !== "undefined") {
        try {
          const ExcelJS = (await __vitePreload(async () => { const {default: __vite_default__} = await import('./vendor-exceljs-CqnmHTS6.js').then(n => n.e);return { default: __vite_default__ }},true              ?__vite__mapDeps([0,1]):void 0)).default;
          const wb2 = new ExcelJS.Workbook();
          await wb2.xlsx.load(await file.arrayBuffer());
          const ws2 = wb2.worksheets[0];
          const data2 = [];
          ws2.eachRow({ includeEmpty: true }, (row) => {
            const cells = [];
            for (let c = 1; c <= Math.max(row.cellCount, ws2.columnCount); c += 1) {
              const cell = row.getCell(c);
              const raw = cell.text ?? "";
              const link = cell.hyperlink;
              cells.push(link ? { text: raw, url: link } : raw);
            }
            data2.push(cells);
          });
          if (!data2.length) throw new Error("The workbook has no rows");
          build(data2, name);
          return;
        } catch (err) {
          toast.message("ExcelJS could not read this file — using the spreadsheet reader", {
            description: err instanceof Error ? err.message : void 0
          });
        }
      }
      if (/\.(csv|tsv|txt)$/i.test(name)) {
        const raw = await file.text();
        setText(raw);
        parse(raw, "", name);
        return;
      }
      const XLSX = await __vitePreload(() => import('./vendor-xlsx-yBJAythd.js'),true              ?[]:void 0);
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: true,
        defval: "",
        blankrows: false
      });
      build(data, name);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that file");
    } finally {
      setBusy(false);
    }
  };
  const refreshRows = (nextMode) => {
    setMode(nextMode);
    if (matrix) build(matrix, fileName || "Pasted links", nextMode);
  };
  reactExports.useEffect(() => {
    if (!open) {
      openedRef.current = false;
      return;
    }
    if (openedRef.current) return;
    openedRef.current = true;
    if (initialFile) {
      void loadFile(initialFile);
    } else if (initialText?.trim()) {
      setText(initialText);
      parse(initialText, "", initialFileName || "Pasted links");
    }
  }, [open, initialFile, initialText]);
  const setDecision = (rowNo, field, value) => {
    setRows(
      (current) => current.map((row) => {
        if (row.rowNo !== rowNo) return row;
        const decisions = { ...row.decisions };
        if (value === "__create__") delete decisions[field];
        else if (field === "category") row = { ...row, categoryName: value };
        else if (field === "owner") row = { ...row, ownerName: value };
        else if (field === "frequency") row = { ...row, frequency: value };
        else if (field === "status") row = { ...row, status: value };
        if (value !== "__create__") delete decisions[field];
        return {
          ...row,
          decisions,
          state: row.linkMissing || row.issues.some((i) => /future|Could not read|not an http/i.test(i)) ? row.state : row.existingId ? "will-change" : "new"
        };
      })
    );
  };
  const acceptSuggestions = () => {
    setRows(
      (current) => current.map((row) => {
        const decisions = { ...row.decisions };
        let next = { ...row };
        for (const field of ["category", "owner"]) {
          const choice = decisions[field];
          if (!choice || choice === "__create__") continue;
          if (field === "category") next = { ...next, categoryName: choice };
          else next = { ...next, ownerName: choice };
          delete decisions[field];
        }
        return {
          ...next,
          decisions,
          state: Object.keys(decisions).length > 0 || next.linkMissing ? next.state : next.existingId ? "will-change" : "new"
        };
      })
    );
  };
  const fixMissing = (rowNo, url) => {
    const check = validateLinkUrl(url);
    if (!check.ok) return;
    const normalized = check.url;
    setRows(
      (current) => current.map((row) => {
        if (row.rowNo !== rowNo) return row;
        const links = [
          ...row.links.filter((l) => l.kind !== "link"),
          {
            label: row.links.find((l) => l.label)?.label || suggestLinkLabel(normalized),
            url: normalized,
            type: detectLinkType(normalized),
            kind: "link",
            isPrimary: !row.links.some((l) => l.kind === "link" && l.isPrimary)
          }
        ];
        const primary = links.find((l) => l.kind === "link") ?? links[0];
        for (const link of links) link.isPrimary = link === primary;
        return {
          ...row,
          links,
          linkMissing: false,
          issues: row.issues.filter((i) => !/has no URL/.test(i)),
          state: row.existingId ? "will-change" : "new"
        };
      })
    );
  };
  const effectiveRows = reactExports.useMemo(() => {
    const out = [];
    const groups2 = /* @__PURE__ */ new Map();
    for (const row of rows) {
      if (!row.mergeGroup) {
        out.push(row);
        continue;
      }
      const list = groups2.get(row.mergeGroup) ?? [];
      list.push(row);
      groups2.set(row.mergeGroup, list);
    }
    for (const [group, list] of groups2) {
      if (mergeGroups.has(group) && list.length > 1) out.push(mergeLinkImportRows(list));
      else out.push(...list);
    }
    return out.sort((a, b) => a.rowNo - b.rowNo);
  }, [rows, mergeGroups]);
  const summary = reactExports.useMemo(() => summarizeLinksImport(effectiveRows), [effectiveRows]);
  const ready = reactExports.useMemo(() => rowsReadyToApply(effectiveRows), [effectiveRows]);
  const groups = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const row of rows) {
      if (!row.mergeGroup) continue;
      const list = map.get(row.mergeGroup) ?? [];
      list.push(row);
      map.set(row.mergeGroup, list);
    }
    return [...map.entries()].filter(([, list]) => list.length > 1);
  }, [rows]);
  const apply = async () => {
    if (busy) return;
    if (ready.length === 0) {
      toast.error("No rows are ready to apply. Fix the highlighted values first.");
      return;
    }
    setBusy(true);
    try {
      const result = await applyImport({
        fileName: fileName || "Links paste",
        mode,
        rows: ready.map((row) => ({
          rowNo: row.rowNo,
          serial: row.serial,
          title: row.title,
          categoryName: row.categoryName,
          ownerName: row.ownerName || void 0,
          level: row.level || void 0,
          frequency: row.frequency,
          customDays: row.customDays,
          lastUpdated: row.lastUpdated || void 0,
          status: row.status,
          remarks: row.remarks || void 0,
          visibility: row.visibility,
          existingId: row.existingId,
          links: row.links.map((u) => ({
            label: u.label,
            url: u.url,
            type: u.type,
            kind: u.kind,
            isPrimary: u.isPrimary
          }))
        }))
      });
      const skipped = effectiveRows.length - ready.length;
      toast.success(
        `${result.imported} link${result.imported === 1 ? "" : "s"} ${mode === "update" ? "updated" : "added"}`,
        {
          description: [
            result.noChange ? `${result.noChange} unchanged` : "",
            skipped ? `${skipped} need a decision and were skipped` : "",
            "Every change is in the audit log."
          ].filter(Boolean).join(" · "),
          duration: 3e4,
          action: {
            label: "Undo",
            onClick: () => {
              void undoImport({ batchId: result.batchId }).then(() => {
                toast.success("Import undone");
                onImported?.();
              }).catch((err) => toast.error(err instanceof Error ? err.message : "Could not undo"));
            }
          }
        }
      );
      onImported?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not apply the import");
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "flex max-h-[94vh] w-[calc(100vw-1rem)] max-w-[1180px] flex-col gap-0 overflow-hidden p-0 sm:w-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 pr-12 sm:px-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-lg", children: "Import links" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Paste from Excel or upload the sheet. Nothing is saved until you review and press Apply." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5", children: step === "input" || !matrix ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => fileRef.current?.click(), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "mr-1.5 size-3.5" }),
          " Upload .xlsx / .xls / .csv / .tsv"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: fileRef,
            type: "file",
            accept: ".xlsx,.xls,.csv,.tsv,.txt",
            className: "sr-only",
            onChange: (e) => {
              const file = e.target.files?.[0];
              if (file) void loadFile(file);
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "or paste below — hyperlinks are kept when the clipboard provides them." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: cn(
            "rounded-xl border-2 border-dashed p-3 transition-colors",
            drag ? "border-primary bg-primary/5" : "border-border/70"
          ),
          onDragOver: (e) => {
            e.preventDefault();
            setDrag(true);
          },
          onDragLeave: () => setDrag(false),
          onDrop: (e) => {
            e.preventDefault();
            setDrag(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void loadFile(file);
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Textarea,
            {
              value: text,
              onChange: (e) => setText(e.target.value),
              onPaste: (e) => {
                const pastedHtml = e.clipboardData.getData("text/html");
                if (pastedHtml) setHtml(pastedHtml);
                const pasted = e.clipboardData.getData("text/plain");
                if (pasted) {
                  setText(pasted);
                  window.setTimeout(() => parse(pasted, pastedHtml, "Pasted links"), 0);
                }
              },
              rows: 8,
              placeholder: "Category	Report Name	Frequency	Last Updated	Link	Form Link	Owner	Status	Remarks\nBasic Data	SaQsham	-	22-Jun-2026	https://saqsham.nhsrcindia.org		NHSRC	Active	",
              className: "min-h-40 resize-y border-0 bg-transparent font-mono text-xs shadow-none focus-visible:ring-0",
              "aria-label": "Paste links rows"
            }
          )
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => parse(text, html), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MousePointerClick, { className: "mr-1.5 size-3.5" }),
          " Review pasted rows"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "ml-auto flex items-center gap-1.5 text-xs text-muted-foreground", children: [
          "Match existing by",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: mode, onChange: (e) => refreshRows(e.target.value), className: "h-9 rounded-md border border-input bg-background px-2 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "add", children: "Add new (safe default)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "update", children: "Update existing — by S. No, else title + category" })
          ] })
        ] })
      ] }),
      imports && imports.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-3.5" }),
          " Import history"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-border/40", children: imports.map((batch) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex flex-wrap items-center gap-2 py-1.5 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-3.5 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: batch.fileName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: formatLinkDate(new Date(batch.importedAt).toISOString().slice(0, 10)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
            batch.rowsUpdated,
            " updated · ",
            batch.rowsNoChange,
            " unchanged"
          ] }),
          batch.status === "undone" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-muted px-1.5 text-[10px]", children: "Undone" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              className: "ml-auto inline-flex items-center gap-1 text-primary",
              onClick: async () => {
                try {
                  await undoImport({ batchId: batch.id });
                  toast.success("Import undone");
                  onImported?.();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not undo");
                }
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Undo2, { className: "size-3" }),
                " Undo"
              ]
            }
          )
        ] }, batch.id)) })
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", onClick: () => setStep("input"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "mr-1 size-3.5 rotate-90" }),
          " Change paste"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1.5 text-xs text-muted-foreground", children: [
          "Match",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: mode, onChange: (e) => refreshRows(e.target.value), className: "h-8 rounded-md border border-input bg-background px-2 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "add", children: "Add new" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "update", children: "Update existing" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: fileName }),
        rows.some((row) => row.decisions.category && row.decisions.category !== "__create__" || row.decisions.owner && row.decisions.owner !== "__create__") && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", className: "ml-auto h-8", onClick: acceptSuggestions, children: "Accept all spelling suggestions" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryChip, { label: "New", value: summary.new, tone: "teal" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryChip, { label: "Will change", value: summary.willChange, tone: "blue" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryChip, { label: "No change", value: summary.noChange, tone: "slate" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryChip, { label: "Needs your decision", value: summary.needsDecision, tone: "amber" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryChip, { label: "Link missing", value: summary.linkMissing, tone: "rose" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SummaryChip, { label: "Skipped", value: summary.skipped, tone: "slate" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MappingStrip, { headers, mapping }),
      groups.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-lg border border-amber-300/70 bg-amber-50/70 p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1.5 text-xs font-semibold text-amber-950", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Merge, { className: "size-3.5" }),
          " Same report name and category"
        ] }),
        groups.map(([group, list]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "mt-1 flex cursor-pointer items-start gap-2 text-[11px] text-amber-950", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: mergeGroups.has(group),
              onChange: () => setMergeGroups((current) => {
                const next = new Set(current);
                if (next.has(group)) next.delete(group);
                else next.add(group);
                return next;
              })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "Merge ",
            list.length,
            " rows into one report with ",
            list.reduce((n, r) => n + r.links.length, 0),
            " links",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-amber-800/80", children: [
              "(",
              list.map((r) => r.title).join(" · "),
              ")"
            ] })
          ] })
        ] }, group))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-auto rounded-xl border border-border/60", style: { maxHeight: "52vh" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[980px] border-collapse text-xs", "data-testid": "links-import-review", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 z-10 bg-muted/95 backdrop-blur", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-12 px-2 py-2 font-semibold", children: "Row" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-24 px-2 py-2 font-semibold", children: "State" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "sticky left-0 z-20 min-w-56 bg-muted/95 px-2 py-2 font-semibold", children: "Report Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "min-w-32 px-2 py-2 font-semibold", children: "Category" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "min-w-32 px-2 py-2 font-semibold", children: "Frequency" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "min-w-28 px-2 py-2 font-semibold", children: "Last updated" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "min-w-64 px-2 py-2 font-semibold", children: "Link" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "min-w-28 px-2 py-2 font-semibold", children: "Owner" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "w-28 px-2 py-2 font-semibold", children: "Status" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: effectiveRows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/40 align-top odd:bg-background even:bg-muted/15", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 tabular-nums text-muted-foreground", children: row.rowNo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StateBadge, { state: row.state }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "sticky left-0 z-[5] min-w-56 bg-inherit px-2 py-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: row.title || "-" }),
            row.remarks && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 block text-[10px] text-muted-foreground", children: row.remarks }),
            row.issues.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1 space-y-0.5", children: row.issues.filter((i) => !i.includes("merge into one report")).slice(0, 2).map((issue) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start gap-1 text-[10px] text-amber-800", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-0.5 size-3 shrink-0" }),
              " ",
              issue
            ] }, issue)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block", children: row.categoryName }),
            row.decisions.category && /* @__PURE__ */ jsxRuntimeExports.jsx(
              DecisionSelect,
              {
                label: `Category for row ${row.rowNo}`,
                value: row.decisions.category,
                options: categories,
                suggestion: row.decisions.category,
                onCreate: () => setDecision(row.rowNo, "category", "__create__"),
                onChange: (v) => setDecision(row.rowNo, "category", v)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block", children: frequencyLabel(config, row.frequency) }),
            row.decisions.frequency && /* @__PURE__ */ jsxRuntimeExports.jsx(
              DecisionSelect,
              {
                label: `Frequency for row ${row.rowNo}`,
                value: row.decisions.frequency,
                options: frequencies.map((f) => f.value),
                labels: Object.fromEntries(frequencies.map((f) => [f.value, f.label])),
                suggestion: row.decisions.frequency,
                onChange: (v) => setDecision(row.rowNo, "frequency", v)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-2 tabular-nums", children: [
            row.lastUpdated ? formatLinkDate(row.lastUpdated) : "-",
            row.issues.some((i) => /future|Could not read/.test(i)) && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[10px] text-destructive", children: "Check date" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-2", children: [
            row.links.filter((l) => l.kind === "link").map((l) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block max-w-72 truncate text-sky-800", "data-tip": l.url, children: l.label || l.url }, l.url)),
            row.links.filter((l) => l.kind === "form").map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-0.5 block max-w-72 truncate text-violet-800", "data-tip": l.url, children: [
              "Form · ",
              l.label || l.url
            ] }, l.url)),
            row.linkMissing && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                "aria-label": `Paste missing link for ${row.title}`,
                placeholder: "Paste the missing URL",
                className: "h-8 text-[11px]",
                onBlur: (e) => fixMissing(row.rowNo, e.target.value),
                onKeyDown: (e) => {
                  if (e.key === "Enter") fixMissing(row.rowNo, e.currentTarget.value);
                }
              }
            ) }),
            row.duplicateUrl && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 block text-[10px] text-amber-800", children: "Same URL already exists" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: row.ownerName || "-" }),
            row.level && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "block text-[10px] text-muted-foreground", children: [
              "Level: ",
              row.level
            ] }),
            row.decisions.owner && /* @__PURE__ */ jsxRuntimeExports.jsx(
              DecisionSelect,
              {
                label: `Owner for row ${row.rowNo}`,
                value: row.decisions.owner,
                options: owners,
                suggestion: row.decisions.owner,
                onCreate: () => setDecision(row.rowNo, "owner", "__create__"),
                onChange: (v) => setDecision(row.rowNo, "owner", v)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: row.status }),
            row.decisions.status && /* @__PURE__ */ jsxRuntimeExports.jsx(
              DecisionSelect,
              {
                label: `Status for row ${row.rowNo}`,
                value: row.decisions.status,
                options: statuses.map((s) => s.name),
                suggestion: row.decisions.status,
                onChange: (v) => setDecision(row.rowNo, "status", v)
              }
            )
          ] })
        ] }, `${row.rowNo}-${row.state}`)) })
      ] }) })
    ] }) }),
    step === "review" && matrix && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 border-t border-border/60 bg-background/95 px-4 py-2 sm:px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "font-semibold text-foreground", children: ready.length }),
        " of ",
        effectiveRows.length,
        " rows ready",
        summary.needsDecision + summary.linkMissing > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1 text-amber-800", children: [
          "· ",
          summary.needsDecision + summary.linkMissing,
          " need a decision and will be skipped"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Close" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => void apply(), disabled: busy || ready.length === 0, children: [
          busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-1.5 size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mr-1.5 size-3.5" }),
          "Apply ",
          ready.length,
          " row",
          ready.length === 1 ? "" : "s"
        ] })
      ] })
    ] }) })
  ] }) });
}
function SummaryChip({ label, value, tone }) {
  const classes = {
    teal: "border-teal-300/70 bg-teal-50 text-teal-900",
    blue: "border-sky-300/70 bg-sky-50 text-sky-900",
    amber: "border-amber-300/80 bg-amber-50 text-amber-900",
    rose: "border-rose-300/80 bg-rose-50 text-rose-900",
    slate: "border-border bg-muted/40 text-muted-foreground"
  }[tone];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", classes), children: [
    label,
    " ",
    /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "tabular-nums", children: value })
  ] });
}
function StateBadge({ state }) {
  const map = {
    new: ["New", "border-teal-300/70 bg-teal-50 text-teal-900"],
    "will-change": ["Will change", "border-sky-300/70 bg-sky-50 text-sky-900"],
    "no-change": ["No change", "border-border bg-muted/50 text-muted-foreground"],
    "needs-decision": ["Needs your decision", "border-amber-300/80 bg-amber-50 text-amber-900"],
    "link-missing": ["Link missing", "border-rose-300/80 bg-rose-50 text-rose-900"],
    skipped: ["Skipped", "border-border bg-muted/50 text-muted-foreground"]
  }[state];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("inline-flex whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[10px] font-semibold", map[1]), children: map[0] });
}
function DecisionSelect({
  label,
  value,
  options,
  labels,
  suggestion,
  onCreate,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { "aria-label": label, value: "", onChange: (e) => onChange(e.target.value), className: "h-7 max-w-40 rounded border border-amber-300 bg-background px-1 text-[10px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Choose…" }),
      options.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o, children: labels?.[o] ?? o }, o)),
      onCreate && /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "__create__", children: [
        "Create “",
        suggestion,
        "”"
      ] })
    ] }),
    suggestion && suggestion !== "__create__" && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => onChange(suggestion), className: "rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900", children: [
      "Use ",
      suggestion
    ] })
  ] });
}
function MappingStrip({ headers, mapping }) {
  const labels = {
    serial: "S. No",
    category: "Category",
    title: "Report Name",
    frequency: "Frequency",
    lastUpdated: "Last Updated",
    link: "Link",
    more: "More links",
    form: "Form Link",
    owner: "Owner",
    status: "Status",
    remarks: "Remarks"
  };
  const used = Object.entries(mapping).filter(([, idx]) => idx != null);
  if (!headers.length) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "rounded-lg border border-border/60 bg-background/60 px-2 py-1.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeftRight, { className: "size-3" }),
      " Header matching · ",
      used.length,
      " columns found"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 flex flex-wrap gap-1", children: used.map(([key, idx]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: headers[idx] || "?" }),
      " → ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: labels[key] ?? key })
    ] }, key)) })
  ] });
}

function rem(value) {
  return Number.parseFloat(value) || 0;
}
function frozenLeft(columns, index) {
  let left = 0;
  for (let i = 0; i < index; i += 1) {
    const column = columns[i];
    if (!column.frozen) continue;
    left += rem(column.width);
  }
  return `${left}rem`;
}
function LinksTable({
  items,
  columns,
  config,
  today,
  canEdit,
  isAdmin,
  query,
  sortKey,
  sortDir,
  onSort,
  groupBy,
  collapsed,
  onToggleGroup,
  onOpen,
  onMark,
  onAction,
  onStatus,
  onPin,
  onReorder,
  categories,
  owners,
  onPatch,
  selectMode = false,
  selected,
  onToggleSelect
}) {
  const [dragged, setDragged] = reactExports.useState(null);
  const [dragOver, setDragOver] = reactExports.useState(null);
  const groups = groupBy ? Object.entries(
    items.reduce((acc, item) => {
      (acc[item.categoryName] ??= []).push(item);
      return acc;
    }, {})
  ) : [["", items]];
  const order = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    let index = 0;
    for (const [, rows] of groups) for (const row of rows) map.set(row.id, ++index);
    return map;
  }, [groups]);
  const width = `${columns.reduce((sum, column) => sum + rem(column.width), 0)}rem`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(StickyTableScroll, { maxHeight: "calc(100vh - 19.5rem)", className: "bg-card/80", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Table,
    {
      className: "table-fixed text-[13px]",
      style: { minWidth: width },
      "aria-label": "Links Organiser — table",
      "data-testid": "links-table",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("colgroup", { children: columns.map((column) => /* @__PURE__ */ jsxRuntimeExports.jsx("col", { style: { width: column.width } }, column.key)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: columns.map((column, index) => {
          const active = sortKey === column.key;
          const sortable = !!column.sortable && column.key !== "report";
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            TableHead,
            {
              className: cn(
                "h-10 px-2 text-[11px]",
                column.align === "right" && "text-right",
                column.align === "center" && "text-center",
                column.frozen && "sticky z-20 bg-muted/95",
                column.key === "report" && "shadow-[8px_0_10px_-10px_rgba(15,23,42,0.35)]"
              ),
              style: column.frozen ? { left: frozenLeft(columns, index) } : void 0,
              "aria-sort": active ? sortDir === "asc" ? "ascending" : "descending" : void 0,
              children: sortable ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => onSort(
                    column.key === "title" ? "title" : column.key
                  ),
                  className: "inline-flex items-center gap-1 font-semibold hover:text-primary",
                  "data-tip": `Sort by ${column.label}`,
                  children: [
                    column.label,
                    active ? sortDir === "asc" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "size-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "size-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-3", "aria-hidden": true })
                  ]
                }
              ) : column.label
            },
            column.key
          );
        }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
          groups.map(([category, rows]) => {
            const isCollapsed = groupBy && collapsed.has(category);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, { children: [
              groupBy && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { className: "h-10 border-y border-primary/15 bg-primary/[0.06] hover:bg-primary/[0.06]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TableCell,
                {
                  colSpan: columns.length,
                  className: "sticky left-0 z-10 bg-[oklch(0.965_0.018_200)] px-3 py-1.5",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => onToggleGroup(category),
                      "aria-expanded": !isCollapsed,
                      className: "flex items-center gap-2 text-left text-xs font-bold text-primary",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("inline-block transition-transform", isCollapsed && "-rotate-90"), "aria-hidden": true, children: "▾" }),
                        category,
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground", children: rows.length })
                      ]
                    }
                  )
                }
              ) }),
              !isCollapsed && rows.map((item, rowIndex) => {
                const primary = item.urls.find((u) => u.kind !== "form" && u.isPrimary) ?? item.urls.find((u) => u.kind !== "form");
                const form = item.urls.find((u) => u.kind === "form");
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TableRow,
                  {
                    className: cn(
                      "group/link h-[58px] border-border/50",
                      rowIndex % 2 === 1 && "bg-muted/[0.18]",
                      dragged === item.id && "opacity-50",
                      dragOver === item.id && "outline outline-2 -outline-offset-2 outline-primary/40"
                    ),
                    draggable: canEdit && !sortKey,
                    onDragStart: (event) => {
                      setDragged(item.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/link-id", item.id);
                    },
                    onDragOver: (event) => {
                      if (!dragged || dragged === item.id) return;
                      event.preventDefault();
                      setDragOver(item.id);
                    },
                    onDragLeave: () => setDragOver((id) => id === item.id ? null : id),
                    onDrop: (event) => {
                      event.preventDefault();
                      const from = event.dataTransfer.getData("text/link-id") || dragged;
                      if (from && from !== item.id) onReorder(from, item.id);
                      setDragged(null);
                      setDragOver(null);
                    },
                    onDragEnd: () => {
                      setDragged(null);
                      setDragOver(null);
                    },
                    "data-testid": `link-row-${item.id}`,
                    children: columns.map((column, columnIndex) => {
                      const sticky = column.frozen;
                      const stickyClass = sticky ? "sticky z-10 bg-inherit shadow-[inset_-1px_0_0_var(--border)]" : "";
                      const style = sticky ? { left: frozenLeft(columns, columnIndex) } : void 0;
                      switch (column.key) {
                        case "serial":
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(
                            TableCell,
                            {
                              className: cn(stickyClass, "px-1 text-center tabular-nums text-muted-foreground"),
                              style,
                              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center justify-center gap-0.5", children: [
                                canEdit && !sortKey && /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, { className: "size-3 cursor-grab text-muted-foreground/40", "aria-label": "Drag to reorder" }),
                                order.get(item.id),
                                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sr-only", children: [
                                  "Ref ",
                                  item.serial
                                ] })
                              ] })
                            },
                            column.key
                          );
                        case "report":
                        case "title":
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: cn(stickyClass, "px-2"), style, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-1.5", children: [
                            selectMode && /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "input",
                              {
                                type: "checkbox",
                                "aria-label": `Select ${item.title}`,
                                checked: selected?.has(item.id) ?? false,
                                onChange: () => onToggleSelect?.(item.id),
                                className: "mt-1 size-3.5 shrink-0 accent-[var(--primary)]"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-1.5", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0 text-[10px] tabular-nums text-muted-foreground", children: [
                                  order.get(item.id),
                                  "."
                                ] }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "a",
                                  {
                                    href: primary?.url ?? "#",
                                    target: primary ? "_blank" : void 0,
                                    rel: "noopener noreferrer",
                                    onClick: (event) => {
                                      if (event.ctrlKey || event.metaKey || event.shiftKey) return;
                                      event.preventDefault();
                                      onOpen(item);
                                    },
                                    className: "block min-w-0 truncate text-[13px] font-bold text-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                                    "data-tip": `Sheet Ref ${item.serial}${primary ? ` · Open ${primary.label}` : ""}`,
                                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Highlight, { text: item.title, query })
                                  }
                                )
                              ] }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-0.5 flex min-w-0 items-center gap-1", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  InlineCategory,
                                  {
                                    item,
                                    categories,
                                    canEdit,
                                    onPatch
                                  }
                                ),
                                !item.ownerName && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded border border-amber-300/70 bg-amber-50 px-1 text-[9px] font-semibold text-amber-900", children: "Needs details" })
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(PinStar, { pinned: item.pinned, canEdit, onToggle: () => onPin(item) })
                          ] }) }, column.key);
                        case "category":
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: cn(stickyClass, "px-2"), style, children: /* @__PURE__ */ jsxRuntimeExports.jsx(InlineCategory, { item, categories, canEdit, onPatch }) }, column.key);
                        case "links":
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "px-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex max-w-[14rem] flex-wrap gap-1", children: [
                            item.urls.slice(0, 2).map((url) => /* @__PURE__ */ jsxRuntimeExports.jsx(LinkChip, { link: url }, url.id)),
                            item.urls.length > 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                "button",
                                {
                                  type: "button",
                                  className: "inline-flex h-7 items-center rounded-md border border-border/60 bg-background px-1.5 text-[10px] font-semibold text-primary hover:bg-primary/10",
                                  "aria-label": `${item.urls.length - 2} more links`,
                                  children: [
                                    "+",
                                    item.urls.length - 2
                                  ]
                                }
                              ) }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs(PopoverContent, { align: "start", className: "w-80 space-y-1.5 p-2", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground", children: "All links" }),
                                item.urls.map((url) => /* @__PURE__ */ jsxRuntimeExports.jsx(LinkChip, { link: url, className: "w-full" }, url.id))
                              ] })
                            ] }),
                            !item.urls.length && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "-" })
                          ] }) }, column.key);
                        case "schedule":
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "px-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-0.5", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              InlineFrequency,
                              {
                                item,
                                config,
                                canEdit,
                                onPatch
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              UpdatedCell,
                              {
                                iso: item.lastUpdated,
                                today,
                                canEdit,
                                onMark: () => onMark(item)
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(DueChip, { due: item.due, config })
                          ] }) }, column.key);
                        case "frequency":
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "px-2 text-[12px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(InlineFrequency, { item, config, canEdit, onPatch }) }, column.key);
                        case "lastUpdated":
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "px-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(InlineDate, { item, canEdit, onPatch }) }, column.key);
                        case "nextDue":
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "px-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DueChip, { due: item.due, config }) }, column.key);
                        case "form":
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "px-2", children: form ? /* @__PURE__ */ jsxRuntimeExports.jsx(LinkChip, { link: form }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "-" }) }, column.key);
                        case "owner":
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "px-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(InlineOwner, { item, owners, canEdit, onPatch }) }, column.key);
                        case "status":
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "px-2", onClick: (event) => event.stopPropagation(), children: canEdit ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                            InlineStatus,
                            {
                              item,
                              config,
                              onStatus: (status) => onStatus(item, status)
                            }
                          ) : /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { status: item.status, config }) }, column.key);
                        case "remarks":
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "px-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(InlineRemarks, { item, canEdit, onPatch }) }, column.key);
                        case "actions":
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(
                            TableCell,
                            {
                              className: "px-1 text-right",
                              onClick: (event) => event.stopPropagation(),
                              children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-end gap-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Button,
                                  {
                                    size: "icon",
                                    variant: "ghost",
                                    className: "size-8",
                                    "aria-label": `Actions for ${item.title}`,
                                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "size-4" })
                                  }
                                ) }),
                                /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-48", children: [
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { className: "truncate", children: item.title }),
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { asChild: true, disabled: !primary, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: primary?.url, target: "_blank", rel: "noopener noreferrer", children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "mr-1.5 size-3.5" }),
                                    " Open primary"
                                  ] }) }),
                                  /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => onAction("copy", item), disabled: !primary, children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "mr-1.5 size-3.5" }),
                                    " Copy link"
                                  ] }),
                                  canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => onOpen(item, true), children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "mr-1.5 size-3.5" }),
                                    " Edit"
                                  ] }),
                                  canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => onMark(item), children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "mr-1.5 size-3.5" }),
                                    " Mark updated"
                                  ] }),
                                  canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => onAction("duplicate", item), children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "mr-1.5 size-3.5" }),
                                    " Duplicate"
                                  ] }),
                                  canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => onAction("roll-forward", item), children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "mr-1.5 size-3.5" }),
                                    " Roll forward"
                                  ] }),
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
                                  canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => onAction("archive", item), children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "mr-1.5 size-3.5" }),
                                    " Archive"
                                  ] }),
                                  /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => onOpen(item), children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "mr-1.5 size-3.5" }),
                                    " History"
                                  ] }),
                                  isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { className: "text-destructive", onClick: () => onAction("delete", item), children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "mr-1.5 size-3.5" }),
                                    " Delete permanently"
                                  ] })
                                ] })
                              ] }) })
                            },
                            column.key
                          );
                        default:
                          return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, {}, column.key);
                      }
                    })
                  },
                  item.id
                );
              })
            ] }, category || "all");
          }),
          items.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: columns.length, className: "h-32 text-center text-sm text-muted-foreground", children: "No links match these filters." }) })
        ] })
      ]
    }
  ) });
}
function InlineCategory({
  item,
  categories,
  canEdit,
  onPatch
}) {
  if (!canEdit) return /* @__PURE__ */ jsxRuntimeExports.jsx(CategoryChip, { name: item.categoryName, colour: item.categoryColour });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    InlineSelect,
    {
      label: `Category for ${item.title}`,
      display: /* @__PURE__ */ jsxRuntimeExports.jsx(CategoryChip, { name: item.categoryName, colour: item.categoryColour }),
      value: item.categoryId,
      options: categories.filter((category) => category.active).map((category) => ({
        value: category.id,
        label: category.name
      })),
      onSave: (value) => onPatch(item, "category", value)
    }
  );
}
function InlineOwner({
  item,
  owners,
  canEdit,
  onPatch
}) {
  const display = /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "block min-w-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-[12px]", children: item.ownerName ?? "No owner" }),
    item.level && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 inline-block rounded border border-border/60 bg-muted/30 px-1 text-[9px] text-muted-foreground", children: item.level }),
    !item.ownerName && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 block text-[9px] font-semibold text-amber-800", children: "Needs details" })
  ] });
  if (!canEdit) return display;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    InlineSelect,
    {
      label: `Owner for ${item.title}`,
      display,
      value: item.ownerId ?? "",
      options: [
        { value: "", label: "No owner" },
        ...owners.filter((owner) => owner.active).map((owner) => ({ value: owner.id, label: owner.name }))
      ],
      onSave: (value) => onPatch(item, "owner", value)
    }
  );
}
function InlineFrequency({
  item,
  config,
  canEdit,
  onPatch
}) {
  const display = /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: frequencyLabel(config, item.frequency) });
  if (!canEdit) return display;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    InlineSelect,
    {
      label: `Frequency for ${item.title}`,
      display,
      value: item.frequency,
      options: config.frequencies.map((frequency) => ({ value: frequency.value, label: frequency.label })),
      onSave: (value) => onPatch(item, "frequency", value)
    }
  );
}
function InlineDate({
  item,
  canEdit,
  onPatch
}) {
  if (!canEdit) return /* @__PURE__ */ jsxRuntimeExports.jsx(UpdatedCell, { iso: item.lastUpdated, today: todayIso() });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    InlineInput,
    {
      label: `Last updated for ${item.title}`,
      type: "date",
      value: item.lastUpdated ?? "",
      display: /* @__PURE__ */ jsxRuntimeExports.jsx(UpdatedCell, { iso: item.lastUpdated, today: todayIso() }),
      onSave: (value) => onPatch(item, "lastUpdated", value)
    }
  );
}
function InlineRemarks({
  item,
  canEdit,
  onPatch
}) {
  const display = /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "line-clamp-2 max-w-[12rem] whitespace-normal text-[11px] text-muted-foreground", "data-tip": item.remarks ?? void 0, children: item.remarks || "-" });
  if (!canEdit) return display;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    InlineInput,
    {
      label: `Remarks for ${item.title}`,
      value: item.remarks ?? "",
      placeholder: "Add a remark",
      display,
      onSave: (value) => onPatch(item, "remarks", value)
    }
  );
}
function InlineStatus({
  item,
  config,
  onStatus
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "aria-label": `Change status of ${item.title}`,
        className: "rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { status: item.status, config })
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "start", className: "w-44", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Set status" }),
      config.statuses.map((status) => /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => onStatus(status.name), children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { status: status.name, config }) }, status.name))
    ] })
  ] });
}
function InlineSelect({
  display,
  value,
  options,
  label,
  onSave
}) {
  const [editing, setEditing] = reactExports.useState(false);
  return editing ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    "select",
    {
      autoFocus: true,
      "aria-label": label,
      value,
      className: "h-8 w-full min-w-0 rounded border border-ring bg-background px-1 text-[12px]",
      onChange: (event) => {
        setEditing(false);
        if (event.target.value !== value) onSave(event.target.value);
      },
      onKeyDown: (event) => {
        if (event.key === "Escape") setEditing(false);
      },
      onBlur: () => setEditing(false),
      children: options.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: option.value, children: option.label }, option.value))
    }
  ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      onClick: (event) => {
        event.stopPropagation();
        setEditing(true);
      },
      className: "block w-full min-w-0 rounded text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      "data-tip": "Click to edit",
      children: display
    }
  );
}
function InlineInput({
  display,
  value,
  label,
  type = "text",
  placeholder,
  onSave
}) {
  const [editing, setEditing] = reactExports.useState(false);
  const [draft, setDraft] = reactExports.useState(value);
  return editing ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      autoFocus: true,
      "aria-label": label,
      type,
      value: draft,
      placeholder,
      className: "h-8 w-full min-w-0 rounded border border-ring bg-background px-1.5 text-[12px]",
      onChange: (event) => setDraft(event.target.value),
      onBlur: () => {
        setEditing(false);
        if (draft !== value) onSave(draft);
      },
      onKeyDown: (event) => {
        if (event.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
        if (event.key === "Enter") {
          event.preventDefault();
          setEditing(false);
          if (draft !== value) onSave(draft);
        }
      }
    }
  ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      onClick: (event) => {
        event.stopPropagation();
        setDraft(value);
        setEditing(true);
      },
      className: "block w-full min-w-0 rounded text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      "data-tip": "Click to edit · Enter saves · Tab moves on",
      children: display
    }
  );
}
function todayIso() {
  return new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
}
function linkCardPrimary(item) {
  return item.urls.find((u) => u.kind !== "form" && u.isPrimary) ?? item.urls.find((u) => u.kind !== "form");
}
function LinkCard({
  item,
  config,
  today,
  canEdit,
  onOpen,
  onMark,
  onPin
}) {
  linkCardPrimary(item);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "flex h-full min-h-[15rem] flex-col rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-shadow hover:shadow-md", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CategoryChip, { name: item.categoryName, colour: item.categoryColour }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { status: item.status, config }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PinStar, { pinned: item.pinned, canEdit, onToggle: onPin })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onOpen, className: "mt-2 text-left text-[13px] font-bold leading-snug text-foreground hover:text-primary", children: item.title }),
    item.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 line-clamp-2 text-[11px] text-muted-foreground", children: item.description }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DueChip, { due: item.due, config }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: frequencyLabel(config, item.frequency) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 space-y-1", children: [
      item.urls.slice(0, 3).map((url) => /* @__PURE__ */ jsxRuntimeExports.jsx(LinkChip, { link: url, compact: true }, url.id)),
      item.urls.length > 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-muted-foreground", children: [
        "+",
        item.urls.length - 3,
        " more links"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[10px] text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        item.ownerName ?? "-",
        item.level ? ` · ${item.level}` : ""
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Updated ",
        item.lastUpdated ? formatShort(item.lastUpdated) : "-"
      ] })
    ] }),
    item.remarks && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 line-clamp-1 text-[10px] text-muted-foreground", children: item.remarks }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex gap-1 border-t border-border/40 pt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", className: "h-9 flex-1", onClick: onOpen, children: "Open" }),
      canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", className: "h-9", onClick: onMark, children: "Mark updated" })
    ] })
  ] });
}
function formatShort(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}-${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]}-${y}`;
}

function QuickAddRow({
  draft,
  suggestions,
  categories,
  owners,
  config,
  saving,
  onChange,
  onApplyAll,
  onSave,
  onCancel
}) {
  const category = categories.find((c) => c.id === draft.categoryId);
  const owner = owners.find((o) => o.id === draft.ownerId);
  const TypeIcon = linkTypeIcon(draft.type).icon;
  const detailsMissing = !draft.categoryId || !draft.ownerId;
  const hints = [];
  if (suggestions.categoryName && suggestions.categoryName !== category?.name) {
    hints.push({ key: "categoryId", label: `Category: ${suggestions.categoryName}`, value: categories.find((c) => c.name === suggestions.categoryName)?.id ?? "" });
  }
  if (suggestions.ownerName && suggestions.ownerName !== owner?.name) {
    hints.push({ key: "ownerId", label: `Owner: ${suggestions.ownerName}`, value: owners.find((o) => o.name === suggestions.ownerName)?.id ?? "" });
  }
  if (suggestions.frequency && suggestions.frequency !== draft.frequency) {
    hints.push({ key: "frequency", label: frequencyLabel(config, suggestions.frequency), value: suggestions.frequency });
  }
  if (suggestions.level && suggestions.level !== draft.level) {
    hints.push({ key: "level", label: `Level: ${suggestions.level}`, value: suggestions.level });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "glass rounded-xl border border-primary/30 p-3 shadow-sm",
      "data-testid": "links-quick-add",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-start gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-1 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-3" }),
            " Draft"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TypeIcon, { className: "size-4 shrink-0 text-muted-foreground", "aria-hidden": true }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  autoFocus: true,
                  value: draft.title,
                  onChange: (event) => onChange({ title: event.target.value }),
                  "aria-label": "Draft report name",
                  placeholder: "Report name — page title, pasted text or URL words",
                  className: "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-bold outline-none focus-visible:border-input"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "shrink-0 text-[9px] font-normal", children: LINK_TYPE_LABEL[draft.type] ?? draft.type })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-0.5 flex items-center gap-1.5 px-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { className: "size-3 shrink-0 text-muted-foreground" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  value: draft.url,
                  onChange: (event) => onChange({ url: event.target.value }),
                  "aria-label": "Draft link URL",
                  placeholder: "Paste the URL here",
                  className: "min-w-0 flex-1 rounded border border-transparent bg-transparent text-[11px] text-muted-foreground outline-none focus-visible:border-input focus-visible:text-foreground"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "h-8 gap-1", onClick: onSave, disabled: saving || !draft.title.trim() || !draft.url.trim(), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5" }),
              " ",
              saving ? "Saving…" : "Add"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", className: "size-8 p-0", onClick: onCancel, "aria-label": "Cancel draft", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-1.5 pl-1", children: [
          category ? /* @__PURE__ */ jsxRuntimeExports.jsx(CategoryChip, { name: category.name, colour: category.colour }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900", children: "Category needed" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              "aria-label": "Draft category",
              value: draft.categoryId,
              onChange: (event) => onChange({ categoryId: event.target.value }),
              className: "h-7 rounded-md border border-border/70 bg-background px-1 text-[11px]",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Needs Category" }),
                categories.filter((c) => c.active).map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c.id, children: c.name }, c.id))
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              "aria-label": "Draft owner",
              value: draft.ownerId,
              onChange: (event) => onChange({ ownerId: event.target.value }),
              className: "h-7 rounded-md border border-border/70 bg-background px-1 text-[11px]",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Needs Owner" }),
                owners.filter((o) => o.active).map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o.id, children: o.name }, o.id))
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              "aria-label": "Draft frequency",
              value: draft.frequency,
              onChange: (event) => onChange({ frequency: event.target.value }),
              className: "h-7 rounded-md border border-border/70 bg-background px-1 text-[11px]",
              children: config.frequencies.map((frequency) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: frequency.value, children: frequency.label }, frequency.value))
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              "aria-label": "Draft level",
              value: draft.level,
              onChange: (event) => onChange({ level: event.target.value }),
              className: "h-7 rounded-md border border-border/70 bg-background px-1 text-[11px]",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "No level" }),
                LINK_LEVELS.map((level) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: level, children: level }, level))
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: "Last updated: today" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              "aria-label": "Draft status",
              value: draft.status,
              onChange: (event) => onChange({ status: event.target.value }),
              className: "h-7 rounded-md border border-border/70 bg-background px-1 text-[11px]",
              children: config.statuses.map((status) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: status.name, children: status.name }, status.name))
            }
          ),
          detailsMissing && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900", children: "Needs details" })
        ] }),
        (hints.length > 0 || suggestions.reasons.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-3" }),
            " Suggested"
          ] }),
          hints.map((hint) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              disabled: !hint.value,
              onClick: () => onChange({ [hint.key]: hint.value }),
              className: cn(
                "rounded-full border border-primary/30 bg-primary/[0.07] px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/15",
                !hint.value && "hidden"
              ),
              children: [
                "+ ",
                hint.label
              ]
            },
            hint.key
          )),
          hints.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: onApplyAll,
              className: "rounded-full border border-primary/50 bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground",
              children: "Accept all"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: suggestions.reasons.join(" · ") })
        ] })
      ]
    }
  );
}
function NeedsDetailsChip({
  rows,
  onClick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick,
      className: "inline-flex min-h-8 items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100",
      "data-tip": "Rows without a category or owner",
      children: [
        "Needs details ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-amber-200/70 px-1.5 tabular-nums", children: rows })
      ]
    }
  );
}

function parsePastedLink(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const tokens = text.split(/\s+/);
  const rawUrl = tokens.find((token) => looksLikeUrl(token.replace(/[),.;]+$/, "")));
  if (!rawUrl) return null;
  const url = normalizeLinkUrl(rawUrl.replace(/[),.;]+$/, ""));
  if (!url) return null;
  const title = text.replace(rawUrl, " ").split(/[\n\t]+/).map((part) => part.trim()).filter((part) => part && !looksLikeUrl(part)).join(" ").replace(/\s+/g, " ").trim();
  return {
    url,
    pastedTitle: title || null,
    type: detectLinkType(url)
  };
}
function titleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const type = detectLinkType(url);
    const segments = parsed.pathname.split("/").map((segment) => decodeURIComponent(segment)).filter(Boolean).filter((segment) => !/^[A-Za-z0-9_-]{16,}$/.test(segment));
    const last = segments[segments.length - 1] ?? "";
    const words2 = last.replace(/\.(pdf|xlsx?|csv|docx?|pptx?)$/i, "").replace(/[_+]+/g, " ").replace(/-+/g, " ").replace(/\s+/g, " ").trim();
    if (words2.length >= 3 && !/^(edit|view|preview|pubhtml|htmlview)$/i.test(words2)) {
      return words2.replace(/\b\w/g, (char) => char.toUpperCase()).slice(0, 160);
    }
    const label = type === "sheet" ? "Google Sheet" : type === "doc" ? "Google Doc" : type === "form" ? "Google Form" : type === "drive" ? "Drive file" : type === "pdf" ? "PDF" : linkDomain(url) || "Link";
    return label;
  } catch {
    return "Link";
  }
}
const STOP_WORDS = /* @__PURE__ */ new Set([
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
  "data"
]);
function words(value) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}
function top(scores) {
  let best = null;
  let bestScore = 0;
  for (const [key, score] of scores) {
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}
function bump(scores, key, amount = 1) {
  if (key == null || key === "") return;
  scores.set(key, (scores.get(key) ?? 0) + amount);
}
function quickSuggestions(input) {
  const domain = linkDomain(input.url);
  const titleWords = new Set(words(input.title));
  const categories = /* @__PURE__ */ new Map();
  const owners = /* @__PURE__ */ new Map();
  const levels = /* @__PURE__ */ new Map();
  const frequencies = /* @__PURE__ */ new Map();
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
  let cueFrequency = null;
  if (/\b(q[1-4]|quarter(ly)?)\b/i.test(title)) cueFrequency = "quarterly";
  else if (/\bmonth(ly)?\b/i.test(title)) cueFrequency = "monthly";
  else if (/\b(year|yearly|annual|annually)\b/i.test(title)) cueFrequency = "yearly";
  else if (/\bweek(ly)?\b/i.test(title)) cueFrequency = "weekly";
  else if (/\bhalf[- ]?year(ly)?\b/i.test(title)) cueFrequency = "half-yearly";
  const reasons = [];
  if (domain) reasons.push(`Same domain: ${domain}`);
  if (matches) reasons.push(`${matches} similar row${matches === 1 ? "" : "s"}`);
  if (cueFrequency) reasons.push(`Title cue: ${frequencyLabel(input.config, cueFrequency)}`);
  return {
    categoryName: top(categories) ?? input.fallbackCategory ?? null,
    ownerName: top(owners),
    level: top(levels),
    frequency: cueFrequency ?? top(frequencies) ?? "one-time",
    title: input.title.trim() || titleFromUrl(input.url),
    reasons
  };
}
function duplicateGroups(items) {
  const keyTitle = (title) => words(title).join(" ") || title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const byKey = /* @__PURE__ */ new Map();
  const add = (key, item) => {
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
  const seen = /* @__PURE__ */ new Set();
  const groups = [];
  for (const list of byKey.values()) {
    if (list.length < 2) continue;
    const signature = list.map((item) => item.id).sort().join("|");
    if (seen.has(signature)) continue;
    seen.add(signature);
    groups.push(list);
  }
  return groups;
}

const VIEW_KEY = "nqas.links.view";
const GROUP_KEY = "nqas.links.group";
const COLUMNS_KEY = "nqas.links.columns.v2";
const SELECT_KEY = "nqas.links.selectMode";
const RECENT_PREFIX = "nqas.links.recent.";
function readRecent(userId) {
  if (!userId || typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_PREFIX + userId) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string").slice(0, 30) : [];
  } catch {
    return [];
  }
}
function readView() {
  if (typeof window === "undefined") return "table";
  const saved = window.localStorage.getItem(VIEW_KEY);
  return saved === "cards" || saved === "category" ? saved : "table";
}
function readGroup() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(GROUP_KEY) === "1";
}
function readColumns() {
  if (typeof window === "undefined") return [...LINK_TABLE_DEFAULT_KEYS];
  try {
    const raw = JSON.parse(window.localStorage.getItem(COLUMNS_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [...LINK_TABLE_DEFAULT_KEYS];
    const allowed = new Set(LINK_TABLE_ALL_COLUMNS.map((column) => column.key));
    const keys = raw.filter((key) => typeof key === "string" && allowed.has(key));
    return keys.length ? keys : [...LINK_TABLE_DEFAULT_KEYS];
  } catch {
    return [...LINK_TABLE_DEFAULT_KEYS];
  }
}
function readSelectMode() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SELECT_KEY) === "1";
}
const VIEW_STATE_KEY = "nqas.links.viewState";
function readViewState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(VIEW_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const bar = parsed.bar && Array.isArray(parsed.bar.barKeys) && Array.isArray(parsed.bar.filters) ? {
      barKeys: parsed.bar.barKeys.filter((key) => typeof key === "string"),
      filters: parsed.bar.filters,
      match: parsed.bar.match === "any" ? "any" : "all"
    } : void 0;
    const quick = parsed.quick;
    return {
      bar,
      quick: quick && ["all", "alerts", "overdue", "due-soon", "active", "completed", "pinned", "recent", "archived"].includes(quick) ? quick : void 0,
      search: typeof parsed.search === "string" ? parsed.search : void 0
    };
  } catch {
    return null;
  }
}
function dueKey(item) {
  return item.due.state === "never" ? "overdue" : item.due.state;
}
function primaryOf(item) {
  return item.urls.find((u) => u.kind !== "form" && u.isPrimary) ?? item.urls.find((u) => u.kind !== "form");
}
function toExportItems(items) {
  return items.map((item) => ({
    id: item.id,
    serial: item.serial,
    categoryName: item.categoryName,
    categoryColour: item.categoryColour,
    title: item.title,
    description: item.description,
    frequency: item.frequency,
    lastUpdated: item.lastUpdated,
    nextDue: item.nextDue,
    ownerName: item.ownerName,
    level: item.level,
    status: item.status,
    remarks: item.remarks,
    visibility: item.visibility,
    urls: item.urls.map((u) => ({
      id: u.id,
      label: u.label,
      url: u.url,
      type: u.type,
      kind: u.kind,
      isPrimary: u.isPrimary
    })),
    due: { state: item.due.state, days: item.due.days }
  }));
}
function LinksOrganiser() {
  const data = useQuery(api.links.list, {});
  const appSettings = useQuery(api.facilities.getAppSettings, {});
  const runLinkCheck = useAction(api.linkCheck.run);
  const seedDefaults = useMutation(api.links.seedDefaults);
  const setStatus = useMutation(api.links.setStatus);
  const setPinned = useMutation(api.links.setPinned);
  const archiveLink = useMutation(api.links.archiveLink);
  const restoreLink = useMutation(api.links.restoreLink);
  const deletePermanently = useMutation(api.links.deleteLinkPermanently);
  const duplicateLink = useMutation(api.links.duplicateLink);
  const reorderLinks = useMutation(api.links.reorderLinks);
  const createLink = useMutation(api.links.createLink);
  const patchLinkField = useMutation(api.links.patchLinkField);
  const mergeLinks = useMutation(api.links.mergeLinks);
  const rollForwardLink = useMutation(api.links.rollForwardLink);
  const markUpdatedLink = useMutation(api.links.markUpdated);
  const fetchPageTitle = useAction(api.linkCheck.pageTitle);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const today = todayIsoIST();
  const savedView = reactExports.useMemo(() => readViewState(), []);
  const [search, setSearch] = reactExports.useState(() => savedView?.search ?? "");
  const searchRef = reactExports.useRef(null);
  const [view, setView] = reactExports.useState(readView);
  const [groupBy, setGroupBy] = reactExports.useState(readGroup);
  const [collapsed, setCollapsed] = reactExports.useState(/* @__PURE__ */ new Set());
  const [quick, setQuick] = reactExports.useState(() => {
    const due = params.get("due");
    if (due === "overdue") return "overdue";
    if (due === "due-soon") return "due-soon";
    if (due === "alerts") return "alerts";
    return savedView?.quick ?? "all";
  });
  const [bar, setBar] = reactExports.useState(() => {
    const shared = loadBarState("links");
    const own = savedView?.bar;
    if (own) return { ...own, filters: own.filters ?? [] };
    return shared ? { ...shared, filters: [] } : { barKeys: ["category", "status", "due"], filters: [], match: "all" };
  });
  const [sortKey, setSortKey] = reactExports.useState(null);
  const [sortDir, setSortDir] = reactExports.useState("asc");
  const [selectedId, setSelectedId] = reactExports.useState(() => params.get("item"));
  const [editOnOpen, setEditOnOpen] = reactExports.useState(false);
  const [addOpen, setAddOpen] = reactExports.useState(() => params.get("add") === "1");
  const [importOpen, setImportOpen] = reactExports.useState(() => params.get("import") === "1");
  const [filterSheet, setFilterSheet] = reactExports.useState(false);
  const [markTarget, setMarkTarget] = reactExports.useState(null);
  const [archiveTarget, setArchiveTarget] = reactExports.useState(null);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [recent, setRecent] = reactExports.useState([]);
  const [columnKeys, setColumnKeys] = reactExports.useState(readColumns);
  const [quickText, setQuickText] = reactExports.useState("");
  const [quickDraft, setQuickDraft] = reactExports.useState(null);
  const [quickSuggest, setQuickSuggest] = reactExports.useState(null);
  const [quickSaving, setQuickSaving] = reactExports.useState(false);
  const [selectMode, setSelectMode] = reactExports.useState(readSelectMode);
  const [selectedIds, setSelectedIds] = reactExports.useState(/* @__PURE__ */ new Set());
  const [gapsOpen, setGapsOpen] = reactExports.useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = reactExports.useState(false);
  const [mergeKeep, setMergeKeep] = reactExports.useState({});
  const seeded = reactExports.useRef(false);
  const config = data?.config ?? {
    statuses: [],
    frequencies: [],
    dueSoonDays: 7,
    defaultVisibility: "everyone",
    notifyMode: "editors",
    sidebarBadge: false,
    defaultFilters: ["category", "status", "due"],
    linkCheckEnabled: false,
    linkCheckWeekly: false
  };
  reactExports.useEffect(() => {
    if (data?.me.id) setRecent(readRecent(data.me.id));
  }, [data?.me.id]);
  const defaultsApplied = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (defaultsApplied.current || !data || loadBarState("links")) return;
    defaultsApplied.current = true;
    const configured = data.config.defaultFilters ?? [];
    if (!configured.length) return;
    setBar((current) => ({
      ...current,
      barKeys: configured.filter((key) => current.barKeys.includes(key) || current.filters.some((f) => f.key === key) || ["category", "owner", "status", "frequency", "due", "linkType", "level", "lastUpdated", "pinned", "archived"].includes(key))
    }));
  }, [data]);
  reactExports.useEffect(() => {
    if (!data || data.categories.length > 0 || !data.me.canEdit || seeded.current) return;
    seeded.current = true;
    void seedDefaults().catch(() => {
      seeded.current = false;
    });
  }, [data, seedDefaults]);
  reactExports.useEffect(() => {
    if (!data || !selectedId) return;
    if (!data.items.some((item) => item.id === selectedId)) setSelectedId(null);
  }, [data, selectedId]);
  reactExports.useEffect(() => {
    const onKey = (event) => {
      const target = event.target;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (!typing && event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const remember = reactExports.useCallback((id) => {
    if (!data?.me.id) return;
    setRecent((current) => {
      const next2 = [id, ...current.filter((x) => x !== id)].slice(0, 30);
      try {
        window.localStorage.setItem(RECENT_PREFIX + data.me.id, JSON.stringify(next2));
      } catch {
      }
      return next2;
    });
  }, [data?.me.id]);
  const openItem = (item, edit = false) => {
    remember(item.id);
    setSelectedId(item.id);
    setEditOnOpen(edit);
  };
  const existingUrls = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const item of data?.items ?? []) {
      for (const url of item.urls) map.set(normalizeLinkUrl(url.url), item.title);
    }
    return map;
  }, [data?.items]);
  const existingTitles = reactExports.useMemo(
    () => (data?.items ?? []).map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      title: item.title
    })),
    [data?.items]
  );
  const columns = reactExports.useMemo(() => {
    const desired = /* @__PURE__ */ new Set([...columnKeys, "actions"]);
    return LINK_TABLE_ALL_COLUMNS.filter((column) => desired.has(column.key));
  }, [columnKeys]);
  const toggleColumn = (key) => {
    setColumnKeys((current) => {
      const isVisible = current.includes(key);
      if (isVisible && current.filter((item) => item !== "actions").length <= 1) return current;
      const next2 = isVisible ? current.filter((item) => item !== key) : [...current, key];
      try {
        window.localStorage.setItem(COLUMNS_KEY, JSON.stringify(next2));
      } catch {
      }
      return next2;
    });
  };
  const toggleSelectMode = () => {
    setSelectMode((current) => {
      const next2 = !current;
      if (!next2) setSelectedIds(/* @__PURE__ */ new Set());
      try {
        window.localStorage.setItem(SELECT_KEY, next2 ? "1" : "0");
      } catch {
      }
      return next2;
    });
  };
  const buildQuickDraft = reactExports.useCallback(
    (url, pausedTitle, pasted) => {
      const categories = (data?.categories ?? []).filter((category) => category.active);
      const owners = (data?.owners ?? []).filter((owner) => owner.active);
      const fallbackTitle = pausedTitle ?? pasted ?? titleFromUrl(url);
      const suggestions = quickSuggestions({
        url,
        title: fallbackTitle,
        items: data?.items ?? [],
        config,
        fallbackCategory: categories.find((category) => category.name === "Unsorted")?.name ?? categories[0]?.name ?? null
      });
      setQuickSuggest(suggestions);
      setQuickDraft({
        url,
        title: fallbackTitle,
        type: detectLinkType(url),
        categoryId: categories.find((category) => category.name === suggestions.categoryName)?.id ?? "",
        ownerId: owners.find((owner) => owner.name === suggestions.ownerName)?.id ?? "",
        level: suggestions.level ?? "",
        frequency: suggestions.frequency ?? "one-time",
        lastUpdated: today,
        status: config.statuses[0]?.name ?? "Active"
      });
      void fetchPageTitle({ url }).then((result) => {
        if (!result.title) return;
        setQuickDraft(
          (current) => current && current.url === url && current.title === fallbackTitle ? { ...current, title: result.title } : current
        );
      }).catch(() => void 0);
    },
    [config, data?.categories, data?.items, data?.owners, fetchPageTitle, today]
  );
  const startQuickAdd = reactExports.useCallback(
    (text) => {
      const parsed = parsePastedLink(text);
      if (!parsed) return false;
      buildQuickDraft(parsed.url, parsed.pastedTitle, parsed.pastedTitle);
      return true;
    },
    [buildQuickDraft]
  );
  reactExports.useEffect(() => {
    if (!data?.me.canEdit) return;
    const onPaste = (event) => {
      const target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (startQuickAdd(text)) event.preventDefault();
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [data?.me.canEdit, startQuickAdd]);
  const applyQuickSuggestions = () => {
    if (!quickDraft || !quickSuggest) return;
    const categoryId = data?.categories.find((category) => category.name === quickSuggest.categoryName)?.id;
    const ownerId = data?.owners.find((owner) => owner.name === quickSuggest.ownerName)?.id;
    setQuickDraft({
      ...quickDraft,
      categoryId: categoryId ?? quickDraft.categoryId,
      ownerId: ownerId ?? quickDraft.ownerId,
      frequency: quickSuggest.frequency ?? quickDraft.frequency,
      level: quickSuggest.level ?? quickDraft.level,
      title: quickDraft.title.trim() || quickSuggest.title
    });
  };
  const saveQuickDraft = async () => {
    if (!quickDraft) return;
    const parsed = parsePastedLink(quickDraft.url);
    if (!parsed) {
      toast.error("Enter a full http(s) link");
      return;
    }
    setQuickSaving(true);
    try {
      await createLink({
        categoryId: quickDraft.categoryId ? quickDraft.categoryId : void 0,
        title: quickDraft.title.trim() || titleFromUrl(parsed.url),
        frequency: quickDraft.frequency,
        lastUpdated: quickDraft.lastUpdated || today,
        ownerId: quickDraft.ownerId ? quickDraft.ownerId : void 0,
        level: quickDraft.level || void 0,
        status: quickDraft.status,
        urls: [
          {
            label: quickDraft.title.trim() || titleFromUrl(parsed.url),
            url: parsed.url,
            kind: "link",
            isPrimary: true,
            type: parsed.type
          }
        ]
      });
      if (!quickDraft.categoryId || !quickDraft.ownerId) {
        toast.success("Draft saved — it still needs details", {
          description: "Use “Fill the gaps” to complete it."
        });
      } else {
        toast.success("Link added from the pasted URL");
      }
      setQuickDraft(null);
      setQuickSuggest(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the draft");
    } finally {
      setQuickSaving(false);
    }
  };
  const needsDetails = reactExports.useMemo(
    () => (data?.items ?? []).filter(
      (item) => !item.archivedAt && (!item.ownerName || /^(unsorted|uncategorised)$/i.test(item.categoryName))
    ),
    [data?.items]
  );
  const gapSuggestion = reactExports.useCallback(
    (item) => {
      const primary = primaryOf(item);
      return quickSuggestions({
        url: primary?.url ?? "",
        title: item.title,
        items: (data?.items ?? []).filter((candidate) => candidate.id !== item.id),
        config,
        fallbackCategory: data?.categories.find((category) => category.name !== "Unsorted")?.name ?? null
      });
    },
    [config, data?.categories, data?.items]
  );
  const acceptGap = async (item, applyOwner = true) => {
    const suggestion = gapSuggestion(item);
    const category = data?.categories.find((candidate) => candidate.name === suggestion.categoryName);
    const owner = data?.owners.find((candidate) => candidate.name === suggestion.ownerName);
    try {
      if ((!item.ownerName || /unsorted/i.test(item.categoryName)) && category && !/unsorted/i.test(item.categoryName)) {
        await patchLinkField({ id: item.id, field: "category", value: category.id });
      }
      if (applyOwner && !item.ownerName && owner) {
        await patchLinkField({ id: item.id, field: "owner", value: owner.id });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not fill that row");
    }
  };
  const acceptAllGaps = async () => {
    for (const item of needsDetails) await acceptGap(item);
    toast.success(`Filled ${needsDetails.length} row${needsDetails.length === 1 ? "" : "s"} where a suggestion existed`);
    setGapsOpen(false);
  };
  const duplicateGroupsFound = reactExports.useMemo(
    () => duplicateGroups((data?.items ?? []).filter((item) => !item.archivedAt)),
    [data?.items]
  );
  const mergeGroup = async (group) => {
    const keepId = mergeKeep[group.map((item) => item.id).sort().join("|")] ?? group[0]?.id;
    if (!keepId) return;
    try {
      const result = await mergeLinks({
        keepId,
        otherIds: group.filter((item) => item.id !== keepId).map((item) => item.id)
      });
      toast.success("Duplicates merged — kept one row", {
        duration: 3e4,
        action: {
          label: "Undo",
          onClick: () => {
            void Promise.all(
              result.archivedIds.map((id) => restoreLink({ id }))
            ).then(() => toast.success("Merge undone"));
          }
        }
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not merge the duplicates");
    }
  };
  const rollCandidates = reactExports.useMemo(
    () => (data?.items ?? []).filter((item) => !item.archivedAt && canRollForward(item, today)),
    [data?.items, today]
  );
  const applyRollForward = async (item) => {
    try {
      const result = await rollForwardLink({ id: item.id });
      toast.success("Next quarter created", {
        description: `${result.title} · last updated cleared`,
        duration: 3e4,
        action: {
          label: "Undo",
          onClick: () => {
            void archiveLink({ id: result.id }).then(() => toast.success("Roll forward undone"));
          }
        }
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not roll the quarter forward");
    }
  };
  const patchInline = async (item, field, value) => {
    try {
      await patchLinkField({ id: item.id, field, value });
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that cell");
    }
  };
  const bulkSet = async (field, value) => {
    if (!selectedIds.size) return;
    try {
      await Promise.all(
        [...selectedIds].map(
          (id) => patchLinkField({ id, field, value })
        )
      );
      toast.success(`Updated ${selectedIds.size} row${selectedIds.size === 1 ? "" : "s"}`);
      setSelectedIds(/* @__PURE__ */ new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the selection");
    }
  };
  const bulkMarkUpdated = async () => {
    if (!selectedIds.size) return;
    try {
      await Promise.all(
        [...selectedIds].map(
          (id) => markUpdatedLink({ id, date: today })
        )
      );
      toast.success(`Marked ${selectedIds.size} row${selectedIds.size === 1 ? "" : "s"} updated`);
      setSelectedIds(/* @__PURE__ */ new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark the selection updated");
    }
  };
  const saveCurrentView = reactExports.useCallback(() => {
    try {
      window.localStorage.setItem(VIEW_STATE_KEY, JSON.stringify({ bar, quick, search }));
      toast.success("View saved — it will reopen with these filters");
    } catch {
      toast.error("This browser is not allowing saved views");
    }
  }, [bar, quick, search]);
  const fields = reactExports.useMemo(() => {
    const cats = data?.categories ?? [];
    const owners = data?.owners ?? [];
    const statuses = data?.config.statuses ?? [];
    const freqs = data?.config.frequencies ?? [];
    return [
      {
        key: "category",
        label: "Category",
        type: "select",
        onThisPage: true,
        options: cats.filter((c) => c.active).map((c) => ({ value: c.name }))
      },
      {
        key: "owner",
        label: "Owner",
        type: "select",
        onThisPage: true,
        options: owners.filter((o) => o.active).map((o) => ({ value: o.name }))
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        onThisPage: true,
        options: statuses.map((s) => ({ value: s.name }))
      },
      {
        key: "frequency",
        label: "Frequency",
        type: "select",
        onThisPage: true,
        options: freqs.map((f) => ({ value: f.label }))
      },
      {
        key: "due",
        label: "Due state",
        type: "select",
        onThisPage: true,
        options: [
          { value: "overdue", label: "Overdue" },
          { value: "due-soon", label: "Due soon" },
          { value: "up-to-date", label: "Up to date" },
          { value: "none", label: "No due date" }
        ]
      },
      {
        key: "linkType",
        label: "Link type",
        type: "select",
        onThisPage: true,
        options: ["sheet", "form", "doc", "pdf", "drive", "video", "web"].map((v) => ({ value: v }))
      },
      {
        key: "level",
        label: "Level",
        type: "select",
        onThisPage: true,
        options: ["National", "State", "District"].map((v) => ({ value: v }))
      },
      {
        key: "lastUpdated",
        label: "Last updated",
        type: "date",
        onThisPage: true
      },
      {
        key: "pinned",
        label: "Pinned",
        type: "boolean",
        onThisPage: true
      },
      {
        key: "archived",
        label: "Archived",
        type: "boolean",
        special: true
      }
    ];
  }, [data]);
  const activeFilters = bar.filters.filter(
    (f) => bar.barKeys.includes(f.key) && f.values.length > 0
  );
  const archivedRequested = activeFilters.some(
    (f) => f.key === "archived" && f.values.includes("Yes")
  );
  const getValue = (item, key) => {
    switch (key) {
      case "category":
        return item.categoryName;
      case "owner":
        return item.ownerName ?? "";
      case "status":
        return item.status;
      case "frequency":
        return frequencyLabel(config, item.frequency);
      case "due":
        return dueKey(item);
      case "linkType":
        return primaryOf(item)?.type ?? "";
      case "level":
        return item.level ?? "";
      case "lastUpdated":
        return item.lastUpdated ?? "";
      case "pinned":
        return item.pinned ? "Yes" : "No";
      case "archived":
        return item.archivedAt ? "Yes" : "No";
      default:
        return "";
    }
  };
  const base = reactExports.useMemo(
    () => (data?.items ?? []).filter((item) => archivedRequested || !item.archivedAt),
    [data?.items, archivedRequested]
  );
  const counts = reactExports.useMemo(() => {
    const active = (data?.items ?? []).filter((item) => !item.archivedAt);
    return {
      total: active.length,
      dueSoon: active.filter((item) => item.due.state === "due-soon").length,
      overdue: active.filter((item) => item.due.state === "overdue" || item.due.state === "never").length,
      active: active.filter((item) => item.status === "Active").length,
      completed: active.filter((item) => item.status === "Completed").length,
      pinned: active.filter((item) => item.pinned).length,
      recent: active.filter((item) => recent.includes(item.id)).length,
      archived: (data?.items ?? []).filter((item) => item.archivedAt).length,
      alerts: active.filter((item) => item.due.state === "due-soon").length + active.filter((item) => item.due.state === "overdue" || item.due.state === "never").length
    };
  }, [data?.items, recent]);
  const q = search.trim().toLowerCase();
  const filtered = reactExports.useMemo(() => {
    const categoryOrder = new Map((data?.categories ?? []).map((c) => [c.name, c.order]));
    const rows = base.filter((item) => {
      if (quick === "alerts" && !(item.due.state === "overdue" || item.due.state === "never" || item.due.state === "due-soon")) return false;
      if (quick === "overdue" && !(item.due.state === "overdue" || item.due.state === "never")) return false;
      if (quick === "due-soon" && item.due.state !== "due-soon") return false;
      if (quick === "active" && item.status !== "Active") return false;
      if (quick === "completed" && item.status !== "Completed") return false;
      if (quick === "pinned" && !item.pinned) return false;
      if (quick === "recent" && !recent.includes(item.id)) return false;
      if (quick === "archived" && !item.archivedAt) return false;
      if (quick !== "archived" && item.archivedAt) return false;
      if (!rowPasses(activeFilters, bar.match, (key) => getValue(item, key))) return false;
      if (!q) return true;
      const haystack = [
        item.title,
        item.description ?? "",
        item.categoryName,
        item.ownerName ?? "",
        item.remarks ?? "",
        ...item.tags ?? [],
        ...item.urls.map((u) => {
          try {
            return new URL(u.url).hostname;
          } catch {
            return "";
          }
        })
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey) {
      const value = (item) => {
        switch (sortKey) {
          case "serial":
            return item.serial;
          case "category":
            return item.categoryName.toLowerCase();
          case "title":
            return item.title.toLowerCase();
          case "frequency":
            return frequencyLabel(config, item.frequency).toLowerCase();
          case "lastUpdated":
            return item.lastUpdated ?? "";
          case "nextDue":
            return item.nextDue ?? "9999-12-31";
          case "owner":
            return (item.ownerName ?? "").toLowerCase();
          case "status":
            return item.status.toLowerCase();
        }
      };
      rows.sort((a, b) => {
        const av = value(a);
        const bv = value(b);
        return (av < bv ? -1 : av > bv ? 1 : a.serial - b.serial) * dir;
      });
    } else {
      rows.sort((a, b) => {
        const ca = categoryOrder.get(a.categoryName) ?? 999;
        const cb = categoryOrder.get(b.categoryName) ?? 999;
        return ca - cb || a.sortOrder - b.sortOrder || a.serial - b.serial;
      });
    }
    return rows;
  }, [base, quick, recent, activeFilters, bar.match, q, sortKey, sortDir, config, data?.categories]);
  const quickChips = [
    { key: "all", label: "All", count: counts.total },
    { key: "alerts", label: "All due", count: counts.alerts },
    { key: "overdue", label: "Overdue", count: counts.overdue },
    { key: "due-soon", label: "Due soon", count: counts.dueSoon },
    { key: "active", label: "Active", count: counts.active },
    { key: "completed", label: "Completed", count: counts.completed },
    { key: "pinned", label: "Pinned", count: counts.pinned },
    { key: "recent", label: "Recently opened", count: counts.recent }
  ];
  const selected = data?.items.find((item) => item.id === selectedId) ?? null;
  const selectedIndex = selected ? filtered.findIndex((item) => item.id === selected.id) : -1;
  const prev = selectedIndex > 0 ? filtered[selectedIndex - 1] : null;
  const next = selectedIndex >= 0 && selectedIndex < filtered.length - 1 ? filtered[selectedIndex + 1] : null;
  const saveView = (next2) => {
    setView(next2);
    try {
      window.localStorage.setItem(VIEW_KEY, next2);
    } catch {
    }
  };
  const toggleGroup = () => {
    setGroupBy((current) => {
      const next2 = !current;
      try {
        window.localStorage.setItem(GROUP_KEY, next2 ? "1" : "0");
      } catch {
      }
      return next2;
    });
  };
  const onSort = (key) => {
    if (sortKey === key) setSortDir((dir) => dir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const onStatus = async (item, status) => {
    if (status === item.status) return;
    try {
      await setStatus({ id: item.id, status });
      toast.success(`Status changed to ${status}`, {
        duration: 3e4,
        action: {
          label: "Undo",
          onClick: () => void setStatus({ id: item.id, status: item.status })
        }
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change the status");
    }
  };
  const onPin = async (item) => {
    try {
      await setPinned({ id: item.id, pinned: !item.pinned });
      toast.success(item.pinned ? "Unpinned" : "Pinned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not pin");
    }
  };
  const onArchive = async () => {
    if (!archiveTarget) return;
    const item = archiveTarget;
    setArchiveTarget(null);
    try {
      await archiveLink({ id: item.id });
      if (selectedId === item.id) setSelectedId(null);
      toast.success("Link archived", {
        description: "Soft deleted — restore it for 30 seconds.",
        duration: 3e4,
        action: {
          label: "Undo",
          onClick: () => {
            void restoreLink({ id: item.id }).then(() => toast.success("Link restored"));
          }
        }
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not archive the link");
    }
  };
  const onDelete = async () => {
    if (!deleteTarget) return;
    const item = deleteTarget;
    setDeleteTarget(null);
    try {
      await deletePermanently({ id: item.id });
      if (selectedId === item.id) setSelectedId(null);
      toast.success("Link permanently deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the link");
    }
  };
  const onDuplicate = async (item) => {
    try {
      const result = await duplicateLink({ id: item.id });
      toast.success("Link duplicated", {
        action: {
          label: "Undo",
          onClick: () => void archiveLink({ id: result.id })
        }
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not duplicate");
    }
  };
  const onAction = (action, item) => {
    const primary = primaryOf(item);
    if (action === "copy" && primary) {
      void navigator.clipboard.writeText(primary.url).then(() => toast.success("Link copied"));
    } else if (action === "mark") {
      setMarkTarget(item);
    } else if (action === "duplicate") {
      void onDuplicate(item);
    } else if (action === "archive") {
      setArchiveTarget(item);
    } else if (action === "delete") {
      setDeleteTarget(item);
    } else if (action === "edit") {
      openItem(item, true);
    } else if (action === "history") {
      openItem(item);
    } else if (action === "roll-forward") {
      if (!window.confirm(`Create the next quarter's row for “${item.title}”?`)) return;
      void applyRollForward(item);
    }
  };
  const onReorder = async (draggedId, targetId) => {
    if (!data) return;
    const dragged = data.items.find((item) => item.id === draggedId);
    const target = data.items.find((item) => item.id === targetId);
    if (!dragged || !target || dragged.categoryId !== target.categoryId) return;
    const categoryRows = data.items.filter((item) => item.categoryId === target.categoryId && !item.archivedAt).sort((a, b) => a.sortOrder - b.sortOrder || a.serial - b.serial);
    const from = categoryRows.findIndex((item) => item.id === draggedId);
    const to = categoryRows.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const next2 = [...categoryRows];
    const [moved] = next2.splice(from, 1);
    next2.splice(to, 0, moved);
    try {
      await reorderLinks({ ids: next2.map((item) => item.id) });
      toast.success("Manual order saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the order");
    }
  };
  const openImport = () => setImportOpen(true);
  const handleExport = async (format, all = false) => {
    const rows = all ? (data?.items ?? []).filter((item) => !item.archivedAt) : filtered;
    if (!rows.length) {
      toast.error("Nothing to export in this view");
      return;
    }
    const district = appSettings?.settings?.districtName || "District";
    const fileName = linksFileName(district, today);
    const options = {
      fileName,
      title: "Links Organiser",
      subtitle: `${all ? "All visible links" : `${rows.length} filtered link${rows.length === 1 ? "" : "s"}`} · Data as of ${toDisplayStamp(data?.meta.dataAsOf)}`
    };
    try {
      if (format === "excel") await exportLinksExcel(toExportItems(rows), config, options);
      else if (format === "pdf") await exportLinksPdf(toExportItems(rows), config, options);
      else if (format === "csv") exportLinksCsv(toExportItems(rows), config, options);
      else printLinks(toExportItems(rows), config, options);
      toast.success(`${format === "print" ? "Print" : format.toUpperCase()} ready`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the export");
    }
  };
  const downloadTemplate = async () => {
    try {
      await downloadLinksTemplate({
        categories: data?.categories.filter((c) => c.active).map((c) => c.name) ?? [],
        owners: data?.owners.filter((o) => o.active).map((o) => o.name) ?? [],
        statuses: data?.config.statuses ?? [],
        frequencies: data?.config.frequencies ?? [],
        fileName: `${linksFileName(
          appSettings?.settings?.districtName || "District",
          today
        )} template`
      });
      toast.success("Template downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the template");
    }
  };
  if (data === void 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { title: "Links Organiser", subtitle: "Report and data-collection links", titleIcon: BookMarked, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-16 w-full rounded-xl" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-10 w-full rounded-xl" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-72 w-full rounded-xl" })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    AppShell,
    {
      title: "Links Organiser",
      subtitle: `${linkCountsLabel({ total: data.meta.total, dueSoon: data.meta.due, overdue: data.meta.overdue })} · Data as of ${toDisplayStamp(data.meta.dataAsOf)}`,
      titleIcon: BookMarked,
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [
        data.me.canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "gap-1.5", onClick: () => setAddOpen(true), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5" }),
            " Add link"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", className: "gap-1.5", onClick: openImport, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-3.5" }),
            " Import"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", className: "gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" }),
            " Export ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-56", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Export this view" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void handleExport("excel"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "mr-1.5 size-4" }),
              " Excel (.xlsx)"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void handleExport("pdf"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "mr-1.5 size-4" }),
              " PDF"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void handleExport("csv"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "mr-1.5 size-4" }),
              " CSV"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void handleExport("print"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "mr-1.5 size-4" }),
              " Print"
            ] }),
            data.me.isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void handleExport("excel", true), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "mr-1.5 size-4" }),
                " Export all visible"
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "icon", variant: "outline", className: "size-9", "aria-label": "More link actions", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "size-4" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-60", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => downloadTemplate(), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "mr-1.5 size-4" }),
              " Template"
            ] }),
            data.me.isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              DropdownMenuItem,
              {
                onClick: () => {
                  if (!config.linkCheckEnabled) {
                    toast.info("Link check is off by default. Turn it on in Admin → Links when you want a weekly health check.");
                    return;
                  }
                  toast.info("Checking links…");
                  void runLinkCheck({ manual: true }).then((result) => {
                    if (!result.enabled) toast.info("Link check is off in Admin → Links");
                    else if (!result.checked) toast.success("Every link is already checked for today");
                    else {
                      const statuses = Object.entries(result.statuses ?? {}).map(([status, count]) => `${status}: ${count}`).join(" · ");
                      toast.success(`Checked ${result.checked} links`, { description: statuses || void 0 });
                    }
                  }).catch((err) => toast.error(err instanceof Error ? err.message : "Could not check links"));
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "mr-1.5 size-4" }),
                  " Check links ",
                  config.linkCheckEnabled ? "" : "(off)"
                ]
              }
            ),
            data.me.isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => navigate("/admin/links"), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "mr-1.5 size-4" }),
                " Manage categories"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => navigate("/admin/links"), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersHorizontal, { className: "mr-1.5 size-4" }),
                " Settings"
              ] })
            ] })
          ] })
        ] })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 pb-24 md:pb-0", "data-testid": "links-page", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-card/80 p-3 shadow-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 lg:flex-row lg:items-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground", "aria-hidden": true }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    ref: searchRef,
                    value: search,
                    onChange: (e) => setSearch(e.target.value),
                    placeholder: "Search reports, categories, owners, remarks, tags or domains…",
                    "aria-label": "Search links",
                    className: "h-11 rounded-xl border-border/70 bg-background pr-16 pl-9 text-sm"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground", "aria-hidden": true, children: "/" }),
                search && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setSearch(""), "aria-label": "Clear search", className: "absolute top-1/2 right-10 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "shrink-0 text-[11px] text-muted-foreground", "aria-live": "polite", children: [
                "Showing ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "font-semibold text-foreground", children: filtered.length }),
                " of ",
                base.length,
                base.length !== counts.total && ` · ${counts.total} active`
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 hidden md:block", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              UniversalFilterBar,
              {
                pageKey: "links",
                fields,
                value: bar,
                onChange: setBar,
                summary: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  filtered.length,
                  " of ",
                  base.length
                ] }),
                onSaveView: saveCurrentView,
                onResetDefault: () => {
                  const next2 = { barKeys: ["category", "status", "due"], filters: [], match: "all" };
                  setBar(next2);
                  saveBarState("links", next2);
                }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 md:hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", variant: "outline", className: "h-11 w-full justify-center gap-2", onClick: () => setFilterSheet(true), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Funnel, { className: "size-4" }),
              " Filters",
              activeFilters.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary", children: activeFilters.length })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: filterSheet, onOpenChange: setFilterSheet, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "shrink-0 border-b px-4 py-3 pr-12", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Filters" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Tap outside or Esc to return to the list." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 overflow-y-auto p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                UniversalFilterBar,
                {
                  pageKey: "links",
                  fields,
                  value: bar,
                  onChange: setBar,
                  summary: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    filtered.length,
                    " of ",
                    base.length
                  ] }),
                  onSaveView: saveCurrentView,
                  onResetDefault: () => {
                    const next2 = { barKeys: ["category", "status", "due"], filters: [], match: "all" };
                    setBar(next2);
                    saveBarState("links", next2);
                  }
                }
              ) })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5", role: "group", "aria-label": "Link summary filters", children: [
              quickChips.map((chip) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  "aria-pressed": quick === chip.key,
                  onClick: () => setQuick(chip.key),
                  className: cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-8",
                    quick === chip.key ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 bg-background/70 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  ),
                  children: [
                    chip.label,
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-background/80 px-1.5 py-0.5 tabular-nums text-[10px]", children: chip.count })
                  ]
                },
                chip.key
              )),
              counts.archived > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  "aria-pressed": quick === "archived",
                  onClick: () => setQuick(quick === "archived" ? "all" : "archived"),
                  className: cn("ml-auto inline-flex min-h-11 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold md:min-h-8", quick === "archived" ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground"),
                  children: [
                    "Archived ",
                    counts.archived
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex rounded-lg border border-border/70 bg-background/70 p-0.5", role: "tablist", "aria-label": "Links view", children: [
              ["table", "Table", Table2],
              ["cards", "Cards", LayoutGrid],
              ["category", "By category", ListTree]
            ].map(([key, label, Icon]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                role: "tab",
                "aria-selected": view === key,
                onClick: () => saveView(key),
                className: cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors md:min-h-8",
                  view === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5" }),
                  " ",
                  label
                ]
              },
              key
            )) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border/70 bg-background/70 px-2.5 text-xs font-medium text-muted-foreground md:min-h-8", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: groupBy, onChange: toggleGroup, className: "size-3.5 accent-[var(--primary)]" }),
              "Group by category"
            ] }),
            data.me.canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                "aria-pressed": selectMode,
                onClick: toggleSelectMode,
                className: cn(
                  "inline-flex min-h-11 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold md:min-h-8",
                  selectMode ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 bg-background/70 text-muted-foreground"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5" }),
                  " Select"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", className: "h-8 gap-1 text-xs", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Columns3, { className: "size-3.5" }),
                " Columns"
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-56", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "All columns" }),
                LINK_TABLE_ALL_COLUMNS.filter((column) => column.key !== "actions").map((column) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  DropdownMenuItem,
                  {
                    onSelect: (event) => event.preventDefault(),
                    onClick: () => toggleColumn(column.key),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("mr-2 inline-flex size-4 items-center justify-center rounded border", columnKeys.includes(column.key) && "border-primary bg-primary text-primary-foreground"), children: columnKeys.includes(column.key) && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }) }),
                      column.label
                    ]
                  },
                  column.key
                )),
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  DropdownMenuItem,
                  {
                    onClick: () => {
                      setColumnKeys([...LINK_TABLE_DEFAULT_KEYS]);
                      try {
                        window.localStorage.setItem(COLUMNS_KEY, JSON.stringify(LINK_TABLE_DEFAULT_KEYS));
                      } catch {
                      }
                    },
                    children: "Reset to simpler columns"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-[11px] text-muted-foreground", children: sortKey ? `Sorted by ${sortKey} · ${sortDir}` : "Sheet order · drag rows to reorder within a category" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "flex flex-wrap items-center gap-1.5", "aria-label": "Link suggestions", children: [
            needsDetails.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(NeedsDetailsChip, { rows: needsDetails.length, onClick: () => setGapsOpen(true) }),
            duplicateGroupsFound.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => setDuplicatesOpen(true),
                className: "inline-flex min-h-8 items-center gap-1 rounded-full border border-rose-300/70 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-900 hover:bg-rose-100",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(GitMerge, { className: "size-3" }),
                  " Possible duplicates ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-rose-200/70 px-1.5", children: duplicateGroupsFound.length })
                ]
              }
            ),
            rollCandidates.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => {
                  const item = rollCandidates[0];
                  const period = quarterPeriodOf(item);
                  if (item && period) {
                    const next2 = nextQuarterPeriod(period);
                    toast(`Roll forward ${period.text} → ${next2.text}?`, {
                      description: `${rollCandidates.length} completed quarter report(s) can move on.`,
                      action: {
                        label: "Roll first",
                        onClick: () => void applyRollForward(item)
                      }
                    });
                  }
                },
                className: "inline-flex min-h-8 items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "size-3" }),
                  " Roll forward ",
                  rollCandidates.length,
                  " quarter report",
                  rollCandidates.length === 1 ? "" : "s"
                ]
              }
            ),
            selectMode && selectedIds.size > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex flex-wrap items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 p-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-1 text-[11px] font-semibold", children: [
                selectedIds.size,
                " selected"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", className: "h-7 text-[11px]", children: "Category" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuContent, { align: "start", className: "max-h-72 overflow-y-auto", children: data.categories.filter((category) => category.active).map((category) => /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => void bulkSet("category", category.id), children: category.name }, category.id)) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", className: "h-7 text-[11px]", children: "Owner" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuContent, { align: "start", className: "max-h-72 overflow-y-auto", children: data.owners.filter((owner) => owner.active).map((owner) => /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => void bulkSet("owner", owner.id), children: owner.name }, owner.id)) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", className: "h-7 text-[11px]", children: "Status" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuContent, { align: "start", children: config.statuses.map((status) => /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => void bulkSet("status", status.name), children: status.name }, status.name)) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", className: "h-7 text-[11px]", children: "Frequency" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuContent, { align: "start", children: config.frequencies.map((frequency) => /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => void bulkSet("frequency", frequency.value), children: frequency.label }, frequency.value)) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "h-7 gap-1 text-[11px]", onClick: () => void bulkMarkUpdated(), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "size-3" }),
                " Mark updated"
              ] })
            ] })
          ] }),
          data.me.canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "rounded-xl border border-dashed border-border/70 bg-card/60 p-2", "aria-label": "Quick add a link", children: quickDraft && quickSuggest ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            QuickAddRow,
            {
              draft: quickDraft,
              suggestions: quickSuggest,
              categories: data.categories,
              owners: data.owners,
              config,
              saving: quickSaving,
              onChange: (patch) => setQuickDraft((current) => current ? { ...current, ...patch } : current),
              onApplyAll: applyQuickSuggestions,
              onSave: () => void saveQuickDraft(),
              onCancel: () => {
                setQuickDraft(null);
                setQuickSuggest(null);
                setQuickText("");
              }
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { className: "ml-1 size-4 shrink-0 text-muted-foreground" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                value: quickText,
                onChange: (event) => setQuickText(event.target.value),
                onKeyDown: (event) => {
                  if (event.key !== "Enter") return;
                  if (startQuickAdd(quickText)) setQuickText("");
                },
                placeholder: "Paste a URL here (or anywhere on the page) to start a draft…",
                "aria-label": "Quick add link URL",
                className: "h-9 border-transparent bg-transparent px-1 text-sm shadow-none focus-visible:border-input"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                size: "sm",
                className: "h-8 gap-1",
                disabled: !quickText.trim(),
                onClick: () => {
                  if (startQuickAdd(quickText)) setQuickText("");
                  else toast.error("Paste a full http(s) link");
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CopyPlus, { className: "size-3.5" }),
                  " Draft"
                ]
              }
            )
          ] }) }),
          filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { canEdit: data.me.canEdit, hasSearch: !!search || activeFilters.length > 0 || quick !== "all", onAdd: () => setAddOpen(true), onClear: () => {
            setSearch("");
            setQuick("all");
            setBar((b) => ({ ...b, filters: [] }));
          } }) : view === "table" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden md:block", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              LinksTable,
              {
                items: filtered,
                columns,
                config,
                today,
                canEdit: data.me.canEdit,
                isAdmin: data.me.isAdmin,
                query: search,
                categories: data.categories,
                owners: data.owners,
                onPatch: (item, field, value) => void patchInline(item, field, value),
                selectMode,
                selected: selectedIds,
                onToggleSelect: (id) => setSelectedIds((current) => {
                  const next2 = new Set(current);
                  if (next2.has(id)) next2.delete(id);
                  else next2.add(id);
                  return next2;
                }),
                sortKey,
                sortDir,
                onSort,
                groupBy,
                collapsed,
                onToggleGroup: (category) => setCollapsed((current) => {
                  const next2 = new Set(current);
                  if (next2.has(category)) next2.delete(category);
                  else next2.add(category);
                  return next2;
                }),
                onOpen: openItem,
                onMark: setMarkTarget,
                onAction,
                onStatus: (item, status) => void onStatus(item, status),
                onPin: (item) => void onPin(item),
                onReorder: (from, to) => void onReorder(from, to)
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "md:hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardsView, { items: filtered, config, today, canEdit: data.me.canEdit, onOpen: openItem, onMark: setMarkTarget, onPin: (item) => void onPin(item) }) })
          ] }) : view === "cards" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CardsView, { items: filtered, config, today, canEdit: data.me.canEdit, onOpen: openItem, onMark: setMarkTarget, onPin: (item) => void onPin(item), grouped: groupBy }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ByCategoryView, { items: filtered, config, today, canEdit: data.me.canEdit, onOpen: openItem, onMark: setMarkTarget, onPin: (item) => void onPin(item), collapsed, onToggle: setCollapsed }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1.5 pb-2 text-[10px] text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "size-3" }),
            "Visibility is enforced on the server. ",
            data.me.isAdmin ? "You are a State Admin." : data.me.canEdit ? "You are a District Editor." : "You have read-only access.",
            " ",
            "Dates in IST · blank is never 0."
          ] })
        ] }),
        data.me.canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 p-3 backdrop-blur md:hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { className: "h-11 w-full gap-2", onClick: () => setAddOpen(true), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-4" }),
          " Add link"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: gapsOpen, onOpenChange: setGapsOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-h-[85vh] overflow-y-auto sm:max-w-2xl", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Fill the gaps" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { children: [
              needsDetails.length,
              " row",
              needsDetails.length === 1 ? "" : "s",
              " still need a category or owner. Suggestions are shown as chips; nothing changes until you accept."
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: needsDetails.map((item) => {
            const suggestion = gapSuggestion(item);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 p-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-[13px] font-semibold", children: item.title }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
                    item.categoryName,
                    " · ",
                    item.ownerName ?? "No owner"
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", className: "h-7 shrink-0 text-[11px]", onClick: () => void acceptGap(item), children: "Accept suggestion" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex flex-wrap gap-1", children: [
                suggestion.categoryName && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] text-primary", children: [
                  "Category: ",
                  suggestion.categoryName
                ] }),
                suggestion.ownerName && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] text-primary", children: [
                  "Owner: ",
                  suggestion.ownerName
                ] }),
                !suggestion.ownerName && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: "No owner suggestion yet" })
              ] })
            ] }, item.id);
          }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setGapsOpen(false), children: "Close" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => void acceptAllGaps(), disabled: !needsDetails.length, children: "Accept all" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: duplicatesOpen, onOpenChange: setDuplicatesOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-h-[85vh] overflow-y-auto sm:max-w-3xl", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Possible duplicates" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Same title or URL. Choose the row to keep, then merge. The other rows are archived — nothing is deleted — and Undo is offered for 30 seconds." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: duplicateGroupsFound.map((group) => {
            const key = group.map((item) => item.id).sort().join("|");
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 p-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", children: [
                group.length,
                " matching rows"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1", children: group.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "radio",
                    name: `merge-${key}`,
                    checked: (mergeKeep[key] ?? group[0]?.id) === item.id,
                    onChange: () => setMergeKeep((current) => ({ ...current, [key]: item.id })),
                    className: "size-3.5 accent-[var(--primary)]"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-[12px] font-semibold", children: item.title }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-muted-foreground", children: [
                    "Ref ",
                    item.serial,
                    " · ",
                    item.categoryName,
                    " · ",
                    item.urls.length,
                    " link",
                    item.urls.length === 1 ? "" : "s",
                    " · updated ",
                    item.lastUpdated ?? "-"
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[10px] text-muted-foreground", children: "Keep" })
              ] }, item.id)) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "h-8", onClick: () => void mergeGroup(group), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(GitMerge, { className: "mr-1 size-3.5" }),
                " Merge these rows"
              ] }) })
            ] }, key);
          }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogFooter, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setDuplicatesOpen(false), children: "Close" }) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          LinkDialog,
          {
            open: addOpen || !!selected,
            onOpenChange: (open) => {
              if (!open) {
                setAddOpen(false);
                setSelectedId(null);
              }
            },
            item: selected,
            categories: data.categories,
            owners: data.owners,
            config,
            me: { id: data.me.id, canEdit: data.me.canEdit, isAdmin: data.me.isAdmin },
            prev,
            next,
            onPrevious: () => prev && openItem(prev),
            onNext: () => next && openItem(next),
            onMarkUpdated: (item) => {
              setSelectedId(null);
              setMarkTarget(item);
            },
            onDeleted: () => setSelectedId(null),
            startInEdit: editOnOpen,
            existingUrls,
            existingTitles,
            onAddCategory: data.me.isAdmin ? () => navigate("/admin/links") : void 0,
            onAddOwner: data.me.isAdmin ? () => navigate("/admin/links") : void 0
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          LinksImportDialog,
          {
            open: importOpen,
            onOpenChange: setImportOpen,
            categories: data.categories.map((c) => c.name),
            owners: data.owners.map((o) => o.name),
            statuses: data.config.statuses,
            frequencies: data.config.frequencies,
            existing: data.items.map((item) => ({
              id: item.id,
              serial: item.serial,
              title: item.title,
              categoryName: item.categoryName,
              ownerName: item.ownerName,
              level: item.level,
              frequency: item.frequency,
              lastUpdated: item.lastUpdated,
              status: item.status,
              remarks: item.remarks,
              urls: item.urls.map((u) => ({ url: u.url, kind: u.kind }))
            })),
            config: data.config,
            today,
            onImported: () => setSelectedId(null)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          MarkUpdatedDialog,
          {
            item: markTarget,
            config,
            today,
            onOpenChange: (open) => !open && setMarkTarget(null)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialog, { open: !!archiveTarget, onOpenChange: (open) => !open && setArchiveTarget(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogTitle, { children: [
              "Archive “",
              archiveTarget?.title,
              "”?"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: "It leaves the list and stops reminders. You can undo for 30 seconds; after that a State Admin can restore or delete it permanently." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { children: "Cancel" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogAction, { onClick: () => void onArchive(), children: "Archive link" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialog, { open: !!deleteTarget, onOpenChange: (open) => !open && setDeleteTarget(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogTitle, { children: [
              "Permanently delete “",
              deleteTarget?.title,
              "”?"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: "This removes the report, its links and update history. The audit log keeps the record of who deleted it. This cannot be undone." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { children: "Cancel" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogAction, { className: "bg-destructive text-destructive-foreground hover:bg-destructive/90", onClick: () => void onDelete(), children: "Delete permanently" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(LinkCheckNotice, {})
      ]
    }
  );
}
function CardsView({
  items,
  config,
  today,
  canEdit,
  onOpen,
  onMark,
  onPin,
  grouped = true
}) {
  const groups = grouped ? Object.entries(items.reduce((acc, item) => {
    (acc[item.categoryName] ??= []).push(item);
    return acc;
  }, {})) : [["", items]];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: groups.map(([category, rows]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
    category && /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground", children: [
      category,
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-muted px-1.5 py-0.5 text-[10px]", children: rows.length })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-3", children: rows.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      LinkCard,
      {
        item,
        config,
        today,
        canEdit,
        onOpen: () => onOpen(item),
        onMark: () => onMark(item),
        onPin: () => onPin(item)
      },
      item.id
    )) })
  ] }, category || "all")) });
}
function ByCategoryView({
  items,
  config,
  today,
  canEdit,
  onOpen,
  onMark,
  onPin,
  collapsed,
  onToggle
}) {
  const groups = Object.entries(items.reduce((acc, item) => {
    (acc[item.categoryName] ??= []).push(item);
    return acc;
  }, {}));
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: groups.map(([category, rows]) => {
    const closed = collapsed.has(category);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-card/70", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => {
            const next = new Set(collapsed);
            if (closed) next.delete(category);
            else next.add(category);
            onToggle(next);
          },
          "aria-expanded": !closed,
          className: "flex min-h-11 w-full items-center gap-2 px-3 text-left",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: cn("size-4 transition-transform", closed && "-rotate-90") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold", children: category }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground", children: rows.length }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-[10px] text-muted-foreground", children: closed ? "Show" : "Hide" })
          ]
        }
      ),
      !closed && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-border/40 border-t border-border/40", children: rows.map((item) => {
        const primary = primaryOf(item);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex flex-wrap items-center gap-2 px-3 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-7 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground", children: item.serial }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => onOpen(item), className: "block max-w-full truncate text-left text-sm font-semibold hover:text-primary", children: item.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { status: item.status, config }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DueChip, { due: item.due, config }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item.ownerName ?? "-" }),
              primary && /* @__PURE__ */ jsxRuntimeExports.jsx(LinkChip, { link: primary })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PinStar, { pinned: item.pinned, canEdit, onToggle: () => onPin(item) }),
            canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", className: "h-8", onClick: () => onMark(item), children: "Mark updated" })
          ] })
        ] }, item.id);
      }) })
    ] }, category);
  }) });
}
function EmptyState({ canEdit, hasSearch, onAdd, onClear }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(BookMarked, { className: "mx-auto size-8 text-primary/60" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-2 text-sm font-semibold", children: hasSearch ? "No links match this view" : "No links yet" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mx-auto mt-1 max-w-md text-xs text-muted-foreground", children: hasSearch ? "Clear the search and filters, or try a report name, category, owner or domain." : "Paste your existing spreadsheet through Import — the 15 sample rows are not hard-coded in the app." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex justify-center gap-2", children: [
      hasSearch && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", onClick: onClear, children: "Clear filters" }),
      canEdit && !hasSearch && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: onAdd, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-1 size-3.5" }),
        " Add the first link"
      ] })
    ] })
  ] });
}
function MarkUpdatedDialog({
  item,
  config,
  today,
  onOpenChange
}) {
  const mark = useMutation(api.links.markUpdated);
  const undo = useMutation(api.links.undoMarkUpdated);
  const [date, setDate] = reactExports.useState(today);
  const [period, setPeriod] = reactExports.useState("");
  const [note, setNote] = reactExports.useState("");
  const [saving, setSaving] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!item) return;
    setDate(today);
    setPeriod(item.remarks ?? "");
    setNote("");
  }, [item, today]);
  if (!item) return null;
  const nextDue = computeNextDue(date || item.lastUpdated, item.frequency, item.customDays, config.frequencies);
  const save = async () => {
    setSaving(true);
    try {
      const result = await mark({
        id: item.id,
        date,
        periodNote: period.trim() || void 0,
        note: note.trim() || void 0
      });
      onOpenChange(false);
      toast.success("Marked as updated", {
        description: result.nextDue ? `Next due ${formatLinkDate(result.nextDue)}` : "One-time report — no next due date",
        duration: 3e4,
        action: {
          label: "Undo",
          onClick: () => {
            void undo({
              id: item.id,
              lastUpdated: result.previous.lastUpdated ?? void 0,
              nextDue: result.previous.nextDue ?? void 0,
              remarks: result.previous.remarks ?? void 0,
              logId: result.logId
            }).then(() => toast.success("Mark updated undone"));
          }
        }
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark it updated");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!item, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "Mark “",
        item.title,
        "” as updated"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Sets last updated, writes the schedule log and recomputes the next due date. A future date is rejected." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", children: "Date updated" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DateInput, { id: "mark-updated-date", label: "Date updated", value: date, onChange: setDate, max: today, today, className: "min-w-0 flex-1" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", size: "sm", variant: "outline", className: "h-10", onClick: () => setDate(today), children: "Today" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", children: "Period covered (optional)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: period, onChange: (e) => setPeriod(e.target.value), maxLength: 120, placeholder: "e.g. Q2 2026-27" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", children: "Note (optional)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { value: note, onChange: (e) => setNote(e.target.value), rows: 2, maxLength: 300, placeholder: "Anything the next person should know?" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "rounded-lg bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground", children: [
        "Next due: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "text-foreground", children: nextDue ? formatLinkDate(nextDue) : "-" }),
        period.trim() && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          " · Remarks will become “",
          period.trim(),
          "”"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => void save(), disabled: saving || !date, children: saving ? "Saving…" : "Mark updated" })
    ] })
  ] }) });
}
function LinkCheckNotice() {
  return null;
}

export { LinksOrganiser as default };
