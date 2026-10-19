import type { Metadata } from "next";
import { getPopularTVShows } from "@/lib/tmdb";
import { getAdSettings } from "@/lib/settings";
import Catalog from "@/components/Catalog";

export const metadata: Metadata = {
  title: "Series",
  description: "Find your next favorite series on CineXP.",
  alternates: { canonical: "https://www.cinexp.site/tv" },
};
export default async function TVPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(
    1,
    Math.min(500, Number.parseInt((await searchParams).page || "1", 10) || 1),
  );
  const [shows, settings] = await Promise.all([
    getPopularTVShows(page, "IN"),
    getAdSettings(),
  ]);
  return (
    <Catalog
      eyebrow="Just one more episode"
      title="Your next long story."
      description="Meet characters you’ll come back for. Discover a series that makes the hours disappear."
      items={shows.map((item) => ({ ...item, media_type: "tv" }))}
      active="/tv"
      ads={settings.postersEnabled}
      page={page}
    />
  );
}
