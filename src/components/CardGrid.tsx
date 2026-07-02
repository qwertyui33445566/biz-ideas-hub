import { BusinessCard, GithubCard, useTranslate } from './Cards';
import type { Entry, BusinessEntry, GithubEntry } from '@/types';

interface CardGridProps {
  entries: Entry[];
  loading: boolean;
  isFavorite: (id: string) => boolean;
  onFavorite: (id: string) => void;
  onDetail: (entry: Entry) => void;
  onFilterClick: (key: string) => void;
  getId: (entry: Entry) => string;
}

function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden p-5 space-y-3">
      <div className="flex justify-between">
        <div className="h-5 w-20 rounded-full shimmer" />
        <div className="h-4 w-16 rounded shimmer" />
      </div>
      <div className="h-5 w-3/4 rounded shimmer" />
      <div className="h-3 w-full rounded shimmer" />
      <div className="h-3 w-2/3 rounded shimmer" />
      <div className="flex gap-2 pt-2">
        <div className="h-5 w-14 rounded-md shimmer" />
        <div className="h-5 w-14 rounded-md shimmer" />
        <div className="h-5 w-14 rounded-md shimmer" />
      </div>
      <div className="flex gap-2 pt-3">
        <div className="h-9 flex-1 rounded-full shimmer" />
        <div className="h-9 w-9 rounded-full shimmer" />
      </div>
    </div>
  );
}

export function CardGrid({
  entries, loading, isFavorite, onFavorite, onDetail, onFilterClick, getId,
}: CardGridProps) {
  const translate = useTranslate();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4 opacity-30">🔍</div>
        <p className="text-lg text-muted-foreground">没有匹配的内容</p>
        <p className="text-sm text-muted-foreground/50 mt-1">试试调整筛选条件或清空搜索</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-muted-foreground mb-4 font-medium">
        共 {entries.length} 条内容
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        {entries.map(entry => {
          const id = getId(entry);
          const fav = isFavorite(id);

          if (entry.type === 'business') {
            return (
              <BusinessCard
                key={id}
                entry={entry as BusinessEntry}
                isFavorite={fav}
                onFavorite={() => onFavorite(id)}
                onDetail={() => onDetail(entry)}
                onFilterClick={onFilterClick}
              />
            );
          }
          return (
            <GithubCard
              key={id}
              entry={entry as GithubEntry}
              isFavorite={fav}
              onFavorite={() => onFavorite(id)}
              onDetail={() => onDetail(entry)}
              onFilterClick={onFilterClick}
              translateFn={translate}
            />
          );
        })}
      </div>
    </>
  );
}
