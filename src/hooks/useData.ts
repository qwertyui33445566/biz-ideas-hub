import { useState, useCallback, useMemo } from 'react';
import type { DataFile, Entry, StatsData, SortMode, TabMode } from '@/types';

interface UseDataReturn {
  loading: boolean;
  error: string | null;
  loaded: boolean;
  data: DataFile;
  entries: Entry[];
  stats: StatsData;
  filterTags: [string, number][];
  tab: TabMode;
  sort: SortMode;
  search: string;
  date: string;
  activeFilters: Set<string>;
  load: () => Promise<void>;
  setTab: (t: TabMode) => void;
  setSort: (s: SortMode) => void;
  setSearch: (q: string) => void;
  setDate: (d: string) => void;
  toggleFilter: (k: string) => void;
  clearFilters: () => void;
  getId: (entry: Entry) => string;
}

export function useData(): UseDataReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [all, setAll] = useState<Entry[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const [tab, setTabState] = useState<TabMode>('all');
  const [sort, setSortState] = useState<SortMode>('newest');
  const [search, setSearchState] = useState('');
  const [date, setDateState] = useState('all');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('data.json?t=' + Date.now());
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const json: DataFile = await resp.json();
      setAll(json.entries || []);
      setDates(json.dates || []);
      setLastUpdate(json.lastUpdate || null);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAll([]);
      setDates([]);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const setTab = useCallback((t: TabMode) => {
    setTabState(t);
    setActiveFilters(new Set());
  }, []);

  const setSort = useCallback((s: SortMode) => setSortState(s), []);
  const setSearch = useCallback((q: string) => setSearchState(q), []);
  const setDate = useCallback((d: string) => setDateState(d), []);

  const toggleFilter = useCallback((k: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setActiveFilters(new Set()), []);

  const getId = useCallback((entry: Entry) => {
    const idx = all.indexOf(entry);
    return entry.type + '-' + (idx > -1 ? idx : 0);
  }, [all]);

  // ── Filtered entries ──
  const entries = useMemo(() => {
    let e = [...all];

    if (tab === 'business') e = e.filter(x => x.type === 'business');
    else if (tab === 'github') e = e.filter(x => x.type === 'github');
    else if (tab === 'favorites') {
      // Favorites are filtered in the component with auth context
      // We can't access auth here, so just return all for tab=favorites
      // The component will filter again
    }

    if (date !== 'all') e = e.filter(x => x.date === date);

    if (search) {
      const q = search.toLowerCase();
      e = e.filter(x => {
        const title = (x.type === 'business' ? x.title : x.name || '').toLowerCase();
        const desc = (x.description || '').toLowerCase();
        const tags = (x.type === 'business' ? x.tags || [] : x.topics || []).map(t => t.toLowerCase());
        const lang = (x.type === 'github' ? x.language || '' : '').toLowerCase();
        return title.includes(q) || desc.includes(q) || tags.some(t => t.includes(q)) || lang.includes(q);
      });
    }

    if (activeFilters.size > 0) {
      e = e.filter(x => {
        const keys = new Set<string>();
        if (x.type === 'business') {
          (x.tags || []).forEach(t => keys.add('t:' + t));
          keys.add('p:' + (x.potential || 3));
        } else {
          (x.topics || []).forEach(t => keys.add('t:' + t));
          if (x.language) keys.add('l:' + x.language);
        }
        for (const f of activeFilters) {
          if (keys.has(f)) return true;
        }
        return false;
      });
    }

    // Sort
    if (sort === 'hottest') {
      e.sort((a, b) => {
        const sa = a.type === 'github' ? (a.stars || 0) : ((a.type === 'business' ? a.potential || 3 : 0) * 1000);
        const sb = b.type === 'github' ? (b.stars || 0) : ((b.type === 'business' ? b.potential || 3 : 0) * 1000);
        return sb - sa;
      });
    } else if (sort === 'stars') {
      e.sort((a, b) => {
        const sa = a.type === 'github' ? (a.stars || 0) : 0;
        const sb = b.type === 'github' ? (b.stars || 0) : 0;
        return sb - sa;
      });
    } else {
      e.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    return e;
  }, [all, tab, sort, search, date, activeFilters]);

  // ── Stats ──
  const stats = useMemo<StatsData>(() => ({
    total: entries.length,
    biz: entries.filter(e => e.type === 'business').length,
    gh: entries.filter(e => e.type === 'github').length,
    days: dates.length,
  }), [entries, dates]);

  // ── Filter tags ──
  const filterTags = useMemo<[string, number][]>(() => {
    let base = [...all];
    if (tab === 'business') base = base.filter(e => e.type === 'business');
    else if (tab === 'github') base = base.filter(e => e.type === 'github');
    if (date !== 'all') base = base.filter(e => e.date === date);
    if (search) {
      const q = search.toLowerCase();
      base = base.filter(x => {
        const title = (x.type === 'business' ? x.title : x.name || '').toLowerCase();
        return title.includes(q) || (x.description || '').toLowerCase().includes(q);
      });
    }

    const counter = new Map<string, number>();
    for (const e of base) {
      if (e.type === 'business') {
        (e.tags || []).forEach(t => {
          const k = 't:' + t;
          counter.set(k, (counter.get(k) || 0) + 1);
        });
        counter.set('p:' + (e.potential || 3), (counter.get('p:' + (e.potential || 3)) || 0) + 1);
      } else {
        (e.topics || []).forEach(t => {
          const k = 't:' + t;
          counter.set(k, (counter.get(k) || 0) + 1);
        });
        if (e.language) {
          const lk = 'l:' + e.language;
          counter.set(lk, (counter.get(lk) || 0) + 1);
        }
      }
    }

    return [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  }, [all, tab, date, search]);

  return {
    loading, error, loaded,
    data: { entries: all, dates, lastUpdate },
    entries, stats, filterTags,
    tab, sort, search, date, activeFilters,
    load, setTab, setSort, setSearch, setDate, toggleFilter, clearFilters, getId,
  };
}
