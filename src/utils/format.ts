import type { FileFormat } from '../api/types'

export const ACCEPTED_DOCUMENTS =
  '.docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf'

export function formatLabel(format: FileFormat): string {
  return format.toUpperCase()
}

export function fileDescription(filename: string, format: FileFormat): string {
  return `${filename} (${formatLabel(format)})`
}
