import type { JobProgressState } from '../types/api';
import './JobProgress.css';

interface JobProgressProps {
  progress: JobProgressState;
}

export function JobProgress({ progress }: JobProgressProps) {
  const percent =
    progress.totalChunks > 0
      ? Math.min(100, Math.round((progress.processedChunks / progress.totalChunks) * 100))
      : 0;

  const isComplete = progress.status === 'completed';
  const isFailed = progress.status === 'failed';

  return (
    <section className="job-progress" aria-live="polite">
      <div className="job-progress-header">
        <h2 className="job-progress-title">Обработка задачи</h2>
        <span className="job-progress-id" title={progress.jobId}>
          {progress.jobId.slice(0, 8)}…
        </span>
      </div>

      <div className="job-progress-bar-wrap">
        <div
          className={`job-progress-bar ${isComplete ? 'job-progress-bar--done' : ''} ${isFailed ? 'job-progress-bar--failed' : ''}`}
          style={{ width: `${isComplete ? 100 : percent}%` }}
        />
      </div>

      <div className="job-progress-meta">
        <span className="job-progress-chunks">
          {progress.processedChunks} / {progress.totalChunks} чанков
        </span>
        <span className="job-progress-status">{progress.status}</span>
      </div>

      {progress.message && <p className="job-progress-message">{progress.message}</p>}

      {(progress.file1 || progress.file2) && (
        <div className="job-progress-files">
          {progress.file1 && (
            <span>
              {progress.file1.filename} — {progress.file1.chunks} чанк.
            </span>
          )}
          {progress.file2 && (
            <span>
              {progress.file2.filename} — {progress.file2.chunks} чанк.
            </span>
          )}
        </div>
      )}

      {progress.kafkaTopic && (
        <p className="job-progress-topic">Kafka: {progress.kafkaTopic}</p>
      )}
    </section>
  );
}
