import { useState, useEffect, useCallback } from 'react';
import { fetchBackendHealth } from '../services/api';
import { HealthData } from '../types';

export type BackendConnectionState = 'checking' | 'connected' | 'offline';

export interface BackendStatus {
  state: BackendConnectionState;
  health: HealthData | null;
  error: string | null;
  latencyMs: number;
  lastChecked: Date | null;
  checkNow: () => Promise<void>;
}

export function useBackendStatus(pollIntervalMs: number = 30000): BackendStatus {
  const [state, setState] = useState<BackendConnectionState>('checking');
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkNow = useCallback(async () => {
    setState((prev) => (prev === 'connected' ? 'connected' : 'checking'));
    const result = await fetchBackendHealth();
    setLastChecked(new Date());
    setLatencyMs(result.latencyMs);

    if (result.ok && result.data) {
      setState('connected');
      setHealth(result.data);
      setError(null);
    } else {
      setState('offline');
      setHealth(null);
      setError(result.error || 'Connection failed');
    }
  }, []);

  useEffect(() => {
    checkNow();
    if (pollIntervalMs > 0) {
      const timer = setInterval(checkNow, pollIntervalMs);
      return () => clearInterval(timer);
    }
  }, [checkNow, pollIntervalMs]);

  return {
    state,
    health,
    error,
    latencyMs,
    lastChecked,
    checkNow,
  };
}
