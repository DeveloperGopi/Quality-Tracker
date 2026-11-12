/**
 * STREAM HASHING — SHA-256 and MD5 over a byte stream, in constant memory.
 *
 * Upload verification must hash the WHOLE file (the duplicate check and the
 * reconciliation both rely on it) without buffering a 25 MB document in the
 * isolate. `crypto.subtle.digest` only takes a complete buffer, so the two
 * algorithms are implemented incrementally here and fed chunk by chunk.
 *
 * SHA-256 is the security-relevant hash (duplicate detection, reconciliation).
 * MD5 exists only because Drive reports `md5Checksum` in that format.
 */

/* ------------------------------------------------------------------ */
/* SHA-256                                                            */
/* ------------------------------------------------------------------ */

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export class Sha256 {
  private h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  private buffer = new Uint8Array(64);
  private buffered = 0;
  private length = 0;

  update(chunk: Uint8Array): this {
    let offset = 0;
    this.length += chunk.length;
    if (this.buffered) {
      const need = Math.min(64 - this.buffered, chunk.length);
      this.buffer.set(chunk.subarray(0, need), this.buffered);
      this.buffered += need;
      offset = need;
      if (this.buffered === 64) {
        this.block(this.buffer, 0);
        this.buffered = 0;
      }
    }
    for (; offset + 64 <= chunk.length; offset += 64) this.block(chunk, offset);
    if (offset < chunk.length) {
      this.buffer.set(chunk.subarray(offset), 0);
      this.buffered = chunk.length - offset;
    }
    return this;
  }

  digestHex(): string {
    const bitLen = this.length * 8;
    const pad = new Uint8Array(((this.buffered + 9 + 63) >> 6) << 6);
    pad.set(this.buffer.subarray(0, this.buffered));
    pad[this.buffered] = 0x80;
    const view = new DataView(pad.buffer);
    view.setUint32(pad.length - 8, Math.floor(bitLen / 2 ** 32));
    view.setUint32(pad.length - 4, bitLen >>> 0);
    for (let i = 0; i < pad.length; i += 64) this.block(pad, i);
    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    this.h.forEach((word, i) => outView.setUint32(i * 4, word >>> 0));
    return hex(out);
  }

  private block(data: Uint8Array, start: number): void {
    const w = new Uint32Array(64);
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(start + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = this.h;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    this.h[0] = (this.h[0] + a) >>> 0;
    this.h[1] = (this.h[1] + b) >>> 0;
    this.h[2] = (this.h[2] + c) >>> 0;
    this.h[3] = (this.h[3] + d) >>> 0;
    this.h[4] = (this.h[4] + e) >>> 0;
    this.h[5] = (this.h[5] + f) >>> 0;
    this.h[6] = (this.h[6] + g) >>> 0;
    this.h[7] = (this.h[7] + h) >>> 0;
  }
}

const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;

/* ------------------------------------------------------------------ */
/* MD5 (checksum parity with Drive only)                              */
/* ------------------------------------------------------------------ */

const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
  14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15,
  21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));

export class Md5 {
  private a = 0x67452301;
  private b = 0xefcdab89;
  private c = 0x98badcfe;
  private d = 0x10325476;
  private buffer = new Uint8Array(64);
  private buffered = 0;
  private length = 0;

  update(chunk: Uint8Array): this {
    let offset = 0;
    this.length += chunk.length;
    if (this.buffered) {
      const need = Math.min(64 - this.buffered, chunk.length);
      this.buffer.set(chunk.subarray(0, need), this.buffered);
      this.buffered += need;
      offset = need;
      if (this.buffered === 64) {
        this.block(this.buffer);
        this.buffered = 0;
      }
    }
    for (; offset + 64 <= chunk.length; offset += 64) this.block(chunk.subarray(offset, offset + 64));
    if (offset < chunk.length) {
      this.buffer.set(chunk.subarray(offset), 0);
      this.buffered = chunk.length - offset;
    }
    return this;
  }

  digestHex(): string {
    const bitLen = this.length * 8;
    const pad = new Uint8Array(((this.buffered + 9 + 63) >> 6) << 6);
    pad.set(this.buffer.subarray(0, this.buffered));
    pad[this.buffered] = 0x80;
    const view = new DataView(pad.buffer);
    view.setUint32(pad.length - 8, bitLen >>> 0, true);
    view.setUint32(pad.length - 4, Math.floor(bitLen / 2 ** 32), true);
    for (let i = 0; i < pad.length; i += 64) this.block(pad.subarray(i, i + 64));
    const out = new Uint8Array(16);
    const outView = new DataView(out.buffer);
    outView.setUint32(0, this.a >>> 0, true);
    outView.setUint32(4, this.b >>> 0, true);
    outView.setUint32(8, this.c >>> 0, true);
    outView.setUint32(12, this.d >>> 0, true);
    return hex(out);
  }

  private block(chunk: Uint8Array): void {
    const m = new Array<number>(16);
    const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    for (let i = 0; i < 16; i += 1) m[i] = view.getUint32(i * 4, true);
    let A = this.a;
    let B = this.b;
    let C = this.c;
    let D = this.d;
    for (let i = 0; i < 64; i += 1) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      const sum = (A + F + MD5_K[i] + m[g]) >>> 0;
      const rotated = ((sum << MD5_S[i]) | (sum >>> (32 - MD5_S[i]))) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotated) >>> 0;
    }
    this.a = (this.a + A) >>> 0;
    this.b = (this.b + B) >>> 0;
    this.c = (this.c + C) >>> 0;
    this.d = (this.d + D) >>> 0;
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

export type StreamHashes = { sha256: string; md5: string; size: number };

/**
 * Hash a byte stream exactly once, in constant memory. `maxBytes` guards
 * against a store handing back more data than the upload declared.
 */
export async function hashStream(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes = 64 * 1024 * 1024,
): Promise<StreamHashes> {
  const sha = new Sha256();
  const md5 = new Md5();
  let size = 0;
  if (stream) {
    const reader = stream.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        size += value.length;
        if (size > maxBytes) throw new Error("The stored file is larger than allowed");
        sha.update(value);
        md5.update(value);
      }
    } finally {
      reader.releaseLock?.();
    }
  }
  return { sha256: sha.digestHex(), md5: md5.digestHex(), size };
}

/** Read at most `limit` bytes from a stream (the first-bytes type sniff). */
export async function readHead(
  stream: ReadableStream<Uint8Array> | null,
  limit = 4096,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (stream) {
    const reader = stream.getReader();
    try {
      while (total < limit) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        const take = value.subarray(0, limit - total);
        chunks.push(take);
        total += take.length;
      }
    } finally {
      reader.releaseLock?.();
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
