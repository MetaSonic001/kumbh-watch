import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  TrendingDown 
} from "lucide-react";
import { motion } from "framer-motion";

const AlertAnalytics = () => {
  const alertStats = [
    { type: "Critical", count: 12, resolved: 8, avgTime: "3.2 min", trend: "-15%" },
    { type: "High", count: 45, resolved: 39, avgTime: "5.8 min", trend: "+8%" },
    { type: "Medium", count: 134, resolved: 128, avgTime: "12.4 min", trend: "-5%" },
    { type: "Low", count: 287, resolved: 285, avgTime: "25.1 min", trend: "+2%" }
  ];

  const responseTeams = [
    { team: "Police Team Alpha", alerts: 23, avgResponse: "2.1 min", efficiency: 94 },
    { team: "Medical Emergency", alerts: 15, avgResponse: "3.4 min", efficiency: 89 },
    { team: "Security Beta", alerts: 31, avgResponse: "4.2 min", efficiency: 87 },
    { team: "Volunteer Coord", alerts: 42, avgResponse: "8.7 min", efficiency: 92 }
  ];

  const alertTrends = [
    { hour: "06:00", critical: 1, high: 3, medium: 8, low: 12 },
    { hour: "08:00", critical: 2, high: 7, medium: 15, low: 23 },
    { hour: "10:00", critical: 4, high: 12, medium: 24, low: 45 },
    { hour: "12:00", critical: 3, high: 9, medium: 18, low: 38 },
    { hour: "14:00", critical: 2, high: 6, medium: 12, low: 28 },
    { hour: "16:00", critical: 1, high: 4, medium: 9, low: 18 }
  ];

  const getSeverityColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "critical": return "text-destructive bg-destructive/10 border-destructive";
      case "high": return "text-warning bg-warning/10 border-warning";
      case "medium": return "text-secondary bg-secondary/10 border-secondary";
      case "low": return "text-success bg-success/10 border-success";
      default: return "text-muted-foreground bg-muted/10 border-muted";
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return "text-success";
    if (efficiency >= 80) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="space-y-6">
      {/* Alert Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {alertStats.map((stat, index) => (
          <Card key={index} className={`border ${getSeverityColor(stat.type)}`}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{stat.type}</h4>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total:</span>
                    <span className="font-bold">{stat.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Resolved:</span>
                    <span className="font-bold">{stat.resolved}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Time:</span>
                    <span className="font-bold">{stat.avgTime}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-current"
                      style={{ width: `${(stat.resolved / stat.count) * 100}%` }}
                    ></div>
                  </div>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {stat.trend}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Teams Performance */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                Team Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {responseTeams.map((team, index) => (
                  <div key={index} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{team.team}</h4>
                      <Badge variant="outline" className={getEfficiencyColor(team.efficiency)}>
                        {team.efficiency}%
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Alerts Handled</p>
                        <p className="font-bold">{team.alerts}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Response</p>
                        <p className="font-bold">{team.avgResponse}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            team.efficiency >= 90 ? 'bg-success' : 
                            team.efficiency >= 80 ? 'bg-warning' : 'bg-destructive'
                          }`}
                          style={{ width: `${team.efficiency}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alert Trends */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-primary" />
                Alert Trends (Today)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertTrends.map((trend, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-16 text-sm font-medium">
                      {trend.hour}
                    </div>
                    
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 flex rounded-full overflow-hidden h-4">
                        <div 
                          className="bg-destructive h-full"
                          style={{ width: `${(trend.critical / 10) * 100}%` }}
                        ></div>
                        <div 
                          className="bg-warning h-full"
                          style={{ width: `${(trend.high / 20) * 100}%` }}
                        ></div>
                        <div 
                          className="bg-secondary h-full"
                          style={{ width: `${(trend.medium / 30) * 100}%` }}
                        ></div>
                        <div 
                          className="bg-success h-full"
                          style={{ width: `${(trend.low / 50) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground w-12 text-right">
                      {trend.critical + trend.high + trend.medium + trend.low}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-destructive rounded-full"></div>
                  <span>Critical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-warning rounded-full"></div>
                  <span>High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-secondary rounded-full"></div>
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <span>Low</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AlertAnalytics;