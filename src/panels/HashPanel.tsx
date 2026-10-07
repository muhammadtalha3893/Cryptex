import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Equal, FileUp, KeyRound, ShieldCheck, ShieldAlert, ShieldX, X } from 'lucide-react';
import { HASH_ALGOS, hashAll, hmacAll, hashAllBytes, type HashAlgoId } from '../lib/hashing';
import { formatBytes, readFileBytesWithProgress } from '../lib/format';
import { CopyButton, FieldLabel, InlineError, PanelCard, ProgressBar, StrengthBadge, inputCls, monoInputCls, Kbd, cx } from '../components/ui';
import type { HistoryEntry } from '../lib/history';

interface Props {
  onLog: (e: Omit<HistoryEntry, 'id' | 'ts'>) => void;
  restoreSignal: { entry: HistoryEntry; nonce: number } | null;
}

export default function HashPanel({ onLog, restoreSignal }: Props) {
  const [input, setInput] = useState('Hello, Cryptex!');
  const [hmacOn, setHmacOn] = useState(false);
  const [hmacKey, setHmacKey] = useState('');
  const [compareAlgo, setCompareAlgo] = useState<HashAlgoId>('sha256');
  const [cmpA, setCmpA] = useState('');
  const [cmpB, setCmpB] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [fileHashes, setFileHashes] = useState<Record<HashAlgoId, string> | null>(null);
  const [fileErr, setFileErr] = useState('');
  const [hashing, setHashing] = useState(false);
  const [hashProgress, setHashProgress] = useState<number | null>(null);
  // live indicator: input while hashing results lag by the debounce window
  const [live, setLive] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const loggedRef = useRef('');

  // ---- live hashing, debounced ~150ms so typing stays instant-feeling ----
  const [debouncedInput, setDebouncedInput] = useState(input);
  useEffect(() => {
    setLive(false);
    const t = setTimeout(() => {
      setDebouncedInput(input);
      setLive(true);
    }, 150);
    return () => clearTimeout(t);
  }, [input]);

  const results = useMemo(() => {
    try {
      if (!debouncedInput) return null;
      return hmacOn && hmacKey ? hmacAll(debouncedInput, hmacKey) : hashAll(debouncedInput);
    } catch {
      return null;
    }
  }, [debouncedInput, hmacOn, hmacKey]);

  // Compare-anything tool: two free inputs — compare text OR hashes directly
  const compareAny = useMemo(() => {
    const a = cmpA.trim();
    const b = cmpB.trim();
    if (!a || !b) return null;
    const hexA = /^[0-9a-fA-F\s]+$/.test(a) && a.replace(/\s+/g, '').length >= 32 && a.replace(/\s+/g, '').length % 2 === 0;
    const hexB = /^[0-9a-fA-F\s]+$/.test(b) && b.replace(/\s+/g, '').length >= 32 && b.replace(/\s+/g, '').length % 2 === 0;
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
    // both look like digests -> compare digests directly
    if (hexA && hexB) {
      return norm(a) === norm(b)
        ? ({ ok: true, msg: 'Match — the two hashes are identical.' } as const)
        : ({ ok: false, msg: 'No Match — the two hashes differ.' } as const);
    }
    // otherwise hash both inputs with the selected algo and compare
    try {
      const ha = (hmacOn && hmacKey ? hmacAll(a, hmacKey) : hashAll(a))[compareAlgo]!.toLowerCase();
      const hb = (hmacOn && hmacKey ? hmacAll(b, hmacKey) : hashAll(b))[compareAlgo]!.toLowerCase();
      return ha === hb
        ? ({ ok: true, msg: `Match — both inputs produce the same ${HASH_ALGOS.find((x) => x.id === compareAlgo)?.name} digest.` } as const)
        : ({ ok: false, msg: `No Match — the ${HASH_ALGOS.find((x) => x.id === compareAlgo)?.name} digests differ.` } as const);
    } catch {
      return { ok: false, msg: 'Could not compare — check the inputs.' } as const;
    }
  }, [cmpA, cmpB, compareAlgo, hmacOn, hmacKey]);

  // log text hashing (debounced)
  useEffect(() => {
    if (!results || !debouncedInput) return;
    const key = `${debouncedInput}|${hmacOn}|${hmacKey}|${compareAlgo}`;
    const t = setTimeout(() => {
      if (loggedRef.current === key) return;
      loggedRef.current = key;
      onLog({
        section: 'hash',
        tool: hmacOn && hmacKey ? 'HMAC' : 'Hash',
        summary: `${hmacOn && hmacKey ? 'HMAC' : 'Hash'} · ${debouncedInput.length} chars`,
        input: debouncedInput.slice(0, 500),
        output: results[compareAlgo] ?? '',
        payload: { input: debouncedInput, hmacOn: hmacOn ? 1 : 0, hmacKey, compareAlgo },
      });
    }, 2500);
    return () => clearTimeout(t);
  }, [results, debouncedInput, hmacOn, hmacKey, compareAlgo, onLog]);

  // restore
  useEffect(() => {
    if (!restoreSignal || restoreSignal.entry.section !== 'hash') return;
    const p = restoreSignal.entry.payload ?? {};
    if (typeof p.input === 'string') setInput(p.input);
    if (typeof p.hmacKey === 'string') setHmacKey(p.hmacKey);
    if (p.hmacOn === 1) setHmacOn(true);
    if (typeof p.compareAlgo === 'string') setCompareAlgo(p.compareAlgo as HashAlgoId);
  }, [restoreSignal]);

  // shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        const t = e.target as HTMLElement;
        if (!t.closest('[data-hash-scope]')) return;
        e.preventDefault();
        setInput(''); setCmpA(''); setCmpB(''); setFileHashes(null); setFileInfo(null); setFileErr('');
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  async function handleFile(f: File) {
    setFileErr('');
    if (f.size > 50 * 1024 * 1024) { setFileErr('File too large — 50 MB max for in-browser hashing.'); return; }
    if (f.size === 0) { setFileErr('That file is empty — nothing to hash.'); return; }
    setHashing(true);
    setHashProgress(f.size > 1024 * 1024 ? 0 : null);
    setFileHashes(null);
    setFileInfo({ name: f.name, size: f.size });
    try {
      const buf = await readFileBytesWithProgress(f, (p) => setHashProgress(p));
      setHashProgress(100);
      const hashes = hashAllBytes(buf);
      setFileHashes(hashes);
      onLog({
        section: 'hash', tool: 'File hash',
        summary: `File · ${f.name} (${formatBytes(f.size)})`,
        input: `${f.name} · ${f.size} bytes`,
        output: hashes.sha256,
        payload: {},
      });
    } catch {
      setFileErr('Could not read that file — it may be locked or unreadable.');
      setFileInfo(null);
    } finally {
      setHashing(false);
      setHashProgress(null);
    }
  }

  return (
    <div data-hash-scope className="panel-enter space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Hash Generator</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">One-way fingerprints — live as you type. Everything stays on this device.</p>
      </div>

      <PanelCard>
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor="hash-input">Input text</FieldLabel>
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400" aria-live="polite">
            <span className={cx('h-1.5 w-1.5 rounded-full bg-emerald-500', !live && 'live-dot bg-blue-500')} aria-hidden="true" />
            {live ? 'LIVE' : 'TYPING…'}
          </span>
        </div>
        <textarea
          id="hash-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          placeholder="Type or paste text to hash…"
          className={monoInputCls}
          aria-label="Text to hash"
        />
        <div className="mt-1 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
          <span>{input.length.toLocaleString()} characters · {new TextEncoder().encode(input).length.toLocaleString()} bytes UTF-8</span>
          <span className="hidden sm:inline"><Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> to clear</span>
        </div>

        {!input && (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500" role="status">
            Input is empty — start typing above and all 8 digests appear instantly.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[.03]">
          <button
            type="button" role="switch" aria-checked={hmacOn} aria-label="Toggle HMAC mode"
            onClick={() => setHmacOn(!hmacOn)}
            className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors', hmacOn ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700')}
          >
            <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', hmacOn ? 'left-[22px]' : 'left-0.5')} />
          </button>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200"><KeyRound size={15} className="text-blue-500" /> HMAC mode</span>
          <span className="text-xs text-slate-400">Keyed hash — proves authenticity as well as integrity.</span>
          {hmacOn && (
            <input
              value={hmacKey}
              onChange={(e) => setHmacKey(e.target.value)}
              placeholder="HMAC secret key…"
              aria-label="HMAC secret key"
              className={cx(inputCls, 'min-w-[200px] flex-1 font-mono')}
            />
          )}
        </div>
        {hmacOn && !hmacKey && <InlineError msg="Enter an HMAC key — results below are plain hashes until you do." />}
      </PanelCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {HASH_ALGOS.map((a) => (
          <PanelCard key={a.id} className="!p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{a.name}</span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-500 dark:bg-white/10 dark:text-slate-400">{a.bits}-bit</span>
              </div>
              <StrengthBadge level={a.strength} />
            </div>
            {(a.id === 'md5' || a.id === 'sha1') && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/[.07] px-2 py-1 text-[11px] font-bold text-red-700 dark:text-red-300" role="note">
                <ShieldAlert size={12} className="shrink-0" /> Broken — checksum use only, never for security
              </p>
            )}
            <div className="mt-2.5 break-all rounded-lg bg-slate-50 p-2.5 font-mono text-[12px] leading-relaxed text-slate-700 dark:bg-black/40 dark:text-slate-300" aria-live="polite">
              {results ? results[a.id] : <span className="opacity-40">—</span>}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11.5px] text-slate-400 dark:text-slate-500">{a.note}</span>
              {results && <CopyButton text={results[a.id]} small />}
            </div>
          </PanelCard>
        ))}
      </div>

      <PanelCard>
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white"><Equal size={16} className="text-blue-500" /> Compare hashes</h2>
        <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">Two inputs, compared. Paste two digests to compare them directly — or two texts to compare their {HASH_ALGOS.find((x) => x.id === compareAlgo)?.name} fingerprints.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_1fr]">
          <div>
            <FieldLabel htmlFor="cmp-algo">Algorithm</FieldLabel>
            <select id="cmp-algo" value={compareAlgo} onChange={(e) => setCompareAlgo(e.target.value as HashAlgoId)} className={inputCls} aria-label="Comparison hash algorithm">
              {HASH_ALGOS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="cmp-a">First value</FieldLabel>
            <input id="cmp-a" value={cmpA} onChange={(e) => setCmpA(e.target.value)} placeholder="Text or digest…" spellCheck={false} className={cx(monoInputCls, compareAny && (compareAny.ok ? '!border-emerald-400' : '!border-red-400'))} aria-label="First value to compare" />
          </div>
          <div>
            <FieldLabel htmlFor="cmp-b">Second value</FieldLabel>
            <input id="cmp-b" value={cmpB} onChange={(e) => setCmpB(e.target.value)} placeholder="Text or digest…" spellCheck={false} className={cx(monoInputCls, compareAny && (compareAny.ok ? '!border-emerald-400' : '!border-red-400'))} aria-label="Second value to compare" />
          </div>
        </div>
        {compareAny ? (
          <div className={cx('mt-3 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold', compareAny.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300')} role="status" aria-live="polite">
            {compareAny.ok ? <ShieldCheck size={16} className="shrink-0" /> : <ShieldX size={16} className="shrink-0" />}
            {compareAny.msg}
            {compareAny.ok && <Check size={15} className="anim-check ml-auto shrink-0" strokeWidth={3} />}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500" role="status">Fill in both fields above to see <strong>Match</strong> or <strong>No Match</strong>.</p>
        )}
      </PanelCard>

      <PanelCard>
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white"><FileUp size={16} className="text-blue-500" /> File hashing</h2>
        <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">Drop a file — it is read and hashed locally, never uploaded.</p>
        <div
          role="button" tabIndex={0} aria-label="Drop a file here or press Enter to browse"
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className={cx(
            'mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all',
            dragOver ? 'border-blue-500 bg-blue-500/10 scale-[1.01]' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-500/[.04] dark:border-white/15 dark:hover:border-blue-400/60'
          )}
        >
          <FileUp size={26} className="text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{hashing ? 'Hashing… keep this tab open' : 'Drag & drop a file here, or click to browse'}</p>
          <p className="mt-0.5 text-xs text-slate-400">Up to 50 MB · read in chunks · processed entirely in memory</p>
          <input ref={fileRef} type="file" className="hidden" aria-label="Choose a file to hash" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        </div>
        {hashing && (
          <div className="mt-3 space-y-1.5" aria-live="polite">
            <ProgressBar value={hashProgress} label="File hashing progress" />
            <p className="text-xs text-slate-400">{hashProgress === null ? 'Reading file…' : `Reading file… ${hashProgress}%`}</p>
          </div>
        )}
        <InlineError msg={fileErr} />
        {!hashing && !fileErr && !fileHashes && fileInfo && (
          <p className="mt-2 text-xs text-slate-400" role="status">Finished reading — computing digests…</p>
        )}
        {fileInfo && fileHashes && (
          <div className="mt-3 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-white/10">
              <span className="truncate text-[13px] font-semibold text-slate-700 dark:text-slate-200">{fileInfo.name} <span className="font-normal text-slate-400">· {formatBytes(fileInfo.size)}</span></span>
              <button onClick={() => { setFileInfo(null); setFileHashes(null); }} className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Clear file"><X size={15} /></button>
            </div>
            <div className="max-h-64 overflow-auto p-2">
              {HASH_ALGOS.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-white/5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{a.short}</span><StrengthBadge level={a.strength} /></div>
                    <div className="mt-0.5 break-all font-mono text-[11.5px] text-slate-500 dark:text-slate-400">{fileHashes[a.id]}</div>
                  </div>
                  <CopyButton text={fileHashes[a.id]} small />
                </div>
              ))}
            </div>
          </div>
        )}
      </PanelCard>

      <div className="flex items-start gap-2.5 rounded-2xl border border-blue-500/20 bg-blue-500/[.06] p-4 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
        {hmacOn ? <KeyRound size={16} className="mt-0.5 shrink-0 text-blue-500" /> : <ShieldAlert size={16} className="mt-0.5 shrink-0 text-blue-500" />}
        <p><strong className="font-semibold">Security note:</strong> {hmacOn ? 'HMAC needs the same secret key to verify. Share the key over a separate secure channel — never alongside the hash.' : <>MD5 and SHA-1 are <strong>broken</strong> — fine for checksums, never for passwords or signatures. Use <strong>SHA-256 / SHA-512 / SHA-3</strong> for security, and a proper KDF (bcrypt, Argon2, PBKDF2) — not a raw hash — for passwords.</>}</p>
      </div>
    </div>
  );
}
