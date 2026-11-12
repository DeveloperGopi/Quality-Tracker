import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { FieldGrid } from "@/pages/FacilityList";
import {
  AttachmentPicker,
  AttachmentLink,
  type AttachmentValue,
} from "@/components/AttachmentPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  History,
  IndianRupee,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toDisplayDate, toDisplayDateTime } from "@/lib/format";
import { showSaveError, throwIfSaveFailed } from "@/lib/saveError";
import { deriveFireNocStatus, todayLocalIso } from "@/lib/today";
import { DEFAULT_SETTINGS } from "@/convex/lifecycle";
import { LifecycleStepper } from "@/components/LifecycleStepper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip, ToneBar, ToneIcon, type Tone } from "@/components/StatusChip";
import { useAuth } from "@/hooks/use-auth";
import {
  getLifecycleState,
  profileCompleteness,
  toDdMmmYyyy,
  type LifecycleState,
  type ProfileNqas,
  type ProfileSa,
} from "@/lib/facilityProfileState";
import {
  buildProfileExportData,
  exportExcelWorkbook,
  exportProfileExcel,
  istStamp,
  type ProfileExportData,
} from "@/lib/profileExport";
import { masterRowFromProfile } from "@/lib/profileSheetRow";
import { DocumentStatusCard } from "@/components/documents/DocumentStatusCard";
import { CycleHistoryPanel } from "@/components/profile/CycleHistoryPanel";
import type { DocKey } from "@/convex/storage/validation";
import { DateInput } from "@/components/DateInput";
import { openPrintSheet } from "@/lib/printSheet";
import { loadLastListUrl } from "@/lib/listSessionState";
import {
  dueChip,
  formatInr,
  needsAttention,
  nextSurveillance,
  sectionSummaries,
} from "@/lib/facilityProfileRules";
import {
  CycleSwitcher,
  NeedsAttentionPanel,
  RecentActivity,
  RingGauge,
  SectionSummaryCard,
} from "@/components/profile/OverviewPanels";
import { SaForm, NqasForm } from "@/components/profile/AssessmentForms";
import { IaQuarterlyPanel } from "@/components/ia/IaQuarterlyPanel";
import { focusField } from "@/components/profile/ProfileFormKit";

const ELIGIBILITIES = ["Eligible", "Not Eligible", "Possible"] as const;

export default function FacilityProfile() {
  // The profile lives on the splat route `/facilities/*` (shared with the
  // category quick-view pages via FacilityRouteDispatcher), so the id comes
  // from the wildcard param — reading `:facilityId` here always returned
  // undefined and left the profile query on "skip" forever (endless spinner).
  const params = useParams<{ "*": string }>();
  const facilityId = params["*"]?.split("/")[0] || null;
  const navigate = useNavigate();
  const data = useQuery(
    api.facilities.getFacilityProfile,
    facilityId ? { facilityId: facilityId as never } : "skip",
  );
  /* The quarterly IA store — "Print facility sheet" reads it through the SAME
     adapter the Master List uses, so the sheet shows Q2 83.8 / 83.9 instead of
     the legacy Q1/Q2 columns (blank for imported facilities). */
  const iaQuarters = useQuery(
    api.ia.listFacilityIaQuarters,
    facilityId ? { facilityId: facilityId as never } : "skip",
  );
  /* The SAME document list the card, the uploader and the Quick View read —
     Convex dedupes an identical subscription, so the header chip below costs
     no extra round trip and can never disagree with the card. */
  const docs = useQuery(
    api.documents.listForFacility,
    facilityId ? { facilityId: facilityId as never } : "skip",
  );
  const updateFacility = useMutation(api.facilities.updateFacility);
  const updateSA = useMutation(api.facilities.updateStateAssessment).withOptimisticUpdate(
    (store, args) => {
      const key = { facilityId: args.facilityId };
      const profile = store.getQuery(api.facilities.getFacilityProfile, key);
      if (!profile) return;
      // The current cycle is the one this subscription renders first. Dates are
      // written for BOTH fields together so the optimistic pair can never be
      // half-filled while the server round-trip is in flight.
      store.setQuery(api.facilities.getFacilityProfile, key, {
        ...profile,
        cycles: profile.cycles.map((row) =>
          row.cycle.cycleNumber === profile.facility.currentCycleNumber && row.sa
            ? {
                ...row,
                sa: {
                  ...row.sa,
                  ...(args.status !== undefined ? { status: args.status } : {}),
                  ...(args.scheduledDate !== undefined
                    ? { scheduledDate: args.scheduledDate }
                    : {}),
                  ...(args.actualStartDate !== undefined
                    ? { actualStartDate: args.actualStartDate }
                    : {}),
                  ...(args.actualEndDate !== undefined
                    ? { actualEndDate: args.actualEndDate }
                    : {}),
                  ...(args.scopeOption !== undefined
                    ? { scopeOption: args.scopeOption }
                    : {}),
                  ...(args.scorePercent !== undefined
                    ? { scorePercent: args.scorePercent }
                    : {}),
                },
              }
            : row,
        ),
      });
    },
  );
  const ensureNqas = useMutation(api.facilities.ensureNqasRecord);
  const updateNqas = useMutation(api.facilities.updateNationalAssessment).withOptimisticUpdate(
    (store, args) => {
      const key = { facilityId: args.facilityId };
      const profile = store.getQuery(api.facilities.getFacilityProfile, key);
      if (!profile) return;
      store.setQuery(api.facilities.getFacilityProfile, key, {
        ...profile,
        cycles: profile.cycles.map((row) =>
          row.cycle.cycleNumber === profile.facility.currentCycleNumber && row.nqas
            ? {
                ...row,
                nqas: {
                  ...row.nqas,
                  ...(args.status !== undefined ? { status: args.status } : {}),
                  ...(args.scheduledStartDate !== undefined
                    ? { scheduledStartDate: args.scheduledStartDate }
                    : {}),
                  ...(args.scheduledEndDate !== undefined
                    ? { scheduledEndDate: args.scheduledEndDate }
                    : {}),
                  ...(args.actualStartDate !== undefined
                    ? { actualStartDate: args.actualStartDate }
                    : {}),
                  ...(args.actualEndDate !== undefined
                    ? { actualEndDate: args.actualEndDate }
                    : {}),
                  ...(args.mode !== undefined ? { mode: args.mode } : {}),
                  ...(args.scopeOption !== undefined
                    ? { scopeOption: args.scopeOption }
                    : {}),
                  ...(args.scorePercent !== undefined
                    ? { scorePercent: args.scorePercent }
                    : {}),
                  ...(args.certificationStatus !== undefined
                    ? { certificationStatus: args.certificationStatus }
                    : {}),
                  ...(args.certificationDate !== undefined
                    ? { certificationDate: args.certificationDate }
                    : {}),
                  ...(args.goiLetterDate !== undefined
                    ? { goiLetterDate: args.goiLetterDate }
                    : {}),
                },
              }
            : row,
        ),
      });
    },
  );
  const startNewCycle = useMutation(api.facilities.startNewCycle);
  const deleteCycle = useMutation(api.facilities.deleteCycle);
  const deleteFacility = useMutation(api.facilities.deleteFacility);
  const saveFund = useMutation(api.modules.saveFund);
  const updateFund = useMutation(api.modules.updateFund);
  const deleteFund = useMutation(api.modules.deleteFund);
  const saveNoc = useMutation(api.modules.saveFireNoc);
  const updateNoc = useMutation(api.modules.updateFireNoc);
  const deleteNoc = useMutation(api.modules.deleteFireNoc);
  const saveBuilding = useMutation(api.modules.saveBuilding);
  // Cycle start / remove both wait on the profile subscription re-syncing
  // after the mutation commits, which can feel sluggish. Each button flips
  // to a spinner instantly, shows an in-place success tick as soon as the
  // mutation resolves (before the query catches up), and reverts when the
  // fresh cycle list arrives — making the reaction feel immediate.
  const [pendingCycleAction, setPendingCycleAction] = useState<
    "start-recert" | "start-deferred" | `remove-${string}` | null
  >(null);
  const [cycleActionDone, setCycleActionDone] = useState<string | null>(null);

  const runCycleAction = async (
    key: "start-recert" | "start-deferred" | `remove-${string}`,
    successLabel: string,
    run: () => Promise<unknown>,
    // Remove unmounts its card as soon as the query re-syncs, so it also
    // keeps a toast as the visible success signal.
    toastMsg?: string,
  ) => {
    setPendingCycleAction(key);
    try {
      await run();
      if (toastMsg) toast.success(toastMsg);
      setCycleActionDone(successLabel);
      setPendingCycleAction(null);
      // Revert the success tick once the profile query has re-rendered.
      setTimeout(() => setCycleActionDone(null), 2500);
    } catch (err) {
      setPendingCycleAction(null);
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };
  const updateBuilding = useMutation(api.modules.updateBuilding);
  const deleteBuilding = useMutation(api.modules.deleteBuilding);

  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("overview");
  // Overview cycle switcher: null = the live (latest) cycle; a number = a
  // specific (possibly superseded) cycle whose summary is being viewed.
  const [overviewCycle, setOverviewCycle] = useState<number | null>(null);
  /** The ONE uploader lives inside the Document status card (the old separate
   *  Documents section is gone) — this only scrolls to that card and, when a
   *  type is given, preselects it in the card's "File as" tray. */
  const [docPreselect, setDocPreselect] = useState<DocKey | null>(null);
  /* `/documents` → "Upload" links here with `?doc=SA_Checklist`: scroll to the
     card and preselect the type in its one uploader. */
  const [searchParams] = useSearchParams();
  const deepDoc = searchParams.get("doc");
  const deepOpened = useRef<string | null>(null);
  useEffect(() => {
    if (!docs || !deepDoc || !facilityId) return;
    const key = `${facilityId}:${deepDoc}`;
    if (deepOpened.current === key) return;
    if (!(docs.documents ?? []).some((d) => d.key === deepDoc)) return;
    deepOpened.current = key;
    const timer = window.setTimeout(() => {
      document.getElementById("documents")?.scrollIntoView?.({ block: "start", behavior: "smooth" });
      setDocPreselect(deepDoc as DocKey);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [docs, deepDoc, facilityId]);
  const documentsSection = () => document.getElementById("documents") ?? null;
  const openDocuments = (docKey?: DocKey) => {
    documentsSection()?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    if (docKey) setDocPreselect(docKey);
  };
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  // Audit-timeline filters (user / module / date range).
  const [auditUser, setAuditUser] = useState("all");
  const [auditModule, setAuditModule] = useState("all");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const { user } = useAuth();
  const generatedBy = user?.name || user?.email || "NQAS Tracker user";

  // Every derived value is computed in ONE memo that runs before the loading /
  // not-found early returns below, so the hook order never changes between the
  // loading render and the loaded render (a hook after those returns would
  // crash React on the second render).
  const derived = useMemo(() => {
    if (!data) return null;
    const facility = data.facility;
    const active =
      data.cycles.find((c) => !c.cycle.superseded) ??
      data.cycles[data.cycles.length - 1] ??
      null;
    // ONE lifecycle source of truth: the header chip, KPI strip, stepper,
    // timeline and the exports all read this single call, so the stage, the
    // chips and the next action can never contradict each other.
    const lifecycleState = getLifecycleState({
      facility,
      activeCycle: active
        ? {
            cycleNumber: active.cycle.cycleNumber,
            cycleType: active.cycle.cycleType,
            sa: active.sa,
            nqas: active.nqas,
          }
        : null,
      funds: data.funds as { status: string }[],
      s: data.settings,
    });
    const completeness = profileCompleteness({
      facility,
      activeCycle: active ? { cycleNumber: active.cycle.cycleNumber } : null,
    });
    const exportData = buildProfileExportData({
      facility,
      cycles: data.cycles,
      funds: data.funds as unknown as Record<string, unknown>[],
      nocs: data.nocs as unknown as Record<string, unknown>[],
      buildings: data.buildings as unknown as Record<string, unknown>[],
      audits: data.audits,
      settings: data.settings,
      iaQuarters: (iaQuarters ?? []) as never,
      generatedBy,
    });
    /* The SAME row shape the Master List and Quick View print, built from the
       records already on this page (plus the quarterly IA store) — so the
       two-page sheet never says something different from the screen. */
    const sheetRow = masterRowFromProfile({
      facility: facility as unknown as Record<string, unknown>,
      cycles: data.cycles as never,
      funds: data.funds as unknown as Record<string, unknown>[],
      nocs: data.nocs as unknown as Record<string, unknown>[],
      buildings: data.buildings as unknown as Record<string, unknown>[],
      iaQuarters: (iaQuarters ?? []) as never,
      fireNocAlertLeadDays: data.settings?.fireNocAlertLeadDays ?? null,
      documents: (docs?.documents ?? []).map((d) => ({
        key: d.key,
        originalName: d.current?.displayName ?? d.current?.originalName ?? null,
        uploadedAt: d.current?.uploadedAt ?? null,
        requirement: d.requirement ?? null,
      })),
      requiredMissing: (docs?.requiredMissing ?? []).map((key) => ({
        key,
        label:
          (docs?.documents ?? []).find((d) => d.key === key)?.label ??
          key.replace(/_/g, " "),
        blocking: (docs?.blockingMissing ?? []).includes(key),
      })),
    });
    const dayOf = (ts: number) => new Date(ts).toISOString().slice(0, 10);
    const filteredAudits = data.audits.filter((a) => {
      const who = a.changedByName ?? "System";
      const module = a.table ?? a.action;
      if (auditUser !== "all" && who !== auditUser) return false;
      if (auditModule !== "all" && module !== auditModule) return false;
      if (auditFrom && dayOf(a.changedAt) < auditFrom) return false;
      if (auditTo && dayOf(a.changedAt) > auditTo) return false;
      return true;
    });
    const auditUsers = [...new Set(data.audits.map((a) => a.changedByName ?? "System"))].sort();
    const auditModules = [...new Set(data.audits.map((a) => a.table ?? a.action))].sort();

    // ---- Overview command-view data (computed from the SAME records the
    // assessment tabs edit, so the cards can never contradict a form) ----
    const today = todayLocalIso();
    // The cycle whose summary the Overview is showing (null = latest).
    const view =
      overviewCycle != null
        ? (data.cycles.find((c) => c.cycle.cycleNumber === overviewCycle) ?? active)
        : active;
    // A report/result sheet uploaded through the shared Documents slot lives
    // in facility_document — the attention checks read the live rows, so they
    // can never ask for a document the Documents card already shows.
    const uploadedDocKeys = new Set(
      (docs?.documents ?? []).filter((d) => d.current).map((d) => d.key),
    );
    const attention = needsAttention({
      sa: view?.sa
        ? ({ ...view.sa, hasReportDocument: uploadedDocKeys.has("SA_Report") } as never)
        : null,
      nqas: view?.nqas
        ? ({ ...view.nqas, hasResultDocument: uploadedDocKeys.has("NQAS_Result") } as never)
        : null,
      nocs: data.nocs.map((n) => ({
        expiryDate: n.expiryDate ?? null,
        status: n.status ?? null,
      })),
      funds: data.funds as { status: string }[],
      settings: data.settings,
      today,
    });
    const summaries = sectionSummaries({
      sa: view?.sa ?? null,
      nqas: view?.nqas ?? null,
      funds: data.funds.map((f) => ({
        status: f.status,
        amountSanctioned: f.amountSanctioned ?? null,
        financialYear: f.financialYear ?? null,
      })),
      nocs: data.nocs.map((n) => ({ expiryDate: n.expiryDate ?? null, status: n.status ?? null })),
      buildings: data.buildings.map((b) => ({
        buildingStatus: b.buildingStatus ?? null,
        buildingType: b.buildingType ?? null,
      })),
      settings: data.settings,
      today,
    });
    const surv = nextSurveillance(view?.nqas ?? null, data.settings, today);
    // Gap-closure fund KPI: sanctioned total + latest FY + open records.
    const latestFund = data.funds.length ? data.funds[data.funds.length - 1] : null;
    const fundKpi = {
      total: data.funds.reduce((a, f) => a + (f.amountSanctioned ?? 0), 0),
      year: latestFund?.financialYear ?? null,
      open: data.funds.filter((f) => f.status === "Pending" || f.status === "Returned").length,
    };
    // Fire NOC KPI from the latest NOC record (date-primary rule).
    const latestNoc = data.nocs.length ? data.nocs[data.nocs.length - 1] : null;
    const fireNoc = (() => {
      const label = deriveFireNocStatus(
        latestNoc?.nocAvailable ?? null,
        latestNoc?.expiryDate ?? null,
        latestNoc?.status ?? null,
      );
      const tone: Tone =
        label === "Valid" ? "green" : label === "Expiring Soon" ? "amber" : label === "Expired" ? "red" : "grey";
      return { label, tone };
    })();
    // Assessor autocomplete pool: every assessor ever used on this facility,
    // with the HUD of their last entry.
    const assessorsPool = data.cycles.flatMap((c) => {
      const s = c.sa;
      if (!s) return [];
      return [
        ...(s.assessor1Name
          ? [{
              name: s.assessor1Name,
              designation: (s as { assessor1Designation?: string }).assessor1Designation ?? "",
              phone: (s as { assessor1Phone?: string }).assessor1Phone ?? "",
              hud: s.assessor1Hud ?? "",
            }]
          : []),
        ...(s.assessor2Name
          ? [{
              name: s.assessor2Name,
              designation: (s as { assessor2Designation?: string }).assessor2Designation ?? "",
              phone: (s as { assessor2Phone?: string }).assessor2Phone ?? "",
              hud: s.assessor2Hud ?? "",
            }]
          : []),
      ];
    });

    return {
      active,
      lifecycleState,
      completeness,
      exportData,
      sheetRow,
      filteredAudits,
      auditUsers,
      auditModules,
      view,
      attention,
      summaries,
      surv,
      fundKpi,
      fireNoc,
      assessorPool: assessorsPool,
    };
  }, [data, docs, iaQuarters, generatedBy, auditUser, auditModule, auditFrom, auditTo, overviewCycle]);

  if (data === undefined) {
    return (
      <AppShell title="Facility">
        <Skeleton className="mb-3 h-28 w-full rounded-xl" />
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </AppShell>
    );
  }
  if (data === null) {
    return (
      <AppShell title="Facility not found">
        <div className="glass mx-auto max-w-md rounded-xl border border-border/60 p-6 text-center">
          <AlertTriangle className="mx-auto size-6 text-amber-500" />
          <p className="mt-3 text-sm text-muted-foreground">
            This facility does not exist or is outside your assigned blocks.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/facilities">Back to the facility list</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const { facility, cycles, audits, settings, me } = data;

  /* "Back to list" goes to the list AS THE USER LEFT IT: the saved list URL
   * carries the filters, the sort and the page (they live in the query string
   * — see hooks/use-list-url-state), so returning does not mean re-filtering.
   * A direct visit with no list behind it falls back to the plain list. */
  const savedListUrl = loadLastListUrl();
  const backToList =
    savedListUrl && savedListUrl.startsWith("/facilities?") ? savedListUrl : "/facilities";
  /** Breadcrumb: Facilities / Block / Facility name. */
  const blockListUrl = `/facilities?block=${encodeURIComponent(facility.block ?? "")}`;
  const {
    active,
    lifecycleState,
    completeness,
    exportData,
    sheetRow,
    filteredAudits,
    auditUsers,
    auditModules,
    view,
    attention,
    summaries,
    surv,
    fundKpi,
    fireNoc,
    assessorPool,
  } = derived!;
  const canEdit = me.appRole === "admin" || me.appRole === "entry";
  /* Assessor contact privacy: Viewers see the last four digits unless the
     State Admin switched the setting to "everyone". */
  const assessorPhoneVisibility =
    (settings as { assessorPhoneVisibility?: string }).assessorPhoneVisibility ??
    "role";
  const docStatuses =
    (settings.generalDocStatuses as string[] | undefined) ??
    DEFAULT_SETTINGS.generalDocStatuses;
  const modes = settings.assessmentModes ?? DEFAULT_SETTINGS.assessmentModes;
  const checklists = settings.checklistVersions ?? DEFAULT_SETTINGS.checklistVersions;
  const scopeOptions =
    (settings.scopeOptions as string[] | undefined) ?? DEFAULT_SETTINGS.scopeOptions;
  const certStatuses =
    (settings.certificationStatuses as string[] | undefined) ??
    DEFAULT_SETTINGS.certificationStatuses;
  const fundStatuses = settings.fundStatuses ?? DEFAULT_SETTINGS.fundStatuses;
  const buildingStatuses = settings.buildingStatuses ?? DEFAULT_SETTINGS.buildingStatuses;
  const assessorHuds = settings.assessorHuds ?? DEFAULT_SETTINGS.assessorHuds;

  // ---- export / print handlers (same mapper as the bulk master-list export)
  const slug = facility.name
    .replace(/[^\w-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const fileBase = `${slug || "facility"}-${facility.ninNumber ?? "no-nin"}`;

  /* "Export this facility – PDF" opens the SAME print dialog as the list and
     Quick View, and prints the SAME two-page sheet (aligned columns, ₹, QR,
     data checks). The old profile PDF was a third layout for the same data. */
  const onExportPdf = () => {
    openPrintSheet({ row: sheetRow, audits, generatedBy });
  };

  const onExportExcel = async () => {
    try {
      await exportProfileExcel(exportData, fileBase);
      toast.success("Facility Profile Excel exported (7 sheets)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Excel export failed");
    }
  };

  const onPrint = () => window.print();

  /** Excel export of the (filtered) audit trail — before → after per change. */
  const exportAuditExcel = async () => {
    try {
      await exportExcelWorkbook(
        [
          {
            title: "Audit Trail",
            header: ["When (IST)", "User", "Module", "Field / change", "From", "To"],
            rows: filteredAudits.map((a) => [
              istStamp(new Date(a.changedAt)),
              a.changedByName ?? "System",
              a.table ?? a.action,
              String(a.field ?? a.action).slice(0, 120),
              a.oldValue != null ? String(a.oldValue).slice(0, 300) : "",
              a.newValue != null ? String(a.newValue).slice(0, 300) : "",
            ]),
            textCols: [4, 5],
          },
        ],
        {
          facilityName: `${facility.name} (NIN ${facility.ninNumber ?? "—"})`,
          generatedAt: istStamp(),
          generatedBy,
        },
        (buf) => {
          const blob = new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${fileBase}-audit.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        },
      );
      toast.success(
        filteredAudits.length !== audits.length
          ? `Audit trail exported (${filteredAudits.length} of ${audits.length} entries)`
          : "Audit trail exported",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Audit export failed");
    }
  };

  const copyNin = async () => {
    if (!facility.ninNumber) return;
    try {
      await navigator.clipboard.writeText(facility.ninNumber);
      toast.success("NIN copied");
    } catch {
      toast.error("Could not copy the NIN");
    }
  };

  return (
    <AppShell
      title={facility.name}
      subtitle={`${facility.facilityType} · ${facility.block} / ${facility.phc}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* The header chip and the stepper below are the same value — they
              cannot disagree. */}
          <StatusChip label={lifecycleState.chip.label} tone={lifecycleState.chip.tone} />
          {/* Next computed action — one click takes the district staff to the
              exact tab where that step happens. */}
          {lifecycleState.nextAction.cta && lifecycleState.nextAction.targetTab && (
            <Button size="sm" className="gap-1.5" onClick={() => setTab(lifecycleState.nextAction.targetTab!)}>
              {lifecycleState.nextAction.cta} <ArrowRight className="size-3.5" />
            </Button>
          )}
          {facility.ninNumber && (
            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground">
              NIN {facility.ninNumber}
              <button
                type="button"
                onClick={() => void copyNin()}
                aria-label="Copy NIN number"
                className="rounded p-0.5 transition-colors hover:bg-muted hover:text-foreground"
              >
                <Copy className="size-3" />
              </button>
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 size-3.5" /> Export
                <ChevronDown className="ml-1 size-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Export this profile</DropdownMenuLabel>
              <DropdownMenuItem onSelect={onExportPdf}>
                <FileText className="mr-2 size-4" /> Facility sheet – PDF (2 pages)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onExportExcel()}>
                <FileSpreadsheet className="mr-2 size-4" /> Facility Profile – Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onPrint}>
                <Printer className="mr-2 size-4" /> Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1.5 size-3.5" /> Edit details
            </Button>
          )}
          {/* Delete is deliberately a secondary/overflow action. */}
          {me.appRole === "admin" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  aria-label="More facility actions"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Danger zone</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmName("");
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 size-4" /> Delete facility
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      }
    >
      {/* Delete confirmation — types the facility name to unlock. */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setConfirmName("");
        }}
      >
        <DialogContent className="glass-strong sm:max-w-md print:hidden">
          <DialogHeader>
            <DialogTitle>Delete this facility?</DialogTitle>
            <DialogDescription>
              This permanently removes {facility.name} with all its cycles,
              assessments, module records and audit history. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="confirm-facility-name">
              Type <span className="font-semibold">{facility.name}</span> to confirm
            </Label>
            <Input
              id="confirm-facility-name"
              className="glass-input mt-1"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={facility.name}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmName.trim() !== facility.name}
              onClick={async () => {
                try {
                  await deleteFacility({ facilityId: facility._id as never });
                  toast.success("Facility deleted");
                  navigate("/facilities");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Delete failed");
                }
              }}
            >
              <Trash2 className="mr-1.5 size-3.5" /> Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Breadcrumb + the way back into the filtered list ("Facilities" is the
          saved list URL, so Ctrl/Cmd+click still opens it in a new tab). */}
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex flex-wrap items-center gap-1.5 text-sm print:hidden"
      >
        <Link
          to={backToList}
          data-testid="back-to-list"
          className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Facilities
        </Link>
        {facility.block && (
          <>
            <span className="text-muted-foreground/60" aria-hidden>
              /
            </span>
            <Link
              to={blockListUrl}
              className="text-muted-foreground transition-colors hover:text-foreground"
              data-tip={`Facilities in ${facility.block}`}
            >
              {facility.block}
            </Link>
          </>
        )}
        <span className="text-muted-foreground/60" aria-hidden>
          /
        </span>
        <span className="min-w-0 truncate font-medium text-foreground">
          {facility.name}
        </span>
      </nav>

      {/* KPI strip — every empty value says WHY it is empty. */}
      <KpiStrip state={lifecycleState} surv={surv} fund={fundKpi} fireNoc={fireNoc} />

      <LifecycleStepper state={lifecycleState} onJump={setTab} />

      <CompletenessMeter
        completeness={completeness}
        onJump={setTab}
        canEdit={canEdit}
        onEdit={() => setEditOpen(true)}
      />

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList
          aria-label="Facility profile sections"
          className="flex w-full flex-nowrap justify-start gap-1 overflow-x-auto md:flex-wrap print:hidden"
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="state">State Assessment</TabsTrigger>
          <TabsTrigger value="national">NQAS Assessment</TabsTrigger>
          <TabsTrigger value="funds">Gap Closure Fund</TabsTrigger>
          <TabsTrigger value="noc">Fire NOC</TabsTrigger>
          <TabsTrigger value="building">Building</TabsTrigger>
          <TabsTrigger value="timeline">Audit timeline</TabsTrigger>
        </TabsList>

        {/* ---------- Overview ---------- */}
        <TabsContent value="overview" className="space-y-4">
          {/* Cycle switcher — past cycles are read-only summaries. */}
          <CycleSwitcher
            cycles={cycles.map((c) => c.cycle)}
            selected={overviewCycle}
            onSelect={setOverviewCycle}
            scoreTrend={cycles.map((c) => ({
              cycle: c.cycle.cycleNumber,
              score: c.nqas?.scorePercent ?? c.nqas?.manualScore ?? null,
            }))}
          />
          {view !== active && view && (
            <p className="rounded-lg border border-sky-300/60 bg-sky-500/5 px-3 py-2 text-xs text-sky-900 dark:text-sky-200">
              Showing summary of superseded cycle #{view.cycle.cycleNumber} —
              read-only history. Select "Latest" to return to the live cycle.
            </p>
          )}
          {/* Auto-generated problems, each with a Fix that jumps + focuses. */}
          <NeedsAttentionPanel
            items={attention}
            onFix={(t, f) => {
              // A document issue is fixed by UPLOADING: open the Documents
              // card and preselect the missing type in its one tray.
              if (f === "documents" || t === "documents") {
                setTab("overview");
                window.setTimeout(
                  () => openDocuments((docs?.requiredMissing ?? [])[0] as DocKey | undefined),
                  150,
                );
                return;
              }
              setTab(t);
              if (f) window.setTimeout(() => focusField(f), 150);
            }}
          />
          {/* Overview header strip (task 2.2): ONE chip — the missing
              required document — scrolling to the Documents card at the end
              of this tab. The card itself moved down there; nothing else is
              duplicated here. */}
          {(docs?.requiredMissing ?? []).length > 0 && (
            <button
              type="button"
              onClick={() => openDocuments((docs?.requiredMissing ?? [])[0] as DocKey)}
              className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              data-testid="profile-required-doc-chip"
            >
              <AlertTriangle className="size-3" />
              {(docs?.requiredMissing ?? []).length === 1
                ? "1 required document missing"
                : `${(docs?.requiredMissing ?? []).length} required documents missing`}
            </button>
          )}
          {/* Section summary cards — one per profile section. */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summaries.map((s) => (
              <SectionSummaryCard key={s.key} summary={s} onEdit={setTab} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="glass overflow-hidden lg:col-span-2">
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ClipboardList className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Facility record</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Identity, location and programme details
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "border",
                    facility.eligibility === "Eligible"
                      ? "border-emerald-300/70 bg-emerald-100 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100"
                      : facility.eligibility === "Possible"
                        ? "border-sky-300/70 bg-sky-100 text-sky-900 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-100"
                        : "border-rose-300/80 bg-rose-100 text-rose-900 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100",
                  )}
                >
                  {facility.eligibility === "Possible"
                    ? "Future Candidate"
                    : facility.eligibility === "Eligible"
                      ? "Eligible"
                      : "In-Eligible"}
                </Badge>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                  <RecordSection title="Identity">
                    <Field label="Facility name" value={facility.name} />
                    <Field
                      label="NIN Number"
                      value={facility.ninNumber}
                      mono
                      onCopy={facility.ninNumber ? () => void copyNin() : undefined}
                      onAdd={canEdit ? () => setEditOpen(true) : undefined}
                    />
                    <Field label="Facility type" value={facility.facilityType} />
                    <Field
                      label="Phase type"
                      value={facility.phaseType}
                      onAdd={canEdit ? () => setEditOpen(true) : undefined}
                    />
                  </RecordSection>
                  <RecordSection title="Location">
                    <Field label="Block name" value={facility.block} />
                    <Field label="PHC name" value={facility.phc} />
                  </RecordSection>
                  <RecordSection title="Programme">
                    <Field label="NQAS eligibility" value={facility.eligibility} />
                    <Field
                      label="SaQsham Facility_Type"
                      value={facility.saqshamFacilityType}
                      onAdd={canEdit ? () => setEditOpen(true) : undefined}
                    />
                    <Field
                      label="SaQsham Name/Category"
                      value={facility.saqshamCategory}
                      onAdd={canEdit ? () => setEditOpen(true) : undefined}
                    />
                  </RecordSection>
                  <RecordSection title="Remarks" className="sm:col-span-2 xl:col-span-3">
                    <Field
                      label="General remarks"
                      value={facility.remarks}
                      onAdd={canEdit ? () => setEditOpen(true) : undefined}
                    />
                  </RecordSection>
                </div>
              </CardContent>
            </Card>
            <Card className="glass overflow-hidden">
              <CardHeader className="flex-row items-center gap-3 space-y-0 border-b border-border/50 pb-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <History className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Certification history</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {cycles.length === 0
                      ? "No cycles yet"
                      : `${cycles.length} cycle${cycles.length === 1 ? "" : "s"} recorded`}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {cycles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 p-4 text-center">
                    <History className="mx-auto size-5 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium">
                      No certification cycle yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Mark the facility Eligible to open cycle #1 — the State
                      Assessment tab then accepts the first assessment.
                    </p>
                  </div>
                ) : (
                  <ol className="relative space-y-4">
                    <span
                      aria-hidden
                      className="absolute top-2 bottom-2 left-[15px] w-px bg-border"
                    />
                    {cycles.map(({ cycle, sa, nqas }) => (
                      <CycleTimelineCard
                        key={cycle._id}
                        cycle={cycle}
                        sa={sa}
                        nqas={nqas}
                        iaScore={lifecycleState.scores.ia}
                        isActive={active?.cycle._id === cycle._id}
                        canRemove={me.appRole === "admin"}
                        busy={pendingCycleAction !== null}
                        removing={pendingCycleAction === `remove-${cycle._id}`}
                        onRemove={() =>
                          runCycleAction(
                            `remove-${cycle._id}`,
                            "Removed ✓",
                            () =>
                              deleteCycle({
                                facilityId: facility._id as never,
                                cycleId: cycle._id as never,
                              }),
                            `Cycle #${cycle.cycleNumber} removed`,
                          )
                        }
                      />
                    ))}
                  </ol>
                )}
                {canEdit &&
                  active &&
                  (facility.currentStatus === "Recertification Due" ||
                    facility.currentStatus?.startsWith("Deferred") ||
                    active?.nqas?.certificationStatus === "Deferred") && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                    <p className="text-xs text-muted-foreground">
                      This facility went to recertification (deferred from its
                      previous NQAS attempt). Start a new cycle, then schedule
                      its State Assessment and NQAS Assessment from the tabs
                      above — the new attempt keeps the full history of the
                      deferred one on this timeline.
                    </p>
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      disabled={pendingCycleAction !== null}
                      onClick={() =>
                        void runCycleAction("start-recert", "Cycle started ✓", () =>
                          startNewCycle({
                            facilityId: facility._id as never,
                            trigger: "recertification",
                          }),
                        )
                      }
                    >
                      {pendingCycleAction === "start-recert" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : cycleActionDone ? (
                        <Check className="size-4" />
                      ) : null}
                      {cycleActionDone ? "Cycle started ✓" : "Start recertification cycle"}
                    </Button>
                  </div>
                )}
                {canEdit && active && facility.currentStatus === "Eligible for Re-Assessment" && (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={pendingCycleAction !== null}
                    onClick={() =>
                      void runCycleAction("start-deferred", "Cycle started ✓", () =>
                        startNewCycle({
                          facilityId: facility._id as never,
                          trigger: "deferred",
                        }),
                      )
                    }
                  >
                    {pendingCycleAction === "start-deferred" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : cycleActionDone ? (
                      <Check className="size-4" />
                    ) : null}
                    {cycleActionDone ? "Cycle started ✓" : "Start post-deferred reattempt"}
                  </Button>
                )}
              </CardContent>
            </Card>
            {/* Quarterly IA history — the store the IA import and the master
                list's IA columns read (added underneath the cycle timeline). */}
            <IaQuarterlyPanel
              facilityId={String(facility._id)}
              settings={settings}
              userId={user?._id ? String(user._id) : null}
              canImport={canEdit}
              className="lg:col-span-2"
            />
            {/* The six department documents moved to their own card directly
                before Recent activity (task 2.1) — one Documents entry only. */}
          </div>

          {/* Documents — the ONE Document status card (the old separate
              Documents section was removed): it sits directly before Recent
              activity, which stays the LAST section of the profile. */}
          <div id="documents" className="scroll-mt-24">
            <DocumentStatusCard
              facilityId={String(facility._id)}
              canEdit={canEdit}
              preselectKey={docPreselect}
            />
          </div>

          {/* Part C — read-only history for every earlier cycle, immediately
              before Recent activity. "Open Cycle #n" moves the overview
              switcher to that past cycle. */}
          <CycleHistoryPanel
            facilityId={String(facility._id)}
            currentCycleNumber={active?.cycle.cycleNumber ?? facility.currentCycleNumber ?? null}
            canEdit={canEdit}
            onOpenCycle={(n) => setOverviewCycle(n)}
          />

          {/* Part F — recent activity is the LAST section of the profile,
              collapsed by default and loaded only when opened. */}
          <RecentActivity audits={audits} onViewAll={() => setTab("timeline")} />
        </TabsContent>

        {/* ---------- State Assessment ---------- */}
        <TabsContent value="state" className="space-y-4">
          {cycles.length === 0 && (
            <EmptyCycle />
          )}
          {cycles.map(({ cycle, sa, nqas }, ci) =>
            sa ? (
              <Card key={cycle._id} className="glass">
                <CardHeader>
                  <CardTitle className="text-base">
                    Cycle #{cycle.cycleNumber} · {cycle.cycleType}
                    {cycle.superseded && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {me.appRole === "admin"
                          ? "superseded (admin can edit history)"
                          : "superseded (read-only history)"}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SaForm
                    sa={sa}
                    facilityId={facility._id as never}
                    cycleId={cycle._id as never}
                    statuses={docStatuses}
                    assessorHuds={assessorHuds}
                    scopeOptions={scopeOptions}
                    disabled={
                      !canEdit || (!!cycle.superseded && me.appRole !== "admin")
                    }
                    lockReason={
                      !canEdit
                        ? "Your account is view-only — State Admin or District Editor roles can edit assessments."
                        : !!cycle.superseded && me.appRole !== "admin"
                          ? "Superseded cycle — kept as read-only history."
                          : null
                    }
                    audits={audits}
                    assessorPool={assessorPool}
                    maskPhones={
                      data.me.appRole === "viewer" &&
                      assessorPhoneVisibility !== "everyone"
                    }
                    duplicateSource={cycles[ci - 1]?.sa ?? null}
                    certificationStatus={nqas?.certificationStatus}
                    /* Quick action: only the active cycle can spawn the next
                       attempt, and only when the pipeline says so. */
                    onStartCycle={
                      active && cycle._id === active.cycle._id && canEdit
                        ? facility.currentStatus === "Recertification Due"
                          ? () =>
                              void runCycleAction(
                                "start-recert",
                                "Cycle started ✓",
                                () =>
                                  startNewCycle({
                                    facilityId: facility._id as never,
                                    trigger: "recertification",
                                  }),
                              )
                          : facility.currentStatus === "Eligible for Re-Assessment"
                            ? () =>
                                void runCycleAction(
                                  "start-deferred",
                                  "Cycle started ✓",
                                  () =>
                                    startNewCycle({
                                      facilityId: facility._id as never,
                                      trigger: "deferred",
                                    }),
                                )
                            : undefined
                        : undefined
                    }
                    startCycleLabel={
                      facility.currentStatus === "Recertification Due"
                        ? "Start recertification cycle"
                        : "Start post-deferred reattempt"
                    }
                    onSave={async (vals) => {
                      // The form owns validation, optimistic toast and the
                      // unsaved-changes bar — rethrow so it can react to API
                      // rejections (its catch keeps the draft).
                      const saved = await updateSA({
                        facilityId: facility._id as never,
                        cycleId: cycle._id as never,
                        ...vals,
                      });
                      throwIfSaveFailed(saved);
                    }}
                  />
                </CardContent>
              </Card>
            ) : null,
          )}
        </TabsContent>

        {/* ---------- NQAS Assessment ---------- */}
        <TabsContent value="national" className="space-y-4">
          {cycles.length === 0 && <EmptyCycle />}
          {cycles.map(({ cycle, sa, nqas }) => (
            <Card key={cycle._id} className="glass">
              <CardHeader>
                <CardTitle className="text-base">
                  Cycle #{cycle.cycleNumber} · {cycle.cycleType}
                  {cycle.superseded && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {me.appRole === "admin"
                        ? "superseded (admin can edit history)"
                        : "superseded (read-only history)"}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nqas ? (
                  <NqasForm
                    nqas={nqas}
                    facilityId={facility._id as never}
                    cycleId={cycle._id as never}
                    cycleNumber={cycle.cycleNumber}
                    modes={modes}
                    checklists={checklists}
                    scopeOptions={scopeOptions}
                    certStatuses={certStatuses}
                    settings={settings}
                    saCompleted={sa?.status === "Completed"}
                    disabled={
                      !canEdit || (!!cycle.superseded && me.appRole !== "admin")
                    }
                    lockReason={
                      !canEdit
                        ? "Your account is view-only — State Admin or District Editor roles can edit assessments."
                        : !!cycle.superseded && me.appRole !== "admin"
                          ? "Superseded cycle — kept as read-only history."
                          : null
                    }
                    audits={audits}
                    onSave={async (vals) => {
                      // Same contract as the SA form: the component validates
                      // and toasts; rethrow on API rejection.
                      const saved = await updateNqas({
                        facilityId: facility._id as never,
                        cycleId: cycle._id as never,
                        ...vals,
                      });
                      throwIfSaveFailed(saved);
                    }}
                  />
                ) : canEdit && !cycle.superseded && sa?.status === "Completed" ? (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                      State Assessment is complete — create the NQAS record for
                      this cycle.
                    </p>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await ensureNqas({
                            facilityId: facility._id as never,
                            cycleId: cycle._id as never,
                          });
                          toast.success("NQAS record created");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed");
                        }
                      }}
                    >
                      Create NQAS record
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    The NQAS record is created once the State Assessment for this
                    cycle is completed.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ---------- Funds ---------- */}
        <TabsContent value="funds" className="space-y-4">
          <ModuleRecords
            facilityId={facility._id as never}
            canEdit={canEdit}
            icon={<IndianRupee className="size-4" />}
            title="Gap Closure Fund records"
            rows={[]}
            renderExtra={null}
            addLabel="Add fund record"
            renderAdd={(close) => (
              <FundForm
                fundStatuses={fundStatuses}
                disabled={false}
                onSubmit={async (vals) => {
                  try {
                    await saveFund({
                      facilityId: facility._id as never,
                      financialYear: vals.financialYear ?? "2025-26",
                      status: vals.status ?? "Pending",
                      amountSanctioned: vals.amountSanctioned,
                      amountReleased: vals.amountReleased,
                      amountUtilized: vals.amountUtilized,
                      sanctionedDate: vals.sanctionedDate,
                      utilizedDate: vals.utilizedDate,
                      remarks: vals.remarks,
                    });
                    toast.success("Fund record added");
                    close();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
              />
            )}
          />
          <div className="grid gap-3">
            {data.funds.map((f) => (
              <FundRowCard
                key={f._id}
                fund={{
                  _id: String(f._id),
                  financialYear: f.financialYear,
                  amountSanctioned: f.amountSanctioned,
                  amountReleased: f.amountReleased,
                  amountUtilized: f.amountUtilized,
                  status: f.status,
                  sanctionedDate: f.sanctionedDate,
                  utilizedDate: f.utilizedDate,
                  remarks: f.remarks,
                }}
                fundStatuses={fundStatuses}
                canEdit={canEdit}
                onUpdate={async (fundId, vals) => {
                  try {
                    await updateFund({
                      fundId: fundId as never,
                      ...vals,
                      attachmentId: vals.attachmentId as never,
                    });
                    toast.success("Fund record updated");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
                onDelete={async (fundId) => {
                  try {
                    await deleteFund({ fundId: fundId as never });
                    toast.success("Fund record deleted");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
              />
            ))}
          </div>
        </TabsContent>

        {/* ---------- Fire NOC ---------- */}
        <TabsContent value="noc" className="space-y-4">
          <ModuleRecords
            facilityId={facility._id as never}
            canEdit={canEdit}
            icon={<Flame className="size-4" />}
            title="Fire NOC records"
            rows={[]}
            addLabel="Add NOC record"
            renderAdd={(close) => (
              <NocForm
                onSubmit={async (vals) => {
                  try {
                    await saveNoc({
                      facilityId: facility._id as never,
                      nocNumber: vals.nocNumber,
                      issuedDate: vals.issuedDate,
                      expiryDate: vals.expiryDate,
                      status: vals.status ?? "Valid",
                      renewalAppliedDate: vals.renewalAppliedDate,
                      remarks: vals.remarks,
                    });
                    toast.success("Fire NOC added");
                    close();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
              />
            )}
          />
          <div className="grid gap-3">
            {data.nocs.map((n) => (
              <NocRowCard
                key={n._id}
                noc={{
                  _id: String(n._id),
                  nocNumber: n.nocNumber,
                  issuedDate: n.issuedDate,
                  expiryDate: n.expiryDate,
                  status: n.status,
                  renewalAppliedDate: n.renewalAppliedDate,
                  remarks: n.remarks,
                }}
                canEdit={canEdit}
                onUpdate={async (nocId, vals) => {
                  try {
                    await updateNoc({
                      nocId: nocId as never,
                      ...vals,
                      attachmentId: vals.attachmentId as never,
                    });
                    toast.success("NOC updated");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
                onDelete={async (nocId) => {
                  try {
                    await deleteNoc({ nocId: nocId as never });
                    toast.success("NOC deleted");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
              />
            ))}
          </div>
        </TabsContent>

        {/* ---------- Building ---------- */}
        <TabsContent value="building" className="space-y-4">
          <ModuleRecords
            facilityId={facility._id as never}
            canEdit={canEdit}
            icon={<Wrench className="size-4" />}
            title="Building status"
            rows={[]}
            addLabel="Add building record"
            renderAdd={(close) => (
              <BuildingForm
                buildingStatuses={buildingStatuses}
                onSubmit={async (vals) => {
                  try {
                    await saveBuilding({
                      facilityId: facility._id as never,
                      buildingStatus: vals.buildingStatus ?? "Good",
                      buildingType: vals.buildingType,
                      yearOfConstruction: vals.yearOfConstruction,
                      lastRenovationDate: vals.lastRenovationDate,
                      renovationFundRequired: vals.renovationFundRequired,
                      remarks: vals.remarks,
                    });
                    toast.success("Building record added");
                    close();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
              />
            )}
          />
          <div className="grid gap-3">
            {data.buildings.map((b) => (
              <BuildingRowCard
                key={b._id}
                building={{
                  _id: String(b._id),
                  buildingStatus: b.buildingStatus,
                  buildingType: b.buildingType ?? null,
                  lastUpdatedAt: b.lastUpdatedAt ?? null,
                  yearOfConstruction: b.yearOfConstruction,
                  lastRenovationDate: b.lastRenovationDate,
                  renovationFundRequired: b.renovationFundRequired,
                  remarks: b.remarks,
                }}
                buildingStatuses={buildingStatuses}
                canEdit={canEdit}
                onUpdate={async (buildingId, vals) => {
                  try {
                    await updateBuilding({ buildingId: buildingId as never, ...vals });
                    toast.success("Building record updated");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
                onDelete={async (buildingId) => {
                  try {
                    await deleteBuilding({ buildingId: buildingId as never });
                    toast.success("Building record deleted");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
              />
            ))}
          </div>
        </TabsContent>

        {/* ---------- Audit timeline ---------- */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="glass">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">
                  Audit history ({filteredAudits.length}
                  {filteredAudits.length !== audits.length ? ` of ${audits.length}` : ""})
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  {(auditUser !== "all" || auditModule !== "all" || auditFrom || auditTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAuditUser("all");
                        setAuditModule("all");
                        setAuditFrom("");
                        setAuditTo("");
                      }}
                    >
                      <X className="mr-1 size-3.5" /> Clear filters
                    </Button>
                  )}
                  {/* Export respects the visible filters; the print uses the
                      built-in profile print layout. */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filteredAudits.length === 0}
                    onClick={() => void exportAuditExcel()}
                  >
                    <FileSpreadsheet className="mr-1.5 size-3.5" /> Export Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={onPrint}>
                    <Printer className="mr-1.5 size-3.5" /> Print
                  </Button>
                </div>
              </div>
              {/* Filters — who / what / when, keyboard reachable. */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="audit-user" className="text-xs">
                    <Filter className="mr-1 inline size-3" /> User
                  </Label>
                  <Select value={auditUser} onValueChange={setAuditUser}>
                    <SelectTrigger id="audit-user" className="glass-input mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      {auditUsers.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="audit-module" className="text-xs">
                    Module
                  </Label>
                  <Select value={auditModule} onValueChange={setAuditModule}>
                    <SelectTrigger id="audit-module" className="glass-input mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All modules</SelectItem>
                      {auditModules.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="audit-from" className="text-xs">
                    From
                  </Label>
                  <DateInput
                    id="audit-from"
                    label="Audit from"
                    value={auditFrom}
                    onChange={setAuditFrom}
                    max={todayLocalIso()}
                    compact
                    hideChange
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="audit-to" className="text-xs">
                    To
                  </Label>
                  <DateInput
                    id="audit-to"
                    label="Audit to"
                    value={auditTo}
                    onChange={setAuditTo}
                    max={todayLocalIso()}
                    compact
                    hideChange
                    className="mt-1"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {audits.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No changes recorded yet. Edits to this facility — details,
                  assessments, funds, NOC and building records — appear here with
                  who changed what and when.
                </p>
              ) : filteredAudits.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No audit entries match these filters.{" "}
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => {
                      setAuditUser("all");
                      setAuditModule("all");
                      setAuditFrom("");
                      setAuditTo("");
                    }}
                  >
                    Clear them
                  </button>{" "}
                  to see all {audits.length} entries.
                </p>
              ) : (
                <ol className="relative space-y-4 border-l pl-5">
                  {filteredAudits.map((a) => (
                    <li key={a._id} className="text-sm">
                      <span className="absolute -left-[7px] mt-1.5 size-3 rounded-full border-2 border-primary bg-background" />
                      <p className="break-words">
                        <strong>{a.field ?? a.action}</strong>
                        {a.oldValue != null && (
                          <span className="text-muted-foreground">
                            {" "}
                            {String(a.oldValue)} →{" "}
                          </span>
                        )}
                        {a.newValue != null && <span>{String(a.newValue)}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.changedByName ?? "System"}
                        {a.table ? ` · ${a.table}` : ""} ·{" "}
                        {toDisplayDateTime(a.changedAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Print-only full profile — same data as the PDF export, so printing
          from any tab gives the whole record. */}
      <PrintSummary out={exportData} />

      {/* `key` re-seeds the edit form on every open (no effect needed). */}
      <EditFacilityDialog
        key={editOpen ? "editing" : "idle"}
        open={editOpen}
        onOpenChange={setEditOpen}
        facility={facility}
        onSave={async (vals) => {
          try {
            const saved = await updateFacility({ facilityId: facility._id as never, ...vals });
            throwIfSaveFailed(saved);
            toast.success("Facility updated");
            setEditOpen(false);
          } catch (err) {
            showSaveError(err);
          }
        }}
      />
    </AppShell>
  );
}

// ---------- helpers ----------

/* ------------------------------------------------------------------ *
 * Profile presentation helpers.
 *
 * Every one of them reads the SAME `LifecycleState` / export data the rest
 * of the page reads, so nothing here can invent its own stage or score.
 * ------------------------------------------------------------------ */

/** Score → tone. The number is always printed next to the colour. */
function scoreTone(v: number | null): Tone {
  if (v == null) return "grey";
  if (v >= 75) return "green";
  if (v >= 50) return "amber";
  return "red";
}

/** Certification status → tone + readable label. */
function certChip(
  certStatus: string | null | undefined,
  fallback: { label: string; tone: Tone },
): { label: string; tone: Tone } {
  switch (certStatus) {
    case "Quality Certified":
      return { label: "Certified", tone: "green" };
    case "Quality Certified with Conditionality":
      return { label: "Certified (Conditionality)", tone: "amber" };
    case "Deferred":
      return { label: "Deferred", tone: "red" };
    default:
      return fallback;
  }
}

/** The KPI strip — current stage, the three scores, validity and open gaps.
 *  An empty value never prints a bare “—”: it always says why it is empty. */
function KpiStrip({
  state,
  surv,
  fund,
  fireNoc,
}: {
  state: LifecycleState;
  surv: { date: string; daysLeft: number } | null;
  fund: { total: number; year: string | null; open: number } | null;
  fireNoc: { label: string; tone: Tone } | null;
}) {
  const { from, daysLeft, to } = state.validity;
  const validityTone: Tone =
    daysLeft == null ? "grey" : daysLeft < 0 ? "red" : daysLeft <= 90 ? "amber" : "green";
  // Days-to-days ring: full arc = validity span from the certification date.
  const validityTotalDays =
    from && to ? Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)) : null;
  const score = (label: string, s: { value: number | null }) => ({
    value: s.value != null ? `${s.value}%` : "—",
    hint: s.value != null ? label : "Not recorded yet",
    tone: scoreTone(s.value),
  });
  const survChip = surv ? dueChip(surv.daysLeft) : null;
  const items: { key: string; label: string; value: string; hint: string; tone: Tone }[] = [
    {
      key: "stage",
      label: "Current stage",
      value: `${state.stageIndex} of ${state.stages.length}`,
      hint: state.chip.label,
      tone: state.chip.tone,
    },
    {
      key: "sa",
      label: "SA score",
      ...score("State Assessment", state.scores.sa),
    },
    {
      key: "nqas",
      label: "NQAS score",
      ...score("NQAS Assessment", state.scores.nqas),
    },
    {
      key: "validity",
      label: "Validity",
      value: daysLeft != null ? `${daysLeft} days` : "—",
      hint:
        to == null
          ? "Not certified yet"
          : daysLeft != null && daysLeft < 0
            ? `Expired on ${toDdMmmYyyy(to)}`
            : `Till ${toDdMmmYyyy(to)}`,
      tone: validityTone,
    },
    {
      key: "surveillance",
      label: "Next surveillance",
      value: survChip ? survChip.label : "—",
      hint: surv ? `Surveillance due ${toDdMmmYyyy(surv.date)}` : "Applies once certified",
      tone: survChip ? survChip.tone : "grey",
    },
    {
      key: "fund",
      label: "Gap closure",
      value: fund && fund.total > 0 ? formatInr(fund.total) : "—",
      hint:
        fund && fund.total > 0
          ? `${fund.year ?? "—"} · ${fund.open} open record${fund.open === 1 ? "" : "s"}`
          : "No fund records yet",
      tone: fund && fund.open > 0 ? "amber" : fund && fund.total > 0 ? "green" : "grey",
    },
    {
      key: "noc",
      label: "Fire NOC",
      value: fireNoc ? fireNoc.label : "—",
      hint: fireNoc?.label === "Not Obtained" ? "No validity date recorded" : `${fireNoc?.label ?? "—"} status`,
      tone: fireNoc ? fireNoc.tone : "grey",
    },
  ];

  return (
    <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {items.map((i) => (
        <div key={i.key} className="glass rounded-xl border border-border/60 p-3">
          <dt className="text-xs leading-tight font-semibold tracking-wide text-muted-foreground uppercase">
            {i.label}
          </dt>
          <dd className="mt-1 flex items-center justify-between gap-2 text-lg leading-none font-bold text-foreground">
            {i.value === "—" ? <span aria-hidden>—</span> : <span className="min-w-0 truncate">{i.value}</span>}
            {i.key === "validity" && to != null && (
              <RingGauge daysLeft={daysLeft} totalDays={validityTotalDays} size={40} />
            )}
          </dd>
          <dd className="mt-1.5 flex items-start gap-1 text-xs leading-tight text-muted-foreground">
            <ToneIcon tone={i.tone} className="mt-0.5" />
            <span>{i.hint}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Data-completeness meter — each missing field is a link to its tab. */
function CompletenessMeter({
  completeness,
  onJump,
  canEdit,
  onEdit,
}: {
  completeness: { pct: number; missing: { field: string; tab: string }[]; total: number };
  onJump: (tab: string) => void;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const tone: Tone = completeness.pct === 100 ? "green" : completeness.pct >= 60 ? "blue" : "amber";
  return (
    <section
      aria-label="Profile completeness"
      className="glass mb-4 rounded-xl border border-border/60 p-4 print:hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          Profile {completeness.pct}% complete
          {completeness.missing.length > 0 && (
            <span className="ml-1 font-normal text-muted-foreground">
              — {completeness.missing.length} field
              {completeness.missing.length === 1 ? "" : "s"} missing
            </span>
          )}
        </p>
        {completeness.missing.length === 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <Check className="size-3.5" /> All key fields recorded
          </span>
        )}
      </div>
      <ToneBar value={completeness.pct} tone={tone} className="mt-2" />
      {completeness.missing.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {completeness.missing.map((m) => (
            <li key={m.field}>
              <button
                type="button"
                onClick={() => onJump(m.tab)}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Plus className="size-3" /> {m.field}
              </button>
            </li>
          ))}
        </ul>
      )}
      {canEdit && completeness.missing.length > 0 && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onEdit}>
          <Pencil className="mr-1.5 size-3.5" /> Fill in the missing fields
        </Button>
      )}
    </section>
  );
}

/** One grouped block of the facility record grid. */
function RecordSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0", className)} aria-label={title}>
      <h3 className="border-b border-border/60 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** A labelled value. Blanks say “Not provided” and offer an Add link. */
function Field({
  label,
  value,
  mono,
  onCopy,
  onAdd,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  onCopy?: () => void;
  onAdd?: () => void;
}) {
  const empty = value == null || String(value).trim() === "";
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      {empty ? (
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <span className="italic">Not provided</span>
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-0.5 rounded text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Plus className="size-3" /> Add
            </button>
          )}
        </p>
      ) : (
        <p
          className={cn(
            "mt-1 flex items-center gap-1.5 text-sm leading-snug font-medium break-words text-foreground",
            mono && "font-mono text-xs",
          )}
        >
          <span className="min-w-0 break-all">{value}</span>
          {onCopy && (
            <button
              type="button"
              onClick={onCopy}
              aria-label={`Copy ${label}`}
              className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Copy className="size-3" />
            </button>
          )}
        </p>
      )}
    </div>
  );
}

/** One cycle on the certification-history timeline: type, the three scores as
 *  progress bars, assessment dates, certificate validity and a details
 *  expander. */
function CycleTimelineCard({
  cycle,
  sa,
  nqas,
  iaScore,
  isActive,
  canRemove,
  busy,
  removing,
  onRemove,
}: {
  cycle: { _id: string; cycleNumber: number; cycleType: string; superseded?: boolean | null };
  sa: ProfileSa | null;
  nqas: ProfileNqas | null;
  iaScore: { value: number | null; short: string; long: string };
  isActive: boolean;
  canRemove: boolean;
  busy: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const chip = certChip(nqas?.certificationStatus, {
    label: isActive ? "In progress" : "Closed",
    tone: isActive ? "amber" : "grey",
  });
  const rows = [
    { key: "ia", label: "IA score", value: iaScore.value, note: "Facility-level (latest quarterly IA)" },
    {
      key: "sa",
      label: "SA score",
      value: sa?.scorePercent ?? null,
      note: sa?.status ? `State Assessment: ${sa.status}` : "State Assessment not recorded",
    },
    {
      key: "nqas",
      label: "NQAS score",
      value: nqas?.scorePercent ?? nqas?.manualScore ?? null,
      note: nqas?.status ? `NQAS: ${nqas.status}` : "NQAS assessment not recorded",
    },
  ];

  const validityFrom = nqas?.certificationDate ?? nqas?.goiLetterDate ?? null;

  return (
    <li className="relative flex gap-3">
      <span
        className={cn(
          "z-10 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          cycle.superseded
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-white shadow-sm",
        )}
        aria-hidden
      >
        {cycle.cycleNumber}
      </span>
      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl border p-3 text-sm",
          cycle.superseded
            ? "border-border/50 bg-muted/30 opacity-90"
            : isActive
              ? "border-primary/30 bg-primary/5 shadow-sm"
              : "border-border/60",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">
            Cycle #{cycle.cycleNumber} · {cycle.cycleType}
          </p>
          <div className="flex items-center gap-1.5">
            <StatusChip label={chip.label} tone={chip.tone} />
            {cycle.superseded && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                superseded
              </span>
            )}
            {canRemove && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive print:hidden"
                    data-tip="Remove this cycle from history"
                    aria-label="Remove this cycle from history"
                    disabled={busy}
                  >
                    {removing ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <X className="size-3.5" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-strong">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Remove cycle #{cycle.cycleNumber}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the cycle with its State
                      Assessment and NQAS records. If it was the active cycle,
                      the most recent remaining cycle becomes active. This
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white"
                      onClick={() => void onRemove()}
                    >
                      Remove cycle
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Scores — labelled, each with its own bar. */}
        <div className="mt-3 space-y-2">
          {rows.map((r) => (
            <div key={r.key}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-foreground">{r.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {r.value != null ? `${r.value}%` : "— Not recorded yet"}
                </span>
              </div>
              <ToneBar
                value={r.value ?? 0}
                tone={scoreTone(r.value)}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">{r.note}</p>
            </div>
          ))}
        </div>

        {validityFrom || nqas?.validityDate ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Certificate validity: {validityFrom ? toDisplayDate(validityFrom) : "—"} to{" "}
            {nqas?.validityDate ? toDisplayDate(nqas.validityDate) : "—"}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none print:hidden"
        >
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          {open ? "Hide details" : "More details"}
        </button>
        {open && (
          <dl className="mt-2 grid gap-x-4 gap-y-1.5 border-t border-border/60 pt-2 text-xs sm:grid-cols-2">
            <Detail label="Cycle type" value={cycle.cycleType} />
            <Detail label="Cycle status" value={cycle.superseded ? "Superseded" : "Active"} />
            <Detail label="SA scheduled" value={fmtDay(sa?.scheduledDate)} />
            <Detail label="SA actual dates" value={range(sa?.actualStartDate, sa?.actualEndDate)} />
            <Detail label="SA letter / doc status" value={sa?.generalDocStatus ?? null} />
            <Detail label="SA assessors" value={assessors(sa)} />
            <Detail label="NQAS scheduled" value={fmtDay(nqas?.scheduledStartDate)} />
            <Detail label="NQAS actual end" value={fmtDay(nqas?.actualEndDate)} />
            <Detail label="NQAS mode" value={nqas?.mode ?? null} />
            <Detail label="SA report" value={sa?.reportAttachmentName ?? null} />
          </dl>
        )}
      </div>
    </li>
  );
}

/** dd-MM-yyyy, or “— not recorded”. */
function fmtDay(iso: string | null | undefined): string | null {
  return iso ? toDisplayDate(iso) : null;
}

function range(from?: string | null, to?: string | null): string | null {
  if (!from && !to) return null;
  return `${from ? toDisplayDate(from) : "—"} → ${to ? toDisplayDate(to) : "—"}`;
}

function assessors(sa: ProfileSa | null): string | null {
  if (!sa) return null;
  const a1 = cleanName(sa.assessor1Name);
  const a2 = cleanName(sa.assessor2Name);
  if (!a1 && !a2) return null;
  return [a1, a2].filter(Boolean).join(", ");
}

const cleanName = (v: unknown): string =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : "";

/** One details row inside the cycle expander. */
function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="break-words">
        {value && String(value).trim() !== "" ? (
          value
        ) : (
          <span className="text-muted-foreground italic">Not recorded yet</span>
        )}
      </dd>
    </div>
  );
}

/** Print-only summary — the full profile as plain tables, so "Print" on the
 *  page produces the same content as the PDF export regardless of which tab
 *  is open. Hidden on screen. */
function PrintSummary({ out }: { out: ProfileExportData }) {
  return (
    <section className="hidden print:block" aria-hidden>
      <h2 className="text-lg font-bold">Facility Profile — {out.facility.name}</h2>
      <p className="text-[11px] text-muted-foreground">
        {out.facility.facilityType} · NIN {out.facility.ninNumber ?? "not provided"} · Block{" "}
        {out.facility.block} / PHC {out.facility.phc} · Stage {out.stageIndex} of 7 —{" "}
        {out.chip.label}
      </p>
      <PrintTable title="Facility summary" header={["Metric", "Value"]} rows={out.kpis} />
      <PrintTable
        title="Certification lifecycle"
        header={["#", "Stage", "State", "Date"]}
        rows={out.lifecycle}
      />
      <PrintTable title="Facility record" header={["Field", "Value"]} rows={out.record} />
      <PrintTable
        title="Certification history"
        header={["Cycle", "Type", "SA score", "NQAS score", "Status", "Valid from–to"]}
        rows={out.certHistory}
      />
      <PrintTable title="Gap closure fund" header={out.fundHeader} rows={out.funds} />
      <PrintTable title="Fire NOC" header={out.nocHeader} rows={out.nocs} />
      <PrintTable title="Building" header={out.buildingHeader} rows={out.buildings} />
      <PrintTable title="Audit trail (last 10)" header={out.auditHeader} rows={out.audit} />
      <p className="mt-4 text-[10px] text-muted-foreground">
        Generated {out.generatedAt} by {out.generatedBy || "NQAS Tracker user"} —
        confidential facility quality data.
      </p>
    </section>
  );
}

function PrintTable({
  title,
  header,
  rows,
}: {
  title: string;
  header: string[];
  rows: (string | number | null)[][];
}) {
  return (
    <div className="mt-4 break-inside-avoid">
      <h3 className="text-xs font-bold tracking-wide uppercase">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">
          No records — nothing recorded for this section yet.
        </p>
      ) : (
        <table className="mt-1 w-full border-collapse text-[11px]">
          <thead>
            <tr>
              {header.map((h) => (
                <th
                  key={h}
                  className="border border-neutral-300 bg-neutral-100 px-1.5 py-1 text-left font-semibold"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className="border border-neutral-300 px-1.5 py-1 align-top">
                    {c == null || c === "" ? (
                      <span className="text-neutral-500 italic">Not recorded</span>
                    ) : (
                      String(c)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function EmptyCycle() {
  return (
    <Card className="glass">
      <CardContent className="py-8 text-sm text-muted-foreground">
        No certification cycle yet — mark the facility NQAS-eligible to start
        cycle #1.
      </CardContent>
    </Card>
  );
}

// Simple shared record card wrapper for module tabs
function ModuleRecords({
  title,
  icon,
  children,
  addLabel,
  renderAdd,
}: {
  facilityId: string;
  canEdit: boolean;
  title: string;
  icon: React.ReactNode;
  rows: unknown[];
  renderExtra?: React.ReactNode;
  addLabel: string;
  renderAdd?: (close: () => void) => React.ReactNode;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="glass">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        {renderAdd && (
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> {addLabel}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {children}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{addLabel}</DialogTitle>
              <DialogDescription>Every change is recorded in the audit trail.</DialogDescription>
            </DialogHeader>
            {renderAdd?.(() => setOpen(false))}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// (The old in-file SA form was replaced by components/profile/AssessmentForms.tsx —
// the sectioned form kit shared by both assessment tabs.)

// (The old in-file NQAS form was replaced by components/profile/AssessmentForms.tsx —
// the sectioned form kit shared by both assessment tabs.)

// ---------- module row forms ----------

export type FundVals = {
  financialYear?: string;
  amountSanctioned?: number;
  amountReleased?: number;
  amountUtilized?: number;
  status?: string;
  sanctionedDate?: string;
  utilizedDate?: string;
  remarks?: string;
  attachmentId?: string;
  attachmentName?: string;
  attachmentType?: string;
  clearAttachment?: boolean;
};

export function FundForm({
  fundStatuses,
  onSubmit,
  initial,
  disabled,
  submitLabel = "Save fund record",
}: {
  fundStatuses: string[];
  onSubmit: (vals: FundVals) => Promise<void>;
  initial?: FundRow;
  disabled?: boolean;
  submitLabel?: string;
}) {
  const [form, setForm] = useState({
    financialYear: initial?.financialYear ?? "2025-26",
    amountSanctioned: initial?.amountSanctioned?.toString() ?? "",
    amountReleased: initial?.amountReleased?.toString() ?? "",
    amountUtilized: initial?.amountUtilized?.toString() ?? "",
    status: initial?.status ?? "Pending",
    sanctionedDate: initial?.sanctionedDate ?? "",
    utilizedDate: initial?.utilizedDate ?? "",
    remarks: initial?.remarks ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<AttachmentValue | null>(
    initial?.attachmentId
      ? {
          attachmentId: initial.attachmentId,
          attachmentName: initial.attachmentName,
          attachmentType: initial.attachmentType,
        }
      : null,
  );
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="space-y-3">
      <FieldGrid>
        <div>
          <Label>Financial year</Label>
          <Input
            className="glass-input mt-1"
            value={form.financialYear}
            onChange={(e) => set("financialYear", e.target.value)}
            disabled={disabled}
            placeholder="2025-26"
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)} disabled={disabled}>
            <SelectTrigger className="glass-input mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fundStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Amount sanctioned (₹)</Label>
          <Input
            type="number"
            className="glass-input mt-1"
            value={form.amountSanctioned}
            onChange={(e) => set("amountSanctioned", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <Label>Amount released (₹)</Label>
          <Input
            type="number"
            className="glass-input mt-1"
            value={form.amountReleased}
            onChange={(e) => set("amountReleased", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <Label>Amount utilized (₹)</Label>
          <Input
            type="number"
            className="glass-input mt-1"
            value={form.amountUtilized}
            onChange={(e) => set("amountUtilized", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <Label htmlFor="fund-sanctioned-date">Sanctioned date</Label>
          <DateInput
            id="fund-sanctioned-date"
            label="Sanctioned date"
            value={form.sanctionedDate}
            onChange={(iso) => set("sanctionedDate", iso)}
            max={todayLocalIso()}
            disabled={disabled}
            disabledReason={disabled ? "View only — funds need edit access" : undefined}
            compact
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="fund-utilized-date">Utilized date</Label>
          <DateInput
            id="fund-utilized-date"
            label="Utilized date"
            value={form.utilizedDate}
            onChange={(iso) => set("utilizedDate", iso)}
            max={todayLocalIso()}
            disabled={disabled}
            disabledReason={disabled ? "View only — funds need edit access" : undefined}
            compact
            className="mt-1"
          />
        </div>
        <div>
          <Label>Remarks</Label>
          <Input
            className="glass-input mt-1"
            value={form.remarks}
            onChange={(e) => set("remarks", e.target.value)}
            disabled={disabled}
          />
        </div>
      </FieldGrid>
      <AttachmentPicker
        label="Supporting document (sanction order / proceedings)"
        initial={
          initial?.attachmentId
            ? {
                attachmentId: initial.attachmentId,
                attachmentName: initial.attachmentName,
                attachmentType: initial.attachmentType,
              }
            : null
        }
        onChange={setFile}
        disabled={disabled}
      />
      {!disabled && (
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onSubmit({
              financialYear: form.financialYear,
              amountSanctioned: form.amountSanctioned === "" ? undefined : Number(form.amountSanctioned),
              amountReleased: form.amountReleased === "" ? undefined : Number(form.amountReleased),
              amountUtilized: form.amountUtilized === "" ? undefined : Number(form.amountUtilized),
              status: form.status,
              sanctionedDate: form.sanctionedDate || undefined,
              utilizedDate: form.utilizedDate || undefined,
              remarks: form.remarks || undefined,
              attachmentId: file?.attachmentId,
              attachmentName: file?.attachmentName,
              attachmentType: file?.attachmentType,
              clearAttachment: !file && !!initial?.attachmentId,
            });
            setBusy(false);
          }}
        >
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          {submitLabel}
        </Button>
      )}
    </div>
  );
}

function FundRowCard({
  fund,
  fundStatuses,
  canEdit,
  onUpdate,
  onDelete,
}: {
  fund: FundRow;
  fundStatuses: string[];
  canEdit: boolean;
  onUpdate: (fundId: string, vals: FundVals) => Promise<void>;
  onDelete: (fundId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <Card className="glass py-4">
      <CardContent className="px-4">
        {editing ? (
          <FundForm
            fundStatuses={fundStatuses}
            initial={fund}
            disabled={!canEdit}
            submitLabel="Save changes"
            onSubmit={async (vals) => {
              await onUpdate(fund._id, {
                ...vals,
                attachmentId: vals.attachmentId as never,
              });
              setEditing(false);
            }}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">FY {fund.financialYear}</p>
              <p className="text-muted-foreground">
                Sanctioned ₹{fund.amountSanctioned ?? 0} · Released ₹
                {fund.amountReleased ?? 0} · Utilized ₹{fund.amountUtilized ?? 0}
              </p>
              {fund.remarks && (
                <p className="text-xs text-muted-foreground">{fund.remarks}</p>
              )}
              {fund.attachmentId && (
                <AttachmentLink id={fund.attachmentId} name={fund.attachmentName} />
              )}
              {fund.updatedAt && (
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  Updated: {toDisplayDateTime(fund.updatedAt)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={fund.status} />
              {canEdit && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(fund._id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type NocVals = {
  nocNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  status?: string;
  renewalAppliedDate?: string;
  remarks?: string;
  attachmentId?: string;
  attachmentName?: string;
  attachmentType?: string;
  clearAttachment?: boolean;
};

export function NocForm({
  onSubmit,
  initial,
  submitLabel = "Save NOC record",
}: {
  onSubmit: (vals: NocVals) => Promise<void>;
  initial?: NocRow;
  submitLabel?: string;
}) {
  const [form, setForm] = useState({
    nocNumber: initial?.nocNumber ?? "",
    issuedDate: initial?.issuedDate ?? "",
    expiryDate: initial?.expiryDate ?? "",
    status: initial?.status ?? "Valid",
    renewalAppliedDate: initial?.renewalAppliedDate ?? "",
    remarks: initial?.remarks ?? "",
  });
  // "Fire NOC Validity Status" is derived, not hand-picked: the validity
  // (expiry) date decides Valid / Expiring Soon / Expired; NOC Available = No
  // (or nothing recorded) ⇒ Not Obtained.
  const derivedNocStatus = deriveFireNocStatus(
    "Yes",
    form.expiryDate || null,
    initial?.status ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<AttachmentValue | null>(
    initial?.attachmentId
      ? {
          attachmentId: initial.attachmentId,
          attachmentName: initial.attachmentName,
          attachmentType: initial.attachmentType,
        }
      : null,
  );
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="space-y-3">
      <FieldGrid>
        <div>
          <Label>Fire NOC Validity Status</Label>
          <div className="mt-1.5">
            <StatusBadge status={derivedNocStatus} />
          </div>
          <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
            Auto — from the validity date below
          </p>
        </div>
        <div>
          <Label>NOC number</Label>
          <Input
            className="glass-input mt-1"
            value={form.nocNumber}
            onChange={(e) => set("nocNumber", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="noc-issued-date">Issued date</Label>
          <DateInput
            id="noc-issued-date"
            label="NOC issued date"
            value={form.issuedDate}
            onChange={(iso) => set("issuedDate", iso)}
            max={todayLocalIso()}
            compact
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="noc-expiry-date">Expiry date</Label>
          <DateInput
            id="noc-expiry-date"
            label="NOC expiry date"
            value={form.expiryDate}
            onChange={(iso) => set("expiryDate", iso)}
            min={form.issuedDate || undefined}
            compact
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="noc-renewal-date">Renewal applied date</Label>
          <DateInput
            id="noc-renewal-date"
            label="NOC renewal applied date"
            value={form.renewalAppliedDate}
            onChange={(iso) => set("renewalAppliedDate", iso)}
            max={todayLocalIso()}
            compact
            className="mt-1"
          />
        </div>
        <div>
          <Label>Remarks</Label>
          <Input
            className="glass-input mt-1"
            value={form.remarks}
            onChange={(e) => set("remarks", e.target.value)}
          />
        </div>
      </FieldGrid>
      <AttachmentPicker
        label="NOC certificate / document"
        initial={
          initial?.attachmentId
            ? {
                attachmentId: initial.attachmentId,
                attachmentName: initial.attachmentName,
                attachmentType: initial.attachmentType,
              }
            : null
        }
        onChange={setFile}
      />
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onSubmit({
            nocNumber: form.nocNumber || undefined,
            issuedDate: form.issuedDate || undefined,
            expiryDate: form.expiryDate || undefined,
            status: derivedNocStatus,
            renewalAppliedDate: form.renewalAppliedDate || undefined,
            remarks: form.remarks || undefined,
            attachmentId: file?.attachmentId,
            attachmentName: file?.attachmentName,
            attachmentType: file?.attachmentType,
            clearAttachment: !file && !!initial?.attachmentId,
          });
          setBusy(false);
        }}
      >
        {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  );
}

function NocRowCard({
  noc,
  canEdit,
  onUpdate,
  onDelete,
}: {
  noc: NocRow;
  canEdit: boolean;
  onUpdate: (nocId: string, vals: NocVals) => Promise<void>;
  onDelete: (nocId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <Card className="glass py-4">
      <CardContent className="px-4">
        {editing ? (
          <NocForm
            initial={noc}
            submitLabel="Save changes"
            onSubmit={async (vals) => {
              await onUpdate(noc._id, {
                ...vals,
                attachmentId: vals.attachmentId as never,
              });
              setEditing(false);
            }}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">{noc.nocNumber || "Fire NOC"}</p>
              <p className="text-muted-foreground">
                Issued {toDisplayDate(noc.issuedDate)} · Expires{" "}
                {toDisplayDate(noc.expiryDate)}
              </p>
              {noc.attachmentId && (
                <AttachmentLink id={noc.attachmentId} name={noc.attachmentName} />
              )}
              {noc.updatedAt && (
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  Updated: {toDisplayDateTime(noc.updatedAt)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={noc.status} />
              {canEdit && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(noc._id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type BuildingVals = {
  buildingStatus?: string;
  buildingType?: string;
  yearOfConstruction?: string;
  lastRenovationDate?: string;
  renovationFundRequired?: number;
  remarks?: string;
};

export function BuildingForm({
  buildingStatuses,
  onSubmit,
  initial,
  submitLabel = "Save building record",
}: {
  buildingStatuses: string[];
  onSubmit: (vals: BuildingVals) => Promise<void>;
  initial?: BuildingRow;
  submitLabel?: string;
}) {
  const [form, setForm] = useState({
    buildingStatus: initial?.buildingStatus ?? "Good",
    buildingType: initial?.buildingType ?? "",
    yearOfConstruction: initial?.yearOfConstruction ?? "",
    lastRenovationDate: initial?.lastRenovationDate ?? "",
    renovationFundRequired: initial?.renovationFundRequired?.toString() ?? "",
    remarks: initial?.remarks ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="space-y-3">
      <FieldGrid>
        <div>
          <Label>Building status</Label>
          <Select
            value={form.buildingStatus}
            onValueChange={(v) => set("buildingStatus", v)}
          >
            <SelectTrigger className="glass-input mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {buildingStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Building type</Label>
          <Select
            value={form.buildingType || "__none"}
            onValueChange={(v) => set("buildingType", v === "__none" ? "" : v)}
          >
            <SelectTrigger className="glass-input mt-1 w-full">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">—</SelectItem>
              {["Own Building", "Rented Building", "Rent Free Building"].map(
                (t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Year of construction</Label>
          <Input
            className="glass-input mt-1"
            value={form.yearOfConstruction}
            onChange={(e) => set("yearOfConstruction", e.target.value)}
            placeholder="e.g. 1998"
          />
        </div>
        <div>
          <Label htmlFor="building-renovation-date">Last renovation date</Label>
          <DateInput
            id="building-renovation-date"
            label="Last renovation date"
            value={form.lastRenovationDate}
            onChange={(iso) => set("lastRenovationDate", iso)}
            max={todayLocalIso()}
            compact
            className="mt-1"
          />
        </div>
        <div>
          <Label>Renovation fund required (₹)</Label>
          <Input
            type="number"
            className="glass-input mt-1"
            value={form.renovationFundRequired}
            onChange={(e) => set("renovationFundRequired", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Remarks</Label>
          <Input
            className="glass-input mt-1"
            value={form.remarks}
            onChange={(e) => set("remarks", e.target.value)}
          />
        </div>
      </FieldGrid>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onSubmit({
            buildingStatus: form.buildingStatus,
            buildingType: form.buildingType || undefined,
            yearOfConstruction: form.yearOfConstruction || undefined,
            lastRenovationDate: form.lastRenovationDate || undefined,
            renovationFundRequired:
              form.renovationFundRequired === ""
                ? undefined
                : Number(form.renovationFundRequired),
            remarks: form.remarks || undefined,
          });
          setBusy(false);
        }}
      >
        {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  );
}

function BuildingRowCard({
  building,
  buildingStatuses,
  canEdit,
  onUpdate,
  onDelete,
}: {
  building: BuildingRow;
  buildingStatuses: string[];
  canEdit: boolean;
  onUpdate: (buildingId: string, vals: BuildingVals) => Promise<void>;
  onDelete: (buildingId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <Card className="glass py-4">
      <CardContent className="px-4">
        {editing ? (
          <BuildingForm
            buildingStatuses={buildingStatuses}
            initial={building}
            submitLabel="Save changes"
            onSubmit={async (vals) => {
              await onUpdate(building._id, vals);
              setEditing(false);
            }}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">
                {building.buildingType ? `${building.buildingType} — ` : ""}Built{" "}
                {building.yearOfConstruction || "—"}
              </p>
              <p className="text-muted-foreground">
                Last renovation {toDisplayDate(building.lastRenovationDate)} ·
                Renovation fund ₹{building.renovationFundRequired ?? 0}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <StatusBadge status={building.buildingStatus} />
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  Updated: {toDisplayDateTime(building.lastUpdatedAt)}
                </span>
              </div>
              {canEdit && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(building._id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- edit facility dialog ----------

function EditFacilityDialog({
  open,
  onOpenChange,
  facility,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facility: {
    block: string;
    phc: string;
    name: string;
    facilityType: string;
    phaseType?: string;
    eligibility: string;
    ninNumber?: string;
    saqshamFacilityType?: string;
    saqshamCategory?: string;
    remarks?: string;
  };
  onSave: (vals: Record<string, unknown>) => Promise<void>;
}) {
  // The snapshot the dialog opened with — the dirty check compares against it
  // so the “unsaved changes” warning can never fire on an untouched form.
  const initial = useMemo(
    () => ({
      block: facility.block,
      phc: facility.phc,
      name: facility.name,
      facilityType: facility.facilityType,
      phaseType: facility.phaseType ?? "",
      eligibility: facility.eligibility,
      ninNumber: facility.ninNumber ?? "",
      saqshamFacilityType: facility.saqshamFacilityType ?? "",
      saqshamCategory: facility.saqshamCategory ?? "",
      remarks: facility.remarks ?? "",
    }),
    [facility],
  );
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  // Re-seeding: the caller mounts this dialog with a changing `key` (see
  // below), so the useState initializer re-seeds on every open — no effect.
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Guard closing while there are unsaved edits.
  const requestClose = (next: boolean) => {
    if (!next && dirty) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit facility details</DialogTitle>
          <DialogDescription>
            Every field change is logged with old and new values.
          </DialogDescription>
        </DialogHeader>
        <FieldGrid>
          <div>
            <Label>Block name</Label>
            <Input className="glass-input mt-1" value={form.block} onChange={(e) => set("block", e.target.value)} />
          </div>
          <div>
            <Label>PHC name</Label>
            <Input className="glass-input mt-1" value={form.phc} onChange={(e) => set("phc", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Facility name</Label>
            <Input className="glass-input mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label>Facility type</Label>
            <Input className="glass-input mt-1" value={form.facilityType} onChange={(e) => set("facilityType", e.target.value)} />
          </div>
          <div>
            <Label>NIN Number</Label>
            <Input
              className="glass-input mt-1"
              value={form.ninNumber}
              onChange={(e) => set("ninNumber", e.target.value)}
              placeholder="Unique facility ID"
            />
          </div>
          <div>
            <Label>Phase type</Label>
            <Input className="glass-input mt-1" value={form.phaseType} onChange={(e) => set("phaseType", e.target.value)} />
          </div>
          <div>
            <Label>NQAS eligibility</Label>
            <Select value={form.eligibility} onValueChange={(v) => set("eligibility", v)}>
              <SelectTrigger className="glass-input mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ELIGIBILITIES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>SaQsham Facility_Type</Label>
            <Input
              className="glass-input mt-1"
              value={form.saqshamFacilityType}
              onChange={(e) => set("saqshamFacilityType", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>SaQsham Facility Name/Category</Label>
            <Input
              className="glass-input mt-1"
              value={form.saqshamCategory}
              onChange={(e) => set("saqshamCategory", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>General remarks</Label>
            <Textarea className="glass-input mt-1" rows={2} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
          </div>
        </FieldGrid>
        <DialogFooter className="items-center gap-2 sm:justify-between">
          {dirty ? (
            <span className="mr-auto flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-3.5" /> Unsaved changes
            </span>
          ) : (
            <span className="mr-auto" />
          )}
          <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => requestClose(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onSave({
                block: form.block,
                phc: form.phc,
                name: form.name,
                facilityType: form.facilityType,
                phaseType: form.phaseType || undefined,
                eligibility: form.eligibility as "Eligible" | "Not Eligible" | "Possible",
                ninNumber: form.ninNumber || undefined,
                saqshamFacilityType: form.saqshamFacilityType || undefined,
                saqshamCategory: form.saqshamCategory || undefined,
                remarks: form.remarks || undefined,
              });
              setBusy(false);
            }}
          >
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save changes
          </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Discard confirmation — only reachable while the form is dirty. */}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have edited {facility.name}. Closing now keeps the previously
              saved values and drops these edits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white"
              onClick={() => {
                setForm(initial);
                setDiscardOpen(false);
                onOpenChange(false);
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

// module row types (loose, client side)
type FundRow = {
  _id: string;
  financialYear: string;
  amountSanctioned?: number;
  amountReleased?: number;
  amountUtilized?: number;
  status: string;
  sanctionedDate?: string;
  utilizedDate?: string;
  remarks?: string;
  attachmentId?: string;
  attachmentName?: string;
  attachmentType?: string;
  updatedAt?: number | null;
};
type NocRow = {
  _id: string;
  nocNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  status: string;
  renewalAppliedDate?: string;
  remarks?: string;
  attachmentId?: string;
  attachmentName?: string;
  attachmentType?: string;
  updatedAt?: number | null;
};
type BuildingRow = {
  _id: string;
  buildingStatus: string;
  buildingType?: string | null;
  lastUpdatedAt?: number | null;
  yearOfConstruction?: string;
  lastRenovationDate?: string;
  renovationFundRequired?: number;
  remarks?: string;
};
