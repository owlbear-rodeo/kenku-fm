import { ipcMain, app } from 'electron';
import Discord from 'discord.js';
import ytdl from 'ytdl-core-discord';
import Hapi from '@hapi/hapi';
import { LocalDispatcher } from './LocalDispatcher';

const client = new Discord.Client();
const broadcast = client.voice?.createBroadcast();

const server = Hapi.server({
  port: 3333,
  host: 'localhost',
});

server.route({
  method: 'GET',
  path: '/stream',
  handler: (_, h) => {
    if (broadcast) {
      const dispatcher = new LocalDispatcher(undefined, { broadcast });
      (broadcast as any).add(dispatcher);
      return h.response(dispatcher.output).type('audio/mpeg');
    } else {
      return h.response();
    }
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

client.on('message', async (msg) => {
  if (msg.content === '!join') {
    if (!msg.guild) {
      // Check if the message was sent in a guild
      msg.reply('This command can only be run in a server.');
      return;
    }
    if (!msg.member) {
      msg.reply('This command can only be run by a user.');
      return;
    }
    if (!msg.member.voice.channel) {
      // Check if the user is in a voice channel
      msg.reply('You are not in a voice channel.');
      return;
    }
    if (!broadcast) {
      msg.reply('Error: No broadcast available.');
      return;
    }
    const connection = await msg.member.voice.channel.join();
    connection.play(broadcast);
  }
});

ipcMain.on('connect', async (event, token) => {
  if (!token) {
    event.reply('disconnect');
    event.reply('error', 'Error connecting to bot: invalid token');
    return;
  }
  try {
    await client.login(token);
    event.reply('ready');
    event.reply('message', 'Connected');
  } catch (err) {
    event.reply('error', 'Error connecting to bot ' + err.message);
  }
});

ipcMain.on('play', async (event, url, id) => {
  if (!broadcast || !client.voice) {
    event.reply('error', 'No broadcast available');
    event.reply('stop', id);
    return;
  }

  const valid = ytdl.validateURL(url);
  if (!valid) {
    event.reply('error', 'Invalid url');
    event.reply('stop', id);
    return;
  }
  const info = await ytdl.getInfo(url);
  const stream = await ytdl(url);
  const dispatcher = broadcast.play(stream, { type: 'opus' });

  event.reply('play', id);
  event.reply('message', `Now playing ${info.videoDetails.title}`);

  dispatcher.on('finish', () => {
    event.reply('stop', id);
    event.reply('message', `Finished ${info.videoDetails.title}`);
  });
});

ipcMain.on('stop', (event, id) => {
  event.reply('stop', id);
  if (broadcast) {
    broadcast.dispatcher?.pause();
  }
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
