import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, bt as KeyRound, bq as LogOut, cc as Smartphone, cd as Monitor, L as LoaderCircle } from './icons-BxQpodNr.js';
import { l as useQuery, j as api, m as useMutation, B as Button, L as Link, t as toast } from './index-CBV6wOh8.js';
import { S as Skeleton } from './skeleton-D-jVDmpg.js';
import { aH as toDisplayStamp } from './AppShell-CP099uvN.js';
import { j as groupSessions, k as nowMs, p as parseDevice, l as isInactiveSession, r as relativeTime } from './profileConfig-2XTKYoy2.js';
import './vendor-jspdf-BarNdCns.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';

function SecurityTab({ hasPassword }) {
  const data = useQuery(api.profile.mySessions, {});
  const signOutOthers = useMutation(api.profile.signOutOtherSessions);
  const signOutOne = useMutation(api.profile.signOutSession);
  const [expanded, setExpanded] = reactExports.useState(false);
  const [confirming, setConfirming] = reactExports.useState(false);
  const [busy, setBusy] = reactExports.useState(false);
  const [endingId, setEndingId] = reactExports.useState(null);
  const rows = data?.sessions ?? [];
  const current = rows.find((r) => r.current) ?? null;
  const others = rows.filter((r) => !r.current);
  const now = nowMs();
  const endOthers = async () => {
    setBusy(true);
    try {
      const res = await signOutOthers();
      toast.success("Other devices signed out", {
        description: `${res.removed} session${res.removed === 1 ? "" : "s"} ended. This device stays signed in.`
      });
      setExpanded(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign out the other devices");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };
  const endOne = async (row) => {
    setEndingId(row.id);
    try {
      await signOutOne({ sessionId: row.id });
      toast.success("Device signed out");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign out that device");
    } finally {
      setEndingId(null);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "data-testid": "security-tab",
      className: "rounded-xl border border-border/60 bg-card p-4",
      "aria-label": "Security",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold", children: "Security" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: "Password sign-in — there is no Google or SSO sign-in in this app." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex min-h-10 items-center justify-between gap-3 border-b border-border/40 px-3 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[13px] font-medium", children: "Password" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block text-[11px] text-muted-foreground", children: hasPassword ? "Set a new password with a code sent to your email." : "This account signs in with an emailed code." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, size: "sm", variant: "outline", className: "shrink-0 gap-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/auth", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(KeyRound, { className: "size-3.5" }),
            " Change password"
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex flex-wrap items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[13px] font-semibold", children: "Active sessions" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", "data-testid": "sessions-summary", children: data === void 0 ? "Loading your devices…" : `${rows.length} device${rows.length === 1 ? "" : "s"} · expire after ${data.lifetimeDays} days without activity` })
          ] }),
          others.length > 0 && (confirming ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "sm",
                className: "h-8",
                "data-testid": "sessions-end-others-confirm",
                disabled: busy,
                onClick: () => void endOthers(),
                children: busy ? "Signing out…" : `End ${others.length}`
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "sm",
                variant: "ghost",
                className: "h-8",
                disabled: busy,
                onClick: () => setConfirming(false),
                children: "Cancel"
              }
            )
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              size: "sm",
              variant: "outline",
              className: "gap-1.5",
              "data-testid": "sessions-end-others",
              disabled: busy,
              onClick: () => setConfirming(true),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "size-3.5" }),
                " Sign out other devices"
              ]
            }
          ))
        ] }),
        data === void 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-2", "data-testid": "sessions-skeleton", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-10 w-full" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-10 w-full" })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 overflow-hidden rounded-lg border border-border/60", children: [
          current ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            SessionLine,
            {
              row: current,
              now,
              current: true,
              busy: false,
              onSignOut: () => void 0
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-3 py-2 text-xs text-muted-foreground", children: "This device is not signed in (reload the page)." }),
          others.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                "data-testid": "sessions-toggle-others",
                "aria-expanded": expanded,
                onClick: () => setExpanded((v) => !v),
                className: "flex min-h-10 w-full items-center justify-between gap-2 border-t border-border/40 bg-muted/40 px-3 text-left text-xs font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    others.length,
                    " other device",
                    others.length === 1 ? "" : "s"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: expanded ? "Hide" : "Show" })
                ]
              }
            ),
            expanded && groupSessions(others).map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-testid": `sessions-group-${group.key}`, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1.5 border-t border-border/40 bg-background/60 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground", children: [
                /android|iphone|ipad/i.test(group.device.os) ? /* @__PURE__ */ jsxRuntimeExports.jsx(Smartphone, { className: "size-3.5", "aria-hidden": "true" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Monitor, { className: "size-3.5", "aria-hidden": "true" }),
                group.device.label,
                group.sessions.length > 1 ? ` · ${group.sessions.length}` : ""
              ] }),
              group.sessions.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                SessionLine,
                {
                  row,
                  now,
                  busy: endingId === row.id,
                  onSignOut: () => void endOne(row)
                },
                row.id
              ))
            ] }, group.key))
          ] })
        ] })
      ]
    }
  );
}
function SessionLine({
  row,
  now,
  current,
  busy,
  onSignOut
}) {
  const device = row.userAgent ? parseDevice(row.userAgent) : null;
  const inactive = !current && isInactiveSession(row.lastActive, now);
  const isTouch = /android|iphone|ipad/i.test(device?.os ?? "");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-testid": current ? "session-current" : `session-${row.id}`,
      className: "flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/40 px-3 py-2 first:border-t-0",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex flex-wrap items-center gap-1.5 text-[13px] font-medium", children: [
            isTouch ? /* @__PURE__ */ jsxRuntimeExports.jsx(Smartphone, { className: "size-3.5 text-muted-foreground", "aria-hidden": "true" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Monitor, { className: "size-3.5 text-muted-foreground", "aria-hidden": "true" }),
            device ? device.label : "Unknown device",
            current && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                "data-testid": "session-current-badge",
                className: "rounded-full border border-primary/30 bg-primary/5 px-1.5 py-px text-[10px] font-semibold text-primary",
                children: "This device"
              }
            ),
            inactive && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                "data-testid": "session-inactive",
                className: "rounded-full border border-border/70 bg-muted px-1.5 py-px text-[10px] font-semibold text-muted-foreground",
                children: "Inactive"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { "data-tip": row.createdAt ? toDisplayStamp(row.createdAt) : void 0, children: [
              "signed in ",
              relativeTime(row.createdAt, now)
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true", children: "·" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { "data-tip": row.lastActive ? toDisplayStamp(row.lastActive) : void 0, children: [
              "last active ",
              relativeTime(row.lastActive, now)
            ] }),
            row.region && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true", children: "·" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: row.region })
            ] })
          ] })
        ] }),
        !current && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            type: "button",
            size: "sm",
            variant: "ghost",
            className: "h-8 shrink-0 gap-1 text-xs",
            "data-testid": `session-signout-${row.id}`,
            disabled: busy,
            onClick: onSignOut,
            children: [
              busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "size-3.5" }),
              "Sign out"
            ]
          }
        )
      ]
    }
  );
}

export { SecurityTab as default };
