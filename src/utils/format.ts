import type { LineDifference, LineDiffKind } from '../types/api';

export const DIFF_KIND_LABELS: Record<LineDiffKind, string> = {
  only_in_file1: 'Только в документе 1',
  only_in_file2: 'Только в документе 2',
  changed: 'Изменено',
};

export function getLineDiffKind(entry: LineDifference): LineDiffKind {
  const has1 = Boolean(entry.file1_line?.trim());
  const has2 = Boolean(entry.file2_line?.trim());

  if (has1 && !has2) return 'only_in_file1';
  if (!has1 && has2) return 'only_in_file2';
  return 'changed';
}

export function countByKind(differences: LineDifference[]) {
  let onlyInFile1 = 0;
  let onlyInFile2 = 0;
  let changed = 0;

  for (const entry of differences) {
    const kind = getLineDiffKind(entry);
    if (kind === 'only_in_file1') onlyInFile1++;
    else if (kind === 'only_in_file2') onlyInFile2++;
    else changed++;
  }

  return { onlyInFile1, onlyInFile2, changed, total: differences.length };
}

export function isValidDocument(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.pdf') || name.endsWith('.docx');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
