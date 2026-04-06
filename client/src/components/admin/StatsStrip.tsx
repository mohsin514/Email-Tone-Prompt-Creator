import type { AdminStats } from '../../types/admin';

interface Props {
  stats: AdminStats;
}

export function StatsStrip({ stats }: Props) {
  const { counts, jobs } = stats;
  const jobTotal = Object.values(jobs).reduce((a, b) => a + b, 0);

  return (
    <div className="stats-strip">
      <div className="stat-card">
        <span className="stat-label">Users</span>
        <span className="stat-value">{counts.users}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Emails stored</span>
        <span className="stat-value">{counts.emails}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Active prompts</span>
        <span className="stat-value">{counts.activePrompts}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Processing jobs (DB)</span>
        <span className="stat-value">{jobTotal}</span>
      </div>
    </div>
  );
}
