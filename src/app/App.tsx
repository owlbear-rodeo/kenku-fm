import * as React from "react";
import * as ReactDOM from "react-dom";
import { store } from "./store";
import { Provider } from "react-redux";
import CssBaseline from "@material-ui/core/CssBaseline";
import "typeface-roboto/index.css";
import { ThemeProvider } from "@material-ui/core/styles";

import { TextField, Box, Container, Typography } from "@material-ui/core";

import { theme } from "./theme";

function App() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          App
        </Typography>
        <TextField
          variant="outlined"
          label="message"
          InputLabelProps={{
            shrink: true,
          }}
          onChange={(e) => {
            (window as any).discord.updateMessage(e.target.value);
          }}
        />
      </Box>
    </Container>
  );
}

ReactDOM.render(
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </Provider>,
  document.getElementById("root")
);
