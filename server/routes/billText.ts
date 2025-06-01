import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Bill } from '../../src/types';
import type { BillContent, BillChunk } from '../../src/types/bill';

const router = Router();

// Mock logger for server-side use
const logger = {
  billDownload: {
    start: (billId: string, source: string) => {
      console.log(`[BILL_DOWNLOAD] ${new Date().toISOString()} - Starting download for ${billId} from ${source}`);
    },
    progress: (billId: string, stage: string, details?: any) => {
      console.log(`[BILL_DOWNLOAD] ${new Date().toISOString()} - ${billId}: ${stage}`, details ? JSON.stringify(details) : '');
    },
    success: (billId: string, textLength: number, source: string) => {
      console.log(`[BILL_DOWNLOAD] ${new Date().toISOString()} - Successfully downloaded ${billId} (${textLength} chars) from ${source}`);
    },
    error: (billId: string, error: any, source: string) => {
      console.error(`[BILL_DOWNLOAD] ${new Date().toISOString()} - Error downloading ${billId} from ${source}:`, error);
    },
    fallback: (billId: string, reason: string) => {
      console.warn(`[BILL_DOWNLOAD] ${new Date().toISOString()} - Falling back to mock data for ${billId}: ${reason}`);
    }
  }
};

class ServerBillTextService {
  private cache = new Map<string, BillContent>();

  async downloadBillText(bill: Bill): Promise<string> {
    const billId = `${bill.congress}-${bill.type}-${bill.number}`;
    
    try {
      logger.billDownload.start(billId, 'Congress API (Server)');
      
      // Use environment variable for Congress API key
      const API_KEY = process.env.CONGRESS_API_KEY;
      
      // Congress.gov text endpoint format
      let textUrl = `https://api.congress.gov/v3/bill/${bill.congress}/${bill.type.toLowerCase()}/${bill.number}/text`;
      
      // Add API key as query parameter if available
      if (API_KEY) {
        textUrl += `?api_key=${encodeURIComponent(API_KEY)}`;
      }
      
      logger.billDownload.progress(billId, 'Fetching bill metadata', { url: textUrl.replace(/api_key=[^&]+/, 'api_key=[REDACTED]'), hasApiKey: !!API_KEY });
      
      try {
        const headers: Record<string, string> = {
          'Accept': 'application/json'
        };
        
        const response = await fetch(textUrl, { headers });
        
        logger.billDownload.progress(billId, 'Received metadata response', { 
          status: response.status, 
          statusText: response.statusText 
        });
        
        if (response.ok) {
          const data = await response.json();
          logger.billDownload.progress(billId, 'Parsed metadata', { 
            textVersionsCount: data.textVersions?.length || 0 
          });
          
          if (data.textVersions && data.textVersions.length > 0) {
            // Get the most recent version
            const latestVersion = data.textVersions[0];
            const formatUrl = latestVersion.formats.find((f: any) => f.type === 'Formatted Text')?.url || latestVersion.formats[0]?.url;
            
            logger.billDownload.progress(billId, 'Downloading full text', { 
              version: latestVersion.type,
              formatUrl: formatUrl.replace(/api_key=[^&]+/, 'api_key=[REDACTED]') 
            });
            
            // Add API key as query parameter to format URL if available
            let finalFormatUrl = formatUrl;
            if (API_KEY) {
              const separator = formatUrl.includes('?') ? '&' : '?';
              finalFormatUrl = `${formatUrl}${separator}api_key=${encodeURIComponent(API_KEY)}`;
            }
            
            const textResponse = await fetch(finalFormatUrl);
            if (textResponse.ok) {
              const fullText = await textResponse.text();
              logger.billDownload.success(billId, fullText.length, 'Congress API (Server)');
              return fullText;
            } else {
              logger.billDownload.progress(billId, 'Text download failed', { 
                status: textResponse.status,
                statusText: textResponse.statusText 
              });
            }
          } else {
            logger.billDownload.progress(billId, 'No text versions available in metadata');
          }
        } else {
          logger.billDownload.progress(billId, 'Metadata request failed', { 
            status: response.status,
            statusText: response.statusText 
          });
        }
      } catch (error) {
        logger.billDownload.error(billId, error, 'Congress API (Server)');
        logger.billDownload.fallback(billId, `Congress API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Fallback to mock bill text
      logger.billDownload.start(billId, 'Mock Data (Server)');
      const mockText = this.getMockBillText(bill);
      logger.billDownload.success(billId, mockText.length, 'Mock Data (Server)');
      return mockText;
      
    } catch (error) {
      logger.billDownload.error(billId, error, 'Server Bill Text Service');
      throw new Error(`Failed to download bill text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
        logger.billDownload.progress(billId, 'Cache expired, re-downloading', {
          cacheAge: Math.round((Date.now() - cached.lastUpdated.getTime()) / 1000 / 60)
        });
      }
    }

    // Download and process bill text
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

const billTextService = new ServerBillTextService();

// GET /api/bills/:congress/:type/:number/content
router.get('/:congress/:type/:number/content', async (req: Request, res: Response) => {
  try {
    const { congress, type, number } = req.params;
    
    // Validate parameters
    if (!congress || !type || !number) {
      return res.status(400).json({ 
        error: 'Missing required parameters: congress, type, number' 
      });
    }

    // Create a bill object from the parameters
    const bill: Partial<Bill> = {
      congress: parseInt(congress),
      type: type.toUpperCase(),
      number: parseInt(number),
      title: `${type.toUpperCase()} ${number}`, // Will be updated when we get the full data
      introducedDate: new Date().toISOString(),
      sponsors: [],
      latestAction: undefined,
      summary: undefined
    };

    // For a complete implementation, you might want to fetch full bill metadata first
    // For now, we'll work with the minimal data provided
    const billContent = await billTextService.getBillContent(bill as Bill);
    
    res.json(billContent);
  } catch (error) {
    console.error('Error fetching bill content:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bill content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/bills/content
router.post('/content', async (req: Request, res: Response) => {
  try {
    const bill: Bill = req.body;
    
    // Validate bill object
    if (!bill || !bill.congress || !bill.type || !bill.number) {
      return res.status(400).json({ 
        error: 'Invalid bill object. Required fields: congress, type, number' 
      });
    }

    const billContent = await billTextService.getBillContent(bill);
    
    res.json(billContent);
  } catch (error) {
    console.error('Error fetching bill content:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bill content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/bills/cache
router.delete('/cache', (req: Request, res: Response) => {
  try {
    billTextService.clearCache();
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ 
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as billTextRouter };