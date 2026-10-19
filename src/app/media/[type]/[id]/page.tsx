import Image from 'next/image';
import {
  getDetails,
  getImageUrl,
  getBackdropUrl,
  getSimilar,
} from "@/lib/tmdb";
import { getAdSettings } from "@/lib/settings";

import type { Metadata, ResolvingMetadata } from "next";
import MediaInteractive from "@/components/MediaInteractive";
import MediaCard from "@/components/MediaCard";
import HistoryTracker from "@/components/HistoryTracker";
import DisplayAd from "@/components/ads/DisplayAd";
import Link from "next/link";
import { VscArrowLeft, VscPlay, VscStarFull } from "react-icons/vsc";
import WatchlistButton from "@/components/WatchlistButton";
import { Suspense } from "react";

export const dynamicParams = true;
export const maxDuration = 60;
export const revalidate = 604800; // 7 days — safety net for pages added post-deploy

export async function generateStaticParams() {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { prisma } = await import("@/lib/admin");
    // Prebuild ALL enabled SEOPages — reads from DB (0 TMDB calls)
    const pages = await prisma.sEOPage.findMany({
      where: { enabled: true },
      orderBy: { addedAt: "desc" },
    });
    return pages.map((page) => ({
      type: page.mediaType as "movie" | "tv",
      id: page.slug,
    }));
  } catch (err) {
    console.error("Error in generateStaticParams:", err);
    return [];
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ type: "movie" | "tv"; id: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { type, id: rawId } = await params;
  const id = rawId.split("-")[0];
  const details = await getDetails(type, id);
  if (!details) {
    return {
      title: "CineXP — Stream Free Movies & TV",
      description:
        "Watch the latest movies and TV shows online free in HD on CineXP.",
    };
  }

  const baseTitle = details.title || details.name || 'Untitled';
  const year = (
    details.release_date ||
    details.first_air_date ||
    ""
  ).split("-")[0];
  const typeText = type === "movie" ? "Movie" : "TV Show";

  // SEO Optimized Titles and Descriptions for streaming sites
  const title = `Watch ${baseTitle} ${year ? `(${year}) ` : ""}Online Free HD`;
  const overview = `Watch ${baseTitle} full ${typeText.toLowerCase()} online for free in HD. ${details.overview || "Stream the best movies and TV shows on CineXP."}`;

  const posterUrl = getImageUrl(details.poster_path, "w500");
  const url = `https://www.cinexp.site/media/${type}/${rawId}`;

  return {
    title,
    description: overview,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description: overview,
      url,
      images: [
        {
          url: "https://www.cinexp.site/og-rect-v2.png",
          width: 1200,
          height: 630,
          alt: "CineXP - Premium Streaming",
        },
        {
          url: "https://www.cinexp.site/og-square-v2.png",
          width: 800,
          height: 800,
          alt: "CineXP - Premium Streaming",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: overview,
      images: ["https://www.cinexp.site/og-rect-v2.png"],
    },
  };
}

export default async function MediaPage({
  params,
}: {
  params: Promise<{ type: "movie" | "tv"; id: string }>;
}) {
  const { type, id: rawId } = await params;
  const id = rawId.split("-")[0];

  const [details, similar, adSettings] = await Promise.all([
    getDetails(type, id),
    getSimilar(type, id),
    getAdSettings(),
  ]);

  if (!details) {
    return (
      <div
        className="page-wrapper container"
        style={{ paddingTop: "20vh", textAlign: "center" }}
      >
        <h1>Content Temporarily Unavailable</h1>
        <p style={{ opacity: 0.7 }}>
          We&apos;re having trouble loading this title. Please try again in a
          moment.
        </p>
        <Link href="/">Browse Available Titles</Link>
      </div>
    );
  }

  const title = details.title || details.name || 'Untitled';
  const year = (
    details.release_date ||
    details.first_air_date ||
    ""
  ).split("-")[0];
  const backdropUrl = getBackdropUrl(details.backdrop_path);
  const posterUrl = getImageUrl(details.poster_path, "w500");
  const seasons = 'seasons' in details ? details.seasons : undefined;

  // Comprehensive Indian content detection — covers all Indian languages, not just Hindi
  const INDIAN_LANGUAGES = [
    "hi",
    "ta",
    "te",
    "ml",
    "kn",
    "bn",
    "mr",
    "pa",
    "gu",
    "or",
    "as",
    "ur",
    "bh",
    "sa",
  ];
  const origLang = details.original_language || "";
  const originCountries: string[] = details.origin_country || [];
  const prodCountries: { iso_3166_1: string }[] =
    details.production_countries || [];
  const isIndian =
    originCountries.includes("IN") ||
    INDIAN_LANGUAGES.includes(origLang) ||
    prodCountries.some((c) => c.iso_3166_1 === "IN");
  const industry = isIndian ? "bollywood" : "hollywood";

  const historyItem = {
    id: String(id),
    type,
    title,
    poster_path: details.poster_path,
    backdrop_path: details.backdrop_path,
  };

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type === "movie" ? "Movie" : "TVSeries",
    name: title,
    image: posterUrl,
    description:
      details.overview || `Watch ${title} online for free in HD on CineXP.`,
    dateCreated: year,
    url: `https://www.cinexp.site/media/${type}/${rawId}`,
  };

  // Enrich with aggregateRating if TMDB has votes
  if (details.vote_average > 0 && details.vote_count > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: details.vote_average.toFixed(1),
      bestRating: "10",
      ratingCount: details.vote_count,
    };
  }

  // Enrich with genre list
  if (details.genres && details.genres.length > 0) {
    jsonLd.genre = details.genres.map((g) => g.name);
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.cinexp.site",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: type === "movie" ? "Movies" : "TV Shows",
        item: `https://www.cinexp.site/${type === "movie" ? "movies" : "tv"}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: `https://www.cinexp.site/media/${type}/${rawId}`,
      },
    ],
  };

  return (
    <div className="cx-detail">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <HistoryTracker item={historyItem} />
      {backdropUrl && (
        <div
          className="cx-detail-backdrop"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        />
      )}
      <div className="container page-wrapper cx-detail-content">
        <Link
          href={type === "movie" ? "/movies" : "/tv"}
          className="cx-text-link"
        >
          <VscArrowLeft /> Back to {type === "movie" ? "movies" : "series"}
        </Link>
        <div className="cx-detail-header">
          {posterUrl && (
            <Image
              className="cx-detail-poster"
              sizes="(max-width: 600px) 135px, 250px"
              src={posterUrl}
              alt={`${title} poster`}
              width={250}
              height={375}
              fetchPriority="high"
            />
          )}
          <div className="cx-detail-info">
            <p className="cx-eyebrow">Your next great story</p>
            <h1>{title}</h1>
            <div className="cx-meta">
              {details.vote_average > 0 && (
                <span className="cx-rating">
                  <VscStarFull aria-hidden="true" />
                  {details.vote_average.toFixed(1)}
                  <span className="sr-only"> out of 10 on TMDB</span>
                </span>
              )}
              {year && <span>{year}</span>}
              <span>{type === "tv" ? "Series" : "Movie"}</span>
              {"runtime" in details && !!details.runtime && (
                <span>{details.runtime} min</span>
              )}
              {"number_of_seasons" in details &&
                !!details.number_of_seasons && (
                  <span>
                    {details.number_of_seasons}{" "}
                    {details.number_of_seasons === 1 ? "season" : "seasons"}
                  </span>
                )}
            </div>
            <p className="cx-detail-overview">
              {details.overview ||
                "Explore this title and discover a new story."}
            </p>
            <nav className="cx-chips" aria-label="Genres for this title">
              {details.genres?.map((genre) => (
                <Link
                  className="cx-chip"
                  key={genre.id}
                  href={`/genres/${genre.id}`}
                >
                  {genre.name}
                </Link>
              ))}
            </nav>
            <div className="cx-hero-actions">
              <a href="#watch" className="cx-button">
                <VscPlay aria-hidden="true" /> Start watching
              </a>
              <WatchlistButton item={historyItem} />
            </div>
          </div>
        </div>
        <div id="watch" className="cx-section-heading">
          <div>
            <p className="cx-eyebrow">Settle in</p>
            <h2>Enjoy the story.</h2>
          </div>
        </div>
        {/* Interactive: Season picker + Player + Downloads */}
        <Suspense
          fallback={
            <div
              style={{
                aspectRatio: "16/9",
                width: "100%",
                background: "var(--surface)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ textAlign: "center", opacity: 0.7 }}>
                <p style={{ fontSize: "1.1rem", fontWeight: 500 }}>
                  Loading player stream...
                </p>
                <p
                  style={{
                    fontSize: "0.85rem",
                    marginTop: "0.5rem",
                    opacity: 0.6,
                  }}
                >
                  {title} — Stream free in HD on CineXP
                </p>
              </div>
            </div>
          }
        >
          <MediaInteractive
            id={id}
            type={type}
            imdbId={details.external_ids?.imdb_id}
            seasons={seasons}
            title={title}
            posterUrl={posterUrl}
            year={year}
            industry={industry}
          />
        </Suspense>

        {/* Ad between player and recommendations */}
        {adSettings.postersEnabled && <DisplayAd placement="watch-below-player" />}

        {/* Similar / Recommended Content */}
        {similar.length > 0 && (
          <section className="cx-section" style={{ marginTop: "3rem" }}>
            <div className="cx-section-heading">
              <div>
                <p className="cx-eyebrow">Keep the feeling going</p>
                <h2>Stay a little longer.</h2>
              </div>
            </div>
            <div className="grid">
              {similar.map((item, index) => (
                <MediaCard
                  key={`${item.media_type}-${item.id}`}
                  item={item}
                  stagger={index * 0.05}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
