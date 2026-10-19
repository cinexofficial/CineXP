'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getImageUrl, type TMDBMovie } from '@/lib/tmdb';
import MediaCard from './MediaCard';

function getTimeLeft(releaseDate: string) {
  const difference = new Date(releaseDate).getTime() - new Date().getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, outNow: true };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    outNow: false
  };
}

export default function CountdownRow({ upcoming }: { upcoming: TMDBMovie[] }) {
  // A small timer hook to force re-render every hour
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000 * 60 * 60); // update every hour
    return () => clearInterval(timer);
  }, []);

  if (!upcoming || upcoming.length === 0) return null;

  // We only want to show things that are not yet released or just released today
  const upcomingFiltered = upcoming.filter(item => {
    if (!item.release_date) return false;
    const { days, outNow } = getTimeLeft(item.release_date);
    return !outNow && days <= 60; // Show only next 2 months
  }).sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());

  if (upcomingFiltered.length === 0) return null;

  return (
    <div style={{ marginBottom: "5rem" }}>
      <h2 style={{ fontSize: "1.6rem", fontWeight: 600, marginBottom: "1.5rem" }}>
        <span style={{ color: 'var(--accent)' }}>⏱️</span> Coming Soon
      </h2>
      <div className="grid">
        {upcomingFiltered.slice(0, 6).map((movie, index) => {
          const { days, hours } = getTimeLeft(movie.release_date);
          const mediaItem = { ...movie, media_type: 'movie' };

          return (
            <div key={movie.id} style={{ position: 'relative' }}>
              <MediaCard item={mediaItem} stagger={index * 0.05} />
              
              {/* Countdown Overlay */}
              <div 
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(15, 5, 30, 0.85)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid var(--primary)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'white',
                  pointerEvents: 'none',
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  display: 'flex',
                  gap: '5px',
                  alignItems: 'center'
                }}
              >
                <span style={{ color: 'var(--accent)' }}>{days}D</span> : <span>{hours}H</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
