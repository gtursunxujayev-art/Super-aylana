import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// keys
export const REDIS_LOCK_KEY = "wheel:lock";         // value=userId, TTL ~8s
export const REDIS_STATE_KEY = "wheel:state";       // JSON {status, by, startedAt, result?}
export const REDIS_LAST_POP_KEY = "wheel:lastpop";  // last popup payload
