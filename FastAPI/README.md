## Crowd Detection & Disaster Management - FastAPI

This folder contains the FastAPI application for real-time crowd detection, heatmaps, anomaly alerts and WebSocket broadcasting. This README explains how to install dependencies, start the RTSP server (MediaMTX), push a webcam stream using ffmpeg, run the FastAPI server, and view the stream in VLC and the API in a browser.

## Overview

- FastAPI app entry: `main.py`
- Requirements: `requirements.txt`
- The app uses YOLOv8 (ultralytics) for person detection and provides WebSocket endpoints for live alerts and frames.

## Prerequisites

- Windows 10/11 (instructions use cmd.exe)
- Python 3.9+ (3.11 recommended)
- Git (optional)
- VLC media player (for viewing RTSP)
- FFmpeg (for publishing local camera to RTSP)
- MediaMTX (RTSP server; formerly rtsp-simple-server) or Docker
- (Optional) Docker and Docker Compose

If you plan to use GPU acceleration for PyTorch, install the correct CUDA-enabled torch wheel for your GPU following https://pytorch.org/get-started/locally/.

## 1) Setup Python environment and install dependencies

Open a cmd shell and run the following from the repository root or directly from the `FastAPI` folder.

Commands (Windows cmd.exe):

    cd FastAPI
    python -m venv .venv
    .venv\Scripts\activate
    python -m pip install --upgrade pip
    pip install -r requirements.txt

Notes:
- `requirements.txt` includes many packages (torch, ultralytics, opencv, etc.). Installing `torch` may require manual selection of the correct wheel for your platform (CPU vs CUDA). If `pip install -r requirements.txt` fails for `torch`, visit https://pytorch.org/get-started/locally/ and use the recommended command for your system.
- If installing large packages is slow, consider using a stable internet connection or a machine with more disk space.

## 2) Install FFmpeg (Windows)

Option A — Chocolatey (if you have Chocolatey installed):

    choco install ffmpeg -y

Option B — Manual download:

- Download a static build from https://www.gyan.dev/ffmpeg/builds/ or https://ffmpeg.org/
- Extract and add the `bin` folder to your PATH environment variable.
- Verify installation:

    ffmpeg -version

## 3) Install and start MediaMTX (RTSP server)

MediaMTX (formerly rtsp-simple-server) provides a local RTSP server to which you can publish streams (from ffmpeg) and then consume them (VLC, other clients).

Option A — Docker (quickest):

    docker run --rm -it -p 8554:8554 -p 8000:8000 aler9/rtsp-simple-server:latest

Notes:
- The image name historically used is `aler9/rtsp-simple-server` or `aler9/mediamtx`; both reference the same project — check Docker Hub for the latest tag. The RTSP server listens on port 8554 by default.

Option B — Native Windows binary:

- Download the MediaMTX/rtsp-simple-server binary for Windows from the releases page: https://github.com/aler9/mediamtx/releases
- Place `mediamtx.exe` in a folder, optionally create `mediamtx.yml` for custom configuration, then run:

    mediamtx.exe

By default MediaMTX will allow publishing and playing of streams on paths such as `/live`.

## 4) Publish your webcam to MediaMTX using FFmpeg

Start MediaMTX first (see step 3). Then run the ffmpeg command (replace the camera name if different):

Windows (cmd.exe) example (this is the exact command you provided):

    ffmpeg -f dshow -rtbufsize 200M -i video="USB2.0 HD UVC WebCam" -an -vf scale=1280:720 -r 15 -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp rtsp://127.0.0.1:8554/live

Notes and troubleshooting:
- If ffmpeg complains about the device name, list available DirectShow devices with:

    ffmpeg -list_devices true -f dshow -i dummy

- Replace `USB2.0 HD UVC WebCam` with the exact device name shown by the command above.
- If you prefer to stream a video file instead of a webcam, replace the `-f dshow -i ...` portion with `-re -i path\to\file.mp4`.

## 5) Run the FastAPI server

Make sure your virtual environment is activated (`.venv\Scripts\activate`) and run:

    cd FastAPI
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Alternative: there is a `start_backend.py` and `build-and-run.sh` included for other environments (Linux/docker). On Windows, `uvicorn` is the simplest.

When FastAPI starts it will load the YOLO model (this can take a little time). The API root is available at:

- http://localhost:8000/
- Health: http://localhost:8000/health

## 6) View the RTSP stream in VLC

Open VLC → Media → Open Network Stream and enter:

    rtsp://127.0.0.1:8554/live

Click Play. You should see the stream published by ffmpeg (the same stream that MediaMTX serves).

If you see buffering or delays:
- Ensure your firewall allows connections on port 8554
- Try reducing the ffmpeg buffering flags or increasing -rtbufsize

## 7) View API endpoints and WebSocket streams

- API root: `http://localhost:8000/` (lists endpoints and a testing ffmpeg example)
- WebSocket endpoints provided by the app:
  - `ws://localhost:8000/ws/alerts` — real-time alerts
  - `ws://localhost:8000/ws/frames/{camera_id}` — live frames (camera_id is the identifier used when starting the FrameProcessor in the API)
  - `ws://localhost:8000/ws/instructions` — emergency instructions
  - `ws://localhost:8000/ws/live-map` — live heatmap and zone updates

Quick WebSocket test in browser console (replace endpoint if needed):

    const ws = new WebSocket('ws://localhost:8000/ws/alerts');
    ws.onmessage = (e) => console.log('msg', e.data);
    ws.onopen = () => console.log('connected');

To receive frames, connect to `ws://localhost:8000/ws/frames/mycamera` (the app will only send frames if there is a frame processor running for that camera id).

## 8) Common issues & troubleshooting

- Torch installation errors: install CPU-only torch or the correct CUDA wheel from https://pytorch.org/get-started/locally/
- `ultralytics` will attempt to download `yolov8s.pt` if not present. To avoid repeated downloads, place `yolov8s.pt` in the `FastAPI` folder.
- Camera/device errors with FFmpeg on Windows: ensure device name is correct and camera is not used by another application.
- Firewall: open ports 8554 and 8000 if you run into connectivity issues.
- Permissions: run cmd as Administrator if camera access is denied.

## 9) Quick start (short checklist)

1. Start MediaMTX (RTSP server) on port 8554.
2. Run FFmpeg to publish your webcam (example command above).
3. Start the FastAPI app:

       .venv\Scripts\activate
       uvicorn main:app --host 0.0.0.0 --port 8000 --reload

4. Open VLC and connect to `rtsp://127.0.0.1:8554/live` to view the stream.
5. Open `http://localhost:8000/` to inspect API and WebSocket endpoints.

## 10) Advanced / Docker (optional)

- There is a `docker-compose.yml` and `Dockerfile` in the repository root and in this folder. If you prefer containerized setup, you can run the FastAPI app and MediaMTX in containers using Docker Compose. See `docker_readme.md` and the `docker-compose.yml` files for details.

## 11) Notes

- This application is designed for research and experimentation. If deploying to production, secure the RTSP server and API (authentication, TLS), paginate/debounce alerts, and set resource limits.
- The YOLO model initialization can be memory- and time-intensive. Allow a minute for first startup on CPU-only machines.

If you want, I can also:
- Add a small `mediamtx.yml` example configured for the `/live` path.
- Add a sample script to launch MediaMTX via Docker Compose on Windows.

---

If anything in this README should be adjusted for your environment (different camera name, Docker vs native, or GPU instructions), tell me which part to tailor and I will update it.
