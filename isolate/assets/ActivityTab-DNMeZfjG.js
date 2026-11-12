import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, E as ExternalLink, X as History } from './icons-BxQpodNr.js';
import { l as useQuery, j as api, L as Link, c as cn } from './index-CBV6wOh8.js';
import { S as Skeleton } from './skeleton-D-jVDmpg.js';
import { aH as toDisplayStamp } from './AppShell-CP099uvN.js';
import { A as ACTIVITY_FILTERS, m as dayLabel, o as describeActivity, r as relativeTime, k as nowMs } from './profileConfig-2XTKYoy2.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';

function ActivityTab({ isAdmin }) {
  const [filter, setFilter] = reactExports.useState("all");
  const rows = useQuery(api.profile.myActivity, { filter });
  const now = nowMs();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "data-testid": "activity-tab",
      className: "rounded-xl border border-border/60 bg-card p-4",
      "aria-label": "Activity",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold", children: "Activity" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: "Your last 20 actions (read-only) — loaded when this tab opens." })
          ] }),
          isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Link,
            {
              to: "/admin/audit",
              "data-testid": "activity-full-audit",
              className: "inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3.5", "aria-hidden": "true" }),
                " View full audit"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 flex flex-wrap gap-1.5", role: "group", "aria-label": "Filter activity", children: ACTIVITY_FILTERS.map((f) => {
          const active = filter === f.value;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "aria-pressed": active,
              "data-testid": `activity-filter-${f.value}`,
              onClick: () => setFilter(f.value),
              className: cn(
                "inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-foreground/40"
              ),
              children: f.label
            },
            f.value
          );
        }) }),
        rows === void 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-2", "data-testid": "activity-skeleton", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-9 w-full" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-9 w-full" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-9 w-3/4" })
        ] }) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 flex items-center gap-2 text-sm text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-4", "aria-hidden": "true" }),
          filter === "all" ? "No recorded activity yet." : "Nothing in this category yet."
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 -mx-3 border-t border-border/40", "data-testid": "activity-list", children: (() => {
          let lastDay = "";
          return rows.map((row) => {
            const day = dayLabel(row.at, now);
            const showDay = day !== lastDay;
            lastDay = day;
            const entry = describeActivity(row);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { "data-testid": "activity-item", "data-category": entry.category, children: [
              showDay && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "border-b border-border/40 bg-muted/40 px-3 py-1 text-[11px] font-semibold text-muted-foreground", children: day }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-10 items-start gap-2 border-b border-border/40 px-3 py-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "w-20 shrink-0 pt-0.5 text-[11px] text-muted-foreground tabular-nums",
                    "data-tip": toDisplayStamp(row.at),
                    children: relativeTime(row.at, now)
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 text-[13px] leading-snug", children: [
                  entry.text,
                  row.facilityName && row.facilityId && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    " · ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Link,
                      {
                        to: `/facilities?facility=${row.facilityId}`,
                        className: "font-medium text-primary underline-offset-2 hover:underline",
                        children: row.facilityName
                      }
                    )
                  ] })
                ] })
              ] })
            ] }, row.id);
          });
        })() })
      ]
    }
  );
}

export { ActivityTab as default };
