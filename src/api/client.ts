import { watchJob } from './jobSocket';
import type {
  AdminUser,
  AuthUser,
  CompareJobResponse,
  ComparisonViewModel,
  ErrorResponse,
  HealthResponse,
  JobListItem,
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

async function request<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}

export async function login(username: string, password: string): Promise<AuthUser> {
  return request<AuthUser>(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<void> {
  await request(`${API_BASE}/auth/logout`, { method: 'POST' });
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>(`${API_BASE}/auth/me`);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<AuthUser> {
  return request<AuthUser>(`${API_BASE}/auth/password`, {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

export async function listJobs(): Promise<JobListItem[]> {
  return request<JobListItem[]>(`${API_BASE}/jobs`);
}

export async function getJob(jobId: string): Promise<JobListItem> {
  return request<JobListItem>(`${API_BASE}/jobs/${jobId}`);
}

export async function getJobResult(jobId: string): Promise<ResultResponse> {
  return request<ResultResponse>(`${API_BASE}/jobs/${jobId}/result`);
}

export async function deleteJob(jobId: string): Promise<void> {
  await request(`${API_BASE}/jobs/${jobId}`, { method: 'DELETE' });
}

export async function downloadJobFile(
  jobId: string,
  side: 1 | 2,
  fallbackName: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/files/${side}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  const blob = await response.blob();
  const header = response.headers.get('content-disposition') ?? '';
  const match = header.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  return request<AdminUser[]>(`${API_BASE}/admin/users`);
}

export async function createAdminUser(body: {
  username: string;
  password: string;
  role: 'admin' | 'user';
}): Promise<AdminUser> {
  return request<AdminUser>(`${API_BASE}/admin/users`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function patchAdminUser(
  userId: string,
  body: { is_active?: boolean; password?: string },
): Promise<AdminUser> {
  return request<AdminUser>(`${API_BASE}/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
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
    credentials: 'include',
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
  return request<ResultResponse>(`${API_BASE}/result`, {
    method: 'POST',
    body: JSON.stringify({ ollama }),
    signal,
  });
}

export interface RunCompareJobOptions {
  onQueued?: (job: CompareJobResponse) => void;
  onProgress?: (progress: JobProgressState) => void;
  onWsOpen?: () => void;
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
    message: 'Процесс в очереди',
    kafkaTopic: job.kafka_topic,
    file1: job.file1,
    file2: job.file2,
  };
  options.onProgress?.(initialProgress);

  const { comparison, wsRoundTripMs } = await watchJob(
    job.job_id,
    job.websocket_url,
    {
      onOpen: options.onWsOpen,
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
    wsRoundTripMs,
  };
}
