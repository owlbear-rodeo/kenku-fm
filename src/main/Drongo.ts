import fetch from "node-fetch";

export async function getDiscordInfo() {
  const response = await fetch("http://localhost:8091/drongo/get-info");

  if (response.ok) {
    const body = await response.json();

    console.log("body", JSON.stringify(body, null, 2));

    return body;
  }
}

export async function discordClose() {
  const response = await fetch("http://localhost:8091/drongo/close");
}

export async function joinVoiceChannel(guildId: string, channelId: string) {
  const response = await fetch("http://localhost:8091/drongo/join", {
    method: "POST",
    body: JSON.stringify({ guildId, channelId }),
  });

  if (response.ok) {
    console.log("ok");
  }

  const res = await response.text();

  console.log("res", res);
}

export async function leaveVoiceChannel(guildId: string, channelId: string) {
  const response = await fetch("http://localhost:8091/drongo/leave", {
    method: "POST",
    body: JSON.stringify({ guildId, channelId }),
  });

  const res = await response.text();

  console.log("res", res);
}

export async function signalWebRtc(offer: string) {
  const response = await fetch("http://localhost:8091/drongo/webrtc/signal", {
    method: "POST",
    body: JSON.stringify({ offer }),
  });

  if (response.ok) {
    const res = await response.text();
    return res;
  }
}

export async function streamWebRtc() {
  const response = await fetch("http://localhost:8091/drongo/webrtc/stream");

  if (response.ok) {
    console.log("ok");
  }
}
