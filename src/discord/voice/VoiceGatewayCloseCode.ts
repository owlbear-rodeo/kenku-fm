/**
 * Possible voice WebSocket close codes
 * @link https://discord.com/developers/docs/topics/opcodes-and-status-codes#voice-voice-close-event-codes
 */
export enum VoiceGatewayCloseCode {
  /// Standard
  NormalClosure = 1000,
  ServerClosure = 1001,

  /// Custom
  HeartbeatNotAcknowledged = 3000,
  InvalidSession = 3001,
  /** This WebSocket was closed because it is reconnecting. Don't attempt to re-reconnect */
  Reconnecting = 3002,

  /// Discord
  /** You sent an invalid opcode. */
  UnknownOpcode = 4001,
  /** You sent an invalid payload in your identifying to the Gateway. */
  FailedToDecode = 4002,
  /** You sent a payload before identifying with the Gateway. */
  NotAuthenticated = 4003,
  /** The token you sent in your identify payload is incorrect. */
  AuthenticationFailed = 4004,
  /** You sent more than one identify payload. */
  AlreadyAuthenticated = 4005,
  /** Your session is no longer valid. */
  SessionNoLongerValid = 4006,
  /** Your session has timed out. */
  SessionTimeout = 4009,
  /** We can't find the server you're trying to connect to. */
  ServerNotFound = 4011,
  /** We didn't recognize the protocol you sent. */
  UnknownProtocol = 4012,
  /** Channel was deleted, you were kicked, voice server changed, or the main gateway session was dropped. Should not reconnect. */
  Disconnected = 4014,
  /** The server crashed. Try resuming. */
  VoiceServerCrashed = 4015,
  /** We didn't recognize your encryption. */
  UnknownEncryptionMode = 4016,
}

export function shouldResumeAfterClose(code?: number): boolean {
  if (
    code === VoiceGatewayCloseCode.NormalClosure ||
    code === VoiceGatewayCloseCode.ServerClosure ||
    code === VoiceGatewayCloseCode.Reconnecting ||
    code === VoiceGatewayCloseCode.AuthenticationFailed ||
    code === VoiceGatewayCloseCode.ServerNotFound ||
    code === VoiceGatewayCloseCode.UnknownProtocol ||
    code === VoiceGatewayCloseCode.Disconnected ||
    code === VoiceGatewayCloseCode.UnknownEncryptionMode ||
    code === VoiceGatewayCloseCode.SessionNoLongerValid
  ) {
    return false;
  }
  return true;
}
