import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  ArrowRight,
  Users,
  CheckCircle,
  Map
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSetup } from "@/contexts/SetupContext";
import SetupLayout from "@/components/setup/SetupLayout";
import { toast } from "sonner";
import MapboxZoneSelector from "@/components/map/MapboxZoneSelector";

const ZoneSetup = () => {
  const navigate = useNavigate();
  const { state, addZone, updateZone, removeZone, markStepCompleted } = useSetup();
  
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedZoneType, setSelectedZoneType] = useState<"ghat" | "gate" | "camp" | "medical" | "security">("ghat");
  const [showMapView, setShowMapView] = useState(false);

  const zoneTypes = [
    { value: "ghat", label: "Sacred Ghat", icon: "🕉️", description: "Religious bathing areas" },
    { value: "gate", label: "Entry Gate", icon: "🚪", description: "Main access points" },
    { value: "camp", label: "Camp Area", icon: "⛺", description: "Accommodation zones" },
    { value: "medical", label: "Medical Zone", icon: "🏥", description: "Healthcare facilities" },
    { value: "security", label: "Security Post", icon: "🛡️", description: "Security checkpoints" }
  ];

  const handleCreateZone = (zoneData: {
    name: string;
    type: string;
    coordinates: { lng: number; lat: number };
    capacity: number;
    description: string;
  }) => {
    addZone({
      name: zoneData.name,
      type: zoneData.type as "ghat" | "gate" | "camp" | "medical" | "security",
      capacity: zoneData.capacity,
      description: zoneData.description,
      coordinates: { x: zoneData.coordinates.lng, y: zoneData.coordinates.lat }
    });

    toast.success("Zone created successfully!");
  };

  const handleDeleteZone = (zoneId: string) => {
    removeZone(zoneId);
    setSelectedZone(null);
    toast.success("Zone deleted successfully!");
  };

  const handleNext = () => {
    if (state.zones.length === 0) {
      toast.error("Please create at least one zone before proceeding");
      return;
    }
    
    markStepCompleted(1);
    toast.success("Zone setup completed!");
    navigate("/setup/cctv");
  };

  const getZoneIcon = (type: string) => {
    return zoneTypes.find(t => t.value === type)?.icon || "📍";
  };

  const getZoneColor = (type: string) => {
    switch (type) {
      case "ghat": return "border-primary bg-primary/5";
      case "gate": return "border-secondary bg-secondary/5";
      case "medical": return "border-success bg-success/5";
      case "security": return "border-warning bg-warning/5";
      case "camp": return "border-accent bg-accent/5";
      default: return "border-muted bg-muted/5";
    }
  };

  // Convert zones to the format expected by MapboxZoneSelector
  const mapboxZones = state.zones.map(zone => ({
    id: zone.id,
    name: zone.name,
    type: zone.type,
    coordinates: { lng: zone.coordinates.x, lat: zone.coordinates.y },
    capacity: zone.capacity,
    description: zone.description
  }));

  return (
    <SetupLayout
      title="Zone Configuration"
      description="Set up sacred areas, entry points, and monitoring zones for optimal crowd management"
      showBackButton
      onBack={() => navigate("/setup/wizard")}
    >
      <div className="space-y-6">
        {/* Zone Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Select Zone Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {zoneTypes.map((type) => (
                <div
                  key={type.value}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedZoneType === type.value 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedZoneType(type.value as "ghat" | "gate" | "camp" | "medical" | "security")}
                >
                  <div className="text-center space-y-2">
                    <div className="text-2xl">{type.icon}</div>
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* View Toggle */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <Button
              variant={!showMapView ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowMapView(false)}
              className="text-xs"
            >
              <MapPin className="w-4 h-4 mr-2" />
              List View
            </Button>
            <Button
              variant={showMapView ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowMapView(true)}
              className="text-xs"
            >
              <Map className="w-4 h-4 mr-2" />
              Map View
            </Button>
          </div>
        </div>

        {/* Map View */}
        {showMapView && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <MapboxZoneSelector
              zones={mapboxZones}
              onZoneAdd={handleCreateZone}
              onZoneDelete={handleDeleteZone}
              selectedZoneType={selectedZoneType}
            />
          </motion.div>
        )}

        {/* List View */}
        {!showMapView && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Zone List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-secondary" />
                      Configured Zones ({state.zones.length})
                    </span>
                    {state.zones.length > 0 && (
                      <Badge variant="outline" className="text-success border-success">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ready
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <AnimatePresence>
                      {state.zones.map((zone) => (
                        <motion.div
                          key={zone.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                            getZoneColor(zone.type)
                          } ${selectedZone === zone.id ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{getZoneIcon(zone.type)}</span>
                                  <h4 className="font-medium">{zone.name}</h4>
                                </div>
                                <p className="text-xs text-muted-foreground">{zone.description}</p>
                              </div>
                              <Badge variant="outline" className="text-xs capitalize">
                                {zone.type}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span>{zone.capacity.toLocaleString()}</span>
                              </div>
                              <div className="text-muted-foreground">
                                ID: {zone.id.slice(-6)}
                              </div>
                            </div>

                            {selectedZone === zone.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex gap-2 pt-2 border-t"
                              >
                                <Button variant="ghost" size="sm" className="flex-1">
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="flex-1 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteZone(zone.id);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {state.zones.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No zones configured yet</p>
                        <p className="text-sm">Switch to Map View to create zones by clicking on the map</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Summary Stats */}
              {state.zones.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h4 className="font-semibold mb-4">Zone Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-2xl font-bold text-primary">
                          {state.zones.reduce((sum, zone) => sum + zone.capacity, 0).toLocaleString()}
                        </div>
                        <div className="text-muted-foreground">Total Capacity</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-secondary">
                          {state.zones.length}
                        </div>
                        <div className="text-muted-foreground">Zones Created</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>

            {/* Instructions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="w-5 h-5 text-accent" />
                    How to Create Zones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold mt-0.5">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Select Zone Type</h4>
                        <p className="text-xs text-muted-foreground">Choose the type of zone you want to create from the options above</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold mt-0.5">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Switch to Map View</h4>
                        <p className="text-xs text-muted-foreground">Click the "Map View" button to see the interactive map</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold mt-0.5">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Click on Map</h4>
                        <p className="text-xs text-muted-foreground">Click "Add Zone on Map" then click anywhere on the map to place your zone</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold mt-0.5">
                        4
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Fill Details</h4>
                        <p className="text-xs text-muted-foreground">Enter the zone name, capacity, and description in the form that appears</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">Zone Types Guide</h4>
                    <div className="space-y-2">
                      {zoneTypes.map((type) => (
                        <div key={type.value} className="flex items-center gap-2 text-xs">
                          <span className="text-sm">{type.icon}</span>
                          <span className="font-medium">{type.label}</span>
                          <span className="text-muted-foreground">- {type.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="flex justify-between items-center pt-8 border-t"
      >
        <Button 
          variant="outline"
          onClick={() => navigate("/setup/wizard")}
        >
          Back to Overview
        </Button>

        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {state.zones.length > 0 ? 
              `${state.zones.length} zone${state.zones.length > 1 ? 's' : ''} configured` :
              "Create at least one zone to continue"
            }
          </div>
          <Button 
            onClick={handleNext}
            disabled={state.zones.length === 0}
            className="bg-gradient-sacred"
          >
            Next: CCTV Setup
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </SetupLayout>
  );
};

export default ZoneSetup;