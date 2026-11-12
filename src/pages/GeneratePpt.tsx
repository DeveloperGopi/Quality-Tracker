import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useQuery } from "convex/react";
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  EyeOff,
  FileDown,
  GripVertical,
  LayoutGrid,
  Loader2,
  Maximize,
  MessageSquareText,
  MoreHorizontal,
  PanelRight,
  Play,
  Presentation,
  RotateCcw,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  X,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { CycleFilter, useCycleScope } from "@/components/CycleFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DeckSlidePreview } from "@/components/deck/DeckSlidePreview";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  ADMIN_ONLY_HIDE,
  DECK_SECTIONS,
  DEFAULT_HIDDEN_SLIDES,
  DEFAULT_SLIDE_ORDER,
  SLIDE_TITLES,
  buildDeckModel,
  parseRateBands,
  type DeckModel,
  type DeckPeriod,
  type DeckSlide,
  type DeckSlideId,
} from "@/lib/deckModel";
import type { DeckRow } from "@/lib/deck";

type ReportRow = NonNullable<
  ReturnType<typeof useQuery<typeof api.modules.getReportData>>
>["rows"][number];

function toDeckRow(r: ReportRow): DeckRow {
  return {
    facility: r.facility,
    type: r.type,
    block: r.block,
    phc: r.phc,
    eligibility: r.eligibility,
    currentStatus: r.currentStatus,
    certStatus: r.certStatus,
    naStatus: r.naStatus,
    certDate: r.certDate,
    certScore: r.certScore,
    naScheduledDate: r.naScheduledDate,
    saStatus: r.saStatus,
    generalDocStatus: r.generalDocStatus,
    naMode: r.naMode,
    saScore: r.saScore,
    buildingStatus: r.buildingStatus,
    buildingType: r.buildingType,
    fireNocStatus: r.fireNocStatus ?? null,
    fireNocExpiry:
      ("fireNocExpiry" in r ? (r as { fireNocExpiry?: string | null }).fireNocExpiry : undefined) ??
      null,
    nqasIaQ1: r.nqasIaQ1,
    nqasIaQ2: r.nqasIaQ2,
    kayakalpIaQ1: r.kayakalpIaQ1,
    kayakalpIaQ2: r.kayakalpIaQ2,
    surveillanceDue1: r.surveillanceDue1,
    surveillanceDone1: r.surveillanceDone1,
    surveillanceDue2: r.surveillanceDue2,
    surveillanceDone2: r.surveillanceDone2,
    validityDate: r.validityDate,
    gapClosureAmount: r.gapClosureAmount,
    gcFundYear: r.gcFundYear,
  };
}

/* ------------------------------------------------------------------ */
/* Per-user preferences                                                */
/* ------------------------------------------------------------------ */

const PREFS_VERSION = "v2";
const APPENDIX: DeckSlideId[] = [...DEFAULT_HIDDEN_SLIDES];

type SlideOverride = { title?: string; subtitle?: string; notes?: string };
type Preset = { hidden: DeckSlideId[]; order: DeckSlideId[] };
type Prefs = {
  hidden: DeckSlideId[];
  order: DeckSlideId[];
  period: DeckPeriod;
  theme: "light" | "dark-cover" | "high-contrast";
  density: "comfortable" | "compact";
  overrides: Partial<Record<DeckSlideId, SlideOverride>>;
  presets: Record<string, Preset>;
};

const BUILT_IN_PRESETS: Record<string, Preset> = {
  "Management pack · 8 slides": {
    hidden: [
      "ia",
      "byYear",
      "profile",
      "pipeline",
      "heatmap",
      "yearA",
      "yearB",
      "checks",
      "defs",
    ],
    order: [...DEFAULT_SLIDE_ORDER],
  },
  "Full deck · 10 slides": {
    hidden: [...DEFAULT_HIDDEN_SLIDES],
    order: [...DEFAULT_SLIDE_ORDER],
  },
  // In the default financial-year mode the calendar-year month tables do not
  // exist, so Everything is exactly the 10-slide deck + 5 appendix slides.
  "Everything · 15 slides": { hidden: [], order: [...DEFAULT_SLIDE_ORDER] },
};

const storageKey = (userKey: string) => `nqas.deck.prefs.${PREFS_VERSION}.${userKey}`;

function readUrlPrefs(): Partial<Prefs> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const out: Partial<Prefs> = {};
  const hidden = params.get("hidden");
  if (hidden != null)
    out.hidden = hidden
      .split(",")
      .filter((id): id is DeckSlideId => (DEFAULT_SLIDE_ORDER as readonly string[]).includes(id));
  const order = params.get("order");
  if (order)
    out.order = order
      .split(",")
      .filter((id): id is DeckSlideId => (DEFAULT_SLIDE_ORDER as readonly string[]).includes(id));
  if (params.get("period") === "calendar") out.period = "calendar";
  return out;
}

function loadPrefs(userKey: string): Prefs {
  const url = readUrlPrefs();
  const fallback: Prefs = {
    hidden: [...DEFAULT_HIDDEN_SLIDES],
    order: [...DEFAULT_SLIDE_ORDER],
    period: "fy",
    theme: "light",
    density: "comfortable",
    overrides: {},
    presets: {},
  };
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    const parsed = raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
    return {
      hidden: url.hidden ?? parsed.hidden ?? fallback.hidden,
      order:
        url.order && url.order.length === DEFAULT_SLIDE_ORDER.length
          ? url.order
          : parsed.order ?? fallback.order,
      period: url.period ?? parsed.period ?? fallback.period,
      theme: parsed.theme === "dark-cover" || parsed.theme === "high-contrast" ? parsed.theme : "light",
      density: parsed.density === "compact" ? "compact" : "comfortable",
      overrides: parsed.overrides ?? {},
      presets: parsed.presets ?? {},
    };
  } catch {
    return { ...fallback, ...url };
  }
}

/* ------------------------------------------------------------------ */

export default function GeneratePptPage() {
  const cycleScope = useCycleScope();
  const data = useQuery(
    api.modules.getReportData,
    typeof cycleScope === "number" ? { cycle: cycleScope } : {},
  );
  // Admin → Settings owns the certified-rate bands; the legend on the slide is
  // generated from the same numbers, so it can never describe other bands.
  const adminSettings = useQuery(api.facilities.getAppSettings, {});
  const rateBands = useMemo(
    () =>
      parseRateBands(
        (adminSettings?.settings as Record<string, unknown> | undefined)?.rateBands,
      ),
    [adminSettings],
  );
  const { user } = useAuth();
  const isAdmin = (user as { role?: string; appRole?: string } | null | undefined)?.role === "admin" ||
    (user as { appRole?: string } | null | undefined)?.appRole === "admin";
  const userKey = String((user as { email?: string } | null | undefined)?.email ?? "anonymous");

  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(userKey));
  const { hidden, order, period, theme, density, overrides, presets } = prefs;
  const [history, setHistory] = useState<DeckSlideId[][]>([]);
  const [selected, setSelected] = useState<DeckSlideId>("title");
  const [dragId, setDragId] = useState<DeckSlideId | null>(null);
  const [present, setPresent] = useState<number | null>(null);
  const [sorterOpen, setSorterOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [zoom, setZoom] = useState<"fit" | 100 | 75>("fit");
  const [closedSections, setClosedSections] = useState<Set<string>>(new Set());
  const [settingsTab, setSettingsTab] = useState("content");
  const [sorterSelection, setSorterSelection] = useState<Set<DeckSlideId>>(new Set());
  const [job, setJob] = useState<{ format: "pptx" | "pdf"; done: number; total: number } | null>(null);
  const cancelRef = useRef(false);
  const railRef = useRef<HTMLDivElement | null>(null);

  // Filters handed over by the NQAS Summary Report ("Generate deck").
  const [blockFilter, setBlockFilter] = useState(
    () => new URLSearchParams(window.location.search).get("block") ?? "all",
  );
  const [typeFilter, setTypeFilter] = useState(
    () => new URLSearchParams(window.location.search).get("type") ?? "all",
  );
  const [language, setLanguage] = useState<"en" | "ta">("en");
  const [scopeOpen, setScopeOpen] = useState(false);

  const allRows = useMemo(() => data?.rows ?? [], [data]);
  const deckRows = useMemo(() => allRows.map(toDeckRow), [allRows]);
  const blocks = useMemo(() => [...new Set(deckRows.map((r) => r.block))].sort(), [deckRows]);
  const types = useMemo(() => [...new Set(deckRows.map((r) => r.type))].sort(), [deckRows]);

  useEffect(() => {
    if (blocks.length === 0) return;
    if (blockFilter !== "all" && !blocks.includes(blockFilter)) setBlockFilter("all");
    if (typeFilter !== "all" && !types.includes(typeFilter)) setTypeFilter("all");
  }, [blocks, types, blockFilter, typeFilter]);

  const filteredRows = useMemo(
    () =>
      deckRows.filter(
        (r) =>
          (blockFilter === "all" || r.block === blockFilter) &&
          (typeFilter === "all" || r.type === typeFilter),
      ),
    [deckRows, blockFilter, typeFilter],
  );

  const filtersLabel = [
    blockFilter === "all" ? "All blocks" : blockFilter,
    typeFilter === "all" ? "All facility types" : typeFilter,
    typeof cycleScope === "number" ? `Cycle #${cycleScope}` : "Current cycle",
  ].join(" · ");

  const model: DeckModel = useMemo(
    () => buildDeckModel(filteredRows, { period, filtersLabel, rateBands }),
    [filteredRows, period, filtersLabel, rateBands],
  );

  const orderedSlides = useMemo(() => {
    const byId = new Map(model.slides.map((s) => [s.id, s]));
    const out = order.map((id) => byId.get(id)).filter((s): s is DeckSlide => !!s);
    for (const slide of model.slides) if (!out.includes(slide)) out.push(slide);
    return out;
  }, [model.slides, order]);

  /** Custom titles/subtitles/notes never touch facility data. */
  const displayedSlides = useMemo(
    () =>
      orderedSlides.map((slide) => {
        const edit = overrides[slide.id];
        if (!edit) return slide;
        return {
          ...slide,
          title: edit.title?.trim() || slide.title,
          subtitle: edit.subtitle?.trim() || slide.subtitle,
          speakerNotes: edit.notes?.trim() || slide.speakerNotes,
        };
      }),
    [orderedSlides, overrides],
  );

  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const visible = useMemo(
    () => displayedSlides.filter((s) => !hiddenSet.has(s.id)),
    [displayedSlides, hiddenSet],
  );
  const pageOf = useMemo(() => {
    const map = new Map<DeckSlideId, number>();
    let page = 0;
    for (const s of displayedSlides) {
      if (!hiddenSet.has(s.id)) {
        page += 1;
        map.set(s.id, page);
      }
    }
    return map;
  }, [displayedSlides, hiddenSet]);

  const selectedSlide =
    displayedSlides.find((s) => s.id === selected) ?? displayedSlides[0];
  const exportModel: DeckModel = useMemo(
    () => ({ ...model, slides: displayedSlides }),
    [model, displayedSlides],
  );

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(userKey), JSON.stringify(prefs));
    } catch {
      /* storage may be blocked */
    }
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (hidden.length) params.set("hidden", hidden.join(","));
    else params.delete("hidden");
    if (order.join(",") !== DEFAULT_SLIDE_ORDER.join(",")) params.set("order", order.join(","));
    else params.delete("order");
    if (period === "calendar") params.set("period", "calendar");
    else params.delete("period");
    if (blockFilter !== "all") params.set("block", blockFilter);
    else params.delete("block");
    if (typeFilter !== "all") params.set("type", typeFilter);
    else params.delete("type");
    params.delete("format");
    const qs = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [prefs, userKey, hidden, order, period, blockFilter, typeFilter]);

  const commitHidden = useCallback(
    (next: DeckSlideId[]) => {
      setHistory((h) => [...h.slice(-9), hidden]);
      setPrefs((p) => ({ ...p, hidden: [...new Set(next)] }));
    },
    [hidden],
  );

  const toggleHidden = useCallback(
    (id: DeckSlideId) => {
      if (ADMIN_ONLY_HIDE.has(id) && !isAdmin) {
        toast.error("Only a State Admin can hide the cover or the definitions slide.");
        return;
      }
      const next = hiddenSet.has(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
      commitHidden(next);
      toast.success(
        hiddenSet.has(id)
          ? `${SLIDE_TITLES[id]} shown again`
          : `${SLIDE_TITLES[id]} hidden from exports`,
      );
    },
    [hidden, hiddenSet, commitHidden, isAdmin],
  );

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setPrefs((p) => ({ ...p, hidden: prev }));
    setHistory((h) => h.slice(0, -1));
    toast.success("Last visibility change undone");
  };

  const hideSection = (sectionId: string) => {
    const ids = displayedSlides
      .filter((s) => s.section === sectionId)
      .map((s) => s.id)
      .filter((id) => !(ADMIN_ONLY_HIDE.has(id) && !isAdmin));
    commitHidden([...hidden, ...ids]);
  };
  const showSection = (sectionId: string) => {
    const ids = new Set(displayedSlides.filter((s) => s.section === sectionId).map((s) => s.id));
    commitHidden(hidden.filter((id) => !ids.has(id)));
  };

  const applyPreset = (name: string) => {
    const preset = presets[name] ?? BUILT_IN_PRESETS[name];
    if (!preset) return;
    setPrefs((p) => ({ ...p, hidden: preset.hidden, order: preset.order }));
    toast.success(`Preset “${name}” applied`);
  };
  const savePreset = () => {
    if (typeof window === "undefined") return;
    const name = window.prompt("Name this preset")?.trim();
    if (!name) return;
    setPrefs((p) => ({
      ...p,
      presets: { ...p.presets, [name]: { hidden, order } },
    }));
    toast.success(`Preset “${name}” saved on this device`);
  };

  const move = (from: DeckSlideId, to: DeckSlideId) => {
    if (from === to) return;
    setPrefs((p) => {
      const next = [...p.order];
      const fromIdx = next.indexOf(from);
      const toIdx = next.indexOf(to);
      if (fromIdx < 0 || toIdx < 0) return p;
      next.splice(toIdx, 0, ...next.splice(fromIdx, 1));
      return { ...p, order: next };
    });
  };

  const updateOverride = (id: DeckSlideId, patch: SlideOverride) => {
    setPrefs((p) => ({
      ...p,
      overrides: {
        ...p.overrides,
        [id]: { ...p.overrides[id], ...patch },
      },
    }));
  };
  const resetOverride = (id: DeckSlideId) => {
    setPrefs((p) => {
      const next = { ...p.overrides };
      delete next[id];
      return { ...p, overrides: next };
    });
    toast.success("Slide reset to automatic content");
  };

  /* Keyboard: H toggles the previewed slide; F5 opens Present. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
      if (e.key === "F5") {
        e.preventDefault();
        const index = Math.max(0, visible.findIndex((s) => s.id === selectedSlide?.id));
        setPresent(index);
        return;
      }
      if (typing) return;
      if (e.key.toLowerCase() !== "h" || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      if (selectedSlide) toggleHidden(selectedSlide.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedSlide, toggleHidden, visible]);

  /* Present mode keyboard navigation. */
  useEffect(() => {
    if (present == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setPresent(null);
      } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        setPresent((i) => (i == null ? 0 : Math.min(visible.length - 1, i + 1)));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setPresent((i) => (i == null ? 0 : Math.max(0, i - 1)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, visible.length]);

  const runExport = async (format: "pptx" | "pdf") => {
    if (visible.length === 0) {
      toast.error("Every slide is hidden — show at least one before exporting.");
      return;
    }
    if (filteredRows.length === 0) {
      toast.error("No facility matches this scope — nothing to export.");
      return;
    }
    cancelRef.current = false;
    setJob({ format, done: 0, total: visible.length });
    try {
      const onSlide = () => {
        if (cancelRef.current) throw new Error("cancelled");
        setJob((p) => (p ? { ...p, done: Math.min(p.total, p.done + 1) } : p));
      };
      if (format === "pptx") {
        const { buildDeckPptxFromModel } = await import("@/lib/deckRender");
        await buildDeckPptxFromModel(exportModel, undefined, {
          hidden,
          theme,
          density,
          onSlide,
        });
        toast.success(`${visible.length} slides downloaded as an editable PowerPoint`);
      } else {
        const { buildDeckPdf } = await import("@/lib/deckPdf");
        await buildDeckPdf(exportModel, { hidden, theme, density, onSlide });
        toast.success(`${visible.length} pages downloaded as PDF`);
      }
    } catch (err) {
      if (cancelRef.current) toast.message("Export cancelled");
      else {
        console.error("Deck export failed", err);
        toast.error(err instanceof Error ? err.message : "Could not build the deck");
      }
    } finally {
      setJob(null);
    }
  };

  const step = (delta: number) => {
    if (visible.length === 0) return;
    const index = visible.findIndex((s) => s.id === selectedSlide?.id);
    const next = visible[(index + delta + visible.length) % visible.length];
    if (next) setSelected(next.id);
  };

  const onRailKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      step(-1);
    } else if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (selectedSlide) toggleHidden(selectedSlide.id);
    }
  };

  const loading = data === undefined;
  const hiddenCount = displayedSlides.length - visible.length;
  const checks = model.checks;
  const failures = checks.reconcile.filter((r) => !r.ok);
  const exportDisabledReason =
    visible.length === 0
      ? "All slides are hidden"
      : filteredRows.length === 0
        ? "No facility matches this scope"
        : job
          ? "An export is running"
          : null;

  const settingsPanel = selectedSlide ? (
    <Tabs value={settingsTab} onValueChange={setSettingsTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="content">Content</TabsTrigger>
        <TabsTrigger value="design">Design</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>
      <TabsContent value="content" className="mt-3 space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground" htmlFor="slide-title">
            Slide title
          </label>
          <Input
            id="slide-title"
            className="mt-1 h-9 text-sm"
            value={overrides[selectedSlide.id]?.title ?? selectedSlide.title}
            onChange={(e) => updateOverride(selectedSlide.id, { title: e.target.value })}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground" htmlFor="slide-subtitle">
            Subtitle
          </label>
          <Textarea
            id="slide-subtitle"
            className="mt-1 min-h-16 text-sm"
            value={overrides[selectedSlide.id]?.subtitle ?? selectedSlide.subtitle ?? ""}
            onChange={(e) => updateOverride(selectedSlide.id, { subtitle: e.target.value })}
          />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">
            Data-driven numbers
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {[...new Set(`${selectedSlide.title} ${selectedSlide.subtitle ?? ""}`.match(/\d[\d,.]*%?/g) ?? [])]
              .slice(0, 12)
              .map((n) => (
                <span
                  key={n}
                  className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground"
                  data-tip="Locked: this number comes from the shared data model and cannot be edited here."
                >
                  {n}
                </span>
              ))}
            {(selectedSlide.title.match(/\d/g) ?? []).length === 0 && (
              <span className="text-[11px] text-muted-foreground">No numbers on this slide.</span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => resetOverride(selectedSlide.id)}
          disabled={!overrides[selectedSlide.id]}
        >
          <RotateCcw className="size-3.5" /> Reset to automatic
        </Button>
      </TabsContent>
      <TabsContent value="design" className="mt-3 space-y-3">
        <label className="block text-[11px] font-semibold text-muted-foreground">
          Theme
          <select
            className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
            value={theme}
            onChange={(e) =>
              setPrefs((p) => ({
                ...p,
                theme:
                  e.target.value === "dark-cover" || e.target.value === "high-contrast"
                    ? e.target.value
                    : "light",
              }))
            }
          >
            <option value="light">Light — white slides, teal title bar</option>
            <option value="dark-cover">Dark cover — cover and closing only</option>
            <option value="high-contrast">High contrast — AA black and white</option>
          </select>
        </label>
        <label className="block text-[11px] font-semibold text-muted-foreground">
          Density
          <select
            className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
            value={density}
            onChange={(e) =>
              setPrefs((p) => ({
                ...p,
                density: e.target.value === "compact" ? "compact" : "comfortable",
              }))
            }
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact — more rows per slide</option>
          </select>
        </label>
        <p className="rounded-md border border-border/60 bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground">
          Design edits are saved on this device per user. They never change facility data,
          the numbers or the shared report.
        </p>
      </TabsContent>
      <TabsContent value="notes" className="mt-3 space-y-2">
        <label className="text-[11px] font-semibold text-muted-foreground" htmlFor="slide-notes">
          Speaker notes
        </label>
        <Textarea
          id="slide-notes"
          className="min-h-44 text-sm"
          value={overrides[selectedSlide.id]?.notes ?? selectedSlide.speakerNotes ?? ""}
          onChange={(e) => updateOverride(selectedSlide.id, { notes: e.target.value })}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Notes travel with the PPTX and are available in the web preview. Definitions live on
          the Definitions appendix slide, not in a footnote.
        </p>
      </TabsContent>
    </Tabs>
  ) : null;

  return (
    <AppShell
      title="Generate PPT"
      subtitle={`${filteredRows.length} facilities in scope · preview, PPTX and PDF read one slide model`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              const index = Math.max(0, visible.findIndex((s) => s.id === selectedSlide?.id));
              setPresent(index);
            }}
            disabled={visible.length === 0}
          >
            <Play className="size-4" /> Present
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setSorterOpen(true)}>
            <LayoutGrid className="size-4" /> Slide sorter
          </Button>
          <div className="flex overflow-hidden rounded-md">
            <Button
              className="gap-2 rounded-r-none"
              onClick={() => void runExport("pptx")}
              disabled={!!exportDisabledReason}
              data-tip={exportDisabledReason ?? "Download an editable PowerPoint"}
            >
              {job?.format === "pptx" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Presentation className="size-4" />
              )}
              Download PPTX
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="rounded-l-none border-l border-white/20 px-2"
                  aria-label="More download options"
                  disabled={!!exportDisabledReason}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void runExport("pptx")}>
                  <Presentation className="size-4" /> Download PPTX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void runExport("pdf")}>
                  <FileDown className="size-4" /> Download PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ---------- compact editor bar ---------- */}
          <div className="glass mb-3 flex flex-wrap items-center gap-2 rounded-xl px-2.5 py-2 text-sm">
            <Popover open={scopeOpen} onOpenChange={setScopeOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <SlidersHorizontal className="size-3.5" />
                  {blockFilter === "all" ? "All blocks" : blockFilter} ·{" "}
                  {typeFilter === "all" ? "All types" : typeFilter} ·{" "}
                  {period === "fy" ? "FY" : "CY"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 space-y-3">
                <p className="text-sm font-semibold">Scope</p>
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  Block
                  <select
                    className="mt-1 h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs"
                    value={blockFilter}
                    onChange={(e) => setBlockFilter(e.target.value)}
                  >
                    <option value="all">All blocks</option>
                    {blocks.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  Facility type
                  <select
                    className="mt-1 h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">All types</option>
                    {types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">Certification cycle</span>
                  <CycleFilter allowAll={false} />
                </div>
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  Period
                  <select
                    className="mt-1 h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs"
                    value={period}
                    onChange={(e) =>
                      setPrefs((p) => ({
                        ...p,
                        period: e.target.value === "calendar" ? "calendar" : "fy",
                      }))
                    }
                  >
                    <option value="fy">Financial year (Apr–Mar)</option>
                    <option value="calendar">Calendar year</option>
                  </select>
                </label>
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  Language
                  <select
                    className="mt-1 h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value === "ta" ? "ta" : "en")}
                  >
                    <option value="en">English</option>
                    <option value="ta">Tamil</option>
                  </select>
                </label>
                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                  <span className="text-muted-foreground">Facilities in scope</span>
                  <b className="tabular-nums">{filteredRows.length}</b>
                </div>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Scope is kept in the URL, so Back restores this view and a shared link opens the
                  same deck.
                </p>
              </PopoverContent>
            </Popover>

            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {filteredRows.length} facilities · {visible.length} of {displayedSlides.length} slides
              will be exported
            </span>
            {hiddenCount > 0 && (
              <span className="text-[11px] text-muted-foreground">{hiddenCount} hidden</span>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => setPrefs((p) => ({ ...p, hidden: [...APPENDIX] }))}
              >
                Hide appendix
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={undo} disabled={!history.length}>
                <Undo2 className="size-3.5" /> Undo
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                    <MoreHorizontal className="size-4" /> Presets
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Slide presets</DropdownMenuLabel>
                  {[...Object.keys(BUILT_IN_PRESETS), ...Object.keys(presets)].map((name) => (
                    <DropdownMenuItem key={name} onClick={() => applyPreset(name)}>
                      {name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={savePreset}>
                    <Bookmark className="size-4" /> Save current preset
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => commitHidden([])}>
                    <Eye className="size-4" /> Show all slides
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1 text-xs xl:hidden">
                    <Settings2 className="size-3.5" /> Slide settings
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Slide settings</SheetTitle>
                  </SheetHeader>
                  <div className="mt-3">{settingsPanel}</div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {language === "ta" && (
            <p className="mb-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Tamil facility names render with the embedded Noto Sans Tamil font in every download.
              Body copy stays English until the translation pack is loaded — the preview always
              matches the download.
            </p>
          )}

          {failures.length > 0 && (
            <div className="mb-3 flex flex-wrap items-start gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <p className="min-w-0 flex-1">
                <b>Data check: {failures.length} reconciliation {failures.length === 1 ? "failure" : "failures"}.</b>{" "}
                {failures.map((f) => `${f.label} — ${f.detail}`).join(" ")}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setSelected("checks");
                    if (hiddenSet.has("checks")) commitHidden(hidden.filter((id) => id !== "checks"));
                  }}
                >
                  Open Data checks
                </button>
              </p>
            </div>
          )}

          {job && (
            <div className="mb-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="mb-1.5 flex items-center gap-2 text-xs">
                <Loader2 className="size-3.5 animate-spin" />
                <span className="flex-1 font-medium">
                  Building the {job.format.toUpperCase()} — slide {job.done} of {job.total}
                </span>
                <button
                  type="button"
                  className="text-xs text-primary underline"
                  onClick={() => {
                    cancelRef.current = true;
                  }}
                >
                  Cancel
                </button>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-border/60">
                <div
                  className="h-full bg-primary transition-[width] duration-150"
                  style={{ width: `${(job.done / Math.max(job.total, 1)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ---------- rail + canvas + settings ---------- */}
          <div className="grid min-w-0 gap-4 lg:grid-cols-[228px_minmax(0,1fr)] xl:grid-cols-[228px_minmax(0,1fr)_296px]">
            {/* Thumbnail rail: vertical on desktop, filmstrip below 1024 px. */}
            <aside className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto">                <div
                  ref={railRef}
                  role="listbox"
                  tabIndex={0}
                  aria-label="Slides"
                  data-testid="deck-filmstrip"
                onKeyDown={onRailKey}
                className="flex snap-x gap-2 overflow-x-auto pb-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0"
              >
                {DECK_SECTIONS.map((section) => {
                  const slides = displayedSlides.filter((s) => s.section === section.id);
                  if (slides.length === 0) return null;
                  const sectionHidden = slides.every((s) => hiddenSet.has(s.id));
                  const closed = closedSections.has(section.id);
                  return (
                    <div key={section.id} className="w-[240px] shrink-0 lg:w-auto">
                      <div className="flex items-center justify-between gap-1 px-1 py-1">
                        <button
                          type="button"
                          className="flex min-w-0 items-center gap-1 text-left text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
                          onClick={() =>
                            setClosedSections((prev) => {
                              const next = new Set(prev);
                              if (next.has(section.id)) next.delete(section.id);
                              else next.add(section.id);
                              return next;
                            })
                          }
                          aria-expanded={!closed}
                        >
                          {closed ? <ChevronsRight className="size-3" /> : <ChevronsLeft className="size-3" />}
                          <span className="truncate">{section.label}</span>
                        </button>
                        <button
                          type="button"
                          className="text-[10px] text-primary hover:underline"
                          onClick={() => (sectionHidden ? showSection(section.id) : hideSection(section.id))}
                        >
                          {sectionHidden ? "Show" : "Hide"}
                        </button>
                      </div>
                      {!closed &&
                        slides.map((slide) => {
                          const isHidden = hiddenSet.has(slide.id);
                          const blocked = ADMIN_ONLY_HIDE.has(slide.id) && !isAdmin;
                          const page = pageOf.get(slide.id);
                          return (
                            <div
                              key={slide.id}
                              draggable
                              onDragStart={(e) => {
                                setDragId(slide.id);
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("text/plain", slide.id);
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (dragId) move(dragId, slide.id);
                                setDragId(null);
                              }}
                              onDragEnd={() => setDragId(null)}
                              className={cn(
                                "group mb-1.5 flex w-full items-start gap-1 rounded-lg border p-1.5 transition-colors",
                                selected === slide.id
                                  ? "border-primary/60 bg-primary/5"
                                  : "border-transparent hover:border-border/60 hover:bg-muted/40",
                                isHidden && "opacity-55",
                                dragId === slide.id && "opacity-40",
                              )}
                            >
                              <GripVertical className="mt-1 size-3.5 shrink-0 cursor-grab text-muted-foreground" />
                              <button
                                type="button"
                                onClick={() => setSelected(slide.id)}
                                className="min-w-0 flex-1 text-left"
                                aria-current={selected === slide.id ? "true" : undefined}
                              >
                                <span className="mb-1 flex items-center gap-1">
                                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-muted px-1 text-[9px] font-bold tabular-nums text-muted-foreground">
                                    {page ?? "–"}
                                  </span>
                                  <span className="truncate text-[11px] font-medium">
                                    {SLIDE_TITLES[slide.id]}
                                  </span>
                                  {slide.dataCheck && slide.dataCheck.issues > 0 && (
                                    <span
                                      className="size-1.5 shrink-0 rounded-full bg-amber-500"
                                      data-tip={slide.dataCheck.text}
                                      aria-label={slide.dataCheck.text}
                                    />
                                  )}
                                  {isHidden && (
                                    <span className="rounded bg-muted px-1 text-[9px] text-muted-foreground">
                                      Hidden
                                    </span>
                                  )}
                                </span>
                                <DeckSlidePreview
                                  slide={slide}
                                  theme={theme}
                                  density={density}
                                  dataAsOf={model.meta.dataAsOf}
                                  filtersLabel={filtersLabel}
                                  className="pointer-events-none rounded-md border border-border/60"
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleHidden(slide.id)}
                                disabled={blocked}
                                data-tip={
                                  blocked
                                    ? "Only a State Admin can hide this slide"
                                    : isHidden
                                      ? "Show this slide (H)"
                                      : "Hide this slide (H)"
                                }
                                aria-label={`${isHidden ? "Show" : "Hide"} slide ${page ?? ""}: ${SLIDE_TITLES[slide.id]}`}
                                aria-pressed={isHidden}
                                className="relative flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40"
                              >
                                {isHidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Slide canvas */}
            <div className="min-w-0">
              {selectedSlide ? (
                <>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {pageOf.has(selectedSlide.id)
                        ? `Slide ${pageOf.get(selectedSlide.id)} of ${visible.length}`
                        : "Hidden — not exported"}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {SLIDE_TITLES[selectedSlide.id]}
                    </span>
                    <div className="ml-auto flex flex-wrap items-center gap-1">
                      <div className="mr-1 flex items-center gap-0.5 rounded-md border border-border/60 p-0.5">
                        <button
                          type="button"
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px]",
                            zoom === "fit" && "bg-primary text-white",
                          )}
                          onClick={() => setZoom("fit")}
                        >
                          Fit
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px]",
                            zoom === 100 && "bg-primary text-white",
                          )}
                          onClick={() => setZoom(100)}
                        >
                          100%
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px]",
                            zoom === 75 && "bg-primary text-white",
                          )}
                          onClick={() => setZoom(75)}
                        >
                          75%
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[11px]"
                        disabled={visible.length === 0}
                        onClick={() => step(-1)}
                      >
                        <ChevronLeft className="size-3.5" /> Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[11px]"
                        disabled={visible.length === 0}
                        onClick={() => step(1)}
                      >
                        Next <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {selectedSlide.dataCheck && selectedSlide.dataCheck.issues > 0 && (
                    <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                      <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                      <p>
                        <b>{selectedSlide.dataCheck.text}.</b> The stamp stays on the export even
                        when this slide is hidden — fix the rows in Admin → Data checks.
                      </p>
                    </div>
                  )}

                  <div className="overflow-auto rounded-xl bg-muted/30 p-2 sm:p-4">
                    <div
                      className="mx-auto"
                      data-testid="deck-canvas"
                      style={{
                        width: zoom === "fit" ? "100%" : zoom === 100 ? 960 : 720,
                        maxWidth: "100%",
                      }}
                    >
                      <DeckSlidePreview
                        slide={selectedSlide}
                        page={pageOf.get(selectedSlide.id)}
                        total={visible.length}
                        dataAsOf={model.meta.dataAsOf}
                        filtersLabel={filtersLabel}
                        theme={theme}
                        density={density}
                        className="shadow-lg"
                      />
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-border/60">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold"
                      onClick={() => setShowNotes((v) => !v)}
                      aria-expanded={showNotes}
                    >
                      <MessageSquareText className="size-4" />
                      Speaker notes
                      <span className="ml-auto text-[11px] font-normal text-muted-foreground">
                        {showNotes ? "Hide" : "Show"}
                      </span>
                    </button>
                    {showNotes && (
                      <div className="border-t border-border/60 px-3 py-2">
                        <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                          {selectedSlide.speakerNotes ?? "No notes for this slide."}
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <Sparkles className="size-3.5" />
                    Drag a thumbnail to reorder · <kbd className="rounded border px-1">H</kbd> hides
                    or shows · <kbd className="rounded border px-1">F5</kbd> presents · hidden
                    slides are left out and page numbers renumber.
                  </p>
                </>
              ) : (
                <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Every slide is hidden. Use the eye on a thumbnail to bring one back.
                </p>
              )}
            </div>

            {/* Slide settings (desktop). */}
            <aside className="hidden min-w-0 xl:block">
              <div className="sticky top-4 rounded-xl border border-border/60 bg-card p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <PanelRight className="size-4 text-muted-foreground" />
                  <p className="text-xs font-semibold">Slide settings</p>
                </div>
                {settingsPanel}
              </div>
            </aside>
          </div>
        </>
      )}

      {/* ---------- present mode ---------- */}
      {present != null && visible[present] && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black"
          data-testid="deck-present"
          role="dialog"
          aria-modal="true"
          aria-label="Slide presentation"
        >
          <div className="flex items-center gap-3 px-4 py-2 text-xs text-white/80">
            <Presentation className="size-4" />
            <span className="truncate">{visible[present].title}</span>
            <span className="ml-auto tabular-nums">
              {present + 1} / {visible.length}
            </span>
            <button
              type="button"
              className="rounded p-1 hover:bg-white/10"
              onClick={() => setPresent(null)}
              aria-label="Exit presentation"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-3">
            {/* Fit BOTH axes: a 16:9 slide at 1400 px is 787 px tall, which
                overflows a laptop screen. The height budget wins. */}
            <div
              className="w-full"
              style={{ maxWidth: "min(1400px, calc((100dvh - 8rem) * 16 / 9))" }}
            >
              <DeckSlidePreview
                slide={visible[present]}
                page={present + 1}
                total={visible.length}
                dataAsOf={model.meta.dataAsOf}
                filtersLabel={filtersLabel}
                theme={theme}
                density={density}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 pb-3 text-[11px] text-white/60">
            <span>← → navigate</span>
            <span>Esc exit</span>
            <span>Hidden slides are skipped</span>
          </div>
        </div>
      )}

      {/* ---------- slide sorter ---------- */}
      {sorterOpen && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-background/95 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
            <LayoutGrid className="size-4" />
            <h2 className="text-sm font-semibold">Slide sorter</h2>
            <span className="text-xs text-muted-foreground">
              {visible.length} of {displayedSlides.length} will be exported
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-[11px]"
                onClick={() => setSorterSelection(new Set(displayedSlides.map((s) => s.id)))}
              >
                Select all
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-[11px]"
                disabled={sorterSelection.size === 0}
                onClick={() => {
                  commitHidden([...hidden, ...sorterSelection]);
                  setSorterSelection(new Set());
                }}
              >
                <EyeOff className="size-3.5" /> Hide selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-[11px]"
                disabled={sorterSelection.size === 0}
                onClick={() => {
                  commitHidden(hidden.filter((id) => !sorterSelection.has(id)));
                  setSorterSelection(new Set());
                }}
              >
                <Eye className="size-3.5" /> Show selected
              </Button>
              <Button size="sm" className="h-7 gap-1 text-[11px]" onClick={() => setSorterOpen(false)}>
                Close
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayedSlides.map((slide) => {
                const isHidden = hiddenSet.has(slide.id);
                const page = pageOf.get(slide.id);
                const picked = sorterSelection.has(slide.id);
                return (
                  <div
                    key={slide.id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(slide.id);
                      e.dataTransfer.setData("text/plain", slide.id);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragId) move(dragId, slide.id);
                      setDragId(null);
                    }}
                    className={cn(
                      "rounded-xl border p-2",
                      picked ? "border-primary bg-primary/5" : "border-border/60",
                      isHidden && "opacity-55",
                    )}
                  >
                    <div className="mb-1.5 flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={picked}
                        onChange={(e) =>
                          setSorterSelection((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(slide.id);
                            else next.delete(slide.id);
                            return next;
                          })
                        }
                        aria-label={`Select ${SLIDE_TITLES[slide.id]}`}
                      />
                      <span className="rounded bg-muted px-1 text-[10px] font-bold tabular-nums text-muted-foreground">
                        {page ?? "–"}
                      </span>
                      <span className="truncate text-[11px] font-medium">{SLIDE_TITLES[slide.id]}</span>
                      <button
                        type="button"
                        className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted"
                        onClick={() => toggleHidden(slide.id)}
                        aria-label={isHidden ? "Show slide" : "Hide slide"}
                      >
                        {isHidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                    <button type="button" className="block w-full text-left" onClick={() => { setSelected(slide.id); setSorterOpen(false); }}>
                      <DeckSlidePreview
                        slide={slide}
                        theme={theme}
                        density={density}
                        dataAsOf={model.meta.dataAsOf}
                        filtersLabel={filtersLabel}
                        className="rounded-md border border-border/50"
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
