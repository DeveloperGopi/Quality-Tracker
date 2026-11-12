/**
 * ZIP EXPORT CONTROLS — used by the facility Documents card and the library.
 *
 * The job runs server-side (Drive → ZIP → Drive, up to 200 files per part);
 * this component only starts it, follows progress and offers the audited part
 * downloads. The checkbox is OFF by default, so a normal ZIP holds the current
 * files only.
 */

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Download, FileArchive, Loader2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/documentsConfig";
import { absoluteDocumentUrl, useDocumentUrls } from "@/lib/documentLinks";

type ExportFilters = {
  block?: string;
  facilityType?: string;
  docKey?: string;
  cycleNo?: number;
  uploadDate?: string;
  uploadedBy?: string;
  search?: string;
  state?: "uploaded" | "missing";
};

export function DocumentExportControls({
  facilityId,
  filters,
  label = "Download all documents",
  className,
  compact,
  libraryOnly,
}: {
  facilityId?: string;
  filters?: ExportFilters;
  label?: string;
  className?: string;
  /** One compact line for the library toolbar. */
  compact?: boolean;
  /** Only follow library-wide jobs, never a facility card's ZIP. */
  libraryOnly?: boolean;
}) {
  const startExport = useMutation(api.documentLibrary.startExport);
  const getExportLink = useAction(api.documentLibrary.getExportLink);
  const jobs = useQuery(
    api.documentLibrary.listExports,
    facilityId ? { facilityId: facilityId as never } : { libraryOnly: !!libraryOnly },
  );
  const [includeVersions, setIncludeVersions] = useState(false);
  const [busy, setBusy] = useState(false);
  const sawDone = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const list = Array.isArray(jobs) ? jobs : [];
  const active = list.find((job) => job.status === "queued" || job.status === "running") ?? null;
  const latestDone = list.find((job) => job.status === "done") ?? null;
  const latestFinished = list.find((job) => job.status === "done" || job.status === "failed") ?? null;
  const failed = latestFinished?.status === "failed" ? latestFinished : null;

  useEffect(() => {
    if (!Array.isArray(jobs)) return;
    if (!initialized.current) {
      initialized.current = true;
      for (const job of jobs) if (job.status === "done") sawDone.current.add(job.jobId);
      return;
    }
    for (const job of jobs) {
      if (job.status === "done" && !sawDone.current.has(job.jobId)) {
        sawDone.current.add(job.jobId);
        toast.success("ZIP ready", {
          description: `${job.baseName} · ${job.filesCount} document${
            job.filesCount === 1 ? "" : "s"
          }`,
        });
      }
      if (job.status === "failed" && !sawDone.current.has(job.jobId)) {
        sawDone.current.add(job.jobId);
        toast.error(job.error ?? "The ZIP could not be built");
      }
    }
  }, [jobs]);

  const start = async () => {
    setBusy(true);
    try {
      // Strip empty filters: a Convex object validator accepts a missing
      // optional field, not an explicitly undefined one on every client.
      const clean = filters
        ? Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined))
        : undefined;
      const result = await startExport({
        facilityId: facilityId ? (facilityId as never) : undefined,
        filters: clean as never,
        includeVersions,
      });
      toast.success("Building the ZIP", {
        description: `${result.files} document${result.files === 1 ? "" : "s"} · progress shows here`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The ZIP could not be started");
    } finally {
      setBusy(false);
    }
  };

  const download = async (jobId: string, part: number) => {
    try {
      const { url } = await getExportLink({ jobId, part });
      window.location.assign(absoluteDocumentUrl(url));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The ZIP could not be downloaded");
    }
  };

  return (
    <div className={cn("min-w-0", className)} data-testid="document-export-controls">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void start()}
          disabled={busy || !!active}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-input bg-background font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60",
            compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
          )}
          data-testid="document-export-start"
          data-guide-target="documents-zip"
        >
          {busy || active ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <FileArchive className="size-3.5" />
          )}
          {active ? "Building ZIP…" : label}
        </button>
        <select
          aria-label="Version scope"
          value={includeVersions ? "all" : "current"}
          onChange={(event) => setIncludeVersions(event.target.value === "all")}
          className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px] text-muted-foreground"
          data-testid="document-export-versions"
        >
          <option value="current">Current versions</option>
          <option value="all">Include previous versions</option>
        </select>
        {failed && !active && <SeparateFileDownloads jobId={failed.jobId} />}
        {latestDone && !active && !failed && (
          <span className="flex flex-wrap items-center gap-1">
            {latestDone.parts.map((part, index) => (
              <button
                key={`${latestDone.jobId}-${index}`}
                type="button"
                onClick={() => void download(latestDone.jobId, index)}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300/70 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-100"
                data-testid="document-export-download"
              >
                <Download className="size-3" />
                {latestDone.parts.length > 1
                  ? `Part ${index + 1} of ${latestDone.parts.length}`
                  : "ZIP"}
                <span className="text-emerald-800/70">{formatFileSize(part.size)}</span>
              </button>
            ))}
          </span>
        )}
      </div>

      {active && (
        <div className="mt-1.5" data-testid="document-export-progress">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((active.cursor / Math.max(1, active.filesCount)) * 100),
                )}%`,
              }}
            />
          </div>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground">
            {active.cursor} of {active.filesCount} files · part {active.partNo}
            {active.partLimit ? ` (${active.partLimit} files per part)` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

/** Shown when the verified ZIP cannot be offered: the frozen selection's
 *  individual documents remain downloadable through the normal signed route. */
export function SeparateFileDownloads({ jobId }: { jobId: string }) {
  const files = useQuery(api.documentLibrary.failedExportFiles, { jobId });
  const rows = Array.isArray(files) ? files : [];
  const urls = useDocumentUrls(
    rows.map((file) => file.documentId),
    "attachment",
    rows.length > 0,
  );
  if (rows.length === 0) return null;
  return (
    <div
      className="w-full rounded-lg border border-amber-300/70 bg-amber-50/80 p-2 text-[11px] text-amber-950"
      data-testid="document-export-fallback"
    >
      <p className="font-semibold">Could not build one ZIP. Download the files separately.</p>
      <ul className="mt-1 grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2">
        {rows.map((file) => {
          const href = urls[file.documentId];
          return (
            <li key={file.documentId} className="min-w-0">
              <a
                href={href || undefined}
                aria-disabled={!href}
                className={cn(
                  "inline-flex max-w-full items-center gap-1 rounded border border-amber-300/80 bg-background px-1.5 py-0.5 font-medium hover:bg-amber-100",
                  !href && "pointer-events-none opacity-50",
                )}
                data-tip={`${file.facility} · ${file.name}`}
              >
                <Download className="size-3 shrink-0" />
                <span className="truncate">Download {file.name}</span>
                <span className="shrink-0 text-amber-800/70">{formatFileSize(file.size)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
