import axios, { type AxiosInstance } from 'axios';

const STORAGE_KEY = 'etpc_admin_api_key';

export function getStoredApiKey(): string {
  return (
    import.meta.env.VITE_API_KEY ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) || '' : '')
  );
}

export function setStoredApiKey(key: string): void {
  sessionStorage.setItem(STORAGE_KEY, key);
}

export function createApiClient(apiKey?: string, accessToken?: string): AxiosInstance {
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return axios.create({
    baseURL,
    headers,
    timeout: 60_000,
  });
}

// Create a default client with JWT support
export function createAuthenticatedClient(): AxiosInstance {
  const accessToken = localStorage.getItem('accessToken');
  return createApiClient(undefined, accessToken || undefined);
}

