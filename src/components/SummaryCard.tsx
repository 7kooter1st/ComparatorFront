import type { ComparisonViewModel } from '../types/api';
import { countByKind, pluralize } from '../utils/format';
import './SummaryCard.css';

interface SummaryCardProps {
  result: ComparisonViewModel;
}

export function SummaryCard({ result }: SummaryCardProps) {
  const { comparison, jobId, totalChunks, file1, file2 } = result;
  const stats = countByKind(comparison.differences);
  const identical = comparison.identical;

  return (
    <section className={`summary-card ${identical ? 'summary-card--identical' : 'summary-card--diff'}`}>
      <div className="summary-main">
        <div className="summary-verdict">
          {identical ? (
            <>
              <span className="verdict-icon verdict-icon--ok" aria-hidden>✓</span>
              <div>
                <h2 className="verdict-title">Документы идентичны</h2>
                <p className="verdict-desc">Модель не обнаружила различий</p>
              </div>
            </>
          ) : (
            <>
              <span className="verdict-icon verdict-icon--warn" aria-hidden>!</span>
              <div>
                <h2 className="verdict-title">Обнаружены различия</h2>
                <p className="verdict-desc">
                  Найдено {stats.total}{' '}
                  {pluralize(stats.total, 'различие', 'различия', 'различий')}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="summary-job">
          <span className="summary-job-label">Задача</span>
          <span className="summary-job-value" title={jobId}>
            {jobId.slice(0, 8)}…
          </span>
          <span className="summary-job-chunks">{totalChunks} чанков</span>
        </div>
      </div>

      {!identical && (
        <div className="summary-stats">
          <StatItem label="Всего" value={stats.total} variant="total" />
          <StatItem label="Только в док. 1" value={stats.onlyInFile1} variant="file1" />
          <StatItem label="Только в док. 2" value={stats.onlyInFile2} variant="file2" />
          <StatItem label="Изменено" value={stats.changed} variant="changed" />
        </div>
      )}

      <div className="summary-files">
        <span>{file1.filename} ({file1.chunks} чанк.)</span>
        <span className="summary-sep">·</span>
        <span>{file2.filename} ({file2.chunks} чанк.)</span>
      </div>
    </section>
  );
}

function StatItem({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: 'total' | 'file1' | 'file2' | 'changed';
}) {
  return (
    <div className={`stat-item stat-item--${variant}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
