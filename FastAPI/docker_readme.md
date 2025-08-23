# Docker Setup for Crowd Detection API

This guide will help you dockerize and run the Crowd Detection API using Docker and Docker Compose.

## 📁 File Structure

Make sure your project directory has the following structure:

```
crowd-detection-api/
├── main.py                 # Your main FastAPI application
├── start_backend.py        # Startup script
├── requirements.txt        # Python dependencies
├── Dockerfile             # Docker image definition
├── docker-compose.yml     # Docker Compose configuration
├── .dockerignore          # Files to exclude from Docker build
├── build-and-run.sh       # Build and run script
└── uploads/               # Directory for uploaded files (created automatically)
└── models/                # Directory for AI models (created automatically)
└── logs/                  # Directory for logs (created automatically)
```

## 🚀 Quick Start

### Option 1: Using the Build Script (Recommended)

1. **Make the script executable:**
   ```bash
   chmod +x build-and-run.sh
   ```

2. **Run the interactive script:**
   ```bash
   ./build-and-run.sh
   ```

3. **Or run directly with commands:**
   ```bash
   ./build-and-run.sh run      # Build and run with docker-compose
   ./build-and-run.sh simple   # Build and run simple container
   ./build-and-run.sh test     # Test API endpoints
   ./build-and-run.sh logs     # Show container logs
   ./build-and-run.sh stop     # Stop services
   ```

### Option 2: Manual Docker Commands

1. **Build the Docker image:**
   ```bash
   docker build -t crowd-detection-api:latest .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name crowd-detection-backend \
     -p 8000:8000 \
     -v $(pwd)/uploads:/app/uploads \
     -v $(pwd)/models:/app/models \
     -v $(pwd)/logs:/app/logs \
     --restart unless-stopped \
     crowd-detection-api:latest
   ```

### Option 3: Using Docker Compose

1. **Start the services:**
   ```bash
   docker-compose up -d
   ```

2. **Stop the services:**
   ```bash
   docker-compose down
   ```

## 🔍 Accessing the API

Once the container is running, you can access:

- **API Base URL:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health
- **Interactive API:** http://localhost:8000/redoc

## 📊 Testing the API

### Health Check
```bash
curl http://localhost:8000/health
```

### Get Zones with Heatmap
```bash
curl http://localhost:8000/zones/heatmap
```

### WebSocket Connection (Alerts)
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/alerts');
ws.onmessage = (event) => {
    console.log('Alert:', JSON.parse(event.data));
};
```

## 🛠️ Development Mode

For development with auto-reload:

```bash
docker run -it --rm \
  -p 8000:8000 \
  -v $(pwd):/app \
  -w /app \
  python:3.9-slim \
  bash -c "pip install -r requirements.txt && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
```

## 📋 Container Management

### View running containers:
```bash
docker ps
```

### View container logs:
```bash
docker logs crowd-detection-backend -f
```

### Execute commands in container:
```bash
docker exec -it crowd-detection-backend bash
```

### Stop and remove container:
```bash
docker stop crowd-detection-backend
docker rm crowd-detection-backend
```

## 🔧 Configuration

### Environment Variables

You can configure the container using environment variables:

```bash
docker run -d \
  --name crowd-detection-backend \
  -p 8000:8000 \
  -e PYTHONUNBUFFERED=1 \
  -e ENVIRONMENT=production \
  crowd-detection-api:latest
```

### Volume Mounts

The container uses the following volumes:
- `./uploads:/app/uploads` - For uploaded video/image files
- `./models:/app/models` - For AI model cache
- `./logs:/app/logs` - For application logs

## 🚨 Troubleshooting

### Container won't start:
1. Check if port 8000 is available:
   ```bash
   netstat -tulpn | grep 8000
   ```

2. Check container logs:
   ```bash
   docker logs crowd-detection-backend
   ```

### API not responding:
1. Check if container is healthy:
   ```bash
   docker ps
   ```

2. Test from inside container:
   ```bash
   docker exec -it crowd-detection-backend curl http://localhost:8000/health
   ```

### Model download issues:
The container automatically downloads YOLOv8 models on first run. If this fails:

1. Check internet connectivity in container
2. Pre-download models manually:
   ```bash
   docker exec -it crowd-detection-backend python -c "from ultralytics import YOLO; YOLO('yolov8s.pt')"
   ```

## 🔒 Security Considerations

- The container runs as a non-root user (`appuser`)
- Only necessary system packages are installed
- Resource limits are configured in docker-compose.yml
- Health checks are enabled for monitoring

## 📈 Performance Tuning

### Resource Limits

Adjust in `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '4.0'      # Increase for better performance
      memory: 8G       # Increase for large models
    reservations:
      cpus: '2.0'
      memory: 4G
```

### GPU Support

For GPU acceleration, add to docker-compose.yml:
```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

## 🔄 Updates and Maintenance

### Update the application:
1. Stop the container:
   ```bash
   ./build-and-run.sh stop
   ```

2. Rebuild and restart:
   ```bash
   ./build-and-run.sh run
   ```

### Clean up Docker resources:
```bash
# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune
```

## 📞 Support

If you encounter issues:
1. Check the container logs
2. Verify all required files are present
3. Ensure Docker has sufficient resources allocated
4. Check network connectivity for model downloads

The API will automatically start when the container starts and includes health checks for monitoring.