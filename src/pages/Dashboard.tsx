import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Camera,
  AlertTriangle,
  Users,
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
import AlertDeduplicationDemo from "@/components/dashboard/AlertDeduplicationDemo";
import { API_URL } from "@/config";
import backendService from "@/services/backendService";

const Dashboard = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    checkBackendConnection();
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
      if (result.status === 'success') {
        toast.success('Backend connection test successful!', { description: `Version: ${result.details.version}` });
      } else {
        toast.error('Backend connection test failed', { description: result.message });
      }
    } catch (error) {
      toast.error('Connection test failed', { description: 'Check console for details' });
    }
  };

  const testZonesEndpoint = async () => {
    try {
      const result = await backendService.testZonesEndpoint();
      if (result.status === 'success') {
        toast.success('Zones endpoint test successful!', { description: `Found ${result.details.zones_count} zones` });
      } else {
        toast.error('Zones endpoint test failed', { description: result.message });
      }
    } catch (error) {
      toast.error('Zones endpoint test failed', { description: 'Check console for details' });
    }
  };


  const handleAlertSent = (message: string) => {
    toast.success(`Alert sent: ${message}`);
  };

  const connectionStatus = isConnected
    ? { text: "Connected", color: "text-success", icon: "🟢" }
    : { text: "Disconnected", color: "text-destructive", icon: "🔴" };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto p-4 space-y-4">
        {/* Top Status & Stats Section */}
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
                    <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
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
                 <Button variant="outline" size="sm" onClick={testBackendConnection}>🧪 Test</Button>
                 <Button variant="outline" size="sm" onClick={testZonesEndpoint}>🗺️ Zones</Button>
            </div>
        </motion.div>
        
        <StatsCards />

        {/* --- MAIN RESPONSIVE GRID (MAP, ALERTS, RE-ROUTING) --- */}
        <div className="grid grid-cols-12 gap-4">

          {/* 1. Live Crowd Map (Primary Focus) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            // On mobile: full width. On desktop: half width.
            className="col-span-12 xl:col-span-6"
          >
            <Card className="h-[500px] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                  Live Crowd Map
                  <Badge variant="outline" className="ml-auto text-xs">Real-time</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-2">
                <LiveMap />
              </CardContent>
            </Card>
          </motion.div>

          {/* 2. Live Alerts */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            // On mobile: full width. On tablet: half width. On desktop: quarter width.
            className="col-span-12 md:col-span-6 xl:col-span-3"
          >
            <Card className="h-[500px] flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Live Alerts
                  <Badge variant="destructive" className="ml-auto text-xs">Active</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-3 overflow-y-auto">
                <AlertsPanel />
              </CardContent>
            </Card>
          </motion.div>

          {/* 3. Smart Re-Routing */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            // On mobile: full width. On tablet: half width. On desktop: quarter width.
            className="col-span-12 md:col-span-6 xl:col-span-3"
          >
            <Card className="h-[500px] flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-4 h-4 text-secondary" />
                  Smart Re-Routing
                  <Badge variant="outline" className="ml-auto text-xs">AI-Powered</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-3 overflow-y-auto">
                <SmartReRouting onAlertSent={handleAlertSent} />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* --- SECONDARY ROW (CCTV & CAMERA MANAGEMENT) --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 pt-4">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="xl:col-span-2"
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="w-4 h-4 text-primary" />
                  Live CCTV Feeds
                  <Badge variant="outline" className="ml-auto text-xs">
                    {systemStatus?.active_cameras ? Object.keys(systemStatus.active_cameras).length : 0} Active
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <CCTVPanel />
              </CardContent>
            </Card>
          </motion.div>

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
                  <Badge variant="outline" className="ml-auto text-xs">{isConnected ? 'Online' : 'Offline'}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 overflow-y-auto">
                <CameraManagement />
              </CardContent>
            </Card>
          </motion.div>
        </div>
        

      </main>
    </div>
  );
};

export default Dashboard;