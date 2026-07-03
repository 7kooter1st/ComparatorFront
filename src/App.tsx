import { useCallback, useState } from 'react';
import { CompareForm } from './components/CompareForm';
import { DiffList } from './components/DiffList';
import { Header } from './components/Header';
import { SummaryCard } from './components/SummaryCard';
import { useHealth } from './hooks/useHealth';
import type { ComparisonViewModel } from './types/api';
import './App.css';

function App() {
  const { health, loading: healthLoading, error: healthError, refresh } = useHealth();
  const [result, setResult] = useState<ComparisonViewModel | null>(null);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);

  const handleStart = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  const handleResult = useCallback((data: ComparisonViewModel) => {
    setResult(data);
    setError(null);
  }, []);

  const handleError = useCallback((message: string, hint?: string) => {
    setError({ message, hint });
    setResult(null);
  }, []);

  return (
    <div className="app">
      <Header
        health={health}
        healthLoading={healthLoading}
        healthError={healthError}
        onRefreshHealth={() => void refresh()}
      />

      <main className="app-main">
        <section className="upload-section">
          <CompareForm
            onResult={handleResult}
            onError={handleError}
            onStart={handleStart}
          />
        </section>

        {error && (
          <div className="alert alert--error" role="alert">
            <strong>{error.message}</strong>
            {error.hint && <p className="alert-hint">{error.hint}</p>}
          </div>
        )}

        {result && (
          <section className="results-section">
            <SummaryCard result={result} />
            <DiffList result={result} />
          </section>
        )}
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

export default App;
