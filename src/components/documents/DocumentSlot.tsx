/**
 * DOCUMENT SLOT — the ONE drop target for one document type.
 *
 * Used by the State Assessment (SA Report, SA Checklist) and NQAS Assessment
 * (NQAS Result) "Documents" sections. It wraps the shared `DocumentField`
 * (the uploader: progress, Cancel, Retry, Preview, Open, Download, Replace,
 * Remove with a 30-second Undo) and adds what a slot owes the user:
 *
 *   • the WHOLE box is the drop target — dragenter/dragover preventDefault, so
 *     the browser never navigates away from the page, and the box highlights
 *     while a file is over it;
 *   • paste (Ctrl/Cmd+V) inside the slot drops the clipboard file here —
 *     bound per slot, so a page showing several cycles can never upload one
 *     paste to every slot;
 *   • the accepted types and the size limit come from the ONE documents
 *     config and the Admin → Documents limit the server enforces — the box,
 *     the hint and the error can never quote different numbers;
 *   • the upload gate (paused / not connected / revoked) is stated once, in
 *     the same sentence the server would reject with, instead of failing an
 *     upload with no explanation.
 *
 * The upload saves immediately through `facility_document` (never a legacy
 * column), so the Documents card, the n-of-6 count and the master list cell
 * update from the reactive query and survive a reload.
 */

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { useAction, useQuery } from "convex/react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import {
  DocumentField,
  type DocumentMeta,
} from "@/components/documents/DocumentField";
import { ResultReadButton, ResultReadStatusLine } from "@/components/result/ResultReadButton";
import { LazyResultReadDialog } from "@/components/result/LazyResultReadDialog";
import { documentFieldConfig, validateDocumentFile } from "@/lib/documentsConfig";
import { isFacilityDocument } from "@/lib/documentCycles";
import { uploadBlockedSentence, uploadPausedDetail, type UploadState } from "@/lib/driveSettings";
import { uploadDocument, uploadKeyFor } from "@/lib/uploadDocuments";
import { createUploadTransport } from "@/lib/uploadTransport";
import { cn } from "@/lib/utils";

export function DocumentSlot({
  facilityId,
  docKey,
  cycleNo: selectedCycle,
  lockCycle,
  canEdit,
  onChanged,
  className,
}: {
  facilityId: string;
  docKey: string;
  /** The cycle this slot represents. Omitted = the facility's current cycle. */
  cycleNo?: number;
  /** A matrix cell or cycle section already fixes the cycle — hide the picker. */
  lockCycle?: boolean;
  /** Viewer/read-only: no picker, no drop, no paste — the stored file is still
   *  previewable and downloadable. */
  canEdit: boolean;
  onChanged?: () => void;
  className?: string;
}) {
  const config = documentFieldConfig(docKey);
  const [pickedCycle, setPickedCycle] = useState<number | undefined>(undefined);
  const chosenCycle = selectedCycle ?? pickedCycle;
  /* The SAME subscription the Documents card and the profile read — Convex
     dedupes it, so the slot and the "n of 6" count can never disagree. */
  const data = useQuery(api.documents.listForFacility, {
    facilityId: facilityId as never,
    cycleNo: chosenCycle,
  });
  const doc = (data?.documents as DocumentMeta[] | undefined)?.find((d) => d.key === docKey);
  const upload = data?.upload as UploadState | undefined;
  /** The facility's live cycle — a new version is filed under it, so the
   *  cycle's audit rows (and its document list) include the upload. */
  const cycleNo = chosenCycle ?? (data as { cycleNo?: number } | undefined)?.cycleNo;
  const cycles = (data as { cycles?: number[] } | undefined)?.cycles ?? [];
  const showCyclePicker =
    canEdit &&
    !lockCycle &&
    selectedCycle === undefined &&
    !isFacilityDocument(docKey) &&
    cycles.length > 1;
  const readerEnabled = (data as { readerEnabled?: boolean } | undefined)?.readerEnabled === true;
  /** Admin → Documents may lower the type's limit; the server returns the
   *  resolved number, and the box/hint/error all quote it. */
  const maxMb = (doc as { maxMb?: number } | undefined)?.maxMb ?? config?.maxMb;

  const beginUpload = useAction(api.documents.beginUpload);
  const uploadChunk = useAction(api.documents.uploadChunk);
  const finalizeUpload = useAction(api.documents.finalizeUpload);
  const cancelUpload = useAction(api.documents.cancelUpload);
  const discardStagedResult = useAction(api.documents.discardStagedResult);

  const [incoming, setIncoming] = useState<{ file: File; token: number } | null>(null);
  const [readDocumentId, setReadDocumentId] = useState<string | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const seq = useRef(0);
  const lastCurrentId = useRef<string | null>(null);
  const openAfterUpload = useRef(false);
  const currentId = doc?.current?.id ?? null;

  /* Upload -> file as NQAS Result -> preview opens by itself. Only a NEW
     current version triggered by this slot's upload opens; arriving at the
     page with an existing file never pops a dialog. */
  useEffect(() => {
    const previous = lastCurrentId.current;
    if (currentId) {
      if (previous !== currentId && openAfterUpload.current) {
        openAfterUpload.current = false;
        setReadDocumentId(currentId);
      }
      lastCurrentId.current = currentId;
    } else {
      lastCurrentId.current = null;
    }
  }, [currentId]);

  /** NQAS Result is read BEFORE it becomes permanent: a local file opens the
   * shared preview and is uploaded only from Accept. */
  const interceptForRead = (file: File): boolean => {
    if (docKey !== "NQAS_Result" || !readerEnabled) return false;
    const invalid = validateDocumentFile(docKey, file, maxMb);
    if (invalid) return false;
    setReadDocumentId(null);
    setLocalFile(file);
    return true;
  };

  /** A second file in the same facility + type + cycle asks before replacing;
   *  the old file is kept as a previous version. */
  const confirmReplace = (file: File): boolean => {
    if (!doc?.current) return true;
    return window.confirm(
      `Replace the current file with “${file.name}”?\n\nThe old file is kept as a previous version.`,
    );
  };

  const beforeUpload = (file: File): boolean => {
    if (!confirmReplace(file)) return true;
    return interceptForRead(file);
  };

  const queue = (file: File | null | undefined) => {
    if (!file || !canEdit) return;
    seq.current += 1;
    setIncoming({ file, token: seq.current });
  };

  /** Paste: a clipboard FILE is a drop. Bound to the slot (not the window) so
   *  a page that shows several cycles cannot upload one paste everywhere;
   *  text fields keep their normal paste. */
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    const target = event.target as HTMLElement | null;
    if (target && (/^(INPUT|TEXTAREA)$/.test(target.tagName) || target.isContentEditable)) {
      return;
    }
    const file = Array.from(event.clipboardData?.files ?? [])[0];
    if (!file) return;
    event.preventDefault();
    queue(file);
  };

  const attachLocal = async (
    file: File,
    onProgress: (sent: number, total: number) => void,
  ): Promise<{ documentId: string; staged: boolean }> => {
    const transport = createUploadTransport(
      { begin: beginUpload, putChunk: uploadChunk, finalize: finalizeUpload, cancel: cancelUpload },
      facilityId,
    );
    const result = await uploadDocument(
      {
        facilityId,
        docKey,
        cycleNo,
        file,
        bytes: async () => new Uint8Array(await file.arrayBuffer()),
        uploadKey: uploadKeyFor(facilityId, docKey, file),
      },
      transport,
      (p) => onProgress(p.sent, p.total),
      { aborted: false },
    );
    return { documentId: result.documentId, staged: !result.duplicate };
  };

  const detachLocal = async (documentId: string) => {
    await discardStagedResult({ documentId: documentId as never });
  };

  const allowDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    // BOTH dragenter and dragover must cancel the default: otherwise the
    // browser opens the dropped file instead of handing it to the page.
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setOver(true);
  };

  return (
    <div
      data-testid={`document-slot-${docKey}`}
      data-over={over ? "true" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onPaste={onPaste}
      onDragEnter={allowDrop}
      onDragOver={allowDrop}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setOver(false);
        queue(event.dataTransfer?.files?.[0]);
      }}
      className={cn(
        "rounded-xl border border-dashed p-3 transition-colors motion-safe:duration-150",
        // ONE visible box: the field's own dashed frame is flattened because
        // THIS box is the drop target.
        "[&_[data-testid=file-dropzone]]:border-0 [&_[data-testid=file-dropzone]]:bg-transparent [&_[data-testid=file-dropzone]]:p-0",
        over
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-border/70 bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      {showCyclePicker && (
        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          Cycle
          <select
            value={cycleNo ?? cycles[0]}
            onChange={(event) => setPickedCycle(Number(event.target.value))}
            className="h-7 rounded-md border border-border bg-background px-1.5 text-[11px] font-medium text-foreground"
          >
            {cycles.map((cycle) => (
              <option key={cycle} value={cycle}>
                Cycle {cycle}
              </option>
            ))}
          </select>
        </label>
      )}
      {upload && !upload.allowed && (
        <p
          role="status"
          data-testid={`document-slot-gate-${docKey}`}
          className="mb-1.5 flex items-start gap-1 text-[11px] leading-snug font-medium text-amber-800 dark:text-amber-300"
        >
          <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
          {upload.reason === "paused" ? uploadPausedDetail(upload) : uploadBlockedSentence(upload)}
        </p>
      )}
      <DocumentField
        facilityId={facilityId}
        docKey={docKey}
        doc={doc}
        cycleNo={cycleNo}
        canEdit={canEdit}
        maxMb={maxMb}
        incoming={incoming}
        onBeforeUpload={beforeUpload}
        onUploaded={() => {
          if (docKey === "NQAS_Result" && readerEnabled) openAfterUpload.current = true;
        }}
        onChanged={onChanged}
      />
      {readerEnabled && docKey === "NQAS_Result" && doc?.current && (
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2 border-t border-border/50 pt-2">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">
              Preview the letter and Annexure values before saving.
            </p>
            <ResultReadStatusLine documentId={doc.current.id} />
          </div>
          {canEdit && (
            <ResultReadButton
              documentId={doc.current.id}
              facilityId={facilityId}
              size="xs"
              label="Read result PDF"
              onApplied={() => onChanged?.()}
            />
          )}
        </div>
      )}
      {readerEnabled && docKey === "NQAS_Result" && (
        <LazyResultReadDialog
          open={!!readDocumentId || !!localFile}
          onOpenChange={(next) => {
            if (!next) {
              setReadDocumentId(null);
              setLocalFile(null);
            }
          }}
          documentIds={readDocumentId ? [readDocumentId] : []}
          facilityId={facilityId}
          localFile={localFile}
          onAttachLocal={attachLocal}
          onDetachLocal={detachLocal}
          onReattach={(file) => {
            if (interceptForRead(file)) {
              toast.info("Reading the replacement PDF");
              return;
            }
            toast.error(validateDocumentFile(docKey, file, maxMb) ?? "Choose a PDF to reattach.");
          }}
          onApplied={() => {
            setLocalFile(null);
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}
