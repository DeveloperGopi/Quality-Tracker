/**
 * FACILITY QUICK VIEW — the centred dialog, mounted in happy-dom.
 *
 * Note: this repository ships bun + happy-dom contract tests only (no
 * Playwright project), so the browser-level scenarios from the brief are
 * covered here at the DOM/CSS-contract level: the dialog element itself
 * (native <dialog>, centred, aria-modal, scrim click), the stepper states,
 * the single section list (no second tab row), the save flow (disabled
 * "No changes", blocking validation, Ctrl/Cmd+S, guard on close), the viewer
 * role, the deep link and the source-level promises ("no Last updated", no
 * "facilityies").
 *
 * Run: bun test ./scripts/quickView.dom.test.ts
 */
import { describe, test, expect, afterEach, beforeEach, mock } from "bun:test";
import { readFileSync } from "node:fs";
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost/facilities?facility=f1&section=building" });

/* ---- Convex / auth stubs (same pattern as the other DOM tests) ---- */
let profile: Record<string, unknown> | undefined = undefined;
mock.module("convex/react", () => ({
  useQuery: () => profile,
  useMutation: () => async () => undefined,
  // src/hooks/use-auth reads the auth state from convex/react.
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  // DocumentsCard / DocumentField are imported by the Quick View now.
  useAction: () => async () => undefined,
  useConvex: () => ({ query: async () => ({ token: "test-token" }) }),
}));
mock.module("@convex-dev/auth/react", () => ({
  ConvexAuthProvider: ({ children }: { children?: unknown }) => children,
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  // The document panel signs its upload requests through the auth actions.
  useAuthActions: () => ({
    signIn: async () => undefined,
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
  takeRecords() { return []; }
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
      onchange: null,
      dispatchEvent: () => false,
    }),
  });
}
defineGlobal("matchMedia", win.matchMedia.bind(win));

let h: typeof import("react").createElement;
let createRoot: typeof import("react-dom/client").createRoot;
let useState: typeof import("react").useState;

async function deps() {
  if (!h) {
    const react = await import("react");
    h = react.createElement;
    useState = react.useState;
  }
  if (!createRoot) createRoot = (await import("react-dom/client")).createRoot;
  return { h, createRoot };
}

let QuickViewMod: typeof import("../src/components/quickview/FacilityQuickView");
let MemoryRouter: typeof import("react-router").MemoryRouter;

async function loadMod() {
  QuickViewMod ??= await import(
    "../src/components/quickview/FacilityQuickView"
  );
  MemoryRouter ??= (await import("react-router")).MemoryRouter;
  return QuickViewMod;
}

const mounted: { root: { unmount: () => void }; container: HTMLElement }[] = [];

function makeRow(over: Record<string, unknown> = {}) {
  return {
    facility: {
      _id: "f1",
      name: "PHC Alangayam",
      block: "Alangayam",
      phc: "PHC Alangayam",
      facilityType: "PHC",
      ninNumber: "4527324786",
      eligibility: "Not Eligible",
      currentStatus: "Not Eligible",
      updatedAt: Date.parse("2026-10-20T06:00:00Z"),
      ...(over.facility as Record<string, unknown> | undefined),
    },
    sa: (over.sa as never) ?? null,
    nqas: (over.nqas as never) ?? null,
    fund: null,
    noc: (over.noc as never) ?? null,
    building: null,
  };
}

async function mount(
  opts: {
    row?: Record<string, unknown>;
  canEdit?: boolean;
  initialSection?: string;
    onSave?: (row: unknown, state: unknown) => Promise<void>;
    onCloseSpy?: (open: boolean) => void;
  } = {},
) {
  await deps();
  const { FacilityQuickView } = await loadMod();
  const row = (opts.row ?? makeRow()) as never;
  const canEdit = opts.canEdit ?? true;
  function Host() {
    const [open] = useState(true);
    const [section, setSection] = useState(opts.initialSection ?? "overview");
    return h(FacilityQuickView, {
      row: open ? row : null,
      open,
      onOpenChange: (o: boolean) => opts.onCloseSpy?.(o),
      labels: {},
      canEdit,
      siblings: [row] as never,
      onNavigate: () => undefined,
      initialSection: section,
      onSectionChange: (k: string) => setSection(k),
      onSave: opts.onSave,
      settings: {},
      recentDays: 30,
    });
  }
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = createRoot(container);
  root.render(h(MemoryRouter, { initialEntries: ["/facilities"] }, h(Host)));
  await new Promise((r) => setTimeout(r, 20));
  mounted.push({ root, container });
  return container;
}

function cleanup() {
  while (mounted.length) {
    const m = mounted.pop()!;
    m.root.unmount();
    m.container.remove();
  }
  profile = undefined;
}

const q = (container: HTMLElement, sel: string) =>
  container.querySelector(sel) as HTMLElement | null;
const qa = (container: HTMLElement, sel: string) =>
  Array.from(container.querySelectorAll(sel)) as HTMLElement[];

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

/** React tracks the value with a native setter — write through it, then fire
 *  the input event, so `onChange` fires like it does in a browser. */
function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const proto = el.tagName === "TEXTAREA"
    ? win.HTMLTextAreaElement.prototype
    : win.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new win.Event("input", { bubbles: true }));
}

beforeEach(() => {
  // The dialog stores per-facility drafts — keep them out of each test.
  try {
    for (const k of Object.keys(win.localStorage)) {
      if (k.startsWith("nqas.qv.draft")) win.localStorage.removeItem(k);
    }
  } catch {
    /* storage unavailable */
  }
});
afterEach(cleanup);

/* --------------------------------------------------------------------------- */

describe("Facility Quick View — container contract", () => {
  test("opens as a native, centred, labelled modal dialog", async () => {
    const c = await mount();
    const dialog = q(c, "dialog[data-testid='facility-quick-view']");
    expect(dialog).not.toBeNull();
    expect(dialog!.tagName).toBe("DIALOG");
    expect(dialog!.getAttribute("aria-modal")).toBe("true");
    expect(dialog!.getAttribute("aria-labelledby")).toBe("qv-title");
    expect(dialog!.className).toContain("qv-dialog");
    // Painted from the cached row instantly — no loading shell in the header.
    expect(c.textContent).toContain("PHC Alangayam");
    expect(c.textContent).toContain("4527324786");
  });

  test("the CSS contract: 1080×760, 16px radius, blurred scrim, full-sheet on phones", () => {
    const css = readFileSync("src/index.css", "utf8");
    const block = css.slice(css.indexOf(".qv-dialog {"), css.indexOf("@keyframes qv-in"));
    expect(block).toContain("width: min(1080px, 94vw)");
    expect(block).toContain("height: min(760px, 92dvh)");
    expect(block).toContain("border-radius: 16px");
    expect(css).toMatch(/\.qv-dialog::backdrop[\s\S]{0,200}backdrop-filter: blur\(6px\)/);
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]{0,200}\.qv-dialog/);
    expect(css).toMatch(/prefers-reduced-motion[\s\S]{0,120}\.qv-dialog \{\s*animation: none;/);
  });

  test("outside (scrim) click asks the page to close the dialog", async () => {
    let closed = 0;
    const c = await mount({ onCloseSpy: () => (closed += 1) });
    const dialog = q(c, "dialog")!;
    dialog.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
    await tick();
    expect(closed).toBe(1);
  });

  test("a clean dialog closes straight away; a dirty one asks first", async () => {
    let closed = 0;
    const c = await mount({ onCloseSpy: () => (closed += 1) });
    const dialog = q(c, "dialog")!;
    dialog.dispatchEvent(new win.CustomEvent("qv-close-request"));
    await tick();
    expect(closed).toBe(1);
  });
});

describe("Facility Quick View — stepper and sections", () => {
  test("Not Eligible ⇒ Eligibility BLOCKED, later stages Upcoming (never green)", async () => {
    const c = await mount();
    const stage = (key: string) => q(c, `[data-stage='${key}']`)!;
    expect(stage("eligibility").getAttribute("data-state")).toBe("blocked");
    for (const key of ["sa", "nqas", "certification", "surveillance", "recertification"]) {
      expect(stage(key).getAttribute("data-state")).toBe("upcoming");
    }
    // The blocked reason is stated in text, not colour alone.
    expect(c.textContent).toContain("Not Eligible");
  });

  test("a certified facility shows Done through Certification, Surveillance Current", async () => {
    const c = await mount({
      row: makeRow({
        facility: { eligibility: "Eligible", currentStatus: "Certified — Surveillance Due" },
        sa: { status: "Completed", actualEndDate: "2025-03-01" },
        nqas: {
          status: "Completed",
          certificationStatus: "Quality Certified",
          certificationDate: "2025-05-02",
          validityDate: "2028-05-01",
          surveillanceDone1: "2026-05-01",
          surveillanceDue1: "2026-05-02",
          surveillanceDue2: "2027-05-02",
        },
      }),
    });
    expect(q(c, "[data-stage='certification']")!.getAttribute("data-state")).toBe("done");
    expect(q(c, "[data-stage='surveillance']")!.getAttribute("data-state")).toBe("current");
  });

  test("ONE navigation list: section nav, no second tab row, deep-linked section active", async () => {
    const c = await mount({ initialSection: "building" });
    const nav = qa(c, "[data-section-nav]").map((b) => b.getAttribute("data-section-nav"));
    expect(nav).toEqual([
      "overview",
      "eligibility",
      "state",
      "nqas",
      "funds",
      "ia",
      "surveillance",
      "building",
      "documents",
      "history",
      "audit",
    ]);
    // The stepper is not a second tab row (the old drawer rendered a
    // TabsList right under it).
    expect(qa(c, "[role='tablist']").length).toBe(0);
    expect(qa(c, "[role='tab']").length).toBe(0);
    // The deep-linked section is rendered and marked current.
    expect(q(c, "[data-qv-section='building']")).not.toBeNull();
    expect(q(c, "[data-section-nav='building']")!.getAttribute("aria-current")).toBe("true");
  });

  test("the header repeats nothing and carries ONE timestamp chip", async () => {
    const c = await mount();
    const subtitle = c.textContent ?? "";
    // Block appears once in the subtitle, never as "Alangayam · Alangayam".
    const occurrences = (subtitle.match(/Alangayam block/g) ?? []).length;
    expect(occurrences).toBe(1);
    expect(subtitle).not.toContain("Alangayam block · PHC Alangayam · Alangayam");
    // The drawer's third timestamp is gone — no "Last updated" in the dialog.
    expect(subtitle).not.toContain("Last updated");
    expect(subtitle).toContain("Updated");
  });

  test("no 'facilityies' anywhere in the source", () => {
    const files = [
      "src/pages/FacilityList.tsx",
      "src/components/quickview/FacilityQuickView.tsx",
      "src/lib/facilityQuickView.ts",
    ];
    for (const f of files) expect(readFileSync(f, "utf8")).not.toContain("facilityies");
  });
});

describe("Facility Quick View — needs attention + NOC vocabulary", () => {
  test("NOC Available = No beside recorded NOC dates is flagged on top", async () => {
    const c = await mount({
      row: makeRow({ noc: { nocAvailable: "No", expiryDate: "2027-04-01" } }),
    });
    expect(c.textContent).toContain("Needs attention");
    expect(c.textContent).toContain("reconcile the two");
  });

  test("NOC Available renders Yes / No (or '-') — never 'Not started'", async () => {
    const blank = await mount();
    expect(blank.textContent).not.toContain("Not started");
    cleanup();
    const yes = await mount({
      row: makeRow({ noc: { nocAvailable: "No", status: "Not Obtained" } }),
      initialSection: "building",
    });
    expect(q(yes, "[data-qv-field='nocAvailable']")).not.toBeNull();
    expect(q(yes, "[data-qv-field='nocAvailable']")!.textContent).toContain("No");
  });
});

describe("Facility Quick View — save flow", () => {
  test("viewer: no Edit switch, no Save controls", async () => {
    const c = await mount({ canEdit: false });
    const modeGroup = qa(c, "[role='group'][aria-label='Mode'] button").map(
      (b) => b.textContent,
    );
    expect(modeGroup).toEqual(["View"]);
    expect(c.textContent).toContain("View only");
    expect(c.textContent).not.toContain("Save changes");
  });

  test("'No changes' disables Save; editing enables it with a count", async () => {
    const c = await mount();
    const editBtn = qa(c, "[role='group'][aria-label='Mode'] button").find(
      (b) => b.textContent?.trim() === "Edit",
    )!;
    editBtn.click();
    await tick();

    let saveBtn = qa(c, "button").find((b) => b.textContent?.trim() === "No changes")!;
    expect(saveBtn).toBeDefined();
    expect(saveBtn.hasAttribute("disabled")).toBe(true);

    // Open the remarks editor (a plain long-text field, no popover) and type.
    const field = q(c, "[data-qv-field='remarks']")!;
    field.querySelector("button")!.click();
    await tick();
    const area = field.querySelector("textarea") as HTMLTextAreaElement;
    expect(area).not.toBeNull();
    setNativeValue(area, "Checked by district");
    await tick();

    saveBtn = qa(c, "button").find((b) => b.textContent?.includes("Save changes"))!;
    expect(saveBtn.hasAttribute("disabled")).toBe(false);
    expect(c.textContent).toContain("1 unsaved change");
    // The changed field is marked, and Review is offered.
    expect(c.textContent).toContain("Review changes");
  });

  test("blocking validation disables Save and inline-errors the field", async () => {
    const c = await mount({
      row: makeRow({
        facility: { eligibility: "Eligible", currentStatus: "Certified" },
        sa: { status: "Completed" },
        nqas: {
          status: "Completed",
          certificationStatus: "Quality Certified",
          certificationDate: "2025-05-02",
        },
      }),
      initialSection: "nqas",
    });
    const editBtn = qa(c, "[role='group'][aria-label='Mode'] button").find(
      (b) => b.textContent?.trim() === "Edit",
    )!;
    editBtn.click();
    await tick();
    const field = q(c, "[data-qv-field='certScore']")!;
    field.querySelector("button")!.click();
    await tick();
    const input = field.querySelector("input[type='number']") as HTMLInputElement;
    expect(input).not.toBeNull();
    setNativeValue(input, "150");
    await tick();
    expect(field.textContent).toContain("Score must be between 0 and 100");
    const saveBtn = qa(c, "button").find((b) => b.textContent?.includes("Save changes"))!;
    expect(saveBtn.hasAttribute("disabled")).toBe(true);
  });

  test("Ctrl/Cmd+S saves and reports 'Saved ✓'", async () => {
    let saved = 0;
    const c = await mount({
      onSave: async () => {
        saved += 1;
      },
    });
    const editBtn = qa(c, "[role='group'][aria-label='Mode'] button").find(
      (b) => b.textContent?.trim() === "Edit",
    )!;
    editBtn.click();
    await tick();
    const field = q(c, "[data-qv-field='remarks']")!;
    field.querySelector("button")!.click();
    await tick();
    const area = field.querySelector("textarea") as HTMLTextAreaElement;
    setNativeValue(area, "Saved by shortcut");
    await tick();
    const pane = q(c, "[data-testid='quick-view-content']")!;
    pane.dispatchEvent(
      new win.KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true }),
    );
    await tick();
    expect(saved).toBe(1);
    expect(c.textContent).toMatch(/Saved ✓ \d{2}:\d{2}/);
  });

  test("after a successful save the bar reads Saved ✓ / No changes (not “unsaved”)", async () => {
    let saved = 0;
    const c = await mount({ onSave: async () => { saved += 1; } });
    const editBtn = qa(c, "[role='group'][aria-label='Mode'] button").find(
      (b) => b.textContent?.trim() === "Edit",
    )!;
    editBtn.click();
    await tick();
    const field = q(c, "[data-qv-field='remarks']")!;
    field.querySelector("button")!.click();
    await tick();
    setNativeValue(field.querySelector("textarea") as HTMLTextAreaElement, "Saved once");
    await tick();
    const saveBtn = qa(c, "button").find((b) => b.textContent?.trim() === "Save changes")!;
    saveBtn.click();
    await tick(80);
    expect(saved).toBe(1);
    expect(c.textContent).toContain("Saved ✓");
    expect(qa(c, "button").some((b) => b.textContent?.trim() === "No changes")).toBe(true);
    expect(c.textContent).not.toContain("unsaved change");
  });

  test("double-clicking Save sends ONE request", async () => {
    let saved = 0;
    const c = await mount({
      onSave: async () => {
        saved += 1;
        await new Promise((r) => setTimeout(r, 60));
      },
    });
    qa(c, "[role='group'][aria-label='Mode'] button")
      .find((b) => b.textContent?.trim() === "Edit")!
      .click();
    await tick();
    const field = q(c, "[data-qv-field='remarks']")!;
    field.querySelector("button")!.click();
    await tick();
    setNativeValue(field.querySelector("textarea") as HTMLTextAreaElement, "Once only");
    await tick();
    const saveBtn = qa(c, "button").find((b) => b.textContent?.trim() === "Save changes")!;
    saveBtn.click();
    await tick(5);
    saveBtn.click();
    await tick(120);
    expect(saved).toBe(1);
  });

  test("Discard asks once, restores the stored value and leaves Edit mode", async () => {
    const c = await mount();
    qa(c, "[role='group'][aria-label='Mode'] button")
      .find((b) => b.textContent?.trim() === "Edit")!
      .click();
    await tick();
    const field = q(c, "[data-qv-field='remarks']")!;
    field.querySelector("button")!.click();
    await tick();
    setNativeValue(field.querySelector("textarea") as HTMLTextAreaElement, "Throw me away");
    await tick();
    qa(c, "button").find((b) => b.textContent?.trim() === "Discard")!.click();
    await tick(40);
    expect(win.document.body.textContent).toContain("Discard 1 change?");
    qa(win.document.body as unknown as HTMLElement, "button")
      .find((b) => b.textContent?.trim() === "Discard changes")!
      .click();
    await tick(60);
    // Back in View mode, the draft gone, the stored value intact (blank → "-").
    const view = qa(c, "[role='group'][aria-label='Mode'] button").find(
      (b) => b.textContent?.trim() === "View",
    )!;
    expect(view.getAttribute("aria-pressed")).toBe("true");
    expect(c.textContent).not.toContain("Throw me away");
    expect(qa(c, "button").some((b) => b.textContent?.trim() === "No changes")).toBe(false);
  });

  test("closing with unsaved changes asks Save / Discard / Keep editing first", async () => {
    let closed = 0;
    const c = await mount({ onCloseSpy: () => (closed += 1) });
    const editBtn = qa(c, "[role='group'][aria-label='Mode'] button").find(
      (b) => b.textContent?.trim() === "Edit",
    )!;
    editBtn.click();
    await tick();
    const field = q(c, "[data-qv-field='remarks']")!;
    field.querySelector("button")!.click();
    await tick();
    const area = field.querySelector("textarea") as HTMLTextAreaElement;
    setNativeValue(area, "Unsaved work");
    await tick();

    const dialog = q(c, "dialog")!;
    dialog.dispatchEvent(new win.CustomEvent("qv-close-request"));
    // Radix mounts the guard portal on the next commit — wait for it instead
    // of racing a single microtask (flaky when the whole suite runs).
    await tick();
    await new Promise((r) => setTimeout(r, 20));
    await tick();
    expect(closed).toBe(0); // not closed behind the user's back
    for (let i = 0; i < 25 && !(win.document.body.textContent ?? "").includes("Save your changes?"); i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    // The guard is a Radix dialog: it renders into a portal on the body.
    const body = win.document.body.textContent ?? "";
    expect(body).toContain("Save your changes?");
    expect(body).toContain("Keep editing");
    expect(body).toContain("Discard");
  });
});
