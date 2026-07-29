# Демонстрация через Cloudflare Tunnel

Публичный доступ к фронту на порту **5173** без проброса портов на роутере.

## Требования

- Запущен **бэкенд** Chunking Service: `http://localhost:5000` (Kafka, Processing, Ollama)
- **cloudflared** — [установка](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)

  ```powershell
  winget install Cloudflare.cloudflared
  ```

  Если `cloudflared` не в PATH, укажите в `.env` или в сессии:

  ```powershell
  $env:CLOUDFLARED = "C:\Users\максим\Desktop\Qwen\.tools\cloudflared\cloudflared.exe"
  ```

## Запуск (2 терминала)

**Терминал 1 — фронт:**

```powershell
cd QwenFront
npm run dev
```

**Терминал 2 — туннель:**

```powershell
cd QwenFront
npm run tunnel
```

В выводе `cloudflared` появится строка вида:

```text
https://random-name.trycloudflare.com
```

Эту ссылку можно отправить для демо. Запросы `/api`, `/health` и WebSocket `/ws` проксируются Vite на локальный `:5000`.

## Важно

| Пункт | Описание |
|--------|----------|
| URL временный | После перезапуска `npm run tunnel` адрес меняется |
| ПК должен быть включён | Туннель работает, пока запущены dev и cloudflared |
| Бэкенд локальный | Без `:5000` сравнение не заработает |
| HTTPS | Cloudflare отдаёт HTTPS; фронт использует тот же origin для API и WS |
| Файрвол | Если туннель не подключается, скрипт использует `--protocol http2`. Разрешите исходящий трафик на порт **7844** (QUIC/TCP) или VPN/провайдер может блокировать Cloudflare Tunnel |

## Именованный туннель (постоянный домен)

См. `cloudflared.example.yml` и [документацию Cloudflare](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/).
