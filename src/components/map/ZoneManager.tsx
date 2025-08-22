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
  Trash2
} from "lucide-react";

interface Zone {
  id: string;
  name: string;
  type: string;
  capacity: number;
  cctvCount: number;
  status: "active" | "inactive" | "maintenance";
  description: string;
}

interface ZoneManagerProps {
  selectedZone: string | null;
  onZoneSelect: (zoneId: string | null) => void;
}

const ZoneManager = ({ selectedZone, onZoneSelect }: ZoneManagerProps) => {
  const [zones] = useState<Zone[]>([
    {
      id: "zone-1",
      name: "Har Ki Pauri Ghat",
      type: "ghat",
      capacity: 50000,
      cctvCount: 8,
      status: "active",
      description: "Main sacred bathing ghat"
    },
    {
      id: "zone-2",
      name: "Main Entry Gate",
      type: "gate", 
      capacity: 15000,
      cctvCount: 4,
      status: "active",
      description: "Primary entrance point"
    },
    {
      id: "zone-3",
      name: "Medical Camp Area",
      type: "medical",
      capacity: 5000,
      cctvCount: 2,
      status: "active",
      description: "Emergency medical services"
    }
  ]);

  const [newZone, setNewZone] = useState({
    name: "",
    type: "ghat",
    capacity: "",
    description: ""
  });

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

  return (
    <div className="space-y-6">
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
              value={newZone.name}
              onChange={(e) => setNewZone(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone-type">Zone Type</Label>
            <Select value={newZone.type} onValueChange={(value) => setNewZone(prev => ({ ...prev, type: value }))}>
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
              value={newZone.capacity}
              onChange={(e) => setNewZone(prev => ({ ...prev, capacity: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone-description">Description</Label>
            <Input
              id="zone-description"
              placeholder="Brief description"
              value={newZone.description}
              onChange={(e) => setNewZone(prev => ({ ...prev, description: e.target.value }))}
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
    </div>
  );
};

export default ZoneManager;
