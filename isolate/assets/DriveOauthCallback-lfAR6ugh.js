import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, be as Cloud, C as CircleCheck, L as LoaderCircle, T as TriangleAlert } from './icons-BxQpodNr.js';
import { o as useAction, j as api, w as ConvexError, L as Link } from './index-CBV6wOh8.js';
import { b as driveOauthFlagFromError } from './driveCredentials-UmvYLo_X.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';

function googleErrorFlag(error) {
  if (error === "access_denied") return "denied";
  if (error === "redirect_uri_mismatch") return "mismatch";
  if (error === "invalid_client") return "invalid-client";
  if (error === "access_blocked" || error === "unverified_client" || error === "admin_policy_enforced")
    return "unverified";
  return "error";
}
function DriveOauthCallback() {
  const completeConsent = useAction(api.drive.completeConsent);
  const [phase, setPhase] = reactExports.useState("finishing");
  const started = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") ?? "";
    const state = params.get("state") ?? "";
    const googleError = params.get("error") ?? "";
    if (!code && !state && !googleError) {
      setPhase("nothing-to-do");
      return;
    }
    const goBack = (flag) => {
      window.location.replace(`/admin?drive=${encodeURIComponent(flag)}`);
    };
    const earlyFlag = googleError ? googleErrorFlag(googleError) : !code || !state ? "bad-state" : null;
    if (earlyFlag) {
      goBack(earlyFlag);
      return;
    }
    void (async () => {
      try {
        await completeConsent({ code, state });
        setPhase("done");
        window.setTimeout(() => goBack("connected"), 800);
      } catch (err) {
        const message = err instanceof ConvexError ? typeof err.data === "string" ? err.data : "" : err instanceof Error ? err.message : "";
        goBack(driveOauthFlagFromError(message));
      }
    })();
  }, [completeConsent]);
  if (phase === "nothing-to-do") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex min-h-screen items-center justify-center bg-background p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass w-full max-w-lg rounded-xl border border-border/60 p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "flex items-center gap-2 text-lg font-semibold text-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Cloud, { className: "size-5 text-primary" }),
        " Google Drive connection"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm leading-relaxed text-muted-foreground", children: "This address is only used to finish connecting Google Drive — Google sends the admin back here after the consent screen, with a one-time code. There is nothing to do here on its own." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-sm leading-relaxed text-muted-foreground", children: [
        "To connect Drive, open ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-foreground", children: "Admin Settings → Google Drive" }),
        " and press",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-foreground", children: "Connect Google Drive" }),
        "."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Link,
        {
          to: "/admin",
          className: "mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          children: "Go to Google Drive settings"
        }
      )
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex min-h-screen items-center justify-center bg-background p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass flex w-full max-w-lg items-start gap-3 rounded-xl border border-border/60 p-6", children: [
    phase === "done" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "mt-0.5 size-5 shrink-0 text-emerald-600" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mt-0.5 size-5 shrink-0 animate-spin text-primary" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-base font-semibold text-foreground", children: phase === "done" ? "Google Drive connected" : "Finishing the Google Drive connection…" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm leading-relaxed text-muted-foreground", children: phase === "done" ? "The connection is stored. Returning to Admin Settings → Google Drive…" : "Exchanging the consent code and saving the connection — this takes a few seconds. Nothing secret is shown on this page." }),
      phase !== "done" && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 flex items-center gap-1.5 text-xs text-muted-foreground/80", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5" }),
        "Do not close this tab."
      ] })
    ] })
  ] }) });
}

export { DriveOauthCallback as default };
