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
from fastapi.middleware.cors import CORSMiddleware
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

# Add CORS middleware to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
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
        # New: Zone and team management
        self.zones: Dict[str, dict] = {}
        self.teams: Dict[str, dict] = {}
        # New: Crowd flow data storage
        self.crowd_flow_data: Dict[str, dict] = {}
        # New: Re-routing suggestions cache
        self.re_routing_cache: Dict[str, dict] = {}
        # New: Alert deduplication with content hashing
        self.alert_content_hash: Dict[str, str] = {}
        self.alert_last_sent: Dict[str, float] = {}

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
    def __init__(self, camera_id: str, source: str, threshold: int = 20, zone_id: str = None):
        self.camera_id = camera_id
        self.source = source
        self.threshold = threshold
        self.zone_id = zone_id
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
        
        # Update zone crowd flow data if camera is associated with a zone
        if self.zone_id and self.zone_id in state.crowd_flow_data:
            zone_data = state.crowd_flow_data[self.zone_id]
            zone_data["people_count"] = analysis.people_count
            zone_data["current_occupancy"] = analysis.people_count
            zone_data["occupancy_percentage"] = (analysis.people_count / zone_data["capacity"]) * 100
            zone_data["density_level"] = analysis.density_level
            zone_data["last_update"] = datetime.fromtimestamp(analysis.timestamp).isoformat() + "Z"
            
            # Determine trend based on previous count
            if hasattr(self, 'last_zone_count'):
                if analysis.people_count > self.last_zone_count:
                    zone_data["trend"] = "increasing"
                elif analysis.people_count < self.last_zone_count:
                    zone_data["trend"] = "decreasing"
                else:
                    zone_data["trend"] = "stable"
            self.last_zone_count = analysis.people_count
        
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
            
            # Use improved alert deduplication for live count updates
            content_hash = _create_content_hash(count_update)
            if _should_send_alert("LIVE_COUNT_UPDATE", self.camera_id, content_hash, 2.0):  # 2 second debounce for live updates
                await self._broadcast_to_websockets("alerts", count_update)
            
            # Check for threshold breach alert
            if analysis.people_count > self.threshold:
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
                
                # Use improved alert deduplication for threshold breaches
                content_hash = _create_content_hash(threshold_alert)
                if _should_send_alert("THRESHOLD_BREACH", self.camera_id, content_hash, 10.0):  # 10 second debounce for threshold alerts
                    await self._broadcast_to_websockets("alerts", threshold_alert)
            
            self.last_count = analysis.people_count
        
        # Send anomaly alerts with improved deduplication
        for anomaly in analysis.anomalies:
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
            
            # Use improved alert deduplication for anomalies
            content_hash = _create_content_hash(anomaly_alert)
            if _should_send_alert("ANOMALY_ALERT", self.camera_id, content_hash, 15.0):  # 15 second debounce for anomalies
                await self._broadcast_to_websockets("alerts", anomaly_alert)
        
        # Send heatmap data with improved deduplication
        if analysis.heatmap_data:
            heatmap_alert = {
                "type": "HEATMAP_ALERT",
                "camera_id": self.camera_id,
                "severity": "HIGH" if analysis.people_count > self.threshold else "MEDIUM",
                "message": f"Crowd density heatmap update - {analysis.people_count} people detected",
                "heatmap_data": analysis.heatmap_data,
                "timestamp": datetime.fromtimestamp(analysis.timestamp).isoformat() + "Z"
            }
            
            # Use improved alert deduplication for heatmaps
            content_hash = _create_content_hash(heatmap_alert)
            if _should_send_alert("HEATMAP_ALERT", self.camera_id, content_hash, 5.0):  # 5 second debounce for heatmaps
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
    
    # Initialize sample zones for testing
    sample_zones = [
        {
            "id": "zone_ghat_01",
            "name": "Main Sacred Ghat",
            "type": "ghat",
            "coordinates": {"lng": 78.9629, "lat": 27.1767},
            "capacity": 1000,
            "description": "Primary religious bathing area",
            "current_occupancy": 0,
            "status": "active",
            "created_at": datetime.now().isoformat() + "Z"
        },
        {
            "id": "zone_gate_01",
            "name": "North Entry Gate",
            "type": "gate",
            "coordinates": {"lng": 78.9630, "lat": 27.1768},
            "capacity": 500,
            "description": "Main northern entrance",
            "current_occupancy": 0,
            "status": "active",
            "created_at": datetime.now().isoformat() + "Z"
        },
        {
            "id": "zone_camp_01",
            "name": "Pilgrim Camp A",
            "type": "camp",
            "coordinates": {"lng": 78.9628, "lat": 27.1766},
            "capacity": 2000,
            "description": "Accommodation for pilgrims",
            "current_occupancy": 0,
            "status": "active",
            "created_at": datetime.now().isoformat() + "Z"
        }
    ]
    
    for zone in sample_zones:
        state.zones[zone["id"]] = zone
        # Initialize crowd flow data
        state.crowd_flow_data[zone["id"]] = {
            "zone_id": zone["id"],
            "zone_name": zone["name"],
            "current_occupancy": 0,
            "capacity": zone["capacity"],
            "occupancy_percentage": 0.0,
            "people_count": 0,
            "density_level": "LOW",
            "trend": "stable",
            "last_update": datetime.now().isoformat() + "Z"
        }
    
    # Initialize sample teams for testing
    sample_teams = [
        {
            "id": "team_security_01",
            "name": "Security Team Alpha",
            "role": "security",
            "zone_id": "zone_gate_01",
            "contact": "+91-98765-43210",
            "status": "active",
            "created_at": datetime.now().isoformat() + "Z"
        },
        {
            "id": "team_medical_01",
            "name": "Medical Team Bravo",
            "role": "medical",
            "zone_id": "zone_ghat_01",
            "contact": "+91-98765-43211",
            "status": "active",
            "created_at": datetime.now().isoformat() + "Z"
        }
    ]
    
    for team in sample_teams:
        state.teams[team["id"]] = team
    
    print("✅ Sample zones and teams initialized")
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
            "zones": {
                "create": "POST /zones",
                "get_all": "GET /zones",
                "get_one": "GET /zones/{zone_id}",
                "update": "PUT /zones/{zone_id}",
                "delete": "DELETE /zones/{zone_id}"
            },
            "teams": {
                "create": "POST /teams",
                "get_all": "GET /teams",
                "get_one": "GET /teams/{team_id}",
                "update": "PUT /teams/{team_id}",
                "delete": "DELETE /teams/{team_id}"
            },
            "cameras": {
                "start_rtsp": "POST /monitor/rtsp",
                "process_video": "POST /process/video",
                "get_all": "GET /cameras",
                "get_config": "GET /camera/{camera_id}/config",
                "stop": "POST /camera/{camera_id}/stop",
                "update_threshold": "POST /camera/{camera_id}/threshold"
            },
            "crowd_flow": {
                "get_all": "GET /crowd-flow",
                "get_zone": "GET /zones/{zone_id}/crowd-flow"
            },
            "re_routing": {
                "get_suggestions": "GET /re-routing-suggestions",
                "generate": "POST /re-routing-suggestions/generate"
            },
            "emergency": {
                "send_alert": "POST /emergency",
                "send_instructions": "POST /instructions"
            },
            "system": {
                "status": "GET /status"
            },
            "websockets": {
                "alerts": "/ws/alerts",
                "frames": "/ws/frames/{camera_id}",
                "instructions": "/ws/instructions"
            }
        },
        "testing": {
            "rtsp_example": "ffmpeg -f dshow -rtbufsize 200M -i video=\"USB2.0 HD UVC WebCam\" -an -vf scale=1280:720 -r 15 -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp rtsp://127.0.0.1:8554/live",
            "websocket_test": "Connect to ws://localhost:8000/ws/alerts to receive real-time alerts",
            "sample_data": "Sample zones and teams are automatically created on startup"
        }
    }

@app.post("/monitor/rtsp")
async def start_rtsp_monitoring(
    camera_id: str = Query(..., description="Unique camera identifier"),
    rtsp_url: str = Query(..., description="RTSP stream URL"),
    threshold: int = Query(20, description="People count threshold for alerts"),
    zone_id: str = Query(None, description="Zone ID this camera is monitoring")
):
    """Start monitoring an RTSP stream"""
    
    if camera_id in state.frame_processors:
        # Stop existing processor
        state.frame_processors[camera_id].stop()
        del state.frame_processors[camera_id]
    
    try:
        # Create and start new processor
        processor = FrameProcessor(camera_id, rtsp_url, threshold, zone_id)
        processor.start()
        
        state.frame_processors[camera_id] = processor
        state.camera_configs[camera_id] = {
            "source": rtsp_url,
            "threshold": threshold,
            "zone_id": zone_id,
            "started_at": datetime.now().isoformat(),
            "status": "active"
        }
        
        return {
            "status": "success",
            "message": f"Started monitoring camera {camera_id}",
            "camera_id": camera_id,
            "rtsp_url": rtsp_url,
            "threshold": threshold,
            "zone_id": zone_id,
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
    zone_id: str = Query(None, description="Zone ID this camera is monitoring"),
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
        processor = FrameProcessor(camera_id, temp_file_path, threshold, zone_id)
        processor.start()
        
        state.frame_processors[camera_id] = processor
        state.camera_configs[camera_id] = {
            "source": f"video_file_{file.filename}",
            "threshold": threshold,
            "zone_id": zone_id,
            "started_at": datetime.now().isoformat(),
            "status": "active",
            "file_name": file.filename
        }
        
        return {
            "status": "success",
            "message": f"Started processing video {file.filename}",
            "camera_id": camera_id,
            "threshold": threshold,
            "zone_id": zone_id,
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

# ============================================================================
# FIXED ROUTES FOR BACKEND SERVICE INTEGRATION
# ============================================================================

# Add this import at the top if not already there
from pydantic import BaseModel

# Define the request model
class ReRoutingRequest(BaseModel):
    from_zone_id: str
    to_zone_id: str

# Zone Management Routes
@app.post("/zones")
async def create_zone(zone_data: dict):
    """Create a new zone"""
    try:
        zone_id = str(uuid.uuid4())
        zone = {
            "id": zone_id,
            "name": zone_data["name"],
            "type": zone_data["type"],
            "coordinates": zone_data["coordinates"],
            "capacity": zone_data["capacity"],
            "description": zone_data["description"],
            "current_occupancy": 0,
            "status": "active",
            "created_at": datetime.now().isoformat() + "Z"
        }
        
        state.zones[zone_id] = zone
        
        # Initialize crowd flow data for this zone
        state.crowd_flow_data[zone_id] = {
            "zone_id": zone_id,
            "zone_name": zone["name"],
            "current_occupancy": 0,
            "capacity": zone["capacity"],
            "occupancy_percentage": 0.0,
            "people_count": 0,
            "density_level": "LOW",
            "trend": "stable",
            "last_update": datetime.now().isoformat() + "Z"
        }
        
        return zone
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create zone: {str(e)}")

@app.get("/zones")
async def get_zones():
    """Get all zones"""
    try:
        if not state.zones:
            return []
        return list(state.zones.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch zones: {str(e)}")

@app.get("/zones/{zone_id}")
async def get_zone(zone_id: str):
    """Get a specific zone"""
    try:
        if zone_id not in state.zones:
            raise HTTPException(status_code=404, detail="Zone not found")
        return state.zones[zone_id]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch zone: {str(e)}")

@app.put("/zones/{zone_id}")
async def update_zone(zone_id: str, zone_data: dict):
    """Update a zone"""
    try:
        if zone_id not in state.zones:
            raise HTTPException(status_code=404, detail="Zone not found")
        
        # Update zone data
        for key, value in zone_data.items():
            if key in state.zones[zone_id]:
                state.zones[zone_id][key] = value
        
        # Update crowd flow data if capacity changed
        if "capacity" in zone_data:
            zone = state.zones[zone_id]
            if zone_id in state.crowd_flow_data:
                state.crowd_flow_data[zone_id]["capacity"] = zone["capacity"]
                state.crowd_flow_data[zone_id]["occupancy_percentage"] = (
                    zone["current_occupancy"] / zone["capacity"] * 100
                )
        
        return state.zones[zone_id]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update zone: {str(e)}")

@app.delete("/zones/{zone_id}")
async def delete_zone(zone_id: str):
    """Delete a zone"""
    try:
        if zone_id not in state.zones:
            raise HTTPException(status_code=404, detail="Zone not found")
        
        # Remove zone and related data
        del state.zones[zone_id]
        if zone_id in state.crowd_flow_data:
            del state.crowd_flow_data[zone_id]
        if zone_id in state.re_routing_cache:
            del state.re_routing_cache[zone_id]
        
        return {"status": "success", "message": f"Zone {zone_id} deleted"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete zone: {str(e)}")

# Team Management Routes
@app.post("/teams")
async def create_team(team_data: dict):
    """Create a new team"""
    try:
        team_id = str(uuid.uuid4())
        team = {
            "id": team_id,
            "name": team_data["name"],
            "role": team_data["role"],
            "zone_id": team_data["zone_id"],
            "contact": team_data["contact"],
            "status": "active",
            "created_at": datetime.now().isoformat() + "Z"
        }
        
        state.teams[team_id] = team
        return team
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create team: {str(e)}")

@app.get("/teams")
async def get_teams():
    """Get all teams"""
    try:
        if not state.teams:
            return []
        return list(state.teams.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch teams: {str(e)}")

@app.get("/teams/{team_id}")
async def get_team(team_id: str):
    """Get a specific team"""
    try:
        if team_id not in state.teams:
            raise HTTPException(status_code=404, detail="Team not found")
        return state.teams[team_id]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch team: {str(e)}")

@app.put("/teams/{team_id}")
async def update_team(team_id: str, team_data: dict):
    """Update a team"""
    try:
        if team_id not in state.teams:
            raise HTTPException(status_code=404, detail="Team not found")
        
        for key, value in team_data.items():
            if key in state.teams[team_id]:
                state.teams[team_id][key] = value
        
        return state.teams[team_id]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update team: {str(e)}")

@app.delete("/teams/{team_id}")
async def delete_team(team_id: str):
    """Delete a team"""
    try:
        if team_id not in state.teams:
            raise HTTPException(status_code=404, detail="Team not found")
        
        del state.teams[team_id]
        return {"status": "success", "message": f"Team {team_id} deleted"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete team: {str(e)}")

# Crowd Flow Analysis Routes
@app.get("/crowd-flow")
async def get_crowd_flow_data():
    """Get crowd flow data for all zones"""
    try:
        if not state.crowd_flow_data:
            return []
        return list(state.crowd_flow_data.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch crowd flow data: {str(e)}")

@app.get("/zones/{zone_id}/crowd-flow")
async def get_zone_crowd_flow(zone_id: str):
    """Get crowd flow data for a specific zone"""
    try:
        if zone_id not in state.crowd_flow_data:
            raise HTTPException(status_code=404, detail="Zone not found")
        return state.crowd_flow_data[zone_id]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch zone crowd flow: {str(e)}")

# Re-routing Suggestions Routes
@app.get("/re-routing-suggestions")
async def get_re_routing_suggestions(zone_id: str = Query(None, description="Zone ID to get suggestions for")):
    """Get re-routing suggestions"""
    try:
        if zone_id:
            # Get suggestions for specific zone
            if zone_id not in state.crowd_flow_data:
                raise HTTPException(status_code=404, detail="Zone not found")
            
            current_zone = state.crowd_flow_data[zone_id]
            suggestions = _generate_re_routing_suggestions(current_zone, list(state.crowd_flow_data.values()))
            return suggestions
        else:
            # Get all suggestions
            all_suggestions = []
            for zone_id, zone_data in state.crowd_flow_data.items():
                if zone_data["density_level"] in ["HIGH", "CRITICAL"]:
                    suggestions = _generate_re_routing_suggestions(zone_data, list(state.crowd_flow_data.values()))
                    all_suggestions.extend(suggestions)
            
            return all_suggestions
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get re-routing suggestions: {str(e)}")

@app.post("/re-routing-suggestions/generate")
async def generate_re_routing_suggestion(data: ReRoutingRequest):
    """Generate custom re-routing suggestion between two zones"""
    try:
        from_zone_id = data.from_zone_id
        to_zone_id = data.to_zone_id
        
        if from_zone_id not in state.crowd_flow_data or to_zone_id not in state.crowd_flow_data:
            raise HTTPException(status_code=404, detail="Zone not found")
        
        from_zone = state.crowd_flow_data[from_zone_id]
        to_zone = state.crowd_flow_data[to_zone_id]
        
        suggestion = _create_re_routing_suggestion(from_zone, to_zone)
        return suggestion
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate re-routing suggestion: {str(e)}")

# Camera Management Routes
@app.get("/cameras")
async def get_cameras():
    """Get all cameras with zone information"""
    try:
        cameras = []
        for camera_id, config in state.camera_configs.items():
            camera = {
                "id": camera_id,
                "name": f"Camera {camera_id}",
                "zone_id": config.get("zone_id", "unknown"),
                "rtsp_url": config.get("source", ""),
                "status": config.get("status", "stopped"),
                "people_count": state.frame_processors[camera_id].last_count if camera_id in state.frame_processors else 0,
                "threshold": config.get("threshold", 20),
                "created_at": config.get("started_at", "")
            }
            cameras.append(camera)
        
        return cameras
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch cameras: {str(e)}")

# ============================================================================
# HELPER FUNCTIONS FOR RE-ROUTING AND CROWD ANALYSIS
# ============================================================================

def _generate_re_routing_suggestions(current_zone: dict, all_zones: list) -> list:
    """Generate re-routing suggestions for a zone"""
    suggestions = []
    
    # Filter candidate zones (exclude current and critical ones)
    candidate_zones = [
        zone for zone in all_zones 
        if zone["zone_id"] != current_zone["zone_id"] 
        and zone["density_level"] != "CRITICAL"
        and zone["occupancy_percentage"] < 90
    ]
    
    # Sort by optimal conditions
    candidate_zones.sort(key=lambda x: (
        {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}[x["density_level"]],
        x["occupancy_percentage"]
    ))
    
    # Generate top 3 suggestions
    for zone in candidate_zones[:3]:
        suggestion = _create_re_routing_suggestion(current_zone, zone)
        suggestions.append(suggestion)
    
    return suggestions

def _create_re_routing_suggestion(from_zone: dict, to_zone: dict) -> dict:
    """Create a re-routing suggestion between two zones"""
    urgency = _calculate_urgency(from_zone, to_zone)
    estimated_wait_time = _estimate_wait_time(to_zone)
    
    return {
        "from_zone": from_zone["zone_id"],
        "to_zone": to_zone["zone_id"],
        "reason": _generate_re_routing_reason(from_zone, to_zone),
        "urgency": urgency,
        "estimated_wait_time": estimated_wait_time,
        "alternative_routes": _find_alternative_routes(from_zone["zone_id"], to_zone["zone_id"], [from_zone, to_zone]),
        "crowd_conditions": {
            "from_zone": from_zone,
            "to_zone": to_zone
        }
    }

def _calculate_urgency(from_zone: dict, to_zone: dict) -> str:
    """Calculate urgency level for re-routing"""
    from_density = from_zone["density_level"]
    to_density = to_zone["density_level"]
    
    if from_density == "CRITICAL" and to_density == "LOW":
        return "critical"
    elif from_density == "HIGH" and to_density == "LOW":
        return "high"
    elif from_density == "MEDIUM" and to_density == "LOW":
        return "medium"
    else:
        return "low"

def _estimate_wait_time(zone: dict) -> int:
    """Estimate wait time for a zone"""
    base_wait_time = 5  # minutes
    occupancy_multiplier = zone["occupancy_percentage"] / 100
    density_multiplier = {"LOW": 1, "MEDIUM": 1.5, "HIGH": 2, "CRITICAL": 3}[zone["density_level"]]
    
    return round(base_wait_time * occupancy_multiplier * density_multiplier)

def _generate_re_routing_reason(from_zone: dict, to_zone: dict) -> str:
    """Generate human-readable reason for re-routing"""
    if from_zone["density_level"] == "CRITICAL":
        return f"Critical crowd density detected. Redirecting to {to_zone['zone_name']} for safety."
    
    if from_zone["occupancy_percentage"] > 80:
        return f"High occupancy ({from_zone['occupancy_percentage']:.1f}%). {to_zone['zone_name']} has better capacity."
    
    return f"Better crowd conditions at {to_zone['zone_name']}. Estimated wait time: {_estimate_wait_time(to_zone)} minutes."

def _find_alternative_routes(from_zone_id: str, to_zone_id: str, all_zones: list) -> list:
    """Find alternative routes for re-routing"""
    alternative_zones = [
        zone for zone in all_zones
        if zone["zone_id"] not in [from_zone_id, to_zone_id]
        and zone["density_level"] == "LOW"
    ]
    
    return [zone["zone_name"] for zone in alternative_zones[:2]]

# ============================================================================
# IMPROVED ALERT SYSTEM WITH DEDUPLICATION
# ============================================================================

def _should_send_alert(alert_type: str, camera_id: str, content_hash: str, debounce_time: float = 5.0) -> bool:
    """Check if an alert should be sent (prevents duplicates)"""
    current_time = time.time()
    alert_key = f"{alert_type}_{camera_id}"
    
    # Check if content is the same
    if alert_key in state.alert_content_hash and state.alert_content_hash[alert_key] == content_hash:
        # Check debounce time
        if alert_key in state.alert_last_sent:
            if current_time - state.alert_last_sent[alert_key] < debounce_time:
                return False
    
    # Update tracking
    state.alert_content_hash[alert_key] = content_hash
    state.alert_last_sent[alert_key] = current_time
    return True

def _create_content_hash(data: dict) -> str:
    """Create a hash of alert content for deduplication"""
    import hashlib
    # Create a stable string representation
    content_str = json.dumps(data, sort_keys=True)
    return hashlib.md5(content_str.encode()).hexdigest()

# ============================================================================
# UPDATED FRAME PROCESSOR WITH IMPROVED ALERT SYSTEM
# ============================================================================