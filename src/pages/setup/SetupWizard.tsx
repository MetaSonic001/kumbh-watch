import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Camera, 
  Users, 
  CheckCircle,
  ArrowRight,
  Shield,
  Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { useSetup } from "@/contexts/SetupContext";
import SetupLayout from "@/components/setup/SetupLayout";
import StepIndicator from "@/components/setup/StepIndicator";

const SetupWizard = () => {
  const navigate = useNavigate();
  const { state, setCurrentStep } = useSetup();

  const steps = [
    {
      number: 1,
      title: "Zone Setup",
      description: "Configure sacred areas and entry points"
    },
    {
      number: 2, 
      title: "CCTV Setup",
      description: "Place cameras and monitoring devices"
    },
    {
      number: 3,
      title: "Team Setup", 
      description: "Organize security and medical teams"
    },
    {
      number: 4,
      title: "Complete",
      description: "Review and activate system"
    }
  ];

  const setupSteps = [
    {
      step: 1,
      title: "Zone & Gate Configuration",
      description: "Set up sacred ghats, entry gates, medical zones, and security checkpoints",
      icon: MapPin,
      color: "text-primary",
      bgColor: "bg-primary/10",
      route: "/setup/zones",
      completed: state.completedSteps.includes(1),
      requirements: "Define all areas and their capacities"
    },
    {
      step: 2,
      title: "CCTV & Device Setup",
      description: "Deploy cameras, configure RTSP streams, and set monitoring thresholds",
      icon: Camera,
      color: "text-secondary", 
      bgColor: "bg-secondary/10",
      route: "/setup/cctv",
      completed: state.completedSteps.includes(2),
      requirements: "Place cameras in each zone"
    },
    {
      step: 3,
      title: "Team Organization",
      description: "Configure police, medical, volunteer teams and assign responsibilities",
      icon: Users,
      color: "text-accent",
      bgColor: "bg-accent/10", 
      route: "/setup/teams",
      completed: state.completedSteps.includes(3),
      requirements: "Assign teams to zones"
    }
  ];

  useEffect(() => {
    setCurrentStep(1);
  }, [setCurrentStep]);

  const handleStepClick = (route: string, stepNumber: number) => {
    setCurrentStep(stepNumber);
    navigate(route);
  };

  const canProceedToStep = (stepNumber: number) => {
    if (stepNumber === 1) return true;
    return state.completedSteps.includes(stepNumber - 1);
  };

  const allStepsCompleted = state.completedSteps.length >= 3;

  return (
    <SetupLayout
      title="Setup Wizard"
      description="Configure your Kumbh Mela crowd management system step by step"
    >
      {/* Progress Indicator */}
      <div className="mb-12">
        <StepIndicator 
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          steps={steps}
        />
      </div>

      {/* Setup Steps */}
      <div className="space-y-6">
        {setupSteps.map((setupStep, index) => (
          <motion.div
            key={setupStep.step}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className={`
              transition-all duration-300 hover:shadow-lg cursor-pointer
              ${setupStep.completed ? 'border-success bg-success/5' : ''}
              ${!canProceedToStep(setupStep.step) ? 'opacity-50 cursor-not-allowed' : ''}
            `}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${setupStep.bgColor}`}>
                      <setupStep.icon className={`w-6 h-6 ${setupStep.color}`} />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">
                          Step {setupStep.step}: {setupStep.title}
                        </CardTitle>
                        {setupStep.completed && (
                          <Badge className="bg-success text-success-foreground">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-muted-foreground">
                        {setupStep.description}
                      </p>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {setupStep.requirements}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleStepClick(setupStep.route, setupStep.step)}
                    disabled={!canProceedToStep(setupStep.step)}
                    variant={setupStep.completed ? "outline" : "default"}
                    className={setupStep.completed ? "" : "bg-gradient-sacred"}
                  >
                    {setupStep.completed ? "Review" : "Configure"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardHeader>

              {setupStep.completed && (
                <CardContent className="pt-0">
                  <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        This step has been completed successfully
                      </span>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Completion Card */}
      {allStepsCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-success bg-gradient-sacred text-primary-foreground">
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-primary-foreground/10 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="w-8 h-8" />
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold mb-2">Setup Complete!</h3>
                  <p className="text-primary-foreground/90">
                    Your Kumbh Mela crowd management system is ready to deploy
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button 
                    variant="secondary"
                    onClick={() => navigate("/setup/complete")}
                    size="lg"
                  >
                    Review Configuration
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    size="lg"
                    className="bg-primary-foreground/10 hover:bg-primary-foreground/20 border-primary-foreground/20"
                  >
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardContent className="p-6">
            <h4 className="font-semibold mb-4">Setup Progress Overview</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{state.zones.length}</div>
                <div className="text-sm text-muted-foreground">Zones Configured</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">{state.cameras.length}</div>
                <div className="text-sm text-muted-foreground">Cameras Placed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{state.teams.length}</div>
                <div className="text-sm text-muted-foreground">Teams Organized</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </SetupLayout>
  );
};

export default SetupWizard;