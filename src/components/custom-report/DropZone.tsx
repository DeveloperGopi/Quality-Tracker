import { useMemo } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Inbox,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AGG_LABELS,
  type AggregateKind,
  type PivotFieldDef,
} from "@/lib/pivot";
import { TypeBadge, fieldKindOf } from "./FieldList";

export type ZoneId = "rows" | "columns" | "values" | "filters";

export const ZONE_META: Record<
  ZoneId,
  { label: string; hint: string; max: number; step: string }
> = {
  rows: {
    label: "Rows",
    hint: "Group the report by these fields",
    max: 4,
    step: "2",
  },
  columns: {
    label: "Columns",
    hint: "Spread the figures across these fields",
    max: 2,
    step: "2",
  },
  values: {
    label: "Values",
    hint: "What to calculate — count, sum, average, % of total…",
    max: 6,
    step: "2",
  },
  filters: {
    label: "Filters",
    hint: "Include only facilities matching these values",
    max: 8,
    step: "2",
  },
};

export const ZONE_ORDER: ZoneId[] = ["rows", "columns", "values", "filters"];

export function DropZone({
  zone,
  count,
  active,
  dragging,
  onDragOverZone,
  onDragLeaveZone,
  onDropZone,
  onClear,
  fields,
  onAddField,
  children,
}: {
  zone: ZoneId;
  count: number;
  active: boolean;
  dragging: boolean;
  onDragOverZone: (e: React.DragEvent) => void;
  onDragLeaveZone: () => void;
  onDropZone: (e: React.DragEvent) => void;
  onClear?: () => void;
  fields: PivotFieldDef[];
  onAddField: (fieldId: string) => void;
  children: React.ReactNode;
}) {
  const meta = ZONE_META[zone];
  const groups = useMemo(() => {
    const map = new Map<string, PivotFieldDef[]>();
    for (const f of fields) {
      const list = map.get(f.group);
      if (list) list.push(f);
      else map.set(f.group, [f]);
    }
    return [...map.entries()];
  }, [fields]);

  return (
    <section
      aria-label={`Step 2 zone: ${meta.label}`}
      onDragOver={onDragOverZone}
      onDragLeave={onDragLeaveZone}
      onDrop={onDropZone}
      className={cn(
        "glass flex min-h-28 flex-col rounded-xl border-2 border-dashed p-2.5 transition-all",
        active
          ? "scale-[1.02] border-primary bg-primary/10 shadow-lg ring-2 ring-primary/30"
          : dragging
            ? "border-border"
            : "border-border/60",
      )}
    >
      <header className="mb-1 flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          2
        </span>
        <span className="text-sm font-bold">{meta.label}</span>
        <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
          {count}/{meta.max}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          {onClear && (
            <button
              type="button"
              data-tip={`Clear ${meta.label.toLowerCase()}`}
              aria-label={`Clear ${meta.label.toLowerCase()}`}
              onClick={onClear}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          <AddFieldMenu zone={meta.label} groups={groups} onAdd={onAddField} />
        </div>
      </header>
      <p className="mb-1.5 text-xs leading-snug text-muted-foreground">
        {active ? (
          <b className="font-semibold text-primary">Drop here</b>
        ) : (
          meta.hint
        )}
      </p>
      <div className="min-h-14">{children}</div>
    </section>
  );
}

function AddFieldMenu({
  zone,
  groups,
  onAdd,
}: {
  zone: string;
  groups: [string, PivotFieldDef[]][];
  onAdd: (fieldId: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-tip={`Add a field to ${zone}`}
          aria-label={`Add a field to ${zone}`}
          className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-3.5" /> Add
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 w-64 overflow-y-auto">
        {groups.map(([group, list]) => (
          <DropdownMenuSub key={group}>
            <DropdownMenuSubTrigger className="text-xs">{group}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
              {list.map((f) => (
                <DropdownMenuItem
                  key={f.id}
                  className="text-xs"
                  onClick={() => onAdd(f.id)}
                >
                  {f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Chip for rows/columns fields — drag handle + label + remove. */
export function ZoneChip({
  field,
  onDragStartChip,
  onDragEndChip,
  onRemove,
  onMove,
  subline,
}: {
  field: PivotFieldDef;
  onDragStartChip: (e: React.DragEvent) => void;
  onDragEndChip: () => void;
  onRemove: () => void;
  /** Keyboard movement within the zone. */
  onMove?: (direction: -1 | 1) => void;
  subline?: React.ReactNode;
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (!onMove) return;
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          onMove(-1);
        } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          onMove(1);
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          onRemove();
        }
      }}
      tabIndex={0}
      role="listitem"
      aria-label={`${field.label} chip. Arrow keys reorder, Delete removes.`}
      className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border/60 bg-background/80 px-2 py-1 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <span
        draggable
        onDragStart={onDragStartChip}
        onDragEnd={onDragEndChip}
        data-tip="Drag to reorder or move to another zone"
        className="cursor-grab rounded p-0.5 text-muted-foreground hover:bg-accent active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <TypeBadge kind={fieldKindOf(field)} />
          <span className="truncate text-xs font-semibold" data-tip={field.label} data-tip-truncate>
            {field.label}
          </span>
        </span>
        {subline}
      </span>
      <button
        type="button"
        data-tip="Remove field"
        aria-label={`Remove ${field.label}`}
        onClick={onRemove}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

/** Aggregation picker shown inside a value chip. */
export function AggPicker({
  value,
  options,
  onChange,
}: {
  value: AggregateKind;
  options: AggregateKind[];
  onChange: (agg: AggregateKind) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AggregateKind)}>
      <SelectTrigger
        className="mt-0.5 h-6 w-full border-none bg-transparent px-0 text-[11px] text-muted-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        data-tip="Choose the calculation"
        aria-label="Aggregation"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((agg) => (
          <SelectItem key={agg} value={agg} className="text-xs">
            {AGG_LABELS[agg]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Small "empty zone" placeholder with a clear icon. */
export function ZonePlaceholder({ hint }: { hint: string }) {
  return (
    <div className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 bg-muted/20 px-2 py-3 text-center">
      <Inbox className="size-4 text-muted-foreground/60" />
      <p className="text-xs text-muted-foreground">{hint}</p>
      <p className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
        <ArrowUp className="size-2.5" /> arrow keys reorder a focused chip
        <DropdownMenuSeparator className="mx-1 hidden" />
        <DropdownMenuLabel className="hidden" />
        <ArrowDown className="size-2.5" />
      </p>
    </div>
  );
}
