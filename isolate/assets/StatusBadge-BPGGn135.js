import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { c as cn } from './index-CBV6wOh8.js';

const toneClasses = {
  green: "border-emerald-300/70 bg-emerald-100 text-emerald-800",
  amber: "border-amber-300/70 bg-amber-100 text-amber-800",
  red: "border-rose-300/70 bg-rose-100 text-rose-800",
  blue: "border-sky-300/70 bg-sky-100 text-sky-800",
  slate: "border-slate-300/70 bg-slate-100 text-slate-700",
  violet: "border-violet-300/70 bg-violet-100 text-violet-800",
  plain: "border-transparent bg-transparent text-muted-foreground"
};
function statusToneOf(status) {
  const value = status.trim().toLowerCase();
  if (!value) return "plain";
  if (/overdue|expired|expiring/.test(value)) return "red";
  if (/condition|deferred/.test(value)) return "amber";
  if (/not eligible|not started|not obtained|not applicable|no cycle|pending/.test(value))
    return "plain";
  if (/eligible/.test(value)) return "blue";
  if (/certified|quality certified/.test(value)) return "green";
  if (/valid|done|uploaded|completed/.test(value)) return "green";
  if (/due|scheduled/.test(value)) return "blue";
  return "slate";
}
function StatusBadge({
  status,
  className,
  compact = false
}) {
  const text = status.trim() || "-";
  const tone = statusToneOf(text);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      "data-tip": text,
      title: text,
      className: cn(
        "inline-flex min-w-0 max-w-full items-center justify-center rounded-full border text-center font-medium break-words whitespace-normal",
        compact ? "px-1.5 py-0 text-[10px] leading-[1.15]" : "px-2 py-0.5 text-[11px] leading-[1.2]",
        toneClasses[tone],
        className
      ),
      children: text
    }
  );
}

export { StatusBadge as S };
