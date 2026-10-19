"use client";

import Image from 'next/image';
import { useState } from "react";
import Link from "next/link";
import { VscPlay, VscStarFull } from "react-icons/vsc";
import { GENRE_MAP, getImageUrl, type TMDBMediaItem } from "@/lib/tmdb";
import { generateSlug } from "@/lib/utils";
import ContextMenu from "./ui/ContextMenu";
import useLongPress from "@/hooks/useLongPress";
import WatchlistButton from "./WatchlistButton";

interface Props {
  item: TMDBMediaItem;
  stagger?: number;
  showRemoveHistory?: boolean;
  priority?: boolean;
}

export default function MediaCard({
  item,
  showRemoveHistory = false,
  priority = false,
}: Props) {
  const type: "movie" | "tv" = item.media_type === "tv" ? "tv" : "movie";
  const title = ("title" in item ? item.title : item.name) || "Untitled";
  const year = (
    ("release_date" in item ? item.release_date : item.first_air_date) || ""
  ).slice(0, 4);
  const genre = item.genres?.[0]?.name || GENRE_MAP[item.genre_ids?.[0] ?? 0];
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const longPressProps = useLongPress(point => setContextMenu({ x: point.clientX, y: point.clientY }));

  const historyItem = {
    id: item.id,
    type,
    title,
    poster_path: item.poster_path || null,
    backdrop_path: item.backdrop_path || null,
  };
  const href = `/media/${type}/${generateSlug(item.id, title)}${item.preferredStream ? `?stream=${encodeURIComponent(item.preferredStream)}` : ""}`;

  return (
    <article
      className="cx-poster"
      onContextMenu={(event) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY });
      }}
      {...longPressProps}
    >
      <Link
        href={href}
        className="cx-poster-link"
      >
        <div className="cx-poster-art">
          {item.poster_path ? (
            <Image
              src={getImageUrl(item.poster_path, "w342")}
              alt=""
              sizes="(max-width: 600px) 50vw, (max-width: 1150px) 25vw, 16vw"
              width={342}
              height={513}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          ) : (
            <div className="placeholder">{title}</div>
          )}
          <span className="cx-poster-tag">
            {type === "tv" ? "Series" : "Movie"}
          </span>
          {item.vote_average > 0 && (
            <span className="cx-poster-rating">
              <VscStarFull aria-hidden="true" />
              {item.vote_average.toFixed(1)}
              <span className="sr-only"> out of 10 on TMDB</span>
            </span>
          )}
          <span className="cx-poster-play" aria-hidden="true">
            <VscPlay size={24} />
          </span>
        </div>
        <div className="cx-poster-info">
          <h3>{title}</h3>
          <p>
            {year && <span>{year}</span>}
            <span>{genre || (type === "tv" ? "TV series" : "Movie")}</span>
          </p>
        </div>
      </Link>
      <WatchlistButton item={historyItem} iconOnly />
      <ContextMenu
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        isOpen={!!contextMenu}
        onClose={() => setContextMenu(null)}
        showRemoveHistory={showRemoveHistory}
        item={historyItem}
      />
    </article>
  );
}
