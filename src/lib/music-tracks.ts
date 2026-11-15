export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl: string | null;
  previewUrl: string | null;
  geniusUrl: string | null;
};
