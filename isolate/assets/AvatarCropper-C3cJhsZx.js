import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, a3 as X, L as LoaderCircle, c4 as ZoomIn } from './icons-BxQpodNr.js';
import { B as Button } from './index-CBV6wOh8.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';

const VIEW = 280;
const OUTPUT = 256;
function AvatarCropper({
  src,
  busy,
  onCancel,
  onConfirm
}) {
  const [img, setImg] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [scale, setScale] = reactExports.useState(1);
  const [offset, setOffset] = reactExports.useState({ x: 0, y: 0 });
  const dragRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => setError("This file could not be opened as an image");
    image.src = src;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);
  const geometry = img ? (() => {
    const base = Math.min(img.width, img.height);
    const side = base / scale;
    const maxOffset = (img.width - side) / 2;
    const maxOffsetY = (img.height - side) / 2;
    const ox = Math.max(-maxOffset, Math.min(maxOffset, offset.x));
    const oy = Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y));
    const sx = (img.width - side) / 2 + ox;
    const sy = (img.height - side) / 2 + oy;
    const ratio = VIEW / side;
    return { side, sx, sy, ratio, width: img.width * ratio, height: img.height * ratio };
  })() : null;
  const onPointerDown = (e) => {
    if (!geometry) return;
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag || !geometry) return;
    const dx = (e.clientX - drag.x) / geometry.ratio;
    const dy = (e.clientY - drag.y) / geometry.ratio;
    setOffset({ x: drag.ox + dx, y: drag.oy + dy });
  };
  const endDrag = () => {
    dragRef.current = null;
  };
  const usePhoto = reactExports.useCallback(() => {
    if (!img || !geometry) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("This browser cannot process the photo");
      return;
    }
    ctx.drawImage(img, geometry.sx, geometry.sy, geometry.side, geometry.side, 0, 0, OUTPUT, OUTPUT);
    onConfirm(canvas.toDataURL("image/webp", 0.85));
  }, [img, geometry, onConfirm]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Crop your photo",
      "data-testid": "avatar-cropper",
      className: "fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4",
      onKeyDown: (e) => {
        if (e.key === "Escape" && !busy) onCancel();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 shadow-lg", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold", children: "Crop your photo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "aria-label": "Close",
              "data-testid": "avatar-cropper-cancel",
              disabled: busy,
              onClick: onCancel,
              className: "rounded-md p-1.5 text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
            }
          )
        ] }),
        error ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-destructive", role: "alert", children: error }) : !img || !geometry ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 flex items-center gap-2 text-sm text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin", "aria-hidden": "true" }),
          " Opening the photo…"
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              "data-testid": "avatar-cropper-viewport",
              className: "mt-3 overflow-hidden rounded-full border border-border/60 select-none",
              style: { width: VIEW, height: VIEW, maxWidth: "100%", touchAction: "none", cursor: "grab" },
              onPointerDown,
              onPointerMove,
              onPointerUp: endDrag,
              onPointerCancel: endDrag,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "img",
                {
                  src,
                  alt: "",
                  draggable: false,
                  style: {
                    width: geometry.width,
                    height: geometry.height,
                    marginLeft: -geometry.sx * geometry.ratio,
                    marginTop: -geometry.sy * geometry.ratio,
                    maxWidth: "none"
                  }
                }
              )
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "mt-3 flex items-center gap-2 text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomIn, { className: "size-4", "aria-hidden": "true" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: "Zoom" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "range",
                min: 1,
                max: 3,
                step: 0.05,
                value: scale,
                "data-testid": "avatar-cropper-zoom",
                onChange: (e) => {
                  setScale(Number(e.target.value));
                },
                className: "flex-1"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "w-10 text-right tabular-nums", children: [
              scale.toFixed(1),
              "×"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[11px] text-muted-foreground", children: "Drag to reposition. Saved as a 256 px square, stored with your account — never a public link." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex justify-end gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", variant: "ghost", size: "sm", disabled: busy, onClick: onCancel, children: "Cancel" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                size: "sm",
                "data-testid": "avatar-cropper-use",
                disabled: busy,
                onClick: usePhoto,
                children: busy ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }),
                  " Saving…"
                ] }) : "Use this photo"
              }
            )
          ] })
        ] })
      ] })
    }
  );
}

export { AvatarCropper as default };
