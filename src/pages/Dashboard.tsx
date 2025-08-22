import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Camera, 
  AlertTriangle, 
  Users, 
  Radio,
  Bell,
  Shield,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import LiveMap from "@/components/dashboard/LiveMap";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import CCTVPanel from "@/components/dashboard/CCTVPanel";
import QuickActions from "@/components/dashboard/QuickActions";
import StatsCards from "@/components/dashboard/StatsCards";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Stats Overview */}
        <StatsCards />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[600px]">
          {/* Main Map View */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="xl:col-span-2"
          >
            <Card className="h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Live Crowd Heatmap
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="animate-pulse">
                      Live
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Camera className="w-4 h-4 mr-2" />
                      View All CCTV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[calc(100%-80px)]">
                <LiveMap />
              </CardContent>
            </Card>
          </motion.div>

          {/* Side Panels */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Alerts Panel */}
            <Card className="h-[280px]">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Live Alerts
                  <Badge variant="destructive" className="ml-auto">3</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-80px)] overflow-hidden">
                <AlertsPanel />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="h-[280px]">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-secondary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QuickActions />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* CCTV Feeds Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Live CCTV Feeds
                <Badge variant="outline" className="ml-auto">12 Active</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CCTVPanel />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;