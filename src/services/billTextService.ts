import type { Bill } from '../types';
import type { BillContent, BillChunk } from '../types/bill';
import { logger } from '../utils/logger';

export class BillTextService {
  private cache = new Map<string, BillContent>();

  async downloadBillText(bill: Bill): Promise<string> {
    const billId = `${bill.congress}-${bill.type}-${bill.number}`;
    
    try {
      logger.billDownload.start(billId, 'Server API');
      
      // Use server endpoint for bill text downloading
      const serverUrl = `${this.getServerBaseUrl()}/api/bills/content`;
      
      logger.billDownload.progress(billId, 'Requesting from server', { url: serverUrl });
      
      try {
        const response = await fetch(serverUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(bill)
        });
        
        logger.billDownload.progress(billId, 'Received server response', { 
          status: response.status, 
          statusText: response.statusText 
        });
        
        if (response.ok) {
          const data = await response.json();
          logger.billDownload.progress(billId, 'Parsed server response', { 
            textLength: data.fullText?.length || 0,
            chunkCount: data.chunks?.length || 0
          });
          
          if (data.fullText) {
            logger.billDownload.success(billId, data.fullText.length, 'Server API');
            return data.fullText;
          } else {
            logger.billDownload.progress(billId, 'No full text in server response');
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          logger.billDownload.progress(billId, 'Server request failed', { 
            status: response.status,
            statusText: response.statusText,
            error: errorData.error || 'Unknown server error'
          });
        }
      } catch (error) {
        logger.billDownload.error(billId, error, 'Server API');
        logger.billDownload.fallback(billId, `Server API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Fallback to mock bill text
      logger.billDownload.start(billId, 'Mock Data');
      const mockText = this.getMockBillText(bill);
      logger.billDownload.success(billId, mockText.length, 'Mock Data');
      return mockText;
      
    } catch (error) {
      logger.billDownload.error(billId, error, 'Bill Text Service');
      throw new Error(`Failed to download bill text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getServerBaseUrl(): string {
    // Check if we're running in development mode with separate servers
    const isDevelopment = import.meta.env.DEV;
    const isViteDevServer = window.location.port === '5173';
    
    // If we're in Vite dev mode, use the separate server port
    if (isDevelopment && isViteDevServer) {
      return 'http://localhost:3001';
    }
    
    // Otherwise, use relative URLs (same server)
    return '';
  }

  private getMockBillText(bill: Bill): string {
    return `
${bill.type} ${bill.number} - ${bill.title}

${bill.congress}th Congress

SECTION 1. SHORT TITLE.

This Act may be cited as the "${bill.title}".

SECTION 2. FINDINGS.

Congress finds the following:
(1) This legislation addresses important matters of national concern.
(2) The provisions contained herein are necessary for the public good.
(3) Implementation of this Act will benefit American citizens.

SECTION 3. DEFINITIONS.

In this Act:
(1) SECRETARY.—The term "Secretary" means the Secretary of the relevant department.
(2) STATE.—The term "State" means each of the 50 States and the District of Columbia.

SECTION 4. MAIN PROVISIONS.

${bill.summary?.text || 'This bill contains important legislative provisions that address key policy areas and establish new frameworks for implementation.'}

The Secretary shall:
(1) establish guidelines for implementation;
(2) provide oversight and monitoring;
(3) submit annual reports to Congress on the effectiveness of this Act;
(4) coordinate with relevant stakeholders;
(5) ensure compliance with all applicable laws and regulations.

SECTION 5. FUNDING.

There are authorized to be appropriated such sums as may be necessary to carry out this Act for fiscal years 2024 through 2029.

SECTION 6. EFFECTIVE DATE.

This Act shall take effect 180 days after the date of enactment.

---

Introduced: ${new Date(bill.introducedDate).toLocaleDateString()}
${bill.sponsors ? `Sponsor: ${bill.sponsors[0].firstName} ${bill.sponsors[0].lastName} (${bill.sponsors[0].party}-${bill.sponsors[0].state})` : ''}
${bill.latestAction ? `Latest Action: ${bill.latestAction.text} (${new Date(bill.latestAction.actionDate).toLocaleDateString()})` : ''}
    `.trim();
  }

  chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): BillChunk[] {
    const chunks: BillChunk[] = [];
    const words = text.split(/\s+/);
    let currentIndex = 0;
    let chunkId = 0;

    while (currentIndex < words.length) {
      const endIndex = Math.min(currentIndex + chunkSize, words.length);
      const chunkWords = words.slice(currentIndex, endIndex);
      const chunkText = chunkWords.join(' ');
      
      // Try to identify section information
      const sectionMatch = chunkText.match(/SECTION\s+(\d+)\.\s+([^.]+)/i);
      
      chunks.push({
        id: `chunk-${chunkId++}`,
        text: chunkText,
        startIndex: currentIndex,
        endIndex: endIndex,
        section: sectionMatch ? `Section ${sectionMatch[1]}` : undefined,
        subsection: sectionMatch ? sectionMatch[2].trim() : undefined
      });

      // Move forward, considering overlap
      currentIndex = Math.max(currentIndex + chunkSize - overlap, currentIndex + 1);
      
      // Prevent infinite loop
      if (endIndex >= words.length) break;
    }

    return chunks;
  }

  async getBillContent(bill: Bill): Promise<BillContent> {
    const billId = `${bill.congress}-${bill.type}-${bill.number}`;
    
    // Check cache first
    if (this.cache.has(billId)) {
      const cached = this.cache.get(billId)!;
      // Return cached version if less than 1 hour old
      if (Date.now() - cached.lastUpdated.getTime() < 60 * 60 * 1000) {
        logger.billDownload.progress(billId, 'Using cached content', {
          cacheAge: Math.round((Date.now() - cached.lastUpdated.getTime()) / 1000 / 60),
          chunks: cached.chunks.length
        });
        return cached;
      } else {
        logger.billDownload.progress(billId, 'Cache expired, requesting from server', {
          cacheAge: Math.round((Date.now() - cached.lastUpdated.getTime()) / 1000 / 60)
        });
      }
    }

    try {
      // Try to get complete bill content from server
      logger.billDownload.start(billId, 'Server API (Complete)');
      
      const serverUrl = `${this.getServerBaseUrl()}/api/bills/content`;
      
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(bill)
      });
      
      if (response.ok) {
        const billContent: BillContent = await response.json();
        
        logger.billDownload.success(billId, billContent.fullText.length, 'Server API (Complete)');
        logger.billDownload.progress(billId, 'Received complete content from server', {
          textLength: billContent.fullText.length,
          chunkCount: billContent.chunks.length
        });
        
        // Update cache
        this.cache.set(billId, billContent);
        logger.billDownload.progress(billId, 'Content cached', { billId });
        
        return billContent;
      } else {
        logger.billDownload.progress(billId, 'Server request failed, falling back to client-side processing');
      }
    } catch (error) {
      logger.billDownload.error(billId, error, 'Server API (Complete)');
      logger.billDownload.fallback(billId, 'Server error, falling back to client-side processing');
    }

    // Fallback: Download and process bill text client-side
    const fullText = await this.downloadBillText(bill);
    
    logger.billDownload.progress(billId, 'Starting text chunking', { textLength: fullText.length });
    const chunks = this.chunkText(fullText);
    logger.billDownload.progress(billId, 'Text chunking completed', { 
      chunkCount: chunks.length,
      avgChunkSize: Math.round(fullText.length / chunks.length)
    });
    
    const billContent: BillContent = {
      billId,
      fullText,
      chunks,
      embeddings: [], // Will be filled by embedding service
      lastUpdated: new Date()
    };

    this.cache.set(billId, billContent);
    logger.billDownload.progress(billId, 'Content cached', { billId });
    
    return billContent;
  }

  clearCache() {
    this.cache.clear();
  }
}