export type TextFormat = 'text' | 'base64' | 'hex';

export function utf8ToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function bytesToUtf8(b: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(b as unknown as Uint8Array<ArrayBuffer>);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    s += String.fromCharCode(...bytes.subarray(i, i + CH));
  }
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.trim().replace(/\s+/g, '');
  if (clean.length === 0) return new Uint8Array(0);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0) {
    throw new Error('Invalid Base64 — check padding and characters (A–Z, a–z, 0–9, +, /, =).');
  }
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function base64UrlToBytes(b64url: string): Uint8Array {
  let s = b64url.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4 !== 0) s += '=';
  return base64ToBytes(s);
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

const HEX_RE = /^(?:[0-9a-fA-F]{2})*$/;

export function bytesToHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i]!.toString(16).padStart(2, '0');
  return s;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/\s+/g, '').replace(/^0x/i, '');
  if (clean.length === 0) return new Uint8Array(0);
  if (!HEX_RE.test(clean)) throw new Error('Invalid Hex — use only characters 0–9 and a–f, in pairs.');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function decodeInput(input: string, format: TextFormat): Uint8Array {
  if (format === 'text') return utf8ToBytes(input);
  if (format === 'base64') return base64ToBytes(input);
  return hexToBytes(input);
}

export function encodeOutput(bytes: Uint8Array, format: TextFormat): string {
  if (format === 'text') return bytesToUtf8(bytes);
  if (format === 'base64') return bytesToBase64(bytes);
  return bytesToHex(bytes);
}

export function hexRandom(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return bytesToHex(a);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/** Read a File in chunks so the UI can show determinate progress. Fully client-side. */
export async function readFileBytesWithProgress(
  file: File,
  onProgress?: (pct: number) => void,
  chunkSize = 4 * 1024 * 1024
): Promise<Uint8Array> {
  if (file.size <= chunkSize) {
    onProgress?.(60);
    const buf = new Uint8Array(await file.arrayBuffer());
    onProgress?.(100);
    return buf;
  }
  const parts: Uint8Array[] = [];
  let off = 0;
  while (off < file.size) {
    const slice = file.slice(off, Math.min(off + chunkSize, file.size));
    const buf = new Uint8Array(await slice.arrayBuffer());
    parts.push(buf);
    off += buf.length;
    onProgress?.(Math.round((off / file.size) * 100));
    await new Promise((r) => setTimeout(r, 0)); // let the progress bar paint
  }
  const out = new Uint8Array(file.size);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
