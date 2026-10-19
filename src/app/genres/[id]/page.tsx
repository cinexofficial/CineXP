import { getDiscoverByGenre, GENRE_MAP } from "@/lib/tmdb";
import Catalog from "@/components/Catalog";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const genreName = GENRE_MAP[parseInt(id, 10)];
  if (!genreName) return { title: "Not Found" };

  return {
    title: `${genreName} Content`,
    description: `Discover top rated and popular ${genreName} movies and TV shows.`,
    alternates: { canonical: `https://www.cinexp.site/genres/${id}` },
  };
}

export default async function GenreSpecificPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const genreId = parseInt(id, 10);
  const genreName = GENRE_MAP[genreId];

  if (!genreName) {
    notFound();
  }

  const items = await getDiscoverByGenre(genreId);

  return (
    <Catalog
      eyebrow="Follow your curiosity"
      title={genreName}
      description={`Discover ${genreName.toLowerCase()} movies and series. Find a story that takes you somewhere new.`}
      items={items}
      active="/genres"
    />
  );
}
