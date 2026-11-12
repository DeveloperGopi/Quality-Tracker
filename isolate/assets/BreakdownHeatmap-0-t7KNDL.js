import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports } from './icons-BxQpodNr.js';
import { L as Link } from './index-CBV6wOh8.js';
import { B as Badge } from './badge-Cc2gQHFR.js';
import { b as buildBlockTypeHeatmap } from './Dashboard-wpRlqHDT.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';
import './AppShell-CP099uvN.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';
import './StatusBadge-BPGGn135.js';
import './SegmentBar-BPZwoyP9.js';
import './select-qTILnHQg.js';
import './input-Cy2oZLur.js';
import './skeleton-D-jVDmpg.js';
import './dialog-BW3GEiPg.js';
import './tabs-siU4Pie8.js';
import './IaReminderBanner-CU62scGn.js';
import './today-D9v8Esj5.js';
import './dropdown-menu-N0nU9bdA.js';
import './vendor-exceljs-CqnmHTS6.js';
import './exportTable-BCt2u4fE.js';
import './fiscalYear-QbChygln.js';
import './reportColumns-DJVmn3gI.js';
import './masterFilter-DrauVhuN.js';
import './FilterDropdown-B_vJKp6C.js';
import './UniversalFilterBar-uuD2kW1Y.js';
import './FacilityCell-CI45DpPw.js';
import './FacilityTypeBadge-8G3otPEU.js';

const SCALE = [
  "oklch(0.94 0.04 165)",
  "oklch(0.87 0.07 165)",
  "oklch(0.78 0.1 165)",
  "oklch(0.68 0.12 165)",
  "oklch(0.55 0.13 165)"
];
function scaleIndex(ratePct) {
  if (ratePct < 12.5) return 0;
  if (ratePct < 37.5) return 1;
  if (ratePct < 62.5) return 2;
  if (ratePct < 87.5) return 3;
  return 4;
}
const HATCH = "repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 3px, transparent 3px, transparent 7px)";
function BreakdownHeatmap({
  facilities
}) {
  const hm = reactExports.useMemo(() => buildBlockTypeHeatmap(facilities), [facilities]);
  if (hm.cells.size === 0)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "py-8 text-center text-sm text-muted-foreground", children: "No facilities to map (the heatmap needs the card's facility rows)." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm", "data-testid": "breakdown-heatmap", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Certified %" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "low" }),
      SCALE.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-4 rounded", style: { background: c }, "aria-hidden": true }, c)),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "high" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "border-border text-muted-foreground", children: "n < 3 hatched" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid max-h-[26rem] max-w-full space-y-px overflow-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[36rem] border-collapse", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "sticky left-0 top-0 z-20 bg-background px-2 py-1.5 text-left text-xs font-medium text-muted-foreground", children: "Block" }),
        hm.typeKeys.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "th",
          {
            className: "sticky top-0 z-10 bg-background px-1.5 py-1.5 text-center text-xs font-medium",
            "data-tip": t,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "line-clamp-1 max-w-24", children: t })
          },
          t
        )),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "sticky top-0 z-10 bg-background px-1.5 py-1.5 text-center text-xs font-medium text-muted-foreground", children: "All" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: hm.blockKeys.map((b) => {
        const rt = hm.rowTotals.get(b);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "th",
            {
              scope: "row",
              className: "sticky left-0 z-10 bg-background px-2 py-1.5 text-left text-xs font-semibold",
              children: b
            }
          ),
          hm.typeKeys.map((t) => {
            const cell = hm.cells.get(`${b}\0${t}`);
            if (!cell)
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                "td",
                {
                  className: "px-1.5 py-1.5 text-center text-xs text-muted-foreground/50",
                  "aria-label": `${b}, ${t}: no facilities`,
                  children: "–"
                },
                t
              );
            const idx = scaleIndex(cell.ratePct);
            const tip = `${b}, ${t}: ${cell.holdCert} of ${cell.n} certified (${cell.ratePct}%)${cell.small ? " — small group (n<3)" : ""}`;
            return /* @__PURE__ */ jsxRuntimeExports.jsx(
              "td",
              {
                className: "px-1.5 py-1.5",
                style: {
                  background: SCALE[idx],
                  backgroundImage: cell.small ? HATCH : void 0,
                  fontWeight: idx >= 3 ? 600 : 400
                },
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Link,
                  {
                    to: `/facilities?block=${encodeURIComponent(b)}&type=${encodeURIComponent(t)}`,
                    className: "block text-center hover:underline",
                    "data-tip": tip,
                    "aria-label": `${b}, ${t}: ${cell.holdCert} of ${cell.n} certified, open list`,
                    children: [
                      cell.holdCert,
                      "/",
                      cell.n
                    ]
                  }
                )
              },
              t
            );
          }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-1.5 py-1.5 text-center text-xs font-semibold tabular-nums", children: [
            rt?.holdCert,
            "/",
            rt?.n
          ] })
        ] }, b);
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tfoot", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "sticky left-0 z-10 bg-background px-2 py-1.5 text-left text-xs text-muted-foreground", children: "All" }),
        hm.typeKeys.map((t) => {
          const ct = hm.colTotals.get(t);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "td",
            {
              className: "px-1.5 py-1.5 text-center text-xs font-semibold tabular-nums",
              children: [
                ct?.holdCert,
                "/",
                ct?.n
              ]
            },
            t
          );
        }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-1.5 py-1.5 text-center text-xs font-bold tabular-nums", children: [
          Math.round(hm.avgPct),
          "%"
        ] })
      ] }) })
    ] }) })
  ] });
}

export { BreakdownHeatmap as default };
