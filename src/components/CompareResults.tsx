import { useState } from 'react'
import type { CompareResponse } from '../api/types'
import { fileDescription, formatLabel } from '../utils/format'
import { formatCompareMode, formatOcrEngine } from '../utils/ocr'
import { DiffList } from './DiffList'

interface CompareResultsProps {
  result: CompareResponse
}

export function CompareResults({ result }: CompareResultsProps) {
  const [showFile1Text, setShowFile1Text] = useState(false)
  const [showFile2Text, setShowFile2Text] = useState(false)

  const file1Label = fileDescription(result.file1.filename, result.file1.format)
  const file2Label = fileDescription(result.file2.filename, result.file2.format)

  return (
    <section className="results">
      <div className="results__header">
        <h2>Результат сравнения</h2>
        <div
          className={`results__badge ${
            result.content_identical
              ? 'results__badge--success'
              : 'results__badge--warning'
          }`}
        >
          {result.content_identical ? 'Содержимое идентично' : 'Есть различия'}
        </div>
      </div>

      <div className="results__files">
        <span className="results__file">
          <strong>Файл 1:</strong> {result.file1.filename}
          <span className={`format-badge format-badge--${result.file1.format}`}>
            {formatLabel(result.file1.format)}
          </span>
        </span>
        <span className="results__file">
          <strong>Файл 2:</strong> {result.file2.filename}
          <span className={`format-badge format-badge--${result.file2.format}`}>
            {formatLabel(result.file2.format)}
          </span>
        </span>
      </div>

      {(result.ocr_mode || result.ocr_engine_used) && (
        <div className="results__ocr-info">
          {result.ocr_mode && (
            <span className="results__ocr-chip">
              {formatCompareMode(result.ocr_mode)}
            </span>
          )}
          {result.ocr_engine_used && (
            <span className="results__ocr-chip">
              {formatOcrEngine(result.ocr_engine_used)}
            </span>
          )}
        </div>
      )}

      <div className="results__stats">
        <article className="stat-card">
          <span className="stat-card__label">Схожесть</span>
          <span className="stat-card__value">
            {result.similarity_percent.toFixed(1)}%
          </span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Всего различий</span>
          <span className="stat-card__value">
            {result.diff_summary.total_differences}
          </span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Только в файле 1</span>
          <span className="stat-card__value">
            {result.diff_summary.only_in_file1}
          </span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Только в файле 2</span>
          <span className="stat-card__value">
            {result.diff_summary.only_in_file2}
          </span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Изменено</span>
          <span className="stat-card__value">{result.diff_summary.changed}</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Длина (без пробелов)</span>
          <span className="stat-card__value stat-card__value--small">
            Файл 1: {result.normalized_file1_length} / Файл 2:{' '}
            {result.normalized_file2_length}
          </span>
        </article>
      </div>

      <div className="results__section">
        <h3>Различия</h3>
        <DiffList
          differences={result.differences}
          file1Label={file1Label}
          file2Label={file2Label}
        />
      </div>

      <div className="results__text-panels">
        <div className="text-panel">
          <button
            type="button"
            className="text-panel__toggle"
            onClick={() => setShowFile1Text((value) => !value)}
          >
            {showFile1Text ? 'Скрыть' : 'Показать'} текст файла 1 (
            {formatLabel(result.file1.format)})
          </button>
          {showFile1Text && (
            <pre className="text-panel__content">{result.file1.text}</pre>
          )}
        </div>
        <div className="text-panel">
          <button
            type="button"
            className="text-panel__toggle"
            onClick={() => setShowFile2Text((value) => !value)}
          >
            {showFile2Text ? 'Скрыть' : 'Показать'} текст файла 2 (
            {formatLabel(result.file2.format)})
          </button>
          {showFile2Text && (
            <pre className="text-panel__content">{result.file2.text}</pre>
          )}
        </div>
      </div>
    </section>
  )
}
