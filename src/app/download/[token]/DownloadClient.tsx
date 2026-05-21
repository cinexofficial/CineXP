'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './download.module.css';
import AdBanner from '@/components/ads/AdBanner';
import AdNative from '@/components/ads/AdNative';

interface DownloadMeta {
  t: string;
  q: string;
  s: string;
  p: string;
  sub?: string;
}

export default function DownloadClient({ token, waitingPageEnabled = true }: { token: string, waitingPageEnabled?: boolean }) {
  const router = useRouter();
  const [meta, setMeta] = useState<DownloadMeta | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [status, setStatus] = useState<'loading' | 'countdown' | 'ready' | 'error'>('loading');
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [finalSubUrl, setFinalSubUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  

  useEffect(() => {
    // 1. Decode token for immediate display
    try {
      const payloadB64 = token.split('.')[0];
      const decoded: any = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'));
      setMeta({ t: decoded.t, q: decoded.q, s: decoded.s, p: decoded.p, sub: decoded.sub });
      setStatus('countdown');
    } catch (e) {
      setStatus('error');
      setErrorMsg('Invalid download link.');
      setTimeout(() => router.push('/'), 3000);
      return;
    }

    // Popunder & Social Bar are loaded globally via layout.tsx — no duplicate injection needed
  }, [token, router]);

  useEffect(() => {
    // Timer logic
    if (status !== 'countdown') return;

    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Timer finished -> resolve actual URL
      resolveDownload();
    }
  }, [timeLeft, status]);

  const resolveDownload = async () => {
    try {
      const res = await fetch(`/api/download/resolve?token=${token}`);
      const data = await res.json();
      
      if (res.ok && data.url) {
        setFinalUrl(data.url);
        if (data.subtitleUrl) setFinalSubUrl(data.subtitleUrl);
        setStatus('ready');
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Link expired. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  };

  const handleDownloadClick = () => {
    if (finalUrl) {
      // Open download in new tab IMMEDIATELY to bypass popup blockers
      window.open(finalUrl, '_blank');

      if (finalSubUrl) {
        // Delay subtitle slightly to let the first download start
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = finalSubUrl;
          a.download = '';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, 800);
      }
      
      // Redirect current page to Smartlink after ensuring sub download has time to fire
      setTimeout(() => {
        window.location.href = 'https://eagerdazzle.com/tsy4jdcf?key=a1098a5f49912838eff6c5dd7f197787';
      }, 1500);
    }
  };

  if (status === 'loading') return null;

  const progressPct = ((10 - timeLeft) / 10) * 100;

  return (
    <div className={styles.downloadContainer}>
      <div className={styles.mainGrid}>
        
        {/* Left Sidebar (Desktop) */}
        {waitingPageEnabled && (
          <div className={`${styles.adWrapper} ${styles.desktopAd} ${styles.sidebarAd}`}>
            <AdBanner adKey="87b1f98e2b43417d714893dfa11c7e9f" width={300} height={250} />
          </div>
        )}

        {/* Center Content */}
        <div className={styles.centerColumn}>

          {/* Desktop Leaderboard */}
          {waitingPageEnabled && (
            <div className={`${styles.adWrapper} ${styles.desktopAd} ${styles.leaderboardAd}`}>
              <AdBanner adKey="636ac374dbb99b948710af913b4a7592" width={728} height={90} />
            </div>
          )}

          {/* Big Banner Ad (Above the Dialog Box on all devices) */}
          {waitingPageEnabled && (
            <div className={styles.adWrapper} style={{ marginBottom: '1rem', minHeight: '250px' }}>
              <AdBanner adKey="87b1f98e2b43417d714893dfa11c7e9f" width={300} height={250} />
            </div>
          )}

          <div className={styles.glassCard}>
            
            {meta && (
              <div className={styles.movieInfo}>
                {meta.p && <img src={meta.p} alt={meta.t} className={styles.poster} />}
                <div className={styles.metadata}>
                  <h2>{meta.t}</h2>
                  <p>{meta.q} {meta.s ? `· ${meta.s}` : ''}</p>
                </div>
              </div>
            )}

            {status === 'error' ? (
              <div className={styles.errorState}>
                <h3>❌ {errorMsg}</h3>
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Redirecting...</p>
              </div>
            ) : status === 'ready' ? (
              <>
                <div className={styles.statusText} style={{ color: 'var(--success, #10b981)' }}>
                  ✅ Ready!
                </div>
                <button className={`btn ${styles.downloadButton}`} onClick={handleDownloadClick}>
                  ⬇ DOWNLOAD NOW
                </button>
                <div style={{ 
                  marginTop: '0.85rem', 
                  fontSize: '0.78rem', 
                  color: 'rgba(255, 255, 255, 0.55)', 
                  textAlign: 'center',
                  fontStyle: 'italic',
                  lineHeight: '1.4',
                  maxWidth: '320px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  ⚠️ Please wait <strong style={{ color: '#ffb700' }}>5 seconds</strong> on the redirected page for your download to begin automatically.
                </div>
              </>
            ) : (
              <>
                <div 
                  className={styles.timerWrapper} 
                  style={{ '--progress': `${progressPct}%` } as React.CSSProperties}
                >
                  <div className={styles.timerRing}></div>
                  <div className={styles.timerNumber}>{timeLeft}</div>
                </div>
                <div className={styles.statusText}>
                  Preparing your download...
                </div>
              </>
            )}
          </div>

          {/* Native Ad (Below the card) */}
          {waitingPageEnabled && (
            <div className={styles.adWrapper} style={{ minHeight: '300px', padding: '1rem', marginTop: '1rem' }}>
              <AdNative />
            </div>
          )}

        </div>

        {/* Right Sidebar (Desktop) */}
        {waitingPageEnabled && (
          <div className={`${styles.adWrapper} ${styles.desktopAd} ${styles.sidebarAd}`}>
            <AdBanner adKey="87b1f98e2b43417d714893dfa11c7e9f" width={300} height={250} />
          </div>
        )}

      </div>
    </div>
  );
}
