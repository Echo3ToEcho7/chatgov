import type { AISettings, AIProvider } from '../types/settings';

const SETTINGS_KEY = 'chatgov-settings';

const DEFAULT_SETTINGS: AISettings = {
  provider: 'openai',
  apiKeys: {
    openai: '',
    anthropic: '',
    xai: '',
  },
  ollamaConfig: {
    baseUrl: 'http://localhost:11434',
    model: 'llama2',
  },
  embeddingProvider: 'openai',
  ollamaEmbeddingModel: 'nomic-embed-text',
  congressNumber: 119,
};

export const loadSettings = (): AISettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Deep merge to handle nested objects properly
      const merged: AISettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...(parsed.apiKeys || {}) },
        ollamaConfig: { ...DEFAULT_SETTINGS.ollamaConfig, ...(parsed.ollamaConfig || {}) }
      };
      return merged;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AISettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

export const updateProvider = (provider: AIProvider): void => {
  const settings = loadSettings();
  settings.provider = provider;
  saveSettings(settings);
};

export const updateApiKey = (provider: keyof AISettings['apiKeys'], apiKey: string): void => {
  const settings = loadSettings();
  settings.apiKeys[provider] = apiKey;
  saveSettings(settings);
};

export const updateOllamaConfig = (baseUrl: string, model: string): void => {
  const settings = loadSettings();
  settings.ollamaConfig = { baseUrl, model };
  saveSettings(settings);
};

export const fetchOllamaModels = async (baseUrl: string): Promise<string[]> => {
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.models?.map((model: any) => model.name) || [];
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error);
    throw error;
  }
};