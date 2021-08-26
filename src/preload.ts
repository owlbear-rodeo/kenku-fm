import { api } from "./discord";
import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("discord", api);
