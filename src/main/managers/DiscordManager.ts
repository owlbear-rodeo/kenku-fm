import { ipcMain } from "electron";
import log from "electron-log/main";
import { AudioCaptureManagerMain } from "./AudioCaptureManagerMain";
import { Gateway, GatewayConnectionState } from "../../discord/gateway/Gateway";
import { VoiceConnection } from "../../discord/voice/VoiceConnection";

export class DiscordManager {
  private gateway?: Gateway;
  private audio: AudioCaptureManagerMain;
  private voiceConnections: Record<string, VoiceConnection> = {};

  constructor(audio: AudioCaptureManagerMain) {
    this.audio = audio;
    ipcMain.on("DISCORD_CONNECT", this.handleConnect);
    ipcMain.on("DISCORD_DISCONNECT", this.handleDisconnect);
    ipcMain.on("DISCORD_JOIN_CHANNEL", this.handleJoinChannel);
    ipcMain.on("DISCORD_LEAVE_CHANNEL", this.handleLeaveChannel);
  }

  destroy() {
    ipcMain.off("DISCORD_CONNECT", this.handleConnect);
    ipcMain.off("DISCORD_DISCONNECT", this.handleDisconnect);
    ipcMain.off("DISCORD_JOIN_CHANNEL", this.handleJoinChannel);
    ipcMain.off("DISCORD_LEAVE_CHANNEL", this.handleLeaveChannel);
    if (this.gateway) {
      this.gateway.disconnect();
    }
    this.gateway = undefined;
    for (const connection of Object.values(this.voiceConnections)) {
      connection.disconnect();
    }
    this.voiceConnections = {};
    this.audio = undefined;
  }

  private handleConnect = async (
    event: Electron.IpcMainEvent,
    token: string
  ) => {
    if (!token) {
      event.reply("DISCORD_DISCONNECTED");
      event.reply("ERROR", "Error connecting to bot: Token not found");
      return;
    }

    const handleError = (error: Error) => {
      log.error("discord manager error", error?.message);
      event.reply("DISCORD_DISCONNECTED");
      event.reply("ERROR", `Discord error: ${error?.message}`);
      event.reply("DISCORD_GUILDS", []);
      event.reply("DISCORD_CHANNEL_JOINED", "local");
      if (this.gateway) {
        this.gateway.disconnect();
        this.gateway = undefined;
      }
    };

    if (this.gateway) {
      handleError(Error("Already connected. Closing previous connection"));
      return;
    }

    try {
      const sanitisedToken = token.trim();
      this.gateway = new Gateway(sanitisedToken);
      this.gateway.on("error", handleError);

      // Keep track of ready state to avoid fetching guilds multiple times
      let ready = false;
      // Keep track of connected state to avoid sending multiple disconnected messages
      let connected = false;
      this.gateway.on("state", async (state) => {
        if (state === GatewayConnectionState.Ready) {
          try {
            if (!ready) {
              log.debug("discord manager ready");
              event.reply("DISCORD_READY");
            }
            if (!connected) {
              event.reply("MESSAGE", "Connected");
            }
            connected = true;
            ready = true;
          } catch (error) {
            handleError(error);
          }
        } else if (state === GatewayConnectionState.Disconnected) {
          if (connected) {
            event.reply("MESSAGE", "Disconnected");
          }
          connected = false;
        }
      });

      this.gateway.on("guilds", (guilds) => {
        log.debug("setting discord guilds", guilds);
        event.reply("DISCORD_GUILDS", guilds);
      });

      log.debug("discord manager connecting");
      await this.gateway.connect();
    } catch (error) {
      handleError(error);
    }
  };

  private handleDisconnect = async (event: Electron.IpcMainEvent) => {
    event.reply("DISCORD_DISCONNECTED");
    event.reply("DISCORD_GUILDS", []);
    event.reply("DISCORD_CHANNEL_JOINED", "local");
    if (this.gateway) {
      this.gateway.disconnect();
      this.gateway = undefined;
    }
    log.debug("discord manager disconnect");
  };

  private handleJoinChannel = async (
    event: Electron.IpcMainEvent,
    channelId: string,
    guildId: string
  ) => {
    try {
      const rtc = await this.audio.getRTCClient();
      if (!rtc) {
        throw Error("Audio capture not running");
      }
      if (!this.gateway) {
        throw Error("Discord client not ready");
      }

      const oldConnection = this.voiceConnections[guildId];
      if (oldConnection) {
        log.debug("leaving guild", guildId);
        delete this.voiceConnections[guildId];
        await oldConnection.disconnect();
      }

      log.debug("joining channel", channelId, "in guild", guildId);

      const connection = new VoiceConnection(
        guildId,
        this.gateway,
        this.audio.broadcast
      );
      this.voiceConnections[guildId] = connection;

      connection.on("error", async (error) => {
        log.error("discord manager channel error", error?.message);
        if (connection === this.voiceConnections[guildId]) {
          event.reply("DISCORD_CHANNEL_LEFT", channelId);
          event.reply("ERROR", `Voice channel error: ${error?.message}`);
          delete this.voiceConnections[guildId];
        }
        await connection.disconnect();
      });

      connection.on("close", async (code) => {
        log.error("discord manager channel closed", code);
        if (connection === this.voiceConnections[guildId]) {
          event.reply("DISCORD_CHANNEL_LEFT", channelId);
          event.reply("ERROR", `Voice channel closed with code: ${code}`);
          delete this.voiceConnections[guildId];
        }
        await connection.disconnect();
      });

      await connection.connect(channelId);
      event.reply("DISCORD_CHANNEL_JOINED", channelId);
    } catch (error) {
      event.reply("DISCORD_CHANNEL_LEFT", channelId);
      event.reply("ERROR", `Voice channel error: ${error?.message}`);
      log.error("discord manager join error", error?.message);
      const connection = this.voiceConnections[guildId];
      if (connection) {
        delete this.voiceConnections[guildId];
        await connection.disconnect();
      }
    }
  };

  private handleLeaveChannel = async (
    event: Electron.IpcMainEvent,
    channelId: string,
    guildId: string
  ) => {
    try {
      if (!this.gateway) {
        throw Error("Discord client not ready");
      }
      const connection = this.voiceConnections[guildId];
      if (connection) {
        log.debug("leaving channel", channelId, "in guild", guildId);

        delete this.voiceConnections[guildId];
        await connection.disconnect();
      }
      if (Object.keys(this.voiceConnections).length === 0) {
        this.audio.stopAndRemoveRTCClient();
      }
    } catch (err) {
      event.reply("ERROR", `Error leaving channel: ${err?.message}`);
      log.error("discord manager channel leave error", err?.message);
    }
    event.reply("DISCORD_CHANNEL_LEFT", channelId);
  };
}
