import { randomInt } from 'node:crypto';
import { getMoreReels } from "@/lib/reels";
import TrailerFeedClient from "@/components/TrailerFeedClient";
import type { Metadata } from 'next';
import Link from 'next/link';
import { VscPlayCircle } from 'react-icons/vsc';
import { PageHeading } from '@/components/PageHeading';

export const revalidate = 0; // Dynamic for randomness

export const metadata: Metadata = {
  title: 'Reels | CineXP',
  description: 'TikTok-style infinite scroll for movie clips and trailers.',
};

export default async function FeedPage() {
  const randomPage = randomInt(1, 21);
  const initialReels = await getMoreReels(randomPage);

  if (!initialReels.length) {
    return <div className="container page-wrapper"><PageHeading eyebrow="A little inspiration" title="Find your next obsession." description="A fresh perspective on the films and series waiting to be discovered." /><div className="cx-empty"><VscPlayCircle /><h2>A brief intermission.</h2><p>Trailers aren’t available right now. There are still plenty of stories to explore.</p><Link href="/movies" className="cx-button">Explore movies</Link></div></div>;
  }

  return (
    <div className="cx-feed">
      <TrailerFeedClient initialReels={initialReels} initialPage={randomPage} />
    </div>
  );
}

