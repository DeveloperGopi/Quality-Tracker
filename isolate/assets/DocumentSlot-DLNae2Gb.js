import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, b2 as ScanText, T as TriangleAlert } from './icons-BxQpodNr.js';
import { c as cn, B as Button, l as useQuery, j as api, o as useAction, t as toast } from './index-CBV6wOh8.js';
import { D as DocumentField, u as uploadDocument, a as uploadKeyFor, c as createUploadTransport } from './DocumentField-4d87_sVm.js';
import { L as LazyResultReadDialog } from './LazyResultReadDialog-BIkWLeOK.js';
import { d as documentFieldConfig, h as uploadPausedDetail, i as uploadBlockedSentence, v as validateDocumentFile } from './PdfCanvasViewer-C0MZuH_2.js';

function useResultReadStatus(documentId, enabled = true) {
  return useQuery(
    api.resultRead.documentStatus,
    enabled && documentId ? { documentId } : "skip"
  );
}
function readDate(ms) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  }).formatToParts(new Date(ms));
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")}`;
}
function resultDisplayDate(iso) {
  if (!iso) return "-";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(match[2]) - 1];
  return `${match[3]}-${month}-${match[1]}`;
}
function ResultReadStatusLine({
  documentId,
  className,
  empty = "Not read yet"
}) {
  const status = useResultReadStatus(documentId);
  if (!documentId) return null;
  if (!status) return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("text-[11px] text-muted-foreground", className), children: empty });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn("text-[11px] text-muted-foreground", className), children: [
    "Read ",
    readDate(status.readAt),
    status.overallScore != null ? ` · ${status.overallScore}%` : "",
    status.engine ? ` · ${status.engine === "vision" ? "OCR" : "PDF text"}` : ""
  ] });
}
function ResultReadButton({
  documentId,
  documentIds,
  facilityId,
  label = "Read result",
  size = "sm",
  variant = "outline",
  className,
  showStatus = false,
  disabled,
  onApplied
}) {
  const [open, setOpen] = reactExports.useState(false);
  const ids = documentIds?.filter(Boolean) ?? (documentId ? [documentId] : []);
  if (ids.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        type: "button",
        size: size === "xs" ? "sm" : size,
        variant,
        className,
        disabled,
        onClick: () => setOpen(true),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ScanText, { className: "mr-1.5 size-3.5" }),
          " ",
          label
        ]
      }
    ),
    showStatus && /* @__PURE__ */ jsxRuntimeExports.jsx(ResultReadStatusLine, { documentId: ids[0] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      LazyResultReadDialog,
      {
        open,
        onOpenChange: setOpen,
        documentIds: ids,
        facilityId,
        onApplied
      }
    )
  ] });
}

const FACILITY_DOC_KEYS = /* @__PURE__ */ new Set(["Condemned", "NOC"]);
function isFacilityDocument(docKey) {
  return FACILITY_DOC_KEYS.has(docKey);
}

function DocumentSlot({
  facilityId,
  docKey,
  cycleNo: selectedCycle,
  lockCycle,
  canEdit,
  onChanged,
  className
}) {
  const config = documentFieldConfig(docKey);
  const [pickedCycle, setPickedCycle] = reactExports.useState(void 0);
  const chosenCycle = selectedCycle ?? pickedCycle;
  const data = useQuery(api.documents.listForFacility, {
    facilityId,
    cycleNo: chosenCycle
  });
  const doc = data?.documents?.find((d) => d.key === docKey);
  const upload = data?.upload;
  const cycleNo = chosenCycle ?? data?.cycleNo;
  const cycles = data?.cycles ?? [];
  const showCyclePicker = canEdit && !lockCycle && selectedCycle === void 0 && !isFacilityDocument(docKey) && cycles.length > 1;
  const readerEnabled = data?.readerEnabled === true;
  const maxMb = doc?.maxMb ?? config?.maxMb;
  const beginUpload = useAction(api.documents.beginUpload);
  const uploadChunk = useAction(api.documents.uploadChunk);
  const finalizeUpload = useAction(api.documents.finalizeUpload);
  const cancelUpload = useAction(api.documents.cancelUpload);
  const discardStagedResult = useAction(api.documents.discardStagedResult);
  const [incoming, setIncoming] = reactExports.useState(null);
  const [readDocumentId, setReadDocumentId] = reactExports.useState(null);
  const [localFile, setLocalFile] = reactExports.useState(null);
  const [over, setOver] = reactExports.useState(false);
  const seq = reactExports.useRef(0);
  const lastCurrentId = reactExports.useRef(null);
  const openAfterUpload = reactExports.useRef(false);
  const currentId = doc?.current?.id ?? null;
  reactExports.useEffect(() => {
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
  const interceptForRead = (file) => {
    if (docKey !== "NQAS_Result" || !readerEnabled) return false;
    const invalid = validateDocumentFile(docKey, file, maxMb);
    if (invalid) return false;
    setReadDocumentId(null);
    setLocalFile(file);
    return true;
  };
  const confirmReplace = (file) => {
    if (!doc?.current) return true;
    return window.confirm(
      `Replace the current file with “${file.name}”?

The old file is kept as a previous version.`
    );
  };
  const beforeUpload = (file) => {
    if (!confirmReplace(file)) return true;
    return interceptForRead(file);
  };
  const queue = (file) => {
    if (!file || !canEdit) return;
    seq.current += 1;
    setIncoming({ file, token: seq.current });
  };
  const onPaste = (event) => {
    if (!canEdit) return;
    const target = event.target;
    if (target && (/^(INPUT|TEXTAREA)$/.test(target.tagName) || target.isContentEditable)) {
      return;
    }
    const file = Array.from(event.clipboardData?.files ?? [])[0];
    if (!file) return;
    event.preventDefault();
    queue(file);
  };
  const attachLocal = async (file, onProgress) => {
    const transport = createUploadTransport(
      { begin: beginUpload, putChunk: uploadChunk, finalize: finalizeUpload, cancel: cancelUpload },
      facilityId
    );
    const result = await uploadDocument(
      {
        facilityId,
        docKey,
        cycleNo,
        file,
        bytes: async () => new Uint8Array(await file.arrayBuffer()),
        uploadKey: uploadKeyFor(facilityId, docKey, file)
      },
      transport,
      (p) => onProgress(p.sent, p.total),
      { aborted: false }
    );
    return { documentId: result.documentId, staged: !result.duplicate };
  };
  const detachLocal = async (documentId) => {
    await discardStagedResult({ documentId });
  };
  const allowDrop = (event) => {
    if (!canEdit) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setOver(true);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-testid": `document-slot-${docKey}`,
      "data-over": over ? "true" : void 0,
      tabIndex: canEdit ? 0 : void 0,
      onPaste,
      onDragEnter: allowDrop,
      onDragOver: allowDrop,
      onDragLeave: (event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        setOver(false);
      },
      onDrop: (event) => {
        event.preventDefault();
        event.stopPropagation();
        setOver(false);
        queue(event.dataTransfer?.files?.[0]);
      },
      className: cn(
        "rounded-xl border border-dashed p-3 transition-colors motion-safe:duration-150",
        // ONE visible box: the field's own dashed frame is flattened because
        // THIS box is the drop target.
        "[&_[data-testid=file-dropzone]]:border-0 [&_[data-testid=file-dropzone]]:bg-transparent [&_[data-testid=file-dropzone]]:p-0",
        over ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border/70 bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className
      ),
      children: [
        showCyclePicker && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground", children: [
          "Cycle",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              value: cycleNo ?? cycles[0],
              onChange: (event) => setPickedCycle(Number(event.target.value)),
              className: "h-7 rounded-md border border-border bg-background px-1.5 text-[11px] font-medium text-foreground",
              children: cycles.map((cycle) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: cycle, children: [
                "Cycle ",
                cycle
              ] }, cycle))
            }
          )
        ] }),
        upload && !upload.allowed && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "p",
          {
            role: "status",
            "data-testid": `document-slot-gate-${docKey}`,
            className: "mb-1.5 flex items-start gap-1 text-[11px] leading-snug font-medium text-amber-800 dark:text-amber-300",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-0.5 size-3 shrink-0", "aria-hidden": true }),
              upload.reason === "paused" ? uploadPausedDetail(upload) : uploadBlockedSentence(upload)
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DocumentField,
          {
            facilityId,
            docKey,
            doc,
            cycleNo,
            canEdit,
            maxMb,
            incoming,
            onBeforeUpload: beforeUpload,
            onUploaded: () => {
              if (docKey === "NQAS_Result" && readerEnabled) openAfterUpload.current = true;
            },
            onChanged
          }
        ),
        readerEnabled && docKey === "NQAS_Result" && doc?.current && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap items-end justify-between gap-2 border-t border-border/50 pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "Preview the letter and Annexure values before saving." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ResultReadStatusLine, { documentId: doc.current.id })
          ] }),
          canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx(
            ResultReadButton,
            {
              documentId: doc.current.id,
              facilityId,
              size: "xs",
              label: "Read result PDF",
              onApplied: () => onChanged?.()
            }
          )
        ] }),
        readerEnabled && docKey === "NQAS_Result" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          LazyResultReadDialog,
          {
            open: !!readDocumentId || !!localFile,
            onOpenChange: (next) => {
              if (!next) {
                setReadDocumentId(null);
                setLocalFile(null);
              }
            },
            documentIds: readDocumentId ? [readDocumentId] : [],
            facilityId,
            localFile,
            onAttachLocal: attachLocal,
            onDetachLocal: detachLocal,
            onReattach: (file) => {
              if (interceptForRead(file)) {
                toast.info("Reading the replacement PDF");
                return;
              }
              toast.error(validateDocumentFile(docKey, file, maxMb) ?? "Choose a PDF to reattach.");
            },
            onApplied: () => {
              setLocalFile(null);
              onChanged?.();
            }
          }
        )
      ]
    }
  );
}

export { DocumentSlot as D, ResultReadStatusLine as R, ResultReadButton as a, isFacilityDocument as i, resultDisplayDate as r };
