import { u as useReducedMotion, a as useInView, j as jsxRuntimeExports, m as motion } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, A as ArrowRight, d as LayoutDashboard, D as Database, S as ShieldCheck, e as Eye, F as FileSpreadsheet, f as ListChecks, h as ClipboardCheck, i as TrendingUp, j as Award, k as Clock3, l as RefreshCcw, m as Check, W as Workflow, n as IndianRupee, o as Flame, p as Lock, q as Minus, B as Building2 } from './icons-BxQpodNr.js';
import { B as Button, L as Link, c as cn } from './index-CBV6wOh8.js';
import { B as Badge } from './badge-Cc2gQHFR.js';
import { N as NqasLogo } from './NqasLogo-CIWlMexW.js';
import { O as ORG_SIGNATURE } from './org-DjtYn14q.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';

const STATS = [
  { label: "Facilities tracked", value: 342, suffix: "" },
  { label: "Certified", value: 118, suffix: "" },
  { label: "In pipeline", value: 47, suffix: "" },
  { label: "Funds released", value: 4.6, suffix: " ₹ Cr" },
  { label: "Fire NOCs valid", value: 296, suffix: "" }
];
const STAGES = [
  {
    id: "eligibility",
    label: "Eligibility",
    short: "Eligibility",
    icon: ListChecks,
    detail: "Every facility is screened against the NQAS criteria and marked Eligible, Not Eligible or a future candidate — the entry point of the whole cycle.",
    tracked: ["Eligibility status", "Facility type & NIN", "Block / PHC mapping"]
  },
  {
    id: "sa",
    label: "State Assessment",
    short: "State Assessment",
    icon: ClipboardCheck,
    detail: "Scheduled and revised assessment dates, scores, SaQsham document readiness and the assessor pair with their HUD codes.",
    tracked: ["SA status & score", "Start / end dates", "SaQsham documents", "Assessors + HUD"]
  },
  {
    id: "nqas",
    label: "NQAS Assessment",
    short: "NQAS Assessment",
    icon: TrendingUp,
    detail: "The NQAS assessment window: mode, departments/packages under certification, the result document and the certified score.",
    tracked: ["Assessment window", "Mode of assessment", "Departments / packages", "NQAS result"]
  },
  {
    id: "certification",
    label: "Certification",
    short: "Certification",
    icon: Award,
    detail: "GoI letter date, certified score, certificate validity and the quarterly Internal Assessment / Kayakalp trend.",
    tracked: ["GoI letter date", "Certified score %", "Validity date", "IA Q1 / Q2 comparison"]
  },
  {
    id: "surveillance",
    label: "Surveillance",
    short: "Surveillance",
    icon: Clock3,
    detail: "Year-1 and Year-2 surveillance due dates, visits completed, scores and the overdue alerts that keep certificates alive.",
    tracked: ["Y1 / Y2 due dates", "Visit completion", "Surveillance score", "Overdue alerts"]
  },
  {
    id: "recertification",
    label: "Recertification",
    short: "Recertification",
    icon: RefreshCcw,
    detail: "Recertification status, the year, gap-closure fund release and the alert that fires ahead of expiry so nothing lapses silently.",
    tracked: ["Recertification status", "Re-certification year", "Gap closure funds", "Expiry alerts"]
  }
];
const FEATURES = [
  {
    icon: Workflow,
    title: "Certification lifecycle",
    text: "The six stages are a state machine: eligibility → assessment → certification → surveillance → recertification, with deferred re-attempts and cooling periods handled for you."
  },
  {
    icon: IndianRupee,
    title: "Gap closure funds",
    text: "Sanctioned, released and utilised amounts per facility and financial year, with procurement links and stuck-payment alerts in ₹ Indian format."
  },
  {
    icon: Flame,
    title: "Fire NOC & building status",
    text: "Expiry countdowns derived from the NOC validity date, plus building condition, condemned documents and renovation tracking."
  },
  {
    icon: Clock3,
    title: "Surveillance reminders",
    text: "Due in 30 / 60 / 90 days, overdue, expiring certificates — every date that matters is surfaced as a chip before it becomes a problem."
  },
  {
    icon: FileSpreadsheet,
    title: "One-click PDF & Excel",
    text: "A 54-column master list split into readable printed sections, a styled workbook with frozen panes, and a single-facility profile sheet."
  },
  {
    icon: Lock,
    title: "Role-based audit trail",
    text: "State Admin, district entry and read-only roles, block-scoped data, and a change log that records who changed what from which value to which."
  }
];
const BEFORE_AFTER = [
  ["Finding a facility", "Ctrl+F across a shared Excel file", "Search, filters and saved views in one place"],
  ["54 columns", "Horizontal scrolling, no grouping", "Grouped, sticky identity columns, virtual scrolling"],
  ["Status colours", "Manual fills that drift apart", "One rule engine everywhere: screen, PDF, Excel"],
  ["Who changed what", "Nobody knows", "Audit log with old → new value"],
  ["Reminders", "A diary, if someone remembers", "Overdue / due-soon chips and KPI alerts"],
  ["Sending a report", "Copy-paste and re-format", "Export dialog: scope, groups, paper size"]
];
function useCountUp(target, active, reduce) {
  const [value, setValue] = reactExports.useState(0);
  reactExports.useEffect(() => {
    if (!active) return;
    if (reduce) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, reduce]);
  return value;
}
function Stat({ stat, active, reduce }) {
  const v = useCountUp(stat.value, active, reduce);
  const isDecimal = !Number.isInteger(stat.value);
  const shown = isDecimal ? v.toFixed(1) : Math.round(v).toLocaleString("en-IN");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 px-4 py-3 text-center sm:px-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-2xl leading-none font-bold text-primary tabular-nums sm:text-3xl", children: [
      shown,
      stat.suffix
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1.5 text-[13px] text-muted-foreground", children: stat.label })
  ] });
}
function DashboardPreview({ reduce }) {
  const rows = [
    { name: "PHC Pudupettai", stage: "Certified", tone: "bg-emerald-100 text-emerald-800", score: 82 },
    { name: "CHC Jolarpettai", stage: "In pipeline", tone: "bg-sky-100 text-sky-800", score: 71 },
    { name: "HSC Natrampalli", stage: "Surveillance due", tone: "bg-amber-100 text-amber-800", score: 64 },
    { name: "UPHC Tirupathur", stage: "Eligibility", tone: "bg-violet-100 text-violet-800", score: 0 },
    { name: "PHC Madhanur", stage: "NOC expiring", tone: "bg-rose-100 text-rose-800", score: 77 }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "glass-strong relative rounded-2xl border border-white/40 p-3 shadow-2xl backdrop-blur-xl",
        !reduce && "animate-[float_7s_ease-in-out_infinite]"
      ),
      style: { transform: "perspective(1400px) rotateY(-12deg) rotateX(4deg) rotate(1.5deg)" },
      "aria-hidden": true,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2.5 rounded-full bg-rose-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2.5 rounded-full bg-amber-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2.5 rounded-full bg-emerald-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 truncate text-[11px] font-medium text-muted-foreground", children: "NQAS Tracker · Facility Master List" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-1.5", children: [
          ["Facilities", "342"],
          ["Certified", "118"],
          ["Overdue", "9"]
        ].map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 bg-background/80 p-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground", children: k }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-base leading-tight font-bold tabular-nums", children: v })
        ] }, k)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 overflow-hidden rounded-lg border border-border/60", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[1.6fr_1fr_0.7fr] gap-px bg-border/60 text-[10px] font-semibold text-white", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-sky-700 px-2 py-1", children: "Identity" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-emerald-700 px-2 py-1", children: "Certification" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-cyan-700 px-2 py-1", children: "NOC" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-[1.6fr_1fr_0.7fr] gap-px bg-border/40 text-[10px] font-medium text-foreground/80", children: ["Facility", "NQAS status", "Score"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-background/80 px-2 py-1", children: h }, h)) }),
          rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "grid grid-cols-[1.6fr_1fr_0.7fr] gap-px bg-border/40 text-[10px]",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate bg-background/70 px-2 py-1.5", children: r.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("px-2 py-1.5", r.tone), children: r.stage }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-background/70 px-2 py-1.5 text-right tabular-nums", children: r.score ? `${r.score}%` : "—" })
              ]
            },
            r.name
          ))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center justify-between text-[10px] text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Showing 342 of 342 facilities" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-md bg-primary/10 px-1.5 py-0.5 font-semibold text-primary", children: "Export ▾" })
        ] })
      ]
    }
  );
}
function Landing() {
  const reduce = !!useReducedMotion();
  const statsRef = reactExports.useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-40px" });
  const [activeStage, setActiveStage] = reactExports.useState(0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background text-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(NqasLogo, { className: "size-9 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm font-semibold sm:text-base", children: "NQAS Tracker" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-[11px] text-muted-foreground sm:text-xs", children: ORG_SIGNATURE })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: "#lifecycle",
            className: "hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:block",
            children: "Lifecycle"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: "#features",
            className: "hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:block",
            children: "Features"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, size: "sm", className: "h-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/auth", children: [
          "Sign in ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "ml-1.5 size-4" })
        ] }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "relative overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pointer-events-none absolute inset-0", "aria-hidden": true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_0%,rgba(26,111,168,0.16),transparent_70%),radial-gradient(50%_45%_at_85%_15%,rgba(16,185,129,0.14),transparent_70%),radial-gradient(45%_40%_at_50%_100%,rgba(26,111,168,0.10),transparent_70%)]" }),
        !reduce && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl motion-safe:animate-pulse" }),
        !reduce && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute right-0 bottom-0 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl motion-safe:animate-pulse" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          motion.div,
          {
            initial: reduce ? false : { opacity: 0, y: 18 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5 },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "border-primary/40 bg-primary/5 text-primary", children: "District Health Facility Quality Monitoring System" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "mt-4 text-3xl leading-[1.1] font-bold tracking-tight sm:text-5xl", children: [
                "Every facility. Every stage.",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-primary", children: "One auditable system." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg", children: "Replace the master spreadsheet with a single, shared record of your district's NQAS journey — eligibility, assessments, certificates, surveillance, funds and fire NOC, with every change logged and every report one click away." }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex flex-wrap gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, size: "lg", className: "h-12 px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/dashboard", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutDashboard, { className: "mr-2 size-4" }),
                  " Open dashboard"
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, size: "lg", variant: "outline", className: "h-12 px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/facilities", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "mr-2 size-4" }),
                  " Browse facilities"
                ] }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground", children: [
                [ShieldCheck, "Role-based access"],
                [Eye, "Full audit trail"],
                [FileSpreadsheet, "PDF & Excel exports"]
              ].map(([Icon, label]) => {
                const I = Icon;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(I, { className: "size-4 text-emerald-600", "aria-hidden": true }),
                  " ",
                  String(label)
                ] }, String(label));
              }) })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          motion.div,
          {
            initial: reduce ? false : { opacity: 0, scale: 0.96 },
            animate: { opacity: 1, scale: 1 },
            transition: { duration: 0.6, delay: 0.1 },
            className: "mx-auto w-full max-w-xl",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardPreview, { reduce })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "section",
      {
        ref: statsRef,
        className: "border-y border-border/60 bg-card/50",
        "aria-label": "Live statistics",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-border/50 px-2 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0", children: STATS.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { stat: s, active: statsInView, reduce }, s.label)) })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: "lifecycle", className: "mx-auto max-w-6xl px-4 py-14 sm:py-20", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-primary", children: "The certification lifecycle" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-1 text-2xl font-bold tracking-tight sm:text-3xl", children: "Six stages, one connected record" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-muted-foreground", children: "Hover or tap a stage to see exactly what the tracker records there — no stage lives in a separate spreadsheet any more." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "mt-6 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 sm:gap-0 sm:overflow-x-visible sm:pb-0",
          role: "tablist",
          "aria-label": "Lifecycle stages",
          children: STAGES.map((s, i) => {
            const Icon = s.icon;
            const active = activeStage === i;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 snap-start items-center sm:shrink sm:flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  role: "tab",
                  "aria-selected": active,
                  "aria-controls": "stage-detail",
                  onClick: () => setActiveStage(i),
                  onMouseEnter: () => setActiveStage(i),
                  className: cn(
                    "flex min-h-16 flex-1 flex-col items-center gap-1 rounded-xl border px-3 py-2.5 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active ? "border-primary bg-primary/10 shadow-sm" : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted/50"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: cn(
                          "flex size-8 items-center justify-center rounded-full transition-colors",
                          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        ),
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-4", "aria-hidden": true })
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-center text-[12.5px] leading-tight font-semibold", children: s.short })
                  ]
                }
              ),
              i < STAGES.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "mx-0.5 hidden h-px w-6 shrink-0 bg-border sm:block",
                  "aria-hidden": true
                }
              )
            ] }, s.id);
          })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          id: "stage-detail",
          role: "tabpanel",
          className: "mt-4 rounded-2xl border border-border/60 bg-card p-5",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary", children: (() => {
              const Icon = STAGES[activeStage].icon;
              return /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-5", "aria-hidden": true });
            })() }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold", children: STAGES[activeStage].label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm leading-relaxed text-muted-foreground", children: STAGES[activeStage].detail }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 flex flex-wrap gap-2", children: STAGES[activeStage].tracked.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "li",
                {
                  className: "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs font-medium",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3 text-emerald-600", "aria-hidden": true }),
                    t
                  ]
                },
                t
              )) })
            ] })
          ] })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("section", { id: "features", className: "border-t border-border/50 bg-muted/20", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-6xl px-4 py-14 sm:py-20", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-primary", children: "Capabilities" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-1 text-2xl font-bold tracking-tight sm:text-3xl", children: "Everything the master spreadsheet did, properly" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: FEATURES.map((f, i) => {
        const Icon = f.icon;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          motion.article,
          {
            initial: reduce ? false : { opacity: 0, y: 16 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, margin: "-60px" },
            transition: { duration: 0.4, delay: i * 0.05 },
            className: "group rounded-2xl border border-border/60 bg-background p-5 transition-all duration-150 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-5", "aria-hidden": true }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-3 text-base font-semibold", children: f.title }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1.5 text-sm leading-relaxed text-muted-foreground", children: f.text })
            ]
          },
          f.title
        );
      }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mx-auto max-w-6xl px-4 py-14 sm:py-20", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold tracking-tight sm:text-3xl", children: "Before vs after" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 overflow-hidden rounded-2xl border border-border/60", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[1.1fr_1fr_1fr] gap-px bg-border/60 text-sm font-semibold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-muted px-4 py-3", children: "Task" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-muted px-4 py-3", children: "Spreadsheet" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-primary/10 px-4 py-3 text-primary", children: "NQAS Tracker" })
        ] }),
        BEFORE_AFTER.map(([task, before, after]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "grid grid-cols-[1.1fr_1fr_1fr] gap-px bg-border/60 text-sm",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-background px-4 py-3 font-medium", children: task }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-start gap-2 bg-background px-4 py-3 text-muted-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Minus, { className: "mt-0.5 size-4 shrink-0 text-rose-500", "aria-hidden": true }),
                before
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-start gap-2 bg-background px-4 py-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mt-0.5 size-4 shrink-0 text-emerald-600", "aria-hidden": true }),
                after
              ] })
            ]
          },
          task
        ))
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "border-t border-border/50 bg-primary text-primary-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold sm:text-2xl", children: "Ready to retire the master spreadsheet?" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm opacity-90", children: "Sign in with your district account — your blocks and roles are already configured." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, size: "lg", variant: "secondary", className: "h-12 shrink-0 px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/auth", children: [
        "Sign in ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "ml-2 size-4" })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "border-t border-border/60 bg-background", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(NqasLogo, { className: "size-9 shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold", children: "NQAS Tracker" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: ORG_SIGNATURE }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "District Health Facility Quality Monitoring System" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Help & contact" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "mt-2 space-y-1 text-sm text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "District Quality Assurance Cell" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Email: dphtptquality@gmail.com" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Helpline: 104 (state health helpline)" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Quick links" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 space-y-1 text-sm", children: [
            ["Dashboard", "/dashboard"],
            ["Facility Master List", "/facilities"],
            ["Sign in", "/auth"]
          ].map(([label, to]) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Link,
            {
              to,
              className: "text-muted-foreground transition-colors hover:text-foreground",
              children: label
            }
          ) }, label)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "System" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "mt-2 space-y-1 text-sm text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "size-3.5", "aria-hidden": true }),
              " Version 2.4"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "size-3.5", "aria-hidden": true }),
              " Last data sync:",
              " ",
              (/* @__PURE__ */ new Date()).toLocaleDateString("en-GB"),
              " ·",
              " ",
              (/* @__PURE__ */ new Date()).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit"
              })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border/50 py-4 text-center text-xs text-muted-foreground", children: [
        "© ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " ",
        ORG_SIGNATURE,
        " — official health facility data. Authorised users only."
      ] })
    ] })
  ] });
}

export { Landing as default };
