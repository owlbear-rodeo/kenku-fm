import fetch from "node-fetch";

export async function getDiscordInfo() {
  const response = await fetch("http://localhost:8091/disgo/get-info");

  if (response.ok) {
    const body = await response.json();

    return body;
  }
}

export async function discordClose(): Promise<void> {
  await fetch("http://localhost:8091/disgo/close");
}

export async function joinVoiceChannel(guildId: string, channelId: string) {
  const response = await fetch("http://localhost:8091/disgo/join", {
    method: "POST",
    body: JSON.stringify({ guildId, channelId }),
  });

  if (response.ok) {
    console.log("ok");
  }
}

export async function leaveVoiceChannel(guildId: string, channelId: string) {
  await fetch("http://localhost:8091/disgo/leave", {
    method: "POST",
    body: JSON.stringify({ guildId, channelId }),
  });
}

export async function signalWebRtc(offer: string) {
  const response = await fetch("http://localhost:8091/disgo/webrtc/signal", {
    method: "POST",
    body: JSON.stringify({ offer }),
  });

  if (response.ok) {
    const res = await response.text();
    return res;
  }
}

export async function streamWebRtc() {
  const response = await fetch("http://localhost:8091/disgo/webrtc/stream");

  if (response.ok) {
    console.log("ok");
  }
}
