import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Navigation, 
  Users, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Activity,
  MapPin,
  Route
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  CrowdFlowData, 
  ReRoutingSuggestion, 
  backendService 
} from "@/services/backendService";

interface ReRoutingSuggestionsProps {
  currentZoneId?: string;
  onZoneSelect?: (zoneId: string) => void;
  showAllSuggestions?: boolean;
}

const ReRoutingSuggestions = ({ 
  currentZoneId, 
  onZoneSelect, 
  showAllSuggestions = false 
}: ReRoutingSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<ReRoutingSuggestion[]>([]);
  const [crowdFlowData, setCrowdFlowData] = useState<CrowdFlowData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [currentZoneId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const flowData = await backendService.getZonesWithHeatmap();
      setCrowdFlowData(flowData || []); // ADD: Handle null/undefined

      if (currentZoneId) {
        const zoneSuggestions = await backendService.getReRoutingSuggestions(currentZoneId);
        setSuggestions(zoneSuggestions || []); // ADD: Handle null/undefined
      } else if (showAllSuggestions) {
        const allSuggestions = await backendService.getReRoutingSuggestions();
        setSuggestions(allSuggestions || []); // ADD: Handle null/undefined
      }
    } catch (error) {
      console.error('Failed to load re-routing data:', error);
      setSuggestions([]); // ADD: Set empty array on error
      setCrowdFlowData([]); // ADD: Set empty array on error
      toast.error('Failed to load re-routing suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCustomSuggestion = () => {
    if (!currentZoneId || crowdFlowData.length === 0) return;

    const currentZone = crowdFlowData.find(zone => zone.zone_id === currentZoneId);
    if (!currentZone) return;

    const customSuggestions = backendService.calculateOptimalRoute(currentZone, crowdFlowData);
    setSuggestions(customSuggestions);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-accent text-accent-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <TrendingUp className="w-4 h-4" />;
      case 'medium': return <Activity className="w-4 h-4" />;
      case 'low': return <TrendingDown className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getDensityColor = (density: string) => {
    switch (density) {
      case 'CRITICAL': return 'text-destructive';
      case 'HIGH': return 'text-warning';
      case 'MEDIUM': return 'text-accent';
      case 'LOW': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const handleZoneSelect = (zoneId: string) => {
    if (onZoneSelect) {
      onZoneSelect(zoneId);
    }
    setSelectedSuggestion(zoneId);
    toast.success(`Selected zone ${zoneId} for re-routing`);
  };

  const handleEmergencyAlert = async (suggestion: ReRoutingSuggestion) => {
    try {
      await backendService.sendEmergencyAlert({
        emergency_type: 'CROWD_MANAGEMENT',
        message: `Re-routing suggestion: ${suggestion.reason}`,
        location: `From ${suggestion.crowd_conditions.from_zone.zone_name} to ${suggestion.crowd_conditions.to_zone.zone_name}`,
        priority: suggestion.urgency === 'critical' ? 'CRITICAL' : 'HIGH',
        zone_id: suggestion.from_zone
      });
      toast.success('Emergency alert sent for re-routing');
    } catch (error) {
      toast.error('Failed to send emergency alert');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading re-routing suggestions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Intelligent Re-routing</h3>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={generateCustomSuggestion}
            variant="outline"
            size="sm"
            disabled={!currentZoneId}
          >
            <Route className="w-4 h-4 mr-2" />
            Generate Suggestions
          </Button>
          
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
          >
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Current Zone Status */}
      {currentZoneId && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Current Zone Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const currentZone = crowdFlowData.find(zone => zone.zone_id === currentZoneId);
              if (!currentZone) return <p className="text-muted-foreground">Zone not found</p>;
              
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {currentZone.people_count}
                    </div>
                    <div className="text-muted-foreground">Current People</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary">
                      {currentZone.occupancy_percentage}%
                    </div>
                    <div className="text-muted-foreground">Occupancy</div>
                  </div>
                  <div className="text-center">
                    <Badge 
                      variant="outline" 
                      className={`${getDensityColor(currentZone.density_level)}`}
                    >
                      {currentZone.density_level}
                    </Badge>
                    <div className="text-muted-foreground mt-1">Density</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">
                      {currentZone.trend === 'increasing' ? '↗️' : currentZone.trend === 'decreasing' ? '↘️' : '→'}
                    </div>
                    <div className="text-muted-foreground">Trend</div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Re-routing Suggestions */}
      {suggestions.length > 0 ? (
        <div className="space-y-4">
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={`${suggestion.from_zone}-${suggestion.to_zone}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className={`border-l-4 ${
                suggestion.urgency === 'critical' ? 'border-l-destructive' :
                suggestion.urgency === 'high' ? 'border-l-warning' :
                suggestion.urgency === 'medium' ? 'border-l-accent' :
                'border-l-success'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getUrgencyColor(suggestion.urgency)}>
                        {getUrgencyIcon(suggestion.urgency)}
                        <span className="ml-1 capitalize">{suggestion.urgency}</span>
                      </Badge>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>From: {suggestion.crowd_conditions.from_zone.zone_name}</span>
                        <ArrowRight className="w-4 h-4" />
                        <span>To: {suggestion.crowd_conditions.to_zone.zone_name}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        ~{suggestion.estimated_wait_time} min
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Reason */}
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm font-medium">{suggestion.reason}</p>
                  </div>
                  
                  {/* Zone Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* From Zone */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Current Zone</h4>
                      <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{suggestion.crowd_conditions.from_zone.zone_name}</span>
                          <Badge variant="outline" className={getDensityColor(suggestion.crowd_conditions.from_zone.density_level)}>
                            {suggestion.crowd_conditions.from_zone.density_level}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>People:</span>
                            <span className="font-medium">{suggestion.crowd_conditions.from_zone.people_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Occupancy:</span>
                            <span className="font-medium">{suggestion.crowd_conditions.from_zone.occupancy_percentage}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* To Zone */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Recommended Zone</h4>
                      <div className="bg-success/10 p-3 rounded-lg border border-success/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{suggestion.crowd_conditions.to_zone.zone_name}</span>
                          <Badge variant="outline" className={getDensityColor(suggestion.crowd_conditions.to_zone.density_level)}>
                            {suggestion.crowd_conditions.to_zone.density_level}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>People:</span>
                            <span className="font-medium">{suggestion.crowd_conditions.to_zone.people_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Occupancy:</span>
                            <span className="font-medium">{suggestion.crowd_conditions.to_zone.occupancy_percentage}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Alternative Routes */}
                  {suggestion.alternative_routes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Alternative Routes</h4>
                      <div className="flex flex-wrap gap-2">
                        {suggestion.alternative_routes.map((route, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {route}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleZoneSelect(suggestion.crowd_conditions.to_zone.zone_id)}
                      className="flex-1 bg-gradient-sacred"
                      size="sm"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Select This Route
                    </Button>
                    
                    {suggestion.urgency === 'critical' && (
                      <Button
                        onClick={() => handleEmergencyAlert(suggestion)}
                        variant="destructive"
                        size="sm"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Emergency Alert
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <Navigation className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Re-routing Suggestions</h3>
            <p className="text-muted-foreground mb-4">
              {currentZoneId 
                ? "Current zone has optimal crowd conditions. No re-routing needed."
                : "Select a zone to see re-routing suggestions based on crowd flow."
              }
            </p>
            {currentZoneId && (
              <Button onClick={generateCustomSuggestion} variant="outline">
                <Route className="w-4 h-4 mr-2" />
                Generate Custom Suggestions
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReRoutingSuggestions; 