'use client';

import { useEffect, useRef, useState } from 'react';

interface AdBannerProps {
  adKey: string;
  width: number;
  height: number;
  format?: string;
}

/**
 * Renders an Adsterra banner ad directly in the page DOM.
 *
 * Uses a global sequential queue to prevent the `atOptions` collision
 * that occurs when multiple Adsterra ads exist on the same page.
 * Each ad's atOptions is set and invoke.js loaded one at a time,
 * with the next ad only starting after the previous script finishes.
 *
 * Unlike the previous iframe-sandbox approach, this preserves:
 *  - document.referrer → Adsterra can verify traffic source → higher CPM
 *  - Parent page cookies → retargeting advertisers can bid → higher CPM
 *  - Viewability / Intersection Observer → ads register as viewable → higher CPM
 *
 * Ad-blocker resilient: if the ad fails to render after 8s, the
 * container collapses to show no empty space.
 */

// ── Global Sequential Ad Queue ─────────────────────────────────
// Module-level state: persists across component mounts within the
// same JS session. Ensures only one atOptions + invoke.js pair
// executes at a time, preventing the global variable collision.

interface QueuedAd {
  key: string;
  format: string;
  width: number;
  height: number;
  container: HTMLDivElement;
}

const pendingAds: QueuedAd[] = [];
let processing = false;

function processNext() {
  if (processing || pendingAds.length === 0) return;
  processing = true;

  const ad = pendingAds.shift()!;

  // If the component unmounted before we got to it, skip
  if (!ad.container.isConnected) {
    processing = false;
    processNext();
    return;
  }

  // Set atOptions on window — invoke.js reads this synchronously on execution
  (window as any).atOptions = {
    key: ad.key,
    format: ad.format,
    height: ad.height,
    width: ad.width,
    params: {},
  };

  const script = document.createElement('script');
  script.src = `//www.highperformanceformat.com/${ad.key}/invoke.js`;

  const onDone = () => {
    processing = false;
    // Brief delay ensures invoke.js has fully consumed atOptions
    // before we overwrite it for the next ad
    setTimeout(processNext, 150);
  };

  script.onload = onDone;
  script.onerror = onDone;

  ad.container.appendChild(script);
}

function enqueueAd(ad: QueuedAd) {
  pendingAds.push(ad);
  processNext();
}

// ── Component ──────────────────────────────────────────────────

export default function AdBanner({ adKey, width, height, format = 'iframe' }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);
  const [adFailed, setAdFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || injectedRef.current) return;
    injectedRef.current = true;

    enqueueAd({
      key: adKey,
      format,
      width,
      height,
      container: containerRef.current,
    });

    // Ad-blocker detection: after invoke.js runs, it injects ad elements
    // into the container. If only the script tag (1 child) or nothing
    // exists after 8s, the ad was likely blocked.
    const checkTimer = setTimeout(() => {
      if (!containerRef.current) return;
      if (containerRef.current.childElementCount <= 1) {
        setAdFailed(true);
      }
    }, 8000);

    return () => {
      clearTimeout(checkTimer);
      injectedRef.current = false;
      // Remove from pending queue if not yet processed
      const idx = pendingAds.findIndex(
        (a) => a.container === containerRef.current
      );
      if (idx !== -1) pendingAds.splice(idx, 1);
    };
  }, [adKey, width, height, format]);

  if (adFailed) return null;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        width: '100%',
        minHeight: height,
      }}
    />
  );
}
