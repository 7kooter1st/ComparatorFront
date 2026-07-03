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

function isResultData(data: unknown): data is ResultResponse {
  return typeof data === 'object' && data !== null && 'comparison' in data;
}

function isErrorData(data: unknown): data is WebSocketErrorData {
  return typeof data === 'object' && data !== null && 'message' in data && !('comparison' in data);
}

function isStatusData(data: unknown): data is JobStatusData {
  return typeof data === 'object' && data !== null && 'processed_chunks' in data;
}

export function watchJob(
  jobId: string,
  websocketUrl: string | undefined,
  callbacks: JobSocketCallbacks,
  signal?: AbortSignal,
): Promise<ComparisonResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const url = resolveJobWebSocketUrl(jobId, websocketUrl);
    const ws = new WebSocket(url);

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const cleanup = () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };

    const onAbort = () => {
      cleanup();
      finish(() => reject(new DOMException('Aborted', 'AbortError')));
    };

    signal?.addEventListener('abort', onAbort, { once: true });

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
        cleanup();
        signal?.removeEventListener('abort', onAbort);
        finish(() => resolve(resultData.comparison));
        return;
      }

      if (message.type === 'error' && isErrorData(message.data)) {
        const errorData = message.data;
        cleanup();
        signal?.removeEventListener('abort', onAbort);
        finish(() => reject(new JobError(errorData.message, errorData.details)));
      }
    };

    ws.onerror = () => {
      cleanup();
      signal?.removeEventListener('abort', onAbort);
      finish(() => reject(new Error('Ошибка WebSocket соединения')));
    };

    ws.onclose = (event) => {
      signal?.removeEventListener('abort', onAbort);
      if (!settled) {
        finish(() =>
          reject(
            new Error(
              event.reason || `WebSocket закрыт до получения результата (код ${event.code})`,
            ),
          ),
        );
      }
    };
  });
}
