import React, { useEffect } from "react";

import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

import { Sound } from "./soundboardsSlice";

type SoundboardRemoteProps = {
  onPlay: (sound: Sound) => void;
  onStop: (id: string) => void;
};

export function SoundboardRemote({ onPlay, onStop }: SoundboardRemoteProps) {
  const soundboards = useSelector((state: RootState) => state.soundboards);
  const playback = useSelector((state: RootState) => state.soundboardPlayback);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_SOUNDBOARD_PLAY", (args) => {
      const id = args[0];

      if (id in soundboards.sounds) {
        const sound = soundboards.sounds[id];
        onPlay(sound);
      } else if (id in soundboards.soundboards.byId) {
        const soundboard = soundboards.soundboards.byId[id];
        const sounds = [...soundboard.sounds];
        const soundId = sounds[Math.floor(Math.random() * sounds.length)];
        const sound = soundboards.sounds[soundId];
        if (sound) {
          onPlay(sound);
        }
      }
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_SOUNDBOARD_PLAY");
    };
  }, [onPlay, soundboards]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_SOUNDBOARD_STOP", (args) => {
      const id = args[0];
      onStop(id);
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_SOUNDBOARD_STOP");
    };
  }, [onPlay, soundboards]);

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

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_SOUNDBOARD_GET_ALL_REQUEST", () => {
      window.player.soundboardGetAllReply({
        soundboards: soundboards.soundboards.allIds.map(
          (id) => soundboards.soundboards.byId[id]
        ),
        sounds: Object.values(soundboards.sounds),
      });
    });
  }, [soundboards]);

  return <></>;
}
