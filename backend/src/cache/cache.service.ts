import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(CacheService.name);

  /** Rate-limit warn logs: at most once per 30 seconds */
  private lastWarnAt = 0;
  private static readonly WARN_INTERVAL_MS = 30_000;

  constructor(config: ConfigService) {
    this.redis = new Redis({
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
    });

    this.redis.on('error', (err) => this.warnThrottled(err.message));

    // Attempt initial connection (non-blocking)
    this.redis.connect().catch((err) => {
      this.warnThrottled(`Redis connection failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.redis.quit().catch(() => {});
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.warnThrottled(`Redis GET failed: ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.warnThrottled(`Redis SET failed: ${(err as Error).message}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) await this.redis.del(...keys);
    } catch (err) {
      this.warnThrottled(`Redis DEL failed: ${(err as Error).message}`);
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (err) {
      this.warnThrottled(`Redis INCR failed: ${(err as Error).message}`);
      return 0;
    }
  }

  async getVersion(key: string): Promise<number> {
    try {
      const val = await this.redis.get(key);
      return val ? parseInt(val, 10) : 0;
    } catch (err) {
      this.warnThrottled(`Redis GET version failed: ${(err as Error).message}`);
      return 0;
    }
  }

  private warnThrottled(message: string): void {
    const now = Date.now();
    if (now - this.lastWarnAt > CacheService.WARN_INTERVAL_MS) {
      this.lastWarnAt = now;
      this.logger.warn(`[graceful degradation] ${message}`);
    }
  }
}
