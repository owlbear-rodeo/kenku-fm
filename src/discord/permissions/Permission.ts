/**
 * @link https://discord.com/developers/docs/topics/permissions#permissions-bitwise-permission-flags
 */
export enum Permission {
  ViewChannel = 1 << 10,
  Connect = 1 << 20,
  Speak = 1 << 21,
}
