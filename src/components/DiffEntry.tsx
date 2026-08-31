import type { LineDifference } from '../types/api';
import {
  DIFF_KIND_LABELS,
  getDifferenceCategory,
  getLineDiffKind,
} from '../utils/format';
import { HighlightedLine } from './HighlightedLine';
import './DiffEntry.css';

interface DiffEntryProps {
  entry: LineDifference;
  index: number;
}

export function DiffEntry({ entry, index }: DiffEntryProps) {
  const kind = getLineDiffKind(entry);
  const category = getDifferenceCategory(entry);
  const typeClass =
    kind === 'only_in_file1'
      ? 'diff-entry--file1'
      : kind === 'only_in_file2'
        ? 'diff-entry--file2'
        : 'diff-entry--changed';

  const showFile1 = kind === 'only_in_file1' || kind === 'changed';
  const showFile2 = kind === 'only_in_file2' || kind === 'changed';

  return (
    <article className={`diff-entry ${typeClass}`}>
      <div className="diff-entry-header">
        <span className="diff-entry-index">#{index + 1}</span>
        <span className={`diff-type-badge diff-type-badge--${kind}`}>
          {DIFF_KIND_LABELS[kind]}
        </span>
        <span className={`diff-category-badge diff-category-badge--${category}`}>
          {category === 'substantive'
            ? 'Содержательное'
            : category === 'technical'
              ? 'Техническое'
              : 'Проверить OCR'}
        </span>
        {entry.line_number != null && (
          <span className="line-ref">строка {entry.line_number}</span>
        )}
        {(entry.file1_page != null || entry.file2_page != null) && (
          <span className="diff-location">
            {formatLocation(entry)}
          </span>
        )}
      </div>

      {(entry.reason || entry.technical_type) && (
        <div className="diff-explanation">
          <span>{entry.reason ?? technicalTypeLabel(entry.technical_type)}</span>
          {entry.confidence != null && (
            <span title="Уверенность классификатора">
              {Math.round(entry.confidence * 100)}%
            </span>
          )}
        </div>
      )}

      <div className={`diff-columns ${!showFile1 || !showFile2 ? 'diff-columns--single' : ''}`}>
        {showFile1 && (
          <div className="diff-column">
            <span className="diff-column-label">Документ 1</span>
            <pre className="diff-text">
              <HighlightedLine text={entry.file1_line} span={entry.file1_span} />
            </pre>
          </div>
        )}

        {showFile2 && (
          <div className="diff-column">
            <span className="diff-column-label">Документ 2</span>
            <pre className="diff-text">
              <HighlightedLine text={entry.file2_line} span={entry.file2_span} />
            </pre>
          </div>
        )}
      </div>
    </article>
  );
}

function formatLocation(entry: LineDifference): string {
  const left = entry.file1_page != null ? `док. 1, стр. ${entry.file1_page}` : null;
  const right = entry.file2_page != null ? `док. 2, стр. ${entry.file2_page}` : null;
  return [left, right].filter(Boolean).join(' · ');
}

function technicalTypeLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    markdown: 'Markdown-разметка',
    numbering: 'Нумерация пункта',
    page_number: 'Номер страницы',
    list_marker: 'Маркер списка',
    header_footer: 'Колонтитул или заголовочная область',
    dash: 'Эквивалентный вид тире',
    line_wrap: 'Перенос строки',
  };
  return value ? (labels[value] ?? value) : '';
}
