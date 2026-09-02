import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
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
  const { user, logout } = useAuth();
  const available = !healthError && health?.status === 'ok';
  const statusClass = healthError || !health
    ? 'status-dot--error'
    : available
      ? 'status-dot--ok'
      : 'status-dot--error';

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
        <h1 className="header-title">Document Comparator</h1>
      </div>

      {user && (
        <nav className="header-nav">
          <NavLink to="/" end>
            Сравнить
          </NavLink>
          <NavLink to="/jobs">История</NavLink>
          {user.role === 'admin' && <NavLink to="/admin/users">Пользователи</NavLink>}
        </nav>
      )}

      <div className="header-status">
        {user && (
          <div className="header-user">
            <span>{user.username}</span>
            <button type="button" className="btn btn--secondary btn--small" onClick={() => void logout()}>
              Выйти
            </button>
          </div>
        )}
        <button
          type="button"
          className="status-badge"
          onClick={onRefreshHealth}
          title="Обновить статус сервиса"
        >
          <span className={`status-dot ${statusClass}`} />
          <span className="status-text">
            {healthLoading && !health && !healthError
              ? 'Проверка…'
              : available
                ? 'Сервис доступен'
                : 'Сервис недоступен'}
          </span>
        </button>
      </div>
    </header>
  );
}
