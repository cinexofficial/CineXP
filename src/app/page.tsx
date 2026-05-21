import { getTrending, getMediaById, getUpcomingMovies, type TMDBMediaItem, type TMDBMovie } from "@/lib/tmdb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "CineXP — Watch Free Movies & TV Shows Online in HD"
  },
  description: "Stream the latest movies and trending TV shows free in HD. No sign-up required. Watch online now.",
  openGraph: {
    title: "CineXP — Watch Free Movies & TV Shows Online in HD",
    description: "Stream the latest movies and trending TV shows free in HD.",
    images: [{ url: "https://www.cinexp.site/og-rect-v2.png", width: 1200, height: 630 }]
  },
  alternates: { canonical: "https://www.cinexp.site" }
};

export const revalidate = 3600;
import MediaCard from "@/components/MediaCard";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import RecommendedRow from "@/components/RecommendedRow";
import Top10Row from "@/components/ui/Top10Row";
import CountdownRow from "@/components/CountdownRow";
import AdSlot from "@/components/ads/AdSlot";
import { prisma } from "@/lib/admin";



interface SectionItem {
  tmdbId: number
  mediaType: string
  position: number
  preferredStream?: string | null
}

interface Section {
  key: string
  title: string
  type: string
  order: number
  visible: boolean
  autoFill: boolean
  maxItems: number
  items: SectionItem[]
}

const DEFAULT_SECTION_CONFIG = [
  { key: 'continue_watching', title: 'Continue Watching', type: 'continue_watching', order: 0 },
  { key: 'top_10', title: 'Top 10 in India Today', type: 'top10', order: 1 },
  { key: 'trending', title: 'Trending Now', type: 'trending', order: 2 },
  { key: 'recommended', title: 'Recommended for You', type: 'recommended', order: 3 },
];

export default async function HomePage() {
  let dbSections: Section[] = [];
  try {
    const raw = await prisma.homeSection.findMany({
      where: { visible: true },
      orderBy: { order: 'asc' },
      include: { items: { orderBy: { position: 'asc' } } }
    });
    dbSections = raw as unknown as Section[];
  } catch (e) {
    console.error('Failed to fetch home sections:', e);
  }

  const sections: Section[] = dbSections.length > 0
    ? dbSections
    : DEFAULT_SECTION_CONFIG.map(s => ({
        ...s, visible: true, autoFill: true,
        maxItems: s.type === 'top10' ? 10 : 6, items: []
      }));

  // Collect ALL admin-selected tmdbIds across ALL sections
  const allAdminItems: { tmdbId: number; mediaType: string; preferredStream?: string | null }[] = [];
  sections.forEach(s => s.items.forEach(item => {
    allAdminItems.push({ tmdbId: item.tmdbId, mediaType: item.mediaType, preferredStream: item.preferredStream });
  }));

  // Check if we need upcoming movies
  const needsUpcoming = sections.some(s => s.type === 'countdown' && s.visible);

  // Fetch trending + upcoming + resolve all admin picks in parallel
  const [trending, upcoming, ...resolvedAdminItems] = await Promise.all([
    getTrending('IN'),
    needsUpcoming ? getUpcomingMovies('IN') : Promise.resolve([]),
    ...allAdminItems.map(a => getMediaById(a.tmdbId, a.mediaType))
  ]);

  // Build lookup: tmdbId -> TMDBMediaItem
  const tmdbLookup = new Map<number, TMDBMediaItem>();
  trending.forEach(item => tmdbLookup.set(item.id, item));
  resolvedAdminItems.forEach((item, index) => {
    if (item) {
      item.preferredStream = allAdminItems[index].preferredStream;
      tmdbLookup.set(item.id, item);
    }
  });

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div className="page-wrapper container" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", padding: "5rem 0 7rem", position: "relative" }}>


          <h1
            style={{
              fontSize: "clamp(3.5rem, 9vw, 7rem)",
              fontWeight: 800,
              background: "linear-gradient(135deg, #ffffff 10%, #ecd3ff 40%, var(--primary) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0px 10px 25px rgba(157, 0, 255, 0.4))",
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              margin: 0
            }}
          >
            Welcome to CineXP!
          </h1>
        </div>

        {sections.map((section, sectionIndex) => {
          if (!section.visible) return null;

          const sectionContent = (() => {
            if (section.type === 'continue_watching') {
              return <ContinueWatchingRow key={section.key} />;
            }

            if (section.type === 'top10') {
              return (
                <Top10Section
                  key={section.key}
                  section={section}
                  tmdbLookup={tmdbLookup}
                  trendingData={trending}
                />
              );
            }


            // Coming Soon — horizontal slider with countdown overlays
            if (section.type === 'countdown') {
              return (
                <ComingSoonSection
                  key={section.key}
                  section={section}
                  tmdbLookup={tmdbLookup}
                  upcomingData={upcoming as TMDBMovie[]}
                />
              );
            }

            if (section.type === 'recommended') {
              return <RecommendedRow key={section.key} />;
            }

            // ALL other types (trending, latest, custom) — grid with visible limit
            return (
              <GridSection
                key={section.key}
                section={section}
                tmdbLookup={tmdbLookup}
                trendingData={trending}
              />
            );
          })();

          return (
            <div key={section.key}>
              {sectionContent}
              {/* Compact 320x50 banner ad after Top 10 */}
              {sectionIndex === 1 && <AdSlot variant="slim" />}
              {/* Square banner ad after Trending */}
              {sectionIndex === 2 && <AdSlot variant="banner" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Top 10 Section ──────────────────────────────────────────────

function Top10Section({ section, tmdbLookup, trendingData }: {
  section: Section
  tmdbLookup: Map<number, TMDBMediaItem>
  trendingData: TMDBMediaItem[]
}) {
  const limit = section.maxItems || 10;
  const finalItems: TMDBMediaItem[] = [];
  const usedIds = new Set<number>();

  for (const adminItem of section.items) {
    if (finalItems.length >= limit) break;
    const resolved = tmdbLookup.get(adminItem.tmdbId);
    if (resolved) { finalItems.push(resolved); usedIds.add(resolved.id); }
  }

  // Fill remaining up to maxItems from trending
  if (section.autoFill) {
    for (const item of trendingData) {
      if (finalItems.length >= limit) break;
      if (!usedIds.has(item.id)) { finalItems.push(item); usedIds.add(item.id); }
    }
  }

  if (finalItems.length === 0) return null;
  return <Top10Row items={finalItems} title={section.title} maxItems={limit} />;
}

// ─── Coming Soon Section (horizontal slider like Top 10) ─────────

function ComingSoonSection({ section, tmdbLookup, upcomingData }: {
  section: Section
  tmdbLookup: Map<number, TMDBMediaItem>
  upcomingData: TMDBMovie[]
}) {
  const adminPicks: TMDBMovie[] = [];
  const usedIds = new Set<number>();

  // Admin picks first
  for (const adminItem of section.items) {
    const resolved = tmdbLookup.get(adminItem.tmdbId);
    if (resolved) {
      adminPicks.push(resolved as unknown as TMDBMovie);
      usedIds.add(resolved.id);
    }
  }

  // Auto-fill with TMDB upcoming (skip dupes), up to maxItems
  const limit = section.maxItems || 10;
  const allItems = [...adminPicks];
  if (section.autoFill) {
    for (const item of upcomingData) {
      if (allItems.length >= limit) break;
      if (!usedIds.has(item.id)) {
        allItems.push(item);
        usedIds.add(item.id);
      }
    }
  }

  if (allItems.length === 0) return null;

  // Use the existing CountdownRow component (already has horizontal layout + countdown overlays)
  return <CountdownRow upcoming={allItems} />;
}

// ─── Grid Section (trending, latest, custom) ─────────────────────

const SECTION_ICONS: Record<string, string> = {
  trending: '🔥',
  latest: '✨',
  custom: '🎬',
};

function GridSection({ section, tmdbLookup, trendingData }: {
  section: Section
  tmdbLookup: Map<number, TMDBMediaItem>
  trendingData: TMDBMediaItem[]
}) {
  const finalItems: TMDBMediaItem[] = [];
  const usedIds = new Set<number>();

  // Admin picks first
  for (const adminItem of section.items) {
    const resolved = tmdbLookup.get(adminItem.tmdbId);
    if (resolved) { finalItems.push(resolved); usedIds.add(resolved.id); }
  }

  // Auto-fill with trending (skip dupes), up to maxItems
  const limit = section.maxItems || 6;
  if (section.autoFill) {
    for (const item of trendingData) {
      if (finalItems.length >= limit) break;
      if (usedIds.has(item.id)) continue;
      finalItems.push(item);
      usedIds.add(item.id);
    }
  }

  if (finalItems.length === 0) return null;

  // Apply visible limit (maxItems controls how many are shown on the site)
  const visibleItems = finalItems.slice(0, section.maxItems);
  const icon = SECTION_ICONS[section.type] || '🎬';

  return (
    <section style={{ marginBottom: '4rem' }}>
      <h2 style={{ fontSize: "1.6rem", fontWeight: 600, marginBottom: "1.5rem" }}>
        <span style={{ color: "var(--primary)" }}>{icon}</span> {section.title}
      </h2>
      <div className="grid">
        {visibleItems.map((item: TMDBMediaItem, index: number) => (
          <MediaCard
            key={`${item.media_type}-${item.id}`}
            item={item}
            stagger={index % 6 * 0.05}
          />
        ))}
      </div>
    </section>
  );
}
