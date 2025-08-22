// LiveMap.tsx (updated with Mapbox and WS)
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Layers, ZoomIn } from "lucide-react";
import { WS_URL, MAPBOX_ACCESS_TOKEN } from "@/config";
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

const LiveMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const zones = [
    { id: 1, name: "Har Ki Pauri", crowd: "High", alerts: 2, lng: 78.163, lat: 29.9457 },
    { id: 2, name: "Ganga Ghat", crowd: "Medium", alerts: 0, lng: 78.164, lat: 29.946 },
    { id: 3, name: "Main Gate", crowd: "Critical", alerts: 1, lng: 78.165, lat: 29.947 },
    { id: 4, name: "Medical Camp", crowd: "Low", alerts: 0, lng: 78.166, lat: 29.948 }
  ];

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
      zones.forEach(zone => {
        const markerElement = document.createElement('div');
        markerElement.className = 'zone-marker';
        markerElement.innerHTML = `
          <div class="relative">
            <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:scale-110 transition-transform duration-200" 
                 style="background-color: ${getCrowdColor(zone.crowd)}">
              ${zone.alerts > 0 ? '🚨' : '📍'}
            </div>
            <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              ${zone.name}
            </div>
          </div>
        `;

        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([zone.lng, zone.lat])
          .addTo(mapInstance.current!);

        // Add popup
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-3">
              <h3 class="font-semibold text-lg mb-2">${zone.name}</h3>
              <div class="space-y-2 text-sm">
                <div class="flex items-center gap-2">
                  <span class="font-medium">Crowd Level:</span>
                  <Badge class="${getCrowdColor(zone.crowd)}">${zone.crowd}</Badge>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-medium">Active Alerts:</span>
                  <span>${zone.alerts}</span>
                </div>
              </div>
            </div>
          `);
        
        marker.setPopup(popup);
      });
    });

    // WebSocket for heatmap
    const ws = new WebSocket(`${WS_URL}/ws/alerts`);
    
    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "HEATMAP_ALERT" && mapInstance.current) {
        setHeatmapData(data.heatmap_data);
        
        // Remove existing heatmap if present
        if (mapInstance.current.getLayer('heatmap-layer')) {
          mapInstance.current.removeLayer('heatmap-layer');
        }
        if (mapInstance.current.getSource('heatmap')) {
          mapInstance.current.removeSource('heatmap');
        }

        // Add new heatmap
        mapInstance.current.addSource('heatmap', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: data.heatmap_data.hotspots.map((hotspot: any) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [78.163 + hotspot.center_coordinates[0]/10000, 29.9457 + hotspot.center_coordinates[1]/10000]
              },
              properties: {
                intensity: hotspot.intensity
              }
            }))
          }
        });

        mapInstance.current.addLayer({
          id: 'heatmap-layer',
          type: 'heatmap',
          source: 'heatmap',
          paint: {
            'heatmap-intensity': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-intensity'],
              0, 'rgba(0, 255, 0, 0)',
              0.5, 'rgba(255, 165, 0, 0.5)',
              1, 'rgba(255, 0, 0, 0.8)'
            ],
            'heatmap-radius': 30,
            'heatmap-opacity': 0.8
          }
        });
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
      ws.close();
    };
  }, []);

  const getCrowdColor = (level: string) => {
    switch (level) {
      case "Critical": return "#ef4444";
      case "High": return "#f59e0b";
      case "Medium": return "#8b5cf6";
      case "Low": return "#10b981";
      default: return "#6b7280";
    }
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <div ref={mapRef} className="absolute inset-0" />

      {/* Controls */}
      <div className="absolute top-4 right-4 space-y-2">
        <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
          <Layers className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* Crowd Levels Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 space-y-2">
        <h4 className="text-sm font-semibold">Crowd Levels</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCrowdColor("Low") }}></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCrowdColor("Medium") }}></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCrowdColor("High") }}></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCrowdColor("Critical") }}></div>
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
    </div>
  );
};

export default LiveMap;