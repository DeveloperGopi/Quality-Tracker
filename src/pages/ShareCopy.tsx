/**
 * DIGITAL COPY — the page a scan of the facility sheet opens.
 *
 * `/r/<token>` (a real React route, no sign-in unless Admin → Shared reports
 * says so) shows the SNAPSHOT that was printed: never live data, never
 * another facility. It is mobile-first, because that is where a QR is read.
 *
 * The bytes are served by `/r/<token>/file` (see `ShareFile` below), which
 * streams the stored PDF with the exact file name from lib/reportNaming —
 * no Drive id, link or token ever appears in this page.
 */
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useParams } from "react-router";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Lock,
  Share2,
} from "lucide-react";

import { NqasLogo } from "@/components/NqasLogo";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { ORG_NAME } from "@/lib/org";
import {
  SHARE_ROUTE,
  shareDocumentStreamUrl,
  shareFileUrl,
  shareStreamUrl,
} from "@/lib/shareLink";
import { istStampText } from "@/lib/shareLink";

/** One open is counted once per browser session, not once per React render
 *  (StrictMode mounts effects twice in development). */
const recorded = new Set<string>();

export default function ShareCopy() {
  const { token = "" } = useParams();
  const data = useQuery(api.share.resolve, token ? { token } : "skip");
  const recordOpen = useMutation(api.share.recordOpen);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!token || !data || data.status !== "ok" || recorded.has(token)) return;
    recorded.add(token);
    void recordOpen({ token }).catch(() => {
      /* a counted open is nice-to-have, never a page error */
    });
  }, [token, data, recordOpen]);

  useEffect(() => () => {
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
      url: pageUrl,
    };
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share(payload);
        return;
      } catch {
        /* dismissed or unsupported — fall back to the clipboard */
      }
    }
    await copy();
  };

  /* ---------------------------------------------------------------- states */

  if (!token || data === undefined) {
    return (
      <Shell>
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-2xl bg-muted" />
          <div className="h-56 rounded-2xl bg-muted" />
          <div className="h-12 rounded-xl bg-muted" />
        </div>
      </Shell>
    );
  }

  if (data.status !== "ok") {
    const messages: Record<string, { title: string; body: string }> = {
      expired: {
        title: "This link has expired",
        body: "Ask the district office for a new copy.",
      },
      revoked: {
        title: "This link is no longer active",
        body: "Ask the district office for a new copy.",
      },
      sign_in_required: {
        title: "Sign in to open this report",
        body: "This link is reserved for staff accounts.",
      },
      not_found: {
        title: "This link is not valid",
        body: "Check the code on the printed sheet, or ask the district office for a new copy.",
      },
    };
    const message = messages[data.status] ?? messages.not_found;
    return (
      <Shell>
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            {data.status === "sign_in_required" ? (
              <Lock className="size-6" />
            ) : (
              <AlertTriangle className="size-6" />
            )}
          </span>
          <h1 className="mt-3 text-lg font-semibold">{message.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{message.body}</p>
          {data.status === "sign_in_required" ? (
            <Button asChild className="mt-4 w-full">
              <Link to={`/auth?returnTo=${encodeURIComponent(`${SHARE_ROUTE}/${token}`)}`}>
                Sign in
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link to="/">Open the tracker</Link>
            </Button>
          )}
        </div>
      </Shell>
    );
  }

  /* ------------------------------------------------------------------ ok */

  const cycleLine = data.cycleNumber ? `Cycle #${data.cycleNumber}` : "";
  const signedInLatest = data.changed && data.facilityId;

  return (
    <Shell>
      {/* Header — emblem, organisation, this facility */}
      <header className="flex items-start gap-3">
        <NqasLogo className="size-11 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {ORG_NAME}
          </p>
          <h1 className="truncate text-lg font-bold leading-tight">
            {data.facilityName}
            {data.facilityType ? (
              <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                {data.facilityType}
              </span>
            ) : null}
          </h1>
          <p className="text-xs text-muted-foreground">
            NQAS Status Report · generated {istStampText(data.generatedAt)}
            {cycleLine ? ` · ${cycleLine}` : ""}
          </p>
        </div>
      </header>

      {/* Status line */}
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="size-4 shrink-0 text-emerald-600" />
          This is the report as printed
        </p>
        {data.changed && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">Data has changed since this report was generated.</span>
            {signedInLatest && (
              <Link
                to={`/facilities/${data.facilityId}`}
                className="rounded-md border border-amber-500/50 px-2 py-1 font-semibold hover:bg-amber-500/15"
              >
                Open the latest
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Preview — the PDF itself */}
      <section aria-label="Report preview" className="overflow-hidden rounded-2xl border border-border/60 bg-muted/40">
        <iframe
          aria-label="NQAS Status Report preview"
          src={fileUrl}
          className="h-[60vh] w-full bg-white sm:h-[70vh]"
        />
      </section>

      {/* Actions */}
      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <FileText className="size-4" /> Open PDF
        </a>
        {data.allowDownload ? (
          <a
            href={downloadUrl}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 text-sm font-semibold hover:bg-accent"
          >
            <Download className="size-4" /> Download PDF
          </a>
        ) : (
          <p className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-4 text-xs text-muted-foreground">
            <Lock className="size-4" /> Downloading is switched off by the administrator
          </p>
        )}
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 text-sm font-semibold hover:bg-accent sm:col-span-2"
        >
          {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
          {copied ? "Link copied" : "Share this link"}
        </button>
      </div>

      {/* Part 3 — the documents of the printed cycles, with their own
          snapshot-pinned Open / Download links. */}
      {(data.documents?.length ?? 0) > 0 && (
        <section aria-label="Documents in this report" className="rounded-2xl border border-border/60 bg-card">
          <h2 className="border-b border-border/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Documents in this report
          </h2>
          <ul className="divide-y divide-border/50">
            {(data.documents ?? []).map((doc) => (
              <li key={doc.key} className="flex items-center gap-2 px-4 py-2.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-xs">
                  {doc.fileName}
                </span>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener"
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Open
                </a>
                <a
                  href={`${doc.url}${doc.url.includes("?") ? "&" : "?"}download=1`}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Short link, for typing it by hand */}
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
        <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs">{pageUrl}</span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label="Copy this link"
          className="rounded-md p-1.5 hover:bg-accent"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>

      <Footer token={token} />
    </Shell>
  );
}

/**
 * `/r/<token>/file` — the byte endpoint on the app origin. The single-page
 * fallback serves this route, which hands the browser straight to the
 * streaming HTTP action (Content-Disposition, Range and the exact file name
 * come from that response).
 */
export function ShareFile() {
  const { token = "" } = useParams();
  const download =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("download") === "1";
  const target = shareStreamUrl(import.meta.env.VITE_CONVEX_URL, token, download);

  useEffect(() => {
    if (target) window.location.replace(target);
  }, [target]);

  return (
    <Shell>
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
        <FileText className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-semibold">
          {target ? "Opening the report…" : "This link is not valid"}
        </p>
        {target && (
          <p className="mt-1 text-xs text-muted-foreground">
            If nothing opens,{" "}
            <a className="underline" href={target}>
              download the PDF directly
            </a>
            .
          </p>
        )}
        {!target && (
          <p className="mt-1 text-xs text-muted-foreground">
            Ask the district office for a new copy.
          </p>
        )}
      </div>
    </Shell>
  );
}

/**
 * `/r/<shareToken>/d/<docToken>` — ONE document of a printed snapshot.
 *
 * The route exists so a printed link is short and readable. When Admin →
 * Shared reports sets "Require sign-in", this page asks for a sign-in first;
 * otherwise it hands the browser straight to the streaming endpoint, so a PDF
 * or image opens inline and an Excel file downloads — never a Drive id.
 */
export function ShareDocument() {
  const { token = "", docToken = "" } = useParams();
  const data = useQuery(
    api.share.resolveDocument,
    token && docToken ? { token, docToken } : "skip",
  );
  const download =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("download") === "1";
  const target = shareDocumentStreamUrl(
    import.meta.env.VITE_CONVEX_URL,
    token,
    docToken,
    download,
  );

  useEffect(() => {
    if (data?.status === "ok" && target) window.location.replace(target);
  }, [data, target]);

  if (data === undefined) {
    return (
      <Shell>
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </Shell>
    );
  }

  if (data.status === "ok") {
    return (
      <Shell>
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Opening {data.fileName}…</p>
          {target && (
            <a className="mt-2 inline-block text-xs underline" href={target}>
              Open the document directly
            </a>
          )}
        </div>
      </Shell>
    );
  }

  const signIn = data.status === "sign_in_required";
  const body = signIn
    ? "This document is reserved for staff accounts."
    : data.status === "expired"
      ? "Ask the district office for a new copy."
      : "This document link is not valid. Check the code on the printed sheet.";
  return (
    <Shell>
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
          {signIn ? <Lock className="size-6" /> : <AlertTriangle className="size-6" />}
        </span>
        <h1 className="mt-3 text-lg font-semibold">
          {signIn
            ? "Sign in to open this document"
            : data.status === "expired"
              ? "This link has expired"
              : data.status === "revoked"
                ? "This link is no longer active"
                : "This document link is not valid"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        {signIn && (
          <Button asChild className="mt-4 w-full">
            <Link
              to={`/auth?returnTo=${encodeURIComponent(`${SHARE_ROUTE}/${token}/d/${docToken}`)}`}
            >
              Sign in
            </Link>
          </Button>
        )}
      </div>
    </Shell>
  );
}

/* --------------------------------------------------------------------------- */
/* Chrome shared by both routes                                                */
/* --------------------------------------------------------------------------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        <div className="space-y-4">{children}</div>
      </div>
    </main>
  );
}

function Footer({ token }: { token: string }) {
  return (
    <footer className="space-y-2 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
      <p>
        Confidential. Facility quality data. Handle per {ORG_NAME} guidelines.
      </p>
      <p>
        <Link
          to={`/auth?returnTo=${encodeURIComponent(`${SHARE_ROUTE}/${token}`)}`}
          className="underline underline-offset-2 hover:text-foreground"
        >
          Sign in
        </Link>{" "}
        for staff access
      </p>
    </footer>
  );
}
