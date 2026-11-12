/**
 * QUICK VIEW → OVERVIEW — a compact snapshot built from data the dialog
 * already holds (the list row, the profile subscription and the document
 * list). No extra queries.
 */

import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronRight,
  Copy,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { MasterRow } from "@/lib/masterColumns";
import { cycleLabel } from "@/convex/lifecycle";
import {
  daysUntil,
  formatPercent,
  nextDueOf,
  toDdMmmYyyy,
} from "@/lib/masterColumns";
import { DOCUMENT_SHORT_LABEL } from "@/lib/documentsConfig";
import { phoneForViewer, telHref } from "@/lib/phone";
import { cn } from "@/lib/utils";

const todayIso = () => new Date().toISOString().slice(0, 10);

function sectionForKind(kind: string): string {
  switch (kind) {
    case "ia":
      return "ia";
    case "surveillance":
      return "surveillance";
    case "cert":
      return "nqas";
    case "noc":
      return "buildingNoc";
    case "funds":
      return "funds";
    default:
      return "sa";
  }
}

function Card({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl border border-border/60 bg-background/60 p-3",
        className,
      )}
    >
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Empty() {
  return <span className="text-sm text-muted-foreground">-</span>;
}

type MissingDoc = { key: string; label: string; blocking: boolean };

type DocSummary = {
  uploaded?: number;
  total?: number;
  /** listForFacility returns key strings; older shapes return full objects. */
  requiredMissing?: unknown;
};

export function QuickViewOverview({
  row,
  canEdit,
  settings,
  docs,
  onJump,
  onOpenDocuments,
  remarks,
  onRemarksChange,
}: {
  row: MasterRow;
  canEdit: boolean;
  settings?: Record<string, unknown> | null;
  docs?: DocSummary | null;
  onJump: (section: string) => void;
  onOpenDocuments: (key?: string) => void;
  remarks: string;
  onRemarksChange: (value: string) => void;
}) {
  const today = todayIso();
  const sa = row.sa ?? {};
  const nq = row.nqas ?? {};
  const f = row.facility;
  const next = nextDueOf(row);
  const uploaded = docs?.uploaded ?? row.docs?.uploaded ?? 0;
  const total = docs?.total ?? row.docs?.total ?? 6;
  const rawMissing = Array.isArray(docs?.requiredMissing)
    ? docs?.requiredMissing
    : row.docs?.requiredMissing ?? [];
  const missing: MissingDoc[] = (rawMissing as unknown[])
    .map((m) =>
      typeof m === "string"
        ? { key: m, label: DOCUMENT_SHORT_LABEL[m as never] ?? m, blocking: false }
        : (m as MissingDoc),
    )
    .filter((m): m is MissingDoc => !!m && typeof m.key === "string");
  const fullPhones =
    canEdit ||
    (settings as { assessorPhoneVisibility?: string } | undefined)
      ?.assessorPhoneVisibility === "everyone";

  const dates: { label: string; iso?: string | null; jump?: string }[] = [
    { label: "State assessment", iso: sa.actualStartDate ?? sa.scheduledDate, jump: "sa" },
    { label: "NQAS assessment", iso: nq?.actualStartDate ?? nq?.scheduledStartDate, jump: "nqas" },
    { label: "Result", iso: nq?.certificationDate ?? nq?.goiLetterDate, jump: "nqas" },
    { label: "Valid till", iso: nq?.validityDate, jump: "nqas" },
    {
      label: "Surveillance",
      iso: nq?.surveillanceDue1 ?? nq?.surveillanceDue2,
      jump: "surveillance",
    },
  ];

  const iaRows = (row.iaq?.rows ?? []) as {
    fy?: string;
    quarter?: number;
    nqasIaScore?: number | null;
    kayakalpIaScore?: number | null;
  }[];
  const iaLatest = iaRows[iaRows.length - 1];
  const iaPrevious = iaRows[iaRows.length - 2];
  const iaChange =
    iaLatest?.nqasIaScore != null && iaPrevious?.nqasIaScore != null
      ? iaLatest.nqasIaScore - iaPrevious.nqasIaScore
      : null;
  const spark = iaRows.slice(-6).map((r) => r.nqasIaScore ?? null);

  const assessors = [
    {
      name: sa.assessor1Name ?? "",
      designation: sa.assessor1Designation ?? "",
      phone: sa.assessor1Phone ?? "",
    },
    {
      name: sa.assessor2Name ?? "",
      designation: sa.assessor2Designation ?? "",
      phone: sa.assessor2Phone ?? "",
    },
  ].filter((a) => a.name);

  const attention: { label: string; fix: () => void }[] = [];
  for (const m of missing.slice(0, 2)) {
    attention.push({
      label: `Missing ${m.label ?? DOCUMENT_SHORT_LABEL[m.key as never] ?? m.key}`,
      fix: () => onOpenDocuments(m.key),
    });
  }
  if (next && daysUntil(next.iso, new Date()) != null && (daysUntil(next.iso, new Date()) as number) < 0) {
    attention.push({
      label: `${next.label} overdue (${toDdMmmYyyy(next.iso)})`,
      fix: () => onJump(sectionForKind(next.kind)),
    });
  }
  if (!sa.status || sa.status === "Not Yet Initiated") {
    attention.push({
      label: "State assessment not scheduled",
      fix: () => onJump("sa"),
    });
  }

  const copy = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success("Contact number copied");
    } catch {
      toast.error("Could not copy the number");
    }
  };

  const ring = total > 0 ? Math.round((uploaded / total) * 100) : 0;

  return (
    <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
      {/* 1 — Status + one next action */}
      <Card title="Status & next action" icon={<Sparkles className="size-3.5" />}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {f.currentStatus || "Not started"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {cycleLabel(row.cycleNumber == null ? null : { cycleNumber: row.cycleNumber, cycleType: row.cycleType ?? null })}
          </span>
        </div>
        {next ? (
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{next.label}</p>
              <p className="text-[11px] text-muted-foreground">{toDdMmmYyyy(next.iso)}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 shrink-0 text-[11px]"
              onClick={() => onJump(sectionForKind(next.kind))}
            >
              Open <ChevronRight className="ml-1 size-3" />
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Nothing due</p>
        )}
      </Card>

      {/* 2 — Key dates */}
      <Card title="Key dates" icon={<CalendarClock className="size-3.5" />}>
        <ul className="space-y-1">
          {dates.map((d) => {
            const done = !!d.iso && d.iso <= today;
            const days = d.iso ? daysUntil(d.iso, new Date()) : null;
            return (
              <li key={d.label}>
                <button
                  type="button"
                  onClick={() => onJump(d.jump ?? "sa")}
                  className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-muted/60"
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      !d.iso ? "bg-muted-foreground/30" : done ? "bg-emerald-500" : "bg-amber-500",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{d.label}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {d.iso ? toDdMmmYyyy(d.iso) : "-"}
                  </span>
                  {d.label === "Valid till" && d.iso && days != null && days >= 0 && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200">
                      {days}d
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* 3 — Scores */}
      <Card title="Scores" icon={<Check className="size-3.5" />}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">SA score</p>
            <p className="text-lg font-semibold tabular-nums">
              {sa.scorePercent != null ? formatPercent(sa.scorePercent) : "-"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">NQAS score</p>
            <p className="text-lg font-semibold tabular-nums">
              {nq?.scorePercent != null ? formatPercent(nq.scorePercent) : "-"}
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <div className="flex h-7 flex-1 items-end gap-0.5" aria-hidden>
            {spark.length === 0
              ? <span className="text-[11px] text-muted-foreground">No IA quarters</span>
              : spark.map((v, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-sm bg-teal-500/70"
                    style={{ height: `${Math.max(8, (v ?? 0) * 0.28)}%` }}
                  />
                ))}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">
              {iaLatest?.nqasIaScore != null ? formatPercent(iaLatest.nqasIaScore) : "-"}
            </p>
            {iaChange != null && (
              <p className={cn("text-[11px] font-medium", iaChange >= 0 ? "text-emerald-700" : "text-rose-700")}>
                {iaChange >= 0 ? "+" : ""}
                {iaChange.toFixed(1)}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* 4 — Contacts */}
      <Card title="Assessors" icon={<UserRound className="size-3.5" />}>
        {assessors.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-2">
            {assessors.map((a) => {
              const shown = a.phone ? phoneForViewer(a.phone, fullPhones) : "";
              const tel = fullPhones ? telHref(a.phone) : null;
              return (
                <li key={a.name} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {a.designation || "-"}
                    </p>
                    {shown && <p className="text-[11px] tabular-nums">{shown}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {tel && (
                      <Button asChild size="icon" variant="ghost" className="size-7">
                        <a href={tel} aria-label={`Call ${a.name}`}>
                          <Phone className="size-3.5" />
                        </a>
                      </Button>
                    )}
                    {fullPhones && a.phone && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => void copy(a.phone)}
                        aria-label={`Copy ${a.name}'s number`}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* 5 — Documents ring */}
      <Card title="Documents" icon={<Check className="size-3.5" />}>
        <div className="flex items-center gap-3">
          <div
            className="relative grid size-12 shrink-0 place-items-center rounded-full"
            style={{
              background: `conic-gradient(var(--primary) ${ring}%, var(--muted) ${ring}% 100%)`,
            }}
            role="img"
            aria-label={`${uploaded} of ${total} documents uploaded`}
          >
            <span className="grid size-9 place-items-center rounded-full bg-background text-[11px] font-bold tabular-nums">
              {uploaded}/{total}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            {missing.length === 0 ? (
              <p className="text-sm text-muted-foreground">All required documents uploaded</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {missing.slice(0, 4).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => onOpenDocuments(m.key)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      m.blocking
                        ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100"
                        : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {DOCUMENT_SHORT_LABEL[m.key as never] ?? m.label ?? m.key}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 6 — Needs attention (hidden when none) */}
      {attention.length > 0 && (
        <Card
          title="Needs attention"
          icon={<AlertTriangle className="size-3.5" />}
          className="border-amber-200/70 bg-amber-50/40 dark:border-amber-400/30 dark:bg-amber-500/10"
        >
          <ul className="space-y-1.5">
            {attention.slice(0, 3).map((a) => (
              <li key={a.label} className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 text-sm">{a.label}</span>
                <Button size="sm" variant="outline" className="h-7 shrink-0 text-[11px]" onClick={a.fix}>
                  Fix
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 7 — Details */}
      <Card title="Details" icon={<Sparkles className="size-3.5" />} className="sm:col-span-2 xl:col-span-1">
        <dl className="space-y-1.5 text-sm">
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-[11px] uppercase text-muted-foreground">SaQsham name</dt>
            <dd className="min-w-0 flex-1 truncate">{f.saqshamCategory || "-"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-[11px] uppercase text-muted-foreground">Application</dt>
            <dd className="min-w-0 flex-1 truncate">{f.saqshamApplicationNo || "-"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-[11px] uppercase text-muted-foreground">Remarks</dt>
            <dd className="min-w-0 flex-1">
              {canEdit ? (
                <textarea
                  value={remarks}
                  onChange={(e) => onRemarksChange(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="-"
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  aria-label="Remarks"
                />
              ) : (
                <span className="block whitespace-pre-wrap break-words">{remarks || "-"}</span>
              )}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
