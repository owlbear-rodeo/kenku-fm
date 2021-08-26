import { contextBridge } from "electron";
import { ipcRenderer } from "electron";

const api = {
  updateMessage: (newMessage: string) => {
    ipcRenderer.send("update-message", newMessage);
  },
};

contextBridge.exposeInMainWorld("discord", api);
