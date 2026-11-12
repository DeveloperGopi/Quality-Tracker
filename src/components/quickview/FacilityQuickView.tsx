/**
 * FACILITY QUICK VIEW — the centred dialog that replaces the right drawer.
 *
 * WHY (root cause, see lib/facilityQuickView): the drawer painted its stepper
 * from `stageOf(row)` (a record-derived position) while its header chip read
 * `facility.currentStatus` — two rules, so "Not Eligible" could sit beside a
 * green Eligibility tick and a blue State Assessment. It also had two tab
 * rows, no save action and clipped pills. This dialog keeps ONE section list,
 * ONE lifecycle rule and ONE save path.
 *
 * Performance shape:
 *   • header + visible section paint from the cached list row instantly;
 *   • the full record loads in the background (skeletons per section);
 *   • sections mount lazily on first visit and stay mounted;
 *   • validation + diff are pure and local (no request per keystroke).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Printer,
  Save,
  ShieldAlert,
  Undo2,
  Wrench,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AttachmentValue } from "@/components/AttachmentPicker";
import { DocumentStatusCard } from "@/components/documents/DocumentStatusCard";
import { CycleHistoryPanel } from "@/components/profile/CycleHistoryPanel";
import { IACard } from "@/components/ia/IACard";
import { FacilityScoresPanel } from "@/components/scores/FacilityScoresPanel";
import { QuickViewOverview } from "@/components/quickview/QuickViewOverview";
import { DOCUMENT_SHORT_LABEL } from "@/lib/documentsConfig";
import type { DocKey } from "@/convex/storage/validation";
import { FieldRow, fieldKeyFor } from "@/components/quickview/FieldRow";
import { QuickViewHeader } from "@/components/quickview/QuickViewHeader";
import { QuickViewStepper } from "@/components/quickview/QuickViewStepper";
import { SectionNav, type SectionNavItem } from "@/components/quickview/SectionNav";
import { useResultReaderEnabled } from "@/hooks/use-result-reader";
import { ReviewChangesDialog, SaveBar } from "@/components/quickview/SaveBar";
import {
  ConflictDialog,
  DiscardConfirmDialog,
  UnsavedGuardDialog,
} from "@/components/quickview/QuickViewDialogs";
import {
  trackerDraftFromRow,
  trackerEditorOptions,
  trackerUpdatePayload,
  type RowEditState,
  type TrackerDraft,
  type TrackerRow,
} from "@/components/master/EditModeCells";
import type { MasterRow } from "@/lib/masterColumns";
import {
  QV_SECTIONS,
  attentionFor,
  blockingIssues,
  clearQuickViewDraft,
  deriveStage,
  loadQuickViewDraft,
  quickViewChanges,
  saveQuickViewDraft,
  sectionColumns,
  recertificationState,
  sectionCompleteness,
  statusChangeNotice,
  statusForDisplay,
  updatedRecently,
  validateQuickView,
  validateSurveillance,
  visitFor,
  type QvChange,
  type QvIssue,
  type QvSectionKey,
} from "@/lib/facilityQuickView";
import { formatFyQuarter } from "@/lib/iaImport";
import { normalizeDocumentRules } from "@/lib/documentRules";
import { toDisplayStamp } from "@/lib/format";
import { todayLocalIso } from "@/lib/today";
import { cn } from "@/lib/utils";

export type QuickViewSaveState = RowEditState;

export type FacilityQuickViewProps = {
  row: MasterRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: Record<string, string>;
  canEdit?: boolean;
  /** The filtered list — Previous/Next walk exactly this order. */
  siblings?: MasterRow[];
  onNavigate?: (row: MasterRow) => void;
  initialSection?: QvSectionKey | string;
  onSectionChange?: (section: string) => void;
  onSave?: (row: MasterRow, state: QuickViewSaveState) => Promise<void>;
  onPrint?: (row: MasterRow) => void;
  onExport?: (row: MasterRow, format: "pdf" | "excel") => void;
  onOpenProfile?: (row: MasterRow) => void;
  settings?: Record<string, unknown>;
  userId?: string | null;
  dataAsOf?: number | null;
  recentDays?: number;
  /** Warm the full-record query on hover/focus (the list calls this). */
  onPrefetch?: (row: MasterRow) => void;
  /** Row-actions deep link: opening FROM the Update button starts on Edit
   *  (section = the URL's smart-view match — peer of `initialSection`). */
  editRequest?: { token: number; facilityId: string } | null;
};

export function FacilityQuickView(props: FacilityQuickViewProps) {
  const { row, open, onOpenChange } = props;
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  /* Native <dialog>: top layer, focus trap, Esc, page behind inert. */
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    // `showModal` puts the dialog in the top layer (focus trap, inert page).
    // The fallbacks keep the dialog usable in environments without the
    // <dialog> API (test DOMs, very old browsers).
    if (open && row && !el.open) {
      if (typeof el.showModal === "function") el.showModal();
      else el.setAttribute("open", "");
    }
    if ((!open || !row) && el.open) {
      if (typeof el.close === "function") el.close();
      else el.removeAttribute("open");
    }
  }, [open, row]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      data-testid="facility-quick-view"
      aria-modal="true"
      aria-labelledby="qv-title"
      className="qv-dialog"
      onCancel={(e) => {
        // Esc never drops edits silently — the session decides.
        e.preventDefault();
        dialogRef.current?.dispatchEvent(new CustomEvent("qv-close-request"));
      }}
      onClick={(e) => {
        // Clicking the scrim targets the dialog element itself.
        if (e.target === e.currentTarget) {
          dialogRef.current?.dispatchEvent(new CustomEvent("qv-close-request"));
        }
      }}
    >
      {row && open && (
        <QuickViewSession
          key={row.facility._id}
          {...props}
          row={row}
          onRequestClose={() => onOpenChange(false)}
          dialogRef={dialogRef}
        />
      )}
    </dialog>
  );
}

type SessionProps = FacilityQuickViewProps & {
  row: MasterRow;
  onRequestClose: () => void;
  dialogRef: RefObject<HTMLDialogElement | null>;
};

function QuickViewSession({
  row,
  labels,
  canEdit = false,
  siblings = [],
  onNavigate,
  initialSection,
  onSectionChange,
  onSave,
  onPrint,
  onExport,
  onOpenProfile,
  settings,
  userId,
  dataAsOf,
  recentDays = 0,
  onPrefetch,
  editRequest,
  onRequestClose,
  dialogRef,
}: SessionProps) {
  const navigate = useNavigate();
  const today = todayLocalIso();

  /* ---------------- data ---------------- */
  const profile = useQuery(api.facilities.getFacilityProfile, {
    facilityId: row.facility._id as never,
  });
  const record = (profile ?? null) as unknown as Record<string, unknown> | null;
  /* The document list powers the header warning strip, the Overview card and
     the Save-bar hint. It is the SAME subscription the Documents section
     makes, so the dialog still has one source for the n/6 and the required
     list (Convex dedupes identical query + args). */
  const docsData = useQuery(api.documents.listForFacility, {
    facilityId: row.facility._id as never,
  });
  const requiredMissingDocs = (docsData?.requiredMissing ?? []) as DocKey[];
  const blockingMissingDocs = (docsData?.blockingMissing ?? []) as DocKey[];
  const missingDocLabel = (key?: DocKey | null) =>
    (key ? DOCUMENT_SHORT_LABEL[key] ?? key : "") || "required document";

  const editorOptions = useMemo(() => trackerEditorOptions(settings), [settings]);
  const lifecycleSettings = useMemo(
    () => (profile?.settings as Record<string, unknown> | undefined) ?? settings,
    [profile, settings],
  );

  /* ---------------- draft state ---------------- */
  const initial = useMemo<TrackerDraft>(
    () => trackerDraftFromRow(row as unknown as TrackerRow),
    [row],
  );
  const [draft, setDraft] = useState<TrackerDraft>(() => {
    const saved = loadQuickViewDraft(row.facility._id, userId);
    return saved ? { ...initial, ...saved } : initial;
  });
  const [files, setFiles] = useState<RowEditState["files"]>({});
  const [clears, setClears] = useState<RowEditState["clears"]>({});
  const [hadDraft] = useState(() => loadQuickViewDraft(row.facility._id, userId) != null);

  /** After a save the server row is still the OLD one for a moment: the local
   *  baseline becomes exactly what was sent, so the bar reads "Saved ✓" while a
   *  zero diff means "No changes".
   *
   *  ROOT CAUSE of "I saved and it still says 3 unsaved changes": the old code
   *  reset this baseline whenever the `initial` object IDENTITY changed. The
   *  list rebuilds its rows on every reactive update (and on every parent
   *  render), so the reset fired immediately after a save and the bar compared
   *  the fresh draft against the STALE list row again. The baseline now only
   *  changes when this session saves or discards; a genuine remote edit is
   *  caught by the version check (`baselineUpdatedAt`) before saving. */
  const [savedBaseline, setSavedBaseline] = useState<TrackerDraft | null>(null);
  const baseline = savedBaseline ?? initial;
  const changes = useMemo(() => quickViewChanges(baseline, draft), [baseline, draft]);
  const fileChanges =
    Object.values(files).filter((f) => f != null).length +
    Object.values(clears).filter(Boolean).length;
  const dirty = changes.length > 0 || fileChanges > 0;
  const issues = useMemo(
    () => [
      ...validateQuickView(draft, today, baseline),
      ...validateSurveillance(row, draft, today, baseline),
    ],
    [draft, today, baseline, row],
  );
  const blocking = blockingIssues(issues);

  /* Keep a local draft per facility/user so a close never loses edits. */
  useEffect(() => {
    if (dirty) saveQuickViewDraft(row.facility._id, userId, draft);
  }, [dirty, draft, row.facility._id, userId]);

  /* ---------------- mode / section ---------------- */
  const readerEnabled = useResultReaderEnabled();
  const sections = useMemo(
    () => (readerEnabled ? QV_SECTIONS : QV_SECTIONS.filter((s) => s.key !== "scores")),
    [readerEnabled],
  );
  const firstSection = (sections.find((s) => s.key === initialSection)?.key ??
    "overview") as QvSectionKey;
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [section, setSection] = useState<QvSectionKey>(firstSection);
  const [mounted, setMounted] = useState<Set<QvSectionKey>>(
    () => new Set<QvSectionKey>(["overview", firstSection]),
  );
  const [activeField, setActiveField] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /** Section the user (or a deep link) navigated to — the effect below scrolls
   *  to it; the token makes a repeat click on the same section scroll again. */
  const [scrollRequest, setScrollRequest] = useState<{ key: string; token: number } | null>(
    null,
  );
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRequest) return;
    contentRef.current
      ?.querySelector<HTMLElement>(`#qv-section-${scrollRequest.key}`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [scrollRequest]);

  const goToSection = useCallback(
    (key: string) => {
      const def = sections.find((s) => s.key === key);
      if (!def) return;
      setSection(def.key);
      setMounted((prev) => (prev.has(def.key) ? prev : new Set(prev).add(def.key)));
      // The scroll itself happens in the effect below (refs are never read
      // during render).
      setScrollRequest({ key: def.key, token: Date.now() });
    },
    [sections],
  );

  const onSelectSection = useCallback(
    (key: string) => {
      goToSection(key);
      onSectionChange?.(key);
    },
    [goToSection, onSectionChange],
  );

  /* The header strip and every Fix button never own an upload control: they
     open the Documents section and hand the type to the ONE uploader inside
     the Document status card (its "File as" tray). */
  const [docRequest, setDocRequest] = useState<{ key: DocKey; token: number } | null>(null);
  const openDocuments = useCallback(
    (docKey?: DocKey) => {
      goToSection("documents");
      if (docKey) setDocRequest({ key: docKey, token: Date.now() });
    },
    [goToSection],
  );

  /* Deep link section changes (Back/Forward, a pasted link). React's
     "adjust state during render" pattern — the URL wins, no post-paint
     flash, no effect that sets state. */
  const [mirroredUrlSection, setMirroredUrlSection] = useState(firstSection);
  if (mirroredUrlSection !== firstSection) {
    setMirroredUrlSection(firstSection);
    if (firstSection !== section) goToSection(firstSection);
  }

  /* The Update button's edit deep link: one token per open-from-actions,
     applied during render — switches to Edit and jumps to the opened
     section, without an effect that sets state. */
  const [appliedEditToken, setAppliedEditToken] = useState(0);
  if (
    editRequest &&
    editRequest.facilityId === String(row.facility._id) &&
    editRequest.token !== appliedEditToken
  ) {
    setAppliedEditToken(editRequest.token);
    if (canEdit) setMode("edit");
  }

  /* Scroll-spy: the nav follows the section at the top of the viewport. */
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const top = el.getBoundingClientRect().top + 56;
        let current: QvSectionKey = "overview";
        for (const def of sections) {
          const node = el.querySelector<HTMLElement>(`#qv-section-${def.key}`);
          if (node && node.getBoundingClientRect().top <= top) current = def.key;
        }
        setSection((prev) => (prev === current ? prev : current));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [mounted]);

  /* ---------------- save flow ---------------- */
  const [saving, setSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [guardOpen, setGuardOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"close" | "prev" | "next" | null>(null);
  const [statusConfirmed, setStatusConfirmed] = useState(false);
  const [undo, setUndo] = useState<QuickViewSaveState | null>(null);
  const baselineUpdatedAt = useRef<number | null>(row.facility.updatedAt ?? null);
  const undoTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
    },
    [],
  );

  const statusNotice = useMemo(
    () => (dirty ? statusChangeNotice(row, draft, lifecycleSettings as never) : null),
    [dirty, row, draft, lifecycleSettings],
  );

  const position = useMemo(() => {
    const index = siblings.findIndex((r) => r.facility._id === row.facility._id);
    return { index: index < 0 ? 0 : index, total: siblings.length };
  }, [siblings, row]);
  const nextRow = position.total ? siblings[position.index + 1] ?? null : null;
  const prevRow = position.total ? siblings[position.index - 1] ?? null : null;

  const runSave = useCallback(
    async (state: QuickViewSaveState, then?: "close" | "prev" | "next") => {
      if (!onSave) return;
      // Version check: the row changed on the server while this dialog was open.
      const remote = row.facility.updatedAt ?? null;
      if (baselineUpdatedAt.current == null) baselineUpdatedAt.current = remote;
      else if (remote && baselineUpdatedAt.current !== remote) {
        setConflictOpen(true);
        return;
      }
      setSaving(true);
      setSaveError(null);
      const previous: QuickViewSaveState = { draft, files, clears };
      try {
        await onSave(row, state);
        setSavedLabel(
          `Saved ✓ ${new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
        );
        setUndo(previous);
        if (undoTimer.current) window.clearTimeout(undoTimer.current);
        undoTimer.current = window.setTimeout(() => setUndo(null), 30_000);
        clearQuickViewDraft(row.facility._id, userId);
        // Accept exactly what was sent as the new baseline, so the bar reads
        // "Saved ✓" and "No changes" — and clear the pending document edits,
        // which were part of the same save.
        baselineUpdatedAt.current = null;
        setStatusConfirmed(false);
        setSavedBaseline({ ...state.draft });
        setDraft({ ...state.draft });
        setFiles({});
        setClears({});
      if (then === "close") onRequestClose();
        if (then === "next" && nextRow) onNavigate?.(nextRow);
        if (then === "prev" && prevRow) onNavigate?.(prevRow);
      } catch (err) {
        // Rollback: the server rejected the transaction; nothing was applied
        // and the draft stays here to retry (or Undo is unnecessary).
        setSaveError(err instanceof Error ? err.message : "Save failed — try again");
      } finally {
        setSaving(false);
      }
    },
    [
      onSave,
      row,
      draft,
      files,
      clears,
      userId,
      nextRow,
      prevRow,
      onNavigate,
      onRequestClose,
    ],
  );

  const handleSave = useCallback(() => {
    if (!dirty || blocking.length > 0 || saving) return;
    // A status-moving save always gets a confirmation step first.
    if (statusNotice && !statusConfirmed) {
      setReviewOpen(true);
      return;
    }
    void runSave({ draft, files, clears });
  }, [dirty, blocking, saving, statusNotice, statusConfirmed, runSave, draft, files, clears]);

  const discard = useCallback(() => {
    // Every field returns to its STORED value and the local draft is removed;
    // the dialog stays open, back in View mode (task §2.4).
    setDraft(initial);
    setFiles({});
    setClears({});
    clearQuickViewDraft(row.facility._id, userId);
    setSavedBaseline(null);
    setSavedLabel(null);
    setSaveError(null);
    setUndo(null);
    setStatusConfirmed(false);
    setActiveField(null);
    setMode("view");
  }, [initial, row.facility._id, userId]);

  const requestAction = useCallback(
    (action: "close" | "prev" | "next") => {
      const run = () => {
        if (action === "close") onRequestClose();
        if (action === "next" && nextRow) onNavigate?.(nextRow);
        if (action === "prev" && prevRow) onNavigate?.(prevRow);
      };
      if (dirty) {
        setPendingAction(action);
        setGuardOpen(true);
        return;
      }
      run();
    },
    [dirty, onRequestClose, onNavigate, nextRow, prevRow],
  );

  /* Esc + scrim requests arrive as a DOM event from the dialog. */
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handler = () => requestAction("close");
    el.addEventListener("qv-close-request", handler);
    return () => el.removeEventListener("qv-close-request", handler);
  }, [dialogRef, requestAction]);

  /* Keyboard: Ctrl/Cmd+S saves, J/K + arrows walk the filtered list. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    const typing = !!target.closest("input,textarea,select,[contenteditable='true']");
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      handleSave();
      return;
    }
    if (typing || e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.key === "j" || e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      requestAction("next");
    }
    if (e.key === "k" || e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      requestAction("prev");
    }
  };

  const focusIssue = (field: string) => {
    // A document issue is fixed by uploading, not by editing a text field.
    if (field === "documents") {
      setMode("edit");
      openDocuments(requiredMissingDocs[0]);
      return;
    }
    const key = fieldKeyFor(field) ?? field;
    const sectionKey = (sections.find((s) =>
      sectionColumns(s.key).some((c) => c.key === field),
    )?.key ?? "overview") as QvSectionKey;
    setMode("edit");
    goToSection(sectionKey);
    setActiveField(key);
  };

  /* ---------------- derived render data ---------------- */
  /* The effective Admin → Documents rules: the same rules the list, the
     uploader and Needs attention read, so a changed rule shows instantly. */
  const documentRules = useMemo(
    () => normalizeDocumentRules((settings as Record<string, unknown> | undefined)?.documentRules),
    [settings],
  );
  const attention = useMemo(
    () => attentionFor(row, today, documentRules),
    [row, today, documentRules],
  );
  const navItems: SectionNavItem[] = useMemo(
    () =>
      sections.map((def) => {
        const items = attention.filter((a) => a.section === def.key);
        const base = sectionCompleteness(row, def.key, documentRules);
        let done = base.done;
        let total = base.total;
        let warning = items.length > 0;
        // The LIVE document list is the authority for the n/6 and the missing
        // required file (an upload clears the amber dot immediately).
        if (def.key === "documents" && docsData) {
          total = docsData.totalCount ?? total;
          done = Math.min(total, docsData.uploadedCount ?? 0);
          warning = (docsData.requiredMissing?.length ?? 0) > 0 || items.length > 0;
        }
        // The rule blocks the NQAS save, so the NQAS section carries the same
        // amber dot as Documents — one indicator system, no second warning.
        if (def.key === "nqas" && blockingMissingDocs.length > 0) warning = true;
        return {
          def,
          ...base,
          done,
          total,
          warning,
          error: items.some((a) => a.severity === "blocking"),
        };
      }),
    [row, attention, documentRules, docsData, blockingMissingDocs.length, sections],
  );
  const lifecycle = useMemo(
    () => deriveStage(row, lifecycleSettings as never, today),
    [row, lifecycleSettings, today],
  );
  const updated = updatedRecently(row.facility.updatedAt, recentDays);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-background" onKeyDown={onKeyDown}>
        <QuickViewHeader
          row={row}
          index={position.index}
          total={position.total}
          onPrev={() => {
            if (prevRow) onPrefetch?.(prevRow);
            requestAction("prev");
          }}
          onNext={() => {
            if (nextRow) onPrefetch?.(nextRow);
            requestAction("next");
          }}
          mode={mode}
          canEdit={canEdit}
          onModeChange={(m) => {
            setMode(m);
            if (m === "view") setActiveField(null);
          }}
          onClose={() => requestAction("close")}
          updatedLabel={updated}
          status={statusForDisplay(row, lifecycleSettings as never, today)}
          requiredDocMissing={requiredMissingDocs.length}
          onOpenDocuments={() => openDocuments()}
          copied={copied}
          draftExists={hadDraft || dirty}
          onCopyNin={async () => {
            try {
              await navigator.clipboard.writeText(row.facility.ninNumber ?? "");
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard blocked — the NIN is still selectable text */
            }
          }}
        />

        <QuickViewStepper lifecycle={lifecycle} onJump={goToSection} />

        <div className="flex min-h-0 flex-1 max-md:flex-col">
          <SectionNav items={navItems} active={section} onSelect={onSelectSection} />

          <div
            ref={contentRef}
            className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-5"
            data-testid="quick-view-content"
          >
            {attention.length > 0 && (
              <NeedsAttention items={attention} onFix={focusIssue} onJump={onSelectSection} />
            )}

            {sections.filter((def) => mounted.has(def.key)).map((def) => (
              <SectionCard
                key={def.key}
                row={row}
                sectionKey={def.key}
                label={def.label}
                labels={labels}
                editorOptions={editorOptions}
                mode={mode}
                canEdit={canEdit}
                draft={draft}
                initial={initial}
                issues={issues}
                changes={changes}
                activeField={activeField}
                setActiveField={setActiveField}
                onDraftChange={(field, value) =>
                  setDraft((d) => ({ ...d, [field]: value }))
                }
                onFile={(slot, value) => setFiles((f) => ({ ...f, [slot]: value }))}
                onJump={onSelectSection}
                onSaveSection={handleSave}
                profileLoading={profile === undefined}
                profile={record}
                settings={lifecycleSettings}
                userId={userId}
                docs={docsData ?? null}
                onOpenDocuments={openDocuments}
                documentRequest={docRequest}
                blockingDoc={blockingMissingDocs[0] ?? null}
              />
            ))}
          </div>
        </div>

        {/* Sticky footer: secondary actions left, save controls right. */}
        <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-background/95 px-4 py-2 backdrop-blur">
          <div className="flex flex-wrap items-center gap-1">
            {onPrint && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => onPrint(row)}
                data-tip="Print the 1–2 page facility sheet"
              >
                <Printer className="mr-1 size-3.5" /> Print facility sheet
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() =>
                onOpenProfile
                  ? onOpenProfile(row)
                  : navigate(`/facilities/${row.facility._id}`)
              }
            >
              <ExternalLink className="mr-1 size-3.5" /> Open full profile
            </Button>
            {onExport && (
              <div className="flex items-center gap-0.5">
                <span className="pl-2 text-[11px] text-muted-foreground">Export</span>
                <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => onExport(row, "pdf")}>
                  PDF
                </Button>
                <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => onExport(row, "excel")}>
                  Excel
                </Button>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 sm:max-w-[62%]">
            {mode === "edit" ? (
              <>
                {saveError && (
                  <p
                    role="alert"
                    className="mb-1 flex items-center gap-1 text-[11px] font-medium text-destructive"
                  >
                    <ShieldAlert className="size-3.5" /> {saveError} — your draft is kept.
                  </p>
                )}
                {undo && (
                  <div className="mb-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                    Changed by mistake?
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1 text-[11px]"
                      onClick={() => {
                        setUndo(null);
                        void runSave(undo);
                      }}
                    >
                      <Undo2 className="mr-1 size-3" /> Undo
                    </Button>
                  </div>
                )}
                <SaveBar
                  changes={changes}
                  issues={issues}
                  saving={saving}
                  savedLabel={savedLabel}
                  dirty={dirty}
                  fileChanges={fileChanges}
                  documentHint={
                    blockingMissingDocs.length > 0
                      ? {
                          label: missingDocLabel(blockingMissingDocs[0]),
                          onOpen: () => openDocuments(blockingMissingDocs[0]),
                        }
                      : null
                  }
                  onDiscard={() => setDiscardOpen(true)}
                  onSave={handleSave}
                  onSaveAndNext={() => void runSave({ draft, files, clears }, "next")}
                  onReview={() => setReviewOpen(true)}
                  onFocusIssue={focusIssue}
                  canSaveAndNext={!!nextRow && !!onNavigate}
                />
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] text-muted-foreground">
                {dataAsOf && <span>Data as of {toDisplayStamp(dataAsOf)} IST</span>}
                <span aria-hidden>·</span>
                <span className="min-w-0 truncate">{lifecycle.nextAction}</span>
              </div>
            )}
          </div>
        </footer>
      </div>

      <ReviewChangesDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        changes={changes}
        issues={issues}
        statusNotice={statusNotice}
        onConfirm={() => {
          setStatusConfirmed(true);
          setReviewOpen(false);
          void runSave({ draft, files, clears });
        }}
        saving={saving}
      />

      <DiscardConfirmDialog
        open={discardOpen}
        count={changes.length + fileChanges}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          discard();
        }}
      />

      <UnsavedGuardDialog
        open={guardOpen}
        count={changes.length}
        saving={saving || !onSave}
        onCancel={() => setGuardOpen(false)}
        onDiscard={() => {
          discard();
          setGuardOpen(false);
          const action = pendingAction;
          setPendingAction(null);
          if (action === "close") onRequestClose();
          if (action === "next" && nextRow) onNavigate?.(nextRow);
          if (action === "prev" && prevRow) onNavigate?.(prevRow);
        }}
        onSave={async () => {
          await runSave({ draft, files, clears }, pendingAction ?? undefined);
          setGuardOpen(false);
        }}
      />

      <ConflictDialog
        open={conflictOpen}
        saving={saving}
        remoteLabel="a moment ago"
        onKeepMine={() => {
          baselineUpdatedAt.current = row.facility.updatedAt ?? null;
          setConflictOpen(false);
          void runSave({ draft, files, clears });
        }}
        onTakeTheirs={() => {
          discard();
          setConflictOpen(false);
        }}
        onReview={() => {
          setConflictOpen(false);
          setReviewOpen(true);
        }}
      />
    </>
  );
}

/* --------------------------------------------------------------------------- */
/* Sections                                                                    */
/* --------------------------------------------------------------------------- */

function SectionCard({
  row,
  sectionKey,
  label,
  labels,
  editorOptions,
  mode,
  canEdit,
  draft,
  initial,
  issues,
  changes,
  activeField,
  setActiveField,
  onDraftChange,
  onFile,
  onJump,
  onSaveSection,
  profileLoading,
  profile,
  onOpenDocuments,
  documentRequest,
  blockingDoc,
  settings,
  userId,
  docs,
}: {
  row: MasterRow;
  sectionKey: QvSectionKey;
  label: string;
  labels: Record<string, string>;
  editorOptions: ReturnType<typeof trackerEditorOptions>;
  mode: "view" | "edit";
  canEdit: boolean;
  draft: TrackerDraft;
  initial: TrackerDraft;
  issues: QvIssue[];
  changes: QvChange[];
  activeField: string | null;
  setActiveField: (field: string | null) => void;
  onDraftChange: (field: string, value: string) => void;
  onFile: (slot: string, value: AttachmentValue | null) => void;
  onJump: (section: string) => void;
  onSaveSection: () => void;
  profileLoading: boolean;
  profile: Record<string, unknown> | null;
  /** Open the ONE Documents card (optionally preselecting a type). */
  onOpenDocuments: (docKey?: DocKey) => void;
  settings?: Record<string, unknown> | null;
  userId?: string | null;
  docs?: { uploaded?: number; total?: number; requiredMissing?: unknown } | null;
  documentRequest: { key: DocKey; token: number } | null;
  /** A missing required file that BLOCKS saving (Admin rule) → the NQAS
   *  section says which file and offers the uploader, once. */
  blockingDoc: DocKey | null;
}) {
  const columns = sectionColumns(sectionKey);
  const sectionChanged = changes.some((c) => c.section === sectionKey);
  const isAudit = sectionKey === "audit";

  return (
    <section
      id={`qv-section-${sectionKey}`}
      data-qv-section={sectionKey}
      aria-labelledby={`qv-heading-${sectionKey}`}
      className="mb-3 overflow-hidden rounded-xl border border-border/60 bg-card"
    >
      {/* Sticky inside the scroll area: the section name stays visible while
          its fields scroll under it. */}
      <div className="sticky top-0 z-[1] flex items-center justify-between gap-2 border-b border-border/40 bg-card/95 px-3 py-2 backdrop-blur">
        <h3 id={`qv-heading-${sectionKey}`} className="text-sm font-semibold text-foreground">
          {label}
        </h3>
        {mode === "edit" && sectionChanged && (
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={onSaveSection}>
            <Save className="mr-1 size-3" /> Save section
          </Button>
        )}
      </div>

      {sectionKey === "nqas" && blockingDoc && mode === "edit" && (
        <p
          className="flex flex-wrap items-center gap-1.5 border-b border-amber-200/70 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-900"
          data-testid="qv-nqas-document-block"
        >
          <AlertTriangle className="size-3.5 shrink-0" />
          {DOCUMENT_SHORT_LABEL[blockingDoc] ?? blockingDoc} is required for this facility —
          saving is blocked until it is uploaded.
          <button
            type="button"
            className="ml-1 font-semibold underline underline-offset-2"
            onClick={() => onOpenDocuments(blockingDoc)}
          >
            Upload {DOCUMENT_SHORT_LABEL[blockingDoc] ?? blockingDoc} to save
          </button>
        </p>
      )}

      {isAudit ? (
        <AuditList profile={profile} loading={profileLoading} />
      ) : sectionKey === "scores" ? (
        <FacilityScoresPanel facilityId={String(row.facility._id)} />
      ) : sectionKey === "history" ? (
        <div className="p-3">
          <CycleHistoryPanel
            facilityId={String(row.facility._id)}
            currentCycleNumber={row.cycleNumber ?? null}
            canEdit={canEdit}
            className="border-0 bg-transparent p-0"
          />
        </div>
      ) : sectionKey === "documents" ? (
        <div className="p-3">
          {/* ONE Documents entry (task 3.1): the Document status card — the
              same component the Profile renders directly before Recent
              activity. It hosts the app's only "File as" tray, so the old
              section's drop box, banner, status row, "Not uploaded" chips and
              footnote are gone with it. */}
          <DocumentStatusCard
            facilityId={String(row.facility._id)}
            canEdit={canEdit}
            preselectKey={documentRequest?.key ?? null}
            className="border-0 bg-transparent p-0"
          />
        </div>
      ) : sectionKey === "overview" ? (
        <QuickViewOverview
          row={row}
          canEdit={canEdit}
          settings={settings}
          docs={docs}
          onJump={onJump}
          onOpenDocuments={(key) => onOpenDocuments(key as DocKey)}
          remarks={draft.remarks ?? ""}
          onRemarksChange={(value) => onDraftChange("remarks", value)}
        />
      ) : (
        <>
          <dl className="divide-y divide-border/40">
            {columns.map((column) => {
              // The header already shows name, type, block, PHC, NIN and the
              // cycle — Overview is SaQsham name, remarks and a short summary
              // (task §7.3), never a second copy of the header.
              if (
                column.key === "facility" ||
                column.key === "block" ||
                column.key === "phc" ||
                (                (column.key === "type" ||
                  column.key === "nin" ||
                  column.key === "certCycle"))
              )
                return null;
              const field = fieldKeyFor(column.key);
              const fieldIssues = field ? issues.filter((i) => i.field === field) : [];
              const issue =
                fieldIssues.find((i) => i.severity === "blocking") ??
                fieldIssues[0] ??
                undefined;
              return (
                <FieldRow
                  key={column.key}
                  row={row}
                  column={column}
                  label={labels[column.key] ?? column.label}
                  initialValue={field ? initial[field] : undefined}
                  draftValue={field ? draft[field] : undefined}
                  editing={mode === "edit" && canEdit}
                  canEdit={canEdit}
                  options={editorOptions}
                  issue={issue}
                  active={!!field && activeField === field}
                  onActivate={() => field && setActiveField(field)}
                  onDeactivate={() => setActiveField(null)}
                  onDraftChange={onDraftChange}
                  onFile={onFile}
                />
              );
            })}
          </dl>
          {sectionKey === "ia" && (
            <div className="border-t border-border/40 p-3">
              <IACard
                rows={row.iaq?.rows ?? []}
                settings={settings}
                userId={userId}
                canImport={canEdit}
              />
            </div>
          )}
          {sectionKey === "eligibility" && <WhyStatus row={row} onJump={onJump} />}
          {sectionKey === "ia" && row.iaq && (
            <p className="border-t border-border/40 px-3 py-2 text-[11px] text-muted-foreground">
              Calculated from the stored quarters{" "}
              <b className="font-semibold text-foreground">
                {formatFyQuarter(row.iaq.pair.current.fy, row.iaq.pair.current.q)}
              </b>{" "}
              vs{" "}
              <b className="font-semibold text-foreground">
                {formatFyQuarter(row.iaq.pair.previous.fy, row.iaq.pair.previous.q)}
              </b>{" "}
              — the change is the latest quarter minus the previous one (read-only). No
              quarter without data is shown.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* "Why is my status like this?" — the exact inputs the status rule used, not
   a generic sentence. The panel is local to the section and lists the same
   visit states the chips show. */
function WhyStatus({ row, onJump }: { row: MasterRow; onJump: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const today = todayLocalIso();
  const v1 = visitFor(row, "surv1", today);
  const v2 = visitFor(row, "surv2", today);
  const recert = recertificationState(row, today);
  const lines: [string, string][] = [
    ["Eligibility", row.facility.eligibility ?? "-"],
    ["State Assessment", row.sa?.status ?? "Not recorded"],
    ["NQAS Assessment", row.nqas?.status ?? "Not recorded"],
    ["Certification result", row.nqas?.certificationStatus ?? "Not recorded"],
    ["Certified on", row.nqas?.certificationDate ? toDisplayDate(row.nqas.certificationDate) : "-"],
    ["1st surveillance", v1?.chip ?? "-"],
    ["2nd surveillance", v2?.chip ?? "-"],
    ["Certificate validity", row.nqas?.validityDate ? toDisplayDate(row.nqas.validityDate) : "-"],
    ["Recertification", recert.label],
  ];
  return (
    <div className="border-t border-border/40 px-3 py-2 text-xs text-muted-foreground">
      <button
        type="button"
        aria-expanded={open}
        className="font-medium text-primary underline-offset-2 hover:underline"
        onClick={() => setOpen((v) => !v)}
      >
        Why is my status like this?{" "}
        <ChevronRight className={cn("inline size-3 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <p className="text-[11px] text-muted-foreground">
            Facility Current Status is calculated from these inputs — never typed:
          </p>
          <dl className="mt-1.5 grid gap-1 sm:grid-cols-2">
            {lines.map(([label, value]) => (
              <div key={label} className="flex items-baseline gap-2 text-[11px]">
                <dt className="min-w-0 flex-1 truncate text-muted-foreground">{label}</dt>
                <dd className="shrink-0 font-medium text-foreground tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] font-semibold text-foreground">
            Reads as: {statusForDisplay(row)}
          </p>
          <button
            type="button"
            className="mt-1 text-[11px] font-medium text-primary hover:underline"
            onClick={() => onJump("surveillance")}
          >
            Open Surveillance &amp; Recertification <ChevronRight className="inline size-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function toDisplayDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mi = Number(m) - 1;
  return months[mi] ? `${d}-${months[mi]}-${y}` : iso;
}

function NeedsAttention({
  items,
  onFix,
  onJump,
}: {
  items: ReturnType<typeof attentionFor>;
  onFix: (field: string) => void;
  onJump: (section: string) => void;
}) {
  const [openSection, setOpenSection] = useState(true);
  return (
    <section
      className="mb-3 rounded-xl border border-amber-300/70 bg-amber-50/70 p-3"
      aria-label="Needs attention"
    >
      <button
        type="button"
        onClick={() => setOpenSection((v) => !v)}
        aria-expanded={openSection}
        className="flex w-full items-center gap-1.5 text-left text-sm font-semibold text-amber-900"
      >
        <AlertTriangle className="size-4" /> Needs attention ({items.length})
        <ChevronRight
          className={cn("ml-auto size-4 transition-transform", openSection && "rotate-90")}
        />
      </button>
      {openSection && (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-start gap-2 text-xs text-amber-950">
              <span className="min-w-0 flex-1">{item.text}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-amber-400 bg-white/70 text-[11px] text-amber-900"
                onClick={() => onFix(item.field)}
              >
                <Wrench className="mr-1 size-3" /> Fix
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] text-amber-900"
                onClick={() => onJump(item.section)}
              >
                Open section
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AuditList({
  profile,
  loading,
}: {
  profile: Record<string, unknown> | null;
  loading: boolean;
}) {
  if (loading) return <SectionSkeleton rows={4} />;
  const audits =
    (profile?.audits as
      | {
          _id: string;
          field?: string;
          oldValue?: unknown;
          newValue?: unknown;
          changedByName?: string;
          changedAt: number;
          source?: string;
        }[]
      | undefined) ?? [];
  if (!audits.length)
    return (
      <p className="px-3 py-4 text-sm text-muted-foreground">No changes recorded yet.</p>
    );
  return (
    <ol className="divide-y divide-border/40">
      {audits.slice(0, 50).map((a) => (
        <li key={a._id} className="flex flex-wrap items-baseline gap-x-2 px-3 py-1.5 text-xs">
          <span className="font-medium text-foreground">{a.field ?? "Record"}</span>
          <span className="text-muted-foreground line-through">
            {a.oldValue == null || a.oldValue === "" ? "-" : String(a.oldValue)}
          </span>
          <span aria-hidden>→</span>
          <span className="text-foreground">
            {a.newValue == null || a.newValue === "" ? "-" : String(a.newValue)}
          </span>
          <span className="ml-auto text-muted-foreground">
            {a.changedByName ?? "System"} · {toDisplayStamp(a.changedAt)}
            {a.source ? ` · ${a.source}` : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

function SectionSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 px-3 py-3" aria-busy="true" aria-label="Loading section">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/* RowEditState → mutation payload, exported so the list and tests share it. */
export function quickViewPayload(row: MasterRow, state: RowEditState) {
  return trackerUpdatePayload(row as unknown as TrackerRow, state);
}
