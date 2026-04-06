import { useState } from 'react';
import { Mail, Loader, CheckCircle, AlertCircle } from 'lucide-react';

interface LinkGmailButtonProps {
  userId: string;
  isLinked: boolean;
  onLinked: () => void;
  accessToken: string;
}

export function LinkGmailButton({ userId, isLinked, onLinked, accessToken }: LinkGmailButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLinkGmail = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Call backend to get Gmail OAuth URL
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/auth/gmail`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get Gmail authorization URL');
      }

      const data = await response.json();
      const { authUrl } = data;

      // Open Gmail OAuth in popup window
      const width = 500;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'gmail-auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for completion
      if (popup) {
        const pollInterval = setInterval(async () => {
          try {
            // Check via backend API to prevent Cross-Origin-Opener-Policy blocking popup.closed
            const statusResponse = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            
            if (statusResponse.ok) {
              const userData = await statusResponse.json();
              if (userData.gmailLinked) {
                clearInterval(pollInterval);
                try { popup.close(); } catch (e) {} // safely close
                setIsLoading(false);
                onLinked();
                return;
              }
            }

            // Check if popup is still open (may throw COOP error, hence the try/catch)
            if (popup.closed) {
              clearInterval(pollInterval);
              setIsLoading(false);
              onLinked(); // Callback to refresh dashboard
            }
          } catch (e) {
            // Suppressing the COOP popup.closed error. The interval will simply loop 
            // and check the backend again!
          }
        }, 1500);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsLoading(false);
        }, 5 * 60 * 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link Gmail account');
      setIsLoading(false);
    }
  };

  const handleUnlinkGmail = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/auth/gmail/unlink`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to unlink Gmail account');
      }

      onLinked(); // Callback to refresh dashboard
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink Gmail account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Gmail Account</h3>
          <p className="text-gray-600 mb-4">
            {isLinked
              ? 'Your Gmail account is linked. We can now analyze your emails.'
              : 'Link your Gmail account to start analyzing your emails automatically.'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={handleLinkGmail}
              disabled={isLoading || isLinked}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                isLinked
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50'
              }`}
            >
              {isLoading && !isLinked ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Linking...</span>
                </>
              ) : isLinked ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Gmail Linked</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>Link Gmail Account</span>
                </>
              )}
            </button>
            
            {isLinked && (
              <button
                onClick={handleUnlinkGmail}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-3 rounded-lg font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition disabled:opacity-50"
              >
                {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : null}
                <span>Unlink</span>
              </button>
            )}
          </div>
        </div>

        <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${isLinked ? 'bg-green-100' : 'bg-blue-100'}`}>
          {isLinked ? (
            <CheckCircle className="w-8 h-8 text-green-600" />
          ) : (
            <Mail className="w-8 h-8 text-blue-600" />
          )}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">What we'll access:</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Read your emails</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Analyze email tone and sentiment</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Get improvement suggestions</span>
          </li>
        </ul>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          💡 <strong>Tip:</strong> Your Gmail account is only used to fetch emails for analysis. We never send emails on your behalf. You can revoke access anytime in Gmail settings.
        </p>
      </div>
    </div>
  );
}
