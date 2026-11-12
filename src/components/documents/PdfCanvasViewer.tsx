/** Authenticated PDF viewer rendered with PDF.js instead of a browser iframe.
 *
 * An iframe can show a blank page when the signed stream answer is not
 * displayed inline (or when the browser blocks the nested PDF plugin). This
 * viewer fetches the same short-lived URL and paints the page, so scrolling,
 * retrying and the failure message stay inside the app.
 */
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PDFJS_VERSION = "4.10.38";
const PDF_WORKER = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export function PdfCanvasViewer({
  url,
  file,
  className,
  label,
}: {
  url?: string | null;
  file?: File | null;
  className?: string;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let live = true;
    let destroy: (() => Promise<void>) | null = null;
    // PDF loading is an external async system; resetting its own status here
    // is the intended effect, not derived render state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setPageNumber(1);
    setPageCount(0);

    void (async () => {
      try {
        if (!url && !file) throw new Error("The signed PDF link is still being prepared.");
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER;
        const loadingTask = pdfjs.getDocument(
          url
            ? { url, isEvalSupported: false }
            : { data: new Uint8Array(await file!.arrayBuffer()), isEvalSupported: false },
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
          err instanceof Error
            ? err.message
            : "The PDF could not be displayed. Use Open or Download, or retry.",
        );
      }
    })();

    return () => {
      live = false;
      void destroy?.();
    };
  }, [url, file, scale, retry]);

  const goToPage = async (next: number) => {
    if (!url && !file) return;
    setLoading(true);
    setError(null);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER;
      const doc = await pdfjs.getDocument(
        url
          ? { url, isEvalSupported: false }
          : { data: new Uint8Array(await file!.arrayBuffer()), isEvalSupported: false },
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

  return (
    <div className={cn("flex min-h-0 flex-col rounded-lg border border-border/60 bg-muted/30", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border/50 px-2 py-1.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label="Previous PDF page"
          disabled={pageNumber <= 1 || loading}
          onClick={() => void goToPage(pageNumber - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-20 text-center text-[11px] tabular-nums text-muted-foreground">
          {pageCount ? `${pageNumber} / ${pageCount}` : "PDF"}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label="Next PDF page"
          disabled={pageNumber >= pageCount || loading}
          onClick={() => void goToPage(pageNumber + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label="Zoom out"
          disabled={scale <= 0.7}
          onClick={() => setScale((value) => Math.max(0.7, value - 0.2))}
        >
          <ZoomOut className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label="Zoom in"
          disabled={scale >= 2.4}
          onClick={() => setScale((value) => Math.min(2.4, value + 0.2))}
        >
          <ZoomIn className="size-4" />
        </Button>
        {error && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-auto h-7 gap-1 text-[11px]"
            onClick={() => setRetry((value) => value + 1)}
          >
            <RefreshCw className="size-3" /> Retry
          </Button>
        )}
      </div>
      <div className="relative min-h-64 flex-1 overflow-auto">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Drawing the PDF…
          </div>
        )}
        {error ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-amber-900">
            <AlertTriangle className="size-5" />
            <p className="font-medium">The PDF could not be displayed.</p>
            <p className="max-w-md text-xs text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">
              Use Open in a new tab or Download if this file requires a fresh signed link.
            </p>
          </div>
        ) : (
          <div className="flex min-h-full justify-center p-3">
            <canvas
              ref={canvasRef}
              aria-label={label ? `Preview of ${label}` : "PDF preview"}
              className="max-w-full bg-white shadow-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
