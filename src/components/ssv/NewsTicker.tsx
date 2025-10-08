'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { NewsItem } from '@/lib/ssv';

interface NewsTickerProps {
  data: NewsItem[] | null;
  loading?: boolean;
  error?: Error | null;
}

export function NewsTicker({ data, loading, error }: NewsTickerProps) {
  if (error) {
    return (
      <Card className="border-white/10 bg-slate-900/80 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Featured News</h3>
          <Badge variant="destructive">Error</Badge>
        </div>
        <p className="text-sm text-slate-400">{error.message}</p>
      </Card>
    );
  }

  const getLocalizedTitle = (title: { [lang: string]: string } | string): string => {
    if (typeof title === 'string') return title;
    
    // Prefer Spanish, then English, then first available
    return title.es || title.en || Object.values(title)[0] || 'No title available';
  };

  const getLocalizedSummary = (summary?: { [lang: string]: string } | string): string => {
    if (!summary) return '';
    if (typeof summary === 'string') return summary;
    
    return summary.es || summary.en || Object.values(summary)[0] || '';
  };

  return (
    <Card className="border-white/10 bg-slate-900/80 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Featured News</h3>
        {loading && (
          <Badge variant="secondary" className="animate-pulse">
            Loading
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4" />
              <div className="h-3 bg-slate-700 rounded w-full" />
              <div className="h-3 bg-slate-700 rounded w-2/3" />
              <div className="flex gap-2">
                <div className="h-5 bg-slate-700 rounded w-16" />
                <div className="h-5 bg-slate-700 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-400">No news available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.slice(0, 8).map((item) => {
            const title = getLocalizedTitle(item.title);
            const summary = getLocalizedSummary(item.summary);
            
            return (
              <div
                key={item.id}
                className="group rounded-lg border border-white/10 bg-slate-800/50 p-4 transition-colors hover:border-white/20 hover:bg-slate-800/70"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:text-blue-300 transition-colors">
                      {title}
                    </h4>
                    {item.sourceLink && item.sourceLink !== '#' && (
                      <a
                        href={item.sourceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
                        aria-label="Read full article"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  
                  {summary && (
                    <p className="text-xs text-slate-300 line-clamp-2">
                      {summary}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex flex-wrap gap-1">
                      {item.matchedCurrencies?.slice(0, 3).map((currency) => (
                        <Badge
                          key={currency}
                          variant="outline"
                          className="text-xs h-5 px-1.5"
                        >
                          {currency.toUpperCase()}
                        </Badge>
                      ))}
                      {item.matchedCurrencies && item.matchedCurrencies.length > 3 && (
                        <Badge variant="outline" className="text-xs h-5 px-1.5">
                          +{item.matchedCurrencies.length - 3}
                        </Badge>
                      )}
                    </div>
                    
                    <span className="text-slate-500">
                      {formatDate(item.publishTime)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data && data.length > 8 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Showing 8 of {data.length} articles
          </p>
        </div>
      )}
    </Card>
  );
}