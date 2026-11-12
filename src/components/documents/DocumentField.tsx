/**
 * DOCUMENT FIELD + FILE DROPZONE — the ONE upload component (Part 3).
 *
 * Every document surface renders this, driven by the central documents config
 * (lib/documentsConfig → the same checks the server runs), so:
 *
 *   • accepted types/size come from the config, never a stray
 *     `accept=".pdf,.xlsx"` on one input;
 *   • a wrong file is rejected BEFORE an upload starts, with the exact reason
 *     ("SA Checklist must be an Excel file (.xlsx or .xls)");
 *   • drag & drop, progress, cancel and retry are the same everywhere;
 *   • the upload is saved the moment it finishes (independent of any form Save
 *     bar), then the reactive query refreshes the row, the Documents column,
 *     Quick View and the profile.
 */

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatFileSize, validateDocumentFile, documentFieldConfig } from "@/lib/documentsConfig";
import { uploadDocument, uploadKeyFor } from "@/lib/uploadDocuments";
import { createUploadTransport } from "@/lib/uploadTransport";
import { UPLOAD_CANCELLED, friendlyUploadError, withRef } from "@/lib/uploadConfig";
import {
  DocumentDownloadLink,
  DocumentOpenLink,
  DocumentPreviewButton,
} from "@/components/documents/DocumentPreview";

export type DocumentMeta = {
  key: string;
  label: string;
  /** Part C — the resolved Admin rule for THIS facility. */
  requirement?: {
    required: boolean;
    blocking: boolean;
    badge: string;
    reason: string | null;
  } | null;
  requiredForCertified?: boolean;
  current?: {
    id: string;
    originalName: string;
    displayName?: string;
    size: number;
    versionNo: number;
    uploadedAt: number;
    uploadedByName?: string | null;
    missingInDrive?: boolean;
  } | null;
  versions?: { id: string }[];
  canUndoRemove?: string | null;
};

type Progress = { sent: number; total: number; stage: string };

function formatDay(ts: number): string {
  // DD-MMM-YYYY (02-Nov-2026), the app's one date style.
  return new Date(ts)
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/\s+/g, "-");
}

/* -------------------------------------------------------------------------- */
/* FileDropzone — drag & drop + the file picker                             */
/* -------------------------------------------------------------------------- */

export function FileDropzone({
  accept,
  onFile,
  disabled,
  hint,
  compact,
  label = "Choose file",
  camera,
}: {
  accept: string;
  onFile: (file: File) => void;
  disabled?: boolean;
  hint: string;
  compact?: boolean;
  label?: string;
  /** Show the mobile camera button (image-capable documents). */
  camera?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [over, setOver] = useState(false);

  const take = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Stop here: an enclosing DocumentSlot is also a drop target and must not
    // start a SECOND upload of the same file.
    event.stopPropagation();
    setOver(false);
    if (disabled) return;
    take(event.dataTransfer?.files ?? null);
  };

  return (
    <div
      data-testid="file-dropzone"
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-lg border border-dashed transition-colors",
        compact ? "px-2 py-1.5" : "px-3 py-2",
        over ? "border-primary bg-primary/5" : "border-border/70",
        disabled && "opacity-60",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        disabled={disabled}
        data-testid="file-input"
        onChange={(e) => {
          take(e.target.files);
          // Part 3 (i): reset so choosing the same file twice still fires.
          e.target.value = "";
        }}
      />
      {camera && (
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            take(e.target.files);
            e.target.value = "";
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3.5" aria-hidden="true" />
          {label}
        </Button>
        {camera && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1.5 md:hidden"
            disabled={disabled}
            onClick={() => cameraRef.current?.click()}
          >
            <ImageIcon className="size-3.5" aria-hidden="true" />
            Camera
          </Button>
        )}
        <span className="text-[11px] text-muted-foreground">
          or drag a file here · paste (Ctrl+V) · {hint}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DocumentField                                                              */
/* -------------------------------------------------------------------------- */

export function DocumentField({
  facilityId,
  docKey,
  doc,
  cycleNo,
  canEdit,
  onChanged,  compact,
  className,
  incoming,
  maxMb,

  onUploaded,
  onUploadState,
  onRequestUpload,
  onNotice,
  onBeforeUpload,
}: {
  facilityId: string;
  docKey: string;
  /** Metadata from a parent's single `listForFacility` query (optional). */
  doc?: DocumentMeta;
  cycleNo?: number;
  canEdit: boolean;
  onChanged?: () => void;
  compact?: boolean;
  className?: string;
  /** A file the Documents panel classified for THIS row (multi-file drop).
   *  A new `token` starts the upload; the same token never restarts it. */
  incoming?: { file: File; token: number } | null;
  /** The RESOLVED per-type limit (Admin → Documents may lower it). The hint,
   *  the pre-check and the server then quote the same number. */
  maxMb?: number;
  /** "SA Report uploaded" — for the panel's aria-live region. */
  onUploaded?: (docKey: string, fileName: string) => void;
  /** Optimistic count: start → the row counts as uploaded while it uploads.
   *  "clear" = the user dismissed a failed row (one message + Retry/Remove). */
  onUploadState?: (docKey: string, state: "start" | "done" | "error" | "clear") => void;
  /** When the Documents panel owns the ONE upload control, the row offers only
   *  a quiet "Add"/"Replace" that feeds that panel with this type fixed. */
  onRequestUpload?: (docKey: string) => void;
  /** A calm, non-error sentence (the identical-current-file notice). */
  onNotice?: (message: string) => void;
  /** Return true when the caller took the file (for preview-before-upload);
   *  the field then starts no upload. */
  onBeforeUpload?: (file: File) => boolean;
}) {
  const config = documentFieldConfig(docKey);
  // Declared before the hooks so no closure below has to read `config` — an
  // unknown docKey must not change how many hooks this component calls.
  const label = config?.label ?? docKey;
  const limitMb = maxMb ?? config?.maxMb ?? 10;
  const standalone = useQuery(
    api.documents.listForFacility,
    doc ? "skip" : { facilityId: facilityId as never },
  );
  const beginUpload = useAction(api.documents.beginUpload);
  const uploadChunk = useAction(api.documents.uploadChunk);
  const finalizeUpload = useAction(api.documents.finalizeUpload);
  const cancelUpload = useAction(api.documents.cancelUpload);
  const removeDocument = useAction(api.documents.removeDocument);
  const undoRemove = useAction(api.documents.undoRemove);

  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Identical-to-current result: calm, no Retry, not an error. */
  const [info, setInfo] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const signal = useRef<{ aborted: boolean }>({ aborted: false });
  /** Latest `start` for the incoming-file effect (avoids a re-render loop). */
  const startRef = useRef<(file: File) => Promise<void>>(async () => {});
  const lastIncoming = useRef<number | null>(null);
  /** The server's reference code for the current upload (shown on failure). */
  const uploadRef = useRef<string | null>(null);

  /* A NEW facility never inherits this row's error, progress or file — the
     stale state that used to survive previous/next navigation as a stuck
     retry icon on a document that was never touched. */
  useEffect(() => {
    signal.current = { aborted: true };
    setError(null);
    setInfo(null);
    setProgress(null);
    setLastFile(null);
    setDone(null);
    setAnnounce("");
    uploadRef.current = null;
  }, [facilityId]);

  const view: DocumentMeta | undefined =
    doc ??
    (standalone
      ? (standalone.documents as DocumentMeta[]).find((d) => d.key === docKey)
      : undefined);
  const cycle = cycleNo ?? standalone?.cycleNo ?? 1;
  /** Part C — the row badge is the resolved rule, never a second hard-coded
   *  "required" flag. A standalone field (no panel) falls back to the static
   *  default so it still says something honest. */
  const requirement: {
    required: boolean;
    blocking: boolean;
    badge: string;
    reason: string | null;
  } | null =
    view?.requirement ??
    (config?.requiredForCertified
      ? {
          required: true,
          blocking: true,
          badge: "Required: certified",
          reason: "Required because certification status is certified or conditional.",
        }
      : null);

  // Every request goes to this app's own backend (see lib/uploadTransport);
  // there is deliberately no Google upload URL in the browser.
  const transport = createUploadTransport(
    {
      begin: beginUpload,
      putChunk: uploadChunk,
      finalize: finalizeUpload,
      cancel: cancelUpload,
    },
    facilityId,
  );

  const start = async (file: File) => {
    if (onBeforeUpload?.(file)) {
      setProgress(null);
      setError(null);
      setInfo(null);
      return;
    }
    const invalid = validateDocumentFile(docKey, file, maxMb);
    setLastFile(file);
    if (invalid) {
      setError(invalid);
      setProgress(null);
      return;
    }
    setError(null);
    setInfo(null);
    setDone(null);
    signal.current = { aborted: false };
    setProgress({ sent: 0, total: file.size, stage: "starting" });
    onUploadState?.(docKey, "start");
    uploadRef.current = null;
    try {
      const result = await uploadDocument(
        {
          facilityId,
          docKey,
          cycleNo: cycle,
          file,
          bytes: async () => new Uint8Array(await file.arrayBuffer()),
          uploadKey: uploadKeyFor(facilityId, docKey, file),
        },
        transport,
        (p) => setProgress({ sent: p.sent, total: p.total, stage: p.stage }),
        signal.current,
        (begin) => {
          uploadRef.current = begin.ref ?? null;
        },
      );
      setProgress(null);
      if (result.duplicate) {
        // Not an error: the current file is already exactly this one. Show
        // one calm line, keep the stored version, never a Retry.
        const message = result.message ?? `This exact file is already the current ${label}`;
        setInfo(message);
        setDone(null);
        setLastFile(null);
        setAnnounce(message);
        onNotice?.(message);
        onUploadState?.(docKey, "done");
        onChanged?.();
        return;
      }
      setDone(file.name);
      setAnnounce(`${label} uploaded`);
      toast.success(`${label} uploaded`, {
        description: `${file.name} · ${formatFileSize(file.size)}`,
      });
      onUploadState?.(docKey, "done");
      onUploaded?.(docKey, file.name);
      onChanged?.();
    } catch (err) {
      setProgress(null);
      const message = friendlyUploadError(err);
      // The reference code lets the administrator find this exact upload.
      const shown = signal.current.aborted
        ? UPLOAD_CANCELLED
        : withRef(message, uploadRef.current);
      setError(shown);
      setAnnounce(`${label} upload failed`);
      onUploadState?.(docKey, "error");
    }
  };
  // The latest `start` for the incoming-file effect — written after render,
  // never during it (react-hooks/refs).
  useEffect(() => {
    startRef.current = start;
  });

  // A file classified by the Documents panel (multi-file drop, or a chooser
  // chip) starts here, with the row's own progress/cancel/retry.
  // Declared as a plain function (not inline in the effect) so no state is
  // set directly in the effect body — rules-of-hooks stays clean.
  const applyIncoming = (file: File) => {
    const invalid = validateDocumentFile(docKey, file, maxMb);
    if (invalid) {
      setLastFile(file);
      setError(invalid);
      setProgress(null);
      setAnnounce(`${label} was not uploaded`);
      onUploadState?.(docKey, "error");
      return;
    }
    void startRef.current(file);
  };

  useEffect(() => {
    if (!incoming || lastIncoming.current === incoming.token) return;
    lastIncoming.current = incoming.token;
    applyIncoming(incoming.file);
    // `incoming` is the trigger; docKey cannot change for a mounted row.
  }, [incoming, docKey]);

  const cancel = () => {
    signal.current.aborted = true;
    setProgress(null);
    setError(UPLOAD_CANCELLED);
  };

  const remove = async (documentId: string) => {
    if (!window.confirm(`Remove ${label}? You can undo this for 30 seconds.`)) return;
    try {
      await removeDocument({ documentId: documentId as never, reason: "Removed from the document field" });
      toast.success(`${label} moved to review`, {
        description: "It is kept for the retention period before deletion.",
        action: {
          label: "Undo",
          onClick: () => {
            void undoRemove({ documentId: documentId as never }).then(
              () => toast.success("Removal undone"),
              (err: unknown) => toast.error(err instanceof Error ? err.message : "Undo failed"),
            );
          },
        },
      });
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the document");
    }
  };

  const current = view?.current ?? null;
  const uploading = progress != null && progress.stage !== "done";
  const pct = progress?.total ? Math.round((progress.sent / progress.total) * 100) : 5;

  // Every hook above runs unconditionally; only now may we bail out.
  if (!config) return null;

  /* Part E — the compact row: 44 px, one line of identity + one line of
     metadata, actions on the right. The section (DocumentsCard) is the drop
     target, so the row has no dashed box of its own. */
  if (compact) {
    const RowIcon =
      docKey === "SA_Checklist"
        ? FileSpreadsheet
        : docKey === "NQAS_Result" || docKey === "NOC"
          ? ImageIcon
          : FileText;
    /* The status list shows UPLOADED documents only; the missing ones
       collapse into one chip line in the panel (DocumentsCard). The row must
       still mount while a file is in flight — its upload effect lives here —
       so it renders as soon as there is progress or an error to show. */
    if (!current && !progress && !error && !info) return null;
    return (
      <div
        className={cn("flex min-h-11 flex-wrap items-center gap-2 py-1.5", className)}
        data-testid={`document-field-${docKey}`}
      >
        <p role="status" aria-live="polite" className="sr-only">
          {announce}
        </p>
        <RowIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[13px] font-medium">{config.label}</span>
            {requirement && (
              <span
                className={cn(
                  "rounded border px-1 text-[10px]",
                  requirement.required
                    ? "border-amber-300/70 bg-amber-50 text-amber-900"
                    : "border-border/70 text-muted-foreground",
                )}
                data-testid="document-badge"
                data-tip={requirement.reason ?? undefined}
              >
                {requirement.badge}
              </span>
            )}
            {current?.missingInDrive && (
              <span className="rounded-full border border-rose-300/70 bg-rose-50 px-1.5 text-[10px] font-medium text-rose-800">
                File missing in Drive
              </span>
            )}
            {done && (
              <span className="rounded-full border border-emerald-300/70 bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                Saved ✓
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-muted-foreground" data-testid="document-current">
            {current
              ? `${current.displayName ?? current.originalName} · ${formatFileSize(current.size)} · Uploaded ${formatDay(
                  current.uploadedAt,
                )}${current.uploadedByName ? ` · ${current.uploadedByName}` : ""}`
              : uploading
                ? "Uploading…"
                : error
                  ? // A failed row states its error ONCE below — never a second
                    // "Not uploaded" line next to the chips.
                    lastFile
                      ? `${lastFile.name} · ${formatFileSize(lastFile.size)}`
                      : "-"
                  : "Not uploaded"}
          </p>
        </div>

        {uploading && progress ? (
          <div className="flex w-40 shrink-0 items-center gap-1.5" data-testid="document-progress">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <button
              type="button"
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
              onClick={cancel}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-0.5">
            {current && (
              <>
                <DocumentPreviewButton
                  doc={current}
                  label=""
                  ariaLabel={`Preview ${config.label}`}
                  className="rounded border-0 bg-transparent p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                />
                <DocumentDownloadLink
                  documentId={current.id}
                  ariaLabel={`Download ${config.label}`}
                  className="rounded border-0 bg-transparent p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Download className="size-3.5" />
                </DocumentDownloadLink>
                {canEdit && (
                  <button
                    type="button"
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label={`Remove ${config.label}`}
                    onClick={() => void remove(current.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </>
            )}
            {current && canEdit && onRequestUpload && (
              <button
                type="button"
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Replace ${config.label}`}
                data-tip="Replace through the card's uploader — the previous version is kept"
                onClick={() => onRequestUpload(docKey)}
                data-testid={`document-replace-${docKey}`}
              >
                <RotateCcw className="size-3.5" />
              </button>
            )}
          </div>
        )}
        {info && (
          <p className="flex w-full items-start gap-1 text-[11px] font-medium text-muted-foreground">
            <Check className="mt-0.5 size-3 shrink-0 text-emerald-600" aria-hidden /> {info}
          </p>
        )}
        {error && (
          <p role="alert" className="flex w-full flex-wrap items-center gap-1 text-[11px] font-medium text-destructive">
            <AlertTriangle className="size-3 shrink-0" /> {error}
            {lastFile && (
              <button
                type="button"
                className="ml-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium hover:bg-muted"
                onClick={() => void start(lastFile)}
              >
                Retry
              </button>
            )}
            {/* ONE clear message with actions: Retry and Remove — Remove
                dismisses the row so no failed row is ever stuck. */}
            <button
              type="button"
              className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium hover:bg-muted"
              aria-label={`Remove the failed upload for ${config.label}`}
              data-testid={`document-dismiss-${docKey}`}
              onClick={() => {
                signal.current = { aborted: true };
                setError(null);
                setProgress(null);
                setLastFile(null);
                setAnnounce("");
                onUploadState?.(docKey, "clear");
              }}
            >
              Remove
            </button>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)} data-testid={`document-field-${docKey}`}>
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="flex min-w-0 items-center gap-1.5 text-sm">
          {docKey === "SA_Checklist" ? (
            <FileSpreadsheet className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : docKey === "NQAS_Result" || docKey === "NOC" ? (
            <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="truncate font-medium">{config.label}</span>
          {requirement ? (
            requirement.required ? (
              current ? (
                <span
                  className="rounded border border-border/70 px-1 text-[10px] uppercase text-muted-foreground"
                  data-testid="document-required"
                >
                  {requirement.badge}
                </span>
              ) : (
                <span
                  className="rounded-full border border-amber-300/70 bg-amber-50 px-1.5 text-[10px] font-medium text-amber-900"
                  data-testid="document-required-missing"
                  data-tip={requirement.reason ?? undefined}
                >
                  {requirement.badge} · missing
                </span>
              )
            ) : (
              <span
                className="rounded border border-border/70 px-1 text-[10px] text-muted-foreground"
                data-testid="document-optional"
              >
                Optional
              </span>
            )
          ) : null}
          {done && (
            <span className="rounded-full border border-emerald-300/70 bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
              Recently updated
            </span>
          )}
        </p>
        {current && (
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 text-xs text-muted-foreground" data-testid="document-current">
            {/* The file NAME is a real Open anchor — no async on click. */}
            <DocumentOpenLink
              documentId={current.id}
              className="max-w-full truncate border-0 bg-transparent p-0 font-medium text-primary underline-offset-2 hover:bg-transparent hover:underline"
              ariaLabel={`Open ${current.displayName ?? current.originalName}`}
            >
              <span
                className="truncate"
                data-testid="document-current-name"
                data-tip={`Uploaded as ${current.originalName}`}
              >
                {current.displayName ?? current.originalName}
              </span>
            </DocumentOpenLink>
            <span className="truncate">
              · {formatFileSize(current.size)} · v{current.versionNo} · Uploaded {formatDay(current.uploadedAt)}
              {current.uploadedByName ? ` · ${current.uploadedByName}` : ""}
            </span>
          </span>
        )}
      </div>

      {current?.missingInDrive && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-800 dark:text-amber-300">
          <AlertTriangle className="size-3" /> File missing in Drive — re-upload from the source.
        </p>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {current && (
          <>
            <DocumentPreviewButton
              doc={current}
              ariaLabel={`Preview ${config.label}`}
              className="border-0 bg-transparent px-1.5 text-xs font-normal hover:bg-accent"
            />
            <DocumentOpenLink
              documentId={current.id}
              ariaLabel={`Open ${config.label} in a new tab`}
              className="border-0 bg-transparent px-1.5 text-xs font-semibold text-primary hover:bg-accent"
            >
              <ExternalLink className="size-3.5" /> Open
            </DocumentOpenLink>
            <DocumentDownloadLink
              documentId={current.id}
              ariaLabel={`Download ${config.label}`}
              className="border-0 bg-transparent px-1.5 text-xs font-normal hover:bg-accent"
            >
              <Download className="size-3.5" /> Download
            </DocumentDownloadLink>
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-1.5 text-xs text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${config.label}`}
                onClick={() => void remove(current.id)}
              >
                <Trash2 className="size-3.5" /> Remove
              </Button>
            )}
          </>
        )}
        {canEdit && !uploading && (
          <FileDropzone
            accept={config.accept}
            hint={`${config.typeHint} · up to ${limitMb} MB`}
            compact={compact}
            label={current ? "Replace" : "Choose file"}
            disabled={uploading}
            camera={config.accept.includes("png") || config.accept.includes("jpg")}
            onFile={(file) => void start(file)}
          />
        )}
      </div>

      {uploading && progress && (
        <div className="mt-1.5 max-w-[20rem]" data-testid="document-progress">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            <span>
              {progress.stage === "starting"
                ? "Starting…"
                : progress.stage === "retrying"
                  ? "Waiting to retry…"
                  : progress.stage === "verifying"
                    ? "Verifying file…"
                    : `Uploading… ${pct}%`}
            </span>
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-0.5 font-medium text-foreground hover:underline"
              onClick={cancel}
            >
              <X className="size-3" /> Cancel
            </button>
          </div>
        </div>
      )}

      {info && (
        <p className="mt-1.5 flex items-start gap-1 text-[11px] font-medium text-muted-foreground">
          <Check className="mt-0.5 size-3 shrink-0 text-emerald-600" aria-hidden /> {info}
        </p>
      )}

      {error && (
        <div className="mt-1.5 flex flex-wrap items-start gap-1.5" role="alert">
          <p className="flex items-start gap-1 text-[11px] font-medium text-destructive">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {error}
          </p>
          {lastFile && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 gap-1 px-1.5 text-[11px]"
              onClick={() => void start(lastFile)}
            >
              <RotateCcw className="size-3" /> Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
