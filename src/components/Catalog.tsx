import Link from "next/link";
import { VscArrowLeft, VscArrowRight, VscCompass } from "react-icons/vsc";
import MediaCard from "./MediaCard";
import DisplayAd from "./ads/DisplayAd";
import type { AdPlacement } from '@/lib/ad-policy';
import type { TMDBMediaItem } from "@/lib/tmdb";
import { PageHeading } from './PageHeading';

export default function Catalog({
  title,
  description,
  eyebrow = "Find your next favorite",
  items,
  active,
  ads = true,
  page,
  children,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  items: TMDBMediaItem[];
  active: string;
  ads?: boolean;
  page?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="container page-wrapper">
      <PageHeading title={title} description={description} eyebrow={eyebrow} />
      <div className="cx-catalog-bar">
        <nav className="cx-chips" aria-label="Browse categories">
          {[
            { href: "/movies", label: "Movies" },
            { href: "/tv", label: "Series" },
            { href: "/trending", label: "Trending" },
            { href: "/genres", label: "Genres" },
          ].map((link) => (
            <Link
              key={link.href}
              className="cx-chip"
              href={link.href}
              aria-current={active === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <span>
          {items.length
            ? `${items.length} titles${page ? ` · Page ${page}` : ""}`
            : "A world to discover"}
        </span>
      </div>
      {children}
      {items.length ? (
        <>
          <div className="grid">
            {items.slice(0, 12).map((item) => (
              <MediaCard key={`${item.media_type}-${item.id}`} item={item} />
            ))}
          </div>
          {ads && items.length >= 6 && <DisplayAd placement={({ '/movies': 'catalog-movies', '/tv': 'catalog-series', '/trending': 'catalog-trending', '/genres': 'catalog-genre' } as Record<string, AdPlacement>)[active]} />}
          {items.length > 12 && (
            <div className="grid" style={{ marginTop: ads ? 0 : 28 }}>
              {items.slice(12).map((item) => (
                <MediaCard key={`${item.media_type}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="cx-empty">
          <VscCompass />
          <h2>A brief intermission.</h2>
          <p>
            We couldn’t load these titles right now. Please try again in a
            moment, or explore another collection.
          </p>
          <Link className="cx-button cx-button--secondary" href="/genres">
            Explore genres <VscArrowRight />
          </Link>
        </div>
      )}
      {page && (
        <nav className="cx-pagination" aria-label="Catalog pages">
          {page > 1 ? (
            <Link
              className="cx-button cx-button--secondary"
              href={`${active}?page=${page - 1}`}
            >
              <VscArrowLeft /> Previous
            </Link>
          ) : (
            <span />
          )}
          {items.length >= 20 && page < 500 && (
            <Link
              className="cx-button cx-button--secondary"
              href={`${active}?page=${page + 1}`}
            >
              Next page <VscArrowRight />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
