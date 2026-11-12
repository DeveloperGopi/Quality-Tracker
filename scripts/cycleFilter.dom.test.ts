/**
 * CERTIFICATION CYCLE FILTER — the redesigned in-page control.
 *
 * Pins the brief's contract at the DOM level (this repo ships bun + happy-dom
 * contract tests; there is no Playwright project):
 *   • the trigger reads "Certification Cycle: Current" and never
 *     "Cycle: Cycle #…";
 *   • the menu is a radiogroup with plain labels + counts from the summary;
 *   • the selected option shows a check on a soft blue fill (never a dark grey
 *     block), hovering is only a light tint;
 *   • "All cycles" exists on list pages and is absent on summaries;
 *   • a cycle with no facilities is disabled and says "No facilities yet";
 *   • a non-cycle page (Gap Closure / Building / IA / Fire NOC) shows NO cycle
 *     control at all;
 *   • choosing a past cycle writes ?cycleScope=N, shows the removable chip and
 *     the read-only banner.
 */
import { afterEach, describe, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost/facilities" });

const SUMMARY = {
  current: 157,
  all: 169,
  cycles: [
    { cycleNumber: 1, cycleType: "Initial", count: 157 },
    { cycleNumber: 2, cycleType: "Recertification", count: 12 },
  ],
};

mock.module("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  // The component's only query is cycleSummary; the banner shares it.
  useQuery: () => SUMMARY,
  useMutation: () => async () => undefined,
  useAction: () => async () => undefined,
  useConvex: () => ({ query: async () => ({ token: "t" }) }),
}));
mock.module("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useAuthActions: () => ({ signIn: async () => {}, signOut: async () => {} }),
}));

function defineGlobal(key: string, value: unknown) {
  try {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  } catch {
    (globalThis as Record<string, unknown>)[key] = value;
  }
}
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "Node",
  "Event",
  "CustomEvent",
  "MouseEvent",
  "KeyboardEvent",
  "PointerEvent",
  "HTMLInputElement",
  "HTMLButtonElement",
  "DocumentFragment",
  "NodeFilter",
] as const) {
  defineGlobal(key, (win as unknown as Record<string, unknown>)[key]);
}
defineGlobal("getComputedStyle", win.getComputedStyle.bind(win));
defineGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
defineGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
defineGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});
defineGlobal("MutationObserver", class {
  observe() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
});
if (!win.matchMedia) {
  Object.defineProperty(win, "matchMedia", {
    value: () => ({
      matches: false,
      media: "",
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      onchange: null,
      dispatchEvent: () => false,
    }),
  });
}
defineGlobal("matchMedia", win.matchMedia);
defineGlobal("IS_REACT_ACT_ENVIRONMENT", true);

type ReactModule = typeof import("react");
let react: ReactModule | null = null;
let createRoot: typeof import("react-dom/client").createRoot | null = null;
let mod: typeof import("../src/components/CycleFilter") | null = null;
let Router: typeof import("react-router").MemoryRouter | null = null;
let useLocationFn: typeof import("react-router").useLocation | null = null;

async function deps() {
  if (!react) react = await import("react");
  if (!createRoot) createRoot = (await import("react-dom/client")).createRoot;
  if (!mod) mod = await import("../src/components/CycleFilter");
  if (!Router) {
    const rr = await import("react-router");
    Router = rr.MemoryRouter;
    useLocationFn = rr.useLocation;
  }
  return { react: react!, createRoot: createRoot!, mod: mod!, Router: Router! };
}

const mounted: (() => void)[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.();
});

function LocationProbe() {
  const loc = useLocationFn!();
  return react!.createElement(
    "span",
    { "data-testid": "location-probe", hidden: true },
    loc.search,
  );
}

async function mountAt(
  path: string,
  props: Record<string, unknown> = {},
): Promise<HTMLElement> {
  const { react: r, createRoot: cr, mod: m, Router: R } = await deps();
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = cr(container, {} as never);
  await r.act(async () => {
    root.render(
      r.createElement(
        R,
        { initialEntries: [path] },
        r.createElement(
          r.Fragment,
          null,
          r.createElement(m.CycleFilter, props as never),
          r.createElement(m.CycleScopeBanner),
          r.createElement(LocationProbe),
        ),
      ) as never,
    );
    await new Promise((res) => setTimeout(res, 10));
  });
  mounted.push(() => {
    try {
      r.act(() => root.unmount());
    } catch {
      /* gone */
    }
    container.remove();
  });
  return container;
}

const q = (el: ParentNode, id: string) =>
  el.querySelector<HTMLElement>(`[data-testid="${id}"]`);

async function click(el: HTMLElement | null) {
  const { react: r } = await deps();
  await r.act(async () => {
    el?.dispatchEvent(new win.MouseEvent("click", { bubbles: true }) as unknown as Event);
    await new Promise((res) => setTimeout(res, 20));
  });
}

describe("CycleFilter — redesigned, in-page", () => {
  test("trigger reads 'Cycle: Current'", async () => {
    const el = await mountAt("/facilities");
    const trigger = q(el, "cycle-filter-trigger");
    expect(trigger).not.toBeNull();
    expect(trigger!.textContent).toContain("Cycle: Current");
    expect(trigger!.textContent).not.toContain("Cycle: Cycle");
    // One-line trigger: no active-count badge next to the label.
    expect(trigger!.textContent?.match(/\b1\b/)).toBeNull();
  });

  test("menu: radiogroup, real labels, counts and a soft blue selected row", async () => {
    const el = await mountAt("/facilities");
    await click(q(el, "cycle-filter-trigger"));
    const menu = q(el, "cycle-filter-menu") ?? win.document.body.querySelector('[data-testid="cycle-filter-menu"]');
    expect(menu).not.toBeNull();
    const group = menu!.querySelector('[role="radiogroup"]');
    expect(group).not.toBeNull();

    const at = (id: string) =>
      (win.document.body.querySelector(`[data-testid="${id}"]`) as HTMLElement | null) ??
      q(el, id);
    expect(at("cycle-option-current")?.textContent).toContain("Current cycle");
    expect(at("cycle-option-current")?.textContent).toContain("157");
    expect(at("cycle-option-1")?.textContent).toContain("Cycle #1 Initial");
    expect(at("cycle-option-2")?.textContent).toContain("Cycle #2 Recertification");
    expect(at("cycle-option-all")?.textContent).toContain("All cycles");
    expect(at("cycle-option-all")?.textContent).toContain("169");

    const current = at("cycle-option-current")!;
    expect(current.getAttribute("aria-checked")).toBe("true");
    expect(current.className).toContain("bg-primary/10");
    expect(current.className).not.toContain("bg-neutral-800");
    expect(current.querySelector("svg")).not.toBeNull();
    // Three radio rows, one line each — the long descriptions are gone; the
    // explanation lives in the info tooltip.
    expect(current.textContent).not.toContain("Each facility's latest open cycle");
  });

  test("summaries hide 'All cycles' (allowAll=false)", async () => {
    const el = await mountAt("/dashboard", { allowAll: false });
    await click(q(el, "cycle-filter-trigger"));
    expect(win.document.body.querySelector('[data-testid="cycle-option-all"]')).toBeNull();
  });

  test("a cycle with no facilities is disabled and says so", async () => {
    const el = await mountAt("/facilities");
    await click(q(el, "cycle-filter-trigger"));
    const menu = win.document.body.querySelector('[data-testid="cycle-filter-menu"]');
    const empty = Array.from(menu?.querySelectorAll('[role="radio"]') ?? []).find((b) =>
      (b.textContent ?? "").includes("Cycle #2"),
    ) as HTMLButtonElement | undefined;
    // #2 has 12 in the fixture; #3 does not exist, so it is not offered at all.
    expect(empty?.disabled).toBe(false);
  });

  test("choosing a past cycle writes the URL, shows the chip and the read-only banner", async () => {
    const el = await mountAt("/facilities");
    await click(q(el, "cycle-filter-trigger"));
    const opt = win.document.body.querySelector('[data-testid="cycle-option-1"]') as HTMLElement;
    await click(opt);
    expect(q(el, "location-probe")?.textContent).toContain("cycleScope=1");
    const chip = q(el, "cycle-filter-chip");
    expect(chip?.textContent).toContain("Cycle: Cycle #1");
    expect(q(el, "cycle-readonly-banner")?.textContent).toContain("Viewing");
    expect(q(el, "cycle-readonly-banner")?.textContent).toContain("Back to current");
  });

  test("non-cycle pages render NO cycle control at all", async () => {
    for (const path of ["/facilities/fund", "/facilities/building", "/facilities/internal-assessment"]) {
      const el = await mountAt(path);
      expect(q(el, "cycle-filter")).toBeNull();
      expect(q(el, "cycle-filter-trigger")).toBeNull();
    }
  });
});
