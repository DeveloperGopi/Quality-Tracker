/**
 * SYSTEM MAP — one page that explains the whole tracker.
 *
 * Content and structure come from lib/systemMap.ts. Live counts come from the
 * existing aggregate dashboard query (one query), settings from getAppSettings
 * (including State Admin text overrides), and roles from the existing roles
 * registry. The chart is plain SVG and CSS; no chart library.
 */

import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  Minus,
  Pencil,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { PageShell } from "@/components/PageShell";
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
import { cn } from "@/lib/utils";
import { DEFAULT_ROLES, roleLabel } from "@/lib/permissions";
import { ACTIVE_DOC_TYPES } from "@/convex/storage/validation";
import { RULE_BY_ID, issueRules, normalizePendingConfig } from "@/lib/pending";
import {
  FEATURE_TONE,
  LANE_LABELS,
  PAGE_FUNCTIONS,
  SIDE_LANES,
  SPEC,
  SYSTEM_EDGES,
  SYSTEM_FEATURES,
  SYSTEM_NODES,
  SYSTEM_TOOLS,
  systemMapMarkdown,
  type CountKey,
  type MapLaneId,
  type SystemFeature,
  type SystemNode,
} from "@/lib/systemMap";

const TABS = ["Flow", "Specs", "Functions", "Tools", "Features"] as const;
type Tab = (typeof TABS)[number];
type EditTarget = { key: string; label: string; value: string };
type Counts = Record<CountKey, number>;

const DOC_LABEL: Record<string, string> = Object.fromEntries(
  ACTIVE_DOC_TYPES.map((doc) => [doc.key, doc.label]),
);

const NODE_BY_ID = Object.fromEntries(SYSTEM_NODES.map((node) => [node.id, node]));

const LANE_TONE: Record<MapLaneId, { fill: string; stroke: string }> = {
  facility: { fill: "#f8fafc", stroke: "#cbd5e1" },
  eligibility: { fill: "#eff6ff", stroke: "#93c5fd" },
  state: { fill: "#ecfeff", stroke: "#67e8f9" },
  nqas: { fill: "#eef2ff", stroke: "#a5b4fc" },
  result: { fill: "#f5f3ff", stroke: "#c4b5fd" },
  certification: { fill: "#ecfdf5", stroke: "#6ee7b7" },
  surveillance: { fill: "#f0fdfa", stroke: "#5eead4" },
  expiry: { fill: "#fefce8", stroke: "#fde047" },
  reapply: { fill: "#f8fafc", stroke: "#cbd5e1" },
  cycle2: { fill: "#f1f5f9", stroke: "#94a3b8" },
};

const MAIN_NODES = SYSTEM_NODES.filter((node) => !node.side);
const LANES = Object.keys(LANE_LABELS) as MapLaneId[];

function short(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function nodeCenter(node: SystemNode) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

/** Small pencil that only a State Admin sees. */
function EditPencil({
  canEdit,
  label,
  value,
  onEdit,
}: {
  canEdit: boolean;
  label: string;
  value: string;
  onEdit: (target: EditTarget) => void;
}) {
  if (!canEdit) return null;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onEdit({ key: label, label, value });
      }}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      title={`Edit ${label}`}
      aria-label={`Edit ${label}`}
    >
      <Pencil className="size-3" />
    </button>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border/60 bg-card/80 p-4", className)}>
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export default function SystemMapPage() {
  const navigate = useNavigate();
  const dashboard = useQuery(api.ops.getDashboardV2, {});
  const rolesQ = useQuery(api.roles.list, {});
  const settingsQ = useQuery(api.facilities.getAppSettings, {});
  const setSetting = useMutation(api.facilities.setSetting);
  const isAdmin = settingsQ?.isAdmin === true;
  const [tab, setTab] = useState<Tab>("Flow");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [laneFilter, setLaneFilter] = useState<"all" | MapLaneId>("all");
  const [showCounts, setShowCounts] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const roles = useMemo(
    () => (rolesQ ?? DEFAULT_ROLES).map((role) => ({
      key: role.key,
      label: role.label,
      description: role.description,
      scope: "blockScope" in role ? role.blockScope : "All blocks",
    })),
    [rolesQ],
  );

  const overrides = useMemo(
    () => (settingsQ?.settings?.systemMapText ?? {}) as Record<string, string>,
    [settingsQ?.settings],
  );
  const pendingConfig = useMemo(
    () => normalizePendingConfig(settingsQ?.settings?.pendingRules).rules,
    [settingsQ?.settings],
  );
  const text = (key: string, fallback: string) => overrides[key] ?? fallback;

  const counts = useMemo<Counts>(() => {
    const pipeline = Object.fromEntries(
      (dashboard?.pipeline ?? []).map((stage) => [stage.key, stage.count]),
    ) as Record<string, number>;
    const totals = dashboard?.totals;
    const deferred = totals?.deferred ?? 0;
    const notStarted = Math.max(0, (pipeline.notStarted ?? 0) - deferred);
    const stateAssessment = pipeline.stateAssessment ?? 0;
    const naScheduled = pipeline.naScheduled ?? 0;
    const resultAwaited = pipeline.resultAwaited ?? 0;
    const qualityCertified = totals?.qualityCertified ?? 0;
    const conditional = totals?.certifiedWithConditionality ?? 0;
    const otherStages = notStarted + stateAssessment + naScheduled + resultAwaited + qualityCertified + conditional + deferred;
    // The facility lane is the residual: it keeps every visible stage count
    // adding up to the live facility total, even if an old row has a legacy
    // status the pipeline query does not bucket yet.
    return {
      notEligible: Math.max(0, (totals?.facilities ?? pipeline.notEligible ?? 0) - otherStages),
      notStarted,
      stateAssessment,
      naScheduled,
      resultAwaited,
      qualityCertified,
      conditional,
      deferred,
    };
  }, [dashboard]);

  const total = useMemo(
    () => Object.values(counts).reduce((sum, value) => sum + value, 0),
    [counts],
  );
  const live = dashboard !== undefined;
  const countText = (node: SystemNode) => {
    if (!showCounts) return "";
    if (!live || !node.countKey) return "-";
    return String(counts[node.countKey]);
  };

  const searchHits = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    const nodes = MAIN_NODES.filter((node) =>
      [
        node.title,
        node.laneLabel,
        node.summary,
        ...node.rules,
        ...node.pendingRules.map((id) => RULE_BY_ID[id]?.label ?? id),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    ).map((node) => ({
      id: `node:${node.id}`,
      label: `${node.laneLabel} · ${node.title}`,
      detail: node.short,
      nodeId: node.id,
      to: undefined as string | undefined,
    }));
    const pages = PAGE_FUNCTIONS.filter((page) =>
      [page.title, page.purpose, page.to, ...page.functions].join(" ").toLowerCase().includes(query),
    ).map((page) => ({
      id: `page:${page.id}`,
      label: page.title,
      detail: page.purpose,
      nodeId: undefined as string | undefined,
      to: page.to,
    }));
    return [...nodes, ...pages].slice(0, 8);
  }, [search]);

  const selected = selectedId ? NODE_BY_ID[selectedId] : null;

  const openNode = (id: string) => {
    setSelectedId(id);
    setTab("Flow");
    setSearch("");
  };

  const openSearchHit = (hit: (typeof searchHits)[number]) => {
    if (hit.nodeId) openNode(hit.nodeId);
    else if (hit.to) {
      setSearch("");
      navigate(hit.to);
    }
  };

  const saveText = async () => {
    if (!edit) return;
    const next = { ...overrides };
    if (edit.value.trim()) next[edit.key] = edit.value.trim();
    else delete next[edit.key];
    try {
      await setSetting({ key: "systemMapText", value: next });
      toast.success("Text updated", { description: "The change is in Audit and logs." });
      setEdit(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the text");
    }
  };

  const downloadMarkdown = () => {
    const markdown = systemMapMarkdown(
      {
        facilities: dashboard ? dashboard.totals.facilities : "-",
        blocks: dashboard ? dashboard.perBlock.length : "-",
        roles: roles.map((role) => role.label),
      },
      overrides,
    );
    downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), "nqas-system-map-spec.md");
    toast.success("Markdown spec downloaded");
  };

  const downloadSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "760");
    clone.setAttribute("height", "880");
    downloadBlob(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }),
      "nqas-system-map.svg",
    );
  };

  const downloadPng = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "1520");
    clone.setAttribute("height", "1760");
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1520;
      canvas.height = 1760;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((png) => {
        if (png) downloadBlob(png, "nqas-system-map.png");
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Could not export the PNG");
    };
    image.src = url;
  };

  const setZoomClamped = (next: number) =>
    setZoom(Math.max(0.6, Math.min(2.2, Number(next.toFixed(2)))));

  const onNodeKey = (event: React.KeyboardEvent, node: SystemNode) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedId(node.id);
    }
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      const index = MAIN_NODES.findIndex((item) => item.id === node.id);
      setSelectedId(MAIN_NODES[Math.min(MAIN_NODES.length - 1, index + 1)].id);
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      const index = MAIN_NODES.findIndex((item) => item.id === node.id);
      setSelectedId(MAIN_NODES[Math.max(0, index - 1)].id);
    }
  };

  return (
    <AppShell
      title="System Map"
      subtitle="How the NQAS tracker works — flow, rules, pages, tools and features"
      titleIcon={Workflow}
    >
      <PageShell
        toolbar={
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1 sm:max-w-md">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search nodes, pages or rules"
                  aria-label="Search the system map"
                  className="h-10 pl-9"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
                {searchHits.length > 0 && (
                  <div className="absolute top-11 right-0 left-0 z-30 overflow-hidden rounded-lg border border-border/70 bg-background shadow-xl">
                    {searchHits.map((hit) => (
                      <button
                        key={hit.id}
                        type="button"
                        onClick={() => openSearchHit(hit)}
                        className="flex w-full items-start gap-2 border-b border-border/40 px-3 py-2 text-left last:border-0 hover:bg-muted/60"
                      >
                        <span className="mt-0.5 text-primary">
                          {hit.to ? <ExternalLink className="size-3.5" /> : <Workflow className="size-3.5" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold">{hit.label}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">{hit.detail}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11px] font-semibold tabular-nums",
                    live ? "border-teal-300 bg-teal-50 text-teal-900" : "border-border bg-muted text-muted-foreground",
                  )}
                  aria-live="polite"
                >
                  {live ? `${total} facilities` : "Loading live counts…"}
                </span>
                <Button variant="outline" size="sm" className="h-9" onClick={downloadMarkdown}>
                  <Download className="mr-1.5 size-4" /> Download spec (Markdown)
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={() => window.print()}>
                  <Printer className="mr-1.5 size-4" /> Print
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="System map views">
              {TABS.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={tab === item}
                  onClick={() => setTab(item)}
                  className={cn(
                    "min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    tab === item
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {item}
                </button>
              ))}
              <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
                <ShieldCheck className="size-3.5" /> One config · live settings · audit-logged text
              </span>
            </div>
          </div>
        }
      >
        <div className="space-y-4 pb-8">
          {tab === "Flow" && (
            <FlowTab
              counts={counts}
              live={live}
              total={total}
              countText={countText}
              showCounts={showCounts}
              setShowCounts={setShowCounts}
              laneFilter={laneFilter}
              setLaneFilter={setLaneFilter}
              zoom={zoom}
              setZoom={setZoomClamped}
              pan={pan}
              setPan={setPan}
              hoverId={hoverId}
              setHoverId={setHoverId}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              svgRef={svgRef}
              onWheelZoom={(delta) => setZoom(zoom * (delta < 0 ? 1.1 : 0.9))}
              onPointerDown={(event) => {
                if ((event.target as Element).closest("[data-map-node]")) return;
                drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!drag.current) return;
                setPan({
                  x: drag.current.panX + (event.clientX - drag.current.x) / zoom,
                  y: drag.current.panY + (event.clientY - drag.current.y) / zoom,
                });
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              onFit={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              onSvg={downloadSvg}
              onPng={() => void downloadPng()}
              onNodeKey={onNodeKey}
              onNodeClick={openNode}
              canEdit={isAdmin}
              onEdit={setEdit}
              editText={text}
              roles={roles}
            />
          )}

          {tab === "Specs" && (
            <SpecsTab
              live={live}
              total={total}
              blocks={dashboard?.perBlock?.length}
              roles={roles}
              text={text}
              canEdit={isAdmin}
              onEdit={setEdit}
              settings={settingsQ?.settings}
              pendingConfig={pendingConfig}
            />
          )}

          {tab === "Functions" && (
            <FunctionsTab
              roleFilter={roleFilter}
              setRoleFilter={setRoleFilter}
              roles={roles}
              text={text}
              canEdit={isAdmin}
              onEdit={setEdit}
            />
          )}

          {tab === "Tools" && (
            <ToolsTab text={text} canEdit={isAdmin} onEdit={setEdit} />
          )}

          {tab === "Features" && (
            <FeaturesTab
              settings={settingsQ?.settings}
              text={text}
              canEdit={isAdmin}
              onEdit={setEdit}
            />
          )}
        </div>
      </PageShell>

      <Dialog open={!!edit} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit text</DialogTitle>
            <DialogDescription>
              Only the words change. The structure stays in the config. Every save is versioned in Audit and logs.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-1 text-xs font-medium">
            {edit?.label}
            <textarea
              value={edit?.value ?? ""}
              onChange={(event) => setEdit((current) => (current ? { ...current, value: event.target.value } : current))}
              rows={5}
              className="min-h-28 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={() => void saveText()}>Save text</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Flow                                                                       */
/* -------------------------------------------------------------------------- */

function FlowTab({
  counts,
  live,
  total,
  countText,
  showCounts,
  setShowCounts,
  laneFilter,
  setLaneFilter,
  zoom,
  setZoom,
  pan,
  setPan,
  hoverId,
  setHoverId,
  selectedId,
  setSelectedId,
  svgRef,
  onWheelZoom,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onFit,
  onSvg,
  onPng,
  onNodeKey,
  onNodeClick,
  canEdit,
  onEdit,
  editText,
  roles,
}: {
  counts: Counts;
  live: boolean;
  total: number;
  countText: (node: SystemNode) => string;
  showCounts: boolean;
  setShowCounts: (value: boolean) => void;
  laneFilter: "all" | MapLaneId;
  setLaneFilter: (value: "all" | MapLaneId) => void;
  zoom: number;
  setZoom: (value: number) => void;
  pan: { x: number; y: number };
  setPan: (value: { x: number; y: number }) => void;
  hoverId: string | null;
  setHoverId: (value: string | null) => void;
  selectedId: string | null;
  setSelectedId: (value: string | null) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onWheelZoom: (delta: number) => void;
  onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: () => void;
  onFit: () => void;
  onSvg: () => void;
  onPng: () => void;
  onNodeKey: (event: React.KeyboardEvent, node: SystemNode) => void;
  onNodeClick: (id: string) => void;
  canEdit: boolean;
  onEdit: (target: EditTarget) => void;
  editText: (key: string, fallback: string) => string;
  roles: { key: string; label: string }[];
}) {
  const selected = selectedId ? NODE_BY_ID[selectedId] : null;
  const dim = (node: SystemNode) =>
    laneFilter !== "all" && node.lane !== laneFilter ? 0.18 : 1;

  return (
    <>
      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0 rounded-xl border border-border/60 bg-card/70 p-2.5">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-lg border border-border/60 p-0.5">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom(zoom - 0.15)} aria-label="Zoom out">
                <Minus className="size-3.5" />
              </Button>
              <span className="w-10 text-center text-[11px] tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom(zoom + 0.15)} aria-label="Zoom in">
                <Plus className="size-3.5" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="h-8" onClick={onFit}>Fit</Button>
            <label className="ml-1 flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <input
                type="checkbox"
                checked={showCounts}
                onChange={(event) => setShowCounts(event.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              Show live counts
            </label>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={onSvg}>
                <Download className="size-3.5" /> SVG
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={onPng}>
                <Download className="size-3.5" /> PNG
              </Button>
            </div>
          </div>
          <div className="mb-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setLaneFilter("all")}
              aria-pressed={laneFilter === "all"}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                laneFilter === "all" ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:bg-muted",
              )}
            >
              All lanes
            </button>
            {LANES.map((lane) => (
              <button
                key={lane}
                type="button"
                onClick={() => setLaneFilter(laneFilter === lane ? "all" : lane)}
                aria-pressed={laneFilter === lane}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  laneFilter === lane ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:bg-muted",
                )}
              >
                {LANE_LABELS[lane]}
              </button>
            ))}
          </div>

          <div className="hidden md:block">
            <div className="overflow-hidden rounded-lg border border-border/50 bg-white">
              <svg
                ref={svgRef}
                viewBox="0 0 760 880"
                role="img"
                aria-label="NQAS journey flow chart"
                className="h-auto w-full cursor-grab touch-none select-none active:cursor-grabbing"
                onWheel={(event) => {
                  event.preventDefault();
                  onWheelZoom(event.deltaY);
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <style>{`
                  .sm-label { font-family: ui-sans-serif, system-ui, sans-serif; }
                  .sm-edge { stroke: #94a3b8; stroke-width: 1.4; fill: none; opacity: .7; }
                  .sm-edge.active { stroke: #0f766e; stroke-width: 2.6; opacity: 1; }
                  .sm-edge.loop { stroke-dasharray: 5 4; }
                  .sm-node { cursor: pointer; outline: none; }
                  .sm-node:focus .sm-node-box { stroke: #0f766e; stroke-width: 2; }
                `}</style>
                <defs>
                  <marker id="sm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                  </marker>
                  <marker id="sm-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f766e" />
                  </marker>
                </defs>
                <rect width="760" height="880" fill="#ffffff" />
                <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                  {LANES.map((lane, index) => {
                    const nodes = MAIN_NODES.filter((node) => node.lane === lane);
                    if (nodes.length === 0) return null;
                    const top = nodes[0].y - 8;
                    const height = nodes[0].height + 16;
                    return (
                      <g key={lane} opacity={laneFilter !== "all" && lane !== laneFilter ? 0.35 : 1}>
                        <rect x="0" y={top} width="760" height={height} fill={index % 2 === 0 ? "#f8fafc" : "#ffffff"} />
                        <text x="10" y={top + height / 2 + 3} className="sm-label" fontSize="10" fontWeight="700" fill="#64748b">
                          {LANE_LABELS[lane]}
                        </text>
                      </g>
                    );
                  })}

                  {SYSTEM_EDGES.map((edge) => {
                    const from = NODE_BY_ID[edge.from];
                    const to = NODE_BY_ID[edge.to];
                    if (!from || !to) return null;
                    const a = nodeCenter(from);
                    const b = nodeCenter(to);
                    const active = hoverId === edge.from || hoverId === edge.to || selectedId === edge.from || selectedId === edge.to;
                    const path = edge.loop
                      ? `M ${from.x} ${a.y} C 55 ${a.y}, 55 ${b.y}, ${to.x} ${b.y}`
                      : `M ${a.x} ${from.y + from.height} C ${a.x} ${from.y + from.height + 22}, ${b.x} ${to.y - 22}, ${b.x} ${to.y}`;
                    return (
                      <g key={`${edge.from}-${edge.to}`}>
                        <path
                          d={path}
                          className={cn("sm-edge", active && "active", edge.loop && "loop")}
                          markerEnd={`url(#${active ? "sm-arrow-active" : "sm-arrow"})`}
                          opacity={laneFilter !== "all" && from.lane !== laneFilter && to.lane !== laneFilter ? 0.15 : undefined}
                        />
                        {edge.label && (
                          <text x={edge.loop ? 22 : (a.x + b.x) / 2 + 5} y={edge.loop ? (a.y + b.y) / 2 : (from.y + from.height + to.y) / 2} fontSize="8.5" fill="#64748b">
                            {edge.label}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {MAIN_NODES.map((node) => {
                    const tone = LANE_TONE[node.lane];
                    const active = selectedId === node.id;
                    const connected = hoverId === node.id || selectedId === node.id;
                    const value = countText(node);
                    return (
                      <g
                        key={node.id}
                        data-map-node
                        className="sm-node"
                        role="button"
                        tabIndex={0}
                        aria-label={`${node.title}. ${node.short}`}
                        opacity={dim(node)}
                        onMouseEnter={() => setHoverId(node.id)}
                        onMouseLeave={() => setHoverId(null)}
                        onClick={() => onNodeClick(node.id)}
                        onKeyDown={(event) => onNodeKey(event, node)}
                      >
                        <rect
                          className="sm-node-box"
                          x={node.x}
                          y={node.y}
                          width={node.width}
                          height={node.height}
                          rx="9"
                          fill={tone.fill}
                          stroke={active || connected ? "#0f766e" : tone.stroke}
                          strokeWidth={active ? 2.2 : 1.2}
                        />
                        <text x={node.x + 13} y={node.y + 23} className="sm-label" fontSize={node.width < 220 ? 10.5 : 12} fontWeight="700" fill="#0f172a">
                          {short(editText(`node.${node.id}.title`, node.title), node.width < 220 ? 22 : 34)}
                        </text>
                        <text x={node.x + 13} y={node.y + 42} className="sm-label" fontSize="9.5" fill="#475569">
                          {short(node.short, node.width < 220 ? 27 : 58)}
                        </text>
                        {showCounts && (
                          <g>
                            <rect x={node.x + node.width - 36} y={node.y + 7} width="25" height="17" rx="8.5" fill="#ffffff" opacity=".86" />
                            <text x={node.x + node.width - 23.5} y={node.y + 19} textAnchor="middle" className="sm-label" fontSize="9.5" fontWeight="700" fill="#0f766e">
                              {value}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
              <span>Hover to trace a path · click a node for rules and links · arrow keys move, Enter opens.</span>
              <span>{live ? `${total} facilities across ${Object.keys(counts).length} live stages` : "Waiting for live counts"}</span>
            </div>
            <div className="mt-2 hidden xl:block">
              <p className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Minimap</p>
              <svg viewBox="0 0 190 220" className="h-20 w-40 rounded border border-border/50 bg-white" aria-hidden="true">
                {MAIN_NODES.map((node) => (
                  <rect key={node.id} x={node.x / 4} y={node.y / 4} width={Math.max(8, node.width / 4)} height={Math.max(4, node.height / 4)} rx="1.5" fill={LANE_TONE[node.lane].stroke} />
                ))}
              </svg>
            </div>
          </div>

          <div className="space-y-1.5 md:hidden">
            {MAIN_NODES.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onNodeClick(node.id)}
                className="flex w-full items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{node.laneLabel}</span>
                  <span className="block truncate text-xs font-semibold">{editText(`node.${node.id}.title`, node.title)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{node.short}</span>
                </span>
                {live && node.countKey && showCounts && (
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold tabular-nums text-primary">{counts[node.countKey]}</span>
                )}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        <aside className="space-y-2" aria-label="Side lanes">
          {SIDE_LANES.map((lane) => (
            <section key={lane.id} className="rounded-xl border border-border/60 bg-card/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold">{lane.title}</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[9.5px] text-muted-foreground">{lane.hint}</span>
              </div>
              <ul className={cn("mt-2 space-y-1.5", lane.id === "pending" && "max-h-64 overflow-y-auto pr-1")}>
                {lane.items.map((item) => (
                  <li key={item.id} className="text-[11px]">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="block text-[10.5px] text-muted-foreground">{item.detail}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section className="rounded-xl border border-border/60 bg-card/80 p-3">
            <h3 className="text-xs font-semibold">Config note</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              This chart is drawn from one config. Live counts come from the aggregate facility query; changing a facility status changes the number here.
            </p>
          </section>
        </aside>
      </section>

      {selected ? (
        <NodePanel
          node={selected}
          text={editText}
          canEdit={canEdit}
          onEdit={onEdit}
          count={selected.countKey && live ? String(counts[selected.countKey]) : "-"}
          roles={roles}
          onClose={() => setSelectedId(null)}
        />
      ) : (
        <section className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-xs text-muted-foreground">
          Click <b className="text-foreground">State Assessment</b> to see its rules, documents and Open in app links.
        </section>
      )}
    </>
  );
}

function NodePanel({
  node,
  text,
  canEdit,
  onEdit,
  count,
  roles,
  onClose,
}: {
  node: SystemNode;
  text: (key: string, fallback: string) => string;
  canEdit: boolean;
  onEdit: (target: EditTarget) => void;
  count: string;
  roles: { key: string; label: string }[];
  onClose: () => void;
}) {
  const ruleLabels = node.pendingRules
    .map((id) => RULE_BY_ID[id])
    .filter(Boolean);
  return (
    <section className="rounded-xl border border-teal-300/70 bg-teal-50/25 p-4" aria-label={`${node.title} details`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-wide text-teal-700 uppercase">{node.laneLabel}</p>
          <h2 className="flex items-center gap-1 text-base font-semibold">
            {text(`node.${node.id}.title`, node.title)}
            <EditPencil canEdit={canEdit} label={`node.${node.id}.title`} value={text(`node.${node.id}.title`, node.title)} onEdit={onEdit} />
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {text(`node.${node.id}.summary`, node.summary)}
            <EditPencil canEdit={canEdit} label={`node.${node.id}.summary`} value={text(`node.${node.id}.summary`, node.summary)} onEdit={onEdit} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-teal-300 bg-white px-2.5 py-1 text-[11px] font-semibold tabular-nums text-teal-800">
            {count} facilities
          </span>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose} aria-label="Close node details">
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-white/70 p-3">
          <h3 className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Rules</h3>
          <ul className="mt-1.5 space-y-1 text-[11px]">
            {node.rules.map((rule, index) => (
              <li key={rule} className="flex items-start gap-1.5">
                <Check className="mt-0.5 size-3 shrink-0 text-teal-700" />
                <span>
                  {text(`node.${node.id}.rule.${index}`, rule)}
                  <EditPencil canEdit={canEdit} label={`node.${node.id}.rule.${index}`} value={text(`node.${node.id}.rule.${index}`, rule)} onEdit={onEdit} />
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg bg-white/70 p-3">
          <h3 className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Fields</h3>
          <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
            {node.fields.map((field) => <li key={field}>{field}</li>)}
          </ul>
        </div>
        <div className="rounded-lg bg-white/70 p-3">
          <h3 className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Documents needed</h3>
          {node.documents.length ? (
            <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
              {node.documents.map((key) => <li key={key}>{DOC_LABEL[key] ?? key}</li>)}
            </ul>
          ) : (
            <p className="mt-1.5 text-[11px] text-muted-foreground">-</p>
          )}
        </div>
        <div className="rounded-lg bg-white/70 p-3">
          <h3 className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Pending rules</h3>
          {ruleLabels.length ? (
            <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
              {ruleLabels.map((rule) => (
                <li key={rule.id}>
                  <span className="font-medium text-foreground">{rule.label}</span>
                  <span className="block text-[10px]">{rule.defaultSeverity} · {rule.defaultEnabled ? "on" : "off"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-[11px] text-muted-foreground">No pending rule is tied to this step.</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-2">
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Roles that can act</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {node.roles.map((role) => (
              <span key={role} className="rounded-full border border-border/70 bg-white px-2 py-0.5 text-[10px] font-medium">{roleLabel(role)}</span>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Open in app</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {node.links.map((link) => (
              <Link key={link.to} to={link.to} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                {link.label} <ArrowRight className="size-3" />
              </Link>
            ))}
          </div>
        </div>
      </div>
      {roles.length > 0 && <p className="mt-2 text-[10px] text-muted-foreground">Role names follow the live role list in Admin → Users.</p>}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Specs                                                                      */
/* -------------------------------------------------------------------------- */

function SpecsTab({
  live,
  total,
  blocks,
  roles,
  text,
  canEdit,
  onEdit,
  settings,
  pendingConfig,
}: {
  live: boolean;
  total: number;
  blocks: number | undefined;
  roles: { key: string; label: string; description: string; scope: string }[];
  text: (key: string, fallback: string) => string;
  canEdit: boolean;
  onEdit: (target: EditTarget) => void;
  settings: Record<string, unknown> | undefined;
  pendingConfig: Record<string, { enabled: boolean; severity: string }>;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Section title="Purpose and scale" className="lg:col-span-2">
        <div className="flex items-start gap-2">
          <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">{text("spec.purpose", SPEC.purpose)}</p>
          <EditPencil canEdit={canEdit} label="spec.purpose" value={text("spec.purpose", SPEC.purpose)} onEdit={onEdit} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-semibold tabular-nums text-teal-900">
            {live ? total : "-"} facilities
          </span>
          <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold tabular-nums">{blocks ?? "-"} blocks</span>
          <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold tabular-nums">{roles.length} roles</span>
          <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold tabular-nums">{issueRules.length} pending rules</span>
        </div>
      </Section>

      <Section title="Roles and permissions">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-left text-[11px]">
            <thead className="text-[10px] tracking-wide text-muted-foreground uppercase">
              <tr><th className="pb-1 pr-2">Role</th><th className="pb-1 pr-2">Scope</th><th className="pb-1 pr-2">Edit</th><th className="pb-1">Admin</th></tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.key} className="border-t border-border/40">
                  <td className="py-1.5 pr-2 font-medium">{role.label}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground">{role.scope}</td>
                  <td className="py-1.5 pr-2">{["admin", "dqc", "dqmo", "entry"].includes(role.key) ? "Yes" : "No"}</td>
                  <td className="py-1.5">{role.key === "admin" ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">Roles are read live from Users and roles. The server still enforces every permission.</p>
      </Section>

      <Section title="Non-negotiable rules">
        <ul className="space-y-1.5 text-[11px]">
          {SPEC.nonNegotiable.map((rule, index) => (
            <li key={rule} className="flex items-start gap-1.5">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-teal-700" />
              <span>{text(`spec.rule.${index}`, rule)}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Status lists">
        <div className="space-y-3">
          {SPEC.statusLists.map((list) => (
            <div key={list.title}>
              <p className="text-[11px] font-semibold">{list.title}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {list.values.map((value) => <span key={value} className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px]">{value}</span>)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Data entities">
        <ul className="grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
          {SPEC.entities.map((entity) => <li key={entity} className="flex gap-1.5"><span className="text-primary">·</span>{entity}</li>)}
        </ul>
      </Section>

      <Section title="Speed targets">
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          {SPEC.speed.map((target) => <li key={target} className="flex gap-1.5"><Check className="mt-0.5 size-3 shrink-0 text-teal-700" />{target}</li>)}
        </ul>
      </Section>

      <Section title="Integrations" className="lg:col-span-2">
        <ul className="grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
          {SPEC.integrations.map((item) => <li key={item} className="flex gap-1.5"><span className="text-primary">·</span>{item}</li>)}
        </ul>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Read NQAS result is currently{" "}
          <b className="text-foreground">{settings?.resultReaderEnabled === true ? "on" : "off"}</b>.
        </p>
      </Section>

      <Section title="Pending rule registry" className="lg:col-span-2">
        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {issueRules.map((rule) => {
            const liveRule = pendingConfig[rule.id];
            const enabled = liveRule?.enabled ?? rule.defaultEnabled;
            const severity = liveRule?.severity ?? rule.defaultSeverity;
            return (
              <div key={rule.id} className="rounded-lg border border-border/50 bg-background/60 px-2.5 py-2 text-[10.5px]">
                <p className="font-medium text-foreground">{rule.label}</p>
                <p className="mt-0.5 text-muted-foreground">{severity} · {enabled ? "On" : "Off"}</p>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Functions                                                                  */
/* -------------------------------------------------------------------------- */

function FunctionsTab({
  roleFilter,
  setRoleFilter,
  roles,
  text,
  canEdit,
  onEdit,
}: {
  roleFilter: string;
  setRoleFilter: (value: string) => void;
  roles: { key: string; label: string }[];
  text: (key: string, fallback: string) => string;
  canEdit: boolean;
  onEdit: (target: EditTarget) => void;
}) {
  const pages = roleFilter === "all"
    ? PAGE_FUNCTIONS
    : PAGE_FUNCTIONS.filter((page) => page.roles.includes(roleFilter));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setRoleFilter("all")} aria-pressed={roleFilter === "all"} className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", roleFilter === "all" ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:bg-muted")}>All roles</button>
        {roles.map((role) => (
          <button key={role.key} type="button" onClick={() => setRoleFilter(role.key)} aria-pressed={roleFilter === role.key} className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", roleFilter === role.key ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:bg-muted")}>{role.label}</button>
        ))}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {pages.map((page) => (
          <section key={page.id} className="rounded-xl border border-border/60 bg-card/80 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-1 text-sm font-semibold">
                  {text(`page.${page.id}.title`, page.title)}
                  <EditPencil canEdit={canEdit} label={`page.${page.id}.title`} value={text(`page.${page.id}.title`, page.title)} onEdit={onEdit} />
                </h3>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {text(`page.${page.id}.purpose`, page.purpose)}
                  <EditPencil canEdit={canEdit} label={`page.${page.id}.purpose`} value={text(`page.${page.id}.purpose`, page.purpose)} onEdit={onEdit} />
                </p>
              </div>
              <BookOpen className="size-4 shrink-0 text-primary" />
            </div>
            <ul className="mt-2 space-y-0.5 text-[10.5px] text-muted-foreground">
              {page.functions.map((fn) => <li key={fn}>· {fn}</li>)}
            </ul>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {page.roles.map((role) => <span key={role} className="rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[9.5px]">{roleLabel(role)}</span>)}
            </div>
            <Link to={page.to} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
              Open page <ExternalLink className="size-3" />
            </Link>
          </section>
        ))}
      </div>
      {pages.length === 0 && <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">No page is available to this role.</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tools                                                                      */
/* -------------------------------------------------------------------------- */

function ToolsTab({
  text,
  canEdit,
  onEdit,
}: {
  text: (key: string, fallback: string) => string;
  canEdit: boolean;
  onEdit: (target: EditTarget) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {SYSTEM_TOOLS.map((tool) => (
        <section key={tool.id} className="rounded-xl border border-border/60 bg-card/80 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="flex items-center gap-1 text-sm font-semibold">
              {text(`tool.${tool.id}.title`, tool.title)}
              <EditPencil canEdit={canEdit} label={`tool.${tool.id}.title`} value={text(`tool.${tool.id}.title`, tool.title)} onEdit={onEdit} />
            </h3>
            <Sparkles className="size-4 shrink-0 text-primary" />
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {text(`tool.${tool.id}.purpose`, tool.purpose)}
            <EditPencil canEdit={canEdit} label={`tool.${tool.id}.purpose`} value={text(`tool.${tool.id}.purpose`, tool.purpose)} onEdit={onEdit} />
          </p>
          <ol className="mt-2 space-y-1 text-[10.5px] text-muted-foreground">
            {tool.steps.map((step, index) => (
              <li key={step} className="flex gap-1.5">
                <span className="font-semibold text-primary">{index + 1}.</span>
                <span>
                  {text(`tool.${tool.id}.step.${index}`, step)}
                  <EditPencil canEdit={canEdit} label={`tool.${tool.id}.step.${index}`} value={text(`tool.${tool.id}.step.${index}`, step)} onEdit={onEdit} />
                </span>
              </li>
            ))}
          </ol>
          <Link to={tool.to} className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15">
            Try it <ArrowRight className="size-3" />
          </Link>
        </section>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Features                                                                   */
/* -------------------------------------------------------------------------- */

function FeaturesTab({
  settings,
  text,
  canEdit,
  onEdit,
}: {
  settings: Record<string, unknown> | undefined;
  text: (key: string, fallback: string) => string;
  canEdit: boolean;
  onEdit: (target: EditTarget) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {SYSTEM_FEATURES.map((feature) => {
        const status: SystemFeature["status"] =
          feature.settingKey === "resultReaderEnabled"
            ? settings === undefined
              ? "Off by default"
              : settings?.resultReaderEnabled === true
                ? "Live"
                : "Off by default"
            : feature.status;
        return (
          <section key={feature.id} className="rounded-xl border border-border/60 bg-card/80 p-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="flex items-center gap-1 text-sm font-semibold">
                {text(`feature.${feature.id}.title`, feature.title)}
                <EditPencil canEdit={canEdit} label={`feature.${feature.id}.title`} value={text(`feature.${feature.id}.title`, feature.title)} onEdit={onEdit} />
              </h3>
              <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold", FEATURE_TONE[status])}>{status}</span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {text(`feature.${feature.id}.description`, feature.description)}
              <EditPencil canEdit={canEdit} label={`feature.${feature.id}.description`} value={text(`feature.${feature.id}.description`, feature.description)} onEdit={onEdit} />
            </p>
            {feature.settingKey === "resultReaderEnabled" && (
              <p className="mt-2 rounded-md bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
                Admin → Documents switch: <b className="text-foreground">{settings?.resultReaderEnabled === true ? "On" : "Off"}</b>
              </p>
            )}
            {feature.to && (
              <Link to={feature.to} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                Open <ArrowRight className="size-3" />
              </Link>
            )}
          </section>
        );
      })}
    </div>
  );
}
