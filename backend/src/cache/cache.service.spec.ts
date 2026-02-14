import { CacheService } from './cache.service';
import { ConfigService } from '@nestjs/config';

// Minimal mock to avoid real Redis connections
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
  }));
});

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: Record<string, jest.Mock>;

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const map: Record<string, unknown> = {
          REDIS_HOST: 'localhost',
          REDIS_PORT: 6379,
          REDIS_PASSWORD: '',
        };
        return map[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    service = new CacheService(configService);
    // Access the internal mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockRedis = (service as any).redis;
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should return parsed JSON from get', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ foo: 'bar' }));
    const result = await service.get<{ foo: string }>('test-key');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('should return null when key does not exist', async () => {
    mockRedis.get.mockResolvedValue(null);
    const result = await service.get('missing');
    expect(result).toBeNull();
  });

  it('should set a key with TTL', async () => {
    await service.set('key', { data: 1 }, 60);
    expect(mockRedis.set).toHaveBeenCalledWith(
      'key',
      JSON.stringify({ data: 1 }),
      'EX',
      60,
    );
  });

  it('should increment a key', async () => {
    mockRedis.incr.mockResolvedValue(5);
    const result = await service.incr('counter');
    expect(result).toBe(5);
  });

  it('should get version (returns 0 when key missing)', async () => {
    mockRedis.get.mockResolvedValue(null);
    const result = await service.getVersion('ver:key');
    expect(result).toBe(0);
  });

  it('should get version from existing counter', async () => {
    mockRedis.get.mockResolvedValue('42');
    const result = await service.getVersion('ver:key');
    expect(result).toBe(42);
  });

  it('should degrade gracefully on get error', async () => {
    mockRedis.get.mockRejectedValue(new Error('Connection refused'));
    const result = await service.get('key');
    expect(result).toBeNull();
  });

  it('should degrade gracefully on set error', async () => {
    mockRedis.set.mockRejectedValue(new Error('Connection refused'));
    await expect(service.set('key', 'val', 10)).resolves.toBeUndefined();
  });

  it('should degrade gracefully on incr error', async () => {
    mockRedis.incr.mockRejectedValue(new Error('Connection refused'));
    const result = await service.incr('counter');
    expect(result).toBe(0);
  });
});
