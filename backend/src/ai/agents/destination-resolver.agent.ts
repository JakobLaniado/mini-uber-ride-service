import { Injectable, Inject } from '@nestjs/common';
import type { LlmProvider } from '../providers/llm-provider.interface';
import { LLM_PROVIDER } from '../providers/llm-provider.interface';
import type { ResolvedDestination } from '../dto/resolve-destination.dto';
import { BusinessException } from '../../common/exceptions';
import { CacheService } from '../../cache/cache.service';
import { CacheKeys } from '../../cache/cache-keys';

@Injectable()
export class DestinationResolverAgent {
  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    private readonly cache: CacheService,
  ) {}

  async resolve(
    naturalLanguageDestination: string,
    pickupContext?: { lat: number; lng: number },
  ): Promise<ResolvedDestination> {
    const cacheKey = CacheKeys.destination(
      naturalLanguageDestination,
      pickupContext?.lat,
      pickupContext?.lng,
    );
    const cached = await this.cache.get<ResolvedDestination>(cacheKey);
    if (cached) return cached;

    const systemPrompt = `You are a geocoding assistant for a ride-sharing service.
Given a natural language destination description and optional pickup location context,
return the most likely coordinates and a normalized address.

Respond ONLY with valid JSON in this exact format:
{
  "lat": <number>,
  "lng": <number>,
  "address": "<normalized street address>",
  "confidence": <number between 0 and 1>
}

If the destination is ambiguous, pick the most popular/well-known location.
If you truly cannot determine coordinates, return confidence: 0.`;

    const userMessage = pickupContext
      ? `Destination: "${naturalLanguageDestination}"\nPickup area: lat=${pickupContext.lat}, lng=${pickupContext.lng}`
      : `Destination: "${naturalLanguageDestination}"`;

    const response = await this.llm.chat({
      systemPrompt,
      userMessage,
      temperature: 0.1,
    });

    const parsed = JSON.parse(response) as ResolvedDestination;

    if (parsed.confidence < 0.3) {
      throw new BusinessException(
        'DESTINATION_UNRESOLVABLE',
        `Could not confidently resolve destination: "${naturalLanguageDestination}"`,
      );
    }

    const result: ResolvedDestination = {
      lat: parsed.lat,
      lng: parsed.lng,
      address: parsed.address,
      confidence: parsed.confidence,
    };

    await this.cache.set(cacheKey, result, 86400); // 24h TTL
    return result;
  }
}
