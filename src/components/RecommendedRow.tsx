'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { getUserSignals, encodeSeedsParam } from '@/lib/recommendations';
import MediaCard from './MediaCard';
import type { TMDBMediaItem } from '@/lib/tmdb';

const subscribe = (callback: () => void) => {
  for (const event of ['storage', 'watchlistUpdated', 'historyUpdated']) window.addEventListener(event, callback);
  return () => { for (const event of ['storage', 'watchlistUpdated', 'historyUpdated']) window.removeEventListener(event, callback); };
};
const snapshot = () => { const signals = getUserSignals(); return signals.hasInteraction ? encodeSeedsParam(signals.seeds) : ''; };

export default function RecommendedRow() {
  const seeds = useSyncExternalStore(subscribe, snapshot, () => '');
  const [result, setResult] = useState<{ seeds: string; items: TMDBMediaItem[] }>({ seeds: '', items: [] });
  useEffect(() => {
    if (!seeds) return;
    const controller = new AbortController();
    fetch(`/api/tmdb/recommended?seeds=${seeds}`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setResult({ seeds, items: data.results || [] }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ seeds, items: [] }); });
    return () => controller.abort();
  }, [seeds]);
  if (!seeds || (result.seeds === seeds && !result.items.length)) return null;
  const loading = result.seeds !== seeds;
  return <section className="cx-section"><div className="cx-section-heading"><div><p className="cx-eyebrow">Inspired by your watchlist</p><h2>More of your kind of story.</h2></div></div><div className="grid" aria-busy={loading}>{loading ? Array.from({ length: 6 }, (_, index) => <div className="cx-skeleton" style={{ aspectRatio: '2/3' }} key={index} />) : result.items.map(item => <MediaCard key={`${item.media_type}-${item.id}`} item={item} />)}</div></section>;
}
