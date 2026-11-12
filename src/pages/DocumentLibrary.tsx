/**
 * DOCUMENT LIBRARY — `/documents`.
 *
 * Two views of the same cached read model (`documentLibrary.library`):
 *
 *   Matrix  one row per facility, one cell per document type — the fastest way
 *           to see what is missing and to upload it.
 *   Files   one row per file, grouped by facility, with Open and Download.
 *
 * The coverage strip, the filters, the matrix, the files list and the ZIP
 * estimate all read ONE query and ONE rule set (Admin → Documents via
 * `resolveDocumentRequirements`), so their numbers can never disagree with the
 * Master List or Needs attention. No Drive call happens on this page: links are
 * minted in one batch only for the rows that are visible.
 */

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Link } from "react-router";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Download,
  Ellipsis,
  ExternalLink,
  FileArchive,
  Files,
  LayoutGrid,
  List,
  Loader2,
  ScanText,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { PageShell } from "@/components/PageShell";
import { FacilityCell } from "@/components/FacilityCell";
import { DocumentSlot } from "@/components/documents/DocumentSlot";
import {
  ResultReadButton,
  ResultReadStatusLine,
  resultDisplayDate,
} from "@/components/result/ResultReadButton";
import { LazyResultReadDialog } from "@/components/result/LazyResultReadDialog";
import { isFacilityDocument } from "@/lib/documentCycles";
import {
  UniversalFilterBar,
  type BarValue,
  type FilterField,
} from "@/components/UniversalFilterBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDocumentUrls, useDocumentUrls } from "@/lib/documentLinks";
import {
  DOCUMENT_TOTAL,
  formatFileSize,
  validateDocumentFile,
} from "@/lib/documentsConfig";
import {
  resolveDocumentRequirements,
  type DocRequirement,
  type DocumentRules,
} from "@/lib/documentRules";
import { matchDroppedFiles, type DropMatch, type DropFacility } from "@/lib/libraryDropMatch";
import { uploadDocument, uploadKeyFor } from "@/lib/uploadDocuments";
import { createUploadTransport, type UploadActions } from "@/lib/uploadTransport";
import { friendlyUploadError } from "@/lib/uploadConfig";
import { cn } from "@/lib/utils";
import {
  buildZipParts,
  mapWithConcurrency,
  shortZipError,
  type ZipSourceFile,
  type ZipPart,
} from "@/lib/libraryZip";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Facility = DropFacility & {
  cycles: number[];
  certStatus: string | null;
  gapAmount: number;
  dilapidated: boolean;
  fireNocRecorded: boolean;
};

type LibraryDoc = {
  id: string;
  facilityId: string;
  docKey: string;
  docLabel: string;
  cycleNo: number;
  originalName: string;
  displayName: string;
  size: number;
  mimeType: string;
  uploadedAt: number;
  uploadedByName: string;
  versionNo: number;
  isCurrent: boolean;
  missingInDrive: boolean;
  /** Latest accepted Result read; null = never read. */
  resultReadAt: number | null;
  resultCertifiedDate: string | null;
  resultOverallScore: number | null;
};

type Definition = { key: string; label: string };

type Result = {
  facilities: Facility[];
  documents: LibraryDoc[];
  definitions: Definition[];
  rules: DocumentRules;
  readerEnabled: boolean;
};

type CellTarget = { facilityId: string; docKey: string; cycleNo?: number };
type CycleMode = "current" | "1" | "2" | "all";
type FileRow =
  | { kind: "file"; key: string; facility: Facility; doc: LibraryDoc }
  | {
      kind: "missing";
      key: string;
      facility: Facility;
      definition: Definition;
      required: boolean;
    };

type ViewMode = "matrix" | "files";

/* -------------------------------------------------------------------------- */
/* Small pure helpers                                                         */
/* -------------------------------------------------------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function stamp(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

function stampIst(ts: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).formatToParts(new Date(ts));
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("day")}-${value("month")}-${value("year")}`;
}

function isoDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Short header labels — the grid never scrolls horizontally to read a name. */
const SHORT_LABEL: Record<string, string> = {
  NQAS_Result: "NQAS Result",
  SA_Report: "SA Report",
  SA_Checklist: "SA Checklist",
  Gap_Closure: "Gap Closure",
  Condemned: "Condemned",
  NOC: "Fire NOC",
};

const CONDITION_NOUN: Record<string, string> = {
  certified: "certified facilities",
  gap_amount: "facilities with gap amount",
  dilapidated: "dilapidated facilities",
  fire_noc: "facilities with a Fire NOC",
};

const VIEW_KEY = "nqas.documents.view.v1";
const DEFAULT_BAR_KEYS = [
  "block",
  "facilityType",
  "docKey",
  "state",
  "resultRead",
  "uploadDate",
  "uploadedBy",
];
const CYCLE_MODES: { value: CycleMode; label: string }[] = [
  { value: "current", label: "Current" },
  { value: "1", label: "Cycle 1" },
  { value: "2", label: "Cycle 2" },
  { value: "all", label: "All" },
];

function readCycleMode(userId: string | null | undefined): CycleMode {
  if (typeof window === "undefined") return "current";
  try {
    const value = window.localStorage.getItem(`nqas.documents.cycle.v1:${userId ?? "anon"}`);
    return CYCLE_MODES.some((mode) => mode.value === value) ? (value as CycleMode) : "current";
  } catch {
    return "current";
  }
}

function readView(): ViewMode {
  if (typeof window === "undefined") return "matrix";
  return window.localStorage.getItem(VIEW_KEY) === "files" ? "files" : "matrix";
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function DocumentLibraryPage() {
  const { user } = useAuth();
  const canEdit =
    user?.appRole === "admin" ||
    user?.appRole === "entry" ||
    user?.appRole === "dqmo" ||
    user?.appRole === "dqc";
  const result = useQuery(api.documentLibrary.library, {}) as Result | undefined;
  const facilities = result?.facilities ?? [];
  const documents = result?.documents ?? [];
  const definitions = result?.definitions ?? [];
  const rules = result?.rules;
  const readerEnabled = result?.readerEnabled === true;

  const [search, setSearch] = useState("");
  const [bar, setBar] = useState<BarValue>({
    barKeys: DEFAULT_BAR_KEYS,
    filters: [],
    match: "all",
  });
  const [view, setView] = useState<ViewMode>(readView);
  const [cycleMode, setCycleMode] = useState<CycleMode>(() => readCycleMode(user?._id));
  const [includeVersions, setIncludeVersions] = useState(false);
  const [detailCell, setDetailCell] = useState<CellTarget | null>(null);
  const [uploadCell, setUploadCell] = useState<CellTarget | null>(null);
  const [preview, setPreview] = useState<{ files: File[]; matches: DropMatch[] } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [cellBusyKey, setCellBusyKey] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<string[] | null>(null);
  const [readFacilityId, setReadFacilityId] = useState<string | null>(null);
  const [readSelected, setReadSelected] = useState<Set<string>>(new Set());
  const openRead = (ids: string[], facilityId: string | null = null) => {
    if (!readerEnabled) return;
    setReadFacilityId(facilityId);
    setReadIds(ids);
  };
  const dragDepth = useRef(0);
  const matrixScrollRef = useRef<HTMLDivElement | null>(null);

  const beginUpload = useAction(api.documents.beginUpload);
  const uploadChunk = useAction(api.documents.uploadChunk);
  const finalizeUpload = useAction(api.documents.finalizeUpload);
  const cancelUpload = useAction(api.documents.cancelUpload);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* private mode — the view just won't be remembered */
    }
  }, [view]);

  useEffect(() => {
    if (user?._id) setCycleMode(readCycleMode(user._id));
  }, [user?._id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `nqas.documents.cycle.v1:${user?._id ?? "anon"}`,
        cycleMode,
      );
    } catch {
      /* private mode — the cycle choice is not remembered */
    }
  }, [cycleMode, user?._id]);

  useEffect(() => {
    if (result?.readerEnabled === false) {
      setReadSelected(new Set());
      setReadIds(null);
      setBar((current) => {
        if (!current.barKeys.includes("resultRead") && !current.filters.some((f) => f.key === "resultRead")) {
          return current;
        }
        return {
          ...current,
          barKeys: current.barKeys.filter((key) => key !== "resultRead"),
          filters: current.filters.filter((filter) => filter.key !== "resultRead"),
        };
      });
    }
  }, [result?.readerEnabled]);

  const valueOf = (key: string) => bar.filters.find((f) => f.key === key)?.values[0] ?? "";
  const blockF = valueOf("block");
  const typeF = valueOf("facilityType");
  const docF = valueOf("docKey");
  const stateF = valueOf("state");
  const dateF = valueOf("uploadDate");
  const byF = valueOf("uploadedBy");
  const readF = readerEnabled ? valueOf("resultRead") : "";

  /* ---------------------------- options ---------------------------- */

  const blocks = useMemo(
    () => Array.from(new Set(facilities.map((f) => f.block))).sort(),
    [facilities],
  );
  const types = useMemo(
    () => Array.from(new Set(facilities.map((f) => f.facilityType))).sort(),
    [facilities],
  );
  const uploaders = useMemo(
    () => Array.from(new Set(documents.map((d) => d.uploadedByName))).sort(),
    [documents],
  );

  const fields = useMemo<FilterField[]>(
    () => [
      {
        key: "block",
        label: "Block",
        type: "select",
        group: "Identity",
        onThisPage: true,
        options: blocks.map((value) => ({ value })),
      },
      {
        key: "facilityType",
        label: "Facility type",
        type: "select",
        group: "Identity",
        onThisPage: true,
        options: types.map((value) => ({ value })),
      },
      {
        key: "docKey",
        label: "Document type",
        type: "select",
        group: "Documents",
        onThisPage: true,
        options: definitions.map((definition) => ({
          value: definition.key,
          label: definition.label,
          count: documents.filter(
            (d) => d.isCurrent && !d.missingInDrive && d.docKey === definition.key,
          ).length,
        })),
      },
      {
        key: "state",
        label: "State",
        type: "select",
        group: "Documents",
        onThisPage: true,
        options: [
          { value: "uploaded", label: "Uploaded" },
          { value: "missing", label: "Missing" },
          { value: "required_missing", label: "Required and missing" },
        ],
      },
      ...(readerEnabled
        ? ([
            {
              key: "resultRead",
              label: "Result read",
              type: "select" as const,
              group: "Documents",
              onThisPage: true,
              options: [{ value: "not_read", label: "Result not read" }],
            },
          ] satisfies FilterField[])
        : []),
      {
        key: "uploadDate",
        label: "Uploaded date",
        type: "date",
        group: "Documents",
        onThisPage: true,
      },
      {
        key: "uploadedBy",
        label: "Uploaded by",
        type: "select",
        group: "Documents",
        onThisPage: true,
        options: uploaders.map((value) => ({ value })),
      },
    ],
    [blocks, types, definitions, documents, uploaders, readerEnabled],
  );

  /* --------------------------- the read model --------------------------- */

  const model = useMemo(() => {
    const q = search.trim().toLowerCase();
    const facilityById = new Map(facilities.map((f) => [f.id, f]));

    /* The selected cycle. "Current" follows each facility; "All" shows every
       cycle as its own small chip. Facility documents ignore the cycle. */
    const cycleFor = (facility: Facility): number | null =>
      cycleMode === "all" ? null : cycleMode === "current" ? facility.cycleNo : Number(cycleMode);
    const cycleMatches = (facility: Facility, doc: LibraryDoc): boolean => {
      if (isFacilityDocument(doc.docKey)) return true;
      if (cycleMode === "all") return true;
      return (doc.cycleNo ?? 1) === cycleFor(facility);
    };
    /** A cycle the facility does not have shows "-", never "Required". */
    const cycleApplicable = (facility: Facility, docKey: string): boolean => {
      if (isFacilityDocument(docKey) || cycleMode === "current") return true;
      if (cycleMode === "all") return facility.cycles.length > 0;
      return facility.cycles.includes(Number(cycleMode));
    };

    /* Present / broken-in-Drive current files, keyed by facility + type +
       cycle. A missing-in-Drive row is NEVER counted as uploaded. */
    const presentByCycle = new Map<string, LibraryDoc>();
    const brokenByCycle = new Map<string, LibraryDoc>();
    for (const doc of documents) {
      if (!doc.isCurrent) continue;
      const cycle = isFacilityDocument(doc.docKey) ? 0 : (doc.cycleNo ?? 1);
      const key = `${doc.facilityId}|${doc.docKey}|${cycle}`;
      const target = doc.missingInDrive ? brokenByCycle : presentByCycle;
      const previous = target.get(key);
      if (!previous || doc.uploadedAt > previous.uploadedAt) target.set(key, doc);
    }

    /* One selected-cycle view for counts, filters and file rows. In "All" the
       newest present file for the type is used for those summaries; the matrix
       still shows every cycle chip separately. */
    const present = new Map<string, Map<string, LibraryDoc>>();
    const broken = new Map<string, Map<string, LibraryDoc>>();
    for (const facility of facilities) {
      const presentForFacility = new Map<string, LibraryDoc>();
      const brokenForFacility = new Map<string, LibraryDoc>();
      for (const definition of definitions) {
        const keys = isFacilityDocument(definition.key)
          ? [`${facility.id}|${definition.key}|0`]
          : cycleMode === "all"
            ? facility.cycles.map((cycle) => `${facility.id}|${definition.key}|${cycle}`)
            : [`${facility.id}|${definition.key}|${cycleFor(facility) ?? 1}`];
        const presentDocs = keys
          .map((key) => presentByCycle.get(key))
          .filter((doc): doc is LibraryDoc => !!doc)
          .sort((a, b) => b.uploadedAt - a.uploadedAt);
        if (presentDocs[0]) presentForFacility.set(definition.key, presentDocs[0]);
        const brokenDocs = keys
          .map((key) => brokenByCycle.get(key))
          .filter((doc): doc is LibraryDoc => !!doc)
          .sort((a, b) => b.uploadedAt - a.uploadedAt);
        if (brokenDocs[0]) brokenForFacility.set(definition.key, brokenDocs[0]);
      }
      present.set(facility.id, presentForFacility);
      broken.set(facility.id, brokenForFacility);
    }

    const requirements = new Map<string, Record<string, DocRequirement>>();
    for (const facility of facilities) {
      requirements.set(
        facility.id,
        resolveDocumentRequirements(rules ?? {}, {
          certStatus: facility.certStatus,
          gapAmount: facility.gapAmount,
          dilapidated: facility.dilapidated,
          fireNocRecorded: facility.fireNocRecorded,
        }),
      );
    }

    /* Coverage is district-wide (all facilities in scope), never narrowed by
       the filters, so the strip is a stable progress report. */
    const coverage = definitions.map((definition) => {
      let uploaded = 0;
      let uploadedInExpected = 0;
      let expected = 0;
      let noun = CONDITION_NOUN.certified;
      for (const facility of facilities) {
        const requirement = requirements.get(facility.id)?.[definition.key];
        const isPresent = present.get(facility.id)?.has(definition.key) ?? false;
        if (isPresent) uploaded += 1;
        if (requirement?.required && cycleApplicable(facility, definition.key)) {
          expected += 1;
          noun =
            requirement.rule.mode === "mandatory"
              ? "facilities"
              : CONDITION_NOUN[requirement.rule.condition] ?? "facilities";
          if (isPresent) uploadedInExpected += 1;
        }
      }
      return {
        ...definition,
        uploaded,
        expected,
        uploadedInExpected,
        required: expected > 0,
        noun,
        pct:
          expected > 0
            ? Math.round((uploadedInExpected / expected) * 100)
            : facilities.length > 0
              ? Math.round((uploaded / facilities.length) * 100)
              : 0,
      };
    });
    const overall = {
      expected: coverage.reduce((sum, c) => sum + c.expected, 0),
      uploaded: coverage.reduce((sum, c) => sum + c.uploadedInExpected, 0),
    };

    const docLevel = (doc: LibraryDoc, facility: Facility, skipBlock = false) => {
      if (!skipBlock && blockF && facility.block !== blockF) return false;
      if (typeF && facility.facilityType !== typeF) return false;
      if (!includeVersions && !doc.isCurrent) return false;
      if (docF && doc.docKey !== docF) return false;
      if (readF === "not_read") {
        if (doc.docKey !== "NQAS_Result" || doc.resultReadAt != null) return false;
      }
      if (!cycleMatches(facility, doc)) return false;
      if (dateF && isoDay(doc.uploadedAt) !== dateF) return false;
      if (byF && doc.uploadedByName !== byF) return false;
      if (q) {
        const hay =
          `${facility.name} ${facility.nin ?? ""} ${facility.phc} ${facility.block} ${doc.docLabel} ${doc.displayName} ${doc.originalName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    };

    const facilityText = (facility: Facility) =>
      `${facility.name} ${facility.nin ?? ""} ${facility.block} ${facility.phc} ${facility.facilityType}`.toLowerCase();

    const facilityMatchesSearch = (facility: Facility) =>
      !q ||
      facilityText(facility).includes(q) ||
      documents.some(
        (doc) =>
          doc.facilityId === facility.id &&
          `${doc.displayName} ${doc.originalName} ${doc.docLabel}`.toLowerCase().includes(q),
      );

    const matrixFacilities = facilities.filter((facility) => {
      if (blockF && facility.block !== blockF) return false;
      if (typeF && facility.facilityType !== typeF) return false;
      if (!facilityMatchesSearch(facility)) return false;
      if (
        readF === "not_read" &&
        !documents.some(
          (doc) =>
            doc.facilityId === facility.id &&
            doc.isCurrent &&
            !doc.missingInDrive &&
            doc.docKey === "NQAS_Result" &&
            doc.resultReadAt == null,
        )
      )
        return false;
      const files = present.get(facility.id) ?? new Map<string, LibraryDoc>();
      const requirement = requirements.get(facility.id) ?? {};
      const requiredMissing = definitions.filter(
        (definition) =>
          requirement[definition.key]?.required &&
          cycleApplicable(facility, definition.key) &&
          !files.has(definition.key),
      );

      if (stateF === "uploaded") {
        if (docF) {
          const doc = files.get(docF);
          return (
            !!doc &&
            (!dateF || isoDay(doc.uploadedAt) === dateF) &&
            (!byF || doc.uploadedByName === byF)
          );
        }
        return documents.some(
          (doc) => doc.facilityId === facility.id && docLevel(doc, facility),
        );
      }
      if (stateF === "missing") {
        return docF
          ? !files.has(docF)
          : definitions.some(
              (definition) =>
                cycleApplicable(facility, definition.key) && !files.has(definition.key),
            );
      }
      if (stateF === "required_missing") {
        return docF
          ? !!requirement[docF]?.required &&
              cycleApplicable(facility, docF) &&
              !files.has(docF)
          : requiredMissing.length > 0;
      }
      if (docF) {
        return (
          files.has(docF) ||
          !!broken.get(facility.id)?.has(docF) ||
          !!requirement[docF]?.required
        );
      }
      if (dateF || byF) {
        return documents.some(
          (doc) => doc.facilityId === facility.id && docLevel(doc, facility),
        );
      }
      return true;
    });

    const visibleIds = new Set(matrixFacilities.map((f) => f.id));
    const fileRows: FileRow[] = [];

    if (stateF === "missing" || stateF === "required_missing") {
      for (const facility of matrixFacilities) {
        const files = present.get(facility.id) ?? new Map<string, LibraryDoc>();
        const requirement = requirements.get(facility.id) ?? {};
        for (const definition of definitions) {
          if (docF && definition.key !== docF) continue;
          if (!cycleApplicable(facility, definition.key)) continue;
          const required = !!requirement[definition.key]?.required;
          if (stateF === "required_missing" && !required) continue;
          if (files.has(definition.key)) continue;
          fileRows.push({
            kind: "missing",
            key: `m-${facility.id}-${definition.key}`,
            facility,
            definition,
            required,
          });
        }
      }
    } else {
      for (const doc of documents) {
        const facility = facilityById.get(doc.facilityId);
        if (!facility || !visibleIds.has(facility.id) || doc.missingInDrive) continue;
        if (!docLevel(doc, facility)) continue;
        fileRows.push({ kind: "file", key: doc.id, facility, doc });
      }
    }

    const rowLabel = (row: FileRow) =>
      row.kind === "file" ? row.doc.docLabel : row.definition.label;
    fileRows.sort(
      (a, b) =>
        a.facility.name.localeCompare(b.facility.name) ||
        rowLabel(a).localeCompare(rowLabel(b)),
    );

    /* The rows the matrix is showing (for link minting and the counter). */
    const matrixDocs = documents.filter((doc) => {
      const facility = facilityById.get(doc.facilityId);
      return (
        !!facility &&
        visibleIds.has(facility.id) &&
        !doc.missingInDrive &&
        docLevel(doc, facility)
      );
    });

    /* ZIP estimate / scope counts: only files with bytes, never a missing-in-
       Drive row, and never while the page is filtered to missing files. */
    const zipEligible = (doc: LibraryDoc, facility: Facility, skipBlock = false) =>
      !doc.missingInDrive &&
      (includeVersions || doc.isCurrent) &&
      docLevel(doc, facility, skipBlock);
    const zipDocs =
      stateF === "missing" || stateF === "required_missing"
        ? []
        : documents.filter((doc) => {
            const facility = facilityById.get(doc.facilityId);
            return !!facility && zipEligible(doc, facility);
          });
    /* Block/facility picks override the block filter, like the old export. */
    const zipDocsAnyBlock =
      stateF === "missing" || stateF === "required_missing"
        ? []
        : documents.filter((doc) => {
            const facility = facilityById.get(doc.facilityId);
            return !!facility && zipEligible(doc, facility, true);
          });

    const zipByBlock = new Map<string, number>();
    const zipByFacility = new Map<string, number>();
    if (stateF !== "missing" && stateF !== "required_missing") {
      for (const doc of documents) {
        const facility = facilityById.get(doc.facilityId);
        if (!facility || !zipEligible(doc, facility, true)) continue;
        zipByFacility.set(facility.id, (zipByFacility.get(facility.id) ?? 0) + 1);
        zipByBlock.set(facility.block, (zipByBlock.get(facility.block) ?? 0) + 1);
      }
    }

    const currentFiles = documents.filter(
      (doc) => doc.isCurrent && !doc.missingInDrive,
    ).length;

    return {
      coverage,
      overall,
      matrixFacilities,
      fileRows,
      matrixDocs,
      zipDocs,
      zipDocsAnyBlock,
      zipByBlock,
      zipByFacility,
      present,
      broken,
      presentByCycle,
      brokenByCycle,
      requirements,
      currentFiles,
    };
  }, [
    facilities,
    documents,
    definitions,
    rules,
    search,
    blockF,
    typeF,
    docF,
    cycleMode,
    stateF,
    readF,
    dateF,
    byF,
    includeVersions,
  ]);

  /* Links are minted in one action call for the visible current files only. */
  const linkIds = useMemo(() => {
    const visible = new Set(model.matrixFacilities.map((facility) => facility.id));
    return documents
      .filter(
        (doc) =>
          !doc.missingInDrive &&
          visible.has(doc.facilityId) &&
          (includeVersions || doc.isCurrent),
      )
      .map((doc) => doc.id)
      .slice(0, 500);
  }, [documents, model.matrixFacilities, includeVersions]);
  const inlineUrls = useDocumentUrls(linkIds, "inline");
  const downloadUrls = useDocumentUrls(linkIds, "attachment");

  const applyCoverage = (docKey: string, required: boolean) => {
    setBar((current) => {
      const active = docF === docKey && stateF !== "";
      if (active) {
        return {
          ...current,
          filters: current.filters.filter((f) => f.key !== "docKey" && f.key !== "state"),
        };
      }
      return {
        ...current,
        barKeys: current.barKeys.includes("state")
          ? current.barKeys
          : [...current.barKeys, "state"],
        filters: [
          ...current.filters.filter((f) => f.key !== "docKey" && f.key !== "state"),
          { key: "docKey", op: "in", values: [docKey] },
          {
            key: "state",
            op: "in",
            values: [required ? "required_missing" : "missing"],
          },
        ],
      };
    });
  };

  const clearSearchAndFilters = () => {
    setSearch("");
    setBar({
      barKeys: readerEnabled
        ? DEFAULT_BAR_KEYS
        : DEFAULT_BAR_KEYS.filter((key) => key !== "resultRead"),
      filters: [],
      match: "all",
    });
  };

  /* ------------------------------ drag & drop ------------------------------ */

  const openPreview = (files: File[]) => {
    if (!canEdit || files.length === 0) return;
    const existing = documents
      .filter((doc) => doc.isCurrent && !doc.missingInDrive)
      .map((doc) => ({
        facilityId: doc.facilityId,
        docKey: doc.docKey,
        cycleNo: isFacilityDocument(doc.docKey) ? null : doc.cycleNo,
      }));
    setPreview({ files, matches: matchDroppedFiles(files, facilities, existing) });
  };

  const dropHandlers = canEdit
    ? {
        onDragEnter: (event: DragEvent) => {
          if (!event.dataTransfer?.types?.includes("Files")) return;
          event.preventDefault();
          dragDepth.current += 1;
          setDragActive(true);
        },
        onDragOver: (event: DragEvent) => {
          if (!event.dataTransfer?.types?.includes("Files")) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        },
        onDragLeave: () => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragActive(false);
        },
        onDrop: (event: DragEvent) => {
          event.preventDefault();
          dragDepth.current = 0;
          setDragActive(false);
          openPreview(Array.from(event.dataTransfer?.files ?? []));
        },
      }
    : {};

  const subtitle = result
    ? `${model.currentFiles} file${model.currentFiles === 1 ? "" : "s"} · ${facilities.length} facilit${
        facilities.length === 1 ? "y" : "ies"
      }`
    : "Current facility documents";

  const detailDoc =
    detailCell &&
    documents
      .filter(
        (doc) =>
          doc.facilityId === detailCell.facilityId &&
          doc.docKey === detailCell.docKey &&
          doc.isCurrent &&
          (isFacilityDocument(doc.docKey) ||
            detailCell.cycleNo == null ||
            (doc.cycleNo ?? 1) === detailCell.cycleNo),
      )
      .sort((a, b) => b.uploadedAt - a.uploadedAt)[0];
  const detailFacility = detailCell
    ? facilities.find((f) => f.id === detailCell.facilityId) ?? null
    : null;
  const uploadFacility = uploadCell
    ? facilities.find((f) => f.id === uploadCell.facilityId) ?? null
    : null;

  /** The chips a matrix cell shows. In "All" each existing cycle gets its own
   *  chip; a cycle the facility does not have is a dash, never Required. */
  const cellTargets = (facility: Facility, docKey: string) => {
    if (isFacilityDocument(docKey)) {
      const key = `${facility.id}|${docKey}|0`;
      return [
        {
          cycleNo: null as number | null,
          available: true,
          doc: model.presentByCycle.get(key) ?? null,
          broken: model.brokenByCycle.get(key) ?? null,
          compact: false,
        },
      ];
    }
    if (cycleMode === "all") {
      if (facility.cycles.length === 0) return [];
      return facility.cycles.map((cycleNo) => {
        const key = `${facility.id}|${docKey}|${cycleNo}`;
        return {
          cycleNo: cycleNo as number | null,
          available: true,
          doc: model.presentByCycle.get(key) ?? null,
          broken: model.brokenByCycle.get(key) ?? null,
          compact: true,
        };
      });
    }
    const cycleNo = cycleMode === "current" ? facility.cycleNo : Number(cycleMode);
    const key = `${facility.id}|${docKey}|${cycleNo}`;
    return [
      {
        cycleNo: cycleNo as number | null,
        available: cycleMode === "current" || facility.cycles.includes(cycleNo),
        doc: model.presentByCycle.get(key) ?? null,
        broken: model.brokenByCycle.get(key) ?? null,
        compact: false,
      },
    ];
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of model.fileRows)
      counts.set(row.facility.id, (counts.get(row.facility.id) ?? 0) + 1);
    return counts;
  }, [model.fileRows]);

  const matrixVirtualizer = useVirtualizer({
    count: model.matrixFacilities.length,
    getScrollElement: () => matrixScrollRef.current,
    estimateSize: () => 48,
    overscan: 12,
  });
  useEffect(() => {
    matrixVirtualizer.measure();
  }, [model.matrixFacilities.length, view, matrixVirtualizer]);
  /* A filter change while scrolled deep must not leave a blank virtual window. */
  useEffect(() => {
    matrixScrollRef.current?.scrollTo({ top: 0 });
  }, [search, blockF, typeF, docF, cycleMode, stateF, readF, dateF, byF, includeVersions]);
  const matrixVirtualRows = matrixVirtualizer.getVirtualItems();
  const matrixTotalHeight = matrixVirtualizer.getTotalSize();
  const matrixPadTop = matrixVirtualRows.length > 0 ? matrixVirtualRows[0].start : 0;
  const matrixPadBottom =
    matrixVirtualRows.length > 0
      ? Math.max(0, matrixTotalHeight - matrixVirtualRows[matrixVirtualRows.length - 1].end)
      : 0;

  /** Drop a file straight onto a matrix cell: same uploader the dialog uses,
   *  with the facility + document type already fixed. */
  const uploadToCell = async (
    facility: Facility,
    docKey: string,
    file: File,
    cycleNo?: number,
  ) => {
    if (!canEdit) return;
    const key = `${facility.id}:${docKey}:${cycleNo ?? ""}`;
    const invalid = validateDocumentFile(docKey, file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setCellBusyKey(key);
    try {
      const transport = createUploadTransport(
        { begin: beginUpload, putChunk: uploadChunk, finalize: finalizeUpload, cancel: cancelUpload },
        facility.id,
      );
      await uploadDocument(
        {
          facilityId: facility.id,
          docKey,
          cycleNo: cycleNo ?? (isFacilityDocument(docKey) ? facility.cycleNo : undefined),
          file,
          bytes: async () => new Uint8Array(await file.arrayBuffer()),
          uploadKey: uploadKeyFor(facility.id, docKey, file),
        },
        transport,
      );
      toast.success(`${file.name} uploaded`);
    } catch (error) {
      toast.error(friendlyUploadError(error));
    } finally {
      setCellBusyKey(null);
    }
  };

  const requiredFilterActive = stateF === "required_missing" && !docF;
  const applyRequired = () => {
    setBar((current) => {
      if (requiredFilterActive) {
        return {
          ...current,
          filters: current.filters.filter((f) => f.key !== "state"),
        };
      }
      return {
        ...current,
        barKeys: current.barKeys.includes("state") ? current.barKeys : [...current.barKeys, "state"],
        filters: [
          ...current.filters.filter((f) => f.key !== "docKey" && f.key !== "state"),
          { key: "state", op: "in", values: ["required_missing"] },
        ],
      };
    });
  };

  return (
    <AppShell title="Document Library" subtitle={subtitle} titleIcon={Files}>
      <div className="relative space-y-3 pb-24 md:pb-0" data-testid="document-library" {...dropHandlers}>
        {dragActive && (
          <div className="pointer-events-none fixed inset-4 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-background/85">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <UploadCloud className="size-5" /> Drop files to match and upload
            </p>
          </div>
        )}

        {/* ---------------------------- header ---------------------------- */}
        <PageShell
          bodyClassName={cn(
            "overflow-y-auto",
            view === "matrix" && "sm:overflow-hidden",
          )}
          toolbar={
            <div className="space-y-3 pb-3">
              <section className="glass rounded-xl border border-border/60 p-2.5">
                <div className="flex flex-wrap gap-1.5" data-testid="coverage-strip">
            <button
              type="button"
              onClick={applyRequired}
              aria-pressed={requiredFilterActive}
              data-testid="coverage-required"
              className={cn(
                "flex w-40 shrink-0 flex-col justify-center rounded-lg border px-2.5 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                requiredFilterActive
                  ? "border-primary/60 bg-primary/15"
                  : "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10",
              )}
            >
              <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Required files
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {model.overall.expected > 0
                  ? `${model.overall.uploaded} of ${model.overall.expected}`
                  : "No required files"}
              </span>
              <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary transition-[width]"
                  style={{
                    width: `${
                      model.overall.expected > 0
                        ? Math.round((model.overall.uploaded / model.overall.expected) * 100)
                        : 0
                    }%`,
                  }}
                />
              </span>
            </button>
            {model.coverage.map((item) => {
              const active = docF === item.key && stateF !== "";
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => applyCoverage(item.key, item.required)}
                  aria-pressed={active}
                  data-testid={`coverage-${item.key}`}
                  className={cn(
                    "flex w-40 shrink-0 flex-col justify-center rounded-lg border px-2.5 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active
                      ? "border-primary/60 bg-primary/10"
                      : "border-border/60 bg-background/60 hover:border-primary/40 hover:bg-primary/5",
                  )}
                  data-tip={`${item.label} · show the facilities missing this document`}
                >
                  <span className="w-full truncate text-[11px] font-semibold">
                    {SHORT_LABEL[item.key] ?? item.label}
                  </span>
                  <span className="w-full truncate text-[10.5px] tabular-nums text-muted-foreground">
                    {item.required
                      ? `${item.uploadedInExpected} of ${item.expected}`
                      : `${item.uploaded} of ${facilities.length}`}
                  </span>
                  <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        item.required ? "bg-primary" : "bg-muted-foreground/40",
                      )}
                      style={{ width: `${item.pct}%` }}
                    />
                  </span>
                </button>
              );
            })}
                </div>
              </section>

              <UniversalFilterBar
                pageKey="documents.library"
                fields={fields}
                value={bar}
                onChange={setBar}
                summary={
                  stateF === "missing" || stateF === "required_missing"
                    ? `${model.matrixFacilities.length} facilities · ${model.fileRows.length} missing`
                    : `${model.matrixFacilities.length} facilities · ${
                        view === "files" ? model.fileRows.length : model.matrixDocs.length
                      } files`
                }
                onResetDefault={clearSearchAndFilters}
                menuExtra={
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/60">
                    <input
                      type="checkbox"
                      checked={includeVersions}
                      onChange={(event) => setIncludeVersions(event.target.checked)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    Include previous versions
                  </label>
                }
                leading={
                  <div className="relative w-full min-w-0 sm:w-64">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search facility, NIN or file name"
                      aria-label="Search documents"
                      className="h-9 pl-9 text-[13px]"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        aria-label="Clear search"
                        className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                }
                trailing={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        openPreview(Array.from(event.target.files ?? []));
                        event.target.value = "";
                      }}
                    />
                    {readerEnabled && canEdit && readSelected.size > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 gap-1.5 bg-teal-700 text-xs text-white hover:bg-teal-800"
                        onClick={() => openRead(Array.from(readSelected))}
                      >
                        <ScanText className="size-3.5" /> Read selected ({readSelected.size})
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 gap-1.5 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <UploadCloud className="size-3.5" /> Add files
                      </Button>
                    )}
                    <div
                      className="flex items-center gap-0.5 rounded-lg border border-border/70 p-0.5"
                      role="tablist"
                      aria-label="Document view"
                    >
                      {(["matrix", "files"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          role="tab"
                          aria-selected={view === mode}
                          onClick={() => setView(mode)}
                          className={cn(
                            "inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium capitalize transition-colors",
                            view === mode
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {mode === "matrix" ? (
                            <LayoutGrid className="size-3.5" />
                          ) : (
                            <List className="size-3.5" />
                          )}
                          {mode}
                        </button>
                      ))}
                    </div>
                    <div
                      className="flex items-center gap-0.5 rounded-lg border border-border/70 p-0.5"
                      role="tablist"
                      aria-label="Document cycle"
                    >
                      {CYCLE_MODES.map((mode) => (
                        <button
                          key={mode.value}
                          type="button"
                          role="tab"
                          aria-selected={cycleMode === mode.value}
                          onClick={() => setCycleMode(mode.value)}
                          className={cn(
                            "inline-flex h-8 items-center rounded-md px-2 text-[11px] font-medium whitespace-nowrap transition-colors",
                            cycleMode === mode.value
                              ? "bg-slate-900 text-white"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                    <ZipDownloadControl
                      files={model.zipDocs.length}
                      blocks={blocks}
                      blockCounts={model.zipByBlock}
                      facilities={facilities}
                      facilityCounts={model.zipByFacility}
                      documents={model.zipDocs}
                      blockDocuments={model.zipDocsAnyBlock}
                      onShowFiles={() => setView("files")}
                      filters={{
                        block: blockF || undefined,
                        facilityType: typeF || undefined,
                        docKey: docF || undefined,
                        cycleNo:
                          cycleMode !== "all" && cycleMode !== "current"
                            ? Number(cycleMode)
                            : undefined,
                        uploadDate: dateF || undefined,
                        uploadedBy: byF || undefined,
                        search: search.trim() || undefined,
                      }}
                      includeVersions={includeVersions}
                    />
                  </div>
                }
              />
            </div>
          }
          footer={
            <p className="border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
              {DOCUMENT_TOTAL} document types · counts use Admin → Documents rules. Files the nightly check
              could not find in Drive are shown in red and never counted as uploaded.
            </p>
          }
        >

        {/* ---------------------------- matrix ---------------------------- */}
        {!result ? (
          <div className="space-y-2" aria-label="Loading documents">
            <Skeleton className="h-9 w-full" />
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2">
                <Skeleton className="h-11 w-[260px] shrink-0" />
                {Array.from({ length: 6 }).map((__, cell) => (
                  <Skeleton key={cell} className="h-9 flex-1" />
                ))}
              </div>
            ))}
          </div>
        ) : facilities.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No facilities are in your scope.
          </p>
        ) : view === "matrix" ? (
          <>
            {/* Desktop matrix: frozen Facility, sticky header, virtual rows. */}
            <section className="glass hidden h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 sm:flex">
              <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border/50 px-3 py-1.5 text-[10.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-flex size-4 items-center justify-center rounded border border-emerald-300 bg-emerald-50 text-emerald-700">
                    <Check className="size-3" />
                  </span>
                  Uploaded
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-flex size-4 items-center justify-center rounded border border-amber-300 bg-amber-50 text-amber-700">
                    <AlertTriangle className="size-3" />
                  </span>
                  Required
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-flex size-4 items-center justify-center rounded border border-dashed border-border bg-background text-muted-foreground">
                    -
                  </span>
                  Not required
                </span>
              </div>
              <div ref={matrixScrollRef} className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[980px] border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="sticky top-0 left-0 z-30 w-[260px] min-w-[260px] border-r border-b border-border/60 bg-card px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        Facility
                      </th>
                      {definitions.map((definition) => (
                        <th
                          key={definition.key}
                          className="sticky top-0 z-20 border-b border-border/60 bg-card px-1 py-2 text-center text-[11px] font-semibold whitespace-nowrap"
                          data-tip={definition.label}
                        >
                          {SHORT_LABEL[definition.key] ?? definition.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixVirtualRows.length > 0 && matrixPadTop > 0 && (
                      <tr aria-hidden="true">
                        <td colSpan={definitions.length + 1} style={{ height: matrixPadTop }} />
                      </tr>
                    )}
                    {matrixVirtualRows.map((virtualRow) => {
                      const facility = model.matrixFacilities[virtualRow.index];
                      if (!facility) return null;
                      const requirement = model.requirements.get(facility.id) ?? {};
                      return (
                        <tr
                          key={facility.id}
                          className="h-12 border-b border-border/40 last:border-0 hover:bg-muted/20"
                          data-testid="document-library-row"
                        >
                          <td className="sticky left-0 z-10 h-12 w-[260px] min-w-[260px] border-r border-border/40 bg-background px-2 py-0">
                            <FacilityCell
                              facility={{
                                _id: facility.id,
                                name: facility.name,
                                facilityType: facility.facilityType,
                                block: facility.block,
                                phc: facility.phc,
                                ninNumber: facility.nin,
                              }}
                              query={search}
                            />
                          </td>
                          {definitions.map((definition) => {
                            const required = !!requirement[definition.key]?.required;
                            const targets = cellTargets(facility, definition.key);
                            return (
                              <td key={definition.key} className="h-12 px-1 py-0 text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  {targets.length === 0 || !targets[0].available ? (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  ) : (
                                    targets.map((target) => {
                                      const cellKey = `${facility.id}:${definition.key}:${target.cycleNo ?? ""}`;
                                      const doc = target.doc;
                                      return (
                                        <MatrixCell
                                          key={cellKey}
                                          label={definition.label}
                                          doc={doc}
                                          broken={target.broken}
                                          required={required}
                                          canEdit={canEdit}
                                          busy={cellBusyKey === cellKey}
                                          cycleLabel={
                                            target.compact && target.cycleNo != null
                                              ? `C${target.cycleNo}`
                                              : target.cycleNo != null &&
                                                  target.cycleNo !== facility.cycleNo
                                                ? `C${target.cycleNo}`
                                                : undefined
                                          }
                                          compact={target.compact}
                                          onOpen={() =>
                                            setDetailCell({
                                              facilityId: facility.id,
                                              docKey: definition.key,
                                              cycleNo: target.cycleNo ?? undefined,
                                            })
                                          }
                                          onUpload={() =>
                                            setUploadCell({
                                              facilityId: facility.id,
                                              docKey: definition.key,
                                              cycleNo: target.cycleNo ?? undefined,
                                            })
                                          }
                                          onDropFile={(file) =>
                                            void uploadToCell(
                                              facility,
                                              definition.key,
                                              file,
                                              target.cycleNo ?? undefined,
                                            )
                                          }
                                          readerEnabled={readerEnabled}
                                          onRead={
                                            readerEnabled && doc && doc.docKey === "NQAS_Result"
                                              ? () => openRead([doc.id], facility.id)
                                              : undefined
                                          }
                                        />
                                      );
                                    })
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {matrixVirtualRows.length > 0 && matrixPadBottom > 0 && (
                      <tr aria-hidden="true">
                        <td colSpan={definitions.length + 1} style={{ height: matrixPadBottom }} />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {model.matrixFacilities.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No facilities match these filters.
                </p>
              )}
            </section>

            {/* Mobile matrix: one card per facility, six doc tiles. */}
            <section className="space-y-2 sm:hidden">
              {model.matrixFacilities.map((facility) => {
                const files = model.present.get(facility.id);
                const brokenFiles = model.broken.get(facility.id);
                const requirement = model.requirements.get(facility.id) ?? {};
                return (
                  <div
                    key={facility.id}
                    className="glass rounded-xl border border-border/60 p-2.5"
                    data-testid="document-library-card"
                  >
                    <Link
                      to={`/facilities/${facility.id}`}
                      className="block truncate text-[13px] font-semibold text-primary"
                    >
                      {facility.name}
                    </Link>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {facility.block} · {facility.phc || "-"} · {facility.facilityType} ·{" "}
                      {facility.nin?.trim() || "-"}
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {definitions.map((definition) => {
                        const doc = files?.get(definition.key) ?? null;
                        const brokenDoc = brokenFiles?.get(definition.key) ?? null;
                        const required = !!requirement[definition.key]?.required;
                        const cycleNo =
                          cycleMode === "1" || cycleMode === "2"
                            ? Number(cycleMode)
                            : facility.cycleNo;
                        const applicable =
                          isFacilityDocument(definition.key) ||
                          cycleMode === "all" ||
                          cycleMode === "current" ||
                          facility.cycles.includes(cycleNo);
                        if (!applicable) {
                          return (
                            <div
                              key={definition.key}
                              className="flex h-11 flex-col items-start justify-center rounded-lg border border-dashed border-border/70 px-1.5 text-muted-foreground"
                            >
                              <span className="w-full truncate text-[10px] font-semibold">
                                {SHORT_LABEL[definition.key] ?? definition.label}
                              </span>
                              <span className="text-[10px]">-</span>
                            </div>
                          );
                        }
                        const state = doc ? "present" : brokenDoc ? "broken" : required ? "required" : "missing";
                        return (
                          <button
                            key={definition.key}
                            type="button"
                            onClick={() =>
                              doc || brokenDoc
                                ? setDetailCell({
                                    facilityId: facility.id,
                                    docKey: definition.key,
                                    cycleNo: isFacilityDocument(definition.key)
                                      ? undefined
                                      : cycleNo,
                                  })
                                : setUploadCell({
                                    facilityId: facility.id,
                                    docKey: definition.key,
                                    cycleNo: isFacilityDocument(definition.key)
                                      ? undefined
                                      : cycleNo,
                                  })
                            }
                            className={cn(
                              "flex h-11 flex-col items-start justify-center rounded-lg border px-1.5 text-left",
                              state === "present"
                                ? "border-emerald-300/70 bg-emerald-50 text-emerald-900"
                                : state === "broken"
                                  ? "border-red-300/70 bg-red-50 text-red-900"
                                  : state === "required"
                                    ? "border-amber-300/70 bg-amber-50 text-amber-900"
                                    : "border-dashed border-border/70 bg-background text-muted-foreground",
                            )}
                          >
                            <span className="w-full truncate text-[10px] font-semibold">
                              {SHORT_LABEL[definition.key] ?? definition.label}
                            </span>
                            <span className="flex items-center gap-1 text-[10px]">
                              {state === "present" ? (
                                <>
                                  <Check className="size-3" /> {doc && doc.size > 0 ? formatFileSize(doc.size) : "-"}
                                </>
                              ) : state === "broken" ? (
                                <>
                                  <AlertTriangle className="size-3" /> File missing
                                </>
                              ) : state === "required" ? (
                                <>
                                  <AlertTriangle className="size-3" /> Required
                                </>
                              ) : (
                                "-"
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          </>
        ) : (
          /* ---------------------------- files ---------------------------- */
          <>
            <section className="glass hidden h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 sm:flex">
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[900px] border-collapse text-[13px]">
                  <thead>
                    <tr>
                      {["Document", "Cycle", "File name", "Size", "Uploaded", "Open", "Download"].map(
                        (label) => (
                          <th
                            key={label}
                            className={cn(
                              "sticky top-0 z-20 border-b border-border/60 bg-card px-2 py-2 text-[11px] font-semibold whitespace-nowrap",
                              label === "Open" || label === "Download"
                                ? "text-right"
                                : "text-left",
                              label === "Document" && "left-0 z-30 border-r",
                            )}
                          >
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {model.fileRows.map((row, index) => {
                      const previous = model.fileRows[index - 1];
                      const newGroup = !previous || previous.facility.id !== row.facility.id;
                      const url = row.kind === "file" ? inlineUrls[row.doc.id] : null;
                      const download = row.kind === "file" ? downloadUrls[row.doc.id] : null;
                      return (
                        <FileRows
                          key={row.key}
                          row={row}
                          newGroup={newGroup}
                          groupCount={groupCounts.get(row.facility.id) ?? 0}
                          url={url}
                          download={download}
                          canEdit={canEdit}
                          onUpload={() =>
                            row.kind === "missing" &&
                            setUploadCell({
                              facilityId: row.facility.id,
                              docKey: row.definition.key,
                            })
                          }
                          onRead={() => {
                            if (row.kind === "file") openRead([row.doc.id]);
                          }}
                          readSelected={
                            row.kind === "file" && readSelected.has(row.doc.id)
                          }
                          onToggleRead={() => {
                            if (row.kind !== "file") return;
                            setReadSelected((current) => {
                              const next = new Set(current);
                              if (next.has(row.doc.id)) next.delete(row.doc.id);
                              else next.add(row.doc.id);
                              return next;
                            });
                          }}
                          readerEnabled={readerEnabled}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {model.fileRows.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No documents match these filters.
                </p>
              )}
            </section>

            <section className="space-y-2 sm:hidden">
              {model.fileRows.map((row, index) => {
                const previous = model.fileRows[index - 1];
                const newGroup = !previous || previous.facility.id !== row.facility.id;
                return (
                  <div key={row.key}>
                    {newGroup && (
                      <p className="mb-1 px-1 text-[11px] font-semibold">
                        {row.facility.name}
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          {groupCounts.get(row.facility.id) ?? 0} files
                        </span>
                      </p>
                    )}
                    <div className="glass rounded-xl border border-border/60 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-semibold">
                            {row.kind === "file" ? row.doc.docLabel : row.definition.label}
                            {readerEnabled && row.kind === "file" && row.doc.docKey === "NQAS_Result" && (
                              <span
                                className={cn(
                                  "ml-1.5 rounded-full border px-1.5 text-[10px] font-medium whitespace-nowrap",
                                  row.doc.resultReadAt
                                    ? "border-teal-300/70 bg-teal-50 text-teal-900"
                                    : "border-amber-300/70 bg-amber-50 text-amber-900",
                                )}
                              >
                                {row.doc.resultReadAt
                                  ? `Read ${
                                      row.doc.resultCertifiedDate
                                        ? resultDisplayDate(row.doc.resultCertifiedDate)
                                        : stampIst(row.doc.resultReadAt)
                                    }`
                                  : "Not read"}
                              </span>
                            )}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {row.kind === "file" ? row.doc.displayName : "No file uploaded"}
                            {row.kind === "file" ? ` · ${formatFileSize(row.doc.size)}` : ""}
                          </p>
                        </div>
                        {row.kind === "file" ? (
                          <span className="shrink-0 text-[10.5px] text-muted-foreground">
                            Cycle {isFacilityDocument(row.doc.docKey) ? "-" : row.doc.cycleNo}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full border border-amber-300/70 bg-amber-50 px-1.5 text-[10px] font-medium text-amber-900">
                            {row.required ? "Required" : "Missing"}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {row.kind === "file" ? (
                          <>
                            {readerEnabled && row.doc.docKey === "NQAS_Result" && canEdit && (
                              <label className="inline-flex min-h-9 items-center gap-1 rounded-md border border-input bg-background px-2 text-[11px]">
                                <input
                                  type="checkbox"
                                  checked={readSelected.has(row.doc.id)}
                                  onChange={() =>
                                    setReadSelected((current) => {
                                      const next = new Set(current);
                                      if (next.has(row.doc.id)) next.delete(row.doc.id);
                                      else next.add(row.doc.id);
                                      return next;
                                    })
                                  }
                                  className="size-3.5 accent-[var(--primary)]"
                                />
                                Select
                              </label>
                            )}
                            {readerEnabled && row.doc.docKey === "NQAS_Result" && canEdit && (
                              <button
                                type="button"
                                onClick={() => openRead([row.doc.id])}
                                className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md border border-teal-600/50 bg-teal-50 text-[11px] font-semibold text-teal-900"
                              >
                                <ScanText className="size-3" /> Read result
                              </button>
                            )}
                            <a
                              href={inlineUrls[row.doc.id]}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-disabled={!inlineUrls[row.doc.id]}
                              className={cn(
                                "inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md border border-input bg-background text-[11px] font-medium",
                                !inlineUrls[row.doc.id] && "pointer-events-none opacity-50",
                              )}
                            >
                              <ExternalLink className="size-3" /> Open
                            </a>
                            <a
                              href={downloadUrls[row.doc.id]}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-disabled={!downloadUrls[row.doc.id]}
                              className={cn(
                                "inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md border border-input bg-background text-[11px] font-medium",
                                !downloadUrls[row.doc.id] && "pointer-events-none opacity-50",
                              )}
                            >
                              <Download className="size-3" /> Download
                            </a>
                          </>
                        ) : canEdit ? (
                          <button
                            type="button"
                            onClick={() =>
                              setUploadCell({
                                facilityId: row.facility.id,
                                docKey: row.definition.key,
                              })
                            }
                            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md bg-primary text-[11px] font-semibold text-primary-foreground"
                          >
                            <UploadCloud className="size-3" /> Upload
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">View only</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {model.fileRows.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No documents match these filters.
                </p>
              )}
            </section>
          </>
        )}

        </PageShell>

        {/* ------------------------- document detail ------------------------- */}
        <Dialog open={!!detailCell} onOpenChange={(open) => !open && setDetailCell(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {definitions.find((d) => d.key === detailCell?.docKey)?.label ?? "Document"}
              </DialogTitle>
              <DialogDescription>
                {detailFacility
                  ? `${detailFacility.name} · ${detailFacility.facilityType} · ${detailFacility.block}`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            {detailDoc ? (
              <div className="space-y-2 text-[13px]">
                <p className="font-medium break-words">{detailDoc.displayName}</p>
                <p className="text-[11.5px] text-muted-foreground">
                  Cycle {isFacilityDocument(detailDoc.docKey) ? "-" : detailDoc.cycleNo} · {formatFileSize(detailDoc.size)} · uploaded{" "}
                  {stamp(detailDoc.uploadedAt)} by {detailDoc.uploadedByName}
                  {detailDoc.versionNo > 1 ? ` · version ${detailDoc.versionNo}` : ""}
                </p>
                {detailDoc.missingInDrive && (
                  <p className="flex items-start gap-1.5 rounded-md border border-red-300/70 bg-red-50 p-2 text-[11.5px] font-medium text-red-900">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    The nightly check could not find this file in Drive. Upload a new copy.
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {!detailDoc.missingInDrive && (
                    <>
                      <a
                        href={inlineUrls[detailDoc.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-disabled={!inlineUrls[detailDoc.id]}
                        className={cn(
                          "inline-flex min-h-9 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium hover:bg-accent",
                          !inlineUrls[detailDoc.id] && "pointer-events-none opacity-50",
                        )}
                      >
                        <ExternalLink className="size-3.5" /> Open
                      </a>
                      <a
                        href={downloadUrls[detailDoc.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-disabled={!downloadUrls[detailDoc.id]}
                        className={cn(
                          "inline-flex min-h-9 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium hover:bg-accent",
                          !downloadUrls[detailDoc.id] && "pointer-events-none opacity-50",
                        )}
                      >
                        <Download className="size-3.5" /> Download
                      </a>
                    </>
                  )}
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        setUploadCell(detailCell);
                        setDetailCell(null);
                      }}
                    >
                      <UploadCloud className="size-3.5" /> Upload a new copy
                    </Button>
                  )}
                </div>
                {readerEnabled && detailDoc.docKey === "NQAS_Result" && canEdit && (
                  <div className="flex flex-wrap items-end justify-between gap-2 rounded-md border border-border/60 bg-muted/20 p-2">
                    <ResultReadStatusLine documentId={detailDoc.id} />
                    <ResultReadButton
                      documentId={detailDoc.id}
                      facilityId={detailDoc.facilityId}
                      size="xs"
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No file information is available.</p>
            )}
          </DialogContent>
        </Dialog>

        {/* ------------------------- single uploader ------------------------- */}
        <Dialog open={!!uploadCell} onOpenChange={(open) => !open && setUploadCell(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Upload {definitions.find((d) => d.key === uploadCell?.docKey)?.label ?? "document"}
              </DialogTitle>
              <DialogDescription>
                {uploadFacility
                  ? `${uploadFacility.name} · ${uploadFacility.facilityType} · ${uploadFacility.block} · ${
                      uploadCell && isFacilityDocument(uploadCell.docKey)
                        ? "Facility document"
                        : `Cycle ${uploadCell?.cycleNo ?? uploadFacility.cycleNo}`
                    }`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            {uploadCell && (
              <DocumentSlot
                facilityId={uploadCell.facilityId}
                docKey={uploadCell.docKey}
                cycleNo={uploadCell.cycleNo}
                lockCycle
                canEdit={canEdit}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* ------------------------- bulk drop preview ------------------------- */}
        <DropPreviewDialog
          preview={preview}
          onClose={() => setPreview(null)}
          onDone={(message) => toast.success(message)}
        />

        {/* ONE shared preview for one file or a multi-selection. */}
        <LazyResultReadDialog
          open={readerEnabled && readIds !== null}
          onOpenChange={(next) => {
            if (!next) {
              setReadIds(null);
              setReadFacilityId(null);
            }
          }}
          documentIds={readIds ?? []}
          facilityId={readFacilityId}
          onApplied={() => {
            setReadSelected(new Set());
            setReadIds(null);
            setReadFacilityId(null);
          }}
        />
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Matrix cell                                                                */
/* -------------------------------------------------------------------------- */

function MatrixCell({
  label,
  doc,
  broken,
  required,
  canEdit,
  busy,
  onOpen,
  onUpload,
  onDropFile,
  onRead,
  readerEnabled,
  cycleLabel,
  compact,
}: {
  label: string;
  doc: LibraryDoc | null;
  broken: LibraryDoc | null;
  required: boolean;
  canEdit: boolean;
  busy: boolean;
  cycleLabel?: string;
  compact?: boolean;
  onOpen: () => void;
  onUpload: () => void;
  onDropFile: (file: File) => void;
  onRead?: () => void;
  readerEnabled: boolean;
}) {
  const [over, setOver] = useState(false);
  const dropProps = canEdit
    ? {
        onDragEnter: (event: DragEvent) => {
          if (!event.dataTransfer?.types?.includes("Files")) return;
          event.preventDefault();
          event.stopPropagation();
          setOver(true);
        },
        onDragOver: (event: DragEvent) => {
          if (!event.dataTransfer?.types?.includes("Files")) return;
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "copy";
        },
        onDragLeave: (event: DragEvent) => {
          event.stopPropagation();
          setOver(false);
        },
        onDrop: (event: DragEvent) => {
          event.preventDefault();
          event.stopPropagation();
          setOver(false);
          const file = event.dataTransfer?.files?.[0];
          if (file) onDropFile(file);
        },
      }
    : {};
  const base = cn(
    "inline-flex min-h-8 w-full items-center justify-center gap-1 rounded-md border px-1 text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    compact && "min-h-7 w-auto min-w-8 px-1",
    over && "ring-2 ring-primary ring-offset-1",
  );
  const title = cycleLabel ? `${cycleLabel} · ${label}` : label;

  if (busy) {
    return (
      <span className={cn(base, "border-primary/50 bg-primary/5 text-primary")}>
        <Loader2 className="size-3.5 animate-spin" /> Uploading
      </span>
    );
  }
  if (doc) {
    return (
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${title}: uploaded — open or download`}
          data-tip={`${title}: uploaded ${stamp(doc.uploadedAt)} — tap to open or download`}
          className={cn(base, "min-w-0 flex-1 border-emerald-300/70 bg-emerald-50 text-emerald-800 hover:bg-emerald-100")}
          {...dropProps}
        >
          <Check className="size-3.5 shrink-0" />
          <span className="flex min-w-0 flex-col items-center leading-tight">
            {cycleLabel && !readerEnabled && (
              <span className="text-[8.5px] font-semibold">{cycleLabel}</span>
            )}
            <span className="truncate tabular-nums">
              {compact ? cycleLabel : doc.size > 0 ? formatFileSize(doc.size) : "-"}
            </span>
            {!compact && readerEnabled && doc.docKey === "NQAS_Result" && (
              <span
                className={cn(
                  "w-full truncate text-[8.5px] font-semibold",
                  doc.resultReadAt ? "text-teal-800" : "text-amber-800",
                )}
              >
                {doc.resultReadAt
                  ? `Read ${
                      doc.resultCertifiedDate
                        ? resultDisplayDate(doc.resultCertifiedDate)
                        : stampIst(doc.resultReadAt)
                    }`
                  : "Not read"}
              </span>
            )}
          </span>
        </button>
        {onRead && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`More actions for ${label}`}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded border border-border/60 bg-background text-muted-foreground hover:bg-muted"
              >
                <Ellipsis className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRead}>
                <ScanText className="mr-1.5 size-3.5" /> Read result
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpen}>Preview / download</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }
  if (broken) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${title}: file missing in Drive`}
        data-tip={`${title}: the file is missing in Drive — tap for details`}
        className={cn(base, "border-red-300/70 bg-red-50 text-red-800 hover:bg-red-100")}
        {...dropProps}
      >
        <AlertTriangle className="size-3.5 shrink-0" /> {compact ? cycleLabel : "Missing"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onUpload}
      aria-label={`${title}: ${required ? "required and missing" : "not required"} — upload`}
      data-tip={`${title}: ${required ? "required and missing" : "not required"} — tap to upload or drop a file`}
      className={cn(
        base,
        required
          ? "border-amber-300/80 bg-amber-50 text-amber-900 hover:bg-amber-100"
          : "border-dashed border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary",
      )}
      {...dropProps}
    >
      {required ? (
        <>
          <AlertTriangle className="size-3.5 shrink-0" /> {compact ? cycleLabel : "Required"}
        </>
      ) : (
        (compact ? cycleLabel : "-")
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Files rows                                                                 */
/* -------------------------------------------------------------------------- */

function FileRows({
  row,
  newGroup,
  groupCount,
  url,
  download,
  canEdit,
  onUpload,
  onRead,
  readSelected,
  onToggleRead,
  readerEnabled,
}: {
  row: FileRow;
  newGroup: boolean;
  groupCount: number;
  url: string | null;
  download: string | null;
  canEdit: boolean;
  onUpload: () => void;
  onRead: () => void;
  readSelected: boolean;
  onToggleRead: () => void;
  readerEnabled: boolean;
}) {
  return (
    <>
      {newGroup && (
        <tr className="border-b border-border/50 bg-muted/40">
          <td colSpan={7} className="sticky left-0 bg-muted px-2 py-1">
            <div className="flex items-center gap-2">
              <FacilityCell facility={row.facility} compact />
              <span className="ml-auto text-[10.5px] font-normal whitespace-nowrap text-muted-foreground">
                {groupCount} file{groupCount === 1 ? "" : "s"}
              </span>
            </div>
          </td>
        </tr>
      )}
      <tr className="border-b border-border/40 last:border-0 hover:bg-muted/20" data-testid="document-library-row">
        <td className="bg-background px-2 py-1.5 text-[12.5px] sm:sticky sm:left-0 sm:z-10">
          <div className="flex items-center gap-1.5">
            {readerEnabled &&
              row.kind === "file" &&
              row.doc.docKey === "NQAS_Result" &&
              row.doc.isCurrent &&
              canEdit && (
                <input
                  type="checkbox"
                  checked={readSelected}
                  onChange={onToggleRead}
                  aria-label={`Select ${row.doc.displayName} for reading`}
                  className="size-3.5 shrink-0 accent-[var(--primary)]"
                />
              )}
            <div className="min-w-0">
              <span>{row.kind === "file" ? row.doc.docLabel : row.definition.label}</span>
              {readerEnabled && row.kind === "file" && row.doc.docKey === "NQAS_Result" && (
                <span
                  className={cn(
                    "ml-1.5 rounded-full border px-1.5 text-[10px] font-medium whitespace-nowrap",
                    row.doc.resultReadAt
                      ? "border-teal-300/70 bg-teal-50 text-teal-900"
                      : "border-amber-300/70 bg-amber-50 text-amber-900",
                  )}
                >
                  {row.doc.resultReadAt
                    ? `Read ${
                        row.doc.resultCertifiedDate
                          ? resultDisplayDate(row.doc.resultCertifiedDate)
                          : stampIst(row.doc.resultReadAt)
                      }`
                    : "Not read"}
                </span>
              )}
              {row.kind === "missing" && (
                <span
                  className={cn(
                    "ml-1.5 rounded-full border px-1.5 text-[10px] font-medium",
                    row.required
                      ? "border-amber-300/70 bg-amber-50 text-amber-900"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {row.required ? "Required" : "Missing"}
                </span>
              )}
            </div>
            {readerEnabled && row.kind === "file" && row.doc.docKey === "NQAS_Result" && canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`More actions for ${row.doc.docLabel}`}
                    className="ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded border border-transparent text-muted-foreground hover:border-border hover:bg-muted"
                  >
                    <Ellipsis className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onRead}>
                    <ScanText className="mr-1.5 size-3.5" /> Read result
                  </DropdownMenuItem>
                  {url && (
                    <DropdownMenuItem asChild>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1.5 size-3.5" /> Preview
                      </a>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </td>
        <td className="px-2 py-1.5 text-[12px] tabular-nums">
          {row.kind === "file"
            ? isFacilityDocument(row.doc.docKey)
              ? "-"
              : row.doc.cycleNo
            : row.facility.cycleNo}
        </td>
        <td className="max-w-[24rem] px-2 py-1.5">
          {row.kind === "file" ? (
            <span className="block truncate text-[12px]" data-tip={row.doc.displayName}>
              {row.doc.displayName}
            </span>
          ) : (
            <span className="text-[12px] text-muted-foreground">No file uploaded</span>
          )}
        </td>
        <td className="px-2 py-1.5 text-[12px] tabular-nums text-muted-foreground">
          {row.kind === "file" ? formatFileSize(row.doc.size) : "—"}
        </td>
        <td className="px-2 py-1.5 text-[12px]">
          {row.kind === "file" ? (
            <span className="whitespace-nowrap">
              {stamp(row.doc.uploadedAt)} · {row.doc.uploadedByName}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-2 py-1.5 text-right">
          {row.kind === "file" ? (
            <a
              href={url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!url}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent",
                !url && "pointer-events-none opacity-50",
              )}
            >
              <ExternalLink className="size-3" /> Open
            </a>
          ) : canEdit ? (
            <button
              type="button"
              onClick={onUpload}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90"
            >
              <UploadCloud className="size-3" /> Upload
            </button>
          ) : (
            <span className="text-[11px] text-muted-foreground">View only</span>
          )}
        </td>
        <td className="px-2 py-1.5 text-right">
          {row.kind === "file" ? (
            <a
              href={download ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!download}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent",
                !download && "pointer-events-none opacity-50",
              )}
            >
              <Download className="size-3" /> Download
            </a>
          ) : (
            <span className="text-[11px] text-muted-foreground">—</span>
          )}
        </td>
      </tr>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* ZIP: one split button, three scopes                                        */
/* -------------------------------------------------------------------------- */

type ExportFilters = {
  block?: string;
  facilityType?: string;
  docKey?: string;
  cycleNo?: number;
  uploadDate?: string;
  uploadedBy?: string;
  search?: string;
};

function ZipDownloadControl({
  files,
  blocks,
  blockCounts,
  facilities,
  facilityCounts,
  documents,
  blockDocuments,
  onShowFiles,
}: {
  files: number;
  blocks: string[];
  blockCounts: Map<string, number>;
  facilities: Facility[];
  facilityCounts: Map<string, number>;
  documents: LibraryDoc[];
  blockDocuments: LibraryDoc[];
  filters: ExportFilters;
  includeVersions: boolean;
  onShowFiles: () => void;
}) {
  const convex = useConvex();
  const logFailure = useMutation(api.documentLibrary.logBrowserZipFailure);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [parts, setParts] = useState<ZipPart[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeRetry, setNoticeRetry] = useState(false);
  const [lastScope, setLastScope] = useState<{ block?: string; facilityId?: string }>({});

  const downloadPart = (part: ZipPart) => {
    const href = URL.createObjectURL(part.blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = part.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
  };

  /** Build the archive in this browser. Every file goes through the same
   *  signed app route as a single download; the URL is never shown or logged. */
  const start = async (scope: { block?: string; facilityId?: string }) => {
    if (busy) return;
    setLastScope(scope);
    setPickerOpen(false);
    setNotice(null);
    setNoticeRetry(false);
    setParts([]);
    const facilityById = new Map(facilities.map((facility) => [facility.id, facility]));
    const pool = scope.facilityId || scope.block ? blockDocuments : documents;
    const selected = pool.filter((doc) => {
      const facility = facilityById.get(doc.facilityId);
      if (!facility) return false;
      if (scope.facilityId) return facility.id === scope.facilityId;
      if (scope.block) return facility.block === scope.block;
      return true;
    });
    if (selected.length === 0) {
      toast.error("No files match this choice");
      return;
    }

    setBusy(true);
    setProgress({ done: 0, total: selected.length });
    try {
      let urls: Record<string, string> = {};
      try {
        urls = await getDocumentUrls(
          convex,
          selected.map((doc) => doc.id),
          "attachment",
        );
      } catch {
        /* every file below is reported as access denied */
      }

      let completed = 0;
      const results = await mapWithConcurrency(selected, 4, async (doc) => {
        try {
          const facility = facilityById.get(doc.facilityId);
          const url = urls[doc.id];
          let reason = "access denied";
          if (url && facility) {
            for (let attempt = 0; attempt < 2; attempt += 1) {
              try {
                const response = await fetch(url);
                if (!response.ok) {
                  reason = shortZipError(undefined, response.status);
                } else {
                  return {
                    ok: true as const,
                    source: {
                      block: facility.block,
                      facilityName: facility.name,
                      fileName: doc.originalName || doc.displayName,
                      mimeType: doc.mimeType,
                      data: new Uint8Array(await response.arrayBuffer()),
                    } satisfies ZipSourceFile,
                  };
                }
              } catch (error) {
                reason = shortZipError(error);
              }
              if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 400));
            }
          }
          return { ok: false as const, name: doc.originalName || doc.displayName, reason };
        } finally {
          /* Progress is updated per finished file, not by a timer. */
          completed += 1;
          setProgress({ done: completed, total: selected.length });
        }
      });

      const done = results.filter((result) => result.ok).length;

      const sources = results.flatMap((result) => (result.ok ? [result.source] : []));
      const failures = results.flatMap((result) => (result.ok ? [] : [result]));
      if (sources.length > 0) {
        const facility = scope.facilityId ? facilityById.get(scope.facilityId) : null;
        const baseName = facility?.name ?? (scope.block ? `Block ${scope.block}` : "Documents");
        const built = buildZipParts(sources, baseName);
        setParts(built);
        if (built.length === 1) downloadPart(built[0]);
        else toast.info(`${built.length} ZIP parts ready`, { description: "Download each part below" });
      }

      if (failures.length > 0) {
        const failedNames = failures.slice(0, 3).map((item) => `${item.name} (${item.reason})`).join(", ");
        setNotice(
          `${done} of ${selected.length} files added. ${failures.length} failed: ${failedNames}${
            failures.length > 3 ? ` +${failures.length - 3} more` : ""
          }`,
        );
        setNoticeRetry(true);
        try {
          await logFailure({
            total: selected.length,
            added: done,
            failures: failures.map((item) => ({ name: item.name, reason: item.reason })),
          });
        } catch {
          /* the download still stands when audit logging is unavailable */
        }
      } else {
        setNotice(`${done} file${done === 1 ? "" : "s"} added to the ZIP`);
      }
    } catch (error) {
      setNotice(shortZipError(error));
      setNoticeRetry(true);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {files} file{files === 1 ? "" : "s"}
      </span>
      <div className="flex items-stretch">
        <Button
          type="button"
          size="sm"
          onClick={() => void start({})}
          disabled={busy || files === 0}
          className="h-9 gap-1.5 rounded-r-none text-xs"
          data-testid="document-export-start"
          data-guide-target="documents-zip"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileArchive className="size-3.5" />}
          {busy ? "Building ZIP…" : "Download ZIP"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 rounded-l-none border-l-0 px-1.5"
              aria-label="Choose the ZIP scope"
              disabled={busy}
            >
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Download ZIP</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => void start({})}>
              This filter · {files} file{files === 1 ? "" : "s"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>One block</DropdownMenuLabel>
            {blocks.map((block) => (
              <DropdownMenuItem key={block} onClick={() => void start({ block })}>
                Block {block}
                <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                  {blockCounts.get(block) ?? 0}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPickerOpen(true)}>One facility…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {progress && (
        <span className="flex min-w-40 flex-col gap-0.5" data-testid="document-export-progress">
          <span className="block h-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }}
            />
          </span>
          <span className="text-[10px] text-muted-foreground">
            Preparing {progress.done} of {progress.total} files
          </span>
        </span>
      )}

      {parts.length > 1 && (
        <span className="flex flex-wrap items-center gap-1">
          {parts.map((part, index) => (
            <button
              key={`${part.name}-${index}`}
              type="button"
              onClick={() => downloadPart(part)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-300/70 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-100"
              data-testid="document-export-download"
            >
              <Download className="size-3" /> Part {index + 1} of {parts.length}
              <span className="text-emerald-800/70">{formatFileSize(part.blob.size)}</span>
            </button>
          ))}
        </span>
      )}

      {notice && (
        <div
          role="status"
          className="fixed right-4 bottom-20 z-50 flex max-w-sm items-start gap-2 rounded-lg border border-border/70 bg-card p-2.5 text-[11.5px] shadow-lg"
        >
          <p className="min-w-0 flex-1">
            {notice}
            {noticeRetry && (
              <button
                type="button"
                onClick={() => void start(lastScope)}
                className="ml-1 font-semibold text-primary underline underline-offset-2"
              >
                Retry
              </button>
            )}
            {noticeRetry && (
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  onShowFiles();
                }}
                className="ml-2 text-muted-foreground underline underline-offset-2"
              >
                Download the files separately
              </button>
            )}
          </p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss ZIP message"
            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download one facility</DialogTitle>
            <DialogDescription>
              The ZIP holds this facility&apos;s current files (and previous versions when the
              option is on).
            </DialogDescription>
          </DialogHeader>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search facility…"
            aria-label="Search facility for the ZIP"
            className="h-9 text-[13px]"
          />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {facilities
              .filter((facility) =>
                `${facility.name} ${facility.block} ${facility.phc}`
                  .toLowerCase()
                  .includes(query.trim().toLowerCase()),
              )
              .slice(0, 60)
              .map((facility) => (
                <button
                  key={facility.id}
                  type="button"
                  disabled={(facilityCounts.get(facility.id) ?? 0) === 0}
                  onClick={() => void start({ facilityId: facility.id })}
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5 text-left text-[12.5px] hover:bg-muted/60 disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{facility.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {facility.facilityType} · {facility.block} · {facility.phc}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {facilityCounts.get(facility.id) ?? 0} files
                  </span>
                </button>
              ))}
            {facilities.length === 0 && (
              <p className="p-3 text-center text-xs text-muted-foreground">
                No facilities match these filters.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bulk drop preview                                                          */
/* -------------------------------------------------------------------------- */

type RowState = "ready" | "uploading" | "done" | "error";

function DropPreviewDialog({
  preview,
  onClose,
  onDone,
}: {
  preview: { files: File[]; matches: DropMatch[] } | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const beginUpload = useAction(api.documents.beginUpload);
  const uploadChunk = useAction(api.documents.uploadChunk);
  const finalizeUpload = useAction(api.documents.finalizeUpload);
  const cancelUpload = useAction(api.documents.cancelUpload);
  const discardStagedResult = useAction(api.documents.discardStagedResult);
  const [states, setStates] = useState<Record<number, RowState>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [progress, setProgress] = useState<Record<number, { sent: number; total: number }>>({});
  const [uploadedIds, setUploadedIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setStates({});
    setErrors({});
    setProgress({});
    setUploadedIds([]);
    setUploading(false);
  }, [preview]);

  if (!preview) return null;
  const { files, matches } = preview;
  const matched = matches.filter(
    (match) => match.status === "matched" || match.status === "duplicate",
  );
  const duplicates = matches.filter((match) => match.status === "duplicate");
  const unmatched = matches.filter((match) => match.status === "unmatched");
  const wrongType = matches.filter((match) => match.status === "wrong-type");
  const needsDecision = matches.filter((match) => match.status === "needs-decision");
  const finished = matched.length > 0 && matched.every((match) => {
    const rowIndex = matches.indexOf(match);
    return states[rowIndex] === "done";
  });

  const actions: UploadActions = {
    begin: beginUpload,
    putChunk: uploadChunk,
    finalize: finalizeUpload,
    cancel: cancelUpload,
  };

  const run = async (only?: number[]) => {
    if (!only && duplicates.length > 0) {
      const ok = window.confirm(
        `${duplicates.length} file${duplicates.length === 1 ? "" : "s"} already exist. Replace ${
          duplicates.length === 1 ? "it" : "them"
        }?\n\nThe old file stays as a previous version.`,
      );
      if (!ok) return;
    }
    setUploading(true);
    let uploaded = 0;
    let failed = 0;
    const indexes = only ?? matches.map((_, index) => index);
    for (const index of indexes) {
      const match = matches[index];
      if (!match || !match.facilityId || !match.docKey) continue;
      if (match.status !== "matched" && match.status !== "duplicate") continue;
      setStates((current) => ({ ...current, [index]: "uploading" }));
      setErrors((current) => ({ ...current, [index]: "" }));
      try {
        const file = files[index];
        // The same client-side check the preview used, repeated on the real
        // File object (never trust a name alone).
        const invalid = validateDocumentFile(match.docKey, file);
        if (invalid) throw new Error(invalid);
        const transport = createUploadTransport(actions, match.facilityId);
        const result = await uploadDocument(
          {
            facilityId: match.facilityId,
            docKey: match.docKey,
            cycleNo: match.cycleNo ?? undefined,
            file,
            bytes: async () => new Uint8Array(await file.arrayBuffer()),
            uploadKey: uploadKeyFor(match.facilityId, match.docKey, file),
          },
          transport,
          (next) =>
            setProgress((current) => ({
              ...current,
              [index]: { sent: next.sent, total: next.total },
            })),
        );
        uploaded += 1;
        if (!result.duplicate) setUploadedIds((current) => [...current, result.documentId]);
        setStates((current) => ({ ...current, [index]: "done" }));
      } catch (error) {
        failed += 1;
        setStates((current) => ({ ...current, [index]: "error" }));
        setErrors((current) => ({
          ...current,
          [index]: friendlyUploadError(error),
        }));
      }
    }
    setUploading(false);
    if (uploaded > 0) {
      onDone(
        `${uploaded} file${uploaded === 1 ? "" : "s"} uploaded${
          failed > 0 ? ` · ${failed} failed` : ""
        }`,
      );
    } else if (failed > 0) {
      toast.error("No files were uploaded — see the reasons below");
    }
  };

  const undoUploads = async () => {
    let undone = 0;
    for (const documentId of uploadedIds) {
      try {
        await discardStagedResult({ documentId: documentId as never });
        undone += 1;
      } catch (error) {
        toast.error(friendlyUploadError(error));
      }
    }
    setUploadedIds([]);
    if (undone > 0) toast.success(`${undone} upload${undone === 1 ? "" : "s"} undone`);
  };

  const summary: { label: string; value: number; tone: string }[] = [
    { label: "Ready", value: matched.length - duplicates.length, tone: "text-emerald-800" },
    { label: "Duplicate", value: duplicates.length, tone: "text-amber-800" },
    { label: "Needs decision", value: needsDecision.length, tone: "text-amber-800" },
    { label: "Not matched", value: unmatched.length, tone: "text-muted-foreground" },
    { label: "Wrong type", value: wrongType.length, tone: "text-red-800" },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && !uploading && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload {matched.length} file{matched.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>
            Matched from the file name ({`{Facility} {Type} – {Document label}`}) or the NIN.
            Nothing is saved until you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-3 text-[12px]">
          {summary.map((item) => (
            <span key={item.label} className={cn("font-medium", item.tone)}>
              {item.label}: <span className="tabular-nums">{item.value}</span>
            </span>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/60">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-muted/70 text-[10.5px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">File</th>
                <th className="px-2 py-1.5 text-left font-medium">Facility · document</th>
                <th className="px-2 py-1.5 text-left font-medium">State</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match, index) => (
                <tr key={`${match.fileName}-${index}`} className="border-t border-border/40">
                  <td className="max-w-[16rem] px-2 py-1.5">
                    <span className="block truncate" data-tip={match.fileName}>
                      {match.fileName}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground">
                      {formatFileSize(match.size)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    {match.facilityName ? (
                      <>
                        <span className="block truncate font-medium">{match.facilityName}</span>
                        <span className="text-[10.5px] text-muted-foreground">
                          {match.docLabel ?? match.reason}
                          {match.cycleNo ? ` · Cycle ${match.cycleNo}` : ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">{match.reason}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5" aria-live="polite">
                    <DropStateBadge
                      match={match}
                      state={states[index]}
                      progress={progress[index]}
                    />
                    {progress[index]?.total && states[index] === "uploading" ? (
                      <span className="mt-0.5 block h-1 overflow-hidden rounded bg-muted">
                        <span
                          className="block h-full bg-primary transition-[width]"
                          style={{
                            width: `${Math.round(
                              (progress[index].sent / Math.max(1, progress[index].total)) * 100,
                            )}%`,
                          }}
                        />
                      </span>
                    ) : null}
                    {errors[index] && (
                      <span className="mt-0.5 block text-[10.5px] text-red-800">
                        {errors[index]}{" "}
                        <button
                          type="button"
                          className="font-semibold underline"
                          onClick={() => void run([index])}
                          disabled={uploading}
                        >
                          Retry
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            {unmatched.length + wrongType.length + needsDecision.length > 0
              ? "Files that are not ready are never uploaded."
              : duplicates.length > 0
                ? "Duplicates replace the current file; the old file is kept as a previous version."
                : "Every file is ready."}
          </p>
          <span className="flex gap-2">
            {uploadedIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void undoUploads()}
                disabled={uploading}
              >
                Undo uploads
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose} disabled={uploading}>
              {finished ? "Close" : "Cancel"}
            </Button>
            <Button
              size="sm"
              onClick={() => void run()}
              disabled={uploading || matched.length === 0 || finished}
              data-testid="drop-upload-confirm"
            >
              {uploading ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
              {uploading
                ? "Uploading…"
                : finished
                  ? "Done"
                  : `Upload ${matched.length} file${matched.length === 1 ? "" : "s"}`}
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DropStateBadge({
  match,
  state,
  progress,
}: {
  match: DropMatch;
  state?: RowState;
  progress?: { sent: number; total: number };
}) {
  if (state === "uploading")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-primary">
        <Loader2 className="size-3 animate-spin" />{" "}
        {progress?.total
          ? `${Math.round((progress.sent / progress.total) * 100)}%`
          : "Uploading…"}
      </span>
    );
  if (state === "done")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800">
        <Check className="size-3" /> Uploaded
      </span>
    );
  if (state === "error")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-red-800">
        <AlertTriangle className="size-3" /> Failed
      </span>
    );
  if (match.status === "matched")
    return <span className="text-[11px] text-emerald-800">Ready</span>;
  if (match.status === "duplicate")
    return <span className="text-[11px] text-amber-800">Duplicate — replace</span>;
  if (match.status === "needs-decision")
    return <span className="text-[11px] text-amber-800">Needs decision</span>;
  if (match.status === "wrong-type")
    return <span className="text-[11px] text-red-800">Wrong type</span>;
  return <span className="text-[11px] text-muted-foreground">Not matched</span>;
}
