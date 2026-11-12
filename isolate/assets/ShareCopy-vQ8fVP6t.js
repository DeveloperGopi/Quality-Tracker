import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, p as Lock, T as TriangleAlert, m as Check, u as FileText, a2 as Download, bH as Share2, E as ExternalLink, aq as Copy } from './icons-BxQpodNr.js';
import { n as useParams, l as useQuery, j as api, m as useMutation, B as Button, L as Link } from './index-CBV6wOh8.js';
import { N as NqasLogo } from './NqasLogo-CIWlMexW.js';
import { a as ORG_NAME } from './org-DjtYn14q.js';
import { s as shareFileUrl, a as SHARE_ROUTE, i as istStampText, b as shareDocumentStreamUrl, c as shareStreamUrl } from './shareLink-_K-oJu5R.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';

const recorded = /* @__PURE__ */ new Set();
function ShareCopy() {
  const { token = "" } = useParams();
  const data = useQuery(api.share.resolve, token ? { token } : "skip");
  const recordOpen = useMutation(api.share.recordOpen);
  const [copied, setCopied] = reactExports.useState(false);
  const copyTimer = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!token || !data || data.status !== "ok" || recorded.has(token)) return;
    recorded.add(token);
    void recordOpen({ token }).catch(() => {
    });
  }, [token, data, recordOpen]);
  reactExports.useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
  }, []);
  const pageUrl = token ? `${window.location.origin}${SHARE_ROUTE}/${token}` : "";
  const fileUrl = token ? shareFileUrl(window.location.origin, token) : "";
  const downloadUrl = token ? shareFileUrl(window.location.origin, token, true) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };
  const share = async () => {
    const payload = {
      title: "NQAS Status Report",
      text: "NQAS Status Report — digital copy",
      url: pageUrl
    };
    const nav = navigator;
    if (typeof nav.share === "function") {
      try {
        await nav.share(payload);
        return;
      } catch {
      }
    }
    await copy();
  };
  if (!token || data === void 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Shell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-pulse space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-24 rounded-2xl bg-muted" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-56 rounded-2xl bg-muted" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-12 rounded-xl bg-muted" })
    ] }) });
  }
  if (data.status !== "ok") {
    const messages = {
      expired: {
        title: "This link has expired",
        body: "Ask the district office for a new copy."
      },
      revoked: {
        title: "This link is no longer active",
        body: "Ask the district office for a new copy."
      },
      sign_in_required: {
        title: "Sign in to open this report",
        body: "This link is reserved for staff accounts."
      },
      not_found: {
        title: "This link is not valid",
        body: "Check the code on the printed sheet, or ask the district office for a new copy."
      }
    };
    const message = messages[data.status] ?? messages.not_found;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Shell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-6 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600", children: data.status === "sign_in_required" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "size-6" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-6" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mt-3 text-lg font-semibold", children: message.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: message.body }),
      data.status === "sign_in_required" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, className: "mt-4 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: `/auth?returnTo=${encodeURIComponent(`${SHARE_ROUTE}/${token}`)}`, children: "Sign in" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, variant: "outline", className: "mt-4 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/", children: "Open the tracker" }) })
    ] }) });
  }
  const cycleLine = data.cycleNumber ? `Cycle #${data.cycleNumber}` : "";
  const signedInLatest = data.changed && data.facilityId;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Shell, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex items-start gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(NqasLogo, { className: "size-11 shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", children: ORG_NAME }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "truncate text-lg font-bold leading-tight", children: [
          data.facilityName,
          data.facilityType ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1.5 text-sm font-medium text-muted-foreground", children: data.facilityType }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
          "NQAS Status Report · generated ",
          istStampText(data.generatedAt),
          cycleLine ? ` · ${cycleLine}` : ""
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 text-sm text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-4 shrink-0 text-emerald-600" }),
        "This is the report as printed"
      ] }),
      data.changed && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-4 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1", children: "Data has changed since this report was generated." }),
        signedInLatest && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Link,
          {
            to: `/facilities/${data.facilityId}`,
            className: "rounded-md border border-amber-500/50 px-2 py-1 font-semibold hover:bg-amber-500/15",
            children: "Open the latest"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("section", { "aria-label": "Report preview", className: "overflow-hidden rounded-2xl border border-border/60 bg-muted/40", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "iframe",
      {
        "aria-label": "NQAS Status Report preview",
        src: fileUrl,
        className: "h-[60vh] w-full bg-white sm:h-[70vh]"
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          href: fileUrl,
          target: "_blank",
          rel: "noopener",
          className: "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }),
            " Open PDF"
          ]
        }
      ),
      data.allowDownload ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          href: downloadUrl,
          className: "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 text-sm font-semibold hover:bg-accent",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4" }),
            " Download PDF"
          ]
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-4 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "size-4" }),
        " Downloading is switched off by the administrator"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => void share(),
          className: "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 text-sm font-semibold hover:bg-accent sm:col-span-2",
          children: [
            copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { className: "size-4" }),
            copied ? "Link copied" : "Share this link"
          ]
        }
      )
    ] }),
    (data.documents?.length ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-label": "Documents in this report", className: "rounded-2xl border border-border/60 bg-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "border-b border-border/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: "Documents in this report" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-border/50", children: (data.documents ?? []).map((doc) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-2 px-4 py-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4 shrink-0 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate text-xs", children: doc.fileName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: doc.url,
            target: "_blank",
            rel: "noopener",
            className: "shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-primary underline-offset-2 hover:underline",
            children: "Open"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: `${doc.url}${doc.url.includes("?") ? "&" : "?"}download=1`,
            className: "shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline",
            children: "Download"
          }
        )
      ] }, doc.key)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-4 shrink-0 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate font-mono text-xs", children: pageUrl }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => void copy(),
          "aria-label": "Copy this link",
          className: "rounded-md p-1.5 hover:bg-accent",
          children: copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "size-4" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Footer, { token })
  ] });
}
function ShareFile() {
  const { token = "" } = useParams();
  const download = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("download") === "1";
  const target = shareStreamUrl("https://determined-pheasant-606.convex.cloud", token, download);
  reactExports.useEffect(() => {
    if (target) window.location.replace(target);
  }, [target]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Shell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-6 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "mx-auto size-8 text-muted-foreground" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm font-semibold", children: target ? "Opening the report…" : "This link is not valid" }),
    target && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-xs text-muted-foreground", children: [
      "If nothing opens,",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "underline", href: target, children: "download the PDF directly" }),
      "."
    ] }),
    !target && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Ask the district office for a new copy." })
  ] }) });
}
function ShareDocument() {
  const { token = "", docToken = "" } = useParams();
  const data = useQuery(
    api.share.resolveDocument,
    token && docToken ? { token, docToken } : "skip"
  );
  const download = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("download") === "1";
  const target = shareDocumentStreamUrl(
    "https://determined-pheasant-606.convex.cloud",
    token,
    docToken,
    download
  );
  reactExports.useEffect(() => {
    if (data?.status === "ok" && target) window.location.replace(target);
  }, [data, target]);
  if (data === void 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Shell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-40 animate-pulse rounded-2xl bg-muted" }) });
  }
  if (data.status === "ok") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Shell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-6 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "mx-auto size-8 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 text-sm font-semibold", children: [
        "Opening ",
        data.fileName,
        "…"
      ] }),
      target && /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "mt-2 inline-block text-xs underline", href: target, children: "Open the document directly" })
    ] }) });
  }
  const signIn = data.status === "sign_in_required";
  const body = signIn ? "This document is reserved for staff accounts." : data.status === "expired" ? "Ask the district office for a new copy." : "This document link is not valid. Check the code on the printed sheet.";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Shell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-6 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600", children: signIn ? /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "size-6" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-6" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mt-3 text-lg font-semibold", children: signIn ? "Sign in to open this document" : data.status === "expired" ? "This link has expired" : data.status === "revoked" ? "This link is no longer active" : "This document link is not valid" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: body }),
    signIn && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, className: "mt-4 w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Link,
      {
        to: `/auth?returnTo=${encodeURIComponent(`${SHARE_ROUTE}/${token}/d/${docToken}`)}`,
        children: "Sign in"
      }
    ) })
  ] }) });
}
function Shell({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "min-h-screen bg-background", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto w-full max-w-3xl px-4 py-6 sm:py-10", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children }) }) });
}
function Footer({ token }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "space-y-2 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
      "Confidential. Facility quality data. Handle per ",
      ORG_NAME,
      " guidelines."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Link,
        {
          to: `/auth?returnTo=${encodeURIComponent(`${SHARE_ROUTE}/${token}`)}`,
          className: "underline underline-offset-2 hover:text-foreground",
          children: "Sign in"
        }
      ),
      " ",
      "for staff access"
    ] })
  ] });
}

export { ShareDocument, ShareFile, ShareCopy as default };
