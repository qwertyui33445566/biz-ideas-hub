import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ExternalLink, Star, Languages, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Entry, BusinessEntry, GithubEntry } from '@/types';

interface DetailModalProps {
  entry: Entry | null;
  onClose: () => void;
  onFilterClick: (key: string) => void;
}

function useDetailTranslate() {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async (text: string) => {
    if (translated) {
      setTranslated(null);
      return;
    }
    if (!text || !/[a-zA-Z]{3,}/.test(text)) return;

    setLoading(true);
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=en|zh`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.responseData?.translatedText) {
        setTranslated(json.responseData.translatedText);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [translated]);

  // Reset when entry changes
  useEffect(() => {
    setTranslated(null);
    setLoading(false);
  }, []);

  return { translated, loading, toggle };
}

export function DetailModal({ entry, onClose, onFilterClick }: DetailModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const translate = useDetailTranslate();

  useEffect(() => {
    if (!entry) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [entry, onClose]);

  useEffect(() => {
    if (entry) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [entry]);

  if (!entry) return null;

  const isBusiness = entry.type === 'business';
  const biz = isBusiness ? (entry as BusinessEntry) : null;
  const gh = !isBusiness ? (entry as GithubEntry) : null;
  const desc = entry.description || '暂无描述';
  const displayDesc = translate.translated ?? desc;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <div
        ref={ref}
        onClick={e => e.stopPropagation()}
        className="relative glass-card rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
      >
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card/90 backdrop-blur-xl z-10">
          <h2 className="text-base font-bold line-clamp-1 pr-4">
            {isBusiness ? biz!.title : (gh!.name || '').split('/')[1] || gh!.name}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-8 w-8 rounded-full border border-border/50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center justify-between">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border',
              isBusiness
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            )}>
              {isBusiness ? '商业点子' : 'GitHub'}
            </span>

            {isBusiness && (
              <span className="flex gap-0.5 text-base">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={cn(
                    'h-4 w-4',
                    i <= (biz!.potential || 3) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'
                  )} />
                ))}
              </span>
            )}

            {/* Translate button for GitHub */}
            {!isBusiness && (
              <button
                onClick={() => translate.toggle(desc)}
                disabled={translate.loading}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                  translate.translated
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    : 'bg-secondary/50 text-muted-foreground border-transparent hover:border-cyan-500/25 hover:text-cyan-400'
                )}
              >
                {translate.loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Languages className="h-3.5 w-3.5" />
                )}
                {translate.translated ? '原文' : '翻译'}
              </button>
            )}
          </div>

          <div className={cn(
            'text-sm leading-relaxed whitespace-pre-wrap transition-colors duration-300',
            translate.translated ? 'text-emerald-300/90' : 'text-foreground/90'
          )}>
            {displayDesc}
          </div>

          {isBusiness && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '市场规模', value: biz!.marketSize || '待验证', color: 'text-cyan-400' },
                { label: '竞争程度', value: biz!.competition || '中', color: 'text-emerald-400' },
                { label: '启动资金', value: biz!.investment || '待评估', color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-secondary/50 rounded-xl p-3 text-center border border-border/30">
                  <div className={cn('text-sm font-bold', color)}>{value}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
                </div>
              ))}
            </div>
          )}

          {!isBusiness && (
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400">
                ★ {gh!.stars.toLocaleString()}
              </span>
              <span className="px-3 py-1 rounded-lg text-xs bg-secondary text-muted-foreground">
                🍴 {gh!.forks.toLocaleString()}
              </span>
              {gh!.language && (
                <span className="px-3 py-1 rounded-lg text-xs bg-secondary text-muted-foreground">
                  {gh!.language}
                </span>
              )}
            </div>
          )}

          {isBusiness && biz!.tags && (
            <div className="flex flex-wrap gap-1.5">
              {biz!.tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => { onFilterClick('t:' + tag); onClose(); }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-secondary text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          {!isBusiness && gh!.topics && (
            <div className="flex flex-wrap gap-1.5">
              {gh!.topics.map(topic => (
                <button
                  key={topic}
                  onClick={() => { onFilterClick('t:' + topic); onClose(); }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-secondary text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                >
                  {topic}
                </button>
              ))}
            </div>
          )}

          {!isBusiness && gh!.url && (
            <a
              href={gh!.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] transition-all duration-300 no-underline"
            >
              <ExternalLink className="h-4 w-4" />
              前往 GitHub
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
