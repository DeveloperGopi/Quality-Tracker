/**
 * PART 2 — ONE upload control + the "File as" panel, mounted in happy-dom.
 *
 * The reported flow: drop a PDF, an XLSX and a PNG together. Three rows must
 * appear in the File-as panel, the Excel file may only be the SA Checklist,
 * the names pre-select (and mark) the suggested type, and NOTHING uploads
 * before the user confirms — no per-document upload button starts a file.
 *
 * The tray (`DocumentsCard`) no longer owns a section: the drop box, warning
 * banner, "Not uploaded" chip row and uploaded status rows left with the
 * removed Documents section. Their replacements — the six tiles, the one drop
 * target and the badge/Replace detail — live on `DocumentStatusCard`, so the
 * state tests below mount THAT card (which hosts the same tray inside).
 */
import { afterEach, describe, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost/facilities/f1" });

const backendCalls: { kind: string; args: unknown }[] = [];

mock.module("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useQuery: (_fn: unknown, args: unknown) =>
    args && typeof args === "object" && "facilityId" in (args as object)
      ? docPayload
      : { appRole: "admin", name: "Test Admin" },
  useMutation: () => async () => undefined,
  useAction: () => async (args: Record<string, unknown>) => {
    if ("facilityId" in args) {
      backendCalls.push({ kind: "begin", args });
      return { uploadKey: String(args.uploadKey), received: 0 };
    }
    if ("bytes" in args) {
      backendCalls.push({ kind: "chunk", args });
      return {
        received: (args.offset as number) + (args.bytes as ArrayBuffer).byteLength,
        done: true,
      };
    }
    backendCalls.push({ kind: "finalize", args });
    return { documentId: "doc-1" };
  },
  useConvex: () => ({ query: async () => ({ token: "t" }) }),
}));
mock.module("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useAuthActions: () => ({ signIn: async () => {}, signOut: async () => {} }),
}));
mock.module("sonner", () => ({
  toast: Object.assign(() => {}, { success() {}, error() {}, info() {} }),
}));

import { COUNTED_DOC_KEYS, DOCUMENT_SHORT_LABEL } from "../src/lib/documentsConfig";
import { getUploadState, resolveDriveSettings } from "../src/lib/driveSettings";

const docPayload = {
  documents: COUNTED_DOC_KEYS.map((key) => ({
    key,
    label: DOCUMENT_SHORT_LABEL[key] ?? key,
    requirement: { required: false, blocking: false, badge: "Optional", reason: null },
    current: null,
    versions: [],
  })),
  countedKeys: COUNTED_DOC_KEYS,
  uploadedCount: 0,
  requiredMissing: [],
  blockingMissing: [],
  missingCount: 0,
  storageConnected: true,
  cycleNo: 1,
};

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
let card: typeof import("../src/components/profile/DocumentsCard") | null = null;
let status: typeof import("../src/components/documents/DocumentStatusCard") | null = null;
let Router: typeof import("react-router").MemoryRouter | null = null;

async function deps() {
  if (!react) react = await import("react");
  if (!createRoot) createRoot = (await import("react-dom/client")).createRoot;
  if (!card) card = await import("../src/components/profile/DocumentsCard");
  if (!status) status = await import("../src/components/documents/DocumentStatusCard");
  if (!Router) Router = (await import("react-router")).MemoryRouter;
  return { react: react!, createRoot: createRoot!, card: card!, status: status!, Router: Router! };
}

const mounted: (() => void)[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.();
  backendCalls.length = 0;
});

async function mountCard(): Promise<HTMLElement> {
  const { react: r, createRoot: cr, card: c, Router: R } = await deps();
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = cr(container, {} as never);
  await r.act(async () => {
    root.render(
      r.createElement(
        R,
        { initialEntries: ["/facilities/f1"] },
        r.createElement(c.DocumentsCard, {
          facilityId: "f1",
          canEdit: true,
          showHeader: true,
        }),
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

/** Mount the Document status card — the ONE Documents surface: six tiles,
 *  one drop target, and the "File as" tray hosted inside it. */
async function mountStatusCard(canEdit = true): Promise<HTMLElement> {
  const { react: r, createRoot: cr, status: s, Router: R } = await deps();
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = cr(container, {} as never);
  await r.act(async () => {
    root.render(
      r.createElement(
        R,
        { initialEntries: ["/facilities/f1"] },
        r.createElement(s.DocumentStatusCard, {
          facilityId: "f1",
          canEdit,
        }) as never,
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

const file = (name: string, body = "x") =>
  new win.File([body], name) as unknown as File;

async function dropFiles(el: HTMLElement, files: File[]) {
  const { react: r } = await deps();
  const input = el.querySelector<HTMLInputElement>('[data-testid="documents-file-input"]');
  if (!input) throw new Error("the drop zone input is missing");
  Object.defineProperty(input, "files", { value: files, configurable: true });
  await r.act(async () => {
    input.dispatchEvent(new win.Event("change", { bubbles: true }) as unknown as Event);
    await new Promise((res) => setTimeout(res, 10));
  });
}

describe("DocumentsCard — one drop control, File as panel", () => {
  test("a PDF, an XLSX and a PNG make three rows; nothing uploads yet", async () => {
    const el = await mountCard();
    await dropFiles(el, [
      file("nqas certified result.pdf"),
      file("checklist.xlsx"),
      file("fire noc.png"),
    ]);

    const rows = el.querySelectorAll('[data-testid="documents-choice"]');
    expect(rows.length).toBe(3);
    expect(backendCalls.length).toBe(0);
    expect(el.textContent).toContain("File as");
  });

  test("the Excel file can only be the SA Checklist", async () => {
    const el = await mountCard();
    await dropFiles(el, [file("checklist.xlsx")]);
    const row = el.querySelector('[data-testid="documents-choice"]')!;
    const chips = Array.from(row.querySelectorAll("button")).filter((b) =>
      (b.getAttribute("aria-pressed") ?? "") !== "",
    );
    const enabled = chips.filter((b) => !(b as HTMLButtonElement).disabled);
    expect(enabled.map((b) => b.textContent?.trim())).toEqual(["SA Checklist"]);
    expect((row.textContent ?? "").includes("Suggested")).toBe(true);
  });

  test("a confident name pre-selects the type and marks it Suggested", async () => {
    const el = await mountCard();
    await dropFiles(el, [file("nqas certified result.pdf")]);
    const row = el.querySelector('[data-testid="documents-choice"]')!;
    const pressed = Array.from(row.querySelectorAll("button")).filter(
      (b) => b.getAttribute("aria-pressed") === "true",
    );
    expect(pressed.map((b) => b.textContent?.trim())).toEqual(["NQAS Result"]);
    expect((row.textContent ?? "").includes("Suggested")).toBe(true);
  });

  test("no per-document upload control exists — one drop target, no Add buttons", async () => {
    const el = await mountStatusCard();
    // Exactly ONE upload control: the tray's three hidden pickers (multi,
    // row-targeted, camera), driven by the card's single drop target — never
    // a per-document drop box or button.
    expect(el.querySelectorAll('input[type="file"]').length).toBe(3);
    expect(el.querySelectorAll('input[type="file"][multiple]').length).toBe(1);
    expect(el.querySelectorAll('[data-testid="document-status-card"]').length).toBe(1);
    expect(el.querySelectorAll('[data-testid="file-dropzone"]').length).toBe(0);
    expect(el.querySelectorAll('[data-testid^="document-add-"]').length).toBe(0);
    // Replace exists only inside an OPEN tile detail — closed by default.
    expect(el.querySelectorAll('[data-testid^="document-replace-"]').length).toBe(0);
    // Nothing pending: no in-flight rows mount at all.
    expect(el.querySelectorAll('[data-testid^="document-field-"]').length).toBe(0);
    // REGRESSION (§1.2): the status list used to render one empty <li> per
    // counted document (4 px padding + a divider = the striped blank rows).
    // With zero uploads the list holds no items at all.
    const list = el.querySelector('[data-testid="documents-dropzone"]');
    expect(list?.querySelectorAll("li").length ?? 0).toBe(0);
    // The six tiles carry the state now; the removed section's "Not uploaded:"
    // chip row and its per-document chips are gone.
    for (const key of COUNTED_DOC_KEYS) {
      expect(el.querySelector(`[data-testid="document-tile-${key}"]`)).toBeTruthy();
    }
    expect(el.querySelectorAll('[data-testid^="document-missing-"]').length).toBe(0);
    expect(el.textContent).toContain("Not uploaded");
    expect(el.textContent).not.toContain("Not uploaded:");
  });

  test("a tile with no file preselects its type for the next file", async () => {
    const el = await mountStatusCard();
    const tile = el.querySelector<HTMLButtonElement>('[data-testid="document-tile-Gap_Closure"]')!;
    expect(tile.textContent).toContain("Gap Closure Proceeding");
    await deps();
    await react!.act(async () => {
      tile.click();
      await new Promise((res) => setTimeout(res, 10));
    });
    const hint = el.querySelector('[data-testid="documents-next-type"]');
    expect(hint?.textContent ?? "").toContain("Gap Closure Proceeding");
    expect(backendCalls.length).toBe(0);
  });

  test("one file uploads on one tap once its type is chosen", async () => {
    const el = await mountCard();
    await dropFiles(el, [file("gap proceeding.pdf")]);
    const row = el.querySelector('[data-testid="documents-choice"]')!;
    // No second button for a single file.
    expect(el.querySelector('[data-testid="documents-upload-all"]')).toBeNull();
    const chip = Array.from(row.querySelectorAll("button")).find(
      (b) => (b.textContent ?? "").trim() === "Gap Closure Proceeding",
    ) as HTMLButtonElement;
    await deps();
    await react!.act(async () => {
      chip.click();
      await new Promise((res) => setTimeout(res, 20));
    });
    expect(backendCalls.some((c) => c.kind === "begin")).toBe(true);
    expect(backendCalls.some((c) => c.kind === "chunk")).toBe(true);
  });

  test("an uploaded tile has ONE requirement badge and a Replace action", async () => {
    const docs = docPayload.documents as unknown as Array<Record<string, unknown>>;
    const idx = COUNTED_DOC_KEYS.indexOf("NQAS_Result");
    docs[idx].current = {
      id: "d1",
      originalName: "nqas-result.pdf",
      size: 2048,
      versionNo: 1,
      uploadedAt: Date.parse("2026-10-12T00:00:00Z"),
    };
    docs[idx].requirement = {
      required: true,
      blocking: true,
      badge: "Required: certified",
      reason: "Required because certification status is certified or conditional.",
    };
    (docPayload as { uploadedCount: number }).uploadedCount = 1;
    try {
      const el = await mountStatusCard();
      const tile = el.querySelector('[data-testid="document-tile-NQAS_Result"]')!;
      const badges = tile.querySelectorAll('[data-testid="document-tile-badge"]');
      expect(badges.length).toBe(1);
      expect(badges[0].textContent?.trim()).toBe("Required: certified");
      // Uploaded: no "Not uploaded" state on the tile, no per-document Add.
      expect(tile.textContent).not.toContain("Not uploaded");
      expect(tile.textContent).toContain("Uploaded");
      expect(el.querySelectorAll('[data-testid^="document-add-"]').length).toBe(0);
      // Open the tile detail and press Replace → the ONE tray preselects it.
      await deps();
      await react!.act(async () => {
        (tile as HTMLButtonElement).click();
        await new Promise((res) => setTimeout(res, 10));
      });
      const detail = el.querySelector('[data-testid="document-tile-detail"]');
      expect(detail).toBeTruthy();
      const replace = detail!.querySelector<HTMLButtonElement>(
        '[data-testid="document-replace-NQAS_Result"]',
      )!;
      expect(replace).toBeTruthy();
      await react!.act(async () => {
        replace.click();
        await new Promise((res) => setTimeout(res, 10));
      });
      expect(el.querySelector('[data-testid="documents-next-type"]')?.textContent).toContain(
        "NQAS Result",
      );
      // The uploaded document is never listed as missing.
      expect(el.querySelector('[data-testid="document-missing-NQAS_Result"]')).toBeNull();
      expect(tile.textContent).toContain("Uploaded");
    } finally {
      docs[idx].current = null;
      docs[idx].requirement = { required: false, blocking: false, badge: "Optional", reason: null };
      (docPayload as { uploadedCount: number }).uploadedCount = 0;
    }
  });

  test("the chosen type shows ITS limit, not the largest one", async () => {
    const el = await mountCard();
    await dropFiles(el, [file("checklist.xlsx")]);
    expect(el.textContent).toContain("SA Checklist: up to 25 MB");
  });

  test("rows without a type wait; the primary button counts only ready rows", async () => {
    const el = await mountCard();
    await dropFiles(el, [file("notes.pdf"), file("checklist.xlsx")]);
    // "notes.pdf" is ambiguous: every PDF type accepts it, no name hint.
    const rows = Array.from(el.querySelectorAll('[data-testid="documents-choice"]'));
    const ambiguous = rows.find((row) => (row.textContent ?? "").includes("notes.pdf"))!;
    expect(ambiguous.textContent).toContain("waits until you choose its document type");
    const upload = el.querySelector<HTMLButtonElement>('[data-testid="documents-upload-all"]')!;
    expect(upload.textContent).toContain("Upload 1 file");
  });

  test("a paused uploader and the card agree, and an admin gets Resume", async () => {
    const payload = docPayload as unknown as { upload?: unknown };
    payload.upload = getUploadState({
      settings: resolveDriveSettings({
        paused: true,
        pausedAt: Date.parse("2026-10-24T00:00:00Z"),
        pausedBy: "State Admin",
        pauseReason: "reconnecting the department Drive",
      }),
      connected: true,
    });
    try {
      const el = await mountStatusCard();
      expect(el.querySelector('[data-testid="document-storage-chip"]')?.textContent).toContain(
        "Uploads paused",
      );
      const blocked = el.querySelector('[data-testid="document-upload-blocked"]');
      expect(blocked?.textContent).toContain("Uploads are paused by the administrator");
      expect(blocked?.textContent).toContain("State Admin");
      expect(blocked?.textContent).toContain("reconnecting the department Drive");
      expect(blocked?.textContent).toContain("up to 24 hours");
      expect(el.querySelector('[data-testid="document-resume-uploads"]')).toBeTruthy();
    } finally {
      delete payload.upload;
    }
  });

  test("a Viewer sees the card and all six tiles, but no upload action anywhere", async () => {
    const el = await mountStatusCard(false);

    // Read-only: the six tiles, the badges and the summary are all there…
    for (const key of COUNTED_DOC_KEYS) {
      expect(el.querySelector(`[data-testid="document-tile-${key}"]`)).toBeTruthy();
    }
    expect(el.querySelector('[data-testid="document-status-summary"]')).toBeTruthy();

    // …but nothing on the card can start an upload.
    expect(el.querySelector('[data-testid="document-status-upload"]')).toBeNull();
    expect(el.querySelector('[data-testid="documents-upload-all"]')).toBeNull();
    expect(el.querySelector('[data-testid="document-resume-uploads"]')).toBeNull();
    expect(el.textContent).not.toContain("Upload files");
    expect(el.textContent).not.toContain("Drop files anywhere");
    expect(el.textContent).toContain("View only");

    // Opening a not-yet-uploaded tile explains the state instead of offering
    // the "Upload now" an editor would get.
    const { react: r } = await deps();
    const tile = el.querySelector<HTMLButtonElement>('[data-testid="document-tile-SA_Report"]')!;
    await r.act(async () => {
      tile.click();
      await new Promise((res) => setTimeout(res, 10));
    });
    expect(el.textContent).toContain("View only");
    expect(el.textContent).not.toContain("Upload now");
  });

  test("a paused file stays typed in ONE tray row — no failed row, no upload", async () => {
    const payload = docPayload as unknown as { upload?: unknown };
    payload.upload = getUploadState({
      settings: resolveDriveSettings({ paused: true, pausedBy: "State Admin" }),
      connected: true,
    });
    try {
      const el = await mountStatusCard();
      await dropFiles(el, [file("gap proceeding.pdf")]);
      const row = el.querySelector('[data-testid="documents-choice"]')!;
      const chip = Array.from(row.querySelectorAll("button")).find(
        (b) => (b.textContent ?? "").trim() === "Gap Closure Proceeding",
      ) as HTMLButtonElement;
      await deps();
      await react!.act(async () => {
        chip.click();
        await new Promise((res) => setTimeout(res, 20));
      });

      // ONE row, still typed and waiting — never a failed row and never a
      // second "Not uploaded" entry beside the tile.
      expect(el.querySelectorAll('[data-testid="documents-choice"]').length).toBe(1);
      expect(el.querySelectorAll('[data-testid^="document-field-"]').length).toBe(0);
      expect(el.textContent).toContain("uploads are paused");
      expect(el.textContent).toContain("kept for up to 24 hours");
      expect(backendCalls.length).toBe(0);
    } finally {
      delete payload.upload;
    }
  });
});
