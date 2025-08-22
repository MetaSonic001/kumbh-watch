import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSetup } from "@/contexts/SetupContext";
import SetupLayout from "@/components/setup/SetupLayout";

const SetupComplete = () => {
  const navigate = useNavigate();
  const { state, completeSetup } = useSetup();

  const handleComplete = () => {
    completeSetup();
    navigate("/dashboard");
  };

  return (
    <SetupLayout
      title="Setup Complete!"
      description="Your Kumbh Mela crowd management system is ready to deploy"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl mx-auto space-y-8"
      >
        <Card className="border-success bg-gradient-sacred text-primary-foreground">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-primary-foreground/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold mb-4">System Ready for Deployment</h2>
            <p className="text-primary-foreground/90 text-lg">
              Your comprehensive crowd management system has been configured successfully
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
              <h3 className="font-bold text-xl">{state.zones.length}</h3>
              <p className="text-muted-foreground">Zones Configured</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
              <h3 className="font-bold text-xl">{state.cameras.length}</h3>
              <p className="text-muted-foreground">Cameras Deployed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
              <h3 className="font-bold text-xl">{state.teams.length}</h3>
              <p className="text-muted-foreground">Teams Organized</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button size="lg" onClick={handleComplete} className="bg-gradient-sacred text-lg px-8 py-6">
            Launch Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </motion.div>
    </SetupLayout>
  );
};

export default SetupComplete;