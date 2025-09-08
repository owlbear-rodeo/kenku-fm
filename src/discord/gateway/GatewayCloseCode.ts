/**
 * Possible WebSocket close codes
 * @link https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-gateway-close-event-codes
 */
export enum GatewayCloseCode {
  /// Standard
  NormalClosure = 1000,
  ServerClosure = 1001,

  /// Custom
  HeartbeatNotAcknowledged = 3000,
  InvalidSession = 3001,
  /** This WebSocket was closed because it is reconnecting. Don't attempt to re-reconnect */
  Reconnecting = 3002,

  /// Discord
  /** We're not sure what went wrong. Try reconnecting? */
  UnknownError = 4000,
  /** You sent an invalid Gateway opcode or an invalid payload for an opcode. */
  UnknownOpcode = 4001,
  /** You sent an invalid payload to Discord. */
  DecodeError = 4002,
  /** You sent us a payload prior to identifying. */
  NotAuthenticated = 4003,
  /** The account token sent with your identify payload is incorrect. */
  AuthenticationFailed = 4004,
  /** You sent more than one identify payload. */
  AlreadyAuthenticated = 4005,
  /** The sequence sent when resuming the session was invalid. Reconnect and start a new session. */
  InvalidSequence = 4007,
  /** You're sending payloads to us too quickly. You will be disconnected on receiving this. */
  RateLimited = 4008,
  /** Your session timed out. Reconnect and start a new one. */
  SessionTimedOut = 4009,
  /** You sent us an invalid shard when identifying. */
  InvalidShard = 4010,
  /** The session would have handled too many guilds - you are required to shard your connection in order to connect. */
  ShardingRequired = 4011,
  /** You sent an invalid version for the gateway. */
  InvalidAPIVersion = 4012,
  /** You sent an invalid intent for a Gateway Intent. You may have incorrectly calculated the bitwise value. */
  InvalidIntents = 4013,
  /** You sent a disallowed intent for a Gateway Intent. You may have tried to specify an intent that you have not enabled or are not approved for. */
  DisallowedIntents = 4014,
}

export function shouldResumeAfterClose(code?: number): boolean {
  if (
    code === GatewayCloseCode.NormalClosure ||
    code === GatewayCloseCode.ServerClosure ||
    code === GatewayCloseCode.Reconnecting ||
    code === GatewayCloseCode.AuthenticationFailed ||
    code === GatewayCloseCode.InvalidShard ||
    code === GatewayCloseCode.ShardingRequired ||
    code === GatewayCloseCode.InvalidAPIVersion ||
    code === GatewayCloseCode.InvalidIntents ||
    code === GatewayCloseCode.DisallowedIntents
  ) {
    return false;
  }
  return true;
}
