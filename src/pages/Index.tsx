import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Shield, MapPin, Users, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-8 max-w-2xl"
      >
        <div className="space-y-4">
          <div className="inline-flex items-center gap-3 text-primary-foreground mb-6">
            <div className="w-16 h-16 bg-primary-foreground/10 rounded-xl flex items-center justify-center animate-pulse-glow">
              <Shield className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-primary-foreground">Kumbh Mela</h1>
          <h2 className="text-2xl text-primary-foreground/90">Crowd Management System</h2>
          <p className="text-primary-foreground/80 text-lg max-w-lg mx-auto">
            Advanced monitoring and emergency management platform for the sacred Kumbh Mela gathering
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-md mx-auto">
          <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4 space-y-2">
            <MapPin className="w-6 h-6 text-primary-foreground mx-auto" />
            <p className="text-primary-foreground text-sm font-medium">Live Mapping</p>
          </div>
          <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4 space-y-2">
            <Users className="w-6 h-6 text-primary-foreground mx-auto" />
            <p className="text-primary-foreground text-sm font-medium">Crowd Control</p>
          </div>
          <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4 space-y-2">
            <BarChart3 className="w-6 h-6 text-primary-foreground mx-auto" />
            <p className="text-primary-foreground text-sm font-medium">Analytics</p>
          </div>
        </div>

        <Button 
          onClick={() => navigate("/login")}
          size="lg"
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-lg px-8 py-6 rounded-xl shadow-elevated"
        >
          Access Control Center
        </Button>
      </motion.div>
    </div>
  );
};

export default Index;
