import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
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

export function JobPage() {
  const { jobId = '' } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobListItem | null>(null);
  const [result, setResult] = useState<ComparisonViewModel | null>(null);
  const [progress, setProgress] = useState<JobProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadResult = useCallback(
    async (item: JobListItem) => {
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
    },
    [],
  );

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
        setJob(item);
        if (item.status === 'completed') {
          await loadResult(item);
          return;
        }
        if (item.status === 'failed') {
          setError(item.message || 'Сравнение завершилось с ошибкой');
          return;
        }
        setProgress({
          jobId: item.job_id,
          status: item.status,
          processedChunks: item.processed_chunks,
          totalChunks: item.total_chunks,
          message: item.message,
        });
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
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (err instanceof JobError) {
          setError(err.message);
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
  }, [jobId, loadResult]);

  const handleDownload = async (side: 1 | 2) => {
    const name = side === 1 ? job?.file1_name || 'file1' : job?.file2_name || 'file2';
    try {
      await downloadJobFile(jobId, side, name);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось скачать файл');
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
