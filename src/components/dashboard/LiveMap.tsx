// LiveMap.tsx (updated with Mapbox and WS)
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Layers, ZoomIn, AlertTriangle, Users } from "lucide-react";
import { WS_URL, MAPBOX_ACCESS_TOKEN, API_URL } from "@/config";
import { backendService } from "@/services/backendService";
import 'mapbox-gl/dist/mapbox-gl.css';
import { toast } from "sonner";

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

interface Zone {
  id: string;
  name: string;
  type: string;
  coordinates: { lng: number; lat: number };
  capacity: number;
  current_occupancy: number;
  density_level: string;
  heatmap_data?: any;
}

const LiveMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeHeatmapZone, setActiveHeatmapZone] = useState<string | null>(null);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    mapInstance.current = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [78.163, 29.9457], // Haridwar
      zoom: 13,
      pitch: 45,
      bearing: 0
    });

    // Add navigation controls
    mapInstance.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapInstance.current.on('load', () => {
      // Add custom source for the Ganga River
      mapInstance.current!.addSource('ganga-river', {
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

      mapInstance.current!.addLayer({
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

      // Add zone markers
      addZoneMarkers();
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, []);

  // Load zones from backend
  useEffect(() => {
    const loadZones = async () => {
      try {
        const zonesData = await backendService.getZonesWithHeatmap();
        setZones(zonesData);
      } catch (error) {
        console.error('Failed to load zones:', error);
      }
    };

    loadZones();
    const interval = setInterval(loadZones, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // WebSocket for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/live-map`);
    
    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'MAP_UPDATE') {
        // Update zones with new data
        setZones(data.zones || []);
        updateZoneMarkers();
      } else if (data.type === 'ZONE_UPDATE') {
        // Update specific zone
        setZones(prev => prev.map(zone => 
          zone.id === data.zone_id 
            ? { ...zone, ...data.zone_data, heatmap_data: data.heatmap_data }
            : zone
        ));
        
        // Update heatmap if this zone has heatmap data
        if (data.heatmap_data && data.heatmap_data.hotspots) {
          updateZoneHeatmap(data.zone_id, data.heatmap_data);
        }
      } else if (data.type === 'HEATMAP_ALERT') {
        // Automatically show heatmap for zones with crowd alerts
        if (data.heatmap_data && data.heatmap_data.hotspots && data.heatmap_data.hotspots.length > 0) {
          // Find the zone that this camera belongs to
          const zoneId = data.zone_id;
          if (zoneId) {
            updateZoneHeatmap(zoneId, data.heatmap_data);
            
            // Show notification
            toast.info(`Heatmap activated for zone due to crowd alert`, {
              description: `${data.heatmap_data.hotspots.length} hotspots detected`
            });
          }
        }
      } else if (data.type === 'THRESHOLD_BREACH') {
        // Show heatmap for threshold breaches
        const zoneId = data.zone_id;
        if (zoneId) {
          const zone = zones.find(z => z.id === zoneId);
          if (zone && zone.heatmap_data) {
            updateZoneHeatmap(zoneId, zone.heatmap_data);
            
            toast.warning(`Threshold breached in zone`, {
              description: `${data.people_count} people detected (threshold: ${data.threshold})`
            });
          }
        }
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [zones]);

  // Update zones when zones state changes
  useEffect(() => {
    if (mapInstance.current && mapInstance.current.isStyleLoaded()) {
      updateZoneMarkers();
    }
  }, [zones]);

  const addZoneMarkers = () => {
    zones.forEach(zone => {
      const markerElement = document.createElement('div');
      markerElement.className = 'zone-marker';
      markerElement.innerHTML = `
        <div class="relative group">
          <div class="w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:scale-110 transition-transform duration-200" 
               style="background-color: ${getCrowdColor(zone.density_level)}">
            ${zone.heatmap_data?.hotspots?.length > 0 ? '' : getZoneTypeIcon(zone.type)}
          </div>
          <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            ${zone.name}
          </div>
        </div>
      `;

      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([zone.coordinates.lng, zone.coordinates.lat])
        .addTo(mapInstance.current!);

      // Add popup with zone information
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div class="p-3 min-w-[200px]">
            <h3 class="font-semibold text-lg mb-2">${zone.name}</h3>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2">
                <span class="font-medium">Type:</span>
                <Badge class="${getZoneTypeColor(zone.type)}">${zone.type}</Badge>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium">Crowd Level:</span>
                <Badge class="${getCrowdColor(zone.density_level)}">${zone.density_level}</Badge>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium">Occupancy:</span>
                <span>${zone.current_occupancy}/${zone.capacity}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium">Percentage:</span>
                <span>${((zone.current_occupancy / zone.capacity) * 100).toFixed(1)}%</span>
              </div>
              ${zone.heatmap_data?.hotspots?.length > 0 ? `
                <div class="mt-3 p-2 bg-orange-50 rounded border">
                  <div class="flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span class="font-medium">Heatmap Active</span>
                  </div>
                  <div class="text-xs text-orange-600 mt-1">
                    ${zone.heatmap_data.hotspots.length} hotspots detected
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `);
      
      marker.setPopup(popup);

      // Click handler to toggle heatmap
      markerElement.addEventListener('click', () => {
        if (zone.heatmap_data?.hotspots?.length > 0) {
          toggleZoneHeatmap(zone.id);
        }
      });
    });
  };

  const updateZoneMarkers = () => {
    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.zone-marker');
    existingMarkers.forEach(marker => marker.remove());
    
    // Add new markers
    addZoneMarkers();
  };

  const updateZoneHeatmap = (zoneId: string, heatmapData: any) => {
    if (!mapInstance.current) return;

    // Remove existing heatmap for this zone
    removeZoneHeatmap(zoneId);

    if (heatmapData.hotspots && heatmapData.hotspots.length > 0) {
      // Add heatmap source
      mapInstance.current.addSource(`heatmap-${zoneId}`, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: heatmapData.hotspots.map((hotspot: any) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [78.163 + hotspot.center_coordinates[0]/10000, 29.9457 + hotspot.center_coordinates[1]/10000]
            },
            properties: {
              intensity: hotspot.intensity,
              density_level: hotspot.density_level
            }
          }))
        }
      });

      // Add heatmap layer
      mapInstance.current.addLayer({
        id: `heatmap-layer-${zoneId}`,
        type: 'heatmap',
        source: `heatmap-${zoneId}`,
        paint: {
          'heatmap-intensity': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-intensity'],
            0, 'rgba(0, 255, 0, 0)',
            0.3, 'rgba(255, 255, 0, 0.5)',
            0.6, 'rgba(255, 165, 0, 0.7)',
            1, 'rgba(255, 0, 0, 0.9)'
          ],
          'heatmap-radius': 30,
          'heatmap-opacity': heatmapOpacity
        }
      });

      setActiveHeatmapZone(zoneId);
    }
  };

  const removeZoneHeatmap = (zoneId: string) => {
    if (!mapInstance.current) return;

    // Remove heatmap layer
    if (mapInstance.current.getLayer(`heatmap-layer-${zoneId}`)) {
      mapInstance.current.removeLayer(`heatmap-layer-${zoneId}`);
    }

    // Remove heatmap source
    if (mapInstance.current.getSource(`heatmap-${zoneId}`)) {
      mapInstance.current.removeSource(`heatmap-${zoneId}`);
    }

    if (activeHeatmapZone === zoneId) {
      setActiveHeatmapZone(null);
    }
  };

  const toggleZoneHeatmap = (zoneId: string) => {
    if (activeHeatmapZone === zoneId) {
      removeZoneHeatmap(zoneId);
    } else {
      // Remove other heatmaps and show this one
      if (activeHeatmapZone) {
        removeZoneHeatmap(activeHeatmapZone);
      }
      
      const zone = zones.find(z => z.id === zoneId);
      if (zone?.heatmap_data) {
        updateZoneHeatmap(zoneId, zone.heatmap_data);
      }
    }
  };

  const getCrowdColor = (level: string) => {
    switch (level) {
      case "CRITICAL": return "#ef4444";
      case "HIGH": return "#f59e0b";
      case "MEDIUM": return "#8b5cf6";
      case "LOW": return "#10b981";
      default: return "#6b7280";
    }
  };

  const getZoneTypeIcon = (type: string) => {
    switch (type) {
      case 'ghat': return '🕉️';
      case 'gate': return '';
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
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <div ref={mapRef} className="absolute inset-0" />

      {/* Controls */}
      <div className="absolute top-4 right-4 space-y-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-background/80 backdrop-blur-sm"
          onClick={() => setHeatmapOpacity(prev => prev === 0.7 ? 0.3 : 0.7)}
        >
          <Layers className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* Heatmap Controls */}
      {activeHeatmapZone && (
        <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-semibold">Active Heatmap</h4>
          <div className="text-xs text-muted-foreground">
            Zone: {zones.find(z => z.id === activeHeatmapZone)?.name}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">Opacity:</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={heatmapOpacity}
              onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
              className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeZoneHeatmap(activeHeatmapZone)}
            className="w-full text-xs"
          >
            Hide Heatmap
          </Button>
        </div>
      )}

      {/* Crowd Levels Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 space-y-2">
        <h4 className="text-sm font-semibold">Crowd Levels</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCrowdColor("LOW") }}></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCrowdColor("MEDIUM") }}></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCrowdColor("HIGH") }}></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCrowdColor("CRITICAL") }}></div>
            <span>Critical</span>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'} animate-pulse`}></div>
        <span className="text-sm font-medium">
          {isConnected ? 'Live Updates' : 'Connecting...'}
        </span>
      </div>

      {/* Zone Summary */}
      <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 max-w-xs">
        <h4 className="text-sm font-semibold mb-2">Zone Summary</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span>Total Zones:</span>
            <span className="font-medium">{zones.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Active Cameras:</span>
            <span className="font-medium">{zones.filter(z => z.current_occupancy > 0).length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Critical Zones:</span>
            <span className="font-medium text-red-600">
              {zones.filter(z => z.density_level === 'CRITICAL').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;