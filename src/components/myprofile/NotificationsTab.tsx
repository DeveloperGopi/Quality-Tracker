/**
 * NOTIFICATIONS TAB — ONE small matrix instead of six loose toggles.
 *
 *   rows:    Needs attention · IA due reminder · Import results
 *   columns: In-app · Email
 *
 * The off state is explicit (outlined chip with the word "Off"), never a faint
 * grey switch you have to squint at, and every cell is a real
 * `role="switch"` with a readable name. Every change saves instantly with the
 * shared "Saved ✓ · Undo" marker. Digest frequency is a segmented control.
 */

import { Check } from "lucide-react";

import { Segmented } from "@/components/FieldEditor";
import { DIGEST_OPTIONS, NOTIFICATION_ROWS } from "@/lib/profileConfig";
import { SavedMarker } from "@/components/myprofile/PreferencesTab";
import { cn } from "@/lib/utils";

export type NotificationKey = string;

export default function NotificationsTab({
  notifications,
  email,
  savedKey,
  onUndo,
  onChange,
}: {
  notifications: Record<string, unknown>;
  email: string;
  savedKey: string | null;
  onUndo: () => void;
  onChange: (key: NotificationKey, value: unknown) => void;
}) {
  const hasEmail = email.trim().length > 0;

  return (
    <section
      data-testid="notifications-tab"
      className="rounded-xl border border-border/60 bg-card p-4"
      aria-label="Notifications"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Notifications</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            What reaches you in-app and by email.
          </p>
        </div>
        <SavedMarker show={savedKey?.startsWith("notifications.")} onUndo={onUndo} />
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-border/60">
        <table className="w-full border-collapse text-sm" data-testid="notifications-matrix">
          <thead>
            <tr className="bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-3 py-2 font-medium">
                Notification
              </th>
              <th scope="col" className="w-28 px-3 py-2 text-center font-medium">
                In-app
              </th>
              <th scope="col" className="w-28 px-3 py-2 text-center font-medium">
                Email
              </th>
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_ROWS.map((row) => {
              const inApp = notifications[row.inAppKey] !== false;
              const emailOn = notifications[row.emailKey] === true;
              return (
                <tr key={row.key} className="border-t border-border/40">
                  <th scope="row" className="px-3 py-2 text-left text-[13px] font-normal">
                    {row.label}
                  </th>
                  <td className="px-3 py-2 text-center">
                    <StateToggle
                      testId={`notif-${row.key}-inapp`}
                      label={`${row.label} — in-app`}
                      on={inApp}
                      onChange={(v) => onChange(row.inAppKey, v)}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StateToggle
                      testId={`notif-${row.key}-email`}
                      label={`${row.label} — email`}
                      on={emailOn}
                      disabled={!hasEmail}
                      onChange={(v) => onChange(row.emailKey, v)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!hasEmail && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Email notifications are unavailable — your account has no email address.
        </p>
      )}

      <div className="mt-4 flex min-h-10 flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-muted-foreground">Digest frequency</span>
        <Segmented
          testId="notif-digest"
          label="Digest frequency"
          value={String(notifications.digest ?? "daily")}
          options={DIGEST_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          onChange={(v) => onChange("digest", v)}
        />
      </div>
    </section>
  );
}

/**
 * On = filled with a check, Off = outlined chip reading "Off".
 * Status is never carried by colour alone.
 */
export function StateToggle({
  label,
  on,
  disabled,
  onChange,
  testId,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      data-testid={testId}
      data-state={on ? "on" : "off"}
      disabled={disabled}
      data-tip={disabled ? `${label} — unavailable` : undefined}
      onClick={() => onChange(!on)}
      className={cn(
        "inline-flex h-8 min-w-20 items-center justify-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/70 bg-background text-muted-foreground hover:border-foreground/40",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {on ? (
        <>
          <Check className="size-3.5" aria-hidden="true" /> On
        </>
      ) : (
        "Off"
      )}
    </button>
  );
}
