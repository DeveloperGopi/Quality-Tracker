// Admin Settings → Maintenance → Activity log.
//
// Read-only history of settings changes: who changed what, when and from which
// value to which. It reads the existing `auditLogs` table through
// ops.listAdminActivity (State-Admin only) — no new table, no new field, and
// nothing here writes.
//
// Long settings values (whole dropdown lists, header maps) are truncated by the
// server to 200 characters; a row can be expanded to see the full text it did
// store.

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  ChevronDown,
  History,
  Loader2,
  Search,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import {
  UniversalFilterBar,
  rowPasses,
  type BarValue,
  type FilterField,
} from "@/components/UniversalFilterBar";
import { cn } from "@/lib/utils";
import { toDisplayDateTime } from "@/lib/format";
import { CountBadge, EmptyState, SectionHeader } from "@/components/admin/AdminUi";

/** Table names → plain words, so “appSettings” reads as “Setting”. */
const TABLE_LABELS: Record<string, string> = {
  appSettings: "Setting",
  blocks: "Block",
  phcs: "PHC",
  users: "User",
  facilities: "Facility",
  certificationCycles: "Cycle",
  stateAssessments: "State assessment",
  nationalAssessments: "NQAS assessment",
  gapClosureFunds: "Gap closure fund",
  fireNocs: "Fire NOC",
  buildingDetails: "Building",
};

export function ActivityLogPanel() {
  const rows = useQuery(api.ops.listAdminActivity, { limit: 120 });
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bar, setBar] = useState<BarValue>(() => ({
    barKeys: ["table", "action", "changedBy", "date"],
    filters: [],
    match: "all",
  }));

  const fields = useMemo<FilterField[]>(() => {
    const list = rows ?? [];
    const unique = (values: (string | null | undefined)[]) =>
      [...new Set(values.filter((value): value is string => !!value))].sort();
    return [
      {
        key: "table",
        label: "Table",
        type: "select",
        onThisPage: true,
        options: unique(list.map((row) => TABLE_LABELS[row.table] ?? row.table)).map((value) => ({
          value,
        })),
      },
      {
        key: "action",
        label: "Action",
        type: "select",
        onThisPage: true,
        options: unique(list.map((row) => row.action)).map((value) => ({ value })),
      },
      {
        key: "changedBy",
        label: "Changed by",
        type: "select",
        onThisPage: true,
        options: unique(list.map((row) => row.changedByName)).map((value) => ({ value })),
      },
      { key: "date", label: "Date", type: "date" },
      { key: "field", label: "Field", type: "text" },
      { key: "value", label: "Value", type: "text" },
      { key: "search", label: "Search", type: "text" },
    ];
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    const valueOf = (r: (typeof rows)[number], key: string): unknown => {
      if (key === "table") return TABLE_LABELS[r.table] ?? r.table;
      if (key === "action") return r.action;
      if (key === "changedBy") return r.changedByName ?? "";
      if (key === "field") return r.field ?? "";
      if (key === "value") return `${r.oldValue ?? ""} ${r.newValue ?? ""}`;
      if (key === "date") {
        return Number.isFinite(r.changedAt) ? new Date(r.changedAt).toISOString().slice(0, 10) : "";
      }
      if (key === "search") {
        return [
          r.table,
          TABLE_LABELS[r.table] ?? r.table,
          r.action,
          r.field ?? "",
          r.changedByName ?? "",
          r.oldValue ?? "",
          r.newValue ?? "",
        ].join(" ");
      }
      return "";
    };
    return rows.filter(
      (r) =>
        rowPasses(bar.filters, bar.match, (key) => valueOf(r, key)) &&
        (!q || String(valueOf(r, "search")).toLowerCase().includes(q)),
    );
  }, [rows, query, bar]);

  return (
    <section
      id="maintenance-activity"
      data-admin-anchor="maintenance-activity"
      className="scroll-mt-40 rounded-xl border border-border/60 bg-background/60"
    >
      <div className="border-b border-border/60 p-4">
        <SectionHeader
          icon={History}
          title="Activity log"
          description="Every settings, user, block and facility change recorded by the app, newest first — with the old and the new value. Read-only."
          right={
            rows === undefined ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <CountBadge value={`${filtered.length} of ${rows.length} entries`} />
            )
          }
        />
        {rows !== undefined && rows.length > 0 && (
          <>
            <div className="relative mt-3 max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="glass-input h-10 pl-9"
                placeholder="Filter by person, setting or value"
                value={query}
                aria-label="Filter activity log"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="mt-2">
              <UniversalFilterBar
                pageKey="admin.audit"
                fields={fields}
                value={bar}
                onChange={setBar}
                summary={`Showing ${filtered.length} of ${rows.length} entries`}
              />
            </div>
          </>
        )}
      </div>

      {rows === undefined ? (
        <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading the history…
        </p>
      ) : rows.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={History}
            title="No activity recorded yet"
            body="As soon as somebody changes a setting, a role, a block or a facility, the change is listed here with who did it and when."
          />
        </div>
      ) : filtered.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          No entry matches “{query}”.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {filtered.map((r) => {
            const isOpen = expanded === r._id;
            const isSetting = r.table === "appSettings";
            const Icon = isSetting ? Settings2 : SlidersHorizontal;
            return (
              <li key={r._id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                        isSetting
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {TABLE_LABELS[r.table] ?? r.table}
                        {r.field ? ` · ${r.field}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.action}
                        {r.changedByName ? ` by ${r.changedByName}` : ""} ·{" "}
                        {toDisplayDateTime(r.changedAt)}
                      </p>
                      <p className="mt-1 text-sm break-words text-muted-foreground">
                        <span className="line-through opacity-80">
                          {r.oldValue ?? "—"}
                        </span>
                        <span className="mx-1.5 font-semibold text-foreground">→</span>
                        <span className="text-foreground">{r.newValue ?? "—"}</span>
                      </p>
                    </div>
                  </div>
                  {(r.oldValue ?? "").length > 60 || (r.newValue ?? "").length > 60 ? (
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : r._id)}
                      aria-expanded={isOpen}
                      className="flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {isOpen ? "Show less" : "Show full values"}
                      <ChevronDown
                        className={cn("size-3.5 transition-transform", isOpen && "rotate-180")}
                      />
                    </button>
                  ) : null}
                </div>
                {isOpen && (
                  <div className="mt-2 space-y-1 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs break-words">
                    <p>
                      <strong className="text-foreground">Before:</strong>{" "}
                      <span className="text-muted-foreground">{r.oldValue ?? "—"}</span>
                    </p>
                    <p>
                      <strong className="text-foreground">After:</strong>{" "}
                      <span className="text-muted-foreground">{r.newValue ?? "—"}</span>
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
