import { useMemo } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { DEFAULT_SETTINGS } from "@/convex/lifecycle";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_ICONS,
  CATEGORY_META,
  getCategoryRoute,
  type TrackerCategoryId,
} from "@/lib/trackerColumns";

export const CATEGORY_ORDER = Object.keys(CATEGORY_META) as TrackerCategoryId[];

/** Horizontal category pills: "All columns" + every work category. In state
 *  mode (`onChange`) they switch columns in place; otherwise they navigate
 *  to the category page routes. */
export function CategoryPills({
  active,
  onChange,
}: {
  active: TrackerCategoryId | null;
  onChange?: (c: TrackerCategoryId | null) => void;
}) {
  // Page visibility (Admin Settings → Page visibility): hidden categories
  // are removed from the pill row on the master list and category pages —
  // except for the State Admin, who always sees every pill.
  const { user } = useAuth();
  const settingsQ = useQuery(api.facilities.getAppSettings, {});
  const hiddenCategories = useMemo(
    () =>
      user?.appRole === "admin"
        ? new Set<string>()
        : new Set(
            ((settingsQ?.settings.hiddenCategories as string[] | undefined) ??
              DEFAULT_SETTINGS.hiddenCategories) as string[],
          ),
    [user, settingsQ],
  );
  const visibleOrder = CATEGORY_ORDER.filter((id) => !hiddenCategories.has(id));

  const pillCls = (isActive: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
      isActive
        ? "border-primary bg-primary text-primary-foreground shadow-sm"
        : "border-border/70 bg-background text-foreground/75 hover:border-primary/40 hover:bg-accent",
    );

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {onChange ? (
        <button
          type="button"
          className={pillCls(active === null)}
          onClick={() => onChange(null)}
        >
          <LayoutGrid className="size-3.5" />
          All columns
        </button>
      ) : (
        <Link to="/facilities" className={pillCls(active === null)}>
          <LayoutGrid className="size-3.5" />
          All columns
        </Link>
      )}
      <span className="h-5 w-px shrink-0 bg-border" />
      {visibleOrder.map((id) => {
        const meta = CATEGORY_META[id];
        const Icon = CATEGORY_ICONS[meta.icon];
        const isActive = active === id;
        return onChange ? (
          <button
            key={id}
            type="button"
            className={pillCls(isActive)}
            onClick={() => onChange(id)}
          >
            <Icon className="size-3.5" />
            {meta.label}
          </button>
        ) : (
          <Link key={id} to={getCategoryRoute(id)} className={pillCls(isActive)}>
            <Icon className="size-3.5" />
            {meta.label}
          </Link>
        );
      })}
    </div>
  );
}

/** Pills only — the Facility Master List keeps category navigation as a
 *  single lightweight row (quick-view card grid removed by request). */
export function CategoryNav({
  active,
  onChange,
}: {
  active: TrackerCategoryId | null;
  onChange?: (c: TrackerCategoryId | null) => void;
}) {
  return <CategoryPills active={active} onChange={onChange} />;
}
