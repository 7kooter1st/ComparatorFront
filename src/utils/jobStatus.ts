const STATUS_LABELS: Record<string, string> = {
  queued: 'В очереди',
  preparing: 'Подготовка документов',
  processing: 'Сканирование файлов',
  ocr_ready: 'Сканирование завершено',
  comparing: 'Сравнение документов',
  completed: 'Готово',
  failed: 'Ошибка',
};

const TECHNICAL =
  /kafka|chunk|чанк|postgresql|websocket|processing service|ollama|иерарх|diff-кандидат/i;

export function jobStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function countsFromMessage(message: string): [string, string] | null {
  const slash = message.match(/(\d+)\s*\/\s*(\d+)/);
  if (slash) return [slash[1], slash[2]];
  const iz = message.match(/(\d+)\s+из\s+(\d+)/i);
  if (iz) return [iz[1], iz[2]];
  return null;
}

export function friendlyJobMessage(message?: string | null, status?: string): string {
  const raw = (message ?? '').trim();
  if (!raw) {
    return status ? jobStatusLabel(status) : '';
  }

  if (!TECHNICAL.test(raw)) {
    return raw;
  }

  const lower = raw.toLowerCase();
  const counts = countsFromMessage(raw);

  if (/ошибк|не удалось|недоступ/i.test(lower)) {
    if (/chunk|чанк|ocr|скан/i.test(lower) && counts) {
      return `Ошибка при сканировании страницы ${counts[0]}`;
    }
    if (/kafka|очеред|публикац/i.test(lower)) {
      return 'Не удалось поставить задачу в очередь. Попробуйте ещё раз.';
    }
    return raw.replace(/chunk/gi, 'страницы').replace(/чанк\w*/gi, 'страницы');
  }

  if (/классификац|кандидат|проверк/i.test(lower)) {
    return 'Проверка найденных различий…';
  }

  if (/иерарх|diff|сравнен/i.test(lower) && !/ocr|скан|распозн/i.test(lower)) {
    return 'Сравнение документов…';
  }

  if (/готово|результат готов|завершено/i.test(lower) && !/ocr|скан/i.test(lower)) {
    return 'Сравнение завершено';
  }

  if (/всех|сохранён|заверш/i.test(lower) && /ocr|фрагмент|страниц/i.test(lower)) {
    return 'Сканирование завершено, начинается сравнение';
  }

  if (/ocr|распознаван|скан|chunk|чанк|фрагмент/i.test(lower)) {
    if (counts) {
      return `Выполняется сканирование файлов: ${counts[0]} из ${counts[1]}`;
    }
    return 'Выполняется сканирование файлов';
  }

  if (/kafka|processing|очеред|ожидан/i.test(lower)) {
    return 'Процесс в очереди';
  }

  return status ? jobStatusLabel(status) : 'Обработка документов…';
}
