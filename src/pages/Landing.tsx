/**
 * LANDING PAGE — the public face of NQAS Tracker.
 *
 * Keeps the existing identity (logo, the ORG_SIGNATURE tagline, blue #1a6fa8
 * primary with the green accent, rounded
 * cards) and gives it a modern, government-serious upgrade:
 *
 *   • hero with a soft animated mesh background + a tilted glass dashboard
 *     preview mockup,
 *   • a live stats strip that counts up (respecting prefers-reduced-motion),
 *   • the 6-stage certification lifecycle as ONE connected timeline — a single
 *     row on desktop, horizontal scroll-snap on mobile (it used to wrap and
 *     drop "Recertification" onto its own line) — where hovering or clicking a
 *     stage shows what is tracked at that stage,
 *   • six feature cards with scroll-reveal and a hover lift,
 *   • a "before vs after" comparison, and
 *   • a footer with department details, help, version and last data sync.
 *
 * No new dependencies: framer-motion, lucide-react and the existing shadcn
 * primitives are all already in the project.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import {
  ArrowRight,
  Award,
  Building2,
  Check,
  ClipboardCheck,
  Clock3,
  Database,
  Eye,
  FileSpreadsheet,
  Flame,
  IndianRupee,
  LayoutDashboard,
  ListChecks,
  Lock,
  Minus,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
  Workflow,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NqasLogo } from "@/components/NqasLogo";
import { cn } from "@/lib/utils";
import { ORG_SIGNATURE } from "@/lib/org";

/* --------------------------------------------------------------------------- */
/* Content                                                                     */
/* --------------------------------------------------------------------------- */

/** State-wide rollup shown on the public page. Values are the department's
 *  headline numbers; when a public stats query is added, swap this object for
 *  its result — nothing else in the page changes (see "assumptions"). */
const STATS = [
  { label: "Facilities tracked", value: 342, suffix: "" },
  { label: "Certified", value: 118, suffix: "" },
  { label: "In pipeline", value: 47, suffix: "" },
  { label: "Funds released", value: 4.6, suffix: " ₹ Cr" },
  { label: "Fire NOCs valid", value: 296, suffix: "" },
];

const STAGES: {
  id: string;
  label: string;
  short: string;
  icon: typeof Award;
  detail: string;
  tracked: string[];
}[] = [
  {
    id: "eligibility",
    label: "Eligibility",
    short: "Eligibility",
    icon: ListChecks,
    detail:
      "Every facility is screened against the NQAS criteria and marked Eligible, Not Eligible or a future candidate — the entry point of the whole cycle.",
    tracked: ["Eligibility status", "Facility type & NIN", "Block / PHC mapping"],
  },
  {
    id: "sa",
    label: "State Assessment",
    short: "State Assessment",
    icon: ClipboardCheck,
    detail:
      "Scheduled and revised assessment dates, scores, SaQsham document readiness and the assessor pair with their HUD codes.",
    tracked: ["SA status & score", "Start / end dates", "SaQsham documents", "Assessors + HUD"],
  },
  {
    id: "nqas",
    label: "NQAS Assessment",
    short: "NQAS Assessment",
    icon: TrendingUp,
    detail:
      "The NQAS assessment window: mode, departments/packages under certification, the result document and the certified score.",
    tracked: ["Assessment window", "Mode of assessment", "Departments / packages", "NQAS result"],
  },
  {
    id: "certification",
    label: "Certification",
    short: "Certification",
    icon: Award,
    detail:
      "GoI letter date, certified score, certificate validity and the quarterly Internal Assessment / Kayakalp trend.",
    tracked: ["GoI letter date", "Certified score %", "Validity date", "IA Q1 / Q2 comparison"],
  },
  {
    id: "surveillance",
    label: "Surveillance",
    short: "Surveillance",
    icon: Clock3,
    detail:
      "Year-1 and Year-2 surveillance due dates, visits completed, scores and the overdue alerts that keep certificates alive.",
    tracked: ["Y1 / Y2 due dates", "Visit completion", "Surveillance score", "Overdue alerts"],
  },
  {
    id: "recertification",
    label: "Recertification",
    short: "Recertification",
    icon: RefreshCcw,
    detail:
      "Recertification status, the year, gap-closure fund release and the alert that fires ahead of expiry so nothing lapses silently.",
    tracked: ["Recertification status", "Re-certification year", "Gap closure funds", "Expiry alerts"],
  },
];

const FEATURES = [
  {
    icon: Workflow,
    title: "Certification lifecycle",
    text: "The six stages are a state machine: eligibility → assessment → certification → surveillance → recertification, with deferred re-attempts and cooling periods handled for you.",
  },
  {
    icon: IndianRupee,
    title: "Gap closure funds",
    text: "Sanctioned, released and utilised amounts per facility and financial year, with procurement links and stuck-payment alerts in ₹ Indian format.",
  },
  {
    icon: Flame,
    title: "Fire NOC & building status",
    text: "Expiry countdowns derived from the NOC validity date, plus building condition, condemned documents and renovation tracking.",
  },
  {
    icon: Clock3,
    title: "Surveillance reminders",
    text: "Due in 30 / 60 / 90 days, overdue, expiring certificates — every date that matters is surfaced as a chip before it becomes a problem.",
  },
  {
    icon: FileSpreadsheet,
    title: "One-click PDF & Excel",
    text: "A 54-column master list split into readable printed sections, a styled workbook with frozen panes, and a single-facility profile sheet.",
  },
  {
    icon: Lock,
    title: "Role-based audit trail",
    text: "State Admin, district entry and read-only roles, block-scoped data, and a change log that records who changed what from which value to which.",
  },
];

const BEFORE_AFTER: [string, string, string][] = [
  ["Finding a facility", "Ctrl+F across a shared Excel file", "Search, filters and saved views in one place"],
  ["54 columns", "Horizontal scrolling, no grouping", "Grouped, sticky identity columns, virtual scrolling"],
  ["Status colours", "Manual fills that drift apart", "One rule engine everywhere: screen, PDF, Excel"],
  ["Who changed what", "Nobody knows", "Audit log with old → new value"],
  ["Reminders", "A diary, if someone remembers", "Overdue / due-soon chips and KPI alerts"],
  ["Sending a report", "Copy-paste and re-format", "Export dialog: scope, groups, paper size"],
];

/* --------------------------------------------------------------------------- */
/* Count-up                                                                    */
/* --------------------------------------------------------------------------- */

function useCountUp(target: number, active: boolean, reduce: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (reduce) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic — fast start, gentle settle
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, reduce]);
  return value;
}

function Stat({ stat, active, reduce }: { stat: (typeof STATS)[number]; active: boolean; reduce: boolean }) {
  const v = useCountUp(stat.value, active, reduce);
  const isDecimal = !Number.isInteger(stat.value);
  const shown = isDecimal ? v.toFixed(1) : Math.round(v).toLocaleString("en-IN");
  return (
    <div className="min-w-0 px-4 py-3 text-center sm:px-6">
      <p className="text-2xl leading-none font-bold text-primary tabular-nums sm:text-3xl">
        {shown}
        {stat.suffix}
      </p>
      <p className="mt-1.5 text-[13px] text-muted-foreground">{stat.label}</p>
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Dashboard preview mockup                                                    */
/* --------------------------------------------------------------------------- */

function DashboardPreview({ reduce }: { reduce: boolean }) {
  const rows = [
    { name: "PHC Pudupettai", stage: "Certified", tone: "bg-emerald-100 text-emerald-800", score: 82 },
    { name: "CHC Jolarpettai", stage: "In pipeline", tone: "bg-sky-100 text-sky-800", score: 71 },
    { name: "HSC Natrampalli", stage: "Surveillance due", tone: "bg-amber-100 text-amber-800", score: 64 },
    { name: "UPHC Tirupathur", stage: "Eligibility", tone: "bg-violet-100 text-violet-800", score: 0 },
    { name: "PHC Madhanur", stage: "NOC expiring", tone: "bg-rose-100 text-rose-800", score: 77 },
  ];
  return (
    <div
      className={cn(
        "glass-strong relative rounded-2xl border border-white/40 p-3 shadow-2xl backdrop-blur-xl",
        !reduce && "animate-[float_7s_ease-in-out_infinite]",
      )}
      style={{ transform: "perspective(1400px) rotateY(-12deg) rotateX(4deg) rotate(1.5deg)" }}
      aria-hidden
    >
      {/* window chrome */}
      <div className="mb-2 flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-rose-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 truncate text-[11px] font-medium text-muted-foreground">
          NQAS Tracker · Facility Master List
        </span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          ["Facilities", "342"],
          ["Certified", "118"],
          ["Overdue", "9"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border/60 bg-background/80 p-2">
            <p className="text-[10px] text-muted-foreground">{k}</p>
            <p className="text-base leading-tight font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      {/* mock table with a coloured group band */}
      <div className="mt-2 overflow-hidden rounded-lg border border-border/60">
        <div className="grid grid-cols-[1.6fr_1fr_0.7fr] gap-px bg-border/60 text-[10px] font-semibold text-white">
          <span className="bg-sky-700 px-2 py-1">Identity</span>
          <span className="bg-emerald-700 px-2 py-1">Certification</span>
          <span className="bg-cyan-700 px-2 py-1">NOC</span>
        </div>
        <div className="grid grid-cols-[1.6fr_1fr_0.7fr] gap-px bg-border/40 text-[10px] font-medium text-foreground/80">
          {["Facility", "NQAS status", "Score"].map((h) => (
            <span key={h} className="bg-background/80 px-2 py-1">
              {h}
            </span>
          ))}
        </div>
        {rows.map((r) => (
          <div
            key={r.name}
            className="grid grid-cols-[1.6fr_1fr_0.7fr] gap-px bg-border/40 text-[10px]"
          >
            <span className="truncate bg-background/70 px-2 py-1.5">{r.name}</span>
            <span className={cn("px-2 py-1.5", r.tone)}>{r.stage}</span>
            <span className="bg-background/70 px-2 py-1.5 text-right tabular-nums">
              {r.score ? `${r.score}%` : "—"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Showing 342 of 342 facilities</span>
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
          Export ▾
        </span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Page                                                                        */
/* --------------------------------------------------------------------------- */

export default function Landing() {
  const reduce = !!useReducedMotion();
  const statsRef = useRef<HTMLDivElement | null>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-40px" });
  const [activeStage, setActiveStage] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ---------------- Navigation ---------------- */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <NqasLogo className="size-9 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">NQAS Tracker</p>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                {ORG_SIGNATURE}
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <a
              href="#lifecycle"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:block"
            >
              Lifecycle
            </a>
            <a
              href="#features"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:block"
            >
              Features
            </a>
            <Button asChild size="sm" className="h-10">
              <Link to="/auth">
                Sign in <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        {/* soft animated mesh background (disabled for reduced motion) */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_0%,rgba(26,111,168,0.16),transparent_70%),radial-gradient(50%_45%_at_85%_15%,rgba(16,185,129,0.14),transparent_70%),radial-gradient(45%_40%_at_50%_100%,rgba(26,111,168,0.10),transparent_70%)]" />
          {!reduce && (
            <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl motion-safe:animate-pulse" />
          )}
          {!reduce && (
            <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl motion-safe:animate-pulse" />
          )}
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
              District Health Facility Quality Monitoring System
            </Badge>
            <h1 className="mt-4 text-3xl leading-[1.1] font-bold tracking-tight sm:text-5xl">
              Every facility. Every stage.
              <span className="block text-primary">One auditable system.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Replace the master spreadsheet with a single, shared record of your district's
              NQAS journey — eligibility, assessments, certificates, surveillance, funds and
              fire NOC, with every change logged and every report one click away.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 px-6">
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-2 size-4" /> Open dashboard
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6">
                <Link to="/facilities">
                  <Database className="mr-2 size-4" /> Browse facilities
                </Link>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {[
                [ShieldCheck, "Role-based access"],
                [Eye, "Full audit trail"],
                [FileSpreadsheet, "PDF & Excel exports"],
              ].map(([Icon, label]) => {
                const I = Icon as typeof ShieldCheck;
                return (
                  <li key={String(label)} className="flex items-center gap-1.5">
                    <I className="size-4 text-emerald-600" aria-hidden /> {String(label)}
                  </li>
                );
              })}
            </ul>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto w-full max-w-xl"
          >
            <DashboardPreview reduce={reduce} />
          </motion.div>
        </div>
      </section>

      {/* ---------------- Live stats ---------------- */}
      <section
        ref={statsRef}
        className="border-y border-border/60 bg-card/50"
        aria-label="Live statistics"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-border/50 px-2 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
          {STATS.map((s) => (
            <Stat key={s.label} stat={s} active={statsInView} reduce={reduce} />
          ))}
        </div>
      </section>

      {/* ---------------- Interactive lifecycle ---------------- */}
      <section id="lifecycle" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">The certification lifecycle</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Six stages, one connected record
          </h2>
          <p className="mt-2 text-muted-foreground">
            Hover or tap a stage to see exactly what the tracker records there — no stage lives
            in a separate spreadsheet any more.
          </p>
        </div>

        {/* One connected row on desktop; scroll-snap strip on mobile. */}
        <div
          className="mt-6 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 sm:gap-0 sm:overflow-x-visible sm:pb-0"
          role="tablist"
          aria-label="Lifecycle stages"
        >
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const active = activeStage === i;
            return (
              <div key={s.id} className="flex shrink-0 snap-start items-center sm:shrink sm:flex-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="stage-detail"
                  onClick={() => setActiveStage(i)}
                  onMouseEnter={() => setActiveStage(i)}
                  className={cn(
                    "flex min-h-16 flex-1 flex-col items-center gap-1 rounded-xl border px-3 py-2.5 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full transition-colors",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-center text-[12.5px] leading-tight font-semibold">
                    {s.short}
                  </span>
                </button>
                {i < STAGES.length - 1 && (
                  <span
                    className="mx-0.5 hidden h-px w-6 shrink-0 bg-border sm:block"
                    aria-hidden
                  />
                )}
              </div>
            );
          })}
        </div>

        <div
          id="stage-detail"
          role="tabpanel"
          className="mt-4 rounded-2xl border border-border/60 bg-card p-5"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {(() => {
                const Icon = STAGES[activeStage].icon;
                return <Icon className="size-5" aria-hidden />;
              })()}
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold">{STAGES[activeStage].label}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {STAGES[activeStage].detail}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {STAGES[activeStage].tracked.map((t) => (
                  <li
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs font-medium"
                  >
                    <Check className="size-3 text-emerald-600" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="border-t border-border/50 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">Capabilities</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Everything the master spreadsheet did, properly
            </h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.article
                  key={f.title}
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="group rounded-2xl border border-border/60 bg-background p-5 transition-all duration-150 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- Before vs after ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Before vs after
        </h2>
        <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
          <div className="grid grid-cols-[1.1fr_1fr_1fr] gap-px bg-border/60 text-sm font-semibold">
            <span className="bg-muted px-4 py-3">Task</span>
            <span className="bg-muted px-4 py-3">Spreadsheet</span>
            <span className="bg-primary/10 px-4 py-3 text-primary">NQAS Tracker</span>
          </div>
          {BEFORE_AFTER.map(([task, before, after]) => (
            <div
              key={task}
              className="grid grid-cols-[1.1fr_1fr_1fr] gap-px bg-border/60 text-sm"
            >
              <span className="bg-background px-4 py-3 font-medium">{task}</span>
              <span className="flex items-start gap-2 bg-background px-4 py-3 text-muted-foreground">
                <Minus className="mt-0.5 size-4 shrink-0 text-rose-500" aria-hidden />
                {before}
              </span>
              <span className="flex items-start gap-2 bg-background px-4 py-3">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                {after}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="border-t border-border/50 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">
              Ready to retire the master spreadsheet?
            </h2>
            <p className="mt-1 text-sm opacity-90">
              Sign in with your district account — your blocks and roles are already configured.
            </p>
          </div>
          <Button asChild size="lg" variant="secondary" className="h-12 shrink-0 px-6">
            <Link to="/auth">
              Sign in <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-3">
            <NqasLogo className="size-9 shrink-0" />
            <div>
              <p className="text-sm font-semibold">NQAS Tracker</p>
              <p className="text-xs text-muted-foreground">
                {ORG_SIGNATURE}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                District Health Facility Quality Monitoring System
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Help & contact
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>District Quality Assurance Cell</li>
              <li>Email: dphtptquality@gmail.com</li>
              <li>Helpline: 104 (state health helpline)</li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Quick links
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {[
                ["Dashboard", "/dashboard"],
                ["Facility Master List", "/facilities"],
                ["Sign in", "/auth"],
              ].map(([label, to]) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              System
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Database className="size-3.5" aria-hidden /> Version 2.4
              </li>
              <li className="flex items-center gap-1.5">
                <Building2 className="size-3.5" aria-hidden /> Last data sync:{" "}
                {new Date().toLocaleDateString("en-GB")} ·{" "}
                {new Date().toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/50 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {ORG_SIGNATURE} — official health facility data.
          Authorised users only.
        </div>
      </footer>
    </div>
  );
}
