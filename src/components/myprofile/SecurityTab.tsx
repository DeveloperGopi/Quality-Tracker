/**
 * SECURITY TAB — password row + the session list.
 *
 * This whole tab is code-split (the page lazy-loads it), and its query
 * (`profile.mySessions`) only exists while the tab is open.
 *
 * What changed vs the old list:
 *   • "This device" is matched by the caller's OWN session token (the old code
 *     showed the NEWEST session as "this device");
 *   • every row is parsed from its stored user agent ("Chrome on Windows") and
 *     rows of the same browser+device are grouped, with the rest collapsed
 *     behind "N other devices";
 *   • last activity is relative ("3 h ago") with the DD-MMM-YYYY HH:MM stamp in
 *     the tooltip — never a raw IP, and never the sign-in time pretending to
 *     be the activity time;
 *   • idle sessions (> 7 days) carry an "Inactive" chip (text, not colour).
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router";
import { KeyRound, Loader2, LogOut, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toDisplayStamp } from "@/lib/format";
import {
  groupSessions,
  isInactiveSession,
  nowMs,
  parseDevice,
  relativeTime,
  type SessionRow,
} from "@/lib/profileConfig";

export default function SecurityTab({ hasPassword }: { hasPassword: boolean }) {
  const data = useQuery(api.profile.mySessions, {});
  const signOutOthers = useMutation(api.profile.signOutOtherSessions);
  const signOutOne = useMutation(api.profile.signOutSession);
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);

  const rows = (data?.sessions ?? []) as (SessionRow & { expired?: boolean })[];
  const current = rows.find((r) => r.current) ?? null;
  const others = rows.filter((r) => !r.current);
  const now = nowMs();

  const endOthers = async () => {
    setBusy(true);
    try {
      const res = await signOutOthers();
      toast.success("Other devices signed out", {
        description: `${res.removed} session${res.removed === 1 ? "" : "s"} ended. This device stays signed in.`,
      });
      setExpanded(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign out the other devices");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const endOne = async (row: SessionRow) => {
    setEndingId(row.id);
    try {
      await signOutOne({ sessionId: row.id });
      toast.success("Device signed out");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign out that device");
    } finally {
      setEndingId(null);
    }
  };

  return (
    <section
      data-testid="security-tab"
      className="rounded-xl border border-border/60 bg-card p-4"
      aria-label="Security"
    >
      <h2 className="text-sm font-semibold">Security</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Password sign-in — there is no Google or SSO sign-in in this app.
      </p>

      {/* ---- Password ---- */}
      <div className="mt-3 flex min-h-10 items-center justify-between gap-3 border-b border-border/40 px-3 py-2">
        <span className="min-w-0">
          <span className="block text-[13px] font-medium">Password</span>
          <span className="block text-[11px] text-muted-foreground">
            {hasPassword
              ? "Set a new password with a code sent to your email."
              : "This account signs in with an emailed code."}
          </span>
        </span>
        <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
          <Link to="/auth">
            <KeyRound className="size-3.5" /> Change password
          </Link>
        </Button>
      </div>

      {/* ---- Sessions ---- */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold">Active sessions</h3>
          <p className="text-[11px] text-muted-foreground" data-testid="sessions-summary">
            {data === undefined
              ? "Loading your devices…"
              : `${rows.length} device${rows.length === 1 ? "" : "s"} · expire after ${data.lifetimeDays} days without activity`}
          </p>
        </div>
        {others.length > 0 &&
          (confirming ? (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                className="h-8"
                data-testid="sessions-end-others-confirm"
                disabled={busy}
                onClick={() => void endOthers()}
              >
                {busy ? "Signing out…" : `End ${others.length}`}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                disabled={busy}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              data-testid="sessions-end-others"
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              <LogOut className="size-3.5" /> Sign out other devices
            </Button>
          ))}
      </div>

      {data === undefined ? (
        <div className="mt-3 space-y-2" data-testid="sessions-skeleton">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg border border-border/60">
          {/* This device first — always expanded. */}
          {current ? (
            <SessionLine
              row={current}
              now={now}
              current
              busy={false}
              onSignOut={() => undefined}
            />
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              This device is not signed in (reload the page).
            </p>
          )}

          {/* Everything else, collapsed by default. */}
          {others.length > 0 && (
            <>
              <button
                type="button"
                data-testid="sessions-toggle-others"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
                className="flex min-h-10 w-full items-center justify-between gap-2 border-t border-border/40 bg-muted/40 px-3 text-left text-xs font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span>
                  {others.length} other device{others.length === 1 ? "" : "s"}
                </span>
                <span className="text-muted-foreground">{expanded ? "Hide" : "Show"}</span>
              </button>

              {expanded &&
                groupSessions(others).map((group) => (
                  <div key={group.key} data-testid={`sessions-group-${group.key}`}>
                    <p className="flex items-center gap-1.5 border-t border-border/40 bg-background/60 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
                      {/android|iphone|ipad/i.test(group.device.os) ? (
                        <Smartphone className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Monitor className="size-3.5" aria-hidden="true" />
                      )}
                      {group.device.label}
                      {group.sessions.length > 1 ? ` · ${group.sessions.length}` : ""}
                    </p>
                    {group.sessions.map((row) => (
                      <SessionLine
                        key={row.id}
                        row={row}
                        now={now}
                        busy={endingId === row.id}
                        onSignOut={() => void endOne(row)}
                      />
                    ))}
                  </div>
                ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function SessionLine({
  row,
  now,
  current,
  busy,
  onSignOut,
}: {
  row: SessionRow;
  now: number;
  current?: boolean;
  busy: boolean;
  onSignOut: () => void;
}) {
  const device = row.userAgent ? parseDevice(row.userAgent) : null;
  const inactive = !current && isInactiveSession(row.lastActive, now);
  const isTouch = /android|iphone|ipad/i.test(device?.os ?? "");

  return (
    <div
      data-testid={current ? "session-current" : `session-${row.id}`}
      className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/40 px-3 py-2 first:border-t-0"
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium">
          {isTouch ? (
            <Smartphone className="size-3.5 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Monitor className="size-3.5 text-muted-foreground" aria-hidden="true" />
          )}
          {device ? device.label : "Unknown device"}
          {current && (
            <span
              data-testid="session-current-badge"
              className="rounded-full border border-primary/30 bg-primary/5 px-1.5 py-px text-[10px] font-semibold text-primary"
            >
              This device
            </span>
          )}
          {inactive && (
            <span
              data-testid="session-inactive"
              className="rounded-full border border-border/70 bg-muted px-1.5 py-px text-[10px] font-semibold text-muted-foreground"
            >
              Inactive
            </span>
          )}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span data-tip={row.createdAt ? toDisplayStamp(row.createdAt) : undefined}>
            signed in {relativeTime(row.createdAt, now)}
          </span>
          <span aria-hidden="true">·</span>
          <span data-tip={row.lastActive ? toDisplayStamp(row.lastActive) : undefined}>
            last active {relativeTime(row.lastActive, now)}
          </span>
          {row.region && (
            <>
              <span aria-hidden="true">·</span>
              <span>{row.region}</span>
            </>
          )}
        </span>
      </span>

      {!current && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 gap-1 text-xs"
          data-testid={`session-signout-${row.id}`}
          disabled={busy}
          onClick={onSignOut}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
          Sign out
        </Button>
      )}
    </div>
  );
}
