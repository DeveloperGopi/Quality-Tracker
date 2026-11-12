/**
 * PART 1 — "Visit dates same as scheduled", mounted in happy-dom.
 *
 * This repository ships bun + happy-dom contract tests (no Playwright
 * project), so the browser scenarios are exercised at the DOM level: the
 * checkbox is ENABLED for a past scheduled start even when the scheduled end
 * is empty (the reported bug), disabled with a real reason otherwise, ticking
 * copies the dates immediately, and different recorded visit dates ask
 * Replace / Keep instead of overwriting.
 */
import { afterEach, describe, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost/facilities/f1" });

mock.module("sonner", () => ({ toast: Object.assign(() => {}, { success() {}, error() {}, info() {} }) }));

function defineGlobal(key: string, value: unknown) {
  try {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
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
  takeRecords() {
    return [];
  }
});
const extras = win as unknown as { matchMedia?: unknown };
if (typeof extras.matchMedia !== "function") {
  extras.matchMedia = (media: string) => ({
    matches: false,
    media,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
}
defineGlobal("matchMedia", extras.matchMedia);
defineGlobal("IS_REACT_ACT_ENVIRONMENT", true);

type ReactModule = typeof import("react");
let react: ReactModule | null = null;
let createRoot: typeof import("react-dom/client").createRoot | null = null;
let component: typeof import("../src/components/profile/ScheduleVisitFields") | null = null;

async function deps() {
  if (!react) react = await import("react");
  if (!createRoot) createRoot = (await import("react-dom/client")).createRoot;
  if (!component) component = await import("../src/components/profile/ScheduleVisitFields");
  return { react, createRoot: createRoot!, component: component! };
}

const mounted: (() => void)[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.();
});

async function mount(
  props: Record<string, unknown>,
): Promise<{ el: HTMLElement; rerender: (next: Record<string, unknown>) => Promise<void> }> {
  const { react: r, createRoot: cr, component: c } = await deps();
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = cr(container, {} as never);

  const view = (p: Record<string, unknown>) =>
    r.createElement(c.ScheduleVisitFields, {
      kind: "nqas",
      today: "2026-10-24",
      canEdit: true,
      scheduledStart: "",
      scheduledEnd: "",
      actualStart: "",
      actualEnd: "",
      sameAsScheduled: false,
      linkBroken: false,
      errors: {},
      history: () => [],
      onScheduledStartChange: () => {},
      onScheduledEndChange: () => {},
      onLinkChange: () => {},
      ...p,
    } as never);

  const render = async (p: Record<string, unknown>) => {
    await r.act(async () => {
      root.render(view(p) as never);
      await new Promise((res) => setTimeout(res, 5));
    });
  };
  await render(props);
  mounted.push(() => {
    try {
      r.act(() => root.unmount());
    } catch {
      /* gone */
    }
    container.remove();
  });
  return { el: container, rerender: render };
}

function byTestId(el: HTMLElement, id: string): HTMLElement | null {
  return el.querySelector<HTMLElement>(`[data-testid="${id}"]`);
}

async function click(el: HTMLElement) {
  const { react: r } = await deps();
  await r.act(async () => {
    el.click();
    await new Promise((res) => setTimeout(res, 5));
  });
}

describe("ScheduleVisitFields — the checkbox the user reported as disabled", () => {
  test("past scheduled start + EMPTY scheduled end ⇒ enabled (root-cause regression)", async () => {
    const { el } = await mount({
      scheduledStart: "2025-11-06",
      scheduledEnd: "",
      actualStart: "",
      actualEnd: "",
    });
    const box = byTestId(el, "nqas-same-as-scheduled") as HTMLInputElement | null;
    expect(box).not.toBeNull();
    expect(box!.disabled).toBe(false);
    expect(byTestId(el, "nqas-link-reason")).toBeNull();
  });

  test("ticking copies the schedule into the visit mini-row at once", async () => {
    let same = false;
    let actualStart = "";
    let actualEnd = "";
    const { react: r, component: c } = await deps();
    const container = win.document.createElement("div");
    win.document.body.appendChild(container);
    const root = (await deps()).createRoot(container, {} as never);

    function Harness() {
      const [state, setState] = r.useState({ same, actualStart, actualEnd });
      return r.createElement(c.ScheduleVisitFields, {
        kind: "nqas",
        today: "2026-10-24",
        canEdit: true,
        scheduledStart: "2025-11-06",
        scheduledEnd: "",
        actualStart: state.actualStart,
        actualEnd: state.actualEnd,
        sameAsScheduled: state.same,
        linkBroken: false,
        errors: {},
        history: () => [],
        onScheduledStartChange: () => {},
        onScheduledEndChange: () => {},
        onLinkChange: (on: boolean, dates?: { actualStartDate: string; actualEndDate: string }) =>
          setState({
            same: on,
            actualStart: dates?.actualStartDate ?? state.actualStart,
            actualEnd: dates?.actualEndDate ?? state.actualEnd,
          }),
      } as never);
    }

    await r.act(async () => {
      root.render(r.createElement(Harness) as never);
      await new Promise((res) => setTimeout(res, 5));
    });
    mounted.push(() => {
      try {
        r.act(() => root.unmount());
      } catch {
        /* gone */
      }
      container.remove();
    });

    const box = byTestId(container, "nqas-same-as-scheduled") as HTMLInputElement;
    await click(box);
    expect((byTestId(container, "nqas-same-as-scheduled") as HTMLInputElement).checked).toBe(true);
    expect(byTestId(container, "nqas-visit-summary")?.textContent).toContain("1 day");
    expect(byTestId(container, "nqas-visit-summary")?.textContent).toContain("→");
    same = actualStart = actualEnd = ""; // silence unused-write lint in older tsconfigs
  });

  test("a future scheduled start is disabled with the real reason", async () => {
    const { el } = await mount({ scheduledStart: "2026-11-06", scheduledEnd: "" });
    const box = byTestId(el, "nqas-same-as-scheduled") as HTMLInputElement;
    expect(box.disabled).toBe(true);
    expect(byTestId(el, "nqas-link-reason")?.textContent).toContain(
      "Scheduled date is in the future",
    );
  });

  test("an empty scheduled start says what to do first", async () => {
    const { el } = await mount({ scheduledStart: "" });
    const box = byTestId(el, "nqas-same-as-scheduled") as HTMLInputElement;
    expect(box.disabled).toBe(true);
    expect(byTestId(el, "nqas-link-reason")?.textContent).toContain(
      "Enter the scheduled start date first",
    );
  });

  test("different recorded visit dates ask Replace / Keep, never overwrite silently", async () => {
    const { el } = await mount({
      scheduledStart: "2025-11-06",
      actualStart: "2025-11-04",
      actualEnd: "2025-11-05",
    });
    await click(byTestId(el, "nqas-same-as-scheduled")!);
    expect(el.textContent).toContain("Replace the recorded visit dates with the scheduled dates?");
    // Keep leaves the recorded dates untouched and the box unticked.
    const keep = Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Keep");
    expect(keep).toBeTruthy();
    await click(keep!);
    expect(el.textContent).not.toContain("Replace the recorded visit dates with the scheduled dates?");
    expect((byTestId(el, "nqas-same-as-scheduled") as HTMLInputElement).checked).toBe(false);
    expect(byTestId(el, "nqas-visit-summary")?.textContent).toContain("04-Nov-2025");
  });
});
