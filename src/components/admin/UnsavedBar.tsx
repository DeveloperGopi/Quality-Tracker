// Sticky “unsaved changes” bar.
//
// Every settings panel now feeds ONE draft in the Admin page instead of
// showing its own faded Save button, so the page can always answer two
// questions at a glance: how many changes are pending, and what will happen to
// them. Sits above the mobile bottom navigation (bottom-20) and at the bottom
// on larger screens.

import { AlertTriangle, Check, Loader2, Save, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UnsavedBar({
  count,
  saving,
  error,
  onSave,
  onDiscard,
  labels,
  className,
}: {
  count: number;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onDiscard: () => void;
  /** Human names of the pending settings, e.g. ["Building Type", "Cycle timing"]. */
  labels: string[];
  className?: string;
}) {
  if (count === 0 && !error && !saving) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "sticky bottom-20 z-30 mt-6 md:bottom-4",
        className,
      )}
    >
      <div className="glass-strong flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 p-3 shadow-lg">
        {saving ? (
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Loader2 className="size-4 animate-spin" /> Saving {count} change
            {count === 1 ? "" : "s"}…
          </span>
        ) : (
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="flex size-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
              {count}
            </span>
            unsaved change{count === 1 ? "" : "s"}
          </span>
        )}

        {labels.length > 0 && !saving && (
          <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground sm:block">
            {labels.slice(0, 3).join(" · ")}
            {labels.length > 3 ? ` · +${labels.length - 3} more` : ""}
          </span>
        )}

        {error && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
            <AlertTriangle className="size-3.5" /> {error}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={onDiscard}
            disabled={saving}
          >
            <Undo2 className="mr-1.5 size-3.5" /> Discard
          </Button>
          <Button
            size="sm"
            className="h-9"
            onClick={onSave}
            disabled={saving || count === 0}
            data-guide-target="admin-save"
          >
            {saving ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : error ? (
              <Check className="mr-1.5 size-3.5" />
            ) : (
              <Save className="mr-1.5 size-3.5" />
            )}
            {error ? "Retry save" : "Save all"}
          </Button>
        </div>
      </div>
    </div>
  );
}
