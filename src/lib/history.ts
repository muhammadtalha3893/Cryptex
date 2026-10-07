export type SectionId = 'home' | 'hash' | 'crypto' | 'encoding' | 'jwt' | 'history' | 'learn';

export interface HistoryEntry {
  id: string;
  ts: number;
  section: Exclude<SectionId, 'home' | 'history' | 'learn'>;
  tool: string;
  summary: string;
  input: string;
  output: string;
  payload?: Record<string, string | number | boolean>;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.max(1, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleString();
}
