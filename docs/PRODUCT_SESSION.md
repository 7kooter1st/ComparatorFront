# Продакшен-сессии (уровень B): cookie + сервер как источник правды

Документ описывает, что нужно реализовать на **бэкенде (Chunking Gateway :5000)** и **фронтенде (React)**, чтобы после F5, закрытия вкладки (в пределах TTL) и повторного входа пользователь восстанавливал активные и завершённые сравнения **без хранения файлов и результатов в localStorage**.

Текущее состояние:

- Gateway: `POST /api/compare`, `WS /ws/jobs/{job_id}`, `POST /api/result` (разбор Ollama).
- Processing (:5001): `GET /api/jobs`, `GET /api/jobs/{id}`, `GET /api/jobs/{id}/result`, WS.
- **Нет** привязки `job_id` к пользователю/сессии, **нет** cookie-сессии, **нет** прокси job-REST на gateway.
- Любой, кто знает UUID задачи, теоретически может подключиться к WS (риск для продакшена).

Цель уровня B: **пользовательская сессия** (идентификатор в HttpOnly-cookie), **история сравнений**, **восстановление UI** через REST + WebSocket, **контроль доступа** к задачам.

---

## 1. Модель данных и термины

### 1.1. Сущности

| Сущность | Описание |
|----------|----------|
| **User** | Зарегистрированный пользователь (опционально на первом этапе — только «анонимная сессия», см. этапы ниже). |
| **Session** | Серверная запись: `session_id` (случайный токен), `user_id` (nullable), `created_at`, `expires_at`, `last_seen_at`, метаданные (IP hash, User-Agent hash). |
| **ComparisonJob** | Одно сравнение двух файлов: `job_id` (UUID, как сейчас в Kafka), `session_id`, `user_id`, статус, имена файлов, `total_chunks`, timestamps, ссылка на результат. |
| **ComparisonResult** | JSON `comparison` (identical, differences со span) — хранить в БД gateway или доверять Processing + кэш. |

### 1.2. Cookie

Рекомендуемое имя: `comparator_session` (или `__Host-comparator_session` при чистом HTTPS).

| Атрибут | Значение (prod) |
|---------|------------------|
| `HttpOnly` | `true` — JS не читает, защита от XSS-кражи сессии |
| `Secure` | `true` — только HTTPS |
| `SameSite` | `Lax` (или `Strict`, если нет кросс-сайтовых сценариев) |
| `Path` | `/` |
| `Max-Age` / `Expires` | например 30 дней sliding expiration |
| `Domain` | ваш прод-домен |

**Содержимое cookie:** только opaque `session_id` (32+ байт random, base64url). Не JWT с данными внутри на первом этапе (проще отзыв сессии).

### 1.3. Уровень B в двух этапах

**Этап B1 — анонимная продуктовая сессия (без логина)**  
Первый визит → `POST /api/session` или middleware выдаёт cookie → все `compare` привязаны к `session_id` → история и восстановление после F5.

**Этап B2 — учётная запись**  
Login (email/OAuth) → сессия получает `user_id` → история переживает смену устройства → merge анонимной сессии в аккаунт при первом логине.

Документ ниже рассчитан на **B1 + задел под B2**.

---

## 2. Архитектура (высокий уровень)

```text
Browser (same origin, credentials: include)
    │
    ├─ GET  /api/session/me          → текущая сессия + active_job (опционально)
    ├─ GET  /api/comparisons         → список задач сессии/пользователя
    ├─ GET  /api/comparisons/{id}    → статус задачи (прокси + обогащение)
    ├─ GET  /api/comparisons/{id}/result → comparison JSON
    ├─ POST /api/compare             → создать job, записать в БД, cookie уже есть
    └─ WS   /ws/jobs/{job_id}        → только если job принадлежит сессии

Gateway (:5000)
    ├─ Session middleware (cookie → session_id)
    ├─ PostgreSQL / Redis (sessions, jobs, results cache)
    ├─ Kafka producer (как сейчас)
    └─ HTTP/WS к Processing (:5001)

Processing (:5001)
    └─ обработка чанков, Ollama, агрегация (без изменений логики, опционально job metadata)
```

**Источник правды для UI после F5:** Gateway БД + REST; WebSocket — только live-обновления.

---

## 3. Бэкенд (Chunking Gateway)

### 3.1. Хранилище

Минимум для продакшена:

- **PostgreSQL** (предпочтительно): таблицы `sessions`, `comparison_jobs`, `comparison_results` (или JSONB в jobs).
- **Redis** (опционально): кэш статуса с Processing, rate limit, быстрый `session_id → session`.

Миграции (Alembic/SQL):

**sessions**

- `id` UUID PK  
- `session_token_hash` — хэш значения из cookie (в cookie plain token, в БД только hash)  
- `user_id` UUID NULL FK users  
- `created_at`, `expires_at`, `last_seen_at`  
- `revoked_at` NULL  

**comparison_jobs**

- `id` UUID PK (= `job_id` в Kafka)  
- `session_id` FK  
- `user_id` UUID NULL  
- `status` enum: `queued`, `processing`, `completed`, `failed`, `cancelled`  
- `file1_name`, `file2_name`, `file1_format`, `file2_format`  
- `total_chunks`, `processed_chunks` (обновлять из WS relay или polling)  
- `kafka_topic`, `error_message`  
- `created_at`, `updated_at`, `completed_at`  

**comparison_results**

- `job_id` PK FK  
- `comparison` JSONB  
- `created_at`  

Processing по-прежнему держит runtime-state; gateway **синхронизирует** статус при событиях WS relay и при `GET` (если у Processing новее).

### 3.2. Middleware сессии

На каждый запрос (кроме whitelist):

1. Прочитать cookie `comparator_session`.
2. Если нет — создать сессию, `Set-Cookie`, продолжить.
3. Если есть — найти по hash, проверить `expires_at` / `revoked_at`, обновить `last_seen_at` (sliding).
4. Положить `request.state.session` (и позже `request.state.user`).

Whitelist без обязательной сессии: `/health`, `/docs`, статика, возможно `POST /api/auth/login`.

### 3.3. Новые и изменённые API (gateway)

Все эндпоинты ниже — на **:5000**, с cookie.

#### Session

| Метод | Путь | Назначение |
|-------|------|------------|
| `GET` | `/api/session/me` | `{ session_id, expires_at, user: null \| { id, email } }` |
| `POST` | `/api/session/logout` | revoke + очистка cookie |
| `POST` | `/api/auth/register`, `/api/auth/login` | B2: выдача/привязка сессии к user |
| `POST` | `/api/session/merge` | B2: перенос jobs с анонимной сессии на user после логина |

#### Comparisons (обёртка над job)

| Метод | Путь | Назначение |
|-------|------|------------|
| `GET` | `/api/comparisons` | Список jobs текущей сессии (пагинация, фильтр по status) |
| `GET` | `/api/comparisons/{job_id}` | Статус; **403** если job не этой сессии |
| `GET` | `/api/comparisons/{job_id}/result` | `{ comparison }`; **404** если не готов; **403** если чужой job |
| `POST` | `/api/compare` | Как сейчас + **запись в `comparison_jobs`** с `session_id` |
| `DELETE` | `/api/comparisons/{job_id}` | Мягкое удаление / отмена (опционально) |

Проксирование к Processing:

- Внутри `GET .../comparisons/{id}` вызывать `get_job_status(job_id)` (уже есть в `processing_client`).
- Внутри `GET .../result` — `get_job_result`; при успехе **сохранить** в `comparison_results`.

#### WebSocket

`WS /ws/jobs/{job_id}`:

1. До `accept` — проверить cookie (тот же middleware или дублировать логику для WS).
2. Проверить в БД: `comparison_jobs.id == job_id` и `session_id` совпадает.
3. Иначе закрыть с кодом **4403** (или 1008 policy violation).
4. При relay событий `status` / `result` — **обновлять** строку в `comparison_jobs` (и при `result` писать JSON в БД).

Так F5 + новый WS безопасен: без валидной cookie и ownership подключение невозможно.

### 3.4. Изменения в `POST /api/compare`

Последовательность:

1. Middleware.ensure_session.
2. Подготовка файлов, `job_id`, Kafka (как сейчас).
3. `INSERT comparison_jobs` (`queued`, метаданные файлов, `session_id`).
4. Опционально: `active_job_id` в сессии (одна активная задача на вкладку не обязательна — лучше список).
5. Response как сейчас (`CompareResponse`), плюс можно добавить `comparison_url: /api/comparisons/{job_id}`.

Файлы **не** хранить в БД gateway после публикации в Kafka (как сейчас), если политика retention это допускает. Для аудита в enterprise — отдельное S3 + шифрование (вне scope B1).

### 3.5. CORS и прод-развёртывание

Сейчас: `allow_origins=["*"]` + `allow_credentials=True` — **некорректная комбинация** для cookie.

Для продакшена:

- Фронт и API на **одном origin** (рекомендуется): статика из `dist/` на gateway — cookie same-site, CORS не нужен.
- Если фронт на другом домене: явный `allow_origins=["https://app.example.com"]`, `allow_credentials=True`.

`public_base_url` в settings должен совпадать с публичным URL для `websocket_url`.

### 3.6. Безопасность

- Хранить в cookie только random token; в БД — SHA-256(token + pepper).
- Rate limit на `POST /api/compare` по `session_id` / IP.
- Максимум активных `processing` jobs на сессию.
- TTL результатов (например 90 дней) + cron очистка.
- Audit log: `session_id`, `job_id`, действия (создание, просмотр результата).
- WebSocket: та же проверка ownership, что и REST.

### 3.7. Processing Service (:5001)

Минимальные изменения для B1:

- **Не обязательно** менять Processing, если gateway владеет metadata и проксирует REST/WS.

Желательно позже:

- Передавать в Kafka `session_id` / `user_id` в metadata (для трассировки).
- Не отдавать `GET /api/jobs` публично с интернета — только internal network, доступ с gateway.

### 3.8. OpenAPI

Обновить `openapi` gateway: схемы `SessionResponse`, `ComparisonListItem`, `ComparisonDetail`, security scheme `cookieAuth`.

---

## 4. Фронтенд (React)

### 4.1. Сетевой слой

Все запросы к API:

```ts
fetch('/api/...', { credentials: 'include' })
```

WebSocket: браузер **сам** отправит cookie на тот же origin при `new WebSocket('wss://host/ws/jobs/...')`. При cross-origin WS — отдельная схема (subprotocol + ticket), для same-origin не нужно.

Убрать зависимость от `sessionStorage` как источника правды (можно оставить только UI-кэш).

### 4.2. Bootstrap при загрузке приложения

Порядок в `App` / `SessionProvider`:

1. `GET /api/session/me` — убедиться, что cookie выставлена/жива.
2. `GET /api/comparisons?limit=20` — история для сайдбара / списка.
3. Определить **активную** задачу:
   - query `?job={uuid}` (deep link), **или**
   - последняя в статусе `queued` / `processing`, **или**
   - явный выбор пользователя из истории.
4. Для активной задачи:
   - `GET /api/comparisons/{job_id}` → прогресс;
   - если `completed` → `GET .../result` → показать diff;
   - если `processing` / `queued` → `watchJob(job_id)` (WS) + периодический fallback `GET` (например каждые 5 с, если WS молчит).

После F5 шаги 1–4 повторяются — UI восстанавливается без повторной загрузки файлов.

### 4.3. Создание сравнения

1. `POST /api/compare` с `credentials: 'include'`.
2. Ответ: `job_id`, `websocket_url`, метаданные.
3. `navigate` или `replaceState` на `/compare/{job_id}` (роутер React Router).
4. Подключить WS, обновлять прогресс.
5. По `result` — показать Summary + DiffList; данные уже на сервере, повторный `GET .../result` для идемпотентности.

Файлы в state React после ухода со страницы **не нужны** — только имена из API.

### 4.4. Роутинг (рекомендация)

| Путь | Экран |
|------|--------|
| `/` | Новое сравнение + краткая история |
| `/compare/:jobId` | Прогресс / результат конкретной задачи |
| `/history` | Полный список (опционально) |
| `/login`, `/register` | B2 |

### 4.5. Состояние в React

- **Context `SessionContext`:** `session`, `comparisons`, `refreshComparisons`, `activeJobId`.
- **Не хранить** `comparison` только в useState без синхронизации с сервером после получения result.
- Таймер WS: как сейчас, но при bootstrap можно показать `server_processing_duration` если бэкенд отдаёт `created_at` / `completed_at`.

### 4.6. Обработка ошибок

| Код | Действие UI |
|-----|-------------|
| 401 / нет сессии | повтор `GET /session/me` или редирект login (B2) |
| 403 на job | «Нет доступа», очистить `?job=` из URL |
| 404 на result | «Ещё обрабатывается» + WS/polling |
| 410 | «Результат удалён по сроку хранения» |

### 4.7. Сборка и деплой

- Production: `npm run build` → `dist/` на gateway (у вас уже заложено в `main.py`).
- Один домен → cookie работает без доп. настроек.
- Dev: Vite proxy + `credentials: 'include'`; gateway должен выставлять cookie с `SameSite=Lax` на `localhost` (без `Secure` в dev или HTTPS local).

### 4.8. B2 — учётная запись (фронт)

- Формы login/register.
- После логина: `POST /api/session/merge` (если была анонимная сессия).
- История с `GET /api/comparisons` уже по `user_id` на бэкенде.
- Logout: `POST /api/session/logout`, сброс контекста, редирект на `/`.

---

## 5. Сценарии после внедрения

### F5 на странице `/compare/{jobId}`

1. Cookie уходит с запросом.
2. Bootstrap загружает job и result с gateway.
3. WS переподключается при `processing`.
4. Файлы не выбираются заново.

### Новая вкладка, тот же браузер

Та же cookie → та же история и доступ к тем же `job_id` (если знает URL или выбирает из списка).

### Другой браузер / инкогнито

Новая анонимная сессия (B1) или login (B2).

### Deep link

`https://app.example.com/compare/uuid` — после проверки ownership показать результат или прогресс.

---

## 6. План внедрения (очередность работ)

### Фаза 1 — Gateway + БД (блокирующая)

1. PostgreSQL, модели, миграции.
2. Session middleware + `Set-Cookie`.
3. Запись job при `POST /api/compare`.
4. `GET /api/comparisons`, `GET /api/comparisons/{id}`, `GET .../result` с проверкой session.
5. WS: проверка ownership + запись result в БД из relay.

### Фаза 2 — Фронт

1. `credentials: 'include'` везде.
2. `SessionProvider` + bootstrap.
3. Роут `/compare/:jobId`.
4. Убрать зависимость от восстановления через только client state.

### Фаза 3 — Прод-hardening

1. CORS / один origin.
2. Rate limits, TTL, мониторинг.
3. Тесты: F5, чужой job_id → 403, истёкшая сессия.

### Фаза 4 — B2 Auth

1. Users, login, merge session.
2. UI аккаунта и истории по пользователю.

---

## 7. Чеклист готовности к продакшену

**Бэкенд**

- [ ] HttpOnly cookie, hash token в БД  
- [ ] Jobs привязаны к `session_id`  
- [ ] REST статус/результат на gateway с 403  
- [ ] WS с проверкой владельца  
- [ ] Result persisted при завершении  
- [ ] CORS/origin исправлены для credentials  
- [ ] `public_base_url` для WS в prod  

**Фронтенд**

- [ ] `credentials: 'include'`  
- [ ] Bootstrap session + comparisons на старте  
- [ ] URL с `jobId`, восстановление после F5  
- [ ] WS + polling fallback  
- [ ] Нет единственной копии результата только в memory  
- [ ] Сборка в `dist/` на том же хосте, что API  

---

## 8. Связь с текущим кодом (точки правки)

| Компонент | Файл / зона | Действие |
|-----------|-------------|----------|
| Gateway | `app/main.py` | middleware, новые routes, compare → DB |
| Gateway | `app/services/ws_relay.py` | обновление job status/result в БД |
| Gateway | `app/services/processing_client.py` | использовать в GET comparisons |
| Gateway | `app/config.py` | `session_ttl`, `cookie_name`, `database_url` |
| Processing | `main.py` | по желанию: internal-only, metadata |
| Front | `src/api/client.ts` | credentials, новые endpoints |
| Front | `src/App.tsx` | SessionProvider, bootstrap |
| Front | роутер | `/compare/:jobId` |

---

## 9. Что сознательно не делаем в B1

- Хранение исходных PDF/DOCX на gateway после Kafka (если не требует compliance).
- Восстановление выбранных файлов в `<input type="file">` после F5 (не нужно при серверной модели).
- JWT в localStorage как основная сессия (хуже для XSS, чем HttpOnly cookie).

---

При необходимости следующий шаг — отдельный `openapi` фрагмент для `/api/session/*` и `/api/comparisons/*` или задачи в backlog по фазам 1–2.
