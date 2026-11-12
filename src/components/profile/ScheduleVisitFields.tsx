/**
 * SCHEDULE + VISIT DATES — shared by the State Assessment and NQAS forms.
 *
 * The Schedule card holds only the planned dates. The Visit card owns the
 * explicit "same as scheduled" choice: ticked copies both actual dates from
 * the schedule, unticked leaves them manual and empty until typed.
 */

import { Link2 } from "lucide-react";

import {
  DateField,
  type FieldHistoryEntry,
} from "@/components/profile/ProfileFormKit";
import { dmy } from "@/lib/facilityProfileRules";
import {
  copyScheduleToVisit,
  visitLinkAvailability,
} from "@/lib/scheduleVisit";
import { cn } from "@/lib/utils";

export function ScheduleVisitFields({
  kind,
  today,
  canEdit,
  scheduledStart,
  scheduledEnd,
  originalScheduledDate,
  errors,
  history,
  onScheduledStartChange,
  onScheduledEndChange,
}: {
  kind: "sa" | "nqas";
  today: string;
  canEdit: boolean;
  scheduledStart: string;
  /** NQAS only — the State Assessment has a single scheduled date. */
  scheduledEnd?: string;
  originalScheduledDate?: string | null;
  errors: Record<string, string>;
  history: (dbColumn: string) => FieldHistoryEntry[];
  onScheduledStartChange: (value: string) => void;
  onScheduledEndChange?: (value: string) => void;
}) {
  const isNqas = kind === "nqas";
  const rescheduled =
    !!originalScheduledDate &&
    !!scheduledStart &&
    originalScheduledDate !== scheduledStart;

  return (
    <div className="space-y-3" data-testid={`${kind}-schedule-visit`}>
      <div className={cn("grid gap-4", isNqas && "sm:grid-cols-2")}>
        <DateField
          focusKey={isNqas ? "nqas.scheduledStartDate" : "sa.scheduledDate"}
          label={
            isNqas
              ? rescheduled
                ? "Scheduled start date (revised)"
                : "Scheduled start date"
              : rescheduled
                ? "Scheduled date (revised)"
                : "Scheduled date"
          }
          value={scheduledStart}
          onChange={onScheduledStartChange}
          disabled={!canEdit}
          disabledReason={canEdit ? undefined : "View only — visit dates need edit access"}
          requiredForStatus
          todayIso={today}
          error={errors[isNqas ? "scheduledStartDate" : "scheduledDate"]}
          history={history(isNqas ? "NQAS Scheduled Start Date" : "SA Scheduled Date")}
        />
        {isNqas && (
          <DateField
            focusKey="nqas.scheduledEndDate"
            label="Scheduled end date"
            value={scheduledEnd ?? ""}
            onChange={(v) => onScheduledEndChange?.(v)}
            disabled={!canEdit}
            disabledReason={canEdit ? undefined : "View only — visit dates need edit access"}
            requiredForStatus
            todayIso={today}
            emptyLabel="Same as start"
            error={errors.scheduledEndDate}
            history={history("NQAS Scheduled End Date")}
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground" data-testid={`${kind}-schedule-note`}>
        {rescheduled
          ? `Originally scheduled: ${dmy(originalScheduledDate ?? "")}.`
          : "Planned dates only — actual dates are entered in Visit."}
      </p>
    </div>
  );
}

/**
 * "Visit dates same as scheduled" — one large choice at the top of Visit.
 *
 * Ticked: both actual dates follow the schedule and are read-only. Unticked:
 * both fields are manual and are not auto-filled. A missing scheduled start
 * disables the choice with the exact reason.
 */
export function SameAsScheduledToggle({
  kind,
  scheduledStart,
  scheduledEnd,
  checked,
  canEdit,
  today,
  onChange,
}: {
  kind: "sa" | "nqas";
  scheduledStart: string;
  scheduledEnd?: string;
  checked: boolean;
  canEdit: boolean;
  today: string;
  onChange: (on: boolean) => void;
}) {
  const availability = visitLinkAvailability({
    scheduledStart,
    canEdit,
    todayIso: today,
  });
  const copied = copyScheduleToVisit(scheduledStart, scheduledEnd);
  const enabled = availability.enabled && !!copied;
  const range = copied
    ? `${dmy(copied.actualStartDate)} to ${dmy(copied.actualEndDate)}`
    : "No scheduled date";

  return (
    <label
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border px-3.5 py-3 transition-colors",
        checked && enabled
          ? "border-primary/50 bg-primary/5"
          : "border-border/70 bg-background/60",
        !enabled && "cursor-not-allowed opacity-70",
      )}
      data-testid={`${kind}-same-as-scheduled`}
      title={availability.reason ?? "Fill both actual dates from the schedule"}
    >
      <input
        type="checkbox"
        className="size-5 shrink-0 accent-[var(--primary)]"
        checked={checked}
        disabled={!enabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-label="Visit dates same as scheduled"
      />
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Link2 className="size-4 text-primary" aria-hidden /> Visit dates same as scheduled
      </span>
      <span className="text-sm text-muted-foreground">{range}</span>
      {!enabled && availability.reason && (
        <span className="basis-full text-xs font-medium text-amber-800">
          {availability.reason}
        </span>
      )}
    </label>
  );
}

/** The complete Visit date block — the ONE component both forms render. */
export function VisitDatesFields({
  kind,
  today,
  canEdit,
  scheduledStart,
  scheduledEnd,
  actualStart,
  actualEnd,
  sameAsScheduled,
  durationDays,
  errors,
  history,
  onSameAsScheduledChange,
  onActualStartChange,
  onActualEndChange,
}: {
  kind: "sa" | "nqas";
  today: string;
  canEdit: boolean;
  scheduledStart: string;
  scheduledEnd?: string;
  actualStart: string;
  actualEnd: string;
  sameAsScheduled: boolean;
  durationDays: number | null;
  errors: Record<string, string>;
  history: (dbColumn: string) => FieldHistoryEntry[];
  onSameAsScheduledChange: (on: boolean) => void;
  onActualStartChange: (value: string) => void;
  onActualEndChange: (value: string) => void;
}) {
  const prefix = kind === "nqas" ? "nqas" : "sa";
  const disabled = !canEdit;
  return (
    <>
      <SameAsScheduledToggle
        kind={kind}
        scheduledStart={scheduledStart}
        scheduledEnd={scheduledEnd}
        checked={sameAsScheduled}
        canEdit={canEdit}
        today={today}
        onChange={onSameAsScheduledChange}
      />
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <DateField
          focusKey={`${prefix}.actualStartDate`}
          label="Actual start date"
          value={actualStart}
          onChange={onActualStartChange}
          disabled={disabled}
          readOnly={sameAsScheduled}
          disabledReason={
            sameAsScheduled
              ? "Set by “Visit dates same as scheduled” — untick it to edit"
              : disabled
                ? "View only — you do not have edit access"
                : undefined
          }
          max={today}
          quickPicks="today"
          error={errors.actualStartDate}
          requiredForStatus
          helper="Required when the visit is completed. Future dates are blocked."
          history={history(
            kind === "nqas" ? "NQAS Actual Start Date" : "SA Actual Start Date",
          )}
        />
        <DateField
          focusKey={`${prefix}.actualEndDate`}
          label="Actual end date"
          value={actualEnd}
          onChange={onActualEndChange}
          disabled={disabled}
          readOnly={sameAsScheduled}
          disabledReason={
            sameAsScheduled
              ? "Set by “Visit dates same as scheduled” — untick it to edit"
              : disabled
                ? "View only — you do not have edit access"
                : undefined
          }
          max={today}
          quickPicks="today"
          error={errors.actualEndDate}
          requiredForStatus
          helper="Cannot be before the start date."
          durationDays={durationDays}
          history={history(
            kind === "nqas" ? "NQAS Actual End Date" : "SA Actual End Date",
          )}
        />
      </div>
      {!disabled && !sameAsScheduled && durationDays === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Single-day visit.</p>
      )}
    </>
  );
}
