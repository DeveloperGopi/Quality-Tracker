// Master data → Blocks + PHCs.
//
// Blocks are the filing hierarchy every facility sits in, so the table gets the
// room it needs: full height, searchable, inline rename (which cascades to the
// facilities filed under the block, done server-side) and a facility-count bar.
// A block with facilities cannot be deleted — the row says so instead of just
// failing. PHCs get a real empty state with a single obvious next step.

import { useMemo, useState } from "react";
import {
  Building2,
  Check,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  CountBadge,
  EmptyState,
  MiniBar,
  SectionHeader,
} from "@/components/admin/AdminUi";

export type BlockRow = { _id: string; name: string; count: number };
export type PhcRow = { _id: string; name: string; block: string };

export function MasterDataPanel({
  blocks,
  phcs,
  busy,
  onAddBlock,
  onRenameBlock,
  onRemoveBlock,
  onAddPhc,
  onRemovePhc,
}: {
  blocks: BlockRow[];
  phcs: PhcRow[];
  busy: string | null;
  onAddBlock: (name: string) => Promise<boolean>;
  onRenameBlock: (blockId: string, name: string) => Promise<boolean>;
  onRemoveBlock: (blockId: string) => Promise<void>;
  onAddPhc: (name: string, block: string) => Promise<boolean>;
  onRemovePhc: (phcId: string) => Promise<void>;
}) {
  const [blockQuery, setBlockQuery] = useState("");
  const [phcQuery, setPhcQuery] = useState("");
  const [newBlock, setNewBlock] = useState("");
  const [newPhc, setNewPhc] = useState("");
  const [phcBlock, setPhcBlock] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmBlock, setConfirmBlock] = useState<BlockRow | null>(null);
  const [confirmPhc, setConfirmPhc] = useState<PhcRow | null>(null);

  const maxCount = Math.max(1, ...blocks.map((b) => b.count));

  const visibleBlocks = useMemo(() => {
    const q = blockQuery.trim().toLowerCase();
    return q ? blocks.filter((b) => b.name.toLowerCase().includes(q)) : blocks;
  }, [blocks, blockQuery]);

  const visiblePhcs = useMemo(() => {
    const q = phcQuery.trim().toLowerCase();
    return q
      ? phcs.filter(
          (p) => p.name.toLowerCase().includes(q) || p.block.toLowerCase().includes(q),
        )
      : phcs;
  }, [phcs, phcQuery]);

  const startRename = (b: BlockRow) => {
    setEditingId(b._id);
    setEditValue(b.name);
  };

  const commitRename = async (blockId: string, original: string) => {
    const next = editValue.trim();
    setEditingId(null);
    if (!next || next === original) return;
    await onRenameBlock(blockId, next);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {/* ---------------- Blocks ---------------- */}
      <section
        id="master-blocks"
        data-admin-anchor="master-blocks"
        className="scroll-mt-40 rounded-xl border border-border/60 bg-background/60"
      >
        <div className="border-b border-border/60 p-4">
          <SectionHeader
            icon={MapPin}
            title="Blocks"
            description="Every facility is filed under one block. Renaming a block also renames it on the facilities inside it."
            right={<CountBadge value={`${blocks.length} block${blocks.length === 1 ? "" : "s"}`} />}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <Input
              className="glass-input h-10 flex-1 sm:min-w-56"
              placeholder="New block name"
              value={newBlock}
              aria-label="New block name"
              onChange={(e) => setNewBlock(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newBlock.trim()) {
                  const ok = await onAddBlock(newBlock.trim());
                  if (ok) setNewBlock("");
                }
              }}
            />
            <Button
              className="h-10"
              disabled={busy === "block" || !newBlock.trim()}
              onClick={async () => {
                const ok = await onAddBlock(newBlock.trim());
                if (ok) setNewBlock("");
              }}
            >
              {busy === "block" ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Plus className="mr-1.5 size-4" />
              )}
              Add block
            </Button>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="glass-input h-10 pl-9"
              placeholder="Search blocks"
              value={blockQuery}
              aria-label="Search blocks"
              onChange={(e) => setBlockQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Full-height, scrollable by the page instead of a 13rem box. */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Block</TableHead>
              <TableHead>Facilities</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleBlocks.map((b) => {
              const editing = editingId === b._id;
              const canDelete = b.count === 0;
              return (
                <TableRow key={b._id}>
                  <TableCell>
                    {editing ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          autoFocus
                          className="glass-input h-10"
                          value={editValue}
                          aria-label={`Rename ${b.name}`}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void commitRename(b._id, b.name);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <Button
                          size="icon"
                          className="size-10"
                          aria-label="Save block name"
                          disabled={busy === `rename-${b._id}`}
                          onClick={() => void commitRename(b._id, b.name)}
                        >
                          {busy === `rename-${b._id}` ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-10"
                          aria-label="Cancel rename"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startRename(b)}
                        data-tip="Click to rename"
                        className="min-h-10 rounded-md px-1 text-left text-sm font-medium text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {b.name}
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <MiniBar value={b.count} max={maxCount} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 text-muted-foreground"
                        data-tip="Rename this block"
                        aria-label={`Rename ${b.name}`}
                        onClick={() => startRename(b)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "size-10 text-muted-foreground",
                          canDelete && "hover:bg-destructive/10 hover:text-destructive",
                        )}
                        disabled={!canDelete || busy === `blk-${b._id}`}
                        data-tip={
                          canDelete
                            ? "Remove this block"
                            : `${b.count} facilit${b.count === 1 ? "y is" : "ies are"} still filed under this block — move or delete them first`
                        }
                        aria-label={
                          canDelete
                            ? `Remove ${b.name}`
                            : `Cannot remove ${b.name}: ${b.count} facilities still assigned`
                        }
                        onClick={() => setConfirmBlock(b)}
                      >
                        {busy === `blk-${b._id}` ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {visibleBlocks.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                  {blocks.length === 0
                    ? "No blocks yet — add the first one above."
                    : `No block matches “${blockQuery}”.`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      {/* ---------------- PHCs ---------------- */}
      <section
        id="master-phcs"
        data-admin-anchor="master-phcs"
        className="scroll-mt-40 rounded-xl border border-border/60 bg-background/60"
      >
        <div className="border-b border-border/60 p-4">
          <SectionHeader
            icon={Building2}
            title="PHCs"
            description="A PHC row is the next level under a block. Facilities pick their PHC from this list."
            right={<CountBadge value={`${phcs.length} PHC${phcs.length === 1 ? "" : "s"}`} />}
          />

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1">
              <Label htmlFor="new-phc" className="text-xs">
                PHC name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-phc"
                className="glass-input mt-1 h-10"
                placeholder="e.g. Pudupettai"
                value={newPhc}
                onChange={(e) => setNewPhc(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && newPhc.trim() && phcBlock) {
                    const ok = await onAddPhc(newPhc.trim(), phcBlock);
                    if (ok) setNewPhc("");
                  }
                }}
              />
            </div>
            <div className="min-w-40">
              <Label htmlFor="new-phc-block" className="text-xs">
                Block <span className="text-destructive">*</span>
              </Label>
              <Select value={phcBlock} onValueChange={setPhcBlock}>
                <SelectTrigger id="new-phc-block" className="glass-input mt-1 h-10 w-44">
                  <SelectValue placeholder="Choose a block" />
                </SelectTrigger>
                <SelectContent>
                  {blocks.map((b) => (
                    <SelectItem key={b._id} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="h-10"
              disabled={busy === "phc" || !newPhc.trim() || !phcBlock}
              onClick={async () => {
                const ok = await onAddPhc(newPhc.trim(), phcBlock);
                if (ok) setNewPhc("");
              }}
            >
              {busy === "phc" ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Plus className="mr-1.5 size-4" />
              )}
              Add PHC
            </Button>
          </div>
          {!phcBlock && phcs.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Choose a block — a PHC belongs to exactly one block.
            </p>
          )}
        </div>

        {phcs.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Building2}
              title="No PHCs yet"
              body="PHC entries sit under a block and are what facilities pick when they are added. Add the first one to get started."
              action={
                <Button
                  onClick={() => {
                    const el = document.getElementById("new-phc");
                    el?.focus();
                  }}
                >
                  <Plus className="mr-1.5 size-4" /> Add your first PHC
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="relative p-4 pb-2">
              <Search className="pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="glass-input h-10 pl-9"
                placeholder="Search PHCs"
                value={phcQuery}
                aria-label="Search PHCs"
                onChange={(e) => setPhcQuery(e.target.value)}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PHC</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead className="w-20 text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiblePhcs.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.block}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        disabled={busy === `phc-${p._id}`}
                        aria-label={`Remove PHC ${p.name}`}
                        onClick={() => setConfirmPhc(p)}
                      >
                        {busy === `phc-${p._id}` ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {visiblePhcs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                      No PHC matches “{phcQuery}”.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </section>

      {/* Confirmation dialogs — every destructive action names its target. */}
      <AlertDialog open={confirmBlock !== null} onOpenChange={(o) => !o && setConfirmBlock(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove block “{confirmBlock?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The block and any PHC entries filed under it are removed. This
              cannot be undone. Facilities already using this block must be moved
              first — that is why removal is only offered for empty blocks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white"
              onClick={async () => {
                const target = confirmBlock;
                setConfirmBlock(null);
                if (target) await onRemoveBlock(target._id);
              }}
            >
              Remove block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmPhc !== null} onOpenChange={(o) => !o && setConfirmPhc(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove PHC “{confirmPhc?.name}” ({confirmPhc?.block})?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This master-data entry is deleted. Facilities in{" "}
              {confirmPhc?.block} that already use this PHC keep their stored
              value, but it can no longer be picked for new facilities. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white"
              onClick={async () => {
                const target = confirmPhc;
                setConfirmPhc(null);
                if (target) await onRemovePhc(target._id);
              }}
            >
              Remove PHC
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
