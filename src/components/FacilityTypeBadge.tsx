import { cn } from "@/lib/utils";

/** Facility "Type" values are short codes (CHC, PHC, UPHC, HWC …). A plain
 *  grey string made them hard to scan, so every table renders them through
 *  this badge instead: a distinct, stable colour per type.
 *
 *  Common department types get a hand-picked hue; anything else is hashed
 *  into the same palette so a custom type still gets one consistent colour
 *  everywhere (master list, quick views, dashboard, reports). */

/** Known types → hue (oklch hue angle). */
const TYPE_HUES: Record<string, number> = {
  CHC: 268, // indigo
  PHC: 232, // sky
  UPHC: 292, // violet
  UHC: 200, // cyan
  "HWC HSC": 172, // teal
  HWC: 158, // emerald
  HSC: 148, // green
  UGPHC: 322, // fuchsia
  DHQH: 18, // rose
  SDH: 55, // amber
  AH: 95, // lime
  CH: 300, // purple
};

/** Remaining hues for unlisted types (hash-picked, so it changes nothing
 *  between renders). */
const FALLBACK_HUES = [268, 232, 292, 200, 172, 158, 322, 18, 55, 95, 300, 210, 250, 145];

function typeHue(type: string): number {
  const key = type.trim().toUpperCase();
  if (key in TYPE_HUES) return TYPE_HUES[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 9973;
  return FALLBACK_HUES[h % FALLBACK_HUES.length];
}

export function FacilityTypeBadge({
  type,
  className,
  showTip = true,
}: {
  type?: string | null;
  className?: string;
  /** Off inside the merged Facility cell, where the parent carries the full
   *  Name / Type / PHC / Block / NIN tooltip. */
  showTip?: boolean;
}) {
  if (!type || !type.trim()) {
    return <span className="text-muted-foreground">-</span>;
  }
  const hue = typeHue(type);
  return (
    <span
      {...(showTip ? { "data-tip": type } : {})}
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap tabular-nums",
        className,
      )}
      style={{
        background: `oklch(0.955 0.045 ${hue})`,
        color: `oklch(0.42 0.13 ${hue})`,
        boxShadow: `inset 0 0 0 1px oklch(0.62 0.12 ${hue} / 0.35)`,
      }}
    >
      {type}
    </span>
  );
}
