# 🚀 Enhanced Heatmap System - Startup Guide

## Quick Start

### 1. **Start the Backend Server**

```bash
cd FastAPI

# Option 1: Use the startup script (recommended)
python start_backend.py

# Option 2: Manual startup
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. **Start the Frontend**

```bash
# In a new terminal
cd src
npm run dev
```

### 3. **Test the System**

- Open your browser to the frontend URL
- Go to the Dashboard
- Try adding a camera or uploading a video
- The system will prompt you to select/create a zone
- Watch the live map for real-time updates!

## 🔧 Troubleshooting

### Backend Issues

**"Module not found" errors:**
```bash
pip install -r requirements.txt
```

**Port already in use:**
```bash
# Kill existing process
lsof -ti:8000 | xargs kill -9
# Or use different port
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**API endpoints not responding:**
```bash
# Test health endpoint
curl http://localhost:8000/health

# Check server logs for errors
```

### Frontend Issues

**"Failed to load zones" error:**
- Ensure backend is running on port 8000
- Check browser console for detailed errors
- Verify API_URL in config.ts matches backend

**Map not loading:**
- Check MAPBOX_ACCESS_TOKEN in config.ts
- Ensure internet connection for map tiles

**WebSocket connection failed:**
- Backend must be running
- Check WS_URL in config.ts
- Verify firewall settings

## 📊 Testing the Heatmap System

### 1. **Create a Zone**
- Click "Add RTSP Camera" or "Upload Video"
- Select "Create New Zone" tab
- Fill in zone details
- Click on map to set coordinates
- Click "Create Zone"

### 2. **Add a Camera/Video**
- Enter camera details
- Select the zone you created
- Start monitoring
- Watch for real-time updates

### 3. **Monitor Live Map**
- Zone markers change color based on density
- Critical zones pulse red
- Click markers to toggle heatmap
- Real-time people count updates

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/` | GET | API documentation |
| `/zones/heatmap` | GET | Get zones with heatmap data |
| `/zones` | POST | Create new zone |
| `/monitor/rtsp` | POST | Start RTSP monitoring |
| `/process/video` | POST | Process video file |

## 🔍 Debug Information

### Backend Logs
- Server startup messages
- API request logs
- Error details
- WebSocket connection status

### Frontend Console
- API response errors
- WebSocket connection status
- Map loading errors
- Zone data updates

### Health Check
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "zones_count": 3,
  "cameras_count": 0,
  "models_loaded": true
}
```

## 🎯 Common Issues & Solutions

### Issue: "Server returned non-JSON response"
**Solution:** Backend not running or endpoint missing
- Start backend server
- Check endpoint exists in main.py
- Verify port 8000 is accessible

### Issue: "Failed to load zones"
**Solution:** Zones endpoint not responding
- Check backend logs
- Verify `/zones/heatmap` endpoint exists
- Test with curl: `curl http://localhost:8000/zones/heatmap`

### Issue: Map not showing
**Solution:** Mapbox token or connection issue
- Verify MAPBOX_ACCESS_TOKEN in config.ts
- Check internet connection
- Check browser console for map errors

### Issue: WebSocket not connecting
**Solution:** Backend WebSocket endpoint issue
- Ensure backend is running
- Check WS_URL in config.ts
- Verify WebSocket endpoints in main.py

## 🚀 Performance Tips

1. **Backend:**
   - Use frame skipping for efficiency
   - Adjust heatmap update intervals
   - Monitor memory usage

2. **Frontend:**
   - Debounce frequent updates
   - Optimize map rendering
   - Use efficient WebSocket handling

## 📞 Support

If you're still having issues:

1. Check the backend logs for errors
2. Verify all dependencies are installed
3. Test individual API endpoints
4. Check browser console for frontend errors
5. Ensure ports are not blocked by firewall

---

**Happy Crowd Monitoring! 🎉** 