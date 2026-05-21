import { getPopularTVShows, type TMDBMediaItem } from "@/lib/tmdb";
import MediaCard from "@/components/MediaCard";
import AdSlot from "@/components/ads/AdSlot";
import { Fragment } from "react";
import { getAdSettings } from "@/lib/settings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'TV Shows',
  description: 'Discover popular and highly rated TV series on CineXP.',
  alternates: { canonical: 'https://www.cinexp.site/tv' }
};

export default async function TVShowsPage() {
  const tvShows = await getPopularTVShows(1, 'IN');
  const adSettings = await getAdSettings();

  const tvItems: TMDBMediaItem[] = tvShows.map(m => ({ ...m, media_type: 'tv' }));

  return (
    <div className="public-page">
      <div className="page-wrapper container catalogue-page">
        <div className="catalogue-header">
          <span className="eyebrow">Series</span>
          <h1>Popular Series</h1>
          <p>
            Binge-worthy shows and gripping episodes, updated daily.
          </p>
        </div>

        {/* TV Grid */}
        <section>
          {tvItems.length === 0 ? (
            <div className="empty-panel">
              <p>Could not load TV shows. Please try again later.</p>
            </div>
          ) : (
            <div className="grid">
              {tvItems.map((item: TMDBMediaItem, index: number) => {
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
