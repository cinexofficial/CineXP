import Image from 'next/image';
import type { Metadata } from "next";
import Link from "next/link";
import {
  VscArrowRight,
  VscCompass,
  VscPlay,
  VscSymbolClass,
} from "react-icons/vsc";
import {
  getTrending,
  getMediaById,
  getUpcomingMovies,
  getImageUrl,
  type TMDBMediaItem,
  type TMDBMovie,
} from "@/lib/tmdb";
import { prisma } from "@/lib/admin";
import { getAdSettings } from "@/lib/settings";
import FeaturedHero from "@/components/FeaturedHero";
import MediaCard from "@/components/MediaCard";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import RecommendedRow from "@/components/RecommendedRow";
import Top10Row from "@/components/ui/Top10Row";
import CountdownRow from "@/components/CountdownRow";
import HomeSectionFlow from "@/components/HomeSectionFlow";

export const metadata: Metadata = {
  title: { absolute: "CineXP — Your next great story starts here" },
  description:
    "Discover your next favorite movie or series. Explore trending titles, find something for your mood, and pick up where you left off.",
  alternates: { canonical: "https://www.cinexp.site" },
};
export const revalidate = 3600;

interface SectionItem {
  tmdbId: number;
  mediaType: string;
  position: number;
  preferredStream?: string | null;
}
interface Section {
  key: string;
  title: string;
  type: string;
  order: number;
  visible: boolean;
  autoFill: boolean;
  maxItems: number;
  items: SectionItem[];
}
const defaults: Section[] = [
  {
    key: "continue_watching",
    title: "Pick up where you left off.",
    type: "continue_watching",
    order: 0,
    visible: true,
    autoFill: true,
    maxItems: 10,
    items: [],
  },
  {
    key: "top_10",
    title: "The titles everyone’s talking about.",
    type: "top10",
    order: 1,
    visible: true,
    autoFill: true,
    maxItems: 10,
    items: [],
  },
  {
    key: "trending",
    title: "Worth your screen time.",
    type: "trending",
    order: 2,
    visible: true,
    autoFill: true,
    maxItems: 12,
    items: [],
  },
  {
    key: "recommended",
    title: "Recommended for you",
    type: "recommended",
    order: 3,
    visible: true,
    autoFill: true,
    maxItems: 12,
    items: [],
  },
];
const mediaKey = (type: string, id: number) =>
  `${type === "tv" ? "tv" : "movie"}-${id}`;

export default async function HomePage() {
  let sections = defaults;
  if (process.env.DATABASE_URL) {
    try {
      const saved = await prisma.homeSection.findMany({
        orderBy: { order: "asc" },
        include: { items: { orderBy: { position: "asc" } } },
      });
      // An intentionally hidden section stays hidden, including when all are hidden.
      if (saved.length) sections = saved;
    } catch (error) {
      console.error("Unable to load homepage layout:", error);
    }
  }
  const visible = sections.filter((section) => section.visible);
  const adminItems = visible.flatMap((section) => section.items);
  const [trending, upcoming, adSettings, resolved] = await Promise.all([
    getTrending("IN"),
    visible.some((section) => section.type === "countdown")
      ? getUpcomingMovies("IN")
      : Promise.resolve([]),
    getAdSettings(),
    Promise.all(
      adminItems.map(async (pick): Promise<TMDBMediaItem | null> => {
        const item = await getMediaById(pick.tmdbId, pick.mediaType);
        return item ? { ...item, preferredStream: pick.preferredStream } : null;
      }),
    ),
  ]);
  const lookup = new Map<string, TMDBMediaItem>();
  trending.forEach((item) =>
    lookup.set(mediaKey(item.media_type, item.id), item),
  );
  resolved.forEach((item) => {
    if (item) lookup.set(mediaKey(item.media_type, item.id), item);
  });
  const resolveSection = (section: Section) => {
    const chosen = section.items
      .map((pick) => lookup.get(mediaKey(pick.mediaType, pick.tmdbId)))
      .filter((item): item is TMDBMediaItem => !!item);
    const candidates = section.autoFill
      ? [
          ...chosen,
          ...(section.type === "countdown"
            ? upcoming.map((item) => ({ ...item, media_type: "movie" }))
            : trending),
        ]
      : chosen;
    const seen = new Set<string>();
    return candidates
      .filter((item) => {
        const key = mediaKey(item.media_type, item.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, Math.max(0, section.maxItems));
  };
  const featured = [
    ...resolved.filter((item): item is TMDBMediaItem => !!item),
    ...trending,
  ]
    .filter(
      (item, index, all) =>
        item.backdrop_path &&
        all.findIndex(
          (other) =>
            mediaKey(other.media_type, other.id) ===
            mediaKey(item.media_type, item.id),
        ) === index,
    )
    .slice(0, 3);
  const collections = [
    {
      href: "/genres/878",
      title: "Somewhere beyond.",
      label: "Sci-fi & possibility",
      genre: 878,
    },
    {
      href: "/genres/53",
      title: "On the edge of your seat.",
      label: "Thrillers & suspense",
      genre: 53,
    },
    {
      href: "/genres/35",
      title: "A little lighter.",
      label: "Comedy & good company",
      genre: 35,
    },
  ];

  return (
    <div className="cx-home">
      <FeaturedHero items={featured} />
      <div className="container cx-content">
        <div className="cx-discovery-nav">
          <p>A world of stories. Where to next?</p>
          <nav className="cx-chips" aria-label="Discover content">
            <Link className="cx-chip" href="/" aria-current="page">
              <VscCompass /> For you
            </Link>
            <Link className="cx-chip" href="/movies">
              <VscPlay /> Movies
            </Link>
            <Link className="cx-chip" href="/tv">
              <VscSymbolClass /> Series
            </Link>
            <Link className="cx-chip" href="/trending">
              Trending now
            </Link>
            <Link className="cx-chip" href="/genres">
              All genres <VscArrowRight />
            </Link>
          </nav>
        </div>
        <HomeSectionFlow placements={adSettings.placements}>
        {visible.map((section) => {
          const items = resolveSection(section);
          let content;
          if (section.type === "continue_watching")
            content = <ContinueWatchingRow title={section.title} />;
          else if (section.type === "recommended") content = <RecommendedRow />;
          else if (!items.length) return null;
          else if (section.type === "top10")
            content = (
              <Top10Row
                items={items}
                title={section.title}
                maxItems={section.maxItems}
              />
            );
          else if (section.type === "countdown")
            content = <CountdownRow upcoming={items as TMDBMovie[]} />;
          else
            content = (
              <section className="cx-section">
                <div className="cx-section-heading">
                  <div>
                    <p className="cx-eyebrow">
                      {section.type === "trending"
                        ? "The lineup"
                        : "Discover more"}
                    </p>
                    <h2>{section.title}</h2>
                  </div>
                  <Link className="cx-text-link" href="/trending">
                    Explore all <VscArrowRight />
                  </Link>
                </div>
                <div className="grid">
                  {items.map((item) => (
                    <MediaCard
                      key={mediaKey(item.media_type, item.id)}
                      item={item}
                    />
                  ))}
                </div>
              </section>
            );
          return (
            <div key={section.key}>
              {content}
            </div>
          );
        })}
        <section className="cx-section" key="genre-collections">
          <div className="cx-section-heading">
            <div>
              <p className="cx-eyebrow">Follow your curiosity</p>
              <h2>A different kind of escape.</h2>
            </div>
            <Link className="cx-text-link" href="/genres">
              All genres <VscArrowRight />
            </Link>
          </div>
          <div className="cx-collections">
            {collections.map((collection) => {
              const art = trending.find(
                (item) =>
                  item.genre_ids?.includes(collection.genre) &&
                  item.backdrop_path,
              );
              return (
                <Link
                  className="cx-collection"
                  key={collection.href}
                  href={collection.href}
                >
                  {art?.backdrop_path && (
                    <Image
                      src={getImageUrl(art.backdrop_path, "w780")}
                        fill
                        sizes="(max-width: 600px) 100vw, 33vw"
                      alt=""
                      loading="lazy"
                    />
                  )}
                  <span>{collection.label}</span>
                  <h3>{collection.title}</h3>
                  <VscArrowRight aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </section>
        </HomeSectionFlow>
      </div>
    </div>
  );
}
