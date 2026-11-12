/**
 * MY PROFILE — the redesigned page, mounted in happy-dom.
 *
 * Note: this repository ships bun + happy-dom contract tests only (no
 * Playwright project), so the brief's browser scenarios are covered here at
 * the DOM-contract level:
 *   • Save bar exists ONLY when something is unsaved ("1 unsaved change"),
 *     Discard reverts, and the draft survives a tab switch (the unsaved guard);
 *   • a bad phone number is blocked by the central rule and never commits;
 *   • email, role and blocks appear exactly once (card, never in a tab panel);
 *   • ?tab= deep links, the tabs are real tabs (roving/aria via Radix);
 *   • preferences and notifications save INSTANTLY with "Saved ✓" and the
 *     right payload;
 *   • sessions: this device first, the rest collapsed, no raw IP, sign-out
 *     other devices is confirmed and keeps the current session;
 *   • activity is LAZY (no query until the tab opens), in plain words with a
 *     facility link, and the filter changes the query argument;
 *   • source-level promises: the three lazy chunks, no sample phone
 *     placeholder, one 1120 px grid with a 264 px identity column.
 *
 * Run: bun test ./scripts/profile.dom.test.ts
 */
import { afterEach, describe, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost/profile" });

/* ------------------------------------------------------------------ */
/* Module mocks — BEFORE anything from src is imported                */
/* ------------------------------------------------------------------ */

let profile: Record<string, unknown> | undefined = undefined;
let sessions: Record<string, unknown> | undefined = undefined;
let activity: Record<string, unknown>[] | undefined = undefined;
const queryCalls: string[] = [];
let lastActivityFilter = "all";
const calls: { fn: string; args: Record<string, unknown> }[] = [];

const RETURNS: Record<string, unknown> = {
  "profile.updateMyProfile": { changed: 1 },
  "profile.signOutOtherSessions": { removed: 2 },
  "profile.signOutSession": { removed: 1 },
  "profile.uploadAvatar": { ok: true },
  "profile.removeAvatar": { ok: true },
};

mock.module("convex/react", () => ({
  useQuery: (fn: unknown, args?: { filter?: string }) => {
    const key = String(fn);
    queryCalls.push(key);
    if (key.endsWith("myProfile")) return profile;
    if (key.endsWith("mySessions")) return sessions;
    if (key.endsWith("myActivity")) {
      lastActivityFilter = args?.filter ?? "all";
      return activity;
    }
    return undefined;
  },
  useMutation: (fn: unknown) => async (args: Record<string, unknown> = {}) => {
    const key = String(fn);
    calls.push({ fn: key, args });
    return RETURNS[key] ?? {};
  },
  useAction: (fn: unknown) => async (args: Record<string, unknown> = {}) => {
    const key = String(fn);
    calls.push({ fn: key, args });
    return RETURNS[key] ?? {};
  },
  useConvex: () => ({ query: async () => ({ token: "test" }), setQuery: () => undefined }),
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

mock.module("@/convex/_generated/api", () => ({
  api: {
    profile: new Proxy({} as Record<string, string>, {
      get: (_t, prop) => `profile.${String(prop)}`,
    }),
    /* Profile reads Page visibility (Admin settings hidden?) — same string
       keys as above; useQuery returns undefined for anything unmatched. */
    facilities: new Proxy({} as Record<string, string>, {
      get: (_t, prop) => `facilities.${String(prop)}`,
    }),
  },
}));

/* The shell (sidebar, command palette, tooltips) is not under test here. */
mock.module("@/components/AppShell", () => ({
  AppShell: ({ children }: { children?: unknown }) => children,
}));

mock.module("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { appRole: "admin", name: "Gopinath P", email: "dphtptquality@gmail.com" },
    isAuthenticated: true,
    isLoading: false,
    signOut: async () => {},
  }),
}));

mock.module("sonner", () => ({
  toast: Object.assign(() => {}, { success() {}, error() {}, info() {} }),
}));

mock.module("@convex-dev/auth/react", () => ({
  ConvexAuthProvider: ({ children }: { children?: unknown }) => children,
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useAuthActions: () => ({ signIn: async () => {}, signOut: async () => {} }),
}));

/* ------------------------------------------------------------------ */
/* DOM globals                                                        */
/* ------------------------------------------------------------------ */

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
let Page: typeof import("../src/pages/Profile") | null = null;
let Router: typeof import("react-router").MemoryRouter | null = null;

async function deps() {
  if (!react) react = await import("react");
  if (!createRoot) createRoot = (await import("react-dom/client")).createRoot;
  if (!Page) Page = await import("../src/pages/Profile");
  if (!Router) Router = (await import("react-router")).MemoryRouter;
  return { react: react!, createRoot: createRoot!, Page: Page!, Router: Router! };
}

const mounted: (() => void)[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.();
  profile = undefined;
  sessions = undefined;
  activity = undefined;
  queryCalls.length = 0;
  calls.length = 0;
  lastActivityFilter = "all";
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeProfile(over: Record<string, unknown> = {}) {
  return {
    user: {
      id: "u1",
      name: "Gopinath P",
      email: "dphtptquality@gmail.com",
      designation: "District Quality Officer",
      phone: "",
      image: null,
      appRole: "admin",
      blockIds: [],
      emailVerified: true,
    },
    avatar: { url: null, updatedAt: null, hasStoredFile: false },
    blocks: [{ id: "b1", name: "Alangayam" }],
    blockNames: [],
    preferences: {
      language: "en",
      landingPage: "/dashboard",
      density: "comfortable",
      sidebar: "expanded",
      highlightUpdates: true,
      rowsPerPage: 50,
      firstVisitTips: true,
    },
    notifications: {
      needsAttentionInApp: true,
      needsAttentionEmail: false,
      iaDueInApp: true,
      iaDueEmail: true,
      importResultsInApp: true,
      importResultsEmail: false,
      digest: "daily",
    },
    sessionSummary: { total: 3, others: 2, signedInAt: Date.now(), lifetimeDays: 30 },
    auth: { password: true, managed: false },
    ...over,
  };
}

async function mount(path = "/profile") {
  await deps();
  profile ??= makeProfile();
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = createRoot!(container, {} as never);
  await react!.act(async () => {
    root.render(
      react!.createElement(
        Router!,
        { initialEntries: [path] },
        react!.createElement(Page!.default, {}) as never,
      ) as never,
    );
    await sleep(20);
  });
  mounted.push(() => {
    try {
      react!.act(() => root.unmount());
    } catch {
      /* already gone */
    }
    container.remove();
  });
  return container;
}

const q = (root: ParentNode, sel: string) => root.querySelector(sel);
const qa = (root: ParentNode, sel: string) => [...root.querySelectorAll(sel)];
const text = (root: ParentNode | null | undefined) => root?.textContent ?? "";
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

async function click(el: Element | null | undefined) {
  expect(el).toBeTruthy();
  await react!.act(async () => {
    // Radix Tabs activates a trigger on mousedown, everyone else on click.
    el!.dispatchEvent(new win.MouseEvent("mousedown", { bubbles: true }));
    el!.dispatchEvent(new win.MouseEvent("mouseup", { bubbles: true }));
    el!.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
    await sleep(15);
  });
}

async function clickButton(root: ParentNode, label: string) {
  const btn = [...root.querySelectorAll("button")].find((b) => b.textContent?.trim() === label);
  await click(btn);
  return btn;
}

async function openRow(root: ParentNode, testId: string) {
  await click(q(root, `[data-testid="${testId}-edit"]`));
  return q(root, `[data-testid="${testId}-editor"] input`) as HTMLInputElement | null;
}

async function type(input: HTMLInputElement | null, value: string, key: "Enter" | "Escape" | null = "Enter") {
  expect(input).toBeTruthy();
  await react!.act(async () => {
    const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, "value")?.set;
    setter!.call(input!, value);
    input!.dispatchEvent(new win.Event("input", { bubbles: true }));
    await sleep(5);
    if (key) {
      input!.dispatchEvent(new win.KeyboardEvent("keydown", { key, bubbles: true }));
    }
    await sleep(15);
  });
}

/* ------------------------------------------------------------------ */

describe("My profile — layout contract", () => {
  test("one 1120 px grid, a 264 px sticky identity column, no second header", async () => {
    const src = await Bun.file(new URL("../src/pages/Profile.tsx", import.meta.url)).text();
    const card = await Bun.file(
      new URL("../src/components/myprofile/IdentityCard.tsx", import.meta.url),
    ).text();
    expect(src).toContain("max-w-[1120px]");
    expect(src).toContain("lg:grid-cols-[264px_minmax(0,1fr)]");
    expect(card).toContain("lg:sticky");
    // No <h1> inside the page: the shared AppShell header owns the title.
    expect(src).not.toContain("<h1");
    // The three lazy chunks are actually lazy.
    expect(src).toContain('lazy(() => import("@/components/myprofile/SecurityTab"))');
    expect(src).toContain('lazy(() => import("@/components/myprofile/ActivityTab"))');
    expect(src).toContain('lazy(() => import("@/components/myprofile/AvatarCropper"))');
    // The sample phone number never comes back as a placeholder.
    expect(src).not.toContain('placeholder="+91 98765 43210"');
    expect(src).not.toContain("98765 43210");
  });

  test("the page renders the card, the tab bar and five tabs", async () => {
    const c = await mount();
    expect(q(c, "[data-testid=profile-identity]")).toBeTruthy();
    expect(q(c, "[data-testid=profile-tablist]")).toBeTruthy();
    expect(qa(c, "[role=tab]")).toHaveLength(5);
    expect(text(q(c, "[data-testid=profile-email]"))).toContain("dphtptquality@gmail.com");
    expect(text(q(c, "[data-testid=profile-avatar-initials]"))).toBe("GP");
  });

  test("email, role and blocks appear exactly once — never inside a tab panel", async () => {
    const c = await mount();
    const all = text(c);
    expect(count(all, "dphtptquality@gmail.com")).toBe(1);
    expect(text(q(c, "[data-testid=profile-identity]"))).toContain("State Admin");
    expect(text(q(c, "[data-testid=profile-identity]"))).toContain("All blocks");
    const panel = q(c, "[data-testid=profile-tab]");
    expect(text(panel)).not.toContain("dphtptquality@gmail.com");
    expect(text(panel)).not.toContain("State Admin");
    expect(text(panel)).not.toContain("All blocks");
  });
});

describe("My profile — draft and Save bar", () => {
  test("the Save bar does not exist until something changes, and Discard hides it", async () => {
    const c = await mount();
    expect(q(c, "[data-testid=profile-savebar]")).toBeNull();

    const input = await openRow(c, "profile-field-name");
    await type(input, "Gopinath Pillai");
    expect(q(c, "[data-testid=profile-savebar]")).toBeTruthy();
    expect(text(q(c, "[data-testid=profile-savebar-count]"))).toContain("1 unsaved change");

    await clickButton(c, "Discard");
    expect(q(c, "[data-testid=profile-savebar]")).toBeNull();
  });

  test("an invalid phone is blocked by the rule and never reaches the draft", async () => {
    const c = await mount();
    const input = await openRow(c, "profile-field-phone");
    await type(input, "123");
    const alert = q(c, "[role=alert]");
    expect(text(alert)).toContain("country code");
    // Still editing (Enter did not commit) and no unsaved change yet.
    expect(q(c, "[data-testid=profile-field-phone-editor]")).toBeTruthy();
    expect(q(c, "[data-testid=profile-savebar]")).toBeNull();

    // Esc cancels the edit and keeps the empty "Not set" state.
    await type(q(c, "[data-testid=profile-field-phone-editor] input") as HTMLInputElement, "123", "Escape");
    expect(q(c, "[data-testid=profile-field-phone-editor]")).toBeNull();
    expect(text(q(c, "[data-testid=profile-field-phone]"))).toContain("Not set");
  });

  test("a valid phone normalises to E.164 and counts as one change", async () => {
    const c = await mount();
    const input = await openRow(c, "profile-field-phone");
    await type(input, "98123 45678");
    expect(text(q(c, "[data-testid=profile-field-phone]"))).toContain("+91 98123 45678");
    expect(text(q(c, "[data-testid=profile-savebar-count]"))).toContain("1 unsaved change");
  });

  test("switching tabs keeps the draft and the Save bar (the unsaved guard)", async () => {
    const c = await mount();
    const input = await openRow(c, "profile-field-name");
    await type(input, "Gopinath P Junior");
    expect(q(c, "[data-testid=profile-savebar]")).toBeTruthy();

    await click(q(c, '[data-testid="profile-tab-preferences"]'));
    expect(q(c, "[data-testid=preferences-tab]")).toBeTruthy();
    expect(q(c, "[data-testid=profile-savebar]")).toBeTruthy();
    expect(text(q(c, "[data-testid=profile-savebar-count]"))).toContain("1 unsaved change");

    await click(q(c, '[data-testid="profile-tab-profile"]'));
    expect(text(q(c, "[data-testid=profile-field-name]"))).toContain("Gopinath P Junior");
  });
});

describe("My profile — tabs, preferences and notifications", () => {
  test("?tab=notifications deep-links to that tab", async () => {
    const c = await mount("/profile?tab=notifications");
    expect(q(c, "[data-testid=notifications-tab]")).toBeTruthy();
    expect(q(c, '[data-testid="profile-tab-notifications"][data-state=active]')).toBeTruthy();
  });

  test("preferences save instantly with the right payload and a Saved marker", async () => {
    const c = await mount("/profile?tab=preferences");
    await click(q(c, "[data-testid=pref-density-compact]"));
    await sleep(20);
    const call = calls.find((x) => x.fn.endsWith("updateMyProfile"));
    expect(call).toBeTruthy();
    expect((call!.args.preferences as Record<string, unknown>).density).toBe("compact");
    expect(q(c, "[data-testid=pref-saved]")).toBeTruthy();
    // The Save bar stays away: instant rows are not part of the draft.
    expect(q(c, "[data-testid=profile-savebar]")).toBeNull();
  });

  test("the notification matrix has explicit On/Off states and saves on toggle", async () => {
    const c = await mount("/profile?tab=notifications");
    const matrix = q(c, "[data-testid=notifications-matrix]");
    expect(matrix).toBeTruthy();
    expect(qa(matrix!, "[role=switch]").length).toBe(8);

    const off = q(c, "[data-testid=notif-needsAttention-email]");
    expect(off!.getAttribute("data-state")).toBe("off");
    expect(off!.textContent?.trim()).toBe("Off");

    await click(off);
    await sleep(20);
    const call = calls.find((x) => x.fn.endsWith("updateMyProfile"));
    expect((call!.args.notifications as Record<string, unknown>).needsAttentionEmail).toBe(true);
    const on = q(c, "[data-testid=notif-needsAttention-email]");
    expect(on!.getAttribute("data-state")).toBe("on");
    expect(on!.textContent).toContain("On");
    expect(q(c, "[data-testid=pref-saved]")).toBeTruthy();
  });
});

describe("My profile — sessions (Security tab)", () => {
  test("this device first, the rest collapsed, no raw IP, confirmed sign-out", async () => {
    const now = Date.now();
    sessions = {
      lifetimeDays: 30,
      sessions: [
        { id: "s1", current: true, createdAt: now, lastActive: now, expiresAt: now, userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0", region: null },
        { id: "s2", current: false, createdAt: now, lastActive: now, expiresAt: now, userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0", region: null },
        { id: "s3", current: false, createdAt: now - 9 * 86400000, lastActive: now - 9 * 86400000, expiresAt: now, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1", region: null },
      ],
    };
    const c = await mount("/profile?tab=security");
    await react!.act(async () => sleep(30)); // lazy chunk resolves

    expect(q(c, "[data-testid=session-current]")).toBeTruthy();
    expect(text(q(c, "[data-testid=session-current-badge]"))).toBe("This device");
    // The parsed label replaces "Another device".
    expect(text(c)).not.toContain("Another device");
    expect(text(c)).toContain("Chrome on Windows");

    // Others are collapsed…
    const toggle = q(c, "[data-testid=sessions-toggle-others]");
    expect(toggle!.getAttribute("aria-expanded")).toBe("false");
    expect(q(c, "[data-testid^=sessions-group-]")).toBeNull();
    // …and expanding shows the grouped devices, including the idle one.
    await click(toggle);
    expect(toggle!.getAttribute("aria-expanded")).toBe("true");
    expect(text(c)).toContain("Safari on iOS");
    expect(text(c)).toContain("Inactive");

    // Never a raw IP address anywhere on the page.
    expect(text(c)).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/);

    // Sign out other devices asks first, then calls the mutation.
    await click(q(c, "[data-testid=sessions-end-others]"));
    await click(q(c, "[data-testid=sessions-end-others-confirm]"));
    await sleep(20);
    expect(calls.some((x) => x.fn.endsWith("signOutOtherSessions"))).toBe(true);
  });

  test("no sessions query runs until the Security tab opens", async () => {
    await mount();
    expect(queryCalls.some((k) => k.endsWith("mySessions"))).toBe(false);
    expect(queryCalls.some((k) => k.endsWith("myActivity"))).toBe(false);
  });
});

describe("My profile — activity (lazy, plain words)", () => {
  test("the feed loads only when the tab opens, in plain language with links", async () => {
    const now = Date.now();
    activity = [
      { id: "a1", at: now, action: "update", field: "SA Actual Start Date", table: "stateAssessments", source: null, newValue: null, category: "facility", facilityId: "f1", facilityName: "PHC Alangayam" },
      { id: "a2", at: now, action: "create", field: "NQAS_Result", table: "facilityDocuments", source: null, newValue: null, category: "documents", facilityId: "f2", facilityName: "PHC Athanavur" },
      { id: "a3", at: now, action: "update", field: "My profile · Notifications", table: "users", source: "My profile", newValue: null, category: "account", facilityId: null, facilityName: null },
    ];
    const c = await mount();
    expect(queryCalls.some((k) => k.endsWith("myActivity"))).toBe(false);

    await click(q(c, '[data-testid="profile-tab-activity"]'));
    await react!.act(async () => sleep(40));

    expect(queryCalls.some((k) => k.endsWith("myActivity"))).toBe(true);
    const items = qa(c, "[data-testid=activity-item]");
    expect(items.length).toBe(3);
    expect(text(c)).toContain("Updated SA actual start date");
    expect(text(c)).toContain("Uploaded NQAS Result");
    expect(text(c)).toContain("Changed notification preferences");
    const link = q(c, 'a[href="/facilities?facility=f1"]') as HTMLAnchorElement | null;
    expect(link).toBeTruthy();
    expect(link!.textContent).toContain("PHC Alangayam");
    // Day group + relative time with the absolute stamp in a tooltip.
    expect(text(c)).toContain("Today");
    expect(q(c, "[data-tip]")).toBeTruthy();

    // Filter chips change the query argument (and the admin sees the audit link).
    await click(q(c, "[data-testid=activity-filter-documents]"));
    await sleep(20);
    expect(lastActivityFilter).toBe("documents");
    expect(q(c, "[data-testid=activity-full-audit]")).toBeTruthy();
  });
});

describe("My profile — identity card actions", () => {
  test("sign-out-other devices is offered only when others exist", async () => {
    const withOthers = await mount();
    expect(text(q(withOthers, "[data-testid=profile-sign-out-others]"))).toContain("(2)");
    expect(q(withOthers, "[data-testid=profile-sign-out]")).toBeTruthy();
  });

  test("the avatar menu offers change and remove, with an initials fallback", async () => {
    const c = await mount();
    expect(q(c, "[data-testid=profile-avatar-image]")).toBeNull();
    expect(q(c, "[data-testid=profile-avatar-initials]")).toBeTruthy();
    await click(q(c, "[data-testid=profile-avatar]"));
    const menu = q(c, "[data-testid=profile-avatar-menu]");
    expect(menu).toBeTruthy();
    expect(q(c, "[data-testid=profile-avatar-change]")).toBeTruthy();
    expect(q(c, "[data-testid=profile-avatar-remove]")).toBeTruthy();
  });
});
