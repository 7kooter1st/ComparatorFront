import type { DifferenceEntry } from '../api/types'

interface DiffListProps {
  differences: DifferenceEntry[]
  file1Label: string
  file2Label: string
}

const TYPE_LABELS: Record<DifferenceEntry['type'], string> = {
  only_in_file1: 'Только в файле 1',
  only_in_file2: 'Только в файле 2',
  changed: 'Изменено',
}

export function DiffList({
  differences,
  file1Label,
  file2Label,
}: DiffListProps) {
  if (differences.length === 0) {
    return <div className="diff-list diff-list--empty" />
  }

  return (
    <div className="diff-list">
      <div className="diff-list__header">
        <span>Тип</span>
        <span>{file1Label}</span>
        <span>{file2Label}</span>
      </div>
      <ul className="diff-list__items">
        {differences.map((entry, index) => (
          <li
            key={`${entry.type}-${index}`}
            className={`diff-list__item diff-list__item--${entry.type}`}
          >
            <span className="diff-list__type">{TYPE_LABELS[entry.type]}</span>
            <span className="diff-list__cell">
              {entry.file1 ?? <em className="diff-list__missing">—</em>}
            </span>
            <span className="diff-list__cell">
              {entry.file2 ?? <em className="diff-list__missing">—</em>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
