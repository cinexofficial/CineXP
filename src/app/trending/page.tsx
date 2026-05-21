import { getTrending, getMediaById, type TMDBMediaItem } from "@/lib/tmdb";
import MediaCard from "@/components/MediaCard";
import Top10Row from "@/components/ui/Top10Row";
import { prisma } from "@/lib/admin";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Trending',
  description: 'See what is hot and trending right now on CineXP.',
  alternates: { canonical: 'https://www.cinexp.site/trending' }
};

export default async function TrendingPage() {
  const trending = await getTrending('IN');

  // Fetch admin Top 10 picks from DB
  let top10Items: TMDBMediaItem[] = [];
  try {
    const top10Section = await prisma.homeSection.findUnique({
      where: { key: 'top_10' },
      include: { items: { orderBy: { position: 'asc' } } }
    });

    if (top10Section && top10Section.items.length > 0) {
      const resolved = await Promise.all(
        top10Section.items.map(item => getMediaById(item.tmdbId, item.mediaType))
      );

      const usedIds = new Set<number>();
      // Admin picks first
      for (const item of resolved) {
        if (item) { top10Items.push(item); usedIds.add(item.id); }
      }
      // Fill remaining to 10 from trending
      for (const item of trending) {
        if (top10Items.length >= 10) break;
        if (!usedIds.has(item.id)) { top10Items.push(item); usedIds.add(item.id); }
      }
    } else {
      // No admin picks — use trending as before
      top10Items = trending.slice(0, 10);
    }
  } catch {
    top10Items = trending.slice(0, 10);
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>


      <div className="page-wrapper container" style={{ position: "relative", zIndex: 1, paddingBottom: "100px" }}>
        <div style={{ textAlign: "center", padding: "4rem 0 3rem" }}>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 4rem)",
              fontWeight: 700,
              marginBottom: "1rem",
              background: "linear-gradient(135deg, #fff 30%, var(--accent))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.1,
            }}
          >
            Trending Now
          </h1>
          <p style={{ fontSize: "1.15rem", maxWidth: 520, margin: "0 auto", opacity: 0.7, lineHeight: 1.7 }}>
            The most popular movies and series this week.
          </p>
        </div>

        {/* Top 10 — Uses admin picks */}
        {top10Items.length >= 10 && <Top10Row items={top10Items} />}

        {/* Trending Grid */}
        <section>
          {trending.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem", opacity: 0.5 }}>
              <p>Could not load trending content. Please try again later.</p>
            </div>
          ) : (
            <div className="grid">
              {trending.map((item: TMDBMediaItem, index: number) => (
                <MediaCard
                  key={`${item.media_type}-${item.id}`}
                  item={item}
                  stagger={index % 6 * 0.05}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
