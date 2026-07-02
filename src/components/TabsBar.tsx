import { cn } from '@/lib/utils';
import type { TabMode } from '@/types';

const tabs: { value: TabMode; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'business', label: '商业点子' },
  { value: 'github', label: 'GitHub 项目' },
  { value: 'favorites', label: '收藏' },
];

export function TabsBar({ tab, onChange }: { tab: TabMode; onChange: (t: TabMode) => void }) {
  return (
    <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            'px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300',
            'border border-transparent',
            tab === value
              ? 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.1)]'
              : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
