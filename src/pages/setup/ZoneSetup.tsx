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
  CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSetup } from "@/contexts/SetupContext";
import SetupLayout from "@/components/setup/SetupLayout";
import { toast } from "sonner";

const ZoneSetup = () => {
  const navigate = useNavigate();
  const { state, addZone, updateZone, removeZone, markStepCompleted } = useSetup();
  
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newZone, setNewZone] = useState({
    name: "",
    type: "ghat" as const,
    capacity: "",
    description: ""
  });

  const zoneTypes = [
    { value: "ghat", label: "Sacred Ghat", icon: "🕉️", description: "Religious bathing areas" },
    { value: "gate", label: "Entry Gate", icon: "🚪", description: "Main access points" },
    { value: "camp", label: "Camp Area", icon: "⛺", description: "Accommodation zones" },
    { value: "medical", label: "Medical Zone", icon: "🏥", description: "Healthcare facilities" },
    { value: "security", label: "Security Post", icon: "🛡️", description: "Security checkpoints" }
  ];

  const handleCreateZone = () => {
    if (!newZone.name.trim() || !newZone.capacity) {
      toast.error("Please fill in all required fields");
      return;
    }

    addZone({
      name: newZone.name,
      type: newZone.type,
      capacity: parseInt(newZone.capacity),
      description: newZone.description,
      coordinates: { x: 50, y: 50 } // Default position
    });

    setNewZone({
      name: "",
      type: "ghat",
      capacity: "",
      description: ""
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

  return (
    <SetupLayout
      title="Zone Configuration"
      description="Set up sacred areas, entry points, and monitoring zones for optimal crowd management"
      showBackButton
      onBack={() => navigate("/setup/wizard")}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Zone Creation Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Create New Zone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Create New Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zone-name">Zone Name *</Label>
                <Input
                  id="zone-name"
                  placeholder="e.g., Har Ki Pauri Ghat"
                  value={newZone.name}
                  onChange={(e) => setNewZone(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone-type">Zone Type *</Label>
                <Select value={newZone.type} onValueChange={(value: any) => setNewZone(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {zoneTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{type.icon}</span>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone-capacity">Maximum Capacity *</Label>
                <Input
                  id="zone-capacity"
                  type="number"
                  placeholder="e.g., 50000"
                  value={newZone.capacity}
                  onChange={(e) => setNewZone(prev => ({ ...prev, capacity: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone-description">Description</Label>
                <Textarea
                  id="zone-description"
                  placeholder="Brief description of the zone..."
                  value={newZone.description}
                  onChange={(e) => setNewZone(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <Button onClick={handleCreateZone} className="w-full bg-gradient-sacred">
                <Plus className="w-4 h-4 mr-2" />
                Create Zone
              </Button>
            </CardContent>
          </Card>

          {/* Zone Types Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Zone Types Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {zoneTypes.map((type) => (
                  <div key={type.value} className="flex items-center gap-3 text-sm">
                    <span className="text-lg">{type.icon}</span>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

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
                    <p className="text-sm">Create your first zone to get started</p>
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

        {/* Visual Map Preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent" />
                Zone Layout Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <div className="relative w-full h-full bg-gradient-water rounded-lg overflow-hidden">
                {/* River */}
                <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full">
                  <path
                    d="M0,150 Q100,130 200,150 T400,150 L400,200 Q300,180 200,200 T0,200 Z"
                    fill="rgba(59, 130, 246, 0.3)"
                    className="animate-float"
                  />
                  <text x="200" y="175" textAnchor="middle" className="fill-blue-800 text-xs font-bold opacity-60">
                    गंगा नदी
                  </text>
                </svg>

                {/* Zone Markers */}
                <AnimatePresence>
                  {state.zones.map((zone, index) => (
                    <motion.div
                      key={zone.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2"
                      style={{ 
                        left: `${25 + (index % 3) * 25}%`, 
                        top: `${30 + Math.floor(index / 3) * 30}%` 
                      }}
                    >
                      <div className={`
                        w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center
                        transition-all duration-200 hover:scale-110
                        ${zone.id === selectedZone ? 'ring-4 ring-primary/50 scale-125' : ''}
                        ${zone.type === 'ghat' ? 'bg-primary' : 
                          zone.type === 'gate' ? 'bg-secondary' :
                          zone.type === 'medical' ? 'bg-success' :
                          zone.type === 'security' ? 'bg-warning' : 'bg-accent'}
                      `}>
                        <span className="text-xs text-white">
                          {getZoneIcon(zone.type)}
                        </span>
                      </div>
                      
                      <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                        {zone.name}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {state.zones.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Zone positions will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
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