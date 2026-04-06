import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useJobUpdates } from '../../hooks/useRealTime';
import type { PaginatedJobs } from '../../types/admin';

interface Props {
  jobs: PaginatedJobs;
  onPageChange: (page: number) => void;
}

export function AllJobsTable({ jobs, onPageChange }: Props) {
  const { data, pagination } = jobs;
  const { latestUpdate } = useJobUpdates(null);
  const [highlightedJobId, setHighlightedJobId] = useState<string | null>(null);

  // Highlight when a real-time update comes in
  useEffect(() => {
    if (latestUpdate?.jobId) {
      setHighlightedJobId(latestUpdate.jobId);
      const timer = setTimeout(() => setHighlightedJobId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [latestUpdate?.jobId]);

  return (
    <section className="panel">
      <div className="flex items-center justify-between mb-4">
        <h2>All processing jobs</h2>
        {latestUpdate && (
          <span className="flex items-center gap-1 text-sm text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Live update: {latestUpdate.jobId.slice(0, 8)}...
          </span>
        )}
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>User</th>
              <th>Type</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Context</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {data.map((j) => (
              <tr
                key={j.id}
                className={`${
                  highlightedJobId === j.id
                    ? 'bg-blue-500/20 animate-pulse'
                    : ''
                }`}
              >
                <td className="mono">{new Date(j.createdAt).toLocaleString()}</td>
                <td>{j.user.email}</td>
                <td>{j.type}</td>
                <td>
                  <span className={`badge badge-${j.status}`}>{j.status}</span>
                </td>
                <td>
                  {j.status === 'processing' && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 animate-pulse"
                          style={{
                            width: `${Math.random() * 100}%`,
                          }}
                        ></div>
                      </div>
                      <Zap size={14} className="text-yellow-500" />
                    </div>
                  )}
                  {j.status !== 'processing' && '—'}
                </td>
                <td>{j.context || '—'}</td>
                <td className="error-cell">{j.errorMessage ? j.errorMessage.slice(0, 80) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="pager">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={!pagination.hasPrev}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          <ChevronLeft size={18} /> Prev
        </button>
        <span className="muted">
          Page {pagination.page} / {Math.max(1, pagination.totalPages)}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={!pagination.hasNext}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next <ChevronRight size={18} />
        </button>
      </footer>
    </section>
  );
}
