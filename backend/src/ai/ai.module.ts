import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LLM_PROVIDER } from './providers/llm-provider.interface';
import { MockLlmProvider } from './providers/mock-llm.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { DestinationResolverAgent } from './agents/destination-resolver.agent';
import { DispatchAgent } from './agents/dispatch.agent';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LLM_PROVIDER,
      useFactory: (config: ConfigService) => {
        const logger = new Logger('AiModule');
        const apiKey = config.get<string>('OPENROUTER_API_KEY');

        if (apiKey) {
          logger.log('Using OpenRouter LLM provider (Gemini Flash)');
          return new OpenRouterProvider(config);
        }

        logger.log('Using Mock LLM provider (no OPENROUTER_API_KEY set)');
        return new MockLlmProvider();
      },
      inject: [ConfigService],
    },
    DestinationResolverAgent,
    DispatchAgent,
  ],
  exports: [DestinationResolverAgent, DispatchAgent],
})
export class AiModule {}
