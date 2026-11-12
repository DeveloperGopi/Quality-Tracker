import { deriveFlatLifecycle } from "@/convex/lifecycle";

/** The current local calendar date as ISO yyyy-mm-dd.
 *
 *  Deliberately avoids `toISOString()`, which is UTC-based: near midnight in
 *  non-UTC timezones it returns yesterday or tomorrow's calendar date. All
 *  client-side "is this date upcoming?" comparisons must use this so the
 *  assessment-schedule status follows the user's real calendar date. */
export function todayLocalIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** True when `iso` (yyyy-mm-dd) is today or a future calendar date. */
export function isTodayOrFuture(iso: string | null | undefined): boolean {
  return !!iso && iso >= todayLocalIso();
}

/** True when `iso` (yyyy-mm-dd) is a date before today. */
export function isPastDate(iso: string | null | undefined): boolean {
  return !!iso && iso < todayLocalIso();
}

/** Date-primary Fire NOC status — mirrors the backend `deriveFireNocStatus`
 *  in convex/lifecycle.ts (used for the master list / category pages) so the
 *  Reports column follows the same validity-date rule: past validity ⇒
 *  Expired, inside the 90-day alert window ⇒ Expiring Soon, otherwise Valid.
 *  NOC Available = No (or no validity date recorded) ⇒ Not Obtained. */
export function deriveFireNocStatus(
  nocAvailable: string | null | undefined,
  expiryDate: string | null | undefined,
  storedStatus: string | null | undefined,
  leadDays = 90,
  /** Injectable IST date so line-list quick filters and tests agree. */
  today = todayLocalIso(),
): string {
  if (nocAvailable === "No") return "Not Obtained";
  if (!expiryDate) return storedStatus || "Not Obtained";
  if (expiryDate < today) return "Expired";
  const daysLeft = Math.round((Date.parse(expiryDate) - Date.parse(today)) / 86_400_000);
  return daysLeft <= leadDays ? "Expiring Soon" : "Valid";
}

/** Date-primary NQAS schedule rule.
 *
 *  The Assessment Start date decides whether a facility shows as "NA
 *  Scheduled": today or any upcoming date ⇒ Scheduled — regardless of the
 *  NA record's status field. A past start date is NEVER Scheduled; only the
 *  assessment's actual completion/status information may classify it, and
 *  here that means an explicit Scheduled signal with no date at all.
 *
 *  Returns "Scheduled" or null (any other status comes from completion
 *  fields like certification status / document stage, handled elsewhere). */
export function deriveNqasScheduleStatus(
  certStatus: string | null | undefined,
  naStatus: string | null | undefined,
  naStartDate: string | null | undefined,
  docStage: string | null | undefined,
): "Scheduled" | null {
  // Delegates to the shared lifecycle rule so the Reports / master-list
  // columns match the dashboard exactly (see deriveFlatLifecycle).
  return deriveFlatLifecycle({
    certStatus: certStatus ?? null,
    naStatus: naStatus ?? null,
    naStartDate: naStartDate ?? null,
    docStatus: docStage ?? null,
  }).nqasScheduled
    ? "Scheduled"
    : null;
}
