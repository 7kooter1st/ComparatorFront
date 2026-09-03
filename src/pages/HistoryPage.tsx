import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteJob, listJobs } from '../api/client';
import type { JobListItem } from '../types/api';
import { ApiError } from '../types/api';
import { jobStatusLabel } from '../utils/jobStatus';
import './HistoryPage.css';

const ACTIVE = new Set([
  'queued',
  'preparing',
  'processing',
  'ocr_ready',
  'comparing',
  'classifying',
  'finalizing',
  'cancel_requested',
]);

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU');
}

export function HistoryPage() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) {
      setLoading(true);
      setError(null);
    }
    try {
      setJobs(await listJobs());
    } catch (err) {
      if (!quiet) {
        setError(err instanceof ApiError ? err.message : 'Не удалось загрузить историю');
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const hasActive = jobs.some((job) => ACTIVE.has(job.status));
    if (!hasActive) return;
    const id = window.setInterval(() => {
      void refresh(true);
    }, 4000);
    return () => window.clearInterval(id);
  }, [jobs, refresh]);

  const handleDelete = async (jobId: string) => {
    if (!window.confirm('Удалить сравнение и исходные файлы?')) return;
    try {
      await deleteJob(jobId);
      setJobs((current) => current.filter((job) => job.job_id !== jobId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось удалить задачу');
    }
  };

  const activeJobs = jobs.filter((job) => ACTIVE.has(job.status));

  return (
    <section className="history-page">
      <div className="page-heading">
        <h2>История сравнений</h2>
        <button type="button" className="btn btn--secondary" onClick={() => void refresh()}>
          Обновить
        </button>
      </div>
      {activeJobs.length > 0 && (
        <p className="queue-banner">
          Активных задач: {activeJobs.length}. Новая загрузка не останавливает уже принятые
          сравнения.
        </p>
      )}
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <p className="muted">Загрузка…</p>
      ) : jobs.length === 0 ? (
        <p className="muted">Пока нет сравнений. Загрузите документы на главной странице.</p>
      ) : (
        <div className="table-wrap">
          <table className="jobs-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Файлы</th>
                <th>Статус</th>
                <th>Очередь</th>
                <th>Вердикт</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.job_id}>
                  <td>{formatDate(job.created_at)}</td>
                  <td>
                    <Link to={`/jobs/${job.job_id}`}>
                      {job.file1_name || 'файл 1'} ↔ {job.file2_name || 'файл 2'}
                    </Link>
                  </td>
                  <td>{jobStatusLabel(job.status)}</td>
                  <td>
                    {job.queue_position
                      ? `${job.queue_position} из ${job.active_count ?? job.queue_position}`
                      : '—'}
                  </td>
                  <td>{job.verdict ?? '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--secondary btn--small"
                      onClick={() => void handleDelete(job.job_id)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
