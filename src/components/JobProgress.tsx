import type { JobProgressState } from '../types/api';
import { formatElapsedMs } from '../utils/format';
import { friendlyJobMessage, jobStatusLabel } from '../utils/jobStatus';
import './JobProgress.css';

interface JobProgressProps {
  progress: JobProgressState;
  wsActive?: boolean;
  wsElapsedMs?: number | null;
}

export function JobProgress({ progress, wsActive = false, wsElapsedMs }: JobProgressProps) {
  const percent =
    progress.totalChunks > 0
      ? Math.min(100, Math.round((progress.processedChunks / progress.totalChunks) * 100))
      : 0;

  const isComplete = progress.status === 'completed';
  const isFailed = progress.status === 'failed';
  const message = friendlyJobMessage(progress.message, progress.status);
  const hasCounts = progress.totalChunks > 0;

  return (
    <section className="job-progress" aria-live="polite">
      <div className="job-progress-header">
        <h2 className="job-progress-title">Ход сравнения</h2>
        <div className="job-progress-header-right">
          {wsActive && wsElapsedMs != null && (
            <span className="job-progress-timer" title="Время с начала обработки">
              {formatElapsedMs(wsElapsedMs)}
            </span>
          )}
        </div>
      </div>

      <div className="job-progress-bar-wrap">
        <div
          className={`job-progress-bar ${isComplete ? 'job-progress-bar--done' : ''} ${isFailed ? 'job-progress-bar--failed' : ''}`}
          style={{ width: `${isComplete ? 100 : percent}%` }}
        />
      </div>

      <div className="job-progress-meta">
        <span className="job-progress-chunks">
          {hasCounts
            ? `Обработано ${progress.processedChunks} из ${progress.totalChunks}`
            : 'Ожидание начала обработки'}
        </span>
        <span className="job-progress-status">{jobStatusLabel(progress.status)}</span>
      </div>

      {message && <p className="job-progress-message">{message}</p>}

      {(progress.file1 || progress.file2) && (
        <div className="job-progress-files">
          {progress.file1 && <span>{progress.file1.filename}</span>}
          {progress.file2 && <span>{progress.file2.filename}</span>}
        </div>
      )}
    </section>
  );
}
