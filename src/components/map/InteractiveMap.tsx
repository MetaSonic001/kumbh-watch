import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MapPin, 
  Camera, 
  Plus,
  Trash2,
  Settings,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Zone {
  id: string;
  name: string;
  type: string;
  coordinates: { x: number; y: number };
  capacity: number;
  cctvCount: number;
  status: "active" | "inactive" | "maintenance";
}

interface InteractiveMapProps {
  selectedZone: string | null;
  zoneType: string;
  onZoneSelect: (zoneId: string | null) => void;
}

const InteractiveMap = ({ selectedZone, zoneType, onZoneSelect }: InteractiveMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [zones, setZones] = useState<Zone[]>([
    {
      id: "zone-1",
      name: "Har Ki Pauri Ghat",
      type: "ghat",
      coordinates: { x: 30, y: 40 },
      capacity: 50000,
      cctvCount: 8,
      status: "active"
    },
    {
      id: "zone-2", 
      name: "Main Entry Gate",
      type: "gate",
      coordinates: { x: 70, y: 20 },
      capacity: 15000,
      cctvCount: 4,
      status: "active"
    },
    {
      id: "zone-3",
      name: "Medical Camp Area",
      type: "medical",
      coordinates: { x: 60, y: 70 },
      capacity: 5000,
      cctvCount: 2,
      status: "active"
    },
    {
      id: "zone-4",
      name: "Security Checkpoint",
      type: "security",
      coordinates: { x: 80, y: 60 },
      capacity: 2000,
      cctvCount: 3,
      status: "maintenance"
    }
  ]);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const getZoneIcon = (type: string) => {
    switch (type) {
      case "ghat": return "🕉️";
      case "gate": return "🚪";
      case "camp": return "⛺";
      case "medical": return "🏥";
      case "security": return "🛡️";
      default: return "📍";
    }
  };

  const getZoneColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success border-success text-success-foreground";
      case "inactive": return "bg-muted border-muted text-muted-foreground";
      case "maintenance": return "bg-warning border-warning text-warning-foreground";
      default: return "bg-primary border-primary text-primary-foreground";
    }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current || !isDrawing) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newZone: Zone = {
      id: `zone-${Date.now()}`,
      name: `New ${zoneType.charAt(0).toUpperCase() + zoneType.slice(1)} Zone`,
      type: zoneType,
      coordinates: { x, y },
      capacity: 10000,
      cctvCount: 0,
      status: "active"
    };
    
    setZones(prev => [...prev, newZone]);
    setIsDrawing(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setMousePosition({ x, y });
  };

  const deleteZone = (zoneId: string) => {
    setZones(prev => prev.filter(zone => zone.id !== zoneId));
    if (selectedZone === zoneId) {
      onZoneSelect(null);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <div 
        ref={mapRef}
        className={`relative w-full h-full bg-gradient-water rounded-lg overflow-hidden ${
          isDrawing ? 'cursor-crosshair' : 'cursor-default'
        }`}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M20 20c0-11.046-8.954-20-20-20v20h20z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {/* River Path */}
        <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full pointer-events-none">
          <path
            d="M0,120 Q100,100 200,120 T400,140 L400,180 Q300,160 200,180 T0,160 Z"
            fill="rgba(59, 130, 246, 0.3)"
            className="animate-float"
          />
          <text x="200" y="150" textAnchor="middle" className="fill-blue-800 text-sm font-bold opacity-60">
            गंगा नदी (Ganga River)
          </text>
        </svg>

        {/* Existing Zones */}
        <AnimatePresence>
          {zones.map((zone) => (
            <motion.div
              key={zone.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ 
                left: `${zone.coordinates.x}%`, 
                top: `${zone.coordinates.y}%` 
              }}
              onClick={(e) => {
                e.stopPropagation();
                onZoneSelect(zone.id === selectedZone ? null : zone.id);
              }}
            >
              {/* Zone Marker */}
              <div className={`
                relative w-8 h-8 rounded-full border-2 flex items-center justify-center
                transition-all duration-200 hover:scale-110
                ${getZoneColor(zone.status)}
                ${zone.id === selectedZone ? 'ring-4 ring-primary/50 scale-125' : ''}
              `}>
                <span className="text-sm">{getZoneIcon(zone.type)}</span>
                
                {/* CCTV count indicator */}
                {zone.cctvCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs">
                    {zone.cctvCount}
                  </div>
                )}
              </div>

              {/* Zone Info Card */}
              {zone.id === selectedZone && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-10 left-1/2 transform -translate-x-1/2 z-10"
                >
                  <Card className="min-w-48 shadow-lg">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{zone.name}</h4>
                        <Badge variant="outline" className="text-xs capitalize">
                          {zone.type}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Capacity:</span>
                          <span className="font-medium">{zone.capacity.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CCTV:</span>
                          <span className="font-medium">{zone.cctvCount} cameras</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant="outline" className={`text-xs ${getZoneColor(zone.status)}`}>
                            {zone.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="text-xs h-6 px-2 flex-1">
                          <Camera className="w-3 h-3 mr-1" />
                          Add CCTV
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-6 px-2 flex-1">
                          <Settings className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-6 px-2 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteZone(zone.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Drawing Preview */}
        {isDrawing && (
          <div 
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ 
              left: `${mousePosition.x}%`, 
              top: `${mousePosition.y}%` 
            }}
          >
            <div className="w-8 h-8 rounded-full border-2 border-primary bg-primary/20 flex items-center justify-center animate-pulse">
              <span className="text-sm">{getZoneIcon(zoneType)}</span>
            </div>
          </div>
        )}

        {/* Grid overlay for precision */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      {/* Drawing Controls */}
      <div className="absolute top-4 right-4 space-y-2">
        <Button
          variant={isDrawing ? "default" : "outline"}
          size="sm"
          onClick={() => setIsDrawing(!isDrawing)}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isDrawing ? "Cancel" : "Add Zone"}
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 space-y-2 max-w-xs">
        <h4 className="text-sm font-semibold">Zone Types</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span>🕉️</span>
            <span>Sacred Ghat</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🚪</span>
            <span>Entry Gate</span>
          </div>
          <div className="flex items-center gap-2">
            <span>⛺</span>
            <span>Camp Area</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🏥</span>
            <span>Medical Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🛡️</span>
            <span>Security Post</span>
          </div>
        </div>
        {isDrawing && (
          <p className="text-xs text-primary font-medium pt-2 border-t">
            Click on the map to place a new {zoneType} zone
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{zones.length} Zones</span>
          </div>
          <div className="flex items-center gap-1">
            <Camera className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">
              {zones.reduce((sum, zone) => sum + zone.cctvCount, 0)} Cameras
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">
              {zones.reduce((sum, zone) => sum + zone.capacity, 0).toLocaleString()} Capacity
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMap;
