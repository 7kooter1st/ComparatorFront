import type { LineDifference } from '../types/api';
import { DIFF_KIND_LABELS, getLineDiffKind } from '../utils/format';
import { HighlightedLine } from './HighlightedLine';
import './DiffEntry.css';

interface DiffEntryProps {
  entry: LineDifference;
  index: number;
}

export function DiffEntry({ entry, index }: DiffEntryProps) {
  const kind = getLineDiffKind(entry);
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
        {entry.line_number != null && (
          <span className="line-ref">строка {entry.line_number}</span>
        )}
      </div>

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
