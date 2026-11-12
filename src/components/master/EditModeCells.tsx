/**
 * MASTER-GRID EDIT MODE — the ONE editing engine behind the editable
 * Facility Master List.
 *
 * WHY THIS MODULE EXISTS: edit mode used to render a completely different
 * table (a legacy shadcn <Table> in pages/FacilityList.tsx) instead of the
 * shared, virtualized grouped grid — and THAT was the sticky-header failure
 * (the separate header never shared the group band/header contract).
 *
 * RULES
 *  1. The draft lives in the PAGE (an unmounting virtualized row must never
 *     lose its edits — the user scrolls past a row and its draft survives).
 *  2. Row height NEVER changes while editing: every control is a compact
 *     h-7 widget; upload cells show the file name + tiny buttons, metadata
 *     timestamps moved into tooltips.
 *  3. The payload sent to updateTrackerRow is the SAME field mapping the
 *     original in-row editor sent — no DB column is renamed or dropped.
 */

import type { ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  Loader2,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Paperclip,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { DEFAULT_SETTINGS, mergedPipelineStatus, type LifecycleSettings } from "@/convex/lifecycle";
import { deriveFireNocStatus, todayLocalIso } from "@/lib/today";
import { toDisplayDateTime } from "@/lib/format";
import {
  buildEligibilityOptions,
  eligibilityValueForLabel,
} from "@/lib/eligibility";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { AttachmentPicker, type AttachmentValue } from "@/components/AttachmentPicker";
import { FacilityTypeBadge } from "@/components/FacilityTypeBadge";
import { CycleBadge } from "@/components/CycleBadge";
import { DateInput } from "@/components/DateInput";

export type TrackerRow = NonNullable<
  ReturnType<typeof useQuery<typeof api.ops.listFacilityRowsFast>>
>["rows"][number];

/* ------------------------------------------------------------------ */
/* draft state (page-owned)                                            */
/* ------------------------------------------------------------------ */

export type TrackerDraft = Record<string, string>;

export type FileSlot =
  | "fund"
  | "noc"
  | "condemned"
  | "saReport"
  | "saChecklist"
  | "result";

export type RowEditState = {
  draft: TrackerDraft;
  files: Partial<Record<FileSlot, AttachmentValue | null>>;
  clears: Partial<Record<FileSlot, boolean>>;
};

const FILE_SLOTS: FileSlot[] = [
  "fund",
  "noc",
  "condemned",
  "saReport",
  "saChecklist",
  "result",
];

/** File-slot columns: the grid column key → its upload FileSlot — the
 *  testable map for the edit-mode link cells (exported for the contract
 *  tests). */
export const EDIT_SLOT_BY_KEY: Record<string, FileSlot> = {
  saReport: "saReport",
  saChecklist: "saChecklist",
  condemnedLink: "condemned",
  nocDoc: "noc",
  resultDoc: "result",
};

export function emptyRowEdit(): RowEditState {
  return { draft: {}, files: {}, clears: {} };
}

/** The initial draft of one row — exactly the field set the row editor's
 *  Update button used to assemble (same keys ⇒ same payload mapping). */
export function trackerDraftFromRow(cycle: TrackerRow): TrackerDraft {
  return {
    certStatus: cycle.nqas?.certificationStatus ?? "",
    certDate: cycle.nqas?.certificationDate ?? "",
    certScore: cycle.nqas?.scorePercent?.toString() ?? "",
    naScheduled: cycle.nqas?.scheduledStartDate ?? "",
    naEnd: cycle.nqas?.actualEndDate ?? cycle.nqas?.scheduledEndDate ?? "",
    naMode: cycle.nqas?.mode ?? "",
    departments: (cycle.nqas?.departments ?? []).join(", "),
    gapAmount: cycle.fund?.amountSanctioned?.toString() ?? "",
    gcYear: cycle.fund?.financialYear ?? "",
    procLink: cycle.fund?.procLink ?? "",
    nqasIaQ1: cycle.facility.nqasIaQ1?.toString() ?? "",
    nqasIaQ2: cycle.facility.nqasIaQ2?.toString() ?? "",
    kayakalpIaQ1: cycle.facility.kayakalpIaQ1?.toString() ?? "",
    kayakalpIaQ2: cycle.facility.kayakalpIaQ2?.toString() ?? "",
    saStatus: cycle.sa?.status ?? "",
    saScore: cycle.sa?.scorePercent?.toString() ?? "",
    saAssessor1: cycle.sa?.assessor1Name ?? "",
    saAssessor1Hud: cycle.sa?.assessor1Hud ?? "",
    saAssessor2: cycle.sa?.assessor2Name ?? "",
    saAssessor2Hud: cycle.sa?.assessor2Hud ?? "",
    saStart: cycle.sa?.actualStartDate ?? cycle.sa?.scheduledDate ?? "",
    saEnd: cycle.sa?.actualEndDate ?? "",
    genDoc: cycle.sa?.generalDocStatus ?? "",
    surv1: cycle.nqas?.surveillanceDone1 ?? "",
    surv2: cycle.nqas?.surveillanceDone2 ?? "",
    manualScore: cycle.nqas?.manualScore?.toString() ?? "",
    buildingType: cycle.building?.buildingType ?? "",
    buildingStatus: cycle.building?.buildingStatus ?? "",
    condemnedLink: cycle.building?.condemnedLink ?? "",
    nocAvailable: cycle.noc?.nocAvailable ?? "",
    nocStatus: cycle.noc?.status ?? "",
    nocCertified: cycle.noc?.issuedDate ?? "",
    nocValidity: cycle.noc?.expiryDate ?? "",
    nocLink: cycle.noc?.nocLink ?? "",
    remarks: cycle.facility.remarks ?? "",
  };
}

/** A grid column key → its draft key. Missing keys mean the column renders
 *  read-only in edit mode too. */
export const EDIT_FIELD_BY_KEY: Record<string, string> = {
  certStatus: "certStatus",
  certDate: "certDate",
  certScore: "certScore",
  naScheduled: "naScheduled",
  naEnd: "naEnd",
  naMode: "naMode",
  departments: "departments",
  gapAmount: "gapAmount",
  gcYear: "gcYear",
  procLink: "procLink",
  // The four IA score columns are NOT grid-editable: they read
  // facilityIaQuarters (the store the quarterly import writes), while the
  // legacy facilities.nqasIaQ1/Q2 fields this editor would patch are no longer
  // what the column displays. Editing them looked like it worked and changed
  // nothing on screen — the exact "edit not working" symptom. They are
  // read-only here with an explicit reason (readOnlyCellReason below).
  saStatus: "saStatus",
  saScore: "saScore",
  saStart: "saStart",
  saEnd: "saEnd",
  genDoc: "genDoc",
  assessor1: "saAssessor1",
  assessor1Hud: "saAssessor1Hud",
  assessor2: "saAssessor2",
  assessor2Hud: "saAssessor2Hud",
  surv1: "surv1",
  surv2: "surv2",
  survScore: "manualScore",
  buildingType: "buildingType",
  buildingStatus: "buildingStatus",
  nocAvailable: "nocAvailable",
  nocCertified: "nocCertified",
  nocValidity: "nocValidity",
  remarks: "remarks",
};

/** The FIRST blocking error of a row's draft — the Save-row button disables
 *  with this text as its tooltip (Task C §2.6). Nothing here trusts a blank
 *  (blanks mean "unchanged"); the checks are the same class the Quick View
 *  applies before sending the update: numbers must be numbers, dates must
 *  be ISO dates, certScore 0–100. */
export function firstRowBlocker(
  row: TrackerRow,
  state: RowEditState | undefined,
): string | null {
  if (!state) return null;
  const identity = trackerDraftFromRow(row);
  for (const [key, value] of Object.entries(state.draft)) {
    if (!value || value.trim() === "" || value.trim() === identity[key]) continue;
    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    const v = value.trim().toLowerCase();
    if (/number|score|amount|year|q1|q2|manualscore/.test(key.toLowerCase())) {
      if (/[^\d.]/.test(v) || Number.isNaN(Number(v)))
        return `${label}: “${value.trim()}” is not a number`;
      if (/score/.test(key.toLowerCase())) {
        const n = Number(v);
        if (n < 0 || n > 100) return `${label}: ${n} is outside 0–100`;
      }
      continue;
  }
    if (/date/.test(key.toLowerCase())) {
      if (!/^\d{4}-\d{2}-\d{2}/.test(v) || Number.isNaN(new Date(v).getTime()))
        return `${label}: “${value.trim()}” is not a valid date (use YYYY-MM-DD)`;
      continue;
    }
  }
  return null;
}

/** Whether anything in this row has changes (draft fields, picked files or
 *  pending removals). */
export function isRowDirty(row: TrackerRow, state: RowEditState | undefined): boolean {
  if (!state) return false;
  const initial = trackerDraftFromRow(row);
  const fieldsDirty = (Object.keys(initial) as string[]).some(
    (k) => state.draft[k] !== undefined && state.draft[k] !== initial[k],
  );
  const filesDirty = FILE_SLOTS.some(
    (s) => state.files[s] != null || state.clears[s] === true,
  );
  return fieldsDirty || filesDirty;
}

/** Build the updateTrackerRow payload — the SAME mapping as the previous
 *  in-row Update button (only changed fields go; attachments as staged). */
export function trackerUpdatePayload(
  row: TrackerRow,
  state: RowEditState,
): Record<string, unknown> {
  const draft = state.draft;
  const is = (k: string, v: string) => draft[k] !== undefined && draft[k] !== v;
  const identity = trackerDraftFromRow(row);
  const g = (k: string) => draft[k] ?? identity[k];
  const num = (v: string) => (v.trim() ? Number(v) : undefined);
  const str = (v: string) => (v.trim() ? v : undefined);
  return {
    facilityId: row.facility._id as never,
    remarks: is("remarks", identity.remarks) ? str(g("remarks")) : undefined,
    nqasIaQ1: is("nqasIaQ1", identity.nqasIaQ1) ? num(g("nqasIaQ1")) : undefined,
    nqasIaQ2: is("nqasIaQ2", identity.nqasIaQ2) ? num(g("nqasIaQ2")) : undefined,
    kayakalpIaQ1: is("kayakalpIaQ1", identity.kayakalpIaQ1)
      ? num(g("kayakalpIaQ1"))
      : undefined,
    kayakalpIaQ2: is("kayakalpIaQ2", identity.kayakalpIaQ2)
      ? num(g("kayakalpIaQ2"))
      : undefined,
    certStatus: is("certStatus", identity.certStatus)
      ? ((g("certStatus") || undefined) as never)
      : undefined,
    certDate: is("certDate", identity.certDate) ? str(g("certDate")) : undefined,
    certScore: is("certScore", identity.certScore) ? num(g("certScore")) : undefined,
    naScheduledDate: is("naScheduled", identity.naScheduled)
      ? str(g("naScheduled"))
      : undefined,
    naEndDate: is("naEnd", identity.naEnd) ? str(g("naEnd")) : undefined,
    naMode: is("naMode", identity.naMode)
      ? (str(g("naMode")) as never)
      : undefined,
    naDepartments: is("departments", identity.departments)
      ? g("departments")
      : undefined,
    gapClosureAmount: is("gapAmount", identity.gapAmount)
      ? num(g("gapAmount"))
      : undefined,
    gcFundYear: is("gcYear", identity.gcYear) ? str(g("gcYear")) : undefined,
    fundProcLink: is("procLink", identity.procLink) ? str(g("procLink")) : undefined,
    saStatus: is("saStatus", identity.saStatus)
      ? ((g("saStatus") || undefined) as never)
      : undefined,
    saScore: is("saScore", identity.saScore) ? num(g("saScore")) : undefined,
    saAssessor1Name: is("saAssessor1", identity.saAssessor1)
      ? str(g("saAssessor1"))
      : undefined,
    saAssessor1Hud: is("saAssessor1Hud", identity.saAssessor1Hud)
      ? str(g("saAssessor1Hud"))
      : undefined,
    saAssessor2Name: is("saAssessor2", identity.saAssessor2)
      ? str(g("saAssessor2"))
      : undefined,
    saAssessor2Hud: is("saAssessor2Hud", identity.saAssessor2Hud)
      ? str(g("saAssessor2Hud"))
      : undefined,
    saReportAttachmentId: state.files.saReport?.attachmentId as never,
    saReportAttachmentName: state.files.saReport?.attachmentName,
    saReportAttachmentType: state.files.saReport?.attachmentType,
    saChecklistAttachmentId: state.files.saChecklist?.attachmentId as never,
    saChecklistAttachmentName: state.files.saChecklist?.attachmentName,
    saChecklistAttachmentType: state.files.saChecklist?.attachmentType,
    clearSaReportAttachment: !state.files.saReport && state.clears.saReport === true,
    clearSaChecklistAttachment:
      !state.files.saChecklist && state.clears.saChecklist === true,
    saStartDate: is("saStart", identity.saStart) ? str(g("saStart")) : undefined,
    saEndDate: is("saEnd", identity.saEnd) ? str(g("saEnd")) : undefined,
    generalDocStatus: is("genDoc", identity.genDoc)
      ? (str(g("genDoc")) as never)
      : undefined,
    surveillanceDone1: is("surv1", identity.surv1) ? str(g("surv1")) : undefined,
    surveillanceDone2: is("surv2", identity.surv2) ? str(g("surv2")) : undefined,
    manualScore: is("manualScore", identity.manualScore)
      ? num(g("manualScore"))
      : undefined,
    buildingType: is("buildingType", identity.buildingType)
      ? str(g("buildingType"))
      : undefined,
    buildingStatus: is("buildingStatus", identity.buildingStatus)
      ? str(g("buildingStatus"))
      : undefined,
    condemnedLink: is("condemnedLink", identity.condemnedLink)
      ? str(g("condemnedLink"))
      : undefined,
    nocAvailable: is("nocAvailable", identity.nocAvailable)
      ? str(g("nocAvailable"))
      : undefined,
    fireNocIssuedDate: is("nocCertified", identity.nocCertified)
      ? str(g("nocCertified"))
      : undefined,
    fireNocValidity: is("nocValidity", identity.nocValidity)
      ? str(g("nocValidity"))
      : undefined,
    nocLink: is("nocLink", identity.nocLink) ? str(g("nocLink")) : undefined,
    fundAttachmentId: state.files.fund?.attachmentId as never,
    fundAttachmentName: state.files.fund?.attachmentName,
    fundAttachmentType: state.files.fund?.attachmentType,
    clearFundAttachment: !state.files.fund && state.clears.fund === true,
    // Anchor: a Remove-only save must still enter the fund section.
    fundStatus:
      !state.files.fund && state.clears.fund === true
        ? (row.fund?.status ?? undefined)
        : undefined,
    nocAttachmentId: state.files.noc?.attachmentId as never,
    nocAttachmentName: state.files.noc?.attachmentName,
    nocAttachmentType: state.files.noc?.attachmentType,
    clearNocAttachment: !state.files.noc && state.clears.noc === true,
    // Same anchor for the NOC section.
    fireNocStatus:
      !state.files.noc && state.clears.noc === true
        ? (identity.nocStatus || undefined)
        : undefined,
    condemnedAttachmentId: state.files.condemned?.attachmentId as never,
    condemnedAttachmentName: state.files.condemned?.attachmentName,
    condemnedAttachmentType: state.files.condemned?.attachmentType,
    clearCondemnedAttachment:
      !state.files.condemned && state.clears.condemned === true,
    resultAttachmentId: state.files.result?.attachmentId as never,
    resultAttachmentName: state.files.result?.attachmentName,
    resultAttachmentType: state.files.result?.attachmentType,
    clearResultAttachment: !state.files.result && state.clears.result === true,
  };
}

/** Reset a row's draft back to its saved state (after save or failure). */
export function rowWithNoChanges(): RowEditState {
  return emptyRowEdit();
}

/* ------------------------------------------------------------------ */
/* option lists (settings-driven, one place)                           */
/* ------------------------------------------------------------------ */

export function trackerEditorOptions(settings?: Record<string, unknown>) {
  return {
    /* ONE option list per field (Part 1 ④): the eligibility editor, the pill,
       filters and the admin panel all read Settings → NQAS Eligibility
       through lib/eligibility — never a hard-coded second list. */
    eligibilityOptions: buildEligibilityOptions(
      (settings?.eligibilityOptions as string[] | undefined) ??
        DEFAULT_SETTINGS.eligibilityOptions,
    ),
    buildingTypes:
      (settings?.buildingTypes as string[] | undefined) ??
      (["Own Building", "Rented Building", "Rent Free Building"] as string[]),
    docStatuses:
      (settings?.generalDocStatuses as string[] | undefined) ??
      DEFAULT_SETTINGS.generalDocStatuses,
    assessmentModes:
      (settings?.assessmentModes as string[] | undefined) ?? [
        "Physical",
        "Virtual",
        "Hybrid",
      ],
    buildingStatuses:
      (settings?.buildingStatuses as string[] | undefined) ?? [
        "Good",
        "Needs Repair",
        "Under Renovation",
        "Dilapidated",
      ],
    departmentOptions:
      (settings?.departmentCriteria as string[] | undefined) ??
      DEFAULT_SETTINGS.departmentCriteria,
    certStatusOptions:
      (settings?.certificationStatuses as string[] | undefined) ??
      DEFAULT_SETTINGS.certificationStatuses,
    assessorHudOptions:
      (settings?.assessorHuds as string[] | undefined) ??
      DEFAULT_SETTINGS.assessorHuds,
    saStatusOptions:
      (settings?.saStatuses as string[] | undefined) ?? DEFAULT_SETTINGS.saStatuses,
    nocAvailableOptions:
      (settings?.nocAvailableOptions as string[] | undefined) ??
      DEFAULT_SETTINGS.nocAvailableOptions,
  };
}
export type TrackerEditorOptions = ReturnType<typeof trackerEditorOptions>;

/** Read-only-cell guard (Part 1 root-cause fix).
 *
 *  These are the ONLY cell keys the edit renderer turns into widgets.
 *  Everything else — Facility, Facility Type, Block, PHC, NIN, Certification
 *  Cycle, SaQsham Facility Name / Category, the merged Facility Current
 *  Status and the Fire NOC validity status — is auto-calculated or profile-
 *  edited, and MUST fall back to the read-only SmartCell so view mode and
 *  edit mode show the exact same values in the SAME grid. */
export function isEditableCellKey(cellKey: string): boolean {
  if (EDIT_SLOT_BY_KEY[cellKey]) return true;
  if (cellKey === "eligibility" || cellKey === "nqasIaCmp" || cellKey === "kayakalpIaCmp")
    return true;
  return EDIT_FIELD_BY_KEY[cellKey] != null;
}

/** The header-lock tooltip (Part 1 ②): WHY a column cannot be edited here.
 *  Derived fields say "Auto-calculated"; identity/profile fields say where
 *  they can be changed instead. */
export function readOnlyCellReason(cellKey: string): string {
  if (cellKey === "certCycle") return "Auto-calculated from the active certification cycle";
  if (cellKey === "pipelineStatus")
    return "Auto — merged from Facility Current Status override, assessments and documents";
  if (cellKey === "nocStatus")
    return "Auto — derived from the Fire NOC availability and validity date";
  if (cellKey === "validityDate")
    return "Auto — validity runs from the GoI letter / certification date";
  if (
    cellKey === "nqasIaQ1" ||
    cellKey === "nqasIaQ2" ||
    cellKey === "kayakalpIaQ1" ||
    cellKey === "kayakalpIaQ2"
  )
    return "Calculated automatically from the quarterly IA import (Bulk Import → Internal Assessment)";
  // The comparison itself is never typed or stored (task §5): latest quarter
  // with data minus the quarter before it, read-only.
  if (
    cellKey === "nqasIaCmp" ||
    cellKey === "kayakalpIaCmp" ||
    cellKey === "ecoIaCmp"
  )
    return "Calculated automatically from the two latest quarters with data";
  if (cellKey === "survDue1")
    return "Calculated automatically from the GoI letter date + 12 months";
  if (cellKey === "survDue2")
    return "Calculated automatically from the GoI letter date + 24 months";
  if (cellKey === "recertStatus" || cellKey === "recertYear")
    return "Calculated automatically from the certification date and the cycle rules";
  if (cellKey === "nextAction")
    return "Calculated automatically from the overdue and upcoming due dates";
  if (cellKey === "saqshamNameCategory")
    return "Calculated automatically from the SaQsham import name and category";
  if (cellKey === "documentsStatusReport")
    return "Calculated automatically from the document statuses";
  if (cellKey === "lastUpdated") return "System timestamp — set when the row is saved";
  if (cellKey === "eligibility") return "Editable from the grid when you have access";
  return "Edited in the Facility Profile";
}

/* ------------------------------------------------------------------ */
/* compact cell widgets                                                */
/* ------------------------------------------------------------------ */

/** Compact upload cell: the file link + tiny Upload/Replace/Remove buttons.
 *  The old editor printed a second "Updated:" line — that grew rows and
 *  staggered the shared grid; the timestamp now lives in the tooltip. */
export function CellUpload({
  id,
  name,
  value,
  updatedAt,
  onChange,
  onClear,
  disabled,
}: {
  id: string | null;
  name: string | null;
  value: AttachmentValue | null;
  updatedAt?: number | null;
  onChange: (v: AttachmentValue | null) => void;
  onClear?: () => void;
  disabled?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  if (pickerOpen)
    return (
      <div className="space-y-1">
        <AttachmentPicker
          initial={id ? { attachmentId: id, attachmentName: name ?? undefined } : null}
          onChange={(v) => {
            onChange(v);
            setPickerOpen(false);
          }}
          disabled={disabled}
        />
      </div>
    );
  if (value)
    return (
      <div
        className="flex flex-col items-start gap-0.5"
        data-tip={`${value.attachmentName ?? "New file"} — applies when you press Update`}
      >
        <span className="flex max-w-full min-w-0 items-center gap-1 text-[10px] font-medium">
          <FileText className="size-3 shrink-0" />
          <span className="truncate">{value.attachmentName ?? "New file"}</span>
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-5 gap-1 px-1 text-[10px]"
            disabled={disabled}
            onClick={() => setPickerOpen(true)}
          >
            <Paperclip className="size-3" />
            Replace
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 px-1 text-[10px] text-destructive"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Remove
          </Button>
        </div>
      </div>
    );
  return (
    <div
      className="flex flex-col items-start gap-0.5"
      data-tip={updatedAt ? `Last updated ${toDisplayDateTime(updatedAt)}` : undefined}
    >
      {id ? (
        <FileSlotLink id={id} name={name} />
      ) : (
        <span className="text-[10px] text-muted-foreground">No file</span>
      )}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-5 gap-1 px-1 text-[10px]"
          disabled={disabled}
          onClick={() => setPickerOpen(true)}
        >
          <Paperclip className="size-3" />
          {id ? "Replace" : "Upload"}
        </Button>
        {id && onClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 px-1 text-[10px] text-destructive"
            disabled={disabled}
            onClick={() => {
              onChange(null);
              onClear();
            }}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

function FileSlotLink({ id, name }: { id: string | null; name: string | null }) {
  const url = useQuery(
    api.modules.getAttachmentUrl,
    id ? { storageId: id as never } : "skip",
  );
  if (!id) return null;
  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full min-w-0 items-center gap-1 truncate text-[10px] font-medium text-primary hover:underline"
      data-tip={name ?? "View file"}
    >
      <Paperclip className="size-3 shrink-0" />
      <span className="truncate">{name ?? "View file"}</span>
    </a>
  );
}

/** Tiny month/quarter arrow — decimal deltas rounded to 2 places. */
export function ComparisonCell({ q1, q2 }: { q1: number | null; q2: number | null }) {
  if (q1 == null || q2 == null) return <span className="text-muted-foreground">—</span>;
  const delta = Math.round((q2 - q1) * 100) / 100;
  const color =
    delta > 0 ? "oklch(0.6 0.15 165)" : delta < 0 ? "oklch(0.6 0.2 25)" : "inherit";
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "";
  if (delta === 0) return <span className="font-medium tabular-nums">No Changes</span>;
  return (
    <span className="font-medium tabular-nums" style={{ color }}>
      {arrow} {Math.abs(delta)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* THE editable cell renderer                                          */
/* ------------------------------------------------------------------ */

export type EditHandlers = {
  onField: (key: string, value: string) => void;
  onFile: (slot: FileSlot, value: AttachmentValue | null) => void;
  onToggleClear: (slot: FileSlot, on: boolean) => void;
  onEligibility: (value: string) => void;
};

/** The shared grid's edit-mode renderer for ONE cell. Errors and hints go
 *  into the nested control's tooltip (never a layout-shifting inline text). */
export function EditableTrackerCell({
  row,
  cellKey,
  state,
  options,
  canEdit,
  busy,
  handlers,
}: {
  row: TrackerRow;
  cellKey: string;
  state: RowEditState;
  options: TrackerEditorOptions;
  canEdit: boolean;
  busy: boolean;
  handlers: EditHandlers;
}): ReactNode {
  /* ---- file-slot columns (EDIT_SLOT_BY_KEY) ---- */
  const slot = EDIT_SLOT_BY_KEY[cellKey];
  if (slot) return fileCellFor(slot, row, state, handlers, busy, canEdit);
  if (cellKey === "eligibility") {
    if (!canEdit) return null;
    /* ONE canonical option list (Settings → NQAS Eligibility via
       lib/eligibility): the drop-down value equals the STORED value the pill
       shows, so the editor can never disagree with the pill / filters /
       exports again. Stored legacy spellings ("In-Eligible", "Not Eligible
       (In-Eligible)") display as their canonical value without rewriting
       the DB until the user actually saves. */
    const stored = row.facility.eligibility ?? "";
    const normalized =
      options.eligibilityOptions.find((o) => o.value === stored)?.value ??
      eligibilityValueForLabel(stored) ??
      stored;
    return (
      <Select
        value={normalized}
        disabled={busy || !canEdit}
        onValueChange={(v) => {
          if (v !== row.facility.eligibility) handlers.onEligibility(v);
        }}
      >
        <SelectTrigger className="glass-input h-7 w-full text-[11px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.eligibilityOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (cellKey === "nqasIaCmp")
    return <ComparisonCell q1={row.facility.nqasIaQ1 ?? null} q2={row.facility.nqasIaQ2 ?? null} />;
  if (cellKey === "kayakalpIaCmp")
    return <ComparisonCell q1={row.facility.kayakalpIaQ1 ?? null} q2={row.facility.kayakalpIaQ2 ?? null} />;
  if (cellKey === "pipelineStatus") {
    // Same merged status the view shows — editable elsewhere, read-only here.
    const merged = mergedPipelineStatus(
      row.facility,
      row.sa
        ? { status: row.sa.status ?? "Not Yet Initiated", generalDocStatus: row.sa.generalDocStatus ?? null }
        : null,
      row.nqas
        ? {
            status: row.nqas.status ?? "Pending",
            scheduledStartDate: row.nqas.scheduledStartDate ?? null,
            certificationStatus: row.nqas.certificationStatus ?? null,
            validityDate: row.nqas.validityDate ?? null,
          }
        :        null,
      DEFAULT_SETTINGS as LifecycleSettings,
    );
    const label = row.facility.statusOverride || row.facility.currentStatus || "—";
    return (
      <span data-tip={merged ?? undefined} className="flex h-full items-center">
        <StatusBadge status={label} />
      </span>
    );
  }
  if (cellKey === "nocStatus")
    return (
      <StatusBadge
        status={deriveFireNocStatus(
          stateOf(state, "nocAvailable") || null,
          stateOf(state, "nocValidity") || null,
          row.noc?.status ?? null,
        )}
      />
    );
  if (cellKey === "lastUpdated")
    return (
      <span
        className="text-[11px] tabular-nums text-muted-foreground"
        data-tip="Auto timestamp — updates when the row is saved"
      >
        {row.facility.updatedAt ? toDisplayDateTime(row.facility.updatedAt) : "—"}
      </span>
    );

  /* ---- plain draft fields ---- */
  const field = EDIT_FIELD_BY_KEY[cellKey];
  if (!field) return null;
  const value = stateOf(state, field);

  const kStr = (k: string) => state.draft[k];
  void kStr;

  if (field === "remarks")
    return (
      <Textarea
        rows={1}
        className="glass-input h-7 min-h-7 w-full resize-none overflow-hidden py-1 text-[11px]"
        value={value ?? ""}
        disabled={busy || !canEdit}
        data-tip="General remarks"
        aria-label="General remarks"
        onChange={(e) => handlers.onField(field, e.target.value)}
      />
    );

  const selectFor = (opts: string[], label: string) => (
    <Select
      value={value || "__none"}
      disabled={busy || !canEdit}
      onValueChange={(v) => handlers.onField(field, v === "__none" ? "" : v)}
    >
      <SelectTrigger
        className="glass-input h-7 w-full text-[11px]"
        data-tip={label}
        aria-label={label}
      >
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        <SelectItem value="__none">—</SelectItem>
        {opts.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (field === "certStatus")
    return selectFor(options.certStatusOptions, "NQAS certification status");
  if (field === "naMode")
    return selectFor(options.assessmentModes, "Mode of assessment");
  if (field === "departments")
    return selectFor(options.departmentOptions, "Departments / packages");
  if (field === "saStatus")
    return selectFor(options.saStatusOptions, "State assessment status");
  if (field === "genDoc")
    return selectFor(options.docStatuses, "SaQsham documents status");
  if (field === "saAssessor1Hud")
    return selectFor(options.assessorHudOptions, "Assessor 1 HUD");
  if (field === "saAssessor2Hud")
    return selectFor(options.assessorHudOptions, "Assessor 2 HUD");
  if (field === "buildingType")
    return selectFor(options.buildingTypes, "Building type");
  if (field === "buildingStatus")
    return selectFor(options.buildingStatuses, "Facility building status");
  if (field === "nocAvailable")
    return selectFor(options.nocAvailableOptions, "NOC available");

  const numeric = [
    "certScore", "gapAmount", "nqasIaQ1", "nqasIaQ2",
    "kayakalpIaQ1", "kayakalpIaQ2", "saScore", "manualScore",
  ].includes(field);
  const isDate = [
    "certDate", "naScheduled", "naEnd", "saStart", "saEnd", "surv1", "surv2",
    "nocCertified", "nocValidity",
  ].includes(field);

  if (isDate) {
    return (
      <DateCell
        field={field}
        value={value ?? ""}
        disabled={busy || !canEdit}
        onChange={(iso) => handlers.onField(field, iso)}
      />
    );
  }

  return (
    <Input
      type={numeric ? "number" : "text"}
      step={numeric ? "any" : undefined}
      className="glass-input h-7 w-full px-2 text-[11px]"
      value={value ?? ""}
      disabled={busy || !canEdit}
      aria-label={field}
      data-tip={field.startsWith("gap") ? "Gap Closure Amount" : undefined}
      onChange={(e) => handlers.onField(field, e.target.value)}
    />
  );
}

/** Dates are done-only where the column records something that happened; a
 *  scheduled assessment end or a NOC validity can legitimately be future. */
const MAX_TODAY_FIELDS = new Set([
  "certDate",
  "saStart",
  "saEnd",
  "surv1",
  "surv2",
  "nocCertified",
]);

function DateCell({
  field,
  value,
  disabled,
  onChange,
}: {
  field: string;
  value: string;
  disabled: boolean;
  onChange: (iso: string) => void;
}) {
  const id = useId();
  return (
    <DateInput
      id={`cell-date-${id}`}
      label={field}
      value={value}
      onChange={onChange}
      max={MAX_TODAY_FIELDS.has(field) ? todayLocalIso() : undefined}
      today={todayLocalIso()}
      disabled={disabled}
      disabledReason={disabled ? "Read-only — you do not have edit access" : undefined}
      compact
      autoOpen
    />
  );
}

/** The draft value of a field (falls through to the row's stored value via
 *  empty draft). */
function stateOf(state: RowEditState, field: string): string {
  return state.draft[field] ?? "";
}

function fileCellFor(
  slot: FileSlot,
  row: TrackerRow,
  state: RowEditState,
  handlers: EditHandlers,
  busy: boolean,
  canEdit: boolean,
): ReactNode {
  const current: Record<
    FileSlot,
    { id: string | null; name: string | null }
  > = {
    fund: {
      id: row.fund?.fundAttachmentId ?? null,
      name: row.fund?.fundAttachmentName ?? null,
    },
    result: {
      id: row.resultDocumentId ?? null,
      name: row.resultDocumentName ?? null,
    },
    noc: {
      id: row.noc?.nocAttachmentId ?? null,
      name: row.noc?.nocAttachmentName ?? null,
    },
    condemned: {
      id: row.building?.condemnedAttachmentId ?? null,
      name: row.building?.condemnedAttachmentName ?? null,
    },
    saReport: {
      id: row.sa?.reportAttachmentId ?? null,
      name: row.sa?.reportAttachmentName ?? null,
    },
    saChecklist: {
      id: row.sa?.checklistAttachmentId ?? null,
      name: row.sa?.checklistAttachmentName ?? null,
    },
  };
  const cur = current[slot];
  return (
    <CellUpload
      id={cur.id}
      name={cur.name}
      value={state.files[slot] ?? null}
      onChange={(v) => handlers.onFile(slot, v)}
      onClear={() => handlers.onToggleClear(slot, true)}
      disabled={busy || !canEdit}
    />
  );
}

/* ------------------------------------------------------------------ */
/* THE update / open / delete action cell                              */
/* ------------------------------------------------------------------ */

export function EditableUpdateCell({
  row,
  state,
  canEdit,
  isAdmin,
  busy,
  onSave,
  onDelete,
  onDiscard,
  onUpdate,
  label = "Update",
}: {
  row: TrackerRow;
  state: RowEditState | undefined;
  canEdit: boolean;
  isAdmin: boolean;
  busy: boolean;
  onSave: (row: TrackerRow, state: RowEditState) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  /** Small "Discard" item — discards THIS row's draft (page-owned). */
  onDiscard?: (row: TrackerRow) => void;
  /** Clean row: the button stays "Update" and opens the Quick View in Edit
   *  mode (the same action as the view-mode row-actions button). */
  onUpdate?: (row: TrackerRow) => void;
  /** Admin "Button label": Update / Edit. Only used for clean rows. */
  label?: string;
}): ReactNode {
  const dirty = isRowDirty(row, state);
  const blocker = firstRowBlocker(row, state);
  const identity = trackerDraftFromRow(row);
  const changedCount = state
    ? (Object.keys(identity) as string[]).filter(
        (k) => state.draft[k] !== undefined && state.draft[k] !== identity[k],
      ).length +
      FILE_SLOTS.filter((s) => state.files[s] != null || state.clears[s] === true).length
    : 0;
  return (
    <div className="flex items-center justify-center gap-1" data-testid="edit-actions">
      {canEdit && (
        <span
          className="inline-flex"
          // A disabled button swallows hover events in Chromium, so the
          // blocking reason is carried by the wrapper's tooltip too.
          data-tip={dirty && blocker ? `Cannot save: ${blocker}` : undefined}
        >
          <Button
            size="sm"
            // px-1 keeps "Save row · 12" inside the 132px column together with
            // the ⋯ trigger — the column width is fixed in the shared model.
            className="row-actions-btn flex h-7 shrink-0 items-center gap-1 px-1 text-[11px]"
            disabled={busy || (dirty && !!blocker)}
            data-tip={
              blocker
                ? blocker
                : dirty
                  ? `Save ${changedCount} change${changedCount === 1 ? "" : "s"} in this row`
                  : `${label} ${row.facility.name} — opens the quick view in Edit mode`
            }
            aria-label={
              dirty ? `Save row ${row.facility.name}` : `${label} ${row.facility.name}`
            }
            onClick={(e) => {
              e.stopPropagation();
              if (dirty) {
                if (!state || blocker) return;
                void onSave(row, state);
                return;
              }
              onUpdate?.(row);
            }}
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : null}
            {dirty ? `Save row${changedCount ? ` · ${changedCount}` : ""}` : label}
          </Button>
        </span>
      )}
      {(onDiscard || isAdmin) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
              data-tip="More actions"
              aria-label={`More actions ${row.facility.name}`}
              data-more-actions=""
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem asChild>
              <Link to={`/facilities/${row.facility._id}`}>
                <ExternalLink className="size-4" aria-hidden /> Open full profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onDiscard && dirty && (
              <DropdownMenuItem onSelect={() => onDiscard(row)}>
                <RotateCcw className="size-4" aria-hidden /> Discard row changes
              </DropdownMenuItem>
            )}
            {isAdmin && (
              <DropdownMenuItem
                className="text-destructive"
                onSelect={() => {
                  void onDelete();
                }}
              >
                <Trash2 className="size-4" aria-hidden /> Delete facility
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* the sticky draft + launcher: keep virtualization safe               */
/* ------------------------------------------------------------------ */

/** Small helper hook for the page: holds the per-facility RowEditState map
 *  so a virtualized row unmount/remount cannot lose edits. */
export function useRowDrafts(): {
  drafts: Record<string, RowEditState>;
  get: (row: TrackerRow) => RowEditState;
  setField: (row: TrackerRow, key: string, value: string) => void;
  setFile: (row: TrackerRow, slot: FileSlot, value: AttachmentValue | null) => void;
  toggleClear: (row: TrackerRow, slot: FileSlot, on: boolean) => void;
  reset: (row: TrackerRow) => void;
  resetAll: () => void;
  dirtyCount: (rows: TrackerRow[]) => number;
} {
  const [drafts, setDrafts] = useState<Record<string, RowEditState>>({});

  const idOf = (row: TrackerRow) => String(row.facility._id);

  const withRow = (row: TrackerRow, patch: (s: RowEditState) => RowEditState) =>
    setDrafts((prev) => {
      const id = idOf(row);
      const cur = prev[id] ?? (() => ({ ...emptyRowEdit(), draft: trackerDraftFromRow(row) }))();
      return { ...prev, [id]: patch(cur) };
    });

  return useMemo(
    () => ({
      drafts,
      get: (row: TrackerRow) => drafts[idOf(row)] ?? { ...emptyRowEdit(), draft: trackerDraftFromRow(row) },
      setField: (row, key, value) =>
        withRow(row, (s) => ({ ...s, draft: { ...s.draft, [key]: value } })),
      setFile: (row, slot, value) =>
        withRow(row, (s) => ({
          ...s,
          files: { ...s.files, [slot]: value },
          clears: value ? { ...s.clears, [slot]: false } : s.clears,
        })),
      toggleClear: (row, slot, on) =>
        withRow(row, (s) => ({ ...s, clears: { ...s.clears, [slot]: on } })),
      reset: (row) =>
        setDrafts((prev) => ({ ...prev, [idOf(row)]: emptyRowEdit() })),
      resetAll: () => setDrafts({}),
      dirtyCount: (rows: TrackerRow[]) =>
        rows.filter((r) => drafts[idOf(r)] !== undefined && isRowDirty(r, drafts[idOf(r)])).length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drafts],
  );
}

/**
 * File-slot list exported for tests.
 */
export const FILE_SLOT_KEYS = FILE_SLOTS;
