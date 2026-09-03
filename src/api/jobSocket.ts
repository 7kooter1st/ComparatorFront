import type {
  ComparisonResult,
  JobStatusData,
  ResultResponse,
  WebSocketErrorData,
  WebSocketEvent,
} from '../types/api';
import { JobError } from '../types/api';

export interface JobSocketCallbacks {
  onStatus?: (status: JobStatusData) => void;
  onOpen?: () => void;
  onDisconnect?: () => void;
}

function getWsBase(): string {
  const envBase = import.meta.env.VITE_WS_BASE as string | undefined;
  if (envBase) return envBase.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  return 'ws://localhost:5173';
}

export function resolveJobWebSocketUrl(jobId: string, websocketUrl?: string): string {
  if (websocketUrl) {
    try {
      const parsed = new URL(websocketUrl);
      const base = new URL(getWsBase());
      parsed.protocol = base.protocol;
      parsed.host = base.host;
      return parsed.toString();
    } catch {
      // fall through to job_id path
    }
  }

  return `${getWsBase()}/ws/jobs/${jobId}`;
}

export function nextReconnectDelayMs(attempt: number, baseMs = 1000, maxMs = 15000): number {
  const exp = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt));
  return exp;
}

function isResultData(data: unknown): data is ResultResponse {
  return typeof data === 'object' && data !== null && 'comparison' in data;
}

function isErrorData(data: unknown): data is WebSocketErrorData {
  return typeof data === 'object' && data !== null && 'message' in data && !('comparison' in data);
}

function isStatusData(data: unknown): data is JobStatusData {
  return typeof data === 'object' && data !== null && 'processed_chunks' in data;
}

function connectOnce(
  url: string,
  callbacks: JobSocketCallbacks,
  signal: AbortSignal | undefined,
  wsStartRef: { current: number | null },
): Promise<{ comparison: ComparisonResult; wsRoundTripMs: number } | 'closed'> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let settled = false;

    const finish = (value: { comparison: ComparisonResult; wsRoundTripMs: number } | 'closed') => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const cleanup = () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };

    const onAbort = () => {
      cleanup();
      if (!settled) {
        settled = true;
        reject(new DOMException('Aborted', 'AbortError'));
      }
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    ws.onopen = () => {
      wsStartRef.current = performance.now();
      callbacks.onOpen?.();
    };

    ws.onmessage = (event) => {
      let message: WebSocketEvent;
      try {
        message = JSON.parse(event.data as string) as WebSocketEvent;
      } catch {
        return;
      }

      if (message.type === 'status' && isStatusData(message.data)) {
        callbacks.onStatus?.(message.data);
        return;
      }

      if (message.type === 'result' && isResultData(message.data)) {
        const resultData = message.data;
        const wsRoundTripMs =
          wsStartRef.current != null ? Math.round(performance.now() - wsStartRef.current) : 0;
        cleanup();
        signal?.removeEventListener('abort', onAbort);
        finish({ comparison: resultData.comparison, wsRoundTripMs });
        return;
      }

      if (message.type === 'error' && isErrorData(message.data)) {
        callbacks.onStatus?.({
          status: 'failed',
          processed_chunks: 0,
          total_chunks: 0,
          message: message.data.message,
        });
      }
    };

    ws.onerror = () => {
      callbacks.onDisconnect?.();
    };

    ws.onclose = () => {
      signal?.removeEventListener('abort', onAbort);
      if (!settled) {
        callbacks.onDisconnect?.();
        finish('closed');
      }
    };
  });
}

export function watchJob(
  jobId: string,
  websocketUrl: string | undefined,
  callbacks: JobSocketCallbacks,
  signal?: AbortSignal,
): Promise<{ comparison: ComparisonResult; wsRoundTripMs: number }> {
  const url = resolveJobWebSocketUrl(jobId, websocketUrl);
  const wsStartRef = { current: null as number | null };

  return (async () => {
    let attempt = 0;
    while (!signal?.aborted) {
      try {
        const result = await connectOnce(url, callbacks, signal, wsStartRef);
        if (result !== 'closed') {
          return result;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err;
        }
        if (err instanceof JobError) {
          throw err;
        }
      }
      attempt += 1;
      const delay = nextReconnectDelayMs(attempt);
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }
    throw new DOMException('Aborted', 'AbortError');
  })();
}
