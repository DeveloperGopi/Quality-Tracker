import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, c2 as CalendarDays, a3 as X, aj as ChevronLeft, z as ChevronRight } from './icons-BxQpodNr.js';
import { c as cn } from './index-CBV6wOh8.js';
import { i as isIsoDate, m as monthGrid, b as dateRuleError, s as shiftMonth, c as monthName, W as WEEKDAY_LABELS, e as formatDateSpoken, f as formatDateLong, D as DATE_INPUT_ERROR, t as todayIsoIST, a as addDays } from './dateInput-0KZh0HdG.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';

const pad2 = (n) => String(n).padStart(2, "0");
function DatePickerPanel({
  value,
  onChange,
  onClose,
  min,
  max,
  today = todayIsoIST(),
  error,
  focusGrid = false,
  mobile = false
}) {
  const anchor = isIsoDate(value) ? value : today;
  const [view, setView] = reactExports.useState(() => ({
    year: Number(anchor.slice(0, 4)),
    month: Number(anchor.slice(5, 7))
  }));
  const gridRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!isIsoDate(value)) return;
    setView({ year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) });
  }, [value]);
  reactExports.useEffect(() => {
    if (!focusGrid || mobile) return;
    const id = window.setTimeout(() => {
      const el = gridRef.current?.querySelector('[data-day][tabindex="0"]') ?? gridRef.current?.querySelector("[data-day]:not([disabled])");
      el?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [focusGrid, mobile]);
  const cells = reactExports.useMemo(() => monthGrid(view.year, view.month), [view.year, view.month]);
  const years = reactExports.useMemo(() => {
    const base = Number(anchor.slice(0, 4));
    const from = min ? Number(min.slice(0, 4)) : base - 10;
    const to = max ? Number(max.slice(0, 4)) : base + 10;
    const lo = Math.min(from, view.year, base);
    const hi = Math.max(to, view.year, base);
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }, [anchor, min, max, view.year]);
  const selected = isIsoDate(value) ? value : "";
  const tabbable = (selected && selected.startsWith(`${view.year}-${pad2(view.month)}`) ? selected : "") || (today.startsWith(`${view.year}-${pad2(view.month)}`) && !dateRuleError(today, { min, max }) ? today : "") || (cells.find((c) => c && !dateRuleError(c, { min, max })) ?? "");
  const viewMonthKey = `${view.year}-${pad2(view.month)}`;
  const atMin = !!min && viewMonthKey <= min.slice(0, 7);
  const atMax = !!max && viewMonthKey >= max.slice(0, 7);
  const todayBlocked = !!dateRuleError(today, { min, max });
  const moveFocus = (next) => {
    setView({ year: Number(next.slice(0, 4)), month: Number(next.slice(5, 7)) });
    window.setTimeout(() => {
      gridRef.current?.querySelector(`[data-day="${next}"]`)?.focus();
    }, 0);
  };
  const onGridKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    const from = e.target.closest("[data-day]")?.dataset.day;
    if (!from) return;
    let next = "";
    if (e.key === "ArrowLeft") next = addDays(from, -1);
    else if (e.key === "ArrowRight") next = addDays(from, 1);
    else if (e.key === "ArrowUp") next = addDays(from, -7);
    else if (e.key === "ArrowDown") next = addDays(from, 7);
    else if (e.key === "Home") {
      const dow = ((/* @__PURE__ */ new Date(`${from}T00:00:00Z`)).getUTCDay() + 6) % 7;
      next = addDays(from, -dow);
    } else if (e.key === "End") {
      const dow = ((/* @__PURE__ */ new Date(`${from}T00:00:00Z`)).getUTCDay() + 6) % 7;
      next = addDays(from, 6 - dow);
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      const shifted = shiftMonth(
        Number(from.slice(0, 4)),
        Number(from.slice(5, 7)),
        e.key === "PageUp" ? -1 : 1
      );
      const day = Math.min(Number(from.slice(8, 10)), new Date(Date.UTC(shifted.year, shifted.month, 0)).getUTCDate());
      next = `${shifted.year}-${pad2(shifted.month)}-${pad2(day)}`;
    }
    if (!next) return;
    e.preventDefault();
    if (next < (min ?? "0000-01-01") || next > (max ?? "9999-12-31")) return;
    moveFocus(next);
  };
  if (mobile) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-date-panel": true, className: "space-y-3 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1.5 text-sm font-semibold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarDays, { className: "size-4" }),
          " Choose a date"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onClose,
            "aria-label": "Close date picker",
            className: "rounded-md p-1.5 text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "date",
          autoFocus: true,
          value,
          min,
          max,
          onChange: (e) => onChange(e.target.value),
          "aria-label": "Date",
          className: "glass-input h-11 w-full rounded-lg border border-input px-3 text-base"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            disabled: todayBlocked,
            "data-tip": todayBlocked ? dateRuleError(today, { min, max }) ?? void 0 : void 0,
            onClick: () => onChange(today),
            className: "min-h-11 rounded-lg border border-border px-3 text-sm font-medium disabled:opacity-50",
            children: "Today"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => onChange(""),
            className: "min-h-11 rounded-lg border border-border px-3 text-sm font-medium",
            children: "Clear"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onClose,
            className: "ml-auto min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground",
            children: "Done"
          }
        )
      ] }),
      (error || value && dateRuleError(value, { min, max })) && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", "aria-live": "polite", className: "text-xs font-medium text-destructive", children: error || dateRuleError(value, { min, max }) })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-date-panel": true, className: "w-[19.5rem] p-3", "aria-label": "Choose a date", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          disabled: atMin,
          onClick: () => setView((v) => shiftMonth(v.year, v.month, -1)),
          "aria-label": "Previous month",
          className: "rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "size-4" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "select",
        {
          "aria-label": "Month",
          value: view.month,
          onChange: (e) => setView((v) => ({ ...v, month: Number(e.target.value) })),
          className: "h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-1 text-sm font-medium",
          children: Array.from({ length: 12 }, (_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: i + 1, children: monthName(i + 1) }, i + 1))
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "select",
        {
          "aria-label": "Year",
          value: view.year,
          onChange: (e) => setView((v) => ({ ...v, year: Number(e.target.value) })),
          className: "h-8 w-[5.25rem] rounded-md border border-input bg-background px-1 text-sm font-medium tabular-nums",
          children: years.map((y) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: y, children: y }, y))
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          disabled: atMax,
          onClick: () => setView((v) => shiftMonth(v.year, v.month, 1)),
          "aria-label": "Next month",
          className: "rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-4" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 grid grid-cols-7", "aria-hidden": true, children: WEEKDAY_LABELS.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: "py-1 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase",
        children: d
      },
      d
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        ref: gridRef,
        role: "grid",
        "aria-label": `${monthName(view.month)} ${view.year}`,
        onKeyDown: onGridKeyDown,
        className: "grid grid-cols-7 gap-0.5",
        children: cells.map((iso, i) => {
          if (!iso) return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true }, `blank-${i}`);
          const reason = dateRuleError(iso, { min, max });
          const isSelected = iso === selected;
          const isToday = iso === today;
          const day = Number(iso.slice(8, 10));
          return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-tip": reason ?? void 0, className: "block", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "data-day": iso,
              role: "gridcell",
              disabled: !!reason,
              tabIndex: iso === tabbable ? 0 : -1,
              "aria-selected": isSelected,
              "aria-current": isToday ? "date" : void 0,
              "aria-label": `${formatDateSpoken(iso)}${isToday ? " (today)" : ""}${reason ? ` — ${reason}` : ""}`,
              onClick: () => onChange(iso),
              className: cn(
                "flex size-9 w-full items-center justify-center rounded-md text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected ? "bg-primary font-semibold text-primary-foreground shadow-sm" : isToday ? "border border-primary/50 font-semibold text-primary hover:bg-primary/10" : "hover:bg-muted",
                reason && "cursor-not-allowed text-muted-foreground/40 line-through hover:bg-transparent"
              ),
              children: day
            }
          ) }, iso);
        })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center gap-1.5 border-t border-border/60 pt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          disabled: todayBlocked,
          "data-tip": todayBlocked ? dateRuleError(today, { min, max }) ?? void 0 : void 0,
          onClick: () => onChange(today),
          className: "min-h-8 rounded-md border border-border/70 px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50",
          children: "Today"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => onChange(""),
          className: "min-h-8 rounded-md border border-border/70 px-2.5 text-xs font-medium hover:bg-muted",
          children: "Clear"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-[11px] text-muted-foreground", children: selected ? formatDateLong(selected) : "No date" })
    ] }),
    (error || value && dateRuleError(value, { min, max })) && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", "aria-live": "polite", className: "mt-2 text-xs font-medium text-destructive", children: error || dateRuleError(value, { min, max }) }),
    !error && !value && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[11px] text-muted-foreground", children: DATE_INPUT_ERROR })
  ] });
}

export { DatePickerPanel, DatePickerPanel as default };
