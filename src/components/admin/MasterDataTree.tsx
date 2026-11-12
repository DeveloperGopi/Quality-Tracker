/**
 * MASTER DATA — one tree card for Blocks → PHCs.
 *
 * Why: the PHC list was empty while facilities already carried PHCs, so the
 * dropdown had nothing to offer. The card derives the real pairs from the
 * facilities, offers a previewed seed (with possible duplicates shown, never
 * merged silently), and keeps counts in ONE place.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  GitMerge,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

type PhcNode = { id: string; name: string; count: number };
type BlockNode = { id: string; name: string; count: number; phcs: PhcNode[] };
type MasterTreeOrder = { blocks: string[]; phcs: Record<string, string[]> };

function cleanOrder(raw: unknown): MasterTreeOrder {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const blocks = Array.isArray(source.blocks)
    ? source.blocks.filter((id): id is string => typeof id === "string")
    : [];
  const phcs: Record<string, string[]> = {};
  if (source.phcs && typeof source.phcs === "object") {
    for (const [blockId, ids] of Object.entries(source.phcs as Record<string, unknown>)) {
      if (Array.isArray(ids)) phcs[blockId] = ids.filter((id): id is string => typeof id === "string");
    }
  }
  return { blocks, phcs };
}

function sortByOrder<T extends { id: string; name: string }>(rows: T[], order: string[]): T[] {
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...rows].sort((a, b) => {
    const ai = rank.get(a.id);
    const bi = rank.get(b.id);
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function MasterDataTree() {
  const tree = useQuery(api.masterData.tree, {});
  const preview = useQuery(api.masterData.seedPreview, {});
  const settings = useQuery(api.facilities.getAppSettings, {});
  const setSetting = useMutation(api.facilities.setSetting);
  const seed = useMutation(api.masterData.seedPhcs);
  const addBlock = useMutation(api.facilities.addBlock);
  const addPhc = useMutation(api.facilities.addPhc);
  const renameBlock = useMutation(api.ops.renameBlock);
  const removeBlock = useMutation(api.ops.removeBlock);
  const renamePhc = useMutation(api.masterData.renamePhc);
  const mergePhcs = useMutation(api.masterData.mergePhcs);
  const removePhc = useMutation(api.masterData.removePhcGuarded);

  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newBlock, setNewBlock] = useState("");
  const [phcDraft, setPhcDraft] = useState<{ block: string; name: string } | null>(null);
  const [editing, setEditing] = useState<{ kind: "block" | "phc"; id: string; value: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [seedOpen, setSeedOpen] = useState(false);
  const [merge, setMerge] = useState<{ source: PhcNode; block: BlockNode } | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [confirm, setConfirm] = useState<{ kind: "block" | "phc"; id: string; name: string } | null>(null);

  const blocks = (tree?.blocks ?? []) as BlockNode[];
  const order = cleanOrder(settings?.settings?.masterTreeOrder);
  const orderedBlocks = useMemo(
    () =>
      sortByOrder(blocks, order.blocks).map((block) => ({
        ...block,
        phcs: sortByOrder(block.phcs, order.phcs[block.id] ?? []),
      })),
    [blocks, order.blocks, order.phcs],
  );
  const search = q.trim().toLowerCase();
  const visible = useMemo(
    () =>
      search
        ? orderedBlocks
            .map((b) => ({
              ...b,
              phcs: b.phcs.filter(
                (p) =>
                  p.name.toLowerCase().includes(search) ||
                  b.name.toLowerCase().includes(search),
              ),
            }))
            .filter((b) => b.name.toLowerCase().includes(search) || b.phcs.length > 0)
        : orderedBlocks,
    [orderedBlocks, search],
  );

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the change");
    } finally {
      setBusy(null);
    }
  };

  const commitRename = async () => {
    if (!editing) return;
    const value = editing.value.trim();
    if (!value) return;
    if (editing.kind === "block") {
      await run(`rename-${editing.id}`, () => renameBlock({ blockId: editing.id as never, name: value }), "Block renamed and facilities updated");
    } else {
      await run(`rename-${editing.id}`, () => renamePhc({ phcId: editing.id as never, name: value }), "PHC renamed and facilities updated");
    }
    setEditing(null);
  };

  const saveOrder = (next: MasterTreeOrder) =>
    void run(
      "order",
      () => setSetting({ key: "masterTreeOrder", value: next }),
      "Display order saved",
    );

  const moveBlock = (id: string, delta: -1 | 1) => {
    const ids = orderedBlocks.map((block) => block.id);
    const index = ids.indexOf(id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ids.length) return;
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    saveOrder({ ...order, blocks: next });
  };

  const movePhc = (block: BlockNode, id: string, delta: -1 | 1) => {
    const ids = block.phcs.map((phc) => phc.id);
    const index = ids.indexOf(id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ids.length) return;
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    saveOrder({ ...order, phcs: { ...order.phcs, [block.id]: next } });
  };

  const totals = tree?.totals;
  const unlisted = tree?.unlisted ?? [];

  return (
    <section className="rounded-xl border border-border/60 bg-background/60">
      <header className="border-b border-border/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="size-4" /> Blocks &amp; PHCs
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Facilities pick their PHC from this list. Renaming cascades; a PHC or block in use cannot be deleted.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">
              {totals ? `${totals.facilities} facilities · ${totals.blocks} blocks · ${totals.phcs} PHCs` : "…"}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={!preview || preview.missing.length === 0 || busy === "seed"}
              onClick={() => setSeedOpen(true)}
            >
              {busy === "seed" ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Sparkles className="mr-1 size-3.5" />}
              Seed from facilities
              {preview ? <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">{preview.missing.length}</span> : null}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search blocks and PHCs"
              aria-label="Search blocks and PHCs"
              className="glass-input h-10 pl-9"
            />
          </div>
          <Input
            value={newBlock}
            onChange={(e) => setNewBlock(e.target.value)}
            placeholder="New block"
            aria-label="New block name"
            className="glass-input h-10 w-40"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newBlock.trim()) {
                void run("block", () => addBlock({ name: newBlock.trim() }), "Block added").then(() => setNewBlock(""));
              }
            }}
          />
          <Button
            className="h-10"
            disabled={!newBlock.trim() || busy === "block"}
            onClick={() => void run("block", () => addBlock({ name: newBlock.trim() }), "Block added").then(() => setNewBlock(""))}
          >
            <Plus className="mr-1 size-4" /> Block
          </Button>
        </div>
      </header>

      <ul className="divide-y divide-border/50">
        {visible.map((b) => {
          const open = search ? true : (expanded[b.id] ?? true);
          return (
            <li key={b.id}>
              <div className="flex items-center gap-1.5 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [b.id]: !open }))}
                  aria-label={open ? `Collapse ${b.name}` : `Expand ${b.name}`}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                >
                  {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                {editing?.kind === "block" && editing.id === b.id ? (
                  <div className="flex flex-1 items-center gap-1.5">
                    <Input
                      autoFocus
                      value={editing.value}
                      onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitRename();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="h-9 max-w-64"
                    />
                    <Button size="icon" className="size-9" onClick={() => void commitRename()} aria-label="Save name">
                      <Check className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-9" onClick={() => setEditing(null)} aria-label="Cancel">
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left hover:bg-muted/50"
                    onClick={() => setExpanded((e) => ({ ...e, [b.id]: !open }))}
                  >
                    <Building2 className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-semibold">{b.name}</span>
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                      {b.count}
                    </span>
                  </button>
                )}
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label={`Move ${b.name} up`}
                    disabled={busy === "order" || orderedBlocks[0]?.id === b.id}
                    onClick={() => moveBlock(b.id, -1)}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label={`Move ${b.name} down`}
                    disabled={busy === "order" || orderedBlocks[orderedBlocks.length - 1]?.id === b.id}
                    onClick={() => moveBlock(b.id, 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-8" aria-label={`Rename ${b.name}`} onClick={() => setEditing({ kind: "block", id: b.id, value: b.name })}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label={`Add PHC to ${b.name}`}
                    onClick={() => setPhcDraft({ block: b.name, name: "" })}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${b.name}`}
                    disabled={b.count > 0}
                    data-tip={b.count > 0 ? "Remove or move its facilities first" : "Delete block"}
                    onClick={() => setConfirm({ kind: "block", id: b.id, name: b.name })}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {open && (
                <ul className="border-t border-border/40 bg-muted/20">
                  {b.phcs.length === 0 && (
                    <li className="px-12 py-2 text-xs text-muted-foreground">No PHCs listed yet.</li>
                  )}
                  {b.phcs.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 px-3 py-1.5 pl-10">
                      {editing?.kind === "phc" && editing.id === p.id ? (
                        <div className="flex flex-1 items-center gap-1.5">
                          <Input
                            autoFocus
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void commitRename();
                              if (e.key === "Escape") setEditing(null);
                            }}
                            className="h-8 max-w-60"
                          />
                          <Button size="icon" className="size-8" onClick={() => void commitRename()} aria-label="Save PHC name">
                            <Check className="size-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(null)} aria-label="Cancel">
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left text-sm text-muted-foreground hover:text-foreground"
                          onClick={() => setEditing({ kind: "phc", id: p.id, value: p.name })}
                          data-tip="Click to rename"
                        >
                          {p.name}
                        </button>
                      )}
                      <span className="shrink-0 rounded-full bg-background px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                        {p.count}
                      </span>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          aria-label={`Move ${p.name} up`}
                          disabled={busy === "order" || b.phcs[0]?.id === p.id}
                          onClick={() => movePhc(b, p.id, -1)}
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          aria-label={`Move ${p.name} down`}
                          disabled={busy === "order" || b.phcs[b.phcs.length - 1]?.id === p.id}
                          onClick={() => movePhc(b, p.id, 1)}
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          aria-label={`Merge ${p.name}`}
                          onClick={() => {
                            setMerge({ source: p, block: b });
                            setMergeTarget("");
                          }}
                        >
                          <GitMerge className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${p.name}`}
                          disabled={p.count > 0}
                          data-tip={p.count > 0 ? "Merge or rename it first" : "Delete PHC"}
                          onClick={() => setConfirm({ kind: "phc", id: p.id, name: p.name })}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                  {phcDraft?.block === b.name && (
                    <li className="flex items-center gap-1.5 px-3 py-2 pl-10">
                      <Input
                        autoFocus
                        value={phcDraft.name}
                        onChange={(e) => setPhcDraft({ ...phcDraft, name: e.target.value })}
                        placeholder="New PHC name"
                        className="h-9 max-w-60"
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setPhcDraft(null);
                          if (e.key === "Enter" && phcDraft.name.trim()) {
                            void run("phc", () => addPhc({ name: phcDraft.name.trim(), block: b.name }), "PHC added").then(() => setPhcDraft(null));
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-9"
                        disabled={!phcDraft.name.trim() || busy === "phc"}
                        onClick={() => void run("phc", () => addPhc({ name: phcDraft.name.trim(), block: b.name }), "PHC added").then(() => setPhcDraft(null))}
                      >
                        Add
                      </Button>
                      <Button size="sm" variant="ghost" className="h-9" onClick={() => setPhcDraft(null)}>Cancel</Button>
                    </li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {unlisted.length > 0 && (
        <div className="border-t border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{unlisted.length}</span> facility PHC
          {unlisted.length === 1 ? "" : "s"} not in the list — use “Seed from facilities”.
        </div>
      )}

      {/* Seed preview */}
      <Dialog open={seedOpen} onOpenChange={setSeedOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Seed PHCs from facilities</DialogTitle>
            <DialogDescription>
              Adds the (block, PHC) pairs already used by facilities. Nothing is merged automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              <b>{preview?.missing.length ?? 0}</b> of {preview?.total ?? 0} facility PHCs are missing from the list.
            </p>
            <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-2">
              {(preview?.missing ?? []).map((m) => (
                <li key={`${m.block}::${m.name}`} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate">{m.name}</span>
                  <span className="shrink-0 text-muted-foreground">{m.block} · {m.count}</span>
                </li>
              ))}
              {(preview?.missing.length ?? 0) === 0 && <li className="text-xs text-muted-foreground">Everything is listed.</li>}
            </ul>
            {(preview?.duplicates.length ?? 0) > 0 && (
              <div className="rounded-lg border border-amber-300/70 bg-amber-50 p-2 text-xs text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100">
                <p className="font-semibold">Possible duplicates — merge only if they are the same PHC</p>
                <ul className="mt-1 space-y-0.5">
                  {(preview?.duplicates ?? []).slice(0, 8).map((d) => (
                    <li key={`${d.block}::${d.a}::${d.b}`}>
                      {d.block}: {d.a} ↔ {d.b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSeedOpen(false)}>Cancel</Button>
            <Button
              disabled={busy === "seed" || !preview || preview.missing.length === 0}
              onClick={() => {
                void run("seed", () => seed({}), `Added ${preview?.missing.length ?? 0} PHCs`).then(() => setSeedOpen(false));
              }}
            >
              {busy === "seed" ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Plus className="mr-1 size-4" />}
              Add {preview?.missing.length ?? 0} PHCs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge */}
      <Dialog open={!!merge} onOpenChange={(o) => !o && setMerge(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Merge “{merge?.source.name}”</DialogTitle>
            <DialogDescription>
              Its {merge?.source.count ?? 0} facilit{(merge?.source.count ?? 0) === 1 ? "y" : "ies"} move to the target PHC. The source row is removed. Nothing is merged automatically.
            </DialogDescription>
          </DialogHeader>
          <select
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
            aria-label="Merge into"
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Choose the PHC to keep</option>
            {(merge?.block.phcs ?? [])
              .filter((p) => p.id !== merge?.source.id)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.count})</option>
              ))}
          </select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMerge(null)}>Cancel</Button>
            <Button
              disabled={!mergeTarget || busy === "merge"}
              onClick={() => {
                if (!merge || !mergeTarget) return;
                void run("merge", () => mergePhcs({ sourceId: merge.source.id as never, targetId: mergeTarget as never }), "PHC merged").then(() => setMerge(null));
              }}
            >
              <GitMerge className="mr-1 size-4" /> Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirm?.kind === "block" ? "block" : "PHC"} “{confirm?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This is recorded in the audit log. Blocks and PHCs in use cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirm) return;
                const fn = confirm.kind === "block"
                  ? () => removeBlock({ blockId: confirm.id as never })
                  : () => removePhc({ phcId: confirm.id as never });
                void run("remove", fn, "Removed").then(() => setConfirm(null));
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
