import { useEffect } from "react";

import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

import { Sound } from "./soundboardsSlice";

export function useSoundboardRemote(
  play: (sound: Sound) => void,
  stop: (id: string) => void
) {
  const soundboards = useSelector((state: RootState) => state.soundboards);
  const playback = useSelector((state: RootState) => state.soundboardPlayback);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_SOUNDBOARD_PLAY", (args) => {
      const id = args[0];

      if (id in soundboards.sounds) {
        const sound = soundboards.sounds[id];
        play(sound);
      } else if (id in soundboards.soundboards.byId) {
        const soundboard = soundboards.soundboards.byId[id];
        const sounds = [...soundboard.sounds];
        const soundId = sounds[Math.floor(Math.random() * sounds.length)];
        const sound = soundboards.sounds[soundId];
        if (sound) {
          play(sound);
        }
      }
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_SOUNDBOARD_PLAY");
    };
  }, [play, soundboards]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_SOUNDBOARD_STOP", (args) => {
      const id = args[0];
      stop(id);
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_SOUNDBOARD_STOP");
    };
  }, [play, soundboards]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_SOUNDBOARD_PLAYBACK_REQUEST", () => {
      const sounds = Object.values(playback.playback);
      window.player.soundboardPlaybackReply({
        sounds,
      });
    });

    return () => {
      window.player.removeAllListeners(
        "PLAYER_REMOTE_SOUNDBOARD_PLAYBACK_REQUEST"
      );
    };
  }, [playback]);
}
