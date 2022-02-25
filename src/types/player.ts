export interface PlaylistPlaybackReply {
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
    progress: number;
  };
  playlist?: {
    id: string;
    title: string;
  };
}

export interface SoundboardPlaybackReply {
  sounds: {
    id: string;
    url: string;
    title: string;
    loop: boolean;
    volume: number;
    fadeIn: number;
    fadeOut: number;
    duration: number;
    progress: number;
  }[];
}
