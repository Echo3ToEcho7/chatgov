import type { Bill } from '../types';
import { formatDate } from '../utils/dateUtils';

interface BillDetailsProps {
  bill: Bill;
  onBack: () => void;
}

export const BillDetails = ({ bill, onBack }: BillDetailsProps) => {
  return (
    <div className="card card-lg">
      <div className="card-body">
        <button 
          onClick={onBack} 
          className="btn btn-neutral mb-6 self-start"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Search
        </button>
        
        <div className="mb-8">
          <h1 className="card-title text-3xl mb-4">
            {bill.title}
          </h1>
          <div className="flex flex-wrap gap-3">
            <span className="badge badge-primary">
              {bill.type} {bill.number}
            </span>
            <span className="badge badge-neutral">
              Congress {bill.congress}
            </span>
          </div>
        </div>

        <div className="space-y-8">
          <div className="card bg-neutral text-neutral-content">
            <div className="card-body">
              <h3 className="card-title">
                Introduction
              </h3>
              <p>
                <strong>Introduced:</strong> {formatDate(bill.introducedDate)}
              </p>
            </div>
          </div>

          {bill.sponsors && bill.sponsors.length > 0 && (
            <div className="card bg-neutral text-neutral-content">
              <div className="card-body">
                <h3 className="card-title">Sponsors</h3>
                <div className="space-y-2">
                  {bill.sponsors.map((sponsor, index) => (
                    <div key={index} className="card card-compact bg-base-100 text-base-content">
                      <div className="card-body">
                        <span className="font-medium">
                          {sponsor.firstName} {sponsor.lastName}
                        </span>
                        <span className="badge badge-accent">
                          {sponsor.party}-{sponsor.state}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {bill.latestAction && (
            <div className="card bg-neutral text-neutral-content">
              <div className="card-body">
                <h3 className="card-title">Latest Action</h3>
                <div>
                  <p className="mb-2">
                    <strong>Date:</strong> {formatDate(bill.latestAction.actionDate)}
                  </p>
                  <p>
                    <strong>Action:</strong> {bill.latestAction.text}
                  </p>
                </div>
              </div>
            </div>
          )}

          {bill.summary && (
            <div className="card bg-neutral text-neutral-content">
              <div className="card-body">
                <h3 className="card-title">Summary</h3>
                <p className="leading-relaxed">{bill.summary.text}</p>
              </div>
            </div>
          )}

          <div className="card bg-neutral text-neutral-content">
            <div className="card-body">
              <h3 className="card-title">Official Link</h3>
              <a 
                href={bill.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="link link-primary inline-flex items-center gap-2"
              >
                View on Congress.gov
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};