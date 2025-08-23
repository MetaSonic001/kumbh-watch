import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2,
  Save,
  ArrowRight,
  Users,
  CheckCircle,
  Map,
  Navigation,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSetup } from "@/contexts/SetupContext";
import SetupLayout from "@/components/setup/SetupLayout";
import MapboxZoneSelector from "@/components/map/MapboxZoneSelector";
import { toast } from "sonner";
import { backendService, BackendZone } from "@/services/backendService";

const ZoneSetup = () => {
  const navigate = useNavigate();
  const { state, addZone, updateZone, removeZone, markStepCompleted } = useSetup();
  
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedZoneType, setSelectedZoneType] = useState<"ghat" | "gate" | "camp" | "medical" | "security">("ghat");
  const [showMapView, setShowMapView] = useState(false);
  const [backendZones, setBackendZones] = useState<BackendZone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("setup");

  const zoneTypes = [
    { value: "ghat", label: "Sacred Ghat", icon: "🕉️", description: "Religious bathing areas" },
    { value: "gate", label: "Entry Gate", icon: "🚪", description: "Main access points" },
    { value: "camp", label: "Camp Area", icon: "⛺", description: "Accommodation zones" },
    { value: "medical", label: "Medical Zone", icon: "🏥", description: "Healthcare facilities" },
    { value: "security", label: "Security Post", icon: "🛡️", description: "Security checkpoints" }
  ];

  // Load zones from backend on component mount
  useEffect(() => {
    loadBackendZones();
  }, []);

  const loadBackendZones = async () => {
    setIsLoading(true);
    try {
      const zones = await backendService.getZones();
      setBackendZones(zones);
    } catch (error) {
      console.error('Failed to load zones from backend:', error);
      toast.error('Failed to load zones from backend');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateZone = async (zoneData: {
    name: string;
    type: string;
    coordinates: { lng: number; lat: number };
    capacity: number;
    description: string;
  }) => {
    try {
      // Create zone in backend
      const backendZone = await backendService.createZone({
        name: zoneData.name,
        type: zoneData.type,
        coordinates: zoneData.coordinates,
        capacity: zoneData.capacity,
        description: zoneData.description
      });

      // Add to local state
      addZone({
        name: zoneData.name,
        type: zoneData.type as "ghat" | "gate" | "camp" | "medical" | "security",
        capacity: zoneData.capacity,
        description: zoneData.description,
        coordinates: { x: zoneData.coordinates.lng, y: zoneData.coordinates.lat }
      });

      // Refresh backend zones
      await loadBackendZones();

      toast.success("Zone created successfully in backend!");
    } catch (error) {
      console.error('Failed to create zone in backend:', error);
      toast.error('Failed to create zone in backend');
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      // Delete from backend
      await backendService.deleteZone(zoneId);
      
      // Delete from local state
      removeZone(zoneId);
      setSelectedZone(null);
      
      // Refresh backend zones
      await loadBackendZones();
      
      toast.success("Zone deleted successfully from backend!");
    } catch (error) {
      console.error('Failed to delete zone from backend:', error);
      toast.error('Failed to delete zone from backend');
    }
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

  const handleZoneSelect = (zoneId: string) => {
    setSelectedZone(zoneId);
    toast.success(`Selected zone ${zoneId} for analysis`);
  };

  return (
    <SetupLayout
      title="Zone Setup"
      description="Define zones for crowd management and monitoring"
      showBackButton
      onBack={() => navigate("/setup/wizard")}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Zone Setup</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="routing">Re-routing</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          {/* Zone Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Zone Type Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {zoneTypes.map((type) => (
                  <motion.div
                    key={type.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all duration-200 ${
                        selectedZoneType === type.value 
                          ? "ring-2 ring-primary shadow-lg" 
                          : "hover:shadow-md"
                      }`}
                      onClick={() => setSelectedZoneType(type.value as any)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2">{type.icon}</div>
                        <h3 className="font-semibold text-sm mb-1">{type.label}</h3>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Zone Creation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Create New Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MapboxZoneSelector
                zones={mapboxZones}
                onZoneAdd={handleCreateZone}
                onZoneDelete={handleDeleteZone}
                selectedZoneType={selectedZoneType}
              />
            </CardContent>
          </Card>

          {/* Backend Zones Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-secondary" />
                Backend Zones Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading backend zones...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {backendZones.map((zone) => (
                    <motion.div
                      key={zone.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{zone.name}</span>
                        <Badge variant={zone.status === 'active' ? 'default' : 'secondary'}>
                          {zone.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div>Type: {zone.type}</div>
                        <div>Capacity: {zone.capacity.toLocaleString()}</div>
                        <div>Current: {zone.current_occupancy.toLocaleString()}</div>
                        <div>Created: {new Date(zone.created_at).toLocaleDateString()}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="w-5 h-5 text-primary" />
                Interactive Zone Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MapboxZoneSelector
                zones={mapboxZones}
                onZoneAdd={handleCreateZone}
                onZoneDelete={handleDeleteZone}
                selectedZoneType={selectedZoneType}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                Intelligent Re-routing System
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* ReRoutingSuggestions component was removed */}
              <p>Smart re-routing suggestions are now available on the dashboard.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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