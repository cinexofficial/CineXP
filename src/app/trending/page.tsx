import { getTrending, getMediaById, type TMDBMediaItem } from "@/lib/tmdb";
import Catalog from "@/components/Catalog";
import Top10Row from "@/components/ui/Top10Row";
import { prisma } from "@/lib/admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trending",
  description: "See what is hot and trending right now on CineXP.",
  alternates: { canonical: "https://www.cinexp.site/trending" },
};

export default async function TrendingPage() {
  const trending = await getTrending("IN");

  // Fetch admin Top 10 picks from DB
  let top10Items: TMDBMediaItem[] = [];
  try {
    if (!process.env.DATABASE_URL) throw new Error("Database not configured");
    const top10Section = await prisma.homeSection.findUnique({
      where: { key: "top_10" },
      include: { items: { orderBy: { position: "asc" } } },
    });

    if (top10Section && top10Section.items.length > 0) {
      const resolved = await Promise.all(
        top10Section.items.map((item) =>
          getMediaById(item.tmdbId, item.mediaType),
        ),
      );

      const usedIds = new Set<number>();
      // Admin picks first
      for (const item of resolved) {
        if (item) {
          top10Items.push(item);
          usedIds.add(item.id);
        }
      }
      // Fill remaining to 10 from trending
      for (const item of trending) {
        if (top10Items.length >= 10) break;
        if (!usedIds.has(item.id)) {
          top10Items.push(item);
          usedIds.add(item.id);
        }
      }
    } else {
      // No admin picks — use trending as before
      top10Items = trending.slice(0, 10);
    }
  } catch {
    top10Items = trending.slice(0, 10);
  }

  return (
    <Catalog
      eyebrow="The conversation starters"
      title="Having a moment."
      description="The films and series making their way onto everyone’s watchlist. See what the buzz is about."
      items={trending}
      active="/trending"
    >
      {top10Items.length > 0 && (
        <Top10Row items={top10Items} title="At the top of the list." />
      )}
    </Catalog>
  );
}
