export interface JwtPart {
  raw: string;
  json: unknown | null;
  pretty: string;
  error?: string;
}

export interface JwtResult {
  header: JwtPart;
  payload: JwtPart;
  signature: string;
  claims: {
    alg?: string;
    typ?: string;
    exp?: number;
    iat?: number;
    nbf?: number;
    iss?: string;
    sub?: string;
    aud?: unknown;
  };
  expiryLabel: string;
  expiryState: 'valid' | 'expired' | 'notyet' | 'none';
}

import { base64UrlToBytes } from './format';

function decodePart(raw: string): JwtPart {
  try {
    const bytes = base64UrlToBytes(raw);
    const text = new TextDecoder().decode(bytes);
    const json = JSON.parse(text);
    return { raw, json, pretty: JSON.stringify(json, null, 2) };
  } catch (e) {
    return { raw, json: null, pretty: '', error: e instanceof Error ? e.message : 'Could not decode this segment.' };
  }
}

export function decodeJwt(token: string, now = Date.now()): JwtResult {
  const t = token.trim();
  if (!t) throw new Error('Input is empty — paste a JWT (three Base64URL parts joined by dots) to decode it.');
  if (/\s/.test(t)) throw new Error('Invalid JWT format — tokens contain no spaces. Paste the full token: header.payload.signature');
  const parts = t.split('.');
  if (parts.length !== 3) throw new Error(`Invalid JWT format — a token has exactly 3 dot-separated parts, found ${parts.length}. Paste the full token (header.payload.signature).`);
  const [hRaw = '', pRaw = '', sig = ''] = parts;
  if (!hRaw || !pRaw) throw new Error('Invalid JWT format — the header or payload segment is empty. Expected header.payload.signature');
  if (!sig) throw new Error('Invalid JWT format — the signature segment is empty. Expected header.payload.signature (use “Load sample” to see a valid token).');
  const header = decodePart(hRaw);
  const payload = decodePart(pRaw);
  if (header.error) throw new Error('Invalid JWT header — it is not valid Base64URL-encoded JSON (' + header.error + ').');
  if (payload.error) throw new Error('Invalid JWT payload — it is not valid Base64URL-encoded JSON (' + payload.error + ').');
  const h = (header.json ?? {}) as Record<string, unknown>;
  const p = (payload.json ?? {}) as Record<string, unknown>;
  const exp = typeof p.exp === 'number' ? p.exp : undefined;
  const iat = typeof p.iat === 'number' ? p.iat : undefined;
  const nbf = typeof p.nbf === 'number' ? p.nbf : undefined;
  let expiryLabel = 'No exp claim — token never expires by itself';
  let expiryState: JwtResult['expiryState'] = 'none';
  if (exp !== undefined) {
    const d = new Date(exp * 1000);
    const diff = exp * 1000 - now;
    if (diff < 0) {
      expiryState = 'expired';
      expiryLabel = `Expired ${Math.abs(Math.round(diff / 1000 / 60))} min ago · ${d.toLocaleString()}`;
    } else {
      expiryState = 'valid';
      const mins = Math.round(diff / 1000 / 60);
      const when = mins < 60 ? `in ${mins} min` : mins < 1440 ? `in ${(mins / 60).toFixed(1)} h` : `in ${(mins / 1440).toFixed(1)} days`;
      expiryLabel = `Valid — expires ${when} · ${d.toLocaleString()}`;
    }
  }
  if (expiryState !== 'expired' && nbf !== undefined && nbf * 1000 > now) {
    expiryState = 'notyet';
    expiryLabel = `Not valid yet — nbf ${new Date(nbf * 1000).toLocaleString()}`;
  }
  return {
    header, payload, signature: sig,
    claims: {
      alg: typeof h.alg === 'string' ? h.alg : undefined,
      typ: typeof h.typ === 'string' ? h.typ : undefined,
      exp, iat, nbf,
      iss: typeof p.iss === 'string' ? p.iss : undefined,
      sub: typeof p.sub === 'string' ? p.sub : undefined,
      aud: p.aud,
    },
    expiryLabel, expiryState,
  };
}

export const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkF2YSBDcnlwdG8iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MjU3MTIwMDAsImV4cCI6MTg5MzQ1NjAwMCwiaXNzIjoiY3J5cHRleC5hcHAifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
