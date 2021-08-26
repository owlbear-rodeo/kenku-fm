import dotenv from "dotenv";
import { ipcMain } from "electron";
import Eris from "eris";
import ytdl from "ytdl-core";

dotenv.config();

var bot = Eris(process.env.TOKEN);

var message = "hello";

const playCommand = "!play";

bot.on("ready", () => {
  console.log("Ready!");
});

bot.on("error", (err) => {
  console.error(err);
});

bot.on("messageCreate", (msg) => {
  if (msg.content === "!hello") {
    bot.createMessage(msg.channel.id, message);
  }
  if (msg.content.startsWith(playCommand)) {
    // If the message content starts with "!play "
    if (msg.content.length <= playCommand.length + 1) {
      // Check if a filename was specified
      bot.createMessage(msg.channel.id, "Please specify a filename.");
      return;
    }
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
    const url = msg.content.substring(playCommand.length + 1); // Get the filename
    bot
      .joinVoiceChannel(msg.member.voiceState.channelID)
      .catch((err) => {
        // Join the user's voice channel
        bot.createMessage(
          msg.channel.id,
          "Error joining voice channel: " + err.message
        ); // Notify the user if there is an error
        console.log(err); // Log the error
      })
      .then((connection) => {
        if (connection) {
          if (connection.playing) {
            // Stop playing if the connection is playing something
            connection.stopPlaying();
          }
          connection.play(ytdl(url, { quality: "highestaudio" }));
          bot.createMessage(msg.channel.id, `Now playing **${url}**`);
          connection.once("end", () => {
            bot.createMessage(msg.channel.id, `Finished **${url}**`);
          });
        }
      });
  }
});

bot.connect();

ipcMain.on("update-message", (_, arg) => {
  message = arg;
});
