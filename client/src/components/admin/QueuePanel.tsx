import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEffect, useState } from 'react';
import { useJobUpdates } from '../../hooks/useRealTime';
import type { AdminStats, QueueJobCounts } from '../../types/admin';

interface Props {
  stats: AdminStats;
}

function countsToRows(label: string, c: QueueJobCounts) {
  return {
    name: label,
    waiting: c.waiting ?? 0,
    active: c.active ?? 0,
    failed: c.failed ?? 0,
    delayed: c.delayed ?? 0,
  };
}

export function QueuePanel({ stats }: Props) {
  const { queue, jobs } = stats;
  const { latestUpdate } = useJobUpdates(null);
  const [jobChartData, setJobChartData] = useState(
    Object.entries(jobs).map(([status, count]) => ({
      status,
      count,
    }))
  );

  const bullRows = [
    countsToRows('Email fetch', queue.emailFetch),
    countsToRows('Tone analysis', queue.toneAnalysis),
  ];

  // Update chart when real-time updates come in
  useEffect(() => {
    if (latestUpdate) {
      setJobChartData((prev) =>
        prev.map((item) => {
          if (item.status === latestUpdate.status) {
            return { ...item, count: item.count + 1 };
          }
          return item;
        })
      );
    }
  }, [latestUpdate]);

  return (
    <div className="panel-grid">
      <section className="panel">
        <h2>BullMQ queues</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Queue</th>
                <th>Waiting</th>
                <th>Active</th>
                <th>Failed</th>
                <th>Delayed</th>
              </tr>
            </thead>
            <tbody>
              {bullRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td className="font-mono">
                    <span className="px-2 py-1 rounded bg-slate-700/50">{row.waiting}</span>
                  </td>
                  <td className="font-mono">
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300">
                      {row.active}
                    </span>
                  </td>
                  <td className="font-mono">
                    <span className="px-2 py-1 rounded bg-red-500/20 text-red-300">
                      {row.failed}
                    </span>
                  </td>
                  <td className="font-mono">
                    <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300">
                      {row.delayed}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Jobs by status</h2>
        <div className="chart-wrap">
          {jobChartData.length === 0 ? (
            <p className="muted">No jobs in database yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={jobChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="status" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}
