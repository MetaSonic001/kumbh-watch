import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface SetupLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

const SetupLayout = ({ 
  children, 
  title, 
  description, 
  showBackButton = false,
  onBack 
}: SetupLayoutProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showBackButton && (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-sacred rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-semibold">Kumbh Command Setup</h1>
                  <p className="text-xs text-muted-foreground">Configuration Wizard</p>
                </div>
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              Skip to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          {/* Page Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">{title}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {description}
            </p>
          </div>

          {/* Page Content */}
          <div className="space-y-8">
            {children}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default SetupLayout;