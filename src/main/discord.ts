import { ipcMain, app } from 'electron';
import Discord from 'discord.js';
import ytdl from 'ytdl-core-discord';

const client = new Discord.Client();
const broadcasts: Record<string, Discord.VoiceBroadcast> = {};

client.on('message', async (msg) => {
  if (msg.content === '!join') {
    if (!msg.guild) {
      // Check if the message was sent in a guild
      msg.reply('This command can only be run in a server.');
      return;
    }
    if (!msg.member.voice.channel) {
      // Check if the user is in a voice channel
      msg.reply('You are not in a voice channel.');
      return;
    }
    await msg.member.voice.channel.join();
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
  // TODO: Check client ready

  let broadcast: Discord.VoiceBroadcast;
  if (id in broadcasts) {
    broadcast = broadcasts[id];
  } else {
    broadcast = client.voice.createBroadcast();
    broadcasts[id] = broadcast;
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

  client.voice.connections.forEach((connection) => {
    connection.play(broadcast);
  });

  event.reply('play', id);
  event.reply('message', `Now playing ${info.videoDetails.title}`);

  dispatcher.on('finish', () => {
    event.reply('stop', id);
    event.reply('message', `Finished ${info.videoDetails.title}`);
  });
});

ipcMain.on('stop', (event, id) => {
  event.reply('stop', id);
  if (broadcasts[id]) {
    broadcasts[id].dispatcher.pause();
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
