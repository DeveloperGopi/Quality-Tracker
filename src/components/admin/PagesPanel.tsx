/**
 * ADMIN → PAGES — one compact table, one draft, one save.
 *
 * Built-in pages come from the sidebar config; custom pages are rows. Labels,
 * roles, visibility and order are edited in a local draft and land everywhere
 * (sidebar, rail, palette, route guard) in ONE audited save. “Everyone” is an
 * explicit flag, never an empty role list.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  FolderPlus,
  GripVertical,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NAV_ITEMS } from "@/lib/sidebarConfig";
import { sidebarLabel } from "@/lib/sidebarLabels";
import {
  DEFAULT_PAGE_GROUPS,
  PROTECTED_PAGE_GROUPS,
  fallbackGroupId,
  normalizePageGroups,
  pageGroupId,
  type PageGroupDef,
} from "@/lib/pageGroups";
import { cn } from "@/lib/utils";
import { PageWizard, type PageSaveForm, type WizardPage, type WizardRole } from "./PageWizard";

type Override = {
  label?: string;
  roles?: string[];
  everyone?: boolean;
  visible?: boolean;
  order?: number;
  group?: string;
};

type CustomPage = WizardPage & { definition: Record<string, unknown> };

type RowDraft = {
  name: string;
  order: number;
  roles: string[];
  everyone: boolean;
  visible: boolean;
  group: string;
};

type Row = {
  kind: "builtin" | "custom";
  id: string;
  route: string;
  group: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  builtinOrder: number;
  custom?: CustomPage;
  saved: RowDraft;
  defaultDraft?: RowDraft;
  locked?: boolean;
};

const DEFAULT_GROUPS: PageGroupDef[] = DEFAULT_PAGE_GROUPS.map((group) => ({ ...group }));

const sameDraft = (a: RowDraft, b: RowDraft) =>
  a.name === b.name &&
  a.order === b.order &&
  a.roles.length === b.roles.length &&
  a.roles.every((r) => b.roles.includes(r)) &&
  a.everyone === b.everyone &&
  a.visible === b.visible &&
  a.group === b.group;

function PageGroupsEditor({
  groups,
  counts,
  onAdd,
  onRename,
  onMove,
  onDelete,
}: {
  groups: PageGroupDef[];
  counts: Record<string, number>;
  onAdd: (label: string) => void;
  onRename: (id: string, label: string) => void;
  onMove: (from: number, to: number) => void;
  onDelete: (group: PageGroupDef) => void;
}) {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  return (
    <details
      className="group rounded-xl border border-border/60 bg-background/60"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2 text-[12.5px] font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <ChevronDown className="size-3.5 -rotate-90 text-muted-foreground transition-transform group-open:rotate-0" />
        Page groups
        <span className="rounded-full border border-border bg-muted/50 px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
          {groups.length}
        </span>
        <span className="ml-auto text-[11px] font-normal text-muted-foreground">
          Drag to reorder · arrow buttons work with the keyboard
        </span>
      </summary>
      <div className="space-y-1.5 border-t border-border/50 p-2.5">
        {groups.map((group, index) => {
          const locked = PROTECTED_PAGE_GROUPS.has(group.id);
          return (
            <div
              key={group.id}
              draggable
              onDragStart={(event) => {
                setDragging(group.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", group.id);
              }}
              onDragEnd={() => setDragging(null)}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const fromId = event.dataTransfer.getData("text/plain") || dragging;
                const from = groups.findIndex((row) => row.id === fromId);
                if (from >= 0) onMove(from, index);
                setDragging(null);
              }}
              className={cn(
                "flex flex-wrap items-center gap-1.5 rounded-lg border border-transparent px-1 py-0.5",
                dragging === group.id && "border-primary/40 bg-primary/5 opacity-60",
              )}
            >
              <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
              <Input
                value={group.label}
                maxLength={24}
                onChange={(event) => onRename(group.id, event.target.value)}
                aria-label={`Name of ${group.label} group`}
                className="h-7 min-w-0 max-w-56 flex-1 basis-36 text-[12.5px]"
              />
              <span className="w-16 shrink-0 text-[10.5px] text-muted-foreground">
                {counts[group.id] ?? 0} page{(counts[group.id] ?? 0) === 1 ? "" : "s"}
              </span>
              {locked && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Lock className="size-2.5" /> required
                </span>
              )}
              <div className="ml-auto flex items-center gap-0.5">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  disabled={index === 0}
                  aria-label={`Move ${group.label} up`}
                  onClick={() => onMove(index, index - 1)}
                >
                  <ChevronUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  disabled={index === groups.length - 1}
                  aria-label={`Move ${group.label} down`}
                  onClick={() => onMove(index, index + 1)}
                >
                  <ChevronDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-6 text-muted-foreground hover:text-destructive"
                  disabled={locked}
                  data-tip={locked ? "Main and Admin groups are required" : undefined}
                  aria-label={`Delete ${group.label} group`}
                  onClick={() => onDelete(group)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        <form
          className="flex items-center gap-1.5 border-t border-border/40 pt-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            onAdd(name);
            setName("");
          }}
        >
          <FolderPlus className="size-3.5 text-muted-foreground" aria-hidden />
          <Input
            value={name}
            maxLength={24}
            onChange={(event) => setName(event.target.value)}
            placeholder="New group name…"
            aria-label="New page group name"
            className="h-7 max-w-56 text-[12.5px]"
          />
          <Button type="submit" size="sm" variant="outline" className="h-7 text-[11px]" disabled={!name.trim()}>
            <Plus className="mr-1 size-3" /> Add group
          </Button>
        </form>
      </div>
    </details>
  );
}

export function PagesPanel({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const pagesQ = useQuery(api.pages.list, {});
  const overridesQ = useQuery(api.pages.builtinOverrides, {});
  const groupsQ = useQuery(api.pages.groups, {});
  const settingsQ = useQuery(api.facilities.getAppSettings, {});
  const rolesQ = useQuery(api.roles.list, {});
  const ensureRoles = useMutation(api.roles.ensure);
  const saveAdmin = useMutation(api.pages.saveAdmin);
  const saveGroups = useMutation(api.pages.saveGroups);
  const updatePage = useMutation(api.pages.update);
  const createPage = useMutation(api.pages.create);
  const duplicate = useMutation(api.pages.duplicate);
  const softDelete = useMutation(api.pages.softDelete);
  const restore = useMutation(api.pages.restore);
  const purge = useMutation(api.pages.purge);
  const migrate = useMutation(api.roles.migrateEmptyRolePages);

  const roles = (rolesQ ?? []) as WizardRole[];
  const pages = useMemo(() => (pagesQ ?? []) as CustomPage[], [pagesQ]);
  const overrides = useMemo(
    () => (overridesQ ?? {}) as Record<string, Override>,
    [overridesQ],
  );
  const hiddenSet = useMemo(() => {
    const pages = settingsQ?.settings.hiddenPages;
    const categories = settingsQ?.settings.hiddenCategories;
    return new Set([
      ...(Array.isArray(pages) ? (pages as string[]) : []),
      ...(Array.isArray(categories) ? (categories as string[]) : []),
    ]);
  }, [settingsQ]);

  const [draft, setDraft] = useState<Record<string, RowDraft>>({});
  const [groupDraft, setGroupDraft] = useState<PageGroupDef[] | null>(null);
  const [groupDelete, setGroupDelete] = useState<PageGroupDef | null>(null);
  const savedGroups = useMemo(
    () => normalizePageGroups(groupsQ ?? DEFAULT_GROUPS),
    [groupsQ],
  );
  const groups = groupDraft ?? savedGroups;
  const groupOrder = useMemo(() => groups.map((group) => group.id), [groups]);
  const groupLabel = (id: string) =>
    id === "ungrouped"
      ? "Ungrouped"
      : groups.find((group) => group.id === id)?.label ?? id;
  const groupsDirty = useMemo(
    () =>
      groupDraft != null &&
      JSON.stringify(groupDraft) !== JSON.stringify(savedGroups),
    [groupDraft, savedGroups],
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "visible" | "hidden" | "custom">("all");
  const [previewOpen, setPreviewOpen] = useState(true);
  const [previewRole, setPreviewRole] = useState("admin");
  const [wizard, setWizard] = useState<{ row: CustomPage | null } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "remove" | "purge"; row: CustomPage } | null>(null);
  const [hideConfirm, setHideConfirm] = useState<{ row: Row; next: RowDraft } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    void ensureRoles({}).catch(() => undefined);
  }, [ensureRoles]);

  const livePages = useMemo(
    () => pages.filter((p) => p.deletedAt == null),
    [pages],
  );
  const trash = useMemo(() => pages.filter((p) => p.deletedAt != null), [pages]);
  const needsMigration = useMemo(
    () => livePages.filter((p) => p.needsMigration),
    [livePages],
  );
  const allRoleKeys = roles.map((r) => r.key);

  /* ---------------- rows ---------------- */
  const rows = useMemo<Row[]>(() => {
    const builtins: Row[] = NAV_ITEMS.map((item, index) => {
      const over = overrides[item.to] ?? {};
      const key = item.visibilityKey ?? item.to.replace(/^\//, "");
      const visible = item.to === "/admin" ? true : !hiddenSet.has(key);
      const guideDefault = item.to === "/guide" && !over.roles && over.everyone === undefined;
      const shippedRoles = item.defaultRoles ?? [];
      const everyone =
        item.to === "/admin"
          ? false
          : over.everyone !== undefined
            ? over.everyone
            : (over.roles?.length ?? 0) > 0
              ? false
              : shippedRoles.length === 0 && !guideDefault;
      const defaultDraft: RowDraft = {
        name: sidebarLabel(item.labelKey),
        order: index,
        roles:
          item.to === "/admin" || guideDefault
            ? ["admin"]
            : shippedRoles,
        everyone:
          item.to !== "/admin" && !guideDefault && shippedRoles.length === 0,
        visible: true,
        group: item.group,
      };
      const effectiveGroup = over.group ?? item.group;
      return {
        kind: "builtin",
        id: item.to,
        route: item.to,
        group: effectiveGroup,
        icon: item.icon,
        builtinOrder: index,
        defaultDraft,
        locked: item.to === "/admin",
        saved: {
          name: over.label?.trim() || defaultDraft.name,
          order: over.order ?? index,
          roles:
            item.to === "/admin"
              ? ["admin"]
              : guideDefault
                ? ["admin"]
                : everyone
                  ? []
                  : over.roles ?? shippedRoles,
          everyone: guideDefault ? false : everyone,
          visible,
          group: effectiveGroup,
        },
      };
    });
    const custom: Row[] = livePages.map((p) => ({
      kind: "custom",
      id: p.id,
      route: `/p/${p.slug}`,
      group: p.group,
      icon: FileIcon,
      builtinOrder: 1000 + p.order,
      custom: p,
      saved: {
        name: p.name,
        order: p.order,
        roles: p.everyone ? [] : p.roles,
        everyone: p.everyone,
        visible: p.visible,
        group: p.group,
      },
    }));
    return [...builtins, ...custom];
  }, [overrides, hiddenSet, livePages]);

  const valueOf = (row: Row): RowDraft => draft[row.id] ?? row.saved;
  const changedRows = rows.filter((r) => !sameDraft(valueOf(r), r.saved));
  const dirty = changedRows.length > 0 || groupsDirty;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const setRow = (row: Row, patch: Partial<RowDraft>, requireConfirm = false) => {
    const current = valueOf(row);
    const next = { ...current, ...patch };
    if (requireConfirm && !next.visible) {
      setHideConfirm({ row, next });
      return;
    }
    setDraft((d) => ({ ...d, [row.id]: next }));
  };

  /** “Reset to default” restores the SHIPPED label, roles, order and visibility
   *  (not just the pending edit). Saving then clears the override. */
  const resetRow = (row: Row) => {
    if (!row.defaultDraft) return;
    setDraft((d) => ({ ...d, [row.id]: { ...row.defaultDraft! } }));
  };

  /* ---------------- page groups ---------------- */
  const commitGroups = (next: PageGroupDef[]) => {
    setGroupDraft(normalizePageGroups(next));
  };

  const addGroup = (label: string) => {
    const trimmed = label.trim().slice(0, 24);
    if (!trimmed) return;
    if (groups.some((group) => group.label.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("A page group with that name already exists");
      return;
    }
    commitGroups([
      ...groups,
      {
        id: pageGroupId(trimmed, groups.map((group) => group.id)),
        label: trimmed,
        order: groups.length * 10,
      },
    ]);
    toast.success(`Added “${trimmed}”`, {
      description: "Save changes to publish it in the sidebar.",
    });
  };

  const renameGroup = (id: string, label: string) => {
    commitGroups(
      groups.map((group) =>
        group.id === id ? { ...group, label: label.slice(0, 24) } : group,
      ),
    );
  };

  const moveGroup = (from: number, to: number) => {
    if (to < 0 || to >= groups.length || from === to) return;
    const next = [...groups];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commitGroups(next.map((group, index) => ({ ...group, order: index * 10 })));
  };

  const deleteGroup = (group: PageGroupDef) => {
    if (PROTECTED_PAGE_GROUPS.has(group.id)) {
      toast.error(`${group.label} is required for navigation`);
      return;
    }
    const remaining = groups.filter((row) => row.id !== group.id);
    if (remaining.length === 0) return;
    const fallback = fallbackGroupId(remaining);
    setDraft((current) => {
      const next = { ...current };
      for (const row of rows) {
        if (valueOf(row).group === group.id) {
          next[row.id] = { ...valueOf(row), group: fallback };
        }
      }
      return next;
    });
    commitGroups(remaining);
    setGroupDelete(null);
    toast.info(`Deleted “${group.label}”`, {
      description: `Its pages move to ${remaining.find((row) => row.id === fallback)?.label ?? fallback}. Save to apply.`,
    });
  };

  /* ---------------- save ---------------- */
  const save = async () => {
    if (!dirty) return;
    setBusy(true);
    try {
      // Validate the whole draft before writing anything, so one bad row never
      // leaves the store half-saved.
      const labels = new Set<string>();
      for (const group of groups) {
        const label = group.label.trim();
        if (!label) throw new Error("Every page group needs a name");
        if (labels.has(label.toLowerCase())) {
          throw new Error(`Two page groups cannot both be called “${label}”`);
        }
        labels.add(label.toLowerCase());
      }
      for (const row of changedRows) {
        if (row.kind !== "custom" || !row.custom) continue;
        const v = valueOf(row);
        if (!v.everyone && v.roles.length === 0) {
          throw new Error(`Choose at least one role for “${v.name}”`);
        }
      }
      const nextOverrides: Record<string, Override> = {};
      const hidden: string[] = [];
      for (const row of rows) {
        const v = valueOf(row);
        if (row.kind === "builtin") {
          if (row.route === "/admin") {
            nextOverrides[row.route] = {
              ...(overrides[row.route] ?? {}),
              visible: true,
              everyone: false,
              roles: ["admin"],
              group: "admin",
            };
            continue;
          }
          nextOverrides[row.route] = {
            ...(overrides[row.route] ?? {}),
            label: v.name.trim() || undefined,
            order: v.order,
            everyone: v.everyone,
            roles: v.everyone ? [] : v.roles,
            visible: v.visible,
            group: v.group,
          };
          if (!v.visible) {
            hidden.push(NAV_ITEMS.find((n) => n.to === row.route)?.visibilityKey ?? row.route.slice(1));
          }
        }
      }
      // Keep visibility keys that belong to pages not in the table (categories
      // and Admin → Workspace visibility) untouched — but never re-add a key
      // the admin just switched back on.
      const managed = new Set(
        NAV_ITEMS.map((n) => n.visibilityKey ?? n.to.replace(/^\//, "")),
      );
      for (const key of hiddenSet) {
        if (!managed.has(key) && !hidden.includes(key)) hidden.push(key);
      }
      if (groupsDirty) {
        await saveGroups({ groups: groups.map((group) => ({ ...group })) });
      }
      await saveAdmin({ overrides: nextOverrides, hiddenPages: hidden });

      for (const row of changedRows) {
        if (row.kind !== "custom" || !row.custom) continue;
        const v = valueOf(row);
        await updatePage({
          pageId: row.custom.id as never,
          name: v.name.trim() || row.custom.name,
          order: v.order,
          roles: v.everyone ? [] : v.roles,
          everyone: v.everyone,
          visible: v.visible,
          group: v.group,
        });
      }
      setDraft({});
      setGroupDraft(null);
      const changedCount = changedRows.length + (groupsDirty ? 1 : 0);
      toast.success(`Saved ${changedCount} change${changedCount === 1 ? "" : "s"}`, {
        description: "Sidebar, rail, palette, Quick actions and direct URLs now match.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the page settings");
    } finally {
      setBusy(false);
    }
  };

  const createOrUpdate = async (form: PageSaveForm, existing: CustomPage | null) => {
    setBusy(true);
    try {
      if (existing) {
        await updatePage({ pageId: existing.id as never, ...form });
        toast.success("Page updated");
      } else {
        const res = await createPage(form as never);
        toast.success("Page created", {
          action: { label: "Open page", onClick: () => window.open(`/p/${res.slug}`, "_blank") },
        });
      }
      setWizard(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the page");
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- filters ---------------- */
  const visibleRows = rows.filter((row) => {
    const v = valueOf(row);
    if (filter === "custom" && row.kind !== "custom") return false;
    if (filter === "visible" && !v.visible) return false;
    if (filter === "hidden" && v.visible) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${v.name} ${row.route} ${groupLabel(v.group)}`.toLowerCase().includes(q);
  });

  const grouped = groupOrder
    .concat(
      [...new Set(visibleRows.map((r) => valueOf(r).group))].filter(
        (group) => !groupOrder.includes(group),
      ),
    )
    .map((group) => ({
      group,
      label: groupLabel(group),
      rows: visibleRows
        .filter((r) => valueOf(r).group === group)
        .sort((a, b) => valueOf(a).order - valueOf(b).order || a.builtinOrder - b.builtinOrder),
    }))
    .filter((g) => g.rows.length > 0);

  const previewGroups = useMemo(() => {
    const role = previewRole;
    const out = new Map<string, string[]>();
    const previewOrder = rows.some((row) => valueOf(row).group === "ungrouped")
      ? [...groupOrder, "ungrouped"]
      : groupOrder;
    for (const group of previewOrder) {
      const names: string[] = [];
      for (const row of rows) {
        const v = valueOf(row);
        if (v.group !== group) continue;
        if (!v.visible) continue;
        if (row.route === "/admin") {
          if (role !== "admin") continue;
        } else if (row.route === "/guide" && (v.roles.length === 0 && !v.everyone)) {
          if (role !== "admin") continue;
        } else if (!v.everyone && !v.roles.includes(role)) {
          continue;
        }
        names.push(v.name);
      }
      if (names.length) out.set(group, names);
    }
    return out;
  }, [rows, draft, previewRole, groupOrder]);

  return (
    <div className="space-y-3">
      {/* migration */}
      {needsMigration.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <span>
            <strong>{needsMigration.length} page{needsMigration.length === 1 ? "" : "s"}</strong>{" "}
            still have an empty role list. Review them and make them Everyone.
          </span>
          <Button size="sm" className="h-8" onClick={() => setMigrateOpen(true)}>
            Review
          </Button>
        </div>
      )}

      <PageGroupsEditor
        groups={groups}
        counts={Object.fromEntries(
          groups.map((group) => [
            group.id,
            rows.filter((row) => valueOf(row).group === group.id).length,
          ]),
        )}
        onAdd={addGroup}
        onRename={renameGroup}
        onMove={moveGroup}
        onDelete={setGroupDelete}
      />
      <AlertDialog
        open={groupDelete != null}
        onOpenChange={(open) => !open && setGroupDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{groupDelete?.label}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The group disappears from the sidebar. Pages in it move to the
              first remaining group; no page or data is deleted. Changes apply
              when you save.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => groupDelete && deleteGroup(groupDelete)}>
              Delete group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 rounded-xl border border-border/60 bg-background/60">
          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-2.5">
            <div className="relative min-w-44 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages…"
                className="h-8 pl-8 text-[12.5px]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {(["all", "visible", "hidden", "custom"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
                    filter === f
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              className="ml-auto h-8"
              onClick={() => setWizard({ row: null })}
              data-guide-target="pages-create"
            >
              <Plus className="mr-1 size-3.5" /> Create page
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              aria-label="Toggle sidebar preview"
              aria-expanded={previewOpen}
              onClick={() => setPreviewOpen((o) => !o)}
            >
              <Eye className="size-3.5" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                  <th className="w-7 px-2 py-1.5" aria-label="Drag to reorder" />
                  <th className="w-8 px-1 py-1.5" aria-label="Icon" />
                  <th className="px-2 py-1.5">Page</th>
                  <th className="w-28 px-2 py-1.5">Group</th>
                  <th className="w-32 px-2 py-1.5">Who can see</th>
                  <th className="w-16 px-2 py-1.5 text-center">Visible</th>
                  <th className="w-10 px-1 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {grouped.map((group) => (
                  <FragmentGroup
                    key={group.group}
                    label={group.label}
                    rows={group.rows}
                    groups={groups}
                    roles={roles}
                    allRoleKeys={allRoleKeys}
                    valueOf={valueOf}
                    setRow={setRow}
                    resetRow={resetRow}
                    onEdit={(row) => row.custom && setWizard({ row: row.custom })}
                    onDuplicate={(row) => {
                      if (!row.custom) return;
                      void duplicate({ pageId: row.custom.id as never }).then(() => toast.success("Page duplicated"));
                    }}
                    onRemove={(row) => row.custom && setConfirm({ kind: "remove", row: row.custom })}
                  />
                ))}
                {grouped.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No pages match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* live preview */}
        {previewOpen && (
          <aside className="self-start rounded-xl border border-border/60 bg-background/60">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 p-2.5">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Sidebar preview
              </p>
              <Button size="icon" variant="ghost" className="size-6" aria-label="Hide preview" onClick={() => setPreviewOpen(false)}>
                <EyeOff className="size-3" />
              </Button>
            </div>
            <div className="space-y-2 p-2.5">
              <label className="text-[10.5px] font-medium text-muted-foreground">
                Preview as
                <select
                  value={previewRole}
                  onChange={(e) => setPreviewRole(e.target.value)}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[12px]"
                >
                  {roles.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-3 rounded-lg border border-border/60 bg-card p-2">
                {[...previewGroups.entries()].map(([group, names]) => (
                  <div key={group}>
                    <p className="text-[9.5px] font-bold tracking-wider text-muted-foreground">
                      {groupLabel(group).toUpperCase()}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {names.map((name) => (
                        <li key={name} className="truncate rounded px-1.5 py-0.5 text-[12px] text-foreground/90">
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {previewGroups.size === 0 && (
                  <p className="p-2 text-[11px] text-muted-foreground">This role sees no pages.</p>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Updates as you edit, before you save.
              </p>
            </div>
          </aside>
        )}
      </div>

      {/* trash */}
      {trash.length > 0 && (
        <section className="rounded-xl border border-border/60">
          <div className="flex items-center gap-2 border-b border-border/60 p-2.5">
            <RotateCcw className="size-3.5 text-muted-foreground" />
            <p className="text-[12px] font-semibold">Trash</p>
            <span className="rounded-full bg-muted px-1.5 text-[10px]">{trash.length}</span>
          </div>
          <ul className="divide-y divide-border/50">
            {trash.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 px-2.5 py-1.5 text-[12px]">
                <span className="min-w-0 flex-1 truncate">
                  {p.name} <span className="text-muted-foreground">/p/{p.slug}</span>
                </span>
                <Button size="sm" variant="outline" className="h-7" onClick={() => void restore({ pageId: p.id as never }).then(() => toast.success("Page restored"))}>
                  Restore
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => setConfirm({ kind: "purge", row: p })}>
                  Delete forever
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* save bar */}
      <div
        className={cn(
          "sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 shadow-sm backdrop-blur-md transition-all",
          dirty ? "border-primary/40 bg-card/95" : "pointer-events-none border-transparent bg-transparent opacity-0",
        )}
      >
        <span className="text-[12.5px] font-semibold">
          {changedRows.length + (groupsDirty ? 1 : 0)} change
          {changedRows.length + (groupsDirty ? 1 : 0) === 1 ? "" : "s"}
          {groupsDirty ? <span className="ml-1 font-normal text-muted-foreground">(page groups)</span> : null}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setReviewOpen(true)}>
            Review
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => {
              setDraft({});
              setGroupDraft(null);
              toast("Changes discarded");
            }}
          >
            Discard
          </Button>
          <Button size="sm" className="h-8" disabled={busy} onClick={() => void save()}>
            Save
          </Button>
        </div>
      </div>

      {wizard && (
        <PageWizard
          row={wizard.row}
          roles={roles}
          pages={pages}
          groups={[
            ...groups,
            { id: "ungrouped", label: "Ungrouped" },
          ]}
          busy={busy}
          onClose={() => setWizard(null)}
          onSave={(form) => createOrUpdate(form, wizard.row)}
        />
      )}

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Review changes</DialogTitle>
            <DialogDescription>Before → after. Nothing is saved until you press Save.</DialogDescription>
          </DialogHeader>
          <ul className="divide-y divide-border/50 text-[12px]">
            {groupsDirty && (
              <li className="py-2 text-muted-foreground">
                Page groups: {savedGroups.map((group) => group.label).join(" · ")}
                {" → "}
                {groups.map((group) => group.label).join(" · ")}
              </li>
            )}
            {changedRows.map((row) => {
              const before = row.saved;
              const after = valueOf(row);
              const bits: string[] = [];
              if (before.name !== after.name) bits.push(`Name: “${before.name}” → “${after.name}”`);
              if (before.visible !== after.visible) bits.push(after.visible ? "Hidden → Visible" : "Visible → Hidden");
              if (before.everyone !== after.everyone || before.roles.join() !== after.roles.join()) {
                bits.push(
                  `Who can see: ${whoLabel(before)} → ${whoLabel(after)}`,
                );
              }
              if (before.order !== after.order) bits.push(`Position: ${before.order} → ${after.order}`);
              if (before.group !== after.group) {
                bits.push(
                  `Group: ${groupLabel(before.group)} → ${groupLabel(after.group)}`,
                );
              }
              return (
                <li key={row.id} className="py-2">
                  <p className="font-semibold">{row.saved.name}</p>
                  {bits.length ? (
                    bits.map((b) => <p key={b} className="text-muted-foreground">{b}</p>)
                  ) : (
                    <p className="text-muted-foreground">No visible change.</p>
                  )}
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Back</Button>
            <Button
              onClick={() => {
                setReviewOpen(false);
                void save();
              }}
            >
              Save {changedRows.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!hideConfirm} onOpenChange={(o) => !o && setHideConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hide “{hideConfirm ? hideConfirm.row.saved.name : ""}” from every role?</AlertDialogTitle>
            <AlertDialogDescription>
              The page disappears from the sidebar, rail, palette and Quick actions,
              and its URL returns 403. You can restore it here at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!hideConfirm) return;
                setDraft((d) => ({ ...d, [hideConfirm.row.id]: hideConfirm.next }));
                setHideConfirm(null);
              }}
            >
              Hide page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "purge" ? "Delete permanently?" : "Move to Trash?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "purge"
                ? "This cannot be undone."
                : "The page leaves the sidebar at once. It stays in Trash and can be restored."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirm) return;
                const id = confirm.row.id as never;
                if (confirm.kind === "purge") {
                  void purge({ pageId: id }).then(() => toast.success("Deleted"));
                } else {
                  void softDelete({ pageId: id }).then(() =>
                    toast.success("Moved to Trash", {
                      action: { label: "Undo", onClick: () => void restore({ pageId: id }) },
                    }),
                  );
                }
                setConfirm(null);
              }}
            >
              {confirm?.kind === "purge" ? "Delete forever" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={migrateOpen} onOpenChange={setMigrateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Empty role lists → Everyone</DialogTitle>
            <DialogDescription>
              These pages currently have no roles. Preview what changes before you
              confirm; an empty list will never be stored again.
            </DialogDescription>
          </DialogHeader>
          <ul className="divide-y divide-border/50 rounded-lg border border-border/60 text-[12px]">
            {needsMigration.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground">no roles → Everyone</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMigrateOpen(false)}>Cancel</Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await migrate({});
                  toast.success(`${res.changed} page${res.changed === 1 ? "" : "s"} set to Everyone`);
                  setMigrateOpen(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not migrate");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Make them Everyone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FragmentGroup({
  label,
  rows,
  groups,
  roles,
  allRoleKeys,
  valueOf,
  setRow,
  resetRow,
  onEdit,
  onDuplicate,
  onRemove,
}: {
  label: string;
  rows: Row[];
  groups: { id: string; label: string }[];
  roles: WizardRole[];
  allRoleKeys: string[];
  valueOf: (row: Row) => RowDraft;
  setRow: (row: Row, patch: Partial<RowDraft>, confirm?: boolean) => void;
  resetRow: (row: Row) => void;
  onEdit: (row: Row) => void;
  onDuplicate: (row: Row) => void;
  onRemove: (row: Row) => void;
}) {
  const [dragged, setDragged] = useState<string | null>(null);
  const reorder = (id: string, targetIndex: number) => {
    const ordered = [...rows].sort(
      (a, b) => valueOf(a).order - valueOf(b).order || a.builtinOrder - b.builtinOrder,
    );
    const from = ordered.findIndex((row) => row.id === id);
    if (from < 0) return;
    const to = Math.max(0, Math.min(ordered.length - 1, targetIndex));
    if (from === to) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    // Normalise every row in this group so a drop always persists a clear order.
    ordered.forEach((row, index) => {
      if (valueOf(row).order !== (index + 1) * 10) setRow(row, { order: (index + 1) * 10 });
    });
  };
  const moveBy = (id: string, delta: number) => {
    const ordered = [...rows].sort(
      (a, b) => valueOf(a).order - valueOf(b).order || a.builtinOrder - b.builtinOrder,
    );
    const index = ordered.findIndex((row) => row.id === id);
    if (index >= 0) reorder(id, index + delta);
  };
  return (
    <>
      <tr className="border-b border-border/50 bg-muted/50">
        <td colSpan={7} className="sticky left-0 px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          {label}
        </td>
      </tr>
      {rows.map((row) => {
        const v = valueOf(row);
        const Icon = row.icon;
        return (
          <tr
            key={row.id}
            draggable
            onDragStart={() => setDragged(row.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragged) reorder(dragged, rows.findIndex((r) => r.id === row.id));
              setDragged(null);
            }}
            className={cn(
              "group h-11 border-b border-border/40 align-middle last:border-0 hover:bg-muted/25",
              !v.visible && "opacity-70",
            )}
          >
            <td className="cursor-grab px-1 text-muted-foreground active:cursor-grabbing">
              <GripVertical className="size-3.5" />
            </td>
            <td className="px-1">
              <span className="flex size-7 items-center justify-center rounded-md border border-border/60 bg-card text-muted-foreground">
                <Icon className="size-3.5" />
              </span>
            </td>
            <td className="px-2">
              <div className="flex items-center gap-1.5">
                <Input
                  value={v.name}
                  onChange={(e) => setRow(row, { name: e.target.value })}
                  aria-label={`Page label for ${row.route}`}
                  className="h-7 max-w-56 border-transparent bg-transparent px-1 text-[13px] font-semibold shadow-none focus-visible:border-input focus-visible:bg-background"
                />
                {row.kind === "custom" && (
                  <span className="rounded border border-primary/30 bg-primary/10 px-1 text-[9px] font-semibold text-primary">
                    Custom
                  </span>
                )}
                {row.locked && <Lock className="size-3 text-amber-600" />}
              </div>
              <span className="block truncate px-1 text-[10.5px] text-muted-foreground">{row.route}</span>
            </td>
            <td className="px-2">
              <select
                value={v.group}
                disabled={row.locked}
                onChange={(e) => setRow(row, { group: e.target.value })}
                aria-label={`Sidebar group for ${v.name}`}
                className="h-7 max-w-28 rounded-md border border-transparent bg-transparent px-1 text-[11.5px] text-muted-foreground hover:border-input focus-visible:border-input focus-visible:bg-background focus-visible:outline-none"
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
                <option value="ungrouped">Ungrouped</option>
              </select>
            </td>
            <td className="px-2">
              <WhoPopover
                roles={roles}
                allRoleKeys={allRoleKeys}
                value={v}
                disabled={row.locked}
                onChange={(next) => setRow(row, next)}
              />
            </td>
            <td className="px-2 text-center">
              <Switch
                checked={v.visible}
                disabled={row.locked}
                onCheckedChange={(on) => setRow(row, { visible: on }, true)}
                aria-label={`Visible: ${v.name}`}
              />
            </td>
            <td className="px-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="size-7" aria-label={`More for ${v.name}`}>
                    ⋯
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    disabled={rows[0]?.id === row.id}
                    onSelect={() => moveBy(row.id, -1)}
                  >
                    <ChevronUp className="size-3.5" /> Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={rows[rows.length - 1]?.id === row.id}
                    onSelect={() => moveBy(row.id, 1)}
                  >
                    <ChevronDown className="size-3.5" /> Move down
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {row.kind === "custom" ? (
                    <>
                      <DropdownMenuItem onSelect={() => onEdit(row)}>
                        <Pencil className="size-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onDuplicate(row)}>
                        <Copy className="size-3.5" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onSelect={() => onRemove(row)}>
                        <Trash2 className="size-3.5" /> Remove
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuLabel className="text-[10px]">Built-in page</DropdownMenuLabel>
                      <DropdownMenuItem disabled={row.locked} onSelect={() => resetRow(row)}>
                        <RotateCcw className="size-3.5" /> Reset to default
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </tr>
        );
      })}
    </>
  );
}

function WhoPopover({
  roles,
  allRoleKeys,
  value,
  disabled,
  onChange,
}: {
  roles: WizardRole[];
  allRoleKeys: string[];
  value: RowDraft;
  disabled?: boolean;
  onChange: (next: Partial<RowDraft>) => void;
}) {
  const [q, setQ] = useState("");
  const shown = roles.filter((r) => r.label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex h-6 max-w-32 items-center gap-1 truncate rounded-full border px-2 text-[10.5px] font-medium",
            value.everyone
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800"
              : "border-primary/30 bg-primary/10 text-primary",
          )}
        >
          <Users className="size-3" />
          {value.everyone ? "Everyone" : `${value.roles.length} role${value.roles.length === 1 ? "" : "s"}`}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
          <span className="text-[11px] font-semibold">Who can see</span>
          <button
            type="button"
            onClick={() => onChange({ everyone: true, roles: [] })}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              value.everyone ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800" : "border-border/60",
            )}
          >
            Everyone
          </button>
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search roles"
          className="h-7 text-[11px]"
        />
        <ul className="mt-1.5 max-h-48 space-y-0.5 overflow-y-auto">
          {shown.map((r) => {
            const checked = !value.everyone && value.roles.includes(r.key);
            return (
              <li key={r.key}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[11.5px] hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? value.roles.filter((k) => k !== r.key)
                        : [...value.roles.filter((k) => allRoleKeys.includes(k)), r.key];
                      onChange({ everyone: false, roles: next });
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.label}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{r.description}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {!value.everyone && value.roles.length === 0 && (
          <p className="px-1 pt-1 text-[10px] text-destructive">Choose at least one role.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function whoLabel(d: RowDraft) {
  return d.everyone ? "Everyone" : `${d.roles.length} role${d.roles.length === 1 ? "" : "s"}`;
}

/** Custom page glyph (icons are chosen in the wizard). */
function FileIcon({ className }: { className?: string; strokeWidth?: number }) {
  return <Copy className={className} />;
}
