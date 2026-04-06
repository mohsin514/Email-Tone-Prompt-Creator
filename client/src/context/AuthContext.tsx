import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  provider?: string;
  createdAt?: string;
}

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');

    if (storedAccessToken && storedUser) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  // Automatic token refresh logic
  useEffect(() => {
    if (!accessToken || !refreshToken) return;

    // Check every 1 minute if we need to refresh
    const interval = setInterval(() => {
      try {
        // Decode JWT to check expiry (simple base64 decode of payload)
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const expiry = payload.exp * 1000;
        const now = Date.now();
        const twoMinutes = 2 * 60 * 1000;

        // If expiring in less than 2 minutes, refresh it!
        if (expiry - now < twoMinutes) {
          console.log('Token expiring soon, refreshing...');
          refreshTokens();
        }
      } catch (e) {
        console.error('Failed to parse token for auto-refresh:', e);
      }
    }, 60000); // Check every 1 minute

    return () => clearInterval(interval);
  }, [accessToken, refreshToken]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();

      // Store tokens and user
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();

      // Store tokens and user
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const refreshTokens = async () => {
    if (!refreshToken) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
    }
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isLoading,
        isAuthenticated: !!user && !!accessToken,
        login,
        register,
        logout,
        refreshTokens,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
