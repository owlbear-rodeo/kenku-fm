import { app, BrowserWindow, Menu } from "electron";

const isMac = process.platform === "darwin";

const template: any = [
  // { role: 'appMenu' }
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ]
    : []),
  // { role: 'fileMenu' }
  {
    label: "File",
    submenu: [
      isMac
        ? { role: "close", accelerator: "Cmd+Shift+W" }
        : { role: "quit", accelerator: "Ctrl+Shift+W" },
    ],
  },
  // { role: 'editMenu' }
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      ...(isMac
        ? [
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
            { type: "separator" },
            {
              label: "Speech",
              submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
            },
          ]
        : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
    ],
  },
  // { role: 'viewMenu' }
  {
    label: "View",
    submenu: [
      ...(app.isPackaged ? [] : [{ role: "toggleDevTools" }]),
      { role: "togglefullscreen" },
    ],
  },
  {
    label: "Tab",
    submenu: [
      {
        label: "New Tab",
        accelerator: isMac ? "Cmd+T" : "Ctrl+T",
        click: () => {
          const windows = BrowserWindow.getAllWindows();
          for (let window of windows) {
            window.webContents.send("BROWSER_VIEW_NEW_TAB");
          }
        },
      },
      {
        label: "Close Tab",
        accelerator: isMac ? "Cmd+W" : "Ctrl+W",
        click: () => {
          const windows = BrowserWindow.getAllWindows();
          for (let window of windows) {
            window.webContents.send("BROWSER_VIEW_CLOSE_TAB");
          }
        },
      },
    ],
  },
  // { role: 'windowMenu' }
  {
    label: "Window",
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      ...(isMac
        ? [
            { type: "separator" },
            { role: "front" },
            { type: "separator" },
            { role: "window" },
          ]
        : [{ role: "close", accelerator: "Ctrl+Shift+W" }]),
    ],
  },
  {
    role: "help",
    submenu: [
      {
        label: "Learn More",
        click: async () => {
          const { shell } = require("electron");
          await shell.openExternal("https://kenku.fm");
        },
      },
      ...(!isMac ? [{ role: "about" }] : []),
    ],
  },
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
