import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, b0 as Files, b1 as CloudUpload, m as Check, T as TriangleAlert, b2 as ScanText, E as ExternalLink, a2 as Download, am as LayoutGrid, b3 as List, Q as Search, a3 as X, L as LoaderCircle, ac as Ellipsis, b4 as FileArchive, H as ChevronDown } from './icons-BxQpodNr.js';
import { u as useVirtualizer } from './index-BALjev1w.js';
import { u as useAuth, l as useQuery, j as api, o as useAction, L as Link, c as cn, B as Button, t as toast, a as useConvex, m as useMutation } from './index-CBV6wOh8.js';
import { aP as resolveDocumentRequirements, A as AppShell } from './AppShell-CP099uvN.js';
import { P as PageShell } from './PageShell-CaOvGLdi.js';
import { F as FacilityCell } from './FacilityCell-CI45DpPw.js';
import { i as isFacilityDocument, r as resultDisplayDate, R as ResultReadStatusLine, a as ResultReadButton, D as DocumentSlot } from './DocumentSlot-DLNae2Gb.js';
import { L as LazyResultReadDialog } from './LazyResultReadDialog-BIkWLeOK.js';
import { U as UniversalFilterBar } from './UniversalFilterBar-uuD2kW1Y.js';
import { I as Input } from './input-Cy2oZLur.js';
import { S as Skeleton } from './skeleton-D-jVDmpg.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from './dialog-BW3GEiPg.js';
import { D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, f as DropdownMenuItem, c as DropdownMenuLabel, g as DropdownMenuSeparator } from './dropdown-menu-N0nU9bdA.js';
import { c as classifyDroppedFile, a as candidateDocsFor, d as documentFieldConfig, v as validateDocumentFile, u as useDocumentUrls, f as formatFileSize, D as DOCUMENT_TOTAL, g as getDocumentUrls } from './PdfCanvasViewer-C0MZuH_2.js';
import { c as createUploadTransport, u as uploadDocument, a as uploadKeyFor, f as friendlyUploadError } from './DocumentField-4d87_sVm.js';
import { z as zipSync } from './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';
import './FacilityTypeBadge-8G3otPEU.js';
import './checkbox-CjOYMc2v.js';
import './select-qTILnHQg.js';

const norm = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const TYPE_SHORT = {
  "HWC HSC": "HSC",
  "HWC-HSC": "HSC",
  HSC: "HSC",
  PHC: "PHC",
  UPHC: "UPHC",
  CHC: "CHC",
  UHWC: "UHWC",
  UGPHC: "UGPHC",
  SDH: "SDH",
  DHQH: "DHQH"
};
function withoutExtension(name) {
  return name.replace(/\.[a-z0-9]{1,8}$/i, "");
}
function labelPart(name) {
  const base = withoutExtension(name);
  const parts = base.split(/\s+[–—-]\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : base;
}
const DOC_HINTS = [
  { key: "SA_Checklist", re: /check[\s_-]*list|\bsa\b.*check/i },
  { key: "SA_Report", re: /state[\s_-]*assessment.*report|\bsa\b.*report/i },
  {
    key: "NQAS_Result",
    re: /nqas.*(result|certif)|certified.*(result|document)|marksheet/i
  },
  { key: "NOC", re: /\bnoc\b|fire[\s_-]*noc|no[\s_-]*objection/i },
  { key: "Condemned", re: /condemn/i },
  { key: "Gap_Closure", re: /gap[\s_-]*closure|proceeding|procurement/i }
];
function docKeyFromText(text) {
  for (const hint of DOC_HINTS) if (hint.re.test(text)) return hint.key;
  return null;
}
function cycleFromText(text) {
  const cycle = /\bcycle[\s_-]*(\d{1,2})\b/i.exec(text);
  if (cycle) return Number(cycle[1]);
  const stored = /_c(\d{1,2})_/i.exec(text);
  if (stored) return Number(stored[1]);
  return null;
}
function facilityHits(fileName, facilities) {
  const whole = norm(withoutExtension(fileName));
  const [firstPart] = withoutExtension(fileName).split(/\s+[–—-]\s+/);
  const preDash = norm(firstPart);
  const hits = /* @__PURE__ */ new Map();
  for (const facility of facilities) {
    const type = TYPE_SHORT[facility.facilityType] ?? facility.facilityType;
    const candidates = [
      norm(facility.name),
      norm(`${facility.name} ${type}`),
      norm(`${facility.name} ${type} ${facility.phc}`)
    ].filter(Boolean);
    for (const candidate of candidates) {
      const hay = preDash.includes(candidate) ? preDash : whole;
      if (!hay.includes(candidate)) continue;
      const hit = hits.get(facility.id);
      if (!hit || candidate.length > hit.length) {
        hits.set(facility.id, { facility, length: candidate.length });
      }
    }
  }
  const ninHits = facilities.filter((facility) => {
    const digits = (facility.nin ?? "").replace(/\D/g, "");
    return digits.length >= 4 && whole.replace(/\s/g, "").includes(digits);
  });
  for (const facility of ninHits) {
    if (!hits.has(facility.id)) hits.set(facility.id, { facility, length: 0 });
  }
  return Array.from(hits.values()).sort((a, b) => b.length - a.length);
}
function matchDroppedFile(file, facilities, existing = []) {
  const base = {
    fileName: file.name,
    size: file.size,
    status: "unmatched",
    reason: null,
    facilityId: null,
    facilityName: null,
    docKey: null,
    docLabel: null,
    cycleNo: null
  };
  const hits = facilityHits(file.name, facilities);
  const best = hits[0] ?? null;
  const tied = best ? hits.filter((hit) => hit.length === best.length && hit.facility.id !== best.facility.id) : [];
  const facility = tied.length > 0 ? null : best?.facility ?? null;
  let docKey = docKeyFromText(labelPart(file.name));
  if (!docKey) docKey = docKeyFromText(withoutExtension(file.name));
  if (!docKey) {
    const classified = classifyDroppedFile(file);
    docKey = classified.docKey;
  }
  if (!facility) {
    return {
      ...base,
      reason: tied.length > 0 ? "More than one facility has this name — add the block or PHC to the file name" : "No facility matches this name or NIN"
    };
  }
  const facilityDocument = docKey ? isFacilityDocument(docKey) : false;
  const cycle = facilityDocument ? null : cycleFromText(file.name) ?? facility.cycleNo ?? 1;
  if (!docKey) {
    const candidates = candidateDocsFor(file.name);
    return {
      ...base,
      facilityId: facility.id,
      facilityName: facility.name,
      cycleNo: cycle,
      reason: candidates.length > 0 ? "Add the document type to the file name (for example “– SA Report”)" : "The file type is not one of the six documents"
    };
  }
  if (cycle != null && facility.cycles && !facility.cycles.includes(cycle)) {
    const config2 = documentFieldConfig(docKey);
    return {
      ...base,
      status: "needs-decision",
      facilityId: facility.id,
      facilityName: facility.name,
      docKey,
      docLabel: config2?.label ?? docKey,
      cycleNo: cycle,
      reason: `Cycle ${cycle} is not recorded for this facility — choose a cycle`
    };
  }
  const config = documentFieldConfig(docKey);
  const invalid = validateDocumentFile(docKey, file);
  if (invalid) {
    return {
      ...base,
      status: "wrong-type",
      facilityId: facility.id,
      facilityName: facility.name,
      docKey,
      docLabel: config?.label ?? docKey,
      cycleNo: cycle,
      reason: invalid
    };
  }
  const duplicate = existing.some(
    (row) => row.facilityId === facility.id && row.docKey === docKey && (isFacilityDocument(docKey) ? true : row.cycleNo === cycle)
  );
  return {
    ...base,
    status: duplicate ? "duplicate" : "matched",
    facilityId: facility.id,
    facilityName: facility.name,
    docKey,
    docLabel: config?.label ?? docKey,
    cycleNo: cycle,
    reason: duplicate ? "A current file already exists — Replace or Cancel" : null
  };
}
function matchDroppedFiles(files, facilities, existing = []) {
  return files.map((file) => matchDroppedFile(file, facilities, existing));
}

const ZIP_PART_SIZE = 200;
const MAX_ZIP_NAME = 120;
function sanitizeZipName(value, fallback = "file") {
  const clean = String(value ?? "").replace(/[\\/:*?"<>|]/g, "-").replace(/[\u0000-\u001f]/g, "-").replace(/\s+/g, " ").trim().replace(/[. ]+$/g, "");
  if (!clean) return fallback;
  if (clean.length <= MAX_ZIP_NAME) return clean;
  const dot = clean.lastIndexOf(".");
  const ext = dot > 0 && clean.length - dot <= 12 ? clean.slice(dot) : "";
  const stem = (ext ? clean.slice(0, dot) : clean).slice(0, MAX_ZIP_NAME - ext.length);
  return `${stem.replace(/[. ]+$/g, "") || fallback}${ext}`;
}
function uniqueZipName(name, used) {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let index = 2;
  let next = `${stem} (${index})${ext}`;
  while (used.has(next)) {
    index += 1;
    next = `${stem} (${index})${ext}`;
  }
  used.add(next);
  return next;
}
const isStored = (file) => /\.(pdf|xlsx)$/i.test(file.fileName) || /^(application\/pdf|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)$/i.test(
  file.mimeType
);
function buildZipParts(files, baseName) {
  const totalParts = Math.max(1, Math.ceil(files.length / ZIP_PART_SIZE));
  const parts = [];
  for (let part = 0; part < totalParts; part += 1) {
    const slice = files.slice(part * ZIP_PART_SIZE, (part + 1) * ZIP_PART_SIZE);
    const zippable = {};
    const usedFolders = /* @__PURE__ */ new Map();
    const folderNames = /* @__PURE__ */ new Map();
    const usedFiles = /* @__PURE__ */ new Map();
    for (const file of slice) {
      const block = sanitizeZipName(file.block, "Unassigned");
      const folderKey = `${block}\0${file.facilityName}`;
      let facility = folderNames.get(folderKey);
      if (!facility) {
        const names2 = usedFolders.get(block) ?? /* @__PURE__ */ new Set();
        facility = uniqueZipName(sanitizeZipName(file.facilityName, "Facility"), names2);
        usedFolders.set(block, names2);
        folderNames.set(folderKey, facility);
      }
      const dir = `${block}/${facility}`;
      const names = usedFiles.get(dir) ?? /* @__PURE__ */ new Set();
      const name2 = uniqueZipName(sanitizeZipName(file.fileName), names);
      usedFiles.set(dir, names);
      const path = `${dir}/${name2}`;
      zippable[path] = [file.data, { level: isStored(file) ? 0 : 6 }];
    }
    const bytes = zipSync(zippable);
    const nameBase = sanitizeZipName(baseName, "documents").replace(/\.zip$/i, "");
    const name = totalParts > 1 ? `${nameBase} - Part ${part + 1} of ${totalParts}.zip` : `${nameBase}.zip`;
    parts.push({
      name,
      blob: new Blob([bytes], { type: "application/zip" }),
      files: slice.length
    });
  }
  return parts;
}
async function mapWithConcurrency(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      out[index] = await worker(items[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, limit), items.length) }, () => run())
  );
  return out;
}
function shortZipError(error, status) {
  if (status) {
    if (status === 401 || status === 403) return "access denied";
    if (status === 404) return "file not found";
    if (status >= 500) return "storage unavailable";
    return `server error ${status}`;
  }
  const message = error instanceof Error ? error.message : "";
  if (/abort/i.test(message)) return "cancelled";
  if (/failed to fetch|network|load failed/i.test(message)) return "network error";
  return message.trim().slice(0, 80) || "could not be read";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function stamp(ts) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}
function stampIst(ts) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  }).formatToParts(new Date(ts));
  const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("day")}-${value("month")}-${value("year")}`;
}
function isoDay(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
const SHORT_LABEL = {
  NQAS_Result: "NQAS Result",
  SA_Report: "SA Report",
  SA_Checklist: "SA Checklist",
  Gap_Closure: "Gap Closure",
  Condemned: "Condemned",
  NOC: "Fire NOC"
};
const CONDITION_NOUN = {
  certified: "certified facilities",
  gap_amount: "facilities with gap amount",
  dilapidated: "dilapidated facilities",
  fire_noc: "facilities with a Fire NOC"
};
const VIEW_KEY = "nqas.documents.view.v1";
const DEFAULT_BAR_KEYS = [
  "block",
  "facilityType",
  "docKey",
  "state",
  "resultRead",
  "uploadDate",
  "uploadedBy"
];
const CYCLE_MODES = [
  { value: "current", label: "Current" },
  { value: "1", label: "Cycle 1" },
  { value: "2", label: "Cycle 2" },
  { value: "all", label: "All" }
];
function readCycleMode(userId) {
  if (typeof window === "undefined") return "current";
  try {
    const value = window.localStorage.getItem(`nqas.documents.cycle.v1:${userId ?? "anon"}`);
    return CYCLE_MODES.some((mode) => mode.value === value) ? value : "current";
  } catch {
    return "current";
  }
}
function readView() {
  if (typeof window === "undefined") return "matrix";
  return window.localStorage.getItem(VIEW_KEY) === "files" ? "files" : "matrix";
}
function DocumentLibraryPage() {
  const { user } = useAuth();
  const canEdit = user?.appRole === "admin" || user?.appRole === "entry" || user?.appRole === "dqmo" || user?.appRole === "dqc";
  const result = useQuery(api.documentLibrary.library, {});
  const facilities = result?.facilities ?? [];
  const documents = result?.documents ?? [];
  const definitions = result?.definitions ?? [];
  const rules = result?.rules;
  const readerEnabled = result?.readerEnabled === true;
  const [search, setSearch] = reactExports.useState("");
  const [bar, setBar] = reactExports.useState({
    barKeys: DEFAULT_BAR_KEYS,
    filters: [],
    match: "all"
  });
  const [view, setView] = reactExports.useState(readView);
  const [cycleMode, setCycleMode] = reactExports.useState(() => readCycleMode(user?._id));
  const [includeVersions, setIncludeVersions] = reactExports.useState(false);
  const [detailCell, setDetailCell] = reactExports.useState(null);
  const [uploadCell, setUploadCell] = reactExports.useState(null);
  const [preview, setPreview] = reactExports.useState(null);
  const [dragActive, setDragActive] = reactExports.useState(false);
  const [cellBusyKey, setCellBusyKey] = reactExports.useState(null);
  const [readIds, setReadIds] = reactExports.useState(null);
  const [readFacilityId, setReadFacilityId] = reactExports.useState(null);
  const [readSelected, setReadSelected] = reactExports.useState(/* @__PURE__ */ new Set());
  const openRead = (ids, facilityId = null) => {
    if (!readerEnabled) return;
    setReadFacilityId(facilityId);
    setReadIds(ids);
  };
  const dragDepth = reactExports.useRef(0);
  const matrixScrollRef = reactExports.useRef(null);
  const beginUpload = useAction(api.documents.beginUpload);
  const uploadChunk = useAction(api.documents.uploadChunk);
  const finalizeUpload = useAction(api.documents.finalizeUpload);
  const cancelUpload = useAction(api.documents.cancelUpload);
  reactExports.useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_KEY, view);
    } catch {
    }
  }, [view]);
  reactExports.useEffect(() => {
    if (user?._id) setCycleMode(readCycleMode(user._id));
  }, [user?._id]);
  reactExports.useEffect(() => {
    try {
      window.localStorage.setItem(
        `nqas.documents.cycle.v1:${user?._id ?? "anon"}`,
        cycleMode
      );
    } catch {
    }
  }, [cycleMode, user?._id]);
  reactExports.useEffect(() => {
    if (result?.readerEnabled === false) {
      setReadSelected(/* @__PURE__ */ new Set());
      setReadIds(null);
      setBar((current) => {
        if (!current.barKeys.includes("resultRead") && !current.filters.some((f) => f.key === "resultRead")) {
          return current;
        }
        return {
          ...current,
          barKeys: current.barKeys.filter((key) => key !== "resultRead"),
          filters: current.filters.filter((filter) => filter.key !== "resultRead")
        };
      });
    }
  }, [result?.readerEnabled]);
  const valueOf = (key) => bar.filters.find((f) => f.key === key)?.values[0] ?? "";
  const blockF = valueOf("block");
  const typeF = valueOf("facilityType");
  const docF = valueOf("docKey");
  const stateF = valueOf("state");
  const dateF = valueOf("uploadDate");
  const byF = valueOf("uploadedBy");
  const readF = readerEnabled ? valueOf("resultRead") : "";
  const blocks = reactExports.useMemo(
    () => Array.from(new Set(facilities.map((f) => f.block))).sort(),
    [facilities]
  );
  const types = reactExports.useMemo(
    () => Array.from(new Set(facilities.map((f) => f.facilityType))).sort(),
    [facilities]
  );
  const uploaders = reactExports.useMemo(
    () => Array.from(new Set(documents.map((d) => d.uploadedByName))).sort(),
    [documents]
  );
  const fields = reactExports.useMemo(
    () => [
      {
        key: "block",
        label: "Block",
        type: "select",
        group: "Identity",
        onThisPage: true,
        options: blocks.map((value) => ({ value }))
      },
      {
        key: "facilityType",
        label: "Facility type",
        type: "select",
        group: "Identity",
        onThisPage: true,
        options: types.map((value) => ({ value }))
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
            (d) => d.isCurrent && !d.missingInDrive && d.docKey === definition.key
          ).length
        }))
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
          { value: "required_missing", label: "Required and missing" }
        ]
      },
      ...readerEnabled ? [
        {
          key: "resultRead",
          label: "Result read",
          type: "select",
          group: "Documents",
          onThisPage: true,
          options: [{ value: "not_read", label: "Result not read" }]
        }
      ] : [],
      {
        key: "uploadDate",
        label: "Uploaded date",
        type: "date",
        group: "Documents",
        onThisPage: true
      },
      {
        key: "uploadedBy",
        label: "Uploaded by",
        type: "select",
        group: "Documents",
        onThisPage: true,
        options: uploaders.map((value) => ({ value }))
      }
    ],
    [blocks, types, definitions, documents, uploaders, readerEnabled]
  );
  const model = reactExports.useMemo(() => {
    const q = search.trim().toLowerCase();
    const facilityById = new Map(facilities.map((f) => [f.id, f]));
    const cycleFor = (facility) => cycleMode === "all" ? null : cycleMode === "current" ? facility.cycleNo : Number(cycleMode);
    const cycleMatches = (facility, doc) => {
      if (isFacilityDocument(doc.docKey)) return true;
      if (cycleMode === "all") return true;
      return (doc.cycleNo ?? 1) === cycleFor(facility);
    };
    const cycleApplicable = (facility, docKey) => {
      if (isFacilityDocument(docKey) || cycleMode === "current") return true;
      if (cycleMode === "all") return facility.cycles.length > 0;
      return facility.cycles.includes(Number(cycleMode));
    };
    const presentByCycle = /* @__PURE__ */ new Map();
    const brokenByCycle = /* @__PURE__ */ new Map();
    for (const doc of documents) {
      if (!doc.isCurrent) continue;
      const cycle = isFacilityDocument(doc.docKey) ? 0 : doc.cycleNo ?? 1;
      const key = `${doc.facilityId}|${doc.docKey}|${cycle}`;
      const target = doc.missingInDrive ? brokenByCycle : presentByCycle;
      const previous = target.get(key);
      if (!previous || doc.uploadedAt > previous.uploadedAt) target.set(key, doc);
    }
    const present = /* @__PURE__ */ new Map();
    const broken = /* @__PURE__ */ new Map();
    for (const facility of facilities) {
      const presentForFacility = /* @__PURE__ */ new Map();
      const brokenForFacility = /* @__PURE__ */ new Map();
      for (const definition of definitions) {
        const keys = isFacilityDocument(definition.key) ? [`${facility.id}|${definition.key}|0`] : cycleMode === "all" ? facility.cycles.map((cycle) => `${facility.id}|${definition.key}|${cycle}`) : [`${facility.id}|${definition.key}|${cycleFor(facility) ?? 1}`];
        const presentDocs = keys.map((key) => presentByCycle.get(key)).filter((doc) => !!doc).sort((a, b) => b.uploadedAt - a.uploadedAt);
        if (presentDocs[0]) presentForFacility.set(definition.key, presentDocs[0]);
        const brokenDocs = keys.map((key) => brokenByCycle.get(key)).filter((doc) => !!doc).sort((a, b) => b.uploadedAt - a.uploadedAt);
        if (brokenDocs[0]) brokenForFacility.set(definition.key, brokenDocs[0]);
      }
      present.set(facility.id, presentForFacility);
      broken.set(facility.id, brokenForFacility);
    }
    const requirements = /* @__PURE__ */ new Map();
    for (const facility of facilities) {
      requirements.set(
        facility.id,
        resolveDocumentRequirements(rules ?? {}, {
          certStatus: facility.certStatus,
          gapAmount: facility.gapAmount,
          dilapidated: facility.dilapidated,
          fireNocRecorded: facility.fireNocRecorded
        })
      );
    }
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
          noun = requirement.rule.mode === "mandatory" ? "facilities" : CONDITION_NOUN[requirement.rule.condition] ?? "facilities";
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
        pct: expected > 0 ? Math.round(uploadedInExpected / expected * 100) : facilities.length > 0 ? Math.round(uploaded / facilities.length * 100) : 0
      };
    });
    const overall = {
      expected: coverage.reduce((sum, c) => sum + c.expected, 0),
      uploaded: coverage.reduce((sum, c) => sum + c.uploadedInExpected, 0)
    };
    const docLevel = (doc, facility, skipBlock = false) => {
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
        const hay = `${facility.name} ${facility.nin ?? ""} ${facility.phc} ${facility.block} ${doc.docLabel} ${doc.displayName} ${doc.originalName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    };
    const facilityText = (facility) => `${facility.name} ${facility.nin ?? ""} ${facility.block} ${facility.phc} ${facility.facilityType}`.toLowerCase();
    const facilityMatchesSearch = (facility) => !q || facilityText(facility).includes(q) || documents.some(
      (doc) => doc.facilityId === facility.id && `${doc.displayName} ${doc.originalName} ${doc.docLabel}`.toLowerCase().includes(q)
    );
    const matrixFacilities = facilities.filter((facility) => {
      if (blockF && facility.block !== blockF) return false;
      if (typeF && facility.facilityType !== typeF) return false;
      if (!facilityMatchesSearch(facility)) return false;
      if (readF === "not_read" && !documents.some(
        (doc) => doc.facilityId === facility.id && doc.isCurrent && !doc.missingInDrive && doc.docKey === "NQAS_Result" && doc.resultReadAt == null
      ))
        return false;
      const files = present.get(facility.id) ?? /* @__PURE__ */ new Map();
      const requirement = requirements.get(facility.id) ?? {};
      const requiredMissing = definitions.filter(
        (definition) => requirement[definition.key]?.required && cycleApplicable(facility, definition.key) && !files.has(definition.key)
      );
      if (stateF === "uploaded") {
        if (docF) {
          const doc = files.get(docF);
          return !!doc && (!dateF || isoDay(doc.uploadedAt) === dateF) && (!byF || doc.uploadedByName === byF);
        }
        return documents.some(
          (doc) => doc.facilityId === facility.id && docLevel(doc, facility)
        );
      }
      if (stateF === "missing") {
        return docF ? !files.has(docF) : definitions.some(
          (definition) => cycleApplicable(facility, definition.key) && !files.has(definition.key)
        );
      }
      if (stateF === "required_missing") {
        return docF ? !!requirement[docF]?.required && cycleApplicable(facility, docF) && !files.has(docF) : requiredMissing.length > 0;
      }
      if (docF) {
        return files.has(docF) || !!broken.get(facility.id)?.has(docF) || !!requirement[docF]?.required;
      }
      if (dateF || byF) {
        return documents.some(
          (doc) => doc.facilityId === facility.id && docLevel(doc, facility)
        );
      }
      return true;
    });
    const visibleIds = new Set(matrixFacilities.map((f) => f.id));
    const fileRows = [];
    if (stateF === "missing" || stateF === "required_missing") {
      for (const facility of matrixFacilities) {
        const files = present.get(facility.id) ?? /* @__PURE__ */ new Map();
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
            required
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
    const rowLabel = (row) => row.kind === "file" ? row.doc.docLabel : row.definition.label;
    fileRows.sort(
      (a, b) => a.facility.name.localeCompare(b.facility.name) || rowLabel(a).localeCompare(rowLabel(b))
    );
    const matrixDocs = documents.filter((doc) => {
      const facility = facilityById.get(doc.facilityId);
      return !!facility && visibleIds.has(facility.id) && !doc.missingInDrive && docLevel(doc, facility);
    });
    const zipEligible = (doc, facility, skipBlock = false) => !doc.missingInDrive && (includeVersions || doc.isCurrent) && docLevel(doc, facility, skipBlock);
    const zipDocs = stateF === "missing" || stateF === "required_missing" ? [] : documents.filter((doc) => {
      const facility = facilityById.get(doc.facilityId);
      return !!facility && zipEligible(doc, facility);
    });
    const zipDocsAnyBlock = stateF === "missing" || stateF === "required_missing" ? [] : documents.filter((doc) => {
      const facility = facilityById.get(doc.facilityId);
      return !!facility && zipEligible(doc, facility, true);
    });
    const zipByBlock = /* @__PURE__ */ new Map();
    const zipByFacility = /* @__PURE__ */ new Map();
    if (stateF !== "missing" && stateF !== "required_missing") {
      for (const doc of documents) {
        const facility = facilityById.get(doc.facilityId);
        if (!facility || !zipEligible(doc, facility, true)) continue;
        zipByFacility.set(facility.id, (zipByFacility.get(facility.id) ?? 0) + 1);
        zipByBlock.set(facility.block, (zipByBlock.get(facility.block) ?? 0) + 1);
      }
    }
    const currentFiles = documents.filter(
      (doc) => doc.isCurrent && !doc.missingInDrive
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
      currentFiles
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
    includeVersions
  ]);
  const linkIds = reactExports.useMemo(() => {
    const visible = new Set(model.matrixFacilities.map((facility) => facility.id));
    return documents.filter(
      (doc) => !doc.missingInDrive && visible.has(doc.facilityId) && (includeVersions || doc.isCurrent)
    ).map((doc) => doc.id).slice(0, 500);
  }, [documents, model.matrixFacilities, includeVersions]);
  const inlineUrls = useDocumentUrls(linkIds, "inline");
  const downloadUrls = useDocumentUrls(linkIds, "attachment");
  const applyCoverage = (docKey, required) => {
    setBar((current) => {
      const active = docF === docKey && stateF !== "";
      if (active) {
        return {
          ...current,
          filters: current.filters.filter((f) => f.key !== "docKey" && f.key !== "state")
        };
      }
      return {
        ...current,
        barKeys: current.barKeys.includes("state") ? current.barKeys : [...current.barKeys, "state"],
        filters: [
          ...current.filters.filter((f) => f.key !== "docKey" && f.key !== "state"),
          { key: "docKey", op: "in", values: [docKey] },
          {
            key: "state",
            op: "in",
            values: [required ? "required_missing" : "missing"]
          }
        ]
      };
    });
  };
  const clearSearchAndFilters = () => {
    setSearch("");
    setBar({
      barKeys: readerEnabled ? DEFAULT_BAR_KEYS : DEFAULT_BAR_KEYS.filter((key) => key !== "resultRead"),
      filters: [],
      match: "all"
    });
  };
  const openPreview = (files) => {
    if (!canEdit || files.length === 0) return;
    const existing = documents.filter((doc) => doc.isCurrent && !doc.missingInDrive).map((doc) => ({
      facilityId: doc.facilityId,
      docKey: doc.docKey,
      cycleNo: isFacilityDocument(doc.docKey) ? null : doc.cycleNo
    }));
    setPreview({ files, matches: matchDroppedFiles(files, facilities, existing) });
  };
  const dropHandlers = canEdit ? {
    onDragEnter: (event) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragActive(true);
    },
    onDragOver: (event) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragActive(false);
    },
    onDrop: (event) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragActive(false);
      openPreview(Array.from(event.dataTransfer?.files ?? []));
    }
  } : {};
  const subtitle = result ? `${model.currentFiles} file${model.currentFiles === 1 ? "" : "s"} · ${facilities.length} facilit${facilities.length === 1 ? "y" : "ies"}` : "Current facility documents";
  const detailDoc = detailCell && documents.filter(
    (doc) => doc.facilityId === detailCell.facilityId && doc.docKey === detailCell.docKey && doc.isCurrent && (isFacilityDocument(doc.docKey) || detailCell.cycleNo == null || (doc.cycleNo ?? 1) === detailCell.cycleNo)
  ).sort((a, b) => b.uploadedAt - a.uploadedAt)[0];
  const detailFacility = detailCell ? facilities.find((f) => f.id === detailCell.facilityId) ?? null : null;
  const uploadFacility = uploadCell ? facilities.find((f) => f.id === uploadCell.facilityId) ?? null : null;
  const cellTargets = (facility, docKey) => {
    if (isFacilityDocument(docKey)) {
      const key2 = `${facility.id}|${docKey}|0`;
      return [
        {
          cycleNo: null,
          available: true,
          doc: model.presentByCycle.get(key2) ?? null,
          broken: model.brokenByCycle.get(key2) ?? null,
          compact: false
        }
      ];
    }
    if (cycleMode === "all") {
      if (facility.cycles.length === 0) return [];
      return facility.cycles.map((cycleNo2) => {
        const key2 = `${facility.id}|${docKey}|${cycleNo2}`;
        return {
          cycleNo: cycleNo2,
          available: true,
          doc: model.presentByCycle.get(key2) ?? null,
          broken: model.brokenByCycle.get(key2) ?? null,
          compact: true
        };
      });
    }
    const cycleNo = cycleMode === "current" ? facility.cycleNo : Number(cycleMode);
    const key = `${facility.id}|${docKey}|${cycleNo}`;
    return [
      {
        cycleNo,
        available: cycleMode === "current" || facility.cycles.includes(cycleNo),
        doc: model.presentByCycle.get(key) ?? null,
        broken: model.brokenByCycle.get(key) ?? null,
        compact: false
      }
    ];
  };
  const fileInputRef = reactExports.useRef(null);
  const groupCounts = reactExports.useMemo(() => {
    const counts = /* @__PURE__ */ new Map();
    for (const row of model.fileRows)
      counts.set(row.facility.id, (counts.get(row.facility.id) ?? 0) + 1);
    return counts;
  }, [model.fileRows]);
  const matrixVirtualizer = useVirtualizer({
    count: model.matrixFacilities.length,
    getScrollElement: () => matrixScrollRef.current,
    estimateSize: () => 48,
    overscan: 12
  });
  reactExports.useEffect(() => {
    matrixVirtualizer.measure();
  }, [model.matrixFacilities.length, view, matrixVirtualizer]);
  reactExports.useEffect(() => {
    matrixScrollRef.current?.scrollTo({ top: 0 });
  }, [search, blockF, typeF, docF, cycleMode, stateF, readF, dateF, byF, includeVersions]);
  const matrixVirtualRows = matrixVirtualizer.getVirtualItems();
  const matrixTotalHeight = matrixVirtualizer.getTotalSize();
  const matrixPadTop = matrixVirtualRows.length > 0 ? matrixVirtualRows[0].start : 0;
  const matrixPadBottom = matrixVirtualRows.length > 0 ? Math.max(0, matrixTotalHeight - matrixVirtualRows[matrixVirtualRows.length - 1].end) : 0;
  const uploadToCell = async (facility, docKey, file, cycleNo) => {
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
        facility.id
      );
      await uploadDocument(
        {
          facilityId: facility.id,
          docKey,
          cycleNo: cycleNo ?? (isFacilityDocument(docKey) ? facility.cycleNo : void 0),
          file,
          bytes: async () => new Uint8Array(await file.arrayBuffer()),
          uploadKey: uploadKeyFor(facility.id, docKey, file)
        },
        transport
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
          filters: current.filters.filter((f) => f.key !== "state")
        };
      }
      return {
        ...current,
        barKeys: current.barKeys.includes("state") ? current.barKeys : [...current.barKeys, "state"],
        filters: [
          ...current.filters.filter((f) => f.key !== "docKey" && f.key !== "state"),
          { key: "state", op: "in", values: ["required_missing"] }
        ]
      };
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { title: "Document Library", subtitle, titleIcon: Files, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative space-y-3 pb-24 md:pb-0", "data-testid": "document-library", ...dropHandlers, children: [
    dragActive && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none fixed inset-4 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-background/85", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 text-sm font-semibold text-primary", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CloudUpload, { className: "size-5" }),
      " Drop files to match and upload"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageShell,
      {
        bodyClassName: cn(
          "overflow-y-auto",
          view === "matrix" && "sm:overflow-hidden"
        ),
        toolbar: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 pb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "glass rounded-xl border border-border/60 p-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1.5", "data-testid": "coverage-strip", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: applyRequired,
                "aria-pressed": requiredFilterActive,
                "data-testid": "coverage-required",
                className: cn(
                  "flex w-40 shrink-0 flex-col justify-center rounded-lg border px-2.5 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  requiredFilterActive ? "border-primary/60 bg-primary/15" : "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Required files" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold tabular-nums", children: model.overall.expected > 0 ? `${model.overall.uploaded} of ${model.overall.expected}` : "No required files" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: "block h-full rounded-full bg-primary transition-[width]",
                      style: {
                        width: `${model.overall.expected > 0 ? Math.round(model.overall.uploaded / model.overall.expected * 100) : 0}%`
                      }
                    }
                  ) })
                ]
              }
            ),
            model.coverage.map((item) => {
              const active = docF === item.key && stateF !== "";
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => applyCoverage(item.key, item.required),
                  "aria-pressed": active,
                  "data-testid": `coverage-${item.key}`,
                  className: cn(
                    "flex w-40 shrink-0 flex-col justify-center rounded-lg border px-2.5 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active ? "border-primary/60 bg-primary/10" : "border-border/60 bg-background/60 hover:border-primary/40 hover:bg-primary/5"
                  ),
                  "data-tip": `${item.label} · show the facilities missing this document`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-full truncate text-[11px] font-semibold", children: SHORT_LABEL[item.key] ?? item.label }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-full truncate text-[10.5px] tabular-nums text-muted-foreground", children: item.required ? `${item.uploadedInExpected} of ${item.expected}` : `${item.uploaded} of ${facilities.length}` }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: cn(
                          "block h-full rounded-full",
                          item.required ? "bg-primary" : "bg-muted-foreground/40"
                        ),
                        style: { width: `${item.pct}%` }
                      }
                    ) })
                  ]
                },
                item.key
              );
            })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            UniversalFilterBar,
            {
              pageKey: "documents.library",
              fields,
              value: bar,
              onChange: setBar,
              summary: stateF === "missing" || stateF === "required_missing" ? `${model.matrixFacilities.length} facilities · ${model.fileRows.length} missing` : `${model.matrixFacilities.length} facilities · ${view === "files" ? model.fileRows.length : model.matrixDocs.length} files`,
              onResetDefault: clearSearchAndFilters,
              menuExtra: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/60", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: includeVersions,
                    onChange: (event) => setIncludeVersions(event.target.checked),
                    className: "size-4 accent-[var(--primary)]"
                  }
                ),
                "Include previous versions"
              ] }),
              leading: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full min-w-0 sm:w-64", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    value: search,
                    onChange: (event) => setSearch(event.target.value),
                    placeholder: "Search facility, NIN or file name",
                    "aria-label": "Search documents",
                    className: "h-9 pl-9 text-[13px]"
                  }
                ),
                search && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setSearch(""),
                    "aria-label": "Clear search",
                    className: "absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
                  }
                )
              ] }),
              trailing: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    ref: fileInputRef,
                    type: "file",
                    multiple: true,
                    className: "hidden",
                    onChange: (event) => {
                      openPreview(Array.from(event.target.files ?? []));
                      event.target.value = "";
                    }
                  }
                ),
                readerEnabled && canEdit && readSelected.size > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    type: "button",
                    size: "sm",
                    className: "h-9 gap-1.5 bg-teal-700 text-xs text-white hover:bg-teal-800",
                    onClick: () => openRead(Array.from(readSelected)),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ScanText, { className: "size-3.5" }),
                      " Read selected (",
                      readSelected.size,
                      ")"
                    ]
                  }
                ),
                canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    type: "button",
                    size: "sm",
                    variant: "outline",
                    className: "h-9 gap-1.5 text-xs",
                    onClick: () => fileInputRef.current?.click(),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(CloudUpload, { className: "size-3.5" }),
                      " Add files"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "flex items-center gap-0.5 rounded-lg border border-border/70 p-0.5",
                    role: "tablist",
                    "aria-label": "Document view",
                    children: ["matrix", "files"].map((mode) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        role: "tab",
                        "aria-selected": view === mode,
                        onClick: () => setView(mode),
                        className: cn(
                          "inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium capitalize transition-colors",
                          view === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                        ),
                        children: [
                          mode === "matrix" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutGrid, { className: "size-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(List, { className: "size-3.5" }),
                          mode
                        ]
                      },
                      mode
                    ))
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "flex items-center gap-0.5 rounded-lg border border-border/70 p-0.5",
                    role: "tablist",
                    "aria-label": "Document cycle",
                    children: CYCLE_MODES.map((mode) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        role: "tab",
                        "aria-selected": cycleMode === mode.value,
                        onClick: () => setCycleMode(mode.value),
                        className: cn(
                          "inline-flex h-8 items-center rounded-md px-2 text-[11px] font-medium whitespace-nowrap transition-colors",
                          cycleMode === mode.value ? "bg-slate-900 text-white" : "text-muted-foreground hover:bg-muted"
                        ),
                        children: mode.label
                      },
                      mode.value
                    ))
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ZipDownloadControl,
                  {
                    files: model.zipDocs.length,
                    blocks,
                    blockCounts: model.zipByBlock,
                    facilities,
                    facilityCounts: model.zipByFacility,
                    documents: model.zipDocs,
                    blockDocuments: model.zipDocsAnyBlock,
                    onShowFiles: () => setView("files"),
                    filters: {
                      block: blockF || void 0,
                      facilityType: typeF || void 0,
                      docKey: docF || void 0,
                      cycleNo: cycleMode !== "all" && cycleMode !== "current" ? Number(cycleMode) : void 0,
                      uploadDate: dateF || void 0,
                      uploadedBy: byF || void 0,
                      search: search.trim() || void 0
                    },
                    includeVersions
                  }
                )
              ] })
            }
          )
        ] }),
        footer: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "border-t border-border/40 pt-2 text-[11px] text-muted-foreground", children: [
          DOCUMENT_TOTAL,
          " document types · counts use Admin → Documents rules. Files the nightly check could not find in Drive are shown in red and never counted as uploaded."
        ] }),
        children: !result ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", "aria-label": "Loading documents", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-9 w-full" }),
          Array.from({ length: 8 }).map((_, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-11 w-[260px] shrink-0" }),
            Array.from({ length: 6 }).map((__, cell) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-9 flex-1" }, cell))
          ] }, index))
        ] }) : facilities.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "p-6 text-center text-sm text-muted-foreground", children: "No facilities are in your scope." }) : view === "matrix" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "glass hidden h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 sm:flex", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 flex-wrap items-center gap-3 border-b border-border/50 px-3 py-1.5 text-[10.5px] text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex size-4 items-center justify-center rounded border border-emerald-300 bg-emerald-50 text-emerald-700", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }) }),
                "Uploaded"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex size-4 items-center justify-center rounded border border-amber-300 bg-amber-50 text-amber-700", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3" }) }),
                "Required"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex size-4 items-center justify-center rounded border border-dashed border-border bg-background text-muted-foreground", children: "-" }),
                "Not required"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: matrixScrollRef, className: "min-h-0 flex-1 overflow-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[980px] border-collapse text-[13px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "sticky top-0 left-0 z-30 w-[260px] min-w-[260px] border-r border-b border-border/60 bg-card px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase", children: "Facility" }),
                definitions.map((definition) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "th",
                  {
                    className: "sticky top-0 z-20 border-b border-border/60 bg-card px-1 py-2 text-center text-[11px] font-semibold whitespace-nowrap",
                    "data-tip": definition.label,
                    children: SHORT_LABEL[definition.key] ?? definition.label
                  },
                  definition.key
                ))
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
                matrixVirtualRows.length > 0 && matrixPadTop > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: definitions.length + 1, style: { height: matrixPadTop } }) }),
                matrixVirtualRows.map((virtualRow) => {
                  const facility = model.matrixFacilities[virtualRow.index];
                  if (!facility) return null;
                  const requirement = model.requirements.get(facility.id) ?? {};
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "tr",
                    {
                      className: "h-12 border-b border-border/40 last:border-0 hover:bg-muted/20",
                      "data-testid": "document-library-row",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "sticky left-0 z-10 h-12 w-[260px] min-w-[260px] border-r border-border/40 bg-background px-2 py-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                          FacilityCell,
                          {
                            facility: {
                              _id: facility.id,
                              name: facility.name,
                              facilityType: facility.facilityType,
                              block: facility.block,
                              phc: facility.phc,
                              ninNumber: facility.nin
                            },
                            query: search
                          }
                        ) }),
                        definitions.map((definition) => {
                          const required = !!requirement[definition.key]?.required;
                          const targets = cellTargets(facility, definition.key);
                          return /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "h-12 px-1 py-0 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center gap-0.5", children: targets.length === 0 || !targets[0].available ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "-" }) : targets.map((target) => {
                            const cellKey = `${facility.id}:${definition.key}:${target.cycleNo ?? ""}`;
                            const doc = target.doc;
                            return /* @__PURE__ */ jsxRuntimeExports.jsx(
                              MatrixCell,
                              {
                                label: definition.label,
                                doc,
                                broken: target.broken,
                                required,
                                canEdit,
                                busy: cellBusyKey === cellKey,
                                cycleLabel: target.compact && target.cycleNo != null ? `C${target.cycleNo}` : target.cycleNo != null && target.cycleNo !== facility.cycleNo ? `C${target.cycleNo}` : void 0,
                                compact: target.compact,
                                onOpen: () => setDetailCell({
                                  facilityId: facility.id,
                                  docKey: definition.key,
                                  cycleNo: target.cycleNo ?? void 0
                                }),
                                onUpload: () => setUploadCell({
                                  facilityId: facility.id,
                                  docKey: definition.key,
                                  cycleNo: target.cycleNo ?? void 0
                                }),
                                onDropFile: (file) => void uploadToCell(
                                  facility,
                                  definition.key,
                                  file,
                                  target.cycleNo ?? void 0
                                ),
                                readerEnabled,
                                onRead: readerEnabled && doc && doc.docKey === "NQAS_Result" ? () => openRead([doc.id], facility.id) : void 0
                              },
                              cellKey
                            );
                          }) }) }, definition.key);
                        })
                      ]
                    },
                    facility.id
                  );
                }),
                matrixVirtualRows.length > 0 && matrixPadBottom > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: definitions.length + 1, style: { height: matrixPadBottom } }) })
              ] })
            ] }) }),
            model.matrixFacilities.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "p-6 text-center text-sm text-muted-foreground", children: "No facilities match these filters." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "space-y-2 sm:hidden", children: model.matrixFacilities.map((facility) => {
            const files = model.present.get(facility.id);
            const brokenFiles = model.broken.get(facility.id);
            const requirement = model.requirements.get(facility.id) ?? {};
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "glass rounded-xl border border-border/60 p-2.5",
                "data-testid": "document-library-card",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Link,
                    {
                      to: `/facilities/${facility.id}`,
                      className: "block truncate text-[13px] font-semibold text-primary",
                      children: facility.name
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "truncate text-[11.5px] text-muted-foreground", children: [
                    facility.block,
                    " · ",
                    facility.phc || "-",
                    " · ",
                    facility.facilityType,
                    " ·",
                    " ",
                    facility.nin?.trim() || "-"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 grid grid-cols-3 gap-1.5", children: definitions.map((definition) => {
                    const doc = files?.get(definition.key) ?? null;
                    const brokenDoc = brokenFiles?.get(definition.key) ?? null;
                    const required = !!requirement[definition.key]?.required;
                    const cycleNo = cycleMode === "1" || cycleMode === "2" ? Number(cycleMode) : facility.cycleNo;
                    const applicable = isFacilityDocument(definition.key) || cycleMode === "all" || cycleMode === "current" || facility.cycles.includes(cycleNo);
                    if (!applicable) {
                      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "div",
                        {
                          className: "flex h-11 flex-col items-start justify-center rounded-lg border border-dashed border-border/70 px-1.5 text-muted-foreground",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-full truncate text-[10px] font-semibold", children: SHORT_LABEL[definition.key] ?? definition.label }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px]", children: "-" })
                          ]
                        },
                        definition.key
                      );
                    }
                    const state = doc ? "present" : brokenDoc ? "broken" : required ? "required" : "missing";
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => doc || brokenDoc ? setDetailCell({
                          facilityId: facility.id,
                          docKey: definition.key,
                          cycleNo: isFacilityDocument(definition.key) ? void 0 : cycleNo
                        }) : setUploadCell({
                          facilityId: facility.id,
                          docKey: definition.key,
                          cycleNo: isFacilityDocument(definition.key) ? void 0 : cycleNo
                        }),
                        className: cn(
                          "flex h-11 flex-col items-start justify-center rounded-lg border px-1.5 text-left",
                          state === "present" ? "border-emerald-300/70 bg-emerald-50 text-emerald-900" : state === "broken" ? "border-red-300/70 bg-red-50 text-red-900" : state === "required" ? "border-amber-300/70 bg-amber-50 text-amber-900" : "border-dashed border-border/70 bg-background text-muted-foreground"
                        ),
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-full truncate text-[10px] font-semibold", children: SHORT_LABEL[definition.key] ?? definition.label }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex items-center gap-1 text-[10px]", children: state === "present" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }),
                            " ",
                            doc && doc.size > 0 ? formatFileSize(doc.size) : "-"
                          ] }) : state === "broken" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3" }),
                            " File missing"
                          ] }) : state === "required" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3" }),
                            " Required"
                          ] }) : "-" })
                        ]
                      },
                      definition.key
                    );
                  }) })
                ]
              },
              facility.id
            );
          }) })
        ] }) : (
          /* ---------------------------- files ---------------------------- */
          /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "glass hidden h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 sm:flex", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1 overflow-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[900px] border-collapse text-[13px]", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: ["Document", "Cycle", "File name", "Size", "Uploaded", "Open", "Download"].map(
                  (label) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "th",
                    {
                      className: cn(
                        "sticky top-0 z-20 border-b border-border/60 bg-card px-2 py-2 text-[11px] font-semibold whitespace-nowrap",
                        label === "Open" || label === "Download" ? "text-right" : "text-left",
                        label === "Document" && "left-0 z-30 border-r"
                      ),
                      children: label
                    },
                    label
                  )
                ) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: model.fileRows.map((row, index) => {
                  const previous = model.fileRows[index - 1];
                  const newGroup = !previous || previous.facility.id !== row.facility.id;
                  const url = row.kind === "file" ? inlineUrls[row.doc.id] : null;
                  const download = row.kind === "file" ? downloadUrls[row.doc.id] : null;
                  return /* @__PURE__ */ jsxRuntimeExports.jsx(
                    FileRows,
                    {
                      row,
                      newGroup,
                      groupCount: groupCounts.get(row.facility.id) ?? 0,
                      url,
                      download,
                      canEdit,
                      onUpload: () => row.kind === "missing" && setUploadCell({
                        facilityId: row.facility.id,
                        docKey: row.definition.key
                      }),
                      onRead: () => {
                        if (row.kind === "file") openRead([row.doc.id]);
                      },
                      readSelected: row.kind === "file" && readSelected.has(row.doc.id),
                      onToggleRead: () => {
                        if (row.kind !== "file") return;
                        setReadSelected((current) => {
                          const next = new Set(current);
                          if (next.has(row.doc.id)) next.delete(row.doc.id);
                          else next.add(row.doc.id);
                          return next;
                        });
                      },
                      readerEnabled
                    },
                    row.key
                  );
                }) })
              ] }) }),
              model.fileRows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "p-6 text-center text-sm text-muted-foreground", children: "No documents match these filters." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-2 sm:hidden", children: [
              model.fileRows.map((row, index) => {
                const previous = model.fileRows[index - 1];
                const newGroup = !previous || previous.facility.id !== row.facility.id;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  newGroup && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-1 px-1 text-[11px] font-semibold", children: [
                    row.facility.name,
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1.5 font-normal text-muted-foreground", children: [
                      groupCounts.get(row.facility.id) ?? 0,
                      " files"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass rounded-xl border border-border/60 p-2.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "truncate text-[12.5px] font-semibold", children: [
                          row.kind === "file" ? row.doc.docLabel : row.definition.label,
                          readerEnabled && row.kind === "file" && row.doc.docKey === "NQAS_Result" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "span",
                            {
                              className: cn(
                                "ml-1.5 rounded-full border px-1.5 text-[10px] font-medium whitespace-nowrap",
                                row.doc.resultReadAt ? "border-teal-300/70 bg-teal-50 text-teal-900" : "border-amber-300/70 bg-amber-50 text-amber-900"
                              ),
                              children: row.doc.resultReadAt ? `Read ${row.doc.resultCertifiedDate ? resultDisplayDate(row.doc.resultCertifiedDate) : stampIst(row.doc.resultReadAt)}` : "Not read"
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "truncate text-[11px] text-muted-foreground", children: [
                          row.kind === "file" ? row.doc.displayName : "No file uploaded",
                          row.kind === "file" ? ` · ${formatFileSize(row.doc.size)}` : ""
                        ] })
                      ] }),
                      row.kind === "file" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0 text-[10.5px] text-muted-foreground", children: [
                        "Cycle ",
                        isFacilityDocument(row.doc.docKey) ? "-" : row.doc.cycleNo
                      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 rounded-full border border-amber-300/70 bg-amber-50 px-1.5 text-[10px] font-medium text-amber-900", children: row.required ? "Required" : "Missing" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 flex flex-wrap gap-1.5", children: row.kind === "file" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                      readerEnabled && row.doc.docKey === "NQAS_Result" && canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "inline-flex min-h-9 items-center gap-1 rounded-md border border-input bg-background px-2 text-[11px]", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "input",
                          {
                            type: "checkbox",
                            checked: readSelected.has(row.doc.id),
                            onChange: () => setReadSelected((current) => {
                              const next = new Set(current);
                              if (next.has(row.doc.id)) next.delete(row.doc.id);
                              else next.add(row.doc.id);
                              return next;
                            }),
                            className: "size-3.5 accent-[var(--primary)]"
                          }
                        ),
                        "Select"
                      ] }),
                      readerEnabled && row.doc.docKey === "NQAS_Result" && canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => openRead([row.doc.id]),
                          className: "inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md border border-teal-600/50 bg-teal-50 text-[11px] font-semibold text-teal-900",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(ScanText, { className: "size-3" }),
                            " Read result"
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "a",
                        {
                          href: inlineUrls[row.doc.id],
                          target: "_blank",
                          rel: "noopener noreferrer",
                          "aria-disabled": !inlineUrls[row.doc.id],
                          className: cn(
                            "inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md border border-input bg-background text-[11px] font-medium",
                            !inlineUrls[row.doc.id] && "pointer-events-none opacity-50"
                          ),
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3" }),
                            " Open"
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "a",
                        {
                          href: downloadUrls[row.doc.id],
                          target: "_blank",
                          rel: "noopener noreferrer",
                          "aria-disabled": !downloadUrls[row.doc.id],
                          className: cn(
                            "inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md border border-input bg-background text-[11px] font-medium",
                            !downloadUrls[row.doc.id] && "pointer-events-none opacity-50"
                          ),
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3" }),
                            " Download"
                          ]
                        }
                      )
                    ] }) : canEdit ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => setUploadCell({
                          facilityId: row.facility.id,
                          docKey: row.definition.key
                        }),
                        className: "inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md bg-primary text-[11px] font-semibold text-primary-foreground",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(CloudUpload, { className: "size-3" }),
                          " Upload"
                        ]
                      }
                    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "View only" }) })
                  ] })
                ] }, row.key);
              }),
              model.fileRows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "p-6 text-center text-sm text-muted-foreground", children: "No documents match these filters." })
            ] })
          ] })
        )
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!detailCell, onOpenChange: (open) => !open && setDetailCell(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: definitions.find((d) => d.key === detailCell?.docKey)?.label ?? "Document" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: detailFacility ? `${detailFacility.name} · ${detailFacility.facilityType} · ${detailFacility.block}` : "" })
      ] }),
      detailDoc ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 text-[13px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium break-words", children: detailDoc.displayName }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11.5px] text-muted-foreground", children: [
          "Cycle ",
          isFacilityDocument(detailDoc.docKey) ? "-" : detailDoc.cycleNo,
          " · ",
          formatFileSize(detailDoc.size),
          " · uploaded",
          " ",
          stamp(detailDoc.uploadedAt),
          " by ",
          detailDoc.uploadedByName,
          detailDoc.versionNo > 1 ? ` · version ${detailDoc.versionNo}` : ""
        ] }),
        detailDoc.missingInDrive && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-start gap-1.5 rounded-md border border-red-300/70 bg-red-50 p-2 text-[11.5px] font-medium text-red-900", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-0.5 size-3.5 shrink-0" }),
          "The nightly check could not find this file in Drive. Upload a new copy."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2 pt-1", children: [
          !detailDoc.missingInDrive && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "a",
              {
                href: inlineUrls[detailDoc.id],
                target: "_blank",
                rel: "noopener noreferrer",
                "aria-disabled": !inlineUrls[detailDoc.id],
                className: cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium hover:bg-accent",
                  !inlineUrls[detailDoc.id] && "pointer-events-none opacity-50"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3.5" }),
                  " Open"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "a",
              {
                href: downloadUrls[detailDoc.id],
                target: "_blank",
                rel: "noopener noreferrer",
                "aria-disabled": !downloadUrls[detailDoc.id],
                className: cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium hover:bg-accent",
                  !downloadUrls[detailDoc.id] && "pointer-events-none opacity-50"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5" }),
                  " Download"
                ]
              }
            )
          ] }),
          canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              size: "sm",
              variant: "outline",
              className: "gap-1.5",
              onClick: () => {
                setUploadCell(detailCell);
                setDetailCell(null);
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CloudUpload, { className: "size-3.5" }),
                " Upload a new copy"
              ]
            }
          )
        ] }),
        readerEnabled && detailDoc.docKey === "NQAS_Result" && canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-end justify-between gap-2 rounded-md border border-border/60 bg-muted/20 p-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ResultReadStatusLine, { documentId: detailDoc.id }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ResultReadButton,
            {
              documentId: detailDoc.id,
              facilityId: detailDoc.facilityId,
              size: "xs"
            }
          )
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "No file information is available." })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!uploadCell, onOpenChange: (open) => !open && setUploadCell(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
          "Upload ",
          definitions.find((d) => d.key === uploadCell?.docKey)?.label ?? "document"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: uploadFacility ? `${uploadFacility.name} · ${uploadFacility.facilityType} · ${uploadFacility.block} · ${uploadCell && isFacilityDocument(uploadCell.docKey) ? "Facility document" : `Cycle ${uploadCell?.cycleNo ?? uploadFacility.cycleNo}`}` : "" })
      ] }),
      uploadCell && /* @__PURE__ */ jsxRuntimeExports.jsx(
        DocumentSlot,
        {
          facilityId: uploadCell.facilityId,
          docKey: uploadCell.docKey,
          cycleNo: uploadCell.cycleNo,
          lockCycle: true,
          canEdit
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DropPreviewDialog,
      {
        preview,
        onClose: () => setPreview(null),
        onDone: (message) => toast.success(message)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      LazyResultReadDialog,
      {
        open: readerEnabled && readIds !== null,
        onOpenChange: (next) => {
          if (!next) {
            setReadIds(null);
            setReadFacilityId(null);
          }
        },
        documentIds: readIds ?? [],
        facilityId: readFacilityId,
        onApplied: () => {
          setReadSelected(/* @__PURE__ */ new Set());
          setReadIds(null);
          setReadFacilityId(null);
        }
      }
    )
  ] }) });
}
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
  compact
}) {
  const [over, setOver] = reactExports.useState(false);
  const dropProps = canEdit ? {
    onDragEnter: (event) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
      event.stopPropagation();
      setOver(true);
    },
    onDragOver: (event) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (event) => {
      event.stopPropagation();
      setOver(false);
    },
    onDrop: (event) => {
      event.preventDefault();
      event.stopPropagation();
      setOver(false);
      const file = event.dataTransfer?.files?.[0];
      if (file) onDropFile(file);
    }
  } : {};
  const base = cn(
    "inline-flex min-h-8 w-full items-center justify-center gap-1 rounded-md border px-1 text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    compact && "min-h-7 w-auto min-w-8 px-1",
    over && "ring-2 ring-primary ring-offset-1"
  );
  const title = cycleLabel ? `${cycleLabel} · ${label}` : label;
  if (busy) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn(base, "border-primary/50 bg-primary/5 text-primary"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }),
      " Uploading"
    ] });
  }
  if (doc) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-0.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: onOpen,
          "aria-label": `${title}: uploaded — open or download`,
          "data-tip": `${title}: uploaded ${stamp(doc.uploadedAt)} — tap to open or download`,
          className: cn(base, "min-w-0 flex-1 border-emerald-300/70 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"),
          ...dropProps,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 flex-col items-center leading-tight", children: [
              cycleLabel && !readerEnabled && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[8.5px] font-semibold", children: cycleLabel }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate tabular-nums", children: compact ? cycleLabel : doc.size > 0 ? formatFileSize(doc.size) : "-" }),
              !compact && readerEnabled && doc.docKey === "NQAS_Result" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: cn(
                    "w-full truncate text-[8.5px] font-semibold",
                    doc.resultReadAt ? "text-teal-800" : "text-amber-800"
                  ),
                  children: doc.resultReadAt ? `Read ${doc.resultCertifiedDate ? resultDisplayDate(doc.resultCertifiedDate) : stampIst(doc.resultReadAt)}` : "Not read"
                }
              )
            ] })
          ]
        }
      ),
      onRead && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "aria-label": `More actions for ${label}`,
            className: "inline-flex size-6 shrink-0 items-center justify-center rounded border border-border/60 bg-background text-muted-foreground hover:bg-muted",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "size-3" })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: onRead, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ScanText, { className: "mr-1.5 size-3.5" }),
            " Read result"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: onOpen, children: "Preview / download" })
        ] })
      ] })
    ] });
  }
  if (broken) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: onOpen,
        "aria-label": `${title}: file missing in Drive`,
        "data-tip": `${title}: the file is missing in Drive — tap for details`,
        className: cn(base, "border-red-300/70 bg-red-50 text-red-800 hover:bg-red-100"),
        ...dropProps,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5 shrink-0" }),
          " ",
          compact ? cycleLabel : "Missing"
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      onClick: onUpload,
      "aria-label": `${title}: ${required ? "required and missing" : "not required"} — upload`,
      "data-tip": `${title}: ${required ? "required and missing" : "not required"} — tap to upload or drop a file`,
      className: cn(
        base,
        required ? "border-amber-300/80 bg-amber-50 text-amber-900 hover:bg-amber-100" : "border-dashed border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"
      ),
      ...dropProps,
      children: required ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5 shrink-0" }),
        " ",
        compact ? cycleLabel : "Required"
      ] }) : compact ? cycleLabel : "-"
    }
  );
}
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
  readerEnabled
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    newGroup && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-b border-border/50 bg-muted/40", children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, className: "sticky left-0 bg-muted px-2 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FacilityCell, { facility: row.facility, compact: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-auto text-[10.5px] font-normal whitespace-nowrap text-muted-foreground", children: [
        groupCount,
        " file",
        groupCount === 1 ? "" : "s"
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/40 last:border-0 hover:bg-muted/20", "data-testid": "document-library-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "bg-background px-2 py-1.5 text-[12.5px] sm:sticky sm:left-0 sm:z-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
        readerEnabled && row.kind === "file" && row.doc.docKey === "NQAS_Result" && row.doc.isCurrent && canEdit && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "checkbox",
            checked: readSelected,
            onChange: onToggleRead,
            "aria-label": `Select ${row.doc.displayName} for reading`,
            className: "size-3.5 shrink-0 accent-[var(--primary)]"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: row.kind === "file" ? row.doc.docLabel : row.definition.label }),
          readerEnabled && row.kind === "file" && row.doc.docKey === "NQAS_Result" && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: cn(
                "ml-1.5 rounded-full border px-1.5 text-[10px] font-medium whitespace-nowrap",
                row.doc.resultReadAt ? "border-teal-300/70 bg-teal-50 text-teal-900" : "border-amber-300/70 bg-amber-50 text-amber-900"
              ),
              children: row.doc.resultReadAt ? `Read ${row.doc.resultCertifiedDate ? resultDisplayDate(row.doc.resultCertifiedDate) : stampIst(row.doc.resultReadAt)}` : "Not read"
            }
          ),
          row.kind === "missing" && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: cn(
                "ml-1.5 rounded-full border px-1.5 text-[10px] font-medium",
                row.required ? "border-amber-300/70 bg-amber-50 text-amber-900" : "border-border bg-muted text-muted-foreground"
              ),
              children: row.required ? "Required" : "Missing"
            }
          )
        ] }),
        readerEnabled && row.kind === "file" && row.doc.docKey === "NQAS_Result" && canEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "aria-label": `More actions for ${row.doc.docLabel}`,
              className: "ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded border border-transparent text-muted-foreground hover:border-border hover:bg-muted",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "size-3.5" })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: onRead, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ScanText, { className: "mr-1.5 size-3.5" }),
              " Read result"
            ] }),
            url && /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: url, target: "_blank", rel: "noopener noreferrer", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "mr-1.5 size-3.5" }),
              " Preview"
            ] }) })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-[12px] tabular-nums", children: row.kind === "file" ? isFacilityDocument(row.doc.docKey) ? "-" : row.doc.cycleNo : row.facility.cycleNo }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "max-w-[24rem] px-2 py-1.5", children: row.kind === "file" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-[12px]", "data-tip": row.doc.displayName, children: row.doc.displayName }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12px] text-muted-foreground", children: "No file uploaded" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-[12px] tabular-nums text-muted-foreground", children: row.kind === "file" ? formatFileSize(row.doc.size) : "—" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-[12px]", children: row.kind === "file" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "whitespace-nowrap", children: [
        stamp(row.doc.uploadedAt),
        " · ",
        row.doc.uploadedByName
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "—" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-right", children: row.kind === "file" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          href: url ?? void 0,
          target: "_blank",
          rel: "noopener noreferrer",
          "aria-disabled": !url,
          className: cn(
            "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent",
            !url && "pointer-events-none opacity-50"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3" }),
            " Open"
          ]
        }
      ) : canEdit ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: onUpload,
          className: "inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CloudUpload, { className: "size-3" }),
            " Upload"
          ]
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "View only" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-right", children: row.kind === "file" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          href: download ?? void 0,
          target: "_blank",
          rel: "noopener noreferrer",
          "aria-disabled": !download,
          className: cn(
            "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent",
            !download && "pointer-events-none opacity-50"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3" }),
            " Download"
          ]
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "—" }) })
    ] })
  ] });
}
function ZipDownloadControl({
  files,
  blocks,
  blockCounts,
  facilities,
  facilityCounts,
  documents,
  blockDocuments,
  onShowFiles
}) {
  const convex = useConvex();
  const logFailure = useMutation(api.documentLibrary.logBrowserZipFailure);
  const [busy, setBusy] = reactExports.useState(false);
  const [pickerOpen, setPickerOpen] = reactExports.useState(false);
  const [query, setQuery] = reactExports.useState("");
  const [progress, setProgress] = reactExports.useState(null);
  const [parts, setParts] = reactExports.useState([]);
  const [notice, setNotice] = reactExports.useState(null);
  const [noticeRetry, setNoticeRetry] = reactExports.useState(false);
  const [lastScope, setLastScope] = reactExports.useState({});
  const downloadPart = (part) => {
    const href = URL.createObjectURL(part.blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = part.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1e4);
  };
  const start = async (scope) => {
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
      let urls = {};
      try {
        urls = await getDocumentUrls(
          convex,
          selected.map((doc) => doc.id),
          "attachment"
        );
      } catch {
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
                  reason = shortZipError(void 0, response.status);
                } else {
                  return {
                    ok: true,
                    source: {
                      block: facility.block,
                      facilityName: facility.name,
                      fileName: doc.originalName || doc.displayName,
                      mimeType: doc.mimeType,
                      data: new Uint8Array(await response.arrayBuffer())
                    }
                  };
                }
              } catch (error) {
                reason = shortZipError(error);
              }
              if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 400));
            }
          }
          return { ok: false, name: doc.originalName || doc.displayName, reason };
        } finally {
          completed += 1;
          setProgress({ done: completed, total: selected.length });
        }
      });
      const done = results.filter((result) => result.ok).length;
      const sources = results.flatMap((result) => result.ok ? [result.source] : []);
      const failures = results.flatMap((result) => result.ok ? [] : [result]);
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
          `${done} of ${selected.length} files added. ${failures.length} failed: ${failedNames}${failures.length > 3 ? ` +${failures.length - 3} more` : ""}`
        );
        setNoticeRetry(true);
        try {
          await logFailure({
            total: selected.length,
            added: done,
            failures: failures.map((item) => ({ name: item.name, reason: item.reason }))
          });
        } catch {
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] tabular-nums text-muted-foreground", children: [
      files,
      " file",
      files === 1 ? "" : "s"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-stretch", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          type: "button",
          size: "sm",
          onClick: () => void start({}),
          disabled: busy || files === 0,
          className: "h-9 gap-1.5 rounded-r-none text-xs",
          "data-testid": "document-export-start",
          "data-guide-target": "documents-zip",
          children: [
            busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(FileArchive, { className: "size-3.5" }),
            busy ? "Building ZIP…" : "Download ZIP"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            size: "sm",
            variant: "outline",
            className: "h-9 rounded-l-none border-l-0 px-1.5",
            "aria-label": "Choose the ZIP scope",
            disabled: busy,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-4" })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "w-64", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "Download ZIP" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void start({}), children: [
            "This filter · ",
            files,
            " file",
            files === 1 ? "" : "s"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuLabel, { children: "One block" }),
          blocks.map((block) => /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void start({ block }), children: [
            "Block ",
            block,
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-[10px] tabular-nums text-muted-foreground", children: blockCounts.get(block) ?? 0 })
          ] }, block)),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => setPickerOpen(true), children: "One facility…" })
        ] })
      ] })
    ] }),
    progress && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-40 flex-col gap-0.5", "data-testid": "document-export-progress", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block h-1 overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: "block h-full rounded-full bg-primary transition-all",
          style: { width: `${Math.round(progress.done / Math.max(1, progress.total) * 100)}%` }
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-muted-foreground", children: [
        "Preparing ",
        progress.done,
        " of ",
        progress.total,
        " files"
      ] })
    ] }),
    parts.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex flex-wrap items-center gap-1", children: parts.map((part, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => downloadPart(part),
        className: "inline-flex items-center gap-1 rounded-md border border-emerald-300/70 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-100",
        "data-testid": "document-export-download",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3" }),
          " Part ",
          index + 1,
          " of ",
          parts.length,
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-emerald-800/70", children: formatFileSize(part.blob.size) })
        ]
      },
      `${part.name}-${index}`
    )) }),
    notice && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        role: "status",
        className: "fixed right-4 bottom-20 z-50 flex max-w-sm items-start gap-2 rounded-lg border border-border/70 bg-card p-2.5 text-[11.5px] shadow-lg",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "min-w-0 flex-1", children: [
            notice,
            noticeRetry && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => void start(lastScope),
                className: "ml-1 font-semibold text-primary underline underline-offset-2",
                children: "Retry"
              }
            ),
            noticeRetry && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => {
                  setNotice(null);
                  onShowFiles();
                },
                className: "ml-2 text-muted-foreground underline underline-offset-2",
                children: "Download the files separately"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setNotice(null),
              "aria-label": "Dismiss ZIP message",
              className: "rounded p-0.5 text-muted-foreground hover:bg-muted",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: pickerOpen, onOpenChange: setPickerOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Download one facility" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "The ZIP holds this facility's current files (and previous versions when the option is on)." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          value: query,
          onChange: (event) => setQuery(event.target.value),
          placeholder: "Search facility…",
          "aria-label": "Search facility for the ZIP",
          className: "h-9 text-[13px]"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-72 space-y-1 overflow-y-auto", children: [
        facilities.filter(
          (facility) => `${facility.name} ${facility.block} ${facility.phc}`.toLowerCase().includes(query.trim().toLowerCase())
        ).slice(0, 60).map((facility) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            disabled: (facilityCounts.get(facility.id) ?? 0) === 0,
            onClick: () => void start({ facilityId: facility.id }),
            className: "flex w-full items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5 text-left text-[12.5px] hover:bg-muted/60 disabled:opacity-50",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate font-medium", children: facility.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "block truncate text-[11px] text-muted-foreground", children: [
                  facility.facilityType,
                  " · ",
                  facility.block,
                  " · ",
                  facility.phc
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0 text-[11px] tabular-nums text-muted-foreground", children: [
                facilityCounts.get(facility.id) ?? 0,
                " files"
              ] })
            ]
          },
          facility.id
        )),
        facilities.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "p-3 text-center text-xs text-muted-foreground", children: "No facilities match these filters." })
      ] })
    ] }) })
  ] });
}
function DropPreviewDialog({
  preview,
  onClose,
  onDone
}) {
  const beginUpload = useAction(api.documents.beginUpload);
  const uploadChunk = useAction(api.documents.uploadChunk);
  const finalizeUpload = useAction(api.documents.finalizeUpload);
  const cancelUpload = useAction(api.documents.cancelUpload);
  const discardStagedResult = useAction(api.documents.discardStagedResult);
  const [states, setStates] = reactExports.useState({});
  const [errors, setErrors] = reactExports.useState({});
  const [progress, setProgress] = reactExports.useState({});
  const [uploadedIds, setUploadedIds] = reactExports.useState([]);
  const [uploading, setUploading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setStates({});
    setErrors({});
    setProgress({});
    setUploadedIds([]);
    setUploading(false);
  }, [preview]);
  if (!preview) return null;
  const { files, matches } = preview;
  const matched = matches.filter(
    (match) => match.status === "matched" || match.status === "duplicate"
  );
  const duplicates = matches.filter((match) => match.status === "duplicate");
  const unmatched = matches.filter((match) => match.status === "unmatched");
  const wrongType = matches.filter((match) => match.status === "wrong-type");
  const needsDecision = matches.filter((match) => match.status === "needs-decision");
  const finished = matched.length > 0 && matched.every((match) => {
    const rowIndex = matches.indexOf(match);
    return states[rowIndex] === "done";
  });
  const actions = {
    begin: beginUpload,
    putChunk: uploadChunk,
    finalize: finalizeUpload,
    cancel: cancelUpload
  };
  const run = async (only) => {
    if (!only && duplicates.length > 0) {
      const ok = window.confirm(
        `${duplicates.length} file${duplicates.length === 1 ? "" : "s"} already exist. Replace ${duplicates.length === 1 ? "it" : "them"}?

The old file stays as a previous version.`
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
        const invalid = validateDocumentFile(match.docKey, file);
        if (invalid) throw new Error(invalid);
        const transport = createUploadTransport(actions, match.facilityId);
        const result = await uploadDocument(
          {
            facilityId: match.facilityId,
            docKey: match.docKey,
            cycleNo: match.cycleNo ?? void 0,
            file,
            bytes: async () => new Uint8Array(await file.arrayBuffer()),
            uploadKey: uploadKeyFor(match.facilityId, match.docKey, file)
          },
          transport,
          (next) => setProgress((current) => ({
            ...current,
            [index]: { sent: next.sent, total: next.total }
          }))
        );
        uploaded += 1;
        if (!result.duplicate) setUploadedIds((current) => [...current, result.documentId]);
        setStates((current) => ({ ...current, [index]: "done" }));
      } catch (error) {
        failed += 1;
        setStates((current) => ({ ...current, [index]: "error" }));
        setErrors((current) => ({
          ...current,
          [index]: friendlyUploadError(error)
        }));
      }
    }
    setUploading(false);
    if (uploaded > 0) {
      onDone(
        `${uploaded} file${uploaded === 1 ? "" : "s"} uploaded${failed > 0 ? ` · ${failed} failed` : ""}`
      );
    } else if (failed > 0) {
      toast.error("No files were uploaded — see the reasons below");
    }
  };
  const undoUploads = async () => {
    let undone = 0;
    for (const documentId of uploadedIds) {
      try {
        await discardStagedResult({ documentId });
        undone += 1;
      } catch (error) {
        toast.error(friendlyUploadError(error));
      }
    }
    setUploadedIds([]);
    if (undone > 0) toast.success(`${undone} upload${undone === 1 ? "" : "s"} undone`);
  };
  const summary = [
    { label: "Ready", value: matched.length - duplicates.length, tone: "text-emerald-800" },
    { label: "Duplicate", value: duplicates.length, tone: "text-amber-800" },
    { label: "Needs decision", value: needsDecision.length, tone: "text-amber-800" },
    { label: "Not matched", value: unmatched.length, tone: "text-muted-foreground" },
    { label: "Wrong type", value: wrongType.length, tone: "text-red-800" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: true, onOpenChange: (open) => !open && !uploading && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "Upload ",
        matched.length,
        " file",
        matched.length === 1 ? "" : "s"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { children: [
        "Matched from the file name (",
        `{Facility} {Type} – {Document label}`,
        ") or the NIN. Nothing is saved until you confirm."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-3 text-[12px]", children: summary.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: cn("font-medium", item.tone), children: [
      item.label,
      ": ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums", children: item.value })
    ] }, item.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-[12px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 bg-muted/70 text-[10.5px] uppercase tracking-wide text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-2 py-1.5 text-left font-medium", children: "File" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-2 py-1.5 text-left font-medium", children: "Facility · document" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-2 py-1.5 text-left font-medium", children: "State" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: matches.map((match, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "max-w-[16rem] px-2 py-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate", "data-tip": match.fileName, children: match.fileName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10.5px] text-muted-foreground", children: formatFileSize(match.size) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5", children: match.facilityName ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate font-medium", children: match.facilityName }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10.5px] text-muted-foreground", children: [
            match.docLabel ?? match.reason,
            match.cycleNo ? ` · Cycle ${match.cycleNo}` : ""
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: match.reason }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-1.5", "aria-live": "polite", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            DropStateBadge,
            {
              match,
              state: states[index],
              progress: progress[index]
            }
          ),
          progress[index]?.total && states[index] === "uploading" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 block h-1 overflow-hidden rounded bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "block h-full bg-primary transition-[width]",
              style: {
                width: `${Math.round(
                  progress[index].sent / Math.max(1, progress[index].total) * 100
                )}%`
              }
            }
          ) }) : null,
          errors[index] && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-0.5 block text-[10.5px] text-red-800", children: [
            errors[index],
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "font-semibold underline",
                onClick: () => void run([index]),
                disabled: uploading,
                children: "Retry"
              }
            )
          ] })
        ] })
      ] }, `${match.fileName}-${index}`)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2 sm:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: unmatched.length + wrongType.length + needsDecision.length > 0 ? "Files that are not ready are never uploaded." : duplicates.length > 0 ? "Duplicates replace the current file; the old file is kept as a previous version." : "Every file is ready." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex gap-2", children: [
        uploadedIds.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "sm",
            onClick: () => void undoUploads(),
            disabled: uploading,
            children: "Undo uploads"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: onClose, disabled: uploading, children: finished ? "Close" : "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            onClick: () => void run(),
            disabled: uploading || matched.length === 0 || finished,
            "data-testid": "drop-upload-confirm",
            children: [
              uploading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-1.5 size-3.5 animate-spin" }) : null,
              uploading ? "Uploading…" : finished ? "Done" : `Upload ${matched.length} file${matched.length === 1 ? "" : "s"}`
            ]
          }
        )
      ] })
    ] })
  ] }) });
}
function DropStateBadge({
  match,
  state,
  progress
}) {
  if (state === "uploading")
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-[11px] text-primary", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3 animate-spin" }),
      " ",
      progress?.total ? `${Math.round(progress.sent / progress.total * 100)}%` : "Uploading…"
    ] });
  if (state === "done")
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-[11px] text-emerald-800", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }),
      " Uploaded"
    ] });
  if (state === "error")
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-[11px] text-red-800", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3" }),
      " Failed"
    ] });
  if (match.status === "matched")
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-emerald-800", children: "Ready" });
  if (match.status === "duplicate")
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-amber-800", children: "Duplicate — replace" });
  if (match.status === "needs-decision")
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-amber-800", children: "Needs decision" });
  if (match.status === "wrong-type")
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-red-800", children: "Wrong type" });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "Not matched" });
}

export { DocumentLibraryPage as default };
