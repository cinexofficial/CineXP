"use client";

import Image from 'next/image';
import { useState } from "react";
import Link from "next/link";
import {
  VscArrowLeft,
  VscArrowRight,
  VscPlay,
  VscStarFull,
} from "react-icons/vsc";
import { GENRE_MAP, getImageUrl, type TMDBMediaItem } from "@/lib/tmdb";
import { generateSlug } from "@/lib/utils";
import WatchlistButton from "./WatchlistButton";

export default function FeaturedHero({ items }: { items: TMDBMediaItem[] }) {
  const [selected, setSelected] = useState(0);
  const item = items[selected];
  if (!item)
    return (
      <section className="cx-hero">
        <div className="container cx-hero-inner">
          <div className="cx-hero-content">
            <p className="cx-eyebrow">Your next great story</p>
            <h1>
              Stay curious.
              <br />
              Get carried away.
            </h1>
            <p className="cx-hero-description">
              Big-screen adventures. One-more-episode nights. Find a story that
              stays with you.
            </p>
            <Link className="cx-button" href="/genres">
              Explore genres <VscArrowRight />
            </Link>
          </div>
        </div>
      </section>
    );
  const title = (item.title || item.name || "Untitled");
  const type = item.media_type === "tv" ? "tv" : "movie";
  const year = (
    ("release_date" in item ? item.release_date : item.first_air_date) || ""
  ).slice(0, 4);
  const genres =
    item.genres?.slice(0, 2).map((genre) => genre.name) ||
    item.genre_ids
      ?.slice(0, 2)
      .map((id) => GENRE_MAP[id])
      .filter(Boolean) ||
    [];
  const href = `/media/${type}/${generateSlug(item.id, title)}${item.preferredStream ? `?stream=${encodeURIComponent(item.preferredStream)}` : ""}`;

  return (
    <section className="cx-hero" aria-label="Featured titles">
      {item.backdrop_path && (
        <Image
          key={`art-${item.id}`}
          className="cx-hero-art"
          fill
          sizes="100vw"
          src={getImageUrl(item.backdrop_path, "w1280")}
          alt=""
          fetchPriority="high"
          loading="eager"
        />
      )}
      <div className="container cx-hero-inner">
        <div className="cx-hero-content" key={`${type}-${item.id}`}>
          <p className="cx-eyebrow">In the spotlight</p>
          <h1>{title}</h1>
          <div className="cx-meta">
            {item.vote_average > 0 && (
              <span className="cx-rating">
                <VscStarFull aria-hidden="true" />
                {item.vote_average.toFixed(1)}
                <span className="sr-only"> out of 10 on TMDB</span>
              </span>
            )}
            {year && <span>{year}</span>}
            <span>{type === "tv" ? "Series" : "Movie"}</span>
            {genres.length > 0 && <span>{genres.join(" / ")}</span>}
          </div>
          <p className="cx-hero-description">
            {item.overview ||
              "A new world to get lost in. Explore this title and find your next favorite."}
          </p>
          <div className="cx-hero-actions">
            <Link href={href} className="cx-button">
              <VscPlay aria-hidden="true" /> Explore title
            </Link>
            <WatchlistButton
              item={{
                id: item.id,
                type,
                title,
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
              }}
            />
          </div>
        </div>
      </div>
      {items.length > 1 && (
        <div className="cx-hero-bottom">
          <div className="cx-hero-pagination">
            <span className="cx-hero-count">
              <strong>{String(selected + 1).padStart(2, "0")}</strong> /{" "}
              {String(items.length).padStart(2, "0")}
            </span>
            <button
              className="cx-icon-button"
              aria-label="Previous featured title"
              onClick={() =>
                setSelected((selected - 1 + items.length) % items.length)
              }
            >
              <VscArrowLeft />
            </button>
            <button
              className="cx-icon-button"
              aria-label="Next featured title"
              onClick={() => setSelected((selected + 1) % items.length)}
            >
              <VscArrowRight />
            </button>
          </div>
          <div className="cx-hero-picks" aria-label="Choose a featured title">
            {items.map((pick, index) => (
              <button
                key={`${pick.media_type}-${pick.id}`}
                className="cx-hero-pick"
                aria-pressed={index === selected}
                aria-label={`Feature ${"title" in pick ? pick.title : pick.name}`}
                onClick={() => setSelected(index)}
              >
                {pick.backdrop_path && (
                  <Image
                    src={getImageUrl(pick.backdrop_path, "w300")}
                      fill
                      sizes="126px"
                    alt=""
                    loading="lazy"
                  />
                )}
                <span>{"title" in pick ? pick.title : pick.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
