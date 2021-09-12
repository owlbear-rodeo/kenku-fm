import { ipcMain, app } from "electron";
import Discord from "@owlbear-rodeo/discord.js";

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
    ipcMain.on("connect", this._handleConnect);
    ipcMain.on("disconnect", this._handleDisconnect);
    ipcMain.on("joinChannel", this._handleJoinChannel);
  }

  destroy() {
    ipcMain.off("connect", this._handleConnect);
    ipcMain.off("disconnect", this._handleDisconnect);
    ipcMain.off("joinChannel", this._handleJoinChannel);
    this.client.destroy();
  }

  _handleConnect = async (event: Electron.IpcMainEvent, token: string) => {
    if (!token) {
      event.reply("disconnect");
      event.reply("error", "Error connecting to bot: Invalid token");
      return;
    }

    try {
      const onReady = () => {
        event.reply("ready");
        event.reply("message", "Connected");
        const voiceChannels = [{ id: "local", name: "This Computer" }];
        this.client.channels.cache.forEach((channel) => {
          if (channel.type === "voice") {
            voiceChannels.push({ id: channel.id, name: (channel as any).name });
          }
        });
        event.reply("voiceChannels", voiceChannels);
      };
      const ready = this.client.readyTimestamp !== null;
      if (!ready) {
        this.client.once("ready", onReady);
      }
      await this.client.login(token);
      if (ready) {
        onReady();
      }
    } catch (err) {
      event.reply("disconnect");
      event.reply("error", `Error connecting to bot: ${err.message}`);
    }
  };

  _handleDisconnect = async (event: Electron.IpcMainEvent) => {
    this.client.voice?.connections.forEach((connection) => {
      connection.disconnect();
    });
    event.reply("disconnect");
    event.reply("voiceChannels", [{ id: "local", name: "This Computer" }]);
    event.reply("channelJoined", "local");
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
        const connection = await channel.join();
        connection.play(this.broadcast);
        connection.once("disconnect", () => {
          event.reply("channelLeft", channelId);
        });
        event.reply("channelJoined", channelId);
      }
    }
  };
}
