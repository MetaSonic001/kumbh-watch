import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Edit, Eye, Trash2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  role: string;
  zone: string;
  status: "active" | "offline" | "break";
  lastSeen: string;
}

interface UserTableProps {
  searchTerm: string;
}

const UserTable = ({ searchTerm }: UserTableProps) => {
  const users: User[] = [
    { id: "1", name: "Raj Kumar", role: "Police", zone: "Main Gate", status: "active", lastSeen: "Now" },
    { id: "2", name: "Dr. Priya", role: "Medical", zone: "Medical Camp", status: "active", lastSeen: "2 mins ago" },
    { id: "3", name: "Amit Singh", role: "Volunteer", zone: "Har Ki Pauri", status: "break", lastSeen: "15 mins ago" }
  ];

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success text-success-foreground";
      case "offline": return "bg-muted text-muted-foreground";
      case "break": return "bg-warning text-warning-foreground";
      default: return "bg-primary text-primary-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {filteredUsers.map((user) => (
        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium">{user.name}</h4>
              <p className="text-sm text-muted-foreground">{user.role} • {user.zone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
            <span className="text-xs text-muted-foreground">{user.lastSeen}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm"><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserTable;