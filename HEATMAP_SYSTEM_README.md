# Enhanced Heatmap System for Crowd Detection

## Overview

This enhanced heatmap system provides real-time crowd density visualization with dynamic color coding, zone management, and automatic alert generation. The system automatically updates zone colors based on people count and provides interactive heatmap visualization.

## Features

### 🎯 **Zone-Based Camera Management**
- Every camera must be associated with a zone for heatmap generation
- Automatic zone creation if none exists
- Real-time zone status updates

### 🌡️ **Dynamic Heatmap Generation**
- Real-time crowd density visualization
- Color-coded density levels (Low → Medium → High → Critical)
- Automatic hotspot detection
- Smooth gaussian filtering for realistic visualization

### 🎨 **Smart Color Coding**
- **Low Density (0-40%)**: Green - Safe conditions
- **Medium Density (40-70%)**: Purple - Normal conditions  
- **High Density (70-90%)**: Orange - Monitor closely
- **Critical Density (90%+)**: Red - Immediate action required

### 📊 **Real-Time Updates**
- WebSocket-based live updates
- Automatic heatmap activation on alerts
- Zone marker color changes based on density
- Live people count updates

## How It Works

### 1. **Zone Selection Process**
When adding a camera or video:
1. User clicks "Add RTSP Camera" or "Upload Video"
2. System prompts for zone selection
3. User can select existing zone or create new one
4. Camera is associated with selected zone

### 2. **Heatmap Generation**
- YOLOv8 detects people in video/stream
- System calculates density based on zone capacity
- Heatmap is generated with color-coded hotspots
- Real-time updates sent via WebSocket

### 3. **Zone Status Updates**
- Zone markers change color based on density level
- Critical zones show pulsing red indicators
- Popup shows detailed zone information
- Heatmap automatically activates for high-density zones

## API Endpoints

### Zone Management
```
POST /zones - Create new zone
GET /zones/heatmap - Get zones with heatmap data
```

### Camera Management
```
POST /monitor/rtsp - Start RTSP monitoring with zone
POST /process/video - Process video with zone
POST /camera/{id}/stop - Stop camera
```

### WebSocket Endpoints
```
/ws/live-map - Live map updates
/ws/alerts - Real-time alerts
/ws/frames/{camera_id} - Live frame updates
```

## Frontend Components

### LiveMap Component
- Interactive map with zone markers
- Real-time heatmap visualization
- Zone status indicators
- Density level legend

### CCTVPanel Component
- Camera management interface
- Zone selection modal
- Real-time camera status
- Density level indicators

### ZoneSelectionModal Component
- Zone creation and selection
- Interactive map for coordinates
- Zone type categorization

## Configuration

### Backend Configuration
```python
CONFIG = {
    "thresholds": {
        "default_people_threshold": 20,
        "high_density_threshold": 0.7,
        "critical_density_threshold": 0.9,
    },
    "processing": {
        "heatmap_update_interval": 2.0,  # seconds
        "max_frame_queue": 30
    }
}
```

### Frontend Configuration
```typescript
// config.ts
export const API_URL = 'http://localhost:8000';
export const WS_URL = 'ws://localhost:8000';
export const MAPBOX_ACCESS_TOKEN = 'your_mapbox_token';
```

## Usage Examples

### 1. **Add RTSP Camera**
```typescript
// User clicks "Add RTSP Camera"
// System shows zone selection modal
// User selects zone or creates new one
// Camera starts monitoring with zone association
// Live map shows zone with real-time updates
```

### 2. **Upload Video**
```typescript
// User uploads video file
// System prompts for zone selection
// Video processing starts with zone association
// Heatmap generates based on detected people
// Zone color updates based on density
```

### 3. **Monitor Live Map**
```typescript
// Zones show real-time status
// Critical zones pulse red
// Click zone marker to toggle heatmap
// Heatmap shows density hotspots
// Color legend explains density levels
```

## Error Handling

### Common Issues
1. **Zone Not Found**: System automatically creates zone selection modal
2. **Camera Connection Failed**: Retry mechanism with user feedback
3. **Heatmap Generation Failed**: Fallback to basic density indicators
4. **WebSocket Disconnection**: Automatic reconnection with status indicators

### Debug Information
- Backend logs show processing status
- Frontend console shows WebSocket events
- Zone creation includes coordinate validation
- Camera status includes detailed error messages

## Performance Considerations

### Backend Optimization
- Frame skipping for efficiency (configurable)
- Heatmap update intervals (configurable)
- Alert deduplication to prevent spam
- Efficient memory management

### Frontend Optimization
- Debounced updates to prevent UI lag
- Efficient WebSocket message handling
- Lazy loading of map components
- Optimized heatmap rendering

## Testing

### Backend Testing
```bash
# Run test script
python test_backend.py

# Start backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Testing
```bash
# Start development server
npm run dev

# Test zone creation
# Test camera addition
# Test heatmap visualization
```

## Troubleshooting

### Heatmap Not Showing
1. Check zone association
2. Verify camera is active
3. Check WebSocket connection
4. Verify people detection is working

### Zone Colors Not Updating
1. Check real-time data flow
2. Verify WebSocket messages
3. Check zone capacity settings
4. Verify people count calculations

### Performance Issues
1. Reduce heatmap update frequency
2. Increase frame skip rate
3. Check backend resource usage
4. Optimize frontend rendering

## Future Enhancements

### Planned Features
- Multi-zone heatmap comparison
- Historical density trends
- Predictive crowd modeling
- Advanced anomaly detection
- Mobile-responsive heatmap
- Export heatmap data

### Integration Possibilities
- Emergency response systems
- Traffic management
- Event planning tools
- Safety monitoring dashboards
- Analytics platforms

## Support

For issues or questions:
1. Check the backend logs
2. Verify configuration settings
3. Test individual components
4. Check WebSocket connections
5. Verify zone associations

---

**Note**: This system requires a running backend with YOLOv8 models and proper zone configuration. Ensure all dependencies are installed and configured before use. 