import { Redis } from "@upstash/redis";

// Uses UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN from env
export const redis = Redis.fromEnv();

// Centralized keys
export const REDIS_LOCK_KEY = "wheel:lock";        // string -> userId
export const REDIS_STATE_KEY = "wheel:state";      // json   -> {status:'SPINNING'|'IDLE', by, mode, startedAt}
export const REDIS_LAST_POP_KEY = "wheel:lastpop"; // json   -> {user, prize, imageUrl?, mode}
export const REDIS_VER_KEY = "wheel:ver";          // number -> increments on every state/popup change

export async function bumpVersion() {
  try { await redis.incr(REDIS_VER_KEY); } catch {/* ignore */}
}
