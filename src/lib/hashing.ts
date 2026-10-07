import CryptoJS from 'crypto-js';

export type HashAlgoId =
  | 'md5'
  | 'sha1'
  | 'sha224'
  | 'sha256'
  | 'sha384'
  | 'sha512'
  | 'sha3'
  | 'ripemd160';

export type HashStrength = 'broken' | 'weak' | 'strong';

export interface HashAlgo {
  id: HashAlgoId;
  name: string;
  short: string;
  bits: number;
  strength: HashStrength;
  note: string;
}

export const HASH_ALGOS: HashAlgo[] = [
  { id: 'md5', name: 'MD5', short: 'MD5', bits: 128, strength: 'broken', note: 'Collisions trivial — not for security' },
  { id: 'sha1', name: 'SHA-1', short: 'SHA-1', bits: 160, strength: 'broken', note: 'Shattered (2017) — deprecated' },
  { id: 'sha224', name: 'SHA-224', short: 'SHA-224', bits: 224, strength: 'weak', note: 'Truncated SHA-256 — legacy use only' },
  { id: 'sha256', name: 'SHA-256', short: 'SHA-256', bits: 256, strength: 'strong', note: 'General-purpose standard' },
  { id: 'sha384', name: 'SHA-384', short: 'SHA-384', bits: 384, strength: 'strong', note: 'Truncated SHA-512 — high margin' },
  { id: 'sha512', name: 'SHA-512', short: 'SHA-512', bits: 512, strength: 'strong', note: 'Fast on 64-bit — excellent choice' },
  { id: 'sha3', name: 'SHA-3 (256)', short: 'SHA-3', bits: 256, strength: 'strong', note: 'Keccak sponge — newest standard' },
  { id: 'ripemd160', name: 'RIPEMD-160', short: 'RIPEMD', bits: 160, strength: 'weak', note: '160-bit — niche / legacy (e.g. Bitcoin addr)' },
];

function hashWordArray(algo: HashAlgoId, wa: CryptoJS.lib.WordArray): string {
  switch (algo) {
    case 'md5': return CryptoJS.MD5(wa).toString(CryptoJS.enc.Hex);
    case 'sha1': return CryptoJS.SHA1(wa).toString(CryptoJS.enc.Hex);
    case 'sha224': return CryptoJS.SHA224(wa).toString(CryptoJS.enc.Hex);
    case 'sha256': return CryptoJS.SHA256(wa).toString(CryptoJS.enc.Hex);
    case 'sha384': return CryptoJS.SHA384(wa).toString(CryptoJS.enc.Hex);
    case 'sha512': return CryptoJS.SHA512(wa).toString(CryptoJS.enc.Hex);
    case 'sha3':
      return (CryptoJS.SHA3 as unknown as (m: CryptoJS.lib.WordArray, o?: object) => CryptoJS.lib.WordArray)(wa, { outputLength: 256 }).toString(CryptoJS.enc.Hex);
    case 'ripemd160': return CryptoJS.RIPEMD160(wa).toString(CryptoJS.enc.Hex);
  }
}

function hmacWordArray(algo: HashAlgoId, wa: CryptoJS.lib.WordArray, key: CryptoJS.lib.WordArray): string {
  switch (algo) {
    case 'md5': return CryptoJS.HmacMD5(wa, key).toString(CryptoJS.enc.Hex);
    case 'sha1': return CryptoJS.HmacSHA1(wa, key).toString(CryptoJS.enc.Hex);
    case 'sha224': return (CryptoJS as unknown as Record<string, (m: CryptoJS.lib.WordArray, k: CryptoJS.lib.WordArray) => CryptoJS.lib.WordArray>).HmacSHA224(wa, key).toString(CryptoJS.enc.Hex);
    case 'sha256': return CryptoJS.HmacSHA256(wa, key).toString(CryptoJS.enc.Hex);
    case 'sha384': return (CryptoJS as unknown as Record<string, (m: CryptoJS.lib.WordArray, k: CryptoJS.lib.WordArray) => CryptoJS.lib.WordArray>).HmacSHA384(wa, key).toString(CryptoJS.enc.Hex);
    case 'sha512': return CryptoJS.HmacSHA512(wa, key).toString(CryptoJS.enc.Hex);
    case 'sha3':
      return (CryptoJS as unknown as Record<string, (m: CryptoJS.lib.WordArray, k: CryptoJS.lib.WordArray, o?: object) => CryptoJS.lib.WordArray>).HmacSHA3(wa, key, { outputLength: 256 }).toString(CryptoJS.enc.Hex);
    case 'ripemd160': return CryptoJS.HmacRIPEMD160(wa, key).toString(CryptoJS.enc.Hex);
  }
}

export function hashText(algo: HashAlgoId, text: string): string {
  return hashWordArray(algo, CryptoJS.enc.Utf8.parse(text));
}

export function hmacText(algo: HashAlgoId, text: string, keyText: string): string {
  return hmacWordArray(algo, CryptoJS.enc.Utf8.parse(text), CryptoJS.enc.Utf8.parse(keyText));
}

export function hashAll(text: string): Record<HashAlgoId, string> {
  const wa = CryptoJS.enc.Utf8.parse(text);
  const out = {} as Record<HashAlgoId, string>;
  for (const a of HASH_ALGOS) out[a.id] = hashWordArray(a.id, wa);
  return out;
}

export function hmacAll(text: string, keyText: string): Record<HashAlgoId, string> {
  const wa = CryptoJS.enc.Utf8.parse(text);
  const key = CryptoJS.enc.Utf8.parse(keyText);
  const out = {} as Record<HashAlgoId, string>;
  for (const a of HASH_ALGOS) out[a.id] = hmacWordArray(a.id, wa, key);
  return out;
}

export function wordArrayFromBytes(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    words[i >>> 2] = ((words[i >>> 2] ?? 0) | (bytes[i]! << (24 - (i % 4) * 8))) | 0;
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

export function hashBytes(algo: HashAlgoId, bytes: Uint8Array): string {
  return hashWordArray(algo, wordArrayFromBytes(bytes));
}

export function hashAllBytes(bytes: Uint8Array): Record<HashAlgoId, string> {
  const wa = wordArrayFromBytes(bytes);
  const out = {} as Record<HashAlgoId, string>;
  for (const a of HASH_ALGOS) out[a.id] = hashWordArray(a.id, wa);
  return out;
}
