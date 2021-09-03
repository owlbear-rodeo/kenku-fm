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
    await client.login(token);
  } catch (err) {
    event.reply('error', `Error connecting to bot ${err.message}`);
  }
});

ipcMain.on('disconnect', async (event) => {
  client.voice?.connections.forEach((connection) => {
    connection.disconnect();
  });
  event.reply('voiceChannels', [{ id: 'local', name: 'This Computer' }]);
  event.reply('channelJoined', 'local');
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
      connection.once('disconnect', () => {
        event.reply('channelLeft', channelId);
      });
      event.reply('channelJoined', channelId);
    }
  }
});

ipcMain.on('play', async (event, url, id) => {
  if (!client.voice) {
    event.reply('error', 'No voice connection available');
    event.reply('stop', id);
    return;
  }

  const valid = ytdl.validateURL(url);
  if (!valid) {
    event.reply('error', 'Invalid url');
    event.reply('stop', id);
    return;
  }

  const dispatcher = await broadcasts.play(url);

  event.reply('play', id);

  dispatcher.once('finish', () => {
    event.reply('finish', id);
  });
});

ipcMain.on('pause', (event, id) => {
  broadcasts.pause();
  event.reply('pause', id);
});

ipcMain.on('resume', (event, id) => {
  broadcasts.resume();
  event.reply('play', id);
});

ipcMain.on('stop', (event, id) => {
  broadcasts.stop();
  event.reply('stop', id);
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
