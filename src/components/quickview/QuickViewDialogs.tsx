/**
 * Guard + conflict dialogs for the quick view.
 *
 * Guard: closing, Previous/Next or Back with unsaved edits asks
 * "Save, Discard or Keep editing" — one dialog, three buttons.
 * Conflict: the facility changed on the server since the dialog opened
 * (someone else saved), so the save asks Keep mine / Take theirs / Review.
 */

import { AlertTriangle, GitCompare, Save, Trash2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function UnsavedGuardDialog({
  open,
  count,
  onCancel,
  onSave,
  onDiscard,
  saving,
}: {
  open: boolean;
  count: number;
  onCancel: () => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onCancel() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save your changes?</DialogTitle>
          <DialogDescription>
            This facility has {count} unsaved {count === 1 ? "change" : "changes"}. A
            draft is kept on this device if you close without saving.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            <Pencil className="mr-1 size-4" /> Keep editing
          </Button>
          <Button variant="outline" onClick={onDiscard} disabled={saving}>
            <Trash2 className="mr-1 size-4" /> Discard
          </Button>
          <Button onClick={onSave} disabled={saving}>
            <Save className="mr-1 size-4" /> Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** "Discard 3 changes?" — asked ONCE before the draft is thrown away. */
export function DiscardConfirmDialog({
  open,
  count,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onCancel() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Discard {count} {count === 1 ? "change" : "changes"}?</DialogTitle>
          <DialogDescription>
            Every field goes back to its saved value and the local draft is removed.
            Nothing is written to the server.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={onCancel}>
            <Pencil className="mr-1 size-4" /> Keep editing
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="mr-1 size-4" /> Discard changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConflictDialog({
  open,
  onKeepMine,
  onTakeTheirs,
  onReview,
  remoteLabel,
  saving,
}: {
  open: boolean;
  onKeepMine: () => void;
  onTakeTheirs: () => void;
  onReview: () => void;
  remoteLabel: string;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onReview() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600" /> Someone else saved this facility
          </DialogTitle>
          <DialogDescription>
            The facility was updated {remoteLabel} while this quick view was open. Your
            edits are still here — choose how to resolve them.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={onReview} disabled={saving}>
            <GitCompare className="mr-1 size-4" /> Review
          </Button>
          <Button variant="outline" onClick={onTakeTheirs} disabled={saving}>
            Take theirs
          </Button>
          <Button onClick={onKeepMine} disabled={saving}>
            Keep mine &amp; save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
