/**
 * COLUMN MANAGER — "which columns do I see?" in one dialog.
 *
 * • one click shows/hides a whole group (the 9 master-sheet groups),
 * • individual column checkboxes inside each group,
 * • drag-to-reorder (plus keyboard-accessible up/down buttons),
 * • preset views and the density toggle.
 *
 * Everything writes back through `onChange` — the page owns the view state and
 * persists it in localStorage (lib/masterView).
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  FACILITY_STYLE_OPTIONS,
  setFacilityStyle,
  useFacilityStyle,
  type FacilityStyle,
} from "@/lib/facilityStyle";
// Part-3 audit: deprecated columns (the Eco trio) never appear in the
// Columns menu. The showInMasterList:false columns DO — that is the re-enable
// path a State Admin uses.
import { COLUMN_PRESETS, MASTER_GROUPS, columnsMenuColumns } from "@/lib/masterColumns";
import {
  CUSTOM_PRESET_ID,
  DEFAULT_VIEW,
  applyPreset,
  moveColumn,
  orderedVisibleColumns,
  type Density,
  type MasterView,
} from "@/lib/masterView";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Columns3,
  GripVertical,
  Pin,
  Rows3,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ColumnManager({
  open,
  onOpenChange,
  labels,
  view,
  onChange,
  pinnedKeys = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Resolved display labels (admin renames applied), keyed by column key. */
  labels: Record<string, string>;
  view: MasterView;
  onChange: (view: MasterView) => void;
  /** The Admin setting's frozen columns — they cannot be hidden here, and
   *  users cannot drag a column into or out of the frozen zone. */
  pinnedKeys?: string[];
}) {
  const isFrozen = (key: string) => pinnedKeys.includes(key);
  const facilityStyle = useFacilityStyle();
  const updateProfile = useMutation(api.profile.updateMyProfile);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const visible = new Set(view.visibleKeys);
  const columns = orderedVisibleColumns(view, pinnedKeys);

  const setVisible = (key: string, on: boolean) => {
    if (isFrozen(key)) return; // frozen by admin — never hidden
    const next = on
      ? [...view.visibleKeys, key]
      : view.visibleKeys.filter((k) => k !== key);
    onChange({ ...view, presetId: CUSTOM_PRESET_ID, visibleKeys: next });
  };

  const chooseFacilityStyle = (next: FacilityStyle) => {
    setFacilityStyle(next);
    void updateProfile({ preferences: { facilityStyle: next } }).catch(() => undefined);
    // One line is a 36 px row; Two lines needs the comfortable row.
    if (next === "oneLine" && view.density !== "compact")
      onChange({ ...view, density: "compact" });
    if (next === "twoLine" && view.density === "compact")
      onChange({ ...view, density: "comfortable" });
  };

  const setGroup = (groupIds: string[], on: boolean) => {
    const groupKeys = columnsMenuColumns().filter((c) => groupIds.includes(c.group)).map((c) => c.key);
    // Frozen columns survive a group hide — the left anchor stays institutional.
    const next = on
      ? [...new Set([...view.visibleKeys, ...groupKeys])]
      : view.visibleKeys.filter((k) => (!groupKeys.includes(k) || isFrozen(k)));
    onChange({ ...view, presetId: CUSTOM_PRESET_ID, visibleKeys: next });
  };

  const drop = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey || isFrozen(dragKey) || isFrozen(targetKey)) return;
    // Frozen zone is untouchable: neither end of a drag may sit inside it.
    const order = columns.map((c) => c.key).filter((k) => !isFrozen(k));
    const from = order.indexOf(dragKey);
    const to = order.indexOf(targetKey);
    if (from === -1 || to === -1) return;
    onChange(moveColumn({ ...view, presetId: CUSTOM_PRESET_ID }, dragKey, to, pinnedKeys));
    setDragKey(null);
    setDropKey(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns3 className="size-4" /> Columns
          </DialogTitle>
          <DialogDescription>
            Tick a group to show or hide it in one click, drag rows to reorder, or
            start from a preset. Your choice is remembered on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {COLUMN_PRESETS.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={view.presetId === p.id ? "default" : "outline"}
                className="h-9"
                onClick={() => onChange(applyPreset(p.id, pinnedKeys))}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Density */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Rows3 className="size-4" /> Row density
            </span>
            <span className="flex gap-1 rounded-lg border border-border/60 p-1">
              {(["comfortable", "compact"] as Density[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange({ ...view, density: d })}
                  aria-pressed={view.density === d}
                  className={cn(
                    "min-h-9 rounded-md px-3 text-sm font-medium capitalize transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    view.density === d
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {d}
                </button>
              ))}
            </span>
          </div>

          {/* Facility identity style */}
          <div className="rounded-xl border border-border/60 p-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              Facility cell
            </span>
            <div className="mt-2 grid gap-1 sm:grid-cols-3">
              {FACILITY_STYLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => chooseFacilityStyle(option.value)}
                  aria-pressed={facilityStyle === option.value}
                  className={cn(
                    "min-h-12 rounded-lg border px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
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
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Compact rows always use One line. The State Admin sets the default.
            </p>
          </div>

          {/* Groups */}
          {MASTER_GROUPS.map((group) => {
            const groupColumns = columnsMenuColumns().filter((c) => c.group === group.id);
            const visibleInGroup = groupColumns.filter((c) => visible.has(c.key)).length;
            const isPinnedGroup = group.id === "identity";
            return (
              <section key={group.id} className="rounded-xl border border-border/60">
                <label
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-t-xl px-3 py-2",
                    group.tint.bg,
                  )}
                >
                  <Checkbox
                    checked={
                      isPinnedGroup
                        ? true
                        : visibleInGroup === groupColumns.length
                          ? true
                          : visibleInGroup === 0
                            ? false
                            : "indeterminate"
                    }
                    disabled={isPinnedGroup}
                    onCheckedChange={(v) => setGroup([group.id], v === true)}
                    aria-label={`Show or hide the ${group.label} group`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm font-semibold", group.tint.text)}>
                      {group.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {visibleInGroup} of {groupColumns.length} columns shown
                    </span>
                  </span>
                </label>
                <ul className="divide-y divide-border/50">
                  {groupColumns.map((c) => (
                    <li
                      key={c.key}
                      draggable={!isFrozen(c.key)}
                      onDragStart={() => setDragKey(c.key)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDropKey(c.key);
                      }}
                      onDragEnd={() => {
                        setDragKey(null);
                        setDropKey(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        drop(c.key);
                      }}
                      className={cn(
                        "flex min-h-11 items-center gap-2 px-3 py-1.5 transition-colors",
                        dropKey === c.key && dragKey !== c.key && "bg-primary/10",
                        !isFrozen(c.key) && "cursor-grab",
                      )}
                    >
                      <GripVertical
                        className="size-3.5 shrink-0 text-muted-foreground/60"
                        aria-hidden
                      />
                      <Checkbox
                        checked={visible.has(c.key)}
                        disabled={isFrozen(c.key)}
                        onCheckedChange={(v) => setVisible(c.key, v === true)}
                        id={`col-${c.key}`}
                        aria-label={`Show ${labels[c.key] ?? c.label}`}
                      />
                      <Label
                        htmlFor={`col-${c.key}`}
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm font-normal",
                          !isFrozen(c.key) && "cursor-pointer",
                        )}
                      >
                        {labels[c.key] ?? c.label}
                        {isFrozen(c.key) && (
                          <span
                            className="ml-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground"
                            data-tip="Frozen by admin"
                          >
                            <Pin className="size-3" aria-hidden /> frozen
                          </span>
                        )}
                      </Label>
                      {!isFrozen(c.key) && (
                        <span className="flex shrink-0 items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Move ${labels[c.key] ?? c.label} up`}
                            onClick={() => {
                              const order = columns
                                .map((x) => x.key)
                                .filter((k) => !isFrozen(k));
                              onChange(
                                moveColumn(
                                  { ...view, presetId: CUSTOM_PRESET_ID },
                                  c.key,
                                  order.indexOf(c.key) - 1,
                                  pinnedKeys,
                                ),
                              );
                            }}
                          >
                            <ArrowUp className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Move ${labels[c.key] ?? c.label} down`}
                            onClick={() => {
                              const order = columns
                                .map((x) => x.key)
                                .filter((k) => !isFrozen(k));
                              onChange(
                                moveColumn(
                                  { ...view, presetId: CUSTOM_PRESET_ID },
                                  c.key,
                                  order.indexOf(c.key) + 1,
                                  pinnedKeys,
                                ),
                              );
                            }}
                          >
                            <ArrowDown className="size-3.5" />
                          </Button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => onChange({ ...DEFAULT_VIEW })}>
            <RotateCcw className="mr-1.5 size-4" /> Reset to default
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            <Check className="mr-1.5 size-4" /> Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
