import Redis from 'ioredis';
import { config } from './config';

export interface RateCheck {
  allowed: boolean;
  retryAfterMs: number;
  reason?: string;
}

export interface RateLimiter {
  check(key: string): Promise<RateCheck>;
  close(): Promise<void>;
}

export class MemoryRateLimiter implements RateLimiter {
  private windowHits = new Map<string, number[]>();
  private dayHits = new Map<string, number[]>();

  async check(key: string): Promise<RateCheck> {
    const now = Date.now();
    const windowList = this.purge(this.windowHits, key, now - config.rateLimit.windowMs);
    const dayList = this.purge(this.dayHits, key, now - config.rateLimit.dayMs);

    if (windowList.length >= config.rateLimit.maxPerWindow) {
      return { allowed: false, retryAfterMs: config.rateLimit.windowMs, reason: 'per_window' };
    }
    if (dayList.length >= config.rateLimit.maxPerDay) {
      return { allowed: false, retryAfterMs: config.rateLimit.dayMs, reason: 'per_day' };
    }
    windowList.push(now);
    dayList.push(now);
    return { allowed: true, retryAfterMs: 0 };
  }

  private purge(map: Map<string, number[]>, key: string, before: number): number[] {
    const list = (map.get(key) || []).filter((t) => t > before);
    map.set(key, list);
    return list;
  }

  async close(): Promise<void> {
    this.windowHits.clear();
    this.dayHits.clear();
  }
}

export class RedisRateLimiter implements RateLimiter {
  private redis: Redis;

  constructor(url: string) {
    this.redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  }

  async init(): Promise<void> {
    await this.redis.connect().catch(() => undefined);
  }

  async check(key: string): Promise<RateCheck> {
    const now = Date.now();
    const windowKey = `fm:rl:w:${key}`;
    const dayKey = `fm:rl:d:${key}`;
    try {
      const [windowCount, dayCount] = await Promise.all([
        this.incr(windowKey, config.rateLimit.windowMs),
        this.incr(dayKey, config.rateLimit.dayMs),
      ]);
      if (windowCount > config.rateLimit.maxPerWindow) {
        return { allowed: false, retryAfterMs: config.rateLimit.windowMs, reason: 'per_window' };
      }
      if (dayCount > config.rateLimit.maxPerDay) {
        return { allowed: false, retryAfterMs: config.rateLimit.dayMs, reason: 'per_day' };
      }
      return { allowed: true, retryAfterMs: 0 };
    } catch (_e) {
    return { allowed: true, retryAfterMs: 0 };
    }
  }

  private async incr(key: string, ttlMs: number): Promise<number> {
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.pexpire(key, ttlMs);
    return count;
  }

  async close(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}

export function createRateLimiter(): RateLimiter {
  if (config.redisUrl) {
    return new RedisRateLimiter(config.redisUrl);
  }
  return new MemoryRateLimiter();
}
