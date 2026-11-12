/**
 * ROUTE ACCESS — the server answer the router guard uses.
 *
 * Sidebar hiding is presentation; this query is the enforcement point for a
 * direct URL. Custom pages are checked against their live row; built-in pages
 * against Admin → Pages overrides + Page visibility. Admin Settings itself can
 * never be hidden or re-scoped.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";
import { canEditAll, requireActivatedUser } from "./facilities";

type Override = { label?: string; roles?: string[]; everyone?: boolean; order?: number };

const DEFAULT_ROLE_ROUTES: Record<string, string[]> = {
  // Block Compare ships for State Admin, DQC and DQMO; Admin → Pages may
  // still re-scope it, but a bare direct URL is refused for Data Entry.
  "/block-compare": ["admin", "dqc", "dqmo"],
};

const CATEGORY_BY_ROUTE: Record<string, string> = {
  "/facilities/state-assessment": "sa",
  "/facilities/certification": "certification",
  "/facilities/recertification": "recert",
  "/facilities/internal-assessment": "ia",
  "/facilities/fund": "fund",
  "/facilities/building": "building",
  "/facilities/fire-noc": "noc",
};

function cleanRoute(raw: string): string {
  const path = (raw.split("?")[0].split("#")[0] || "/").replace(/\/+$/, "") || "/";
  if (path.startsWith("/p/")) return `/p/${path.slice(3).split("/")[0]}`;
  if (path.startsWith("/admin")) return "/admin";
  return path;
}

export async function readOverrides(
  ctx: Parameters<typeof requireActivatedUser>[0],
): Promise<Record<string, Override>> {
  const row = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", "pageOverrides"))
    .first();
  return row?.value && typeof row.value === "object"
    ? (row.value as Record<string, Override>)
    : {};
}

export async function readVisibility(
  ctx: Parameters<typeof requireActivatedUser>[0],
): Promise<{ hiddenPages: Set<string>; hiddenCategories: Set<string> }> {
  const rows = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", "hiddenPages"))
    .first();
  const cats = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", "hiddenCategories"))
    .first();
  return {
    hiddenPages: new Set(
      Array.isArray(rows?.value) ? rows.value.filter((x): x is string => typeof x === "string") : [],
    ),
    hiddenCategories: new Set(
      Array.isArray(cats?.value) ? cats.value.filter((x): x is string => typeof x === "string") : [],
    ),
  };
}

export const routeAccess = query({
  args: { route: v.string() },
  handler: async (ctx, { route: raw }) => {
    const me = await requireActivatedUser(ctx);
    const route = cleanRoute(raw);
    const role = me.appRole ?? "viewer";

    if (route === "/admin") {
      return canEditAll(me)
        ? { allowed: true, reason: null as string | null, title: "Admin Settings" }
        : {
            allowed: false,
            reason: "Admin Settings is available to the State Admin only.",
            title: "Admin Settings",
          };
    }

    if (route.startsWith("/p/")) {
      const slug = route.slice(3);
      const page = await ctx.db
        .query("customPages")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!page || page.deletedAt != null) {
        return { allowed: false, reason: "This page does not exist.", title: "Page not found" };
      }
      if (page.visible === false) {
        return {
          allowed: false,
          reason: "This page is hidden. Ask a State Admin to make it visible.",
          title: page.name,
        };
      }
      if (!page.everyone && !page.roles.includes(role)) {
        return {
          allowed: false,
          reason: "This page is not shared with your role. Ask a State Admin for access.",
          title: page.name,
        };
      }
      return { allowed: true, reason: null as string | null, title: page.name };
    }

    const overrides = await readOverrides(ctx);
    const override = overrides[route];
    if (route === "/guide" && !override && role !== "admin") {
      return {
        allowed: false,
        reason: "The Admin Guide is available to the State Admin by default. Ask an admin to share it from Admin → Pages.",
        title: "Admin Guide",
      };
    }
    const shippedRoles = DEFAULT_ROLE_ROUTES[route];
    if (!override && shippedRoles && !shippedRoles.includes(role)) {
      return {
        allowed: false,
        reason:
          "Block Compare is available to State Admin, DQC and DQMO. Ask a State Admin for access.",
        title: "Block Compare",
      };
    }
    if (override) {
      if (override.everyone !== true && Array.isArray(override.roles)) {
        if (role !== "admin" && !override.roles.includes(role)) {
          return {
            allowed: false,
            reason: "This page is not shared with your role. Ask a State Admin for access.",
            title: override.label ?? "Page",
          };
        }
      }
    }

    // Hidden means hidden for every role, including the State Admin. Admin
    // Settings itself is returned earlier and can never reach this branch.
    const { hiddenPages, hiddenCategories } = await readVisibility(ctx);
    const key =
      route === "/guide"
        ? "guide"
        : route === "/documents"
          ? "documents"
          : route === "/custom-report"
            ? "custom-report"
            : route === "/generate-ppt"
              ? "generate-ppt"
              : route === "/bulk-import"
                ? "bulk-import"
                : (CATEGORY_BY_ROUTE[route] ?? route.replace(/^\//, ""));
    if (
      hiddenPages.has(key) ||
      hiddenCategories.has(key) ||
      hiddenPages.has(route.replace(/^\//, ""))
    ) {
      return {
        allowed: false,
        reason: "This page is hidden by the State Admin.",
        title: override?.label ?? "Page",
      };
    }

    return { allowed: true, reason: null as string | null, title: override?.label ?? null };
  },
});
