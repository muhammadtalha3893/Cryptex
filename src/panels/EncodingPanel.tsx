import { useEffect, useState } from 'react';
import { ArrowLeftRight, Minus, Plus } from 'lucide-react';
import { CODECS, caesarShift, codecDecode, codecEncode, type CodecId } from '../lib/codecs';
import { CopyButton, FieldLabel, InlineError, PanelCard, monoInputCls, Kbd, cx } from '../components/ui';
import type { HistoryEntry } from '../lib/history';

interface Props {
  onLog: (e: Omit<HistoryEntry, 'id' | 'ts'>) => void;
  restoreSignal: { entry: HistoryEntry; nonce: number } | null;
}

export default function EncodingPanel({ onLog, restoreSignal }: Props) {
  const [codec, setCodec] = useState<CodecId>('base64');
  const [direction, setDirection] = useState<'encode' | 'decode'>('encode');
  const [shift, setShift] = useState(3);
  const [input, setInput] = useState('Encode me with Cryptex ✨');
  const [loggedKey, setLoggedKey] = useState('');

  const active = CODECS.find((c) => c.id === codec)!;
  const isCaesar = codec === 'caesar';
  const isRot = codec === 'rot13';
  const symmetric = isCaesar || isRot;

  let output = '';
  let err: string | undefined;
  try {
    if (input) {
      output = direction === 'encode' ? codecEncode(codec, input, shift) : codecDecode(codec, input, shift);
    }
  } catch (e) {
    err = e instanceof Error ? e.message : 'Conversion failed.';
  }
  const error = err ?? '';

  // history (debounced)
  useEffect(() => {
    if (!output || err) return;
    const key = `${codec}|${direction}|${shift}|${input}`;
    if (key === loggedKey) return;
    const t = setTimeout(() => {
      setLoggedKey(key);
      onLog({
        section: 'encoding',
        tool: `${active.name} ${symmetric ? '(cipher)' : direction}`,
        summary: `${active.name} ${direction} · ${input.length} chars`,
        input: input.slice(0, 500),
        output,
        payload: { input, codec, direction, shift },
      });
    }, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codec, direction, shift, input, output]);

  useEffect(() => {
    if (!restoreSignal || restoreSignal.entry.section !== 'encoding') return;
    const p = restoreSignal.entry.payload ?? {};
    if (typeof p.input === 'string') setInput(p.input);
    if (typeof p.codec === 'string') setCodec(p.codec as CodecId);
    if (p.direction === 'encode' || p.direction === 'decode') setDirection(p.direction);
    if (typeof p.shift === 'number') setShift(p.shift);
  }, [restoreSignal]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-enc-scope]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setInput(''); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  function swap() {
    if (output && !err) setInput(output);
    setDirection(direction === 'encode' ? 'decode' : 'encode');
  }

  return (
    <div data-enc-scope className="panel-enter space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Encoding / Decoding</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reversible text transforms — Base64, URL, Hex, Binary and classical ciphers. Live preview.</p>
      </div>

      <PanelCard>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CODECS.map((c) => (
            <button key={c.id} onClick={() => setCodec(c.id)} aria-pressed={codec === c.id}
              className={cx('rounded-xl border p-3 text-left transition-all', codec === c.id ? 'border-teal-500/60 bg-teal-500/[.07] shadow-sm dark:border-teal-400/50 dark:bg-teal-400/[.08]' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/[.03]')}>
              <span className="font-mono text-[13px] font-bold text-slate-900 dark:text-white">{c.name}</span>
              <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500 dark:text-slate-400">{c.desc}</p>
            </button>
          ))}
          <div className="rounded-xl border border-dashed border-slate-300 p-3 text-[11.5px] leading-relaxed text-slate-500 dark:border-white/15 dark:text-slate-400">
            <strong className="font-semibold text-slate-700 dark:text-slate-200">Encoding ≠ encryption.</strong> These formats hide nothing from an adversary — they just change representation.
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 dark:bg-white/10" role="tablist" aria-label="Direction">
            {(['encode', 'decode'] as const).map((d) => (
              <button key={d} role="tab" aria-selected={direction === d} onClick={() => setDirection(d)}
                className={cx('rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-all', direction === d ? 'bg-white text-slate-900 shadow dark:bg-white/15 dark:text-white' : 'text-slate-500 dark:text-slate-400')}>{d}{symmetric && d === 'encode' ? ' / shift' : ''}</button>
            ))}
          </div>
          <button onClick={swap} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[13px] font-semibold text-slate-500 transition-all hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5" title="Swap input/output and flip direction">
            <ArrowLeftRight size={14} /> Swap
          </button>
          <span className="hidden text-xs text-slate-400 sm:inline"><Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> clear</span>
        </div>

        {isCaesar && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[.03]">
            <FieldLabel htmlFor="caesar-shift">Caesar shift: <span className="font-mono text-teal-600 dark:text-teal-400">{shift}</span></FieldLabel>
            <div className="flex items-center gap-3">
              <button onClick={() => setShift((s) => (s + 25) % 26)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-white dark:border-white/10 dark:text-slate-300" aria-label="Decrease shift"><Minus size={14} /></button>
              <input id="caesar-shift" type="range" min={0} max={25} value={shift} onChange={(e) => setShift(parseInt(e.target.value))} className="flex-1" aria-label="Caesar shift amount" />
              <button onClick={() => setShift((s) => (s + 1) % 26)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-white dark:border-white/10 dark:text-slate-300" aria-label="Increase shift"><Plus size={14} /></button>
              <input type="number" min={0} max={25} value={shift} onChange={(e) => setShift(Math.max(0, Math.min(25, parseInt(e.target.value) || 0)))} className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center font-mono text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" aria-label="Shift value" />
            </div>
            <p className="mt-2 font-mono text-[11.5px] text-slate-400">A→{caesarShift('A', direction === 'encode' ? shift : -shift)} · a→{caesarShift('a', direction === 'encode' ? shift : -shift)} · preview alphabet: <span className="text-slate-500 dark:text-slate-300">{caesarShift('ABCDEFGHIJKLMNOPQRSTUVWXYZ', direction === 'encode' ? shift : -shift)}</span></p>
          </div>
        )}
      </PanelCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <PanelCard>
          <div className="mb-1.5 flex items-center justify-between">
            <FieldLabel htmlFor="enc-in">{direction === 'encode' ? 'Plain text' : `${active.name} input`}</FieldLabel>
            <span className="text-[11px] text-slate-400">{input.length} chars</span>
          </div>
          <textarea id="enc-in" value={input} onChange={(e) => setInput(e.target.value)} rows={7} spellCheck={false} placeholder={direction === 'encode' ? 'Type text to convert…' : `Paste ${active.name} to reverse…`} className={monoInputCls} aria-label="Encoding input" aria-invalid={!!error} aria-describedby={error ? 'enc-error' : undefined} />
          {!input && (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500" role="status">Input is empty — type something above to see the live {direction === 'encode' ? 'encoded' : 'decoded'} result.</p>
          )}
          {error && <div id="enc-error"><InlineError msg={error} /></div>}
        </PanelCard>
        <PanelCard className="border-teal-500/20 dark:border-teal-400/20">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{direction === 'encode' ? `${active.name} output` : 'Decoded text'}</span>
            <CopyButton text={output} small />
          </div>
          <div className="min-h-[178px] break-all rounded-xl bg-teal-500/[.05] p-3.5 font-mono text-[13px] leading-relaxed text-slate-800 dark:bg-teal-400/[.06] dark:text-slate-100" role="status" aria-live="polite">
            {output || <span className="opacity-40">Result appears here…</span>}
          </div>
          {output && <p className="mt-1.5 text-[11px] text-slate-400">{output.length} chars · {new TextEncoder().encode(output).length} bytes UTF-8</p>}
        </PanelCard>
      </div>
    </div>
  );
}
