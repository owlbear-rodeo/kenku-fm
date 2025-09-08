import { Snowflake } from "./Snowflake";

/**
 * Subset of the Discord User object
 * @link https://discord.com/developers/docs/resources/user#user-object
 */
export interface User {
  /** the user's id */
  id: Snowflake;
  /** the user's username, not unique across the platform */
  username: string;
  /** the user's avatar hash */
  avatar: string | null;
  /** whether the user belongs to an OAuth2 application */
  bot?: boolean;
}
