// Dashboard.tsx (restructured for better layout)
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
import SmartReRouting from "@/components/dashboard/SmartReRouting";
import StatsCards from "@/components/dashboard/StatsCards";
import CameraManagement from "@/components/dashboard/CameraManagement";
import { API_URL } from "@/config";
import backendService from "@/services/backendService";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isConnected, setIsConnected] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
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

  const testBackendConnection = async () => {
    try {
      const result = await backendService.testConnection();
      console.log('🔍 Connection test result:', result);
      if (result.status === 'success') {
        toast.success('Backend connection test successful!', {
          description: `Version: ${result.details.version}`
        });
      } else {
        toast.error('Backend connection test failed', {
          description: result.message
        });
      }
    } catch (error) {
      toast.error('Connection test failed', {
        description: 'Check console for details'
      });
    }
  };

  const testZonesEndpoint = async () => {
    try {
      const result = await backendService.testZonesEndpoint();
      console.log('🔍 Zones endpoint test result:', result);
      if (result.status === 'success') {
        toast.success('Zones endpoint test successful!', {
          description: `Found ${result.details.zones_count} zones`
        });
      } else {
        toast.error('Zones endpoint test failed', {
          description: result.message
        });
      }
    } catch (error) {
      toast.error('Zones endpoint test failed', {
        description: 'Check console for details'
      });
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

  const handleAlertSent = (message: string) => {
    toast.success(`Alert sent: ${message}`);
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
      
      <div className="container mx-auto p-4 space-y-4">
        {/* Connection Status Bar - Compact */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 bg-card border rounded-lg"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">{connectionStatus.icon}</span>
              <span className={`font-medium text-sm ${connectionStatus.color}`}>
                {connectionStatus.text}
              </span>
            </div>
            {systemStatus && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Cameras: {Object.keys(systemStatus.active_cameras || {}).length}</span>
                <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={checkBackendConnection}>
              <RefreshCw className={`w-3 h-3 mr-1 ${!isConnected ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={testBackendConnection}>
              🧪 Test
            </Button>
            <Button variant="outline" size="sm" onClick={testZonesEndpoint}>
              🗺️ Zones
            </Button>
          </div>
        </motion.div>

        {/* Stats Overview - Compact */}
        <StatsCards />

        {/* Main Dashboard Grid - Optimized Layout */}
        <div className="grid grid-cols-12 gap-4">
          
          {/* Left Column - Map (Primary Focus) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="col-span-12 lg:col-span-7 xl:col-span-8"
          >
            <Card className="h-[500px]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                  Live Crowd Map
                  <Badge variant="outline" className="ml-auto text-xs">
                    Real-time
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-60px)] p-3">
                <LiveMap />
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column - Alerts & Re-routing */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="col-span-12 lg:col-span-5 xl:col-span-4 space-y-4"
          >
            
            {/* Alerts Panel - Top Priority */}
            <Card className="h-[240px]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Live Alerts
                  <Badge variant="destructive" className="ml-auto text-xs">
                    Active
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-50px)] p-3 overflow-hidden">
                <AlertsPanel />
              </CardContent>
            </Card>

            {/* Smart Re-Routing - Second Priority */}
            <Card className="h-[240px]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-4 h-4 text-secondary" />
                  Smart Re-Routing
                  <Badge variant="outline" className="ml-auto text-xs">
                    AI-Powered
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-50px)] p-3 overflow-y-auto">
                <SmartReRouting onAlertSent={handleAlertSent} />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Bottom Section - CCTV & Camera Management */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          
          {/* CCTV Feeds - Compact Version */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="h-auto">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="w-4 h-4 text-primary" />
                  Live CCTV Feeds
                  <Badge variant="outline" className="ml-auto text-xs">
                    {systemStatus?.active_cameras ? Object.keys(systemStatus.active_cameras).length : 0} Active
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-50px)] p-3">
                <CCTVPanel />
              </CardContent>
            </Card>
          </motion.div>

          {/* Camera Management - Compact Version */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="w-4 h-4 text-primary" />
                  Camera Management
                  <Badge variant="outline" className="ml-auto text-xs">
                    {isConnected ? 'Online' : 'Offline'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className=" p-3 overflow-y-auto">
                <CameraManagement />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* System Status Footer - Compact */}
        {systemStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-primary">
                      {Object.keys(systemStatus.active_cameras || {}).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Active Cameras</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-secondary">
                      {systemStatus.websocket_connections?.alerts || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Alert Subscribers</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-accent">
                      {systemStatus.websocket_connections?.frames ?
                        Object.values(systemStatus.websocket_connections.frames as Record<string, number>).reduce((sum: number, count: number) => sum + count, 0) :
                        0
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">Frame Subscribers</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-success">
                      {systemStatus.models_loaded ? '✅' : '❌'}
                    </div>
                    <div className="text-xs text-muted-foreground">AI Models</div>
                  </div>
                </div>
                
                {/* System Info - Single Line */}
                <div className="mt-3 pt-3 border-t flex justify-center gap-6 text-xs text-muted-foreground">
                  <span>Python: {systemStatus.system_info?.python_version || 'Unknown'}</span>
                  <span>OpenCV: {systemStatus.system_info?.opencv_version || 'Unknown'}</span>
                  <span>CUDA: {systemStatus.system_info?.torch_available ? '✅' : '❌'}</span>
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