import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { useAuth } from './auth/AuthContext';
import { useHealth } from './hooks/useHealth';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ComparePage } from './pages/ComparePage';
import { HistoryPage } from './pages/HistoryPage';
import { JobPage } from './pages/JobPage';
import { LoginPage } from './pages/LoginPage';
import './App.css';

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { health, loading: healthLoading, error: healthError, refresh } = useHealth();

  if (loading) {
    return <p className="muted">Проверка сессии…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="app">
      <Header
        health={health}
        healthLoading={healthLoading}
        healthError={healthError}
        onRefreshHealth={() => void refresh()}
      />
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>
          API:{' '}
          <a href="http://localhost:5000/docs" target="_blank" rel="noreferrer">
            Swagger UI
          </a>
        </p>
      </footer>
    </div>
  );
}

function AdminRoute() {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <AdminUsersPage />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<ComparePage />} />
        <Route path="/jobs" element={<HistoryPage />} />
        <Route path="/jobs/:jobId" element={<JobPage />} />
        <Route path="/admin/users" element={<AdminRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
