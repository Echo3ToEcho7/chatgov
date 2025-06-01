import { useState, useEffect, type KeyboardEvent } from 'react';
import type { Bill } from '../types';
import { CongressApiService } from '../services/congressApi';

interface BillSearchProps {
  onBillSelect: (bill: Bill) => void;
}

export const BillSearch = ({ onBillSelect }: BillSearchProps) => {
  const [query, setQuery] = useState('');
  const [bills, setBills] = useState<Bill[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const congressApi = new CongressApiService();

  useEffect(() => {
    const loadRecentBills = async () => {
      try {
        const recent = await congressApi.getRecentBills(5);
        setRecentBills(recent);
      } catch (error) {
        console.error('Failed to load recent bills:', error);
      }
    };
    
    loadRecentBills();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setSearched(true);
    try {
      const results = await congressApi.searchBills(query);
      setBills(results);
    } catch (error) {
      console.error('Search failed:', error);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const BillCard = ({ bill }: { bill: Bill }) => (
    <div className="card card-border hover:shadow-lg transition-shadow cursor-pointer"
         onClick={() => onBillSelect(bill)}>
      <div className="card-body">
        <h3 className="card-title mb-3">
          {bill.title}
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`badge ${
            bill.type === 'HR' ? 'badge-success' : 'badge-info'
          }`}>
            {bill.type} {bill.number}
          </span>
          <span className="badge badge-neutral">
            Congress {bill.congress}
          </span>
          <span className="badge badge-success">
            Introduced: {new Date(bill.introducedDate).toLocaleDateString()}
          </span>
        </div>
        {bill.sponsors && bill.sponsors.length > 0 && (
          <div className="mb-3 text-sm text-base-content/70">
            <strong>Sponsor:</strong> {bill.sponsors[0].firstName} {bill.sponsors[0].lastName} 
            <span className="ml-1 badge badge-accent badge-xs">
              {bill.sponsors[0].party}-{bill.sponsors[0].state}
            </span>
          </div>
        )}
        {bill.latestAction && (
          <div className="mb-4 text-sm text-base-content/70">
            <strong>Latest Action:</strong> {bill.latestAction.text}
            <span className="block text-xs text-base-content/50 mt-1">
              {new Date(bill.latestAction.actionDate).toLocaleDateString()}
            </span>
          </div>
        )}
        <div className="card-actions justify-end">
          <button className="btn btn-primary btn-block">
            Chat About This Bill
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-4xl font-bold text-center mb-8">
        US Bill Search
      </h1>
      
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search for bills by keyword, title, or topic..."
            className="input input-bordered flex-1"
          />
          <button 
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="btn btn-primary"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {!searched && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-3">Recent Bills</h2>
          <p className="text-base-content/70 mb-6 text-center">
            Here are the 5 most recently updated bills from Congress:
          </p>
          {recentBills.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              {recentBills.map((bill) => (
                <BillCard key={`${bill.congress}-${bill.type}-${bill.number}`} bill={bill} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-base-content/60">Loading recent bills...</p>
            </div>
          )}
        </div>
      )}

      {searched && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-6">
            Search Results ({bills.length})
          </h2>
          {bills.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-base-content/60 text-lg">No bills found. Try a different search term.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              {bills.map((bill) => (
                <BillCard key={`${bill.congress}-${bill.type}-${bill.number}`} bill={bill} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};