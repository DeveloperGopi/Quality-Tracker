/**
 * DRIVE FOLDER SERVICE — the folder tree, and the ONLY place that creates one.
 *
 *   NQAS Tracker (root, id in settings)
 *     Facility Documents
 *       <Block>
 *         <NIN> - <Facility name>
 *           NQAS Result | SA Report | SA Checklist | Gap Closure | Condemned | NOC
 *             _versions (older files)
 *     _incoming (bulk upload staging)
 *     _trash-review (removed files, kept for the retention period)
 *     _avatars (My Profile photos — one private file per account)
 *
 * Folder ids are cached in the `driveFolders` table keyed by
 * `parentId/name`, and the row's unique key is what prevents duplicates under
 * concurrent uploads: two uploads that race both try to insert, one wins, and
 * the loser re-reads the cache instead of creating a second Drive folder.
 *
 * Folder NAMES are labels. A renamed facility or a moved block never moves
 * files — the database holds the file ids.
 */

export type FolderClient = {
  ensureFolder(parentId: string, name: string): Promise<{ id: string }>;
};

export type FolderCache = {
  get(key: string): Promise<string | null>;
  put(entry: { key: string; parentId: string; name: string; driveFolderId: string }): Promise<void>;
};

export const FOLDER_NAMES = {
  facilityDocuments: "Facility Documents",
  versions: "_versions",
  incoming: "_incoming",
  trashReview: "_trash-review",
  avatars: "_avatars",
  /** Part 4 — snapshots behind the QR `/r/<token>` link. Private: the PDF
   *  bytes are only ever served by this app's file endpoint, never by a
   *  Drive link or a share URL. */
  sharedReports: "_shared-reports",
} as const;

const DOC_FOLDER_LABELS: Record<string, string> = {
  NQAS_Result: "NQAS Result",
  SA_Report: "SA Report",
  SA_Checklist: "SA Checklist",
  Gap_Closure: "Gap Closure",
  Condemned: "Condemned",
  NOC: "NOC",
  NQAS_Certificate: "NQAS Result",
};

export function folderLabelFor(docKey: string): string {
  return DOC_FOLDER_LABELS[docKey] ?? docKey.replace(/_/g, " ");
}

/** `<NIN> - <Facility name>`, e.g. `2426248478 - PHC Athanavur`. */
export function facilityFolderLabel(nin: string | null | undefined, name: string): string {
  const clean = (v: string) => v.replace(/[\\/]/g, "-").replace(/\s+/g, " ").trim();
  const n = clean(String(nin ?? "").trim());
  const label = clean(String(name ?? "Facility"));
  return n ? `${n} - ${label}` : label;
}

export class DriveFolderService {
  private readonly client: FolderClient;
  private readonly cache: FolderCache;
  /** In-request memo so one upload never re-queries the same parent twice. */
  private readonly memo = new Map<string, string>();
  /** In-flight creations: concurrent callers await ONE Drive create. */
  private readonly pending = new Map<string, Promise<string>>();

  constructor(client: FolderClient, cache: FolderCache) {
    this.client = client;
    this.cache = cache;
  }

  private key(parentId: string, name: string): string {
    return `${parentId}/${name}`;
  }

  /** Ensure one named folder under a parent. Idempotent and race-safe. */
  async ensure(parentId: string, name: string): Promise<string> {
    const key = this.key(parentId, name);
    const memo = this.memo.get(key);
    if (memo) return memo;
    // Concurrent callers (five uploads starting at once) share one creation.
    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;

    const task = (async () => {
      const cached = await this.cache.get(key);
      if (cached) {
        this.memo.set(key, cached);
        return cached;
      }
      const created = await this.client.ensureFolder(parentId, name);
      this.memo.set(key, created.id);
      // A concurrent winner (another isolate) may have written this key first;
      // the cache row is unique, and both callers end up on one folder.
      await this.cache.put({ key, parentId, name, driveFolderId: created.id });
      return created.id;
    })().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, task);
    return task;
  }

  /** `_incoming` — bulk-upload staging under the root. */
  incomingFolder(rootId: string): Promise<string> {
    return this.ensure(rootId, FOLDER_NAMES.incoming);
  }

  /** `_trash-review` — removed files, kept for the retention period. */
  trashReviewFolder(rootId: string): Promise<string> {
    return this.ensure(rootId, FOLDER_NAMES.trashReview);
  }

  /** `_versions` inside a document folder. */
  versionsFolder(docFolderId: string): Promise<string> {
    return this.ensure(docFolderId, FOLDER_NAMES.versions);
  }

  /** `_avatars` under the root — My Profile photos. */
  avatarsFolder(rootId: string): Promise<string> {
    return this.ensure(rootId, FOLDER_NAMES.avatars);
  }

  /** `_shared-reports` under the root — the printed-sheet snapshots. */
  sharedReportsFolder(rootId: string): Promise<string> {
    return this.ensure(rootId, FOLDER_NAMES.sharedReports);
  }

  /**
   * The document folder for `facility × docKey`, creating the whole path on
   * demand: Facility Documents → Block → NIN - Name → <Doc label>.
   */
  async ensureDocumentFolder(input: {
    rootFolderId: string;
    block: string;
    nin: string | null | undefined;
    facilityName: string;
    docKey: string;
  }): Promise<{ folderId: string; facilityFolderId: string }> {
    const docs = await this.ensure(input.rootFolderId, FOLDER_NAMES.facilityDocuments);
    const block = await this.ensure(docs, String(input.block || "Unassigned block").trim() || "Unassigned block");
    const facilityFolderId = await this.ensure(
      block,
      facilityFolderLabel(input.nin, input.facilityName),
    );
    const folderId = await this.ensure(facilityFolderId, folderLabelFor(input.docKey));
    return { folderId, facilityFolderId };
  }
}
