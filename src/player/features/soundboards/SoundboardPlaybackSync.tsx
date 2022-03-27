import React, { useEffect } from "react";

import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { Sound } from "./Sound";

type SoundboardPlaybackSyncProps = {
  onSync: (update: (id: string, sound: Sound) => void) => void;
};

// Sync soundboard redux store and playback
// This is done in a empty component to avoid re-rendering any children
// which is important for high performance live volume updating
export function SoundboardPlaybackSync({
  onSync,
}: SoundboardPlaybackSyncProps) {
  const soundboards = useSelector((state: RootState) => state.soundboards);

  useEffect(() => {
    onSync((id, sound) => {
      const state = soundboards.sounds[id];
      if (state) {
        if (state.volume !== sound.options.volume) {
          sound.volume(state.volume);
        }
        if (state.loop !== sound.options.loop) {
          sound.loop(state.loop);
        }
      }
    });
  }, [soundboards]);

  return <></>;
}
