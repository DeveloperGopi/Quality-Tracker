/**
 * AVATAR CROPPER — lazy modal (code-split with the rest of the photo flow).
 *
 * Pick a square region of the chosen photo (drag to pan, slider to zoom) and
 * export it as a 256 px WebP data URL — the same output the old centre-crop
 * produced, but with control over what is inside the square. Nothing is
 * uploaded until the page's "Use this photo" action succeeds.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, X, ZoomIn } from "lucide-react";

import { Button } from "@/components/ui/button";

const VIEW = 280; // square viewport, px
const OUTPUT = 256; // exported size, px

export default function AvatarCropper({
  src,
  busy,
  onCancel,
  onConfirm,
}: {
  src: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => setError("This file could not be opened as an image");
    image.src = src;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  const geometry = img
    ? (() => {
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
      })()
    : null;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!geometry) return;
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !geometry) return;
    const dx = (e.clientX - drag.x) / geometry.ratio;
    const dy = (e.clientY - drag.y) / geometry.ratio;
    setOffset({ x: drag.ox + dx, y: drag.oy + dy });
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const usePhoto = useCallback(() => {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crop your photo"
      data-testid="avatar-cropper"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !busy) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Crop your photo</h2>
          <button
            type="button"
            aria-label="Close"
            data-testid="avatar-cropper-cancel"
            disabled={busy}
            onClick={onCancel}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" />
          </button>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : !img || !geometry ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Opening the photo…
          </p>
        ) : (
          <>
            <div
              data-testid="avatar-cropper-viewport"
              className="mt-3 overflow-hidden rounded-full border border-border/60 select-none"
              style={{ width: VIEW, height: VIEW, maxWidth: "100%", touchAction: "none", cursor: "grab" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <img
                src={src}
                alt=""
                draggable={false}
                style={{
                  width: geometry.width,
                  height: geometry.height,
                  marginLeft: -geometry.sx * geometry.ratio,
                  marginTop: -geometry.sy * geometry.ratio,
                  maxWidth: "none",
                }}
              />
            </div>

            <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ZoomIn className="size-4" aria-hidden="true" />
              <span className="sr-only">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={scale}
                data-testid="avatar-cropper-zoom"
                onChange={(e) => {
                  setScale(Number(e.target.value));
                }}
                className="flex-1"
              />
              <span className="w-10 text-right tabular-nums">{scale.toFixed(1)}×</span>
            </label>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Drag to reposition. Saved as a 256 px square, stored with your account — never a
              public link.
            </p>

            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                data-testid="avatar-cropper-use"
                disabled={busy}
                onClick={usePhoto}
              >
                {busy ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Saving…
                  </>
                ) : (
                  "Use this photo"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
