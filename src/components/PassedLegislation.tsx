import { useState, useEffect } from 'react';
import type { Bill } from '../types';
import { CongressApiService } from '../services/congressApi';
import { loadSettings } from '../utils/settings';
import { formatDate } from '../utils/dateUtils';

interface PassedLegislationProps {
  onBillSelect: (bill: Bill) => void;
}

export const PassedLegislation = ({ onBillSelect }: PassedLegislationProps) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const congressApi = new CongressApiService();
  const itemsPerPage = 10;

  useEffect(() => {
    loadPassedLegislation(1);
  }, []);

  const loadPassedLegislation = async (page: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const settings = loadSettings();
      const result = await congressApi.getPassedLegislation(page, itemsPerPage, settings.congressNumber);
      
      if (page === 1) {
        setBills(result.bills);
      } else {
        setBills(prev => [...prev, ...result.bills]);
      }
      
      setHasMore(result.hasMore);
      setTotal(result.total);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load passed legislation:', error);
      setError('Failed to load passed legislation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadPassedLegislation(currentPage + 1);
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
          <span className="badge badge-primary">
            Signed: {formatDate(bill.latestAction!.actionDate)}
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
            <strong>Status:</strong> {bill.latestAction.text}
            <span className="block text-xs text-base-content/50 mt-1">
              {formatDate(bill.latestAction.actionDate)}
            </span>
          </div>
        )}
        {bill.summary && (
          <div className="mb-4 text-sm text-base-content/70">
            <strong>Summary:</strong> {bill.summary.text}
          </div>
        )}
        <div className="card-actions justify-end">
          <button className="btn btn-primary btn-block">
            Chat About This Law
          </button>
        </div>
      </div>
    </div>
  );

  const settings = loadSettings();
  
  return (
    <div>
      <h1 className="text-4xl font-bold text-center mb-8">
        Passed Legislation
      </h1>
      
      <div className="text-center mb-8">
        <p className="text-base-content/70 mb-2">
          Browse bills from the {settings.congressNumber}th Congress that have been signed into law
        </p>
        <p className="text-sm text-base-content/60 mb-2">
          Sorted by most recent first • Change Congress in Settings
        </p>
        {total > 0 && (
          <p className="text-sm text-base-content/60">
            Showing {bills.length} of {total} passed bills
          </p>
        )}
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {bills.length > 0 ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {bills.map((bill) => (
              <BillCard key={`${bill.congress}-${bill.type}-${bill.number}`} bill={bill} />
            ))}
          </div>
          
          {hasMore && (
            <div className="text-center">
              <button 
                onClick={loadMore}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <span className="loading loading-spinner loading-md"></span>
              <p className="text-base-content/60 text-lg">Loading passed legislation...</p>
            </div>
          ) : (
            <p className="text-base-content/60 text-lg">No passed legislation found.</p>
          )}
        </div>
      )}
    </div>
  );
};