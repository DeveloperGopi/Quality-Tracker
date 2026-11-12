import { cV as COUNTED_DOC_KEYS, d1 as docType, d2 as acceptFor, d3 as wrongTypeMessage, d4 as maxBytesFor, h as ACTIVE_DOC_TYPES, d5 as allowedMimesFor, d6 as DOC_TYPES } from './AppShell-CP099uvN.js';
import { r as reactExports, aj as ChevronLeft, z as ChevronRight, c3 as ZoomOut, c4 as ZoomIn, aZ as RefreshCw, L as LoaderCircle, T as TriangleAlert } from './icons-BxQpodNr.js';
import { a as useConvex, j as api, B as Button, c as cn } from './index-CBV6wOh8.js';
import { e as convexSiteOrigin } from './shareLink-_K-oJu5R.js';
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';

const STATUS_FIELD = {
  NQAS_Result: "nqas_result_status",
  NOC: "noc_status"
};
function typeHintFor(key) {
  const mimes = allowedMimesFor(key);
  const hasPdf = mimes.includes("application/pdf");
  const hasXlsx = mimes.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const hasXls = mimes.includes("application/vnd.ms-excel");
  const hasImage = mimes.some((m) => m.startsWith("image/"));
  if (hasXlsx && hasXls) return "Excel (.xlsx or .xls)";
  if (hasPdf && hasImage) return "PDF or image (PNG/JPG)";
  if (hasPdf) return "PDF";
  if (hasXlsx) return "Excel (.xlsx)";
  return "File";
}
const DOCUMENT_FIELDS = ACTIVE_DOC_TYPES.map((t) => ({
  docKey: t.key,
  fileField: t.key === "NQAS_Result" ? "nqas_result_file" : t.key,
  statusField: STATUS_FIELD[t.key] ?? null,
  label: t.label,
  accept: acceptFor(t.key),
  typeHint: typeHintFor(t.key),
  maxMb: Math.round(maxBytesFor(t.key) / (1024 * 1024)),
  requiredForCertified: t.requiredForCertified
}));
function documentFieldConfig(key) {
  return DOCUMENT_FIELDS.find((d) => d.docKey === key) ?? null;
}
const DOCUMENT_TOTAL = COUNTED_DOC_KEYS.length;
const DOCUMENT_SHORT_LABEL = {
  SA_Report: "SA Report",
  SA_Checklist: "SA Checklist",
  NQAS_Result: "NQAS Result",
  Gap_Closure: "Gap Closure Proceeding",
  Condemned: "Condemned Certificate",
  NOC: "Fire NOC"
};
const NAME_HINTS = [
  { key: "SA_Checklist", re: /check[\s_-]*list|sa[\s_-]*check/i },
  { key: "SA_Report", re: /sa[\s_-]*report|state[\s_-]*(assessment|report)|\bsa\b.*report/i },
  { key: "NQAS_Result", re: /nqas[\s_-]*(certified[\s_-]*)?result|certificate|certified|result|national[\s_-]*assess/i },
  { key: "NOC", re: /\bnoc\b|fire|no[\s_-]*objection/i },
  { key: "Condemned", re: /condemn/i },
  { key: "Gap_Closure", re: /gap|closure|proceeding|procurement|\bproc\b|fund/i }
];
function extensionOf(name) {
  return (/\.([A-Za-z0-9]{1,5})$/.exec(name)?.[1] ?? "").toLowerCase();
}
function candidateDocsFor(name) {
  const ext = extensionOf(name);
  if (!ext) return [];
  return DOCUMENT_FIELDS.filter(
    (d) => d.accept.split(",").some((a) => a.replace(/^\./, "").toLowerCase() === ext)
  ).map((d) => d.docKey);
}
function classifyDroppedFile(file) {
  const name = file.name ?? "";
  const candidates = candidateDocsFor(name);
  if (candidates.length === 0) return { docKey: null, candidates: [] };
  const ext = extensionOf(name);
  const excelOnly = candidates.length === 1 ? candidates[0] : null;
  if (excelOnly === "SA_Checklist") return { docKey: "SA_Checklist", candidates };
  for (const hint of NAME_HINTS) {
    if (candidates.includes(hint.key) && hint.re.test(name)) {
      return { docKey: hint.key, candidates };
    }
  }
  if (candidates.length === 1) return { docKey: candidates[0], candidates };
  if (ext === "xlsx" || ext === "xls") {
    return { docKey: candidates.includes("SA_Checklist") ? "SA_Checklist" : null, candidates };
  }
  return { docKey: null, candidates };
}
function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  }
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
function validateDocumentFile(key, file, maxMb) {
  const type = docType(key);
  if (!type) return "Unknown document type";
  const exts = acceptFor(key).split(",").map((e) => e.replace(/^\./, "").toLowerCase()).filter(Boolean);
  const ext = /\.([A-Za-z0-9]{1,5})$/.exec(file.name)?.[1]?.toLowerCase() ?? "";
  if (!exts.includes(ext)) {
    return wrongTypeMessage(key);
  }
  const max = maxMb != null ? maxMb * 1024 * 1024 : maxBytesFor(key);
  if (file.size > max) {
    return `File is ${formatFileSize(file.size)}; limit is ${formatFileSize(max)}`;
  }
  if (file.size <= 0) return "The file is empty";
  return null;
}

const DEFAULT_DRIVE_SETTINGS = {
  rootFolderId: "",
  maxMb: 10,
  perTypeMb: {},
  retainedDays: 30,
  keepVersions: true,
  nightlyReconciliation: true,
  lowSpacePercent: 90,
  paused: false,
  pauseReason: "",
  pausedAt: null,
  pausedBy: "",
  resumeAt: null,
  autoPaused: false,
  autoPauseCause: ""
};
function resolveDriveSettings(raw) {
  const value = raw ?? {};
  const clamp = (n, lo, hi, fallback) => {
    const v = Number(n);
    return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback;
  };
  const stamp = (n) => {
    const v = Number(n);
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const text = (s) => typeof s === "string" ? s.trim() : "";
  const perType = {};
  for (const type of DOC_TYPES) {
    const v = Number(value.perTypeMb?.[type.key]);
    if (Number.isFinite(v) && v > 0) perType[type.key] = clamp(v, 1, 25, type.maxMb);
  }
  return {
    rootFolderId: String(value.rootFolderId ?? "").trim(),
    maxMb: clamp(value.maxMb, 1, 25, DEFAULT_DRIVE_SETTINGS.maxMb),
    perTypeMb: perType,
    retainedDays: clamp(value.retainedDays, 1, 365, DEFAULT_DRIVE_SETTINGS.retainedDays),
    keepVersions: value.keepVersions !== false,
    nightlyReconciliation: value.nightlyReconciliation !== false,
    lowSpacePercent: clamp(value.lowSpacePercent, 50, 99, DEFAULT_DRIVE_SETTINGS.lowSpacePercent),
    // STRICT: only the boolean `true` pauses. The string "false" (or any
    // other coercion surprise from an old row or a JSON export) never does.
    paused: value.paused === true,
    pauseReason: text(value.pauseReason),
    pausedAt: stamp(value.pausedAt),
    pausedBy: text(value.pausedBy),
    resumeAt: stamp(value.resumeAt),
    autoPaused: value.autoPaused === true,
    autoPauseCause: text(value.autoPauseCause)
  };
}
const DRIVE_UNAVAILABLE_MESSAGE = "Document storage is unavailable: ask the administrator to reconnect Google Drive";
const DRIVE_NOT_CONNECTED_MESSAGE = "Document storage is not connected: ask the administrator";
function uploadsPaused(settings, now = Date.now()) {
  if (settings.paused !== true) return false;
  if (settings.resumeAt !== null && settings.resumeAt <= now) return false;
  return true;
}
function getUploadState(input) {
  const now = input.now ?? Date.now();
  const s = input.settings;
  const base = {
    since: s.pausedAt,
    setBy: s.pausedBy || null,
    until: s.resumeAt,
    pauseReason: s.pauseReason || null,
    auto: s.autoPaused
  };
  if (input.configMissing && input.configMissing.length > 0) {
    return {
      ...base,
      allowed: false,
      reason: "not_configured",
      message: DRIVE_UNAVAILABLE_MESSAGE,
      chip: "Needs attention"
    };
  }
  if (input.revoked) {
    return {
      ...base,
      allowed: false,
      reason: "auth_revoked",
      message: "Google Drive was disconnected — ask the administrator to reconnect it",
      chip: "Needs attention"
    };
  }
  if (!input.connected) {
    return {
      ...base,
      allowed: false,
      reason: "not_connected",
      message: DRIVE_NOT_CONNECTED_MESSAGE,
      chip: "Needs attention"
    };
  }
  if (input.storageFull) {
    return {
      ...base,
      allowed: false,
      reason: "storage_full",
      message: "Google Drive is full: ask the administrator to free space",
      chip: "Needs attention"
    };
  }
  if (uploadsPaused(s, now)) {
    return {
      ...base,
      allowed: false,
      reason: "paused",
      // Wording matches the server's rejection byte for byte, so a client-side
      // block and a server-side rejection read as the same sentence.
      message: s.autoPaused ? `Uploads are paused automatically${s.autoPauseCause ? ` (${s.autoPauseCause})` : ""}` : "Uploads are paused by the administrator",
      chip: "Uploads paused"
    };
  }
  return {
    ...base,
    allowed: true,
    reason: null,
    message: "",
    chip: "Storage OK"
  };
}
const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
function dayStamp(ts) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}-${MONTH_ABBR[d.getMonth()] ?? ""}-${d.getFullYear()}`;
}
function uploadBlockedSentence(state) {
  if (state.reason === "paused") {
    const until = state.until ? dayStamp(state.until) : "further notice";
    return `Uploads are paused until ${until}: contact the administrator.`;
  }
  return state.message;
}
function uploadPausedDetail(state) {
  if (state.reason !== "paused") return state.message;
  const since = state.since ? ` since ${dayStamp(state.since)}` : "";
  const by = state.setBy ? ` by ${state.setBy}` : "";
  const until = state.until ? ` · resumes ${dayStamp(state.until)}` : "";
  const why = state.pauseReason ? ` — ${state.pauseReason}` : "";
  return `${state.message}${since}${by}${until}${why}`;
}

const cache = /* @__PURE__ */ new Map();
function absoluteDocumentUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const base = convexSiteOrigin("https://determined-pheasant-606.convex.cloud");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}
function fresh(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt - 3e4 < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.url;
}
async function getDocumentUrl(convex, documentId, mode) {
  const key = `${documentId}:${mode}`;
  const hit = fresh(key);
  if (hit) return hit;
  const { url, expiresAt } = await convex.action(api.documents.getContentToken, {
    documentId,
    mode
  });
  const absolute = absoluteDocumentUrl(url);
  cache.set(key, { url: absolute, expiresAt });
  return absolute;
}
async function getDocumentUrls(convex, documentIds, mode) {
  const out = {};
  const missing = [];
  for (const id of documentIds) {
    const hit = fresh(`${id}:${mode}`);
    if (hit) out[id] = hit;
    else missing.push(id);
  }
  const unique = Array.from(new Set(missing));
  if (unique.length > 0) {
    const paths = await convex.action(api.documents.getContentUrls, {
      documentIds: unique,
      mode
    });
    const expiresAt = Date.now() + 4.5 * 6e4;
    for (const id of unique) {
      const path = paths[id];
      if (!path) continue;
      const absolute = absoluteDocumentUrl(path);
      out[id] = absolute;
      cache.set(`${id}:${mode}`, { url: absolute, expiresAt });
    }
  }
  return out;
}
function useDocumentUrl(documentId, mode, enabled = true) {
  const convex = useConvex();
  const [url, setUrl] = reactExports.useState(
    () => documentId ? fresh(`${documentId}:${mode}`) : null
  );
  reactExports.useEffect(() => {
    if (!documentId || !enabled) return;
    let live = true;
    const hit = fresh(`${documentId}:${mode}`);
    if (hit) {
      setUrl(hit);
      return;
    }
    setUrl(null);
    const refresh = () => {
      void getDocumentUrl(convex, documentId, mode).then(
        (next) => {
          if (live) setUrl(next);
        },
        () => {
        }
      );
    };
    refresh();
    const timer = window.setInterval(refresh, 4 * 6e4);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [convex, documentId, mode, enabled]);
  return url;
}
function useDocumentUrls(documentIds, mode, enabled = true, onError, retryKey = 0) {
  const convex = useConvex();
  const key = documentIds.join(",");
  const [urls, setUrls] = reactExports.useState({});
  const errorRef = reactExports.useRef(onError);
  errorRef.current = onError;
  reactExports.useEffect(() => {
    if (!enabled || documentIds.length === 0) {
      setUrls({});
      return;
    }
    let live = true;
    const refresh = () => {
      void getDocumentUrls(convex, documentIds, mode).then(
        (next) => {
          if (live) setUrls(next);
        },
        (err) => {
          if (live) setUrls({});
          const message = err instanceof Error ? err.message : "The private PDF stream is not available.";
          errorRef.current?.(message);
        }
      );
    };
    refresh();
    const timer = window.setInterval(refresh, 4 * 6e4);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [convex, key, mode, enabled, retryKey]);
  return urls;
}

const PDFJS_VERSION = "4.10.38";
const PDF_WORKER = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
function PdfCanvasViewer({
  url,
  file,
  className,
  label
}) {
  const canvasRef = reactExports.useRef(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [pageNumber, setPageNumber] = reactExports.useState(1);
  const [pageCount, setPageCount] = reactExports.useState(0);
  const [scale, setScale] = reactExports.useState(1.2);
  const [retry, setRetry] = reactExports.useState(0);
  reactExports.useEffect(() => {
    let live = true;
    let destroy = null;
    setLoading(true);
    setError(null);
    setPageNumber(1);
    setPageCount(0);
    void (async () => {
      try {
        if (!url && !file) throw new Error("The signed PDF link is still being prepared.");
        const pdfjs = await __vitePreload(() => import('./vendor-pdfjs-hY71vyYA.js'),true              ?[]:void 0);
        pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER;
        const loadingTask = pdfjs.getDocument(
          url ? { url, isEvalSupported: false } : { data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }
        );
        const doc = await loadingTask.promise;
        destroy = () => doc.destroy();
        if (!live) {
          await destroy();
          return;
        }
        setPageCount(doc.numPages);
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("The PDF canvas is not ready.");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("The browser could not draw the PDF page.");
        await page.render({ canvasContext: context, viewport }).promise;
        if (live) setLoading(false);
      } catch (err) {
        if (!live) return;
        setLoading(false);
        setError(
          err instanceof Error ? err.message : "The PDF could not be displayed. Use Open or Download, or retry."
        );
      }
    })();
    return () => {
      live = false;
      void destroy?.();
    };
  }, [url, file, scale, retry]);
  const goToPage = async (next) => {
    if (!url && !file) return;
    setLoading(true);
    setError(null);
    try {
      const pdfjs = await __vitePreload(() => import('./vendor-pdfjs-hY71vyYA.js'),true              ?[]:void 0);
      pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER;
      const doc = await pdfjs.getDocument(
        url ? { url, isEvalSupported: false } : { data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }
      ).promise;
      const page = await doc.getPage(next);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("The PDF canvas is not ready.");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The browser could not draw the PDF page.");
      await page.render({ canvasContext: context, viewport }).promise;
      setPageNumber(next);
      setPageCount(doc.numPages);
      setLoading(false);
      await doc.destroy();
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "That page could not be displayed.");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex min-h-0 flex-col rounded-lg border border-border/60 bg-muted/30", className), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1 border-b border-border/50 px-2 py-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          size: "icon",
          variant: "ghost",
          className: "size-8",
          "aria-label": "Previous PDF page",
          disabled: pageNumber <= 1 || loading,
          onClick: () => void goToPage(pageNumber - 1),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "size-4" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-20 text-center text-[11px] tabular-nums text-muted-foreground", children: pageCount ? `${pageNumber} / ${pageCount}` : "PDF" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          size: "icon",
          variant: "ghost",
          className: "size-8",
          "aria-label": "Next PDF page",
          disabled: pageNumber >= pageCount || loading,
          onClick: () => void goToPage(pageNumber + 1),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-4" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mx-1 h-5 w-px bg-border" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          size: "icon",
          variant: "ghost",
          className: "size-8",
          "aria-label": "Zoom out",
          disabled: scale <= 0.7,
          onClick: () => setScale((value) => Math.max(0.7, value - 0.2)),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomOut, { className: "size-4" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          size: "icon",
          variant: "ghost",
          className: "size-8",
          "aria-label": "Zoom in",
          disabled: scale >= 2.4,
          onClick: () => setScale((value) => Math.min(2.4, value + 0.2)),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomIn, { className: "size-4" })
        }
      ),
      error && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          type: "button",
          size: "sm",
          variant: "outline",
          className: "ml-auto h-7 gap-1 text-[11px]",
          onClick: () => setRetry((value) => value + 1),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "size-3" }),
            " Retry"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-h-64 flex-1 overflow-auto", children: [
      loading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-0 z-10 flex items-center justify-center bg-background/70 text-sm text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }),
        " Drawing the PDF…"
      ] }),
      error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full min-h-64 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-amber-900", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: "The PDF could not be displayed." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-md text-xs text-muted-foreground", children: error }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Use Open in a new tab or Download if this file requires a fresh signed link." })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-full justify-center p-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "canvas",
        {
          ref: canvasRef,
          "aria-label": label ? `Preview of ${label}` : "PDF preview",
          className: "max-w-full bg-white shadow-sm"
        }
      ) })
    ] })
  ] });
}

export { DOCUMENT_TOTAL as D, PdfCanvasViewer as P, candidateDocsFor as a, DEFAULT_DRIVE_SETTINGS as b, classifyDroppedFile as c, documentFieldConfig as d, getUploadState as e, formatFileSize as f, getDocumentUrls as g, uploadPausedDetail as h, uploadBlockedSentence as i, DOCUMENT_FIELDS as j, DOCUMENT_SHORT_LABEL as k, absoluteDocumentUrl as l, dayStamp as m, useDocumentUrl as n, resolveDriveSettings as r, useDocumentUrls as u, validateDocumentFile as v };
