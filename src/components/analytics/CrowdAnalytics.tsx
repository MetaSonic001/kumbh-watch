import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  Clock,
  MapPin 
} from "lucide-react";
import { motion } from "framer-motion";

const CrowdAnalytics = () => {
  const hourlyData = [
    { hour: "6 AM", count: 125000, change: "+12%" },
    { hour: "8 AM", count: 340000, change: "+45%" },
    { hour: "10 AM", count: 890000, change: "+28%" },
    { hour: "12 PM", count: 1240000, change: "+15%" },
    { hour: "2 PM", count: 1450000, change: "+8%" },
    { hour: "4 PM", count: 1380000, change: "-5%" },
    { hour: "6 PM", count: 1180000, change: "-14%" },
    { hour: "8 PM", count: 650000, change: "-25%" }
  ];

  const zoneData = [
    { zone: "Har Ki Pauri", current: 450000, peak: 520000, capacity: 600000, status: "high" },
    { zone: "Main Gate", current: 180000, peak: 200000, capacity: 250000, status: "medium" },
    { zone: "Ganga Ghat", current: 320000, peak: 380000, capacity: 400000, status: "high" },
    { zone: "Medical Camp", current: 15000, peak: 18000, capacity: 50000, status: "low" },
    { zone: "Parking Area", current: 8000, peak: 12000, capacity: 30000, status: "low" }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "high": return "text-warning";
      case "medium": return "text-secondary";
      case "low": return "text-success";
      case "critical": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getCapacityPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Hourly Crowd Trends */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Hourly Crowd Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hourlyData.map((data, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-primary rounded-full" style={{
                      height: `${Math.max(8, (data.count / 1500000) * 32)}px`
                    }}></div>
                    <div>
                      <p className="font-medium">{data.hour}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.count.toLocaleString()} people
                      </p>
                    </div>
                  </div>
                  <Badge variant={data.change.startsWith('+') ? 'default' : 'secondary'}>
                    {data.change}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Zone-wise Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-secondary" />
              Zone Capacity Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {zoneData.map((zone, index) => (
                <div key={index} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{zone.zone}</h4>
                    <Badge variant="outline" className={getStatusColor(zone.status)}>
                      {zone.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Current: {zone.current.toLocaleString()}</span>
                      <span>Peak: {zone.peak.toLocaleString()}</span>
                    </div>
                    
                    {/* Capacity bar */}
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          getCapacityPercentage(zone.current, zone.capacity) > 80 
                            ? 'bg-destructive' 
                            : getCapacityPercentage(zone.current, zone.capacity) > 60 
                            ? 'bg-warning' 
                            : 'bg-success'
                        }`}
                        style={{ 
                          width: `${getCapacityPercentage(zone.current, zone.capacity)}%` 
                        }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0</span>
                      <span>{getCapacityPercentage(zone.current, zone.capacity)}% capacity</span>
                      <span>{zone.capacity.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Prediction Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="lg:col-span-2"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              AI Crowd Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-gradient-sacred text-primary-foreground">
                <h4 className="font-semibold mb-2">Next Hour</h4>
                <p className="text-2xl font-bold">1.6M</p>
                <p className="text-sm opacity-90">Expected increase of 12%</p>
              </div>
              
              <div className="p-4 rounded-lg bg-warning/10 border border-warning">
                <h4 className="font-semibold mb-2 text-warning">Critical Zones</h4>
                <p className="text-2xl font-bold text-warning">3</p>
                <p className="text-sm text-muted-foreground">Likely to exceed capacity</p>
              </div>
              
              <div className="p-4 rounded-lg bg-secondary/10 border border-secondary">
                <h4 className="font-semibold mb-2 text-secondary">Peak Time</h4>
                <p className="text-2xl font-bold text-secondary">2:30 PM</p>
                <p className="text-sm text-muted-foreground">Expected daily peak</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default CrowdAnalytics;