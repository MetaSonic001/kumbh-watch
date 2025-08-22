// Dashboard.tsx (updated)
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Camera, 
  AlertTriangle, 
  Users, 
  Radio,
  Bell,
  Shield,
  Activity,
  RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import LiveMap from "@/components/dashboard/LiveMap";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import CCTVPanel from "@/components/dashboard/CCTVPanel";
import QuickActions from "@/components/dashboard/QuickActions";
import StatsCards from "@/components/dashboard/StatsCards";
import CameraManagement from "@/components/dashboard/CameraManagement";
import { API_URL } from "@/config";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isConnected, setIsConnected] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    checkBackendConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkBackendConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/status`);
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
        setIsConnected(true);
        setLastUpdate(new Date());
      } else {
        throw new Error('Backend not responding');
      }
    } catch (error) {
      setIsConnected(false);
      console.error('Backend connection failed:', error);
    }
  };

  const handleQuickAction = (action: string, details: any) => {
    console.log(`Quick action triggered: ${action}`, details);
    
    switch (action) {
      case 'refresh':
        checkBackendConnection();
        toast.success('Dashboard refreshed');
        break;
      case 'start_camera':
        toast.success(`Camera ${details.cameraId} monitoring started`);
        break;
      case 'emergency':
        toast.success(`Emergency alert sent: ${details.message}`);
        break;
      case 'broadcast':
        toast.success(`Broadcast sent: ${details.message}`);
        break;
      default:
        toast.info(`Action: ${action}`);
    }
  };

  const getConnectionStatus = () => {
    if (isConnected) {
      return {
        text: "Connected",
        color: "text-success",
        icon: "🟢"
      };
    } else {
      return {
        text: "Disconnected",
        color: "text-destructive",
        icon: "🔴"
      };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Connection Status Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-card border rounded-lg"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{connectionStatus.icon}</span>
              <span className={`font-medium ${connectionStatus.color}`}>
                {connectionStatus.text}
              </span>
            </div>
            
            {systemStatus && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Active Cameras: {Object.keys(systemStatus.active_cameras || {}).length}</span>
                <span>Last Update: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={checkBackendConnection}
            disabled={isConnected}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isConnected ? '' : 'animate-spin'}`} />
            {isConnected ? 'Connected' : 'Reconnect'}
          </Button>
        </motion.div>

        {/* Stats Overview */}
        <StatsCards />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content - Live Map and CCTV */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="xl:col-span-3 space-y-6"
          >
            {/* Live Map */}
            <Card className="h-[400px]">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Live Crowd Map
                  <Badge variant="outline" className="ml-auto">
                    Real-time
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-80px)]">
                <LiveMap />
              </CardContent>
            </Card>

            {/* CCTV Feeds Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Live CCTV Feeds
                  <Badge variant="outline" className="ml-auto">
                    {systemStatus?.active_cameras ? Object.keys(systemStatus.active_cameras).length : 0} Active
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CCTVPanel />
              </CardContent>
            </Card>
          </motion.div>

          {/* Side Panels */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Alerts Panel */}
            <Card className="h-[400px]">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Live Alerts
                  <Badge variant="destructive" className="ml-auto">
                    Real-time
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-80px)] overflow-hidden">
                <AlertsPanel />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="h-[500px] overflow-y-auto">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-secondary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QuickActions 
                  onAction={handleQuickAction}
                  isConnected={isConnected}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Camera Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Camera Management
                <Badge variant="outline" className="ml-auto">
                  {isConnected ? 'Online' : 'Offline'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CameraManagement />
            </CardContent>
          </Card>
        </motion.div>

        {/* System Status Footer */}
        {systemStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {Object.keys(systemStatus.active_cameras || {}).length}
                    </div>
                    <div className="text-muted-foreground">Active Cameras</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary">
                      {systemStatus.websocket_connections?.alerts || 0}
                    </div>
                    <div className="text-muted-foreground">Alert Subscribers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">
                      {(() => {
                        if (systemStatus.websocket_connections?.frames) {
                          const frameCounts = Object.values(systemStatus.websocket_connections.frames);
                          return frameCounts.reduce((sum: number, count: any) => sum + (count as number), 0);
                        }
                        return 0;
                      })()}
                    </div>
                    <div className="text-muted-foreground">Frame Subscribers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">
                      {systemStatus.models_loaded ? '✅' : '❌'}
                    </div>
                    <div className="text-muted-foreground">AI Models</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;