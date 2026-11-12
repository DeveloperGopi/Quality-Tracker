import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports } from './icons-BxQpodNr.js';
import { b as useNavigate, c as cn, L as Link } from './index-CBV6wOh8.js';
import { F as FacilityTypeBadge } from './FacilityTypeBadge-8G3otPEU.js';
import { ca as useFacilityStyle } from './AppShell-CP099uvN.js';

function facilityTypeLabel(value) {
  return String(value ?? "").trim() || "-";
}
function samePlace(a, b) {
  const clean = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  return clean(a) !== "" && clean(a) === clean(b);
}
function Highlight({ text, query }) {
  const q = query.trim().toLowerCase();
  if (!q) return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: text });
  const lower = text.toLowerCase();
  const parts = [];
  let at = 0;
  while (at < text.length) {
    const found = lower.indexOf(q, at);
    if (found < 0) {
      parts.push({ hit: false, text: text.slice(at) });
      break;
    }
    if (found > at) parts.push({ hit: false, text: text.slice(at, found) });
    parts.push({ hit: true, text: text.slice(found, found + q.length) });
    at = found + q.length;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: parts.map(
    (part, index) => part.hit ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "mark",
      {
        className: "rounded-sm bg-amber-200/80 font-semibold text-inherit",
        children: part.text
      },
      index
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: part.text }, index)
  ) });
}
function FacilityCellView({
  facility,
  query = "",
  onOpen,
  compact = false,
  style: styleProp,
  className,
  nameAs = "span",
  nameId
}) {
  const navigate = useNavigate();
  const preferred = useFacilityStyle();
  const style = styleProp ?? (compact && preferred === "twoLine" ? "oneLine" : preferred);
  const name = facility.name?.trim() || "-";
  const type = facilityTypeLabel(facility.facilityType);
  const block = (facility.block ?? "").trim() || "-";
  const phc = (facility.phc ?? "").trim() || "-";
  const nin = (facility.ninNumber ?? "").trim() || "-";
  const isPhcItself = ["PHC", "CHC", "UPHC", "UGPHC"].includes(type.toUpperCase());
  const hidePhc = phc !== "-" && (isPhcItself || samePlace(phc, name));
  const tip = [
    `Name: ${name}`,
    `Type: ${type}`,
    `PHC: ${phc}`,
    `Block: ${block}`,
    `NIN: ${nin}`
  ].join(" · ");
  const id = String(facility._id ?? facility.id ?? "");
  const NameTag = nameAs === "h2" ? "h2" : "span";
  const secondary = /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: cn(
        "flex min-w-0 items-center gap-1 whitespace-nowrap text-muted-foreground",
        style === "oneLine" ? "flex-1" : "w-full"
      ),
      style: { fontSize: 12.5, lineHeight: 1.3 },
      children: [
        type === "-" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0", children: "-" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(FacilityTypeBadge, { type, showTip: false, className: "shrink-0" }),
        !hidePhc && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-muted-foreground/60", "aria-hidden": true, children: "·" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Highlight, { text: `PHC ${phc}`, query }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-muted-foreground/60", "aria-hidden": true, children: "·" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Highlight, { text: `Block ${block}`, query }) })
      ]
    }
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Link,
    {
      to: id ? `/facilities/${id}` : "/facilities",
      "data-tip": tip,
      "data-facility-style": style,
      style: { backgroundColor: "var(--row-bg, transparent)" },
      "aria-label": tip,
      onClick: (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        e.stopPropagation();
        if (onOpen) onOpen();
        else if (id) navigate(`/facilities?facility=${encodeURIComponent(id)}&section=overview`);
      },
      className: cn(
        "flex min-h-9 min-w-0 items-center overflow-hidden text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        style === "oneLine" ? "flex-row gap-1.5" : "flex-col items-start justify-center gap-0",
        className
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          NameTag,
          {
            id: nameId,
            className: cn(
              "block max-w-full truncate font-semibold",
              style === "oneLine" && "min-w-0 shrink"
            ),
            style: { fontSize: nameAs === "h2" ? 18 : 14, lineHeight: 1.25 },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Highlight, { text: name, query })
          }
        ),
        style === "oneLine" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-muted-foreground", "aria-hidden": true, children: "·" }),
        secondary
      ]
    }
  );
}
const FacilityCell = reactExports.memo(FacilityCellView);

export { FacilityCell as F };
