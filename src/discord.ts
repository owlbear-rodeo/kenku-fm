import { ipcMain } from "electron";
import Eris from "eris";
import ytdl from "ytdl-core";

var bot: Eris.Client | null = null;
var currentVoiceConnection: Eris.VoiceConnection | null = null;

ipcMain.on("connect", (event, token) => {
  if (bot) {
    bot.disconnect({ reconnect: false });
  }
  if (!token) {
    event.reply("disconnect");
    event.reply("error", "Error connecting to bot: invalid token");
    return;
  }
  bot = Eris(token);

  bot.on("ready", () => {
    event.reply("ready");
    event.reply("message", "Connected");
  });

  bot.on("error", (err) => {
    event.reply("error", "Error connecting to bot " + err.message);
    console.error(err);
    bot.disconnect({ reconnect: false });
  });

  bot.on("disconnect", () => {
    event.reply("disconnect");
    event.reply("stopAll");
    event.reply("message", "Disconnected");
    bot = null;
    currentVoiceConnection = null;
  });

  bot.on("messageCreate", (msg) => {
    if (msg.content.startsWith("!join")) {
      if (!(msg.channel as any).guild) {
        // Check if the message was sent in a guild
        bot.createMessage(
          msg.channel.id,
          "This command can only be run in a server."
        );
        return;
      }
      if (!msg.member.voiceState.channelID) {
        // Check if the user is in a voice channel
        bot.createMessage(msg.channel.id, "You are not in a voice channel.");
        return;
      }
      bot
        .joinVoiceChannel(msg.member.voiceState.channelID)
        .catch((err) => {
          bot.createMessage(
            msg.channel.id,
            "Error joining voice channel: " + err.message
          ); // Notify the user if there is an error
          console.log(err); // Log the error      console.log(err); // Log the error
        })
        .then((connection) => {
          currentVoiceConnection = connection || null;
        });
    }
  });

  bot.on("voiceChannelLeave", () => {
    currentVoiceConnection = null;
  });

  bot.connect();
});

ipcMain.on("play", async (event, url, id) => {
  if (!bot) {
    event.reply(
      "error",
      "Not connected please update token in connection menu"
    );
    event.reply("stop", id);
    return;
  }
  if (!currentVoiceConnection) {
    event.reply(
      "error",
      "Not in a voice channel use !join to add bot to a voice channel"
    );
    event.reply("stop", id);
    return;
  }
  if (currentVoiceConnection.playing) {
    // Stop playing if the connection is playing something
    currentVoiceConnection.stopPlaying();
  }
  const valid = ytdl.validateURL(url);
  if (!valid) {
    event.reply("error", "Invalid url");
    event.reply("stop", id);
    return;
  }
  const info = await ytdl.getInfo(url);
  const stream = ytdl.downloadFromInfo(info, { quality: "highestaudio" });
  currentVoiceConnection.play(stream);
  event.reply("play", id);
  event.reply("message", `Now playing ${info.videoDetails.title}`);
  currentVoiceConnection.once("end", () => {
    event.reply("stop", id);
    event.reply("message", `Finished ${info.videoDetails.title}`);
  });
});

ipcMain.on("stop", (event, id) => {
  if (!currentVoiceConnection) {
    event.reply("error", "No voice connection to stop");
    return;
  }
  if (currentVoiceConnection.playing) {
    currentVoiceConnection.stopPlaying();
  }
});

ipcMain.on("getInfo", async (event, url, id) => {
  const valid = ytdl.validateURL(url);
  if (valid) {
    const info = await ytdl.getBasicInfo(url);
    event.reply("info", info.videoDetails.title, id);
  }
});

ipcMain.on("validateUrl", async (event, url, id) => {
  const valid = ytdl.validateURL(url);
  event.reply("validation", valid, id);
});

export default bot;
