import createTheme, { ThemeOptions } from "@mui/material/styles/createTheme";

export const themeOptions: ThemeOptions = {
  palette: {
    mode: "dark",
    primary: {
      main: "#bb99ff",
    },
    secondary: {
      main: "#ee99ff",
    },
    background: {
      paper: "#222639",
      default: "#1e2231",
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          color: "secondary",
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "transparent",
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          padding: 8,
          "& .MuiSwitch-track": {
            borderRadius: 22 / 2,
          },
          "& .MuiSwitch-thumb": {
            boxShadow: "none",
            width: 16,
            height: 16,
            margin: 2,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          margin: "4px 8px",
          borderRadius: "16px",
        },
        dense: {
          borderRadius: "12px",
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          minWidth: "192px !important",
        },
      },
    },
  },
};

export const theme = createTheme(themeOptions);
