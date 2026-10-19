import { Suspense } from "react";
import type { Metadata } from "next";
import SearchClient from "@/components/SearchClient";

export const metadata: Metadata = {
  title: "Search",
  description: "Find your next favorite movie or series on CineXP.",
};
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container page-wrapper">
          <div
            className="cx-skeleton"
            style={{ height: 200 }}
            aria-label="Loading search"
          />
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
