import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Shield, 
  MapPin, 
  Users, 
  BarChart3,
  Camera,
  Radio,
  ArrowRight,
  CheckCircle,
  Star,
  Globe,
  Zap,
  Eye,
  AlertTriangle,
  Clock,
  PlayCircle,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MapPin,
      title: "Interactive Zone Mapping",
      description: "Create and manage sacred ghats, entry gates, and security zones with precision",
      color: "text-primary"
    },
    {
      icon: Camera,
      title: "Real-time CCTV Monitoring",
      description: "Live video feeds with AI-powered crowd analysis and anomaly detection",
      color: "text-secondary"
    },
    {
      icon: Users,
      title: "Crowd Analytics",
      description: "Advanced crowd density tracking with predictive congestion alerts",
      color: "text-accent"
    },
    {
      icon: Radio,
      title: "Emergency Response",
      description: "Instant communication and coordination for emergency situations",
      color: "text-warning"
    },
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description: "Comprehensive reports and insights for event optimization",
      color: "text-success"
    },
    {
      icon: Shield,
      title: "Multi-level Security",
      description: "Role-based access control for police, medical, and volunteer teams",
      color: "text-destructive"
    }
  ];

  const stats = [
    { number: "2.4M+", label: "People Monitored", icon: Users },
    { number: "250+", label: "CCTV Cameras", icon: Camera },
    { number: "99.9%", label: "System Uptime", icon: Zap },
    { number: "< 2min", label: "Response Time", icon: Clock }
  ];

  const testimonials = [
    {
      name: "Rajesh Kumar",
      role: "Chief Security Officer",
      content: "This system revolutionized our crowd management capabilities during the last Kumbh Mela.",
      rating: 5
    },
    {
      name: "Dr. Priya Sharma", 
      role: "Emergency Response Head",
      content: "Real-time alerts and coordination features saved precious time during critical situations.",
      rating: 5
    },
    {
      name: "Captain Singh",
      role: "Police Superintendent", 
      content: "The analytics and predictive features help us deploy resources more effectively.",
      rating: 5
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 w-full bg-background/80 backdrop-blur-lg border-b border-border z-50"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-sacred rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Kumbh Command</h1>
                <p className="text-xs text-muted-foreground">Crowd Management Platform</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm hover:text-primary transition-colors">Features</a>
              <a href="#analytics" className="text-sm hover:text-primary transition-colors">Analytics</a>
              <a href="#testimonials" className="text-sm hover:text-primary transition-colors">Reviews</a>
              <a href="#pricing" className="text-sm hover:text-primary transition-colors">Contact</a>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/login")}>
                Sign In
              </Button>
              <Button 
                onClick={() => navigate("/setup/wizard")}
                className="bg-gradient-sacred hover:shadow-glow"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center max-w-4xl mx-auto space-y-8"
          >
            <motion.div variants={itemVariants} className="space-y-4">
              <Badge variant="secondary" className="mb-4">
                🕉️ Sacred Event Management Platform
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-sacred bg-clip-text text-transparent">
                Kumbh Mela Crowd Management
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Advanced AI-powered platform for monitoring, managing, and ensuring safety 
                during the world's largest religious gathering
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center justify-center gap-4">
              <Button 
                size="lg"
                onClick={() => navigate("/setup/wizard")}
                className="bg-gradient-sacred hover:shadow-glow text-lg px-8 py-6"
              >
                Start Setup Wizard
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="text-lg px-8 py-6"
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                View Demo
              </Button>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className="text-center"
                  >
                    <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-xl flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-2xl font-bold">{stat.number}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div variants={itemVariants}>
              <Badge variant="outline" className="mb-4">Features</Badge>
              <h2 className="text-4xl font-bold mb-4">Complete Crowd Management Solution</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From zone mapping to real-time monitoring, everything you need to ensure safety and efficiency
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full hover:shadow-sacred transition-all duration-300 border-0 bg-background">
                  <CardContent className="p-6 space-y-4">
                    <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                    <Button variant="ghost" className="w-full justify-start p-0 h-auto text-primary">
                      Learn more <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Analytics Preview */}
      <section id="analytics" className="py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            <motion.div variants={itemVariants} className="space-y-6">
              <Badge variant="outline">Analytics Dashboard</Badge>
              <h2 className="text-4xl font-bold">Real-time Insights & Predictions</h2>
              <p className="text-muted-foreground text-lg">
                Monitor crowd density, predict congestion hotspots, and receive AI-powered 
                recommendations for optimal resource deployment.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span>Live crowd density heatmaps</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span>Predictive congestion alerts</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span>Historical trend analysis</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span>Performance optimization insights</span>
                </div>
              </div>

              <Button className="bg-gradient-secondary">
                <Eye className="w-4 h-4 mr-2" />
                View Analytics Demo
              </Button>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden shadow-elevated">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Live Dashboard</h4>
                        <Badge className="bg-success animate-pulse">Live</Badge>
                      </div>
                      
                      {/* Mock Dashboard Preview */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-background rounded-lg p-4">
                          <div className="text-2xl font-bold text-primary">1.2M</div>
                          <div className="text-sm text-muted-foreground">Current Crowd</div>
                        </div>
                        <div className="bg-background rounded-lg p-4">
                          <div className="text-2xl font-bold text-warning">23</div>
                          <div className="text-sm text-muted-foreground">Active Alerts</div>
                        </div>
                      </div>

                      <div className="bg-background rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Zone Status</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Har Ki Pauri</span>
                            <Badge variant="destructive" className="text-xs">High</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Main Gate</span>
                            <Badge variant="secondary" className="text-xs">Medium</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div variants={itemVariants}>
              <Badge variant="outline" className="mb-4">Testimonials</Badge>
              <h2 className="text-4xl font-bold mb-4">Trusted by Event Managers</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                See what security professionals say about our platform
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current text-warning" />
                      ))}
                    </div>
                    <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center space-y-8"
          >
            <motion.div variants={itemVariants}>
              <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Set up your complete crowd management system in minutes with our guided wizard
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center justify-center gap-4">
              <Button 
                size="lg"
                onClick={() => navigate("/setup/wizard")}
                className="bg-gradient-sacred hover:shadow-glow text-lg px-8 py-6"
              >
                Start Setup Process
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/login")}
                className="text-lg px-8 py-6"
              >
                Sign In to Dashboard
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-sacred rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Kumbh Command</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 Kumbh Command. All rights reserved. Built for sacred gatherings.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;