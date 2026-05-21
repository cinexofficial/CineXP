import { getDiscoverByGenre, GENRE_MAP, type TMDBMediaItem } from "@/lib/tmdb";
import MediaCard from "@/components/MediaCard";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const genreName = GENRE_MAP[parseInt(id, 10)];
  if (!genreName) return { title: 'Not Found' };
  
  return {
    title: `${genreName} Content`,
    description: `Discover top rated and popular ${genreName} movies and TV shows.`,
    alternates: { canonical: `https://www.cinexp.site/genres/${id}` }
  };
}

export default async function GenreSpecificPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const genreId = parseInt(id, 10);
  const genreName = GENRE_MAP[genreId];

  if (!genreName) {
    notFound();
  }

  const items = await getDiscoverByGenre(genreId);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>


      <div className="page-wrapper container" style={{ position: "relative", zIndex: 1, paddingBottom: "100px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", padding: "4rem 0 3rem" }}>
          <div style={{ display: 'inline-block', padding: '0.5rem 1.5rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '30px', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
             <span style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem', opacity: 0.8 }}>Genre</span>
          </div>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 4.5rem)",
              fontWeight: 700,
              marginBottom: "0.5rem",
              background: "linear-gradient(135deg, #fff 30%, #e0aaff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.1,
            }}
          >
            {genreName}
          </h1>
        </div>

        {/* Content Grid */}
        <section>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem", opacity: 0.5 }}>
              <p>No content found for this genre.</p>
            </div>
          ) : (
            <div className="grid">
              {items.map((item: TMDBMediaItem, index: number) => {
                return (
                  <MediaCard 
                    key={`${item.media_type}-${item.id}`} 
                    item={item} 
                    stagger={index % 6 * 0.05}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
