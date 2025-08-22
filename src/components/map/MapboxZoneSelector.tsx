import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Plus, 
  Trash2,
  Save,
  X,
  Navigation
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MAPBOX_ACCESS_TOKEN } from "@/config";
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

interface ZoneCoordinates {
  lng: number;
  lat: number;
}

interface Zone {
  id: string;
  name: string;
  type: string;
  coordinates: ZoneCoordinates;
  capacity: number;
  description: string;
}

interface MapboxZoneSelectorProps {
  zones: Zone[];
  onZoneAdd: (zone: Omit<Zone, 'id'>) => void;
  onZoneDelete: (zoneId: string) => void;
  selectedZoneType: string;
}

const MapboxZoneSelector = ({ 
  zones, 
  onZoneAdd, 
  onZoneDelete, 
  selectedZoneType 
}: MapboxZoneSelectorProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [newZone, setNewZone] = useState({
    name: "",
    capacity: "",
    description: ""
  });
  const [clickedCoordinates, setClickedCoordinates] = useState<ZoneCoordinates | null>(null);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // Haridwar coordinates (center of the map)
  const HARIDWAR_CENTER: ZoneCoordinates = { lng: 78.163, lat: 29.9457 };

  const zoneTypeColors = {
    ghat: "#3b82f6",
    gate: "#8b5cf6", 
    camp: "#10b981",
    medical: "#ef4444",
    security: "#f59e0b"
  };

  const zoneTypeIcons = {
    ghat: "🕉️",
    gate: "🚪",
    camp: "⛺",
    medical: "🏥",
    security: "🛡️"
  };

  useEffect(() => {
    if (!mapRef.current) return;

    console.log('Initializing Mapbox map...', { 
      container: mapRef.current, 
      token: MAPBOX_ACCESS_TOKEN,
      center: HARIDWAR_CENTER,
      containerDimensions: {
        width: mapRef.current.offsetWidth,
        height: mapRef.current.offsetHeight,
        clientWidth: mapRef.current.clientWidth,
        clientHeight: mapRef.current.clientHeight
      }
    });

    setMapLoading(true);
    setMapError(null);

    try {
      // Initialize map
      mapInstance.current = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [HARIDWAR_CENTER.lng, HARIDWAR_CENTER.lat],
        zoom: 13,
        pitch: 45,
        bearing: 0
      });

      console.log('Mapbox map created successfully');

      // Add navigation controls
      mapInstance.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add custom style for the river
      mapInstance.current.on('load', () => {
        console.log('Map loaded, adding custom layers...');
        setMapLoading(false);
        try {
          // Add a custom source for the Ganga River
          if (mapInstance.current) {
            mapInstance.current.addSource('ganga-river', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [78.15, 29.95],
                    [78.16, 29.94],
                    [78.17, 29.93],
                    [78.18, 29.92]
                  ]
                }
              }
            });

            mapInstance.current.addLayer({
              id: 'ganga-river',
              type: 'line',
              source: 'ganga-river',
              layout: {},
              paint: {
                'line-color': '#3b82f6',
                'line-width': 8,
                'line-opacity': 0.6
              }
            });

            // Add river label
            mapInstance.current.addSource('river-label', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: { name: 'गंगा नदी (Ganga River)' },
                geometry: {
                  type: 'Point',
                  coordinates: [78.165, 29.935]
                }
              }
            });

            mapInstance.current.addLayer({
              id: 'river-label',
              type: 'symbol',
              source: 'river-label',
              layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Semibold'],
                'text-size': 14,
                'text-offset': [0, 0],
                'text-anchor': 'center'
              },
              paint: {
                'text-color': '#1e40af',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2
              }
            });

            console.log('Custom layers added successfully');
          }
        } catch (error) {
          console.error('Error adding custom map layers:', error);
          setMapError('Failed to add custom layers');
        }
      });

      // Handle map clicks for zone creation
      mapInstance.current.on('click', (e) => {
        if (isDrawing) {
          setClickedCoordinates({
            lng: e.lngLat.lng,
            lat: e.lngLat.lat
          });
          setShowZoneForm(true);
          setIsDrawing(false);
        }
      });

      // Force resize after a short delay to ensure proper rendering
      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.resize();
          console.log('Map resized');
        }
      }, 100);

      // Handle map errors
      mapInstance.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError('Mapbox error occurred');
        setMapLoading(false);
      });

      console.log('Mapbox map initialization completed');

    } catch (error) {
      console.error('Error initializing Mapbox:', error);
      setMapError('Failed to initialize map');
      setMapLoading(false);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, [isDrawing]);

  // Update markers when zones change
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Add new markers for each zone
    zones.forEach(zone => {
      const markerElement = document.createElement('div');
      markerElement.className = 'zone-marker';
      markerElement.innerHTML = `
        <div class="relative">
          <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:scale-110 transition-transform duration-200" 
               style="background-color: ${zoneTypeColors[zone.type as keyof typeof zoneTypeColors] || '#6b7280'}">
            ${zoneTypeIcons[zone.type as keyof typeof zoneTypeIcons] || '📍'}
          </div>
          <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            ${zone.name}
          </div>
        </div>
      `;

      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([zone.coordinates.lng, zone.coordinates.lat])
        .addTo(mapInstance.current!);

      // Add click handler to marker
      markerElement.addEventListener('click', () => {
        // Show zone info popup
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-3">
              <h3 class="font-semibold text-lg mb-2">${zone.name}</h3>
              <div class="space-y-2 text-sm">
                <div class="flex items-center gap-2">
                  <span class="text-lg">${zoneTypeIcons[zone.type as keyof typeof zoneTypeIcons]}</span>
                  <span class="capitalize">${zone.type}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-medium">Capacity:</span>
                  <span>${zone.capacity.toLocaleString()}</span>
                </div>
                ${zone.description && `
                  <div class="text-muted-foreground">
                    ${zone.description}
                  </div>
                `}
              </div>
            </div>
          `);
        
        marker.setPopup(popup);
        popup.addTo(mapInstance.current!);
      });

      markersRef.current[zone.id] = marker;
    });
  }, [zones, zoneTypeColors, zoneTypeIcons]);

  const handleStartDrawing = () => {
    setIsDrawing(true);
    if (mapRef.current) {
      mapRef.current.style.cursor = 'crosshair';
    }
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setClickedCoordinates(null);
    setShowZoneForm(false);
    if (mapRef.current) {
      mapRef.current.style.cursor = 'default';
    }
  };

  const handleCreateZone = () => {
    if (!clickedCoordinates || !newZone.name.trim() || !newZone.capacity) {
      return;
    }

    onZoneAdd({
      name: newZone.name,
      type: selectedZoneType,
      coordinates: clickedCoordinates,
      capacity: parseInt(newZone.capacity),
      description: newZone.description
    });

    // Reset form
    setNewZone({ name: "", capacity: "", description: "" });
    setClickedCoordinates(null);
    setShowZoneForm(false);
    setIsDrawing(false);
    if (mapRef.current) {
      mapRef.current.style.cursor = 'default';
    }
  };

  const handleDeleteZone = (zoneId: string) => {
    onZoneDelete(zoneId);
  };

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleStartDrawing}
          disabled={isDrawing}
          className="bg-gradient-sacred"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isDrawing ? 'Click on map to place zone' : 'Add Zone on Map'}
        </Button>

        {isDrawing && (
          <Button
            variant="outline"
            onClick={handleCancelDrawing}
            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Navigation className="w-4 h-4" />
          <span>Click and drag to navigate, scroll to zoom</span>
        </div>
      </div>

      {/* Map Container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div 
            ref={mapRef}
            className="w-full h-96 relative bg-muted/20"
            style={{ 
              minHeight: '384px',
              height: '384px',
              width: '100%',
              position: 'relative'
            }}
          />
          
          {/* Loading State */}
          {mapLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading Map...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 z-10">
              <div className="text-center p-4">
                <div className="text-destructive text-lg mb-2">⚠️</div>
                <p className="text-sm text-destructive font-medium">{mapError}</p>
                <p className="text-xs text-muted-foreground mt-1">Check console for details</p>
              </div>
            </div>
          )}

          {/* Debug info */}
          <div className="p-2 bg-muted/50 text-xs text-muted-foreground">
            Map Container: {mapRef.current ? 'Mounted' : 'Not Mounted'} | 
            Dimensions: 100% x 384px | 
            Status: {mapLoading ? 'Loading' : mapError ? 'Error' : 'Ready'}
          </div>
        </CardContent>
      </Card>

      {/* Zone Creation Form */}
      <AnimatePresence>
        {showZoneForm && clickedCoordinates && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-primary">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Create New Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Coordinates</Label>
                    <p className="font-mono text-xs">
                      {clickedCoordinates.lng.toFixed(6)}, {clickedCoordinates.lat.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Zone Type</Label>
                    <Badge variant="outline" className="capitalize">
                      {zoneTypeIcons[selectedZoneType as keyof typeof zoneTypeIcons]} {selectedZoneType}
                    </Badge>
                  </div>
                </div>

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
                  <Input
                    id="zone-description"
                    placeholder="Brief description of the zone..."
                    value={newZone.description}
                    onChange={(e) => setNewZone(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateZone}
                    className="flex-1 bg-gradient-sacred"
                    disabled={!newZone.name.trim() || !newZone.capacity}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Create Zone
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleCancelDrawing}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone List */}
      {zones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-secondary" />
              Zones on Map ({zones.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {zones.map((zone) => (
                <motion.div
                  key={zone.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                      style={{ backgroundColor: zoneTypeColors[zone.type as keyof typeof zoneTypeColors] || '#6b7280' }}
                    >
                      {zoneTypeIcons[zone.type as keyof typeof zoneTypeIcons] || '📍'}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{zone.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {zone.coordinates.lng.toFixed(4)}, {zone.coordinates.lat.toFixed(4)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {zone.capacity.toLocaleString()}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteZone(zone.id)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MapboxZoneSelector; 