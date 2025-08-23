"use client"
import { Link } from "react-router-dom";

import { useState } from "react"
import {
  Shield,
  MapPin,
  Users,
  BarChart3,
  Camera,
  Radio,
  ArrowRight,
  CheckCircle,
  Globe,
  Eye,
  AlertTriangle,
  Clock,
  PlayCircle,
  ChevronRight,
  Brain,
  Smartphone,
  Building,
  TrendingUp,
  Cpu,
  Activity,
  Target,
  Layers,
  Network,
  Database,
  X,
  HelpCircle,
} from "lucide-react"

const Landing = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [activeHelpSection, setActiveHelpSection] = useState("guide")

  // Core Features Section - AI-powered capabilities
  const features = [
    {
      icon: Brain,
      title: "YOLOv8 AI Detection",
      description: "Advanced computer vision with YOLOv8 for real-time crowd detection and density analysis",
      color: "text-orange-600",
    },
    {
      icon: AlertTriangle,
      title: "Predictive Alerts",
      description: "AI-powered forecasting of stampede-prone areas before they become critical",
      color: "text-red-600",
    },
    {
      icon: Users,
      title: "Role-Based Dashboards",
      description: "Separate interfaces for police, admins, volunteers, and public with clear task allocation",
      color: "text-amber-600",
    },
    {
      icon: MapPin,
      title: "Smart Evacuation Routes",
      description: "Dynamic optimal exit route calculation during emergencies using graph algorithms",
      color: "text-yellow-600",
    },
    {
      icon: Radio,
      title: "Seamless Communication",
      description: "Instant WhatsApp, SMS, and push notifications bridging all stakeholders",
      color: "text-orange-700",
    },
    {
      icon: BarChart3,
      title: "Post-Event Analytics",
      description: "Comprehensive insights and heatmaps for planning safer future events",
      color: "text-red-700",
    },
  ]

  // Technology Stack Section - Complete tech infrastructure
  const techStack = [
    { name: "YOLOv8", description: "Computer Vision", icon: Eye },
    { name: "Python + FastAPI", description: "Backend Processing", icon: Cpu },
    { name: "React + TypeScript", description: "Frontend Dashboard", icon: Layers },
    { name: "PostgreSQL", description: "Data Storage", icon: Database },
    { name: "Redis", description: "Real-time Cache", icon: Activity },
    { name: "Mapbox", description: "Geospatial Mapping", icon: MapPin },
  ]

  // Business Models Section - Revenue streams and pricing
  const businessModels = [
    {
      title: "SaaS for Event Organizers",
      description: "Subscription-based packages per event or monthly for concerts, sports, festivals",
      icon: Building,
      pricing: "₹50K-2L per event",
    },
    {
      title: "Government Contracts",
      description: "Partner with police, municipal bodies, and disaster management authorities",
      icon: Shield,
      pricing: "₹10L-50L annually",
    },
    {
      title: "Enterprise Licensing",
      description: "Permanent licensing for stadiums, airports, malls, and transport hubs",
      icon: Globe,
      pricing: "₹5L-25L one-time",
    },
    {
      title: "Data Analytics Services",
      description: "Crowd insights for insurance companies, urban planners, research institutes",
      icon: TrendingUp,
      pricing: "₹1L-5L per report",
    },
  ]

  // Statistics Section - Key performance metrics
  const stats = [
    { number: "10M+", label: "People Monitored", icon: Users },
    { number: "500+", label: "CCTV Cameras", icon: Camera },
    { number: "99.9%", label: "Detection Accuracy", icon: Target },
    { number: "< 30sec", label: "Alert Response", icon: Clock },
  ]

  // Beneficiaries Section - Who benefits from the platform
  const beneficiaries = [
    "Government & Police - Better control, faster response, reduced casualties",
    "Event Organizers - Safer events, compliance with safety norms, improved reputation",
    "Volunteers & NGOs - Clearer instructions, safer execution of ground duties",
    "Insurance Companies - Reduced claims and risks at large gatherings",
    "General Public - Safer experiences, trust in authorities, reduced panic",
  ]

  // Step-by-step guide for using the platform
  const userGuide = [
    {
      step: 1,
      title: "Setup & Configuration",
      description: "Install CCTV cameras, configure drone feeds, and set up IoT sensors at key checkpoints",
      details: "Connect all data sources through our unified API system",
    },
    {
      step: 2,
      title: "Real-time Monitoring",
      description: "AI continuously analyzes crowd density using YOLOv8 computer vision",
      details: "Live dashboards show crowd heatmaps and density metrics",
    },
    {
      step: 3,
      title: "Predictive Analysis",
      description: "Machine learning models predict potential congestion hotspots",
      details: "Early warning system alerts authorities before critical situations develop",
    },
    {
      step: 4,
      title: "Alert Distribution",
      description: "Automated alerts sent via WhatsApp, SMS, and push notifications",
      details: "Role-based messaging ensures right information reaches right people",
    },
    {
      step: 5,
      title: "Emergency Response",
      description: "Dynamic evacuation routes calculated using graph algorithms",
      details: "Real-time route optimization based on current crowd conditions",
    },
    {
      step: 6,
      title: "Post-Event Analytics",
      description: "Comprehensive reports and insights for future event planning",
      details: "Detailed heatmaps, crowd flow analysis, and safety recommendations",
    },
  ]

  // Architecture flow explanation
  const architectureFlow = [
    {
      phase: "Data Collection",
      description: "CCTV feeds, drones, GPS from mobile apps, IoT sensors",
      tech: "Python + Flask/FastAPI, OpenCV/YOLOv8, Drone SDKs",
    },
    {
      phase: "Data Processing",
      description: "Crowd density detection, anomaly analysis, congestion prediction",
      tech: "Python ML Models, Pandas/Numpy, Kafka/Redis streaming",
    },
    {
      phase: "Backend API",
      description: "Data storage, insights generation, API exposure",
      tech: "Flask/FastAPI, PostgreSQL/MongoDB, Redis cache",
    },
    {
      phase: "Frontend Dashboards",
      description: "Role-based UIs for Police, Admins, Volunteers, Public",
      tech: "React.js, TailwindCSS, Mapbox, Socket.IO/WebSockets",
    },
    {
      phase: "Communication",
      description: "SMS, WhatsApp, push notifications for alerts",
      tech: "Twilio, WhatsApp API, Firebase Cloud Messaging",
    },
    {
      phase: "Analytics",
      description: "Post-event insights, heatmaps, compliance reports",
      tech: "React.js, Recharts/D3.js, PostgreSQL/TimescaleDB",
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-lg border-b border-orange-100 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  CrowdShield
                </h1>
                <p className="text-xs text-gray-600">AI-Powered Crowd Management</p>
              </div>
            </div>

            {/* Navigation Links - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm hover:text-orange-600 transition-colors font-medium">
                Features
              </a>
              <a href="#technology" className="text-sm hover:text-orange-600 transition-colors font-medium">
                Technology
              </a>
              <a href="#business" className="text-sm hover:text-orange-600 transition-colors font-medium">
                Business
              </a>
              <a href="#contact" className="text-sm hover:text-orange-600 transition-colors font-medium">
                Contact
              </a>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
             <Link to="/login">
 <button className="px-3 sm:px-4 py-2 text-sm text-gray-600 hover:text-orange-600 transition-colors">
                Sign In
              </button>
              </Link>
                        <Link to="/login">

              <button className="px-4 sm:px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg flex items-center gap-2 text-sm">
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Start</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 sm:px-4 py-2 rounded-full text-sm font-medium">
                  🚀 AI-Powered Crowd Safety Platform
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    CrowdShield
                  </span>
                  <br />
                  <span className="text-gray-900">for Kumbh Mela 2027</span>
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
                  Revolutionary AI-powered crowd management platform using YOLOv8 computer vision to ensure safety at
                  the world's largest religious gathering in Nashik.
                </p>
              </div>

              {/* Hero Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg text-base sm:text-lg font-medium">
                  <PlayCircle className="w-5 h-5" />
                  Watch Demo
                </button>
                <button className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border-2 border-orange-200 text-orange-600 rounded-xl hover:bg-orange-50 transition-all text-base sm:text-lg font-medium">
                  Learn More
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 mx-auto mb-2 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl flex items-center justify-center">
                      <stat.icon className="w-5 sm:w-6 h-5 sm:h-6 text-orange-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">{stat.number}</div>
                    <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative order-first lg:order-last">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-3xl blur-3xl"></div>
              <div className="relative overflow-hidden shadow-2xl border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
                <img
                  src="/crowdshield-dashboard.png"
                  alt="CrowdShield Dashboard Interface"
                  className="w-full h-auto rounded-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              Core Features
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">Advanced AI-Powered Capabilities</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-base sm:text-lg">
              Leveraging cutting-edge YOLOv8 computer vision and predictive analytics for comprehensive crowd safety
              management
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="h-full hover:shadow-lg transition-all duration-300 border border-orange-100 bg-gradient-to-br from-white to-orange-50/50 rounded-2xl p-4 sm:p-6 space-y-4"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section
        id="technology"
        className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50"
      >
        <div className="container mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              Technology Stack
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">Built with Modern Technologies</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-base sm:text-lg">
              Enterprise-grade architecture combining AI, real-time processing, and scalable infrastructure
            </p>
          </div>

          {/* Tech Stack Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {techStack.map((tech, index) => (
              <div
                key={index}
                className="bg-white/80 backdrop-blur-sm border border-orange-100 hover:shadow-lg transition-all duration-300 rounded-2xl p-4 sm:p-6 text-center space-y-4"
              >
                <div className="w-14 sm:w-16 h-14 sm:h-16 mx-auto bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center">
                  <tech.icon className="w-7 sm:w-8 h-7 sm:h-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-1 text-gray-900">{tech.name}</h3>
                  <p className="text-sm text-gray-600">{tech.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Architecture Flow */}
          <div className="mt-12 sm:mt-16 text-center">
            <h3 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 text-gray-900">
              Complete End-to-End Architecture
            </h3>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-orange-100 shadow-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-center">
                <div className="space-y-3">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 mx-auto bg-orange-100 rounded-xl flex items-center justify-center">
                    <Camera className="w-5 sm:w-6 h-5 sm:h-6 text-orange-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Data Collection</h4>
                  <p className="text-xs sm:text-sm text-gray-600">CCTV, Drones, IoT Sensors</p>
                </div>
                <div className="space-y-3">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 mx-auto bg-red-100 rounded-xl flex items-center justify-center">
                    <Brain className="w-5 sm:w-6 h-5 sm:h-6 text-red-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base">AI Processing</h4>
                  <p className="text-xs sm:text-sm text-gray-600">YOLOv8, ML Models</p>
                </div>
                <div className="space-y-3">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 mx-auto bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Network className="w-5 sm:w-6 h-5 sm:h-6 text-yellow-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Real-time APIs</h4>
                  <p className="text-xs sm:text-sm text-gray-600">FastAPI, WebSockets</p>
                </div>
                <div className="space-y-3">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 mx-auto bg-amber-100 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-5 sm:w-6 h-5 sm:h-6 text-amber-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base">User Interface</h4>
                  <p className="text-xs sm:text-sm text-gray-600">React.js Dashboards</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Business Models Section */}
      <section id="business" className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              Business Opportunities
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">Multiple Revenue Streams</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-base sm:text-lg">
              Scalable business model serving government, enterprise, and event management sectors
            </p>
          </div>

          {/* Business Models Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16">
            {businessModels.map((model, index) => (
              <div
                key={index}
                className="h-full hover:shadow-lg transition-all duration-300 border border-orange-100 bg-gradient-to-br from-white to-orange-50/30 rounded-2xl p-4 sm:p-6 space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <model.icon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{model.title}</h3>
                    <p className="text-gray-600 text-sm sm:text-base">{model.description}</p>
                    <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                      {model.pricing}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Beneficiaries Section */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 rounded-2xl p-6 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-gray-900">
              Who Benefits from CrowdShield
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {beneficiaries.map((beneficiary, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 text-sm sm:text-base">{beneficiary}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-orange-500 to-red-500">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 text-white">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">Ready for Kumbh Mela 2027?</h2>
            <p className="text-lg sm:text-xl opacity-90 leading-relaxed">
              Join us in revolutionizing crowd safety with AI-powered technology. Ensure the safety of millions at the
              world's largest religious gathering.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-orange-600 hover:bg-gray-100 rounded-xl text-base sm:text-lg font-medium shadow-lg">
                <Shield className="w-5 h-5" />
                Request Demo
              </button>
              <button className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border-2 border-white text-white hover:bg-white/10 rounded-xl text-base sm:text-lg font-medium">
                Download Brochure
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="pt-6 sm:pt-8 border-t border-white/20">
              <p className="text-base sm:text-lg opacity-80">
                🕉️ Designed specifically for sacred gatherings and religious events
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="border-t border-orange-100 py-8 sm:py-12 px-4 sm:px-6 bg-orange-50">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            {/* Brand Column */}
            <div className="space-y-4 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  CrowdShield
                </span>
              </div>
              <p className="text-gray-600 text-sm sm:text-base">
                AI-powered crowd management platform for safer events and gatherings.
              </p>
            </div>

            {/* Technology Column */}
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-gray-900">Technology</h4>
              <ul className="space-y-2 text-gray-600 text-sm sm:text-base">
                <li>YOLOv8 AI Detection</li>
                <li>Real-time Analytics</li>
                <li>Predictive Alerts</li>
                <li>Smart Evacuation</li>
              </ul>
            </div>

            {/* Business Column */}
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-gray-900">Business</h4>
              <ul className="space-y-2 text-gray-600 text-sm sm:text-base">
                <li>SaaS Solutions</li>
                <li>Government Contracts</li>
                <li>Enterprise Licensing</li>
                <li>Data Analytics</li>
              </ul>
            </div>

            {/* Contact Column */}
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-gray-900">Contact</h4>
              <ul className="space-y-2 text-gray-600 text-sm sm:text-base">
                <li>info@crowdshield.ai</li>
                <li>+91 98765 43210</li>
                <li>Mumbai, India</li>
                <li>Nashik Operations</li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-6 sm:pt-8 border-t border-orange-200">
            <div className="text-sm text-gray-600 mb-4 md:mb-0">
              © 2024 CrowdShield. All rights reserved. Built for Kumbh Mela 2027.
            </div>
            <div className="flex items-center gap-4 sm:gap-6 text-sm text-gray-600">
              <a href="#" className="hover:text-orange-600 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-orange-600 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-orange-600 transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Help Button */}
      <button
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 hover:scale-105"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-orange-100">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">CrowdShield Help Center</h2>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-black"
              > 
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex flex-col sm:flex-row h-[calc(90vh-80px)]">
              {/* Sidebar */}
              <div className="w-full sm:w-64 bg-orange-50 border-b sm:border-b-0 sm:border-r border-orange-100 p-4">
                <div className="flex sm:flex-col gap-2">
                  <button
                    onClick={() => setActiveHelpSection("guide")}
                    className={`flex-1 sm:w-full text-left p-3 rounded-lg transition-colors text-sm sm:text-base ${
                      activeHelpSection === "guide"
                        ? "bg-orange-100 text-orange-700 font-medium"
                        : "text-gray-600 hover:bg-orange-100/50"
                    }`}
                  >
                    Step-by-Step Guide
                  </button>
                  <button
                    onClick={() => setActiveHelpSection("architecture")}
                    className={`flex-1 sm:w-full text-left p-3 rounded-lg transition-colors text-sm sm:text-base ${
                      activeHelpSection === "architecture"
                        ? "bg-orange-100 text-orange-700 font-medium"
                        : "text-gray-600 hover:bg-orange-100/50"
                    }`}
                  >
                    Architecture & Tech Stack
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                {activeHelpSection === "guide" && (
                  <div className="space-y-4 sm:space-y-6">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">How to Use CrowdShield Platform</h3>
                    {userGuide.map((item, index) => (
                      <div key={index} className="border border-orange-100 rounded-lg p-3 sm:p-4">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="w-7 sm:w-8 h-7 sm:h-8 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {item.step}
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{item.title}</h4>
                            <p className="text-gray-600 text-sm sm:text-base">{item.description}</p>
                            <p className="text-xs sm:text-sm text-gray-500 italic">{item.details}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeHelpSection === "architecture" && (
                  <div className="space-y-4 sm:space-y-6">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                      System Architecture & Technology Stack
                    </h3>

                    {/* Architecture Flow */}
                    <div className="space-y-4">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900">End-to-End Architecture Flow</h4>
                      {architectureFlow.map((phase, index) => (
                        <div key={index} className="border border-orange-100 rounded-lg p-3 sm:p-4">
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="w-7 sm:w-8 h-7 sm:h-8 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="space-y-2">
                              <h5 className="font-semibold text-gray-900 text-sm sm:text-base">{phase.phase}</h5>
                              <p className="text-gray-600 text-sm sm:text-base">{phase.description}</p>
                              <div className="bg-orange-50 p-2 rounded text-xs sm:text-sm text-black">
                                <strong>Tech Stack:</strong> {phase.tech}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Complete Tech Stack */}
                    <div className="mt-6 sm:mt-8">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                        Complete Technology Stack
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        {techStack.map((tech, index) => (
                          <div
                            key={index}
                            className="border border-orange-100 rounded-lg p-3 sm:p-4 flex items-center gap-3"
                          >
                            <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
                              <tech.icon className="w-4 sm:w-5 h-4 sm:h-5 text-orange-600" />
                            </div>
                            <div>
                              <h5 className="font-semibold text-gray-900 text-sm sm:text-base">{tech.name}</h5>
                              <p className="text-xs sm:text-sm text-gray-600">{tech.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Landing