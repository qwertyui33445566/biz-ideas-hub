import { Sun, Moon, LogOut, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import type { User } from '@/types';

interface HeaderProps {
  user: User | null;
  lastUpdate: string | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onInviteClick: () => void;
}

export function Header({ user, lastUpdate, onLoginClick, onLogout, onInviteClick }: HeaderProps) {
  const { resolved, toggle } = useTheme();
  const initials = user?.username?.charAt(0) || '?';

  const formatDate = (ts: string | null) => {
    if (!ts) return '加载数据中...';
    try {
      const d = new Date(ts);
      return `数据更新于 ${d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return '加载数据中...';
    }
  };

  return (
    <header className="sticky top-0 z-50 -mx-6 px-6 border-b border-border/50 bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/50">
      <div className="flex items-center justify-between py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <div>
          <h1 className="text-xl font-extrabold tracking-tight leading-tight">
            <span className="gradient-text">灵感引擎</span>
          </h1>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide">
            {formatDate(lastUpdate)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="rounded-full h-10 w-10 border border-border/50 hover:border-cyan-500/30 hover:text-cyan-400 transition-all duration-300"
            aria-label="切换主题"
          >
            {resolved === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <>
              <div className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-full border border-border/50 bg-secondary/50">
                <span className="text-sm font-medium">{user.username}</span>
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 text-white text-xs font-bold">
                  {initials}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={onLogout}
                  aria-label="退出"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onInviteClick}
                className="rounded-full text-xs border-border/50 hover:border-amber-500/30 hover:text-amber-400"
              >
                <Ticket className="h-3.5 w-3.5 mr-1" />
                邀请
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onLoginClick}
              className="rounded-full text-xs border-border/50 hover:border-cyan-500/30"
            >
              登录
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
