import type { Metadata } from "next";
import { getPopularMovies } from "@/lib/tmdb";
import { getAdSettings } from "@/lib/settings";
import Catalog from "@/components/Catalog";

export const metadata: Metadata = {
  title: "Movies",
  description: "Discover popular movies and your next big-screen obsession.",
  alternates: { canonical: "https://www.cinexp.site/movies" },
};
export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(
    1,
    Math.min(500, Number.parseInt((await searchParams).page || "1", 10) || 1),
  );
  const [movies, settings] = await Promise.all([
    getPopularMovies(page, "IN"),
    getAdSettings(),
  ]);
  return (
    <Catalog
      eyebrow="For the love of film"
      title="Make it a movie night."
      description="Big adventures, quiet revelations, and everything in between. Find a film to get lost in."
      items={movies.map((item) => ({ ...item, media_type: "movie" }))}
      active="/movies"
      ads={settings.postersEnabled}
      page={page}
    />
  );
}
