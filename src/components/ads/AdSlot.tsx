"use client";

import { useSyncExternalStore } from 'react';
import type { AdPlacement } from '@/lib/ad-policy';
import AdBanner from './AdBanner';

const subscribe = (callback: () => void) => {
  const media = window.matchMedia('(max-width: 767px)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};
const snapshot = () => window.matchMedia('(max-width: 767px)').matches;

export default function AdSlot({ placement, networkEnabled = false }: { placement: AdPlacement; networkEnabled?: boolean }) {
  const mobile = useSyncExternalStore(subscribe, snapshot, () => false);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const dimensions = mobile ? { adKey: '47487de96b361fef4cd73964201393c1', width: 320, height: 50 }
    : { adKey: '636ac374dbb99b948710af913b4a7592', width: 728, height: 90 };
  return <aside className="cx-ad-slot cx-ad-slot--slim" aria-label={placement === 'home-secondary' ? 'Advertisement later in your home feed' : 'Advertisement'} data-placement={placement}>
    <span className="cx-ad-label">Advertisement</span>
    <AdBanner key={`${dimensions.width}-${dimensions.height}`} {...dimensions} placement={placement} networkEnabled={mounted && networkEnabled} />
  </aside>;
}
