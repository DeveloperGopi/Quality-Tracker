/**
 * FACILITY MASTER LIST — LEAVING AND COMING BACK (DOM integration).
 *
 * The requested behaviour: filter the list (Block = Alangayam), open a
 * facility, come back — browser Back, the in-app "Back to list", or reopening
 * the list — and see the SAME view, with no loading flash.
 *
 * This renders the REAL pieces the feature is made of — the hooks
 * (useListUrlState / useScrollRestore), the REAL
 * FilterDropdown and FilterChips, real <Link> navigation through a router —
 * inside a miniature of the page whose row-preference rule is the page's own
 * (live rows win, the session snapshot paints first). No Convex here: the
 * "server" is a fake query that answers a moment late, which is exactly the
 * situation a return to the list creates, and all it needs to prove is that
 * the list does not depend on it to show the right rows.
 *
 * Covered (the brief's test list):
 *   1. filter → open a facility → browser Back → same filter/page/scroll,
 *      no skeleton flash,
 *   2. the same with the in-app "Back to list" link,
 *   3. editing a facility and returning shows the updated row, same filters,
 *   4. a filtered URL in a fresh tab keeps the filter (and says so),
 *   5. reopening the bare list restores the last view (and says so),
 *   6. the facility name is a real <a href="/facilities/:id"> (Ctrl/Cmd+click,
 *      middle-click, open in a new tab),
 *   7. unknown/invalid query params never crash the page,
 *   8. "Clear" removes one filter, "Clear all filters" removes them all, and a
 *      list with nothing selected shows every facility,
 *   9. dropdown counts move when another filter moves,
 *  10. mobile 360px renders the panel as a bottom sheet and still persists.
 *
 * Run: bun test ./scripts
 */

import { describe, expect, test, beforeEach } from "bun:test";
import { Window } from "happy-dom";

/* --------------------------------------------------------------------------- */
/* 1 — DOM globals (same setup as scripts/masterGrid.dom.test.ts)               */
/* --------------------------------------------------------------------------- */

const win = new Window({ url: "http://localhost/" });

type MediaQueryListLike = {
  matches: boolean;
  media: string;
  addEventListener?: (type: string, cb: () => void) => void;
  removeEventListener?: (type: string, cb: () => void) => void;
  addListener?: (cb: () => void) => void;
  removeListener?: (cb: () => void) => void;
};
type WinExtras = {
  CustomEvent: typeof CustomEvent;
  MouseEvent: typeof MouseEvent;
  KeyboardEvent: typeof KeyboardEvent;
  Event: typeof Event;
  requestAnimationFrame?: (cb: FrameRequestCallback) => number;
  cancelAnimationFrame?: (id: number) => void;
  matchMedia?: (query: string) => MediaQueryListLike;
};
const extras = win as unknown as WinExtras;

function defineGlobal(key: string, value: unknown) {
  try {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  } catch {
    /* Bun's read-only globals stay as they are */
  }
}

defineGlobal("window", win);
defineGlobal("document", win.document);
defineGlobal("HTMLElement", win.HTMLElement);
defineGlobal("Element", win.Element);
defineGlobal("Node", win.Node);
defineGlobal("Event", win.Event);
defineGlobal("CustomEvent", extras.CustomEvent);
defineGlobal("MouseEvent", extras.MouseEvent);
defineGlobal("KeyboardEvent", extras.KeyboardEvent);
const raf = extras.requestAnimationFrame?.bind(win);
const caf = extras.cancelAnimationFrame?.bind(win);
defineGlobal(
  "requestAnimationFrame",
  raf ?? ((cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number),
);
defineGlobal("cancelAnimationFrame", caf ?? ((id: number) => clearTimeout(id)));
/** React's act() needs to know it is running in a test environment. */
(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

/** Viewport stub + a scrollTo that records where it was asked to go (happy-dom
 *  has no layout, and the scroll-restore hook legitimately calls both). */
const VIEWPORT = { width: 1200, height: 640 };
for (const prop of ["offsetWidth", "offsetHeight"] as const) {
  Object.defineProperty(win.HTMLElement.prototype, prop, {
    configurable: true,
    get() {
      return prop === "offsetWidth" ? VIEWPORT.width : VIEWPORT.height;
    },
  });
}
(win.Element.prototype as unknown as Record<string, unknown>).getBoundingClientRect = function () {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: VIEWPORT.width,
    bottom: VIEWPORT.height,
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    toJSON: () => ({}),
  };
};
const scrollCalls: number[] = [];
(win as unknown as { scrollTo: (opts: { top?: number }) => void }).scrollTo = (opts) => {
  scrollCalls.push(opts?.top ?? 0);
};

/** matchMedia: desktop by default; the mobile test flips it on. */
let MOBILE = false;
extras.matchMedia = (media: string): MediaQueryListLike => ({
  media,
  get matches() {
    return MOBILE && media.includes("max-width: 640px");
  },
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});

/* --------------------------------------------------------------------------- */
/* 2 — Fixtures                                                                 */
/* --------------------------------------------------------------------------- */

import type { MasterRow } from "../src/lib/masterColumns";

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

function makeRow(
  id: string,
  name: string,
  block: string,
  status: string,
  type = "PHC",
  cycle: number | null = 2,
): MasterRow {
  return {
    facility: {
      _id: id,
      name,
      block,
      phc: `${block} PHC`,
      facilityType: type,
      ninNumber: `12010044${id}`,
      eligibility: "Eligible",
      currentStatus: status,
      statusOverride: null,
      remarks: "",
      updatedAt: null,
      nqasIaQ1: null,
      nqasIaQ2: null,
      kayakalpIaQ1: null,
      kayakalpIaQ2: null,
    },
    cycleNumber: cycle,
    cycleType: null,
    sa: null,
    nqas: null,
    fund: null,
    noc: null,
    building: null,
    ia: null,
    resultDocumentId: null,
    resultDocumentName: null,
  } as unknown as MasterRow;
}

/** The "database": scenario 3 mutates it to simulate saving an edit. */
let server: MasterRow[] = [];
function resetServer() {
  server = [
    makeRow("f1", "Ariyur PHC", "Alangayam", "Certified"),
    makeRow("f2", "Ariyur HSC", "Alangayam", "SA Completed", "HSC", 1),
    makeRow("f3", "Vellore PHC", "Alangayam", "SA In Progress"),
    makeRow("f4", "Mittur PHC", "Mittur", "Certified"),
    makeRow("f5", "Mittur HSC", "Mittur", "Eligible", "HSC"),
    makeRow("f6", "DMS Kaniyambadi", "DMS", "Certified", "DMS", 3),
  ];
}

/* --------------------------------------------------------------------------- */
/* 3 — Modules (loaded after the DOM globals exist)                             */
/* --------------------------------------------------------------------------- */

type Modules = {
  react: typeof import("react");
  h: typeof import("react").createElement;
  createRoot: typeof import("react-dom/client").createRoot;
  router: typeof import("react-router");
  hooks: {
    useListUrlState: typeof import("../src/hooks/use-list-url-state").useListUrlState;
    useScrollRestore: typeof import("../src/hooks/use-scroll-restore").useScrollRestore;
  };
  session: typeof import("../src/lib/listSessionState");
  dropdown: typeof import("../src/components/FilterDropdown");
  chips: typeof import("../src/components/FilterChips");
  filterLib: typeof import("../src/lib/masterFilter");
  counts: typeof import("../src/lib/listOptionCounts");
  listUrlState: typeof import("../src/lib/listUrlState");
};

let M: Modules | null = null;

async function deps(): Promise<Modules> {
  if (M) return M;
  const react = await import("react");
  M = {
    react,
    h: react.createElement,
    createRoot: (await import("react-dom/client")).createRoot,
    router: await import("react-router"),
    hooks: {
      useListUrlState: (await import("../src/hooks/use-list-url-state")).useListUrlState,
      useScrollRestore: (await import("../src/hooks/use-scroll-restore")).useScrollRestore,
    },
    session: await import("../src/lib/listSessionState"),
    dropdown: await import("../src/components/FilterDropdown"),
    chips: await import("../src/components/FilterChips"),
    filterLib: await import("../src/lib/masterFilter"),
    counts: await import("../src/lib/listOptionCounts"),
    listUrlState: await import("../src/lib/listUrlState"),
  };
  return M;
}

/** Blow the module registry away between tests: the session state under test
 *  (last list URL, scroll, the rows snapshot) is module/ browser state. */
function clearAppState() {
  M?.session.clearRowsSnapshot();
}

/** How long the fake query takes to answer — long enough that the first render
 *  after a navigation is visibly served from the snapshot. */
const QUERY_DELAY_MS = 30;

/* --------------------------------------------------------------------------- */
/* 4 — The page in miniature, built from the REAL pieces                        */
/* --------------------------------------------------------------------------- */

const BLOCK_OPTIONS = [
  { value: "Alangayam", label: "Alangayam" },
  { value: "Mittur", label: "Mittur" },
  { value: "DMS", label: "DMS" },
];
const STATUS_OPTIONS = [
  { value: "Certified", label: "Certified" },
  { value: "SA Completed", label: "SA Completed" },
  { value: "SA In Progress", label: "SA In Progress" },
  { value: "Eligible", label: "Eligible" },
];

/**
 * A cold Convex client: `undefined` until the subscription answers. Because it
 * lives INSIDE the list component, every mount of the list starts cold — which
 * is exactly the state after coming back from a profile.
 */
function useFakeQuery(): MasterRow[] | undefined {
  const { react } = M!;
  const [value, setValue] = react.useState<MasterRow[] | undefined>(undefined);
  react.useEffect(() => {
    const t = setTimeout(() => setValue(server), QUERY_DELAY_MS);
    return () => clearTimeout(t);
  }, []);
  return value;
}

function ListView() {
  const { react, hooks, session, dropdown, chips, filterLib, router } = M!;
  const { filters, patch, setAll, restoredFrom, dismissRestored, urlKey } =
    hooks.useListUrlState();
  const [snapshotRows] = react.useState<MasterRow[] | null>(() =>
    session.loadRowsSnapshot(),
  );
  const scrollRef = react.useRef<HTMLDivElement | null>(null);
  const live = useFakeQuery();
  const rows = live ?? snapshotRows ?? [];
  const loaded = live !== undefined || snapshotRows !== null;
  react.useEffect(() => {
    if (live) session.saveRowsSnapshot(live);
  }, [live, session]);
  hooks.useScrollRestore(urlKey, loaded, scrollRef);

  const filtered = filterLib.applyMasterFilters(rows, {
    search: filters.q,
    blocks: filters.block,
    status: filters.status,
    cycles: filters.cycle,
    kpi: filters.kpi,
    dueWindow: filters.due,
    scoreRange: filters.score,
  });

  if (!loaded) return react.createElement("p", { "data-testid": "skeleton" }, "Loading…");

  const chipList = [
    ...filters.block.map((v) => ({
      key: `block:${v}`,
      label: `Block: ${v}`,
      onRemove: () => patch({ block: filters.block.filter((b) => b !== v) }),
    })),
    ...filters.status.map((v) => ({
      key: `status:${v}`,
      label: `Status: ${v}`,
      onRemove: () => patch({ status: filters.status.filter((s) => s !== v) }),
    })),
  ];

  return react.createElement(
    "div",
    { "data-testid": "list", "data-source": live ? "live" : "snapshot" },
    react.createElement(dropdown.default, {
      label: "Block",
      options: BLOCK_OPTIONS,
      value: filters.block,
      onChange: (next: string[]) => patch({ block: next }),
      triggerWidth: "w-44",
    }),
    react.createElement(dropdown.default, {
      label: "Facility Current Status",
      options: STATUS_OPTIONS,
      value: filters.status,
      onChange: (next: string[]) => patch({ status: next }),
      triggerWidth: "w-52",
    }),
    react.createElement(chips.FilterChips, {
      chips: chipList,
      onClearAll: () => setAll({ ...filters, q: "", block: [], status: [], page: 1 }),
      onResetView: () => setAll({ ...filters, q: "", block: [], status: [], page: 1 }),
      notice: restoredFrom
        ? react.createElement(chips.RestoredNotice, { from: restoredFrom, onDismiss: dismissRestored })
        : null,
    }),
    react.createElement(
      "p",
      { "data-testid": "count" },
      `Showing ${filtered.length} of ${rows.length} facilities`,
    ),
    // Sort / page / page-size controls, wired exactly like the table header,
    // the pagination bar and the Row View select are on the real page.
    react.createElement(
      "button",
      { "data-testid": "sort-name", onClick: () => patch({ sort: [{ id: "facility", desc: false }] }) },
      "Sort by name",
    ),
    react.createElement(
      "button",
      { "data-testid": "size-50", onClick: () => patch({ size: "50", page: 1 }) },
      "50 rows",
    ),
    react.createElement(
      "button",
      { "data-testid": "page-2", onClick: () => patch({ page: 2 }) },
      "Page 2",
    ),
    react.createElement(
      "div",
      { "data-testid": "scroll", ref: scrollRef, style: { overflow: "auto" } },
      react.createElement(
        "ul",
        null,
        ...filtered.map((r) =>
          react.createElement(
            "li",
            { key: String(r.facility._id), "data-testid": `row-${r.facility._id}` },
            react.createElement(
              router.Link,
              { to: `/facilities/${r.facility._id}`, "data-testid": `link-${r.facility._id}` },
              r.facility.name,
            ),
          ),
        ),
      ),
    ),
  );
}

/** The facility profile in miniature: "Back to list" = the saved list URL. */
function ProfileView() {
  const { react, router, session } = M!;
  const params = router.useParams<{ id: string }>();
  const navigate = router.useNavigate();
  const saved = session.loadLastListUrl();
  const [name, setName] = react.useState(
    () => server.find((r) => String(r.facility._id) === params.id)?.facility.name ?? "",
  );
  return react.createElement(
    "div",
    { "data-testid": "profile" },
    react.createElement(
      router.Link,
      { to: saved ?? "/facilities", "data-testid": "back-to-list" },
      "Facilities",
    ),
    react.createElement(
      "button",
      { "data-testid": "nav-list", onClick: () => navigate("/facilities") },
      "Nav",
    ),
    react.createElement(
      "button",
      { "data-testid": "browser-back", onClick: () => navigate(-1) },
      "Back",
    ),
    react.createElement("h1", { "data-testid": "profile-name" }, name),
    // "Saving an edit": the server row changes and the list must show it.
    react.createElement(
      "button",
      {
        "data-testid": "save-edit",
        onClick: () => {
          const next = `${name} (updated)`;
          server = server.map((r) =>
            String(r.facility._id) === params.id
              ? ({ ...r, facility: { ...r.facility, name: next } } as MasterRow)
              : r,
          );
          setName(next);
        },
      },
      "Save",
    ),
  );
}

/**
 * Two dropdowns wired the way the page wires them: the Block options carry the
 * real live counts (lib/listOptionCounts) computed against the OTHER filter, so
 * ticking a Pipeline Status genuinely moves the Block numbers.
 */
function CountsHarness() {
  const { react, dropdown, counts } = M!;
  const [status, setStatus] = react.useState<string[]>([]);
  const blockNames = BLOCK_OPTIONS.map((o) => o.value);
  const live = counts.countListOptions(
    server,
    { status },
    {
      block: blockNames,
      type: [],
      cycle: [],
      eligibility: [],
      cert: [],
      status: [],
      docRep: [],
      btype: [],
      bstatus: [],
      noc: [],
    },
  );
  return react.createElement(
    react.Fragment,
    null,
    react.createElement(dropdown.default, {
      label: "Block",
      options: BLOCK_OPTIONS.map((o) => ({ ...o, count: live.block.get(o.value) })),
      value: [],
      onChange: () => {},
      triggerWidth: "w-44",
    }),
    react.createElement(dropdown.default, {
      label: "Facility Current Status",
      options: STATUS_OPTIONS,
      value: status,
      onChange: (next: string[]) => setStatus(next),
      triggerWidth: "w-52",
    }),
  );
}

/** Reports the router's location as text — a MemoryRouter keeps its history in
 *  memory, so this is how these tests read "the URL". */
function LocationProbe() {
  const { react, router } = M!;
  const loc = router.useLocation();
  return react.createElement("span", { "data-testid": "location" }, `${loc.pathname}${loc.search}`);
}

function App() {
  const { react, router } = M!;
  return react.createElement(
    router.Routes,
    null,
    react.createElement(router.Route, { path: "/facilities", element: react.createElement(ListView, null) }),
    react.createElement(router.Route, {
      path: "/facilities/:id",
      element: react.createElement(ProfileView, null),
    }),
  );
}

/* --------------------------------------------------------------------------- */
/* 5 — Mount + interaction helpers                                              */
/* --------------------------------------------------------------------------- */

const mounted: { unmount: () => void; container: HTMLElement }[] = [];

async function mountAt(path: string) {
  const { react, h, createRoot, router } = await deps();
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = createRoot(container);
  await react.act(async () => {
    root.render(
      h(
        router.MemoryRouter,
        { initialEntries: [path] },
        h(react.Fragment, null, h(LocationProbe, null), h(App, null)),
      ),
    );
  });
  // The cold query answers a moment later: settle past that so the tests start
  // from a rendered list.
  await settle(QUERY_DELAY_MS + 20);
  mounted.push({
    container,
    unmount: () => {
      root.unmount();
      container.remove();
    },
  });
  return container;
}

function q(root: ParentNode | null | undefined, selector: string): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll(selector)) as HTMLElement[];
}

/** Mount anything (used by the counts harness, which needs no routes). */
async function mountNode(element: ReactElement) {
  const { react, createRoot } = await deps();
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = createRoot(container);
  await react.act(async () => {
    root.render(element);
    await tick(10);
  });
  mounted.push({
    container,
    unmount: () => {
      root.unmount();
      container.remove();
    },
  });
  return container;
}

function onScreen(container: HTMLElement, testId: string) {
  return (
    q(container, `[data-testid="${testId}"]`)[0] ??
    q(win.document.body, `[data-testid="${testId}"]`)[0]
  );
}

const textOf = (node: HTMLElement | undefined) => (node?.textContent ?? "").trim();

/**
 * Every interaction goes through act(), so React has flushed the update before
 * the assertion reads the DOM.
 */
async function click(el: HTMLElement | undefined) {
  const { react } = await deps();
  expect(el).toBeDefined();
  await react.act(async () => {
    el!.click();
    // Let the panel's own timers (focus, positioning) run inside the same act,
    // so no "update not wrapped in act" warning floods the output.
    await tick(5);
  });
}

/** Wait for work that React owns (the fake query answering, a rAF restore). */
async function settle(ms = 20) {
  const { react } = await deps();
  await react.act(async () => {
    await tick(ms);
  });
}

/** The open panel for a filter, by its header label. */
const panelFor = (label: string) =>
  q(win.document.body, '[data-filter-panel]').find((p) => textOf(p).startsWith(label));

async function openFilter(label: string) {
  await click(q(win.document.body, `[data-filter-trigger="${label}"]`)[0]);
  return panelFor(label);
}

/** Tick an option in an open panel (panels are portalled to <body>). */
async function tickOption(label: string, scope: ParentNode = win.document.body) {
  const options = q(scope, '[role="option"]');
  await click(options.find((o) => textOf(o).startsWith(label)));
}

/** The options of one filter's panel as { label: "(count)" } — the count sits
 *  in its own span, right-aligned, exactly as it does on screen. */
const optionCountsShown = (label: string) =>
  Object.fromEntries(
    q(panelFor(label), '[role="option"]').map((o) => {
      const spans = q(o, "span");
      return [textOf(spans[1]), textOf(spans[2])];
    }),
  );

/** Close a panel by clicking its trigger again. */
async function closeFilter(label: string) {
  await click(q(win.document.body, `[data-filter-trigger="${label}"]`)[0]);
}

/** The trigger's own label — its first span — without the "(1)" count badge. */
function triggerLabel(label: string) {
  const trigger = q(win.document.body, `[data-filter-trigger="${label}"]`)[0];
  return textOf(trigger?.querySelector("span") ?? undefined);
}

function currentLocation() {
  const text = textOf(q(win.document.body, '[data-testid="location"]')[0]);
  const at = text.indexOf("?");
  return at === -1
    ? { pathname: text, search: "" }
    : { pathname: text.slice(0, at), search: text.slice(at) };
}
const search = () => currentLocation().search;
const pathname = () => currentLocation().pathname;

/** The rendered rows, in order. */
const shownNames = (container: HTMLElement) =>
  q(container, '[data-testid^="row-"]').map((li) =>
    textOf(q(li, "a")[0]),
  );

beforeEach(() => {
  // A clean page between tests: filter panels are portalled to <body>, so the
  // previous test's panel would otherwise answer the next test's queries.
  while (mounted.length) mounted.pop()?.unmount();
  win.document.body.innerHTML = "";
  win.sessionStorage.clear();
  win.localStorage.clear();
  clearAppState();
  resetServer();
  scrollCalls.length = 0;
  MOBILE = false;
});

/* --------------------------------------------------------------------------- */
/* 1 — filter, open a facility, browser Back                                    */
/* --------------------------------------------------------------------------- */

describe("Back from a facility profile", () => {
  test("keeps the filter, the count and the scroll position — no flash", async () => {
    const container = await mountAt("/facilities");
    expect(textOf(onScreen(container, "count"))).toBe("Showing 6 of 6 facilities");

    // Filter Block = Alangayam through the real dropdown.
    await openFilter("Block");
    await tickOption("Alangayam");
    expect(search()).toBe("?block=Alangayam");
    expect(triggerLabel("Block")).toBe("Block: Alangayam");
    expect(textOf(onScreen(container, "count"))).toBe("Showing 3 of 6 facilities");
    await closeFilter("Block");

    // Sort, page size and page — all part of the view, all in the URL.
    await click(onScreen(container, "sort-name"));
    await click(onScreen(container, "size-50"));
    await click(onScreen(container, "page-2"));
    expect(search()).toBe("?block=Alangayam&sort=facility:asc&page=2&size=50");

    // Scroll the table down and across (the Master List has no row ticks).
    const scroller = onScreen(container, "scroll")!;
    scroller.scrollTop = 240;
    scroller.scrollLeft = 120;
    scroller.dispatchEvent(new win.Event("scroll"));
    await settle(10);

    // Open the facility through the real link (the profile route).
    await click(onScreen(container, "link-f1"));
    expect(pathname()).toBe("/facilities/f1");

    // Browser Back.
    await click(onScreen(container, "browser-back"));
    expect(pathname()).toBe("/facilities");
    expect(search()).toBe("?block=Alangayam&sort=facility:asc&page=2&size=50");

    // NO FLASH: the rows are already on screen, painted from the session
    // snapshot, while the (cold) query is still in flight.
    expect(onScreen(container, "list")!.getAttribute("data-source")).toBe("snapshot");
    expect(q(container, '[data-testid="skeleton"]').length).toBe(0);
    expect(textOf(onScreen(container, "count"))).toBe("Showing 3 of 6 facilities");
    expect(triggerLabel("Block")).toBe("Block: Alangayam");
    expect(shownNames(container)).toEqual(["Ariyur PHC", "Ariyur HSC", "Vellore PHC"]);

    // Scroll comes back with it.
    await settle(120);
    expect(onScreen(container, "scroll")!.scrollTop).toBe(240);
    expect(onScreen(container, "scroll")!.scrollLeft).toBe(120);

    // And the live rows silently take over (no reload, no re-filter).
    expect(onScreen(container, "list")!.getAttribute("data-source")).toBe("live");
    expect(shownNames(container)).toEqual(["Ariyur PHC", "Ariyur HSC", "Vellore PHC"]);
  });

  test("a filtered link in a fresh tab keeps the filter — and says so", async () => {
    const container = await mountAt("/facilities?block=Mittur&status=Certified");
    expect(triggerLabel("Block")).toBe("Block: Mittur");
    expect(triggerLabel("Facility Current Status")).toBe("Facility Current Status: Certified");
    expect(textOf(onScreen(container, "count"))).toBe("Showing 1 of 6 facilities");
    expect(textOf(onScreen(container, "filters-restored"))).toContain(
      "Filters restored from this link",
    );

    // Dismissing the notice leaves the filter alone.
    await click(onScreen(container, "filters-restored")!.querySelector("button") as HTMLElement);
    expect(onScreen(container, "filters-restored")).toBeUndefined();
    expect(search()).toBe("?block=Mittur&status=Certified");
  });

  test("unknown or invalid query params never crash the page", async () => {
    const container = await mountAt(
      "/facilities?score=abc&sort=bogus:asc&page=-4&size=huge&kpi=nope&due=45",
    );
    expect(triggerLabel("Block")).toBe("Block: All");
    expect(textOf(onScreen(container, "count"))).toBe("Showing 6 of 6 facilities");

  });

  test("a filter value that matches nothing shows zero rows — still no crash", async () => {
    const container = await mountAt("/facilities?block=Nowhere");
    expect(textOf(onScreen(container, "count"))).toBe("Showing 0 of 6 facilities");
    expect(shownNames(container)).toEqual([]);
  });
});

/* --------------------------------------------------------------------------- */
/* 2 — the in-app "Back to list" button                                         */
/* --------------------------------------------------------------------------- */

describe("the in-app Back to list button", () => {
  test("returns to the saved list URL, filters included", async () => {
    const container = await mountAt("/facilities");
    await openFilter("Block");
    await tickOption("Alangayam");
    await closeFilter("Block");
    await openFilter("Facility Current Status");
    await tickOption("Certified");
    await closeFilter("Facility Current Status");
    expect(search()).toBe("?block=Alangayam&status=Certified");
    expect(textOf(onScreen(container, "count"))).toBe("Showing 1 of 6 facilities");

    await click(onScreen(container, "link-f1"));
    expect(pathname()).toBe("/facilities/f1");

    // "Back to list" is a link to the URL the list remembered.
    expect(onScreen(container, "back-to-list")!.getAttribute("href")).toBe(
      "/facilities?block=Alangayam&status=Certified",
    );
    await click(onScreen(container, "back-to-list"));
    expect(search()).toBe("?block=Alangayam&status=Certified");
    expect(textOf(onScreen(container, "count"))).toBe("Showing 1 of 6 facilities");
    expect(triggerLabel("Block")).toBe("Block: Alangayam");
  });

  test("reopening the bare list restores the last view and says where it came from", async () => {
    const container = await mountAt("/facilities");
    await openFilter("Block");
    await tickOption("Alangayam");
    await closeFilter("Block");
    await click(onScreen(container, "link-f1"));

    // The nav link points at the bare list — the hook sends it to the view the
    // user left instead of showing them a different list.
    await click(onScreen(container, "nav-list"));
    expect(search()).toBe("?block=Alangayam");
    expect(triggerLabel("Block")).toBe("Block: Alangayam");
    expect(textOf(onScreen(container, "filters-restored"))).toContain(
      "Filters restored from your last visit",
    );
  });
});

/* --------------------------------------------------------------------------- */
/* 3 — edit a facility, then return                                             */
/* --------------------------------------------------------------------------- */

describe("returning after an edit", () => {
  test("shows the updated row with the same filters and no stale cache", async () => {
    const container = await mountAt("/facilities");
    await openFilter("Block");
    await tickOption("Alangayam");
    await closeFilter("Block");
    await click(onScreen(container, "link-f1"));

    await click(onScreen(container, "save-edit"));
    expect(textOf(onScreen(container, "profile-name"))).toBe("Ariyur PHC (updated)");

    await click(onScreen(container, "back-to-list"));
    expect(search()).toBe("?block=Alangayam");
    expect(textOf(onScreen(container, "count"))).toBe("Showing 3 of 6 facilities");
    // The live rows win over the (stale) snapshot as soon as the query answers.
    await settle(QUERY_DELAY_MS + 30);
    expect(shownNames(container)).toEqual([
      "Ariyur PHC (updated)",
      "Ariyur HSC",
      "Vellore PHC",
    ]);
  });
});

/* --------------------------------------------------------------------------- */
/* 4 — the facility name is a real link                                         */
/* --------------------------------------------------------------------------- */

describe("the facility name link", () => {
  test("is an anchor to the profile, and Ctrl/Cmd+click leaves the list alone", async () => {
    const container = await mountAt("/facilities?block=Alangayam");
    const link = onScreen(container, "link-f1") as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/facilities/f1");

    // Ctrl/Cmd+click lets the browser open a new tab: this tab must not
    // navigate and the view must stay exactly as it was.
    const { react } = await deps();
    await react.act(async () => {
      link.dispatchEvent(
        new win.MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true }),
      );
    });
    await tick(5);
    expect(pathname()).toBe("/facilities");
    expect(search()).toBe("?block=Alangayam");
    expect(triggerLabel("Block")).toBe("Block: Alangayam");
    expect(shownNames(container)).toEqual(["Ariyur PHC", "Ariyur HSC", "Vellore PHC"]);
  });
});

/* --------------------------------------------------------------------------- */
/* 5 — Clear / Clear all                                                        */
/* --------------------------------------------------------------------------- */

describe("clearing filters", () => {
  test('"Clear" drops one filter; "Clear all filters" drops them all', async () => {
    const container = await mountAt("/facilities");
    await openFilter("Block");
    await tickOption("Alangayam");
    await closeFilter("Block");
    await openFilter("Facility Current Status");
    await tickOption("Certified");
    expect(search()).toBe("?block=Alangayam&status=Certified");

    // "Clear" inside the Block panel removes only the Block filter.
    const panel = await openFilter("Block");
    const clear = Array.from(panel!.querySelectorAll("button")).find(
      (b) => textOf(b) === "Clear",
    );
    await click(clear);
    expect(search()).toBe("?status=Certified");
    expect(triggerLabel("Block")).toBe("Block: All");
    expect(triggerLabel("Facility Current Status")).toBe("Facility Current Status: Certified");
    await closeFilter("Block");

    // And "Clear all filters" (chips row) drops what is left.
    const clearAll = q(container, "button").find((b) => textOf(b).includes("Clear all filters"));
    await click(clearAll);
    expect(search()).toBe("");
    expect(textOf(onScreen(container, "count"))).toBe("Showing 6 of 6 facilities");
    expect(triggerLabel("Facility Current Status")).toBe("Facility Current Status: All");
  });
});

/* --------------------------------------------------------------------------- */
/* 6 — the dropdown itself                                                      */
/* --------------------------------------------------------------------------- */

describe("the shared filter dropdown", () => {
  test("labels the state: All → names → N selected", async () => {
    const { listUrlState } = await deps();
    expect(listUrlState.filterTriggerText("Block", [])).toBe("Block: All");
    expect(listUrlState.filterTriggerText("Block", ["Alangayam"])).toBe("Block: Alangayam");
    expect(listUrlState.filterTriggerText("Block", ["Alangayam", "DMS"])).toBe(
      "Block: Alangayam, DMS",
    );
    expect(listUrlState.filterTriggerText("Block", ["A", "B", "C"])).toBe("Block: 3 selected");

    const container = await mountAt("/facilities");
    expect(triggerLabel("Block")).toBe("Block: All");
    await openFilter("Block");
    await tickOption("Alangayam");
    await tickOption("Mittur");
    expect(triggerLabel("Block")).toBe("Block: Alangayam, Mittur");
    expect(textOf(onScreen(container, "count"))).toBe("Showing 5 of 6 facilities");
  });

  test("shows a count beside every option and updates it live", async () => {
    const { h } = await deps();
    await mountNode(h(CountsHarness, null));
    await openFilter("Block");
    expect(optionCountsShown("Block")).toEqual({
      Alangayam: "(3)",
      Mittur: "(2)",
      DMS: "(1)",
    });

    // Change ANOTHER filter (Pipeline Status = Certified): the Block counts
    // follow, because they are computed against the other active filters.
    await openFilter("Facility Current Status");
    await tickOption("Certified", panelFor("Facility Current Status")!);
    expect(optionCountsShown("Block")).toEqual({
      Alangayam: "(1)",
      Mittur: "(1)",
      DMS: "(1)",
    });
  });

  test("one Clear action (disabled when nothing is selected), no old jargon", async () => {
    await mountAt("/facilities");
    const panel = await openFilter("Block");
    const clearButtons = () =>
      Array.from(panel!.querySelectorAll("button")).filter((b) => textOf(b) === "Clear");
    expect(clearButtons().length).toBe(1);
    expect((clearButtons()[0] as HTMLButtonElement).disabled).toBe(true);
    const panelText = textOf(panel);
    expect(panelText).not.toContain("Clear selection");
    expect(panelText).not.toContain("Clear all");
    expect(panelText).not.toContain("shown");
  });

  test("mobile (360px) renders the panel as a bottom sheet and still persists", async () => {
    MOBILE = true;
    const container = await mountAt("/facilities");
    const panel = await openFilter("Block");
    expect(panel!.className).toContain("bottom-0");
    expect(panel!.className).toContain("rounded-t-2xl");
    await tickOption("Alangayam");
    expect(search()).toBe("?block=Alangayam");
    expect(textOf(onScreen(container, "count"))).toBe("Showing 3 of 6 facilities");
    MOBILE = false;
  });
});
