import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, L as LoaderCircle, bW as Paperclip, u as FileText, T as TriangleAlert } from './icons-BxQpodNr.js';
import { m as useMutation, j as api, B as Button, l as useQuery } from './index-CBV6wOh8.js';
import { L as Label } from './label-BaPkqXdo.js';

function AttachmentPicker({
  initial,
  onChange,
  disabled,
  label = "Attachment",
  accept,
  validateFile
}) {
  const generateUploadUrl = useMutation(api.modules.generateUploadUrl);
  const fileRef = reactExports.useRef(null);
  const [busy, setBusy] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [picked, setPicked] = reactExports.useState(initial ?? null);
  const upload = async (file) => {
    const validationError = validateFile?.(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const url = await generateUploadUrl({});
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const { storageId } = await res.json();
      const value = {
        attachmentId: storageId,
        attachmentName: file.name,
        attachmentType: file.type || void 0
      };
      setPicked(value);
      onChange(value);
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          ref: fileRef,
          type: "file",
          className: "hidden",
          accept: accept ?? ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv",
          disabled: disabled || busy,
          onChange: (e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          type: "button",
          variant: "outline",
          size: "sm",
          className: "gap-2",
          disabled: disabled || busy,
          onClick: () => fileRef.current?.click(),
          children: [
            busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Paperclip, { className: "size-4" }),
            busy ? "Uploading…" : picked?.attachmentName ? "Replace file" : "Choose file"
          ]
        }
      ),
      picked?.attachmentName && (picked.attachmentId ? (
        // Saved attachment — the name is a clickable link that opens the
        // stored document (auth-gated signed URL from Convex storage).
        /* @__PURE__ */ jsxRuntimeExports.jsx(AttachmentLink, { id: picked.attachmentId, name: picked.attachmentName })
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex max-w-[16rem] items-center gap-1.5 truncate text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-3.5 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", "data-tip": picked.attachmentName, "data-tip-truncate": true, children: picked.attachmentName })
      ] })),
      picked && !disabled && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          variant: "ghost",
          size: "sm",
          onClick: () => {
            setPicked(null);
            onChange(null);
          },
          children: "Remove"
        }
      )
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "p",
      {
        role: "alert",
        className: "mt-1.5 flex items-start gap-1 text-xs leading-snug font-medium text-destructive",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-0.5 size-3.5 shrink-0" }),
          " ",
          error
        ]
      }
    )
  ] });
}
function AttachmentLink({
  id,
  name
}) {
  const url = useQuery(api.modules.getAttachmentUrl, {
    storageId: id
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "a",
    {
      href: url ?? "#",
      target: "_blank",
      rel: "noreferrer",
      className: "mt-1 inline-flex max-w-full items-center gap-1 text-xs font-medium text-primary hover:underline",
      "data-tip": name ?? "View file",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paperclip, { className: "size-3.5 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: name ?? "View file" })
      ]
    }
  );
}

export { AttachmentPicker as A, AttachmentLink as a };
