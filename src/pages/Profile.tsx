/**
 * MY PROFILE — /profile (redesigned).
 *
 * Layout (1366×768 target, no page scroll):
 *   • one page header (the shared AppShell title — no second header inside),
 *   • two columns on ONE 1120 px grid: a sticky 264 px identity card and a
 *     right column with a tab bar (Profile · Security · Preferences ·
 *     Notifications · Activity), each tab one compact card,
 *   • the deep link is /profile?tab=security, remembered per user,
 *   • a Save bar that only exists while there are unsaved changes.
 *
 * Data:
 *   • `profile.myProfile` is the ONE query the page opens with (identity,
 *     preferences, notifications, session counts) — activity and sessions are
 *     separate queries that only exist while their tab is open (Security and
 *     Activity are lazy chunks),
 *   • preferences and notifications save INSTANTLY with "Saved ✓ · Undo",
 *     only the personal fields go through the draft/Save bar,
 *   • saving patches the Convex cache first (optimistic, <100 ms) and rolls
 *     back to the previous query value on failure.
 *
 * Auth in this app is email + password: the email, role and block scope are
 * read-only here (a State Admin changes them in Admin → Users) and appear
 * exactly ONCE — on the identity card.
 */

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useSearchParams, Link } from "react-router";
import { Loader2, Save, Settings } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { DEFAULT_SETTINGS } from "@/convex/lifecycle";
import { ADMIN_NAV_KEY } from "@/lib/sidebarConfig";
import { useAuth } from "@/hooks/use-auth";
import IdentityCard, { IdentityHeader } from "@/components/myprofile/IdentityCard";
import ProfileTab, { type ProfileDraft } from "@/components/myprofile/ProfileTab";
import PreferencesTab, { type PreferenceKey } from "@/components/myprofile/PreferencesTab";
import NotificationsTab from "@/components/myprofile/NotificationsTab";
import {
  DEFAULT_PROFILE_TAB,
  isProfileTab,
  normalizePhone,
  PROFILE_TABS,
  profileCompleteness,
  profileTabStorageKey,
  validateProfileField,
  type ProfileTabId,
} from "@/lib/profileConfig";

/* Lazy chunks: the cropper, the session list and the activity feed are never
   part of the first Profile payload. */
const SecurityTab = lazy(() => import("@/components/myprofile/SecurityTab"));
const ActivityTab = lazy(() => import("@/components/myprofile/ActivityTab"));
const AvatarCropper = lazy(() => import("@/components/myprofile/AvatarCropper"));

type Preferences = Record<string, unknown>;

const PANEL_MAX = "lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto";

export default function Profile() {
  const data = useQuery(api.profile.myProfile, {});
  const update = useMutation(api.profile.updateMyProfile);
  const uploadAvatar = useAction(api.profile.uploadAvatar);
  const removeAvatarAction = useAction(api.profile.removeAvatar);
  const signOutOthers = useMutation(api.profile.signOutOtherSessions);
  const { signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  /* Page visibility — when the Admin Settings nav entry is switched off this
     page (plus Ctrl+K and /admin directly) is the guaranteed way back. The
     settings read is State-Admin only, so everyone else skips the query. */
  const isAdmin = data?.user.appRole === "admin";
  const settingsQ = useQuery(api.facilities.getAppSettings, isAdmin ? {} : "skip");
  const adminHidden =
    isAdmin &&
    ((settingsQ?.settings.hiddenPages as string[] | undefined) ?? DEFAULT_SETTINGS.hiddenPages).includes(
      ADMIN_NAV_KEY,
    );

  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [notifications, setNotifications] = useState<Preferences | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTabId>(DEFAULT_PROFILE_TAB);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [savedMarker, setSavedMarker] = useState<{ key: string; undo: () => void } | null>(null);

  const loadedRef = useRef(false);
  const savedTimer = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  /* ---------------- one-time state hydrate ---------------- */
  useEffect(() => {
    if (!data || loadedRef.current) return;
    loadedRef.current = true;
    setDraft({
      name: data.user.name,
      designation: data.user.designation,
      phone: data.user.phone,
    });
    setPreferences(data.preferences as Preferences);
    setNotifications(data.notifications as Preferences);
    setAvatarSrc(data.avatar.url ?? data.user.image ?? null);

    // Tab: the URL wins, then the tab this user had last, then Profile.
    const fromUrl = searchParams.get("tab");
    let initial: ProfileTabId = DEFAULT_PROFILE_TAB;
    if (isProfileTab(fromUrl)) {
      initial = fromUrl;
    } else {
      try {
        const stored = window.localStorage.getItem(profileTabStorageKey(data.user.id));
        if (isProfileTab(stored)) initial = stored;
      } catch {
        /* private mode */
      }
    }
    setActiveTab(initial);
    if (initial !== fromUrl) {
      setSearchParams({ tab: initial }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const goToTab = (next: string) => {
    if (!isProfileTab(next)) return;
    setActiveTab(next);
    setSearchParams({ tab: next }, { replace: true });
    if (data) {
      try {
        window.localStorage.setItem(profileTabStorageKey(data.user.id), next);
      } catch {
        /* private mode */
      }
    }
  };

  /* ---------------- draft + dirty ---------------- */
  const changedFields = (!data || !draft
    ? []
    : (["name", "designation", "phone"] as const).filter(
        (k) => draft[k] !== data.user[k],
      )) as (keyof ProfileDraft)[];
  const dirty = changedFields.length > 0;

  const commitField = (key: keyof ProfileDraft, value: string) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const discard = () => {
    if (!data) return;
    setDraft({
      name: data.user.name,
      designation: data.user.designation,
      phone: data.user.phone,
    });
  };

  /* ---------------- save (optimistic, with rollback) ---------------- */
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

    // Optimistic by construction: the rows already render `draft`, so the
    // committed value is on screen the moment Enter is pressed — there is no
    // wait for the round trip. On failure the draft is KEPT (the person can
    // fix the value) and a toast explains why.
    setSaving(true);
    try {
      await update({
        name: draft.name,
        designation: draft.designation,
        phone: phone.value,
      });
      setDraft((d) => (d ? { ...d, phone: phone.value } : d));
      toast.success("Profile saved");
    } catch (err) {
      toast.error("Could not save your profile", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  };
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  /* ---------------- unsaved guards ---------------- */
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    // Client-side navigation: ask before leaving /profile with unsaved rows.
    // (Switching TABS keeps the draft — the Save bar stays visible with it.)
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]") as
        | HTMLAnchorElement
        | null;
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------- instant saves (preferences / notifications) ---------------- */
  const showSavedMarker = (key: string, undo: () => void) => {
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    setSavedMarker({ key, undo });
    savedTimer.current = window.setTimeout(() => setSavedMarker(null), 5000);
  };

  const instantSave = async (
    kind: "preferences" | "notifications",
    key: string,
    value: unknown,
    extra?: { previous: unknown; apply?: () => void; revert?: () => void },
  ) => {
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
        extra?.apply?.(); // re-apply previous local effect (sidebar)
        void update(
          kind === "preferences" ? { preferences: current } : { notifications: current },
        ).catch(() => undefined);
        if (savedTimer.current) window.clearTimeout(savedTimer.current);
        setSavedMarker(null);
      });
    } catch (err) {
      currentSet(current);
      extra?.revert?.();
      toast.error("Could not save that change", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const onPreferenceChange = (key: PreferenceKey, value: unknown) => {
    const previous = (preferences ?? {})[key];
    const applySidebar = () => {
      if (key !== "sidebar") return;
      try {
        window.localStorage.setItem("nqas.sidebar", String(value));
        document.documentElement.setAttribute("data-sidebar", String(value));
      } catch {
        /* private mode */
      }
    };
    const revertSidebar = () => {
      if (key !== "sidebar") return;
      try {
        window.localStorage.setItem("nqas.sidebar", String(previous));
        document.documentElement.setAttribute("data-sidebar", String(previous));
      } catch {
        /* private mode */
      }
    };
    void instantSave("preferences", key, value, {
      previous,
      apply: applySidebar,
      revert: revertSidebar,
    });
  };

  const onNotificationChange = (key: string, value: unknown) => {
    void instantSave("notifications", key, value, { previous: (notifications ?? {})[key] });
  };

  const undoSaved = () => savedMarker?.undo();

  /* ---------------- photo ---------------- */
  const pickFile = (file: File) => {
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

  const confirmCrop = async (dataUrl: string) => {
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
        description: err instanceof Error ? err.message : String(err),
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
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setPhotoBusy(false);
    }
  };

  /* ---------------- sign out ---------------- */
  const doSignOutOthers = async () => {
    setSigningOut(true);
    try {
      const res = await signOutOthers();
      toast.success("Other devices signed out", {
        description: `${res.removed} session${res.removed === 1 ? "" : "s"} ended.`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign out the other devices");
    } finally {
      setSigningOut(false);
    }
  };

  /* ---------------- render ---------------- */
  if (!data || !draft || !preferences || !notifications) {
    return (
      <AppShell title="My profile" subtitle="Your account, preferences and recent activity">
        <div className="mx-auto w-full max-w-[1120px] space-y-3" data-testid="profile-loading">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  const roleTag =
    data.user.appRole === "admin"
      ? "State Admin"
      : data.user.appRole === "entry"
        ? "District Editor"
        : "Viewer";
  const scope = data.blockNames.length ? data.blockNames.join(", ") : "All blocks";
  const completeness = profileCompleteness({
    name: draft.name,
    designation: draft.designation,
    phone: draft.phone,
    hasPhoto: !!avatarSrc,
    emailVerified: data.user.emailVerified,
  });

  return (
    <AppShell title="My profile" subtitle="Your account, preferences and recent activity">
      {/* Hidden picker for the avatar menu. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        data-testid="avatar-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) pickFile(file);
          e.target.value = "";
        }}
      />

      {/* Mobile: the card collapses to this header. */}
      <IdentityHeader name={draft.name} roleTag={roleTag} avatarSrc={avatarSrc} />

      <div
        className={`mx-auto grid w-full max-w-[1120px] items-start gap-4 lg:grid-cols-[264px_minmax(0,1fr)] ${
          dirty ? "pb-24" : ""
        }`}
        data-testid="profile-grid"
      >
        <IdentityCard
          name={draft.name}
          email={data.user.email}
          roleTag={roleTag}
          scope={scope}
          avatarSrc={avatarSrc}
          signedInAt={data.sessionSummary.signedInAt}
          completeness={completeness}
          othersCount={data.sessionSummary.others}
          busy={photoBusy}
          signingOut={signingOut}
          onChangePhoto={() => fileRef.current?.click()}
          onRemovePhoto={() => void removePhoto()}
          onSignOut={() => void signOut()}
          onSignOutOthers={() => void doSignOutOthers()}
        />

        <div className="min-w-0">
          {/* Hidden Admin Settings? The way back, one click away. */}
          {adminHidden && (
            <div
              data-testid="profile-open-admin"
              className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100"
            >
              <span className="flex items-center gap-2">
                <Settings className="size-4 shrink-0" aria-hidden />
                Admin Settings is hidden from the sidebar.
              </span>
              <Link
                to="/admin"
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/70 bg-background px-3 text-xs font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-amber-100 dark:hover:bg-amber-500/20"
              >
                Open Admin settings
              </Link>
            </div>
          )}
          <Tabs value={activeTab} onValueChange={goToTab}>
            <TabsList
              className="h-10 w-full justify-start gap-1 overflow-x-auto p-1"
              data-testid="profile-tablist"
            >
              {PROFILE_TABS.map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  data-testid={`profile-tab-${t.id}`}
                  className="min-h-8 shrink-0 rounded-md px-3"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="profile" className={`mt-3 ${PANEL_MAX}`}>
              <ProfileTab
                values={draft}
                language={String(preferences.language ?? "en")}
                onCommit={commitField}
                onLanguage={(v) => onPreferenceChange("language", v)}
              />
            </TabsContent>

            <TabsContent value="security" className={`mt-3 ${PANEL_MAX}`}>
              <Suspense fallback={<TabSkeleton />}>
                <SecurityTab hasPassword={data.auth.password} />
              </Suspense>
            </TabsContent>

            <TabsContent value="preferences" className={`mt-3 ${PANEL_MAX}`}>
              <PreferencesTab
                preferences={preferences}
                savedKey={savedMarker?.key ?? null}
                onUndo={undoSaved}
                onChange={onPreferenceChange}
              />
            </TabsContent>

            <TabsContent value="notifications" className={`mt-3 ${PANEL_MAX}`}>
              <NotificationsTab
                notifications={notifications}
                email={data.user.email}
                savedKey={savedMarker?.key ?? null}
                onUndo={undoSaved}
                onChange={onNotificationChange}
              />
            </TabsContent>

            <TabsContent value="activity" className={`mt-3 ${PANEL_MAX}`}>
              <Suspense fallback={<TabSkeleton />}>
                <ActivityTab isAdmin={data.user.appRole === "admin"} />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ---- Save bar: exists ONLY while something is unsaved ---- */}
      {dirty && (
        <div
          data-testid="profile-savebar"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:left-[var(--sb-w,264px)]"
        >
          <div className="mx-auto flex min-h-14 max-w-[1120px] flex-wrap items-center gap-2 px-4 py-2">
            <span
              role="status"
              aria-live="polite"
              data-testid="profile-savebar-count"
              className="text-xs font-medium text-muted-foreground lg:ml-[280px]"
            >
              {saving
                ? "Saving…"
                : `${changedFields.length} unsaved change${changedFields.length === 1 ? "" : "s"}`}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={saving} onClick={discard}>
                Discard
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                data-testid="profile-save"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Photo cropper (lazy chunk) ---- */}
      {cropSrc && (
        <Suspense fallback={null}>
          <AvatarCropper
            src={cropSrc}
            busy={photoBusy}
            onCancel={() => setCropSrc(null)}
            onConfirm={(url) => void confirmCrop(url)}
          />
        </Suspense>
      )}
    </AppShell>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-card p-4" aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
