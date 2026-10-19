"use client";

import Image from 'next/image';
import { useEffect, useState } from "react";
import Link from "next/link";
import { VscClose, VscPlay } from "react-icons/vsc";
import {
  getWatchHistory,
  removeFromWatchHistory,
  type HistoryItem,
} from "@/lib/history";
import { getInitialSync } from "@/lib/progressManager";
import { getImageUrl } from "@/lib/tmdb";
import { generateSlug } from "@/lib/utils";

type ResumeItem = HistoryItem & { progress: number | null };
export default function ContinueWatchingRow({
  title = "Pick up where you left off.",
}: {
  title?: string;
}) {
  const [items, setItems] = useState<ResumeItem[]>([]);
  useEffect(() => {
    const sync = () =>
      setItems(
        getWatchHistory().map((item) => {
          const progress = getInitialSync(String(item.id), item.type);
          return {
            ...item,
            progress:
              progress && progress.duration > 0
                ? Math.min(100, (progress.time / progress.duration) * 100)
                : null,
          };
        }),
      );
    sync();
    window.addEventListener("historyUpdated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("historyUpdated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  if (!items.length) return null;
  return (
    <section className="cx-section">
      <div className="cx-section-heading">
        <div>
          <p className="cx-eyebrow">Your unfinished stories</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="cx-resume-row">
        {items.map((item) => (
          <article className="cx-resume-card" key={`${item.type}-${item.id}`}>
            <Link
              href={`/media/${item.type}/${generateSlug(item.id, item.title)}`}
            >
              <div className="cx-resume-art">
                {(item.backdrop_path || item.poster_path) && (
                  <Image
                    fill
                      sizes="(max-width: 600px) 85vw, 25vw"
                      src={getImageUrl(
                      item.backdrop_path || item.poster_path,
                      "w780",
                    )}
                    alt=""
                    loading="lazy"
                  />
                )}
                <span className="cx-resume-play">
                  <VscPlay aria-hidden="true" />
                </span>
                {item.progress !== null && (
                  <div
                    className="cx-resume-progress"
                    aria-label={`${Math.round(item.progress)} percent watched`}
                  >
                    <span style={{ width: `${item.progress}%` }} />
                  </div>
                )}
              </div>
              <div className="cx-resume-info">
                <h3>{item.title}</h3>
                <p>
                  {item.type === "tv" ? "Series" : "Movie"} · Continue watching
                </p>
              </div>
            </Link>
            <button
              className="cx-card-action"
              aria-label={`Remove ${item.title} from continue watching`}
              onClick={() => removeFromWatchHistory(item.id)}
            >
              <VscClose />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
