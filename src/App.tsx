import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeftRight, BookOpen, ChevronLeft, ChevronRight, Fingerprint, History as HistoryIcon,
  Home, IdCard, Lock, Menu, Moon, ShieldCheck, Sparkles, Sun, X,
} from 'lucide-react';
import Logo from './components/Logo';
import { cx } from './components/ui';
import HomePanel from './panels/HomePanel';
import HashPanel from './panels/HashPanel';
import CryptoPanel from './panels/CryptoPanel';
import EncodingPanel from './panels/EncodingPanel';
import JwtPanel from './panels/JwtPanel';
import HistoryPanel from './panels/HistoryPanel';
import LearnPanel from './panels/LearnPanel';
import { newId, type HistoryEntry, type SectionId } from './lib/history';

interface NavItem {
  id: SectionId;
  label: string;
  icon: ReactNode;
  accent: string;
  activeBg: string;
  activeGrad: string;
  iconWrap: string;
  dot: string;
  desc: string;
}

const NAV: NavItem[] = [
  { id: 'home', label: 'Home', icon: <Home size={18} />, accent: 'text-slate-500 dark:text-slate-200', activeBg: 'bg-slate-500/10', activeGrad: 'from-slate-500/20 to-slate-400/10', iconWrap: 'bg-slate-500/10 text-slate-500 dark:text-slate-300', dot: 'bg-slate-400', desc: 'Overview' },
  { id: 'hash', label: 'Hash Generator', icon: <Fingerprint size={18} />, accent: 'text-blue-500', activeBg: 'bg-blue-500/10', activeGrad: 'from-blue-500/20 to-cyan-400/10', iconWrap: 'bg-blue-500/10 text-blue-500', dot: 'bg-blue-500', desc: 'MD5 · SHA · HMAC' },
  { id: 'crypto', label: 'Encrypt / Decrypt', icon: <Lock size={18} />, accent: 'text-purple-500', activeBg: 'bg-purple-500/10', activeGrad: 'from-purple-500/20 to-fuchsia-400/10', iconWrap: 'bg-purple-500/10 text-purple-500', dot: 'bg-purple-500', desc: 'AES · 3DES · RC4' },
  { id: 'encoding', label: 'Encoding', icon: <ArrowLeftRight size={18} />, accent: 'text-teal-500', activeBg: 'bg-teal-500/10', activeGrad: 'from-teal-500/20 to-emerald-400/10', iconWrap: 'bg-teal-500/10 text-teal-500', dot: 'bg-teal-500', desc: 'Base64 · Hex · Caesar' },
  { id: 'jwt', label: 'JWT Decoder', icon: <IdCard size={18} />, accent: 'text-orange-500', activeBg: 'bg-orange-500/10', activeGrad: 'from-orange-500/20 to-amber-400/10', iconWrap: 'bg-orange-500/10 text-orange-500', dot: 'bg-orange-500', desc: 'Header · claims' },
  { id: 'history', label: 'History', icon: <HistoryIcon size={18} />, accent: 'text-slate-500 dark:text-slate-300', activeBg: 'bg-slate-500/10', activeGrad: 'from-slate-500/20 to-slate-400/10', iconWrap: 'bg-slate-500/10 text-slate-500 dark:text-slate-300', dot: 'bg-slate-400', desc: 'Session log' },
  { id: 'learn', label: 'Learn', icon: <BookOpen size={18} />, accent: 'text-indigo-500', activeBg: 'bg-indigo-500/10', activeGrad: 'from-indigo-500/20 to-violet-400/10', iconWrap: 'bg-indigo-500/10 text-indigo-500', dot: 'bg-indigo-500', desc: 'Security guide' },
];

function themeInit(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('cryptex-theme');
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export default function App() {
  const [section, setSection] = useState<SectionId>('home');
  const [dark, setDark] = useState(themeInit);
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [restoreSignal, setRestoreSignal] = useState<{ entry: HistoryEntry; nonce: number } | null>(null);
  const [themeAnim, setThemeAnim] = useState(false);
  const [burst, setBurst] = useState<{ id: SectionId; k: number } | null>(null);
  const [tipId, setTipId] = useState<SectionId | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    localStorage.setItem('cryptex-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('cryptex-theme')) setDark(e.matches);
    };
    mq.addEventListener?.('change', fn);
    return () => mq.removeEventListener?.('change', fn);
  }, []);

  // global clear shortcut hint + escape closes drawer
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const toggleTheme = () => {
    setThemeAnim(true);
    setDark(!dark);
    setTimeout(() => setThemeAnim(false), 400);
  };

  const log = useCallback((e: Omit<HistoryEntry, 'id' | 'ts'>) => {
    setHistory((prev) => [{ ...e, id: newId(), ts: Date.now() }, ...prev].slice(0, 10));
  }, []);

  const navigate = (s: SectionId) => {
    setSection(s);
    setDrawer(false);
    // click-burst reaction + drawer auto-follow
    setBurst((b) => ({ id: s, k: (b?.k ?? 0) + 1 }));
    window.setTimeout(() => setBurst((b) => (b && b.id === s ? null : b)), 900);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const restore = (entry: HistoryEntry) => {
    setSection(entry.section);
    setDrawer(false);
    setRestoreSignal({ entry, nonce: Date.now() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeItem = NAV.find((n) => n.id === section)!;

  const BURST_BITS = [
    { x: -14, d: '0s', s: 12 }, { x: -7, d: '0.06s', s: 10 }, { x: 0, d: '0s', s: 13 },
    { x: 7, d: '0.09s', s: 10 }, { x: 14, d: '0.03s', s: 12 },
  ];

  const sidebarBody = (isDrawer: boolean) => (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-visible px-3 py-4" aria-label="Tools">
        {(!collapsed || isDrawer) && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 px-2 pb-2 text-[11px] font-bold uppercase tracking-[.14em] text-slate-400 dark:text-slate-500"
          >
            Toolkit
            <span className="h-px flex-1 bg-gradient-to-r from-slate-300/70 to-transparent dark:from-white/15" aria-hidden="true" />
            <Sparkles size={12} className="text-indigo-400" aria-hidden="true" />
          </motion.p>
        )}
        {NAV.map((n, i) => {
          const active = section === n.id;
          const compact = collapsed && !isDrawer;
          return (
            <motion.button
              key={n.id}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.32, ease: [0.22, 0.8, 0.3, 1] }}
              whileHover={{ x: active ? 0 : 4 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(n.id)}
              onMouseEnter={() => compact && setTipId(n.id)}
              onMouseLeave={() => setTipId(null)}
              onFocus={() => compact && setTipId(n.id)}
              onBlur={() => setTipId(null)}
              aria-current={active ? 'page' : undefined}
              aria-label={compact ? `${n.label} — ${n.desc}` : undefined}
              className={cx(
                'nav-item group relative flex w-full items-center gap-3 overflow-visible rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-200',
                active
                  ? cx('nav-active-ring bg-gradient-to-r text-slate-900 dark:text-white', n.activeGrad)
                  : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[.06] dark:hover:text-slate-100',
                compact && 'justify-center px-0 py-2.5'
              )}
            >
              <span className="nav-shine" aria-hidden="true" />
              {/* animated active backdrop that slides between items */}
              {active && (
                <motion.span
                  layoutId={isDrawer ? 'nav-active-drawer' : 'nav-active'}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className={cx('absolute inset-0 -z-0 rounded-2xl bg-gradient-to-r', n.activeGrad)}
                  aria-hidden="true"
                />
              )}
              {/* icon tile */}
              <span className="relative z-10">
                <motion.span
                  animate={active ? { scale: [1, 1.18, 1], rotate: [0, -10, 0] } : { scale: 1, rotate: 0 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className={cx(
                    'nav-icon flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                    active
                      ? cx('bg-white/90 shadow-md dark:bg-white/15', n.accent)
                      : cx(n.iconWrap, 'group-hover:scale-110 group-hover:shadow-md')
                  )}
                >
                  {n.icon}
                </motion.span>
                {/* pulsing presence dot on the active tile */}
                {active && (
                  <span className={cx('nav-active-dot absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#141826]', n.dot)} aria-hidden="true" />
                )}
                {/* click-burst sparkles */}
                {burst && burst.id === n.id && (
                  <span className="pointer-events-none absolute inset-x-0 -top-1 flex justify-center" aria-hidden="true">
                    {BURST_BITS.map((b, k) => (
                      <span
                        key={`${burst.k}-${k}`}
                        className="nav-burst-float absolute font-bold text-indigo-400 dark:text-indigo-300"
                        style={{ marginLeft: b.x, animationDelay: b.d, fontSize: b.s }}
                      >
                        ✦
                      </span>
                    ))}
                  </span>
                )}
              </span>
              {(!collapsed || isDrawer) && (
                <span className="relative z-10 min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate leading-tight">
                    {n.label}
                    {active && <Sparkles size={12} className={cx('shrink-0', n.accent)} aria-hidden="true" />}
                  </span>
                  <span className="block truncate text-[11px] font-normal text-slate-400 dark:text-slate-500">{n.desc}</span>
                </span>
              )}
              {(!collapsed || isDrawer) && n.id === 'history' && history.length > 0 && (
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={history.length}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="relative z-10 rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[10.5px] font-bold text-white dark:bg-white dark:text-slate-900"
                  >
                    {history.length}
                  </motion.span>
                </AnimatePresence>
              )}
              {/* slim edge glow for the active row */}
              {active && (
                <motion.span
                  layoutId={isDrawer ? 'nav-edge-drawer' : 'nav-edge'}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className={cx('absolute left-0 top-1/2 z-10 h-8 w-1 -translate-y-1/2 rounded-r-full shadow', n.dot)}
                  aria-hidden="true"
                />
              )}
              {/* hover tooltip in collapsed icon-rail mode */}
              {compact && tipId === n.id && (
                <span
                  role="tooltip"
                  className="tooltip-pop pointer-events-none absolute left-[calc(100%+14px)] top-1/2 z-50 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-left shadow-xl dark:border-white/10 dark:bg-[#1a1f2e] dark:shadow-black/50"
                >
                  <span className="block text-[13px] font-bold text-slate-900 dark:text-white">{n.label}</span>
                  <span className="block text-[11px] font-normal text-slate-400">{n.desc}</span>
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>
      {(!collapsed || isDrawer) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="relative mx-3 mb-3 overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/[.06] p-3.5"
        >
          <span className="nav-shine" aria-hidden="true" />
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck size={14} className="shield-bob" /> Local-only
            <span className="relative ml-auto flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </p>
          <p className="mt-1 text-[11.5px] leading-snug text-slate-500 dark:text-slate-400">Keys & data never leave this tab. History clears on close.</p>
        </motion.div>
      )}
    </div>
  );

  return (
    <div className={cx('min-h-screen bg-[#f6f7f9] text-slate-900 dark:bg-[#0a0c12] dark:text-slate-100', themeAnim && 'theme-anim')}>
      {/* top nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/[.07] dark:bg-[#0a0c12]/80">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <button className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-white/10" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <button onClick={() => navigate('home')} className="group flex items-center gap-2.5" aria-label="Cryptex home">
            <Logo size={36} />
            <span className="flex flex-col items-start leading-none">
              <span className="text-[17px] font-extrabold tracking-tight">Cryptex</span>
              <span className="mt-0.5 hidden text-[10px] font-bold uppercase tracking-[.18em] text-slate-400 sm:block">Local crypto toolkit</span>
            </span>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-700 md:inline-flex dark:text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> OFFLINE-SAFE
            </span>
            <button
              onClick={toggleTheme}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200 text-slate-500 transition-all hover:bg-slate-100 active:scale-90 dark:border-white/10 dark:text-amber-300 dark:hover:bg-white/10"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={dark ? 'moon' : 'sun'}
                  initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.25 }}
                >
                  {dark ? <Moon size={17} /> : <Sun size={17} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] items-start gap-6 px-4 py-6 sm:px-6">
        {/* desktop sidebar */}
        <aside className={cx('sidebar-modern card-soft glow-border sticky top-24 hidden max-h-[calc(100vh-7.5rem)] shrink-0 overflow-hidden rounded-3xl border border-slate-200/80 transition-all duration-300 lg:block dark:border-white/10', collapsed ? 'w-[76px]' : 'w-64')}>
          <span className="sidebar-top-glow absolute inset-x-8 top-0 z-10 h-[2.5px] rounded-full" aria-hidden="true" />
          <div className="flex h-full max-h-[calc(100vh-7.5rem)] flex-col">
            <div className="flex items-center justify-between px-3 pt-3.5">
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.22 }}
                    className="flex items-center gap-1.5 pl-1 text-[10px] font-extrabold uppercase tracking-[.22em] text-slate-400 dark:text-slate-500"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" aria-hidden="true" />
                    Menu
                  </motion.span>
                )}
              </AnimatePresence>
              <motion.button
                whileHover={{ scale: 1.1, rotate: collapsed ? 0 : -8 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!collapsed}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className={cx(
                  'flex h-7 w-7 items-center justify-center rounded-xl border shadow-sm transition-colors',
                  'border-slate-200/80 bg-white text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:shadow-md',
                  'dark:border-white/10 dark:bg-white/[.06] dark:hover:border-indigo-400/40 dark:hover:text-indigo-300',
                  collapsed && 'mx-auto'
                )}
              >
                {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              </motion.button>
            </div>
            <div className="min-h-0 flex-1">{sidebarBody(false)}</div>
          </div>
        </aside>

        {/* mobile drawer */}
        <AnimatePresence>
          {drawer && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden" />
              <motion.aside
                initial={{ x: -320, opacity: 0.6 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -320, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 340, damping: 34 }}
                className="sidebar-modern fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden rounded-r-3xl border-r border-slate-200/70 shadow-2xl lg:hidden dark:border-white/10"
                role="dialog"
                aria-modal="true"
                aria-label="Menu"
              >
                <span className="sidebar-top-glow absolute inset-x-10 top-0 z-10 h-[2.5px] rounded-full" aria-hidden="true" />
                <div className="relative flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-200/70 px-4 dark:border-white/10">
                  <motion.span animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.6, ease: 'easeOut' }}>
                    <Logo size={30} />
                  </motion.span>
                  <span className="text-[16px] font-extrabold">Cryptex</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">LOCAL</span>
                  <motion.button
                    whileHover={{ scale: 1.08, rotate: 90 }}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => setDrawer(false)}
                    className="ml-auto rounded-xl border border-slate-200/70 p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-white/10 dark:hover:bg-white/10 dark:hover:text-slate-200"
                    aria-label="Close menu"
                  >
                    <X size={17} />
                  </motion.button>
                </div>
                <div className="min-h-0 flex-1">{sidebarBody(true)}</div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* main panel */}
        <main className="min-w-0 flex-1 pb-16" id="main">
          <AnimatePresence mode="wait">
            <motion.div
              key={section + (restoreSignal?.nonce ?? '')}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.28, ease: [0.22, 0.8, 0.3, 1] }}
            >
              {section === 'home' && <HomePanel onNavigate={navigate} />}
              {section === 'hash' && <HashPanel onLog={log} restoreSignal={restoreSignal} />}
              {section === 'crypto' && <CryptoPanel onLog={log} restoreSignal={restoreSignal} />}
              {section === 'encoding' && <EncodingPanel onLog={log} restoreSignal={restoreSignal} />}
              {section === 'jwt' && <JwtPanel onLog={log} restoreSignal={restoreSignal} />}
              {section === 'history' && (
                <HistoryPanel
                  entries={history}
                  onRestore={restore}
                  onClear={() => setHistory([])}
                  onRemove={(id) => setHistory((p) => p.filter((e) => e.id !== id))}
                />
              )}
              {section === 'learn' && <LearnPanel />}
            </motion.div>
          </AnimatePresence>

          {/* breadcrumb-ish context */}
          <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[.2em] text-slate-300 dark:text-slate-600">
            {activeItem.label} · Cryptex {new Date().getFullYear()}
          </p>
        </main>
      </div>

      {/* trust footer */}
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/85 backdrop-blur-xl dark:border-white/[.07] dark:bg-[#0a0c12]/85">
        <p className="mx-auto flex max-w-[1400px] items-center justify-center gap-1.5 px-4 py-2.5 text-center text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
          <ShieldCheck size={13} className="shrink-0 text-emerald-500" />
          All operations run 100% locally in your browser. Nothing is sent to any server.
        </p>
      </footer>
    </div>
  );
}
