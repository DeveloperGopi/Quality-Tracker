import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { q as Minus, r as reactExports, T as TriangleAlert, F as FileSpreadsheet, o as Flame, ay as Link2, u as FileText, C as CircleCheck, aH as CircleX, k as Clock3, a9 as ArrowUp, a8 as ArrowDown, L as LoaderCircle, ac as Ellipsis, E as ExternalLink, w as RotateCcw, ar as Trash2, bW as Paperclip, m as Check, a3 as X, v as Image, b4 as FileArchive, a2 as Download, H as ChevronDown, b1 as CloudUpload, p as Lock, X as History, I as Info, $ as Target, z as ChevronRight, a6 as Sparkles, N as CalendarClock, bX as Phone, aq as Copy, br as UserRound, bY as OctagonAlert, b8 as BadgeCheck, bZ as Hourglass, b_ as Clock4, b$ as CircleDashed, a7 as Pencil, aj as ChevronLeft, c0 as Dot, aP as Circle, ax as Save, c1 as GitCompare, a4 as Printer, af as ShieldAlert, ab as Undo2, b7 as Wrench } from './icons-BxQpodNr.js';
import { B as Button, c as cn, l as useQuery, j as api, L as Link, m as useMutation, o as useAction, t as toast, u as useAuth, b as useNavigate } from './index-CBV6wOh8.js';
import { S as Skeleton } from './skeleton-D-jVDmpg.js';
import { e as getUploadState, b as DEFAULT_DRIVE_SETTINGS, c as classifyDroppedFile, v as validateDocumentFile, k as DOCUMENT_SHORT_LABEL, j as DOCUMENT_FIELDS, f as formatFileSize, u as useDocumentUrls, l as absoluteDocumentUrl, m as dayStamp, h as uploadPausedDetail, i as uploadBlockedSentence } from './PdfCanvasViewer-C0MZuH_2.js';
import { D as DocumentField, b as DocumentPreviewButton, d as DocumentOpenLink, e as DocumentDownloadLink } from './DocumentField-4d87_sVm.js';
import { bj as formatPercent, G as toDdMmmYyyy, cd as cellValue, cp as scoreTone, cT as DOCUMENT_LINK_COLUMNS, ce as formatInr, c8 as nextDueOf, c3 as daysUntil, cc as surveillanceVisits, S as SCORE_DECIMALS, F as COMPARE_NO_CHANGE_BAND, e as Popover, f as PopoverTrigger, g as PopoverContent, cU as blankLabel, co as dueState, D as DEFAULT_SETTINGS, Y as mergedPipelineStatus, t as toDisplayDateTime, cV as COUNTED_DOC_KEYS, av as currentIaQuarter, aw as lastQuarters, ax as formatFyQuarter, cW as cycleLabel, cX as isResultDeclaredStatus, cY as RESULT_DECLARED_LABEL, aV as normalizeDocumentRules, aH as toDisplayStamp } from './AppShell-CP099uvN.js';
import { r as readIaTarget, s as scoreBandFor, D as DEFAULT_SCORE_BANDS, d as scoreChangeText } from './scoreBands-CA46Kez8.js';
import { d as deriveFireNocStatus, t as todayLocalIso } from './today-D9v8Esj5.js';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-qTILnHQg.js';
import { p as phoneForViewer, t as telHref } from './phone-C-n0eG_z.js';
import { D as DateInput } from './DateInput-DZAT80St.js';
import { I as Input } from './input-Cy2oZLur.js';
import { A as AttachmentPicker } from './AttachmentPicker-B8WtH0vb.js';
import { F as FacilityCell$1 } from './FacilityCell-CI45DpPw.js';
import { S as StatusBadge } from './StatusBadge-BPGGn135.js';
import { i as isDuplicateName, b as buildEligibilityOptions, e as eligibilityValueForLabel } from './masterFilter-DrauVhuN.js';
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, f as DropdownMenuItem, g as DropdownMenuSeparator } from './dropdown-menu-N0nU9bdA.js';
import { T as Textarea } from './textarea-Dm9kSFQo.js';
import { s as statusForDisplay, d as dmy, v as visitFor, r as recertificationState, l as loadQuickViewDraft, q as quickViewChanges, b as validateQuickView, c as validateSurveillance, e as blockingIssues, f as saveQuickViewDraft, Q as QV_SECTIONS, g as statusChangeNotice, h as clearQuickViewDraft, a as attentionFor, i as sectionCompleteness, j as deriveStage, u as updatedRecently, k as sectionColumns } from './facilityQuickView-BCxVjMPj.js';
import { S as SaveBar, R as ReviewChangesDialog } from './SaveBar--TNBfs1X.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from './dialog-BW3GEiPg.js';

const EMPTY_TEXT = "—";
const PILL_CLASS = {
  green: "border-emerald-300/70 bg-emerald-100 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100",
  amber: "border-amber-300/70 bg-amber-100 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100",
  red: "border-rose-300/70 bg-rose-100 text-rose-900 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100",
  blue: "border-sky-300/70 bg-sky-100 text-sky-900 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-100",
  slate: "border-border/60 bg-muted text-muted-foreground",
  violet: "border-violet-300/70 bg-violet-100 text-violet-900 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-100"
};
function StatusPill({
  value,
  compact
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: value, compact });
}
function ScoreBar$1({ value }) {
  const tone = scoreTone(value) ?? "slate";
  const bar = tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-rose-500";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 items-center justify-end gap-1", "data-tip": `${value}%`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-5 shrink-0 overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: cn("block h-full rounded-full", bar),
        style: { width: `${Math.max(0, Math.min(100, value))}%` }
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[11px] tabular-nums", children: formatPercent(value) })
  ] });
}
function CompareCell({
  value,
  tip
}) {
  if (value == null)
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: "text-muted-foreground",
        "data-tip": tip ?? "Both quarters are needed for a comparison",
        children: EMPTY_TEXT
      }
    );
  const signed = `${value > 0 ? "+" : value < 0 ? "-" : ""}${Math.abs(value).toFixed(SCORE_DECIMALS)}`;
  if (Math.abs(value) < COMPARE_NO_CHANGE_BAND) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "span",
      {
        className: "inline-flex items-center gap-1 text-xs font-medium text-slate-600 tabular-nums dark:text-slate-300",
        "data-tip": `${signed}, within the no-change band (±${COMPARE_NO_CHANGE_BAND})`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true, children: "■" }),
          signed
        ]
      }
    );
  }
  const up = value > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: cn(
        "inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap tabular-nums",
        up ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
      ),
      "data-tip": `${up ? "Up" : "Down"} ${signed} against the previous quarter`,
      children: [
        up ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "size-3", "aria-hidden": true }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "size-3", "aria-hidden": true }),
        signed
      ]
    }
  );
}
function DateCell$1({ value }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm whitespace-nowrap tabular-nums", children: toDdMmmYyyy(value) });
}
function DueChip({
  iso,
  today,
  greenLabel = "Valid till"
}) {
  const days = daysUntil(iso, today);
  const state = dueState(days);
  const label = toDdMmmYyyy(iso);
  if (state === "none")
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm whitespace-nowrap tabular-nums", children: label });
  const chip = state === "overdue" ? { text: `Overdue ${Math.abs(days)}d`, cls: "bg-rose-100 text-rose-900 border-rose-300/70 dark:bg-rose-500/15 dark:text-rose-100 dark:border-rose-400/40" } : state === "soon" ? { text: `Due in ${days}d`, cls: "bg-amber-100 text-amber-900 border-amber-300/70 dark:bg-amber-500/15 dark:text-amber-100 dark:border-amber-400/40" } : { text: `${greenLabel} ${iso.slice(0, 4)}`, cls: "bg-emerald-100 text-emerald-900 border-emerald-300/70 dark:bg-emerald-500/15 dark:text-emerald-100 dark:border-emerald-400/40" };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: "flex min-w-0 items-center gap-1 whitespace-nowrap",
      "data-tip": `${chip.text} — ${label}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm tabular-nums", children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "span",
          {
            className: cn(
              "inline-flex items-center gap-1 overflow-hidden rounded-full border px-1.5 text-[11px] font-semibold whitespace-nowrap",
              chip.cls
            ),
            children: [
              state !== "ok" && /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-2.5 shrink-0", "aria-hidden": true }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: chip.text })
            ]
          }
        )
      ]
    }
  );
}
function SurveillanceDueChip({
  row,
  which,
  today
}) {
  const base = today ?? /* @__PURE__ */ new Date();
  const todayIso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(
    base.getDate()
  ).padStart(2, "0")}`;
  const visit = surveillanceVisits(
    row.nqas ?? null,
    null,
    todayIso
  ).find((v) => v.key === which);
  if (!visit) return null;
  const tone = visit.tone === "slate" ? "slate" : visit.tone;
  const Icon = visit.state === "done" ? CircleCheck : visit.state === "overdue" ? CircleX : visit.state === "dueSoon" ? TriangleAlert : Clock3;
  const dueLabel = visit.due ? toDdMmmYyyy(visit.due) : "no due date";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: "flex min-w-0 items-center gap-1 whitespace-nowrap",
      "data-tip": `${visit.detail ?? visit.chip}${visit.due ? ` · due ${dueLabel}` : ""}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm tabular-nums", children: dueLabel }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "span",
          {
            className: cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 text-[11px] font-semibold whitespace-nowrap",
              PILL_CLASS[tone]
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-2.5 shrink-0", "aria-hidden": true }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: visit.chip })
            ]
          }
        )
      ]
    }
  );
}
function NextActionCell({
  row,
  dense,
  today
}) {
  const next = nextDueOf(row, today);
  if (!next) return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-muted-foreground", children: "-" });
  const days = daysUntil(next.iso, today);
  const state = dueState(days);
  const timing = state === "overdue" ? `Overdue ${Math.abs(days ?? 0)}d` : state === "soon" ? `Due in ${days}d` : null;
  const date = toDdMmmYyyy(next.iso);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: "flex min-w-0 flex-col justify-center gap-0.5",
      "data-tip": `${next.label} — ${date}${timing ? ` · ${timing}` : ""}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[10px] leading-none text-muted-foreground", children: next.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn("flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0 leading-none", dense && "gap-x-0.5"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-xs font-medium tabular-nums", children: date }),
          timing && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: cn(
                "whitespace-nowrap text-[10px] font-semibold",
                state === "overdue" ? "text-rose-700" : "text-amber-700"
              ),
              children: timing
            }
          )
        ] })
      ]
    }
  );
}
function EmptyCell({ column }) {
  const label = blankLabel(column);
  if (!label) return null;
  if (column.type === "status") return /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { value: label });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: label });
}
function FacilityCell({
  row,
  dense,
  duplicate
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    FacilityCell$1,
    {
      facility: row.facility,
      compact: dense
    }
  );
}
function LinkCell({ value }) {
  const hasAttachment = !!value.attachmentId;
  const hasUrl = !!value.url;
  if (!hasAttachment && !hasUrl) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center gap-1 text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Minus, { className: "size-3", "aria-hidden": true }) });
  }
  const Icon = value.icon === "file" && /checklist|excel/i.test(value.name ?? "") ? FileSpreadsheet : value.icon === "flame" ? Flame : value.icon === "rupee" || value.icon === "building" ? Link2 : FileText;
  return hasAttachment ? /* @__PURE__ */ jsxRuntimeExports.jsx(AttachmentLink, { id: value.attachmentId, name: value.name, Icon }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "a",
    {
      href: value.url,
      target: "_blank",
      rel: "noreferrer",
      "data-tip": value.name ?? "Open link",
      "aria-label": value.name ?? "Open link",
      className: "inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-4", "aria-hidden": true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: "Open link" })
      ]
    }
  );
}
function AttachmentLink({
  id,
  name,
  Icon
}) {
  const url = useQuery(api.modules.getAttachmentUrl, { storageId: id });
  const label = name ?? "View file";
  return (
    /* ONE tooltip system: the shared `data-tip` layer, never a second
       floating library next to it. */
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "a",
      {
        href: url ?? "#",
        target: "_blank",
        rel: "noreferrer",
        "data-tip": label,
        "aria-label": label,
        className: "inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-4", "aria-hidden": true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: label })
        ]
      }
    )
  );
}
function docIconFor(icon) {
  return icon === "flame" ? Flame : icon === "rupee" || icon === "building" ? Link2 : FileText;
}
function DocsBucketCell({
  value
}) {
  const present = new Map(value.items.map((d) => [d.key, d]));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center justify-center gap-0.5 whitespace-nowrap", children: [
    DOCUMENT_LINK_COLUMNS.map((slot) => {
      const d = present.get(slot.key);
      const Icon = docIconFor(slot.icon);
      const href = d?.url ?? (d?.attachmentId ? `#${d.attachmentId}` : void 0);
      return d ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          href,
          target: d?.url ? "_blank" : void 0,
          rel: "noreferrer",
          "data-tip": `${slot.label}${d.name ? ` — ${d.name}` : ""}`,
          className: "inline-flex size-6 items-center justify-center rounded text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5", "aria-hidden": true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: d.name ?? slot.label })
          ]
        },
        slot.key
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "span",
        {
          "data-tip": `${slot.label} — not attached`,
          className: "inline-flex size-6 items-center justify-center rounded text-muted-foreground/40",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5", "aria-hidden": true }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sr-only", children: [
              slot.label,
              " — not attached"
            ] })
          ]
        },
        slot.key
      );
    }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: "ml-0.5 text-[10px] font-medium text-muted-foreground",
        "data-tip": value.docs ? `${value.docs.uploaded} of ${value.docs.total} documents uploaded` : `${value.present}/${value.max} link fields filled`,
        children: value.docs ? `${value.docs.uploaded}/${value.docs.total}` : `${value.present}/${value.max}`
      }
    ),
    (value.docs?.requiredMissing?.length ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "span",
      {
        className: "ml-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-300/70 bg-amber-50 px-1 text-[10px] font-semibold whitespace-nowrap text-amber-900",
        "data-testid": "master-documents-required-missing",
        role: "img",
        "aria-label": `Required document missing: ${value.docs.requiredMissing.map((m) => m.label).join(", ")}`,
        "data-tip": `Required missing: ${value.docs.requiredMissing.map((m) => m.label).join(", ")}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-2.5", "aria-hidden": true }),
          " ",
          value.docs.requiredMissing.length
        ]
      }
    )
  ] });
}
function LongTextCell({
  value,
  title,
  /** true = never wrap (compact rows); false = clamp to 2 lines. */
  oneLine
}) {
  const text = title ?? value;
  if (oneLine || value.length <= 60)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-sm whitespace-nowrap", "data-tip": text, "data-tip-truncate": true, children: value });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "data-tip": text,
        className: "w-full cursor-pointer rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "line-clamp-2 text-sm break-words", children: value })
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverContent, { align: "start", className: "max-w-sm text-sm whitespace-pre-wrap", children: value })
  ] });
}
function CurrencyCell({ value }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm tabular-nums", children: formatInr(value) });
}
function SmartCellView({
  row,
  column,
  value,
  today,
  dupes,
  density,
  oneLine,
  fullText = false
}) {
  const v = value ?? cellValue(row, column.key);
  if (column.primary)
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      FacilityCell,
      {
        row,
        dense: density === "compact",
        duplicate: dupes ? isDuplicateName(row, dupes) : false
      }
    );
  switch (v.kind) {
    case "empty":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyCell, { column });
    case "text":
      return column.type === "longtext" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LongTextCell, { value: v.value, oneLine: oneLine ?? density === "compact" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: cn(
            column.key === "genDoc" ? cn("text-[13px] leading-snug break-words", !fullText && "line-clamp-2") : "text-sm",
            column.key !== "genDoc" && (oneLine ? "truncate whitespace-nowrap" : "line-clamp-2 break-words")
          ),
          "data-tip": v.tip ?? v.value,
          "data-tip-truncate": true,
          children: v.value
        }
      );
    case "status":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { value: v.value, compact: density === "compact" });
    case "score":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ScoreBar$1, { value: v.value });
    case "compare":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        CompareCell,
        {
          value: v.value,
          tip: v.value == null ? compareUnavailableTip(row, column.key) : void 0
        }
      );
    case "date":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(DateCell$1, { value: v.value });
    case "dueDate":
      if (column.key === "nextAction")
        return /* @__PURE__ */ jsxRuntimeExports.jsx(NextActionCell, { row, dense: density === "compact", today });
      if (column.key === "survDue1")
        return /* @__PURE__ */ jsxRuntimeExports.jsx(SurveillanceDueChip, { row, which: "surv1", today });
      if (column.key === "survDue2")
        return /* @__PURE__ */ jsxRuntimeExports.jsx(SurveillanceDueChip, { row, which: "surv2", today });
      return v.value ? /* @__PURE__ */ jsxRuntimeExports.jsx(DueChip, { iso: v.value, today }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Not started" });
    case "currency":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(CurrencyCell, { value: v.value });
    case "link":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(LinkCell, { value: v });
    case "links":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(DocsBucketCell, { value: v });
    default:
      return null;
  }
}
const SmartCell = reactExports.memo(SmartCellView);
function compareUnavailableTip(row, columnKey) {
  const tracker = columnKey.startsWith("kayakalp") ? "kayakalp" : columnKey.startsWith("eco") ? "eco" : "nqas";
  const label = tracker === "nqas" ? "NQAS" : tracker === "kayakalp" ? "Kayakalp" : "Eco-Friendly";
  const pair = row.iaq?.pair;
  if (!pair) return `No ${label} IA quarter has data yet`;
  const scoreOf = (fy, q) => {
    const hit = (row.iaq?.rows ?? []).find((r) => r.fy === fy && r.quarter === q);
    if (!hit) return null;
    return tracker === "nqas" ? hit.nqasIaScore ?? null : tracker === "kayakalp" ? hit.kayakalpIaScore ?? null : hit.ecoFriendlyScore ?? null;
  };
  if (scoreOf(pair.previous.fy, pair.previous.q) == null) {
    return `Q${pair.previous.q} ${pair.previous.fy} has no ${label} IA score — nothing to compare against`;
  }
  if (scoreOf(pair.current.fy, pair.current.q) == null) {
    return `Q${pair.current.q} ${pair.current.fy} has no ${label} IA score — nothing to compare`;
  }
  return "Calculated from the two latest quarters with data";
}
function SkeletonRows({ rows = 8 }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 p-4", children: Array.from({ length: rows }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "h-8 animate-pulse rounded-md bg-muted/60",
      style: { opacity: 1 - i * 0.08 }
    },
    i
  )) });
}
function NoRows({
  total,
  onClear
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center px-6 py-14 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, variant: "ghost", className: "pointer-events-none size-10 p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Minus, { className: "size-5" }) }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-base font-semibold text-foreground", children: total === 0 ? "No facilities yet" : "No facilities match these filters" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 max-w-sm text-sm text-muted-foreground", children: total === 0 ? "Add your first facility with the “Add facility” button, or import a district sheet from Bulk Import." : "Try clearing a filter chip or searching for a different facility, PHC, block or NIN." }),
    onClear && total > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", className: "mt-4", onClick: onClear, children: "Clear all" })
  ] });
}

const FILE_SLOTS = [
  "fund",
  "noc",
  "condemned",
  "saReport",
  "saChecklist",
  "result"
];
const EDIT_SLOT_BY_KEY = {
  saReport: "saReport",
  saChecklist: "saChecklist",
  condemnedLink: "condemned",
  nocDoc: "noc",
  resultDoc: "result"
};
function emptyRowEdit() {
  return { draft: {}, files: {}, clears: {} };
}
function trackerDraftFromRow(cycle) {
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
    remarks: cycle.facility.remarks ?? ""
  };
}
const EDIT_FIELD_BY_KEY = {
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
  remarks: "remarks"
};
function firstRowBlocker(row, state) {
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
function isRowDirty(row, state) {
  if (!state) return false;
  const initial = trackerDraftFromRow(row);
  const fieldsDirty = Object.keys(initial).some(
    (k) => state.draft[k] !== void 0 && state.draft[k] !== initial[k]
  );
  const filesDirty = FILE_SLOTS.some(
    (s) => state.files[s] != null || state.clears[s] === true
  );
  return fieldsDirty || filesDirty;
}
function trackerUpdatePayload(row, state) {
  const draft = state.draft;
  const is = (k, v) => draft[k] !== void 0 && draft[k] !== v;
  const identity = trackerDraftFromRow(row);
  const g = (k) => draft[k] ?? identity[k];
  const num = (v) => v.trim() ? Number(v) : void 0;
  const str = (v) => v.trim() ? v : void 0;
  return {
    facilityId: row.facility._id,
    remarks: is("remarks", identity.remarks) ? str(g("remarks")) : void 0,
    nqasIaQ1: is("nqasIaQ1", identity.nqasIaQ1) ? num(g("nqasIaQ1")) : void 0,
    nqasIaQ2: is("nqasIaQ2", identity.nqasIaQ2) ? num(g("nqasIaQ2")) : void 0,
    kayakalpIaQ1: is("kayakalpIaQ1", identity.kayakalpIaQ1) ? num(g("kayakalpIaQ1")) : void 0,
    kayakalpIaQ2: is("kayakalpIaQ2", identity.kayakalpIaQ2) ? num(g("kayakalpIaQ2")) : void 0,
    certStatus: is("certStatus", identity.certStatus) ? g("certStatus") || void 0 : void 0,
    certDate: is("certDate", identity.certDate) ? str(g("certDate")) : void 0,
    certScore: is("certScore", identity.certScore) ? num(g("certScore")) : void 0,
    naScheduledDate: is("naScheduled", identity.naScheduled) ? str(g("naScheduled")) : void 0,
    naEndDate: is("naEnd", identity.naEnd) ? str(g("naEnd")) : void 0,
    naMode: is("naMode", identity.naMode) ? str(g("naMode")) : void 0,
    naDepartments: is("departments", identity.departments) ? g("departments") : void 0,
    gapClosureAmount: is("gapAmount", identity.gapAmount) ? num(g("gapAmount")) : void 0,
    gcFundYear: is("gcYear", identity.gcYear) ? str(g("gcYear")) : void 0,
    fundProcLink: is("procLink", identity.procLink) ? str(g("procLink")) : void 0,
    saStatus: is("saStatus", identity.saStatus) ? g("saStatus") || void 0 : void 0,
    saScore: is("saScore", identity.saScore) ? num(g("saScore")) : void 0,
    saAssessor1Name: is("saAssessor1", identity.saAssessor1) ? str(g("saAssessor1")) : void 0,
    saAssessor1Hud: is("saAssessor1Hud", identity.saAssessor1Hud) ? str(g("saAssessor1Hud")) : void 0,
    saAssessor2Name: is("saAssessor2", identity.saAssessor2) ? str(g("saAssessor2")) : void 0,
    saAssessor2Hud: is("saAssessor2Hud", identity.saAssessor2Hud) ? str(g("saAssessor2Hud")) : void 0,
    saReportAttachmentId: state.files.saReport?.attachmentId,
    saReportAttachmentName: state.files.saReport?.attachmentName,
    saReportAttachmentType: state.files.saReport?.attachmentType,
    saChecklistAttachmentId: state.files.saChecklist?.attachmentId,
    saChecklistAttachmentName: state.files.saChecklist?.attachmentName,
    saChecklistAttachmentType: state.files.saChecklist?.attachmentType,
    clearSaReportAttachment: !state.files.saReport && state.clears.saReport === true,
    clearSaChecklistAttachment: !state.files.saChecklist && state.clears.saChecklist === true,
    saStartDate: is("saStart", identity.saStart) ? str(g("saStart")) : void 0,
    saEndDate: is("saEnd", identity.saEnd) ? str(g("saEnd")) : void 0,
    generalDocStatus: is("genDoc", identity.genDoc) ? str(g("genDoc")) : void 0,
    surveillanceDone1: is("surv1", identity.surv1) ? str(g("surv1")) : void 0,
    surveillanceDone2: is("surv2", identity.surv2) ? str(g("surv2")) : void 0,
    manualScore: is("manualScore", identity.manualScore) ? num(g("manualScore")) : void 0,
    buildingType: is("buildingType", identity.buildingType) ? str(g("buildingType")) : void 0,
    buildingStatus: is("buildingStatus", identity.buildingStatus) ? str(g("buildingStatus")) : void 0,
    condemnedLink: is("condemnedLink", identity.condemnedLink) ? str(g("condemnedLink")) : void 0,
    nocAvailable: is("nocAvailable", identity.nocAvailable) ? str(g("nocAvailable")) : void 0,
    fireNocIssuedDate: is("nocCertified", identity.nocCertified) ? str(g("nocCertified")) : void 0,
    fireNocValidity: is("nocValidity", identity.nocValidity) ? str(g("nocValidity")) : void 0,
    nocLink: is("nocLink", identity.nocLink) ? str(g("nocLink")) : void 0,
    fundAttachmentId: state.files.fund?.attachmentId,
    fundAttachmentName: state.files.fund?.attachmentName,
    fundAttachmentType: state.files.fund?.attachmentType,
    clearFundAttachment: !state.files.fund && state.clears.fund === true,
    // Anchor: a Remove-only save must still enter the fund section.
    fundStatus: !state.files.fund && state.clears.fund === true ? row.fund?.status ?? void 0 : void 0,
    nocAttachmentId: state.files.noc?.attachmentId,
    nocAttachmentName: state.files.noc?.attachmentName,
    nocAttachmentType: state.files.noc?.attachmentType,
    clearNocAttachment: !state.files.noc && state.clears.noc === true,
    // Same anchor for the NOC section.
    fireNocStatus: !state.files.noc && state.clears.noc === true ? identity.nocStatus || void 0 : void 0,
    condemnedAttachmentId: state.files.condemned?.attachmentId,
    condemnedAttachmentName: state.files.condemned?.attachmentName,
    condemnedAttachmentType: state.files.condemned?.attachmentType,
    clearCondemnedAttachment: !state.files.condemned && state.clears.condemned === true,
    resultAttachmentId: state.files.result?.attachmentId,
    resultAttachmentName: state.files.result?.attachmentName,
    resultAttachmentType: state.files.result?.attachmentType,
    clearResultAttachment: !state.files.result && state.clears.result === true
  };
}
function trackerEditorOptions(settings) {
  return {
    /* ONE option list per field (Part 1 ④): the eligibility editor, the pill,
       filters and the admin panel all read Settings → NQAS Eligibility
       through lib/eligibility — never a hard-coded second list. */
    eligibilityOptions: buildEligibilityOptions(
      settings?.eligibilityOptions ?? DEFAULT_SETTINGS.eligibilityOptions
    ),
    buildingTypes: settings?.buildingTypes ?? ["Own Building", "Rented Building", "Rent Free Building"],
    docStatuses: settings?.generalDocStatuses ?? DEFAULT_SETTINGS.generalDocStatuses,
    assessmentModes: settings?.assessmentModes ?? [
      "Physical",
      "Virtual",
      "Hybrid"
    ],
    buildingStatuses: settings?.buildingStatuses ?? [
      "Good",
      "Needs Repair",
      "Under Renovation",
      "Dilapidated"
    ],
    departmentOptions: settings?.departmentCriteria ?? DEFAULT_SETTINGS.departmentCriteria,
    certStatusOptions: settings?.certificationStatuses ?? DEFAULT_SETTINGS.certificationStatuses,
    assessorHudOptions: settings?.assessorHuds ?? DEFAULT_SETTINGS.assessorHuds,
    saStatusOptions: settings?.saStatuses ?? DEFAULT_SETTINGS.saStatuses,
    nocAvailableOptions: settings?.nocAvailableOptions ?? DEFAULT_SETTINGS.nocAvailableOptions
  };
}
function isEditableCellKey(cellKey) {
  if (EDIT_SLOT_BY_KEY[cellKey]) return true;
  if (cellKey === "eligibility" || cellKey === "nqasIaCmp" || cellKey === "kayakalpIaCmp")
    return true;
  return EDIT_FIELD_BY_KEY[cellKey] != null;
}
function readOnlyCellReason(cellKey) {
  if (cellKey === "certCycle") return "Auto-calculated from the active certification cycle";
  if (cellKey === "pipelineStatus")
    return "Auto — merged from Facility Current Status override, assessments and documents";
  if (cellKey === "nocStatus")
    return "Auto — derived from the Fire NOC availability and validity date";
  if (cellKey === "validityDate")
    return "Auto — validity runs from the GoI letter / certification date";
  if (cellKey === "nqasIaQ1" || cellKey === "nqasIaQ2" || cellKey === "kayakalpIaQ1" || cellKey === "kayakalpIaQ2")
    return "Calculated automatically from the quarterly IA import (Bulk Import → Internal Assessment)";
  if (cellKey === "nqasIaCmp" || cellKey === "kayakalpIaCmp" || cellKey === "ecoIaCmp")
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
function CellUpload({
  id,
  name,
  value,
  updatedAt,
  onChange,
  onClear,
  disabled
}) {
  const [pickerOpen, setPickerOpen] = reactExports.useState(false);
  if (pickerOpen)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      AttachmentPicker,
      {
        initial: id ? { attachmentId: id, attachmentName: name ?? void 0 } : null,
        onChange: (v) => {
          onChange(v);
          setPickerOpen(false);
        },
        disabled
      }
    ) });
  if (value)
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-start gap-0.5",
        "data-tip": `${value.attachmentName ?? "New file"} — applies when you press Update`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex max-w-full min-w-0 items-center gap-1 text-[10px] font-medium", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-3 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: value.attachmentName ?? "New file" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                type: "button",
                variant: "outline",
                size: "sm",
                className: "h-5 gap-1 px-1 text-[10px]",
                disabled,
                onClick: () => setPickerOpen(true),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Paperclip, { className: "size-3" }),
                  "Replace"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                variant: "ghost",
                size: "sm",
                className: "h-5 px-1 text-[10px] text-destructive",
                disabled,
                onClick: () => onChange(null),
                children: "Remove"
              }
            )
          ] })
        ]
      }
    );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex flex-col items-start gap-0.5",
      "data-tip": updatedAt ? `Last updated ${toDisplayDateTime(updatedAt)}` : void 0,
      children: [
        id ? /* @__PURE__ */ jsxRuntimeExports.jsx(FileSlotLink, { id, name }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: "No file" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              type: "button",
              variant: "outline",
              size: "sm",
              className: "h-5 gap-1 px-1 text-[10px]",
              disabled,
              onClick: () => setPickerOpen(true),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Paperclip, { className: "size-3" }),
                id ? "Replace" : "Upload"
              ]
            }
          ),
          id && onClear && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              variant: "ghost",
              size: "sm",
              className: "h-5 px-1 text-[10px] text-destructive",
              disabled,
              onClick: () => {
                onChange(null);
                onClear();
              },
              children: "Remove"
            }
          )
        ] })
      ]
    }
  );
}
function FileSlotLink({ id, name }) {
  const url = useQuery(
    api.modules.getAttachmentUrl,
    id ? { storageId: id } : "skip"
  );
  if (!id) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "a",
    {
      href: url ?? "#",
      target: "_blank",
      rel: "noreferrer",
      className: "inline-flex max-w-full min-w-0 items-center gap-1 truncate text-[10px] font-medium text-primary hover:underline",
      "data-tip": name ?? "View file",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paperclip, { className: "size-3 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: name ?? "View file" })
      ]
    }
  );
}
function ComparisonCell({ q1, q2 }) {
  if (q1 == null || q2 == null) return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "—" });
  const delta = Math.round((q2 - q1) * 100) / 100;
  const color = delta > 0 ? "oklch(0.6 0.15 165)" : delta < 0 ? "oklch(0.6 0.2 25)" : "inherit";
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "";
  if (delta === 0) return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium tabular-nums", children: "No Changes" });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium tabular-nums", style: { color }, children: [
    arrow,
    " ",
    Math.abs(delta)
  ] });
}
function EditableTrackerCell({
  row,
  cellKey,
  state,
  options,
  canEdit,
  busy,
  handlers
}) {
  const slot = EDIT_SLOT_BY_KEY[cellKey];
  if (slot) return fileCellFor(slot, row, state, handlers, busy, canEdit);
  if (cellKey === "eligibility") {
    if (!canEdit) return null;
    const stored = row.facility.eligibility ?? "";
    const normalized = options.eligibilityOptions.find((o) => o.value === stored)?.value ?? eligibilityValueForLabel(stored) ?? stored;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Select,
      {
        value: normalized,
        disabled: busy || !canEdit,
        onValueChange: (v) => {
          if (v !== row.facility.eligibility) handlers.onEligibility(v);
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "glass-input h-7 w-full text-[11px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: options.eligibilityOptions.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: o.value, children: o.label }, o.value)) })
        ]
      }
    );
  }
  if (cellKey === "nqasIaCmp")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ComparisonCell, { q1: row.facility.nqasIaQ1 ?? null, q2: row.facility.nqasIaQ2 ?? null });
  if (cellKey === "kayakalpIaCmp")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ComparisonCell, { q1: row.facility.kayakalpIaQ1 ?? null, q2: row.facility.kayakalpIaQ2 ?? null });
  if (cellKey === "pipelineStatus") {
    const merged = mergedPipelineStatus(
      row.facility,
      row.sa ? { status: row.sa.status ?? "Not Yet Initiated", generalDocStatus: row.sa.generalDocStatus ?? null } : null,
      row.nqas ? {
        status: row.nqas.status ?? "Pending",
        scheduledStartDate: row.nqas.scheduledStartDate ?? null,
        certificationStatus: row.nqas.certificationStatus ?? null,
        validityDate: row.nqas.validityDate ?? null
      } : null,
      DEFAULT_SETTINGS
    );
    const label = row.facility.statusOverride || row.facility.currentStatus || "—";
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-tip": merged ?? void 0, className: "flex h-full items-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: label }) });
  }
  if (cellKey === "nocStatus")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      StatusBadge,
      {
        status: deriveFireNocStatus(
          stateOf(state, "nocAvailable") || null,
          stateOf(state, "nocValidity") || null,
          row.noc?.status ?? null
        )
      }
    );
  if (cellKey === "lastUpdated")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: "text-[11px] tabular-nums text-muted-foreground",
        "data-tip": "Auto timestamp — updates when the row is saved",
        children: row.facility.updatedAt ? toDisplayDateTime(row.facility.updatedAt) : "—"
      }
    );
  const field = EDIT_FIELD_BY_KEY[cellKey];
  if (!field) return null;
  const value = stateOf(state, field);
  if (field === "remarks")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Textarea,
      {
        rows: 1,
        className: "glass-input h-7 min-h-7 w-full resize-none overflow-hidden py-1 text-[11px]",
        value: value ?? "",
        disabled: busy || !canEdit,
        "data-tip": "General remarks",
        "aria-label": "General remarks",
        onChange: (e) => handlers.onField(field, e.target.value)
      }
    );
  const selectFor = (opts, label) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Select,
    {
      value: value || "__none",
      disabled: busy || !canEdit,
      onValueChange: (v) => handlers.onField(field, v === "__none" ? "" : v),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SelectTrigger,
          {
            className: "glass-input h-7 w-full text-[11px]",
            "data-tip": label,
            "aria-label": label,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "—" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { className: "max-h-64", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "__none", children: "—" }),
          opts.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: o, children: o }, o))
        ] })
      ]
    }
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
    "certScore",
    "gapAmount",
    "nqasIaQ1",
    "nqasIaQ2",
    "kayakalpIaQ1",
    "kayakalpIaQ2",
    "saScore",
    "manualScore"
  ].includes(field);
  const isDate = [
    "certDate",
    "naScheduled",
    "naEnd",
    "saStart",
    "saEnd",
    "surv1",
    "surv2",
    "nocCertified",
    "nocValidity"
  ].includes(field);
  if (isDate) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      DateCell,
      {
        field,
        value: value ?? "",
        disabled: busy || !canEdit,
        onChange: (iso) => handlers.onField(field, iso)
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Input,
    {
      type: numeric ? "number" : "text",
      step: numeric ? "any" : void 0,
      className: "glass-input h-7 w-full px-2 text-[11px]",
      value: value ?? "",
      disabled: busy || !canEdit,
      "aria-label": field,
      "data-tip": field.startsWith("gap") ? "Gap Closure Amount" : void 0,
      onChange: (e) => handlers.onField(field, e.target.value)
    }
  );
}
const MAX_TODAY_FIELDS = /* @__PURE__ */ new Set([
  "certDate",
  "saStart",
  "saEnd",
  "surv1",
  "surv2",
  "nocCertified"
]);
function DateCell({
  field,
  value,
  disabled,
  onChange
}) {
  const id = reactExports.useId();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    DateInput,
    {
      id: `cell-date-${id}`,
      label: field,
      value,
      onChange,
      max: MAX_TODAY_FIELDS.has(field) ? todayLocalIso() : void 0,
      today: todayLocalIso(),
      disabled,
      disabledReason: disabled ? "Read-only — you do not have edit access" : void 0,
      compact: true,
      autoOpen: true
    }
  );
}
function stateOf(state, field) {
  return state.draft[field] ?? "";
}
function fileCellFor(slot, row, state, handlers, busy, canEdit) {
  const current = {
    fund: {
      id: row.fund?.fundAttachmentId ?? null,
      name: row.fund?.fundAttachmentName ?? null
    },
    result: {
      id: row.resultDocumentId ?? null,
      name: row.resultDocumentName ?? null
    },
    noc: {
      id: row.noc?.nocAttachmentId ?? null,
      name: row.noc?.nocAttachmentName ?? null
    },
    condemned: {
      id: row.building?.condemnedAttachmentId ?? null,
      name: row.building?.condemnedAttachmentName ?? null
    },
    saReport: {
      id: row.sa?.reportAttachmentId ?? null,
      name: row.sa?.reportAttachmentName ?? null
    },
    saChecklist: {
      id: row.sa?.checklistAttachmentId ?? null,
      name: row.sa?.checklistAttachmentName ?? null
    }
  };
  const cur = current[slot];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CellUpload,
    {
      id: cur.id,
      name: cur.name,
      value: state.files[slot] ?? null,
      onChange: (v) => handlers.onFile(slot, v),
      onClear: () => handlers.onToggleClear(slot, true),
      disabled: busy || !canEdit
    }
  );
}
function EditableUpdateCell({
  row,
  state,
  canEdit,
  isAdmin,
  busy,
  onSave,
  onDelete,
  onDiscard,
  onUpdate,
  label = "Update"
}) {
  const dirty = isRowDirty(row, state);
  const blocker = firstRowBlocker(row, state);
  const identity = trackerDraftFromRow(row);
  const changedCount = state ? Object.keys(identity).filter(
    (k) => state.draft[k] !== void 0 && state.draft[k] !== identity[k]
  ).length + FILE_SLOTS.filter((s) => state.files[s] != null || state.clears[s] === true).length : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-1", "data-testid": "edit-actions", children: [
    canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: "inline-flex",
        "data-tip": dirty && blocker ? `Cannot save: ${blocker}` : void 0,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            className: "row-actions-btn flex h-7 shrink-0 items-center gap-1 px-1 text-[11px]",
            disabled: busy || dirty && !!blocker,
            "data-tip": blocker ? blocker : dirty ? `Save ${changedCount} change${changedCount === 1 ? "" : "s"} in this row` : `${label} ${row.facility.name} — opens the quick view in Edit mode`,
            "aria-label": dirty ? `Save row ${row.facility.name}` : `${label} ${row.facility.name}`,
            onClick: (e) => {
              e.stopPropagation();
              if (dirty) {
                if (!state || blocker) return;
                void onSave(row, state);
                return;
              }
              onUpdate?.(row);
            },
            children: [
              busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3 animate-spin" }) : null,
              dirty ? `Save row${changedCount ? ` · ${changedCount}` : ""}` : label
            ]
          }
        )
      }
    ),
    (onDiscard || isAdmin) && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "ghost",
          size: "icon",
          className: "size-6 shrink-0 text-muted-foreground hover:text-foreground",
          "data-tip": "More actions",
          "aria-label": `More actions ${row.facility.name}`,
          "data-more-actions": "",
          onClick: (e) => e.stopPropagation(),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "size-4", "aria-hidden": true })
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", onClick: (e) => e.stopPropagation(), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: `/facilities/${row.facility._id}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-4", "aria-hidden": true }),
          " Open full profile"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
        onDiscard && dirty && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onSelect: () => onDiscard(row), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-4", "aria-hidden": true }),
          " Discard row changes"
        ] }),
        isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          DropdownMenuItem,
          {
            className: "text-destructive",
            onSelect: () => {
              void onDelete();
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-4", "aria-hidden": true }),
              " Delete facility"
            ]
          }
        )
      ] })
    ] })
  ] });
}
function useRowDrafts() {
  const [drafts, setDrafts] = reactExports.useState({});
  const idOf = (row) => String(row.facility._id);
  const withRow = (row, patch) => setDrafts((prev) => {
    const id = idOf(row);
    const cur = prev[id] ?? (() => ({ ...emptyRowEdit(), draft: trackerDraftFromRow(row) }))();
    return { ...prev, [id]: patch(cur) };
  });
  return reactExports.useMemo(
    () => ({
      drafts,
      get: (row) => drafts[idOf(row)] ?? { ...emptyRowEdit(), draft: trackerDraftFromRow(row) },
      setField: (row, key, value) => withRow(row, (s) => ({ ...s, draft: { ...s.draft, [key]: value } })),
      setFile: (row, slot, value) => withRow(row, (s) => ({
        ...s,
        files: { ...s.files, [slot]: value },
        clears: value ? { ...s.clears, [slot]: false } : s.clears
      })),
      toggleClear: (row, slot, on) => withRow(row, (s) => ({ ...s, clears: { ...s.clears, [slot]: on } })),
      reset: (row) => setDrafts((prev) => ({ ...prev, [idOf(row)]: emptyRowEdit() })),
      resetAll: () => setDrafts({}),
      dirtyCount: (rows) => rows.filter((r) => drafts[idOf(r)] !== void 0 && isRowDirty(r, drafts[idOf(r)])).length
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drafts]
  );
}

function useResultReaderEnabled() {
  return false;
}

const TRAY_TTL_MS = 24 * 60 * 60 * 1e3;
const DB_NAME = "nqas-document-tray";
const DB_VERSION = 1;
const STORE = "files";
function newTrayId() {
  const crypto = globalThis.crypto;
  if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `tray-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function openDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("by_facility", "facilityId", { unique: false });
        store.createIndex("by_expiry", "expiresAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}
async function listTrayFiles(facilityId) {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const request = store.index("by_facility").getAll(facilityId);
      request.onsuccess = () => {
        const now = Date.now();
        const rows = request.result ?? [];
        const live = rows.filter((row) => row.expiresAt > now);
        for (const expired of rows) {
          if (expired.expiresAt <= now) store.delete(expired.id);
        }
        resolve(live.sort((a, b) => a.addedAt - b.addedAt));
      };
      request.onerror = () => resolve([]);
      tx.oncomplete = () => db.close();
      tx.onerror = () => resolve([]);
      tx.onabort = () => resolve([]);
    } catch {
      db.close();
      resolve([]);
    }
  });
}
async function putTrayFile(row) {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const existing = store.get(row.id);
      existing.onsuccess = () => {
        const previous = existing.result;
        store.put(previous ? { ...row, addedAt: previous.addedAt, expiresAt: previous.expiresAt } : row);
      };
      existing.onerror = () => store.put(row);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      db.close();
      resolve(false);
    }
  });
}
async function removeTrayFile(id) {
  const db = await openDb();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}
function trayFileAsFile(row) {
  return new File([row.blob], row.name, {
    type: row.type || "application/octet-stream",
    lastModified: row.lastModified || row.addedAt
  });
}

const MAX_BATCH = 10;
const CHIP_ORDER = [
  "NQAS_Result",
  "SA_Report",
  "SA_Checklist",
  "Gap_Closure",
  "Condemned",
  "NOC"
];
function chipLabel(key) {
  return DOCUMENT_SHORT_LABEL[key] ?? key;
}
function chipIcon(key) {
  if (key === "SA_Checklist") return FileSpreadsheet;
  if (key === "SA_Report") return FileText;
  return Image;
}
function DocumentsCard({
  facilityId,
  canEdit,
  onChanged,
  className,
  preselectKey = null,
  pendingFiles = null,
  apiRef
}) {
  const data = useQuery(api.documents.listForFacility, { facilityId });
  const queueTrayItem = useMutation(api.documents.queueTrayItem);
  const removeTrayItem = useMutation(api.documents.removeTrayItem);
  const [choices, setChoices] = reactExports.useState([]);
  const [incoming, setIncoming] = reactExports.useState({});
  const [optimistic, setOptimistic] = reactExports.useState({});
  const [failed, setFailed] = reactExports.useState({});
  const [announce, setAnnounce] = reactExports.useState("");
  const [notice, setNotice] = reactExports.useState(null);
  const [fixedType, setFixedType] = reactExports.useState(preselectKey ?? null);
  const fixedTypeRef = reactExports.useRef(preselectKey ?? null);
  const [lastPreselect, setLastPreselect] = reactExports.useState(preselectKey ?? null);
  if (preselectKey && preselectKey !== lastPreselect) {
    setLastPreselect(preselectKey);
    setFixedType(preselectKey);
  }
  reactExports.useEffect(() => {
    fixedTypeRef.current = fixedType;
  }, [fixedType]);
  const uploadState = data ? data.upload ?? getUploadState({
    settings: DEFAULT_DRIVE_SETTINGS,
    connected: data.storageConnected !== false
  }) : getUploadState({ settings: DEFAULT_DRIVE_SETTINGS, connected: true });
  const fileInput = reactExports.useRef(null);
  const typedInput = reactExports.useRef(null);
  const cameraInput = reactExports.useRef(null);
  const dropzoneRef = reactExports.useRef(null);
  const tokenRef = reactExports.useRef(0);
  const idRef = reactExports.useRef(0);
  const panelActive = reactExports.useRef(/* @__PURE__ */ new Set());
  const waiting = reactExports.useRef([]);
  const pendingTray = reactExports.useRef(/* @__PURE__ */ new Map());
  const queueTray = (choice, docKey) => {
    if (!choice.trayId) return;
    void queueTrayItem({
      facilityId,
      trayId: choice.trayId,
      docKey,
      cycleNo: data?.cycleNo ?? 1,
      originalName: choice.file.name,
      declaredMime: choice.file.type || "application/octet-stream",
      declaredSize: choice.file.size
    }).catch(() => {
    });
  };
  const forgetTray = (trayId) => {
    if (!trayId) return;
    void removeTrayFile(trayId);
    void removeTrayItem({ trayId }).catch(() => {
    });
  };
  const dropChoice = (id) => {
    const target = choices.find((c) => c.id === id);
    setChoices((prev) => prev.filter((c) => c.id !== id));
    if (target?.trayId) forgetTray(target.trayId);
  };
  const rememberTrayChoice = (choice, docKey) => {
    if (!choice.trayId) return;
    void putTrayFile({
      id: choice.trayId,
      facilityId,
      docKey,
      name: choice.file.name,
      type: choice.file.type,
      size: choice.file.size,
      lastModified: choice.file.lastModified,
      addedAt: choice.addedAt ?? Date.now(),
      expiresAt: choice.expiresAt ?? Date.now() + TRAY_TTL_MS,
      blob: choice.file
    });
    if (!uploadState.allowed) queueTray(choice, docKey);
  };
  const documents = reactExports.useMemo(
    () => data?.documents ?? [],
    [data?.documents]
  );
  const countedKeys = reactExports.useMemo(
    () => data?.countedKeys ?? COUNTED_DOC_KEYS,
    [data?.countedKeys]
  );
  const choiceCount = choices.length;
  const pump = () => {
    while (panelActive.current.size < 4 && waiting.current.length > 0) {
      const next = waiting.current.shift();
      if (panelActive.current.has(next.docKey)) {
        continue;
      }
      panelActive.current.add(next.docKey);
      if (next.trayId) pendingTray.current.set(next.docKey, next.trayId);
      setIncoming((prev) => ({
        ...prev,
        [next.docKey]: { file: next.file, token: ++tokenRef.current }
      }));
    }
  };
  const dispatch = (docKey, file, trayId) => {
    waiting.current.push({ docKey, file, trayId });
    pump();
  };
  const acceptFiles = (files, forced) => {
    if (!canEdit || files.length === 0) return;
    const room = Math.max(0, MAX_BATCH - choiceCount);
    const list = files.slice(0, room);
    if (room === 0) {
      setAnnounce(`The File as panel already holds ${MAX_BATCH} files — upload or cancel some first`);
      return;
    }
    const now = Date.now();
    const next = list.map((file) => {
      const classified = classifyDroppedFile(file);
      if (classified.candidates.length === 0) {
        return {
          id: ++idRef.current,
          file,
          candidates: [],
          suggested: null,
          chosen: null,
          reason: `.${(file.name.split(".").pop() ?? "").toLowerCase() || "file"} is not a document type this app accepts`
        };
      }
      const tray = {
        trayId: newTrayId(),
        addedAt: now,
        // The 24-hour clock starts when the file is chosen, never when it is
        // retyped or restored.
        expiresAt: now + TRAY_TTL_MS
      };
      if (forced) {
        const invalid = validateDocumentFile(forced, file);
        return {
          id: ++idRef.current,
          file,
          candidates: classified.candidates,
          suggested: null,
          chosen: invalid ? null : forced,
          reason: invalid ?? void 0,
          ...tray
        };
      }
      return {
        id: ++idRef.current,
        file,
        candidates: classified.candidates,
        suggested: classified.docKey,
        chosen: classified.docKey,
        ...tray
      };
    });
    setChoices((prev) => [...prev, ...next]);
    for (const choice of next) {
      if (!choice.trayId) continue;
      void putTrayFile({
        id: choice.trayId,
        facilityId,
        docKey: choice.chosen,
        name: choice.file.name,
        type: choice.file.type,
        size: choice.file.size,
        lastModified: choice.file.lastModified,
        addedAt: choice.addedAt ?? now,
        expiresAt: choice.expiresAt ?? now + TRAY_TTL_MS,
        blob: choice.file
      });
    }
    setAnnounce(
      list.length === 1 ? `1 file added: ${list[0].name} — choose its document type` : `${list.length} files added — choose a type for each`
    );
    if (files.length > room) {
      setAnnounce(`Only ${MAX_BATCH} files can wait at once; add the rest after uploading these`);
    }
  };
  const takeList = (list, forced) => {
    if (!list || list.length === 0) return;
    acceptFiles(Array.from(list), forced);
  };
  const requestUpload = (docKey) => {
    if (!canEdit) return;
    fixedTypeRef.current = docKey;
    setFixedType(docKey);
    dropzoneRef.current?.scrollIntoView?.({ block: "nearest" });
    typedInput.current?.click();
  };
  const clearFixedType = () => {
    fixedTypeRef.current = null;
    setFixedType(null);
  };
  const facilityRef = reactExports.useRef(facilityId);
  reactExports.useEffect(() => {
    if (facilityRef.current === facilityId) return;
    facilityRef.current = facilityId;
    setChoices([]);
    setIncoming({});
    setOptimistic({});
    setFailed({});
    setAnnounce("");
    setLastPreselect(null);
    pendingTray.current.clear();
    clearFixedType();
  }, [facilityId]);
  reactExports.useEffect(() => {
    let live = true;
    void listTrayFiles(facilityId).then((rows) => {
      if (!live || rows.length === 0) return;
      setChoices((prev) => {
        const known = new Set(prev.map((c) => c.trayId).filter(Boolean));
        const restored = [];
        for (const row of rows) {
          if (known.has(row.id)) continue;
          const file = trayFileAsFile(row);
          const classified = classifyDroppedFile(file);
          if (classified.candidates.length === 0) continue;
          const chosen = row.docKey && classified.candidates.includes(row.docKey) ? row.docKey : classified.docKey;
          const invalid = chosen ? validateDocumentFile(chosen, file) : null;
          restored.push({
            id: ++idRef.current,
            file,
            candidates: classified.candidates,
            suggested: classified.docKey,
            chosen: invalid ? null : chosen,
            reason: invalid ?? void 0,
            trayId: row.id,
            addedAt: row.addedAt,
            expiresAt: row.expiresAt
          });
        }
        return restored.length > 0 ? [...prev, ...restored] : prev;
      });
      setAnnounce(
        `${rows.length} file${rows.length === 1 ? "" : "s"} kept in the tray for up to 24 hours`
      );
    });
    return () => {
      live = false;
    };
  }, [facilityId]);
  const acceptRef = reactExports.useRef(acceptFiles);
  reactExports.useEffect(() => {
    acceptRef.current = acceptFiles;
  });
  reactExports.useEffect(() => {
    if (!preselectKey) return;
    dropzoneRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [preselectKey]);
  const pendingToken = pendingFiles?.token ?? null;
  const lastPending = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!pendingFiles || pendingToken == null) return;
    if (lastPending.current === pendingToken) return;
    lastPending.current = pendingToken;
    acceptRef.current(pendingFiles.files);
  }, [pendingFiles, pendingToken]);
  reactExports.useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      addFiles: (files, docKey) => acceptRef.current(files, docKey ?? null),
      preselect: (docKey) => {
        fixedTypeRef.current = docKey;
        setFixedType(docKey);
        dropzoneRef.current?.scrollIntoView?.({ block: "nearest" });
        typedInput.current?.click();
      },
      pick: () => {
        fixedTypeRef.current = null;
        setFixedType(null);
        fileInput.current?.click();
      }
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef]);
  const choose = (id, docKey) => {
    const target = choices.find((c) => c.id === id);
    if (!target) return;
    const invalid = validateDocumentFile(docKey, target.file);
    if (invalid) {
      setChoices(
        (prev) => prev.map((c) => c.id === id ? { ...c, chosen: null, reason: invalid } : c)
      );
      return;
    }
    if (choices.length === 1) {
      if (!uploadState.allowed) {
        setChoices(
          (prev) => prev.map((c) => c.id === id ? { ...c, chosen: docKey, reason: void 0 } : c)
        );
        rememberTrayChoice(target, docKey);
        setAnnounce(`${chipLabel(docKey)} is waiting — uploads are paused`);
        return;
      }
      setChoices([]);
      dispatch(docKey, target.file, target.trayId);
      setAnnounce(`${chipLabel(docKey)} is uploading`);
      return;
    }
    setChoices(
      (prev) => prev.map(
        (c) => c.id === id ? { ...c, chosen: docKey, reason: void 0 } : c
      )
    );
    rememberTrayChoice(target, docKey);
  };
  const applySameType = (docKey) => {
    if (!docKey) return;
    setChoices(
      (prev) => prev.map((c) => {
        if (!c.candidates.includes(docKey)) return c;
        const invalid = validateDocumentFile(docKey, c.file);
        return invalid ? c : { ...c, chosen: docKey, reason: void 0 };
      })
    );
  };
  const readyRows = choices.filter(
    (c) => c.chosen && !validateDocumentFile(c.chosen, c.file)
  );
  const waitingRows = choices.filter((c) => !c.chosen && !c.reason);
  const uploadPending = () => {
    if (!uploadState.allowed) {
      for (const row of readyRows) queueTray(row, row.chosen);
      setAnnounce("Uploads are paused — the files stay in the tray for 24 hours and upload when uploads resume");
      return;
    }
    const uploaded = /* @__PURE__ */ new Set();
    for (const row of readyRows) {
      dispatch(row.chosen, row.file, row.trayId);
      uploaded.add(row.id);
    }
    if (uploaded.size === 0) return;
    setChoices((prev) => prev.filter((c) => !uploaded.has(c.id)));
    setAnnounce(
      uploaded.size === 1 ? "1 file is uploading" : `${uploaded.size} files are uploading`
    );
  };
  const uploadPendingRef = reactExports.useRef(() => {
  });
  reactExports.useEffect(() => {
    uploadPendingRef.current = uploadPending;
  });
  const wasAllowed = reactExports.useRef(uploadState.allowed);
  reactExports.useEffect(() => {
    const before = wasAllowed.current;
    wasAllowed.current = uploadState.allowed;
    if (uploadState.allowed && !before && choices.length > 0) uploadPendingRef.current();
  }, [uploadState.allowed, choices.length]);
  const orderedDocs = reactExports.useMemo(() => {
    const reqs = data?.requirements ?? {};
    const byKey = new Map(documents.map((d) => [d.key, d]));
    return countedKeys.map((key) => {
      const existing = byKey.get(key);
      if (existing) return existing;
      return {
        key,
        label: DOCUMENT_SHORT_LABEL[key] ?? key,
        requirement: reqs[key] ?? null,
        current: null
      };
    });
  }, [data?.requirements, documents, countedKeys]);
  const onUploadState = (docKey, state) => {
    if (state === "clear") {
      const trayId = pendingTray.current.get(docKey);
      pendingTray.current.delete(docKey);
      forgetTray(trayId);
      setFailed((prev) => {
        if (!prev[docKey]) return prev;
        const next = { ...prev };
        delete next[docKey];
        return next;
      });
      if (panelActive.current.delete(docKey)) pump();
      return;
    }
    if (state === "start") {
      setNotice(null);
      setOptimistic((prev) => ({ ...prev, [docKey]: true }));
      setFailed((prev) => {
        if (!prev[docKey]) return prev;
        const next = { ...prev };
        delete next[docKey];
        return next;
      });
      return;
    }
    setOptimistic((prev) => {
      const next = { ...prev };
      delete next[docKey];
      return next;
    });
    if (state === "error") {
      setFailed((prev) => ({ ...prev, [docKey]: true }));
    } else {
      const trayId = pendingTray.current.get(docKey);
      pendingTray.current.delete(docKey);
      forgetTray(trayId);
    }
    if (panelActive.current.delete(docKey)) pump();
  };
  const visibleDocs = orderedDocs.filter(
    (doc) => (
      // UPLOADED documents are shown by the card's tiles — this list holds
      // only the pending rows: in flight, or failed (one message + Retry/
      // Remove). With nothing pending it renders no rows at all.
      !!optimistic[doc.key] || !!failed[doc.key] || // An upload dispatched from the tray mounts its row first — the row owns
      // the upload effect, so it must exist before the file starts.
      !!incoming[doc.key]
    )
  );
  const unionAccept = reactExports.useMemo(
    () => Array.from(
      new Set(
        DOCUMENT_FIELDS.filter((d) => countedKeys.includes(d.docKey)).flatMap((d) => d.accept.split(",")).map((a) => a.trim()).filter(Boolean)
      )
    ).join(","),
    [countedKeys]
  );
  if (!data) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-xl border border-border/60 p-4 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-1 inline size-4 animate-spin" }),
      " Loading documents…"
    ] });
  }
  const currentByKey = new Map(
    documents.filter((d) => d.current).map((d) => [d.key, d.current])
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: cn("glass relative rounded-xl border border-border/60 p-3", className),
      "data-testid": "documents-card",
      onPaste: (event) => {
        const files = event.clipboardData?.files;
        if (files && files.length > 0) {
          event.preventDefault();
          takeList(files, fixedTypeRef.current);
          clearFixedType();
        }
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", "aria-live": "polite", className: "sr-only", children: announce }),
        notice && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "p",
          {
            role: "status",
            className: "mb-1.5 flex items-start gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[11px] font-medium text-muted-foreground",
            "data-testid": "documents-notice",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mt-0.5 size-3 shrink-0 text-emerald-600", "aria-hidden": true }),
              " ",
              notice
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: fileInput,
            type: "file",
            multiple: true,
            accept: unionAccept,
            className: "hidden",
            "data-testid": "documents-file-input",
            onChange: (e) => {
              takeList(e.target.files);
              e.target.value = "";
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: typedInput,
            type: "file",
            accept: unionAccept,
            className: "hidden",
            "data-testid": "documents-typed-input",
            onChange: (e) => {
              takeList(e.target.files, fixedTypeRef.current);
              e.target.value = "";
              clearFixedType();
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: cameraInput,
            type: "file",
            accept: "image/*",
            capture: "environment",
            className: "hidden",
            "data-testid": "documents-camera-input",
            onChange: (e) => {
              takeList(e.target.files);
              e.target.value = "";
            }
          }
        ),
        canEdit && fixedType && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "mt-2 flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/[0.04] px-2.5 py-1 text-[11px]",
            "data-testid": "documents-next-type",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3 shrink-0 text-primary", "aria-hidden": true }),
              "Next file will be filed as ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "font-semibold", children: chipLabel(fixedType) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "ml-auto rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground",
                  "aria-label": "Clear the preselected document type",
                  onClick: clearFixedType,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3" })
                }
              )
            ]
          }
        ),
        choices.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "mt-2 rounded-xl border border-primary/40 bg-primary/[0.04] p-2",
            "data-testid": "documents-file-as",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs font-semibold", children: [
                  "File as · ",
                  choices.length,
                  " file",
                  choices.length === 1 ? "" : "s",
                  waitingRows.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1 font-normal text-muted-foreground", children: [
                    "· ",
                    waitingRows.length,
                    " still need a type"
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [
                  !fixedType && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1 text-[11px] text-muted-foreground", children: [
                    "Same type for all",
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "select",
                      {
                        "aria-label": "Same type for all",
                        className: "h-7 rounded-md border border-input bg-background px-1.5 text-[11px]",
                        value: "",
                        onChange: (e) => applySameType(e.target.value || null),
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Choose…" }),
                          [...DOCUMENT_FIELDS].filter((d) => countedKeys.includes(d.docKey)).sort((a, b) => CHIP_ORDER.indexOf(a.docKey) - CHIP_ORDER.indexOf(b.docKey)).map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d.docKey, children: chipLabel(d.docKey) }, d.docKey))
                        ]
                      }
                    )
                  ] }),
                  (choices.length > 1 || choices.some((c) => c.chosen && !c.suggested)) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: uploadPending,
                      disabled: readyRows.length === 0 || !uploadState.allowed,
                      "data-tip": !uploadState.allowed ? "Uploads are paused — these files stay in the tray and upload when uploads resume" : void 0,
                      className: "rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50",
                      "data-testid": "documents-upload-all",
                      children: [
                        "Upload ",
                        readyRows.length,
                        " file",
                        readyRows.length === 1 ? "" : "s"
                      ]
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 space-y-1.5", children: choices.map((choice) => {
                const Icon = /\.(xlsx|xls|csv)$/i.test(choice.file.name) ? FileText : Image;
                const replaced = choice.chosen ? currentByKey.get(choice.chosen) : void 0;
                const chosenConfig = choice.chosen ? DOCUMENT_FIELDS.find((d) => d.docKey === choice.chosen) : void 0;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "li",
                  {
                    className: "rounded-lg border border-border/70 bg-background px-2 py-1.5",
                    "data-testid": "documents-choice",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5 shrink-0 text-muted-foreground", "aria-hidden": true }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "span",
                          {
                            className: "min-w-0 flex-1 truncate text-xs font-medium",
                            "data-tip": choice.file.name,
                            "data-tip-truncate": true,
                            children: choice.file.name
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[11px] tabular-nums text-muted-foreground", children: formatFileSize(choice.file.size) }),
                        choice.chosen === choice.suggested && choice.suggested && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-sky-300/70 bg-sky-50 px-1.5 text-[10px] font-medium text-sky-800", children: "Suggested" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            type: "button",
                            className: "rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground",
                            "aria-label": `Cancel ${choice.file.name}`,
                            onClick: () => dropChoice(choice.id),
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
                          }
                        )
                      ] }),
                      choice.reason && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 flex items-start gap-1 text-[11px] font-medium text-destructive", role: "alert", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-0.5 size-3 shrink-0" }),
                        " ",
                        choice.reason
                      ] }),
                      !choice.reason && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "div",
                        {
                          className: "mt-1.5 flex flex-wrap items-center gap-1",
                          role: "group",
                          "aria-label": `Document type for ${choice.file.name}`,
                          onKeyDown: (e) => {
                            if (e.key === "Delete" || e.key === "Backspace") {
                              e.preventDefault();
                              dropChoice(choice.id);
                              return;
                            }
                            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                            const buttons = Array.from(
                              e.currentTarget.querySelectorAll(
                                "button[aria-pressed]:not([disabled])"
                              )
                            );
                            const at = buttons.indexOf(
                              globalThis.document.activeElement
                            );
                            if (at === -1) return;
                            e.preventDefault();
                            const step = e.key === "ArrowRight" ? 1 : buttons.length - 1;
                            buttons[(at + step) % buttons.length]?.focus();
                          },
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "File as:" }),
                            [...DOCUMENT_FIELDS].filter((d) => countedKeys.includes(d.docKey)).filter((d) => !fixedType || d.docKey === fixedType).sort((a, b) => CHIP_ORDER.indexOf(a.docKey) - CHIP_ORDER.indexOf(b.docKey)).map((d) => {
                              const accepts = choice.candidates.includes(d.docKey);
                              const invalid = accepts ? validateDocumentFile(d.docKey, choice.file) : "no";
                              const selected = choice.chosen === d.docKey;
                              const ChipIcon = chipIcon(d.docKey);
                              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                "button",
                                {
                                  type: "button",
                                  disabled: !accepts || !!invalid,
                                  onClick: () => choose(choice.id, d.docKey),
                                  "data-tip": !accepts ? `${d.label} does not accept this file type` : typeof invalid === "string" && invalid !== "no" ? invalid : void 0,
                                  className: cn(
                                    "rounded-full border px-1.5 py-0.5 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                                    selected ? "border-primary bg-primary text-primary-foreground" : accepts ? "border-border hover:border-primary hover:bg-primary/5" : "cursor-not-allowed border-border/50 text-muted-foreground/50"
                                  ),
                                  "aria-pressed": selected,
                                  children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(ChipIcon, { className: "mr-0.5 inline size-3", "aria-hidden": true }),
                                    chipLabel(d.docKey),
                                    selected && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "ml-0.5 inline size-3", "aria-hidden": true })
                                  ]
                                },
                                d.docKey
                              );
                            })
                          ]
                        }
                      ),
                      replaced && !choice.reason && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[11px] text-amber-800 dark:text-amber-300", children: [
                        "Replaces ",
                        DOCUMENT_SHORT_LABEL[choice.chosen] ?? choice.chosen,
                        " (uploaded",
                        " ",
                        new Date(replaced.uploadedAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        }),
                        ") — the previous version is kept."
                      ] }),
                      !choice.chosen && !choice.reason && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[11px] text-muted-foreground", children: [
                        "This file waits until you choose its document type.",
                        choices.length === 1 ? " One file uploads as soon as you pick its type." : ""
                      ] }),
                      chosenConfig && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-[11px] text-muted-foreground", children: [
                        chosenConfig.label,
                        ": up to ",
                        chosenConfig.maxMb,
                        " MB · ",
                        chosenConfig.typeHint
                      ] })
                    ]
                  },
                  choice.id
                );
              }) }),
              !uploadState.allowed && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1.5 flex items-start gap-1 rounded-md border border-amber-300/60 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-0.5 size-3 shrink-0" }),
                "Waiting for uploads to resume — these files are kept for up to 24 hours and go automatically when uploads resume."
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "ul",
          {
            className: cn(
              "mt-2 divide-y divide-border/60",
              visibleDocs.length === 0 && "hidden"
            ),
            "data-testid": "documents-dropzone",
            children: visibleDocs.map((doc) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "py-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              DocumentField,
              {
                facilityId,
                docKey: doc.key,
                doc,
                cycleNo: data.cycleNo,
                canEdit,
                onChanged,
                incoming: incoming[doc.key] ?? null,
                compact: true,
                onRequestUpload: requestUpload,
                onUploaded: (key, name) => {
                  setAnnounce(`${DOCUMENT_SHORT_LABEL[key] ?? key} uploaded: ${name}`);
                },
                onNotice: setNotice,
                onUploadState
              }
            ) }, doc.key))
          }
        ),
        !canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[11px] text-muted-foreground", children: "View only — you do not have edit access." })
      ]
    }
  );
}

function DocumentExportControls({
  facilityId,
  filters,
  label = "Download all documents",
  className,
  compact,
  libraryOnly
}) {
  const startExport = useMutation(api.documentLibrary.startExport);
  const getExportLink = useAction(api.documentLibrary.getExportLink);
  const jobs = useQuery(
    api.documentLibrary.listExports,
    facilityId ? { facilityId } : { libraryOnly: !!libraryOnly }
  );
  const [includeVersions, setIncludeVersions] = reactExports.useState(false);
  const [busy, setBusy] = reactExports.useState(false);
  const sawDone = reactExports.useRef(/* @__PURE__ */ new Set());
  const initialized = reactExports.useRef(false);
  const list = Array.isArray(jobs) ? jobs : [];
  const active = list.find((job) => job.status === "queued" || job.status === "running") ?? null;
  const latestDone = list.find((job) => job.status === "done") ?? null;
  const latestFinished = list.find((job) => job.status === "done" || job.status === "failed") ?? null;
  const failed = latestFinished?.status === "failed" ? latestFinished : null;
  reactExports.useEffect(() => {
    if (!Array.isArray(jobs)) return;
    if (!initialized.current) {
      initialized.current = true;
      for (const job of jobs) if (job.status === "done") sawDone.current.add(job.jobId);
      return;
    }
    for (const job of jobs) {
      if (job.status === "done" && !sawDone.current.has(job.jobId)) {
        sawDone.current.add(job.jobId);
        toast.success("ZIP ready", {
          description: `${job.baseName} · ${job.filesCount} document${job.filesCount === 1 ? "" : "s"}`
        });
      }
      if (job.status === "failed" && !sawDone.current.has(job.jobId)) {
        sawDone.current.add(job.jobId);
        toast.error(job.error ?? "The ZIP could not be built");
      }
    }
  }, [jobs]);
  const start = async () => {
    setBusy(true);
    try {
      const clean = filters ? Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== void 0)) : void 0;
      const result = await startExport({
        facilityId: facilityId ? facilityId : void 0,
        filters: clean,
        includeVersions
      });
      toast.success("Building the ZIP", {
        description: `${result.files} document${result.files === 1 ? "" : "s"} · progress shows here`
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The ZIP could not be started");
    } finally {
      setBusy(false);
    }
  };
  const download = async (jobId, part) => {
    try {
      const { url } = await getExportLink({ jobId, part });
      window.location.assign(absoluteDocumentUrl(url));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The ZIP could not be downloaded");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("min-w-0", className), "data-testid": "document-export-controls", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => void start(),
          disabled: busy || !!active,
          className: cn(
            "inline-flex items-center gap-1.5 rounded-md border border-input bg-background font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60",
            compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"
          ),
          "data-testid": "document-export-start",
          "data-guide-target": "documents-zip",
          children: [
            busy || active ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(FileArchive, { className: "size-3.5" }),
            active ? "Building ZIP…" : label
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "select",
        {
          "aria-label": "Version scope",
          value: includeVersions ? "all" : "current",
          onChange: (event) => setIncludeVersions(event.target.value === "all"),
          className: "h-7 rounded-md border border-input bg-background px-1.5 text-[11px] text-muted-foreground",
          "data-testid": "document-export-versions",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "current", children: "Current versions" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "Include previous versions" })
          ]
        }
      ),
      failed && !active && /* @__PURE__ */ jsxRuntimeExports.jsx(SeparateFileDownloads, { jobId: failed.jobId }),
      latestDone && !active && !failed && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex flex-wrap items-center gap-1", children: latestDone.parts.map((part, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => void download(latestDone.jobId, index),
          className: "inline-flex items-center gap-1 rounded-md border border-emerald-300/70 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-100",
          "data-testid": "document-export-download",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3" }),
            latestDone.parts.length > 1 ? `Part ${index + 1} of ${latestDone.parts.length}` : "ZIP",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-emerald-800/70", children: formatFileSize(part.size) })
          ]
        },
        `${latestDone.jobId}-${index}`
      )) })
    ] }),
    active && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5", "data-testid": "document-export-progress", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1 overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "h-full rounded-full bg-primary transition-all",
          style: {
            width: `${Math.min(
              100,
              Math.round(active.cursor / Math.max(1, active.filesCount) * 100)
            )}%`
          }
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-[10.5px] text-muted-foreground", children: [
        active.cursor,
        " of ",
        active.filesCount,
        " files · part ",
        active.partNo,
        active.partLimit ? ` (${active.partLimit} files per part)` : ""
      ] })
    ] })
  ] });
}
function SeparateFileDownloads({ jobId }) {
  const files = useQuery(api.documentLibrary.failedExportFiles, { jobId });
  const rows = Array.isArray(files) ? files : [];
  const urls = useDocumentUrls(
    rows.map((file) => file.documentId),
    "attachment",
    rows.length > 0
  );
  if (rows.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "w-full rounded-lg border border-amber-300/70 bg-amber-50/80 p-2 text-[11px] text-amber-950",
      "data-testid": "document-export-fallback",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: "Could not build one ZIP. Download the files separately." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1 grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2", children: rows.map((file) => {
          const href = urls[file.documentId];
          return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "min-w-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "a",
            {
              href: href || void 0,
              "aria-disabled": !href,
              className: cn(
                "inline-flex max-w-full items-center gap-1 rounded border border-amber-300/80 bg-background px-1.5 py-0.5 font-medium hover:bg-amber-100",
                !href && "pointer-events-none opacity-50"
              ),
              "data-tip": `${file.facility} · ${file.name}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3 shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "truncate", children: [
                  "Download ",
                  file.name
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-amber-800/70", children: formatFileSize(file.size) })
              ]
            }
          ) }, file.documentId);
        }) })
      ]
    }
  );
}

function dayLabel(ts) {
  if (!ts) return "-";
  return dayStamp(ts);
}
function tileIcon(key) {
  if (key === "SA_Checklist") return FileSpreadsheet;
  if (key === "NQAS_Result" || key === "NOC") return Image;
  return FileText;
}
function DocRing({ done, total }) {
  const size = 32;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? Math.min(1, done / total) : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "relative inline-flex shrink-0", style: { width: size, height: size }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "svg",
      {
        width: size,
        height: size,
        role: "img",
        "aria-label": `${done} of ${total} documents uploaded`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: size / 2, cy: size / 2, r, fill: "none", strokeWidth: stroke, className: "stroke-muted" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "circle",
            {
              cx: size / 2,
              cy: size / 2,
              r,
              fill: "none",
              strokeWidth: stroke,
              strokeLinecap: "round",
              strokeDasharray: `${c * pct} ${c}`,
              className: cn(
                "motion-reduce:transition-none",
                pct === 1 ? "stroke-emerald-500" : "stroke-primary"
              ),
              transform: `rotate(-90 ${size / 2} ${size / 2})`
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums", children: [
      done,
      "/",
      total
    ] })
  ] });
}
function DocumentStatusCard({
  facilityId,
  canEdit,
  preselectKey = null,
  pendingFiles = null,
  className
}) {
  const readerEnabled = useResultReaderEnabled();
  const data = useQuery(api.documents.listForFacility, {
    facilityId
  });
  const trayRows = useQuery(api.documents.listTray, { facilityId });
  const waitingCount = Array.isArray(trayRows) ? trayRows.length : 0;
  const saveDriveSettings = useMutation(api.drive.saveDriveSettings);
  const notifyAdmins = useMutation(api.drive.notifyUploadsPaused);
  const removeDocument = useAction(api.documents.removeDocument);
  const undoRemove = useAction(api.documents.undoRemove);
  const { user } = useAuth();
  const isAdmin = user?.appRole === "admin";
  const trayRef = reactExports.useRef(null);
  const [confirmResume, setConfirmResume] = reactExports.useState(false);
  const [notified, setNotified] = reactExports.useState(false);
  const [over, setOver] = reactExports.useState(false);
  const [openTile, setOpenTile] = reactExports.useState(null);
  const lastPreselect = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!preselectKey) {
      lastPreselect.current = null;
      return;
    }
    if (lastPreselect.current === preselectKey) return;
    lastPreselect.current = preselectKey;
    setOpen(true);
    const timer = window.setTimeout(() => trayRef.current?.preselect(preselectKey), 80);
    return () => window.clearTimeout(timer);
  }, [preselectKey]);
  const storageKey = `documents.card.open:${user?._id ?? "anon"}`;
  const [open, setOpen] = reactExports.useState(() => {
    try {
      return localStorage.getItem(storageKey) !== "0";
    } catch {
      return true;
    }
  });
  const toggle = () => {
    setOpen((v) => {
      try {
        localStorage.setItem(storageKey, v ? "0" : "1");
      } catch {
      }
      return !v;
    });
  };
  const documents = reactExports.useMemo(() => data?.documents ?? [], [data?.documents]);
  const total = documents.length || (data?.totalCount ?? 6);
  const uploaded = data?.uploadedCount ?? 0;
  const uploadState = data?.upload ?? getUploadState({
    settings: DEFAULT_DRIVE_SETTINGS,
    connected: data ? data.storageConnected !== false : true
  });
  const resumeUploads = async () => {
    try {
      await saveDriveSettings({ paused: false });
      toast.success("Uploads resumed", {
        description: "Files waiting in the tray are uploading now."
      });
      setConfirmResume(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uploads could not be resumed");
    }
  };
  const notifyAdministrator = async () => {
    try {
      await notifyAdmins({});
      setNotified(true);
      toast.success("The administrator has been notified");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The administrator could not be notified");
    }
  };
  const removeDoc = async (documentId, label) => {
    try {
      await removeDocument({ documentId, reason: "Removed from the document card" });
      setOpenTile(null);
      toast.success(`${label} moved to review`, {
        description: "It is kept for the retention period before deletion.",
        action: {
          label: "Undo",
          onClick: () => {
            void undoRemove({ documentId }).then(
              () => toast.success("Removal undone"),
              (err) => toast.error(err instanceof Error ? err.message : "Undo failed")
            );
          }
        }
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${label} could not be removed`);
    }
  };
  const missing = documents.filter(
    (d) => d.requirement?.required === true && (!d.current || d.current.missingInDrive === true)
  );
  const blockingMissing = missing.filter((d) => d.requirement?.blocking);
  const [justComplete, setJustComplete] = reactExports.useState(false);
  const prevMissing = reactExports.useRef(missing.length);
  reactExports.useEffect(() => {
    const was = prevMissing.current;
    prevMissing.current = missing.length;
    if (was > 0 && missing.length === 0) {
      setJustComplete(true);
      const t = window.setTimeout(() => setJustComplete(false), 6e3);
      return () => window.clearTimeout(t);
    }
    return;
  }, [missing.length]);
  const summary = (() => {
    if (missing.length > 0) {
      const names = missing.map((d) => d.label).join(" · ");
      const plural = missing.length > 1;
      return blockingMissing.length > 0 ? `${names} ${plural ? "are" : "is"} required for this facility; saving the NQAS assessment is blocked until ${plural ? "they are" : "it is"} uploaded.` : `${names} ${plural ? "are" : "is"} required for this facility under the current document rules.`;
    }
    if (uploaded >= total) return `All ${total} documents uploaded.`;
    return `${uploaded} of ${total} uploaded; every required document is present (${total - uploaded} optional not uploaded).`;
  })();
  if (!data) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        className: cn("glass rounded-xl border border-border/60 p-3", className),
        "aria-busy": "true",
        "aria-label": "Loading document status",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-8 rounded-full bg-muted" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-3.5 w-32 rounded bg-muted" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3", children: Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "h-[52px] animate-pulse rounded-lg border border-border/50 bg-muted/40"
            },
            i
          )) })
        ]
      }
    );
  }
  const detailDoc = openTile ? documents.find((d) => d.key === openTile) ?? null : null;
  documents.find((d) => d.key === "NQAS_Result")?.current ?? null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: cn("glass relative rounded-xl border border-border/60 p-3", className),
      "aria-label": "Document status",
      "data-testid": "document-status-card",
      onDragOver: (e) => {
        if (!canEdit) return;
        e.preventDefault();
        setOver(true);
      },
      onDragLeave: (e) => {
        if (e.currentTarget.contains(e.target)) return;
        setOver(false);
      },
      onDrop: (e) => {
        e.preventDefault();
        setOver(false);
        if (!canEdit) return;
        const files = Array.from(e.dataTransfer?.files ?? []);
        if (files.length > 0) {
          setOpen(true);
          trayRef.current?.addFiles(files);
        }
      },
      children: [
        over && canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-primary bg-primary/5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "rounded-lg bg-background/90 px-3 py-1.5 text-xs font-medium text-primary shadow-sm", children: "Drop here — choose each file's type in the File as tray" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DocRing, { done: uploaded, total }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: toggle,
                "aria-expanded": open,
                className: "flex items-center gap-1 text-sm font-semibold hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                children: [
                  "Documents",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    ChevronDown,
                    {
                      className: cn(
                        "size-3.5 text-muted-foreground transition-transform",
                        open && "rotate-180"
                      )
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-[11px] text-muted-foreground", "data-testid": "document-status-count", children: [
              uploaded,
              " of ",
              total,
              " uploaded"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => {
                const key = missing[0]?.key;
                if (!key || !canEdit) return;
                setOpen(true);
                trayRef.current?.preselect(key);
              },
              className: cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                missing.length > 0 ? "border-amber-300/70 bg-amber-50 text-amber-900 hover:bg-amber-100" : "border-emerald-300/70 bg-emerald-50 text-emerald-800"
              ),
              "data-testid": "document-status-chip",
              children: missing.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3" }),
                " ",
                missing.length,
                " required missing"
              ] }) : uploaded >= total ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }),
                " Complete"
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }),
                " All required uploaded"
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground", children: [
            "Cycle ",
            data.cycleNo
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                uploadState.allowed ? "border-emerald-300/70 bg-emerald-50 text-emerald-800" : "border-amber-300/70 bg-amber-50 text-amber-900"
              ),
              "data-testid": "document-storage-chip",
              "data-tip": uploadState.allowed ? void 0 : uploadPausedDetail(uploadState),
              children: uploadState.allowed ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "size-3" }),
                " Storage OK"
              ] }) : uploadState.reason === "paused" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3" }),
                " Uploads paused",
                uploadState.since ? ` since ${dayStamp(uploadState.since)}` : "",
                uploadState.setBy ? ` by ${uploadState.setBy}` : ""
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3" }),
                " ",
                uploadState.chip
              ] })
            }
          )
        ] }),
        !uploadState.allowed && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            role: "alert",
            className: "mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900",
            "data-testid": "document-upload-blocked",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5 shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
                isAdmin ? uploadPausedDetail(uploadState) : uploadBlockedSentence(uploadState),
                uploadState.reason === "paused" && (waitingCount > 0 ? ` ${waitingCount} file${waitingCount === 1 ? "" : "s"} waiting — kept for up to 24 hours and uploaded when uploads resume.` : " Files chosen in the tray stay there for up to 24 hours and upload as soon as uploads resume.")
              ] }),
              uploadState.reason === "paused" && isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    if (!confirmResume) {
                      setConfirmResume(true);
                      return;
                    }
                    void resumeUploads();
                  },
                  className: "shrink-0 rounded-md border border-amber-400/70 bg-background px-2 py-0.5 text-[11px] font-semibold hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  "data-testid": "document-resume-uploads",
                  children: confirmResume ? "Click again to confirm" : "Resume uploads"
                }
              ),
              uploadState.reason === "paused" && !isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  disabled: notified,
                  onClick: () => void notifyAdministrator(),
                  className: "shrink-0 rounded-md border border-amber-400/70 bg-background px-2 py-0.5 text-[11px] font-semibold hover:bg-amber-100 disabled:cursor-default disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  "data-testid": "document-notify-admin",
                  children: notified ? "Administrator notified ✓" : "Notify administrator"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentExportControls, { facilityId }) }),
        open && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          justComplete && missing.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "p",
            {
              className: "mt-1.5 flex items-center gap-1 rounded-md border border-emerald-300/70 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-900",
              role: "status",
              "data-testid": "document-status-complete",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }),
                " Required documents uploaded ✓"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3", children: documents.map((doc) => {
            const Icon = tileIcon(doc.key);
            const req = doc.requirement ?? null;
            const current = doc.current ?? null;
            const inDriveMissing = current?.missingInDrive === true;
            const requiredMissing = req?.required === true && (!current || inDriveMissing);
            const isOpen = openTile === doc.key;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                "aria-expanded": isOpen,
                "data-testid": `document-tile-${doc.key}`,
                "data-tip": requiredMissing ? req?.reason ?? "Required for this facility" : void 0,
                onClick: () => {
                  if (!current && canEdit) {
                    setOpen(true);
                    trayRef.current?.preselect(doc.key);
                    return;
                  }
                  setOpenTile(isOpen ? null : doc.key);
                },
                className: cn(
                  "flex min-h-[52px] w-full items-start gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  isOpen && "ring-1 ring-primary/50",
                  inDriveMissing ? "border-rose-300/80 bg-rose-50" : requiredMissing ? "border-amber-300/80 bg-amber-50" : current ? "border-border/70 bg-background hover:bg-muted/50" : "border-dashed border-border/70 bg-background hover:bg-muted/40"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Icon,
                    {
                      className: cn(
                        "mt-0.5 size-3.5 shrink-0",
                        inDriveMissing ? "text-rose-600" : requiredMissing ? "text-amber-700" : current ? "text-emerald-600" : "text-muted-foreground"
                      ),
                      "aria-hidden": true
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex flex-wrap items-center gap-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[12px] font-medium", children: doc.label }),
                      req && /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "span",
                        {
                          className: cn(
                            "rounded border px-1 text-[9px] font-medium whitespace-nowrap",
                            req.required ? "border-amber-300/70 bg-amber-100 text-amber-900" : "border-border/70 text-muted-foreground"
                          ),
                          "data-testid": "document-tile-badge",
                          children: req.badge
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 block truncate text-[10.5px] text-muted-foreground", children: inDriveMissing ? "File missing in Drive — re-upload" : current ? `${dayLabel(current.uploadedAt)} · ${formatFileSize(current.size)}${current.uploadedByName ? ` · ${current.uploadedByName}` : ""}` : requiredMissing ? "Not uploaded — required" : "Not uploaded" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 flex items-center gap-1 text-[10px] font-medium", children: inDriveMissing ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-rose-700", children: "Re-upload" }) : current ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-0.5 text-emerald-700", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-2.5" }),
                      " Uploaded"
                    ] }) : requiredMissing ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-0.5 text-amber-800", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-2.5" }),
                      " Upload now"
                    ] }) : canEdit ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary", children: "Upload" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Not uploaded" }) })
                  ] })
                ]
              },
              doc.key
            );
          }) }),
          readerEnabled,
          detailDoc && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "mt-1.5 rounded-lg border border-border/70 bg-background p-2 text-xs",
              "data-testid": "document-tile-detail",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12px] font-semibold", children: detailDoc.label }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-[11px] text-muted-foreground", children: [
                      detailDoc.requirement?.badge ?? "Optional",
                      detailDoc.requirement?.reason ? ` — ${detailDoc.requirement.reason}` : ""
                    ] }),
                    detailDoc.current ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 break-words", children: [
                        detailDoc.current.displayName ?? detailDoc.current.originalName,
                        " ·",
                        " ",
                        formatFileSize(detailDoc.current.size),
                        " · v",
                        detailDoc.current.versionNo
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
                        "Uploaded ",
                        dayLabel(detailDoc.current.uploadedAt),
                        detailDoc.current.uploadedByName ? ` · ${detailDoc.current.uploadedByName}` : ""
                      ] })
                    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-muted-foreground", children: "No file uploaded yet." })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      "aria-label": "Close document detail",
                      className: "rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground",
                      onClick: () => setOpenTile(null),
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
                    }
                  )
                ] }),
                detailDoc.current ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex flex-wrap gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentPreviewButton, { doc: detailDoc.current }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    DocumentOpenLink,
                    {
                      documentId: detailDoc.current.id,
                      className: "font-semibold text-primary",
                      ariaLabel: `Open ${detailDoc.label} in a new tab`,
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3" }),
                        " Open"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(DocumentDownloadLink, { documentId: detailDoc.current.id, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3" }),
                    " Download"
                  ] }),
                  canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      className: "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent",
                      onClick: () => {
                        setOpen(true);
                        trayRef.current?.preselect(detailDoc.key);
                      },
                      "data-testid": `document-replace-${detailDoc.key}`,
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(CloudUpload, { className: "size-3" }),
                        " Replace"
                      ]
                    }
                  ),
                  canEdit && detailDoc.current && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      className: "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium text-destructive hover:bg-accent",
                      onClick: () => void removeDoc(detailDoc.current.id, detailDoc.label),
                      "data-testid": "document-tile-remove",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3" }),
                        " Remove"
                      ]
                    }
                  )
                ] }) : canEdit ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    className: "mt-1.5 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground",
                    onClick: () => {
                      setOpen(true);
                      trayRef.current?.preselect(detailDoc.key);
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(CloudUpload, { className: "size-3" }),
                      " Upload now"
                    ]
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "size-3" }),
                  " View only"
                ] }),
                (detailDoc.versions?.length ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 border-t border-border/60 pt-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1 text-[11px] font-medium text-muted-foreground", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-3" }),
                    " History (",
                    detailDoc.versions.length,
                    ")"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-0.5 space-y-0.5", children: detailDoc.versions.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "truncate text-[11px] text-muted-foreground", children: [
                    "v",
                    v.versionNo ?? "-",
                    " · ",
                    dayLabel(v.uploadedAt),
                    " ·",
                    " ",
                    v.size ? formatFileSize(v.size) : "-"
                  ] }, v.id)) })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              className: cn(
                "mt-1.5 text-[11px]",
                missing.length > 0 ? "font-medium text-amber-900" : "text-muted-foreground"
              ),
              "data-testid": "document-status-summary",
              children: summary
            }
          ),
          canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex flex-wrap items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => trayRef.current?.pick(),
                className: "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-semibold hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                "data-testid": "document-status-upload",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CloudUpload, { className: "size-3" }),
                  " Upload files"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10.5px] text-muted-foreground", children: "Drop files anywhere on this card — you choose each file's type next." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            DocumentsCard,
            {
              facilityId,
              canEdit,
              apiRef: trayRef,
              preselectKey,
              pendingFiles,
              className: "mt-2 border-0 bg-transparent p-0"
            }
          )
        ] })
      ]
    }
  );
}

const score = (v) => v == null ? "—" : `${v.toFixed(1)}%`;
const range = (a, b) => [toDdMmmYyyy(a ?? null), toDdMmmYyyy(b ?? null)].filter(Boolean).join(" to ") || "—";
function validityOf(row) {
  const n = row.nqas;
  if (!n) return "—";
  if (n.certificationStatus === "Deferred") {
    if (!n.goiLetterDate) return "—";
    const [y, m, d] = n.goiLetterDate.split("-").map(Number);
    if (!y || !m || !d) return "—";
    const end = new Date(Date.UTC(y, m - 1 + 3, d));
    return `Cooling ends ${toDdMmmYyyy(end.toISOString().slice(0, 10))}`;
  }
  return n.validityDate ? `Valid till ${toDdMmmYyyy(n.validityDate)}` : "—";
}
function CycleHistoryPanel({
  facilityId,
  currentCycleNumber,
  canEdit = false,
  onOpenCycle,
  className
}) {
  const readerEnabled = useResultReaderEnabled();
  const data = useQuery(api.facilities.getFacilityCycleHistory, {
    facilityId
  });
  const [open, setOpen] = reactExports.useState(false);
  const rows = data?.cycles ?? [];
  const current = currentCycleNumber ?? data?.currentCycleNumber ?? rows[rows.length - 1]?.cycle.cycleNumber;
  const earlier = reactExports.useMemo(
    () => rows.filter((r) => r.cycle.cycleNumber !== current),
    [rows, current]
  );
  if (rows.length < 2) return null;
  const cells = [
    { label: "State assessment", value: (r) => range(r.sa?.actualStartDate, r.sa?.actualEndDate) },
    { label: "SA score", value: (r) => score(r.sa?.scorePercent) },
    { label: "NQAS scheduled", value: (r) => range(r.nqas?.scheduledStartDate, r.nqas?.scheduledEndDate) },
    { label: "NQAS visit", value: (r) => range(r.nqas?.actualStartDate, r.nqas?.actualEndDate) },
    { label: "Mode", value: (r) => r.nqas?.mode ?? "—" },
    { label: "Assessment score", value: (r) => score(r.nqas?.scorePercent) },
    { label: "Result", value: (r) => r.nqas?.certificationStatus ?? r.nqas?.status ?? "—" },
    { label: "Certification date", value: (r) => toDdMmmYyyy(r.nqas?.certificationDate ?? r.nqas?.goiLetterDate ?? null) || "—" },
    { label: "Validity", value: (r) => validityOf(r) },
    { label: "Surveillance 1", value: (r) => range(r.nqas?.surveillanceDue1, r.nqas?.surveillanceDone1) },
    { label: "Surveillance 2", value: (r) => range(r.nqas?.surveillanceDue2, r.nqas?.surveillanceDone2) },
    { label: "Documents", value: (r) => `${r.documents.length} of 6` }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: cn("glass rounded-xl border border-border/60 p-3", className),
      "data-testid": "cycle-history",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setOpen((v) => !v),
            "aria-expanded": open,
            className: "flex w-full items-center gap-2 text-left",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-4 text-primary" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-sm font-semibold", children: "Cycle history" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "block text-[11px] text-muted-foreground", children: [
                  rows.length,
                  " cycles · current Cycle #",
                  current,
                  " · ",
                  earlier.length,
                  " earlier"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                ChevronDown,
                {
                  className: cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")
                }
              )
            ]
          }
        ),
        open && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-3", children: [
          rows.map((r) => {
            const c = r.cycle;
            const n = r.nqas;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 p-2.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-semibold", children: [
                  "Cycle #",
                  c.cycleNumber,
                  " · ",
                  c.cycleType
                ] }),
                c.cycleNumber === current ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary", children: "Current" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground", children: "Read-only" }),
                r.inferred && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] italic text-amber-800", children: "Inferred from earlier data" }),
                c.cycleNumber !== current && onOpenCycle && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    className: "ml-auto text-[11px] font-medium text-primary hover:underline",
                    onClick: () => onOpenCycle(c.cycleNumber),
                    children: [
                      "Open Cycle #",
                      c.cycleNumber
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  "SA ",
                  r.sa ? score(r.sa.scorePercent) : "—"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  "NQAS ",
                  score(n?.scorePercent)
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: n?.certificationStatus ?? n?.status ?? "Not recorded" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: validityOf(r) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  "Documents ",
                  r.documents.length,
                  " of 6"
                ] })
              ] }),
              c.cycleNumber !== current && r.documents.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1.5 divide-y divide-border/40 rounded border border-border/40", children: r.documents.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex flex-wrap items-center gap-1 px-2 py-1 text-[11px]", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1 truncate", children: [
                  d.label,
                  " · ",
                  d.name,
                  " · ",
                  toDdMmmYyyy(d.uploadedAt)
                ] }),
                d.id && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  DocumentPreviewButton,
                  {
                    doc: { id: d.id, originalName: d.name },
                    label: "Preview",
                    className: "rounded border-0 bg-transparent px-1 py-0.5 text-[11px] font-normal"
                  }
                ),
                d.id && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  DocumentDownloadLink,
                  {
                    documentId: d.id,
                    className: "rounded border-0 bg-transparent px-1 py-0.5 text-[11px] font-normal",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3" }),
                      " Download"
                    ]
                  }
                ),
                readerEnabled
              ] }, d.id ?? d.key)) })
            ] }, c.cycleNumber);
          }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto rounded-lg border border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-[11px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-muted/50", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "sticky left-0 bg-muted/50 px-2 py-1 text-left font-medium", children: "Item" }),
              rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { className: "px-2 py-1 text-left font-medium whitespace-nowrap", children: [
                "Cycle #",
                r.cycle.cycleNumber
              ] }, r.cycle.cycleNumber))
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-border/40", children: cells.map((cell) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "sticky left-0 bg-background px-2 py-1 text-left font-normal text-muted-foreground", children: cell.label }),
              rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1", children: cell.value(r) }, r.cycle.cycleNumber))
            ] }, cell.label)) })
          ] }) })
        ] })
      ]
    }
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NO_CHANGE_BAND = 0.05;
const METRICS = {
  nqas: {
    label: "NQAS IA",
    colour: "#0f766e",
    soft: "bg-teal-50 text-teal-900 ring-teal-200",
    shape: "circle"
  },
  kayakalp: {
    label: "Kayakalp IA",
    colour: "#b45309",
    soft: "bg-amber-50 text-amber-900 ring-amber-200",
    shape: "diamond"
  }
};
function finite(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function scoreText(value) {
  return value == null ? "-" : value.toFixed(1);
}
function delta(current, previous) {
  if (current == null || previous == null) return null;
  return Math.round((current - previous) * 100) / 100;
}
function changeText(value) {
  if (value == null) return "-";
  if (Math.abs(value) < NO_CHANGE_BAND) return "Same";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}
function changeTone(value) {
  if (value == null) return "text-muted-foreground";
  if (Math.abs(value) < NO_CHANGE_BAND) return "text-muted-foreground";
  return value > 0 ? "text-emerald-700" : "text-rose-700";
}
function stampDate(ms) {
  if (!ms) return "-";
  const d = new Date(ms + 5.5 * 36e5);
  return `${String(d.getUTCDate()).padStart(2, "0")}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}
function readRange(key) {
  if (typeof window === "undefined") return "4";
  try {
    const saved = window.localStorage.getItem(key);
    return saved === "8" || saved === "fy" ? saved : "4";
  } catch {
    return "4";
  }
}
function useContainerWidth(initial = 720) {
  const ref = reactExports.useRef(null);
  const [width, setWidth] = reactExports.useState(initial);
  reactExports.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const next = el.clientWidth;
      if (next > 0) setWidth((current) => Math.abs(current - next) > 1 ? next : current);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
function valueOf(point, metric) {
  return metric === "nqas" ? point.nqas : point.kayakalp;
}
function latestWithValue(points, metric) {
  for (let i = points.length - 1; i >= 0; i--) {
    const value = valueOf(points[i], metric);
    if (value != null) return { index: i, point: points[i], value };
  }
  return null;
}
function previousWithValue(points, index, metric) {
  for (let i = index - 1; i >= 0; i--) {
    const value = valueOf(points[i], metric);
    if (value != null) return value;
  }
  return null;
}
function deltaAt(points, index, metric) {
  const current = valueOf(points[index], metric);
  return delta(current, previousWithValue(points, index, metric));
}
function ChangePill({ value }) {
  if (value == null) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600",
        "aria-label": "No previous quarter",
        children: "-"
      }
    );
  }
  if (Math.abs(value) < NO_CHANGE_BAND) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Minus, { className: "size-3", "aria-hidden": true }),
      " Same"
    ] });
  }
  const up = value > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
        up ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
      ),
      children: [
        up ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "size-3", "aria-hidden": true }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "size-3", "aria-hidden": true }),
        up ? "+" : "",
        value.toFixed(1)
      ]
    }
  );
}
function TargetChip({ value, target }) {
  if (value == null) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Target, { className: "size-3", "aria-hidden": true }),
      " Target ",
      target.toFixed(1)
    ] });
  }
  const difference = Math.round((value - target) * 100) / 100;
  const above = difference >= 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        above ? "bg-teal-50 text-teal-900 ring-1 ring-teal-200" : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Target, { className: "size-3", "aria-hidden": true }),
        above ? "Above" : "Below",
        " target by ",
        Math.abs(difference).toFixed(1)
      ]
    }
  );
}
function Sparkline({
  points,
  metric,
  target
}) {
  const values = points.map((p) => valueOf(p, metric));
  const reported = values.filter((v) => v != null);
  if (reported.length < 2) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: reported.length ? "One quarter" : "No data" });
  }
  const low = Math.max(0, Math.min(...reported, target) - 5);
  const w = 92;
  const h = 30;
  const x = (i) => 2 + (w - 4) * (values.length <= 1 ? 0.5 : i / (values.length - 1));
  const y = (value) => 3 + (h - 6) * (1 - (value - low) / (100 - low));
  const segments = values.slice(1).flatMap((value, i) => {
    const previous = values[i];
    if (value == null || previous == null) return [];
    return [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "line",
        {
          x1: x(i),
          y1: y(previous),
          x2: x(i + 1),
          y2: y(value),
          stroke: METRICS[metric].colour,
          strokeWidth: 1.8,
          strokeDasharray: points[i + 1].inProgress ? "4 3" : void 0,
          strokeLinecap: "round"
        },
        i
      )
    ];
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, "aria-hidden": "true", className: "shrink-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "line",
      {
        x1: 2,
        x2: w - 2,
        y1: y(target),
        y2: y(target),
        stroke: "#94a3b8",
        strokeWidth: 1,
        strokeDasharray: "3 3"
      }
    ),
    segments,
    values.map(
      (value, i) => value == null ? null : /* @__PURE__ */ jsxRuntimeExports.jsx(
        "circle",
        {
          cx: x(i),
          cy: y(value),
          r: points[i].inProgress ? 2.6 : 2,
          fill: points[i].inProgress ? "#ffffff" : METRICS[metric].colour,
          stroke: METRICS[metric].colour,
          strokeWidth: 1.4
        },
        i
      )
    )
  ] });
}
function KpiTile({
  metric,
  points,
  target
}) {
  const latest = latestWithValue(points, metric);
  const change = latest ? deltaAt(points, latest.index, metric) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "min-w-0 rounded-xl border border-border/60 bg-white p-3",
      "aria-label": `${METRICS[metric].label} latest score`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600", children: [
            metric === "nqas" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2.5 rounded-full", style: { backgroundColor: METRICS[metric].colour }, "aria-hidden": true }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2.5 rotate-45", style: { backgroundColor: METRICS[metric].colour }, "aria-hidden": true }),
            METRICS[metric].label
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkline, { points, metric, target })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap items-end gap-x-2 gap-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-3xl font-semibold leading-none tracking-tight text-slate-900 tabular-nums", children: scoreText(latest?.value ?? null) }),
          latest ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mb-0.5 text-[11px] text-muted-foreground", children: [
            latest.point.label,
            latest.point.inProgress && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-900", children: "In progress" })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mb-0.5 text-[11px] text-muted-foreground", children: "Not reported" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChangePill, { value: change }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TargetChip, { value: latest?.value ?? null, target })
        ] })
      ]
    }
  );
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function markerPath(x, y, metric) {
  if (metric === "nqas") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: x, cy: y, r: 4.5 });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: `M ${x} ${y - 5.5} L ${x + 5.5} ${y} L ${x} ${y + 5.5} L ${x - 5.5} ${y} Z` });
}
const IaChart = reactExports.memo(function IaChart2({
  points,
  target,
  fullScale,
  onFullScaleChange
}) {
  const [ref, measured] = useContainerWidth(560);
  const [tip, setTip] = reactExports.useState(null);
  const w = Math.max(300, Math.round(measured));
  const h = w < 460 ? 255 : 275;
  const pad = { top: 24, right: 18, bottom: w < 460 ? 52 : 44, left: 40 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const values = points.flatMap((p) => [p.nqas, p.kayakalp]).filter((v) => v != null);
  const low = fullScale || values.length === 0 ? 0 : Math.max(0, Math.floor((Math.min(...values, target) - 5) / 5) * 5);
  const high = 100;
  const y = (value) => pad.top + plotH * (1 - (clamp(value, low, high) - low) / Math.max(1, high - low));
  const x = (index) => points.length <= 1 ? pad.left + plotW / 2 : pad.left + plotW * index / (points.length - 1);
  const ticks = fullScale ? [0, 25, 50, 75, 100] : [low, Math.round((low + high) / 2), high];
  const splitLabels = points.length > 5 && w < 620;
  const labelY = pad.top + plotH - 7;
  const labels = [];
  const placed = [];
  for (let i = 0; i < points.length; i++) {
    for (const metric of ["nqas", "kayakalp"]) {
      const value = valueOf(points[i], metric);
      if (value == null) continue;
      const cx = x(i);
      const cy = y(value);
      const text = value.toFixed(1);
      const width = text.length * 5.6;
      const candidates = [cy - 9, cy + 15, cy - 22, cy + 28, cy - 35, cy + 41];
      let chosen = null;
      for (const candidate of candidates) {
        const top = candidate - 7;
        const bottom = candidate + 2;
        if (top < pad.top + 1 || bottom > pad.top + plotH - 1) continue;
        const box = {
          x0: clamp(cx - width / 2, pad.left, w - pad.right) - 1,
          x1: clamp(cx + width / 2, pad.left, w - pad.right) + 1,
          y0: top,
          y1: bottom
        };
        if (placed.some((b) => box.x0 < b.x1 && b.x0 < box.x1 && box.y0 < b.y1 && b.y0 < box.y1)) continue;
        placed.push(box);
        chosen = candidate;
        break;
      }
      if (chosen == null) chosen = clamp(cy - 9, pad.top + 8, pad.top + plotH - 8);
      labels.push({ x: cx, y: chosen, text, colour: METRICS[metric].colour });
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref, className: "relative min-w-0 rounded-xl border border-border/60 bg-white p-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1 flex flex-wrap items-center justify-between gap-2 px-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-semibold text-slate-700", children: "Quarterly trend" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          "aria-pressed": fullScale,
          onClick: () => onFullScaleChange(!fullScale),
          className: cn(
            "min-h-6 rounded-md border px-2 text-[10px] font-medium transition-colors duration-150",
            fullScale ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:bg-muted"
          ),
          children: "Full 0–100"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "svg",
      {
        width: w,
        height: h,
        viewBox: `0 0 ${w} ${h}`,
        role: "group",
        "aria-label": "NQAS IA and Kayakalp IA line chart by quarter",
        style: { maxWidth: "100%" },
        onMouseLeave: () => setTip(null),
        children: [
          ticks.map((tick) => /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "line",
              {
                x1: pad.left,
                x2: w - pad.right,
                y1: y(tick),
                y2: y(tick),
                stroke: "#e2e8f0",
                strokeWidth: 1
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: pad.left - 5, y: y(tick) + 3.5, textAnchor: "end", fontSize: 9.5, fill: "#64748b", children: tick.toFixed(0) })
          ] }, tick)),
          /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: 4, y: pad.top - 7, fontSize: 9.5, fill: "#64748b", children: "Score %" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "line",
            {
              x1: pad.left,
              x2: w - pad.right,
              y1: y(target),
              y2: y(target),
              stroke: "#94a3b8",
              strokeWidth: 1.2,
              strokeDasharray: "4 3"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("text", { x: w - pad.right, y: y(target) - 4, textAnchor: "end", fontSize: 9.5, fill: "#475569", children: [
            "Target ",
            target.toFixed(1)
          ] }),
          ["nqas", "kayakalp"].map(
            (metric) => points.slice(0, -1).map((point, i) => {
              const next = points[i + 1];
              const a = valueOf(point, metric);
              const b = valueOf(next, metric);
              if (a == null || b == null) return null;
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                "line",
                {
                  x1: x(i),
                  y1: y(a),
                  x2: x(i + 1),
                  y2: y(b),
                  stroke: METRICS[metric].colour,
                  strokeWidth: 2,
                  strokeLinecap: "round",
                  strokeDasharray: next.inProgress ? "5 4" : void 0
                },
                `${metric}-${point.fy}-${point.q}-line`
              );
            })
          ),
          points.map((point, i) => {
            const missing = point.nqas == null && point.kayakalp == null;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
              missing && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "text",
                {
                  x: x(i),
                  y: labelY + (i % 2 === 0 ? 0 : -12),
                  textAnchor: "middle",
                  fontSize: 8.5,
                  fill: "#94a3b8",
                  children: "Not reported"
                }
              ),
              ["nqas", "kayakalp"].map((metric) => {
                const value = valueOf(point, metric);
                if (value == null) return null;
                const cx = x(i);
                const cy = y(value);
                const change = deltaAt(points, i, metric);
                const label = `${point.label}, ${METRICS[metric].label} ${value.toFixed(1)} percent, ${change == null ? "no previous score" : `change ${changeText(change)}`}`;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "g",
                  {
                    role: "button",
                    tabIndex: 0,
                    "aria-label": label,
                    className: "cursor-pointer outline-none focus-visible:opacity-70",
                    onMouseEnter: () => setTip({ point, metric, value, change, x: cx, y: cy }),
                    onFocus: () => setTip({ point, metric, value, change, x: cx, y: cy }),
                    onBlur: () => setTip(null),
                    onClick: () => setTip({ point, metric, value, change, x: cx, y: cy }),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx, cy, r: 11, fill: "transparent" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "g",
                        {
                          fill: point.inProgress ? "#ffffff" : METRICS[metric].colour,
                          stroke: METRICS[metric].colour,
                          strokeWidth: 1.8,
                          pointerEvents: "none",
                          children: markerPath(cx, cy, metric)
                        }
                      )
                    ]
                  },
                  metric
                );
              })
            ] }, `${point.fy}-${point.q}`);
          }),
          labels.map((label, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "text",
            {
              x: label.x,
              y: label.y,
              textAnchor: "middle",
              fontSize: 10,
              fontWeight: 700,
              fill: label.colour,
              stroke: "#ffffff",
              strokeWidth: 3,
              paintOrder: "stroke",
              pointerEvents: "none",
              children: label.text
            },
            i
          )),
          points.map((point, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "text",
            {
              x: x(i),
              y: pad.top + plotH + 14,
              textAnchor: "middle",
              fontSize: 9,
              fill: "#475569",
              children: splitLabels ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("tspan", { x: x(i), dy: 0, children: [
                  "Q",
                  point.q
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("tspan", { x: x(i), dy: 10, children: point.fy })
              ] }) : point.label
            },
            `${point.fy}-${point.q}-label`
          )),
          points.map(
            (point, index) => point.inProgress ? /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { pointerEvents: "none", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "rect",
                {
                  x: clamp(x(index) - 32, pad.left, w - pad.right - 64),
                  y: 2,
                  width: 64,
                  height: 14,
                  rx: 7,
                  fill: "#fef3c7",
                  stroke: "#f59e0b",
                  strokeWidth: 0.8
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "text",
                {
                  x: clamp(x(index) - 32, pad.left, w - pad.right - 64) + 32,
                  y: 12,
                  textAnchor: "middle",
                  fontSize: 8.5,
                  fontWeight: 600,
                  fill: "#92400e",
                  children: "In progress"
                }
              )
            ] }, `${point.fy}-${point.q}-in-progress`) : null
          )
        ]
      }
    ),
    tip && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "pointer-events-none absolute z-20 w-44 rounded-lg border border-border/70 bg-white p-2 text-[11px] shadow-lg",
        style: {
          left: clamp(tip.x - 88, 4, Math.max(4, w - 180)),
          top: clamp(tip.y - 64, 4, h - 56)
        },
        role: "status",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-slate-900", children: tip.point.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-slate-600", children: [
            METRICS[tip.metric].label,
            ":",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "tabular-nums text-slate-900", children: tip.value.toFixed(1) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-slate-600", children: [
            "Change: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: changeTone(tip.change), children: changeText(tip.change) })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[10px] text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2.5 rounded-full bg-[#0f766e]", "aria-hidden": true }),
        " NQAS IA (circle)"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2.5 rotate-45 bg-[#b45309]", "aria-hidden": true }),
        " Kayakalp IA (diamond)"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2.5 rounded-full border-2 border-slate-500 bg-white", "aria-hidden": true }),
        " In progress"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block w-4 border-t border-dashed border-slate-400", "aria-hidden": true }),
        " Target"
      ] })
    ] })
  ] });
});
function ChangeCell({ value }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: cn("px-1.5 py-1.5 text-right text-[10px] font-medium tabular-nums", changeTone(value)), children: changeText(value) });
}
const IaTable = reactExports.memo(function IaTable2({ points, today }) {
  const entries = points.map((point, index) => ({ point, index })).reverse();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 rounded-xl border border-border/60 bg-white", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full table-fixed border-collapse text-[10px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("caption", { className: "sr-only", children: "Internal Assessment quarters, newest first" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("colgroup", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[25%]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[16%]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[14%]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[16%]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[14%]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[15%]" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-slate-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-1.5 py-2 text-left text-[9px] font-semibold uppercase tracking-wide text-slate-500", children: "Quarter" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-1.5 py-2 text-right text-[9px] font-semibold uppercase tracking-wide text-slate-500", children: "NQAS IA" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-1.5 py-2 text-right text-[9px] font-semibold uppercase tracking-wide text-slate-500", children: "Change" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-1.5 py-2 text-right text-[9px] font-semibold uppercase tracking-wide text-slate-500", children: "Kayakalp IA" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-1.5 py-2 text-right text-[9px] font-semibold uppercase tracking-wide text-slate-500", children: "Change" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-1.5 py-2 text-left text-[9px] font-semibold uppercase tracking-wide text-slate-500", children: "Status" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: entries.map(({ point, index }) => {
      const inProgress = point.fy === today.fy && point.q === today.q;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "tr",
        {
          tabIndex: 0,
          className: "border-t border-border/40 outline-none focus-visible:bg-slate-50",
          "aria-label": `${point.label}: NQAS ${scoreText(point.nqas)}, Kayakalp ${scoreText(point.kayakalp)}, ${inProgress ? "In progress" : "Final"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "row", className: "px-1.5 py-1.5 text-left font-medium text-slate-800", children: point.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1.5 py-1.5 text-right tabular-nums text-slate-900", children: scoreText(point.nqas) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChangeCell, { value: deltaAt(points, index, "nqas") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1.5 py-1.5 text-right tabular-nums text-slate-900", children: scoreText(point.kayakalp) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChangeCell, { value: deltaAt(points, index, "kayakalp") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1.5 py-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: cn(
                  "inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                  inProgress ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600"
                ),
                children: inProgress ? "In progress" : "Final"
              }
            ) })
          ]
        },
        `${point.fy}-${point.q}`
      );
    }) })
  ] }) });
});
function EmptyState({ canImport }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-dashed border-border/70 bg-slate-50/60 px-4 py-6 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-slate-700", children: "No IA scores yet." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "They come from the quarterly IA import." }),
    canImport && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, size: "sm", variant: "outline", className: "mt-3 h-8 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/bulk-import", children: "Go to Bulk Import" }) })
  ] });
}
function IaCardSkeleton({ className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("space-y-3", className), "aria-label": "Loading Internal Assessment", "aria-busy": "true", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-5 w-44 rounded bg-muted" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-3 w-64 max-w-full rounded bg-muted" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-28 rounded-xl bg-muted/70" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-28 rounded-xl bg-muted/70" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-52 rounded-xl bg-muted/60" })
  ] });
}
function IACard({
  rows,
  endPeriod,
  className,
  settings,
  userId,
  canImport = false
}) {
  const [wrapRef, width] = useContainerWidth(720);
  const [fullScale, setFullScale] = reactExports.useState(false);
  const storageKey = `nqas.ia.range.${userId || "guest"}`;
  const [range, setRange] = reactExports.useState(() => readRange(storageKey));
  const target = readIaTarget((settings ?? {}).iaTarget);
  const current = reactExports.useMemo(() => currentIaQuarter(todayLocalIso()), []);
  reactExports.useEffect(() => {
    setRange(readRange(storageKey));
  }, [storageKey]);
  const selectRange = (next) => {
    setRange(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
    }
  };
  const scored = reactExports.useMemo(
    () => rows.filter((row) => row.nqasIaScore != null || row.kayakalpIaScore != null).sort((a, b) => a.fy.localeCompare(b.fy) || a.quarter - b.quarter),
    [rows]
  );
  const anchor = reactExports.useMemo(() => {
    if (endPeriod) return endPeriod;
    const latest = scored[scored.length - 1];
    if (!latest) return null;
    return {
      fy: latest.fy,
      q: Math.min(4, Math.max(1, latest.quarter))
    };
  }, [endPeriod, scored]);
  const periods = reactExports.useMemo(() => {
    if (!anchor) return [];
    if (range === "fy") {
      return Array.from({ length: anchor.q }, (_, index) => ({
        fy: anchor.fy,
        q: index + 1
      }));
    }
    return lastQuarters(anchor.fy, anchor.q, range === "8" ? 8 : 4);
  }, [anchor, range]);
  const points = reactExports.useMemo(
    () => periods.map((period) => {
      const row = rows.find((item) => item.fy === period.fy && item.quarter === period.q);
      return {
        fy: period.fy,
        q: period.q,
        label: formatFyQuarter(period.fy, period.q),
        nqas: finite(row?.nqasIaScore),
        kayakalp: finite(row?.kayakalpIaScore),
        nqasRemark: row?.nqasRemark ?? null,
        kayakalpRemark: row?.kayakalpRemark ?? null,
        updatedAt: row?.updatedAt ?? null,
        inProgress: period.fy === current.fy && period.q === current.q
      };
    }),
    [periods, rows, current.fy, current.q]
  );
  const latestUpdated = reactExports.useMemo(() => {
    const stamps = rows.map((row) => row.updatedAt ?? 0).filter((stamp) => stamp > 0);
    return stamps.length ? Math.max(...stamps) : null;
  }, [rows]);
  const wide = width >= 900;
  const hasScores = points.some((point) => point.nqas != null || point.kayakalp != null);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: wrapRef, className: cn("min-w-0 space-y-3", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex flex-wrap items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-semibold text-slate-900", children: "Internal Assessment" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: "Quarterly NQAS IA and Kayakalp IA scores" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[11px] text-muted-foreground", children: [
          "Last updated ",
          stampDate(latestUpdated),
          " · Target ",
          target.toFixed(1)
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex max-w-full flex-col items-end gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1 rounded-lg border border-border/60 p-0.5", role: "group", "aria-label": "Internal Assessment range", children: [
          ["4", "Last 4 quarters"],
          ["8", "Last 8"],
          ["fy", "This financial year"]
        ].map(([value, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "aria-pressed": range === value,
            onClick: () => selectRange(value),
            className: cn(
              "min-h-7 rounded-md px-2 text-[10px] font-medium transition-colors duration-150",
              range === value ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted"
            ),
            children: label
          },
          value
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "group relative inline-flex items-center gap-1 text-[10px] text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-3", "aria-hidden": true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "font-medium underline decoration-dotted underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
              "aria-label": "How to read this",
              children: "How to read this"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              role: "tooltip",
              className: "pointer-events-none absolute right-0 top-full z-30 mt-1 w-60 rounded-lg border border-border/70 bg-white p-2 text-left text-[11px] leading-relaxed text-slate-600 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
              children: "In progress = the quarter is still open. Same = change under 0.05. A dash means the quarter was not reported, never 0."
            }
          )
        ] })
      ] })
    ] }),
    !hasScores ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { canImport }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 sm:grid-cols-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(KpiTile, { metric: "nqas", points, target }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(KpiTile, { metric: "kayakalp", points, target })
      ] }),
      wide ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid items-start gap-4 min-[900px]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          IaChart,
          {
            points,
            target,
            fullScale,
            onFullScaleChange: setFullScale
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(IaTable, { points, today: current })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          IaChart,
          {
            points,
            target,
            fullScale,
            onFullScaleChange: setFullScale
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "group rounded-xl border border-border/60 bg-white", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", children: [
            "Show table",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3.5 transition-transform duration-150 group-open:rotate-180", "aria-hidden": true })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border/50 p-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IaTable, { points, today: current }) })
        ] })
      ] })
    ] })
  ] });
}

function ScoreBar({
  label,
  value,
  bands = DEFAULT_SCORE_BANDS,
  hint,
  className
}) {
  const band = scoreBandFor(value, bands);
  const width = value == null ? 0 : Math.max(0, Math.min(100, value));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("min-w-0", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate text-xs text-muted-foreground", title: label, children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-xs font-semibold tabular-nums text-foreground", children: value == null ? "-" : value.toFixed(2) }),
      hint ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[10px] text-muted-foreground", children: hint }) : null
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 h-1.5 overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300",
        style: {
          width: `${width}%`,
          backgroundColor: band?.colour ?? "var(--muted-foreground)"
        },
        "aria-hidden": true
      }
    ) })
  ] });
}
function ScoreLegend({ bands }) {
  const examples = [Math.max(0, bands.below - 1), bands.satisfactory, bands.excellent];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: "Colour guide" }),
    examples.map((value) => {
      const band = scoreBandFor(value, bands);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "inline-block size-2 rounded-full",
            style: { backgroundColor: band?.colour ?? "#94a3b8" },
            "aria-hidden": true
          }
        ),
        band?.label ?? "-"
      ] }, value);
    }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Numbers are always shown." })
  ] });
}

function changeBetween(value, previous) {
  if (value == null || previous == null) return null;
  return value - previous;
}
function FacilityScoresPanel({ facilityId }) {
  const data = useQuery(api.annexure.forFacility, {
    facilityId
  });
  const rows = data?.rows ?? [];
  const bands = data?.scoreBands ?? DEFAULT_SCORE_BANDS;
  const [selected, setSelected] = reactExports.useState("");
  reactExports.useEffect(() => {
    if (rows.length === 0) {
      setSelected("");
      return;
    }
    setSelected(
      (current) => rows.some((row2) => row2.cycleId === current) ? current : rows[rows.length - 1].cycleId
    );
  }, [rows]);
  const index = rows.findIndex((row2) => row2.cycleId === selected);
  const row = index >= 0 ? rows[index] : rows[rows.length - 1] ?? null;
  const previous = index > 0 ? rows[index - 1] : index < 0 ? rows[rows.length - 2] : null;
  const previousAreas = reactExports.useMemo(
    () => new Map((previous?.areas ?? []).map((a) => [a.key, a.score])),
    [previous]
  );
  const previousDepartments = reactExports.useMemo(
    () => new Map(
      (previous?.departments ?? []).map((d) => [
        (d.canonicalName || d.name).toLowerCase(),
        d.score
      ])
    ),
    [previous]
  );
  if (!data) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 p-4 text-xs text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }),
      " Loading scores…"
    ] });
  }
  if (!row) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium text-foreground", children: "No scores yet" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs", children: "Read the Annexure I section from this facility’s NQAS Result PDF to save its area, department and PSS scores." })
    ] });
  }
  const overallChange = changeBetween(row.overall, previous?.overall);
  const pssChange = changeBetween(row.pss, previous?.pss);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold text-foreground", children: "Annexure I scores" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
          row.areas.length ? "Area of Concern wise score" : "Area scores were not read",
          previous ? ` · change vs Cycle #${previous.cycleNumber}` : " · no previous cycle"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: selected || row.cycleId, onValueChange: setSelected, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-8 w-44 text-xs", "aria-label": "Scores cycle", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { align: "end", children: rows.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectItem, { value: item.cycleId, children: [
          "Cycle #",
          item.cycleNumber,
          item.cycleType ? ` · ${item.cycleType}` : ""
        ] }, item.cycleId)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 bg-muted/20 px-3 py-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-medium text-muted-foreground", children: "Overall score" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-bold tabular-nums text-foreground", children: row.overall == null ? "-" : row.overall.toFixed(2) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-[10px] text-muted-foreground", children: [
          "vs previous: ",
          scoreChangeText(overallChange)
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 bg-muted/20 px-3 py-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-medium text-muted-foreground", children: "PSS" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-bold tabular-nums text-foreground", children: row.pss == null ? "-" : row.pss.toFixed(2) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-[10px] text-muted-foreground", children: [
          "vs previous: ",
          scoreChangeText(pssChange)
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-label": "Area scores", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-semibold", children: "Areas A–H" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-muted-foreground", children: [
          row.areas.filter((a) => a.score != null).length,
          " of 8 scored"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2.5", children: row.areas.map((area) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        ScoreBar,
        {
          label: `${area.key} · ${area.name}`,
          value: area.score,
          bands,
          hint: previous ? `Δ ${scoreChangeText(changeBetween(area.score, previousAreas.get(area.key)))}` : void 0
        },
        area.key
      )) })
    ] }),
    row.departments.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-label": "Department scores", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "mb-2 text-xs font-semibold", children: "Departments" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2.5", children: row.departments.map((department) => {
        const canonical = department.canonicalName || department.name;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          ScoreBar,
          {
            label: canonical === department.name ? department.name : `${department.name} · ${canonical}`,
            value: department.score,
            bands,
            hint: previous ? `Δ ${scoreChangeText(
              changeBetween(
                department.score,
                previousDepartments.get(canonical.toLowerCase())
              )
            )}` : void 0
          },
          `${department.name}-${canonical}`
        );
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ScoreLegend, { bands }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: cn("text-[10px] text-muted-foreground"), children: "The change is this cycle minus the previous saved cycle. A difference below 0.05 reads “No change”." })
  ] });
}

const todayIso = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
function sectionForKind(kind) {
  switch (kind) {
    case "ia":
      return "ia";
    case "surveillance":
      return "surveillance";
    case "cert":
      return "nqas";
    case "noc":
      return "buildingNoc";
    case "funds":
      return "funds";
    default:
      return "sa";
  }
}
function Card({
  title,
  icon,
  children,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: cn(
        "min-w-0 rounded-xl border border-border/60 bg-background/60 p-3",
        className
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", children: [
          icon,
          title
        ] }),
        children
      ]
    }
  );
}
function Empty() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-muted-foreground", children: "-" });
}
function QuickViewOverview({
  row,
  canEdit,
  settings,
  docs,
  onJump,
  onOpenDocuments,
  remarks,
  onRemarksChange
}) {
  const today = todayIso();
  const sa = row.sa ?? {};
  const nq = row.nqas ?? {};
  const f = row.facility;
  const next = nextDueOf(row);
  const uploaded = docs?.uploaded ?? row.docs?.uploaded ?? 0;
  const total = docs?.total ?? row.docs?.total ?? 6;
  const rawMissing = Array.isArray(docs?.requiredMissing) ? docs?.requiredMissing : row.docs?.requiredMissing ?? [];
  const missing = rawMissing.map(
    (m) => typeof m === "string" ? { key: m, label: DOCUMENT_SHORT_LABEL[m] ?? m, blocking: false } : m
  ).filter((m) => !!m && typeof m.key === "string");
  const fullPhones = canEdit || settings?.assessorPhoneVisibility === "everyone";
  const dates = [
    { label: "State assessment", iso: sa.actualStartDate ?? sa.scheduledDate, jump: "sa" },
    { label: "NQAS assessment", iso: nq?.actualStartDate ?? nq?.scheduledStartDate, jump: "nqas" },
    { label: "Result", iso: nq?.certificationDate ?? nq?.goiLetterDate, jump: "nqas" },
    { label: "Valid till", iso: nq?.validityDate, jump: "nqas" },
    {
      label: "Surveillance",
      iso: nq?.surveillanceDue1 ?? nq?.surveillanceDue2,
      jump: "surveillance"
    }
  ];
  const iaRows = row.iaq?.rows ?? [];
  const iaLatest = iaRows[iaRows.length - 1];
  const iaPrevious = iaRows[iaRows.length - 2];
  const iaChange = iaLatest?.nqasIaScore != null && iaPrevious?.nqasIaScore != null ? iaLatest.nqasIaScore - iaPrevious.nqasIaScore : null;
  const spark = iaRows.slice(-6).map((r) => r.nqasIaScore ?? null);
  const assessors = [
    {
      name: sa.assessor1Name ?? "",
      designation: sa.assessor1Designation ?? "",
      phone: sa.assessor1Phone ?? ""
    },
    {
      name: sa.assessor2Name ?? "",
      designation: sa.assessor2Designation ?? "",
      phone: sa.assessor2Phone ?? ""
    }
  ].filter((a) => a.name);
  const attention = [];
  for (const m of missing.slice(0, 2)) {
    attention.push({
      label: `Missing ${m.label ?? DOCUMENT_SHORT_LABEL[m.key] ?? m.key}`,
      fix: () => onOpenDocuments(m.key)
    });
  }
  if (next && daysUntil(next.iso, /* @__PURE__ */ new Date()) != null && daysUntil(next.iso, /* @__PURE__ */ new Date()) < 0) {
    attention.push({
      label: `${next.label} overdue (${toDdMmmYyyy(next.iso)})`,
      fix: () => onJump(sectionForKind(next.kind))
    });
  }
  if (!sa.status || sa.status === "Not Yet Initiated") {
    attention.push({
      label: "State assessment not scheduled",
      fix: () => onJump("sa")
    });
  }
  const copy = async (phone) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success("Contact number copied");
    } catch {
      toast.error("Could not copy the number");
    }
  };
  const ring = total > 0 ? Math.round(uploaded / total * 100) : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Status & next action", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-3.5" }), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary", children: f.currentStatus || "Not started" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: cycleLabel(row.cycleNumber == null ? null : { cycleNumber: row.cycleNumber, cycleType: row.cycleType ?? null }) })
      ] }),
      next ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-end justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm font-medium", children: next.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: toDdMmmYyyy(next.iso) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            variant: "outline",
            className: "h-7 shrink-0 text-[11px]",
            onClick: () => onJump(sectionForKind(next.kind)),
            children: [
              "Open ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "ml-1 size-3" })
            ]
          }
        )
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Nothing due" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { title: "Key dates", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarClock, { className: "size-3.5" }), children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1", children: dates.map((d) => {
      const done = !!d.iso && d.iso <= today;
      const days = d.iso ? daysUntil(d.iso, /* @__PURE__ */ new Date()) : null;
      return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => onJump(d.jump ?? "sa"),
          className: "flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-muted/60",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: cn(
                  "size-1.5 shrink-0 rounded-full",
                  !d.iso ? "bg-muted-foreground/30" : done ? "bg-emerald-500" : "bg-amber-500"
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate", children: d.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[11px] tabular-nums text-muted-foreground", children: d.iso ? toDdMmmYyyy(d.iso) : "-" }),
            d.label === "Valid till" && d.iso && days != null && days >= 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0 rounded-full bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200", children: [
              days,
              "d"
            ] })
          ]
        }
      ) }, d.label);
    }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Scores", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5" }), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase text-muted-foreground", children: "SA score" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-semibold tabular-nums", children: sa.scorePercent != null ? formatPercent(sa.scorePercent) : "-" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase text-muted-foreground", children: "NQAS score" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-semibold tabular-nums", children: nq?.scorePercent != null ? formatPercent(nq.scorePercent) : "-" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-end gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-7 flex-1 items-end gap-0.5", "aria-hidden": true, children: spark.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "No IA quarters" }) : spark.map((v, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "flex-1 rounded-sm bg-teal-500/70",
            style: { height: `${Math.max(8, (v ?? 0) * 0.28)}%` }
          },
          i
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold tabular-nums", children: iaLatest?.nqasIaScore != null ? formatPercent(iaLatest.nqasIaScore) : "-" }),
          iaChange != null && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: cn("text-[11px] font-medium", iaChange >= 0 ? "text-emerald-700" : "text-rose-700"), children: [
            iaChange >= 0 ? "+" : "",
            iaChange.toFixed(1)
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { title: "Assessors", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(UserRound, { className: "size-3.5" }), children: assessors.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Empty, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: assessors.map((a) => {
      const shown = a.phone ? phoneForViewer(a.phone, fullPhones) : "";
      const tel = fullPhones ? telHref(a.phone) : null;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm font-medium", children: a.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-[11px] text-muted-foreground", children: a.designation || "-" }),
          shown && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] tabular-nums", children: shown })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 gap-1", children: [
          tel && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, size: "icon", variant: "ghost", className: "size-7", children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: tel, "aria-label": `Call ${a.name}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Phone, { className: "size-3.5" }) }) }),
          fullPhones && a.phone && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "icon",
              variant: "ghost",
              className: "size-7",
              onClick: () => void copy(a.phone),
              "aria-label": `Copy ${a.name}'s number`,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-3.5" })
            }
          )
        ] })
      ] }, a.name);
    }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { title: "Documents", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5" }), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "relative grid size-12 shrink-0 place-items-center rounded-full",
          style: {
            background: `conic-gradient(var(--primary) ${ring}%, var(--muted) ${ring}% 100%)`
          },
          role: "img",
          "aria-label": `${uploaded} of ${total} documents uploaded`,
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "grid size-9 place-items-center rounded-full bg-background text-[11px] font-bold tabular-nums", children: [
            uploaded,
            "/",
            total
          ] })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1", children: missing.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "All required documents uploaded" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1", children: missing.slice(0, 4).map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => onOpenDocuments(m.key),
          className: cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
            m.blocking ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100" : "border-border bg-background text-muted-foreground"
          ),
          children: DOCUMENT_SHORT_LABEL[m.key] ?? m.label ?? m.key
        },
        m.key
      )) }) })
    ] }) }),
    attention.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Card,
      {
        title: "Needs attention",
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5" }),
        className: "border-amber-200/70 bg-amber-50/40 dark:border-amber-400/30 dark:bg-amber-500/10",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1.5", children: attention.slice(0, 3).map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 text-sm", children: a.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", className: "h-7 shrink-0 text-[11px]", onClick: a.fix, children: "Fix" })
        ] }, a.label)) })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { title: "Details", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-3.5" }), className: "sm:col-span-2 xl:col-span-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "space-y-1.5 text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "w-24 shrink-0 text-[11px] uppercase text-muted-foreground", children: "SaQsham name" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "min-w-0 flex-1 truncate", children: f.saqshamCategory || "-" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "w-24 shrink-0 text-[11px] uppercase text-muted-foreground", children: "Application" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "min-w-0 flex-1 truncate", children: f.saqshamApplicationNo || "-" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "w-24 shrink-0 text-[11px] uppercase text-muted-foreground", children: "Remarks" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "min-w-0 flex-1", children: canEdit ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            value: remarks,
            onChange: (e) => onRemarksChange(e.target.value),
            rows: 2,
            maxLength: 500,
            placeholder: "-",
            className: "w-full rounded-md border border-input bg-background px-2 py-1 text-sm",
            "aria-label": "Remarks"
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block whitespace-pre-wrap break-words", children: remarks || "-" }) })
      ] })
    ] }) })
  ] });
}

const TONE_ICON = {
  grey: CircleDashed,
  blue: CalendarClock,
  amber: Clock4,
  purple: Hourglass,
  green: BadgeCheck,
  red: OctagonAlert
};
const TONE_CHIP = {
  grey: "border-border bg-muted text-muted-foreground",
  blue: "border-sky-300/70 bg-sky-100 text-sky-900 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-100",
  amber: "border-amber-300/80 bg-amber-100 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100",
  purple: "border-violet-300/70 bg-violet-100 text-violet-900 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-100",
  green: "border-emerald-300/70 bg-emerald-100 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100",
  red: "border-rose-300/80 bg-rose-100 text-rose-900 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100"
};
const TONE_HEX = {
  grey: "#64748b",
  blue: "#0284c7",
  amber: "#d97706",
  purple: "#7c3aed",
  green: "#059669",
  red: "#dc2626"
};
function ToneIcon({ tone, className }) {
  const Icon = TONE_ICON[tone];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: cn("size-3.5 shrink-0", className), "aria-hidden": true });
}
function StatusChip({
  label,
  tone,
  className,
  size = "sm"
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      role: "status",
      "aria-label": `Status: ${label}`,
      className: cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        TONE_CHIP[tone],
        className
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ToneIcon, { tone }),
        label
      ]
    }
  );
}
function ToneBar({
  value,
  tone,
  max = 100,
  className
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className),
      role: "img",
      "aria-label": `${value} of ${max}`,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "h-full rounded-full transition-[width] duration-500",
          style: { width: `${pct}%`, background: TONE_HEX[tone] }
        }
      )
    }
  );
}

const DERIVED_KEYS = /* @__PURE__ */ new Set([
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
  "recertYear"
]);
const OPTION_LIST = {
  saStatus: "saStatusOptions",
  certStatus: "certStatusOptions",
  genDoc: "docStatuses",
  buildingType: "buildingTypes",
  buildingStatus: "buildingStatuses",
  naMode: "assessmentModes",
  nocAvailable: "nocAvailableOptions",
  assessor1Hud: "assessorHudOptions",
  assessor2Hud: "assessorHudOptions"
};
function fieldKeyFor(columnKey) {
  return EDIT_FIELD_BY_KEY[columnKey] ?? null;
}
function draftDisplay(column, raw) {
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
function FieldRow({
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
  onFile
}) {
  const field = fieldKeyFor(column.key);
  const autoDeclared = field === "genDoc" && isResultDeclaredStatus(row.nqas?.certificationStatus);
  const derived = DERIVED_KEYS.has(column.key) || autoDeclared;
  const editable = canEdit && !!field && isEditableCellKey(column.key) && !autoDeclared;
  const changed = draftValue !== void 0 && initialValue !== void 0 && draftValue !== initialValue;
  const lockReason = autoDeclared ? `Set automatically because the result is declared — ${RESULT_DECLARED_LABEL}` : derived ? readOnlyCellReason(column.key) : !field ? "Edited in the Facility Profile" : null;
  const hintId = reactExports.useId();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-qv-field": column.key,
      className: cn(
        // 40 px rows, two columns on wide screens and ONE column under 720 px
        // (task §7.2) — the label sits above its value on a phone.
        "group grid grid-cols-1 items-start gap-x-3 gap-y-0.5 border-b border-border/40 px-3 py-1.5 last:border-b-0 min-[720px]:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] min-[720px]:gap-y-0 min-[720px]:py-2",
        changed && "bg-amber-50/70",
        editing && editable && "hover:bg-muted/40"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("dt", { className: "flex items-center gap-1.5 pt-1 text-[13px] leading-snug text-muted-foreground", children: [
          editing && editable ? /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-3 shrink-0 text-muted-foreground/60", "aria-hidden": true }) : editing && lockReason ? /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "size-3 shrink-0 text-muted-foreground/60", "aria-hidden": true }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0", children: label })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { className: "min-w-0", children: [
          editing && editable ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-8", children: active ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            FieldEditor,
            {
              column,
              value: draftValue ?? initialValue ?? "",
              options,
              issue,
              hintId,
              onChange: (v) => field && onDraftChange(field, v),
              onDone: onDeactivate,
              onFile
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: onActivate,
              onKeyDown: (e) => {
                if (e.key === "Enter" || e.key === "F2" || e.key === " ") {
                  e.preventDefault();
                  onActivate();
                }
              },
              "aria-describedby": issue ? hintId : void 0,
              "aria-label": `${label}: ${draftDisplay(column, draftValue ?? initialValue ?? "")}. Edit`,
              className: "flex min-h-8 w-full items-center gap-1.5 rounded-md px-1.5 text-left text-sm break-words transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 break-words", children: draftDisplay(column, draftValue ?? initialValue ?? "") }),
                changed && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto shrink-0 text-[10px] font-semibold text-amber-700", children: "edited" })
              ]
            }
          ) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-8 pt-0.5", children: draftValue !== void 0 && draftValue !== "" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm break-words", children: draftDisplay(column, draftValue) }) : column.key === "surv1" || column.key === "surv2" ? /* @__PURE__ */ jsxRuntimeExports.jsx(VisitDateCell, { row, which: column.key }) : column.key === "recertStatus" || column.key === "recertYear" ? /* @__PURE__ */ jsxRuntimeExports.jsx(RecertCell, { row, withDetail: column.key === "recertStatus" }) : column.key === "pipelineStatus" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-tip": "Calculated automatically from eligibility, the assessment records and the settings", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { value: statusForDisplay(row) }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(SmartCell, { row, column, fullText: column.key === "genDoc" }) }),
          editing && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              id: hintId,
              role: issue?.severity === "blocking" ? "alert" : void 0,
              className: cn(
                "mt-0.5 min-h-[15px] text-[11px] leading-tight",
                issue?.severity === "blocking" && "font-medium text-destructive",
                issue?.severity === "warning" && "text-amber-700"
              ),
              children: issue ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-start gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-px size-3 shrink-0", "aria-hidden": true }),
                issue.message
              ] }) : lockReason ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground/70", children: lockReason }) : null
            }
          )
        ] })
      ]
    }
  );
}
function VisitDateCell({
  row,
  which
}) {
  const today = todayLocalIso();
  const visit = visitFor(row, which, today);
  const done = visit?.done ?? null;
  if (!done) return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-muted-foreground", children: "-" });
  const future = done > today;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: "flex min-w-0 flex-wrap items-center gap-1.5",
      "data-tip": future ? "Future date — a done date cannot be after today. Fix it in Admin → Data checks → Surveillance dates." : visit?.detail ?? void 0,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("text-sm tabular-nums", future && "font-semibold text-rose-700"), children: dmy(done) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          StatusChip,
          {
            size: "sm",
            label: future ? "Future date" : visit?.chip ?? "Done",
            tone: future ? "red" : "green"
          }
        ),
        !future && visit?.detail && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: visit.detail })
      ]
    }
  );
}
function RecertCell({
  row,
  withDetail = false
}) {
  const state = recertificationState(row);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 flex-wrap items-center gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(StatusChip, { size: "sm", label: state.label, tone: state.tone }),
    withDetail && state.detail && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: state.detail })
  ] });
}
function FieldEditor({
  column,
  value,
  options,
  issue,
  hintId,
  onChange,
  onDone,
  onFile
}) {
  const slot = EDIT_SLOT_BY_KEY[column.key];
  const list = OPTION_LIST[column.key] ? options[OPTION_LIST[column.key]] : null;
  const choices = reactExports.useMemo(() => {
    if (!list) return null;
    if (Array.isArray(list) && typeof list[0] === "object")
      return list.map((o) => o.value);
    return list;
  }, [list]);
  if (slot && onFile) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-md border border-border/60 bg-background p-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AttachmentPicker, { label: column.label, onChange: (v) => onFile(slot, v) }) });
  }
  if (column.type === "date" || column.type === "dueDate") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      DateEditor,
      {
        value,
        onChange,
        onDone,
        max: ["certDate", "surv1", "surv2", "nocCertified", "saStart", "saEnd"].includes(
          column.key
        ) ? todayLocalIso() : void 0
      }
    );
  }
  if (column.type === "score") {
    const n = Number(value);
    const pct = Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          autoFocus: true,
          type: "number",
          min: 0,
          max: 100,
          step: "0.01",
          value,
          onChange: (e) => onChange(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) onDone();
            if (e.key === "Escape") onDone();
          },
          "aria-invalid": issue?.severity === "blocking" || void 0,
          "aria-describedby": issue ? hintId : void 0,
          className: "h-8 w-24 text-sm"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex h-1.5 w-24 overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: cn(
            "h-full rounded-full",
            pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
          ),
          style: { width: `${pct}%` }
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs tabular-nums text-muted-foreground", children: [
        pct,
        "%"
      ] })
    ] });
  }
  if (column.type === "currency") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-muted-foreground", children: "₹" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          autoFocus: true,
          type: "number",
          min: 0,
          value,
          onChange: (e) => onChange(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) onDone();
            if (e.key === "Escape") onDone();
          },
          className: "h-8 text-sm"
        }
      )
    ] });
  }
  if (column.key === "nocAvailable") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        role: "group",
        "aria-label": "NOC Available",
        className: "flex gap-1 rounded-md border border-border/60 bg-muted/40 p-0.5",
        children: ["Yes", "No"].map((choice) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "aria-pressed": value === choice,
            onClick: () => {
              onChange(choice);
              onDone();
            },
            className: cn(
              "min-h-8 flex-1 rounded px-3 text-xs font-medium transition-colors",
              value === choice ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            ),
            children: choice
          },
          choice
        ))
      }
    );
  }
  if (choices && choices.length >= 2 && choices.length <= 4) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        role: "group",
        "aria-label": column.label,
        className: "flex flex-wrap gap-1 rounded-md border border-border/60 bg-muted/40 p-0.5",
        children: choices.map((choice) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "aria-pressed": value === choice,
            onClick: () => {
              onChange(choice);
              onDone();
            },
            className: cn(
              "min-h-8 rounded px-2 text-xs font-medium transition-colors",
              value === choice ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            ),
            children: choice
          },
          choice
        ))
      }
    );
  }
  if (choices) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Select,
      {
        value,
        onValueChange: (v) => {
          onChange(v);
          onDone();
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { autoFocus: true, className: "h-8 text-sm", "aria-describedby": issue ? hintId : void 0, children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Select…" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: choices.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: c, children: c }, c)) })
        ]
      }
    );
  }
  if (column.type === "longtext") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "textarea",
      {
        autoFocus: true,
        value,
        rows: 2,
        onChange: (e) => onChange(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onDone();
          if (e.key === "Escape") onDone();
        },
        className: "w-full resize-none rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Input,
    {
      autoFocus: true,
      value,
      onChange: (e) => onChange(e.target.value),
      onKeyDown: (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onDone();
        }
        if (e.key === "Escape") onDone();
      },
      "aria-invalid": issue?.severity === "blocking" || void 0,
      "aria-describedby": issue ? hintId : void 0,
      className: "h-8 text-sm"
    }
  );
}
function DateEditor({
  value,
  onChange,
  onDone,
  max
}) {
  const id = reactExports.useId();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    DateInput,
    {
      id: `qv-date-${id}`,
      label: "Date",
      value,
      onChange,
      onRequestClose: onDone,
      max,
      today: todayLocalIso(),
      compact: true,
      autoOpen: true
    }
  );
}

function QuickViewHeader({
  row,
  index,
  total,
  onPrev,
  onNext,
  mode,
  canEdit,
  onModeChange,
  onClose,
  updatedLabel,
  status,
  copied,
  onCopyNin,
  draftExists,
  requiredDocMissing = 0,
  onOpenDocuments
}) {
  const f = row.facility;
  const currentStatus = status ?? f.currentStatus ?? "";
  const nin = f.ninNumber?.trim();
  const cycle = row.cycleNumber ? `Cycle ${row.cycleNumber}${row.cycleType ? ` · ${row.cycleType}` : ""}` : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "sticky top-0 z-20 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        FacilityCell$1,
        {
          facility: { ...f, name: f.name || "Facility" },
          nameAs: "h2",
          nameId: "qv-title",
          onOpen: () => void 0,
          className: "max-w-full"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex flex-wrap items-center gap-1.5", children: [
        nin && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex h-6 items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-1.5 text-[11px] font-medium text-muted-foreground", children: [
          "NIN ",
          nin,
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: onCopyNin,
              className: "rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              "aria-label": copied ? "NIN copied" : "Copy NIN",
              "data-tip": "Copy NIN",
              children: copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-3" })
            }
          )
        ] }),
        currentStatus && /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { value: currentStatus }),
        cycle && /* @__PURE__ */ jsxRuntimeExports.jsx(StatusChip, { label: cycle, tone: "blue", size: "sm" }),
        requiredDocMissing > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: onOpenDocuments,
            "data-testid": "qv-required-doc-chip",
            "data-tip": "Open Documents — the required file is missing",
            className: "inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3", "aria-hidden": true }),
              requiredDocMissing,
              " required document",
              requiredDocMissing === 1 ? "" : "s",
              " missing"
            ]
          }
        ),
        updatedLabel && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground", children: updatedLabel }),
        draftExists && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            "data-testid": "qv-draft-badge",
            className: "rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800",
            "data-tip": "Unsaved edits from your last visit are kept as a draft on this device",
            children: "Draft"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [
      total > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mr-1 flex items-center gap-0.5 rounded-lg border border-border/60 bg-background p-0.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "icon",
            className: "size-8",
            onClick: onPrev,
            "aria-label": "Previous facility (K)",
            "data-tip": "Previous facility (K)",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "size-4" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "span",
          {
            className: "min-w-14 text-center text-[11px] font-medium tabular-nums text-muted-foreground",
            "aria-live": "polite",
            children: [
              index + 1,
              " of ",
              total
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "icon",
            className: "size-8",
            onClick: onNext,
            "aria-label": "Next facility (J)",
            "data-tip": "Next facility (J)",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-4" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          role: "group",
          "aria-label": "Mode",
          className: "flex rounded-lg border border-border/60 bg-muted/40 p-0.5",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                "aria-pressed": mode === "view",
                onClick: () => onModeChange("view"),
                className: cn(
                  "min-h-8 rounded-md px-2.5 text-xs font-semibold transition-colors",
                  mode === "view" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                ),
                children: "View"
              }
            ),
            canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                "aria-pressed": mode === "edit",
                onClick: () => onModeChange("edit"),
                className: cn(
                  "flex min-h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors",
                  mode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-3" }),
                  " Edit"
                ]
              }
            )
          ]
        }
      ),
      !canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "span",
        {
          className: "flex items-center gap-1 text-[11px] text-muted-foreground",
          "data-tip": "Your role can view facilities but not edit them",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "size-3.5" }),
            " View only"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "ghost",
          size: "icon",
          className: "size-8",
          onClick: onClose,
          "aria-label": "Close quick view",
          "data-tip": "Close (Esc)",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
        }
      )
    ] })
  ] }) });
}

const STATE_COPY = {
  done: "Done",
  current: "Current",
  upcoming: "Upcoming",
  blocked: "Blocked",
  warning: "Needs attention"
};
const STAGE_SECTION = {
  eligibility: "eligibility",
  sa: "state",
  nqas: "nqas",
  certification: "nqas",
  surveillance: "surveillance",
  recertification: "surveillance"
};
function QuickViewStepper({
  lifecycle,
  onJump
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "sticky top-0 z-10 border-b border-border/60 bg-muted/30 px-4 py-2 backdrop-blur",
      role: "group",
      "aria-label": "Certification lifecycle (status only)",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "flex items-stretch gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", children: lifecycle.stages.map((stage, i) => {
          const state = stage.state;
          const active = state === "current" || state === "blocked";
          return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => onJump?.(STAGE_SECTION[stage.key] ?? "overview"),
              "data-stage": stage.key,
              "data-state": state,
              "aria-label": `${stage.label}: ${STATE_COPY[state]}. Open the section`,
              "aria-current": active ? "step" : void 0,
              "data-tip": [stage.tooltip, stage.detail].filter(Boolean).join(" · ") || state,
              className: cn(
                // Two short lines rather than a clipped label: at 1366 px the
                // old truncate cut "Surveillance" to "Surveillanc…".
                "flex h-9 w-full min-w-0 items-center gap-1.5 rounded-lg border px-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                state === "done" && "border-emerald-200 bg-emerald-50/70 text-emerald-900",
                state === "current" && "border-primary/40 bg-primary/10 text-foreground",
                state === "upcoming" && "border-dashed border-border/60 text-muted-foreground",
                state === "blocked" && "border-rose-300 bg-rose-50 text-rose-900",
                state === "warning" && "border-amber-300 bg-amber-50/70 text-amber-900"
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(StageIcon, { state, index: i }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 text-[10.5px] leading-[1.1] font-semibold", children: stage.label }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: STATE_COPY[state] })
              ]
            }
          ) }, stage.key);
        }) }),
        lifecycle.blockedReason && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-rose-800", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(OctagonAlert, { className: "size-3.5 shrink-0", "aria-hidden": true }),
          lifecycle.blockedReason
        ] })
      ]
    }
  );
}
function StageIcon({ state, index }) {
  if (state === "done") return /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5 shrink-0", "aria-hidden": true });
  if (state === "blocked") return /* @__PURE__ */ jsxRuntimeExports.jsx(OctagonAlert, { className: "size-3.5 shrink-0", "aria-hidden": true });
  if (state === "warning") return /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5 shrink-0", "aria-hidden": true });
  if (state === "current") return /* @__PURE__ */ jsxRuntimeExports.jsx(Dot, { className: "size-5 shrink-0", "aria-hidden": true });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Circle, { className: "size-3 shrink-0 opacity-50", "aria-hidden": true, "data-step": index + 1 });
}

function SectionNav({
  items,
  active,
  onSelect
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "nav",
    {
      "aria-label": "Facility sections",
      className: cn(
        // Rail on desktop…
        "shrink-0 border-border/60 max-md:border-b md:w-[200px] md:border-r md:py-2",
        // …scroll-snap strip on phones/tablets.
        "max-md:flex max-md:snap-x max-md:snap-mandatory max-md:gap-1 max-md:overflow-x-auto max-md:px-2 max-md:py-1.5 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden"
      ),
      children: items.map(({ def, done, total, warning, error = false, notApplicable = false }) => {
        const complete = total > 0 && done === total;
        const isActive = active === def.key;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => onSelect(def.key),
            "aria-current": isActive ? "true" : void 0,
            "data-section-nav": def.key,
            className: cn(
              "flex items-center gap-2 rounded-lg px-2.5 text-left text-[13px] font-medium transition-colors",
              "min-h-9 md:w-full max-md:shrink-0 max-md:snap-start max-md:whitespace-nowrap",
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            ),
            "data-tip": notApplicable ? `${def.label} — not applicable to this facility` : `${def.label} — ${total ? `${done} of ${total} required fields filled` : "history"}${error ? " · error" : warning ? " · missing required item" : ""}`,
            children: [
              error || warning ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  "aria-hidden": true,
                  className: cn(
                    "size-2 shrink-0 rounded-full",
                    error ? "bg-rose-500" : "bg-amber-500"
                  )
                }
              ) : complete ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-2.5", "aria-hidden": true }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  "aria-hidden": true,
                  className: cn(
                    "size-2.5 shrink-0 rounded-full",
                    notApplicable ? "border border-muted-foreground/40" : "bg-emerald-500/25"
                  )
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0", children: def.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground max-md:hidden", children: notApplicable || total === 0 ? "" : `${done}/${total}` })
            ]
          },
          def.key
        );
      })
    }
  );
}

function UnsavedGuardDialog({
  open,
  count,
  onCancel,
  onSave,
  onDiscard,
  saving
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: (o) => !o ? onCancel() : void 0, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-md", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Save your changes?" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { children: [
        "This facility has ",
        count,
        " unsaved ",
        count === 1 ? "change" : "changes",
        ". A draft is kept on this device if you close without saving."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "flex-wrap gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", onClick: onCancel, disabled: saving, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "mr-1 size-4" }),
        " Keep editing"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", onClick: onDiscard, disabled: saving, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "mr-1 size-4" }),
        " Discard"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: onSave, disabled: saving, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "mr-1 size-4" }),
        " Save changes"
      ] })
    ] })
  ] }) });
}
function DiscardConfirmDialog({
  open,
  count,
  onCancel,
  onConfirm
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: (o) => !o ? onCancel() : void 0, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-md", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "Discard ",
        count,
        " ",
        count === 1 ? "change" : "changes",
        "?"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Every field goes back to its saved value and the local draft is removed. Nothing is written to the server." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "flex-wrap gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", onClick: onCancel, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "mr-1 size-4" }),
        " Keep editing"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "destructive", onClick: onConfirm, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "mr-1 size-4" }),
        " Discard changes"
      ] })
    ] })
  ] }) });
}
function ConflictDialog({
  open,
  onKeepMine,
  onTakeTheirs,
  onReview,
  remoteLabel,
  saving
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: (o) => !o ? onReview() : void 0, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-md", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-4 text-amber-600" }),
        " Someone else saved this facility"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { children: [
        "The facility was updated ",
        remoteLabel,
        " while this quick view was open. Your edits are still here — choose how to resolve them."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "flex-wrap gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", onClick: onReview, disabled: saving, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(GitCompare, { className: "mr-1 size-4" }),
        " Review"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: onTakeTheirs, disabled: saving, children: "Take theirs" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onKeepMine, disabled: saving, children: "Keep mine & save" })
    ] })
  ] }) });
}

function FacilityQuickView(props) {
  const { row, open, onOpenChange } = props;
  const dialogRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && row && !el.open) {
      if (typeof el.showModal === "function") el.showModal();
      else el.setAttribute("open", "");
    }
    if ((!open || !row) && el.open) {
      if (typeof el.close === "function") el.close();
      else el.removeAttribute("open");
    }
  }, [open, row]);
  reactExports.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "dialog",
    {
      ref: dialogRef,
      "data-testid": "facility-quick-view",
      "aria-modal": "true",
      "aria-labelledby": "qv-title",
      className: "qv-dialog",
      onCancel: (e) => {
        e.preventDefault();
        dialogRef.current?.dispatchEvent(new CustomEvent("qv-close-request"));
      },
      onClick: (e) => {
        if (e.target === e.currentTarget) {
          dialogRef.current?.dispatchEvent(new CustomEvent("qv-close-request"));
        }
      },
      children: row && open && /* @__PURE__ */ jsxRuntimeExports.jsx(
        QuickViewSession,
        {
          ...props,
          row,
          onRequestClose: () => onOpenChange(false),
          dialogRef
        },
        row.facility._id
      )
    }
  );
}
function QuickViewSession({
  row,
  labels,
  canEdit = false,
  siblings = [],
  onNavigate,
  initialSection,
  onSectionChange,
  onSave,
  onPrint,
  onExport,
  onOpenProfile,
  settings,
  userId,
  dataAsOf,
  recentDays = 0,
  onPrefetch,
  editRequest,
  onRequestClose,
  dialogRef
}) {
  const navigate = useNavigate();
  const today = todayLocalIso();
  const profile = useQuery(api.facilities.getFacilityProfile, {
    facilityId: row.facility._id
  });
  const record = profile ?? null;
  const docsData = useQuery(api.documents.listForFacility, {
    facilityId: row.facility._id
  });
  const requiredMissingDocs = docsData?.requiredMissing ?? [];
  const blockingMissingDocs = docsData?.blockingMissing ?? [];
  const missingDocLabel = (key) => (key ? DOCUMENT_SHORT_LABEL[key] ?? key : "") || "required document";
  const editorOptions = reactExports.useMemo(() => trackerEditorOptions(settings), [settings]);
  const lifecycleSettings = reactExports.useMemo(
    () => profile?.settings ?? settings,
    [profile, settings]
  );
  const initial = reactExports.useMemo(
    () => trackerDraftFromRow(row),
    [row]
  );
  const [draft, setDraft] = reactExports.useState(() => {
    const saved = loadQuickViewDraft(row.facility._id, userId);
    return saved ? { ...initial, ...saved } : initial;
  });
  const [files, setFiles] = reactExports.useState({});
  const [clears, setClears] = reactExports.useState({});
  const [hadDraft] = reactExports.useState(() => loadQuickViewDraft(row.facility._id, userId) != null);
  const [savedBaseline, setSavedBaseline] = reactExports.useState(null);
  const baseline = savedBaseline ?? initial;
  const changes = reactExports.useMemo(() => quickViewChanges(baseline, draft), [baseline, draft]);
  const fileChanges = Object.values(files).filter((f) => f != null).length + Object.values(clears).filter(Boolean).length;
  const dirty = changes.length > 0 || fileChanges > 0;
  const issues = reactExports.useMemo(
    () => [
      ...validateQuickView(draft, today, baseline),
      ...validateSurveillance(row, draft, today, baseline)
    ],
    [draft, today, baseline, row]
  );
  const blocking = blockingIssues(issues);
  reactExports.useEffect(() => {
    if (dirty) saveQuickViewDraft(row.facility._id, userId, draft);
  }, [dirty, draft, row.facility._id, userId]);
  const readerEnabled = useResultReaderEnabled();
  const sections = reactExports.useMemo(
    () => QV_SECTIONS.filter((s) => s.key !== "scores"),
    [readerEnabled]
  );
  const firstSection = sections.find((s) => s.key === initialSection)?.key ?? "overview";
  const [mode, setMode] = reactExports.useState("view");
  const [section, setSection] = reactExports.useState(firstSection);
  const [mounted, setMounted] = reactExports.useState(
    () => /* @__PURE__ */ new Set(["overview", firstSection])
  );
  const [activeField, setActiveField] = reactExports.useState(null);
  const [copied, setCopied] = reactExports.useState(false);
  const [scrollRequest, setScrollRequest] = reactExports.useState(
    null
  );
  const contentRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!scrollRequest) return;
    contentRef.current?.querySelector(`#qv-section-${scrollRequest.key}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [scrollRequest]);
  const goToSection = reactExports.useCallback(
    (key) => {
      const def = sections.find((s) => s.key === key);
      if (!def) return;
      setSection(def.key);
      setMounted((prev) => prev.has(def.key) ? prev : new Set(prev).add(def.key));
      setScrollRequest({ key: def.key, token: Date.now() });
    },
    [sections]
  );
  const onSelectSection = reactExports.useCallback(
    (key) => {
      goToSection(key);
      onSectionChange?.(key);
    },
    [goToSection, onSectionChange]
  );
  const [docRequest, setDocRequest] = reactExports.useState(null);
  const openDocuments = reactExports.useCallback(
    (docKey) => {
      goToSection("documents");
      if (docKey) setDocRequest({ key: docKey, token: Date.now() });
    },
    [goToSection]
  );
  const [mirroredUrlSection, setMirroredUrlSection] = reactExports.useState(firstSection);
  if (mirroredUrlSection !== firstSection) {
    setMirroredUrlSection(firstSection);
    if (firstSection !== section) goToSection(firstSection);
  }
  const [appliedEditToken, setAppliedEditToken] = reactExports.useState(0);
  if (editRequest && editRequest.facilityId === String(row.facility._id) && editRequest.token !== appliedEditToken) {
    setAppliedEditToken(editRequest.token);
    if (canEdit) setMode("edit");
  }
  reactExports.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const top = el.getBoundingClientRect().top + 56;
        let current = "overview";
        for (const def of sections) {
          const node = el.querySelector(`#qv-section-${def.key}`);
          if (node && node.getBoundingClientRect().top <= top) current = def.key;
        }
        setSection((prev) => prev === current ? prev : current);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [mounted]);
  const [saving, setSaving] = reactExports.useState(false);
  const [savedLabel, setSavedLabel] = reactExports.useState(null);
  const [saveError, setSaveError] = reactExports.useState(null);
  const [reviewOpen, setReviewOpen] = reactExports.useState(false);
  const [guardOpen, setGuardOpen] = reactExports.useState(false);
  const [discardOpen, setDiscardOpen] = reactExports.useState(false);
  const [conflictOpen, setConflictOpen] = reactExports.useState(false);
  const [pendingAction, setPendingAction] = reactExports.useState(null);
  const [statusConfirmed, setStatusConfirmed] = reactExports.useState(false);
  const [undo, setUndo] = reactExports.useState(null);
  const baselineUpdatedAt = reactExports.useRef(row.facility.updatedAt ?? null);
  const undoTimer = reactExports.useRef(null);
  reactExports.useEffect(
    () => () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
    },
    []
  );
  const statusNotice = reactExports.useMemo(
    () => dirty ? statusChangeNotice(row, draft, lifecycleSettings) : null,
    [dirty, row, draft, lifecycleSettings]
  );
  const position = reactExports.useMemo(() => {
    const index = siblings.findIndex((r) => r.facility._id === row.facility._id);
    return { index: index < 0 ? 0 : index, total: siblings.length };
  }, [siblings, row]);
  const nextRow = position.total ? siblings[position.index + 1] ?? null : null;
  const prevRow = position.total ? siblings[position.index - 1] ?? null : null;
  const runSave = reactExports.useCallback(
    async (state, then) => {
      if (!onSave) return;
      const remote = row.facility.updatedAt ?? null;
      if (baselineUpdatedAt.current == null) baselineUpdatedAt.current = remote;
      else if (remote && baselineUpdatedAt.current !== remote) {
        setConflictOpen(true);
        return;
      }
      setSaving(true);
      setSaveError(null);
      const previous = { draft, files, clears };
      try {
        await onSave(row, state);
        setSavedLabel(
          `Saved ✓ ${(/* @__PURE__ */ new Date()).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })}`
        );
        setUndo(previous);
        if (undoTimer.current) window.clearTimeout(undoTimer.current);
        undoTimer.current = window.setTimeout(() => setUndo(null), 3e4);
        clearQuickViewDraft(row.facility._id, userId);
        baselineUpdatedAt.current = null;
        setStatusConfirmed(false);
        setSavedBaseline({ ...state.draft });
        setDraft({ ...state.draft });
        setFiles({});
        setClears({});
        if (then === "close") onRequestClose();
        if (then === "next" && nextRow) onNavigate?.(nextRow);
        if (then === "prev" && prevRow) onNavigate?.(prevRow);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Save failed — try again");
      } finally {
        setSaving(false);
      }
    },
    [
      onSave,
      row,
      draft,
      files,
      clears,
      userId,
      nextRow,
      prevRow,
      onNavigate,
      onRequestClose
    ]
  );
  const handleSave = reactExports.useCallback(() => {
    if (!dirty || blocking.length > 0 || saving) return;
    if (statusNotice && !statusConfirmed) {
      setReviewOpen(true);
      return;
    }
    void runSave({ draft, files, clears });
  }, [dirty, blocking, saving, statusNotice, statusConfirmed, runSave, draft, files, clears]);
  const discard = reactExports.useCallback(() => {
    setDraft(initial);
    setFiles({});
    setClears({});
    clearQuickViewDraft(row.facility._id, userId);
    setSavedBaseline(null);
    setSavedLabel(null);
    setSaveError(null);
    setUndo(null);
    setStatusConfirmed(false);
    setActiveField(null);
    setMode("view");
  }, [initial, row.facility._id, userId]);
  const requestAction = reactExports.useCallback(
    (action) => {
      const run = () => {
        if (action === "close") onRequestClose();
        if (action === "next" && nextRow) onNavigate?.(nextRow);
        if (action === "prev" && prevRow) onNavigate?.(prevRow);
      };
      if (dirty) {
        setPendingAction(action);
        setGuardOpen(true);
        return;
      }
      run();
    },
    [dirty, onRequestClose, onNavigate, nextRow, prevRow]
  );
  reactExports.useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handler = () => requestAction("close");
    el.addEventListener("qv-close-request", handler);
    return () => el.removeEventListener("qv-close-request", handler);
  }, [dialogRef, requestAction]);
  const onKeyDown = (e) => {
    const target = e.target;
    const typing = !!target.closest("input,textarea,select,[contenteditable='true']");
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      handleSave();
      return;
    }
    if (typing || e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.key === "j" || e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      requestAction("next");
    }
    if (e.key === "k" || e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      requestAction("prev");
    }
  };
  const focusIssue = (field) => {
    if (field === "documents") {
      setMode("edit");
      openDocuments(requiredMissingDocs[0]);
      return;
    }
    const key = fieldKeyFor(field) ?? field;
    const sectionKey = sections.find(
      (s) => sectionColumns(s.key).some((c) => c.key === field)
    )?.key ?? "overview";
    setMode("edit");
    goToSection(sectionKey);
    setActiveField(key);
  };
  const documentRules = reactExports.useMemo(
    () => normalizeDocumentRules(settings?.documentRules),
    [settings]
  );
  const attention = reactExports.useMemo(
    () => attentionFor(row, today, documentRules),
    [row, today, documentRules]
  );
  const navItems = reactExports.useMemo(
    () => sections.map((def) => {
      const items = attention.filter((a) => a.section === def.key);
      const base = sectionCompleteness(row, def.key, documentRules);
      let done = base.done;
      let total = base.total;
      let warning = items.length > 0;
      if (def.key === "documents" && docsData) {
        total = docsData.totalCount ?? total;
        done = Math.min(total, docsData.uploadedCount ?? 0);
        warning = (docsData.requiredMissing?.length ?? 0) > 0 || items.length > 0;
      }
      if (def.key === "nqas" && blockingMissingDocs.length > 0) warning = true;
      return {
        def,
        ...base,
        done,
        total,
        warning,
        error: items.some((a) => a.severity === "blocking")
      };
    }),
    [row, attention, documentRules, docsData, blockingMissingDocs.length, sections]
  );
  const lifecycle = reactExports.useMemo(
    () => deriveStage(row, lifecycleSettings, today),
    [row, lifecycleSettings, today]
  );
  const updated = updatedRecently(row.facility.updatedAt, recentDays);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full min-h-0 flex-col bg-background", onKeyDown, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        QuickViewHeader,
        {
          row,
          index: position.index,
          total: position.total,
          onPrev: () => {
            if (prevRow) onPrefetch?.(prevRow);
            requestAction("prev");
          },
          onNext: () => {
            if (nextRow) onPrefetch?.(nextRow);
            requestAction("next");
          },
          mode,
          canEdit,
          onModeChange: (m) => {
            setMode(m);
            if (m === "view") setActiveField(null);
          },
          onClose: () => requestAction("close"),
          updatedLabel: updated,
          status: statusForDisplay(row, lifecycleSettings, today),
          requiredDocMissing: requiredMissingDocs.length,
          onOpenDocuments: () => openDocuments(),
          copied,
          draftExists: hadDraft || dirty,
          onCopyNin: async () => {
            try {
              await navigator.clipboard.writeText(row.facility.ninNumber ?? "");
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            } catch {
            }
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(QuickViewStepper, { lifecycle, onJump: goToSection }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-0 flex-1 max-md:flex-col", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SectionNav, { items: navItems, active: section, onSelect: onSelectSection }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            ref: contentRef,
            className: "min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-5",
            "data-testid": "quick-view-content",
            children: [
              attention.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(NeedsAttention, { items: attention, onFix: focusIssue, onJump: onSelectSection }),
              sections.filter((def) => mounted.has(def.key)).map((def) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                SectionCard,
                {
                  row,
                  sectionKey: def.key,
                  label: def.label,
                  labels,
                  editorOptions,
                  mode,
                  canEdit,
                  draft,
                  initial,
                  issues,
                  changes,
                  activeField,
                  setActiveField,
                  onDraftChange: (field, value) => setDraft((d) => ({ ...d, [field]: value })),
                  onFile: (slot, value) => setFiles((f) => ({ ...f, [slot]: value })),
                  onJump: onSelectSection,
                  onSaveSection: handleSave,
                  profileLoading: profile === void 0,
                  profile: record,
                  settings: lifecycleSettings,
                  userId,
                  docs: docsData ?? null,
                  onOpenDocuments: openDocuments,
                  documentRequest: docRequest,
                  blockingDoc: blockingMissingDocs[0] ?? null
                },
                def.key
              ))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-background/95 px-4 py-2 backdrop-blur", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1", children: [
          onPrint && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "ghost",
              size: "sm",
              className: "h-9",
              onClick: () => onPrint(row),
              "data-tip": "Print the 1–2 page facility sheet",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "mr-1 size-3.5" }),
                " Print facility sheet"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "ghost",
              size: "sm",
              className: "h-9",
              onClick: () => onOpenProfile ? onOpenProfile(row) : navigate(`/facilities/${row.facility._id}`),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "mr-1 size-3.5" }),
                " Open full profile"
              ]
            }
          ),
          onExport && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "pl-2 text-[11px] text-muted-foreground", children: "Export" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", className: "h-9 px-2", onClick: () => onExport(row, "pdf"), children: "PDF" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", className: "h-9 px-2", onClick: () => onExport(row, "excel"), children: "Excel" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1 sm:max-w-[62%]", children: mode === "edit" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          saveError && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "p",
            {
              role: "alert",
              className: "mb-1 flex items-center gap-1 text-[11px] font-medium text-destructive",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "size-3.5" }),
                " ",
                saveError,
                " — your draft is kept."
              ]
            }
          ),
          undo && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground", children: [
            "Changed by mistake?",
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                variant: "ghost",
                size: "sm",
                className: "h-6 px-1 text-[11px]",
                onClick: () => {
                  setUndo(null);
                  void runSave(undo);
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Undo2, { className: "mr-1 size-3" }),
                  " Undo"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            SaveBar,
            {
              changes,
              issues,
              saving,
              savedLabel,
              dirty,
              fileChanges,
              documentHint: blockingMissingDocs.length > 0 ? {
                label: missingDocLabel(blockingMissingDocs[0]),
                onOpen: () => openDocuments(blockingMissingDocs[0])
              } : null,
              onDiscard: () => setDiscardOpen(true),
              onSave: handleSave,
              onSaveAndNext: () => void runSave({ draft, files, clears }, "next"),
              onReview: () => setReviewOpen(true),
              onFocusIssue: focusIssue,
              canSaveAndNext: !!nextRow && !!onNavigate
            }
          )
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-end gap-2 text-[11px] text-muted-foreground", children: [
          dataAsOf && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "Data as of ",
            toDisplayStamp(dataAsOf),
            " IST"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true, children: "·" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", children: lifecycle.nextAction })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ReviewChangesDialog,
      {
        open: reviewOpen,
        onOpenChange: setReviewOpen,
        changes,
        issues,
        statusNotice,
        onConfirm: () => {
          setStatusConfirmed(true);
          setReviewOpen(false);
          void runSave({ draft, files, clears });
        },
        saving
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DiscardConfirmDialog,
      {
        open: discardOpen,
        count: changes.length + fileChanges,
        onCancel: () => setDiscardOpen(false),
        onConfirm: () => {
          setDiscardOpen(false);
          discard();
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      UnsavedGuardDialog,
      {
        open: guardOpen,
        count: changes.length,
        saving: saving || !onSave,
        onCancel: () => setGuardOpen(false),
        onDiscard: () => {
          discard();
          setGuardOpen(false);
          const action = pendingAction;
          setPendingAction(null);
          if (action === "close") onRequestClose();
          if (action === "next" && nextRow) onNavigate?.(nextRow);
          if (action === "prev" && prevRow) onNavigate?.(prevRow);
        },
        onSave: async () => {
          await runSave({ draft, files, clears }, pendingAction ?? void 0);
          setGuardOpen(false);
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConflictDialog,
      {
        open: conflictOpen,
        saving,
        remoteLabel: "a moment ago",
        onKeepMine: () => {
          baselineUpdatedAt.current = row.facility.updatedAt ?? null;
          setConflictOpen(false);
          void runSave({ draft, files, clears });
        },
        onTakeTheirs: () => {
          discard();
          setConflictOpen(false);
        },
        onReview: () => {
          setConflictOpen(false);
          setReviewOpen(true);
        }
      }
    )
  ] });
}
function SectionCard({
  row,
  sectionKey,
  label,
  labels,
  editorOptions,
  mode,
  canEdit,
  draft,
  initial,
  issues,
  changes,
  activeField,
  setActiveField,
  onDraftChange,
  onFile,
  onJump,
  onSaveSection,
  profileLoading,
  profile,
  onOpenDocuments,
  documentRequest,
  blockingDoc,
  settings,
  userId,
  docs
}) {
  const columns = sectionColumns(sectionKey);
  const sectionChanged = changes.some((c) => c.section === sectionKey);
  const isAudit = sectionKey === "audit";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      id: `qv-section-${sectionKey}`,
      "data-qv-section": sectionKey,
      "aria-labelledby": `qv-heading-${sectionKey}`,
      className: "mb-3 overflow-hidden rounded-xl border border-border/60 bg-card",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sticky top-0 z-[1] flex items-center justify-between gap-2 border-b border-border/40 bg-card/95 px-3 py-2 backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { id: `qv-heading-${sectionKey}`, className: "text-sm font-semibold text-foreground", children: label }),
          mode === "edit" && sectionChanged && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "h-7 text-[11px]", onClick: onSaveSection, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "mr-1 size-3" }),
            " Save section"
          ] })
        ] }),
        sectionKey === "nqas" && blockingDoc && mode === "edit" && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "p",
          {
            className: "flex flex-wrap items-center gap-1.5 border-b border-amber-200/70 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-900",
            "data-testid": "qv-nqas-document-block",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5 shrink-0" }),
              DOCUMENT_SHORT_LABEL[blockingDoc] ?? blockingDoc,
              " is required for this facility — saving is blocked until it is uploaded.",
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  className: "ml-1 font-semibold underline underline-offset-2",
                  onClick: () => onOpenDocuments(blockingDoc),
                  children: [
                    "Upload ",
                    DOCUMENT_SHORT_LABEL[blockingDoc] ?? blockingDoc,
                    " to save"
                  ]
                }
              )
            ]
          }
        ),
        isAudit ? /* @__PURE__ */ jsxRuntimeExports.jsx(AuditList, { profile, loading: profileLoading }) : sectionKey === "scores" ? /* @__PURE__ */ jsxRuntimeExports.jsx(FacilityScoresPanel, { facilityId: String(row.facility._id) }) : sectionKey === "history" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          CycleHistoryPanel,
          {
            facilityId: String(row.facility._id),
            currentCycleNumber: row.cycleNumber ?? null,
            canEdit,
            className: "border-0 bg-transparent p-0"
          }
        ) }) : sectionKey === "documents" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          DocumentStatusCard,
          {
            facilityId: String(row.facility._id),
            canEdit,
            preselectKey: documentRequest?.key ?? null,
            className: "border-0 bg-transparent p-0"
          }
        ) }) : sectionKey === "overview" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          QuickViewOverview,
          {
            row,
            canEdit,
            settings,
            docs,
            onJump,
            onOpenDocuments: (key) => onOpenDocuments(key),
            remarks: draft.remarks ?? "",
            onRemarksChange: (value) => onDraftChange("remarks", value)
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "divide-y divide-border/40", children: columns.map((column) => {
            if (column.key === "facility" || column.key === "block" || column.key === "phc" || (column.key === "type" || column.key === "nin" || column.key === "certCycle"))
              return null;
            const field = fieldKeyFor(column.key);
            const fieldIssues = field ? issues.filter((i) => i.field === field) : [];
            const issue = fieldIssues.find((i) => i.severity === "blocking") ?? fieldIssues[0] ?? void 0;
            return /* @__PURE__ */ jsxRuntimeExports.jsx(
              FieldRow,
              {
                row,
                column,
                label: labels[column.key] ?? column.label,
                initialValue: field ? initial[field] : void 0,
                draftValue: field ? draft[field] : void 0,
                editing: mode === "edit" && canEdit,
                canEdit,
                options: editorOptions,
                issue,
                active: !!field && activeField === field,
                onActivate: () => field && setActiveField(field),
                onDeactivate: () => setActiveField(null),
                onDraftChange,
                onFile
              },
              column.key
            );
          }) }),
          sectionKey === "ia" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border/40 p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            IACard,
            {
              rows: row.iaq?.rows ?? [],
              settings,
              userId,
              canImport: canEdit
            }
          ) }),
          sectionKey === "eligibility" && /* @__PURE__ */ jsxRuntimeExports.jsx(WhyStatus, { row, onJump }),
          sectionKey === "ia" && row.iaq && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "border-t border-border/40 px-3 py-2 text-[11px] text-muted-foreground", children: [
            "Calculated from the stored quarters",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "font-semibold text-foreground", children: formatFyQuarter(row.iaq.pair.current.fy, row.iaq.pair.current.q) }),
            " ",
            "vs",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "font-semibold text-foreground", children: formatFyQuarter(row.iaq.pair.previous.fy, row.iaq.pair.previous.q) }),
            " ",
            "— the change is the latest quarter minus the previous one (read-only). No quarter without data is shown."
          ] })
        ] })
      ]
    }
  );
}
function WhyStatus({ row, onJump }) {
  const [open, setOpen] = reactExports.useState(false);
  const today = todayLocalIso();
  const v1 = visitFor(row, "surv1", today);
  const v2 = visitFor(row, "surv2", today);
  const recert = recertificationState(row, today);
  const lines = [
    ["Eligibility", row.facility.eligibility ?? "-"],
    ["State Assessment", row.sa?.status ?? "Not recorded"],
    ["NQAS Assessment", row.nqas?.status ?? "Not recorded"],
    ["Certification result", row.nqas?.certificationStatus ?? "Not recorded"],
    ["Certified on", row.nqas?.certificationDate ? toDisplayDate(row.nqas.certificationDate) : "-"],
    ["1st surveillance", v1?.chip ?? "-"],
    ["2nd surveillance", v2?.chip ?? "-"],
    ["Certificate validity", row.nqas?.validityDate ? toDisplayDate(row.nqas.validityDate) : "-"],
    ["Recertification", recert.label]
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border/40 px-3 py-2 text-xs text-muted-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        "aria-expanded": open,
        className: "font-medium text-primary underline-offset-2 hover:underline",
        onClick: () => setOpen((v) => !v),
        children: [
          "Why is my status like this?",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: cn("inline size-3 transition-transform", open && "rotate-90") })
        ]
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 rounded-lg border border-border/60 bg-muted/30 p-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "Facility Current Status is calculated from these inputs — never typed:" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "mt-1.5 grid gap-1 sm:grid-cols-2", children: lines.map(([label, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2 text-[11px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "min-w-0 flex-1 truncate text-muted-foreground", children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "shrink-0 font-medium text-foreground tabular-nums", children: value })
      ] }, label)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-[11px] font-semibold text-foreground", children: [
        "Reads as: ",
        statusForDisplay(row)
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          className: "mt-1 text-[11px] font-medium text-primary hover:underline",
          onClick: () => onJump("surveillance"),
          children: [
            "Open Surveillance & Recertification ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "inline size-3" })
          ]
        }
      )
    ] })
  ] });
}
function toDisplayDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mi = Number(m) - 1;
  return months[mi] ? `${d}-${months[mi]}-${y}` : iso;
}
function NeedsAttention({
  items,
  onFix,
  onJump
}) {
  const [openSection, setOpenSection] = reactExports.useState(true);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "mb-3 rounded-xl border border-amber-300/70 bg-amber-50/70 p-3",
      "aria-label": "Needs attention",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setOpenSection((v) => !v),
            "aria-expanded": openSection,
            className: "flex w-full items-center gap-1.5 text-left text-sm font-semibold text-amber-900",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-4" }),
              " Needs attention (",
              items.length,
              ")",
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                ChevronRight,
                {
                  className: cn("ml-auto size-4 transition-transform", openSection && "rotate-90")
                }
              )
            ]
          }
        ),
        openSection && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 space-y-1.5", children: items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex flex-wrap items-start gap-2 text-xs text-amber-950", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1", children: item.text }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "outline",
              size: "sm",
              className: "h-7 border-amber-400 bg-white/70 text-[11px] text-amber-900",
              onClick: () => onFix(item.field),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { className: "mr-1 size-3" }),
                " Fix"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "ghost",
              size: "sm",
              className: "h-7 text-[11px] text-amber-900",
              onClick: () => onJump(item.section),
              children: "Open section"
            }
          )
        ] }, item.id)) })
      ]
    }
  );
}
function AuditList({
  profile,
  loading
}) {
  if (loading) return /* @__PURE__ */ jsxRuntimeExports.jsx(SectionSkeleton, { rows: 4 });
  const audits = profile?.audits ?? [];
  if (!audits.length)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-3 py-4 text-sm text-muted-foreground", children: "No changes recorded yet." });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "divide-y divide-border/40", children: audits.slice(0, 50).map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex flex-wrap items-baseline gap-x-2 px-3 py-1.5 text-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: a.field ?? "Record" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground line-through", children: a.oldValue == null || a.oldValue === "" ? "-" : String(a.oldValue) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true, children: "→" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground", children: a.newValue == null || a.newValue === "" ? "-" : String(a.newValue) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-auto text-muted-foreground", children: [
      a.changedByName ?? "System",
      " · ",
      toDisplayStamp(a.changedAt),
      a.source ? ` · ${a.source}` : ""
    ] })
  ] }, a._id)) });
}
function SectionSkeleton({ rows = 5 }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 px-3 py-3", "aria-busy": "true", "aria-label": "Loading section", children: Array.from({ length: rows }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3.5 w-3/4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3.5 w-2/3" })
  ] }, i)) });
}

export { CycleHistoryPanel as C, DateCell$1 as D, EMPTY_TEXT as E, FacilityQuickView as F, IaCardSkeleton as I, NoRows as N, StatusPill as S, TONE_HEX as T, ScoreBar$1 as a, trackerEditorOptions as b, SkeletonRows as c, EditableUpdateCell as d, EditableTrackerCell as e, SmartCell as f, StatusChip as g, ToneIcon as h, isEditableCellKey as i, ToneBar as j, IACard as k, DocumentStatusCard as l, readOnlyCellReason as r, trackerUpdatePayload as t, useRowDrafts as u };
