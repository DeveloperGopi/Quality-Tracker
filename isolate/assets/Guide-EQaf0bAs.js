import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, a6 as Sparkles, m as Check, H as ChevronDown, Q as Search, a2 as Download, E as ExternalLink, aT as MousePointerClick, f as ListChecks, ax as Save, C as CircleCheck, A as ArrowRight, bG as Clipboard, u as FileText, aq as Copy } from './icons-BxQpodNr.js';
import { u as useAuth, b as useNavigate, d as useSearchParams, l as useQuery, j as api, c as cn, L as Link, B as Button, m as useMutation } from './index-CBV6wOh8.js';
import { bp as HOW_TOS, bq as GUIDE_ARTICLES, b4 as sidebarLabel, br as customGuideStub, bs as GLOSSARY, bt as FIRST_15, M as MASTER_COLUMNS, bu as requestGuideSpotlight, A as AppShell, bv as GUIDE_GROUPS } from './AppShell-CP099uvN.js';
import { I as Input } from './input-Cy2oZLur.js';
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { registerDeckFonts } from './pdfFonts-DsWGLT77.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';

const two = (n) => String(n).padStart(2, "0");
async function downloadGuidePdf(articles, title, district, titleOf) {
  const { jsPDF } = await __vitePreload(async () => { const { jsPDF } = await import('./vendor-jspdf-BarNdCns.js').then(n => n.j);return { jsPDF }},true              ?[]:void 0);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fonts = await registerDeckFonts(doc);
  const family = fonts.family;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const width = pageW - margin * 2;
  let y = 18;
  const setFont = (style, size) => {
    doc.setFont(family, style);
    doc.setFontSize(size);
  };
  const newPage = () => {
    doc.addPage();
    y = 18;
  };
  const need = (h) => {
    if (y + h > pageH - 14) newPage();
  };
  const write = (text, size = 10, style = "normal", gap = 2) => {
    setFont(style, size);
    const lines = doc.splitTextToSize(text, width);
    for (const line of lines) {
      need(gap + 5);
      doc.text(line, margin, y);
      y += gap + 4;
    }
  };
  const heading = (text) => {
    need(14);
    y += 3;
    write(text, 14, "bold", 2.8);
  };
  const now = /* @__PURE__ */ new Date();
  const date = `${two(now.getDate())}-${two(now.getMonth() + 1)}-${now.getFullYear()}`;
  const fileName = `${district} Admin Guide ${date}.pdf`.replace(/[\\/:*?"<>|]/g, "-");
  setFont("bold", 20);
  doc.text(`${district} Admin Guide`, margin, y);
  if (title && !/admin guide/i.test(title)) {
    y += 7;
    setFont("normal", 12);
    doc.text(title, margin, y);
  }
  y += 10;
  setFont("normal", 10);
  doc.setTextColor(90, 90, 90);
  doc.text(`Last verified 04-Nov-2026 · ${articles.length} article${articles.length === 1 ? "" : "s"}`, margin, y);
  y += 8;
  doc.setTextColor(20, 20, 20);
  for (const article of articles) {
    need(30);
    heading(titleOf(article));
    write(article.purpose, 11);
    write(`Who can use it: ${article.roles.join(", ")}`, 10);
    heading("Steps");
    article.steps.forEach((s, i) => write(`${i + 1}. ${s.text}`, 10.5, "normal", 1.6));
    heading("What you will see");
    article.see.forEach((s) => write(`• ${s}`, 10.5, "normal", 1.3));
    heading("Tips");
    article.tips.forEach((s) => write(`• ${s}`, 10.5, "normal", 1.3));
    heading("Common problems and fixes");
    article.problems.forEach((p) => write(`${p.problem} — ${p.fix}`, 10.5, "normal", 1.3));
    heading("Related pages");
    write(article.related.join(" · "), 10.5);
    y += 4;
    need(20);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  }
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    setFont("normal", 8);
    doc.setTextColor(130, 130, 130);
    doc.text(`${district} Admin Guide · page ${p} of ${pages}`, margin, pageH - 8);
  }
  doc.save(fileName);
}

const GROUP_LABEL = {
  start: "Start here",
  daily: "Daily work",
  reports: "Reports",
  imports: "Imports",
  admin: "Admin"
};
const STEP_ICONS = [MousePointerClick, ListChecks, Save, CircleCheck];
function hashText(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function RichText({ text, admin }) {
  const terms = GLOSSARY.map((g) => g.term).sort((a, b) => b.length - a.length);
  const lookup = new Map(GLOSSARY.map((g) => [g.term.toLowerCase(), g]));
  const pattern = new RegExp(`\\b(${terms.map(escapeRegExp).join("|")})\\b`, "gi");
  const pieces = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) pieces.push(text.slice(last, at));
    const term = match[0];
    const entry = lookup.get(term.toLowerCase());
    if (entry) {
      pieces.push(
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "abbr",
          {
            title: `${entry.meaning}${entry.confirm ? " · Confirm with the admin" : ""}`,
            "data-tip": `${entry.meaning}${entry.confirm ? " · Confirm" : ""}`,
            className: "cursor-help text-inherit decoration-slate-400 decoration-dotted underline-offset-2 [text-decoration-line:underline] [text-decoration-style:dotted]",
            children: [
              term,
              admin && entry.confirm && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-0.5 rounded border border-amber-400/60 bg-amber-50 px-1 text-[13px] font-semibold text-amber-900", children: "Confirm" })
            ]
          },
          `${at}-${term}`
        )
      );
    } else {
      pieces.push(term);
    }
    last = at + term.length;
  }
  if (last < text.length) pieces.push(text.slice(last));
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: pieces });
}
function Heading({
  id,
  children
}) {
  const [copied, setCopied] = reactExports.useState(false);
  const copy = async () => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id, className: "scroll-mt-28 text-[18px] font-bold tracking-tight text-slate-900", children }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: () => void copy(),
        "aria-label": `Copy link to ${String(children)}`,
        className: "rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900",
        children: copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-4" })
      }
    )
  ] });
}
function TaskCard({
  how,
  open,
  onToggle,
  onOpen,
  done
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "rounded-xl border bg-white p-4 transition-colors",
        open ? "border-teal-400/70 shadow-sm" : "border-slate-200 hover:border-teal-300"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: onToggle, className: "flex w-full items-start gap-3 text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4", "aria-hidden": true }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[15px] font-semibold text-slate-900", children: how.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-0.5 block text-[13px] text-slate-600", children: [
              how.steps.length,
              " short steps"
            ] })
          ] }),
          done ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "mt-1 size-5 shrink-0 text-emerald-600" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
            ChevronDown,
            {
              className: cn("mt-1 size-4 shrink-0 text-slate-500", open && "rotate-180")
            }
          )
        ] }),
        open && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 border-t border-slate-200 pt-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "space-y-2", children: how.steps.map((step, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-2 text-[14px] leading-relaxed text-slate-700", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[13px] font-bold text-teal-800", children: index + 1 }),
            step
          ] }, step)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "mt-3 h-9 gap-1.5", onClick: onOpen, children: [
            "Open it ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-4" })
          ] })
        ] })
      ]
    }
  );
}
function Feedback({
  route,
  title,
  role,
  onSaved
}) {
  const submit = useMutation(api.guideFeedback.submit);
  const [vote, setVote] = reactExports.useState(null);
  const [note, setNote] = reactExports.useState("");
  const [sent, setSent] = reactExports.useState(false);
  const send = async (helpful) => {
    setVote(helpful);
    {
      await submit({ route, articleTitle: title, role, helpful: true });
      setSent(true);
      onSaved(route, true);
    }
  };
  const sendNo = async () => {
    if (vote !== false) return;
    await submit({ route, articleTitle: title, role, helpful: false, note });
    setSent(true);
    onSaved(route, false);
  };
  if (sent) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[14px] font-medium text-emerald-800", children: "Thanks — your vote is saved." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[15px] font-semibold text-slate-900", children: "Was this helpful?" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: vote === true ? "default" : "outline",
          size: "sm",
          className: "h-9",
          onClick: () => void send(true),
          children: "Yes"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: vote === false ? "default" : "outline",
          size: "sm",
          className: "h-9",
          onClick: () => setVote(false),
          children: "No"
        }
      ),
      vote === false && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            value: note,
            onChange: (event) => setNote(event.target.value),
            placeholder: "What was missing? (optional)",
            "aria-label": "Optional note",
            className: "h-9 w-full min-w-48 flex-1 text-[14px]"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", className: "h-9", onClick: () => void sendNo(), children: "Send" })
      ] })
    ] })
  ] });
}
function GuidePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const overridesQ = useQuery(api.pages.builtinOverrides, {});
  const settingsQ = useQuery(api.facilities.getAppSettings, {});
  const rolesQ = useQuery(api.roles.list, {});
  const customQ = useQuery(api.pages.nav, {});
  const unhelpfulQ = useQuery(api.guideFeedback.unhelpful, {});
  const [search, setSearch] = reactExports.useState("");
  const [role, setRole] = reactExports.useState(user?.appRole ?? "viewer");
  const [checked, setChecked] = reactExports.useState(/* @__PURE__ */ new Set());
  const [openedHowTo, setOpenedHowTo] = reactExports.useState(HOW_TOS[0]?.id ?? null);
  const [recent, setRecent] = reactExports.useState([]);
  const [pdfBusy, setPdfBusy] = reactExports.useState(false);
  const [changed, setChanged] = reactExports.useState(false);
  const [votes, setVotes] = reactExports.useState({});
  const searchRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (user?.appRole) setRole(user.appRole);
  }, [user?.appRole]);
  reactExports.useEffect(() => {
    const onKey = (event) => {
      const target = event.target;
      if (event.key !== "/" || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const overrides = overridesQ ?? {};
  const roles = reactExports.useMemo(
    () => (rolesQ ?? []).length ? rolesQ : [
      { key: "admin", label: "State Admin" },
      { key: "dqc", label: "DQC" },
      { key: "dqmo", label: "DQMO" },
      { key: "entry", label: "Data Entry" },
      { key: "viewer", label: "Viewer" }
    ],
    [rolesQ]
  );
  const roleLabel = roles.find((r) => r.key === role)?.label ?? role;
  const district = settingsQ?.settings?.districtName || "District";
  const userId = String(user?._id ?? "guest");
  const checklistKey = `nqas.guide.checklist.${userId}`;
  const recentKey = `nqas.guide.recent.${userId}`;
  reactExports.useEffect(() => {
    try {
      const raw = localStorage.getItem(checklistKey);
      setChecked(new Set(raw ? JSON.parse(raw) : []));
    } catch {
      setChecked(/* @__PURE__ */ new Set());
    }
  }, [checklistKey]);
  reactExports.useEffect(() => {
    try {
      const raw = localStorage.getItem(recentKey);
      const list = raw ? JSON.parse(raw) : [];
      setRecent(Array.isArray(list) ? list.slice(0, 6) : []);
    } catch {
      setRecent([]);
    }
  }, [recentKey]);
  const articles = reactExports.useMemo(() => {
    const list = GUIDE_ARTICLES.map((article) => ({
      ...article,
      title: overrides[article.route]?.label?.trim() || (article.titleKey ? sidebarLabel(article.titleKey) : "") || article.fallbackTitle
    }));
    for (const page of customQ ?? []) {
      const route = `/p/${page.slug}`;
      if (list.some((article) => article.route === route)) continue;
      const stub = customGuideStub(page.name);
      list.push({ ...stub, route, title: page.name });
    }
    return list;
  }, [customQ, overrides]);
  const currentRoute = params.get("article") ?? "/guide";
  const current = articles.find((article) => article.route === currentRoute) ?? articles.find((article) => article.route === "/guide") ?? articles[0];
  const isHome = currentRoute === "/guide";
  reactExports.useEffect(() => {
    if (isHome) return;
    setRecent((prev) => {
      if (prev[0] === currentRoute) return prev;
      const next = [currentRoute, ...prev.filter((route) => route !== currentRoute)].slice(0, 6);
      try {
        localStorage.setItem(recentKey, JSON.stringify(next));
      } catch {
      }
      return next;
    });
  }, [currentRoute, isHome, recentKey]);
  const titleOf = (article) => "title" in article && typeof article.title === "string" ? article.title : overrides[article.route]?.label?.trim() || (article.titleKey ? sidebarLabel(article.titleKey) : "") || article.fallbackTitle;
  const openArticle = (route) => {
    setSearch("");
    setParams({ article: route });
    if (route !== "/guide") {
      setRecent((prev) => {
        const next = [route, ...prev.filter((r) => r !== route)].slice(0, 6);
        try {
          localStorage.setItem(recentKey, JSON.stringify(next));
        } catch {
        }
        return next;
      });
    }
  };
  const q = search.trim().toLowerCase();
  const results = reactExports.useMemo(() => {
    if (!q) return [];
    return articles.filter((article) => {
      const hay = [
        titleOf(article),
        article.purpose,
        ...article.steps.map((step) => step.text),
        ...article.tips,
        ...article.see,
        ...article.problems.flatMap((p) => [p.problem, p.fix])
      ].join(" ").toLowerCase();
      return hay.includes(q);
    }).slice(0, 24);
  }, [articles, q, overrides]);
  const howResults = reactExports.useMemo(
    () => HOW_TOS.filter((how) => !how.roles || how.roles.includes(role)).filter(
      (how) => !q || `${how.title} ${how.steps.join(" ")}`.toLowerCase().includes(q)
    ),
    [q, role]
  );
  const glossaryResults = reactExports.useMemo(
    () => !q ? GLOSSARY : GLOSSARY.filter((g) => `${g.term} ${g.meaning}`.toLowerCase().includes(q)),
    [q]
  );
  const steps = current.steps.filter(
    (step) => (step.roles ?? current.roles).includes(role)
  );
  const hiddenSteps = current.steps.length - steps.length;
  const doneCount = FIRST_15.filter((item) => checked.has(item.id)).length;
  const admin = user?.appRole === "admin";
  const toggleCheck = (id) => {
    setChecked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(checklistKey, JSON.stringify([...next]));
      } catch {
      }
      return next;
    });
  };
  const pageHash = reactExports.useMemo(() => {
    const headerOverrides = settingsQ?.settings.tableHeaderOverrides ?? {};
    return hashText(
      JSON.stringify({
        route: current.route,
        label: titleOf(current),
        overrides: overrides[current.route] ?? null,
        columns: MASTER_COLUMNS.map((column) => [
          column.key,
          headerOverrides[column.label] ?? column.label
        ])
      })
    );
  }, [current, overrides, settingsQ, titleOf]);
  reactExports.useEffect(() => {
    if (!admin || isHome || settingsQ === void 0 || overridesQ === void 0) return;
    const key = `nqas.guide.hash.${current.route}`;
    try {
      const previous = localStorage.getItem(key);
      if (previous && previous !== pageHash) setChanged(true);
      else {
        setChanged(false);
        localStorage.setItem(key, pageHash);
      }
    } catch {
    }
  }, [admin, current.route, isHome, pageHash, settingsQ, overridesQ]);
  const download = async (single) => {
    setPdfBusy(true);
    try {
      await downloadGuidePdf(
        single ? [single] : articles,
        single ? titleOf(single) : "Admin Guide",
        district,
        titleOf
      );
    } finally {
      setPdfBusy(false);
    }
  };
  const openStep = (step, route) => {
    requestGuideSpotlight(
      step.target ?? "[data-guide-target], main h1",
      step.text
    );
    navigate(route);
  };
  const homeChecklist = /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: "checklist", className: "scroll-mt-28 rounded-xl border border-slate-200 bg-white p-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-4 text-teal-700" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-[18px] font-bold text-slate-900", children: "Your checklist" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[13px] text-slate-600", children: [
        "First 15 minutes · ",
        doneCount,
        " of ",
        FIRST_15.length,
        " done"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[14px] text-slate-600", children: "Your checklist is remembered on this account." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 grid gap-2 sm:grid-cols-2", children: FIRST_15.map((item) => {
      const done = checked.has(item.id);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start gap-2 rounded-lg border border-slate-100 p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "aria-label": item.label,
            "aria-pressed": done,
            onClick: () => toggleCheck(item.id),
            className: cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
              done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"
            ),
            children: done && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("min-w-0 flex-1 text-[14px] leading-relaxed text-slate-800", done && "text-slate-600 line-through"), children: item.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: item.route, className: "text-[13px] font-semibold text-teal-800 hover:underline", children: "Open" })
      ] }, item.id);
    }) })
  ] });
  const taskCards = /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: "tasks", className: "scroll-mt-28", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-[18px] font-bold text-slate-900", children: "What do you want to do?" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[14px] text-slate-600", children: "Pick a task. Each card opens a short numbered guide." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 grid gap-2 sm:grid-cols-2", children: (q ? howResults : HOW_TOS).map((how) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      TaskCard,
      {
        how,
        open: openedHowTo === how.id,
        done: votes[how.route] === "yes",
        onToggle: () => setOpenedHowTo((cur) => cur === how.id ? null : how.id),
        onOpen: () => {
          const tab = new URLSearchParams(how.route.split("?")[1] ?? "").get("tab");
          const target = tab ? `[data-guide-target="admin-tab-${tab}"]` : "[data-guide-target], main h1";
          requestGuideSpotlight(target, how.steps[0] ?? how.title);
          navigate(how.route);
        }
      },
      how.id
    )) })
  ] });
  const recentArticles = recent.map((route) => articles.find((article) => article.route === route)).filter((article) => !!article);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    AppShell,
    {
      title: "Admin Guide",
      subtitle: "Task-first help for every page — search, read, then open the control",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-[1320px]", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 min-[1100px]:grid-cols-[240px_minmax(0,1fr)_220px] min-[1100px]:justify-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { className: "hidden min-[1100px]:block", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[14px] font-bold text-slate-900", children: "Contents" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "mt-2 space-y-2", children: GUIDE_GROUPS.map((group) => {
            const groupArticles = articles.filter((article) => article.group === group.id);
            if (groupArticles.length === 0) return null;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { open: true, className: "group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "flex cursor-pointer list-none items-center gap-1 text-[13px] font-semibold tracking-wide text-slate-600 uppercase", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3.5 transition-transform group-open:rotate-0 -rotate-90" }),
                group.label
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1 space-y-0.5 border-l border-slate-200 pl-2", children: groupArticles.map((article) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => openArticle(article.route),
                  className: cn(
                    "w-full rounded px-2 py-1 text-left text-[14px] leading-snug",
                    current.route === article.route ? "bg-teal-50 font-semibold text-teal-900" : "text-slate-700 hover:bg-slate-100"
                  ),
                  children: titleOf(article)
                }
              ) }, article.route)) })
            ] }, group.id);
          }) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto w-full min-w-0 max-w-[760px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "mb-3 flex flex-wrap gap-1.5 min-[1100px]:hidden", "aria-label": "On this page", children: (isHome ? [
            ["tasks", "Tasks"],
            ["checklist", "First 15 minutes"]
          ] : [
            ["steps", "Steps"],
            ["see", "What you will see"],
            ["tips", "Tips"],
            ["problems", "Problems"],
            ["related", "Related"]
          ]).map(([id, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "a",
            {
              href: `#${id}`,
              className: "rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[13px] text-slate-700",
              children: label
            },
            id
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-slate-200 bg-white p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-w-48 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute top-3.5 left-3 size-4 text-slate-500" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    ref: searchRef,
                    value: search,
                    onChange: (event) => setSearch(event.target.value),
                    onKeyDown: (event) => {
                      if (event.key === "Escape") setSearch("");
                    },
                    placeholder: "Search tasks, pages, steps or a term…  ( / )",
                    className: "h-12 pl-9 text-[15px]"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1.5 text-[13px] font-medium text-slate-700", children: [
                "I am",
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "select",
                  {
                    value: role,
                    onChange: (event) => setRole(event.target.value),
                    className: "h-9 rounded-md border border-slate-300 bg-white px-2 text-[14px] text-slate-900",
                    children: roles.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: item.key, children: item.label }, item.key))
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "select",
                {
                  value: current.route,
                  onChange: (event) => openArticle(event.target.value),
                  "aria-label": "Choose a guide article",
                  className: "h-9 max-w-56 rounded-md border border-slate-300 bg-white px-2 text-[14px] min-[1100px]:hidden",
                  children: articles.map((article) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: article.route, children: titleOf(article) }, article.route))
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  size: "sm",
                  variant: "outline",
                  className: "h-9",
                  disabled: pdfBusy,
                  onClick: () => void download(),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-1.5 size-4" }),
                    " Whole guide PDF"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  size: "sm",
                  variant: "outline",
                  className: "h-9",
                  disabled: pdfBusy || isHome,
                  onClick: () => void download(current),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "mr-1.5 size-4" }),
                    " This article"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[13px] text-slate-600", children: [
                district,
                " · all content is static"
              ] })
            ] })
          ] }),
          q ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mt-4 rounded-xl border border-slate-200 bg-white p-5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[15px] font-semibold text-slate-900", children: [
              results.length,
              " article",
              results.length === 1 ? "" : "s",
              " match “",
              search,
              "”"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-2", children: [
              results.map((article) => {
                const hay = `${article.purpose} ${article.steps.map((s) => s.text).join(" ")}`;
                const at = hay.toLowerCase().indexOf(q);
                const snippet = at >= 0 ? hay.slice(Math.max(0, at - 40), at + 110) : article.purpose;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => openArticle(article.route),
                    className: "block w-full rounded-lg border border-slate-200 p-3 text-left hover:border-teal-300 hover:bg-teal-50/40",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex flex-wrap items-center gap-2", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[15px] font-semibold text-slate-900", children: titleOf(article) }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-slate-100 px-2 py-0.5 text-[13px] text-slate-600", children: GROUP_LABEL[article.group] })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-1 block text-[14px] leading-relaxed text-slate-600", children: [
                        snippet,
                        "…"
                      ] })
                    ]
                  },
                  article.route
                );
              }),
              results.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[14px] text-slate-600", children: "No article matches. Try “ZIP” or “role”." })
            ] }),
            glossaryResults.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 text-[14px] text-slate-600", children: [
              "Glossary: ",
              glossaryResults.slice(0, 5).map((g) => g.term).join(" · ")
            ] })
          ] }) : isHome ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 space-y-5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-2xl border border-teal-200 bg-teal-50/60 p-5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[13px] font-bold tracking-wide text-teal-800 uppercase", children: "Admin Guide" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mt-1 text-[24px] font-bold leading-tight tracking-tight text-slate-900", children: "Find the next step, then open the exact control." }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 max-w-[640px] text-[15px] leading-relaxed text-slate-700", children: "Search by task, pick your role, and follow short numbered steps. Press / anywhere on this page to search." }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "h-9", onClick: () => searchRef.current?.focus(), children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "mr-1.5 size-4" }),
                  " Search the guide"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", className: "h-9", onClick: () => openArticle("/admin?tab=pages"), children: [
                  "Admin pages ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "ml-1.5 size-4" })
                ] })
              ] })
            ] }),
            admin && homeChecklist,
            taskCards,
            recentArticles.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-[18px] font-bold text-slate-900", children: "Recently viewed" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: recentArticles.map((article) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => openArticle(article.route),
                  className: "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[14px] text-slate-700 hover:border-teal-300",
                  children: titleOf(article)
                },
                article.route
              )) })
            ] }),
            !admin && homeChecklist,
            /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-[18px] font-bold text-slate-900", children: "Glossary" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "mt-2 grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2", children: GLOSSARY.map((entry) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[14px] leading-relaxed", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "inline font-semibold text-slate-900", children: entry.term }),
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "inline text-slate-600", children: entry.meaning }),
                entry.confirm && admin && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 rounded border border-amber-400/60 bg-amber-50 px-1 text-[13px] font-semibold text-amber-900", children: "Confirm" })
              ] }, entry.term)) })
            ] }),
            admin && Array.isArray(unhelpfulQ) && unhelpfulQ.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-[18px] font-bold text-slate-900", children: "Unhelpful articles" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 space-y-1 rounded-xl border border-amber-200 bg-amber-50/60 p-3", children: unhelpfulQ.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-[14px] text-slate-700", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => openArticle(row.route), className: "font-semibold text-teal-800 hover:underline", children: row.articleTitle }),
                row.note ? ` — ${row.note}` : ""
              ] }, `${row.route}-${row.createdAt}`)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "pb-2 text-[13px] text-slate-600", children: "Last verified 04-Nov-2026" })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "mt-4 rounded-xl border border-slate-200 bg-white", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "border-b border-slate-200 p-5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[13px] font-bold tracking-wide text-teal-800 uppercase", children: GROUP_LABEL[current.group] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mt-1 text-[24px] font-bold leading-tight tracking-tight text-slate-900", children: titleOf(current) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[15px] leading-relaxed text-slate-700", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RichText, { text: current.purpose, admin }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2", children: [
                current.roles.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[13px] font-medium text-slate-700", children: roles.find((r) => r.key === item)?.label ?? item }, item)),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "ml-auto h-9", onClick: () => navigate(current.route), children: [
                  "Open page ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "ml-1.5 size-4" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5 p-5", children: [
              admin && changed && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[14px] text-amber-950", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: "This page changed since the guide was checked." }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    size: "sm",
                    variant: "outline",
                    className: "ml-auto h-8 bg-white text-[13px]",
                    onClick: () => {
                      localStorage.setItem(`nqas.guide.hash.${current.route}`, pageHash);
                      setChanged(false);
                    },
                    children: "Mark checked"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { id: "steps", children: "Steps" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "space-y-2", children: steps.map((step, index) => {
                  const StepIcon = STEP_ICONS[index % STEP_ICONS.length];
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3 rounded-lg border border-slate-200 p-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex flex-col items-center gap-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[13px] font-bold text-teal-800", children: index + 1 }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(StepIcon, { className: "size-4 text-teal-700", "aria-hidden": true })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[15px] leading-relaxed text-slate-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RichText, { text: step.text, admin }) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Button,
                        {
                          size: "sm",
                          variant: "outline",
                          className: "mt-2 h-8 gap-1 text-[13px]",
                          onClick: () => openStep(step, current.route),
                          children: [
                            "Open it ",
                            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-3.5" })
                          ]
                        }
                      )
                    ] })
                  ] }, step.text);
                }) }),
                hiddenSteps > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[13px] text-slate-600", children: [
                  hiddenSteps,
                  " step",
                  hiddenSteps === 1 ? "" : "s",
                  " hidden for ",
                  roleLabel,
                  "."
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { id: "see", children: "What you will see" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-slate-700", children: current.see.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(RichText, { text: item, admin }) }, item)) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { id: "tips", children: "Tips" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-slate-700", children: current.tips.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(RichText, { text: item, admin }) }, item)) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { id: "problems", children: "Common problems and fixes" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: current.problems.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-[15px] leading-relaxed text-slate-700", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-900", children: item.problem }),
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(RichText, { text: item.fix, admin })
                ] }, item.problem)) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Heading, { id: "related", children: "Related pages" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: current.related.map((route) => {
                  const article = articles.find((item) => item.route === route);
                  return /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => article ? openArticle(route) : navigate(route),
                      className: "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[14px] text-slate-700 hover:border-teal-300",
                      children: article ? titleOf(article) : route
                    },
                    route
                  );
                }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Feedback,
                {
                  route: current.route,
                  title: titleOf(current),
                  role: roleLabel,
                  onSaved: (route, helpful) => setVotes((prev) => ({ ...prev, [route]: helpful ? "yes" : "no" }))
                },
                current.route
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3 text-[13px] text-slate-600", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  "Last verified ",
                  current.lastChecked
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "a",
                  {
                    className: "underline underline-offset-2 hover:text-slate-900",
                    href: `mailto:dphtptquality@gmail.com?subject=${encodeURIComponent(
                      `Admin Guide problem: ${titleOf(current)}`
                    )}`,
                    children: "Report a problem"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-auto inline-flex items-center gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Clipboard, { className: "size-3.5" }),
                  " Ctrl+C to copy a heading"
                ] })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { className: "hidden min-[1100px]:block", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sticky top-24", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[14px] font-bold text-slate-900", children: "On this page" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 space-y-1.5 text-[14px] text-slate-600", children: (isHome ? [
            ["tasks", "Tasks"],
            ["checklist", "First 15 minutes"]
          ] : [
            ["steps", "Steps"],
            ["see", "What you will see"],
            ["tips", "Tips"],
            ["problems", "Problems and fixes"],
            ["related", "Related pages"]
          ]).map(([id, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "hover:text-slate-900", href: `#${id}`, children: label }) }, id)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-lg border border-slate-200 bg-white p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[14px] font-semibold text-slate-900", children: "Need help?" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[13px] leading-relaxed text-slate-700", children: "Press the ? on any page for its article." })
          ] })
        ] }) })
      ] }) })
    }
  );
}

export { GuidePage as default };
