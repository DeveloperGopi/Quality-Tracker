// Admin Settings → Maintenance.
//
// Two jobs:
//   1. Recompute every facility's derived status (with a progress indicator, a
//      remembered “last run” stamp and a result summary toast).
//   2. A red, COLLAPSED-BY-DEFAULT danger zone that takes three deliberate
//      steps to complete, because it wipes every facility permanently.
//
// What the wipe deletes and what it keeps is listed with LIVE counts
// (ops.getDeletePreview — fetched only while the zone is open, so the admin
// page stays cheap), with a one-click backup export offered right where the
// decision is made. The three steps are: (1) read the warning, (2) type DELETE,
// (3) enter the 6-digit code emailed to the control room (with a resend timer).
//
// Nothing here changes the underlying mutations: it still calls
// facilities.recomputeAllStatuses, facilities.requestDeleteAllOtp and
// facilities.deleteAllFacilities.

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  DatabaseBackup,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toDisplayDateTime } from "@/lib/format";
import { CountBadge, SectionHeader } from "@/components/admin/AdminUi";

/** Remember the last successful recompute in the browser — the server does not
 *  store a “last run” timestamp, and inventing one in the database would mean a
 *  new field, which this redesign must not add. */
const LAST_RUN_KEY = "nqas.admin.lastRecompute";

export type DeleteResult = {
  deletedFacilities: number;
  deletedCycles: number;
  deletedModuleRecords: number;
};

export function MaintenancePanel({
  busy,
  onRecompute,
  onRequestOtp,
  onDeleteAll,
  onExportBackup,
}: {
  busy: string | null;
  onRecompute: () => Promise<{ total: number; updated: number } | null>;
  /** Requests the emailed code; resolves with the address it was sent to. */
  onRequestOtp: () => Promise<string | null>;
  onDeleteAll: (code: string) => Promise<DeleteResult | null>;
  onExportBackup: () => Promise<void>;
}) {
  const [lastRun, setLastRun] = useState<number | null>(null);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(LAST_RUN_KEY);
    const ts = raw ? Number(raw) : NaN;
    if (!Number.isNaN(ts) && ts > 0) setLastRun(ts);
  }, []);

  const recomputing = busy === "recompute";
  // Only query the (table-scanning) preview while the zone is actually open.
  const preview = useQuery(api.ops.getDeletePreview, zoneOpen ? {} : "skip");

  const deletedRows: [string, number][] = preview
    ? [
        ["Facilities", preview.deleted.facilities],
        ["Certification cycles", preview.deleted.cycles],
        ["State assessments", preview.deleted.stateAssessments],
        ["NQAS assessments", preview.deleted.nationalAssessments],
        ["Gap closure fund records", preview.deleted.funds],
        ["Fire NOC records", preview.deleted.nocs],
        ["Building records", preview.deleted.buildings],
        ["Facility audit entries", preview.deleted.audits],
      ]
    : [];

  const keptRows: [string, number][] = preview
    ? [
        ["Blocks", preview.kept.blocks],
        ["PHC entries", preview.kept.phcs],
        ["User accounts", preview.kept.users],
        ["App settings", preview.kept.settings],
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* ---------------- Recompute ---------------- */}
      <section
        id="maintenance-recompute"
        data-admin-anchor="maintenance-recompute"
        className="scroll-mt-40 rounded-xl border border-border/60 bg-background/60 p-4"
      >
        <SectionHeader
          icon={ShieldCheck}
          title="Recompute all statuses"
          description="Re-reads every facility's dates, scores and certificates and refreshes its derived status, bootstrapping missing certification cycles. Safe to run any time — do it after a bulk import."
          right={
            <CountBadge
              value={lastRun ? `Last run ${toDisplayDateTime(lastRun)}` : "Never run on this browser"}
            />
          }
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            className="h-10"
            disabled={recomputing}
            onClick={async () => {
              const result = await onRecompute();
              if (!result) return;
              const stamp = Date.now();
              setLastRun(stamp);
              window.localStorage.setItem(LAST_RUN_KEY, String(stamp));
              toast.success("Recompute finished", {
                description: `${result.total.toLocaleString("en-IN")} facilities checked · ${result.updated.toLocaleString("en-IN")} status${result.updated === 1 ? "" : "es"} updated`,
              });
            }}
          >
            {recomputing ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 size-4" />
            )}
            {recomputing ? "Recomputing…" : "Recompute all statuses"}
          </Button>
          {recomputing && (
            <span
              className="flex items-center gap-2 text-sm text-muted-foreground"
              role="status"
            >
              <span className="block h-1.5 w-40 overflow-hidden rounded-full bg-muted">
                <span className="block h-full w-1/2 animate-pulse rounded-full bg-primary" />
              </span>
              Working through the facility list…
            </span>
          )}
        </div>
      </section>

      {/* ---------------- Danger zone ---------------- */}
      <section
        id="maintenance-danger"
        data-admin-anchor="maintenance-danger"
        className="scroll-mt-40 rounded-xl border-2 border-rose-300/80 bg-rose-50/50 dark:border-rose-500/40 dark:bg-rose-500/5"
      >
        <button
          type="button"
          onClick={() => setZoneOpen((o) => !o)}
          aria-expanded={zoneOpen}
          className="flex w-full items-center justify-between gap-3 rounded-xl p-4 text-left focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
        >
          <span className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-100">
              <ShieldAlert className="size-4" />
            </span>
            <span>
              <span className="block text-lg font-semibold text-rose-800 dark:text-rose-100">
                Danger zone — delete all facility data
              </span>
              <span className="block text-sm text-rose-900/80 dark:text-rose-100/80">
                Irreversible. Collapsed by default, needs three deliberate steps,
                and the final code is emailed to the control room.
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <CountBadge
              value={
                preview
                  ? `${preview.deleted.facilities.toLocaleString("en-IN")} facilities`
                  : "Open to review"
              }
              tone="warning"
            />
            <ChevronDown
              className={cn(
                "size-5 text-rose-700 transition-transform duration-150 dark:text-rose-200",
                zoneOpen && "rotate-180",
              )}
            />
          </span>
        </button>

        {zoneOpen && (
          <div className="border-t-2 border-rose-200/70 p-4 dark:border-rose-500/30">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-rose-300/70 bg-background/70 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-100">
                  <AlertTriangle className="size-4" /> Will be deleted
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {deletedRows.length === 0 && (
                    <li className="text-muted-foreground">Counting…</li>
                  )}
                  {deletedRows.map(([label, count]) => (
                    <li key={label} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold tabular-nums">
                        {count.toLocaleString("en-IN")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                <p className="text-sm font-semibold text-foreground">Will be kept</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {keptRows.length === 0 && (
                    <li className="text-muted-foreground">Counting…</li>
                  )}
                  {keptRows.map(([label, count]) => (
                    <li key={label} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold tabular-nums">
                        {count.toLocaleString("en-IN")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                className="h-10"
                onClick={() => void onExportBackup()}
              >
                <DatabaseBackup className="mr-1.5 size-4" /> Export backup first
              </Button>
              <p className="max-w-xl text-xs text-muted-foreground">
                Recommended — the backup workbook holds one row per facility with
                its stage, status, scores and certificate dates.
              </p>
            </div>

            <Button
              variant="destructive"
              className="mt-4 h-10"
              onClick={() => setDialogOpen(true)}
            >
              <AlertTriangle className="mr-1.5 size-4" /> Start the delete process
            </Button>
          </div>
        )}
      </section>

      <DangerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        previewFacilities={preview?.deleted.facilities ?? null}
        onRequestOtp={onRequestOtp}
        onDeleteAll={onDeleteAll}
        onExportBackup={onExportBackup}
      />
    </div>
  );
}

/** Step-by-step confirmation. Every step is skippable backwards so an admin can
 *  always walk away without deleting anything. */
function DangerDialog({
  open,
  onOpenChange,
  previewFacilities,
  onRequestOtp,
  onDeleteAll,
  onExportBackup,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewFacilities: number | null;
  onRequestOtp: () => Promise<string | null>;
  onDeleteAll: (code: string) => Promise<DeleteResult | null>;
  onExportBackup: () => Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [typed, setTyped] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Reset the whole flow whenever the dialog is opened.
  useEffect(() => {
    if (open) {
      setStep(1);
      setTyped("");
      setCode("");
      setSentTo(null);
      setCooldown(0);
    }
  }, [open]);

  // Resend timer (30s) so the button cannot be hammered.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    setSending(true);
    const to = await onRequestOtp();
    setSending(false);
    if (to) {
      setSentTo(to);
      setCooldown(30);
    }
  };

  const steps: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: "Read the warning" },
    { n: 2, label: "Type DELETE" },
    { n: 3, label: "Email code" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-200">
            <ShieldAlert className="size-5" /> Delete all facility data
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3 —{" "}
            {steps.find((s) => s.n === step)?.label}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator — state written out, not colour alone. */}
        <ol className="flex flex-wrap items-center gap-2" aria-label="Delete steps">
          {steps.map((s) => {
            const state = s.n < step ? "done" : s.n === step ? "current" : "todo";
            return (
              <li key={s.n} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border text-xs font-bold",
                    state === "done" &&
                      "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100",
                    state === "current" &&
                      "border-rose-400 bg-rose-100 text-rose-800 dark:border-rose-400/50 dark:bg-rose-500/20 dark:text-rose-100",
                    state === "todo" && "border-border/60 text-muted-foreground",
                  )}
                >
                  {state === "done" ? <CheckCircle2 className="size-3.5" /> : s.n}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    state === "current" ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
                {s.n !== 3 && <span className="text-muted-foreground/60">→</span>}
              </li>
            );
          })}
        </ol>

        {step === 1 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-rose-300/70 bg-rose-50/70 p-3 text-sm text-rose-900 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-100">
              <p className="font-semibold">This cannot be undone.</p>
              <p className="mt-1">
                {previewFacilities === null
                  ? "Every facility"
                  : `${previewFacilities.toLocaleString("en-IN")} facilit${previewFacilities === 1 ? "y" : "ies"}`}{" "}
                will be permanently removed, together with every certification
                cycle, state / NQAS assessment, gap-closure fund, fire NOC,
                building record and facility audit entry.
              </p>
              <p className="mt-1">
                Blocks, PHCs, user accounts and app settings are kept.
              </p>
            </div>
            <Button variant="outline" className="h-10" onClick={() => void onExportBackup()}>
              <DatabaseBackup className="mr-1.5 size-4" /> Export a backup first
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <Label htmlFor="danger-confirm-text">
              Type <strong>DELETE</strong> in capitals to continue
            </Label>
            <Input
              id="danger-confirm-text"
              autoFocus
              className="glass-input h-11 font-mono tracking-widest"
              placeholder="DELETE"
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              aria-describedby="danger-confirm-help"
            />
            <p id="danger-confirm-help" className="text-xs text-muted-foreground">
              This is a deliberate speed bump — nothing has been deleted yet.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {sentTo ? (
                <>
                  A 6-digit code was emailed to <strong>{sentTo}</strong> and is
                  valid for 10 minutes.
                </>
              ) : (
                <>
                  A 6-digit confirmation code is emailed to the control-room
                  address. Request it, then enter it here.
                </>
              )}
            </p>
            <Label htmlFor="danger-code">Confirmation code</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="danger-code"
                autoFocus
                inputMode="numeric"
                maxLength={6}
                className="glass-input h-11 w-40 tracking-[0.35em]"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              <Button
                variant="outline"
                className="h-11"
                disabled={sending || cooldown > 0}
                onClick={() => void send()}
              >
                {sending ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Timer className="mr-1.5 size-4" />
                )}
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : sentTo
                    ? "Send a new code"
                    : "Send code"}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            className="h-10"
            disabled={deleting}
            onClick={() => (step === 1 ? onOpenChange(false) : setStep((s) => (s - 1) as 1 | 2))}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < 3 ? (
            <Button
              className="h-10"
              disabled={step === 2 && typed !== "DELETE"}
              onClick={() => {
                const next = (step + 1) as 2 | 3;
                // Entering step 3 requests the code (unless one is already sent).
                if (next === 3 && !sentTo) void send();
                setStep(next);
              }}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="h-10"
              disabled={deleting || code.length !== 6}
              onClick={async () => {
                setDeleting(true);
                const result = await onDeleteAll(code);
                setDeleting(false);
                if (result) {
                  toast.success("All facility data deleted", {
                    description: `${result.deletedFacilities.toLocaleString("en-IN")} facilities · ${result.deletedCycles.toLocaleString("en-IN")} cycles · ${result.deletedModuleRecords.toLocaleString("en-IN")} module records removed`,
                  });
                  onOpenChange(false);
                }
              }}
            >
              {deleting ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-1.5 size-4" />
              )}
              {deleting ? "Deleting…" : "Delete everything permanently"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
