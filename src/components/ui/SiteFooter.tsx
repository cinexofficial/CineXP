"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./Navbar";
import InstallPWA from "./InstallPWA";

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname === "/feed") return null;
  return (
    <footer className="cx-footer">
      <div className="container cx-footer-inner">
        <div className="cx-footer-brand">
          <Link href="/" aria-label="CineXP home">
            <Wordmark />
          </Link>
          <p>
            A world of stories. Your next favorite.
            <br />
            Made for the love of cinema.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/movies">Movies</Link>
          <Link href="/tv">Series</Link>
          <Link href="/genres">Explore genres</Link>
          <Link href="/watchlist">My list</Link>
          <InstallPWA />
        </nav>
      </div>
    </footer>
  );
}
