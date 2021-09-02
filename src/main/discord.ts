import { ipcMain, app } from 'electron';
import Discord from 'discord.js';
import ytdl from 'ytdl-core';
import Hapi from '@hapi/hapi';
import { PassThrough } from 'stream';
import { BroadcastManager } from './BroadcastManager';

const client = new Discord.Client();
const broadcasts = new BroadcastManager(client);

const server = Hapi.server({
  port: 3333,
  address: 'localhost',
});

server.route({
  method: 'GET',
  path: '/stream',
  handler: (request, h) => {
    const listener = new PassThrough();
    broadcasts.local.add(listener);
    request.events.once('disconnect', () => {
      broadcasts.local.remove(listener);
    });
    return h.response(listener).type('audio/mpeg');
  },
  options: {
    cors: {
      origin: ['*'],
    },
  },
});

server.route({
  method: 'GET',
  path: '/',
  handler: (_, h) => {
    return h
      .response(
        `
      <!DOCTYPE html>
<html>
<head>
    <title>Audio</title>
</head>
<body>
  <audio src="/stream" preload="none" controls autoplay></audio>
</body>
</html>
      `
      )
      .type('text/html');
  },
});

server.start();

ipcMain.on('connect', async (event, token) => {
  if (!token) {
    event.reply('disconnect');
    event.reply('error', 'Error connecting to bot: invalid token');
    return;
  }

  try {
    await client.login(token);
    client.once('ready', () => {
      event.reply('ready');
      event.reply('message', 'Connected');
      const voiceChannels = [{ id: 'local', name: 'This Computer' }];
      client.channels.cache.forEach((channel) => {
        if (channel.type === 'voice') {
          voiceChannels.push({ id: channel.id, name: (channel as any).name });
        }
      });
      event.reply('voiceChannels', voiceChannels);
    });
  } catch (err) {
    event.reply('error', `Error connecting to bot ${err.message}`);
  }
});

ipcMain.on('joinChannel', async (event, channelId) => {
  client.voice?.connections.forEach((connection) => {
    connection.disconnect();
  });
  if (channelId !== 'local') {
    const channel = await client.channels.fetch(channelId);
    if (channel instanceof Discord.VoiceChannel) {
      const connection = await channel.join();
      connection.play(broadcasts.discord);
      event.reply('channelJoined', channelId);
    }
  }
});

ipcMain.on('play', async (event, url, id) => {
  if (!client.voice) {
    event.reply('error', 'No broadcast available');
    event.reply('stop', id);
    return;
  }

  // Resume if already playing this track
  if (broadcasts.playId === id) {
    event.reply('play', id);
    broadcasts.resume();
    return;
  }

  const valid = ytdl.validateURL(url);
  if (!valid) {
    event.reply('error', 'Invalid url');
    event.reply('stop', id);
    return;
  }
  const info = await ytdl.getInfo(url);
  const stream = ytdl.downloadFromInfo(info, { filter: 'audioonly' });
  const dispatcher = broadcasts.play(stream, id);

  event.reply('play', id);
  event.reply('message', `Now playing ${info.videoDetails.title}`);

  dispatcher.on('finish', () => {
    event.reply('stop', id);
    event.reply('message', `Finished ${info.videoDetails.title}`);
  });
});

ipcMain.on('pause', (event, id) => {
  event.reply('pause', id);
  broadcasts.pause();
});

ipcMain.on('getInfo', async (event, url, id) => {
  const valid = ytdl.validateURL(url);
  if (valid) {
    const info = await ytdl.getBasicInfo(url);
    event.reply('info', info.videoDetails.title, id);
  }
});

ipcMain.on('validateUrl', async (event, url, id) => {
  const valid = ytdl.validateURL(url);
  event.reply('validation', valid, id);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  client?.destroy();
});

app.on('quit', () => {
  client?.destroy();
});
