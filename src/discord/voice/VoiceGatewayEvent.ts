/**
 * @link https://discord.com/developers/docs/topics/opcodes-and-status-codes#voice-voice-opcodes
 */
export enum VoiceOpCode {
  /** Begin a voice websocket connection. */
  Identify = 0,
  /** Select the voice protocol. */
  SelectProtocol = 1,
  /** Complete the websocket handshake. */
  Ready = 2,
  /** Keep the websocket connection alive. */
  Heartbeat = 3,
  /** Describe the session. */
  SessionDescription = 4,
  /** Indicate which users are speaking. */
  Speaking = 5,
  /** Sent to acknowledge a received client heartbeat. */
  HeartbeatAck = 6,
  /** Resume a connection. */
  Resume = 7,
  /** Time to wait between sending heartbeats in milliseconds. */
  Hello = 8,
  /** Acknowledge a successful session resume. */
  Resumed = 9,
  /** A client has disconnected from the voice channel */
  ClientDisconnect = 13,
}

export interface BaseEvent {
  op: VoiceOpCode;
  d?: unknown;
  /** Event sequence */
  s?: number | null;
  t?: string | null;
}

/**
 * @link https://discord.com/developers/docs/topics/voice-connections#establishing-a-voice-websocket-connection-example-voice-identify-payload
 */
export interface IdentifyEvent extends BaseEvent {
  op: VoiceOpCode.Identify;
  d: {
    server_id: string;
    user_id: string;
    session_id: string;
    token: string;
  };
}

const DISCORD_VOICE_ENCRYPTION_MODES = [
  "aead_aes256_gcm_rtpsize",
  "aead_xchacha20_poly1305_rtpsize",
  "xsalsa20_poly1305_lite_rtpsize",
  "aead_aes256_gcm",
  "xsalsa20_poly1305",
  "xsalsa20_poly1305_suffix",
  "xsalsa20_poly1305_lite",
] as const;

export type DiscordVoiceEncryptionMode =
  (typeof DISCORD_VOICE_ENCRYPTION_MODES)[number];

export interface SelectProtocolEvent extends BaseEvent {
  op: VoiceOpCode.SelectProtocol;
  d: {
    protocol: string;
    data: {
      address: string;
      port: number;
      mode: DiscordVoiceEncryptionMode;
    };
  };
}

/**
 * @link https://discord.com/developers/docs/topics/voice-connections#establishing-a-voice-websocket-connection-example-voice-ready-payload
 */
export interface ReadyEvent extends BaseEvent {
  op: VoiceOpCode.Ready;
  d: {
    ssrc: number;
    ip: string;
    port: number;
    modes: DiscordVoiceEncryptionMode[];
  };
}

/**
 * @link https://discord.com/developers/docs/topics/voice-connections#heartbeating-example-heartbeat-payload
 */
export interface HeartbeatEvent extends BaseEvent {
  op: VoiceOpCode.Heartbeat;
  d: number;
}

/**
 * @link https://discord.com/developers/docs/topics/voice-connections#establishing-a-voice-udp-connection-example-session-description-payload
 */
export interface SessionDescriptionEvent extends BaseEvent {
  op: VoiceOpCode.SessionDescription;
  d: {
    video_codec: string;
    secure_frames_version: number;
    mode: DiscordVoiceEncryptionMode;
    secret_key: number[];
    media_session_id: string;
    dave_protocol_version: number;
    audio_codec: string;
  };
}

/**
 * @link https://discord.com/developers/docs/topics/voice-connections#speaking
 */
export interface SpeakingEvent extends BaseEvent {
  op: VoiceOpCode.Speaking;
  d: {
    speaking: number;
    delay: number;
    ssrc: number;
  };
}

/**
 * @link https://discord.com/developers/docs/topics/voice-connections#heartbeating-example-heartbeat-ack-payload
 */
export interface HeartbeatAckEvent extends BaseEvent {
  op: VoiceOpCode.HeartbeatAck;
  d: number;
}

/**
 * @link https://discord.com/developers/docs/topics/voice-connections#resuming-voice-connection
 */
export interface ResumeEvent extends BaseEvent {
  op: VoiceOpCode.Resume;
  d: {
    server_id: string;
    session_id: string;
    token: string;
  };
}

/**
 * @link https://discord.com/developers/docs/topics/voice-connections#heartbeating-example-hello-payload-since-v3
 */
export interface HelloEvent extends BaseEvent {
  op: VoiceOpCode.Hello;
  d: {
    heartbeat_interval: number;
  };
}

/**
 * @link https://discord.com/developers/docs/topics/voice-connections#resuming-voice-connection-example-resumed-payload
 */
export interface ResumedEvent extends BaseEvent {
  op: VoiceOpCode.Resumed;
  d: null;
}

export type VoiceGatewayEvent =
  | IdentifyEvent
  | SelectProtocolEvent
  | ReadyEvent
  | HeartbeatEvent
  | SessionDescriptionEvent
  | SpeakingEvent
  | HeartbeatAckEvent
  | ResumeEvent
  | HelloEvent;
