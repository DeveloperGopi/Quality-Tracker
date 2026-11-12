import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, e as Eye, L as LoaderCircle, a2 as Download, E as ExternalLink, F as FileSpreadsheet, v as Image, u as FileText, ar as Trash2, w as RotateCcw, m as Check, T as TriangleAlert, a3 as X, Z as Upload } from './icons-BxQpodNr.js';
import { c as cn, l as useQuery, j as api, o as useAction, B as Button, t as toast } from './index-CBV6wOh8.js';
import { n as useDocumentUrl, f as formatFileSize, P as PdfCanvasViewer, d as documentFieldConfig, v as validateDocumentFile } from './PdfCanvasViewer-C0MZuH_2.js';
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription } from './dialog-BW3GEiPg.js';

function withRef(message, ref) {
  if (!ref || message.includes("ref ")) return message;
  return `${message} (ref ${ref})`;
}

const UPLOAD = {
  /** 4 MB — a multiple of 256 KB, as Drive's resumable protocol requires. */
  chunkBytes: 4 * 1024 * 1024,
  /** Chunk attempts before the upload is reported as failed. */
  maxAttempts: 4
};
const STORAGE_NOT_CONNECTED = "Document storage is not connected: ask the administrator";
const STORAGE_NEEDS_RECONNECT = "Document storage needs reconnecting: ask the administrator, then retry this upload";
const NETWORK_ERROR = "Could not reach the server — check your connection and retry";
const UPLOAD_FAILED = "The upload failed — retry, or ask the administrator";
const UPLOAD_CANCELLED = "Upload cancelled — the file was not saved";
const SERVER_ERROR = "The server could not process the upload — retry";
function isNetworkError(err) {
  if (err instanceof TypeError) return true;
  const text = err instanceof Error ? err.message : String(err);
  return /failed to fetch|fetch failed|networkerror|network error|load failed|err_network|econnreset|enotfound/i.test(
    text
  );
}
function isRetryableUploadError(err) {
  if (isNetworkError(err)) return true;
  const text = (err instanceof Error ? err.message : String(err ?? "")) + " " + String(err?.data ?? "");
  if (/not connected|not_configured|refresh token|reconnect|revoked|invalid_grant|permission|not allowed|outside your assigned|paused|must be|larger than|is empty|already uploaded|unknown document type|session expired|checksum|stalled/i.test(
    text
  )) {
    return false;
  }
  return true;
}
function friendlyUploadError(err) {
  const text = (err instanceof Error ? err.message : String(err ?? "")).trim();
  const data = typeof err?.data === "string" ? String(err.data) : "";
  const message = data || text;
  const ref = /\(ref [A-Za-z0-9]{4,12}\)/.exec(message)?.[0] ?? "";
  const keep = (sentence) => ref && !sentence.includes(ref) ? `${sentence} ${ref}` : sentence;
  if (isNetworkError(err)) return NETWORK_ERROR;
  if (/root folder|not set up/i.test(message))
    return keep("Document storage is not set up: the root folder is missing in Settings → Google Drive");
  if (/not connected|not_configured|unavailable|no refresh token|not configured/i.test(message))
    return keep(STORAGE_NOT_CONNECTED);
  if (/revoked|invalid_grant|reconnect|stored google credential|google access/i.test(message))
    return keep(STORAGE_NEEDS_RECONNECT);
  if (/quota|storage full|out of space/i.test(message))
    return keep("Google Drive is full: ask the administrator to free space");
  if (/rate limit|too many requests|busy/i.test(message))
    return keep("Google Drive is busy — wait a moment and retry");
  if (/permission|not allowed|forbidden|outside your assigned/i.test(message))
    return keep("You do not have permission to upload this document");
  if (/server error|request id|called by client|unexpected/i.test(message)) return SERVER_ERROR;
  return message || UPLOAD_FAILED;
}

function uploadKeyFor(facilityId, docKey, file) {
  return [
    facilityId,
    docKey,
    file.name.replace(/[^\w.-]+/g, "_").slice(0, 40),
    file.size,
    file.lastModified ?? 0
  ].join("-");
}
async function uploadDocument(input, transport, onProgress, signal, onBegin) {
  const uploadKey = input.uploadKey ?? uploadKeyFor(input.facilityId, input.docKey, input.file);
  const total = input.file.size;
  onProgress?.({ stage: "starting", sent: 0, total });
  const begun = await transport.begin({
    facilityId: input.facilityId,
    docKey: input.docKey,
    cycleNo: input.cycleNo,
    originalName: input.file.name,
    declaredMime: input.file.type || "application/octet-stream",
    declaredSize: total,
    uploadKey
  });
  onBegin?.(begun);
  const data = await input.bytes();
  let offset = Math.max(0, Math.min(begun.received ?? 0, total));
  while (offset < total) {
    if (signal?.aborted) {
      await transport.cancel(uploadKey);
      throw new Error("Upload cancelled");
    }
    const chunk = data.subarray(offset, Math.min(offset + UPLOAD.chunkBytes, total));
    let attempt = 0;
    for (; ; ) {
      try {
        const result = await transport.putChunk({ uploadKey, bytes: chunk, offset, total });
        if (result.next <= offset && offset < total) {
          throw new Error("The upload stalled — retry");
        }
        offset = result.next;
        break;
      } catch (err) {
        attempt += 1;
        if (attempt > UPLOAD.maxAttempts || !isRetryableUploadError(err)) throw err;
        onProgress?.({ stage: "retrying", sent: offset, total, attempt });
        await new Promise((resolve) => setTimeout(resolve, Math.min(8e3, 400 * 2 ** attempt)));
      }
    }
    onProgress?.({ stage: "uploading", sent: offset, total });
  }
  onProgress?.({ stage: "verifying", sent: total, total });
  const done = await transport.finalize(uploadKey);
  onProgress?.({ stage: "done", sent: total, total });
  return { ...done, ref: begun.ref };
}

function toArrayBuffer(bytes) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  );
}
function createUploadTransport(actions, facilityId) {
  return {
    begin: (input) => actions.begin({ ...input, facilityId }),
    putChunk: async ({ uploadKey, bytes, offset, total }) => {
      const result = await actions.putChunk({
        uploadKey,
        offset,
        bytes: toArrayBuffer(bytes),
        final: offset + bytes.length >= total
      });
      return { next: result.received, done: result.done };
    },
    finalize: (uploadKey) => actions.finalize({ uploadKey }),
    cancel: async (uploadKey) => {
      await actions.cancel({ uploadKey });
    }
  };
}

function extensionOf(name) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}
function previewKind(doc) {
  const ext = extensionOf(doc.originalName);
  const mime = (doc.mimeType ?? "").toLowerCase();
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (["xlsx", "xls", "csv"].includes(ext) || /spreadsheetml|ms-excel|text\/csv/.test(mime))
    return "sheet";
  return "other";
}
function DocumentOpenLink({
  documentId,
  mode = "inline",
  children,
  className,
  ariaLabel
}) {
  const href = useDocumentUrl(documentId, mode);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "a",
    {
      href: href ?? void 0,
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-disabled": !href,
      "aria-label": ariaLabel,
      onClick: (event) => {
        if (!href) event.preventDefault();
      },
      className: cn(
        "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent",
        !href && "pointer-events-none opacity-50",
        className
      ),
      children
    }
  );
}
function DocumentDownloadLink({
  documentId,
  children,
  className,
  ariaLabel
}) {
  const href = useDocumentUrl(documentId, "attachment");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "a",
    {
      href: href ?? void 0,
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-disabled": !href,
      "aria-label": ariaLabel,
      onClick: (event) => {
        if (!href) event.preventDefault();
      },
      className: cn(
        "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent",
        !href && "pointer-events-none opacity-50",
        className
      ),
      children
    }
  );
}
function DocumentPreviewButton({
  doc,
  label,
  className,
  ariaLabel
}) {
  const [open, setOpen] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => setOpen(true),
        "aria-label": ariaLabel,
        className: cn(
          "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent",
          className
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-3" }),
          " ",
          label ?? "Preview"
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentPreviewDialog, { open, onOpenChange: setOpen, doc })
  ] });
}
function DocumentPreviewDialog({
  open,
  onOpenChange,
  doc
}) {
  const kind = previewKind(doc);
  const inlineHref = useDocumentUrl(doc.id, "inline", open);
  const attachmentHref = useDocumentUrl(doc.id, "attachment", open);
  const [sheet, setSheet] = reactExports.useState({ names: [], active: "", rows: [], error: null, loading: false });
  reactExports.useEffect(() => {
    if (!open || kind !== "sheet" || !inlineHref) return;
    let live = true;
    setSheet({ names: [], active: "", rows: [], error: null, loading: true });
    void (async () => {
      try {
        const res = await fetch(inlineHref);
        if (!res.ok) {
          const text = (await res.text()).slice(0, 180);
          throw new Error(text || "This file could not be read");
        }
        const bytes = await res.arrayBuffer();
        const XLSX = await __vitePreload(() => import('./vendor-xlsx-yBJAythd.js'),true              ?[]:void 0);
        const wb = XLSX.read(bytes, { type: "array" });
        const names = wb.SheetNames.slice(0, 20);
        const active = names[0] ?? "";
        const rows = active ? XLSX.utils.sheet_to_json(wb.Sheets[active], {
          header: 1,
          blankrows: false,
          defval: "",
          raw: false
        }) : [];
        if (live)
          setSheet({
            names,
            active,
            rows: rows.slice(0, 200),
            error: null,
            loading: false
          });
      } catch (err) {
        if (live)
          setSheet({
            names: [],
            active: "",
            rows: [],
            error: err instanceof Error ? err.message : "This file could not be read",
            loading: false
          });
      }
    })();
    return () => {
      live = false;
    };
  }, [open, kind, inlineHref]);
  const pickSheet = async (name) => {
    if (!inlineHref) return;
    setSheet((prev) => ({ ...prev, active: name, loading: true, error: null }));
    try {
      const res = await fetch(inlineHref);
      if (!res.ok) throw new Error((await res.text()).slice(0, 180) || "This file could not be read");
      const XLSX = await __vitePreload(() => import('./vendor-xlsx-yBJAythd.js'),true              ?[]:void 0);
      const wb = XLSX.read(await res.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], {
        header: 1,
        blankrows: false,
        defval: "",
        raw: false
      }) ?? [];
      setSheet((prev) => ({ ...prev, active: name, rows: rows.slice(0, 200), loading: false }));
    } catch (err) {
      setSheet((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "This file could not be read"
      }));
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-5xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "pr-6 break-words text-sm", children: doc.displayName ?? doc.originalName }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { className: "text-xs", children: [
        doc.size ? `${formatFileSize(doc.size)} · ` : "",
        kind === "sheet" ? "First sheet, first 200 rows" : "Preview"
      ] })
    ] }),
    !inlineHref ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-40 items-center justify-center text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }),
      " Preparing the file…"
    ] }) : kind === "pdf" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      PdfCanvasViewer,
      {
        url: inlineHref,
        label: doc.displayName ?? doc.originalName,
        className: "h-[68vh]"
      }
    ) : kind === "image" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex max-h-[68vh] items-center justify-center overflow-auto rounded-lg border border-border/60 bg-muted/30 p-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "img",
      {
        src: inlineHref ?? void 0,
        alt: `Preview of ${doc.displayName ?? doc.originalName}`,
        className: "max-h-[66vh] max-w-full object-contain"
      }
    ) }) : kind === "sheet" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
      sheet.names.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 flex flex-wrap gap-1", role: "tablist", "aria-label": "Sheets", children: sheet.names.map((name) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": sheet.active === name,
          onClick: () => void pickSheet(name),
          className: cn(
            "rounded-md border px-2 py-1 text-[11px] font-medium",
            sheet.active === name ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-accent"
          ),
          children: name
        },
        name
      )) }),
      sheet.loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-40 items-center justify-center text-sm text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }),
        " Reading the sheet…"
      ] }) : sheet.error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900", children: [
        sheet.error,
        " — download the file to open it in Excel."
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-[62vh] overflow-auto rounded-lg border border-border/60", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "w-full border-collapse text-[11px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: sheet.rows.map((row, r) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: r === 0 ? "bg-muted/60 font-semibold" : void 0, children: row.map((cell, c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "td",
          {
            className: "max-w-[18rem] truncate border-b border-r border-border/40 px-1.5 py-1 align-top",
            children: String(cell ?? "")
          },
          c
        )) }, r)) }) }),
        sheet.rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "p-4 text-sm text-muted-foreground", children: "This sheet is empty." })
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Preview not available for this file type." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs", children: "Download it to open in the right application." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-end gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          href: attachmentHref ?? inlineHref ?? void 0,
          target: "_blank",
          rel: "noopener noreferrer",
          className: cn(
            "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground",
            !attachmentHref && !inlineHref && "pointer-events-none opacity-50"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" }),
            " Download"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          href: inlineHref ?? void 0,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3.5" }),
            " Open in new tab"
          ]
        }
      )
    ] })
  ] }) });
}

function formatDay(ts) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/\s+/g, "-");
}
function FileDropzone({
  accept,
  onFile,
  disabled,
  hint,
  compact,
  label = "Choose file",
  camera
}) {
  const inputRef = reactExports.useRef(null);
  const cameraRef = reactExports.useRef(null);
  const [over, setOver] = reactExports.useState(false);
  const take = (files) => {
    const file = files?.[0];
    if (file) onFile(file);
  };
  const onDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOver(false);
    if (disabled) return;
    take(event.dataTransfer?.files ?? null);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-testid": "file-dropzone",
      onDragOver: (e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop,
      className: cn(
        "rounded-lg border border-dashed transition-colors",
        compact ? "px-2 py-1.5" : "px-3 py-2",
        over ? "border-primary bg-primary/5" : "border-border/70",
        disabled && "opacity-60"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: inputRef,
            type: "file",
            className: "hidden",
            accept,
            disabled,
            "data-testid": "file-input",
            onChange: (e) => {
              take(e.target.files);
              e.target.value = "";
            }
          }
        ),
        camera && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: cameraRef,
            type: "file",
            accept: "image/*",
            capture: "environment",
            className: "hidden",
            disabled,
            onChange: (e) => {
              take(e.target.files);
              e.target.value = "";
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              type: "button",
              size: "sm",
              variant: "outline",
              className: "gap-1.5",
              disabled,
              onClick: () => inputRef.current?.click(),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-3.5", "aria-hidden": "true" }),
                label
              ]
            }
          ),
          camera && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              type: "button",
              size: "sm",
              variant: "ghost",
              className: "gap-1.5 md:hidden",
              disabled,
              onClick: () => cameraRef.current?.click(),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "size-3.5", "aria-hidden": "true" }),
                "Camera"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground", children: [
            "or drag a file here · paste (Ctrl+V) · ",
            hint
          ] })
        ] })
      ]
    }
  );
}
function DocumentField({
  facilityId,
  docKey,
  doc,
  cycleNo,
  canEdit,
  onChanged,
  compact,
  className,
  incoming,
  maxMb,
  onUploaded,
  onUploadState,
  onRequestUpload,
  onNotice,
  onBeforeUpload
}) {
  const config = documentFieldConfig(docKey);
  const label = config?.label ?? docKey;
  const limitMb = maxMb ?? config?.maxMb ?? 10;
  const standalone = useQuery(
    api.documents.listForFacility,
    doc ? "skip" : { facilityId }
  );
  const beginUpload = useAction(api.documents.beginUpload);
  const uploadChunk = useAction(api.documents.uploadChunk);
  const finalizeUpload = useAction(api.documents.finalizeUpload);
  const cancelUpload = useAction(api.documents.cancelUpload);
  const removeDocument = useAction(api.documents.removeDocument);
  const undoRemove = useAction(api.documents.undoRemove);
  const [progress, setProgress] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [info, setInfo] = reactExports.useState(null);
  const [lastFile, setLastFile] = reactExports.useState(null);
  const [done, setDone] = reactExports.useState(null);
  const [announce, setAnnounce] = reactExports.useState("");
  const signal = reactExports.useRef({ aborted: false });
  const startRef = reactExports.useRef(async () => {
  });
  const lastIncoming = reactExports.useRef(null);
  const uploadRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    signal.current = { aborted: true };
    setError(null);
    setInfo(null);
    setProgress(null);
    setLastFile(null);
    setDone(null);
    setAnnounce("");
    uploadRef.current = null;
  }, [facilityId]);
  const view = doc ?? (standalone ? standalone.documents.find((d) => d.key === docKey) : void 0);
  const cycle = cycleNo ?? standalone?.cycleNo ?? 1;
  const requirement = view?.requirement ?? (config?.requiredForCertified ? {
    required: true,
    blocking: true,
    badge: "Required: certified",
    reason: "Required because certification status is certified or conditional."
  } : null);
  const transport = createUploadTransport(
    {
      begin: beginUpload,
      putChunk: uploadChunk,
      finalize: finalizeUpload,
      cancel: cancelUpload
    },
    facilityId
  );
  const start = async (file) => {
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
          uploadKey: uploadKeyFor(facilityId, docKey, file)
        },
        transport,
        (p) => setProgress({ sent: p.sent, total: p.total, stage: p.stage }),
        signal.current,
        (begin) => {
          uploadRef.current = begin.ref ?? null;
        }
      );
      setProgress(null);
      if (result.duplicate) {
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
        description: `${file.name} · ${formatFileSize(file.size)}`
      });
      onUploadState?.(docKey, "done");
      onUploaded?.(docKey, file.name);
      onChanged?.();
    } catch (err) {
      setProgress(null);
      const message = friendlyUploadError(err);
      const shown = signal.current.aborted ? UPLOAD_CANCELLED : withRef(message, uploadRef.current);
      setError(shown);
      setAnnounce(`${label} upload failed`);
      onUploadState?.(docKey, "error");
    }
  };
  reactExports.useEffect(() => {
    startRef.current = start;
  });
  const applyIncoming = (file) => {
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
  reactExports.useEffect(() => {
    if (!incoming || lastIncoming.current === incoming.token) return;
    lastIncoming.current = incoming.token;
    applyIncoming(incoming.file);
  }, [incoming, docKey]);
  const cancel = () => {
    signal.current.aborted = true;
    setProgress(null);
    setError(UPLOAD_CANCELLED);
  };
  const remove = async (documentId) => {
    if (!window.confirm(`Remove ${label}? You can undo this for 30 seconds.`)) return;
    try {
      await removeDocument({ documentId, reason: "Removed from the document field" });
      toast.success(`${label} moved to review`, {
        description: "It is kept for the retention period before deletion.",
        action: {
          label: "Undo",
          onClick: () => {
            void undoRemove({ documentId }).then(
              () => toast.success("Removal undone"),
              (err) => toast.error(err instanceof Error ? err.message : "Undo failed")
            );
          }
        }
      });
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the document");
    }
  };
  const current = view?.current ?? null;
  const uploading = progress != null && progress.stage !== "done";
  const pct = progress?.total ? Math.round(progress.sent / progress.total * 100) : 5;
  if (!config) return null;
  if (compact) {
    const RowIcon = docKey === "SA_Checklist" ? FileSpreadsheet : docKey === "NQAS_Result" || docKey === "NOC" ? Image : FileText;
    if (!current && !progress && !error && !info) return null;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: cn("flex min-h-11 flex-wrap items-center gap-2 py-1.5", className),
        "data-testid": `document-field-${docKey}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", "aria-live": "polite", className: "sr-only", children: announce }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(RowIcon, { className: "size-4 shrink-0 text-muted-foreground", "aria-hidden": "true" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[13px] font-medium", children: config.label }),
              requirement && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: cn(
                    "rounded border px-1 text-[10px]",
                    requirement.required ? "border-amber-300/70 bg-amber-50 text-amber-900" : "border-border/70 text-muted-foreground"
                  ),
                  "data-testid": "document-badge",
                  "data-tip": requirement.reason ?? void 0,
                  children: requirement.badge
                }
              ),
              current?.missingInDrive && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-rose-300/70 bg-rose-50 px-1.5 text-[10px] font-medium text-rose-800", children: "File missing in Drive" }),
              done && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-emerald-300/70 bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300", children: "Saved ✓" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-[11px] text-muted-foreground", "data-testid": "document-current", children: current ? `${current.displayName ?? current.originalName} · ${formatFileSize(current.size)} · Uploaded ${formatDay(
              current.uploadedAt
            )}${current.uploadedByName ? ` · ${current.uploadedByName}` : ""}` : uploading ? "Uploading…" : error ? (
              // A failed row states its error ONCE below — never a second
              // "Not uploaded" line next to the chips.
              lastFile ? `${lastFile.name} · ${formatFileSize(lastFile.size)}` : "-"
            ) : "Not uploaded" })
          ] }),
          uploading && progress ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-40 shrink-0 items-center gap-1.5", "data-testid": "document-progress", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1 flex-1 overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full rounded-full bg-primary transition-all", style: { width: `${pct}%` } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "text-[10px] font-medium text-muted-foreground hover:text-foreground",
                onClick: cancel,
                children: "Cancel"
              }
            )
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-0.5", children: [
            current && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                DocumentPreviewButton,
                {
                  doc: current,
                  label: "",
                  ariaLabel: `Preview ${config.label}`,
                  className: "rounded border-0 bg-transparent p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                DocumentDownloadLink,
                {
                  documentId: current.id,
                  ariaLabel: `Download ${config.label}`,
                  className: "rounded border-0 bg-transparent p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" })
                }
              ),
              canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive",
                  "aria-label": `Remove ${config.label}`,
                  onClick: () => void remove(current.id),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" })
                }
              )
            ] }),
            current && canEdit && onRequestUpload && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground",
                "aria-label": `Replace ${config.label}`,
                "data-tip": "Replace through the card's uploader — the previous version is kept",
                onClick: () => onRequestUpload(docKey),
                "data-testid": `document-replace-${docKey}`,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-3.5" })
              }
            )
          ] }),
          info && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex w-full items-start gap-1 text-[11px] font-medium text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mt-0.5 size-3 shrink-0 text-emerald-600", "aria-hidden": true }),
            " ",
            info
          ] }),
          error && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { role: "alert", className: "flex w-full flex-wrap items-center gap-1 text-[11px] font-medium text-destructive", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3 shrink-0" }),
            " ",
            error,
            lastFile && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "ml-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium hover:bg-muted",
                onClick: () => void start(lastFile),
                children: "Retry"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "rounded border border-border px-1.5 py-0.5 text-[10px] font-medium hover:bg-muted",
                "aria-label": `Remove the failed upload for ${config.label}`,
                "data-testid": `document-dismiss-${docKey}`,
                onClick: () => {
                  signal.current = { aborted: true };
                  setError(null);
                  setProgress(null);
                  setLastFile(null);
                  setAnnounce("");
                  onUploadState?.(docKey, "clear");
                },
                children: "Remove"
              }
            )
          ] })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("min-w-0", className), "data-testid": `document-field-${docKey}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", "aria-live": "polite", className: "sr-only", children: announce }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-x-2 gap-y-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex min-w-0 items-center gap-1.5 text-sm", children: [
        docKey === "SA_Checklist" ? /* @__PURE__ */ jsxRuntimeExports.jsx(FileSpreadsheet, { className: "size-3.5 shrink-0 text-muted-foreground", "aria-hidden": "true" }) : docKey === "NQAS_Result" || docKey === "NOC" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "size-3.5 shrink-0 text-muted-foreground", "aria-hidden": "true" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-3.5 shrink-0 text-muted-foreground", "aria-hidden": "true" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate font-medium", children: config.label }),
        requirement ? requirement.required ? current ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "rounded border border-border/70 px-1 text-[10px] uppercase text-muted-foreground",
            "data-testid": "document-required",
            children: requirement.badge
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "span",
          {
            className: "rounded-full border border-amber-300/70 bg-amber-50 px-1.5 text-[10px] font-medium text-amber-900",
            "data-testid": "document-required-missing",
            "data-tip": requirement.reason ?? void 0,
            children: [
              requirement.badge,
              " · missing"
            ]
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "rounded border border-border/70 px-1 text-[10px] text-muted-foreground",
            "data-testid": "document-optional",
            children: "Optional"
          }
        ) : null,
        done && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-emerald-300/70 bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300", children: "Recently updated" })
      ] }),
      current && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 flex-1 flex-wrap items-center gap-x-1 text-xs text-muted-foreground", "data-testid": "document-current", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DocumentOpenLink,
          {
            documentId: current.id,
            className: "max-w-full truncate border-0 bg-transparent p-0 font-medium text-primary underline-offset-2 hover:bg-transparent hover:underline",
            ariaLabel: `Open ${current.displayName ?? current.originalName}`,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "truncate",
                "data-testid": "document-current-name",
                "data-tip": `Uploaded as ${current.originalName}`,
                children: current.displayName ?? current.originalName
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "truncate", children: [
          "· ",
          formatFileSize(current.size),
          " · v",
          current.versionNo,
          " · Uploaded ",
          formatDay(current.uploadedAt),
          current.uploadedByName ? ` · ${current.uploadedByName}` : ""
        ] })
      ] })
    ] }),
    current?.missingInDrive && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 flex items-center gap-1 text-[11px] text-amber-800 dark:text-amber-300", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3" }),
      " File missing in Drive — re-upload from the source."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex flex-wrap items-center gap-1.5", children: [
      current && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DocumentPreviewButton,
          {
            doc: current,
            ariaLabel: `Preview ${config.label}`,
            className: "border-0 bg-transparent px-1.5 text-xs font-normal hover:bg-accent"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          DocumentOpenLink,
          {
            documentId: current.id,
            ariaLabel: `Open ${config.label} in a new tab`,
            className: "border-0 bg-transparent px-1.5 text-xs font-semibold text-primary hover:bg-accent",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3.5" }),
              " Open"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          DocumentDownloadLink,
          {
            documentId: current.id,
            ariaLabel: `Download ${config.label}`,
            className: "border-0 bg-transparent px-1.5 text-xs font-normal hover:bg-accent",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" }),
              " Download"
            ]
          }
        ),
        canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            variant: "ghost",
            className: "h-7 gap-1 px-1.5 text-xs text-muted-foreground hover:text-destructive",
            "aria-label": `Remove ${config.label}`,
            onClick: () => void remove(current.id),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" }),
              " Remove"
            ]
          }
        )
      ] }),
      canEdit && !uploading && /* @__PURE__ */ jsxRuntimeExports.jsx(
        FileDropzone,
        {
          accept: config.accept,
          hint: `${config.typeHint} · up to ${limitMb} MB`,
          compact,
          label: current ? "Replace" : "Choose file",
          disabled: uploading,
          camera: config.accept.includes("png") || config.accept.includes("jpg"),
          onFile: (file) => void start(file)
        }
      )
    ] }),
    uploading && progress && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 max-w-[20rem]", "data-testid": "document-progress", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1 overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full rounded-full bg-primary transition-all", style: { width: `${pct}%` } }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3 animate-spin", "aria-hidden": "true" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: progress.stage === "starting" ? "Starting…" : progress.stage === "retrying" ? "Waiting to retry…" : progress.stage === "verifying" ? "Verifying file…" : `Uploading… ${pct}%` }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            className: "ml-auto inline-flex items-center gap-0.5 font-medium text-foreground hover:underline",
            onClick: cancel,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3" }),
              " Cancel"
            ]
          }
        )
      ] })
    ] }),
    info && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1.5 flex items-start gap-1 text-[11px] font-medium text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mt-0.5 size-3 shrink-0 text-emerald-600", "aria-hidden": true }),
      " ",
      info
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex flex-wrap items-start gap-1.5", role: "alert", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-start gap-1 text-[11px] font-medium text-destructive", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-0.5 size-3 shrink-0" }),
        " ",
        error
      ] }),
      lastFile && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          size: "sm",
          variant: "outline",
          className: "h-6 gap-1 px-1.5 text-[11px]",
          onClick: () => void start(lastFile),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-3" }),
            " Retry"
          ]
        }
      )
    ] })
  ] });
}

export { DocumentField as D, uploadKeyFor as a, DocumentPreviewButton as b, createUploadTransport as c, DocumentOpenLink as d, DocumentDownloadLink as e, friendlyUploadError as f, uploadDocument as u };
