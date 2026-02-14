import { Injectable, Logger } from '@nestjs/common';
import { LlmProvider } from './llm-provider.interface';

/**
 * Default LLM provider — returns deterministic, realistic responses.
 * Works offline, no API key needed. Used in dev and tests.
 */
@Injectable()
export class MockLlmProvider implements LlmProvider {
  private readonly logger = new Logger(MockLlmProvider.name);

  chat(params: {
    systemPrompt: string;
    userMessage: string;
    temperature?: number;
  }): Promise<string> {
    this.logger.debug(`Mock LLM called: ${params.userMessage.slice(0, 80)}...`);

    // Detect which agent is calling based on system prompt content
    if (params.systemPrompt.includes('geocoding')) {
      return Promise.resolve(
        this.mockDestinationResolution(params.userMessage),
      );
    }

    if (params.systemPrompt.includes('dispatch')) {
      return Promise.resolve(this.mockDispatch(params.userMessage));
    }

    // Generic fallback
    return Promise.resolve(JSON.stringify({ message: 'Mock response' }));
  }

  private mockDestinationResolution(userMessage: string): string {
    const destination = userMessage.toLowerCase();

    // Known destinations for realistic mock responses
    if (destination.includes('airport')) {
      return JSON.stringify({
        lat: 40.6413,
        lng: -73.7781,
        address: 'John F. Kennedy International Airport, Queens, NY 11430',
        confidence: 0.95,
      });
    }

    if (destination.includes('downtown') || destination.includes('center')) {
      return JSON.stringify({
        lat: 40.7128,
        lng: -74.006,
        address: 'Downtown Manhattan, New York, NY 10007',
        confidence: 0.88,
      });
    }

    if (destination.includes('central park')) {
      return JSON.stringify({
        lat: 40.7829,
        lng: -73.9654,
        address: 'Central Park, New York, NY 10024',
        confidence: 0.97,
      });
    }

    // Default: generate plausible coordinates near NYC
    return JSON.stringify({
      lat: 40.748 + Math.random() * 0.02,
      lng: -73.985 + Math.random() * 0.02,
      address: `${Math.floor(Math.random() * 500)} Broadway, New York, NY`,
      confidence: 0.82,
    });
  }

  private mockDispatch(userMessage: string): string {
    // Extract driver IDs from the user message
    const idMatches = userMessage.match(/ID: ([0-9a-f-]{36})/g);
    if (!idMatches || idMatches.length === 0) {
      return JSON.stringify({
        selectedDriverId: 'unknown',
        reasoning: 'No drivers found in context.',
      });
    }

    // Always pick the first driver (closest, since they're ordered by distance)
    const firstDriverId = idMatches[0].replace('ID: ', '');

    return JSON.stringify({
      selectedDriverId: firstDriverId,
      reasoning:
        'Selected the closest available driver with the best balance of proximity and rating.',
    });
  }
}
