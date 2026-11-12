// AssessmentForms — the sectioned State Assessment and NQAS Assessment
// forms on the Facility Profile (Part B).
//
// Both forms share the same machinery:
//   • a local DRAFT seeded from the saved record + any locally saved draft
//     (restored on load, auto-saved every few seconds, dropped on save);
//   • dirty tracking per field → "Unsaved changes (n)" in StickySaveBar;
//   • validation from lib/facilityProfileRules (the same rules the Convex
//     mutations re-check server-side) with inline errors + a summary banner
//     with click-to-focus;
//   • sectioned layout with a sticky rail, per-section completion ticks,
//     plain-language hints, "Last updated by … · relative time" footers,
//     field-level history clocks fed by the audit trail;
//   • quick actions (duplicate assessors, reset section, mark not applicable,
//     undo last save, print) — all draft operations, nothing persists until
//     Save, so they are always safe to try;
//   • beforeunload warning while dirty; Ctrl/Cmd+S handled by StickySaveBar.
//
// Enter never submits (no <form> element, every button is type="button"),
// and tab order follows the visual section order by construction.

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  CalendarPlus,
  Check,
  Copy,
  Lock,
  MoreVertical,
  Printer,
  RotateCcw,
  Undo2,
  X,
} from "lucide-react";
import { isResultDeclaredStatus } from "@/lib/resultDeclared";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentSlot } from "@/components/documents/DocumentSlot";
import { toLongDisplayDate } from "@/lib/format";
import { showSaveError } from "@/lib/saveError";
import { docStageLabel } from "@/lib/reportPipeline";
import { todayLocalIso } from "@/lib/today";
import {
  DEFAULT_SETTINGS,
  computeDerivedNqas,
  type LifecycleSettings,
} from "@/convex/lifecycle";
import {
  NQAS_SECTIONS,
  NQAS_FIELDS,
  SA_SECTIONS,
  SA_FIELDS,
  dmy,
  validateNqasDraft,
  validateSaDraft,
  type FieldDef,
  type FieldIssue,
  type NqasDraft,
  type SaDraft,
} from "@/lib/facilityProfileRules";
import {
  AssessorAutocomplete,
  DateField,
  FieldFrame,
  FormSection,
  ScoreInput,
  SectionRail,
  SegmentedControl,
  StickySaveBar,
  StatusBanner,
  ValidationSummary,
  ValidityTimeline,
  clearDraft,
  focusField,
  loadDraft,
  saveDraft,
  type SectionState,
} from "@/components/profile/ProfileFormKit";
import {
  ScheduleVisitFields,
  VisitDatesFields,
} from "@/components/profile/ScheduleVisitFields";
import { copyScheduleToVisit } from "@/lib/scheduleVisit";

// ---------------------------------------------------------------------------
// Shared types and helpers
// ---------------------------------------------------------------------------

/** The audit rows the profile query hands us — per-field history and the
 *  "Last updated by" footers. */
export type AuditLite = {
  _id: string;
  changedAt: number;
  changedByName?: string | null;
  field?: string | null;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
  table?: string;
};

type HistoryEntry = {
  oldValue: unknown;
  newValue: unknown;
  changedByName?: string | null;
  changedAt: number;
};

/** Audit entries for one DB column of one table, newest first. */
function historyFor(
  audits: AuditLite[],
  table: string,
  dbColumn: string,
): HistoryEntry[] {
  return audits
    .filter((a) => a.table === table && a.field === dbColumn)
    .map((a) => ({
      oldValue: a.oldValue,
      newValue: a.newValue,
      changedByName: a.changedByName,
      changedAt: a.changedAt,
    }));
}

/** Newest audit entry for a table — powers the "Last updated by …" line. */
function lastTouched(
  audits: AuditLite[],
  table: string,
): { who: string; when: number } | null {
  const a = audits
    .filter((x) => x.table === table)
    .sort((x, y) => y.changedAt - x.changedAt)[0];
  return a ? { who: a.changedByName ?? "System", when: a.changedAt } : null;
}

/** Issues keyed by bare field key ("sa.actualEndDate" → "actualEndDate"). */
function issuesByField(issues: FieldIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) out[i.field.replace(/^[a-z]+\./, "")] = i.message;
  return out;
}

/** Completion state for one form section: tick when every field of the
 *  section holds a value, count of validation issues landing in it. */
/** Section-completion values: a file field counts as filled when the LIVE
 *  `facility_document` row exists (the shared slot), never from a legacy
 *  draft column that nothing writes any more. */
function withDocumentPresence(
  values: Record<string, unknown>,
  uploaded: ReadonlySet<string>,
  mapping: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const [field, docKey] of Object.entries(mapping)) {
    out[field] = uploaded.has(docKey) ? "uploaded" : "";
  }
  return out;
}

function sectionState(
  defs: FieldDef[],
  sectionId: string,
  issues: FieldIssue[],
  values: Record<string, unknown>,
): SectionState {
  const inSection = defs.filter((d) => d.section === sectionId);
  let filled = 0;
  for (const d of inSection) {
    const v = values[d.key];
    if (Array.isArray(v)) {
      if (v.length > 0) filled++;
    } else if (v != null && String(v).trim() !== "") filled++;
  }
  const issueCount = issues.filter((i) =>
    inSection.some((d) => i.field.endsWith(`.${d.key}`) || i.field === d.key),
  ).length;
  return {
    done: inSection.length > 0 && filled === inSection.length,
    issues: issueCount,
  };
}

// ---------------------------------------------------------------------------
// useDraft — local draft + dirty tracking + autosave + restore + unload guard
// ---------------------------------------------------------------------------

function useDraft<T extends object>(key: string, initial: T) {
  const [draft, setDraft] = useState<T>(() => loadDraft(key, initial));
  const initialJson = JSON.stringify(initial);
  const initialRef = useRef(initial);
  const initialJsonRef = useRef(initialJson);
  const draftRef = useRef(draft);
  // Sync the refs after render (react-compiler rule: no ref writes while
  // rendering) — the autosave interval and save path read them.
  useEffect(() => {
    initialRef.current = initial;
    initialJsonRef.current = initialJson;
    draftRef.current = draft;
  });

  const dirtyKeys = useMemo(() => {
    let base: Record<string, unknown> = {};
    try {
      base = JSON.parse(initialJson) as Record<string, unknown>;
    } catch {
      base = {};
    }
    const rec = draft as Record<string, unknown>;
    return Object.keys(rec).filter(
      (k) =>
        JSON.stringify(rec[k] ?? null) !== JSON.stringify(base[k] ?? null),
    );
  }, [draft, initialJson]);

  // Re-seed from the server record whenever it changes — but never clobber
  // unsaved local edits (a concurrent update simply keeps our draft).
  useEffect(() => {
    setDraft((prev) =>
      JSON.stringify(prev) !== initialJson
        ? prev
        : loadDraft(key, initialRef.current),
    );
  }, [key, initialJson]);

  // "Draft restored" notice — only when there really was unsaved work.
  const [restored] = useState(() => {
    const d = loadDraft(key, initial);
    return JSON.stringify(d) !== JSON.stringify(initial);
  });
  useEffect(() => {
    if (!restored) return;
    toast.info("Unsaved draft restored", {
      description: "Picking up where you left off — press Save when ready.",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave every 4s (and immediately when the tab closes or after a
  // revert) so slow networks and accidental taps never lose work.
  useEffect(() => {
    const maybeSave = () => {
      if (JSON.stringify(draftRef.current) !== initialJsonRef.current) {
        saveDraft(key, draftRef.current);
      } else {
        clearDraft(key); // clean state must not leave a stale draft behind
      }
    };
    const iv = window.setInterval(maybeSave, 4000);
    const onUnload = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(draftRef.current) !== initialJsonRef.current) {
        saveDraft(key, draftRef.current);
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener("beforeunload", onUnload);
      maybeSave();
    };
  }, [key]);

  const set = <K extends keyof T>(k: K, v: T[K]) =>
    setDraft((f) => ({ ...f, [k]: v }));

  const discard = () => {
    clearDraft(key);
    setDraft(initialRef.current);
  };

  return { draft, set, setDraft, dirtyKeys, dirtyCount: dirtyKeys.length, discard };
}

// ---------------------------------------------------------------------------
// QuickActionsMenu — the ⋮ menu inside each assessment form
// ---------------------------------------------------------------------------

type QuickItem = {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
};

function QuickActionsMenu({ items }: { items: QuickItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0 print:hidden"
          aria-label="Quick actions for this assessment"
          data-tip="Quick actions"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((it, i) => (
          <div key={`${it.label}-${i}`}>
            {it.separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={it.disabled}
              onSelect={(e) => {
                e.preventDefault();
                it.onSelect();
              }}
              className={cn("gap-2", it.danger && "text-destructive focus:text-destructive")}
            >
              {it.icon} {it.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Scope cards — one optional choice, sourced from Admin > General. */
function ScopeChoiceCards({
  focusKey,
  value,
  options,
  disabled,
  error,
  onChange,
}: {
  focusKey: string;
  value: string;
  options: string[];
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldFrame
      focusKey={focusKey}
      label="Which scope was assessed?"
      error={error}
      helper="Optional — choose one. Click the selected card again, or use Clear, to unselect."
    >
      <div
        role="group"
        aria-label="Which scope was assessed?"
        data-focus={focusKey}
        tabIndex={-1}
        className="grid gap-2 sm:grid-cols-2"
      >
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(selected ? "" : option)}
              className={cn(
                "flex min-h-12 items-center gap-2 rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
                selected
                  ? "border-blue-500 bg-blue-50 text-blue-950 shadow-sm"
                  : "border-border/70 bg-background/60 text-foreground hover:bg-muted",
              )}
            >
              <span className="min-w-0 flex-1">{option}</span>
              {selected && <Check className="size-4 shrink-0 text-blue-600" aria-hidden />}
            </button>
          );
        })}
      </div>
      {value && (
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange("")}
            className="h-8 gap-1 text-xs"
          >
            <X className="size-3.5" /> Clear
          </Button>
        </div>
      )}
    </FieldFrame>
  );
}

/** "Last changed 28-Oct-2026 · Gopinath P" — ONE line from the audit log.
 *
 *  It takes every table this section writes: the assessment row AND
 *  `facilityDocuments` (a document uploaded in the section IS a change), so
 *  the line can never say "never edited" beside a freshly uploaded file. The
 *  date is absolute — never "5 days ago" next to a contradicting line. */
function UpdatedFooter({
  audits,
  table,
  extraTables = [],
}: {
  audits: AuditLite[];
  table: string;
  extraTables?: string[];
}) {
  const tables = new Set([table, ...extraTables]);
  const latest = audits
    .filter((a) => a.table && tables.has(a.table))
    .sort((a, b) => b.changedAt - a.changedAt)[0];
  const when = latest
    ? toLongDisplayDate(new Date(latest.changedAt).toISOString().slice(0, 10))
    : null;
  return (
    <p
      data-testid={`section-footer-${table}`}
      className="mt-3 border-t border-border/50 pt-2 text-[11px] text-muted-foreground"
    >
      {latest && when
        ? `Last changed ${when} · ${latest.changedByName ?? "System"}`
        : "No changes recorded yet — this section has never been edited."}
    </p>
  );
}

/** lowercase name → HUD, for the assessor auto-suggest. */
function assessorHudIndex(pool: { name: string; hud: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of pool) {
    const name = a.name?.trim();
    if (name && a.hud && !out[name.toLowerCase()]) out[name.toLowerCase()] = a.hud;
  }
  return out;
}

// ---------------------------------------------------------------------------
// State Assessment form
// ---------------------------------------------------------------------------

type SaRecord = {
  status: string;
  scheduledDate?: string;
  originalScheduledDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  scopeOption?: string;
  scorePercent?: number;
  generalDocStatus?: string;
  generalDocUpdatedAt?: number;
  assessor1Name?: string;
  assessor1Designation?: string;
  assessor1Phone?: string;
  assessor1Hud?: string;
  assessor2Name?: string;
  assessor2Designation?: string;
  assessor2Phone?: string;
  assessor2Hud?: string;
};

/** Form state = the rules' SaDraft. Documents live in `facility_document`
 *  (the shared DocumentSlot), never in a form draft, so an upload cannot be
 *  lost by discarding the form. */
type SaFormDraft = SaDraft;

const SA_TABLE = "stateAssessments";

function saToDraft(sa: SaRecord): SaFormDraft {
  return {
    scheduledDate: sa.scheduledDate ?? "",
    actualStartDate: sa.actualStartDate ?? "",
    actualEndDate: sa.actualEndDate ?? "",
    scopeOption: sa.scopeOption ?? "",
    scorePercent: sa.scorePercent != null ? String(sa.scorePercent) : "",
    generalDocStatus: sa.generalDocStatus ?? "",
    assessor1Name: sa.assessor1Name ?? "",
    assessor1Designation: sa.assessor1Designation ?? "",
    assessor1Phone: sa.assessor1Phone ?? "",
    assessor1Hud: sa.assessor1Hud ?? "",
    assessor2Name: sa.assessor2Name ?? "",
    assessor2Designation: sa.assessor2Designation ?? "",
    assessor2Phone: sa.assessor2Phone ?? "",
    assessor2Hud: sa.assessor2Hud ?? "",
  };
}

/** True when the saved/current pair exactly matches the schedule copy. */
function datesMatchSchedule(
  scheduledStart: string,
  scheduledEnd: string | undefined,
  actualStart: string,
  actualEnd: string,
): boolean {
  const copied = copyScheduleToVisit(scheduledStart, scheduledEnd);
  return (
    !!copied &&
    !!actualStart &&
    copied.actualStartDate === actualStart &&
    copied.actualEndDate === actualEnd
  );
}

/** Blank values for "Mark not applicable (clear whole form)". */
function emptyDraft(
  base: Record<string, unknown>,
  keep: string[] = [],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(base)) {
    if (keep.includes(k)) continue;
    out[k] = Array.isArray(base[k]) ? [] : "";
  }
  return out;
}

export function SaForm({
  sa,
  facilityId,
  cycleId,
  statuses,
  assessorHuds,
  scopeOptions,
  disabled,
  lockReason,
  audits,
  assessorPool,
  maskPhones = false,
  duplicateSource,
  certificationStatus,
  onStartCycle,
  startCycleLabel,
  onSave,
}: {
  sa: SaRecord;
  /** The active cycle's NQAS certification result — when it is declared the
   *  SaQsham Documents Status is automatic (locked) instead of hand-picked. */
  certificationStatus?: string;
  facilityId: string;
  cycleId: string;
  statuses: string[];
  assessorHuds: string[];
  scopeOptions: string[];
  /** Viewer privacy — show only the last four digits of each contact number. */
  maskPhones?: boolean;
  disabled: boolean;
  lockReason?: string | null;
  audits: AuditLite[];
  /** Directory entries harvested from every cycle of this facility. */
  assessorPool: { name: string; designation?: string; phone?: string; hud: string }[];
  /** Previous cycle's assessors for the duplicate action (null = first). */
  duplicateSource: SaRecord | null;
  onStartCycle?: () => void;
  startCycleLabel?: string;
  onSave: (vals: Record<string, unknown>) => Promise<void>;
}) {
  const draftKey = `nqas:sa-draft:${facilityId}:${cycleId}`;
  const initial = useMemo(() => saToDraft(sa), [sa]);
  const { draft, set, setDraft, dirtyCount, discard } = useDraft<SaFormDraft>(
    draftKey,
    initial,
  );
  const [busy, setBusy] = useState(false);
  const undoRef = useRef<SaFormDraft | null>(null);
  // Render-time mirror of undoRef.current (react-compiler: refs can't be
  // read while rendering) — flips true the first time this session saves.
  const [canUndo, setCanUndo] = useState(false);
  const today = todayLocalIso();
  // A saved record starts linked only when both saved actual dates equal the
  // schedule (a blank scheduled end means the visit was one day).
  const [sameAsScheduled, setSameAsScheduled] = useState(() =>
    datesMatchSchedule(
      sa.scheduledDate ?? "",
      "",
      sa.actualStartDate ?? "",
      sa.actualEndDate ?? "",
    ),
  );
  // While linked, every schedule change writes BOTH actual dates together.
  useEffect(() => {
    if (!sameAsScheduled) return;
    const copied = copyScheduleToVisit(draft.scheduledDate, "");
    if (!copied) {
      setSameAsScheduled(false);
      return;
    }
    if (
      draft.actualStartDate !== copied.actualStartDate ||
      draft.actualEndDate !== copied.actualEndDate
    ) {
      setDraft((f) => ({ ...f, ...copied }));
    }
  }, [
    sameAsScheduled,
    draft.scheduledDate,
    draft.actualStartDate,
    draft.actualEndDate,
    setDraft,
  ]);
  // Result Declared: quality certified / with conditionality / deferred →
  // SaQsham Documents Status is written by the same transaction as the cert
  // edit (facilities.ts), so the form shows it locked instead of editable.
  const resultDeclared = isResultDeclaredStatus(certificationStatus);
  /* The live document rows (the SAME subscription the Documents card and the
     slots read): section completion reads them, never a legacy draft column. */
  const documents = useQuery(api.documents.listForFacility, {
    facilityId: facilityId as never,
  });
  const uploadedDocKeys = new Set(
    ((documents?.documents ?? []) as { key: string; current?: unknown }[])
      .filter((d) => d.current)
      .map((d) => d.key),
  );

  // ---- derived status (never hand-picked; sticky "Completed" like before) ----
  const saDone =
    !!draft.actualEndDate || !!draft.actualStartDate || sa.status === "Completed";
  const saScheduled = !!draft.scheduledDate;
  const derivedStatus = saDone ? "Completed" : saScheduled ? "Scheduled" : "Not Yet Initiated";
  const statusLabel = saDone ? "SA Completed" : saScheduled ? "SA Scheduled" : "SA Pending";
  const statusTone: "green" | "blue" | "grey" = saDone ? "green" : saScheduled ? "blue" : "grey";

  // ---- validation (the same rules the mutation re-checks) ----
  const issues = useMemo(() => {
    const base = validateSaDraft(draft, today);
    // A recorded score can't be removed by clearing the box — the API only
    // accepts numbers. Say so instead of silently keeping the old value.
    if (sa.scorePercent != null && draft.scorePercent === "") {
      base.push({
        field: "sa.scorePercent",
        label: "Score %",
        message: `A recorded score can't be removed by clearing the box — enter the score again (it was ${sa.scorePercent}%).`,
      });
    }
    return base;
  }, [draft, today, sa.scorePercent]);
  const byField = issuesByField(issues);

  const durationDays =
    draft.actualStartDate && draft.actualEndDate
      ? Math.round(
          (Date.parse(draft.actualEndDate) - Date.parse(draft.actualStartDate)) / 86_400_000,
        )
      : null;

  const onScheduledChange = (value: string) => set("scheduledDate", value);

  const onSameAsScheduledChange = (on: boolean) => {
    setSameAsScheduled(on);
    if (!on) {
      // Unticked fields are manual and start empty — never stale copied dates.
      setDraft((f) => ({ ...f, actualStartDate: "", actualEndDate: "" }));
      return;
    }
    const copied = copyScheduleToVisit(draft.scheduledDate, "");
    if (copied) setDraft((f) => ({ ...f, ...copied }));
  };

  const onStartDateChange = (value: string) => set("actualStartDate", value);
  const onEndDateChange = (value: string) => set("actualEndDate", value);

  // ---- save -------------------------------------------------------------
  const doSave = async () => {
    // No missing date is invented. A completed visit must arrive with BOTH
    // actual dates already present; the validation below blocks it otherwise.
    let effective = draft;
    if (sameAsScheduled) {
      // One save writes both linked dates, so the pair can never be half-filled.
      const copied = copyScheduleToVisit(effective.scheduledDate, "");
      if (copied) effective = { ...effective, ...copied };
    }
    const effectiveIssues = validateSaDraft(effective, today);
    if (
      saDone &&
      (!effective.actualStartDate || !effective.actualEndDate) &&
      !effectiveIssues.some((issue) => issue.field === "sa.actualStartDate")
    ) {
      effectiveIssues.push({
        field: "sa.actualStartDate",
        label: "Actual dates",
        message:
          "A completed visit needs both actual dates. Enter the actual start date and actual end date before saving.",
      });
    }
    if (effectiveIssues.length > 0) {
      toast.error(`Fix ${effectiveIssues.length} issue${effectiveIssues.length === 1 ? "" : "s"} first`, {
        description: effectiveIssues[0].message,
      });
      focusField(effectiveIssues[0].field);
      return;
    }
    undoRef.current = { ...initial };
    setCanUndo(true);
    if (derivedStatus !== sa.status) {
      // Short confirmation of the derived-status side effects before writing.
      toast.info(
        `This will change SA Status to “${derivedStatus}” — Facility Current Status, Eligibility and the master-list columns update automatically.`,
      );
    }
    const payload = {
      status: derivedStatus,
      scheduledDate: effective.scheduledDate,
      actualStartDate: effective.actualStartDate,
      actualEndDate: effective.actualEndDate,
      scopeOption: draft.scopeOption ?? "",
      dateSource: sameAsScheduled ? "same as scheduled" : undefined,
      scorePercent: effective.scorePercent === "" ? undefined : Number(effective.scorePercent),
      // Text fields send the raw value so a clear persists; empty equal to
      // the stored value is skipped server-side without an audit entry.
      assessor1Name: draft.assessor1Name,
      assessor1Designation: draft.assessor1Designation,
      assessor1Phone: draft.assessor1Phone,
      assessor1Hud: draft.assessor1Hud,
      assessor2Name: draft.assessor2Name,
      assessor2Designation: draft.assessor2Designation,
      assessor2Phone: draft.assessor2Phone,
      assessor2Hud: draft.assessor2Hud,
    };
    setBusy(true);
    try {
      await onSave(payload);
      clearDraft(draftKey);
      toast.success("State assessment saved");
    } catch (err) {
      // Rollback = keep the draft; nothing typed is lost.
      saveDraft(draftKey, draft);
      showSaveError(err);
    } finally {
      setBusy(false);
    }
  };

  const doDiscard = () => {
    discard();
    setSameAsScheduled(
      datesMatchSchedule(
        initial.scheduledDate,
        "",
        initial.actualStartDate,
        initial.actualEndDate,
      ),
    );
    toast("Changes discarded", { description: "Back to the last saved values." });
  };

  // ---- section states ----------------------------------------------------
  const rail = SA_SECTIONS.map((s) => ({
    id: s.id,
    title: s.title,
    state: sectionState(
      SA_FIELDS,
      s.id,
      issues,
      withDocumentPresence(draft as Record<string, unknown>, uploadedDocKeys, {
        reportAttachmentId: "SA_Report",
        checklistAttachmentId: "SA_Checklist",
      }),
    ),
  }));
  const h = (key: string) => historyFor(audits, SA_TABLE, key);
  const suggestions = [...new Set(assessorPool.map((a) => a.name).filter(Boolean))];
  const hudByName = assessorHudIndex(assessorPool);
  const designations = [
    ...new Set(
      assessorPool.map((a) => (a.designation ?? "").trim()).filter(Boolean),
    ),
  ];
  /* Assessor directory: the last designation/phone/HUD seen for each name. */
  const dirByName: Record<
    string,
    { designation?: string; phone?: string; hud?: string }
  > = {};
  for (const a of assessorPool) {
    const key = a.name.trim().toLowerCase();
    if (!key || dirByName[key]) continue;
    dirByName[key] = { designation: a.designation, phone: a.phone, hud: a.hud };
  }
  const applyAssessorName = (n: 1 | 2, value: string) => {
    const hit = dirByName[value.trim().toLowerCase()];
    setDraft((f) => ({
      ...f,
      [`assessor${n}Name`]: value,
      ...(hit?.designation
        ? { [`assessor${n}Designation`]: hit.designation }
        : {}),
      ...(hit?.phone ? { [`assessor${n}Phone`]: hit.phone } : {}),
      ...(hit?.hud ? { [`assessor${n}Hud`]: hit.hud } : {}),
    }));
  };
  const lastSA = lastTouched(audits, SA_TABLE);

  // ---- quick actions (all draft-only until Save) --------------------------
  const quickItems: QuickItem[] = [
    {
      label: "Undo last save",
      icon: <Undo2 className="size-4" />,
      disabled: !canUndo || disabled,
      onSelect: () => {
        if (undoRef.current) {
          const restored = { ...initial, ...undoRef.current };
          setDraft(restored);
          setSameAsScheduled(
            datesMatchSchedule(
              restored.scheduledDate,
              "",
              restored.actualStartDate,
              restored.actualEndDate,
            ),
          );
          toast.info("Last save restored in the form", {
            description: "Press Save to write the restored values back.",
          });
        }
      },
    },
    {
      label: "Duplicate previous cycle's assessors",
      icon: <Copy className="size-4" />,
      disabled: disabled || !duplicateSource?.assessor1Name,
      separatorBefore: true,
      onSelect: () => {
        const src = duplicateSource;
        if (!src) return;
        setDraft((f) => ({
          ...f,
          assessor1Name: src.assessor1Name ?? "",
          assessor1Designation: src.assessor1Designation ?? "",
          assessor1Phone: src.assessor1Phone ?? "",
          assessor1Hud: src.assessor1Hud ?? "",
          assessor2Name: src.assessor2Name ?? "",
          assessor2Designation: src.assessor2Designation ?? "",
          assessor2Phone: src.assessor2Phone ?? "",
          assessor2Hud: src.assessor2Hud ?? "",
        }));
        toast.success("Assessors copied from the previous cycle — Save to keep them");
      },
    },
    ...(onStartCycle
      ? [
          {
            label: startCycleLabel ?? "Start new cycle",
            icon: <CalendarPlus className="size-4" />,
            disabled,
            separatorBefore: true,
            onSelect: onStartCycle,
          } as QuickItem,
        ]
      : []),
    ...SA_SECTIONS.map((s) => ({
      label: `Reset section: ${s.title}`,
      icon: <RotateCcw className="size-4" />,
      disabled,
      onSelect: () => {
        setDraft((f) => {
          const next = { ...(f as Record<string, unknown>) };
          for (const d of SA_FIELDS.filter((x) => x.section === s.id)) {
            next[d.key] = Array.isArray((f as Record<string, unknown>)[d.key]) ? [] : "";
          }
          return next as SaFormDraft;
        });
        if (s.id === "visit") setSameAsScheduled(false);
        toast.info(`“${s.title}” reset in the form — Save to persist`);
      },
    })),
    {
      label: "Mark not applicable (clear whole form)",
      icon: <RotateCcw className="size-4" />,
      disabled,
      separatorBefore: true,
      danger: true,
      onSelect: () => {
        setDraft(emptyDraft(draft as Record<string, unknown>) as SaFormDraft);
        setSameAsScheduled(false);
        toast.info("Form cleared — Save to record the assessment as not applicable");
      },
    },
    {
      label: "Print facility profile",
      icon: <Printer className="size-4" />,
      separatorBefore: true,
      onSelect: () => window.print(),
    },
  ];

  return (
    <div className="space-y-4 pb-28">
      {/* Blocking issues first — top of the tab, click-to-focus. */}
      <ValidationSummary issues={issues} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <StatusBanner
            label={statusLabel}
            tone={statusTone}
            rule={
              saDone
                ? "“SA Completed” when the visit has an actual end date (or the record was already completed). A completed visit must also record its start date, end date and score. The stored status is always written from these fields, so it can never drift from the dates again."
                : saScheduled
                  ? "“SA Scheduled” because a visit date is set. Once the team visits, fill the actual dates and the score and the status becomes “SA Completed”."
                  : "“SA Pending” until a visit is scheduled. Pick a scheduled date under §1 Schedule and this becomes “SA Scheduled”."
            }
          />
        </div>
        <QuickActionsMenu items={quickItems} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <SectionRail sections={rail} />
        <div className="min-w-0 space-y-3">
          {/* ① Schedule */}
          <FormSection
            id="sa-schedule"
            index={1}
            title="Schedule"
            hint={SA_SECTIONS[0].hint}
            state={rail[0].state}
            lockReason={lockReason}
          >
            <ScheduleVisitFields
              kind="sa"
              today={today}
              canEdit={!disabled}
              scheduledStart={draft.scheduledDate}
              originalScheduledDate={sa.originalScheduledDate}
              errors={byField}
              history={h}
              onScheduledStartChange={onScheduledChange}
            />
            <UpdatedFooter audits={audits} table={SA_TABLE} />
          </FormSection>

          {/* ② Visit */}
          <FormSection
            id="sa-visit"
            index={2}
            title="Visit"
            hint={SA_SECTIONS[1].hint}
            state={rail[1].state}
            lockReason={lockReason}
          >
            <VisitDatesFields
              kind="sa"
              today={today}
              canEdit={!disabled}
              scheduledStart={draft.scheduledDate}
              actualStart={draft.actualStartDate}
              actualEnd={draft.actualEndDate}
              sameAsScheduled={sameAsScheduled}
              durationDays={durationDays}
              errors={byField}
              history={h}
              onSameAsScheduledChange={onSameAsScheduledChange}
              onActualStartChange={onStartDateChange}
              onActualEndChange={onEndDateChange}
            />
            <UpdatedFooter audits={audits} table={SA_TABLE} />
          </FormSection>

          {/* ③ Scope */}
          <FormSection
            id="sa-scope"
            index={3}
            title="Scope"
            hint="Which scope was assessed?"
            collapsedHint={draft.scopeOption || "-"}
            state={rail[2].state}
            lockReason={lockReason}
          >
            <ScopeChoiceCards
              focusKey="sa.scopeOption"
              value={draft.scopeOption ?? ""}
              options={scopeOptions}
              disabled={disabled}
              error={byField.scopeOption}
              onChange={(v) => set("scopeOption", v)}
            />
            <UpdatedFooter audits={audits} table={SA_TABLE} />
          </FormSection>

          {/* ④ Outcome */}
          <FormSection
            id="sa-outcome"
            index={4}
            title="Outcome"
            hint={SA_SECTIONS[3].hint}
            state={rail[3].state}
            lockReason={lockReason}
          >
            <div className="max-w-md">
              <ScoreInput
                focusKey="sa.scorePercent"
                label="Score %"
                value={draft.scorePercent}
                onChange={(v) => set("scorePercent", v)}
                disabled={disabled}
                error={byField.scorePercent}
                requiredForStatus
                history={h("SA Score %")}
              />
            </div>
            <UpdatedFooter audits={audits} table={SA_TABLE} />
          </FormSection>

          {/* ⑤ Assessors */}
          <FormSection
            id="sa-assessors"
            index={5}
            title="Assessors"
            hint={SA_SECTIONS[4].hint}
            state={rail[4].state}
            lockReason={lockReason}
          >
            <AssessorAutocomplete
              focusKey="sa.assessor1Name"
              label="Assessor 1 — name"
              value={draft.assessor1Name}
              designation={draft.assessor1Designation}
              onDesignationChange={(v) => set("assessor1Designation", v)}
              designations={designations}
              phone={draft.assessor1Phone}
              onPhoneChange={(v) => set("assessor1Phone", v)}
              maskPhone={maskPhones}
              hud={draft.assessor1Hud}
              onHudChange={(v) => set("assessor1Hud", v)}
              huds={assessorHuds}
              suggestions={suggestions}
              hudByName={hudByName}
              onChange={(v) => applyAssessorName(1, v)}
              disabled={disabled}
              error={byField.assessor1Name}
              history={h("Name of Assessor 1")}
            />
            <div className="h-4" />
            <AssessorAutocomplete
              focusKey="sa.assessor2Name"
              label="Assessor 2 — name"
              value={draft.assessor2Name}
              designation={draft.assessor2Designation}
              onDesignationChange={(v) => set("assessor2Designation", v)}
              designations={designations}
              phone={draft.assessor2Phone}
              onPhoneChange={(v) => set("assessor2Phone", v)}
              maskPhone={maskPhones}
              hud={draft.assessor2Hud}
              onHudChange={(v) => set("assessor2Hud", v)}
              huds={assessorHuds}
              suggestions={suggestions}
              hudByName={hudByName}
              onChange={(v) => applyAssessorName(2, v)}
              disabled={disabled}
              error={byField.assessor2Name}
              history={h("Name of Assessor 2")}
            />
            <UpdatedFooter audits={audits} table={SA_TABLE} />
          </FormSection>

          {/* ⑥ Documents */}
          <FormSection
            id="sa-documents"
            index={6}
            title="Documents"
            hint={SA_SECTIONS[5].hint}
            state={rail[5].state}
            lockReason={lockReason}
          >
            {/* The SHARED DocumentSlot: SA Report takes a PDF, SA Checklist
                takes .xlsx/.xls only (never CSV). Type and size come from the
                one documents config; the upload saves to facility_document at
                once, so the Documents card and the n-of-6 count follow. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <DocumentSlot
                facilityId={facilityId}
                docKey="SA_Report"
                canEdit={!disabled}
              />
              <DocumentSlot
                facilityId={facilityId}
                docKey="SA_Checklist"
                canEdit={!disabled}
              />
            </div>

            {/* SaQsham Documents Status — READ ONLY. The stage comes from the
                SaQsham import (or the certification result), so the strip
                shows where the file is: earlier stages ticked, the current
                stage filled, and "Result Declared" once certified,
                conditional or deferred. */}
            <div className="mt-4">
              <p className="mb-1.5 text-[13px] font-medium text-muted-foreground">
                SaQsham Documents Status
              </p>
              <div
                data-focus="sa.generalDocStatus"
                tabIndex={-1}
                data-testid="sa-docs-strip"
                role="list"
                aria-label={`SaQsham Documents Status: ${
                  resultDeclared
                    ? "Result Declared"
                    : docStageLabel(draft.generalDocStatus) || "Not recorded"
                }`}
                className="flex flex-wrap items-center gap-1.5"
              >
                {(() => {
                  const currentIdx = resultDeclared
                    ? statuses.length
                    : statuses.findIndex((stage) => stage === draft.generalDocStatus);
                  return statuses.map((stage, i) => {
                    const done = currentIdx > i;
                    const current = currentIdx === i;
                    return (
                      <span
                        key={stage}
                        role="listitem"
                        data-stage-state={current ? "current" : done ? "done" : "todo"}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                          current
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : done
                              ? "border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                              : "border-border/70 bg-background text-muted-foreground",
                        )}
                      >
                        {done && <Check className="size-3 shrink-0" aria-hidden />}
                        {docStageLabel(stage)}
                      </span>
                    );
                  });
                })()}
                {resultDeclared && (
                  <span
                    role="listitem"
                    data-stage-state="current"
                    data-testid="sa-result-declared"
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100"
                  >
                    <Lock className="size-3 shrink-0" aria-hidden /> Result Declared
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {resultDeclared
                  ? "Set automatically because the NQAS result is declared. Change the certification status in NQAS Assessment to edit the portal status."
                  : "Set by the SaQsham import."}
              </p>
            </div>
            <UpdatedFooter
              audits={audits}
              table={SA_TABLE}
              extraTables={["facilityDocuments"]}
            />
          </FormSection>
        </div>
      </div>

      {!disabled && (
        <StickySaveBar
          dirtyCount={dirtyCount}
          busy={busy}
          lastSavedAt={
            lastSA
              ? `Last changed ${toLongDisplayDate(
                  new Date(lastSA.when).toISOString().slice(0, 10),
                )} · ${lastSA.who}`
              : null
          }
          onSave={() => void doSave()}
          onDiscard={doDiscard}
          saveLabel="Save state assessment"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NQAS Assessment form
// ---------------------------------------------------------------------------

type NqasRecord = {
  status: string;
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  originalScheduledStartDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  mode?: string;
  /** Legacy department chips stay stored but are hidden by the new scope. */
  departments?: string[];
  scopeOption?: string;
  checklistVersion?: string;
  certificationStatus?: string;
  certificationDate?: string;
  goiLetterDate?: string;
  scorePercent?: number;
  manualScore?: number | null;
  validityDate?: string;
};

/** Form state = the rules' NqasDraft. The result sheet lives in
 *  `facility_document` through the shared DocumentSlot. */
type NqasFormDraft = NqasDraft;

const NQAS_TABLE = "nationalAssessments";

function nqasToDraft(n: NqasRecord): NqasFormDraft {
  return {
    scheduledStartDate: n.scheduledStartDate ?? "",
    scheduledEndDate: n.scheduledEndDate ?? "",
    actualStartDate: n.actualStartDate ?? "",
    actualEndDate: n.actualEndDate ?? "",
    mode: n.mode ?? "",
    checklistVersion: n.checklistVersion ?? "",
    departments: n.departments ?? [],
    scopeOption: n.scopeOption ?? "",
    certificationStatus: n.certificationStatus ?? "",
    certificationDate: n.certificationDate ?? n.goiLetterDate ?? "",
    scorePercent:
      n.scorePercent != null
        ? String(n.scorePercent)
        : n.manualScore != null
          ? String(n.manualScore)
          : "",
  };
}

export function NqasForm({
  nqas,
  facilityId,
  cycleId,
  cycleNumber,
  modes,
  checklists,
  scopeOptions,
  certStatuses,
  settings,
  saCompleted,
  disabled,
  lockReason,
  audits,
  onStartCycle,
  startCycleLabel,
  onSave,
}: {
  nqas: NqasRecord;
  facilityId: string;
  cycleId: string;
  /** The assessment cycle whose NQAS Result document this form validates. */
  cycleNumber: number;
  modes: string[];
  checklists: string[];
  scopeOptions: string[];
  certStatuses: string[];
  settings?: Partial<LifecycleSettings> | null;
  /** Gate: the cycle's State Assessment status (Completed or not). */
  saCompleted: boolean;
  disabled: boolean;
  lockReason?: string | null;
  audits: AuditLite[];
  onStartCycle?: () => void;
  startCycleLabel?: string;
  onSave: (vals: Record<string, unknown>) => Promise<void>;
}) {
  const draftKey = `nqas:na-draft:${facilityId}:${cycleId}`;
  const initial = useMemo(() => nqasToDraft(nqas), [nqas]);
  const { draft, set, setDraft, dirtyCount, discard } = useDraft<NqasFormDraft>(
    draftKey,
    initial,
  );
  const [busy, setBusy] = useState(false);
  const undoRef = useRef<NqasFormDraft | null>(null);
  /* Part C — the ONE Admin rule for the NQAS Certified Result, resolved by
   * the server for this facility (same subscription the Documents panel uses,
   * so Convex shares it). The badge, the blocking check and this error text
   * all read it. */
  const documents = useQuery(api.documents.listForFacility, {
    facilityId: facilityId as never,
    cycleNo: cycleNumber,
  });
  const resultDocRule =
    (documents?.requirements as Record<string, { required: boolean; blocking: boolean; badge: string }> | undefined)?.[
      "NQAS_Result"
    ] ?? null;
  /** The sheet is stored in facility_document — the required-file check
   *  reads the real row, not a legacy draft column. */
  const resultDocUploaded = !!(
    documents?.documents as { key: string; current?: unknown }[] | undefined
  )?.find(
    (d) => (d.key === "NQAS_Result" || d.key === "NQAS_Certificate") && d.current,
  )?.current;
  const uploadedDocKeys = new Set(
    ((documents?.documents ?? []) as { key: string; current?: unknown }[])
      .filter((d) => d.current)
      .map((d) => d.key),
  );
  // Render-time mirror of undoRef.current (see the SA form note above).
  const [canUndo, setCanUndo] = useState(false);
  const today = todayLocalIso();
  const s: LifecycleSettings = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
  // A saved record starts linked only when its actual pair equals the schedule
  // (a blank scheduled end means the visits happened on the same day).
  const [sameAsScheduled, setSameAsScheduled] = useState(() =>
    datesMatchSchedule(
      nqas.scheduledStartDate ?? "",
      nqas.scheduledEndDate ?? "",
      nqas.actualStartDate ?? "",
      nqas.actualEndDate ?? "",
    ),
  );
  // Ticked: both actual dates follow either scheduled date in one write.
  useEffect(() => {
    if (!sameAsScheduled) return;
    const copied = copyScheduleToVisit(
      draft.scheduledStartDate,
      draft.scheduledEndDate,
    );
    if (!copied) {
      setSameAsScheduled(false);
      return;
    }
    if (
      draft.actualStartDate !== copied.actualStartDate ||
      draft.actualEndDate !== copied.actualEndDate
    ) {
      setDraft((f) => ({ ...f, ...copied }));
    }
  }, [
    sameAsScheduled,
    draft.scheduledStartDate,
    draft.scheduledEndDate,
    draft.actualStartDate,
    draft.actualEndDate,
    setDraft,
  ]);

  // ---- derived status (same concept as the SA form) ----
  const naDone =
    !!draft.actualEndDate || !!draft.actualStartDate || nqas.status === "Completed";
  const naScheduled = !!draft.scheduledStartDate || !!draft.scheduledEndDate;
  const derivedStatus = naDone ? "Completed" : naScheduled ? "Scheduled" : "Pending";
  const statusLabel = naDone ? "NQAS Completed" : naScheduled ? "NQAS Scheduled" : "NQAS Pending";
  const statusTone: "purple" | "blue" | "grey" = naDone
    ? "purple"
    : naScheduled
      ? "blue"
      : "grey";

  const issues = useMemo(() => {
    const base = validateNqasDraft(draft, {
      today,
      saCompleted,
      resultDocRule: resultDocRule
        ? {
            required: resultDocRule.required,
            blocking: resultDocRule.blocking,
            label: "NQAS Result",
          }
        : null,
      resultDocUploaded,
    });
    if (nqas.scorePercent != null && draft.scorePercent === "") {
      base.push({
        field: "nqas.scorePercent",
        label: "Score %",
        message: `A recorded score can't be removed by clearing the box — enter the score again (it was ${nqas.scorePercent}%).`,
      });
    }
    return base;
  }, [draft, today, saCompleted, nqas.scorePercent, resultDocRule, resultDocUploaded]);
  const byField = issuesByField(issues);

  const durationDays =
    draft.actualStartDate && draft.actualEndDate
      ? Math.round(
          (Date.parse(draft.actualEndDate) - Date.parse(draft.actualStartDate)) / 86_400_000,
        )
      : null;

  const onSchedStartChange = (value: string) => set("scheduledStartDate", value);
  const onSchedEndChange = (value: string) => set("scheduledEndDate", value);

  const onSameAsScheduledChange = (on: boolean) => {
    setSameAsScheduled(on);
    if (!on) {
      // Unticked fields are manual and start empty — never stale copied dates.
      setDraft((f) => ({ ...f, actualStartDate: "", actualEndDate: "" }));
      return;
    }
    const copied = copyScheduleToVisit(
      draft.scheduledStartDate,
      draft.scheduledEndDate,
    );
    if (copied) setDraft((f) => ({ ...f, ...copied }));
  };
  const onStartDateChange = (value: string) => set("actualStartDate", value);
  const onEndDateChange = (value: string) => set("actualEndDate", value);

  // ---- derived validity + timeline (admin-configured rules) ----
  const derived = computeDerivedNqas(
    {
      status: derivedStatus,
      certificationStatus: draft.certificationStatus || undefined,
      certificationDate: draft.certificationDate || undefined,
      goiLetterDate: draft.certificationDate || undefined,
      actualEndDate: nqas.actualEndDate,
    },
    s,
  );
  const validTill = draft.certificationDate ? derived.validityDate : null;

  // ---- save ----
  const doSave = async () => {
    // No missing date is invented. A completed assessment must already carry
    // BOTH actual dates; validation blocks it otherwise.
    let effective = draft;
    if (sameAsScheduled) {
      // One save writes both linked dates, so the pair can never be half-filled.
      const copied = copyScheduleToVisit(
        effective.scheduledStartDate,
        effective.scheduledEndDate,
      );
      if (copied) effective = { ...effective, ...copied };
    }
    const effectiveIssues = validateNqasDraft(effective, {
      today,
      saCompleted,
      resultDocRule: resultDocRule
        ? { required: resultDocRule.required, blocking: resultDocRule.blocking, label: "NQAS Result" }
        : null,
      resultDocUploaded,
    });
    if (
      naDone &&
      (!effective.actualStartDate || !effective.actualEndDate) &&
      !effectiveIssues.some((issue) => issue.field === "nqas.actualStartDate")
    ) {
      effectiveIssues.push({
        field: "nqas.actualStartDate",
        label: "Actual dates",
        message:
          "A completed assessment needs both actual dates. Enter the actual start date and actual end date before saving.",
      });
    }
    if (effectiveIssues.length > 0) {
      toast.error(`Fix ${effectiveIssues.length} issue${effectiveIssues.length === 1 ? "" : "s"} first`, {
        description: effectiveIssues[0].message,
      });
      focusField(effectiveIssues[0].field);
      return;
    }
    undoRef.current = { ...initial };
    setCanUndo(true);
    if (derivedStatus !== nqas.status) {
      toast.info(
        `This will change NQAS Status to “${derivedStatus}” — Facility Current Status, Eligibility and the master-list columns update automatically.`,
      );
    }
    if (draft.certificationStatus !== (nqas.certificationStatus ?? "") && draft.certificationStatus) {
      toast.info(
        `This will change NQAS Certification Status to “${draft.certificationStatus}”${
          validTill ? ` and validity till ${dmy(validTill)}` : ""
        }.`,
      );
    }
    const payload = {
      status: derivedStatus,
      scheduledStartDate: effective.scheduledStartDate,
      scheduledEndDate: effective.scheduledEndDate,
      actualStartDate: effective.actualStartDate,
      actualEndDate: effective.actualEndDate,
      dateSource: sameAsScheduled ? "same as scheduled" : undefined,
      mode: draft.mode,
      checklistVersion: draft.checklistVersion,
      scopeOption: draft.scopeOption ?? "",
      // Legacy departments are intentionally not sent: the stored data stays
      // exactly as it was and the hidden field is replaced by scopeOption.
      certificationStatus: draft.certificationStatus,
      certificationDate: draft.certificationDate,
      goiLetterDate: draft.certificationDate,
      scorePercent: draft.scorePercent === "" ? undefined : Number(draft.scorePercent),
    };
    setBusy(true);
    try {
      await onSave(payload);
      clearDraft(draftKey);
      toast.success("NQAS assessment saved");
    } catch (err) {
      saveDraft(draftKey, draft);
      showSaveError(err);
    } finally {
      setBusy(false);
    }
  };

  const doDiscard = () => {
    discard();
    setSameAsScheduled(
      datesMatchSchedule(
        initial.scheduledStartDate,
        initial.scheduledEndDate,
        initial.actualStartDate,
        initial.actualEndDate,
      ),
    );
    toast("Changes discarded", { description: "Back to the last saved values." });
  };

  const rail = NQAS_SECTIONS.map((s2) => ({
    id: s2.id,
    title: s2.title,
    state: sectionState(
      NQAS_FIELDS,
      s2.id,
      issues,
      withDocumentPresence(draft as Record<string, unknown>, uploadedDocKeys, {
        resultDocumentId: "NQAS_Result",
      }),
    ),
  }));
  const h = (key: string) => historyFor(audits, NQAS_TABLE, key);
  const lastNA = lastTouched(audits, NQAS_TABLE);

  const quickItems: QuickItem[] = [
    {
      label: "Undo last save",
      icon: <Undo2 className="size-4" />,
      disabled: !canUndo || disabled,
      onSelect: () => {
        if (undoRef.current) {
          const restored = { ...initial, ...undoRef.current };
          setDraft(restored);
          setSameAsScheduled(
            datesMatchSchedule(
              restored.scheduledStartDate,
              restored.scheduledEndDate,
              restored.actualStartDate,
              restored.actualEndDate,
            ),
          );
          toast.info("Last save restored in the form", {
            description: "Press Save to write the restored values back.",
          });
        }
      },
    },
    ...(onStartCycle
      ? [
          {
            label: startCycleLabel ?? "Start new cycle",
            icon: <CalendarPlus className="size-4" />,
            disabled,
            separatorBefore: true,
            onSelect: onStartCycle,
          } as QuickItem,
        ]
      : []),
    ...NQAS_SECTIONS.map((s2) => ({
      label: `Reset section: ${s2.title}`,
      icon: <RotateCcw className="size-4" />,
      disabled,
      separatorBefore: s2.id === "schedule",
      onSelect: () => {
        setDraft((f) => {
          const next = { ...(f as Record<string, unknown>) };
          for (const d of NQAS_FIELDS.filter((x) => x.section === s2.id)) {
            next[d.key] = Array.isArray((f as Record<string, unknown>)[d.key]) ? [] : "";
          }
          return next as NqasFormDraft;
        });
        if (s2.id === "visit") setSameAsScheduled(false);
        toast.info(`“${s2.title}” reset in the form — Save to persist`);
      },
    })),
    {
      label: "Mark not applicable (clear whole form)",
      icon: <RotateCcw className="size-4" />,
      disabled,
      separatorBefore: true,
      danger: true,
      onSelect: () => {
        setDraft(
          emptyDraft(draft as Record<string, unknown>, ["departments"]) as NqasFormDraft,
        );
        setSameAsScheduled(false);
        toast.info("Form cleared — Save to record the assessment as not applicable");
      },
    },
    {
      label: "Print facility profile",
      icon: <Printer className="size-4" />,
      separatorBefore: true,
      onSelect: () => window.print(),
    },
  ];

  return (
    <div className="space-y-4 pb-28">
      {/* Blocking issues first — top of the tab, click-to-focus. */}
      <ValidationSummary issues={issues} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <StatusBanner
            label={statusLabel}
            tone={statusTone}
            rule={
              naDone
                ? "“NQAS Completed” when the assessment has an actual end date (or the record was already completed). A completed assessment must record both actual dates and its score — and it can never be completed while this cycle's State Assessment is not marked Completed."
                : naScheduled
                  ? "“NQAS Scheduled” because scheduled dates are set. After the visit, fill the actual dates and score."
                  : "“NQAS Pending” until the assessment is scheduled under §1 Schedule."
            }
          />
        </div>
        <QuickActionsMenu items={quickItems} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <SectionRail sections={rail} />
        <div className="min-w-0 space-y-3">
          {/* ① Schedule */}
          <FormSection
            id="nqas-schedule"
            index={1}
            title="Schedule"
            hint={NQAS_SECTIONS[0].hint}
            state={rail[0].state}
            lockReason={lockReason}
          >
            <ScheduleVisitFields
              kind="nqas"
              today={today}
              canEdit={!disabled}
              scheduledStart={draft.scheduledStartDate}
              scheduledEnd={draft.scheduledEndDate}
              originalScheduledDate={nqas.originalScheduledStartDate}
              errors={byField}
              history={h}
              onScheduledStartChange={onSchedStartChange}
              onScheduledEndChange={onSchedEndChange}
            />
            <UpdatedFooter audits={audits} table={NQAS_TABLE} />
          </FormSection>

          {/* ② Visit */}
          <FormSection
            id="nqas-visit"
            index={2}
            title="Visit"
            hint={NQAS_SECTIONS[1].hint}
            state={rail[1].state}
            lockReason={lockReason}
          >
            <VisitDatesFields
              kind="nqas"
              today={today}
              canEdit={!disabled}
              scheduledStart={draft.scheduledStartDate}
              scheduledEnd={draft.scheduledEndDate}
              actualStart={draft.actualStartDate}
              actualEnd={draft.actualEndDate}
              sameAsScheduled={sameAsScheduled}
              durationDays={durationDays}
              errors={byField}
              history={h}
              onSameAsScheduledChange={onSameAsScheduledChange}
              onActualStartChange={onStartDateChange}
              onActualEndChange={onEndDateChange}
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SegmentedControl
                focusKey="nqas.mode"
                label="Mode"
                value={draft.mode}
                onChange={(v) => set("mode", v)}
                options={modes}
                disabled={disabled}
                error={byField.mode}
                helper="How the assessment team visited."
              />
              <FieldFrame
                focusKey="nqas.checklistVersion"
                label="Checklist version"
                error={byField.checklistVersion}
              >
                <Select
                  value={draft.checklistVersion || "__none"}
                  onValueChange={(v) => set("checklistVersion", v === "__none" ? "" : v)}
                  disabled={disabled}
                >
                  <SelectTrigger className="glass-input min-h-11 w-full">
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">—</SelectItem>
                    {checklists.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldFrame>
            </div>
            <UpdatedFooter audits={audits} table={NQAS_TABLE} />
          </FormSection>

          {/* ③ Scope */}
          <FormSection
            id="nqas-scope"
            index={3}
            title="Scope"
            hint="Which scope was assessed?"
            collapsedHint={draft.scopeOption || "-"}
            state={rail[2].state}
            lockReason={lockReason}
          >
            <ScopeChoiceCards
              focusKey="nqas.scopeOption"
              value={draft.scopeOption ?? ""}
              options={scopeOptions}
              disabled={disabled}
              error={byField.scopeOption}
              onChange={(v) => set("scopeOption", v)}
            />
            <UpdatedFooter audits={audits} table={NQAS_TABLE} />
          </FormSection>

          {/* ④ Outcome */}
          <FormSection
            id="nqas-outcome"
            index={4}
            title="Outcome"
            hint={NQAS_SECTIONS[3].hint}
            state={rail[3].state}
            lockReason={lockReason}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <ScoreInput
                focusKey="nqas.scorePercent"
                label="Score %"
                value={draft.scorePercent}
                onChange={(v) => set("scorePercent", v)}
                disabled={disabled}
                error={byField.scorePercent}
                requiredForStatus
                history={h("NQAS Score %")}
              />
              <DateField
                focusKey="nqas.certificationDate"
                label="GoI Letter Date / Certification date"
                value={draft.certificationDate}
                onChange={(v) => set("certificationDate", v)}
                disabled={disabled}
                disabledReason={disabled ? "View only — you do not have edit access" : undefined}
                max={today}
                requiredForStatus
                error={byField.certificationDate}
                helper="One date drives the letter date, certification date and the validity below."
                history={h("GoI Letter Date")}
              />
            </div>

            <div className="mt-4">
              <SegmentedControl
                focusKey="nqas.certificationStatus"
                label="Certification status"
                value={draft.certificationStatus}
                onChange={(v) => set("certificationStatus", v)}
                options={certStatuses}
                disabled={disabled}
                cards
                error={byField.certificationStatus}
                helper="Pick the result printed on the NQAS letter."
              />
            </div>

            {/* Read-only computed validity + surveillance strip */}
            <div className="mt-4">
              <Label className="text-sm">
                Validity &amp; surveillance
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">Auto</span>
              </Label>
              <div className="mt-1.5">
                <ValidityTimeline
                  certifiedOn={draft.certificationDate || null}
                  surveillance1={derived.surveillanceDue1}
                  surveillance2={derived.surveillanceDue2}
                  expires={validTill}
                  formula={`Validity = GoI letter date + ${s.certificationValidityYears} years for “Quality Certified”, + ${s.conditionalValidityYears} year for “Conditionality”. 1st surveillance = letter date + ${s.surveillanceIntervalsMonths} months; 2nd surveillance = + ${s.surveillanceIntervalsMonths * 2} months. Ranges are configured by the State Admin.`}
                />
                {draft.certificationStatus === "Deferred" && validTill && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Deferred — cooling period ends {dmy(validTill)} (
                    {s.deferredCooldownMonths} months from the letter date).
                  </p>
                )}
              </div>
            </div>
            <UpdatedFooter audits={audits} table={NQAS_TABLE} />
          </FormSection>

          {/* ⑤ Documents */}
          <FormSection
            id="nqas-documents"
            index={5}
            title="Documents"
            hint={NQAS_SECTIONS[4].hint}
            state={rail[4].state}
            lockReason={lockReason}
          >
            {/* The SHARED DocumentSlot — NQAS Result takes a PDF or an image.
                The requirement badge and the size/type line read Admin →
                Documents, and the upload saves to facility_document at once. */}
            <div className="max-w-xl">
              <DocumentSlot
                facilityId={facilityId}
                docKey="NQAS_Result"
                cycleNo={cycleNumber}
                lockCycle
                canEdit={!disabled}
              />
            </div>
            <UpdatedFooter
              audits={audits}
              table={NQAS_TABLE}
              extraTables={["facilityDocuments"]}
            />
          </FormSection>
        </div>
      </div>

      {!disabled && (
        <StickySaveBar
          dirtyCount={dirtyCount}
          busy={busy}
          lastSavedAt={
            lastNA
              ? `Last changed ${toLongDisplayDate(
                  new Date(lastNA.when).toISOString().slice(0, 10),
                )} · ${lastNA.who}`
              : null
          }
          onSave={() => void doSave()}
          onDiscard={doDiscard}
          saveLabel="Save NQAS assessment"
        />
      )}
    </div>
  );
}
