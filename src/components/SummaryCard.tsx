import type { ComparisonViewModel } from '../types/api';
import {
  countByCategory,
  formatElapsedMs,
  pluralize,
} from '../utils/format';
import './SummaryCard.css';

interface SummaryCardProps {
  result: ComparisonViewModel;
}

export function SummaryCard({ result }: SummaryCardProps) {
  const { comparison, jobId, file1, file2, wsRoundTripMs } = result;
  const stats = countByCategory(comparison.differences);
  const verdict = comparison.verdict ?? (
    comparison.identical ? 'identical' : 'different'
  );
  const identical = verdict === 'identical';
  const contentEqual = verdict === 'content_equal';

  return (
    <section
      className={`summary-card ${
        identical
          ? 'summary-card--identical'
          : contentEqual
            ? 'summary-card--content-equal'
            : 'summary-card--diff'
      }`}
    >
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
          ) : contentEqual ? (
            <>
              <span className="verdict-icon verdict-icon--ok" aria-hidden>✓</span>
              <div>
                <h2 className="verdict-title">Содержимое совпадает</h2>
                <p className="verdict-desc">
                  Найдены только технические различия
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="verdict-icon verdict-icon--warn" aria-hidden>!</span>
              <div>
                <h2 className="verdict-title">Обнаружены различия</h2>
                <p className="verdict-desc">
                  {stats.substantive > 0
                    ? `Найдено ${stats.substantive} ${pluralize(
                        stats.substantive,
                        'содержательное различие',
                        'содержательных различия',
                        'содержательных различий',
                      )}`
                    : `${stats.ocrUncertain} ${pluralize(
                        stats.ocrUncertain,
                        'различие требует',
                        'различия требуют',
                        'различий требуют',
                      )} проверки распознавания`}
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
          {wsRoundTripMs != null && (
            <span className="summary-job-timer" title="Время сравнения">
              {formatElapsedMs(wsRoundTripMs)}
            </span>
          )}
        </div>
      </div>

      {!identical && (
        <div className="summary-stats">
          <StatItem label="Всего" value={stats.total} variant="total" />
          <StatItem label="Содержательные" value={stats.substantive} variant="substantive" />
          <StatItem label="Проверить текст" value={stats.ocrUncertain} variant="ocr" />
          <StatItem label="Технические" value={stats.technical} variant="technical" />
        </div>
      )}

      <div className="summary-files">
        <span>{file1.filename}</span>
        <span className="summary-sep">·</span>
        <span>{file2.filename}</span>
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
  variant: 'total' | 'substantive' | 'ocr' | 'technical';
}) {
  return (
    <div className={`stat-item stat-item--${variant}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
