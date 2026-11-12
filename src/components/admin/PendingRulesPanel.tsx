import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Minus,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useCycleScope } from "@/components/CycleFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computePendingInWorker } from "@/lib/pendingComputeClient";
import { CYCLE_SCOPE_PARAM, serializeCycleScope } from "@/lib/cycleScope";
import {
  DEFAULT_PENDING_CONFIG,
  ISSUE_CATEGORIES,
  ISSUE_CATEGORY_LABEL,
  ISSUE_SEVERITY_LABEL,
  PENDING_FILTER_KEYS,
  effectiveStatus,
  enabledRuleCount,
  issueRules,
  normalizePendingConfig,
  type IssueCategory,
  type IssueSeverity,
  type PendingConfig,
  type IssueState,
  type PendingRow,
  type PendingRuleDef,
  type PendingThresholdDef,
} from "@/lib/pending";
import { normalizeDocumentRules } from "@/lib/documentRules";
import { cn } from "@/lib/utils";
import { todayLocalIso } from "@/lib/today";

const GROUP_STATE_KEY = "pending-rules-groups.v1";
const SEVERITIES: IssueSeverity[] = ["high", "medium", "low"];

const SEVERITY_PILL: Record<IssueSeverity, string> = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-slate-200 bg-slate-100 text-slate-700",
};

const FILTER_LABELS: Record<string, string> = {
  block: "Block",
  facilityType: "Facility type",
  category: "Category",
  severity: "Severity",
  status: "Status",
  cycle: "Cycle",
  lastUpdated: "Last updated",
  assignedTo: "Assigned to",
};

type Counts = { byRule: Record<string, number>; facilities: number; ready: boolean };

function ruleSetting(config: PendingConfig, ruleId: string) {
  return config.rules[ruleId] ?? DEFAULT_PENDING_CONFIG.rules[ruleId];
}

function changedFromDefault(config: PendingConfig, rule: PendingRuleDef) {
  const current = ruleSetting(config, rule.id);
  const original = DEFAULT_PENDING_CONFIG.rules[rule.id];
  if (!current || !original) return false;
  if (current.enabled !== original.enabled || current.severity !== original.severity) return true;
  return rule.thresholds.some((threshold) => {
    const now = current.thresholds[threshold.key] ?? threshold.default;
    const before = original.thresholds[threshold.key] ?? threshold.default;
    return now !== before;
  });
}

function readGroupState(userId: string): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(`${GROUP_STATE_KEY}.${userId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      ISSUE_CATEGORIES.flatMap((category) =>
        typeof parsed?.[category] === "boolean" ? [[category, parsed[category]]] : [],
      ),
    );
  } catch {
    return {};
  }
}

export function PendingRulesPanel() {
  const { user } = useAuth();
  const isAdmin = user?.appRole === "admin";
  const cycleScope = useCycleScope();
  const today = useMemo(() => todayLocalIso(), []);
  const overview = useQuery(api.pending.overview, isAdmin ? {} : "skip") as
    | {
        config: unknown;
        settings: Record<string, unknown> | null;
        documentRules: unknown;
        states: unknown[];
        me: { id: string; name: string; role: string };
      }
    | undefined;
  const rowsQuery = useQuery(
    api.ops.listFacilityRowsFast,
    isAdmin ? { cycle: cycleScope } : "skip",
  );
  const rows = rowsQuery?.rows as unknown as PendingRow[] | undefined;
  const saveConfig = useMutation(api.pending.saveConfig);

  const [config, setConfig] = useState<PendingConfig | null>(null);
  const configRef = useRef<PendingConfig | null>(null);
  const latestWrite = useRef<Promise<unknown>>(Promise.resolve());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const initialized = useRef(false);

  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<IssueSeverity | "all">("all");
  const [enabledFilter, setEnabledFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [changedOnly, setChangedOnly] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>({ byRule: {}, facilities: 0, ready: false });
  const userId = user?._id ? String(user._id) : "anonymous";

  useEffect(() => {
    setOpenGroups(readGroupState(userId));
  }, [userId]);

  useEffect(() => {
    if (!overview || initialized.current) return;
    initialized.current = true;
    const next = normalizePendingConfig(overview.config);
    setConfig(next);
    configRef.current = next;
  }, [overview]);

  /* One computation for every rule — counts are never fetched per rule. */
  useEffect(() => {
    if (!config || !rows || !overview) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      computePendingInWorker(rows, {
        today,
        config,
        documentRules: normalizeDocumentRules(overview.documentRules),
        settings: overview.settings as never,
      })
        .then((issues) => {
          if (cancelled) return;
          const states = (overview.states ?? []) as IssueState[];
          const stateByKey = new Map(
            states.map((state) => [`${state.facilityId}:${state.ruleId}`, state]),
          );
          const facilitiesByRule = new Map<string, Set<string>>();
          const facilities = new Set<string>();
          for (const issue of issues) {
            const status = effectiveStatus(
              stateByKey.get(`${issue.facilityId}:${issue.ruleId}`),
              today,
            );
            if (status === "resolved" || status === "snoozed") continue;
            const own = facilitiesByRule.get(issue.ruleId) ?? new Set<string>();
            own.add(issue.facilityId);
            facilitiesByRule.set(issue.ruleId, own);
            facilities.add(issue.facilityId);
          }
          const byRule = Object.fromEntries(
            [...facilitiesByRule].map(([ruleId, ids]) => [ruleId, ids.size]),
          );
          setCounts({ byRule, facilities: facilities.size, ready: true });
        })
        .catch(() => {
          if (!cancelled) setCounts((current) => ({ ...current, ready: false }));
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [config, rows, overview, today]);

  const persist = (next: PendingConfig) => {
    latestWrite.current = latestWrite.current
      .catch(() => undefined)
      .then(() => saveConfig({ value: next }))
      .then(() => {
        if (configRef.current === next) setSaveState("saved");
      })
      .catch((error: unknown) => {
        setSaveState("error");
        toast.error("Could not save the rule", {
          description: error instanceof Error ? error.message : "Try again.",
        });
      });
  };

  const applyChange = (
    next: PendingConfig,
    message: string,
    options: { undo?: boolean; notify?: boolean } = {},
  ) => {
    const before = configRef.current;
    if (!before) return;
    configRef.current = next;
    setConfig(next);
    setSaveState("saving");
    persist(next);
    if (options.notify === false) return;
    toast.success(message, {
      duration: 5000,
      description: "Saved automatically.",
      action:
        options.undo === false
          ? undefined
          : {
              label: "Undo",
              onClick: () => {
                applyChange(before, "Change undone", { undo: false, notify: false });
                toast.info("Change undone");
              },
            },
    });
  };

  const patchRule = (
    rule: PendingRuleDef,
    patch: Partial<{ enabled: boolean; severity: IssueSeverity; thresholds: Record<string, number> }>,
    message = `${rule.label} updated`,
  ) => {
    const current = configRef.current;
    if (!current) return;
    const setting = ruleSetting(current, rule.id);
    applyChange(
      {
        ...current,
        rules: {
          ...current.rules,
          [rule.id]: {
            ...setting,
            ...patch,
            thresholds: { ...setting.thresholds, ...(patch.thresholds ?? {}) },
          },
        },
      },
      message,
    );
  };

  const setGroupEnabled = (category: IssueCategory, enabled: boolean) => {
    const current = configRef.current;
    if (!current) return;
    const rules = { ...current.rules };
    for (const rule of issueRules.filter((item) => item.category === category)) {
      rules[rule.id] = { ...ruleSetting(current, rule.id), enabled };
    }
    applyChange(
      { ...current, rules },
      `${ISSUE_CATEGORY_LABEL[category]} rules turned ${enabled ? "on" : "off"}`,
    );
  };

  const resetRule = (rule: PendingRuleDef) => {
    const current = configRef.current;
    if (!current) return;
    applyChange(
      {
        ...current,
        rules: { ...current.rules, [rule.id]: DEFAULT_PENDING_CONFIG.rules[rule.id] },
      },
      `${rule.label} reset to default`,
    );
  };

  const setGroupOpen = (category: IssueCategory, open: boolean) => {
    setOpenGroups((current) => {
      const next = { ...current, [category]: open };
      try {
        window.localStorage.setItem(`${GROUP_STATE_KEY}.${userId}`, JSON.stringify(next));
      } catch {
        /* storage unavailable — the session still remembers it */
      }
      return next;
    });
  };

  const setAllGroupsOpen = (open: boolean) => {
    const next = Object.fromEntries(ISSUE_CATEGORIES.map((category) => [category, open]));
    setOpenGroups(next);
    try {
      window.localStorage.setItem(`${GROUP_STATE_KEY}.${userId}`, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };

  const filteredGroups = useMemo(() => {
    if (!config) return [];
    const needle = search.trim().toLowerCase();
    return ISSUE_CATEGORIES.map((category) => {
      const all = issueRules.filter((rule) => rule.category === category);
      const rules = all.filter((rule) => {
        const setting = ruleSetting(config, rule.id);
        if (severity !== "all" && setting.severity !== severity) return false;
        if (enabledFilter === "enabled" && !setting.enabled) return false;
        if (enabledFilter === "disabled" && setting.enabled) return false;
        if (changedOnly && !changedFromDefault(config, rule)) return false;
        if (
          needle &&
          !`${rule.label} ${rule.description}`.toLowerCase().includes(needle)
        ) {
          return false;
        }
        return true;
      });
      return { category, all, rules };
    }).filter((group) => group.rules.length > 0);
  }, [config, search, severity, enabledFilter, changedOnly]);

  if (!overview) {
    return <div className="h-40 animate-pulse rounded-xl border bg-muted/20" />;
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Only a State Admin can change pending rules. Ask your State Admin for help.
      </div>
    );
  }

  if (!config) {
    return <div className="h-40 animate-pulse rounded-xl border bg-muted/20" />;
  }

  const enabled = enabledRuleCount(config);
  const severityCounts: Record<IssueSeverity, number> = { high: 0, medium: 0, low: 0 };
  for (const rule of issueRules) {
    const setting = ruleSetting(config, rule.id);
    if (setting.enabled) severityCounts[setting.severity] += 1;
  }
  const visibleRules = filteredGroups.reduce((total, group) => total + group.rules.length, 0);
  const filtersChanged =
    config.defaultFilters.length !== DEFAULT_PENDING_CONFIG.defaultFilters.length ||
    config.defaultFilters.some(
      (key) => !DEFAULT_PENDING_CONFIG.defaultFilters.includes(key),
    );
  const ruleHref = (ruleId: string) => {
    const params = new URLSearchParams({ rule: ruleId });
    if (cycleScope !== "current") {
      params.set(CYCLE_SCOPE_PARAM, serializeCycleScope(cycleScope));
    }
    return `/pending?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-xl border border-border/70 bg-card p-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Pending rules</h2>
          <p className="mt-0.5 max-w-2xl text-[13px] leading-5 text-slate-600">
            Choose what the Pending &amp; Follow-up page checks. Changes save automatically.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <div className="text-[11px] font-medium text-slate-500">Rules enabled</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums">
              {enabled.enabled} <span className="text-xs font-normal text-slate-500">of {enabled.total}</span>
            </div>
          </div>
          {SEVERITIES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSeverity((current) => (current === value ? "all" : value))}
              aria-pressed={severity === value}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                severity === value
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/60 bg-card hover:bg-muted/30",
              )}
            >
              <div className="text-[11px] font-medium text-slate-500">
                {ISSUE_SEVERITY_LABEL[value]}
              </div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-lg font-semibold tabular-nums">{severityCounts[value]}</span>
                <span className="text-[11px] text-slate-500">rules</span>
              </div>
            </button>
          ))}
          <div className="col-span-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 sm:col-span-1">
            <div className="text-[11px] font-medium text-slate-500">Facilities affected now</div>
            <div className="mt-0.5 flex items-center gap-1 text-lg font-semibold tabular-nums">
              <Building2 className="size-3.5 text-slate-400" aria-hidden />
              {counts.ready ? counts.facilities : "-"}
            </div>
          </div>
        </div>
      </section>

      <div
        className="sticky z-10 space-y-2 border-b border-border/60 bg-background py-2"
        style={{ top: "calc(var(--app-header-h, 4rem) + var(--admin-tabbar-h, 3.5rem))" }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-96">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search rules by title or description…"
              aria-label="Search rules by title or description"
              className="h-9 w-full rounded-lg border-border/70 bg-card pl-9 text-sm"
            />
          </div>
          <Select
            value={severity}
            onValueChange={(value) => setSeverity(value as IssueSeverity | "all")}
          >
            <SelectTrigger className="h-9 w-[8.5rem] text-xs" aria-label="Filter by severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {SEVERITIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {ISSUE_SEVERITY_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={enabledFilter}
            onValueChange={(value) => setEnabledFilter(value as typeof enabledFilter)}
          >
            <SelectTrigger className="h-9 w-[8.5rem] text-xs" aria-label="Filter by rule status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All rules</SelectItem>
              <SelectItem value="enabled">Enabled only</SelectItem>
              <SelectItem value="disabled">Disabled only</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={changedOnly ? "secondary" : "outline"}
            size="sm"
            className="h-9 gap-1.5 text-xs"
            aria-pressed={changedOnly}
            onClick={() => setChangedOnly((value) => !value)}
          >
            <span className={cn("size-1.5 rounded-full", changedOnly ? "bg-primary" : "bg-slate-400")} />
            Changed from default
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => setAllGroupsOpen(true)}
          >
            <ChevronsUpDown className="size-3.5" aria-hidden /> Expand all
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => setAllGroupsOpen(false)}
          >
            <ChevronsDownUp className="size-3.5" aria-hidden /> Collapse all
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                <RotateCcw className="size-3.5" aria-hidden /> Reset to defaults
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all pending rules?</AlertDialogTitle>
                <AlertDialogDescription>
                  This turns every rule back on with its original severity, thresholds and default
                  filters. You can undo it for 5 seconds after saving.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const current = configRef.current;
                    if (!current) return;
                    applyChange(
                      {
                        ...DEFAULT_PENDING_CONFIG,
                        rules: { ...DEFAULT_PENDING_CONFIG.rules },
                        defaultFilters: [...DEFAULT_PENDING_CONFIG.defaultFilters],
                      },
                      "All rules reset to defaults",
                    );
                  }}
                >
                  Reset all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex min-h-5 flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>
            {visibleRules} of {issueRules.length} rules shown
          </span>
          <span className="flex items-center gap-2">
            <span className="hidden sm:inline">
              Counts use the same list and cycle as Pending &amp; Follow-up.
            </span>
            <span
              className={cn(
                "inline-flex min-h-6 min-w-[4.5rem] items-center justify-center gap-1.5 rounded-full border px-2 text-[11px] font-medium",
                saveState === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : saveState === "saving"
                    ? "border-slate-200 bg-slate-50 text-slate-600"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700",
              )}
              aria-live="polite"
            >
              {saveState === "error" ? (
                "Not saved"
              ) : saveState === "saving" ? (
                "Saving…"
              ) : (
                <>
                  <CheckCircle2 className="size-3" aria-hidden /> Saved
                </>
              )}
            </span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filteredGroups.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/80 bg-card px-4 py-8 text-center text-sm text-slate-500">
            No rules match these filters.
          </div>
        )}
        {filteredGroups.map(({ category, all, rules }) => {
          const open = openGroups[category] ?? true;
          const groupEnabled = all.filter((rule) => ruleSetting(config, rule.id).enabled).length;
          return (
            <section key={category} className="overflow-hidden rounded-xl border border-border/70 bg-card">
              <div className="flex items-center gap-2 bg-muted/30 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setGroupOpen(category, !open)}
                  aria-expanded={open}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {open ? (
                    <ChevronDown className="size-4 shrink-0 text-slate-500" aria-hidden />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-slate-500" aria-hidden />
                  )}
                  <span className="truncate text-sm font-semibold">{ISSUE_CATEGORY_LABEL[category]}</span>
                  <span className="shrink-0 text-[11px] font-medium text-slate-500">
                    {groupEnabled} of {all.length} enabled
                  </span>
                </button>
                <Switch
                  checked={groupEnabled > 0}
                  onCheckedChange={(value) => setGroupEnabled(category, value)}
                  aria-label={`Turn all ${ISSUE_CATEGORY_LABEL[category]} rules ${groupEnabled > 0 ? "off" : "on"}`}
                />
              </div>
              {open && (
                <ul className="divide-y divide-border/60">
                  {rules.map((rule) => {
                    const setting = ruleSetting(config, rule.id);
                    const changed = changedFromDefault(config, rule);
                    const count = counts.ready ? (counts.byRule[rule.id] ?? 0) : null;
                    return (
                      <li
                        key={rule.id}
                        className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2.5"
                      >
                        <Switch
                          checked={setting.enabled}
                          onCheckedChange={(value) =>
                            patchRule(
                              rule,
                              { enabled: value },
                              `${rule.label} turned ${value ? "on" : "off"}`,
                            )
                          }
                          className="mt-0.5 shrink-0"
                          aria-label={`Turn ${rule.label} ${setting.enabled ? "off" : "on"}`}
                        />
                        <div className="min-w-[13rem] flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h4 className="text-[13px] font-bold text-slate-900">{rule.label}</h4>
                            {changed && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                                <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                                Changed
                                <button
                                  type="button"
                                  onClick={() => resetRule(rule)}
                                  className="rounded px-1 py-0.5 text-[10px] font-semibold underline underline-offset-2 hover:bg-primary/10"
                                >
                                  Reset
                                </button>
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[13px] leading-5 text-slate-600">
                            {rule.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {rule.thresholds.map((threshold) => (
                            <ThresholdStepper
                              key={threshold.key}
                              def={threshold}
                              value={setting.thresholds[threshold.key] ?? threshold.default}
                              onCommit={(value) =>
                                patchRule(
                                  rule,
                                  { thresholds: { [threshold.key]: value } },
                                  `${rule.label} saved`,
                                )
                              }
                            />
                          ))}
                          <Select
                            value={setting.severity}
                            onValueChange={(value) =>
                              patchRule(
                                rule,
                                { severity: value as IssueSeverity },
                                `${rule.label} is now ${ISSUE_SEVERITY_LABEL[value as IssueSeverity]}`,
                              )
                            }
                          >
                            <SelectTrigger
                              aria-label={`Severity for ${rule.label}`}
                              className={cn(
                                "h-8 w-[6.4rem] gap-1 rounded-full border px-2.5 text-[11px] font-semibold shadow-none",
                                SEVERITY_PILL[setting.severity],
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SEVERITIES.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {ISSUE_SEVERITY_LABEL[value]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Link
                            to={ruleHref(rule.id)}
                            className="inline-flex h-8 min-w-[5.5rem] items-center justify-end rounded-md px-1.5 text-[11px] font-medium text-primary underline-offset-2 hover:bg-primary/5 hover:underline"
                            title={`Open Pending & Follow-up for ${rule.label}`}
                          >
                            {count === null ? "-" : `${count} ${count === 1 ? "facility" : "facilities"}`}
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <div className="flex items-center gap-2 bg-muted/30 px-3 py-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            aria-expanded={filtersOpen}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {filtersOpen ? (
              <ChevronDown className="size-4 shrink-0 text-slate-500" aria-hidden />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-slate-500" aria-hidden />
            )}
            <span className="truncate text-sm font-semibold">Filters shown by default</span>
            <span className="shrink-0 text-[11px] font-medium text-slate-500">
              {config.defaultFilters.length} selected
            </span>
            {filtersChanged && (
              <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Changed from default" />
            )}
          </button>
        </div>
        {filtersOpen && (
          <div className="p-3">
            <p className="text-[13px] leading-5 text-slate-600">
              These filters start open on Pending &amp; Follow-up. Choose the ones your team uses
              most.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PENDING_FILTER_KEYS.map((key) => {
                const checked = config.defaultFilters.includes(key);
                return (
                  <label
                    key={key}
                    className={cn(
                      "inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-medium",
                      checked
                        ? "border-primary/40 bg-primary/5 text-primary"
                        : "border-border/70 bg-card text-slate-600",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 accent-primary"
                      checked={checked}
                      onChange={() => {
                        const current = configRef.current;
                        if (!current) return;
                        const next = checked
                          ? current.defaultFilters.filter((item) => item !== key)
                          : [...current.defaultFilters, key];
                        if (!next.length) {
                          toast.error("Keep at least one filter");
                          return;
                        }
                        applyChange(
                          { ...current, defaultFilters: next },
                          `${FILTER_LABELS[key] ?? key} default updated`,
                        );
                      }}
                    />
                    {FILTER_LABELS[key] ?? key}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ThresholdStepper({
  def,
  value,
  onCommit,
}: {
  def: PendingThresholdDef;
  value: number;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const commit = () => {
    const raw = text.trim();
    const number = Number(raw);
    if (!/^\d+$/.test(raw) || number < 1 || number > 999) {
      setError("Use a whole number from 1 to 999.");
      return;
    }
    setError(null);
    setText(String(number));
    focused.current = false;
    if (number !== value) onCommit(number);
  };

  const step = (delta: number) => {
    const base = Number(text);
    const safe = Number.isFinite(base) ? Math.round(base) : value;
    const next = Math.max(1, Math.min(999, safe + delta));
    setText(String(next));
    setError(null);
    if (next !== value) onCommit(next);
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div
        className={cn(
          "inline-flex h-8 items-center overflow-hidden rounded-lg border bg-card",
          error ? "border-red-400" : "border-border/70",
        )}
      >
        <button
          type="button"
          onClick={() => step(-1)}
          className="inline-flex h-full w-6 items-center justify-center text-slate-500 hover:bg-muted disabled:opacity-40"
          disabled={value <= 1}
          aria-label={`Decrease ${def.label}`}
        >
          <Minus className="size-3" />
        </button>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
              (event.target as HTMLInputElement).blur();
            }
          }}
          inputMode="numeric"
          aria-label={`${def.label} (whole number 1 to 999)`}
          title={def.label}
          className="h-full w-9 border-x border-border/60 bg-transparent text-center text-xs font-semibold tabular-nums outline-none focus:bg-primary/5"
        />
        <button
          type="button"
          onClick={() => step(1)}
          className="inline-flex h-full w-6 items-center justify-center text-slate-500 hover:bg-muted disabled:opacity-40"
          disabled={value >= 999}
          aria-label={`Increase ${def.label}`}
        >
          <Plus className="size-3" />
        </button>
        <span className="px-1.5 text-[11px] font-medium text-slate-500">{def.unit}</span>
      </div>
      {error && <span className="text-[10px] font-medium text-red-600">{error}</span>}
    </div>
  );
}
