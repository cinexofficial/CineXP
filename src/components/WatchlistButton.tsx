"use client";

import { useEffect, useState } from "react";
import { VscAdd, VscCheck } from "react-icons/vsc";
import {
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
} from "@/lib/watchlist";

interface Props {
  item: {
    id: string | number;
    type: "movie" | "tv";
    title: string;
    poster_path: string | null;
    backdrop_path: string | null;
  };
  iconOnly?: boolean;
}

export default function WatchlistButton({ item, iconOnly = false }: Props) {
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => {
      setSaved(isInWatchlist(item.id, item.type));
      setReady(true);
    };
    sync();
    window.addEventListener("watchlistUpdated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("watchlistUpdated", sync);
      window.removeEventListener("storage", sync);
    };
  }, [item.id, item.type]);

  return (
    <button
      type="button"
      className={iconOnly ? "cx-card-action" : "cx-button cx-button--secondary"}
      disabled={!ready}
      aria-pressed={saved}
      aria-label={`${saved && !iconOnly ? "In my list. " : ""}${saved ? "Remove" : "Save"} ${item.title} ${saved ? "from" : "to"} my list`}
      onClick={() => {
        if (saved) removeFromWatchlist(item.id, item.type);
        else addToWatchlist(item);
      }}
    >
      {saved ? <VscCheck aria-hidden="true" /> : <VscAdd aria-hidden="true" />}
      {!iconOnly && <span>{saved ? "In my list" : "My list"}</span>}
    </button>
  );
}
