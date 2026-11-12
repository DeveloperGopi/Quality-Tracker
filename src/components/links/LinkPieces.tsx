import {
  Archive,
  Check,
  CheckCircle2,
  Circle,
  CircleDot,
  Copy,
  FileSpreadsheet,
  FileText,
  FileType2,
  FormInput,
  Globe,
  HardDrive,
  Link2,
  PauseCircle,
  Star,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  LINK_STATUS_TONE_CLASS,
  dueStateLabel,
  linkColour,
  linkStatusDef,
  relativeUpdated,
  safeLinkUrl,
  type DueResult,
  type LinkStatusDef,
  type LinkStatusTone,
  type LinksConfig,
} from "@/lib/links";
import { formatLinkDate } from "@/lib/links";

const TYPE_ICON: Record<string, { icon: LucideIcon; className: string }> = {
  sheet: { icon: FileSpreadsheet, className: "text-emerald-700" },
  form: { icon: FormInput, className: "text-violet-700" },
  doc: { icon: FileText, className: "text-sky-700" },
  pdf: { icon: FileType2, className: "text-rose-700" },
  drive: { icon: HardDrive, className: "text-amber-700" },
  video: { icon: Youtube, className: "text-red-700" },
  web: { icon: Globe, className: "text-slate-600" },
  other: { icon: Link2, className: "text-slate-600" },
};

export function linkTypeIcon(type: string) {
  return TYPE_ICON[type] ?? TYPE_ICON.other;
}

const STATUS_ICON: Record<string, LucideIcon> = {
  CircleDot,
  CheckCircle2,
  PauseCircle,
  Archive,
  Circle,
};

export function CategoryChip({
  name,
  colour,
  className,
}: {
  name: string;
  colour: string;
  className?: string;
}) {
  const meta = linkColour(colour);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        meta.chip,
        className,
      )}
      data-tip={`${name} · ${meta.label}`}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} aria-hidden />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function StatusPill({
  status,
  config,
  className,
}: {
  status: string;
  config: LinksConfig;
  className?: string;
}) {
  const def: LinkStatusDef = linkStatusDef(config, status);
  const Icon = STATUS_ICON[def.icon] ?? CircleDot;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        LINK_STATUS_TONE_CLASS[def.tone as LinkStatusTone],
        className,
      )}
      role="status"
      aria-label={`Status: ${def.name}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {def.name}
    </span>
  );
}

export function DueChip({
  due,
  config,
  className,
  showNoDue = true,
}: {
  due: DueResult;
  config: LinksConfig;
  className?: string;
  showNoDue?: boolean;
}) {
  if (due.state === "none" && !showNoDue) return null;
  const tone =
    due.state === "overdue" || due.state === "never"
      ? "border-rose-300/80 bg-rose-50 text-rose-900"
      : due.state === "due-soon"
        ? "border-amber-300/80 bg-amber-50 text-amber-900"
        : due.state === "up-to-date"
          ? "border-emerald-300/70 bg-emerald-50 text-emerald-900"
          : "border-border/70 bg-muted/40 text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tone,
        className,
      )}
      data-tip={
        due.nextDue
          ? `Next due ${formatLinkDate(due.nextDue)} · ${dueStateLabel(due, config)}`
          : dueStateLabel(due, config)
      }
    >
      <span className="truncate">{dueStateLabel(due, config)}</span>
    </span>
  );
}

export function UpdatedCell({
  iso,
  today,
  onMark,
  canEdit,
}: {
  iso: string | null;
  today: string;
  onMark?: () => void;
  canEdit?: boolean;
}) {
  return (
    <div className="group/date flex min-w-0 flex-col">
      <span className="text-xs font-medium tabular-nums text-foreground">
        {iso ? formatLinkDate(iso) : "-"}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">{relativeUpdated(iso, today)}</span>
        {canEdit && onMark && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMark();
            }}
            className="hidden text-[10px] font-semibold text-primary underline-offset-2 hover:underline focus-visible:inline group-hover/date:inline"
          >
            Mark updated
          </button>
        )}
      </span>
    </div>
  );
}

export function LinkChip({
  link,
  onCopied,
  className,
  compact,
}: {
  link: {
    label: string;
    url: string;
    type: string;
    /** Optional 24-hour checker result: ok | not_found | timeout | not_checked. */
    checkStatus?: string | null;
  };
  onCopied?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { icon: Icon, className: iconClass } = linkTypeIcon(link.type);
  const domain = (() => {
    try {
      return new URL(link.url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  const label = link.label || domain || "Link";
  const shown = [...label].length > 28 ? `${[...label].slice(0, 27).join("")}…` : label;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* Clipboard access can be denied; the link itself still works. */
    }
  };
  return (
    <span
      className={cn(
        "group/link inline-flex min-h-7 max-w-full items-center gap-1 rounded-md border border-border/60 bg-background/80 pr-0.5 pl-1.5 text-[11px]",
        compact && "min-h-11 w-full",
        className,
      )}
      data-tip={`${label}\n${domain}`}
    >
      <Icon className={cn("size-3.5 shrink-0", iconClass)} aria-hidden />
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 max-w-[10.5rem] truncate font-medium text-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {shown}
      </a>
      {link.checkStatus && (
        <span
          className={cn(
            "ml-0.5 shrink-0 rounded border px-1 py-px text-[9px] font-semibold",
            link.checkStatus === "ok" && "border-emerald-300/70 bg-emerald-50 text-emerald-800",
            link.checkStatus === "not_found" && "border-rose-300/70 bg-rose-50 text-rose-800",
            link.checkStatus === "timeout" && "border-amber-300/70 bg-amber-50 text-amber-800",
            link.checkStatus !== "ok" &&
              link.checkStatus !== "not_found" &&
              link.checkStatus !== "timeout" &&
              "border-border/60 bg-muted/40 text-muted-foreground",
          )}
        >
          {link.checkStatus === "ok" ? "OK" : link.checkStatus === "not_found" ? "Not found" : link.checkStatus === "timeout" ? "Timeout" : "Not checked"}
        </span>
      )}
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={(event) => {
          event.stopPropagation();
          void copy();
        }}
        className="ml-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none group-hover/link:opacity-100"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </button>
    </span>
  );
}

export function PinStar({
  pinned,
  onToggle,
  canEdit,
  size = "sm",
}: {
  pinned: boolean;
  onToggle?: () => void;
  canEdit?: boolean;
  size?: "sm" | "md";
}) {
  const Icon = Star;
  return (
    <button
      type="button"
      aria-label={pinned ? "Unpin report" : "Pin report"}
      aria-pressed={pinned}
      disabled={!canEdit}
      onClick={(event) => {
        event.stopPropagation();
        onToggle?.();
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        size === "sm" ? "size-6" : "size-8",
        pinned ? "text-amber-500" : "text-muted-foreground/60 hover:text-amber-500",
        !canEdit && "cursor-default",
      )}
      data-tip={pinned ? "Pinned" : "Pin to the top"}
    >
      <Icon className={cn(size === "sm" ? "size-3.5" : "size-4", pinned && "fill-current")} aria-hidden />
    </button>
  );
}

export function OpenLinkButton({
  link,
  className,
}: {
  link?: { label: string; url: string; type: string };
  className?: string;
}) {
  if (!link) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)} data-tip="Add a primary link to open">
        No link
      </span>
    );
  }
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-primary underline-offset-2 hover:bg-primary/10 hover:underline",
        className,
      )}
      data-tip={`Open ${safeLinkUrl(link.url)}`}
    >
      Open
    </a>
  );
}
