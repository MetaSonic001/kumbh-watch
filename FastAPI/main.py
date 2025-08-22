#!/usr/bin/env python3
"""
FastAPI Crowd Detection and Disaster Management System
=====================================================

A real-time crowd monitoring system with anomaly detection, emergency alerts,
and WebSocket broadcasting capabilities.

Features:
- Real-time people counting using YOLOv8
- Crowd density heatmaps
- Anomaly detection (stampede, fire, fallen person)
- Emergency alert system
- WebSocket broadcasting
- RTSP stream processing
- Video file analysis

Installation Requirements:
pip install fastapi uvicorn websockets opencv-python ultralytics numpy scipy pillow python-multipart aiofiles

Usage:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

WebSocket Endpoints:
- ws://localhost:8000/ws/alerts - General alerts and notifications
- ws://localhost:8000/ws/frames/{camera_id} - Live frame updates
- ws://localhost:8000/ws/instructions - Emergency instructions

Test your RTSP stream:
ffmpeg -f dshow -rtbufsize 200M -i video="USB2.0 HD UVC WebCam" -an -vf scale=1280:720 -r 15 -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp rtsp://127.0.0.1:8554/live
"""

import asyncio
import base64
import cv2
import json
import numpy as np
import time
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple
from pathlib import Path
import threading
from collections import deque, defaultdict
from dataclasses import dataclass, asdict
import io

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Query, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

# AI/ML imports
try:
    from ultralytics import YOLO
    import torch
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.run(["pip", "install", "ultralytics", "torch", "torchvision"])
    from ultralytics import YOLO
    import torch

from scipy.ndimage import gaussian_filter
from scipy.spatial.distance import pdist, squareform

# Initialize FastAPI app
app = FastAPI(
    title="Crowd Detection & Disaster Management API",
    description="Real-time crowd monitoring with anomaly detection and emergency management",
    version="1.0.0"
)

# Global configuration
CONFIG = {
    "models": {
        "yolo_model": "yolov8s.pt",  # Will download automatically
        "confidence_threshold": 0.5,
        "iou_threshold": 0.45
    },
    "thresholds": {
        "default_people_threshold": 20,
        "high_density_threshold": 0.7,
        "critical_density_threshold": 0.9,
        "fallen_person_threshold": 0.3,  # Height/width ratio
        "stampede_movement_threshold": 50,  # pixels movement
        "fire_confidence_threshold": 0.6
    },
    "processing": {
        "frame_skip": 2,  # Process every 2nd frame for efficiency
        "heatmap_update_interval": 2.0,  # seconds
        "alert_debounce_time": 5.0,  # seconds
        "max_frame_queue": 30
    }
}

# Global state management
class GlobalState:
    def __init__(self):
        self.models = {}
        self.active_streams: Dict[str, dict] = {}
        self.websocket_connections: Dict[str, Set[WebSocket]] = {
            "alerts": set(),
            "frames": defaultdict(set),
            "instructions": set()
        }
        self.frame_processors: Dict[str, 'FrameProcessor'] = {}
        self.last_alerts: Dict[str, float] = {}
        self.camera_configs: Dict[str, dict] = {}

state = GlobalState()

# Data models
@dataclass
class PersonDetection:
    bbox: List[float]  # [x1, y1, x2, y2]
    confidence: float
    center: Tuple[float, float]
    area: float

@dataclass
class FrameAnalysis:
    frame_id: str
    timestamp: float
    people_count: int
    people_detections: List[PersonDetection]
    density_level: str
    anomalies: List[dict]
    heatmap_data: Optional[dict] = None

# Load AI models
async def load_models():
    """Load all required AI models"""
    try:
        # YOLOv8 for person detection
        print("Loading YOLOv8 model...")
        state.models['yolo'] = YOLO(CONFIG['models']['yolo_model'])
        
        # Warm up the model
        dummy_img = np.zeros((640, 640, 3), dtype=np.uint8)
        state.models['yolo'](dummy_img, verbose=False)
        
        print("✅ Models loaded successfully")
        
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        raise

class FrameProcessor:
    def __init__(self, camera_id: str, source: str, threshold: int = 20):
        self.camera_id = camera_id
        self.source = source
        self.threshold = threshold
        self.is_running = False
        self.frame_queue = deque(maxlen=CONFIG['processing']['max_frame_queue'])
        self.last_count = 0
        self.last_heatmap_update = 0
        self.movement_tracker = deque(maxlen=10)  # Track recent detections for anomaly detection
        self.processing_thread = None
        
    def start(self):
        """Start the frame processing in a separate thread"""
        if self.is_running:
            return
            
        self.is_running = True
        self.processing_thread = threading.Thread(target=self._process_stream, daemon=True)
        self.processing_thread.start()
        print(f"✅ Started processing for camera {self.camera_id}")
    
    def stop(self):
        """Stop the frame processing"""
        self.is_running = False
        if self.processing_thread:
            self.processing_thread.join(timeout=2.0)
        print(f"🛑 Stopped processing for camera {self.camera_id}")
    
    def _process_stream(self):
        """Main processing loop"""
        cap = None
        frame_count = 0
        
        try:
            # Initialize video capture
            if self.source.startswith('rtsp://') or self.source.startswith('http://'):
                cap = cv2.VideoCapture(self.source)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize buffer for real-time
            elif Path(self.source).exists():
                cap = cv2.VideoCapture(self.source)
            else:
                raise ValueError(f"Invalid source: {self.source}")
            
            if not cap.isOpened():
                raise ValueError(f"Cannot open source: {self.source}")
            
            # Set optimal parameters for real-time processing
            cap.set(cv2.CAP_PROP_FPS, 15)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            
            while self.is_running:
                ret, frame = cap.read()
                if not ret:
                    if self.source.startswith('rtsp://'):
                        # Try to reconnect for RTSP streams
                        time.sleep(1)
                        cap.release()
                        cap = cv2.VideoCapture(self.source)
                        continue
                    else:
                        # End of file for video files
                        break
                
                frame_count += 1
                
                # Skip frames for efficiency
                if frame_count % CONFIG['processing']['frame_skip'] != 0:
                    continue
                
                # Process frame
                try:
                    analysis = self._analyze_frame(frame, frame_count)
                    asyncio.run(self._handle_analysis(analysis, frame))
                    
                except Exception as e:
                    print(f"Error processing frame {frame_count}: {e}")
                    continue
                
                # Small delay to prevent overwhelming
                time.sleep(0.033)  # ~30 FPS max
                
        except Exception as e:
            print(f"Error in stream processing for {self.camera_id}: {e}")
        finally:
            if cap:
                cap.release()
    
    def _analyze_frame(self, frame: np.ndarray, frame_count: int) -> FrameAnalysis:
        """Analyze a single frame for people detection and anomalies"""
        current_time = time.time()
        
        # Run YOLO detection
        results = state.models['yolo'](
            frame,
            conf=CONFIG['models']['confidence_threshold'],
            iou=CONFIG['models']['iou_threshold'],
            classes=[0],  # Only detect persons
            verbose=False
        )
        
        # Extract person detections
        people_detections = []
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            confidences = results[0].boxes.conf.cpu().numpy()
            
            for box, conf in zip(boxes, confidences):
                x1, y1, x2, y2 = box
                center = ((x1 + x2) / 2, (y1 + y2) / 2)
                area = (x2 - x1) * (y2 - y1)
                
                people_detections.append(PersonDetection(
                    bbox=[float(x1), float(y1), float(x2), float(y2)],
                    confidence=float(conf),
                    center=center,
                    area=float(area)
                ))
        
        people_count = len(people_detections)
        
        # Determine density level
        density_level = self._calculate_density_level(people_count, people_detections, frame.shape)
        
        # Detect anomalies
        anomalies = self._detect_anomalies(people_detections, frame)
        
        # Generate heatmap data if needed
        heatmap_data = None
        if current_time - self.last_heatmap_update > CONFIG['processing']['heatmap_update_interval']:
            heatmap_data = self._generate_heatmap(people_detections, frame.shape)
            self.last_heatmap_update = current_time
        
        # Store for movement tracking
        self.movement_tracker.append({
            'timestamp': current_time,
            'detections': people_detections,
            'count': people_count
        })
        
        return FrameAnalysis(
            frame_id=f"{self.camera_id}_{frame_count}",
            timestamp=current_time,
            people_count=people_count,
            people_detections=people_detections,
            density_level=density_level,
            anomalies=anomalies,
            heatmap_data=heatmap_data
        )
    
    def _calculate_density_level(self, count: int, detections: List[PersonDetection], frame_shape: tuple) -> str:
        """Calculate crowd density level"""
        if count == 0:
            return "NONE"
        elif count < self.threshold * 0.5:
            return "LOW"
        elif count < self.threshold * 0.8:
            return "MEDIUM"
        elif count < self.threshold:
            return "HIGH"
        else:
            return "CRITICAL"
    
    def _detect_anomalies(self, detections: List[PersonDetection], frame: np.ndarray) -> List[dict]:
        """Detect various anomalies in the crowd"""
        anomalies = []
        
        # 1. Fallen person detection (based on aspect ratio)
        for detection in detections:
            x1, y1, x2, y2 = detection.bbox
            width = x2 - x1
            height = y2 - y1
            aspect_ratio = height / width if width > 0 else 0
            
            if aspect_ratio < CONFIG['thresholds']['fallen_person_threshold']:
                anomalies.append({
                    "type": "FALLEN_PERSON",
                    "severity": "HIGH",
                    "location": detection.center,
                    "confidence": detection.confidence,
                    "bbox": detection.bbox,
                    "message": "Possible fallen person detected"
                })
        
        # 2. Stampede detection (based on rapid movement)
        if len(self.movement_tracker) >= 3:
            current_detections = detections
            prev_detections = self.movement_tracker[-2]['detections'] if len(self.movement_tracker) >= 2 else []
            
            if len(current_detections) > 5 and len(prev_detections) > 5:
                # Calculate average movement
                movements = []
                for curr in current_detections:
                    min_dist = float('inf')
                    for prev in prev_detections:
                        dist = np.sqrt((curr.center[0] - prev.center[0])**2 + 
                                     (curr.center[1] - prev.center[1])**2)
                        min_dist = min(min_dist, dist)
                    if min_dist < float('inf'):
                        movements.append(min_dist)
                
                if movements and np.mean(movements) > CONFIG['thresholds']['stampede_movement_threshold']:
                    anomalies.append({
                        "type": "STAMPEDE",
                        "severity": "CRITICAL",
                        "location": [frame.shape[1]//2, frame.shape[0]//2],  # Center of frame
                        "confidence": 0.8,
                        "message": f"Possible stampede detected - avg movement: {np.mean(movements):.1f}px"
                    })
        
        # 3. High density clustering
        if len(detections) > 10:
            centers = np.array([d.center for d in detections])
            if len(centers) > 1:
                distances = pdist(centers)
                avg_distance = np.mean(distances)
                
                if avg_distance < 50:  # People very close together
                    anomalies.append({
                        "type": "HIGH_DENSITY_CLUSTER",
                        "severity": "MEDIUM",
                        "location": list(np.mean(centers, axis=0)),
                        "confidence": 0.7,
                        "message": f"High density cluster detected - {len(detections)} people in close proximity"
                    })
        
        return anomalies
    
    def _generate_heatmap(self, detections: List[PersonDetection], frame_shape: tuple) -> dict:
        """Generate heatmap data from person detections"""
        if not detections:
            return None
        
        height, width = frame_shape[:2]
        heatmap = np.zeros((height // 4, width // 4))  # Lower resolution for efficiency
        
        # Create heatmap from person centers
        for detection in detections:
            x, y = detection.center
            hx, hy = int(y // 4), int(x // 4)
            if 0 <= hx < heatmap.shape[0] and 0 <= hy < heatmap.shape[1]:
                heatmap[hx, hy] += 1
        
        # Apply gaussian filter for smooth heatmap
        heatmap_smooth = gaussian_filter(heatmap, sigma=2)
        
        # Find hotspots
        hotspots = []
        threshold = np.max(heatmap_smooth) * 0.5
        hotspot_locations = np.where(heatmap_smooth > threshold)
        
        for i in range(len(hotspot_locations[0])):
            hy, hx = hotspot_locations[0][i], hotspot_locations[1][i]
            intensity = heatmap_smooth[hy, hx]
            
            hotspots.append({
                "center_coordinates": [int(hx * 4), int(hy * 4)],
                "intensity": float(intensity),
                "people_in_area": int(heatmap[hy, hx]),
                "density_level": "CRITICAL" if intensity > np.max(heatmap_smooth) * 0.8 else "HIGH"
            })
        
        return {
            "hotspots": hotspots,
            "total_people": len(detections),
            "max_density": float(np.max(heatmap_smooth)),
            "heatmap_shape": list(heatmap.shape)
        }
    
    async def _handle_analysis(self, analysis: FrameAnalysis, frame: np.ndarray):
        """Handle the analysis results - send alerts and broadcast data"""
        current_time = time.time()
        
        # Check for threshold breach
        if analysis.people_count != self.last_count:
            # Send live count update
            count_update = {
                "type": "LIVE_COUNT_UPDATE",
                "timestamp": datetime.fromtimestamp(analysis.timestamp).isoformat() + "Z",
                "camera_id": self.camera_id,
                "current_count": analysis.people_count,
                "previous_count": self.last_count,
                "change": analysis.people_count - self.last_count,
                "density_level": analysis.density_level,
                "threshold": self.threshold,
                "threshold_status": "EXCEEDED" if analysis.people_count > self.threshold else "NORMAL"
            }
            
            await self._broadcast_to_websockets("alerts", count_update)
            
            # Check for threshold breach alert
            if analysis.people_count > self.threshold:
                alert_key = f"threshold_{self.camera_id}"
                if alert_key not in state.last_alerts or \
                   current_time - state.last_alerts[alert_key] > CONFIG['processing']['alert_debounce_time']:
                    
                    threshold_alert = {
                        "type": "THRESHOLD_BREACH",
                        "id": f"alert_{int(current_time * 1000)}_{uuid.uuid4().hex[:8]}",
                        "camera_id": self.camera_id,
                        "severity": "HIGH" if analysis.people_count > self.threshold * 1.2 else "MEDIUM",
                        "message": f"People count ({analysis.people_count}) exceeds threshold ({self.threshold})",
                        "people_count": analysis.people_count,
                        "threshold": self.threshold,
                        "density_level": analysis.density_level,
                        "timestamp": datetime.fromtimestamp(analysis.timestamp).isoformat() + "Z"
                    }
                    
                    await self._broadcast_to_websockets("alerts", threshold_alert)
                    state.last_alerts[alert_key] = current_time
            
            self.last_count = analysis.people_count
        
        # Send anomaly alerts
        for anomaly in analysis.anomalies:
            alert_key = f"anomaly_{anomaly['type']}_{self.camera_id}"
            if alert_key not in state.last_alerts or \
               current_time - state.last_alerts[alert_key] > CONFIG['processing']['alert_debounce_time']:
                
                anomaly_alert = {
                    "type": "ANOMALY_ALERT",
                    "id": f"alert_{int(current_time * 1000)}_{uuid.uuid4().hex[:8]}",
                    "camera_id": self.camera_id,
                    "anomaly_type": anomaly['type'],
                    "severity": anomaly['severity'],
                    "message": anomaly['message'],
                    "location": anomaly['location'],
                    "confidence": anomaly.get('confidence', 0.0),
                    "timestamp": datetime.fromtimestamp(analysis.timestamp).isoformat() + "Z"
                }
                
                await self._broadcast_to_websockets("alerts", anomaly_alert)
                state.last_alerts[alert_key] = current_time
        
        # Send heatmap data
        if analysis.heatmap_data:
            heatmap_alert = {
                "type": "HEATMAP_ALERT",
                "camera_id": self.camera_id,
                "severity": "HIGH" if analysis.people_count > self.threshold else "MEDIUM",
                "message": f"Crowd density heatmap update - {analysis.people_count} people detected",
                "heatmap_data": analysis.heatmap_data,
                "timestamp": datetime.fromtimestamp(analysis.timestamp).isoformat() + "Z"
            }
            
            await self._broadcast_to_websockets("alerts", heatmap_alert)
        
        # Send live frame if there are subscribers
        if self.camera_id in state.websocket_connections["frames"] and \
           len(state.websocket_connections["frames"][self.camera_id]) > 0:
            
            # Annotate frame with detections
            annotated_frame = self._annotate_frame(frame, analysis)
            
            # Encode frame to base64
            _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            frame_b64 = base64.b64encode(buffer).decode()
            
            live_frame = {
                "type": "LIVE_FRAME",
                "camera_id": self.camera_id,
                "frame": f"data:image/jpeg;base64,{frame_b64}",
                "people_count": analysis.people_count,
                "density_level": analysis.density_level,
                "timestamp": datetime.fromtimestamp(analysis.timestamp).isoformat() + "Z"
            }
            
            await self._broadcast_to_websockets("frames", live_frame, self.camera_id)
    
    def _annotate_frame(self, frame: np.ndarray, analysis: FrameAnalysis) -> np.ndarray:
        """Annotate frame with detection results"""
        annotated = frame.copy()
        
        # Draw person bounding boxes
        for detection in analysis.people_detections:
            x1, y1, x2, y2 = [int(x) for x in detection.bbox]
            
            # Color based on confidence
            color = (0, 255, 0) if detection.confidence > 0.7 else (0, 255, 255)
            
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            cv2.putText(annotated, f"{detection.confidence:.2f}", 
                       (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        # Draw anomaly indicators
        for anomaly in analysis.anomalies:
            x, y = [int(coord) for coord in anomaly['location']]
            
            if anomaly['type'] == 'FALLEN_PERSON':
                cv2.circle(annotated, (x, y), 30, (0, 0, 255), 3)
                cv2.putText(annotated, "FALLEN", (x - 30, y - 40), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            elif anomaly['type'] == 'STAMPEDE':
                cv2.putText(annotated, "STAMPEDE ALERT!", (50, 50), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
        
        # Draw info panel
        info_text = [
            f"People: {analysis.people_count}",
            f"Density: {analysis.density_level}",
            f"Threshold: {self.threshold}",
            f"Time: {datetime.fromtimestamp(analysis.timestamp).strftime('%H:%M:%S')}"
        ]
        
        for i, text in enumerate(info_text):
            cv2.putText(annotated, text, (10, 30 + i * 25), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.putText(annotated, text, (10, 30 + i * 25), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
        
        return annotated
    
    async def _broadcast_to_websockets(self, channel: str, message: dict, camera_id: str = None):
        """Broadcast message to WebSocket connections"""
        if channel == "frames" and camera_id:
            connections = state.websocket_connections["frames"][camera_id].copy()
        else:
            connections = state.websocket_connections[channel].copy()
        
        if not connections:
            return
        
        message_str = json.dumps(message)
        
        # Remove dead connections
        dead_connections = set()
        
        for websocket in connections:
            try:
                await websocket.send_text(message_str)
            except WebSocketDisconnect:
                dead_connections.add(websocket)
            except Exception as e:
                print(f"Error sending WebSocket message: {e}")
                dead_connections.add(websocket)
        
        # Clean up dead connections
        for dead_ws in dead_connections:
            if channel == "frames" and camera_id:
                state.websocket_connections["frames"][camera_id].discard(dead_ws)
            else:
                state.websocket_connections[channel].discard(dead_ws)

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize the application"""
    print("🚀 Starting Crowd Detection & Disaster Management API...")
    await load_models()
    print("✅ API ready for crowd monitoring!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("🛑 Shutting down...")
    
    # Stop all frame processors
    for processor in state.frame_processors.values():
        processor.stop()
    
    print("✅ Shutdown complete")

# WebSocket endpoints
@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """WebSocket endpoint for alerts and notifications"""
    await websocket.accept()
    state.websocket_connections["alerts"].add(websocket)
    
    try:
        # Send initial connection message
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to alerts stream",
            "timestamp": datetime.now().isoformat() + "Z"
        }))
        
        # Keep connection alive
        while True:
            try:
                # Send ping every 30 seconds
                await asyncio.sleep(30)
                await websocket.send_text(json.dumps({
                    "type": "PING",
                    "timestamp": datetime.now().isoformat() + "Z"
                }))
            except WebSocketDisconnect:
                break
    except WebSocketDisconnect:
        pass
    finally:
        state.websocket_connections["alerts"].discard(websocket)

@app.websocket("/ws/frames/{camera_id}")
async def websocket_frames(websocket: WebSocket, camera_id: str):
    """WebSocket endpoint for live frame updates"""
    await websocket.accept()
    state.websocket_connections["frames"][camera_id].add(websocket)
    
    try:
        # Send initial message
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": f"Connected to live frames for camera {camera_id}",
            "camera_id": camera_id,
            "timestamp": datetime.now().isoformat() + "Z"
        }))
        
        # Keep connection alive
        while True:
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({
                "type": "PING",
                "camera_id": camera_id,
                "timestamp": datetime.now().isoformat() + "Z"
            }))
    except WebSocketDisconnect:
        pass
    finally:
        state.websocket_connections["frames"][camera_id].discard(websocket)

@app.websocket("/ws/instructions")
async def websocket_instructions(websocket: WebSocket):
    """WebSocket endpoint for emergency instructions"""
    await websocket.accept()
    state.websocket_connections["instructions"].add(websocket)
    
    try:
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to emergency instructions stream",
            "timestamp": datetime.now().isoformat() + "Z"
        }))
        
        while True:
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({
                "type": "PING",
                "timestamp": datetime.now().isoformat() + "Z"
            }))
    except WebSocketDisconnect:
        pass
    finally:
        state.websocket_connections["instructions"].discard(websocket)

# API Routes
@app.get("/")
async def root():
    """API root with documentation"""
    return {
        "message": "Crowd Detection & Disaster Management API",
        "version": "1.0.0",
        "endpoints": {
            "start_rtsp_monitoring": "/monitor/rtsp",
            "process_video": "/process/video",
            "send_emergency": "/emergency",
            "send_instructions": "/instructions",
            "get_status": "/status",
            "websockets": {
                "alerts": "/ws/alerts",
                "frames": "/ws/frames/{camera_id}",
                "instructions": "/ws/instructions"
            }
        },
        "testing": {
            "rtsp_example": "ffmpeg -f dshow -rtbufsize 200M -i video=\"USB2.0 HD UVC WebCam\" -an -vf scale=1280:720 -r 15 -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp rtsp://127.0.0.1:8554/live",
            "websocket_test": "Connect to ws://localhost:8000/ws/alerts to receive real-time alerts"
        }
    }

@app.post("/monitor/rtsp")
async def start_rtsp_monitoring(
    camera_id: str = Query(..., description="Unique camera identifier"),
    rtsp_url: str = Query(..., description="RTSP stream URL"),
    threshold: int = Query(20, description="People count threshold for alerts")
):
    """Start monitoring an RTSP stream"""
    
    if camera_id in state.frame_processors:
        # Stop existing processor
        state.frame_processors[camera_id].stop()
        del state.frame_processors[camera_id]
    
    try:
        # Create and start new processor
        processor = FrameProcessor(camera_id, rtsp_url, threshold)
        processor.start()
        
        state.frame_processors[camera_id] = processor
        state.camera_configs[camera_id] = {
            "source": rtsp_url,
            "threshold": threshold,
            "started_at": datetime.now().isoformat(),
            "status": "active"
        }
        
        return {
            "status": "success",
            "message": f"Started monitoring camera {camera_id}",
            "camera_id": camera_id,
            "rtsp_url": rtsp_url,
            "threshold": threshold,
            "websocket_endpoints": {
                "alerts": f"/ws/alerts",
                "frames": f"/ws/frames/{camera_id}"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start monitoring: {str(e)}")

@app.post("/process/video")
async def process_video_file(
    camera_id: str = Query(..., description="Unique camera identifier for this video"),
    threshold: int = Query(20, description="People count threshold for alerts"),
    file: UploadFile = File(..., description="Video file to process")
):
    """Process an uploaded video file for crowd detection"""
    
    # Validate file type
    if not file.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="File must be a video")
    
    try:
        # Save uploaded file temporarily
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Stop existing processor if running
        if camera_id in state.frame_processors:
            state.frame_processors[camera_id].stop()
            del state.frame_processors[camera_id]
        
        # Create and start processor for video file
        processor = FrameProcessor(camera_id, temp_file_path, threshold)
        processor.start()
        
        state.frame_processors[camera_id] = processor
        state.camera_configs[camera_id] = {
            "source": f"video_file_{file.filename}",
            "threshold": threshold,
            "started_at": datetime.now().isoformat(),
            "status": "active",
            "file_name": file.filename
        }
        
        return {
            "status": "success",
            "message": f"Started processing video {file.filename}",
            "camera_id": camera_id,
            "threshold": threshold,
            "file_info": {
                "filename": file.filename,
                "size": len(content),
                "content_type": file.content_type
            },
            "websocket_endpoints": {
                "alerts": f"/ws/alerts",
                "frames": f"/ws/frames/{camera_id}"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process video: {str(e)}")

@app.post("/process/image")
async def process_single_image(
    file: UploadFile = File(..., description="Image file to analyze")
):
    """Process a single image for people counting"""
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read image
        content = await file.read()
        nparr = np.frombuffer(content, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Process with YOLO
        results = state.models['yolo'](
            frame,
            conf=CONFIG['models']['confidence_threshold'],
            iou=CONFIG['models']['iou_threshold'],
            classes=[0],  # Only detect persons
            verbose=False
        )
        
        # Extract detections
        people_detections = []
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            confidences = results[0].boxes.conf.cpu().numpy()
            
            for box, conf in zip(boxes, confidences):
                x1, y1, x2, y2 = box
                center = ((x1 + x2) / 2, (y1 + y2) / 2)
                
                people_detections.append({
                    "bbox": [float(x1), float(y1), float(x2), float(y2)],
                    "confidence": float(conf),
                    "center": center
                })
        
        # Annotate image
        annotated_frame = frame.copy()
        for detection in people_detections:
            x1, y1, x2, y2 = [int(x) for x in detection["bbox"]]
            conf = detection["confidence"]
            
            color = (0, 255, 0) if conf > 0.7 else (0, 255, 255)
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(annotated_frame, f"{conf:.2f}", 
                       (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        # Add count text
        cv2.putText(annotated_frame, f"People Count: {len(people_detections)}", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 3)
        cv2.putText(annotated_frame, f"People Count: {len(people_detections)}", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
        
        # Encode result
        _, buffer = cv2.imencode('.jpg', annotated_frame)
        annotated_b64 = base64.b64encode(buffer).decode()
        
        return {
            "status": "success",
            "people_count": len(people_detections),
            "detections": people_detections,
            "annotated_image": f"data:image/jpeg;base64,{annotated_b64}",
            "analysis": {
                "total_detections": len(people_detections),
                "high_confidence_count": len([d for d in people_detections if d["confidence"] > 0.7]),
                "average_confidence": np.mean([d["confidence"] for d in people_detections]) if people_detections else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

@app.post("/emergency")
async def send_emergency_alert(
    emergency_type: str = Query(..., description="Type of emergency (MEDICAL, FIRE, SECURITY, EVACUATION, OTHER)"),
    message: str = Query(..., description="Emergency message"),
    location: str = Query(..., description="Location description"),
    priority: str = Query("HIGH", description="Priority level (LOW, MEDIUM, HIGH, CRITICAL)"),
    camera_id: str = Query(None, description="Associated camera ID if applicable"),
    lat: float = Query(None, description="Latitude coordinate"),
    lng: float = Query(None, description="Longitude coordinate")
):
    """Send an emergency alert"""
    
    try:
        emergency_alert = {
            "type": "EMERGENCY_ALERT",
            "id": f"emergency_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}",
            "priority": priority,
            "emergency_type": emergency_type,
            "title": f"{emergency_type.title()} Emergency",
            "message": message,
            "location": {
                "description": location,
                "coordinates": {
                    "latitude": lat,
                    "longitude": lng
                } if lat is not None and lng is not None else None,
                "camera_id": camera_id
            },
            "timestamp": datetime.now().isoformat() + "Z",
            "status": "ACTIVE"
        }
        
        # Broadcast to all alert websockets
        for websocket in state.websocket_connections["alerts"].copy():
            try:
                await websocket.send_text(json.dumps(emergency_alert))
            except:
                state.websocket_connections["alerts"].discard(websocket)
        
        return {
            "status": "success",
            "message": "Emergency alert sent successfully",
            "alert_id": emergency_alert["id"],
            "alert": emergency_alert
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send emergency alert: {str(e)}")

@app.post("/instructions")
async def send_emergency_instructions(
    instructions: str = Query(..., description="Emergency instructions to broadcast"),
    priority: str = Query("HIGH", description="Priority level"),
    duration: int = Query(300, description="How long to keep showing instructions (seconds)")
):
    """Send emergency instructions to all connected clients"""
    
    try:
        instruction_message = {
            "type": "EMERGENCY_INSTRUCTIONS",
            "id": f"instruction_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}",
            "priority": priority,
            "instructions": instructions,
            "duration": duration,
            "timestamp": datetime.now().isoformat() + "Z"
        }
        
        # Broadcast to instruction websockets
        for websocket in state.websocket_connections["instructions"].copy():
            try:
                await websocket.send_text(json.dumps(instruction_message))
            except:
                state.websocket_connections["instructions"].discard(websocket)
        
        # Also send to alerts channel
        for websocket in state.websocket_connections["alerts"].copy():
            try:
                await websocket.send_text(json.dumps(instruction_message))
            except:
                state.websocket_connections["alerts"].discard(websocket)
        
        return {
            "status": "success",
            "message": "Instructions broadcast successfully",
            "instruction_id": instruction_message["id"],
            "recipients": {
                "instruction_subscribers": len(state.websocket_connections["instructions"]),
                "alert_subscribers": len(state.websocket_connections["alerts"])
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send instructions: {str(e)}")

@app.get("/status")
async def get_system_status():
    """Get current system status"""
    
    active_cameras = {}
    for camera_id, processor in state.frame_processors.items():
        config = state.camera_configs.get(camera_id, {})
        active_cameras[camera_id] = {
            "status": "active" if processor.is_running else "stopped",
            "source": config.get("source", "unknown"),
            "threshold": config.get("threshold", 0),
            "current_count": processor.last_count,
            "started_at": config.get("started_at"),
            "frame_queue_size": len(processor.frame_queue)
        }
    
    return {
        "status": "operational",
        "timestamp": datetime.now().isoformat() + "Z",
        "models_loaded": bool(state.models),
        "active_cameras": active_cameras,
        "websocket_connections": {
            "alerts": len(state.websocket_connections["alerts"]),
            "frames": {cam: len(conns) for cam, conns in state.websocket_connections["frames"].items()},
            "instructions": len(state.websocket_connections["instructions"])
        },
        "system_info": {
            "python_version": "3.x",
            "opencv_version": cv2.__version__,
            "torch_available": torch.cuda.is_available() if 'torch' in globals() else False
        }
    }

@app.post("/camera/{camera_id}/stop")
async def stop_camera_monitoring(camera_id: str):
    """Stop monitoring a specific camera"""
    
    if camera_id not in state.frame_processors:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")
    
    try:
        state.frame_processors[camera_id].stop()
        del state.frame_processors[camera_id]
        
        if camera_id in state.camera_configs:
            state.camera_configs[camera_id]["status"] = "stopped"
        
        return {
            "status": "success",
            "message": f"Stopped monitoring camera {camera_id}",
            "camera_id": camera_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop camera: {str(e)}")

@app.get("/camera/{camera_id}/config")
async def get_camera_config(camera_id: str):
    """Get configuration for a specific camera"""
    
    if camera_id not in state.camera_configs:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")
    
    config = state.camera_configs[camera_id].copy()
    
    if camera_id in state.frame_processors:
        processor = state.frame_processors[camera_id]
        config.update({
            "is_running": processor.is_running,
            "current_count": processor.last_count,
            "frame_queue_size": len(processor.frame_queue)
        })
    
    return config

@app.post("/camera/{camera_id}/threshold")
async def update_camera_threshold(
    camera_id: str,
    threshold: int = Query(..., description="New threshold value")
):
    """Update threshold for a specific camera"""
    
    if camera_id not in state.frame_processors:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")
    
    try:
        state.frame_processors[camera_id].threshold = threshold
        state.camera_configs[camera_id]["threshold"] = threshold
        
        return {
            "status": "success",
            "message": f"Updated threshold for camera {camera_id}",
            "camera_id": camera_id,
            "new_threshold": threshold
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update threshold: {str(e)}")

# Test page for WebSocket connections
@app.get("/test", response_class=HTMLResponse)
async def get_test_page():
    """Get test page for WebSocket connections"""
    
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Crowd Detection API Test</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f0f0f0; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
            .section { margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            button { padding: 8px 16px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .log { height: 200px; overflow-y: auto; background: #f8f9fa; padding: 10px; border: 1px solid #ddd; font-family: monospace; font-size: 12px; }
            input, select { padding: 5px; margin: 5px; border: 1px solid #ddd; border-radius: 3px; }
            .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
            .connected { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .disconnected { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            img { max-width: 100%; height: auto; border: 1px solid #ddd; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚨 Crowd Detection & Disaster Management API Test</h1>
            
            <div class="section">
                <h2>📡 WebSocket Connections</h2>
                <div>
                    <button onclick="connectAlerts()">Connect to Alerts</button>
                    <button onclick="connectFrames()">Connect to Frames</button>
                    <button onclick="connectInstructions()">Connect to Instructions</button>
                    <button onclick="disconnectAll()">Disconnect All</button>
                </div>
                <div id="connection-status" class="status disconnected">Not connected</div>
            </div>
            
            <div class="section">
                <h2>📹 Camera Control</h2>
                <div>
                    <input type="text" id="camera-id" placeholder="Camera ID (e.g., webcam_01)" value="test_camera">
                    <input type="text" id="rtsp-url" placeholder="RTSP URL" value="rtsp://127.0.0.1:8554/live">
                    <input type="number" id="threshold" placeholder="Threshold" value="20" min="1" max="100">
                    <button onclick="startRTSP()">Start RTSP Monitoring</button>
                    <button onclick="stopCamera()">Stop Camera</button>
                </div>
                <div>
                    <input type="file" id="video-file" accept="video/*">
                    <button onclick="uploadVideo()">Process Video</button>
                </div>
                <div>
                    <input type="file" id="image-file" accept="image/*">
                    <button onclick="uploadImage()">Analyze Image</button>
                </div>
            </div>
            
            <div class="section">
                <h2>🚨 Emergency Controls</h2>
                <div>
                    <select id="emergency-type">
                        <option value="MEDICAL">Medical</option>
                        <option value="FIRE">Fire</option>
                        <option value="SECURITY">Security</option>
                        <option value="EVACUATION">Evacuation</option>
                        <option value="OTHER">Other</option>
                    </select>
                    <input type="text" id="emergency-message" placeholder="Emergency message" value="Test emergency alert">
                    <input type="text" id="emergency-location" placeholder="Location" value="Test Location">
                    <button onclick="sendEmergency()">Send Emergency Alert</button>
                </div>
                <div>
                    <input type="text" id="instructions" placeholder="Emergency instructions" value="Please remain calm and follow exit signs">
                    <button onclick="sendInstructions()">Send Instructions</button>
                </div>
            </div>
            
            <div class="section">
                <h2>📊 System Status</h2>
                <button onclick="getStatus()">Get Status</button>
                <div id="status-display"></div>
            </div>
            
            <div class="section">
                <h2>🖼️ Live Feed</h2>
                <div id="live-frame">
                    <p>Connect to frames WebSocket to see live video</p>
                </div>
            </div>
            
            <div class="section">
                <h2>📝 Activity Log</h2>
                <button onclick="clearLog()">Clear Log</button>
                <div id="log" class="log"></div>
            </div>
        </div>

        <script>
            let alertsWs = null;
            let framesWs = null;
            let instructionsWs = null;
            
            function log(message) {
                const logDiv = document.getElementById('log');
                const timestamp = new Date().toLocaleTimeString();
                logDiv.innerHTML += `[${timestamp}] ${message}<br>`;
                logDiv.scrollTop = logDiv.scrollHeight;
            }
            
            function clearLog() {
                document.getElementById('log').innerHTML = '';
            }
            
            function updateConnectionStatus() {
                const status = document.getElementById('connection-status');
                const connected = alertsWs?.readyState === WebSocket.OPEN || 
                                framesWs?.readyState === WebSocket.OPEN || 
                                instructionsWs?.readyState === WebSocket.OPEN;
                
                status.className = connected ? 'status connected' : 'status disconnected';
                status.textContent = connected ? 'Connected to WebSocket(s)' : 'Not connected';
            }
            
            function connectAlerts() {
                if (alertsWs) alertsWs.close();
                alertsWs = new WebSocket('ws://localhost:8000/ws/alerts');
                
                alertsWs.onopen = () => {
                    log('✅ Connected to alerts WebSocket');
                    updateConnectionStatus();
                };
                
                alertsWs.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    log(`📢 Alert: ${data.type} - ${data.message || 'No message'}`);
                    if (data.type === 'LIVE_COUNT_UPDATE') {
                        log(`👥 People count: ${data.current_count} (change: ${data.change >= 0 ? '+' : ''}${data.change})`);
                    }
                };
                
                alertsWs.onclose = () => {
                    log('❌ Alerts WebSocket disconnected');
                    updateConnectionStatus();
                };
                
                alertsWs.onerror = (error) => {
                    log(`❌ Alerts WebSocket error: ${error}`);
                };
            }
            
            function connectFrames() {
                const cameraId = document.getElementById('camera-id').value || 'test_camera';
                if (framesWs) framesWs.close();
                framesWs = new WebSocket(`ws://localhost:8000/ws/frames/${cameraId}`);
                
                framesWs.onopen = () => {
                    log(`✅ Connected to frames WebSocket for camera ${cameraId}`);
                    updateConnectionStatus();
                };
                
                framesWs.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'LIVE_FRAME') {
                        const frameDiv = document.getElementById('live-frame');
                        frameDiv.innerHTML = `
                            <h4>Camera: ${data.camera_id} | People: ${data.people_count} | Density: ${data.density_level}</h4>
                            <img src="${data.frame}" alt="Live Frame">
                        `;
                        log(`📹 Frame update: ${data.people_count} people, ${data.density_level} density`);
                    } else {
                        log(`📹 Frame: ${data.type}`);
                    }
                };
                
                framesWs.onclose = () => {
                    log('❌ Frames WebSocket disconnected');
                    updateConnectionStatus();
                };
            }
            
            function connectInstructions() {
                if (instructionsWs) instructionsWs.close();
                instructionsWs = new WebSocket('ws://localhost:8000/ws/instructions');
                
                instructionsWs.onopen = () => {
                    log('✅ Connected to instructions WebSocket');
                    updateConnectionStatus();
                };
                
                instructionsWs.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    log(`📋 Instructions: ${data.instructions || data.type}`);
                };
                
                instructionsWs.onclose = () => {
                    log('❌ Instructions WebSocket disconnected');
                    updateConnectionStatus();
                };
            }
            
            function disconnectAll() {
                if (alertsWs) alertsWs.close();
                if (framesWs) framesWs.close();
                if (instructionsWs) instructionsWs.close();
                log('🔌 Disconnected all WebSockets');
                updateConnectionStatus();
            }
            
            async function startRTSP() {
                const cameraId = document.getElementById('camera-id').value;
                const rtspUrl = document.getElementById('rtsp-url').value;
                const threshold = document.getElementById('threshold').value;
                
                try {
                    const response = await fetch(`/monitor/rtsp?camera_id=${cameraId}&rtsp_url=${encodeURIComponent(rtspUrl)}&threshold=${threshold}`, {
                        method: 'POST'
                    });
                    const result = await response.json();
                    log(`📹 Started RTSP monitoring: ${result.message}`);
                } catch (error) {
                    log(`❌ Error starting RTSP: ${error}`);
                }
            }
            
            async function stopCamera() {
                const cameraId = document.getElementById('camera-id').value;
                try {
                    const response = await fetch(`/camera/${cameraId}/stop`, { method: 'POST' });
                    const result = await response.json();
                    log(`🛑 Stopped camera: ${result.message}`);
                } catch (error) {
                    log(`❌ Error stopping camera: ${error}`);
                }
            }
            
            async function uploadVideo() {
                const fileInput = document.getElementById('video-file');
                const cameraId = document.getElementById('camera-id').value;
                const threshold = document.getElementById('threshold').value;
                
                if (!fileInput.files[0]) {
                    log('❌ Please select a video file');
                    return;
                }
                
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                
                try {
                    const response = await fetch(`/process/video?camera_id=${cameraId}&threshold=${threshold}`, {
                        method: 'POST',
                        body: formData
                    });
                    const result = await response.json();
                    log(`📹 Video processing started: ${result.message}`);
                } catch (error) {
                    log(`❌ Error uploading video: ${error}`);
                }
            }
            
            async function uploadImage() {
                const fileInput = document.getElementById('image-file');
                
                if (!fileInput.files[0]) {
                    log('❌ Please select an image file');
                    return;
                }
                
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                
                try {
                    const response = await fetch('/process/image', {
                        method: 'POST',
                        body: formData
                    });
                    const result = await response.json();
                    log(`📷 Image analysis: ${result.people_count} people detected`);
                    
                    // Show result image
                    const frameDiv = document.getElementById('live-frame');
                    frameDiv.innerHTML = `
                        <h4>Image Analysis Result: ${result.people_count} people detected</h4>
                        <img src="${result.annotated_image}" alt="Analyzed Image">
                    `;
                } catch (error) {
                    log(`❌ Error analyzing image: ${error}`);
                }
            }
            
            async function sendEmergency() {
                const type = document.getElementById('emergency-type').value;
                const message = document.getElementById('emergency-message').value;
                const location = document.getElementById('emergency-location').value;
                
                try {
                    const response = await fetch(`/emergency?emergency_type=${type}&message=${encodeURIComponent(message)}&location=${encodeURIComponent(location)}&priority=HIGH`, {
                        method: 'POST'
                    });
                    const result = await response.json();
                    log(`🚨 Emergency alert sent: ${result.message}`);
                } catch (error) {
                    log(`❌ Error sending emergency: ${error}`);
                }
            }
            
            async function sendInstructions() {
                const instructions = document.getElementById('instructions').value;
                
                try {
                    const response = await fetch(`/instructions?instructions=${encodeURIComponent(instructions)}&priority=HIGH`, {
                        method: 'POST'
                    });
                    const result = await response.json();
                    log(`📋 Instructions sent: ${result.message}`);
                } catch (error) {
                    log(`❌ Error sending instructions: ${error}`);
                }
            }
            
            async function getStatus() {
                try {
                    const response = await fetch('/status');
                    const result = await response.json();
                    
                    document.getElementById('status-display').innerHTML = `
                        <pre>${JSON.stringify(result, null, 2)}</pre>
                    `;
                    log(`📊 System status retrieved`);
                } catch (error) {
                    log(`❌ Error getting status: ${error}`);
                }
            }
            
            // Initialize
            log('🚀 Test page loaded. Connect to WebSockets to start receiving data.');
        </script>
    </body>
    </html>
    """
    return html_content

# Main execution
if __name__ == "__main__":
    print("🚀 Starting Crowd Detection & Disaster Management API...")
    print("\n📚 API Documentation:")
    print("=" * 60)
    print("🌐 Main API: http://localhost:8000")
    print("🧪 Test Page: http://localhost:8000/test")
    print("📖 Docs: http://localhost:8000/docs")
    print("\n📡 WebSocket Endpoints:")
    print("   • Alerts: ws://localhost:8000/ws/alerts")
    print("   • Frames: ws://localhost:8000/ws/frames/{camera_id}")
    print("   • Instructions: ws://localhost:8000/ws/instructions")
    print("\n🎯 API Endpoints:")
    print("   • POST /monitor/rtsp - Start RTSP monitoring")
    print("   • POST /process/video - Process video file")
    print("   • POST /process/image - Analyze single image")
    print("   • POST /emergency - Send emergency alert")
    print("   • POST /instructions - Broadcast instructions")
    print("   • GET /status - System status")
    print("   • POST /camera/{id}/stop - Stop camera")
    print("   • GET /camera/{id}/config - Get camera config")
    print("   • POST /camera/{id}/threshold - Update threshold")
    print("\n🧪 Testing Guide:")
    print("=" * 60)
    print("1. Start your RTSP stream:")
    print("   ffmpeg -f dshow -rtbufsize 200M -i video=\"USB2.0 HD UVC WebCam\" \\")
    print("          -an -vf scale=1280:720 -r 15 -c:v libx264 -preset ultrafast \\")
    print("          -tune zerolatency -f rtsp rtsp://127.0.0.1:8554/live")
    print("\n2. Open test page: http://localhost:8000/test")
    print("\n3. Connect to WebSockets and start monitoring")
    print("\n4. Upload test images/videos or use RTSP stream")
    print("\n🔧 Features Implemented:")
    print("   ✅ Real-time people counting with YOLOv8")
    print("   ✅ Crowd density heatmaps")
    print("   ✅ Anomaly detection (fallen person, stampede, clusters)")
    print("   ✅ Threshold-based alerts")
    print("   ✅ Emergency alert system")
    print("   ✅ WebSocket broadcasting")
    print("   ✅ RTSP stream processing")
    print("   ✅ Video file analysis")
    print("   ✅ Single image analysis")
    print("   ✅ Efficient frame processing")
    print("   ✅ Interactive test interface")
    print("\n" + "=" * 60)
    
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )