export type AIProvider = 'openai' | 'anthropic' | 'xai' | 'ollama';

export interface AISettings {
  provider: AIProvider;
  apiKeys: {
    openai: string;
    anthropic: string;
    xai: string;
  };
  ollamaConfig: {
    baseUrl: string;
    model: string;
  };
  embeddingProvider: 'openai' | 'ollama';
  ollamaEmbeddingModel: string;
  congressNumber: number;
  useEmbeddingRelevance: boolean;
}

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  requiresApiKey: boolean;
  models: string[];
  description: string;
}