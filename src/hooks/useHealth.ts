import { useCallback, useEffect, useState } from 'react';
import { checkHealth } from '../api/client';
import type { HealthResponse } from '../types/api';

export function useHealth(pollIntervalMs = 30_000) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await checkHealth();
      setHealth(data);
    } catch (err) {
      setHealth(null);
      setError(err instanceof Error ? err.message : 'Сервис недоступен');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), pollIntervalMs);
    return () => window.clearInterval(id);
  }, [refresh, pollIntervalMs]);

  return { health, loading, error, refresh };
}
