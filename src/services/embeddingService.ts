import { OpenAIEmbeddings } from '@langchain/openai';
import { OllamaEmbeddings } from '@langchain/ollama';
import type { AISettings } from '../types/settings';
import type { BillContent, SearchResult } from '../types/bill';
import { logger } from '../utils/logger';

export class EmbeddingService {
  private settings: AISettings;
  private embeddingCache = new Map<string, number[]>();

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  updateSettings(settings: AISettings) {
    this.settings = settings;
    this.embeddingCache.clear(); // Clear cache when settings change
  }

  private getEmbeddingModel() {
    switch (this.settings.embeddingProvider) {
      case 'openai':
        if (!this.settings.apiKeys.openai) {
          throw new Error('OpenAI API key is required for embeddings');
        }
        return new OpenAIEmbeddings({
          apiKey: this.settings.apiKeys.openai,
          model: 'text-embedding-3-small', // Cheaper and faster option
        });

      case 'ollama':
        return new OllamaEmbeddings({
          baseUrl: this.settings.ollamaConfig.baseUrl,
          model: this.settings.ollamaEmbeddingModel,
        });

      default:
        throw new Error(`Unsupported embedding provider: ${this.settings.embeddingProvider}`);
    }
  }

  async createEmbeddings(billContent: BillContent): Promise<BillContent> {
    const startTime = Date.now();
    
    try {
      const model = this.getEmbeddingModel();
      const texts = billContent.chunks.map(chunk => chunk.text);
      
      const modelName = this.settings.embeddingProvider === 'ollama' ? this.settings.ollamaEmbeddingModel : 'text-embedding-3-small';
      console.log(`🔗 Creating embeddings for bill ${billContent.billId} using ${this.settings.embeddingProvider.toUpperCase()} model: ${modelName}`);
      
      logger.embedding.start(
        billContent.billId, 
        this.settings.embeddingProvider, 
        modelName,
        texts.length
      );
      
      // Create embeddings in batches to avoid rate limits
      const batchSize = this.settings.embeddingProvider === 'ollama' ? 5 : 10; // Smaller batches for Ollama
      const embeddings: number[][] = [];
      let completedChunks = 0;
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batchStartTime = Date.now();
        const batchNumber = Math.floor(i / batchSize) + 1;
        
        const batch = texts.slice(i, i + batchSize);
        
        logger.embedding.progress(billContent.billId, completedChunks, texts.length, batchNumber);
        
        try {
          const batchEmbeddings = await model.embedDocuments(batch);
          embeddings.push(...batchEmbeddings);
          completedChunks += batch.length;
          
          const batchTime = Date.now() - batchStartTime;
          logger.embedding.batchComplete(billContent.billId, batchNumber, batch.length, batchTime);
          logger.embedding.progress(billContent.billId, completedChunks, texts.length);
          
          // Small delay between batches to be respectful to APIs
          if (i + batchSize < texts.length) {
            const delayTime = this.settings.embeddingProvider === 'ollama' ? 200 : 100;
            await new Promise(resolve => setTimeout(resolve, delayTime));
          }
        } catch (batchError) {
          logger.embedding.error(billContent.billId, batchError, this.settings.embeddingProvider, i);
          throw batchError;
        }
      }

      const totalTime = Date.now() - startTime;
      logger.embedding.success(billContent.billId, texts.length, totalTime, this.settings.embeddingProvider);

      return {
        ...billContent,
        embeddings
      };
    } catch (error) {
      logger.embedding.error(billContent.billId, error, this.settings.embeddingProvider);
      throw new Error(`Failed to create embeddings for bill content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchSimilarChunks(
    query: string,
    billContent: BillContent,
    topK: number = 3
  ): Promise<SearchResult[]> {
    try {
      logger.search.start(billContent.billId, query, this.settings.embeddingProvider);
      
      if (billContent.embeddings.length === 0) {
        throw new Error('Bill content has no embeddings');
      }

      const model = this.getEmbeddingModel();
      
      // Check cache first
      const cacheKey = `${this.settings.embeddingProvider}:${query}`;
      let queryEmbedding: number[];
      
      if (this.embeddingCache.has(cacheKey)) {
        queryEmbedding = this.embeddingCache.get(cacheKey)!;
        logger.search.queryEmbedding(billContent.billId, query, true);
      } else {
        queryEmbedding = await model.embedQuery(query);
        this.embeddingCache.set(cacheKey, queryEmbedding);
        logger.search.queryEmbedding(billContent.billId, query, false);
      }

      // Calculate similarities
      const similarities = billContent.embeddings.map((embedding, index) => ({
        chunk: billContent.chunks[index],
        similarity: this.cosineSimilarity(queryEmbedding, embedding)
      }));

      // Sort by similarity and return top K
      const results = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
      
      logger.search.results(
        billContent.billId, 
        query, 
        results.length, 
        results.length > 0 ? results[0].similarity : 0
      );
      
      return results;
    } catch (error) {
      logger.search.error(billContent.billId, query, error);
      throw new Error(`Failed to search bill content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  clearCache() {
    this.embeddingCache.clear();
  }

  isConfigured(): boolean {
    switch (this.settings.embeddingProvider) {
      case 'openai':
        return !!this.settings.apiKeys.openai;
      case 'ollama':
        return true; // Ollama doesn't require API key
      default:
        return false;
    }
  }
}