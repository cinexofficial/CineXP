"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { VscArrowLeft, VscArrowRight } from "react-icons/vsc";
import type { TMDBMediaItem } from "@/lib/tmdb";
import MediaCard from "../MediaCard";

export default function Top10Row({
  items,
  title = "The titles everyone’s talking about.",
  maxItems = 10,
}: {
  items: TMDBMediaItem[];
  title?: string;
  maxItems?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const displayItems = items.slice(0, maxItems);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () =>
      setEdges({
        start: el.scrollLeft < 8,
        end: el.scrollWidth - el.clientWidth - el.scrollLeft < 8,
      });
    const observer = new ResizeObserver(check);
    observer.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    check();
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, [items.length]);
  const scroll = (direction: number) => {
    const el = scrollRef.current;
    el?.scrollBy({
      left: direction * el.clientWidth * 0.8,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  if (!displayItems.length) return null;
  return (
    <section className="cx-section">
      <div className="cx-section-heading">
        <div>
          <p className="cx-eyebrow">
            The top {Math.min(maxItems, items.length)}
          </p>
          <h2>{title}</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link className="cx-text-link" href="/trending">
            View all <VscArrowRight />
          </Link>
          <button
            className="cx-icon-button"
            onClick={() => scroll(-1)}
            disabled={edges.start}
            aria-label="Scroll top titles left"
          >
            <VscArrowLeft />
          </button>
          <button
            className="cx-icon-button"
            onClick={() => scroll(1)}
            disabled={edges.end}
            aria-label="Scroll top titles right"
          >
            <VscArrowRight />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="cx-rank-row">
        {displayItems.map((item, index) => (
          <div className="cx-rank-item" key={`${item.media_type}-${item.id}`}>
            <span className="cx-rank-number" aria-hidden="true">
              {index + 1}
            </span>
            <MediaCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
