import { getPopularMovies, type TMDBMediaItem } from "@/lib/tmdb";
import MediaCard from "@/components/MediaCard";
import AdSlot from "@/components/ads/AdSlot";
import { Fragment } from "react";
import { getAdSettings } from "@/lib/settings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Movies',
  description: 'Discover popular and highly rated movies on CineXP.',
  alternates: { canonical: 'https://www.cinexp.site/movies' }
};

export default async function MoviesPage() {
  const movies = await getPopularMovies(1, 'IN');
  const adSettings = await getAdSettings();

  const movieItems: TMDBMediaItem[] = movies.map(m => ({ ...m, media_type: 'movie' }));

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div className="page-wrapper container" style={{ position: "relative", zIndex: 1, paddingBottom: "100px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", padding: "4rem 0 3rem" }}>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 4rem)",
              fontWeight: 700,
              marginBottom: "1rem",
              background: "linear-gradient(135deg, #fff 30%, #e85d04)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.1,
            }}
          >
            Popular Movies
          </h1>
          <p style={{ fontSize: "1.15rem", maxWidth: 520, margin: "0 auto", opacity: 0.7, lineHeight: 1.7 }}>
            A curated list of blockbusters and cinematic masterpieces.
          </p>
        </div>

        {/* Movies Grid */}
        <section>
          {movieItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem", opacity: 0.5 }}>
              <p>Could not load movies. Please try again later.</p>
            </div>
          ) : (
            <div className="grid">
              {movieItems.map((item: TMDBMediaItem, index: number) => {
                const card = (
                  <MediaCard 
                    key={`${item.media_type}-${item.id}`} 
                    item={item} 
                    stagger={index % 6 * 0.05}
                  />
                );
                if (adSettings.postersEnabled && index > 0 && index % 12 === 0) {
                  return (
                    <Fragment key={`ad-${index}`}>
                      <div style={{ gridColumn: '1 / -1', margin: '2rem 0', display: 'flex', justifyContent: 'center' }}>
                        <AdSlot />
                      </div>
                      {card}
                    </Fragment>
                  );
                }
                return card;
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
