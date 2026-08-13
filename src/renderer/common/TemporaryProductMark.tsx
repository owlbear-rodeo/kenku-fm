import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React from "react";

type TemporaryProductMarkProps = {
  size?: number;
};

export function TemporaryProductMark({ size = 36 }: TemporaryProductMarkProps) {
  return (
    <Box
      aria-label="Dungeon Jockey temporary mark"
      sx={{
        alignItems: "center",
        bgcolor: "primary.main",
        borderRadius: 1,
        display: "flex",
        height: size,
        justifyContent: "center",
        width: size,
      }}
    >
      <Typography
        component="span"
        sx={{
          color: "primary.contrastText",
          fontSize: size * 0.38,
          fontWeight: 700,
        }}
      >
        DJ
      </Typography>
    </Box>
  );
}
