import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Navigation, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  X,
  ArrowRight,
  MapPin,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { backendService, ReRoutingSuggestion } from "@/services/backendService";

interface SmartReRoutingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentZoneId?: string;
  currentZoneName?: string;
  currentDensityLevel?: string;
  currentOccupancy?: number;
  currentCapacity?: number;
}

const SmartReRoutingModal = ({
  isOpen,
  onClose,
  currentZoneId,
  currentZoneName,
  currentDensityLevel,
  currentOccupancy,
  currentCapacity
}: SmartReRoutingModalProps) => {
  const [suggestions, setSuggestions] = useState<ReRoutingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ReRoutingSuggestion | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    if (isOpen && currentZoneId) {
      loadReRoutingSuggestions();
    }
  }, [isOpen, currentZoneId]);

  const loadReRoutingSuggestions = async () => {
    if (!currentZoneId) return;
    
    setIsLoading(true);
    try {
      const suggestionsData = await backendService.getReRoutingSuggestions(currentZoneId);
      setSuggestions(suggestionsData);
      console.log('🔄 Re-routing suggestions loaded:', suggestionsData);
    } catch (error) {
      console.error('❌ Failed to load re-routing suggestions:', error);
      toast.error('Failed to load re-routing suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion: ReRoutingSuggestion) => {
    setSelectedSuggestion(suggestion);
    setIsExecuting(true);
    
    try {
      // Send emergency alert to everyone about the re-routing
      await backendService.sendEmergencyAlert({
        emergency_type: "RE_ROUTING",
        message: `Crowd re-routing initiated: Redirecting from ${suggestion.crowd_conditions.from_zone.zone_name} to ${suggestion.crowd_conditions.to_zone.zone_name}. ${suggestion.reason}`,
        location: `${suggestion.crowd_conditions.from_zone.zone_name} → ${suggestion.crowd_conditions.to_zone.zone_name}`,
        priority: "HIGH",
        zone_id: suggestion.from_zone
      });

      // Send emergency instructions to all connected clients
      await backendService.sendEmergencyInstructions({
        instructions: `🚨 CROWD RE-ROUTING ALERT 🚨\n\nDue to high crowd density at ${suggestion.crowd_conditions.from_zone.zone_name}, please redirect visitors to ${suggestion.crowd_conditions.to_zone.zone_name}.\n\nReason: ${suggestion.reason}\nEstimated wait time: ${suggestion.estimated_wait_time} minutes\n\nAlternative routes: ${suggestion.alternative_routes.join(', ')}`,
        priority: "HIGH",
        duration: 600 // 10 minutes
      });

      toast.success('Re-routing alert sent successfully!', {
        description: `All visitors and staff have been notified about the re-routing to ${suggestion.crowd_conditions.to_zone.zone_name}`
      });

      // Close modal after successful execution
      setTimeout(() => {
        onClose();
        setSelectedSuggestion(null);
        setIsExecuting(false);
      }, 2000);

    } catch (error) {
      console.error('❌ Failed to execute re-routing:', error);
      toast.error('Failed to execute re-routing', {
        description: 'Check console for details'
      });
      setIsExecuting(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getDensityColor = (density: string) => {
    switch (density) {
      case 'CRITICAL': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getDensityIcon = (density: string) => {
    switch (density) {
      case 'CRITICAL': return '🔴';
      case 'HIGH': return '🟠';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      default: return '⚪';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Navigation className="w-6 h-6 text-primary" />
            Smart Crowd Re-routing System
            <Badge variant="destructive" className="ml-auto">
              {currentDensityLevel} DENSITY
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Current Zone Status */}
        {currentZoneId && (
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-red-800">
                <AlertTriangle className="w-5 h-5" />
                Current Zone Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{currentZoneName}</div>
                  <div className="text-sm text-red-600">Zone Name</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {currentOccupancy}/{currentCapacity}
                  </div>
                  <div className="text-sm text-red-600">Current/Capacity</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {currentOccupancy && currentCapacity ? Math.round((currentOccupancy / currentCapacity) * 100) : 0}%
                  </div>
                  <div className="text-sm text-red-600">Occupancy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {getDensityIcon(currentDensityLevel || '')}
                  </div>
                  <div className="text-sm text-red-600">Density Level</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Re-routing Suggestions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              Recommended Alternative Zones
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={loadReRoutingSuggestions}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Analyzing crowd patterns...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <Card className="bg-muted/30">
              <CardContent className="p-6 text-center text-muted-foreground">
                <Navigation className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No re-routing suggestions available</p>
                <p className="text-sm">All zones are currently operating within safe capacity limits.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={`${suggestion.from_zone}-${suggestion.to_zone}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-primary" />
                          {suggestion.crowd_conditions.to_zone.zone_name}
                        </CardTitle>
                        <Badge className={getUrgencyColor(suggestion.urgency)}>
                          {suggestion.urgency.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Zone Comparison */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-sm font-medium text-red-700">From Zone</div>
                          <div className="text-lg font-bold text-red-800">
                            {suggestion.crowd_conditions.from_zone.zone_name}
                          </div>
                          <div className={`text-sm font-medium ${getDensityColor(suggestion.crowd_conditions.from_zone.density_level)}`}>
                            {getDensityIcon(suggestion.crowd_conditions.from_zone.density_level)} {suggestion.crowd_conditions.from_zone.density_level}
                          </div>
                          <div className="text-xs text-red-600">
                            {suggestion.crowd_conditions.from_zone.current_occupancy}/{suggestion.crowd_conditions.from_zone.capacity}
                          </div>
                        </div>
                        
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-sm font-medium text-green-700">To Zone</div>
                          <div className="text-lg font-bold text-green-800">
                            {suggestion.crowd_conditions.to_zone.zone_name}
                          </div>
                          <div className={`text-sm font-medium ${getDensityColor(suggestion.crowd_conditions.to_zone.density_level)}`}>
                            {getDensityIcon(suggestion.crowd_conditions.to_zone.density_level)} {suggestion.crowd_conditions.to_zone.density_level}
                          </div>
                          <div className="text-xs text-green-600">
                            {suggestion.crowd_conditions.to_zone.current_occupancy}/{suggestion.crowd_conditions.to_zone.capacity}
                          </div>
                        </div>
                      </div>

                      {/* Re-routing Details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <span className="font-medium">Reason:</span>
                          <span>{suggestion.reason}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">Estimated Wait Time:</span>
                          <span className="font-bold text-blue-600">{suggestion.estimated_wait_time} minutes</span>
                        </div>

                        {suggestion.alternative_routes.length > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <Navigation className="w-4 h-4 text-purple-500" />
                            <span className="font-medium">Alternative Routes:</span>
                            <span className="text-purple-600">{suggestion.alternative_routes.join(', ')}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <Button
                        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                        onClick={() => handleAcceptSuggestion(suggestion)}
                        disabled={isExecuting}
                      >
                        {isExecuting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Executing Re-routing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept & Execute Re-routing
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Smart Analysis:</span> AI-powered crowd density analysis and intelligent re-routing suggestions
          </div>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartReRoutingModal; 