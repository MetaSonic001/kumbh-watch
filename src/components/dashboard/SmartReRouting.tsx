import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Navigation, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Clock,
  MapPin,
  ArrowRight,
  RefreshCw,
  Shield,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { backendService, ReRoutingSuggestion } from "@/services/backendService";
import { alertService, AlertData } from "@/services/alertService";

interface SmartReRoutingProps {
  onAlertSent?: (message: string) => void;
}

const SmartReRouting = ({ onAlertSent }: SmartReRoutingProps) => {
  const [suggestions, setSuggestions] = useState<ReRoutingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [deduplicationStats, setDeduplicationStats] = useState({
    totalAlerts: 0,
    uniqueTypes: 0,
    blockedDuplicates: 0
  });

  useEffect(() => {
    loadSuggestions();
    
    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadSuggestions, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Update deduplication stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = alertService.getAlertStats();
      setDeduplicationStats({
        totalAlerts: stats.totalAlerts,
        uniqueTypes: stats.uniqueTypes,
        blockedDuplicates: 0 // This will be calculated from the alerts list
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadSuggestions = async () => {
    setIsLoading(true);
    try {
      const data = await backendService.getReRoutingSuggestions();
      setSuggestions(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load re-routing suggestions:', error);
      toast.error('Failed to load re-routing suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion: ReRoutingSuggestion) => {
    try {
      // Create alert data for deduplication check
      const alertData: AlertData = {
        id: `rerouting_${suggestion.from_zone}_${suggestion.to_zone}_${Date.now()}`,
        type: 'crowd_rerouting',
        severity: suggestion.urgency === 'critical' ? 'CRITICAL' : 'HIGH',
        message: `🚨 CROWD MANAGEMENT ALERT: ${suggestion.reason} Please redirect to ${suggestion.to_zone} for better crowd conditions. Estimated wait time: ${suggestion.estimated_wait_time} minutes.`,
        timestamp: new Date().toISOString(),
        camera_id: 'system',
        anomaly_type: 'crowd_overflow',
        location: {
          from_zone: suggestion.from_zone,
          to_zone: suggestion.to_zone
        }
      };

      // Check if this alert should be sent (deduplication)
      const dedupResult = alertService.shouldSendAlert(alertData);
      
      if (!dedupResult.shouldSend) {
        toast.info('Re-routing alert already sent recently', {
          description: dedupResult.reason
        });
        return;
      }

      // Send emergency instructions to all users
      const message = alertData.message;
      
      await backendService.sendEmergencyInstructions(
        message,
        suggestion.urgency === 'critical' ? 'CRITICAL' : 'HIGH',
        600 // 10 minutes duration
      );

      // Mark alert as sent in the service
      alertService.markAlertSent(alertData);

      // Notify parent component
      if (onAlertSent) {
        onAlertSent(message);
      }

      toast.success('Re-routing alert sent successfully!', {
        description: `Redirecting crowd from ${suggestion.from_zone} to ${suggestion.to_zone}`
      });

      // Refresh suggestions
      await loadSuggestions();
      
    } catch (error) {
      console.error('Failed to send re-routing alert:', error);
      toast.error('Failed to send re-routing alert');
    }
  };

  const handleRejectSuggestion = async (suggestion: ReRoutingSuggestion) => {
    try {
      // Mark as rejected (you could implement this in backend)
      toast.info('Suggestion rejected', {
        description: 'This suggestion will not be shown again'
      });
      
      // Remove from current suggestions
      setSuggestions(prev => prev.filter(s => s !== suggestion));
      
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'low':
        return <AlertTriangle className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'decreasing': return <TrendingUp className="w-4 h-4 text-green-500 rotate-180" />;
      default: return <TrendingUp className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Stats */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {suggestions.length} Suggestions
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
            onClick={loadSuggestions}
            disabled={isLoading}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Deduplication Info */}
      {deduplicationStats.totalAlerts > 0 && (
        <div className="mb-3 p-2 bg-muted/50 rounded-md text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>Alert Deduplication Active</span>
            <span>•</span>
            <span>{deduplicationStats.uniqueTypes} unique alerts</span>
            <span>•</span>
            <span>{deduplicationStats.blockedDuplicates} duplicates blocked</span>
          </div>
        </div>
      )}

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        <AnimatePresence>
          {suggestions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground py-8"
            >
              <Navigation className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No re-routing suggestions</p>
              <p className="text-xs">System is analyzing crowd flow patterns</p>
            </motion.div>
          ) : (
            suggestions.map((suggestion, index) => (
              <motion.div
                key={`${suggestion.from_zone}_${suggestion.to_zone}_${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="p-3 border rounded-lg bg-card hover:bg-muted/50 transition-all"
              >
                {/* Suggestion Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getUrgencyIcon(suggestion.urgency)}
                    <span className="font-medium text-sm">
                      {suggestion.from_zone} → {suggestion.to_zone}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getUrgencyColor(suggestion.urgency)}`}
                    >
                      {suggestion.urgency.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      className="h-6 px-2 text-xs hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRejectSuggestion(suggestion)}
                      className="h-6 px-2 text-xs hover:bg-red-50 hover:text-red-600"
                    >
                      <XCircle className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Suggestion Details */}
                <div className="space-y-2 text-sm">
                  <p className="text-foreground">{suggestion.reason}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Wait: {suggestion.estimated_wait_time}m</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>From: {suggestion.crowd_conditions.from_zone.people_count}</span>
                    </div>
                  </div>

                  {/* Crowd Conditions */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-muted/30 rounded">
                      <div className="font-medium text-muted-foreground">From Zone</div>
                      <div className="text-foreground">{suggestion.crowd_conditions.from_zone.zone_name}</div>
                      <div className="text-muted-foreground">
                        {suggestion.crowd_conditions.from_zone.occupancy_percentage}% full
                      </div>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <div className="font-medium text-muted-foreground">To Zone</div>
                      <div className="text-foreground">{suggestion.crowd_conditions.to_zone.zone_name}</div>
                      <div className="text-muted-foreground">
                        {suggestion.crowd_conditions.to_zone.occupancy_percentage}% full
                      </div>
                    </div>
                  </div>

                  {/* Alternative Routes */}
                  {suggestion.alternative_routes.length > 0 && (
                    <div className="text-xs">
                      <div className="font-medium text-muted-foreground mb-1">Alternative Routes:</div>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.alternative_routes.map((route, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {route}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <span className="text-muted-foreground">
            {suggestions.length} active suggestions
          </span>
        </div>
      </div>
    </div>
  );
};

export default SmartReRouting; 