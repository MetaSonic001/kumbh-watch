import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  Plus, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Map,
  Settings,
  X
} from "lucide-react";
import { toast } from "sonner";
import mapboxgl from 'mapbox-gl';
import { API_URL, MAPBOX_ACCESS_TOKEN } from "@/config";
import { backendService } from "@/services/backendService";
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

interface Zone {
  id: string;
  name: string;
  type: string;
  coordinates: { lng: number; lat: number };
  capacity: number;
  description: string;
  current_occupancy: number;
  density_level?: string; // Make optional to match BackendZone
  status?: string;
}

interface ZoneSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onZoneSelect: (zoneId: string, zoneName: string) => void;
  cameraType: 'rtsp' | 'video';
}

const ZoneSelectionModal: React.FC<ZoneSelectionModalProps> = ({
  isOpen,
  onClose,
  onZoneSelect,
  cameraType
}) => {
  const [activeTab, setActiveTab] = useState('select');
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // New zone creation state
  const [newZone, setNewZone] = useState({
    name: '',
    type: 'ghat' as 'ghat' | 'gate' | 'camp' | 'medical' | 'security',
    capacity: 1000,
    description: '',
    coordinates: { lng: 78.163, lat: 29.9457 } // Default to Haridwar
  });
  
  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Load existing zones
  useEffect(() => {
    if (isOpen) {
      loadZones();
    }
  }, [isOpen]);

  const loadZones = async () => {
    try {
      const zonesData = await backendService.getZonesWithHeatmap();
      setZones(zonesData);
    } catch (error) {
      console.error('Failed to load zones:', error);
      toast.error('Failed to load zones');
    }
  };

  // Initialize map for coordinate selection
  useEffect(() => {
    if (activeTab === 'create' && mapContainerRef.current && !mapInstance.current) {
      mapInstance.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [newZone.coordinates.lng, newZone.coordinates.lat],
        zoom: 13
      });

      // Add navigation controls
      mapInstance.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add click handler to set coordinates
      mapInstance.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        setNewZone(prev => ({
          ...prev,
          coordinates: { lng, lat }
        }));

        // Update marker
        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        } else {
          markerRef.current = new mapboxgl.Marker({ color: '#ef4444' })
            .setLngLat([lng, lat])
            .addTo(mapInstance.current!);
        }
      });

      // Add initial marker
      markerRef.current = new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat([newZone.coordinates.lng, newZone.coordinates.lat])
        .addTo(mapInstance.current);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerRef.current = null;
      }
    };
  }, [activeTab]);

  const handleCreateZone = async () => {
    if (!newZone.name || !newZone.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const createdZone = await backendService.createZone({
        name: newZone.name,
        type: newZone.type,
        coordinates: newZone.coordinates,
        capacity: newZone.capacity,
        description: newZone.description
      });

      toast.success(`Zone "${newZone.name}" created successfully`);
      
      // Add to local zones list
      setZones(prev => [...prev, createdZone as Zone]);
      
      // Select the newly created zone
      setSelectedZone(createdZone.id);
      setActiveTab('select');
      
      // Reset form
      setNewZone({
        name: '',
        type: 'ghat',
        capacity: 1000,
        description: '',
        coordinates: { lng: 78.163, lat: 29.9457 }
      });

    } catch (error) {
      console.error('Failed to create zone:', error);
      toast.error('Failed to create zone');
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoneSelect = () => {
    if (!selectedZone) {
      toast.error('Please select a zone');
      return;
    }

    const zone = zones.find(z => z.id === selectedZone);
    if (zone) {
      onZoneSelect(zone.id, zone.name);
      onClose();
    }
  };

  const getZoneTypeIcon = (type: string) => {
    switch (type) {
      case 'ghat': return '🕉️';
      case 'gate': return '🚪';
      case 'camp': return '⛺';
      case 'medical': return '🏥';
      case 'security': return '🛡️';
      default: return '📍';
    }
  };

  const getZoneTypeColor = (type: string) => {
    switch (type) {
      case 'ghat': return 'bg-blue-100 text-blue-800';
      case 'gate': return 'bg-green-100 text-green-800';
      case 'camp': return 'bg-yellow-100 text-yellow-800';
      case 'medical': return 'bg-red-100 text-red-800';
      case 'security': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDensityColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Select Zone for {cameraType === 'rtsp' ? 'RTSP Camera' : 'Video Processing'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select">Select Existing Zone</TabsTrigger>
            <TabsTrigger value="create">Create New Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {zones.map((zone) => (
                <Card 
                  key={zone.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedZone === zone.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedZone(zone.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-xl">{getZoneTypeIcon(zone.type)}</span>
                        {zone.name}
                      </CardTitle>
                      <Badge className={getZoneTypeColor(zone.type)}>
                        {zone.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{zone.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Capacity:</span>
                        <div className="font-medium">{zone.capacity.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Current:</span>
                        <div className="font-medium">{zone.current_occupancy}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">
                          {((zone.current_occupancy / zone.capacity) * 100).toFixed(1)}% full
                        </span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getDensityColor(zone.density_level || '')}`}
                      >
                        {zone.density_level || 'N/A'}
                      </Badge>
                    </div>

                    {zone.density_level === 'CRITICAL' && (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>High crowd density detected</span>
                      </div>
                    )}

                    {selectedZone === zone.id && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Selected</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {zones.length === 0 && (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Zones Available</h3>
                <p className="text-muted-foreground mb-4">
                  Create a new zone to get started
                </p>
                <Button onClick={() => setActiveTab('create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Zone
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Zone Details Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="zone-name">Zone Name *</Label>
                  <Input
                    id="zone-name"
                    placeholder="e.g., Main Sacred Ghat"
                    value={newZone.name}
                    onChange={(e) => setNewZone(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="zone-type">Zone Type</Label>
                  <select
                    id="zone-type"
                    className="w-full p-2 border rounded-md"
                    value={newZone.type}
                    onChange={(e) => setNewZone(prev => ({ 
                      ...prev, 
                      type: e.target.value as 'ghat' | 'gate' | 'camp' | 'medical' | 'security'
                    }))}
                  >
                    <option value="ghat">🕉️ Sacred Ghat</option>
                    <option value="gate">🚪 Entry Gate</option>
                    <option value="camp">⛺ Pilgrim Camp</option>
                    <option value="medical">🏥 Medical Center</option>
                    <option value="security">🛡️ Security Post</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="zone-capacity">Capacity</Label>
                  <Input
                    id="zone-capacity"
                    type="number"
                    placeholder="1000"
                    value={newZone.capacity}
                    onChange={(e) => setNewZone(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1000 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="zone-description">Description *</Label>
                  <textarea
                    id="zone-description"
                    className="w-full p-2 border rounded-md min-h-[80px]"
                    placeholder="Describe the zone and its purpose..."
                    value={newZone.description}
                    onChange={(e) => setNewZone(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Selected Coordinates</Label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Longitude:</span>
                      <div className="font-mono">{newZone.coordinates.lng.toFixed(6)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Latitude:</span>
                      <div className="font-mono">{newZone.coordinates.lat.toFixed(6)}</div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleCreateZone}
                  disabled={isLoading || !newZone.name || !newZone.description}
                  className="w-full"
                >
                  {isLoading ? 'Creating...' : 'Create Zone'}
                </Button>
              </div>

              {/* Map for coordinate selection */}
              <div className="space-y-2">
                <Label>Click on the map to select coordinates</Label>
                <div 
                  ref={mapContainerRef} 
                  className="w-full h-64 rounded-lg border"
                />
                <p className="text-xs text-muted-foreground">
                  Click anywhere on the map to set the zone coordinates. The red marker shows the selected location.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleZoneSelect}
            disabled={!selectedZone}
            className="bg-gradient-sacred"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Select Zone
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ZoneSelectionModal; 