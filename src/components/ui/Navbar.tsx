"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  VscBookmark,
  VscClose,
  VscHome,
  VscMenu,
  VscPlay,
  VscPlayCircle,
  VscSearch,
  VscSymbolClass,
  VscWand,
} from "react-icons/vsc";
import RandomizerModal from "./RandomizerModal";

const links = [
  { href: "/", label: "Discover", icon: VscHome },
  { href: "/movies", label: "Movies", icon: VscPlayCircle },
  { href: "/tv", label: "Series", icon: VscSymbolClass },
  { href: "/feed", label: "Trailers", icon: VscPlay },
];
type RandomPick = {
  url: string;
  title: string;
  poster_path: string | null;
  media_type: string;
  id: number;
};

export function Wordmark() {
  return (
    <span className="cx-wordmark">
      <span className="cx-brand-symbol">
        <VscPlay aria-hidden="true" />
      </span>
      <span>
        Cine<span>XP</span>
      </span>
    </span>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const browseButtonRef = useRef<HTMLButtonElement>(null);
  const menuOpenerRef = useRef<HTMLButtonElement>(null);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const [randomOpen, setRandomOpen] = useState(false);
  const [randomItem, setRandomItem] = useState<RandomPick | null>(null);
  const [randomLoading, setRandomLoading] = useState(false);
  const [randomError, setRandomError] = useState("");
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "Escape" && menuOpen) {
        setMenuPath(null);
        (menuOpenerRef.current || menuButtonRef.current)?.focus();
      }
      if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
        !target.isContentEditable &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        if (window.innerWidth > 850) searchRef.current?.focus();
        else router.push("/search");
      }
    };
    const onOutside = (event: PointerEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !menuButtonRef.current?.contains(event.target as Node) &&
        !browseButtonRef.current?.contains(event.target as Node)
      )
        setMenuPath(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [isAdmin, menuOpen, router]);

  useEffect(() => { if (menuOpen) menuRef.current?.querySelector<HTMLElement>('a')?.focus(); }, [menuOpen]);

  const surprise = async () => {
    setMenuPath(null);
    setRandomOpen(true);
    setRandomLoading(true);
    setRandomError("");
    setRandomItem(null);
    try {
      const res = await fetch("/api/tmdb/random", { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error("Unavailable");
      const data = await res.json();
      if (!data.id || !data.url) throw new Error("No titles");
      setRandomItem(data);
    } catch {
      setRandomError(
        "We couldn’t find a pick just now. Try again in a moment.",
      );
    } finally {
      setRandomLoading(false);
    }
  };

  if (isAdmin) return null;
  const active = (href: string) =>
    pathname === href ||
    (href === "/movies" && pathname.startsWith("/media/movie")) ||
    (href === "/tv" && pathname.startsWith("/media/tv"));

  return (
    <>
      <header className="cx-header">
        <div className="container cx-header-inner">
          <Link href="/" aria-label="CineXP home">
            <Wordmark />
          </Link>
          <nav className="cx-desktop-nav" aria-label="Main navigation">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="cx-nav-link"
                aria-current={active(href) ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/genres"
              className="cx-nav-link"
              aria-current={pathname.startsWith("/genres") ? "page" : undefined}
            >
              Genres
            </Link>
          </nav>
          <div className="cx-header-actions">
            <form action="/search" role="search" aria-label="Quick catalog search" className="cx-header-search">
              <VscSearch aria-hidden="true" />
              <input
                ref={searchRef}
                name="q"
                aria-label="Search movies and series"
                placeholder="Find your next watch"
                type="search"
              />
              <kbd aria-hidden="true">/</kbd>
            </form>
            <Link
              href="/watchlist"
              className="cx-header-list"
              aria-current={pathname === "/watchlist" ? "page" : undefined}
            >
              <VscBookmark aria-hidden="true" /> My list
            </Link>
            <Link
              href="/search"
              className="cx-icon-button cx-mobile-search"
              aria-label="Search"
            >
              <VscSearch />
            </Link>
            <button
              ref={menuButtonRef}
              className="cx-icon-button cx-menu-trigger"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              aria-controls="cx-navigation-menu"
              onClick={event => { menuOpenerRef.current = event.currentTarget; setMenuPath(menuOpen ? null : pathname); }}
            >
              {menuOpen ? <VscClose /> : <VscMenu />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div ref={menuRef} className="cx-menu" id="cx-navigation-menu">
            <nav aria-label="Browse navigation">
              {[
                ...links,
                { href: "/genres", label: "Genres" },
                { href: "/trending", label: "Trending" },
                { href: "/watchlist", label: "My list" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuPath(null)}
                  aria-current={active(href) ? "page" : undefined}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <button
              className="cx-button cx-button--secondary"
              onClick={surprise}
            >
              <VscWand /> Surprise me
            </button>
          </div>
        )}
      </header>
      {pathname !== "/feed" && (
        <nav className="cx-mobile-nav" aria-label="Quick navigation">
          {[
            { href: '/', label: 'Home', icon: VscHome },
            { href: '/search', label: 'Search', icon: VscSearch },
            { href: "/watchlist", label: "My list", icon: VscBookmark },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                active(href) ||
                (href === "/genres" && pathname.startsWith("/genres"))
                  ? "page"
                  : undefined
              }
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
          <button ref={browseButtonRef} type="button" aria-label="Browse categories" aria-expanded={menuOpen} aria-controls="cx-navigation-menu" onClick={event => { menuOpenerRef.current = event.currentTarget; setMenuPath(menuOpen ? null : pathname); }}>
            <VscMenu aria-hidden="true" /><span>Browse</span>
          </button>
        </nav>
      )}
      <RandomizerModal
        isOpen={randomOpen}
        isLoading={randomLoading}
        item={randomItem}
        error={randomError}
        onClose={() => setRandomOpen(false)}
        onReroll={surprise}
        onConfirm={() => {
          if (randomItem) {
            router.push(randomItem.url);
            setRandomOpen(false);
          }
        }}
      />
    </>
  );
}
