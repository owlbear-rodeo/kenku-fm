import { ipcMain, shell } from "electron";
import { LevelOption } from "electron-log";
import log from "electron-log/main";
import Store from "electron-store";
import severus from "severus";

const store = new Store({
  defaults: { level: "error" as LevelOption },
  name: "log",
});

log.initialize({ preload: false });
severus.logInit();

const level = store.get("level");
log.transports.console.level = level;
log.transports.file.level = level;
if (typeof level === "string") {
  severus.logSetLogLevel(level);
}

ipcMain.on("GET_LOG_LEVEL", (event) => {
  event.returnValue = store.get("level");
});

ipcMain.on("SET_LOG_LEVEL", (_, level: LevelOption) => {
  store.set("level", level);
  log.transports.console.level = level;
  log.transports.file.level = level;
  if (typeof level === "string") {
    severus.logSetLogLevel(level);
  }
});

ipcMain.on("OPEN_LOG_FILE", () => {
  const path = log.transports.file.getFile().path;
  shell.showItemInFolder(path);
});

severus.logOnLog((level, message) => {
  switch (level) {
    case "ERROR":
      log.error(message);
      break;
    case "WARN":
      log.warn(message);
      break;
    case "INFO":
      log.info(message);
      break;
    case "DEBUG":
      log.debug(message);
      break;
    case "TRACE":
      log.silly(message);
      break;
    default:
      log.warn("Log level not implemented", level);
  }
});
