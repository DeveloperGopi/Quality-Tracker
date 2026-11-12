/**
 * DOCUMENT UPLOAD — the browser never talks to Google.
 *
 * Mounts the REAL `DocumentField` in happy-dom and drives the exact flow a
 * user performs for NQAS Result, SA Report, SA Checklist (Excel) and NOC:
 *
 *   • a small PDF, a PNG and a 20 MB file upload end to end;
 *   • every chunk is addressed to this app's backend (the injected
 *     `documents.*` actions) — `fetch` is spied and MUST stay uncalled, so a
 *     regression to a direct Google upload URL fails here;
 *   • the Drive-dependent wording: not connected, network failure, wrong type
 *     and too large each produce their own sentence, and "Failed to fetch"
 *     never reaches the user;
 *   • Retry re-runs the same file after a failure.
 *
 * The server side (session creation, streaming to Drive, verification) is
 * covered by scripts/drive.store.test.ts; a live Google account is not
 * available in this environment.
 *
 * Run: bun test ./scripts/documentUpload.dom.test.ts
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost/facilities/f1" });

/* ------------------------------------------------------------------ */
/* Backend actions (the ONE upload address)                            */
/* ------------------------------------------------------------------ */

type BeginArgs = {
  facilityId: string;
  docKey: string;
  cycleNo?: number;
  originalName: string;
  declaredMime: string;
  declaredSize: number;
  uploadKey: string;
};
type ChunkArgs = { uploadKey: string; offset: number; bytes: ArrayBuffer; final: boolean };

const calls: { kind: "begin" | "chunk" | "finalize" | "cancel"; args: unknown }[] = [];
type BeginResult = { uploadKey: string; received?: number; ref?: string };
let beginImpl: (args: BeginArgs) => Promise<BeginResult> = async (args) => ({
  uploadKey: args.uploadKey,
  received: 0,
  ref: "7K4M2Q",
});

type ChunkResult = { received: number; done: boolean };
let chunkImpl: (args: ChunkArgs) => Promise<ChunkResult> = async (args) => ({
  received: args.offset + args.bytes.byteLength,
  done: args.final,
});

function resetCalls() {
  calls.length = 0;
  beginImpl = async (args) => ({ uploadKey: args.uploadKey, received: 0, ref: "7K4M2Q" });
  chunkImpl = async (args) => ({
    received: args.offset + args.bytes.byteLength,
    done: args.final,
  });
}

function backend(args: Record<string, unknown>): Promise<unknown> {
  if ("facilityId" in args) {
    calls.push({ kind: "begin", args });
    return beginImpl(args as BeginArgs);
  }
  if ("bytes" in args) {
    calls.push({ kind: "chunk", args });
    return chunkImpl(args as unknown as ChunkArgs);
  }
  // finalize / cancel both take only `uploadKey`.
  calls.push({ kind: "finalize", args });
  return Promise.resolve({ documentId: "doc1", versionNo: 1 });
}

mock.module("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => async () => undefined,
  useAction: () => backend,
  useConvex: () => ({ query: async () => ({ token: "test-token" }) }),
}));

const toasts: { kind: string; message: string }[] = [];
mock.module("sonner", () => ({
  toast: {
    success: (message: string) => toasts.push({ kind: "success", message }),
    error: (message: string) => toasts.push({ kind: "error", message }),
  },
}));

/* ------------------------------------------------------------------ */
/* DOM globals                                                         */
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
defineGlobal("matchMedia", win.matchMedia.bind(win));
defineGlobal("IS_REACT_ACT_ENVIRONMENT", true);

/* ------------------------------------------------------------------ */
/* Mount helpers                                                       */
/* ------------------------------------------------------------------ */

let react: typeof import("react");
let createRoot: typeof import("react-dom/client").createRoot;
let DocumentFieldMod: typeof import("../src/components/documents/DocumentField");

async function deps() {
  react ??= await import("react");
  if (!createRoot) createRoot = (await import("react-dom/client")).createRoot;
  DocumentFieldMod ??= await import("../src/components/documents/DocumentField");
  return { react };
}

const mounted: { root: { unmount: () => void }; container: HTMLElement }[] = [];

afterEach(async () => {
  for (const m of mounted.splice(0)) {
    await react.act(async () => m.root.unmount());
    m.container.remove();
  }
});

async function flush(times = 4) {
  for (let i = 0; i < times; i += 1) {
    await react.act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
  }
}

/** A File shape the field needs; avoids depending on happy-dom's Blob impl. */
function fakeFile(name: string, type: string, size: number): File {
  const bytes = new Uint8Array(size);
  bytes.set(new TextEncoder().encode("%PDF-1.7\n"));
  return {
    name,
    type,
    size,
    lastModified: 1,
    arrayBuffer: async () => bytes.buffer.slice(0),
  } as unknown as File;
}

async function mountField(props: { docKey: string; canEdit?: boolean; onChanged?: () => void }) {
  await deps();
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = createRoot(container);
  const element = react.createElement(DocumentFieldMod.DocumentField, {
    facilityId: "f1",
    docKey: props.docKey,
    doc: undefined,
    cycleNo: 1,
    canEdit: props.canEdit ?? true,
    onChanged: props.onChanged,
  } as never);
  await react.act(async () => root.render(element));
  mounted.push({ root, container });
  return container;
}

async function dropFile(container: HTMLElement, file: File) {
  const zone = container.querySelector('[data-testid="file-dropzone"]') as HTMLElement | null;
  if (!zone) throw new Error("no dropzone rendered");
  const event = new win.Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: { files: [file] } });
  await react.act(async () => {
    zone.dispatchEvent(event);
  });
  await flush();
}

/** Any real network call would show up here; there must never be one. */
let fetchCalls: string[] = [];
const realFetch = globalThis.fetch;
beforeEach(() => {
  resetCalls();
  toasts.length = 0;
  fetchCalls = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    fetchCalls.push(String(input));
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

/* ------------------------------------------------------------------ */
/* 1. Every document type uploads through the backend                  */
/* ------------------------------------------------------------------ */

const CASES = [
  { docKey: "NQAS_Result", name: "nqas-result.pdf", mime: "application/pdf", accept: ".pdf,.png,.jpg" },
  { docKey: "SA_Report", name: "sa-report.pdf", mime: "application/pdf", accept: ".pdf" },
  {
    docKey: "SA_Checklist",
    name: "sa-checklist.xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    accept: ".xlsx,.xls",
  },
  { docKey: "NOC", name: "fire-noc.png", mime: "image/png", accept: ".pdf,.png,.jpg" },
];

describe("uploads go to this app's backend only", () => {
  for (const c of CASES) {
    test(`${c.docKey}: ${c.name} is chunked through the backend, never to Google`, async () => {
      const size = 2_048;
      let changed = 0;
      const container = await mountField({ docKey: c.docKey, onChanged: () => (changed += 1) });

      const input = container.querySelector('[data-testid="file-input"]') as HTMLInputElement;
      expect(input.getAttribute("accept")).toBe(c.accept);

      await dropFile(container, fakeFile(c.name, c.mime, size));

      const begin = calls.find((x) => x.kind === "begin")!;
      expect((begin.args as BeginArgs).docKey).toBe(c.docKey);
      expect((begin.args as BeginArgs).declaredMime).toBe(c.mime);
      expect((begin.args as BeginArgs).declaredSize).toBe(size);

      const chunks = calls.filter((x) => x.kind === "chunk").map((x) => x.args as ChunkArgs);
      expect(chunks.length).toBe(1);
      expect(chunks[0].bytes.byteLength).toBe(size);
      expect(calls.some((x) => x.kind === "finalize")).toBe(true);

      // No request left the app: no Google upload URL, no CORS problem.
      expect(fetchCalls).toEqual([]);
      expect(container.textContent).toContain("Recently updated");
      expect(changed).toBe(1);
      expect(toasts.some((t) => t.kind === "success")).toBe(true);
    });
  }

  test("a 20 MB NQAS Result travels in 4 MB backend chunks", async () => {
    const size = 20 * 1024 * 1024;
    const container = await mountField({ docKey: "NQAS_Result" });
    await dropFile(container, fakeFile("big-scan.pdf", "application/pdf", size));

    const chunks = calls.filter((x) => x.kind === "chunk").map((x) => x.args as ChunkArgs);
    expect(chunks.map((c) => c.offset)).toEqual([0, 4, 8, 12, 16].map((mb) => mb * 1024 * 1024));
    expect(chunks.reduce((sum, c) => sum + c.bytes.byteLength, 0)).toBe(size);
    expect(fetchCalls).toEqual([]);
    expect(container.textContent).toContain("Recently updated");
  });
});

/* ------------------------------------------------------------------ */
/* 2. Specific messages instead of "Failed to fetch"                   */
/* ------------------------------------------------------------------ */

describe("upload failures say what went wrong", () => {
  test("storage not connected shows the administrator message and Retry works", async () => {
    beginImpl = async () => {
      throw new Error("Document storage is not connected: ask the administrator");
    };
    const container = await mountField({ docKey: "NQAS_Result" });
    await dropFile(container, fakeFile("result.pdf", "application/pdf", 1_024));

    expect(container.textContent).toContain("Document storage is not connected: ask the administrator");
    expect(calls.filter((x) => x.kind === "chunk").length).toBe(0);

    // Retry — the administrator connected Drive in the meantime.
    beginImpl = async (args) => ({ uploadKey: args.uploadKey, received: 0, ref: "7K4M2Q" });
    const retry = [...container.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Retry"),
    ) as HTMLButtonElement;
    expect(retry).toBeDefined();
    await react.act(async () => retry.click());
    await flush();

    expect(calls.filter((x) => x.kind === "begin").length).toBe(2);
    expect(calls.some((x) => x.kind === "chunk")).toBe(true);
    expect(container.textContent).toContain("Recently updated");
  });

  test("a failure names the step and quotes the reference code", async () => {
    // Drive answers "session expired" for the second chunk — a definitive
    // answer, so it is shown at once (no five silent retries).
    let chunks = 0;
    chunkImpl = async (args) => {
      if (++chunks === 2) throw new Error("The upload session expired — choose the file again (ref 7K4M2Q)");
      return { received: args.offset + args.bytes.byteLength, done: args.final };
    };
    const container = await mountField({ docKey: "NQAS_Result" });
    await dropFile(container, fakeFile("big.pdf", "application/pdf", 6 * 1024 * 1024));

    expect(container.textContent).toContain("The upload session expired");
    expect(container.textContent).toContain("ref 7K4M2Q");
    expect(container.textContent).not.toContain("Failed to fetch");
    expect(chunks).toBe(2);
  });

  test("a Retry resumes from the last byte the backend holds", async () => {
    beginImpl = async (args) => ({
      uploadKey: args.uploadKey,
      received: 4 * 1024 * 1024,
      ref: "7K4M2Q",
    });
    const container = await mountField({ docKey: "NQAS_Result" });
    await dropFile(container, fakeFile("big.pdf", "application/pdf", 10 * 1024 * 1024));

    const chunks = calls.filter((x) => x.kind === "chunk").map((x) => x.args as ChunkArgs);
    expect(chunks.map((c) => c.offset)).toEqual([4 * 1024 * 1024, 8 * 1024 * 1024]);
    expect(chunks.reduce((sum, c) => sum + c.bytes.byteLength, 0)).toBe(6 * 1024 * 1024);
    expect(container.textContent).toContain("Recently updated");
  });

  test("a network failure never shows the raw 'Failed to fetch'", async () => {
    beginImpl = async () => {
      throw new TypeError("Failed to fetch");
    };
    const container = await mountField({ docKey: "SA_Report" });
    await dropFile(container, fakeFile("sa-report.pdf", "application/pdf", 1_024));

    expect(container.textContent).toContain("Could not reach the server");
    expect(container.textContent).not.toContain("Failed to fetch");
  });

  test("a wrong file type is rejected before any upload starts", async () => {
    const container = await mountField({ docKey: "NQAS_Result" });
    await dropFile(container, fakeFile("notes.txt", "text/plain", 100));

    expect(container.textContent).toContain("NQAS Result must be a PDF or an image (PNG/JPG)");
    expect(calls.length).toBe(0);
  });

  test("an oversized file names the limit and does not upload", async () => {
    const container = await mountField({ docKey: "NQAS_Result" });
    await dropFile(container, fakeFile("huge.pdf", "application/pdf", 30 * 1024 * 1024));

    expect(container.textContent).toContain("File is 30 MB; limit is 25 MB");
    expect(calls.length).toBe(0);
  });

  test("the Excel checklist only accepts Excel", async () => {
    const container = await mountField({ docKey: "SA_Checklist" });
    await dropFile(container, fakeFile("checklist.pdf", "application/pdf", 100));

    expect(container.textContent).toContain("SA Checklist must be an Excel file (.xlsx or .xls)");
    expect(calls.length).toBe(0);
  });
});
