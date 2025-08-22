import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Camera, 
  AlertTriangle, 
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { API_URL, WS_URL } from "@/config";

interface SystemStats {
  totalPeople: number;
  activeCameras: number;
  totalAlerts: number;
  systemUptime: number;
  anomalyCount: number;
  emergencyCount: number;
  thresholdBreaches: number;
  lastUpdate: string;
}

const StatsCards = () => {
  const [stats, setStats] = useState<SystemStats>({
    totalPeople: 0,
    activeCameras: 0,
    totalAlerts: 0,
    systemUptime: 0,
    anomalyCount: 0,
    emergencyCount: 0,
    thresholdBreaches: 0,
    lastUpdate: new Date().toISOString()
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [cameraData, setCameraData] = useState<{[key: string]: any}>({});
  const [livePeopleCounts, setLivePeopleCounts] = useState<{[cameraId: string]: number}>({});

  // Fetch system status periodically
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/status`);
        if (response.ok) {
          const data = await response.json();
          
          // Update camera data
          setCameraData(data.active_cameras || {});
          
          // Initialize live people counts from camera data
          const initialCounts: {[cameraId: string]: number} = {};
          Object.entries(data.active_cameras || {}).forEach(([cameraId, camera]: [string, any]) => {
            initialCounts[cameraId] = camera.current_count || 0;
          });
          setLivePeopleCounts(initialCounts);
          
          // Calculate total people across all cameras
          const totalPeople = Object.values(initialCounts).reduce(
            (sum: number, count: number) => sum + count, 0
          );
          
          // Update system stats
          setStats(prev => ({
            ...prev,
            totalPeople: totalPeople,
            activeCameras: Object.keys(data.active_cameras || {}).length,
            systemUptime: data.models_loaded ? 99.9 : 0,
            lastUpdate: new Date().toISOString()
          }));
          
          setIsConnected(true);
        } else {
          throw new Error('Failed to fetch status');
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setIsConnected(false);
      }
    };

    // Initial fetch
    fetchStatus();
    
    // Set up interval for status updates
    const interval = setInterval(fetchStatus, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Connect to alerts WebSocket for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/alerts`);

    ws.onopen = () => {
      console.log('StatsCards: Connected to alerts WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'PING' || data.type === 'CONNECTION_ESTABLISHED') {
          return;
        }

        // Update stats based on alert type
        setStats(prev => {
          let newStats = { ...prev };
          
          switch (data.type) {
            case 'THRESHOLD_BREACH':
              newStats.thresholdBreaches += 1;
              newStats.totalAlerts += 1;
              break;
            case 'ANOMALY_ALERT':
              newStats.anomalyCount += 1;
              newStats.totalAlerts += 1;
              break;
            case 'EMERGENCY_ALERT':
              newStats.emergencyCount += 1;
              newStats.totalAlerts += 1;
              break;
            case 'LIVE_COUNT_UPDATE':
              // Update live people count for this camera
              if (data.camera_id && data.current_count !== undefined) {
                console.log('StatsCards: LIVE_COUNT_UPDATE received:', {
                  camera_id: data.camera_id,
                  current_count: data.current_count,
                  previous_total: stats.totalPeople
                });
                
                setLivePeopleCounts(prev => {
                  const newCounts = { ...prev, [data.camera_id]: data.current_count as number };
                  
                  // Calculate new total
                  const newTotal = Object.values(newCounts).reduce(
                    (sum: number, count: number) => sum + count, 0
                  );
                  
                  console.log('StatsCards: Updated people counts:', {
                    newCounts,
                    newTotal,
                    previous_total: stats.totalPeople
                  });
                  
                  // Update total people in stats
                  newStats.totalPeople = newTotal;
                  
                  return newCounts;
                });
              }
              break;
          }
          
          return newStats;
        });
        
      } catch (error) {
        console.error('Error parsing alert message:', error);
      }
    };

    ws.onclose = () => {
      console.log('StatsCards: Alerts WebSocket disconnected');
    };

    return () => ws.close();
  }, []);

  // Update total people count whenever live counts change
  useEffect(() => {
    const totalPeople = Object.values(livePeopleCounts).reduce(
      (sum: number, count: number) => sum + count, 0
    );
    
    setStats(prev => ({
      ...prev,
      totalPeople: totalPeople
    }));
  }, [livePeopleCounts]);

  const cards = [
    {
      title: "Total People",
      value: stats.totalPeople.toLocaleString(),
      icon: Users,
      description: "Across all cameras",
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Active Cameras",
      value: stats.activeCameras,
      icon: Camera,
      description: "Monitoring streams",
      color: "text-secondary",
      bgColor: "bg-secondary/10"
    },
    {
      title: "Total Alerts",
      value: stats.totalAlerts,
      icon: AlertTriangle,
      description: "All time alerts",
      color: "text-warning",
      bgColor: "bg-warning/10"
    },
    {
      title: "System Uptime",
      value: stats.systemUptime >= 99.9 ? '99.9%' : `${stats.systemUptime.toFixed(1)}%`,
      icon: Zap,
      description: "AI models loaded",
      color: "text-success",
      bgColor: "bg-success/10"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'} animate-pulse`}></div>
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Live data from backend' : 'Connecting to backend...'}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Last update: {new Date(stats.lastUpdate).toLocaleTimeString()}
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Detail Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              System Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Badge variant="outline" className="mb-2">
                  {stats.anomalyCount}
                </Badge>
                <p className="text-xs text-muted-foreground">Anomalies Detected</p>
              </div>
              <div className="text-center">
                <Badge variant="destructive" className="mb-2">
                  {stats.emergencyCount}
                </Badge>
                <p className="text-xs text-muted-foreground">Emergency Alerts</p>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="mb-2">
                  {stats.thresholdBreaches}
                </Badge>
                <p className="text-xs text-muted-foreground">Threshold Breaches</p>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="mb-2">
                  {Object.keys(cameraData).length}
                </Badge>
                <p className="text-xs text-muted-foreground">Active Cameras</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default StatsCards;