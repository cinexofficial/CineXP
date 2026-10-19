export interface PublicDownloadLink {
  id: string;
  quality: string;
  label: string;
  size: string;
  url: string;
  subtitleUrl?: string;
  isMoviebox?: boolean;
}
