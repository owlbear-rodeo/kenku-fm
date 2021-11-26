import { useEffect, useRef, useState } from "react";
import { Howl, Howler } from "howler";

export interface Playback {
  current: number;
  duration: number;
}

export interface Track {
  url: string;
  title: string;
}

export function usePlayback() {
  const trackRef = useRef<Howl | null>(null);
  const animationRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [loop, setLoop] = useState(true);
  const [track, setTrack] = useState<Track | null>(null);
  const [playback, setPlayback] = useState<Playback | null>(null);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAY", (args) => {
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

      // Update UI based off of native controls
      const sound = (track as any)._sounds[0];
      const node = sound._node;
      node.onpause = () => {
        setPlaying(false);
        sound._paused = true;
        sound._seek = node.currentTime;
      };
      node.onplaying = () => {
        setPlaying(true);
        sound._paused = false;
        sound._seek = node.currentTime;
      };
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAY");
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYBACK_PLAY_PAUSE", () => {
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

    window.player.on("PLAYER_REMOTE_PLAYBACK_MUTE", () => {
      setMuted((muted) => {
        Howler.mute(!muted);
        return !muted;
      });
    });

    window.player.on("PLAYER_REMOTE_PLAYBACK_INCREASE_VOLUME", () => {
      setVolume((volume) => {
        const newVolume = Math.min(volume + 0.05, 1);
        Howler.volume(newVolume);
        return newVolume;
      });
    });

    window.player.on("PLAYER_REMOTE_PLAYBACK_DECREASE_VOLUME", () => {
      setVolume((volume) => {
        const newVolume = Math.max(volume - 0.05, 0);
        Howler.volume(newVolume);
        return newVolume;
      });
    });

    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_PLAY_PAUSE");
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYBACK_MUTE");
      window.player.removeAllListeners(
        "PLAYER_REMOTE_PLAYBACK_INCREASE_VOLUME"
      );
      window.player.removeAllListeners(
        "PLAYER_REMOTE_PLAYBACK_DECREASE_VOLUME"
      );
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

  return {
    playing,
    setPlaying: handlePlay,
    volume,
    setVolume: handleVolumeChange,
    muted,
    setMuted: handleMute,
    loop,
    setLoop: handleLoop,
    track,
    playback,
    seek: handleSeek,
  };
}
