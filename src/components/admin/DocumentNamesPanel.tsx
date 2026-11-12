/** Data checks → preview + apply human document names. Nothing silent. */

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

type Candidate = {
  id: string;
  facility: string;
  before: string;
  after: string;
  unknown: string | null;
};

export function DocumentNamesPanel() {
  const rows = useQuery(api.documentNames.preview, {});
  const apply = useMutation(api.documentNames.apply);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = (rows ?? []) as Candidate[];
  const selected = useMemo(
    () => list.filter((row) => !row.unknown && picked[row.id] !== false),
    [list, picked],
  );

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const out = await apply({ ids: selected.map((row) => row.id) as never });
      setDone(out.updated);
      setPicked({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename the documents");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label="Document display names"
      className="rounded-xl border border-border/60 bg-background/60"
    >
      <header className="border-b border-border/60 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="size-4 text-primary" /> Document display names
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Renames the app's display names only — Google Drive files and the original upload names
          stay unchanged. Rows with an unknown type or cycle are listed but not applied.
        </p>
      </header>
      <div className="p-4">
        {rows === undefined ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Reading document names…
          </p>
        ) : list.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" /> Every document already uses its human name.
          </p>
        ) : (
          <>
            <div className="max-h-80 overflow-auto rounded-lg border border-border/60">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-muted/70">
                  <tr>
                    {["", "Facility", "Current", "New name", "Issue"].map((h) => (
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
                    <tr key={row.id} className="border-t border-border/40">
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          aria-label={`Rename ${row.facility}`}
                          disabled={!!row.unknown}
                          checked={!row.unknown && picked[row.id] !== false}
                          onChange={(e) => setPicked((p) => ({ ...p, [row.id]: e.target.checked }))}
                          className="size-4 accent-[var(--primary)] disabled:opacity-40"
                        />
                      </td>
                      <td className="px-2 py-1.5 font-medium">{row.facility}</td>
                      <td className="max-w-52 truncate px-2 py-1.5 text-muted-foreground" data-tip={row.before}>
                        {row.before}
                      </td>
                      <td className="max-w-64 truncate px-2 py-1.5" data-tip={row.after}>
                        {row.after}
                      </td>
                      <td className="px-2 py-1.5 text-amber-700">{row.unknown ?? "-"}</td>
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
                  <FileText className="mr-1 size-3.5" />
                )}
                Rename {selected.length} document{selected.length === 1 ? "" : "s"}
              </Button>
              <span className="text-xs text-muted-foreground">Preview first; nothing is silent.</span>
            </div>
          </>
        )}
        {done != null && (
          <p role="status" className="mt-2 text-xs font-medium text-emerald-700">
            Renamed {done} document{done === 1 ? "" : "s"}.
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
