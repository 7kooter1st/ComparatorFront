import type { CompareResponse, ErrorResponse, HealthResponse } from './types'
import { ApiError } from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

async function parseError(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as ErrorResponse
    const message = data.error ?? `Ошибка ${response.status}`
    return new ApiError(message, response.status, data.hint)
  } catch {
    return new ApiError(
      `Ошибка ${response.status}: ${response.statusText}`,
      response.status,
    )
  }
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/api/health`)

  if (!response.ok) {
    throw await parseError(response)
  }

  return response.json() as Promise<HealthResponse>
}

export async function compareDocuments(
  file1: File,
  file2: File,
): Promise<CompareResponse> {
  const formData = new FormData()
  formData.append('file1', file1)
  formData.append('file2', file2)

  const response = await fetch(`${API_BASE}/api/compare`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  return response.json() as Promise<CompareResponse>
}
