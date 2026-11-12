import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports } from './icons-BxQpodNr.js';
import { B as BUCKET_ORDER, a as BUCKET_BY_KEY } from './Dashboard-wpRlqHDT.js';
import './index-CBV6wOh8.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';
import './AppShell-CP099uvN.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';
import './StatusBadge-BPGGn135.js';
import './SegmentBar-BPZwoyP9.js';
import './select-qTILnHQg.js';
import './badge-Cc2gQHFR.js';
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

const W = 1e3;
const H = 540;
const PAD = { top: 24, bottom: 64, left: 8 };
function SizeShareChart({
  breakdown: bd,
  mode
}) {
  const rows = reactExports.useMemo(
    () => [...bd.rows].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)).filter((r) => r.n > 0),
    [bd]
  );
  const [focus, setFocus] = reactExports.useState(null);
  const total = rows.reduce((a, r) => a + r.n, 0);
  const plotW = W - PAD.left * 2;
  const plotH = H - PAD.top - PAD.bottom;
  let x = PAD.left;
  const bands = rows.map((r) => {
    const w = r.n / (total || 1) * plotW;
    const band = { r, x, w };
    x += w;
    return band;
  });
  if (rows.length === 0)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "py-8 text-center text-sm text-muted-foreground", children: "No facilities to chart." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("figure", { className: "w-full", "data-testid": "size-share-chart", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "svg",
      {
        viewBox: `0 0 ${W} ${H}`,
        role: "img",
        "aria-label": `Size and share chart: ${total} facilities across ${rows.length} groups; width is the group size, height splits into the status buckets`,
        className: "h-auto w-full",
        children: bands.map(({ r, x: bx, w }) => {
          let y = PAD.top;
          const segs = BUCKET_ORDER.filter((k) => r.buckets[k] > 0).map((k) => {
            const h = r.buckets[k] / r.n * plotH;
            const seg = { k, y, h };
            y += h;
            return seg;
          });
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
            segs.map(({ k, y: sy, h: sh }) => {
              const b = BUCKET_BY_KEY[k];
              const active = focus === null || focus.startsWith(r.key);
              const label = r.n / total >= 0.06 || mode === "share" && sh > plotH * 0.14;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "rect",
                  {
                    x: bx,
                    y: sy,
                    width: Math.max(1, w),
                    height: Math.max(1, sh),
                    fill: b.colour,
                    fillOpacity: active ? 1 : 0.35,
                    stroke: "#fff",
                    strokeWidth: 1,
                    tabIndex: 0,
                    onFocus: () => setFocus(`${r.key}:${k}`),
                    onBlur: () => setFocus(null),
                    onMouseEnter: () => setFocus(`${r.key}:${k}`),
                    onMouseLeave: () => setFocus(null),
                    "aria-label": `${r.label}, ${b.label}: ${r.buckets[k]} facilities (${Math.round(r.buckets[k] / r.n * 100)}%)`,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("title", { children: `${r.label} — ${b.label}: ${r.buckets[k]} of ${r.n} (${Math.round(r.buckets[k] / r.n * 100)}%)` })
                  },
                  k
                ),
                label && sh > plotH * 0.07 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "text",
                  {
                    x: bx + w / 2,
                    y: sy + sh / 2 + 4,
                    textAnchor: "middle",
                    fontSize: 12,
                    fontWeight: 600,
                    fill: "rgba(255,255,255,0.95)",
                    pointerEvents: "none",
                    children: r.buckets[k]
                  }
                )
              ] });
            }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "text",
              {
                x: bx + w / 2,
                y: H - PAD.bottom + 18,
                textAnchor: "middle",
                fontSize: 12,
                fontWeight: 600,
                children: r.label.length > 12 ? `${r.label.slice(0, 11)}…` : r.label
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "text",
              {
                x: bx + w / 2,
                y: H - PAD.bottom + 36,
                textAnchor: "middle",
                fontSize: 12,
                fill: "currentColor",
                opacity: 0.55,
                children: r.n
              }
            )
          ] }, r.key);
        })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("figcaption", { className: "mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted-foreground", children: [
      BUCKET_ORDER.filter((k) => bd.grand.buckets[k] > 0).map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "size-3 rounded",
            style: { background: BUCKET_BY_KEY[k].colour },
            "aria-hidden": true
          }
        ),
        BUCKET_BY_KEY[k].label
      ] }, k)),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Bar width = facilities in the group · height = shares." })
    ] })
  ] });
}

export { SizeShareChart as default };
