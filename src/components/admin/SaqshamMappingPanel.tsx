/** Bulk Import → Status mapping.
 *
 * The server owns permissions and validates every saved value. This panel is
 * the visible, editable copy of that same map. It autosaves each complete
 * change (audited by the server) and keeps one Undo step.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  Download,
  GripVertical,
  ListChecks,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  DEFAULT_REPORT_GROUPS,
  REPORT_STATUS_VALUES,
  SAQSHAM_GROUP_COLORS,
  SAQSHAM_STATUS_MAP,
  isResultDeclared,
  normalizeStatusKey,
  statusMapIssues,
  type SaqshamReportGroup,
} from "@/lib/saqshamImport";

type MapRow = {
  portal: string;
  report: string;
  aliases: string[];
  portalUsage: number;
  reportUsage: number;
};

type GroupRow = SaqshamReportGroup & { usage: number };

type UndoStep =
  | { kind: "config"; rows: MapRow[]; groups: GroupRow[] }
  | { kind: "rename"; from: string; to: string; color: string };

const BLANK = "__blank__";
const ALL = "__all__";
const NO_GROUP = "__no_group__";

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function parseCsv(text: string): { portal: string; report: string }[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let value = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          value += '"';
          i += 1;
        } else quoted = !quoted;
      } else if (char === "," && !quoted) {
        out.push(value.trim());
        value = "";
      } else {
        value += char;
      }
    }
    out.push(value.trim());
    return out;
  };
  const first = parseLine(lines[0]);
  const start =
    first[0]?.toLowerCase().includes("portal") || first[1]?.toLowerCase().includes("report") ? 1 : 0;
  return lines.slice(start).map((line) => {
    const [portal, report = ""] = parseLine(line);
    return { portal, report };
  });
}

function downloadCsv(rows: readonly MapRow[], groups: readonly GroupRow[]) {
  const body = [
    "Portal status,Documents Status (Report),Group colour",
    ...rows.map((row) => {
      const group = groups.find((g) => g.name === row.report);
      return [csvEscape(row.portal), csvEscape(row.report), csvEscape(group?.color ?? "")].join(",");
    }),
  ].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "saqsham-status-mapping.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function groupIssues(groups: readonly GroupRow[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    const name = group.name.trim();
    if (!name) out.push("Every report group needs a name.");
    const key = name.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) out.push(`“${name}” is used by more than one group.`);
    seen.add(key);
  }
  if (!groups.some((g) => g.name.trim().toLowerCase() === "result declared")) {
    out.push("Result Declared is a system group and cannot be deleted.");
  }
  return out;
}

export function SaqshamMappingPanel({
  initialSearch = "",
}: {
  /** A "Map this status" action passes the portal text here. */
  initialSearch?: string;
}) {
  const data = useQuery(api.imports.getSaqshamStatusMap, {});
  const { user } = useAuth();
  const isAdmin = user?.appRole === "admin";
  const saveConfig = useMutation(api.imports.setSaqshamMappingConfig);
  const renameGroup = useMutation(api.imports.renameSaqshamReportGroup);

  const [draftRows, setDraftRows] = useState<MapRow[] | null>(null);
  const [draftGroups, setDraftGroups] = useState<GroupRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [undoStep, setUndoStep] = useState<UndoStep | null>(null);
  const undoRef = useRef<UndoStep | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [groupFilter, setGroupFilter] = useState(ALL);
  const [editingPortal, setEditingPortal] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingGroupText, setEditingGroupText] = useState("");
  const [newPortal, setNewPortal] = useState("");
  const [newReport, setNewReport] = useState(REPORT_STATUS_VALUES[0]);
  const [newGroup, setNewGroup] = useState("");
  const [newGroupColor, setNewGroupColor] = useState<string>(SAQSHAM_GROUP_COLORS[0]);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [dragRow, setDragRow] = useState<string | null>(null);
  const [dragGroup, setDragGroup] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    run: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    if (!data) return;
    if (draftRows === null) {
      setDraftRows(
        data.rows.map((row) => ({
          portal: row.portal,
          report: row.report,
          aliases: row.aliases ?? [],
          portalUsage: row.portalUsage ?? 0,
          reportUsage: row.reportUsage ?? 0,
        })),
      );
    }
    if (draftGroups === null) {
      setDraftGroups(
        data.groups.map((group) => ({
          name: group.name,
          color: group.color,
          order: group.order,
          system: group.system,
          usage: group.usage ?? 0,
        })),
      );
    }
  }, [data, draftRows, draftGroups]);

  const rows = draftRows ?? [];
  const groups = draftGroups ?? [];
  const groupNames = useMemo(() => groups.map((group) => group.name), [groups]);
  useEffect(() => {
    if (newReport && groupNames.length > 0 && !groupNames.includes(newReport)) {
      setNewReport(groupNames[0]);
    }
  }, [groupNames, newReport]);
  const errors = useMemo(
    () => [...groupIssues(groups), ...statusMapIssues(rows, groupNames)],
    [groups, groupNames, rows],
  );
  const shownRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (groupFilter === NO_GROUP && row.report) return false;
      if (groupFilter !== ALL && groupFilter !== NO_GROUP && row.report !== groupFilter) return false;
      if (!needle) return true;
      return `${row.portal} ${row.aliases.join(" ")} ${row.report}`.toLowerCase().includes(needle);
    });
  }, [groupFilter, rows, search]);

  const busyRef = useRef(false);
  const save = async (nextRows: MapRow[], nextGroups: GroupRow[]) => {
    if (!isAdmin || busyRef.current) return false;
    const nextNames = nextGroups.map((group) => group.name);
    const nextErrors = [...groupIssues(nextGroups), ...statusMapIssues(nextRows, nextNames)];
    if (nextErrors.length > 0) {
      toast.error(nextErrors[0]);
      return false;
    }
    busyRef.current = true;
    setBusy(true);
    setSavedAt(null);
    const before: UndoStep = { kind: "config", rows, groups };
    try {
      await saveConfig({
        rows: nextRows.map((row, order) => ({
          portal: row.portal,
          report: row.report,
          aliases: row.aliases,
          order,
        })),
        groups: nextGroups.map((group, order) => ({
          name: group.name,
          color: group.color,
          order,
          system: group.system,
        })),
      });
      setDraftRows(nextRows);
      setDraftGroups(nextGroups);
      setUndoStep(before);
      undoRef.current = before;
      setSavedAt(Date.now());
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the status mapping");
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const saveRenamedGroup = async (from: string, to: string) => {
    if (!isAdmin || busyRef.current) return false;
    const current = groups.find((group) => group.name === from);
    if (!current || current.system) return false;
    const name = to.trim();
    if (!name || name === from) return false;
    if (groups.some((group) => group.name !== from && group.name.toLowerCase() === name.toLowerCase())) {
      toast.error("A report group with that name already exists.");
      return false;
    }
    busyRef.current = true;
    setBusy(true);
    setSavedAt(null);
    const nextGroups = groups.map((group) =>
      group.name === from ? { ...group, name } : group,
    );
    const nextRows = rows.map((row) => (row.report === from ? { ...row, report: name } : row));
    const before: UndoStep = { kind: "rename", from, to: name, color: current.color };
    try {
      const result = await renameGroup({ from, to: name });
      setDraftRows(nextRows);
      setDraftGroups(nextGroups);
      setUndoStep(before);
      undoRef.current = before;
      setSavedAt(Date.now());
      if (result.updatedFacilities > 0) {
        toast.success(`Report group renamed · ${result.updatedFacilities} facilities updated`);
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename the report group");
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const undo = async () => {
    const step = undoRef.current;
    if (!step || !isAdmin || busyRef.current) return;
    if (step.kind === "rename") {
      busyRef.current = true;
      setBusy(true);
      try {
        await renameGroup({ from: step.to, to: step.from, color: step.color });
        setDraftRows(rows.map((row) => (row.report === step.to ? { ...row, report: step.from } : row)));
        setDraftGroups(
          groups.map((group) =>
            group.name === step.to ? { ...group, name: step.from, color: step.color } : group,
          ),
        );
        setUndoStep(null);
        undoRef.current = null;
        setSavedAt(Date.now());
        toast.success("Last change undone");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not undo");
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
      return;
    }
    const ok = await save(step.rows, step.groups);
    if (ok) {
      setUndoStep(null);
      undoRef.current = null;
      toast.success("Last change undone");
    }
  };

  const addStatus = async () => {
    const portal = newPortal.trim();
    if (!portal) {
      toast.error("Enter the portal status text first.");
      return;
    }
    if (rows.some((row) => normalizeStatusKey(row.portal) === normalizeStatusKey(portal) || row.aliases.some((alias) => normalizeStatusKey(alias) === normalizeStatusKey(portal)))) {
      toast.error("That portal status is already mapped.");
      return;
    }
    const next: MapRow = {
      portal,
      report: newReport,
      aliases: [],
      portalUsage: 0,
      reportUsage: groups.find((g) => g.name === newReport)?.usage ?? 0,
    };
    if (await save([next, ...rows], groups)) {
      setNewPortal("");
      toast.success("Status added");
    }
  };

  const requestPortalRename = (row: MapRow) => {
    const portal = editingText.trim();
    if (!portal) {
      toast.error("A portal status cannot be blank.");
      return;
    }
    if (portal === row.portal) {
      setEditingPortal(null);
      return;
    }
    if (
      rows.some(
        (other) =>
          other.portal !== row.portal &&
          (normalizeStatusKey(other.portal) === normalizeStatusKey(portal) ||
            other.aliases.some((alias) => normalizeStatusKey(alias) === normalizeStatusKey(portal))),
      )
    ) {
      toast.error("That portal status is already used (ignoring case and extra spaces).");
      return;
    }
    const apply = async () => {
      const keepAlias = normalizeStatusKey(row.portal) !== normalizeStatusKey(portal);
      const next = rows.map((other) =>
        other.portal === row.portal
          ? { ...other, portal, aliases: keepAlias ? [...other.aliases, row.portal] : other.aliases }
          : other,
      );
      if (await save(next, groups)) {
        setEditingPortal(null);
        toast.success("Portal status updated");
      }
    };
    setEditingPortal(null);
    if (row.portalUsage > 0) {
      setPending({
        title: "Rename a used portal status?",
        description: `“${row.portal}” is used by ${row.portalUsage} facilit${row.portalUsage === 1 ? "y" : "ies"}. The old text will stay as an alias, so past imports still match.`,
        confirmLabel: "Rename and keep alias",
        run: apply,
      });
    } else {
      void apply();
    }
  };

  const requestDelete = (row: MapRow) => {
    const run = async () => {
      const next = rows.filter((other) => other.portal !== row.portal);
      if (await save(next, groups)) toast.success("Status removed from the mapping");
    };
    if (row.portalUsage > 0) {
      setPending({
        title: "Delete a used portal status?",
        description: `“${row.portal}” is used by ${row.portalUsage} facilit${row.portalUsage === 1 ? "y" : "ies"}. Removing the mapping does not erase their saved data, but future imports with this text will need a mapping.`,
        confirmLabel: "Remove mapping",
        run,
      });
    } else {
      void run();
    }
  };

  const requestReportChange = (row: MapRow, report: string) => {
    if (row.report === report) return;
    const apply = async () => {
      const next = rows.map((other) =>
        other.portal === row.portal ? { ...other, report, reportUsage: groups.find((g) => g.name === report)?.usage ?? 0 } : other,
      );
      if (await save(next, groups)) toast.success("Report group updated");
    };
    if (row.portalUsage > 0) {
      setPending({
        title: "Change a used status?",
        description: `“${row.portal}” is used by ${row.portalUsage} facilit${row.portalUsage === 1 ? "y" : "ies"}. Their saved report values stay the same; future imports will use the new group.`,
        confirmLabel: "Change group",
        run: apply,
      });
    } else {
      void apply();
    }
  };

  const requestDeleteGroup = (group: GroupRow) => {
    if (group.system) return;
    const used = rows.filter((row) => row.report === group.name).length;
    if (used > 0) {
      toast.error(`Move the ${used} status${used === 1 ? "" : "es"} in “${group.name}” to another group first.`);
      return;
    }
    if (group.usage > 0) {
      toast.error(`“${group.name}” is still used by ${group.usage} facilities. Reassign them before deleting it.`);
      return;
    }
    setPending({
      title: "Delete report group?",
      description: `Delete “${group.name}”? This cannot be undone from the mapping screen.`,
      confirmLabel: "Delete group",
      run: async () => {
        const nextGroups = groups.filter((other) => other.name !== group.name);
        if (await save(rows, nextGroups)) toast.success("Report group deleted");
      },
    });
  };

  const addGroup = async () => {
    const name = newGroup.trim();
    if (!name) {
      toast.error("Enter a report group name.");
      return;
    }
    if (groups.some((group) => group.name.toLowerCase() === name.toLowerCase())) {
      toast.error("A report group with that name already exists.");
      return;
    }
    const nextGroups = [
      ...groups,
      { name, color: newGroupColor, order: groups.length, system: false, usage: 0 },
    ];
    if (await save(rows, nextGroups)) {
      setNewGroup("");
      toast.success("Report group added");
    }
  };

  const moveStatus = async (fromPortal: string, toPortal: string) => {
    if (fromPortal === toPortal) return;
    const from = rows.findIndex((row) => row.portal === fromPortal);
    const to = rows.findIndex((row) => row.portal === toPortal);
    if (from < 0 || to < 0) return;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    await save(next, groups);
  };

  const moveGroup = async (fromName: string, toName: string) => {
    if (fromName === toName) return;
    const from = groups.findIndex((group) => group.name === fromName);
    const to = groups.findIndex((group) => group.name === toName);
    if (from < 0 || to < 0) return;
    const next = [...groups];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    await save(rows, next.map((group, order) => ({ ...group, order })));
  };

  const importCsv = async () => {
    const parsed = parseCsv(csvText);
    if (parsed.length === 0) {
      toast.error("Paste CSV rows first.");
      return;
    }
    const unknown = parsed.find((row) => row.report && !groupNames.includes(row.report));
    if (unknown) {
      toast.error(`“${unknown.report}” is not a report group. Add the group first.`);
      return;
    }
    const next: MapRow[] = parsed.map((row) => ({
      portal: row.portal,
      report: row.report,
      aliases: [],
      portalUsage: 0,
      reportUsage: groups.find((group) => group.name === row.report)?.usage ?? 0,
    }));
    const issues = statusMapIssues(next, groupNames);
    if (issues.length > 0) {
      toast.error(issues[0]);
      return;
    }
    if (await save(next, groups)) {
      setCsvOpen(false);
      setCsvText("");
      toast.success(`Imported ${next.length} status mappings`);
    }
  };

  const resetSeed = () => {
    setPending({
      title: "Reset to seed?",
      description:
        "This replaces the status mapping with the shipped seed. Existing facility values are not changed; a custom report group still used by facilities stays so those values keep their group.",
      confirmLabel: "Reset mapping",
      run: async () => {
        const nextRows = SAQSHAM_STATUS_MAP.map((row) => ({
          portal: row.portal,
          report: row.report,
          aliases: [],
          portalUsage: 0,
          reportUsage: 0,
        }));
        const seedNames = new Set(
          DEFAULT_REPORT_GROUPS.map((group) => normalizeStatusKey(group.name)),
        );
        const usageByName = new Map(
          groups.map((group) => [normalizeStatusKey(group.name), group.usage]),
        );
        const keptGroups = groups.filter(
          (group) => !seedNames.has(normalizeStatusKey(group.name)) && group.usage > 0,
        );
        const nextGroups = [
          ...DEFAULT_REPORT_GROUPS.map((group, order) => ({
            ...group,
            order,
            usage: usageByName.get(normalizeStatusKey(group.name)) ?? 0,
          })),
          ...keptGroups.map((group, index) => ({
            ...group,
            order: DEFAULT_REPORT_GROUPS.length + index,
          })),
        ];
        if (await save(nextRows, nextGroups)) toast.success("Status mapping reset to seed");
      },
    });
  };

  if (!data) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading the status mapping…
      </p>
    );
  }

  return (
    <div className="space-y-4" data-admin-anchor="saqsham-status-map">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ListChecks className="size-4" /> Status mapping
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            Portal status is kept exactly as imported. Documents Status (Report) is what the app uses after the import.
            Changes are saved automatically and recorded in the audit log.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {busy && <span className="text-xs text-muted-foreground">Saving…</span>}
          {savedAt && !busy && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800">
              <Check className="size-3" /> Saved
            </span>
          )}
          {undoStep && (
            <Button size="sm" variant="ghost" className="gap-1.5" disabled={busy} onClick={() => void undo()}>
              <Undo2 className="size-3.5" /> Undo
            </Button>
          )}
          <span className="text-[11px] text-muted-foreground">Version {data.version || "seed"}</span>
        </div>
      </div>

      {!isAdmin && (
        <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          View only. A State Admin can add, change or delete mappings and report groups.
        </div>
      )}

      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            Portal statuses
            <span className="text-xs font-normal text-muted-foreground">
              {rows.length} mapped · {shownRows.length} shown
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAdmin && (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-2">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                <Plus className="size-3.5" /> Add status
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-56 flex-1 text-[11px] font-medium">
                  Portal status (exact text)
                  <Input
                    className="mt-1 h-8 text-xs"
                    value={newPortal}
                    onChange={(event) => setNewPortal(event.target.value)}
                    placeholder="Paste the exact SaQsham status text"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void addStatus();
                    }}
                  />
                </label>
                <label className="w-64 text-[11px] font-medium">
                  Documents Status (Report)
                  <Select
                    value={newReport || BLANK}
                    onValueChange={(value) => setNewReport(value === BLANK ? "" : value)}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs" aria-label="Report group for the new status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={BLANK}>Keep current report</SelectItem>
                      {groupNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <Button type="button" size="sm" className="gap-1.5" disabled={busy} onClick={() => void addStatus()}>
                  <Plus className="size-3.5" /> Add
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-52 flex-1 sm:max-w-80">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search portal text or report group"
                className="h-8 pl-8 text-xs"
                aria-label="Search status mapping"
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="h-8 w-56 text-xs" aria-label="Filter by report group">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All report groups</SelectItem>
                <SelectItem value={NO_GROUP}>Keep current report</SelectItem>
                {groupNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => downloadCsv(rows, groups)}
              disabled={rows.length === 0}
            >
              <Download className="size-3.5" /> Export CSV
            </Button>
            {isAdmin && (
              <>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCsvOpen(true)}>
                  <Upload className="size-3.5" /> Import CSV
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5" disabled={busy} onClick={resetSeed}>
                  <RotateCcw className="size-3.5" /> Reset to seed
                </Button>
              </>
            )}
          </div>

          {errors.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-rose-700">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}

          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[58rem] border-collapse text-xs">
              <thead className="bg-muted/80">
                <tr>
                  <th className="w-8 px-2 py-2" aria-label="Reorder" />
                  <th className="px-2 py-2 text-left font-semibold text-muted-foreground">
                    Portal status (kept exactly as imported)
                  </th>
                  <th className="w-72 px-2 py-2 text-left font-semibold text-muted-foreground">
                    Documents Status (Report)
                  </th>
                  <th className="w-28 px-2 py-2 text-left font-semibold text-muted-foreground">Used by</th>
                  <th className="w-12 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {shownRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No status matches the search or group filter.
                    </td>
                  </tr>
                )}
                {shownRows.map((row) => {
                  const report = row.report || "";
                  return (
                    <tr
                      key={row.portal}
                      className={cn(
                        "border-t border-border/40 align-top",
                        dragRow === row.portal && "bg-primary/5",
                      )}
                      draggable={isAdmin}
                      onDragStart={() => setDragRow(row.portal)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (dragRow) void moveStatus(dragRow, row.portal);
                        setDragRow(null);
                      }}
                    >
                      <td className="px-2 py-2 text-muted-foreground">
                        <GripVertical className={cn("size-3.5", !isAdmin && "opacity-30")} aria-hidden />
                      </td>
                      <td className="px-2 py-2">
                        {editingPortal === row.portal ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Input
                              autoFocus
                              className="h-8 min-w-60 flex-1 text-xs"
                              value={editingText}
                              onChange={(event) => setEditingText(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") requestPortalRename(row);
                                if (event.key === "Escape") setEditingPortal(null);
                              }}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label="Save portal status"
                              onClick={() => requestPortalRename(row)}
                            >
                              <Check className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label="Cancel portal edit"
                              onClick={() => setEditingPortal(null)}
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-start gap-1.5">
                            <span className="min-w-0 flex-1 break-words">{row.portal}</span>
                            {isAdmin && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-7 shrink-0"
                                aria-label={`Edit ${row.portal}`}
                                onClick={() => {
                                  setEditingPortal(row.portal);
                                  setEditingText(row.portal);
                                }}
                              >
                                <Pencil className="size-3" />
                              </Button>
                            )}
                          </div>
                        )}
                        {row.aliases.length > 0 && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            Old text: {row.aliases.join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {isResultDeclared(row.portal) && !report && (
                          <p className="mb-1 text-[10px] font-semibold text-amber-800">
                            Needs mapping — choose a destination
                          </p>
                        )}
                        <Select
                          value={report || (isResultDeclared(row.portal) ? "" : BLANK)}
                          disabled={!isAdmin}
                          onValueChange={(value) => requestReportChange(row, value === BLANK ? "" : value)}
                        >
                          <SelectTrigger className="h-8 w-full text-xs" aria-label={`Report group for ${row.portal}`}>
                            <SelectValue placeholder="Needs mapping" />
                          </SelectTrigger>
                          <SelectContent>
                            {!isResultDeclared(row.portal) && (
                              <SelectItem value={BLANK}>Keep current report</SelectItem>
                            )}
                            {groupNames.map((name) => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {report && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span
                              className="inline-block size-2 rounded-full"
                              style={{ backgroundColor: groups.find((g) => g.name === report)?.color ?? "#94A3B8" }}
                            />
                            {report}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {row.portalUsage > 0 ? `${row.portalUsage} facilities` : "-"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {isAdmin && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            disabled={busy}
                            aria-label={`Delete mapping for ${row.portal}`}
                            onClick={() => requestDelete(row)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            Manage report groups
            <span className="text-xs font-normal text-muted-foreground">{groups.length} groups</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAdmin && (
            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 p-2">
              <label className="min-w-56 flex-1 text-[11px] font-medium">
                New report group
                <Input
                  className="mt-1 h-8 text-xs"
                  value={newGroup}
                  onChange={(event) => setNewGroup(event.target.value)}
                  placeholder="For example: Report sent to NHSRC"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void addGroup();
                  }}
                />
              </label>
              <label className="text-[11px] font-medium">
                Colour
                <input
                  type="color"
                  value={newGroupColor}
                  onChange={(event) => setNewGroupColor(event.target.value)}
                  className="mt-1 block h-8 w-14 cursor-pointer rounded border border-border bg-background p-1"
                  aria-label="New group colour"
                />
              </label>
              <Button type="button" size="sm" className="gap-1.5" disabled={busy} onClick={() => void addGroup()}>
                <Plus className="size-3.5" /> Add group
              </Button>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[42rem] border-collapse text-xs">
              <thead className="bg-muted/80">
                <tr>
                  <th className="w-8 px-2 py-2" aria-label="Reorder" />
                  <th className="px-2 py-2 text-left font-semibold text-muted-foreground">Report group</th>
                  <th className="w-24 px-2 py-2 text-left font-semibold text-muted-foreground">Colour</th>
                  <th className="w-28 px-2 py-2 text-left font-semibold text-muted-foreground">Used by</th>
                  <th className="w-24 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr
                    key={group.name}
                    className={cn("border-t border-border/40", dragGroup === group.name && "bg-primary/5")}
                    draggable={isAdmin && !busy}
                    onDragStart={() => setDragGroup(group.name)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (dragGroup) void moveGroup(dragGroup, group.name);
                      setDragGroup(null);
                    }}
                  >
                    <td className="px-2 py-2 text-muted-foreground">
                      <GripVertical className={cn("size-3.5", !isAdmin && "opacity-30")} aria-hidden />
                    </td>
                    <td className="px-2 py-2">
                      {editingGroup === group.name ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Input
                            autoFocus
                            className="h-8 min-w-52 flex-1 text-xs"
                            value={editingGroupText}
                            onChange={(event) => setEditingGroupText(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                const next = editingGroupText;
                                setEditingGroup(null);
                                void saveRenamedGroup(group.name, next);
                              }
                              if (event.key === "Escape") setEditingGroup(null);
                            }}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label="Save report group name"
                            onClick={() => {
                              const next = editingGroupText;
                              setEditingGroup(null);
                              void saveRenamedGroup(group.name, next);
                            }}
                          >
                            <Check className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label="Cancel report group edit"
                            onClick={() => setEditingGroup(null)}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{group.name}</span>
                          {group.system && (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              <Lock className="size-2.5" /> System
                            </span>
                          )}
                          {isAdmin && !group.system && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              aria-label={`Rename ${group.name}`}
                              onClick={() => {
                                setEditingGroup(group.name);
                                setEditingGroupText(group.name);
                              }}
                            >
                              <Pencil className="size-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="color"
                        value={group.color}
                        disabled={!isAdmin || busy}
                        onChange={(event) => {
                          const next = groups.map((other) =>
                            other.name === group.name ? { ...other, color: event.target.value } : other,
                          );
                          setDraftGroups(next);
                        }}
                        onBlur={(event) => {
                          const color = event.target.value;
                          const next = groups.map((other) =>
                            other.name === group.name ? { ...other, color } : other,
                          );
                          if (data.groups.find((other) => other.name === group.name)?.color !== color) {
                            void save(rows, next);
                          }
                        }}
                        className="h-7 w-12 cursor-pointer rounded border border-border bg-background p-0.5 disabled:cursor-not-allowed"
                        aria-label={`Colour for ${group.name}`}
                      />
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {group.usage > 0 ? `${group.usage} facilities` : "-"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {isAdmin && !group.system && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          disabled={busy}
                          aria-label={`Delete ${group.name}`}
                          onClick={() => requestDeleteGroup(group)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Drag to reorder. A group can be deleted only after every status in it is moved. Result Declared cannot be
            renamed or deleted.
          </p>
        </CardContent>
      </Card>

      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Import status mapping CSV</DialogTitle>
            <DialogDescription>
              Two columns: portal status and report group. Use Export CSV as the starting file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void file.text().then(setCsvText);
              }}
              aria-label="Choose a status mapping CSV"
            />
            <Label htmlFor="mapping-csv" className="text-xs">
              Or paste CSV
            </Label>
            <textarea
              id="mapping-csv"
              rows={10}
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={"Portal status,Documents Status (Report)\nResult Declared,Keep current report"}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCsvOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void importCsv()} disabled={busy || !csvText.trim()}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.title}</DialogTitle>
            <DialogDescription>{pending?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const run = pending?.run;
                setPending(null);
                if (run) void run();
              }}
            >
              {pending?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
