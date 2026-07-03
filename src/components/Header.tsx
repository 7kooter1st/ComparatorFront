import type { HealthResponse } from '../types/api';
import './Header.css';

interface HeaderProps {
  health: HealthResponse | null;
  healthLoading: boolean;
  healthError: string | null;
  onRefreshHealth: () => void;
}

export function Header({
  health,
  healthLoading,
  healthError,
  onRefreshHealth,
}: HeaderProps) {
  const processingOk = health?.processing_service_reachable === true;
  const statusClass = healthError
    ? 'status-dot--error'
    : health?.status === 'ok'
      ? 'status-dot--ok'
      : 'status-dot--warn';

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="header-logo" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="8" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="13" y="4" width="8" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h1 className="header-title">Document Comparator</h1>
          <p className="header-subtitle">Kafka chunking + WebSocket прогресс</p>
        </div>
      </div>

      <div className="header-status">
        <button
          type="button"
          className="status-badge"
          onClick={onRefreshHealth}
          title="Обновить статус сервисов"
        >
          <span className={`status-dot ${statusClass}`} />
          <span className="status-text">
            {healthLoading && !health && !healthError
              ? 'Проверка…'
              : healthError
                ? 'Сервис недоступен'
                : health?.status === 'ok'
                  ? 'Chunking Service OK'
                  : 'Частичная деградация'}
          </span>
        </button>

        {health && !healthError && (
          <div className="status-details">
            <span className={processingOk ? 'pill pill--ok' : 'pill pill--warn'}>
              Processing {processingOk ? 'доступен' : 'недоступен'}
            </span>
            {health.kafka_producer !== undefined && (
              <span className="pill pill--neutral">
                Kafka {health.kafka_producer ? 'OK' : 'нет'}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
