const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/DatePickerPanel-DUF5Yqoo.js","assets/vendor-motion-DgC1stbS.js","assets/icons-BxQpodNr.js","assets/index-CBV6wOh8.js","assets/vendor-jspdf-BarNdCns.js","assets/vendor-charts--qXk384P.js","assets/index-CneVNiou.css","assets/dateInput-0KZh0HdG.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, c2 as CalendarDays, p as Lock, T as TriangleAlert } from './icons-BxQpodNr.js';
import { c as cn } from './index-CBV6wOh8.js';
import { e as Popover, c_ as PopoverAnchor, g as PopoverContent } from './AppShell-CP099uvN.js';
import { D as Dialog, a as DialogContent, c as DialogTitle } from './dialog-BW3GEiPg.js';
import { i as isIsoDate, f as formatDateLong, t as todayIsoIST, p as parseDateText, b as dateRuleError, D as DATE_INPUT_ERROR } from './dateInput-0KZh0HdG.js';

const loadPanel = () => __vitePreload(() => import('./DatePickerPanel-DUF5Yqoo.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6,7]):void 0);
const LazyPanel = reactExports.lazy(loadPanel);
function useNarrow() {
  const [narrow, setNarrow] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return narrow;
}
function DateInput({
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
  "data-focus": dataFocus
}) {
  const narrow = useNarrow();
  const inputRef = reactExports.useRef(null);
  const rootRef = reactExports.useRef(null);
  const blurTimer = reactExports.useRef(null);
  const formatted = isIsoDate(value) ? formatDateLong(value) : "";
  const [open, setOpen] = reactExports.useState(autoOpen);
  const [focusGrid, setFocusGrid] = reactExports.useState(false);
  const [focused, setFocused] = reactExports.useState(false);
  const [text, setText] = reactExports.useState(formatted);
  const [error, setError] = reactExports.useState(null);
  const [keepInvalid, setKeepInvalid] = reactExports.useState(false);
  const lockReason = disabledReason ?? (readOnly ? "Read-only — this date is set automatically" : "Read-only — you do not have permission to change this date");
  reactExports.useEffect(() => {
    if (!focused && !keepInvalid) setText(formatted);
  }, [formatted, focused, keepInvalid]);
  reactExports.useEffect(() => {
    if (!autoOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [autoOpen]);
  reactExports.useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    []
  );
  const shownText = keepInvalid && text.trim() ? text : formatted || emptyLabel;
  const prefetch = () => {
    void loadPanel();
  };
  const openPicker = (withGridFocus) => {
    if (disabled || readOnly) return;
    setFocusGrid(withGridFocus);
    setOpen(true);
    prefetch();
  };
  const closeAndRestore = (restore) => {
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
  const commitIso = (iso, restoreFocus = true) => {
    setError(null);
    setKeepInvalid(false);
    setText(formatDateLong(iso));
    onChange(iso);
    closeAndRestore(restoreFocus);
  };
  const commitText = (raw, close = false) => {
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
  const onTextChange = (raw) => {
    setText(raw);
    setError(null);
    setKeepInvalid(false);
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
      const active = document.activeElement;
      if (rootRef.current?.contains(active)) return;
      if (active?.closest?.("[data-date-panel]")) return;
      if (text.trim() && text !== formatted) commitText(text);
      if (open) {
        setOpen(false);
        setFocusGrid(false);
        onRequestClose?.();
      }
    }, 140);
  };
  const onKeyDown = (e) => {
    if (e.key === "F2" || e.key === " " && !open) {
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
  const handleOpenChange = (next) => {
    if (!next && disabled) return;
    setOpen(next);
    if (!next) {
      setFocusGrid(false);
      onRequestClose?.();
    }
  };
  const root = /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      ref: rootRef,
      className: cn(
        "relative flex items-center gap-2",
        bare ? "bg-transparent" : cn(
          "rounded-lg border bg-background/60 px-2.5",
          compact ? "min-h-8" : "min-h-11",
          error ? "border-destructive/70" : "border-input focus-within:ring-2 focus-within:ring-ring"
        ),
        disabled || readOnly ? "opacity-70" : "cursor-text",
        className
      ),
      "data-tip": disabled || readOnly ? lockReason : void 0,
      onClick: () => {
        if (disabled || readOnly) return;
        inputRef.current?.focus();
        if (!open) openPicker(false);
      },
      onPointerEnter: prefetch,
      children: [
        !hideIcon && /* @__PURE__ */ jsxRuntimeExports.jsx(
          CalendarDays,
          {
            className: cn("shrink-0 text-muted-foreground", compact ? "size-3.5" : "size-4"),
            "aria-hidden": true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              "data-testid": `${id}-display`,
              className: cn(
                "block truncate tabular-nums",
                compact ? "text-[11px]" : "text-sm",
                shownText && shownText !== emptyLabel ? "text-foreground" : "text-muted-foreground",
                focused && "invisible",
                keepInvalid && "text-destructive"
              ),
              "aria-hidden": focused ? true : void 0,
              children: shownText
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              ref: inputRef,
              id,
              "data-focus": dataFocus,
              value: focused || keepInvalid ? text : formatted,
              disabled,
              readOnly,
              onChange: (e) => onTextChange(e.target.value),
              onFocus: () => {
                if (disabled || readOnly) return;
                setFocused(true);
                setText(keepInvalid ? text : formatted);
                if (!open) openPicker(false);
              },
              onBlur,
              onKeyDown,
              onPointerEnter: prefetch,
              "aria-label": `${label} — type a date or open the calendar`,
              "aria-haspopup": "dialog",
              "aria-expanded": open,
              "aria-invalid": error ? true : void 0,
              autoComplete: "off",
              spellCheck: false,
              className: cn(
                "absolute inset-0 h-full w-full min-w-0 border-0 bg-transparent p-0 tabular-nums outline-none",
                compact ? "text-[11px]" : "text-sm",
                focused ? "text-foreground" : "text-transparent caret-transparent",
                disabled && "cursor-not-allowed",
                readOnly && "cursor-default"
              )
            }
          )
        ] }),
        disabled || readOnly ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Lock,
          {
            className: cn("shrink-0 text-muted-foreground", compact ? "size-3" : "size-3.5"),
            "aria-label": lockReason,
            "data-tip": lockReason
          }
        ) : !hideChange && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: cn(
              "pointer-events-none shrink-0 font-medium text-primary",
              compact ? "text-[10px]" : "text-[11px]"
            ),
            "aria-hidden": true,
            children: "Change"
          }
        ),
        error && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "p",
          {
            role: "alert",
            "aria-live": "polite",
            className: "absolute top-full left-0 z-40 mt-1 flex max-w-[19rem] items-start gap-1 rounded-md border border-destructive/40 bg-background px-2 py-1 text-[11px] leading-snug font-medium text-destructive shadow-md",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-0.5 size-3 shrink-0", "aria-hidden": true }),
              error
            ]
          }
        )
      ]
    }
  );
  const panel = /* @__PURE__ */ jsxRuntimeExports.jsx(
    reactExports.Suspense,
    {
      fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-72 w-[19.5rem] items-center justify-center p-4 text-xs text-muted-foreground", children: "Loading calendar…" }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        LazyPanel,
        {
          value,
          onChange: commitIso,
          onClose: () => closeAndRestore(true),
          min,
          max,
          today,
          error,
          focusGrid,
          mobile: narrow
        }
      )
    }
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open: open && !narrow, onOpenChange: handleOpenChange, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverAnchor, { asChild: true, children: root }),
      open && !narrow && /* @__PURE__ */ jsxRuntimeExports.jsx(
        PopoverContent,
        {
          "data-slot": "date-picker",
          align: "start",
          side: "bottom",
          sideOffset: 6,
          collisionPadding: 12,
          className: "z-[130] w-auto border-border/70 p-0 shadow-xl",
          onOpenAutoFocus: (e) => e.preventDefault(),
          onCloseAutoFocus: (e) => e.preventDefault(),
          children: panel
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: open && narrow, onOpenChange: handleOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      DialogContent,
      {
        showCloseButton: false,
        "aria-describedby": void 0,
        className: "top-auto bottom-0 left-0 z-[130] max-h-[85dvh] w-full max-w-full translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-t-2xl rounded-b-none border-x-0 border-b-0 p-0",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "sr-only", children: label }),
          panel
        ]
      }
    ) })
  ] });
}

export { DateInput as D };
