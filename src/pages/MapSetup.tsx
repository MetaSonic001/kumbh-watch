import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Map as MapIcon, 
  Plus, 
  Camera, 
  MapPin,
  Settings,
  Save,
  Users
} from "lucide-react";
import { motion } from "framer-motion";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import InteractiveMap from "@/components/map/InteractiveMap";
import ZoneManager from "@/components/map/ZoneManager";

const MapSetup = () => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoneType, setZoneType] = useState("ghat");
  
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MapIcon className="w-8 h-8 text-primary" />
              Map Configuration
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure zones, gates, and monitoring points for the Kumbh Mela
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Setup Mode</Badge>
            <Button className="bg-gradient-sacred">
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-[700px]">
          {/* Zone Configuration Panel */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Zone Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ZoneManager 
                  selectedZone={selectedZone}
                  onZoneSelect={setSelectedZone}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Interactive Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="xl:col-span-3"
          >
            <Card className="h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-secondary" />
                    Kumbh Mela Area
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={zoneType} onValueChange={setZoneType}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ghat">Sacred Ghat</SelectItem>
                        <SelectItem value="gate">Entry Gate</SelectItem>
                        <SelectItem value="camp">Camp Area</SelectItem>
                        <SelectItem value="medical">Medical Zone</SelectItem>
                        <SelectItem value="security">Security Post</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Zone
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[calc(100%-80px)]">
                <InteractiveMap 
                  selectedZone={selectedZone}
                  zoneType={zoneType}
                  onZoneSelect={setSelectedZone}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default MapSetup;