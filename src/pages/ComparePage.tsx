import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompareForm } from '../components/CompareForm';
import type { ComparisonViewModel } from '../types/api';

export function ComparePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);

  const handleQueued = useCallback(
    (jobId: string) => {
      navigate(`/jobs/${jobId}`);
    },
    [navigate],
  );

  const handleResult = useCallback(
    (result: ComparisonViewModel) => {
      navigate(`/jobs/${result.jobId}`);
    },
    [navigate],
  );

  return (
    <section className="upload-section">
      {error && (
        <div className="alert alert--error" role="alert">
          <strong>{error.message}</strong>
          {error.hint && <p className="alert-hint">{error.hint}</p>}
        </div>
      )}
      <CompareForm
        onQueued={handleQueued}
        onResult={handleResult}
        onError={(message, hint) => setError({ message, hint })}
        onStart={() => setError(null)}
      />
    </section>
  );
}
