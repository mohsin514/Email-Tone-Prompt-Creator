import { useState } from 'react';
import { ChevronLeft, ChevronRight, Mail, Sparkles } from 'lucide-react';
import type { AxiosInstance } from 'axios';
import type { AdminUserRow, Pagination } from '../../types/admin';
import { fetchUserDetail, postFetchEmails, postRegenerate } from '../../api/adminApi';
import { UserDetailModal } from './UserDetailModal';
import type { UserDetailResponse } from '../../types/admin';

interface Props {
  client: AxiosInstance;
  users: AdminUserRow[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onActionComplete: () => void;
}

export function UsersTable({ client, users, pagination, onPageChange, onActionComplete }: Props) {
  const [detail, setDetail] = useState<UserDetailResponse | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [contextByUser, setContextByUser] = useState<Record<string, string>>({});

  async function openDetail(userId: string) {
    setLoadingId(userId);
    try {
      const d = await fetchUserDetail(client, userId);
      setDetail(d);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to load user');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRegenerate(userId: string) {
    setLoadingId(userId);
    setMessage(null);
    try {
      const ctx = contextByUser[userId]?.trim();
      await postRegenerate(client, userId, ctx || undefined);
      setMessage('Tone analysis queued.');
      onActionComplete();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Regenerate failed');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleFetch(userId: string) {
    setLoadingId(userId);
    setMessage(null);
    try {
      await postFetchEmails(client, userId);
      setMessage('Email fetch queued.');
      onActionComplete();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Fetch failed');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>Users</h2>
          {message && <span className="flash">{message}</span>}
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Provider</th>
                <th>Emails</th>
                <th>Prompts</th>
                <th>Quality</th>
                <th>Context (regen)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <button type="button" className="linkish" onClick={() => openDetail(u.id)}>
                      {u.email}
                    </button>
                  </td>
                  <td>{u.provider}</td>
                  <td>{u._count.emails}</td>
                  <td>{u._count.tonePrompts}</td>
                  <td>
                    {u.latestQualityScore != null ? u.latestQualityScore.toFixed(1) : '—'}
                  </td>
                  <td>
                    <input
                      className="ctx-input"
                      placeholder="optional"
                      value={contextByUser[u.id] || ''}
                      onChange={(e) =>
                        setContextByUser((prev) => ({ ...prev, [u.id]: e.target.value }))
                      }
                      aria-label={`Optional context for ${u.email}`}
                    />
                  </td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={loadingId === u.id}
                      onClick={() => handleFetch(u.id)}
                      title="Queue email fetch"
                    >
                      <Mail size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={loadingId === u.id}
                      onClick={() => handleRegenerate(u.id)}
                      title="Regenerate tone prompts"
                    >
                      <Sparkles size={16} aria-hidden />
                    </button>
                  </td>
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
            Page {pagination.page} / {Math.max(1, pagination.totalPages)} ({pagination.total} users)
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

      {detail && <UserDetailModal detail={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
