import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LlmProvider } from './llm-provider.interface';

/**
 * OpenRouter LLM provider — uses OpenAI-compatible API.
 * Activated only when OPENROUTER_API_KEY is set.
 * Uses Google Gemini Flash (free tier) by default.
 */
@Injectable()
export class OpenRouterProvider implements LlmProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly logger = new Logger(OpenRouterProvider.name);

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: this.config.get<string>('OPENROUTER_API_KEY'),
    });
    this.model = 'google/gemini-2.0-flash-exp:free';
  }

  async chat(params: {
    systemPrompt: string;
    userMessage: string;
    temperature?: number;
  }): Promise<string> {
    this.logger.debug(
      `OpenRouter call (${this.model}): ${params.userMessage.slice(0, 80)}...`,
    );

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
      temperature: params.temperature ?? 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenRouter');
    }

    return content;
  }
}
