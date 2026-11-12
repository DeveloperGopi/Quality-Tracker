/** The one-step draft row and its suggestion chips. Nothing is saved until
 *  the editor presses Add; unmatched details stay visibly “Needs details”. */
import { Check, Link2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CategoryChip,
  StatusPill,
  linkTypeIcon,
} from "@/components/links/LinkPieces";
import type { LinkCategory, LinkOwner } from "@/components/links/types";
import {
  LINK_LEVELS,
  LINK_TYPE_LABEL,
  frequencyLabel,
  type LinksConfig,
} from "@/lib/links";
import type { QuickSuggestions } from "@/lib/linksQuickAdd";
import { cn } from "@/lib/utils";

export type LinkQuickDraft = {
  url: string;
  title: string;
  type: string;
  categoryId: string;
  ownerId: string;
  level: string;
  frequency: string;
  lastUpdated: string;
  status: string;
};

export function QuickAddRow({
  draft,
  suggestions,
  categories,
  owners,
  config,
  saving,
  onChange,
  onApplyAll,
  onSave,
  onCancel,
}: {
  draft: LinkQuickDraft;
  suggestions: QuickSuggestions;
  categories: LinkCategory[];
  owners: LinkOwner[];
  config: LinksConfig;
  saving: boolean;
  onChange: (patch: Partial<LinkQuickDraft>) => void;
  onApplyAll: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const category = categories.find((c) => c.id === draft.categoryId);
  const owner = owners.find((o) => o.id === draft.ownerId);
  const TypeIcon = linkTypeIcon(draft.type).icon;
  const detailsMissing = !draft.categoryId || !draft.ownerId;
  const hints: { key: keyof LinkQuickDraft; label: string; value: string }[] = [];
  if (suggestions.categoryName && suggestions.categoryName !== category?.name) {
    hints.push({ key: "categoryId", label: `Category: ${suggestions.categoryName}`, value: categories.find((c) => c.name === suggestions.categoryName)?.id ?? "" });
  }
  if (suggestions.ownerName && suggestions.ownerName !== owner?.name) {
    hints.push({ key: "ownerId", label: `Owner: ${suggestions.ownerName}`, value: owners.find((o) => o.name === suggestions.ownerName)?.id ?? "" });
  }
  if (suggestions.frequency && suggestions.frequency !== draft.frequency) {
    hints.push({ key: "frequency", label: frequencyLabel(config, suggestions.frequency), value: suggestions.frequency });
  }
  if (suggestions.level && suggestions.level !== draft.level) {
    hints.push({ key: "level", label: `Level: ${suggestions.level}`, value: suggestions.level });
  }

  return (
    <div
      className="glass rounded-xl border border-primary/30 p-3 shadow-sm"
      data-testid="links-quick-add"
    >
      <div className="flex flex-wrap items-start gap-2">
        <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <Sparkles className="size-3" /> Draft
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <TypeIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={draft.title}
              onChange={(event) => onChange({ title: event.target.value })}
              aria-label="Draft report name"
              placeholder="Report name — page title, pasted text or URL words"
              className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-bold outline-none focus-visible:border-input"
            />
            <Badge variant="outline" className="shrink-0 text-[9px] font-normal">
              {LINK_TYPE_LABEL[draft.type as keyof typeof LINK_TYPE_LABEL] ?? draft.type}
            </Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 px-1">
            <Link2 className="size-3 shrink-0 text-muted-foreground" />
            <input
              value={draft.url}
              onChange={(event) => onChange({ url: event.target.value })}
              aria-label="Draft link URL"
              placeholder="Paste the URL here"
              className="min-w-0 flex-1 rounded border border-transparent bg-transparent text-[11px] text-muted-foreground outline-none focus-visible:border-input focus-visible:text-foreground"
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" className="h-8 gap-1" onClick={onSave} disabled={saving || !draft.title.trim() || !draft.url.trim()}>
            <Check className="size-3.5" /> {saving ? "Saving…" : "Add"}
          </Button>
          <Button size="sm" variant="ghost" className="size-8 p-0" onClick={onCancel} aria-label="Cancel draft">
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">
        {category ? (
          <CategoryChip name={category.name} colour={category.colour} />
        ) : (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
            Category needed
          </span>
        )}
        <select
          aria-label="Draft category"
          value={draft.categoryId}
          onChange={(event) => onChange({ categoryId: event.target.value })}
          className="h-7 rounded-md border border-border/70 bg-background px-1 text-[11px]"
        >
          <option value="">Needs Category</option>
          {categories.filter((c) => c.active).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          aria-label="Draft owner"
          value={draft.ownerId}
          onChange={(event) => onChange({ ownerId: event.target.value })}
          className="h-7 rounded-md border border-border/70 bg-background px-1 text-[11px]"
        >
          <option value="">Needs Owner</option>
          {owners.filter((o) => o.active).map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <select
          aria-label="Draft frequency"
          value={draft.frequency}
          onChange={(event) => onChange({ frequency: event.target.value })}
          className="h-7 rounded-md border border-border/70 bg-background px-1 text-[11px]"
        >
          {config.frequencies.map((frequency) => (
            <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
          ))}
        </select>
        <select
          aria-label="Draft level"
          value={draft.level}
          onChange={(event) => onChange({ level: event.target.value })}
          className="h-7 rounded-md border border-border/70 bg-background px-1 text-[11px]"
        >
          <option value="">No level</option>
          {LINK_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
        </select>
        <span className="text-[10px] text-muted-foreground">Last updated: today</span>
        <select
          aria-label="Draft status"
          value={draft.status}
          onChange={(event) => onChange({ status: event.target.value })}
          className="h-7 rounded-md border border-border/70 bg-background px-1 text-[11px]"
        >
          {config.statuses.map((status) => <option key={status.name} value={status.name}>{status.name}</option>)}
        </select>
        {detailsMissing && (
          <span className="rounded-full border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
            Needs details
          </span>
        )}
      </div>

      {(hints.length > 0 || suggestions.reasons.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3" /> Suggested
          </span>
          {hints.map((hint) => (
            <button
              key={hint.key}
              type="button"
              disabled={!hint.value}
              onClick={() => onChange({ [hint.key]: hint.value } as Partial<LinkQuickDraft>)}
              className={cn(
                "rounded-full border border-primary/30 bg-primary/[0.07] px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/15",
                !hint.value && "hidden",
              )}
            >
              + {hint.label}
            </button>
          ))}
          {hints.length > 1 && (
            <button
              type="button"
              onClick={onApplyAll}
              className="rounded-full border border-primary/50 bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground"
            >
              Accept all
            </button>
          )}
          <span className="text-[10px] text-muted-foreground">
            {suggestions.reasons.join(" · ")}
          </span>
        </div>
      )}
    </div>
  );
}

export function NeedsDetailsChip({
  rows,
  onClick,
}: {
  rows: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-8 items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
      data-tip="Rows without a category or owner"
    >
      Needs details <span className="rounded-full bg-amber-200/70 px-1.5 tabular-nums">{rows}</span>
    </button>
  );
}

export function StatusLegend({ status, config }: { status: string; config: LinksConfig }) {
  return <StatusPill status={status} config={config} />;
}
