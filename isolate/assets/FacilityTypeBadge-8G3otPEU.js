import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { c as cn } from './index-CBV6wOh8.js';

const TYPE_HUES = {
  CHC: 268,
  // indigo
  PHC: 232,
  // sky
  UPHC: 292,
  // violet
  UHC: 200,
  // cyan
  "HWC HSC": 172,
  // teal
  HWC: 158,
  // emerald
  HSC: 148,
  // green
  UGPHC: 322,
  // fuchsia
  DHQH: 18,
  // rose
  SDH: 55,
  // amber
  AH: 95,
  // lime
  CH: 300
  // purple
};
const FALLBACK_HUES = [268, 232, 292, 200, 172, 158, 322, 18, 55, 95, 300, 210, 250, 145];
function typeHue(type) {
  const key = type.trim().toUpperCase();
  if (key in TYPE_HUES) return TYPE_HUES[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 9973;
  return FALLBACK_HUES[h % FALLBACK_HUES.length];
}
function FacilityTypeBadge({
  type,
  className,
  showTip = true
}) {
  if (!type || !type.trim()) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "-" });
  }
  const hue = typeHue(type);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      ...showTip ? { "data-tip": type } : {},
      className: cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap tabular-nums",
        className
      ),
      style: {
        background: `oklch(0.955 0.045 ${hue})`,
        color: `oklch(0.42 0.13 ${hue})`,
        boxShadow: `inset 0 0 0 1px oklch(0.62 0.12 ${hue} / 0.35)`
      },
      children: type
    }
  );
}

export { FacilityTypeBadge as F };
