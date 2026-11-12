/**
 * STORAGE CRYPTO — hashing, encrypted secrets, signed read tokens.
 *
 * All of it uses Web Crypto (`crypto.subtle`), so the exact same code runs in
 * the Convex default runtime, in `"use node"` actions and in the tests. The
 * only hand-written primitive is MD5, because Drive reports `md5Checksum` and
 * Web Crypto deliberately has no MD5.
 *
 * Secrets (the Google refresh token) are stored ONLY as
 * `base64url(iv).base64url(ciphertext)` from AES-256-GCM, with the key coming
 * from the server environment. Nothing here ever logs or returns a secret.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  crypto.getRandomValues(out);
  return out;
}

const HEX = "0123456789abcdef";
export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += HEX[b >> 4] + HEX[b & 15];
  return out;
}

/* ------------------------------------------------------------------ */
/* SHA-256                                                            */
/* ------------------------------------------------------------------ */

export async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return toHex(new Uint8Array(digest));
}

/* ------------------------------------------------------------------ */
/* MD5 (Drive checksum parity only — never used for security)          */
/* ------------------------------------------------------------------ */

const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
  14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15,
  21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));

/** MD5 of a byte array, lowercase hex — the format Drive's md5Checksum uses. */
export function md5Hex(input: Uint8Array): string {
  const bitLen = input.length * 8;
  const withPad = new Uint8Array((((input.length + 8) >> 6) + 1) << 6);
  withPad.set(input);
  withPad[input.length] = 0x80;
  const view = new DataView(withPad.buffer);
  view.setUint32(withPad.length - 8, bitLen >>> 0, true);
  view.setUint32(withPad.length - 4, Math.floor(bitLen / 2 ** 32), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let chunk = 0; chunk < withPad.length; chunk += 64) {
    const m = new Array<number>(16);
    for (let i = 0; i < 16; i += 1) m[i] = view.getUint32(chunk + i * 4, true);
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;
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
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return toHex(out);
}

/* ------------------------------------------------------------------ */
/* AES-256-GCM for the refresh token                                  */
/* ------------------------------------------------------------------ */

async function aesKey(secret: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(`nqas-drive:${secret}`) as unknown as ArrayBuffer);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

const AAD = enc.encode("nqas-drive-refresh-token");

/** Encrypt a secret for storage. Throws when the key is missing. */
export async function encryptSecret(plain: string, keySecret: string | undefined): Promise<string> {
  if (!keySecret) throw new Error("The server secret DRIVE_TOKEN_KEY is not configured");
  const iv = randomBytes(12);
  const key = await aesKey(keySecret);
  const cipher = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as unknown as BufferSource,
      additionalData: AAD as unknown as BufferSource,
    },
    key,
    enc.encode(plain),
  );
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(cipher))}`;
}

export async function decryptSecret(bundle: string, keySecret: string | undefined): Promise<string> {
  if (!keySecret) throw new Error("The server secret DRIVE_TOKEN_KEY is not configured");
  const [ivPart, dataPart] = bundle.split(".");
  if (!ivPart || !dataPart) throw new Error("The stored Drive credential is malformed");
  const key = await aesKey(keySecret);
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64Url(ivPart) as unknown as BufferSource,
      additionalData: AAD as unknown as BufferSource,
    },
    key,
    fromBase64Url(dataPart) as unknown as ArrayBuffer,
  );
  return dec.decode(plain);
}

/* ------------------------------------------------------------------ */
/* Purpose-scoped AES-256-GCM (admin-entered credentials)             */
/* ------------------------------------------------------------------ */

/**
 * Same primitive as the refresh token, but the AAD names the PURPOSE, so a
 * ciphertext minted for "client-secret" can never be replayed as a refresh
 * token (or vice versa) even with the same key.
 *
 * Stored format: `base64url(iv).base64url(ciphertext || tag)` — Web Crypto
 * appends the 16-byte GCM tag to the ciphertext, so IV, ciphertext and tag are
 * all preserved and the whole thing is authenticated (tampering throws).
 */
export async function encryptValue(
  plain: string,
  keySecret: string | undefined,
  purpose: string,
): Promise<string> {
  if (!keySecret) throw new Error("The Drive encryption key is not configured");
  const iv = randomBytes(12);
  const key = await aesKey(keySecret);
  const cipher = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as unknown as BufferSource,
      additionalData: enc.encode(`nqas-drive:${purpose}`) as unknown as BufferSource,
    },
    key,
    enc.encode(plain),
  );
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(cipher))}`;
}

export async function decryptValue(
  bundle: string,
  keySecret: string | undefined,
  purpose: string,
): Promise<string> {
  if (!keySecret) throw new Error("The Drive encryption key is not configured");
  const [ivPart, dataPart] = bundle.split(".");
  if (!ivPart || !dataPart) throw new Error("The stored Drive credential is malformed");
  const key = await aesKey(keySecret);
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64Url(ivPart) as unknown as BufferSource,
      additionalData: enc.encode(`nqas-drive:${purpose}`) as unknown as BufferSource,
    },
    key,
    fromBase64Url(dataPart) as unknown as ArrayBuffer,
  );
  return dec.decode(plain);
}

/** 32 random bytes, base64url — the generated DRIVE_TOKEN_KEY material. */
export function randomKeyMaterial(): string {
  return toBase64Url(randomBytes(32));
}

/* ------------------------------------------------------------------ */
/* Signed, short-lived read tokens                                    */
/* ------------------------------------------------------------------ */

export type ReadTokenPayload = {
  /** Document id. */
  d: string;
  /** User id — the token only works for the person it was minted for. */
  u: string;
  /** Expiry (ms since epoch). */
  e: number;
  /** "inline" for a preview, "attachment" for a download, "avatar" for the
   *  profile photo endpoint. The document handler only ever accepts the two
   *  document modes, so an avatar token cannot be used for a file. */
  m: "inline" | "attachment" | "avatar";
};

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(`nqas-doc-token:${secret}`) as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signReadToken(
  payload: ReadTokenPayload,
  secret: string | undefined,
): Promise<string> {
  if (!secret) throw new Error("The server secret DOC_TOKEN_KEY is not configured");
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body) as unknown as ArrayBuffer);
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifyReadToken(
  token: string,
  secret: string | undefined,
  now = Date.now(),
): Promise<ReadTokenPayload | null> {
  if (!secret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  let valid = false;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromBase64Url(sig) as unknown as ArrayBuffer,
      enc.encode(body) as unknown as ArrayBuffer,
    );
  } catch {
    return null;
  }
  if (!valid) return null;
  try {
    const payload = JSON.parse(dec.decode(fromBase64Url(body))) as ReadTokenPayload;
    if (!payload?.d || !payload?.u || typeof payload.e !== "number") return null;
    if (payload.e < now) return null;
    return payload;
  } catch {
    return null;
  }
}
