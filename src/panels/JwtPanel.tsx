import { useEffect, useState } from 'react';
import { AlertTriangle, Clock3, Fingerprint, KeyRound, ShieldAlert, Sparkles } from 'lucide-react';
import { SAMPLE_JWT, decodeJwt } from '../lib/jwt';
import { CopyButton, FieldLabel, InlineError, PanelCard, monoInputCls, Kbd, cx } from '../components/ui';
import type { HistoryEntry } from '../lib/history';

interface Props {
  onLog: (e: Omit<HistoryEntry, 'id' | 'ts'>) => void;
  restoreSignal: { entry: HistoryEntry; nonce: number } | null;
}

function JsonBlock({ title, pretty, sig }: { title: string; pretty?: string; sig?: string }) {
  const lines = (pretty ?? sig ?? '').split('\n');
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3.5 py-2 dark:border-white/10 dark:bg-white/[.04]">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</span>
        <CopyButton text={pretty ?? sig ?? ''} small />
      </div>
      <pre className="max-h-64 overflow-auto bg-white p-3.5 font-mono text-[12.5px] leading-6 text-slate-800 dark:bg-black/40 dark:text-slate-200" tabIndex={0} aria-label={`${title} JSON`}>
        {sig !== undefined ? <code className="break-all">{sig || <span className="opacity-40">(empty signature)</span>}</code> : <code>{pretty}</code>}
      </pre>
      <div className="hidden">{lines.length}</div>
    </div>
  );
}

export default function JwtPanel({ onLog, restoreSignal }: Props) {
  const [token, setToken] = useState(SAMPLE_JWT);
  const [loggedKey, setLoggedKey] = useState('');

  let result: ReturnType<typeof decodeJwt> | null = null;
  let err: string | undefined;
  if (!token.trim()) {
    err = 'Input is empty — paste a JWT (header.payload.signature) or press “Load sample”.';
  } else {
    try {
      result = decodeJwt(token);
    } catch (e) {
      err = e instanceof Error ? e.message : 'Invalid token.';
    }
  }

  useEffect(() => {
    if (!result || err) return;
    const key = token.trim();
    if (key === loggedKey) return;
    const t = setTimeout(() => {
      setLoggedKey(key);
      onLog({
        section: 'jwt', tool: 'JWT decode',
        summary: `JWT · alg ${result!.claims.alg ?? '?'} · ${result!.expiryState}`,
        input: key.slice(0, 600),
        output: result!.payload.pretty,
        payload: { input: key },
      });
    }, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, err]);

  useEffect(() => {
    if (!restoreSignal || restoreSignal.entry.section !== 'jwt') return;
    const p = restoreSignal.entry.payload ?? {};
    if (typeof p.input === 'string') setToken(p.input);
  }, [restoreSignal]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-jwt-scope]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setToken(''); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const c = result?.claims;
  const expDate = c?.exp ? new Date(c.exp * 1000) : null;
  const iatDate = c?.iat ? new Date(c.iat * 1000) : null;

  return (
    <div data-jwt-scope className="panel-enter space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">JWT Decoder</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Paste a JSON Web Token to inspect its header & payload — decoded locally, instantly.</p>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/[.07] p-4 text-[13px] leading-relaxed text-amber-900 dark:text-amber-200" role="note">
        <ShieldAlert size={17} className="mt-0.5 shrink-0 text-amber-500" />
        <p><strong>Decode-only — no signature verification.</strong> Anyone can read a JWT's payload; only the server holding the secret can verify it. Never paste production tokens with sensitive data into tools you don't trust — this one never sends yours anywhere.</p>
      </div>

      <PanelCard>
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="jwt-in">Token</FieldLabel>
          <button onClick={() => setToken(SAMPLE_JWT)} className="mb-1.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"><Sparkles size={12} /> Load sample</button>
        </div>
        <textarea id="jwt-in" value={token} onChange={(e) => setToken(e.target.value)} rows={4} spellCheck={false} placeholder="eyJhbGciOi…" className={cx(monoInputCls, err && token.trim() ? '!border-red-400' : '')} aria-label="JWT token input" aria-invalid={!!err} aria-describedby={err ? 'jwt-error' : undefined} />
        <div className="mt-1 flex justify-between text-[11px] text-slate-400">
          <span>{token.trim() ? `${token.trim().split('.').length} segment(s) — a valid JWT has 3` : 'Awaiting token…'}</span>
          <span className="hidden sm:inline"><Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> clear</span>
        </div>
        {err ? <div id="jwt-error"><InlineError msg={err} /></div> : <InlineError msg={err} />}
        {!token.trim() && (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500" role="status">Nothing pasted yet — the decoded header, payload and expiry appear here instantly.</p>
        )}
      </PanelCard>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card-soft glow-border flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-[#12141c]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><KeyRound size={18} /></span>
              <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Algorithm</p><p className="font-mono text-sm font-bold text-slate-900 dark:text-white">{c?.alg ?? '—'}</p></div>
            </div>
            <div className="card-soft glow-border flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-[#12141c]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><Fingerprint size={18} /></span>
              <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Type</p><p className="font-mono text-sm font-bold text-slate-900 dark:text-white">{c?.typ ?? '—'}</p></div>
            </div>
            <div className={cx('card-soft glow-border flex items-center gap-3 rounded-2xl border p-4 dark:bg-[#12141c]', result.expiryState === 'expired' ? 'border-red-500/30 bg-red-500/[.04] dark:border-red-400/30' : result.expiryState === 'valid' ? 'border-emerald-500/30 bg-emerald-500/[.04] dark:border-emerald-400/30' : 'border-slate-200/80 bg-white dark:border-white/10')}>
              <span className={cx('flex h-10 w-10 items-center justify-center rounded-xl', result.expiryState === 'expired' ? 'bg-red-500/10 text-red-500' : result.expiryState === 'valid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400')}><Clock3 size={18} /></span>
              <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Expiry</p><p className="truncate text-[13px] font-bold text-slate-900 dark:text-white" title={result.expiryLabel}>{result.expiryState === 'expired' ? 'Expired' : result.expiryState === 'valid' ? 'Valid' : result.expiryState === 'notyet' ? 'Not yet valid' : 'No exp claim'}</p></div>
            </div>
          </div>

          <PanelCard>
            <p className="mb-3 text-[13px] text-slate-500 dark:text-slate-400">{result.expiryLabel}</p>
            {(c?.iss || c?.sub || c?.aud !== undefined || expDate || iatDate) && (
              <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-left text-[13px]">
                  <thead><tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 dark:bg-white/[.04]"><th className="px-4 py-2 font-bold">Claim</th><th className="px-4 py-2 font-bold">Value</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {c?.iss && <tr><td className="px-4 py-2 font-mono font-bold text-slate-500">iss</td><td className="px-4 py-2 font-mono text-slate-800 dark:text-slate-200">{c.iss}</td></tr>}
                    {c?.sub && <tr><td className="px-4 py-2 font-mono font-bold text-slate-500">sub</td><td className="px-4 py-2 font-mono text-slate-800 dark:text-slate-200">{c.sub}</td></tr>}
                    {c?.aud !== undefined && <tr><td className="px-4 py-2 font-mono font-bold text-slate-500">aud</td><td className="px-4 py-2 font-mono text-slate-800 dark:text-slate-200">{JSON.stringify(c.aud)}</td></tr>}
                    {expDate && <tr><td className="px-4 py-2 font-mono font-bold text-slate-500">exp</td><td className="px-4 py-2 font-mono text-slate-800 dark:text-slate-200">{expDate.toLocaleString()} <span className="text-slate-400">({c?.exp})</span></td></tr>}
                    {iatDate && <tr><td className="px-4 py-2 font-mono font-bold text-slate-500">iat</td><td className="px-4 py-2 font-mono text-slate-800 dark:text-slate-200">{iatDate.toLocaleString()} <span className="text-slate-400">({c?.iat})</span></td></tr>}
                    {c?.nbf !== undefined && typeof c.nbf === 'number' && <tr><td className="px-4 py-2 font-mono font-bold text-slate-500">nbf</td><td className="px-4 py-2 font-mono text-slate-800 dark:text-slate-200">{new Date((c.nbf as number) * 1000).toLocaleString()}</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <JsonBlock title="Header" pretty={result.header.pretty} />
              <JsonBlock title="Payload" pretty={result.payload.pretty} />
            </div>
            <div className="mt-4">
              <JsonBlock title="Signature (Base64URL — not decoded)" sig={result.signature} />
            </div>
          </PanelCard>

          <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 p-4 text-[13px] leading-relaxed text-slate-500 dark:border-white/10 dark:text-slate-400">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <p>Seeing <span className="font-mono font-semibold">alg: none</span>? That token is <strong>unsigned</strong> — any server accepting it without verification is vulnerable. The classic JWT attack is swapping RS256 → HS256; always verify algorithm server-side.</p>
          </div>
        </>
      )}
    </div>
  );
}
