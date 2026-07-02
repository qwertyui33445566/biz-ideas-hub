import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChipFilterProps {
  tags: [string, number][];
  activeFilters: Set<string>;
  onToggle: (k: string) => void;
  onClear: () => void;
}

function formatLabel(key: string): string {
  if (key.startsWith('t:')) return key.slice(2);
  if (key.startsWith('l:')) return key.slice(2);
  if (key.startsWith('p:')) return '★'.repeat(parseInt(key.slice(2), 10));
  return key;
}

export function ChipFilter({ tags, activeFilters, onToggle, onClear }: ChipFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-5 min-h-0">
      {activeFilters.size > 0 && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <X className="h-3 w-3" />
          清除
        </button>
      )}
      {tags.map(([key, count]) => {
        const active = activeFilters.has(key);
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 border',
              active
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.1)]'
                : 'bg-secondary/50 border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}
          >
            {formatLabel(key)}
            <span className="opacity-40">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
