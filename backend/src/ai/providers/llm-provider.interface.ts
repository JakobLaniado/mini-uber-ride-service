export interface LlmProvider {
  chat(params: {
    systemPrompt: string;
    userMessage: string;
    temperature?: number;
  }): Promise<string>;
}

export const LLM_PROVIDER = 'LLM_PROVIDER';
