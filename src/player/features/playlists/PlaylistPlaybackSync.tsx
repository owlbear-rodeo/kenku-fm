import React, { useEffect } from "react";

import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

type PlaylistPlaybackSyncProps = {
  onMute: (muted: boolean) => void;
  onPauseResume: (resume: boolean) => void;
  onVolume: (volume: number) => void;
};

// Sync playlist redux store and playback
// This is done in a empty component to avoid re-rendering any children
export function PlaylistPlaybackSync({
  onMute,
  onPauseResume,
  onVolume,
}: PlaylistPlaybackSyncProps) {
  const volume = useSelector(
    (state: RootState) => state.playlistPlayback.volume
  );
  const muted = useSelector((state: RootState) => state.playlistPlayback.muted);
  const playing = useSelector(
    (state: RootState) => state.playlistPlayback.playing
  );
  const playbackTrack = useSelector(
    (state: RootState) => state.playlistPlayback.track
  );

  useEffect(() => {
    onVolume(volume);
  }, [volume, onVolume]);

  useEffect(() => {
    onMute(muted);
  }, [muted, onMute]);

  useEffect(() => {
    onPauseResume(playing);
  }, [playing, onPauseResume, playbackTrack]);

  return <></>;
}
