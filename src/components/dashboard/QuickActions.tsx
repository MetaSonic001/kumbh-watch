import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Radio, 
  Siren, 
  UserPlus, 
  MessageSquare,
  Send,
  AlertTriangle,
  Wifi,
  WifiOff,
  Camera,
  Video,
  Upload,
  Settings,
  Zap,
  Navigation
} from "lucide-react";
import { API_URL } from "@/config";

interface QuickActionsProps {
  onAction: (action: string, details: any) => void;
  isConnected: boolean;
}

const QuickActions = ({ onAction, isConnected }: QuickActionsProps) => {
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [emergencyLevel, setEmergencyLevel] = useState("HIGH");
  const [emergencyType, setEmergencyType] = useState("SECURITY");
  const [newPersonnel, setNewPersonnel] = useState({
    name: "",
    role: "",
    zone: ""
  });
  const [cameraConfig, setCameraConfig] = useState({
    cameraId: "",
    rtspUrl: "",
    threshold: 20
  });

  const getStatusText = () => {
    return isConnected ? "Connected" : "Disconnected";
  };

  const getStatusIcon = () => {
    return isConnected ? (
      <Wifi className="w-3 h-3 text-green-500" />
    ) : (
      <WifiOff className="w-3 h-3 text-red-500" />
    );
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error("Broadcast message cannot be empty");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/instructions?instructions=${encodeURIComponent(broadcastMessage)}&priority=${emergencyLevel.toUpperCase()}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast.success("Broadcast sent successfully");
        setBroadcastMessage("");
        onAction("broadcast", { message: broadcastMessage, priority: emergencyLevel });
      } else {
        throw new Error("Failed to send broadcast");
      }
    } catch (error) {
      toast.error("Failed to send broadcast");
      console.error(error);
    }
  };

  const handleEmergencyAlert = async () => {
    if (!emergencyMessage.trim()) {
      toast.error("Emergency message cannot be empty");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/emergency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          emergency_type: emergencyType,
          message: emergencyMessage,
          location: "Main Control Room",
          priority: emergencyLevel,
          camera_id: "control_room"
        })
      });

      if (response.ok) {
        toast.success("Emergency alert sent successfully");
        setEmergencyMessage("");
        onAction("emergency", { type: emergencyType, message: emergencyMessage, priority: emergencyLevel });
      } else {
        throw new Error("Failed to send emergency alert");
      }
    } catch (error) {
      toast.error("Failed to send emergency alert");
      console.error(error);
    }
  };

  const handleAddPersonnel = async () => {
    if (!newPersonnel.name.trim() || !newPersonnel.role.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // This would typically call your personnel management API
      toast.success("Personnel added successfully");
      setNewPersonnel({ name: "", role: "", zone: "" });
      onAction("add_personnel", newPersonnel);
    } catch (error) {
      toast.error("Failed to add personnel");
      console.error(error);
    }
  };

  const handleStartCamera = async () => {
    if (!cameraConfig.cameraId.trim() || !cameraConfig.rtspUrl.trim()) {
      toast.error("Please fill in all camera details");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/monitor/rtsp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          camera_id: cameraConfig.cameraId,
          rtsp_url: cameraConfig.rtspUrl,
          threshold: cameraConfig.threshold.toString()
        })
      });

      if (response.ok) {
        toast.success("Camera monitoring started successfully");
        setCameraConfig({ cameraId: "", rtspUrl: "", threshold: 20 });
        onAction("start_camera", cameraConfig);
      } else {
        throw new Error("Failed to start camera monitoring");
      }
    } catch (error) {
      toast.error("Failed to start camera monitoring");
      console.error(error);
    }
  };

  const handleSystemTest = async () => {
    try {
      const response = await fetch(`${API_URL}/status`);
      if (response.ok) {
        const status = await response.json();
        toast.success("System test completed successfully", {
          description: `${status.active_cameras ? Object.keys(status.active_cameras).length : 0} cameras active`
        });
        onAction("system_test", status);
      } else {
        throw new Error("System test failed");
      }
    } catch (error) {
      toast.error("System test failed");
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Indicator */}
      <div className="flex items-center gap-2 text-sm">
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>

      {/* Broadcast Message */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            Send Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Enter broadcast message"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              disabled={!isConnected}
              className="flex-1"
            />
            <Select 
              value={emergencyLevel} 
              onValueChange={setEmergencyLevel}
              disabled={!isConnected}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleBroadcast} 
            disabled={!isConnected}
            size="sm"
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Broadcast
          </Button>
        </CardContent>
      </Card>

      {/* Emergency Alert */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Siren className="w-4 h-4 text-destructive" />
            Emergency Alert
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={emergencyType} onValueChange={setEmergencyType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEDICAL">Medical</SelectItem>
                <SelectItem value="FIRE">Fire</SelectItem>
                <SelectItem value="SECURITY">Security</SelectItem>
                <SelectItem value="EVACUATION">Evacuation</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={emergencyLevel} onValueChange={setEmergencyLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Emergency message"
            value={emergencyMessage}
            onChange={(e) => setEmergencyMessage(e.target.value)}
            disabled={!isConnected}
          />
          <Button 
            onClick={handleEmergencyAlert} 
            disabled={!isConnected}
            size="sm"
            variant="destructive"
            className="w-full"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Send Emergency Alert
          </Button>
        </CardContent>
      </Card>

      {/* Camera Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Camera className="w-4 h-4 text-secondary" />
            Camera Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Camera ID"
            value={cameraConfig.cameraId}
            onChange={(e) => setCameraConfig(prev => ({ ...prev, cameraId: e.target.value }))}
            disabled={!isConnected}
          />
          <Input
            placeholder="RTSP URL"
            value={cameraConfig.rtspUrl}
            onChange={(e) => setCameraConfig(prev => ({ ...prev, rtspUrl: e.target.value }))}
            disabled={!isConnected}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Threshold"
              value={cameraConfig.threshold}
              onChange={(e) => setCameraConfig(prev => ({ ...prev, threshold: parseInt(e.target.value) || 20 }))}
              disabled={!isConnected}
              className="flex-1"
            />
            <Button 
              onClick={handleStartCamera} 
              disabled={!isConnected}
              size="sm"
              className="bg-secondary hover:bg-secondary/80"
            >
              <Video className="w-4 h-4 mr-2" />
              Start
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Smart Re-routing System */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Navigation className="w-4 h-4 text-orange-600" />
            Smart Re-routing System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
            <p className="text-xs text-orange-800 mb-3">
              🚨 <strong>Automatic Detection:</strong> System monitors all zones and automatically suggests re-routing when crowd density becomes unsafe.
            </p>
            <div className="space-y-2 text-xs text-orange-700">
              <div className="flex items-center gap-2">
                <span>🔴 Critical:</span>
                <span>90%+ occupancy - Immediate action required</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🟠 High:</span>
                <span>80%+ occupancy - Re-routing recommended</span>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => onAction("smart_re_routing", { action: "info" })}
            disabled={!isConnected}
            size="sm"
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
          >
            <Navigation className="w-4 h-4 mr-2" />
            View Smart Re-routing
          </Button>
        </CardContent>
      </Card>

      {/* System Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            System Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={handleSystemTest} 
              disabled={!isConnected}
              size="sm"
              variant="outline"
            >
              <Zap className="w-4 h-4 mr-2" />
              Test System
            </Button>
            <Button 
              onClick={() => onAction("refresh", {})}
              disabled={!isConnected}
              size="sm"
              variant="outline"
            >
              <Settings className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Personnel Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-accent" />
            Add Personnel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Name"
            value={newPersonnel.name}
            onChange={(e) => setNewPersonnel(prev => ({ ...prev, name: e.target.value }))}
            disabled={!isConnected}
          />
          <Input
            placeholder="Role"
            value={newPersonnel.role}
            onChange={(e) => setNewPersonnel(prev => ({ ...prev, role: e.target.value }))}
            disabled={!isConnected}
          />
          <Input
            placeholder="Zone (optional)"
            value={newPersonnel.zone}
            onChange={(e) => setNewPersonnel(prev => ({ ...prev, zone: e.target.value }))}
            disabled={!isConnected}
          />
          <Button 
            onClick={handleAddPersonnel} 
            disabled={!isConnected}
            size="sm"
            className="w-full bg-accent hover:bg-accent/80"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Personnel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickActions;