import { ArrowRight, Fingerprint, KeyRound, Lock } from 'lucide-react';
import { HASH_ALGOS } from '../lib/hashing';
import { CRYPTO_ALGOS } from '../lib/crypto';
import { CODECS } from '../lib/codecs';
import { PanelCard, StrengthBadge } from '../components/ui';

const ALGO_INFO: Record<string, { what: string; when: string }> = {
  md5: { what: '128-bit digest. Collisions can be forged in seconds on a laptop — cryptographically dead.', when: 'Non-security checksums only (e.g. spotting accidental file corruption). Never passwords or signatures.' },
  sha1: { what: '160-bit digest. Practically broken since the SHAttered attack (2017) produced a real collision.', when: 'Legacy verification (old Git repos, HMAC-SHA-1 in existing systems). Migrate everything else to SHA-256.' },
  sha224: { what: 'Truncated SHA-256 with a 224-bit digest. Sound, but rarely the best choice.', when: 'Protocols that mandate it. Otherwise just use SHA-256.' },
  sha256: { what: '256-bit digest and the industry default — fast, studied, everywhere.', when: 'File integrity, software downloads, Git, certificates, HMAC-SHA-256.' },
  sha384: { what: 'Truncated SHA-512 with a 384-bit digest and a high security margin.', when: 'Signatures and suites asking for 384-bit strength (TLS, JWT ES384).' },
  sha512: { what: '512-bit digest; especially fast on 64-bit CPUs.', when: 'Long-term integrity, HMAC-SHA-512, base primitive inside password KDFs.' },
  sha3: { what: 'Keccak sponge construction — structurally unrelated to SHA-2, a hedge against shared flaws.', when: 'Future-proof hashing and anywhere SHA-2 diversity is wanted.' },
  ripemd160: { what: '160-bit digest from the 1990s. Unbroken but short by modern standards.', when: 'Bitcoin address creation and legacy interop. Not for new designs.' },
  'aes-gcm-256': { what: 'Authenticated encryption: secrecy plus a tag that detects any tampering or wrong key.', when: 'Default for anything new — messages, files, backups, at-rest secrets.' },
  'aes-cbc-256': { what: 'Classic block mode. Confidential, but malleable without a separate MAC.', when: 'Interop with systems lacking GCM — always pair with HMAC.' },
  'aes-128': { what: 'Lighter AES with 128-bit keys. Still secure, smaller margin than 256-bit.', when: 'Constrained devices or protocols fixed to AES-128.' },
  tripledes: { what: 'Triple-DES (EDE-CBC). Slow, with 64-bit blocks vulnerable to Sweet32 birthday attacks.', when: 'Decrypting legacy data only — then re-encrypt with AES-256-GCM.' },
  rc4: { what: 'Stream cipher with severe keystream biases — broke WEP and was banned from TLS.', when: 'Never for real data. Decrypting museum-grade ciphertext or study only.' },
};
const GUIDES: Array<{ title: string; body: string; when: string; tags: string[] }> = [
  { title: 'Hashing (one-way)', body: 'A hash turns any input into a fixed-length fingerprint. It cannot be reversed — you verify by re-hashing and comparing. Even one changed bit avalanches into a totally different digest.', when: 'File integrity checks, password storage (with salt + KDF), Git commits, deduplication.', tags: ['SHA-256', 'SHA-512', 'SHA-3'] },
  { title: 'Encryption (two-way)', body: 'Encryption scrambles data with a key so only key-holders can reverse it. Authenticated modes like AES-GCM also detect tampering — a wrong key or edited ciphertext fails loudly.', when: 'Secrets at rest, messages, backups, anything that must be readable again later.', tags: ['AES-256-GCM', 'PBKDF2'] },
  { title: 'Key derivation (PBKDF2)', body: 'Passwords are weak keys. PBKDF2 stretches them with a random salt and hundreds of thousands of SHA-256 rounds so brute force becomes expensive. Unique salt per password defeats rainbow tables.', when: 'Every password-based encryption in Cryptex. Use 210,000+ iterations.', tags: ['Salt 16 B', '210k rounds'] },
  { title: 'Encoding (representation)', body: 'Base64, Hex, URL-encoding only change how bytes look as text — they provide zero secrecy. Use them to transport binary safely, never to "hide" data.', when: 'Embedding binary in JSON, URLs, data URIs, debugging digests.', tags: ['Base64', 'Hex'] },
  { title: 'Classical ciphers', body: 'ROT13 and Caesar shift letters by a fixed amount — trivially breakable by frequency analysis. Kept for puzzles, learning, and legacy decoding, not protection.', when: 'Puzzles, teaching substitution concepts, decoding old trivia.', tags: ['ROT13', 'Caesar'] },
  { title: 'JWTs (signed tokens)', body: 'A JWT is three Base64URL parts: header.payload.signature. The payload is readable by anyone — secrecy is not the goal; the signature lets a server verify it was issued untampered.', when: 'Stateless web sessions & API auth. Always verify signatures server-side.', tags: ['Decode ≠ verify'] },
];

export default function LearnPanel() {
  return (
    <div className="panel-enter space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Learn / Security Guide</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Short, practical cards — what each primitive does, and when to reach for it.</p>
      </div>

      <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400" aria-label="Security badge legend">
        <span className="font-bold uppercase tracking-wider">Legend:</span>
        <StrengthBadge level="strong" />
        <StrengthBadge level="weak" />
        <StrengthBadge level="broken" />
      </p>

      {/* one-way vs two-way explainer */}
      <PanelCard className="overflow-hidden">
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">One-way vs two-way, visually</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-blue-500/25 bg-blue-500/[.05] p-5">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400"><Fingerprint size={18} /><span className="text-sm font-extrabold uppercase tracking-wide">One-way · Hashing</span></div>
            <div className="mt-4 flex items-center gap-2 font-mono text-[12px] sm:text-[13px]">
              <span className="rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-white/10 dark:text-white">“hello”</span>
              <ArrowRight size={16} className="shrink-0 text-blue-500" />
              <span className="truncate rounded-lg bg-blue-600 px-3 py-2 text-white">2cf24dba…</span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-base font-bold text-red-500" title="Cannot go back">✕</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">Like a meat grinder: easy forward, impossible backward. You verify by grinding again and comparing results.</p>
          </div>
          <div className="rounded-2xl border border-purple-500/25 bg-purple-500/[.05] p-5">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400"><Lock size={18} /><span className="text-sm font-extrabold uppercase tracking-wide">Two-way · Encryption</span></div>
            <div className="mt-4 flex items-center gap-2 font-mono text-[12px] sm:text-[13px]">
              <span className="rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-white/10 dark:text-white">“hello”</span>
              <ArrowRight size={16} className="shrink-0 text-purple-500" />
              <span className="truncate rounded-lg bg-purple-600 px-3 py-2 text-white">U2FsdGVk…</span>
              <ArrowRight size={16} className="shrink-0 text-purple-500" />
              <span className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-2 shadow-sm dark:bg-white/10 dark:text-white"><KeyRound size={13} className="text-purple-500" />key</span>
            </div>
            <div className="mt-3 flex h-1.5 gap-1">
              <div className="h-full flex-1 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500" />
              <div className="h-full flex-1 rounded-full bg-gradient-to-l from-purple-500 to-fuchsia-500 opacity-60" />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">Like a padlock box: anyone can lock it, but only the key opens it. Lose the key and the data is gone.</p>
          </div>
        </div>
      </PanelCard>

      <div className="grid gap-4 md:grid-cols-2">
        {GUIDES.map((g) => (
          <PanelCard key={g.title}>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{g.title}</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">{g.body}</p>
            <p className="mt-2.5 text-[13px] text-slate-500 dark:text-slate-400"><strong className="font-semibold text-slate-700 dark:text-slate-200">Use for:</strong> {g.when}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {g.tags.map((t) => <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">{t}</span>)}
            </div>
          </PanelCard>
        ))}
      </div>

      <PanelCard>
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Every algorithm, at a glance</h2>
        <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">What it is, when to use it, and its security level.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[...HASH_ALGOS.map((a) => ({ id: a.id, name: a.name, kind: 'Hash', level: a.strength as 'broken' | 'weak' | 'strong' | 'ok' | 'legacy' })), ...CRYPTO_ALGOS.map((a) => ({ id: a.id, name: a.name, kind: 'Cipher', level: a.badge }))].map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[13px] font-bold text-slate-900 dark:text-white">{a.name}</span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-400">{a.kind}</span>
                <span className="ml-auto"><StrengthBadge level={a.level} /></span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{ALGO_INFO[a.id]?.what}</p>
              <p className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400"><strong className="font-semibold text-slate-700 dark:text-slate-200">Use for:</strong> {ALGO_INFO[a.id]?.when}</p>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard>
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Algorithm reference</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead><tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 dark:bg-white/[.04]"><th className="px-4 py-2.5 font-bold">Algorithm</th><th className="px-4 py-2.5 font-bold">Kind</th><th className="px-4 py-2.5 font-bold">Verdict</th><th className="px-4 py-2.5 font-bold">Notes</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {HASH_ALGOS.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[.02]">
                  <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-100">{a.name}</td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">Hash</td>
                  <td className="px-4 py-2.5"><StrengthBadge level={a.strength} /></td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{a.note}</td>
                </tr>
              ))}
              {CRYPTO_ALGOS.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[.02]">
                  <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-100">{a.name}</td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">Cipher</td>
                  <td className="px-4 py-2.5"><StrengthBadge level={a.badge} /></td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{a.desc}</td>
                </tr>
              ))}
              {CODECS.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[.02]">
                  <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-100">{c.name}</td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">Encoding</td>
                  <td className="px-4 py-2.5"><span className="inline-flex items-center rounded-full border border-slate-300/60 bg-slate-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Neutral</span></td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{c.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/[.06] p-5 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">
        <strong className="font-bold text-slate-800 dark:text-slate-100">Golden rules:</strong>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>Need to verify without storing the secret? <strong>Hash</strong> (with salt + KDF for passwords).</li>
          <li>Need to read it back later? <strong>Encrypt</strong> with AES-256-GCM and back up the key.</li>
          <li>Just moving bytes through text? <strong>Encode</strong> — and never mistake it for security.</li>
          <li>In doubt, choose the boring standard: SHA-256, AES-256-GCM, PBKDF2 with high iterations.</li>
        </ol>
      </div>
    </div>
  );
}
