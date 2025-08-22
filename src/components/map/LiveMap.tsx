import React, { useEffect, useState } from 'react';
import { backendService } from '@/services/backendService';

interface LiveMapProps {
  zones: any[];
  onZoneSelect?: (zoneId: string) => void;
}

const LiveMap: React.FC<LiveMapProps> = ({ zones, onZoneSelect }) => {
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Connect to live map WebSocket
    const ws = new WebSocket(`${WS_URL.replace('http', 'ws')}/ws/live-map`);
    
    ws.onopen = () => {
      console.log('Connected to live map WebSocket');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'MAP_UPDATE' || data.type === 'ZONE_UPDATE') {
        setHeatmapData(data.zones || []);
      }
    };
    
    setWsConnection(ws);
    
    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="live-map-container">
      <h3 className="text-lg font-semibold mb-4">Live Crowd Heatmap</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {heatmapData.map((zone) => (
          <div 
            key={zone.zone_id}
            className="zone-card p-4 border rounded-lg cursor-pointer hover:shadow-md"
            onClick={() => onZoneSelect?.(zone.zone_id)}
          >
            <h4 className="font-medium">{zone.name}</h4>
            <p className="text-sm text-gray-600">{zone.type}</p>
            
            {/* Heatmap Visualization */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Density: {zone.density_level}</span>
                <span className="text-sm font-medium">
                  {zone.current_occupancy}/{zone.capacity}
                </span>
              </div>
              
              {/* Density Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    zone.density_level === 'CRITICAL' ? 'bg-red-500' :
                    zone.density_level === 'HIGH' ? 'bg-orange-500' :
                    zone.density_level === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${zone.occupancy_percentage}%` }}
                />
              </div>
              
              {/* Hotspots */}
              {zone.heatmap_data?.hotspots && zone.heatmap_data.hotspots.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">Hotspots:</p>
                  <div className="space-y-1">
                    {zone.heatmap_data.hotspots.slice(0, 3).map((hotspot: any, idx: number) => (
                      <div key={idx} className="flex items-center text-xs">
                        <div 
                          className={`w-2 h-2 rounded-full mr-2 ${
                            hotspot.density_level === 'CRITICAL' ? 'bg-red-500' :
                            hotspot.density_level === 'HIGH' ? 'bg-orange-500' :
                            hotspot.density_level === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                        />
                        <span>Intensity: {hotspot.intensity.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveMap; 