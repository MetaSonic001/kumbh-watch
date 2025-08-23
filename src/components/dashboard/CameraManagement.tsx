// CameraManagement.tsx (new)
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { API_URL } from "@/config";
import ZoneSelectionModal from './ZoneSelectionModal';
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

const CameraManagement = () => {
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');
  const [threshold, setThreshold] = useState(20);
  const [newThreshold, setNewThreshold] = useState({});
  const [showZoneSelection, setShowZoneSelection] = useState(false);
  const [pendingCameraData, setPendingCameraData] = useState<{
    camera_id: string;
    rtsp_url: string;
    threshold: number;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API_URL}/status`)
        .then(res => res.json())
        .then(data => setCameras(Object.entries(data.active_cameras || {})));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleZoneSelect = async (zoneId: string, zoneName: string) => {
    if (!pendingCameraData) return;
    
    try {
      const response = await fetch(`${API_URL}/monitor/rtsp?${new URLSearchParams({
        camera_id: pendingCameraData.camera_id,
        rtsp_url: pendingCameraData.rtsp_url,
        threshold: pendingCameraData.threshold.toString(),
        zone_id: zoneId
      })}`, { method: 'POST' });
      
      if (response.ok) {
        toast.success(`Started monitoring ${pendingCameraData.camera_id} in zone "${zoneName}"`);
        setCameraId('');
        setRtspUrl('');
        setThreshold(20);
      } else {
        toast.error('Failed to start monitoring');
      }
    } catch (error) {
      toast.error('Failed to start monitoring');
    } finally {
      setPendingCameraData(null);
      setShowZoneSelection(false);
    }
  };

  const startMonitoring = async () => {
    if (!cameraId || !rtspUrl) {
      toast.error('Please fill in all fields');
      return;
    }

    // Show zone selection instead of directly starting
    setPendingCameraData({
      camera_id: cameraId,
      rtsp_url: rtspUrl,
      threshold: threshold
    });
    setShowZoneSelection(true);
  };

  const stopMonitoring = async (id: string) => {
    try {
      await fetch(`${API_URL}/camera/${id}/stop`, { method: 'POST' });
      toast.success(`Stopped ${id}`);
    } catch {
      toast.error('Failed to stop');
    }
  };

  const updateThreshold = async (id: string) => {
    try {
      await fetch(`${API_URL}/camera/${id}/threshold?threshold=${newThreshold[id]}`, { method: 'POST' });
      toast.success(`Updated threshold for ${id}`);
    } catch {
      toast.error('Failed to update');
    }
  };

  const getConfig = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/camera/${id}/config`);
      const data = await res.json();
      toast.info(`Config for ${id}: ${JSON.stringify(data)}`);
    } catch {
      toast.error('Failed to get config');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Camera ID" value={cameraId} onChange={e => setCameraId(e.target.value)} />
        <Input placeholder="RTSP URL" value={rtspUrl} onChange={e => setRtspUrl(e.target.value)} />
        <Input type="number" placeholder="Threshold" value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
        <Button onClick={startMonitoring}>Start Monitoring</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Zone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Count</TableHead>
            <TableHead>Threshold</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cameras.map(([id, info]: any) => (
            <TableRow key={id}>
              <TableCell className="font-medium">{id}</TableCell>
              <TableCell className="font-mono text-xs max-w-[150px] truncate" title={info.source}>
                {info.source}
              </TableCell>
              <TableCell>
                {info.zone_id ? (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span className="text-sm text-primary">{info.zone_id}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No zone</span>
                )}
              </TableCell>
              <TableCell>
                <Badge 
                  variant={info.status === 'active' ? 'default' : 'secondary'}
                  className={info.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                >
                  {info.status}
                </Badge>
              </TableCell>
              <TableCell className="font-bold">{info.current_count || 0}</TableCell>
              <TableCell>
                <Input 
                  type="number" 
                  value={newThreshold[id] || info.threshold} 
                  onChange={e => setNewThreshold(prev => ({ ...prev, [id]: Number(e.target.value) }))} 
                  className="w-20"
                />
              </TableCell>
              <TableCell className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => stopMonitoring(id)}>Stop</Button>
                <Button variant="outline" size="sm" onClick={() => updateThreshold(id)}>Update</Button>
                <Button variant="outline" size="sm" onClick={() => getConfig(id)}>Config</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Zone Selection Modal */}
      <ZoneSelectionModal
        isOpen={showZoneSelection}
        onClose={() => {
          setShowZoneSelection(false);
          setPendingCameraData(null);
        }}
        onZoneSelect={handleZoneSelect}
        cameraType="rtsp"
      />
    </div>
  );
};

export default CameraManagement;