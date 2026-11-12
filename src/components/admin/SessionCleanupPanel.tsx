/**
 * SESSION CLEAN-UP (Admin → Users and roles).
 *
 * Why this exists: the auth library only deletes a session row when the
 * browser can still PROVE it, so one account had accumulated 18 rows that all
 * read "Another device · Browser". This panel gives the State Admin:
 *
 *   1. the configured session lifetime (appSettings `sessionLifetimeDays`,
 *      default 30 days) — used by the daily prune and by the sign-in
 *      housekeeping, and shown here so nobody has to guess;
 *   2. the migration REPORT: every candidate listed BEFORE anything is
 *      deleted — expired, idle past the lifetime, a duplicate row for the
 *      same device, or an old sign-in with no device data;
 *   3. one confirmed "Prune" action: a single transaction, one audit row with
 *      a batch id (listable through auditLogs.by_batch).
 *
 * Deleted session rows cannot be resurrected (their refresh tokens are gone),
 * so the report states the real consequence instead of promising an Undo:
 * those devices simply sign in again. The caller's own session is never
 * touched, and no IP address is stored or shown anywhere.
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, LogOut, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toDisplayStamp } from "@/lib/format";
import { parseDevice, relativeTime, SESSION_LIFETIME_DAYS_DEFAULT } from "@/lib/profileConfig";
import { cn } from "@/lib/utils";

const REASON_LABEL: Record<string, string> = {
  expired: "Expired",
  idle: `Idle past the lifetime`,
  duplicate: "Duplicate on the same device",
  stale: "Old sign-in, no device data",
};

export function SessionCleanupPanel() {
  const preview = useQuery(api.profile.previewSessionCleanup, {});
  const setLifetime = useMutation(api.profile.setSessionLifetimeDays);
  const prune = useMutation(api.profile.applySessionCleanup);

  const [daysOverride, setDaysOverride] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  // The server value is the default; typing overrides it until Save confirms
  // (no effect → no extra render pass when the report arrives).
  const days = daysOverride ?? String(preview?.lifetimeDays ?? SESSION_LIFETIME_DAYS_DEFAULT);

  const saveLifetime = async () => {
    const value = Number(days);
    try {
      const res = await setLifetime({ days: value });
      setDaysOverride(null);
      if (res.changed === 0) toast.info("Session lifetime is already that value");
      else toast.success(`Sessions now expire after ${Math.floor(value)} days`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the session lifetime");
      setDaysOverride(null);
    }
  };

  const applyPrune = async () => {
    if (!preview || preview.rows.length === 0) return;
    setBusy(true);
    try {
      const res = await prune({ ids: preview.rows.map((r) => r.id) });
      toast.success("Sessions pruned", {
        description: `${res.removed} ended, ${res.skipped} skipped (kept). Batch ${res.batchId}. Those devices sign in again if they are still in use.`,
      });
      setConfirming(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not prune the sessions");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      data-testid="session-cleanup"
      className="rounded-xl border border-border/60 bg-card p-4"
      aria-label="Sessions"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="size-4" aria-hidden="true" /> Sessions
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Expired, duplicate and leftover sign-ins across every account. Nothing is deleted until
            you press Prune below.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <label htmlFor="session-lifetime" className="text-xs text-muted-foreground">
            Expire after
          </label>
          <Input
            id="session-lifetime"
            type="number"
            min={1}
            max={365}
            value={days}
            data-testid="session-lifetime-input"
            onChange={(e) => setDaysOverride(e.target.value)}
            className="h-9 w-20 text-sm"
          />
          <span className="text-xs text-muted-foreground">days</span>
          <Button size="sm" variant="outline" data-testid="session-lifetime-save" onClick={() => void saveLifetime()}>
            Save
          </Button>
        </div>
      </div>

      {preview === undefined ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Reading the session list…
        </p>
      ) : preview.rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground" data-testid="session-cleanup-empty">
          Every session is healthy — nothing to prune.
        </p>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full border-collapse text-sm" data-testid="session-cleanup-table">
              <thead>
                <tr className="bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-3 py-2 font-medium">Account</th>
                  <th scope="col" className="px-3 py-2 font-medium">Device</th>
                  <th scope="col" className="px-3 py-2 font-medium">Signed in</th>
                  <th scope="col" className="px-3 py-2 font-medium">Last active</th>
                  <th scope="col" className="px-3 py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => {
                  const device = row.userAgent ? parseDevice(row.userAgent) : null;
                  return (
                    <tr key={row.id} className="border-t border-border/40">
                      <td className="px-3 py-2 text-[13px]">
                        {row.name || row.email}
                        {row.name ? (
                          <span className="block text-[11px] text-muted-foreground">{row.email}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-[13px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <MonitorSmartphone className="size-3.5" aria-hidden="true" />
                          {device ? device.label : "Unknown device"}
                        </span>
                      </td>
                      <td
                        className="px-3 py-2 text-[13px] text-muted-foreground"
                        data-tip={row.createdAt ? toDisplayStamp(row.createdAt) : undefined}
                      >
                        {relativeTime(row.createdAt)}
                      </td>
                      <td
                        className="px-3 py-2 text-[13px] text-muted-foreground"
                        data-tip={row.lastActive ? toDisplayStamp(row.lastActive) : undefined}
                      >
                        {relativeTime(row.lastActive)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            row.reason === "expired"
                              ? "border-amber-300/70 bg-amber-100 text-amber-900"
                              : "border-border/70 bg-muted text-muted-foreground",
                          )}
                        >
                          {REASON_LABEL[row.reason] ?? row.reason}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Pruning ends those sessions (their devices sign in again) and is recorded in the
              audit log with a batch id. Your own session is never removed.
            </p>
            {confirming ? (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  data-testid="session-cleanup-confirm"
                  disabled={busy}
                  onClick={() => void applyPrune()}
                >
                  {busy ? "Pruning…" : `Yes, prune ${preview.rows.length}`}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                data-testid="session-cleanup-prune"
                onClick={() => setConfirming(true)}
              >
                <LogOut className="size-3.5" /> Prune {preview.rows.length} session
                {preview.rows.length === 1 ? "" : "s"}
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
