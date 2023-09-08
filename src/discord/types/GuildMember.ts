import { Snowflake } from "./Snowflake";
import { User } from "./User";

export interface GuildMember {
  roles: Snowflake[];
  user: User;
}
