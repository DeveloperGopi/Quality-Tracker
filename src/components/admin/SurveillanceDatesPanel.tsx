/**
 * DATA CHECKS → SURVEILLANCE DATES (Part H step 1).
 *
 * Lists every facility whose stored 1st/2nd Surveillance Assessment Done Date
 * cannot be a real visit (later than today, or exactly the due date), lets the
 * State Admin Keep / Clear / Set a new date per row, previews the whole plan,
 * then applies it in ONE audited transaction and offers Undo.
 *
 * The list is a read-only query; nothing here writes until Apply is pressed,
 * and every applied row is audited with a shared batch id so Undo restores it.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DateInput } from "@/components/DateInput";
import { todayLocalIso } from "@/lib/today";
import {
  buildSurveillancePlan,
  planSummary,
  scoreWillBeCleared,
  futureRows,
  type SurveillanceAuditRow,
  type SurveillanceDecision,
} from "@/lib/surveillanceAudit";

type DecisionMap = Record<string, SurveillanceDecision>;

const rowKey = (r: { naId: string; field: string }) => `${r.naId}|${r.field}`;

export function SurveillanceDatesPanel() {
  const rows = useQuery(api.facilities.surveillanceDateAudit, {});
  const apply = useMutation(api.facilities.applySurveillanceDateFixes);
  const undo = useMutation(api.facilities.undoSurveillanceDateFixes);

  const today = todayLocalIso();
  const [decisions, setDecisions] = useState<DecisionMap>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    batchId: string;
    cleared: number;
    set: number;
    scoresCleared: number;
    facilities: number;
  } | null>(null);
  const [undoState, setUndoState] = useState<string | null>(null);

  const list = (rows ?? []) as SurveillanceAuditRow[];

  const decisionFor = (row: SurveillanceAuditRow): SurveillanceDecision =>
    decisions[rowKey(row)] ?? { naId: row.naId, field: row.field, action: "keep" };

  const setDecision = (row: SurveillanceAuditRow, patch: Partial<SurveillanceDecision>) => {
    setDecisions((d) => ({
      ...d,
      [rowKey(row)]: { ...decisionFor(row), ...patch },
    }));
    setResult(null);
    setError(null);
  };

  const plan = useMemo(
    () =>
      buildSurveillancePlan(
        list,
        Object.values(decisions),
        today,
      ),
    [list, decisions, today],
  );

  const clearAllFuture = () => {
    const next: DecisionMap = { ...decisions };
    for (const row of futureRows(list)) {
      next[rowKey(row)] = { naId: row.naId, field: row.field, action: "clear" };
    }
    setDecisions(next);
    setPreviewOpen(true);
  };

  const doApply = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apply({
        entries: plan.changes.map((c) => ({
          naId: c.naId as never,
          field: c.field,
          action: c.action,
          newDate: c.newDate,
        })),
        reason: "Data checks · Surveillance dates",
      });
      setResult(res);
      setDecisions({});
      setPreviewOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply the confirmed dates");
    } finally {
      setBusy(false);
    }
  };

  const doUndo = async () => {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      const res = await undo({ batchId: result.batchId });
      setUndoState(
        `Undone — ${res.restored} value${res.restored === 1 ? "" : "s"} restored` +
          (res.skipped ? `, ${res.skipped} left as they are (changed again since)` : ""),
      );
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not undo this batch");
    } finally {
      setBusy(false);
    }
  };

  if (rows === undefined) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking surveillance dates…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="size-4 text-primary" /> Surveillance dates
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Done dates later than today, or exactly equal to their due date, cannot be real
            visits. Nothing changes until you confirm; every applied row is audited and can be
            undone.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAllFuture}
            disabled={futureRows(list).length === 0 || busy}
          >
            Clear all future dates ({futureRows(list).length})
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            disabled={plan.changes.length === 0 || busy}
          >
            Preview &amp; apply ({plan.changes.length})
          </Button>
        </div>
      </div>

      {result && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-300/70 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <CheckCircle2 className="size-4" />
          <span>
            Applied {result.cleared} cleared, {result.set} set
            {result.scoresCleared ? `, ${result.scoresCleared} score(s) cleared` : ""} ·{" "}
            {result.facilities} facilit{result.facilities === 1 ? "y" : "ies"} recomputed.
          </span>
          <Button type="button" size="sm" variant="outline" className="ml-auto h-7 gap-1" onClick={() => void doUndo()}>
            <RotateCcw className="size-3.5" /> Undo
          </Button>
        </div>
      )}
      {undoState && (
        <p className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs">
          <CheckCircle2 className="size-3.5 text-emerald-600" /> {undoState}
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertTriangle className="size-3.5" /> {error}
        </p>
      )}

      {list.length === 0 ? (
        <p className="rounded-xl border border-border/60 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          <ShieldCheck className="mr-1 inline size-4 text-emerald-600" /> No surveillance done date
          needs confirmation. A done date is flagged only when it is later than today (
          {today}) or exactly equal to its due date.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[56rem] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Facility", "Block", "Due date", "Done date", "Score", "Reason", "Confirm"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((row) => {
                const decision = decisionFor(row);
                return (
                  <tr key={rowKey(row)} className="border-t border-border/50 align-top">
                    <td className="px-3 py-2">
                      <p className="font-medium">{row.facilityName}</p>
                      <p className="text-[11px] text-muted-foreground">{row.label}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{row.block}</td>
                    <td className="px-3 py-2 text-xs tabular-nums">{row.due ?? "—"}</td>
                    <td className="px-3 py-2 text-xs font-medium tabular-nums">{row.done}</td>
                    <td className="px-3 py-2 text-xs tabular-nums">{row.score ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px]",
                          row.kind === "future"
                            ? "border-rose-300/70 bg-rose-50 text-rose-900"
                            : "border-amber-300/70 bg-amber-50 text-amber-900",
                        )}
                      >
                        {row.kind === "future" ? "Future date" : "Copied due date"}
                      </span>
                      <p className="mt-1 max-w-[22rem] text-[11px] text-muted-foreground">{row.reason}</p>
                      {decision.action === "clear" && scoreWillBeCleared(row) && (
                        <p className="mt-1 text-[11px] font-medium text-amber-800">
                          The score ({row.score}) will be cleared with the date.
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {(["keep", "clear", "set"] as const).map((action) => (
                          <button
                            key={action}
                            type="button"
                            aria-pressed={decision.action === action}
                            onClick={() => setDecision(row, { action })}
                            className={cn(
                              "rounded-md border px-2 py-1 text-[11px] font-medium",
                              decision.action === action
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border/70 text-muted-foreground hover:bg-muted",
                            )}
                          >
                            {action === "keep" ? "Keep" : action === "clear" ? "Clear" : "Set date"}
                          </button>
                        ))}
                        {decision.action === "set" && (
                          <DateInput
                            id={`surv-date-${row.naId}-${row.field}`}
                            label={`New done date for ${row.facilityName}`}
                            value={decision.newDate ?? ""}
                            onChange={(iso) => setDecision(row, { newDate: iso })}
                            max={today}
                            today={today}
                            compact
                            hideChange
                            className="w-36"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Preview surveillance date changes"
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-background p-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold">Preview — nothing applied yet</h4>
                <p className="mt-1 text-xs text-muted-foreground">{planSummary(plan)}</p>
              </div>
              <button
                type="button"
                aria-label="Close preview"
                onClick={() => setPreviewOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {plan.problems.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {plan.problems.map((p) => (
                  <li key={`${p.naId}|${p.field}`} role="alert">
                    {p.message}
                  </li>
                ))}
              </ul>
            )}

            {plan.changes.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing selected. Choose Clear or Set date on the rows you want to change.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border/60 rounded-lg border border-border/60">
                {plan.changes.map((change) => (
                  <li key={rowKey(change)} className="flex flex-wrap items-start gap-2 px-3 py-2 text-xs">
                    <span className="font-medium">{change.row.facilityName}</span>
                    <span className="text-muted-foreground">{change.row.label}</span>
                    <span className="ml-auto tabular-nums">
                      {change.action === "clear" ? (
                        <>
                          {change.row.done} → <strong>cleared</strong>
                        </>
                      ) : (
                        <>
                          {change.row.done} → <strong>{change.newDate}</strong>
                        </>
                      )}
                    </span>
                    {change.clearsScore && (
                      <span className="w-full text-[11px] text-amber-800">
                        Score {change.row.score} will be cleared too (a score needs a done date).
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPreviewOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void doApply()}
                disabled={busy || plan.changes.length === 0 || plan.problems.length > 0}
              >
                {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                Apply {plan.changes.length} change{plan.changes.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
