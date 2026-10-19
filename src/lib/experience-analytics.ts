"use client";

import { track } from '@vercel/analytics';
import { sanitizeMeasurement } from './measurement-url';

type ExperienceEvent = 'experience_session' | 'playback_attempt' | 'playback_started'
  | 'playback_failed' | 'download_link_action' | 'ad_request' | 'ad_load_failed';
type Properties = Record<string, string | number | boolean>;

/** No signed URLs, search strings, referrers, tokens, or user identifiers. */
export function trackExperience(event: ExperienceEvent, properties: Properties = {}) {
  if (typeof window === 'undefined' || navigator.doNotTrack === '1') return;
  const data = { ...properties, experience: 'cinematic-v1' };
  // A local hook lets deterministic browser tests inspect instrumentation without
  // contacting an analytics service. It is not an impression/revenue counter.
  window.dispatchEvent(new CustomEvent('cinexp:measurement', { detail: { event, properties: data } }));
  try {
    // The first session effect can run before the Analytics component mounts.
    // Queue its privacy hook before the event, using the SDK's queue contract.
    if (!window.va) window.va = (kind, payload) => { (window.vaq ??= []).push([kind, payload]); };
    window.va('beforeSend', sanitizeMeasurement);
    track(event, data);
  } catch { /* Measurement never blocks a user action. */ }
}

export function trackSession() {
  try {
    const now = Date.now();
    const previous = Number(localStorage.getItem('cinexp_last_visit') || 0);
    const session = Number(sessionStorage.getItem('cinexp_session_activity') || 0);
    if (!session || now - session > 30 * 60 * 1000) {
      trackExperience('experience_session', { returning: previous > 0 && now - previous > 30 * 60 * 1000 });
    }
    sessionStorage.setItem('cinexp_session_activity', String(now));
    localStorage.setItem('cinexp_last_visit', String(now));
  } catch { /* Private browsing and full storage must remain usable. */ }
}
