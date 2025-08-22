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
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { backendService, ReRoutingSuggestion } from "@/services/backendService";

interface SmartReRoutingProps {
  onAlertSent?: (message: string) => void;
}

const SmartReRouting = ({ onAlertSent }: SmartReRoutingProps) => {
  const [suggestions, setSuggestions] = useState<ReRoutingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

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
      // Send emergency instructions to all users
      const message = `🚨 CROWD MANAGEMENT ALERT: ${suggestion.reason} Please redirect to ${suggestion.to_zone} for better crowd conditions. Estimated wait time: ${suggestion.estimated_wait_time} minutes.`;
      
      await backendService.sendEmergencyInstructions(
        message,
        suggestion.urgency === 'critical' ? 'CRITICAL' : 'HIGH',
        600 // 10 minutes duration
      );

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
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '📋';
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
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Smart Re-Routing
            <Badge variant="outline" className="ml-auto">
              {suggestions.length} Active
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadSuggestions}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Analyzing crowd patterns...</span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <Navigation className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No re-routing suggestions</p>
            <p className="text-sm">All zones are operating within safe capacity limits</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={`${suggestion.from_zone}-${suggestion.to_zone}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="border rounded-lg p-4 bg-gradient-to-r from-background to-muted/30"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getUrgencyIcon(suggestion.urgency)}</span>
                    <Badge className={getUrgencyColor(suggestion.urgency)}>
                      {suggestion.urgency.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {suggestion.estimated_wait_time} min
                    </div>
                  </div>
                </div>

                {/* Route Information */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="font-medium">{suggestion.from_zone}</span>
                      <span className="text-muted-foreground">→</span>
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span className="font-medium">{suggestion.to_zone}</span>
                    </div>
                  </div>
                </div>

                {/* Crowd Conditions */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">From Zone:</span>
                      <span className="font-medium">{suggestion.crowd_conditions.from_zone.zone_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{suggestion.crowd_conditions.from_zone.current_occupancy}/{suggestion.crowd_conditions.from_zone.capacity}</span>
                      {getTrendIcon(suggestion.crowd_conditions.from_zone.trend)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.crowd_conditions.from_zone.density_level}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">To Zone:</span>
                      <span className="font-medium">{suggestion.crowd_conditions.to_zone.zone_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{suggestion.crowd_conditions.to_zone.current_occupancy}/{suggestion.crowd_conditions.to_zone.capacity}</span>
                      {getTrendIcon(suggestion.crowd_conditions.to_zone.trend)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.crowd_conditions.to_zone.density_level}
                    </Badge>
                  </div>
                </div>

                {/* Reason */}
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">{suggestion.reason}</p>
                </div>

                {/* Alternative Routes */}
                {suggestion.alternative_routes.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Alternative routes:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestion.alternative_routes.map((route, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {route}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAcceptSuggestion(suggestion)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept & Alert
                  </Button>
                  
                  <Button
                    onClick={() => handleRejectSuggestion(suggestion)}
                    variant="outline"
                    size="sm"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartReRouting; 