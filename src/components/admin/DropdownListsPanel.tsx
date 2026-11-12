// Workspace → Dropdown Lists.
//
// The 16 editable dropdown lists, grouped along the certification pipeline so
// staff can find “the list I need” by thinking about the stage instead of
// scrolling ~20 cards. Changes are staged in the page-level draft (no per-card
// Save button): the sticky bar saves everything at once.

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  GripVertical,
  Info,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { DEFAULT_SETTINGS, DROPDOWN_GROUPS } from "@/convex/lifecycle";
import { USAGE_COUNTABLE_KEYS, type SettingsDraft } from "@/lib/adminSettings";
import { CountBadge, SectionHeader, UnsavedDot } from "@/components/admin/AdminUi";

type ListItem = { key: string; label: string; hint: string };
type Group = { phase: string; description: string; items: ListItem[] };

export function DropdownListsPanel({
  settings,
  usage,
  draft,
  setPending,
  focusKey,
}: {
  settings: Record<string, unknown>;
  /** setting key → option value → how many records already use it. */
  usage: Record<string, Record<string, number>>;
  draft: SettingsDraft;
  setPending: (key: string, value: unknown) => void;
  /** List key the “Search settings…” box jumped to — opened automatically so
   *  the highlighted card is not collapsed. */
  focusKey?: string | null;
}) {
  // stage filter: "all" or a phase label
  const [stage, setStage] = useState<string>("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<{ key: string; from: number; to: number } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<
    | { key: string; label: string; option: string; used: number }
    | null
  >(null);

  // A jump from the settings search always shows the whole pipeline and opens
  // the list it landed on.
  useEffect(() => {
    if (!focusKey) return;
    setStage("all");
    setOpen((o) => ({ ...o, [focusKey]: true }));
  }, [focusKey]);

  const storedOf = (key: string): string[] =>
    ((settings[key] as string[] | undefined) ??
      ((DEFAULT_SETTINGS as Record<string, unknown>)[key] as string[] | undefined) ??
      []) as string[];

  // The page draft IS the source of truth for edits, so a list keeps showing
  // its pending options even after this panel (and its tab) has been unmounted
  // and remounted.
  const valueOf = (key: string): string[] =>
    (draft[key] as string[] | undefined) ?? storedOf(key);

  /** Writes a list into the draft, dropping the key when the list is back to
   *  its saved value (so “unsaved changes” never counts a no-op). */
  const commit = (key: string, next: string[]) => {
    const same = JSON.stringify(next) === JSON.stringify(storedOf(key));
    setPending(key, same ? undefined : next);
  };

  const addOption = (key: string, raw: string) => {
    const value = raw.trim();
    if (!value) return;
    const current = valueOf(key);
    if (current.some((c) => c.toLowerCase() === value.toLowerCase())) {
      toast.error(`“${value}” is already in this list`);
      return;
    }
    commit(key, [...current, value]);
    toast.success(`“${value}” added — save to apply`);
  };

  const renameOption = (key: string, index: number, raw: string) => {
    const value = raw.trim();
    const current = valueOf(key);
    if (!value) return;
    if (current.some((c, i) => i !== index && c.toLowerCase() === value.toLowerCase())) {
      toast.error(`“${value}” is already in this list`);
      return;
    }
    const next = [...current];
    next[index] = value;
    commit(key, next);
  };

  /** Removal is guarded: an option that records already use asks first. */
  const removeOption = (key: string, label: string, option: string) => {
    const used = USAGE_COUNTABLE_KEYS.has(key) ? (usage[key]?.[option] ?? 0) : 0;
    if (used > 0) {
      setConfirmRemove({ key, label, option, used });
      return;
    }
    applyRemove(key, label, option);
  };

  const applyRemove = (key: string, label: string, option: string) => {
    const before = valueOf(key);
    const next = before.filter((v) => v !== option);
    commit(key, next);
    toast(`“${option}” removed from ${label}`, {
      description: "Records already saved keep the text they stored.",
      action: { label: "Undo", onClick: () => commit(key, before) },
    });
  };

  const moveOption = (key: string, from: number, to: number) => {
    const current = valueOf(key);
    if (to < 0 || to >= current.length || from === to) return;
    const next = [...current];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(key, next);
  };

  const groups: Group[] = DROPDOWN_GROUPS;
  const visibleGroups = stage === "all" ? groups : groups.filter((g) => g.phase === stage);
  const changedKeys = new Set(Object.keys(draft));

  const totalLists = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={RotateCcw}
        title="Dropdown lists"
        description={`${totalLists} editable lists across ${groups.length} certification stages. Add, rename, reorder or remove options — nothing is applied until you press “Save all”.`}
      />

      {/* Clickable pipeline stepper: pick a stage to filter the lists. */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStage("all")}
            aria-pressed={stage === "all"}
            className={cn(
              "min-h-10 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              stage === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 bg-background hover:bg-muted",
            )}
          >
            All stages
          </button>
          {groups.map((g, i) => {
            const active = stage === g.phase;
            return (
              <span key={g.phase} className="flex items-center gap-1.5">
                <span aria-hidden className="text-muted-foreground">
                  {i > 0 ? "→" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setStage(g.phase)}
                  aria-pressed={active}
                  data-tip={g.description}
                  className={cn(
                    "min-h-10 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background hover:bg-muted",
                  )}
                >
                  {g.phase}
                  <span className="ml-2 text-xs opacity-80 tabular-nums">{g.items.length}</span>
                </button>
              </span>
            );
          })}
        </div>
      </div>

      {visibleGroups.map((group) =>
        group.items.length === 0 ? (
          <p
            key={group.phase}
            className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground"
          >
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong className="font-semibold text-foreground">
                No editable dropdown at this stage.
              </strong>{" "}
              {group.description}
            </span>
          </p>
        ) : (
          <section key={group.phase} className="space-y-2">
            <div>
              <h3 className="text-base font-semibold text-foreground">{group.phase}</h3>
              <p className="text-sm text-muted-foreground">{group.description}</p>
            </div>
            <div className="space-y-2">
              {group.items.map((item) => {
                const options = valueOf(item.key);
                // Choosing one stage expands its lists (there are only a few);
                // “All stages” stays collapsed as a scannable index.
                const isOpen = open[item.key] ?? stage !== "all";
                const pending = changedKeys.has(item.key);
                return (
                  <div
                    key={item.key}
                    id={`list-${item.key}`}
                    data-admin-anchor={`list-${item.key}`}
                    className="scroll-mt-40 rounded-xl border border-border/60 bg-background/60"
                  >
                    <button
                      type="button"
                      onClick={() => setOpen((o) => ({ ...o, [item.key]: !isOpen }))}
                      aria-expanded={isOpen}
                      className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-transform",
                            isOpen && "rotate-180",
                          )}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">
                            {item.label}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            Used in: {item.hint}
                          </span>
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {pending && <UnsavedDot />}
                        <CountBadge value={`${options.length} option${options.length === 1 ? "" : "s"}`} />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border/60 p-3">
                        <ul className="flex flex-wrap gap-2" role="list">
                          {options.map((option, index) => (
                            <Chip
                              key={`${item.key}-${option}-${index}`}
                              option={option}
                              label={item.label}
                              usage={
                                USAGE_COUNTABLE_KEYS.has(item.key)
                                  ? (usage[item.key]?.[option] ?? 0)
                                  : null
                              }
                              index={index}
                              total={options.length}
                              dragging={
                                drag?.key === item.key && drag.from === index
                              }
                              dropTarget={
                                drag?.key === item.key &&
                                drag.to === index &&
                                drag.from !== index
                              }
                              onDragStart={() =>
                                setDrag({ key: item.key, from: index, to: index })
                              }
                              onDragOver={() =>
                                setDrag((d) =>
                                  d && d.key === item.key ? { ...d, to: index } : d,
                                )
                              }
                              onDrop={() => {
                                if (drag && drag.key === item.key) {
                                  moveOption(item.key, drag.from, drag.to);
                                }
                                setDrag(null);
                              }}
                              onMove={(dir) => moveOption(item.key, index, index + dir)}
                              onRename={(value) => renameOption(item.key, index, value)}
                              onRemove={() => removeOption(item.key, item.label, option)}
                            />
                          ))}
                          {options.length === 0 && (
                            <li className="text-sm text-muted-foreground">
                              No options yet — add the first one below.
                            </li>
                          )}
                        </ul>

                        <AddOption
                          listKey={item.key}
                          onAdd={(value) => addOption(item.key, value)}
                        />

                        <p className="mt-2 text-xs text-muted-foreground">
                          Drag a chip to reorder · double-click (or press Enter on) a
                          chip to rename · use the arrows for keyboard reordering.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ),
      )}

      {/* Removal warning with a live usage count. */}
      <AlertDialog
        open={confirmRemove !== null}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
      >
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Remove “{confirmRemove?.option}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemove?.used.toLocaleString("en-IN")} existing record
              {confirmRemove?.used === 1 ? "" : "s"} already use this option in{" "}
              <strong>{confirmRemove?.label}</strong>. Those records keep the text
              they stored and keep displaying it — the option only disappears from
              new dropdowns.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the option</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white"
              onClick={() => {
                if (confirmRemove) {
                  applyRemove(confirmRemove.key, confirmRemove.label, confirmRemove.option);
                }
                setConfirmRemove(null);
              }}
            >
              Remove anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** One option chip: draggable, double-click to rename, x to remove, Alt+←/→ to
 *  reorder from the keyboard. */
function Chip({
  option,
  label,
  usage,
  index,
  total,
  dragging,
  dropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onMove,
  onRename,
  onRemove,
}: {
  option: string;
  label: string;
  usage: number | null;
  index: number;
  total: number;
  dragging: boolean;
  dropTarget: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onMove: (dir: -1 | 1) => void;
  onRename: (value: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(option);

  if (editing) {
    return (
      <li className="flex items-center gap-1.5">
        <Input
          autoFocus
          className="glass-input h-9 w-48 text-sm"
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onBlur={() => {
            onRename(draftValue);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onRename(draftValue);
              setEditing(false);
            }
            if (e.key === "Escape") {
              setDraftValue(option);
              setEditing(false);
            }
          }}
        />
      </li>
    );
  }

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onDragEnd={onDrop}
      className={cn(
        "group flex items-center gap-1 rounded-full border bg-background pr-1 pl-2 transition-all duration-150",
        dragging && "opacity-60",
        dropTarget && "border-primary ring-2 ring-primary/30",
      )}
      data-tip={usage != null ? `Used by ${usage} record${usage === 1 ? "" : "s"}` : undefined}
    >
      <GripVertical
        aria-hidden
        className="size-3.5 cursor-grab text-muted-foreground/60 group-hover:text-muted-foreground"
      />
      <button
        type="button"
        onClick={() => {
          setDraftValue(option);
          setEditing(true);
        }}
        onDoubleClick={() => {
          setDraftValue(option);
          setEditing(true);
        }}
        onKeyDown={(e) => {
          if (e.altKey && e.key === "ArrowLeft") {
            e.preventDefault();
            onMove(-1);
          }
          if (e.altKey && e.key === "ArrowRight") {
            e.preventDefault();
            onMove(1);
          }
        }}
        aria-label={`Rename “${option}” (in ${label}). Alt plus arrow keys to reorder.`}
        className="min-h-9 rounded-full px-1 text-sm font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {option}
      </button>
      {usage != null && usage > 0 && (
        <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">
          {usage}
        </span>
      )}
      <span className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label={`Move “${option}” earlier`}
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <span aria-hidden className="block text-xs leading-none">◀</span>
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          aria-label={`Move “${option}” later`}
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <span aria-hidden className="block text-xs leading-none">▶</span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove “${option}” from ${label}`}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-3.5" />
        </button>
      </span>
    </li>
  );
}

function AddOption({
  listKey,
  onAdd,
}: {
  listKey: string;
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Input
        id={`add-${listKey}`}
        className="glass-input h-10 w-full sm:w-64"
        placeholder="Add option…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd(value);
            setValue("");
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="h-10"
        disabled={!value.trim()}
        onClick={() => {
          onAdd(value);
          setValue("");
        }}
      >
        <Plus className="mr-1.5 size-4" /> Add option
      </Button>
    </div>
  );
}
