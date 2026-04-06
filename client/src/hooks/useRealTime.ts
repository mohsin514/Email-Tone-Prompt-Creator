import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

let socket: Socket | null = null;

export function useSocketIO() {
  const { accessToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    if (!socket) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const socketUrl = apiUrl.replace(/\/api\/?$/, ''); // Strip /api to connect to root namespace
      
      socket = io(socketUrl, {
        auth: {
          token: accessToken,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
      });

      socket.on('connect_error', (error: Error) => {
        console.error('Connection error:', error);
      });
    }

    return () => {
      // Don't disconnect, keep connection alive
    };
  }, [accessToken]);

  return { socket, isConnected };
}

export interface JobUpdate {
  jobId: string;
  userId: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  results?: {
    emailsProcessed?: number;
    contexts?: string[];
    summary?: string;
  };
  error?: string;
  timestamp?: string;
}

export function useJobUpdates(userId: string | null) {
  const { socket } = useSocketIO();
  const [jobUpdates, setJobUpdates] = useState<Map<string, JobUpdate>>(new Map());
  const [latestUpdate, setLatestUpdate] = useState<JobUpdate | null>(null);

  useEffect(() => {
    if (!socket || !userId) return;

    // Subscribe to job updates for this user
    socket.emit('subscribe-jobs', userId);

    const handleJobUpdate = (update: JobUpdate) => {
      setJobUpdates((prev) => {
        const updated = new Map(prev);
        updated.set(update.jobId, update);
        return updated;
      });
      setLatestUpdate(update);
    };

    socket.on('job-update', handleJobUpdate);

    return () => {
      socket?.off('job-update', handleJobUpdate);
      socket?.emit('unsubscribe-jobs', userId);
    };
  }, [socket, userId]);

  return { jobUpdates, latestUpdate };
}

export interface Stats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  processingJobs: number;
  totalEmails: number;
  averageScore?: number;
}

export function useStats() {
  const { socket } = useSocketIO();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('subscribe-stats');

    const handleStatsUpdate = (newStats: Stats) => {
      setStats(newStats);
    };

    socket.on('stats-update', handleStatsUpdate);

    return () => {
      socket?.off('stats-update', handleStatsUpdate);
      socket?.emit('unsubscribe-stats');
    };
  }, [socket]);

  return stats;
}
