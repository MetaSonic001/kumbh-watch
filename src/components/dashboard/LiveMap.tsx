import { useEffect, useRef } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Layers, ZoomIn } from "lucide-react";

const LiveMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // In a real implementation, this would initialize Leaflet/Mapbox
    // For now, we'll create a styled placeholder
  }, []);

  const zones = [
    { id: 1, name: "Har Ki Pauri", crowd: "High", alerts: 2, x: "25%", y: "30%" },
    { id: 2, name: "Ganga Ghat", crowd: "Medium", alerts: 0, x: "60%", y: "45%" },
    { id: 3, name: "Main Gate", crowd: "Critical", alerts: 1, x: "80%", y: "20%" },
    { id: 4, name: "Medical Camp", crowd: "Low", alerts: 0, x: "40%", y: "70%" }
  ];

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
    <div className="relative w-full h-full bg-gradient-water rounded-lg overflow-hidden">
      {/* Map Background */}
      <div 
        ref={mapRef}
        className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {/* River overlay */}
        <div className="absolute inset-0">
          <svg viewBox="0 0 400 300" className="w-full h-full">
            <path
              d="M0,150 Q100,120 200,150 T400,150 L400,300 L0,300 Z"
              fill="rgba(59, 130, 246, 0.3)"
              className="animate-float"
            />
            <path
              d="M0,180 Q150,160 300,180 T400,180 L400,300 L0,300 Z"
              fill="rgba(59, 130, 246, 0.2)"
              className="animate-float"
              style={{ animationDelay: "2s" }}
            />
          </svg>
        </div>
      </div>

      {/* Zone markers */}
      {zones.map((zone) => (
        <div
          key={zone.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 animate-pulse-glow"
          style={{ left: zone.x, top: zone.y }}
        >
          <div className="relative group cursor-pointer">
            <div className={`w-4 h-4 rounded-full ${getCrowdColor(zone.crowd)} border-2 border-white shadow-lg`} />
            
            {/* Alert indicator */}
            {zone.alerts > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center animate-pulse">
                <span className="text-xs text-destructive-foreground font-bold">{zone.alerts}</span>
              </div>
            )}

            {/* Hover tooltip */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border rounded-lg p-3 shadow-lg min-w-40 z-10">
              <div className="space-y-2">
                <h4 className="font-semibold">{zone.name}</h4>
                <div className="flex items-center justify-between text-sm">
                  <span>Crowd Level:</span>
                  <Badge variant={zone.crowd === "Critical" ? "destructive" : "outline"} className="text-xs">
                    {zone.crowd}
                  </Badge>
                </div>
                {zone.alerts > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Active Alerts:</span>
                    <Badge variant="destructive" className="text-xs">{zone.alerts}</Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Map Controls */}
      <div className="absolute top-4 right-4 space-y-2">
        <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
          <Layers className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 space-y-2">
        <h4 className="text-sm font-semibold">Crowd Levels</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-success rounded-full"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-secondary rounded-full"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-warning rounded-full"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded-full"></div>
            <span>Critical</span>
          </div>
        </div>
      </div>

      {/* Live update indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
        <span className="text-sm font-medium">Live Updates</span>
      </div>
    </div>
  );
};

export default LiveMap;