/**
 * CREATE / EDIT PAGE — three steps, one choice per screen.
 *
 * Step 1 Type      line list topic grid OR a Report Builder saved definition
 * Step 2 Content   columns / filters / sort / group, with a first-rows preview
 * Step 3 Placement name, unique slug, icon, group, position, roles, download
 *
 * The old wizard disabled Next on step 1 unconditionally (`disabled={step===1}`)
 * and offered Saved report as a permanently disabled radio; both are fixed here.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  BadgeCheck,
  Building2,
  Check,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Flame,
  HandCoins,
  LayoutDashboard,
  ListTodo,
  Loader2,
  Search,
  Sparkles,
  Table2,
  Upload,
  X,
} from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LINE_LIST_TEMPLATES, lineListTemplate } from "@/lib/lineListTemplates";
import { MASTER_COLUMNS, cellText, type MasterRow } from "@/lib/masterColumns";
import { cn } from "@/lib/utils";

export type WizardRole = { key: string; label: string; description: string };
export type WizardPage = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  group: string;
  order: number;
  roles: string[];
  everyone: boolean;
  visible: boolean;
  type: string;
  sourceReportId: string | null;
  definition: Record<string, unknown>;
  allowDownload: boolean;
  deletedAt: number | null;
  needsMigration?: boolean;
};

export type PageSaveForm = {
  name: string;
  slug: string;
  icon: string;
  group: string;
  order: number;
  roles: string[];
  everyone: boolean;
  visible: boolean;
  type: "lineList" | "report";
  sourceReportId?: string;
  allowDownload: boolean;
  definition: Record<string, unknown>;
};

const TOPIC_ICONS: Record<string, typeof Flame> = {
  firenoc: Flame,
  building: Building2,
  gapfund: HandCoins,
  nqas: BadgeCheck,
  state: ClipboardCheck,
  ia: ClipboardCheck,
  surveillance: LayoutDashboard,
  documents: FileSpreadsheet,
  saqsham: Sparkles,
  attention: ListTodo,
  custom: Table2,
  report: FileText,
};

const ICONS = [
  ["FileSpreadsheet", FileSpreadsheet],
  ["Table2", Table2],
  ["FileText", FileText],
  ["Flame", Flame],
  ["Building2", Building2],
  ["HandCoins", HandCoins],
  ["BadgeCheck", BadgeCheck],
  ["ClipboardCheck", ClipboardCheck],
  ["ListTodo", ListTodo],
  ["LayoutDashboard", LayoutDashboard],
  ["Upload", Upload],
  ["Sparkles", Sparkles],
] as const;

const COMMON_COLUMNS = [
  "facility", "type", "block", "phc", "pipelineStatus", "nextAction",
  "certScore", "validityDate", "saScore", "nocStatus", "nocValidity", "gapAmount",
];

const labelOf = (key: string) =>
  MASTER_COLUMNS.find((c) => c.key === key)?.label ?? key;

const slugify = (raw: string) =>
  raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export function PageWizard({
  row,
  roles,
  pages,
  groups,
  busy,
  onClose,
  onSave,
}: {
  row: WizardPage | null;
  roles: WizardRole[];
  pages: WizardPage[];
  groups: { id: string; label: string }[];
  busy: boolean;
  onClose: () => void;
  onSave: (form: PageSaveForm) => Promise<void>;
}) {
  const definitionsQ = useQuery(api.reportDefinitions.list, {});
  const rowsQ = useQuery(api.ops.listFacilityRowsFast, { cycle: "current" });
  const saveDefinition = useMutation(api.reportDefinitions.save);
  const [saving, setSaving] = useState(false);
  const localViews = useMemo(() => {
    try {
      const raw = localStorage.getItem("nqas.customReport.views.v1");
      const parsed = raw ? (JSON.parse(raw) as { id: string; name: string; view: unknown }[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<"lineList" | "report" | null>(
    row ? (row.type === "report" ? "report" : "lineList") : null,
  );
  const [templateId, setTemplateId] = useState<string>(
    (row?.definition.templateId as string | undefined) ?? "firenoc",
  );
  const [reportId, setReportId] = useState<string>(row?.sourceReportId ?? "");
  const [columns, setColumns] = useState<string[]>(() => {
    const existing = row?.definition.columns;
    return Array.isArray(existing) && existing.length
      ? (existing as string[])
      : lineListTemplate("firenoc").columns;
  });
  const [sortKey, setSortKey] = useState<string>(
    (row?.definition.sort as { id?: string }[] | undefined)?.[0]?.id ?? "facility",
  );
  const [desc, setDesc] = useState<boolean>(
    (row?.definition.sort as { desc?: boolean }[] | undefined)?.[0]?.desc ?? false,
  );
  const [groupBy, setGroupBy] = useState<string>(
    (row?.definition.groupBy as string | null | undefined) ?? "",
  );
  const [summary, setSummary] = useState<boolean>(row?.definition.summaryOn === true);
  const [quick, setQuick] = useState<string[]>(
    Array.isArray(row?.definition.quick) ? (row.definition.quick as string[]) : [],
  );
  const [cycle, setCycle] = useState<string>((row?.definition.cycle as string) ?? "current");
  const [name, setName] = useState(row?.name ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!row);
  const [icon, setIcon] = useState(row?.icon ?? "FileSpreadsheet");
  const [group, setGroup] = useState(
    groups.some((item) => item.id === row?.group)
      ? row!.group
      : groups.find((item) => item.id === "tools")?.id ?? groups[0]?.id ?? "main",
  );
  const [order, setOrder] = useState(row?.order ?? 100);
  const [everyone, setEveryone] = useState(row?.everyone ?? false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(row?.roles?.length ? row.roles : ["admin"]);
  const [download, setDownload] = useState(row?.allowDownload ?? true);
  const [draggedCol, setDraggedCol] = useState<string | null>(null);

  const templates = LINE_LIST_TEMPLATES;
  const reportDefs = [
    ...((definitionsQ ?? []) as { id: string; name: string; view: unknown }[]),
    ...localViews
      .filter(
        (v) =>
          !((definitionsQ ?? []) as { id: string; name: string }[]).some(
            (d) => d.name === v.name,
          ),
      )
      .map((v) => ({ id: `local:${v.id}`, name: v.name, view: v.view })),
  ];
  const selectedReport = reportDefs.find((d) => d.id === reportId) ?? null;

  const effectiveSlug = slugTouched ? slug : slugify(name || "");
  const slugTaken = pages.some((p) => p.id !== row?.id && p.slug === effectiveSlug);

  /* Keep the slug in step with the name until the admin edits it. */
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  const available = useMemo(
    () =>
      [...new Set([...COMMON_COLUMNS, ...(lineListTemplate(templateId).columns ?? [])])].filter(
        (k) => MASTER_COLUMNS.some((c) => c.key === k),
      ),
    [templateId],
  );

  const previewRows = ((rowsQ?.rows ?? []) as unknown as MasterRow[]).slice(0, 5);
  const previewColumns = columns.filter((c) => MASTER_COLUMNS.some((x) => x.key === c)).slice(0, 6);
  const reportRowFields =
    ((selectedReport?.view as { config?: { rows?: string[]; values?: { fieldId: string }[] } } | null)
      ?.config?.rows ?? []).slice(0, 4);
  const reportValueField =
    (selectedReport?.view as { config?: { values?: { fieldId: string }[] } } | null)?.config
      ?.values?.[0]?.fieldId ?? null;

  const canNext = step === 1 ? kind === "lineList" || (kind === "report" && !!reportId) : true;
  const canCreate =
    !!name.trim() &&
    !!effectiveSlug &&
    !slugTaken &&
    (kind === "report" ? !!reportId : columns.length > 0) &&
    (everyone || selectedRoles.length > 0);

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    setColumns(lineListTemplate(id).columns);
  };

  const toggleColumn = (key: string) =>
    setColumns((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]));

  const moveColumn = (from: string, to: string) => {
    if (from === to) return;
    setColumns((c) => {
      const next = [...c];
      const at = next.indexOf(from);
      if (at < 0) return c;
      next.splice(at, 1);
      const target = next.indexOf(to);
      next.splice(target < 0 ? next.length : target, 0, from);
      return next;
    });
  };

  const finish = async () => {
    if (!canCreate) return;
    setSaving(true);
    const baseDefinition = {
      templateId: kind === "report" ? "report" : templateId,
      columns,
      sort: [{ id: sortKey, desc }],
      groupBy: groupBy || null,
      summaryOn: summary,
      summaryPosition: "top",
      cycle,
      quick,
      and: [],
      or: [],
      blocks: [],
      phcs: [],
      types: [],
      statuses: [],
    };
    let sourceId = kind === "report" ? reportId : "";
    let snapshotView = selectedReport?.view ?? null;
    if (kind === "report" && sourceId.startsWith("local:") && snapshotView) {
      try {
        const saved = await saveDefinition({
          name: selectedReport?.name || name.trim() || "Saved report",
          view: snapshotView,
        });
        sourceId = saved.id;
      } catch {
        setSaving(false);
        return;
      }
    }
    await onSave({
      name: name.trim(),
      slug: effectiveSlug,
      icon,
      group,
      order: Number.isFinite(order) ? order : 100,
      roles: everyone ? [] : selectedRoles,
      everyone,
      visible: row?.visible ?? true,
      type: kind === "report" ? "report" : "lineList",
      sourceReportId: kind === "report" ? sourceId : "",
      allowDownload: download,
      definition:
        kind === "report"
          ? { ...baseDefinition, reportId: sourceId, reportSnapshot: snapshotView }
          : baseDefinition,
    });
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"
        onKeyDown={(e) => {
          if (e.key !== "Enter" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
          if ((e.target as HTMLElement)?.tagName === "BUTTON") return;
          if (step < 3 && canNext) {
            e.preventDefault();
            setStep((step + 1) as 1 | 2 | 3);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{row ? "Edit page" : "Create page"}</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Choose what the page shows."
              : step === 2
                ? "Choose the content and check the preview."
                : "Name it, place it and say who can see it."}
          </DialogDescription>
        </DialogHeader>

        {/* Step dots */}
        <div className="flex items-center gap-2" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                  step === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : step > n
                      ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-700"
                      : "border-border text-muted-foreground",
                )}
              >
                {step > n ? <Check className="size-3.5" /> : n}
              </span>
              {n < 3 && <span className="h-px w-8 bg-border" />}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <section
              className={cn(
                "rounded-xl border p-3",
                kind === "lineList" ? "border-primary/60 bg-primary/5" : "border-border/60",
              )}
            >
              <button
                type="button"
                onClick={() => setKind("lineList")}
                className="flex w-full items-start gap-2 text-left"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Table2 className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Line list</span>
                  <span className="block text-xs text-muted-foreground">
                    A topic list with the shared grid, summary and Excel/PDF.
                  </span>
                </span>
              </button>
              {kind === "lineList" && (
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {templates.map((t) => {
                    const Icon = TOPIC_ICONS[t.id] ?? FileSpreadsheet;
                    const active = templateId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => pickTemplate(t.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium",
                          active
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border/60 hover:bg-muted/60",
                        )}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => pickTemplate("custom")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium",
                      templateId === "custom"
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border/60 hover:bg-muted/60",
                    )}
                  >
                    <Table2 className="size-3.5" /> Custom
                  </button>
                </div>
              )}
            </section>

            <section
              className={cn(
                "rounded-xl border p-3",
                kind === "report" ? "border-primary/60 bg-primary/5" : "border-border/60",
              )}
            >
              <button
                type="button"
                onClick={() => setKind("report")}
                className="flex w-full items-start gap-2 text-left"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Saved report</span>
                  <span className="block text-xs text-muted-foreground">
                    A Report Builder definition, rendered with the pivot grid.
                  </span>
                </span>
              </button>
              {kind === "report" && (
                <div className="mt-3 space-y-2">
                  {reportDefs.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/60 p-2 text-[11px] text-muted-foreground">
                      No report definitions yet. Open Custom Report Builder, save a
                      view there, then return here.
                    </p>
                  ) : (
                    <Select value={reportId} onValueChange={setReportId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Choose a saved report" />
                      </SelectTrigger>
                      <SelectContent>
                        {reportDefs.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedReport && (
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-2 text-[11px]">
                      <p className="font-semibold">{selectedReport.name}</p>
                      <p className="text-muted-foreground">
                        {describeView(selectedReport.view)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {kind === "lineList" ? (
              <>
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Columns · drag to reorder
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {columns.map((key) => (
                      <span
                        key={key}
                        draggable
                        onDragStart={() => setDraggedCol(key)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggedCol) moveColumn(draggedCol, key);
                          setDraggedCol(null);
                        }}
                        className="inline-flex cursor-grab items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary active:cursor-grabbing"
                      >
                        {labelOf(key)}
                        <button
                          type="button"
                          aria-label={`Remove ${labelOf(key)}`}
                          onClick={() => toggleColumn(key)}
                          className="rounded-full p-0.5 hover:bg-primary/20"
                        >
                          <X className="size-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 grid max-h-36 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-border/60 p-2 sm:grid-cols-3">
                    {available.map((key) => (
                      <label key={key} className="flex items-center gap-1.5 text-[11px]">
                        <input
                          type="checkbox"
                          checked={columns.includes(key)}
                          onChange={() => toggleColumn(key)}
                        />
                        {labelOf(key)}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="text-[11px] font-medium">
                    Sort by
                    <Select value={sortKey} onValueChange={setSortKey}>
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((k) => (
                          <SelectItem key={k} value={k}>
                            {labelOf(k)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="flex items-center gap-2 pt-5 text-[11px] font-medium">
                    <input type="checkbox" checked={desc} onChange={(e) => setDesc(e.target.checked)} />
                    Descending
                  </label>
                  <label className="text-[11px] font-medium">
                    Group by
                    <Select value={groupBy || "none"} onValueChange={(v) => setGroupBy(v === "none" ? "" : v)}>
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No grouping</SelectItem>
                        {columns.map((k) => (
                          <SelectItem key={k} value={k}>
                            {labelOf(k)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </div>
                <label className="flex items-center gap-2 text-[11px] font-medium">
                  <input type="checkbox" checked={summary} onChange={(e) => setSummary(e.target.checked)} />
                  Show a summary strip
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-[11px] font-medium">
                    Default filter
                    <select
                      value={quick[0] ?? ""}
                      onChange={(e) => setQuick(e.target.value ? [e.target.value] : [])}
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">No default filter</option>
                      {lineListTemplate(templateId).quickFilters.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] font-medium">
                    Cycle
                    <select
                      value={cycle}
                      onChange={(e) => setCycle(e.target.value)}
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="current">Current cycle</option>
                      <option value="all">All cycles</option>
                    </select>
                  </label>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
                <p className="font-semibold">{selectedReport?.name ?? "No report chosen"}</p>
                <p className="mt-1 text-muted-foreground">
                  {selectedReport ? describeView(selectedReport.view) : "Go back and pick a report."}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-border/60">
              <div className="flex items-center gap-2 border-b border-border/60 px-2 py-1.5">
                <Search className="size-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold">Preview · first 5 rows</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/40 text-left text-muted-foreground">
                    <tr>
                      {(kind === "report"
                        ? [...reportRowFields.map(labelOf), ...(reportValueField ? [labelOf(reportValueField)] : [])]
                        : previewColumns.map(labelOf)
                      ).map((label) => (
                        <th key={label} className="px-2 py-1 font-semibold whitespace-nowrap">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kind === "report" && selectedReport && reportRowFields.length > 0 ? (
                      previewRows.map((r, i) => (
                        <tr key={i} className="border-t border-border/40">
                          {reportRowFields.map((key) => (
                            <td key={key} className="max-w-40 truncate px-2 py-1">
                              {cellText(r, key) || "(blank)"}
                            </td>
                          ))}
                          {reportValueField && (
                            <td className="px-2 py-1 font-medium">
                              {cellText(r, reportValueField) || "—"}
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      previewRows.map((r, i) => (
                        <tr key={i} className="border-t border-border/40">
                          {previewColumns.map((key) => (
                            <td key={key} className="max-w-40 truncate px-2 py-1">
                              {cellText(r, key) || "—"}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-medium">
                Name
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 h-9"
                  placeholder="Fire NOC watchlist"
                  autoFocus
                />
              </label>
              <label className="text-[11px] font-medium">
                URL slug
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  className={cn("mt-1 h-9", slugTaken && "border-destructive")}
                  placeholder="fire-noc-watchlist"
                />
                <span className={cn("mt-1 block text-[10px]", slugTaken ? "text-destructive" : "text-muted-foreground")}>
                  {slugTaken ? "This slug is already used." : `/p/${effectiveSlug || "…"} · unique`}
                </span>
              </label>
              <label className="text-[11px] font-medium">
                Sidebar group
                <Select value={group} onValueChange={setGroup}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="text-[11px] font-medium">
                Position in group
                <Input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  className="mt-1 h-9"
                />
              </label>
            </div>

            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Icon
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {ICONS.map(([key, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={key}
                    onClick={() => setIcon(key)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg border",
                      icon === key ? "border-primary bg-primary/10 text-primary" : "border-border/60",
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Who can see
                </p>
                <label className="flex items-center gap-2 text-[11px] font-medium">
                  <input
                    type="checkbox"
                    checked={everyone}
                    onChange={(e) => setEveryone(e.target.checked)}
                  />
                  Everyone
                </label>
              </div>
              <div className={cn("mt-1 flex flex-wrap gap-2", everyone && "opacity-50")}>
                {roles.map((r) => (
                  <label key={r.key} className="flex items-center gap-1.5 rounded-lg border border-border/60 px-2 py-1 text-[11px]">
                    <input
                      type="checkbox"
                      disabled={everyone}
                      checked={selectedRoles.includes(r.key)}
                      onChange={() =>
                        setSelectedRoles((cur) =>
                          cur.includes(r.key) ? cur.filter((x) => x !== r.key) : [...cur, r.key],
                        )
                      }
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-[11px] font-medium">
              <input
                type="checkbox"
                checked={download}
                onChange={(e) => setDownload(e.target.checked)}
              />
              Viewers may download (Excel / PDF)
            </label>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Preview
              </p>
              <p className="mt-1 text-sm font-semibold">
                {name || "Untitled page"}{" "}
                <span className="text-[11px] font-normal text-muted-foreground">/p/{effectiveSlug || "…"}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {groups.find((item) => item.id === group)?.label ?? group} ·{" "}
                {kind === "report" ? "Saved report" : `${templateId} line list`} ·{" "}
                {cycle === "all" ? "all cycles" : "current cycle"} ·{" "}
                {everyone ? "Everyone" : `${selectedRoles.length} role${selectedRoles.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((step - 1) as 1 | 2)}>
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button disabled={!canNext} onClick={() => setStep((step + 1) as 2 | 3)}>
              Next
            </Button>
          ) : (
            <Button disabled={busy || saving || !canCreate} onClick={() => void finish()}>
              {busy || saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              {row ? "Save page" : "Create"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function describeView(view: unknown): string {
  const v = view as
    | {
        layout?: string;
        config?: {
          rows?: string[];
          values?: { fieldId: string; agg: string }[];
          filters?: Record<string, string[]>;
        };
      }
    | null
    | undefined;
  if (!v?.config) return "A saved report definition.";
  const rows = (v.config.rows ?? []).map(labelOf).join(" × ") || "No row fields";
  const values = (v.config.values ?? []).map((x) => `${x.agg} ${labelOf(x.fieldId)}`).join(", ");
  const filters = Object.keys(v.config.filters ?? {}).length;
  return `${rows} · ${values || "no values"} · ${filters} filter${filters === 1 ? "" : "s"} · ${v.layout ?? "compact"}`;
}
