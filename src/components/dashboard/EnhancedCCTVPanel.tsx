import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Play, 
  Pause, 
  Square, 
  Upload, 
  Settings,
  Wifi,
  WifiOff,
  Users,
  AlertTriangle,
  Activity,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { API_URL, WS_URL } from "@/config";

interface CameraStream {
  id: string;
  name: string;
  source: string;
  status: 'active' | 'stopped' | 'error';
  people_count: number;
  threshold: number;
  density_level: string;
  last_frame?: string;
  last_update: string;
  is_live: boolean;
}

const EnhancedCCTVPanel = () => {
  const [cameras, setCameras] = useState<CameraStream[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [rtspForm, setRtspForm] = useState({
    camera_id: '',
    rtsp_url: '',
    threshold: 20
  });
  const [showRtspForm, setShowRtspForm] = useState(false);
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoForm, setVideoForm] = useState({
    camera_id: '',
    threshold: 20
  });

  const websocketsRef = useRef<{ [cameraId: string]: WebSocket }>({});
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch camera status periodically
  useEffect(() => {
    const fetchCameraStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/status`);
        if (response.ok) {
          const data = await response.json();
          
          // Convert backend camera data to our format
          const cameraStreams: CameraStream[] = Object.entries(data.active_cameras || {}).map(([id, camera]: [string, any]) => ({
            id,
            name: `Camera ${id}`,
            source: camera.source,
            status: camera.status,
            people_count: camera.current_count || 0,
            threshold: camera.threshold || 20,
            density_level: 'NONE',
            last_update: camera.started_at || new Date().toISOString(),
            is_live: camera.status === 'active'
          }));
          
          setCameras(cameraStreams);
        }
      } catch (error) {
        console.error('Failed to fetch camera status:', error);
      }
    };

    // Initial fetch
    fetchCameraStatus();
    
    // Set up interval
    statusIntervalRef.current = setInterval(fetchCameraStatus, 5000);
    
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, []);

  // Connect to camera WebSockets
  useEffect(() => {
    cameras.forEach(camera => {
      if (camera.status === 'active' && !websocketsRef.current[camera.id]) {
        connectToCamera(camera.id);
      }
    });

    return () => {
      // Cleanup WebSocket connections
      Object.values(websocketsRef.current).forEach(ws => ws.close());
    };
  }, [cameras]);

  const connectToCamera = (cameraId: string) => {
    if (websocketsRef.current[cameraId]) {
      websocketsRef.current[cameraId].close();
    }

    const ws = new WebSocket(`${WS_URL}/ws/frames/${cameraId}`);
    websocketsRef.current[cameraId] = ws;

    ws.onopen = () => {
      console.log(`Connected to camera ${cameraId} WebSocket`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'LIVE_FRAME') {
          // Update camera with new frame and data
          setCameras(prev => prev.map(cam => 
            cam.id === cameraId ? {
              ...cam,
              last_frame: data.frame,
              people_count: data.people_count,
              density_level: data.density_level,
              last_update: data.timestamp,
              is_live: true
            } : cam
          ));
        }
      } catch (error) {
        console.error(`Error parsing frame data from camera ${cameraId}:`, error);
      }
    };

    ws.onclose = () => {
      console.log(`Camera ${cameraId} WebSocket disconnected`);
      delete websocketsRef.current[cameraId];
    };

    ws.onerror = (error) => {
      console.error(`Camera ${cameraId} WebSocket error:`, error);
    };
  };

  const startRTSPMonitoring = async () => {
    if (!rtspForm.camera_id || !rtspForm.rtsp_url) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch(`${API_URL}/monitor/rtsp?${new URLSearchParams({
        camera_id: rtspForm.camera_id,
        rtsp_url: rtspForm.rtsp_url,
        threshold: rtspForm.threshold.toString()
      })}`, { method: 'POST' });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Started monitoring camera ${rtspForm.camera_id}`);
        
        // Add the new camera to the local state immediately
        const newCamera: CameraStream = {
          id: rtspForm.camera_id,
          name: `Camera ${rtspForm.camera_id}`,
          source: rtspForm.rtsp_url,
          status: 'active',
          people_count: 0,
          threshold: rtspForm.threshold,
          density_level: 'NONE',
          last_update: new Date().toISOString(),
          is_live: true
        };
        
        setCameras(prev => [...prev, newCamera]);
        
        // Reset form
        setShowRtspForm(false);
        setRtspForm({ camera_id: '', rtsp_url: '', threshold: 20 });
        
        // Connect to the new camera's WebSocket
        setTimeout(() => {
          connectToCamera(rtspForm.camera_id);
        }, 500);
        
      } else {
        const error = await response.json();
        toast.error(`Failed to start monitoring: ${error.detail}`);
      }
    } catch (error) {
      toast.error('Failed to connect to backend');
    } finally {
      setIsConnecting(false);
    }
  };

  const uploadVideo = async () => {
    if (!videoFile || !videoForm.camera_id) {
      toast.error('Please select a video file and enter camera ID');
      return;
    }

    setIsConnecting(true);
    try {
      const formData = new FormData();
      formData.append('file', videoFile);
      
      const response = await fetch(`${API_URL}/process/video?${new URLSearchParams({
        camera_id: videoForm.camera_id,
        threshold: videoForm.threshold.toString()
      })}`, { 
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Started processing video for camera ${videoForm.camera_id}`);
        
        // Add the new camera to the local state immediately
        const newCamera: CameraStream = {
          id: videoForm.camera_id,
          name: `Camera ${videoForm.camera_id}`,
          source: `video_file_${videoFile.name}`,
          status: 'active',
          people_count: 0,
          threshold: videoForm.threshold,
          density_level: 'NONE',
          last_update: new Date().toISOString(),
          is_live: true
        };
        
        setCameras(prev => [...prev, newCamera]);
        
        // Reset form
        setShowVideoUpload(false);
        setVideoFile(null);
        setVideoForm({ camera_id: '', threshold: 20 });
        
        // Connect to the new camera's WebSocket
        setTimeout(() => {
          connectToCamera(videoForm.camera_id);
        }, 500);
        
      } else {
        const error = await response.json();
        toast.error(`Failed to process video: ${error.detail}`);
      }
    } catch (error) {
      toast.error('Failed to upload video');
    } finally {
      setIsConnecting(false);
    }
  };

  const stopCamera = async (cameraId: string) => {
    try {
      const response = await fetch(`${API_URL}/camera/${cameraId}/stop`, { method: 'POST' });
      if (response.ok) {
        toast.success(`Stopped camera ${cameraId}`);
        
        // Update camera status locally instead of refreshing
        setCameras(prev => prev.map(cam => 
          cam.id === cameraId ? { ...cam, status: 'stopped', is_live: false } : cam
        ));
        
        // Close WebSocket connection
        if (websocketsRef.current[cameraId]) {
          websocketsRef.current[cameraId].close();
          delete websocketsRef.current[cameraId];
        }
        
      } else {
        const error = await response.json();
        toast.error(`Failed to stop camera: ${error.detail}`);
      }
    } catch (error) {
      toast.error('Failed to stop camera');
    }
  };

  const getDensityColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-destructive';
      case 'HIGH': return 'text-warning';
      case 'MEDIUM': return 'text-accent';
      case 'LOW': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-success';
      case 'stopped': return 'text-muted-foreground';
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Camera Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowRtspForm(!showRtspForm)}
            variant="outline"
            className="bg-gradient-sacred"
          >
            <Wifi className="w-4 h-4 mr-2" />
            Add RTSP Camera
          </Button>
          
          <Button
            onClick={() => setShowVideoUpload(!showVideoUpload)}
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Video
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {cameras.filter(c => c.status === 'active').length} Active Cameras
        </div>
      </div>

      {/* RTSP Form */}
      <AnimatePresence>
        {showRtspForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Add RTSP Camera</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="rtsp-camera-id">Camera ID</Label>
                    <Input
                      id="rtsp-camera-id"
                      placeholder="e.g., camera_01"
                      value={rtspForm.camera_id}
                      onChange={(e) => setRtspForm(prev => ({ ...prev, camera_id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rtsp-url">RTSP URL</Label>
                    <Input
                      id="rtsp-url"
                      placeholder="rtsp://192.168.1.100:554/stream"
                      value={rtspForm.rtsp_url}
                      onChange={(e) => setRtspForm(prev => ({ ...prev, rtsp_url: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rtsp-threshold">Threshold</Label>
                    <Input
                      id="rtsp-threshold"
                      type="number"
                      placeholder="20"
                      value={rtspForm.threshold}
                      onChange={(e) => setRtspForm(prev => ({ ...prev, threshold: parseInt(e.target.value) || 20 }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={startRTSPMonitoring}
                    disabled={isConnecting}
                    className="bg-gradient-sacred"
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {isConnecting ? 'Starting...' : 'Start Monitoring'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowRtspForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Upload Form */}
      <AnimatePresence>
        {showVideoUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-secondary">
              <CardHeader>
                <CardTitle className="text-lg">Upload Video for Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="video-camera-id">Camera ID</Label>
                    <Input
                      id="video-camera-id"
                      placeholder="e.g., video_01"
                      value={videoForm.camera_id}
                      onChange={(e) => setVideoForm(prev => ({ ...prev, camera_id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="video-threshold">Threshold</Label>
                    <Input
                      id="video-threshold"
                      type="number"
                      placeholder="20"
                      value={videoForm.threshold}
                      onChange={(e) => setVideoForm(prev => ({ ...prev, threshold: parseInt(e.target.value) || 20 }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="video-file">Video File</Label>
                  <Input
                    id="video-file"
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={uploadVideo}
                    disabled={isConnecting}
                    className="bg-gradient-secondary"
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {isConnecting ? 'Uploading...' : 'Upload & Process'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowVideoUpload(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cameras.map((camera, index) => (
          <motion.div
            key={camera.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className={`h-full ${camera.status === 'active' ? 'ring-2 ring-primary/20' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    {camera.name}
                  </CardTitle>
                  <Badge 
                    variant={camera.status === 'active' ? 'default' : 'secondary'}
                    className={getStatusColor(camera.status)}
                  >
                    {camera.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Live Frame Display */}
                {camera.last_frame && camera.status === 'active' ? (
                  <div className="relative">
                    <img
                      src={camera.last_frame}
                      alt={`Live feed from ${camera.name}`}
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                      LIVE
                    </div>
                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                      {camera.people_count} people
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Camera className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">No live feed</p>
                    </div>
                  </div>
                )}

                {/* Camera Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Source:</span>
                    <span className="font-mono text-xs truncate max-w-[120px]" title={camera.source}>
                      {camera.source}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">People Count:</span>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span className="font-bold">{camera.people_count}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Threshold:</span>
                    <span className="font-bold">{camera.threshold}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Density:</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getDensityColor(camera.density_level)}`}
                    >
                      {camera.density_level}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Update:</span>
                    <span className="text-xs">
                      {new Date(camera.last_update).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Camera Controls */}
                <div className="flex gap-2">
                  {camera.status === 'active' ? (
                    <Button
                      onClick={() => stopCamera(camera.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Square className="w-4 h-4 mr-1" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setSelectedCamera(camera.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => setSelectedCamera(camera.id)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* No Cameras Message */}
      {cameras.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Cameras Connected</h3>
          <p className="text-muted-foreground mb-4">
            Add an RTSP camera or upload a video to start monitoring
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => setShowRtspForm(true)}
              className="bg-gradient-sacred"
            >
              <Wifi className="w-4 h-4 mr-2" />
              Add RTSP Camera
            </Button>
            <Button
              onClick={() => setShowVideoUpload(true)}
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Video
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EnhancedCCTVPanel; 