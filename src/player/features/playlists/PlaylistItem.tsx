import React from "react";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import CardActionArea from "@mui/material/CardActionArea";
import PlayArrowIcon from "@mui/icons-material/PlayArrowRounded";
import PauseIcon from "@mui/icons-material/PauseRounded";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";

import { backgrounds, isBackground } from "../../backgrounds";

import { Playlist, Track } from "./playlistsSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { playPause, startQueue } from "./playlistPlaybackSlice";

type PlaylistItemProps = {
  playlist: Playlist;
  onSelect: (id: string) => void;
  onPlay: (track: Track) => void;
};

export function PlaylistItem({
  playlist,
  onSelect,
  onPlay,
}: PlaylistItemProps) {
  const playlists = useSelector((state: RootState) => state.playlists);
  const playing = useSelector(
    (state: RootState) =>
      state.playlistPlayback.playing &&
      state.playlistPlayback.queue?.playlistId === playlist.id
  );
  const queue = useSelector((state: RootState) => state.playlistPlayback.queue);
  const shuffle = useSelector(
    (state: RootState) => state.playlistPlayback.shuffle
  );

  const dispatch = useDispatch();

  const image = isBackground(playlist.background)
    ? backgrounds[playlist.background]
    : playlist.background;

  function handlePlay() {
    if (queue?.playlistId === playlist.id) {
      dispatch(playPause(!playing));
    } else {
      let tracks = [...playlist.tracks];
      const trackIndex = shuffle
        ? Math.floor(Math.random() * tracks.length)
        : 0;
      const trackId = tracks[trackIndex];
      const track = playlists.tracks[trackId];
      if (track) {
        dispatch(startQueue({ tracks, trackId, playlistId: playlist.id }));
        onPlay(track);
      }
    }
  }

  return (
    <Card sx={{ position: "relative" }}>
      <CardActionArea onClick={() => onSelect(playlist.id)}>
        <CardMedia
          component="img"
          height="200px"
          image={image}
          alt={"Background"}
          sx={{ pointerEvents: "none" }}
        />
      </CardActionArea>
      <Box
        sx={{
          backgroundImage:
            "linear-gradient(0deg, #00000088 30%, #ffffff44 100%)",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          padding: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "absolute",
          bottom: 0,
          width: "100%",
          pointerEvents: "none",
        }}
      >
        <Typography variant="h5" component="div">
          {playlist.title}
        </Typography>
        <IconButton
          aria-label="play/pause"
          sx={{ pointerEvents: "all" }}
          onClick={handlePlay}
        >
          {playing ? (
            <PauseIcon sx={{ fontSize: "2rem" }} />
          ) : (
            <PlayArrowIcon sx={{ fontSize: "2rem" }} />
          )}
        </IconButton>
      </Box>
    </Card>
  );
}
