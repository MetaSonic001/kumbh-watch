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
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { WS_URL, API_URL } from "@/config";

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
}

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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

        setAlerts(prev => [newAlert, ...prev.slice(0, 9)]); // Keep last 10 alerts
        setUnreadCount(prev => prev + 1);

        // Show toast for high priority alerts
        if (data.severity === 'CRITICAL' || data.severity === 'HIGH') {
          toast.error(data.message, {
            description: `Camera: ${data.camera_id || 'Unknown'}`,
            duration: 5000
          });
        }
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

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'THRESHOLD_BREACH':
      case 'LIVE_COUNT_UPDATE':
        return <Users className="w-4 h-4" />;
      case 'ANOMALY_ALERT':
        return <AlertTriangle className="w-4 h-4" />;
      case 'EMERGENCY_ALERT':
        return <Flame className="w-4 h-4" />;
      case 'FALLEN_PERSON':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-destructive text-destructive-foreground';
      case 'HIGH':
        return 'bg-warning text-warning-foreground';
      case 'MEDIUM':
        return 'bg-secondary text-secondary-foreground';
      case 'LOW':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'THRESHOLD_BREACH':
        return 'Threshold Breach';
      case 'LIVE_COUNT_UPDATE':
        return 'Count Update';
      case 'ANOMALY_ALERT':
        return 'Anomaly Detected';
      case 'EMERGENCY_ALERT':
        return 'Emergency';
      case 'HEATMAP_ALERT':
        return 'Heatmap Update';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleClearAll = () => {
    setAlerts([]);
    setUnreadCount(0);
  };

  const handleEmergencyResponse = async (alert: Alert) => {
    try {
      const response = await fetch(`${API_URL}/emergency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          emergency_type: 'SECURITY',
          message: `Response to: ${alert.message}`,
          location: alert.location?.description || 'Unknown location',
          priority: alert.severity,
          camera_id: alert.camera_id || 'unknown'
        })
      });

      if (response.ok) {
        toast.success('Emergency response initiated');
      } else {
        throw new Error('Failed to initiate response');
      }
    } catch (error) {
      toast.error('Failed to initiate emergency response');
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'} animate-pulse`}></div>
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearAll}
            className="h-6 px-2 text-xs"
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        <AnimatePresence>
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
            >
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No alerts yet</p>
              <p className="text-xs">Alerts will appear here in real-time</p>
            </motion.div>
          ) : (
            alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card className="border-l-4 border-l-primary hover:shadow-md transition-all duration-200">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <div className="mt-1">
                          {getAlertIcon(alert.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getSeverityColor(alert.severity)}`}
                            >
                              {getAlertTypeLabel(alert.type)}
                            </Badge>
                            
                            {alert.camera_id && (
                              <Badge variant="outline" className="text-xs">
                                Cam {alert.camera_id}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm font-medium leading-tight mb-1">
                            {alert.message}
                          </p>
                          
                          {alert.people_count !== undefined && (
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Count: {alert.people_count}</span>
                              {alert.threshold && (
                                <span>Threshold: {alert.threshold}</span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimestamp(alert.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {alert.severity === 'CRITICAL' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleEmergencyResponse(alert)}
                            className="h-6 px-2 text-xs"
                          >
                            Respond
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDismissAlert(alert.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="text-center py-2">
          <Badge variant="outline" className="text-destructive border-destructive">
            Reconnecting to backend...
          </Badge>
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;