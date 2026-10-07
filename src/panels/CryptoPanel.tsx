import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Dices, Download, Eye, EyeOff, FileUp, KeyRound, Lock, RefreshCw, Unlock, Upload, X } from 'lucide-react';
import { CRYPTO_ALGOS, algoById, decryptData, encryptData, randomBytes, type CryptoAlgoId } from '../lib/crypto';
import { base64ToBytes, bytesToBase64, bytesToHex, decodeInput, encodeOutput, formatBytes, hexToBytes, readFileBytesWithProgress, utf8ToBytes, type TextFormat } from '../lib/format';
import { generatePassword, passwordStrength } from '../lib/password';
import { CopyButton, CodeOutput, FieldLabel, InlineError, PanelCard, ProgressBar, StrengthBadge, inputCls, monoInputCls, Kbd, cx } from '../components/ui';
import type { HistoryEntry } from '../lib/history';

interface Props {
  onLog: (e: Omit<HistoryEntry, 'id' | 'ts'>) => void;
  restoreSignal: { entry: HistoryEntry; nonce: number } | null;
}

type Mode = 'encrypt' | 'decrypt';
type KeyMode = 'password' | 'rawkey';

const FMT_LABEL: Record<TextFormat, string> = { text: 'Text (UTF-8)', base64: 'Base64', hex: 'Hex' };

function downloadBytes(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function CryptoPanel({ onLog, restoreSignal }: Props) {
  const [mode, setMode] = useState<Mode>('encrypt');
  const [algo, setAlgo] = useState<CryptoAlgoId>('aes-gcm-256');
  const [keyMode, setKeyMode] = useState<KeyMode>('password');
  const [input, setInput] = useState('Secret message for Cryptex');
  const [inFmt, setInFmt] = useState<TextFormat>('text');
  const [outFmt, setOutFmt] = useState<TextFormat>('base64');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rawKey, setRawKey] = useState('');
  const [saltHex, setSaltHex] = useState('');
  const [ivHex, setIvHex] = useState('');
  const [iterations, setIterations] = useState(210000);
  const [result, setResult] = useState('');
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [meta, setMeta] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileMode, setFileMode] = useState(false);
  const [fileObj, setFileObj] = useState<{ name: string; size: number; bytes: Uint8Array } | null>(null);
  const [fileErr, setFileErr] = useState('');
  const [readingFile, setReadingFile] = useState(false);
  const [fileProgress, setFileProgress] = useState<number | null>(null);
  const [roundTrip, setRoundTrip] = useState<'ok' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const algoInfo = algoById(algo);
  const pw = passwordStrength(password);
  // raw-key strength: score by effective key length in bits
  const rawKeyBits = (() => {
    try { return hexToBytes(rawKey.trim()).length * 8; } catch { return 0; }
  })();
  const rawKeyMeter = rawKeyBits >= algoInfo.keyBytes * 8
    ? { label: 'Strong', cls: 'bg-emerald-500', pct: 100 }
    : rawKeyBits >= 128
      ? { label: 'Medium', cls: 'bg-amber-500', pct: 66 }
      : rawKeyBits > 0
        ? { label: 'Weak', cls: 'bg-red-500', pct: 33 }
        : { label: 'Empty', cls: 'bg-slate-200 dark:bg-white/10', pct: 0 };

  useEffect(() => {
    if (!restoreSignal || restoreSignal.entry.section !== 'crypto') return;
    const p = restoreSignal.entry.payload ?? {};
    const s = (k: string) => (typeof p[k] === 'string' ? (p[k] as string) : undefined);
    const n = (k: string) => (typeof p[k] === 'number' ? (p[k] as number) : undefined);
    if (s('mode') === 'encrypt' || s('mode') === 'decrypt') setMode(s('mode') as Mode);
    if (s('algo')) setAlgo(s('algo') as CryptoAlgoId);
    if (s('keyMode') === 'password' || s('keyMode') === 'rawkey') setKeyMode(s('keyMode') as KeyMode);
    if (s('input') !== undefined) setInput(s('input')!);
    if (s('inFmt')) setInFmt(s('inFmt') as TextFormat);
    if (s('outFmt')) setOutFmt(s('outFmt') as TextFormat);
    if (s('password') !== undefined) setPassword(s('password')!);
    if (s('rawKey') !== undefined) setRawKey(s('rawKey')!);
    if (s('ivHex') !== undefined) setIvHex(s('ivHex')!);
    if (s('saltHex') !== undefined) setSaltHex(s('saltHex')!);
    if (n('iterations') !== undefined) setIterations(n('iterations')!);
    setResult(restoreSignal.entry.output);
  }, [restoreSignal]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-crypto-scope]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); clearAll(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, algo, keyMode, input, inFmt, outFmt, password, rawKey, saltHex, ivHex, iterations, fileObj]);

  function clearAll() {
    setInput(''); setResult(''); setResultBytes(null); setMeta(''); setError(''); setFileObj(null); setSaltHex(''); setIvHex(''); setRoundTrip(null);
  }

  function validate(): string | null {
    if (fileMode) {
      if (readingFile) return 'Still reading the file — please wait a moment.';
      if (!fileObj) return 'No file chosen yet — click the drop zone above to pick a file (up to 8 MB).';
    } else if (!input.trim()) {
      return mode === 'encrypt' ? 'Input is empty — enter some plaintext to encrypt first.' : 'Input is empty — paste a Cryptex package (Base64 or Hex) to decrypt.';
    }
    if (keyMode === 'password') {
      if (!password) return mode === 'encrypt' ? 'Password is empty — enter the password that will derive the encryption key.' : 'Password is empty — enter the same password used for encryption (wrong password = decryption failure).';
      if (mode === 'encrypt' && password.length < 8) return 'Password too short — use at least 8 characters (16+ recommended).';
    } else {
      if (!rawKey.trim()) return 'Key is empty — enter the raw key as hex, or press Generate.';
      try {
        const k = hexToBytes(rawKey);
        if (k.length !== algoInfo.keyBytes) return `Wrong key length — ${algoInfo.name} needs exactly ${algoInfo.keyBytes} bytes (${algoInfo.keyBytes * 2} hex chars); you entered ${k.length} bytes.`;
      } catch { return 'Key is malformed Hex — use only 0–9 and a–f, in pairs (e.g. “0fa3…”).'; }
    }
    if (mode === 'decrypt' && !fileMode) {
      try {
        if (outFmt === 'base64') base64ToBytes(input);
        else if (outFmt === 'hex') hexToBytes(input);
      } catch { return `Malformed ${FMT_LABEL[outFmt]} — the package is truncated or contains illegal characters. Paste the complete output from encryption.`; }
    }
    if (ivHex.trim()) {
      try {
        const v = hexToBytes(ivHex);
        if (algoInfo.ivBytes > 0 && v.length !== algoInfo.ivBytes) return `IV must be exactly ${algoInfo.ivBytes} bytes for ${algoInfo.name} — or leave blank to auto-generate.`;
      } catch { return 'IV is malformed Hex — use only 0–9 and a–f, in pairs, or leave it blank.'; }
    }
    if (saltHex.trim()) {
      try {
        const s = hexToBytes(saltHex);
        if (s.length < 8 || s.length > 32) return 'Salt must be 8–32 bytes.';
      } catch { return 'Salt is malformed Hex — use only 0–9 and a–f, in pairs, or leave it blank.'; }
    }
    if (!Number.isInteger(iterations) || iterations < 1000 || iterations > 2000000) return 'Iterations must be between 1,000 and 2,000,000.';
    return null;
  }

  const validationError = validate();

  async function run() {
    setError(''); setResult(''); setResultBytes(null); setMeta(''); setRoundTrip(null);
    const v = validate();
    if (v) { setError(v); return; }
    setBusy(true);
    try {
      if (mode === 'encrypt') {
        const pt: Uint8Array = fileMode && fileObj ? fileObj.bytes : decodeInput(input, inFmt);
        if (pt.length === 0) throw new Error('Plaintext is empty — enter some text or pick a non-empty file first.');
        if (pt.length > 8 * 1024 * 1024) throw new Error('Too large — 8 MB max for encryption.');
        const encOpts = keyMode === 'password'
          ? { password, saltHex: saltHex.trim() || undefined, ivHex: ivHex.trim() || undefined, iterations }
          : { rawKeyHex: rawKey.trim(), ivHex: ivHex.trim() || undefined };
        const r = await encryptData({ algo, plaintext: pt, ...encOpts });
        // Self-verify: immediately decrypt what we just produced. If the
        // round-trip drifts, surface it instead of showing a bad package.
        const check = await decryptData({
          envelope: r.envelope,
          ...(keyMode === 'password' ? { password } : { rawKeyHex: rawKey.trim() }),
        });
        const same = check.plaintext.length === pt.length && check.plaintext.every((b, i) => b === pt[i]);
        if (!same) throw new Error('Internal verification failed — the package did not round-trip. Please try again.');
        setRoundTrip('ok');
        setResultBytes(r.envelope);
        const text = outFmt === 'text' ? bytesToBase64(r.envelope) : encodeOutput(r.envelope, outFmt);
        const shownFmt = outFmt === 'text' ? 'Base64 (binary-safe fallback — Text cannot hold ciphertext)' : FMT_LABEL[outFmt];
        setResult(text);
        setSaltHex(r.saltHex); setIvHex(r.ivHex);
        setMeta(`${algoInfo.name} · ${formatBytes(pt.length)} → ${formatBytes(r.envelope.length)} · ${shownFmt}${keyMode === 'password' ? ` · PBKDF2 ${iterations.toLocaleString()}×` : ' · raw key'}`);
        onLog({
          section: 'crypto', tool: `Encrypt ${algoInfo.name}`,
          summary: `Encrypt · ${algoInfo.name} · ${formatBytes(pt.length)}`,
          input: fileMode && fileObj ? `[file] ${fileObj.name}` : input.slice(0, 500),
          output: text,
          payload: { mode, algo, keyMode, input, inFmt, outFmt, password, rawKey, ivHex: r.ivHex, saltHex: r.saltHex, iterations },
        });
      } else {
        let env: Uint8Array;
        if (fileMode && fileObj) {
          env = fileObj.bytes;
        } else {
          env = outFmt === 'base64' ? base64ToBytes(input) : outFmt === 'hex' ? hexToBytes(input) : utf8ToBytes(input);
        }
        const d = await decryptData({
          envelope: env,
          ...(keyMode === 'password' ? { password } : { rawKeyHex: rawKey.trim() }),
        });
        setResultBytes(d.plaintext);
        let text: string;
        let metaStr = '';
        try {
          text = encodeOutput(d.plaintext, inFmt);
        } catch {
          text = bytesToBase64(d.plaintext);
          metaStr = `${d.algo.name} · decrypted ${formatBytes(d.plaintext.length)} · output shown as Base64 (not valid ${FMT_LABEL[inFmt]})`;
        }
        if (!metaStr) metaStr = `${d.algo.name} · decrypted ${formatBytes(d.plaintext.length)}${d.iterations ? ` · PBKDF2 ${d.iterations.toLocaleString()}×` : ' · raw key'}${d.saltHex ? ` · salt ${d.saltHex.slice(0, 16)}…` : ''}`;
        setMeta(metaStr);
        setResult(text);
        setSaltHex(d.saltHex); setIvHex(d.ivHex);
        onLog({
          section: 'crypto', tool: `Decrypt ${d.algo.name}`,
          summary: `Decrypt · ${d.algo.name} · ${formatBytes(d.plaintext.length)}`,
          input: fileMode && fileObj ? `[file] ${fileObj.name}` : input.slice(0, 500),
          output: text,
          payload: { mode, algo: d.algo.id, keyMode, input, inFmt, outFmt, password, rawKey, ivHex: d.ivHex, saltHex: d.saltHex, iterations },
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleEncFile(f: File) {
    setFileErr('');
    setFileObj(null);
    if (f.size > 8 * 1024 * 1024) { setFileErr('File too large — 8 MB max for encryption. Pick a smaller file.'); return; }
    if (f.size === 0) { setFileErr('That file is empty — nothing to process.'); return; }
    setReadingFile(true);
    setFileProgress(f.size > 512 * 1024 ? 0 : null);
    try {
      const bytes = await readFileBytesWithProgress(f, (p) => setFileProgress(p));
      setFileObj({ name: f.name, size: f.size, bytes });
    } catch {
      setFileErr('Could not read that file — it may be locked or unreadable.');
    } finally {
      setReadingFile(false);
      setFileProgress(null);
    }
  }

  return (
    <div data-crypto-scope className="panel-enter space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Encrypt / Decrypt</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Two-way protection with password-derived keys. Self-describing packages — decryption auto-detects the algorithm.</p>
      </div>

      {/* mode + algo */}
      <PanelCard>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/10" role="tablist" aria-label="Mode">
            {(['encrypt', 'decrypt'] as Mode[]).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setResult(''); setError(''); setMeta(''); }}
                className={cx('flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all', mode === m ? 'bg-white text-slate-900 shadow dark:bg-white/15 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200')}>
                {m === 'encrypt' ? <Lock size={14} /> : <Unlock size={14} />}
                {m === 'encrypt' ? 'Encrypt' : 'Decrypt'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> run · <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd> clear</div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CRYPTO_ALGOS.map((a) => (
            <button key={a.id} onClick={() => { setAlgo(a.id); setRawKey(''); }} aria-pressed={algo === a.id}
              className={cx('rounded-xl border p-3.5 text-left transition-all', algo === a.id ? 'border-purple-500/60 bg-purple-500/[.07] shadow-sm dark:border-purple-400/50 dark:bg-purple-400/[.08]' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/[.03]')}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[13px] font-bold text-slate-900 dark:text-white">{a.name}</span>
                <StrengthBadge level={a.badge} />
              </div>
              {a.legacy && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/[.07] px-2 py-1 text-[11px] font-bold text-red-700 dark:text-red-300" role="note">
                  <AlertTriangle size={12} className="shrink-0" /> Legacy — decrypt old data only
                </p>
              )}
              <p className="mt-1 text-[12px] leading-snug text-slate-500 dark:text-slate-400">{a.desc}</p>
              <p className="mt-1.5 font-mono text-[10.5px] text-slate-400">key {a.keyBytes * 8}-bit{a.ivBytes ? ` · iv ${a.ivBytes * 8}-bit` : ' · no IV'}</p>
            </button>
          ))}
          <div className="rounded-xl border border-dashed border-slate-300 p-3.5 text-[12px] leading-relaxed text-slate-500 dark:border-white/15 dark:text-slate-400">
            <strong className="font-semibold text-slate-700 dark:text-slate-200">Which to pick?</strong><br />
            <span className="font-mono font-semibold">AES-256-GCM</span> for anything new — it authenticates, so tampering is detected. CBC variants need a separate MAC for that.
          </div>
        </div>
        {algoInfo.legacy && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/[.07] p-3.5 text-[13px] text-red-800 dark:text-red-200" role="alert">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <p><strong>Legacy algorithm — {algoInfo.name} is broken.</strong> {algoInfo.id === 'rc4' ? 'RC4 has severe biases (used to break WEP & TLS). Included only for decrypting legacy data or study.' : '3DES offers only ~112-bit effective security with 64-bit blocks (Sweet32). Decrypt old data, then re-encrypt with AES-256-GCM.'}</p>
          </div>
        )}
      </PanelCard>

      {/* key material */}
      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white"><KeyRound size={16} className="text-purple-500" /> Key material</h2>          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[13px] dark:bg-white/10" role="tablist" aria-label="Key source">
            {(['password', 'rawkey'] as KeyMode[]).map((k) => (
              <button key={k} role="tab" aria-selected={keyMode === k} onClick={() => setKeyMode(k)}
                className={cx('rounded-md px-3 py-1.5 font-semibold transition-all', keyMode === k ? 'bg-white text-slate-900 shadow dark:bg-white/15 dark:text-white' : 'text-slate-500 dark:text-slate-400')}>{k === 'password' ? 'Password (PBKDF2)' : 'Raw key (hex)'}</button>
            ))}
          </div>
        </div>

        {keyMode === 'password' ? (
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div>
              <FieldLabel htmlFor="cx-pass">Password</FieldLabel>
              <div className="relative">
                <input id="cx-pass" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'encrypt' ? 'Choose a strong password…' : 'Enter the encryption password…'} autoComplete="off" className={cx(inputCls, 'pr-20 font-mono')} />
                <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-1">
                  <button type="button" onClick={() => setShowPw(!showPw)} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  {mode === 'encrypt' && (
                    <button type="button" onClick={() => setPassword(generatePassword(20))} className="rounded-lg p-1.5 text-purple-500 hover:bg-purple-500/10" aria-label="Generate strong password" title="Generate strong password"><Dices size={15} /></button>
                  )}
                </div>
              </div>
              {password ? (
                <div className="mt-2.5" aria-live="polite">
                  <div className="flex gap-1" role="img" aria-label={`Password strength: ${pw.label}`}>
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={cx('h-1.5 flex-1 rounded-full transition-colors', pw.score >= i ? (pw.score <= 1 ? 'bg-red-500' : pw.score === 2 ? 'bg-amber-500' : pw.score === 3 ? 'bg-lime-500' : 'bg-emerald-500') : 'bg-slate-200 dark:bg-white/10')} />
                    ))}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{pw.label} · ~{pw.entropy} bits entropy</span>
                    {pw.tips[0] && <span className="text-slate-400">{pw.tips[0]}</span>}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">Weak passwords fall fast — 16+ mixed characters earns Strong.</p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500" role="status">No password yet — the strength meter appears as you type.</p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <FieldLabel htmlFor="cx-iter">PBKDF2 iterations</FieldLabel>
                <input id="cx-iter" type="number" min={1000} max={2000000} step={1000} value={iterations} onChange={(e) => setIterations(parseInt(e.target.value) || 0)} className={inputCls} />
                <p className="mt-1 text-[11px] text-slate-400">SHA-256 · 16-byte salt · default 210,000 (OWASP ’23)</p>
              </div>
              <div>
                <FieldLabel htmlFor="cx-salt">Salt (hex, optional)</FieldLabel>
                <div className="flex gap-1.5">
                  <input id="cx-salt" value={saltHex} onChange={(e) => setSaltHex(e.target.value)} placeholder="auto-generate" spellCheck={false} className={cx(monoInputCls, '!py-2 text-xs')} />
                  <button type="button" onClick={() => setSaltHex(bytesToHex(randomBytes(16)))} className="shrink-0 rounded-xl border border-slate-200 px-2.5 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5" aria-label="Generate salt" title="Generate salt"><RefreshCw size={14} /></button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <FieldLabel htmlFor="cx-rawkey">Raw key — exactly {algoInfo.keyBytes * 2} hex chars ({algoInfo.keyBytes} bytes)</FieldLabel>
            <div className="flex gap-1.5">
              <input id="cx-rawkey" value={rawKey} onChange={(e) => setRawKey(e.target.value)} placeholder={`${algoInfo.keyBytes * 2} hex characters…`} spellCheck={false} className={monoInputCls} aria-label={`Raw key in hex, ${algoInfo.keyBytes * 2} characters required`} />
              <button type="button" onClick={() => setRawKey(bytesToHex(randomBytes(algoInfo.keyBytes)))} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-purple-500 active:scale-95" title="Generate random key"><Dices size={15} /> Generate</button>
            </div>
            <div className="mt-2.5" aria-live="polite">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" role="img" aria-label={`Key strength: ${rawKeyMeter.label}`}>
                <div className={cx('h-full rounded-full transition-all', rawKeyMeter.cls)} style={{ width: `${Math.max(rawKeyMeter.pct, rawKey.trim() ? 4 : 0)}%` }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Key strength: {rawKeyMeter.label}{rawKeyBits > 0 ? ` · ${rawKeyBits} bits entered` : ''}</span>
                <span className="text-slate-400">{rawKeyBits === algoInfo.keyBytes * 8 ? `Full ${algoInfo.keyBytes * 8}-bit key ✓` : `Needs ${algoInfo.keyBytes * 2} hex chars`}</span>
              </div>
            </div>
          </div>
        )}

        {algoInfo.ivBytes > 0 && (
          <div className="mt-3">
            <FieldLabel htmlFor="cx-iv">IV / nonce (hex, optional — auto-generated if blank)</FieldLabel>
            <div className="flex gap-1.5">
              <input id="cx-iv" value={ivHex} onChange={(e) => setIvHex(e.target.value)} placeholder={`${algoInfo.ivBytes * 2} hex chars · blank = random`} spellCheck={false} className={cx(monoInputCls, '!py-2 text-xs')} />
              <button type="button" onClick={() => setIvHex(bytesToHex(randomBytes(algoInfo.ivBytes)))} className="shrink-0 rounded-xl border border-slate-200 px-2.5 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5" aria-label="Generate IV" title="Generate IV"><RefreshCw size={14} /></button>
            </div>
          </div>
        )}
      </PanelCard>

      {/* data */}
      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">{mode === 'encrypt' ? <Lock size={16} className="text-purple-500" /> : <Unlock size={16} className="text-purple-500" />} {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext package'}</h2>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <button type="button" onClick={() => setFileMode(!fileMode)} aria-pressed={fileMode} aria-label={fileMode ? 'Switch back to text input' : 'Switch to file encryption mode'} className={cx('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-semibold transition-all', fileMode ? 'border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-300' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5')}><FileUp size={13} /> {fileMode ? 'File mode on' : 'Encrypt a file'}</button>
            <label className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">{mode === 'encrypt' ? 'In:' : 'Out:'}
              <select value={inFmt} onChange={(e) => setInFmt(e.target.value as TextFormat)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200" aria-label={mode === 'encrypt' ? 'Input format' : 'Output format'}>
                {(Object.keys(FMT_LABEL) as TextFormat[]).map((f) => <option key={f} value={f}>{FMT_LABEL[f]}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">{mode === 'encrypt' ? 'Package:' : 'Package in:'}
              <select value={outFmt} onChange={(e) => setOutFmt(e.target.value as TextFormat)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200" aria-label="Package format">
                <option value="base64">Base64</option><option value="hex">Hex</option>
              </select>
            </label>
          </div>
        </div>

        {fileMode ? (
          <div className="mt-3">
            <div role="button" tabIndex={0} aria-label="Choose a file" onClick={() => !readingFile && fileRef.current?.click()} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !readingFile) { e.preventDefault(); fileRef.current?.click(); } }}
              aria-busy={readingFile}
              className={cx('flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 hover:border-purple-400 dark:border-white/15 dark:text-slate-400', readingFile && 'pointer-events-none opacity-70')}>
              <Upload size={17} /> {readingFile ? <span>Reading file…</span> : fileObj ? <span className="font-semibold text-slate-700 dark:text-slate-200">{fileObj.name} · {formatBytes(fileObj.size)}</span> : (mode === 'encrypt' ? 'Click to pick a file to encrypt (≤ 8 MB)' : 'Click to pick an encrypted file to decrypt (≤ 8 MB)')}
              {fileObj && !readingFile && <button type="button" aria-label="Remove file" onClick={(e) => { e.stopPropagation(); setFileObj(null); }} className="rounded-md p-1 hover:text-red-500"><X size={14} /></button>}
              <input ref={fileRef} type="file" className="hidden" aria-label="Choose a file to process" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleEncFile(f); e.target.value = ''; }} />
            </div>
            {readingFile && (
              <div className="mt-2.5 space-y-1.5" aria-live="polite">
                <ProgressBar value={fileProgress} label="File read progress" />
                <p className="text-xs text-slate-400">{fileProgress === null ? 'Reading file…' : `Reading file… ${fileProgress}%`}</p>
              </div>
            )}
            {!readingFile && fileObj && (
              <p className="mt-2 text-xs text-slate-400" role="status">Loaded <strong>{fileObj.name}</strong> ({formatBytes(fileObj.size)}) — press <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> or the {mode === 'encrypt' ? 'Encrypt' : 'Decrypt'} button to process it locally.</p>
            )}
            <InlineError msg={fileErr} />
          </div>
        ) : (
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={4} spellCheck={false}
            placeholder={mode === 'encrypt' ? `Plaintext as ${FMT_LABEL[inFmt]}…` : 'Paste the Cryptex package (Base64 or Hex)…'}
            className={cx(monoInputCls, 'mt-3')} aria-label={mode === 'encrypt' ? 'Plaintext input' : 'Ciphertext input'} />
        )}

        <InlineError msg={error} />

        <div className="mt-3">
          <button
            onClick={run}
            disabled={busy}
            aria-disabled={busy}
            aria-describedby={validationError ? 'cx-validation-hint' : undefined}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-600/25 transition-all hover:bg-purple-500 active:scale-95 disabled:cursor-wait disabled:opacity-70 disabled:shadow-none"
          >
            {busy ? <RefreshCw size={15} className="animate-spin" /> : mode === 'encrypt' ? <Lock size={15} /> : <Unlock size={15} />}
            {busy ? 'Working…' : mode === 'encrypt' ? `Encrypt with ${algoInfo.name}` : 'Decrypt package'}
          </button>
          <button onClick={clearAll} className="ml-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5">Clear</button>
          {validationError && !busy && <span id="cx-validation-hint" className="mt-2 block text-xs text-slate-400">Check before running: {validationError}</span>}
        </div>

        {busy && (
          <div className="mt-3 space-y-1.5" aria-live="polite">
            <ProgressBar value={null} label="Encryption in progress" />
            <p className="text-xs text-slate-400">Deriving key & encrypting locally… large inputs may take a moment.</p>
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{mode === 'encrypt' ? 'Encrypted package' : 'Decrypted result'}</span>
              <div className="flex gap-1.5">
                <CopyButton text={result} />
                {resultBytes && (
                  <button onClick={() => downloadBytes(resultBytes, mode === 'encrypt' ? 'cryptex-encrypted.bin' : 'cryptex-decrypted.bin')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-slate-100"><Download size={13} /> .bin</button>
                )}
              </div>
            </div>
            {meta && <p className="font-mono text-[11.5px] text-slate-400">{meta}</p>}
            {roundTrip === 'ok' && mode === 'encrypt' && (
              <p className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11.5px] font-bold text-emerald-700 dark:text-emerald-300" role="status">
                ✓ Round-trip verified — decrypting this package returns the exact original input
              </p>
            )}
            <CodeOutput text={result} maxHeight={240} />
          </div>
        )}
      </PanelCard>

      <p className="text-[12.5px] leading-relaxed text-slate-400 dark:text-slate-500">Packages are self-describing (version · algorithm · PBKDF2 params · salt · IV · ciphertext) so decryption needs only the password or key. AES-GCM additionally verifies integrity — a wrong password or any tampering fails loudly instead of silently.</p>
    </div>
  );
}
