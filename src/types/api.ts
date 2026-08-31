export interface FileChunkStats {
  filename: string;
  format: 'pdf' | 'docx';
  chunks: number;
}

export interface CompareJobResponse {
  job_id: string;
  status: string;
  total_chunks: number;
  kafka_topic: string;
  websocket_url?: string;
  file1: FileChunkStats;
  file2: FileChunkStats;
}

export interface JobStatusData {
  job_id?: string;
  document_id?: string;
  status: string;
  processed_chunks: number;
  total_chunks: number;
  message: string;
  updated_at?: string;
}

/** Индексы символов в строке [start, end) — end не включается */
export type CharSpan = [number, number];

export type DifferenceCategory =
  | 'substantive'
  | 'technical'
  | 'alignment_error'
  | 'ocr_uncertain';

export type ComparisonVerdict = 'identical' | 'content_equal' | 'different';

export interface LineDifference {
  candidate_id?: string | null;
  line_number?: number | null;
  file1_line?: string | null;
  file2_line?: string | null;
  file1_span?: CharSpan | null;
  file2_span?: CharSpan | null;
  category?: DifferenceCategory;
  technical_type?: string | null;
  reason?: string | null;
  confidence?: number | null;
  protection_tags?: string[];
  file1_page?: number | null;
  file2_page?: number | null;
  file1_block?: number | null;
  file2_block?: number | null;
  file1_source_type?: string | null;
  file2_source_type?: string | null;
}

export interface ComparisonResult {
  identical: boolean;
  verdict?: ComparisonVerdict;
  differences: LineDifference[];
}

export interface ResultResponse {
  comparison: ComparisonResult;
}

export interface OllamaChatResponse {
  model: string;
  message?: { role?: string; content?: string };
  [key: string]: unknown;
}

export interface ResultRequest {
  ollama: OllamaChatResponse;
}

export interface WebSocketEvent {
  type: 'status' | 'result' | 'error';
  job_id: string;
  data: unknown;
}

export interface WebSocketErrorData {
  message: string;
  details?: Record<string, unknown>;
}

export interface HealthResponse {
  status: string;
  kafka_producer?: boolean;
  processing_service_reachable?: boolean;
  processing?: Record<string, unknown> | string;
}

export interface ErrorResponse {
  error: string;
  hint?: string | null;
}

export interface ComparisonViewModel {
  comparison: ComparisonResult;
  jobId: string;
  totalChunks: number;
  file1: FileChunkStats;
  file2: FileChunkStats;
  /** Время от открытия WebSocket до сообщения result */
  wsRoundTripMs?: number;
}

export interface JobProgressState {
  jobId: string;
  status: string;
  processedChunks: number;
  totalChunks: number;
  message: string;
  kafkaTopic?: string;
  file1?: FileChunkStats;
  file2?: FileChunkStats;
}

export type LineDiffKind = 'only_in_file1' | 'only_in_file2' | 'changed';

export class ApiError extends Error {
  status: number;
  hint?: string;

  constructor(status: number, message: string, hint?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.hint = hint;
  }
}

export class JobError extends Error {
  details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'JobError';
    this.details = details;
  }
}
