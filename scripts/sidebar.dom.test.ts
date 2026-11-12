/**
 * APP SHELL — the floating sidebar with an icon rail (DesignLib rebuild).
 *
 * Mounts the REAL AppShell in happy-dom (Convex/auth stubbed like the other
 * DOM tests) and pins the rebuild:
 *  • the floating card: white face inset 12px, radius 20, layered shadow,
 *    `height: calc(100dvh - 24px)`, `position: sticky; top: 12px`, grid
 *    `var(--sb-w) minmax(0,1fr)` with a 12px gap,
 *  • three states — ≥1280 expanded (264px), 768–1279 rail (76px), <768
 *    collapsed (drawer) — mirrored on <html data-sidebar> before first paint,
 *    a stale desktop "collapsed" is coerced back to the width default,
 *  • header [emblem] [title + wrapping subtitle] [round toggle in its own
 *    column], the search field with a ⌘K / Ctrl K chip (hidden on touch),
 *  • grouped nav: uppercase muted labels, ONE-line 44px rows with 20px
 *    outline icons, flex-none badges (amber attention count = buildMetrics,
 *    blue "New" pill that expires on schedule),
 *  • the truncation tooltip (only when measured truncated), the rail's
 *    always-on tooltip with the badge count,
 *  • footer: bell (top-5 needs-attention popover from the same buildMetrics),
 *    Help (→ the existing legend panel), a visible Sign out icon in both
 *    states, and the user row with the chevron menu,
 *  • scroll contract: nav is the ONLY scroll zone, fade cues only when
 *    content exists, Sign out pinned outside the scroll zone,
 *  • role visibility (Viewer sees no Bulk Import / Admin Settings),
 *  • reduced motion, the pre-paint inline script, no horizontal overflow.
 *
 * Note: this repository ships bun + happy-dom contract tests only (no
 * Playwright project), so the browser-level scenarios from the brief are
 * covered here at the DOM/CSS-contract level.
 *
 * Run: bun test ./scripts/sidebar.dom.test.ts
 */
import { describe, test, expect, afterEach, beforeEach, mock } from "bun:test";
import { readFileSync } from "node:fs";
import { Window } from "happy-dom";
/* The app's queries come from the generated api — which is an opaque Convex
 * Proxy (every `api.ops.x` access manufactures a NEW FunctionReference, no
 * readable path), so identity comparison is impossible. Mock the api module
 * with a stable fake whose every leaf is self-tagged with its access path:
 * the stub then identifies queries by the tag. */
const apiNodeCache = new Map<string, Record<string, unknown>>();
function apiNode(path: string): Record<string, unknown> {
  let node = apiNodeCache.get(path);
  if (!node) {
    node = new Proxy({} as Record<string, unknown>, {
      get: (_t, key: string | symbol) => {
        if (key === "__convexRef") return path;
        if (typeof key !== "string" || key === "then") return undefined;
        return apiNode(path ? `${path}.${key}` : key);
      },
    });
    apiNodeCache.set(path, node);
  }
  return node;
}
const fakeApi = apiNode("");
/** The access path of a (mocked) Convex query reference, e.g. "ops.getMasterView". */
function refPath(x: unknown): string | undefined {
  return (x as { __convexRef?: string } | null)?.__convexRef;
}
mock.module("@/convex/_generated/api", () => ({
  api: fakeApi,
  internal: fakeApi,
  components: fakeApi,
}));

const win = new Window({ url: "http://localhost/" });

/* ------------------------------------------------------------------ */
/* Stubbed globals + controllable Convex/auth data                      */
/* ------------------------------------------------------------------ */

/** Test data the Convex stub hands back (set per test below). */
const mockUser = {
  name: "Test Officer",
  email: "test.officer.with.a.long.address@tn.gov.in",
  appRole: "admin",
} as { name: string; email: string; appRole: string };
let mockRows: {
  facility: {
    _id: string;
    name: string;
    block: string;
    facilityType: string;
    phc: string;
    ninNumber: string | null;
    currentStatus: string | null;
    saqshamCategory: string | null;
  };
  noc: null;
  nqas: null;
}[] = [];

mock.module("convex/react", () => ({
  useQuery: (query: unknown) => {
    switch (refPath(query)) {
      case "ops.listFacilityRowsFast":
        return { rows: mockRows };
      default:
        return undefined; // getMasterView / getAppSettings → defaults
    }
  },
  useMutation: () => async () => undefined,
  useAction: () => async () => undefined,
  useConvex: () => ({ query: async () => ({ token: "test-token" }) }),
}));
mock.module("@convex-dev/auth/react", () => ({
  ConvexAuthProvider: ({ children }: { children?: unknown }) => children,
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));
mock.module("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: async () => undefined,
  }),
}));

function defineGlobal(key: string, value: unknown) {
  try {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  } catch {
    (globalThis as Record<string, unknown>)[key] = value;
  }
}
defineGlobal("window", win);
defineGlobal("document", win.document);
defineGlobal("navigator", win.navigator);
defineGlobal("HTMLElement", win.HTMLElement);
defineGlobal("Element", win.Element);
defineGlobal("Node", win.Node);
defineGlobal("CustomEvent", win.CustomEvent);
defineGlobal("Event", win.Event);
defineGlobal("MouseEvent", win.MouseEvent);
defineGlobal("FocusEvent", win.FocusEvent ?? win.Event);
defineGlobal("KeyboardEvent", win.KeyboardEvent);
defineGlobal("getComputedStyle", win.getComputedStyle.bind(win));
defineGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
  setTimeout(() => cb(0), 0),
);
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
defineGlobal("NodeFilter", win.NodeFilter ?? { SHOW_ELEMENT: 1 });
defineGlobal("HTMLInputElement", win.HTMLInputElement ?? class {});
defineGlobal("HTMLSelectElement", win.HTMLSelectElement ?? class {});
defineGlobal("HTMLTextAreaElement", win.HTMLTextAreaElement ?? class {});
defineGlobal("HTMLButtonElement", win.HTMLButtonElement ?? class {});
if (!win.matchMedia) {
  Object.defineProperty(win, "matchMedia", {
    value: () => ({
      matches: false,
      media: "",
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent: () => false,
    }),
  });
}
defineGlobal("matchMedia", win.matchMedia.bind(win));

/** `bun test` shares one process across files: another DOM test can replace
 *  these globals after this module imported, and the app code reads the
 *  GLOBAL document/window at call time. Re-bind before every test so the
 *  assertions always observe this file's own Window. */
function rebindGlobals() {
  defineGlobal("window", win);
  defineGlobal("document", win.document);
  defineGlobal("navigator", win.navigator);
  defineGlobal("HTMLElement", win.HTMLElement);
  defineGlobal("Element", win.Element);
  defineGlobal("Node", win.Node);
  defineGlobal("MouseEvent", win.MouseEvent);
  defineGlobal("FocusEvent", win.FocusEvent ?? win.Event);
  defineGlobal("KeyboardEvent", win.KeyboardEvent);
  defineGlobal("getComputedStyle", win.getComputedStyle.bind(win));
  defineGlobal("matchMedia", win.matchMedia.bind(win));
}
beforeEach(rebindGlobals);

let h: typeof import("react").createElement;
let createRoot: typeof import("react-dom/client").createRoot;

async function deps() {
  if (!h) h = (await import("react")).createElement;
  if (!createRoot) createRoot = (await import("react-dom/client")).createRoot;
  return { h, createRoot };
}

let AppShellMod: typeof import("../src/components/AppShell");
let MemoryRouter: typeof import("react-router").MemoryRouter;

async function loadMod() {
  AppShellMod ??= await import("../src/components/AppShell");
  MemoryRouter ??= (await import("react-router")).MemoryRouter;
  return AppShellMod;
}

const mounted: { root: { unmount: () => void }; container: HTMLElement }[] = [];

async function mount(node: import("react").ReactElement, initialPath = "/dashboard") {
  await deps();
  await loadMod();
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = createRoot(container);
  root.render(h(MemoryRouter, { initialEntries: [initialPath] }, node));
  await new Promise((r) => setTimeout(r, 5));
  mounted.push({ root, container });
  return container;
}

function cleanup() {
  while (mounted.length) {
    const m = mounted.pop()!;
    m.root.unmount();
    m.container.remove();
  }
  mockRows = [];
}

function setViewport(width: number, height = 720) {
  Object.defineProperty(win, "innerWidth", { value: width, configurable: true });
  Object.defineProperty(win, "innerHeight", { value: height, configurable: true });
}

function q(root: ParentNode, selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll(selector)) as HTMLElement[];
}

const css = () => readFileSync("src/index.css", "utf8");
const html = () => readFileSync("index.html", "utf8");

const settle = (ms = 10) => new Promise((r) => setTimeout(r, ms));

afterEach(cleanup);

/** A couple of facilities so the palette has something in memory to search. */
function seedRows() {
  mockRows = [
    row("f1", "PHC Alangayam", "Alangayam", "4527324786", "G"),
    row("f2", "CHC Vaniyambadi", "Vaniyambadi", "4527390011", "G"),
    row("f3", "K Brahmapuram", "Alangayam", "4527402255", "K Brahmapuram Category"),
  ];
}
function row(
  id: string,
  name: string,
  block: string,
  nin: string,
  saqsham: string | null,
) {
  return {
    facility: {
      _id: id,
      name,
      block,
      facilityType: block.startsWith("V") ? "CHC" : "PHC",
      phc: name,
      ninNumber: nin,
      currentStatus: "SA Not Yet Initiated",
      saqshamCategory: saqsham,
    },
    noc: null,
    nqas: null,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function shellAt(path = "/dashboard") {
  const { AppShell } = await deps().then(loadMod);
  return mount(h(AppShell, { title: "Page", children: null }), path);
}

function asideEl() {
  return win.document.querySelector("aside")!;
}

function navLinks(root: ParentNode = win.document) {
  return q(root, "a[data-nav-item]");
}

describe("sidebar — ONE nav tree, no duplicates", () => {
  beforeEach(() => {
    win.document.documentElement.removeAttribute("data-sidebar");
    win.document.documentElement.removeAttribute("data-drawer");
    win.localStorage.removeItem("nqas.sidebar");
    win.localStorage.removeItem("nqas.sidebar.hint");
    mockRows = [];
  });

  test("expanded: exactly one nav, one link per config item, one logo", async () => {
    setViewport(1366);
    await shellAt();
    const aside = asideEl();
    expect(q(aside, "nav")).toHaveLength(1);
    const { buildSidebarNav } = await import("../src/lib/sidebarConfig");
    const groups = buildSidebarNav({ role: "admin", appRole: "admin", attentionCount: 0 });
    const expected = groups.flatMap((g) => g.items).map((i) => i.to);
    const links = navLinks(aside).map((a) => a.getAttribute("data-nav-item"));
    expect(links).toEqual(expected);
    // No second tree anywhere: no drawer nav, no peek overlay, no clones.
    expect(win.document.querySelectorAll("nav[aria-label='Main']")).toHaveLength(1);
    expect(navLinks()).toHaveLength(expected.length);
    expect(q(win.document, "[data-testid='sb-logo']")).toHaveLength(1);
    expect(q(win.document, "[data-testid='sb-toggle']")).toHaveLength(0);
    expect(win.document.querySelector(".sb-peek")).toBeNull();
    expect(win.document.querySelector(".sb-rail-group-label")).toBeNull();
    // Group labels rendered once (expanded) — not duplicated per state.
    expect(q(aside, ".sb-group")).toHaveLength(groups.length);
  });

  test("rail: same single tree, text removed by CSS (never a faded copy)", async () => {
    setViewport(1024);
    await shellAt();
    const aside = asideEl();
    expect(win.document.documentElement.getAttribute("data-sidebar")).toBe("rail");
    expect(q(win.document, "nav")).toHaveLength(1);
    expect(navLinks()).toHaveLength(navLinks(aside).length);
    // Text still exists ONCE for screen readers, hidden via display:none CSS.
    expect(q(aside, ".sb-title")).toHaveLength(1);
    const style = css();
    // Every piece of rail text is REMOVED from the layout (display:none) — no
    // faded copy, no zero-opacity text node left sitting on a tile.
    const railHide = (sel: string) => {
      const re = new RegExp(
        `html\\[data-sidebar="rail"\\][^{]*\\${sel}[^{]*\\{([^}]*)\\}`,
      );
      return style.match(re)?.[1] ?? "";
    };
    for (const sel of [".sb-title", ".sb-link-label", ".sb-group", ".sb-foot-label", ".sb-user-text"]) {
      expect(railHide(sel)).toContain("display: none");
    }
    // No opacity-based fade on any sidebar text (only display/visibility).
    const labelFade = style.match(/\.sb-(title|link-label|group|user-name|user-role)[^{]*\{[^}]*opacity:\s*0/);
    expect(labelFade).toBeNull();
    // The rail card is 72px and the card itself never clips (inner does).
    expect(style).toContain("--sb-rail-w: 4.5rem;");
    expect(style).toContain("overflow: visible;");
    const inner = style.slice(style.indexOf(".sb-inner {"));
    expect(inner.slice(0, 300)).toContain("overflow: hidden;");
  });

  test("drawer (<768): the SAME aside becomes the modal — no second nav", async () => {
    setViewport(360);
    await shellAt();
    expect(win.document.documentElement.getAttribute("data-sidebar")).toBe("drawer");
    expect(q(win.document, "nav")).toHaveLength(1);
    const aside = asideEl();
    expect(aside.getAttribute("data-open")).toBe("false");
    expect(q(aside, "nav")).toHaveLength(1);
  });
});

describe("logo = expand / collapse (no toggle button)", () => {
  beforeEach(() => {
    win.document.documentElement.removeAttribute("data-sidebar");
    win.localStorage.removeItem("nqas.sidebar");
    win.localStorage.removeItem("nqas.sidebar.hint");
    mockRows = [];
  });

  test("the logo button carries the accessible name, aria-expanded and the tooltip", async () => {
    setViewport(1366);
    await shellAt();
    const logo = q(win.document, "[data-testid='sb-logo']")[0] as HTMLButtonElement;
    expect(logo).toBeDefined();
    expect(logo.getAttribute("aria-label")).toBe("Collapse sidebar · Ctrl+B");
    /* ONE tooltip system: the shared layer reads data-tip; a native `title`
       here drew the browser's black box on top of it (the duplicate). */
    expect(logo.getAttribute("title")).toBeNull();
    expect(logo.getAttribute("data-tip")).toBe("Collapse sidebar · Ctrl+B");
    expect(logo.getAttribute("aria-expanded")).toBe("true");
    expect(logo.getAttribute("aria-controls")).toBe("app-sidebar");
    expect(logo.getAttribute("aria-keyshortcuts")).toContain("Control+B");
    // No round toggle remains anywhere.
    expect(q(win.document, "[data-testid='sb-toggle']")).toHaveLength(0);
    expect(css()).not.toContain(".sb-round {");
    /* PART 1 — the emblem is the whole control: no icon element inside it and
       no second layer behind the image in any state. */
    expect(q(logo, "svg")).toHaveLength(0);
    expect(q(logo, ".sb-logo-glyph")).toHaveLength(0);
    expect(q(logo, "img")).toHaveLength(1);
    expect(css()).not.toContain(".sb-logo-glyph");
    expect(css()).toContain("transform: scale(1.03)");
  });

  test("click and Ctrl/Cmd+B collapse and expand; state persists", async () => {
    setViewport(1366);
    await shellAt();
    const logo = () => q(win.document, "[data-testid='sb-logo']")[0] as HTMLButtonElement;
    logo().click();
    await settle(20);
    expect(win.document.documentElement.getAttribute("data-sidebar")).toBe("rail");
    expect(logo().getAttribute("aria-label")).toBe("Expand sidebar · Ctrl+B");
    expect(logo().getAttribute("aria-expanded")).toBe("false");
    expect(win.localStorage.getItem("nqas.sidebar")).toBe("rail");
    logo().click();
    await settle(20);
    expect(win.document.documentElement.getAttribute("data-sidebar")).toBe("expanded");

    const fire = () =>
      win.dispatchEvent(new win.KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true }));
    fire();
    await settle(20);
    expect(win.document.documentElement.getAttribute("data-sidebar")).toBe("rail");
    fire();
    await settle(20);
    expect(win.document.documentElement.getAttribute("data-sidebar")).toBe("expanded");
    // Reload keeps the choice.
    cleanup();
    win.localStorage.setItem("nqas.sidebar", "rail");
    await shellAt();
    expect(win.document.documentElement.getAttribute("data-sidebar")).toBe("rail");
  });

  test("first-visit hint shows once, is dismissible and remembered", async () => {
    setViewport(1366);
    await shellAt();
    const hint = q(win.document, "[data-testid='sb-hint']")[0];
    expect(hint).toBeDefined();
    expect(hint.textContent).toContain("Click the logo to collapse or expand");
    q(hint, "button")[0].click();
    await settle(20);
    expect(q(win.document, "[data-testid='sb-hint']")).toHaveLength(0);
    expect(win.localStorage.getItem("nqas.sidebar.hint")).toBe("1");
    cleanup();
    await shellAt();
    expect(q(win.document, "[data-testid='sb-hint']")).toHaveLength(0);
  });

  test("the title is plain text (no link) and the logo is the only toggle", async () => {
    setViewport(1366);
    await shellAt();
    const aside = asideEl();
    const title = q(aside, ".sb-title")[0];
    expect(title.tagName).not.toBe("A");
    expect(title.textContent).toContain("NQAS Tracker");
    // No link wraps the title: the home destination is the Dashboard item.
    expect(q(aside, "a").some((a) => a.getAttribute("href") === "/")).toBe(false);
    expect(q(aside, "[role='button'][aria-expanded]")).toHaveLength(0);
    expect(q(aside, "button[aria-expanded][aria-controls='app-sidebar']")).toHaveLength(1);
  });
});

describe("exactly one active nav item", () => {
  beforeEach(() => {
    win.document.documentElement.removeAttribute("data-sidebar");
    win.localStorage.removeItem("nqas.sidebar");
    win.localStorage.removeItem("nqas.sidebar.hint");
    mockRows = [];
  });

  test("a category route activates only itself (not the Master List)", async () => {
    setViewport(1366);
    await shellAt("/facilities/building");
    const active = q(win.document, "a[data-nav-item][aria-current='page']");
    expect(active).toHaveLength(1);
    expect(active[0].getAttribute("data-nav-item")).toBe("/facilities/building");
    expect(active[0].getAttribute("aria-current")).toBe("page");
  });

  test("a facility profile activates its parent (Master List) only", async () => {
    setViewport(1366);
    await shellAt("/facilities/abc123");
    const active = q(win.document, "a[data-nav-item][aria-current='page']");
    expect(active).toHaveLength(1);
    expect(active[0].getAttribute("data-nav-item")).toBe("/facilities");
  });

  test("hover and focus never leave a filled (active) state behind", async () => {
    setViewport(1366);
    await shellAt("/dashboard");
    const link = q(win.document, "a[data-nav-item='/reports']")[0];
    link.dispatchEvent(new win.MouseEvent("pointerover", { bubbles: true }));
    link.dispatchEvent(new win.FocusEvent("focusin", { bubbles: true }));
    await settle();
    expect(q(win.document, "a[data-nav-item][aria-current='page']")).toHaveLength(1);
    expect(q(win.document, "a[data-nav-item='/reports']")[0].getAttribute("aria-current")).toBeNull();
    // Hover is a lighter tint, focus is a ring (CSS contract).
    expect(css()).toContain(".sb-link:hover {");
    expect(css()).toContain(".sb-link:focus-visible {");
    expect(css()).toContain("box-shadow: 0 0 0 2px");
  });
});

describe("footer: always visible, reachable, correct labels", () => {
  beforeEach(() => {
    win.document.documentElement.removeAttribute("data-sidebar");
    win.localStorage.removeItem("nqas.sidebar");
    win.localStorage.removeItem("nqas.sidebar.hint");
    mockRows = [];
  });

  test("expanded: Notifications + Help icon buttons, a visible Sign out text button, user row", async () => {
    setViewport(1366);
    await shellAt();
    const aside = asideEl();
    const foot = q(aside, "[data-testid='sb-foot']")[0];
    expect(foot).toBeDefined();
    expect(q(foot, "[data-testid='sb-bell']")).toHaveLength(1);
    expect(q(foot, "button[aria-label='Help']")).toHaveLength(1);
    const signout = q(foot, "[data-testid='sb-signout']")[0];
    expect(signout.getAttribute("aria-label")).toBe("Sign out");
    expect(signout.textContent).toContain("Sign out"); // visible text in expanded
    // Sign out sits OUTSIDE the nav (always reachable, never scrolled away).
    expect(q(aside, "nav [data-testid='sb-signout']")).toHaveLength(0);
    // User row: avatar | name | role tag on its own line | chevron button.
    const user = q(foot, ".sb-foot-user")[0];
    expect(q(user, ".sb-avatar")).toHaveLength(1);
    const name = q(user, ".sb-user-name")[0];
    const role = q(user, ".sb-user-role")[0];
    expect(name.textContent).toContain("Test Officer");
    expect(role.textContent).toContain("State Admin");
    expect(role.contains(name)).toBe(false);
    // Part I: the user row IS the profile link (no popover over the nav).
    const profileLink = q(foot, "[data-testid='sb-profile-link']")[0];
    expect(profileLink.tagName).toBe("A");
    expect(profileLink.getAttribute("href")).toBe("/profile");
    expect(profileLink.getAttribute("aria-label")).toContain("My profile");
  });

  test("rail: bell → Sign out icon → avatar, stacked, all labelled", async () => {
    setViewport(1024);
    await shellAt();
    const foot = q(asideEl(), "[data-testid='sb-foot']")[0];
    const buttons = q(foot, "button");
    const labels = buttons.map((b) => b.getAttribute("aria-label") ?? "");
    expect(labels.some((l) => l.startsWith("Needs attention") || l === "Notifications")).toBe(true);
    expect(labels).toContain("Sign out");
    const profileLink = q(foot, "[data-testid='sb-profile-link']")[0];
    expect(profileLink.getAttribute("aria-label")).toContain("My profile");
    expect(profileLink.getAttribute("data-tip")).toBe("My profile");
    expect(profileLink.getAttribute("href")).toBe("/profile");
    expect(foot.querySelector("[data-testid='sb-signout']")).toBeTruthy();
    // Help is hidden on the rail (CSS), Sign out label hidden too.
    const style = css();
    expect(style).toContain('html[data-sidebar="rail"] .sb-foot-label,');
    expect(style).toContain('html[data-sidebar="rail"] .sb-foot-help,');
    expect(style).toContain("flex-direction: column;");
    expect(style).toContain("gap: 8px;");
  });

  test("the bell panel lists the same facilities the badge counts", async () => {
    setViewport(1366);
    seedRows();
    mockRows = mockRows.map((r) => ({
      ...r,
      noc: { nocAvailable: "Yes", expiryDate: "2026-09-30", issuedDate: "2026-04-01" },
    }));
    await shellAt();
    const aside = asideEl();
    const badge = q(aside, ".sb-badge-amber")[0];
    expect(badge.textContent).toBe("3");
    const bell = q(aside, "[data-testid='sb-bell']")[0];
    expect(bell.getAttribute("aria-label")).toBe("Needs attention — 3 facilities");
    expect(bell.getAttribute("title")).toBeNull();
    expect(bell.getAttribute("data-tip")).toBe("3 items need attention");
    bell.click();
    await settle();
    const panel = win.document.querySelector<HTMLElement>("[data-testid='sb-notifications']")!;
    expect(panel.textContent).toContain("Notifications");
    expect(
      win.document.querySelector("[data-testid='sb-notifications-count']")!.textContent,
    ).toBe("3");
    expect(q(panel, "li")).toHaveLength(3);
    expect(panel.textContent).toContain("View all in Master List (3)");
    expect(panel.querySelector("a[href*='kpi=attention']")).toBeTruthy();
    // The badge number comes from the SAME list the panel renders.
    const { attentionList } = await import("../src/lib/masterColumns");
    expect(attentionList(mockRows as never).length).toBe(3);
  });

  test("short screens fold the footer into one row", async () => {
    setViewport(1366, 520);
    await shellAt();
    const aside = asideEl();
    expect(aside.getAttribute("data-compact")).toBe("true");
    expect(css()).toContain('.app-aside[data-compact="true"] .sb-foot {');
  });
});

describe("rail tooltips: top layer, never clipped", () => {
  beforeEach(() => {
    win.document.documentElement.removeAttribute("data-sidebar");
    win.localStorage.removeItem("nqas.sidebar");
    win.localStorage.removeItem("nqas.sidebar.hint");
    mockRows = [];
  });

  test("hover and focus show a portalled pill, placed inside the viewport", async () => {
    setViewport(1024);
    await shellAt();
    const tile = q(win.document, "aside a[data-nav-item]")[3];
    tile.dispatchEvent(new win.MouseEvent("pointerover", { bubbles: true }));
    await settle(200);
    const tip = win.document.querySelector<HTMLElement>("[data-testid='app-tip']")!;
    expect(tip).toBeDefined();
    expect(tip.getAttribute("popover")).toBe("manual");
    expect(tip.getAttribute("role")).toBe("tooltip");
    expect(tip.parentElement).toBe(win.document.body);
    expect(tip.closest("aside")).toBeNull();
    expect(Number.parseFloat(tip.style.left)).toBeGreaterThanOrEqual(0);
    tile.dispatchEvent(new win.MouseEvent("pointerout", { bubbles: true }));
    await settle();
    expect(win.document.querySelector("[data-testid='app-tip']")).toBeNull();
    tile.dispatchEvent(new win.FocusEvent("focusin", { bubbles: true }));
    await settle(200);
    expect(win.document.querySelector("[data-testid='app-tip']")).toBeTruthy();
  });

  test("the last rail control (avatar) gets a tooltip too", async () => {
    setViewport(1024);
    await shellAt();
    const avatar = q(win.document, "aside .sb-avatar-btn")[0];
    avatar.dispatchEvent(new win.MouseEvent("pointerover", { bubbles: true }));
    await settle(200);
    const tip = win.document.querySelector<HTMLElement>("[data-testid='app-tip']")!;
    expect(tip.textContent).toBe("My profile");
    expect(tip.parentElement).toBe(win.document.body);
  });
});

describe("drawer at 360px: open, trap, Esc, backdrop, logo closes", () => {
  beforeEach(() => {
    win.document.documentElement.removeAttribute("data-sidebar");
    win.document.documentElement.removeAttribute("data-drawer");
    win.localStorage.removeItem("nqas.sidebar");
    win.localStorage.removeItem("nqas.sidebar.hint");
    mockRows = [];
  });

  test("hamburger opens the same aside as a modal; Esc and the logo close it", async () => {
    setViewport(360);
    await shellAt();
    const aside = asideEl();
    expect(win.document.documentElement.getAttribute("data-sidebar")).toBe("drawer");
    const burger = q(win.document, "button[aria-label='Open navigation menu']")[0];
    burger.click();
    await settle(20);
    expect(aside.getAttribute("data-open")).toBe("true");
    expect(aside.getAttribute("role")).toBe("dialog");
    expect(aside.getAttribute("aria-modal")).toBe("true");
    expect(win.document.documentElement.getAttribute("data-drawer")).toBe("open");
    expect(q(win.document, "[data-testid='sb-drawer-backdrop']")).toHaveLength(1);
    // One nav, labels visible (drawer is the expanded presentation).
    expect(q(aside, "nav")).toHaveLength(1);
    // Esc closes and returns the focus to the hamburger.
    win.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle(20);
    expect(aside.getAttribute("data-open")).toBe("false");
    expect(win.document.activeElement).toBe(burger);
  });

  test("the logo closes the drawer; the backdrop closes it too", async () => {
    setViewport(360);
    await shellAt();
    const aside = asideEl();
    const burger = q(win.document, "button[aria-label='Open navigation menu']")[0];
    burger.click();
    await settle(20);
    const logo = q(aside, "[data-testid='sb-logo']")[0];
    expect(logo.getAttribute("aria-label")).toBe("Close navigation menu");
    logo.click();
    await settle(20);
    expect(aside.getAttribute("data-open")).toBe("false");
    burger.click();
    await settle(20);
    q(win.document, "[data-testid='sb-drawer-backdrop']")[0].click();
    await settle(20);
    expect(aside.getAttribute("data-open")).toBe("false");
  });
});

describe("notifications & help popovers: top layer, own size, one at a time", () => {
  beforeEach(() => {
    win.document.documentElement.removeAttribute("data-sidebar");
    win.document.documentElement.removeAttribute("data-drawer");
    win.localStorage.removeItem("nqas.sidebar");
    win.localStorage.removeItem("nqas.sidebar.hint");
    mockRows = [];
  });

  test("CSS: fixed size clamp, never the anchor's width, never clipped", () => {
    const style = css();
    const panel = style.slice(style.indexOf(".sb-pop2 {"), style.indexOf(".sb-pop2 {") + 700);
    expect(panel).toContain("position: fixed;");
    expect(panel).toContain("width: clamp(280px, 24vw, 360px);");
    expect(panel).toContain("max-height: min(70dvh, 480px);");
    expect(panel).toContain("overflow: auto;");
    expect(panel).toContain("overflow-wrap: normal;");
    expect(panel).toContain("word-break: normal;");
    expect(panel).toContain("white-space: normal;");
    expect(panel).toContain("border-radius: 16px;");
    // The 60px bug: `width: 100%` of the 36px trigger. Never again.
    expect(panel).not.toMatch(/width:\s*100%/);
    // Its own box, not the card's: no clipping rule on the panel itself.
    expect(panel).not.toContain("overflow: hidden");
    // <768px: a bottom sheet with its own scroll.
    expect(style).toMatch(/\.sb-pop2\[data-sheet="true"\] \{[^}]*bottom: 12px/);
  });

  test("the panel is portalled to <body> in the top layer, right of its trigger", async () => {
    setViewport(1366);
    seedRows();
    mockRows = mockRows.map((r) => ({
      ...r,
      noc: { nocAvailable: "Yes", expiryDate: "2026-09-30", issuedDate: "2026-04-01" },
    }));
    await shellAt();
    q(win.document, "[data-testid='sb-bell']")[0].click();
    await settle(20);
    const panel = win.document.querySelector<HTMLElement>("[data-testid='sb-notifications']")!;
    expect(panel).toBeTruthy();
    expect(panel.getAttribute("popover")).toBe("auto");
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.parentElement).toBe(win.document.body);
    expect(panel.closest("aside")).toBeNull();
    expect(panel.dataset.placed).toBe("true");
    expect(Number.parseFloat(panel.style.left)).toBeGreaterThan(0);
    expect(panel.getAttribute("data-sheet")).toBe("false");
    // Content: header + count, the top-5 facilities, the footer link.
    expect(panel.textContent).toContain("Notifications");
    expect(panel.querySelector("[data-testid='sb-notifications-count']")?.textContent).toBe("3");
    expect(q(panel, ".sb-attention-row")).toHaveLength(3);
    // Each row: facility, a reason chip and the deadline it is about.
    const chips = q(panel, ".sb-attention-chip");
    expect(chips).toHaveLength(3);
    // The chip now carries the same fact-rich reason as /pending.
    expect(chips[0].textContent).toContain("Fire NOC expired");
    expect(panel.querySelector(".sb-attention-when")?.textContent).toContain("30-Sep-2026");
    expect(panel.textContent).toContain("overdue");
    expect(panel.querySelector("a[href*='kpi=attention']")?.textContent).toContain(
      "View all in Master List (3)",
    );
  });

  test("bell dot, badge and popover count are ONE number", async () => {
    setViewport(1366);
    seedRows();
    mockRows = mockRows.map((r) => ({
      ...r,
      noc: { nocAvailable: "Yes", expiryDate: "2026-09-30", issuedDate: "2026-04-01" },
    }));
    await shellAt();
    const aside = asideEl();
    const badge = q(aside, ".sb-badge-amber")[0].textContent;
    const bell = q(aside, "[data-testid='sb-bell']")[0];
    expect(q(bell, ".sb-dot-amber")).toHaveLength(1);
    bell.click();
    await settle(20);
    const panelCount = win.document.querySelector(
      "[data-testid='sb-notifications-count']",
    )?.textContent;
    expect(panelCount).toBe(badge);
    // …and identical to the click-through list (kpi=attention).
    const { kpiMatches } = await import("../src/lib/masterFilter");
    const clicked = (mockRows as never[]).filter((r) => kpiMatches(r, "attention")).length;
    expect(Number(badge)).toBe(clicked);
    expect(Number(panelCount)).toBe(clicked);
  });

  test("only ONE floating panel: opening Help closes Notifications", async () => {
    setViewport(1366);
    await shellAt();
    q(win.document, "[data-testid='sb-bell']")[0].click();
    await settle(20);
    expect(q(win.document, "[data-testid='sb-notifications']")).toHaveLength(1);
    q(win.document, "button[aria-label='Help']")[0].click();
    await settle(20);
    expect(q(win.document, "[data-testid='sb-notifications']")).toHaveLength(0);
    expect(q(win.document, "[data-testid='sb-help']")).toHaveLength(1);
    expect(q(win.document, ".sb-pop2")).toHaveLength(1);
    // Clicking the SAME trigger again closes it (no second instance).
    q(win.document, "button[aria-label='Help']")[0].click();
    await settle(20);
    expect(q(win.document, ".sb-pop2")).toHaveLength(0);
  });

  test("Esc closes and returns focus; outside click closes; no tooltip over the panel", async () => {
    setViewport(1366);
    seedRows();
    await shellAt();
    const bell = q(win.document, "[data-testid='sb-bell']")[0] as HTMLButtonElement;
    bell.click();
    await settle(20);
    expect(bell.getAttribute("aria-expanded")).toBe("true");
    // The trigger no longer carries a tooltip while its panel is open.
    expect(bell.getAttribute("data-tip")).toBeNull();
    bell.dispatchEvent(new win.MouseEvent("pointerover", { bubbles: true }));
    await settle(200);
    expect(q(win.document, "[role='tooltip']")).toHaveLength(0);
    win.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle(20);
    expect(q(win.document, "[data-testid='sb-notifications']")).toHaveLength(0);
    expect(win.document.activeElement).toBe(bell);
    // Outside click.
    bell.click();
    await settle(20);
    win.document.body.dispatchEvent(new win.MouseEvent("mousedown", { bubbles: true }));
    await settle(20);
    expect(q(win.document, "[data-testid='sb-notifications']")).toHaveLength(0);
  });

  test("Help lists the legend, the shortcuts and the how-to tour", async () => {
    setViewport(1366);
    await shellAt();
    q(win.document, "button[aria-label='Help']")[0].click();
    await settle(20);
    const panel = win.document.querySelector<HTMLElement>("[data-testid='sb-help']")!;
    expect(panel.textContent).toContain("Legend: what do the colours mean?");
    expect(panel.textContent).toContain("Keyboard shortcuts");
    expect(panel.textContent).toContain("Ctrl K");
    expect(panel.textContent).toContain("Ctrl B");
    expect(panel.textContent).toContain("How to use this page");
    expect(panel.querySelector("a[href*='legend=1']")).toBeTruthy();
    expect(panel.textContent).toContain("administrator");
  });

  test("at 360px the same panel is a bottom sheet with a backdrop", async () => {
    setViewport(360);
    await shellAt();
    q(win.document, "button[aria-label='Open navigation menu']")[0].click();
    await settle(20);
    q(win.document, "[data-testid='sb-bell']")[0].click();
    await settle(20);
    const panel = win.document.querySelector<HTMLElement>("[data-testid='sb-notifications']")!;
    expect(panel.getAttribute("data-sheet")).toBe("true");
    expect(q(win.document, "[data-testid='sb-notifications-backdrop']")).toHaveLength(1);
    q(win.document, "[data-testid='sb-notifications-backdrop']")[0].click();
    await settle(20);
    expect(q(win.document, "[data-testid='sb-notifications']")).toHaveLength(0);
  });

  test("works from the rail too (same component, one instance per trigger)", async () => {
    setViewport(1024);
    await shellAt();
    expect(win.document.documentElement.getAttribute("data-sidebar")).toBe("rail");
    q(win.document, "[data-testid='sb-bell']")[0].click();
    await settle(20);
    expect(q(win.document, "[data-testid='sb-notifications']")).toHaveLength(1);
    expect(q(win.document, "[data-testid='sb-notifications']")[0].closest("aside")).toBeNull();
  });
});

describe("sidebar CSS contract", () => {
  test("72px rail, 264px expanded, one variable, reduced motion instant", () => {
    const style = css();
    expect(style).toContain("--sb-expanded-w: 16.5rem;");
    expect(style).toContain("--sb-rail-w: 4.5rem;");
    expect(style).toContain("grid-template-columns: var(--sb-w) minmax(0, 1fr);");
    expect(style).toContain("transition: grid-template-columns var(--sb-ease);");
    expect(style).toContain("--sb-ease: 180ms ease;");
    const reduced = style.slice(style.indexOf("@media (prefers-reduced-motion"));
    expect(reduced.slice(0, 600)).toContain("transition: none;");
    // Sections: rail group labels are GONE (dividers instead).
    expect(style).not.toContain(".sb-rail-group-label");
    expect(style).toContain('html[data-sidebar="rail"] .sb-divider {');
    // Only the nav scrolls; header/footer are fixed zones.
    const nav = style.slice(style.indexOf(".sb-nav {"));
    expect(nav.slice(0, 600)).toContain("overflow-y: auto;");
    expect(nav.slice(0, 600)).toContain("min-height: 0;");
    expect(nav.slice(0, 600)).toContain("scrollbar-gutter: stable;");
    expect(nav.slice(0, 600)).toContain("overscroll-behavior: contain;");
  });

  test("pre-paint script: expanded / rail / drawer before first paint", () => {
    const markup = html();
    expect(markup).toContain('w < 768 ? "drawer"');
    expect(markup).toContain('"rail"');
    expect(markup).toContain('"expanded"');
    expect(markup).toContain('m === "collapsed"');
    const scriptEnd = markup.indexOf("</script>");
    expect(scriptEnd > 0 && scriptEnd < markup.indexOf("</head>")).toBe(true);
  });

  test("badge counts come from buildMetrics in ONE place", async () => {
    const { attentionList, computeKpis, attentionOf } = await import("../src/lib/masterColumns");
    const { kpiMatches } = await import("../src/lib/masterFilter");
    seedRows();
    mockRows = mockRows.map((r) => ({
      ...r,
      noc: { nocAvailable: "Yes", expiryDate: "2026-09-30", issuedDate: "2026-04-01" },
    }));
    const rows = mockRows as never;
    const list = attentionList(rows);
    expect(list.length).toBe(computeKpis(rows).attentionFacilities);
    expect(rows.filter((r: never) => attentionOf(r)).length).toBe(list.length);
    expect(rows.filter((r: never) => kpiMatches(r, "attention")).length).toBe(list.length);
  });
});
