import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, C as CircleCheck, N as CalendarClock, a3 as X } from './icons-BxQpodNr.js';
import { l as useQuery, j as api, m as useMutation, B as Button, L as Link, t as toast } from './index-CBV6wOh8.js';
import { t as todayLocalIso } from './today-D9v8Esj5.js';
import { aO as iaReminderStatus, av as currentIaQuarter, aw as lastQuarters, ax as formatFyQuarter } from './AppShell-CP099uvN.js';

const DISMISS_KEY = "nqas.ia.banner.dismiss";
function readDismissal() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.key || typeof parsed.at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}
const TONE = {
  missing: "border-amber-300/60 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10",
  partial: "border-amber-300/60 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10",
  complete: "border-emerald-300/60 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10"
};
function IaReminderBanner({ className = "" }) {
  const ctx = useQuery(api.ia.getIaReminderContext, {});
  const markFinal = useMutation(api.ia.markIaQuarterFinal);
  const [dismissed, setDismissed] = reactExports.useState(() => readDismissal());
  const [busy, setBusy] = reactExports.useState(false);
  if (!ctx) return null;
  const status = iaReminderStatus(todayLocalIso(), ctx.coverage, {
    graceDays: ctx.graceDays,
    threshold: ctx.threshold,
    totalFacilities: ctx.totalFacilities
  });
  const dismiss = (key2) => {
    const next = { key: key2, at: Date.now() };
    try {
      window.localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
    }
    setDismissed(next);
  };
  const finalise = async (fy, q, label) => {
    setBusy(true);
    try {
      const res = await markFinal({ fy, quarter: q, lock: false });
      toast.success(`${label} marked final`, {
        description: `${res.rows} facility rows are now final.`
      });
    } catch (err) {
      toast.error("Could not mark the quarter final", {
        description: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setBusy(false);
    }
  };
  if (!status.dueLabel) {
    const cand = status.finalCandidate;
    if (!cand) return null;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: `${className} mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-500/40 dark:bg-emerald-500/10`,
        role: "status",
        "data-testid": "ia-coverage-success",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "size-4 shrink-0 text-emerald-700 dark:text-emerald-300" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
              cand.label,
              ":"
            ] }),
            " ",
            cand.reported,
            " of ",
            cand.total,
            " facilities reported ✓",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 rounded-full border border-emerald-400/50 px-1.5 py-0.5 text-[11px] font-medium", children: "provisional" })
          ] }),
          ctx.canFinalise && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "sm",
              variant: "outline",
              className: "shrink-0",
              disabled: busy,
              onClick: () => void finalise(cand.fy, cand.q, cand.label),
              children: busy ? "Saving…" : `Mark ${cand.label.split(" ")[0]} final`
            }
          )
        ]
      }
    );
  }
  const key = `${status.dueFy}|Q${status.dueQ}|${status.reported}/${status.total}`;
  if (dismissed?.key === key) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `${className} mb-4 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${TONE[status.state ?? "missing"]}`,
      role: "status",
      "data-testid": "ia-reminder-banner",
      "data-quarter": status.dueLabel,
      "data-state": status.state,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarClock, { className: "size-4 shrink-0 text-amber-700 dark:text-amber-300" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1", "data-testid": "ia-reminder-message", children: status.message }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, size: "sm", variant: "outline", className: "shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Link,
          {
            to: `/bulk-import/internal-assessment?fy=${encodeURIComponent(
              status.dueFy ?? ""
            )}&q=${status.dueQ ?? ""}`,
            children: "Import IA scores"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            "aria-label": "Dismiss this reminder for 24 hours",
            "data-testid": "ia-banner-dismiss",
            onClick: () => dismiss(key),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5", "aria-hidden": "true" })
          }
        )
      ]
    }
  );
}
function IaMissingQuartersHint({ className = "" }) {
  const ctx = useQuery(api.ia.getIaReminderContext, {});
  if (!ctx) return null;
  const now = currentIaQuarter(todayLocalIso());
  const missing = lastQuarters(now.fy, now.q, 4).filter((period) => {
    const row = ctx.coverage.find((c) => c.fy === period.fy && c.q === period.q);
    return !row || row.reported === 0;
  });
  if (!missing.length) return null;
  const labels = missing.map((p) => formatFyQuarter(p.fy, p.q));
  const names = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  const total = ctx.totalFacilities;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "p",
    {
      className: `${className} flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200`,
      "data-testid": "ia-missing-quarters",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Import history:" }),
        " ",
        names,
        " missing for ",
        total,
        " facilit",
        total === 1 ? "y" : "ies",
        " — a facility sheet showing “Not reported” for those quarters has no imported row."
      ]
    }
  );
}
function IaCoverageLine({ className = "" }) {
  const ctx = useQuery(api.ia.getIaReminderContext, {});
  if (!ctx) return null;
  const status = iaReminderStatus(todayLocalIso(), ctx.coverage, {
    graceDays: ctx.graceDays,
    threshold: ctx.threshold,
    totalFacilities: ctx.totalFacilities
  });
  const label = status.dueLabel ?? status.lastImportedLabel;
  if (!label) return null;
  const latest = ctx.coverage.find(
    (c) => c.fy === status.lastImportedFy && c.q === status.lastImportedQ
  );
  const reported = status.dueLabel ? status.reported : latest?.reported ?? 0;
  const total = status.dueLabel ? status.total : latest?.total ?? ctx.totalFacilities;
  const complete = reported > 0 && reported >= total * ctx.threshold / 100;
  const provisional = status.dueLabel ? false : status.latestProvisional;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "p",
    {
      className: `${className} flex flex-wrap items-center gap-1.5 text-sm ${complete ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`,
      "data-testid": "ia-coverage-line",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
          label,
          ":"
        ] }),
        " ",
        reported,
        " of ",
        total,
        " facilities reported",
        complete ? " ✓" : "",
        provisional && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-amber-400/60 px-1.5 py-0.5 text-[11px] font-medium", children: "provisional" })
      ]
    }
  );
}

export { IaReminderBanner as I, IaCoverageLine as a, IaMissingQuartersHint as b };
