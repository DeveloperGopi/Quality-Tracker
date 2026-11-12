import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, TriangleAlert, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PivotFieldDef } from "@/lib/pivot";

/** Visual identity per field type — text (T), number (#), date (calendar),
 *  status/category (tag). One shared map so list, chips and exports agree. */
export const TYPE_META = {
  text: { icon: "T", label: "Text", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  number: { icon: "#", label: "Number", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  date: { icon: "📅", label: "Date", cls: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  status: { icon: "◉", label: "Status", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
} as const;

/** Fields rendered with the category/status tag icon + colour chips. */
export const STATUS_FIELD_IDS = new Set([
  "pipelineStatus", "certStatus", "saStatus", "genDoc",
  "buildingStatus", "nocStatus", "eligibility", "recertStatus", "cycleType",
]);

export type FieldKind = keyof typeof TYPE_META;

export function fieldKindOf(field: PivotFieldDef): FieldKind {
  if (field.type === "number") return "number";
  if (field.type === "date") return "date";
  if (STATUS_FIELD_IDS.has(field.id)) return "status";
  return "text";
}

export function TypeBadge({ kind, className }: { kind: FieldKind; className?: string }) {
  const meta = TYPE_META[kind];
  return (
    <span
      aria-label={meta.label}
      data-tip={meta.label}
      className={cn(
        "inline-flex size-5 items-center justify-center rounded px-1 text-[10px] font-bold leading-none",
        meta.cls,
        className,
      )}
    >
      {meta.icon}
    </span>
  );
}

/** Highlight the search substring inside a label. */
function Highlight({ text, q }: { text: string; q: string }) {
  const query = q.trim().toLowerCase();
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-amber-300/60 px-0.5 text-inherit dark:bg-amber-400/40">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function FieldList({
  fields,
  zoneOfField,
  onAdd,
  onDragStartField,
  draggingActive,
  totalRows,
  blankCounts,
  recent,
}: {
  fields: PivotFieldDef[];
  zoneOfField: (fieldId: string) => string | null;
  onAdd: (fieldId: string) => void;
  /** Native-DragStart sieve from the page (drag item plumbing). */
  onDragStartField: (fieldId: string, e: React.DragEvent) => void;
  draggingActive: boolean;
  totalRows: number;
  blankCounts: Record<string, number>;
  /** Field ids used recently, newest first. */
  recent: string[];
}) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<FieldKind | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { groups, recentFields, inReport } = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Deprecated fixed-quarter IA fields stay resolvable for saved reports,
    // but disappear from the picker until the report already uses them.
    const available = fields.filter(
      (f) =>
        (!LEGACY_IA_FIELDS.has(f.id) || zoneOfField(f.id) !== null) &&
        (!kindFilter || fieldKindOf(f) === kindFilter),
    );
    const matches = q
      ? available.filter(
          (f) =>
            f.label.toLowerCase().includes(q) ||
            f.group.toLowerCase().includes(q) ||
            (f.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
        )
      : available;
    const byId = new Map(available.map((f) => [f.id, f]));
    const recents = recent
      .map((id) => byId.get(id))
      .filter((f): f is PivotFieldDef => !!f && (!q || matches.includes(f)))
      .slice(0, 5);
    const map = new Map<string, PivotFieldDef[]>();
    for (const f of matches) {
      const list = map.get(f.group);
      if (list) list.push(f);
      else map.set(f.group, [f]);
    }
    const used = available.filter((f) => zoneOfField(f.id) !== null);
    return { groups: [...map.entries()], recentFields: recents, inReport: used };
  }, [fields, query, recent, zoneOfField, kindFilter]);

  const allCollapsed = collapsedGroups.size >= groups.length && groups.length > 0;
  const toggleGroup = (group: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  const toggleAll = () =>
    setCollapsedGroups(allCollapsed ? new Set() : new Set(groups.map(([g]) => g)));

  const renderItem = (field: PivotFieldDef) => {
    const kind = fieldKindOf(field);
    const used = zoneOfField(field.id);
    const blanks = blankCounts[field.id] ?? 0;
    /** >40% of facilities hold no value for this field — a data-quality
     *  warning, shown as a LABELLED percentage badge (never an unexplained
     *  icon) with a tooltip that states the exact reason. */
    const blanksPct = totalRows > 0 ? Math.round((blanks / totalRows) * 100) : 0;
    const blanksReason =
      totalRows > 0 && blanksPct > 40
        ? `${blanks} of ${totalRows} facilities (${blanksPct}%) have no value for this field — those rows appear as “(blank)” in the report.`
        : null;
    return (
      <div
        key={field.id}
        draggable
        onDragStart={(e) => onDragStartField(field.id, e)}
        role="button"
        tabIndex={0}
        aria-label={`Add field ${field.label}`}
        onClick={() => onAdd(field.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onAdd(field.id);
          }
        }}
        data-tip={`${TYPE_META[kind].label} field · ${field.label}${field.hint ? ` — ${field.hint}` : ""}`}
        className={cn(
          "group flex min-h-11 cursor-grab items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm transition-colors hover:border-border/60 hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
          draggingActive === true && "active:cursor-grabbing",
        )}
      >
        <TypeBadge kind={kind} />
        <span
          className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug break-words"
          data-tip={`${field.label}${field.hint ? ` — ${field.hint}` : ""}`}
        >
          <Highlight text={field.label} q={query} />
        </span>
        {blanksReason && (
          <span
            aria-label={`Data quality: ${blanksPct}% of facilities are blank for this field`}
            data-tip={blanksReason}
            className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300/70 bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100"
          >
            <TriangleAlert className="size-3" aria-hidden />
            {blanksPct}% blank
          </span>
        )}
        {used ? (
          <Badge variant="secondary" className="shrink-0 text-[9px] uppercase">
            {used}
          </Badge>
        ) : null}
      </div>
    );
  };

  return (
    <div aria-label="Available fields">
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fields…"
          aria-label="Search fields"
          className="h-10 pl-8 text-sm"
        />
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-1 px-1 text-[11px] text-muted-foreground">
        <span className="flex flex-wrap items-center gap-1">
          {(Object.keys(TYPE_META) as FieldKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={kindFilter === kind}
              onClick={() => setKindFilter((k) => (k === kind ? null : kind))}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5",
                kindFilter === kind
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/50 hover:bg-accent",
              )}
            >
              <TypeBadge kind={kind} /> {TYPE_META[kind].label}
            </button>
          ))}
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="ml-1 inline-flex items-center gap-1 whitespace-nowrap rounded px-1 py-0.5 font-medium hover:bg-accent hover:text-foreground"
        >
          {allCollapsed ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronUp className="size-3" />
          )}
          {allCollapsed ? "Expand all" : "Collapse all"}
        </button>
      </div>

      <div className="max-h-[54vh] space-y-1 overflow-y-auto pr-1 lg:max-h-none">
        {inReport.length > 0 && !query && (
          <div className="mb-2 rounded-lg border border-border/50 bg-muted/30 p-1">
            <p className="px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              In this report
            </p>
            {inReport.map(renderItem)}
          </div>
        )}
        {recentFields.length > 0 && (
          <div className="mb-2">
            <p className="px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recently used
            </p>
            {recentFields.map(renderItem)}
          </div>
        )}
        {groups.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No field matches “{query}”.
          </p>
        )}
        {groups.map(([group, list]) => (
          <div key={group} className="mb-1">
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              aria-expanded={!collapsedGroups.has(group)}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent/50"
            >
              {group}
              <span className="flex items-center gap-1">
                <span className="tabular-nums opacity-60">{list.length}</span>
                {collapsedGroups.has(group) ? (
                  <ChevronRightSmall />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </span>
            </button>
            {!collapsedGroups.has(group) && (
              <div className="space-y-0.5">{list.map(renderItem)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Fixed-quarter IA columns replaced by the long-format IA dataset. */
const LEGACY_IA_FIELDS = new Set([
  "nqasIaQ1",
  "nqasIaQ2",
  "nqasIaDelta",
  "kayakalpIaQ1",
  "kayakalpIaQ2",
  "kayakalpIaDelta",
]);

const ChevronRightSmall = () => (
  <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden>
    <path
      d="M5 3.5 8.5 7 5 10.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
