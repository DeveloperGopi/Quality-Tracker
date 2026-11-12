// ProfileFormKit — the reusable smart-input kit behind the State Assessment
// and NQAS Assessment forms on the Facility Profile.
//
// Every control here follows the same rules:
//   • 44px minimum touch targets (min-h-11) for district staff on phones;
//   • status is icon + text + colour, never colour alone;
//   • inline, plain-language errors say what is wrong AND how to fix it;
//   • labels ≥ 14px, helper text ≥ 12px with AA contrast;
//   • `data-focus="<key>"` on inputs lets the "Needs attention" panel and
//     the validation summary jump straight to the offending field;
//   • motion is optional — every animation uses motion-safe:/motion-reduce:.
//
// Bilingual-ready: L10nText + t() give Tamil a slot without touching callers.

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  History,
  Info,
  Lock,
  Paperclip,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToneBar, TONE_HEX, type Tone } from "@/components/StatusChip";
import { DateInput } from "@/components/DateInput";
import { addDays, dateRuleError, todayIsoIST } from "@/lib/dateInput";
import { toDisplayDate } from "@/lib/format";
import { formatInr, parseScore, scoreTone, type FieldIssue } from "@/lib/facilityProfileRules";
import { maskPhone as maskPhoneValue, normalizePhone, phoneError } from "@/lib/phone";

// ---------------------------------------------------------------------------
// i18n scaffold — English now, Tamil strings slot in without caller changes.
// ---------------------------------------------------------------------------

export type L10nText = { en: string; ta?: string };
export type L10nLocale = "en" | "ta";
/** Flip to "ta" once the Tamil strings land — callers don't change. */
export const PROFILE_LOCALE = "en" as L10nLocale;
export const t = (x: L10nText): string =>
  PROFILE_LOCALE === "ta" && x.ta ? x.ta : x.en;

/** Scroll an input into view and focus it (used by Fix buttons + the
 *  validation summary). Safe no-op when the key isn't rendered. */
export function focusField(key: string) {
  // Every FieldFrame wrapper carries data-focus, and specific inputs add
  // their own — the LAST match in document order is the deepest element
  // (the actual input), which is the one we want to focus.
  const els = document.querySelectorAll<HTMLElement>(`[data-focus="${key}"]`);
  const el = els[els.length - 1];
  if (!el) return;
  // Respect prefers-reduced-motion: jump instead of smooth-scrolling.
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  el.focus({ preventScroll: true });
}

// ---------------------------------------------------------------------------
// FieldFrame — label + required/optional tag + history clock + hint + error
// ---------------------------------------------------------------------------

/** One past change of a single field — the same shape the profile query's
 *  audit rows and the forms' historyFor() entries produce (the key is
 *  optional because forms pass per-field slices). */
export type FieldHistoryEntry = {
  field?: string;
  oldValue: unknown;
  newValue: unknown;
  changedByName?: string | null;
  changedAt: number;
};

export function FieldFrame({
  focusKey,
  label,
  required,
  requiredForStatus,
  helper,
  error,
  history,
  auto,
  children,
  className,
}: {
  focusKey: string;
  label: string;
  required?: boolean;
  /** True while this value is still filled from the schedule. */
  auto?: boolean;
  /** Another stored rule depends on this field (a completed visit, a score).
   *  The badge then says "Required for status" instead of the misleading
   *  "Optional" — the value itself may still be blank until that point. */
  requiredForStatus?: boolean;
  helper?: string;
  /** Plain-language error (what is wrong + how to fix). */
  error?: string;
  /** Past changes for this field — renders the clock popover. */
  history?: FieldHistoryEntry[];
  children: ReactNode;
  className?: string;
}) {
  const errorId = `${focusKey}-error`;
  const helperId = `${focusKey}-helper`;
  return (
    <div
      className={cn("min-w-0 scroll-mt-32", className)}
      data-field={focusKey}
      data-focus={focusKey}
      tabIndex={-1}
    >
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={focusKey} className="text-sm leading-snug">
          {label}
          {requiredForStatus ? (
            <span
              className="ml-1.5 rounded border border-sky-300/70 bg-sky-50 px-1 text-[10px] font-medium text-sky-800"
              data-testid="field-required-for-status"
            >
              Required for status
            </span>
          ) : required ? (
            <span className="ml-1 text-destructive" aria-hidden>
              *
            </span>
          ) : (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">Optional</span>
          )}
          {auto && (
            <span
              className="ml-1.5 rounded border border-border bg-muted/60 px-1 text-[10px] font-medium text-muted-foreground"
              data-testid="field-auto-tag"
            >
              auto
            </span>
          )}
        </Label>
        {history && history.length > 0 && <FieldHistoryPopover label={label} entries={history} />}
      </div>
      <div className="mt-1">{children}</div>
      {helper && !error && (
        <p id={helperId} className="mt-1 text-xs leading-snug text-muted-foreground">
          {helper}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1 flex items-start gap-1 text-xs leading-snug font-medium text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

/** Clock icon + popover: who changed this field, from what to what, when.
 *  Offered only for fields with recorded history. */
function FieldHistoryPopover({
  label,
  entries,
}: {
  label: string;
  entries: { oldValue: unknown; newValue: unknown; changedByName?: string | null; changedAt: number }[];
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-tip={`Change history for ${label}`}
          aria-label={`Change history for ${label}`}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <History className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-semibold">{label} — history</p>
        <ol className="mt-2 max-h-64 space-y-2 overflow-y-auto">
          {entries.map((e, i) => (
            <li key={i} className="text-xs">
              <p className="break-words">
                <span className="text-muted-foreground line-through">{String(e.oldValue ?? "—")}</span>{" "}
                → <span className="font-medium">{String(e.newValue ?? "—")}</span>
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {e.changedByName ?? "System"} · {toDisplayDate(new Date(e.changedAt).toISOString().slice(0, 10))}
              </p>
            </li>
          ))}
        </ol>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// DateField — date picker + quick chips + DD-MMM-YYYY + duration + warnings
// ---------------------------------------------------------------------------

/** Quick pick offsets from today: [label, days]. */
const QUICK_DATES: { label: string; days: number }[] = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "+7 days", days: 7 },
];

export function DateField({
  focusKey,
  label,
  value,
  onChange,
  disabled,
  error,
  helper,
  required,
  requiredForStatus,
  history,
  /** Show "Duration: n days" between a paired start/end value. */
  durationDays,
  todayIso: today = todayIsoIST(),
  min,
  max,
  disabledReason,
  emptyLabel,
  auto,
  readOnly,
  quickPicks = "all",
}: {
  focusKey: string;
  label: string;
  value: string;
  onChange: (iso: string) => void;
  /** Small tag while the date is still auto-filled from the schedule. */
  auto?: boolean;
  disabled?: boolean;
  /** A locked value that is still shown as text (schedule-linked dates). */
  readOnly?: boolean;
  /** "today" keeps a single Today chip — actual visit dates block the future. */
  quickPicks?: "all" | "today";
  disabledReason?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  /** "Required for status" badge — see FieldFrame. */
  requiredForStatus?: boolean;
  history?: FieldHistoryEntry[];
  durationDays?: number | null;
  /** "today" anchor for the quick chips (defaults to IST, so forms can pin
   *  the same today they validate against). */
  todayIso?: string | null;
  /** Allowed range for the field; actual dates pass max=today. */
  min?: string;
  max?: string;
  /** Shown when the value is blank (e.g. a scheduled end that follows the start). */
  emptyLabel?: string;
}) {
  const base = today || todayIsoIST();
  return (
    <DateFieldBody
      focusKey={focusKey}
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      disabledReason={disabledReason}
      error={error}
      helper={helper}
      required={required}
      requiredForStatus={requiredForStatus}
      history={history}
      durationDays={durationDays}
      min={min}
      max={max}
      emptyLabel={emptyLabel}
      auto={auto}
      readOnly={readOnly}
      onlyToday={quickPicks === "today"}
      base={base}
    />
  );
}

function DateQuickChips({
  today,
  min,
  max,
  onlyToday,
  onChange,
}: {
  today: string;
  min?: string;
  max?: string;
  onlyToday?: boolean;
  onChange: (iso: string) => void;
}) {
  return (
    <>
      {(onlyToday ? QUICK_DATES.slice(0, 1) : QUICK_DATES).map((q) => {
        const iso = addDays(today, q.days);
        const reason = dateRuleError(iso, { min, max });
        return (
          <span key={q.label} data-tip={reason ?? undefined} className="inline-flex">
            <button
              type="button"
              disabled={!!reason}
              onClick={() => onChange(iso)}
              className="inline-flex min-h-8 items-center rounded-full border border-border/70 bg-muted/40 px-2.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {q.label}
            </button>
          </span>
        );
      })}
    </>
  );
}

function DateFieldBody(
  props: Parameters<typeof DateField>[0] & { base: string; onlyToday?: boolean },
) {
  const {
    focusKey,
    label,
    value,
    onChange,
    disabled,
    error,
    helper,
    required,
    requiredForStatus,
    history,
    durationDays,
    min,
    max,
    disabledReason,
    emptyLabel,
    auto,
    readOnly,
    onlyToday,
    base,
  } = props;
  return (
    <FieldFrame
      focusKey={focusKey}
      label={label}
      required={required}
      requiredForStatus={requiredForStatus}
      helper={helper}
      error={error}
      history={history}
      auto={auto}
    >
      <DateInput
        id={focusKey}
        data-focus={focusKey}
        label={label}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        today={base}
        disabled={disabled}
        readOnly={readOnly}
        disabledReason={disabledReason}
        emptyLabel={emptyLabel}
      />
      {!disabled && !readOnly && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <DateQuickChips
            today={base}
            min={min}
            max={max}
            onlyToday={onlyToday}
            onChange={onChange}
          />
          {durationDays != null && durationDays >= 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="size-3.5" /> Duration: {durationDays} day{durationDays === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}
    </FieldFrame>
  );
}

// ---------------------------------------------------------------------------
// ScoreInput — number + slider + live coloured bar (ONE threshold constant)
// ---------------------------------------------------------------------------

export function ScoreInput({
  focusKey,
  label,
  value,
  onChange,
  disabled,
  error,
  helper,
  history,
  requiredForStatus,
}: {
  focusKey: string;
  label: string;
  /** Raw input string ("", "89", "89.5"). */
  value: string;
  onChange: (raw: string) => void;
  disabled?: boolean;
  error?: string;
  helper?: string;
  requiredForStatus?: boolean;
  history?: FieldHistoryEntry[];
}) {
  const num = parseScore(value);
  const tone: Tone = scoreTone(num);
  const bandHint =
    num == null
      ? "Green ≥ 70 · amber 50–69 · red < 50"
      : tone === "green"
        ? "Good — 70 or above"
        : tone === "amber"
          ? "Needs attention — 50 to 69"
          : "Critical — below 50";
  return (
    <FieldFrame
      focusKey={focusKey}
      label={label}
      requiredForStatus={requiredForStatus}
      error={error}
      helper={helper}
      history={history}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-28 shrink-0 items-center rounded-lg border bg-background/60 px-2 focus-within:ring-2 focus-within:ring-ring",
            error ? "border-destructive/70" : "border-input",
          )}
        >
          <Input
            id={focusKey}
            data-focus={focusKey}
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.1}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 border-0 bg-transparent p-0 text-right tabular-nums shadow-none focus-visible:ring-0"
            aria-label={`${label} percent`}
          />
          <span className="ml-1 shrink-0 text-sm text-muted-foreground">%</span>
        </div>
        {/* Slider mirrors the number; both drive the same raw string. */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          disabled={disabled}
          value={num ?? 0}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} slider`}
          className="h-11 min-w-0 flex-1 accent-[var(--primary)] motion-reduce:transition-none"
        />
      </div>
      <ToneBar value={num ?? 0} tone={tone} className="mt-2" />
      <p className="mt-1 text-xs text-muted-foreground">
        {num != null && <span className="font-semibold text-foreground">{num}% — </span>}
        {bandHint}
      </p>
    </FieldFrame>
  );
}

// ---------------------------------------------------------------------------
// SegmentedControl — radio cards for 2–4 choice lists (Mode, SaQsham, cert)
// ---------------------------------------------------------------------------

export function SegmentedControl({
  focusKey,
  label,
  value,
  onChange,
  options,
  disabled,
  error,
  helper,
  /** Larger "radio cards" treatment (used for certification status). */
  cards,
  icons,
}: {
  focusKey: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
  error?: string;
  helper?: string;
  cards?: boolean;
  icons?: Record<string, ReactNode>;
}) {
  return (
    <FieldFrame focusKey={focusKey} label={label} error={error} helper={helper}>
      <div
        role="radiogroup"
        aria-label={label}
        data-focus={focusKey}
        tabIndex={-1}
        className={cn(
          "flex flex-wrap gap-1.5 rounded-lg",
          cards && "grid grid-cols-1 gap-2 sm:grid-cols-2",
          error && "ring-1 ring-destructive/60 ring-offset-1 ring-offset-background",
        )}
      >
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                cards && "justify-start px-3.5 py-2.5 text-left",
                selected
                  ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-background/60 text-foreground hover:bg-muted",
              )}
            >
              {icons?.[opt]}
              <span className="min-w-0 break-words">{opt}</span>
              {selected && <Check className="size-3.5 shrink-0" aria-hidden />}
            </button>
          );
        })}
      </div>
    </FieldFrame>
  );
}

// ---------------------------------------------------------------------------
// AssessorAutocomplete — remembers names + auto-suggests their HUD
// ---------------------------------------------------------------------------

export function AssessorAutocomplete({
  focusKey,
  label,
  value,
  designation,
  onDesignationChange,
  designations,
  phone,
  onPhoneChange,
  maskPhone,
  hud,
  onHudChange,
  huds,
  suggestions,
  /** name → HUD from this assessor's last entry. */
  hudByName,
  onChange,
  disabled,
  error,
  history,
}: {
  focusKey: string;
  label: string;
  value: string;
  designation: string;
  onDesignationChange: (v: string) => void;
  /** Free-text suggestions harvested from earlier entries. */
  designations: string[];
  phone: string;
  onPhoneChange: (v: string) => void;
  /** Viewer privacy: show only the last four digits. */
  maskPhone?: boolean;
  hud: string;
  onHudChange: (v: string) => void;
  huds: string[];
  suggestions: string[];
  hudByName: Record<string, string>;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: string;
  history?: FieldHistoryEntry[];
}) {
  const listId = `${focusKey}-list`;
  const designationListId = `${focusKey}-designations`;
  const matchedHud = value.trim() ? hudByName[value.trim().toLowerCase()] : undefined;
  const phoneInvalid = phone.trim() ? phoneError(phone) : null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FieldFrame focusKey={focusKey} label={label} error={error} history={history}>
        <div className="relative">
          <Input
            id={focusKey}
            data-focus={focusKey}
            list={listId}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Start typing a name"
            autoComplete="off"
            className="glass-input min-h-11"
          />
          <datalist id={listId}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        {matchedHud && !hud && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onHudChange(matchedHud)}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Sparkles className="size-3.5" /> Suggested HUD: {matchedHud} — apply
          </button>
        )}
      </FieldFrame>
      <FieldFrame
        focusKey={`${focusKey}-designation`}
        label={`${label.split("—")[0].trim()} designation`}
      >
        <Input
          data-focus={`${focusKey}-designation`}
          list={designationListId}
          value={designation}
          disabled={disabled}
          onChange={(e) => onDesignationChange(e.target.value)}
          placeholder="e.g. QMO"
          autoComplete="off"
          className="glass-input min-h-11"
        />
        <datalist id={designationListId}>
          {designations.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </FieldFrame>
      <FieldFrame
        focusKey={`${focusKey}-phone`}
        label={`${label.split("—")[0].trim()} contact number`}
        error={phoneInvalid ?? undefined}
      >
        {maskPhone ? (
          <p className="flex min-h-11 items-center rounded-md border border-border/60 bg-muted/30 px-3 text-sm text-muted-foreground">
            {phone ? maskPhoneValue(phone) : "-"}
          </p>
        ) : (
          <Input
            data-focus={`${focusKey}-phone`}
            type="tel"
            inputMode="tel"
            value={phone}
            disabled={disabled}
            onChange={(e) => onPhoneChange(e.target.value)}
            onBlur={() => {
              const normalized = normalizePhone(phone);
              if (normalized) onPhoneChange(normalized);
            }}
            placeholder="+91 98765 43210"
            autoComplete="off"
            className="glass-input min-h-11"
          />
        )}
        {!phoneInvalid && phone && !maskPhone && (
          <p className="mt-1 text-[11px] text-muted-foreground">Stored as {phone}</p>
        )}
      </FieldFrame>
      <FieldFrame
        focusKey={`${focusKey}Hud`}
        label={`${label.split("—")[0].trim()} HUD`}
      >
        <div className="flex flex-wrap gap-1.5">
          {huds.map((h) => (
            <button
              key={h}
              type="button"
              disabled={disabled}
              onClick={() => onHudChange(h === hud ? "" : h)}
              className={cn(
                "inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                h === hud
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border/70 bg-background/60 hover:bg-muted",
              )}
            >
              {h}
            </button>
          ))}
          {hud && !huds.includes(hud) && (
            <span className="inline-flex min-h-11 items-center rounded-lg border border-border/70 bg-muted/40 px-3 text-sm">
              {hud}
            </span>
          )}
        </div>
      </FieldFrame>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DepartmentChips — filled + check icon, select all, counter, search
// ---------------------------------------------------------------------------

export function DepartmentChips({
  focusKey,
  label,
  value,
  onChange,
  options,
  disabled,
  error,
  helper,
}: {
  focusKey: string;
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: string[];
  disabled?: boolean;
  error?: string;
  helper?: string;
}) {
  const [q, setQ] = useState("");
  const [extra, setExtra] = useState<string[]>([]);
  const all = [...options, ...extra.filter((e) => !options.includes(e))];
  const shown = q.trim()
    ? all.filter((d) => d.toLowerCase().includes(q.trim().toLowerCase()))
    : all;
  const allSelected = all.length > 0 && value.length === all.length;
  const addCustom = () => {
    const name = q.trim();
    if (!name) return;
    if (!all.includes(name)) setExtra((x) => [...x, name]);
    if (!value.includes(name)) onChange([...value, name]);
    setQ("");
  };
  return (
    <FieldFrame
      focusKey={focusKey}
      label={label}
      error={error}
      helper={helper}
    >
      <div
        data-focus={focusKey}
        tabIndex={-1}
        className={cn(
          "rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          error && "ring-1 ring-destructive/60 ring-offset-1 ring-offset-background",
        )}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search departments"
              aria-label="Search departments"
              className="glass-input min-h-11 pl-8"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="min-h-11"
            onClick={() => onChange(allSelected ? [] : all)}
          >
            {allSelected ? "Clear all" : "Select all"}
          </Button>
          <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            {value.length} of {all.length} selected
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {shown.map((d) => {
            const selected = value.includes(d);
            return (
              <button
                key={d}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() =>
                  onChange(selected ? value.filter((x) => x !== d) : [...value, d])
                }
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  selected
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border/70 bg-background/60 hover:bg-muted",
                )}
              >
                {selected && <Check className="size-3.5" aria-hidden />}
                {d}
              </button>
            );
          })}
          {shown.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No department matches “{q}”.
            </p>
          )}
        </div>
        {q.trim() && !all.includes(q.trim()) && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={addCustom}
          >
            <Sparkles className="mr-1 size-3.5" /> Add “{q.trim()}” as a custom department
          </Button>
        )}
      </div>
    </FieldFrame>
  );
}

// ---------------------------------------------------------------------------
// StatusBanner — the derived status, large, with a "Why this status?" rule
// ---------------------------------------------------------------------------

export function StatusBanner({
  label,
  tone,
  rule,
  onWhyOpenChange,
}: {
  label: string;
  tone: Tone;
  /** One-paragraph plain-language rule behind the derived status. */
  rule: string;
  onWhyOpenChange?: (open: boolean) => void;
}) {
  const Icon = BANNER_ICONS[tone];
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4",
        tone === "green" && "border-emerald-300/70 bg-emerald-500/5",
        tone === "amber" && "border-amber-300/70 bg-amber-500/5",
        tone === "red" && "border-rose-300/70 bg-rose-500/5",
        tone === "blue" && "border-sky-300/70 bg-sky-500/5",
        tone === "purple" && "border-violet-300/70 bg-violet-500/5",
        tone === "grey" && "border-border/60 bg-muted/30",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${TONE_HEX[tone]}1a`, color: TONE_HEX[tone] }}
          aria-hidden
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-lg leading-tight font-bold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">Derived automatically from the fields below</p>
        </div>
      </div>
      <Popover onOpenChange={onWhyOpenChange}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="min-h-11 gap-1.5">
            <Info className="size-4" /> Why this status?
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="max-w-sm text-sm leading-relaxed">
          {rule}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Tone → banner icon (module-level map, reused from the icon set). */
const BANNER_ICONS: Record<Tone, LucideIcon> = {
  grey: Info,
  blue: CalendarDays,
  amber: Clock3,
  purple: Info,
  green: Check,
  red: AlertTriangle,
};

// ---------------------------------------------------------------------------
// ValidityTimeline — Certified → S1 due → S2 due → Expiry, formula on hover
// ---------------------------------------------------------------------------

export function ValidityTimeline({
  certifiedOn,
  surveillance1,
  surveillance2,
  expires,
  formula,
}: {
  certifiedOn: string | null;
  surveillance1: string | null;
  surveillance2: string | null;
  expires: string | null;
  formula: string;
}) {
  const nodes = [
    { key: "cert", label: "Certified", date: certifiedOn, tone: "green" as Tone },
    { key: "s1", label: "1st surveillance due", date: surveillance1, tone: "blue" as Tone },
    { key: "s2", label: "2nd surveillance due", date: surveillance2, tone: "blue" as Tone },
    { key: "exp", label: "Validity ends", date: expires, tone: "amber" as Tone },
  ];
  if (!certifiedOn && !expires) {
    return (
      <p className="text-xs text-muted-foreground">
        Validity and surveillance dates appear here once a certification date is recorded.
      </p>
    );
  }
  return (
    <div
      tabIndex={0}
      data-tip={formula}
      className="rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={`Certification timeline. ${formula}`}
    >
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {nodes.map((n, i) => (
              <li key={n.key} className="relative min-w-0 rounded-lg border border-border/60 bg-muted/30 p-2.5">
                <span
                  className="mb-1 block h-1.5 w-full rounded-full"
                  style={{ background: n.date ? TONE_HEX[n.tone] : "var(--border)" }}
                  aria-hidden
                />
                <p className="truncate text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {n.label}
                </p>
                <p className="truncate text-sm font-semibold tabular-nums">
                  {n.date ? toDisplayDate(n.date) : "—"}
                </p>
                {i < nodes.length - 1 && (
                  <span className="absolute top-1/2 -right-2 hidden text-muted-foreground/60 sm:block" aria-hidden>
                    →
                  </span>
                )}
              </li>
            ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FormSection + SectionRail — sectioned forms with a sticky mini-nav
// ---------------------------------------------------------------------------

export type SectionState = { done: boolean; issues: number };

export function FormSection({
  id,
  index,
  title,
  hint,
  state,
  children,
  defaultOpen = true,
  /** Shown in place of `hint` while the section is collapsed. */
  collapsedHint,
  /** Locked sections show a lock icon + reason instead of collapsing. */
  lockReason,
}: {
  id: string;
  index: number;
  title: string;
  hint: string;
  collapsedHint?: string;
  state: SectionState;
  children: ReactNode;
  defaultOpen?: boolean;
  lockReason?: string | null;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      id={`section-${id}`}
      aria-label={title}
      className="glass scroll-mt-40 rounded-xl border border-border/60"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full min-h-14 items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            state.issues > 0
              ? "bg-destructive text-white"
              : state.done
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          {state.issues > 0 ? <AlertTriangle className="size-3.5" /> : state.done ? <Check className="size-3.5" /> : index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {index}. {title}
            {state.issues > 0 && (
              <span className="ml-2 text-xs font-medium text-destructive">
                {state.issues} to fix
              </span>
            )}
          </span>
          <span className="block text-xs leading-snug text-muted-foreground">
            {!open && collapsedHint ? collapsedHint : hint}
          </span>
        </span>
        {lockReason && (
          <span
            data-tip={lockReason}
            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground"
          >
            <Lock className="size-3" aria-hidden /> Read-only
          </span>
        )}
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform motion-safe:duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && <div className="border-t border-border/50 p-4">{children}</div>}
    </section>
  );
}

/** Sticky left rail (desktop) / horizontal chips (mobile) that scroll to a
 *  section and show its completion tick. */
export function SectionRail({
  sections,
}: {
  sections: { id: string; title: string; state: SectionState }[];
}) {
  return (
    <nav
      aria-label="Form sections"
      className="sticky top-2 z-10 -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:top-24 lg:mx-0 lg:mb-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0 print:hidden"
    >
      {sections.map((s, i) => (
        <a
          key={s.id}
          href={`#section-${s.id}`}
          className={cn(
            "flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:whitespace-normal",
            s.state.issues > 0
              ? "border-destructive/40 bg-destructive/10 text-foreground"
              : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
              s.state.issues > 0
                ? "bg-destructive text-white"
                : s.state.done
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted text-muted-foreground",
            )}
            aria-hidden
          >
            {s.state.issues > 0 ? <AlertTriangle className="size-3" /> : s.state.done ? <Check className="size-3" /> : i + 1}
          </span>
          <span className="min-w-0 flex-1">{s.title}</span>
        </a>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// ValidationSummary — top banner listing every blocking issue, click-to-focus
// ---------------------------------------------------------------------------

export function ValidationSummary({ issues }: { issues: FieldIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/40 bg-destructive/5 p-4"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
        <AlertTriangle className="size-4" /> Fix {issues.length} issue{issues.length === 1 ? "" : "s"} before saving
      </p>
      <ul className="mt-2 space-y-1.5">
        {issues.map((i, idx) => (
          <li key={`${i.field}-${idx}`}>
            <button
              type="button"
              onClick={() => focusField(i.field)}
              className="text-left text-xs leading-snug text-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="font-semibold">{i.label}:</span> {i.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StickySaveBar — "Unsaved changes (3)" · Discard · Save, with Ctrl/Cmd+S
// ---------------------------------------------------------------------------

export function StickySaveBar({
  dirtyCount,
  busy,
  lastSavedAt,
  onSave,
  onDiscard,
  saveLabel = "Save",
}: {
  dirtyCount: number;
  busy?: boolean;
  /** "Last updated by <user> · <relative time>" line. */
  lastSavedAt?: string | null;
  onSave: () => void;
  onDiscard: () => void;
  saveLabel?: string;
}) {
  const saveRef = useRef<() => void>(() => {});
  // Keep the save handler reachable from the (effect-registered) keyboard
  // shortcut without re-binding the window listener.
  useEffect(() => {
    saveRef.current = onSave;
  });
  // Ctrl/Cmd+S saves — registered while this bar is mounted (i.e. while the
  // form is on screen).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (dirtyCount === 0 && !lastSavedAt) return null;
  return (
    <div className="fixed inset-x-0 bottom-16 z-30 px-3 pb-3 md:bottom-0 md:px-6 md:pb-4 print:hidden">
      <div className="glass-strong mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3 shadow-lg">
        <div className="min-w-0">
          {dirtyCount > 0 ? (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
              <Target className="size-4" /> Unsaved changes ({dirtyCount})
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{lastSavedAt}</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Draft saves on this device every few seconds · Ctrl/Cmd+S to save
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dirtyCount > 0 && (
            <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={onDiscard}>
              Discard
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="min-h-11"
            disabled={busy || dirtyCount === 0}
            onClick={onSave}
          >
            {busy ? "Saving…" : `${saveLabel}${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FileDropzone — drag & drop + type/size validation around AttachmentPicker
// ---------------------------------------------------------------------------

export const FILE_MAX_MB = 10;

/** Human check used before the upload starts: right family, small enough. */
export function fileKindError(
  file: { name: string; size: number },
  accept: { exts: string[]; label: string },
): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!accept.exts.includes(ext)) {
    return `“${file.name}” is not a ${accept.label}. Accepted: ${accept.exts.map((e) => `.${e}`).join(", ")}.`;
  }
  if (file.size > FILE_MAX_MB * 1024 * 1024) {
    return `“${file.name}” is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${FILE_MAX_MB} MB. Compress the file and try again.`;
  }
  return null;
}

/** Dropzone surface — drag a file anywhere in the box to upload. Children
 *  render the AttachmentPicker button + current file row. */
export function Dropzone({
  disabled,
  error,
  onFile,
  accept,
  label,
  children,
}: {
  disabled?: boolean;
  error?: string;
  onFile: (file: File) => void;
  accept: { exts: string[]; label: string };
  label: string;
  children: ReactNode;
}) {
  const [over, setOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (disabled) return;
        const f = e.dataTransfer.files?.[0];
        if (!f) return;
        const err = fileKindError(f, accept);
        if (err) {
          setLocalError(err);
          return;
        }
        setLocalError(null);
        onFile(f);
      }}
      className={cn(
        "rounded-xl border border-dashed p-3 transition-colors motion-safe:duration-150",
        over ? "border-primary bg-primary/5" : "border-border/70 bg-muted/20",
        (error || localError) && "border-destructive/60",
      )}
    >
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Paperclip className="size-3.5" /> Drag &amp; drop the {label} here ({accept.label}, max {FILE_MAX_MB} MB)
      </p>
      {children}
      {(localError || error) && (
        <p role="alert" className="mt-1.5 flex items-start gap-1 text-xs leading-snug font-medium text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {localError ?? error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Misc helpers shared by the two forms
// ---------------------------------------------------------------------------

/** "Last updated by <user> · <relative time>" — shown under each section. */
export function relativeTime(ts: number | null | undefined): string {
  if (!ts) return "never";
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return toDisplayDate(new Date(ts).toISOString().slice(0, 10));
}

/** Local-draft helpers — one key per record so drafts never cross wires. */
export function loadDraft<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return typeof parsed === "object" && parsed !== null ? { ...fallback, ...parsed } : fallback;
  } catch {
    return fallback;
  }
}

export function saveDraft(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — drafts are best-effort */
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export { formatInr };
