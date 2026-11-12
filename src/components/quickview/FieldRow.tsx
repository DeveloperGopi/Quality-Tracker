/**
 * FIELD ROW + FIELD EDITOR — one field of a quick-view section.
 *
 * View mode: the EXACT value the Master List shows (SmartCell reads the
 * central column config, so a blank is "-" and never 0).
 * Edit mode: the same row turns into the right control on click/Enter — the
 * row height is reserved up front (value line + validation line) so nothing
 * jumps when an editor or an inline message appears.
 *
 * Derived fields (Certification Cycle, Current Status, validity/due dates,
 * Fire NOC Validity Status, Documents Status) are never editable: they show a
 * lock with the reason from `readOnlyCellReason` — the same guard the grid
 * uses, so there is one list of what is editable.
 */

import { useId, useMemo, useState } from "react";
import { AlertTriangle, Lock, Pencil } from "lucide-react";

import { DateInput } from "@/components/DateInput";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttachmentPicker, type AttachmentValue } from "@/components/AttachmentPicker";
import { SmartCell, StatusPill } from "@/components/master/SmartCells";
import { StatusChip } from "@/components/StatusChip";
import { todayLocalIso } from "@/lib/today";
import { RESULT_DECLARED_LABEL, isResultDeclaredStatus } from "@/lib/resultDeclared";
import {
  EDIT_FIELD_BY_KEY,
  EDIT_SLOT_BY_KEY,
  isEditableCellKey,
  readOnlyCellReason,
  type TrackerEditorOptions,
} from "@/components/master/EditModeCells";
import type { MasterColumn, MasterRow } from "@/lib/masterColumns";
import { cn } from "@/lib/utils";
import { dmy } from "@/lib/facilityProfileRules";
import {
  recertificationState,
  statusForDisplay,
  visitFor,
  type QvIssue,
} from "@/lib/facilityQuickView";

/** Columns whose value the server derives — locked with an explicit reason. */
const DERIVED_KEYS = new Set([
  "certCycle",
  "pipelineStatus",
  "nocStatus",
  "validityDate",
  "nextAction",
  "saqshamNameCategory",
  "documentsStatusReport",
  /* Part H ④ — these are calculated, so they must say so. They are NOT
     import-only fields and must never claim to be. */
  "survDue1",
  "survDue2",
  "nqasIaQ1",
  "nqasIaQ2",
  "kayakalpIaQ1",
  "kayakalpIaQ2",
  "nqasIaCmp",
  "kayakalpIaCmp",
  "ecoIaCmp",
  "recertStatus",
  "recertYear",
]);

/** Column key → the settings option list that drives its editor. */
const OPTION_LIST: Record<string, keyof TrackerEditorOptions> = {
  saStatus: "saStatusOptions",
  certStatus: "certStatusOptions",
  genDoc: "docStatuses",
  buildingType: "buildingTypes",
  buildingStatus: "buildingStatuses",
  naMode: "assessmentModes",
  nocAvailable: "nocAvailableOptions",
  assessor1Hud: "assessorHudOptions",
  assessor2Hud: "assessorHudOptions",
};

export function fieldKeyFor(columnKey: string): string | null {
  return EDIT_FIELD_BY_KEY[columnKey] ?? null;
}

/** Display a draft value with the column's own format. */
export function draftDisplay(column: MasterColumn, raw: string): string {
  const v = (raw ?? "").trim();
  if (!v) return "-";
  switch (column.type) {
    case "date":
    case "dueDate":
      return dmy(v) || v;
    case "currency": {
      const n = Number(v);
      return Number.isNaN(n) ? v : `₹${n.toLocaleString("en-IN")}`;
    }
    case "score": {
      const n = Number(v);
      return Number.isNaN(n) ? v : `${n}%`;
    }
    default:
      return v;
  }
}

export function FieldRow({
  row,
  column,
  label,
  draftValue,
  initialValue,
  editing,
  canEdit,
  options,
  issue,
  active,
  onActivate,
  onDeactivate,
  onDraftChange,
  onFile,
}: {
  row: MasterRow;
  column: MasterColumn;
  label: string;
  /** Current draft value (undefined = untouched, show the saved cell). */
  draftValue?: string;
  /** Saved value, used to decide whether the row is marked as changed. */
  initialValue?: string;
  editing: boolean;
  canEdit: boolean;
  options: TrackerEditorOptions;
  issue?: QvIssue;
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onDraftChange: (field: string, value: string) => void;
  onFile?: (slot: string, value: AttachmentValue | null) => void;
}) {
  const field = fieldKeyFor(column.key);
  /* Part B: once the result is declared the portal status is set BY the rule —
     it is locked in every screen with the reason, never an editable select that
     could overwrite "Result Declared" with an older portal value. */
  const autoDeclared = field === "genDoc" && isResultDeclaredStatus(row.nqas?.certificationStatus);
  const derived = DERIVED_KEYS.has(column.key) || autoDeclared;
  const editable = canEdit && !!field && isEditableCellKey(column.key) && !autoDeclared;
  const changed =
    draftValue !== undefined &&
    initialValue !== undefined &&
    draftValue !== initialValue;
  const lockReason = autoDeclared
    ? `Set automatically because the result is declared — ${RESULT_DECLARED_LABEL}`
    : derived
      ? readOnlyCellReason(column.key)
      : !field
        ? "Edited in the Facility Profile"
        : null;
  const hintId = useId();

  return (
    <div
      data-qv-field={column.key}
      className={cn(
        // 40 px rows, two columns on wide screens and ONE column under 720 px
        // (task §7.2) — the label sits above its value on a phone.
        "group grid grid-cols-1 items-start gap-x-3 gap-y-0.5 border-b border-border/40 px-3 py-1.5 last:border-b-0 min-[720px]:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] min-[720px]:gap-y-0 min-[720px]:py-2",
        changed && "bg-amber-50/70",
        editing && editable && "hover:bg-muted/40",
      )}
    >
      <dt className="flex items-center gap-1.5 pt-1 text-[13px] leading-snug text-muted-foreground">
        {editing && editable ? (
          <Pencil className="size-3 shrink-0 text-muted-foreground/60" aria-hidden />
        ) : editing && lockReason ? (
          <Lock className="size-3 shrink-0 text-muted-foreground/60" aria-hidden />
        ) : null}
        <span className="min-w-0">{label}</span>
      </dt>
      <dd className="min-w-0">
        {editing && editable ? (
          <div className="min-h-8">
            {active ? (
              <FieldEditor
                column={column}
                value={draftValue ?? initialValue ?? ""}
                options={options}
                issue={issue}
                hintId={hintId}
                onChange={(v) => field && onDraftChange(field, v)}
                onDone={onDeactivate}
                onFile={onFile}
              />
            ) : (
              <button
                type="button"
                onClick={onActivate}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "F2" || e.key === " ") {
                    e.preventDefault();
                    onActivate();
                  }
                }}
                aria-describedby={issue ? hintId : undefined}
                aria-label={`${label}: ${draftDisplay(column, draftValue ?? initialValue ?? "")}. Edit`}
                className="flex min-h-8 w-full items-center gap-1.5 rounded-md px-1.5 text-left text-sm break-words transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="min-w-0 break-words">
                  {draftDisplay(column, draftValue ?? initialValue ?? "")}
                </span>
                {changed && (
                  <span className="ml-auto shrink-0 text-[10px] font-semibold text-amber-700">
                    edited
                  </span>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="min-h-8 pt-0.5">
            {draftValue !== undefined && draftValue !== "" ? (
              <span className="text-sm break-words">
                {draftDisplay(column, draftValue)}
              </span>
            ) : column.key === "surv1" || column.key === "surv2" ? (
              <VisitDateCell row={row} which={column.key} />
            ) : column.key === "recertStatus" || column.key === "recertYear" ? (
              <RecertCell row={row} withDetail={column.key === "recertStatus"} />
            ) : column.key === "pipelineStatus" ? (
              <span data-tip="Calculated automatically from eligibility, the assessment records and the settings">
                <StatusPill value={statusForDisplay(row)} />
              </span>
            ) : (
              <SmartCell row={row} column={column} fullText={column.key === "genDoc"} />
            )}
          </div>
        )}
        {/* Reserved line: a validation message never moves the row. */}
        {editing && (
          <p
            id={hintId}
            role={issue?.severity === "blocking" ? "alert" : undefined}
            className={cn(
              "mt-0.5 min-h-[15px] text-[11px] leading-tight",
              issue?.severity === "blocking" && "font-medium text-destructive",
              issue?.severity === "warning" && "text-amber-700",
            )}
          >
            {issue ? (
              <span className="flex items-start gap-1">
                <AlertTriangle className="mt-px size-3 shrink-0" aria-hidden />
                {issue.message}
              </span>
            ) : lockReason ? (
              <span className="text-muted-foreground/70">{lockReason}</span>
            ) : null}
          </p>
        )}
      </dd>
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Surveillance / recertification cells (one visit rule)                       */
/* --------------------------------------------------------------------------- */

/** A recorded done date plus the visit's REAL state: "Done 17-Aug-2026" with
 *  "1 day early", or a red "Future date" when the stored date cannot be a real
 *  visit. A done visit never reads Overdue/Due (task §3.1). */
export function VisitDateCell({
  row,
  which,
}: {
  row: MasterRow;
  which: "surv1" | "surv2";
}) {
  const today = todayLocalIso();
  const visit = visitFor(row, which, today);
  const done = visit?.done ?? null;
  if (!done) return <span className="text-sm text-muted-foreground">-</span>;
  const future = done > today;
  return (
    <span
      className="flex min-w-0 flex-wrap items-center gap-1.5"
      data-tip={
        future
          ? "Future date — a done date cannot be after today. Fix it in Admin → Data checks → Surveillance dates."
          : visit?.detail ?? undefined
      }
    >
      <span className={cn("text-sm tabular-nums", future && "font-semibold text-rose-700")}>
        {dmy(done)}
      </span>
      <StatusChip
        size="sm"
        label={future ? "Future date" : (visit?.chip ?? "Done")}
        tone={future ? "red" : "green"}
      />
      {!future && visit?.detail && (
        <span className="text-[11px] text-muted-foreground">{visit.detail}</span>
      )}
    </span>
  );
}

/** Recertification as a short pill ("Not due yet" / "Due 2028" / "Overdue
 *  2028") and, on the status row, the plain next-recertification sentence. */
export function RecertCell({
  row,
  withDetail = false,
}: {
  row: MasterRow;
  withDetail?: boolean;
}) {
  const state = recertificationState(row);
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <StatusChip size="sm" label={state.label} tone={state.tone} />
      {withDetail && state.detail && (
        <span className="text-[11px] text-muted-foreground">{state.detail}</span>
      )}
    </span>
  );
}

/* --------------------------------------------------------------------------- */
/* Editor                                                                      */
/* --------------------------------------------------------------------------- */

function FieldEditor({
  column,
  value,
  options,
  issue,
  hintId,
  onChange,
  onDone,
  onFile,
}: {
  column: MasterColumn;
  value: string;
  options: TrackerEditorOptions;
  issue?: QvIssue;
  hintId: string;
  onChange: (value: string) => void;
  onDone: () => void;
  onFile?: (slot: string, value: AttachmentValue | null) => void;
}) {
  const slot = EDIT_SLOT_BY_KEY[column.key];
  const list = OPTION_LIST[column.key] ? options[OPTION_LIST[column.key]] : null;
  const choices = useMemo(() => {
    if (!list) return null;
    if (Array.isArray(list) && typeof list[0] === "object")
      return (list as { value: string; label: string }[]).map((o) => o.value);
    return list as string[];
  }, [list]);

  if (slot && onFile) {
    return (
      <div className="rounded-md border border-border/60 bg-background p-2">
        <AttachmentPicker label={column.label} onChange={(v) => onFile(slot, v)} />
      </div>
    );
  }

  if (column.type === "date" || column.type === "dueDate") {
    return (
      <DateEditor
        value={value}
        onChange={onChange}
        onDone={onDone}
        max={
          ["certDate", "surv1", "surv2", "nocCertified", "saStart", "saEnd"].includes(
            column.key,
          )
            ? todayLocalIso()
            : undefined
        }
      />
    );
  }

  if (column.type === "score") {
    const n = Number(value);
    const pct = Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
    return (
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          type="number"
          min={0}
          max={100}
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) onDone();
            if (e.key === "Escape") onDone();
          }}
          aria-invalid={issue?.severity === "blocking" || undefined}
          aria-describedby={issue ? hintId : undefined}
          className="h-8 w-24 text-sm"
        />
        <span className="flex h-1.5 w-24 overflow-hidden rounded-full bg-muted">
          <span
            className={cn(
              "h-full rounded-full",
              pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
      </div>
    );
  }

  if (column.type === "currency") {
    return (
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">₹</span>
        <Input
          autoFocus
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) onDone();
            if (e.key === "Escape") onDone();
          }}
          className="h-8 text-sm"
        />
      </div>
    );
  }

  if (column.key === "nocAvailable") {
    // Two options → segmented control (no dropdown for Yes/No).
    return (
      <div
        role="group"
        aria-label="NOC Available"
        className="flex gap-1 rounded-md border border-border/60 bg-muted/40 p-0.5"
      >
        {["Yes", "No"].map((choice) => (
          <button
            key={choice}
            type="button"
            aria-pressed={value === choice}
            onClick={() => {
              onChange(choice);
              onDone();
            }}
            className={cn(
              "min-h-8 flex-1 rounded px-3 text-xs font-medium transition-colors",
              value === choice
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {choice}
          </button>
        ))}
      </div>
    );
  }

  if (choices && choices.length >= 2 && choices.length <= 4) {
    return (
      <div
        role="group"
        aria-label={column.label}
        className="flex flex-wrap gap-1 rounded-md border border-border/60 bg-muted/40 p-0.5"
      >
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            aria-pressed={value === choice}
            onClick={() => {
              onChange(choice);
              onDone();
            }}
            className={cn(
              "min-h-8 rounded px-2 text-xs font-medium transition-colors",
              value === choice
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {choice}
          </button>
        ))}
      </div>
    );
  }

  if (choices) {
    return (
      <Select
        value={value}
        onValueChange={(v) => {
          onChange(v);
          onDone();
        }}
      >
        <SelectTrigger autoFocus className="h-8 text-sm" aria-describedby={issue ? hintId : undefined}>
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {choices.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (column.type === "longtext") {
    return (
      <textarea
        autoFocus
        value={value}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onDone();
          if (e.key === "Escape") onDone();
        }}
        className="w-full resize-none rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />
    );
  }

  return (
    <Input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        // Enter never submits the whole dialog: it commits the field only.
        if (e.key === "Enter") {
          e.preventDefault();
          onDone();
        }
        if (e.key === "Escape") onDone();
      }}
      aria-invalid={issue?.severity === "blocking" || undefined}
      aria-describedby={issue ? hintId : undefined}
      className="h-8 text-sm"
    />
  );
}

/** The shared DateInput, auto-opened inside the row editor. */
function DateEditor({
  value,
  onChange,
  onDone,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  onDone: () => void;
  max?: string;
}) {
  const id = useId();
  return (
    <DateInput
      id={`qv-date-${id}`}
      label="Date"
      value={value}
      onChange={onChange}
      onRequestClose={onDone}
      max={max}
      today={todayLocalIso()}
      compact
      autoOpen
    />
  );
}
