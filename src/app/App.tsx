import * as React from "react";
import * as ReactDOM from "react-dom";
import { store } from "./store";
import { Provider } from "react-redux";
import CssBaseline from "@material-ui/core/CssBaseline";
import "typeface-roboto/index.css";
import { ThemeProvider } from "@material-ui/core/styles";

import Box from "@material-ui/core/Box";
import Container from "@material-ui/core/Container";
import Typography from "@material-ui/core/Typography";

import { theme } from "./theme";

import { Counter } from "../features/counter/Counter";

function App() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          App
        </Typography>
        <Counter />
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
