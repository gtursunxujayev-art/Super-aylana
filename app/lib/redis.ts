import { Redis } from "@upstash/redis";

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Keys
export const REDIS_LOCK_KEY = "sa:spin:lock";
export const REDIS_STATE_KEY = "sa:spin:state";
export const REDIS_LAST_POP_KEY = "sa:spin:lastpopup";

// Pub/Sub channel (for realtime)
export const REDIS_SPIN_CHANNEL = "sa:spin:events";
