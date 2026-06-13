import { useEffect, useState } from 'react'
import { checkHealth, compareDocuments } from './api/client'
import type { CompareResponse } from './api/types'
import { ApiError } from './api/types'
import { CompareResults } from './components/CompareResults'
import { FileUpload } from './components/FileUpload'
import { HealthStatus } from './components/HealthStatus'
import { ACCEPTED_DOCUMENTS } from './utils/format'
import './App.css'

function App() {
  const [healthStatus, setHealthStatus] = useState<
    'loading' | 'online' | 'offline'
  >('loading')
  const [serviceName, setServiceName] = useState<string>()
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [isComparing, setIsComparing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorHint, setErrorHint] = useState<string | null>(null)
  const [result, setResult] = useState<CompareResponse | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadHealth() {
      try {
        const health = await checkHealth()
        if (!cancelled) {
          setHealthStatus('online')
          setServiceName(health.service)
        }
      } catch {
        if (!cancelled) {
          setHealthStatus('offline')
        }
      }
    }

    loadHealth()
    const interval = window.setInterval(loadHealth, 30000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const canCompare = Boolean(file1 && file2 && !isComparing)

  async function handleCompare() {
    if (!file1 || !file2) return

    setIsComparing(true)
    setError(null)
    setErrorHint(null)
    setResult(null)

    try {
      const response = await compareDocuments(file1, file2)
      setResult(response)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setErrorHint(err.hint ?? null)
      } else {
        setError(
          'Не удалось выполнить сравнение. Проверьте подключение к серверу.',
        )
      }
    } finally {
      setIsComparing(false)
    }
  }

  function handleReset() {
    setFile1(null)
    setFile2(null)
    setResult(null)
    setError(null)
    setErrorHint(null)
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <p className="app__eyebrow">PDF & DOCX Comparator</p>
          <h1>Сравнение документов</h1>
          <p className="app__subtitle">
            Загрузите два файла в формате DOCX и/или PDF. Формат определяется
            автоматически на сервере. Тексты нормализуются путём удаления
            пробелов, затем сравниваются.
          </p>
        </div>
        <HealthStatus status={healthStatus} serviceName={serviceName} />
      </header>

      <main className="app__main">
        <section className="upload-card">
          <h2>Загрузка файлов</h2>
          <div className="upload-card__grid">
            <FileUpload
              id="file1-upload"
              label="Файл 1"
              accept={ACCEPTED_DOCUMENTS}
              hint="DOCX или PDF — формат определяется автоматически"
              file={file1}
              disabled={isComparing}
              onChange={setFile1}
            />
            <FileUpload
              id="file2-upload"
              label="Файл 2"
              accept={ACCEPTED_DOCUMENTS}
              hint="DOCX или PDF — формат определяется автоматически"
              file={file2}
              disabled={isComparing}
              onChange={setFile2}
            />
          </div>

          <div className="upload-card__actions">
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canCompare || healthStatus === 'offline'}
              onClick={handleCompare}
            >
              {isComparing ? 'Сравнение…' : 'Сравнить документы'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={isComparing}
              onClick={handleReset}
            >
              Сбросить
            </button>
          </div>

          {healthStatus === 'offline' && (
            <p className="upload-card__warning">
              Бэкенд недоступен. Убедитесь, что Flask-сервер запущен на порту
              5000.
            </p>
          )}

          {error && (
            <div className="alert alert--error" role="alert">
              <p>{error}</p>
              {errorHint && <p className="alert__hint">{errorHint}</p>}
            </div>
          )}
        </section>

        {result && <CompareResults result={result} />}
      </main>
    </div>
  )
}

export default App
