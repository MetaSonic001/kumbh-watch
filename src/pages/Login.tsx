import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Activity, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Login = () => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate login
    setTimeout(() => {
      if (credentials.username && credentials.password) {
        toast.success("Login successful! Starting session...");
        navigate("/setup/wizard");
      } else {
        toast.error("Please enter valid credentials");
      }
      setLoading(false);
    }, 1500);
  };

  const features = [
    { icon: Shield, title: "Secure Access", desc: "Multi-level authentication for authorized personnel" },
    { icon: Users, title: "Team Management", desc: "Coordinate police, medical, and volunteer teams" },
    { icon: Activity, title: "Real-time Monitoring", desc: "Live CCTV feeds and crowd analytics" },
    { icon: AlertTriangle, title: "Emergency Response", desc: "Instant alerts and evacuation protocols" }
  ];

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left side - Branding & Features */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center lg:text-left space-y-8"
        >
          <div className="space-y-4">
            <motion.div 
              className="inline-flex items-center gap-3 text-primary-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-12 h-12 bg-primary-foreground/10 rounded-xl flex items-center justify-center animate-pulse-glow">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Kumbh Mela</h1>
                <p className="text-primary-foreground/80">Crowd Management System</p>
              </div>
            </motion.div>
            
            <p className="text-primary-foreground/90 text-lg max-w-md">
              Advanced crowd monitoring and emergency management platform for the sacred Kumbh Mela gathering.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4 space-y-2"
              >
                <feature.icon className="w-5 h-5 text-primary-foreground" />
                <h3 className="font-semibold text-primary-foreground text-sm">{feature.title}</h3>
                <p className="text-primary-foreground/70 text-xs">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right side - Login Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center lg:justify-end"
        >
          <Card className="w-full max-w-md shadow-elevated">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                  Admin Portal
                </Badge>
                <Badge variant="outline">v2.0</Badge>
              </div>
              <div>
                <CardTitle className="text-2xl">Welcome Back</CardTitle>
                <CardDescription>
                  Sign in to access the command center
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={credentials.username}
                      onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                      className="transition-all duration-300 focus:shadow-sacred"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                      className="transition-all duration-300 focus:shadow-sacred"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-sacred hover:shadow-glow transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? "Authenticating..." : "Start Session"}
                </Button>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Demo credentials: admin / admin
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Authorized personnel only • Emergency: 108
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;