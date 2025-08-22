import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Plus, Camera, Video, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { backendService } from "@/services/backendService";

interface Zone {
  id: string;
  name: string;
  type: string;
  coordinates: { lng: number; lat: number };
  capacity: number;
  description: string;
  current_occupancy: number;
  status: string;
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
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('select');
  
  // New zone form
  const [newZone, setNewZone] = useState({
    name: '',
    type: 'ghat',
    coordinates: { lng: 78.163, lat: 29.9457 }, // Default to Haridwar
    capacity: 1000,
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadZones();
    }
  }, [isOpen]);

  const loadZones = async () => {
    try {
      setIsLoading(true);
      const zonesData = await backendService.getZones();
      setZones(zonesData);
    } catch (error) {
      console.error('Failed to load zones:', error);
      toast.error('Failed to load zones');
    } finally {
      setIsLoading(false);
    }
  };

  const createZone = async () => {
    try {
      setIsLoading(true);
      const zoneData = await backendService.createZone({
        name: newZone.name,
        type: newZone.type,
        coordinates: newZone.coordinates,
        capacity: newZone.capacity,
        description: newZone.description
      });
      
      toast.success(`Zone "${zoneData.name}" created successfully`);
      setZones(prev => [...prev, zoneData]);
      setActiveTab('select');
      
      // Reset form
      setNewZone({
        name: '',
        type: 'ghat',
        coordinates: { lng: 78.163, lat: 29.9457 },
        capacity: 1000,
        description: ''
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
      case 'gate': return '��';
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {cameraType === 'rtsp' ? <Camera className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            Select Zone for {cameraType === 'rtsp' ? 'RTSP Camera' : 'Video Processing'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select">Select Existing Zone</TabsTrigger>
            <TabsTrigger value="create">Create New Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Choose a zone where this {cameraType === 'rtsp' ? 'camera' : 'video'} will be monitoring crowd activity.
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : zones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No zones available. Create a new zone first.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab('create')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Zone
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {zones.map((zone) => (
                  <Card 
                    key={zone.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedZone === zone.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedZone(zone.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="text-2xl">{getZoneTypeIcon(zone.type)}</span>
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
                          <div className="font-semibold">{zone.capacity.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Current:</span>
                          <div className="font-semibold">{zone.current_occupancy.toLocaleString()}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {zone.coordinates.lat.toFixed(4)}, {zone.coordinates.lng.toFixed(4)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4" />
                        <span className="text-muted-foreground">
                          {((zone.current_occupancy / zone.capacity) * 100).toFixed(1)}% occupied
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {zones.length > 0 && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleZoneSelect}
                  disabled={!selectedZone}
                  className="bg-gradient-sacred"
                >
                  Select Zone
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Create a new zone for crowd monitoring. This zone will appear on the live map.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zone-name">Zone Name</Label>
                <Input
                  id="zone-name"
                  placeholder="e.g., Main Sacred Ghat"
                  value={newZone.name}
                  onChange={(e) => setNewZone(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="zone-type">Zone Type</Label>
                <Select 
                  value={newZone.type} 
                  onValueChange={(value) => setNewZone(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ghat">🕉️ Sacred Ghat</SelectItem>
                    <SelectItem value="gate">�� Entry Gate</SelectItem>
                    <SelectItem value="camp">⛺ Pilgrim Camp</SelectItem>
                    <SelectItem value="medical">🏥 Medical Camp</SelectItem>
                    <SelectItem value="security">🛡️ Security Post</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="zone-description">Description</Label>
              <Input
                id="zone-description"
                placeholder="Brief description of the zone"
                value={newZone.description}
                onChange={(e) => setNewZone(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="zone-lat">Latitude</Label>
                <Input
                  id="zone-lat"
                  type="number"
                  step="0.0001"
                  placeholder="29.9457"
                  value={newZone.coordinates.lat}
                  onChange={(e) => setNewZone(prev => ({ 
                    ...prev, 
                    coordinates: { ...prev.coordinates, lat: parseFloat(e.target.value) || 29.9457 }
                  }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="zone-lng">Longitude</Label>
              <Input
                id="zone-lng"
                type="number"
                step="0.0001"
                placeholder="78.163"
                value={newZone.coordinates.lng}
                onChange={(e) => setNewZone(prev => ({ 
                  ...prev, 
                  coordinates: { ...prev.coordinates, lng: parseFloat(e.target.value) || 78.163 }
                }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setActiveTab('select')}>
                Back to Selection
              </Button>
              <Button 
                onClick={createZone}
                disabled={!newZone.name || isLoading}
                className="bg-gradient-secondary"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Zone
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ZoneSelectionModal; 