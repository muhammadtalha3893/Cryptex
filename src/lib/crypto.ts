import CryptoJS from 'crypto-js';
import { bytesToHex, hexToBytes } from './format';

export type CryptoAlgoId = 'aes-gcm-256' | 'aes-cbc-256' | 'aes-128' | 'tripledes' | 'rc4';

export interface CryptoAlgo {
  id: CryptoAlgoId;
  code: number;
  name: string;
  desc: string;
  keyBytes: number;
  ivBytes: number;
  legacy?: boolean;
  badge: 'strong' | 'ok' | 'legacy';
}

export const CRYPTO_ALGOS: CryptoAlgo[] = [
  { id: 'aes-gcm-256', code: 1, name: 'AES-256-GCM', desc: 'Authenticated encryption. Modern default — confidentiality + integrity.', keyBytes: 32, ivBytes: 12, badge: 'strong' },
  { id: 'aes-cbc-256', code: 2, name: 'AES-256-CBC', desc: 'Classic block mode with PKCS#7. No built-in authentication.', keyBytes: 32, ivBytes: 16, badge: 'ok' },
  { id: 'aes-128', code: 3, name: 'AES-128-CBC', desc: 'Lighter AES variant. Still secure, smaller margin than 256.', keyBytes: 16, ivBytes: 16, badge: 'ok' },
  { id: 'tripledes', code: 4, name: 'Triple DES', desc: 'Legacy 3DES-EDE-CBC. Slow, 64-bit blocks — migrate away.', keyBytes: 24, ivBytes: 8, legacy: true, badge: 'legacy' },
  { id: 'rc4', code: 5, name: 'RC4', desc: 'Broken stream cipher. Demo / legacy interop only — never for real data.', keyBytes: 16, ivBytes: 0, legacy: true, badge: 'legacy' },
];

export function algoById(id: CryptoAlgoId): CryptoAlgo {
  return CRYPTO_ALGOS.find((a) => a.id === id)!;
}

export function algoByCode(code: number): CryptoAlgo {
  const a = CRYPTO_ALGOS.find((x) => x.code === code);
  if (!a) throw new Error('Unknown algorithm code in package.');
  return a;
}

function waFromBytes(b: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let i = 0; i < b.length; i++) {
    words[i >>> 2] = (((words[i >>> 2] ?? 0) | (b[i]! << (24 - (i % 4) * 8))) | 0);
  }
  return CryptoJS.lib.WordArray.create(words, b.length);
}

function bytesFromWa(wa: CryptoJS.lib.WordArray): Uint8Array {
  const words = wa.words;
  const sig = wa.sigBytes;
  const out = new Uint8Array(sig);
  for (let i = 0; i < sig; i++) {
    out[i] = (words[i >>> 2]! >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return out;
}

function concat(...arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

export async function pbkdf2(password: Uint8Array, salt: Uint8Array, iterations: number, keyLen: number): Promise<Uint8Array> {
  const km = await crypto.subtle.importKey('raw', password as unknown as Uint8Array<ArrayBuffer>, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as Uint8Array<ArrayBuffer>, iterations, hash: 'SHA-256' },
    km,
    keyLen * 8
  );
  return new Uint8Array(bits);
}

export function randomBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

export interface EncryptResult {
  envelope: Uint8Array;
  saltHex: string;
  ivHex: string;
  keyHexPreview?: string;
}

async function aesGcmEncrypt(key: Uint8Array, iv: Uint8Array, pt: Uint8Array): Promise<Uint8Array> {
  const ck = await crypto.subtle.importKey('raw', key as unknown as Uint8Array<ArrayBuffer>, { name: 'AES-GCM' }, false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as unknown as Uint8Array<ArrayBuffer> }, ck, pt as unknown as Uint8Array<ArrayBuffer>);
  return new Uint8Array(ct);
}

async function aesGcmDecrypt(key: Uint8Array, iv: Uint8Array, ct: Uint8Array): Promise<Uint8Array> {
  const ck = await crypto.subtle.importKey('raw', key as unknown as Uint8Array<ArrayBuffer>, { name: 'AES-GCM' }, false, ['decrypt']);
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as unknown as Uint8Array<ArrayBuffer> }, ck, ct as unknown as Uint8Array<ArrayBuffer>);
    return new Uint8Array(pt);
  } catch {
    throw new Error('Decryption failed — wrong password/key, or data was tampered with (GCM auth tag mismatch).');
  }
}

function cjsEncrypt(algo: CryptoAlgoId, key: Uint8Array, iv: Uint8Array, pt: Uint8Array): Uint8Array {
  const ptWa = waFromBytes(pt);
  const keyWa = waFromBytes(key);
  let out: CryptoJS.lib.CipherParams;
  if (algo === 'aes-cbc-256' || algo === 'aes-128') {
    out = CryptoJS.AES.encrypt(ptWa, keyWa, { iv: waFromBytes(iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  } else if (algo === 'tripledes') {
    out = CryptoJS.TripleDES.encrypt(ptWa, keyWa, { iv: waFromBytes(iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  } else {
    out = CryptoJS.RC4.encrypt(ptWa, keyWa);
  }
  return bytesFromWa(out.ciphertext);
}

function cjsDecrypt(algo: CryptoAlgoId, key: Uint8Array, iv: Uint8Array, ct: Uint8Array): Uint8Array {
  try {
    if (ct.length === 0) throw new Error('empty');
    const ctWa = waFromBytes(ct);
    const keyWa = waFromBytes(key);
    const params = CryptoJS.lib.CipherParams.create({ ciphertext: ctWa });
    let ptWa: CryptoJS.lib.WordArray;
    if (algo === 'aes-cbc-256' || algo === 'aes-128') {
      ptWa = CryptoJS.AES.decrypt(params, keyWa, { iv: waFromBytes(iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    } else if (algo === 'tripledes') {
      ptWa = CryptoJS.TripleDES.decrypt(params, keyWa, { iv: waFromBytes(iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    } else {
      ptWa = CryptoJS.RC4.decrypt(params, keyWa);
    }
    // Wrong key / corrupted data often yields empty or negative-length output
    // (CryptoJS reports sigBytes <= 0 when unpadding fails). Treat as failure.
    if (!ptWa || ptWa.sigBytes <= 0) {
      throw new Error('empty-plaintext');
    }
    return bytesFromWa(ptWa);
  } catch (e) {
    if (e instanceof RangeError) {
      throw new Error('Decryption failed — wrong password/key or corrupted data.');
    }
    throw new Error('Decryption failed — wrong password/key, corrupted data, or mismatched algorithm. Double-check the password/key and that you pasted the complete package.');
  }
}

function u32be(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, false);
  return b;
}
function readU32be(b: Uint8Array, o: number): number {
  return new DataView(b.buffer, b.byteOffset + o, 4).getUint32(0, false);
}

export interface EncryptOpts {
  algo: CryptoAlgoId;
  plaintext: Uint8Array;
  password?: string;
  rawKeyHex?: string;
  saltHex?: string;
  ivHex?: string;
  iterations?: number;
}

export async function encryptData(opts: EncryptOpts): Promise<EncryptResult> {
  const algo = algoById(opts.algo);
  const iterations = opts.iterations ?? 210000;
  if (opts.password !== undefined) {
    // password mode -> envelope v1
    if (!opts.password) throw new Error('Password is required for encryption.');
    const salt = opts.saltHex ? hexToBytes(opts.saltHex) : randomBytes(16);
    if (salt.length < 8 || salt.length > 32) throw new Error('Salt must be 8–32 bytes (16–64 hex chars).');
    const iv = algo.ivBytes === 0 ? new Uint8Array(0) : opts.ivHex ? hexToBytes(opts.ivHex) : randomBytes(algo.ivBytes);
    if (iv.length !== algo.ivBytes) throw new Error(`IV must be exactly ${algo.ivBytes} bytes for ${algo.name}.`);
    const key = await pbkdf2(new TextEncoder().encode(opts.password), salt, iterations, algo.keyBytes);
    const ct = opts.algo === 'aes-gcm-256'
      ? await aesGcmEncrypt(key, iv, opts.plaintext)
      : cjsEncrypt(opts.algo, key, iv, opts.plaintext);
    const header = concat(new Uint8Array([0x01, algo.code]), u32be(iterations), new Uint8Array([salt.length, iv.length]));
    return { envelope: concat(header, salt, iv, ct), saltHex: bytesToHex(salt), ivHex: bytesToHex(iv) };
  }
  // raw key mode -> envelope v2
  if (!opts.rawKeyHex) throw new Error('Key is required (hex).');
  const key = hexToBytes(opts.rawKeyHex);
  if (key.length !== algo.keyBytes) throw new Error(`Key must be exactly ${algo.keyBytes} bytes (${algo.keyBytes * 2} hex chars) for ${algo.name}.`);
  const iv = algo.ivBytes === 0 ? new Uint8Array(0) : opts.ivHex ? hexToBytes(opts.ivHex) : randomBytes(algo.ivBytes);
  if (iv.length !== algo.ivBytes) throw new Error(`IV must be exactly ${algo.ivBytes} bytes for ${algo.name}.`);
  const ct = opts.algo === 'aes-gcm-256'
    ? await aesGcmEncrypt(key, iv, opts.plaintext)
    : cjsEncrypt(opts.algo, key, iv, opts.plaintext);
  const header = new Uint8Array([0x02, algo.code, iv.length]);
  return { envelope: concat(header, iv, ct), saltHex: '', ivHex: bytesToHex(iv) };
}

export interface DecryptOpts {
  envelope: Uint8Array;
  password?: string;
  rawKeyHex?: string;
}

export async function decryptData(opts: DecryptOpts): Promise<{ plaintext: Uint8Array; algo: CryptoAlgo; saltHex: string; ivHex: string; iterations: number | null }> {
  const env = opts.envelope;
  if (env.length < 3) throw new Error('Package too short — not a valid Cryptex envelope.');
  const version = env[0]!;
  if (version === 0x01) {
    if (env.length < 8) throw new Error('Corrupted envelope header.');
    const algo = algoByCode(env[1]!);
    const iterations = readU32be(env, 2);
    const saltLen = env[6]!;
    const ivLen = env[7]!;
    if (env.length < 8 + saltLen + ivLen + 1) throw new Error('Corrupted envelope — truncated.');
    const salt = env.slice(8, 8 + saltLen);
    const iv = env.slice(8 + saltLen, 8 + saltLen + ivLen);
    const ct = env.slice(8 + saltLen + ivLen);
    if (!opts.password) throw new Error('This package needs its password to decrypt.');
    const key = await pbkdf2(new TextEncoder().encode(opts.password), salt, iterations, algo.keyBytes);
    const pt = algo.id === 'aes-gcm-256' ? await aesGcmDecrypt(key, iv, ct) : cjsDecrypt(algo.id, key, iv, ct);
    return { plaintext: pt, algo, saltHex: bytesToHex(salt), ivHex: bytesToHex(iv), iterations };
  }
  if (version === 0x02) {
    const algo = algoByCode(env[1]!);
    const ivLen = env[2]!;
    if (env.length < 3 + ivLen + 1) throw new Error('Corrupted envelope — truncated.');
    const iv = env.slice(3, 3 + ivLen);
    const ct = env.slice(3 + ivLen);
    if (!opts.rawKeyHex) throw new Error('This package needs its raw key (hex) to decrypt.');
    const key = hexToBytes(opts.rawKeyHex);
    if (key.length !== algo.keyBytes) throw new Error(`Key must be exactly ${algo.keyBytes} bytes for ${algo.name}.`);
    const pt = algo.id === 'aes-gcm-256' ? await aesGcmDecrypt(key, iv, ct) : cjsDecrypt(algo.id, key, iv, ct);
    return { plaintext: pt, algo, saltHex: '', ivHex: bytesToHex(iv), iterations: null };
  }
  throw new Error('Not a Cryptex package (bad version byte). Paste the full output from encryption.');
}
