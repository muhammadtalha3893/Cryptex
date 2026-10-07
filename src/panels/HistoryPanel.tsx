import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeftRight, Clock3, Fingerprint, History as HistoryIcon, IdCard, Lock, RotateCcw, Trash2 } from 'lucide-react';
import { timeAgo, type HistoryEntry } from '../lib/history';
import { PanelCard, cx } from '../components/ui';

interface Props {
  entries: HistoryEntry[];
  onRestore: (e: HistoryEntry) => void;
  onClear: () => void;
  onRemove: (id: string) => void;
}

const SEC_META: Record<string, { icon: ReactNode; tint: string }> = {
  hash: { icon: <Fingerprint size={15} />, tint: 'bg-blue-500/10 text-blue-500' },
  crypto: { icon: <Lock size={15} />, tint: 'bg-purple-500/10 text-purple-500' },
  encoding: { icon: <ArrowLeftRight size={15} />, tint: 'bg-teal-500/10 text-teal-500' },
  jwt: { icon: <IdCard size={15} />, tint: 'bg-orange-500/10 text-orange-500' },
};

export default function HistoryPanel({ entries, onRestore, onClear, onRemove }: Props) {
  const [tick, setTick] = useState(0);
  // refresh relative times
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 15000);
    return () => clearInterval(t);
  }, []);
  void tick;

  return (
    <div className="panel-enter space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">History</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Session-only log of your last {entries.length >= 10 ? '10' : entries.length} operation{entries.length === 1 ? '' : 's'} — kept in memory, gone when you close the tab.</p>
        </div>
        {entries.length > 0 && (
          <button onClick={onClear} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-500 transition-all hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-slate-400 dark:hover:border-red-400/40 dark:hover:text-red-400"><Trash2 size={14} /> Clear all</button>
        )}
      </div>

      {entries.length === 0 ? (
        <PanelCard className="flex flex-col items-center py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500"><HistoryIcon size={26} /></span>
          <h2 className="mt-4 text-[15px] font-bold text-slate-800 dark:text-slate-100">Nothing here yet</h2>
          <p className="mt-1 max-w-sm text-[13px] text-slate-500 dark:text-slate-400">Hash some text, encrypt a message, or decode a token — your recent operations will appear here. Click any entry to restore its inputs.</p>
        </PanelCard>
      ) : (
        <ol className="space-y-3">
          {entries.map((e) => {
            const m = SEC_META[e.section] ?? { icon: <Clock3 size={15} />, tint: 'bg-slate-500/10 text-slate-400' };
            return (
              <li key={e.id}>
                <div className="card-soft glow-border group rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 dark:border-white/10 dark:bg-[#12141c] sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', m.tint)}>{m.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{e.tool}</span>
                        <span className="text-[11px] text-slate-400">{timeAgo(e.ts)} · {new Date(e.ts).toLocaleTimeString()}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-slate-500 dark:text-slate-400">{e.summary}</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="min-w-0 rounded-lg bg-slate-50 p-2.5 dark:bg-black/30">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Input</p>
                          <p className="mt-0.5 truncate font-mono text-[11.5px] text-slate-600 dark:text-slate-300" title={e.input}>{e.input || '—'}</p>
                        </div>
                        <div className="min-w-0 rounded-lg bg-slate-50 p-2.5 dark:bg-black/30">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Output</p>
                          <p className="mt-0.5 truncate font-mono text-[11.5px] text-slate-600 dark:text-slate-300" title={e.output}>{e.output || '—'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button onClick={() => onRestore(e)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-slate-700 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200" title="Restore these inputs in its tool panel"><RotateCcw size={12} /> Restore</button>
                      <button onClick={() => onRemove(e.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-red-500" aria-label="Delete entry">Delete</button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
