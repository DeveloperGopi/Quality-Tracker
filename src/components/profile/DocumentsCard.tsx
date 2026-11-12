/**
 * THE "File as" TRAY — the ONE uploader in the app (task 3.2).
 *
 * This component no longer owns a section: no heading, no drop zone box, no
 * warning banner, no "Not uploaded" chips and no footnote — those all lived
 * in the removed Documents section and would now duplicate the Document
 * status card. What is left is exactly the upload machinery:
 *
 *   • hidden pickers (multi, typed, camera) the card's "Upload files" button,
 *     tiles and drop target drive through `DocumentsCardApi`;
 *   • "File as" — a mixed drop (up to 10 files) lists each file in one row
 *     with a document-type chip row; a single file uploads on one tap;
 *   • the in-flight / failed status rows (progress, one error + Retry/Remove);
 *   • ONE upload gate: `getUploadState` — while uploads are paused the files
 *     stay in the tray and go the moment uploads resume, instead of failing
 *     into a stuck red row.
 *
 * Files stay private: every byte lives in Google Drive behind the FileStore,
 * and only metadata plus short-lived read tokens reach the browser.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Check,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  X,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { DocumentField, type DocumentMeta } from "@/components/documents/DocumentField";
import {
  DEFAULT_DRIVE_SETTINGS,
  getUploadState,
  type UploadState,
} from "@/lib/driveSettings";
import {
  COUNTED_DOC_KEYS,
  DOCUMENT_FIELDS,
  DOCUMENT_SHORT_LABEL,
  classifyDroppedFile,
  formatFileSize,
  validateDocumentFile,
} from "@/lib/documentsConfig";
import type { DocKey } from "@/convex/storage/validation";
import {
  TRAY_TTL_MS,
  listTrayFiles,
  newTrayId,
  putTrayFile,
  removeTrayFile,
  trayFileAsFile,
} from "@/lib/documentTray";

/** Up to ten mixed files in one drop. */
const MAX_BATCH = 10;

/** The chooser order from the brief: NQAS Result first, Fire NOC last. */
const CHIP_ORDER: DocKey[] = [
  "NQAS_Result",
  "SA_Report",
  "SA_Checklist",
  "Gap_Closure",
  "Condemned",
  "NOC",
];

function chipLabel(key: DocKey): string {
  return DOCUMENT_SHORT_LABEL[key] ?? key;
}

/** One small icon per chooser chip, so the six types scan at a glance. */
function chipIcon(key: DocKey) {
  if (key === "SA_Checklist") return FileSpreadsheet;
  if (key === "SA_Report") return FileText;
  return ImageIcon;
}

/** One file waiting in the "File as" panel. */
type PendingChoice = {
  id: number;
  file: File;
  /** Types whose real-file rules accept this file (chips enabled). */
  candidates: DocKey[];
  /** The confident name/extension hint — pre-selected, changeable. */
  suggested: DocKey | null;
  /** The current choice (null = the upload waits for a type). */
  chosen: DocKey | null;
  /** Set when the file cannot be uploaded at all (bad extension). */
  reason?: string;
  /** IndexedDB + `documentTray` id — kept across a reload for 24 hours. */
  trayId?: string;
  /** The original clock; a re-pick never extends it. */
  addedAt?: number;
  expiresAt?: number;
};

/** The imperative surface the Document status card uses to feed THIS ONE
 *  uploader — its tiles, "Upload files" button and drop target call in here,
 *  so there is exactly one drop control and one "File as" tray in the app. */
export type DocumentsCardApi = {
  /** Open the tray for these files (a drop on the card). */
  addFiles: (files: File[], docKey?: DocKey | null) => void;
  /** Preselect the type for the next file and open the picker. */
  preselect: (docKey: DocKey) => void;
  /** Open the picker with no type fixed ("Upload files"). */
  pick: () => void;
};

export function DocumentsCard({
  facilityId,
  canEdit,
  onChanged,
  className,
  preselectKey = null,
  pendingFiles = null,
  apiRef,
}: {
  facilityId: string;
  canEdit: boolean;
  onChanged?: () => void;
  className?: string;
  /** A type requested from another surface ("Upload now" on a tile): the next
   *  file is filed as this, shown as the short note under the drop zone. */
  preselectKey?: DocKey | null;
  /** A batch dropped on another surface (the Overview card) — handed to the
   *  SAME "File as" tray. The token prevents replaying the same drop. */
  pendingFiles?: { files: File[]; token: number } | null;
  /** Filled with the imperative API above (never a second uploader). */
  apiRef?: { current: DocumentsCardApi | null };
}) {
  const data = useQuery(api.documents.listForFacility, { facilityId: facilityId as never });
  /** The server-side mirror of the device tray — metadata only, never bytes. */
  const queueTrayItem = useMutation(api.documents.queueTrayItem);
  const removeTrayItem = useMutation(api.documents.removeTrayItem);

  // Hooks first, unconditionally: this one used to sit below the `!data`
  // early return, so the loading render called one hook fewer than the
  // loaded render ("Rendered more hooks than during the previous render").
  const [choices, setChoices] = useState<PendingChoice[]>([]);
  const [incoming, setIncoming] = useState<Record<string, { file: File; token: number }>>({});
  const [optimistic, setOptimistic] = useState<Record<string, true>>({});
  /** Rows whose last upload failed — kept mounted so the error and Retry stay
   *  visible even when the document has no stored file yet. */
  const [failed, setFailed] = useState<Record<string, true>>({});
  const [announce, setAnnounce] = useState("");
  /** Calm info line (the identical-current-file case) — never an error. */
  const [notice, setNotice] = useState<string | null>(null);
  /** The document type preselected for the next chosen file (a missing-row
   *  chip or a Replace action), shown as a short note under the drop zone. */
  const [fixedType, setFixedType] = useState<DocKey | null>(preselectKey ?? null);
  const fixedTypeRef = useRef<DocKey | null>(preselectKey ?? null);
  /* React's "adjust state when a prop changes" pattern: a type requested from
   * another surface (a tile's "Upload now") is shown immediately, including
   * when this panel was already mounted. No setState-in-effect, no cascade. */
  const [lastPreselect, setLastPreselect] = useState<DocKey | null>(preselectKey ?? null);
  if (preselectKey && preselectKey !== lastPreselect) {
    setLastPreselect(preselectKey);
    setFixedType(preselectKey);
  }
  /* The ref exists so a drop/pick event sees the type synchronously; it is
   * written from an effect (never during render). */
  useEffect(() => {
    fixedTypeRef.current = fixedType;
  }, [fixedType]);
  /* ------------------------------------------------------------------ */
  /* ONE upload gate (task 1.2) — the same `getUploadState` the server's
     beginUpload rejection, the Storage chip, the card and Admin → Google
     Drive read: one row, one decision, no contradictions. */
  /* ------------------------------------------------------------------ */
  const uploadState: UploadState = data
    ? (data.upload ??
      getUploadState({
        settings: DEFAULT_DRIVE_SETTINGS,
        connected: data.storageConnected !== false,
      }))
    : getUploadState({ settings: DEFAULT_DRIVE_SETTINGS, connected: true });

  const fileInput = useRef<HTMLInputElement | null>(null);
  const typedInput = useRef<HTMLInputElement | null>(null);
  const cameraInput = useRef<HTMLInputElement | null>(null);
  const dropzoneRef = useRef<HTMLDivElement | null>(null);
  const tokenRef = useRef(0);
  const idRef = useRef(0);
  const panelActive = useRef<Set<string>>(new Set());
  const waiting = useRef<{ docKey: DocKey; file: File; trayId?: string }[]>([]);
  /** The tray id that owns each in-flight row, so success removes it. */
  const pendingTray = useRef<Map<string, string>>(new Map());

  /** The server row is a mirror, not the source of truth for the bytes: a
   *  failed mutation never loses the file held on this device. */
  const queueTray = (choice: PendingChoice, docKey: DocKey) => {
    if (!choice.trayId) return;
    void queueTrayItem({
      facilityId: facilityId as never,
      trayId: choice.trayId,
      docKey,
      cycleNo: data?.cycleNo ?? 1,
      originalName: choice.file.name,
      declaredMime: choice.file.type || "application/octet-stream",
      declaredSize: choice.file.size,
    }).catch(() => {
      /* The device copy still uploads when uploads resume. */
    });
  };

  const forgetTray = (trayId?: string) => {
    if (!trayId) return;
    void removeTrayFile(trayId);
    void removeTrayItem({ trayId }).catch(() => {
      /* the hourly prune removes an expired row anyway */
    });
  };

  const dropChoice = (id: number) => {
    const target = choices.find((c) => c.id === id);
    setChoices((prev) => prev.filter((c) => c.id !== id));
    if (target?.trayId) forgetTray(target.trayId);
  };

  /** A type was chosen: update the device copy and, while uploads are paused,
   *  the server mirror. The 24-hour expiry is never extended. */
  const rememberTrayChoice = (choice: PendingChoice, docKey: DocKey) => {
    if (!choice.trayId) return;
    void putTrayFile({
      id: choice.trayId,
      facilityId,
      docKey,
      name: choice.file.name,
      type: choice.file.type,
      size: choice.file.size,
      lastModified: choice.file.lastModified,
      addedAt: choice.addedAt ?? Date.now(),
      expiresAt: choice.expiresAt ?? Date.now() + TRAY_TTL_MS,
      blob: choice.file,
    });
    if (!uploadState.allowed) queueTray(choice, docKey);
  };

  // Stable identities so the memos below only recompute on a real query
  // change, not on every render of a fresh `?? []` array.
  const documents = useMemo(
    () => (data?.documents ?? []) as DocumentMeta[],
    [data?.documents],
  );
  const countedKeys = useMemo(
    () => (data?.countedKeys ?? COUNTED_DOC_KEYS) as DocKey[],
    [data?.countedKeys],
  );
  const choiceCount = choices.length;

  /* ------------------------------------------------------------------ */
  /* Parallel dispatch (max 4)                                          */
  /* ------------------------------------------------------------------ */

  const pump = () => {
    while (panelActive.current.size < 4 && waiting.current.length > 0) {
      const next = waiting.current.shift()!;
      if (panelActive.current.has(next.docKey)) {
        // Another file is already uploading into this row — keep the newest.
        continue;
      }
      panelActive.current.add(next.docKey);
      if (next.trayId) pendingTray.current.set(next.docKey, next.trayId);
      setIncoming((prev) => ({
        ...prev,
        [next.docKey]: { file: next.file, token: ++tokenRef.current },
      }));
    }
  };

  const dispatch = (docKey: DocKey, file: File, trayId?: string) => {
    waiting.current.push({ docKey, file, trayId });
    pump();
  };

  /* ------------------------------------------------------------------ */
  /* Drop / pick / paste → the "File as" panel (never a silent upload)   */
  /* ------------------------------------------------------------------ */

  const acceptFiles = (files: File[], forced?: DocKey | null) => {
    if (!canEdit || files.length === 0) return;
    const room = Math.max(0, MAX_BATCH - choiceCount);
    const list = files.slice(0, room);
    if (room === 0) {
      setAnnounce(`The File as panel already holds ${MAX_BATCH} files — upload or cancel some first`);
      return;
    }
    const now = Date.now();
    const next: PendingChoice[] = list.map((file) => {
      const classified = classifyDroppedFile(file);
      if (classified.candidates.length === 0) {
        return {
          id: ++idRef.current,
          file,
          candidates: [],
          suggested: null,
          chosen: null,
          reason: `.${(file.name.split(".").pop() ?? "").toLowerCase() || "file"} is not a document type this app accepts`,
        };
      }
      const tray = {
        trayId: newTrayId(),
        addedAt: now,
        // The 24-hour clock starts when the file is chosen, never when it is
        // retyped or restored.
        expiresAt: now + TRAY_TTL_MS,
      };
      if (forced) {
        const invalid = validateDocumentFile(forced, file);
        return {
          id: ++idRef.current,
          file,
          candidates: classified.candidates,
          suggested: null,
          chosen: invalid ? null : forced,
          reason: invalid ?? undefined,
          ...tray,
        };
      }
      return {
        id: ++idRef.current,
        file,
        candidates: classified.candidates,
        suggested: classified.docKey,
        chosen: classified.docKey,
        ...tray,
      };
    });
    setChoices((prev) => [...prev, ...next]);
    // Keep the bytes on this device for up to 24 hours, so a pause or a reload
    // never loses a chosen file. Best-effort: browsers without IndexedDB keep
    // the in-memory tray for this session.
    for (const choice of next) {
      if (!choice.trayId) continue;
      void putTrayFile({
        id: choice.trayId,
        facilityId,
        docKey: choice.chosen,
        name: choice.file.name,
        type: choice.file.type,
        size: choice.file.size,
        lastModified: choice.file.lastModified,
        addedAt: choice.addedAt ?? now,
        expiresAt: choice.expiresAt ?? now + TRAY_TTL_MS,
        blob: choice.file,
      });
    }
    setAnnounce(
      list.length === 1
        ? `1 file added: ${list[0].name} — choose its document type`
        : `${list.length} files added — choose a type for each`,
    );
    if (files.length > room) {
      setAnnounce(`Only ${MAX_BATCH} files can wait at once; add the rest after uploading these`);
    }
  };

  const takeList = (list: FileList | null, forced?: DocKey | null) => {
    if (!list || list.length === 0) return;
    acceptFiles(Array.from(list), forced);
  };

  /** A tile's "Upload now" or a row's Replace: the SAME picker, with the
   *  type preselected, so there is still exactly one uploader.
   *  The picker reads `fixedTypeRef` (not the state) so the very next change
   *  event already sees the type — no stale-render race. */
  const requestUpload = (docKey: string) => {
    if (!canEdit) return;
    fixedTypeRef.current = docKey as DocKey;
    setFixedType(docKey as DocKey);
    dropzoneRef.current?.scrollIntoView?.({ block: "nearest" });
    typedInput.current?.click();
  };

  const clearFixedType = () => {
    fixedTypeRef.current = null;
    setFixedType(null);
  };

  /* A NEW facility never inherits the previous one's tray, optimistic count
     or failed row — the stale-id bug behind "stuck retry icons" that
     survived previous/next navigation. */
  const facilityRef = useRef(facilityId);
  useEffect(() => {
    if (facilityRef.current === facilityId) return;
    facilityRef.current = facilityId;
    setChoices([]);
    setIncoming({});
    setOptimistic({});
    setFailed({});
    setAnnounce("");
    setLastPreselect(null);
    pendingTray.current.clear();
    clearFixedType();
  }, [facilityId]);

  /* Restore the device half of the 24-hour tray after a reload. The server
     mirror is metadata only; the bytes never leave this device until the file
     actually uploads. */
  useEffect(() => {
    let live = true;
    void listTrayFiles(facilityId).then((rows) => {
      if (!live || rows.length === 0) return;
      setChoices((prev) => {
        const known = new Set(prev.map((c) => c.trayId).filter(Boolean) as string[]);
        const restored: PendingChoice[] = [];
        for (const row of rows) {
          if (known.has(row.id)) continue;
          const file = trayFileAsFile(row);
          const classified = classifyDroppedFile(file);
          if (classified.candidates.length === 0) continue;
          const chosen =
            row.docKey && classified.candidates.includes(row.docKey as DocKey)
              ? (row.docKey as DocKey)
              : classified.docKey;
          const invalid = chosen ? validateDocumentFile(chosen, file) : null;
          restored.push({
            id: ++idRef.current,
            file,
            candidates: classified.candidates,
            suggested: classified.docKey,
            chosen: invalid ? null : chosen,
            reason: invalid ?? undefined,
            trayId: row.id,
            addedAt: row.addedAt,
            expiresAt: row.expiresAt,
          });
        }
        return restored.length > 0 ? [...prev, ...restored] : prev;
      });
      setAnnounce(
        `${rows.length} file${rows.length === 1 ? "" : "s"} kept in the tray for up to 24 hours`,
      );
    });
    return () => {
      live = false;
    };
  }, [facilityId]);

  /* ------------------------------------------------------------------ */
  /* One uploader, several entry points                                 */
  /* ------------------------------------------------------------------ */

  /** The Overview card's tiles / drop target call into this component instead
   *  of growing a second drop box of their own. `acceptRef` carries the
   *  latest `acceptFiles` so the effects below never need it in deps. */
  const acceptRef = useRef(acceptFiles);
  useEffect(() => {
    acceptRef.current = acceptFiles;
  });

  /* Bring the drop zone into view when another surface requested a type; no
   * state is written here. */
  useEffect(() => {
    if (!preselectKey) return;
    dropzoneRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [preselectKey]);

  const pendingToken = pendingFiles?.token ?? null;
  const lastPending = useRef<number | null>(null);
  useEffect(() => {
    if (!pendingFiles || pendingToken == null) return;
    if (lastPending.current === pendingToken) return;
    lastPending.current = pendingToken;
    acceptRef.current(pendingFiles.files);
  }, [pendingFiles, pendingToken]);

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      addFiles: (files, docKey) => acceptRef.current(files, docKey ?? null),
      preselect: (docKey) => {
        fixedTypeRef.current = docKey;
        setFixedType(docKey);
        dropzoneRef.current?.scrollIntoView?.({ block: "nearest" });
        // A tile's "Upload now" IS a user gesture: with the old drop zone
        // gone, preselecting opens the picker straight away (the type is
        // locked, so the chosen file uploads on one tap).
        typedInput.current?.click();
      },
      pick: () => {
        // "Upload files" opens the picker with NO type fixed — clearing the
        // ref is safe here: refs and setState are stable across renders.
        fixedTypeRef.current = null;
        setFixedType(null);
        fileInput.current?.click();
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef]);

  const choose = (id: number, docKey: DocKey) => {
    const target = choices.find((c) => c.id === id);
    if (!target) return;
    const invalid = validateDocumentFile(docKey, target.file);
    if (invalid) {
      setChoices((prev) =>
        prev.map((c) => (c.id === id ? { ...c, chosen: null, reason: invalid } : c)),
      );
      return;
    }
    // ONE file, ONE tap: choosing its type IS the confirmation, so the file
    // starts at once instead of waiting for a second button.
    if (choices.length === 1) {
      if (!uploadState.allowed) {
        // Paused: the file STAYS in the tray, typed and ready, and uploads the
        // moment uploads resume — never a failed row, never a lost file. Both
        // copies (device + server) carry the 24-hour expiry.
        setChoices((prev) =>
          prev.map((c) => (c.id === id ? { ...c, chosen: docKey, reason: undefined } : c)),
        );
        rememberTrayChoice(target, docKey);
        setAnnounce(`${chipLabel(docKey)} is waiting — uploads are paused`);
        return;
      }
      setChoices([]);
      dispatch(docKey, target.file, target.trayId);
      setAnnounce(`${chipLabel(docKey)} is uploading`);
      return;
    }
    setChoices((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, chosen: docKey, reason: undefined } : c,
      ),
    );
    rememberTrayChoice(target, docKey);
  };

  /** "Same type for all" — applies only where the type accepts the file. */
  const applySameType = (docKey: DocKey | null) => {
    if (!docKey) return;
    setChoices((prev) =>
      prev.map((c) => {
        if (!c.candidates.includes(docKey)) return c;
        const invalid = validateDocumentFile(docKey, c.file);
        return invalid ? c : { ...c, chosen: docKey, reason: undefined };
      }),
    );
  };

  const readyRows = choices.filter(
    (c) => c.chosen && !validateDocumentFile(c.chosen, c.file),
  );
  const waitingRows = choices.filter((c) => !c.chosen && !c.reason);

  const uploadPending = () => {
    if (!uploadState.allowed) {
      // ONE clear message, no failed row: the tray keeps the files and types
      // for 24 hours on this device + server-side metadata.
      for (const row of readyRows) queueTray(row, row.chosen!);
      setAnnounce("Uploads are paused — the files stay in the tray for 24 hours and upload when uploads resume");
      return;
    }
    const uploaded = new Set<number>();
    for (const row of readyRows) {
      dispatch(row.chosen!, row.file, row.trayId);
      uploaded.add(row.id);
    }
    if (uploaded.size === 0) return;
    setChoices((prev) => prev.filter((c) => !uploaded.has(c.id)));
    setAnnounce(
      uploaded.size === 1
        ? "1 file is uploading"
        : `${uploaded.size} files are uploading`,
    );
  };

  /* Uploads just RESUMED (the auto-resume time passed, or an admin pressed
     "Resume uploads"): the files held in the tray go now, with the types
     already chosen. The refs keep the effect on the latest closure. */
  const uploadPendingRef = useRef<() => void>(() => {});
  useEffect(() => {
    uploadPendingRef.current = uploadPending;
  });
  const wasAllowed = useRef(uploadState.allowed);
  useEffect(() => {
    const before = wasAllowed.current;
    wasAllowed.current = uploadState.allowed;
    if (uploadState.allowed && !before && choices.length > 0) uploadPendingRef.current();
  }, [uploadState.allowed, choices.length]);

  /* ------------------------------------------------------------------ */
  /* Optimistic count                                                   */
  /* ------------------------------------------------------------------ */

  /** All six counted documents in one order, with the resolved Admin rule, so
   *  the tray's rows read the same source as the card's tiles even when the
   *  query omits a row that has never been uploaded. */
  const orderedDocs = useMemo<DocumentMeta[]>(() => {
    const reqs = (data?.requirements ?? {}) as Record<
      string,
      NonNullable<DocumentMeta["requirement"]>
    >;
    const byKey = new Map(documents.map((d) => [d.key, d] as const));
    return countedKeys.map((key) => {
      const existing = byKey.get(key);
      if (existing) return existing;
      return {
        key,
        label: DOCUMENT_SHORT_LABEL[key] ?? key,
        requirement: reqs[key] ?? null,
        current: null,
      } satisfies DocumentMeta;
    });
  }, [data?.requirements, documents, countedKeys]);

  const onUploadState = (
    docKey: string,
    state: "start" | "done" | "error" | "clear",
  ) => {
    if (state === "clear") {
      // The user dismissed a failed row: ONE message with Retry/Remove, and
      // Remove actually removes it — no stuck retry icon, no ghost row. The
      // waiting file leaves both the device and the server tray with it.
      const trayId = pendingTray.current.get(docKey);
      pendingTray.current.delete(docKey);
      forgetTray(trayId);
      setFailed((prev) => {
        if (!prev[docKey]) return prev;
        const next = { ...prev };
        delete next[docKey];
        return next;
      });
      if (panelActive.current.delete(docKey)) pump();
      return;
    }
    if (state === "start") {
      setNotice(null);
      setOptimistic((prev) => ({ ...prev, [docKey]: true }));
      setFailed((prev) => {
        if (!prev[docKey]) return prev;
        const next = { ...prev };
        delete next[docKey];
        return next;
      });
      return;
    }
    setOptimistic((prev) => {
      const next = { ...prev };
      delete next[docKey];
      return next;
    });
    if (state === "error") {
      setFailed((prev) => ({ ...prev, [docKey]: true }));
    } else {
      // Uploaded: the 24-hour copy has done its job.
      const trayId = pendingTray.current.get(docKey);
      pendingTray.current.delete(docKey);
      forgetTray(trayId);
    }
    if (panelActive.current.delete(docKey)) pump();
  };

  /** ROOT CAUSE of the empty striped rows (screenshot §1.2): the status list
   *  used to render one `<li className="py-0.5">` for EVERY counted document,
   *  even though `DocumentField` renders `null` in compact mode when there is
   *  no stored file. Six childless list items inside `divide-y` = six 5 px
   *  “stripes” (4 px padding + 1 px divider) under the warning. Only rows with
   *  something to show are mounted now; an in-flight or failed upload keeps
   *  its row because its progress/error lives there. */
  const visibleDocs = orderedDocs.filter(
    (doc) =>
      // UPLOADED documents are shown by the card's tiles — this list holds
      // only the pending rows: in flight, or failed (one message + Retry/
      // Remove). With nothing pending it renders no rows at all.
      !!optimistic[doc.key] ||
      !!failed[doc.key] ||
      // An upload dispatched from the tray mounts its row first — the row owns
      // the upload effect, so it must exist before the file starts.
      !!incoming[doc.key],
  );

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  const unionAccept = useMemo(
    () =>
      Array.from(
        new Set(
          DOCUMENT_FIELDS.filter((d) => countedKeys.includes(d.docKey))
            .flatMap((d) => d.accept.split(","))
            .map((a) => a.trim())
            .filter(Boolean),
        ),
      ).join(","),
    [countedKeys],
  );

  if (!data) {
    return (
      <div className="glass rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
        <Loader2 className="mr-1 inline size-4 animate-spin" /> Loading documents…
      </div>
    );
  }

  const currentByKey = new Map(
    documents.filter((d) => d.current).map((d) => [d.key, d.current!] as const),
  );

  return (
    <section
      className={cn("glass relative rounded-xl border border-border/60 p-3", className)}
      data-testid="documents-card"
      onPaste={(event) => {
        const files = event.clipboardData?.files;
        if (files && files.length > 0) {
          event.preventDefault();
          takeList(files, fixedTypeRef.current);
          clearFixedType();
        }
      }}
    >
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      {notice && (
        <p
          role="status"
          className="mb-1.5 flex items-start gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[11px] font-medium text-muted-foreground"
          data-testid="documents-notice"
        >
          <Check className="mt-0.5 size-3 shrink-0 text-emerald-600" aria-hidden /> {notice}
        </p>
      )}

      {/* Hidden pickers: one for the big drop zone, one for a row's Add. */}
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={unionAccept}
        className="hidden"
        data-testid="documents-file-input"
        onChange={(e) => {
          takeList(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={typedInput}
        type="file"
        accept={unionAccept}
        className="hidden"
        data-testid="documents-typed-input"
        onChange={(e) => {
          takeList(e.target.files, fixedTypeRef.current);
          e.target.value = "";
          clearFixedType();
        }}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        data-testid="documents-camera-input"
        onChange={(e) => {
          takeList(e.target.files);
          e.target.value = "";
        }}
      />

      {/* The type preselected by a tile's "Upload now" / Replace action. */}
      {canEdit && fixedType && (
        <div
          className="mt-2 flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/[0.04] px-2.5 py-1 text-[11px]"
          data-testid="documents-next-type"
        >
          <Check className="size-3 shrink-0 text-primary" aria-hidden />
          Next file will be filed as <strong className="font-semibold">{chipLabel(fixedType)}</strong>
          <button
            type="button"
            className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear the preselected document type"
            onClick={clearFixedType}
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* ---- "File as" panel: one row per dropped file ------------------ */}
      {choices.length > 0 && (
        <div
          className="mt-2 rounded-xl border border-primary/40 bg-primary/[0.04] p-2"
          data-testid="documents-file-as"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold">
              File as · {choices.length} file{choices.length === 1 ? "" : "s"}
              {waitingRows.length > 0 && (
                <span className="ml-1 font-normal text-muted-foreground">
                  · {waitingRows.length} still need a type
                </span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {!fixedType && (
              <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                Same type for all
                <select
                  aria-label="Same type for all"
                  className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px]"
                  value=""
                  onChange={(e) => applySameType((e.target.value || null) as DocKey | null)}
                >
                  <option value="">Choose…</option>
                  {[...DOCUMENT_FIELDS]
                    .filter((d) => countedKeys.includes(d.docKey))
                    .sort((a, b) => CHIP_ORDER.indexOf(a.docKey) - CHIP_ORDER.indexOf(b.docKey))
                    .map((d) => (
                      <option key={d.docKey} value={d.docKey}>
                        {chipLabel(d.docKey)}
                      </option>
                    ))}
                </select>
              </label>
              )}
              {/* A single file uploads on one tap (choosing its type); the
                  button appears only for several files, or when the type was
                  fixed for you (Replace) and just needs confirming. */}
              {(choices.length > 1 || choices.some((c) => c.chosen && !c.suggested)) && (
                <button
                  type="button"
                  onClick={uploadPending}
                  disabled={readyRows.length === 0 || !uploadState.allowed}
                  data-tip={
                    !uploadState.allowed
                      ? "Uploads are paused — these files stay in the tray and upload when uploads resume"
                      : undefined
                  }
                  className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="documents-upload-all"
                >
                  Upload {readyRows.length} file{readyRows.length === 1 ? "" : "s"}
                </button>
              )}
            </div>
          </div>

          <ul className="mt-2 space-y-1.5">
            {choices.map((choice) => {
              const Icon = /\.(xlsx|xls|csv)$/i.test(choice.file.name) ? FileText : ImageIcon;
              const replaced = choice.chosen ? currentByKey.get(choice.chosen) : undefined;
              const chosenConfig = choice.chosen
                ? DOCUMENT_FIELDS.find((d) => d.docKey === choice.chosen)
                : undefined;
              return (
                <li
                  key={choice.id}
                  className="rounded-lg border border-border/70 bg-background px-2 py-1.5"
                  data-testid="documents-choice"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span
                      className="min-w-0 flex-1 truncate text-xs font-medium"
                      data-tip={choice.file.name}
                      data-tip-truncate
                    >
                      {choice.file.name}
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {formatFileSize(choice.file.size)}
                    </span>
                    {choice.chosen === choice.suggested && choice.suggested && (
                      <span className="rounded-full border border-sky-300/70 bg-sky-50 px-1.5 text-[10px] font-medium text-sky-800">
                        Suggested
                      </span>
                    )}
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Cancel ${choice.file.name}`}
                      onClick={() => dropChoice(choice.id)}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  {choice.reason && (
                    <p className="mt-1 flex items-start gap-1 text-[11px] font-medium text-destructive" role="alert">
                      <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {choice.reason}
                    </p>
                  )}

                  {!choice.reason && (
                    <div
                      className="mt-1.5 flex flex-wrap items-center gap-1"
                      role="group"
                      aria-label={`Document type for ${choice.file.name}`}
                      onKeyDown={(e) => {
                        // Delete removes the pending row; arrows move between
                        // the enabled chips (Tab still works as usual).
                        if (e.key === "Delete" || e.key === "Backspace") {
                          e.preventDefault();
                          dropChoice(choice.id);
                          return;
                        }
                        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                        const buttons = Array.from(
                          e.currentTarget.querySelectorAll<HTMLButtonElement>(
                            'button[aria-pressed]:not([disabled])',
                          ),
                        );
                        const at = buttons.indexOf(
                          globalThis.document.activeElement as HTMLButtonElement,
                        );
                        if (at === -1) return;
                        e.preventDefault();
                        const step = e.key === "ArrowRight" ? 1 : buttons.length - 1;
                        buttons[(at + step) % buttons.length]?.focus();
                      }}
                    >
                      <span className="text-[11px] text-muted-foreground">File as:</span>
                      {[...DOCUMENT_FIELDS]
                        .filter((d) => countedKeys.includes(d.docKey))
                        // Replace fixes the type: no other chip is offered.
                        .filter((d) => !fixedType || d.docKey === fixedType)
                        .sort((a, b) => CHIP_ORDER.indexOf(a.docKey) - CHIP_ORDER.indexOf(b.docKey))
                        .map((d) => {
                        const accepts = choice.candidates.includes(d.docKey);
                        const invalid = accepts ? validateDocumentFile(d.docKey, choice.file) : "no";
                        const selected = choice.chosen === d.docKey;
                        const ChipIcon = chipIcon(d.docKey);
                        return (
                          <button
                            key={d.docKey}
                            type="button"
                            disabled={!accepts || !!invalid}
                            onClick={() => choose(choice.id, d.docKey)}
                            data-tip={
                              !accepts
                                ? `${d.label} does not accept this file type`
                                : typeof invalid === "string" && invalid !== "no"
                                  ? invalid
                                  : undefined
                            }
                            className={cn(
                              "rounded-full border px-1.5 py-0.5 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : accepts
                                  ? "border-border hover:border-primary hover:bg-primary/5"
                                  : "cursor-not-allowed border-border/50 text-muted-foreground/50",
                            )}
                            aria-pressed={selected}
                          >
                            <ChipIcon className="mr-0.5 inline size-3" aria-hidden />
                            {chipLabel(d.docKey)}
                            {selected && <Check className="ml-0.5 inline size-3" aria-hidden />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {replaced && !choice.reason && (
                    <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
                      Replaces {DOCUMENT_SHORT_LABEL[choice.chosen!] ?? choice.chosen} (uploaded{" "}
                      {new Date(replaced.uploadedAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      ) — the previous version is kept.
                    </p>
                  )}
                  {!choice.chosen && !choice.reason && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      This file waits until you choose its document type.
                      {choices.length === 1 ? " One file uploads as soon as you pick its type." : ""}
                    </p>
                  )}
                  {chosenConfig && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {chosenConfig.label}: up to {chosenConfig.maxMb} MB · {chosenConfig.typeHint}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {!uploadState.allowed && (
            <p className="mt-1.5 flex items-start gap-1 rounded-md border border-amber-300/60 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              Waiting for uploads to resume — these files are kept for up to 24 hours and go
              automatically when uploads resume.
            </p>
          )}
        </div>
      )}

      {/* ---- Pending rows: in flight or failed (uploaded files are shown by
             the card's tiles). Nothing pending → no rows at all. -------- */}
      <ul
        className={cn(
          "mt-2 divide-y divide-border/60",
          visibleDocs.length === 0 && "hidden",
        )}
        data-testid="documents-dropzone"
      >
        {visibleDocs.map((doc) => (
          <li key={doc.key} className="py-0.5">
            <DocumentField
              facilityId={facilityId}
              docKey={doc.key}
              doc={doc}
              cycleNo={data.cycleNo}
              canEdit={canEdit}
              onChanged={onChanged}
              incoming={incoming[doc.key as DocKey] ?? null}
              compact
              onRequestUpload={requestUpload}
              onUploaded={(key, name) => {
                setAnnounce(`${DOCUMENT_SHORT_LABEL[key] ?? key} uploaded: ${name}`);
              }}
              onNotice={setNotice}
              onUploadState={onUploadState}
            />
          </li>
        ))}
      </ul>

      {!canEdit && (
        <p className="mt-2 text-[11px] text-muted-foreground">View only — you do not have edit access.</p>
      )}
    </section>
  );
}
