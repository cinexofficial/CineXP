"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { VscPlay } from 'react-icons/vsc';
import { trackExperience } from '@/lib/experience-analytics';
import type { AdPlacement } from '@/lib/ad-policy';
import { buildAdDocument } from '@/lib/ad-document';

export default function AdBanner({ adKey, width, height, placement, networkEnabled = false }: {
  adKey: string; width: number; height: number; placement: AdPlacement; networkEnabled?: boolean;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const channel = useId();
  const [near, setNear] = useState(false);
  const [fits, setFits] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'rendered' | 'failed'>('idle');
  useEffect(() => {
    const element = wrapper.current;
    if (!element || !networkEnabled) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { rootMargin: '250px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [networkEnabled]);
  useEffect(() => {
    const element = wrapper.current;
    if (!element || !networkEnabled) return;
    const observer = new ResizeObserver(entries => {
      setFits((entries[0]?.contentRect.width || 0) >= width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [networkEnabled, width]);
  const validKey = /^[a-f0-9]{32}$/i.test(adKey);
  const active = near && fits && networkEnabled && validKey;
  useEffect(() => {
    if (!active) return;
    let complete = false;
    trackExperience('ad_request', { placement });
    const finish = (rendered: boolean) => {
      if (complete) return;
      complete = true;
      clearTimeout(timer);
      setStatus(rendered ? 'rendered' : 'failed');
      if (!rendered) trackExperience('ad_load_failed', { placement });
    };
    const timer = setTimeout(() => finish(false), 8000);
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== 'null'
        || event.data?.channel !== channel) return;
      if (event.data.state === 'rendered') finish(true);
      if (event.data.state === 'failed') finish(false);
    };
    window.addEventListener('message', receive);
    frame.current?.contentWindow?.postMessage({ channel, action: 'start' }, '*');
    return () => { complete = true; clearTimeout(timer); window.removeEventListener('message', receive); };
  }, [active, channel, placement]);
  const source = buildAdDocument(validKey ? adKey : '', width, height, channel,
    process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_AD_TEST_ORIGIN : undefined);
  return <div ref={wrapper} className="cx-ad-canvas" data-ad-state={active && status === 'idle' ? 'loading' : status}>
    <div className="cx-ad-fallback"><VscPlay aria-hidden="true" /><span>CineXP · A world of stories.</span></div>
    {active && status !== 'failed' && <iframe key={`${adKey}-${width}-${height}`} ref={frame} title="Advertisement"
      width={width} height={height} srcDoc={source} sandbox="allow-scripts"
      referrerPolicy="strict-origin-when-cross-origin" loading="lazy"
      onLoad={() => frame.current?.contentWindow?.postMessage({ channel, action: 'start' }, '*')}
      style={{ position: 'absolute', inset: 0, border: 0, maxWidth: '100%', opacity: status === 'rendered' ? 1 : 0 }} />}
  </div>;
}
