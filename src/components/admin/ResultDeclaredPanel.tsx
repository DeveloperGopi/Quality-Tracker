/**
 * DATA CHECKS → RESULT DECLARED (task §4).
 *
 * A confirm-first report of every certified / conditional / deferred facility
 * whose SaQsham Documents Status is not yet the automatic "Result Declared".
 * Nothing changes until the State Admin ticks the confirmation and presses
 * Apply; the batch is one transaction, audited with a batch id, and can be
 * undone while the rows still hold the automatic value.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, ShieldCheck } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Candidate = {
  saId: string;
  facility: string;
  block: string;
  certificationStatus: string;
  current: string | null;
  auto: boolean;
};

export function ResultDeclaredPanel() {
  const rows = useQuery(api.dataChecks.resultDeclaredAudit, {});
  const apply = useMutation(api.dataChecks.applyResultDeclared);
  const undo = useMutation(api.dataChecks.undoResultDeclared);

  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<"apply" | "undo" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batch, setBatch] = useState<string | null>(null);
  const [applied, setApplied] = useState(0);
  const [undoResult, setUndoResult] = useState<string | null>(null);

  const list = (rows ?? []) as Candidate[];
  const selected = useMemo(
    () => list.filter((r) => picked[r.saId] !== false),
    [list, picked],
  );

  const runApply = async () => {
    setBusy("apply");
    setError(null);
    try {
      const out = await apply({ saIds: selected.map((r) => r.saId) as never });
      setBatch(out.batchId);
      setApplied(out.updated);
      setConfirmed(false);
      setPicked({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply the backfill");
    } finally {
      setBusy(null);
    }
  };

  const runUndo = async () => {
    if (!batch) return;
    setBusy("undo");
    setError(null);
    try {
      const out = await undo({ batchId: batch });
      setUndoResult(
        `Restored ${out.restored} row${out.restored === 1 ? "" : "s"}${
          out.skipped ? ` · ${out.skipped} left untouched (edited later)` : ""
        }`,
      );
      setBatch(null);
      setApplied(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not undo the backfill");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      aria-label="Result Declared backfill"
      className="rounded-xl border border-border/60 bg-background/60"
      data-testid="result-declared-panel"
    >
      <header className="border-b border-border/60 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-primary" /> Result Declared backfill
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          A certified, conditional or deferred result sets SaQsham Documents Status to{" "}
          <b className="font-semibold text-foreground">Result Declared</b> automatically. This
          report lists rows saved before that rule existed. Apply keeps the last portal value, is
          audited and can be undone; nothing is deleted.
        </p>
      </header>

      <div className="p-4">
        {rows === undefined ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Reading the stored results…
          </p>
        ) : list.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" /> Every declared result already shows “Result
            Declared”. Nothing to change.
          </p>
        ) : (
          <>
            <div className="max-h-72 overflow-auto rounded-lg border border-border/60">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-muted/70">
                  <tr>
                    {["", "Facility", "Block", "Certification status", "Current Documents Status"].map(
                      (h) => (
                        <th
                          key={h || "pick"}
                          className="px-2 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.saId} className="border-t border-border/40">
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          aria-label={`Include ${r.facility}`}
                          checked={picked[r.saId] !== false}
                          onChange={(e) =>
                            setPicked((p) => ({ ...p, [r.saId]: e.target.checked }))
                          }
                          className="size-4 accent-[var(--primary)]"
                        />
                      </td>
                      <td className="px-2 py-1.5 font-medium">{r.facility}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.block || "-"}</td>
                      <td className="px-2 py-1.5">{r.certificationStatus}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {r.current || "-"}
                        {r.auto ? " (auto)" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label className="mt-3 flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span>
                I have reviewed the {selected.length} row{selected.length === 1 ? "" : "s"} and want
                to set them to <b>Result Declared</b>. The change is audited and undoable.
              </span>
            </label>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => void runApply()}
                disabled={!confirmed || selected.length === 0 || busy !== null}
              >
                {busy === "apply" ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1 size-3.5" />
                )}
                Apply to {selected.length}
              </Button>
              {batch && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void runUndo()}
                  disabled={busy !== null}
                >
                  {busy === "undo" ? (
                    <Loader2 className="mr-1 size-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-1 size-3.5" />
                  )}
                  Undo this backfill
                </Button>
              )}
            </div>
          </>
        )}

        {applied > 0 && batch && (
          <p
            role="status"
            className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-300/70 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-900"
          >
            <CheckCircle2 className="size-3.5" /> Updated {applied} row
            {applied === 1 ? "" : "s"} · batch {batch.slice(-6)}. Undo restores them until a later
            edit replaces the automatic value.
          </p>
        )}
        {undoResult && (
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            {undoResult}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className={cn(
              "mt-2 flex items-center gap-1.5 rounded-lg border border-rose-300/70 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-900",
            )}
          >
            <AlertTriangle className="size-3.5" /> {error}
          </p>
        )}
      </div>
    </section>
  );
}
