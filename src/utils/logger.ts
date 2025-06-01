type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  billId?: string;
  userId?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private createEntry(level: LogLevel, category: string, message: string, data?: any, billId?: string): LogEntry {
    return {
      timestamp: this.formatTimestamp(),
      level,
      category,
      message,
      data,
      billId,
      userId: this.generateUserId()
    };
  }

  private generateUserId(): string {
    // Generate a simple session-based user ID
    if (!sessionStorage.getItem('chatgov-user-id')) {
      sessionStorage.setItem('chatgov-user-id', `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    }
    return sessionStorage.getItem('chatgov-user-id')!;
  }

  private log(level: LogLevel, category: string, message: string, data?: any, billId?: string) {
    const entry = this.createEntry(level, category, message, data, billId);
    
    // Add to internal log store
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with formatting
    const timestamp = entry.timestamp.split('T')[1].split('.')[0];
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${category}]`;
    const fullMessage = billId ? `${prefix} [Bill: ${billId}] ${message}` : `${prefix} ${message}`;

    switch (level) {
      case 'debug':
        console.log(`%c${fullMessage}`, 'color: #888', data || '');
        break;
      case 'info':
        console.log(`%c${fullMessage}`, 'color: #0ea5e9', data || '');
        break;
      case 'warn':
        console.warn(`%c${fullMessage}`, 'color: #f59e0b', data || '');
        break;
      case 'error':
        console.error(`%c${fullMessage}`, 'color: #ef4444', data || '');
        break;
    }

    // In a real application, you might also send logs to a server
    if (level === 'error') {
      this.sendToServer(entry);
    }
  }

  private sendToServer(entry: LogEntry) {
    // In a real app, send error logs to monitoring service
    // For now, we'll just store them locally
    try {
      const errors = JSON.parse(localStorage.getItem('chatgov-errors') || '[]');
      errors.push(entry);
      if (errors.length > 50) errors.shift();
      localStorage.setItem('chatgov-errors', JSON.stringify(errors));
    } catch (e) {
      console.error('Failed to store error log:', e);
    }
  }

  // Public methods for different categories
  billDownload = {
    start: (billId: string, source: string) => {
      this.log('info', 'BILL_DOWNLOAD', `Starting download from ${source}`, { source }, billId);
    },
    progress: (billId: string, stage: string, details?: any) => {
      this.log('debug', 'BILL_DOWNLOAD', `Progress: ${stage}`, details, billId);
    },
    success: (billId: string, textLength: number, source: string) => {
      this.log('info', 'BILL_DOWNLOAD', `Successfully downloaded ${textLength} characters from ${source}`, 
        { textLength, source }, billId);
    },
    fallback: (billId: string, reason: string) => {
      this.log('warn', 'BILL_DOWNLOAD', `Falling back to mock data: ${reason}`, { reason }, billId);
    },
    error: (billId: string, error: any, source: string) => {
      this.log('error', 'BILL_DOWNLOAD', `Failed to download from ${source}`, 
        { error: error.message, stack: error.stack }, billId);
    }
  };

  embedding = {
    start: (billId: string, provider: string, model: string, chunkCount: number) => {
      this.log('info', 'EMBEDDING', `Starting embedding creation with ${provider}/${model} for ${chunkCount} chunks`, 
        { provider, model, chunkCount }, billId);
    },
    progress: (billId: string, completed: number, total: number, batchNumber?: number) => {
      const percentage = Math.round((completed / total) * 100);
      const progressMsg = batchNumber 
        ? `Batch ${batchNumber}: ${completed}/${total} chunks (${percentage}%)`
        : `${completed}/${total} chunks (${percentage}%)`;
      this.log('debug', 'EMBEDDING', `Progress: ${progressMsg}`, 
        { completed, total, percentage, batchNumber }, billId);
    },
    batchComplete: (billId: string, batchNumber: number, batchSize: number, timeTaken: number) => {
      this.log('debug', 'EMBEDDING', `Batch ${batchNumber} completed: ${batchSize} embeddings in ${timeTaken}ms`, 
        { batchNumber, batchSize, timeTaken }, billId);
    },
    success: (billId: string, totalChunks: number, totalTime: number, provider: string) => {
      const chunksPerSecond = Math.round((totalChunks / totalTime) * 1000);
      this.log('info', 'EMBEDDING', `Successfully created ${totalChunks} embeddings in ${totalTime}ms (${chunksPerSecond} chunks/sec)`, 
        { totalChunks, totalTime, chunksPerSecond, provider }, billId);
    },
    error: (billId: string, error: any, provider: string, chunkIndex?: number) => {
      const errorData = { 
        error: error.message, 
        provider, 
        chunkIndex,
        stack: error.stack 
      };
      this.log('error', 'EMBEDDING', `Embedding creation failed${chunkIndex !== undefined ? ` at chunk ${chunkIndex}` : ''}`, 
        errorData, billId);
    }
  };

  search = {
    start: (billId: string, query: string, provider: string) => {
      this.log('debug', 'SEARCH', `Starting similarity search: "${query}" with ${provider}`, 
        { query, provider }, billId);
    },
    queryEmbedding: (billId: string, query: string, cached: boolean) => {
      this.log('debug', 'SEARCH', `Query embedding ${cached ? 'loaded from cache' : 'created'}`, 
        { query, cached }, billId);
    },
    results: (billId: string, query: string, resultCount: number, topSimilarity: number) => {
      this.log('debug', 'SEARCH', `Found ${resultCount} relevant chunks, top similarity: ${topSimilarity.toFixed(4)}`, 
        { query, resultCount, topSimilarity }, billId);
    },
    error: (billId: string, query: string, error: any) => {
      this.log('error', 'SEARCH', `Search failed for query: "${query}"`, 
        { query, error: error.message }, billId);
    }
  };

  ai = {
    request: (billId: string, provider: string, hasRelevantChunks: boolean, queryLength: number) => {
      this.log('debug', 'AI_REQUEST', `Sending request to ${provider}${hasRelevantChunks ? ' with relevant chunks' : ' without chunks'}`, 
        { provider, hasRelevantChunks, queryLength }, billId);
    },
    response: (billId: string, provider: string, responseLength: number, timeTaken: number) => {
      this.log('debug', 'AI_REQUEST', `Received response from ${provider}: ${responseLength} characters in ${timeTaken}ms`, 
        { provider, responseLength, timeTaken }, billId);
    },
    error: (billId: string, provider: string, error: any) => {
      this.log('error', 'AI_REQUEST', `AI request failed with ${provider}`, 
        { provider, error: error.message }, billId);
    }
  };

  // Utility methods
  getLogs(category?: string, billId?: string): LogEntry[] {
    return this.logs.filter(log => 
      (!category || log.category === category) &&
      (!billId || log.billId === billId)
    );
  }

  getErrorLogs(): LogEntry[] {
    return this.logs.filter(log => log.level === 'error');
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();