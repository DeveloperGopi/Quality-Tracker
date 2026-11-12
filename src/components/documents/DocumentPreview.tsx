/**
 * DOCUMENT PREVIEW + real links — used by the profile card, the document
 * slots and the library.
 *
 *   • Open / Download are REAL anchors with the signed URL already in `href`.
 *     Nothing async runs on click, so browsers never treat them as pop-ups.
 *   • Preview opens one dialog: PDFs and images inline, Excel/CSV through a
 *     lazily imported spreadsheet reader (first sheet, 200 rows, sheet tabs),
 *     anything else "Preview not available" plus Download.
 */

import { useEffect, useState } from "react";
import { Download, ExternalLink, Eye, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useDocumentUrl, type DocumentMode } from "@/lib/documentLinks";
import { PdfCanvasViewer } from "@/components/documents/PdfCanvasViewer";
import { formatFileSize } from "@/lib/documentsConfig";

export type PreviewDocument = {
  id: string;
  originalName: string;
  displayName?: string;
  mimeType?: string | null;
  size?: number | null;
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function previewKind(doc: PreviewDocument): "pdf" | "image" | "sheet" | "other" {
  const ext = extensionOf(doc.originalName);
  const mime = (doc.mimeType ?? "").toLowerCase();
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (
    ["xlsx", "xls", "csv"].includes(ext) ||
    /spreadsheetml|ms-excel|text\/csv/.test(mime)
  )
    return "sheet";
  return "other";
}

/** A real anchor — no async work between the click and the browser. */
export function DocumentOpenLink({
  documentId,
  mode = "inline",
  children,
  className,
  ariaLabel,
}: {
  documentId: string;
  mode?: DocumentMode;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const href = useDocumentUrl(documentId, mode);
  return (
    <a
      href={href ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!href}
      aria-label={ariaLabel}
      onClick={(event) => {
        if (!href) event.preventDefault();
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent",
        !href && "pointer-events-none opacity-50",
        className,
      )}
    >
      {children}
    </a>
  );
}

export function DocumentDownloadLink({
  documentId,
  children,
  className,
  ariaLabel,
}: {
  documentId: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const href = useDocumentUrl(documentId, "attachment");
  return (
    <a
      href={href ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!href}
      aria-label={ariaLabel}
      onClick={(event) => {
        if (!href) event.preventDefault();
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent",
        !href && "pointer-events-none opacity-50",
        className,
      )}
    >
      {children}
    </a>
  );
}

/** The Preview trigger — opens the one viewer dialog. */
export function DocumentPreviewButton({
  doc,
  label,
  className,
  ariaLabel,
}: {
  doc: PreviewDocument;
  label?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent",
          className,
        )}
      >
        <Eye className="size-3" /> {label ?? "Preview"}
      </button>
      <DocumentPreviewDialog open={open} onOpenChange={setOpen} doc={doc} />
    </>
  );
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  doc,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: PreviewDocument;
}) {
  const kind = previewKind(doc);
  const inlineHref = useDocumentUrl(doc.id, "inline", open);
  const attachmentHref = useDocumentUrl(doc.id, "attachment", open);
  const [sheet, setSheet] = useState<{
    names: string[];
    active: string;
    rows: unknown[][];
    error: string | null;
    loading: boolean;
  }>({ names: [], active: "", rows: [], error: null, loading: false });

  useEffect(() => {
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
        const XLSX = await import("xlsx");
        const wb = XLSX.read(bytes, { type: "array" });
        const names = wb.SheetNames.slice(0, 20);
        const active = names[0] ?? "";
        const rows = active
          ? (XLSX.utils.sheet_to_json(wb.Sheets[active], {
              header: 1,
              blankrows: false,
              defval: "",
              raw: false,
            }) as unknown[][])
          : [];
        if (live)
          setSheet({
            names,
            active,
            rows: rows.slice(0, 200),
            error: null,
            loading: false,
          });
      } catch (err) {
        if (live)
          setSheet({
            names: [],
            active: "",
            rows: [],
            error: err instanceof Error ? err.message : "This file could not be read",
            loading: false,
          });
      }
    })();
    return () => {
      live = false;
    };
  }, [open, kind, inlineHref]);

  const pickSheet = async (name: string) => {
    if (!inlineHref) return;
    setSheet((prev) => ({ ...prev, active: name, loading: true, error: null }));
    try {
      const res = await fetch(inlineHref);
      if (!res.ok) throw new Error((await res.text()).slice(0, 180) || "This file could not be read");
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await res.arrayBuffer(), { type: "array" });
      const rows = (XLSX.utils.sheet_to_json(wb.Sheets[name], {
        header: 1,
        blankrows: false,
        defval: "",
        raw: false,
      }) as unknown[][]) ?? [];
      setSheet((prev) => ({ ...prev, active: name, rows: rows.slice(0, 200), loading: false }));
    } catch (err) {
      setSheet((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "This file could not be read",
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="pr-6 break-words text-sm">
          {doc.displayName ?? doc.originalName}
        </DialogTitle>
          <DialogDescription className="text-xs">
            {doc.size ? `${formatFileSize(doc.size)} · ` : ""}
            {kind === "sheet" ? "First sheet, first 200 rows" : "Preview"}
          </DialogDescription>
        </DialogHeader>

        {!inlineHref ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Preparing the file…
          </div>
        ) : kind === "pdf" ? (
          <PdfCanvasViewer
            url={inlineHref}
            label={doc.displayName ?? doc.originalName}
            className="h-[68vh]"
          />
        ) : kind === "image" ? (
          <div className="flex max-h-[68vh] items-center justify-center overflow-auto rounded-lg border border-border/60 bg-muted/30 p-2">
            <img
              src={inlineHref ?? undefined}
              alt={`Preview of ${doc.displayName ?? doc.originalName}`}
              className="max-h-[66vh] max-w-full object-contain"
            />
          </div>
        ) : kind === "sheet" ? (
          <div className="min-w-0">
            {sheet.names.length > 1 && (
              <div className="mb-2 flex flex-wrap gap-1" role="tablist" aria-label="Sheets">
                {sheet.names.map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="tab"
                    aria-selected={sheet.active === name}
                    onClick={() => void pickSheet(name)}
                    className={cn(
                      "rounded-md border px-2 py-1 text-[11px] font-medium",
                      sheet.active === name
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent",
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            {sheet.loading ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" /> Reading the sheet…
              </div>
            ) : sheet.error ? (
              <div className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {sheet.error} — download the file to open it in Excel.
              </div>
            ) : (
              <div className="max-h-[62vh] overflow-auto rounded-lg border border-border/60">
                <table className="w-full border-collapse text-[11px]">
                  <tbody>
                    {sheet.rows.map((row, r) => (
                      <tr key={r} className={r === 0 ? "bg-muted/60 font-semibold" : undefined}>
                        {row.map((cell, c) => (
                          <td
                            key={c}
                            className="max-w-[18rem] truncate border-b border-r border-border/40 px-1.5 py-1 align-top"
                          >
                            {String(cell ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sheet.rows.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">This sheet is empty.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 text-sm text-muted-foreground">
            <p>Preview not available for this file type.</p>
            <p className="text-xs">Download it to open in the right application.</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <a
            href={attachmentHref ?? inlineHref ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground",
              !attachmentHref && !inlineHref && "pointer-events-none opacity-50",
            )}
          >
            <Download className="size-3.5" /> Download
          </a>
          <a
            href={inlineHref ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <ExternalLink className="size-3.5" /> Open in new tab
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
