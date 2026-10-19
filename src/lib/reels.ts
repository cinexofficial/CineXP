import { getRandomReels, TMDBMediaItem, getVideosFromServer } from "./tmdb";

export interface ReelVideo {
  id: string | number;
  item: TMDBMediaItem;
  video: {
    key: string;
    name: string;
    type: string;
    official: boolean;
  };
}

/**
 * Fetches movies/TV shows and their videos, flattening them into a single list of video-first items.
 * Server-safe: Uses direct TMDb calls.
 */
export async function getMoreReels(page: number): Promise<ReelVideo[]> {
  const items = await getRandomReels();
  const reelVideos: ReelVideo[] = [];

  // Parallel fetch for videos of all items in this page
  const videoPromises = items.map(async (item) => {
    try {
      const videos = await getVideosFromServer(item.media_type || 'movie', item.id);
      return { item, videos: videos || [] };
    } catch (e) {
      console.error(`Failed to fetch videos for item ${item.id}`, e);
      return null;
    }
  });

  const results = await Promise.all(videoPromises);

  results.forEach((res) => {
    if (res && res.videos.length > 0) {
      // Prioritize Clips (max 2) and fallback to Trailer (max 1)
      const clips = res.videos.filter((v) => v.type === 'Clip').slice(0, 2);
      const trailers = res.videos.filter((v) => v.type === 'Trailer').slice(0, 1);
      
      const prioritized = clips.length > 0 ? clips : trailers;
      
      prioritized.forEach((v) => {
        reelVideos.push({
          id: `${v.key}_${res.item.id}`,
          item: res.item,
          video: v
        });
      });

    }
  });

  // Shuffle the final reels output so clips from the same movie aren't sequential
  return reelVideos.sort(() => Math.random() - 0.5);
}

