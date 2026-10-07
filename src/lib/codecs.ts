export type CodecId = 'base64' | 'base64url' | 'url' | 'hex' | 'binary' | 'rot13' | 'caesar';

export interface Codec {
  id: CodecId;
  name: string;
  desc: string;
}

export const CODECS: Codec[] = [
  { id: 'base64', name: 'Base64', desc: 'Binary → ASCII text. Emails, data URIs, tokens.' },
  { id: 'base64url', name: 'Base64URL', desc: 'URL-safe Base64 without padding. JWTs, web tokens.' },
  { id: 'url', name: 'URL Encode', desc: 'Percent-encoding for query strings & paths.' },
  { id: 'hex', name: 'Hex', desc: 'Bytes as 0–9 a–f. Keys, digests, dumps.' },
  { id: 'binary', name: 'Binary', desc: 'Text as 8-bit 0/1 groups. Learning & bit-work.' },
  { id: 'rot13', name: 'ROT13', desc: 'Each letter rotated 13 places. Reversible obfuscation.' },
  { id: 'caesar', name: 'Caesar Cipher', desc: 'Shift letters by N places. Classic substitution.' },
];

import { base64ToBytes, base64UrlToBytes, bytesToBase64, bytesToBase64Url, bytesToHex, hexToBytes, utf8ToBytes } from './format';

export function codecEncode(id: CodecId, input: string, shift = 3): string {
  switch (id) {
    case 'base64': return bytesToBase64(utf8ToBytes(input));
    case 'base64url': return bytesToBase64Url(utf8ToBytes(input));
    case 'url': return encodeURIComponent(input);
    case 'hex': return bytesToHex(utf8ToBytes(input));
    case 'binary': {
      const b = utf8ToBytes(input);
      return Array.from(b).map((x) => x.toString(2).padStart(8, '0')).join(' ');
    }
    case 'rot13': return caesarShift(input, 13);
    case 'caesar': return caesarShift(input, shift);
  }
}

export function codecDecode(id: CodecId, input: string, shift = 3): string {
  if (!input.trim()) throw new Error('Input is empty — paste something to decode first.');
  switch (id) {
    case 'base64': {
      let b: Uint8Array;
      try {
        b = base64ToBytes(input);
      } catch {
        throw new Error('Malformed Base64 — use only A–Z, a–z, 0–9, +, / with correct = padding (length must be a multiple of 4).');
      }
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(b as unknown as Uint8Array<ArrayBuffer>);
      } catch {
        throw new Error('Valid Base64, but the bytes are not UTF-8 text — try decoding as Hex instead, or the data may be binary.');
      }
    }
    case 'base64url': {
      let b: Uint8Array;
      try {
        b = base64UrlToBytes(input);
      } catch {
        throw new Error('Malformed Base64URL — use only A–Z, a–z, 0–9, - and _ (no padding needed).');
      }
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(b as unknown as Uint8Array<ArrayBuffer>);
      } catch {
        throw new Error('Valid Base64URL, but the bytes are not UTF-8 text — the data may be binary.');
      }
    }
    case 'url': {
      try {
        return decodeURIComponent(input);
      } catch {
        throw new Error('Malformed URL-encoding — found a “%” not followed by two hex digits (e.g. “%20”).');
      }
    }
    case 'hex': {
      let b: Uint8Array;
      try {
        b = hexToBytes(input);
      } catch {
        throw new Error('Malformed Hex — use only 0–9 and a–f, in pairs (e.g. “48656c6c6f”). Odd length or illegal characters found.');
      }
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(b as unknown as Uint8Array<ArrayBuffer>);
      } catch {
        throw new Error('Valid Hex, but the bytes are not UTF-8 text — the data may be binary.');
      }
    }
    case 'binary': {
      const clean = input.trim().replace(/\s+/g, ' ');
      if (clean === '') return '';
      const groups = clean.includes(' ') ? clean.split(' ') : (clean.length % 8 === 0 ? clean.match(/.{1,8}/g)! : [clean]);
      const bytes = new Uint8Array(groups.length);
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i]!;
        if (!/^[01]{8}$/.test(g)) throw new Error(`Invalid binary group "${g}" — use 8 bits of 0/1, groups separated by spaces.`);
        bytes[i] = parseInt(g, 2);
      }
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes as unknown as Uint8Array<ArrayBuffer>);
    }
    case 'rot13': return caesarShift(input, 13);
    case 'caesar': return caesarShift(input, -shift);
  }
}

export function caesarShift(input: string, shift: number): string {
  const s = ((shift % 26) + 26) % 26;
  return input.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + s) % 26) + base);
  });
}
