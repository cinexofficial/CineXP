'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import { VscScreenFull } from 'react-icons/vsc'
import { trackExperience } from '@/lib/experience-analytics'
import { PLAYER_SANDBOX } from '@/lib/player-policy'

interface StreamPlayerProps {
  embedUrl: string | null | undefined
  isPaused?: boolean
  startTime?: number
  directVideoObj?: { sources: {src: string, type: string, size?: number}[], subtitleUrl?: string }
  tmdbId?: string
  type?: 'movie' | 'tv'
  season?: number
  episode?: number
  onRetry?: () => void
}

export interface StreamPlayerRef {
  play: () => void
  pause: () => void
  seek: (time: number) => void
  setVolume: (level: number) => void
  setMute: (muted: boolean) => void
  getStatus: () => void
}

const VIDFAST_ORIGINS = [
  'https://vidfast.pro',
  'https://vidfast.in',
  'https://vidfast.io',
  'https://vidfast.me',
  'https://vidfast.net',
  'https://vidfast.pm',
  'https://vidfast.xyz'
]

const VIDLINK_ORIGIN = 'https://vidlink.pro'
const VIDSRC_ORIGIN = 'https://vidsrc.mov'

const PlayerInstance = forwardRef<StreamPlayerRef, StreamPlayerProps>(({ embedUrl, isPaused, startTime, directVideoObj, tmdbId, type, season, episode, onRetry }, ref) => {
  const [failure, setFailure] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [pipSupported, setPipSupported] = useState(false)
  const [isPip, setIsPip] = useState(false)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const pipWindowRef = useRef<Window | null>(null)

  // Raw Plyr refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const plyrInstanceRef = useRef<Plyr | null>(null)
  const startTimeSeeked = useRef(false)
  const progressThrottleRef = useRef(0)
  const [nativeReady, setNativeReady] = useState(false)
  const frameLoaded = useRef(false)
  const confirmedStart = useRef(false)
  const trackedFailure = useRef(false)
  const attemptedSource = useRef('')
  const measurement = useCallback(() => ({ provider: directVideoObj ? 'native' : embedUrl ? new URL(embedUrl).hostname : 'unavailable', media_type: type || 'movie', title_id: tmdbId || '', season: season || 0, episode: episode || 0 }), [directVideoObj, embedUrl, type, tmdbId, season, episode])
  useEffect(() => {
    const identity = JSON.stringify([embedUrl, directVideoObj?.sources, tmdbId, season, episode])
    if (attemptedSource.current === identity) return
    attemptedSource.current = identity
    confirmedStart.current = false
    trackedFailure.current = false
    trackExperience('playback_attempt', measurement())
  }, [measurement, embedUrl, directVideoObj, tmdbId, season, episode])
  useEffect(() => {
    if (failure && !trackedFailure.current) { trackedFailure.current = true; trackExperience('playback_failed', measurement()) }
  }, [failure, measurement])

  // Helper to get the raw Plyr or video element
  const getPlayer = useCallback(() => plyrInstanceRef.current, [])

  // Expose player commands via ref
  useImperativeHandle(ref, () => ({
    play: () => {
      const p = getPlayer()
      if (p) { try { p.play()?.catch(() => {}) } catch(e){} }
      else { iframeRef.current?.contentWindow?.postMessage({ command: 'play', action: 'play' }, embedUrl ? new URL(embedUrl).origin : window.location.origin) }
    },
    pause: () => {
      const p = getPlayer()
      if (p) { try { p.pause() } catch(e){} }
      else { iframeRef.current?.contentWindow?.postMessage({ command: 'pause', action: 'pause' }, embedUrl ? new URL(embedUrl).origin : window.location.origin) }
    },
    seek: (time: number) => {
      const p = getPlayer()
      if (p) { try { p.currentTime = time } catch(e){} }
      else { iframeRef.current?.contentWindow?.postMessage({ command: 'seek', action: 'seek', time }, embedUrl ? new URL(embedUrl).origin : window.location.origin) }
    },
    setVolume: (level: number) => {
      const p = getPlayer()
      if (p) { try { p.volume = level } catch(e){} }
      else { iframeRef.current?.contentWindow?.postMessage({ command: 'volume', action: 'volume', level }, embedUrl ? new URL(embedUrl).origin : window.location.origin) }
    },
    setMute: (muted: boolean) => {
      const p = getPlayer()
      if (p) { try { p.muted = muted } catch(e){} }
      else { iframeRef.current?.contentWindow?.postMessage({ command: 'mute', action: 'mute', muted }, embedUrl ? new URL(embedUrl).origin : window.location.origin) }
    },
    getStatus: () => {
      if (!directVideoObj) {
        iframeRef.current?.contentWindow?.postMessage({ command: 'getStatus', action: 'getStatus' }, embedUrl ? new URL(embedUrl).origin : window.location.origin)
      }
    }
  }))

  // Listen for messages from iframe providers
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { origin, data } = event
      
      const isVidfast = VIDFAST_ORIGINS.includes(origin)
      const isVidlink = origin === VIDLINK_ORIGIN
      const isVidsrc = origin === VIDSRC_ORIGIN

      if ((!isVidfast && !isVidlink && !isVidsrc) || !embedUrl || origin !== new URL(embedUrl).origin || event.source !== iframeRef.current?.contentWindow) return
      if (!data) return

      // Handle Progress Tracking (MEDIA_DATA)
      if (data.type === 'MEDIA_DATA') {
        const storageKey = isVidfast ? 'vidFastProgress' : 'vidLinkProgress'
        try {
          localStorage.setItem(storageKey, JSON.stringify(data.data))
          // Clean up older items proactively
          import('@/lib/progressManager').then(mod => mod.cleanupProgressCache())
        } catch (e) {
          console.error('[StreamPlayer] Failed to save progress:', e)
        }
      }

      // Handle Player Events (Logging for now, can be used for UI updates later)
      if (data.type === 'PLAYER_EVENT') {
        if (data.data?.event === 'playing' && !confirmedStart.current) {
          confirmedStart.current = true
          trackExperience('playback_started', measurement())
        }
        if (data.data?.event === 'error') setFailure('This source is unavailable with playback protections enabled. Choose another source above.')
        // const { event: playerEvent, currentTime, duration } = data.data
        // console.log(`[StreamPlayer] Player ${playerEvent} at ${currentTime}s of ${duration}s`)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [embedUrl, measurement])

  useEffect(() => {
    if ('documentPictureInPicture' in window) {
      setPipSupported(true);
    }
  }, []);

  const togglePip = async () => {
    if (!playerContainerRef.current) return;
    
    if (!('documentPictureInPicture' in window)) return;
    const dpip = (window as Window & { documentPictureInPicture?: { requestWindow: (options: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture;

    try {
      if (isPip && pipWindowRef.current) {
        pipWindowRef.current.close();
        return;
      }

      // Open PiP window
      const pipWindow = await dpip!.requestWindow({
        width: 800,
        height: 450,
      });

      pipWindowRef.current = pipWindow;
      setIsPip(true);

      // Copy styles
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.type = styleSheet.type;
          link.media = styleSheet.media.mediaText;
          link.href = styleSheet.href || '';
          pipWindow.document.head.appendChild(link);
        }
      });

      // Move player node
      pipWindow.document.body.appendChild(playerContainerRef.current);

      pipWindow.addEventListener('pagehide', () => {
        setIsPip(false);
        // Move back to main document
        const placeholder = document.getElementById('pip-placeholder');
        if (placeholder && playerContainerRef.current) {
          placeholder.appendChild(playerContainerRef.current);
        }
        pipWindowRef.current = null;
      });

    } catch (e) {
      console.error('Failed to open PiP:', e);
    }
  };

  // Loading the frame is not a confirmed playback start.
  useEffect(() => {
    if (!embedUrl || directVideoObj) return
    setLoaded(false)
    frameLoaded.current = false
    setFailure('')
    const timer = setTimeout(() => { if (!frameLoaded.current) setFailure('This source did not load. Retry it or choose another source above. Playback protections stay enabled.') }, 20000)
    return () => clearTimeout(timer)
  }, [embedUrl, directVideoObj])

  // --- Force Landscape on Fullscreen ---
  useEffect(() => {
    const handleFullscreenChange = async () => {
      const isFullscreen = document.fullscreenElement !== null;
      const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };

      if (isFullscreen && orientation && typeof orientation.lock === 'function') {
        try {
          await orientation.lock('landscape');
        } catch (error) {
          console.warn('Orientation lock failed:', error);
        }
      } else if (!isFullscreen && orientation && typeof orientation.unlock === 'function') {
        try {
          orientation.unlock();
        } catch (error) {
          console.warn('Orientation unlock failed:', error);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle isPaused synchronization
  useEffect(() => {
    const p = getPlayer()
    if (p) {
      try { if (isPaused) p.pause(); else p.play()?.catch(() => {}); } catch(e){}
      return;
    }

    if (!iframeRef.current?.contentWindow || !loaded) return;
    const msg = isPaused 
      ? { command: 'pause', action: 'pause' } 
      : { command: 'play', action: 'play' };
    iframeRef.current.contentWindow.postMessage(msg, embedUrl ? new URL(embedUrl).origin : window.location.origin);
  }, [isPaused, loaded, getPlayer]);

  // ============================================================
  // RAW PLYR INITIALIZATION (replaces buggy plyr-react wrapper)
  // ============================================================
  useEffect(() => {
    if (!directVideoObj || !videoRef.current) return

    let plyrInstance: Plyr | null = null
    let destroyed = false
    let controlsTimer: ReturnType<typeof setTimeout> | undefined
    startTimeSeeked.current = false
    setNativeReady(false)
    setFailure('')

    const qualityOptions = directVideoObj.sources
      .map(s => s.size || 0)
      .filter(q => q > 0)
      .sort((a, b) => b - a)

    const bestQuality = qualityOptions[0] || 1080

    // Build a map: quality -> src URL
    const qualityMap: Record<number, string> = {}
    directVideoObj.sources.forEach(s => {
      if (s.size) qualityMap[s.size] = s.src
    })

    // Dynamically import plyr (browser only) + inject CSS
    import('plyr').then((PlyrModule) => {
      const PlyrClass = PlyrModule.default
      if (!videoRef.current || destroyed) return

      // Set source AFTER Plyr CSS is ready, right before init
      videoRef.current.src = qualityMap[bestQuality] || directVideoObj.sources[0]?.src || ''

      plyrInstance = new PlyrClass(videoRef.current, {
        controls: [
          'play-large', 'play', 'progress', 'current-time', 'duration',
          'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
        ],
        settings: ['captions', 'quality', 'speed'],
        quality: {
          default: bestQuality,
          options: qualityOptions,
          forced: true,
          onChange: (newQuality: number) => {
            const newSrc = qualityMap[newQuality]
            if (newSrc && videoRef.current) {
              const currentTime = videoRef.current.currentTime
              const wasPlaying = !videoRef.current.paused
              videoRef.current.src = newSrc
              // Wait for the new source to be loadable before seeking/playing
              videoRef.current.addEventListener('loadedmetadata', function onMeta() {
                videoRef.current?.removeEventListener('loadedmetadata', onMeta)
                if (videoRef.current) videoRef.current.currentTime = currentTime
                if (wasPlaying) videoRef.current?.play().catch(() => {})
              })
              videoRef.current.load()
            }
          }
        },
        captions: { active: true, language: 'en', update: true },
        invertTime: false,
        keyboard: { focused: true, global: false },
        autoplay: false,
      })

      plyrInstanceRef.current = plyrInstance

      // Wait for the video to be ready, then seek + play
      plyrInstance.on('error', () => { if (!destroyed) setFailure('This stream couldn’t load. Retry it or choose another source above.'); })
      plyrInstance.on('playing', () => {
        if (!destroyed && !confirmedStart.current) { confirmedStart.current = true; trackExperience('playback_started', measurement()) }
      })
      plyrInstance.on('canplay', () => {
        if (!plyrInstance || destroyed) return;
        if (!startTimeSeeked.current && startTime && startTime > 0) {
          try { plyrInstance.currentTime = startTime } catch(e){}
          startTimeSeeked.current = true
        }
      })

      // Mark as visually ready once Plyr is mounted
      plyrInstance.on('ready', () => {
        setNativeReady(true)
        setLoaded(true)

        // Inject Crop/Fill button into Plyr Controls
        controlsTimer = setTimeout(() => {
          if (destroyed) return;
          const controls = videoRef.current?.closest('.plyr')?.querySelector('.plyr__controls');
          if (controls && !controls.querySelector('.custom-fill-btn')) {
            const btn = document.createElement('button');
            btn.className = 'plyr__controls__item plyr__control custom-fill-btn';
            btn.type = 'button';
            btn.title = 'Fill Screen';
            // Simple expand icon
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/></svg>`;
            btn.onclick = () => {
              const vid = videoRef.current;
              if (!vid) return;
              const isCover = vid.style.getPropertyValue('object-fit') === 'cover';
              if (isCover) {
                vid.style.setProperty('object-fit', 'contain', 'important');
              } else {
                vid.style.setProperty('object-fit', 'cover', 'important');
              }
            };
            // Insert exactly before the fullscreen button
            const fsBtn = controls.querySelector('[data-plyr="fullscreen"]');
            if (fsBtn) controls.insertBefore(btn, fsBtn);
            else controls.appendChild(btn);
          }
        }, 300);
      })

      // Progress tracking (throttled to every 5 seconds)
      plyrInstance.on('timeupdate', () => {
        if (!tmdbId || !type || !plyrInstance || destroyed) return
        const now = Date.now()
        if (now - progressThrottleRef.current < 5000) return
        progressThrottleRef.current = now

        try {
          const ct = plyrInstance.currentTime
          const dur = plyrInstance.duration
          if (!dur || dur <= 0) return

          const vlStr = localStorage.getItem('vidLinkProgress') || '{}'
          const vlData = JSON.parse(vlStr)
          const parsedId = tmdbId.toString()

          if (!vlData[parsedId]) vlData[parsedId] = { type }

          if (type === 'tv') {
            vlData[parsedId].last_season_watched = season?.toString() || '1'
            vlData[parsedId].last_episode_watched = episode?.toString() || '1'
            if (!vlData[parsedId].show_progress) vlData[parsedId].show_progress = {}
            const epKey = `s${season}e${episode}`
            vlData[parsedId].show_progress[epKey] = {
              progress: { watched: ct, duration: dur },
              last_updated: Date.now()
            }
          } else {
            vlData[parsedId].progress = { watched: ct, duration: dur }
            vlData[parsedId].last_updated = Date.now()
          }

          localStorage.setItem('vidLinkProgress', JSON.stringify(vlData))
        } catch(e) {
          console.error('[NativePlayer] Progress save failed', e)
        }
      })
    }).catch(() => { if (!destroyed) setFailure('The player couldn’t start. Please try again.'); })

    return () => {
      destroyed = true
      clearTimeout(controlsTimer)
      if (plyrInstance) {
        try { plyrInstance.destroy() } catch(e){}
      }
      plyrInstanceRef.current = null
      setNativeReady(false)
    }
  // We intentionally only re-initialize when the source object identity changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directVideoObj])

  if (!embedUrl && !directVideoObj) {
    return (
      <div className="stream-player" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0510' }}>
        <div style={{ textAlign: 'center', opacity: 0.5 }}>
          <p style={{ fontSize: '1.25rem', fontWeight: 500 }}>No streaming source available</p>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Try switching to another provider.</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="stream-player" 
      style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}
    >
      {failure && <div className="cx-player-error" role="alert"><h3>A brief intermission.</h3><p>{failure}</p><button className="cx-button cx-button--secondary" onClick={onRetry}>Retry stream</button></div>}
      {/* Loading Overlay (only for iframe providers) */}
      <AnimatePresence>
        {!loaded && !directVideoObj && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{ 
              position: 'absolute', 
              inset: 0, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              background: 'rgba(10, 5, 16, 0.8)',
              backdropFilter: 'blur(20px)',
              zIndex: 10
            }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--primary)',
                filter: 'blur(15px)',
                marginBottom: '2rem'
              }}
            />
            <p style={{ 
              fontSize: '1rem', 
              letterSpacing: '0.1em', 
              fontWeight: 500,
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase'
            }}>
              Initializing Stream...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paused Overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ 
              position: 'absolute', 
              inset: 0, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              background: 'rgba(4, 1, 10, 0.4)',
              backdropFilter: 'blur(8px)',
              zIndex: 10
            }}
          >
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(15, 10, 25, 0.75)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', maxWidth: '300px' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Playback Paused</p>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>The stream is waiting for you while you share your story.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div id="pip-placeholder" style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div 
          ref={playerContainerRef} 
          style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}
        >
          {pipSupported && !isPip && !directVideoObj && (
            <button
              onClick={(e) => { e.stopPropagation(); togglePip(); }}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 50,
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backdropFilter: 'blur(4px)',
                opacity: isPaused ? 0 : 1,
                pointerEvents: isPaused ? 'none' : 'auto'
              }}
            >
              <VscScreenFull /> Pop Out Player
            </button>
          )}
          
          {directVideoObj ? (
            <div style={{ width: '100%', height: '100%', opacity: nativeReady ? 1 : 0, transition: 'opacity 0.4s ease' }}>
              {/* Raw video element - Plyr attaches to this */}
              <video
                ref={videoRef}
                crossOrigin="anonymous"
                playsInline
                preload="metadata"
                style={{ width: '100%', height: '100%' }}
              >
                {directVideoObj.subtitleUrl && (
                  <track
                    kind="captions"
                    label="English"
                    srcLang="en"
                    src={directVideoObj.subtitleUrl}
                    default
                  />
                )}
              </video>
            </div>
          ) : (
            <iframe
              title="Streaming player"
              ref={iframeRef}
              src={embedUrl!}
              allowFullScreen
              frameBorder="0"
              allow="encrypted-media; fullscreen"
              sandbox={PLAYER_SANDBOX}
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => { frameLoaded.current = true; setLoaded(true) }}
              onError={() => setFailure('This source is unavailable with playback protections enabled. Choose another source above.')}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                opacity: loaded ? 1 : 0,
                transition: 'opacity 0.8s ease'
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
})

PlayerInstance.displayName = 'PlayerInstance'

// Plyr owns and replaces its video DOM. Remount the complete boundary on retry,
// rather than reusing a ref to a video element that destroy() detached.
const StreamPlayer = forwardRef<StreamPlayerRef, Omit<StreamPlayerProps, 'onRetry'>>((props, ref) => {
  const [attempt, setAttempt] = useState(0)
  return <PlayerInstance key={attempt} {...props} ref={ref} onRetry={() => setAttempt(value => value + 1)} />
})
StreamPlayer.displayName = 'StreamPlayer'

export default StreamPlayer
