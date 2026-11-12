import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { T as TriangleAlert, m as Check, a3 as X, L as LoaderCircle, ax as Save, A as ArrowRight } from './icons-BxQpodNr.js';
import { B as Button, c as cn } from './index-CBV6wOh8.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from './dialog-BW3GEiPg.js';

function SaveBar({
  changes,
  issues,
  saving,
  savedLabel,
  dirty,
  onDiscard,
  onSave,
  onSaveAndNext,
  onReview,
  onFocusIssue,
  canSaveAndNext,
  fileChanges = 0,
  documentHint = null
}) {
  const blocking = issues.filter((i) => i.severity === "blocking");
  const warnings = issues.filter((i) => i.severity === "warning");
  const disabled = !dirty || blocking.length > 0 || saving;
  const changeCount = changes.length + fileChanges;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
    blocking.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-1 text-[11px] font-semibold text-destructive", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5" }),
        " ",
        blocking.length,
        " blocking",
        " ",
        blocking.length === 1 ? "issue" : "issues",
        ":"
      ] }),
      blocking.map((issue) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => onFocusIssue(issue.field),
          className: "text-[11px] font-medium text-destructive underline decoration-dotted underline-offset-2 hover:decoration-solid",
          children: issue.message
        }
      ) }, `${issue.field}-${issue.message}`))
    ] }),
    blocking.length === 0 && warnings.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-amber-300/60 bg-amber-50 px-2 py-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-1 text-[11px] font-semibold text-amber-800", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5" }),
        " ",
        warnings.length,
        " warning",
        warnings.length === 1 ? "" : "s",
        " (saving allowed):"
      ] }),
      warnings.map((issue) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => onFocusIssue(issue.field),
          className: "text-[11px] text-amber-900 underline decoration-dotted underline-offset-2",
          children: issue.message
        }
      ) }, `${issue.field}-${issue.message}`))
    ] }),
    documentHint && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "p",
      {
        className: "flex flex-wrap items-center gap-1.5 rounded-md border border-amber-300/60 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900",
        "data-testid": "save-bar-document-hint",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5 shrink-0" }),
          "Upload ",
          documentHint.label,
          " to save",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: documentHint.onOpen,
              className: "font-semibold underline underline-offset-2",
              children: "Choose file"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-end gap-2", children: [
      dirty && blocking.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] font-medium text-destructive", children: [
        "Fix ",
        blocking.length,
        " error",
        blocking.length === 1 ? "" : "s",
        " first"
      ] }),
      savedLabel && !dirty && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-xs font-medium text-emerald-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5" }),
        " ",
        savedLabel
      ] }),
      dirty && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", "aria-live": "polite", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "font-semibold text-foreground", children: changeCount }),
        " unsaved",
        " ",
        changeCount === 1 ? "change" : "changes",
        fileChanges > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground/80", children: [
          " ",
          "(",
          fileChanges,
          " document",
          fileChanges === 1 ? "" : "s",
          ")"
        ] })
      ] }),
      dirty && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "ghost",
          size: "sm",
          className: "h-9",
          onClick: onReview,
          disabled: changes.length === 0,
          "data-tip": changes.length === 0 ? "Only documents changed — press Save changes" : "Review every field before → after",
          children: "Review changes"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          className: "h-9",
          onClick: onDiscard,
          disabled: !dirty || saving,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "mr-1 size-3.5" }),
            " Discard"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          size: "sm",
          className: "h-9 min-w-[7.5rem]",
          onClick: onSave,
          disabled,
          "data-tip": blocking.length ? `Fix ${blocking.length} blocking issue${blocking.length === 1 ? "" : "s"} first — click an issue above to jump to it` : "Save changes (Ctrl/Cmd+S)",
          children: [
            saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-1 size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "mr-1 size-3.5" }),
            saving ? "Saving…" : dirty ? "Save changes" : "No changes"
          ]
        }
      ),
      canSaveAndNext && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "secondary",
          size: "sm",
          className: cn("h-9"),
          onClick: onSaveAndNext,
          disabled,
          "data-tip": "Save and move to the next facility in the filtered list",
          children: [
            "Save & next ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "ml-1 size-3.5" })
          ]
        }
      )
    ] })
  ] });
}
function ReviewChangesDialog({
  open,
  onOpenChange,
  changes,
  issues,
  statusNotice,
  onConfirm,
  saving
}) {
  const blocking = issues.filter((i) => i.severity === "blocking");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-h-[80vh] overflow-y-auto sm:max-w-xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Review changes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { children: [
        changes.length,
        " field",
        changes.length === 1 ? "" : "s",
        " will be saved in one transaction, with one audit entry per field."
      ] })
    ] }),
    statusNotice && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "rounded-lg border border-sky-300/60 bg-sky-50 px-3 py-2 text-sm text-sky-950", children: [
      "This will change Facility Current Status from",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: statusNotice.from || "-" }),
      " to ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: statusNotice.to }),
      "."
    ] }),
    blocking.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive", children: blocking.map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start gap-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-0.5 size-3.5 shrink-0" }),
      " ",
      i.message
    ] }, i.field + i.message)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60 text-left text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "py-1.5 font-medium", children: "Field" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "py-1.5 font-medium", children: "Before" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "py-1.5 font-medium", children: "After" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        changes.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/40 align-top", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1.5 pr-2 font-medium", children: c.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1.5 pr-2 text-muted-foreground line-through", children: c.from }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1.5 font-semibold text-foreground", children: c.to })
        ] }, c.field)),
        changes.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 3, className: "py-3 text-center text-muted-foreground", children: "No changes yet." }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Back to editing" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: onConfirm, disabled: blocking.length > 0 || saving || changes.length === 0, children: [
        saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-1 size-4 animate-spin" }) : null,
        "Save ",
        changes.length,
        " change",
        changes.length === 1 ? "" : "s"
      ] })
    ] })
  ] }) });
}

export { ReviewChangesDialog as R, SaveBar as S };
