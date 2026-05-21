'use client';

import AdBanner from './AdBanner';

/**
 * A fullscreen reel-style ad slide that blends into the vertical scroll feed.
 * Renders a 300x250 banner centered with a "Sponsored" label like Instagram.
 * Uses the shared sequential AdBanner loader (direct DOM injection, no iframe).
 *
 * If an ad-blocker prevents loading, the entire slide collapses so the
 * scroll feed isn't interrupted by empty space.
 */
export default function ReelAdSlide() {

  return (
    <div
      style={{
        height: '100dvh',
        width: '100%',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0a0015 0%, #110022 50%, #0a0015 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
      }}
    >
      {/* Subtle background pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(157,0,255,0.3) 0%, transparent 50%),
                            radial-gradient(circle at 75% 75%, rgba(157,0,255,0.3) 0%, transparent 50%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Sponsored Label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 1rem',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '99px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--primary, #9d00ff)',
            boxShadow: '0 0 6px var(--primary, #9d00ff)',
          }}
        />
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Sponsored
        </span>
      </div>

      {/* Ad container — uses the shared sequential queue via AdBanner */}
      <div
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        <AdBanner adKey="87b1f98e2b43417d714893dfa11c7e9f" width={300} height={250} />
      </div>
    </div>
  );
}
