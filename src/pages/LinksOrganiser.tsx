import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  BookMarked,
  Check,
  ChevronDown,
  Columns3,
  CopyPlus,
  CircleAlert,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  GitMerge,
  LayoutGrid,
  Link2,
  List,
  RefreshCw,
  ListTree,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { DateInput } from "@/components/DateInput";
import { LinkDialog } from "@/components/links/LinkDialog";
import { LinksImportDialog } from "@/components/links/LinksImportDialog";
import {
  LinkCard,
  LinksTable,
  type LinkPatchField,
  type LinkRowAction,
  type LinkSortKey,
} from "@/components/links/LinksTable";
import {
  NeedsDetailsChip,
  QuickAddRow,
  type LinkQuickDraft,
} from "@/components/links/LinksQuickAdd";
import {
  CategoryChip,
  DueChip,
  LinkChip,
  PinStar,
  StatusPill,
} from "@/components/links/LinkPieces";
import type { LinkCategory, LinkItem, LinksData } from "@/components/links/types";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  UniversalFilterBar,
  loadBarState,
  rowPasses,
  saveBarState,
  type ActiveFilter,
  type BarValue,
  type FilterField,
  type FilterFieldType,
} from "@/components/UniversalFilterBar";
import {
  LINK_TABLE_ALL_COLUMNS,
  LINK_TABLE_DEFAULT_KEYS,
  canEditLinks,
  canRollForward,
  computeNextDue,
  detectLinkType,
  dueStateLabel,
  frequencyLabel,
  linkCountsLabel,
  linksFileName,
  nextQuarterPeriod,
  normalizeLinkUrl,
  quarterPeriodOf,
  type LinkTableColumn,
  type LinksConfig,
} from "@/lib/links";
import {
  duplicateGroups,
  parsePastedLink,
  quickSuggestions,
  titleFromUrl,
  type QuickSuggestions,
} from "@/lib/linksQuickAdd";
import { todayIsoIST } from "@/lib/dateInput";
import { formatLinkDate } from "@/lib/links";
import { toDisplayStamp } from "@/lib/format";
import { downloadLinksTemplate, exportLinksCsv, exportLinksExcel, exportLinksPdf, printLinks, type LinksExportItem } from "@/lib/linksExport";
import { cn } from "@/lib/utils";

type ViewMode = "table" | "cards" | "category";
type QuickFilter = "all" | "alerts" | "overdue" | "due-soon" | "active" | "completed" | "pinned" | "recent" | "archived";

const VIEW_KEY = "nqas.links.view";
const GROUP_KEY = "nqas.links.group";
const COLUMNS_KEY = "nqas.links.columns.v2";
const SELECT_KEY = "nqas.links.selectMode";
const RECENT_PREFIX = "nqas.links.recent.";

function readRecent(userId?: string): string[] {
  if (!userId || typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_PREFIX + userId) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, 30) : [];
  } catch {
    return [];
  }
}

function readView(): ViewMode {
  if (typeof window === "undefined") return "table";
  const saved = window.localStorage.getItem(VIEW_KEY);
  return saved === "cards" || saved === "category" ? saved : "table";
}

function readGroup(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(GROUP_KEY) === "1";
}

function readColumns(): string[] {
  if (typeof window === "undefined") return [...LINK_TABLE_DEFAULT_KEYS];
  try {
    const raw = JSON.parse(window.localStorage.getItem(COLUMNS_KEY) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return [...LINK_TABLE_DEFAULT_KEYS];
    const allowed = new Set(LINK_TABLE_ALL_COLUMNS.map((column) => column.key));
    const keys = raw.filter((key): key is string => typeof key === "string" && allowed.has(key as never));
    return keys.length ? keys : [...LINK_TABLE_DEFAULT_KEYS];
  } catch {
    return [...LINK_TABLE_DEFAULT_KEYS];
  }
}

function readSelectMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SELECT_KEY) === "1";
}

/** A saved view = the filter bar's fields + values, the quick chip and search. */
const VIEW_STATE_KEY = "nqas.links.viewState";
function readViewState(): { bar?: BarValue; quick?: QuickFilter; search?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(VIEW_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { bar?: Partial<BarValue>; quick?: string; search?: string };
    const bar =
      parsed.bar && Array.isArray(parsed.bar.barKeys) && Array.isArray(parsed.bar.filters)
        ? {
            barKeys: parsed.bar.barKeys.filter((key): key is string => typeof key === "string"),
            filters: parsed.bar.filters as BarValue["filters"],
            match: parsed.bar.match === "any" ? ("any" as const) : ("all" as const),
          }
        : undefined;
    const quick = parsed.quick as QuickFilter | undefined;
    return {
      bar,
      quick: quick && ["all", "alerts", "overdue", "due-soon", "active", "completed", "pinned", "recent", "archived"].includes(quick) ? quick : undefined,
      search: typeof parsed.search === "string" ? parsed.search : undefined,
    };
  } catch {
    return null;
  }
}

function dueKey(item: LinkItem): string {
  return item.due.state === "never" ? "overdue" : item.due.state;
}

function primaryOf(item: LinkItem) {
  return item.urls.find((u) => u.kind !== "form" && u.isPrimary) ?? item.urls.find((u) => u.kind !== "form");
}

function toExportItems(items: LinkItem[]): LinksExportItem[] {
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
      isPrimary: u.isPrimary,
    })),
    due: { state: item.due.state, days: item.due.days },
  }));
}

export default function LinksOrganiser() {
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

  const savedView = useMemo(() => readViewState(), []);
  const [search, setSearch] = useState(() => savedView?.search ?? "");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [view, setView] = useState<ViewMode>(readView);
  const [groupBy, setGroupBy] = useState<boolean>(readGroup);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [quick, setQuick] = useState<QuickFilter>(() => {
    const due = params.get("due");
    if (due === "overdue") return "overdue";
    if (due === "due-soon") return "due-soon";
    if (due === "alerts") return "alerts";
    return savedView?.quick ?? "all";
  });
  const [bar, setBar] = useState<BarValue>(() => {
    const shared = loadBarState("links");
    const own = savedView?.bar;
    // The shared bar remembers which fields are shown; the saved view also
    // remembers their values (a stale query must not hide every row on reload).
    if (own) return { ...own, filters: own.filters ?? [] };
    return shared
      ? { ...shared, filters: [] }
      : { barKeys: ["category", "status", "due"], filters: [], match: "all" };
  });
  const [sortKey, setSortKey] = useState<LinkSortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedId, setSelectedId] = useState<string | null>(() => params.get("item"));
  const [editOnOpen, setEditOnOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(() => params.get("add") === "1");
  const [importOpen, setImportOpen] = useState(() => params.get("import") === "1");
  const [filterSheet, setFilterSheet] = useState(false);
  const [markTarget, setMarkTarget] = useState<LinkItem | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<LinkItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LinkItem | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [columnKeys, setColumnKeys] = useState<string[]>(readColumns);
  const [quickText, setQuickText] = useState("");
  const [quickDraft, setQuickDraft] = useState<LinkQuickDraft | null>(null);
  const [quickSuggest, setQuickSuggest] = useState<QuickSuggestions | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [selectMode, setSelectMode] = useState(readSelectMode);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [gapsOpen, setGapsOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [mergeKeep, setMergeKeep] = useState<Record<string, string>>({});
  const seeded = useRef(false);

  const config: LinksConfig = (data?.config ?? {
    statuses: [],
    frequencies: [],
    dueSoonDays: 7,
    defaultVisibility: "everyone",
    notifyMode: "editors",
    sidebarBadge: false,
    defaultFilters: ["category", "status", "due"],
    linkCheckEnabled: false,
    linkCheckWeekly: false,
  }) as LinksConfig;

  useEffect(() => {
    if (data?.me.id) setRecent(readRecent(data.me.id));
  }, [data?.me.id]);

  /* Admin → Filters: first visit only (the saved bar state always wins). */
  const defaultsApplied = useRef(false);
  useEffect(() => {
    if (defaultsApplied.current || !data || loadBarState("links")) return;
    defaultsApplied.current = true;
    const configured = data.config.defaultFilters ?? [];
    if (!configured.length) return;
    setBar((current) => ({
      ...current,
      barKeys: configured.filter((key) => current.barKeys.includes(key) || current.filters.some((f) => f.key === key) || ["category", "owner", "status", "frequency", "due", "linkType", "level", "lastUpdated", "pinned", "archived"].includes(key)),
    }));
  }, [data]);

  // Seed the four category defaults once. This is config, not report rows:
  // the 15 sample reports are only ever added through the importer.
  useEffect(() => {
    if (!data || data.categories.length > 0 || !data.me.canEdit || seeded.current) return;
    seeded.current = true;
    void seedDefaults().catch(() => {
      seeded.current = false;
    });
  }, [data, seedDefaults]);

  useEffect(() => {
    if (!data || !selectedId) return;
    if (!data.items.some((item) => item.id === selectedId)) setSelectedId(null);
  }, [data, selectedId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (!typing && event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const remember = useCallback((id: string) => {
    if (!data?.me.id) return;
    setRecent((current) => {
      const next = [id, ...current.filter((x) => x !== id)].slice(0, 30);
      try {
        window.localStorage.setItem(RECENT_PREFIX + data.me.id, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  }, [data?.me.id]);

  const openItem = (item: LinkItem, edit = false) => {
    remember(item.id);
    setSelectedId(item.id);
    setEditOnOpen(edit);
  };

  const existingUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of data?.items ?? []) {
      for (const url of item.urls) map.set(normalizeLinkUrl(url.url), item.title);
    }
    return map;
  }, [data?.items]);
  const existingTitles = useMemo(
    () =>
      (data?.items ?? []).map((item) => ({
        id: item.id,
        categoryId: item.categoryId,
        title: item.title,
      })),
    [data?.items],
  );

  const columns = useMemo<LinkTableColumn[]>(() => {
    const desired = new Set([...columnKeys, "actions"]);
    return LINK_TABLE_ALL_COLUMNS.filter((column) => desired.has(column.key));
  }, [columnKeys]);

  const toggleColumn = (key: string) => {
    setColumnKeys((current) => {
      const isVisible = current.includes(key);
      if (isVisible && current.filter((item) => item !== "actions").length <= 1) return current;
      const next = isVisible ? current.filter((item) => item !== key) : [...current, key];
      try {
        window.localStorage.setItem(COLUMNS_KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  };

  const toggleSelectMode = () => {
    setSelectMode((current) => {
      const next = !current;
      if (!next) setSelectedIds(new Set());
      try {
        window.localStorage.setItem(SELECT_KEY, next ? "1" : "0");
      } catch {
        /* private mode */
      }
      return next;
    });
  };

  const buildQuickDraft = useCallback(
    (url: string, pausedTitle: string | null, pasted: string | null) => {
      const categories = (data?.categories ?? []).filter((category) => category.active);
      const owners = (data?.owners ?? []).filter((owner) => owner.active);
      const fallbackTitle = pausedTitle ?? pasted ?? titleFromUrl(url);
      const suggestions = quickSuggestions({
        url,
        title: fallbackTitle,
        items: data?.items ?? [],
        config,
        fallbackCategory: categories.find((category) => category.name === "Unsorted")?.name ?? categories[0]?.name ?? null,
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
        status: config.statuses[0]?.name ?? "Active",
      });
      // The draft exists immediately; the title lookup only improves it.
      void fetchPageTitle({ url })
        .then((result) => {
          if (!result.title) return;
          setQuickDraft((current) =>
            current && current.url === url && current.title === fallbackTitle
              ? { ...current, title: result.title! }
              : current,
          );
        })
        .catch(() => undefined);
    },
    [config, data?.categories, data?.items, data?.owners, fetchPageTitle, today],
  );

  const startQuickAdd = useCallback(
    (text: string) => {
      const parsed = parsePastedLink(text);
      if (!parsed) return false;
      buildQuickDraft(parsed.url, parsed.pastedTitle, parsed.pastedTitle);
      return true;
    },
    [buildQuickDraft],
  );

  useEffect(() => {
    if (!data?.me.canEdit) return;
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
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
      title: quickDraft.title.trim() || quickSuggest.title,
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
        categoryId: quickDraft.categoryId ? (quickDraft.categoryId as Id<"link_category">) : undefined,
        title: quickDraft.title.trim() || titleFromUrl(parsed.url),
        frequency: quickDraft.frequency,
        lastUpdated: quickDraft.lastUpdated || today,
        ownerId: quickDraft.ownerId ? (quickDraft.ownerId as Id<"link_owner">) : undefined,
        level: quickDraft.level || undefined,
        status: quickDraft.status,
        urls: [
          {
            label: quickDraft.title.trim() || titleFromUrl(parsed.url),
            url: parsed.url,
            kind: "link",
            isPrimary: true,
            type: parsed.type,
          },
        ],
      });
      if (!quickDraft.categoryId || !quickDraft.ownerId) {
        toast.success("Draft saved — it still needs details", {
          description: "Use “Fill the gaps” to complete it.",
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

  const needsDetails = useMemo(
    () =>
      (data?.items ?? []).filter(
        (item) => !item.archivedAt && (!item.ownerName || /^(unsorted|uncategorised)$/i.test(item.categoryName)),
      ),
    [data?.items],
  );

  const gapSuggestion = useCallback(
    (item: LinkItem) => {
      const primary = primaryOf(item);
      return quickSuggestions({
        url: primary?.url ?? "",
        title: item.title,
        items: (data?.items ?? []).filter((candidate) => candidate.id !== item.id),
        config,
        fallbackCategory: data?.categories.find((category) => category.name !== "Unsorted")?.name ?? null,
      });
    },
    [config, data?.categories, data?.items],
  );

  const acceptGap = async (item: LinkItem, applyOwner = true) => {
    const suggestion = gapSuggestion(item);
    const category = data?.categories.find((candidate) => candidate.name === suggestion.categoryName);
    const owner = data?.owners.find((candidate) => candidate.name === suggestion.ownerName);
    try {
      if ((!item.ownerName || /unsorted/i.test(item.categoryName)) && category && !/unsorted/i.test(item.categoryName)) {
        await patchLinkField({ id: item.id as Id<"link_item">, field: "category", value: category.id });
      }
      if (applyOwner && !item.ownerName && owner) {
        await patchLinkField({ id: item.id as Id<"link_item">, field: "owner", value: owner.id });
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

  const duplicateGroupsFound = useMemo(
    () => duplicateGroups((data?.items ?? []).filter((item) => !item.archivedAt)),
    [data?.items],
  );

  const mergeGroup = async (group: LinkItem[]) => {
    const keepId = mergeKeep[group.map((item) => item.id).sort().join("|")] ?? group[0]?.id;
    if (!keepId) return;
    try {
      const result = await mergeLinks({
        keepId: keepId as Id<"link_item">,
        otherIds: group.filter((item) => item.id !== keepId).map((item) => item.id as Id<"link_item">),
      });
      toast.success("Duplicates merged — kept one row", {
        duration: 30_000,
        action: {
          label: "Undo",
          onClick: () => {
            void Promise.all(
              result.archivedIds.map((id) => restoreLink({ id: id as Id<"link_item"> })),
            ).then(() => toast.success("Merge undone"));
          },
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not merge the duplicates");
    }
  };

  const rollCandidates = useMemo(
    () => (data?.items ?? []).filter((item) => !item.archivedAt && canRollForward(item, today)),
    [data?.items, today],
  );

  const applyRollForward = async (item: LinkItem) => {
    try {
      const result = await rollForwardLink({ id: item.id as Id<"link_item"> });
      toast.success("Next quarter created", {
        description: `${result.title} · last updated cleared`,
        duration: 30_000,
        action: {
          label: "Undo",
          onClick: () => {
            void archiveLink({ id: result.id as Id<"link_item"> }).then(() => toast.success("Roll forward undone"));
          },
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not roll the quarter forward");
    }
  };

  const patchInline = async (item: LinkItem, field: LinkPatchField, value: string) => {
    try {
      await patchLinkField({ id: item.id as Id<"link_item">, field, value });
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that cell");
    }
  };

  const bulkSet = async (field: LinkPatchField, value: string) => {
    if (!selectedIds.size) return;
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          patchLinkField({ id: id as Id<"link_item">, field, value }),
        ),
      );
      toast.success(`Updated ${selectedIds.size} row${selectedIds.size === 1 ? "" : "s"}`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the selection");
    }
  };

  const bulkMarkUpdated = async () => {
    if (!selectedIds.size) return;
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          markUpdatedLink({ id: id as Id<"link_item">, date: today }),
        ),
      );
      toast.success(`Marked ${selectedIds.size} row${selectedIds.size === 1 ? "" : "s"} updated`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark the selection updated");
    }
  };

  const saveCurrentView = useCallback(() => {
    try {
      window.localStorage.setItem(VIEW_STATE_KEY, JSON.stringify({ bar, quick, search }));
      toast.success("View saved — it will reopen with these filters");
    } catch {
      toast.error("This browser is not allowing saved views");
    }
  }, [bar, quick, search]);

  const fields: FilterField[] = useMemo(() => {
    const cats = data?.categories ?? [];
    const owners = data?.owners ?? [];
    const statuses = data?.config.statuses ?? [];
    const freqs = data?.config.frequencies ?? [];
    return [
      {
        key: "category",
        label: "Category",
        type: "select" as FilterFieldType,
        onThisPage: true,
        options: cats.filter((c) => c.active).map((c) => ({ value: c.name })),
      },
      {
        key: "owner",
        label: "Owner",
        type: "select" as FilterFieldType,
        onThisPage: true,
        options: owners.filter((o) => o.active).map((o) => ({ value: o.name })),
      },
      {
        key: "status",
        label: "Status",
        type: "select" as FilterFieldType,
        onThisPage: true,
        options: statuses.map((s) => ({ value: s.name })),
      },
      {
        key: "frequency",
        label: "Frequency",
        type: "select" as FilterFieldType,
        onThisPage: true,
        options: freqs.map((f) => ({ value: f.label })),
      },
      {
        key: "due",
        label: "Due state",
        type: "select" as FilterFieldType,
        onThisPage: true,
        options: [
          { value: "overdue", label: "Overdue" },
          { value: "due-soon", label: "Due soon" },
          { value: "up-to-date", label: "Up to date" },
          { value: "none", label: "No due date" },
        ],
      },
      {
        key: "linkType",
        label: "Link type",
        type: "select" as FilterFieldType,
        onThisPage: true,
        options: ["sheet", "form", "doc", "pdf", "drive", "video", "web"].map((v) => ({ value: v })),
      },
      {
        key: "level",
        label: "Level",
        type: "select" as FilterFieldType,
        onThisPage: true,
        options: ["National", "State", "District"].map((v) => ({ value: v })),
      },
      {
        key: "lastUpdated",
        label: "Last updated",
        type: "date" as FilterFieldType,
        onThisPage: true,
      },
      {
        key: "pinned",
        label: "Pinned",
        type: "boolean" as FilterFieldType,
        onThisPage: true,
      },
      {
        key: "archived",
        label: "Archived",
        type: "boolean" as FilterFieldType,
        special: true,
      },
    ];
  }, [data]);

  const activeFilters = bar.filters.filter(
    (f) => bar.barKeys.includes(f.key) && f.values.length > 0,
  );
  const archivedRequested = activeFilters.some(
    (f) => f.key === "archived" && f.values.includes("Yes"),
  );

  const getValue = (item: LinkItem, key: string): unknown => {
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

  const base = useMemo(
    () => (data?.items ?? []).filter((item) => archivedRequested || !item.archivedAt),
    [data?.items, archivedRequested],
  );

  const counts = useMemo(() => {
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
      alerts:
        active.filter((item) => item.due.state === "due-soon").length +
        active.filter((item) => item.due.state === "overdue" || item.due.state === "never").length,
    };
  }, [data?.items, recent]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
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
        ...(item.tags ?? []),
        ...item.urls.map((u) => {
          try {
            return new URL(u.url).hostname;
          } catch {
            return "";
          }
        }),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey) {
      const value = (item: LinkItem): string | number => {
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
        return ca - cb || (a.sortOrder - b.sortOrder) || a.serial - b.serial;
      });
    }
    return rows;
  }, [base, quick, recent, activeFilters, bar.match, q, sortKey, sortDir, config, data?.categories]);

  const quickChips: { key: QuickFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.total },
    { key: "alerts", label: "All due", count: counts.alerts },
    { key: "overdue", label: "Overdue", count: counts.overdue },
    { key: "due-soon", label: "Due soon", count: counts.dueSoon },
    { key: "active", label: "Active", count: counts.active },
    { key: "completed", label: "Completed", count: counts.completed },
    { key: "pinned", label: "Pinned", count: counts.pinned },
    { key: "recent", label: "Recently opened", count: counts.recent },
  ];

  const selected = data?.items.find((item) => item.id === selectedId) ?? null;
  const selectedIndex = selected ? filtered.findIndex((item) => item.id === selected.id) : -1;
  const prev = selectedIndex > 0 ? filtered[selectedIndex - 1] : null;
  const next = selectedIndex >= 0 && selectedIndex < filtered.length - 1 ? filtered[selectedIndex + 1] : null;

  const saveView = (next: ViewMode) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* ignore */
    }
  };
  const toggleGroup = () => {
    setGroupBy((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(GROUP_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const onSort = (key: LinkSortKey) => {
    if (sortKey === key) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const onStatus = async (item: LinkItem, status: string) => {
    if (status === item.status) return;
    try {
      await setStatus({ id: item.id as Id<"link_item">, status });
      toast.success(`Status changed to ${status}`, {
        duration: 30_000,
        action: {
          label: "Undo",
          onClick: () => void setStatus({ id: item.id as Id<"link_item">, status: item.status }),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change the status");
    }
  };

  const onPin = async (item: LinkItem) => {
    try {
      await setPinned({ id: item.id as Id<"link_item">, pinned: !item.pinned });
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
      await archiveLink({ id: item.id as Id<"link_item"> });
      if (selectedId === item.id) setSelectedId(null);
      toast.success("Link archived", {
        description: "Soft deleted — restore it for 30 seconds.",
        duration: 30_000,
        action: {
          label: "Undo",
          onClick: () => {
            void restoreLink({ id: item.id as Id<"link_item"> }).then(() => toast.success("Link restored"));
          },
        },
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
      await deletePermanently({ id: item.id as Id<"link_item"> });
      if (selectedId === item.id) setSelectedId(null);
      toast.success("Link permanently deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the link");
    }
  };

  const onDuplicate = async (item: LinkItem) => {
    try {
      const result = await duplicateLink({ id: item.id as Id<"link_item"> });
      toast.success("Link duplicated", {
        action: {
          label: "Undo",
          onClick: () => void archiveLink({ id: result.id as Id<"link_item"> }),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not duplicate");
    }
  };

  const onAction = (action: LinkRowAction, item: LinkItem) => {
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

  const onReorder = async (draggedId: string, targetId: string) => {
    if (!data) return;
    const dragged = data.items.find((item) => item.id === draggedId);
    const target = data.items.find((item) => item.id === targetId);
    if (!dragged || !target || dragged.categoryId !== target.categoryId) return;
    const categoryRows = data.items
      .filter((item) => item.categoryId === target.categoryId && !item.archivedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.serial - b.serial);
    const from = categoryRows.findIndex((item) => item.id === draggedId);
    const to = categoryRows.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...categoryRows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    try {
      await reorderLinks({ ids: next.map((item) => item.id as Id<"link_item">) });
      toast.success("Manual order saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the order");
    }
  };

  const openImport = () => setImportOpen(true);

  const handleExport = async (format: "excel" | "pdf" | "csv" | "print", all = false) => {
    const rows = all ? (data?.items ?? []).filter((item) => !item.archivedAt) : filtered;
    if (!rows.length) {
      toast.error("Nothing to export in this view");
      return;
    }
    const district =
      ((appSettings?.settings as Record<string, unknown> | undefined)?.districtName as string | undefined) ||
      "District";
    const fileName = linksFileName(district, today);
    const options = {
      fileName,
      title: "Links Organiser",
      subtitle: `${all ? "All visible links" : `${rows.length} filtered link${rows.length === 1 ? "" : "s"}`} · Data as of ${toDisplayStamp(data?.meta.dataAsOf)}`,
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
          ((appSettings?.settings as Record<string, unknown> | undefined)?.districtName as string | undefined) ||
            "District",
          today,
        )} template`,
      });
      toast.success("Template downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the template");
    }
  };

  if (data === undefined) {
    return (
      <AppShell title="Links Organiser" subtitle="Report and data-collection links" titleIcon={BookMarked}>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Links Organiser"
      subtitle={`${linkCountsLabel({ total: data.meta.total, dueSoon: data.meta.due, overdue: data.meta.overdue })} · Data as of ${toDisplayStamp(data.meta.dataAsOf)}`}
      titleIcon={BookMarked}
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          {data.me.canEdit && (
            <>
              <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
                <Plus className="size-3.5" /> Add link
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={openImport}>
                <Upload className="size-3.5" /> Import
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Download className="size-3.5" /> Export <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Export this view</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => void handleExport("excel")}><FileSpreadsheet className="mr-1.5 size-4" /> Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport("pdf")}><FileText className="mr-1.5 size-4" /> PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport("csv")}><FileText className="mr-1.5 size-4" /> CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport("print")}><Printer className="mr-1.5 size-4" /> Print</DropdownMenuItem>
              {data.me.isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void handleExport("excel", true)}><FileSpreadsheet className="mr-1.5 size-4" /> Export all visible</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" className="size-9" aria-label="More link actions"><MoreHorizontal className="size-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onClick={() => downloadTemplate()}><FileSpreadsheet className="mr-1.5 size-4" /> Template</DropdownMenuItem>
              {data.me.isAdmin && (
                <DropdownMenuItem
                  onClick={() => {
                    if (!config.linkCheckEnabled) {
                      toast.info("Link check is off by default. Turn it on in Admin → Links when you want a weekly health check.");
                      return;
                    }
                    toast.info("Checking links…");
                    void runLinkCheck({ manual: true })
                      .then((result) => {
                        if (!result.enabled) toast.info("Link check is off in Admin → Links");
                        else if (!result.checked) toast.success("Every link is already checked for today");
                        else {
                          const statuses = Object.entries(result.statuses ?? {})
                            .map(([status, count]) => `${status}: ${count}`)
                            .join(" · ");
                          toast.success(`Checked ${result.checked} links`, { description: statuses || undefined });
                        }
                      })
                      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not check links"));
                  }}
                >
                  <ShieldCheck className="mr-1.5 size-4" /> Check links {config.linkCheckEnabled ? "" : "(off)"}
                </DropdownMenuItem>
              )}
              {data.me.isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/admin/links")}><Settings className="mr-1.5 size-4" /> Manage categories</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/links")}><SlidersHorizontal className="mr-1.5 size-4" /> Settings</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="space-y-3 pb-24 md:pb-0" data-testid="links-page">
        <section className="rounded-xl border border-border/60 bg-card/80 p-3 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reports, categories, owners, remarks, tags or domains…"
                aria-label="Search links"
                className="h-11 rounded-xl border-border/70 bg-background pr-16 pl-9 text-sm"
              />
              <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground" aria-hidden>/</kbd>
              {search && (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute top-1/2 right-10 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <p className="shrink-0 text-[11px] text-muted-foreground" aria-live="polite">
              Showing <b className="font-semibold text-foreground">{filtered.length}</b> of {base.length}
              {base.length !== counts.total && ` · ${counts.total} active`}
            </p>
          </div>
          <div className="mt-2 hidden md:block">
            <UniversalFilterBar
              pageKey="links"
              fields={fields}
              value={bar}
              onChange={setBar}
              summary={<span>{filtered.length} of {base.length}</span>}
              onSaveView={saveCurrentView}
              onResetDefault={() => {
                const next = { barKeys: ["category", "status", "due"], filters: [], match: "all" as const };
                setBar(next);
                saveBarState("links", next);
              }}
            />
          </div>
          <div className="mt-2 md:hidden">
            <Button type="button" variant="outline" className="h-11 w-full justify-center gap-2" onClick={() => setFilterSheet(true)}>
              <Filter className="size-4" /> Filters
              {activeFilters.length > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{activeFilters.length}</span>}
            </Button>
          </div>
          <Dialog open={filterSheet} onOpenChange={setFilterSheet}>
            <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0">
              <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12">
                <DialogTitle>Filters</DialogTitle>
                <DialogDescription>Tap outside or Esc to return to the list.</DialogDescription>
              </DialogHeader>
              <div className="min-h-0 overflow-y-auto p-3">
                <UniversalFilterBar
                  pageKey="links"
                  fields={fields}
                  value={bar}
                  onChange={setBar}
                  summary={<span>{filtered.length} of {base.length}</span>}
                  onSaveView={saveCurrentView}
                  onResetDefault={() => {
                    const next = { barKeys: ["category", "status", "due"], filters: [], match: "all" as const };
                    setBar(next);
                    saveBarState("links", next);
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Link summary filters">
            {quickChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                aria-pressed={quick === chip.key}
                onClick={() => setQuick(chip.key)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-8",
                  quick === chip.key
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/70 bg-background/70 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                {chip.label}
                <span className="rounded-full bg-background/80 px-1.5 py-0.5 tabular-nums text-[10px]">{chip.count}</span>
              </button>
            ))}
            {counts.archived > 0 && (
              <button
                type="button"
                aria-pressed={quick === "archived"}
                onClick={() => setQuick(quick === "archived" ? "all" : "archived")}
                className={cn("ml-auto inline-flex min-h-11 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold md:min-h-8", quick === "archived" ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground")}
              >
                Archived {counts.archived}
              </button>
            )}
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border/70 bg-background/70 p-0.5" role="tablist" aria-label="Links view">
            {([
              ["table", "Table", Table2],
              ["cards", "Cards", LayoutGrid],
              ["category", "By category", ListTree],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => saveView(key)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors md:min-h-8",
                  view === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
          <label className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border/70 bg-background/70 px-2.5 text-xs font-medium text-muted-foreground md:min-h-8">
            <input type="checkbox" checked={groupBy} onChange={toggleGroup} className="size-3.5 accent-[var(--primary)]" />
            Group by category
          </label>
          {data.me.canEdit && (
            <button
              type="button"
              aria-pressed={selectMode}
              onClick={toggleSelectMode}
              className={cn(
                "inline-flex min-h-11 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold md:min-h-8",
                selectMode ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 bg-background/70 text-muted-foreground",
              )}
            >
              <Check className="size-3.5" /> Select
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                <Columns3 className="size-3.5" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>All columns</DropdownMenuLabel>
              {LINK_TABLE_ALL_COLUMNS.filter((column) => column.key !== "actions").map((column) => (
                <DropdownMenuItem
                  key={column.key}
                  onSelect={(event) => event.preventDefault()}
                  onClick={() => toggleColumn(column.key)}
                >
                  <span className={cn("mr-2 inline-flex size-4 items-center justify-center rounded border", columnKeys.includes(column.key) && "border-primary bg-primary text-primary-foreground")}>
                    {columnKeys.includes(column.key) && <Check className="size-3" />}
                  </span>
                  {column.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setColumnKeys([...LINK_TABLE_DEFAULT_KEYS]);
                  try {
                    window.localStorage.setItem(COLUMNS_KEY, JSON.stringify(LINK_TABLE_DEFAULT_KEYS));
                  } catch {
                    /* private mode */
                  }
                }}
              >
                Reset to simpler columns
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {sortKey ? `Sorted by ${sortKey} · ${sortDir}` : "Sheet order · drag rows to reorder within a category"}
          </span>
        </section>

        <section className="flex flex-wrap items-center gap-1.5" aria-label="Link suggestions">
          {needsDetails.length > 0 && <NeedsDetailsChip rows={needsDetails.length} onClick={() => setGapsOpen(true)} />}
          {duplicateGroupsFound.length > 0 && (
            <button
              type="button"
              onClick={() => setDuplicatesOpen(true)}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-rose-300/70 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-900 hover:bg-rose-100"
            >
              <GitMerge className="size-3" /> Possible duplicates <span className="rounded-full bg-rose-200/70 px-1.5">{duplicateGroupsFound.length}</span>
            </button>
          )}
          {rollCandidates.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const item = rollCandidates[0];
                const period = quarterPeriodOf(item);
                if (item && period) {
                  const next = nextQuarterPeriod(period);
                  toast(`Roll forward ${period.text} → ${next.text}?`, {
                    description: `${rollCandidates.length} completed quarter report(s) can move on.`,
                    action: {
                      label: "Roll first",
                      onClick: () => void applyRollForward(item),
                    },
                  });
                }
              }}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              <RefreshCw className="size-3" /> Roll forward {rollCandidates.length} quarter report{rollCandidates.length === 1 ? "" : "s"}
            </button>
          )}
          {selectMode && selectedIds.size > 0 && (
            <div className="ml-auto flex flex-wrap items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 p-1">
              <span className="px-1 text-[11px] font-semibold">{selectedIds.size} selected</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-7 text-[11px]">Category</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                  {data.categories.filter((category) => category.active).map((category) => (
                    <DropdownMenuItem key={category.id} onClick={() => void bulkSet("category", category.id)}>{category.name}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-7 text-[11px]">Owner</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                  {data.owners.filter((owner) => owner.active).map((owner) => (
                    <DropdownMenuItem key={owner.id} onClick={() => void bulkSet("owner", owner.id)}>{owner.name}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-7 text-[11px]">Status</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {config.statuses.map((status) => (
                    <DropdownMenuItem key={status.name} onClick={() => void bulkSet("status", status.name)}>{status.name}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-7 text-[11px]">Frequency</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {config.frequencies.map((frequency) => (
                    <DropdownMenuItem key={frequency.value} onClick={() => void bulkSet("frequency", frequency.value)}>{frequency.label}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" className="h-7 gap-1 text-[11px]" onClick={() => void bulkMarkUpdated()}>
                <RefreshCw className="size-3" /> Mark updated
              </Button>
            </div>
          )}
        </section>

        {data.me.canEdit && (
          <section className="rounded-xl border border-dashed border-border/70 bg-card/60 p-2" aria-label="Quick add a link">
            {quickDraft && quickSuggest ? (
              <QuickAddRow
                draft={quickDraft}
                suggestions={quickSuggest}
                categories={data.categories}
                owners={data.owners}
                config={config}
                saving={quickSaving}
                onChange={(patch) => setQuickDraft((current) => (current ? { ...current, ...patch } : current))}
                onApplyAll={applyQuickSuggestions}
                onSave={() => void saveQuickDraft()}
                onCancel={() => {
                  setQuickDraft(null);
                  setQuickSuggest(null);
                  setQuickText("");
                }}
              />
            ) : (
              <div className="flex items-center gap-2">
                <Link2 className="ml-1 size-4 shrink-0 text-muted-foreground" />
                <Input
                  value={quickText}
                  onChange={(event) => setQuickText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    if (startQuickAdd(quickText)) setQuickText("");
                  }}
                  placeholder="Paste a URL here (or anywhere on the page) to start a draft…"
                  aria-label="Quick add link URL"
                  className="h-9 border-transparent bg-transparent px-1 text-sm shadow-none focus-visible:border-input"
                />
                <Button
                  size="sm"
                  className="h-8 gap-1"
                  disabled={!quickText.trim()}
                  onClick={() => {
                    if (startQuickAdd(quickText)) setQuickText("");
                    else toast.error("Paste a full http(s) link");
                  }}
                >
                  <CopyPlus className="size-3.5" /> Draft
                </Button>
              </div>
            )}
          </section>
        )}

        {filtered.length === 0 ? (
          <EmptyState canEdit={data.me.canEdit} hasSearch={!!search || activeFilters.length > 0 || quick !== "all"} onAdd={() => setAddOpen(true)} onClear={() => { setSearch(""); setQuick("all"); setBar((b) => ({ ...b, filters: [] })); }} />
        ) : view === "table" ? (
          <>
            <div className="hidden md:block">
              <LinksTable
                items={filtered}
                columns={columns}
                config={config}
                today={today}
                canEdit={data.me.canEdit}
                isAdmin={data.me.isAdmin}
                query={search}
                categories={data.categories}
                owners={data.owners}
                onPatch={(item, field, value) => void patchInline(item, field, value)}
                selectMode={selectMode}
                selected={selectedIds}
                onToggleSelect={(id) =>
                  setSelectedIds((current) => {
                    const next = new Set(current);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                groupBy={groupBy}
                collapsed={collapsed}
                onToggleGroup={(category) => setCollapsed((current) => {
                  const next = new Set(current);
                  if (next.has(category)) next.delete(category);
                  else next.add(category);
                  return next;
                })}
                onOpen={openItem}
                onMark={setMarkTarget}
                onAction={onAction}
                onStatus={(item, status) => void onStatus(item, status)}
                onPin={(item) => void onPin(item)}
                onReorder={(from, to) => void onReorder(from, to)}
              />
            </div>
            <div className="md:hidden">
              <CardsView items={filtered} config={config} today={today} canEdit={data.me.canEdit} onOpen={openItem} onMark={setMarkTarget} onPin={(item) => void onPin(item)} />
            </div>
          </>
        ) : view === "cards" ? (
          <CardsView items={filtered} config={config} today={today} canEdit={data.me.canEdit} onOpen={openItem} onMark={setMarkTarget} onPin={(item) => void onPin(item)} grouped={groupBy} />
        ) : (
          <ByCategoryView items={filtered} config={config} today={today} canEdit={data.me.canEdit} onOpen={openItem} onMark={setMarkTarget} onPin={(item) => void onPin(item)} collapsed={collapsed} onToggle={setCollapsed} />
        )}

        <p className="flex items-center gap-1.5 pb-2 text-[10px] text-muted-foreground">
          <ShieldCheck className="size-3" />
          Visibility is enforced on the server. {data.me.isAdmin ? "You are a State Admin." : data.me.canEdit ? "You are a District Editor." : "You have read-only access."}
          {" "}Dates in IST · blank is never 0.
        </p>
      </div>

      {data.me.canEdit && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 p-3 backdrop-blur md:hidden">
          <Button className="h-11 w-full gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Add link
          </Button>
        </div>
      )}

      <Dialog open={gapsOpen} onOpenChange={setGapsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fill the gaps</DialogTitle>
            <DialogDescription>
              {needsDetails.length} row{needsDetails.length === 1 ? "" : "s"} still need a category or owner. Suggestions are shown as chips; nothing changes until you accept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {needsDetails.map((item) => {
              const suggestion = gapSuggestion(item);
              return (
                <div key={item.id} className="rounded-lg border border-border/60 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.categoryName} · {item.ownerName ?? "No owner"}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 shrink-0 text-[11px]" onClick={() => void acceptGap(item)}>
                      Accept suggestion
                    </Button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {suggestion.categoryName && <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] text-primary">Category: {suggestion.categoryName}</span>}
                    {suggestion.ownerName && <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] text-primary">Owner: {suggestion.ownerName}</span>}
                    {!suggestion.ownerName && <span className="text-[10px] text-muted-foreground">No owner suggestion yet</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGapsOpen(false)}>Close</Button>
            <Button onClick={() => void acceptAllGaps()} disabled={!needsDetails.length}>Accept all</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicatesOpen} onOpenChange={setDuplicatesOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Possible duplicates</DialogTitle>
            <DialogDescription>
              Same title or URL. Choose the row to keep, then merge. The other rows are archived — nothing is deleted — and Undo is offered for 30 seconds.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {duplicateGroupsFound.map((group) => {
              const key = group.map((item) => item.id).sort().join("|");
              return (
                <div key={key} className="rounded-lg border border-border/60 p-2">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.length} matching rows
                  </p>
                  <div className="space-y-1">
                    {group.map((item) => (
                      <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50">
                        <input
                          type="radio"
                          name={`merge-${key}`}
                          checked={(mergeKeep[key] ?? group[0]?.id) === item.id}
                          onChange={() => setMergeKeep((current) => ({ ...current, [key]: item.id }))}
                          className="size-3.5 accent-[var(--primary)]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-semibold">{item.title}</span>
                          <span className="text-[10px] text-muted-foreground">
                            Ref {item.serial} · {item.categoryName} · {item.urls.length} link{item.urls.length === 1 ? "" : "s"} · updated {item.lastUpdated ?? "-"}
                          </span>
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">Keep</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-1 flex justify-end">
                    <Button size="sm" className="h-8" onClick={() => void mergeGroup(group)}>
                      <GitMerge className="mr-1 size-3.5" /> Merge these rows
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicatesOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LinkDialog
        open={addOpen || !!selected}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setSelectedId(null);
          }
        }}
        item={selected}
        categories={data.categories}
        owners={data.owners}
        config={config}
        me={{ id: data.me.id, canEdit: data.me.canEdit, isAdmin: data.me.isAdmin }}
        prev={prev}
        next={next}
        onPrevious={() => prev && openItem(prev)}
        onNext={() => next && openItem(next)}
        onMarkUpdated={(item) => {
          setSelectedId(null);
          setMarkTarget(item);
        }}
        onDeleted={() => setSelectedId(null)}
        startInEdit={editOnOpen}
        existingUrls={existingUrls}
        existingTitles={existingTitles}
        onAddCategory={data.me.isAdmin ? () => navigate("/admin/links") : undefined}
        onAddOwner={data.me.isAdmin ? () => navigate("/admin/links") : undefined}
      />

      <LinksImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        categories={data.categories.map((c) => c.name)}
        owners={data.owners.map((o) => o.name)}
        statuses={data.config.statuses}
        frequencies={data.config.frequencies}
        existing={data.items.map((item) => ({
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
          urls: item.urls.map((u) => ({ url: u.url, kind: u.kind })),
        }))}
        config={data.config}
        today={today}
        onImported={() => setSelectedId(null)}
      />

      <MarkUpdatedDialog
        item={markTarget}
        config={config}
        today={today}
        onOpenChange={(open) => !open && setMarkTarget(null)}
      />

      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive “{archiveTarget?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It leaves the list and stops reminders. You can undo for 30 seconds; after that a State Admin can restore or delete it permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onArchive()}>Archive link</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete “{deleteTarget?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the report, its links and update history. The audit log keeps the record of who deleted it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void onDelete()}>Delete permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LinkCheckNotice />
    </AppShell>
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
  grouped = true,
}: {
  items: LinkItem[];
  config: LinksConfig;
  today: string;
  canEdit: boolean;
  onOpen: (item: LinkItem, edit?: boolean) => void;
  onMark: (item: LinkItem) => void;
  onPin: (item: LinkItem) => void;
  grouped?: boolean;
}) {
  const groups = grouped
    ? Object.entries(items.reduce<Record<string, LinkItem[]>>((acc, item) => {
        (acc[item.categoryName] ??= []).push(item);
        return acc;
      }, {}))
    : [["", items] as [string, LinkItem[]]];
  return (
    <div className="space-y-4">
      {groups.map(([category, rows]) => (
        <section key={category || "all"}>
          {category && (
            <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {category} <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{rows.length}</span>
            </h2>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((item) => (
              <LinkCard
                key={item.id}
                item={item}
                config={config}
                today={today}
                canEdit={canEdit}
                onOpen={() => onOpen(item)}
                onMark={() => onMark(item)}
                onPin={() => onPin(item)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
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
  onToggle,
}: {
  items: LinkItem[];
  config: LinksConfig;
  today: string;
  canEdit: boolean;
  onOpen: (item: LinkItem, edit?: boolean) => void;
  onMark: (item: LinkItem) => void;
  onPin: (item: LinkItem) => void;
  collapsed: Set<string>;
  onToggle: (next: Set<string>) => void;
}) {
  const groups = Object.entries(items.reduce<Record<string, LinkItem[]>>((acc, item) => {
    (acc[item.categoryName] ??= []).push(item);
    return acc;
  }, {}));
  return (
    <div className="space-y-2">
      {groups.map(([category, rows]) => {
        const closed = collapsed.has(category);
        return (
          <section key={category} className="rounded-xl border border-border/60 bg-card/70">
            <button
              type="button"
              onClick={() => {
                const next = new Set(collapsed);
                if (closed) next.delete(category);
                else next.add(category);
                onToggle(next);
              }}
              aria-expanded={!closed}
              className="flex min-h-11 w-full items-center gap-2 px-3 text-left"
            >
              <ChevronDown className={cn("size-4 transition-transform", closed && "-rotate-90")} />
              <span className="text-sm font-semibold">{category}</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{rows.length}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{closed ? "Show" : "Hide"}</span>
            </button>
            {!closed && (
              <ul className="divide-y divide-border/40 border-t border-border/40">
                {rows.map((item) => {
                  const primary = primaryOf(item);
                  return (
                    <li key={item.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <span className="w-7 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{item.serial}</span>
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => onOpen(item)} className="block max-w-full truncate text-left text-sm font-semibold hover:text-primary">{item.title}</button>
                        <span className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                          <StatusPill status={item.status} config={config} />
                          <DueChip due={item.due} config={config} />
                          <span>{item.ownerName ?? "-"}</span>
                          {primary && <LinkChip link={primary} />}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <PinStar pinned={item.pinned} canEdit={canEdit} onToggle={() => onPin(item)} />
                        {canEdit && <Button size="sm" variant="ghost" className="h-8" onClick={() => onMark(item)}>Mark updated</Button>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function EmptyState({ canEdit, hasSearch, onAdd, onClear }: { canEdit: boolean; hasSearch: boolean; onAdd: () => void; onClear: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center">
      <BookMarked className="mx-auto size-8 text-primary/60" />
      <h2 className="mt-2 text-sm font-semibold">{hasSearch ? "No links match this view" : "No links yet"}</h2>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
        {hasSearch
          ? "Clear the search and filters, or try a report name, category, owner or domain."
          : "Paste your existing spreadsheet through Import — the 15 sample rows are not hard-coded in the app."}
      </p>
      <div className="mt-3 flex justify-center gap-2">
        {hasSearch && <Button size="sm" variant="outline" onClick={onClear}>Clear filters</Button>}
        {canEdit && !hasSearch && <Button size="sm" onClick={onAdd}><Plus className="mr-1 size-3.5" /> Add the first link</Button>}
      </div>
    </div>
  );
}

function MarkUpdatedDialog({
  item,
  config,
  today,
  onOpenChange,
}: {
  item: LinkItem | null;
  config: LinksConfig;
  today: string;
  onOpenChange: (open: boolean) => void;
}) {
  const mark = useMutation(api.links.markUpdated);
  const undo = useMutation(api.links.undoMarkUpdated);
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
        id: item.id as Id<"link_item">,
        date,
        periodNote: period.trim() || undefined,
        note: note.trim() || undefined,
      });
      onOpenChange(false);
      toast.success("Marked as updated", {
        description: result.nextDue ? `Next due ${formatLinkDate(result.nextDue)}` : "One-time report — no next due date",
        duration: 30_000,
        action: {
          label: "Undo",
          onClick: () => {
            void undo({
              id: item.id as Id<"link_item">,
              lastUpdated: result.previous.lastUpdated ?? undefined,
              nextDue: result.previous.nextDue ?? undefined,
              remarks: result.previous.remarks ?? undefined,
              logId: result.logId as Id<"link_update_log">,
            }).then(() => toast.success("Mark updated undone"));
          },
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark it updated");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark “{item.title}” as updated</DialogTitle>
          <DialogDescription>
            Sets last updated, writes the schedule log and recomputes the next due date. A future date is rejected.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date updated</label>
            <div className="flex items-center gap-1.5">
              <DateInput id="mark-updated-date" label="Date updated" value={date} onChange={setDate} max={today} today={today} className="min-w-0 flex-1" />
              <Button type="button" size="sm" variant="outline" className="h-10" onClick={() => setDate(today)}>Today</Button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Period covered (optional)</label>
            <Input value={period} onChange={(e) => setPeriod(e.target.value)} maxLength={120} placeholder="e.g. Q2 2026-27" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Note (optional)</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder="Anything the next person should know?" />
          </div>
          <p className="rounded-lg bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
            Next due: <b className="text-foreground">{nextDue ? formatLinkDate(nextDue) : "-"}</b>
            {period.trim() && <> · Remarks will become “{period.trim()}”</>}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void save()} disabled={saving || !date}>
            {saving ? "Saving…" : "Mark updated"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LinkCheckNotice() {
  return null;
}
