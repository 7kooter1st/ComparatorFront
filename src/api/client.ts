import { watchJob } from './jobSocket';
import type {
  CompareJobResponse,
  ComparisonViewModel,
  ErrorResponse,
  HealthResponse,
  JobProgressState,
  OllamaChatResponse,
  ResultResponse,
} from '../types/api';
import { ApiError } from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

async function parseError(response: Response): Promise<ApiError> {
  let message = `Ошибка сервера (${response.status})`;
  let hint: string | undefined;

  try {
    const data = (await response.json()) as ErrorResponse;
    message = data.error ?? message;
    hint = data.hint ?? undefined;
  } catch {
    // ignore JSON parse errors
  }

  return new ApiError(response.status, message, hint);
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch('/health');

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<HealthResponse>;
}

export async function submitCompareJob(
  file1: File,
  file2: File,
  signal?: AbortSignal,
): Promise<CompareJobResponse> {
  const formData = new FormData();
  formData.append('file1', file1);
  formData.append('file2', file2);

  const response = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    body: formData,
    signal,
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<CompareJobResponse>;
}

export async function getComparisonResult(
  ollama: OllamaChatResponse,
  signal?: AbortSignal,
): Promise<ResultResponse> {
  const response = await fetch(`${API_BASE}/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ollama }),
    signal,
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json() as Promise<ResultResponse>;
}

export interface RunCompareJobOptions {
  onQueued?: (job: CompareJobResponse) => void;
  onProgress?: (progress: JobProgressState) => void;
}

export async function runCompareJob(
  file1: File,
  file2: File,
  options: RunCompareJobOptions = {},
  signal?: AbortSignal,
): Promise<ComparisonViewModel> {
  const job = await submitCompareJob(file1, file2, signal);
  options.onQueued?.(job);

  const initialProgress: JobProgressState = {
    jobId: job.job_id,
    status: job.status,
    processedChunks: 0,
    totalChunks: job.total_chunks,
    message: 'Задача поставлена в очередь Kafka',
    kafkaTopic: job.kafka_topic,
    file1: job.file1,
    file2: job.file2,
  };
  options.onProgress?.(initialProgress);

  const comparison = await watchJob(
    job.job_id,
    job.websocket_url,
    {
      onStatus: (status) => {
        options.onProgress?.({
          jobId: job.job_id,
          status: status.status,
          processedChunks: status.processed_chunks,
          totalChunks: status.total_chunks,
          message: status.message,
          kafkaTopic: job.kafka_topic,
          file1: job.file1,
          file2: job.file2,
        });
      },
    },
    signal,
  );

  return {
    comparison,
    jobId: job.job_id,
    totalChunks: job.total_chunks,
    file1: job.file1,
    file2: job.file2,
  };
}
