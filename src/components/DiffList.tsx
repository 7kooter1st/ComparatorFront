import { useMemo, useState } from 'react';
import type {
  ComparisonViewModel,
  DifferenceCategory,
  LineDifference,
  LineDiffKind,
} from '../types/api';
import {
  countByCategory,
  getDifferenceCategory,
  getLineDiffKind,
} from '../utils/format';
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
  const stats = countByCategory(comparison.differences);

  const grouped = useMemo(() => {
    let items = comparison.differences.map((entry, originalIndex) => ({
      entry,
      originalIndex,
    }));

    if (filter !== 'all') {
      items = items.filter(({ entry }) => getLineDiffKind(entry) === filter);
    }

    const query = search.trim().toLowerCase();
    if (query) {
      items = items.filter(
        ({ entry }) =>
          (entry.file1_line?.toLowerCase().includes(query) ?? false) ||
          (entry.file2_line?.toLowerCase().includes(query) ?? false) ||
          (entry.reason?.toLowerCase().includes(query) ?? false),
      );
    }

    return {
      substantive: items.filter(
        ({ entry }) => getDifferenceCategory(entry) === 'substantive',
      ),
      ocr_uncertain: items.filter(
        ({ entry }) => getDifferenceCategory(entry) === 'ocr_uncertain',
      ),
      technical: items.filter(
        ({ entry }) => getDifferenceCategory(entry) === 'technical',
      ),
    };
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

      {grouped.substantive.length === 0 &&
      grouped.ocr_uncertain.length === 0 &&
      grouped.technical.length === 0 ? (
        <p className="diff-no-results">Ничего не найдено по текущему фильтру.</p>
      ) : (
        <div className="diff-groups">
          <DifferenceGroup
            category="substantive"
            title="Содержательные различия"
            description="Изменения слов, чисел, дат, сумм и смысла текста."
            items={grouped.substantive}
          />
          <DifferenceGroup
            category="ocr_uncertain"
            title="Требуют проверки текста"
            description="Различие оставлено видимым: по распознанному тексту его нельзя безопасно скрыть."
            items={grouped.ocr_uncertain}
          />
          {grouped.technical.length > 0 && (
            <details className="diff-group diff-group--technical">
              <summary className="diff-group-heading">
                <span>
                  <strong>Технические различия</strong>
                  <small>Оформление, нумерация, переносы и эквивалентные символы.</small>
                </span>
                <span className="diff-group-count">{grouped.technical.length}</span>
              </summary>
              <DiffEntries items={grouped.technical} />
            </details>
          )}
        </div>
      )}
    </section>
  );
}

interface IndexedDifference {
  entry: LineDifference;
  originalIndex: number;
}

function DifferenceGroup({
  category,
  title,
  description,
  items,
}: {
  category: Exclude<DifferenceCategory, 'technical' | 'alignment_error'>;
  title: string;
  description: string;
  items: IndexedDifference[];
}) {
  if (items.length === 0) return null;

  return (
    <section className={`diff-group diff-group--${category}`}>
      <div className="diff-group-heading">
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <span className="diff-group-count">{items.length}</span>
      </div>
      <DiffEntries items={items} />
    </section>
  );
}

function DiffEntries({ items }: { items: IndexedDifference[] }) {
  return (
    <div className="diff-entries">
      {items.map(({ entry, originalIndex }) => (
        <DiffEntry
          key={entry.candidate_id ?? `${entry.file1_line}-${entry.file2_line}-${originalIndex}`}
          entry={entry}
          index={originalIndex}
        />
      ))}
    </div>
  );
}
