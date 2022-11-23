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

export interface PlaylistsReply {
  playlists: {
    tracks: string[];
    background: string;
    title: string;
    id: string;
  }[];
  tracks: {
    id: string;
    url: string;
    title: string;
  }[];
}

export interface SoundboardsReply {
  soundboards: {
    sounds: string[];
    background: string;
    title: string;
    id: string;
  }[];
  sounds: {
    id: string;
    url: string;
    title: string;
    loop: boolean;
    volume: number;
    fadeIn: number;
    fadeOut: number;
  }[];
}
