import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const ROW_VIEW_OPTIONS = ["10", "20", "50", "100", "all"] as const;
export type RowViewOption = (typeof ROW_VIEW_OPTIONS)[number];

export const ROW_VIEW_LABELS: Record<RowViewOption, string> = {
  "10": "10 rows",
  "20": "20 rows",
  "50": "50 rows",
  "100": "100 rows",
  all: "Full List",
};

export function defaultRowView(): RowViewOption {
  return "10";
}

const STORAGE_KEY = "nqas.rowView";

/** The row-view choice is shared across every data table in the app and
 *  survives page navigation via localStorage (same session + future visits). */
export function loadRowView(): RowViewOption {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && (ROW_VIEW_OPTIONS as readonly string[]).includes(v))
      return v as RowViewOption;
  } catch {
    /* storage unavailable */
  }
  return "10"; // default view: 10 rows
}

export function saveRowView(v: RowViewOption) {
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* storage unavailable */
  }
}

/** Dropdown labeled "Row View" shown above data tables. */
export function RowViewSelect({
  value,
  onChange,
}: {
  value: RowViewOption;
  onChange: (v: RowViewOption) => void;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
        Row View
      </span>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as RowViewOption)}
      >
        <SelectTrigger className="glass-input h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROW_VIEW_OPTIONS.map((o) => (
            <SelectItem key={o} value={o}>
              {ROW_VIEW_LABELS[o]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Slice `rows` to the active page — pagination happens here, not in
 *  applyRowView, so callers never double-slice. */
export function paginate<T>(rows: T[], view: RowViewOption, page: number): T[] {
  if (view === "all") return rows;
  const per = Number(view);
  if (!Number.isFinite(per) || per <= 0) return rows;
  const start = (page - 1) * per;
  return rows.slice(start, start + per);
}

export function pageCount(total: number, view: RowViewOption): number {
  if (view === "all") return 1;
  const per = Number(view);
  if (!Number.isFinite(per) || per <= 0) return 1;
  return Math.max(1, Math.ceil(total / per));
}

/** Compact pagination bar: Previous · page numbers · Next, plus the
 *  "Showing X–Y of N records" range. Page numbers window around the current
 *  page on large counts so the bar stays responsive on mobile. */
export function PaginationBar({
  total,
  view,
  page,
  onPage,
}: {
  total: number;
  view: RowViewOption;
  page: number;
  onPage: (p: number) => void;
}) {
  if (view === "all" || total === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Showing {total === 0 ? 0 : `1–${total}`} of {total}{" "}
        {total === 1 ? "record" : "records"}
      </p>
    );
  }
  const per = Number(view);
  const pages = pageCount(total, view);
  const from = (page - 1) * per + 1;
  const to = Math.min(total, page * per);

  // window page numbers: show up to 7, centered on the current page
  const nums: number[] = [];
  const half = 3;
  const start = Math.max(1, Math.min(page - half, pages - 2 * half));
  const end = Math.min(pages, start + 2 * half);
  for (let i = start; i <= end; i++) nums.push(i);

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        Showing {from}–{to} of {total} {total === 1 ? "record" : "records"}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft className="size-3.5" />
            Previous
          </Button>
          {nums[0] > 1 && (
            <>
              <PageBtn n={1} page={page} onPage={onPage} />
              {nums[0] > 2 && <span className="px-0.5 text-xs text-muted-foreground">…</span>}
            </>
          )}
          {nums.map((n) => (
            <PageBtn key={n} n={n} page={page} onPage={onPage} />
          ))}
          {nums[nums.length - 1] < pages && (
            <>
              {nums[nums.length - 1] < pages - 1 && (
                <span className="px-0.5 text-xs text-muted-foreground">…</span>
              )}
              <PageBtn n={pages} page={page} onPage={onPage} />
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            Next
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function PageBtn({
  n,
  page,
  onPage,
}: {
  n: number;
  page: number;
  onPage: (p: number) => void;
}) {
  const active = n === page;
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      className={`h-7 min-w-7 px-2 text-xs ${active ? "pointer-events-none" : ""}`}
      onClick={() => onPage(n)}
    >
      {n}
    </Button>
  );
}

/** Hook wiring a full table pagination state: row view (persisted) + page,
 *  resetting to page 1 whenever the row count/limit/filters change. */
export function usePagination<T>(
  rows: T[],
  deps: unknown[] = [],
): {
  view: RowViewOption;
  setView: (v: RowViewOption) => void;
  page: number;
  setPage: (p: number) => void;
  visible: T[];
  total: number;
} {
  const [view, setViewRaw] = useState<RowViewOption>(() => loadRowView());
  const [page, setPage] = useState(1);

  const total = rows.length;
  const pages = pageCount(total, view);

  // keep the page in range when filters shrink the list
  useEffect(() => {
    setPage((p) => Math.min(p, pages));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, ...deps]);

  const setView = (v: RowViewOption) => {
    setViewRaw(v);
    saveRowView(v);
    setPage(1); // changing the row count returns to page 1
  };

  return {
    view,
    setView,
    page,
    setPage,
    visible: paginate(rows, view, page),
    total,
  };
}

/** Back-compat helper — no longer slices (pagination does); kept so any
 *  remaining callers still compile. */
export function applyRowView<T>(rows: T[], _view: RowViewOption): T[] {
  return rows;
}
