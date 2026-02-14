import { DestinationResolverAgent } from './destination-resolver.agent';
import type { LlmProvider } from '../providers/llm-provider.interface';
import type { CacheService } from '../../cache/cache.service';

const mockCache: jest.Mocked<CacheService> = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  incr: jest.fn().mockResolvedValue(1),
  getVersion: jest.fn().mockResolvedValue(0),
} as unknown as jest.Mocked<CacheService>;

describe('DestinationResolverAgent', () => {
  let agent: DestinationResolverAgent;
  let mockLlm: jest.Mocked<LlmProvider>;

  beforeEach(() => {
    mockLlm = { chat: jest.fn() };
    mockCache.get.mockResolvedValue(null);
    agent = new DestinationResolverAgent(mockLlm, mockCache);
  });

  it('should resolve a destination with high confidence', async () => {
    mockLlm.chat.mockResolvedValue(
      JSON.stringify({
        lat: 40.6413,
        lng: -73.7781,
        address: 'JFK International Airport, Queens, NY 11430',
        confidence: 0.95,
      }),
    );

    const result = await agent.resolve('JFK Airport', {
      lat: 40.758,
      lng: -73.9855,
    });

    expect(result.lat).toBe(40.6413);
    expect(result.lng).toBe(-73.7781);
    expect(result.address).toContain('JFK');
    expect(result.confidence).toBe(0.95);
  });

  it('should throw BusinessException for low confidence', async () => {
    mockLlm.chat.mockResolvedValue(
      JSON.stringify({
        lat: 0,
        lng: 0,
        address: '',
        confidence: 0.1,
      }),
    );

    await expect(
      agent.resolve('some completely ambiguous place xyz123'),
    ).rejects.toThrow('Could not confidently resolve destination');
  });

  it('should include pickup context in the prompt when provided', async () => {
    mockLlm.chat.mockResolvedValue(
      JSON.stringify({
        lat: 40.7128,
        lng: -74.006,
        address: 'Downtown Manhattan, NY',
        confidence: 0.88,
      }),
    );

    await agent.resolve('downtown', { lat: 40.758, lng: -73.9855 });

    const callArgs = mockLlm.chat.mock.calls[0][0];
    expect(callArgs.userMessage).toContain('40.758');
    expect(callArgs.userMessage).toContain('-73.9855');
    expect(callArgs.userMessage).toContain('downtown');
  });

  it('should work without pickup context', async () => {
    mockLlm.chat.mockResolvedValue(
      JSON.stringify({
        lat: 40.7829,
        lng: -73.9654,
        address: 'Central Park, NY',
        confidence: 0.97,
      }),
    );

    const result = await agent.resolve('Central Park');

    expect(result.lat).toBe(40.7829);
    expect(result.confidence).toBe(0.97);

    const callArgs = mockLlm.chat.mock.calls[0][0];
    expect(callArgs.userMessage).not.toContain('Pickup area');
  });
});
