import { ipcMain, app } from 'electron';
import Discord from 'discord.js';

export class DiscordBroadcast {
  client: Discord.Client;
  broadcast: Discord.VoiceBroadcast;
  constructor() {
    this.client = new Discord.Client();
    if (this.client.voice) {
      this.broadcast = this.client.voice.createBroadcast();
    } else {
      throw Error('No voice available for discord client');
    }
    ipcMain.on('connect', this.handleConnect);

    ipcMain.on('disconnect', this.handleDisconnect);

    ipcMain.on('joinChannel', this.handleJoinChannel);

    app.on('window-all-closed', () => {
      this.client.destroy();
    });

    app.on('quit', () => {
      this.client.destroy();
    });
  }

  handleConnect = async (event: Electron.IpcMainEvent, token: string) => {
    if (!token) {
      event.reply('disconnect');
      event.reply('error', 'Error connecting to bot: invalid token');
      return;
    }

    try {
      this.client.once('ready', () => {
        event.reply('ready');
        event.reply('message', 'Connected');
        const voiceChannels = [{ id: 'local', name: 'This Computer' }];
        this.client.channels.cache.forEach((channel) => {
          if (channel.type === 'voice') {
            voiceChannels.push({ id: channel.id, name: (channel as any).name });
          }
        });
        event.reply('voiceChannels', voiceChannels);
      });
      await this.client.login(token);
    } catch (err) {
      event.reply('error', `Error connecting to bot ${err.message}`);
    }
  };

  handleDisconnect = async (event: Electron.IpcMainEvent) => {
    this.client.voice?.connections.forEach((connection) => {
      connection.disconnect();
    });
    event.reply('voiceChannels', [{ id: 'local', name: 'This Computer' }]);
    event.reply('channelJoined', 'local');
  };

  handleJoinChannel = async (
    event: Electron.IpcMainEvent,
    channelId: string
  ) => {
    this.client.voice?.connections.forEach((connection) => {
      connection.disconnect();
    });
    if (channelId !== 'local') {
      const channel = await this.client.channels.fetch(channelId);
      if (channel instanceof Discord.VoiceChannel) {
        const connection = await channel.join();
        connection.play(this.broadcast);
        connection.once('disconnect', () => {
          event.reply('channelLeft', channelId);
        });
        event.reply('channelJoined', channelId);
      }
    }
  };
}
