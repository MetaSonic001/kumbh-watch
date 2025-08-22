import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Shield, Activity } from "lucide-react";

const TeamManagement = () => {
  const teams = [
    { id: "1", name: "Alpha Squad", type: "Police", members: 12, zone: "Main Gate", status: "active" },
    { id: "2", name: "Medical Team 1", type: "Medical", members: 8, zone: "Medical Camp", status: "active" },
    { id: "3", name: "Volunteer Group A", type: "Volunteer", members: 25, zone: "Har Ki Pauri", status: "active" }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {teams.map((team) => (
        <Card key={team.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {team.name}
              </span>
              <Badge variant="outline">{team.type}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Members:</span>
                <span className="font-medium">{team.members}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Zone:</span>
                <span className="font-medium">{team.zone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <Badge className="bg-success text-success-foreground">{team.status}</Badge>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              <Users className="w-4 h-4 mr-2" />
              Manage Team
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TeamManagement;