/**
 * ADMIN GUIDE — readable, task-first, role-aware.
 *
 * Content is static (lib/guide) and the route is lazy-loaded. Search is local
 * and synchronous. The only reads are page labels, roles, settings and the
 * signed-in user's checklist / recent articles.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  FileText,
  ListChecks,
  MousePointer2,
  MousePointerClick,
  Save,
  Search,
  Sparkles,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { sidebarLabel } from "@/lib/sidebarLabels";
import { MASTER_COLUMNS } from "@/lib/masterColumns";
import { requestGuideSpotlight } from "@/lib/guideSpotlight";
import {
  FIRST_15,
  GLOSSARY,
  GUIDE_ARTICLES,
  GUIDE_GROUPS,
  HOW_TOS,
  customGuideStub,
  type GuideArticle,
  type GuideGroup,
  type GuideRole,
  type GuideStep,
} from "@/lib/guide";
import { downloadGuidePdf } from "@/components/guide/guidePdf";

const GROUP_LABEL: Record<GuideGroup, string> = {
  start: "Start here",
  daily: "Daily work",
  reports: "Reports",
  imports: "Imports",
  admin: "Admin",
};

const STEP_ICONS = [MousePointerClick, ListChecks, Save, CheckCircle2];

function hashText(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Dotted glossary terms; unverifiable terms carry a Confirm marker. */
function RichText({ text, admin }: { text: string; admin: boolean }) {
  const terms = GLOSSARY.map((g) => g.term).sort((a, b) => b.length - a.length);
  const lookup = new Map(GLOSSARY.map((g) => [g.term.toLowerCase(), g]));
  const pattern = new RegExp(`\\b(${terms.map(escapeRegExp).join("|")})\\b`, "gi");
  const pieces: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) pieces.push(text.slice(last, at));
    const term = match[0];
    const entry = lookup.get(term.toLowerCase());
    if (entry) {
      pieces.push(
        <abbr
          key={`${at}-${term}`}
          title={`${entry.meaning}${entry.confirm ? " · Confirm with the admin" : ""}`}
          data-tip={`${entry.meaning}${entry.confirm ? " · Confirm" : ""}`}
          className="cursor-help text-inherit decoration-slate-400 decoration-dotted underline-offset-2 [text-decoration-line:underline] [text-decoration-style:dotted]"
        >
          {term}
          {admin && entry.confirm && (
            <span className="ml-0.5 rounded border border-amber-400/60 bg-amber-50 px-1 text-[13px] font-semibold text-amber-900">
              Confirm
            </span>
          )}
        </abbr>,
      );
    } else {
      pieces.push(term);
    }
    last = at + term.length;
  }
  if (last < text.length) pieces.push(text.slice(last));
  return <>{pieces}</>;
}

function Heading({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="flex items-center gap-2">
      <h2 id={id} className="scroll-mt-28 text-[18px] font-bold tracking-tight text-slate-900">
        {children}
      </h2>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`Copy link to ${String(children)}`}
        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}

function TaskCard({
  how,
  open,
  onToggle,
  onOpen,
  done,
}: {
  how: (typeof HOW_TOS)[number];
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
  done: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4 transition-colors",
        open ? "border-teal-400/70 shadow-sm" : "border-slate-200 hover:border-teal-300",
      )}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 text-left">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
          <FileText className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-slate-900">{how.title}</span>
          <span className="mt-0.5 block text-[13px] text-slate-600">
            {how.steps.length} short steps
          </span>
        </span>
        {done ? (
          <CheckCircle2 className="mt-1 size-5 shrink-0 text-emerald-600" />
        ) : (
          <ChevronDown
            className={cn("mt-1 size-4 shrink-0 text-slate-500", open && "rotate-180")}
          />
        )}
      </button>
      {open && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <ol className="space-y-2">
            {how.steps.map((step, index) => (
              <li key={step} className="flex gap-2 text-[14px] leading-relaxed text-slate-700">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[13px] font-bold text-teal-800">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <Button size="sm" className="mt-3 h-9 gap-1.5" onClick={onOpen}>
            Open it <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function Feedback({
  route,
  title,
  role,
  onSaved,
}: {
  route: string;
  title: string;
  role: string;
  onSaved: (route: string, helpful: boolean) => void;
}) {
  const submit = useMutation(api.guideFeedback.submit);
  const [vote, setVote] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const send = async (helpful: boolean) => {
    setVote(helpful);
    if (helpful) {
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
    return        <p className="text-[14px] font-medium text-emerald-800">Thanks — your vote is saved.</p>;
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[15px] font-semibold text-slate-900">Was this helpful?</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          variant={vote === true ? "default" : "outline"}
          size="sm"
          className="h-9"
          onClick={() => void send(true)}
        >
          Yes
        </Button>
        <Button
          variant={vote === false ? "default" : "outline"}
          size="sm"
          className="h-9"
          onClick={() => setVote(false)}
        >
          No
        </Button>
        {vote === false && (
          <>
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What was missing? (optional)"
              aria-label="Optional note"
              className="h-9 w-full min-w-48 flex-1 text-[14px]"
            />
            <Button size="sm" className="h-9" onClick={() => void sendNo()}>
              Send
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function GuidePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const overridesQ = useQuery(api.pages.builtinOverrides, {});
  const settingsQ = useQuery(api.facilities.getAppSettings, {});
  const rolesQ = useQuery(api.roles.list, {});
  const customQ = useQuery(api.pages.nav, {});
  const unhelpfulQ = useQuery(api.guideFeedback.unhelpful, {});

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<GuideRole>((user?.appRole as GuideRole) ?? "viewer");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [openedHowTo, setOpenedHowTo] = useState<string | null>(HOW_TOS[0]?.id ?? null);
  const [recent, setRecent] = useState<string[]>([]);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [changed, setChanged] = useState(false);
  const [votes, setVotes] = useState<Record<string, "yes" | "no">>({});
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (user?.appRole) setRole(user.appRole as GuideRole);
  }, [user?.appRole]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const overrides = (overridesQ ?? {}) as Record<string, { label?: string }>;
  const roles = useMemo(
    () =>
      (rolesQ ?? []).length
        ? (rolesQ as { key: string; label: string }[])
        : [
            { key: "admin", label: "State Admin" },
            { key: "dqc", label: "DQC" },
            { key: "dqmo", label: "DQMO" },
            { key: "entry", label: "Data Entry" },
            { key: "viewer", label: "Viewer" },
          ],
    [rolesQ],
  );
  const roleLabel = roles.find((r) => r.key === role)?.label ?? role;
  const district =
    ((settingsQ?.settings as Record<string, unknown> | undefined)?.districtName as string) ||
    "District";
  const userId = String(user?._id ?? "guest");
  const checklistKey = `nqas.guide.checklist.${userId}`;
  const recentKey = `nqas.guide.recent.${userId}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(checklistKey);
      setChecked(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      setChecked(new Set());
    }
  }, [checklistKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(recentKey);
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      setRecent(Array.isArray(list) ? list.slice(0, 6) : []);
    } catch {
      setRecent([]);
    }
  }, [recentKey]);

  const articles = useMemo(() => {
    const list: (GuideArticle & { title: string })[] = GUIDE_ARTICLES.map((article) => ({
      ...article,
      title:
        overrides[article.route]?.label?.trim() ||
        (article.titleKey ? sidebarLabel(article.titleKey) : "") ||
        article.fallbackTitle,
    }));
    for (const page of (customQ ?? []) as { slug: string; name: string }[]) {
      const route = `/p/${page.slug}`;
      if (list.some((article) => article.route === route)) continue;
      const stub = customGuideStub(page.name);
      list.push({ ...stub, route, title: page.name });
    }
    return list;
  }, [customQ, overrides]);

  const currentRoute = params.get("article") ?? "/guide";
  const current =
    articles.find((article) => article.route === currentRoute) ??
    articles.find((article) => article.route === "/guide") ??
    articles[0];
  const isHome = currentRoute === "/guide";

  useEffect(() => {
    if (isHome) return;
    setRecent((prev) => {
      if (prev[0] === currentRoute) return prev;
      const next = [currentRoute, ...prev.filter((route) => route !== currentRoute)].slice(0, 6);
      try {
        localStorage.setItem(recentKey, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  }, [currentRoute, isHome, recentKey]);

  const titleOf = (article: GuideArticle) =>
    "title" in article && typeof article.title === "string"
      ? article.title
      : overrides[article.route]?.label?.trim() ||
        (article.titleKey ? sidebarLabel(article.titleKey) : "") ||
        article.fallbackTitle;

  const openArticle = (route: string) => {
    setSearch("");
    setParams({ article: route });
    if (route !== "/guide") {
      setRecent((prev) => {
        const next = [route, ...prev.filter((r) => r !== route)].slice(0, 6);
        try {
          localStorage.setItem(recentKey, JSON.stringify(next));
        } catch {
          /* private mode */
        }
        return next;
      });
    }
  };

  const q = search.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return articles
      .filter((article) => {
        const hay = [
          titleOf(article),
          article.purpose,
          ...article.steps.map((step) => step.text),
          ...article.tips,
          ...article.see,
          ...article.problems.flatMap((p) => [p.problem, p.fix]),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 24);
  }, [articles, q, overrides]);

  const howResults = useMemo(
    () =>
      HOW_TOS.filter((how) => !how.roles || how.roles.includes(role)).filter(
        (how) => !q || `${how.title} ${how.steps.join(" ")}`.toLowerCase().includes(q),
      ),
    [q, role],
  );
  const glossaryResults = useMemo(
    () =>
      !q
        ? GLOSSARY
        : GLOSSARY.filter((g) => `${g.term} ${g.meaning}`.toLowerCase().includes(q)),
    [q],
  );

  // A step inherits the article's role gate unless it names its own roles.
  const steps = current.steps.filter((step) =>
    (step.roles ?? current.roles).includes(role),
  );
  const hiddenSteps = current.steps.length - steps.length;
  const doneCount = FIRST_15.filter((item) => checked.has(item.id)).length;
  const admin = user?.appRole === "admin";

  const toggleCheck = (id: string) => {
    setChecked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(checklistKey, JSON.stringify([...next]));
      } catch {
        /* private mode */
      }
      return next;
    });
  };

  const pageHash = useMemo(() => {
    const headerOverrides = (settingsQ?.settings.tableHeaderOverrides ?? {}) as Record<
      string,
      string
    >;
    return hashText(
      JSON.stringify({
        route: current.route,
        label: titleOf(current),
        overrides: overrides[current.route] ?? null,
        columns: MASTER_COLUMNS.map((column) => [
          column.key,
          headerOverrides[column.label] ?? column.label,
        ]),
      }),
    );
  }, [current, overrides, settingsQ, titleOf]);

  useEffect(() => {
    // Wait for settings and page labels, otherwise the first render stores a
    // baseline from defaults and then reports a false "page changed" warning.
    if (!admin || isHome || settingsQ === undefined || overridesQ === undefined) return;
    const key = `nqas.guide.hash.${current.route}`;
    try {
      const previous = localStorage.getItem(key);
      if (previous && previous !== pageHash) setChanged(true);
      else {
        setChanged(false);
        localStorage.setItem(key, pageHash);
      }
    } catch {
      /* private mode */
    }
  }, [admin, current.route, isHome, pageHash, settingsQ, overridesQ]);

  const download = async (single?: GuideArticle) => {
    setPdfBusy(true);
    try {
      await downloadGuidePdf(
        single ? [single] : articles,
        single ? titleOf(single) : "Admin Guide",
        district,
        titleOf,
      );
    } finally {
      setPdfBusy(false);
    }
  };

  const openStep = (step: GuideStep, route: string) => {
    requestGuideSpotlight(
      step.target ?? "[data-guide-target], main h1",
      step.text,
    );
    navigate(route);
  };

  const homeChecklist = (
    <section id="checklist" className="scroll-mt-28 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="size-4 text-teal-700" />
        <h2 className="text-[18px] font-bold text-slate-900">Your checklist</h2>
        <span className="text-[13px] text-slate-600">
          First 15 minutes · {doneCount} of {FIRST_15.length} done
        </span>
      </div>
      <p className="mt-1 text-[14px] text-slate-600">Your checklist is remembered on this account.</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {FIRST_15.map((item) => {
          const done = checked.has(item.id);
          return (
            <li key={item.id} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2">
              <button
                type="button"
                aria-label={item.label}
                aria-pressed={done}
                onClick={() => toggleCheck(item.id)}
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                  done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300",
                )}
              >
                {done && <Check className="size-3.5" />}
              </button>
              <span className={cn("min-w-0 flex-1 text-[14px] leading-relaxed text-slate-800", done && "text-slate-600 line-through")}>
                {item.label}
              </span>
              <Link to={item.route} className="text-[13px] font-semibold text-teal-800 hover:underline">
                Open
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const taskCards = (
    <section id="tasks" className="scroll-mt-28">
      <h2 className="text-[18px] font-bold text-slate-900">What do you want to do?</h2>
      <p className="mt-1 text-[14px] text-slate-600">Pick a task. Each card opens a short numbered guide.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(q ? howResults : HOW_TOS).map((how) => (
          <TaskCard
            key={how.id}
            how={how}
            open={openedHowTo === how.id}
            done={votes[how.route] === "yes"}
            onToggle={() => setOpenedHowTo((cur) => (cur === how.id ? null : how.id))}
            onOpen={() => {
              const tab = new URLSearchParams(how.route.split("?")[1] ?? "").get("tab");
              const target = tab
                ? `[data-guide-target="admin-tab-${tab}"]`
                : "[data-guide-target], main h1";
              requestGuideSpotlight(target, how.steps[0] ?? how.title);
              navigate(how.route);
            }}
          />
        ))}
      </div>
    </section>
  );

  const recentArticles = recent
    .map((route) => articles.find((article) => article.route === route))
    .filter((article): article is GuideArticle & { title: string } => !!article);

  return (
    <AppShell
      title="Admin Guide"
      subtitle="Task-first help for every page — search, read, then open the control"
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-4 min-[1100px]:grid-cols-[240px_minmax(0,1fr)_220px] min-[1100px]:justify-center">
          {/* Contents rail */}
          <aside className="hidden min-[1100px]:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
              <p className="text-[14px] font-bold text-slate-900">Contents</p>
              <nav className="mt-2 space-y-2">
                {GUIDE_GROUPS.map((group) => {
                  const groupArticles = articles.filter((article) => article.group === group.id);
                  if (groupArticles.length === 0) return null;
                  return (
                    <details key={group.id} open className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-1 text-[13px] font-semibold tracking-wide text-slate-600 uppercase">
                        <ChevronDown className="size-3.5 transition-transform group-open:rotate-0 -rotate-90" />
                        {group.label}
                      </summary>
                      <ul className="mt-1 space-y-0.5 border-l border-slate-200 pl-2">
                        {groupArticles.map((article) => (
                          <li key={article.route}>
                            <button
                              type="button"
                              onClick={() => openArticle(article.route)}
                              className={cn(
                                "w-full rounded px-2 py-1 text-left text-[14px] leading-snug",
                                current.route === article.route
                                  ? "bg-teal-50 font-semibold text-teal-900"
                                  : "text-slate-700 hover:bg-slate-100",
                              )}
                            >
                              {titleOf(article)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </details>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Centre */}
          <div className="mx-auto w-full min-w-0 max-w-[760px]">
            {/* Below 1100px the rails become this chip row + the article picker. */}
            <nav className="mb-3 flex flex-wrap gap-1.5 min-[1100px]:hidden" aria-label="On this page">
              {(isHome
                ? [
                    ["tasks", "Tasks"],
                    ["checklist", "First 15 minutes"],
                  ]
                : [
                    ["steps", "Steps"],
                    ["see", "What you will see"],
                    ["tips", "Tips"],
                    ["problems", "Problems"],
                    ["related", "Related"],
                  ]
              ).map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[13px] text-slate-700"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-48 flex-1">
                  <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-slate-500" />
                  <Input
                    ref={searchRef}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setSearch("");
                    }}
                    placeholder="Search tasks, pages, steps or a term…  ( / )"
                    className="h-12 pl-9 text-[15px]"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
                  I am
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value as GuideRole)}
                    className="h-9 rounded-md border border-slate-300 bg-white px-2 text-[14px] text-slate-900"
                  >
                    {roles.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <select
                  value={current.route}
                  onChange={(event) => openArticle(event.target.value)}
                  aria-label="Choose a guide article"
                  className="h-9 max-w-56 rounded-md border border-slate-300 bg-white px-2 text-[14px] min-[1100px]:hidden"
                >
                  {articles.map((article) => (
                    <option key={article.route} value={article.route}>
                      {titleOf(article)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  disabled={pdfBusy}
                  onClick={() => void download()}
                >
                  <Download className="mr-1.5 size-4" /> Whole guide PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  disabled={pdfBusy || isHome}
                  onClick={() => void download(current)}
                >
                  <Download className="mr-1.5 size-4" /> This article
                </Button>
                <span className="text-[13px] text-slate-600">
                  {district} · all content is static
                </span>
              </div>
            </div>

            {q ? (
              <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-[15px] font-semibold text-slate-900">
                  {results.length} article{results.length === 1 ? "" : "s"} match “{search}”
                </p>
                <div className="mt-3 space-y-2">
                  {results.map((article) => {
                    const hay = `${article.purpose} ${article.steps.map((s) => s.text).join(" ")}`;
                    const at = hay.toLowerCase().indexOf(q);
                    const snippet = at >= 0 ? hay.slice(Math.max(0, at - 40), at + 110) : article.purpose;
                    return (
                      <button
                        key={article.route}
                        type="button"
                        onClick={() => openArticle(article.route)}
                        className="block w-full rounded-lg border border-slate-200 p-3 text-left hover:border-teal-300 hover:bg-teal-50/40"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-semibold text-slate-900">{titleOf(article)}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[13px] text-slate-600">
                            {GROUP_LABEL[article.group]}
                          </span>
                        </span>
                        <span className="mt-1 block text-[14px] leading-relaxed text-slate-600">{snippet}…</span>
                      </button>
                    );
                  })}
                  {results.length === 0 && (
                    <p className="text-[14px] text-slate-600">No article matches. Try “ZIP” or “role”.</p>
                  )}
                </div>
                {glossaryResults.length > 0 && (
                  <p className="mt-3 text-[14px] text-slate-600">
                    Glossary: {glossaryResults.slice(0, 5).map((g) => g.term).join(" · ")}
                  </p>
                )}
              </section>
            ) : isHome ? (
              <div className="mt-4 space-y-5">
                <section className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
                  <p className="text-[13px] font-bold tracking-wide text-teal-800 uppercase">Admin Guide</p>
                  <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-tight text-slate-900">
                    Find the next step, then open the exact control.
                  </h1>
                  <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-slate-700">
                    Search by task, pick your role, and follow short numbered steps. Press / anywhere on this page to search.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" className="h-9" onClick={() => searchRef.current?.focus()}>
                      <Search className="mr-1.5 size-4" /> Search the guide
                    </Button>
                    <Button size="sm" variant="outline" className="h-9" onClick={() => openArticle("/admin?tab=pages")}>
                      Admin pages <ExternalLink className="ml-1.5 size-4" />
                    </Button>
                  </div>
                </section>

                {admin && homeChecklist}
                {taskCards}
                {recentArticles.length > 0 && (
                  <section>
                    <h2 className="text-[18px] font-bold text-slate-900">Recently viewed</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recentArticles.map((article) => (
                        <button
                          key={article.route}
                          type="button"
                          onClick={() => openArticle(article.route)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[14px] text-slate-700 hover:border-teal-300"
                        >
                          {titleOf(article)}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {!admin && homeChecklist}
                <section>
                  <h2 className="text-[18px] font-bold text-slate-900">Glossary</h2>
                  <dl className="mt-2 grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                    {GLOSSARY.map((entry) => (
                      <div key={entry.term} className="text-[14px] leading-relaxed">
                        <dt className="inline font-semibold text-slate-900">{entry.term}</dt>{" "}
                        <dd className="inline text-slate-600">{entry.meaning}</dd>
                        {entry.confirm && admin && (
                          <span className="ml-1 rounded border border-amber-400/60 bg-amber-50 px-1 text-[13px] font-semibold text-amber-900">
                            Confirm
                          </span>
                        )}
                      </div>
                    ))}
                  </dl>
                </section>
                {admin && Array.isArray(unhelpfulQ) && unhelpfulQ.length > 0 && (
                  <section>
                    <h2 className="text-[18px] font-bold text-slate-900">Unhelpful articles</h2>
                    <ul className="mt-2 space-y-1 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                      {unhelpfulQ.map((row) => (
                        <li key={`${row.route}-${row.createdAt}`} className="text-[14px] text-slate-700">
                          <button type="button" onClick={() => openArticle(row.route)} className="font-semibold text-teal-800 hover:underline">
                            {row.articleTitle}
                          </button>
                          {row.note ? ` — ${row.note}` : ""}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <p className="pb-2 text-[13px] text-slate-600">Last verified 04-Nov-2026</p>
              </div>
            ) : (
              <article className="mt-4 rounded-xl border border-slate-200 bg-white">
                <header className="border-b border-slate-200 p-5">
                  <p className="text-[13px] font-bold tracking-wide text-teal-800 uppercase">
                    {GROUP_LABEL[current.group]}
                  </p>
                  <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-tight text-slate-900">
                    {titleOf(current)}
                  </h1>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
                    <RichText text={current.purpose} admin={admin} />
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {current.roles.map((item) => (
                      <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[13px] font-medium text-slate-700">
                        {roles.find((r) => r.key === item)?.label ?? item}
                      </span>
                    ))}
                    <Button size="sm" className="ml-auto h-9" onClick={() => navigate(current.route)}>
                      Open page <ExternalLink className="ml-1.5 size-4" />
                    </Button>
                  </div>
                </header>

                <div className="space-y-5 p-5">
                  {admin && changed && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[14px] text-amber-950">
                      <span className="font-semibold">This page changed since the guide was checked.</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto h-8 bg-white text-[13px]"
                        onClick={() => {
                          localStorage.setItem(`nqas.guide.hash.${current.route}`, pageHash);
                          setChanged(false);
                        }}
                      >
                        Mark checked
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Heading id="steps">Steps</Heading>
                    <ol className="space-y-2">
                      {steps.map((step, index) => {
                        const StepIcon = STEP_ICONS[index % STEP_ICONS.length];
                        return (
                        <li key={step.text} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                          <span className="flex flex-col items-center gap-1">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[13px] font-bold text-teal-800">
                              {index + 1}
                            </span>
                            <StepIcon className="size-4 text-teal-700" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] leading-relaxed text-slate-800">
                              <RichText text={step.text} admin={admin} />
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 h-8 gap-1 text-[13px]"
                              onClick={() => openStep(step, current.route)}
                            >
                              Open it <ArrowRight className="size-3.5" />
                            </Button>
                          </div>
                        </li>
                        );
                      })}
                    </ol>
                    {hiddenSteps > 0 && (
                      <p className="text-[13px] text-slate-600">
                        {hiddenSteps} step{hiddenSteps === 1 ? "" : "s"} hidden for {roleLabel}.
                      </p>
                    )}
                  </div>

                  <section className="space-y-2">
                    <Heading id="see">What you will see</Heading>
                    <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-slate-700">
                      {current.see.map((item) => (
                        <li key={item}><RichText text={item} admin={admin} /></li>
                      ))}
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <Heading id="tips">Tips</Heading>
                    <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-slate-700">
                      {current.tips.map((item) => (
                        <li key={item}><RichText text={item} admin={admin} /></li>
                      ))}
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <Heading id="problems">Common problems and fixes</Heading>
                    <ul className="space-y-2">
                      {current.problems.map((item) => (
                        <li key={item.problem} className="text-[15px] leading-relaxed text-slate-700">
                          <span className="font-semibold text-slate-900">{item.problem}</span>{" "}
                          <RichText text={item.fix} admin={admin} />
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <Heading id="related">Related pages</Heading>
                    <div className="flex flex-wrap gap-2">
                      {current.related.map((route) => {
                        const article = articles.find((item) => item.route === route);
                        return (
                          <button
                            key={route}
                            type="button"
                            onClick={() => (article ? openArticle(route) : navigate(route))}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[14px] text-slate-700 hover:border-teal-300"
                          >
                            {article ? titleOf(article) : route}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <Feedback
                    key={current.route}
                    route={current.route}
                    title={titleOf(current)}
                    role={roleLabel}
                    onSaved={(route, helpful) =>
                      setVotes((prev) => ({ ...prev, [route]: helpful ? "yes" : "no" }))
                    }
                  />

                  <footer className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3 text-[13px] text-slate-600">
                    <span>Last verified {current.lastChecked}</span>
                    <a
                      className="underline underline-offset-2 hover:text-slate-900"
                      href={`mailto:dphtptquality@gmail.com?subject=${encodeURIComponent(
                        `Admin Guide problem: ${titleOf(current)}`,
                      )}`}
                    >
                      Report a problem
                    </a>
                    <span className="ml-auto inline-flex items-center gap-1">
                      <Clipboard className="size-3.5" /> Ctrl+C to copy a heading
                    </span>
                  </footer>
                </div>
              </article>
            )}
          </div>

          {/* On this page rail */}
          <aside className="hidden min-[1100px]:block">
            <div className="sticky top-24">
              <p className="text-[14px] font-bold text-slate-900">On this page</p>
              <ul className="mt-2 space-y-1.5 text-[14px] text-slate-600">
                {(isHome
                  ? [
                      ["tasks", "Tasks"],
                      ["checklist", "First 15 minutes"],
                    ]
                  : [
                      ["steps", "Steps"],
                      ["see", "What you will see"],
                      ["tips", "Tips"],
                      ["problems", "Problems and fixes"],
                      ["related", "Related pages"],
                    ]
                ).map(([id, label]) => (
                  <li key={id}>
                    <a className="hover:text-slate-900" href={`#${id}`}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[14px] font-semibold text-slate-900">Need help?</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-700">
                  Press the ? on any page for its article.
                </p>
              </div>
            </div>
          </aside>
        </div>

      </div>
    </AppShell>
  );
}
