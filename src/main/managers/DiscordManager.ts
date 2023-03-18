import { BrowserWindow, ipcMain } from "electron";
import severus, { DiscordClient } from "severus";
import { AudioCaptureManagerMain } from "./AudioCaptureManagerMain";

export class DiscordManager {
  window: BrowserWindow;
  client?: DiscordClient;
  audio: AudioCaptureManagerMain;

  constructor(window: BrowserWindow, audio: AudioCaptureManagerMain) {
    this.window = window;
    this.audio = audio;
    ipcMain.on("DISCORD_CONNECT", this._handleConnect);
    ipcMain.on("DISCORD_DISCONNECT", this._handleDisconnect);
    ipcMain.on("DISCORD_JOIN_CHANNEL", this._handleJoinChannel);
    ipcMain.on("DISCORD_LEAVE_CHANNEL", this._handleLeaveChannel);
  }

  destroy() {
    ipcMain.off("DISCORD_CONNECT", this._handleConnect);
    ipcMain.off("DISCORD_DISCONNECT", this._handleDisconnect);
    ipcMain.off("DISCORD_JOIN_CHANNEL", this._handleJoinChannel);
    ipcMain.off("DISCORD_LEAVE_CHANNEL", this._handleLeaveChannel);
    severus.discordDestroy(this.client);
    this.client = undefined;
    this.audio = undefined;
  }

  _handleConnect = async (event: Electron.IpcMainEvent, token: string) => {
    if (!token) {
      event.reply("DISCORD_DISCONNECTED");
      event.reply("ERROR", "Error connecting to bot: Invalid token");
      return;
    }

    if (this.client) {
      event.reply("DISCORD_DISCONNECTED");
      event.reply("ERROR", "Error connecting to bot: Already collected");
      return;
    }

    try {
      this.client = await severus.discordNew(token);
      event.reply("DISCORD_READY");
      event.reply("MESSAGE", "Connected");
      const guilds = await severus.discordGetInfo(this.client);
      event.reply("DISCORD_GUILDS", guilds);
    } catch (err) {
      event.reply("DISCORD_DISCONNECTED");
      event.reply("ERROR", `Error connecting to bot: ${err?.message}`);
    }
  };

  _handleDisconnect = async (event: Electron.IpcMainEvent) => {
    event.reply("DISCORD_DISCONNECTED");
    event.reply("DISCORD_GUILDS", []);
    event.reply("DISCORD_CHANNEL_JOINED", "local");
    if (this.client) {
      severus.discordDestroy(this.client);
      this.client = undefined;
    }
  };

  _handleJoinChannel = async (
    event: Electron.IpcMainEvent,
    channelId: string,
    guildId: string
  ) => {
    try {
      if (!this.audio.rtc) {
        throw Error("Audio capture not running");
      }
      if (!this.client) {
        throw Error("Discord client not ready");
      }
      await severus.discordJoin(
        this.client,
        this.audio.rtc,
        guildId,
        channelId
      );
      event.reply("DISCORD_CHANNEL_JOINED", channelId);
    } catch (err) {
      event.reply("DISCORD_CHANNEL_LEFT", channelId);
      event.reply("ERROR", `Error joining channel: ${err?.message}`);
    }
  };

  _handleLeaveChannel = async (
    event: Electron.IpcMainEvent,
    channelId: string,
    guildId: string
  ) => {
    try {
      if (!this.client) {
        throw Error("Discord client not ready");
      }
      await severus.discordLeave(this.client, guildId);
    } catch (err) {
      event.reply("ERROR", `Error leaving channel: ${err?.message}`);
    }
    event.reply("DISCORD_CHANNEL_LEFT", channelId);
  };

  _handleBroadcastError = (error: Error) => {
    this.window.webContents.send("ERROR", error.message);
    console.error(error);
  };
}
