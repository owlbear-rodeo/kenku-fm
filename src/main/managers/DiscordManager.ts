import { BrowserWindow, ipcMain } from "electron";
import log from "electron-log/main";
import { AudioCaptureManagerMain } from "./AudioCaptureManagerMain";
import { Gateway } from "../../discord/gateway/Gateway";
import { CDN_URL } from "../../discord/constants";
import { VoiceConnection } from "../../discord/voice/VoiceConnection";
import severus, { VoiceConnection as SeverusVoiceConnection } from "severus";

interface VoiceChannel {
  id: string;
  name: string;
}

interface Guild {
  id: string;
  name: string;
  icon: string;
  voiceChannels: VoiceChannel[];
}

type DualConnection = {
  node: VoiceConnection;
  rust?: SeverusVoiceConnection;
};

export class DiscordManager {
  window: BrowserWindow;
  gateway?: Gateway;
  audio: AudioCaptureManagerMain;
  voiceConnections: Record<string, DualConnection> = {};

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
    if (this.gateway) {
      this.gateway.disconnect();
    }
    this.gateway = undefined;
    for (const connection of Object.values(this.voiceConnections)) {
      connection.node.disconnect();
      if (connection.rust) {
        severus.voiceConnectionDisconnect(connection.rust);
      }
    }
    this.voiceConnections = {};
    this.audio = undefined;
  }

  _handleConnect = async (event: Electron.IpcMainEvent, token: string) => {
    if (!token) {
      event.reply("DISCORD_DISCONNECTED");
      event.reply("ERROR", "Error connecting to bot: Invalid token");
      return;
    }

    if (this.gateway) {
      event.reply("DISCORD_DISCONNECTED");
      event.reply("ERROR", "Error connecting to bot: Already collected");
      return;
    }

    try {
      this.gateway = new Gateway(token);
      event.reply("DISCORD_READY");
      event.reply("MESSAGE", "Connected");
      log.debug("discord manager ready");

      this.gateway.on("error", (error) => {
        event.reply("DISCORD_DISCONNECTED");
        event.reply("ERROR", `Discord error: ${error?.message}`);
        log.error("discord manager gateway error", error?.message);
      });

      this.gateway.on("guilds", (guilds) => {
        const transformedGuilds: Guild[] = [];
        for (const guild of guilds) {
          transformedGuilds.push({
            id: guild.id,
            icon: `${CDN_URL}/icons/${guild.id}/${guild.icon}.webp`,
            name: guild.name,
            voiceChannels: guild.channels
              .filter((channel) => Boolean(channel.bitrate))
              .map((channel) => ({ id: channel.id, name: channel.name })),
          });
        }
        event.reply("DISCORD_GUILDS", transformedGuilds);
      });

      await this.gateway.connect();
    } catch (err) {
      event.reply("DISCORD_DISCONNECTED");
      event.reply("ERROR", `Error connecting to bot: ${err?.message}`);
      log.error("discord manager connect error", err?.message);
    }
  };

  _handleDisconnect = async (event: Electron.IpcMainEvent) => {
    event.reply("DISCORD_DISCONNECTED");
    event.reply("DISCORD_GUILDS", []);
    event.reply("DISCORD_CHANNEL_JOINED", "local");
    if (this.gateway) {
      this.gateway.disconnect();
      this.gateway = undefined;
    }
    log.debug("discord manager disconnect");
  };

  _handleJoinChannel = async (
    event: Electron.IpcMainEvent,
    channelId: string,
    guildId: string
  ) => {
    const handleError = async (error: any) => {
      event.reply("DISCORD_CHANNEL_LEFT", channelId);
      event.reply("ERROR", `Voice channel error: ${error?.message}`);
      log.error("discord manager channel error", error?.message);
      const connection = this.voiceConnections[guildId];
      if (connection) {
        delete this.voiceConnections[guildId];
        await connection.node.disconnect();
        if (connection.rust) {
          await severus.voiceConnectionDisconnect(connection.rust);
        }
      }
    };

    try {
      if (!this.audio.rtc) {
        throw Error("Audio capture not running");
      }
      if (!this.audio.streaming) {
        throw Error("Audio stream not running");
      }
      if (!this.gateway) {
        throw Error("Discord client not ready");
      }

      const connection = this.voiceConnections[guildId];
      if (connection) {
        log.debug("leaving guild", guildId);

        delete this.voiceConnections[guildId];
        await connection.node.disconnect();
        if (connection.rust) {
          await severus.voiceConnectionDisconnect(connection.rust);
        }
      }

      log.debug("joining channel", channelId, "in guild", guildId);

      const nodeConnection = new VoiceConnection(guildId, this.gateway);
      this.voiceConnections[guildId] = { node: nodeConnection };

      nodeConnection.on("error", handleError);

      nodeConnection.on("ready", async (data) => {
        try {
          if (!data.modes.includes("xsalsa20_poly1305")) {
            throw Error("Invalid encryption mode");
          }
          nodeConnection.updateSpeaking({
            speaking: 1 << 1,
            delay: 0,
            ssrc: data.ssrc,
          });
          const rustConnection = await severus.voiceConnectionNew(
            data.ip,
            data.port,
            data.ssrc
          );
          this.voiceConnections[guildId].rust = rustConnection;
          const ip = await severus.voiceConnectionDiscoverIp(rustConnection);
          nodeConnection.selectProtocol({
            protocol: "udp",
            data: {
              address: ip.address,
              port: ip.port,
              mode: "xsalsa20_poly1305",
            },
          });
        } catch (error) {
          handleError(error);
        }
      });
      nodeConnection.on("session", async (session) => {
        try {
          if (!this.audio.rtc) {
            throw Error("Unable to start session: audio capture not running");
          }
          const rustConnection = this.voiceConnections[guildId].rust;
          if (!rustConnection) {
            throw Error("Unable to start session: no udp connection found");
          }
          await severus.voiceConnectionConnect(
            rustConnection,
            session.secret_key,
            this.audio.rtc
          );
        } catch (error) {
          handleError(error);
        }
      });
      await nodeConnection.connect(channelId);

      event.reply("DISCORD_CHANNEL_JOINED", channelId);
    } catch (error) {
      handleError(error);
    }
  };

  _handleLeaveChannel = async (
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
        await connection.node.disconnect();
        if (connection.rust) {
          await severus.voiceConnectionDisconnect(connection.rust);
        }
      }
    } catch (err) {
      event.reply("ERROR", `Error leaving channel: ${err?.message}`);
      log.error("discord manager channel leave error", err?.message);
    }
    event.reply("DISCORD_CHANNEL_LEFT", channelId);
  };
}
