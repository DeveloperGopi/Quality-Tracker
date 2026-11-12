/**
 * ADMIN → USERS AND ROLES.
 *
 * One draft for every row, one sticky Save. Role and blocks changes are held
 * in the browser until Save (the old page saved them per row, which is why
 * unsaved edits vanished when you changed tabs). The server still enforces
 * self-demotion, the last State Admin, block scope and disable.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Ban,
  Check,
  Download,
  KeyRound,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UniversalFilterBar,
  rowPasses,
  type BarValue,
  type FilterField,
} from "@/components/UniversalFilterBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { relativeTime, parseDevice } from "@/lib/profileConfig";
import { CAPABILITIES, DEFAULT_ROLES, ROLE_LABEL_FALLBACK } from "@/lib/permissions";
import { SessionCleanupPanel } from "./SessionCleanupPanel";

type BlockOption = { _id: string; name: string; count: number };
type UserRow = {
  _id: string;
  name: string | null;
  email: string | null;
  appRole: string | null;
  approved: boolean;
  disabled: boolean;
  lastActive: number | null;
  blockIds: string[];
  designation: string | null;
};

type RoleRow = { key: string; label: string; description: string; sort: number };
type UserDraft = { appRole: string; blockIds: string[] };
type InviteRow = {
  id: string;
  email: string;
  appRole: string;
  blockIds: string[];
  blockNames: string[];
  invitedByName: string;
  createdAt: number;
};

const initials = (u: UserRow) =>
  (u.name ?? u.email ?? "U")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const sameDraft = (a: UserDraft, b: UserDraft) =>
  a.appRole === b.appRole &&
  a.blockIds.length === b.blockIds.length &&
  a.blockIds.every((id) => b.blockIds.includes(id));

const roleTone: Record<string, string> = {
  admin: "border-amber-500/40 bg-amber-500/10 text-amber-900",
  dqc: "border-violet-500/40 bg-violet-500/10 text-violet-800",
  dqmo: "border-sky-500/40 bg-sky-500/10 text-sky-800",
  entry: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800",
  viewer: "border-border bg-muted text-muted-foreground",
};

export function UsersPanel({
  users,
  blocks,
  meId,
  onSaveAccess,
  onApprove,
  onReject,
  onDelete,
  onDirtyChange,
}: {
  users: UserRow[];
  blocks: BlockOption[];
  meId: string;
  onSaveAccess: (userId: string, role: string, blockIds: string[]) => Promise<boolean>;
  onApprove: (userId: string, role: string, blockIds: string[]) => Promise<boolean>;
  onReject: (userId: string) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  busy?: string | null;
}) {
  const rolesQ = useQuery(api.roles.list, {});
  const invitesQ = useQuery(api.users.invitations, {});
  const sessionsQ = useQuery(api.users.adminSessions, {});
  const invite = useMutation(api.users.inviteUser);
  const revokeInvite = useMutation(api.users.revokeInvitation);
  const setDisabled = useMutation(api.users.setUserDisabled);
  const signOutSession = useMutation(api.users.adminSignOutSession);
  const signOutAll = useMutation(api.users.signOutUserEverywhere);

  const roles = (rolesQ ?? []) as RoleRow[];
  const roleLabel = (key: string) =>
    roles.find((r) => r.key === key)?.label ?? ROLE_LABEL_FALLBACK[key] ?? key;
  const blocksLabel = (ids: string[]) =>
    ids.length
      ? ids.map((id) => blocks.find((b) => b._id === id)?.name ?? "Block").join(", ")
      : "All blocks";
  const invites = (invitesQ ?? []) as InviteRow[];
  const allUsers = users as UserRow[];
  const approved = allUsers.filter((u) => u.approved);
  const pending = allUsers.filter((u) => !u.approved);
  const active = approved.filter((u) => u.appRole != null);
  const admins = active.filter((u) => u.appRole === "admin" && !u.disabled);

  const [draft, setDraft] = useState<Record<string, UserDraft>>({});
  const [search, setSearch] = useState("");
  const [bar, setBar] = useState<BarValue>(() => ({
    barKeys: ["role", "status", "search"],
    filters: [],
    match: "all",
  }));
  const [tab, setTab] = useState("users");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [drawerUser, setDrawerUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);

  const savedOf = (u: UserRow): UserDraft => ({
    appRole: u.appRole ?? "viewer",
    blockIds: u.blockIds,
  });
  const valueOf = (u: UserRow) => draft[u._id] ?? savedOf(u);
  const changed = active.filter((u) => !sameDraft(valueOf(u), savedOf(u)));
  const dirty = changed.length > 0;

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

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of active) {
      const key = (u.name ?? "").trim().toLowerCase();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [active]);

  const fields = useMemo<FilterField[]>(() => {
    const roleOptions = roles.map((role) => ({ value: role.key, label: role.label }));
    return [
      {
        key: "role",
        label: "Role",
        type: "select",
        onThisPage: true,
        options: roleOptions,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        onThisPage: true,
        options: [{ value: "Active" }, { value: "Disabled" }],
      },
      { key: "block", label: "Block", type: "text", onThisPage: true },
      { key: "name", label: "Name", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "designation", label: "Designation", type: "text" },
      { key: "search", label: "Search", type: "text" },
    ];
  }, [roles]);

  const valueFor = (u: UserRow, key: string): string => {
    if (key === "role") return u.appRole ?? "";
    if (key === "status") return u.disabled ? "Disabled" : "Active";
    if (key === "block") return blocksLabel(u.blockIds);
    if (key === "name") return u.name ?? "";
    if (key === "email") return u.email ?? "";
    if (key === "designation") return u.designation ?? "";
    if (key === "search") {
      return `${u.name ?? ""} ${u.email ?? ""} ${u.designation ?? ""} ${roleLabel(valueOf(u).appRole)} ${blocksLabel(u.blockIds)}`;
    }
    return "";
  };

  const q = search.trim().toLowerCase();
  const structured = active.filter((u) =>
    rowPasses(bar.filters, bar.match, (key) => valueFor(u, key)),
  );
  const shown = structured.filter((u) =>
    !q || valueFor(u, "search").toLowerCase().includes(q),
  );

  const setRow = (u: UserRow, patch: Partial<UserDraft>) =>
    setDraft((d) => ({ ...d, [u._id]: { ...savedOf(u), ...d[u._id], ...patch } }));

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    let failed = 0;
    for (const u of changed) {
      const v = valueOf(u);
      const ok = await onSaveAccess(u._id, v.appRole, v.blockIds);
      if (!ok) failed += 1;
    }
    setSaving(false);
    if (failed === 0) {
      setDraft({});
      toast.success(`Saved ${changed.length} change${changed.length === 1 ? "" : "s"}`);
    } else {
      toast.error(`${failed} change${failed === 1 ? "" : "s"} could not be saved`);
    }
  };

  const exportUsers = () => {
    const header = "Name,Email,Role,Status,Blocks,Last active";
    const lines = active.map((u) => {
      const v = valueOf(u);
      const names = v.blockIds.length
        ? v.blockIds.map((id) => blocks.find((b) => b._id === id)?.name ?? id).join(" | ")
        : "All blocks";
      return [u.name ?? "", u.email ?? "", roleLabel(v.appRole), u.disabled ? "Disabled" : "Active", names, u.lastActive ? new Date(u.lastActive).toISOString() : ""]
        .map((x) => `"${String(x).replace(/"/g, '""')}"`)
        .join(",");
    });
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Users exported");
  };

  return (
    <div className="space-y-3">
      {/* header chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] font-medium">
          {active.length + invites.length + pending.length} user{active.length + invites.length + pending.length === 1 ? "" : "s"}
        </span>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-900">
          {admins.length} State Admin{admins.length === 1 ? "" : "s"}
        </span>
        <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {pending.length} pending
        </span>
        {admins.length === 1 && (
          <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-900">
            Only 1 State Admin. Add a second one so access can be recovered.
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-8"
            onClick={() => setInviteOpen(true)}
            data-guide-target="users-invite"
          >
            <Plus className="mr-1 size-3.5" /> Invite user
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" className="size-8" aria-label="User options">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportUsers}>
                <Download className="size-3.5" /> Export users
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {pending.length > 0 && (
        <button
          type="button"
          data-admin-anchor="users-pending"
          onClick={() => setPendingOpen(true)}
          className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-1.5 text-left text-[12px] text-amber-950 hover:bg-amber-100"
        >
          <span className="font-semibold">
            {pending.length} {pending.length === 1 ? "person is" : "people are"} waiting
          </span>
          <span className="text-amber-800">·</span>
          <span className="font-medium underline underline-offset-2">Review</span>
        </button>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles &amp; permissions</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-2">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or role…"
              className="h-9 pl-8 text-[12.5px]"
            />
          </div>

          <UniversalFilterBar
            pageKey="admin.users"
            fields={fields}
            value={bar}
            onChange={setBar}
            summary={`Showing ${shown.length} of ${active.length}`}
          />

          <section
            data-admin-anchor="users-access"
            className="overflow-hidden rounded-xl border border-border/60 bg-background/60"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-left text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                    <th className="px-2.5 py-2">User</th>
                    <th className="w-32 px-2 py-2">Role</th>
                    <th className="w-32 px-2 py-2">Blocks</th>
                    <th className="w-28 px-2 py-2">Last active</th>
                    <th className="w-20 px-2 py-2">Status</th>
                    <th className="w-10 px-1 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((u) => {
                    const v = valueOf(u);
                    const sameName = duplicateNames.has((u.name ?? "").trim().toLowerCase());
                    const blockNames = v.blockIds.map(
                      (id) => blocks.find((b) => b._id === id)?.name ?? "Block",
                    );
                    return (
                      <tr
                        key={u._id}
                        onClick={() => setDrawerUser(u)}
                        className="h-14 cursor-pointer border-b border-border/40 align-middle last:border-0 hover:bg-muted/25"
                      >
                        <td className="px-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                              {initials(u)}
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate text-[13px] font-semibold">
                                  {u.name ?? "Unnamed user"}
                                </span>
                                {sameName && (
                                  <span
                                    data-testid="same-name-chip"
                                    className="rounded border border-amber-400/50 bg-amber-50 px-1 text-[9px] font-semibold whitespace-nowrap text-amber-900"
                                  >
                                    Same name as another user
                                  </span>
                                )}
                              </span>
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {u.email ?? "No email"}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-2" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                disabled={u._id === meId}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold disabled:opacity-60",
                                  roleTone[v.appRole] ?? roleTone.viewer,
                                )}
                              >
                                <ShieldCheck className="size-3" />
                                {roleLabel(v.appRole)}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuLabel>Change role</DropdownMenuLabel>
                              {roles.map((r) => (
                                <DropdownMenuItem
                                  key={r.key}
                                  onSelect={() => setRow(u, { appRole: r.key })}
                                >
                                  {r.label}
                                  {v.appRole === r.key && <Check className="ml-auto size-3.5" />}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="px-2" onClick={(e) => e.stopPropagation()}>
                          <BlocksPopover
                            blocks={blocks}
                            value={v.blockIds}
                            onChange={(ids) => setRow(u, { blockIds: ids })}
                          />
                        </td>
                        <td className="px-2 text-[11.5px] text-muted-foreground">
                          {relativeTime(u.lastActive)}
                        </td>
                        <td className="px-2">
                          <span
                            className={cn(
                              "rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                              u.disabled
                                ? "border-rose-400/50 bg-rose-50 text-rose-800"
                                : "border-emerald-400/50 bg-emerald-50 text-emerald-800",
                            )}
                          >
                            {u.disabled ? "Disabled" : "Active"}
                          </span>
                        </td>
                        <td className="px-1" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="size-7" aria-label={`More for ${u.name ?? u.email}`}>
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onSelect={() => setDrawerUser(u)}>
                                <UserRound className="size-3.5" /> Open details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={u._id === meId}
                                onSelect={() => void setDisabled({ userId: u._id as Id<"users">, disabled: !u.disabled }).then(() => toast.success(u.disabled ? "Account enabled" : "Account disabled"))}
                              >
                                <Ban className="size-3.5" />
                                {u.disabled ? "Enable" : "Disable"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={u._id === meId}
                                onSelect={() => void signOutAll({ userId: u._id as Id<"users"> }).then((r) => toast.success(`Signed out ${r.removed} session${r.removed === 1 ? "" : "s"}`))}
                              >
                                <LogOut className="size-3.5" /> Sign out everywhere
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                disabled={u._id === meId}
                                onSelect={() => setDeleteUser(u)}
                              >
                                <Trash2 className="size-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                  {invites.map((i) => (
                    <tr key={`invite-${i.id}`} className="h-14 border-b border-border/40 last:border-0">
                      <td className="px-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                            <KeyRound className="size-3.5" />
                          </span>
                          <span>
                            <span className="block text-[13px] font-semibold">{i.email}</span>
                            <span className="block text-[11px] text-muted-foreground">
                              Invited by {i.invitedByName}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-2">
                        <span className={cn("rounded-full border px-2 py-0.5 text-[10.5px] font-semibold", roleTone[i.appRole] ?? roleTone.viewer)}>
                          {roleLabel(i.appRole)}
                        </span>
                      </td>
                      <td className="px-2 text-[11.5px] text-muted-foreground">
                        {i.blockNames.length ? i.blockNames.join(", ") : "All blocks"}
                      </td>
                      <td className="px-2 text-[11.5px] text-muted-foreground">—</td>
                      <td className="px-2">
                        <span className="rounded-full border border-sky-400/50 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-800">
                          Invited
                        </span>
                      </td>
                      <td className="px-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px]"
                          onClick={() => void revokeInvite({ invitationId: i.id as Id<"invitations"> }).then(() => toast.success("Invitation revoked"))}
                        >
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && invites.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No users match.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="roles">
          <RolesMatrix roles={roles} />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-3">
          <SessionsByUser
            sessions={(sessionsQ ?? []) as AdminSession[]}
            meId={meId}
            onSignOut={(id) => void signOutSession({ sessionId: id as Id<"authSessions"> }).then(() => toast.success("Session signed out"))}
          />
          <SessionCleanupPanel />
        </TabsContent>
      </Tabs>

      {/* save bar */}
      <div
        className={cn(
          "sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 backdrop-blur-md transition-all",
          dirty ? "border-primary/40 bg-card/95" : "pointer-events-none border-transparent bg-transparent opacity-0",
        )}
      >
        <span className="text-[12.5px] font-semibold">
          {changed.length} change{changed.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex gap-1.5">
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setReviewOpen(true)}>
            Review
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => {
              setDraft({});
              toast("Changes discarded");
            }}
          >
            Discard
          </Button>
          <Button size="sm" className="h-8" disabled={saving} onClick={() => void save()}>
            Save
          </Button>
        </div>
      </div>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        roles={roles}
        blocks={blocks}
        onInvite={async (email, role, blockIds) => {
          try {
            await invite({ email, appRole: role, blockIds: blockIds as Id<"blocks">[] });
            toast.success(`Invited ${email} — access is ready when they sign up`);
            setInviteOpen(false);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not invite");
          }
        }}
      />

      <PendingDialog
        open={pendingOpen}
        onOpenChange={setPendingOpen}
        pending={pending}
        roles={roles}
        blocks={blocks}
        onApprove={onApprove}
        onReject={onReject}
      />

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Review changes</DialogTitle>
            <DialogDescription>
              Before → after. Nothing is saved until you press Save; Undo removes
              one row from this draft.
            </DialogDescription>
          </DialogHeader>
          <ul className="divide-y divide-border/50 text-[12px]">
            {changed.map((u) => {
              const before = savedOf(u);
              const after = valueOf(u);
              return (
                <li key={u._id} className="flex items-start gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{u.name ?? u.email}</p>
                    <p className="text-muted-foreground">
                      Role: {roleLabel(before.appRole)} → {roleLabel(after.appRole)}
                    </p>
                    <p className="text-muted-foreground">
                      Blocks: {blocksLabel(before.blockIds)} → {blocksLabel(after.blockIds)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    onClick={() =>
                      setDraft((d) => {
                        const next = { ...d };
                        delete next[u._id];
                        return next;
                      })
                    }
                  >
                    Undo
                  </Button>
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
              Save {changed.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={async (email) => {
          if (!deleteUser) return;
          if (email.trim().toLowerCase() !== (deleteUser.email ?? "").trim().toLowerCase()) {
            toast.error("Type the account email exactly");
            return;
          }
          await onDelete(deleteUser._id);
          setDeleteUser(null);
        }}
      />

      <UserDrawer
        user={drawerUser}
        meId={meId}
        roles={roles}
        blocks={blocks}
        sessions={(sessionsQ ?? []) as AdminSession[]}
        onClose={() => setDrawerUser(null)}
        onSignOut={(id) => void signOutSession({ sessionId: id as Id<"authSessions"> }).then(() => toast.success("Session signed out"))}
        onDisable={async (disabled) => {
          if (!drawerUser) return;
          try {
            await setDisabled({ userId: drawerUser._id as Id<"users">, disabled });
            setDrawerUser({ ...drawerUser, disabled });
            toast.success(disabled ? "Account disabled — signed out at once" : "Account enabled");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not change the account");
          }
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Roles & permissions                                                 */
/* ------------------------------------------------------------------ */

function RolesMatrix({ roles }: { roles: RoleRow[] }) {
  const scope = (key: string) =>
    DEFAULT_ROLES.find((r) => r.key === key)?.blockScope ?? "Check";
  return (
    <section className="space-y-2">
      <div className="rounded-xl border border-border/60 bg-background/60 p-3">
        <h3 className="text-sm font-semibold">Roles and what the API allows</h3>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
          Read-only. Generated from the same permission table the guide uses;
          rows marked <strong>Check</strong> could not be verified against a server guard.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {roles.map((r) => (
            <span key={r.key} className="rounded-lg border border-border/60 bg-card px-2 py-1 text-[11px]">
              <span className="font-semibold">{r.label}</span>
              <span className="ml-1 text-muted-foreground">{r.description}</span>
              <span className="ml-1 rounded bg-muted px-1 text-[9.5px]">{scope(r.key)}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/60">
        <table className="w-full min-w-[640px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-left text-[10px] tracking-wide text-muted-foreground uppercase">
              <th className="px-2.5 py-2">Capability</th>
              {roles.map((r) => (
                <th key={r.key} className="px-2 py-2 text-center">{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((cap) => (
              <tr key={cap.id} className="border-b border-border/40 last:border-0">
                <td className="px-2.5 py-1.5">
                  <span className="block font-medium">{cap.label}</span>
                  <span className="block text-[10.5px] text-muted-foreground">{cap.description}</span>
                </td>
                {roles.map((r) => {
                  const allowed = cap.roles.includes(r.key as never);
                  const uncertain = allowed && !cap.verified;
                  return (
                    <td key={r.key} className="px-2 py-1.5 text-center">
                      {allowed ? (
                        uncertain ? (
                          <span className="rounded border border-amber-400/50 bg-amber-50 px-1 text-[9.5px] font-semibold text-amber-900">
                            Check
                          </span>
                        ) : (
                          <Check className="mx-auto size-3.5 text-emerald-600" />
                        )
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sessions                                                           */
/* ------------------------------------------------------------------ */

type AdminSession = {
  id: string;
  userId: string;
  current: boolean;
  name: string | null;
  email: string | null;
  appRole: string | null;
  createdAt: number;
  expiresAt: number;
  lastActive: number | null;
  userAgent: string | null;
};

function SessionsByUser({
  sessions,
  meId,
  onSignOut,
}: {
  sessions: AdminSession[];
  meId: string;
  onSignOut: (id: string) => void;
}) {
  const groups = new Map<string, AdminSession[]>();
  for (const s of sessions) {
    const key = s.email ?? s.userId;
    const cur = groups.get(key) ?? [];
    cur.push(s);
    groups.set(key, cur);
  }
  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-background/60" data-testid="admin-sessions">
      <div className="border-b border-border/60 px-3 py-2">
        <h3 className="text-sm font-semibold">Active sessions by user</h3>
        <p className="text-[11px] text-muted-foreground">
          Sign out one device at a time. Expiry and Prune are below.
        </p>
      </div>
      {sessions.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No active sessions.</p>
      ) : (
        [...groups.entries()].map(([key, list]) => (
          <div key={key}>
            <div className="flex items-center justify-between gap-2 bg-muted/40 px-3 py-1">
              <span className="text-[11.5px] font-semibold">
                {list[0]?.name ?? list[0]?.email ?? key}
                <span className="ml-1.5 font-normal text-muted-foreground">{list[0]?.email}</span>
              </span>
              <span className="text-[10px] text-muted-foreground">{list.length} session{list.length === 1 ? "" : "s"}</span>
            </div>
            <ul className="divide-y divide-border/40">
              {list.map((s) => {
                const device = parseDevice(s.userAgent);
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-[11.5px]">
                    <span className="min-w-0 flex-1 truncate">
                      {device.browser} · {device.os}
                    </span>
                    <span className="text-muted-foreground">
                      {s.lastActive ? relativeTime(s.lastActive) : `started ${relativeTime(s.createdAt)}`}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10.5px]"
                      disabled={s.current}
                      onClick={() => onSignOut(s.id)}
                    >
                      Sign out
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Blocks popover                                                      */
/* ------------------------------------------------------------------ */

function BlocksPopover({
  blocks,
  value,
  onChange,
}: {
  blocks: BlockOption[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  // An empty list means every block, in the API and on screen.
  const all = value.length === 0;
  const shown = blocks.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()));
  const label = all
    ? "All blocks"
    : value.length === 1
      ? blocks.find((b) => b._id === value[0])?.name ?? "1 block"
      : `${value.length} blocks`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex max-w-32 items-center gap-1 truncate rounded-full border border-border/60 bg-card px-2 py-0.5 text-[10.5px] font-medium hover:bg-muted"
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold">Blocks</span>
          <label className="flex items-center gap-1.5 text-[10.5px] font-medium">
            <input
              type="checkbox"
              checked={all}
              disabled={all}
              onChange={() => undefined}
            />
            All blocks
          </label>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search blocks"
          className="mt-1.5 h-7 text-[11px]"
        />
        <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto">
          {shown.map((b) => {
            const checked = !all && value.includes(b._id);
            return (
              <li key={b._id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-0.5 text-[11.5px] hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange(
                        checked ? value.filter((id) => id !== b._id) : [...value, b._id],
                      )
                    }
                  />
                  <span className="flex-1 truncate">{b.name}</span>
                  <span className="text-[10px] text-muted-foreground">{b.count}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Dialogs                                                             */
/* ------------------------------------------------------------------ */

function InviteDialog({
  open,
  onOpenChange,
  roles,
  blocks,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roles: RoleRow[];
  blocks: BlockOption[];
  onInvite: (email: string, role: string, blockIds: string[]) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [blockIds, setBlockIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setEmail("");
      setRole("viewer");
      setBlockIds([]);
    }
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>
            The invitation pre-approves the sign-up: the account activates with
            this role and these blocks the first time the email signs in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-[11px] font-medium">
            Email
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="name@example.com" />
          </label>
          <label className="text-[11px] font-medium">
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <div>
            <p className="text-[11px] font-medium">Blocks</p>
            <div className="mt-1 grid max-h-32 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-border/60 p-2">
              {blocks.map((b) => (
                <label key={b._id} className="flex items-center gap-1.5 text-[11px]">
                  <input
                    type="checkbox"
                    checked={blockIds.includes(b._id)}
                    onChange={() =>
                      setBlockIds((cur) =>
                        cur.includes(b._id) ? cur.filter((x) => x !== b._id) : [...cur, b._id],
                      )
                    }
                  />
                  {b.name}
                </label>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              No blocks = all blocks for state-wide roles.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={busy || !email.trim()}
            onClick={async () => {
              setBusy(true);
              await onInvite(email.trim(), role, blockIds);
              setBusy(false);
            }}
          >
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingDialog({
  open,
  onOpenChange,
  pending,
  roles,
  blocks,
  onApprove,
  onReject,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pending: UserRow[];
  roles: RoleRow[];
  blocks: BlockOption[];
  onApprove: (userId: string, role: string, blockIds: string[]) => Promise<boolean>;
  onReject: (userId: string) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pending registrations</DialogTitle>
          <DialogDescription>Approve with a role and blocks, or reject.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border/50">
          {pending.map((u) => (
            <PendingRow
              key={u._id}
              user={u}
              roles={roles}
              blocks={blocks}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingRow({
  user,
  roles,
  blocks,
  onApprove,
  onReject,
}: {
  user: UserRow;
  roles: RoleRow[];
  blocks: BlockOption[];
  onApprove: (userId: string, role: string, blockIds: string[]) => Promise<boolean>;
  onReject: (userId: string) => Promise<void>;
}) {
  const [role, setRole] = useState("entry");
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  return (
    <li className="space-y-1.5 py-2">
      <p className="text-[12.5px] font-semibold">{user.name ?? user.email}</p>
      <p className="text-[11px] text-muted-foreground">{user.email}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-7 rounded border border-input bg-background px-1 text-[11px]"
        >
          {roles.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-[11px]">
              {ids.length ? `${ids.length} blocks` : "All blocks"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            <ul className="max-h-40 space-y-0.5 overflow-y-auto">
              {blocks.map((b) => (
                <li key={b._id}>
                  <label className="flex items-center gap-1.5 text-[11px]">
                    <input
                      type="checkbox"
                      checked={ids.includes(b._id)}
                      onChange={() =>
                        setIds((cur) => (cur.includes(b._id) ? cur.filter((x) => x !== b._id) : [...cur, b._id]))
                      }
                    />
                    {b.name}
                  </label>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
        <Button
          size="sm"
          className="h-7 text-[11px]"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const ok = await onApprove(user._id, role, ids);
            setBusy(false);
            if (ok) toast.success("Registration approved");
          }}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[11px] text-destructive"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onReject(user._id);
            setBusy(false);
          }}
        >
          Reject
        </Button>
      </div>
    </li>
  );
}

function DeleteDialog({
  user,
  onClose,
  onConfirm,
}: {
  user: UserRow | null;
  onClose: () => void;
  onConfirm: (email: string) => Promise<void>;
}) {
  const [typed, setTyped] = useState("");
  useEffect(() => setTyped(""), [user]);
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {user?.name ?? user?.email}?</DialogTitle>
          <DialogDescription>
            This removes the account, credentials and sessions. History stays in
            the audit log. Type the email to confirm.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={user?.email ?? ""}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={typed.trim().toLowerCase() !== (user?.email ?? "").trim().toLowerCase()}
            onClick={() => void onConfirm(typed)}
          >
            Delete account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserDrawer({
  user,
  meId,
  roles,
  blocks,
  sessions,
  onClose,
  onSignOut,
  onDisable,
}: {
  user: UserRow | null;
  meId: string;
  roles: RoleRow[];
  blocks: BlockOption[];
  sessions: AdminSession[];
  onClose: () => void;
  onSignOut: (id: string) => void;
  onDisable: (disabled: boolean) => Promise<void>;
}) {
  const audit = useQuery(
    api.users.userAudit,
    user ? { userId: user._id } : "skip",
  );
  const mine = sessions.filter((s) => s.userId === user?._id);
  return (
    <Sheet open={!!user} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{user?.name ?? user?.email ?? "User"}</SheetTitle>
          <SheetDescription>{user?.email}</SheetDescription>
        </SheetHeader>
        {user && (
          <div className="mt-4 space-y-4 text-[12.5px]">
            <div className="rounded-lg border border-border/60 p-2.5">
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Role</p>
              <p className="font-medium">
                {user.appRole
                  ? roles.find((r) => r.key === user.appRole)?.label ??
                    ROLE_LABEL_FALLBACK[user.appRole] ??
                    user.appRole
                  : "No role"}
              </p>
              <p className="mt-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Blocks</p>
              <p className="font-medium">
                {user.blockIds.length
                  ? user.blockIds.map((id) => blocks.find((b) => b._id === id)?.name ?? id).join(", ")
                  : "All blocks"}
              </p>
              <p className="mt-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Last active</p>
              <p className="font-medium">{relativeTime(user.lastActive)}</p>
            </div>

            <div>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Last 10 changes</p>
              <ul className="mt-1 divide-y divide-border/40 rounded-lg border border-border/60">
                {(audit ?? []).map((a) => (
                  <li key={a.id} className="px-2 py-1">
                    <p className="font-medium">{a.field ?? a.action}</p>
                    <p className="text-[10.5px] text-muted-foreground">
                      {a.newValue ?? "—"} · {a.changedByName ?? "System"} · {relativeTime(a.changedAt)}
                    </p>
                  </li>
                ))}
                {(audit ?? []).length === 0 && (
                  <li className="px-2 py-2 text-muted-foreground">No audit entries for this user.</li>
                )}
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Sessions</p>
              <ul className="mt-1 divide-y divide-border/40 rounded-lg border border-border/60">
                {mine.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 px-2 py-1">
                    <span className="min-w-0 flex-1 truncate">
                      {parseDevice(s.userAgent).browser} · {parseDevice(s.userAgent).os}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10.5px]"
                      disabled={s.current}
                      onClick={() => onSignOut(s.id)}
                    >
                      Sign out
                    </Button>
                  </li>
                ))}
                {mine.length === 0 && <li className="px-2 py-2 text-muted-foreground">No active sessions.</li>}
              </ul>
            </div>

            <Button
              variant={user.disabled ? "default" : "destructive"}
              className="w-full"
              disabled={user._id === meId}
              onClick={() => void onDisable(!user.disabled)}
            >
              <Ban className="mr-1.5 size-4" />
              {user.disabled ? "Enable account" : "Disable account"}
            </Button>
            <p className="text-[10.5px] text-muted-foreground">
              Disabling signs the person out at once and keeps all history.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
