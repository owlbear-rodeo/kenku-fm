/**
 * Data object returned from the `/gateway/bot` endpoint
 * @link https://discord.com/developers/docs/topics/gateway#get-gateway-bot
 */
export interface GatewayDescription {
  /** WSS URL that can be used for connecting to the Gateway */
  url: string;
  /** Recommended number of shards to use when connecting */
  shards: number;
  /** Information on the current session start limit */
  session_start_limit: {
    /** Total number of session starts the current user is allowed */
    total: number;
    /** Remaining number of session starts the current user is allowed */
    remaining: number;
    /** Number of milliseconds after which the limit resets */
    reset_after: number;
    /** Number of identify requests allowed per 5 seconds */
    max_concurrency: number;
  };
}
