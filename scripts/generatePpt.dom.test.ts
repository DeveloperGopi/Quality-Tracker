/**
 * GENERATE PPT — DOM smoke test for the three surfaces a user actually sees:
 *   • the canvas (the selected slide at fit/100%/75%),
 *   • the filmstrip (grouped thumbnails, selection and eye toggles),
 *   • present mode (open from the toolbar, arrows navigate, Esc exits).
 *
 * It also pins the Theme/Density wiring at the preview boundary: a saved
 * high-contrast + compact preference must paint the canvas black/white and
 * pull the content header up. The download side is covered by
 * scripts/deckDesign.test.ts, which reads the real .pptx XML.
 *
 * Run: bun test ./scripts/generatePpt.dom.test.ts
 */
import { afterEach, describe, expect, mock, test } from "bun:test";
import { createElement } from "react";
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost/generate-ppt" });

const ROWS = [
  {
    facility: "Test CHC",
    type: "CHC",
    block: "Block A",
    phc: "PHC One",
    eligibility: "Eligible",
    currentStatus: "Certified — On track",
    certStatus: "Quality Certified",
    naStatus: null,
    certDate: "2025-06-12",
    certScore: 82.5,
    naScheduledDate: null,
    saStatus: "Completed",
    generalDocStatus: null,
    naMode: "Physical",
    saScore: 78,
    buildingStatus: "Good",
    buildingType: "Own Building",
    fireNocStatus: "Valid",
    fireNocExpiry: "2026-12-31",
    nqasIaQ1: 70,
    nqasIaQ2: 75,
    kayakalpIaQ1: 65,
    kayakalpIaQ2: 68,
    surveillanceDue1: "2026-06-12",
    surveillanceDone1: null,
    surveillanceDue2: null,
    surveillanceDone2: null,
    validityDate: "2028-06-12",
    gapClosureAmount: 5,
    gcFundYear: "2025-26",
    cycle: 1,
  },
  {
    facility: "Test PHC",
    type: "PHC",
    block: "Block B",
    phc: "PHC Two",
    eligibility: "Possible",
    currentStatus: "SA Scheduled",
    certStatus: null,
    naStatus: null,
    certDate: null,
    certScore: null,
    naScheduledDate: null,
    saStatus: "Scheduled",
    generalDocStatus: null,
    naMode: null,
    saScore: null,
    buildingStatus: null,
    buildingType: null,
    fireNocStatus: null,
    fireNocExpiry: null,
    nqasIaQ1: null,
    nqasIaQ2: null,
    kayakalpIaQ1: null,
    kayakalpIaQ2: null,
    surveillanceDue1: null,
    surveillanceDone1: null,
    surveillanceDue2: null,
    surveillanceDone2: null,
    validityDate: null,
    gapClosureAmount: null,
    gcFundYear: null,
    cycle: 1,
  },
];

mock.module("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useQuery: (fn: unknown) => {
    const key = String(fn);
    if (key.endsWith("getReportData")) return { rows: ROWS };
    if (key.endsWith("getAppSettings")) return { settings: { rateBands: { green: 75, amber: 50 } } };
    return undefined;
  },
  useMutation: () => async () => undefined,
  useAction: () => async () => undefined,
  useConvex: () => ({ query: async () => ({ token: "t" }) }),
}));

/**
 * The generated api is an `anyApi` Proxy. A string Proxy keeps the page's
 * `api.modules.getReportData` lookup cheap and readable in the query mock
 * without importing the Convex backend into happy-dom.
 */
mock.module("@/convex/_generated/api", () => ({
  api: new Proxy(
    {},
    {
      get: (_target, page) =>
        new Proxy(
          {},
          {
            get: (_p, fn) => `${String(page)}.${String(fn)}`,
          },
        ),
    },
  ),
}));

mock.module("@/components/AppShell", () => ({
  // Keep the page actions (Present / Slide sorter / Download) so the toolbar
  // is part of the smoke test; the real shell chrome is not under test.
  AppShell: ({ children, actions }: { children?: unknown; actions?: unknown }) =>
    createElement("div", null, actions, children),
}));

mock.module("@/components/CycleFilter", () => ({
  CycleFilter: () => null,
  useCycleScope: () => undefined,
}));

mock.module("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { email: "deck-smoke@example.com", role: "admin", appRole: "admin" },
    isAuthenticated: true,
    isLoading: false,
    signOut: async () => {},
  }),
}));

mock.module("sonner", () => ({
  toast: Object.assign(() => {}, { success() {}, error() {}, info() {} }),
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
  "localStorage",
  "HTMLElement",
  "Element",
  "Node",
  "Event",
  "CustomEvent",
  "MouseEvent",
  "KeyboardEvent",
  "HTMLInputElement",
  "HTMLButtonElement",
  "HTMLSelectElement",
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
let Page: typeof import("../src/pages/GeneratePpt") | null = null;

async function deps() {
  if (!react) react = await import("react");
  if (!createRoot) createRoot = (await import("react-dom/client")).createRoot;
  if (!Page) Page = await import("../src/pages/GeneratePpt");
  return { react: react!, createRoot: createRoot!, Page: Page! };
}

const mounted: (() => void)[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.();
  win.document.body.innerHTML = "";
  // This file installs its own Window as the DOM global. Leave no stored
  // preference behind (and no storage object at all) for the DOM tests that
  // run after it: the list URL reads the row-view preference from bare
  // localStorage, and a leftover "50" would change their clean URLs.
  win.localStorage.clear();
  Reflect.deleteProperty(globalThis, "localStorage");
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PREFS_KEY = "nqas.deck.prefs.v2.deck-smoke@example.com";

async function mount(prefs?: Record<string, unknown>): Promise<HTMLElement> {
  await deps();
  // The page reads the bare global; afterEach removes it again so the next
  // DOM test file starts with no stored preferences.
  defineGlobal("localStorage", win.localStorage);
  win.localStorage.clear();
  if (prefs) win.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = createRoot!(container, {} as never);
  await react!.act(async () => {
    root.render(react!.createElement(Page!.default, {}) as never);
    await sleep(80);
  });
  mounted.push(() => {
    try {
      react!.act(() => root.unmount());
    } catch {
      /* gone */
    }
    container.remove();
  });
  return container;
}

const q = (root: ParentNode, sel: string) => root.querySelector(sel);
const qa = (root: ParentNode, sel: string) => [...root.querySelectorAll(sel)];
const text = (root: ParentNode | null | undefined) => root?.textContent ?? "";

async function click(el: Element | null | undefined) {
  expect(el).toBeTruthy();
  await react!.act(async () => {
    el!.dispatchEvent(new win.MouseEvent("mousedown", { bubbles: true }));
    el!.dispatchEvent(new win.MouseEvent("mouseup", { bubbles: true }));
    el!.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
    await sleep(30);
  });
}

async function press(key: string) {
  await react!.act(async () => {
    win.dispatchEvent(new win.KeyboardEvent("keydown", { key, bubbles: true }) as unknown as Event);
    await sleep(30);
  });
}

function presentButton(root: ParentNode): HTMLButtonElement {
  const button = qa(root, "button").find((b) => b.textContent?.trim() === "Present");
  expect(button).toBeTruthy();
  return button as HTMLButtonElement;
}

describe("Generate PPT — canvas and filmstrip", () => {
  test("the canvas shows the selected slide inside the fixed 16:9 frame", async () => {
    const c = await mount();
    const canvas = q(c, "[data-testid=deck-canvas]");
    expect(canvas).toBeTruthy();
    expect(q(canvas!, "[data-deck-canvas='960x540']")).toBeTruthy();
    // Titles hidden/appendix are still previewable; the default deck opens on
    // the cover.
    expect(q(canvas!, "[data-deck-slide]")?.getAttribute("data-deck-slide")).toBe("title");
    expect(text(canvas)).toContain("NQAS Certification Summary");
    expect(text(c)).toContain("will be exported");
  });

  test("the filmstrip lists every slide and selecting a thumbnail moves the canvas", async () => {
    const c = await mount();
    const filmstrip = q(c, "[data-testid=deck-filmstrip]");
    expect(filmstrip).toBeTruthy();
    expect(filmstrip!.getAttribute("role")).toBe("listbox");
    expect(filmstrip!.getAttribute("aria-label")).toBe("Slides");
    // Every slide the model built is in the strip (including hidden appendix
    // slides); the ten visible ones are a subset.
    expect(qa(filmstrip!, "[data-deck-canvas]").length).toBeGreaterThanOrEqual(10);

    const thumb = q(filmstrip!, "[data-deck-slide='exec']");
    expect(thumb).toBeTruthy();
    await click(thumb!.closest("button"));

    const canvas = q(c, "[data-testid=deck-canvas]");
    expect(q(canvas!, "[data-deck-slide]")?.getAttribute("data-deck-slide")).toBe("exec");
    expect(text(canvas)).toContain("2 facilities");
  });
});

describe("Generate PPT — present mode", () => {
  test("Present opens on the selected slide, arrows navigate and Esc exits", async () => {
    const c = await mount();
    const filmstrip = q(c, "[data-testid=deck-filmstrip]")!;
    await click(q(filmstrip, "[data-deck-slide='exec']")!.closest("button"));

    await click(presentButton(c));
    const overlay = q(c, "[data-testid=deck-present]");
    expect(overlay).toBeTruthy();
    expect(overlay!.getAttribute("role")).toBe("dialog");
    expect(q(overlay!, "[data-deck-slide]")?.getAttribute("data-deck-slide")).toBe("exec");
    // exec is page 2 of the 10 visible slides (the appendix is hidden).
    expect(text(overlay)).toContain("2 / 10");

    await press("ArrowRight");
    expect(text(q(c, "[data-testid=deck-present]"))).toContain("3 / 10");
    expect(
      q(q(c, "[data-testid=deck-present]")!, "[data-deck-slide]")?.getAttribute("data-deck-slide"),
    ).toBe("where");

    await press("Escape");
    expect(q(c, "[data-testid=deck-present]")).toBeNull();
    // The editor is still mounted after leaving the presentation.
    expect(q(c, "[data-testid=deck-canvas]")).toBeTruthy();
  });
});

describe("Generate PPT — the saved design reaches the preview", () => {
  test("high-contrast + compact paints black chrome and a shorter header", async () => {
    const c = await mount({ theme: "high-contrast", density: "compact" });
    const canvas = q(c, "[data-testid=deck-canvas]")!;
    // The preview opens on the cover; choose a content slide so the header
    // band (the Theme's title bar) is present.
    const filmstrip = q(c, "[data-testid=deck-filmstrip]")!;
    await click(q(filmstrip, "[data-deck-slide='exec']")!.closest("button"));

    const slide = q(canvas, "[data-deck-slide='exec']") as HTMLElement;
    expect(slide).toBeTruthy();
    const header = slide.firstElementChild as HTMLElement;
    expect(header.getAttribute("style") ?? "").toMatch(/background:\s*(#000000|rgb\(0,\s*0,\s*0\))/);
    // Compact pulls the 96 px header band down to 88 px.
    expect(header.getAttribute("style") ?? "").toContain("height: 88px");
    // High contrast uses white paper and black ink, not the teal palette.
    expect((slide.getAttribute("style") ?? "").toLowerCase()).toContain("background: #ffffff");
    expect((slide.getAttribute("style") ?? "").toLowerCase()).toContain("color: #000000");
  });
});
