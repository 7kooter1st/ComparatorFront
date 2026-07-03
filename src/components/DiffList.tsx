import { useMemo, useState } from 'react';
import type { ComparisonViewModel, LineDiffKind } from '../types/api';
import { countByKind, getLineDiffKind } from '../utils/format';
import { DiffEntry } from './DiffEntry';
import './DiffList.css';

interface DiffListProps {
  result: ComparisonViewModel;
}

type FilterType = 'all' | LineDiffKind;

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'only_in_file1', label: 'Только в док. 1' },
  { value: 'only_in_file2', label: 'Только в док. 2' },
  { value: 'changed', label: 'Изменено' },
];

export function DiffList({ result }: DiffListProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const { comparison } = result;
  const stats = countByKind(comparison.differences);

  const filtered = useMemo(() => {
    let items = comparison.differences;

    if (filter !== 'all') {
      items = items.filter((d) => getLineDiffKind(d) === filter);
    }

    const query = search.trim().toLowerCase();
    if (query) {
      items = items.filter(
        (d) =>
          (d.file1_line?.toLowerCase().includes(query) ?? false) ||
          (d.file2_line?.toLowerCase().includes(query) ?? false),
      );
    }

    return items;
  }, [comparison.differences, filter, search]);

  if (comparison.identical || comparison.differences.length === 0) {
    return (
      <div className="diff-empty diff-empty--success">
        <div className="diff-empty-icon" aria-hidden>✓</div>
        <h3>Различий не обнаружено</h3>
        <p>Документы полностью идентичны по содержанию.</p>
      </div>
    );
  }

  return (
    <section className="diff-list-section">
      <div className="diff-list-toolbar">
        <h2 className="diff-list-title">
          Различия
          <span className="diff-count">{stats.total}</span>
        </h2>

        <div className="diff-list-controls">
          <input
            type="search"
            className="diff-search"
            placeholder="Поиск по тексту…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="diff-filters" role="group" aria-label="Фильтр различий">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`filter-btn ${filter === opt.value ? 'filter-btn--active' : ''}`}
                onClick={() => setFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="diff-no-results">Ничего не найдено по текущему фильтру.</p>
      ) : (
        <div className="diff-entries">
          {filtered.map((entry, i) => (
            <DiffEntry
              key={`${entry.line_number}-${entry.file1_line}-${entry.file2_line}-${i}`}
              entry={entry}
              index={i}
            />
          ))}
        </div>
      )}
    </section>
  );
}
