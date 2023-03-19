import fetch from "node-fetch";
import net from "net";
import { spawn } from "child_process";
import { join } from "path";
import { app } from "electron";

async function getFreePort(): Promise<string> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(`${port}`));
    });
  });
}

let port: string = "";
export async function runDisgo() {
  port = await getFreePort();
  let disgoPath;
  if (app.isPackaged) {
    disgoPath = join(__dirname, "disgo");
  } else {
    disgoPath = join("disgo", "disgo");
  }
  const disgo = spawn(disgoPath, [port]);
  disgo.stdout.on("data", (data) => {
    console.log(`disgo: ${data}`);
  });
  app.on("before-quit", () => discordClose().catch(() => {}));
  process.on("exit", () => disgo.kill());
}

export async function startDiscord(token: string): Promise<void> {
  const response = await fetch(`http://localhost:${port}/disgo/discord/start`, {
    method: "POST",
    headers: {
      Authorization: token,
    },
  });

  if (response.ok) {
    console.log("Discord client created");
  }
}

export async function getDiscordInfo() {
  const response = await fetch(`http://localhost:${port}/disgo/get-info`);

  if (response.ok) {
    const body = await response.json();

    return body;
  }
}

export async function discordClose(): Promise<void> {
  await fetch(`http://localhost:${port}/disgo/close`);
}

export async function joinVoiceChannel(guildId: string, channelId: string) {
  const response = await fetch(`http://localhost:${port}/disgo/join`, {
    method: "POST",
    body: JSON.stringify({ guildId, channelId }),
  });

  if (response.ok) {
    console.log("ok");
  }
}

export async function leaveVoiceChannel(guildId: string, channelId: string) {
  await fetch(`http://localhost:${port}/disgo/leave`, {
    method: "POST",
    body: JSON.stringify({ guildId, channelId }),
  });
}

export async function signalWebRtc(offer: string) {
  const response = await fetch(`http://localhost:${port}/disgo/webrtc/signal`, {
    method: "POST",
    body: JSON.stringify({ offer }),
  });

  if (response.ok) {
    const res = await response.text();
    return res;
  }
}

export async function streamWebRtc() {
  const response = await fetch(`http://localhost:${port}/disgo/webrtc/stream`);

  if (response.ok) {
    console.log("ok");
  }
}
