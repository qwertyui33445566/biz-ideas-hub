import { Search } from 'lucide-react';
import type { SortMode } from '@/types';

interface SearchToolbarProps {
  search: string;
  sort: SortMode;
  date: string;
  dates: string[];
  onSearchChange: (q: string) => void;
  onSortChange: (s: SortMode) => void;
  onDateChange: (d: string) => void;
}

export function SearchToolbar({
  search, sort, date, dates,
  onSearchChange, onSortChange, onDateChange,
}: SearchToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-5">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="搜索标题、描述、标签..."
          className="w-full h-11 pl-10 pr-4 rounded-full bg-secondary/50 border border-border/50 text-sm outline-none transition-all duration-300 focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/10 placeholder:text-muted-foreground/60"
        />
      </div>
      <div className="flex gap-2">
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value as SortMode)}
          className="h-11 px-4 rounded-full bg-secondary/50 border border-border/50 text-sm outline-none cursor-pointer transition-all duration-300 focus:border-cyan-500/40 appearance-none pr-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMyA1bDMgMyAzLTMiIHN0cm9rZT0iIzg4OCIgc3Ryb2tlLXdpZHRoPSIxLjUiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_12px_center]"
        >
          <option value="newest">最新</option>
          <option value="hottest">热门</option>
          <option value="stars">Star 排名</option>
        </select>
        <select
          value={date}
          onChange={e => onDateChange(e.target.value)}
          className="h-11 px-4 rounded-full bg-secondary/50 border border-border/50 text-sm outline-none cursor-pointer transition-all duration-300 focus:border-cyan-500/40 appearance-none pr-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMyA1bDMgMyAzLTMiIHN0cm9rZT0iIzg4OCIgc3Ryb2tlLXdpZHRoPSIxLjUiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_12px_center]"
        >
          <option value="all">全部日期</option>
          {dates.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
