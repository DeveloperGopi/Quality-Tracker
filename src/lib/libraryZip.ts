/** Browser-built Document Library ZIPs (fflate). Pure path/name rules + a
 *  small concurrency helper; bytes are fetched by the page through the same
 *  signed download route single downloads use. */

import { zipSync, type Zippable } from "fflate";

export const ZIP_PART_SIZE = 200;
export const MAX_ZIP_NAME = 120;

/** Windows-safe file segment. Keeps the en dash, strips trailing dots/spaces
 *  and preserves a short extension when the 120-character cap applies. */
export function sanitizeZipName(value: string, fallback = "file"): string {
  const clean = String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/[\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  if (!clean) return fallback;
  if (clean.length <= MAX_ZIP_NAME) return clean;
  const dot = clean.lastIndexOf(".");
  const ext = dot > 0 && clean.length - dot <= 12 ? clean.slice(dot) : "";
  const stem = (ext ? clean.slice(0, dot) : clean).slice(0, MAX_ZIP_NAME - ext.length);
  return `${stem.replace(/[. ]+$/g, "") || fallback}${ext}`;
}

/** Add " (2)", " (3)" … before the extension when a folder already has it. */
export function uniqueZipName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let index = 2;
  let next = `${stem} (${index})${ext}`;
  while (used.has(next)) {
    index += 1;
    next = `${stem} (${index})${ext}`;
  }
  used.add(next);
  return next;
}

export type ZipSourceFile = {
  block: string;
  facilityName: string;
  fileName: string;
  mimeType: string;
  data: Uint8Array;
};

export type ZipPart = {
  name: string;
  blob: Blob;
  files: number;
};

export const zipEntryPath = (block: string, facility: string, fileName: string): string =>
  `${sanitizeZipName(block, "Unassigned")}/${sanitizeZipName(facility, "Facility")}/${sanitizeZipName(fileName)}`;

const isStored = (file: ZipSourceFile): boolean =>
  /\.(pdf|xlsx)$/i.test(file.fileName) ||
  /^(application\/pdf|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)$/i.test(
    file.mimeType,
  );

/** Build the complete archive(s) before any download starts. More than 200
 *  files becomes "Part 1 of N"; every part is a valid independent ZIP. */
export function buildZipParts(files: ZipSourceFile[], baseName: string): ZipPart[] {
  const totalParts = Math.max(1, Math.ceil(files.length / ZIP_PART_SIZE));
  const parts: ZipPart[] = [];
  for (let part = 0; part < totalParts; part += 1) {
    const slice = files.slice(part * ZIP_PART_SIZE, (part + 1) * ZIP_PART_SIZE);
    const zippable: Zippable = {};
    const usedFolders = new Map<string, Set<string>>();
    const folderNames = new Map<string, string>();
    const usedFiles = new Map<string, Set<string>>();

    for (const file of slice) {
      const block = sanitizeZipName(file.block, "Unassigned");
      const folderKey = `${block}\u0000${file.facilityName}`;
      let facility = folderNames.get(folderKey);
      if (!facility) {
        const names = usedFolders.get(block) ?? new Set<string>();
        facility = uniqueZipName(sanitizeZipName(file.facilityName, "Facility"), names);
        usedFolders.set(block, names);
        folderNames.set(folderKey, facility);
      }
      const dir = `${block}/${facility}`;
      const names = usedFiles.get(dir) ?? new Set<string>();
      const name = uniqueZipName(sanitizeZipName(file.fileName), names);
      usedFiles.set(dir, names);
      const path = `${dir}/${name}`;
      zippable[path] = [file.data, { level: isStored(file) ? 0 : 6 }];
    }

    const bytes = zipSync(zippable);
    const nameBase = sanitizeZipName(baseName, "documents").replace(/\.zip$/i, "");
    const name =
      totalParts > 1
        ? `${nameBase} - Part ${part + 1} of ${totalParts}.zip`
        : `${nameBase}.zip`;
    parts.push({
      name,
      blob: new Blob([bytes], { type: "application/zip" }),
      files: slice.length,
    });
  }
  return parts;
}

/** Bounded parallel map: at most `limit` workers, preserving input order. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const run = async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      out[index] = await worker(items[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, limit), items.length) }, () => run()),
  );
  return out;
}

/** One short, safe failure reason. Never includes a URL or token. */
export function shortZipError(error: unknown, status?: number): string {
  if (status) {
    if (status === 401 || status === 403) return "access denied";
    if (status === 404) return "file not found";
    if (status >= 500) return "storage unavailable";
    return `server error ${status}`;
  }
  const message = error instanceof Error ? error.message : "";
  if (/abort/i.test(message)) return "cancelled";
  if (/failed to fetch|network|load failed/i.test(message)) return "network error";
  return message.trim().slice(0, 80) || "could not be read";
}
