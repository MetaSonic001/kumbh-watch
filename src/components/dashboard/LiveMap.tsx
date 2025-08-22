// LiveMap.tsx (updated with Mapbox and WS)
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl'; // Correct package nameimport { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Layers, ZoomIn } from "lucide-react";
import { WS_URL, MAPBOX_ACCESS_TOKEN } from "@/config";

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

const LiveMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [heatmapData, setHeatmapData] = useState(null);

  const zones = [
    { id: 1, name: "Har Ki Pauri", crowd: "High", alerts: 2, lng: 78.163, lat: 29.9457 },
    { id: 2, name: "Ganga Ghat", crowd: "Medium", alerts: 0, lng: 78.164, lat: 29.946 },
    { id: 3, name: "Main Gate", crowd: "Critical", alerts: 1, lng: 78.165, lat: 29.947 },
    { id: 4, name: "Medical Camp", crowd: "Low", alerts: 0, lng: 78.166, lat: 29.948 }
  ];

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [78.163, 29.9457], // Haridwar
      zoom: 13
    });

    map.on('load', () => {
      zones.forEach(zone => {
        new mapboxgl.Marker()
          .setLngLat([zone.lng, zone.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<h3>${zone.name}</h3><p>Crowd: ${zone.crowd}</p>`))
          .addTo(map);
      });
    });

    // WS for heatmap
    const ws = new WebSocket(`${WS_URL}/ws/alerts`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "HEATMAP_ALERT") {
        setHeatmapData(data.heatmap_data);
        // Add heatmap layer (simplified)
        if (map.getSource('heatmap')) {
          map.removeSource('heatmap');
        }
        map.addSource('heatmap', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: data.heatmap_data.hotspots.map(hotspot => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [78.163 + hotspot.center_coordinates[0]/10000, 29.9457 + hotspot.center_coordinates[1]/10000] // Scale pixels to geo
              },
              properties: {
                intensity: hotspot.intensity
              }
            }))
          }
        });
        map.addLayer({
          id: 'heatmap-layer',
          type: 'heatmap',
          source: 'heatmap',
          paint: {
            'heatmap-intensity': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1]
          }
        });
      }
    };

    return () => {
      map.remove();
      ws.close();
    };
  }, []);

  const getCrowdColor = (level: string) => {
    switch (level) {
      case "Critical": return "bg-destructive";
      case "High": return "bg-warning";
      case "Medium": return "bg-secondary";
      case "Low": return "bg-success";
      default: return "bg-muted";
    }
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <div ref={mapRef} className="absolute inset-0" />

      {/* Controls and legend as before */}
      <div className="absolute top-4 right-4 space-y-2">
        <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
          <Layers className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 space-y-2">
        <h4 className="text-sm font-semibold">Crowd Levels</h4>
        {/* ... legend ... */}
      </div>

      <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
        <span className="text-sm font-medium">Live Updates</span>
      </div>
    </div>
  );
};

export default LiveMap;