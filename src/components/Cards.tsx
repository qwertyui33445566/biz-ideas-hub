import { useState, useCallback } from 'react';
import { Heart, ExternalLink, Languages, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BusinessEntry, GithubEntry } from '@/types';

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5 text-sm">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={cn(i <= value ? 'text-amber-400' : 'text-muted-foreground/20')}>
          ★
        </span>
      ))}
    </span>
  );
}

// ── Translation hook ──
function useTranslate() {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const translate = useCallback(async (text: string, entryId: string) => {
    if (translations[entryId]) return; // already cached
    if (!text || !/[a-zA-Z]{3,}/.test(text)) return; // skip if no English

    setLoading(true);
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=en|zh`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.responseData?.translatedText) {
        setTranslations(prev => ({ ...prev, [entryId]: json.responseData.translatedText }));
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [translations]);

  const toggle = useCallback((text: string, entryId: string) => {
    if (translations[entryId]) {
      // Already translated — toggle off
      setTranslations(prev => {
        const next = { ...prev };
        delete next[entryId];
        return next;
      });
    } else {
      translate(text, entryId);
    }
  }, [translations, translate]);

  return { translations, translateLoading: loading, toggle };
}

export function BusinessCard({
  entry,
  isFavorite,
  onFavorite,
  onDetail,
  onFilterClick,
}: {
  entry: BusinessEntry;
  isFavorite: boolean;
  onFavorite: () => void;
  onDetail: () => void;
  onFilterClick: (key: string) => void;
}) {
  return (
    <article
      onClick={onDetail}
      className="glass-card rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/5"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
          商业点子
        </span>
        <StarRating value={entry.potential || 3} />
      </div>

      <div className="px-5 py-3">
        <h3 className="font-bold text-[15px] leading-snug line-clamp-2 mb-1.5 group-hover:text-cyan-300 transition-colors">
          {entry.title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {entry.description}
        </p>
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {entry.tags.slice(0, 4).map(tag => (
              <button
                key={tag}
                onClick={e => { e.stopPropagation(); onFilterClick('t:' + tag); }}
                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-secondary text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-5 pb-5 pt-1">
        <button
          onClick={e => { e.stopPropagation(); onDetail(); }}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-full text-xs font-medium bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          详情
        </button>
        <button
          onClick={e => { e.stopPropagation(); onFavorite(); }}
          className={cn(
            'flex items-center justify-center h-9 w-9 rounded-full border transition-all duration-200',
            isFavorite
              ? 'bg-pink-500/10 border-pink-500/30 text-pink-400'
              : 'bg-secondary/50 border-transparent text-muted-foreground hover:border-pink-500/20 hover:text-pink-400'
          )}
          aria-label={isFavorite ? '取消收藏' : '收藏'}
        >
          <Heart className={cn('h-4 w-4 transition-transform', isFavorite && 'fill-current scale-110')} />
        </button>
      </div>
    </article>
  );
}

export function GithubCard({
  entry,
  isFavorite,
  onFavorite,
  onDetail,
  onFilterClick,
  translateFn,
}: {
  entry: GithubEntry;
  isFavorite: boolean;
  onFavorite: () => void;
  onDetail: () => void;
  onFilterClick: (key: string) => void;
  translateFn: ReturnType<typeof useTranslate>;
}) {
  const repoName = (entry.name || '').split('/')[1] || entry.name || '';
  const entryId = 'gh-' + entry.name;
  const desc = entry.description || '暂无描述';
  const hasTranslation = !!translateFn.translations[entryId];
  const displayDesc = hasTranslation ? translateFn.translations[entryId] : desc;

  return (
    <article
      onClick={onDetail}
      className="glass-card rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/5"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          GitHub
        </span>
      </div>

      <div className="px-5 py-3">
        <h3 className="font-bold text-[15px] leading-snug line-clamp-1 mb-1 group-hover:text-cyan-300 transition-colors font-mono">
          {repoName}
        </h3>
        <p className="text-[11px] text-muted-foreground/60 line-clamp-1 mb-2 font-mono">
          {entry.name}
        </p>
        <div className="flex items-start gap-1.5">
          <p className={cn(
            'text-xs leading-relaxed flex-1 min-w-0',
            hasTranslation ? 'text-emerald-300/80 line-clamp-3' : 'text-muted-foreground line-clamp-2',
            'transition-colors duration-300'
          )}>
            {displayDesc}
          </p>
          {/* Translate button */}
          <button
            onClick={e => {
              e.stopPropagation();
              translateFn.toggle(desc, entryId);
            }}
            disabled={translateFn.translateLoading}
            className={cn(
              'shrink-0 flex items-center justify-center h-5 w-5 rounded text-[10px] transition-all duration-200',
              hasTranslation
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'bg-secondary/50 text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent'
            )}
            aria-label={hasTranslation ? '显示原文' : '翻译成中文'}
            title={hasTranslation ? '显示原文' : '翻译成中文'}
          >
            {translateFn.translateLoading && !hasTranslation ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Languages className="h-3 w-3" />
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400">
            ★ {entry.stars.toLocaleString()}
          </span>
          {entry.language && (
            <button
              onClick={e => { e.stopPropagation(); onFilterClick('l:' + entry.language); }}
              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-secondary text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              {entry.language}
            </button>
          )}
          {entry.topics?.slice(0, 3).map(topic => (
            <button
              key={topic}
              onClick={e => { e.stopPropagation(); onFilterClick('t:' + topic); }}
              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-secondary text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 pb-5 pt-1">
        <a
          href={entry.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-full text-xs font-medium bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors no-underline"
        >
          <ExternalLink className="h-3 w-3" />
          GitHub
        </a>
        <button
          onClick={e => { e.stopPropagation(); onFavorite(); }}
          className={cn(
            'flex items-center justify-center h-9 w-9 rounded-full border transition-all duration-200',
            isFavorite
              ? 'bg-pink-500/10 border-pink-500/30 text-pink-400'
              : 'bg-secondary/50 border-transparent text-muted-foreground hover:border-pink-500/20 hover:text-pink-400'
          )}
          aria-label={isFavorite ? '取消收藏' : '收藏'}
        >
          <Heart className={cn('h-4 w-4 transition-transform', isFavorite && 'fill-current scale-110')} />
        </button>
      </div>
    </article>
  );
}

export { useTranslate };
