// Workspace → Page visibility.
//
// Replaces the ambiguous pills with a list of rows: icon, page name, one-line
// description and a real On/Off switch (state written out, not colour alone).
// Hidden pages only disappear from navigation for everyone except the State
// Admin — data is untouched.
//
// ONE exception: the Admin Settings row hides for EVERYONE (State Admin
// included), asks for confirmation first and saves immediately, because the
// banner in Admin and the Profile link are only "always a way back" if the
// change really happened. "Hide all" skips that row on purpose.

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { DEFAULT_SETTINGS } from "@/convex/lifecycle";
import { CATEGORY_ICONS, CATEGORY_META, type TrackerCategoryId } from "@/lib/trackerColumns";
import { PAGE_VISIBILITY_PAGES, type SettingsDraft } from "@/lib/adminSettings";
import { ADMIN_NAV_KEY } from "@/lib/sidebarConfig";
import { CountBadge, SectionHeader, ToggleRow, UnsavedDot } from "@/components/admin/AdminUi";

const CATEGORY_DESCRIPTIONS: Record<TrackerCategoryId, string> = {
  sa: "State assessment visit details, SaQsham documents and assessors.",
  certification: "NQAS result, score, certificates and assessment dates.",
  recert: "Surveillance visits, certificate validity and recertification.",
  ia: "Quarterly Internal Assessment (NQAS / Kayakalp) scores.",
  fund: "Gap closure fund sanction, release and utilisation.",
  building: "Building type, condition and condemned documents.",
  noc: "Fire NOC availability, validity and documents.",
};

export function PageVisibilityPanel({
  settings,
  draft,
  setPending,
  onCommitPages,
}: {
  settings: Record<string, unknown>;
  draft: SettingsDraft;
  setPending: (key: string, value: unknown) => void;
  /** Saves `hiddenPages` straight away (the Admin Settings row). Falls back to
   *  the normal pending draft when the page does not pass one. */
  onCommitPages?: (next: string[]) => Promise<void>;
}) {
  const categoryIds = Object.keys(CATEGORY_META) as TrackerCategoryId[];
  const [confirmAdminHide, setConfirmAdminHide] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);

  const storedCategories =
    (settings.hiddenCategories as string[] | undefined) ?? DEFAULT_SETTINGS.hiddenCategories;
  const storedPages =
    (settings.hiddenPages as string[] | undefined) ?? DEFAULT_SETTINGS.hiddenPages;

  const pendingCategories = (draft.hiddenCategories as string[] | undefined) ?? storedCategories;
  const pendingPages = (draft.hiddenPages as string[] | undefined) ?? storedPages;

  const setCategories = (next: string[]) => {
    const same = JSON.stringify([...next].sort()) === JSON.stringify([...storedCategories].sort());
    setPending("hiddenCategories", same ? undefined : next);
  };
  const setPages = (next: string[]) => {
    const same = JSON.stringify([...next].sort()) === JSON.stringify([...storedPages].sort());
    setPending("hiddenPages", same ? undefined : next);
  };

  const toggleCategory = (id: TrackerCategoryId) =>
    setCategories(
      pendingCategories.includes(id)
        ? pendingCategories.filter((x) => x !== id)
        : [...pendingCategories, id],
    );

  /** The Admin Settings row: confirm when hiding, save at once either way. */
  const commitAdminVisibility = async (hide: boolean) => {
    const next = hide
      ? pendingPages.includes(ADMIN_NAV_KEY)
        ? pendingPages
        : [...pendingPages, ADMIN_NAV_KEY]
      : pendingPages.filter((x) => x !== ADMIN_NAV_KEY);
    setAdminBusy(true);
    try {
      if (onCommitPages) await onCommitPages(next);
      else setPages(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change Admin Settings visibility");
    } finally {
      setAdminBusy(false);
    }
  };

  const togglePage = (key: string) => {
    const turningOff = !pendingPages.includes(key);
    if (key === ADMIN_NAV_KEY) {
      if (turningOff) setConfirmAdminHide(true);
      else void commitAdminVisibility(false);
      return;
    }
    setPages(turningOff ? [...pendingPages, key] : pendingPages.filter((x) => x !== key));
  };

  const total = categoryIds.length + PAGE_VISIBILITY_PAGES.length;
  const hidden = pendingCategories.length + pendingPages.length;
  const visible = total - hidden;

  const showAll = () => {
    setCategories([]);
    setPages([]);
  };
  const hideAll = () => {
    setCategories([...categoryIds]);
    // Every page EXCEPT Admin Settings — hiding that one needs its own
    // confirmation, so a bulk action can never lock the admin out.
    setPages(PAGE_VISIBILITY_PAGES.filter((p) => p.key !== ADMIN_NAV_KEY).map((p) => p.key));
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={hidden > 0 ? EyeOff : Eye}
        title="Page visibility"
        description="Turn a page off to remove it from the sidebar, the category pills and direct URLs for every other user. Nothing is deleted — turn it back on any time."
        right={
          <>
            {(draft.hiddenCategories !== undefined || draft.hiddenPages !== undefined) && (
              <UnsavedDot />
            )}
            <CountBadge
              value={`${visible} of ${total} visible`}
              tone={hidden > 0 ? "warning" : "primary"}
            />
            <Button variant="outline" size="sm" className="h-9" onClick={showAll}>
              Show all
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={hideAll}>
              Hide all
            </Button>
          </>
        }
      />

      <div className="space-y-2">
        {categoryIds.map((id) => {
          const meta = CATEGORY_META[id];
          const Icon = CATEGORY_ICONS[meta.icon];
          const isHidden = pendingCategories.includes(id);
          return (
            <div
              key={id}
              id={`visibility-${id}`}
              data-admin-anchor={`visibility-${id}`}
              className="scroll-mt-40"
            >
              <ToggleRow
                id={`visibility-toggle-${id}`}
                icon={Icon}
                checked={!isHidden}
                onCheckedChange={() => toggleCategory(id)}
                title={meta.label}
                description={CATEGORY_DESCRIPTIONS[id]}
                hint={`${meta.route} · ${
                  isHidden ? "hidden from the sidebar and direct links" : "visible to everyone"
                }`}
              />
            </div>
          );
        })}

        {PAGE_VISIBILITY_PAGES.filter((p) => p.key !== ADMIN_NAV_KEY).map((p) => {
          const isHidden = pendingPages.includes(p.key);
          const isAdminEntry = p.key === ADMIN_NAV_KEY;
          return (
            <div
              key={p.key}
              id={`visibility-${p.key}`}
              data-admin-anchor={`visibility-${p.key}`}
              className="scroll-mt-40"
            >
              <ToggleRow
                id={`visibility-toggle-${p.key}`}
                icon={p.icon}
                checked={!isHidden}
                disabled={isAdminEntry && adminBusy}
                onCheckedChange={() => togglePage(p.key)}
                title={p.label}
                description={p.description}
                hint={
                  isHidden
                    ? isAdminEntry
                      ? "hidden — still opens from your profile, Ctrl+K or /admin"
                      : "hidden from the sidebar"
                    : "visible to everyone"
                }
              />
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        {hidden === 0
          ? "Every page is visible to every user."
          : `${hidden} page${hidden === 1 ? "" : "s"} hidden. You always see every page as the State Admin — except Admin Settings itself, which hides for everyone and stays reachable from your profile, Ctrl+K or /admin.`}
      </p>

      {/* Hiding Admin Settings is confirmed first — and the route never moves. */}
      <AlertDialog open={confirmAdminHide} onOpenChange={(o) => !o && setConfirmAdminHide(false)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Hide Admin Settings from the sidebar?</AlertDialogTitle>
            <AlertDialogDescription>
              You can still open it from your profile page or Ctrl+K.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-hide-admin"
              onClick={() => {
                setConfirmAdminHide(false);
                void commitAdminVisibility(true);
              }}
            >
              Hide Admin Settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
