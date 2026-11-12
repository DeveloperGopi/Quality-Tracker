import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Columns3,
  GripVertical,
  RotateCcw,
  Ruler,
} from "lucide-react";

/** The dashboard's rearrangeable sections, in their default order. */
export const DASHBOARD_SECTION_IDS = [
  "kpi",
  "overview",
  "pipeline",
  "progress",
  // "typewise" merged into the "progress" Progress-breakdown card (deep
  // links #facility-type-summary still land there). Kept out of the reorder
  // list; a saved layout that still carries it is simply ignored.
  "scheduled",
  "recert",
  "conditionality",
  "resultAwaited",
  "statusWhatNext",
  "documents",
  "eligiblePending",
  "alerts",
] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTION_IDS)[number];

export const DASHBOARD_SECTION_LABELS: Record<DashboardSectionId, string> = {
  kpi: "Key indicators",
  overview: "Overview",
  pipeline: "Facility current status",
  progress: "Progress breakdown",
  scheduled: "Scheduled facility details",
  recert: "Recertification due",
  conditionality: "Certified with conditionality",
  resultAwaited: "Result awaited",
  statusWhatNext: "Status & next steps",
  documents: "Documents status",
  eligiblePending: "Eligible pending",
  alerts: "Action alerts",
};

/** Per-section presentation. `widthPct` narrows the section (drag its right
 *  edge or toggle), `heightPx` caps the content scroll height (drag its
 *  bottom edge), `collapsed` hides it without losing its settings. */
export interface SectionStyle {
  widthPct: number; // 45–100, 100 = full width
  heightPx: number; // 0 = auto (no cap)
  collapsed: boolean;
}

export interface DashboardLayout {
  order: DashboardSectionId[];
  styles: Partial<Record<DashboardSectionId, SectionStyle>>;
}

export const DEFAULT_SECTION_STYLE: SectionStyle = {
  widthPct: 100,
  heightPx: 0,
  collapsed: false,
};

const STORAGE_KEY = "nqas.dashboard.layout.v2";

const DEFAULT_LAYOUT: DashboardLayout = {
  order: [...DASHBOARD_SECTION_IDS],
  styles: {},
};

/** Keep a saved order usable after sections are added/renamed: drop unknown
 *  ids, de-duplicate, and append any section the saved order is missing. */
function normalizeOrder(order: unknown): DashboardSectionId[] {
  const valid = new Set<string>(DASHBOARD_SECTION_IDS);
  const seen = new Set<string>();
  const out: DashboardSectionId[] = [];
  if (Array.isArray(order)) {
    for (const id of order) {
      if (typeof id === "string" && valid.has(id) && !seen.has(id)) {
        seen.add(id);
        out.push(id as DashboardSectionId);
      }
    }
  }
  for (const id of DASHBOARD_SECTION_IDS) if (!seen.has(id)) out.push(id);
  return out;
}

function loadLayout(): DashboardLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<DashboardLayout>;
    return {
      order: normalizeOrder(parsed.order),
      styles: (parsed.styles ?? {}) as DashboardLayout["styles"],
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

/** Clamp helper for the resize drags. */
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Order + per-section style, persisted in this browser. */
export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(loadLayout);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      /* storage unavailable — layout simply won't persist */
    }
  }, [layout]);

  return useMemo(() => {
    const { order, styles } = layout;
    const reorder = (from: string, to: string) => {
      setLayout((l) => {
        if (from === to) return l;
        const next = [...l.order];
        const fi = next.indexOf(from as DashboardSectionId);
        const ti = next.indexOf(to as DashboardSectionId);
        if (fi < 0 || ti < 0) return l;
        const [moved] = next.splice(fi, 1);
        next.splice(ti, 0, moved);
        return { ...l, order: next };
      });
    };
    const setStyle = (id: DashboardSectionId, patch: Partial<SectionStyle>) => {
      setLayout((l) => ({
        ...l,
        styles: {
          ...l.styles,
          [id]: { ...DEFAULT_SECTION_STYLE, ...l.styles[id], ...patch },
        },
      }));
    };
    const reset = () => setLayout(DEFAULT_LAYOUT);
    const isCustomized =
      order.some((id, i) => id !== DASHBOARD_SECTION_IDS[i]) ||
      DASHBOARD_SECTION_IDS.some((id) => styles[id] != null);
    return { order, styles, reorder, setStyle, reset, isCustomized };
  }, [layout]);
}

type LayoutApi = ReturnType<typeof useDashboardLayout>;

interface Ctx extends LayoutApi {
  controls: boolean;
  draggingId: string | null;
  dragOverId: string | null;
  beginDrag: (id: string) => void;
  updateDragOver: (id: string | null) => void;
  endDrag: (dropOnId?: string | null) => void;
}

const DashboardLayoutContext = createContext<Ctx | null>(null);

/** Wraps the dashboard body: provides the layout and, when the admin has
 *  enabled section controls, the reset bar + reorderable column. */
export function DashboardSectionsProvider({
  controls,
  value,
  children,
}: {
  controls: boolean;
  value: LayoutApi;
  children: ReactNode;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const beginDrag = useCallback((id: string) => setDraggingId(id), []);
  const updateDragOver = useCallback((id: string | null) => setDragOverId(id), []);
  const endDrag = useCallback(
    (dropOnId?: string | null) => {
      setDraggingId((dragId) => {
        if (dragId && dropOnId && dropOnId !== dragId) {
          value.reorder(dragId, dropOnId);
        }
        return null;
      });
      setDragOverId(null);
      // Re-enable text selection in case the drag left it disabled.
      document.body.style.userSelect = "";
    },
    [value],
  );

  const ctx = useMemo<Ctx>(
    () => ({
      ...value,
      controls,
      draggingId,
      dragOverId,
      beginDrag,
      updateDragOver,
      endDrag,
    }),
    [value, controls, draggingId, dragOverId, beginDrag, updateDragOver, endDrag],
  );

  return (
    <DashboardLayoutContext.Provider value={ctx}>
      {controls && (
        <div className="glass mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-primary/40 px-3 py-2 text-xs">
          <GripVertical className="size-3.5 text-primary" />
          <span className="font-medium text-foreground">Rearrange mode</span>
          <span className="text-muted-foreground">
            Drag a section by its handle to reorder it, drag its right edge to
            change width and its bottom edge to change height.
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-7 gap-1.5 px-2 text-xs"
            disabled={!value.isCustomized}
            onClick={value.reset}
          >
            <RotateCcw className="size-3.5" />
            Reset layout
          </Button>
        </div>
      )}
      {/* Column flex + CSS `order` lets a drag reorder the sections without
          moving them in the DOM (state and memoisation stay put). */}
      <div className="flex flex-col">{children}</div>
    </DashboardLayoutContext.Provider>
  );
}

/** True when a section's children will actually render something. Scope-
 *  dependent sections pass `false` when they are out of scope, and the
 *  wrapper must not show a bare drag handle / control bar for those. */
function hasRenderableContent(node: ReactNode): boolean {
  if (node === null || node === undefined || typeof node === "boolean") {
    return false;
  }
  if (Array.isArray(node)) return node.some(hasRenderableContent);
  if (typeof node === "string") return node.trim().length > 0;
  return true;
}

/** One dashboard section. Renders its children untouched unless section
 *  controls are on, in which case it gains a drag handle (reorder), an
 *  edge-drag width handle and an edge-drag height handle. */
export function DashboardSection({
  id,
  children,
}: {
  id: DashboardSectionId;
  children: ReactNode;
}) {
  const ctx = useContext(DashboardLayoutContext);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // All hooks run unconditionally — even for out-of-scope sections.
  const style: SectionStyle = {
    ...DEFAULT_SECTION_STYLE,
    ...ctx?.styles[id],
  };
  const order = ctx?.order.indexOf(id) ?? -1;
  const controls = ctx?.controls ?? false;
  const dragging = ctx?.draggingId === id;
  const dropTarget = ctx?.dragOverId === id && !dragging;

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!ctx || !ctx.controls) return;
      e.preventDefault();
      ctx.beginDrag(id);
      document.body.style.userSelect = "none";

      const onMove = (ev: PointerEvent) => {
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const target = el?.closest<HTMLElement>("[data-section-id]");
        ctx.updateDragOver(target?.dataset.sectionId ?? null);
      };
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const target = el?.closest<HTMLElement>("[data-section-id]");
        ctx.endDrag(target?.dataset.sectionId ?? null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [ctx, id],
  );

  const startWidthDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!ctx) return;
      e.preventDefault();
      const container = wrapRef.current?.parentElement;
      const containerW = container?.clientWidth ?? 1;
      const startX = e.clientX;
      const startW = style.widthPct;
      document.body.style.userSelect = "none";

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const next = clamp(startW + (dx / containerW) * 100, 45, 100);
        ctx.setStyle(id, { widthPct: Math.round(next) });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.style.userSelect = "";
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [ctx, id, style.widthPct],
  );

  const startHeightDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!ctx) return;
      e.preventDefault();
      const startY = e.clientY;
      const startH = style.heightPx > 0 ? style.heightPx : 420;
      document.body.style.userSelect = "none";

      const onMove = (ev: PointerEvent) => {
        const dy = ev.clientY - startY;
        ctx.setStyle(id, { heightPx: Math.round(clamp(startH + dy, 140, 1400)) });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.style.userSelect = "";
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [ctx, id, style.heightPx],
  );

  // Out-of-scope sections (no rows to show) render nothing at all — not even
  // the reorder chrome. (After hooks, so hook order stays stable.)
  if (!ctx || !hasRenderableContent(children)) return null;
  if (!controls) return <>{children}</>;

  const narrowed = style.widthPct < 100;

  return (
    <div
      ref={wrapRef}
      data-section-id={id}
      style={{ order }}
      className={cn(
        "relative mb-6 rounded-2xl transition-all",
        narrowed && "mx-auto",
        dragging && "z-50 opacity-70 ring-2 ring-primary",
        dropTarget &&
          "ring-2 ring-primary/70 ring-offset-4 ring-offset-background",
      )}
    >
      {/* Width style lives on the inner so the drop-ring always spans the
          column and the resize handle hugs the *content* edge. */}
      <div style={narrowed ? { width: `${style.widthPct}%` } : undefined}>
        <div className="mb-1.5 flex items-center gap-1.5 rounded-lg border border-dashed border-border/60 bg-muted/40 px-2 py-1">
          <button
            type="button"
            data-tip="Drag to reorder this section"
            aria-label={`Drag ${DASHBOARD_SECTION_LABELS[id]} to reorder`}
            onPointerDown={startDrag}
            className="cursor-grab touch-none rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {DASHBOARD_SECTION_LABELS[id]}
          </span>
          <span className="ml-auto flex items-center gap-0.5">
            <MiniBtn
              icon={Columns3}
              label={narrowed ? "Full width" : "Narrow width"}
              active={narrowed}
              onClick={() =>
                ctx.setStyle(id, { widthPct: narrowed ? 100 : 70 })
              }
            />
            <MiniBtn
              icon={Ruler}
              label={style.heightPx > 0 ? "Auto height" : "Fixed height"}
              active={style.heightPx > 0}
              onClick={() =>
                ctx.setStyle(id, { heightPx: style.heightPx > 0 ? 0 : 320 })
              }
            />
            <MiniBtn
              icon={style.collapsed ? ChevronRight : ChevronDown}
              label={style.collapsed ? "Expand section" : "Collapse section"}
              active={style.collapsed}
              onClick={() => ctx.setStyle(id, { collapsed: !style.collapsed })}
            />
          </span>
        </div>

        <div
          className={cn(
            style.collapsed && "hidden",
            style.heightPx > 0 && "overflow-y-auto",
          )}
          style={
            style.heightPx > 0
              ? { maxHeight: style.heightPx }
              : undefined
          }
        >
          {children}
        </div>

        {/* Edge resize handles — right edge = width, bottom edge = height. */}
        <div
          onPointerDown={startWidthDrag}
          data-tip="Drag to change section width"
          className="absolute top-10 bottom-3 -right-2 z-20 w-2 cursor-ew-resize touch-none rounded-full bg-transparent transition-colors hover:bg-primary/30"
        />
        <div
          onPointerDown={startHeightDrag}
          data-tip="Drag to change section height"
          className="absolute right-4 bottom-0 left-4 z-20 h-2 cursor-ns-resize touch-none rounded-full bg-transparent transition-colors hover:bg-primary/30"
        />
      </div>
    </div>
  );
}

function MiniBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Columns3;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      data-tip={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-primary/10 text-primary",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
