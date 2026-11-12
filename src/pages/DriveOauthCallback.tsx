/**
 * DRIVE OAUTH CALLBACK — /drive/oauth/callback
 *
 * Google returns the State Admin here after the consent screen (this exact
 * URI is registered under Authorized redirect URIs in Google Cloud). The page:
 *
 *   1. reads `code` + `state` (or Google's `error`) from the URL,
 *   2. calls the public `drive.completeConsent` action, which validates
 *      the single-use state, exchanges the code with the PKCE verifier and
 *      stores the refresh token encrypted — no token or secret ever reaches
 *      this page,
 *   3. lands on Admin → Google Drive with `?drive=<flag>`, where the panel
 *      shows the readable success / error notice.
 *
 * Opened WITHOUT code and state (someone typed the address), it shows a
 * friendly explanation instead of the router's bare 404.
 *
 * The route is wrapped in RequireAuth in main.tsx: the finishing action needs
 * a State Admin session, and RequireAuth preserves the full callback URL in
 * /auth?returnTo=… so signing in returns here with the code still valid.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { AlertTriangle, CheckCircle2, Cloud, Loader2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { driveOauthFlagFromError } from "@/lib/driveCredentials";

type Phase = "finishing" | "done" | "nothing-to-do";

/** Google's own `error=…` values → the flags the Admin panel understands. */
function googleErrorFlag(error: string): string {
  if (error === "access_denied") return "denied";
  if (error === "redirect_uri_mismatch") return "mismatch";
  if (error === "invalid_client") return "invalid-client";
  if (error === "access_blocked" || error === "unverified_client" || error === "admin_policy_enforced")
    return "unverified";
  return "error";
}

export default function DriveOauthCallback() {
  const completeConsent = useAction(api.drive.completeConsent);
  const [phase, setPhase] = useState<Phase>("finishing");
  // The authorization code is single-use — never run the exchange twice
  // (React StrictMode re-runs effects in development).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") ?? "";
    const state = params.get("state") ?? "";
    const googleError = params.get("error") ?? "";

    // Opened by hand — nothing to finish. Friendly page, no redirect.
    if (!code && !state && !googleError) {
      setPhase("nothing-to-do");
      return;
    }

    const goBack = (flag: string) => {
      window.location.replace(`/admin?drive=${encodeURIComponent(flag)}`);
    };

    // A problem Google reported, or a callback that cannot possibly complete.
    const earlyFlag = googleError
      ? googleErrorFlag(googleError)
      : !code || !state
        ? "bad-state"
        : null;
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
        const message =
          err instanceof ConvexError
            ? typeof err.data === "string"
              ? err.data
              : ""
            : err instanceof Error
              ? err.message
              : "";
        goBack(driveOauthFlagFromError(message));
      }
    })();
  }, [completeConsent]);

  if (phase === "nothing-to-do") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="glass w-full max-w-lg rounded-xl border border-border/60 p-6">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Cloud className="size-5 text-primary" /> Google Drive connection
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This address is only used to finish connecting Google&nbsp;Drive —
            Google sends the admin back here after the consent screen, with a
            one-time code. There is nothing to do here on its own.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            To connect Drive, open <strong className="text-foreground">Admin
            Settings → Google Drive</strong> and press{" "}
            <strong className="text-foreground">Connect Google Drive</strong>.
          </p>
          <Link
            to="/admin"
            className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to Google Drive settings
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass flex w-full max-w-lg items-start gap-3 rounded-xl border border-border/60 p-6">
        {phase === "done" ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        ) : (
          <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-primary" />
        )}
        <div>
          <h1 className="text-base font-semibold text-foreground">
            {phase === "done"
              ? "Google Drive connected"
              : "Finishing the Google Drive connection…"}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {phase === "done"
              ? "The connection is stored. Returning to Admin Settings → Google Drive…"
              : "Exchanging the consent code and saving the connection — this takes a few seconds. Nothing secret is shown on this page."}
          </p>
          {phase !== "done" && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground/80">
              <AlertTriangle className="size-3.5" />
              Do not close this tab.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
