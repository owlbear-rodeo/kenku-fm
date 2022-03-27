import React, { useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { playPause } from "./playlistPlaybackSlice";

type PlaylistMediaSessionProps = {
  onSeek: (to: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onStop: () => void;
};

export function PlaylistMediaSession({
  onSeek,
  onNext,
  onPrevious,
  onStop,
}: PlaylistMediaSessionProps) {
  const playback = useSelector((state: RootState) => state.playlistPlayback);
  const dispatch = useDispatch();

  // Handle media session actions
  useEffect(() => {
    navigator.mediaSession.setActionHandler("play", () => {
      dispatch(playPause(true));
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      dispatch(playPause(false));
    });
    navigator.mediaSession.setActionHandler("stop", () => {
      onStop();
    });
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (typeof details.seekTime === "number") {
        onSeek(details.seekTime);
      }
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      onPrevious();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      onNext();
    });
  }, [onStop, onSeek, onPrevious, onNext]);

  // Update media sesssion metadata with current track
  useEffect(() => {
    if (playback.track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: playback.track.title,
      });
    } else {
      navigator.mediaSession.metadata = null;
    }
  }, [playback.track]);

  // Update media session playback state
  useEffect(() => {
    if (playback.playing) {
      navigator.mediaSession.playbackState = "playing";
    } else {
      navigator.mediaSession.playbackState = "paused";
    }
  }, [playback.playing]);

  return <></>;
}
