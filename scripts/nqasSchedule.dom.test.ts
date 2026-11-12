/**
 * PART 1 — the REAL NQAS Assessment form, mounted in happy-dom.
 *
 * Regression for the reported screen: a facility scheduled on 06-Nov-2025
 * (today 24-Oct-2026) with NO scheduled end date must show an enabled
 * "Visit dates same as scheduled" checkbox, and typing the scheduled start
 * must fill the empty scheduled end once (with the "End date set to start
 * date" note and an Undo).
 */
import { afterEach, describe, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost/facilities/f1" });

mock.module("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useQuery: () => undefined,
  useMutation: () => async () => undefined,
  useAction: () => async () => undefined,
  useConvex: () => ({ query: async () => ({ token: "t" }) }),
}));
mock.module("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useAuthActions: () => ({ signIn: async () => {}, signOut: async () => {} }),
  ConvexAuthProvider: ({ children }: { children?: unknown }) => children,
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
  "HTMLElement",
  "Element",
  "Node",
  "Event",
  "CustomEvent",
  "MouseEvent",
  "KeyboardEvent",
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
let forms: typeof import("../src/components/profile/AssessmentForms") | null = null;

async function deps() {
  if (!react) react = await import("react");
  if (!createRoot) createRoot = (await import("react-dom/client")).createRoot;
  if (!forms) forms = await import("../src/components/profile/AssessmentForms");
  return { react: react!, createRoot: createRoot!, forms: forms! };
}

const mounted: (() => void)[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.();
});

async function mountForm(scheduledStart: string, scheduledEnd = ""): Promise<HTMLElement> {
  const { react: r, createRoot: cr, forms: f } = await deps();
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = cr(container, {} as never);
  await r.act(async () => {
    root.render(
      r.createElement(f.NqasForm, {
        nqas: {
          status: "Scheduled",
          scheduledStartDate: scheduledStart,
          scheduledEndDate: scheduledEnd,
        },
        facilityId: "f1",
        cycleId: "c1",
        modes: ["On-site"],
        checklists: ["v1"],
        departments: ["OPD"],
        certStatuses: ["Quality Certified"],
        settings: {},
        saCompleted: true,
        disabled: false,
        audits: [],
        onSave: async () => {},
      } as never) as never,
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

const byTestId = (el: HTMLElement, id: string) =>
  el.querySelector<HTMLElement>(`[data-testid="${id}"]`);

async function mountSaForm(scheduledDate: string): Promise<HTMLElement> {
  const { react: r, createRoot: cr, forms: f } = await deps();
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = cr(container, {} as never);
  await r.act(async () => {
    root.render(
      r.createElement(f.SaForm, {
        sa: { status: "Scheduled", scheduledDate },
        facilityId: "f1",
        cycleId: "c1",
        statuses: ["NA Completed & Awaiting Results"],
        assessorHuds: [],
        disabled: false,
        audits: [],
        assessorPool: [],
        duplicateSource: null,
        onSave: async () => {},
      } as never) as never,
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

describe("NQAS form — schedule and visit", () => {
  test("past scheduled start with an EMPTY end ⇒ checkbox ENABLED", async () => {
    const el = await mountForm("2025-11-06");
    const box = byTestId(el, "nqas-same-as-scheduled") as HTMLInputElement;
    expect(box).not.toBeNull();
    expect(box.disabled).toBe(false);
    expect(byTestId(el, "nqas-link-reason")).toBeNull();
    // The shared mini-row is present in the Schedule section.
    expect(byTestId(el, "nqas-schedule-visit")).not.toBeNull();
  });

  test("typing the scheduled start fills the empty scheduled end once", async () => {
    const el = await mountForm("");
    const start = el.querySelector<HTMLInputElement>("#nqas\\.scheduledStartDate");
    expect(start).not.toBeNull();
    const { react: r } = await deps();
    await r.act(async () => {
      // React tracks the value on the element instance — set it through the
      // native prototype setter so the change is seen.
      const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, "value")?.set;
      setter?.call(start, "2025-11-06");
      start!.dispatchEvent(new win.Event("input", { bubbles: true }) as unknown as Event);
      start!.dispatchEvent(new win.Event("change", { bubbles: true }) as unknown as Event);
      await new Promise((res) => setTimeout(res, 10));
    });
    expect(byTestId(el, "nqas\\.scheduledEndDate-display")?.textContent).toContain("06-Nov-2025");
    expect(el.textContent).toContain("End date set to start date.");
    expect(el.textContent).toContain("Undo");
  });

  test("the date is shown once, in DD-MMM-YYYY, with no echoed second value", async () => {
    const el = await mountForm("2025-11-06");
    const display = byTestId(el, "nqas\\.scheduledStartDate-display");
    expect(display?.textContent?.trim()).toBe("06-Nov-2025");
    // The old duplicate echo was a separate right-aligned span; the visible
    // row now holds exactly one formatted date.
    const row = display?.parentElement;
    expect((row?.textContent ?? "").match(/06-Nov-2025/g)?.length).toBe(1);
  });
});

async function typeInto(input: HTMLInputElement, value: string) {
  const { react: r } = await deps();
  await r.act(async () => {
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new win.Event("input", { bubbles: true }) as unknown as Event);
    await new Promise((res) => setTimeout(res, 30));
  });
}

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

describe("DateInput — the reported Schedule bug", () => {
  test("clicking Change opens a portalled picker; the scheduled end stays editable when linked", async () => {
    const el = await mountForm("2025-11-06");
    const { react: r } = await deps();
    const display = byTestId(el, "nqas\\.scheduledStartDate-display");
    const root = display?.parentElement?.parentElement as HTMLElement;
    const change = Array.from(root.querySelectorAll("span")).find(
      (s) => s.textContent?.trim() === "Change",
    ) as HTMLElement;
    expect(change).toBeTruthy();
    await r.act(async () => {
      change.click();
      await wait(150);
    });
    expect(document.querySelector("[data-date-panel]")).not.toBeNull();

    const box = byTestId(el, "nqas-same-as-scheduled") as HTMLInputElement;
    await r.act(async () => {
      box.click();
      await wait(20);
    });
    const end = el.querySelector<HTMLInputElement>("#nqas\\.scheduledEndDate");
    expect(end).not.toBeNull();
    expect(end?.disabled).toBe(false);
  });

  test("an invalid typed date keeps the old value and shows a plain message", async () => {
    const el = await mountForm("2025-11-06");
    const input = el.querySelector<HTMLInputElement>("#nqas\\.scheduledStartDate")!;
    await typeInto(input, "31-02-2025");
    const { react: r } = await deps();
    await r.act(async () => {
      input.blur();
      await wait(200);
    });
    expect(el.textContent).toContain("Enter a date like 06-Nov-2025");
    await r.act(async () => {
      input.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }) as unknown as Event);
      await wait(20);
    });
    expect(byTestId(el, "nqas\\.scheduledStartDate-display")?.textContent).toContain("06-Nov-2025");
  });

  test("a future actual visit date is rejected with the limit in the message", async () => {
    const el = await mountForm("2025-11-06");
    const input = el.querySelector<HTMLInputElement>("#nqas\\.actualStartDate");
    expect(input).not.toBeNull();
    await typeInto(input!, "2027-01-01");
    expect(el.textContent).toContain("latest allowed date");
  });
});

describe("State Assessment form — the same shared control", () => {
  test("past scheduled date ⇒ checkbox enabled; ticking copies both visit dates", async () => {
    const el = await mountSaForm("2025-11-06");
    const box = byTestId(el, "sa-same-as-scheduled") as HTMLInputElement;
    expect(box).not.toBeNull();
    expect(box.disabled).toBe(false);
    const { react: r } = await deps();
    await r.act(async () => {
      box.click();
      await new Promise((res) => setTimeout(res, 10));
    });
    expect(byTestId(el, "sa-visit-summary")?.textContent).toContain("06-Nov-2025 → 06-Nov-2025");
    expect(byTestId(el, "sa-visit-summary")?.textContent).toContain("Duration: 1 day");
  });
});
