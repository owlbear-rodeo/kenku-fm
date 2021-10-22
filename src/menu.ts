import { app, Menu, MenuItem, BrowserWindow, dialog } from "electron";
import store from "./main/store";
import Remote from "./main/Remote";

const isMac = process.platform === "darwin";

const SHOW_CONTROLS_ID = "SHOW_CONTROLS";
const ENABLE_REMOTE_ID = "ENABLE_REMOTE";

const remote = new Remote();
if (store.get("remoteEnabled")) {
  remote.start();
}

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
    submenu: [isMac ? { role: "close" } : { role: "quit" }],
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
      { role: "reload" },
      { role: "forceReload" },
      ...(app.isPackaged ? [] : [{ role: "toggleDevTools" }]),
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
      {
        type: "checkbox",
        label: "Show Controls",
        click: (item: MenuItem, window: BrowserWindow | undefined) => {
          if (window) {
            window.webContents.send("SHOW_CONTROLS", item.checked);
          }
          store.set("showControls", item.checked);
        },
        checked: store.get("showControls"),
        id: SHOW_CONTROLS_ID,
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
        : [{ role: "close" }]),
    ],
  },
  {
    label: "Remote",
    submenu: [
      {
        type: "checkbox",
        label: "Enable Remote",
        click: (item: MenuItem) => {
          store.set("remoteEnabled", item.checked);
          if (item.checked) {
            remote.start();
          } else {
            remote.stop();
          }
        },
        checked: store.get("remoteEnabled"),
        id: ENABLE_REMOTE_ID,
      },
      {
        label: "Remote Info",
        click: () => {
          dialog.showMessageBox(undefined, {
            message: remote.getInfo(),
            type: "info",
            title: "Remote Info",
          });
        },
      },
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
    ],
  },
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
