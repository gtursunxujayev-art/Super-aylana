import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

// Centralized keys
export const REDIS_LOCK_KEY = "wheel:lock";         // string -> userId
export const REDIS_STATE_KEY = "wheel:state";       // json   -> {status,spinId,by,mode,startedAt}
export const REDIS_LAST_POP_KEY = "wheel:lastpop";  // json   -> {spinId,user,prize,imageUrl?,mode}
export const REDIS_VER_KEY = "wheel:ver";           // number -> increments on any change

export async function bumpVersion() {
  try { await redis.incr(REDIS_VER_KEY); } catch {}
}

// Small helper
export function genId() {
  // works on Node 18+ on Vercel
  return (globalThis as any).crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}
