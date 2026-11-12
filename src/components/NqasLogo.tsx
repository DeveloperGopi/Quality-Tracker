/** NQAS Tracker brand mark — the official uploaded logo, shipped as
 *  transparent PNGs derived from the user's upload:
 *   • /logo-emblem.png — circular badge only (hospital + ring + checklist),
 *     used wherever space is tight (sidebar, nav, auth card, favicon).
 *   • /logo.png — full logo including the "NQAS Tracker" wordmark, for the
 *     landing hero where the text stays legible.
 *  Both are served untouched from /public at their native resolution. */
export function NqasLogo({
  className = "",
  variant = "emblem",
}: {
  className?: string;
  variant?: "emblem" | "full";
}) {
  return (
    <img
      src={variant === "full" ? "/logo.png" : "/logo-emblem.png"}
      alt="NQAS Tracker logo"
      role="img"
      className={`${className} select-none object-contain`}
      draggable={false}
    />
  );
}
