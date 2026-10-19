'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  VscPlayCircle, 
  VscMute, 
  VscUnmute, 
  VscLoading, 
  VscShare, 
  VscChevronDown,
  VscBookmark
} from 'react-icons/vsc';
import { MdBookmark } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import { getImageUrl } from '@/lib/tmdb';
import { generateSlug } from "@/lib/utils";
import { ReelVideo } from '@/lib/reels';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/watchlist';
import { PLAYER_SANDBOX } from '@/lib/player-policy';


// ─── Global YT types ─────────────────────────────────────────────────────────
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    _ytApiCallbacks: Array<() => void>;
  }
}

// ─── Singleton YT API loader ──────────────────────────────────────────────────
function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    if (!window._ytApiCallbacks) window._ytApiCallbacks = [];
    window._ytApiCallbacks.push(resolve);
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => {
        (window._ytApiCallbacks || []).forEach(cb => cb());
        window._ytApiCallbacks = [];
      };
    }
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface TrailerFeedClientProps {
  initialReels: ReelVideo[];
  initialPage: number;
}

// ─── Parent Feed ──────────────────────────────────────────────────────────────
export default function TrailerFeedClient({ initialReels, initialPage }: TrailerFeedClientProps) {
  const [reels, setReels]           = useState<ReelVideo[]>(initialReels);
  const [page, setPage]             = useState(initialPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [muted, setMuted]           = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef                = useRef<HTMLDivElement>(null);

  const fetchMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/tmdb/reels?page=${page + 1}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setReels(prev => [...prev, ...data]);
        setPage(p => p + 1);
      }
    } catch (e) {
      console.error('Failed to fetch more reels', e);
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !container.clientHeight) return;
    const reelIdx = Math.max(0, Math.min(reels.length - 1, Math.round(container.scrollTop / container.clientHeight)));
    if (reelIdx !== activeIndex) setActiveIndex(reelIdx);
    if (reelIdx >= reels.length - 4 && !loadingMore) fetchMore();
  }, [activeIndex, reels.length, loadingMore, fetchMore]);

  const handleVideoError = useCallback((id: string | number) => {
    console.warn(`Removing unavailable video: ${id}`);
    setReels(prev => prev.filter(r => r.id !== id));
  }, []);

  return (
    <>
      <style>{`.reels-wrap::-webkit-scrollbar{display:none}`}</style>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="reels-wrap"
        style={{
          height: 'calc(100dvh - var(--site-header-height))',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
          background: '#000',
        }}
      >
        {reels.map((reel, i) => (
          <React.Fragment key={reel.id}>
            <ReelSlide
              reel={reel}
              slideIndex={i}
              isActive={i === activeIndex}
              isLast={i === reels.length - 1}
              isPrefetch={i >= activeIndex - 1 && i <= activeIndex + 1}
              muted={muted}
              onToggleMute={() => setMuted(m => !m)}
              onVideoError={handleVideoError}
            />
          </React.Fragment>
        ))}
      </div>

      {loadingMore && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
          padding: '8px 20px', borderRadius: 99, display: 'flex', gap: 10,
          alignItems: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
            <VscLoading size={18} />
          </motion.div>
          Loading more…
        </div>
      )}
    </>
  );
}

// ─── Helper: safely destroy a YT player and restore the placeholder div ──────
function destroyPlayerSafely(playerRef: React.MutableRefObject<YT.Player | null>, wrapperRef: React.RefObject<HTMLDivElement | null>, playerId: string) {
  if (!playerRef.current) return;
  try {
    // Get the iframe element before destroying
    const iframe = playerRef.current.getIframe?.();
    playerRef.current.destroy();
    playerRef.current = null;

    // After destroy, YouTube removes the iframe but doesn't restore the original div.
    // We must recreate it so a future `new YT.Player(playerId, ...)` has a target.
    if (wrapperRef.current) {
      // Check if the placeholder div already exists (it won't after destroy)
      const existing = document.getElementById(playerId);
      if (!existing) {
        const newDiv = document.createElement('div');
        newDiv.id = playerId;
        newDiv.style.width = '100%';
        newDiv.style.height = '100%';
        // Clear any leftover iframe fragments
        wrapperRef.current.innerHTML = '';
        wrapperRef.current.appendChild(newDiv);
      }
    }
  } catch (err) {
    // Player was already disposed or in a bad state — just null the ref
    playerRef.current = null;
  }
}

// ─── Single Reel Slide ────────────────────────────────────────────────────────
function ReelSlide({
  reel, slideIndex, isActive, isLast, isPrefetch, muted, onToggleMute, onVideoError
}: {
  reel: ReelVideo;
  slideIndex: number;
  isActive: boolean;
  isLast: boolean;
  isPrefetch: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onVideoError: (id: string | number) => void;
}) {
  const { item, video } = reel;
  const router = useRouter();
  const playerId = `yt-player-${slideIndex}-${video.key}`;
  const playerRef = useRef<YT.Player | null>(null);
  const ytWrapperRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [apiReady, setApiReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasBuffered, setHasBuffered] = useState(false);

  // Keep a mutable ref for isActive so event handlers always see the latest value
  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Keep mutable ref for isPrefetch to use in the cleanup
  const isPrefetchRef = useRef(isPrefetch);
  useEffect(() => {
    isPrefetchRef.current = isPrefetch;
  }, [isPrefetch]);

  useEffect(() => {
    loadYouTubeAPI().then(() => setApiReady(true));
  }, []);

  // ── Create / destroy player based on prefetch window ──
  // CRITICAL: `isActive` is intentionally NOT in the dependency array.
  // Play/pause is handled by the separate effect below. This effect only
  // handles player creation (when entering the prefetch window) and
  // destruction (when leaving it).
  useEffect(() => {
    let cancelled = false;

    if (!isPrefetch) {
      // Slide scrolled far away — tear down the player & restore the div
      destroyPlayerSafely(playerRef, ytWrapperRef, playerId);
      setReady(false);
      setHasBuffered(false);
      return;
    }

    // If we're in the prefetch window and don't have a player yet, create one
    if (!apiReady || playerRef.current) return;

    loadYouTubeAPI().then(() => {
      if (cancelled || playerRef.current) return;
      // Make sure the target div exists (it should, but guard anyway)
      const targetEl = document.getElementById(playerId);
      if (!targetEl) {
        console.warn(`[ReelSlide] Target element #${playerId} not found, skipping init`);
        return;
      }
      // Create the iframe with restrictions before it navigates. The API can
      // attach to an existing frame without replacing its sandbox attributes.
      // https://developers.google.com/youtube/iframe_api_reference#Loading_a_video_player
      const embed = document.createElement('iframe');
      embed.id = playerId;
      embed.title = `${item.title || item.name || 'Title'} trailer`;
      embed.width = '100%';
      embed.height = '100%';
      embed.style.border = '0';
      embed.setAttribute('sandbox', PLAYER_SANDBOX);
      embed.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      embed.referrerPolicy = 'strict-origin-when-cross-origin';
      const parameters = new URLSearchParams({
        enablejsapi: '1', origin: window.location.origin, autoplay: '0',
        controls: '0', mute: '1', loop: '1', playlist: video.key,
        rel: '0', iv_load_policy: '3', playsinline: '1',
      });
      embed.src = `https://www.youtube.com/embed/${encodeURIComponent(video.key)}?${parameters}`;
      targetEl.replaceWith(embed);
      playerRef.current = new window.YT.Player(embed, {
        events: {
          onReady: (e: YT.PlayerEvent) => {
            if (cancelled) return;
            setReady(true);
            setDuration(e.target.getDuration());
            // If this slide is already the active one, start playing immediately
            if (isActiveRef.current) {
              e.target.setPlaybackQuality('default');
              e.target.playVideo();
            } else {
              e.target.setPlaybackQuality('small');
            }
          },
          onStateChange: (e: YT.OnStateChangeEvent) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              setHasBuffered(true);
              if (!isActiveRef.current) {
                // Adjacent slide started playing — immediately pause it
                e.target.pauseVideo();
                setIsPlaying(false);
              } else {
                e.target.setPlaybackQuality('default');
                setIsPlaying(true);
              }
            }
            if (e.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            }
            if (e.data === window.YT.PlayerState.ENDED) {
              e.target.seekTo(0, true);
              e.target.playVideo();
            }
          },
          onError: (e: YT.OnErrorEvent) => {
            if ([2, 5, 100, 101, 150].includes(e.data)) {
              onVideoError(reel.id);
            }
          }
        }
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, video.key, apiReady, isPrefetch]);

  // ── Cleanup player on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, []);

  // ── Auto Play/Pause when slide becomes active ─────────────────────────────
  useEffect(() => {
    if (!ready || !playerRef.current) return;

    try {
      if (isActive) {
        if (playerRef.current.setPlaybackQuality) playerRef.current.setPlaybackQuality('default');
        playerRef.current.playVideo();
        setIsPlaying(true);
      } else if (hasBuffered) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
        setProgress(0);
      }
    } catch (err) {
      // Player may have been disposed between the check and the call
      console.warn('[ReelSlide] Player method failed:', err);
    }
  }, [isActive, ready, hasBuffered]);

  // ── Mute / Unmute (NO reload) ───────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    try {
      if (muted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
      }
    } catch {}
  }, [muted, ready]);

  // ── Progress ticker ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    if (isActive) {
      timerRef.current = setInterval(() => {
        const p = playerRef.current;
        if (!p?.getCurrentTime) return;
        try {
          const cur = p.getCurrentTime();
          const dur = p.getDuration();
          if (dur > 0) setProgress((cur / dur) * 100);
        } catch {}
      }, 200);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, ready]);

  // ── Seek on click ───────────────────────────────────────────────────────────
  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!playerRef.current || duration === 0) return;
    e.stopPropagation();
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    playerRef.current.seekTo(duration * pct, true);
    setProgress(pct * 100);
    if (!isPlaying) setIsPlaying(true);
  };

  // ── Share ───────────────────────────────────────────────────────────────────
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const mediaType = item.media_type || 'movie';
    const url = `${window.location.origin}/media/${mediaType}/${generateSlug(item.id, title)}`;
    const shareTitle = item.title || item.name || 'CineXP';

    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: `Check out this ${mediaType} on CineXP!`,
        url: url,
      }).catch(err => {
        console.error('Error sharing:', err);
        copyToClipboard(url);
      });
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Watchlist Persistence ───────────────────────────────────────────────────
  useEffect(() => {
    setInWatchlist(isInWatchlist(item.id, item.media_type === 'tv' ? 'tv' : 'movie'));
  }, [item.id]);

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inWatchlist) {
      removeFromWatchlist(item.id, item.media_type === 'tv' ? 'tv' : 'movie');
      setInWatchlist(false);
    } else {
      const watchlistItem = {
        id: item.id,
        type: (item.media_type as 'movie' | 'tv') || 'movie',
        title: item.title || item.name || 'Unknown',
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
      };
      addToWatchlist(watchlistItem);
      setInWatchlist(true);
    }
  };

  const title = item.title || item.name || 'Unknown';
  const year  = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = (item.vote_average || 0).toFixed(1);

  return (
    <div style={{
      height: 'calc(100dvh - var(--site-header-height))', width: '100%',
      scrollSnapAlign: 'start', scrollSnapStop: 'always',
      position: 'relative', overflow: 'hidden',
      background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* ── Cinematic blurred background ── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${getImageUrl(item.poster_path, 'w780')})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(60px) brightness(0.2)',
        transform: 'scale(1.3)', zIndex: 0,
      }} />

      {/* ── Video wrapper (smart vertical zoom) ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', height: '100%',
        maxWidth: 'calc((100dvh - var(--site-header-height)) * 9 / 16)',
        background: '#000',
        boxShadow: '0 0 100px rgba(0,0,0,0.9)',
        overflow: 'hidden',
      }}>
        {/* Poster while loading */}
        {!ready && (
          <img
            src={getImageUrl(item.poster_path, 'w780')}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
          />
        )}

        {/* YT iframe container — sized to create vertical crop from 16:9 */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: '177.78%',   // 16/9 * 100%
          height: '177.78%',  // forces letterbox to be cropped
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}>
          {/* This wrapper ref lets us restore the placeholder div after player.destroy() */}
          <div ref={ytWrapperRef} style={{ width: '100%', height: '100%' }}>
            <div id={playerId} style={{ width: '100%', height: '100%' }} />
          </div>
        </div>

        {/* Interaction overlay (tap to toggle play/pause) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (playerRef.current && ready) {
              try {
                if (isPlaying) {
                  playerRef.current.pauseVideo();
                  setIsPlaying(false);
                } else {
                  playerRef.current.playVideo();
                  setIsPlaying(true);
                }
              } catch {}
            }
          }}
          style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'pointer' }}
        />

        {/* ── Top badge ── */}
        <div style={{
          position: 'absolute', top: 16, right: 16, zIndex: 20,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 99, padding: '5px 12px',
          display: 'flex', alignItems: 'center', gap: 7,
          pointerEvents: 'none',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--primary)',
            boxShadow: '0 0 8px var(--primary)',
            display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{
            color: '#fff', fontSize: '0.68rem', fontWeight: 800,
            letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>
            {video.type === 'Clip' ? 'Clip' : video.type}
          </span>
        </div>

        {/* ── Right sidebar ── */}
        <div style={{
          position: 'absolute', right: 12, bottom: 160, zIndex: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        }}>
          {/* Watch */}
          <SidebarAction
            icon={<VscPlayCircle size={26} />}
            label="Watch"
            onClick={() => router.push(`/media/${item.media_type || 'movie'}/${generateSlug(item.id, title)}`)}
            glow
          />

          {/* Watchlist */}
          <SidebarAction
            icon={inWatchlist ? <MdBookmark size={24} /> : <VscBookmark size={24} />}
            label={inWatchlist ? 'Saved' : 'Save'}
            onClick={toggleWatchlist}
            active={inWatchlist}
          />

          {/* Share */}
          <SidebarAction
            icon={<VscShare size={22} />}
            label={copied ? 'Copied!' : 'Share'}
            onClick={handleShare}
            active={copied}
          />

          {/* Mute */}
          <SidebarAction
            icon={muted ? <VscMute size={24} /> : <VscUnmute size={24} />}
            label={muted ? 'Muted' : 'Sound'}
            onClick={e => { e.stopPropagation(); onToggleMute(); }}
            active={!muted}
          />
        </div>

        {/* ── Bottom info overlay ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
          padding: '80px 16px 20px',
          paddingRight: 80, // make room for sidebar
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 50%, transparent 100%)',
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              background: 'rgba(255,255,255,0.12)', color: '#fff',
              fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px',
              borderRadius: 4, letterSpacing: '0.05em',
            }}>HD</span>
            <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800 }}>
              ★ {rating}
            </span>
            {year && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{year}</span>}
          </div>

          <h2 style={{
            color: '#fff', fontSize: 'clamp(1.1rem, 3.5dvh, 1.5rem)',
            fontWeight: 900, margin: 0, lineHeight: 1.15,
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
          }}>{title}</h2>

          {item.overview && (
            <p style={{
              color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem',
              lineHeight: 1.4, marginTop: 8,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {item.overview}
            </p>
          )}
        </div>

        {/* ── Seekable progress bar ── */}
        <div
          onMouseDown={handleSeek}
          onTouchStart={handleSeek}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
            height: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div style={{
            width: '100%', height: 3,
            background: 'rgba(255,255,255,0.12)',
            position: 'relative',
          }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: 'var(--primary)',
              boxShadow: '0 0 8px var(--primary)',
              transition: 'width 0.2s linear',
              borderRadius: '0 2px 2px 0',
            }} />
            {/* Scrub handle */}
            <div style={{
              position: 'absolute', top: '50%',
              left: `${progress}%`, transform: 'translate(-50%, -50%)',
              width: 12, height: 12, borderRadius: '50%',
              background: '#fff', boxShadow: '0 0 6px rgba(0,0,0,0.6)',
              transition: 'left 0.2s linear',
            }} />
          </div>
        </div>
      </div>

      {/* ── Swipe hint ── */}
      {isActive && !isLast && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', bottom: 22,
            left: '50%', transform: 'translateX(-50%)',
            zIndex: 50, color: '#fff', pointerEvents: 'none',
          }}
        >
          <VscChevronDown size={26} />
        </div>
      )}
    </div>
  );
}

// ─── Sidebar Action Button ────────────────────────────────────────────────────
function SidebarAction({
  icon, label, onClick, glow = false, active = false
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  glow?: boolean;
  active?: boolean;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.88 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}
      onClick={onClick}
    >
      <div style={{
        width: 50, height: 50, borderRadius: '50%',
        background: glow
          ? 'var(--primary)'
          : active
            ? 'rgba(157,0,255,0.25)'
            : 'rgba(255,255,255,0.08)',
        border: `1px solid ${glow ? 'transparent' : active ? 'var(--primary)' : 'rgba(255,255,255,0.12)'}`,
        backdropFilter: glow ? 'none' : 'blur(16px)',
        boxShadow: glow ? '0 6px 20px rgba(157,0,255,0.45)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
        transition: 'all 0.2s ease',
      }}>
        {icon}
      </div>
      <span style={{
        color: '#fff', fontSize: '0.6rem', fontWeight: 700,
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        letterSpacing: '0.04em',
      }}>
        {label}
      </span>
    </motion.div>
  );
}
