import type { CompareMode } from '../api/types'

const MODE_LABELS: Record<CompareMode, string> = {
  fast: 'Быстрый',
  accurate: 'Точный',
}

const ENGINE_LABELS: Record<string, string> = {
  tesseract: 'Tesseract',
  paddle: 'PaddleOCR',
  dual_confirmed: 'Tesseract + PaddleOCR',
  direct: 'Прямое сравнение',
}

export function formatCompareMode(mode: CompareMode): string {
  return MODE_LABELS[mode]
}

export function formatOcrEngine(engine?: string): string | undefined {
  if (!engine) return undefined
  return ENGINE_LABELS[engine] ?? engine
}
