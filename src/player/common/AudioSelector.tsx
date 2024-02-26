import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";

import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Link } from "@mui/material";

import {
  getDropURL,
  encodeFilePath,
  cleanFileName,
} from "../../renderer/common/drop";

type AudioSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  onFileName: (name: string) => void;
};

const formats = ["mp3", "flac", "wav", "ogg", "mp4", "3gp", "webm", "mpeg"];

export function AudioSelector({
  value,
  onChange,
  onFileName,
}: AudioSelectorProps) {
  function handleURLChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  function handleURLDrop(event: React.DragEvent<HTMLInputElement>) {
    event.preventDefault();
    const url = getDropURL(event.dataTransfer);
    if (url) {
      onChange(url);
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      onChange(encodeFilePath(file.path));
      onFileName(cleanFileName(file.name));
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [],
    },
    multiple: false,
    useFsAccessApi: false,
  });

  const warning =
    value && !formats.some((format) => value.toLowerCase().endsWith(format));

  return (
    <>
      <TextField
        autoFocus
        margin="dense"
        id="url"
        label="Source"
        placeholder="Enter a URL or select a track below"
        fullWidth
        variant="standard"
        autoComplete="off"
        InputLabelProps={{
          shrink: true,
        }}
        value={value}
        onChange={handleURLChange}
        onDrop={handleURLDrop}
        color={warning ? "warning" : undefined}
        helperText={
          warning ? (
            <>
              Unable to verify audio format, this file may not be supported. See{" "}
              <Link
                href="https://www.kenku.fm/docs/using-kenku-player"
                target="_blank"
                rel="noopener noreferrer"
              >
                here
              </Link>{" "}
              for more information.
            </>
          ) : undefined
        }
      />
      <Button
        sx={{
          p: 2,
          borderStyle: "dashed",
          my: 1,
        }}
        variant="outlined"
        fullWidth
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <Typography variant="caption">Drop the track here...</Typography>
        ) : (
          <Typography variant="caption">
            Drag and drop or click to select a track
          </Typography>
        )}
      </Button>
    </>
  );
}
