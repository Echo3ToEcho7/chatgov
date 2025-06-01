import { Router } from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const CONGRESS_API_BASE = 'https://api.congress.gov/v3';

// Helper function to add API key to parameters
const getApiParams = (params: Record<string, any>) => {
  const apiParams = { ...params };
  const API_KEY = process.env.CONGRESS_API_KEY;
  
  if (API_KEY) {
    apiParams.api_key = API_KEY;
  }
  
  return apiParams;
};

// Transform bill data from Congress API format to our format
const transformBill = (billData: any) => {
  return {
    congress: billData.congress,
    number: billData.number,
    type: billData.type,
    title: billData.title,
    introducedDate: billData.introducedDate,
    latestAction: billData.latestAction,
    sponsors: billData.sponsors,
    summary: billData.summary,
    url: billData.url || `https://congress.gov/bill/${billData.congress}th-congress/${billData.type.toLowerCase()}-bill/${billData.number}`
  };
};

// Mock data fallbacks
const getMockBills = (query: string) => {
  return [
    {
      congress: 118,
      number: '1',
      type: 'HR',
      title: `Infrastructure Investment and Jobs Act (matching: ${query})`,
      introducedDate: '2023-01-01',
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
        text: 'A bill to invest in American infrastructure and create jobs.'
      },
      url: 'https://congress.gov/bill/118th-congress/house-bill/1'
    },
    {
      congress: 118,
      number: '2',
      type: 'S',
      title: `Climate Action and Clean Energy Act (matching: ${query})`,
      introducedDate: '2023-02-01',
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
        text: 'A comprehensive bill to address climate change through clean energy investments.'
      },
      url: 'https://congress.gov/bill/118th-congress/senate-bill/2'
    }
  ];
};

const getMockRecentBills = () => {
  return [
    {
      congress: 118,
      number: '4521',
      type: 'HR',
      title: 'National Defense Authorization Act for Fiscal Year 2025',
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
        text: 'A bill to authorize appropriations for fiscal year 2025 for military activities of the Department of Defense.'
      },
      url: 'https://congress.gov/bill/118th-congress/house-bill/4521'
    },
    {
      congress: 118,
      number: '3142',
      type: 'S',
      title: 'Social Security 2100: A Sacred Trust Act',
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
        text: 'A bill to expand Social Security benefits and ensure the long-term solvency of the Social Security Trust Fund.'
      },
      url: 'https://congress.gov/bill/118th-congress/senate-bill/3142'
    },
    {
      congress: 118,
      number: '9876',
      type: 'HR',
      title: 'Affordable Housing and Community Development Act',
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
        text: 'A bill to address the affordable housing crisis and promote community development.'
      },
      url: 'https://congress.gov/bill/118th-congress/house-bill/9876'
    },
    {
      congress: 118,
      number: '2758',
      type: 'S',
      title: 'Clean Energy Innovation and Deployment Act',
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
        text: 'A bill to accelerate clean energy innovation and deployment across the United States.'
      },
      url: 'https://congress.gov/bill/118th-congress/senate-bill/2758'
    },
    {
      congress: 118,
      number: '8543',
      type: 'HR',
      title: 'Small Business Recovery and Growth Act',
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
        text: 'A bill to provide support and resources for small business recovery and growth.'
      },
      url: 'https://congress.gov/bill/118th-congress/house-bill/8543'
    }
  ];
};

// GET /api/congress/bills/search?q=query&limit=20
router.get('/bills/search', async (req: Request, res: Response) => {
  try {
    const { q: query, limit = 20 } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query parameter "q" is required'
      });
    }

    console.log(`🔍 Congress API: Searching bills for query: "${query}"`);

    try {
      const response = await axios.get(`${CONGRESS_API_BASE}/bill`, {
        params: getApiParams({
          q: query,
          limit: Number(limit),
          format: 'json'
        })
      });

      const bills = response.data.bills?.map(transformBill) || [];
      console.log(`✅ Congress API: Found ${bills.length} bills for query: "${query}"`);
      res.json(bills);
    } catch (error) {
      console.error('❌ Congress API error, using mock data:', error);
      res.json(getMockBills(query));
    }
  } catch (error) {
    console.error('Error in search endpoint:', error);
    res.status(500).json({
      error: 'Failed to search bills',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/congress/bills/recent?limit=5
router.get('/bills/recent', async (req: Request, res: Response) => {
  try {
    const { limit = 5 } = req.query;

    console.log(`📋 Congress API: Fetching ${limit} recent bills`);

    try {
      const response = await axios.get(`${CONGRESS_API_BASE}/bill`, {
        params: getApiParams({
          limit: Number(limit),
          sort: 'updateDate desc',
          format: 'json'
        })
      });

      const bills = response.data.bills?.map(transformBill) || [];
      console.log(`✅ Congress API: Found ${bills.length} recent bills`);
      res.json(bills);
    } catch (error) {
      console.error('❌ Congress API error, using mock data:', error);
      res.json(getMockRecentBills());
    }
  } catch (error) {
    console.error('Error in recent bills endpoint:', error);
    res.status(500).json({
      error: 'Failed to fetch recent bills',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/congress/bills/:congress/:type/:number
router.get('/bills/:congress/:type/:number', async (req: Request, res: Response) => {
  try {
    const { congress, type, number } = req.params;

    console.log(`📄 Congress API: Fetching bill details for ${congress}-${type}-${number}`);

    try {
      const response = await axios.get(`${CONGRESS_API_BASE}/bill/${congress}/${type}/${number}`, {
        params: getApiParams({
          format: 'json'
        })
      });

      const bill = transformBill(response.data.bill);
      console.log(`✅ Congress API: Found bill details for ${congress}-${type}-${number}`);
      res.json(bill);
    } catch (error) {
      console.error(`❌ Congress API error for ${congress}-${type}-${number}:`, error);
      res.status(404).json({
        error: 'Bill not found'
      });
    }
  } catch (error) {
    console.error('Error in bill details endpoint:', error);
    res.status(500).json({
      error: 'Failed to fetch bill details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/congress/law/:congress/pub - Get passed legislation for a specific congress
router.get('/law/:congress/pub', async (req: Request, res: Response) => {
  try {
    const { congress } = req.params;
    const { offset = 0, limit = 20, format = 'json' } = req.query;

    console.log(`📜 Congress API: Fetching passed legislation for ${congress}th Congress (offset: ${offset}, limit: ${limit})`);

    try {
      const response = await axios.get(`${CONGRESS_API_BASE}/law/${congress}/pub`, {
        params: getApiParams({
          offset: Number(offset),
          limit: Number(limit),
          format
        })
      });

      const bills = response.data.bills || [];
      const total = response.data.pagination?.count || bills.length;
      const hasMore = Number(offset) + Number(limit) < total;

      // Transform bills that became laws to our bill format
      const transformedBills = bills.map((bill: any) => ({
        congress: bill.congress,
        number: bill.number,
        type: bill.type,
        title: bill.title,
        introducedDate: bill.introducedDate || bill.updateDate,
        latestAction: bill.latestAction,
        sponsors: bill.sponsors || [],
        summary: bill.summary || { text: 'No summary available.' },
        url: bill.url
      }));

      console.log(`✅ Congress API: Found ${transformedBills.length} laws for ${congress}th Congress`);
      res.json({ bills: transformedBills, hasMore, total });
    } catch (error) {
      console.error(`❌ Congress API error for laws in ${congress}th Congress:`, error);
      // Return empty result instead of mock data for law endpoints
      res.json({ bills: [], hasMore: false, total: 0 });
    }
  } catch (error) {
    console.error('Error in law endpoint:', error);
    res.status(500).json({
      error: 'Failed to fetch passed legislation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/congress/law/recent - Get recent passed legislation across congresses
router.get('/law/recent', async (req: Request, res: Response) => {
  try {
    const { offset = 0, limit = 20, format = 'json' } = req.query;

    console.log(`📜 Congress API: Fetching recent passed legislation (offset: ${offset}, limit: ${limit})`);

    try {
      // Query recent laws from multiple congresses (118th, 117th, 116th)
      const congresses = [118, 117, 116];
      const allLaws: any[] = [];

      for (const congress of congresses) {
        try {
          const response = await axios.get(`${CONGRESS_API_BASE}/law/${congress}/pub`, {
            params: getApiParams({
              limit: 50, // Get more to sort by date
              format
            })
          });
          
          const bills = response.data.bills || [];
          allLaws.push(...bills.map((bill: any) => ({ ...bill, congress })));
        } catch (congressError) {
          console.warn(`Failed to fetch laws for ${congress}th Congress:`, congressError);
        }
      }

      // Sort by latest action date, most recent first
      allLaws.sort((a, b) => {
        const dateA = new Date(a.latestAction?.actionDate || a.updateDate || '1900-01-01');
        const dateB = new Date(b.latestAction?.actionDate || b.updateDate || '1900-01-01');
        return dateB.getTime() - dateA.getTime();
      });

      // Apply pagination
      const startIndex = Number(offset);
      const endIndex = startIndex + Number(limit);
      const paginatedLaws = allLaws.slice(startIndex, endIndex);
      const hasMore = endIndex < allLaws.length;

      // Transform to consistent bill format
      const bills = paginatedLaws.map((bill: any) => ({
        congress: bill.congress,
        number: bill.number,
        type: bill.type,
        title: bill.title,
        introducedDate: bill.introducedDate || bill.updateDate,
        latestAction: bill.latestAction,
        sponsors: bill.sponsors || [],
        summary: bill.summary || { text: 'No summary available.' },
        url: bill.url
      }));

      console.log(`✅ Congress API: Found ${bills.length} recent laws across congresses`);
      res.json({ bills, hasMore, total: allLaws.length });
    } catch (error) {
      console.error('❌ Congress API error for recent laws:', error);
      // Return empty result instead of mock data for law endpoints
      res.json({ bills: [], hasMore: false, total: 0 });
    }
  } catch (error) {
    console.error('Error in recent laws endpoint:', error);
    res.status(500).json({
      error: 'Failed to fetch recent passed legislation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as congressRouter };