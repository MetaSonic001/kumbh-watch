import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  Clock, 
  User,
  CheckCircle,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Alert {
  id: number;
  severity: "low" | "medium" | "high" | "critical";
  zone: string;
  type: string;
  time: string;
  description: string;
  acknowledged: boolean;
}

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 1,
      severity: "critical",
      zone: "Main Gate",
      type: "Crowd Surge",
      time: "2 mins ago",
      description: "Sudden crowd buildup detected",
      acknowledged: false
    },
    {
      id: 2,
      severity: "high",
      zone: "Har Ki Pauri",
      type: "Medical Emergency",
      time: "5 mins ago",
      description: "Medical assistance requested",
      acknowledged: false
    },
    {
      id: 3,
      severity: "medium",
      zone: "Ganga Ghat",
      type: "Equipment Issue",
      time: "12 mins ago",
      description: "CCTV camera offline",
      acknowledged: true
    },
    {
      id: 4,
      severity: "low",
      zone: "Medical Camp",
      type: "Routine Check",
      time: "18 mins ago",
      description: "Scheduled patrol completed",
      acknowledged: true
    },
    {
      id: 5,
      severity: "high",
      zone: "Entry Point 3",
      type: "Security Alert",
      time: "25 mins ago",
      description: "Unauthorized access attempt",
      acknowledged: false
    }
  ]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-warning text-warning-foreground";
      case "medium": return "bg-secondary text-secondary-foreground";
      case "low": return "bg-success text-success-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const acknowledgeAlert = (id: number) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, acknowledged: true } : alert
    ));
  };

  const dismissAlert = (id: number) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged).length;

  return (
    <div className="space-y-4">
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {unacknowledgedCount} unacknowledged
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="text-xs px-2 py-1">
            All
          </Button>
          <Button variant="ghost" size="sm" className="text-xs px-2 py-1">
            Critical
          </Button>
          <Button variant="ghost" size="sm" className="text-xs px-2 py-1">
            New
          </Button>
        </div>
      </div>

      {/* Alerts List */}
      <ScrollArea className="h-48">
        <div className="space-y-2">
          <AnimatePresence>
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`p-3 rounded-lg border transition-all duration-200 ${
                  alert.acknowledged 
                    ? 'bg-muted/50 border-border/50' 
                    : 'bg-card border-border shadow-sm hover:shadow-md'
                }`}
              >
                <div className="space-y-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`text-xs ${getSeverityColor(alert.severity)}`}
                      >
                        {getSeverityIcon(alert.severity)}
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {alert.zone}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {alert.time}
                    </span>
                  </div>

                  {/* Content */}
                  <div>
                    <p className="text-sm font-medium">{alert.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.description}
                    </p>
                  </div>

                  {/* Actions */}
                  {!alert.acknowledged && (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="text-xs h-6 px-2"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Acknowledge
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissAlert(alert.id)}
                        className="text-xs h-6 px-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  {alert.acknowledged && (
                    <div className="flex items-center gap-1 pt-1">
                      <CheckCircle className="w-3 h-3 text-success" />
                      <span className="text-xs text-success">Acknowledged</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
};

export default AlertsPanel;