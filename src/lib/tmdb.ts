// Server-side TMDB library — runs on Next.js server, never in the browser.
// Uses api.tmdb.org (short domain) which is NOT blocked in India.

const TMDB_BASE = 'https://api.tmdb.org/3'
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

export function getApiKey() {
  return process.env.TMDB_API_KEY || ''
}

export function getImageUrl(path: string | null | undefined, size = 'w500'): string {
  if (!path) return ''
  // Direct TMDB image URL --- Googlebot-friendly, no proxy dependency
  return `https://image.tmdb.org/t/p/${size}${path}`
}

// Client-side fallback: wsrv.nl proxy (for Indian ISP compatibility)
export function getClientImageUrl(path: string | null | undefined, size = 'w500'): string {
  if (!path) return ''
  const tmdbUrl = `image.tmdb.org/t/p/${size}${path}`
  return `https://wsrv.nl/?url=${encodeURIComponent(tmdbUrl)}&output=webp&q=65`
}

export function getBackdropUrl(path: string | null | undefined): string {
  return getImageUrl(path, 'w1280')
}

interface CatalogFields {
  title?: string;
  name?: string;
  original_title?: string;
  original_language?: string;
  origin_country?: string[];
  production_countries?: { iso_3166_1: string }[];
  external_ids?: { imdb_id?: string };
  popularity?: number;
  release_date?: string;
  first_air_date?: string;
}
export interface TMDBEpisode { id: number; episode_number: number; name: string; overview?: string; still_path?: string | null; }
export interface TMDBVideo { key: string; name: string; site: string; type: string; official: boolean; }

export interface TMDBMovie extends CatalogFields {
  id: number
  media_type?: string
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids?: number[]
  genres?: { id: number; name: string }[]
  runtime?: number
  tagline?: string
  preferredStream?: string | null
}

export interface TMDBTVShow extends CatalogFields {
  id: number
  media_type?: string
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  vote_count: number
  genre_ids?: number[]
  genres?: { id: number; name: string }[]
  number_of_seasons?: number
  seasons?: TMDBSeason[]
  tagline?: string
  preferredStream?: string | null
}

export interface TMDBSeason {
  id: number
  season_number: number
  name: string
  episode_count: number
  air_date: string | null
}

export interface TMDBCredits {
  cast: {
    id: number
    name: string
    character: string
    profile_path: string | null
    order: number
  }[]
  crew: {
    id: number
    name: string
    job: string
    department: string
    profile_path: string | null
  }[]
}

export type TMDBMediaItem = (TMDBMovie | TMDBTVShow) & { media_type: string }

interface TMDBSearchResult<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  const apiKey = getApiKey()
  // Allow a mock catalog or public proxy for development previews without secrets.
  // Production always uses the configured server credential with TMDB directly.
  const previewOrigin = process.env.NODE_ENV === 'development' ? process.env.TMDB_PREVIEW_ORIGIN : undefined
  if (!apiKey && !previewOrigin) {
    console.error('TMDB_API_KEY is not set')
    return null
  }

  const url = new URL(`${previewOrigin || TMDB_BASE}${endpoint}`)
  if (!previewOrigin) url.searchParams.set('api_key', apiKey)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
      ...(previewOrigin ? { cache: 'no-store' as const } : { next: { revalidate: 3600 } }),
    })
    if (!res.ok) {
      console.error(`TMDB fetch failed: ${res.status} for ${endpoint}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.error('TMDB fetch error:', err)
    return null
  }
}

// Fetch a single media item by TMDB ID (for resolving admin picks)
export async function getMediaById(tmdbId: number, mediaType: string): Promise<TMDBMediaItem | null> {
  const endpoint = mediaType === 'tv' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`
  const data = await tmdbFetch<TMDBMediaItem>(endpoint)
  if (!data) return null
  return { ...data, media_type: mediaType } as TMDBMediaItem
}

export async function getTrending(region?: string): Promise<TMDBMediaItem[]> {
  const globalTrending = await tmdbFetch<TMDBSearchResult<TMDBMediaItem>>('/trending/all/day')
  const globalResults = globalTrending?.results || []

  if (region === 'IN') {
    // Interleave Global Trending with Recent Indian Popular content
    const [indianMovies, indianTV] = await Promise.all([
      getPopularMovies(1, 'IN'),
      getPopularTVShows(1, 'IN')
    ])

    const hybridResults: TMDBMediaItem[] = []
    const maxLength = Math.max(globalResults.length, indianMovies.length, indianTV.length)

    for (let i = 0; i < maxLength; i++) {
       // Global first
       if (globalResults[i]) hybridResults.push(globalResults[i])
       // Then Indian Movie
       if (indianMovies[i]) hybridResults.push({ ...indianMovies[i], media_type: 'movie' } as TMDBMediaItem)
       // Then Indian TV
       if (indianTV[i]) hybridResults.push({ ...indianTV[i], media_type: 'tv' } as TMDBMediaItem)
    }

    // De-duplicate by ID
    const seen = new Set()
    return hybridResults.filter(item => {
      const duplicate = seen.has(item.id)
      seen.add(item.id)
      return !duplicate
    }).slice(0, 20)
  }

  return globalResults
}

/**
 * Fetches the most hyped "Latest Releases" for a specific region.
 * Filters for high vote counts and recent release dates to avoid "cheap" or old content.
 */
export async function getLatestHype(region: string = 'IN'): Promise<TMDBMediaItem[]> {
  const now = new Date();
  const fourMonthsAgo = new Date();
  fourMonthsAgo.setMonth(now.getMonth() - 4);
  const dateStr = fourMonthsAgo.toISOString().split('T')[0];

  const commonParams = {
    sort_by: 'popularity.desc',
    'vote_count.gte': '40', // Quality/Hype filter to skip obscure "cheap" content
    region: region,
  };

  const movieParams = {
    ...commonParams,
    'primary_release_date.gte': dateStr,
  };

  const tvParams = {
    ...commonParams,
    'first_air_date.gte': dateStr,
  };

  const [movies, tv] = await Promise.all([
    tmdbFetch<TMDBSearchResult<TMDBMovie>>('/discover/movie', movieParams),
    tmdbFetch<TMDBSearchResult<TMDBTVShow>>('/discover/tv', tvParams),
  ]);

  const movieResults = (movies?.results || []).map(m => ({ ...m, media_type: 'movie' } as TMDBMediaItem));
  const tvResults = (tv?.results || []).map(t => ({ ...t, media_type: 'tv' } as TMDBMediaItem));

  // Also fetch global trending to interleave "Global Hype" with "Regional Latest"
  const trending = await tmdbFetch<TMDBSearchResult<TMDBMediaItem>>('/trending/all/day');
  const globalHits = (trending?.results || []).slice(0, 10);

  const hybrid: TMDBMediaItem[] = [];
  const max = Math.max(movieResults.length, tvResults.length, globalHits.length);

  for (let i = 0; i < max; i++) {
    if (globalHits[i]) hybrid.push(globalHits[i]);
    if (movieResults[i]) hybrid.push(movieResults[i]);
    if (tvResults[i]) hybrid.push(tvResults[i]);
  }

  // Deduplicate and filter for quality again
  const seen = new Set();
  return hybrid.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, 24);
}

export async function getTrendingMovies(region?: string): Promise<TMDBMovie[]> {
  if (region === 'IN') {
    return getPopularMovies(1, 'IN')
  }
  const data = await tmdbFetch<TMDBSearchResult<TMDBMovie>>('/trending/movie/week')
  return data?.results || []
}

export async function getTrendingTV(region?: string): Promise<TMDBTVShow[]> {
  if (region === 'IN') {
    return getPopularTVShows(1, 'IN')
  }
  const data = await tmdbFetch<TMDBSearchResult<TMDBTVShow>>('/trending/tv/week')
  return data?.results || []
}

export async function getPopularMovies(page = 1, region?: string): Promise<TMDBMovie[]> {
  const params: Record<string, string> = { page: String(page) }
  if (region === 'IN') {
    params.with_origin_country = 'IN'
    params.sort_by = 'popularity.desc'
    params['vote_count.gte'] = '20'
    // Ensure we only get RECENT/UPCOMING items (last 6 months to avoid "cheap old" movies)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    params['primary_release_date.gte'] = sixMonthsAgo.toISOString().split('T')[0]
    
    const data = await tmdbFetch<TMDBSearchResult<TMDBMovie>>('/discover/movie', params)
    return data?.results || []
  }
  if (region) params.region = region
  const data = await tmdbFetch<TMDBSearchResult<TMDBMovie>>('/movie/popular', params)
  return data?.results || []
}

export async function getPopularTVShows(page = 1, region?: string): Promise<TMDBTVShow[]> {
  const params: Record<string, string> = { page: String(page) }
  if (region === 'IN') {
    params.with_origin_country = 'IN'
    params.sort_by = 'popularity.desc'
    // For TV, we want shows that are recently aired or currently on air
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    params['first_air_date.gte'] = oneYearAgo.toISOString().split('T')[0]

    const data = await tmdbFetch<TMDBSearchResult<TMDBTVShow>>('/discover/tv', params)
    return data?.results || []
  }
  if (region) params.region = region
  const data = await tmdbFetch<TMDBSearchResult<TMDBTVShow>>('/tv/popular', params)
  return data?.results || []
}

export async function getMovieDetails(id: string | number): Promise<TMDBMovie | null> {
  return tmdbFetch<TMDBMovie>(`/movie/${id}`, { append_to_response: 'credits,videos,external_ids' })
}

export async function getTVDetails(id: string | number): Promise<TMDBTVShow | null> {
  return tmdbFetch<TMDBTVShow>(`/tv/${id}`, { append_to_response: 'credits,videos,external_ids' })
}

export async function getDetails(type: 'movie' | 'tv', id: string | number) {
  if (type === 'movie') return getMovieDetails(id)
  return getTVDetails(id)
}

export async function getSeason(tvId: string | number, seasonNumber: number) {
  return tmdbFetch<{ episodes: TMDBEpisode[]; name: string; season_number: number }>(
    `/tv/${tvId}/season/${seasonNumber}`
  )
}

export async function searchMulti(query: string): Promise<TMDBMediaItem[]> {
  const data = await tmdbFetch<TMDBSearchResult<TMDBMediaItem>>('/search/multi', { query, include_adult: 'true' })
  const results = (data?.results || []).filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
  
  const qLower = query.toLowerCase()
  
  // Hybrid Sort: Relevance (Text Match) + Popularity
  return results.sort((a, b) => {
    const titleA = (a.title || a.name || '').toLowerCase()
    const titleB = (b.title || b.name || '').toLowerCase()
    
    // 1. Exact match boost
    const aExact = titleA === qLower
    const bExact = titleB === qLower
    if (aExact && !bExact) return -1
    if (!aExact && bExact) return 1
    
    // 2. Starts with boost
    const aStarts = titleA.startsWith(qLower)
    const bStarts = titleB.startsWith(qLower)
    if (aStarts && !bStarts) return -1
    if (!aStarts && bStarts) return 1
    
    // 3. Includes boost
    const aIncludes = titleA.includes(qLower)
    const bIncludes = titleB.includes(qLower)
    if (aIncludes && !bIncludes) return -1
    if (!aIncludes && bIncludes) return 1
    
    // 4. Default to popularity
    return (b.popularity || 0) - (a.popularity || 0)
  })
}

export const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News',
  10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Talk', 10768: 'War & Politics',
}

export async function getDiscoverByGenre(genreId: string | number, page = 1): Promise<TMDBMediaItem[]> {
  const [movies, tv] = await Promise.all([
    tmdbFetch<TMDBSearchResult<TMDBMovie>>('/discover/movie', { with_genres: String(genreId), page: String(page), sort_by: 'popularity.desc' }),
    tmdbFetch<TMDBSearchResult<TMDBTVShow>>('/discover/tv', { with_genres: String(genreId), page: String(page), sort_by: 'popularity.desc' })
  ])

  const movieResults = (movies?.results || []).map(m => ({ ...m, media_type: 'movie' } as TMDBMediaItem))
  const tvResults = (tv?.results || []).map(t => ({ ...t, media_type: 'tv' } as TMDBMediaItem))

  // Interleave the results
  const hybridResults: TMDBMediaItem[] = []
  const maxLength = Math.max(movieResults.length, tvResults.length)
  
  for (let i = 0; i < maxLength; i++) {
     if (movieResults[i]) hybridResults.push(movieResults[i])
     if (tvResults[i]) hybridResults.push(tvResults[i])
  }

  return hybridResults
}

export async function getSimilar(type: 'movie' | 'tv', id: string | number, limit: number = 12): Promise<TMDBMediaItem[]> {
  // Use the recommendations or similar endpoint
  const data = await tmdbFetch<TMDBSearchResult<TMDBMediaItem>>(`/${type}/${id}/recommendations`, { page: '1' });
  const results = data?.results || [];
  
  // fallback to similar if recommendations are empty
  if (results.length === 0) {
    const similarData = await tmdbFetch<TMDBSearchResult<TMDBMediaItem>>(`/${type}/${id}/similar`, { page: '1' });
    return (similarData?.results || []).map(r => ({ ...r, media_type: type } as TMDBMediaItem)).slice(0, limit);
  }

  return results.map(r => ({ ...r, media_type: type } as TMDBMediaItem)).slice(0, limit);
}

export async function getUpcomingMovies(region: string = 'IN'): Promise<TMDBMovie[]> {
  const params: Record<string, string> = {
    region: region,
  };
  
  const data = await tmdbFetch<TMDBSearchResult<TMDBMovie>>('/movie/upcoming', params);
  
  // Filter out items that are already released more than a few days ago just to be safe,
  // or return all that tmdb considers "upcoming"
  return data?.results || [];
}

export async function getRandomReels(): Promise<TMDBMediaItem[]> {
  // Pick completely random pages for each fetch to simulate unlimited random scrolling
  // TMDb allows up to page 500
  const randomMoviePage = Math.floor(Math.random() * 50) + 1;
  const randomTVPage = Math.floor(Math.random() * 50) + 1;

  const commonParams = {
    'vote_average.gte': '7',
    'vote_count.gte': '200',
    'sort_by': 'popularity.desc',
  };

  const [movies, tv] = await Promise.all([
    tmdbFetch<TMDBSearchResult<TMDBMovie>>('/discover/movie', { ...commonParams, page: String(randomMoviePage), 'include_video': 'true' }),
    tmdbFetch<TMDBSearchResult<TMDBTVShow>>('/discover/tv', { ...commonParams, page: String(randomTVPage) })
  ]);

  const movieResults = (movies?.results || []).map(m => ({ ...m, media_type: 'movie' } as TMDBMediaItem));
  const tvResults = (tv?.results || []).map(t => ({ ...t, media_type: 'tv' } as TMDBMediaItem));

  // De-duplicate and shuffle heavily
  const hybrid = [...movieResults, ...tvResults].sort(() => Math.random() - 0.5);
  return hybrid;
}

export async function getVideosFromServer(type: string, id: string | number) {
  if (!['movie', 'tv'].includes(type) || !/^\d+$/.test(String(id))) return [];
  const data = await tmdbFetch<{ results: TMDBVideo[] }>(`/${type}/${id}/videos`);
  const priority = (kind: string) => kind === 'Clip' ? 1 : kind === 'Trailer' ? 2 : kind === 'Teaser' ? 3 : 4;
  return (data?.results || []).filter(video => video.site === 'YouTube').sort((a, b) => priority(a.type) - priority(b.type));
}

export async function getTopRatedMovies(page = 1, region?: string): Promise<TMDBMovie[]> {
  const params: Record<string, string> = { page: String(page) };
  if (region) params.region = region;
  const data = await tmdbFetch<TMDBSearchResult<TMDBMovie>>('/movie/top_rated', params);
  return data?.results || [];
}

export async function getTopRatedTVShows(page = 1, region?: string): Promise<TMDBTVShow[]> {
  const params: Record<string, string> = { page: String(page) };
  if (region) params.region = region;
  const data = await tmdbFetch<TMDBSearchResult<TMDBTVShow>>('/tv/top_rated', params);
  return data?.results || [];
}

/**
 * Aggregates a massive list of top SEO items to be used by `generateStaticParams`
 * Fetches: Popular (Global & IN), Top Rated (Global), and Latest Hype.
 */
export async function getSEOPrebuildData(): Promise<{ type: 'movie' | 'tv', item: TMDBMediaItem }[]> {
  // Limit to 5 pages per category (~100 items each) to easily stay under API limits and build timeouts
  const PAGES = 5;

  const fetchPages = async <T,>(fetchFn: (page: number, region?: string) => Promise<T[]>, region?: string): Promise<T[]> => {
    const pagePromises = [];
    for (let i = 1; i <= PAGES; i++) {
        pagePromises.push(fetchFn(i, region));
    }
    const results = await Promise.all(pagePromises);
    return results.flat();
  };

  // Fetch in parallel
  const [m1, m2, m3, t1, t2, t3, h1] = await Promise.all([
    fetchPages(getPopularMovies),
    fetchPages(getPopularMovies, 'IN'),
    fetchPages(getTopRatedMovies),
    fetchPages(getPopularTVShows),
    fetchPages(getPopularTVShows, 'IN'),
    fetchPages(getTopRatedTVShows),
    getLatestHype('IN')
  ]);

  const allMovies = [...m1, ...m2, ...m3].map(m => ({ ...m, media_type: 'movie' }));
  const allTV = [...t1, ...t2, ...t3].map(t => ({ ...t, media_type: 'tv' }));
  
  const combined = [...allMovies, ...allTV, ...h1] as TMDBMediaItem[];

  // Deduplicate by ID and Type to ensure Next.js route uniqueness
  const map = new Map<string, TMDBMediaItem>();
  for (const item of combined) {
    const key = `${item.media_type}-${item.id}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values()).map(item => ({
    type: item.media_type === 'tv' ? 'tv' as const : 'movie' as const,
    item
  }));
}

/**
 * Fetches a deep block of pages (e.g. 25 pages = 500 items) for sitemap pagination.
 * Executed in parallel to stay within serverless 10-second request bounds.
 */
export async function getDeepCatalogData(type: 'movie' | 'tv', startPage: number, endPage: number): Promise<TMDBMediaItem[]> {
  const promises = [];
  
  for (let i = startPage; i <= endPage; i++) {
    // We use discover endpoint for reliable massive popularity sorting
    const params: Record<string, string> = { page: String(i), sort_by: 'popularity.desc' };
    const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
    promises.push(tmdbFetch<TMDBSearchResult<TMDBMediaItem>>(endpoint, params));
  }

  const results = await Promise.all(promises);
  
  const allItems = results.flatMap(res => res?.results || []);
  
  // Deduplicate and append media_type
  const map = new Map<number, TMDBMediaItem>();
  for (const item of allItems) {
    if (!map.has(item.id)) {
      map.set(item.id, { ...item, media_type: type } as TMDBMediaItem);
    }
  }

  return Array.from(map.values());
}
