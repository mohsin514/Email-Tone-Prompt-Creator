import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { createApiClient, getStoredApiKey } from '../api/client';
import { fetchJobs, fetchStats, fetchUsers } from '../api/adminApi';
import { useSocketIO, useJobUpdates } from '../hooks/useRealTime';
import type { AdminStats, PaginatedJobs, PaginatedUsers } from '../types/admin';
import { ApiKeyGate } from '../components/admin/ApiKeyGate';
import { StatsStrip } from '../components/admin/StatsStrip';
import { QueuePanel } from '../components/admin/QueuePanel';
import { RecentJobsList } from '../components/admin/RecentJobs';
import { UsersTable } from '../components/admin/UsersTable';
import { AllJobsTable } from '../components/admin/AllJobsTable';
import '../styles/admin-dashboard.css';

export function AdminDashboard() {
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersPage, setUsersPage] = useState(1);
  const [usersData, setUsersData] = useState<PaginatedUsers | null>(null);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsData, setJobsData] = useState<PaginatedJobs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const client = useMemo(() => createApiClient(apiKey), [apiKey]);
  const { isConnected } = useSocketIO();
  const { latestUpdate } = useJobUpdates(null); // Admin sees all jobs

  const loadAll = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const [s, u, j] = await Promise.all([
        fetchStats(client),
        fetchUsers(client, usersPage),
        fetchJobs(client, jobsPage),
      ]);
      setStats(s);
      setUsersData(u);
      setJobsData(j);
      setUpdatedAt(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [apiKey, client, usersPage, jobsPage]);

  // Handle real-time job updates - update stats when new job event comes in
  useEffect(() => {
    if (latestUpdate && stats) {
      // Increment the job count for the new status
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          jobs: {
            ...prev.jobs,
            [latestUpdate.status]: (prev.jobs[latestUpdate.status as keyof typeof prev.jobs] || 0) + 1,
          },
        };
      });
    }
  }, [latestUpdate, stats]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleUserPage = (page: number) => {
    setUsersPage(page);
  };

  const handleJobsPage = (page: number) => {
    setJobsPage(page);
  };

  if (!apiKey) {
    return <ApiKeyGate onSaved={(k) => setApiKey(k)} />;
  }

  return (
    <div className="admin-app">
      <header className="admin-header">
        <div>
          <h1>Email tone admin</h1>
          <p className="muted sub">Monitor queues, users, and processing jobs.</p>
        </div>
        <div className="header-actions">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1 px-3 py-1 rounded-md bg-green-500/10 text-green-400 text-sm">
                <Wifi size={14} />
                <span>Real-time: ON</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-3 py-1 rounded-md bg-gray-500/10 text-gray-400 text-sm">
                <WifiOff size={14} />
                <span>Real-time: OFF</span>
              </div>
            )}
          </div>
          {updatedAt && (
            <span className="muted small">
              Updated {updatedAt.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadAll()}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} aria-hidden />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}

      {stats && (
        <>
          <StatsStrip stats={stats} />
          <QueuePanel stats={stats} />
          <section className="panel">
            <h2>Recent activity</h2>
            <RecentJobsList jobs={stats.recentJobs} />
          </section>
        </>
      )}

      {usersData && (
        <UsersTable
          client={client}
          users={usersData.data}
          pagination={usersData.pagination}
          onPageChange={handleUserPage}
          onActionComplete={loadAll}
        />
      )}

      {jobsData && <AllJobsTable jobs={jobsData} onPageChange={handleJobsPage} />}
    </div>
  );
}
