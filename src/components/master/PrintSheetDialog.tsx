/**
 * PRINT FACILITY SHEET — the simplified dialog (Part 6).
 *
 * A facility with N certification cycles prints N reports of EXACTLY two A4
 * pages each: the current cycle first (pages 1–2), then each earlier cycle,
 * newest first (Cycle #3 → pages 5–6, and so on). This dialog decides:
 *
 *   • Paper            — A4 (default) or A3 (the same layout, scaled)
 *   • Cycles to include — every cycle ticked by default, newest first, each
 *                        showing the pages it occupies; the total updates
 *                        ("4 pages"). A one-cycle facility shows no list.
 *   • Include QR code   — on by default (page 1 of the document, once)
 *   • Language          — only when Tamil is enabled for the district
 *
 * Everything else the old dialog offered is GONE: no "Allow a third page", no
 * "Show empty fields", no "Include recent changes", no Previous-cycles
 * segmented control — pages, blank collapse, recent changes and the fit
 * ladder are the engine's business, and they are the same for every surface.
 *
 * Mounted once in the app shell and driven by `lib/printSheet`, so the row
 * menu, the Quick View, the phone cards and the Facility Profile all get the
 * same options without duplicating any of this.
 *
 * Native <dialog> + showModal(): the Facility Quick View is itself a modal
 * <dialog> in the top layer, and a portalled Radix dialog would render BEHIND
 * it. Top-layer order (last opened wins) keeps this dialog on top of whatever
 * opened it, with the browser's own focus trap and Esc handling.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Checkbox } from "@radix-ui/react-checkbox";
import { Check, Download, FileType2, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { resolveReportTypeLabels } from "@/lib/reportNaming";
import type { SheetCycleRecord } from "@/lib/facilitySheet";
import { sheetContentHash } from "@/lib/shareLink";
import { cn } from "@/lib/utils";
import {
  closePrintSheet,
  getPrintSheetRequest,
  prefetchSheet,
  sheetFileName,
  subscribePrintSheet,
  type PrintSheetRequest,
} from "@/lib/printSheet";

function usePrintSheetRequest(): PrintSheetRequest | null {
  return useSyncExternalStore(
    subscribePrintSheet,
    getPrintSheetRequest,
    getPrintSheetRequest,
  );
}

/** "Cycle #2 · Recertification (current) · pages 1–2" */
function cycleRowLabel(
  cycleNumber: number,
  cycleType: string | null | undefined,
  isCurrent: boolean,
  index: number,
): string {
  const type = (cycleType ?? "").trim() || (cycleNumber > 1 ? "Recertification" : "Initial");
  const first = index * 2 + 1;
  return `Cycle #${cycleNumber} · ${type}${isCurrent ? " (current)" : ""} · pages ${first}–${first + 1}`;
}

export function PrintSheetDialog() {
  const request = usePrintSheetRequest();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [paper, setPaper] = useState<"a4" | "a3">("a4");
  const [includeQr, setIncludeQr] = useState(true);
  /** Contact numbers are OFF by default (privacy); the printer opts in. */
  const [includeContactNumbers, setIncludeContactNumbers] = useState(false);
  const [language, setLanguage] = useState<"en" | "ta">("en");
  const [chosen, setChosen] = useState<number[]>([]);
  const [busy, setBusy] = useState<"download" | "print" | null>(null);
  const [fitNote, setFitNote] = useState<string | null>(null);

  const open = request !== null;
  const facilityId = request ? String(request.row.facility._id) : null;
  /* Recent changes: the profile page hands its audit rows over directly; from
     the list the dialog asks for the newest few only — the full profile query
     would load every cycle, fund, NOC and building for five lines. */
  const needsAudits = open && !request?.audits;
  const trail = useQuery(
    api.facilities.getFacilityAuditTrail,
    needsAudits && facilityId ? { facilityId: facilityId as never, limit: 20 } : "skip",
  );
  const audits = useMemo(() => request?.audits ?? trail ?? [], [request?.audits, trail]);

  /* Every cycle of the facility, with its own records — the same query the
     Profile / Quick View history section reads. Loaded only while open. */
  const cycleQuery = useQuery(
    api.facilities.getFacilityCycleHistory,
    open && facilityId ? { facilityId: facilityId as never } : "skip",
  );
  const cycles = useMemo<SheetCycleRecord[]>(
    () =>
      (cycleQuery?.cycles ?? []).map((row) => ({
        ...row.cycle,
        inferred: row.inferred,
        sa: row.sa,
        nqas: row.nqas,
        documents: row.documents,
        scores: row.scores ?? null,
        audits: row.audits,
      })),
    [cycleQuery],
  );
  /** Newest first, the current cycle (highest number) at the top. */
  const ordered = useMemo(
    () => [...cycles].sort((a, b) => b.cycleNumber - a.cycleNumber),
    [cycles],
  );
  const currentNumber = request?.row.cycleNumber ?? ordered[0]?.cycleNumber ?? 1;
  /** Profile print requests do not carry scores on the list row; the cycle
   *  history query does, so the current cycle's block still prints. */
  const sheetRow = useMemo(() => {
    const base = request?.row;
    if (!base) return undefined;
    if (base.scores) return base;
    const current = ordered.find((cycle) => cycle.cycleNumber === currentNumber);
    return current?.scores ? { ...base, scores: current.scores } : base;
  }, [request?.row, ordered, currentNumber]);
  const hasManyCycles = ordered.length > 1;

  /* Every cycle is ticked by default; an empty selection means "not loaded
     yet", so the UI falls back to all cycles rather than printing none. */
  useEffect(() => {
    if (!open) return;
    setChosen(ordered.map((c) => c.cycleNumber));
    setFitNote(null);
  }, [open, ordered]);

  const selected = chosen.length ? chosen : ordered.map((c) => c.cycleNumber);
  const orderedSelected = ordered.filter((c) => selected.includes(c.cycleNumber));
  const pageCount = (orderedSelected.length || 1) * 2;

  const clash = useQuery(
    api.facilities.sameReportNameAs,
    open && request
      ? {
          facilityId: String(request.row.facility._id),
          name: request.row.facility.name,
          facilityType: request.row.facility.facilityType,
        }
      : "skip",
  );

  /* Part 3/4 — the type-label map (Admin → Shared reports) drives both the
     file name preview and the sheet, so the two can never disagree. */
  const appSettings = useQuery(api.facilities.getAppSettings, open ? {} : "skip");
  const settings = (appSettings?.settings ?? {}) as Record<string, unknown>;
  const typeLabels = useMemo(
    () => resolveReportTypeLabels(settings.reportTypeLabels),
    [settings.reportTypeLabels],
  );
  /** Language is offered only when the district has enabled Tamil. */
  const tamilEnabled = settings.enableTamil === true || settings.tamilEnabled === true;

  const ensureShare = useMutation(api.share.ensure);
  const storeShare = useAction(api.share.store);
  const markQrCheck = useMutation(api.share.markQrCheck);
  const verifyLive = useAction(api.share.verifyLive);

  const fileName = useMemo(
    () =>
      sheetFileName(request?.row.facility, {
        duplicate: clash === true,
        typeLabels,
        cycles: { chosen: orderedSelected.map((c) => c.cycleNumber), total: ordered.length },
      }),
    [clash, ordered.length, orderedSelected, request?.row.facility, typeLabels],
  );

  /* Top layer + focus trap + Esc, straight from the <dialog> element. The
     generator chunk is prefetched the moment the dialog opens, so the click on
     Download starts rendering instead of fetching code. */
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      prefetchSheet();
      if (typeof el.showModal === "function") el.showModal();
      else el.setAttribute("open", "");
    }
    if (!open && el.open) {
      if (typeof el.close === "function") el.close();
      else el.removeAttribute("open");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const run = useCallback(
    async (mode: "download" | "print") => {
      if (!request || busy) return;
      setBusy(mode);
      try {
        const { buildFacilitySheet } = await import("@/lib/facilitySheet");

        /* The QR needs its URL BEFORE the PDF is rendered, so the snapshot (or
           the existing one for identical content) is ensured first. Unchanged
           data reuses the stored copy instead of storing another. */
        let share: {
          token: string;
          url: string;
          needsUpload: boolean;
          documentLinks?: { key: string; url: string }[];
        } | null = null;
        /* Part 3 — every document printed in the chosen cycles, so the
           snapshot can mint one pinned link per version. */
        const printedDocs = orderedSelected.flatMap((c) =>
          (c.documents ?? [])
            .filter((d) => !!d.id)
            .map((d) => ({
              id: String(d.id),
              docKey: d.key,
              cycleNumber: c.cycleNumber,
            })),
        );
        if (includeQr) {
          try {
            const contentHash = await sheetContentHash({
              fileName,
              dataAsOf: String(request.dataAsOf ?? ""),
              printed: {
                row: request.row,
                audits,
                options: { paper, includeQr, cycles: orderedSelected.map((c) => c.cycleNumber) },
              },
            });
            const ensured = await ensureShare({
              facilityId: String(request.row.facility._id),
              cycleNumber: currentNumber,
              contentHash,
              fileName,
              facilityName: request.row.facility.name,
              facilityType: request.row.facility.facilityType ?? undefined,
              facilityUpdatedAt: request.row.facility.updatedAt ?? undefined,
              documents: printedDocs.length ? printedDocs : undefined,
            });
            // No saved App address → no printable link; the sheet still prints.
            if (ensured.url) share = ensured;
            else
              toast.info("Set the App address in Admin → Google Drive to print a QR code");
          } catch (err) {
            share = null;
            toast.warning("The QR link could not be prepared", {
              description: err instanceof Error ? err.message : String(err),
            });
          }
        }

        const result = await buildFacilitySheet(sheetRow ?? request.row, {
          paper,
          includeQr,
          includeContactNumbers,
          generatedBy: request.generatedBy,
          dataAsOf: request.dataAsOf,
          audits,
          cycleHistory: ordered,
          cycles: orderedSelected.map((c) => c.cycleNumber),
          fileName,
          typeLabels,
          settings,
          qrUrl: share?.url,
          docLinks: share?.documentLinks
            ? Object.fromEntries(share.documentLinks.map((l) => [l.key, l.url]))
            : undefined,
        });

        /* Part 2.3 — the generation-time QR self-check (payload === saved
           short URL, version 4 at ECC M, 20 mm symbol / 0.61 mm modules). A
           failure is recorded on the share row so Admin → Shared reports shows
           it; the sheet still leaves. */
        if (share?.token && result.qrCheckFailed) {
          await markQrCheck({ token: share.token, failed: true }).catch(() => {
            /* the badge is still printed; the row is best-effort */
          });
        }

        /* Store the exact bytes BEFORE the file is saved or printed, so a
           sheet scanned seconds later finds a copy that already exists.
           Failure never blocks the reader — it warns, because the QR would be
           empty. */
        if (share?.needsUpload && share.token) {
          try {
            const buffer = result.doc.output("arraybuffer") as ArrayBuffer;
            await storeShare({
              token: share.token,
              size: buffer.byteLength,
              base64: toBase64(buffer),
            });
          } catch (err) {
            toast.warning("The digital copy could not be stored yet", {
              description:
                err instanceof Error ? err.message : "Re-open this dialog and try again",
            });
          }
        }

        /* Part 2.3 — HEAD the short link on the saved App address before the
           file is handed over. A failure is a warning, never a blocked print. */
        if (share?.token) {
          try {
            const live = await verifyLive({ token: share.token });
            if (!live.ok) {
              toast.warning("The QR link is not reachable yet", {
                description: `${live.message} · ${share.url}`,
              });
            }
          } catch {
            /* offline / server busy: the sheet still prints */
          }
        }

        /* What the fit ladder shortened, in the dialog and in the toast — the
           reader is told, never surprised by a missing section. */
        const HIDDEN_LABEL: Record<string, string> = {
          recent: "Recent changes",
          documentsDetail: "Documents detail",
          departmentDetail: "Department detail",
          checks: "Needs attention",
          documents: "Documents",
          building: "Building & Fire NOC",
          fund: "Gap closure",
          surveillance: "Surveillance & Recertification",
        };
        const shortened = [...new Set(result.shortened)].map(
          (id) => HIDDEN_LABEL[id] ?? id,
        );
        const note = shortened.length ? `Shortened to fit: ${shortened.join(", ")} hidden` : null;
        setFitNote(note);

        if (mode === "print") {
          result.doc.autoPrint();
          const url = result.doc.output("bloburl") as unknown as string;
          window.open(url, "_blank", "noopener,noreferrer");
          toast.success(`Print preview opened (${result.pages} pages)`, {
            description: note ? `${result.fileName} · ${note}` : result.fileName,
          });
        } else {
          result.doc.save(result.fileName);
          toast.success(`Facility sheet saved (${result.pages} pages)`, {
            description: note ? `${result.fileName} · ${note}` : result.fileName,
          });
        }
        closePrintSheet();
      } catch (err) {
        /* NEVER the old "Could not build the facility sheet" wall: the fit
           ladder cannot fail any more, so anything reaching here is an
           environment problem (fonts, storage) and is named as such. */
        toast.error("The facility sheet could not be prepared", {
          description:
            (err instanceof Error ? err.message : String(err)) +
            " — try again; the data itself is unaffected.",
        });
      } finally {
        setBusy(null);
      }
    },
    [
      audits,
      busy,
      clash,
      currentNumber,
      ensureShare,
      fileName,
      includeContactNumbers,
      includeQr,
      ordered,
      orderedSelected,
      paper,
      request,
      sheetRow,
      storeShare,
      typeLabels,
    ],
  );

  const name = request?.row.facility.name ?? "";
  const nin = request?.row.facility.ninNumber ?? "";

  return (
    <dialog
      ref={dialogRef}
      data-testid="print-sheet-dialog"
      aria-modal="true"
      aria-labelledby="print-sheet-title"
      className="print-dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) closePrintSheet();
      }}
      onClick={(e) => {
        // Clicking the scrim targets the dialog element itself.
        if (e.target === e.currentTarget && !busy) closePrintSheet();
      }}
    >
      {open && (
        <div className="space-y-3 p-4">
          <div>
            <h2
              id="print-sheet-title"
              className="flex items-center gap-2 text-base font-semibold leading-none"
            >
              <Printer className="size-4" /> Print facility sheet
            </h2>
            <p className="mt-1.5 truncate text-sm text-muted-foreground">
              {name}
              {nin ? ` · NIN ${nin}` : ""} · {pageCount} page{pageCount === 1 ? "" : "s"}
            </p>
          </div>

          {fitNote && (
            <p
              data-testid="print-sheet-fit-note"
              className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            >
              {fitNote}.
            </p>
          )}

          <div className="rounded-xl border border-border/60 p-3">
            <Label className="text-sm font-semibold">Paper</Label>
            <RadioGroup
              value={paper}
              onValueChange={(v) => setPaper(v as "a4" | "a3")}
              className="mt-2 grid grid-cols-2 gap-2"
            >
              {(
                [
                  ["a4", "A4", "Standard print"],
                  ["a3", "A3", "Same layout, scaled"],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={cn(
                    "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                    paper === value ? "border-primary/50 bg-primary/5" : "border-border/60",
                  )}
                >
                  <RadioGroupItem value={value} />
                  <span className="font-medium">{label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{hint}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {hasManyCycles && (
            <div className="rounded-xl border border-border/60 p-3">
              <Label className="text-sm font-semibold">Cycles to include</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Each cycle prints its own two pages, current cycle first.
              </p>
              <ul className="mt-2 space-y-1.5">
                {ordered.map((cycle, index) => {
                  const ticked = selected.includes(cycle.cycleNumber);
                  return (
                    <li key={cycle.cycleNumber}>
                      <label
                        className={cn(
                          "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 text-sm",
                          ticked ? "border-primary/50 bg-primary/5" : "border-border/60",
                        )}
                      >
                        <Checkbox
                          checked={ticked}
                          onCheckedChange={(next) =>
                            setChosen((prev) =>
                              next === true
                                ? [...new Set([...prev, cycle.cycleNumber])]
                                : prev.filter((n) => n !== cycle.cycleNumber),
                            )
                          }
                          aria-label={cycleRowLabel(cycle.cycleNumber, cycle.cycleType, cycle.cycleNumber === currentNumber, index)}
                          className="flex size-4 shrink-0 items-center justify-center rounded border border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                        >
                          <Check className="size-3 text-primary-foreground" />
                        </Checkbox>
                        <span className="min-w-0 truncate">
                          {cycleRowLabel(
                            cycle.cycleNumber,
                            cycle.cycleType,
                            cycle.cycleNumber === currentNumber,
                            index,
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="divide-y divide-border/60 rounded-xl border border-border/60">
            <ToggleRow
              icon={<QrCode className="size-4 text-muted-foreground" />}
              title="Include QR code"
              hint="On page 1 once; opens the digital copy of this report."
              checked={includeQr}
              onChange={setIncludeQr}
            />
            <ToggleRow
              icon={<FileType2 className="size-4 text-muted-foreground" />}
              title="Include contact numbers"
              hint="Off by default. When on, the assessors' mobile numbers print on the sheet."
              checked={includeContactNumbers}
              onChange={setIncludeContactNumbers}
            />
          </div>

          {tamilEnabled && (
            <div className="rounded-xl border border-border/60 p-3">
              <Label className="text-sm font-semibold">Language</Label>
              <RadioGroup
                value={language}
                onValueChange={(v) => setLanguage(v as "en" | "ta")}
                className="mt-2 grid grid-cols-2 gap-2"
              >
                <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 text-sm">
                  <RadioGroupItem value="en" /> English
                </label>
                <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 text-sm">
                  <RadioGroupItem value="ta" /> தமிழ்
                </label>
              </RadioGroup>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Facility names and Tamil data always print in Tamil; labels stay English for now.
              </p>
            </div>
          )}

          <p className="truncate text-xs text-muted-foreground">
            File: <span className="font-mono">{fileName}</span>
          </p>
          {busy && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => closePrintSheet()} disabled={busy !== null}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => void run("print")}
              disabled={busy !== null}
              aria-busy={busy === "print"}
            >
              <FileType2 className="mr-1.5 size-4" />
              {busy === "print" ? "Preparing…" : "Print"}
            </Button>
            <Button onClick={() => void run("download")} disabled={busy !== null} aria-busy={busy === "download"}>
              <Download className="mr-1.5 size-4" />
              {busy === "download" ? "Generating…" : "Download PDF"}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}

function ToggleRow({
  icon,
  title,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** Base64 for the snapshot upload — chunked so a 0.5 MB sheet never blows
 *  the argument stack with a spread of 500 000 bytes. */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x2000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
