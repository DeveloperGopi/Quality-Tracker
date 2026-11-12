import { useState } from "react";
import { toast } from "sonner";
import {
  Bookmark,
  Check,
  FolderOpen,
  Link2,
  Pencil,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SavedViewEntry {
  id: string;
  name: string;
  savedAt: number;
  view: unknown;
  /** Server definition id — the link Admin → Pages uses, so deleting the
   *  source here can be reported on the custom page. */
  definitionId?: string;
}

export function SavedViewsMenu({
  entries,
  defaultId,
  currentLabel,
  onSaveCurrent,
  onOpen,
  onRename,
  onDelete,
  onDeleteAll,
  onSetDefault,
  onShareLink,
}: {
  entries: SavedViewEntry[];
  defaultId: string | null;
  currentLabel: string;
  onSaveCurrent: () => void;
  onOpen: (entry: SavedViewEntry) => void;
  onRename: (entry: SavedViewEntry, name: string) => void;
  onDelete: (entry: SavedViewEntry) => void;
  onDeleteAll: () => void;
  onSetDefault: (entry: SavedViewEntry | null) => void;
  onShareLink: () => void;
}) {
  const [rename, setRename] = useState<{ entry: SavedViewEntry; name: string } | null>(
    null,
  );

  const commitRename = () => {
    if (!rename) return;
    const name = rename.name.trim();
    if (!name) return;
    onRename(rename.entry, name);
    setRename(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Bookmark className="size-4" />
            Saved views
            {entries.length > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold tabular-nums text-primary">
                {entries.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem onClick={onSaveCurrent}>
            <Save className="size-4" /> Save current view…
            <span className="ml-auto max-w-24 truncate text-[10px] text-muted-foreground">
              {currentLabel}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              void navigator.clipboard
                .writeText(window.location.href)
                .then(
                  () => toast.success("Report link copied — anyone with access opens this report"),
                  () => toast.error("Could not copy the link"),
                );
              onShareLink();
            }}
          >
            <Link2 className="size-4" /> Share report link
          </DropdownMenuItem>
          {entries.length > 0 && <DropdownMenuSeparator />}
          {entries.length > 0 && (
            <DropdownMenuLabel>Open a saved view</DropdownMenuLabel>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className="group flex items-center gap-0.5 px-1">
              <DropdownMenuItem
                onClick={() => onOpen(entry)}
                className="min-w-0 flex-1"
              >
                <FolderOpen className="size-4 shrink-0" />
                <span className={cn("truncate", entry.id === defaultId && "font-semibold")}>
                  {entry.name}
                </span>
                {entry.id === defaultId && (
                  <Star className="ml-1 size-3 shrink-0 fill-amber-400 text-amber-400" />
                )}
              </DropdownMenuItem>
              <button
                type="button"
                data-tip="Rename view"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setRename({ entry, name: entry.name });
                  // keep the dropdown open; the dialog takes over
                  (document.activeElement as HTMLElement)?.blur?.();
                }}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Pencil className="size-3" />
              </button>
              <button
                type="button"
                data-tip={entry.id === defaultId ? "Remove default" : "Set as default view"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSetDefault(entry.id === defaultId ? null : entry);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600"
              >
                {entry.id === defaultId ? (
                  <X className="size-3" />
                ) : (
                  <Star className="size-3" />
                )}
              </button>
              <button
                type="button"
                data-tip="Delete view"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(entry);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          {entries.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDeleteAll}
              >
                <Trash2 className="size-4" /> Delete all saved views
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!rename} onOpenChange={(o) => !o && setRename(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename saved view</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={rename?.name ?? ""}
            onChange={(e) =>
              setRename((r) => (r ? { ...r, name: e.target.value } : r))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRename(null)}>
              Cancel
            </Button>
            <Button onClick={commitRename}>
              <Check className="mr-1.5 size-4" /> Save name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
