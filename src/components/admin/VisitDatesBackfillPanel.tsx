/** Data checks → Completed assessments missing visit dates. Preview first. */

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CalendarClock, CheckCircle2, Loader2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

export function VisitDatesBackfillPanel() {
  const rows = useQuery(api.dataChecks.visitDatesPreview, {});
  const fill = useMutation(api.dataChecks.fillVisitDates);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = rows ?? [];
  const selected = useMemo(
    () => list.filter((row) => picked[row.key] !== false),
    [list, picked],
  );

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const out = await fill({ keys: selected.map((row) => row.key) });
      setDone(out.updated);
      setPicked({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fill the visit dates");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label="Completed assessments missing visit dates"
      className="rounded-xl border border-border/60 bg-background/60"
    >
      <header className="border-b border-border/60 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4 text-primary" /> Completed assessments missing visit dates
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Only assessments whose scheduled start is today or earlier are listed. Existing dates are
          never changed; nothing is written until you confirm.
        </p>
      </header>
      <div className="p-4">
        {rows === undefined ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Reading assessments…
          </p>
        ) : list.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" /> No completed assessment is missing visit dates.
          </p>
        ) : (
          <>
            <div className="max-h-72 overflow-auto rounded-lg border border-border/60">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-muted/70">
                  <tr>
                    {["", "Facility", "Block", "Assessment", "Scheduled", "Will fill"].map((h) => (
                      <th
                        key={h || "pick"}
                        className="px-2 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.key} className="border-t border-border/40">
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          aria-label={`Include ${row.facility}`}
                          checked={picked[row.key] !== false}
                          onChange={(e) =>
                            setPicked((p) => ({ ...p, [row.key]: e.target.checked }))
                          }
                          className="size-4 accent-[var(--primary)]"
                        />
                      </td>
                      <td className="px-2 py-1.5 font-medium">{row.facility}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{row.block || "-"}</td>
                      <td className="px-2 py-1.5">{row.kind === "sa" ? "State Assessment" : "NQAS"}</td>
                      <td className="px-2 py-1.5 tabular-nums">{row.scheduled}</td>
                      <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                        {row.fillStart === row.fillEnd ? row.fillStart : `${row.fillStart} → ${row.fillEnd}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => void run()} disabled={busy || selected.length === 0}>
                {busy ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : (
                  <CalendarClock className="mr-1 size-3.5" />
                )}
                Fill from scheduled start ({selected.length})
              </Button>
              <span className="text-xs text-muted-foreground">
                Audited as “auto from schedule”.
              </span>
            </div>
          </>
        )}
        {done != null && (
          <p role="status" className="mt-2 text-xs font-medium text-emerald-700">
            Filled {done} assessment{done === 1 ? "" : "s"}.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
