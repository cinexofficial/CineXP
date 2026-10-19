/**
 * Client-side signal collector for the "Recommended for You" engine.
 * 
 * Reads from ALL localStorage sources (watch history, watchlist, progress)
 * to build a set of seed title IDs. These seeds are sent to the server
 * which queries TMDB's /recommendations endpoint for each.
 */

export interface SeedItem {
  id: number;
  type: 'movie' | 'tv';
}

export interface UserSignals {
  /** Up to 10 seed titles to query TMDB recommendations for */
  seeds: SeedItem[];
  /** False if the user has zero interaction — section should not render */
  hasInteraction: boolean;
}

const HISTORY_KEY = 'cinexp_watch_history';
const WATCHLIST_KEY = 'cinexp_watchlist';
const CINEXP_HISTORY_KEY = 'cinexpHistory';
const VIDLINK_KEY = 'vidLinkProgress';
const VIDFAST_KEY = 'vidFastProgress';

/**
 * Collect user interaction signals from all localStorage sources.
 * Returns a deduplicated list of seed IDs sorted by recency/relevance.
 */
export function getUserSignals(): UserSignals {
  if (typeof window === 'undefined') {
    return { seeds: [], hasInteraction: false };
  }

  const seedMap = new Map<string, SeedItem>();

  // Helper to add a seed (dedupes by "type:id")
  const addSeed = (id: number | string, type: 'movie' | 'tv') => {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numId) || numId <= 0) return;
    const key = `${type}:${numId}`;
    if (!seedMap.has(key)) {
      seedMap.set(key, { id: numId, type });
    }
  };

  // 1. Watch history (most relevant — things user actually watched)
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const items = JSON.parse(raw) as { id: string | number; type: 'movie' | 'tv' }[];
      items.forEach(item => addSeed(item.id, item.type));
    }
  } catch {}

  // 2. Watchlist (strong intent signal — user bookmarked these)
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (raw) {
      const items = JSON.parse(raw) as { id: string | number; type: 'movie' | 'tv' }[];
      items.forEach(item => addSeed(item.id, item.type));
    }
  } catch {}

  // 3. Internal progress (cinexpHistory — has actual watch sessions)
  try {
    const raw = localStorage.getItem(CINEXP_HISTORY_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Record<string, unknown>;
      Object.keys(data).forEach(key => {
        // Keys are like "m12345" (movie) or "t67890" (tv)
        const type = key.startsWith('t') ? 'tv' : 'movie';
        const id = parseInt(key.slice(1), 10);
        if (!isNaN(id)) addSeed(id, type as 'movie' | 'tv');
      });
    }
  } catch {}

  // 4. Vidlink progress
  try {
    const raw = localStorage.getItem(VIDLINK_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Record<string, { type?: string }>;
      Object.entries(data).forEach(([id, info]) => {
        const type = info.type === 'tv' ? 'tv' : 'movie';
        addSeed(id, type as 'movie' | 'tv');
      });
    }
  } catch {}

  // 5. Vidfast progress
  try {
    const raw = localStorage.getItem(VIDFAST_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Record<string, { type?: string }>;
      Object.entries(data).forEach(([key, info]) => {
        const type = (info.type === 'tv' || key.startsWith('t')) ? 'tv' : 'movie';
        const id = parseInt(key.replace(/^[mt]/, ''), 10);
        if (!isNaN(id)) addSeed(id, type as 'movie' | 'tv');
      });
    }
  } catch {}

  // Take the first 10 seeds (history items come first = most recent/relevant)
  const seeds = Array.from(seedMap.values()).slice(0, 10);

  return {
    seeds,
    hasInteraction: seeds.length > 0,
  };
}

/**
 * Encode seeds into a query-string-friendly format.
 * Example: "movie:123,tv:456,movie:789"
 */
export function encodeSeedsParam(seeds: SeedItem[]): string {
  return seeds.map(s => `${s.type}:${s.id}`).join(',');
}
