import { Button } from "@/components/ui/button";
import { 
  Radio, 
  AlertTriangle, 
  Users, 
  Siren,
  MessageSquare,
  Shield,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const QuickActions = () => {
  const actions = [
    {
      id: "broadcast",
      label: "Emergency Broadcast",
      icon: Radio,
      color: "bg-destructive hover:bg-destructive/90",
      description: "Send alert to all teams"
    },
    {
      id: "evacuation",
      label: "Evacuation Protocol",
      icon: Users,
      color: "bg-warning hover:bg-warning/90",
      description: "Activate evacuation procedures"
    },
    {
      id: "medical",
      label: "Medical Alert",
      icon: Activity,
      color: "bg-secondary hover:bg-secondary/90",
      description: "Request medical assistance"
    },
    {
      id: "security",
      label: "Security Alert",
      icon: Shield,
      color: "bg-primary hover:bg-primary/90",
      description: "Deploy security teams"
    },
    {
      id: "announcement",
      label: "Public Announcement",
      icon: MessageSquare,
      color: "bg-accent hover:bg-accent/90 text-accent-foreground",
      description: "Broadcast to visitors"
    },
    {
      id: "emergency",
      label: "Sound Alarm",
      icon: Siren,
      color: "bg-destructive hover:bg-destructive/90",
      description: "Activate emergency sirens"
    }
  ];

  const handleAction = (actionId: string, label: string) => {
    switch (actionId) {
      case "broadcast":
        toast.success("Emergency broadcast initiated to all teams");
        break;
      case "evacuation":
        toast.warning("Evacuation protocol activated - teams notified");
        break;
      case "medical":
        toast.info("Medical alert sent to emergency response teams");
        break;
      case "security":
        toast.info("Security teams have been notified and deployed");
        break;
      case "announcement":
        toast.success("Public announcement system activated");
        break;
      case "emergency":
        toast.error("Emergency alarm system activated");
        break;
      default:
        toast.info(`${label} activated`);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      {actions.map((action, index) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Button
            variant="outline"
            className={`w-full justify-start p-4 h-auto ${action.color} border-0 text-left`}
            onClick={() => handleAction(action.id, action.label)}
          >
            <div className="flex items-center gap-3">
              <action.icon className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs opacity-80 truncate">
                  {action.description}
                </p>
              </div>
            </div>
          </Button>
        </motion.div>
      ))}

      {/* Emergency Contact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="mt-4 p-3 bg-muted rounded-lg"
      >
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Emergency Hotline</p>
          <p className="text-lg font-bold text-destructive">108</p>
          <p className="text-xs text-muted-foreground">
            24/7 Emergency Services
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default QuickActions;