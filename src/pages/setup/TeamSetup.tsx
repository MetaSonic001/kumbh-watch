import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Plus, ArrowRight, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSetup } from "@/contexts/SetupContext";
import SetupLayout from "@/components/setup/SetupLayout";
import { toast } from "sonner";

const TeamSetup = () => {
  const navigate = useNavigate();
  const { state, addTeam, markStepCompleted } = useSetup();
  
  const [newTeam, setNewTeam] = useState({
    name: "",
    type: "police" as const,
    memberCount: "",
    leader: "",
    contactInfo: "",
    assignedZones: [] as string[]
  });

  const teamTypes = [
    { value: "police", label: "Police Unit", icon: "👮", color: "text-primary" },
    { value: "medical", label: "Medical Team", icon: "🏥", color: "text-success" },
    { value: "volunteer", label: "Volunteer Group", icon: "🤝", color: "text-secondary" },
    { value: "security", label: "Security Team", icon: "🛡️", color: "text-warning" }
  ];

  const handleCreateTeam = () => {
    if (!newTeam.name.trim() || !newTeam.memberCount || !newTeam.leader.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    addTeam({
      name: newTeam.name,
      type: newTeam.type,
      memberCount: parseInt(newTeam.memberCount),
      leader: newTeam.leader,
      contactInfo: newTeam.contactInfo,
      assignedZones: newTeam.assignedZones
    });

    setNewTeam({
      name: "",
      type: "police",
      memberCount: "",
      leader: "",
      contactInfo: "",
      assignedZones: []
    });

    toast.success("Team created successfully!");
  };

  const handleNext = () => {
    markStepCompleted(3);
    toast.success("Team setup completed!");
    navigate("/setup/complete");
  };

  return (
    <SetupLayout
      title="Team Organization"
      description="Configure security, medical, and volunteer teams for coordinated response"
      showBackButton
      onBack={() => navigate("/setup/cctv")}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Create New Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Team Name *</Label>
              <Input
                placeholder="e.g., Alpha Security Unit"
                value={newTeam.name}
                onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Team Type *</Label>
              <Select value={newTeam.type} onValueChange={(value: any) => setNewTeam(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teamTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Team Size *</Label>
                <Input
                  type="number"
                  placeholder="12"
                  value={newTeam.memberCount}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, memberCount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Team Leader *</Label>
                <Input
                  placeholder="Captain Singh"
                  value={newTeam.leader}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, leader: e.target.value }))}
                />
              </div>
            </div>

            <Button onClick={handleCreateTeam} className="w-full bg-gradient-sacred">
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5 text-secondary" />
                Configured Teams ({state.teams.length})
              </span>
              {state.teams.length > 0 && (
                <Badge variant="outline" className="text-success border-success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {state.teams.map((team) => (
                <div key={team.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{team.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {team.memberCount} members • Led by {team.leader}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {team.type}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {state.teams.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No teams configured yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <motion.div className="flex justify-between items-center pt-8 border-t">
        <Button variant="outline" onClick={() => navigate("/setup/cctv")}>
          Back: CCTV Setup
        </Button>
        <Button onClick={handleNext} className="bg-gradient-sacred">
          Complete Setup
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </SetupLayout>
  );
};

export default TeamSetup;