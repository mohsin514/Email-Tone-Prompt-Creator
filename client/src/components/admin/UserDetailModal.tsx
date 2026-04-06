import { X } from 'lucide-react';
import type { UserDetailResponse } from '../../types/admin';

interface Props {
  detail: UserDetailResponse;
  onClose: () => void;
}

export function UserDetailModal({ detail, onClose }: Props) {
  const { user, activePrompts, recentJobs, emailsByContext } = detail;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="user-detail-title">
      <div className="modal">
        <header className="modal-header">
          <h2 id="user-detail-title">{user.email}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="modal-body">
          <p className="muted">
            Provider: <strong>{user.provider}</strong> · Prompts: {user._count.tonePrompts} · Emails:{' '}
            {user._count.emails}
          </p>

          <h3>Emails by context</h3>
          {emailsByContext.length === 0 ? (
            <p className="muted">No classified emails.</p>
          ) : (
            <ul className="tag-list">
              {emailsByContext.map((e) => (
                <li key={e.context}>
                  <span className="tag">{e.context}</span> {e.count}
                </li>
              ))}
            </ul>
          )}

          <h3>Active tone prompts</h3>
          {activePrompts.length === 0 ? (
            <p className="muted">No active prompts.</p>
          ) : (
            <div className="prompt-list">
              {activePrompts.map((p) => (
                <article key={p.id} className="prompt-card">
                  <div className="prompt-meta">
                    <span className="tag">{p.context}</span>
                    <span className="muted">v{p.version}</span>
                    <span className="score">Quality {p.qualityScore.toFixed(1)}</span>
                  </div>
                  <p className="prompt-preview">{p.toneText.slice(0, 280)}{p.toneText.length > 280 ? '…' : ''}</p>
                </article>
              ))}
            </div>
          )}

          <h3>Recent jobs</h3>
          <div className="table-wrap">
            <table className="data-table compact">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((j) => (
                  <tr key={j.id}>
                    <td className="mono">{new Date(j.createdAt).toLocaleString()}</td>
                    <td>{j.type}</td>
                    <td>
                      <span className={`badge badge-${j.status}`}>{j.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
