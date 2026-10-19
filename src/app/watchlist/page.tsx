"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VscArrowRight, VscBookmark } from "react-icons/vsc";
import { getWatchlist } from "@/lib/watchlist";
import type { HistoryItem } from "@/lib/history";
import type { TMDBMediaItem } from "@/lib/tmdb";
import MediaCard from "@/components/MediaCard";
import { PageHeading } from "@/components/PageHeading";

export default function WatchlistPage() {
  const [list, setList] = useState<HistoryItem[] | null>(null);
  useEffect(() => {
    const sync = () => setList(getWatchlist());
    sync();
    window.addEventListener("watchlistUpdated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("watchlistUpdated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return (
    <div className="container page-wrapper">
      <PageHeading
        eyebrow="Saved for a good night"
        title="Your kind of collection."
        description="All those “I need to watch that” moments, in one place. Your list is saved on this device."
      />
      {list === null ? (
        <div className="grid" aria-label="Loading your list">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              className="cx-skeleton"
              style={{ aspectRatio: "2/3" }}
              key={index}
            />
          ))}
        </div>
      ) : list.length ? (
        <>
          <div className="cx-catalog-bar">
            <span>
              {list.length} saved {list.length === 1 ? "title" : "titles"}
            </span>
            <Link href="/" className="cx-text-link">
              Discover more <VscArrowRight />
            </Link>
          </div>
          <div className="grid">
            {list.map((item) => (
              <MediaCard
                key={`${item.type}-${item.id}`}
                item={
                  {
                    ...item,
                    id: Number(item.id),
                    media_type: item.type,
                    name: item.title,
                    first_air_date: "",
                    overview: "",
                    vote_average: 0,
                    vote_count: 0,
                  } as TMDBMediaItem
                }
              />
            ))}
          </div>
        </>
      ) : (
        <div className="cx-empty">
          <VscBookmark />
          <h2>Good stories are worth saving.</h2>
          <p>
            Tap the + on any title to keep it here for later. Your next movie
            night starts with a little curiosity.
          </p>
          <Link className="cx-button" href="/">
            Find your next favorite <VscArrowRight />
          </Link>
        </div>
      )}
    </div>
  );
}
