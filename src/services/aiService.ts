import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage } from '@langchain/core/messages';
import type { AISettings } from '../types/settings';
import type { SearchResult } from '../types/bill';
import { logger } from '../utils/logger';

export class AIService {
  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  updateSettings(settings: AISettings) {
    this.settings = settings;
  }

  getSettings(): AISettings {
    return this.settings;
  }

  private getModel() {
    switch (this.settings.provider) {
      case 'openai':
        if (!this.settings.apiKeys.openai) {
          throw new Error('OpenAI API key is required');
        }
        return new ChatOpenAI({
          apiKey: this.settings.apiKeys.openai,
          model: 'gpt-4o-mini',
          temperature: 0.7,
        });

      case 'anthropic':
        if (!this.settings.apiKeys.anthropic) {
          throw new Error('Anthropic API key is required');
        }
        return new ChatAnthropic({
          apiKey: this.settings.apiKeys.anthropic,
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
        });

      case 'xai':
        if (!this.settings.apiKeys.xai) {
          throw new Error('xAI API key is required');
        }
        // xAI uses OpenAI-compatible API
        return new ChatOpenAI({
          apiKey: this.settings.apiKeys.xai,
          model: 'grok-beta',
          configuration: {
            baseURL: 'https://api.x.ai/v1',
          },
          temperature: 0.7,
        });

      case 'ollama':
        return new ChatOllama({
          baseUrl: this.settings.ollamaConfig.baseUrl,
          model: this.settings.ollamaConfig.model,
          temperature: 0.7,
        });

      default:
        throw new Error(`Unsupported AI provider: ${this.settings.provider}`);
    }
  }

  async generateResponse(
    userMessage: string, 
    billContext?: string, 
    relevantChunks?: SearchResult[],
    billId?: string
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      if (billId) {
        logger.ai.request(
          billId, 
          this.settings.provider, 
          !!(relevantChunks && relevantChunks.length > 0),
          userMessage.length
        );
      }
      
      const model = this.getModel();
      
      let prompt = userMessage;
      if (billContext || relevantChunks) {
        const contextParts = [];
        
        if (billContext) {
          contextParts.push(`Bill Overview:\n${billContext}`);
        }
        
        if (relevantChunks && relevantChunks.length > 0) {
          contextParts.push(`Relevant sections from the bill text:\n${
            relevantChunks.map((result, index) => 
              `[Section ${index + 1}${result.chunk.section ? ` - ${result.chunk.section}` : ''} - Similarity: ${result.similarity.toFixed(3)}]:\n${result.chunk.text}`
            ).join('\n\n')
          }`);
        }

        prompt = `You are an AI assistant helping users understand US legislation. You have access to both bill metadata and the full text content.

${contextParts.join('\n\n')}

User question: ${userMessage}

Please provide a helpful, accurate response about this bill. Use the provided bill text sections to give specific, detailed answers. When referencing information from the bill, quote the relevant parts and explain them clearly. Focus on answering the user's specific question with evidence from the actual bill text.`;
      }

      const response = await model.invoke([new HumanMessage(prompt)]);
      const responseText = response.content as string;
      
      if (billId) {
        const timeTaken = Date.now() - startTime;
        logger.ai.response(billId, this.settings.provider, responseText.length, timeTaken);
      }
      
      return responseText;
    } catch (error) {
      if (billId) {
        logger.ai.error(billId, this.settings.provider, error);
      }
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          return `Error: ${error.message}. Please check your API key in settings.`;
        }
        if (error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
          return 'Error: Unable to connect to the AI service. Please check your connection and try again.';
        }
        return `Error: ${error.message}`;
      }
      
      return 'Sorry, I encountered an error. Please try again or check your settings.';
    }
  }

  isConfigured(): boolean {
    switch (this.settings.provider) {
      case 'openai':
        return !!this.settings.apiKeys.openai;
      case 'anthropic':
        return !!this.settings.apiKeys.anthropic;
      case 'xai':
        return !!this.settings.apiKeys.xai;
      case 'ollama':
        return true; // Ollama doesn't require API key
      default:
        return false;
    }
  }

  getProviderName(): string {
    switch (this.settings.provider) {
      case 'openai':
        return 'OpenAI GPT';
      case 'anthropic':
        return 'Anthropic Claude';
      case 'xai':
        return 'xAI Grok';
      case 'ollama':
        return `Ollama (${this.settings.ollamaConfig.model})`;
      default:
        return 'Unknown';
    }
  }
}