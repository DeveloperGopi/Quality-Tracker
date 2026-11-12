/**
 * ZIP WRITER — the small, dependency-free half of the document export.
 *
 * The export streams Drive → ZIP → Drive with bounded memory: each stored
 * file is written as one entry (no compression), and only entry metadata
 * (name, size, CRC, offset) is kept. The exact part size is computed before
 * the Drive resumable session starts, so no byte count is guessed.
 *
 * Pure functions only — no Convex, no Drive, no browser — so the same code
 * runs in an action and in a smoke check.
 */

export type ZipEntryMeta = {
  /** Entry path inside the archive (`Block/Facility/Type C1 - name.xlsx`). */
  name: string;
  size: number;
  crc: number;
  offset: number;
};

export type ZipManifestRow = {
  facility: string;
  block: string;
  nin?: string | null;
  docLabel: string;
  cycleNo: number;
  fileName: string;
  size: number;
  uploadedAt: number;
  uploadedByName: string;
  versionNo: number;
};

const enc = new TextEncoder();

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const END_SIG = 0x06054b50;
const UTF8_FLAG = 0x0800;

/* ------------------------------------------------------------------ */
/* CRC-32 (the ZIP polynomial)                                        */
/* ------------------------------------------------------------------ */

let crcTable: Uint32Array | null = null;
function table(): Uint32Array {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[i] = c >>> 0;
  }
  return crcTable;
}

export function crc32(bytes: Uint8Array): number {
  const t = table();
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ */
/* Names                                                              */
/* ------------------------------------------------------------------ */

/** A path segment no filesystem or ZIP reader can trip over. */
export const ZIP_NAME_MAX = 120;

export function zipSegment(value: string, fallback = "Unknown"): string {
  const clean = String(value ?? "")
    // The en dash is legal and must stay (Tamil and every other letter too).
    // Only the characters Windows refuses are replaced.
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    // Windows silently strips a trailing dot/space, so an entry can vanish.
    .replace(/[. ]+$/g, "")
    .replace(/^\.+$/, "");
  const safe = (clean || fallback).slice(0, ZIP_NAME_MAX).replace(/[. ]+$/g, "");
  // Reserved DOS device names are rejected by Explorer.
  return /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i.test(safe)
    ? `_${safe}`.slice(0, ZIP_NAME_MAX)
    : safe;
}

/** Windows Explorer rejects/struggles above 260; keep entry paths under 200. */
export const ZIP_PATH_MAX = 199;

/** `Block/Facility/{file}` — every document sits directly in its two folders. */
export function zipDocumentPath(input: {
  block: string;
  facility: string;
  fileName: string;
  /** Kept for older callers; all versions now live in the same folders. */
  previous?: boolean;
}): string {
  void input.previous;
  const block = zipSegment(input.block, "Unassigned");
  const file = zipSegment(input.fileName, "document");
  const fixed = block.length + file.length + 2; // two /
  const facilityRoom = Math.max(1, ZIP_PATH_MAX - fixed);
  let facility = zipSegment(input.facility, "Facility");
  if (facility.length > facilityRoom)
    facility = facility.slice(0, facilityRoom).trim() || "F";
  return `${block}/${facility}/${file}`;
}

/** Bit 11 is set only when the name actually contains non-ASCII characters. */
export function needsUtf8Flag(name: string): boolean {
  return /[^\x00-\x7f]/.test(name);
}

/** Legacy path kept for older callers/tests. */
export function zipPath(input: {
  block: string;
  facility: string;
  docLabel: string;
  cycleNo: number;
  originalName: string;
  versionNo?: number;
  /** Add the version marker only when older versions are included. */
  markVersion?: boolean;
}): string {
  const file = zipSegment(input.originalName, "document");
  const type = zipSegment(input.docLabel, "Document");
  const version = input.markVersion ? ` v${input.versionNo ?? 1}` : "";
  return `${zipSegment(input.block, "Unassigned")}/${zipSegment(
    input.facility,
    "Facility",
  )}/${type} C${input.cycleNo}${version} - ${file}`;
}

/** Make one entry name unique inside a part (`name (2).ext`). */
export function uniqueEntryName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const slash = name.lastIndexOf("/");
  const dir = slash >= 0 ? name.slice(0, slash + 1) : "";
  const file = slash >= 0 ? name.slice(slash + 1) : name;
  const dot = file.lastIndexOf(".");
  const base = dot > 0 ? file.slice(0, dot) : file;
  const ext = dot > 0 ? file.slice(dot) : "";
  for (let n = 2; n < 10_000; n += 1) {
    const suffix = ` (${n})`;
    // The 120-character cap applies to the FILE NAME, not the folder path.
    const room = Math.max(1, ZIP_NAME_MAX - suffix.length - ext.length);
    const candidate = `${dir}${base.slice(0, room)}${suffix}${ext}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  const fallback = `${dir}${file.slice(0, Math.max(1, ZIP_NAME_MAX - 8))}-${used.size}`;
  used.add(fallback);
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Headers                                                            */
/* ------------------------------------------------------------------ */

function dosStamp(ts = Date.now()): { time: number; date: number } {
  const d = new Date(ts);
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

function u16(out: Uint8Array, at: number, value: number) {
  out[at] = value & 0xff;
  out[at + 1] = (value >>> 8) & 0xff;
}

function u32(out: Uint8Array, at: number, value: number) {
  out[at] = value & 0xff;
  out[at + 1] = (value >>> 8) & 0xff;
  out[at + 2] = (value >>> 16) & 0xff;
  out[at + 3] = (value >>> 24) & 0xff;
}

/**
 * Set UTF-8 name bit 11 on every local and central header. fflate only sets it
 * for non-ASCII names; Windows Explorer reads some non-Latin names correctly
 * only when the flag is present on every entry.
 */
export function forceUtf8Flags(zip: Uint8Array): Uint8Array {
  const flagsAt = (at: number) => {
    // 0x0800 = bit 11; it lives in the HIGH byte of the little-endian flags.
    zip[at + 1] = zip[at + 1] | 0x08;
  };
  let at = 0;
  while (at + 4 <= zip.length) {
    const sig = r32(zip, at);
    if (sig === LOCAL_SIG) {
      flagsAt(at + 6);
      const name = r16(zip, at + 26);
      const extra = r16(zip, at + 28);
      const compressed = r32(zip, at + 18);
      at += 30 + name + extra + compressed;
      continue;
    }
    if (sig === CENTRAL_SIG) {
      flagsAt(at + 8);
      const name = r16(zip, at + 28);
      const extra = r16(zip, at + 30);
      const comment = r16(zip, at + 32);
      at += 46 + name + extra + comment;
      continue;
    }
    if (sig === END_SIG) break;
    break;
  }
  return zip;
}

export function localHeader(input: { name: string; size: number; crc: number }): Uint8Array {
  const name = enc.encode(input.name);
  const out = new Uint8Array(30 + name.length);
  const { time, date } = dosStamp();
  u32(out, 0, LOCAL_SIG);
  u16(out, 4, 20);
  u16(out, 6, needsUtf8Flag(input.name) ? UTF8_FLAG : 0);
  u16(out, 8, 0); // stored
  u16(out, 10, time);
  u16(out, 12, date);
  u32(out, 14, input.crc);
  u32(out, 18, input.size);
  u32(out, 22, input.size);
  u16(out, 26, name.length);
  u16(out, 28, 0);
  out.set(name, 30);
  return out;
}

export function centralHeader(entry: ZipEntryMeta): Uint8Array {
  const name = enc.encode(entry.name);
  const out = new Uint8Array(46 + name.length);
  const { time, date } = dosStamp();
  u32(out, 0, CENTRAL_SIG);
  u16(out, 4, 20);
  u16(out, 6, 20);
  u16(out, 8, needsUtf8Flag(entry.name) ? UTF8_FLAG : 0);
  u16(out, 10, 0);
  u16(out, 12, time);
  u16(out, 14, date);
  u32(out, 16, entry.crc);
  u32(out, 20, entry.size);
  u32(out, 24, entry.size);
  u16(out, 28, name.length);
  u16(out, 30, 0);
  u16(out, 32, 0);
  u16(out, 34, 0);
  u16(out, 36, 0);
  u32(out, 38, 0);
  u32(out, 42, entry.offset);
  out.set(name, 46);
  return out;
}

export function endRecord(entries: number, cdSize: number, cdOffset: number): Uint8Array {
  const out = new Uint8Array(22);
  u32(out, 0, END_SIG);
  u16(out, 4, 0);
  u16(out, 6, 0);
  u16(out, 8, entries);
  u16(out, 10, entries);
  u32(out, 12, cdSize);
  u32(out, 16, cdOffset);
  u16(out, 20, 0);
  return out;
}

/* ------------------------------------------------------------------ */
/* Sizes + manifest                                                   */
/* ------------------------------------------------------------------ */

/** Exact stored-ZIP size for one part, including `manifest.csv`. */
export function zipSize(names: { name: string; size: number }[]): number {
  let total = 0;
  for (const n of names) {
    const nameLen = enc.encode(n.name).length;
    total += 30 + nameLen + n.size + 46 + nameLen;
  }
  return total + 22;
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** `manifest.csv` — one row per file in the part (UTF-8 with a BOM so Excel\n *  opens Tamil names correctly). */
export function manifestCsv(rows: ZipManifestRow[]): Uint8Array {
  const head = [
    "Facility",
    "Block",
    "NIN",
    "Document type",
    "Cycle",
    "File",
    "Size (bytes)",
    "Uploaded",
    "Uploaded by",
    "Version",
  ];
  const lines = [head.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.facility,
        row.block,
        row.nin ?? "",
        row.docLabel,
        row.cycleNo,
        row.fileName,
        row.size,
        new Date(row.uploadedAt).toISOString().slice(0, 10),
        row.uploadedByName,
        row.versionNo,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return enc.encode(`\uFEFF${lines.join("\r\n")}\r\n`);
}

/* ------------------------------------------------------------------ */
/* Read-back verification                                              */
/* ------------------------------------------------------------------ */

export type ZipVerification =
  | { ok: true; entries: number; size: number }
  | { ok: false; reason: string };

function r16(b: Uint8Array, at: number): number {
  return b[at] | (b[at + 1] << 8);
}

function r32(b: Uint8Array, at: number): number {
  return (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;
}

/** Bounded sequential reader — verification of a 500 MB archive never holds
 *  the archive (or even one large entry) in memory. */
class ByteReader {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private buf = new Uint8Array(0);
  private pos = 0;
  private done = false;
  /** Bytes CONSUMED so far (not merely fetched into the buffer). */
  position = 0;
  total = 0;

  constructor(stream: ReadableStream<Uint8Array>) {
    this.reader = stream.getReader();
  }

  private async fill(): Promise<boolean> {
    if (this.done) return false;
    const next = await this.reader.read();
    if (next.done) {
      this.done = true;
      return false;
    }
    const chunk = next.value ?? new Uint8Array(0);
    const rest = this.buf.subarray(this.pos);
    const merged = new Uint8Array(rest.length + chunk.length);
    merged.set(rest, 0);
    merged.set(chunk, rest.length);
    this.buf = merged;
    this.pos = 0;
    this.total += chunk.length;
    return chunk.length > 0;
  }

  async read(n: number): Promise<Uint8Array> {
    while (this.buf.length - this.pos < n) {
      if (!(await this.fill())) throw new Error("The ZIP ended before its index");
    }
    const out = this.buf.slice(this.pos, this.pos + n);
    this.pos += n;
    this.position += n;
    return out;
  }

  /** Consume `n` bytes through a callback (CRC) without allocating them all. */
  async consume(n: number, onChunk?: (chunk: Uint8Array) => void): Promise<void> {
    let left = n;
    while (left > 0) {
      if (this.pos >= this.buf.length && !(await this.fill()))
        throw new Error("An entry ended before its declared size");
      const take = Math.min(left, this.buf.length - this.pos);
      const chunk = this.buf.subarray(this.pos, this.pos + take);
      onChunk?.(chunk);
      this.pos += take;
      this.position += take;
      left -= take;
    }
  }

  async atEnd(): Promise<boolean> {
    if (this.pos < this.buf.length) return false;
    if (this.done) return true;
    return !(await this.fill());
  }
}

class CrcRun {
  private c = 0xffffffff;
  update(bytes: Uint8Array) {
    const t = table();
    for (let i = 0; i < bytes.length; i += 1)
      this.c = t[(this.c ^ bytes[i]) & 0xff] ^ (this.c >>> 8);
  }
  value(): number {
    return (this.c ^ 0xffffffff) >>> 0;
  }
}

/**
 * Re-open a finished archive and validate the parts Explorer is strict about:
 * local headers carry the real CRC and both sizes, bit 3 is clear, the method
 * is STORE, bit 11 matches the name, and the central directory/EOCD point at
 * the bytes actually present. Every entry's CRC is recomputed.
 */
/* The first implementation below is retained only as a reference while the
   verified reader is replaced; it is not part of the shipped module.

export async function verifyZipStream(
  stream: ReadableStream<Uint8Array> | null,
): Promise<ZipVerification> {
  if (!stream) return { ok: false, reason: "The finished ZIP has no bytes" };
  const r = new ByteReader(stream);
  const locals = new Map<number, { name: string; size: number; crc: number }>();
  let localCount = 0;
  let firstCentral = -1;
  try {
    for (;;) {
      const head = await r.read(4);
      const sig = r32(head, 0);
      if (sig === CENTRAL_SIG) {
        firstCentral = r.total - 4 - (r as unknown as { pos: number }).pos;
        // `total` includes the 4-byte signature just read; the local offset is
        // the reader's consumed position minus those four bytes.
        firstCentral = r.total - 4;
        // The central loop below re-reads this signature from a saved slice.
        const restFixed = await r.read(42);
        const entry = centralFrom(restFixed, 4);
        const nameBytes = await r.read(entry.nameLen);
        await r.consume(entry.extraLen + entry.commentLen);
        break;
      }
      if (sig !== LOCAL_SIG) return { ok: false, reason: "A local header is missing" };
      const fixed = await r.read(26);
      const flag = r16(fixed, 2);
      const method = r16(fixed, 4);
      const crc = r32(fixed, 10);
      const csize = r32(fixed, 14);
      const usize = r32(fixed, 18);
      const nameLen = r16(fixed, 22);
      const extraLen = r16(fixed, 24);
      const nameBytes = await r.read(nameLen);
      const name = new TextDecoder().decode(nameBytes);
      await r.consume(extraLen);
      if ((flag & 0x0008) !== 0) return { ok: false, reason: `Entry ${name} uses a data descriptor` };
      if (method !== 0) return { ok: false, reason: `Entry ${name} is not STORE` };
      if (csize === 0 || usize === 0) return { ok: false, reason: `Entry ${name} has a zero size` };
      if (csize !== usize) return { ok: false, reason: `Entry ${name} has mismatched sizes` };
      if ((flag & UTF8_FLAG) !== (needsUtf8Flag(name) ? UTF8_FLAG : 0))
        return { ok: false, reason: `Entry ${name} has the wrong UTF-8 flag` };
      const run = new CrcRun();
      await r.consume(usize, (chunk) => run.update(chunk));
      if (run.value() !== crc) return { ok: false, reason: `Entry ${name} failed its CRC check` };
      locals.set(localCount, { name, size: usize, crc });
      localCount += 1;
    }

    // Parse the first central header that was just consumed separately, then
    // the remaining ones. This keeps the reader sequential (no seeking).
    const centralStart = firstCentral;
    let centralCount = 0;
    // Re-read the first central header cleanly is impossible after consuming
    // it; instead the loop above never consumes its name. The `break` above
    // consumed the fixed part + name. Validate it now from the collected data.
    // We therefore use the fields returned by centralFrom via a second pass:
    // see `firstCentralEntry` below.
    const first = firstCentralEntry(restFixedHead(head, restFixed), localCount, locals);
    if (!first.ok) return first;
    centralCount = 1;

    for (;;) {
      const h = await r.read(4);
      const sig = r32(h, 0);
      if (sig === CENTRAL_SIG) {
        const fixed = await r.read(42);
        const entry = centralFrom(fixed, 4);
        const name = new TextDecoder().decode(await r.read(entry.nameLen));
        await r.consume(entry.extraLen + entry.commentLen);
        const check = validateCentral(entry, name, centralCount, locals);
        if (!check.ok) return check;
        centralCount += 1;
        continue;
      }
      if (sig === END_SIG) {
        const fixed = await r.read(18);
        const count = r16(fixed, 0);
        const cdSize = r32(fixed, 4);
        const cdOffset = r32(fixed, 8);
        const commentLen = r16(fixed, 16);
        await r.consume(commentLen);
        if (!(await r.atEnd())) return { ok: false, reason: "Bytes follow the end record" };
        if (count !== centralCount || count !== localCount)
          return { ok: false, reason: "The entry count does not match" };
        const centralEnd = centralStart + cdSize;
        if (cdOffset !== centralStart)
          return { ok: false, reason: "The central directory offset is wrong" };
        if (centralEnd + 22 + commentLen !== r.total)
          return { ok: false, reason: "The central directory size is wrong" };
        return { ok: true, entries: count, size: r.total };
      }
      return { ok: false, reason: "The central directory is incomplete" };
    }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "The ZIP could not be read back" };
  }
}

function centralFrom(fixed: Uint8Array, offset: number): {
  crc: number;
  csize: number;
  usize: number;
  nameLen: number;
  extraLen: number;
  commentLen: number;
  offset: number;
  flag: number;
  method: number;
} {
  return {
    flag: r16(fixed, offset + 4),
    method: r16(fixed, offset + 6),
    crc: r32(fixed, offset + 12),
    csize: r32(fixed, offset + 16),
    usize: r32(fixed, offset + 20),
    nameLen: r16(fixed, offset + 24),
    extraLen: r16(fixed, offset + 26),
    commentLen: r16(fixed, offset + 28),
    offset: r32(fixed, offset + 38),
  };
}

function validateCentral(
  entry: ReturnType<typeof centralFrom>,
  name: string,
  index: number,
  locals: Map<number, { name: string; size: number; crc: number }>,
): ZipVerification {
  const local = locals.get(entry.offset);
  if (!local) return { ok: false, reason: `Central entry ${name} points at the wrong offset` };
  if (local.name !== name || local.size !== entry.usize || local.crc !== entry.crc)
    return { ok: false, reason: `Central entry ${name} does not match its local header` };
  if (entry.csize !== entry.usize) return { ok: false, reason: `Central entry ${name} has mismatched sizes` };
  if (entry.method !== 0) return { ok: false, reason: `Central entry ${name} is not STORE` };
  if ((entry.flag & 0x0008) !== 0) return { ok: false, reason: `Central entry ${name} uses a data descriptor` };
  if ((entry.flag & UTF8_FLAG) !== (needsUtf8Flag(name) ? UTF8_FLAG : 0))
    return { ok: false, reason: `Central entry ${name} has the wrong UTF-8 flag` };
  return { ok: true, entries: index, size: 0 };
}

function restFixedHead(_head: Uint8Array, rest: Uint8Array): Uint8Array {
  const out = new Uint8Array(46);
  // rest starts at central byte 4. The signature is not needed by centralFrom.
  out.set(rest, 0);
  return out;
}

function firstCentralEntry(
  fixed: Uint8Array,
  index: number,
  locals: Map<number, { name: string; size: number; crc: number }>,
): ZipVerification {
  void fixed;
  void index;
  void locals;
  return { ok: true, entries: 0, size: 0 };
}
*/

/** Sequential, bounded read-back verification of a finished archive. */
export async function verifyZipStream(
  stream: ReadableStream<Uint8Array> | null,
): Promise<ZipVerification> {
  if (!stream) return { ok: false, reason: "The finished ZIP has no bytes" };
  const r = new ByteReader(stream);
  const locals = new Map<number, { name: string; size: number; crc: number }>();
  let centralStart = -1;
  let centralEnd = -1;
  let centralCount = 0;
  try {
    for (;;) {
      const sigBytes = await r.read(4);
      const sig = r32(sigBytes, 0);

      if (sig === CENTRAL_SIG) {
        centralStart = r.position - 4;
        // The first central signature is already consumed; read its 42-byte
        // fixed body, then the remaining entries and the EOCD.
        let next = sig;
        while (next === CENTRAL_SIG) {
          const fixed = await r.read(42);
          const entry = centralFrom(fixed, 0);
          const name = new TextDecoder().decode(await r.read(entry.nameLen));
          await r.consume(entry.extraLen + entry.commentLen);
          const checked = validateCentralEntry(entry, name, locals);
          if (!checked.ok) return checked;
          centralCount += 1;
          const marker = await r.read(4);
          next = r32(marker, 0);
        }
        if (next !== END_SIG) return { ok: false, reason: "The central directory is incomplete" };
        centralEnd = r.position - 4;
        const end = await r.read(18);
        const disk = r16(end, 0);
        const cdDisk = r16(end, 2);
        const countOnDisk = r16(end, 4);
        const count = r16(end, 6);
        const cdSize = r32(end, 8);
        const cdOffset = r32(end, 12);
        const commentLen = r16(end, 16);
        await r.consume(commentLen);
        if (!(await r.atEnd())) return { ok: false, reason: "Bytes follow the end record" };
        if (disk !== 0 || cdDisk !== 0) return { ok: false, reason: "A split archive is not supported" };
        if (count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff)
          return { ok: false, reason: "This archive needs ZIP64" };
        if (count !== centralCount || countOnDisk !== centralCount || count !== locals.size)
          return { ok: false, reason: "The entry count does not match" };
        if (cdOffset !== centralStart)
          return { ok: false, reason: "The central directory offset is wrong" };
        if (cdSize !== centralEnd - centralStart)
          return { ok: false, reason: "The central directory size is wrong" };
        return { ok: true, entries: count, size: r.total };
      }

      if (sig !== LOCAL_SIG) return { ok: false, reason: "A local header is missing" };
      const localOffset = r.position - 4;
      if (locals.has(localOffset)) return { ok: false, reason: "A local header is duplicated" };
      const fixed = await r.read(26);
      const flag = r16(fixed, 2);
      const method = r16(fixed, 4);
      const crc = r32(fixed, 10);
      const csize = r32(fixed, 14);
      const usize = r32(fixed, 18);
      const nameLen = r16(fixed, 22);
      const extraLen = r16(fixed, 24);
      const name = new TextDecoder().decode(await r.read(nameLen));
      await r.consume(extraLen);
      if ((flag & 0x0008) !== 0) return { ok: false, reason: `Entry ${name} uses a data descriptor` };
      if (method !== 0) return { ok: false, reason: `Entry ${name} is not STORE` };
      if (csize === 0 || usize === 0) return { ok: false, reason: `Entry ${name} has a zero size` };
      if (csize !== usize) return { ok: false, reason: `Entry ${name} has mismatched sizes` };
      if ((flag & UTF8_FLAG) !== (needsUtf8Flag(name) ? UTF8_FLAG : 0))
        return { ok: false, reason: `Entry ${name} has the wrong UTF-8 flag` };
      const run = new CrcRun();
      await r.consume(usize, (chunk) => run.update(chunk));
      if (run.value() !== crc) return { ok: false, reason: `Entry ${name} failed its CRC check` };
      locals.set(localOffset, { name, size: usize, crc });
    }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "The ZIP could not be read back" };
  }
}

function centralFrom(fixed: Uint8Array, offset = 0): {
  crc: number;
  csize: number;
  usize: number;
  nameLen: number;
  extraLen: number;
  commentLen: number;
  offset: number;
  flag: number;
  method: number;
} {
  return {
    flag: r16(fixed, offset + 4),
    method: r16(fixed, offset + 6),
    crc: r32(fixed, offset + 12),
    csize: r32(fixed, offset + 16),
    usize: r32(fixed, offset + 20),
    nameLen: r16(fixed, offset + 24),
    extraLen: r16(fixed, offset + 26),
    commentLen: r16(fixed, offset + 28),
    offset: r32(fixed, offset + 38),
  };
}

function validateCentralEntry(
  entry: ReturnType<typeof centralFrom>,
  name: string,
  locals: Map<number, { name: string; size: number; crc: number }>,
): ZipVerification {
  const local = locals.get(entry.offset);
  if (!local) return { ok: false, reason: `Central entry ${name} points at the wrong offset` };
  if (local.name !== name || local.size !== entry.usize || local.crc !== entry.crc)
    return { ok: false, reason: `Central entry ${name} does not match its local header` };
  if (entry.csize !== entry.usize)
    return { ok: false, reason: `Central entry ${name} has mismatched sizes` };
  if (entry.method !== 0) return { ok: false, reason: `Central entry ${name} is not STORE` };
  if ((entry.flag & 0x0008) !== 0)
    return { ok: false, reason: `Central entry ${name} uses a data descriptor` };
  if ((entry.flag & UTF8_FLAG) !== (needsUtf8Flag(name) ? UTF8_FLAG : 0))
    return { ok: false, reason: `Central entry ${name} has the wrong UTF-8 flag` };
  return { ok: true, entries: 0, size: 0 };
}

/** The file name the browser receives: `{District} Documents {scope} {date}.zip`. */
export function exportBaseName(input: {
  district: string;
  scope: string;
  date: Date;
  partNo?: number;
  parts?: number;
}): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = input.date;
  const stamp = `${String(d.getDate()).padStart(2, "0")}-${months[d.getMonth()]}-${d.getFullYear()}`;
  const district = zipSegment(input.district || "District", "District");
  const scope = zipSegment(input.scope || "All documents", "All documents");
  const suffix =
    input.partNo && input.partNo > 1 ? ` part ${input.partNo}` : "";
  return `${district} Documents ${scope}${suffix} ${stamp}.zip`;
}
