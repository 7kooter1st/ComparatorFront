import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  cancelJob,
  deleteJob,
  downloadJobFile,
  getJob,
  getJobResult,
} from '../api/client';
import { watchJob } from '../api/jobSocket';
import { DiffList } from '../components/DiffList';
import { JobProgress } from '../components/JobProgress';
import { SummaryCard } from '../components/SummaryCard';
import type {
  ComparisonViewModel,
  JobListItem,
  JobProgressState,
} from '../types/api';
import { ApiError, JobError } from '../types/api';
import './JobPage.css';

const TERMINAL_FAILURE = new Set(['failed', 'cancelled']);

export function JobPage() {
  const { jobId = '' } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobListItem | null>(null);
  const [result, setResult] = useState<ComparisonViewModel | null>(null);
  const [progress, setProgress] = useState<JobProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyJob = useCallback((item: JobListItem) => {
    setJob(item);
    setProgress({
      jobId: item.job_id,
      status: item.status,
      processedChunks: item.processed_chunks,
      totalChunks: item.total_chunks,
      message: item.message,
    });
  }, []);

  const loadResult = useCallback(async (item: JobListItem) => {
    const payload = await getJobResult(item.job_id);
    setResult({
      comparison: payload.comparison,
      jobId: item.job_id,
      totalChunks: item.total_chunks,
      file1: {
        filename: item.file1_name,
        format: 'pending',
        chunks: item.total_chunks,
      },
      file2: {
        filename: item.file2_name,
        format: 'pending',
        chunks: item.total_chunks,
      },
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const item = await getJob(jobId);
        if (cancelled) return;
        applyJob(item);
        if (item.status === 'completed') {
          await loadResult(item);
          return;
        }
        if (TERMINAL_FAILURE.has(item.status)) {
          setError(item.message || 'Сравнение завершилось с ошибкой');
          return;
        }

        const poll = window.setInterval(async () => {
          try {
            const latest = await getJob(jobId);
            if (cancelled) return;
            applyJob(latest);
            if (latest.status === 'completed') {
              window.clearInterval(poll);
              controller.abort();
              await loadResult(latest);
              setLoading(false);
              return;
            }
            if (TERMINAL_FAILURE.has(latest.status)) {
              window.clearInterval(poll);
              controller.abort();
              setError(latest.message || 'Сравнение завершилось с ошибкой');
              setLoading(false);
            }
          } catch {
            // Keep watching; REST blips should not fail a running job.
          }
        }, 3000);

        try {
          const watched = await watchJob(
            item.job_id,
            item.websocket_url ?? undefined,
            {
              onStatus: (status) => {
                setProgress({
                  jobId: item.job_id,
                  status: status.status,
                  processedChunks: status.processed_chunks,
                  totalChunks: status.total_chunks,
                  message: status.message,
                });
              },
            },
            controller.signal,
          );
          if (cancelled) return;
          window.clearInterval(poll);
          setResult({
            comparison: watched.comparison,
            jobId: item.job_id,
            totalChunks: item.total_chunks,
            file1: {
              filename: item.file1_name,
              format: 'pending',
              chunks: item.total_chunks,
            },
            file2: {
              filename: item.file2_name,
              format: 'pending',
              chunks: item.total_chunks,
            },
            wsRoundTripMs: watched.wsRoundTripMs,
          });
          setJob(await getJob(jobId));
        } finally {
          window.clearInterval(poll);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (err instanceof JobError) {
          try {
            const latest = await getJob(jobId);
            if (TERMINAL_FAILURE.has(latest.status)) {
              setError(latest.message || err.message);
            }
          } catch {
            setError(err.message);
          }
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : 'Не удалось открыть задачу');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [jobId, loadResult, applyJob]);

  const handleDownload = async (side: 1 | 2) => {
    const name = side === 1 ? job?.file1_name || 'file1' : job?.file2_name || 'file2';
    try {
      await downloadJobFile(jobId, side, name);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось скачать файл');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelJob(jobId);
      const latest = await getJob(jobId);
      applyJob(latest);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отменить задачу');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить сравнение и исходные файлы?')) return;
    try {
      await deleteJob(jobId);
      navigate('/jobs');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось удалить задачу');
    }
  };

  const inFlight = Boolean(job && !result && !TERMINAL_FAILURE.has(job.status) && job.status !== 'completed');

  return (
    <section className="job-page">
      <div className="page-heading">
        <div>
          <Link to="/jobs">← История</Link>
          <h2>{job ? `${job.file1_name} ↔ ${job.file2_name}` : 'Сравнение'}</h2>
        </div>
        <div className="job-actions">
          <button type="button" className="btn btn--secondary" onClick={() => void handleDownload(1)}>
            Скачать файл 1
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => void handleDownload(2)}>
            Скачать файл 2
          </button>
          {inFlight && (
            <button type="button" className="btn btn--secondary" onClick={() => void handleCancel()}>
              Отменить задачу
            </button>
          )}
          <button type="button" className="btn btn--secondary" onClick={() => void handleDelete()}>
            Удалить
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      {loading && !result && <p className="muted">Загрузка задачи…</p>}
      {!result && progress && <JobProgress progress={progress} />}
      {result && (
        <div className="results-section">
          <SummaryCard result={result} />
          <DiffList result={result} />
        </div>
      )}
    </section>
  );
}
