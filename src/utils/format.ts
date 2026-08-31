import type {
  DifferenceCategory,
  LineDifference,
  LineDiffKind,
} from '../types/api';

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

export function getDifferenceCategory(entry: LineDifference): DifferenceCategory {
  if (entry.category === 'alignment_error') return 'ocr_uncertain';
  return entry.category ?? 'substantive';
}

export function countByCategory(differences: LineDifference[]) {
  let substantive = 0;
  let ocrUncertain = 0;
  let technical = 0;

  for (const entry of differences) {
    const category = getDifferenceCategory(entry);
    if (category === 'technical') technical++;
    else if (category === 'ocr_uncertain') ocrUncertain++;
    else substantive++;
  }

  return {
    substantive,
    ocrUncertain,
    technical,
    total: differences.length,
  };
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

export function formatElapsedMs(ms: number): string {
  if (ms < 1000) return `${ms} мс`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)} с`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}:${remSec.toFixed(1).padStart(4, '0')}`;
}

export function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
