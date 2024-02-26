import React, { useCallback, useState } from "react";

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import InputLabel from "@mui/material/InputLabel";
import FormGroup from "@mui/material/FormGroup";
import ImageList from "@mui/material/ImageList";
import ImageListItem from "@mui/material/ImageListItem";
import styled from "@mui/material/styles/styled";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";

import { useDropzone } from "react-dropzone";

import { backgrounds } from "../backgrounds";
import { encodeFilePath, getDropURL } from "../../renderer/common/drop";
import Input from "@mui/material/Input";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

const ImageListButton = styled("img")({
  userSelect: "none",
  objectFit: "cover",
  width: "100%",
  height: "100%",
  borderRadius: "16px",
});

type ImageSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ImageSelector({ value, onChange }: ImageSelectorProps) {
  const hasCustomImage = value.startsWith("file") || value.startsWith("http");
  const [imageType, setImageType] = useState(
    hasCustomImage ? "custom" : "default"
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      onChange(encodeFilePath(file.path));
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    multiple: false,
    useFsAccessApi: false,
  });

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

  const imageSelector = (
    <ImageList variant="masonry" cols={3} gap={8} sx={{ m: 0 }}>
      {Object.entries(backgrounds).map(([key, src]) => (
        <ImageListItem key={key}>
          <ImageListButton src={src} alt={key} loading="lazy" />
          <IconButton
            aria-label={key}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              borderRadius: "16px",
              borderStyle: value === key ? "solid" : "none",
              borderWidth: "2px",
              borderColor: "primary.main",
            }}
            onClick={() => onChange(key)}
          />
        </ImageListItem>
      ))}
    </ImageList>
  );

  const imageImporter = (
    <Box my={2}>
      <Input
        autoFocus
        margin="dense"
        id="url"
        aria-label="source"
        placeholder="Enter a URL or select an image below"
        fullWidth
        autoComplete="off"
        value={value}
        onChange={handleURLChange}
        onDrop={handleURLDrop}
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
          <Typography variant="caption">Drop the image here...</Typography>
        ) : (
          <Typography variant="caption">
            Drag and drop or click to select an image
          </Typography>
        )}
      </Button>
      {hasCustomImage && <ImageListButton src={value} alt="preview" />}
    </Box>
  );

  return (
    <FormGroup sx={{ my: 1 }}>
      <InputLabel id="bg-image" shrink>
        Background Image
      </InputLabel>
      <ToggleButtonGroup
        color="primary"
        value={imageType}
        exclusive
        fullWidth
        size="small"
        onChange={(_, value) => {
          if (value) {
            onChange("");
            setImageType(value);
          }
        }}
        aria-labelledby="bg-image"
      >
        <ToggleButton value="default">Default</ToggleButton>
        <ToggleButton value="custom">Custom</ToggleButton>
      </ToggleButtonGroup>
      <Box
        sx={{
          maxWidth: 500,
          width: "100%",
          height: "200px",
          bgcolor: "rgba(0, 0, 0, 0.16)",
          borderRadius: "16px",
          p: 1,
          pr: 0,
          mt: 1,
        }}
      >
        <Box sx={{ overflowY: "scroll", height: "100%" }}>
          {imageType === "default" ? imageSelector : imageImporter}
        </Box>
      </Box>
    </FormGroup>
  );
}
