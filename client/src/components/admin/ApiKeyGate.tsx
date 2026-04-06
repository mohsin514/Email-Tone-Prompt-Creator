import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { setStoredApiKey } from '../../api/client';

interface ApiKeyGateProps {
  onSaved: (key: string) => void;
}

export function ApiKeyGate({ onSaved }: ApiKeyGateProps) {
  const [value, setValue] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setStoredApiKey(trimmed);
    onSaved(trimmed);
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <KeyRound className="gate-icon" aria-hidden />
        <h1>Admin access</h1>
        <p className="gate-hint">
          Enter the same API key as the server&apos;s <code>API_KEY</code> (or set{' '}
          <code>VITE_API_KEY</code> in <code>client/.env</code>).
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            autoComplete="off"
            placeholder="API key"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="gate-input"
          />
          <button type="submit" className="btn btn-primary" disabled={!value.trim()}>
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
