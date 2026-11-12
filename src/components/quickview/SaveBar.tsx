/**
 * SAVE BAR — the one place a quick-view edit is committed.
 *
 *   • No changes: Save is disabled and labelled "No changes".
 *   • Changes:    "3 unsaved changes · Discard · Save changes" + "Save & next".
 *   • Blocking validation issues are listed first with click-to-focus; Save
 *     stays disabled until they are fixed (warnings do not block).
 *   • Saving shows "Saving…", then "Saved ✓ 10:32".
 *   • Keyboard: Ctrl/Cmd+S saves; the label teaches it.
 */

import { AlertTriangle, ArrowRight, Check, Loader2, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { QvChange, QvIssue } from "@/lib/facilityQuickView";

export function SaveBar({
  changes,
  issues,
  saving,
  savedLabel,
  dirty,
  onDiscard,
  onSave,
  onSaveAndNext,
  onReview,
  onFocusIssue,
  canSaveAndNext,
  fileChanges = 0,
  documentHint = null,
}: {
  changes: QvChange[];
  issues: QvIssue[];
  saving: boolean;
  savedLabel: string | null;
  dirty: boolean;
  /** Documents attached/cleared in this session — they count as changes even
   *  though they are not field diffs (the bar used to say "No changes"). */
  fileChanges?: number;
  onDiscard: () => void;
  onSave: () => void;
  onSaveAndNext: () => void;
  onReview: () => void;
  onFocusIssue: (field: string) => void;
  canSaveAndNext: boolean;
  /** A required document that BLOCKS saving (Admin → Documents). The bar names
   *  it and links straight to the ONE uploader — the same rule the Documents
   *  banner and the Overview card read. */
  documentHint?: { label: string; onOpen: () => void } | null;
}) {
  const blocking = issues.filter((i) => i.severity === "blocking");
  const warnings = issues.filter((i) => i.severity === "warning");
  const disabled = !dirty || blocking.length > 0 || saving;
  const changeCount = changes.length + fileChanges;

  return (
    <div className="space-y-1.5">
      {blocking.length > 0 && (
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1">
          <li className="flex items-center gap-1 text-[11px] font-semibold text-destructive">
            <AlertTriangle className="size-3.5" /> {blocking.length} blocking{" "}
            {blocking.length === 1 ? "issue" : "issues"}:
          </li>
          {blocking.map((issue) => (
            <li key={`${issue.field}-${issue.message}`}>
              <button
                type="button"
                onClick={() => onFocusIssue(issue.field)}
                className="text-[11px] font-medium text-destructive underline decoration-dotted underline-offset-2 hover:decoration-solid"
              >
                {issue.message}
              </button>
            </li>
          ))}
        </ul>
      )}
      {blocking.length === 0 && warnings.length > 0 && (
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-amber-300/60 bg-amber-50 px-2 py-1">
          <li className="flex items-center gap-1 text-[11px] font-semibold text-amber-800">
            <AlertTriangle className="size-3.5" /> {warnings.length} warning
            {warnings.length === 1 ? "" : "s"} (saving allowed):
          </li>
          {warnings.map((issue) => (
            <li key={`${issue.field}-${issue.message}`}>
              <button
                type="button"
                onClick={() => onFocusIssue(issue.field)}
                className="text-[11px] text-amber-900 underline decoration-dotted underline-offset-2"
              >
                {issue.message}
              </button>
            </li>
          ))}
        </ul>
      )}

      {documentHint && (
        <p
          className="flex flex-wrap items-center gap-1.5 rounded-md border border-amber-300/60 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900"
          data-testid="save-bar-document-hint"
        >
          <AlertTriangle className="size-3.5 shrink-0" />
          Upload {documentHint.label} to save
          <button
            type="button"
            onClick={documentHint.onOpen}
            className="font-semibold underline underline-offset-2"
          >
            Choose file
          </button>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {dirty && blocking.length > 0 && (
          <span className="text-[11px] font-medium text-destructive">
            Fix {blocking.length} error{blocking.length === 1 ? "" : "s"} first
          </span>
        )}
        {savedLabel && !dirty && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
            <Check className="size-3.5" /> {savedLabel}
          </span>
        )}
        {dirty && (
          <span className="text-xs text-muted-foreground" aria-live="polite">
            <b className="font-semibold text-foreground">{changeCount}</b> unsaved{" "}
            {changeCount === 1 ? "change" : "changes"}
            {fileChanges > 0 && (
              <span className="text-muted-foreground/80">
                {" "}({fileChanges} document{fileChanges === 1 ? "" : "s"})
              </span>
            )}
          </span>
        )}
        {dirty && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={onReview}
            disabled={changes.length === 0}
            data-tip={
              changes.length === 0
                ? "Only documents changed — press Save changes"
                : "Review every field before → after"
            }
          >
            Review changes
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={onDiscard}
          disabled={!dirty || saving}
        >
          <X className="mr-1 size-3.5" /> Discard
        </Button>
        <Button
          size="sm"
          className="h-9 min-w-[7.5rem]"
          onClick={onSave}
          disabled={disabled}
          data-tip={
            blocking.length
              ? `Fix ${blocking.length} blocking issue${blocking.length === 1 ? "" : "s"} first — click an issue above to jump to it`
              : "Save changes (Ctrl/Cmd+S)"
          }
        >
          {saving ? (
            <Loader2 className="mr-1 size-3.5 animate-spin" />
          ) : (
            <Save className="mr-1 size-3.5" />
          )}
          {saving ? "Saving…" : dirty ? "Save changes" : "No changes"}
        </Button>
        {canSaveAndNext && (
          <Button
            variant="secondary"
            size="sm"
            className={cn("h-9")}
            onClick={onSaveAndNext}
            disabled={disabled}
            data-tip="Save and move to the next facility in the filtered list"
          >
            Save &amp; next <ArrowRight className="ml-1 size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

/** Before → after list. Blocking issues are repeated at the top. */
export function ReviewChangesDialog({
  open,
  onOpenChange,
  changes,
  issues,
  statusNotice,
  onConfirm,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: QvChange[];
  issues: QvIssue[];
  statusNotice: { from: string; to: string } | null;
  onConfirm: () => void;
  saving: boolean;
}) {
  const blocking = issues.filter((i) => i.severity === "blocking");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Review changes</DialogTitle>
          <DialogDescription>
            {changes.length} field{changes.length === 1 ? "" : "s"} will be saved in one
            transaction, with one audit entry per field.
          </DialogDescription>
        </DialogHeader>

        {statusNotice && (
          <p className="rounded-lg border border-sky-300/60 bg-sky-50 px-3 py-2 text-sm text-sky-950">
            This will change Facility Current Status from{" "}
            <b>{statusNotice.from || "-"}</b> to <b>{statusNotice.to}</b>.
          </p>
        )}

        {blocking.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
            {blocking.map((i) => (
              <li key={i.field + i.message} className="flex items-start gap-1">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {i.message}
              </li>
            ))}
          </ul>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
              <th className="py-1.5 font-medium">Field</th>
              <th className="py-1.5 font-medium">Before</th>
              <th className="py-1.5 font-medium">After</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c) => (
              <tr key={c.field} className="border-b border-border/40 align-top">
                <td className="py-1.5 pr-2 font-medium">{c.label}</td>
                <td className="py-1.5 pr-2 text-muted-foreground line-through">{c.from}</td>
                <td className="py-1.5 font-semibold text-foreground">{c.to}</td>
              </tr>
            ))}
            {changes.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-muted-foreground">
                  No changes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back to editing
          </Button>
          <Button onClick={onConfirm} disabled={blocking.length > 0 || saving || changes.length === 0}>
            {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            Save {changes.length} change{changes.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
