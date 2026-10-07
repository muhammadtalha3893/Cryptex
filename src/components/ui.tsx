import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

export function cx(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(' ');
}

export function CopyButton({ text, label = 'Copy', small = false }: { text: string; label?: string; small?: boolean }) {
  const [ok, setOk] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      aria-label={`${label} to clipboard`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        setOk(true);
        setTimeout(() => setOk(false), 1400);
      }}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-lg border font-medium transition-all active:scale-95',
        small ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
        ok
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-white/20 dark:hover:text-slate-100'
      )}
    >
      {ok ? <Check size={13} className="anim-check" strokeWidth={3} /> : <Copy size={13} />}
      {ok ? 'Copied' : label}
    </button>
  );
}

export function CodeOutput({ text, maxHeight = 220, lineNumbers = true }: { text: string; maxHeight?: number; lineNumbers?: boolean }) {
  if (!text) return null;
  const lines = text.split('\n');
  const showNums = lineNumbers && (lines.length > 1 || text.length > 90);
  return (
    <div
      className="overflow-auto rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/40"
      style={{ maxHeight }}
      role="region"
      aria-label="Output"
      tabIndex={0}
    >
      <div className="output-lines px-4 py-3 font-mono text-[12.5px] leading-6 text-slate-800 dark:text-slate-200">
        {lines.map((ln, i) => (
          <div key={i} className={showNums ? 'output-line' : ''}>
            <span className="break-all whitespace-pre-wrap">{ln === '' ? ' ' : ln}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
      {children}
    </label>
  );
}

export function InlineError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
      {msg}
    </p>
  );
}

export const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-indigo-400/60';

export const monoInputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-[13px] text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-black/40 dark:text-slate-100 dark:placeholder:text-slate-600';

export function PanelCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('card-soft glow-border rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-[#12141c]', className)}>
      {children}
    </div>
  );
}

export function StrengthBadge({ level }: { level: 'broken' | 'weak' | 'strong' | 'ok' | 'legacy' }) {
  const map: Record<string, string> = {
    broken: 'bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400',
    weak: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
    strong: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
    ok: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
    legacy: 'bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400',
  };
  const label = level === 'broken' ? 'Broken' : level === 'weak' ? 'Weak' : level === 'legacy' ? 'Legacy' : level === 'ok' ? 'Secure' : 'Strong';
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide', map[level])}>
      <span className={cx('h-1.5 w-1.5 rounded-full', level === 'strong' || level === 'ok' ? 'bg-emerald-500' : level === 'weak' ? 'bg-amber-500' : 'bg-red-500')} />
      {label}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-400">
      {children}
    </kbd>
  );
}

export function ProgressBar({ value, label = 'Progress' }: { value: number | null; label?: string }) {
  const pct = value === null ? undefined : Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
    >
      {pct === undefined ? (
        <div className="progress-indeterminate h-full w-2/5 rounded-full bg-blue-500" />
      ) : (
        <div className="h-full rounded-full bg-blue-500 transition-all duration-200" style={{ width: `${pct}%` }} />
      )}
    </div>
  );
}
