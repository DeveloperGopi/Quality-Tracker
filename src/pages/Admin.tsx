// Admin Settings (State Admin only).
//
// Redesign goals, and where they live in the code:
//   • Four big tabs with icons and count badges, each with a one-line
//     description — no more hunting.
//   • Workspace is split into five sections with a sticky left sub-navigation
//     (horizontal scroll tabs on mobile) instead of one ~20-card scroll.
//   • One “Search settings…” box (Ctrl/Cmd+K) that jumps to any section,
//     dropdown list, dropdown option, column header, visibility row or timing
//     number. Anchors are `data-admin-anchor` attributes rendered by the panels.
//   • Every settings panel feeds ONE page-level draft, shown as a sticky
//     “N unsaved changes — Discard / Save all” bar (components/admin/UnsavedBar)
//     with saving/saved/error states and a leaving warning.
//   • Destructive actions are named, confirmed and hard to hit by accident
//     (delete user / block / PHC dialogs, three-step danger zone).
//
// Nothing about the data model changed: every write still goes through the
// existing `facilities.setSetting`, `facilities.setUserAccess`,
// `facilities.approveUser`, `users.deleteUser`, `ops.removeBlock`,
// `ops.removePhc`, `ops.renameBlock`, `facilities.addBlock`,
// `facilities.addPhc`, `facilities.recomputeAllStatuses`,
// `facilities.requestDeleteAllOtp` and `facilities.deleteAllFacilities`
// mutations/actions, all of which enforce State Admin on the server.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import {
  Check,
  Database,
  Download,
  MoreHorizontal,
  ShieldCheck,
  Users as UsersIcon,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { DEFAULT_SETTINGS, DROPDOWN_GROUPS } from "@/convex/lifecycle";
import {
  ADMIN_TABS,
  WORKSPACE_SECTIONS,
  CYCLE_TIMING_FIELDS,
  buildAdminSearchIndex,
  groupHeaderLabels,
  optionUsageMap,
  settingsExportPayload,
  withPending,
  type AdminSearchEntry,
  type AdminTabId,
  type SettingsDraft,
  type WorkspaceSectionId,
} from "@/lib/adminSettings";
import { HEADER_OVERRIDES_KEY } from "@/lib/tableHeaders";
import { MASTER_TABLE_HEADER_LABELS } from "@/lib/trackerColumns";
import {
  exportFacilitiesBulkProfile,
  trackerRowsToBulkRows,
  type TrackerRowLike,
} from "@/lib/profileExport";
import { useAuth } from "@/hooks/use-auth";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { AdminTabBar } from "@/components/admin/AdminTabBar";
import { UnsavedBar } from "@/components/admin/UnsavedBar";
import { SaveStatePill } from "@/components/admin/AdminUi";
import { MasterDataPanel } from "@/components/admin/MasterDataPanel";
import { MasterDataTree } from "@/components/admin/MasterDataTree";
import { ScopeOptionsPanel } from "@/components/admin/ScopeOptionsPanel";
import { PagesPanel } from "@/components/admin/PagesPanel";
import { UsersPanel } from "@/components/admin/UsersPanel";
import { DropdownListsPanel } from "@/components/admin/DropdownListsPanel";
import { TableHeadersPanel } from "@/components/admin/TableHeadersPanel";
import { CycleTimingPanel } from "@/components/admin/CycleTimingPanel";
import { GoogleDrivePanel } from "@/components/admin/GoogleDrivePanel";
import { DocumentsRulesPanel } from "@/components/admin/DocumentsRulesPanel";
import { PendingRulesPanel } from "@/components/admin/PendingRulesPanel";
import { LinksSettingsPanel } from "@/components/admin/LinksSettingsPanel";
import { SharedReportsPanel } from "@/components/admin/SharedReportsPanel";
import { DataChecksHealth } from "@/components/admin/DataChecksHealth";
import { TableDisplayPanel } from "@/components/admin/TableDisplayPanel";import { DepartmentNamesPanel, type DepartmentName } from "@/components/admin/DepartmentNamesPanel";
import { FiltersPanel } from "@/components/admin/FiltersPanel";
import { DashboardLayoutPanel } from "@/components/admin/DashboardLayoutPanel";
import { MaintenancePanel } from "@/components/admin/MaintenancePanel";
import { ActivityLogPanel } from "@/components/admin/ActivityLogPanel";

/** Human name for a pending setting key — shown in the unsaved bar. */
function settingsLabel(key: string): string {
  for (const group of DROPDOWN_GROUPS) {
    const item = group.items.find((i) => i.key === key);
    if (item) return item.label;
  }
  if (key === HEADER_OVERRIDES_KEY) return "Table headers";
  if (key === "hiddenCategories" || key === "hiddenPages") return "Page visibility";
  const timing = CYCLE_TIMING_FIELDS.find((f) => f.key === key);
  if (timing) return timing.label;
  if (key === "dashboardSectionControls") return "Dashboard layout";
  if (key === "iaTarget") return "IA target %";
  return key;
}

export default function Admin({
  initialTab = "master-data",
  initialSection = "lists",
}: {
  /** Part I — `/admin/google-drive` (and other deep links) open this page on
   *  the right tab instead of a second copy of the settings screens. */
  initialTab?: AdminTabId;
  initialSection?: WorkspaceSectionId;
} = {}) {
  const data = useQuery(api.facilities.getAdminData, {});
  const isAdmin = data?.isAdmin ?? false;
  // Option-usage counts (for the “used by N records” warning) are State-Admin
  // only on the server, so the query is skipped until we know we may read it.
  const usageRows = useQuery(api.ops.getAdminOptionUsage, isAdmin ? {} : "skip");
  // The server sends usage as a row list (see ops.getAdminOptionUsage), because
  // Convex rejects non-ASCII object field names — a value like
  // “Certified — Surveillance Due” used to make that query unserializable and
  // crash this page. Here we index it as setting key → option value → count.
  const usage = useMemo(() => optionUsageMap(usageRows?.entries), [usageRows]);
  const setSetting = useMutation(api.facilities.setSetting);
  const addBlock = useMutation(api.facilities.addBlock);
  const renameBlock = useMutation(api.ops.renameBlock);
  const removeBlock = useMutation(api.ops.removeBlock);
  const addPhc = useMutation(api.facilities.addPhc);
  const removePhc = useMutation(api.ops.removePhc);
  const setUserAccess = useMutation(api.facilities.setUserAccess);
  const approveUser = useMutation(api.facilities.approveUser);
  const deleteUser = useMutation(api.users.deleteUser);
  const recomputeAll = useMutation(api.facilities.recomputeAllStatuses);
  const requestOtp = useAction(api.facilities.requestDeleteAllOtp);
  const deleteAll = useAction(api.facilities.deleteAllFacilities);
  const convex = useConvex();
  const { user } = useAuth();

  // ---------------- navigation ----------------
  // Guide "Open it" links carry ?tab=…; accept a valid tab on first render.
  const urlTab =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("tab");
  const startTab = ADMIN_TABS.some((t) => t.id === urlTab)
    ? (urlTab as AdminTabId)
    : initialTab;
  const [tab, setTab] = useState<AdminTabId>(startTab);
  const [pendingTab, setPendingTab] = useState<AdminTabId | null>(null);
  const [pagesDirty, setPagesDirty] = useState(false);
  const [usersDirty, setUsersDirty] = useState(false);
  const [section, setSection] = useState<WorkspaceSectionId>(initialSection);
  const [focusListKey, setFocusListKey] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // ---------------- one draft for every setting ----------------
  const [draft, setDraft] = useState<SettingsDraft>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const setPending = useCallback((key: string, value: unknown) => {
    setDraft((d) => withPending(d, key, value));
    setSaveState("idle");
    setSaveError(null);
  }, []);

  const pendingKeys = Object.keys(draft);
  // Stable identity: `?? {}` would mint a new object per render and re-run
  // every memo that depends on `settings`.
  const settings = useMemo(() => data?.settings ?? {}, [data?.settings]);
  const pendingLabels = pendingKeys.map(settingsLabel);

  // Ctrl/Cmd+K focuses the settings search from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Warn before a reload/closing the tab while settings are pending.
  useEffect(() => {
    if (pendingKeys.length === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [pendingKeys.length]);

  const saveAll = async () => {
    const keys = Object.keys(draft);
    if (keys.length === 0) return;
    setSaveState("saving");
    setSaveError(null);
    const failed: string[] = [];
    // Sequential on purpose: each write is audit-logged, and a partial failure
    // must leave the remaining changes pending rather than half-applied.
    for (const key of keys) {
      try {
        await setSetting({ key, value: draft[key] });
      } catch (err) {
        failed.push(`${settingsLabel(key)}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }
    if (failed.length > 0) {
      setSaveState("error");
      setSaveError(
        `${failed.length} of ${keys.length} change${keys.length === 1 ? "" : "s"} could not be saved`,
      );
      toast.error("Some changes could not be saved", {
        description: failed.slice(0, 3).join(" · "),
      });
      return;
    }
    setDraft({});
    setSaveState("saved");
    toast.success(`Saved ${keys.length} change${keys.length === 1 ? "" : "s"}`);
    // Let the tick fade back to idle.
    window.setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2500);
  };

  // ---------------- master data ----------------
  const onAddBlock = async (name: string) => {
    setBusy("block");
    try {
      await addBlock({ name });
      toast.success(`Block “${name}” added`);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the block");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const onRenameBlock = async (blockId: string, name: string) => {
    setBusy(`rename-${blockId}`);
    try {
      const r = await renameBlock({ blockId: blockId as Id<"blocks">, name });
      toast.success(
        r.facilities > 0
          ? `Block renamed — ${r.facilities} facilit${r.facilities === 1 ? "y" : "ies"} moved with it`
          : "Block renamed",
      );
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename the block");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const onRemoveBlock = async (blockId: string) => {
    setBusy(`blk-${blockId}`);
    try {
      const r = await removeBlock({ blockId: blockId as Id<"blocks"> });
      toast.success(
        r.removedPhcs > 0
          ? `Block removed with ${r.removedPhcs} PHC entr${r.removedPhcs === 1 ? "y" : "ies"}`
          : "Block removed",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the block");
    } finally {
      setBusy(null);
    }
  };

  const onAddPhc = async (name: string, block: string) => {
    setBusy("phc");
    try {
      await addPhc({ name, block });
      toast.success(`PHC “${name}” added to ${block}`);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the PHC");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const onRemovePhc = async (phcId: string) => {
    setBusy(`phc-${phcId}`);
    try {
      await removePhc({ phcId: phcId as Id<"phcs"> });
      toast.success("PHC removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the PHC");
    } finally {
      setBusy(null);
    }
  };

  // ---------------- scope options ----------------
  const onSaveScopeOptions = async (next: string[]) => {
    try {
      await setSetting({ key: "scopeOptions", value: next });
      toast.success("Scope options saved");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save scope options");
      return false;
    }
  };

  // ---------------- users ----------------
  const onApprove = async (userId: string, appRole: string, blockIds: string[]) => {
    setBusy(userId);
    try {
      await approveUser({ userId: userId as Id<"users">, appRole });
      // Approval only grants the role; the blocks are assigned in a second
      // audited write (same two existing mutations the old page used).
      if (blockIds.length > 0) {
        await setUserAccess({
          userId: userId as Id<"users">,
          blockIds: blockIds as Id<"blocks">[],
        });
      }
      toast.success("Registration approved");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve the user");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const onReject = async (userId: string) => {
    setBusy(userId);
    try {
      await deleteUser({ userId: userId as Id<"users"> });
      toast.success("Registration rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reject the registration");
    } finally {
      setBusy(null);
    }
  };

  const onSaveAccess = async (userId: string, appRole: string, blockIds: string[]) => {
    setBusy(userId);
    try {
      await setUserAccess({
        userId: userId as Id<"users">,
        appRole,
        blockIds: blockIds as Id<"blocks">[],
      });
      toast.success("User access updated");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the user");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const onDeleteUser = async (userId: string) => {
    setBusy(userId);
    try {
      await deleteUser({ userId: userId as Id<"users"> });
      toast.success("User deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the user");
    } finally {
      setBusy(null);
    }
  };

  // ---------------- maintenance ----------------
  const onRecompute = async () => {
    setBusy("recompute");
    try {
      return await recomputeAll({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Recompute failed");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const onRequestOtp = async () => {
    setBusy("otp");
    try {
      const r = await requestOtp({});
      toast.success(`Confirmation code sent to ${r.sentTo} — valid 10 minutes`);
      return r.sentTo as string;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the code");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const onDeleteAll = async (code: string) => {
    setBusy("delete-all");
    try {
      return await deleteAll({ code });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the facilities");
      return null;
    } finally {
      setBusy(null);
    }
  };

  /** One-click backup: the same master-list workbook the Reports page produces
   *  (one row per facility with stage, status, scores and certificate dates).
   *  Fetched on demand so the Admin page carries no facility payload. */
  const onExportBackup = async () => {
    setBusy("backup");
    try {
      const rows = (await convex.query(api.ops.listFacilityRowsFast, {})) as unknown as TrackerRowLike[];
      await exportFacilitiesBulkProfile(trackerRowsToBulkRows(rows), {
        generatedBy: user?.name ?? user?.email ?? "State Admin",
      });
      toast.success(`Backup exported — ${rows.length} facilities`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export the backup");
    } finally {
      setBusy(null);
    }
  };

  /** Export the settings this page owns as a readable JSON snapshot. */
  const onExportSettings = () => {
    const { fileName, json } = settingsExportPayload(
      settings,
      user?.email ?? "State Admin",
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Settings exported");
  };

  // ---------------- search index ----------------
  // Same grouping the Table headers panel renders (lib/adminSettings), so the
  // slug anchors the search index builds always exist in the DOM.
  const headerGroups = useMemo(
    () => groupHeaderLabels(MASTER_TABLE_HEADER_LABELS),
    [],
  );

  const searchIndex = useMemo(
    () =>
      buildAdminSearchIndex({
        // Pending edits win, so searching finds the option you just added.
        listValues: Object.fromEntries(
          DROPDOWN_GROUPS.flatMap((g) => g.items.map((i) => [i.key, [] as string[]])).map(
            ([key]) => [
              key,
              (draft[key as string] as string[] | undefined) ??
                (settings[key as string] as string[] | undefined) ??
                ((DEFAULT_SETTINGS as Record<string, unknown>)[key as string] as string[] | undefined) ??
                [],
            ],
          ),
        ),
        headerLabels: MASTER_TABLE_HEADER_LABELS,
        headerGroups,
        blockCount: data?.blocks.length ?? 0,
        phcCount: data?.phcs.length ?? 0,
        pendingUsers: (data?.users ?? []).filter((u) => !u.approved).length,
      }),
    [draft, settings, headerGroups, data?.blocks, data?.phcs, data?.users],
  );

  const onJump = (entry: AdminSearchEntry) => {
    // The guard applies to search jumps too, not only tab clicks.
    if (entry.tab !== tab && (pagesDirty || usersDirty)) {
      setPendingTab(entry.tab);
      return;
    }
    setTab(entry.tab);
    if (entry.section) setSection(entry.section);
    if (entry.id.startsWith("list-")) setFocusListKey(entry.id.slice("list-".length));
    // Wait for the target tab/section to render, then bring it into view.
    window.setTimeout(() => {
      const el = document.querySelector(`[data-admin-anchor="${entry.id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 90);
  };

  // ---------------- loading / permission ----------------
  if (data === undefined) {
    return (
      <AppShell title="Admin Settings" subtitle="Loading workspace configuration…">
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!data.isAdmin) {
    return (
      <AppShell title="Admin Settings">
        <Card className="glass max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4" /> State Admin only
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your account does not have the State Admin role. Ask an existing
            admin to grant you access from this page.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const pendingUsers = data.users.filter((u) => !u.approved).length;
  const approvedUsers = data.users.length - pendingUsers;
  const workspacePending = pendingKeys.filter((k) =>
    [HEADER_OVERRIDES_KEY, "dashboardSectionControls", "blockCompareFacilityType", "blockCompareCycle"]
      .concat(CYCLE_TIMING_FIELDS.map((f) => f.key))
      .concat(DROPDOWN_GROUPS.flatMap((g) => g.items.map((i) => i.key)))
      .includes(k),
  ).length;

  const tabNeedsAttention = (id: AdminTabId) => {
    if (id === "users") return pendingUsers > 0 ? `${pendingUsers} pending` : null;
    if (id === "workspace") return workspacePending > 0 ? `${workspacePending} unsaved` : null;
    if (id === "pages") return pagesDirty ? "unsaved" : null;
    return null;
  };

  const switchTab = (next: AdminTabId) => {
    if (next === tab) return;
    if (pagesDirty || usersDirty) {
      setPendingTab(next);
      return;
    }
    setTab(next);
  };

  return (
    <AppShell
      title="Admin Settings"
      subtitle="Master data, users, pages and workspace configuration"
      guideRoute={`/admin?tab=${tab}`}
      actions={
        <div className="flex items-center gap-2">
          <div className="w-64 sm:w-80 lg:w-96">
            <AdminSearch entries={searchIndex} onJump={onJump} inputRef={searchRef} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-10" aria-label="Admin options">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onExportSettings}>
                <Download className="size-4" /> Export settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="space-y-4">

        {/* ---------------- Tabs ---------------- */}
        <Tabs value={tab} onValueChange={(v) => switchTab(v as AdminTabId)} className="space-y-4">
          <AdminTabBar needsAttention={tabNeedsAttention} />

          {/* ---------------- Master data ---------------- */}
          <TabsContent value="master-data" className="scroll-mt-28 space-y-3">
            <MasterDataTree />
            <ScopeOptionsPanel
              value={
                (settings.scopeOptions as string[] | undefined) ??
                DEFAULT_SETTINGS.scopeOptions
              }
              onSave={onSaveScopeOptions}
            />
            <DepartmentNamesPanel
              value={settings.departmentNames ?? DEFAULT_SETTINGS.departmentNames}
              onSave={async (rows: DepartmentName[]) => {
                await setSetting({ key: "departmentNames", value: rows });
              }}
            />
          </TabsContent>

          {/* ---------------- Pages ---------------- */}
          <TabsContent value="pages" className="space-y-3">
            <PagesPanel onDirtyChange={setPagesDirty} />
          </TabsContent>

          {/* ---------------- Users ---------------- */}
          <TabsContent value="users" className="space-y-3">
            <UsersPanel
              users={data.users}
              blocks={data.blocks}
              meId={data.me.id}
              busy={busy}
              onApprove={onApprove}
              onReject={onReject}
              onSaveAccess={onSaveAccess}
              onDelete={onDeleteUser}
              onDirtyChange={setUsersDirty}
            />
          </TabsContent>

          {/* ---------------- Documents (Part C) ---------------- */}
          <TabsContent value="documents" className="space-y-3">
            <DocumentsRulesPanel />
            <SharedReportsPanel />
          </TabsContent>

          {/* ---------------- Pending rules (single registry) ---------------- */}
          <TabsContent value="pending" className="space-y-3">
            <PendingRulesPanel />
          </TabsContent>

          {/* ---------------- Google Drive (Part I ①) ---------------- */}
          <TabsContent value="google-drive" className="space-y-3">
            <GoogleDrivePanel />
          </TabsContent>

          {/* ---------------- Links Organiser ---------------- */}
          <TabsContent value="links" className="space-y-3">
            <LinksSettingsPanel />
          </TabsContent>

          {/* ---------------- Data checks (Part H) ---------------- */}
          <TabsContent value="data-checks" className="space-y-4">
            <DataChecksHealth />
          </TabsContent>

          {/* ---------------- Workspace: one section at a time ---------------- */}
          <TabsContent value="workspace">
            <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
              <nav
                aria-label="Workspace sections"
                className="lg:sticky lg:top-36 lg:self-start"
              >
                <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
                  {WORKSPACE_SECTIONS.map((s) => {
                    const Icon = s.icon;
                    const active = section === s.id;
                    const pendingInSection = pendingKeys.filter((k) =>
                      SETTING_KEYS_BY_SECTION[s.id].includes(k),
                    ).length;
                    return (
                      <li key={s.id} className="shrink-0 lg:shrink">
                        <button
                          type="button"
                          onClick={() => setSection(s.id)}
                          data-guide-target={`workspace-${s.id}`}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:whitespace-normal",
                            active
                              ? "border-primary/40 bg-primary/10 text-foreground"
                              : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="min-w-0 flex-1 text-left">{s.label}</span>
                          {pendingInSection > 0 && (
                            <span className="rounded-full border border-amber-300/70 bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100">
                              {pendingInSection}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 hidden text-xs text-muted-foreground lg:block">
                  One section at a time — no long scroll. Use the search box
                  (Ctrl/Cmd+K) to jump straight to any setting.
                </p>
              </nav>

              <div className="min-w-0">
                {section === "lists" && (
                  <DropdownListsPanel
                    settings={settings}
                    usage={usage}
                    draft={draft}
                    setPending={setPending}
                    focusKey={focusListKey}
                  />
                )}
                {section === "headers" && (
                  <TableHeadersPanel
                    settings={settings}
                    draft={draft}
                    setPending={setPending}
                  />
                )}
                {section === "timing" && (
                  <CycleTimingPanel
                    settings={settings}
                    draft={draft}
                    setPending={setPending}
                  />
                )}
                {section === "display" && (
                  <TableDisplayPanel
                    settings={settings}
                    draft={draft}
                    setPending={setPending}
                  />
                )}
                {section === "filters" && (
                  <FiltersPanel
                    settings={settings}
                    draft={draft}
                    setPending={setPending}
                  />
                )}
                {section === "drive" && <GoogleDrivePanel />}
                {section === "dashboard" && (
                  <DashboardLayoutPanel
                    enabled={Boolean(
                      settings.dashboardSectionControls ??
                        DEFAULT_SETTINGS.dashboardSectionControls,
                    )}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          {/* ---------------- Maintenance ---------------- */}
          <TabsContent value="maintenance" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wrench className="size-4" aria-hidden />
                Recompute derived statuses, review the activity log, or wipe the
                facility data.
              </p>
              <SaveStatePill state={saveState} />
            </div>
            <MaintenancePanel
              busy={busy}
              onRecompute={onRecompute}
              onRequestOtp={onRequestOtp}
              onDeleteAll={onDeleteAll}
              onExportBackup={onExportBackup}
            />
            <ActivityLogPanel />
          </TabsContent>
        </Tabs>

        {/* Saved confirmation for the workspace sections. */}
        {saveState !== "idle" && tab !== "maintenance" && (
          <div className="flex items-center gap-3">
            <SaveStatePill
              state={saveState}
              onRetry={() => {
                setSaveError(null);
                void saveAll();
              }}
            />
            {saveState === "saved" && pendingKeys.length === 0 && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="size-4 text-emerald-600" /> Everything you changed
                is stored and audit-logged.
              </span>
            )}
          </div>
        )}

        {/* ---------------- Sticky unsaved-changes bar ---------------- */}
        <UnsavedBar
          count={pendingKeys.length}
          saving={saveState === "saving"}
          error={saveError}
          labels={pendingLabels}
          onSave={() => void saveAll()}
          onDiscard={() => {
            setDraft({});
            setSaveState("idle");
            setSaveError(null);
            toast("Changes discarded", {
              description: "Every setting is back to its saved value.",
            });
          }}
        />

        {pendingKeys.length === 0 && saveState === "idle" && tab !== "maintenance" && tab !== "master-data" && tab !== "pages" && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="size-3.5" aria-hidden />
            {approvedUsers} approved user{approvedUsers === 1 ? "" : "s"} ·{" "}
            <UsersIcon className="size-3.5" aria-hidden />
            all changes are audit-logged
          </p>
        )}

        <AlertDialog open={pendingTab !== null} onOpenChange={(o) => !o && setPendingTab(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
              <AlertDialogDescription>
                Your page or user draft still has unsaved changes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingTab) setTab(pendingTab);
                  setPendingTab(null);
                  setPagesDirty(false);
                  setUsersDirty(false);
                }}
              >
                Discard and leave
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}

/** Which setting keys each workspace section owns — used for the little
 *  per-section “unsaved” counter in the sub-navigation. */
const SETTING_KEYS_BY_SECTION: Record<WorkspaceSectionId, string[]> = {
  lists: DROPDOWN_GROUPS.flatMap((g) => g.items.map((i) => i.key)),
  headers: [HEADER_OVERRIDES_KEY],
  display: [
    "facilityStyle",
    "rowActionColumn",
    "frozenColumns",
    "freezeBelowPx",
    "recentlyUpdatedDays",
    "highlightScope",
    "trackUpdates",
  ],
  filters: ["blockCompareFacilityType", "blockCompareCycle"],
  timing: CYCLE_TIMING_FIELDS.map((f) => f.key),
  // Drive settings save immediately through drive.saveDriveSettings (audited),
  // so they are not part of the page-level appSettings draft.
  drive: [],
  dashboard: ["dashboardSectionControls"],
};
