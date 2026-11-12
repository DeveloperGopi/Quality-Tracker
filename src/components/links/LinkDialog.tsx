import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  History,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { DateInput } from "@/components/DateInput";
import { LinkChip, CategoryChip, DueChip, StatusPill, PinStar, linkTypeIcon } from "@/components/links/LinkPieces";
import type { LinkCategory, LinkDraft, LinkDraftUrl, LinkItem, LinkOwner, LinkOwner as Owner } from "@/components/links/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SaveBar, ReviewChangesDialog } from "@/components/quickview/SaveBar";
import type { QvChange, QvIssue } from "@/lib/facilityQuickView";
import {
  LINK_LEVELS,
  LINK_LABEL_MAX,
  LINK_VISIBILITIES,
  LINK_VISIBILITY_LABEL,
  detectLinkType,
  frequencyLabel,
  linkStatusDef,
  computeNextDue,
  normalizeLinkUrl,
  suggestLinkLabel,
  validateLinkUrl,
  type LinksConfig,
} from "@/lib/links";
import { formatLinkDate } from "@/lib/links";
import { cn } from "@/lib/utils";
import { todayIsoIST } from "@/lib/dateInput";

const DRAFT_PREFIX = "nqas.links.draft.";
/** The Add-link form starts in the category the user used last. */
const LAST_CATEGORY_KEY = "nqas.links.lastCategory";

function lastCategoryId(categories: LinkCategory[]): string {
  if (typeof window !== "undefined") {
    try {
      const id = window.localStorage.getItem(LAST_CATEGORY_KEY);
      if (id && categories.some((c) => c.id === id)) return id;
    } catch {
      /* private mode */
    }
  }
  return categories[0]?.id ?? "";
}

function emptyDraft(categoryId: string, visibility: string): LinkDraft {
  return {
    categoryId,
    title: "",
    description: "",
    frequency: "one-time",
    customDays: "",
    lastUpdated: "",
    ownerId: "",
    level: "",
    status: "Active",
    remarks: "",
    tags: "",
    visibility,
    pinned: false,
    urls: [{ label: "", url: "", kind: "link", isPrimary: true }],
  };
}

export function itemToDraft(item: LinkItem): LinkDraft {
  const links = item.urls.filter((u) => u.kind !== "form");
  const form = item.urls.find((u) => u.kind === "form");
  const urlRows: LinkDraftUrl[] = links.map((u) => ({
    id: u.id,
    label: u.label,
    url: u.url,
    kind: "link" as const,
    isPrimary: u.isPrimary,
    type: u.type,
  }));
  if (!urlRows.length) {
    urlRows.push({ label: "", url: "", kind: "link", isPrimary: true });
  }
  if (form) {
    urlRows.push({
      id: form.id,
      label: form.label,
      url: form.url,
      kind: "form" as const,
      isPrimary: false,
      type: form.type,
    });
  }
  return {
    id: item.id,
    categoryId: item.categoryId,
    title: item.title,
    description: item.description ?? "",
    frequency: item.frequency,
    customDays: item.customDays != null ? String(item.customDays) : "",
    lastUpdated: item.lastUpdated ?? "",
    ownerId: item.ownerId ?? "",
    level: item.level ?? "",
    status: item.status,
    remarks: item.remarks ?? "",
    tags: (item.tags ?? []).join(", "),
    visibility: item.visibility,
    pinned: item.pinned,
    urls: urlRows,
  };
}

function draftKey(id?: string) {
  return `${DRAFT_PREFIX}${id ?? "new"}`;
}

function readDraft(key: string): LinkDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as LinkDraft) : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: LinkDraft | null) {
  if (typeof window === "undefined") return;
  try {
    if (draft) window.localStorage.setItem(key, JSON.stringify(draft));
    else window.localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
}

function snapshotArgs(draft: LinkDraft) {
  return {
    categoryId: draft.categoryId as Id<"link_category">,
    title: draft.title.trim(),
    description: draft.description.trim() || undefined,
    frequency: draft.frequency,
    customDays: draft.frequency === "custom-days" ? Number(draft.customDays) || undefined : undefined,
    lastUpdated: draft.lastUpdated || undefined,
    ownerId: draft.ownerId ? (draft.ownerId as Id<"link_owner">) : undefined,
    level: draft.level || undefined,
    status: draft.status,
    remarks: draft.remarks.trim() || undefined,
    tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
    visibility: draft.visibility,
    pinned: draft.pinned,
    urls: draft.urls
      .filter((u) => u.url.trim())
      .map((u) => ({
        label: u.label.trim(),
        url: u.url.trim(),
        kind: u.kind,
        isPrimary: u.kind !== "form" && u.isPrimary,
        type: u.type,
      })),
  };
}

function makeChanges(before: LinkDraft | null, draft: LinkDraft, categories: LinkCategory[], owners: LinkOwner[], config: LinksConfig): QvChange[] {
  if (!before) return [{ field: "new", label: "New report", from: "", to: draft.title || "Untitled", section: "overview" }];
  const changes: QvChange[] = [];
  const add = (field: string, label: string, from: unknown, to: unknown) => {
    const a = String(from ?? "").trim();
    const b = String(to ?? "").trim();
    if (a !== b) changes.push({ field, label, from: a || "-", to: b || "-", section: "overview" });
  };
  add("title", "Report name", before.title, draft.title);
  add("description", "Description", before.description, draft.description);
  add(
    "category",
    "Category",
    categories.find((c) => c.id === before.categoryId)?.name,
    categories.find((c) => c.id === draft.categoryId)?.name,
  );
  add("frequency", "Frequency", frequencyLabel(config, before.frequency), frequencyLabel(config, draft.frequency));
  add("lastUpdated", "Last updated", before.lastUpdated ? formatLinkDate(before.lastUpdated) : "-", draft.lastUpdated ? formatLinkDate(draft.lastUpdated) : "-");
  add("owner", "Owner", owners.find((o) => o.id === before.ownerId)?.name, owners.find((o) => o.id === draft.ownerId)?.name);
  add("level", "Level", before.level, draft.level);
  add("status", "Status", before.status, draft.status);
  add("remarks", "Remarks", before.remarks, draft.remarks);
  add("visibility", "Visibility", before.visibility, draft.visibility);
  add("tags", "Tags", before.tags, draft.tags);
  if (JSON.stringify(before.urls) !== JSON.stringify(draft.urls)) {
    changes.push({ field: "urls", label: "Links", from: `${before.urls.filter((u) => u.url).length} links`, to: `${draft.urls.filter((u) => u.url).length} links`, section: "overview" });
  }
  return changes;
}

export function LinkDialog({
  open,
  onOpenChange,
  item,
  categories,
  owners,
  config,
  me,
  prev,
  next,
  onPrevious,
  onNext,
  onMarkUpdated,
  onAddCategory,
  onAddOwner,
  onDeleted,
  startInEdit = false,
  existingUrls,
  existingTitles = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: LinkItem | null;
  categories: LinkCategory[];
  owners: LinkOwner[];
  config: LinksConfig;
  me: { id: string; canEdit: boolean; isAdmin: boolean };
  prev: LinkItem | null;
  next: LinkItem | null;
  onPrevious: () => void;
  onNext: () => void;
  onMarkUpdated: (item: LinkItem) => void;
  onAddCategory?: () => void;
  onAddOwner?: () => void;
  onDeleted: () => void;
  startInEdit?: boolean;
  /** Normalised URL → the other report that already uses it (“Already in SaQsham”). */
  existingUrls?: ReadonlyMap<string, string>;
  /** Names in the same category — a duplicate name is a warning, never a block. */
  existingTitles?: { id?: string; categoryId: string; title: string }[];
}) {
  const today = todayIsoIST();
  const editingItem = item;
  const [mode, setMode] = useState<"view" | "edit">(item && !startInEdit ? "view" : "edit");
  const [draft, setDraft] = useState<LinkDraft>(() =>
    editingItem
      ? itemToDraft(editingItem)
      : emptyDraft(lastCategoryId(categories), config.defaultVisibility),
  );
  const [before, setBefore] = useState<LinkDraft | null>(editingItem ? itemToDraft(editingItem) : null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const createLink = useMutation(api.links.createLink);
  const updateLink = useMutation(api.links.updateLink);
  const deleteLink = useMutation(api.links.deleteLinkPermanently);

  // Reload the draft when the dialog opens on another item.
  useEffect(() => {
    if (!open) return;
    const initial = editingItem
      ? itemToDraft(editingItem)
      : emptyDraft(lastCategoryId(categories), config.defaultVisibility);
    const cached = readDraft(draftKey(editingItem?.id));
    setBefore(editingItem ? itemToDraft(editingItem) : null);
    setDraft(cached ?? initial);
    setMode(editingItem && !startInEdit ? "view" : "edit");
    setSavedLabel(null);
    setReviewOpen(false);
    setShowAudit(false);
  }, [open, editingItem?.id, startInEdit, config.defaultVisibility]);

  const key = draftKey(editingItem?.id);
  const changes = useMemo(
    () => makeChanges(before, draft, categories, owners, config),
    [before, draft, categories, owners, config],
  );
  const dirty = changes.length > 0;
  const dirtyRef = useMemo(() => ({ value: false }), []);
  dirtyRef.value = dirty;

  useEffect(() => {
    if (!open) return;
    if (!dirty) {
      writeDraft(key, null);
      return;
    }
    const handle = window.setTimeout(() => writeDraft(key, draft), 300);
    return () => window.clearTimeout(handle);
  }, [open, dirty, draft, key]);

  const issues: QvIssue[] = useMemo(() => {
    const out: QvIssue[] = [];
    const add = (field: string, message: string) =>
      out.push({ field, message, severity: "blocking", section: "overview" });
    if (!draft.title.trim()) add("title", "Report name is required");
    if (!draft.categoryId) add("categoryId", "Choose a category");
    if (!config.frequencies.some((f) => f.value === draft.frequency)) add("frequency", "Choose a frequency");
    if (draft.frequency === "custom-days" && (!Number(draft.customDays) || Number(draft.customDays) <= 0)) {
      add("customDays", "Enter the number of days");
    }
    if (draft.lastUpdated && draft.lastUpdated > today) add("lastUpdated", "Last updated cannot be in the future");
    if (
      draft.title.trim() &&
      existingTitles.some(
        (candidate) =>
          candidate.categoryId === draft.categoryId &&
          candidate.id !== editingItem?.id &&
          candidate.title.trim().toLowerCase() === draft.title.trim().toLowerCase(),
      )
    ) {
      out.push({
        field: "title",
        message: "A report with this name already exists in this category. Saving is allowed — consider a distinguishing name or category.",
        severity: "warning",
        section: "overview",
      });
    }
    const filled = draft.urls.filter((u) => u.url.trim());
    if (filled.length === 0) add("urls", "Add at least one link");
    if (filled.length > 10) add("urls", "At most 10 links");
    for (const [i, link] of filled.entries()) {
      const check = validateLinkUrl(link.url);
      if (!check.ok) add(`url-${i}`, check.error ?? "Invalid link");
      if (link.label.length > LINK_LABEL_MAX) add(`label-${i}`, `Label is longer than ${LINK_LABEL_MAX} characters`);
    }
    const linkRows = filled.filter((u) => u.kind !== "form");
    if (linkRows.length && !linkRows.some((u) => u.isPrimary)) add("urls", "Choose one primary link");
    if (filled.filter((u) => u.kind === "form").length > 1) add("urls", "Only one form link is allowed");
    return out;
  }, [draft, config.frequencies, today, existingTitles, editingItem?.id]);

  const audit = useQuery(api.links.auditFor, open && editingItem ? { id: editingItem.id as Id<"link_item"> } : "skip");
  const logs = useQuery(api.links.updateLog, open && editingItem ? { id: editingItem.id as Id<"link_item"> } : "skip");

  const set = <K extends keyof LinkDraft>(field: K, value: LinkDraft[K]) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const updateUrl = (index: number, patch: Partial<LinkDraftUrl>) => {
    setDraft((current) => ({
      ...current,
      urls: current.urls.map((u, i) => (i === index ? { ...u, ...patch } : u)),
    }));
  };

  const pasteUrl = (index: number, text: string) => {
    const check = validateLinkUrl(text);
    const normalized = normalizeLinkUrl(text);
    if (!normalized) return;
    setDraft((current) => ({
      ...current,
      urls: current.urls.map((u, i) => {
        if (i !== index) return u;
        return {
          ...u,
          url: normalized,
          label: u.label.trim() || suggestLinkLabel(normalized),
          type: detectLinkType(normalized),
        };
      }),
    }));
    if (check.error) toast.warning(check.error);
    const duplicate = draft.urls.some((u, i) => i !== index && u.url && normalizeLinkUrl(u.url) === check.url);
    if (duplicate) toast.warning("This URL is already in this report");
    const otherTitle = existingUrls?.get(normalizeLinkUrl(normalized));
    if (otherTitle && otherTitle !== editingItem?.title) {
      toast.warning(`Already in SaQsham — used by “${otherTitle}”`);
    }
  };

  const save = async (thenNext = false) => {
    if (issues.some((i) => i.severity === "blocking")) {
      toast.error("Fix the highlighted fields before saving");
      return;
    }
    setSaving(true);
    try {
      const args = snapshotArgs(draft);
      let savedId = editingItem?.id;
      if (editingItem) {
        await updateLink({ id: editingItem.id as Id<"link_item">, ...args });
      } else {
        const result = await createLink({ ...args, pinned: draft.pinned });
        savedId = result.id;
        try {
          window.localStorage.setItem(LAST_CATEGORY_KEY, draft.categoryId);
        } catch {
          /* private mode */
        }
      }
      writeDraft(key, null);
      if (savedId) writeDraft(draftKey(savedId), null);
      setBefore(draft);
      setSavedLabel(`Saved ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`);
      toast.success(editingItem ? "Link updated" : "Link added", {
        description: "The change is in the audit log.",
      });
      if (thenNext) {
        setSavedLabel(null);
        onNext();
      } else if (!editingItem) {
        onOpenChange(false);
      } else {
        setMode("view");
        onDeleted();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the link");
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!editingItem) return;
    try {
      await deleteLink({ id: editingItem.id as Id<"link_item"> });
      toast.success("Link permanently deleted");
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  };

  const addLinkRow = () => {
    if (draft.urls.filter((u) => u.kind !== "form").length >= 10) {
      toast.error("A report can have at most 10 links");
      return;
    }
    setDraft((current) => ({
      ...current,
      urls: [...current.urls, { label: "", url: "", kind: "link", isPrimary: false, type: "web" }],
    }));
  };

  const removeUrl = (index: number) => {
    setDraft((current) => {
      const removed = current.urls[index];
      const next = current.urls.filter((_, i) => i !== index);
      if (removed?.isPrimary && next.some((u) => u.kind !== "form")) {
        const first = next.find((u) => u.kind !== "form");
        if (first) first.isPrimary = true;
      }
      return { ...current, urls: next };
    });
  };

  const formDraft = draft.urls.find((u) => u.kind === "form");
  const formIndex = draft.urls.findIndex((u) => u.kind === "form");
  const viewLinks = item?.urls ?? [];
  const canAdd =
    !!draft.title.trim() &&
    draft.urls.some((u) => u.kind !== "form" && validateLinkUrl(u.url).ok);

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => {
        if (!nextOpen && dirtyRef.value) writeDraft(key, draft);
        onOpenChange(nextOpen);
      }}>
        <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
          <DialogHeader className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 pr-12 text-left sm:px-6">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <DialogTitle className="flex items-center gap-2 text-lg leading-tight">
                  <span className="min-w-0">{item?.title ?? "Add link"}</span>
                  {item && <PinStar pinned={item.pinned} canEdit={me.canEdit} onToggle={() => {}} />}
                </DialogTitle>
                <DialogDescription className="mt-1 flex flex-wrap items-center gap-1.5">
                  {item ? (
                    <>
                      <CategoryChip name={item.categoryName} colour={item.categoryColour} />
                      <StatusPill status={item.status} config={config} />
                      <DueChip due={item.due} config={config} />
                      <span className="text-[11px] text-muted-foreground">S. No {item.serial}</span>
                    </>
                  ) : (
                    "A report or data-collection link, with a schedule and an owner."
                  )}
                </DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {item && (
                  <>
                    <Button size="sm" variant="ghost" onClick={onPrevious} disabled={!prev} aria-label="Previous link" data-tip={prev ? prev.title : "No previous link"}>
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onNext} disabled={!next} aria-label="Next link" data-tip={next ? next.title : "No next link"}>
                      <ChevronRight className="size-4" />
                    </Button>
                  </>
                )}
                {item && me.canEdit && (
                  <Button
                    size="sm"
                    variant={mode === "edit" ? "secondary" : "outline"}
                    className="ml-1 gap-1.5"
                    onClick={() => {
                      if (mode === "edit" && editingItem) setDraft(itemToDraft(editingItem));
                      setMode(mode === "edit" ? "view" : "edit");
                    }}
                  >
                    <Pencil className="size-3.5" /> {mode === "edit" ? "View" : "Edit"}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {mode === "view" && item ? (
              <div className="space-y-5">
                <section>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Link2 className="size-3.5" /> Links
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {viewLinks.map((u) => (
                      <div key={u.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2">
                        <LinkChip link={{ label: u.label, url: u.url, type: u.type }} className="min-w-0 flex-1" />
                        {u.isPrimary && <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Primary</span>}
                        {u.kind === "form" && <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">Form</span>}
                        <a href={u.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Open ${u.label}`}>
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                    ))}
                    {viewLinks.length === 0 && <p className="text-sm text-muted-foreground">No links yet.</p>}
                  </div>
                </section>

                <section className="grid gap-3 rounded-xl border border-border/60 bg-background/60 p-3 sm:grid-cols-2">
                  <Detail label="Frequency" value={frequencyLabel(config, item.frequency)} />
                  <Detail label="Last updated" value={item.lastUpdated ? formatLinkDate(item.lastUpdated) : "-"} />
                  <Detail label="Next due" value={item.nextDue ? formatLinkDate(item.nextDue) : "-"} />
                  <Detail label="Due state" value={item.due.state === "never" ? "Never updated" : item.due.state === "overdue" ? `${Math.abs(item.due.days ?? 0)} days overdue` : item.due.state === "due-soon" ? `Due in ${item.due.days ?? 0} days` : "Up to date"} />
                  <Detail label="Owner" value={item.ownerName ?? "-"} />
                  <Detail label="Level" value={item.level ?? "-"} />
                  <Detail label="Visibility" value={LINK_VISIBILITY_LABEL[item.visibility as keyof typeof LINK_VISIBILITY_LABEL] ?? item.visibility} />
                  <Detail label="Tags" value={(item.tags ?? []).join(", ") || "-"} />
                  <div className="sm:col-span-2">
                    <Detail label="Description" value={item.description ?? "-"} />
                  </div>
                  <div className="sm:col-span-2">
                    <Detail label="Remarks" value={item.remarks ?? "-"} />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    {me.canEdit && (
                      <Button size="sm" variant="outline" onClick={() => onMarkUpdated(item)}>
                        <Clock3 className="mr-1 size-3.5" /> Mark as updated
                      </Button>
                    )}
                    {item.urls.find((u) => u.isPrimary && u.kind !== "form") && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={item.urls.find((u) => u.isPrimary && u.kind !== "form")!.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1 size-3.5" /> Open primary link
                        </a>
                      </Button>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <History className="size-3.5" /> Update history
                  </h3>
                  {logs === undefined ? (
                    <p className="text-xs text-muted-foreground">Loading history…</p>
                  ) : logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No updates logged yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {logs.slice(0, 8).map((log) => (
                        <li key={log._id} className="flex flex-wrap items-baseline gap-x-2 rounded-md border border-border/40 px-2 py-1 text-xs">
                          <span className="font-medium tabular-nums">{formatLinkDate(log.updatedOn)}</span>
                          <span className="text-muted-foreground">{log.updatedByName ?? "—"}</span>
                          {log.periodNote && <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">{log.periodNote}</span>}
                          {log.note && <span className="basis-full text-muted-foreground">{log.note}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <details className="rounded-lg border border-border/60 px-3 py-2" open={showAudit} onToggle={(e) => setShowAudit((e.currentTarget as HTMLDetailsElement).open)}>
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Audit — who changed what</summary>
                  <div className="mt-2 space-y-1">
                    {(audit ?? []).slice(0, 8).map((row) => (
                      <p key={row.id} className="text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{row.changedByName ?? "System"}</span>{" "}
                        {row.action} {row.field ?? ""} · {formatLinkDate(new Date(row.changedAt).toISOString().slice(0, 10))}
                      </p>
                    ))}
                    {(audit ?? []).length === 0 && <p className="text-[11px] text-muted-foreground">No audit entries yet.</p>}
                  </div>
                </details>
              </div>
            ) : (
              editingItem ? (
                <LinkForm
                  draft={draft}
                  set={set}
                  categories={categories}
                  owners={owners}
                  config={config}
                  today={today}
                  issues={issues}
                  setDraft={setDraft}
                  updateUrl={updateUrl}
                  removeUrl={removeUrl}
                  addLinkRow={addLinkRow}
                  pasteUrl={pasteUrl}
                  formDraft={formDraft}
                  formIndex={formIndex}
                  onAddCategory={onAddCategory}
                  onAddOwner={onAddOwner}
                />
              ) : (
                <NewLinkForm
                  draft={draft}
                  set={set}
                  categories={categories}
                  owners={owners}
                  config={config}
                  today={today}
                  issues={issues}
                  setDraft={setDraft}
                  updateUrl={updateUrl}
                  removeUrl={removeUrl}
                  addLinkRow={addLinkRow}
                  pasteUrl={pasteUrl}
                  formDraft={formDraft}
                  formIndex={formIndex}
                  onAddCategory={onAddCategory}
                  onAddOwner={onAddOwner}
                  onSubmit={() => void save(false)}
                />
              )
            )}
          </div>

          {editingItem ? (
            mode === "edit" &&
            me.canEdit && (
              <div className="shrink-0 border-t border-border/60 bg-background/95 px-4 py-2 sm:px-6">
                {/* Edit mode keeps the shared Save bar (changes, review, discard). */}
                <SaveBar
                  changes={changes}
                  issues={issues}
                  saving={saving}
                  savedLabel={savedLabel}
                  dirty={dirty}
                  onDiscard={() => {
                    setDraft(itemToDraft(editingItem));
                    setMode("view");
                    writeDraft(key, null);
                  }}
                  onSave={() => void save(false)}
                  onSaveAndNext={() => void save(true)}
                  onReview={() => setReviewOpen(true)}
                  onFocusIssue={() => undefined}
                  canSaveAndNext={!!next}
                />
              </div>
            )
          ) : (
            me.canEdit && (
              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 bg-background/95 px-4 py-2.5 sm:px-6">
                <p className="text-[11px] text-muted-foreground">
                  {canAdd ? "Name and URL look good." : "A name and one valid URL are required."}
                </p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" form="link-form" size="sm" disabled={!canAdd || saving}>
                    {saving ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Plus className="mr-1 size-3.5" />}
                    Add link
                  </Button>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      <ReviewChangesDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        changes={changes}
        issues={issues}
        statusNotice={null}
        onConfirm={() => {
          setReviewOpen(false);
          void save(false);
        }}
        saving={saving}
      />
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm">{value || "-"}</p>
    </div>
  );
}

function LinkForm({
  draft,
  set,
  categories,
  owners,
  config,
  today,
  issues,
  setDraft,
  updateUrl,
  removeUrl,
  addLinkRow,
  pasteUrl,
  formDraft,
  formIndex,
  onAddCategory,
  onAddOwner,
}: {
  draft: LinkDraft;
  set: <K extends keyof LinkDraft>(field: K, value: LinkDraft[K]) => void;
  categories: LinkCategory[];
  owners: Owner[];
  config: LinksConfig;
  today: string;
  issues: QvIssue[];
  setDraft: React.Dispatch<React.SetStateAction<LinkDraft>>;
  updateUrl: (index: number, patch: Partial<LinkDraftUrl>) => void;
  removeUrl: (index: number) => void;
  addLinkRow: () => void;
  pasteUrl: (index: number, text: string) => void;
  formDraft?: LinkDraftUrl;
  formIndex: number;
  onAddCategory?: () => void;
  onAddOwner?: () => void;
}) {
  const linked = draft.urls.filter((u) => u.kind !== "form");
  const errorFor = (field: string) => issues.find((i) => i.field === field)?.message;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Report name *" error={errorFor("title")}>
          <Input value={draft.title} onChange={(e) => set("title", e.target.value)} maxLength={200} placeholder="e.g. NQAS Internal Assessment Checklist" autoFocus />
        </Field>
        <Field label="Category *" error={errorFor("categoryId")}>
          <div className="flex gap-1.5">
            <select
              value={draft.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              aria-label="Category"
            >
              <option value="">Choose a category</option>
              {categories.filter((c) => c.active || c.id === draft.categoryId).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {onAddCategory && <Button type="button" size="sm" variant="outline" className="h-10" onClick={onAddCategory} data-tip="Add a category in Admin → Links">+</Button>}
          </div>
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={500} placeholder="What is this report for?" />
        </Field>
        <Field label="Frequency *">
          <select value={draft.frequency} onChange={(e) => set("frequency", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" aria-label="Frequency">
            {config.frequencies.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          {draft.frequency === "custom-days" && (
            <Input type="number" min={1} max={3650} value={draft.customDays} onChange={(e) => set("customDays", e.target.value)} placeholder="Days between updates" className="mt-1.5 h-9" />
          )}
        </Field>
        <Field label="Last updated" error={errorFor("lastUpdated")}>
          <div className="flex items-center gap-1.5">
            <DateInput id="link-last-updated" label="Last updated" value={draft.lastUpdated} onChange={(iso) => set("lastUpdated", iso)} max={today} today={today} emptyLabel="Not updated" className="min-w-0 flex-1" />
            <Button type="button" size="sm" variant="outline" className="h-10" onClick={() => set("lastUpdated", today)}>Today</Button>
          </div>
          {draft.frequency !== "one-time" && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {(() => {
                const next = computeNextDue(
                  draft.lastUpdated,
                  draft.frequency,
                  Number(draft.customDays) || null,
                  config.frequencies,
                );
                return next ? `Next due ${formatLinkDate(next)}` : "Not updated yet";
              })()}
            </p>
          )}
        </Field>
        <Field label="Owner">
          <div className="flex gap-1.5">
            <select value={draft.ownerId} onChange={(e) => set("ownerId", e.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm" aria-label="Owner">
              <option value="">No owner</option>
              {owners.filter((o) => o.active || o.id === draft.ownerId).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {onAddOwner && <Button type="button" size="sm" variant="outline" className="h-10" onClick={onAddOwner} data-tip="Add an owner in Admin → Links">+</Button>}
          </div>
        </Field>
        <Field label="Level">
          <select value={draft.level} onChange={(e) => set("level", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" aria-label="Level">
            <option value="">Not set</option>
            {LINK_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={draft.status} onChange={(e) => set("status", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" aria-label="Status">
            {config.statuses.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Visibility">
          <select value={draft.visibility} onChange={(e) => set("visibility", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" aria-label="Visibility">
            {LINK_VISIBILITIES.map((v) => <option key={v} value={v}>{LINK_VISIBILITY_LABEL[v]}</option>)}
          </select>
        </Field>
        <Field label="Tags" className="sm:col-span-2">
          <Input value={draft.tags} onChange={(e) => set("tags", e.target.value)} placeholder="comma-separated, e.g. IA, quarterly, Kayakalp" />
        </Field>
        <Field label="Remarks" className="sm:col-span-2">
          <Textarea value={draft.remarks} onChange={(e) => set("remarks", e.target.value)} rows={2} maxLength={500} placeholder="e.g. 4th Quarter (2025-26)" />
      </Field>
      </div>

      <section className="rounded-xl border border-border/60 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Links</h3>
            <p className="text-[11px] text-muted-foreground">Paste a URL anywhere in the field — the type and label are suggested. Max 10.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addLinkRow} disabled={linked.length >= 10}>
            <Plus className="mr-1 size-3.5" /> Add link
          </Button>
        </div>
        <div className="space-y-2">
          {linked.map((u) => {
            const index = draft.urls.indexOf(u);
            const Icon = linkTypeIcon(u.type ?? detectLinkType(u.url)).icon;
            return (
              <div key={index} className="grid gap-1.5 rounded-lg border border-border/50 bg-background/60 p-2 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-center">
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <input type="radio" name="primary-link" checked={u.isPrimary} onChange={() => setDraft((current) => ({ ...current, urls: current.urls.map((row) => ({ ...row, isPrimary: row.kind !== "form" && row === u })) }))} />
                  Primary
                </label>
                <Input aria-label="Link label" value={u.label} maxLength={LINK_LABEL_MAX} onChange={(e) => updateUrl(index, { label: e.target.value })} placeholder="Label (e.g. PHC checklist)" />
                <div className="relative">
                  <Icon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Link URL"
                    value={u.url}
                    onChange={(e) => updateUrl(index, { url: e.target.value })}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData("text");
                      if (!text) return;
                      if (/^https?:\/\//i.test(text.trim()) || /^[\w.-]+\.[a-z]{2,}/i.test(text.trim())) {
                        e.preventDefault();
                        pasteUrl(index, text);
                      }
                    }}
                    onBlur={() => {
                      if (u.url && !u.type) updateUrl(index, { type: detectLinkType(u.url) });
                    }}
                    placeholder="https://…"
                    className="pl-7"
                  />
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeUrl(index)} aria-label="Remove link" className="size-9">
                  <X className="size-3.5" />
                </Button>
                {errorFor(`url-${draft.urls.indexOf(u)}`) && <p className="text-[11px] text-destructive sm:col-span-4">{errorFor(`url-${draft.urls.indexOf(u)}`)}</p>}
              </div>
            );
          })}
        </div>
        <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/40 p-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-violet-900">Form link</span>
            <span className="text-[10px] text-violet-700">optional · one form per report</span>
          </div>
          <Input
            aria-label="Form link URL"
            className="mt-1.5 bg-background"
            value={formDraft?.url ?? ""}
            placeholder="https://forms.gle/…"
            onPaste={(e) => {
              const text = e.clipboardData.getData("text").trim();
              if (!/^https?:\/\//i.test(text)) return;
              e.preventDefault();
              const nextUrl = normalizeLinkUrl(text);
              const entry = { label: suggestLinkLabel(nextUrl), url: nextUrl, kind: "form" as const, isPrimary: false, type: "form" };
              setDraft((current) => ({
                ...current,
                urls: formIndex >= 0
                  ? current.urls.map((u, i) => (i === formIndex ? { ...u, ...entry } : u))
                  : [...current.urls, entry],
              }));
            }}
            onChange={(e) => {
              const value = e.target.value;
              setDraft((current) => {
                if (formIndex >= 0) {
                  return { ...current, urls: current.urls.map((u, i) => (i === formIndex ? { ...u, url: value, type: "form" } : u)) };
                }
                return { ...current, urls: [...current.urls, { label: "", url: value, kind: "form", isPrimary: false, type: "form" }] };
              });
            }}
          />
          {formDraft && (
            <div className="mt-1 flex items-center gap-2">
              <Input
                aria-label="Form link label"
                value={formDraft.label}
                maxLength={LINK_LABEL_MAX}
                placeholder="Form label"
                onChange={(e) => updateUrl(formIndex, { label: e.target.value })}
                className="h-8 bg-background"
              />
              <Button type="button" size="sm" variant="ghost" onClick={() => removeUrl(formIndex)}>Remove</Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** The NEW-item form: only a name and one URL up front, everything else in a
 *  collapsed "More details" block. Errors appear on blur or on submit — never
 *  before the first keystroke. */
function NewLinkForm({
  draft,
  set,
  categories,
  owners,
  config,
  today,
  issues,
  setDraft,
  updateUrl,
  removeUrl,
  addLinkRow,
  pasteUrl,
  formDraft,
  formIndex,
  onAddCategory,
  onAddOwner,
  onSubmit,
}: {
  draft: LinkDraft;
  set: <K extends keyof LinkDraft>(field: K, value: LinkDraft[K]) => void;
  categories: LinkCategory[];
  owners: Owner[];
  config: LinksConfig;
  today: string;
  issues: QvIssue[];
  setDraft: React.Dispatch<React.SetStateAction<LinkDraft>>;
  updateUrl: (index: number, patch: Partial<LinkDraftUrl>) => void;
  removeUrl: (index: number) => void;
  addLinkRow: () => void;
  pasteUrl: (index: number, text: string) => void;
  formDraft?: LinkDraftUrl;
  formIndex: number;
  onAddCategory?: () => void;
  onAddOwner?: () => void;
  onSubmit: () => void;
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const errorFor = (field: string) =>
    submitted || touched[field] ? issues.find((i) => i.field === field)?.message : undefined;
  const mark = (field: string) => () =>
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }));

  const linked = draft.urls.filter((u) => u.kind !== "form");
  const primary = linked[0];
  const primaryIndex = primary ? draft.urls.indexOf(primary) : -1;
  const extra = linked.slice(1);
  const next = computeNextDue(
    draft.lastUpdated,
    draft.frequency,
    Number(draft.customDays) || null,
    config.frequencies,
  );

  const looksLikeUrl = (text: string) =>
    /^https?:\/\//i.test(text) || /^[\w.-]+\.[a-z]{2,}/i.test(text);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    onSubmit();
  };

  return (
    <form id="link-form" onSubmit={submit} className="space-y-4">
      <Field label="Report name *" error={errorFor("title")}>
        <Input
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          onBlur={mark("title")}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").trim();
            if (!text || !looksLikeUrl(text)) return;
            e.preventDefault();
            pasteUrl(primaryIndex, text);
            if (!draft.title.trim()) {
              set("title", suggestLinkLabel(normalizeLinkUrl(text) ?? text));
            }
          }}
          maxLength={200}
          placeholder="e.g. NQAS Internal Assessment Checklist"
          autoFocus
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="URL *" error={primary ? errorFor(`url-${primaryIndex}`) : undefined}>
          {primary ? (
            <div className="relative">
              {(() => {
                const Icon = linkTypeIcon(primary.type ?? detectLinkType(primary.url)).icon;
                return (
                  <Icon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                );
              })()}
              <Input
                aria-label="Link URL"
                value={primary.url}
                onChange={(e) => updateUrl(primaryIndex, { url: e.target.value })}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text").trim();
                  if (!looksLikeUrl(text)) return;
                  e.preventDefault();
                  pasteUrl(primaryIndex, text);
                }}
                onBlur={() => {
                  mark(`url-${primaryIndex}`)();
                  if (primary.url && !primary.type) {
                    updateUrl(primaryIndex, { type: detectLinkType(primary.url) });
                  }
                }}
                placeholder="https://…"
                className="pl-7"
              />
            </div>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={addLinkRow}>
              <Plus className="mr-1 size-3.5" /> Add URL
            </Button>
          )}
        </Field>
        <Field label="Label (optional)">
          <Input
            value={primary?.label ?? ""}
            maxLength={LINK_LABEL_MAX}
            placeholder="e.g. PHC checklist"
            onChange={(e) => {
              if (primary) updateUrl(primaryIndex, { label: e.target.value });
            }}
          />
        </Field>
      </div>

      <details className="group rounded-xl border border-border/60 px-3 py-2">
        <summary className="cursor-pointer list-none text-sm font-semibold text-foreground marker:hidden">
          More details
          <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
            category, schedule, owner, visibility…
          </span>
        </summary>
        <div className="mt-3 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category *" error={errorFor("categoryId")}>
              <div className="flex gap-1.5">
                <select
                  value={draft.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                  onBlur={mark("categoryId")}
                  className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                  aria-label="Category"
                >
                  <option value="">Choose a category</option>
                  {categories.filter((c) => c.active || c.id === draft.categoryId).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {onAddCategory && (
                  <Button type="button" size="sm" variant="outline" className="h-10" onClick={onAddCategory} data-tip="Add a category in Admin → Links">+</Button>
                )}
              </div>
            </Field>
            <Field label="Frequency">
              <select
                value={draft.frequency}
                onChange={(e) => set("frequency", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Frequency"
              >
                {config.frequencies.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              {draft.frequency === "custom-days" && (
                <Input
                  type="number"
                  min={1}
                  max={3650}
                  value={draft.customDays}
                  onChange={(e) => set("customDays", e.target.value)}
                  placeholder="Days between updates"
                  className="mt-1.5 h-9"
                />
              )}
            </Field>
            <Field label="Last updated" error={errorFor("lastUpdated")}>
              <div className="flex items-center gap-1.5">
                <DateInput
                  id="link-last-updated"
                  label="Last updated"
                  value={draft.lastUpdated}
                  onChange={(iso) => set("lastUpdated", iso)}
                  max={today}
                  today={today}
                  emptyLabel="Not updated"
                  className="min-w-0 flex-1"
                />
                <Button type="button" size="sm" variant="outline" className="h-10" onClick={() => set("lastUpdated", today)}>Today</Button>
              </div>
              {draft.frequency !== "one-time" && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {next ? `Next due ${formatLinkDate(next)}` : "Not updated yet"}
                </p>
              )}
            </Field>
            <Field label="Owner">
              <div className="flex gap-1.5">
                <select
                  value={draft.ownerId}
                  onChange={(e) => set("ownerId", e.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                  aria-label="Owner"
                >
                  <option value="">No owner</option>
                  {owners.filter((o) => o.active || o.id === draft.ownerId).map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                {onAddOwner && (
                  <Button type="button" size="sm" variant="outline" className="h-10" onClick={onAddOwner} data-tip="Add an owner in Admin → Links">+</Button>
                )}
              </div>
            </Field>
            <Field label="Level">
              <select
                value={draft.level}
                onChange={(e) => set("level", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Level"
              >
                <option value="">Not set</option>
                {LINK_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={draft.status}
                onChange={(e) => set("status", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Status"
              >
                {config.statuses.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Visibility">
              <select
                value={draft.visibility}
                onChange={(e) => set("visibility", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Visibility"
              >
                {LINK_VISIBILITIES.map((v) => (
                  <option key={v} value={v}>{LINK_VISIBILITY_LABEL[v]}</option>
                ))}
              </select>
            </Field>
            <Field label="Tags" className="sm:col-span-2">
              <Input
                value={draft.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="comma-separated, e.g. IA, quarterly, Kayakalp"
              />
            </Field>
            <Field label="Remarks" className="sm:col-span-2">
              <Textarea
                value={draft.remarks}
                onChange={(e) => set("remarks", e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="e.g. 4th Quarter (2025-26)"
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="What is this report for?"
              />
            </Field>
          </div>

          <section className="rounded-xl border border-border/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Extra links</h3>
              <Button type="button" size="sm" variant="outline" onClick={addLinkRow} disabled={linked.length >= 10}>
                <Plus className="mr-1 size-3.5" /> Add another link
              </Button>
            </div>
            {extra.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Optional — one report can point to several pages.</p>
            ) : (
              <div className="space-y-2">
                {extra.map((u) => {
                  const index = draft.urls.indexOf(u);
                  const Icon = linkTypeIcon(u.type ?? detectLinkType(u.url)).icon;
                  return (
                    <div key={index} className="grid gap-1.5 rounded-lg border border-border/50 bg-background/60 p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                      <Input
                        aria-label="Link label"
                        value={u.label}
                        maxLength={LINK_LABEL_MAX}
                        onChange={(e) => updateUrl(index, { label: e.target.value })}
                        placeholder="Label"
                      />
                      <div className="relative">
                        <Icon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          aria-label="Link URL"
                          value={u.url}
                          onChange={(e) => updateUrl(index, { url: e.target.value })}
                          onBlur={() => {
                            if (u.url && !u.type) updateUrl(index, { type: detectLinkType(u.url) });
                          }}
                          placeholder="https://…"
                          className="pl-7"
                        />
                      </div>
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeUrl(index)} aria-label="Remove link" className="size-9">
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-violet-200 bg-violet-50/40 p-2 dark:border-violet-400/30 dark:bg-violet-500/10">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-violet-900 dark:text-violet-100">Form link</span>
              <span className="text-[10px] text-violet-700 dark:text-violet-200">optional · one form per report</span>
            </div>
            <Input
              aria-label="Form link URL"
              className="mt-1.5 bg-background"
              value={formDraft?.url ?? ""}
              placeholder="https://forms.gle/…"
              onPaste={(e) => {
                const text = e.clipboardData.getData("text").trim();
                if (!/^https?:\/\//i.test(text)) return;
                e.preventDefault();
                const nextUrl = normalizeLinkUrl(text);
                const entry = {
                  label: suggestLinkLabel(nextUrl),
                  url: nextUrl,
                  kind: "form" as const,
                  isPrimary: false,
                  type: "form",
                };
                setDraft((current) => ({
                  ...current,
                  urls:
                    formIndex >= 0
                      ? current.urls.map((u, i) => (i === formIndex ? { ...u, ...entry } : u))
                      : [...current.urls, entry],
                }));
              }}
              onChange={(e) => {
                const value = e.target.value;
                setDraft((current) => {
                  if (formIndex >= 0) {
                    return {
                      ...current,
                      urls: current.urls.map((u, i) =>
                        i === formIndex ? { ...u, url: value, type: "form" } : u,
                      ),
                    };
                  }
                  return {
                    ...current,
                    urls: [...current.urls, { label: "", url: value, kind: "form", isPrimary: false, type: "form" }],
                  };
                });
              }}
            />
            {formDraft && (
              <div className="mt-1 flex items-center gap-2">
                <Input
                  aria-label="Form link label"
                  value={formDraft.label}
                  maxLength={LINK_LABEL_MAX}
                  placeholder="Form label"
                  onChange={(e) => updateUrl(formIndex, { label: e.target.value })}
                  className="h-8 bg-background"
                />
                <Button type="button" size="sm" variant="ghost" onClick={() => removeUrl(formIndex)}>Remove</Button>
              </div>
            )}
          </section>
        </div>
      </details>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {error && <p role="alert" className="mt-1 text-[11px] font-medium text-destructive">{error}</p>}
    </div>
  );
}
