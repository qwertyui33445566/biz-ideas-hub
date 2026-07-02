import { BarChart3, Lightbulb, Github, CalendarDays } from 'lucide-react';
import type { StatsData } from '@/types';

export function StatsCards({ stats }: { stats: StatsData }) {
  const items = [
    { label: '总条目', value: stats.total, icon: BarChart3, color: 'text-cyan-400' },
    { label: '商业点子', value: stats.biz, icon: Lightbulb, color: 'text-purple-400' },
    { label: 'GitHub', value: stats.gh, icon: Github, color: 'text-emerald-400' },
    { label: '覆盖天数', value: stats.days, icon: CalendarDays, color: 'text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-7">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="group glass-card rounded-2xl p-5 text-center cursor-default transition-all duration-300 hover:-translate-y-1"
        >
          <div className={`text-3xl font-extrabold tracking-tight ${color} transition-transform duration-300 group-hover:scale-110`}>
            {value}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5 uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5">
            <Icon className="h-3 w-3" />
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
