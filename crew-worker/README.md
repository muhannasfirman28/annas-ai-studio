# Crew Worker (OpenCode)

Worker Fly.io yang menjalankan delapan karyawan Annas AI Studio sebagai **subagent OpenCode** secara berurutan. Studio tetap menjadi source of truth untuk file, task, catatan, status, dan audit trail di Neon Postgres.

## Alur

1. Studio menerima **Setujui & Jalankan** dan mengirim `POST /runs/{runId}/start` ke worker (async).
2. Worker mengambil snapshot file proyek dari `GET /api/internal/crew/runs/{runId}/files`.
3. Worker membuat satu session OpenCode dengan agent `crew-coordinator` di workspace sementara.
4. Untuk setiap step, coordinator memanggil tepat satu subagent (`@annas` … `@wei`).
5. File yang berubah di-commit balik ke Studio via `POST /api/internal/crew/runs/{runId}/files` (memakai guardrail path Studio).
6. Worker mengirim callback `step` dan `complete` ke `/api/internal/crew/runs/{runId}/callback`.
7. Studio menfinalisasi task, catatan, file, `CrewRunStep`, dan status run.

## Environment

| Variable | Fungsi |
| --- | --- |
| `NVIDIA_API_KEY` | Kredensial NVIDIA. Hanya ada di worker. |
| `CREW_WORKER_TOKEN` | Bearer token Studio → Worker. |
| `CREW_CALLBACK_TOKEN` | Bearer token Worker → Studio. |
| `STUDIO_CALLBACK_URL` | Base URL internal Studio, mis. `https://annas-ai-studio.vercel.app/api/internal/crew/runs`. |
| `OPENCODE_SERVER_PASSWORD` | Password server OpenCode di dalam container. |
| `OPENCODE_SERVICE_PASSWORD` | Password yang dipakai worker untuk memanggil server OpenCode (nilainya sama). |
| `OPENCODE_PROVIDER_ID` / `OPENCODE_MODEL_ID` | Provider/model OpenCode (default `nvidia` / `minimaxai/minimax-m3.1-flash`). |

Di sisi Studio: `CREW_ENGINE=opencode`, `CREW_WORKER_URL`, `CREW_WORKER_TOKEN`, `CREW_CALLBACK_TOKEN`.

## Deploy

```bash
flyctl apps create annas-crew-worker --org personal
flyctl secrets set NVIDIA_API_KEY=... CREW_WORKER_TOKEN=... CREW_CALLBACK_TOKEN=... \
  STUDIO_CALLBACK_URL=... OPENCODE_SERVER_PASSWORD=... OPENCODE_SERVICE_PASSWORD=...
flyctl deploy --remote-only
flyctl scale count 1 --yes
```

Satu machine sengaja dipakai karena worker mengizinkan satu run aktif pada satu waktu.

## Verifikasi

- `GET https://annas-crew-worker.fly.dev/health` → `opencodeOk: true`.
- `GET /api/agent/annas` (Basic auth `opencode:<OPENCODE_SERVER_PASSWORD>`) → agent dengan `mode: subagent`.
- `node --test server.test.mjs` → guardrail path dan ekstraksi note.

## Rollback

Set environment variable Studio `CREW_ENGINE=direct`. Approve akan memakai jalur lama (panggilan LLM langsung) tanpa mengubah worker.
