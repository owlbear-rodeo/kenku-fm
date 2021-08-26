import dotenv from "dotenv";
import Eris from "eris";

dotenv.config();

var bot = Eris(process.env.TOKEN);

var message = "hello";

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
});

bot.connect();

window.onbeforeunload = () => {
  bot.disconnect({ reconnect: false });
};

export const api = {
  updateMessage: (newMessage: string) => {
    message = newMessage;
  },
};
