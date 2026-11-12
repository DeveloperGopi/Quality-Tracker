/**
 * CYCLE HISTORY — the Profile / Quick View version of sheet pages 3–4.
 *
 * Reads the SAME `facilities.getFacilityCycleHistory` query the print dialog
 * uses, so screen and paper cannot disagree. Collapsed by default; a facility
 * with one cycle renders nothing. Past-cycle documents are read-only and go
 * through the SAME single-use content token as the live Documents card.
 */

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ChevronDown, Download, History } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { toDdMmmYyyy } from "@/lib/masterColumns";
import { cn } from "@/lib/utils";
import { useResultReaderEnabled } from "@/hooks/use-result-reader";
import {
  DocumentDownloadLink,
  DocumentPreviewButton,
} from "@/components/documents/DocumentPreview";
import { ResultReadButton, ResultReadStatusLine } from "@/components/result/ResultReadButton";

type CycleRow = {
  cycle: { cycleNumber: number; cycleType: string };
  inferred: boolean;
  sa: {
    scorePercent?: number | null;
    actualStartDate?: string | null;
    actualEndDate?: string | null;
  } | null;
  nqas: {
    status?: string | null;
    scheduledStartDate?: string | null;
    scheduledEndDate?: string | null;
    actualStartDate?: string | null;
    actualEndDate?: string | null;
    mode?: string | null;
    scorePercent?: number | null;
    certificationStatus?: string | null;
    certificationDate?: string | null;
    goiLetterDate?: string | null;
    validityDate?: string | null;
    surveillanceDue1?: string | null;
    surveillanceDone1?: string | null;
    surveillanceDue2?: string | null;
    surveillanceDone2?: string | null;
  } | null;
  documents: { id: string; key: string; label: string; name: string; uploadedAt: number }[];
};

const score = (v: number | null | undefined) => (v == null ? "—" : `${v.toFixed(1)}%`);
const range = (a?: string | null, b?: string | null) =>
  [toDdMmmYyyy(a ?? null), toDdMmmYyyy(b ?? null)].filter(Boolean).join(" to ") || "—";

function validityOf(row: CycleRow): string {
  const n = row.nqas;
  if (!n) return "—";
  if (n.certificationStatus === "Deferred") {
    if (!n.goiLetterDate) return "—";
    const [y, m, d] = n.goiLetterDate.split("-").map(Number);
    if (!y || !m || !d) return "—";
    const end = new Date(Date.UTC(y, m - 1 + 3, d));
    return `Cooling ends ${toDdMmmYyyy(end.toISOString().slice(0, 10))}`;
  }
  return n.validityDate ? `Valid till ${toDdMmmYyyy(n.validityDate)}` : "—";
}

export function CycleHistoryPanel({
  facilityId,
  currentCycleNumber,
  canEdit = false,
  onOpenCycle,
  className,
}: {
  facilityId: string;
  currentCycleNumber?: number | null;
  canEdit?: boolean;
  onOpenCycle?: (cycleNumber: number) => void;
  className?: string;
}) {
  const readerEnabled = useResultReaderEnabled();
  const data = useQuery(api.facilities.getFacilityCycleHistory, {
    facilityId: facilityId as never,
  });
  const [open, setOpen] = useState(false);

  const rows = data?.cycles ?? [];
  const current = currentCycleNumber ?? data?.currentCycleNumber ?? rows[rows.length - 1]?.cycle.cycleNumber;
  const earlier = useMemo(
    () => rows.filter((r) => r.cycle.cycleNumber !== current),
    [rows, current],
  );

  if (rows.length < 2) return null;

  const cells: { label: string; value: (r: CycleRow) => string }[] = [
    { label: "State assessment", value: (r) => range(r.sa?.actualStartDate, r.sa?.actualEndDate) },
    { label: "SA score", value: (r) => score(r.sa?.scorePercent) },
    { label: "NQAS scheduled", value: (r) => range(r.nqas?.scheduledStartDate, r.nqas?.scheduledEndDate) },
    { label: "NQAS visit", value: (r) => range(r.nqas?.actualStartDate, r.nqas?.actualEndDate) },
    { label: "Mode", value: (r) => r.nqas?.mode ?? "—" },
    { label: "Assessment score", value: (r) => score(r.nqas?.scorePercent) },
    { label: "Result", value: (r) => r.nqas?.certificationStatus ?? r.nqas?.status ?? "—" },
    { label: "Certification date", value: (r) => toDdMmmYyyy(r.nqas?.certificationDate ?? r.nqas?.goiLetterDate ?? null) || "—" },
    { label: "Validity", value: (r) => validityOf(r) },
    { label: "Surveillance 1", value: (r) => range(r.nqas?.surveillanceDue1, r.nqas?.surveillanceDone1) },
    { label: "Surveillance 2", value: (r) => range(r.nqas?.surveillanceDue2, r.nqas?.surveillanceDone2) },
    { label: "Documents", value: (r) => `${r.documents.length} of 6` },
  ];

  return (
    <section
      className={cn("glass rounded-xl border border-border/60 p-3", className)}
      data-testid="cycle-history"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <History className="size-4 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Cycle history</span>
          <span className="block text-[11px] text-muted-foreground">
            {rows.length} cycles · current Cycle #{current} · {earlier.length} earlier
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {rows.map((r) => {
            const c = r.cycle;
            const n = r.nqas;
            return (
              <div key={c.cycleNumber} className="rounded-lg border border-border/60 p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold">
                    Cycle #{c.cycleNumber} · {c.cycleType}
                  </span>
                  {c.cycleNumber === current ? (
                    <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                      Current
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                      Read-only
                    </span>
                  )}
                  {r.inferred && (
                    <span className="text-[10px] italic text-amber-800">
                      Inferred from earlier data
                    </span>
                  )}
                  {c.cycleNumber !== current && onOpenCycle && (
                    <button
                      type="button"
                      className="ml-auto text-[11px] font-medium text-primary hover:underline"
                      onClick={() => onOpenCycle(c.cycleNumber)}
                    >
                      Open Cycle #{c.cycleNumber}
                    </button>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>SA {r.sa ? score(r.sa.scorePercent) : "—"}</span>
                  <span>NQAS {score(n?.scorePercent)}</span>
                  <span>{n?.certificationStatus ?? n?.status ?? "Not recorded"}</span>
                  <span>{validityOf(r)}</span>
                  <span>Documents {r.documents.length} of 6</span>
                </div>
                {c.cycleNumber !== current && r.documents.length > 0 && (
                  <ul className="mt-1.5 divide-y divide-border/40 rounded border border-border/40">
                    {r.documents.map((d) => (
                      <li key={d.id ?? d.key} className="flex flex-wrap items-center gap-1 px-2 py-1 text-[11px]">
                        <span className="min-w-0 flex-1 truncate">
                          {d.label} · {d.name} · {toDdMmmYyyy(d.uploadedAt)}
                        </span>
                        {d.id && (
                          <DocumentPreviewButton
                            doc={{ id: d.id, originalName: d.name }}
                            label="Preview"
                            className="rounded border-0 bg-transparent px-1 py-0.5 text-[11px] font-normal"
                          />
                        )}
                        {d.id && (
                          <DocumentDownloadLink
                            documentId={d.id}
                            className="rounded border-0 bg-transparent px-1 py-0.5 text-[11px] font-normal"
                          >
                            <Download className="size-3" /> Download
                          </DocumentDownloadLink>
                        )}
                        {readerEnabled && d.key === "NQAS_Result" && d.id && canEdit && (
                          <span className="flex basis-full flex-wrap items-end justify-between gap-2 border-t border-border/40 px-1 pt-1">
                            <ResultReadStatusLine documentId={d.id} />
                            <ResultReadButton
                              documentId={d.id}
                              facilityId={facilityId}
                              size="xs"
                            />
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky left-0 bg-muted/50 px-2 py-1 text-left font-medium">Item</th>
                  {rows.map((r) => (
                    <th key={r.cycle.cycleNumber} className="px-2 py-1 text-left font-medium whitespace-nowrap">
                      Cycle #{r.cycle.cycleNumber}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {cells.map((cell) => (
                  <tr key={cell.label}>
                    <th className="sticky left-0 bg-background px-2 py-1 text-left font-normal text-muted-foreground">
                      {cell.label}
                    </th>
                    {rows.map((r) => (
                      <td key={r.cycle.cycleNumber} className="px-2 py-1">
                        {cell.value(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
