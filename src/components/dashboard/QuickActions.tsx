import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Radio, 
  AlertTriangle, 
  Users, 
  Siren,
  MessageSquare,
  Shield,
  Activity,
  Phone,
  Zap,
  Volume2,
  Send,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface EnhancedQuickActionsProps {
  onAction: (actionType: string, message: string, zones?: string[], priority?: string) => void;
  isConnected: boolean;
  wsStatus?: 'connected' | 'disconnected' | 'connecting';
}

const EnhancedQuickActions: React.FC<EnhancedQuickActionsProps> = ({ 
  onAction, 
  isConnected,
  wsStatus = 'disconnected'
}) => {
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [emergencyLevel, setEmergencyLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isLoading, setIsLoading] = useState(false);

  const zones = [
    "All Zones",
    "Har Ki Pauri", 
    "Ganga Ghat", 
    "Main Gate", 
    "Medical Camp", 
    "Parking Area", 
    "Food Court",
    "VIP Area",
    "Security Zone",
    "Emergency Exit"
  ];

  const actions = [
    {
      id: "emergency_broadcast",
      label: "Emergency Broadcast",
      icon: Radio,
      color: "bg-red-600 hover:bg-red-700 text-white",
      description: "Send critical alert to all teams",
      requiresConfirmation: true,
      emergencyLevel: "critical",
      pulseAnimation: true
    },
    {
      id: "evacuation",
      label: "Evacuation Protocol",
      icon: Users,
      color: "bg-orange-600 hover:bg-orange-700 text-white",
      description: "Activate evacuation procedures",
      requiresConfirmation: true,
      emergencyLevel: "high",
      pulseAnimation: false
    },
    {
      id: "medical",
      label: "Medical Alert",
      icon: Activity,
      color: "bg-blue-600 hover:bg-blue-700 text-white",
      description: "Request medical assistance",
      requiresConfirmation: false,
      emergencyLevel: "high",
      pulseAnimation: false
    },
    {
      id: "security",
      label: "Security Alert",
      icon: Shield,
      color: "bg-purple-600 hover:bg-purple-700 text-white",
      description: "Deploy security teams",
      requiresConfirmation: false,
      emergencyLevel: "medium",
      pulseAnimation: false
    },
    {
      id: "public_announcement",
      label: "Public Announcement",
      icon: MessageSquare,
      color: "bg-green-600 hover:bg-green-700 text-white",
      description: "Broadcast to visitors",
      requiresConfirmation: false,
      emergencyLevel: "low",
      pulseAnimation: false
    },
    {
      id: "alarm",
      label: "Sound Alarm",
      icon: Siren,
      color: "bg-red-700 hover:bg-red-800 text-white",
      description: "Activate emergency sirens",
      requiresConfirmation: true,
      emergencyLevel: "critical",
      pulseAnimation: true
    }
  ];

  const quickActions = [
    {
      id: "crowd_control",
      label: "Crowd Control",
      icon: Users,
      description: "Deploy crowd control measures",
      color: "hover:bg-blue-50"
    },
    {
      id: "traffic_alert",
      label: "Traffic Alert", 
      icon: AlertTriangle,
      description: "Alert traffic management",
      color: "hover:bg-yellow-50"
    },
    {
      id: "power_alert",
      label: "Power Alert",
      icon: Zap,
      description: "Report power issues",
      color: "hover:bg-red-50"
    },
    {
      id: "maintenance",
      label: "Maintenance Request",
      icon: Activity,
      description: "Request maintenance support",
      color: "hover:bg-green-50"
    }
  ];

  const handleAction = async (
    actionId: string, 
    label: string, 
    requiresConfirmation: boolean,
    emergencyLevel: string
  ) => {
    if (!isConnected) {
      toast.error("System not connected. Unable to send commands.", {
        description: "Check network connection and try again"
      });
      return;
    }

    if (requiresConfirmation) {
      if (actionId === "emergency_broadcast") {
        setShowBroadcastDialog(true);
        setBroadcastMessage(`URGENT: ${label} activated at ${new Date().toLocaleTimeString()}`);
      } else {
        setShowEmergencyDialog(true);
        setEmergencyMessage(`${label} - Immediate action required`);
      }
    } else {
      setIsLoading(true);
      try {
        await onAction(
          actionId, 
          `${label} - ${new Date().toLocaleTimeString()}`,
          [],
          emergencyLevel
        );
        
        // Show appropriate toast based on action
        switch (actionId) {
          case "medical":
            toast.success("🚑 Medical alert sent to emergency response teams", {
              description: "ETA: 3-5 minutes • All medical units notified",
              duration: 8000
            });
            break;
          case "security":
            toast.success("🛡️ Security teams have been notified and deployed", {
              description: "Response teams en route • Estimated arrival: 2-3 minutes",
              duration: 6000
            });
            break;
          case "public_announcement":
            toast.success("📢 Public announcement system activated", {
              description: "Message broadcast to all zones • Speakers operational",
              duration: 5000
            });
            break;
          default:
            toast.success(`✅ ${label} activated successfully`, {
              description: `Command executed at ${new Date().toLocaleTimeString()}`
            });
        }
      } catch (error) {
        toast.error(`❌ Failed to execute ${label}`, {
          description: "Please try again or contact support"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error("Please enter a broadcast message");
      return;
    }

    if (selectedZones.length === 0) {
      toast.error("Please select at least one zone");
      return;
    }

    setIsLoading(true);
    try {
      await onAction(
        "emergency_broadcast", 
        broadcastMessage,
        selectedZones.includes("All Zones") ? zones.slice(1) : selectedZones,
        emergencyLevel
      );
      
      setShowBroadcastDialog(false);
      setBroadcastMessage("");
      setSelectedZones([]);
      
      toast.success("🚨 Emergency broadcast sent successfully", {
        description: `Message sent to ${selectedZones.includes("All Zones") ? "all zones" : `${selectedZones.length} zones`}`,
        duration: 8000
      });
    } catch (error) {
      toast.error("❌ Failed to send emergency broadcast", {
        description: "Check connection and try again"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyConfirm = async () => {
    if (!emergencyMessage.trim()) {
      toast.error("Please enter emergency details");
      return;
    }

    setIsLoading(true);
    try {
      await onAction("emergency_protocol", emergencyMessage, [], "critical");
      setShowEmergencyDialog(false);
      setEmergencyMessage("");
      
      toast.success("🚨 Emergency protocol activated", {
        description: "All relevant teams have been notified",
        duration: 10000
      });
    } catch (error) {
      toast.error("❌ Failed to activate emergency protocol");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (actionId: string, label: string) => {
    if (!isConnected) {
      toast.error("System not connected", {
        description: "Check network connection"
      });
      return;
    }

    setIsLoading(true);
    try {
      await onAction(actionId, `Quick action: ${label}`, [], "low");
      
      const actionMessages = {
        crowd_control: "👥 Crowd control teams have been alerted",
        traffic_alert: "🚗 Traffic management team notified",
        power_alert: "⚡ Power management team dispatched", 
        maintenance: "🔧 Maintenance request submitted"
      };
      
      toast.info(actionMessages[actionId as keyof typeof actionMessages] || `${label} request sent`, {
        description: `Request processed at ${new Date().toLocaleTimeString()}`
      });
    } catch (error) {
      toast.error(`❌ Failed to execute ${label}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleZone = (zone: string) => {
    if (zone === "All Zones") {
      setSelectedZones(selectedZones.length === zones.length ? [] : [...zones]);
    } else {
      setSelectedZones(prev => 
        prev.includes(zone) 
          ? prev.filter(z => z !== zone)
          : [...prev, zone]
      );
    }
  };

  const getStatusIcon = () => {
    switch (wsStatus) {
      case 'connected':
        return <Wifi className="w-3 h-3 text-green-500" />;
      case 'connecting':
        return <Wifi className="w-3 h-3 text-yellow-500 animate-pulse" />;
      default:
        return <WifiOff className="w-3 h-3 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (wsStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      default:
        return 'Disconnected';
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-xs font-medium">{getStatusText()}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Main Emergency Actions */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Siren className="w-3 h-3" />
            Emergency Actions
          </h4>
          
          <div className="space-y-2">
            {actions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="relative"
              >
                <Button
                  variant="outline"
                  disabled={!isConnected || isLoading}
                  className={`w-full justify-start p-3 h-auto ${action.color} border-0 text-left group relative overflow-hidden transition-all duration-200 hover:shadow-lg`}
                  onClick={() => handleAction(
                    action.id, 
                    action.label, 
                    action.requiresConfirmation,
                    action.emergencyLevel
                  )}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="p-1.5 bg-white/20 rounded-md">
                      <action.icon className="w-4 h-4 flex-shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{action.label}</p>
                        {action.requiresConfirmation && (
                          <Badge variant="outline" className="text-xs bg-white/20 border-white/30 px-1.5 py-0">
                            Confirm
                          </Badge>
                        )}
                        {action.emergencyLevel === 'critical' && (
                          <AlertCircle className="w-3 h-3 text-white animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs opacity-90 truncate">
                        {action.description}
                      </p>
                    </div>
                    <Clock className="w-3 h-3 opacity-60" />
                  </div>
                  
                  {/* Pulse effect for critical actions */}
                  {action.pulseAnimation && isConnected && (
                    <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-3 h-3" />
            Quick Actions
          </h4>
          
          <div className="grid grid-cols-1 gap-1.5">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Button
                  variant="ghost"
                  disabled={!isConnected || isLoading}
                  onClick={() => handleQuickAction(action.id, action.label)}
                  className={`justify-start h-10 text-xs px-3 w-full transition-colors ${action.color}`}
                >
                  <action.icon className="w-3 h-3 mr-2" />
                  <span className="flex-1 text-left">{action.label}</span>
                  <CheckCircle2 className="w-3 h-3 opacity-40" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Emergency Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-lg border border-red-200 dark:border-red-800"
        >
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Phone className="w-4 h-4 text-red-800" />
              <p className="text-sm font-medium">Emergency Hotline</p>
            </div>
            <p className="text-2xl font-bold text-red-600">108</p>
            <p className="text-xs text-muted-foreground">
              24/7 Emergency Services • Always Available
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2 border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => window.open('tel:108')}
            >
              <Phone className="w-3 h-3 mr-1" />
              Call Now
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Emergency Broadcast Dialog */}
      <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Radio className="w-5 h-5" />
              Emergency Broadcast
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Emergency Level</label>
              <Select value={emergencyLevel} onValueChange={(value: any) => setEmergencyLevel(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low Priority</SelectItem>
                  <SelectItem value="medium">🟡 Medium Priority</SelectItem>
                  <SelectItem value="high">🟠 High Priority</SelectItem>
                  <SelectItem value="critical">🔴 Critical Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Target Zones</label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {zones.map((zone) => (
                  <Button
                    key={zone}
                    variant={selectedZones.includes(zone) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleZone(zone)}
                    className="text-xs"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    {zone}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Broadcast Message</label>
              <Textarea
                placeholder="Enter emergency broadcast message..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="min-h-20"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowBroadcastDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBroadcast}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Broadcast
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Emergency Confirmation Dialog */}
      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirm Emergency Action
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-300">
                ⚠️ This action will trigger immediate emergency protocols. 
                All relevant teams will be automatically notified.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Emergency Details</label>
              <Textarea
                placeholder="Describe the emergency situation..."
                value={emergencyMessage}
                onChange={(e) => setEmergencyMessage(e.target.value)}
                className="min-h-16"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowEmergencyDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEmergencyConfirm}
                disabled={isLoading}
                className="bg-red-800 hover:bg-red-700 text-white"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mr-2" />
                )}
                Confirm Emergency
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedQuickActions;