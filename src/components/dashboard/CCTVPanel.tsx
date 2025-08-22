import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Camera, 
  Maximize2, 
  Volume2, 
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Settings
} from "lucide-react";
import { motion } from "framer-motion";

interface CCTVFeed {
  id: number;
  name: string;
  location: string;
  status: "online" | "offline" | "maintenance";
  peopleCount: number;
  alertLevel: "low" | "medium" | "high" | "critical";
  lastUpdate: string;
}

const CCTVPanel = () => {
  const [selectedFeed, setSelectedFeed] = useState<number | null>(null);
  const [mutedFeeds, setMutedFeeds] = useState<Set<number>>(new Set());

  const feeds: CCTVFeed[] = [
    {
      id: 1,
      name: "Main Gate Camera 1",
      location: "Entry Point",
      status: "online",
      peopleCount: 342,
      alertLevel: "high",
      lastUpdate: "Live"
    },
    {
      id: 2,
      name: "Har Ki Pauri View",
      location: "Sacred Ghat",
      status: "online",
      peopleCount: 1245,
      alertLevel: "critical",
      lastUpdate: "Live"
    },
    {
      id: 3,
      name: "Medical Camp Monitor",
      location: "Medical Zone",
      status: "online",
      peopleCount: 67,
      alertLevel: "low",
      lastUpdate: "Live"
    },
    {
      id: 4,
      name: "Security Checkpoint",
      location: "Gate 3",
      status: "maintenance",
      peopleCount: 0,
      alertLevel: "low",
      lastUpdate: "Offline"
    },
    {
      id: 5,
      name: "Crowd Monitoring 5",
      location: "Main Path",
      status: "online",
      peopleCount: 567,
      alertLevel: "medium",
      lastUpdate: "Live"
    },
    {
      id: 6,
      name: "Parking Area View",
      location: "Vehicle Zone",
      status: "online",
      peopleCount: 89,
      alertLevel: "low",
      lastUpdate: "Live"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-success";
      case "offline": return "bg-destructive";
      case "maintenance": return "bg-warning";
      default: return "bg-muted";
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case "critical": return "border-destructive bg-destructive/10";
      case "high": return "border-warning bg-warning/10";
      case "medium": return "border-secondary bg-secondary/10";
      case "low": return "border-success bg-success/10";
      default: return "border-border bg-muted/10";
    }
  };

  const toggleMute = (feedId: number) => {
    setMutedFeeds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(feedId)) {
        newSet.delete(feedId);
      } else {
        newSet.add(feedId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      {/* Feed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {feeds.map((feed, index) => (
          <motion.div
            key={feed.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${getAlertColor(feed.alertLevel)}`}>
              <CardContent className="p-4">
                {/* Camera Feed Display */}
                <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-700 rounded-lg mb-3 overflow-hidden">
                  {feed.status === "online" ? (
                    <>
                      {/* Simulated video feed */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-purple-900/50">
                        <div className="absolute inset-0 opacity-30">
                          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-float"></div>
                        </div>
                      </div>
                      
                      {/* Live indicator */}
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-destructive/90 text-destructive-foreground px-2 py-1 rounded text-xs">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        LIVE
                      </div>

                      {/* People count overlay */}
                      <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                        {feed.peopleCount} people
                      </div>

                      {/* Control overlay */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity">
                        <div className="flex gap-1">
                          <Button variant="secondary" size="sm" className="w-8 h-8 p-0">
                            <Play className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="w-8 h-8 p-0"
                            onClick={() => toggleMute(feed.id)}
                          >
                            {mutedFeeds.has(feed.id) ? 
                              <VolumeX className="w-3 h-3" /> : 
                              <Volume2 className="w-3 h-3" />
                            }
                          </Button>
                        </div>
                        <Button variant="secondary" size="sm" className="w-8 h-8 p-0">
                          <Maximize2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <div className="text-center">
                        <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {feed.status === "maintenance" ? "Under Maintenance" : "Offline"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Feed Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{feed.name}</h4>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(feed.status)}`}></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{feed.location}</span>
                    <span>{feed.lastUpdate}</span>
                  </div>

                  {/* Alert level badge */}
                  {feed.status === "online" && (
                    <Badge 
                      variant={feed.alertLevel === "critical" ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      {feed.alertLevel.toUpperCase()} DENSITY
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Control Panel */}
      <div className="flex items-center justify-between bg-muted rounded-lg p-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-sm">
              {feeds.filter(f => f.status === "online").length} Online
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-sm">
              {feeds.filter(f => f.status === "maintenance").length} Maintenance
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CCTVPanel;