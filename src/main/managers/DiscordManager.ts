import { ipcMain } from "electron";
import log from "electron-log/main";
import { AudioCaptureManagerMain } from "./AudioCaptureManagerMain";
import { Gateway, GatewayConnectionState } from "../../discord/gateway/Gateway";
import { CDN_URL } from "../../discord/constants";
import { VoiceConnection } from "../../discord/voice/VoiceConnection";
import severus, { VoiceConnection as SeverusVoiceConnection } from "severus";
import { getGuildsAndVoiceChannels } from "../../discord/http/getGuildsAndVoiceChannels";

type DualConnection = {
  node: VoiceConnection;
  rust?: SeverusVoiceConnection;
};

export class DiscordManager {
  private gateway?: Gateway;
  private audio: AudioCaptureManagerMain;
  private voiceConnections: Record<string, DualConnection> = {};

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
      connection.node.disconnect();
      if (connection.rust) {
        severus.voiceConnectionDisconnect(connection.rust);
      }
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
      event.reply("ERROR", "Error connecting to bot: Invalid token");
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
      this.gateway = new Gateway(token);

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
              const guilds = await getGuildsAndVoiceChannels(
                token,
                this.gateway?.user?.id
              );
              event.reply("DISCORD_READY");
              event.reply("DISCORD_GUILDS", guilds);
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
      const rtc = await this.audio.getRTCClient();
      if (!rtc) {
        throw Error("Audio capture not running");
      }
      if (!this.audio.isStreaming()) {
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
          const rustConnection = this.voiceConnections[guildId].rust;
          if (!rustConnection) {
            throw Error("Unable to start session: no udp connection found");
          }
          await severus.voiceConnectionConnect(
            rustConnection,
            session.secret_key,
            this.audio.broadcast
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
        await connection.node.disconnect();
        if (connection.rust) {
          await severus.voiceConnectionDisconnect(connection.rust);
        }
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
