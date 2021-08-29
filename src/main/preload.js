const { contextBridge, ipcRenderer, IpcRendererEvent } = require('electron');

const validChannels = [
  'error',
  'message',
  'info',
  'validation',
  'play',
  'stop',
  'stopAll',
  'ready',
  'disconnect',
];

const api = {
  connect: (token) => {
    ipcRenderer.send('connect', token);
  },
  play: (url, id) => {
    ipcRenderer.send('play', url, id);
  },
  stop: (id) => {
    ipcRenderer.send('stop', id);
  },
  on: (channel, callback) => {
    if (validChannels.includes(channel)) {
      const newCallback = (_, ...args) => callback(args);
      ipcRenderer.on(channel, newCallback);
    }
  },
  removeAllListeners: (channel) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  getInfo: (url, id) => {
    ipcRenderer.send('getInfo', url, id);
  },
  validateUrl: (url, id) => {
    ipcRenderer.send('validateUrl', url, id);
  },
};

// declare global {
//   interface Window {
//     discord: typeof api;
//   }
// }

contextBridge.exposeInMainWorld('discord', api);
