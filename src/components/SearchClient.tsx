"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { VscArrowRight, VscClose, VscSearch } from "react-icons/vsc";
import MediaCard from "./MediaCard";
import { PageHeading } from "./PageHeading";
import type { TMDBMediaItem } from "@/lib/tmdb";

type Result = { query: string; items: TMDBMediaItem[]; error: boolean };
export default function SearchClient() {
  const params = useSearchParams();
  return (
    <SearchResults
      key={params.get("q") || ""}
      initialQuery={params.get("q") || ""}
    />
  );
}

function SearchResults({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<Result>({
    query: "",
    items: [],
    error: false,
  });
  const [attempt, setAttempt] = useState(0);
  const trimmed = query.trim();
  const loading = !!trimmed && result.query !== trimmed;
  useEffect(() => {
    if (!trimmed) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/tmdb/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Search unavailable");
        const data = await response.json();
        if (!controller.signal.aborted)
          setResult({
            query: trimmed,
            items: data.results || [],
            error: false,
          });
      } catch {
        if (!controller.signal.aborted)
          setResult({ query: trimmed, items: [], error: true });
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, attempt]);

  return (
    <div className="container page-wrapper">
      <PageHeading
        eyebrow="A little curiosity goes a long way"
        title="What are you looking for?"
        description="A favorite film, a new series, or that title you can almost remember."
      />
      <form action="/search" role="search" aria-label="Search the full catalog" className="cx-search-field">
        <VscSearch aria-hidden="true" />
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search movies and series…"
          aria-label="Search movies and series"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="cx-icon-button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <VscClose />
          </button>
        )}
      </form>
      {!trimmed ? (
        <section>
          <div className="cx-section-heading">
            <h2>Start with a story you love.</h2>
          </div>
          <div className="cx-chips">
            {["Interstellar", "Dune", "The Bear", "Severance"].map((title) => (
              <Link
                className="cx-chip"
                key={title}
                href={`/search?q=${encodeURIComponent(title)}`}
              >
                {title}
                <VscArrowRight />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <>
          <p className="sr-only" role="status">
            {loading
              ? "Searching"
              : result.error
                ? "Search unavailable"
                : `${result.items.length} results for ${trimmed}`}
          </p>
          {loading ? (
            <div className="grid" aria-label="Loading results" aria-busy="true">
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  className="cx-skeleton"
                  style={{ aspectRatio: "2/3" }}
                  key={index}
                />
              ))}
            </div>
          ) : result.error ? (
            <div className="cx-empty">
              <VscSearch />
              <h2>A brief intermission.</h2>
              <p>Search couldn’t connect. Try again in a moment.</p>
              <button
                className="cx-button"
                onClick={() => {
                  setResult({ query: "", items: [], error: false });
                  setAttempt(attempt + 1);
                }}
              >
                Try again
              </button>
            </div>
          ) : result.items.length ? (
            <>
              <div className="cx-section-heading">
                <h2>Results for “{trimmed}”</h2>
                <span className="cx-text-link">
                  {result.items.length} titles
                </span>
              </div>
              <div className="grid">
                {result.items.map((item) => (
                  <MediaCard
                    item={item}
                    key={`${item.media_type}-${item.id}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="cx-empty">
              <VscSearch />
              <h2>No plot twist here.</h2>
              <p>
                We couldn’t find “{trimmed}”. Try another title or check the
                spelling.
              </p>
              <Link className="cx-button cx-button--secondary" href="/genres">
                Explore genres <VscArrowRight />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
