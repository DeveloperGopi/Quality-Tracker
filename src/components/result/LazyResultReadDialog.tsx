/**
 * NQAS RESULT READER — preview, edit, confirm and apply.
 *
 * The PDF is read in the browser. Native text is used when it is real; a
 * scanned page is rendered and OCR'd. Nothing is written until a row is
 * selected, its fields are accepted and the user presses Apply. The apply
 * mutation is the existing audited `resultRead.apply`, so Undo and role/block
 * checks stay unchanged.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Check,
  FileSearch,
  Loader2,
  RotateCcw,
  ScanText,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PdfCanvasViewer } from "@/components/documents/PdfCanvasViewer";
import { useDocumentUrl } from "@/lib/documentLinks";
import { cn } from "@/lib/utils";
import {
  matchAnnexureFacility,
  parseAnnexureText,
  type FacilityForMatch,
  type ParsedAnnexureSection,
} from "@/lib/annexureParse";
import { parseTargetResultLetter, type ResultPageText, type TargetResultRow } from "@/lib/resultParse";
import { extractResultPdf, type ExtractionProgress } from "@/lib/resultOcr";
import {
  FIELD_KEYS,
  FIELD_LABELS,
  blockedReason,
  selectedRowsOf,
  toApplyItems,
  type FieldKey,
  type ReadRow,
} from "@/lib/resultReadModel";

export type ResultReadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentIds: string[];
  facilityId?: string | null;
  localFile?: File | null;
  onAttachLocal?: (
    file: File,
    onProgress: (sent: number, total: number) => void,
  ) => Promise<unknown> | void;
  onDetachLocal?: (documentId: string) => Promise<unknown> | void;
  onReattach?: (file: File) => void;
  onApplied?: (batchId: string, applied: number) => void;
};

type ContextDocument = {
  id: string;
  ok: boolean;
  facilityId?: string;
  name?: string;
  originalName?: string;
  cycleNo?: number;
  sha256?: string;
  reason?: string;
};
type ContextFacility = FacilityForMatch & {
  currentCycleNumber: number | null;
};
type ExistingField = {
  certificationDate: string | null;
  goiLetterDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  mode: string | null;
  scopeOption: string | null;
  checklistVersion: string | null;
  scorePercent: number | null;
  certificationStatus: string | null;
};
type ContextExisting = {
  facilityId: string;
  cycleId: string;
  cycleNumber: number;
  fields: ExistingField | null;
  scores: {
    overallScore: number | null;
    pssScore: number | null;
    letterScore: number | null;
    pageNumber: number;
    documentName: string;
    areas: { key: string; name: string; score: number }[];
    departments: { name: string; canonicalName: string; score: number; isNew: boolean; kind?: string }[];
  } | null;
};
type ContextData = {
  documents: ContextDocument[];
  facilities: ContextFacility[];
  cycles: { _id: string; facilityId: string; cycleNumber: number; superseded: boolean }[];
  existing: ContextExisting[];
  departmentNames: { pdfName: string; canonicalName: string }[];
};

function emptyValues(): Record<FieldKey, string> {
  return Object.fromEntries(FIELD_KEYS.map((field) => [field, ""])) as Record<FieldKey, string>;
}
function emptyFlags(value: boolean): Record<FieldKey, boolean> {
  return Object.fromEntries(FIELD_KEYS.map((field) => [field, value])) as Record<FieldKey, boolean>;
}
function isoDate(value: string | null | undefined): string {
  return value ?? "";
}
function numberText(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}
function sourceFor(
  page: number | null | undefined,
  confidence: number | null | undefined,
  text?: string,
) {
  return {
    page: Math.max(1, page ?? 1),
    confidence: Math.round(confidence ?? 0),
    text,
  };
}
function normaliseName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function sameScore(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 0.005;
}
async function sha256File(file: File): Promise<string> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return `local:${file.name}:${file.size}:${file.lastModified}`;
  }
}

export function LazyResultReadDialog({
  open,
  onOpenChange,
  documentIds,
  facilityId,
  localFile,
  onAttachLocal,
  onDetachLocal,
  onReattach,
  onApplied,
}: ResultReadDialogProps) {
  const contexts = useQuery(
    api.resultRead.contexts,
    open ? { documentIds: documentIds as never[], facilityId: (facilityId ?? undefined) as never } : "skip",
  ) as unknown as ContextData | undefined;
  const apply = useMutation(api.resultRead.apply);
  const storedUrl = useDocumentUrl(documentIds[0] ?? null, "inline", open && documentIds.length > 0);
  const [extraction, setExtraction] = useState<{ pages: ResultPageText[]; textPages: number; ocrPages: number } | null>(null);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [rows, setRows] = useState<ReadRow[]>([]);
  const [localHash, setLocalHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const started = useRef("");
  const [uploadSent, setUploadSent] = useState(0);

  useEffect(() => {
    if (!open) {
      started.current = "";
      // Closing clears the async reader session. Nothing is derived from it
      // during render, so this reset belongs in the effect that owns the PDF.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExtraction(null);
      setRows([]);
      setProgress(null);
      setError(null);
      setReading(false);
      setSourceOpen(false);
      setUploadSent(0);
      return;
    }
    if (!localFile && !storedUrl) return;
    const key = localFile ? `file:${localFile.name}:${localFile.size}:${localFile.lastModified}` : `url:${storedUrl}:${retryKey}`;
    if (started.current === key) return;
    started.current = key;
    let live = true;
    setReading(true);
    setError(null);
    setExtraction(null);
    setRows([]);
    if (localFile) {
      void sha256File(localFile).then((hash) => {
        if (live) setLocalHash(hash);
      });
    }
    void extractResultPdf(localFile ?? storedUrl ?? "", (next) => {
      if (live) setProgress(next);
    })
      .then((result) => {
        if (!live) return;
        setExtraction({ pages: result.pages, textPages: result.textPages, ocrPages: result.ocrPages });
      })
      .catch((err: unknown) => {
        if (!live) return;
        setError(err instanceof Error ? err.message : "The PDF could not be read.");
      })
      .finally(() => {
        if (live) setReading(false);
      });
    return () => {
      live = false;
    };
  }, [open, localFile, storedUrl, retryKey]);

  const candidates = useMemo(() => {
    if (!contexts || !extraction) return [] as {
      letter: TargetResultRow | null;
      section: ParsedAnnexureSection | null;
      match: ReturnType<typeof matchAnnexureFacility>;
      key: string;
    }[];
    const letters = parseTargetResultLetter(extraction.pages);
    const sections = parseAnnexureText(extraction.pages.map((page) => page.text).join("\f"), {
      departmentNames: contexts.departmentNames,
    });
    const map = new Map<string, {
      letter: TargetResultRow | null;
      section: ParsedAnnexureSection | null;
      match: ReturnType<typeof matchAnnexureFacility>;
      key: string;
    }>();
    const keyFor = (name: string, match: ReturnType<typeof matchAnnexureFacility>) =>
      match.facility ? `f:${match.facility._id}` : `n:${normaliseName(name)}`;

    for (const letter of letters) {
      const match = matchAnnexureFacility(letter as unknown as ParsedAnnexureSection, contexts.facilities);
      const key = keyFor(letter.facilityNameRaw, match);
      map.set(key, { letter, section: null, match, key });
    }
    for (const section of sections) {
      const match = matchAnnexureFacility(section, contexts.facilities);
      const key = keyFor(section.facilityNameRaw, match);
      const found = map.get(key);
      if (found) found.section = section;
      else map.set(key, { letter: null, section, match, key });
    }
    return [...map.values()];
  }, [contexts, extraction]);

  useEffect(() => {
    if (!contexts || candidates.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows([]);
      return;
    }
    const doc = contexts.documents.find((item) => item.ok) ?? null;
    const next = candidates.map((candidate) => {
      const facility = candidate.match.facility;
      const currentCycleNumber =
        contexts.facilities.find((item) => item._id === facility?._id)?.currentCycleNumber ?? null;
      const cycles = facility
        ? contexts.cycles
            .filter((cycle) => cycle.facilityId === facility._id)
            .sort((a, b) => b.cycleNumber - a.cycleNumber)
        : [];
      const cycle =
        cycles.find((row) => !row.superseded && row.cycleNumber === currentCycleNumber) ??
        cycles.find((row) => !row.superseded) ??
        cycles[0] ??
        null;
      const existing = cycle
        ? contexts.existing.find(
            (row) => row.facilityId === facility?._id && row.cycleId === cycle._id,
          ) ?? null
        : null;
      const letter = candidate.letter;
      const section = candidate.section;
      const values = emptyValues();
      values.certifiedDate = isoDate(letter?.letterDate);
      values.assessmentStart = isoDate(letter?.assessmentStartDate ?? section?.assessmentDate);
      values.assessmentEnd = isoDate(letter?.assessmentEndDate ?? section?.assessmentDate);
      values.mode = letter?.mode ?? "";
      values.scopeOption =
        letter?.packageCount != null
          ? `${letter.packageCount} Service Packages`
          : section?.departmentsKind === "package" && section.departments.length > 0
            ? `${section.departments.length} Service Packages`
            : "";
      values.checklistVersion =
        letter?.criteriaMet != null && letter.criteriaTotal != null
          ? `Met ${letter.criteriaMet} out of ${letter.criteriaTotal} Criteria`
          : "";
      values.overallScore = numberText(letter?.overallScore ?? section?.overallScore);
      values.certificationStatus = letter?.certificationStatus ?? "";
      const before = {
        certifiedDate: existing?.fields?.certificationDate ?? existing?.fields?.goiLetterDate ?? "",
        assessmentStart: existing?.fields?.actualStartDate ?? "",
        assessmentEnd: existing?.fields?.actualEndDate ?? "",
        mode: existing?.fields?.mode ?? "",
        scopeOption: existing?.fields?.scopeOption ?? "",
        checklistVersion: existing?.fields?.checklistVersion ?? "",
        overallScore: numberText(existing?.fields?.scorePercent),
        certificationStatus: existing?.fields?.certificationStatus ?? "",
      };
      const page = letter?.pageNumber ?? section?.pageNumber ?? 1;
      const pageConfidence = extraction?.pages.find((p) => p.pageNumber === page)?.confidence;
      const sources = Object.fromEntries(
        FIELD_KEYS.map((field) => [field, sourceFor(page, pageConfidence)]),
      ) as ReadRow["sources"];
      const scoreSource = section
        ? sourceFor(section.pageNumber, pageConfidence)
        : null;
      const scoreConfidence = pageConfidence ?? 0;
      const scoreDoubtful = !!section && scoreConfidence > 0 && scoreConfidence < 65;
      const overall = letter?.overallScore ?? section?.overallScore ?? null;
      const warnings = [...(letter?.warnings ?? []), ...(section?.warnings ?? [])];
      if (candidate.match.status !== "matched") {
        warnings.push(
          candidate.match.status === "ambiguous"
            ? "This facility name matches more than one facility — choose the right one."
            : "This facility was not matched — choose it before applying.",
        );
      }
      if (!cycle) warnings.push("This facility has no certification cycle to write to.");
      return {
        key: candidate.key,
        documentId: doc?.id ?? "",
        documentName: doc?.name ?? localFile?.name ?? "NQAS Result.pdf",
        documentHash: doc?.sha256 ?? localHash,
        facilityId: facility?._id ?? "",
        facilityName: facility?.name ?? letter?.facilityNameRaw ?? section?.facilityNameRaw ?? "Unmatched facility",
        block: facility?.block ?? letter?.district ?? section?.district ?? "",
        cycleId: cycle?._id ?? "",
        cycleNumber: cycle?.cycleNumber ?? 0,
        letterPage: letter?.pageNumber ?? 1,
        annexurePage: section?.pageNumber ?? null,
        sourceName: letter?.facilityNameRaw ?? section?.facilityNameRaw ?? "",
        district: letter?.district ?? section?.district ?? null,
        before,
        values,
        included: Object.fromEntries(FIELD_KEYS.map((field) => [field, values[field].trim() !== ""])) as Record<FieldKey, boolean>,
        doubtful: Object.fromEntries(FIELD_KEYS.map((field) => [field, values[field] !== "" && (pageConfidence ?? 0) > 0 && (pageConfidence ?? 0) < 65])) as Record<FieldKey, boolean>,
        confirmed: emptyFlags(true),
        sources,
        selected: false,
        packagesText: values.scopeOption,
        criteriaText: values.checklistVersion,
        hasScores: !!section && (section.areas.length > 0 || section.departments.length > 0 || section.overallScore != null),
        areas: section?.areas?.map((area) => ({ key: area.key, name: area.name, score: area.score })) ?? [],
        departments: section?.departments?.map((department) => ({
          name: department.name,
          canonicalName: department.canonicalName,
          score: department.score,
          isNew: department.isNew,
          kind: section.departmentsKind,
        })) ?? [],
        pssScore: section?.pssScore ?? null,
        overallScore: overall,
        scoreEnabled: false,
        scoreConfirmed: !scoreDoubtful,
        scoreDoubtful,
        scoreSource,
        decision: existing?.scores ? ("skip" as const) : ("replace" as const),
        scoreConflict: !!existing?.scores && overall != null && !sameScore(existing.scores.overallScore, overall),
        warnings: [...new Set(warnings)],
        existingScores: existing?.scores ?? null,
        manual: !candidate.match.facility,
      } satisfies ReadRow;
    });
    setRows(next);
  }, [candidates, contexts, extraction, localFile, localHash]);

  const selected = selectedRowsOf(rows);
  const blocked = blockedReason(rows);
  const pdfUrl = storedUrl;
  const resolution = rows.length > 0 ? rows.filter((row) => row.facilityId && row.cycleId).length : 0;

  const updateRow = (key: string, patch: Partial<ReadRow> | ((row: ReadRow) => ReadRow)) => {
    setRows((current) =>
      current.map((row) =>
        row.key === key ? (typeof patch === "function" ? patch(row) : { ...row, ...patch }) : row,
      ),
    );
  };

  const chooseFacility = (row: ReadRow, nextFacilityId: string) => {
    const facility = contexts?.facilities.find((item) => item._id === nextFacilityId) ?? null;
    const cycles = contexts?.cycles
      .filter((cycle) => cycle.facilityId === nextFacilityId)
      .sort((a, b) => b.cycleNumber - a.cycleNumber) ?? [];
    const cycle =
      cycles.find((item) => !item.superseded && item.cycleNumber === facility?.currentCycleNumber) ??
      cycles.find((item) => !item.superseded) ??
      cycles[0] ??
      null;
    const existing = cycle
      ? contexts?.existing.find(
          (item) => item.facilityId === nextFacilityId && item.cycleId === cycle._id,
        ) ?? null
      : null;
    updateRow(row.key, {
      facilityId: nextFacilityId,
      facilityName: facility?.name ?? row.facilityName,
      block: facility?.block ?? row.block,
      cycleId: cycle?._id ?? "",
      cycleNumber: cycle?.cycleNumber ?? 0,
      before: {
        certifiedDate: existing?.fields?.certificationDate ?? existing?.fields?.goiLetterDate ?? "",
        assessmentStart: existing?.fields?.actualStartDate ?? "",
        assessmentEnd: existing?.fields?.actualEndDate ?? "",
        mode: existing?.fields?.mode ?? "",
        scopeOption: existing?.fields?.scopeOption ?? "",
        checklistVersion: existing?.fields?.checklistVersion ?? "",
        overallScore: numberText(existing?.fields?.scorePercent),
        certificationStatus: existing?.fields?.certificationStatus ?? "",
      },
      existingScores: existing?.scores ?? null,
      scoreConflict:
        !!existing?.scores &&
        row.overallScore != null &&
        !sameScore(existing.scores.overallScore, row.overallScore),
    });
  };

  const chooseCycle = (row: ReadRow, cycleId: string) => {
    const cycle = contexts?.cycles.find((item) => item._id === cycleId) ?? null;
    const existing = contexts?.existing.find(
      (item) => item.facilityId === row.facilityId && item.cycleId === cycleId,
    ) ?? null;
    updateRow(row.key, {
      cycleId,
      cycleNumber: cycle?.cycleNumber ?? 0,
      before: {
        certifiedDate: existing?.fields?.certificationDate ?? existing?.fields?.goiLetterDate ?? "",
        assessmentStart: existing?.fields?.actualStartDate ?? "",
        assessmentEnd: existing?.fields?.actualEndDate ?? "",
        mode: existing?.fields?.mode ?? "",
        scopeOption: existing?.fields?.scopeOption ?? "",
        checklistVersion: existing?.fields?.checklistVersion ?? "",
        overallScore: numberText(existing?.fields?.scorePercent),
        certificationStatus: existing?.fields?.certificationStatus ?? "",
      },
      existingScores: existing?.scores ?? null,
      scoreConflict:
        !!existing?.scores &&
        row.overallScore != null &&
        !sameScore(existing.scores.overallScore, row.overallScore),
    });
  };

  const runApply = async () => {
    if (blocked || selected.length === 0) {
      toast.error(blocked ?? "Select at least one row.");
      return;
    }
    let documentId = rows.find((row) => row.documentId)?.documentId ?? "";
    let attachedId = "";
    setBusy(true);
    try {
      if (localFile && onAttachLocal) {
        const attached = (await onAttachLocal(localFile, (sent, total) =>
          setUploadSent(total > 0 ? Math.round((sent / total) * 100) : 0),
        )) as { documentId?: string } | void;
        documentId = attached?.documentId ?? "";
        attachedId = documentId;
      }
      if (!documentId) throw new Error("Upload the PDF before applying the extracted values.");
      const items = toApplyItems(rows).map((item) => ({ ...item, documentId }));
      if (items.length === 0) throw new Error("Select at least one row with an accepted change.");
      const result = await apply({ items: items as never });
      toast.success(`Applied ${result.applied} row${result.applied === 1 ? "" : "s"}`, {
        description: result.skipped
          ? `${result.skipped} row${result.skipped === 1 ? " was" : "s were"} skipped by the server.`
          : "The read is in the audit trail and can be undone.",
      });
      onApplied?.(result.batchId, result.applied);
      onOpenChange(false);
    } catch (err) {
      if (attachedId && onDetachLocal) {
        await Promise.resolve(onDetachLocal(attachedId)).catch(() => undefined);
      }
      toast.error(err instanceof Error ? err.message : "The extracted result could not be saved.");
    } finally {
      setBusy(false);
      setUploadSent(0);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0">
        <div className="flex max-h-[92vh] flex-col">
          <DialogHeader className="border-b border-border/60 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <ScanText className="size-4 text-primary" /> Read NQAS result PDF
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review every extracted value. Nothing is saved until you select a row and press Apply.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {(reading || progress) && (
              <div className="rounded-lg border border-border/60 bg-muted/25 p-3">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <Loader2 className={cn("size-4", !reading && "hidden")} />
                  {progress?.message ?? "Preparing the PDF…"}
                </div>
                <Progress
                  className="mt-2 h-1.5"
                  value={
                    progress?.total
                      ? Math.round(((progress.page - (progress.phase === "ocr" ? 0.5 : 0)) / progress.total) * 100)
                      : 8
                  }
                />
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-xs text-amber-950">
                <p className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="size-4" /> The result PDF could not be read
                </p>
                <p className="mt-1">{error}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setRetryKey((v) => v + 1)}>
                    <RotateCcw className="size-3" /> Retry
                  </Button>
                  {localFile && onReattach && (
                    <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => onReattach(localFile)}>
                      Choose another PDF
                    </Button>
                  )}
                </div>
              </div>
            )}

            {extraction && (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-900">
                  <Check className="size-3" /> {extraction.pages.length} pages read
                </span>
                {extraction.textPages > 0 && <span>{extraction.textPages} native text</span>}
                {extraction.ocrPages > 0 && <span>{extraction.ocrPages} OCR</span>}
                <span>· {resolution} of {rows.length} rows resolved</span>
                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                  onClick={() => setSourceOpen((value) => !value)}
                >
                  <FileSearch className="size-3" /> {sourceOpen ? "Hide" : "View"} source PDF
                </button>
              </div>
            )}

            {sourceOpen && (
              <PdfCanvasViewer
                url={pdfUrl}
                file={localFile}
                label={rows[0]?.documentName ?? "Result PDF"}
                className="h-80"
              />
            )}

            {!reading && !error && extraction && rows.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                No facility row with a date and score was found. Use manual entry or check that this is the NQAS result letter.
              </div>
            )}

            {rows.map((row) => {
              const selectedRow = row.selected;
              return (
                <section
                  key={row.key}
                  className={cn(
                    "rounded-xl border bg-background",
                    selectedRow ? "border-primary/40" : "border-border/60",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2">
                    <Checkbox
                      checked={selectedRow}
                      onCheckedChange={(value) =>
                        updateRow(row.key, { selected: value === true })
                      }
                      aria-label={`Select ${row.facilityName}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{row.facilityName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.block || "No block"} · Page {row.letterPage}
                        {row.annexurePage ? ` / Annexure page ${row.annexurePage}` : ""}
                      </p>
                    </div>
                    {row.scoreConflict && (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                        Score conflict
                      </span>
                    )}
                    {selectedRow && <Check className="size-4 text-emerald-600" />}
                  </div>

                  <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-[11px] font-medium">
                      Facility
                      <Select value={row.facilityId || "none"} onValueChange={(value) => chooseFacility(row, value)}>
                        <SelectTrigger className="mt-1 h-8 text-xs">
                          <SelectValue placeholder="Choose facility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Choose facility</SelectItem>
                          {contexts?.facilities.map((facility) => (
                            <SelectItem key={facility._id} value={facility._id}>
                              {facility.name} · {facility.block}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="text-[11px] font-medium">
                      Cycle
                      <Select value={row.cycleId || "none"} onValueChange={(value) => chooseCycle(row, value)}>
                        <SelectTrigger className="mt-1 h-8 text-xs">
                          <SelectValue placeholder="Choose cycle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Choose cycle</SelectItem>
                          {(contexts?.cycles ?? [])
                            .filter((cycle) => cycle.facilityId === row.facilityId)
                            .sort((a, b) => b.cycleNumber - a.cycleNumber)
                            .map((cycle) => (
                              <SelectItem key={cycle._id} value={cycle._id}>
                                Cycle #{cycle.cycleNumber}{cycle.superseded ? " (old)" : ""}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </label>
                    <p className="self-end text-[10px] text-muted-foreground">
                      Confidence {row.sources.overallScore.confidence || "-"}% · {row.documentName}
                    </p>
                  </div>

                  <div className="grid gap-2 border-t border-border/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
                    {FIELD_KEYS.map((field) => (
                      <div key={field} className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            checked={row.included[field]}
                            onCheckedChange={(value) =>
                              updateRow(row.key, (current) => ({
                                ...current,
                                included: { ...current.included, [field]: value === true },
                              }))
                            }
                            aria-label={`Include ${FIELD_LABELS[field]}`}
                          />
                          <span className="truncate text-[10.5px] font-semibold">{FIELD_LABELS[field]}</span>
                          {row.doubtful[field] && !row.confirmed[field] && (
                            <span className="rounded bg-amber-100 px-1 text-[9px] font-semibold text-amber-900">Check</span>
                          )}
                        </div>
                        <Input
                          value={row.values[field]}
                          onChange={(event) =>
                            updateRow(row.key, (current) => ({
                              ...current,
                              values: { ...current.values, [field]: event.target.value },
                              included: { ...current.included, [field]: true },
                            }))
                          }
                          className="mt-1 h-8 text-xs"
                          aria-label={`${FIELD_LABELS[field]} for ${row.facilityName}`}
                        />
                        <div className="mt-0.5 flex items-center justify-between gap-1 text-[9.5px] text-muted-foreground">
                          <span>
                            p.{row.sources[field].page}
                            {row.sources[field].confidence > 0
                              ? ` · ${row.sources[field].confidence}%`
                              : ""}
                          </span>
                          {row.doubtful[field] && (
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={row.confirmed[field]}
                                onChange={(event) =>
                                  updateRow(row.key, (current) => ({
                                    ...current,
                                    confirmed: { ...current.confirmed, [field]: event.target.checked },
                                  }))
                                }
                              />
                              Confirm
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {row.hasScores && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-border/40 px-3 py-2 text-[11px]">
                      <Checkbox
                        checked={row.scoreEnabled}
                        onCheckedChange={(value) =>
                          updateRow(row.key, { scoreEnabled: value === true })
                        }
                        aria-label={`Save Annexure scores for ${row.facilityName}`}
                      />
                      <span className="font-medium">Include Annexure scores</span>
                      <span className="text-muted-foreground">
                        {row.areas.length} areas · {row.departments.length} departments
                      </span>
                      {row.existingScores && row.scoreEnabled && (
                        <label className="flex items-center gap-1.5 text-[10.5px] text-amber-800">
                          <input
                            type="checkbox"
                            checked={row.decision === "replace"}
                            onChange={(event) =>
                              updateRow(row.key, {
                                decision: event.target.checked ? "replace" : "skip",
                              })
                            }
                          />
                          Replace existing Annexure scores
                        </label>
                      )}
                      {row.scoreDoubtful && !row.scoreConfirmed && (
                        <label className="ml-auto inline-flex items-center gap-1 text-amber-800">
                          <input
                            type="checkbox"
                            checked={row.scoreConfirmed}
                            onChange={(event) =>
                              updateRow(row.key, { scoreConfirmed: event.target.checked })
                            }
                          />
                          Confirm low-confidence scores
                        </label>
                      )}
                    </div>
                  )}
                  {row.warnings.length > 0 && (
                    <div className="border-t border-border/40 px-3 py-2 text-[10.5px] text-amber-800">
                      {row.warnings.map((warning) => <p key={warning}>• {warning}</p>)}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <DialogFooter className="border-t border-border/60 px-5 py-3 sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 shrink-0" />
              <span>
                {selected.length} selected · {rows.filter((row) => row.facilityId && row.cycleId).length} resolved
                {busy && uploadSent > 0 ? ` · uploading ${uploadSent}%` : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                onClick={() => void runApply()}
                disabled={busy || !extraction || selected.length === 0 || !!blocked}
              >
                {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Check className="mr-1.5 size-4" />}
                Apply selected ({selected.length})
              </Button>
            </div>
          </DialogFooter>
          {blocked && selected.length > 0 && (
            <p className="border-t border-amber-200 bg-amber-50 px-5 py-2 text-[11px] text-amber-900">
              {blocked}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
