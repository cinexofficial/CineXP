import { HistoryItem } from "./history";

const WATCHLIST_KEY = "cinexp_watchlist";

export function getWatchlist(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const listStr = localStorage.getItem(WATCHLIST_KEY);
    return listStr ? JSON.parse(listStr) : [];
  } catch (err) {
    console.error("Failed to parse watchlist:", err);
    return [];
  }
}

export function addToWatchlist(item: Omit<HistoryItem, "timestamp">) {
  if (typeof window === "undefined") return;
  try {
    const list = getWatchlist();
    // Don't add if already exists
    if (
      !list.some(
        (i) => String(i.id) === String(item.id) && i.type === item.type,
      )
    ) {
      list.unshift({ ...item, timestamp: Date.now() });
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event("watchlistUpdated"));
    }
  } catch (err) {
    console.error("Failed to add to watchlist:", err);
  }
}

export function removeFromWatchlist(
  id: string | number,
  type?: "movie" | "tv",
) {
  if (typeof window === "undefined") return;
  try {
    let list = getWatchlist();
    list = list.filter(
      (i) =>
        String(i.id) !== String(id) || (type !== undefined && i.type !== type),
    );
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("watchlistUpdated"));
  } catch (err) {
    console.error("Failed to remove from watchlist:", err);
  }
}

export function isInWatchlist(
  id: string | number,
  type?: "movie" | "tv",
): boolean {
  if (typeof window === "undefined") return false;
  const list = getWatchlist();
  return list.some(
    (i) =>
      String(i.id) === String(id) && (type === undefined || i.type === type),
  );
}
