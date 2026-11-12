import { CalendarDays, X } from "lucide-react";
import { DateInput } from "@/components/DateInput";
import { cn } from "@/lib/utils";

/** From/To date-range filter used in the shared FilterBar. Values are ISO
 *  date strings ("yyyy-mm-dd"), so an empty From = unbounded start and an
 *  empty To = unbounded end. ISO dates compare lexicographically, so
 *  checking a row's ISO date against the range needs no parsing. */
export function DateRangeFilter({
  label,
  from,
  to,
  onFrom,
  onTo,
  className,
}: {
  label: string;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  className?: string;
}) {
  const active = !!from || !!to;
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "border-primary/50 bg-primary/5"
          : "border-input bg-background",
        className,
      )}
    >
      <CalendarDays
        className={cn(
          "size-3.5 shrink-0",
          active ? "text-primary" : "text-muted-foreground",
        )}
      />
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <DateInput
        id={`range-${label.replace(/\s+/g, "-").toLowerCase()}-from`}
        label={`${label} from`}
        value={from}
        onChange={onFrom}
        emptyLabel="From"
        compact
        bare
        hideChange
        hideIcon
        className="w-[7rem]"
      />
      <span className="text-xs text-muted-foreground">–</span>
      <DateInput
        id={`range-${label.replace(/\s+/g, "-").toLowerCase()}-to`}
        label={`${label} to`}
        value={to}
        onChange={onTo}
        emptyLabel="To"
        compact
        bare
        hideChange
        hideIcon
        className="w-[7rem]"
      />
      {active && (
        <button
          type="button"
          onClick={() => {
            onFrom("");
            onTo("");
          }}
          data-tip={`Clear ${label} range`}
          aria-label={`Clear ${label} range`}
          className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** Range match on ISO date strings — empty bounds are open. */
export function isoInRange(value: string | null | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  const v = value ?? "";
  if (!v) return false; // a bounded range excludes rows without a date
  if (from && v < from) return false;
  if (to && v > to) return false;
  return true;
}
