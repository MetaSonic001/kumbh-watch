import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Wifi, 
  Server,
  Camera,
  Users,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";

const PerformanceMetrics = () => {
  const systemMetrics = [
    { 
      name: "API Response Time", 
      value: "127ms", 
      status: "good", 
      change: "-12ms",
      icon: Zap 
    },
    { 
      name: "Database Performance", 
      value: "98.7%", 
      status: "excellent", 
      change: "+0.3%",
      icon: Server 
    },
    { 
      name: "Network Uptime", 
      value: "99.9%", 
      status: "excellent", 
      change: "0.0%",
      icon: Wifi 
    },
    { 
      name: "CCTV System Health", 
      value: "96.2%", 
      status: "good", 
      change: "-1.2%",
      icon: Camera 
    }
  ];

  const resourceUsage = [
    { resource: "CPU Usage", current: 34, max: 100, unit: "%" },
    { resource: "Memory", current: 68, max: 100, unit: "%" },
    { resource: "Storage", current: 42, max: 100, unit: "%" },
    { resource: "Bandwidth", current: 156, max: 1000, unit: " Mbps" },
    { resource: "Active Connections", current: 1247, max: 5000, unit: "" },
    { resource: "Concurrent Users", current: 89, max: 200, unit: "" }
  ];

  const serviceStatus = [
    { service: "Authentication Service", status: "operational", uptime: "99.9%", lastCheck: "2 mins ago" },
    { service: "Video Streaming", status: "operational", uptime: "98.7%", lastCheck: "1 min ago" },
    { service: "Alert System", status: "operational", uptime: "99.8%", lastCheck: "30 secs ago" },
    { service: "Map Services", status: "degraded", uptime: "97.2%", lastCheck: "45 secs ago" },
    { service: "Analytics Engine", status: "operational", uptime: "99.1%", lastCheck: "1 min ago" },
    { service: "Notification Hub", status: "maintenance", uptime: "95.4%", lastCheck: "5 mins ago" }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "text-success bg-success/10 border-success";
      case "good": return "text-secondary bg-secondary/10 border-secondary";
      case "warning": return "text-warning bg-warning/10 border-warning";
      case "critical": return "text-destructive bg-destructive/10 border-destructive";
      default: return "text-muted-foreground bg-muted/10 border-muted";
    }
  };

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case "operational": return "bg-success";
      case "degraded": return "bg-warning";
      case "maintenance": return "bg-secondary";
      case "outage": return "bg-destructive";
      default: return "bg-muted";
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 70) return "bg-warning";
    if (percentage >= 50) return "bg-secondary";
    return "bg-success";
  };

  return (
    <div className="space-y-6">
      {/* System Metrics Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {systemMetrics.map((metric, index) => (
          <Card key={index} className={`border ${getStatusColor(metric.status)}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{metric.name}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <Badge variant="outline" className="text-xs">
                    {metric.change}
                  </Badge>
                </div>
                <metric.icon className="w-6 h-6 opacity-60" />
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Usage */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Resource Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resourceUsage.map((resource, index) => {
                  const percentage = resource.max ? (resource.current / resource.max) * 100 : 0;
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{resource.resource}</span>
                        <span className="text-sm text-muted-foreground">
                          {resource.current}{resource.unit}
                          {resource.max && ` / ${resource.max}${resource.unit}`}
                        </span>
                      </div>
                      
                      {resource.max && (
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${getUsageColor(percentage)}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                      )}
                      
                      {resource.max && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0{resource.unit}</span>
                          <span>{Math.round(percentage)}%</span>
                          <span>{resource.max}{resource.unit}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Service Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-secondary" />
                Service Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {serviceStatus.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getServiceStatusColor(service.status)}`}></div>
                      <div>
                        <p className="font-medium text-sm">{service.service}</p>
                        <p className="text-xs text-muted-foreground">
                          Uptime: {service.uptime}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs capitalize">
                        {service.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {service.lastCheck}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Real-time Performance Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              Real-time Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Current Load</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Active Sessions</span>
                    <span className="font-bold">1,247</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Requests/min</span>
                    <span className="font-bold">34,521</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Data Transfer</span>
                    <span className="font-bold">2.4 GB/h</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Response Times</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Dashboard Load</span>
                    <span className="font-bold text-success">0.8s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Map Rendering</span>
                    <span className="font-bold text-success">1.2s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">CCTV Stream</span>
                    <span className="font-bold text-warning">2.1s</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">System Health</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overall Score</span>
                    <Badge className="bg-success text-success-foreground">98%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Incident</span>
                    <span className="text-xs text-muted-foreground">3 days ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Maintenance</span>
                    <span className="text-xs text-muted-foreground">Scheduled: 2 AM</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PerformanceMetrics;