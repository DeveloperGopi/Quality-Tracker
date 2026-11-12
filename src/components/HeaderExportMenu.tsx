import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

/** Standard "Download" button for the sticky page header: opens a menu with
 *  Excel (.xlsx) and PDF entries wired by the page. Used on every list /
 *  report / dashboard page so the download affordance always sits in the
 *  same place. */
export function HeaderExportMenu({
  label = "Download",
  onExcel,
  onPdf,
  disabled,
  excelLabel = "Excel (.xlsx)",
  pdfLabel = "PDF",
}: {
  label?: string;
  onExcel: () => void;
  onPdf: () => void;
  /** True while the page's data is still loading. */
  disabled?: boolean;
  excelLabel?: string;
  pdfLabel?: string;
}) {
  const [busy, setBusy] = useState(false);

  const run = (fn: () => void) => {
    setBusy(true);
    try {
      fn();
    } finally {
      // Excel/PDF libs write synchronously; release the spinner next tick.
      setTimeout(() => setBusy(false), 400);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={disabled || busy}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run(onExcel)} disabled={disabled}>
          <FileSpreadsheet className="size-4" /> {excelLabel}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run(onPdf)} disabled={disabled}>
          <FileText className="size-4" /> {pdfLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Small helper page headers use to compose their action clusters. */
export function HeaderActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}
