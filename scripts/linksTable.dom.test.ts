/**
 * LINKS TABLE — the shared grid contract for /links.
 *
 * Pins that the sticky header and every body row read the SAME
 * `LINK_TABLE_COLUMNS` (header i = cell i), the fixed 56 px row, the three
 * frozen cells, the real `<a target="_blank" rel="noopener noreferrer">` link
 * chips and drag-to-reorder only for editors in sheet order.
 *
 * happy-dom has no layout engine, so the assertions use the model and inline
 * styles — exactly the inputs the browser's sticky/frozen layout consumes.
 */
import { describe, expect, test, afterEach } from "bun:test";
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost/" });

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
defineGlobal("CustomEvent", (win as unknown as { CustomEvent: typeof CustomEvent }).CustomEvent);
defineGlobal("MouseEvent", (win as unknown as { MouseEvent: typeof MouseEvent }).MouseEvent);
defineGlobal("KeyboardEvent", (win as unknown as { KeyboardEvent: typeof KeyboardEvent }).KeyboardEvent);
defineGlobal(
  "getComputedStyle",
  (win as unknown as { getComputedStyle?: (e: Element) => CSSStyleDeclaration }).getComputedStyle?.bind(win),
);
defineGlobal(
  "requestAnimationFrame",
  ((win as unknown as { requestAnimationFrame?: (cb: FrameRequestCallback) => number }).requestAnimationFrame ??
    ((cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number)),
);
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
defineGlobal(
  "ResizeObserver",
  typeof (win as unknown as { ResizeObserver?: unknown }).ResizeObserver === "function"
    ? (win as unknown as { ResizeObserver: unknown }).ResizeObserver
    : ResizeObserverStub,
);
(win.Element.prototype as unknown as Record<string, unknown>).getBoundingClientRect = function () {
  return { x: 0, y: 0, top: 0, left: 0, right: 1400, bottom: 700, width: 1400, height: 700, toJSON: () => ({}) };
};

type ReactElement = import("react").ReactElement;
let mounted: { unmount: () => void; container: HTMLElement }[] = [];

async function render(element: ReactElement) {
  const h = (await import("react")).createElement;
  const { createRoot } = await import("react-dom/client");
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = createRoot(container);
  root.render(element);
  await new Promise((resolve) => setTimeout(resolve, 20));
  mounted.push({ unmount: () => root.unmount(), container });
  return container;
}

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.unmount();
    entry.container.remove();
  }
});

const config = (await import("../src/lib/links")).normalizeLinksConfig({});
const columns = (await import("../src/lib/links")).LINK_TABLE_COLUMNS;

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-1",
    serial: 1,
    categoryId: "cat-1",
    categoryName: "Basic Data",
    categoryColour: "teal",
    title: "KPI Format",
    description: "District KPI sheet",
    frequency: "one-time",
    customDays: null,
    lastUpdated: "2026-05-20",
    nextDue: null,
    ownerId: null,
    ownerName: "Quality",
    level: null,
    status: "Active",
    remarks: "4th Quarter (2025-26)",
    tags: [],
    visibility: "everyone",
    pinned: false,
    sortOrder: 1,
    archivedAt: null,
    createdAt: 0,
    updatedAt: 0,
    urls: [
      {
        id: "url-1",
        label: "HWC HSC KPI",
        url: "https://example.org/kpi",
        type: "sheet",
        kind: "link",
        isPrimary: true,
        position: 0,
        lastCheck: null,
        checkStatus: null,
      },
    ],
    due: { state: "none", days: null, nextDue: null },
    ...overrides,
  };
}

async function mountTable(items: unknown[], extra: Record<string, unknown> = {}) {
  const { LinksTable } = await import("../src/components/links/LinksTable");
  const h = (await import("react")).createElement;
  return render(
    h(LinksTable, {
      items,
      config,
      today: "2026-11-02",
      canEdit: true,
      isAdmin: false,
      query: "",
      sortKey: null,
      sortDir: "asc",
      onSort: () => {},
      groupBy: false,
      collapsed: new Set<string>(),
      onToggleGroup: () => {},
      onOpen: () => {},
      onMark: () => {},
      onAction: () => {},
      onStatus: () => {},
      onPin: () => {},
      onReorder: () => {},
      ...extra,
    }),
  );
}

describe("Links table contract", () => {
  test("header cells and body cells are the SAME 12-column model", async () => {
    const container = await mountTable([makeItem(), makeItem({ id: "item-2", serial: 2, title: "SaQsham" })]);
    const headerCells = [...container.querySelectorAll("thead th")];
    const rows = [...container.querySelectorAll("tbody tr")];
    expect(headerCells).toHaveLength(columns.length);
    expect(headerCells.map((cell) => cell.textContent?.trim().replace(/\s+/g, " "))).toEqual(
      columns.map((column) => column.label),
    );
    for (const row of rows) {
      expect(row.querySelectorAll("td")).toHaveLength(columns.length);
      expect(row.className).toContain("h-14"); // fixed 56 px row
    }
  });

  test("the three frozen cells carry their sticky left offsets in header and body", async () => {
    const container = await mountTable([makeItem()]);
    const frozen = columns.filter((column) => column.frozen);
    expect(frozen.map((column) => column.key)).toEqual(["serial", "category", "title"]);
    const titleHeader = container.querySelector("thead th:nth-child(3)") as HTMLElement;
    expect(titleHeader.className).toContain("sticky");
    expect(titleHeader.style.left).toBe("12rem");
    const titleCell = container.querySelector("tbody tr td:nth-child(3)") as HTMLElement;
    expect(titleCell.className).toContain("sticky");
    expect(titleCell.style.left).toBe("12rem");
    const serialCell = container.querySelector("tbody tr td:nth-child(1)") as HTMLElement;
    expect(serialCell.className).toContain("sticky");
    expect(serialCell.className).toContain("left-0");
    const categoryCell = container.querySelector("tbody tr td:nth-child(2)") as HTMLElement;
    expect(categoryCell.style.left).toBe("3.25rem");
  });

  test("link chips are real anchors with noopener and the row title opens the primary link", async () => {
    const container = await mountTable([makeItem()]);
    const anchor = container.querySelector('a[href="https://example.org/kpi"]') as HTMLAnchorElement;
    expect(anchor).toBeTruthy();
    expect(anchor.target).toBe("_blank");
    expect(anchor.rel).toContain("noopener");
    expect(anchor.rel).toContain("noreferrer");
    const title = container.querySelector("tbody tr td:nth-child(3) a") as HTMLAnchorElement;
    expect(title.getAttribute("href")).toBe("https://example.org/kpi");
    expect(title.textContent).toContain("KPI Format");
  });

  test("group headers are sticky and carry counts; editors get the drag handle", async () => {
    const container = await mountTable([makeItem()], { groupBy: true });
    const groupRow = container.querySelector("tbody tr");
    expect(groupRow?.className).toContain("bg-");
    const groupCell = groupRow?.querySelector("td");
    expect(groupCell?.className).toContain("sticky");
    expect(groupCell?.textContent).toContain("Basic Data");
    expect(groupCell?.textContent).toContain("1");
    expect(container.querySelector('[aria-label="Drag to reorder"]')).toBeTruthy();
  });

  test("a viewer sees no drag handle and no status dropdown", async () => {
    const container = await mountTable([makeItem()], { canEdit: false });
    expect(container.querySelector('[aria-label="Drag to reorder"]')).toBeNull();
    expect(container.querySelector('[aria-label="Change status of KPI Format"]')).toBeNull();
    expect(container.textContent).toContain("Active");
  });
});
