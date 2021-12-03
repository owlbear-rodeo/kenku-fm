export interface PlaybackReply {
  playing: boolean;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: "off" | "track" | "playlist";
  track?: {
    id: string;
    url: string;
    title: string;
    duration: number;
    playlist?: {
      id: string;
      title: string;
    };
  };
  progress?: number;
}
