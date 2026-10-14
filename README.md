# Voxera

Voxera is a Meshy-like AI 3D creation web app: React + Vite frontend, FastAPI backend, and asynchronous remote AI 3D generation through Tencent Hunyuan3D.

## Features

- JWT authentication and user profiles
- Project CRUD, duplication, and bookmarks
- Remote Hunyuan3D text-to-3D and image-to-3D generation
- Background job tracking with progress polling
- GLB retrieval, Three.js/GLTF viewing, and authenticated downloads

## Architecture

- `frontend/`: React + Vite + TypeScript
- `backend/`: FastAPI + SQLAlchemy + Pydantic
- Provider: a remote Hunyuan3D HTTP API server (self-hosted on a GPU machine or another hosted service) implementing the documented `/send`, `/status/{uid}` and (optionally) `/generate` endpoints.
- The full Hunyuan3D model is **not** run on the developer laptop. The backend only calls the configured remote service.

## Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# edit .env
uvicorn app.main:app --reload
```

Required environment variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLAlchemy database URL |
| `SECRET_KEY` | JWT signing key; replace in production |
| `FRONTEND_ORIGIN` | Allowed frontend origin |
| `HUNYUAN3D_BASE_URL` | Base URL of the remote Hunyuan3D API server |
| `HUNYUAN3D_API_KEY` | Optional bearer/API key |
| `HUNYUAN3D_TIMEOUT_SECONDS` | Provider request timeout |
| `HUNYUAN3D_JOB_TIMEOUT_SECONDS` | Maximum async job wait time |
| `HUNYUAN3D_POLL_INTERVAL_SECONDS` | Polling interval |
| `HUNYUAN3D_MAX_IMAGE_BYTES` | Upload size limit |
| `HUNYUAN3D_MAX_CONCURRENT_JOBS` | Backend concurrency |
| `HUNYUAN3D_MAX_USER_ACTIVE_JOBS` | Per-user active job limit |
| `HUNYUAN3D_OUTPUT_DIR` | Where completed GLB files are cached |

## Frontend setup

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

`VITE_API_URL` should point at the FastAPI backend (default `http://localhost:8000`).

## Tencent Hunyuan3D provider

This app targets the documented Hunyuan3D API server interface:

- `POST /send` with JSON parameters such as `{"image": "<base64>"}` or `{"text": "<prompt>"}`, plus options such as `texture`, `type`, and `seed`. The server returns `{"uid": "..."}`.
- `GET /status/{uid}` returns a JSON object including `"status"` and `"model_base64"` when complete.
- `POST /generate` returns a model file directly and is not used for long-running jobs.

The open-source Hunyuan3D text path depends on a text-to-image pipeline that is disabled by default in Tencent's reference server. Keep `HUNYUAN3D_BASE_URL` empty and use the mock adapter in tests until a real request succeeds. The backend adapter supports additional hosted providers that return `model_url` / `output_url` instead of base64.

Security: never put Hunyuan3D credentials in frontend code. Configure them in backend environment variables only.

## API usage

Backend endpoints:

- `POST /generation/text-to-3d` body `{ "prompt": "...", "texture": false }`
- `POST /generation/image-to-3d` multipart form with `file`
- `GET /generation/{id}` job status
- `GET /generation/{id}/download` authenticated GLB download

Generation jobs are asynchronous. The initial request returns `202 Accepted` with a job ID; poll `GET /generation/{id}` for status.

## Tests

```bash
cd backend
.venv\Scripts\python.exe -m pytest
```

Tests mock the Hunyuan3D adapter and do not trigger paid or remote generation. Frontend currently has no test runner configured; add Vitest/RTL separately if needed.

## Deployment

- Deploy FastAPI and the static frontend to separate services/containers.
- Provide backend environment variables through the platform secret manager.
- Mount persistent storage for `HUNYUAN3D_OUTPUT_DIR` so generated GLB files survive restarts; otherwise provider URLs may be temporary.
- Point `HUNYUAN3D_BASE_URL` at a GPU host running the Hunyuan3D API server, or at a future official cloud API if Tencent exposes one.
- Keep model generation off the CPU-only web application server.

## Cost considerations

- Hunyuan3D generation is GPU-intensive and long-running; expect seconds to minutes per asset.
- Cache generated GLB files locally and only regenerate when needed.
- Enforce per-user active-job limits to reduce accidental spend.
- Validate image size/type before submission to avoid wasted GPU work.
- Hosted GPU providers usually bill by GPU-hour; use the smallest suitable GPU and autoscaling judiciously.