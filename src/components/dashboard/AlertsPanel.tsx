import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertTriangle, 
  Users, 
  Flame, 
  UserCheck, 
  Bell,
  X,
  ExternalLink,
  Clock,
  Shield,
  Info,
  Camera
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { WS_URL, API_URL } from "@/config";
import { alertService, AlertData } from "@/services/alertService";

interface Alert {
  id: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
  camera_id?: string;
  people_count?: number;
  threshold?: number;
  location?: any;
  anomaly_type?: string;
  hash?: string;
  deduplicationStatus?: {
    shouldSend: boolean;
    reason: string;
    isDuplicate: boolean;
  };
}

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [deduplicationStats, setDeduplicationStats] = useState({
    totalAlerts: 0,
    uniqueTypes: 0,
    blockedDuplicates: 0
  });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket(`${WS_URL}/ws/alerts`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to alerts WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'PING' || data.type === 'CONNECTION_ESTABLISHED') {
          return; // Skip ping messages
        }

        const newAlert: Alert = {
          id: data.id || `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: data.type,
          severity: data.severity || 'MEDIUM',
          message: data.message || 'No message provided',
          timestamp: data.timestamp || new Date().toISOString(),
          camera_id: data.camera_id,
          people_count: data.people_count,
          threshold: data.threshold,
          location: data.location,
          anomaly_type: data.anomaly_type
        };

        // Check if alert should be sent (deduplication)
        const dedupResult = alertService.shouldSendAlert(newAlert);
        const isDuplicate = !dedupResult.shouldSend;
        
        newAlert.deduplicationStatus = {
          shouldSend: dedupResult.shouldSend,
          reason: dedupResult.reason,
          isDuplicate
        };

        if (dedupResult.shouldSend) {
          // Mark alert as sent in the service
          alertService.markAlertSent(newAlert);
  
          // Add to alerts list (ONLY non-duplicates)
          setAlerts(prev => [newAlert, ...prev.slice(0, 9)]); // Keep last 10 alerts
          setUnreadCount(prev => prev + 1);

          // Show toast for high priority alerts
          if (data.severity === 'CRITICAL' || data.severity === 'HIGH') {
            toast.error(data.message, {
              description: `Camera: ${data.camera_id || 'Unknown'}`,
              duration: 5000
            });
          }
        } else {
          // Log blocked duplicate - DON'T add to UI
          console.log(`🚫 Duplicate alert blocked: ${newAlert.type} (${newAlert.camera_id || 'unknown'}) - ${dedupResult.reason}`);
          // Note: We're NOT adding duplicates to the alerts list anymore
        }

        // Update deduplication stats
        updateDeduplicationStats();
        
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from alerts WebSocket');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Update deduplication statistics
  const updateDeduplicationStats = () => {
    const stats = alertService.getAlertStats();
  
    setDeduplicationStats({
      totalAlerts: stats.totalAlerts,
      uniqueTypes: stats.uniqueTypes,
      blockedDuplicates: 0 // blockedDuplicates not available in stats, set to 0 or update service
    });
  };

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(updateDeduplicationStats, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [alerts]);

  const clearAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
    setUnreadCount(0);
    toast.success('All alerts cleared');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'HIGH':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'LOW':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'crowd_density':
        return <Users className="w-4 h-4" />;
      case 'anomaly':
        return <AlertTriangle className="w-4 h-4" />;
      case 'fire':
        return <Flame className="w-4 h-4" />;
      case 'unauthorized':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Stats */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {unreadCount} New
          </Badge>
          {deduplicationStats.blockedDuplicates > 0 && (
            <Badge variant="secondary" className="text-xs">
              🚫 {deduplicationStats.blockedDuplicates} Blocked
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllAlerts}
            className="h-6 px-2 text-xs"
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Deduplication Info */}
      {deduplicationStats.totalAlerts > 0 && (
        <div className="mb-3 p-2 bg-muted/50 rounded-md text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>Deduplication Active</span>
            <span>•</span>
            <span>{deduplicationStats.uniqueTypes} unique alerts</span>
            <span>•</span>
            <span>{deduplicationStats.blockedDuplicates} duplicates blocked</span>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        <AnimatePresence>
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground py-8"
            >
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No alerts at the moment</p>
              <p className="text-xs">System is monitoring for any issues</p>
            </motion.div>
          ) : (
            alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative p-3 rounded-lg border transition-all bg-card hover:bg-muted/50"

              >
               

                {/* Alert Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getAlertIcon(alert.type)}
                    <span className="font-medium text-sm">{alert.type.replace(/_/g, ' ')}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getSeverityColor(alert.severity)}`}
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearAlert(alert.id)}
                    className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                {/* Alert Message */}
                <p className="text-sm text-foreground mb-2">{alert.message}</p>

                {/* Alert Details */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    {alert.camera_id && (
                      <span className="flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        {alert.camera_id}
                      </span>
                    )}
                    {alert.people_count && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {alert.people_count} people
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Connection Status */}
      <div className="mt-3 pt-2 border-t">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          <span className="text-muted-foreground">
            {alerts.length} alerts
          </span>
        </div>
      </div>
    </div>
  );
};

export default AlertsPanel;