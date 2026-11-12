import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { Q as Search, aa as SlidersHorizontal, a3 as X } from './icons-BxQpodNr.js';
import { c as cn } from './index-CBV6wOh8.js';

function FilterBar({
  children,
  activeCount = 0,
  onClearAll,
  summary,
  className,
  compact
}) {
  const hasFilters = activeCount > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "glass mb-4 rounded-xl border border-border/60 p-3",
        compact && "mb-2 p-2",
        className
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center gap-2.5", children }),
        !compact && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2.5 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SlidersHorizontal, { className: "size-3.5" }),
          hasFilters ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium text-foreground", children: [
              activeCount,
              " filter",
              activeCount === 1 ? "" : "s",
              " active"
            ] }),
            onClearAll && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: onClearAll,
                className: "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-primary transition-colors hover:bg-primary/10",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3" }),
                  "Clear all"
                ]
              }
            )
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "No filters applied" }),
          summary != null && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto tabular-nums", children: summary })
        ] })
      ]
    }
  );
}
function FilterSearch({
  value,
  onChange,
  placeholder,
  className,
  inputRef
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("relative min-w-52 flex-1 sm:max-w-72", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        ref: inputRef,
        value,
        onChange: (e) => onChange(e.target.value),
        placeholder,
        className: "glass-input h-9 w-full rounded-lg border pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      }
    )
  ] });
}

function countActiveFilters(filters) {
  let n = 0;
  for (const f of filters) {
    if (f == null) continue;
    if (Array.isArray(f)) {
      if (f.length > 0) n += 1;
    } else if (f !== "all") {
      n += 1;
    }
  }
  return n;
}

export { FilterBar as F, FilterSearch as a, countActiveFilters as c };
