import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useParams, useSearchParams } from "react-router";
import {
  FileText,
  Loader2,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { CycleFilter, useCycleScope } from "@/components/CycleFilter";
import { HeaderExportMenu } from "@/components/HeaderExportMenu";
import { CategoryNav } from "@/components/CategoryNav";
import {
  PaginationBar,
  RowViewSelect,
  usePagination,
} from "@/components/RowView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  AutoFitTableScroll,
} from "@/components/ui/table";
import {
  AttachmentPicker,
  type AttachmentValue,
} from "@/components/AttachmentPicker";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_SETTINGS,
  mergedPipelineStatus,
  type LifecycleSettings,
} from "@/convex/lifecycle";
import { buildEligibilityOptions } from "@/lib/eligibility";
import { FACILITY_CURRENT_STATUS_LABEL } from "@/lib/masterColumns";
import { multiFilterMatches } from "@/lib/multiFilter";
import FilterDropdown from "@/components/FilterDropdown";
import {
  DateRangeFilter,
  isoInRange,
} from "@/components/DateRangeFilter";
import { FilterBar, FilterSearch } from "@/components/FilterBar";
import { countActiveFilters } from "@/lib/filters";
import { FacilityTypeBadge } from "@/components/FacilityTypeBadge";
import { CycleBadge } from "@/components/CycleBadge";
import { deriveFireNocStatus } from "@/lib/today";
import { toDisplayDate, toDisplayDateTime } from "@/lib/format";
import { withOverrides } from "@/lib/tableHeaders";
import { exportExcel, exportPdf } from "@/lib/exportTable";
import { exportHeaders, exportRows } from "@/lib/facilityExport";
import {
  CATEGORY_COLUMN_IDS,
  CATEGORY_ICONS,
  CATEGORY_META,
  TRACKER_COLUMN_LABELS,
  TRACKER_COLUMN_WIDTHS,
  categoryFromRoute,
  type TrackerCategoryId,
  type TrackerColumnId,
} from "@/lib/trackerColumns";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

/** Tiny month/quarter arrow used by the IA comparison columns. Decimal
 *  percentages are rounded to 2 places to avoid float noise. */
function ComparisonCell({ q1, q2 }: { q1: number | null; q2: number | null }) {
  if (q1 == null || q2 == null)
    return <span className="text-muted-foreground">—</span>;
  const delta = Math.round((q2 - q1) * 100) / 100;
  const color =
    delta > 0 ? "oklch(0.6 0.15 165)" : delta < 0 ? "oklch(0.6 0.2 25)" : "inherit";
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "";
  if (delta === 0)
    return <span className="font-medium tabular-nums">No Changes</span>;
  return (
    <span className="font-medium tabular-nums" style={{ color }}>
      {arrow} {Math.abs(delta)}
    </span>
  );
}

/** File link shown inside a table cell: opens the stored document. */
function CellFileLink({ id, name }: { id: string | null; name: string | null }) {
  const url = useQuery(
    api.modules.getAttachmentUrl,
    id ? { storageId: id as never } : "skip",
  );
  if (!id) return null;
  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-32 items-center gap-1 truncate text-xs font-medium text-primary hover:underline"
      data-tip={name ?? "View file"}
    >
      <Paperclip className="size-3.5 shrink-0" />
      <span className="truncate">{name ?? "View file"}</span>
    </a>
  );
}

/** Compact upload cell: shows the current file link, or a picker button. */
function CellUpload({
  id,
  name,
  value,
  onChange,
  onClear,
  disabled,
  hint,
}: {
  id: string | null;
  name: string | null;
  value: AttachmentValue | null;
  onChange: (v: AttachmentValue | null) => void;
  onClear?: () => void;
  disabled?: boolean;
  hint?: string | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  if (pickerOpen)
    return (
      <AttachmentPicker
        initial={id ? { attachmentId: id, attachmentName: name ?? undefined } : null}
        onChange={(v) => {
          // Picking a new file must NOT trigger onClear — the clear flag is
          // only for the explicit Remove button; firing it here marked the
          // row "removing…" and let the clear win over the upload on save.
          onChange(v);
          setPickerOpen(false);
        }}
        disabled={disabled}
      />
    );
  // A freshly picked file is staged: show its name once (it is not a stored
  // link yet) instead of the saved document, so the cell never shows the
  // document twice. Remove discards only the pick.
  if (value)
    return (
      <div className="flex flex-col items-start gap-1">
        <span
          className="inline-flex max-w-32 items-center gap-1 text-xs font-medium text-foreground"
          data-tip={`${value.attachmentName ?? "New file"} — applies when you press Update`}
        >
          <FileText className="size-3.5 shrink-0" />
          <span className="truncate">{value.attachmentName ?? "New file"}</span>
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            disabled={disabled}
            onClick={() => setPickerOpen(true)}
          >
            <Paperclip className="size-3.5" />
            Replace
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Remove
          </Button>
        </div>
      </div>
    );
  return (
    <div className="flex flex-col items-start gap-1">
      <CellFileLink id={id} name={name} />
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          disabled={disabled}
          onClick={() => setPickerOpen(true)}
        >
          <Paperclip className="size-3.5" />
          {id ? "Replace" : "Upload"}
        </Button>
        {id && onClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive"
            disabled={disabled}
            onClick={() => {
              // Remove also discards a freshly picked file so the clear wins.
              onChange(null);
              onClear();
            }}
          >
            Remove
          </Button>
        )}
      </div>
      {hint && (
        <span className="block text-[10px] leading-tight text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

type TrackerRow = NonNullable<
  ReturnType<typeof useQuery<typeof api.ops.listFacilityRowsFast>>
>["rows"][number];

/** Editable text fields on category pages (attachments & read-only columns
 *  are handled separately). */
const DRAFT_KEYS = [
  "certStatus",
  "certDate",
  "certScore",
  "naScheduled",
  "naEnd",
  "naMode",
  "departments",
  "gapAmount",
  "gcYear",
  "nqasIaQ1",
  "nqasIaQ2",
  "kayakalpIaQ1",
  "kayakalpIaQ2",
  "saStatus",
  "saScore",
  "saAssessor1",
  "saAssessor1Hud",
  "saAssessor2",
  "saAssessor2Hud",
  "saStart",
  "saEnd",
  "genDoc",
  "surv1",
  "surv2",
  "survScore",
  "buildingType",
  "buildingStatus",
  "nocAvailable",
  "nocStatus",
  "nocCertified",
  "nocValidity",
  "remarks",
] as const;

type DraftKey = (typeof DRAFT_KEYS)[number];
type Draft = Record<DraftKey, string>;

export default function FacilityDataPage() {
  // Route is /facilities/* — the dispatcher matched a category segment and
  // renders us; the segment is the URL slug (e.g. "state-assessment"), which
  // we resolve back to the category id via its registered route.
  const params = useParams<{ "*": string }>();
  const segment = (params["*"] ?? "").split("/")[0];
  const categoryId = categoryFromRoute(`/facilities/${segment}`);
  const cycleScope = useCycleScope();
  const data = useQuery(api.ops.listFacilityRowsFast, { cycle: cycleScope });
  const settings = useQuery(api.facilities.getAppSettings, {});
  const [searchParams] = useSearchParams();

  const searchInit = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(searchInit);
  const [blockFilter, setBlockFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [buildingStatusFilter, setBuildingStatusFilter] = useState<string[]>([]);
  const [eligibilityFilter, setEligibilityFilter] = useState<string[]>([]);
  // Category-specific extra filters (Image request): NQAS Certification gets a
  // Facility Current Status filter, State Assessment gets a SaQsham Documents Status
  // filter, Fire NOC gets a validity-status filter.
  const [pipelineFilter, setPipelineFilter] = useState<string[]>([]);
  const [docFilter, setDocFilter] = useState<string[]>([]);
  const [nocStatusFilter, setNocStatusFilter] = useState<string[]>([]);
  const [certFilter, setCertFilter] = useState<string[]>([]);
  // Cert_Cycle + NQAS Eligibility on every category page.
  const [cycleFilter, setCycleFilter] = useState<string[]>([]);
  // State Assessment page: SA status + SA start date range.
  const [saStatusFilter, setSaStatusFilter] = useState<string[]>([]);
  const [saStartFrom, setSaStartFrom] = useState("");
  const [saStartTo, setSaStartTo] = useState("");
  // NQAS Certification page: GOI letter / certification date range +
  // NQAS assessment start date range.
  const [goiFrom, setGoiFrom] = useState("");
  const [goiTo, setGoiTo] = useState("");
  const [naStartFrom, setNaStartFrom] = useState("");
  const [naStartTo, setNaStartTo] = useState("");

  const docStatusOptions: string[] =
    (settings?.settings.generalDocStatuses as string[] | undefined) ??
    DEFAULT_SETTINGS.generalDocStatuses;
  const certStatusOptions: string[] =
    (settings?.settings.certificationStatuses as string[] | undefined) ??
    DEFAULT_SETTINGS.certificationStatuses;

  const facilityTypes: string[] =
    (settings?.settings.facilityTypes as string[] | undefined) ??
    DEFAULT_SETTINGS.facilityTypes;
  // Facility Building Status options (admin-editable) — drives the Building
  // page's status filter dropdown.
  const buildingStatusOptions: string[] =
    (settings?.settings.buildingStatuses as string[] | undefined) ??
    DEFAULT_SETTINGS.buildingStatuses;
  // NQAS Eligibility labels (admin-editable) mapped back to the canonical
  // stored values — drives the Building page filter.
  const eligibilityOptions = buildEligibilityOptions(
    settings?.settings.eligibilityOptions as string[] | undefined,
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.rows.filter((r) => {
      if (!multiFilterMatches(r.facility.block, blockFilter)) return false;
      if (!multiFilterMatches(r.facility.facilityType, typeFilter)) return false;
      if (!multiFilterMatches(r.building?.buildingStatus ?? "", buildingStatusFilter))
        return false;
      if (!multiFilterMatches(r.facility.eligibility ?? "", eligibilityFilter))
        return false;
      // Cert_Cycle — cycle number of the active cycle ("#none" rows without
      // a cycle remain selectable so un-filtering is easy).
      if (
        !multiFilterMatches(
          r.cycleNumber ? String(r.cycleNumber) : "#none",
          cycleFilter,
        )
      )
        return false;
      // State Assessment page extras: status + start date range.
      if (
        categoryId === "sa" &&
        !multiFilterMatches(r.sa?.status ?? "", saStatusFilter)
      )
        return false;
      if (
        categoryId === "sa" &&
        !isoInRange(
          r.sa?.actualStartDate ?? r.sa?.scheduledDate ?? null,
          saStartFrom,
          saStartTo,
        )
      )
        return false;
      // NQAS Certification page extras: GOI letter / certification date
      // range + NQAS assessment start date range.
      if (categoryId === "certification") {
        if (
          !isoInRange(
            r.nqas?.goiLetterDate ?? r.nqas?.certificationDate ?? null,
            goiFrom,
            goiTo,
          )
        )
          return false;
        if (
          !isoInRange(
            r.nqas?.scheduledStartDate ?? null,
            naStartFrom,
            naStartTo,
          )
        )
          return false;
      }
      if (
        categoryId === "certification" &&
        !multiFilterMatches(
          r.facility.statusOverride || r.facility.currentStatus || "—",
          pipelineFilter,
        )
      )
        return false;
      if (
        categoryId === "certification" &&
        !multiFilterMatches(r.nqas?.certificationStatus ?? "", certFilter)
      )
        return false;
      if (
        categoryId === "sa" &&
        !multiFilterMatches(r.sa?.generalDocStatus ?? "", docFilter)
      )
        return false;
      if (
        categoryId === "noc" &&
        !multiFilterMatches(
          deriveFireNocStatus(
            r.noc?.nocAvailable || null,
            r.noc?.expiryDate ?? null,
            r.noc?.status || null,
          ),
          nocStatusFilter,
        )
      )
        return false;
      if (
        q &&
        !`${r.facility.name} ${r.facility.phc} ${r.facility.block} ${r.facility.ninNumber ?? ""}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [
    data, search, blockFilter, typeFilter, buildingStatusFilter,
    eligibilityFilter, categoryId, pipelineFilter, certFilter, docFilter,
    nocStatusFilter, cycleFilter, saStatusFilter, saStartFrom, saStartTo,
    goiFrom, goiTo, naStartFrom, naStartTo,
  ]);
  const pager = usePagination(filtered, [
    search,
    blockFilter,
    typeFilter,
    buildingStatusFilter,
    eligibilityFilter,
    pipelineFilter,
    certFilter,
    docFilter,
    nocStatusFilter,
    cycleFilter,
    saStatusFilter,
    saStartFrom,
    saStartTo,
    goiFrom,
    goiTo,
    naStartFrom,
    naStartTo,
  ]);

  const isAdminLogin = data?.me.appRole === "admin";
  const hiddenCategories: string[] = isAdminLogin
    ? []
    : ((settings?.settings.hiddenCategories as string[] | undefined) ??
      DEFAULT_SETTINGS.hiddenCategories);

  // Direct URL access to a hidden category is blocked too — visibility
  // removes the nav links, it does not leave the page open by URL. The
  // State Admin always keeps access so pages can be un-hidden.
  if (categoryId && hiddenCategories.includes(categoryId)) {
    return (
      <AppShell title="Page hidden" subtitle="This page has been hidden by the State Admin">
        <p className="text-sm text-muted-foreground">
          This facility data page is currently not visible. {" "}
          <Link to="/facilities" className="text-primary underline">
            Back to Facility Master List
          </Link>
        </p>
      </AppShell>
    );
  }

  if (!categoryId) {
    return (
      <AppShell title="Not found" subtitle="Unknown facility data category">
        <p className="text-sm text-muted-foreground">
          This category does not exist. {" "}
          <Link to="/facilities" className="text-primary underline">
            Back to Facility Master List
          </Link>
        </p>
      </AppShell>
    );
  }
  const meta = CATEGORY_META[categoryId];
  const columns = CATEGORY_COLUMN_IDS[categoryId as TrackerCategoryId];

  const headerOverrides = withOverrides(
    columns.map((c) => TRACKER_COLUMN_LABELS[c]),
    settings?.settings.tableHeaderOverrides as Record<string, string> | undefined,
  );

  // Excel / PDF exports of this category's visible columns (current
  // filters applied), mirroring the on-screen quick view.
  const exportExcelPage = () => {
    exportExcel(
      `${categoryId}-view-${new Date().toISOString().slice(0, 10)}.xlsx`,
      meta.label.slice(0, 31),
      exportHeaders(columns, settings?.settings.tableHeaderOverrides),
      exportRows(filtered, columns, {
        ...DEFAULT_SETTINGS,
        ...(settings?.settings ?? {}),
      } as LifecycleSettings),
    );
    toast.success("Excel downloaded");
  };
  const exportPdfPage = () => {
    exportPdf(
      `${categoryId}-view-${new Date().toISOString().slice(0, 10)}.pdf`,
      meta.label,
      exportHeaders(columns, settings?.settings.tableHeaderOverrides),
      exportRows(filtered, columns, {
        ...DEFAULT_SETTINGS,
        ...(settings?.settings ?? {}),
      } as LifecycleSettings),
      `${filtered.length} facilities · generated ${new Date().toLocaleString()}`,
    );
    toast.success("PDF downloaded");
  };

  const canEdit = data?.me.appRole === "admin" || data?.me.appRole === "entry";

  return (
    <AppShell
      title={meta.label}
      titleIcon={CATEGORY_ICONS[meta.icon]}
      subtitle="Quick view — only this category's columns are shown"
      actions={
        <HeaderExportMenu
          disabled={!data || data.rows.length === 0}
          onExcel={exportExcelPage}
          onPdf={exportPdfPage}
          excelLabel={`${meta.label} — Excel`}
          pdfLabel={`${meta.label} — PDF`}
        />
      }
    >
      {data === undefined ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <CategoryNav active={categoryId} />

          <FilterBar
            activeCount={
              countActiveFilters([
                blockFilter,
                typeFilter,
                pipelineFilter,
                certFilter,
                docFilter,
                nocStatusFilter,
                buildingStatusFilter,
                eligibilityFilter,
                cycleFilter,
                saStatusFilter,
                saStartFrom,
                saStartTo,
                goiFrom,
                goiTo,
                naStartFrom,
                naStartTo,
              ]) + (search.trim() ? 1 : 0)
            }
            onClearAll={() => {
              setSearch("");
              setBlockFilter([]);
              setTypeFilter([]);
              setPipelineFilter([]);
              setCertFilter([]);
              setDocFilter([]);
              setNocStatusFilter([]);
              setBuildingStatusFilter([]);
              setEligibilityFilter([]);
              setCycleFilter([]);
              setSaStatusFilter([]);
              setSaStartFrom("");
              setSaStartTo("");
              setGoiFrom("");
              setGoiTo("");
              setNaStartFrom("");
              setNaStartTo("");
            }}
            summary={`Showing ${pager.total} of ${data.rows.length} facilities`}
          >
            <FilterSearch
              value={search}
              onChange={setSearch}
              placeholder="Search facility, PHC, block or NIN…"
            />
            <FilterDropdown
              label="Block"
              options={(data?.blocks ?? []).map((b) => ({ value: b.name, label: b.name }))}
              value={blockFilter}
              onChange={(v) => setBlockFilter(v)}
              triggerWidth="w-44"
            />
            <FilterDropdown
              label="Facility type"
              options={facilityTypes.map((t) => ({ value: t, label: t }))}
              value={typeFilter}
              onChange={(v) => setTypeFilter(v)}
              triggerWidth="w-44"
            />
            {/* Certification Cycle — the shared control. It renders only on
                cycle pages (State Assessment, NQAS Certification,
                Recertification) and stays absent on IA / funds / building /
                Fire NOC. */}
            <CycleFilter />
            <FilterDropdown
              label="NQAS Eligibility"
              options={eligibilityOptions.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              value={eligibilityFilter}
              onChange={(v) => setEligibilityFilter(v)}
              triggerWidth="w-48"
            />
            {categoryId === "certification" && (
              <>
                <FilterDropdown
                  label={FACILITY_CURRENT_STATUS_LABEL}
                  options={[
                    ...new Set(
                      data.rows.map(
                        (r) => r.facility.statusOverride || r.facility.currentStatus || "—",
                      ),
                    ),
                  ]
                    .sort()
                    .map((s) => ({ value: s, label: s }))}
                  value={pipelineFilter}
                  onChange={(v) => setPipelineFilter(v)}
                  triggerWidth="w-52"
                />
                <FilterDropdown
                  label="Certification status"
                  options={[...certStatusOptions].sort().map((s) => ({ value: s, label: s }))}
                  value={certFilter}
                  onChange={(v) => setCertFilter(v)}
                  triggerWidth="w-56"
                />
                <DateRangeFilter
                  label="GOI / Cert date"
                  from={goiFrom}
                  to={goiTo}
                  onFrom={setGoiFrom}
                  onTo={setGoiTo}
                />
                <DateRangeFilter
                  label="NA start"
                  from={naStartFrom}
                  to={naStartTo}
                  onFrom={setNaStartFrom}
                  onTo={setNaStartTo}
                />
              </>
            )}
            {categoryId === "sa" && (
              <>
                <FilterDropdown
                  label="SaQsham documents status"
                  options={[...docStatusOptions].sort().map((s) => ({ value: s, label: s }))}
                  value={docFilter}
                  onChange={(v) => setDocFilter(v)}
                  triggerWidth="w-56"
                />
                <FilterDropdown
                  label="State Assessment Status"
                  options={[
                    ...new Set(
                      data.rows
                        .map((r) => r.sa?.status ?? "")
                        .filter((s) => !!s),
                    ),
                  ]
                    .sort()
                    .map((s) => ({ value: s, label: s }))}
                  value={saStatusFilter}
                  onChange={(v) => setSaStatusFilter(v)}
                  triggerWidth="w-56"
                />
                <DateRangeFilter
                  label="SA start"
                  from={saStartFrom}
                  to={saStartTo}
                  onFrom={setSaStartFrom}
                  onTo={setSaStartTo}
                />
              </>
            )}
            {categoryId === "noc" && (
              <FilterDropdown
                label="Fire NOC validity"
                options={["Valid", "Expiring Soon", "Expired", "Not Obtained"].map((s) => ({
                  value: s,
                  label: s,
                }))}
                value={nocStatusFilter}
                onChange={(v) => setNocStatusFilter(v)}
                triggerWidth="w-52"
              />
            )}
            {categoryId === "building" && (
              <FilterDropdown
                label="Building status"
                options={buildingStatusOptions.map((t) => ({ value: t, label: t }))}
                value={buildingStatusFilter}
                onChange={(v) => setBuildingStatusFilter(v)}
                triggerWidth="w-52"
              />
            )}
            <RowViewSelect value={pager.view} onChange={pager.setView} total={pager.total} />
          </FilterBar>

          <AutoFitTableScroll
            className="glass"
            maxHeight="calc(100vh - 160px)"
            minHeight="480px"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-20 border-r bg-background">Facility</TableHead>
                  <TableHead className="min-w-32">Block</TableHead>
                  <TableHead className="min-w-32">PHC</TableHead>
                  <TableHead>NIN</TableHead>
                  <TableHead className="min-w-20">Type</TableHead>
                  <TableHead className="min-w-32 text-center">Certification Cycle</TableHead>
                  <TableHead className="min-w-40">NQAS Eligibility</TableHead>
                  {columns.map((c, i) => (
                    <TableHead key={c} className={TRACKER_COLUMN_WIDTHS[c]}>
                      {headerOverrides[i]}
                    </TableHead>
                  ))}
                  <TableHead className="sticky right-0 z-10 min-w-32 border-l bg-background text-right">
                    Update
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7 + columns.length + (canEdit ? 1 : 0)}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No facilities match your filters.
                    </TableCell>
                  </TableRow>
                )}
                {pager.visible.map((r) => (
                  <CategoryRow
                    key={r.facility._id}
                    row={r}
                    columns={columns}
                    settings={settings?.settings}
                    canEdit={canEdit}
                  />
                ))}
              </TableBody>
            </Table>
          </AutoFitTableScroll>
          <PaginationBar
            total={pager.total}
            view={pager.view}
            page={pager.page}
            onPage={pager.setPage}
          />
        </>
      )}
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* one editable row                                                    */
/* ------------------------------------------------------------------ */

/** Read-only badge used when the viewer cannot edit eligibility — same
 *  color coding as the master list. */
function EligibilityBadge({
  value,
  options,
}: {
  value: "Eligible" | "Not Eligible" | "Possible" | undefined;
  options: { value: "Eligible" | "Not Eligible" | "Possible"; label: string }[];
}) {
  const label = options.find((o) => o.value === value)?.label ?? value ?? "";
  return value === "Eligible" ? (
    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
      {label || "Eligible"}
    </Badge>
  ) : value === "Possible" ? (
    <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">
      {label || "Future Candidate"}
    </Badge>
  ) : value ? (
    <Badge variant="outline" className="border-rose-200 text-rose-700">
      {label}
    </Badge>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

function CategoryRow({
  row,
  columns,
  settings,
  canEdit,
}: {
  row: TrackerRow;
  columns: TrackerColumnId[];
  settings?: Record<string, unknown>;
  canEdit: boolean;
}) {
  const updateTrackerRow = useMutation(api.facilities.updateTrackerRow);
  const updateEligibility = useMutation(api.facilityOps.updateFacilityEligibility);

  const initial = useMemo<Draft>(() => {
    const f = row.facility;
    return {
      certStatus: row.nqas?.certificationStatus ?? "",
      certDate: row.nqas?.certificationDate ?? "",
      certScore: row.nqas?.scorePercent?.toString() ?? "",
      naScheduled: row.nqas?.scheduledStartDate ?? "",
      naEnd: row.nqas?.actualEndDate ?? row.nqas?.scheduledEndDate ?? "",
      naMode: row.nqas?.mode ?? "",
      departments: (row.nqas?.departments ?? []).join(", "),
      gapAmount: row.fund?.amountSanctioned?.toString() ?? "",
      gcYear: row.fund?.financialYear ?? "",
      nqasIaQ1: f.nqasIaQ1?.toString() ?? "",
      nqasIaQ2: f.nqasIaQ2?.toString() ?? "",
      kayakalpIaQ1: f.kayakalpIaQ1?.toString() ?? "",
      kayakalpIaQ2: f.kayakalpIaQ2?.toString() ?? "",
      saStatus: row.sa?.status ?? "",
      saScore: row.sa?.scorePercent?.toString() ?? "",
      saAssessor1: row.sa?.assessor1Name ?? "",
      saAssessor1Hud: row.sa?.assessor1Hud ?? "",
      saAssessor2: row.sa?.assessor2Name ?? "",
      saAssessor2Hud: row.sa?.assessor2Hud ?? "",
      saStart: row.sa?.actualStartDate ?? row.sa?.scheduledDate ?? "",
      saEnd: row.sa?.actualEndDate ?? "",
      genDoc: row.sa?.generalDocStatus ?? "",
      surv1: row.nqas?.surveillanceDone1 ?? "",
      surv2: row.nqas?.surveillanceDone2 ?? "",
      survScore: row.nqas?.manualScore?.toString() ?? "",
      buildingType: row.building?.buildingType ?? "",
      buildingStatus: row.building?.buildingStatus ?? "",
      nocAvailable: row.noc?.nocAvailable ?? "",
      nocStatus: row.noc?.status ?? "",
      nocCertified: row.noc?.issuedDate ?? "",
      nocValidity: row.noc?.expiryDate ?? "",
      remarks: f.remarks ?? "",
    } as Draft;
  }, [row]);

  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [fundFile, setFundFile] = useState<AttachmentValue | null>(null);
  const [nocFile, setNocFile] = useState<AttachmentValue | null>(null);
  const [condemnedFile, setCondemnedFile] = useState<AttachmentValue | null>(null);
  const [saReportFile, setSaReportFile] = useState<AttachmentValue | null>(null);
  const [saChecklistFile, setSaChecklistFile] = useState<AttachmentValue | null>(null);
  const [fundClear, setFundClear] = useState(false);
  const [nocClear, setNocClear] = useState(false);
  const [condemnedClear, setCondemnedClear] = useState(false);
  const [saReportClear, setSaReportClear] = useState(false);
  const [saChecklistClear, setSaChecklistClear] = useState(false);
  const [resultFile, setResultFile] = useState<AttachmentValue | null>(null);
  const [resultClear, setResultClear] = useState(false);

  // Follow server updates (React's "adjust state during render" pattern —
  // same behaviour as the previous setState-in-effect, no post-paint flash).
  const [lastInitial, setLastInitial] = useState(initial);
  if (lastInitial !== initial) {
    setLastInitial(initial);
    setDraft(initial);
  }

  // A staged file pick or pending Remove marks the row dirty so the Update
  // button enables (matches the master list behavior).
  const filesDirty =
    !!fundFile || !!nocFile || !!condemnedFile || !!saReportFile ||
    !!saChecklistFile || !!resultFile ||
    fundClear || nocClear || condemnedClear || saReportClear ||
    saChecklistClear || resultClear;
  const dirty =
    DRAFT_KEYS.some((k) => draft[k] !== initial[k]) || filesDirty;
  // Date-primary Fire NOC status for this row (mirrors convex/lifecycle.ts).
  const derivedNocStatus = deriveFireNocStatus(
    draft.nocAvailable || null,
    draft.nocValidity || null,
    initial.nocStatus || null,
  );
  const set = (k: DraftKey, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  // Eligibility is staged like the other columns: picking a value only marks
  // the row dirty — the change commits when Update is clicked.
  const [eligDraft, setEligDraft] = useState<string | null>(null);
  const eligValue = eligDraft ?? row.facility.eligibility;
  const eligDirty =
    eligDraft !== null && eligDraft !== row.facility.eligibility;

  const buildingTypes =
    (settings?.buildingTypes as string[] | undefined) ?? [
      "Own Building",
      "Rented Building",
      "Rent Free Building",
    ];
  const docStatuses =
    (settings?.generalDocStatuses as string[] | undefined) ??
    DEFAULT_SETTINGS.generalDocStatuses;
  const assessmentModes =
    (settings?.assessmentModes as string[] | undefined) ?? [
      "Physical",
      "Virtual",
      "Hybrid",
    ];
  const buildingStatuses =
    (settings?.buildingStatuses as string[] | undefined) ?? [
      "Good",
      "Needs Repair",
      "Under Renovation",
      "Dilapidated",
    ];
  // NQAS Eligibility labels (admin-editable) mapped back to the canonical
  // stored values for the row's dropdown/badge.
  const eligibilityOptions = buildEligibilityOptions(
    settings?.eligibilityOptions as string[] | undefined,
  );
  // "Fire NOC Validity Status" is read-only — derived from the Fire NOC
  // Validity date, not hand-picked (mirrors convex/lifecycle.ts).
  const departmentOptions =
    (settings?.departmentCriteria as string[] | undefined) ??
    DEFAULT_SETTINGS.departmentCriteria;
  const certStatusOptions =
    (settings?.certificationStatuses as string[] | undefined) ??
    DEFAULT_SETTINGS.certificationStatuses;
  const assessorHudOptions =
    (settings?.assessorHuds as string[] | undefined) ??
    DEFAULT_SETTINGS.assessorHuds;
  const saStatusOptions =
    (settings?.saStatuses as string[] | undefined) ??
    DEFAULT_SETTINGS.saStatuses;
  const nocAvailableOptions =
    (settings?.nocAvailableOptions as string[] | undefined) ??
    DEFAULT_SETTINGS.nocAvailableOptions;
  const save = async () => {
    if (!dirty && !eligDirty) return;
    setBusy(true);
    try {
      const num = (v: string) => (v.trim() ? Number(v) : undefined);
      const str = (v: string) => (v.trim() ? v : undefined);
      await updateTrackerRow({
        facilityId: row.facility._id as never,
        remarks: draft.remarks !== initial.remarks ? str(draft.remarks) : undefined,
        nqasIaQ1: draft.nqasIaQ1 !== initial.nqasIaQ1 ? num(draft.nqasIaQ1) : undefined,
        nqasIaQ2: draft.nqasIaQ2 !== initial.nqasIaQ2 ? num(draft.nqasIaQ2) : undefined,
        kayakalpIaQ1:
          draft.kayakalpIaQ1 !== initial.kayakalpIaQ1 ? num(draft.kayakalpIaQ1) : undefined,
        kayakalpIaQ2:
          draft.kayakalpIaQ2 !== initial.kayakalpIaQ2 ? num(draft.kayakalpIaQ2) : undefined,
        certStatus:
          draft.certStatus !== initial.certStatus
            ? ((draft.certStatus || undefined) as never)
            : undefined,
        certDate: draft.certDate !== initial.certDate ? str(draft.certDate) : undefined,
        certScore: draft.certScore !== initial.certScore ? num(draft.certScore) : undefined,
        naScheduledDate:
          draft.naScheduled !== initial.naScheduled ? str(draft.naScheduled) : undefined,
        naEndDate: draft.naEnd !== initial.naEnd ? str(draft.naEnd) : undefined,
        naMode:
          draft.naMode !== initial.naMode ? ((str(draft.naMode) || undefined) as never) : undefined,
        naDepartments:
          draft.departments !== initial.departments ? draft.departments : undefined,
        gapClosureAmount:
          draft.gapAmount !== initial.gapAmount ? num(draft.gapAmount) : undefined,
        gcFundYear: draft.gcYear !== initial.gcYear ? str(draft.gcYear) : undefined,
        saStatus:
          draft.saStatus !== initial.saStatus
            ? ((draft.saStatus || undefined) as never)
            : undefined,
        saScore: draft.saScore !== initial.saScore ? num(draft.saScore) : undefined,
        saAssessor1Name:
          draft.saAssessor1 !== initial.saAssessor1 ? str(draft.saAssessor1) : undefined,
        saAssessor1Hud:
          draft.saAssessor1Hud !== initial.saAssessor1Hud ? str(draft.saAssessor1Hud) : undefined,
        saAssessor2Name:
          draft.saAssessor2 !== initial.saAssessor2 ? str(draft.saAssessor2) : undefined,
        saAssessor2Hud:
          draft.saAssessor2Hud !== initial.saAssessor2Hud ? str(draft.saAssessor2Hud) : undefined,
        saStartDate: draft.saStart !== initial.saStart ? str(draft.saStart) : undefined,
        saEndDate: draft.saEnd !== initial.saEnd ? str(draft.saEnd) : undefined,
        generalDocStatus:
          draft.genDoc !== initial.genDoc ? ((str(draft.genDoc) || undefined) as never) : undefined,
        surveillanceDone1: draft.surv1 !== initial.surv1 ? str(draft.surv1) : undefined,
        surveillanceDone2: draft.surv2 !== initial.surv2 ? str(draft.surv2) : undefined,
        manualScore:
          draft.survScore !== initial.survScore ? num(draft.survScore) : undefined,
        buildingType:
          draft.buildingType !== initial.buildingType ? str(draft.buildingType) : undefined,
        buildingStatus:
          draft.buildingStatus !== initial.buildingStatus ? str(draft.buildingStatus) : undefined,
        nocAvailable:
          draft.nocAvailable !== initial.nocAvailable ? str(draft.nocAvailable) : undefined,
        fireNocIssuedDate:
          draft.nocCertified !== initial.nocCertified ? str(draft.nocCertified) : undefined,
        fireNocValidity:
          draft.nocValidity !== initial.nocValidity ? str(draft.nocValidity) : undefined,
        fundAttachmentId: fundFile?.attachmentId as never,
        fundAttachmentName: fundFile?.attachmentName,
        fundAttachmentType: fundFile?.attachmentType,
        clearFundAttachment: !fundFile && fundClear,
        // Anchor: a Remove-only save must still enter the fund section (its
        // wants-gate ignores the clear flag), so pass the current status.
        fundStatus:
          !fundFile && fundClear ? (row.fund?.status ?? undefined) : undefined,
        nocAttachmentId: nocFile?.attachmentId as never,
        nocAttachmentName: nocFile?.attachmentName,
        nocAttachmentType: nocFile?.attachmentType,
        clearNocAttachment: !nocFile && nocClear,
        // Same anchor for the NOC section.
        fireNocStatus:
          !nocFile && nocClear ? initial.nocStatus || undefined : undefined,
        condemnedAttachmentId: condemnedFile?.attachmentId as never,
        condemnedAttachmentName: condemnedFile?.attachmentName,
        condemnedAttachmentType: condemnedFile?.attachmentType,
        clearCondemnedAttachment: !condemnedFile && condemnedClear,
        saReportAttachmentId: saReportFile?.attachmentId as never,
        saReportAttachmentName: saReportFile?.attachmentName,
        saReportAttachmentType: saReportFile?.attachmentType,
        saChecklistAttachmentId: saChecklistFile?.attachmentId as never,
        saChecklistAttachmentName: saChecklistFile?.attachmentName,
        saChecklistAttachmentType: saChecklistFile?.attachmentType,
        clearSaReportAttachment: !saReportFile && saReportClear,
        clearSaChecklistAttachment: !saChecklistFile && saChecklistClear,
        resultAttachmentId: resultFile?.attachmentId as never,
        resultAttachmentName: resultFile?.attachmentName,
        resultAttachmentType: resultFile?.attachmentType,
        clearResultAttachment: !resultFile && resultClear,
      });
      // Commit the staged eligibility change (if any) — the dropdown only
      // marks the row dirty; Update is what persists it.
      if (eligDirty && eligValue) {
        await updateEligibility({
          facilityId: row.facility._id as never,
          eligibility: eligValue as "Eligible" | "Not Eligible" | "Possible",
        });
        setEligDraft(null);
      }
      setFundFile(null);
      setNocFile(null);
      setCondemnedFile(null);
      setSaReportFile(null);
      setSaChecklistFile(null);
      setFundClear(false);
      setNocClear(false);
      setCondemnedClear(false);
      setSaReportClear(false);
      setSaChecklistClear(false);
      setResultFile(null);
      setResultClear(false);
      toast.success("Row updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
      setDraft(initial);
      setEligDraft(null);
    } finally {
      setBusy(false);
    }
  };

  const input = (k: DraftKey, type = "text", step?: string) => (
    <Input
      type={type}
      step={step}
      className="glass-input h-8 w-full text-xs"
      value={draft[k]}
      disabled={busy || !canEdit}
      onChange={(e) => set(k, e.target.value)}
    />
  );

  const select = (k: DraftKey, options: string[], allowEmpty = true) => (
    <Select
      value={draft[k]}
      disabled={busy || !canEdit}
      onValueChange={(v) => set(k, v === "__none" ? "" : v)}
    >
      <SelectTrigger className="glass-input h-8 w-full text-xs">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="__none">—</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const cell = (c: TrackerColumnId) => {
    switch (c) {
      /* ---- NQAS Certification ---- */
      case "pipelineStatus":
        return (
          <div className="space-y-1">
            <StatusBadge
              status={row.facility.statusOverride || row.facility.currentStatus || "—"}
            />
            <span
              className="block text-[10px] leading-tight text-muted-foreground"
              data-tip="Merged facility current status derived from SA, documents and NQAS"
            >
              {mergedPipelineStatus(
                row.facility,
                row.sa
                  ? {
                      status: row.sa.status ?? "Not Yet Initiated",
                      generalDocStatus: row.sa.generalDocStatus ?? null,
                    }
                  : null,
                row.nqas
                  ? {
                      status: row.nqas.status ?? "Pending",
                      scheduledStartDate: row.nqas.scheduledStartDate ?? null,
                      certificationStatus: row.nqas.certificationStatus ?? null,
                      validityDate: row.nqas.validityDate ?? null,
                    }
                  : null,
                { ...DEFAULT_SETTINGS, ...(settings?.settings ?? {}) },
              )}
            </span>
          </div>
        );
      case "certStatus":
        return select("certStatus", certStatusOptions);
      case "certDate":
        return input("certDate", "date");
      case "certScore":
        return input("certScore", "number", "any");
      case "resultDoc":
        return (
          <CellUpload
            id={row.resultDocumentId ?? null}
            name={row.resultDocumentName ?? null}
            value={resultFile}
            onChange={(v) => {
              setResultFile(v);
              setResultClear(false);
            }}
            onClear={() => setResultClear(true)}
            disabled={busy || !canEdit}
            hint={
              row.resultDocumentUpdatedAt || resultClear
                ? `Updated: ${resultClear ? "removing…" : toDisplayDateTime(row.resultDocumentUpdatedAt ?? null)}`
                : null
            }
          />
        );
      /* ---- NQAS Assessment ---- */
      case "naScheduled":
        return input("naScheduled", "date");
      case "naEnd":
        return input("naEnd", "date");
      case "naMode":
        return select("naMode", assessmentModes);
      case "departments":
        return select("departments", departmentOptions, true);
      /* ---- Gap Closure Fund ---- */
      case "gapAmount":
        return input("gapAmount", "number");
      case "gcYear":
        return input("gcYear");
      case "procLink":
        return (
          <CellUpload
            id={row.fund?.fundAttachmentId ?? null}
            name={row.fund?.fundAttachmentName ?? null}
            value={fundFile}
            onChange={(v) => {
              setFundFile(v);
              setFundClear(false);
            }}
            onClear={() => setFundClear(true)}
            disabled={busy || !canEdit}
            hint={
              row.fund?.updatedAt || fundClear
                ? `Updated: ${fundClear ? "removing…" : toDisplayDateTime(row.fund?.updatedAt ?? null)}`
                : null
            }
          />
        );
      /* ---- Internal Assessment ---- */
      case "nqasIaQ1":
        return input("nqasIaQ1", "number", "any");
      case "nqasIaQ2":
        return input("nqasIaQ2", "number", "any");
      case "nqasIaCmp":
        return (
          <div className="text-center">
            <ComparisonCell q1={row.facility.nqasIaQ1 ?? null} q2={row.facility.nqasIaQ2 ?? null} />
          </div>
        );
      case "kayakalpIaQ1":
        return input("kayakalpIaQ1", "number", "any");
      case "kayakalpIaQ2":
        return input("kayakalpIaQ2", "number", "any");
      case "kayakalpIaCmp":
        return (
          <div className="text-center">
            <ComparisonCell
              q1={row.facility.kayakalpIaQ1 ?? null}
              q2={row.facility.kayakalpIaQ2 ?? null}
            />
          </div>
        );
      /* ---- State Assessment ---- */
      case "saStatus":
        return select("saStatus", saStatusOptions);
      case "saScore":
        return input("saScore", "number", "any");
      case "saAssessor1":
        return input("saAssessor1");
      case "saAssessor1Hud":
        return select("saAssessor1Hud", assessorHudOptions);
      case "saAssessor2":
        return input("saAssessor2");
      case "saAssessor2Hud":
        return select("saAssessor2Hud", assessorHudOptions);
      case "saReport":
        return (
          <CellUpload
            id={row.sa?.reportAttachmentId ?? null}
            name={row.sa?.reportAttachmentName ?? null}
            value={saReportFile}
            onChange={(v) => {
              setSaReportFile(v);
              setSaReportClear(false);
            }}
            onClear={() => setSaReportClear(true)}
            disabled={busy || !canEdit}
          />
        );
      case "saChecklist":
        return (
          <CellUpload
            id={row.sa?.checklistAttachmentId ?? null}
            name={row.sa?.checklistAttachmentName ?? null}
            value={saChecklistFile}
            onChange={(v) => {
              setSaChecklistFile(v);
              setSaChecklistClear(false);
            }}
            onClear={() => setSaChecklistClear(true)}
            disabled={busy || !canEdit}
          />
        );
      case "saStart":
        return input("saStart", "date");
      case "saEnd":
        return input("saEnd", "date");
      case "genDoc":
        return select("genDoc", docStatuses);
      /* ---- Recertification / surveillance ---- */
      case "survDue1":
        return (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {row.nqas?.surveillanceDue1 ? toDisplayDate(row.nqas.surveillanceDue1) : "—"}
          </span>
        );
      case "surv1":
        return input("surv1", "date");
      case "survDue2":
        return (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {row.nqas?.surveillanceDue2 ? toDisplayDate(row.nqas.surveillanceDue2) : "—"}
          </span>
        );
      case "surv2":
        return input("surv2", "date");
      case "survScore":
        return input("survScore", "number", "any");
      case "validityDate":
        return (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {row.nqas?.validityDate ? toDisplayDate(row.nqas.validityDate) : "—"}
          </span>
        );
      case "recertStatus":
        return (
          <span className="text-xs break-words text-muted-foreground [white-space:normal]">
            {row.nqas?.recertStatus ?? "—"}
          </span>
        );
      case "recertYear":
        return (
          <span className="text-xs tabular-nums text-muted-foreground">
            {row.nqas?.recertYear ?? "—"}
          </span>
        );
      /* ---- Building ---- */
      case "buildingType":
        return select("buildingType", buildingTypes);
      case "buildingStatus":
        return (
          <div className="space-y-1">
            {select("buildingStatus", buildingStatuses)}
            <span className="block text-[10px] leading-tight text-muted-foreground">
              Updated:{" "}
              {row.building?.lastUpdatedAt
                ? toDisplayDateTime(row.building.lastUpdatedAt)
                : "—"}
            </span>
          </div>
        );
      case "condemned":
        return (
          <CellUpload
            id={row.building?.condemnedAttachmentId ?? null}
            name={row.building?.condemnedAttachmentName ?? null}
            value={condemnedFile}
            onChange={(v) => {
              setCondemnedFile(v);
              setCondemnedClear(false);
            }}
            onClear={() => setCondemnedClear(true)}
            disabled={busy || !canEdit}
          />
        );
      /* ---- Fire NOC ---- */
      case "nocAvailable":
        return select("nocAvailable", nocAvailableOptions);
      case "nocStatus":
        return <StatusBadge status={derivedNocStatus} />;
      case "nocCertified":
        return input("nocCertified", "date");
      case "nocValidity":
        return input("nocValidity", "date");
      case "nocDoc":
        return (
          <CellUpload
            id={row.noc?.nocAttachmentId ?? null}
            name={row.noc?.nocAttachmentName ?? null}
            value={nocFile}
            onChange={(v) => {
              setNocFile(v);
              setNocClear(false);
            }}
            onClear={() => setNocClear(true)}
            disabled={busy || !canEdit}
            hint={
              row.noc?.updatedAt || nocClear
                ? `Updated: ${nocClear ? "removing…" : toDisplayDateTime(row.noc?.updatedAt ?? null)}`
                : null
            }
          />
        );
      case "remarks":
        return (
          <Textarea
            rows={2}
            className="glass-input min-h-8 w-full resize-y text-xs [field-sizing:content]"
            value={draft.remarks}
            disabled={busy || !canEdit}
            onChange={(e) => set("remarks", e.target.value)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <TableRow className={dirty || eligDirty ? "bg-primary/5" : undefined}>
      <TableCell className="sticky left-0 z-20 border-r bg-background">
        <Link
          to={`/facilities/${row.facility._id}`}
          className="block break-words font-medium hover:underline"
          data-tip={row.facility.name}
        >
          {row.facility.name}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">{row.facility.block}</TableCell>
      <TableCell className="text-muted-foreground">{row.facility.phc}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {row.facility.ninNumber ?? "—"}
      </TableCell>
      <TableCell>
        <FacilityTypeBadge type={row.facility.facilityType} />
      </TableCell>      <TableCell className="text-center">
        <CycleBadge cycleNumber={row.cycleNumber} cycleType={row.cycleType} />
      </TableCell>
                  {/* NQAS Eligible / In-Eligible — staged dropdown; the change
                      commits when the row's Update button is clicked. */}
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={eligValue}
                        disabled={busy}
                        onValueChange={(v) => setEligDraft(v)}
                      >
                        <SelectTrigger className="glass-input h-8 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibilityOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <EligibilityBadge
                        value={row.facility.eligibility}
                        options={eligibilityOptions}
                      />
                    )}
                  </TableCell>

      {columns.map((c) => (
        <TableCell key={c} className={TRACKER_COLUMN_WIDTHS[c]}>
          {cell(c)}
        </TableCell>
      ))}

      <TableCell className="sticky right-0 z-10 border-l bg-background">
        <div className="flex items-center justify-end">
          {canEdit ? (
            <Button
              size="sm"
              disabled={busy || (!dirty && !eligDirty)}
              data-tip={dirty || eligDirty ? "Save changes in this row" : "No changes"}
              onClick={save}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Update
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">View only</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
