/**
 * LINE LISTS TAB (Reports & Export → "Line lists").
 *
 * Two screens in one route (`/reports?tab=linelists`, deep-linkable):
 *   • START SCREEN — a gallery of topic cards with LIVE counts, "My reports",
 *     "Recent" and "Shared with me". One click opens the builder with the
 *     template.
 *   • BUILDER — lib/lineListEngine + the shared master grid
 *     (components/linelists/LineListBuilder).
 *
 * Data: `ops.listFacilityRowsFast` — the SAME role/block-scoped query the
 * Master List reads, so "24 of 157" here equals the Master List with the same
 * filters. IA scores come from `ia.listIaQuarters` (one subscription), cycle
 * rows from `cycleReport.getFacilityCycleRows` ONLY when "All cycles" is on.
 *
 * Saved definitions live in Convex (convex/lineLists.ts → masterViews); the
 * export is logged into the audit/export log on every download.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate, useSearchParams } from "react-router";
import {
  AlertTriangle,
  Award,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Copy,
  FileText,
  Flame,
  IndianRupee,
  ListChecks,
  Pin,
  PinOff,
  Share2,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ORG_NAME } from "@/lib/org";
import { todayLocalIso } from "@/lib/today";
import {
  MASTER_COLUMNS,
  resolveLabels,
  withIaPeriodLabels,
  type MasterRow,
} from "@/lib/masterColumns";
import { attachIaExtras, buildIaMasterIndex, iaPairFor, withLegacyIa } from "@/lib/iaMaster";
import {
  describeLineListFilters,
  galleryCounts,
  lineListIssueRows,
} from "@/lib/lineListEngine";
import { runLineListExport, type LineListExportPlan } from "@/lib/lineListExport";
import {
  LINE_LIST_TEMPLATES,
  lineListTemplate,
  newLineListDefinition,
  type LineListDefinition,
  type LineListTemplate,
} from "@/lib/lineListTemplates";
import { LineListBuilder, ShareDialog } from "@/components/linelists/LineListBuilder";

/* --------------------------------------------------------------------------- */
/* Icons                                                                       */
/* --------------------------------------------------------------------------- */

const ICONS: Record<string, typeof Flame> = {
  flame: Flame,
  building: Building2,
  rupee: IndianRupee,
  award: Award,
  clipboard: ClipboardCheck,
  calendar: CalendarClock,
  file: FileText,
  alert: AlertTriangle,
  list: ListChecks,
};

const RECENT_KEY = "nqas.lineList.recent";

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

function rememberRecent(id: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((x) => x !== id)].slice(0, 6)));
  } catch {
    /* private mode — recents are a nicety */
  }
}

/* --------------------------------------------------------------------------- */
/* The tab                                                                     */
/* --------------------------------------------------------------------------- */

export function LineListsTab({ onOpenFacility }: { onOpenFacility: (row: MasterRow) => void }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const cycleParam = params.get("cycle");
  const templateParam = params.get("ll");
  const reportParam = params.get("report");
  const cycleNumber =
    cycleParam && cycleParam !== "all" && Number.isFinite(Number(cycleParam))
      ? Number(cycleParam)
      : null;

  /* ---- Data (shared subscriptions, one each) --------------------------- */
  const listQ = useQuery(
    api.ops.listFacilityRowsFast,
    cycleNumber != null ? { cycle: cycleNumber } : {},
  );
  const settings = useQuery(api.facilities.getAppSettings, {});
  const iaQuarters = useQuery(api.ia.listIaQuarters, { limit: 20000 });
  const cyclesQ = useQuery(
    api.cycleReport.getFacilityCycleRows,
    cycleParam === "all" ? {} : "skip",
  );
  const mineQ = useQuery(api.lineLists.myLineLists, {});
  const sharedQ = useQuery(api.lineLists.sharedLineLists, {});
  const saveMutation = useMutation(api.lineLists.saveLineList);
  const deleteMutation = useMutation(api.lineLists.deleteLineList);
  const logExport = useMutation(api.lineLists.logLineListExport);

  const today = todayLocalIso();

  /* ---- Labels: config + admin renames + real IA quarter names ---------- */
  const overrides = settings?.settings.tableHeaderOverrides as Record<string, string> | undefined;
  const iaIndex = useMemo(() => {
    if (!iaQuarters) return null;
    return withLegacyIa(
      buildIaMasterIndex(
        iaQuarters.map((q) => ({
          facilityId: q.facilityId,
          fy: q.fy,
          quarter: q.quarter,
          nqasIaScore: q.nqasIaScore,
          kayakalpIaScore: q.kayakalpIaScore,
          ecoFriendlyScore: q.ecoFriendlyScore,
          nqasRemark: q.nqasRemark,
          kayakalpRemark: q.kayakalpRemark,
          ecoRemark: q.ecoRemark,
          lockedAt: q.lockedAt,
          updatedAt: q.updatedAt,
        })),
      ),
      ((listQ?.rows ?? []) as unknown as MasterRow[]).map((r) => ({
        id: String(r.facility._id),
        nqasIaQ1: r.facility.nqasIaQ1 ?? null,
        kayakalpIaQ1: r.facility.kayakalpIaQ1 ?? null,
        nqasIaQ2: r.facility.nqasIaQ2 ?? null,
        kayakalpIaQ2: r.facility.kayakalpIaQ2 ?? null,
      })),
    );
  }, [iaQuarters, listQ]);
  const iaPair = useMemo(() => (iaIndex ? iaPairFor(null, iaIndex, today) : null), [iaIndex, today]);
  const labels = useMemo(
    () => withIaPeriodLabels(resolveLabels(MASTER_COLUMNS, overrides), iaPair),
    [overrides, iaPair],
  );

  /* ---- Base rows: the Master List's own query, IA attached ------------ */
  const baseRows = useMemo(() => {
    const live = (listQ?.rows ?? []) as unknown as MasterRow[];
    if (!iaIndex || !iaPair) return live;
    return live.map((r) => ({
      ...r,
      iaq: attachIaExtras(String(r.facility._id), iaIndex, iaPair),
    }));
  }, [listQ, iaIndex, iaPair]);

  /** All cycles: one row per facility-cycle, cycle pill via `certCycle`. */
  const allCycleRows = useMemo(() => {
    const cycleRows = cyclesQ?.rows ?? [];
    if (!cycleRows.length) return [] as MasterRow[];
    const byId = new Map(baseRows.map((r) => [String(r.facility._id), r]));
    return cycleRows.flatMap((c) => {
      const b = byId.get(c.facilityId);
      if (!b) return [];
      return [
        {
          ...b,
          cycleNumber: c.cycleNumber,
          cycleType: c.cycleType,
          facility: {
            ...b.facility,
            currentStatus: c.currentStatus ?? b.facility.currentStatus,
            eligibility: c.eligibility ?? b.facility.eligibility,
          },
          sa: {
            ...b.sa,
            status: c.saStatus,
            actualStartDate: c.saStartDate,
            actualEndDate: c.saEndDate,
            scorePercent: c.saScore,
            generalDocStatus: c.generalDocStatus,
          },
          nqas: {
            ...b.nqas,
            status: c.naStatus,
            scheduledStartDate: c.naScheduledDate,
            actualEndDate: c.naEndDate,
            mode: c.naMode,
            certificationStatus: c.certStatus,
            certificationDate: c.certDate,
            goiLetterDate: c.goiLetterDate,
            scorePercent: c.certScore,
            manualScore: c.manualScore,
            validityDate: c.validityDate,
            surveillanceDue1: c.surveillanceDue1,
            surveillanceDone1: c.surveillanceDone1,
            surveillanceDue2: c.surveillanceDue2,
            surveillanceDone2: c.surveillanceDone2,
            recertStatus: c.recertStatus,
            recertYear: c.recertYear,
          },
          building: { ...b.building, buildingStatus: c.buildingStatus },
          noc: { ...b.noc, status: c.nocStatus },
        } satisfies MasterRow,
      ];
    });
  }, [cyclesQ, baseRows]);

  const cycleNumbers = useMemo(
    () => [...new Set((cyclesQ?.rows ?? []).map((r) => r.cycleNumber))].sort((a, b) => a - b),
    [cyclesQ],
  );

  /* ---- Open state ------------------------------------------------------ */
  const [current, setCurrent] = useState<LineListDefinition | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameTarget, setRenameTarget] = useState<LineListDefinition | null>(null);
  const appliedKey = useRef("");

  const gallery = !current;
  const mine = useMemo(
    () =>
      (mineQ ?? [])
        .map((r) => r.definition as unknown as LineListDefinition)
        .filter((d) => d && typeof d.id === "string"),
    [mineQ],
  );
  const shared = useMemo(
    () =>
      (sharedQ ?? [])
        .map((r) => r.definition as unknown as LineListDefinition)
        .filter((d) => d && typeof d.id === "string"),
    [sharedQ],
  );

  /* Deep link → screen (template or a saved report). Guarded by a key so the
     URL echo never resets what the user is editing. */
  useEffect(() => {
    const key = `${templateParam ?? ""}|${reportParam ?? ""}|${cycleParam ?? ""}`;
    if (appliedKey.current === key) return;
    if (reportParam) {
      const found = [...mine, ...shared].find((d) => d.id === reportParam);
      if (!found) return; // still loading
      appliedKey.current = key;
      setCurrent({ ...found });
      setSavedAt(found.updatedAt);
      return;
    }
    if (templateParam) {
      appliedKey.current = key;
      setCurrent(
        newLineListDefinition(templateParam, {
          cycle:
            cycleParam === "all"
              ? "all"
              : cycleParam && Number.isFinite(Number(cycleParam))
                ? Number(cycleParam)
                : "current",
        }),
      );
      setSavedAt(null);
      return;
    }
    // Back from a builder link → the start screen (the guard above stops the
    // URL echo from closing a builder the user just opened).
    appliedKey.current = key;
    setCurrent(null);
  }, [templateParam, reportParam, cycleParam, mine, shared]);

  const openTemplate = useCallback(
    (id: string) => {
      rememberRecent(id);
      const def = newLineListDefinition(id);
      setCurrent(def);
      setSavedAt(null);
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "linelists");
        next.set("ll", id);
        next.delete("report");
        return next;
      });
    },
    [setParams],
  );

  const openSaved = useCallback(
    (def: LineListDefinition) => {
      setCurrent({ ...def });
      setSavedAt(def.updatedAt);
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "linelists");
        next.set("report", def.id);
        next.delete("ll");
        return next;
      });
    },
    [setParams],
  );

  const backToGallery = () => {
    setCurrent(null);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "linelists");
      next.delete("ll");
      next.delete("report");
      return next;
    });
  };

  /* ---- Save / share / duplicate / delete ------------------------------- */
  const persist = async (def: LineListDefinition, quiet = false) => {
    setSaving(true);
    try {
      const res = await saveMutation({ definition: def });
      setSavedAt(res.savedAt);
      if (!quiet) toast.success("Saved to My reports");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this report");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!current) return;
    const next = { ...current, updatedAt: Date.now() };
    setCurrent(next);
    void persist(next);
  };

  const duplicate = async (def: LineListDefinition) => {
    const copy: LineListDefinition = {
      ...def,
      id: `ll-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${def.name} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sharedWithRoles: [],
      sharedWithUserIds: [],
      pinned: false,
      defaultForRole: null,
    };
    await persist(copy, true);
    toast.success("Duplicated");
  };

  const remove = async (def: LineListDefinition) => {
    try {
      await deleteMutation({ id: def.id });
      if (current?.id === def.id) backToGallery();
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  };

  const togglePin = async (def: LineListDefinition) => {
    await persist({ ...def, pinned: !def.pinned, updatedAt: Date.now() }, true);
  };

  const rename = async () => {
    const target = renameTarget ?? current;
    if (!target) return;
    const next = {
      ...target,
      name: renameValue.trim() || target.name,
      updatedAt: Date.now(),
    };
    if (current?.id === next.id) setCurrent(next);
    setRenameOpen(false);
    setRenameTarget(null);
    await persist(next, true);
  };

  /* ---- Export ---------------------------------------------------------- */
  const template = lineListTemplate(current?.templateId);
  const sourceRows = useMemo(() => {
    const rows = current?.cycle === "all" ? allCycleRows : baseRows;
    if (template.rowsPer === "issue") {
      return lineListIssueRows(rows, today).map((x) => x.row);
    }
    return rows;
  }, [current?.cycle, allCycleRows, baseRows, template.rowsPer, today]);

  const exportList = async (plan: LineListExportPlan, rows: MasterRow[], name: string) => {
    if (!current) return;
    if (rows.length === 0) {
      toast.error("Nothing to export — no rows match the current filters");
      return;
    }
    const columns = current.columns
      .map((k) => MASTER_COLUMNS.find((c) => c.key === k))
      .filter((c): c is (typeof MASTER_COLUMNS)[number] => !!c);
    const saveBlob = (data: ArrayBuffer, fileName: string) => {
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    };
    const saveBlobRaw = (blob: Blob, fileName: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    };
    const district =
      (settings?.settings as Record<string, unknown> | undefined)?.districtName as string | undefined;
    try {
      const result = await runLineListExport({
        plan,
        rows,
        columns,
        labels,
        topic: template.name,
        filtersText: describeLineListFilters(current, template, labels),
        generatedBy: `${ORG_NAME} · Line lists · ${name}`,
        district: district || "District",
        singleBlock: current.blocks.length === 1 ? current.blocks[0] : null,
        totalRows: sourceRows.length,
        saveBlob,
        saveBlobRaw,
      });
      await logExport({
        topic: template.name,
        format: plan.format,
        filters: describeLineListFilters(current, template, labels),
        rows: result.rows,
        fileName: result.fileName,
      });
      toast.success(`Exported ${result.rows} row${result.rows === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  /* ---- Render ---------------------------------------------------------- */
  if (listQ === undefined) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="glass h-20 animate-pulse rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass h-28 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (current) {
    return (
      <div>
        <CycleScope
          onOpenMaster={() => {
            const query = new URLSearchParams();
            if (current.blocks.length) query.set("block", current.blocks.join(","));
            if (current.types.length) query.set("type", current.types.join(","));
            navigate(`/facilities${query.size ? `?${query.toString()}` : ""}`);
          }}
          value={current.cycle}
          onChange={(cycle) => {
            // "All cycles" rows are one per facility-cycle — the cycle pill is
            // part of the answer, so certCycle is added when it is missing.
            const columns =
              cycle === "all" && !current.columns.includes("certCycle")
                ? [
                    "facility",
                    "type",
                    "certCycle",
                    ...current.columns.filter((k) => k !== "facility" && k !== "type"),
                  ]
                : current.columns;
            setCurrent({ ...current, cycle, columns });
            setParams((prev) => {
              const next = new URLSearchParams(prev);
              if (cycle === "all") next.set("cycle", "all");
              else next.delete("cycle");
              return next;
            });
          }}
          cycles={cycleNumbers}
        />
        <LineListBuilder
          definition={current}
          template={template}
          rows={sourceRows}
          labels={labels}
          today={today}
          district={
            ((settings?.settings as Record<string, unknown> | undefined)?.districtName as string) ||
            "District"
          }
          onChange={setCurrent}
          onBack={backToGallery}
          onSave={handleSave}
          onShare={() => setShareOpen(true)}
          onExport={exportList}
          onOpenRow={onOpenFacility}
          saving={saving}
          savedAt={savedAt}
          sharedCount={current.sharedWithRoles.length + current.sharedWithUserIds.length}
        />
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          definition={current}
          onChange={(next) => {
            setCurrent(next);
            void persist(next, true);
          }}
        />
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent className="glass-strong sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Rename report</DialogTitle>
              <DialogDescription>Only the saved name changes.</DialogDescription>
            </DialogHeader>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              aria-label="Report name"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button onClick={rename}>Rename</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="glass rounded-xl p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="size-4 text-primary" /> Line lists
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Topic-wise facility lists built from the same tracker data, with a summary and an
          Excel / PDF / CSV download. Pick a topic to start — every one of them opens with its
          columns and quick filters already set.
        </p>
      </header>

      <section aria-labelledby="ll-topics">
        <h3 id="ll-topics" className="mb-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          Start from a topic
        </h3>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {LINE_LIST_TEMPLATES.map((t) => (
            <TopicCard
              key={t.id}
              template={t}
              counts={galleryCounts(baseRows, t, today)}
              onOpen={() => openTemplate(t.id)}
            />
          ))}
        </div>
      </section>

      {mine.length > 0 && (
        <section aria-labelledby="ll-mine">
          <h3 id="ll-mine" className="mb-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            My reports
          </h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {[...mine].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt).map((def) => (
              <li key={def.id} className="glass flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2">
                <button
                  type="button"
                  onClick={() => openSaved(def)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-medium">
                    {def.pinned && <Pin className="mr-1 inline size-3 text-primary" />}
                    {def.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {lineListTemplate(def.templateId).name} · {def.columns.length} columns ·{" "}
                    {new Date(def.updatedAt).toLocaleDateString("en-GB")}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Rename ${def.name}`}
                  onClick={() => {
                    setRenameValue(def.name);
                    setRenameTarget(def);
                    setRenameOpen(true);
                  }}
                >
                  <FileText className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" aria-label={`Duplicate ${def.name}`} onClick={() => void duplicate(def)}>
                  <Copy className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" aria-label={def.pinned ? "Unpin" : "Pin to gallery"} onClick={() => void togglePin(def)}>
                  {def.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="size-8 text-rose-600" aria-label={`Delete ${def.name}`} onClick={() => void remove(def)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {readRecent().length > 0 && (
        <section aria-labelledby="ll-recent">
          <h3 id="ll-recent" className="mb-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            Recent
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {readRecent().map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => openTemplate(id)}
                className="rounded-full border border-border/70 px-3 py-1 text-xs hover:bg-muted"
              >
                {lineListTemplate(id).name}
              </button>
            ))}
          </div>
        </section>
      )}

      {shared.length > 0 && (
        <section aria-labelledby="ll-shared">
          <h3 id="ll-shared" className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            <Users className="size-3.5" /> Shared with me
          </h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {shared.map((def) => (
              <li key={def.id} className="glass flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2">
                <button type="button" onClick={() => openSaved(def)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{def.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    Shared by {def.ownerName ?? "another user"} · {lineListTemplate(def.templateId).name}
                  </p>
                </button>
                <Share2 className="size-3.5 text-muted-foreground" aria-hidden />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Topic card                                                                  */
/* --------------------------------------------------------------------------- */

function TopicCard({
  template,
  counts,
  onOpen,
}: {
  template: LineListTemplate;
  counts: { label: string; count: number }[];
  onOpen: () => void;
}) {
  const Icon = ICONS[template.icon] ?? ListChecks;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="glass group flex h-full flex-col rounded-xl border border-border/60 p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="mb-1.5 flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <span className="truncate text-sm font-semibold">{template.name}</span>
      </span>
      <span className="flex-1 text-[11px] leading-snug text-muted-foreground">{template.tagline}</span>
      <span className="mt-2 flex flex-wrap gap-1">
        {counts.map((c) => (
          <span
            key={c.label}
            className={cn(
              "rounded-full border px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
              c.count > 0 ? "border-amber-300 bg-amber-50 text-amber-900" : "border-border/60 text-muted-foreground",
            )}
          >
            {c.count} {c.label}
          </span>
        ))}
        <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {template.columns.length} columns
        </span>
      </span>
    </button>
  );
}

/* --------------------------------------------------------------------------- */
/* Cycle scope (line lists only: "All cycles" is allowed here)                  */
/* --------------------------------------------------------------------------- */

function CycleScope({
  value,
  onChange,
  cycles,
  onOpenMaster,
}: {
  value: LineListDefinition["cycle"];
  onChange: (value: LineListDefinition["cycle"]) => void;
  cycles: number[];
  onOpenMaster: () => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 text-xs">
      <label className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Certification cycle</span>
        <select
          aria-label="Certification cycle"
          className="h-7 rounded-md border border-border/70 bg-background px-2 text-xs"
          value={String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "all" ? "all" : raw === "current" ? "current" : Number(raw));
          }}
        >
          <option value="current">Current</option>
          <option value="all">All cycles (one row per facility-cycle)</option>
          {cycles.map((n) => (
            <option key={n} value={n}>
              #{n}
            </option>
          ))}
        </select>
      </label>
      <span className="text-muted-foreground">
        Summaries never offer “All cycles”; the list shows one row per facility-cycle with a cycle
        pill.
      </span>
      <Button variant="ghost" size="sm" className="ml-auto h-7 text-[11px]" onClick={onOpenMaster}>
        Open in Master List ↗
      </Button>
    </div>
  );
}
