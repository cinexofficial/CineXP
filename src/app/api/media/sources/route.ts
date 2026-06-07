import { NextRequest, NextResponse } from "next/server";
import { searchMovies, extractShortlinks } from "@/lib/scraper";
import { prisma } from "@/lib/admin";

const CACHE_TTL_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const title = searchParams.get('title');
    const year = searchParams.get('year') || "";
    const type = searchParams.get('type') || "movie"; // "movie" or "tv"
    const industry = searchParams.get('industry') || "hollywood"; // "bollywood" or "hollywood"
    const season = searchParams.get('season') || undefined;
    const seasons = searchParams.get('seasons') || undefined;
    const tmdbId = searchParams.get('tmdbId');

    if (!title) {
        return NextResponse.json({ error: "Missing title parameter" }, { status: 400 });
    }

    try {
        const targetDomain = industry.toLowerCase() === 'bollywood' ? 'moviesleech.bar' : 'moviesmod.army';
        const parsedTmdbId = tmdbId ? parseInt(tmdbId) : null;

        // ── CACHE CHECK ──────────────────────────────────────────────
        if (parsedTmdbId) {
            const cachedLinks = await getCachedLinks(parsedTmdbId, type, industry, seasons, season);
            if (cachedLinks) {
                console.log(`[ScraperCache] HIT for tmdbId=${parsedTmdbId} type=${type} industry=${industry}`);
                return NextResponse.json({ success: true, links: cachedLinks, cached: true });
            }
            console.log(`[ScraperCache] MISS for tmdbId=${parsedTmdbId} type=${type} industry=${industry}`);
        }

        // ── SCRAPE (cache miss) ──────────────────────────────────────
        console.log(`[CineXP Pipeline] Starting search for ${title} ${year} on ${targetDomain}`);
        
        let allLinks: any[] = [];
        
        if (type === 'tv' && seasons) {
            // seasons can be "1:2018,2:2020,3:2024" (season:year pairs) or just "1,2,3"
            const seasonEntries = seasons.split(',').map(entry => {
                if (entry.includes(':')) {
                    const [s, y] = entry.split(':');
                    return { season: s, year: y };
                }
                return { season: entry, year };
            });
            console.log(`[CineXP Pipeline] Scraping multiple seasons:`, seasonEntries.map(e => `S${e.season}(${e.year})`).join(', '));
            
            if (targetDomain === 'moviesmod.army') {
                let postUrl = await searchMovies(title, year, 'tv', 'moviesmod.army');
                if (!postUrl) {
                    // Fallback: try moviesleech per-season if moviesmod search fails entirely
                    console.log(`[CineXP Pipeline] Moviesmod search failed, falling back to moviesleech per-season...`);
                    const results = await Promise.all(seasonEntries.map(async ({ season: s, year: seasonYear }) => {
                        const leechUrl = await searchMovies(title, seasonYear, 'tv', 'moviesleech.bar', s);
                        if (leechUrl) return processPost(leechUrl, 'tv', title, Number(s), parsedTmdbId, industry);
                        return [];
                    }));
                    allLinks = results.flat();
                } else {
                    // Found the multi-season page — extract each season's links from the same page
                    const results = await Promise.all(seasonEntries.map(async ({ season: s }) => {
                        return processPost(postUrl!, 'tv', title, Number(s), parsedTmdbId, industry);
                    }));
                    allLinks = results.flat();
                }
            } else {
                // MoviesLeech: each season has its OWN page with a unique URL. Search per-season.
                const results = await Promise.all(seasonEntries.map(async ({ season: s, year: seasonYear }) => {
                    let postUrl = await searchMovies(title, seasonYear, type as any, targetDomain, s);
                    if (!postUrl) {
                        const altDomain = 'moviesmod.army';
                        postUrl = await searchMovies(title, seasonYear, type as any, altDomain, s);
                    }
                    if (postUrl) {
                        return processPost(postUrl, type as any, title, Number(s), parsedTmdbId, industry);
                    }
                    return [];
                }));
                allLinks = results.flat();
            }
        } else {
            let postUrl = await searchMovies(title, year, type as any, targetDomain, season);

            if (!postUrl) {
                // Fallback: If Hollywood fails, try Bollywood domain just in case (or vice versa)
                console.log(`[CineXP Pipeline] Search failed on ${targetDomain}. Trying alternative...`);
                const altDomain = targetDomain === 'moviesmod.army' ? 'moviesleech.bar' : 'moviesmod.army';
                postUrl = await searchMovies(title, year, type as any, altDomain, season);
            }
            if (postUrl) {
                allLinks = await processPost(postUrl, type as any, title, season ? Number(season) : undefined, parsedTmdbId, industry);
            }
        }

        if (allLinks.length === 0) {
            return NextResponse.json({ error: "Cloudflare protection or Source not found on target domains." }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            links: allLinks
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
    }
}

// ── CACHE HELPERS ────────────────────────────────────────────────────

async function getCachedLinks(
    tmdbId: number,
    type: string,
    industry: string,
    seasons?: string,
    singleSeason?: string
): Promise<any[] | null> {
    try {
        if (type === 'tv' && seasons) {
            // Multi-season: check cache for each season
            const seasonNumbers = seasons.split(',').map(entry => {
                const s = entry.includes(':') ? entry.split(':')[0] : entry;
                return parseInt(s);
            });

            const cached = await prisma.scraperCache.findMany({
                where: {
                    tmdbId,
                    type,
                    industry,
                    season: { in: seasonNumbers }
                }
            });

            // ALL seasons must be cached and fresh for a hit
            const freshEntries = cached.filter(c => Date.now() - c.updatedAt.getTime() < CACHE_TTL_MS);
            if (freshEntries.length !== seasonNumbers.length) return null;

            // Rebuild the response from cached JSON
            return freshEntries.flatMap(entry => {
                const rawLinks: { label: string; url: string }[] = JSON.parse(entry.linksJson);
                return buildResponseLinks(rawLinks, entry.postUrl, entry.season);
            });
        } else {
            // Single movie or single season
            const seasonNum = singleSeason ? parseInt(singleSeason) : null;
            const cached = await prisma.scraperCache.findFirst({
                where: {
                    tmdbId,
                    type,
                    season: seasonNum,
                    industry
                }
            });

            if (!cached) return null;
            if (Date.now() - cached.updatedAt.getTime() > CACHE_TTL_MS) return null;

            const rawLinks: { label: string; url: string }[] = JSON.parse(cached.linksJson);
            return buildResponseLinks(rawLinks, cached.postUrl, cached.season);
        }
    } catch (err) {
        console.error('[ScraperCache] Read error:', err);
        return null;
    }
}

async function saveCacheEntry(
    tmdbId: number,
    type: string,
    season: number | null,
    industry: string,
    postUrl: string,
    rawLinks: { label: string; url: string }[]
) {
    try {
        const existing = await prisma.scraperCache.findFirst({
            where: { tmdbId, type, season, industry }
        });

        if (existing) {
            await prisma.scraperCache.update({
                where: { id: existing.id },
                data: {
                    linksJson: JSON.stringify(rawLinks),
                    postUrl,
                    updatedAt: new Date()
                }
            });
        } else {
            await prisma.scraperCache.create({
                data: {
                    tmdbId,
                    type,
                    season,
                    industry,
                    linksJson: JSON.stringify(rawLinks),
                    postUrl
                }
            });
        }
        console.log(`[ScraperCache] SAVED tmdbId=${tmdbId} type=${type} season=${season} industry=${industry} (${rawLinks.length} links)`);
    } catch (err) {
        console.error('[ScraperCache] Write error:', err);
    }
}

function buildResponseLinks(
    rawLinks: { label: string; url: string }[],
    postUrl: string,
    season: number | null | undefined
): any[] {
    // Reconstruct the title from the postUrl for filename generation
    const titleSlug = postUrl.split('/').filter(Boolean).pop() || 'CineXP-Download';
    const safeTitleBase = titleSlug.replace(/-/g, ' ').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-');

    return rawLinks.map(link => {
        const cleanLabel = link.label.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
        const finalFilename = `${safeTitleBase}-${cleanLabel}_CineXP.mkv`;
        return {
            label: link.label,
            proxyDownloadUrl: `/api/media/resolve?url=${encodeURIComponent(link.url)}&filename=${encodeURIComponent(finalFilename)}`,
            season: season ?? undefined
        };
    });
}

// ── SCRAPE + CACHE PIPELINE ──────────────────────────────────────────

async function processPost(
    postUrl: string,
    type: 'movie' | 'tv',
    movieTitle: string,
    season?: number,
    tmdbId?: number | null,
    industry?: string
) {
    console.log(`[CineXP Pipeline] Post URL found: ${postUrl}. Extracting shortlinks...`);
    const shortLinks = await extractShortlinks(postUrl, type, season);
    
    if (shortLinks.length === 0) {
        return [];
    }

    // Save raw shortlinks to cache if we have a tmdbId
    if (tmdbId && industry) {
        const rawLinks = shortLinks.map(link => ({
            label: link.label,
            url: link.url
        }));
        await saveCacheEntry(tmdbId, type, season ?? null, industry, postUrl, rawLinks);
    }

    // Build the response (same format as before)
    const safeTitleBase = movieTitle.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-');
    return shortLinks.map(link => {
        const cleanLabel = link.label.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
        const finalFilename = `${safeTitleBase}-${cleanLabel}_CineXP.mkv`;
        return {
            label: link.label,
            // The URL directly triggers the resolver logic.
            proxyDownloadUrl: `/api/media/resolve?url=${encodeURIComponent(link.url)}&filename=${encodeURIComponent(finalFilename)}`,
            season: season
        };
    });
}
