import axios from 'axios';
import type { Bill } from '../types';

export class CongressApiService {
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

  private getApiKey(): string {
    // Try to get from environment variables (Vite uses VITE_ prefix)
    const apiKey = import.meta.env.VITE_CONGRESS_API_KEY || 'demo_key';
    return apiKey;
  }

  async searchBills(query: string, limit: number = 20): Promise<Bill[]> {
    try {
      const response = await axios.get(`${this.getServerBaseUrl()}/api/congress/bills/search`, {
        params: {
          q: query,
          limit,
          api_key: this.getApiKey()
        }
      });

      return response.data || [];
    } catch (error) {
      console.error('Error searching bills:', error);
      console.warn('⚠️ DEMO MODE: Using mock bill search data instead of live Congress API');
      return this.getMockBills(query);
    }
  }

  async getRecentBills(limit: number = 5): Promise<Bill[]> {
    try {
      const response = await axios.get(`${this.getServerBaseUrl()}/api/congress/bills/recent`, {
        params: {
          limit,
          api_key: this.getApiKey()
        }
      });

      return response.data || [];
    } catch (error) {
      console.error('Error fetching recent bills:', error);
      console.warn('⚠️ DEMO MODE: Using mock recent bills data instead of live Congress API');
      return this.getMockRecentBills();
    }
  }

  async getBillDetails(congress: number, billType: string, billNumber: string): Promise<Bill | null> {
    try {
      const response = await axios.get(`${this.getServerBaseUrl()}/api/congress/bills/${congress}/${billType}/${billNumber}`, {
        params: {
          api_key: this.getApiKey()
        }
      });

      return response.data || null;
    } catch (error) {
      console.error('Error fetching bill details:', error);
      console.warn('⚠️ DEMO MODE: Bill details not available from Congress API');
      return null;
    }
  }

  async getPassedLegislation(page: number = 1, limit: number = 20, congress: number = 119): Promise<{ bills: Bill[], hasMore: boolean, total: number }> {
    try {
      const offset = (page - 1) * limit;
      const congressNumber = congress || 119; // Default to 119 if no number provided
      const url = `${this.getServerBaseUrl()}/api/congress/law/${congressNumber}/pub`;
      const params = {
        offset,
        limit,
        format: 'json',
        api_key: this.getApiKey()
      };
      
      console.log(`Fetching passed legislation from ${congressNumber}th Congress:`, { url, params });
      
      const response = await axios.get(url, { params });

      console.log('Passed legislation response:', response.data);
      return response.data || { bills: [], hasMore: false, total: 0 };
    } catch (error) {
      console.error('Error fetching passed legislation:', error);
      console.warn('⚠️ DEMO MODE: Using mock passed legislation data instead of live Congress API');
      return this.getMockPassedLegislation(page, limit);
    }
  }

  async getPassedLegislationAcrossCongresses(page: number = 1, limit: number = 20): Promise<{ bills: Bill[], hasMore: boolean, total: number }> {
    try {
      const offset = (page - 1) * limit;
      // Get laws from recent congresses (118th, 117th, 116th) sorted by date
      const response = await axios.get(`${this.getServerBaseUrl()}/api/congress/law/recent`, {
        params: {
          offset,
          limit,
          format: 'json',
          api_key: this.getApiKey() // Include API key parameter
        }
      });

      return response.data || { bills: [], hasMore: false, total: 0 };
    } catch (error) {
      console.error('Error fetching passed legislation across congresses:', error);
      console.warn('⚠️ DEMO MODE: Using mock passed legislation data instead of live Congress API');
      return this.getMockPassedLegislation(page, limit);
    }
  }

  private getMockBills(query: string): Bill[] {
    return [
      {
        congress: 119,
        number: '1',
        type: 'HR',
        title: `[DEMO DATA] Infrastructure Investment and Jobs Act (matching: ${query})`,
        introducedDate: '2025-01-01',
        latestAction: {
          actionDate: '2023-01-15',
          text: 'Passed House'
        },
        sponsors: [{
          firstName: 'John',
          lastName: 'Doe',
          party: 'D',
          state: 'CA'
        }],
        summary: {
          text: '[DEMO DATA] A bill to invest in American infrastructure and create jobs.'
        },
        url: 'https://congress.gov/bill/118th-congress/house-bill/1'
      },
      {
        congress: 119,
        number: '2',
        type: 'S',
        title: `[DEMO DATA] Climate Action and Clean Energy Act (matching: ${query})`,
        introducedDate: '2025-02-01',
        latestAction: {
          actionDate: '2023-02-20',
          text: 'Introduced in Senate'
        },
        sponsors: [{
          firstName: 'Jane',
          lastName: 'Smith',
          party: 'D',
          state: 'NY'
        }],
        summary: {
          text: '[DEMO DATA] A comprehensive bill to address climate change through clean energy investments.'
        },
        url: 'https://congress.gov/bill/118th-congress/senate-bill/2'
      }
    ];
  }

  private getMockRecentBills(): Bill[] {
    return [
      {
        congress: 119,
        number: '4521',
        type: 'HR',
        title: '[DEMO DATA] National Defense Authorization Act for Fiscal Year 2025',
        introducedDate: '2024-12-15',
        latestAction: {
          actionDate: '2024-12-20',
          text: 'Passed House, sent to Senate'
        },
        sponsors: [{
          firstName: 'Mike',
          lastName: 'Rogers',
          party: 'R',
          state: 'AL'
        }],
        summary: {
          text: '[DEMO DATA] A bill to authorize appropriations for fiscal year 2025 for military activities of the Department of Defense.'
        },
        url: 'https://congress.gov/bill/118th-congress/house-bill/4521'
      },
      {
        congress: 119,
        number: '3142',
        type: 'S',
        title: '[DEMO DATA] Social Security 2100: A Sacred Trust Act',
        introducedDate: '2024-12-10',
        latestAction: {
          actionDate: '2024-12-18',
          text: 'Referred to Committee on Finance'
        },
        sponsors: [{
          firstName: 'Bernie',
          lastName: 'Sanders',
          party: 'I',
          state: 'VT'
        }],
        summary: {
          text: '[DEMO DATA] A bill to expand Social Security benefits and ensure the long-term solvency of the Social Security Trust Fund.'
        },
        url: 'https://congress.gov/bill/118th-congress/senate-bill/3142'
      },
      {
        congress: 119,
        number: '9876',
        type: 'HR',
        title: '[DEMO DATA] Affordable Housing and Community Development Act',
        introducedDate: '2024-12-05',
        latestAction: {
          actionDate: '2024-12-16',
          text: 'Markup by Committee on Financial Services'
        },
        sponsors: [{
          firstName: 'Maxine',
          lastName: 'Waters',
          party: 'D',
          state: 'CA'
        }],
        summary: {
          text: '[DEMO DATA] A bill to address the affordable housing crisis and promote community development.'
        },
        url: 'https://congress.gov/bill/118th-congress/house-bill/9876'
      },
      {
        congress: 119,
        number: '2758',
        type: 'S',
        title: '[DEMO DATA] Clean Energy Innovation and Deployment Act',
        introducedDate: '2024-11-28',
        latestAction: {
          actionDate: '2024-12-14',
          text: 'Committee hearing held'
        },
        sponsors: [{
          firstName: 'Joe',
          lastName: 'Manchin',
          party: 'D',
          state: 'WV'
        }],
        summary: {
          text: '[DEMO DATA] A bill to accelerate clean energy innovation and deployment across the United States.'
        },
        url: 'https://congress.gov/bill/118th-congress/senate-bill/2758'
      },
      {
        congress: 119,
        number: '8543',
        type: 'HR',
        title: '[DEMO DATA] Small Business Recovery and Growth Act',
        introducedDate: '2024-11-20',
        latestAction: {
          actionDate: '2024-12-12',
          text: 'Subcommittee consideration and markup'
        },
        sponsors: [{
          firstName: 'Nydia',
          lastName: 'Velazquez',
          party: 'D',
          state: 'NY'
        }],
        summary: {
          text: '[DEMO DATA] A bill to provide support and resources for small business recovery and growth.'
        },
        url: 'https://congress.gov/bill/118th-congress/house-bill/8543'
      }
    ];
  }

  private getMockPassedLegislation(page: number, limit: number): { bills: Bill[], hasMore: boolean, total: number } {
    console.log('Using mock passed legislation data');
    const allPassedBills: Bill[] = [
      {
        congress: 119,
        number: '1',
        type: 'HR',
        title: '[DEMO DATA] Infrastructure Investment and Jobs Act',
        introducedDate: '2025-01-01',
        latestAction: {
          actionDate: '2025-01-15',
          text: 'Became Public Law No: 119-1'
        },
        sponsors: [{
          firstName: 'Pete',
          lastName: 'Buttigieg',
          party: 'D',
          state: 'IN'
        }],
        summary: {
          text: '[DEMO DATA] A comprehensive bill to rebuild American infrastructure, create jobs, and strengthen economic competitiveness.'
        },
        url: 'https://congress.gov/bill/118th-congress/house-bill/1'
      },
      {
        congress: 119,
        number: '2',
        type: 'S',
        title: '[DEMO DATA] CHIPS and Science Act',
        introducedDate: '2025-02-01',
        latestAction: {
          actionDate: '2025-02-15',
          text: 'Became Public Law No: 119-2'
        },
        sponsors: [{
          firstName: 'Chuck',
          lastName: 'Schumer',
          party: 'D',
          state: 'NY'
        }],
        summary: {
          text: '[DEMO DATA] A bill to strengthen American semiconductor manufacturing and research capabilities.'
        },
        url: 'https://congress.gov/bill/118th-congress/senate-bill/2'
      },
      {
        congress: 119,
        number: '3',
        type: 'HR',
        title: '[DEMO DATA] Inflation Reduction Act',
        introducedDate: '2025-03-01',
        latestAction: {
          actionDate: '2024-10-20',
          text: 'Became Public Law No: 118-3'
        },
        sponsors: [{
          firstName: 'Joe',
          lastName: 'Manchin',
          party: 'D',
          state: 'WV'
        }],
        summary: {
          text: '[DEMO DATA] A bill to reduce inflation through deficit reduction, energy security investments, and healthcare cost reductions.'
        },
        url: 'https://congress.gov/bill/118th-congress/house-bill/3'
      },
      {
        congress: 119,
        number: '4',
        type: 'S',
        title: '[DEMO DATA] Veterans Benefits Enhancement Act',
        introducedDate: '2025-04-01',
        latestAction: {
          actionDate: '2024-09-10',
          text: 'Became Public Law No: 118-4'
        },
        sponsors: [{
          firstName: 'Jon',
          lastName: 'Tester',
          party: 'D',
          state: 'MT'
        }],
        summary: {
          text: '[DEMO DATA] A bill to expand and improve benefits for veterans and their families.'
        },
        url: 'https://congress.gov/bill/118th-congress/senate-bill/4'
      },
      {
        congress: 119,
        number: '5',
        type: 'HR',
        title: '[DEMO DATA] Secure Border and Immigration Reform Act',
        introducedDate: '2025-05-01',
        latestAction: {
          actionDate: '2024-08-05',
          text: 'Became Public Law No: 118-5'
        },
        sponsors: [{
          firstName: 'Henry',
          lastName: 'Cuellar',
          party: 'D',
          state: 'TX'
        }],
        summary: {
          text: '[DEMO DATA] A comprehensive bill to reform immigration policy and strengthen border security.'
        },
        url: 'https://congress.gov/bill/118th-congress/house-bill/5'
      },
      {
        congress: 119,
        number: '6',
        type: 'S',
        title: '[DEMO DATA] American Clean Energy Independence Act',
        introducedDate: '2025-06-01',
        latestAction: {
          actionDate: '2024-07-22',
          text: 'Became Public Law No: 118-6'
        },
        sponsors: [{
          firstName: 'Mark',
          lastName: 'Kelly',
          party: 'D',
          state: 'AZ'
        }],
        summary: {
          text: '[DEMO DATA] A bill to achieve American energy independence through clean energy investments and production.'
        },
        url: 'https://congress.gov/bill/118th-congress/senate-bill/6'
      }
    ];

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const bills = allPassedBills.slice(startIndex, endIndex);
    const hasMore = endIndex < allPassedBills.length;

    return {
      bills,
      hasMore,
      total: allPassedBills.length
    };
  }
}