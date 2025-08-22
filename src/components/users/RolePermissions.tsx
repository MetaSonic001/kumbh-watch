import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";

const RolePermissions = () => {
  const roles = [
    { name: "Admin", permissions: ["All Access", "User Management", "System Config"], count: 3 },
    { name: "Police", permissions: ["Emergency Actions", "CCTV Access", "Reports"], count: 89 },
    { name: "Medical", permissions: ["Medical Alerts", "Patient Data", "Resources"], count: 45 },
    { name: "Volunteer", permissions: ["Basic Monitoring", "Crowd Reports"], count: 156 }
  ];

  return (
    <div className="space-y-6">
      {roles.map((role, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                {role.name}
              </span>
              <Badge variant="outline">{role.count} users</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {role.permissions.map((permission, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{permission}</span>
                  <Switch defaultChecked />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RolePermissions;