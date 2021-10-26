import React, { useEffect, useRef, useState } from "react";
import { Howl, Howler } from "howler";

import Box from "@mui/material/Box";

import { Player } from "./Player";

export interface Playback {
  current: number;
  duration: number;
}

export interface Track {
  url: string;
  title: string;
}

export function App() {
  const trackRef = useRef<Howl | null>(null);
  const animationRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [loop, setLoop] = useState(true);
  const [track, setTrack] = useState<Track | null>(null);
  const [playback, setPlayback] = useState<Playback | null>(null);

  useEffect(() => {
    window.remote.on("REMOTE_PLAY", (args) => {
      const url = args[0];
      const title = args[1];
      const loop = args[2];

      const track = new Howl({
        src: url,
        html5: true,
        loop: loop,
        autoplay: true,
      });

      const prevTrack = trackRef.current;

      track.once("load", () => {
        trackRef.current = track;

        setTrack({ url, title });
        setLoop(loop);
        // Fade out previous track and fade in new track
        if (prevTrack) {
          prevTrack.fade(1, 0, 1000);
          prevTrack.once("fade", () => {
            prevTrack.unload();
          });
        }
        track.fade(0, 1, 1000);
        // Update playback
        setPlaying(true);
        // Create playback animation
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
        }
        let prevTime = performance.now();
        function animatePlayback(time: number) {
          animationRef.current = requestAnimationFrame(animatePlayback);
          // Limit update to 1 time per second
          const delta = time - prevTime;
          if (track.playing() && delta > 1000) {
            setPlayback({
              current: Math.floor(track.seek()),
              duration: Math.floor(track.duration()),
            });
            prevTime = time;
          }
        }
        animationRef.current = requestAnimationFrame(animatePlayback);
      });
    });

    return () => {
      window.remote.removeAllListeners("REMOTE_PLAY");
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    window.remote.on("REMOTE_PLAYBACK_PLAY_PAUSE", () => {
      if (trackRef.current) {
        if (trackRef.current.playing()) {
          trackRef.current.pause();
          setPlaying(false);
        } else {
          trackRef.current.play();
          setPlaying(true);
        }
      }
    });

    window.remote.on("REMOTE_PLAYBACK_MUTE", () => {
      setMuted((muted) => {
        Howler.mute(!muted);
        return !muted;
      });
    });

    window.remote.on("REMOTE_PLAYBACK_INCREASE_VOLUME", () => {
      setVolume((volume) => {
        const newVolume = Math.min(volume + 0.05, 1);
        Howler.volume(newVolume);
        return newVolume;
      });
    });

    window.remote.on("REMOTE_PLAYBACK_DECREASE_VOLUME", () => {
      setVolume((volume) => {
        const newVolume = Math.max(volume - 0.05, 0);
        Howler.volume(newVolume);
        return newVolume;
      });
    });

    return () => {
      window.remote.removeAllListeners("REMOTE_PLAYBACK_PLAY_PAUSE");
      window.remote.removeAllListeners("REMOTE_PLAYBACK_MUTE");
      window.remote.removeAllListeners("REMOTE_PLAYBACK_INCREASE_VOLUME");
      window.remote.removeAllListeners("REMOTE_PLAYBACK_DECREASE_VOLUME");
    };
  }, []);

  function handleSeek(to: number) {
    if (playback) {
      setPlayback({ ...playback, current: to });
    }
    trackRef.current?.seek(to);
  }

  function handlePlay(play: boolean) {
    setPlaying(play);
    if (play) {
      trackRef.current?.play();
    } else {
      trackRef.current?.pause();
    }
  }

  function handleVolumeChange(volume: number) {
    setVolume(volume);
    Howler.volume(volume);
  }

  function handleLoop(loop: boolean) {
    setLoop(loop);
    trackRef.current?.loop(loop);
  }

  function handleMute(muted: boolean) {
    setMuted(muted);
    Howler.mute(muted);
  }

  return (
    <Box
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Player
        playing={playing}
        volume={volume}
        muted={muted}
        loop={loop}
        track={track}
        playback={playback}
        onSeek={handleSeek}
        onPlay={handlePlay}
        onVolumeChange={handleVolumeChange}
        onLoop={handleLoop}
        onMute={handleMute}
      />
    </Box>
  );
}
