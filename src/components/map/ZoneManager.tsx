import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Camera, 
  Users,
  Settings,
  Plus,
  Edit,
  Trash2,
  Map
} from "lucide-react";
import MapboxZoneSelector from "./MapboxZoneSelector";

interface Zone {
  id: string;
  name: string;
  type: string;
  capacity: number;
  cctvCount: number;
  status: "active" | "inactive" | "maintenance";
  description: string;
  coordinates?: { lng: number; lat: number };
}

interface ZoneManagerProps {
  selectedZone: string | null;
  onZoneSelect: (zoneId: string | null) => void;
}

const ZoneManager = ({ selectedZone, onZoneSelect }: ZoneManagerProps) => {
  const [zones, setZones] = useState<Zone[]>([
    {
      id: "zone-1",
      name: "Har Ki Pauri Ghat",
      type: "ghat",
      capacity: 50000,
      cctvCount: 8,
      status: "active",
      description: "Main sacred bathing ghat",
      coordinates: { lng: 78.163, lat: 29.9457 }
    },
    {
      id: "zone-2",
      name: "Main Entry Gate",
      type: "gate", 
      capacity: 15000,
      cctvCount: 4,
      status: "active",
      description: "Primary entrance point",
      coordinates: { lng: 78.165, lat: 29.947 }
    },
    {
      id: "zone-3",
      name: "Medical Camp Area",
      type: "medical",
      capacity: 5000,
      cctvCount: 2,
      status: "active",
      description: "Emergency medical services",
      coordinates: { lng: 78.166, lat: 29.948 }
    }
  ]);

  const [selectedZoneType, setSelectedZoneType] = useState("ghat");
  const [showMapView, setShowMapView] = useState(false);

  const zoneTypes = [
    { value: "ghat", label: "Sacred Ghat", icon: "🕉️" },
    { value: "gate", label: "Entry Gate", icon: "🚪" },
    { value: "camp", label: "Camp Area", icon: "⛺" },
    { value: "medical", label: "Medical Zone", icon: "🏥" },
    { value: "security", label: "Security Post", icon: "🛡️" }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success text-success-foreground";
      case "inactive": return "bg-muted text-muted-foreground";
      case "maintenance": return "bg-warning text-warning-foreground";
      default: return "bg-primary text-primary-foreground";
    }
  };

  const selectedZoneData = zones.find(zone => zone.id === selectedZone);

  const handleZoneAdd = (zoneData: {
    name: string;
    type: string;
    coordinates: { lng: number; lat: number };
    capacity: number;
    description: string;
  }) => {
    const newZone: Zone = {
      id: `zone-${Date.now()}`,
      name: zoneData.name,
      type: zoneData.type,
      capacity: zoneData.capacity,
      cctvCount: 0,
      status: "active",
      description: zoneData.description,
      coordinates: zoneData.coordinates
    };
    
    setZones(prev => [...prev, newZone]);
  };

  const handleZoneDelete = (zoneId: string) => {
    setZones(prev => prev.filter(zone => zone.id !== zoneId));
    if (selectedZone === zoneId) {
      onZoneSelect(null);
    }
  };

  // Convert zones to the format expected by MapboxZoneSelector
  const mapboxZones = zones.map(zone => ({
    id: zone.id,
    name: zone.name,
    type: zone.type,
    coordinates: zone.coordinates || { lng: 78.163, lat: 29.9457 },
    capacity: zone.capacity,
    description: zone.description
  }));

  return (
    <div className="space-y-6">
      {/* Zone Type Selection */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
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
                onClick={() => setSelectedZoneType(type.value)}
              >
                <div className="text-center space-y-2">
                  <div className="text-2xl">{type.icon}</div>
                  <div className="font-medium text-sm">{type.label}</div>
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
        <MapboxZoneSelector
          zones={mapboxZones}
          onZoneAdd={handleZoneAdd}
          onZoneDelete={handleZoneDelete}
          selectedZoneType={selectedZoneType}
        />
      )}

      {/* List View */}
      {!showMapView && (
        <>
          {/* Zone Creation Form */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Create New Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zone-name">Zone Name</Label>
                <Input
                  id="zone-name"
                  placeholder="Enter zone name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone-type">Zone Type</Label>
                <Select value={selectedZoneType} onValueChange={(value) => setSelectedZoneType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {zoneTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone-capacity">Capacity</Label>
                <Input
                  id="zone-capacity"
                  type="number"
                  placeholder="Maximum people"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone-description">Description</Label>
                <Input
                  id="zone-description"
                  placeholder="Brief description"
                />
              </div>

              <Button className="w-full bg-gradient-sacred">
                <Plus className="w-4 h-4 mr-2" />
                Create Zone
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Existing Zones List */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-secondary" />
              Existing Zones ({zones.length})
            </h3>

            <div className="space-y-3">
              {zones.map((zone) => (
                <Card 
                  key={zone.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    zone.id === selectedZone ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => onZoneSelect(zone.id === selectedZone ? null : zone.id)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">{zone.name}</h4>
                          <p className="text-xs text-muted-foreground">{zone.description}</p>
                        </div>
                        <Badge className={getStatusColor(zone.status)}>
                          {zone.status}
                        </Badge>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{zone.capacity.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-muted-foreground" />
                          <span>{zone.cctvCount} cameras</span>
                        </div>
                      </div>

                      {/* Type badge */}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {zoneTypes.find(t => t.value === zone.type)?.icon} {' '}
                          {zoneTypes.find(t => t.value === zone.type)?.label}
                        </Badge>
                        
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Selected Zone Details */}
          {selectedZoneData && (
            <>
              <Separator />
              <Card className="border-primary">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Zone Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <p className="font-medium">{selectedZoneData.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <p className="font-medium capitalize">{selectedZoneData.type}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Capacity</Label>
                      <p className="font-medium">{selectedZoneData.capacity.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">CCTV Cameras</Label>
                      <p className="font-medium">{selectedZoneData.cctvCount}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p className="font-medium">{selectedZoneData.description}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Camera className="w-4 h-4 mr-2" />
                      Add CCTV
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Zone
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ZoneManager;
