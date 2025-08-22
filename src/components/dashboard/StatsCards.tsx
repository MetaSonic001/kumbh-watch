import { Card, CardContent } from "@/components/ui/card";
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

const StatsCards = () => {
  const stats = [
    {
      title: "Current Crowd",
      value: "1.2M",
      subtitle: "Live count",
      trend: "+5.2%",
      trendUp: true,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Active CCTV",
      value: "248",
      subtitle: "Of 250 total",
      trend: "99.2%",
      trendUp: true,
      icon: Camera,
      color: "text-secondary",
      bgColor: "bg-secondary/10"
    },
    {
      title: "Active Alerts",
      value: "23",
      subtitle: "3 critical",
      trend: "-2",
      trendUp: false,
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning/10"
    },
    {
      title: "Teams Deployed",
      value: "156",
      subtitle: "All zones covered",
      trend: "+12",
      trendUp: true,
      icon: Shield,
      color: "text-success",
      bgColor: "bg-success/10"
    }
  ];

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
                    <p className="text-xs text-muted-foreground">
                      {stat.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {stat.trendUp ? (
                      <TrendingUp className="w-3 h-3 text-success" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-destructive" />
                    )}
                    <span 
                      className={`text-xs font-medium ${
                        stat.trendUp ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {stat.trend}
                    </span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>

              {/* Live indicator for real-time stats */}
              {index === 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">Live updates</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsCards;