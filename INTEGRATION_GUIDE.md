# 🚀 Frontend-Backend Integration Guide

## Overview
This document outlines the complete integration between your React frontend and FastAPI backend for the Kumbh Watch crowd management system.

## 🔗 Backend Integration Points

### 1. **WebSocket Connections**
- **Alerts Stream**: `ws://localhost:8000/ws/alerts`
  - Real-time crowd alerts, threshold breaches, anomalies
  - Used in: `AlertsPanel`, `LiveMap`
  
- **Frame Streams**: `ws://localhost:8000/ws/frames/{camera_id}`
  - Live video frame updates with people count
  - Used in: `CCTVPanel`, `LiveMap`
  
- **Instructions Stream**: `ws://localhost:8000/ws/instructions`
  - Emergency broadcast messages
  - Used in: `QuickActions`

### 2. **REST API Endpoints**

#### Camera Management
```typescript
// Start RTSP monitoring
POST /monitor/rtsp
Body: { camera_id, rtsp_url, threshold }

// Stop camera
POST /camera/{camera_id}/stop

// Get camera config
GET /camera/{camera_id}/config

// Update threshold
POST /camera/{camera_id}/threshold
```

#### Emergency Management
```typescript
// Send emergency alert
POST /emergency
Body: { emergency_type, message, location, priority, camera_id }

// Broadcast instructions
POST /instructions
Body: { instructions, priority, duration }
```

#### System Status
```typescript
// Get system status
GET /status

// Process video file
POST /process/video
Body: FormData with video file

// Process single image
POST /process/image
Body: FormData with image file
```

## 🗺️ Mapbox Integration

### **Zone Management Components**
- `MapboxZoneSelector`: Interactive map for zone creation
- `ZoneSetup`: Setup wizard with map integration
- `ZoneManager`: Zone management interface

### **Features**
- **Interactive Zone Creation**: Click on map to place zones
- **Real-time Coordinates**: Precise GPS positioning
- **Zone Type Selection**: 5 different zone types with visual indicators
- **Custom Styling**: Themed markers, popups, and controls

### **Zone Types**
1. 🕉️ **Sacred Ghat** - Religious bathing areas
2. 🚪 **Entry Gate** - Main access points
3. ⛺ **Camp Area** - Accommodation zones
4. 🏥 **Medical Zone** - Healthcare facilities
5. 🛡️ **Security Post** - Security checkpoints

## 📊 Dashboard Components

### **Enhanced Components**
- **AlertsPanel**: Real-time WebSocket alerts with emergency response
- **QuickActions**: Comprehensive action panel with backend integration
- **LiveMap**: Interactive Mapbox with crowd heatmaps
- **CCTVPanel**: Live camera feeds with people counting

### **Component Sizes**
- **Alerts Panel**: 400px height (increased from 280px)
- **Quick Actions**: 500px height (increased from 280px)
- **Live Map**: 400px height
- **CCTV Feeds**: Full width with dynamic content

## 🔧 Backend Features Integrated

### **AI/ML Capabilities**
- **YOLOv8 Person Detection**: Real-time people counting
- **Anomaly Detection**: Fallen person, stampede, high-density clusters
- **Crowd Density Heatmaps**: Visual crowd distribution
- **Threshold Management**: Configurable alert triggers

### **Real-time Processing**
- **RTSP Stream Processing**: Live camera feeds
- **Video File Analysis**: Upload and process recorded footage
- **Image Analysis**: Single image people counting
- **WebSocket Broadcasting**: Instant updates to all clients

### **Emergency Management**
- **Multi-level Alerts**: Low, Medium, High, Critical
- **Emergency Types**: Medical, Fire, Security, Evacuation
- **Broadcast System**: Mass communication to all users
- **Response Coordination**: Emergency response initiation

## 🚨 Alert System Integration

### **Alert Types**
1. **Threshold Breach**: People count exceeds limit
2. **Anomaly Detection**: Unusual crowd behavior
3. **Emergency Alerts**: Manual emergency notifications
4. **Live Count Updates**: Real-time people count changes
5. **Heatmap Updates**: Crowd density visualization

### **Alert Severity Levels**
- **CRITICAL**: Immediate attention required
- **HIGH**: High priority response needed
- **MEDIUM**: Moderate priority
- **LOW**: Informational alerts

## 📱 Frontend Features

### **Real-time Updates**
- **Live Connection Status**: Backend connectivity indicator
- **Auto-reconnection**: Automatic WebSocket reconnection
- **Status Monitoring**: System health and performance
- **Error Handling**: Graceful degradation on failures

### **Interactive UI**
- **Responsive Design**: Works on all screen sizes
- **Smooth Animations**: Framer Motion transitions
- **Toast Notifications**: User feedback for actions
- **Loading States**: Visual feedback during operations

## 🧪 Testing & Development

### **Backend Testing**
```bash
# Start backend
cd FastAPI
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Test WebSocket connections
curl http://localhost:8000/test
```

### **Frontend Testing**
```bash
# Start frontend
npm run dev

# Test Mapbox integration
# Check browser console for Mapbox logs
# Verify zone creation on map
```

### **WebSocket Testing**
```bash
# Test alerts stream
wscat -c ws://localhost:8000/ws/alerts

# Test frame stream
wscat -c ws://localhost:8000/ws/frames/test_camera
```

## 🔐 Configuration

### **Environment Variables**
```typescript
// src/config.ts
export const API_URL = 'http://localhost:8000';
export const WS_URL = 'ws://localhost:8000';
export const MAPBOX_ACCESS_TOKEN = 'your_mapbox_token_here';
```

### **Mapbox Setup**
1. Get access token from [Mapbox](https://account.mapbox.com/)
2. Add token to `src/config.ts`
3. Ensure `mapbox-gl` package is installed
4. Import CSS: `import 'mapbox-gl/dist/mapbox-gl.css'`

## 🚀 Deployment

### **Backend Deployment**
```bash
# Production
uvicorn main:app --host 0.0.0.0 --port 8000

# With Gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### **Frontend Deployment**
```bash
# Build
npm run build

# Serve
npx serve -s dist
```

## 📋 Integration Checklist

- [x] WebSocket connections established
- [x] REST API endpoints integrated
- [x] Mapbox rendering working
- [x] Real-time alerts displaying
- [x] Camera management functional
- [x] Emergency system operational
- [x] Zone creation on map working
- [x] Dashboard panels properly sized
- [x] Error handling implemented
- [x] Connection status monitoring

## 🐛 Troubleshooting

### **Mapbox Not Rendering**
1. Check browser console for errors
2. Verify Mapbox access token
3. Ensure CSS is imported
4. Check container dimensions

### **WebSocket Connection Issues**
1. Verify backend is running
2. Check CORS settings
3. Ensure WebSocket endpoints are accessible
4. Check network connectivity

### **Backend Integration Failures**
1. Verify API_URL configuration
2. Check backend status endpoint
3. Ensure proper request format
4. Check authentication if required

## 🔮 Future Enhancements

- **Multi-language Support**: Hindi/English interface
- **Advanced Analytics**: Historical crowd data
- **Mobile App**: React Native companion app
- **AI Predictions**: Crowd behavior forecasting
- **Integration APIs**: Third-party system connections

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Status**: ✅ Fully Integrated 