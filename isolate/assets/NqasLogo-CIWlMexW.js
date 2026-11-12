import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';

function NqasLogo({
  className = "",
  variant = "emblem"
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "img",
    {
      src: variant === "full" ? "/logo.png" : "/logo-emblem.png",
      alt: "NQAS Tracker logo",
      role: "img",
      className: `${className} select-none object-contain`,
      draggable: false
    }
  );
}

export { NqasLogo as N };
