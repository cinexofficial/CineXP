'use client';

import type { TMDBSeason } from '@/lib/tmdb'
import type { PublicDownloadLink } from '@/lib/media-types'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { VscShare, VscChevronDown } from 'react-icons/vsc'
import StreamPlayer, { StreamPlayerRef } from './ui/StreamPlayer'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import GlassSurface from './ui/GlassSurface'
import { generateStoryCard } from '@/lib/storyCard'
import WatchlistButton from './WatchlistButton'
import ShareStoryModal from './ShareStoryModal'
import { getInitialSync, getStartTimeFor, saveInternalProgress } from '@/lib/progressManager'

interface MediaInteractiveProps {
  id: string
  imdbId?: string
  type: 'movie' | 'tv'
  seasons?: TMDBSeason[]
  title: string
  posterUrl: string
  year: string
  industry: 'bollywood' | 'hollywood'
}

const PROVIDERS = [
  { id: 'native', name: 'Native', color: '#FFD700' },
  { id: 'hdvb', name: 'Stream 1', color: '#00d2ff' },
  { id: 'vidup', name: 'Stream 2', color: '#63b8bc' },
  { id: 'peachify', name: 'Stream 3', color: '#9d00ff' },
  { id: 'videasy', name: 'Stream 4', color: '#FFD700' }
]

const EXTRA_PROVIDERS = [
  { id: 'vidcore', name: 'Stream 5', color: '#00d2ff' },
  { id: 'vidsrc_wtf', name: 'Stream 6', color: '#ff4b2b' },
  { id: 'vidfast', name: 'Stream 7', color: '#9d00ff' },
  { id: 'vidlink', name: 'Stream 8', color: '#63b8bc' },
  { id: 'vidsrc', name: 'Stream 9', color: '#ff4b2b' },
  { id: 'mapple', name: 'Stream 10', color: '#63b8bc' }
]

const ALL_PROVIDERS = [...PROVIDERS, ...EXTRA_PROVIDERS]

export default function MediaInteractive({ 
  id, 
  type, 
  imdbId, 
  seasons, 
  title, 
  posterUrl, 
  year, 
  industry
}: MediaInteractiveProps) {
  const [activeProvider, setActiveProvider] = useState('native')
  const [season, setSeason] = useState(seasons && seasons.length > 0 ? (seasons[0].season_number || 1) : 1)
  const [episode, setEpisode] = useState(1)
  const [isRestored, setIsRestored] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [storyFile, setStoryFile] = useState<File | null>(null)
  const [storyPreviewUrl, setStoryPreviewUrl] = useState<string | null>(null)
  const [showExtraProviders, setShowExtraProviders] = useState(false)
  const playerRef = useRef<StreamPlayerRef>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [downloadLinks, setDownloadLinks] = useState<PublicDownloadLink[]>([])
  const [episodeDownloads, setEpisodeDownloads] = useState<PublicDownloadLink[]>([])
  const [downloadsLoading, setDownloadsLoading] = useState(true)
  const sourceKey = type === 'tv' ? `${type}:${id}:${season}:${episode}` : `${type}:${id}`
  const [resolvedSourceKey, setResolvedSourceKey] = useState('')
  const sourcesPending = downloadsLoading || resolvedSourceKey !== sourceKey
  
  // Premium Native Bypasser State
  const [fastDownloadLinks, setFastDownloadLinks] = useState<{ label: string, proxyDownloadUrl: string, season?: number }[]>([])
  const [fastDownloadLoading, setFastDownloadLoading] = useState(false)
  const [fastDownloadError, setFastDownloadError] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const streamParam = searchParams?.get('stream')

  // Fetch download links
  const fetchDownloads = useCallback(async (signal?: AbortSignal) => {
    setDownloadsLoading(true)
    try {
      const params = new URLSearchParams({ tmdbId: id, type })
      if (type === 'tv') { params.set('season', String(season)); params.set('episode', String(episode)) }
      const res = await fetch(`/api/downloads?${params}`, { signal: AbortSignal.any([AbortSignal.timeout(40000), ...(signal ? [signal] : [])]) })
      if (!res.ok) throw new Error('Sources unavailable')
      const data = await res.json()
      if (!signal?.aborted) {
        setDownloadLinks(data.links || [])
        setEpisodeDownloads(data.episodeLinks || [])
        setResolvedSourceKey(sourceKey)
      }
    } catch {
      if (!signal?.aborted) { setDownloadLinks([]); setEpisodeDownloads([]); setResolvedSourceKey(sourceKey) }
    } finally {
      if (!signal?.aborted) setDownloadsLoading(false)
    }
  }, [id, type, season, episode, sourceKey])

  const handleGenerateFastLink = async () => {
    setFastDownloadLoading(true);
    setFastDownloadError(null);
    try {
      const qTitle = encodeURIComponent(title);
      const qYear = year ? encodeURIComponent(year) : "";
      // For TV shows, send season:year pairs so the backend can guess the correct URL per season
      // (moviesleech uses each season's release year in URLs, not the show's first air year)
      let seasonParam = '';
      if (type === 'tv' && seasons) {
          const seasonPairs = seasons
              .filter(s => s.season_number > 0)
              .map(s => {
                  const airYear = s.air_date ? s.air_date.substring(0, 4) : year;
                  return `${s.season_number}:${airYear}`;
              });
          seasonParam = seasonPairs.join(',');
      } else {
          seasonParam = String(season);
      }
      // Fallback search ignores quality param now, it resolves all naturally.
      const res = await fetch(`/api/media/sources?title=${qTitle}&year=${qYear}&type=${type}&industry=${industry}&seasons=${seasonParam}&tmdbId=${id}`);
      const data = await res.json();
      if (data.links && data.links.length > 0) {
         setFastDownloadLinks(data.links);
      } else {
         setFastDownloadError(data.error || "Failed to generate links.");
      }
    } catch (e) {
      setFastDownloadError(e instanceof Error ? e.message : "Failed to contact scraper.");
    } finally {
      setFastDownloadLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void fetchDownloads(controller.signal)
    return () => controller.abort()
  }, [fetchDownloads])

  // Route download through interstitial page
  const handleDownloadClick = async (e: React.MouseEvent, link: Partial<PublicDownloadLink> & { proxyDownloadUrl?: string }) => {
    e.preventDefault();
    const target = link.url || link.proxyDownloadUrl;
    if (!target) return;
    try {
      const res = await fetch('/api/download/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: target,
          title: title,
          quality: link.quality || link.label || 'Download',
          size: link.size || '',
          poster: posterUrl || '',
          subtitleUrl: link.subtitleUrl || ''
        })
      });
      const data = await res.json();
      if (data.token) {
        router.push(`/download/${data.token}`);
      } else {
        window.location.assign(target);
      }
    } catch {
      window.location.assign(target);
    }
  };

  // Restore Watch Progress and URL param handling
  useEffect(() => {
    let initialProvider = 'native'
    
    if (streamParam) {
      // Direct stream match (e.g. vidlink, hdvb) or friendly name match (stream3)
      const mapped = ALL_PROVIDERS.find(p => p.id === streamParam || p.name.toLowerCase().replace(' ', '') === streamParam.toLowerCase())
      if (mapped) initialProvider = mapped.id
    } else {
      const sync = getInitialSync(id, type);
      if (sync) {
        initialProvider = sync.provider;
        if (type === 'tv' && sync.season && sync.episode) {
          setSeason(sync.season);
          setEpisode(sync.episode);
        }
      }
    }
    
    setActiveProvider(initialProvider);
    setIsRestored(true);
  }, [id, type, streamParam]);

  // Update URL param when provider changes manually
  const changeProvider = (newId: string) => {
    setActiveProvider(newId);
    if (pathname) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("stream", newId);
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
    }
  }

  // Save progress manually when user changes something
  useEffect(() => {
    if (isRestored) {
      saveInternalProgress(id, type, activeProvider, season, episode);
    }
  }, [id, type, activeProvider, season, episode, isRestored]);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl)
    }
  }, [storyPreviewUrl])

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExtraProviders(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Determine embed url based on provider
  const startTime = isRestored ? getStartTimeFor(id, type, activeProvider, season, episode) : 0;
  const timeParam = startTime > 0 ? `&t=${startTime}` : '';

  const getEmbedUrl = () => {
    if (activeProvider === 'native') return null;
    if (activeProvider === 'vidfast') {
      const base = 'https://vidfast.pro'
      return type === 'movie'
        ? `${base}/movie/${id}?autoPlay=false${timeParam}`
        : `${base}/tv/${id}/${season}/${episode}?autoPlay=false&title=true&poster=true&theme=9B59B6&nextButton=true&autoNext=true${timeParam}`
    } else if (activeProvider === 'vidlink') {
      // Vidlink
      const base = 'https://vidlink.pro'
      const params = 'primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=true'
      return type === 'movie'
        ? `${base}/movie/${id}?${params}${timeParam}`
        : `${base}/tv/${id}/${season}/${episode}?${params}${timeParam}`
    } else if (activeProvider === 'hdvb') {
      // HDVB / PikaShow Mirror
      const base = 'https://piexe411qok.com/play'
      const finalId = imdbId || id; // Fallback to TMDB if IMDb is missing
      return type === 'movie'
        ? `${base}/${finalId}`
        : `${base}/${finalId}?s=${season}&e=${episode}`
    } else if (activeProvider === 'vidsrc_wtf') {
      // vidsrc.wtf
      const color = '63b8bc'
      return type === 'movie'
        ? `https://vidsrc.wtf/api/3/movie/?id=${id}&color=${color}`
        : `https://vidsrc.wtf/api/3/tv/?id=${id}&s=${season}&e=${episode}&color=${color}`
    } else if (activeProvider === 'vidcore') {
      // vidcore
      return type === 'movie'
        ? `https://vidcore.net/movie/${id}?autoPlay=false`
        : `https://vidcore.net/tv/${id}/${season}/${episode}?autoPlay=false`
    } else if (activeProvider === 'vidup') {
      // vidup
      return type === 'movie'
        ? `https://vidup.to/movie/${id}?autoPlay=false`
        : `https://vidup.to/tv/${id}/${season}/${episode}?autoPlay=false`
    } else if (activeProvider === 'videasy') {
      // videasy
      return type === 'movie'
        ? `https://player.videasy.net/movie/${id}`
        : `https://player.videasy.net/tv/${id}/${season}/${episode}`
    } else if (activeProvider === 'mapple') {
      // mapple
      return type === 'movie'
        ? `https://mapple.uk/watch/movie/${id}`
        : `https://mapple.uk/watch/tv/${id}/${season}/${episode}`
    } else if (activeProvider === 'peachify') {
      // peachify
      return type === 'movie'
        ? `https://peachify.top/embed/movie/${id}`
        : `https://peachify.top/embed/tv/${id}/${season}/${episode}`
    } else {
      // vidsrc.mov
      const base = 'https://vidsrc.mov/embed'
      return type === 'movie'
        ? `${base}/movie/${id}`
        : `${base}/tv/${id}/${season}/${episode}`
    }
  }

  const embedUrl = getEmbedUrl()

  // For finding number of episodes in season
  const selectedSeason = seasons?.find(s => s.season_number === season)
  const epCount = selectedSeason?.episode_count || 0

  const handleShare = async () => {
    try {
      setIsSharing(true);
      
      // Pause player
      playerRef.current?.pause();

      let file: File | null = null;
      if (posterUrl) {
        try {
          file = await generateStoryCard(title, posterUrl, type);
          setStoryFile(file);
          const url = URL.createObjectURL(file);
          setStoryPreviewUrl(url);
          setShowShareModal(true);
        } catch (err) {
          console.error("Story card generation failed:", err);
          // Fallback to simple link share if card fails
          if (navigator.share) {
             await navigator.share({ title, url: window.location.href });
          }
        }
      }
    } catch (e) {
      console.log('Share canceled or failed', e);
    } finally {
      setIsSharing(false);
    }
  };

  const handleModalShare = async () => {
    if (!storyFile) return;
    try {
      const shareData: ShareData = {
        title: `Watch ${title} on CineXP`,
        text: `Check out ${title} on CineXP Premium!`,
        url: window.location.href,
      };

      if (navigator.canShare && navigator.canShare({ files: [storyFile] })) {
        shareData.files = [storyFile];
      }

      await navigator.share(shareData);
    } catch (e) {
      console.log('Share failed', e);
    }
  };

  const handleModalDownload = () => {
    if (!storyPreviewUrl) return;
    const link = document.createElement('a');
    link.href = storyPreviewUrl;
    link.download = `cinexp-${title.toLowerCase().replace(/\s+/g, '-')}-story.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloseModal = () => {
    setShowShareModal(false);
    playerRef.current?.play();
  };

  // Keep the source identity stable when menus, watchlists or sharing state changes.
  const directVideoObj = useMemo(() => {
    if (activeProvider !== 'native' || resolvedSourceKey !== sourceKey) return undefined;
    const links = (type === 'tv' ? episodeDownloads : downloadLinks).filter(link => link.isMoviebox);
    if (!links.length) return undefined;
    return {
      sources: links.map(link => {
        const url = new URL(link.url, window.location.origin);
        url.searchParams.set('inline', '1');
        return { src: url.href, type: 'video/mp4', size: Number.parseInt(link.quality, 10) || 0 };
      }).sort((a, b) => b.size - a.size),
      subtitleUrl: links[0]?.subtitleUrl,
    };
  }, [activeProvider, type, episodeDownloads, downloadLinks, resolvedSourceKey, sourceKey]);

  return (
    <div className="media-interactive-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* Control Bar (Servers, TV Selectors, Actions) */}
      <GlassSurface 
        width="100%" 
        height="auto" 
        borderRadius={16} 
        borderWidth={0.05} 
        brightness={20} 
        opacity={0.6} 
        blur={10}
        style={{ overflow: 'visible', zIndex: 10 }}
      >
        <div style={{ 
          padding: '0.75rem 1.25rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '1rem' 
        }}>
          {/* Left Side: Server & Episode controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            
            {/* Server Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', opacity: 0.6, textTransform: 'uppercase' }}>Source</span>
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '4px', flexWrap: 'wrap' }}>
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    aria-pressed={activeProvider === p.id}
                    onClick={() => {
                      changeProvider(p.id)
                      setShowExtraProviders(false)
                    }}
                    style={{
                      position: 'relative',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'transparent',
                      color: activeProvider === p.id ? '#18200f' : 'rgba(255,255,255,0.5)',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'color 0.3s ease',
                      zIndex: 1,
                      flexShrink: 0,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {activeProvider === p.id && (
                      <motion.div
                        layoutId="active-pill"
                        style={{ position: 'absolute', inset: 0, background: 'var(--primary)', borderRadius: '12px', zIndex: -1, boxShadow: 'none' }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    {p.name}
                  </button>
                ))}

                {/* More Dropdown */}
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <button
                    aria-expanded={showExtraProviders}
                    aria-label="More streaming sources"
                    onClick={() => setShowExtraProviders(!showExtraProviders)}
                    style={{
                      position: 'relative',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'transparent',
                      color: EXTRA_PROVIDERS.some(p => p.id === activeProvider) ? '#18200f' : 'rgba(255,255,255,0.5)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'color 0.3s ease',
                      zIndex: 1,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {EXTRA_PROVIDERS.some(p => p.id === activeProvider) && (
                      <motion.div
                        layoutId="active-pill"
                        style={{ 
                          position: 'absolute', 
                          inset: 0, 
                          background: 'var(--primary)',
                          borderRadius: '12px', 
                          zIndex: -1, 
                          boxShadow: 'none'
                        }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    {EXTRA_PROVIDERS.find(p => p.id === activeProvider)?.name || 'More'}
                    <VscChevronDown style={{ transform: showExtraProviders ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }} />
                  </button>

                  <AnimatePresence>
                    {showExtraProviders && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          right: 0,
                          minWidth: '140px',
                          background: 'var(--surface)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: '14px',
                          padding: '6px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
                          zIndex: 100,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        {EXTRA_PROVIDERS.map((p) => (
                          <button
                            key={p.id}
                            aria-pressed={activeProvider === p.id}
                            onClick={() => {
                              changeProvider(p.id)
                              setShowExtraProviders(false)
                            }}
                            style={{
                              padding: '0.6rem 0.8rem',
                              borderRadius: '10px',
                              border: 'none',
                              background: activeProvider === p.id ? 'var(--primary)' : 'transparent',
                              color: activeProvider === p.id ? '#18200f' : 'white',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              opacity: activeProvider === p.id ? 1 : 0.7
                            }}
                            onMouseEnter={(e) => { if(activeProvider !== p.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                            onMouseLeave={(e) => { if(activeProvider !== p.id) e.currentTarget.style.background = 'transparent' }}
                          >
                            {p.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* TV Controls */}
            {type === 'tv' && seasons && (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <select 
                    aria-label="Season"
                    value={season} 
                    onChange={(e) => {
                      setSeason(Number(e.target.value))
                      setEpisode(1)
                    }}
                    style={{ 
                      padding: '0.4rem 2rem 0.4rem 1rem', 
                      borderRadius: '9px', 
                      background: 'rgba(255,255,255,0.06)', 
                      color: 'white', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '0.85rem',
                      appearance: 'none',
                      cursor: 'pointer',
                      backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201.5L6%206.5L11%201.5%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.5)%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.8rem center',
                    }}
                  >
                    {seasons.map((s) => (
                      s.season_number > 0 && <option key={s.id} value={s.season_number} style={{ background: 'var(--surface)' }}>Season {s.season_number}</option>
                    ))}
                  </select>
                  
                  <select
                    aria-label="Episode"
                    value={episode}
                    onChange={(e) => setEpisode(Number(e.target.value))}
                    style={{ 
                      padding: '0.4rem 2rem 0.4rem 1rem', 
                      borderRadius: '9px', 
                      background: 'rgba(255,255,255,0.06)', 
                      color: 'white', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '0.85rem',
                      appearance: 'none',
                      cursor: 'pointer',
                      backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201.5L6%206.5L11%201.5%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.5)%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.8rem center',
                    }}
                  >
                    {Array.from({ length: epCount }).map((_, i) => (
                      <option key={i + 1} value={i + 1} style={{ background: 'var(--surface)' }}>Ep {i + 1}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Right Side: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <WatchlistButton item={{ id, type, title, poster_path: posterUrl || null, backdrop_path: null }} />
            <button
              onClick={handleShare}
              disabled={isSharing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                background: isSharing ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '99px',
                color: isSharing ? 'rgba(255,255,255,0.5)' : 'white',
                cursor: isSharing ? 'wait' : 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500,
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              onMouseEnter={(e) => { if(!isSharing) Object.assign(e.currentTarget.style, { background: 'rgba(255,255,255,0.15)', transform: 'translateY(-1px)' }) }}
              onMouseLeave={(e) => { if(!isSharing) Object.assign(e.currentTarget.style, { background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))', transform: 'translateY(0)' }) }}
            >
              <VscShare size={16} /> <span className="share-text" style={{ whiteSpace: 'nowrap' }}>{isSharing ? 'Generating...' : 'Share to Story'}</span>
            </button>
          </div>
        </div>
      </GlassSurface>

      {/* Player container */}
      <div className="player-container" style={{ aspectRatio: '16/9', width: '100%', background: '#000', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeProvider}-${season}-${episode}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ width: '100%', height: '100%' }}
          >
            {activeProvider === 'native' && !directVideoObj ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
                {sourcesPending ? (
                  <>
                    <div style={{ width: 40, height: 40, border: '3px solid rgba(255,215,0,0.2)', borderTopColor: '#FFD700', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                    <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.6 }}>Loading native stream...</p>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', opacity: 0.5 }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Native source unavailable</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Try another provider for this title.</p>
                  </div>
                )}
              </div>
            ) : (
              <StreamPlayer ref={playerRef} embedUrl={embedUrl} isPaused={showShareModal} startTime={startTime} directVideoObj={directVideoObj} tmdbId={id} type={type} season={season} episode={episode} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Downloads Section */}
      <div className="download-section">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Downloads</h3>
          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available</span>
        </div>
        
        {sourcesPending ? (
          <GlassSurface width="100%" height="auto" borderRadius={16} borderWidth={0.05} brightness={20} opacity={0.6} blur={10}>
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Loading available formats...</div>
          </GlassSurface>
        ) : (downloadLinks.length === 0 && episodeDownloads.length === 0) ? (
          <GlassSurface width="100%" height="auto" borderRadius={16} borderWidth={0.05} brightness={20} opacity={0.6} blur={10}>
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ opacity: 0.5, fontSize: '0.9rem', margin: 0 }}>No download files are available for this title yet.</p>
            </div>
          </GlassSurface>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {(() => {
              const allLinks = [...downloadLinks, ...episodeDownloads];
              const movieboxLinks = allLinks.filter((l) => l.isMoviebox || l.id?.startsWith('moviebox-'));
              const mirrorLinks = allLinks.filter((l) => !l.isMoviebox && !l.id?.startsWith('moviebox-'));

              const renderLinkGroup = (links: PublicDownloadLink[], title: string, subtitle: string, accentColor: string) => {
                if (links.length === 0) return null;
                const rgbAccent = accentColor === 'emerald' ? '16,185,129' : '245,158,11';
                const hexAccent = accentColor === 'emerald' ? '#10b981' : '#f59e0b';
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ paddingLeft: '0.75rem', borderLeft: `3px solid ${hexAccent}` }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'white', letterSpacing: '0.02em' }}>{title}</h4>
                      {subtitle && <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: '0.2rem 0 0 0' }}>{subtitle}</p>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                      {links.map((link, i: number) => {
                        
                        return (
                          <a
                            key={link.id || i}
                            href="#"
                            onClick={(e) => {
                              // Route through interstitial
                              handleDownloadClick(e, link);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem',
                              padding: '1rem',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '16px',
                              transition: 'all 0.3s ease',
                              textDecoration: 'none',
                              color: 'inherit',
                              position: 'relative',
                              overflow: 'hidden',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = hexAccent;
                              e.currentTarget.style.background = `rgba(${rgbAccent}, 0.08)`;
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <div style={{
                              width: 40,
                              height: 40,
                              borderRadius: '12px',
                              background: `linear-gradient(135deg, ${hexAccent}, ${hexAccent}88)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.2rem',
                              flexShrink: 0,
                              boxShadow: `0 4px 12px ${hexAccent}44`,
                            }}>
                              ⬇
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                <span style={{ fontSize: '0.95rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {link.label || link.quality}
                                </span>
                                {link.subtitleUrl && (
                                  <span style={{ fontSize: '0.6rem', padding: '1px 5px', background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', borderRadius: '4px', fontWeight: 700 }}>+ SUB</span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {link.quality && link.label !== link.quality && (
                                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontWeight: 600 }}>{link.quality}</span>
                                )}
                                {link.size && (
                                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', opacity: 0.7 }}>{link.size}</span>
                                )}
                              </div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              };


              return (
                <>
                  {renderLinkGroup(movieboxLinks, "Download files", "", 'emerald')}
                  {renderLinkGroup(mirrorLinks, "Alternative downloads", "", 'amber')}
                </>
              );
            })()}
            
            {/* Native Proxied Premium Link */}
            {(type === 'movie' || type === 'tv') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ paddingLeft: '0.75rem', borderLeft: `3px solid #9d00ff` }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'white', letterSpacing: '0.02em' }}>More download options</h4>
                <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: '0.2rem 0 0 0' }}>Find additional files for this title. Availability varies by source.</p>
              </div>
              
              {fastDownloadLinks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                   {Object.entries(
                     fastDownloadLinks.reduce((acc, link) => {
                       const s = link.season || season;
                       if (!acc[s]) acc[s] = [];
                       acc[s].push(link);
                       return acc;
                     }, {} as Record<number, typeof fastDownloadLinks>)
                   ).map(([s, links]) => (
                     <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                       {type === 'tv' && (
                           <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', paddingLeft: '0.6rem', borderLeft: '3px solid rgba(157,0,255,0.5)' }}>
                               Season {s}
                           </div>
                       )}
                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                         {links.map((link, idx) => (
                           <a
                              key={idx}
                              href="#"
                              onClick={(e) => {
                                 // Optional visual feedback
                                 const el = e.currentTarget;
                                 el.style.opacity = "0.7";
                                 
                                 // Route through interstitial
                                 handleDownloadClick(e, link);
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(157,0,255,0.08)', border: '1px solid #9d00ff', borderRadius: '16px', transition: 'all 0.3s ease', textDecoration: 'none', color: 'inherit', cursor: 'pointer'
                              }}
                            >
                               <div style={{ width: 40, height: 40, borderRadius: '12px', background: `linear-gradient(135deg, #9d00ff, #5b00ff)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0, boxShadow: `0 4px 12px rgba(157,0,255,0.4)` }}>
                                 🚀
                               </div>
                               <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.05rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.label}</span>
                               </div>
                            </a>
                         ))}
                       </div>
                     </div>
                   ))}
                </div>
              ) : (
                <div>
                  <button
                    onClick={handleGenerateFastLink}
                    disabled={fastDownloadLoading}
                    style={{
                      padding: '0.8rem 1.5rem', background: 'linear-gradient(135deg, #9d00ff, #5b00ff)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 600, cursor: fastDownloadLoading ? 'wait' : 'pointer', opacity: fastDownloadLoading ? 0.7 : 1, boxShadow: '0 4px 15px rgba(157,0,255,0.3)'
                    }}
                  >
                      {fastDownloadLoading ? 'Finding files…' : 'Find more downloads'}
                  </button>
                  {fastDownloadError && <div style={{ color: '#ff4b4b', marginTop: '0.5rem', fontSize: '0.85rem' }}>{fastDownloadError}</div>}
                </div>
              )}
            </div>
            )}
          </div>
        )}
      </div>

      <ShareStoryModal 
        isOpen={showShareModal}
        onClose={handleCloseModal}
        onShare={handleModalShare}
        onDownload={handleModalDownload}
        previewUrl={storyPreviewUrl}
        title={title}
      />
    </div>
  )
}
