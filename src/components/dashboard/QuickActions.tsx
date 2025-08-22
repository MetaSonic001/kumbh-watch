import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Radio, 
  Siren, 
  UserPlus, 
  MessageSquare,
  Send,
  AlertTriangle,
  Wifi,
  WifiOff
} from "lucide-react";
import { API_URL } from "@/config";

interface QuickActionsProps {
  onAction: (action: string, details: any) => void;
  isConnected: boolean; // Existing prop
}

const QuickActions = ({ onAction, isConnected }: QuickActionsProps) => {
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [emergencyLevel, setEmergencyLevel] = useState("low");
  const [newPersonnel, setNewPersonnel] = useState({
    name: "",
    role: "",
    zone: ""
  });

  // Modified to use isConnected
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

  const handleEmergencyConfirm = async () => {
    if (!emergencyMessage.trim()) {
      toast.error("Emergency message cannot be empty");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/emergency?emergency_type=EVACUATION&message=${encodeURIComponent(emergencyMessage)}&location=All&priority=CRITICAL`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast.success("Emergency alert sent successfully");
        setEmergencyMessage("");
        onAction("emergency", { message: emergencyMessage, type: "EVACUATION" });
      } else {
        throw new Error("Failed to send emergency alert");
      }
    } catch (error) {
      toast.error("Failed to send emergency alert");
      console.error(error);
    }
  };

  const handleAddPersonnel = () => {
    if (!newPersonnel.name || !newPersonnel.role || !newPersonnel.zone) {
      toast.error("Please fill all personnel fields");
      return;
    }

    onAction("addPersonnel", newPersonnel);
    toast.success(`Added ${newPersonnel.name} to ${newPersonnel.zone}`);
    setNewPersonnel({ name: "", role: "", zone: "" });
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
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Send Broadcast</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter broadcast message"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              disabled={!isConnected}
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
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleBroadcast} 
              disabled={!isConnected}
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Alert */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Siren className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium">Emergency Alert</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter emergency message"
              value={emergencyMessage}
              onChange={(e) => setEmergencyMessage(e.target.value)}
              disabled={!isConnected}
            />
            <Button 
              variant="destructive" 
              onClick={handleEmergencyConfirm}
              disabled={!isConnected}
              size="sm"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Send Alert
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Personnel */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Add Personnel</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Name"
              value={newPersonnel.name}
              onChange={(e) => setNewPersonnel({ ...newPersonnel, name: e.target.value })}
              disabled={!isConnected}
            />
            <Input
              placeholder="Role"
              value={newPersonnel.role}
              onChange={(e) => setNewPersonnel({ ...newPersonnel, role: e.target.value })}
              disabled={!isConnected}
            />
            <Input
              placeholder="Zone"
              value={newPersonnel.zone}
              onChange={(e) => setNewPersonnel({ ...newPersonnel, zone: e.target.value })}
              disabled={!isConnected}
            />
          </div>
          <Button 
            className="mt-2 w-full" 
            onClick={handleAddPersonnel}
            disabled={!isConnected}
            size="sm"
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