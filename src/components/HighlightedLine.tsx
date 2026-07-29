import type { CharSpan } from '../types/api';

interface HighlightedLineProps {
  text: string | null | undefined;
  span?: CharSpan | null;
  emptyFallback?: string;
}

/**
 * Рендерит строку с красной подсветкой фрагмента [start, end).
 * Если span отсутствует или некорректен — выводит текст как есть.
 */
export function HighlightedLine({
  text,
  span,
  emptyFallback = '—',
}: HighlightedLineProps) {
  if (text == null || text === '') {
    return <>{emptyFallback}</>;
  }

  const range = normalizeSpan(text, span);
  if (!range) {
    return <>{text}</>;
  }

  const [start, end] = range;
  const before = text.slice(0, start);
  const highlighted = text.slice(start, end);
  const after = text.slice(end);

  return (
    <>
      {before}
      <mark className="diff-highlight">{highlighted}</mark>
      {after}
    </>
  );
}

function normalizeSpan(
  text: string,
  span?: CharSpan | null,
): CharSpan | null {
  if (!span || span.length < 2) return null;

  let start = Math.floor(Number(span[0]));
  let end = Math.floor(Number(span[1]));

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  if (start > end) {
    [start, end] = [end, start];
  }

  start = Math.max(0, Math.min(start, text.length));
  end = Math.max(0, Math.min(end, text.length));

  if (start >= end) return null;

  return [start, end];
}
