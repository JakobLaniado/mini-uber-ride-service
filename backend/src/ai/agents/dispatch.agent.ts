import { Injectable, Inject, Logger } from '@nestjs/common';
import type { LlmProvider } from '../providers/llm-provider.interface';
import { LLM_PROVIDER } from '../providers/llm-provider.interface';
import type { DispatchDecision } from '../dto/resolve-destination.dto';

export interface DispatchCandidate {
  id: string;
  name: string;
  distanceKm: number;
  rating: number;
  totalTrips: number;
  vehicleMake: string;
  vehicleModel: string;
}

@Injectable()
export class DispatchAgent {
  private readonly logger = new Logger(DispatchAgent.name);

  constructor(@Inject(LLM_PROVIDER) private readonly llm: LlmProvider) {}

  async selectBestDriver(params: {
    ride: {
      pickupLat: number;
      pickupLng: number;
      destinationLat: number;
      destinationLng: number;
    };
    candidates: DispatchCandidate[];
  }): Promise<DispatchDecision> {
    const systemPrompt = `You are an AI dispatch system for a ride-sharing service.
Given a ride request and a list of nearby available drivers, select the BEST driver.

Consider these factors (in rough priority order):
1. Distance to pickup (closer is better)
2. Driver rating (higher is better)
3. Experience / total trips (more experienced is better for longer rides)

Respond ONLY with valid JSON:
{
  "selectedDriverId": "<uuid of chosen driver>",
  "reasoning": "<1-2 sentence explanation of why this driver was chosen>"
}`;

    const userMessage = `Ride pickup: (${params.ride.pickupLat}, ${params.ride.pickupLng})
Ride destination: (${params.ride.destinationLat}, ${params.ride.destinationLng})

Available drivers:
${params.candidates
  .map(
    (d, i) =>
      `${i + 1}. ID: ${d.id}, Name: ${d.name}, Distance: ${d.distanceKm.toFixed(2)}km, Rating: ${d.rating}/5, Trips: ${d.totalTrips}, Vehicle: ${d.vehicleMake} ${d.vehicleModel}`,
  )
  .join('\n')}`;

    const response = await this.llm.chat({
      systemPrompt,
      userMessage,
      temperature: 0.2,
    });

    const parsed = JSON.parse(response);

    // Validate that selectedDriverId actually exists in candidates
    const validDriver = params.candidates.find(
      (c) => c.id === parsed.selectedDriverId,
    );
    if (!validDriver) {
      this.logger.warn(
        `LLM returned invalid driver ID "${parsed.selectedDriverId}", falling back to closest`,
      );
      const closest = [...params.candidates].sort(
        (a, b) => a.distanceKm - b.distanceKm,
      )[0];
      return {
        selectedDriverId: closest.id,
        reasoning:
          'Fallback: selected closest available driver (LLM returned invalid ID).',
      };
    }

    return {
      selectedDriverId: parsed.selectedDriverId,
      reasoning: parsed.reasoning,
    };
  }
}
