import { DispatchAgent } from './dispatch.agent';
import type { LlmProvider } from '../providers/llm-provider.interface';

describe('DispatchAgent', () => {
  let agent: DispatchAgent;
  let mockLlm: jest.Mocked<LlmProvider>;

  const candidates = [
    {
      id: 'driver-1',
      name: 'Alice',
      distanceKm: 2.5,
      rating: 4.8,
      totalTrips: 150,
      vehicleMake: 'Toyota',
      vehicleModel: 'Camry',
    },
    {
      id: 'driver-2',
      name: 'Bob',
      distanceKm: 1.2,
      rating: 4.5,
      totalTrips: 50,
      vehicleMake: 'Honda',
      vehicleModel: 'Civic',
    },
    {
      id: 'driver-3',
      name: 'Charlie',
      distanceKm: 3.0,
      rating: 4.9,
      totalTrips: 300,
      vehicleMake: 'BMW',
      vehicleModel: '3 Series',
    },
  ];

  const rideParams = {
    ride: {
      pickupLat: 40.758,
      pickupLng: -73.9855,
      destinationLat: 40.6413,
      destinationLng: -73.7781,
    },
    candidates,
  };

  beforeEach(() => {
    mockLlm = { chat: jest.fn() };
    agent = new DispatchAgent(mockLlm);
  });

  it('should return the driver selected by LLM', async () => {
    mockLlm.chat.mockResolvedValue(
      JSON.stringify({
        selectedDriverId: 'driver-2',
        reasoning: 'Closest driver with acceptable rating.',
      }),
    );

    const result = await agent.selectBestDriver(rideParams);

    expect(result.selectedDriverId).toBe('driver-2');
    expect(result.reasoning).toBe('Closest driver with acceptable rating.');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLlm.chat).toHaveBeenCalledTimes(1);
  });

  it('should fall back to closest driver when LLM returns invalid ID', async () => {
    mockLlm.chat.mockResolvedValue(
      JSON.stringify({
        selectedDriverId: 'non-existent-driver',
        reasoning: 'Some reasoning.',
      }),
    );

    const result = await agent.selectBestDriver(rideParams);

    // Should pick driver-2 (closest at 1.2km)
    expect(result.selectedDriverId).toBe('driver-2');
    expect(result.reasoning).toContain('Fallback');
  });

  it('should include all candidate info in the prompt', async () => {
    mockLlm.chat.mockResolvedValue(
      JSON.stringify({
        selectedDriverId: 'driver-1',
        reasoning: 'Best overall.',
      }),
    );

    await agent.selectBestDriver(rideParams);

    const callArgs = mockLlm.chat.mock.calls[0][0];
    expect(callArgs.userMessage).toContain('driver-1');
    expect(callArgs.userMessage).toContain('Alice');
    expect(callArgs.userMessage).toContain('2.50km');
    expect(callArgs.userMessage).toContain('4.8/5');
    expect(callArgs.systemPrompt).toContain('dispatch');
  });
});
