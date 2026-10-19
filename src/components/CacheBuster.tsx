'use client';

import { useEffect } from 'react';
const LOCAL_VERSION_KEY = 'cinexp_cache_version';

/** Refresh application caches without deleting a viewer's saved titles or progress. */
export default function CacheBuster() {
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch('/api/cache-version', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const { version } = await response.json();
        if (typeof version !== 'string' || controller.signal.aborted) return;
        const previous = localStorage.getItem(LOCAL_VERSION_KEY);
        if (previous !== null && previous !== version && 'caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter(key => key.startsWith('workbox-') || key.startsWith('cinexp-')).map(key => caches.delete(key)));
        }
        if (!controller.signal.aborted) localStorage.setItem(LOCAL_VERSION_KEY, version);
      } catch { /* A failed cache refresh must not interrupt viewing. */ }
    }
    void refresh();
    return () => controller.abort();
  }, []);
  return null;
}
