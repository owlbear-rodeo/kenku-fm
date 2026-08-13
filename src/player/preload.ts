import {
  contextBridge,
  ipcRenderer,
  IpcRendererEvent,
  webUtils,
} from "electron";
import {
  PlaylistPlaybackReply,
  PlaylistsReply,
  SoundboardPlaybackReply,
  SoundboardsReply,
} from "../types/player";

type ChannelArguments = {
  PLAYER_REMOTE_PLAYLIST_GET_ALL_REQUEST: [];
  PLAYER_REMOTE_PLAYLIST_PLAY: [id: string];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_REQUEST: [];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_PLAY: [];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_PAUSE: [];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_MUTE: [muted: boolean];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_VOLUME: [volume: number];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_SEEK: [to: number];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_NEXT: [];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_PREVIOUS: [];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_REPEAT: [
    repeat: "off" | "track" | "playlist",
  ];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_SHUFFLE: [shuffle: boolean];
  PLAYER_REMOTE_SOUNDBOARD_GET_ALL_REQUEST: [];
  PLAYER_REMOTE_SOUNDBOARD_PLAY: [id: string];
  PLAYER_REMOTE_SOUNDBOARD_STOP: [id: string];
  PLAYER_REMOTE_SOUNDBOARD_PLAYBACK_REQUEST: [];
};

type Channel = keyof ChannelArguments;

const validChannels: Channel[] = [
  "PLAYER_REMOTE_PLAYLIST_GET_ALL_REQUEST",
  "PLAYER_REMOTE_PLAYLIST_PLAY",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_REQUEST",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_PLAY",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_PAUSE",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_MUTE",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_VOLUME",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_SEEK",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_NEXT",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_PREVIOUS",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_REPEAT",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_SHUFFLE",
  "PLAYER_REMOTE_SOUNDBOARD_GET_ALL_REQUEST",
  "PLAYER_REMOTE_SOUNDBOARD_PLAY",
  "PLAYER_REMOTE_SOUNDBOARD_STOP",
  "PLAYER_REMOTE_SOUNDBOARD_PLAYBACK_REQUEST",
];

const api = {
  on: <T extends Channel>(
    channel: T,
    callback: (args: ChannelArguments[T]) => void,
  ) => {
    if (validChannels.includes(channel)) {
      const newCallback = (
        _: IpcRendererEvent,
        ...args: ChannelArguments[T]
      ) => callback(args);
      ipcRenderer.on(channel, newCallback);
    }
  },
  removeAllListeners: (channel: Channel) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  playlistPlaybackReply: (playback: PlaylistPlaybackReply) => {
    ipcRenderer.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_REPLY", playback);
  },
  soundboardPlaybackReply: (playback: SoundboardPlaybackReply) => {
    ipcRenderer.send("PLAYER_REMOTE_SOUNDBOARD_PLAYBACK_REPLY", playback);
  },
  playlistGetAllReply: (playlists: PlaylistsReply) => {
    ipcRenderer.send("PLAYER_REMOTE_PLAYLIST_GET_ALL_REPLY", playlists);
  },
  soundboardGetAllReply: (soundboards: SoundboardsReply) => {
    ipcRenderer.send("PLAYER_REMOTE_SOUNDBOARD_GET_ALL_REPLY", soundboards);
  },
  getPathForFile: (file: File) => {
    return webUtils.getPathForFile(file);
  } 
};

declare global {
  interface Window {
    player: typeof api;
  }
}

contextBridge.exposeInMainWorld("player", api);
