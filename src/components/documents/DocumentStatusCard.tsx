/**
 * DOCUMENT STATUS — the ONE Documents section (Facility Profile + Quick View).
 *
 * One card, six compact tiles, ONE requirement badge per tile, and the SAME
 * resolved Admin rules (`documents.listForFacility`) anything else reads — so
 * this card can never say "All required uploaded ✓" beside a warning banner.
 * It never calls Drive: everything is database metadata, and Preview/
 * Download mint a short-lived read token through this app's backend.
 *
 * The tile detail is rendered INLINE (not in a portal): the Quick View is a
 * native modal `<dialog>`, whose top layer paints over any body-level popover.
 * An inline panel is always visible, keeps the card's height budget and works
 * for keyboard and screen-reader users.
 *
 * This card HOSTS the app's only uploader: the "File as" tray from
 * DocumentsCard is mounted inside it, so the tiles, the "Upload files"
 * button, drops on the card and every preselect request feed the SAME tray.
 * The old Documents section (its own drop box, warning banner, status row,
 * "Not uploaded" chips and footnote) is gone — its warning lives here, once,
 * in `summary`.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Image as ImageIcon,
  Lock,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useResultReaderEnabled } from "@/hooks/use-result-reader";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/documentsConfig";
import {
  DEFAULT_DRIVE_SETTINGS,
  dayStamp,
  getUploadState,
  uploadBlockedSentence,
  uploadPausedDetail,
  type UploadState,
} from "@/lib/driveSettings";
import { DocumentsCard, type DocumentsCardApi } from "@/components/profile/DocumentsCard";
import { DocumentExportControls } from "@/components/documents/DocumentExportControls";
import { ResultReadButton, ResultReadStatusLine } from "@/components/result/ResultReadButton";
import {
  DocumentDownloadLink,
  DocumentOpenLink,
  DocumentPreviewButton,
} from "@/components/documents/DocumentPreview";
import type { DocKey } from "@/convex/storage/validation";

type DocumentMeta = {
  key: string;
  label: string;
  requirement?: {
    required: boolean;
    blocking: boolean;
    badge: string;
    reason: string | null;
  } | null;
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
  versions?: {
    id: string;
    originalName?: string;
    size?: number;
    versionNo?: number;
    uploadedAt?: number;
  }[];
};

function dayLabel(ts?: number | null): string {
  if (!ts) return "-";
  // DD-MMM-YYYY (02-Nov-2026), the app's one date style.
  return dayStamp(ts);
}

function tileIcon(key: string) {
  if (key === "SA_Checklist") return FileSpreadsheet;
  if (key === "NQAS_Result" || key === "NOC") return ImageIcon;
  return FileText;
}

/** A small progress ring: n of 6 documents, plus the number itself. */
function DocRing({ done, total }: { done: number; total: number }) {
  const size = 32;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? Math.min(1, done / total) : 0;
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        role="img"
        aria-label={`${done} of ${total} documents uploaded`}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          className={cn(
            "motion-reduce:transition-none",
            pct === 1 ? "stroke-emerald-500" : "stroke-primary",
          )}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums">
        {done}/{total}
      </span>
    </span>
  );
}

export function DocumentStatusCard({
  facilityId,
  canEdit,
  preselectKey = null,
  pendingFiles = null,
  className,
}: {
  facilityId: string;
  canEdit: boolean;
  /** A type requested from another surface (a header chip, a Fix button):
   *  forwarded to the ONE tray mounted inside this card. */
  preselectKey?: DocKey | null;
  /** A batch dropped on another surface — handed to the same tray. */
  pendingFiles?: { files: File[]; token: number } | null;
  className?: string;
}) {
  const readerEnabled = useResultReaderEnabled();
  const data = useQuery(api.documents.listForFacility, {
    facilityId: facilityId as never,
  });
  /* The server half of the 24-hour paused tray — metadata only, so the banner
     can say how many files are waiting without touching Drive. */
  const trayRows = useQuery(api.documents.listTray, { facilityId: facilityId as never });
  const waitingCount = Array.isArray(trayRows) ? trayRows.length : 0;
  const saveDriveSettings = useMutation(api.drive.saveDriveSettings);
  const notifyAdmins = useMutation(api.drive.notifyUploadsPaused);
  const removeDocument = useAction(api.documents.removeDocument);
  const undoRemove = useAction(api.documents.undoRemove);
  const { user } = useAuth();
  const isAdmin = user?.appRole === "admin";
  /** The app's ONE uploader lives inside this card: tiles, "Upload files"
   *  and drops feed it instead of growing a second upload control. */
  const trayRef = useRef<DocumentsCardApi | null>(null);
  const [confirmResume, setConfirmResume] = useState(false);
  const [notified, setNotified] = useState(false);
  const [over, setOver] = useState(false);
  /** One tile's detail panel at a time (inline, never a portal). */
  const [openTile, setOpenTile] = useState<string | null>(null);
  /* A type requested from another surface (a
     header chip, a library "Upload" deep link) opens the ONE tray with that
     type fixed, after the tray has mounted. */
  const lastPreselect = useRef<DocKey | null>(null);
  useEffect(() => {
    if (!preselectKey) {
      lastPreselect.current = null;
      return;
    }
    if (lastPreselect.current === preselectKey) return;
    lastPreselect.current = preselectKey;
    setOpen(true);
    const timer = window.setTimeout(() => trayRef.current?.preselect(preselectKey), 80);
    return () => window.clearTimeout(timer);
  }, [preselectKey]);

  const storageKey = `documents.card.open:${user?._id ?? "anon"}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) !== "0";
    } catch {
      return true;
    }
  });
  const toggle = () => {
    setOpen((v) => {
      try {
        localStorage.setItem(storageKey, v ? "0" : "1");
      } catch {
        /* private mode — the in-memory state still works */
      }
      return !v;
    });
  };

  const documents = useMemo(() => (data?.documents ?? []) as DocumentMeta[], [data?.documents]);
  const total = documents.length || (data?.totalCount ?? 6);
  const uploaded = data?.uploadedCount ?? 0;
  /* THE single upload gate (task 1.2) — the same `getUploadState` the Storage
     chip, the tray, the server's beginUpload rejection and Admin → Google
     Drive read: this card can never say "Storage OK" while uploads are
     refused. */
  const uploadState: UploadState =
    data?.upload ??
    getUploadState({
      settings: DEFAULT_DRIVE_SETTINGS,
      connected: data ? data.storageConnected !== false : true,
    });

  const resumeUploads = async () => {
    try {
      await saveDriveSettings({ paused: false });
      toast.success("Uploads resumed", {
        description: "Files waiting in the tray are uploading now.",
      });
      setConfirmResume(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uploads could not be resumed");
    }
  };

  const notifyAdministrator = async () => {
    try {
      await notifyAdmins({});
      setNotified(true);
      toast.success("The administrator has been notified");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The administrator could not be notified");
    }
  };

  const removeDoc = async (documentId: string, label: string) => {
    try {
      await removeDocument({ documentId: documentId as never, reason: "Removed from the document card" });
      setOpenTile(null);
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${label} could not be removed`);
    }
  };
  /* A required file whose stored copy is gone from Drive is MISSING again —
     the same red "File missing in Drive" state the Documents row shows. */
  const missing = documents.filter(
    (d) => d.requirement?.required === true && (!d.current || d.current.missingInDrive === true),
  );
  const blockingMissing = missing.filter((d) => d.requirement?.blocking);

  /** A quiet confirmation the moment the last required file lands — the
   *  uploader's own banner and this card share the one warning list, so both
   *  clear together (and both come back if the server rejects the file). */
  const [justComplete, setJustComplete] = useState(false);
  const prevMissing = useRef(missing.length);
  useEffect(() => {
    const was = prevMissing.current;
    prevMissing.current = missing.length;
    if (was > 0 && missing.length === 0) {
      setJustComplete(true);
      const t = window.setTimeout(() => setJustComplete(false), 6000);
      return () => window.clearTimeout(t);
    }
    return;
  }, [missing.length]);

  /** The smart one-line summary — a guarded template, never a sentence built
   *  from missing data. The wording matches the Documents banner. */
  const summary = (() => {
    if (missing.length > 0) {
      const names = missing.map((d) => d.label).join(" · ");
      const plural = missing.length > 1;
      return blockingMissing.length > 0
        ? `${names} ${plural ? "are" : "is"} required for this facility; saving the NQAS assessment is blocked until ${plural ? "they are" : "it is"} uploaded.`
        : `${names} ${plural ? "are" : "is"} required for this facility under the current document rules.`;
    }
    if (uploaded >= total) return `All ${total} documents uploaded.`;
    return `${uploaded} of ${total} uploaded; every required document is present (${total - uploaded} optional not uploaded).`;
  })();

  if (!data) {
    return (
      <section
        className={cn("glass rounded-xl border border-border/60 p-3", className)}
        aria-busy="true"
        aria-label="Loading document status"
      >
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-muted" />
          <div className="h-3.5 w-32 rounded bg-muted" />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[52px] animate-pulse rounded-lg border border-border/50 bg-muted/40"
            />
          ))}
        </div>
      </section>
    );
  }

  const detailDoc = openTile ? documents.find((d) => d.key === openTile) ?? null : null;
  const nqasResultDoc = documents.find((d) => d.key === "NQAS_Result")?.current ?? null;

  return (
    <section
      className={cn("glass relative rounded-xl border border-border/60 p-3", className)}
      aria-label="Document status"
      data-testid="document-status-card"
      onDragOver={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.target as Node | null)) return;
        setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!canEdit) return;
        const files = Array.from(e.dataTransfer?.files ?? []);
        if (files.length > 0) {
          // Expand first so the tray (and its rows) are visible, then hand the
          // batch to the ONE uploader inside this card.
          setOpen(true);
          trayRef.current?.addFiles(files);
        }
      }}
    >
      {over && canEdit && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-primary bg-primary/5">
          <p className="rounded-lg bg-background/90 px-3 py-1.5 text-xs font-medium text-primary shadow-sm">
            Drop here — choose each file's type in the File as tray
          </p>
        </div>
      )}

      <header className="flex flex-wrap items-center gap-2">
        <DocRing done={uploaded} total={total} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            className="flex items-center gap-1 text-sm font-semibold hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Documents
            <ChevronDown
              className={cn(
                "size-3.5 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
          <p className="mt-0.5 text-[11px] text-muted-foreground" data-testid="document-status-count">
            {uploaded} of {total} uploaded
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const key = missing[0]?.key as DocKey | undefined;
            if (!key || !canEdit) return;
            // The uploader lives INSIDE this card: open the tray with the
            // missing type preselected — no second upload control anywhere.
            setOpen(true);
            trayRef.current?.preselect(key);
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            missing.length > 0
              ? "border-amber-300/70 bg-amber-50 text-amber-900 hover:bg-amber-100"
              : "border-emerald-300/70 bg-emerald-50 text-emerald-800",
          )}
          data-testid="document-status-chip"
        >
          {missing.length > 0 ? (
            <>
              <AlertTriangle className="size-3" /> {missing.length} required missing
            </>
          ) : uploaded >= total ? (
            <>
              <Check className="size-3" /> Complete
            </>
          ) : (
            <>
              <Check className="size-3" /> All required uploaded
            </>
          )}
        </button>
        <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
          Cycle {data.cycleNo}
        </span>
        {/* THE upload state, from the same `getUploadState` the server gate
            reads — it can never say "Storage OK" while uploads are refused. */}
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            uploadState.allowed
              ? "border-emerald-300/70 bg-emerald-50 text-emerald-800"
              : "border-amber-300/70 bg-amber-50 text-amber-900",
          )}
          data-testid="document-storage-chip"
          data-tip={uploadState.allowed ? undefined : uploadPausedDetail(uploadState)}
        >
          {uploadState.allowed ? (
            <>
              <CheckCircle2 className="size-3" /> Storage OK
            </>
          ) : uploadState.reason === "paused" ? (
            <>
              <AlertTriangle className="size-3" /> Uploads paused
              {uploadState.since ? ` since ${dayStamp(uploadState.since)}` : ""}
              {uploadState.setBy ? ` by ${uploadState.setBy}` : ""}
            </>
          ) : (
            <>
              <AlertTriangle className="size-3" /> {uploadState.chip}
            </>
          )}
        </span>
      </header>

      {/* ONE message when uploads are blocked, with the action for THIS role
          (task 1.3): a State Admin resumes inline, everyone else can notify
          the administrator. Always visible — even when the card is collapsed. */}
      {!uploadState.allowed && (
        <div
          role="alert"
          className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"
          data-testid="document-upload-blocked"
        >
          <AlertTriangle className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1">
            {isAdmin ? uploadPausedDetail(uploadState) : uploadBlockedSentence(uploadState)}
            {uploadState.reason === "paused" &&
              (waitingCount > 0
                ? ` ${waitingCount} file${waitingCount === 1 ? "" : "s"} waiting — kept for up to 24 hours and uploaded when uploads resume.`
                : " Files chosen in the tray stay there for up to 24 hours and upload as soon as uploads resume.")}
          </span>
          {uploadState.reason === "paused" && isAdmin && (
            <button
              type="button"
              onClick={() => {
                if (!confirmResume) {
                  setConfirmResume(true);
                  return;
                }
                void resumeUploads();
              }}
              className="shrink-0 rounded-md border border-amber-400/70 bg-background px-2 py-0.5 text-[11px] font-semibold hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              data-testid="document-resume-uploads"
            >
              {confirmResume ? "Click again to confirm" : "Resume uploads"}
            </button>
          )}
          {uploadState.reason === "paused" && !isAdmin && (
            <button
              type="button"
              disabled={notified}
              onClick={() => void notifyAdministrator()}
              className="shrink-0 rounded-md border border-amber-400/70 bg-background px-2 py-0.5 text-[11px] font-semibold hover:bg-amber-100 disabled:cursor-default disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              data-testid="document-notify-admin"
            >
              {notified ? "Administrator notified ✓" : "Notify administrator"}
            </button>
          )}
        </div>
      )}

      {/* One ZIP for every current file (and, when chosen, every kept
          version). Shared by the Profile and the Quick View because this card
          is the one Documents section both render. */}
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2">
        <DocumentExportControls facilityId={facilityId} />
      </div>

      {open && (
        <>
          {justComplete && missing.length === 0 && (
            <p
              className="mt-1.5 flex items-center gap-1 rounded-md border border-emerald-300/70 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-900"
              role="status"
              data-testid="document-status-complete"
            >
              <Check className="size-3" /> Required documents uploaded ✓
            </p>
          )}

          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {documents.map((doc) => {
              const Icon = tileIcon(doc.key);
              const req = doc.requirement ?? null;
              const current = doc.current ?? null;
              const inDriveMissing = current?.missingInDrive === true;
              const requiredMissing = req?.required === true && (!current || inDriveMissing);
              const isOpen = openTile === doc.key;
              return (
                <button
                  key={doc.key}
                  type="button"
                  aria-expanded={isOpen}
                  data-testid={`document-tile-${doc.key}`}
                  data-tip={requiredMissing ? (req?.reason ?? "Required for this facility") : undefined}
                  onClick={() => {
                    if (!current && canEdit) {
                      // "Upload now" opens the ONE tray's picker with this
                      // type preselected — no second upload control.
                      setOpen(true);
                      trayRef.current?.preselect(doc.key as DocKey);
                      return;
                    }
                    setOpenTile(isOpen ? null : doc.key);
                  }}
                  className={cn(
                    "flex min-h-[52px] w-full items-start gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isOpen && "ring-1 ring-primary/50",
                    inDriveMissing
                      ? "border-rose-300/80 bg-rose-50"
                      : requiredMissing
                        ? "border-amber-300/80 bg-amber-50"
                        : current
                          ? "border-border/70 bg-background hover:bg-muted/50"
                          : "border-dashed border-border/70 bg-background hover:bg-muted/40",
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      inDriveMissing
                        ? "text-rose-600"
                        : requiredMissing
                          ? "text-amber-700"
                          : current
                            ? "text-emerald-600"
                            : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1">
                      <span className="truncate text-[12px] font-medium">{doc.label}</span>
                      {req && (
                        <span
                          className={cn(
                            "rounded border px-1 text-[9px] font-medium whitespace-nowrap",
                            req.required
                              ? "border-amber-300/70 bg-amber-100 text-amber-900"
                              : "border-border/70 text-muted-foreground",
                          )}
                          data-testid="document-tile-badge"
                        >
                          {req.badge}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                      {inDriveMissing
                        ? "File missing in Drive — re-upload"
                        : current
                          ? `${dayLabel(current.uploadedAt)} · ${formatFileSize(current.size)}${
                              current.uploadedByName ? ` · ${current.uploadedByName}` : ""
                            }`
                          : requiredMissing
                            ? "Not uploaded — required"
                            : "Not uploaded"}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium">
                      {inDriveMissing ? (
                        <span className="text-rose-700">Re-upload</span>
                      ) : current ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-700">
                          <Check className="size-2.5" /> Uploaded
                        </span>
                      ) : requiredMissing ? (
                        <span className="inline-flex items-center gap-0.5 text-amber-800">
                          <AlertTriangle className="size-2.5" /> Upload now
                        </span>
                      ) : canEdit ? (
                        <span className="text-primary">Upload</span>
                      ) : (
                        <span className="text-muted-foreground">Not uploaded</span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {readerEnabled && nqasResultDoc && (
            <div className="mt-2 flex flex-wrap items-end justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold">NQAS Result</p>
                <ResultReadStatusLine documentId={nqasResultDoc.id} />
              </div>
              {canEdit && (
                <ResultReadButton
                  documentId={nqasResultDoc.id}
                  facilityId={facilityId}
                  size="xs"
                />
              )}
            </div>
          )}

          {/* Inline detail for the open tile: identity, actions and history. */}
          {detailDoc && (
            <div
              className="mt-1.5 rounded-lg border border-border/70 bg-background p-2 text-xs"
              data-testid="document-tile-detail"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold">{detailDoc.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {detailDoc.requirement?.badge ?? "Optional"}
                    {detailDoc.requirement?.reason ? ` — ${detailDoc.requirement.reason}` : ""}
                  </p>
                  {detailDoc.current ? (
                    <>
                      <p className="mt-1 break-words">
                        {detailDoc.current.displayName ?? detailDoc.current.originalName} ·{" "}
                        {formatFileSize(detailDoc.current.size)} · v
                        {detailDoc.current.versionNo}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Uploaded {dayLabel(detailDoc.current.uploadedAt)}
                        {detailDoc.current.uploadedByName
                          ? ` · ${detailDoc.current.uploadedByName}`
                          : ""}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-muted-foreground">No file uploaded yet.</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Close document detail"
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setOpenTile(null)}
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {detailDoc.current ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <DocumentPreviewButton doc={detailDoc.current} />
                  <DocumentOpenLink
                    documentId={detailDoc.current.id}
                    className="font-semibold text-primary"
                    ariaLabel={`Open ${detailDoc.label} in a new tab`}
                  >
                    <ExternalLink className="size-3" /> Open
                  </DocumentOpenLink>
                  <DocumentDownloadLink documentId={detailDoc.current.id}>
                    <Download className="size-3" /> Download
                  </DocumentDownloadLink>
                  {canEdit && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent"
                      onClick={() => {
                        setOpen(true);
                        trayRef.current?.preselect(detailDoc.key as DocKey);
                      }}
                      data-testid={`document-replace-${detailDoc.key}`}
                    >
                      <UploadCloud className="size-3" /> Replace
                    </button>
                  )}
                  {canEdit && detailDoc.current && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium text-destructive hover:bg-accent"
                      onClick={() => void removeDoc(detailDoc.current!.id, detailDoc.label)}
                      data-testid="document-tile-remove"
                    >
                      <Trash2 className="size-3" /> Remove
                    </button>
                  )}
                </div>
              ) : canEdit ? (
                <button
                  type="button"
                  className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground"
                  onClick={() => {
                    setOpen(true);
                    trayRef.current?.preselect(detailDoc.key as DocKey);
                  }}
                >
                  <UploadCloud className="size-3" /> Upload now
                </button>
              ) : (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Lock className="size-3" /> View only
                </p>
              )}

              {(detailDoc.versions?.length ?? 0) > 0 && (
                <div className="mt-1.5 border-t border-border/60 pt-1.5">
                  <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <History className="size-3" /> History ({detailDoc.versions!.length})
                  </p>
                  <ul className="mt-0.5 space-y-0.5">
                    {detailDoc.versions!.map((v) => (
                      <li key={v.id} className="truncate text-[11px] text-muted-foreground">
                        v{v.versionNo ?? "-"} · {dayLabel(v.uploadedAt)} ·{" "}
                        {v.size ? formatFileSize(v.size) : "-"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <p
            className={cn(
              "mt-1.5 text-[11px]",
              missing.length > 0 ? "font-medium text-amber-900" : "text-muted-foreground",
            )}
            data-testid="document-status-summary"
          >
            {summary}
          </p>

          {canEdit && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => trayRef.current?.pick()}
                className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-semibold hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                data-testid="document-status-upload"
              >
                <UploadCloud className="size-3" /> Upload files
              </button>
              <span className="text-[10.5px] text-muted-foreground">
                Drop files anywhere on this card — you choose each file's type next.
              </span>
            </div>
          )}

          {/* The ONE uploader: the app's only "File as" tray, mounted here so
              the old separate Documents section could be removed (task 3). */}
          <DocumentsCard
            facilityId={facilityId}
            canEdit={canEdit}
            apiRef={trayRef}
            preselectKey={preselectKey}
            pendingFiles={pendingFiles}
            className="mt-2 border-0 bg-transparent p-0"
          />
        </>
      )}
    </section>
  );
}
