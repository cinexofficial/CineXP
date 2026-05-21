import Link from 'next/link';
import { GENRE_MAP } from '@/lib/tmdb';
import ScrollReveal from '@/components/ui/ScrollReveal';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Genres',
  description: 'Explore movies and series by your favorite genres.',
  alternates: { canonical: 'https://www.cinexp.site/genres' }
};

export default function GenresPage() {
  const genres = Object.entries(GENRE_MAP).map(([id, name]) => ({ id, name }));

  // Sort genres alphabetically for a cleaner look
  genres.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>


      <div className="page-wrapper container" style={{ position: "relative", zIndex: 1, paddingBottom: "100px", paddingTop: "5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h1
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
              fontWeight: 700,
              marginBottom: "1rem",
              background: "linear-gradient(135deg, #fff 40%, var(--primary))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.1,
            }}
          >
            Genres
          </h1>
          <p style={{ fontSize: "1.2rem", opacity: 0.7 }}>Find exactly what you are in the mood for.</p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
          gap: '1.5rem',
          maxWidth: '1200px',
          margin: '0 auto' 
        }}>
          {genres.map((genre, i) => (
            <ScrollReveal stagger={i * 0.02} key={genre.id}>
              <Link href={`/genres/${genre.id}`}>
                <div style={{
                  padding: '1.5rem',
                  borderRadius: '16px',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
                  border: '1px solid rgba(255,255,255,0.05)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(10px)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '120px'
                }}
                className="genre-card"
                >
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'white' }}>{genre.name}</h3>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
