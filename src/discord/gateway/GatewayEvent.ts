import { VoiceState } from "../voice/VoiceState";
import { BaseGuild, FullGuild, UnavailableGuild } from "../types/Guild";
import { Snowflake } from "../types/Snowflake";
import { User } from "../types/User";

/**
 * @link https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-opcodes
 */
export enum OpCode {
  /** An event was dispatched. */
  Dispatch = 0,
  /** Fired periodically by the client to keep the connection alive. */
  Heartbeat = 1,
  /** Starts a new session during the initial handshake. */
  Identify = 2,
  /** Update the client's presence. */
  UpdatePresence = 3,
  /** Used to join/leave or move between voice channels. */
  UpdateVoiceState = 4,
  /** Resume a previous session that was disconnected. */
  Resume = 6,
  /** You should attempt to reconnect and resume immediately. */
  Reconnect = 7,
  /** The session has been invalidated. You should reconnect and identify/resume accordingly. */
  InvalidSession = 9,
  /** Sent immediately after connecting, contains the heartbeat_interval to use. */
  Hello = 10,
  /** Sent in response to receiving a heartbeat to acknowledge that it has been received. */
  HeartbeatAck = 11,
}

export interface BaseEvent {
  op: OpCode;
  d?: unknown;
  /** Event sequence */
  s?: number | null;
  t?: string | null;
}

export interface DispatchEvent extends BaseEvent {
  op: OpCode.Dispatch;
}

/**
 * @link https://discord.com/developers/docs/topics/gateway-events#ready
 */
export interface ReadyEvent extends DispatchEvent {
  t: "READY";
  d: {
    /** API version */
    v: number;
    /** Information about the user including email */
    user: User;
    /** Guilds the user is in */
    guilds: UnavailableGuild[];
    /** Used for resuming connections */
    session_id: string;
    /** Gateway URL for resuming connections */
    resume_gateway_url: string;
    /** Shard information associated with this session, if sent when identifying */
    shard?: [number, number];
    /** Contains id and flags */
    application: unknown;
  };
}

/**
 * @link https://discord.com/developers/docs/topics/gateway-events#guild-create
 */
export interface GuildCreateEvent extends DispatchEvent {
  t: "GUILD_CREATE";
  d: FullGuild;
}

/**
 * @link https://discord.com/developers/docs/topics/gateway-events#guild-update
 */
export interface GuildUpdateEvent extends DispatchEvent {
  t: "GUILD_UPDATE";
  d: BaseGuild;
}

/**
 * @link https://discord.com/developers/docs/topics/gateway-events#guild-delete
 */
export interface GuildDeleteEvent extends DispatchEvent {
  t: "GUILD_DELETE";
  d: UnavailableGuild;
}

/**
 * @link https://discord.com/developers/docs/topics/gateway-events#voice-state-update
 */
export interface VoiceStateUpdateEvent extends DispatchEvent {
  t: "VOICE_STATE_UPDATE";
  d: VoiceState;
}

/**
 * @link https://discord.com/developers/docs/topics/gateway-events#voice-server-update
 */
export interface VoiceServerUpdateEvent extends DispatchEvent {
  t: "VOICE_SERVER_UPDATE";
  d: {
    /** Voice connection token */
    token: string;
    /** Guild this voice server update is for */
    guild_id: Snowflake;
    /** Voice server host */
    endpoint: string | null;
  };
}

/**
 * @link https://discord.com/developers/docs/topics/gateway-events#hello
 */
export interface HelloEvent extends BaseEvent {
  op: OpCode.Hello;
  d: {
    /** Interval (in milliseconds) an app should heartbeat with */
    heartbeat_interval: number;
  };
}

/**
 * @link https://discord.com/developers/docs/topics/gateway-events#identify
 */
export interface IdentifyEvent extends BaseEvent {
  op: OpCode.Identify;
  d: {
    /** Authentication token */
    token: string;
    /** Gateway Intents you wish to receive */
    intents: number;
    /**	Connection properties */
    properties: {
      os: string;
      browser: string;
      device: string;
    };
    /** Whether this connection supports compression of packets */
    compress?: boolean;
    /** Value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list */
    large_threshold?: number;
    /** Used for Guild Sharding */
    shard?: [number, number];
    /** Presence structure for initial presence information */
    presence?: {
      since?: number;
      activities: unknown[];
      status: string;
      afk: boolean;
    };
  };
}

/**
 * @link https://discord.com/developers/docs/topics/gateway-events#update-presence
 */
export interface UpdatePresenceEvent extends BaseEvent {
  op: OpCode.UpdatePresence;
  d: {
    /** Unix time (in milliseconds) of when the client went idle, or null if the client is not idle */
    since?: number;
    /** User's activities */
    activities: unknown;
    /** User's new status */
    status: string;
    /** Whether or not the client is afk */
    afk: boolean;
  };
}

/**
 * @link https://discord.com/developers/docs/topics/gateway-events#update-voice-state
 */
export interface UpdateVoiceStateEvent extends BaseEvent {
  op: OpCode.UpdateVoiceState;
  d: {
    /** ID of the guild */
    guild_id: string;
    /** ID of the voice channel client wants to join (null if disconnecting) */
    channel_id: string | null;
    /** Whether the client is muted */
    self_mute: boolean;
    /** Whether the client is deafened */
    self_deaf: boolean;
  };
}

/**
 * @link https://discord.com/developers/docs/topics/gateway-events#heartbeat
 */
export interface HeartbeatEvent extends BaseEvent {
  op: OpCode.Heartbeat;
  /** The last sequence number received by the client. If you have not yet received one, send `null`  */
  d: number | null;
}

export interface HeartbeatAckEvent extends BaseEvent {
  op: OpCode.HeartbeatAck;
}

/**
 * @link https://discord.com/developers/docs/topics/gateway-events#reconnect
 */
export interface ReconnectEvent extends BaseEvent {
  op: OpCode.Reconnect;
  d: null;
}

/**
 * @link https://discord.com/developers/docs/topics/gateway-events#resume
 */
export interface ResumeEvent extends BaseEvent {
  op: OpCode.Resume;
  d: {
    /** Session token */
    token: string;
    /** Session ID */
    session_id: string;
    /** Last sequence number received */
    seq: number;
  };
}

/**
 * @link https://discord.com/developers/docs/topics/gateway-events#invalid-session
 */
export interface InvalidSessionEvent extends BaseEvent {
  op: OpCode.InvalidSession;
  /** Whether the session may be resumable */
  d: boolean;
}

export type GatewayEvent =
  | ReadyEvent
  | GuildCreateEvent
  | GuildUpdateEvent
  | GuildDeleteEvent
  | VoiceStateUpdateEvent
  | VoiceServerUpdateEvent
  | HelloEvent
  | IdentifyEvent
  | UpdatePresenceEvent
  | UpdateVoiceStateEvent
  | HeartbeatEvent
  | HeartbeatAckEvent
  | ReconnectEvent
  | ResumeEvent
  | InvalidSessionEvent;
