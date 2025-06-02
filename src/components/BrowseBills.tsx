import { useState, useEffect } from 'react';
import { CongressApiService } from '../services/congressApi';
import { PassedLegislation } from './PassedLegislation';
import type { Bill } from '../types';
import { formatDate } from '../utils/dateUtils';

interface BrowseBillsProps {
  onBillSelect: (bill: Bill) => void;
}

type BillType = 'all' | 'hr' | 's';
type ViewMode = 'recent' | 'passed';

export const BrowseBills = ({ onBillSelect }: BrowseBillsProps) => {
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [billType, setBillType] = useState<BillType>('all');
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('recent');
  
  const congressApi = new CongressApiService();
  const billsPerPage = 20;

  useEffect(() => {
    loadBills();
  }, []); // Load bills once on mount

  const loadBills = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load recent bills without filtering - we'll filter client-side
      const fetchedBills = await congressApi.getRecentBills(100); // Get more bills for filtering
      setAllBills(fetchedBills);
    } catch (err) {
      setError('Failed to load bills. Please try again.');
      console.error('Error loading bills:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter bills based on selected type
  const getFilteredBills = () => {
    if (billType === 'all') {
      return allBills;
    }
    
    return allBills.filter(bill => {
      const type = bill.type.toLowerCase();
      if (billType === 'hr') {
        return type === 'hr' || type === 'hjres' || type === 'hres' || type === 'hconres';
      } else if (billType === 's') {
        return type === 's' || type === 'sjres' || type === 'sres' || type === 'sconres';
      }
      return true;
    });
  };

  // Get bills for current page
  const getPaginatedBills = () => {
    const filteredBills = getFilteredBills();
    const startIndex = (currentPage - 1) * billsPerPage;
    const endIndex = startIndex + billsPerPage;
    return filteredBills.slice(startIndex, endIndex);
  };

  // Update pagination when filter changes
  useEffect(() => {
    const filteredBills = getFilteredBills();
    const newTotalPages = Math.ceil(filteredBills.length / billsPerPage);
    setTotalPages(newTotalPages);
    
    // Reset to page 1 if current page is beyond new total
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [billType, allBills]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTypeFilter = (type: BillType) => {
    setBillType(type);
    setCurrentPage(1); // Reset to first page when filtering
  };


  const getPaginationPages = () => {
    const pages = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <div className="max-w-6xl mx-auto p-5">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Browse Bills</h1>
        <p className="text-base-content/70 text-lg">
          Explore congressional bills with filtering and pagination
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setViewMode('recent')}
          className={`btn ${
            viewMode === 'recent'
              ? 'btn-primary'
              : 'btn-neutral'
          }`}
        >
          Recent Bills
        </button>
        <button
          onClick={() => setViewMode('passed')}
          className={`btn ${
            viewMode === 'passed'
              ? 'btn-primary'
              : 'btn-neutral'
          }`}
        >
          Passed Legislation
        </button>
      </div>

      {/* Show PassedLegislation component if passed mode is selected */}
      {viewMode === 'passed' ? (
        <PassedLegislation onBillSelect={onBillSelect} />
      ) : (
        <>
          {/* Filter Controls for Recent Bills */}
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              onClick={() => handleTypeFilter('all')}
              className={`btn ${
                billType === 'all'
                  ? 'btn-primary'
                  : 'btn-neutral'
              }`}
            >
              All Bills
            </button>
            <button
              onClick={() => handleTypeFilter('hr')}
              className={`btn ${
                billType === 'hr'
                  ? 'btn-primary'
                  : 'btn-neutral'
              }`}
            >
              House Bills (HR)
            </button>
            <button
              onClick={() => handleTypeFilter('s')}
              className={`btn ${
                billType === 's'
                  ? 'btn-primary'
                  : 'btn-neutral'
              }`}
            >
              Senate Bills (S)
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-base-content/70">Loading bills...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="alert alert-error mb-6">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Bills List */}
          {!loading && !error && (
            <>
              <div className="space-y-4">
                {getPaginatedBills().map((bill) => (
                  <div
                    key={`${bill.congress}-${bill.type}-${bill.number}`}
                    className="card card-border cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => onBillSelect(bill)}
                  >
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`badge ${
                          bill.type === 'HR' 
                            ? 'badge-success' 
                            : 'badge-info'
                        }`}>
                          {bill.type} {bill.number}
                        </span>
                        <span className="text-base-content/60 text-sm">
                          {bill.congress}th Congress
                        </span>
                        {bill.introducedDate && (
                          <span className="text-base-content/40 text-sm">
                            Introduced {formatDate(bill.introducedDate)}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="card-title mb-2">
                        {bill.title}
                      </h3>
                    
                      {bill.summary && (
                        <p className="text-base-content/70 text-sm mb-3 line-clamp-2">
                          {bill.summary.text}
                        </p>
                      )}
                      
                      {bill.sponsors && bill.sponsors.length > 0 && (
                        <div className="flex items-center text-sm text-base-content/60">
                          <span className="mr-2">Sponsor:</span>
                          <span>
                            {bill.sponsors[0].firstName} {bill.sponsors[0].lastName} 
                            ({bill.sponsors[0].party}-{bill.sponsors[0].state})
                          </span>
                        </div>
                      )}
                      
                      {bill.latestAction && (
                        <div className="mt-2 text-sm text-base-content/60">
                          <span className="font-medium">Latest Action:</span> {bill.latestAction.text}
                          {bill.latestAction.actionDate && (
                            <span className="ml-2">({formatDate(bill.latestAction.actionDate)})</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4">
                      <svg className="w-5 h-5 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <nav className="flex items-center space-x-2">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn btn-neutral btn-disabled:opacity-50"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                {getPaginationPages().map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`btn ${
                      page === currentPage
                        ? 'btn-primary'
                        : 'btn-neutral'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="btn btn-neutral btn-disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          )}

              {/* Results Info */}
              <div className="mt-4 text-center text-base-content/60 text-sm">
                Page {currentPage} of {totalPages} • {getPaginatedBills().length} bills shown • {getFilteredBills().length} total filtered
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};