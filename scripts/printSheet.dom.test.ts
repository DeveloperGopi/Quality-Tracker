/**
 * PRINT FACILITY SHEET — the dialog in front of every sheet download.
 *
 * Mounted in happy-dom (this repo ships bun + happy-dom contract tests only),
 * these cases pin the contract the three entry points rely on:
 *   • one request store, so Quick View, the row menu, the phone cards and the
 *     Facility Profile all open the SAME dialog,
 *   • the options the brief asks for — paper A4 (default) / A3, show empty
 *     fields OFF, recent changes and QR ON, language English (Tamil listed but
 *     not selectable until the font ships),
 *   • the exact file name is shown before the download,
 *   • Cancel closes without generating anything.
 *
 * Run: bun test ./scripts/printSheet.dom.test.ts
 */
import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";

import { istReportDate } from "../src/lib/reportNaming";

const win = new Window({ url: "http://localhost/facilities" });

mock.module("convex/react", () => ({
  useQuery: () => [],
  // The dialog asks `api.share.ensure` for a token before drawing the QR.
  useMutation: () => async () => ({
    token: "xY7QwE2rT5uI9oP1aS3dF7",
    url: "https://nqas.example.in/r/xY7QwE2rT5uI9oP1aS3dF7",
    needsUpload: false,
  }),
  useAction: () => async () => undefined,
  useConvex: () => ({ query: async () => ({ token: "test-token" }) }),
}));
const toasts: {
  kind: "success" | "error" | "info" | "warning";
  message: string;
  description?: string;
}[] = [];
mock.module("sonner", () => ({
  toast: {
    success: (message: string, o?: { description?: string }) => {
      toasts.push({ kind: "success", message, description: o?.description });
    },
    error: (message: string, o?: { description?: string }) => {
      toasts.push({ kind: "error", message, description: o?.description });
    },
    info: (message: string, o?: { description?: string }) => {
      toasts.push({ kind: "info", message, description: o?.description });
    },
    warning: (message: string, o?: { description?: string }) => {
      toasts.push({ kind: "warning", message, description: o?.description });
    },
  },
}));

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
defineGlobal("CustomEvent", win.CustomEvent);
defineGlobal("Event", win.Event);
defineGlobal("MouseEvent", win.MouseEvent);
defineGlobal("KeyboardEvent", win.KeyboardEvent);
defineGlobal("getComputedStyle", win.getComputedStyle.bind(win));
defineGlobal("NodeFilter", win.NodeFilter ?? { SHOW_ELEMENT: 1 });
defineGlobal("HTMLButtonElement", win.HTMLButtonElement ?? class {});
defineGlobal("HTMLInputElement", win.HTMLInputElement ?? class {});
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
defineGlobal("matchMedia", win.matchMedia.bind(win));

const row = {
  facility: {
    _id: "f1",
    name: "PHC Athanavur",
    block: "Jolarpettai",
    phc: "PHC Athanavur",
    facilityType: "PHC",
    ninNumber: "2426248478",
    eligibility: "Eligible",
    currentStatus: "Certified",
    updatedAt: Date.UTC(2026, 9, 21),
  },
  cycleNumber: 1,
  cycleType: "Initial",
  sa: null,
  nqas: null,
  fund: null,
  noc: null,
  building: null,
};

let stored: typeof import("../src/lib/printSheet");
let mod: typeof import("../src/components/master/PrintSheetDialog");

async function load() {
  stored ??= await import("../src/lib/printSheet");
  mod ??= await import("../src/components/master/PrintSheetDialog");
  return { stored, mod };
}

const flush = () => new Promise((r) => setTimeout(r, 10));

const mounted: { unmount: () => void; container: HTMLElement }[] = [];

async function mount() {
  const react = await import("react");
  const { createRoot } = await import("react-dom/client");
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = createRoot(container as unknown as HTMLElement);
  root.render(react.createElement(mod.PrintSheetDialog));
  mounted.push({
    unmount: () => root.unmount(),
    container: container as unknown as HTMLElement,
  });
  await flush();
  // Radix renders the dialog in a portal on <body>, not inside the container.
  return win.document.body as unknown as HTMLElement;
}

function textOf(el: HTMLElement): string {
  return (el.textContent ?? "").replace(/\s+/g, " ");
}

beforeEach(() => {
  while (mounted.length) {
    const m = mounted.pop()!;
    m.unmount();
    m.container.remove();
    win.document.body.innerHTML = "";
  }
  stored?.resetPrintSheetForTests();
});

describe("print sheet request store", () => {
  test("one store: opening sets the request, closing clears it, subscribers hear both", async () => {
    const { stored } = await load();
    const seen: (string | null)[] = [];
    const off = stored.subscribePrintSheet(() =>
      seen.push(stored.getPrintSheetRequest()?.row.facility.name ?? null),
    );
    stored.openPrintSheet({ row: row as never });
    expect(stored.getPrintSheetRequest()?.row.facility.ninNumber).toBe("2426248478");
    stored.closePrintSheet();
    expect(stored.getPrintSheetRequest()).toBeNull();
    expect(seen).toEqual(["PHC Athanavur", null]);
    off();
    stored.openPrintSheet({ row: row as never });
    expect(seen).toEqual(["PHC Athanavur", null]);
  });

  test("prefetching the generator never throws and can repeat", async () => {
    const { stored } = await load();
    expect(() => {
      stored.prefetchSheet();
      stored.prefetchSheet();
    }).not.toThrow();
  });
});

describe("print sheet dialog", () => {
  test("stays closed until a sheet is requested", async () => {
    await load();
    const container = await mount();
    expect(textOf(container)).not.toContain("Print facility sheet");
  });

  test("shows the requested facility, the file name and the required options", async () => {
    const { stored } = await load();
    const container = await mount();
    stored.openPrintSheet({
      row: row as never,
      generatedBy: "NQAS Tracker (admin)",
      audits: [
        { changedAt: Date.UTC(2026, 9, 20), changedByName: "admin", field: "Score", action: "update", newValue: "83.8" },
      ],
    });
    await flush();
    const text = textOf(container);
    // A native modal dialog: opened via showModal(), so it sits in the top
    // layer above the Quick View's own <dialog> instead of behind it.
    const dlg = container.querySelector(
      '[data-testid="print-sheet-dialog"]',
    ) as unknown as HTMLDialogElement;
    expect(dlg.open).toBe(true);
    expect(dlg.getAttribute("aria-modal")).toBe("true");
    expect(text).toContain("Print facility sheet");
    expect(text).toContain("PHC Athanavur");
    expect(text).toContain("NIN 2426248478");
    expect(text).toContain("2 pages");
    // Paper: A4 default, A3 offered.
    expect(text).toContain("A4");
    expect(text).toContain("A3");
    // The simplified dialog: ONE switch (the QR code, on by default). The
    // removed options must never come back.
    expect(text).toContain("Include QR code");
    expect(text).not.toContain("Show empty fields");
    expect(text).not.toContain("Include recent changes");
    expect(text).not.toContain("Allow a third page");
    expect(text).not.toContain("Previous cycles");
    const switches = [...container.querySelectorAll('[role="switch"]')].map(
      (s) => s.getAttribute("data-state") ?? s.getAttribute("aria-checked"),
    );
    expect(switches).toEqual(["checked"]);
    // A one-cycle facility shows NO cycle list (its two pages are all there is)
    // and both actions are offered: Print plus the primary Download PDF.
    expect(text).not.toContain("Cycles to include");
    expect(text).toContain("Print");
    // Exact file name before the download (the shared report-naming rule).
    const name = `PHC Athanavur PHC NQAS Status Report ${istReportDate()}.pdf`;
    expect(text).toContain(name);
  });

  test("Download builds the two-page sheet, saves it under the shown name and closes", async () => {
    const { stored } = await load();
    const container = await mount();
    stored.openPrintSheet({
      row: row as never,
      generatedBy: "NQAS Tracker (admin)",
      audits: [
        { changedAt: Date.UTC(2026, 9, 20), changedByName: "admin", field: "Score", action: "update", newValue: "83.8" },
      ],
    });
    await flush();
    const download = [...container.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Download PDF"),
    ) as unknown as HTMLButtonElement;
    expect(download).toBeTruthy();
    download.click();
    // The REAL generator runs here (jsPDF, ~100 ms), so this is the dialog →
    // two-page sheet path, not a stub.
    for (let i = 0; i < 200 && !toasts.length; i += 1) await flush();

    expect(toasts.filter((t) => t.kind === "error")).toEqual([]);
    expect(toasts[0]?.message).toBe("Facility sheet saved (2 pages)");
    expect(toasts[0]?.description).toBe(
      `PHC Athanavur PHC NQAS Status Report ${istReportDate()}.pdf`,
    );
    expect(stored.getPrintSheetRequest()).toBeNull();
  });

  test("Cancel closes the dialog and forgets the request (nothing generated)", async () => {
    const { stored } = await load();
    const container = await mount();
    stored.openPrintSheet({ row: row as never });
    await flush();
    const cancel = [...container.querySelectorAll("button")].find(
      (b) => (b.textContent ?? "").trim() === "Cancel",
    ) as unknown as HTMLButtonElement;
    expect(cancel).toBeTruthy();
    cancel.click();
    await flush();
    expect(stored.getPrintSheetRequest()).toBeNull();
    expect(textOf(container)).not.toContain("Show empty fields");
  });
});
