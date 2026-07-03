import { useCallback, useRef, useState } from 'react';
import { runCompareJob } from '../api/client';
import type { ComparisonViewModel, JobProgressState } from '../types/api';
import { ApiError, JobError } from '../types/api';
import { FileUploadZone } from './FileUploadZone';
import { JobProgress } from './JobProgress';
import './CompareForm.css';

interface CompareFormProps {
  onResult: (result: ComparisonViewModel) => void;
  onError: (message: string, hint?: string) => void;
  onStart: () => void;
}

export function CompareForm({ onResult, onError, onStart }: CompareFormProps) {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<JobProgressState | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canSubmit = Boolean(file1 && file2) && !loading;

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!file1 || !file2) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setProgress(null);
      onStart();

      try {
        const result = await runCompareJob(
          file1,
          file2,
          { onProgress: setProgress },
          controller.signal,
        );
        onResult(result);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (err instanceof ApiError) {
          onError(err.message, err.hint);
        } else if (err instanceof JobError) {
          onError(err.message);
        } else {
          onError(err instanceof Error ? err.message : 'Не удалось выполнить сравнение');
        }
      } finally {
        setLoading(false);
        setProgress(null);
      }
    },
    [file1, file2, onResult, onError, onStart],
  );

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    setProgress(null);
  }, []);

  return (
    <form className="compare-form" onSubmit={handleSubmit}>
      <div className="upload-grid">
        <FileUploadZone
          label="Документ 1"
          file={file1}
          onFileChange={setFile1}
          disabled={loading}
        />
        <div className="upload-divider" aria-hidden>
          <span>↔</span>
        </div>
        <FileUploadZone
          label="Документ 2"
          file={file2}
          onFileChange={setFile2}
          disabled={loading}
        />
      </div>

      <div className="form-actions">
        {loading ? (
          <>
            <div className="loading-state">
              <span className="spinner" aria-hidden />
              <span>Ожидание результата через WebSocket…</span>
            </div>
            <button type="button" className="btn btn--secondary" onClick={handleCancel}>
              Отмена
            </button>
          </>
        ) : (
          <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
            Сравнить документы
          </button>
        )}
      </div>

      {loading && progress && <JobProgress progress={progress} />}

      {loading && !progress && (
        <p className="form-hint">Загрузка файлов и постановка задачи в Kafka…</p>
      )}

      {loading && progress && (
        <p className="form-hint">
          Документы разбиты на чанки и обрабатываются Processing Service. Прогресс приходит по
          WebSocket.
        </p>
      )}
    </form>
  );
}
