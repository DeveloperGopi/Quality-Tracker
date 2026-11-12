import { useState } from "react";
import { useQuery } from "convex/react";
import { ArrowUpRight, HelpCircle } from "lucide-react";
import { Link, useNavigate } from "react-router";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GUIDE_ARTICLES, customGuideStub, type GuideRole } from "@/lib/guide";
import { sidebarLabel } from "@/lib/sidebarLabels";
import { requestGuideSpotlight } from "@/lib/guideSpotlight";
import { useAuth } from "@/hooks/use-auth";

/** The “?” in every page header: opens that page’s guide article in a panel. */
export function GuideHelpButton({
  path,
  articleRoute,
}: {
  path: string;
  /** The exact tab/article (e.g. `/admin?tab=pages`). */
  articleRoute?: string;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = (user?.appRole ?? "viewer") as GuideRole;
  const overridesQ = useQuery(api.pages.builtinOverrides, {});
  const customQ = useQuery(api.pages.nav, {});
  const overrides = (overridesQ ?? {}) as Record<string, { label?: string }>;
  const custom = path.startsWith("/p/")
    ? ((customQ ?? []) as { slug: string; name: string }[]).find(
        (p) => `/p/${p.slug}` === path,
      )
    : undefined;

  const base = path.startsWith("/facilities/") && path !== "/facilities"
    ? "/facilities"
    : path.startsWith("/p/")
      ? "/p/:slug"
      : path.startsWith("/admin")
        ? "/admin"
        : path;
  const article =
    GUIDE_ARTICLES.find((a) => a.route === articleRoute) ??
    GUIDE_ARTICLES.find((a) => a.route === path) ??
    GUIDE_ARTICLES.find((a) => a.route === base) ??
    (base === "/p/:slug"
      ? customGuideStub(custom?.name ?? "Custom page")
      : guideFallback(base));
  const name =
    custom?.name ||
    overrides[article.route]?.label?.trim() ||
    (article.titleKey ? sidebarLabel(article.titleKey) : "") ||
    article.fallbackTitle;
  const fullGuideRoute =
    base === "/p/:slug" ? path : (articleRoute ?? article.route);
  const steps = article.steps.filter((step) =>
    (step.roles ?? article.roles).includes(role),
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 rounded-full text-muted-foreground"
        aria-label={`Help for ${name}`}
        data-tip="How to use this page"
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="size-4" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{name}</SheetTitle>
            <SheetDescription>{article.purpose}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3 text-[14px]">
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <li key={s.text} className="rounded-lg border border-border/60 p-2">
                  <div className="flex gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-[14px] leading-relaxed">{s.text}</span>
                  </div>
                  <button
                    type="button"
                    className="mt-1.5 ml-7 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
                    onClick={() => {
                      requestGuideSpotlight(s.target ?? "[data-guide-target], main h1", s.text);
                      setOpen(false);
                      navigate(fullGuideRoute);
                    }}
                  >
                    Open it <ArrowUpRight className="size-3.5" />
                  </button>
                </li>
              ))}
            </ol>
            {article.problems.slice(0, 2).map((p) => (
              <p key={p.problem} className="text-[13px]">
                <span className="font-medium">{p.problem}</span>{" "}
                <span className="text-slate-600">{p.fix}</span>
              </p>
            ))}
            <Link
              to={`/guide?article=${encodeURIComponent(fullGuideRoute)}`}
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-[14px] font-medium text-primary hover:underline"
            >
              Open full guide <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function guideFallback(route: string) {
  return customGuideStub(route === "/" ? "Home" : route.replace(/^\//, "").replace(/-/g, " "));
}
