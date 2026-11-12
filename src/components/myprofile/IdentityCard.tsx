/**
 * IDENTITY CARD — the sticky left column of My Profile (264 px).
 *
 * Everything that must appear EXACTLY ONCE lives here: avatar (click → menu →
 * crop), display name, role tag, scope, email with its note, last sign-in and
 * the profile-completeness meter. The right column never repeats any of it —
 * role and blocks are set by a State Admin, so they carry that tooltip instead
 * of a disabled input.
 *
 * Below 768 px the card collapses to a compact header (avatar, name, role) so
 * the page stays one column.
 */

import { useEffect, useRef, useState } from "react";
import { Camera, LogOut, Trash2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toDisplayStamp } from "@/lib/format";

export type IdentityCardProps = {
  name: string;
  email: string;
  roleTag: string;
  scope: string;
  avatarSrc: string | null;
  signedInAt: number | null;
  completeness: { percent: number; missing: string[] };
  othersCount: number;
  busy?: boolean;
  signingOut?: boolean;
  onChangePhoto: () => void;
  onRemovePhoto: () => void;
  onSignOut: () => void;
  onSignOutOthers: () => void;
};

function initials(name: string, email: string): string {
  return (name || email || "U")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function lastSignInLabel(ts: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return sameDay ? `Today ${time}` : `${toDisplayStamp(ts)}`;
}

export default function IdentityCard({
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
  onSignOutOthers,
}: IdentityCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  /** The URL that already failed — deriving from it means a NEW photo is
   *  always tried again without a reset effect. */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(true);
  const [confirmOthers, setConfirmOthers] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const avatarRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        avatarRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
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
  const missingTip =
    completeness.missing.length === 0
      ? "Profile complete"
      : `Missing: ${completeness.missing.join(", ")}`;

  return (
    <aside
      data-testid="profile-identity"
      className="glass hidden h-fit rounded-xl border border-border/60 p-4 lg:sticky lg:top-20 lg:block"
    >
      {/* ---- Avatar + menu ---- */}
      <div className="relative flex items-center gap-3">
        <button
          ref={avatarRef}
          type="button"
          data-testid="profile-avatar"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={showImage ? "Profile photo — change or remove" : "Add a profile photo"}
          onClick={() => setMenuOpen((v) => !v)}
          className="group relative size-16 shrink-0 overflow-hidden rounded-full border border-border/60 bg-primary/10 text-lg font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {showImage ? (
            <img
              src={avatarSrc ?? ""}
              alt=""
              data-testid="profile-avatar-image"
              onLoad={() => setImgLoading(false)}
              onError={() => {
                setFailedSrc(avatarSrc ?? null);
                setImgLoading(false);
              }}
              className={cn("size-full object-cover", imgLoading && "opacity-0")}
            />
          ) : (
            <span data-testid="profile-avatar-initials" className="flex size-full items-center justify-center">
              {initialsText}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/45 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
            <Camera className="size-5 text-white" aria-hidden="true" />
          </span>
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Photo options"
            data-testid="profile-avatar-menu"
            className="absolute top-full left-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-border/60 bg-popover p-1 shadow-md"
          >
            <button
              type="button"
              role="menuitem"
              data-testid="profile-avatar-change"
              onClick={() => {
                setMenuOpen(false);
                onChangePhoto();
              }}
              className="flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm hover:bg-muted"
            >
              <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
              {avatarSrc ? "Change photo" : "Upload photo"}
            </button>
            <button
              type="button"
              role="menuitem"
              data-testid="profile-avatar-remove"
              disabled={!avatarSrc || busy}
              onClick={() => {
                setMenuOpen(false);
                onRemovePhoto();
              }}
              className="flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm hover:bg-muted disabled:opacity-50"
            >
              <Trash2 className="size-4 text-muted-foreground" aria-hidden="true" />
              Remove photo
            </button>
            <p className="px-2.5 pt-1 pb-1.5 text-[11px] leading-snug text-muted-foreground">
              Cropped to a square and resized to 256 px — stored with your account, never a public
              link.
            </p>
          </div>
        )}
      </div>

      {/* ---- Name, role, scope ---- */}
      <p className="mt-3 truncate text-base font-semibold" data-testid="profile-display-name">
        {name || "Your name"}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-1.5">
        <span
          data-testid="profile-role"
          className="inline-flex rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary"
        >
          {roleTag}
        </span>
      </p>
      <p
        className="mt-2 text-xs text-muted-foreground"
        data-tip="Set by a State Admin in Admin → Users"
        data-testid="profile-scope"
      >
        {scope}
      </p>

      {/* ---- Email: exactly once, on this card ---- */}
      <p className="mt-3 truncate text-xs font-medium text-foreground" data-testid="profile-email">
        {email || "—"}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
        Your sign-in address; ask a State Admin to change it.
      </p>

      {/* ---- Last sign-in ---- */}
      <p
        className="mt-3 text-[11px] text-muted-foreground"
        data-tip={signedInAt ? toDisplayStamp(signedInAt) : undefined}
        data-testid="profile-last-signin"
      >
        Last sign-in {lastSignInLabel(signedInAt)} · this device
      </p>

      {/* ---- Completeness ---- */}
      <div className="mt-3" data-tip={missingTip} data-testid="profile-completeness">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Profile completeness</span>
          <span className="font-semibold tabular-nums text-foreground">
            {completeness.percent}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={completeness.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completeness"
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <span
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${completeness.percent}%` }}
          />
        </div>
      </div>

      {/* ---- Actions ---- */}
      <div className="mt-4 flex flex-col gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="profile-sign-out"
          className="gap-1.5"
          onClick={onSignOut}
        >
          <LogOut className="size-3.5" /> Sign out
        </Button>
        {othersCount > 0 &&
          (confirmOthers ? (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-2 text-[11px] text-amber-900">
              <p className="mb-1.5">
                End {othersCount} other device{othersCount === 1 ? "" : "s"}? This device stays
                signed in.
              </p>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 flex-1"
                  data-testid="profile-sign-out-others-confirm"
                  disabled={signingOut}
                  onClick={() => {
                    setConfirmOthers(false);
                    onSignOutOthers();
                  }}
                >
                  {signingOut ? "Signing out…" : "Sign out others"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 flex-1"
                  disabled={signingOut}
                  onClick={() => setConfirmOthers(false)}
                >
                  Keep
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              data-testid="profile-sign-out-others"
              className="gap-1.5"
              onClick={() => setConfirmOthers(true)}
            >
              <LogOut className="size-3.5" /> Sign out other devices ({othersCount})
            </Button>
          ))}
      </div>
    </aside>
  );
}

/** Below 768 px the card collapses to this one line (avatar, name, role —
 *  the email stays on the desktop card, never twice in the DOM). */
export function IdentityHeader({
  name,
  roleTag,
  avatarSrc,
}: {
  name: string;
  roleTag: string;
  avatarSrc: string | null;
}) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div
      data-testid="profile-identity-compact"
      className="mb-3 flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 lg:hidden"
    >
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {avatarSrc && imgOk ? (
          <img
            src={avatarSrc}
            alt=""
            onError={() => setImgOk(false)}
            className="size-full object-cover"
          />
        ) : (
          initials(name, "")
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{name || "Your name"}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{roleTag}</span>
      </span>
    </div>
  );
}
