import { useEffect, useState, useCallback, useMemo } from 'react';
import { ThemeProvider } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useToast, ToastProvider } from '@/components/Toast';
import { Header } from '@/components/Header';
import { StatsCards } from '@/components/StatsCards';
import { TabsBar } from '@/components/TabsBar';
import { SearchToolbar } from '@/components/SearchToolbar';
import { ChipFilter } from '@/components/ChipFilter';
import { CardGrid } from '@/components/CardGrid';
import { DetailModal } from '@/components/DetailModal';
import { AuthModal, InviteModal } from '@/components/AuthModal';
import type { Entry, TabMode } from '@/types';

function AppInner() {
  const auth = useAuth();
  const data = useData();
  const toast = useToast();
  const [detailEntry, setDetailEntry] = useState<Entry | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    data.load();
  }, []);

  // Filter favorites based on auth state
  const displayEntries = useMemo(() => {
    if (data.tab !== 'favorites') return data.entries;
    return data.entries.filter(e => auth.isFavorite(data.getId(e)));
  }, [data.entries, data.tab, data.getId, auth]);

  // Recompute stats for favorites
  const displayStats = useMemo(() => {
    if (data.tab !== 'favorites') return data.stats;
    const entries = displayEntries;
    return {
      total: entries.length,
      biz: entries.filter(e => e.type === 'business').length,
      gh: entries.filter(e => e.type === 'github').length,
      days: data.data.dates.length,
    };
  }, [data.tab, data.stats, displayEntries, data.data.dates.length]);

  const handleFavorite = useCallback((id: string) => {
    if (!auth.isLoggedIn) {
      setShowAuth(true);
      return;
    }
    auth.toggleFavorite(id);
    const isFav = auth.isFavorite(id);
    toast.show(isFav ? '已收藏' : '已取消收藏');
  }, [auth, toast]);

  const handleDetail = useCallback((entry: Entry) => {
    setDetailEntry(entry);
    document.body.style.overflow = 'hidden';
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailEntry(null);
    document.body.style.overflow = '';
  }, []);

  const handleFilterClick = useCallback((key: string) => {
    data.toggleFilter(key);
  }, [data]);

  const handleInvite = useCallback(() => {
    if (!auth.isLoggedIn) {
      setShowAuth(true);
      return;
    }
    const code = auth.generateCode();
    if (code) setInviteCode(code);
    else toast.show('生成邀请码失败，请重试');
  }, [auth, toast]);

  const handleCopyInvite = useCallback(() => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode).then(
        () => toast.show('已复制邀请码'),
        () => toast.show('复制失败，请手动复制')
      );
    }
  }, [inviteCode, toast]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <Header
          user={auth.user}
          lastUpdate={data.data.lastUpdate}
          onLoginClick={() => setShowAuth(true)}
          onLogout={() => { auth.logout(); toast.show('已退出'); }}
          onInviteClick={handleInvite}
        />

        <StatsCards stats={displayStats} />

        <TabsBar tab={data.tab} onChange={(t: TabMode) => data.setTab(t)} />

        <SearchToolbar
          search={data.search}
          sort={data.sort}
          date={data.date}
          dates={data.data.dates}
          onSearchChange={data.setSearch}
          onSortChange={data.setSort}
          onDateChange={data.setDate}
        />

        <ChipFilter
          tags={data.filterTags}
          activeFilters={data.activeFilters}
          onToggle={handleFilterClick}
          onClear={data.clearFilters}
        />

        <CardGrid
          entries={displayEntries}
          loading={data.loading}
          isFavorite={auth.isFavorite}
          onFavorite={handleFavorite}
          onDetail={handleDetail}
          onFilterClick={handleFilterClick}
          getId={data.getId}
        />
      </div>

      {/* Modals */}
      {detailEntry && (
        <DetailModal
          entry={detailEntry}
          onClose={handleCloseDetail}
          onFilterClick={handleFilterClick}
        />
      )}

      {showAuth && (
        <AuthModal
          onLogin={(u, p) => {
            const r = auth.login(u, p);
            if (r.ok) toast.show('欢迎回来，' + u);
            return r;
          }}
          onRegister={(u, p, c) => {
            const r = auth.register(u, p, c);
            if (r.ok) toast.show('注册成功，欢迎 ' + u);
            return r;
          }}
          onClose={() => setShowAuth(false)}
        />
      )}

      {inviteCode && (
        <InviteModal
          code={inviteCode}
          onClose={() => setInviteCode(null)}
          onCopy={handleCopyInvite}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </ThemeProvider>
  );
}
