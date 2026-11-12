const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/SecurityTab-C0Fvdlu5.js","assets/vendor-motion-DgC1stbS.js","assets/icons-BxQpodNr.js","assets/index-CBV6wOh8.js","assets/vendor-jspdf-BarNdCns.js","assets/vendor-charts--qXk384P.js","assets/index-CneVNiou.css","assets/skeleton-D-jVDmpg.js","assets/AppShell-CP099uvN.js","assets/NqasLogo-CIWlMexW.js","assets/label-BaPkqXdo.js","assets/shareLink-_K-oJu5R.js","assets/profileConfig-2XTKYoy2.js","assets/ActivityTab-DNMeZfjG.js","assets/AvatarCropper-C3cJhsZx.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';
import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, bI as Camera, br as UserRound, ar as Trash2, bq as LogOut, a7 as Pencil, m as Check, a$ as Settings, L as LoaderCircle, ax as Save } from './icons-BxQpodNr.js';
import { c as cn, B as Button, l as useQuery, j as api, m as useMutation, o as useAction, u as useAuth, d as useSearchParams, L as Link, t as toast } from './index-CBV6wOh8.js';
import { aH as toDisplayStamp, Z as Switch, D as DEFAULT_SETTINGS, b2 as ADMIN_NAV_KEY, A as AppShell } from './AppShell-CP099uvN.js';
import { S as Skeleton } from './skeleton-D-jVDmpg.js';
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from './tabs-siU4Pie8.js';
import { I as Input } from './input-Cy2oZLur.js';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-qTILnHQg.js';
import { i as isSamplePhone, v as validateProfileField, n as normalizePhone, f as formatPhone, P as PHONE_HINT, D as DENSITY_OPTIONS, a as SIDEBAR_OPTIONS, L as LANDING_PAGES, R as ROWS_PER_PAGE_OPTIONS, F as FORMAT_NOTE, N as NOTIFICATION_ROWS, b as DIGEST_OPTIONS, c as DEFAULT_PROFILE_TAB, d as isProfileTab, e as profileTabStorageKey, g as profileCompleteness, h as PROFILE_TABS } from './profileConfig-2XTKYoy2.js';
import './vendor-charts--qXk384P.js';
import './NqasLogo-CIWlMexW.js';
import './label-BaPkqXdo.js';
import './shareLink-_K-oJu5R.js';

function initials(name, email) {
  return (name || email || "U").split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}
function lastSignInLabel(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = /* @__PURE__ */ new Date();
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  const pad = (n) => String(n).padStart(2, "0");
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return sameDay ? `Today ${time}` : `${toDisplayStamp(ts)}`;
}
function IdentityCard({
  name,
  email,
  roleTag,
  scope,
  avatarSrc,
  signedInAt,
  completeness,
  othersCount,
  busy,
  signingOut,
  onChangePhoto,
  onRemovePhoto,
  onSignOut,
  onSignOutOthers
}) {
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const [failedSrc, setFailedSrc] = reactExports.useState(null);
  const [imgLoading, setImgLoading] = reactExports.useState(true);
  const [confirmOthers, setConfirmOthers] = reactExports.useState(false);
  const menuRef = reactExports.useRef(null);
  const avatarRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        avatarRef.current?.focus();
      }
    };
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [menuOpen]);
  const showImage = !!avatarSrc && avatarSrc !== failedSrc;
  const initialsText = initials(name, email);
  const missingTip = completeness.missing.length === 0 ? "Profile complete" : `Missing: ${completeness.missing.join(", ")}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "aside",
    {
      "data-testid": "profile-identity",
      className: "glass hidden h-fit rounded-xl border border-border/60 p-4 lg:sticky lg:top-20 lg:block",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              ref: avatarRef,
              type: "button",
              "data-testid": "profile-avatar",
              "aria-haspopup": "menu",
              "aria-expanded": menuOpen,
              "aria-label": showImage ? "Profile photo — change or remove" : "Add a profile photo",
              onClick: () => setMenuOpen((v) => !v),
              className: "group relative size-16 shrink-0 overflow-hidden rounded-full border border-border/60 bg-primary/10 text-lg font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              children: [
                showImage ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: avatarSrc ?? "",
                    alt: "",
                    "data-testid": "profile-avatar-image",
                    onLoad: () => setImgLoading(false),
                    onError: () => {
                      setFailedSrc(avatarSrc ?? null);
                      setImgLoading(false);
                    },
                    className: cn("size-full object-cover", imgLoading && "opacity-0")
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-testid": "profile-avatar-initials", className: "flex size-full items-center justify-center", children: initialsText }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-0 flex items-center justify-center bg-foreground/45 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "size-5 text-white", "aria-hidden": "true" }) })
              ]
            }
          ),
          menuOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              ref: menuRef,
              role: "menu",
              "aria-label": "Photo options",
              "data-testid": "profile-avatar-menu",
              className: "absolute top-full left-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-border/60 bg-popover p-1 shadow-md",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    role: "menuitem",
                    "data-testid": "profile-avatar-change",
                    onClick: () => {
                      setMenuOpen(false);
                      onChangePhoto();
                    },
                    className: "flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm hover:bg-muted",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(UserRound, { className: "size-4 text-muted-foreground", "aria-hidden": "true" }),
                      avatarSrc ? "Change photo" : "Upload photo"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    role: "menuitem",
                    "data-testid": "profile-avatar-remove",
                    disabled: !avatarSrc || busy,
                    onClick: () => {
                      setMenuOpen(false);
                      onRemovePhoto();
                    },
                    className: "flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm hover:bg-muted disabled:opacity-50",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-4 text-muted-foreground", "aria-hidden": "true" }),
                      "Remove photo"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2.5 pt-1 pb-1.5 text-[11px] leading-snug text-muted-foreground", children: "Cropped to a square and resized to 256 px — stored with your account, never a public link." })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 truncate text-base font-semibold", "data-testid": "profile-display-name", children: name || "Your name" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 flex flex-wrap items-center gap-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            "data-testid": "profile-role",
            className: "inline-flex rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary",
            children: roleTag
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            className: "mt-2 text-xs text-muted-foreground",
            "data-tip": "Set by a State Admin in Admin → Users",
            "data-testid": "profile-scope",
            children: scope
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 truncate text-xs font-medium text-foreground", "data-testid": "profile-email", children: email || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[11px] leading-snug text-muted-foreground", children: "Your sign-in address; ask a State Admin to change it." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "p",
          {
            className: "mt-3 text-[11px] text-muted-foreground",
            "data-tip": signedInAt ? toDisplayStamp(signedInAt) : void 0,
            "data-testid": "profile-last-signin",
            children: [
              "Last sign-in ",
              lastSignInLabel(signedInAt),
              " · this device"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3", "data-tip": missingTip, "data-testid": "profile-completeness", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-[11px] text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Profile completeness" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold tabular-nums text-foreground", children: [
              completeness.percent,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              role: "progressbar",
              "aria-valuenow": completeness.percent,
              "aria-valuemin": 0,
              "aria-valuemax": 100,
              "aria-label": "Profile completeness",
              className: "mt-1 h-1.5 overflow-hidden rounded-full bg-muted",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "h-full rounded-full bg-primary transition-[width]",
                  style: { width: `${completeness.percent}%` }
                }
              )
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex flex-col gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              type: "button",
              size: "sm",
              variant: "outline",
              "data-testid": "profile-sign-out",
              className: "gap-1.5",
              onClick: onSignOut,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "size-3.5" }),
                " Sign out"
              ]
            }
          ),
          othersCount > 0 && (confirmOthers ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-amber-300/60 bg-amber-50 p-2 text-[11px] text-amber-900", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-1.5", children: [
              "End ",
              othersCount,
              " other device",
              othersCount === 1 ? "" : "s",
              "? This device stays signed in."
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  size: "sm",
                  className: "h-8 flex-1",
                  "data-testid": "profile-sign-out-others-confirm",
                  disabled: signingOut,
                  onClick: () => {
                    setConfirmOthers(false);
                    onSignOutOthers();
                  },
                  children: signingOut ? "Signing out…" : "Sign out others"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  size: "sm",
                  variant: "ghost",
                  className: "h-8 flex-1",
                  disabled: signingOut,
                  onClick: () => setConfirmOthers(false),
                  children: "Keep"
                }
              )
            ] })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              type: "button",
              size: "sm",
              variant: "ghost",
              "data-testid": "profile-sign-out-others",
              className: "gap-1.5",
              onClick: () => setConfirmOthers(true),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "size-3.5" }),
                " Sign out other devices (",
                othersCount,
                ")"
              ]
            }
          ))
        ] })
      ]
    }
  );
}
function IdentityHeader({
  name,
  roleTag,
  avatarSrc
}) {
  const [imgOk, setImgOk] = reactExports.useState(true);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-testid": "profile-identity-compact",
      className: "mb-3 flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 lg:hidden",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary", children: avatarSrc && imgOk ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: avatarSrc,
            alt: "",
            onError: () => setImgOk(false),
            className: "size-full object-cover"
          }
        ) : initials(name, "") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-sm font-semibold", children: name || "Your name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-[11px] text-muted-foreground", children: roleTag })
        ] })
      ]
    }
  );
}

function FieldEditor({
  label,
  type,
  value,
  options,
  validate,
  onCommit,
  onCancel,
  testId
}) {
  const [draft, setDraft] = reactExports.useState(value);
  const [error, setError] = reactExports.useState(null);
  const cancelled = reactExports.useRef(false);
  const hintId = reactExports.useId();
  const commit = () => {
    const message = validate?.(draft) ?? null;
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    onCommit(draft.trim());
  };
  const cancel = () => {
    cancelled.current = true;
    setError(null);
    onCancel();
  };
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };
  const onBlur = () => {
    if (cancelled.current) return;
    commit();
  };
  if (type === "segmented" && options && options.length > 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center gap-2", "data-testid": testId, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          role: "group",
          "aria-label": label,
          className: "flex gap-1 rounded-md border border-border/60 bg-muted/40 p-0.5",
          children: options.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "aria-pressed": draft === opt.value,
              "data-testid": testId ? `${testId}-${opt.value}` : void 0,
              onClick: () => {
                setDraft(opt.value);
                setError(null);
                onCommit(opt.value);
              },
              className: cn(
                "min-h-8 rounded px-2.5 text-xs font-medium transition-colors",
                draft === opt.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              ),
              children: opt.label
            },
            opt.value
          ))
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FieldMessage, { error, hintId })
    ] });
  }
  if (type === "select" && options) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center gap-2", "data-testid": testId, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Select,
        {
          value: draft,
          onValueChange: (next) => {
            setDraft(next);
            setError(null);
            onCommit(next);
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { autoFocus: true, className: "h-8 min-w-40 text-sm", "aria-label": label, children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Select…" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: options.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: opt.value, disabled: opt.value === "", children: opt.label }, opt.value)) })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FieldMessage, { error, hintId })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex w-full items-center gap-2", "data-testid": testId, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Input,
      {
        autoFocus: true,
        type: type === "number" ? "number" : "text",
        inputMode: type === "tel" ? "tel" : void 0,
        value: draft,
        onChange: (e) => {
          setDraft(e.target.value);
          if (error) setError(null);
        },
        onKeyDown,
        onBlur,
        "aria-label": label,
        "aria-invalid": error ? true : void 0,
        "aria-describedby": error ? hintId : void 0,
        className: cn("h-8 min-w-0 flex-1 text-sm", error && "border-destructive")
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FieldMessage, { error, hintId })
  ] });
}
function FieldMessage({ error, hintId }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      id: hintId,
      role: error ? "alert" : void 0,
      className: cn(
        "pointer-events-none absolute top-full left-2 z-10 mt-0.5 max-w-[min(92%,28rem)] rounded-md border border-border/60 bg-popover px-2 py-1 text-[11px] leading-tight font-medium shadow-sm",
        error ? "text-destructive" : "hidden"
      ),
      children: error
    }
  );
}
function EditableRow({
  label,
  value,
  display,
  type,
  options,
  validate,
  onCommit,
  disabled,
  disabledReason,
  placeholder = "Not set",
  testId
}) {
  const [editing, setEditing] = reactExports.useState(false);
  const shown = display ?? value;
  const empty = !value.trim();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "group relative grid h-10 grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-3 border-b border-border/40 px-3 last:border-b-0",
      "data-testid": testId,
      "data-row-label": label,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate text-[13px] text-muted-foreground", children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0", children: editing ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          FieldEditor,
          {
            label,
            type,
            value,
            options,
            validate,
            onCommit: (next) => {
              onCommit(next);
              setEditing(false);
            },
            onCancel: () => setEditing(false),
            testId: testId ? `${testId}-editor` : void 0
          }
        ) : disabled ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "block min-w-0 truncate text-right text-sm text-muted-foreground",
            "data-tip": disabledReason,
            children: shown || placeholder
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            "data-testid": testId ? `${testId}-edit` : void 0,
            onClick: () => setEditing(true),
            onKeyDown: (e) => {
              if (e.key === "Enter" || e.key === "F2") {
                e.preventDefault();
                setEditing(true);
              }
            },
            "aria-label": `${label}: ${shown || placeholder}. Edit`,
            className: "flex h-10 w-full items-center justify-end gap-1.5 rounded-md px-1.5 text-right text-sm transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("min-w-0 truncate", empty && "text-muted-foreground/70 italic"), children: shown || placeholder }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Pencil,
                {
                  className: "size-3 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
                  "aria-hidden": true
                }
              )
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-3", "aria-hidden": "true" })
      ]
    }
  );
}
function Segmented({
  label,
  value,
  options,
  onChange,
  testId
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      role: "group",
      "aria-label": label,
      "data-testid": testId,
      className: "inline-flex gap-1 rounded-lg border border-border/60 bg-muted/40 p-0.5",
      children: options.map((opt) => {
        const active = String(value) === String(opt.value);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            "aria-pressed": active,
            "data-testid": testId ? `${testId}-${opt.value}` : void 0,
            onClick: () => onChange(opt.value),
            className: cn(
              "inline-flex min-h-8 items-center gap-1 rounded-md px-3 text-xs font-medium transition-colors",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            ),
            children: [
              active && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3", "aria-hidden": "true" }),
              opt.label
            ]
          },
          opt.value
        );
      })
    }
  );
}

function ProfileTab({
  values,
  language,
  onCommit,
  onLanguage
}) {
  const sample = isSamplePhone(values.phone);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "data-testid": "profile-tab",
      className: "rounded-xl border border-border/60 bg-card p-4",
      "aria-label": "Personal details",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold", children: "Personal details" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: "How your name appears in audits and exports." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 -mx-3 border-t border-border/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            EditableRow,
            {
              testId: "profile-field-name",
              label: "Display name",
              value: values.name,
              validate: (v) => validateProfileField("name", v),
              onCommit: (v) => onCommit("name", v)
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            EditableRow,
            {
              testId: "profile-field-designation",
              label: "Designation",
              value: values.designation,
              placeholder: "Not set",
              validate: (v) => validateProfileField("designation", v),
              onCommit: (v) => onCommit("designation", v)
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            EditableRow,
            {
              testId: "profile-field-phone",
              label: "Phone",
              value: values.phone,
              display: formatPhone(values.phone),
              type: "tel",
              placeholder: "Not set",
              validate: (v) => v.trim() ? normalizePhone(v).error : null,
              onCommit: (v) => onCommit("phone", normalizePhone(v).value)
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            EditableRow,
            {
              testId: "profile-field-language",
              label: "Language",
              value: language,
              display: language === "ta" ? "தமிழ் (Tamil)" : "English",
              type: "select",
              options: [
                { value: "en", label: "English" },
                { value: "ta", label: "தமிழ் (Tamil) — coming soon" }
              ],
              onCommit: onLanguage
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-[11px] leading-snug text-muted-foreground", children: sample ? "The stored phone number is the old sample value — open the row and enter your own number, or clear it." : `Phone numbers keep the country code (${PHONE_HINT}).` })
      ]
    }
  );
}

function PreferencesTab({
  preferences,
  savedKey,
  onUndo,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "data-testid": "preferences-tab",
      className: "rounded-xl border border-border/60 bg-card p-4",
      "aria-label": "Preferences",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold", children: "Preferences" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: "Applied on every device, as soon as you change them." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SavedMarker, { show: savedKey?.startsWith("preferences."), onUndo })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 -mx-3 border-t border-border/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(PrefRow, { label: "Table density", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Segmented,
            {
              testId: "pref-density",
              label: "Table density",
              value: String(preferences.density ?? "comfortable"),
              options: DENSITY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
              onChange: (v) => onChange("density", v)
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(PrefRow, { label: "Sidebar default", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Segmented,
            {
              testId: "pref-sidebar",
              label: "Sidebar default",
              value: String(preferences.sidebar ?? "expanded"),
              options: SIDEBAR_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
              onChange: (v) => onChange("sidebar", v)
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(PrefRow, { label: "Default landing page", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: String(preferences.landingPage ?? "/dashboard"),
              onValueChange: (v) => onChange("landingPage", v),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-56 text-sm", "aria-label": "Default landing page", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: LANDING_PAGES.map(([value, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value, children: label }, value)) })
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(PrefRow, { label: "Rows per page", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Segmented,
            {
              testId: "pref-rows",
              label: "Rows per page",
              value: String(preferences.rowsPerPage ?? 50),
              options: ROWS_PER_PAGE_OPTIONS.map((n) => ({ value: String(n), label: String(n) })),
              onChange: (v) => onChange("rowsPerPage", Number(v))
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(PrefRow, { label: "Highlight recently updated cells", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              checked: preferences.highlightUpdates !== false,
              onCheckedChange: (v) => onChange("highlightUpdates", v),
              "aria-label": "Highlight recently updated cells",
              "data-testid": "pref-highlight"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(PrefRow, { label: "First-visit tips", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              checked: preferences.firstVisitTips !== false,
              onCheckedChange: (v) => onChange("firstVisitTips", v),
              "aria-label": "First-visit tips",
              "data-testid": "pref-tips"
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-[11px] text-muted-foreground", children: FORMAT_NOTE })
      ]
    }
  );
}
function PrefRow({ label, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-10 flex-wrap items-center justify-between gap-2 border-b border-border/40 px-3 py-1.5 last:border-b-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[13px] text-muted-foreground", children: label }),
    children
  ] });
}
function SavedMarker({ show, onUndo }) {
  if (!show) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      "data-testid": "pref-saved",
      className: "inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700",
      role: "status",
      children: [
        "Saved ✓",
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onUndo,
            className: "rounded px-1 font-semibold text-primary underline-offset-2 hover:underline",
            children: "Undo"
          }
        )
      ]
    }
  );
}

function NotificationsTab({
  notifications,
  email,
  savedKey,
  onUndo,
  onChange
}) {
  const hasEmail = email.trim().length > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "data-testid": "notifications-tab",
      className: "rounded-xl border border-border/60 bg-card p-4",
      "aria-label": "Notifications",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold", children: "Notifications" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: "What reaches you in-app and by email." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SavedMarker, { show: savedKey?.startsWith("notifications."), onUndo })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 overflow-hidden rounded-lg border border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full border-collapse text-sm", "data-testid": "notifications-matrix", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "px-3 py-2 font-medium", children: "Notification" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "w-28 px-3 py-2 text-center font-medium", children: "In-app" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "w-28 px-3 py-2 text-center font-medium", children: "Email" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: NOTIFICATION_ROWS.map((row) => {
            const inApp = notifications[row.inAppKey] !== false;
            const emailOn = notifications[row.emailKey] === true;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border/40", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "row", className: "px-3 py-2 text-left text-[13px] font-normal", children: row.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                StateToggle,
                {
                  testId: `notif-${row.key}-inapp`,
                  label: `${row.label} — in-app`,
                  on: inApp,
                  onChange: (v) => onChange(row.inAppKey, v)
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                StateToggle,
                {
                  testId: `notif-${row.key}-email`,
                  label: `${row.label} — email`,
                  on: emailOn,
                  disabled: !hasEmail,
                  onChange: (v) => onChange(row.emailKey, v)
                }
              ) })
            ] }, row.key);
          }) })
        ] }) }),
        !hasEmail && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[11px] text-muted-foreground", children: "Email notifications are unavailable — your account has no email address." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex min-h-10 flex-wrap items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[13px] text-muted-foreground", children: "Digest frequency" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Segmented,
            {
              testId: "notif-digest",
              label: "Digest frequency",
              value: String(notifications.digest ?? "daily"),
              options: DIGEST_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
              onChange: (v) => onChange("digest", v)
            }
          )
        ] })
      ]
    }
  );
}
function StateToggle({
  label,
  on,
  disabled,
  onChange,
  testId
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": on,
      "aria-label": label,
      "data-testid": testId,
      "data-state": on ? "on" : "off",
      disabled,
      "data-tip": disabled ? `${label} — unavailable` : void 0,
      onClick: () => onChange(!on),
      className: cn(
        "inline-flex h-8 min-w-20 items-center justify-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        on ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-background text-muted-foreground hover:border-foreground/40",
        disabled && "cursor-not-allowed opacity-50"
      ),
      children: on ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5", "aria-hidden": "true" }),
        " On"
      ] }) : "Off"
    }
  );
}

const SecurityTab = reactExports.lazy(() => __vitePreload(() => import('./SecurityTab-C0Fvdlu5.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12]):void 0));
const ActivityTab = reactExports.lazy(() => __vitePreload(() => import('./ActivityTab-DNMeZfjG.js'),true              ?__vite__mapDeps([13,1,2,3,4,5,6,7,8,9,10,11,12]):void 0));
const AvatarCropper = reactExports.lazy(() => __vitePreload(() => import('./AvatarCropper-C3cJhsZx.js'),true              ?__vite__mapDeps([14,1,2,3,4,5,6]):void 0));
const PANEL_MAX = "lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto";
function Profile() {
  const data = useQuery(api.profile.myProfile, {});
  const update = useMutation(api.profile.updateMyProfile);
  const uploadAvatar = useAction(api.profile.uploadAvatar);
  const removeAvatarAction = useAction(api.profile.removeAvatar);
  const signOutOthers = useMutation(api.profile.signOutOtherSessions);
  const { signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = data?.user.appRole === "admin";
  const settingsQ = useQuery(api.facilities.getAppSettings, isAdmin ? {} : "skip");
  const adminHidden = isAdmin && (settingsQ?.settings.hiddenPages ?? DEFAULT_SETTINGS.hiddenPages).includes(
    ADMIN_NAV_KEY
  );
  const [draft, setDraft] = reactExports.useState(null);
  const [preferences, setPreferences] = reactExports.useState(null);
  const [notifications, setNotifications] = reactExports.useState(null);
  const [avatarSrc, setAvatarSrc] = reactExports.useState(null);
  const [activeTab, setActiveTab] = reactExports.useState(DEFAULT_PROFILE_TAB);
  const [saving, setSaving] = reactExports.useState(false);
  const [photoBusy, setPhotoBusy] = reactExports.useState(false);
  const [signingOut, setSigningOut] = reactExports.useState(false);
  const [cropSrc, setCropSrc] = reactExports.useState(null);
  const [savedMarker, setSavedMarker] = reactExports.useState(null);
  const loadedRef = reactExports.useRef(false);
  const savedTimer = reactExports.useRef(null);
  const fileRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!data || loadedRef.current) return;
    loadedRef.current = true;
    setDraft({
      name: data.user.name,
      designation: data.user.designation,
      phone: data.user.phone
    });
    setPreferences(data.preferences);
    setNotifications(data.notifications);
    setAvatarSrc(data.avatar.url ?? data.user.image ?? null);
    const fromUrl = searchParams.get("tab");
    let initial = DEFAULT_PROFILE_TAB;
    if (isProfileTab(fromUrl)) {
      initial = fromUrl;
    } else {
      try {
        const stored = window.localStorage.getItem(profileTabStorageKey(data.user.id));
        if (isProfileTab(stored)) initial = stored;
      } catch {
      }
    }
    setActiveTab(initial);
    if (initial !== fromUrl) {
      setSearchParams({ tab: initial }, { replace: true });
    }
  }, [data]);
  const goToTab = (next) => {
    if (!isProfileTab(next)) return;
    setActiveTab(next);
    setSearchParams({ tab: next }, { replace: true });
    if (data) {
      try {
        window.localStorage.setItem(profileTabStorageKey(data.user.id), next);
      } catch {
      }
    }
  };
  const changedFields = !data || !draft ? [] : ["name", "designation", "phone"].filter(
    (k) => draft[k] !== data.user[k]
  );
  const dirty = changedFields.length > 0;
  const commitField = (key, value) => {
    setDraft((d) => d ? { ...d, [key]: value } : d);
  };
  const discard = () => {
    if (!data) return;
    setDraft({
      name: data.user.name,
      designation: data.user.designation,
      phone: data.user.phone
    });
  };
  const save = async () => {
    if (!data || !draft || !dirty || saving) return;
    const phone = normalizePhone(draft.phone);
    if (phone.error) {
      toast.error(phone.error);
      return;
    }
    const nameError = validateProfileField("name", draft.name);
    if (nameError) {
      toast.error(nameError);
      return;
    }
    setSaving(true);
    try {
      await update({
        name: draft.name,
        designation: draft.designation,
        phone: phone.value
      });
      setDraft((d) => d ? { ...d, phone: phone.value } : d);
      toast.success("Profile saved");
    } catch (err) {
      toast.error("Could not save your profile", {
        description: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setSaving(false);
    }
  };
  const saveRef = reactExports.useRef(save);
  reactExports.useEffect(() => {
    saveRef.current = save;
  });
  reactExports.useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e) => {
      const anchor = e.target?.closest?.("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.startsWith("/profile")) return;
      if (!window.confirm("You have unsaved changes. Leave without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
  reactExports.useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const showSavedMarker = (key, undo) => {
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    setSavedMarker({ key, undo });
    savedTimer.current = window.setTimeout(() => setSavedMarker(null), 5e3);
  };
  const instantSave = async (kind, key, value, extra) => {
    const currentSet = kind === "preferences" ? setPreferences : setNotifications;
    const current = (kind === "preferences" ? preferences : notifications) ?? {};
    const next = { ...current, [key]: value };
    currentSet(next);
    extra?.apply?.();
    try {
      await update(kind === "preferences" ? { preferences: next } : { notifications: next });
      showSavedMarker(`${kind}.${key}`, () => {
        currentSet(current);
        extra?.revert?.();
        extra?.apply?.();
        void update(
          kind === "preferences" ? { preferences: current } : { notifications: current }
        ).catch(() => void 0);
        if (savedTimer.current) window.clearTimeout(savedTimer.current);
        setSavedMarker(null);
      });
    } catch (err) {
      currentSet(current);
      extra?.revert?.();
      toast.error("Could not save that change", {
        description: err instanceof Error ? err.message : String(err)
      });
    }
  };
  const onPreferenceChange = (key, value) => {
    const previous = (preferences ?? {})[key];
    const applySidebar = () => {
      if (key !== "sidebar") return;
      try {
        window.localStorage.setItem("nqas.sidebar", String(value));
        document.documentElement.setAttribute("data-sidebar", String(value));
      } catch {
      }
    };
    const revertSidebar = () => {
      if (key !== "sidebar") return;
      try {
        window.localStorage.setItem("nqas.sidebar", String(previous));
        document.documentElement.setAttribute("data-sidebar", String(previous));
      } catch {
      }
    };
    void instantSave("preferences", key, value, {
      previous,
      apply: applySidebar,
      revert: revertSidebar
    });
  };
  const onNotificationChange = (key, value) => {
    void instantSave("notifications", key, value, { previous: (notifications ?? {})[key] });
  };
  const undoSaved = () => savedMarker?.undo();
  const pickFile = (file) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Choose a photo under 8 MB");
      return;
    }
    if (!/^image\//.test(file.type)) {
      toast.error("Choose a PNG, JPEG or WebP image");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(String(reader.result));
    reader.onerror = () => toast.error("Could not read that file");
    reader.readAsDataURL(file);
  };
  const confirmCrop = async (dataUrl) => {
    const previous = avatarSrc;
    setCropSrc(null);
    setAvatarSrc(dataUrl);
    setPhotoBusy(true);
    try {
      await uploadAvatar({ dataUrl });
      toast.success("Photo updated");
    } catch (err) {
      setAvatarSrc(previous);
      toast.error("Could not save the photo", {
        description: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setPhotoBusy(false);
    }
  };
  const removePhoto = async () => {
    const previous = avatarSrc;
    setAvatarSrc(null);
    setPhotoBusy(true);
    try {
      await removeAvatarAction({});
      toast.success("Photo removed");
    } catch (err) {
      setAvatarSrc(previous);
      toast.error("Could not remove the photo", {
        description: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setPhotoBusy(false);
    }
  };
  const doSignOutOthers = async () => {
    setSigningOut(true);
    try {
      const res = await signOutOthers();
      toast.success("Other devices signed out", {
        description: `${res.removed} session${res.removed === 1 ? "" : "s"} ended.`
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign out the other devices");
    } finally {
      setSigningOut(false);
    }
  };
  if (!data || !draft || !preferences || !notifications) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { title: "My profile", subtitle: "Your account, preferences and recent activity", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto w-full max-w-[1120px] space-y-3", "data-testid": "profile-loading", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-10 w-1/3" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-64 w-full" })
    ] }) });
  }
  const roleTag = data.user.appRole === "admin" ? "State Admin" : data.user.appRole === "entry" ? "District Editor" : "Viewer";
  const scope = data.blockNames.length ? data.blockNames.join(", ") : "All blocks";
  const completeness = profileCompleteness({
    name: draft.name,
    designation: draft.designation,
    phone: draft.phone,
    hasPhoto: !!avatarSrc,
    emailVerified: data.user.emailVerified
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AppShell, { title: "My profile", subtitle: "Your account, preferences and recent activity", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        ref: fileRef,
        type: "file",
        accept: "image/png,image/jpeg,image/webp",
        className: "hidden",
        "data-testid": "avatar-input",
        onChange: (e) => {
          const file = e.target.files?.[0];
          if (file) pickFile(file);
          e.target.value = "";
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(IdentityHeader, { name: draft.name, roleTag, avatarSrc }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: `mx-auto grid w-full max-w-[1120px] items-start gap-4 lg:grid-cols-[264px_minmax(0,1fr)] ${dirty ? "pb-24" : ""}`,
        "data-testid": "profile-grid",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            IdentityCard,
            {
              name: draft.name,
              email: data.user.email,
              roleTag,
              scope,
              avatarSrc,
              signedInAt: data.sessionSummary.signedInAt,
              completeness,
              othersCount: data.sessionSummary.others,
              busy: photoBusy,
              signingOut,
              onChangePhoto: () => fileRef.current?.click(),
              onRemovePhoto: () => void removePhoto(),
              onSignOut: () => void signOut(),
              onSignOutOthers: () => void doSignOutOthers()
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            adminHidden && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                "data-testid": "profile-open-admin",
                className: "mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "size-4 shrink-0", "aria-hidden": true }),
                    "Admin Settings is hidden from the sidebar."
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Link,
                    {
                      to: "/admin",
                      className: "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/70 bg-background px-3 text-xs font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-amber-100 dark:hover:bg-amber-500/20",
                      children: "Open Admin settings"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: activeTab, onValueChange: goToTab, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TabsList,
                {
                  className: "h-10 w-full justify-start gap-1 overflow-x-auto p-1",
                  "data-testid": "profile-tablist",
                  children: PROFILE_TABS.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TabsTrigger,
                    {
                      value: t.id,
                      "data-testid": `profile-tab-${t.id}`,
                      className: "min-h-8 shrink-0 rounded-md px-3",
                      children: t.label
                    },
                    t.id
                  ))
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "profile", className: `mt-3 ${PANEL_MAX}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                ProfileTab,
                {
                  values: draft,
                  language: String(preferences.language ?? "en"),
                  onCommit: commitField,
                  onLanguage: (v) => onPreferenceChange("language", v)
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "security", className: `mt-3 ${PANEL_MAX}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(TabSkeleton, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(SecurityTab, { hasPassword: data.auth.password }) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "preferences", className: `mt-3 ${PANEL_MAX}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                PreferencesTab,
                {
                  preferences,
                  savedKey: savedMarker?.key ?? null,
                  onUndo: undoSaved,
                  onChange: onPreferenceChange
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "notifications", className: `mt-3 ${PANEL_MAX}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                NotificationsTab,
                {
                  notifications,
                  email: data.user.email,
                  savedKey: savedMarker?.key ?? null,
                  onUndo: undoSaved,
                  onChange: onNotificationChange
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "activity", className: `mt-3 ${PANEL_MAX}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(TabSkeleton, {}), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ActivityTab, { isAdmin: data.user.appRole === "admin" }) }) })
            ] })
          ] })
        ]
      }
    ),
    dirty && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        "data-testid": "profile-savebar",
        className: "fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:left-[var(--sb-w,264px)]",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto flex min-h-14 max-w-[1120px] flex-wrap items-center gap-2 px-4 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              role: "status",
              "aria-live": "polite",
              "data-testid": "profile-savebar-count",
              className: "text-xs font-medium text-muted-foreground lg:ml-[280px]",
              children: saving ? "Saving…" : `${changedFields.length} unsaved change${changedFields.length === 1 ? "" : "s"}`
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", disabled: saving, onClick: discard, children: "Discard" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                size: "sm",
                className: "gap-1.5",
                "data-testid": "profile-save",
                disabled: saving,
                onClick: () => void save(),
                children: [
                  saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "size-3.5" }),
                  "Save changes"
                ]
              }
            )
          ] })
        ] })
      }
    ),
    cropSrc && /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: null, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      AvatarCropper,
      {
        src: cropSrc,
        busy: photoBusy,
        onCancel: () => setCropSrc(null),
        onConfirm: (url) => void confirmCrop(url)
      }
    ) })
  ] });
}
function TabSkeleton() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 rounded-xl border border-border/60 bg-card p-4", "aria-busy": "true", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-40" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-10 w-full" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-10 w-full" })
  ] });
}

export { Profile as default };
