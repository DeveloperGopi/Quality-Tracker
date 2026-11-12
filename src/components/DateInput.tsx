/**
 * DATEINPUT — the ONE date control in the app.
 *
 * • Clicking anywhere in the field, Enter, Space, F2 or the calendar icon opens
 *   the picker. The picker is portalled (never clipped by a card, dialog or
 *   scrolling table); under 640 px it becomes a bottom sheet with a native
 *   date control.
 * • Typing is always possible: DD-MM-YYYY, DD/MM/YYYY, DD-MMM-YYYY, D-M-YY
 *   and ISO are accepted. A valid date writes to the caller's draft straight
 *   away; an invalid one shows a clear message and never resets silently.
 * • Selecting, typing a valid date or Clear calls onChange immediately. The
 *   field keeps a fixed height — errors float under it instead of pushing the
 *   next row down.
 * • A disabled/read-only date always explains itself with a lock + tooltip;
 *   nothing is ever silently greyed out.
 *
 * The calendar body is lazy-loaded on first open (and prefetched on hover).
 */

import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AlertTriangle, CalendarDays, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DATE_INPUT_ERROR,
  dateRuleError,
  formatDateLong,
  isIsoDate,
  parseDateText,
  todayIsoIST,
} from "@/lib/dateInput";

export type DateInputProps = {
  /** Input id — also the `data-testid` prefix (`<id>-display`). */
  id: string;
  label: string;
  /** ISO date-only value or "". A blank is never 0. */
  value: string;
  onChange: (iso: string) => void;
  /** Earliest/latest allowed ISO dates. */
  min?: string;
  max?: string;
  /** Today's IST date (the forms pin this so tests and validation agree). */
  today?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** Why the date is locked, shown in the lock tooltip. */
  disabledReason?: string;
  /** Text when the value is blank (default "Not set"). */
  emptyLabel?: string;
  /** Compact 32 px control for table rows. */
  compact?: boolean;
  /** No border/background — used inside the shared date-range filter. */
  bare?: boolean;
  /** Hide the small "Change" affordance (range filter). */
  hideChange?: boolean;
  /** Hide the in-field calendar icon (the range filter supplies its own). */
  hideIcon?: boolean;
  /** Row editor: open as soon as the control mounts. */
  autoOpen?: boolean;
  /** Called whenever the picker closes (the row editor uses it to collapse). */
  onRequestClose?: () => void;
  className?: string;
  "data-focus"?: string;
};

const loadPanel = () => import("@/components/DatePickerPanel");
const LazyPanel = lazy(loadPanel);

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return narrow;
}

export function DateInput({
  id,
  label,
  value,
  onChange,
  min,
  max,
  today = todayIsoIST(),
  disabled = false,
  readOnly = false,
  disabledReason,
  emptyLabel = "Not set",
  compact = false,
  bare = false,
  hideChange = false,
  hideIcon = false,
  autoOpen = false,
  onRequestClose,
  className,
  "data-focus": dataFocus,
}: DateInputProps) {
  const narrow = useNarrow();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatted = isIsoDate(value) ? formatDateLong(value) : "";
  const [open, setOpen] = useState(autoOpen);
  const [focusGrid, setFocusGrid] = useState(false);
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(formatted);
  const [error, setError] = useState<string | null>(null);
  const [keepInvalid, setKeepInvalid] = useState(false);

  const lockReason =
    disabledReason ??
    (readOnly
      ? "Read-only — this date is set automatically"
      : "Read-only — you do not have permission to change this date");

  useEffect(() => {
    if (!focused && !keepInvalid) setText(formatted);
  }, [formatted, focused, keepInvalid]);

  useEffect(() => {
    if (!autoOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [autoOpen]);

  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    [],
  );

  const shownText = keepInvalid && text.trim() ? text : formatted || emptyLabel;

  const prefetch = () => {
    void loadPanel();
  };

  const openPicker = (withGridFocus: boolean) => {
    if (disabled || readOnly) return;
    setFocusGrid(withGridFocus);
    setOpen(true);
    prefetch();
  };

  const closeAndRestore = (restore: boolean) => {
    setOpen(false);
    setFocusGrid(false);
    onRequestClose?.();
    if (restore) {
      window.setTimeout(() => {
        const input = inputRef.current;
        if (!input) return;
        input.focus();
        input.select();
      }, 0);
    }
  };

  /** Apply a valid ISO date immediately. */
  const commitIso = (iso: string, restoreFocus = true) => {
    setError(null);
    setKeepInvalid(false);
    setText(formatDateLong(iso));
    onChange(iso);
    closeAndRestore(restoreFocus);
  };

  /** Parse raw text; returns true when a valid date was applied. */
  const commitText = (raw: string, close = false): boolean => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError(null);
      setKeepInvalid(false);
      setText("");
      onChange("");
      if (close) closeAndRestore(true);
      return true;
    }
    const iso = parseDateText(trimmed);
    if (!iso) {
      setError(DATE_INPUT_ERROR);
      setKeepInvalid(true);
      return false;
    }
    const rule = dateRuleError(iso, { min, max });
    if (rule) {
      setError(rule);
      setKeepInvalid(true);
      return false;
    }
    setError(null);
    setKeepInvalid(false);
    setText(formatDateLong(iso));
    onChange(iso);
    if (close) closeAndRestore(true);
    return true;
  };

  const onTextChange = (raw: string) => {
    setText(raw);
    setError(null);
    setKeepInvalid(false);
    // Commit as soon as the text is a complete, allowed date — the draft and
    // the Save bar update while typing, exactly like a chip or calendar pick.
    const iso = parseDateText(raw);
    if (!iso) return;
    const rule = dateRuleError(iso, { min, max });
    if (rule) {
      setError(rule);
      setKeepInvalid(true);
      return;
    }
    onChange(iso);
    setText(formatDateLong(iso));
  };

  const onBlur = () => {
    setFocused(false);
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (rootRef.current?.contains(active)) return;
      if (active?.closest?.("[data-date-panel]")) return;
      // A valid value was already written while typing; this catches a
      // pasted value and an invalid one (which stays visible with a message).
      if (text.trim() && text !== formatted) commitText(text);
      if (open) {
        setOpen(false);
        setFocusGrid(false);
        onRequestClose?.();
      }
    }, 140);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "F2" || (e.key === " " && !open)) {
      e.preventDefault();
      openPicker(true);
      return;
    }
    if (e.key === "ArrowDown" && !open) {
      e.preventDefault();
      openPicker(true);
      return;
    }
    if (e.key === "Escape") {
      if (!open && !error) return;
      e.preventDefault();
      setError(null);
      setKeepInvalid(false);
      setText(formatted);
      closeAndRestore(true);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (!open) {
        openPicker(true);
        return;
      }
      commitText(text, true);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && disabled) return;
    setOpen(next);
    if (!next) {
      setFocusGrid(false);
      onRequestClose?.();
    }
  };

  const root = (
    <div
      ref={rootRef}
      className={cn(
        "relative flex items-center gap-2",
        bare
          ? "bg-transparent"
          : cn(
              "rounded-lg border bg-background/60 px-2.5",
              compact ? "min-h-8" : "min-h-11",
              error
                ? "border-destructive/70"
                : "border-input focus-within:ring-2 focus-within:ring-ring",
            ),
        disabled || readOnly ? "opacity-70" : "cursor-text",
        className,
      )}
      data-tip={disabled || readOnly ? lockReason : undefined}
      onClick={() => {
        if (disabled || readOnly) return;
        inputRef.current?.focus();
        if (!open) openPicker(false);
      }}
      onPointerEnter={prefetch}
    >
      {!hideIcon && (
        <CalendarDays
          className={cn("shrink-0 text-muted-foreground", compact ? "size-3.5" : "size-4")}
          aria-hidden
        />
      )}
      <div className="relative min-w-0 flex-1">
        <span
          data-testid={`${id}-display`}
          className={cn(
            "block truncate tabular-nums",
            compact ? "text-[11px]" : "text-sm",
            shownText && shownText !== emptyLabel ? "text-foreground" : "text-muted-foreground",
            focused && "invisible",
            keepInvalid && "text-destructive",
          )}
          aria-hidden={focused ? true : undefined}
        >
          {shownText}
        </span>
        <input
          ref={inputRef}
          id={id}
          data-focus={dataFocus}
          value={focused || keepInvalid ? text : formatted}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(e) => onTextChange(e.target.value)}
          onFocus={() => {
            if (disabled || readOnly) return;
            setFocused(true);
            setText(keepInvalid ? text : formatted);
            if (!open) openPicker(false);
          }}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onPointerEnter={prefetch}
          aria-label={`${label} — type a date or open the calendar`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "absolute inset-0 h-full w-full min-w-0 border-0 bg-transparent p-0 tabular-nums outline-none",
            compact ? "text-[11px]" : "text-sm",
            focused ? "text-foreground" : "text-transparent caret-transparent",
            disabled && "cursor-not-allowed",
            readOnly && "cursor-default",
          )}
        />
      </div>
      {disabled || readOnly ? (
        <Lock
          className={cn("shrink-0 text-muted-foreground", compact ? "size-3" : "size-3.5")}
          aria-label={lockReason}
          data-tip={lockReason}
        />
      ) : (
        !hideChange && (
          <span
            className={cn(
              "pointer-events-none shrink-0 font-medium text-primary",
              compact ? "text-[10px]" : "text-[11px]",
            )}
            aria-hidden
          >
            Change
          </span>
        )
      )}
      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="absolute top-full left-0 z-40 mt-1 flex max-w-[19rem] items-start gap-1 rounded-md border border-destructive/40 bg-background px-2 py-1 text-[11px] leading-snug font-medium text-destructive shadow-md"
        >
          <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );

  const panel = (
    <Suspense
      fallback={
        <div className="flex h-72 w-[19.5rem] items-center justify-center p-4 text-xs text-muted-foreground">
          Loading calendar…
        </div>
      }
    >
      <LazyPanel
        value={value}
        onChange={commitIso}
        onClose={() => closeAndRestore(true)}
        min={min}
        max={max}
        today={today}
        error={error}
        focusGrid={focusGrid}
        mobile={narrow}
      />
    </Suspense>
  );

  return (
    <>
      <Popover open={open && !narrow} onOpenChange={handleOpenChange}>
        <PopoverAnchor asChild>{root}</PopoverAnchor>
        {open && !narrow && (
          <PopoverContent
            data-slot="date-picker"
            align="start"
            side="bottom"
            sideOffset={6}
            collisionPadding={12}
            className="z-[130] w-auto border-border/70 p-0 shadow-xl"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {panel}
          </PopoverContent>
        )}
      </Popover>

      <Dialog open={open && narrow} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          className="top-auto bottom-0 left-0 z-[130] max-h-[85dvh] w-full max-w-full translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-t-2xl rounded-b-none border-x-0 border-b-0 p-0"
        >
          <DialogTitle className="sr-only">{label}</DialogTitle>
          {panel}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DateInput;
