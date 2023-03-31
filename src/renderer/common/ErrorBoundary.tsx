import React from "react";

import Stack from "@mui/material/Stack";
import styled from "@mui/material/styles/styled";
import Typography from "@mui/material/Typography";

import icon from "../../assets/icon.svg";

const WallPaper = styled("div")({
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
  overflow: "hidden",
  background: "linear-gradient(#2D3143 0%, #1e2231 100%)",
  zIndex: -1,
});

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  submitted?: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    window.kenku.removeAllBrowserViews();
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Stack direction="row">
          <WallPaper />
          <Stack
            position="absolute"
            left="0"
            right="0"
            width="100%"
            height="100%"
            alignItems="center"
            justifyContent="center"
            gap={1}
          >
            <Stack sx={{ width: "68px", height: "68px", m: 1 }}>
              <img src={icon} />
            </Stack>
            <Typography variant="h4" color="white">
              Oops, something went wrong..
            </Typography>
            {this.state.error && (
              <Typography color="white">
                {this.state.error.name}: {this.state.error.message}
              </Typography>
            )}
            {this.state.error?.stack && (
              <Typography variant="caption" color="white" maxWidth="500px">
                {this.state.error.stack}
              </Typography>
            )}
          </Stack>
        </Stack>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
