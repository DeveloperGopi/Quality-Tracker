import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports } from './icons-BxQpodNr.js';
import { c as cn } from './index-CBV6wOh8.js';

const TableOverflowVisibleContext = reactExports.createContext(false);
const AutoFitTableContext = reactExports.createContext(false);
function Table({ className, ...props }) {
  const overflowVisible = reactExports.useContext(TableOverflowVisibleContext);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-slot": "table-container",
      className: cn(
        "relative w-full",
        overflowVisible ? "overflow-visible" : "overflow-x-auto"
      ),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "table",
        {
          "data-slot": "table",
          className: cn(
            "w-full caption-bottom text-sm",
            reactExports.useContext(AutoFitTableContext) ? "table-auto" : void 0,
            className
          ),
          ...props
        }
      )
    }
  );
}
function TableHeader({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "thead",
    {
      "data-slot": "table-header",
      className: cn(
        "sticky top-0 z-10 border-b bg-muted/60 backdrop-blur [&_tr]:border-b",
        className
      ),
      ...props
    }
  );
}
function TableBody({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "tbody",
    {
      "data-slot": "table-body",
      className: cn("[&_tr:last-child]:border-0", className),
      ...props
    }
  );
}
function TableFooter({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "tfoot",
    {
      "data-slot": "table-footer",
      className: cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      ),
      ...props
    }
  );
}
function TableRow({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "tr",
    {
      "data-slot": "table-row",
      className: cn(
        "border-b border-border/60 transition-colors hover:bg-primary/[0.045] data-[state=selected]:bg-muted",
        className
      ),
      ...props
    }
  );
}
function StickyTableScroll({
  className,
  maxHeight = "70vh",
  minHeight,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TableOverflowVisibleContext.Provider, { value: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn("overflow-auto rounded-xl border bg-background/60", className),
      style: { maxHeight, minHeight },
      children
    }
  ) });
}
function AutoFitTableScroll({
  className,
  maxHeight = "70vh",
  minHeight,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AutoFitTableContext.Provider, { value: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(StickyTableScroll, { className, maxHeight, minHeight, children }) });
}
function TableHead({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "th",
    {
      "data-slot": "table-head",
      className: cn(
        "text-foreground h-11 px-3 text-left align-middle text-xs font-semibold tracking-wide whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      ),
      ...props
    }
  );
}
function TableCell({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "td",
    {
      "data-slot": "table-cell",
      className: cn(
        "px-3 py-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      ),
      ...props
    }
  );
}

export { AutoFitTableScroll as A, StickyTableScroll as S, TableHeader as T, TableRow as a, TableHead as b, TableBody as c, TableCell as d, TableFooter as e, Table as f };
