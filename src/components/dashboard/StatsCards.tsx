import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Camera, 
  AlertTriangle, 
  Shield,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";

import { API_URL } from "@/config";

  interface Stat {
    title: string;
    value: string;
    icon: React.ReactNode;
    trend?: string;
    trendDirection?: "up" | "down";
  }

  const StatsCards = () => {
    const [stats, setStats] = useState<Stat[]>([
      {
        title: "Current Crowd",
        value: "0",
        icon: <Users className="w-6 h-6 text-primary" />,
        trend: "0%",
        trendDirection: "up"
      },
      {
        title: "Active Alerts",
        value: "0",
        icon: <AlertTriangle className="w-6 h-6 text-warning" />,
        trend: "0%",
        trendDirection: "down"
      },
      {
        title: "Active Cameras",
        value: "0",
        icon: <Camera className="w-6 h-6 text-secondary" />,
        trend: "0%",
        trendDirection: "up"
      },
      {
        title: "System Health",
        value: "Operational",
        icon: <Activity className="w-6 h-6 text-success" />
      }
    ]);

   useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_URL}/status`);
        const data = await response.json();
        
        const totalCrowd = Object.values(data.active_cameras || {}).reduce(
          (sum: number, cam: any) => sum + (cam.current_count || 0), 
          0
        );
        const activeCameras = Object.keys(data.active_cameras || {}).length;
        const activeAlerts = Object.values(data.active_cameras || {}).reduce(
          (count: number, cam: any) => count + (cam.current_count > cam.threshold ? 1 : 0), 
          0
        );

        setStats([
          {
            title: "Current Crowd",
            value: totalCrowd.toString(),
            icon: <Users className="w-6 h-6 text-primary" />,
            trend: data.crowd_trend ? `${data.crowd_trend}%` : "0%",
            trendDirection: data.crowd_trend >= 0 ? "up" : "down"
          },
          {
            title: "Active Alerts",
            value: activeAlerts.toString(),
            icon: <AlertTriangle className="w-6 h-6 text-warning" />,
            trend: data.alert_trend ? `${data.alert_trend}%` : "0%",
            trendDirection: data.alert_trend >= 0 ? "up" : "down"
          },
          {
            title: "Active Cameras",
            value: activeCameras.toString(),
            icon: <Camera className="w-6 h-6 text-secondary" />,
            trend: data.camera_trend ? `${data.camera_trend}%` : "0%",
            trendDirection: data.camera_trend >= 0 ? "up" : "down"
          },
          {
            title: "System Health",
            value: data.system_status || "Operational",
            icon: <Activity className="w-6 h-6 text-success" />
          }
        ]);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <Card className="hover:shadow-sacred transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">
                    {stat.title}
                  </p>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold">{stat.value}</p>
                    {/* No subtitle property in Stat type */}
                  </div>
                  <div className="flex items-center gap-1">
                    {stat.trendDirection === "up" ? (
                      <TrendingUp className="w-3 h-3 text-success" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-destructive" />
                    )}
                    <span 
                      className={`text-xs font-medium ${
                        stat.trendDirection === "up" ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {stat.trend}
                    </span>
                  </div>
                </div>
              

                {/* Live indicator for real-time stats */}
                {index === 0 && (
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">Live updates</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsCards;