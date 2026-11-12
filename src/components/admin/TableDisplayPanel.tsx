// Workspace → Table & Display.
//
// Two cards (Part D ④ + Part E):
//   • "Frozen columns" — an ordered list (drag / up-down handles), Add /
//     Remove, a hard cap of 3 data columns (FROZEN_COLUMN_CAP), a live width
//     check with a warning above 35% of the viewport, "Pin row checkbox",
//     "Disable freezing below (px)", Reset to default and a mini preview.
//   • "Recently updated" — the marker days (0–30, 0 = off) and the highlight
//     scope (imports only / imports + manual edits).
// Every change lands in the shared admin DRAFT (setPending), so the
// existing "Save all" bar + audit trail (old → new, user, time) apply as-is.

import { useMemo, useState } from "react";
import {
  GripVertical,
  Highlighter,
  MousePointerClick,
  Palette,
  PanelLeft,
  Plus,
  RotateCcw,
  Target,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FROZEN_COLUMN_CAP,
  FROZEN_COLUMN_DEFAULTS,
  MASTER_COLUMNS,
  readRowActionsSetting,
  type RowActionsSetting,
} from "@/lib/masterColumns";
import { columnWidthPx } from "@/lib/masterGrid";
import { orderedVisibleColumns as orderedView } from "@/lib/masterView";
import { DEFAULT_SETTINGS } from "@/convex/lifecycle";
import { DISPLAY_DEFAULTS } from "@/lib/tableDisplay";
import { IA_TARGET_DEFAULT, readIaTarget } from "@/lib/iaCard";
import {
  DEFAULT_SCORE_BANDS,
  readScoreBands,
  scoreBandFor,
  type ScoreBands,
} from "@/lib/scoreBands";
import {
  FACILITY_STYLE_OPTIONS,
  isFacilityStyle,
  type FacilityStyle,
} from "@/lib/facilityStyle";
import { SectionHeader, UnsavedDot } from "@/components/admin/AdminUi";
import { cn } from "@/lib/utils";


/** A minimal View-compatible shape for width resolution only. */
const WIDTH_VIEW = {
  presetId: "custom",
  visibleKeys: MASTER_COLUMNS.map((c) => c.key),
  order: [],
  density: "comfortable" as const,
  collapsedGroups: [],
};

const SETTING_DEFAULTS = DEFAULT_SETTINGS as unknown as Record<string, unknown>;

function frozenOf(settings: Record<string, unknown>, draft: Record<string, unknown>): string[] {
  const raw = draft.frozenColumns ?? settings.frozenColumns ?? SETTING_DEFAULTS.frozenColumns;
  if (!Array.isArray(raw)) return [...DISPLAY_DEFAULTS.frozenColumns];
  return (raw as string[])
    .filter((k) =>
      MASTER_COLUMNS.some((c) => c.key === k && c.freezeable !== false),
    )
    .slice(0, FROZEN_COLUMN_CAP);
}

export function TableDisplayPanel({
  settings,
  draft,
  setPending,
}: {
  settings: Record<string, unknown>;
  draft: Record<string, unknown>;
  /** Draft setter: pass `undefined` as the value to revert a key. */
  setPending: (key: string, value: unknown) => void;
}) {
  const stored = settings as Record<string, unknown>;
  const valueOf = (key: string): unknown =>
    draft[key] !== undefined ? draft[key] : stored[key] !== undefined ? stored[key] : SETTING_DEFAULTS[key];

  const frozen = frozenOf(stored, draft);
  const atCap = frozen.length >= FROZEN_COLUMN_CAP;
  const changedFrozen =
    JSON.stringify(frozen) !== JSON.stringify(SETTING_DEFAULTS.frozenColumns);

  /* Part 5 — the Master List has no row checkboxes, so the old "Pin row
     checkbox" setting is gone (stored values are simply ignored). */
  const facilityStyle: FacilityStyle = isFacilityStyle(valueOf("facilityStyle"))
    ? (valueOf("facilityStyle") as FacilityStyle)
    : "twoLine";
  const freezeBelow = Number(valueOf("freezeBelowPx") ?? DISPLAY_DEFAULTS.freezeBelowPx);
  const recentDays = Math.max(0, Math.min(30, Number(valueOf("recentlyUpdatedDays") ?? DISPLAY_DEFAULTS.recentDays) || 0));
  /* Row action column (the trailing "Update" utility column). */
  const actionsDefault = readRowActionsSetting(SETTING_DEFAULTS.rowActionColumn);
  const actions = readRowActionsSetting(valueOf("rowActionColumn"));
  const changedActions = JSON.stringify(actions) !== JSON.stringify(actionsDefault);
  const setActions = (patch: Partial<RowActionsSetting>) => {
    const next: RowActionsSetting = { ...actions, ...patch };
    setPending(
      "rowActionColumn",
      JSON.stringify(next) === JSON.stringify(actionsDefault)
        ? undefined
        : {
            visible: next.visible ? "show" : "hide",
            label: next.label,
            pinRight: next.pinRight,
            compactBelow1280: next.compactBelow1280,
          },
    );
  };
  const scope = valueOf("highlightScope") === "importsEdits" ? "importsEdits" : "imports";
  const phoneVis = valueOf("assessorPhoneVisibility") === "everyone" ? "everyone" : "role";
  const highlights = Boolean(valueOf("trackUpdates") ?? true);
  const iaTarget = readIaTarget(valueOf("iaTarget"));
  const changedTarget = iaTarget !== IA_TARGET_DEFAULT;
  const scoreBands = readScoreBands(valueOf("scoreBands"));
  const changedBands =
    JSON.stringify(scoreBands) !== JSON.stringify(DEFAULT_SCORE_BANDS);
  const setBand = (key: keyof ScoreBands, raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    const next = { ...scoreBands, [key]: Math.max(0, Math.min(100, value)) };
    setPending(
      "scoreBands",
      JSON.stringify(next) === JSON.stringify(DEFAULT_SCORE_BANDS)
        ? undefined
        : next,
    );
  };

  /* Column picker: any LIVE data column (utility and retired columns excluded,
     so a removed column can never be switched back on). */
  const dataColumns = useMemo(
    () =>
      MASTER_COLUMNS.filter(
        (c) => c.type !== "action" && !c.deprecated && c.freezeable !== false,
      ),
    [],
  );
  const [pick, setPick] = useState<string>("");

  /* Live width check: config px widths (ch × 8) with configured resolution. */
  const zoneWidth = useMemo(() => {
    let width = 0;
    for (const key of frozen) {
      const col = MASTER_COLUMNS.find((c) => c.key === key);
      width += col ? columnWidthPx(col) : 0;
    }
    return width;
  }, [frozen]);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1366 : window.innerWidth,
  );
  void setViewportWidth; // live-updating isn't worth a listener here; the check re-runs on render
  const overBudget = viewportWidth > 0 && zoneWidth / viewportWidth > 0.35;

  const setFrozen = (next: string[]) => {
    setPending("frozenColumns", JSON.stringify(next) === JSON.stringify(SETTING_DEFAULTS.frozenColumns) ? undefined : next);
  };

  // Mini preview: same sticky rule as the real grid.
  let previewLeft = 0;
  const previewOffsets = frozen.map((key) => {
    const col = MASTER_COLUMNS.find((c) => c.key === key);
    const width = col ? columnWidthPx(col) : 0;
    const entry = { key, width, left: previewLeft };
    previewLeft += width;
    return entry;
  });

  const lastScrolling = orderedView(WIDTH_VIEW, frozen).find((c) => !frozen.includes(c.key) && c.type !== "action");

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={PanelLeft}
        title="Table & display"
        description="The Facility cell style, frozen master-list columns, the Internal Assessment target and the “Recently updated” cell marker."
        right={Object.keys(draft).length > 0 ? <UnsavedDot /> : null}
      />

      {/* ---------------- Facility cell default ---------------- */}
      <div
        id="display-facility-cell"
        data-admin-anchor="display-facility-cell"
        className="rounded-xl border border-border/60 bg-background/60 p-4"
      >
        <h3 className="text-sm font-semibold">Facility cell style</h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          The default style for every list. Each user can change it in the
          Columns menu; compact rows always use One line.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {FACILITY_STYLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPending("facilityStyle", option.value)}
              aria-pressed={facilityStyle === option.value}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                facilityStyle === option.value
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/60 hover:bg-muted",
              )}
            >
              <span className="block text-xs font-semibold">{option.label}</span>
              <span className="block text-[11px] text-muted-foreground">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- Internal Assessment target ---------------- */}
      <div
        id="display-ia-target"
        data-admin-anchor="display-ia-target"
        className="rounded-xl border border-border/60 bg-background/60 p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Target className="size-4" /> IA target %
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              The dashed target line and the above/below-target chips on the Internal Assessment card.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setPending("iaTarget", undefined)}
            disabled={!changedTarget}
          >
            <RotateCcw className="mr-1.5 size-3.5" /> Reset
          </Button>
        </div>
        <label className="mt-3 flex min-h-10 items-center gap-2 rounded-lg border border-border/60 px-3">
          <span className="text-sm">Target</span>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={iaTarget}
            onChange={(event) => {
              const next = Math.max(0, Math.min(100, Number(event.target.value)));
              if (!Number.isFinite(next)) return;
              setPending("iaTarget", next === IA_TARGET_DEFAULT ? undefined : next);
            }}
            className="glass-input h-9 w-24 text-center text-sm tabular-nums"
            aria-label="Internal Assessment target percent"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </label>
      </div>

      {/* ---------------- Assessment score bands ---------------- */}
      <div
        id="display-score-bands"
        data-admin-anchor="display-score-bands"
        className="rounded-xl border border-border/60 bg-background/60 p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="size-4" /> Assessment score bands
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              A colour guide for Annexure I bars only — never a certification
              rule. The score number is always printed beside the colour.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setPending("scoreBands", undefined)}
            disabled={!changedBands}
          >
            <RotateCcw className="mr-1.5 size-3.5" /> Reset
          </Button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["below", "Red below"],
              ["satisfactory", "Amber from"],
              ["excellent", "Green from"],
            ] as [keyof ScoreBands, string][]
          ).map(([key, label]) => (
            <label key={key} className="space-y-1">
              <span className="block text-[11px] font-medium text-muted-foreground">
                {label}
              </span>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={scoreBands[key]}
                onChange={(event) => setBand(key, event.target.value)}
                className="h-8 text-xs tabular-nums"
                aria-label={`Score band ${key}`}
              />
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="font-medium text-foreground">Preview</span>
          {[
            Math.max(0, scoreBands.below - 1),
            scoreBands.satisfactory,
            scoreBands.excellent,
          ].map((value) => {
            const band = scoreBandFor(value, scoreBands);
            return (
              <span key={value} className="inline-flex items-center gap-1">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: band?.colour ?? "#94a3b8" }}
                  aria-hidden
                />
                {band?.label ?? "-"} · {value.toFixed(1)}
              </span>
            );
          })}
          <span>Light theme only. Numbers are always shown.</span>
        </div>
      </div>

      {/* ---------------- Frozen columns ---------------- */}
      <div
        id="display-frozen"
        data-admin-anchor="display-frozen"
        className="rounded-xl border border-border/60 bg-background/60 p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <PanelLeft className="size-4" /> Frozen columns
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Only these master-list data columns stay fixed while the rest
              scroll (group band, header and every body row together). Users
              cannot hide frozen columns or drag across the frozen zone. Up to{" "}
              {FROZEN_COLUMN_CAP} data columns.
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPending("frozenColumns", undefined)}
            disabled={!changedFrozen}
          >
            <RotateCcw className="mr-1.5 size-3.5" /> Reset to default
          </Button>
        </div>

        {/* Ordered list */}
        <ul className="mt-3 divide-y divide-border/50 rounded-lg border border-border/60">
          {frozen.map((key, i) => {
            const col = MASTER_COLUMNS.find((c) => c.key === key);
            const label = col?.label ?? key;
            return (
              <li
                key={key}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/frozen-key", key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragged = e.dataTransfer.getData("text/frozen-key");
                  if (!dragged || dragged === key) return;
                  const next = [...frozen];
                  next.splice(next.indexOf(dragged), 1);
                  next.splice(i, 0, dragged);
                  setFrozen(next);
                }}
                className="flex min-h-11 items-center gap-2 px-3 py-1.5"
              >
                <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-foreground/60" aria-hidden />
                <span className="text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {col ? `${columnWidthPx(col)} px` : ""}
                </span>
                <span className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Move ${label} up`}
                    disabled={i === 0}
                    onClick={() => {
                      const next = [...frozen];
                      next.splice(i, 1);
                      next.splice(i - 1, 0, key);
                      setFrozen(next);
                    }}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Move ${label} down`}
                    disabled={i === frozen.length - 1}
                    onClick={() => {
                      const next = [...frozen];
                      next.splice(i, 1);
                      next.splice(i + 1, 0, key);
                      setFrozen(next);
                    }}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    aria-label={`Remove ${label} from the frozen columns`}
                    onClick={() => setFrozen(frozen.filter((k) => k !== key))}
                  >
                    <X className="size-3.5" />
                  </Button>
                </span>
              </li>
            );
          })}
          {frozen.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Nothing is frozen — every column scrolls.
            </li>
          )}
        </ul>

        {/* Add column (any data column; utility columns excluded) */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select value={pick || "none"} onValueChange={setPick}>
            <SelectTrigger className="h-9 w-64 text-xs">
              <SelectValue placeholder="Add a column…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">
                — pick a data column —
              </SelectItem>
              {dataColumns
                .filter((c) => !frozen.includes(c.key))
                .map((c) => (
                  <SelectItem key={c.key} value={c.key} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={!pick || atCap}
            onClick={() => {
              if (!pick || frozen.includes(pick)) return;
              setFrozen([...frozen, pick]);
              setPick("");
            }}
          >
            <Plus className="mr-1 size-3.5" /> Add column
          </Button>
          {atCap && (
            <span className="text-xs text-muted-foreground">
              Cap reached ({FROZEN_COLUMN_CAP} data columns) — remove one first.
            </span>
          )}
        </div>

        {/* Live width check */}
        <p className={cn("mt-2 text-xs", overBudget ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
          Frozen width {Math.round(zoneWidth)} px of {viewportWidth.toLocaleString("en-IN")} px
          {overBudget
            ? " — above 35% of the viewport, try fewer or narrower frozen columns"
            : ""}
          .
        </p>

        {/* Cut-off width */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex min-h-10 items-center gap-2 rounded-lg border border-border/60 px-3">
            <Label htmlFor="freeze-below" className="text-sm">
              Disable freezing below
            </Label>
            <Input
              id="freeze-below"
              type="number"
              min={0}
              max={1920}
              value={freezeBelow}
              onChange={(e) => {
                const next = Math.max(0, Math.min(1920, Number(e.target.value) || 0));
                setPending("freezeBelowPx", next === DISPLAY_DEFAULTS.freezeBelowPx ? undefined : next);
              }}
              className="glass-input h-9 w-24 text-center text-sm tabular-nums"
            />
            <span className="text-sm text-muted-foreground">px</span>
          </div>
        </div>

        {/* Mini live preview */}
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/60 p-2">
          <div className="flex text-[11px]" style={{ width: "max-content" }}>
            {previewOffsets.map((p) => (
              <span
                key={p.key}
                style={{
                  width: Math.max(110, p.width),
                  ...(frozen.includes(p.key) ? { left: `${p.left}px`, position: "sticky" as const } : {}),
                }}
                className="flex h-8 items-center gap-1 truncate border border-border/60 bg-primary/10 px-2 font-medium"
              >
                {MASTER_COLUMNS.find((c) => c.key === p.key)?.label ?? p.key}
              </span>
            ))}
            {lastScrolling && (
              <span className="flex h-8 items-center border border-border/60 bg-muted/40 px-2 text-muted-foreground">
                {lastScrolling.label}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Live preview — teal columns are frozen (first: highlighted),
            greyed column scrolls.
          </p>
        </div>
      </div>

      {/* ---------------- Row action column ---------------- */}
      <div
        id="display-row-actions"
        data-admin-anchor="display-row-actions"
        className="rounded-xl border border-border/60 bg-background/60 p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <MousePointerClick className="size-4" /> Row action column
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              The trailing “Update” column of the facility master list — always on
              screen, pinned to the right edge, never exported and never counted
              in the Columns badge. Users cannot hide, reorder or resize it.
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPending("rowActionColumn", undefined)}
            disabled={!changedActions}
          >
            <RotateCcw className="mr-1.5 size-3.5" /> Reset to default
          </Button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-border/60 px-3">
            <Label className="text-sm">Column</Label>
            <Button
              size="sm"
              variant={actions.visible ? "default" : "outline"}
              onClick={() => setActions({ visible: true })}
            >
              Show
            </Button>
            <Button
              size="sm"
              variant={!actions.visible ? "default" : "outline"}
              onClick={() => setActions({ visible: false })}
            >
              Hide
            </Button>
          </div>
          <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-border/60 px-3">
            <Label className="text-sm">Button label</Label>
            <Button
              size="sm"
              variant={actions.label === "Update" ? "default" : "outline"}
              onClick={() => setActions({ label: "Update" })}
            >
              Update
            </Button>
            <Button
              size="sm"
              variant={actions.label === "Edit" ? "default" : "outline"}
              onClick={() => setActions({ label: "Edit" })}
            >
              Edit
            </Button>
          </div>
        </div>

        <label className="mt-3 flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 text-sm">
          <input
            type="checkbox"
            checked={actions.pinRight}
            onChange={(e) => setActions({ pinRight: e.target.checked })}
            className="size-4"
          />
          <span>
            Pin to right edge
            <span className="block text-xs text-muted-foreground">
              The column stays visible while the data columns scroll
              underneath it.
            </span>
          </span>
        </label>
        <label className="mt-2 flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 text-sm">
          <input
            type="checkbox"
            checked={actions.compactBelow1280}
            onChange={(e) => setActions({ compactBelow1280: e.target.checked })}
            className="size-4"
          />
          <span>
            Compact icon-only below 1280 px
            <span className="block text-xs text-muted-foreground">
              The labelled button collapses to its icon (the tooltip and screen
              reader name keep the facility).
            </span>
          </span>
        </label>
      </div>

      {/* ---------------- Recently updated ---------------- */}
      <div
        id="display-recent"
        data-admin-anchor="display-recent"
        className="rounded-xl border border-border/60 bg-background/60 p-4"
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Highlighter className="size-4" /> Recently updated
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Cells changed or filled by an import are tinted (a soft background +
          a corner dot) for the chosen number of days, counted as days × 24
          hours from the import time. Computed at read time from the change
          log — changing these values applies on every user's next load,
          without re-importing. Undoing an import removes its markers. Tracked
          fields: SaQsham Documents Status, Documents Status (Report), SaQsham
          Application No, portal last-update date, Facility Current Status
          (when the optional auto-advance moves it), and the IA values for the
          displayed quarter.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex min-h-10 items-center gap-2 rounded-lg border border-border/60 px-3">
            <Label htmlFor="recent-days" className="text-sm">
              Highlight for (N days)
            </Label>
            <Input
              id="recent-days"
              type="number"
              min={0}
              max={30}
              value={recentDays}
              onChange={(e) => {
                const next = Math.max(0, Math.min(30, Number(e.target.value) || 0));
                setPending("recentlyUpdatedDays", next === DISPLAY_DEFAULTS.recentDays ? undefined : next);
              }}
              className="glass-input h-9 w-20 text-center text-sm tabular-nums"
            />
            <span className="text-sm text-muted-foreground">
              {recentDays === 0 ? "off" : `${recentDays} × 24 h`}
            </span>
          </div>
          <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-border/60 px-3">
            <Label className="text-sm">Assessor phone numbers</Label>
            <Button
              size="sm"
              variant={phoneVis === "role" ? "default" : "outline"}
              onClick={() => setPending("assessorPhoneVisibility", undefined)}
            >
              Viewers: last 4 digits
            </Button>
            <Button
              size="sm"
              variant={phoneVis === "everyone" ? "default" : "outline"}
              onClick={() => setPending("assessorPhoneVisibility", "everyone")}
            >
              Everyone sees full
            </Button>
          </div>
          <div className="flex min-h-10 items-center gap-2 rounded-lg border border-border/60 px-3">
            <Label className="text-sm">Highlight</Label>
            <Button
              size="sm"
              variant={scope === "imports" ? "default" : "outline"}
              onClick={() => setPending("highlightScope", scope === "imports" ? undefined : "importsEdits")}
            >
              imports only
            </Button>
            <Button
              size="sm"
              variant={scope === "importsEdits" ? "default" : "outline"}
              onClick={() =>
                setPending("highlightScope", scope === "importsEdits" ? undefined : "importsEdits")
              }
            >
              imports + manual edits
            </Button>
          </div>
        </div>
        <label className="mt-3 flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 text-sm">
          <input
            type="checkbox"
            checked={highlights}
            onChange={(e) => setPending("trackUpdates", e.target.checked ? undefined : false)}
            className="size-4"
          />
          <span>
            trackUpdates — track imported changes at all (
            {highlights ? "on" : "off"})
            <span className="block text-xs text-muted-foreground">
              Turning tracking off hides every marker everywhere, instantly.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

