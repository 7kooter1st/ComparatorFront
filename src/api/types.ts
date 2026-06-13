export interface HealthResponse {
  status: string
  service: string
}

export type FileFormat = 'docx' | 'pdf'

export interface FileInfo {
  filename: string
  format: FileFormat
  text: string
}

export interface DiffSummary {
  total_differences: number
  only_in_file1: number
  only_in_file2: number
  changed: number
}

export type DifferenceType = 'only_in_file1' | 'only_in_file2' | 'changed'

export interface DifferenceEntry {
  type: DifferenceType
  file1: string | null
  file2: string | null
}

export interface CompareResponse {
  file1: FileInfo
  file2: FileInfo
  content_identical: boolean
  similarity_percent: number
  normalized_file1_length: number
  normalized_file2_length: number
  diff_summary: DiffSummary
  differences: DifferenceEntry[]
}

export interface ErrorResponse {
  error: string
  hint?: string
}

export class ApiError extends Error {
  status: number
  hint?: string

  constructor(message: string, status: number, hint?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.hint = hint
  }
}
