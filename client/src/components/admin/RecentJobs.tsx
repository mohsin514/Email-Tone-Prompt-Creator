import { useEffect, useState } from 'react';
import { useJobUpdates } from '../../hooks/useRealTime';
import type { RecentJob } from '../../types/admin';

interface Props {
  jobs: RecentJob[];
}

export function RecentJobsList({ jobs: initialJobs }: Props) {
  const { latestUpdate } = useJobUpdates(null);
  const [jobs, setJobs] = useState(initialJobs);
  const [highlightedJobId, setHighlightedJobId] = useState<string | null>(null);

  // Add real-time updates to the list
  useEffect(() => {
    if (latestUpdate) {
      setHighlightedJobId(latestUpdate.jobId);
      const timer = setTimeout(() => setHighlightedJobId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [latestUpdate?.jobId]);

  // Update jobs list when initial jobs change
  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  if (jobs.length === 0) {
    return <p className="muted">No recent jobs.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>When</th>
            <th>User</th>
            <th>Type</th>
            <th>Status</th>
            <th>Signal</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr
              key={j.id}
              className={`${
                highlightedJobId === j.id ? 'bg-blue-500/20 animate-pulse' : ''
              }`}
            >
              <td className="mono">{new Date(j.createdAt).toLocaleString()}</td>
              <td>{j.user.email}</td>
              <td>{j.type}</td>
              <td>
                <span className={`badge badge-${j.status}`}>{j.status}</span>
              </td>
              <td>
                {highlightedJobId === j.id && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-400">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    Live
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
