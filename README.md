# PDF & DOCX Comparator — Frontend

React-приложение для сравнения документов через API бэкенда.

## Команды

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Переменные окружения

Скопируйте `.env.example` в `.env.development` / `.env.production` и при необходимости задайте:

| Переменная | Описание |
|---|---|
| `VITE_API_BASE` | Базовый URL API (пусто — тот же хост) |
| `VITE_BASE_PATH` | Базовый путь фронтенда на сервере |
| `VITE_API_PROXY_TARGET` | URL бэкенда для dev/preview-прокси |

## Деплой

1. `npm run build`
2. Раздайте содержимое `dist/` через nginx или вместе с Flask-бэкендом
3. Проксируйте `/api` на бэкенд

Пример конфигурации nginx — в `deploy/nginx.conf.example`.
