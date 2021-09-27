import { ipcMain, app } from "electron";
import Discord, { VoiceConnection } from "@owlbear-rodeo/discord.js";

type VoiceChannel = {
  id: string;
  name: string;
};

type Guild = {
  id: string;
  name: string;
  icon: string;
  voiceChannels: VoiceChannel[];
};

export class DiscordBroadcast {
  client: Discord.Client;
  broadcast: Discord.VoiceBroadcast;
  constructor() {
    this.client = new Discord.Client();
    if (this.client.voice) {
      this.broadcast = this.client.voice.createBroadcast();
    } else {
      throw Error("No voice available for discord client");
    }
    ipcMain.on("DISCORD_CONNECT", this._handleConnect);
    ipcMain.on("DISCORD_DISCONNECT", this._handleDisconnect);
    ipcMain.on("DISCORD_JOIN_CHANNEL", this._handleJoinChannel);
  }

  destroy() {
    ipcMain.off("DISCORD_CONNECT", this._handleConnect);
    ipcMain.off("DISCORD_DISCONNECT", this._handleDisconnect);
    ipcMain.off("DISCORD_JOIN_CHANNEL", this._handleJoinChannel);
    this.client.destroy();
  }

  _handleConnect = async (event: Electron.IpcMainEvent, token: string) => {
    if (!token) {
      event.reply("DISCORD_DISCONNECTED");
      event.reply("ERROR", "Error connecting to bot: Invalid token");
      return;
    }

    try {
      const onReady = async () => {
        event.reply("DISCORD_READY");
        event.reply("MESSAGE", "Connected");
        let guilds: Guild[] = [];
        for (let guild of this.client.guilds.cache.array()) {
          const preview = await this.client.fetchGuildPreview(guild);
          let voiceChannels: VoiceChannel[] = [];
          guild.channels.cache.forEach((channel) => {
            if (channel.type === "voice") {
              voiceChannels.push({
                id: channel.id,
                name: channel.name,
              });
            }
          });
          guilds.push({
            id: guild.id,
            name: preview.name,
            icon: preview.iconURL(),
            voiceChannels,
          });
        }
        event.reply("DISCORD_GUILDS", guilds);
      };
      const ready = this.client.readyTimestamp !== null;
      if (!ready) {
        this.client.once("ready", onReady);
      }
      await this.client.login(token);
      if (ready) {
        await onReady();
      }
    } catch (err) {
      event.reply("DISCORD_DISCONNECTED");
      event.reply("ERROR", `Error connecting to bot: ${err.message}`);
    }
  };

  _handleDisconnect = async (event: Electron.IpcMainEvent) => {
    this.client.voice?.connections.forEach((connection) => {
      connection.disconnect();
    });
    event.reply("DISCORD_DISCONNECTED");
    event.reply("DISCORD_GUILDS", []);
    event.reply("DISCORD_CHANNEL_JOINED", "local");
    this.client.destroy();
  };

  _handleJoinChannel = async (
    event: Electron.IpcMainEvent,
    channelId: string
  ) => {
    this.client.voice?.connections.forEach((connection) => {
      connection.disconnect();
    });
    if (channelId !== "local") {
      const channel = await this.client.channels.fetch(channelId);
      if (channel instanceof Discord.VoiceChannel) {
        try {
          const connection = await channel.join();
          connection.play(this.broadcast);
          event.reply("DISCORD_CHANNEL_JOINED", channelId);
        } catch {
          event.reply("DISCORD_CHANNEL_LEFT", channelId);
        }
      }
    }
  };
}
