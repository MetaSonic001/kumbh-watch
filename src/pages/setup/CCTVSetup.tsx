import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Plus, 
  Edit, 
  Trash2,
  ArrowRight,
  Wifi,
  WifiOff,
  Settings,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSetup } from "@/contexts/SetupContext";
import SetupLayout from "@/components/setup/SetupLayout";
import { toast } from "sonner";

const CCTVSetup = () => {
  const navigate = useNavigate();
  const { state, addCamera, updateCamera, removeCamera, markStepCompleted } = useSetup();
  
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [newCamera, setNewCamera] = useState({
    name: "",
    zoneId: "",
    rtspUrl: "rtsp://127.0.0.1:8554/live",
    status: "online" as const
  });

  const handleCreateCamera = () => {
    if (!newCamera.name.trim() || !newCamera.zoneId || !newCamera.rtspUrl.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    addCamera({
      name: newCamera.name,
      zoneId: newCamera.zoneId,
      rtspUrl: newCamera.rtspUrl,
      status: newCamera.status,
      position: { x: 50, y: 50 } // Default position
    });

    setNewCamera({
      name: "",
      zoneId: "",
      rtspUrl: "rtsp://127.0.0.1:8554/live",
      status: "online"
    });

    toast.success("Camera added successfully!");
  };

  const handleDeleteCamera = (cameraId: string) => {
    removeCamera(cameraId);
    setSelectedCamera(null);
    toast.success("Camera removed successfully!");
  };

  const handleNext = () => {
    if (state.cameras.length === 0) {
      toast.error("Please add at least one camera before proceeding");
      return;
    }
    
    markStepCompleted(2);
    toast.success("CCTV setup completed!");
    navigate("/setup/teams");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "text-success border-success bg-success/10";
      case "offline": return "text-destructive border-destructive bg-destructive/10";
      case "maintenance": return "text-warning border-warning bg-warning/10";
      default: return "text-muted border-muted bg-muted/10";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online": return <Wifi className="w-4 h-4" />;
      case "offline": return <WifiOff className="w-4 h-4" />;
      case "maintenance": return <Settings className="w-4 h-4" />;
      default: return <Camera className="w-4 h-4" />;
    }
  };

  const getZoneName = (zoneId: string) => {
    return state.zones.find(zone => zone.id === zoneId)?.name || "Unknown Zone";
  };

  const camerasPerZone = state.zones.map(zone => ({
    zone,
    cameras: state.cameras.filter(camera => camera.zoneId === zone.id)
  }));

  return (
    <SetupLayout
      title="CCTV & Monitoring Setup"
      description="Deploy cameras and configure monitoring devices for comprehensive coverage"
      showBackButton
      onBack={() => navigate("/setup/zones")}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Camera Configuration Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Add New Camera */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Add CCTV Camera
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="camera-name">Camera Name *</Label>
                <Input
                  id="camera-name"
                  placeholder="e.g., Main Gate Camera 1"
                  value={newCamera.name}
                  onChange={(e) => setNewCamera(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="camera-zone">Assign to Zone *</Label>
                <Select value={newCamera.zoneId} onValueChange={(value) => setNewCamera(prev => ({ ...prev, zoneId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        <div className="flex items-center gap-2">
                          <span>
                            {zone.type === 'ghat' ? '🕉️' : 
                             zone.type === 'gate' ? '🚪' :
                             zone.type === 'medical' ? '🏥' :
                             zone.type === 'security' ? '🛡️' : '⛺'}
                          </span>
                          <span>{zone.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rtsp-url">RTSP Stream URL *</Label>
                <Input
                  id="rtsp-url"
                  placeholder="rtsp://127.0.0.1:8554/live"
                  value={newCamera.rtspUrl}
                  onChange={(e) => setNewCamera(prev => ({ ...prev, rtspUrl: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  MediaMTX server default: rtsp://127.0.0.1:8554/live
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="camera-status">Initial Status</Label>
                <Select value={newCamera.status} onValueChange={(value: any) => setNewCamera(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleCreateCamera} 
                className="w-full bg-gradient-sacred"
                disabled={state.zones.length === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Camera
              </Button>

              {state.zones.length === 0 && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-center gap-2 text-warning text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Create zones first before adding cameras</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Setup Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Setup Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Camera className="w-4 h-4 mr-2" />
                Standard Coverage (2 cameras per zone)
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Camera className="w-4 h-4 mr-2" />
                High Security (4 cameras per gate)
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Camera className="w-4 h-4 mr-2" />
                Medical Monitoring (1 camera per medical zone)
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Camera List by Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-secondary" />
                  Deployed Cameras ({state.cameras.length})
                </span>
                {state.cameras.length > 0 && (
                  <Badge variant="outline" className="text-success border-success">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {camerasPerZone.map((zoneGroup) => (
                    <div key={zoneGroup.zone.id}>
                      {zoneGroup.cameras.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3"
                        >
                          <div className="flex items-center gap-2 text-sm font-medium border-b pb-2">
                            <span>
                              {zoneGroup.zone.type === 'ghat' ? '🕉️' : 
                               zoneGroup.zone.type === 'gate' ? '🚪' :
                               zoneGroup.zone.type === 'medical' ? '🏥' :
                               zoneGroup.zone.type === 'security' ? '🛡️' : '⛺'}
                            </span>
                            {zoneGroup.zone.name} ({zoneGroup.cameras.length} cameras)
                          </div>

                          {zoneGroup.cameras.map((camera) => (
                            <motion.div
                              key={camera.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                                getStatusColor(camera.status)
                              } ${selectedCamera === camera.id ? 'ring-2 ring-primary' : ''}`}
                              onClick={() => setSelectedCamera(camera.id === selectedCamera ? null : camera.id)}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(camera.status)}
                                    <h4 className="font-medium text-sm">{camera.name}</h4>
                                  </div>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {camera.status}
                                  </Badge>
                                </div>

                                <div className="text-xs text-muted-foreground">
                                  Stream: {camera.rtspUrl}
                                </div>

                                {selectedCamera === camera.id && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex gap-2 pt-2 border-t"
                                  >
                                    <Button variant="ghost" size="sm" className="flex-1">
                                      <Edit className="w-3 h-3 mr-1" />
                                      Edit
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="flex-1 text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCamera(camera.id);
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Remove
                                    </Button>
                                  </motion.div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  ))}
                </AnimatePresence>

                {state.cameras.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No cameras deployed yet</p>
                    <p className="text-sm">Add cameras to your zones for monitoring</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Coverage Statistics */}
          {state.cameras.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold mb-4">Coverage Summary</h4>
                <div className="space-y-3">
                  {camerasPerZone.map((zoneGroup) => (
                    <div key={zoneGroup.zone.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span>
                          {zoneGroup.zone.type === 'ghat' ? '🕉️' : 
                           zoneGroup.zone.type === 'gate' ? '🚪' :
                           zoneGroup.zone.type === 'medical' ? '🏥' :
                           zoneGroup.zone.type === 'security' ? '🛡️' : '⛺'}
                        </span>
                        {zoneGroup.zone.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={zoneGroup.cameras.length > 0 ? "default" : "outline"}>
                          {zoneGroup.cameras.length} cameras
                        </Badge>
                        {zoneGroup.cameras.length === 0 && (
                          <AlertTriangle className="w-4 h-4 text-warning" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Live Preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-accent" />
                Camera Grid Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              {state.cameras.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 h-full">
                  {state.cameras.slice(0, 4).map((camera, index) => (
                    <motion.div
                      key={camera.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative bg-gradient-to-br from-gray-900 to-gray-700 rounded-lg overflow-hidden"
                    >
                      {/* Mock video feed */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-purple-900/50">
                        <div className="absolute inset-0 opacity-30">
                          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-float"></div>
                        </div>
                      </div>
                      
                      {/* Camera info overlay */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                        <div className="bg-black/60 text-white px-2 py-1 rounded text-xs">
                          {camera.name}
                        </div>
                        <div className={`px-2 py-1 rounded text-xs ${
                          camera.status === 'online' ? 'bg-success text-success-foreground' :
                          camera.status === 'offline' ? 'bg-destructive text-destructive-foreground' :
                          'bg-warning text-warning-foreground'
                        }`}>
                          {camera.status.toUpperCase()}
                        </div>
                      </div>

                      <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                        {getZoneName(camera.zoneId)}
                      </div>
                    </motion.div>
                  ))}
                  
                  {state.cameras.length > 4 && (
                    <div className="col-span-2 flex items-center justify-center bg-muted rounded-lg">
                      <div className="text-center text-muted-foreground">
                        <Camera className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">+{state.cameras.length - 4} more cameras</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full bg-muted rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Camera feeds will appear here</p>
                    <p className="text-sm">Add cameras to see live preview</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="flex justify-between items-center pt-8 border-t"
      >
        <Button 
          variant="outline"
          onClick={() => navigate("/setup/zones")}
        >
          Back: Zone Setup
        </Button>

        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {state.cameras.length > 0 ? 
              `${state.cameras.length} camera${state.cameras.length > 1 ? 's' : ''} deployed` :
              "Add at least one camera to continue"
            }
          </div>
          <Button 
            onClick={handleNext}
            disabled={state.cameras.length === 0}
            className="bg-gradient-sacred"
          >
            Next: Team Setup
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </SetupLayout>
  );
};

export default CCTVSetup;