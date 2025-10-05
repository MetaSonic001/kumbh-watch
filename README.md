# Kumbh Watch — Crowd Detection & Emergency Response

This repository contains the full Kumbh Watch system: a React frontend, a FastAPI-based crowd-detection backend using YOLOv8, and an emergency voice/alert service. It includes utilities for RTSP streaming, WebSocket broadcasting, and optional Docker deployment.

This README is a single place to understand the repository structure, prerequisites, how to run each component (locally and with Docker), how to publish a webcam stream using FFmpeg into MediaMTX, and how to view results (VLC + WebSockets).

## Table of contents

- Overview & architecture
- Repository layout (important files)
- Prerequisites
- Quick start (recommended order)
- Backend (FastAPI) — setup & run
- Emergency voice agent — setup & run
- Frontend (React / Vite) — setup & run
- RTSP server (MediaMTX) & publishing with FFmpeg (exact command)
- Docker / Docker Compose notes
- Environment variables and configuration
- WebSocket & API endpoints
- Troubleshooting and tips
- Contributing

## Overview & architecture

High level:

- Frontend (React + Vite) — UI for dashboards, maps, alerts and camera controls. Connects to backend via REST and WebSockets.
- Backend (FastAPI) — real-time processing: RTSP ingest, YOLOv8 person detection, heatmap generation, anomaly detection, and WebSocket broadcasting. Entry point: `FastAPI/main.py`.
- Emergency service (FastAPI) — voice agent + emergency flow, ChromaDB knowledge base, Twilio integrations. Entry point: `emergency/main.py`.
- RTSP server (MediaMTX / rtsp-simple-server) — local RTSP relay to receive streams from FFmpeg and serve them to clients (VLC, OpenCV, etc.).

Design note: The backend performs heavy CV/ML work (PyTorch/Ultralytics); allow time for model loading and ensure sufficient CPU/GPU resources.

## Repository layout (key files)

- `FastAPI/` — Crowd detection backend
	- `main.py` — API and stream processing logic
	- `requirements.txt` — Python dependencies for backend
	- `Dockerfile`, `docker-compose.yml`, `start_backend.py`, `README.md` — container and startup helpers
	- `yolov8s.pt` — (optional) YOLOv8 model file
- `emergency/` — Emergency voice agent & Twilio handlers
	- `main.py` — emergency API and voice endpoints
	- `requirements.txt`, `kumbh_mela_chroma_db/` — Chromadb DB files
- `src/` — React frontend (Vite + TypeScript)
	- `src/config.ts` — API and WS URLs + Mapbox token
	- `src/pages/`, `src/components/` — UI components (LiveMap, CCTVPanel, AlertsPanel)
- `public/` — static assets
- `STARTUP_GUIDE.md`, `INTEGRATION_GUIDE.md`, `HEATMAP_SYSTEM_README.md` — additional docs

## Prerequisites

- Python 3.9+ (3.11 recommended) for backend and emergency services
- Node.js (16+/18+) and npm for frontend
- Docker (optional) if you prefer containerized deployment
- FFmpeg (for publishing webcam to RTSP)
- VLC (optional, for viewing RTSP streams)
- (Optional) GPU + appropriate PyTorch wheel for acceleration

On Windows, use cmd.exe (this README includes commands tailored for cmd). For Linux/macOS use equivalent shell syntax.

## Quick start (recommended order)

1. Start MediaMTX (RTSP server) — see RTSP section below
2. Publish your webcam or a video using FFmpeg to MediaMTX (command below)
3. Start the backend (FastAPI) so it can connect to RTSP sources and process frames
4. Start the frontend (Vite) to view UI and WebSocket-driven dashboards

## Backend (FastAPI) — setup & run

Path: `FastAPI/`

1) Create and activate a Python virtual environment (Windows cmd):

```cmd
cd FastAPI
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

2) Start the backend (development):

```cmd
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Or use the helper script:

```cmd
python start_backend.py
```

Notes:
- First startup will load the YOLO model (can take time) and may download `yolov8s.pt` if not present. There is a `yolov8s.pt` in the `FastAPI/` folder in this repo — keeping it there avoids re-downloads.
- If `pip install -r requirements.txt` fails on `torch`, install an appropriate wheel from https://pytorch.org/get-started/locally/.

Health & API:
- API root: http://localhost:8000/
- Health: http://localhost:8000/health

## Emergency service (voice agent) — setup & run

Path: `emergency/`

1) Create and activate a venv (separate from backend):

```cmd
cd emergency
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2) Run the emergency service (development):

```cmd
uvicorn main:app --host 0.0.0.0 --port 8100 --reload
```

Notes:
- The emergency service uses ChromaDB in `kumbh_mela_chroma_db/` for the knowledge base.
- Twilio credentials and other env vars are loaded from `emergency/.env`. Check that file and `DASHBOARD_WEBHOOK_URL` if you integrate with external dashboards.

## Frontend (React + Vite) — setup & run

1) Install dependencies and start dev server:

```cmd
cd src
npm install
npm run dev
```

2) Configuration
- API URL and WebSocket URL are in `src/config.ts`:

```ts
export const API_URL = 'http://localhost:8000';
export const WS_URL = 'ws://localhost:8000';
export const MAPBOX_ACCESS_TOKEN = 'YOUR_MAPBOX_TOKEN';
```

Replace `MAPBOX_ACCESS_TOKEN` with your Mapbox token if you want map features.

Open the frontend URL printed by Vite (typically http://localhost:5173) and go to the Dashboard.

## RTSP server (MediaMTX) and publishing with FFmpeg

We recommend using MediaMTX (formerly `rtsp-simple-server`) as a local RTSP relay.

Start MediaMTX first (Docker quick-start):

```cmd
docker run --rm -it -p 8554:8554 -p 8000:8000 aler9/rtsp-simple-server:latest
```

Or download `mediamtx.exe` from the releases page and run it natively.

Publish your webcam to MediaMTX with FFmpeg — exact Windows (cmd.exe) command (replace device name if needed):

```cmd
ffmpeg -f dshow -rtbufsize 200M -i video="USB2.0 HD UVC WebCam" -an -vf scale=1280:720 -r 15 -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp rtsp://127.0.0.1:8554/live
```

If ffmpeg complains about the device name, list DirectShow devices:

```cmd
ffmpeg -list_devices true -f dshow -i dummy
```

View the resulting stream in VLC: Open Network Stream → `rtsp://127.0.0.1:8554/live`

Important: start MediaMTX before running the ffmpeg command. MediaMTX exposes the stream on port 8554.

## WebSocket & REST endpoints (important)

Common WebSocket endpoints the frontend uses (FastAPI):

- `ws://localhost:8000/ws/alerts` — real-time alerts and notifications
- `ws://localhost:8000/ws/frames/{camera_id}` — live annotated frames (base64 JPEG)
- `ws://localhost:8000/ws/instructions` — emergency instructions
- `ws://localhost:8000/ws/live-map` — zone/heatmap updates

Selected REST endpoints (see `FastAPI/main.py`):

- `GET /` — API root and quick testing info
- `GET /health` — health check
- `POST /monitor/rtsp` — start monitoring an RTSP camera (body: camera_id, rtsp_url, threshold)
- `POST /process/video` — upload/process a video file
- `POST /emergency` — send emergency alert (also handled by `emergency/` service)

## Docker & Docker Compose

There are Docker artifacts for the backend in `FastAPI/`:

- `FastAPI/Dockerfile` — production-ready image (installs system deps and Python packages, downloads YOLO model).
- `FastAPI/docker-compose.yml` — example Compose service for the backend (exposes port 8000).

To build and run the FastAPI container (from `FastAPI/`):

```cmd
cd FastAPI
docker build -t kumbh-backend:latest .
docker run --rm -it -p 8000:8000 -v %cd%/uploads:/app/uploads -v %cd%/models:/app/models kumbh-backend:latest
```

Or use the included `docker-compose.yml` in `FastAPI/`:

```cmd
cd FastAPI
docker compose up --build
```

Notes:
- The Dockerfile installs many system packages needed by OpenCV and video libraries. Building the image may take some time and disk space.
- If running on GPU-enabled hosts, adapt the Dockerfile and base image to use CUDA-enabled PyTorch images.

## Environment variables and configuration

- Frontend: `src/config.ts` (API_URL, WS_URL, MAPBOX_ACCESS_TOKEN)
- Backend: set environment variables as needed (none strictly required; model will auto-download unless `yolov8s.pt` exists)
- Emergency service: `emergency/.env` (Twilio creds, DASHBOARD_WEBHOOK_URL, GROQ_API_KEY, etc.)

## Troubleshooting & tips

- YOLO model loading is slow on CPU — expect a minute on first run.
- If `pip install -r requirements.txt` fails for `torch`, pick a wheel from https://pytorch.org/get-started/locally/.
- Camera access errors on Windows: close other apps using the camera, run cmd as Administrator, and verify device name via `ffmpeg -list_devices true -f dshow -i dummy`.
- WebSocket connections: ensure `WS_URL` in `src/config.ts` points to your backend and that CORS is allowed.
- Port conflicts: default backend port is 8000, Emergency service uses 8100 by convention — change via uvicorn flags if needed.

## Tests & validation

- Backend health: `curl http://localhost:8000/health`
- WebSocket smoke test (node / browser): connect to `ws://localhost:8000/ws/alerts` and inspect incoming messages.

## Contribution & next steps

- If you'd like, I can add:
	- a sample `mediamtx.yml` for MediaMTX with `/live` path
	- a small PowerShell/CMD helper script to start MediaMTX (Docker or native), run the FFmpeg publisher, then start the backend
	- a Docker Compose that runs MediaMTX + backend + a simple static web client for end-to-end testing

To contribute, open issues or PRs. Keep PRs small and focused (docs, tests, single feature at a time).

## License

This repository doesn't include an explicit license file. Add a LICENSE if you plan to open-source with a specific license.

---

If you want I can now:

- Add a `mediamtx.yml` example and a small `run-all.ps1` / `run-all.cmd` helper to start MediaMTX + ffmpeg + backend.
- Create a minimal `docker-compose.yml` in the repo root that wires MediaMTX + backend + a static frontend for one-command start.

Tell me which of those you'd like me to add next and I'll implement it.
