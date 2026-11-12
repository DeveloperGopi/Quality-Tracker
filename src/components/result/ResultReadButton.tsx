/** Result-reader entry point and the audit status line shown under a file. */
import { useState } from "react";
import { useQuery } from "convex/react";
import { ScanText } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { LazyResultReadDialog } from "@/components/result/LazyResultReadDialog";
import { cn } from "@/lib/utils";

export function useResultReadStatus(documentId: string | null | undefined, enabled = true) {
  return useQuery(
    api.resultRead.documentStatus,
    enabled && documentId
      ? { documentId: documentId as Id<"facilityDocuments"> }
      : "skip",
  );
}

export function readDate(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")}`;
}

export function resultDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    Number(match[2]) - 1
  ];
  return `${match[3]}-${month}-${match[1]}`;
}

export function ResultReadStatusLine({
  documentId,
  className,
  empty = "Not read yet",
}: {
  documentId?: string | null;
  className?: string;
  empty?: string;
}) {
  const status = useResultReadStatus(documentId);
  if (!documentId) return null;
  if (!status) return <span className={cn("text-[11px] text-muted-foreground", className)}>{empty}</span>;
  return (
    <span className={cn("text-[11px] text-muted-foreground", className)}>
      Read {readDate(status.readAt)}
      {status.overallScore != null ? ` · ${status.overallScore}%` : ""}
      {status.engine ? ` · ${status.engine === "vision" ? "OCR" : "PDF text"}` : ""}
    </span>
  );
}

export function ResultReadButton({
  documentId,
  documentIds,
  facilityId,
  label = "Read result",
  size = "sm",
  variant = "outline",
  className,
  showStatus = false,
  disabled,
  onApplied,
}: {
  documentId?: string | null;
  documentIds?: string[];
  facilityId?: string | null;
  label?: string;
  size?: "sm" | "default" | "xs";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  showStatus?: boolean;
  disabled?: boolean;
  onApplied?: (batchId: string, applied: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ids = documentIds?.filter(Boolean) ?? (documentId ? [documentId] : []);
  if (ids.length === 0) return null;
  return (
    <>
      <Button
        type="button"
        size={size === "xs" ? "sm" : size}
        variant={variant}
        className={className}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <ScanText className="mr-1.5 size-3.5" /> {label}
      </Button>
      {showStatus && <ResultReadStatusLine documentId={ids[0]} />}
      <LazyResultReadDialog
        open={open}
        onOpenChange={setOpen}
        documentIds={ids}
        facilityId={facilityId}
        onApplied={onApplied}
      />
    </>
  );
}
