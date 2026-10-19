import type { Metadata } from "next";
import Link from "next/link";
import { VscArrowRight } from "react-icons/vsc";
import { GENRE_MAP } from "@/lib/tmdb";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "Explore genres",
  description: "Follow your curiosity. Explore movies and series by genre.",
};
export default function GenresPage() {
  return (
    <div className="container page-wrapper">
      <PageHeading
        eyebrow="Follow your curiosity"
        title="What’s your kind of story?"
        description="A change of pace. A familiar feeling. A whole new world. There’s a genre for every mood."
      />
      <div className="cx-genre-grid">
        {Object.entries(GENRE_MAP).map(([id, name]) => (
          <Link href={`/genres/${id}`} className="cx-genre-tile" key={id}>
            <h2>{name}</h2>
            <VscArrowRight aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
