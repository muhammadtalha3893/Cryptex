import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ArrowLeftRight, ArrowRight, BookOpen, Fingerprint, History, IdCard, Lock, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';
import { cx } from '../components/ui';
import type { SectionId } from '../lib/history';

interface Props {
  onNavigate: (s: SectionId) => void;
}

const CARDS: Array<{ id: SectionId; icon: ReactNode; name: string; desc: string; accent: string; ring: string; chip: string }> = [
  { id: 'hash', icon: <Fingerprint size={22} />, name: 'Hash Generator', desc: 'MD5 → SHA-3 live digests, HMAC mode, compare tool & file hashing.', accent: 'text-blue-500', ring: 'hover:border-blue-400/60 dark:hover:border-blue-400/40', chip: 'bg-blue-500/10' },
  { id: 'crypto', icon: <Lock size={22} />, name: 'Encrypt / Decrypt', desc: 'AES-256-GCM, CBC, 3DES & RC4 with PBKDF2 password keys.', accent: 'text-purple-500', ring: 'hover:border-purple-400/60 dark:hover:border-purple-400/40', chip: 'bg-purple-500/10' },
  { id: 'encoding', icon: <ArrowLeftRight size={22} />, name: 'Encoding / Decoding', desc: 'Base64, URL, Hex, Binary, ROT13 & Caesar with live preview.', accent: 'text-teal-500', ring: 'hover:border-teal-400/60 dark:hover:border-teal-400/40', chip: 'bg-teal-500/10' },
  { id: 'jwt', icon: <IdCard size={22} />, name: 'JWT Decoder', desc: 'Inspect header, payload, claims & expiry. Decode-only, instant.', accent: 'text-orange-500', ring: 'hover:border-orange-400/60 dark:hover:border-orange-400/40', chip: 'bg-orange-500/10' },
  { id: 'history', icon: <History size={22} />, name: 'History', desc: 'Session-only log of your last 10 operations. Click to restore.', accent: 'text-slate-500 dark:text-slate-400', ring: 'hover:border-slate-400/60 dark:hover:border-slate-400/40', chip: 'bg-slate-500/10' },
  { id: 'learn', icon: <BookOpen size={22} />, name: 'Learn / Security Guide', desc: 'One-way vs two-way explainer and when to use each algorithm.', accent: 'text-indigo-500', ring: 'hover:border-indigo-400/60 dark:hover:border-indigo-400/40', chip: 'bg-indigo-500/10' },
];

export default function HomePanel({ onNavigate }: Props) {
  return (
    <div className="panel-enter space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-8 card-soft glow-border dark:border-white/10 dark:bg-[#12141c] sm:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-gradient-to-tr from-teal-500/15 via-blue-500/10 to-indigo-500/15 blur-3xl" />
        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <motion.div initial={{ rotate: -8, scale: .9 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }}>
            <Logo size={72} />
          </motion.div>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11.5px] font-bold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck size={13} /> 100% CLIENT-SIDE · ZERO NETWORK CALLS
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-[2.6rem] sm:leading-[1.1]">
              Cryptography toolkit<br className="hidden sm:block" /> that never leaves your device.
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
              Hash, encrypt, encode and inspect tokens with professional-grade primitives — running entirely in your browser's memory. Pick a tool below to begin.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button onClick={() => onNavigate('hash')} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-700 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                Start hashing <ArrowRight size={15} />
              </button>
              <button onClick={() => onNavigate('learn')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-95 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5">
                <BookOpen size={15} /> Security guide
              </button>
            </div>
          </div>
        </div>
        <div className="relative mt-8 grid grid-cols-3 gap-3 border-t border-slate-100 pt-6 dark:border-white/5 sm:gap-6">
          {[['6', 'tools'], ['100%', 'local'], ['0', 'servers']].map(([n, l]) => (
            <div key={l} className="text-center sm:text-left">
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white">{n}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[13px] font-bold uppercase tracking-[.12em] text-slate-400 dark:text-slate-500">Tools</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CARDS.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 0.8, 0.3, 1] }}
              onClick={() => onNavigate(c.id)}
              className={cx('card-soft glow-border group rounded-2xl border border-slate-200/80 bg-white p-5 text-left transition-all hover:-translate-y-1 dark:border-white/10 dark:bg-[#12141c]', c.ring)}
            >
              <span className={cx('inline-flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110', c.chip, c.accent)}>{c.icon}</span>
              <span className="mt-3.5 flex items-center justify-between">
                <span className="text-[15px] font-bold text-slate-900 dark:text-white">{c.name}</span>
                <ArrowRight size={16} className="text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />
              </span>
              <span className="mt-1 block text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{c.desc}</span>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-[13.5px] leading-relaxed text-slate-600 dark:border-white/10 dark:bg-white/[.03] dark:text-slate-300">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-500" />
        <p><strong className="font-bold">How privacy works here:</strong> Cryptex uses the Web Crypto API, crypto-js and pure TypeScript running in this tab. Open DevTools → Network: you'll see zero requests when you hash or encrypt. History lives only in React state and vanishes when the tab closes.</p>
      </section>
    </div>
  );
}
