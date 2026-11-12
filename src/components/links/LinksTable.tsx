import {
  ArrowDown,
  ArrowUp,
  Copy,
  Ellipsis,
  ExternalLink,
  GripVertical,
  History,
  Pencil,
  Trash2,
} from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";

import { Highlight } from "@/components/CommandPalette";
import {
  CategoryChip,
  DueChip,
  LinkChip,
  PinStar,
  StatusPill,
  UpdatedCell,
} from "@/components/links/LinkPieces";
import type { LinkCategory, LinkItem, LinkOwner } from "@/components/links/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  StickyTableScroll,
} from "@/components/ui/table";
import {
  frequencyLabel,
  type LinkTableColumn,
  type LinksConfig,
} from "@/lib/links";
import { cn } from "@/lib/utils";

export type LinkSortKey =
  | "serial"
  | "category"
  | "title"
  | "frequency"
  | "lastUpdated"
  | "nextDue"
  | "owner"
  | "status";

export type LinkRowAction =
  | "edit"
  | "copy"
  | "mark"
  | "duplicate"
  | "archive"
  | "history"
  | "delete"
  | "roll-forward";

export type LinkPatchField =
  | "category"
  | "owner"
  | "frequency"
  | "status"
  | "remarks"
  | "lastUpdated";

function rem(value: string): number {
  return Number.parseFloat(value) || 0;
}

function frozenLeft(columns: LinkTableColumn[], index: number): string | undefined {
  let left = 0;
  for (let i = 0; i < index; i += 1) {
    const column = columns[i];
    if (!column.frozen) continue;
    left += rem(column.width);
  }
  return `${left}rem`;
}

export function LinksTable({
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
  onToggleSelect,
}: {
  items: LinkItem[];
  columns: LinkTableColumn[];
  config: LinksConfig;
  today: string;
  canEdit: boolean;
  isAdmin: boolean;
  query: string;
  sortKey: LinkSortKey | null;
  sortDir: "asc" | "desc";
  onSort: (key: LinkSortKey) => void;
  groupBy: boolean;
  collapsed: Set<string>;
  onToggleGroup: (category: string) => void;
  onOpen: (item: LinkItem, edit?: boolean) => void;
  onMark: (item: LinkItem) => void;
  onAction: (action: LinkRowAction, item: LinkItem) => void;
  onStatus: (item: LinkItem, status: string) => void;
  onPin: (item: LinkItem) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  categories: LinkCategory[];
  owners: LinkOwner[];
  onPatch: (item: LinkItem, field: LinkPatchField, value: string) => void;
  selectMode?: boolean;
  selected?: ReadonlySet<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const [dragged, setDragged] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const groups = groupBy
    ? Object.entries(
        items.reduce<Record<string, LinkItem[]>>((acc, item) => {
          (acc[item.categoryName] ??= []).push(item);
          return acc;
        }, {}),
      )
    : [["", items] as [string, LinkItem[]]];
  const order = useMemo(() => {
    const map = new Map<string, number>();
    let index = 0;
    for (const [, rows] of groups) for (const row of rows) map.set(row.id, ++index);
    return map;
  }, [groups]);
  const width = `${columns.reduce((sum, column) => sum + rem(column.width), 0)}rem`;

  return (
    <StickyTableScroll maxHeight="calc(100vh - 19.5rem)" className="bg-card/80">
      <Table
        className="table-fixed text-[13px]"
        style={{ minWidth: width }}
        aria-label="Links Organiser — table"
        data-testid="links-table"
      >
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={{ width: column.width }} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => {
              const active = sortKey === column.key;
              const sortable = !!column.sortable && column.key !== "report";
              return (
                <TableHead
                  key={column.key}
                  className={cn(
                    "h-10 px-2 text-[11px]",
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center",
                    column.frozen && "sticky z-20 bg-muted/95",
                    column.key === "report" && "shadow-[8px_0_10px_-10px_rgba(15,23,42,0.35)]",
                  )}
                  style={column.frozen ? { left: frozenLeft(columns, index) } : undefined}
                  aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() =>
                        onSort(
                          (column.key === "title" ? "title" : column.key) as LinkSortKey,
                        )
                      }
                      className="inline-flex items-center gap-1 font-semibold hover:text-primary"
                      data-tip={`Sort by ${column.label}`}
                    >
                      {column.label}
                      {active ? (
                        sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <span className="size-3" aria-hidden />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(([category, rows]) => {
            const isCollapsed = groupBy && collapsed.has(category);
            return (
              <Fragment key={category || "all"}>
                {groupBy && (
                  <TableRow className="h-10 border-y border-primary/15 bg-primary/[0.06] hover:bg-primary/[0.06]">
                    <TableCell
                      colSpan={columns.length}
                      className="sticky left-0 z-10 bg-[oklch(0.965_0.018_200)] px-3 py-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleGroup(category)}
                        aria-expanded={!isCollapsed}
                        className="flex items-center gap-2 text-left text-xs font-bold text-primary"
                      >
                        <span className={cn("inline-block transition-transform", isCollapsed && "-rotate-90")} aria-hidden>
                          ▾
                        </span>
                        {category}
                        <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {rows.length}
                        </span>
                      </button>
                    </TableCell>
                  </TableRow>
                )}
                {!isCollapsed &&
                  rows.map((item, rowIndex) => {
                    const primary =
                      item.urls.find((u) => u.kind !== "form" && u.isPrimary) ??
                      item.urls.find((u) => u.kind !== "form");
                    const form = item.urls.find((u) => u.kind === "form");
                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          "group/link h-[58px] border-border/50",
                          rowIndex % 2 === 1 && "bg-muted/[0.18]",
                          dragged === item.id && "opacity-50",
                          dragOver === item.id && "outline outline-2 -outline-offset-2 outline-primary/40",
                        )}
                        draggable={canEdit && !sortKey}
                        onDragStart={(event) => {
                          setDragged(item.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/link-id", item.id);
                        }}
                        onDragOver={(event) => {
                          if (!dragged || dragged === item.id) return;
                          event.preventDefault();
                          setDragOver(item.id);
                        }}
                        onDragLeave={() => setDragOver((id) => (id === item.id ? null : id))}
                        onDrop={(event) => {
                          event.preventDefault();
                          const from = event.dataTransfer.getData("text/link-id") || dragged;
                          if (from && from !== item.id) onReorder(from, item.id);
                          setDragged(null);
                          setDragOver(null);
                        }}
                        onDragEnd={() => {
                          setDragged(null);
                          setDragOver(null);
                        }}
                        data-testid={`link-row-${item.id}`}
                      >
                        {columns.map((column, columnIndex) => {
                          const sticky = column.frozen;
                          const stickyClass = sticky
                            ? "sticky z-10 bg-inherit shadow-[inset_-1px_0_0_var(--border)]"
                            : "";
                          const style = sticky ? { left: frozenLeft(columns, columnIndex) } : undefined;
                          switch (column.key) {
                            case "serial":
                              return (
                                <TableCell
                                  key={column.key}
                                  className={cn(stickyClass, "px-1 text-center tabular-nums text-muted-foreground")}
                                  style={style}
                                >
                                  <span className="flex items-center justify-center gap-0.5">
                                    {canEdit && !sortKey && (
                                      <GripVertical className="size-3 cursor-grab text-muted-foreground/40" aria-label="Drag to reorder" />
                                    )}
                                    {order.get(item.id)}
                                    <span className="sr-only">Ref {item.serial}</span>
                                  </span>
                                </TableCell>
                              );
                            case "report":
                            case "title":
                              return (
                                <TableCell key={column.key} className={cn(stickyClass, "px-2")} style={style}>
                                  <div className="flex items-start gap-1.5">
                                    {selectMode && (
                                      <input
                                        type="checkbox"
                                        aria-label={`Select ${item.title}`}
                                        checked={selected?.has(item.id) ?? false}
                                        onChange={() => onToggleSelect?.(item.id)}
                                        className="mt-1 size-3.5 shrink-0 accent-[var(--primary)]"
                                      />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                          {order.get(item.id)}.
                                        </span>
                                        <a
                                          href={primary?.url ?? "#"}
                                          target={primary ? "_blank" : undefined}
                                          rel="noopener noreferrer"
                                          onClick={(event) => {
                                            if (event.ctrlKey || event.metaKey || event.shiftKey) return;
                                            event.preventDefault();
                                            onOpen(item);
                                          }}
                                          className="block min-w-0 truncate text-[13px] font-bold text-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                          data-tip={`Sheet Ref ${item.serial}${primary ? ` · Open ${primary.label}` : ""}`}
                                        >
                                          <Highlight text={item.title} query={query} />
                                        </a>
                                      </div>
                                      <div className="mt-0.5 flex min-w-0 items-center gap-1">
                                        <InlineCategory
                                          item={item}
                                          categories={categories}
                                          canEdit={canEdit}
                                          onPatch={onPatch}
                                        />
                                        {!item.ownerName && (
                                          <span className="rounded border border-amber-300/70 bg-amber-50 px-1 text-[9px] font-semibold text-amber-900">
                                            Needs details
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <PinStar pinned={item.pinned} canEdit={canEdit} onToggle={() => onPin(item)} />
                                  </div>
                                </TableCell>
                              );
                            case "category":
                              return (
                                <TableCell key={column.key} className={cn(stickyClass, "px-2")} style={style}>
                                  <InlineCategory item={item} categories={categories} canEdit={canEdit} onPatch={onPatch} />
                                </TableCell>
                              );
                            case "links":
                              return (
                                <TableCell key={column.key} className="px-2">
                                  <div className="flex max-w-[14rem] flex-wrap gap-1">
                                    {item.urls.slice(0, 2).map((url) => (
                                      <LinkChip key={url.id} link={url} />
                                    ))}
                                    {item.urls.length > 2 && (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button
                                            type="button"
                                            className="inline-flex h-7 items-center rounded-md border border-border/60 bg-background px-1.5 text-[10px] font-semibold text-primary hover:bg-primary/10"
                                            aria-label={`${item.urls.length - 2} more links`}
                                          >
                                            +{item.urls.length - 2}
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent align="start" className="w-80 space-y-1.5 p-2">
                                          <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            All links
                                          </p>
                                          {item.urls.map((url) => (
                                            <LinkChip key={url.id} link={url} className="w-full" />
                                          ))}
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                    {!item.urls.length && <span className="text-[11px] text-muted-foreground">-</span>}
                                  </div>
                                </TableCell>
                              );
                            case "schedule":
                              return (
                                <TableCell key={column.key} className="px-2">
                                  <div className="flex flex-col gap-0.5">
                                    <InlineFrequency
                                      item={item}
                                      config={config}
                                      canEdit={canEdit}
                                      onPatch={onPatch}
                                    />
                                    <UpdatedCell
                                      iso={item.lastUpdated}
                                      today={today}
                                      canEdit={canEdit}
                                      onMark={() => onMark(item)}
                                    />
                                    <DueChip due={item.due} config={config} />
                                  </div>
                                </TableCell>
                              );
                            case "frequency":
                              return (
                                <TableCell key={column.key} className="px-2 text-[12px]">
                                  <InlineFrequency item={item} config={config} canEdit={canEdit} onPatch={onPatch} />
                                </TableCell>
                              );
                            case "lastUpdated":
                              return (
                                <TableCell key={column.key} className="px-2">
                                  <InlineDate item={item} canEdit={canEdit} onPatch={onPatch} />
                                </TableCell>
                              );
                            case "nextDue":
                              return (
                                <TableCell key={column.key} className="px-2">
                                  <DueChip due={item.due} config={config} />
                                </TableCell>
                              );
                            case "form":
                              return (
                                <TableCell key={column.key} className="px-2">
                                  {form ? <LinkChip link={form} /> : <span className="text-muted-foreground">-</span>}
                                </TableCell>
                              );
                            case "owner":
                              return (
                                <TableCell key={column.key} className="px-2">
                                  <InlineOwner item={item} owners={owners} canEdit={canEdit} onPatch={onPatch} />
                                </TableCell>
                              );
                            case "status":
                              return (
                                <TableCell key={column.key} className="px-2" onClick={(event) => event.stopPropagation()}>
                                  {canEdit ? (
                                    <InlineStatus
                                      item={item}
                                      config={config}
                                      onStatus={(status) => onStatus(item, status)}
                                    />
                                  ) : (
                                    <StatusPill status={item.status} config={config} />
                                  )}
                                </TableCell>
                              );
                            case "remarks":
                              return (
                                <TableCell key={column.key} className="px-2">
                                  <InlineRemarks item={item} canEdit={canEdit} onPatch={onPatch} />
                                </TableCell>
                              );
                            case "actions":
                              return (
                                <TableCell
                                  key={column.key}
                                  className="px-1 text-right"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <div className="flex items-center justify-end gap-0.5">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="size-8"
                                          aria-label={`Actions for ${item.title}`}
                                        >
                                          <Ellipsis className="size-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuLabel className="truncate">{item.title}</DropdownMenuLabel>
                                        <DropdownMenuItem asChild disabled={!primary}>
                                          <a href={primary?.url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="mr-1.5 size-3.5" /> Open primary
                                          </a>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onAction("copy", item)} disabled={!primary}>
                                          <Copy className="mr-1.5 size-3.5" /> Copy link
                                        </DropdownMenuItem>
                                        {canEdit && (
                                          <DropdownMenuItem onClick={() => onOpen(item, true)}>
                                            <Pencil className="mr-1.5 size-3.5" /> Edit
                                          </DropdownMenuItem>
                                        )}
                                        {canEdit && (
                                          <DropdownMenuItem onClick={() => onMark(item)}>
                                            <History className="mr-1.5 size-3.5" /> Mark updated
                                          </DropdownMenuItem>
                                        )}
                                        {canEdit && (
                                          <DropdownMenuItem onClick={() => onAction("duplicate", item)}>
                                            <Copy className="mr-1.5 size-3.5" /> Duplicate
                                          </DropdownMenuItem>
                                        )}
                                        {canEdit && (
                                          <DropdownMenuItem onClick={() => onAction("roll-forward", item)}>
                                            <History className="mr-1.5 size-3.5" /> Roll forward
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        {canEdit && (
                                          <DropdownMenuItem onClick={() => onAction("archive", item)}>
                                            <Trash2 className="mr-1.5 size-3.5" /> Archive
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => onOpen(item)}>
                                          <History className="mr-1.5 size-3.5" /> History
                                        </DropdownMenuItem>
                                        {isAdmin && (
                                          <DropdownMenuItem className="text-destructive" onClick={() => onAction("delete", item)}>
                                            <Trash2 className="mr-1.5 size-3.5" /> Delete permanently
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </TableCell>
                              );
                            default:
                              return <TableCell key={column.key} />;
                          }
                        })}
                      </TableRow>
                    );
                  })}
              </Fragment>
            );
          })}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-32 text-center text-sm text-muted-foreground">
                No links match these filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </StickyTableScroll>
  );
}

/* -------------------------------------------------------------------------- */
/* Inline cells                                                               */
/* -------------------------------------------------------------------------- */

function InlineCategory({
  item,
  categories,
  canEdit,
  onPatch,
}: {
  item: LinkItem;
  categories: LinkCategory[];
  canEdit: boolean;
  onPatch: (item: LinkItem, field: LinkPatchField, value: string) => void;
}) {
  if (!canEdit) return <CategoryChip name={item.categoryName} colour={item.categoryColour} />;
  return (
    <InlineSelect
      label={`Category for ${item.title}`}
      display={<CategoryChip name={item.categoryName} colour={item.categoryColour} />}
      value={item.categoryId}
      options={categories.filter((category) => category.active).map((category) => ({
        value: category.id,
        label: category.name,
      }))}
      onSave={(value) => onPatch(item, "category", value)}
    />
  );
}

function InlineOwner({
  item,
  owners,
  canEdit,
  onPatch,
}: {
  item: LinkItem;
  owners: LinkOwner[];
  canEdit: boolean;
  onPatch: (item: LinkItem, field: LinkPatchField, value: string) => void;
}) {
  const display = (
    <span className="block min-w-0">
      <span className="block truncate text-[12px]">{item.ownerName ?? "No owner"}</span>
      {item.level && (
        <span className="mt-0.5 inline-block rounded border border-border/60 bg-muted/30 px-1 text-[9px] text-muted-foreground">
          {item.level}
        </span>
      )}
      {!item.ownerName && (
        <span className="mt-0.5 block text-[9px] font-semibold text-amber-800">Needs details</span>
      )}
    </span>
  );
  if (!canEdit) return display;
  return (
    <InlineSelect
      label={`Owner for ${item.title}`}
      display={display}
      value={item.ownerId ?? ""}
      options={[
        { value: "", label: "No owner" },
        ...owners.filter((owner) => owner.active).map((owner) => ({ value: owner.id, label: owner.name })),
      ]}
      onSave={(value) => onPatch(item, "owner", value)}
    />
  );
}

function InlineFrequency({
  item,
  config,
  canEdit,
  onPatch,
}: {
  item: LinkItem;
  config: LinksConfig;
  canEdit: boolean;
  onPatch: (item: LinkItem, field: LinkPatchField, value: string) => void;
}) {
  const display = <span className="text-[11px] text-muted-foreground">{frequencyLabel(config, item.frequency)}</span>;
  if (!canEdit) return display;
  return (
    <InlineSelect
      label={`Frequency for ${item.title}`}
      display={display}
      value={item.frequency}
      options={config.frequencies.map((frequency) => ({ value: frequency.value, label: frequency.label }))}
      onSave={(value) => onPatch(item, "frequency", value)}
    />
  );
}

function InlineDate({
  item,
  canEdit,
  onPatch,
}: {
  item: LinkItem;
  canEdit: boolean;
  onPatch: (item: LinkItem, field: LinkPatchField, value: string) => void;
}) {
  if (!canEdit) return <UpdatedCell iso={item.lastUpdated} today={todayIso()} />;
  return (
    <InlineInput
      label={`Last updated for ${item.title}`}
      type="date"
      value={item.lastUpdated ?? ""}
      display={<UpdatedCell iso={item.lastUpdated} today={todayIso()} />}
      onSave={(value) => onPatch(item, "lastUpdated", value)}
    />
  );
}

function InlineRemarks({
  item,
  canEdit,
  onPatch,
}: {
  item: LinkItem;
  canEdit: boolean;
  onPatch: (item: LinkItem, field: LinkPatchField, value: string) => void;
}) {
  const display = (
    <span className="line-clamp-2 max-w-[12rem] whitespace-normal text-[11px] text-muted-foreground" data-tip={item.remarks ?? undefined}>
      {item.remarks || "-"}
    </span>
  );
  if (!canEdit) return display;
  return (
    <InlineInput
      label={`Remarks for ${item.title}`}
      value={item.remarks ?? ""}
      placeholder="Add a remark"
      display={display}
      onSave={(value) => onPatch(item, "remarks", value)}
    />
  );
}

function InlineStatus({
  item,
  config,
  onStatus,
}: {
  item: LinkItem;
  config: LinksConfig;
  onStatus: (status: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Change status of ${item.title}`}
          className="rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <StatusPill status={item.status} config={config} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel>Set status</DropdownMenuLabel>
        {config.statuses.map((status) => (
          <DropdownMenuItem key={status.name} onClick={() => onStatus(status.name)}>
            <StatusPill status={status.name} config={config} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InlineSelect({
  display,
  value,
  options,
  label,
  onSave,
}: {
  display: ReactNode;
  value: string;
  options: { value: string; label: string }[];
  label: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  return editing ? (
    <select
      autoFocus
      aria-label={label}
      value={value}
      className="h-8 w-full min-w-0 rounded border border-ring bg-background px-1 text-[12px]"
      onChange={(event) => {
        setEditing(false);
        if (event.target.value !== value) onSave(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setEditing(false);
      }}
      onBlur={() => setEditing(false)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ) : (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setEditing(true);
      }}
      className="block w-full min-w-0 rounded text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      data-tip="Click to edit"
    >
      {display}
    </button>
  );
}

function InlineInput({
  display,
  value,
  label,
  type = "text",
  placeholder,
  onSave,
}: {
  display: ReactNode;
  value: string;
  label: string;
  type?: string;
  placeholder?: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  return editing ? (
    <input
      autoFocus
      aria-label={label}
      type={type}
      value={draft}
      placeholder={placeholder}
      className="h-8 w-full min-w-0 rounded border border-ring bg-background px-1.5 text-[12px]"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft !== value) onSave(draft);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
        if (event.key === "Enter") {
          event.preventDefault();
          setEditing(false);
          if (draft !== value) onSave(draft);
        }
      }}
    />
  ) : (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setDraft(value);
        setEditing(true);
      }}
      className="block w-full min-w-0 rounded text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      data-tip="Click to edit · Enter saves · Tab moves on"
    >
      {display}
    </button>
  );
}

function todayIso(): string {
  return new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

export function linkCardPrimary(item: LinkItem) {
  return item.urls.find((u) => u.kind !== "form" && u.isPrimary) ?? item.urls.find((u) => u.kind !== "form");
}

export function LinkCard({
  item,
  config,
  today,
  canEdit,
  onOpen,
  onMark,
  onPin,
}: {
  item: LinkItem;
  config: LinksConfig;
  today: string;
  canEdit: boolean;
  onOpen: () => void;
  onMark: () => void;
  onPin?: () => void;
}) {
  const primary = linkCardPrimary(item);
  return (
    <article className="flex h-full min-h-[15rem] flex-col rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-1.5">
        <CategoryChip name={item.categoryName} colour={item.categoryColour} />
        <span className="ml-auto"><StatusPill status={item.status} config={config} /></span>
        <PinStar pinned={item.pinned} canEdit={canEdit} onToggle={onPin} />
      </div>
      <button type="button" onClick={onOpen} className="mt-2 text-left text-[13px] font-bold leading-snug text-foreground hover:text-primary">
        {item.title}
      </button>
      {item.description && <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{item.description}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <DueChip due={item.due} config={config} />
        <span className="text-[10px] text-muted-foreground">{frequencyLabel(config, item.frequency)}</span>
      </div>
      <div className="mt-2 space-y-1">
        {item.urls.slice(0, 3).map((url) => <LinkChip key={url.id} link={url} compact />)}
        {item.urls.length > 3 && <span className="text-[10px] text-muted-foreground">+{item.urls.length - 3} more links</span>}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[10px] text-muted-foreground">
        <span>{item.ownerName ?? "-"}{item.level ? ` · ${item.level}` : ""}</span>
        <span>Updated {item.lastUpdated ? formatShort(item.lastUpdated) : "-"}</span>
      </div>
      {item.remarks && <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">{item.remarks}</p>}
      <div className="mt-2 flex gap-1 border-t border-border/40 pt-2">
        <Button size="sm" variant="outline" className="h-9 flex-1" onClick={onOpen}>Open</Button>
        {canEdit && <Button size="sm" variant="ghost" className="h-9" onClick={onMark}>Mark updated</Button>}
      </div>
    </article>
  );
}

function formatShort(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}-${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]}-${y}`;
}
